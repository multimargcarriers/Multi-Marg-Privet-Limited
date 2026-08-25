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

const CACHE_KEY = "unbilled";


exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const bookings = await db.mongoDb.collection("bookings").find({
      $and: [
        { status: { $ne: "Billed" } },
        { billed: { $ne: true } }
      ]
    }).toArray();
    return bookings.map(b => ({
      ...b,
      id: b.id || b._id.toString()
    }));
  }, 300);
  return success(res, "Unbilled bookings fetched successfully", data);
};

exports.get_search_2 = async (req, res) => {
  const {
    client,
    from,
    to
  } = req.query;
  let bookings = await db.mongoDb.collection("bookings").find({
    $and: [
      { status: { $ne: "Billed" } },
      { billed: { $ne: true } }
    ]
  }).toArray();
  bookings = bookings.map(b => ({
    ...b,
    id: b.id || b._id.toString()
  }));
  if (client) bookings = bookings.filter(b => b.client?.toLowerCase() === client.toLowerCase());
  if (from) bookings = bookings.filter(b => new Date(b.date) >= new Date(from));
  if (to) bookings = bookings.filter(b => new Date(b.date) <= new Date(to));
  return success(res, "Unbilled bookings fetched successfully", bookings);
};
