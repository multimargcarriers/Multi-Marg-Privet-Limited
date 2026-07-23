const {
  db
} = require("../config/database");
const {
  v4: uuidv4
} = require("uuid");
const {
  success,
  created,
  error
} = require("../utils/response");
const {
  asyncHandler
} = require("../middleware/errorHandler");
const {
  getOrSet,
  delCache
} = require("../config/redis");
const {
  body,
  param,
  validationResult
} = require("express-validator");
const {
  generatePDF
} = require("../utils/pdfGenerator");
const {
  uploadBase64
} = require("../config/cloudinary");

exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("bills").orderBy("createdAt", "desc").limit(100).get();
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
  const {
    id
  } = req.params;
  const doc = await db.collection("bills").doc(id).get();
  if (!doc.exists) return error(res, "Bill not found", 404);
  return success(res, "Bill fetched successfully", {
    id: doc.id,
    ...doc.data()
  });
};

exports.get_id_pdf_3 = async (req, res) => {
  const {
    id
  } = req.params;
  let bill;
  const doc = await db.collection("bills").doc(id).get();
  if (doc.exists) bill = {
    id: doc.id,
    ...doc.data()
  };
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
  .text-center { text-align: center; }
  .footer { margin-top: 30px; }
  .footer .line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; font-size: 11px; text-align: center; width: 30%; }
</style></head><body>
<div class="header">
  <h1>MULTIMARG CARRIERS</h1>
  <p>Transport & Logistics Services</p>
  <p>GST: 08ABCDE1234F1Z5 | PAN: ABCDE1234F</p>
</div>
<div class="title">TAX INVOICE</div>
<table>
  <tr><td style="width:50%;"><strong>Invoice No:</strong> ${billNo}</td><td><strong>Date:</strong> ${date}</td></tr>
  <tr><td><strong>Client:</strong> ${bill.client || "-"}</td><td><strong>LR No:</strong> ${bill.lrNo || "-"}</td></tr>
  <tr><td><strong>GSTIN:</strong> ${bill.gstin || "08ABCDE1234F1Z5"}</td><td><strong>Status:</strong> ${bill.status || "Pending"}</td></tr>
</table>
<h3 style="font-size:14px; margin:10px 0;">Invoice Details</h3>
<table>
  <tr><th>#</th><th>Description</th><th class="text-right">Amount (Rs.)</th></tr>
  <tr><td>1</td><td>Transport Charges - ${bill.description || "Freight Charges"}</td><td class="text-right">${parseFloat(bill.taxable || bill.amount || 0).toFixed(2)}</td></tr>
  <tr><td colspan="2" style="text-align:right;"><strong>Taxable Value</strong></td><td class="text-right">${parseFloat(bill.taxable || bill.amount || 0).toFixed(2)}</td></tr>
  <tr><td colspan="2" style="text-align:right;">CGST @ ${(parseFloat(bill.gst || 0) / 2).toFixed(2)}%</td><td class="text-right">${parseFloat(bill.cgst || 0).toFixed(2)}</td></tr>
  <tr><td colspan="2" style="text-align:right;">SGST @ ${(parseFloat(bill.gst || 0) / 2).toFixed(2)}%</td><td class="text-right">${parseFloat(bill.sgst || 0).toFixed(2)}</td></tr>
  <tr style="font-weight:bold;"><td colspan="2" style="text-align:right;">Total Amount</td><td class="text-right">${parseFloat(bill.total || bill.amount || 0).toFixed(2)}</td></tr>
</table>
<p style="font-size:11px; margin-top:15px;"><strong>Amount in Words:</strong> ${numberToWords(bill.total || bill.amount || 0)}</p>
<div class="footer" style="display:flex; justify-content:space-between;">
  <div><div class="line">Authorised Signatory</div></div>
</div>
</body></html>`;
  const pdfBuffer = await generatePDF(html);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=Invoice_${billNo.replace(/\//g, '_')}.pdf`);
  res.send(pdfBuffer);
};

