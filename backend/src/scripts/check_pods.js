const path = require("path");
require("dns").setDefaultResultOrder("ipv4first");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const { MongoClient } = require("mongodb");

async function check() {
  const uri = process.env.MONGODB_URI.replace(/^["']|["']$/g, "").trim();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("multimarg");
  
  const podsCount = await db.collection("pod").countDocuments();
  const bookingsWithPod = await db.collection("bookings").countDocuments({ podUploaded: true });
  const totalBookings = await db.collection("bookings").countDocuments();

  console.log("==========================================");
  console.log(`Total PODs in 'pod' collection: ${podsCount}`);
  console.log(`Bookings with podUploaded=true:   ${bookingsWithPod}`);
  console.log(`Total Bookings in DB:             ${totalBookings}`);
  console.log("==========================================");

  await client.close();
}

check().catch(console.error);
