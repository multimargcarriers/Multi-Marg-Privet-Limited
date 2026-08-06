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
  generatePDF
} = require("../utils/pdfGenerator");

// Generate LR PDF (returns HTML for now, can be converted to PDF client-side)

exports.get_lr_id_1 = async (req, res) => {
  const {
    id
  } = req.params;
  let booking;
  const doc = await db.collection("bookings").doc(id).get();
  if (doc.exists) booking = {
    id: doc.id,
    ...doc.data()
  };
  if (!booking) return error(res, "Booking not found", 404);
  const lrNumber = booking.lrNumber || booking.awb || id;
  const date = booking.date ? new Date(booking.date).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>LR - ${lrNumber}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
  .header h1 { margin: 0; font-size: 24px; }
  .header p { margin: 2px 0; font-size: 12px; }
  .title { text-align: center; font-size: 18px; font-weight: bold; margin: 15px 0; text-decoration: underline; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  td, th { border: 1px solid #000; padding: 6px 8px; font-size: 12px; }
  th { background: #f0f0f0; text-align: left; }
  .label { font-weight: bold; width: 30%; }
  .footer { margin-top: 30px; display: flex; justify-content: space-between; }
  .footer div { text-align: center; width: 30%; }
  .footer .line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; font-size: 11px; }
</style></head><body>
<div class="header">
  <h1>MULTIMARG CARRIERS</h1>
  <p>Transport & Logistics Services</p>
  <p>GST: 08ABCDE1234F1Z5 | PAN: ABCDE1234F</p>
</div>
<div class="title">LORRY RECEIPT (LR)</div>
<table>
  <tr><td class="label">LR No:</td><td><strong>${lrNumber}</strong></td><td class="label">Date:</td><td>${date}</td></tr>
  <tr><td class="label">Consignor:</td><td>${booking.consignor || "-"}</td><td class="label">Consignee:</td><td>${booking.consignee || "-"}</td></tr>
  <tr><td class="label">Origin:</td><td>${booking.origin || "-"}</td><td class="label">Destination:</td><td>${booking.destination || "-"}</td></tr>
  <tr><td class="label">Mode:</td><td>${booking.mode || "Road"}</td><td class="label">Client:</td><td>${booking.client || "-"}</td></tr>
  <tr><td class="label">No of Boxes:</td><td>${booking.box || 0}</td><td class="label">Actual Weight:</td><td>${booking.actual_wt || booking.weight || 0} kg</td></tr>
  <tr><td class="label">Chargeable Weight:</td><td>${booking.charge_wt || booking.weight || 0} kg</td><td class="label">Type of Delivery:</td><td>${booking.type_of_delivery || booking.tob || "-"}</td></tr>
  <tr><td class="label">Insured:</td><td>${booking.insured || "No"}</td><td class="label">E-Way Bill:</td><td>${booking.eway_bill || booking.eway || "-"}</td></tr>
</table>
<h3 style="font-size:14px; margin:10px 0;">Charge Details</h3>
<table>
  <tr><th>Particulars</th><th>Amount (Rs.)</th></tr>
  <tr><td>Freight Charge</td><td>${parseFloat(booking.freight_charge || booking.frieght || booking.freight || 0).toFixed(2)}</td></tr>
  <tr><td>AWB Charge</td><td>${parseFloat(booking.awb_charge || 0).toFixed(2)}</td></tr>
  <tr><td>Pickup Charge</td><td>${parseFloat(booking.pickup_charge || 0).toFixed(2)}</td></tr>
  <tr><td>Delivery Charge</td><td>${parseFloat(booking.delivery_charge || 0).toFixed(2)}</td></tr>
  <tr><td>Packaging Charge</td><td>${parseFloat(booking.packaging_charge || 0).toFixed(2)}</td></tr>
  <tr><td>Handling Charge</td><td>${parseFloat(booking.handling_charge || 0).toFixed(2)}</td></tr>
  <tr style="font-weight:bold;"><td>Total</td><td>${(parseFloat(booking.freight_charge || booking.frieght || booking.freight || 0) + parseFloat(booking.awb_charge || 0) + parseFloat(booking.pickup_charge || 0) + parseFloat(booking.delivery_charge || 0) + parseFloat(booking.packaging_charge || 0) + parseFloat(booking.handling_charge || 0)).toFixed(2)}</td></tr>
</table>
<div class="footer">
  <div><div class="line">Consignor Signature</div></div>
  <div><div class="line">Consignee Signature</div></div>
  <div><div class="line">Authorised Signatory</div></div>
</div>
</body></html>`;
  res.json({
    success: true,
    data: {
      html,
      lrNumber,
      booking
    }
  });
};

exports.get_lr_id_pdf_2 = async (req, res) => {
  const {
    id
  } = req.params;
  let booking;
  const doc = await db.collection("bookings").doc(id).get();
  if (doc.exists) booking = {
    id: doc.id,
    ...doc.data()
  };
  if (!booking) return error(res, "Booking not found", 404);
  const lrNumber = booking.lrNumber || booking.awb || id;
  const date = booking.date ? new Date(booking.date).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LR - ${lrNumber}</title><style>body { font-family: Arial, sans-serif; margin: 20px; } .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; } .header h1 { margin: 0; font-size: 24px; } .header p { margin: 2px 0; font-size: 12px; } .title { text-align: center; font-size: 18px; font-weight: bold; margin: 15px 0; text-decoration: underline; } table { width: 100%; border-collapse: collapse; margin: 10px 0; } td, th { border: 1px solid #000; padding: 6px 8px; font-size: 12px; } th { background: #f0f0f0; text-align: left; } .label { font-weight: bold; width: 30%; } .footer { margin-top: 30px; display: flex; justify-content: space-between; } .footer div { text-align: center; width: 30%; } .footer .line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; font-size: 11px; }</style></head><body><div class="header"><h1>MULTIMARG CARRIERS</h1><p>Transport & Logistics Services</p><p>GST: 08ABCDE1234F1Z5 | PAN: ABCDE1234F</p></div><div class="title">LORRY RECEIPT (LR)</div><table><tr><td class="label">LR No:</td><td><strong>${lrNumber}</strong></td><td class="label">Date:</td><td>${date}</td></tr><tr><td class="label">Consignor:</td><td>${booking.consignor || "-"}</td><td class="label">Consignee:</td><td>${booking.consignee || "-"}</td></tr><tr><td class="label">Origin:</td><td>${booking.origin || "-"}</td><td class="label">Destination:</td><td>${booking.destination || "-"}</td></tr><tr><td class="label">Mode:</td><td>${booking.mode || "Road"}</td><td class="label">Client:</td><td>${booking.client || "-"}</td></tr><tr><td class="label">No of Boxes:</td><td>${booking.box || 0}</td><td class="label">Actual Weight:</td><td>${booking.actual_wt || booking.weight || 0} kg</td></tr><tr><td class="label">Chargeable Weight:</td><td>${booking.charge_wt || booking.weight || 0} kg</td><td class="label">Type of Delivery:</td><td>${booking.type_of_delivery || booking.tob || "-"}</td></tr><tr><td class="label">Insured:</td><td>${booking.insured || "No"}</td><td class="label">E-Way Bill:</td><td>${booking.eway_bill || booking.eway || "-"}</td></tr></table><h3 style="font-size:14px; margin:10px 0;">Charge Details</h3><table><tr><th>Particulars</th><th>Amount (Rs.)</th></tr><tr><td>Freight Charge</td><td>${parseFloat(booking.freight_charge || booking.frieght || booking.freight || 0).toFixed(2)}</td></tr><tr><td>AWB Charge</td><td>${parseFloat(booking.awb_charge || 0).toFixed(2)}</td></tr><tr><td>Pickup Charge</td><td>${parseFloat(booking.pickup_charge || 0).toFixed(2)}</td></tr><tr><td>Delivery Charge</td><td>${parseFloat(booking.delivery_charge || 0).toFixed(2)}</td></tr><tr><td>Packaging Charge</td><td>${parseFloat(booking.packaging_charge || 0).toFixed(2)}</td></tr><tr><td>Handling Charge</td><td>${parseFloat(booking.handling_charge || 0).toFixed(2)}</td></tr><tr style="font-weight:bold;"><td>Total</td><td>${(parseFloat(booking.freight_charge || booking.frieght || booking.freight || 0) + parseFloat(booking.awb_charge || 0) + parseFloat(booking.pickup_charge || 0) + parseFloat(booking.delivery_charge || 0) + parseFloat(booking.packaging_charge || 0) + parseFloat(booking.handling_charge || 0)).toFixed(2)}</td></tr></table><div class="footer"><div><div class="line">Consignor Signature</div></div><div><div class="line">Consignee Signature</div></div><div><div class="line">Authorised Signatory</div></div></div></body></html>`;
  const pdfBuffer = await generatePDF(html);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=LR_${lrNumber}.pdf`);
  res.send(pdfBuffer);
};

exports.get_bill_id_3 = async (req, res) => {
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
  res.json({
    success: true,
    data: {
      html,
      billNo,
      bill
    }
  });
};

exports.get_manifest_id_4 = async (req, res) => {
  const {
    id
  } = req.params;
  let trip;
  const doc = await db.collection("trips").doc(id).get();
  if (doc.exists) trip = {
    id: doc.id,
    ...doc.data()
  };
  if (!trip) return error(res, "Trip not found", 404);
  const tripNo = trip.trip || trip.tripNo || trip.id;
  const date = trip.date ? new Date(trip.date).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");
  
  let materialDetailsRows = "";
  if (trip.materialDetails && Array.isArray(trip.materialDetails) && trip.materialDetails.length > 0) {
    trip.materialDetails.forEach(mat => {
      materialDetailsRows += `<tr>
        <td>${mat.clientName || "-"}</td>
        <td>${mat.lrNo || "-"}</td>
        <td>${mat.consignor || "-"}</td>
        <td>${mat.consignee || "-"}</td>
        <td>${mat.box || "-"}</td>
        <td>${mat.weight || "-"}</td>
        <td>${mat.invoiceNo || "-"}</td>
        <td>${mat.bookingType || "Normal"}</td>
        <td>${parseFloat(mat.amount || 0).toFixed(2)}</td>
        <td>${mat.paymentType || "Credit"}</td>
      </tr>`;
    });
  } else {
    materialDetailsRows = `<tr><td colspan="10" class="text-center">No material details available</td></tr>`;
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Trip Manifest - ${tripNo}</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; font-size: 11px; color: #000; }
  .header { background-color: #004488; color: #fff; text-align: center; padding: 15px; margin-bottom: 20px; border: 1px solid #004488; }
  .header h1 { margin: 0 0 5px 0; font-size: 22px; font-weight: bold; }
  .header p { margin: 2px 0; font-size: 11px; font-weight: bold; }
  .section-title { background-color: #004488; color: #fff; padding: 4px 8px; font-weight: bold; margin-top: 15px; border: 1px solid #004488; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  td, th { border: 1px solid #ccc; padding: 6px 8px; font-size: 11px; vertical-align: middle; }
  th { font-weight: bold; background-color: #f9f9f9; text-align: left; }
  .label-col { font-weight: bold; width: 15%; background-color: #f9f9f9; }
  .value-col { width: 35%; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .footer-note { border: 1px dashed #999; padding: 10px; font-size: 10px; margin-top: 20px; text-align: left; }
  .footer-sign { margin-top: 40px; text-align: left; font-size: 11px; }
</style></head><body>
<div class="header">
  <h1>MULTIMARG CARRIERS PVT. LTD.</h1>
  <p>LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND</p>
  <p>Contact:+91 5944-324033 | info@multimargcarriers.co.in</p>
  <p>GST No:05AANCM3054E1ZN</p>
</div>

<div class="section-title">Trip Details</div>
<table>
  <tr>
    <td class="label-col">Trip No</td><td style="width:15%;">${tripNo}</td>
    <td class="label-col" style="width:10%;">Date</td><td style="width:20%;">${date}</td>
    <td class="label-col" style="width:10%;">Vendor</td><td>${trip.vendor || "-"}</td>
  </tr>
</table>

<div class="section-title">Vehicle Details</div>
<table>
  <tr><td class="label-col" style="width:25%;">Vehicle Type</td><td>${trip.vehicleType || trip.vtype || "-"}</td></tr>
  <tr><td class="label-col">Vehicle No</td><td>${trip.vehicleNo || trip.vehicle || trip.vno || "-"}</td></tr>
  <tr><td class="label-col">Driver Name</td><td>${trip.driverName || trip.driver || "-"}</td></tr>
</table>

<div class="section-title">Shipment Info</div>
<table>
  <tr>
    <td class="label-col">Origin</td><td class="value-col">${trip.origin || "-"}</td>
    <td class="label-col">Destination</td><td class="value-col">${trip.destination || "-"}</td>
  </tr>
</table>

<div class="section-title">Shipment Items</div>
<table>
  <tr>
    <th>Client</th>
    <th>Lr No</th>
    <th>Consignor</th>
    <th>Consignee</th>
    <th>Box</th>
    <th>Weight</th>
    <th>Invoice</th>
    <th>Booking Type</th>
    <th>Amount</th>
    <th>Payment Type</th>
  </tr>
  ${materialDetailsRows}
</table>

<div class="footer-note">
  NOTE: Quantity and quality not checked. We are not responsible for leakage &amp; damage. Subject to Uttarakhand jurisdiction only.
</div>

<div class="footer-sign">
  Receiver's Sign &amp; Stamp: ____________
</div>
</body></html>`;
  res.json({
    success: true,
    data: {
      html,
      tripNo,
      trip
    }
  });
};

exports.get_manifest_id_pdf_5 = async (req, res) => {
  const {
    id
  } = req.params;
  let trip;
  const doc = await db.collection("trips").doc(id).get();
  if (doc.exists) trip = {
    id: doc.id,
    ...doc.data()
  };
  if (!trip) return error(res, "Trip not found", 404);
  const tripNo = trip.trip || trip.tripNo || trip.id;
  const date = trip.date ? new Date(trip.date).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");
  
  let materialDetailsRows = "";
  if (trip.materialDetails && Array.isArray(trip.materialDetails) && trip.materialDetails.length > 0) {
    trip.materialDetails.forEach(mat => {
      materialDetailsRows += `<tr>
        <td>${mat.clientName || "-"}</td>
        <td>${mat.lrNo || "-"}</td>
        <td>${mat.consignor || "-"}</td>
        <td>${mat.consignee || "-"}</td>
        <td>${mat.box || "-"}</td>
        <td>${mat.weight || "-"}</td>
        <td>${mat.invoiceNo || "-"}</td>
        <td>${mat.bookingType || "Normal"}</td>
        <td>${parseFloat(mat.amount || 0).toFixed(2)}</td>
        <td>${mat.paymentType || "Credit"}</td>
      </tr>`;
    });
  } else {
    materialDetailsRows = `<tr><td colspan="10" class="text-center">No material details available</td></tr>`;
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Trip Manifest - ${tripNo}</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; font-size: 11px; color: #000; }
  .header { background-color: #004488; color: #fff; text-align: center; padding: 15px; margin-bottom: 20px; border: 1px solid #004488; }
  .header h1 { margin: 0 0 5px 0; font-size: 22px; font-weight: bold; }
  .header p { margin: 2px 0; font-size: 11px; font-weight: bold; }
  .section-title { background-color: #004488; color: #fff; padding: 4px 8px; font-weight: bold; margin-top: 15px; border: 1px solid #004488; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  td, th { border: 1px solid #ccc; padding: 6px 8px; font-size: 11px; vertical-align: middle; }
  th { font-weight: bold; background-color: #f9f9f9; text-align: left; }
  .label-col { font-weight: bold; width: 15%; background-color: #f9f9f9; }
  .value-col { width: 35%; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .footer-note { border: 1px dashed #999; padding: 10px; font-size: 10px; margin-top: 20px; text-align: left; }
  .footer-sign { margin-top: 40px; text-align: left; font-size: 11px; }
</style></head><body>
<div class="header">
  <h1>MULTIMARG CARRIERS PVT. LTD.</h1>
  <p>LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND</p>
  <p>Contact:+91 5944-324033 | info@multimargcarriers.co.in</p>
  <p>GST No:05AANCM3054E1ZN</p>
</div>

<div class="section-title">Trip Details</div>
<table>
  <tr>
    <td class="label-col">Trip No</td><td style="width:15%;">${tripNo}</td>
    <td class="label-col" style="width:10%;">Date</td><td style="width:20%;">${date}</td>
    <td class="label-col" style="width:10%;">Vendor</td><td>${trip.vendor || "-"}</td>
  </tr>
</table>

<div class="section-title">Vehicle Details</div>
<table>
  <tr><td class="label-col" style="width:25%;">Vehicle Type</td><td>${trip.vehicleType || trip.vtype || "-"}</td></tr>
  <tr><td class="label-col">Vehicle No</td><td>${trip.vehicleNo || trip.vehicle || trip.vno || "-"}</td></tr>
  <tr><td class="label-col">Driver Name</td><td>${trip.driverName || trip.driver || "-"}</td></tr>
</table>

<div class="section-title">Shipment Info</div>
<table>
  <tr>
    <td class="label-col">Origin</td><td class="value-col">${trip.origin || "-"}</td>
    <td class="label-col">Destination</td><td class="value-col">${trip.destination || "-"}</td>
  </tr>
</table>

<div class="section-title">Shipment Items</div>
<table>
  <tr>
    <th>Client</th>
    <th>Lr No</th>
    <th>Consignor</th>
    <th>Consignee</th>
    <th>Box</th>
    <th>Weight</th>
    <th>Invoice</th>
    <th>Booking Type</th>
    <th>Amount</th>
    <th>Payment Type</th>
  </tr>
  ${materialDetailsRows}
</table>

<div class="footer-note">
  NOTE: Quantity and quality not checked. We are not responsible for leakage &amp; damage. Subject to Uttarakhand jurisdiction only.
</div>

<div class="footer-sign">
  Receiver's Sign &amp; Stamp: ____________
</div>
</body></html>`;
  const pdfBuffer = await generatePDF(html);
  res.setHeader("Content-Type", "application/pdf");
  
  const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
  res.setHeader("Content-Disposition", `${disposition}; filename=Manifest_${tripNo}.pdf`);
  res.send(pdfBuffer);
};

exports.get_trip_bill_trip_client_6 = async (req, res) => {
  const {
    trip: tripNo,
    client
  } = req.params;
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Trip Bill - ${tripNo}</title>
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
</style></head><body>
<div class="header">
  <h1>MULTIMARG CARRIERS</h1>
  <p>Transport & Logistics Services</p>
  <p>GST: 08ABCDE1234F1Z5 | PAN: ABCDE1234F</p>
</div>
<div class="title">TRIP BILL</div>
<table>
  <tr><td style="width:20%;"><strong>Trip No:</strong></td><td style="width:30%;">${tripNo}</td><td style="width:20%;"><strong>Client:</strong></td><td>${client}</td></tr>
  <tr><td><strong>Date:</strong></td><td>${new Date().toLocaleDateString("en-IN")}</td><td><strong>Bill No:</strong></td><td>TB/${tripNo}/${client}</td></tr>
</table>
<h3 style="font-size:14px; margin:10px 0;">LR Details</h3>
<table>
  <tr><th>#</th><th>LR No</th><th>Consignor</th><th>Consignee</th><th>Box</th><th>Weight</th><th class="text-right">Amount</th></tr>
  <tr><td colspan="7" class="text-center">No LR details available</td></tr>
</table>
<div style="margin-top:30px; display:flex; justify-content:flex-end;">
  <div style="text-align:center; width:30%; border-top:1px solid #000; padding-top:5px; font-size:11px;">Authorised Signatory</div>
</div>
</body></html>`;
  res.json({
    success: true,
    data: {
      html,
      tripNo,
      client
    }
  });
};

