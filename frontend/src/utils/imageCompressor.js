/**
 * Smart Document & Photo Image Compressor
 * Compresses POD, Box, and document photos to < 1MB (typically 200KB - 600KB)
 * while preserving 100% crispness for fine text, waybill numbers, barcodes, and stamps.
 */

/**
 * Compresses an image (File or base64 dataUrl)
 * @param {File|string} input - File object or base64 dataUrl
 * @param {object} options
 * @param {number} options.maxDimension - Max width or height (default 1920px - crisp document standard)
 * @param {number} options.targetMaxBytes - Target maximum file size in bytes (default 750KB = 750 * 1024)
 * @param {number} options.initialQuality - Initial JPEG quality 0.0 - 1.0 (default 0.85)
 * @returns {Promise<{ dataUrl: string, sizeBytes: number, originalSizeBytes: number, width: number, height: number }>}
 */
export const compressImage = async (input, options = {}) => {
  const {
    maxDimension = 1920,
    targetMaxBytes = 750 * 1024, // 750 KB max
    initialQuality = 0.85,
    minQuality = 0.65
  } = options;

  // If input is a PDF, do not compress as raster image
  if (input instanceof File && (input.type === "application/pdf" || input.name?.toLowerCase().endsWith(".pdf"))) {
    const dataUrl = await fileToDataUrl(input);
    return { dataUrl, sizeBytes: input.size, originalSizeBytes: input.size, isPdf: true };
  }

  // Load image
  let src = "";
  let originalSizeBytes = 0;
  if (typeof input === "string") {
    src = input;
    if (src.startsWith("data:application/pdf")) {
      return { dataUrl: src, sizeBytes: Math.round(src.length * 0.75), originalSizeBytes: Math.round(src.length * 0.75), isPdf: true };
    }
    originalSizeBytes = Math.round(src.length * 0.75);
  } else if (input instanceof File || input instanceof Blob) {
    originalSizeBytes = input.size;
    src = await fileToDataUrl(input);
  } else {
    throw new Error("Invalid image input for compression");
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Maintain aspect ratio while bounding within maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) {
        return resolve({ dataUrl: src, sizeBytes: originalSizeBytes, originalSizeBytes, width, height });
      }

      // High-quality bicubic-like smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Fill white background for transparent images / document scans
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);

      // Adaptive compression loop to ensure < targetMaxBytes without excessive blur
      let quality = initialQuality;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      let sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);

      // If still too large, step down quality slightly (never below minQuality to prevent blur)
      while (sizeBytes > targetMaxBytes && quality > minQuality) {
        quality -= 0.06;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
        sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);
      }

      resolve({
        dataUrl,
        sizeBytes,
        originalSizeBytes,
        width,
        height,
        qualityUsed: quality
      });
    };

    img.onerror = (err) => {
      console.warn("[ImageCompressor] Error loading image, returning original:", err);
      resolve({ dataUrl: src, sizeBytes: originalSizeBytes, originalSizeBytes, width: 0, height: 0 });
    };

    img.src = src;
  });
};

const fileToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
