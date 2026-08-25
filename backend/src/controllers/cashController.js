const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { logUserActivity } = require("../utils/activityLogger");
const { body, validationResult } = require("express-validator");
const { uploadFile } = require("../config/cloudinary");
const { runAnalyticsAggregation } = require("../jobs/analyticsJob");
const { emitDataUpdated } = require("../utils/socket");

const CACHE_KEY = "cashEntries";

const { recalculatePartyPayments } = require("../utils/paymentUtils");
exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("cashEntries").orderBy("date", "desc").get();
    const entries = [];
    snapshot.forEach(doc => entries.push({
      id: doc.id,
      ...doc.data()
    }));
    return entries;
  }, 300);
  return success(res, "Cash entries fetched successfully", data);
};

exports.postRoot_2 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  
  const entry = {
    amount: req.body.amount || 0,
    date: req.body.date || new Date().toISOString(),
    type: req.body.type,
    partyType: req.body.partyType || "",
    partyName: req.body.partyName || "",
    remarks: req.body.remarks || "",
    createdAt: new Date().toISOString()
  };
  
  if (req.body.fileData) {
    try {
      const uploadResult = await uploadFile(req.body.fileData, {
        folder: "multimarg/cash",
        resourceType: "auto"
      });
      if (uploadResult && uploadResult.url) {
        entry.cloudinaryUrl = uploadResult.url;
        entry.cloudinaryPublicId = uploadResult.publicId;
        entry.fileName = req.body.fileName || "cash_voucher";
      }
    } catch (uploadErr) {
      console.error("[CASH Cloudinary Error]", uploadErr.message);
    }
  }

  const docRef = await db.collection("cashEntries").add(entry);
  
  await recalculatePartyPayments(entry.partyType, entry.partyName);

  await Promise.all([
    delCache(CACHE_KEY),
    delCache("bills"),
    delCache("purchases"),
    delCache("outstanding"),
    delCache("openingBalances")
  ]);
  emitDataUpdated("cashEntries", "create");
  emitDataUpdated("bills", "update");
  emitDataUpdated("purchases", "update");
  emitDataUpdated("outstanding", "update");
  emitDataUpdated("outstanding", "update");
  emitDataUpdated("openingBalances", "update");

  logUserActivity(req, {
    type: 'cash_create',
    title: `Recorded Cash ${entry.type === 'out' ? 'Out (Disbursement)' : 'In (Receipt)'} of ₹${Number(entry.amount).toLocaleString('en-IN')} for ${entry.partyName || 'General'} (${entry.partyType || 'General'})`,
    details: { cashId: docRef.id, amount: entry.amount, party: entry.partyName }
  });

  return created(res, "Cash entry created successfully", {
    id: docRef.id,
    ...entry
  });
};

exports.delete_id_3 = async (req, res) => {
  const { id } = req.params;
  const docRef = db.collection("cashEntries").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return error(res, "Cash entry not found", 404);
  
  const data = doc.data();
  if (data.cloudinaryPublicId || data.cloudinaryUrl) {
    try {
      const { deleteFile } = require("../config/cloudinary");
      await deleteFile(data.cloudinaryPublicId || data.cloudinaryUrl);
    } catch (e) {
      console.warn("Failed to delete Cash voucher from Cloudinary:", e.message);
    }
  }

  await docRef.delete(req.user);
  await Promise.all([
    delCache(CACHE_KEY),
    delCache("bills"),
    delCache("purchases"),
    delCache("outstanding"),
    delCache("openingBalances")
  ]);
  emitDataUpdated("cashEntries", "delete");
  emitDataUpdated("bills", "update");
  emitDataUpdated("purchases", "update");
  emitDataUpdated("outstanding", "update");
  emitDataUpdated("openingBalances", "update");
  await recalculatePartyPayments(data.partyType, data.partyName);

  logUserActivity(req, {
    type: 'cash_delete',
    title: `Deleted Cash entry for ${data.partyName || 'General'} of ₹${Number(data.amount).toLocaleString('en-IN')}`,
    details: { cashId: id, amount: data.amount, party: data.partyName }
  });

  return success(res, "Cash entry deleted successfully");
};

