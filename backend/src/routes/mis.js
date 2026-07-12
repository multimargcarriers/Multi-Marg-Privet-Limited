const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet } = require("../config/redis");

const CACHE_KEY = "mis";

// MIS Report
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { client, from, to } = req.query;

    const data = await getOrSet(
      `${CACHE_KEY}_${client || "all"}_${from || "all"}_${to || "all"}`,
      async () => {

        // Real Firebase logic
        let query = db.collection("bookings");
        if (client) query = query.where("client", "==", client);
        const snapshot = await query.orderBy("date", "desc").get();
        const bookings = [];
        snapshot.forEach((doc) => bookings.push({ id: doc.id, ...doc.data() }));

        let filtered = bookings;
        if (from)
          filtered = filtered.filter((b) => new Date(b.date) >= new Date(from));
        if (to)
          filtered = filtered.filter((b) => new Date(b.date) <= new Date(to));

        return {
          summary: {
            totalBookings: filtered.length,
            totalFreight: filtered.reduce(
              (s, b) => s + parseFloat(b.freight || b.frieght || 0),
              0,
            ),
            totalBoxes: filtered.reduce((s, b) => s + parseInt(b.box || 0), 0),
            totalWeight: filtered.reduce(
              (s, b) => s + parseFloat(b.charge_wt || b.weight || 0),
              0,
            ),
          },
          bookings: filtered.map((b) => ({
            awb: b.lrNumber || b.id,
            date: b.date,
            consignor: b.consignor || "-",
            consignee: b.consignee || "-",
            origin: b.origin,
            destination: b.destination,
            mode: b.mode || "Road",
            invoice: b.invoice_no || "-",
            invoiceDate: b.invoice_date || "-",
            partNumber: b.part_number || "-",
            box: b.box || 0,
            quantity: b.quantity || 0,
            weight: b.charge_wt || b.weight || 0,
            status: b.status || "Booked",
          })),
        };
      },
      600,
    );

    return success(res, "MIS report fetched successfully", data);
  }),
);

module.exports = router;
