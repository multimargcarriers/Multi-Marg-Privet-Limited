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

  console.log("Setting up Bookings indexes...");
  const bookings = db.collection("bookings");
  await bookings.createIndex({ lr_number: 1 }, { unique: true, background: true });
  await bookings.createIndex({ client_id: 1, created_at: -1 }, { background: true });
  await bookings.createIndex({ status: 1 }, { background: true });
  await bookings.createIndex({ created_at: -1 }, { background: true });

  console.log("Setting up POD indexes...");
  const pod = db.collection("pod_entries");
  await pod.createIndex({ booking_id: 1 }, { unique: true, background: true });
  await pod.createIndex({ status: 1 }, { background: true });
  await pod.createIndex({ created_at: -1 }, { background: true });

  console.log("Setting up Trips indexes...");
  const trips = db.collection("trips");
  await trips.createIndex({ trip_id: 1 }, { unique: true, background: true });
  await trips.createIndex({ status: 1 }, { background: true });
  await trips.createIndex({ date: -1 }, { background: true });

  console.log("Setting up Box Entries indexes...");
  const box = db.collection("box_entries");
  await box.createIndex({ lr_number: 1 }, { background: true });
  await box.createIndex({ status: 1 }, { background: true });

  console.log("All indexes successfully applied!");
  await client.close();
}

setupIndexes().catch(console.error);
