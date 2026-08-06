const {
  db
} = require("../config/database");
const {
  success,
  error
} = require("../utils/response");
const {
  asyncHandler
} = require("../middleware/errorHandler");
const {
  getOrSet
} = require("../config/redis");

/**
 * Optimized Search Controller
 * Uses cached collection data instead of fetching all docs from 5 collections per query.
 * Falls back to direct DB queries if cache misses.
 */
exports.getRoot_1 = async (req, res) => {
  const q = req.query.q || "";
  if (!q || q.length < 2) {
    return success(res, {
      message: "Query too short",
      data: []
    });
  }
  const query = q.toLowerCase();
  const results = [];

  // Helper to safely check and match fields
  const match = (item, fields) => {
    return fields.some(field => {
      if (!item[field]) return false;
      return String(item[field]).toLowerCase().includes(query);
    });
  };

  // Use already-cached data from each collection's cache key.
  // This avoids 5 full-collection fetches per keystroke.
  const fetchCached = async (cacheKey, colName, orderField) => {
    return await getOrSet(cacheKey, async () => {
      let cursor = db.collection(colName);
      if (orderField) cursor = cursor.orderBy(orderField, "desc");
      const snapshot = await cursor.get();
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      return items;
    }, 300);
  };

  try {
    const [bookings, clients, vendors, trips, bills] = await Promise.all([
      fetchCached("bookings", "bookings", "date"),
      fetchCached("clients", "clients", null),
      fetchCached("vendors", "vendors", null),
      fetchCached("trips", "trips", "date"),
      fetchCached("bills", "bills", "createdAt")
    ]);

    results.push(...bookings.filter(b => match(b, ["lrNo", "consignor", "consignee", "origin", "destination", "awb", "consignment", "client"])).slice(0, 5).map(b => ({
      type: "Booking",
      id: b.id,
      title: b.awb || b.consignment || b.lrNo || "LR",
      subtitle: `${b.origin || ""} to ${b.destination || ""}`,
      link: `/bookings`
    })));
    results.push(...clients.filter(c => match(c, ["name", "phno", "email", "clientCode"])).slice(0, 5).map(c => ({
      type: "Client",
      id: c.id,
      title: c.name || "Client",
      subtitle: c.phno || c.clientCode,
      link: `/clients`
    })));
    results.push(...vendors.filter(v => match(v, ["name", "phno", "email"])).slice(0, 5).map(v => ({
      type: "Vendor",
      id: v.id,
      title: v.name || "Vendor",
      subtitle: v.phno,
      link: `/vendors`
    })));
    results.push(...trips.filter(t => match(t, ["tripId", "tripNo", "vehicleNo", "driverName"])).slice(0, 5).map(t => ({
      type: "Trip",
      id: t.id,
      title: t.tripNo || t.tripId || "Trip",
      subtitle: t.vehicleNo || "",
      link: `/trips`
    })));
    results.push(...bills.filter(b => match(b, ["billNo", "client", "lrNo"])).slice(0, 5).map(b => ({
      type: "Bill",
      id: b.id,
      title: b.billNo || "Bill",
      subtitle: b.client,
      link: `/bills/all`
    })));
  } catch (err) {
    return error(res, {
      message: "Error searching database",
      statusCode: 500,
      details: err.message
    });
  }
  return success(res, {
    message: "Search successful",
    data: results
  });
};