exports.post_id_upload_pdf_4 = async (req, res) => {
  const {
    id
  } = req.params;
  let bill;
  const doc = await db.collection("bills").doc(id).get();
  if (doc.exists) bill = {
    id: doc.id,
    ...doc.data()
  };
  if (!bill) return error(res, "Bill not found", 404);
  const billNo = bill.billNo || id;
  const date = bill.createdAt ? new Date(bill.createdAt).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");

  // Quick HTML generation (same as above)
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice - ${billNo}</title><style>body { font-family: Arial, sans-serif; margin: 20px; } .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; } .header h1 { margin: 0; font-size: 24px; } .header p { margin: 2px 0; font-size: 12px; } .title { text-align: center; font-size: 18px; font-weight: bold; margin: 15px 0; text-decoration: underline; } table { width: 100%; border-collapse: collapse; margin: 10px 0; } td, th { border: 1px solid #000; padding: 6px 8px; font-size: 12px; } th { background: #f0f0f0; text-align: left; } .text-right { text-align: right; } .text-center { text-align: center; } .footer { margin-top: 30px; } .footer .line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; font-size: 11px; text-align: center; width: 30%; }</style></head><body><div class="header"><h1>MULTIMARG CARRIERS</h1><p>Transport & Logistics Services</p><p>GST: 08ABCDE1234F1Z5 | PAN: ABCDE1234F</p></div><div class="title">TAX INVOICE</div><table><tr><td style="width:50%;"><strong>Invoice No:</strong> ${billNo}</td><td><strong>Date:</strong> ${date}</td></tr><tr><td><strong>Client:</strong> ${bill.client || "-"}</td><td><strong>LR No:</strong> ${bill.lrNo || "-"}</td></tr><tr><td><strong>GSTIN:</strong> ${bill.gstin || "08ABCDE1234F1Z5"}</td><td><strong>Status:</strong> ${bill.status || "Pending"}</td></tr></table><h3 style="font-size:14px; margin:10px 0;">Invoice Details</h3><table><tr><th>#</th><th>Description</th><th class="text-right">Amount (Rs.)</th></tr><tr><td>1</td><td>Transport Charges - ${bill.description || "Freight Charges"}</td><td class="text-right">${parseFloat(bill.taxable || bill.amount || 0).toFixed(2)}</td></tr><tr><td colspan="2" style="text-align:right;"><strong>Taxable Value</strong></td><td class="text-right">${parseFloat(bill.taxable || bill.amount || 0).toFixed(2)}</td></tr><tr><td colspan="2" style="text-align:right;">CGST @ ${(parseFloat(bill.gst || 0) / 2).toFixed(2)}%</td><td class="text-right">${parseFloat(bill.cgst || 0).toFixed(2)}</td></tr><tr><td colspan="2" style="text-align:right;">SGST @ ${(parseFloat(bill.gst || 0) / 2).toFixed(2)}%</td><td class="text-right">${parseFloat(bill.sgst || 0).toFixed(2)}</td></tr><tr style="font-weight:bold;"><td colspan="2" style="text-align:right;">Total Amount</td><td class="text-right">${parseFloat(bill.total || bill.amount || 0).toFixed(2)}</td></tr></table><p style="font-size:11px; margin-top:15px;"><strong>Amount in Words:</strong> ${numberToWords(bill.total || bill.amount || 0)}</p><div class="footer" style="display:flex; justify-content:space-between;"><div><div class="line">Authorised Signatory</div></div></div></body></html>`;
  const pdfBuffer = await generatePDF(html);
  const base64Data = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
  const uploadResult = await uploadBase64(base64Data, {
    folder: "multimarg/bills",
    publicId: `Invoice_${billNo.replace(/\//g, '_')}`
  });
  if (!uploadResult.success) {
    return error(res, "Failed to upload PDF to Cloudinary: " + uploadResult.message, 500);
  }

  // Save URL to database
  await db.collection("bills").doc(id).update({
    pdfUrl: uploadResult.url
  });
  await delCache(CACHE_KEY);
  return success(res, "PDF generated and uploaded successfully", {
    url: uploadResult.url
  });
};

