const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { body, validationResult } = require("express-validator");
const { post_send_invoice_1 } = require('../controllers/emailController');
const { requirePermission } = require("../middleware/rbac");

router.use(requirePermission(["reports","billing","email_reports"]));

// Send invoice email
router.post(
  "/send-invoice",
  [
  body("to").isEmail().withMessage("Valid recipient email is required"),
  body("subject").notEmpty().withMessage("Subject is required"),
  body("body").notEmpty().withMessage("Body is required")],
  asyncHandler(post_send_invoice_1)
);

module.exports = router;
