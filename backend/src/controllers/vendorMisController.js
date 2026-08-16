const { db } = require("../config/database");
const { success, created, error } = require("../utils/response");
const { getNextSequence } = require("../utils/sequenceGenerator");
const { getOrSet, delCache } = require("../config/redis");

const CACHE_KEY = "vendor_mis";

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
  if (!isAdmin) {
    records = allRecords.filter(r => r.createdBy === user.id);
  }

  return success(res, "Vendor MIS fetched successfully", records);
};

exports.postRoot_2 = async (req, res) => {
  const user = req.user;
  const payload = req.body;

  payload.createdAt = payload.createdAt || new Date().toISOString();
  payload.createdBy = user.id;
  payload.creatorRole = user.role;
  payload.creatorName = user.name || user.email || 'Unknown';

  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimarg.com');

  // Non-admins have their entries marked as 'Pending' automatically
  if (!isAdmin) {
    payload.approvalStatus = 'Pending';
  } else {
    payload.approvalStatus = 'Approved';
  }

  if (!payload.tripNo || payload.tripNo.trim() === '') {
    const snapshot = await db.collection("vendor_mis").get();
    let maxNum = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      const tripNo = data.tripNo || '';
      const match = tripNo.match(/^((VEH|VEN)-)?(\d+)(-(VEH|VEN))?$/);
      if (match) {
        const num = parseInt(match[3], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    payload.tripNo = `VEN-${String(nextNum).padStart(4, '0')}`;
  }

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

  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimarg.com');

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

  await db.collection("vendor_mis").doc(id).update(req.body);
  await delCache(CACHE_KEY);

  return success(res, "Vendor MIS updated successfully", {
    id,
    ...existingData,
    ...req.body
  });
};

exports.delete_id_4 = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const doc = await db.collection("vendor_mis").doc(id).get();
  if (!doc.exists) return error(res, "Vendor MIS entry not found", 404);

  const existingData = doc.data();
  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimarg.com');

  if (!isAdmin && existingData.createdBy !== user.id) {
    return error(res, "You are not authorized to delete this entry.", 403);
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
  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimarg.com');

  if (!isAdmin && existingData.createdBy !== user.id) {
    return error(res, "You are not authorized to comment on this entry.", 403);
  }
  if (!isAdmin && existingData.approvalStatus === 'Approved') {
    return error(res, "Remarks are closed because this entry is Approved.", 403);
  }

  const newRemark = {
    id: String(Date.now()),
    senderId: user.id,
    senderName: user.name || (isAdmin ? 'Admin' : 'Vendor'),
    senderRole: user.role || 'Vendor',
    message: message.trim(),
    createdAt: new Date().toISOString()
  };

  const updatedRemarks = [...(existingData.remarks || []), newRemark];
  await docRef.update({ remarks: updatedRemarks });

  return success(res, "Remark added successfully", newRemark);
};
