const { db, initMongo } = require('./src/config/database');
require('dotenv').config();

async function fixBilledStatus() {
  await initMongo();
  
  // 1. Fetch all bills
  const billsSnap = await db.collection("bills").get();
  const billedLrs = new Set();
  
  billsSnap.forEach(billDoc => {
    const bill = billDoc.data();
    if (bill.items && Array.isArray(bill.items)) {
      bill.items.forEach(item => {
        if (item.lrNo) billedLrs.add(String(item.lrNo).trim());
        if (item.awb) billedLrs.add(String(item.awb).trim());
      });
    }
  });
  
  console.log(`Found ${billedLrs.size} unique LRs in bills.`);
  
  // 2. Fetch all bookings
  const bookingsSnap = await db.collection("bookings").get();
  let updateCount = 0;
  
  const updatePromises = [];
  
  bookingsSnap.forEach(doc => {
    const b = doc.data();
    const lr1 = String(b.awb || "").trim();
    const lr2 = String(b.lrNumber || "").trim();
    const lr3 = String(b.consignment || "").trim();
    const lr4 = String(doc.id).trim();
    
    if (
      (lr1 && billedLrs.has(lr1)) || 
      (lr2 && billedLrs.has(lr2)) || 
      (lr3 && billedLrs.has(lr3)) || 
      (lr4 && billedLrs.has(lr4))
    ) {
      if (b.status !== "Billed") {
        updatePromises.push(db.collection("bookings").doc(doc.id).update({ status: "Billed" }));
        updateCount++;
      }
    }
  });
  
  await Promise.all(updatePromises);
  console.log(`Updated ${updateCount} bookings to status: 'Billed'`);
  process.exit(0);
}

fixBilledStatus().catch(err => {
  console.error(err);
  process.exit(1);
});
