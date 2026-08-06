require("dotenv").config();
const { MongoClient } = require("mongodb");
const dns = require("dns");

try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
  console.warn("Failed to set DNS servers:", e.message);
}

async function setupIndexes() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  const client = new MongoClient(mongoUri, { family: 4 });
  await client.connect();

  let dbName = "multimarg";
  try {
    const parsedUrl = new URL(mongoUri);
    if (parsedUrl.pathname && parsedUrl.pathname.length > 1) {
       dbName = parsedUrl.pathname.substring(1);
    }
  } catch(e) { /* ignore url parse error */ }

  const db = client.db(dbName);
  console.log(`Connected to database: ${dbName}`);

  const safeIndex = async (col, spec, opts = {}) => {
    try {
      await col.createIndex(spec, { background: true, ...opts });
      console.log(`  ✓ ${JSON.stringify(spec)}`);
    } catch (e) {
      console.warn(`  ⚠ ${JSON.stringify(spec)} — ${e.message}`);
    }
  };

  // ─── Bookings ───────────────────────────────────────────
  console.log("\n📦 Bookings indexes...");
  const bookings = db.collection("bookings");
  await safeIndex(bookings, { date: -1 });
  await safeIndex(bookings, { createdAt: -1 });
  await safeIndex(bookings, { id: 1 });
  await safeIndex(bookings, { awb: 1 });
  await safeIndex(bookings, { consignment: 1 });
  await safeIndex(bookings, { client: 1 });
  await safeIndex(bookings, { status: 1 });
  await safeIndex(bookings, { lrNumber: 1 });

  // ─── Bills ──────────────────────────────────────────────
  console.log("\n📄 Bills indexes...");
  const bills = db.collection("bills");
  await safeIndex(bills, { createdAt: -1 });
  await safeIndex(bills, { id: 1 });
  await safeIndex(bills, { lrNo: 1 });
  await safeIndex(bills, { client: 1 });
  await safeIndex(bills, { status: 1 });
  await safeIndex(bills, { billNo: 1 });

  // ─── Trips ──────────────────────────────────────────────
  console.log("\n🚚 Trips indexes...");
  const trips = db.collection("trips");
  await safeIndex(trips, { date: -1 });
  await safeIndex(trips, { id: 1 });
  await safeIndex(trips, { createdAt: -1 });

  // ─── Tracking ───────────────────────────────────────────
  console.log("\n📍 Tracking indexes...");
  const tracking = db.collection("tracking");
  await safeIndex(tracking, { updatedAt: -1 });
  await safeIndex(tracking, { awb: 1 });

  // ─── Cash Entries ───────────────────────────────────────
  console.log("\n💰 Cash Entries indexes...");
  const cashEntries = db.collection("cashEntries");
  await safeIndex(cashEntries, { date: -1 });
  await safeIndex(cashEntries, { partyName: 1, partyType: 1 });

  // ─── Purchases ──────────────────────────────────────────
  console.log("\n🛒 Purchases indexes...");
  const purchases = db.collection("purchases");
  await safeIndex(purchases, { date: -1 });
  await safeIndex(purchases, { vendor: 1 });

  // ─── POD ────────────────────────────────────────────────
  console.log("\n📸 POD indexes...");
  const pod = db.collection("pod");
  await safeIndex(pod, { uploadedAt: -1 });
  await safeIndex(pod, { lrNo: 1 });
  await safeIndex(pod, { bookingId: 1 });

  // ─── Box ────────────────────────────────────────────────
  console.log("\n📦 Box indexes...");
  const box = db.collection("box");
  await safeIndex(box, { uploadedAt: -1 });
  await safeIndex(box, { lrNo: 1 });
  await safeIndex(box, { bookingId: 1 });

  // ─── Outstanding ────────────────────────────────────────
  console.log("\n📊 Outstanding indexes...");
  const outstanding = db.collection("outstanding");
  await safeIndex(outstanding, { date: -1 });
  await safeIndex(outstanding, { client: 1 });

  // ─── Vendor Outstanding ─────────────────────────────────
  console.log("\n📊 Vendor Outstanding indexes...");
  const vendorOutstanding = db.collection("vendorOutstanding");
  await safeIndex(vendorOutstanding, { date: -1 });
  await safeIndex(vendorOutstanding, { vendor: 1 });

  // ─── Trip MIS ───────────────────────────────────────────
  console.log("\n📋 Trip MIS indexes...");
  const tripMis = db.collection("trip_mis");
  await safeIndex(tripMis, { createdAt: -1 });
  await safeIndex(tripMis, { createdBy: 1 });

  // ─── Vendor MIS ─────────────────────────────────────────
  console.log("\n📋 Vendor MIS indexes...");
  const vendorMis = db.collection("vendor_mis");
  await safeIndex(vendorMis, { createdAt: -1 });
  await safeIndex(vendorMis, { createdBy: 1 });

  // ─── Clients ────────────────────────────────────────────
  console.log("\n👥 Clients indexes...");
  const clients = db.collection("clients");
  await safeIndex(clients, { name: 1 });

  // ─── Vendors ────────────────────────────────────────────
  console.log("\n🏭 Vendors indexes...");
  const vendors = db.collection("vendors");
  await safeIndex(vendors, { name: 1 });

  // ─── Rates ──────────────────────────────────────────────
  console.log("\n💲 Rates indexes...");
  const rates = db.collection("rates");
  await safeIndex(rates, { id: 1 });

  // ─── Quotes ─────────────────────────────────────────────
  console.log("\n💬 Quotes indexes...");
  const quotes = db.collection("quotes");
  await safeIndex(quotes, { createdAt: -1 });

  // ─── Trash (TTL cleanup) ────────────────────────────────
  console.log("\n🗑️ Trash indexes...");
  const trash = db.collection("trash");
  await safeIndex(trash, { expiresAt: 1 });
  await safeIndex(trash, { originalCollection: 1 });

  // ─── System Logs ────────────────────────────────────────
  console.log("\n📝 System Logs indexes...");
  const systemLogs = db.collection("systemLogs");
  await safeIndex(systemLogs, { timestamp: -1 });
  await safeIndex(systemLogs, { userId: 1 });

  console.log("\n✅ All indexes successfully applied!");
  await client.close();
}

setupIndexes().catch(console.error);
