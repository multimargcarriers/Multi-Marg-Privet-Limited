const { db } = require("../config/database");
const { success, created, error } = require("../utils/response");
const { getNextSequence } = require("../utils/sequenceGenerator");
const { getOrSet, delCache } = require("../config/redis");

const CACHE_KEY = "vendor_mis";

// Helper to check if a record belongs to the authenticated vendor
const matchVendorUser = (data, user) => {
  if (!user) return false;
  const vendorVal = String(data.vendorName || data.vendor || data.vendor_name || '').toLowerCase().trim();
  const userName = String(user.name || '').toLowerCase().trim();
  const userEmail = String(user.email || '').toLowerCase().trim();
  const userVendor = String(user.vendorName || user.vendor || '').toLowerCase().trim();

  if (userVendor && (vendorVal === userVendor || vendorVal.includes(userVendor) || userVendor.includes(vendorVal))) {
    return true;
  }
  if (userName && (vendorVal === userName || vendorVal.includes(userName) || userName.includes(vendorVal))) {
    return true;
  }
  if (data.vendorEmail && userEmail && String(data.vendorEmail).toLowerCase().trim() === userEmail) {
    return true;
  }
  return data.createdBy === user.id;
};

exports.getRoot_1 = async (req, res) => {
  const user = req.user;
  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimarg.com');

  // Cache full collection, filter per-user in memory
  const allRecords = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("vendor_mis").orderBy("createdAt", "desc").get();
    const records = [];
    snapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() }));
    return records;
  }, 300);

  let records = allRecords;
  const isVendor = user && (user.role === 'Vendor' || user.role?.toLowerCase() === 'vendor');
  if (isVendor) {
    // Vendors see only entries where they are the mapped vendor
    records = allRecords.filter(r => matchVendorUser(r, user));
  } else if (!isAdmin) {
    // Employees can only see entries they created
    records = allRecords.filter(r => r.createdBy === user.id);
  }

  return success(res, "Vendor MIS fetched successfully", records);
};

const getMongoDb = async () => {
  if (db.mongoDb) return db.mongoDb;
  if (db.readyPromise) {
    const d = await db.readyPromise;
    if (d) return d;
  }
  throw new Error("MongoDB not connected");
};

