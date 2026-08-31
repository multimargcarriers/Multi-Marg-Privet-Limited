const express = require("express");
const router = express.Router();
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { generatePDF, checkChromiumAvailability } = require("../utils/pdfGenerator");
const { 
  get_lr_id_1, 
  get_lr_id_pdf_2, 
  get_bill_id_3, 
  get_manifest_id_4, 
  get_manifest_id_pdf_5, 
  get_trip_bill_trip_client_6 
} = require('../controllers/printController');
const { requirePermission } = require("../middleware/rbac");

// Check Chromium availability on first load
checkChromiumAvailability();

// Puppeteer Backend PDF Generation API Route
router.post(
  "/generate-pdf",
  asyncHandler(async (req, res) => {
    const { html, filename = "document.pdf", landscape = false } = req.body;
    if (!html) return error(res, "HTML content is required", 400);

    const pdfBuffer = await generatePDF(html, { landscape });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  })
);

router.use(requirePermission(["billing", "reports"]));

router.post(
  "/upload-pdf",
  asyncHandler(async (req, res) => {
    const fs = require("fs");
    const path = require("path");
    const { filename, pdfBase64 } = req.body;
    if (!filename || !pdfBase64) {
      return error(res, "Filename and PDF content are required", 400);
    }

    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9_\-\.]/g, "_");
    
    // Convert base64 to binary buffer
    let cleanBase64 = pdfBase64;
    if (pdfBase64.includes(";base64,")) {
      cleanBase64 = pdfBase64.split(";base64,")[1];
    }
    const buffer = Buffer.from(cleanBase64, "base64");

    const dirPath = path.join(__dirname, "../../uploads/downloaded_pdfs");
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(dirPath, safeFilename);
    fs.writeFileSync(filePath, buffer);

    // Invalidate bookings list cache so hasPdf flags reload instantly
    try {
      const { delCache } = require("../config/redis");
      await delCache("bookings");
    } catch (e) {
      console.error("[Upload PDF Cache Clear] Error clearing redis cache:", e.message);
    }

    return success(res, "PDF uploaded successfully", {
      filename: safeFilename,
      url: `/api/print/view-pdf/${safeFilename}`
    });
  })
);

router.get("/lr/:id", asyncHandler(get_lr_id_1));
router.get("/lr/:id/pdf", asyncHandler(get_lr_id_pdf_2));
router.get("/bill/:id", asyncHandler(get_bill_id_3));
router.get("/manifest/:id", asyncHandler(get_manifest_id_4));
router.get("/manifest/:id/pdf", asyncHandler(get_manifest_id_pdf_5));
router.get("/trip-bill/:trip/:client", asyncHandler(get_trip_bill_trip_client_6));

module.exports = router;
