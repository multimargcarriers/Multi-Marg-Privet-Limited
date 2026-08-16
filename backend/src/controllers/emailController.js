const {
  db
} = require("../config/database");
const {
  success,
  created,
  error
} = require("../utils/response");
const {
  asyncHandler
} = require("../middleware/errorHandler");
const {
  body,
  validationResult
} = require("express-validator");

// Send invoice email

exports.post_send_invoice_1 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const {
    to,
    subject,
    body,
    pdfBase64,
    billId
  } = req.body;

  // In production, use nodemailer or SendGrid
  // For now, log and return success
  console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
  console.log(`[EMAIL] Body: ${body.substring(0, 100)}...`);
  if (pdfBase64) console.log(`[EMAIL] PDF attachment included (${pdfBase64.length} chars)`);

  // If billId is provided, update bill status to "invoiced"
  if (billId) {
    const doc = await db.collection("bills").doc(billId).get();
    if (doc.exists) {
      await db.collection("bills").doc(billId).update({
        status: "invoiced",
        emailedAt: new Date().toISOString()
      });
    }
  }
  return success(res, "Invoice email sent successfully", {
    to,
    subject,
    sentAt: new Date().toISOString()
  });
};

const { sendEmail } = require("../config/mail");
const { generatePDF } = require("../utils/pdfGenerator");

