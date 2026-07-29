const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { generatePDF } = require("../utils/pdfGenerator");

// Generate LR PDF (returns HTML for now, can be converted to PDF client-side)
const { get_lr_id_1, get_lr_id_pdf_2, get_bill_id_3, get_manifest_id_4, get_manifest_id_pdf_5, get_trip_bill_trip_client_6 } = require('../controllers/printController');
const { requirePermission } = require("../middleware/rbac");

router.use(requirePermission(["billing","reports"]));

router.get(
  "/lr/:id",
  asyncHandler(get_lr_id_1





































































  )
);

// Download LR PDF
router.get(
  "/lr/:id/pdf",
  asyncHandler(get_lr_id_pdf_2


















  )
);

// Generate Bill PDF (returns HTML)
router.get(
  "/bill/:id",
  asyncHandler(get_bill_id_3

























































  )
);

// Generate Trip Manifest PDF
router.get(
  "/manifest/:id",
  asyncHandler(get_manifest_id_4



















































  )
);

// Download Trip Manifest PDF
router.get(
  "/manifest/:id/pdf",
  asyncHandler(get_manifest_id_pdf_5


















  )
);

// Generate Trip Bill PDF
router.get(
  "/trip-bill/:trip/:client",
  asyncHandler(get_trip_bill_trip_client_6




































  )
);

// Helper function
function numberToWords(num) {
  if (num === 0) return "Zero";
  const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen"];

  const tens = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety"];

  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100)
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000)
    return (
      ones[Math.floor(n / 100)] +
      " Hundred" + (
      n % 100 ? " " + convert(n % 100) : ""));

    if (n < 100000)
    return (
      convert(Math.floor(n / 1000)) +
      " Thousand" + (
      n % 1000 ? " " + convert(n % 1000) : ""));

    if (n < 10000000)
    return (
      convert(Math.floor(n / 100000)) +
      " Lakh" + (
      n % 100000 ? " " + convert(n % 100000) : ""));

    return (
      convert(Math.floor(n / 10000000)) +
      " Crore" + (
      n % 10000000 ? " " + convert(n % 10000000) : ""));

  };
  return "Rupees " + convert(Math.round(num)) + " Only";
}

module.exports = router;
