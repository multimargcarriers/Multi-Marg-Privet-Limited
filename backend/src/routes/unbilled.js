const express = require("express");
const router = express.Router();
const { useMockDB, db, mockData } = require("../config/firebase");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet } = require("../config/redis");

const CACHE_KEY = "unbilled";

// Get unbilled bookings
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {
        if (useMockDB) {
          return (mockData.bookings || []).filter(
            (b) => b.status === "Booked" || !b.status || b.status === "0",
          );
        }
        const snapshot = await db
          .collection("bookings")
          .where("status", "in", ["Booked", "0", ""])
          .get();
        const bookings = [];
        snapshot.forEach((doc) => bookings.push({ id: doc.id, ...doc.data() }));
        return bookings;
      },
      300,
    );
    return success(res, "Unbilled bookings fetched successfully", data);
  }),
);

// Search unbilled with filters
router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const { client, from, to } = req.query;

    let bookings = [];
    if (useMockDB) {
      bookings = (mockData.bookings || []).filter(
        (b) => b.status === "Booked" || !b.status || b.status === "0",
      );
    } else {
      const snapshot = await db
        .collection("bookings")
        .where("status", "in", ["Booked", "0", ""])
        .get();
      snapshot.forEach((doc) => bookings.push({ id: doc.id, ...doc.data() }));
    }

    if (client)
      bookings = bookings.filter(
        (b) => b.client?.toLowerCase() === client.toLowerCase(),
      );
    if (from)
      bookings = bookings.filter((b) => new Date(b.date) >= new Date(from));
    if (to) bookings = bookings.filter((b) => new Date(b.date) <= new Date(to));

    return success(res, "Unbilled bookings fetched successfully", bookings);
  }),
);

module.exports = router;
