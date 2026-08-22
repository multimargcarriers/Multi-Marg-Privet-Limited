const crypto = require("crypto");

// Derivation secret from env or fallback with strong salt
const ENCRYPTION_SECRET = process.env.MAIL_SECRET || process.env.JWT_SECRET || "multimarg-enterprise-mail-secret-key-2026";
const ALGORITHM = "aes-256-cbc";

// 32-byte key derived via SHA-256
const key = crypto.createHash("sha256").update(String(ENCRYPTION_SECRET)).digest();

/**
 * Encrypt a plaintext string using AES-256-CBC
 * @param {string} text 
 * @returns {string} iv:encryptedHex
 */
const encrypt = (text) => {
  if (!text) return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(String(text), "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

/**
 * Decrypt an encrypted string using AES-256-CBC
 * @param {string} encryptedText iv:encryptedHex
 * @returns {string} Decrypted plaintext
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 2) return "";
    const iv = Buffer.from(parts[0], "hex");
    const encryptedData = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[MailCrypto] Decryption error:", err.message);
    return "";
  }
};

module.exports = {
  encrypt,
  decrypt
};
