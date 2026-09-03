const { db } = require("../config/database");
const { success, created, error } = require("../utils/response");
const { getNextSequence } = require("../utils/sequenceGenerator");
const { getOrSet, delCache } = require("../config/redis");

const CACHE_KEY = "trip_mis";

const getClientShortForm = (clientName) => {
  if (!clientName) return "VEH";
  const clean = clientName.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length >= 4) {
    return clean.substring(0, 4);
  }
  return clean.padEnd(4, 'X');
};

const matchClientUser = (data, user) => {
  if (!user) return false;
  const clientVal = (data.clientName || data.client || data.client_name || '').toLowerCase().trim();
  const userName = (user.name || '').toLowerCase().trim();
  const userEmail = (user.email || '').toLowerCase().trim();
  const nameMatch = clientVal && userName && (
    clientVal === userName ||
    clientVal.includes(userName) ||
    userName.includes(clientVal)
  );
  const emailMatch = data.clientEmail && userEmail && data.clientEmail.toLowerCase().trim() === userEmail;
  return Boolean(nameMatch || emailMatch || data.createdBy === user.id);
};

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
  const isClient = user && (user.role === 'Client' || user.role?.toLowerCase() === 'client');
  const isVendor = user && (user.role === 'Vendor' || user.role?.toLowerCase() === 'vendor');

  // Cache the full collection, then filter per-user in memory
  const allRecords = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("trip_mis").orderBy("createdAt", "desc").get();
    const records = [];
    snapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() }));
    return records;
  }, 300);

  let records = allRecords;
  if (isClient) {
    records = allRecords.filter(data => matchClientUser(data, user));
  } else if (isVendor) {
    records = allRecords.filter(data => matchVendorUser(data, user));
  } else if (!isAdmin) {
    // Employees can only see entries they created
    records = allRecords.filter(data => data.createdBy === user.id);
  }

  return success(res, "Trip MIS fetched successfully", records);
};

const getMongoDb = async () => {
  if (db.mongoDb) return db.mongoDb;
  if (db.readyPromise) {
    const d = await db.readyPromise;
    if (d) return d;
  }
  throw new Error("MongoDB not connected");
};