exports.put_id_4 = async (req, res) => {
    const { id } = req.params;
    const docRef = db.collection("cashEntries").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return error(res, "Cash entry not found", 404);

    let voucherUrl = req.body.voucherUrl;
    let cloudinaryUrl = req.body.cloudinaryUrl;
    let cloudinaryPublicId = req.body.cloudinaryPublicId;
    let fileName = req.body.fileName;

    if (req.files && req.files.voucher) {
      // Handle array from multer or object from express-fileupload
      const file = Array.isArray(req.files.voucher) ? req.files.voucher[0] : req.files.voucher;
      const filePath = file.path || file.tempFilePath;
      const uploaded = await uploadFile(filePath, { folder: "cash_vouchers", resourceType: "auto" });
      if (uploaded && uploaded.success) {
        cloudinaryUrl = uploaded.url;
        cloudinaryPublicId = uploaded.publicId;
        voucherUrl = uploaded.url;
      }
    } else if (req.body.fileData) {
      const uploadResult = await uploadFile(req.body.fileData, {
        folder: "multimarg/cash",
        resourceType: "auto"
      });
      if (uploadResult && uploadResult.url) {
        cloudinaryUrl = uploadResult.url;
        cloudinaryPublicId = uploadResult.publicId;
        voucherUrl = uploadResult.url;
      }
    }

    const updateData = {
      ...req.body,
      cloudinaryUrl: cloudinaryUrl || doc.data().cloudinaryUrl,
      cloudinaryPublicId: cloudinaryPublicId || doc.data().cloudinaryPublicId,
      voucherUrl: voucherUrl || doc.data().voucherUrl,
      fileName: fileName || doc.data().fileName,
      updatedAt: new Date().toISOString()
    };

    delete updateData.fileData;
    delete updateData.id;

    await docRef.update(updateData);
    await Promise.all([
      delCache(CACHE_KEY),
      delCache("bills"),
      delCache("purchases"),
      delCache("outstanding"),
      delCache("openingBalances")
    ]);
    emitDataUpdated("cashEntries", "update");
    emitDataUpdated("bills", "update");
    emitDataUpdated("purchases", "update");
    emitDataUpdated("outstanding", "update");
    emitDataUpdated("openingBalances", "update");
    runAnalyticsAggregation().catch(e => console.error("Auto analytics sync failed", e));
    
    const oldPartyName = doc.data().partyName;
    const oldPartyType = doc.data().partyType;
    const newPartyName = updateData.partyName || oldPartyName;
    const newPartyType = updateData.partyType || oldPartyType;
    
    if (oldPartyName && (oldPartyName !== newPartyName || oldPartyType !== newPartyType)) {
        await recalculatePartyPayments(oldPartyType, oldPartyName);
    }
    await recalculatePartyPayments(newPartyType, newPartyName);
    return success(res, "Cash entry updated successfully");
};

exports.postImport = async (req, res) => {
  try {
    const { entries } = req.body;
    if (!entries || !Array.isArray(entries)) {
      return error(res, 'Invalid or missing entries array', 400);
    }
    
    const batch = db.batch();
    const uniqueClients = new Set();
    
    for (const row of entries) {
      const id = uuidv4();
      const docRef = db.collection('cashEntries').doc(id);
      
      const entryData = {
        id,
        amount: parseFloat(row.amount) || 0,
        date: row.date,
        type: 'in',
        partyType: 'Client',
        partyName: (row.client || '').toString().trim(),
        remarks: `Particulars: ${row.particulars || ''} | Bank: ${row.bankname || ''}`,
        createdAt: new Date()
      };
      
      batch.set(docRef, entryData);
      if (entryData.partyName) {
        uniqueClients.add(entryData.partyName);
      }
    }
    
    await batch.commit();
    
    for (const clientName of uniqueClients) {
      await recalculatePartyPayments('Client', clientName);
    }
    
    await delCache(CACHE_KEY);
    emitDataUpdated("cashEntries", "delete");
    return success(res, 'Import successful', { count: entries.length });
  } catch (err) {
    console.error('[Cash] Import Error:', err);
    return error(res, 'Failed to import cash entries');
  }
};

exports.postImportVendor = async (req, res) => {
  try {
    const { entries } = req.body;
    if (!entries || !Array.isArray(entries)) {
      return error(res, 'Invalid or missing entries array', 400);
    }
    
    const batch = db.batch();
    const uniqueVendors = new Set();
    
    for (const row of entries) {
      const id = uuidv4();
      const docRef = db.collection('cashEntries').doc(id);
      
      const entryData = {
        id,
        amount: parseFloat(row.amount) || 0,
        date: row.date || new Date().toISOString(),
        type: 'out',
        partyType: 'Vendor',
        partyName: (row.vendor || '').toString().trim(),
        remarks: (row.remarks || '').toString().trim(),
        createdAt: new Date()
      };
      
      batch.set(docRef, entryData);
      if (entryData.partyName) {
        uniqueVendors.add(entryData.partyName);
      }
    }
    
    await batch.commit();
    
    for (const vendorName of uniqueVendors) {
      await recalculatePartyPayments('Vendor', vendorName);
    }
    
    await delCache(CACHE_KEY);
    emitDataUpdated("cashEntries", "update");
    return success(res, 'Vendor import successful', { count: entries.length });
  } catch (err) {
    console.error('[Cash] Vendor Import Error:', err);
    return error(res, 'Failed to import vendor cash entries');
  }
};

exports.bulkDelete = async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return error(res, "No IDs provided for bulk deletion", 400);
  }

  const batch = db.batch();
  const partiesToRecalculate = new Set();
  const { deleteFile } = require("../config/cloudinary");

  for (const id of ids) {
    const docRef = db.collection("cashEntries").doc(id);
    const doc = await docRef.get();
    
    if (doc.exists) {
      const data = doc.data();
      
      // Attempt Cloudinary cleanup
      if (data.cloudinaryPublicId || data.cloudinaryUrl) {
        try {
          await deleteFile(data.cloudinaryPublicId || data.cloudinaryUrl);
        } catch (e) {
          console.warn("Bulk Delete: Failed to delete voucher from Cloudinary:", e.message);
        }
      }

      // Track parties for recalculation
      if (data.partyType && data.partyName) {
        partiesToRecalculate.add(JSON.stringify({ partyType: data.partyType, partyName: data.partyName }));
      }
      
      batch.delete(docRef);
    }
  }

  await batch.commit();
  await delCache(CACHE_KEY);
  emitDataUpdated("cashEntries", "create");

  // Recalculate balances
  for (const itemStr of partiesToRecalculate) {
    const { partyType, partyName } = JSON.parse(itemStr);
    await recalculatePartyPayments(partyType, partyName);
  }

  return success(res, `Successfully deleted ${ids.length} entries`);
};
