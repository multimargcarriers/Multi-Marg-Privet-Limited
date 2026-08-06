const express = require('express');
const router = express.Router();
const { db } = require("../../config/database");

// ============================================================
// Pincode coordinate lookup (approximate lat/lng for Indian pincodes)
// Uses India Post API for district/state info
// ============================================================

// Approximate state capital coordinates for distance estimation
const STATE_COORDS = {
  "andhra pradesh": { lat: 15.9129, lng: 79.7400 },
  "arunachal pradesh": { lat: 27.1004, lng: 93.6167 },
  "assam": { lat: 26.2006, lng: 92.9376 },
  "bihar": { lat: 25.0961, lng: 85.3131 },
  "chhattisgarh": { lat: 21.2787, lng: 81.8661 },
  "goa": { lat: 15.2993, lng: 74.1240 },
  "gujarat": { lat: 22.2587, lng: 71.1924 },
  "haryana": { lat: 29.0588, lng: 76.0856 },
  "himachal pradesh": { lat: 31.1048, lng: 77.1734 },
  "jharkhand": { lat: 23.6102, lng: 85.2799 },
  "karnataka": { lat: 15.3173, lng: 75.7139 },
  "kerala": { lat: 10.8505, lng: 76.2711 },
  "madhya pradesh": { lat: 22.9734, lng: 78.6569 },
  "maharashtra": { lat: 19.7515, lng: 75.7139 },
  "manipur": { lat: 24.6637, lng: 93.9063 },
  "meghalaya": { lat: 25.4670, lng: 91.3662 },
  "mizoram": { lat: 23.1645, lng: 92.9376 },
  "nagaland": { lat: 26.1584, lng: 94.5624 },
  "odisha": { lat: 20.9517, lng: 85.0985 },
  "punjab": { lat: 31.1471, lng: 75.3412 },
  "rajasthan": { lat: 27.0238, lng: 74.2179 },
  "sikkim": { lat: 27.5330, lng: 88.5122 },
  "tamil nadu": { lat: 11.1271, lng: 78.6569 },
  "telangana": { lat: 18.1124, lng: 79.0193 },
  "tripura": { lat: 23.9408, lng: 91.9882 },
  "uttar pradesh": { lat: 26.8467, lng: 80.9462 },
  "uttarakhand": { lat: 30.0668, lng: 79.0193 },
  "west bengal": { lat: 22.9868, lng: 87.8550 },
  "delhi": { lat: 28.7041, lng: 77.1025 },
  "chandigarh": { lat: 30.7333, lng: 76.7794 },
  "puducherry": { lat: 11.9416, lng: 79.8083 },
  "jammu and kashmir": { lat: 33.7782, lng: 76.5762 },
  "ladakh": { lat: 34.1526, lng: 77.5771 },
  "andaman and nicobar islands": { lat: 11.7401, lng: 92.6586 },
  "dadra and nagar haveli and daman and diu": { lat: 20.1809, lng: 73.0169 },
  "lakshadweep": { lat: 10.5667, lng: 72.6417 },
};

// Haversine formula to calculate distance in km between two lat/lng pairs
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Get distance multiplier based on distance tier
function getDistanceMultiplier(distanceKm) {
  if (distanceKm <= 500) return 1.0;
  if (distanceKm <= 1000) return 1.3;
  if (distanceKm <= 2000) return 1.6;
  return 2.0;
}

// Get estimated transit days based on distance and mode
function getTransitDays(distanceKm, mode) {
  let baseDays;
  if (distanceKm <= 300) baseDays = 2;
  else if (distanceKm <= 700) baseDays = 3;
  else if (distanceKm <= 1200) baseDays = 5;
  else if (distanceKm <= 2000) baseDays = 7;
  else baseDays = 10;

  if (mode.includes('Air')) return Math.max(1, Math.ceil(baseDays * 0.3));
  if (mode.includes('Express')) return Math.max(1, Math.ceil(baseDays * 0.6));
  if (mode.includes('Train')) return Math.max(2, Math.ceil(baseDays * 1.2));
  if (mode.includes('Sea')) return Math.max(5, Math.ceil(baseDays * 2.0));
  return baseDays; // Road Standard
}

// Get item type surcharge multiplier
function getItemSurcharge(itemType) {
  switch (itemType) {
    case 'Electronics': return 1.15;
    case 'Machinery': return 1.25;
    case 'Furniture': return 1.10;
    case 'Documents': return 0.90;
    default: return 1.0; // Cartons/Boxes, Other
  }
}

