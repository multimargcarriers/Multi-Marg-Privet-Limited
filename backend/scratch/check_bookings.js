require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const { db, initMongo } = require("../src/config/database");

async function check() {
  await initMongo();
  if (db.mongoDb) {
    const awbs = ["204018", "204017", "203991"];
    for (const awb of awbs) {
      const booking = await db.mongoDb.collection("bookings").findOne({
        $or: [
          { consignment: awb },
          { awb: awb },
          { lrNo: awb },
          { lrNumber: awb }
        ]
      });
      console.log(`Booking ${awb}:`, JSON.stringify(booking, null, 2));
    }
  } else {
    console.log("No mongoDb connection");
  }
  process.exit(0);
}

check().catch(console.error);
