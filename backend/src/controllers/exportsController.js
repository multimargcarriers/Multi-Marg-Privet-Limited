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

// Helper to convert array to CSV

exports.get_csv_outstanding_client_1 = async (req, res) => {
  const {
    client
  } = req.params;
  let entries = [];
  const snapshot = await db.collection("outstanding").where("client", "==", client).get();
  snapshot.forEach(doc => entries.push({
    id: doc.id,
    ...doc.data()
  }));
  const csv = toCSV(["Date", "Amount", "Client", "Particulars", "Bank Name"], entries);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=outstanding_${client}.csv`);
  return res.send(csv);
};

exports.get_full_data_client_2 = async (req, res) => {
  const {
    client
  } = req.params;
  let bookings = [];
  const snapshot = await db.collection("bookings").where("client", "==", client).get();
  snapshot.forEach(doc => bookings.push({
    id: doc.id,
    ...doc.data()
  }));
  const csv = toCSV(["LR No", "Date", "Consignor", "Consignee", "Origin", "Destination", "Mode", "Box", "Weight", "Freight", "Status"], bookings);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=fulldata_${client}.csv`);
  return res.send(csv);
};

exports.get_bookings_3 = async (req, res) => {
  let data = [];
  const snapshot = await db.collection("bookings").get();
  data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  const csv = toCSV(["LR No", "Date", "Client", "Origin", "Destination", "Consignor", "Consignee", "Mode", "Box", "Weight", "Freight", "Status"], data);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=bookings.csv");
  return res.send(csv);
};

exports.get_bills_4 = async (req, res) => {
  let data = [];
  const snapshot = await db.collection("bills").get();
  snapshot.forEach(doc => data.push({
    id: doc.id,
    ...doc.data()
  }));
  const csv = toCSV(["Bill No", "Client", "Amount", "Taxable", "GST", "CGST", "SGST", "Total", "Status", "Date"], data);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=bills.csv");
  return res.send(csv);
};

exports.get_tripsheet_5 = async (req, res) => {
  let data = [];
  const snapshot = await db.collection("trips").get();
  data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  const csv = toCSV(["Trip No", "Date", "Vehicle", "Driver", "Origin", "Destination", "Vendor", "Status"], data);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=tripsheet.csv");
  return res.send(csv);
};

exports.get_cashsheet_6 = async (req, res) => {
  let data = [];
  const snapshot = await db.collection("cashEntries").get();
  data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  const csv = toCSV(["Date", "Type", "Amount", "Remarks"], data);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=cashsheet.csv");
  return res.send(csv);
};

exports.get_gst_7 = async (req, res) => {
  let data = [];
  const snapshot = await db.collection("bills").get();
  data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  const csv = toCSV(["Invoice No", "Client", "GSTIN", "Taxable", "CGST", "SGST", "IGST", "Total"], data);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=gst_report.csv");
  return res.send(csv);
};

exports.get_unbilled_8 = async (req, res) => {
  let data = [];
  const snapshot = await db.collection("bookings").where("status", "==", "Booked").get();
  snapshot.forEach(doc => data.push({
    id: doc.id,
    ...doc.data()
  }));
  const csv = toCSV(["LR No", "Date", "Client", "Origin", "Destination", "Box", "Weight", "Freight"], data);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=unbilled.csv");
  return res.send(csv);
};

