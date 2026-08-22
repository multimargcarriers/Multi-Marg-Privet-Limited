const express = require("express");
const router = express.Router();
const { db } = require("../config/database");

// Cache suggestions in memory for fast response
let cachedSuggestions = null;
let lastCacheTime = 0;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

router.get("/recent", async (req, res) => {
  try {
    const now = Date.now();
    if (cachedSuggestions && now - lastCacheTime < CACHE_TTL) {
      return res.json({ success: true, data: cachedSuggestions, cached: true });
    }

    const mongoDb = db.mongoDb;
    if (!mongoDb) {
      return res.json({ success: true, data: {} });
    }

    const categories = {
      origin: new Set(),
      destination: new Set(),
      consignor: new Set(),
      consignee: new Set(),
      particular: new Set(),
      vehicle: new Set(),
      client: new Set(),
      vendor: new Set(),
      material: new Set(),
      remarks: new Set(),
      general: new Set()
    };

    const addValues = (set, vals) => {
      if (!vals) return;
      if (Array.isArray(vals)) {
        vals.forEach(v => {
          if (v && typeof v === "string") {
            const clean = v.trim().toUpperCase();
            if (clean.length >= 2 && clean.length <= 80) set.add(clean);
          }
        });
      } else if (typeof vals === "string") {
        const clean = vals.trim().toUpperCase();
        if (clean.length >= 2 && clean.length <= 80) set.add(clean);
      }
    };

    // 1. Fetch recent Bookings (last 500)
    try {
      const bookings = await mongoDb.collection("bookings")
        .find({}, { projection: { origin: 1, destination: 1, consignor: 1, consignee: 1, vehicle_no: 1, remarks: 1, material: 1, from: 1, to: 1 } })
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray();

      bookings.forEach(b => {
        addValues(categories.origin, b.origin || b.from);
        addValues(categories.destination, b.destination || b.to);
        addValues(categories.consignor, b.consignor);
        addValues(categories.consignee, b.consignee);
        addValues(categories.vehicle, b.vehicle_no);
        addValues(categories.material, b.material);
        addValues(categories.remarks, b.remarks);
        addValues(categories.general, [b.origin, b.destination, b.consignor, b.consignee]);
      });
    } catch (_e) {}

    // 2. Fetch Trip MIS (last 300)
    try {
      const tripMis = await mongoDb.collection("trip_mis")
        .find({}, { projection: { origin: 1, destination: 1, vehicleNo: 1, parcels: 1 } })
        .sort({ createdAt: -1 })
        .limit(300)
        .toArray();

      tripMis.forEach(t => {
        addValues(categories.origin, t.origin);
        addValues(categories.destination, t.destination);
        addValues(categories.vehicle, t.vehicleNo);
        if (Array.isArray(t.parcels)) {
          t.parcels.forEach(p => {
            addValues(categories.origin, p.origin);
            addValues(categories.destination, p.destination);
            addValues(categories.consignor, p.consignor);
            addValues(categories.consignee, p.consignee);
          });
        }
      });
    } catch (_e) {}

    // 3. Fetch Vendor MIS (last 300)
    try {
      const vendorMis = await mongoDb.collection("vendor_mis")
        .find({}, { projection: { details: 1 } })
        .sort({ createdAt: -1 })
        .limit(300)
        .toArray();

      vendorMis.forEach(v => {
        if (Array.isArray(v.details)) {
          v.details.forEach(d => {
            addValues(categories.origin, d.from);
            addValues(categories.destination, d.to);
            addValues(categories.particular, d.particular);
            addValues(categories.vehicle, d.vehicleNo);
          });
        }
      });
    } catch (_e) {}

    // 4. Fetch Clients & Vendors
    try {
      const clients = await mongoDb.collection("clients").find({}, { projection: { name: 1, clientName: 1, city: 1 } }).limit(300).toArray();
      clients.forEach(c => {
        addValues(categories.client, c.name || c.clientName);
        addValues(categories.origin, c.city);
      });

      const vendors = await mongoDb.collection("vendors").find({}, { projection: { name: 1, vendorName: 1, city: 1 } }).limit(300).toArray();
      vendors.forEach(v => {
        addValues(categories.vendor, v.name || v.vendorName);
        addValues(categories.destination, v.city);
      });
    } catch (_e) {}

    // Convert Sets to Arrays (max 250 per category)
    const result = {};
    for (const [cat, set] of Object.entries(categories)) {
      result[cat] = Array.from(set).slice(0, 250);
    }

    cachedSuggestions = result;
    lastCacheTime = now;

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error fetching recent suggestions:", err);
    res.status(500).json({ success: false, message: "Error fetching suggestions" });
  }
});

module.exports = router;
