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
  authenticateToken
} = require("../middleware/auth");

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

  // Firebase Implementation (Firestore)
  // Since Firestore lacks native partial string search, we fetch all active docs and filter in memory.
  // In production, Algolia would be recommended.
  const fetchCollection = async colName => {
    const snapshot = await db.collection(colName).get();
    const items = [];
    snapshot.forEach(doc => items.push({
      id: doc.id,
      ...doc.data()
    }));
    return items;
  };
  try {
    const [bookings, clients, vendors, trips, bills] = await Promise.all([fetchCollection("bookings"), fetchCollection("clients"), fetchCollection("vendors"), fetchCollection("trips"), fetchCollection("bills")]);
    results.push(...bookings.filter(b => match(b, ["lrNo", "consignor", "consignee", "origin", "destination"])).slice(0, 5).map(b => ({
      type: "Booking",
      id: b.id,
      title: b.lrNo || "LR",
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
    results.push(...trips.filter(t => match(t, ["tripId", "vehicleNo", "driverName"])).slice(0, 5).map(t => ({
      type: "Trip",
      id: t.id,
      title: t.tripId || "Trip",
      subtitle: t.vehicleNo || "",
      link: `/trips`
    })));
    results.push(...bills.filter(b => match(b, ["billNo", "clientName", "billTo"])).slice(0, 5).map(b => ({
      type: "Bill",
      id: b.id,
      title: b.billNo || "Bill",
      subtitle: b.clientName || b.billTo,
      link: `/bills`
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

