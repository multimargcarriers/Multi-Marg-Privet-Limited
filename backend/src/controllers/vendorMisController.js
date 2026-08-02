const { db } = require("../config/database");
const { success, created, error } = require("../utils/response");
const { getNextSequence } = require("../utils/sequenceGenerator");

exports.getRoot_1 = async (req, res) => {
  const user = req.user;
  
  let query = db.collection("vendor_mis").orderBy("createdAt", "desc");
  
  // If user is a Vendor, they can only see their own entries
  if (user && user.role && user.role.toLowerCase() === 'vendor') {
    query = db.collection("vendor_mis").where("createdBy", "==", user.id).orderBy("createdAt", "desc");
  }
  
  const snapshot = await query.get();
  const records = [];
  snapshot.forEach(doc => records.push({
    id: doc.id,
    ...doc.data()
  }));
  
  return success(res, "Vendor MIS fetched successfully", records);
};

exports.postRoot_2 = async (req, res) => {
  const user = req.user;
  const payload = req.body;
  
  payload.createdAt = payload.createdAt || new Date().toISOString();
  payload.createdBy = user.id;
  payload.creatorRole = user.role;
  payload.creatorName = user.name || user.email || 'Unknown';
  
  // Vendors have their entries marked as 'Pending' automatically
  if (user && user.role && user.role.toLowerCase() === 'vendor') {
    payload.approvalStatus = 'Pending';
  } else {
    payload.approvalStatus = 'Approved';
  }
  
  if (!payload.tripNo || payload.tripNo.trim() === '') {
    payload.tripNo = await getNextSequence('TRP');
  }
  
  const docRef = await db.collection("vendor_mis").add(payload);
  
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
  
  // Vendors cannot update approvalStatus
  if (user && user.role && user.role.toLowerCase() === 'vendor' && req.body.approvalStatus && req.body.approvalStatus !== existingData.approvalStatus) {
    return error(res, "Vendors are not allowed to approve or reject entries.", 403);
  }

  // Vendors can only edit their own entries
  if (user && user.role && user.role.toLowerCase() === 'vendor' && existingData.createdBy !== user.id) {
    return error(res, "You are not authorized to edit this entry.", 403);
  }
  
  await db.collection("vendor_mis").doc(id).update(req.body);
  
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
  if (user && user.role && user.role.toLowerCase() === 'vendor' && existingData.createdBy !== user.id) {
    return error(res, "You are not authorized to delete this entry.", 403);
  }
  
  await db.collection("vendor_mis").doc(id).delete();
  
  return success(res, "Vendor MIS deleted successfully");
};
