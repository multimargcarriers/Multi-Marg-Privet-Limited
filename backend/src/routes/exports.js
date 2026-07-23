const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");

// Helper to convert array to CSV
const { get_csv_outstanding_client_1, get_full_data_client_2, get_bookings_3, get_bills_4, get_tripsheet_5, get_cashsheet_6, get_gst_7, get_unbilled_8 } = require('../controllers/exportsController');function toCSV(headers, rows) {
  const headerLine = headers.join(",");
  const dataLines = rows.map((row) =>
  headers.
  map((h) => {
    const val = row[h] !== undefined ? String(row[h]) : "";
    return val.includes(",") ? `"${val}"` : val;
  }).
  join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

// Export outstanding by client
router.get(
  "/csv/outstanding/:client",
  asyncHandler(get_csv_outstanding_client_1


















  )
);

// Export full data
router.get(
  "/full-data/:client",
  asyncHandler(get_full_data_client_2






























  )
);

// Export bookings
router.get(
  "/bookings",
  asyncHandler(get_bookings_3























  )
);

// Export bills
router.get(
  "/bills",
  asyncHandler(get_bills_4





















  )
);

// Export tripsheet
router.get(
  "/tripsheet",
  asyncHandler(get_tripsheet_5



















  )
);

// Export cashsheet
router.get(
  "/cashsheet",
  asyncHandler(get_cashsheet_6







  )
);

// Export GST report
router.get(
  "/gst",
  asyncHandler(get_gst_7



















  )
);

// Export unbilled
router.get(
  "/unbilled",
  asyncHandler(get_unbilled_8























  )
);

module.exports = router;
