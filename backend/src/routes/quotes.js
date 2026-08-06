const express = require('express');
const router = express.Router();
const { db } = require("../config/database");

// GET /api/quotes — Fetch all quotes (Super Admin only)
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection("quotes").get();
    const quotes = [];

    snapshot.forEach(doc => {
      quotes.push({ id: doc.id, ...doc.data() });
    });

    // Sort by createdAt descending (newest first)
    quotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Stats
    const total = quotes.length;
    const estimated = quotes.filter(q => q.status === 'estimated').length;
    const proceeded = quotes.filter(q => q.status === 'proceeded').length;
    const today = new Date().toISOString().split('T')[0];
    const todayCount = quotes.filter(q => q.createdAt && q.createdAt.startsWith(today)).length;

    return res.json({
      success: true,
      data: quotes,
      stats: { total, estimated, proceeded, todayCount }
    });
  } catch (err) {
    console.error("Quotes fetch error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/quotes/:id — Delete a quote
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("quotes").doc(id).delete();
    return res.json({ success: true, message: "Quote deleted successfully" });
  } catch (err) {
    console.error("Quote delete error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