const getNextTripMisSequence = async (clientPrefix) => {
  const mongoDb = await getMongoDb();
  const countersCol = mongoDb.collection("counters");
  const tripCol = mongoDb.collection("trip_mis");
  const prefix = (clientPrefix || "VEH").toUpperCase().trim();
  const counterId = `trip_mis_counter_${prefix}`;

  // Step 1: Ensure counter exists and syncs with existing max numeric sequence for this prefix
  const counterDoc = await countersCol.findOne({ _id: counterId });
  if (!counterDoc || typeof counterDoc.seq !== "number") {
    let maxNum = 0;
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingTrips = await tripCol.find(
      { tripNo: new RegExp('^' + escapedPrefix, 'i') },
      { projection: { tripNo: 1 } }
    ).toArray();

    existingTrips.forEach((t) => {
      const tripNo = t.tripNo || "";
      const match = tripNo.substring(prefix.length).match(/[- ]?(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    await countersCol.findOneAndUpdate(
      { _id: counterId },
      { $max: { seq: maxNum } },
      { returnDocument: "after", upsert: true }
    );
  }

  // Step 2: Atomic sequence increment with collision check
  let finalTripNo = null;
  while (!finalTripNo) {
    const updatedCounter = await countersCol.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true }
    );

    const seqVal = updatedCounter.seq ?? updatedCounter.value?.seq;
    const candidateTripNo = `${prefix} ${String(seqVal).padStart(4, "0")}`;

    // Verify candidate is not already used in DB (case-insensitive)
    const escapedCandidate = candidateTripNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await tripCol.findOne({
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

  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimarg.com' || (user.role === 'Employee' && (user.permissions || []).some(p => p === 'all' || p === 'tripmis' || p === 'operations')));

  if (!isAdmin) {
    payload.approvalStatus = 'Pending';
  } else {
    payload.approvalStatus = payload.approvalStatus || 'Approved';
  }

  const clientName = payload.clientName || payload.vendorName || 'VEH';
  const clientPrefix = getClientShortForm(clientName);

  const isAutoAssigned = !payload.tripNo || 
    payload.tripNo.trim() === '' || 
    payload.tripNo.toUpperCase().startsWith('TRP-') ||
    payload.tripNo.toLowerCase().includes('auto') ||
    payload.isManualTripNo !== true;

  if (isAutoAssigned) {
    // Sequential number allocated atomically upon DB arrival
    payload.tripNo = await getNextTripMisSequence(clientPrefix);
  } else {
    // Manual tripNo specified by SuperAdmin: verify it's unique!
    const mongoDb = await getMongoDb();
    const cleanTripNo = payload.tripNo.trim();
    const escapedTripNo = cleanTripNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await mongoDb.collection("trip_mis").findOne({
      tripNo: { $regex: new RegExp(`^${escapedTripNo}$`, 'i') }
    });
    if (existing) {
      return error(res, `A Vehicle Trip MIS entry with number "${cleanTripNo}" already exists in the database.`, 400);
    }
    payload.tripNo = cleanTripNo;
  }
  delete payload.isManualTripNo;

  const docRef = await db.collection("trip_mis").add(payload);
  await delCache(CACHE_KEY);

  return created(res, "Trip MIS entry created successfully", {
    id: docRef.id,
    ...payload
  });
};

exports.put_id_3 = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const doc = await db.collection("trip_mis").doc(id).get();
  if (!doc.exists) return error(res, "Trip MIS entry not found", 404);

  const existingData = doc.data();

  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimarg.com' || (user.role === 'Employee' && (user.permissions || []).some(p => p === 'all' || p === 'tripmis' || p === 'operations')));
  const isClient = user && (user.role === 'Client' || user.role?.toLowerCase() === 'client');
  const isVendor = user && (user.role === 'Vendor' || user.role?.toLowerCase() === 'vendor');
  const isOwner = matchClientUser(existingData, user) || matchVendorUser(existingData, user);

  if (isClient) {
    const updateData = {};
    if (req.body.approvalStatus) {
      updateData.approvalStatus = req.body.approvalStatus;
    }
    await db.collection("trip_mis").doc(id).update(updateData);
    await delCache(CACHE_KEY);
    return success(res, "Trip MIS approval status updated successfully", { id, ...existingData, ...updateData });
  }

  // Once Approved, non-admins cannot edit (Locked)
  if (!isAdmin && existingData.approvalStatus === 'Approved') {
    return error(res, "This trip entry is Approved and locked. Contact Admin to make changes.", 403);
  }

  // Non-admins cannot update approvalStatus to 'Approved'
  if (!isAdmin && req.body.approvalStatus && req.body.approvalStatus === 'Approved') {
    return error(res, "Only Admin can approve trip entries.", 403);
  }

  // Authorization check
  if (!isAdmin && !isOwner && existingData.createdBy !== user.id) {
    return error(res, "You are not authorized to edit this entry.", 403);
  }

  const updatePayload = { ...req.body };
  delete updatePayload.id;
  delete updatePayload.remarks;
  delete updatePayload.isManualTripNo;

  if (updatePayload.tripNo && updatePayload.tripNo.trim() !== (existingData.tripNo || '').trim()) {
    const mongoDb = await getMongoDb();
    const cleanTripNo = updatePayload.tripNo.trim();
    const escapedTripNo = cleanTripNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await mongoDb.collection("trip_mis").findOne({
      _id: { $ne: id },
      tripNo: { $regex: new RegExp(`^${escapedTripNo}$`, 'i') }
    });
    if (existing) {
      return error(res, `Vehicle Trip number "${cleanTripNo}" is already used by another trip entry.`, 400);
    }
    updatePayload.tripNo = cleanTripNo;
  }

  if (!isAdmin && isVendor && updatePayload.approvalStatus === undefined) {
    if (existingData.approvalStatus === 'Pending' || !existingData.approvalStatus) {
      updatePayload.approvalStatus = 'Submitted';
    }
  }

  updatePayload.updatedAt = new Date().toISOString();
  updatePayload.lastModifiedBy = user.name || user.email || 'User';

  await db.collection("trip_mis").doc(id).update(updatePayload);
  await delCache(CACHE_KEY);

  return success(res, "Trip MIS updated successfully", {
    id,
    ...existingData,
    ...updatePayload
  });
};

exports.delete_id_4 = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const doc = await db.collection("trip_mis").doc(id).get();
  if (!doc.exists) return error(res, "Trip MIS entry not found", 404);

  const existingData = doc.data();
  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimarg.com' || (user.role === 'Employee' && (user.permissions || []).some(p => p === 'all' || p === 'tripmis' || p === 'operations')));
  const isOwner = matchClientUser(existingData, user) || matchVendorUser(existingData, user);

  if (user && (user.role === 'Client' || user.role?.toLowerCase() === 'client')) {
    return error(res, "Clients are not authorized to delete entries.", 403);
  }

  // Vendors/non-admins CANNOT delete approved entries
  if (!isAdmin && existingData.approvalStatus === 'Approved') {
    return error(res, "Approved trip entries cannot be deleted.", 403);
  }

  if (!isAdmin && !isOwner && existingData.createdBy !== user.id) {
    return error(res, "You are not authorized to delete this entry.", 403);
  }

  await db.collection("trip_mis").doc(id).delete(req.user);
  await delCache(CACHE_KEY);

  return success(res, "Trip MIS deleted successfully");
};

exports.addRemark_5 = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const user = req.user;

  if (!message || !message.trim()) {
    return error(res, "Message is required", 400);
  }

  const docRef = db.collection("trip_mis").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return error(res, "Trip MIS entry not found", 404);

  const existingData = doc.data();
  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimarg.com' || (user.role === 'Employee' && (user.permissions || []).some(p => p === 'all' || p === 'tripmis' || p === 'operations')));
  const isClientMatch = matchClientUser(existingData, user);
  const isVendorMatch = matchVendorUser(existingData, user);

  if (!isAdmin && !isClientMatch && !isVendorMatch && existingData.createdBy !== user.id) {
    return error(res, "You are not authorized to comment on this entry.", 403);
  }

  const newRemark = {
    id: String(Date.now()),
    senderId: user.id,
    senderName: user.name || (isAdmin ? 'Admin' : (user.vendorName || user.role || 'User')),
    senderRole: user.role || 'User',
    message: message.trim(),
    createdAt: new Date().toISOString()
  };

  const updatedRemarks = [...(existingData.remarks || []), newRemark];
  await docRef.update({ remarks: updatedRemarks });
  await delCache(CACHE_KEY);

  return success(res, "Remark added successfully", newRemark);
};
