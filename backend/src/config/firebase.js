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
const { MongoClient } = require("mongodb");
const FirestoreToMongoAdapter = require("./dbAdapter");

let firebaseDb = null;
let auth = null;
let firebaseInitialized = false;

// ============================================================
// Initialize Firebase Admin SDK
// ============================================================
function initFirebase() {
  const useFirebase = process.env.USE_FIREBASE === "true";

  if (!useFirebase) {
    console.log("[Firebase] USE_FIREBASE is false. Firebase disabled.");
    return { firebaseDb: null, auth: null };
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

    firebaseDb = getFirestore(app);
    auth = getAuth(app);
    firebaseInitialized = true;

    console.log("[Firebase] Initialized successfully.");
    console.log(`[Firebase] Project: ${serviceAccount.project_id || "unknown"}`);

    return { firebaseDb, auth };
  } catch (error) {
    console.error("[Firebase] Initialization error:", error.message);
    throw error;
  }
}

// Initialize on module load
const initResult = initFirebase();

// Initialize MongoDB adapter
const adapter = new FirestoreToMongoAdapter(null, initResult.firebaseDb);

async function initMongo() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.warn("[MongoDB] MONGODB_URI not found in env. Running in Firebase-only fallback mode.");
      return;
    }
    const client = new MongoClient(mongoUri, { family: 4 });
    await client.connect();
    
    let dbName = "multimarg";
    try {
      const parsedUrl = new URL(mongoUri);
      if (parsedUrl.pathname && parsedUrl.pathname.length > 1) {
         dbName = parsedUrl.pathname.substring(1);
      }
    } catch(e) { /* ignore url parse error */ }

    adapter.mongoDb = client.db(dbName);
    console.log(`[MongoDB] Connected successfully to database: ${dbName}`);
  } catch (err) {
    console.error("[MongoDB] Connection error:", err.message);
  }
}

// Start connection process in background
initMongo();

module.exports = {
  db: adapter,
  auth: initResult.auth,
  firebaseInitialized,
  initFirebase,
};
