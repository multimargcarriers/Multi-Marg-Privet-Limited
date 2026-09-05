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

    // Strict Domain Categories
    const categories = {
      city: new Set(),
      client: new Set(),
      vendor: new Set(),
      vehicle: new Set(),
      particular: new Set()
    };

    const addValues = (set, vals) => {
      if (!vals) return;
      if (Array.isArray(vals)) {
        vals.forEach(v => {
          if (v && typeof v === "string") {
            const clean = v.trim().toUpperCase();
            if (clean.length >= 2 && clean.length <= 90) set.add(clean);
          }
        });
      } else if (typeof vals === "string") {
        const clean = vals.trim().toUpperCase();
        if (clean.length >= 2 && clean.length <= 90) set.add(clean);
      }
    };

    // 1. Fetch Master Cities
    try {
      const cities = await mongoDb.collection("cities").find({}, { projection: { name: 1, cityName: 1 } }).limit(500).toArray();
      cities.forEach(c => addValues(categories.city, c.name || c.cityName));
    } catch (_e) {}

    // 2. Fetch Master Clients
    try {
      const clients = await mongoDb.collection("clients").find({}, { projection: { name: 1, clientName: 1, city: 1 } }).limit(500).toArray();
      clients.forEach(c => {
        addValues(categories.client, c.name || c.clientName);
        addValues(categories.city, c.city);
      });
    } catch (_e) {}

    // 3. Fetch Master Vendors
    try {
      const vendors = await mongoDb.collection("vendors").find({}, { projection: { name: 1, vendorName: 1, city: 1 } }).limit(500).toArray();
      vendors.forEach(v => {
        addValues(categories.vendor, v.name || v.vendorName);
        addValues(categories.city, v.city);
      });
    } catch (_e) {}

    // 4. Fetch recent Bookings (last 500)
    try {
      const bookings = await mongoDb.collection("bookings")
        .find({}, { projection: { origin: 1, destination: 1, consignor: 1, consignee: 1, billed_to: 1, vehicle_no: 1, material: 1, from: 1, to: 1 } })
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray();

      bookings.forEach(b => {
        addValues(categories.city, [b.origin, b.destination, b.from, b.to]);
        addValues(categories.client, [b.consignor, b.consignee, b.billed_to]);
        addValues(categories.vehicle, b.vehicle_no);
        addValues(categories.particular, b.material);
      });
    } catch (_e) {}

    // 5. Fetch Trip MIS (last 300)
    try {
      const tripMis = await mongoDb.collection("trip_mis")
        .find({}, { projection: { origin: 1, destination: 1, vehicleNo: 1, clientName: 1, parcels: 1 } })
        .sort({ createdAt: -1 })
        .limit(300)
        .toArray();

      tripMis.forEach(t => {
        addValues(categories.city, [t.origin, t.destination]);
        addValues(categories.vehicle, t.vehicleNo);
        addValues(categories.client, t.clientName);
        if (Array.isArray(t.parcels)) {
          t.parcels.forEach(p => {
            addValues(categories.city, [p.origin, p.destination]);
            addValues(categories.client, [p.consignor, p.consignee]);
          });
        }
      });
    } catch (_e) {}

    // 6. Fetch Vendor MIS (last 300)
    try {
      const vendorMis = await mongoDb.collection("vendor_mis")
        .find({}, { projection: { vendorName: 1, details: 1 } })
        .sort({ createdAt: -1 })
        .limit(300)
        .toArray();

      vendorMis.forEach(v => {
        addValues(categories.vendor, v.vendorName);
        if (Array.isArray(v.details)) {
          v.details.forEach(d => {
            addValues(categories.city, [d.from, d.to]);
            addValues(categories.particular, d.particular);
            addValues(categories.vehicle, d.vehicleNo);
            addValues(categories.vendor, d.handoverTo);
          });
        }
      });
    } catch (_e) {}

    // Convert Sets to Arrays (max 250 per category)
    const result = {};
    for (const [cat, set] of Object.entries(categories)) {
      result[cat] = Array.from(set).slice(0, 250);
    }

    // Keep backwards-compatibility aliases in response
    result.origin = result.city;
    result.destination = result.city;
    result.consignor = result.client;
    result.consignee = result.client;
    result.billed_to = result.client;
    result.material = result.particular;

    cachedSuggestions = result;
    lastCacheTime = now;

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error fetching recent suggestions:", err);
    res.status(500).json({ success: false, message: "Error fetching suggestions" });
  }
});

// GET /api/suggestions/ip-location - Detect user's current city based on IP
router.get("/ip-location", async (req, res) => {
  try {
    let clientIp = req.headers['cf-connecting-ip'] || 
                   req.headers['x-real-ip'] || 
                   (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 
                   req.socket.remoteAddress || '';
    
    // Clean local IPs
    if (clientIp === '::1' || clientIp === '127.0.0.1' || clientIp.startsWith('192.168.') || clientIp.startsWith('10.') || clientIp.startsWith('172.')) {
      clientIp = ''; // Egress IP will be used by geo API
    }

    const axios = require('axios');
    const url = clientIp ? `https://ipwho.is/${clientIp}` : `https://ipwho.is/`;
    const geoRes = await axios.get(url, { timeout: 3000 }).catch(() => null);
    
    if (geoRes && geoRes.data && geoRes.data.success !== false && geoRes.data.city) {
      return res.json({
        success: true,
        city: String(geoRes.data.city).toUpperCase(),
        region: geoRes.data.region || "",
        country: geoRes.data.country || "India"
      });
    }

    // Fallback using ipapi.co
    const fallbackUrl = clientIp ? `https://ipapi.co/${clientIp}/json/` : `https://ipapi.co/json/`;
    const fbRes = await axios.get(fallbackUrl, { timeout: 3000 }).catch(() => null);
    if (fbRes && fbRes.data && fbRes.data.city) {
      return res.json({
        success: true,
        city: String(fbRes.data.city).toUpperCase(),
        region: fbRes.data.region || "",
        country: fbRes.data.country_name || "India"
      });
    }

    return res.json({ success: false, city: null });
  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
});

module.exports = router;
