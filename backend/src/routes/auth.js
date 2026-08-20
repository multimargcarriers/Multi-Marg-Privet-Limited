const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../middleware/errorHandler");
const { authenticateToken } = require("../middleware/auth");
const { body } = require("express-validator");
const { createUploadMiddleware, handleMulterError } = require("../middleware/upload");
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
  get_activity,
  get_failed_google_logins,
  delete_failed_google_login,
  post_force_logout
} = require('../controllers/authController');

const profileUpload = createUploadMiddleware("avatars", {
  maxFileSize: 10 * 1024 * 1024,
  maxFiles: 2,
  strictTypes: true,
}).fields([
  { name: "photo", maxCount: 1 },
  { name: "banner", maxCount: 1 },
]);

router.post(
  "/login",
  [
    body("email").notEmpty().withMessage("Login ID is required"),
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
  (req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (contentType.toLowerCase().includes("multipart/form-data")) {
      return profileUpload(req, res, (err) => {
        if (err) return handleMulterError(err, req, res, next);
        next();
      });
    }
    next();
  },
  asyncHandler(put_profile_2)
);

router.post('/forgot-password', [body('email').notEmpty().withMessage('Login ID is required')], asyncHandler(forgot_password));
router.post('/verify-otp', asyncHandler(verify_otp));
router.post('/reset-password', asyncHandler(reset_password));

router.get(
  "/failed-google-logins",
  authenticateToken,
  asyncHandler(get_failed_google_logins)
);

router.delete(
  "/failed-google-logins/:id",
  authenticateToken,
  asyncHandler(delete_failed_google_login)
);

router.post(
  "/force-logout/:id",
  authenticateToken,
  asyncHandler(post_force_logout)
);

module.exports = router;
