const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { generateToken, authenticateToken } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");
const { createUploadMiddleware, handleMulterError } = require("../middleware/upload");
const { uploadFile } = require("../config/cloudinary");const { post_login_1, put_profile_2, get_default_assets, forgot_password, verify_otp, reset_password, get_me, post_logout, get_activity } = require('../controllers/authController');

router.post(
  "/login",
  [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required")],

  asyncHandler(post_login_1































  )
);

router.get(
  "/default-assets",
  authenticateToken,
  asyncHandler(get_default_assets)
);

router.get(
  "/me",
  authenticateToken,
  asyncHandler(get_me)
);

router.post(
  "/logout",
  authenticateToken,
  asyncHandler(post_logout)
);

router.get(
  "/activity",
  authenticateToken,
  asyncHandler(get_activity)
);

// Profile Update Route
router.put(
  "/profile",
  authenticateToken,
  createUploadMiddleware("avatars").fields([{ name: "photo", maxCount: 1 }, { name: "banner", maxCount: 1 }]),
  handleMulterError,
  asyncHandler(put_profile_2






































































  )
);


router.post('/forgot-password', [body('email').isEmail().withMessage('Valid email is required')], asyncHandler(forgot_password));
router.post('/verify-otp', asyncHandler(verify_otp));
router.post('/reset-password', asyncHandler(reset_password));

module.exports = router;
