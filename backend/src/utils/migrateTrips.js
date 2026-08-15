const { db } = require("../config/database");
const { delCache } = require("../config/redis");

async function migrateTrips() {
  console.log("🚛 [Migration] Starting Trip MIS and Vendor MIS trip number migration...");
  try {
    // 1. Migrate trip_mis (Vehicle Trip MIS)
    const tripMisSnapshot = await db.collection("trip_mis").get();
    const tripMisDocs = [];
    tripMisSnapshot.forEach(doc => {
      tripMisDocs.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort in-memory by date/createdAt to preserve sequence order
    tripMisDocs.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || 0);
      const dateB = new Date(b.createdAt || b.date || 0);
      return dateA - dateB;
    });

    let tripMisCount = 0;
    const tripMisPromises = [];
    
    for (const doc of tripMisDocs) {
      tripMisCount++;
      const padded = String(tripMisCount).padStart(4, '0');
      const newTripNo = `VEH-${padded}`;
      
      if (doc.tripNo !== newTripNo) {
        tripMisPromises.push(
          db.collection("trip_mis").doc(doc.id).update({ tripNo: newTripNo })
        );
      }
    }
    
    if (tripMisPromises.length > 0) {
      await Promise.all(tripMisPromises);
      console.log(`🚛 [Migration] Successfully migrated ${tripMisPromises.length} trip_mis documents to the new VEH format.`);
    } else {
      console.log("🚛 [Migration] No trip_mis documents needed migration.");
    }

    // 2. Migrate vendor_mis (Vendor Trip MIS)
    const vendorMisSnapshot = await db.collection("vendor_mis").get();
    const vendorMisDocs = [];
    vendorMisSnapshot.forEach(doc => {
      vendorMisDocs.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort in-memory
    vendorMisDocs.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || 0);
      const dateB = new Date(b.createdAt || b.date || 0);
      return dateA - dateB;
    });

    let vendorMisCount = 0;
    const vendorMisPromises = [];
    
    for (const doc of vendorMisDocs) {
      vendorMisCount++;
      const padded = String(vendorMisCount).padStart(4, '0');
      const newTripNo = `VEN-${padded}`;
      
      if (doc.tripNo !== newTripNo) {
        vendorMisPromises.push(
          db.collection("vendor_mis").doc(doc.id).update({ tripNo: newTripNo })
        );
      }
    }
    
    if (vendorMisPromises.length > 0) {
      await Promise.all(vendorMisPromises);
      console.log(`🚛 [Migration] Successfully migrated ${vendorMisPromises.length} vendor_mis documents to the new VEN format.`);
    } else {
      console.log("🚛 [Migration] No vendor_mis documents needed migration.");
    }

    // Always invalidate cache after migration checks to clear Redis
    await delCache("trip_mis");
    await delCache("vendor_mis");
    console.log("🚛 [Migration] Redis cache cleared for trip_mis and vendor_mis.");

  } catch (error) {
    console.error("❌ [Migration] Error during trip number migration:", error);
  }
}

module.exports = migrateTrips;
