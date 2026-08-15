const { emitDataUpdated } = require("../utils/socket");
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, param, validationResult } = require("express-validator");
const { generatePDF } = require("../utils/pdfGenerator");
const { uploadBase64 } = require("../config/cloudinary");
const { recalculatePartyPayments } = require("../utils/paymentUtils");

const CACHE_KEY = "bills";

exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("bills").orderBy("createdAt", "desc").get();
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
  let { id } = req.params;
  id = decodeURIComponent(id);
  const doc = await db.collection("bills").doc(id).get();
  if (!doc.exists) return error(res, "Bill not found", 404);
  return success(res, "Bill fetched successfully", {
    id: doc.id,
    ...doc.data()
  });
};

exports.get_id_pdf_3 = async (req, res) => {
  let { id } = req.params;
  id = decodeURIComponent(id);
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
  let { id } = req.params;
  id = decodeURIComponent(id);
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
  emitDataUpdated("bills", "create");
    return success(res, "PDF uploaded successfully", { url: uploadResult.url });
};

exports.post_generate_5 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const { bookingIds, bookingsData, invoiceNo, invoiceDate, gst } = req.body;
  
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
        awb: lrNumber,
        awb_date: lrDateFormatted,
        ref: refNumber,
        origin: originCity,
        destination: destCity,
        box: pkgQty,
        weight: wtVal,
        rate: rateVal,
        frieght: freight,
        awb_charge: awb,
        pickup: pickup,
        delivery: delivery,
        special_delivery: packaging + handling,
        other_charge: 0,
        total: itemTaxable.toFixed(2),
        gst: gst > 0 ? "YES" : "NO"
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

  
  const gstRate = parseFloat(gst) || 0;
  const taxable = totalFreight + totalAwb + totalPickup + totalDelivery + totalPackaging + totalHandling;
  const gstAmt = taxable * gstRate / 100;
  
  let cgst = 0, sgst = 0, igst = 0;
  if (gstRate > 0) {
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
  const { getCurrentFinancialYear } = require("../utils/financialYear");
  const billNo = invoiceNo || `MCPL/${getCurrentFinancialYear()}/${String(totalBills + 1).padStart(4, "0")}`;

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
      refNo: bookingIds.length > 1 ? "MULTIPLE" : (firstBooking.awb || firstBooking.lrNumber || firstBooking.id),
      date: invoiceDate ? new Date(invoiceDate).toISOString() : new Date().toISOString(),
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
  if (bill.client) {
    await recalculatePartyPayments('Client', bill.client);
  }

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
          deletePromises.push(db.collection("bills").doc(billDoc.id).delete(req.user));
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
  
  emitDataUpdated("bills", "update");
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
  const { getCurrentFinancialYear } = require("../utils/financialYear");
  const billNo = `MCPL/${getCurrentFinancialYear()}/${String(totalBills + 1).padStart(4, "0")}`;
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
  if (bill.client) {
    await recalculatePartyPayments('Client', bill.client);
  }
  await delCache(CACHE_KEY);
  emitDataUpdated("bills", "update");
  emitDataUpdated("bills", "update");
  return created(res, "Miscellaneous bill created successfully", bill);
};

exports.put_id_7 = async (req, res) => {
  let { id } = req.params;
  id = decodeURIComponent(id);
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
  const oldClient = doc.data().client;
  const newClient = updatedData.client || oldClient;
  if (oldClient && oldClient !== newClient) {
      await recalculatePartyPayments('Client', oldClient);
  }
  if (newClient) {
      await recalculatePartyPayments('Client', newClient);
  }
  await delCache(CACHE_KEY);
  emitDataUpdated("bills", "update");
    return success(res, "Bill updated successfully", {
    id,
    ...updatedData
  });
};

exports.delete_id_8 = async (req, res) => {
  let { id } = req.params;
  id = decodeURIComponent(id);
  const doc = await db.collection("bills").doc(id).get();
  if (!doc.exists) return error(res, "Bill not found", 404);

  const billData = doc.data();
  if (billData.items && Array.isArray(billData.items)) {
    for (const item of billData.items) {
      const lrNo = item.awb || item.lrNo;
      if (lrNo) {
        // Query by awb
        const byAwb = await db.collection("bookings").where("awb", "==", lrNo).get();
        byAwb.forEach(bDoc => db.collection("bookings").doc(bDoc.id).update({ status: "Booked" }));

        // Query by id field just in case
        const byIdField = await db.collection("bookings").where("id", "==", lrNo).get();
        byIdField.forEach(bDoc => db.collection("bookings").doc(bDoc.id).update({ status: "Booked" }));

        // Check if lrNo is the document ID directly
        try {
          const directDoc = await db.collection("bookings").doc(lrNo).get();
          if (directDoc.exists) {
            await db.collection("bookings").doc(lrNo).update({ status: "Booked" });
          }
        } catch(e) {}
      }
    }
  }

  await db.collection("bills").doc(id).delete(req.user);
  if (billData.client) {
    await recalculatePartyPayments('Client', billData.client);
  }
  await delCache(CACHE_KEY);
  await delCache("bookings");
  emitDataUpdated("bills", "delete");
    return success(res, "Bill deleted successfully");
};

