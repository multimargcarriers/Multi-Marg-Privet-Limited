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

