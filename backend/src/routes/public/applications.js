const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../../middleware/errorHandler");
const { submitApplication } = require("../../controllers/applicationsController");
const { createUploadMiddleware, handleMulterError } = require("../../middleware/upload");

// Create upload middleware specifically for resumes (max 10MB)
// Restrict to documents and PDFs ideally, but upload middleware allows PDF by default in its ALLOWED_TYPES.documents
const uploadResume = createUploadMiddleware("resumes", {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  useMemory: true, // Bypass disk storage in production
});

// Public route to submit job application
router.post(
  "/",
  uploadResume.single("resume"), // Expect a field named 'resume'
  handleMulterError,
  asyncHandler(submitApplication)
);

// Public route to download a resume securely from MongoDB base64 storage
// Using public namespace so admins can click 'download' in a new tab without passing JWTs
router.get(
  "/resume/:id",
  asyncHandler(require("../../controllers/applicationsController").downloadResume)
);

module.exports = router;
