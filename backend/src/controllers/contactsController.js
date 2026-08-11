const { db } = require("../config/database");
const { success, error } = require("../utils/response");

exports.createContact = async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: "Name, email, and message are required" });
  }

  const newContact = {
    name,
    email,
    phone: phone || "",
    subject: subject || "No Subject",
    message,
    status: "New",
    createdAt: new Date().toISOString()
  };

  const docRef = await db.collection("contacts").add(newContact);
  return success(res, "Contact message sent successfully", { id: docRef.id, ...newContact });
};

exports.getContacts = async (req, res) => {
  const snapshot = await db.collection("contacts").orderBy("createdAt", "desc").get();
  const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return success(res, "Contacts fetched successfully", contacts);
};

exports.resolveContact = async (req, res) => {
  const { id } = req.params;
  const docRef = db.collection("contacts").doc(id);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    return res.status(404).json({ success: false, message: "Contact not found" });
  }

  await docRef.update({ status: "Resolved", resolvedAt: new Date().toISOString() });
  return success(res, "Contact marked as resolved");
};

exports.deleteContact = async (req, res) => {
  const { id } = req.params;
  const docRef = db.collection("contacts").doc(id);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    return res.status(404).json({ success: false, message: "Contact not found" });
  }

  await docRef.delete();
  return success(res, "Contact deleted successfully");
};
