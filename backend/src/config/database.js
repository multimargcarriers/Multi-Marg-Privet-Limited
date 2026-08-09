/**
 * Database Configuration
 * Pure MongoDB setup
 */

const { MongoClient } = require("mongodb");
const FirestoreToMongoAdapter = require("./dbAdapter");
const dns = require("dns");

// Attempt to prevent ECONNREFUSED on some strict IPv6 setups for MongoDB Atlas
try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
  console.warn("[MongoDB DNS] Failed to set DNS servers:", e.message);
}

// Initialize MongoDB adapter wrapper
const adapter = new FirestoreToMongoAdapter(null);

async function initMongo() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.warn("[MongoDB] MONGODB_URI not found in env. Ensure it is set.");
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
    throw err;
  }
}

module.exports = {
  db: adapter,
  initMongo,
};
