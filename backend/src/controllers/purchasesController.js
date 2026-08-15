const { emitDataUpdated } = require("../utils/socket");
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { uploadFile } = require("../config/cloudinary");
const { recalculatePartyPayments } = require("../utils/paymentUtils");
const CACHE_KEY = "purchases";

exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("purchases").orderBy("date", "desc").get();
    const purchases = [];
    snapshot.forEach(doc => purchases.push({
      id: doc.id,
      ...doc.data()
    }));
    return purchases;
  }, 300);
  return success(res, "Purchases fetched successfully", data);
};

exports.postRoot_2 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  
  const purchase = {
    vendor: req.body.vendor || "",
    billNo: req.body.billNo || "",
    date: req.body.date || new Date().toISOString(),
    taxable: req.body.taxable || 0,
    gst: req.body.gst || 0,
    total: req.body.total || 0,
    paidAmount: 0,
    status: "Unpaid",
    createdAt: new Date().toISOString()
  };

  if (req.body.fileData) {
    try {
      const uploadResult = await uploadFile(req.body.fileData, {
        folder: "multimarg/purchases",
        resourceType: "auto"
      });
      if (uploadResult && uploadResult.url) {
        purchase.cloudinaryUrl = uploadResult.url;
        purchase.cloudinaryPublicId = uploadResult.publicId;
        purchase.fileName = req.body.fileName || "purchase_bill";
      }
    } catch (uploadErr) {
      console.error("[PURCHASE Cloudinary Error]", uploadErr.message);
    }
  }

  const docRef = await db.collection("purchases").add(purchase);
  if (purchase.vendor) {
    await recalculatePartyPayments('Vendor', purchase.vendor);
  }
  await delCache(CACHE_KEY);
  emitDataUpdated("purchases", "create");
  return created(res, "Purchase created successfully", {
    id: docRef.id,
    ...purchase
  });
};

exports.put_id_4 = async (req, res) => {
  const { id } = req.params;
  const docRef = db.collection("purchases").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return error(res, "Purchase entry not found", 404);

  let voucherUrl = req.body.voucherUrl;
  let cloudinaryUrl = req.body.cloudinaryUrl;
  let cloudinaryPublicId = req.body.cloudinaryPublicId;
  let fileName = req.body.fileName;

  if (req.files && req.files.voucher) {
    const file = Array.isArray(req.files.voucher) ? req.files.voucher[0] : req.files.voucher;
    const filePath = file.path || file.tempFilePath;
    const uploaded = await uploadFile(filePath, { folder: "purchase_vouchers", resourceType: "auto" });
    if (uploaded && uploaded.success) {
      cloudinaryUrl = uploaded.url;
      cloudinaryPublicId = uploaded.publicId;
      voucherUrl = uploaded.url;
    }
  } else if (req.body.fileData) {
    const uploadResult = await uploadFile(req.body.fileData, {
      folder: "multimarg/purchases",
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
  const oldVendor = doc.data().vendor;
  const newVendor = updateData.vendor || oldVendor;
  if (oldVendor && oldVendor !== newVendor) {
      await recalculatePartyPayments('Vendor', oldVendor);
  }
  if (newVendor) {
      await recalculatePartyPayments('Vendor', newVendor);
  }
  await delCache(CACHE_KEY);
  
  return success(res, "Purchase entry updated successfully");
};

exports.delete_id_3 = async (req, res) => {
  const { id } = req.params;
  const docRef = db.collection("purchases").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return error(res, "Purchase not found", 404);
  
  const data = doc.data();
  if (data.cloudinaryPublicId || data.cloudinaryUrl) {
    try {
      const { deleteFile } = require("../config/cloudinary");
      await deleteFile(data.cloudinaryPublicId || data.cloudinaryUrl);
    } catch (e) {
      console.warn("Failed to delete Purchase bill from Cloudinary:", e.message);
    }
  }

  await docRef.delete(req.user);
  if (data.vendor) {
    await recalculatePartyPayments('Vendor', data.vendor);
  }
  await delCache(CACHE_KEY);
  emitDataUpdated("purchases", "update");
    return success(res, "Purchase deleted successfully");
};

exports.postImport = async (req, res) => {
  try {
    const { entries } = req.body;
    if (!entries || !Array.isArray(entries)) {
      return error(res, 'Invalid or missing entries array', 400);
    }
    
    const batch = db.batch();
    const uniqueVendors = new Set();
    
    for (const row of entries) {
      const id = uuidv4();
      const docRef = db.collection('purchases').doc(id);
      
      const purchaseData = {
        id,
        vendor: (row.vendor || '').toString().trim(),
        billNo: (row.bill || '').toString().trim(),
        date: row.date || new Date().toISOString(),
        taxable: parseFloat(row.subtotal) || 0,
        gst: parseFloat(row.gst) || 0,
        total: parseFloat(row.total) || 0,
        paidAmount: 0,
        status: "Unpaid",
        createdAt: new Date().toISOString()
      };
      
      batch.set(docRef, purchaseData);
      if (purchaseData.vendor) {
        uniqueVendors.add(purchaseData.vendor);
      }
    }
    
    await batch.commit();
    
    for (const vendorName of uniqueVendors) {
      await recalculatePartyPayments('Vendor', vendorName);
    }
    
    await delCache(CACHE_KEY);
    emitDataUpdated("purchases", "delete");
    return success(res, 'Import successful', { count: entries.length });
  } catch (err) {
    console.error('[Purchases] Import Error:', err);
    return error(res, 'Failed to import purchases');
  }
};
