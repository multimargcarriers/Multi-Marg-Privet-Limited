const { db, initMongo } = require('./src/config/database');
require('dotenv').config();

const getClientShortForm = (clientName) => {
  if (!clientName) return "VEH";
  const clean = clientName.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length >= 4) {
    return clean.substring(0, 4);
  }
  return clean.padEnd(4, 'X');
};

async function run() {
  await initMongo();
  
  console.log("Fetching all trip_mis entries...");
  const snapshot = await db.collection("trip_mis").get();
  const trips = [];
  snapshot.forEach(doc => {
    trips.push({ id: doc.id, ...doc.data() });
  });
  
  console.log(`Loaded ${trips.length} entries. Sorting chronologically...`);
  trips.sort((a, b) => {
    const dateA = new Date(a.createdAt || a.date || 0);
    const dateB = new Date(b.createdAt || b.date || 0);
    return dateA - dateB;
  });
  
  // Group by client short form
  const clientGroups = {};
  trips.forEach(trip => {
    const prefix = getClientShortForm(trip.clientName);
    if (!clientGroups[prefix]) {
      clientGroups[prefix] = [];
    }
    clientGroups[prefix].push(trip);
  });
  
  console.log("Generating new sequential trip numbers...");
  const updatePromises = [];
  
  for (const prefix in clientGroups) {
    const list = clientGroups[prefix];
    console.log(`Client ${prefix}: ${list.length} trips`);
    let seq = 0;
    for (const trip of list) {
      seq++;
      const newTripNo = `${prefix} ${String(seq).padStart(4, '0')}`;
      if (trip.tripNo !== newTripNo) {
        console.log(`Updating ${trip.tripNo || 'empty'} -> ${newTripNo} for doc id ${trip.id}`);
        updatePromises.push(
          db.collection("trip_mis").doc(trip.id).update({ tripNo: newTripNo })
        );
      }
    }
  }
  
  if (updatePromises.length > 0) {
    await Promise.all(updatePromises);
    console.log(`Successfully updated ${updatePromises.length} trip_mis entries.`);
  } else {
    console.log("All entries are already formatted correctly.");
  }
  
  // Clear redis cache if redis helper is loaded
  try {
    const { delCache } = require("./src/config/redis");
    await delCache("trip_mis");
    console.log("Redis cache cleared.");
  } catch (e) {
    // ignore
  }
  
  console.log("Migration complete!");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
