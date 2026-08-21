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
    records = allRecords.filter(data => data.createdBy === user.id || matchVendorUser(data, user));
  }

  return success(res, "Trip MIS fetched successfully", records);
};

exports.postRoot_2 = async (req, res) => {
  const user = req.user;
  const payload = req.body;

  payload.createdAt = payload.createdAt || new Date().toISOString();
  payload.createdBy = user.id;
  payload.creatorRole = user.role;
  payload.creatorName = user.name || user.email || 'Unknown';

  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimarg.com');

  if (!isAdmin) {
    payload.approvalStatus = 'Pending';
  } else {
    payload.approvalStatus = payload.approvalStatus || 'Approved';
  }

  if (!payload.tripNo || payload.tripNo.trim() === '') {
    const clientName = payload.clientName || payload.vendorName || 'VEH';
    const clientPrefix = getClientShortForm(clientName);

    const snapshot = await db.collection("trip_mis").get();
    let maxNum = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      const tripNo = data.tripNo || '';
      if (tripNo.startsWith(clientPrefix)) {
        const match = tripNo.substring(clientPrefix.length).match(/[- ]?(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    const nextNum = maxNum + 1;
    payload.tripNo = `${clientPrefix} ${String(nextNum).padStart(4, '0')}`;
  }

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

  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimarg.com');
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
  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimarg.com');
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
  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimarg.com');
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
