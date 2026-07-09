/**
 * Firebase Configuration
 * Supports both production (Firebase Admin) and development (Mock DB) modes
 * Uses environment variables from .env
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const path = require("path");
const fs = require("fs");
let seedBills = [];
let seedBookings = [];
let seedClients = [];
let seedPurchases = [];
let seedVendorOutstanding = [];
let seedVendors = [];
let seedTrips = [];
let seedCities = [];

try {
  const seedData = require("./seedData");
  seedBills = seedData.seedBills || [];
  seedPurchases = seedData.seedPurchases || [];
  seedVendorOutstanding = seedData.seedVendorOutstanding || [];
} catch(e) { console.log("No basic seed data found"); }

try {
  seedTrips = require("./seedTripsData") || [];
} catch(e) { console.log("No seed trips data found"); }

try {
  const seedMaster = require("./seedMaster");
  seedCities = seedMaster.seedCities || [];
  seedClients = seedMaster.seedClients || [];
  seedVendors = seedMaster.seedVendors || [];
  seedBookings = seedMaster.seedBookings || [];
} catch(e) { console.log("No master seed data found"); }

let db = null;
let auth = null;
let useMockDB = true;
let firebaseInitialized = false;

// ============================================================
// Mock Data State (used when Firebase is not configured)
// ============================================================
const localDbPath = path.join(__dirname, "local_db.json");

let mockData = {};

if (fs.existsSync(localDbPath)) {
  try {
    mockData = JSON.parse(fs.readFileSync(localDbPath, "utf-8"));
  } catch (err) {
    console.error("Error reading local_db.json, falling back to seed data:", err);
  }
}

// Fallback if empty or failed to load
if (!mockData.clients) {
  mockData = {
    clients: seedClients,
    vendors: seedVendors,
    bookings: seedBookings,
    branches: [
      {
        id: "b1",
        codeInitial: "MCPL",
        code: "004",
        branch: "JAMSHEDPUR",
        name: "AKASH DEBNATH",
        address: "H.NO 16, ROAD NO 3A, BIRSANAGAR, ZONE NO 4, JAMSHEDPUR- 831019",
        phno: "7209877637",
        email: "info@amishkainfotech.co.in",
        status: "Active",
        createdAt: new Date().toISOString(),
      },
      {
        id: "b2",
        codeInitial: "MCPL",
        code: "003",
        branch: "PANTNAGAR",
        name: "DHRUV KUMAR",
        address: "RUDRAPUR",
        phno: "9045015097",
        email: "info@multimargcarriers.co.in",
        status: "Active",
        createdAt: new Date().toISOString(),
      },
      {
        id: "b3",
        codeInitial: "MCPL",
        code: "002",
        branch: "PUNE",
        name: "DEEPAK BHARTI",
        address: "PUNE",
        phno: "9045015097",
        email: "info@sky4logistics.co.in",
        status: "Active",
        createdAt: new Date().toISOString(),
      },
      {
        id: "b4",
        codeInitial: "MCPL",
        code: "001",
        branch: "DELHI",
        name: "DHARMENDRA PURI",
        address: "DELHI",
        phno: "7503112217",
        email: "d.puri@multimargcarriers.co.in",
        status: "Active",
        createdAt: new Date().toISOString(),
      }
    ],
    cities: seedCities,
    rates: [
      {
        id: "r1",
        from: "Jamshedpur",
        to: "Mumbai",
        rate: 3500,
        per: "ton",
        type: "FTL",
        status: "Active",
      },
      {
        id: "r2",
        from: "Jamshedpur",
        to: "Delhi",
        rate: 3200,
        per: "ton",
        type: "FTL",
        status: "Active",
      },
      {
        id: "r3",
        from: "Mumbai",
        to: "Jamshedpur",
        rate: 3000,
        per: "ton",
        type: "FTL",
        status: "Active",
      },
    ],
    trips: seedTrips.length > 0 ? seedTrips : [],
    bills: seedBills,
    cashEntries: [
      {
        id: "ce1",
        amount: 9000.00,
        type: "out",
        date: "2026-01-10T00:00:00.000Z",
        remarks: "AMISHKA INFOTECH",
        vouchers: [],
        createdAt: new Date().toISOString()
      }
    ],
    podEntries: [],
    purchases: seedPurchases.length > 0 ? seedPurchases : [],
    vendorOutstanding: seedVendorOutstanding.length > 0 ? seedVendorOutstanding : [],
    boxEntries: [],
    voucherEntries: [],
    systemLogs: [],
  };
}

// Auto-save mechanism for mockData
let lastSavedStr = JSON.stringify(mockData);
setInterval(() => {
  const currentStr = JSON.stringify(mockData);
  if (currentStr !== lastSavedStr) {
    fs.writeFileSync(localDbPath, currentStr, "utf-8");
    lastSavedStr = currentStr;
  }
}, 2000);

// ============================================================
// Initialize Firebase Admin SDK
// ============================================================
function initFirebase() {
  const useFirebase = process.env.USE_FIREBASE === "true";

  if (!useFirebase) {
    console.log(
      "[Firebase] Mock mode enabled. Set USE_FIREBASE=true to use Firebase.",
    );
    return { db: null, auth: null, useMockDB: true };
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
        console.warn(
          "[Firebase] Service account not found at:",
          serviceAccountPath,
        );
        console.warn("[Firebase] Falling back to Mock DB mode.");
        return { db: null, auth: null, useMockDB: true };
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
    useMockDB = false;
    firebaseInitialized = true;

    console.log("[Firebase] Initialized successfully.");
    console.log(
      `[Firebase] Project: ${serviceAccount.project_id || "unknown"}`,
    );

    return { db, auth, useMockDB: false };
  } catch (error) {
    console.error("[Firebase] Initialization error:", error.message);
    console.warn("[Firebase] Falling back to Mock DB mode.");
    return { db: null, auth: null, useMockDB: true };
  }
}

// Initialize on module load
const initResult = initFirebase();

module.exports = {
  db: initResult.db,
  auth: initResult.auth,
  useMockDB: initResult.useMockDB,
  mockData,
  firebaseInitialized,
  initFirebase,
};
