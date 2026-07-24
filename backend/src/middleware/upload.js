/**
 * File Upload Middleware
 * Handles multipart file uploads with multer
 * Supports images, videos, PDFs, and other documents
 */

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_FILE_SIZE = (process.env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024; // Convert MB to bytes

// Allowed file types
const ALLOWED_TYPES = {
  images: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ],
  documents: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  spreadsheets: [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  videos: ["video/mp4", "video/mpeg", "video/webm", "video/quicktime"],
};

const ALLOWED_MIMES = Object.values(ALLOWED_TYPES).flat();

/**
 * Create multer storage engine
 * @param {string} subDir - Subdirectory under uploads (e.g., 'pod', 'box')
 */
function createStorage(subDir = "general") {
  const destDir = path.join(UPLOAD_DIR, subDir);

  // Ensure directory exists
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
      cb(null, uniqueName);
    },
  });
}

/**
 * File filter to validate file types
 */
function fileFilter(req, file, cb) {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type ${file.mimetype} is not allowed. Allowed types: images, PDFs, documents, spreadsheets, videos`,
      ),
      false,
    );
  }
}

/**
 * Create a multer upload middleware for a specific subdirectory
 * @param {string} subDir - Subdirectory name
 * @param {object} options - Additional options
 * @param {number} options.maxFileSize - Max file size in bytes (default: from env)
 * @param {number} options.maxFiles - Max number of files (default: 1)
 * @param {boolean} options.strictTypes - Whether to enforce allowed types (default: true)
 */
function createUploadMiddleware(subDir = "general", options = {}) {
  const maxFileSize = options.maxFileSize || MAX_FILE_SIZE;
  const maxFiles = options.maxFiles || 1;
  const useFilter = options.strictTypes !== false;

  return multer({
    storage: createStorage(subDir),
    limits: {
      fileSize: maxFileSize,
      files: maxFiles,
    },
    fileFilter: useFilter ? fileFilter : undefined,
  });
}

/**
 * Middleware to handle multer errors gracefully
 */
function handleMulterError(err, req, res, next) {
  console.error("=== MULTER ERROR ===", err);
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 50}MB.`,
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files uploaded.",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err.message && err.message.includes("not allowed")) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next(err);
}

module.exports = {
  createUploadMiddleware,
  handleMulterError,
  ALLOWED_TYPES,
};