// ============================================================
// POST /api/public/quote — Calculate & save a quote
// ============================================================
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, originPincode, destinationPincode, itemType, transportMode, weight, length, breadth, height } = req.body;

    // Validation
    if (!name || !phone || !originPincode || !destinationPincode || !weight) {
      return res.status(400).json({ success: false, message: "Name, Phone, Origin Pincode, Destination Pincode, and Weight are required." });
    }

    if (!/^\d{6}$/.test(originPincode) || !/^\d{6}$/.test(destinationPincode)) {
      return res.status(400).json({ success: false, message: "Please enter valid 6-digit Indian pincodes." });
    }

    const weightNum = parseFloat(weight) || 1;
    if (weightNum <= 0) {
      return res.status(400).json({ success: false, message: "Weight must be greater than 0." });
    }

    // Fetch origin pincode details
    const originRes = await fetch(`https://api.postalpincode.in/pincode/${originPincode}`);
    const originData = await originRes.json();
    if (!originData?.[0]?.PostOffice?.[0]) {
      return res.status(400).json({ success: false, message: "Invalid origin pincode. Please check and try again." });
    }

    // Fetch destination pincode details
    const destRes = await fetch(`https://api.postalpincode.in/pincode/${destinationPincode}`);
    const destData = await destRes.json();
    if (!destData?.[0]?.PostOffice?.[0]) {
      return res.status(400).json({ success: false, message: "Invalid destination pincode. Please check and try again." });
    }

    const originPO = originData[0].PostOffice[0];
    const destPO = destData[0].PostOffice[0];

    const originState = originPO.State.toLowerCase();
    const destState = destPO.State.toLowerCase();

    // Get approximate coordinates from state lookup
    const originCoords = STATE_COORDS[originState] || { lat: 22.9734, lng: 78.6569 }; // Default to center of India
    const destCoords = STATE_COORDS[destState] || { lat: 22.9734, lng: 78.6569 };

    // Calculate approximate distance
    let distanceKm = haversineDistance(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);
    
    // If same state, use a minimum realistic distance
    if (distanceKm < 50) distanceKm = Math.max(50, Math.abs(parseInt(originPincode) - parseInt(destinationPincode)) / 10);

    // Calculate volumetric weight (L x B x H / 5000)
    const lengthNum = parseFloat(length) || 0;
    const breadthNum = parseFloat(breadth) || 0;
    const heightNum = parseFloat(height) || 0;
    let volumetricWeight = 0;
    
    const mode = transportMode || 'Road (Standard)';
    let volumetricDivisor = 5000;
    if (mode.includes('Train')) volumetricDivisor = 4000;
    if (mode.includes('Air')) volumetricDivisor = 6000;

    if (lengthNum > 0 && breadthNum > 0 && heightNum > 0) {
      volumetricWeight = (lengthNum * breadthNum * heightNum) / volumetricDivisor;
    }

    // Chargeable weight = max of actual weight and volumetric weight
    const chargeableWeight = Math.max(weightNum, volumetricWeight);

    // Base rate per kg (HIDDEN — never exposed to user)
    let baseRatePerKg;
    if (mode.includes('Air')) baseRatePerKg = 90;
    else if (mode.includes('Express')) baseRatePerKg = 35;
    else if (mode.includes('Train')) baseRatePerKg = 38;
    else if (mode.includes('Sea')) baseRatePerKg = 20;
    else if (mode.includes('Best')) baseRatePerKg = 28; // Company best = balanced
    else baseRatePerKg = 25; // Road Standard

    // Distance multiplier
    const distanceMultiplier = getDistanceMultiplier(distanceKm);

    // Item surcharge
    const itemSurcharge = getItemSurcharge(itemType);

    // Final calculation
    const baseAmount = chargeableWeight * baseRatePerKg * distanceMultiplier * itemSurcharge;
    
    // Add handling charge (flat) + fuel surcharge (%)
    const handlingCharge = Math.max(100, chargeableWeight * 5);
    const fuelSurcharge = baseAmount * 0.08; // 8% fuel surcharge
    
    const estimatedAmount = Math.round(baseAmount + handlingCharge + fuelSurcharge);
    const estimatedDays = getTransitDays(distanceKm, mode);

    // Generate quote reference
    const quoteRef = `QUO-${Date.now().toString(36).toUpperCase()}`;

    // Save to Firestore
    const quoteDoc = {
      quoteRef,
      name: name.trim(),
      phone: phone.trim(),
      email: (email || '').trim().toLowerCase(),
      originPincode,
      originDistrict: originPO.District.toUpperCase(),
      originState: originPO.State.toUpperCase(),
      destinationPincode,
      destinationDistrict: destPO.District.toUpperCase(),
      destinationState: destPO.State.toUpperCase(),
      distanceKm,
      itemType: itemType || 'Cartons/Boxes',
      transportMode: mode,
      weight: weightNum,
      length: lengthNum,
      breadth: breadthNum,
      height: heightNum,
      chargeableWeight: Math.round(chargeableWeight * 100) / 100,
      estimatedAmount,
      estimatedDays,
      status: 'estimated', // estimated → proceeded
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection("quotes").add(quoteDoc);

    return res.json({
      success: true,
      message: "Quote calculated successfully",
      data: {
        id: docRef.id,
        quoteRef,
        estimatedAmount,
        estimatedDays,
        originDistrict: originPO.District.toUpperCase(),
        originState: originPO.State.toUpperCase(),
        destinationDistrict: destPO.District.toUpperCase(),
        destinationState: destPO.State.toUpperCase(),
        distanceKm,
        chargeableWeight: Math.round(chargeableWeight * 100) / 100,
        transportMode: mode,
        itemType: itemType || 'Cartons/Boxes'
      }
    });

  } catch (err) {
    console.error("Public quote error:", err);
    return res.status(500).json({ success: false, message: "Server error calculating quote." });
  }
});

// ============================================================
// PATCH /api/public/quote/:id/proceed — Mark quote as proceeded
// ============================================================
router.patch('/:id/proceed', async (req, res) => {
  try {
    const { id } = req.params;
    
    const docRef = db.collection("quotes").doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Quote not found." });
    }

    await docRef.update({
      status: 'proceeded',
      proceededAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: "Quote marked as proceeded. Our team will contact you shortly!"
    });

  } catch (err) {
    console.error("Quote proceed error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
