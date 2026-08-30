require('dotenv').config();
const { db, initMongo } = require('../src/config/database');
const { delCache } = require('../src/config/redis');

async function cleanVendorMis() {
  await initMongo();
  console.log("Starting Vendor MIS database cleanup...");

  const collectionRef = db.collection('vendor_mis');
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log("The vendor_mis collection is already empty.");
    await delCache("vendor_mis");
    process.exit(0);
  }

  console.log(`Found ${snapshot.size} entries in vendor_mis. Deleting...`);

  let batch = db.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    count++;
    if (count % 500 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (count % 500 !== 0) {
    await batch.commit();
  }

  await delCache("vendor_mis");
  console.log(`Successfully deleted all ${count} entries from vendor_mis collection.`);
  process.exit(0);
}

cleanVendorMis().catch(err => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