const getNextVendorMisSequence = async () => {
  const mongoDb = await getMongoDb();
  const countersCol = mongoDb.collection("counters");
  const vendorMisCol = mongoDb.collection("vendor_mis");
  const counterId = "vendor_mis_counter";

  // Step 1: Ensure counter exists and syncs to at least the highest existing sequence (no taking old gaps)
  const counterDoc = await countersCol.findOne({ _id: counterId });
  if (!counterDoc || typeof counterDoc.seq !== "number") {
    let maxNum = 0;
    const existingEntries = await vendorMisCol.find({}, { projection: { tripNo: 1 } }).toArray();
    existingEntries.forEach((t) => {
      const tripNo = t.tripNo || "";
      const match = tripNo.match(/^([a-zA-Z]+-)?(\d+)(-[a-zA-Z]+)?$/);
      if (match) {
        const num = parseInt(match[2], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    await countersCol.findOneAndUpdate(
      { _id: counterId },
      { $max: { seq: maxNum } },
      { returnDocument: "after", upsert: true }
    );
  }

  // Step 2: Atomic sequence increment strictly forward (> old entry numbers)
  let finalTripNo = null;
  while (!finalTripNo) {
    const updatedCounter = await countersCol.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true }
    );

    const seqVal = updatedCounter.seq ?? updatedCounter.value?.seq;
    const candidateTripNo = `VND-${String(seqVal).padStart(3, "0")}`;

    // Verify candidate is not already used in DB (forward collision check)
    const escapedCandidate = candidateTripNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await vendorMisCol.findOne({
      tripNo: { $regex: new RegExp(`^${escapedCandidate}$`, "i") }
    });

    if (!existing) {
      finalTripNo = candidateTripNo;
    }
  }

  return finalTripNo;
};

exports.postRoot_2 = async (req, res) => {
  const user = req.user;
  const payload = req.body;

  payload.createdAt = payload.createdAt || new Date().toISOString();
  payload.createdBy = user.id;
  payload.creatorRole = user.role;
  payload.creatorName = user.name || user.email || 'Unknown';

  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimarg.com' || (user.role === 'Employee' && (user.permissions || []).some(p => p === 'all' || p === 'vendormis' || p === 'operations')));

  if (!isAdmin) {
    payload.approvalStatus = 'Pending';
  } else {
    payload.approvalStatus = payload.approvalStatus || 'Pending';
  }

  const isAutoAssigned = !payload.tripNo || 
    payload.tripNo.trim() === '' || 
    payload.tripNo.toUpperCase().startsWith('TRP-') ||
    payload.tripNo.toLowerCase().includes('auto') ||
    payload.isManualTripNo !== true;

  if (isAutoAssigned) {
    payload.tripNo = await getNextVendorMisSequence();
  } else {
    const mongoDb = await getMongoDb();
    const cleanTripNo = payload.tripNo.trim();
    const escapedTripNo = cleanTripNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await mongoDb.collection("vendor_mis").findOne({
      tripNo: { $regex: new RegExp(`^${escapedTripNo}$`, 'i') }
    });
    if (existing) {
      return error(res, `A Vendor MIS entry with number "${cleanTripNo}" already exists in the database.`, 400);
    }
    payload.tripNo = cleanTripNo;

    // If numeric, ensure counter advances above it
    const match = cleanTripNo.match(/^([a-zA-Z]+-)?(\d+)(-[a-zA-Z]+)?$/);
    if (match) {
      const num = parseInt(match[2], 10);
      await mongoDb.collection("counters").findOneAndUpdate(
        { _id: "vendor_mis_counter" },
        { $max: { seq: num } },
        { upsert: true }
      );
    }
  }
  delete payload.isManualTripNo;

  const docRef = await db.collection("vendor_mis").add(payload);
  await delCache(CACHE_KEY);

  return created(res, "Vendor MIS entry created successfully", {
    id: docRef.id,
    ...payload
  });
};

exports.put_id_3 = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const doc = await db.collection("vendor_mis").doc(id).get();
  if (!doc.exists) return error(res, "Vendor MIS entry not found", 404);

  const existingData = doc.data();
  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimarg.com' || (user.role === 'Employee' && (user.permissions || []).some(p => p === 'all' || p === 'vendormis' || p === 'operations')));
  const isVendorOwner = matchVendorUser(existingData, user);

  // Authorization check
  if (!isAdmin && !isVendorOwner) {
    return error(res, "You are not authorized to edit this trip entry.", 403);
  }

  // Once Approved, vendor CANNOT edit anything (Locked)
  if (!isAdmin && existingData.approvalStatus === 'Approved') {
    return error(res, "This trip entry has been Approved and locked by Admin. Contact Admin to make changes.", 403);
  }

  // Non-admins cannot set approvalStatus directly to 'Approved'
  if (!isAdmin && req.body.approvalStatus && req.body.approvalStatus === 'Approved') {
    return error(res, "Only Admin can approve trip entries.", 403);
  }

  // Non-admins (vendors) can ONLY update amount & others
  if (!isAdmin) {
    const existingDetails = existingData.details || [];
    const incomingDetails = req.body.details || [];

    const mergedDetails = existingDetails.map((d, idx) => {
      const inc = incomingDetails[idx] || {};
      return {
        ...d,
        amount: inc.amount !== undefined ? String(inc.amount) : (d.amount || "0"),
        others: inc.others !== undefined ? String(inc.others) : (d.others || "0")
      };
    });

    const totalAmount = mergedDetails.reduce((s, d) => s + (parseFloat(d.amount) || 0) + (parseFloat(d.others) || 0), 0);

    const updatePayload = {
      details: mergedDetails,
      totalAmount: totalAmount,
      approvalStatus: 'Submitted',
      updatedAt: new Date().toISOString(),
      lastModifiedBy: user.name || user.email || 'Vendor'
    };

    await db.collection("vendor_mis").doc(id).update(updatePayload);
    await delCache(CACHE_KEY);

    return success(res, "Vendor MIS amount updated successfully", {
      id,
      ...existingData,
      ...updatePayload
    });
  }

  const updatePayload = { ...req.body };
  delete updatePayload.id;
  delete updatePayload.remarks; // Remarks are updated via addRemark endpoint
  delete updatePayload.isManualTripNo;

  if (updatePayload.tripNo && updatePayload.tripNo.trim() !== (existingData.tripNo || '').trim()) {
    const mongoDb = await getMongoDb();
    const cleanTripNo = updatePayload.tripNo.trim();
    const escapedTripNo = cleanTripNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await mongoDb.collection("vendor_mis").findOne({
      _id: { $ne: id },
      tripNo: { $regex: new RegExp(`^${escapedTripNo}$`, 'i') }
    });
    if (existing) {
      return error(res, `Vendor MIS trip number "${cleanTripNo}" is already used by another entry.`, 400);
    }
    updatePayload.tripNo = cleanTripNo;
  }

  updatePayload.updatedAt = new Date().toISOString();
  updatePayload.lastModifiedBy = user.name || user.email || 'User';

  await db.collection("vendor_mis").doc(id).update(updatePayload);
  await delCache(CACHE_KEY);

  return success(res, "Vendor MIS updated successfully", {
    id,
    ...existingData,
    ...updatePayload
  });
};

exports.delete_id_4 = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const doc = await db.collection("vendor_mis").doc(id).get();
  if (!doc.exists) return error(res, "Vendor MIS entry not found", 404);

  const existingData = doc.data();
  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimarg.com' || (user.role === 'Employee' && (user.permissions || []).some(p => p === 'all' || p === 'vendormis' || p === 'operations')));
  const isVendorOwner = matchVendorUser(existingData, user);

  if (!isAdmin && !isVendorOwner) {
    return error(res, "You are not authorized to delete this entry.", 403);
  }

  // Vendors CANNOT delete approved entries
  if (!isAdmin && existingData.approvalStatus === 'Approved') {
    return error(res, "Approved trip entries cannot be deleted by vendors.", 403);
  }

  await db.collection("vendor_mis").doc(id).delete(req.user);
  await delCache(CACHE_KEY);

  return success(res, "Vendor MIS deleted successfully");
};

exports.addRemark_5 = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const user = req.user;

  if (!message || !message.trim()) {
    return error(res, "Message is required", 400);
  }

  const docRef = db.collection("vendor_mis").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return error(res, "Vendor MIS entry not found", 404);

  const existingData = doc.data();
  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimarg.com' || (user.role === 'Employee' && (user.permissions || []).some(p => p === 'all' || p === 'vendormis' || p === 'operations')));
  const isVendorOwner = matchVendorUser(existingData, user);

  if (!isAdmin && !isVendorOwner) {
    return error(res, "You are not authorized to comment on this entry.", 403);
  }

  // Remarks remain open for viewing and conversation even after approval
  const newRemark = {
    id: String(Date.now()),
    senderId: user.id,
    senderName: user.name || (isAdmin ? 'Admin' : (user.vendorName || 'Vendor')),
    senderRole: user.role || 'Vendor',
    message: message.trim(),
    createdAt: new Date().toISOString()
  };

  const updatedRemarks = [...(existingData.remarks || []), newRemark];
  await docRef.update({ remarks: updatedRemarks });
  await delCache(CACHE_KEY);

  return success(res, "Remark added successfully", newRemark);
};