exports.post_generate_5 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const {
    bookingIds,
    invoiceNo,
    invoiceDate,
    gst: applyGst
  } = req.body;
  const generated = [];
  for (const bookingId of bookingIds) {
    let booking;
    if (!booking) {
      const doc = await db.collection("bookings").doc(bookingId).get();
      if (doc.exists) booking = {
        id: doc.id,
        ...doc.data()
      };
    }
    if (booking) {
      const freight = parseFloat(booking.freight_charge || booking.freight || booking.frieght || 0);
      const awb = parseFloat(booking.awb_charge || 0);
      const pickup = parseFloat(booking.pickup_charge || 0);
      const delivery = parseFloat(booking.delivery_charge || 0);
      const packaging = parseFloat(booking.packaging_charge || 0);
      const handling = parseFloat(booking.handling_charge || 0);
      const gstRate = applyGst ? 5 : 0;
      const taxable = freight + awb + pickup + delivery + packaging + handling;
      const gstAmt = taxable * gstRate / 100;
      const cgst = gstAmt / 2;
      const sgst = gstAmt / 2;
      const total = taxable + gstAmt;
      const countSnap = await db.collection("bills").count().get();
      const totalBills = countSnap.data().count;
      const billNo = invoiceNo || `MCPL/25-26/${String(totalBills + generated.length + 1).padStart(3, "0")}`;
      const bill = {
        id: uuidv4(),
        billNo,
        client: booking.client,
        amount: total,
        total,
        taxable,
        gst: gstRate,
        cgst,
        sgst,
        lrNo: booking.lrNumber || booking.id,
        status: "pending",
        createdAt: invoiceDate ? new Date(invoiceDate).toISOString() : new Date().toISOString()
      };
      await db.collection("bookings").doc(booking.id).update({
        status: "Billed"
      });
      // Save the generated bill to the bills collection
      await db.collection("bills").doc(bill.id).set(bill);
    }
    generated.push(bill);
  }
  await delCache(CACHE_KEY);
  await delCache("bookings"); // Clear bookings cache since their status changed
  return success(res, "Bills generated successfully", {
    bills: generated,
    count: generated.length
  });
};

exports.post_misc_6 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const {
    client,
    date,
    description,
    amount,
    gst,
    remarks
  } = req.body;
  const gstRate = parseFloat(gst) || 0;
  const taxable = parseFloat(amount) / (1 + gstRate / 100);
  const gstAmt = parseFloat(amount) - taxable;
  const cgst = gstAmt / 2;
  const sgst = gstAmt / 2;
  const countSnap = await db.collection("bills").count().get();
  const totalBills = countSnap.data().count;
  const billNo = `MCPL/25-26/${String(totalBills + 1).padStart(3, "0")}`;
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
    remarks,
    date: date || new Date().toISOString(),
    status: "pending",
    createdAt: new Date().toISOString()
  };
  await db.collection("bills").add(bill);
  await delCache(CACHE_KEY);
  return created(res, "Miscellaneous bill created successfully", bill);
};

exports.put_id_7 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("bills").doc(id).get();
  if (!doc.exists) return error(res, "Bill not found", 404);
  await db.collection("bills").doc(id).update(req.body);
  await delCache(CACHE_KEY);
  return success(res, "Bill updated successfully", {
    id,
    ...req.body
  });
};

exports.delete_id_8 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("bills").doc(id).get();
  if (!doc.exists) return error(res, "Bill not found", 404);
  await db.collection("bills").doc(id).delete();
  await delCache(CACHE_KEY);
  return success(res, "Bill deleted successfully");
};

