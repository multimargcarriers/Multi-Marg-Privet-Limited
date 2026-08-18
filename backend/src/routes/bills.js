const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, param, validationResult } = require("express-validator");
const { generatePDF } = require("../utils/pdfGenerator");
const { uploadBase64 } = require("../config/cloudinary");
const { getRoot_1, get_id_2, get_id_pdf_3, post_id_upload_pdf_4, post_generate_5, post_misc_6, put_id_7, delete_id_8, post_import_9, delete_clear_all_10 } = require('../controllers/billsController');

const { requirePermission } = require("../middleware/rbac");
router.use(requirePermission(["billing","all_bills","generate_bills","misc_bill","update_bill"]));


const CACHE_KEY = "bills";


// Get all bills
router.get(
  "/",
  asyncHandler(getRoot_1














  )
);

// Get single bill
router.get(
  "/:id",
  asyncHandler(get_id_2







  )
);

// Download Bill PDF
router.get(
  "/:id/pdf",
  asyncHandler(get_id_pdf_3




























































  )
);

// Upload Bill PDF to Cloudinary
router.post(
  "/:id/upload-pdf",
  asyncHandler(post_id_upload_pdf_4

































  )
);

// Generate bills from bookings
router.post(
  "/generate",
  [
  body("bookingIds").
  isArray({ min: 1 }).
  withMessage("At least one booking ID is required")],

  asyncHandler(post_generate_5
























































  )
);

// Create misc bill
router.post(
  "/misc",
  [
  body("client").notEmpty().withMessage("Client name is required"),
  body("amount").isNumeric().withMessage("Amount must be a number")],

  asyncHandler(post_misc_6

































  )
);

// Import bills from CSV
router.post(
  "/import",
  [
    body("items").isArray({ min: 1 }).withMessage("Valid items array is required")
  ],
  asyncHandler(post_import_9)
);

// Update bill
router.put(
  "/:id",
  asyncHandler(put_id_7






  )
);

// Clear all bills
router.delete(
  "/clear/all",
  asyncHandler(delete_clear_all_10)
);

// Delete bill
router.delete(
  "/:id",
  asyncHandler(delete_id_8






  )
);

// Helper function
function numberToWords(num) {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  };
  return "Rupees " + convert(Math.round(num)) + " Only";
}

module.exports = router;
