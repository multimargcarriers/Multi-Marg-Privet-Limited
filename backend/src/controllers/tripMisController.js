const { db } = require("../config/database");
const { success, created, error } = require("../utils/response");
const { getNextSequence } = require("../utils/sequenceGenerator");

exports.getRoot_1 = async (req, res) => {
  const user = req.user;
  
  let query = db.collection("trip_mis").orderBy("createdAt", "desc");
  
  const isAdmin = user && (user.role === 'SuperAdmin' || user.role === 'Admin' || user.email === 'admin@multimargcarriers.co.in');

  // If user is not an Admin, they can only see their own trips
  if (!isAdmin) {
    query = db.collection("trip_mis").where("createdBy", "==", user.id).orderBy("createdAt", "desc");
  }
  
  const snapshot = await query.get();
  const records = [];
  snapshot.forEach(doc => records.push({
    id: doc.id,
    ...doc.data()
  }));
  
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

  // Non-admins cannot update approvalStatus
  if (!isAdmin && req.body.approvalStatus && req.body.approvalStatus !== existingData.approvalStatus) {
    return error(res, "You are not allowed to approve or reject entries.", 403);
  }

  // Non-admins can only edit their own entries
  if (!isAdmin && existingData.createdBy !== user.id) {
    return error(res, "You are not authorized to edit this entry.", 403);
  }
  
  await db.collection("trip_mis").doc(id).update(req.body);
  
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

  if (!isAdmin && existingData.createdBy !== user.id) {
    return error(res, "You are not authorized to delete this entry.", 403);
  }
  
  await db.collection("trip_mis").doc(id).delete();
  
  return success(res, "Trip MIS deleted successfully");
};
