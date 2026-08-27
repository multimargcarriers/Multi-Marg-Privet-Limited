const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require("mongodb");
const redis = require("redis");

async function run() {
  console.log("[Reconcile] Starting AWB & Unbilled Reconciliation...");
  const rawUri = process.env.MONGODB_URI;
  if (!rawUri) {
    console.error("MONGODB_URI not found");
    process.exit(1);
  }
  const mongoUri = rawUri.replace(/^["']|["']$/g, "").trim();

  const client = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 10000
  });

  await client.connect();
  console.log("[Reconcile] Connected to MongoDB.");

  let dbName = "multimarg";
  try {
    const parsedUrl = new URL(mongoUri);
    if (parsedUrl.pathname && parsedUrl.pathname.length > 1) {
      dbName = parsedUrl.pathname.substring(1);
    }
  } catch(e) {}

  const db = client.db(dbName);

  // 1. Fetch and index all bills
  const bills = await db.collection("bills").find({}).toArray();
  console.log(`[Reconcile] Found ${bills.length} bills.`);

  const awbToBillMap = new Map();
  bills.forEach(bill => {
    const bNo = bill.billNo || bill.invoice || bill.id || "BILLED";
    if (bill.lrNo && bill.lrNo !== 'MULTIPLE') {
      const clean = String(bill.lrNo).trim().toLowerCase();
      if (clean) awbToBillMap.set(clean, bNo);
    }
    if (bill.items && Array.isArray(bill.items)) {
      bill.items.forEach(item => {
        const awb1 = item.awb ? String(item.awb).trim().toLowerCase() : "";
        const lr1 = item.lrNo ? String(item.lrNo).trim().toLowerCase() : "";
        if (awb1) awbToBillMap.set(awb1, bNo);
        if (lr1) awbToBillMap.set(lr1, bNo);
      });
    }
  });
  console.log(`[Reconcile] Distinct billed AWB numbers indexed from bills: ${awbToBillMap.size}`);

  // 2. Fetch and reconcile all bookings
  const bookings = await db.collection("bookings").find({}).toArray();
  console.log(`[Reconcile] Found ${bookings.length} bookings.`);

  let billedCount = 0;
  let unbilledCount = 0;
  let resetToBookedCount = 0;
  let bulkOps = [];

  for (const b of bookings) {
    const awbCandidates = [
      b.consignment,
      b.awb,
      b.lrNo,
      b.lrNumber,
      b.id,
      b._id ? b._id.toString() : ""
    ].filter(Boolean).map(s => String(s).trim().toLowerCase());

    let matchedBillNo = null;
    for (const cand of awbCandidates) {
      if (awbToBillMap.has(cand)) {
        matchedBillNo = awbToBillMap.get(cand);
        break;
      }
    }

    // Determine normalized packages
    const pkgCount = parseInt(
      b.box || 
      b.pkg || 
      b.boxes || 
      b.package_count || 
      b.packages || 
      b.pcs || 
      (b.dimensions && Array.isArray(b.dimensions) ? b.dimensions.reduce((acc, d) => acc + (Number(d.boxCount) || 0), 0) : 0) || 
      1, 
      10
    );

    // Determine normalized weight
    const chargeWeight = parseFloat(
      b.charge_wt || 
      b.chargeable_weight || 
      b.chargeWeight || 
      b.weight_chargeable || 
      b.weight || 
      b.actual_wt || 
      0
    );

    const actualWeight = parseFloat(
      b.actual_wt || 
      b.actualWeight || 
      b.weight || 
      0
    );

    const updateFields = {
      box: String(pkgCount),
      pkg: String(pkgCount),
      packages: pkgCount,
      package_count: pkgCount,
      charge_wt: String(chargeWeight),
      weight_chargeable: chargeWeight,
      actual_wt: String(actualWeight)
    };

    if (matchedBillNo) {
      updateFields.billed = true;
      updateFields.status = "Billed";
      updateFields.billNo = matchedBillNo;
      billedCount++;
    } else {
      updateFields.billed = false;
      updateFields.billNo = "";
      if (String(b.status || '').toLowerCase() === 'billed') {
        updateFields.status = b.transitStatus || "Booked";
        resetToBookedCount++;
      }
      unbilledCount++;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: b._id },
        update: { $set: updateFields }
      }
    });

    if (bulkOps.length >= 500) {
      await db.collection("bookings").bulkWrite(bulkOps);
      bulkOps = [];
    }
  }

  if (bulkOps.length > 0) {
    await db.collection("bookings").bulkWrite(bulkOps);
  }

  console.log("=========================================");
  console.log(`[Reconcile] Reconciliation Complete:`);
  console.log(`- Total Bookings: ${bookings.length}`);
  console.log(`- Accurately Billed AWBs: ${billedCount}`);
  console.log(`- Accurately Unbilled AWBs: ${unbilledCount}`);
  console.log(`- Reset from False 'Billed' to 'Booked': ${resetToBookedCount}`);
  console.log("=========================================");

  // Invalidate Redis Cache
  if (process.env.USE_REDIS === 'true' && process.env.REDIS_URL) {
    try {
      console.log("[Reconcile] Clearing Redis caches...");
      const redisClient = redis.createClient({ url: process.env.REDIS_URL });
      await redisClient.connect();
      await redisClient.del("bookings");
      await redisClient.del("unbilled");
      await redisClient.del("bills");
      await redisClient.del("analytics");
      await redisClient.del("outstanding");
      await redisClient.quit();
      console.log("[Reconcile] Redis caches cleared successfully.");
    } catch (e) {
      console.warn("[Reconcile] Redis flush warning:", e.message);
    }
  }

  await client.close();
  console.log("[Reconcile] Finished successfully.");
  process.exit(0);
}

run().catch(err => {
  console.error("[Reconcile] Fatal error:", err);
  process.exit(1);
});
