const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { recalculatePartyPayments, recalculateAllPayments } = require("../utils/paymentUtils");
const { emitDataUpdated } = require("../utils/socket");

const CACHE_KEY = "outstanding";

exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("outstanding").orderBy("date", "desc").get();
    const entries = [];
    snapshot.forEach(doc => entries.push({
      id: doc.id,
      ...doc.data()
    }));
    return entries;
  }, 300);
  return success(res, "Outstanding entries fetched successfully", data);
};

exports.get_client_client_2 = async (req, res) => {
  const { client } = req.params;
  const snapshot = await db.collection("outstanding").where("client", "==", client).orderBy("date", "desc").get();
  const entries = [];
  snapshot.forEach(doc => entries.push({
    id: doc.id,
    ...doc.data()
  }));
  return success(res, "Outstanding entries fetched successfully", entries);
};

exports.postRoot_3 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const entry = req.body;
  entry.date = entry.date || new Date().toISOString();
  entry.createdAt = new Date().toISOString();
  entry.partyType = entry.partyType ? (String(entry.partyType).toLowerCase() === 'vendor' ? 'Vendor' : 'Client') : (entry.vendor && !entry.client ? 'Vendor' : 'Client');
  if (entry.partyType === 'Client') {
    entry.client = entry.client || entry.partyName || entry.vendor || '';
    entry.vendor = '';
  } else {
    entry.vendor = entry.vendor || entry.partyName || entry.client || '';
    entry.client = '';
  }
  const docRef = await db.collection("outstanding").add(entry);
  await delCache(CACHE_KEY);

  const partyName = entry.client || entry.vendor || entry.partyName;
  if (partyName) {
    try {
      await recalculatePartyPayments(entry.partyType, partyName);
    } catch (rErr) {
      console.error("Recalculate error after adjustment add:", rErr);
    }
  }

  emitDataUpdated("outstanding", "create");
  return created(res, "Outstanding entry created successfully", {
    id: docRef.id,
    ...entry
  });
};

exports.delete_id_4 = async (req, res) => {
  const { id } = req.params;
  const doc = await db.collection("outstanding").doc(id).get();
  if (!doc.exists) return error(res, "Outstanding entry not found", 404);
  const data = doc.data();

  await db.collection("outstanding").doc(id).delete(req.user);
  await delCache(CACHE_KEY);

  const partyType = data.partyType ? (String(data.partyType).toLowerCase() === 'vendor' ? 'Vendor' : 'Client') : (data.vendor && !data.client ? 'Vendor' : 'Client');
  const partyName = data.client || data.vendor || data.partyName;
  if (partyName) {
    try {
      await recalculatePartyPayments(partyType, partyName);
    } catch (rErr) {
      console.error("Recalculate error after adjustment delete:", rErr);
    }
  }

  emitDataUpdated("outstanding", "delete");
  return success(res, "Outstanding entry deleted successfully");
};

exports.put_id_5 = async (req, res) => {
  const { id } = req.params;
  const doc = await db.collection("outstanding").doc(id).get();
  if (!doc.exists) return error(res, "Outstanding entry not found", 404);
  
  const oldData = doc.data();
  const updateData = {
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  updateData.partyType = updateData.partyType ? (String(updateData.partyType).toLowerCase() === 'vendor' ? 'Vendor' : 'Client') : (updateData.vendor && !updateData.client ? 'Vendor' : 'Client');
  if (updateData.partyType === 'Client') {
    updateData.client = updateData.client || updateData.partyName || updateData.vendor || oldData.client || '';
    updateData.vendor = '';
  } else {
    updateData.vendor = updateData.vendor || updateData.partyName || updateData.client || oldData.vendor || '';
    updateData.client = '';
  }

  await db.collection("outstanding").doc(id).update(updateData);
  await delCache(CACHE_KEY);

  const partyName = updateData.client || updateData.vendor || updateData.partyName || oldData.client || oldData.vendor;
  if (partyName) {
    try {
      await recalculatePartyPayments(updateData.partyType, partyName);
      if (oldData.partyName && oldData.partyName !== partyName) {
        await recalculatePartyPayments(oldData.partyType || "Client", oldData.partyName);
      }
    } catch (rErr) {
      console.error("Recalculate error after adjustment update:", rErr);
    }
  } emitDataUpdated("outstanding", "update");
  return success(res, "Outstanding entry updated successfully", {
    id,
    ...updateData
  });
};

exports.recalculateAll = async (req, res) => {
  try {
    const result = await recalculateAllPayments();
    return success(res, "All client & vendor payments, TDS, and outstanding recalculated successfully", result);
  } catch (err) {
    console.error("Global recalculate error:", err);
    return error(res, "Failed to recalculate all entries: " + err.message, 500);
  }
};
