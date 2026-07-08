const express = require("express");
const router = express.Router();
const { useMockDB, db, mockData } = require("../config/firebase");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");

// Helper to convert array to CSV
function toCSV(headers, rows) {
  const headerLine = headers.join(",");
  const dataLines = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h] !== undefined ? String(row[h]) : "";
        return val.includes(",") ? `"${val}"` : val;
      })
      .join(","),
  );
  return [headerLine, ...dataLines].join("\n");
}

// Export outstanding by client
router.get(
  "/csv/outstanding/:client",
  asyncHandler(async (req, res) => {
    const { client } = req.params;
    let entries = [];
    if (useMockDB) {
      entries = (mockData.outstanding || []).filter(
        (o) => o.client?.toLowerCase() === client.toLowerCase(),
      );
    } else {
      const snapshot = await db
        .collection("outstanding")
        .where("client", "==", client)
        .get();
      snapshot.forEach((doc) => entries.push({ id: doc.id, ...doc.data() }));
    }
    const csv = toCSV(
      ["Date", "Amount", "Client", "Particulars", "Bank Name"],
      entries,
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=outstanding_${client}.csv`,
    );
    return res.send(csv);
  }),
);

// Export full data
router.get(
  "/full-data/:client",
  asyncHandler(async (req, res) => {
    const { client } = req.params;
    let bookings = [];
    if (useMockDB) {
      bookings = (mockData.bookings || []).filter(
        (b) => b.client?.toLowerCase() === client.toLowerCase(),
      );
    } else {
      const snapshot = await db
        .collection("bookings")
        .where("client", "==", client)
        .get();
      snapshot.forEach((doc) => bookings.push({ id: doc.id, ...doc.data() }));
    }
    const csv = toCSV(
      [
        "LR No",
        "Date",
        "Consignor",
        "Consignee",
        "Origin",
        "Destination",
        "Mode",
        "Box",
        "Weight",
        "Freight",
        "Status",
      ],
      bookings,
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=fulldata_${client}.csv`,
    );
    return res.send(csv);
  }),
);

// Export bookings
router.get(
  "/bookings",
  asyncHandler(async (req, res) => {
    let data = [];
    if (useMockDB) data = mockData.bookings || [];
    else {
      const snapshot = await db.collection("bookings").get();
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
    }
    const csv = toCSV(
      [
        "LR No",
        "Date",
        "Client",
        "Origin",
        "Destination",
        "Consignor",
        "Consignee",
        "Mode",
        "Box",
        "Weight",
        "Freight",
        "Status",
      ],
      data,
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=bookings.csv");
    return res.send(csv);
  }),
);

// Export bills
router.get(
  "/bills",
  asyncHandler(async (req, res) => {
    let data = [];
    if (useMockDB) data = mockData.bills || [];
    else {
      const snapshot = await db.collection("bills").get();
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
    }
    const csv = toCSV(
      [
        "Bill No",
        "Client",
        "Amount",
        "Taxable",
        "GST",
        "CGST",
        "SGST",
        "Total",
        "Status",
        "Date",
      ],
      data,
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=bills.csv");
    return res.send(csv);
  }),
);

// Export tripsheet
router.get(
  "/tripsheet",
  asyncHandler(async (req, res) => {
    let data = [];
    if (useMockDB) data = mockData.trips || [];
    else {
      const snapshot = await db.collection("trips").get();
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
    }
    const csv = toCSV(
      [
        "Trip No",
        "Date",
        "Vehicle",
        "Driver",
        "Origin",
        "Destination",
        "Vendor",
        "Status",
      ],
      data,
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=tripsheet.csv");
    return res.send(csv);
  }),
);

// Export cashsheet
router.get(
  "/cashsheet",
  asyncHandler(async (req, res) => {
    let data = [];
    if (useMockDB) data = mockData.cashEntries || [];
    else {
      const snapshot = await db.collection("cashEntries").get();
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
    }
    const csv = toCSV(["Date", "Type", "Amount", "Remarks"], data);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=cashsheet.csv");
    return res.send(csv);
  }),
);

// Export GST report
router.get(
  "/gst",
  asyncHandler(async (req, res) => {
    let data = [];
    if (useMockDB) data = mockData.bills || [];
    else {
      const snapshot = await db.collection("bills").get();
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
    }
    const csv = toCSV(
      [
        "Invoice No",
        "Client",
        "GSTIN",
        "Taxable",
        "CGST",
        "SGST",
        "IGST",
        "Total",
      ],
      data,
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=gst_report.csv");
    return res.send(csv);
  }),
);

// Export unbilled
router.get(
  "/unbilled",
  asyncHandler(async (req, res) => {
    let data = [];
    if (useMockDB) {
      data = (mockData.bookings || []).filter(
        (b) => b.status === "Booked" || !b.status,
      );
    } else {
      const snapshot = await db
        .collection("bookings")
        .where("status", "==", "Booked")
        .get();
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
    }
    const csv = toCSV(
      [
        "LR No",
        "Date",
        "Client",
        "Origin",
        "Destination",
        "Box",
        "Weight",
        "Freight",
      ],
      data,
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=unbilled.csv");
    return res.send(csv);
  }),
);

module.exports = router;
