/**
 * General Utility Helpers
 */

/**
 * Generate a unique LR (Lorry Receipt) number
 * Format: MMC-YYYYMMDD-XXXXX
 */
function generateLRNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(10000 + Math.random() * 90000);
  return `MMC-${dateStr}-${random}`;
}

/**
 * Generate a unique bill number
 * Format: BILL-YYYYMMDD-XXXXX
 */
function generateBillNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(10000 + Math.random() * 90000);
  return `BILL-${dateStr}-${random}`;
}

/**
 * Generate a unique trip number
 * Format: TRIP-YYYYMMDD-XXXXX
 */
function generateTripNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(10000 + Math.random() * 90000);
  return `TRIP-${dateStr}-${random}`;
}

/**
 * Format a date to YYYY-MM-DD
 * @param {Date|string} date
 */
function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/**
 * Format a date to DD/MM/YYYY
 * @param {Date|string} date
 */
function formatDateDisplay(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Calculate GST amounts
 * @param {number} amount - Base amount
 * @param {number} gstRate - GST rate percentage (default: 5)
 * @returns {{cgst: number, sgst: number, total: number}}
 */
function calculateGST(amount, gstRate = 5) {
  const totalGst = (amount * gstRate) / 100;
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  const total = amount + totalGst;
  return {
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Sanitize a string for use as a key or ID
 * @param {string} str
 */
function sanitizeKey(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Paginate an array
 * @param {Array} items
 * @param {number} page
 * @param {number} limit
 */
function paginateArray(items, page = 1, limit = 50) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  return {
    data: items.slice(startIndex, endIndex),
    total: items.length,
    page,
    limit,
    totalPages: Math.ceil(items.length / limit) || 1,
  };
}

/**
 * Validate Indian GST number format
 * @param {string} gst
 */
function isValidGST(gst) {
  if (!gst) return false;
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gst);
}

/**
 * Validate Indian mobile number
 * @param {string} mobile
 */
function isValidMobile(mobile) {
  if (!mobile) return false;
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(mobile.replace(/\D/g, ""));
}

module.exports = {
  generateLRNumber,
  generateBillNumber,
  generateTripNumber,
  formatDate,
  formatDateDisplay,
  calculateGST,
  sanitizeKey,
  paginateArray,
  isValidGST,
  isValidMobile,
};
