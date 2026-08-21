const express = require("express");
const router = express.Router();
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { body } = require("express-validator");
const { getRoot_1, get_client_client_2, postRoot_3, delete_id_4, put_id_5, recalculateAll } = require('../controllers/outstandingController');

const { requirePermission } = require("../middleware/rbac");
router.use(requirePermission(["accounts","outstanding"]));

// Global recalculation route (MUST come before /:id)
router.post("/recalculate-all", asyncHandler(recalculateAll));

// Get all outstanding entries
router.get("/", asyncHandler(getRoot_1));

// Get outstanding by client
router.get("/client/:client", asyncHandler(get_client_client_2));

// Create outstanding entry
router.post(
  "/",
  [
    body("client").notEmpty().withMessage("Client name is required"),
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("particulars").notEmpty().withMessage("Particulars is required")
  ],
  asyncHandler(postRoot_3)
);

// Delete outstanding entry
router.delete("/:id", asyncHandler(delete_id_4));

// Update outstanding entry
router.put("/:id", asyncHandler(put_id_5));

module.exports = router;
