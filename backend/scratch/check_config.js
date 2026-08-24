require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const { db, initMongo } = require("../src/config/database");

async function check() {
  await initMongo();
  if (db.mongoDb) {
    const config = await db.mongoDb.collection("system_settings").findOne({ type: "global_config" });
    console.log("Global Config:", JSON.stringify(config, null, 2));
  } else {
    console.log("No mongoDb connection");
  }
  process.exit(0);
}

check().catch(console.error);