exports.post_import_9 = async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return error(res, "No items provided for import", 400);
  }

  let importedCount = 0;
  
  // Save each row as a completely separate bill
  for (const row of items) {
    const invoice = row.invoice || "UNKNOWN";
    const awb = row.awb || "";
    
    // Check if a bill for this specific AWB already exists to prevent duplicates
    let existingId = null;
    if (awb) {
      const existingSnap = await db.collection("bills").where("lrNo", "==", awb).get();
      if (!existingSnap.empty) {
        existingId = existingSnap.docs[0].id;
      }
    }

    const itemObj = {
      pid: row.pid || uuidv4(),
      invoice: invoice,
      invoice_date: row.invoice_date || "",
      client: row.client || "",
      origin: row.origin || "",
      destination: row.destination || "",
      mode: row.mode || "ROAD",
      awb: awb,
      awb_date: row.awb_date || "",
      box: row.box || "1",
      weight: row.weight || "0",
      rate: row.rate || "0",
      frieght: row.frieght || "0",
      awb_charge: row.awb_charge || "0",
      pickup: row.pickup || "0",
      delivery: row.delivery || "0",
      special_delivery: row.special_delivery || "0",
      other_charge: row.other_charge || "0",
      gst: row.gst || "NO"
    };

    const frg = parseFloat(itemObj.frieght || 0);
    const awb_chg = parseFloat(itemObj.awb_charge || 0);
    const pick = parseFloat(itemObj.pickup || 0);
    const del = parseFloat(itemObj.delivery || 0);
    const spl = parseFloat(itemObj.special_delivery || 0);
    const oth = parseFloat(itemObj.other_charge || 0);
    
    const totalTaxable = (frg + awb_chg + pick + del + spl + oth);
    
    let hasGst = false;
    if (itemObj.gst === "YES" || itemObj.gst === "Yes" || itemObj.gst === "yes") {
      hasGst = true;
    }

    const gstRate = hasGst ? 18 : 0;
    const gstAmt = totalTaxable * (gstRate / 100);
    const total = totalTaxable + gstAmt;

    let clientMaster = null;
    try {
      if (itemObj.client) {
        const clientsSnap = await db.collection("clients").where("name", "==", itemObj.client).get();
        if (!clientsSnap.empty) {
          clientMaster = clientsSnap.docs[0].data();
        }
      }
    } catch (e) {}
    
    const gstin = clientMaster?.gst || "";
    const clientStateCode = gstin ? gstin.substring(0, 2) : "05";
    const clientAddress = clientMaster?.address || "";
    
    let cgst = 0, sgst = 0, igst = 0;
    if (gstRate > 0) {
      if (clientStateCode === "05" || !clientStateCode) {
        cgst = gstAmt / 2;
        sgst = gstAmt / 2;
      } else {
        igst = gstAmt;
      }
    }

    let sacCode = "996511";
    if (itemObj.mode.toLowerCase() === "train") {
        sacCode = "996512";
    } else if (itemObj.mode.toLowerCase() === "air") {
        sacCode = "996531";
    }

    const billData = {
      id: existingId || uuidv4(),
      billNo: invoice,
      invoice: invoice,
      invoice_date: itemObj.invoice_date || new Date().toISOString().split('T')[0],
      client: itemObj.client,
      lrNo: awb,
      lrDate: itemObj.awb_date,
      refNo: awb,
      origin: itemObj.origin,
      destination: itemObj.destination,
      packages: itemObj.box,
      weight: itemObj.weight,
      rate: itemObj.rate,
      freight: frg,
      lrCharge: awb_chg,
      pickupCharge: pick,
      deliveryCharge: del,
      specialCharge: spl,
      otherCharge: oth,
      items: [itemObj],
      taxable: totalTaxable,
      subtotal: totalTaxable,
      gst: gstRate,
      cgst,
      sgst,
      igst,
      gstin,
      stateCode: clientStateCode,
      clientAddress,
      sacCode,
      amount: total,
      totalPayable: total,
      total: total,
      mode: itemObj.mode,
      status: "pending",
      paidAmount: 0,
      createdAt: itemObj.invoice_date ? new Date(itemObj.invoice_date).toISOString() : new Date().toISOString()
    };

    await db.collection("bills").doc(billData.id).set(billData, { merge: true });
    if (awb) {
      try {
        const bookingsSnap = await db.collection("bookings").where("lrNumber", "==", awb).get();
        if (!bookingsSnap.empty) {
          const bookingDoc = bookingsSnap.docs[0];
          await db.collection("bookings").doc(bookingDoc.id).update({ status: "Billed" });
        } else {
          // Check by awb field
          const awbSnap = await db.collection("bookings").where("awb", "==", awb).get();
          if (!awbSnap.empty) {
            const bookingDoc = awbSnap.docs[0];
            await db.collection("bookings").doc(bookingDoc.id).update({ status: "Billed" });
          }
        }
      } catch(e) {}
    }
    if (billData.client) {
      await recalculatePartyPayments('Client', billData.client);
    }
    importedCount++;
  }

  await delCache(CACHE_KEY);
  emitDataUpdated("bills", "update");
  return success(res, `Successfully imported ${importedCount} bills`);
};

