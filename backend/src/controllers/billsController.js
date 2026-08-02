const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, param, validationResult } = require("express-validator");
const { generatePDF } = require("../utils/pdfGenerator");
const { uploadBase64 } = require("../config/cloudinary");

const CACHE_KEY = "bills";

exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("bills").orderBy("createdAt", "desc").limit(1000).get();
    const bills = [];
    snapshot.forEach(doc => bills.push({
      id: doc.id,
      ...doc.data()
    }));
    return bills;
  }, 300);
  return success(res, "Bills fetched successfully", data);
};

exports.get_id_2 = async (req, res) => {
  const { id } = req.params;
  const doc = await db.collection("bills").doc(id).get();
  if (!doc.exists) return error(res, "Bill not found", 404);
  return success(res, "Bill fetched successfully", {
    id: doc.id,
    ...doc.data()
  });
};

exports.get_id_pdf_3 = async (req, res) => {
  const { id } = req.params;
  let bill;
  const doc = await db.collection("bills").doc(id).get();
  if (doc.exists) bill = { id: doc.id, ...doc.data() };
  if (!bill) return error(res, "Bill not found", 404);
  const billNo = bill.billNo || id;
  const date = bill.createdAt ? new Date(bill.createdAt).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice - ${billNo}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
  .header h1 { margin: 0; font-size: 24px; }
  .header p { margin: 2px 0; font-size: 12px; }
  .title { text-align: center; font-size: 18px; font-weight: bold; margin: 15px 0; text-decoration: underline; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  td, th { border: 1px solid #000; padding: 6px 8px; font-size: 12px; }
  th { background: #f0f0f0; text-align: left; }
  .text-right { text-align: right; }
  .footer { margin-top: 30px; }
</style></head><body>
<div class="header">
  <h1>MULTIMARG CARRIERS</h1>
  <p>Transport & Logistics Services</p>
</div>
<div class="title">TAX INVOICE</div>
<table>
  <tr><td style="width:50%;"><strong>Invoice No:</strong> ${billNo}</td><td><strong>Date:</strong> ${date}</td></tr>
  <tr><td><strong>Client:</strong> ${bill.client || "-"}</td><td><strong>LR No:</strong> ${bill.lrNo || "-"}</td></tr>
</table>
</body></html>`;
  const pdfBuffer = await generatePDF(html);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=Invoice_${billNo.replace(/\//g, '_')}.pdf`);
  res.send(pdfBuffer);
};

exports.post_id_upload_pdf_4 = async (req, res) => {
  const { id } = req.params;
  let bill;
  const doc = await db.collection("bills").doc(id).get();
  if (doc.exists) bill = { id: doc.id, ...doc.data() };
  if (!bill) return error(res, "Bill not found", 404);
  const billNo = bill.billNo || id;

  const html = `<html><body><h1>Invoice - ${billNo}</h1></body></html>`;
  const pdfBuffer = await generatePDF(html);
  const base64Data = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
  const uploadResult = await uploadBase64(base64Data, {
    folder: "multimarg/bills",
    publicId: `Invoice_${billNo.replace(/\//g, '_')}`
  });
  if (!uploadResult.success) {
    return error(res, "Failed to upload PDF: " + uploadResult.message, 500);
  }

  await db.collection("bills").doc(id).update({
    pdfUrl: uploadResult.url
  });
  await delCache(CACHE_KEY);
  return success(res, "PDF uploaded successfully", { url: uploadResult.url });
};

exports.post_generate_5 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const { bookingIds, bookingsData, invoiceNo, invoiceDate, gst: applyGst } = req.body;
  
  if (!bookingIds || bookingIds.length === 0) {
    return error(res, "No bookings selected", 400);
  }

  let totalFreight = 0;
  let totalAwb = 0;
  let totalPickup = 0;
  let totalDelivery = 0;
  let totalPackaging = 0;
  let totalHandling = 0;
  let aggregatedItems = [];
  let aggregatedInvoiceDetails = [];
  let firstBooking = null;

  for (let i = 0; i < bookingIds.length; i++) {
    const doc = await db.collection("bookings").doc(bookingIds[i]).get();
    if (doc.exists) {
      const booking = { id: doc.id, ...doc.data() };
      if (!firstBooking) firstBooking = booking;

      // Find edited values if they exist in bookingsData
      const editedData = (bookingsData || []).find(b => b.id === bookingIds[i]);

      const freight = editedData ? parseFloat(editedData.freight || 0) : parseFloat(booking.freight_charge || booking.freight || booking.frieght || 0);
      const awb = editedData ? parseFloat(editedData.awb || 0) : parseFloat(booking.awb_charge || 0);
      const pickup = editedData ? parseFloat(editedData.pickup || 0) : parseFloat(booking.pickup_charge || 0);
      const delivery = editedData ? parseFloat(editedData.delivery || 0) : parseFloat(booking.delivery_charge || 0);
      const packaging = editedData ? parseFloat(editedData.special || 0) : parseFloat(booking.packaging_charge || 0);
      const handling = editedData ? parseFloat(editedData.other || 0) : parseFloat(booking.handling_charge || 0);
      
      const itemTaxable = freight + awb + pickup + delivery + packaging + handling;

      totalFreight += freight;
      totalAwb += awb;
      totalPickup += pickup;
      totalDelivery += delivery;
      totalPackaging += packaging;
      totalHandling += handling;

      const lrNumber = booking.awb || booking.lrNumber || booking.id;
      const refNumber = booking.invoice_no || booking.refNo || booking.reference_no || "-";
      const lrDateFormatted = booking.dispatch_date ? new Date(booking.dispatch_date).toLocaleDateString("en-GB") : (booking.date ? new Date(booking.date).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"));
      const originCity = booking.origin || "-";
      const destCity = booking.destination || "-";
      const pkgQty = editedData && editedData.pkg !== undefined ? parseInt(editedData.pkg || 0) : (booking.package_count || booking.pcs || booking.packages || 1);
      const wtVal = editedData && editedData.wt !== undefined ? parseFloat(editedData.wt || 0) : (booking.weight_chargeable || booking.weight || 0);
      const rateVal = editedData && editedData.rate !== undefined ? parseFloat(editedData.rate || 0) : (booking.rate || 0);

      aggregatedItems.push({
        si: i + 1,
        lrNo: lrNumber,
        lrDt: lrDateFormatted,
        ref: refNumber,
        org: originCity,
        dest: destCity,
        pkg: pkgQty,
        wt: wtVal,
        rate: rateVal,
        frg: freight,
        lr: awb,
        pick: pickup,
        del: delivery,
        spl: packaging + handling,
        oth: 0,
        total: itemTaxable.toFixed(2)
      });

      if (booking.invoiceDetails && booking.invoiceDetails.length > 0) {
        aggregatedInvoiceDetails = aggregatedInvoiceDetails.concat(booking.invoiceDetails);
      }
      
      // Update booking status to Billed immediately
      await db.collection("bookings").doc(booking.id).update({ status: "Billed" });
    }
  }

  if (!firstBooking) {
    return error(res, "Failed to fetch bookings", 404);
  }

  const clientName = firstBooking.client;
  let clientMaster = null;
  if (clientName) {
    try {
      const clientsSnap = await db.collection("clients").where("name", "==", clientName).get();
      if (!clientsSnap.empty) {
        clientMaster = clientsSnap.docs[0].data();
      }
    } catch (err) {
      console.error("Error fetching client master:", err);
    }
  }

  const gstin = clientMaster?.gst || firstBooking.gstin || firstBooking.consignee_gstin || firstBooking.consignor_gstin || "";
  const clientStateCode = gstin ? gstin.substring(0, 2) : "05";
  const clientAddress = clientMaster?.address || firstBooking.consignee_address || firstBooking.consignor_address || firstBooking.clientAddress || "SIDCUL PANTNAGAR";

  
  const gstRate = applyGst ? 18 : 0;
  const taxable = totalFreight + totalAwb + totalPickup + totalDelivery + totalPackaging + totalHandling;
  const gstAmt = taxable * gstRate / 100;
  
  let cgst = 0, sgst = 0, igst = 0;
  if (applyGst) {
    if (clientStateCode === "05" || !clientStateCode) {
      cgst = gstAmt / 2;
      sgst = gstAmt / 2;
    } else {
      igst = gstAmt;
    }
  }
  
  const total = taxable + gstAmt;

  const countSnap = await db.collection("bills").count().get();
  const totalBills = countSnap.data().count;
  const billNo = invoiceNo || `MCPL/26-27/${String(totalBills + 1).padStart(4, "0")}`;

  let mode = firstBooking.mode || "Road";
  let sacCode = "996511";
  if (mode.toLowerCase() === "train") {
      sacCode = "996512";
  } else if (mode.toLowerCase() === "air") {
      sacCode = "996531";
  }

  const bill = {
    id: uuidv4(),
    billNo,
    client: clientName,
    clientAddress: clientAddress,
    gstin: gstin,
    stateCode: clientStateCode,
    mode: mode,
    sacCode: sacCode,
    amount: total,
    total,
    totalPayable: total,
    taxable,
    subtotal: taxable,
    gst: gstRate,
    cgst,
    sgst,
    igst,
    lrNo: bookingIds.length > 1 ? "MULTIPLE" : (firstBooking.awb || firstBooking.lrNumber || firstBooking.id),
    lrDate: invoiceDate ? new Date(invoiceDate).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"),
    refNo: bookingIds.length > 1 ? "MULTIPLE" : (firstBooking.invoice_no || firstBooking.refNo || "-"),
    origin: bookingIds.length > 1 ? "MULTIPLE" : firstBooking.origin,
    destination: bookingIds.length > 1 ? "MULTIPLE" : firstBooking.destination,
    packages: bookingIds.length > 1 ? aggregatedItems.reduce((acc, curr) => acc + parseInt(curr.pkg || 0), 0) : firstBooking.package_count,
    weight: bookingIds.length > 1 ? aggregatedItems.reduce((acc, curr) => acc + parseFloat(curr.wt || 0), 0) : firstBooking.weight_chargeable,
    rate: bookingIds.length > 1 ? 0 : firstBooking.rate,
    freight: totalFreight,
    lrCharge: totalAwb,
    pickupCharge: totalPickup,
    deliveryCharge: totalDelivery,
    specialCharge: totalPackaging + totalHandling,
    otherCharge: 0,
    invoiceDetails: aggregatedInvoiceDetails,
    items: aggregatedItems,
    status: "pending",
    createdAt: invoiceDate ? new Date(invoiceDate).toISOString() : new Date().toISOString()
  };

  await db.collection("bills").doc(bill.id).set(bill);

  // Delete old individual pending bills that contained these LRs
  try {
    const oldBillsSnap = await db.collection("bills").where("status", "in", ["pending", "Pending"]).get();
    const lrsBeingMerged = new Set(aggregatedItems.map(item => item.lrNo));
    
    const deletePromises = [];
    oldBillsSnap.forEach(billDoc => {
      if (billDoc.id === bill.id) return; // don't delete the one we just created
      const billData = billDoc.data();
      if (billData.items) {
        // If this old pending bill has an item that is currently being merged
        if (billData.items.some(item => lrsBeingMerged.has(item.lrNo))) {
          deletePromises.push(db.collection("bills").doc(billDoc.id).delete());
        }
      }
    });
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }
  } catch (err) {
    console.error("Error deleting old pending bills:", err);
  }

  await delCache(CACHE_KEY);
  await delCache("bookings");
  
  return success(res, "Bills generated successfully", {
    billNo: bill.billNo,
    bills: [bill],
    count: 1
  });
};

exports.post_misc_6 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const { client, date, description, amount, gst, remarks } = req.body;
  const gstRate = parseFloat(gst) || 0;
  const taxable = parseFloat(amount) / (1 + gstRate / 100);
  const gstAmt = parseFloat(amount) - taxable;
  
  const gstin = req.body.gstin || "";
  const clientStateCode = gstin ? gstin.substring(0, 2) : "";
  
  let cgst = 0, sgst = 0, igst = 0;
  if (gstRate > 0) {
    if (clientStateCode === "05" || !clientStateCode) {
      cgst = gstAmt / 2;
      sgst = gstAmt / 2;
    } else {
      igst = gstAmt;
    }
  }
  const countSnap = await db.collection("bills").count().get();
  const totalBills = countSnap.data().count;
  const billNo = `MCPL/26-27/${String(totalBills + 1).padStart(4, "0")}`;
  const bill = {
    id: uuidv4(),
    billNo,
    client,
    description,
    amount: parseFloat(amount),
    total: parseFloat(amount),
    taxable: Math.round(taxable * 100) / 100,
    gst: gstRate,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    remarks,
    date: date || new Date().toISOString(),
    status: "pending",
    createdAt: new Date().toISOString()
  };
  await db.collection("bills").doc(bill.id).set(bill);
  await delCache(CACHE_KEY);
  return created(res, "Miscellaneous bill created successfully", bill);
};

