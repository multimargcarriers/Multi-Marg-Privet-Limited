const { db } = require("../config/database");
const { success, created, error } = require("../utils/response");

const getCollectionName = (type) => {
  const allowed = ["faqs", "careers", "services"];
  if (!allowed.includes(type)) return null;
  return type;
};

// --- Admin Protected Controllers ---

exports.getAll = async (req, res, next) => {
  try {
    const { type } = req.params;
    const collectionName = getCollectionName(type);
    if (!collectionName) return error(res, "Invalid CMS type", 400);

    const snapshot = await db.collection(collectionName).get();
    const data = [];
    snapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort logic
    if (type === 'faqs' || type === 'services') {
      data.sort((a, b) => (a.order || 0) - (b.order || 0));
    } else if (type === 'careers') {
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return success(res, "CMS Data fetched successfully", data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { type } = req.params;
    const collectionName = getCollectionName(type);
    if (!collectionName) return error(res, "Invalid CMS type", 400);

    const newDoc = {
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection(collectionName).add(newDoc);
    
    return created(res, "Item created successfully", { id: docRef.id, ...newDoc });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const collectionName = getCollectionName(type);
    if (!collectionName) return error(res, "Invalid CMS type", 400);

    const docRef = db.collection(collectionName).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return error(res, "Item not found", 404);
    }

    const updates = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    delete updates.id;

    await docRef.update(updates);
    
    return success(res, "Item updated successfully", { id, ...docSnap.data(), ...updates });
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const collectionName = getCollectionName(type);
    if (!collectionName) return error(res, "Invalid CMS type", 400);

    const docRef = db.collection(collectionName).doc(id);
    await docRef.delete();
    
    return success(res, "Item deleted successfully");
  } catch (err) {
    next(err);
  }
};

// --- Public Controllers ---

exports.getPublicAll = async (req, res, next) => {
  try {
    const { type } = req.params;
    const collectionName = getCollectionName(type);
    if (!collectionName) return res.status(400).json({ success: false, message: "Invalid CMS type" });

    const snapshot = await db.collection(collectionName).get();
    const data = [];
    snapshot.forEach((doc) => {
      const item = doc.data();
      if (item.isActive !== false) {
         data.push({ id: doc.id, ...item });
      }
    });

    if (type === 'faqs' || type === 'services') {
      data.sort((a, b) => (a.order || 0) - (b.order || 0));
    } else if (type === 'careers') {
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return res.json({ success: true, message: "Data fetched", data });
  } catch (err) {
    console.error("Public CMS Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
