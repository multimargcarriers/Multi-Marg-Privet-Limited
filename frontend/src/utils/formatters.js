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
