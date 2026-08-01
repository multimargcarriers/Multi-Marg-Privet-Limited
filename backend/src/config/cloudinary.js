/**
 * Cloudinary Configuration
 * Handles image, video, PDF, and other file uploads to Cloudinary
 */

const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

const USE_CLOUDINARY = process.env.USE_CLOUDINARY === "true";

/**
 * Initialize Cloudinary with environment config
 */
function initCloudinary() {
  if (!USE_CLOUDINARY) {
    console.log(
      "[Cloudinary] Disabled. Set USE_CLOUDINARY=true to enable cloud storage.",
    );
    return false;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn(
      "[Cloudinary] Missing configuration. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET",
    );
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  console.log("[Cloudinary] Initialized successfully");
  return true;
}

/**
 * Upload a file to Cloudinary
 * @param {string} filePath - Local path to the file
 * @param {object} options - Upload options
 * @param {string} options.folder - Folder in Cloudinary (default: from env)
 * @param {string} options.publicId - Optional public ID
 * @param {string} options.resourceType - 'auto' (default), 'image', 'video', 'raw'
 * @returns {Promise<object>} Cloudinary upload result
 */
async function uploadFile(filePath, options = {}) {
  if (!USE_CLOUDINARY) {
    return {
      success: false,
      message: "Cloudinary not enabled",
      localPath: filePath,
    };
  }

  const folder =
    options.folder ||
    process.env.CLOUDINARY_UPLOAD_FOLDER ||
    "multimargcarriers";
  const resourceType = options.resourceType || "auto";

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      public_id: options.publicId,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });

    // Clean up local file after successful upload
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupErr) {
      console.warn(
        "[Cloudinary] Could not delete local file:",
        cleanupErr.message,
      );
    }

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      duration: result.duration,
      originalFilename: result.original_filename,
    };
  } catch (error) {
    console.error("[Cloudinary] Upload error:", error.message);
    return { success: false, message: error.message, localPath: filePath };
  }
}

/**
 * Upload the official company stamp to a fixed folder in Cloudinary
 * @param {string} filePath - Local path to the stamp image
 * @returns {Promise<object>} Cloudinary upload result
 */
async function uploadCompanyStamp(filePath) {
  const options = { folder: "stamps", publicId: "official_stamp" };
  return await uploadFile(filePath, options);
}

/**
 * Upload a file buffer directly to Cloudinary (for base64/memory uploads)
 * @param {string} base64Data - Base64 encoded file data
 * @param {object} options - Upload options
 * @returns {Promise<object>}
 */
async function uploadBase64(base64Data, options = {}) {
  if (!USE_CLOUDINARY) {
    return { success: false, message: "Cloudinary not enabled" };
  }

  const folder =
    options.folder ||
    process.env.CLOUDINARY_UPLOAD_FOLDER ||
    "multimargcarriers";

  try {
    const result = await cloudinary.uploader.upload(base64Data, {
      folder,
      public_id: options.publicId,
      resource_type: "auto",
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error("[Cloudinary] Base64 upload error:", error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - The public ID of the file to delete
 * @returns {Promise<object>}
 */
async function deleteFile(publicId) {
  if (!USE_CLOUDINARY) {
    return { success: false, message: "Cloudinary not enabled" };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return { success: result.result === "ok", result };
  } catch (error) {
    console.error("[Cloudinary] Delete error:", error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Get Cloudinary connection status
 */
function getStatus() {
  return {
    enabled: USE_CLOUDINARY,
    configured: !!(
      process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY
    ),
  };
}

module.exports = {
  initCloudinary,
  uploadFile,
  uploadBase64,
  deleteFile,
  getStatus,
  uploadCompanyStamp,
};
