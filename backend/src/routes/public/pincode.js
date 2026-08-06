const express = require('express');
const router = express.Router();
const { db } = require("../../config/database");

// GET /api/public/pincode/:pincode
// Checks serviceability for a given pincode
router.get('/:pincode', async (req, res) => {
  try {
    const { pincode } = req.params;
    
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ success: false, message: "Please enter a valid 6-digit Indian Pincode" });
    }

    // 1. Fetch data from Indian Postal API
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await response.json();

    if (!data || !data[0] || data[0].Status === 'Error' || !data[0].PostOffice || data[0].PostOffice.length === 0) {
      return res.status(404).json({ success: false, message: "Invalid pincode or details not found" });
    }

    const postOffice = data[0].PostOffice[0];
    const districtUpper = postOffice.District.toUpperCase();
    const stateUpper = postOffice.State.toUpperCase();
    const district = postOffice.District.toLowerCase();
    const state = postOffice.State.toLowerCase();

    // 2. Fetch all branches to check coverage
    const snapshot = await db.collection("branches").get();
    let exactBranchMatch = null;
    let stateBranchMatch = null;
    
    snapshot.forEach(doc => {
      const b = doc.data();
      b._id = doc.id;
      const branchAddress = (b.address || "").toLowerCase();
      const branchName = (b.branch || "").toLowerCase();
      
      // Check for exact district/city match
      if (branchAddress.includes(district) || branchName.includes(district)) {
        if (!exactBranchMatch) exactBranchMatch = b;
      }
      
      // Check for state match as fallback
      if (branchAddress.includes(state) || branchName.includes(state)) {
        if (!stateBranchMatch) stateBranchMatch = b;
      }
    });

    let serviceability = {
      isServiceable: false,
      message: "",
      nearestBranch: null,
      location: `${districtUpper}, ${stateUpper}`,
      district: districtUpper,
      state: stateUpper,
      pincode: pincode
    };

    if (exactBranchMatch) {
      serviceability.isServiceable = true;
      serviceability.message = `Yes! We deliver to ${districtUpper}, ${stateUpper}. We have a direct branch in ${districtUpper}.`;
      serviceability.nearestBranch = exactBranchMatch;
    } else if (stateBranchMatch) {
      const branchCity = (stateBranchMatch.branch || "").toUpperCase();
      serviceability.isServiceable = true;
      serviceability.message = `Yes! We deliver to ${districtUpper}, ${stateUpper}. Our nearest branch is in ${branchCity}.`;
      serviceability.nearestBranch = stateBranchMatch;
    } else {
      serviceability.isServiceable = true;
      serviceability.message = `Yes! We deliver to ${stateUpper} through our extended Pan-India network.`;
    }

    return res.json({
      success: true,
      data: serviceability
    });

  } catch (err) {
    console.error("Public pincode error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