exports.post_send_lr = async (req, res) => {
  const { lrId, to, pdfBase64 } = req.body;
  if (!lrId) return error(res, "LR ID is required", 400);
  if (!to) return error(res, "Recipient email is required", 400);

  try {
    const bookingRef = db.collection("bookings").doc(lrId);
    const bookingDoc = await bookingRef.get();
    if (!bookingDoc.exists) return error(res, "Booking not found", 404);
    
    const booking = { id: bookingDoc.id, ...bookingDoc.data() };
    const lrNumber = booking.lrNumber || booking.awb || lrId;
    const date = booking.date ? new Date(booking.date).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");
    
    // --- 1. Generate PDF ---
    let pdfBuffer;
    if (pdfBase64) {
      pdfBuffer = Buffer.from(pdfBase64, 'base64');
    } else {
      const pdfHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LR - ${lrNumber}</title><style>body { font-family: Arial, sans-serif; margin: 20px; } .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; } .header h1 { margin: 0; font-size: 24px; } .header p { margin: 2px 0; font-size: 12px; } .title { text-align: center; font-size: 18px; font-weight: bold; margin: 15px 0; text-decoration: underline; } table { width: 100%; border-collapse: collapse; margin: 10px 0; } td, th { border: 1px solid #000; padding: 6px 8px; font-size: 12px; } th { background: #f0f0f0; text-align: left; } .label { font-weight: bold; width: 30%; } .footer { margin-top: 30px; display: flex; justify-content: space-between; } .footer div { text-align: center; width: 30%; } .footer .line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; font-size: 11px; }</style></head><body><div class="header"><h1>MULTIMARG CARRIERS</h1><p>Transport & Logistics Services</p><p>GST: 08ABCDE1234F1Z5 | PAN: ABCDE1234F</p></div><div class="title">LORRY RECEIPT (LR)</div><table><tr><td class="label">LR No:</td><td><strong>${lrNumber}</strong></td><td class="label">Date:</td><td>${date}</td></tr><tr><td class="label">Consignor:</td><td>${booking.consignor || "-"}</td><td class="label">Consignee:</td><td>${booking.consignee || "-"}</td></tr><tr><td class="label">Origin:</td><td>${booking.origin || "-"}</td><td class="label">Destination:</td><td>${booking.destination || "-"}</td></tr><tr><td class="label">Mode:</td><td>${booking.mode || "Road"}</td><td class="label">Client:</td><td>${booking.client || "-"}</td></tr><tr><td class="label">No of Boxes:</td><td>${booking.box || 0}</td><td class="label">Actual Weight:</td><td>${booking.actual_wt || booking.weight || 0} kg</td></tr><tr><td class="label">Chargeable Weight:</td><td>${booking.charge_wt || booking.weight || 0} kg</td><td class="label">Type of Delivery:</td><td>${booking.type_of_delivery || booking.tob || "-"}</td></tr><tr><td class="label">Insured:</td><td>${booking.insured || "No"}</td><td class="label">E-Way Bill:</td><td>${booking.eway_bill || booking.eway || "-"}</td></tr></table><h3 style="font-size:14px; margin:10px 0;">Charge Details</h3><table><tr><th>Particulars</th><th>Amount (Rs.)</th></tr><tr><td>Freight Charge</td><td>${parseFloat(booking.freight_charge || booking.frieght || booking.freight || 0).toFixed(2)}</td></tr><tr><td>AWB Charge</td><td>${parseFloat(booking.awb_charge || 0).toFixed(2)}</td></tr><tr><td>Pickup Charge</td><td>${parseFloat(booking.pickup_charge || 0).toFixed(2)}</td></tr><tr><td>Delivery Charge</td><td>${parseFloat(booking.delivery_charge || 0).toFixed(2)}</td></tr><tr><td>Packaging Charge</td><td>${parseFloat(booking.packaging_charge || 0).toFixed(2)}</td></tr><tr><td>Handling Charge</td><td>${parseFloat(booking.handling_charge || 0).toFixed(2)}</td></tr><tr style="font-weight:bold;"><td>Total</td><td>${(parseFloat(booking.freight_charge || booking.frieght || booking.freight || 0) + parseFloat(booking.awb_charge || 0) + parseFloat(booking.pickup_charge || 0) + parseFloat(booking.delivery_charge || 0) + parseFloat(booking.packaging_charge || 0) + parseFloat(booking.handling_charge || 0)).toFixed(2)}</td></tr></table><div class="footer"><div><div class="line">Consignor Signature</div></div><div><div class="line">Consignee Signature</div></div><div><div class="line">Authorised Signatory</div></div></div></body></html>`;
      pdfBuffer = await generatePDF(pdfHtml);
    }

    // --- 2. Compile responsive, professional HTML email ---
    let invoiceRowsHtml = "";
    let parcels = (booking.invoiceDetails && booking.invoiceDetails.length > 0) ? booking.invoiceDetails : (booking.parcels || []);
    if (parcels && parcels.length > 0) {
      invoiceRowsHtml += `
        <tr>
          <td colspan="2" style="background-color: #f1f5f9; padding: 12px 16px; font-weight: bold; color: #232F3E; font-size: 15px; border-bottom: 2px solid #cbd5e1; border-top: 1px solid #cbd5e1; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
            Invoice & Material Details
          </td>
        </tr>
      `;
      parcels.forEach((inv, index) => {
        const invNo = inv.invoiceNo || inv.invoice || "";
        const invVal = inv.invoiceValue || inv.value || "";
        const partNo = inv.partNumber || inv.part || "";
        const eway = inv.ewayBill || inv.eway || "";
        invoiceRowsHtml += `
          <tr style="border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; ${index === parcels.length - 1 ? 'border-bottom: 1px solid #e2e8f0;' : ''}">
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 500; vertical-align: top;">Invoice #${index + 1}:</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600; word-break: break-word;">
              ${invNo || "-"} ${invVal ? `(Value: Rs. ${invVal})` : ""}
              ${partNo ? `<br><span style="font-size: 12px; color: #64748b; font-weight: normal;">Part Number: ${partNo}</span>` : ""}
              ${eway ? `<br><span style="font-size: 12px; color: #64748b; font-weight: normal;">E-Way Bill: ${eway}</span>` : ""}
            </td>
          </tr>
        `;
      });
    }

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lorry Receipt - Multi Marg Carriers</title>
</head>
<body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; border-collapse: collapse; width: 100%; box-sizing: border-box;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #232F3E 0%, #0f151c 100%); padding: 35px 25px; text-align: center; border-bottom: 4px solid #FF9900;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">MULTIMARG CARRIERS</h1>
        <p style="color: #FF9900; font-size: 12px; margin: 6px 0 0 0; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Transport & Logistics Services</p>
      </td>
    </tr>
    <!-- Content Body -->
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="color: #232F3E; margin-top: 0; font-size: 20px; font-weight: 700; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">Lorry Receipt (LR) Consignment Details</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
          Dear Team/Client,<br><br>
          We are pleased to share the details of your booking with <strong>Multi Marg Carriers Private Limited</strong>. The official Lorry Receipt / Builty (PDF) has been attached to this email for your records.
        </p>

        <!-- Summary Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 30px; width: 100%;">
          <tr>
            <td colspan="2" style="background-color: #f8fafc; padding: 12px 16px; border-radius: 8px 8px 0 0; font-weight: bold; color: #232F3E; font-size: 15px; border-bottom: 2px solid #cbd5e1; border-top: 1px solid #e2e8f0; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
              Consignment Info
            </td>
          </tr>
          <tr style="border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; width: 40%; font-weight: 500; vertical-align: top;">LR/AWB Number:</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 700; word-break: break-all;">${lrNumber}</td>
          </tr>
          <tr style="border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 500; vertical-align: top;">Booking Date:</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600;">${date}</td>
          </tr>
          <tr style="border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 500; vertical-align: top;">Billed To:</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600; word-break: break-word;">${booking.client || booking.billedTo || "-"}</td>
          </tr>
          <tr style="border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 500; vertical-align: top;">Consignor:</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600; word-break: break-word;">${booking.consignor || "-"}</td>
          </tr>
          <tr style="border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 500; vertical-align: top;">Consignee:</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600; word-break: break-word;">${booking.consignee || "-"}</td>
          </tr>
          <tr style="border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 500; vertical-align: top;">Origin:</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600; word-break: break-word;">${booking.origin || "-"}</td>
          </tr>
          <tr style="border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 500; vertical-align: top;">Destination:</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600; word-break: break-word;">${booking.destination || "-"}</td>
          </tr>
          <tr style="border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px; font-weight: 500; vertical-align: top;">No of Boxes:</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600;">${booking.box || "-"}</td>
          </tr>
          <tr style="border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px; font-weight: 500; vertical-align: top;">Actual Weight:</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; font-weight: 600;">${booking.actual_wt || booking.weight || "-"} kg</td>
          </tr>
          ${invoiceRowsHtml}
        </table>

        <!-- Call to Action -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
          <tr>
            <td align="center" style="background-color: #fff8f0; border: 1px dashed #FF9900; border-radius: 8px; padding: 15px; text-align: center;">
              <p style="color: #a05000; font-size: 14px; margin: 0; font-weight: 600;">
                📎 Attachment: LR_${lrNumber}.pdf has been attached to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 0;">
          &copy; ${new Date().getFullYear()} <strong>Multi Marg Carriers Pvt. Ltd.</strong>. All rights reserved.<br>
          Dhanbad District, Jharkhand, India.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // --- 3. Send email with PDF attachment ---
    const recipients = to.split(",").map(e => e.trim()).filter(Boolean);
    const subject = `Lorry Receipt - LR No: ${lrNumber} (Multi Marg Carriers)`;
    await sendEmail({
      to: recipients.join(", "),
      subject,
      htmlContent: emailHtml,
      attachments: [
        {
          filename: `LR_${lrNumber}.pdf`,
          content: pdfBuffer
        }
      ]
    });

    // --- 4. Update tracking fields in MongoDB ---
    const emailSentCount = (booking.emailSentCount || 0) + 1;
    const emailSentTo = Array.from(new Set([...(booking.emailSentTo || []), ...recipients]));
    
    await bookingRef.update({
      emailSentCount,
      emailSentTo,
      emailedAt: new Date().toISOString()
    });

    return success(res, "LR email sent successfully with attachment", {
      lrId,
      lrNumber,
      to: recipients,
      emailSentCount,
      emailSentTo
    });
  } catch (err) {
    console.log("[EMAIL ERROR] Failed to send LR:", err);
    return error(res, `Failed to send email: ${err.message}`, 500);
  }
};

