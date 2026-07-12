/**
 * Firebase Configuration
 * Production (Firebase Admin) mode only.
 * Uses environment variables from .env
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const path = require("path");
const fs = require("fs");

let db = null;
let auth = null;
let firebaseInitialized = false;

// ============================================================
// Initialize Firebase Admin SDK
// ============================================================
function initFirebase() {
  const useFirebase = process.env.USE_FIREBASE === "true";

  if (!useFirebase) {
    throw new Error("[Firebase] USE_FIREBASE is not set to true. Real database is required.");
  }

  try {
    // Try loading service account from file path
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    let serviceAccount;

    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      serviceAccount = require(path.resolve(serviceAccountPath));
    } else {
      // Try loading from environment variable (JSON string)
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (serviceAccountJson) {
        serviceAccount = JSON.parse(serviceAccountJson);
      } else {
        throw new Error("[Firebase] Service account not found.");
      }
    }

    const databaseURL =
      process.env.FIREBASE_DATABASE_URL ||
      `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`;

    const app = initializeApp({
      credential: cert(serviceAccount),
      databaseURL,
    });

    db = getFirestore(app);
    auth = getAuth(app);
    firebaseInitialized = true;

    console.log("[Firebase] Initialized successfully.");
    console.log(`[Firebase] Project: ${serviceAccount.project_id || "unknown"}`);

    return { db, auth };
  } catch (error) {
    console.error("[Firebase] Initialization error:", error.message);
    throw error;
  }
}

// Initialize on module load
const initResult = initFirebase();

module.exports = {
  db: initResult.db,
  auth: initResult.auth,
  firebaseInitialized,
  initFirebase,
};
