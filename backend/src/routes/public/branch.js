const express = require('express');
const router = express.Router();
const { db } = require("../../config/database");

// GET /api/public/branch
// Fetches all active branches for public viewing
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection("branches").get();
    const branches = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // Only return necessary public information, omitting sensitive fields if any
      branches.push({
        id: doc.id,
        code: data.code || "",
        branch: data.branch || "",
        name: data.name || "", // Contact Person
        address: data.address || "",
        phno: data.phno || "",
        email: data.email || ""
      });
    });

    // Sort alphabetically by branch name
    branches.sort((a, b) => a.branch.localeCompare(b.branch));

    return res.json({
      success: true,
      message: "Branches fetched successfully",
      data: branches
    });
  } catch (err) {
    console.error("Public branch error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
