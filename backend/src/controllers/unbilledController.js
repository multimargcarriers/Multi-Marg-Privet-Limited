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

exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("bookings").where("status", "in", ["Booked", "0", ""]).get();
    const bookings = [];
    snapshot.forEach(doc => bookings.push({
      id: doc.id,
      ...doc.data()
    }));
    return bookings;
  }, 300);
  return success(res, "Unbilled bookings fetched successfully", data);
};

exports.get_search_2 = async (req, res) => {
  const {
    client,
    from,
    to
  } = req.query;
  let bookings = [];
  const snapshot = await db.collection("bookings").where("status", "in", ["Booked", "0", ""]).get();
  snapshot.forEach(doc => bookings.push({
    id: doc.id,
    ...doc.data()
  }));
  if (client) bookings = bookings.filter(b => b.client?.toLowerCase() === client.toLowerCase());
  if (from) bookings = bookings.filter(b => new Date(b.date) >= new Date(from));
  if (to) bookings = bookings.filter(b => new Date(b.date) <= new Date(to));
  return success(res, "Unbilled bookings fetched successfully", bookings);
};

