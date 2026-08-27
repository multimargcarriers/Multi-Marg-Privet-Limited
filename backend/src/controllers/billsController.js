const { emitDataUpdated } = require("../utils/socket");
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { logUserActivity } = require("../utils/activityLogger");
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

      function formatAnyDate(val) {
        if (!val) return "";
        if (typeof val === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(val)) return val;
        if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
          const p = val.split('/');
          return `${p[0]}-${p[1]}-${p[2]}`;
        }
        const d = new Date(val);
        if (isNaN(d.getTime())) return String(val).split('T')[0] || "";
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      }

      let refNumber = "-";
      if (booking.invoiceDetails && Array.isArray(booking.invoiceDetails) && booking.invoiceDetails.length > 0) {
        const invs = booking.invoiceDetails.map(it => it.invoiceNo || it.invoiceNumber || it.invoice_no).filter(Boolean);
        if (invs.length > 0) refNumber = invs.join(", ");
      }
      if (refNumber === "-" || !refNumber) {
        refNumber = booking.invoiceNo || booking.invoice_no || booking.refNo || booking.ref || booking.reference_no || booking.invoiceNumber || booking.ewayBill || "-";
      }

      const lrNumber = booking.awb || booking.consignment || booking.lrNo || booking.lrNumber || booking.id;
      const rawDate = booking.dispatch_date || booking.date || booking.createdAt || booking.bookingDate;
      const lrDateFormatted = formatAnyDate(rawDate) || formatAnyDate(new Date());
      const originCity = booking.origin || "-";
      const destCity = booking.destination || "-";
      const pkgQty = editedData && editedData.pkg !== undefined && editedData.pkg !== "" ? parseInt(editedData.pkg || 0) : parseInt(booking.box || booking.pkg || booking.boxes || booking.package_count || booking.packages || booking.pcs || 1);
      const wtVal = editedData && editedData.wt !== undefined && editedData.wt !== "" ? parseFloat(editedData.wt || 0) : parseFloat(booking.charge_wt || booking.chargeable_weight || booking.chargeWeight || booking.weight_chargeable || booking.weight || booking.actual_wt || 0);
      const rateVal = editedData && editedData.rate !== undefined ? parseFloat(editedData.rate || 0) : (booking.rate || 0);

      aggregatedItems.push({
        si: i + 1,
        awb: lrNumber,
        lrNo: lrNumber,
        awb_date: lrDateFormatted,
        lrDt: lrDateFormatted,
        ref: refNumber,
        refNo: refNumber,
        invoiceNo: refNumber,
        origin: originCity,
        destination: destCity,
        box: pkgQty,
        pkg: pkgQty,
        weight: wtVal,
        wt: wtVal,
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
    packages: bookingIds.length > 1 ? aggregatedItems.reduce((acc, curr) => acc + parseInt(curr.pkg || curr.box || 0), 0) : parseInt(firstBooking.box || firstBooking.pkg || firstBooking.boxes || firstBooking.package_count || firstBooking.packages || firstBooking.pcs || aggregatedItems[0]?.box || 1),
    weight: bookingIds.length > 1 ? aggregatedItems.reduce((acc, curr) => acc + parseFloat(curr.wt || curr.weight || 0), 0) : parseFloat(firstBooking.charge_wt || firstBooking.chargeable_weight || firstBooking.chargeWeight || firstBooking.weight_chargeable || firstBooking.weight || aggregatedItems[0]?.weight || 0),
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

  // Update booking status and sync all billing fields to booking in database
  for (let i = 0; i < bookingIds.length; i++) {
    const bId = bookingIds[i];
    const itemData = aggregatedItems[i] || {};

    const bookingUpdate = {
      status: "Billed",
      billed: true,
      billNo: billNo
    };

    if (itemData) {
      if (itemData.pkg !== undefined) {
        bookingUpdate.box = String(itemData.pkg);
        bookingUpdate.pkg = String(itemData.pkg);
        bookingUpdate.packages = parseInt(itemData.pkg || 0, 10);
        bookingUpdate.package_count = parseInt(itemData.pkg || 0, 10);
      }
      if (itemData.wt !== undefined) {
        bookingUpdate.charge_wt = String(itemData.wt);
        bookingUpdate.weight_chargeable = parseFloat(itemData.wt || 0);
      }
      if (itemData.rate !== undefined) {
        bookingUpdate.rate = parseFloat(itemData.rate || 0);
      }
      if (itemData.frieght !== undefined) {
        bookingUpdate.freight_charge = parseFloat(itemData.frieght || 0);
      }
      if (itemData.awb_charge !== undefined) {
        bookingUpdate.awb_charge = parseFloat(itemData.awb_charge || 0);
      }
      if (itemData.pickup !== undefined) {
        bookingUpdate.pickup_charge = parseFloat(itemData.pickup || 0);
      }
      if (itemData.delivery !== undefined) {
        bookingUpdate.delivery_charge = parseFloat(itemData.delivery || 0);
      }
      if (itemData.special_delivery !== undefined) {
        bookingUpdate.packaging_charge = parseFloat(itemData.special_delivery || 0);
      }
      if (itemData.other_charge !== undefined) {
        bookingUpdate.handling_charge = parseFloat(itemData.other_charge || 0);
      }
      if (itemData.total !== undefined) {
        bookingUpdate.total_amount = parseFloat(itemData.total || 0);
      }
    }

    try {
      await db.collection("bookings").doc(bId).update(bookingUpdate);
    } catch (e) {
      console.error(`Failed to update booking ${bId}:`, e.message);
    }
  }

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
  await delCache("unbilled");
  
  emitDataUpdated("bills", "create");
  emitDataUpdated("bookings", "update");
  emitDataUpdated("unbilled", "update");

  logUserActivity(req, {
    type: 'bill_generate',
    title: `Generated Invoice #${bill.billNo || bill.id} for ${bill.client || 'Client'} (₹${bill.total || 0})`,
    details: { billId: bill.id, billNo: bill.billNo, client: bill.client }
  });

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

  logUserActivity(req, {
    type: 'bill_misc_create',
    title: `Created Misc Bill #${bill.billNo || bill.id} for ${bill.client || 'Client'} (₹${bill.total || 0})`,
    details: { billId: bill.id, billNo: bill.billNo, client: bill.client }
  });

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

  // Sync updated billing values back to each booking
  if (updatedData.items && Array.isArray(updatedData.items)) {
    for (const it of updatedData.items) {
      const lrNo = it.awb || it.lrNo;
      if (lrNo) {
        const bUpdate = {};
        if (it.pkg !== undefined) {
          bUpdate.box = String(it.pkg);
          bUpdate.pkg = String(it.pkg);
          bUpdate.packages = parseInt(it.pkg || 0, 10);
          bUpdate.package_count = parseInt(it.pkg || 0, 10);
        }
        if (it.wt !== undefined) {
          bUpdate.charge_wt = String(it.wt);
          bUpdate.weight_chargeable = parseFloat(it.wt || 0);
        }
        if (it.rate !== undefined) bUpdate.rate = parseFloat(it.rate || 0);
        if (it.frg !== undefined || it.frieght !== undefined) bUpdate.freight_charge = parseFloat(it.frg || it.frieght || 0);
        if (it.lr !== undefined || it.awb_charge !== undefined) bUpdate.awb_charge = parseFloat(it.lr || it.awb_charge || 0);
        if (it.pick !== undefined || it.pickup !== undefined) bUpdate.pickup_charge = parseFloat(it.pick || it.pickup || 0);
        if (it.del !== undefined || it.delivery !== undefined) bUpdate.delivery_charge = parseFloat(it.del || it.delivery || 0);
        if (it.spl !== undefined || it.special_delivery !== undefined) bUpdate.packaging_charge = parseFloat(it.spl || it.special_delivery || 0);
        if (it.oth !== undefined || it.other_charge !== undefined) bUpdate.handling_charge = parseFloat(it.oth || it.other_charge || 0);
        if (it.total !== undefined) bUpdate.total_amount = parseFloat(it.total || 0);

        if (Object.keys(bUpdate).length > 0 && db.mongoDb) {
          try {
            await db.mongoDb.collection("bookings").updateMany(
              { $or: [{ awb: lrNo }, { consignment: lrNo }, { lrNo: lrNo }, { lrNumber: lrNo }, { id: lrNo }] },
              { $set: bUpdate }
            );
          } catch(err) {
            console.error(`Error updating booking for LR ${lrNo}:`, err);
          }
        }
      }
    }
  }
  const oldClient = doc.data().client;
  const newClient = updatedData.client || oldClient;
  if (oldClient && oldClient !== newClient) {
      await recalculatePartyPayments('Client', oldClient);
  }
  if (newClient) {
      await recalculatePartyPayments('Client', newClient);
  }
  await delCache(CACHE_KEY);
  await delCache("bookings");
  await delCache("unbilled");
  emitDataUpdated("bills", "update");
  emitDataUpdated("bookings", "update");
  emitDataUpdated("unbilled", "update");

  logUserActivity(req, {
    type: 'bill_update',
    title: `Updated Bill #${updatedData.billNo || doc.data().billNo || id} for ${updatedData.client || doc.data().client || 'Client'}`,
    details: { billId: id }
  });

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
  const targetBillNo = billData.billNo || billData.invoice || id;
  const lrsToRevert = new Set();
  if (billData.lrNo && billData.lrNo !== 'MULTIPLE') {
    lrsToRevert.add(String(billData.lrNo).trim());
  }
  if (billData.items && Array.isArray(billData.items)) {
    billData.items.forEach(item => {
      if (item.awb) lrsToRevert.add(String(item.awb).trim());
      if (item.lrNo) lrsToRevert.add(String(item.lrNo).trim());
    });
  }
  const lrList = Array.from(lrsToRevert);

  if (db.mongoDb) {
    const orClauses = [
      { billNo: targetBillNo },
      { billNo: billData.billNo },
      { billNo: billData.invoice }
    ];
    if (lrList.length > 0) {
      orClauses.push({ consignment: { $in: lrList } });
      orClauses.push({ awb: { $in: lrList } });
      orClauses.push({ lrNo: { $in: lrList } });
      orClauses.push({ lrNumber: { $in: lrList } });
      orClauses.push({ id: { $in: lrList } });
    }
    await db.mongoDb.collection("bookings").updateMany(
      { $or: orClauses },
      {
        $set: {
          status: "Booked",
          billed: false,
          billNo: ""
        }
      }
    );
  } else {
    for (const lrNo of lrList) {
      const byAwb = await db.collection("bookings").where("awb", "==", lrNo).get();
      byAwb.forEach(bDoc => db.collection("bookings").doc(bDoc.id).update({ status: "Booked", billed: false, billNo: "" }));
      const byConsignment = await db.collection("bookings").where("consignment", "==", lrNo).get();
      byConsignment.forEach(bDoc => db.collection("bookings").doc(bDoc.id).update({ status: "Booked", billed: false, billNo: "" }));
      const byLrNo = await db.collection("bookings").where("lrNo", "==", lrNo).get();
      byLrNo.forEach(bDoc => db.collection("bookings").doc(bDoc.id).update({ status: "Booked", billed: false, billNo: "" }));
    }
  }

  if (billData.pdfUrl) {
    try {
      const { deleteFile } = require("../config/cloudinary");
      await deleteFile(billData.pdfUrl, "raw");
    } catch (e) {
      console.warn("Failed to delete Bill PDF from Cloudinary:", e.message);
    }
  }

  await db.collection("bills").doc(id).delete(req.user);
  if (billData.client) {
    await recalculatePartyPayments('Client', billData.client);
  }
  await delCache(CACHE_KEY);
  await delCache("bookings");
  await delCache("unbilled");
  emitDataUpdated("bills", "delete");
  emitDataUpdated("bookings", "update");
  emitDataUpdated("unbilled", "update");

  logUserActivity(req, {
    type: 'bill_delete',
    title: `Deleted Bill #${billData.billNo || id} for ${billData.client || 'Client'}`,
    details: { billId: id, billNo: billData.billNo, client: billData.client }
  });

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

exports.delete_clear_all_10 = async (req, res) => {
  // Optional safety check: Ensure user is SuperAdmin or Admin
  const role = (req.user?.role || "").toLowerCase().replace(/\s+/g, '');
  if (role !== 'superadmin' && req.user?.email !== 'admin@multimarg.com' && role !== 'admin') {
    return error(res, "Forbidden: Only Admins can clear bills.", 403);
  }

  const { startDate, endDate } = req.query;

  try {
    const snapshot = await db.collection("bills").get();
    if (snapshot.empty) {
      emitDataUpdated("bills", "update");
      return success(res, "No bills found to delete.");
    }

    const parseBillDate = (d) => {
      if (!d) return null;
      if (typeof d === "string" && /^\d{2}-\d{2}-\d{4}$/.test(d)) {
        const [day, month, year] = d.split("-");
        return new Date(`${year}-${month}-${day}`);
      }
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    const docsToDelete = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      let keep = true;

      if (startDate || endDate) {
        const bDate = parseBillDate(data.createdAt || data.invoice_date);
        if (bDate) {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (bDate < start) keep = false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (bDate > end) keep = false;
          }
        } else {
          keep = false;
        }
      }

      if (keep) {
        docsToDelete.push({ id: doc.id, data });
      }
    });

    if (docsToDelete.length === 0) {
      return success(res, "No bills found within the specified date range.");
    }

    // Insert filtered to Trash first
    const dbInstance = db.mongoDb;
    if (dbInstance) {
      const trashDocs = docsToDelete.map(item => ({
        originalCollection: "bills",
        document: { id: item.id, ...item.data },
        deletedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        deletedBy: req.user ? { id: req.user.id, name: req.user.name, role: req.user.role } : null
      }));
      await dbInstance.collection("trash").insertMany(trashDocs);
    }

    const batch = db.batch();
    const uniqueClients = new Set();

    for (const item of docsToDelete) {
      batch.delete(db.collection("bills").doc(item.id));

      // Revert booking statuses back to "Booked" & billed: false
      const targetBillNo = item.data.billNo || item.data.invoice || item.id;
      const lrsToRevert = new Set();
      if (item.data.lrNo && item.data.lrNo !== 'MULTIPLE') {
        lrsToRevert.add(String(item.data.lrNo).trim());
      }
      if (item.data.items && Array.isArray(item.data.items)) {
        item.data.items.forEach(lrItem => {
          if (lrItem.awb) lrsToRevert.add(String(lrItem.awb).trim());
          if (lrItem.lrNo) lrsToRevert.add(String(lrItem.lrNo).trim());
        });
      }
      const lrList = Array.from(lrsToRevert);

      if (db.mongoDb) {
        const orClauses = [
          { billNo: targetBillNo },
          { billNo: item.data.billNo },
          { billNo: item.data.invoice }
        ];
        if (lrList.length > 0) {
          orClauses.push({ consignment: { $in: lrList } });
          orClauses.push({ awb: { $in: lrList } });
          orClauses.push({ lrNo: { $in: lrList } });
          orClauses.push({ lrNumber: { $in: lrList } });
          orClauses.push({ id: { $in: lrList } });
        }
        await db.mongoDb.collection("bookings").updateMany(
          { $or: orClauses },
          {
            $set: {
              status: "Booked",
              billed: false,
              billNo: ""
            }
          }
        );
      } else {
        for (const lrNo of lrList) {
          const byAwb = await db.collection("bookings").where("awb", "==", lrNo).get();
          byAwb.forEach(bDoc => db.collection("bookings").doc(bDoc.id).update({ status: "Booked", billed: false, billNo: "" }));
          const byConsignment = await db.collection("bookings").where("consignment", "==", lrNo).get();
          byConsignment.forEach(bDoc => db.collection("bookings").doc(bDoc.id).update({ status: "Booked", billed: false, billNo: "" }));
        }
      }

      // Delete Cloudinary PDF if exists
      if (item.data.pdfUrl) {
        try {
          const { deleteFile } = require("../config/cloudinary");
          await deleteFile(item.data.pdfUrl, "raw");
        } catch (e) {
          console.warn("Failed to delete Bill PDF from Cloudinary:", e.message);
        }
      }

      if (item.data.client) {
        uniqueClients.add(item.data.client);
      }
    }

    await batch.commit();

    // Recalculate payments for affected clients
    for (const client of uniqueClients) {
      const { recalculatePartyPayments } = require("../utils/paymentUtils");
      try {
        await recalculatePartyPayments('Client', client);
      } catch (err) {
        console.error(`Error recalculating payments for client ${client}:`, err);
      }
    }

    await delCache(CACHE_KEY);
    await delCache("bookings");
    await delCache("unbilled");
    emitDataUpdated("bills", "delete");
    emitDataUpdated("bookings", "update");
    emitDataUpdated("unbilled", "update");
    return success(res, `Successfully moved ${docsToDelete.length} bills to Trash.`);
  } catch (err) {
    console.error("Error clearing bills:", err);
    return error(res, "Failed to clear bills", 500);
  }
};


