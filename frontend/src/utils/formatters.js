/**
 * Converts text to ALL CAPS. 
 * Use for Cities, Company Names, Vehicle Numbers.
 */
export const formatAllCaps = (value) => {
  if (!value) return "";
  return value.toUpperCase();
};

/**
 * Converts text to Title Case (First Letter Capitalized for each word).
 * Use for Person Names (Contact person, Driver Name).
 */
export const formatTitleCase = (value) => {
  if (!value) return "";
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

/**
 * Strips all non-numeric characters and limits length to 10 digits.
 * Use for Phone Numbers.
 */
export const formatPhoneNumber = (value) => {
  if (!value) return "";
  // Strip non-digits
  const digitsOnly = value.replace(/\D/g, "");
  // Limit to 10 digits
  return digitsOnly.slice(0, 10);
};

/**
 * Formats date to DD-MM-YYYY format globally.
 */
export const formatDate = (dateValue) => {
  if (!dateValue) return "-";
  
  // Handle Firestore timestamps (seconds)
  if (typeof dateValue === 'object' && dateValue.seconds) {
    dateValue = dateValue.seconds * 1000;
  }

  // Handle strings
  if (typeof dateValue === 'string') {
    // Check if it's already a DD-MM-YYYY or DD/MM/YYYY format string
    const matchDDMMYYYY = /^(\d{2})[-/](\d{2})[-/](\d{4})/.exec(dateValue.split("T")[0]);
    if (matchDDMMYYYY) {
      return `${matchDDMMYYYY[1]}-${matchDDMMYYYY[2]}-${matchDDMMYYYY[3]}`;
    }
    
    // Check if it's YYYY-MM-DD
    const matchYYYYMMDD = /^(\d{4})[-/](\d{2})[-/](\d{2})/.exec(dateValue.split("T")[0]);
    if (matchYYYYMMDD) {
      return `${matchYYYYMMDD[3]}-${matchYYYYMMDD[2]}-${matchYYYYMMDD[1]}`;
    }
  }
  
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return "-";
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Computes due date (default 30 days after invoice/bill date) if not explicitly set.
 */
export const calculateDueDate = (dateValue, explicitDueDate, daysOffset = 30) => {
  if (explicitDueDate && explicitDueDate !== "-" && explicitDueDate !== "Invalid Date") {
    const formattedExplicit = formatDate(explicitDueDate);
    if (formattedExplicit !== "-") return formattedExplicit;
  }
  if (!dateValue || dateValue === "-") return "-";

  try {
    let dateObj;
    if (typeof dateValue === "string") {
      const matchDDMMYYYY = /^(\d{2})[-/](\d{2})[-/](\d{4})/.exec(dateValue.split("T")[0]);
      if (matchDDMMYYYY) {
        dateObj = new Date(`${matchDDMMYYYY[3]}-${matchDDMMYYYY[2]}-${matchDDMMYYYY[1]}`);
      } else {
        dateObj = new Date(dateValue);
      }
    } else if (typeof dateValue === "object" && dateValue.seconds) {
      dateObj = new Date(dateValue.seconds * 1000);
    } else {
      dateObj = new Date(dateValue);
    }

    if (isNaN(dateObj.getTime())) return "-";
    const dueTime = new Date(dateObj.getTime() + daysOffset * 24 * 60 * 60 * 1000);
    return formatDate(dueTime);
  } catch (_e) {
    return "-";
  }
};

export const formatAmount = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  const num = parseFloat(value);
  if (isNaN(num)) return "-";
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Cloudinary PDF URL handler.
 * Previously this forced fl_attachment, but Cloudinary Free Tier now blocks
 * fl_attachment on PDFs (returns 401 Unauthorized). We must return the raw URL.
 */
export const getSafeCloudinaryPdfUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  
  // Strip fl_attachment if it somehow got saved in the database
  if (url.includes('fl_attachment/')) {
    return url.replace('fl_attachment/', '');
  }
  
  return url;
};

