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
  const isPdf = typeof filePath === "string" && filePath.toLowerCase().includes(".pdf");
  let resourceType = options.resourceType || "auto";
  if (isPdf && resourceType === "auto") {
    resourceType = "raw";
  }

  try {
    const isDataOrRemote = typeof filePath === "string" && (filePath.startsWith("data:") || filePath.startsWith("http://") || filePath.startsWith("https://"));
    if (!isDataOrRemote && !fs.existsSync(filePath)) {
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

    // Keep local file on disk so local fallback URL remains valid if Cloudinary is unreachable or returning 404
    // Wait, the new plan requires us to delete it to avoid disk space bloat.
    if (!isDataOrRemote) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupErr) {
        console.warn(
          "[Cloudinary] Could not delete local file:",
          cleanupErr.message,
        );
      }
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
 * Upload a file buffer directly to Cloudinary using upload_stream
 * @param {Buffer} buffer - File buffer
 * @param {object} options - Upload options (folder, publicId, resourceType, originalName)
 * @returns {Promise<object>}
 */
async function uploadStream(buffer, options = {}) {
  if (!USE_CLOUDINARY) {
    return { success: false, message: "Cloudinary not enabled" };
  }

  const folder = options.folder || process.env.CLOUDINARY_UPLOAD_FOLDER || "multimargcarriers";
  
  const isPdf = options.originalName && options.originalName.toLowerCase().endsWith('.pdf');
  // PDFs must be uploaded as 'raw' so they retain their valid PDF binary format.
  // Uploading them as 'image' corrupts the PDF viewer in the browser.
  let resourceType = options.resourceType || "auto";
  if (isPdf && resourceType === "auto") {
    resourceType = "raw"; 
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: options.publicId,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        filename_override: options.originalName
      },
      (error, result) => {
        if (error) {
          console.error("[Cloudinary] Stream upload error:", error.message);
          return resolve({ success: false, message: error.message });
        }
        resolve({
          success: true,
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          resourceType: result.resource_type,
          bytes: result.bytes,
        });
      }
    );
    
    stream.end(buffer);
  });
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
    const isPdf = typeof base64Data === "string" && base64Data.startsWith("data:application/pdf");
    const result = await cloudinary.uploader.upload(base64Data, {
      folder,
      public_id: options.publicId,
      resource_type: isPdf ? "image" : "auto", // Ensure PDF is image so fl_attachment works
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
 * Extract public_id from a Cloudinary URL or return as-is if already public_id
 * @param {string} urlOrId
 * @returns {string|null}
 */
function extractPublicIdFromUrl(urlOrId) {
  if (!urlOrId || typeof urlOrId !== "string") return null;
  if (!urlOrId.includes("cloudinary.com/")) return urlOrId; // Already a publicId
  const match = urlOrId.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
  return match ? match[1] : null;
}

/**
 * Check if a URL is a default shared asset (avatar or banner)
 * @param {string} urlOrId
 * @returns {boolean}
 */
function isDefaultAsset(urlOrId) {
  if (!urlOrId || typeof urlOrId !== "string") return false;
  return urlOrId.includes("/default_avatars/") || urlOrId.includes("/default_banners/");
}

/**
 * Delete a file from Cloudinary (by URL or publicId)
 * Safely skips default shared avatars/banners
 * @param {string} urlOrId - Full URL or public ID of the file to delete
 * @param {string} [resourceType="image"] - 'image', 'raw', 'video'
 * @returns {Promise<object>}
 */
async function deleteFile(urlOrId, resourceType = "image") {
  if (!USE_CLOUDINARY || !urlOrId) {
    return { success: false, message: "Cloudinary not enabled or missing ID" };
  }

  // Do not delete default shared assets
  if (isDefaultAsset(urlOrId)) {
    console.log(`[Cloudinary] Skipping delete for shared default asset: ${urlOrId}`);
    return { success: true, skipped: true, message: "Default asset preserved" };
  }

  const publicId = extractPublicIdFromUrl(urlOrId);
  if (!publicId) {
    return { success: false, message: "Invalid Cloudinary ID" };
  }

  try {
    let result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    if (result.result !== "ok" && resourceType === "image") {
      // try 'raw' and 'video' if 'image' didn't work
      result = await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
      if (result.result !== "ok") {
        result = await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
      }
    }
    console.log(`[Cloudinary] Deleted asset ${publicId}: ${result.result}`);
    return { success: result.result === "ok", result, publicId };
  } catch (error) {
    console.error(`[Cloudinary] Delete error for ${publicId}:`, error.message);
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
  uploadStream,
  uploadBase64,
  deleteFile,
  extractPublicIdFromUrl,
  isDefaultAsset,
  getStatus,
  uploadCompanyStamp,
};