exports.put_id_7 = async (req, res) => {
  const { id } = req.params;
  const doc = await db.collection("bills").doc(id).get();
  if (!doc.exists) return error(res, "Bill not found", 404);

  const updatedData = { ...req.body };
  
  // Recalculate totals if items or line parameters are updated
  if (updatedData.items && Array.isArray(updatedData.items)) {
    let newTaxable = 0;
    updatedData.items.forEach(item => {
      newTaxable += parseFloat(item.total || 0);
    });
    if (newTaxable > 0) {
      updatedData.taxable = newTaxable;
      updatedData.subtotal = newTaxable;
      const gstRate = parseFloat(updatedData.gst !== undefined ? updatedData.gst : 18);
      const gstAmt = newTaxable * gstRate / 100;
      
      const gstin = updatedData.gstin || doc.data().gstin || "";
      const clientStateCode = gstin ? gstin.substring(0, 2) : "";
      
      if (gstRate > 0) {
        if (clientStateCode === "05" || !clientStateCode) {
          updatedData.cgst = gstAmt / 2;
          updatedData.sgst = gstAmt / 2;
          updatedData.igst = 0;
        } else {
          updatedData.cgst = 0;
          updatedData.sgst = 0;
          updatedData.igst = gstAmt;
        }
      } else {
        updatedData.cgst = 0;
        updatedData.sgst = 0;
        updatedData.igst = 0;
      }
      
      updatedData.total = newTaxable + gstAmt;
      updatedData.totalPayable = newTaxable + gstAmt;
      updatedData.amount = newTaxable + gstAmt;
    }
  }

  await db.collection("bills").doc(id).update(updatedData);
  await delCache(CACHE_KEY);
  return success(res, "Bill updated successfully", {
    id,
    ...updatedData
  });
};

exports.delete_id_8 = async (req, res) => {
  const { id } = req.params;
  const doc = await db.collection("bills").doc(id).get();
  if (!doc.exists) return error(res, "Bill not found", 404);

  const billData = doc.data();
  if (billData.items && Array.isArray(billData.items)) {
    for (const item of billData.items) {
      if (item.lrNo) {
        // Query by awb
        const byAwb = await db.collection("bookings").where("awb", "==", item.lrNo).get();
        byAwb.forEach(bDoc => db.collection("bookings").doc(bDoc.id).update({ status: "Booked" }));

        // Query by id field just in case
        const byIdField = await db.collection("bookings").where("id", "==", item.lrNo).get();
        byIdField.forEach(bDoc => db.collection("bookings").doc(bDoc.id).update({ status: "Booked" }));

        // Check if lrNo is the document ID directly
        try {
          const directDoc = await db.collection("bookings").doc(item.lrNo).get();
          if (directDoc.exists) {
            await db.collection("bookings").doc(item.lrNo).update({ status: "Booked" });
          }
        } catch(e) {}
      }
    }
  }

  await db.collection("bills").doc(id).delete();
  await delCache(CACHE_KEY);
  await delCache("bookings");
  return success(res, "Bill deleted successfully");
};
