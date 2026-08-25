/**
 * Database Configuration
 * Pure MongoDB setup with connection promise & auto-retry
 */

const { MongoClient } = require("mongodb");
const FirestoreToMongoAdapter = require("./dbAdapter");
const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

// Initialize MongoDB adapter wrapper
const adapter = new FirestoreToMongoAdapter(null);

let dbReadyResolve;
adapter.readyPromise = new Promise((res) => {
  dbReadyResolve = res;
});

async function initMongo() {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
    const rawUri = process.env.MONGODB_URI;
    if (!rawUri) {
      console.warn("[MongoDB] MONGODB_URI not found in env. Ensure it is set.");
      return;
    }
    const mongoUri = rawUri.replace(/^["']|["']$/g, "").trim();

    const client = new MongoClient(mongoUri, { 
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000 
    });
    await client.connect();
    
    let dbName = "multimarg";
    try {
      const parsedUrl = new URL(mongoUri);
      if (parsedUrl.pathname && parsedUrl.pathname.length > 1) {
         dbName = parsedUrl.pathname.substring(1);
      }
    } catch(e) { /* ignore url parse error */ }

    adapter.mongoDb = client.db(dbName);
    if (dbReadyResolve) {
      dbReadyResolve(adapter.mongoDb);
    }
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
