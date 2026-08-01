const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../middleware/errorHandler");
const { authenticateToken } = require("../middleware/auth");
const { body } = require("express-validator");
const { 
  post_login_1, 
  post_google_login, 
  put_profile_2, 
  get_default_assets, 
  forgot_password, 
  verify_otp, 
  reset_password, 
  get_me, 
  post_logout, 
  get_activity 
} = require('../controllers/authController');

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required")
  ],
  asyncHandler(post_login_1)
);

router.post(
  "/google-login",
  asyncHandler(post_google_login)
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

router.put(
  "/profile",
  authenticateToken,
  asyncHandler(put_profile_2)
);

router.post('/forgot-password', [body('email').isEmail().withMessage('Valid email is required')], asyncHandler(forgot_password));
router.post('/verify-otp', asyncHandler(verify_otp));
router.post('/reset-password', asyncHandler(reset_password));

module.exports = router;
