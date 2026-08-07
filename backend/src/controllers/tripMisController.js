const { db } = require("../config/database");
const { success, created, error } = require("../utils/response");
const { getNextSequence } = require("../utils/sequenceGenerator");
const { getOrSet, delCache } = require("../config/redis");

const CACHE_KEY = "trip_mis";

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
  return Boolean(nameMatch || emailMatch);
};

exports.getRoot_1 = async (req, res) => {
  const user = req.user;
  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimargcarriers.co.in');
  const isClient = user && (user.role === 'Client' || user.role?.toLowerCase() === 'client');
  
  // Cache the full collection, then filter per-user in memory (fast)
  const allRecords = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("trip_mis").orderBy("createdAt", "desc").get();
    const records = [];
    snapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() }));
    return records;
  }, 300);
  
  let records = allRecords;
  if (isClient) {
    records = allRecords.filter(data => matchClientUser(data, user));
  } else if (!isAdmin) {
    records = allRecords.filter(data => data.createdBy === user.id);
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
  
  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimargcarriers.co.in');

  // Non-admins have their entries marked as 'Pending' automatically
  if (!isAdmin) {
    payload.approvalStatus = 'Pending';
  } else {
    payload.approvalStatus = 'Approved';
  }
  
  if (!payload.tripNo || payload.tripNo.trim() === '') {
    payload.tripNo = await getNextSequence('TRP');
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
  
  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimargcarriers.co.in');
  const isClient = user && (user.role === 'Client' || user.role?.toLowerCase() === 'client');

  if (isClient) {
    const updateData = {};
    if (req.body.approvalStatus) {
      updateData.approvalStatus = req.body.approvalStatus;
    }
    await db.collection("trip_mis").doc(id).update(updateData);
    await delCache(CACHE_KEY);
    return success(res, "Trip MIS approval status updated successfully", { id, ...existingData, ...updateData });
  }

  // Non-admins cannot update approvalStatus
  if (!isAdmin && req.body.approvalStatus && req.body.approvalStatus !== existingData.approvalStatus) {
    return error(res, "You are not allowed to approve or reject entries.", 403);
  }

  // Non-admins can only edit their own entries
  if (!isAdmin && existingData.createdBy !== user.id) {
    return error(res, "You are not authorized to edit this entry.", 403);
  }
  
  delete req.body.id;
  delete req.body.remarks;

  await db.collection("trip_mis").doc(id).update(req.body);
  await delCache(CACHE_KEY);
  
  return success(res, "Trip MIS updated successfully", {
    id,
    ...existingData,
    ...req.body
  });
};

exports.delete_id_4 = async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  
  const doc = await db.collection("trip_mis").doc(id).get();
  if (!doc.exists) return error(res, "Trip MIS entry not found", 404);
  
  const existingData = doc.data();
  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimargcarriers.co.in');
  if (user && (user.role === 'Client' || user.role?.toLowerCase() === 'client')) {
    return error(res, "Clients are not authorized to delete entries.", 403);
  }
  if (!isAdmin && existingData.createdBy !== user.id) {
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
  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimargcarriers.co.in');
  const isClient = user && (user.role === 'Client' || user.role?.toLowerCase() === 'client');
  const isClientMatch = isClient && matchClientUser(existingData, user);

  if (!isAdmin && !isClientMatch && existingData.createdBy !== user.id) {
    return error(res, "You are not authorized to comment on this entry.", 403);
  }

  const newRemark = {
    id: String(Date.now()),
    senderId: user.id,
    senderName: user.name || (isAdmin ? 'Admin' : 'Client'),
    senderRole: user.role || 'Client',
    message: message.trim(),
    createdAt: new Date().toISOString()
  };

  const updatedRemarks = [...(existingData.remarks || []), newRemark];
  await docRef.update({ remarks: updatedRemarks });

  return success(res, "Remark added successfully", newRemark);
};
