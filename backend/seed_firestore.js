require('dotenv').config();
const { db, mockData } = require("./src/config/firebase");

async function seedFirestore() {
  console.log("Seeding Firestore...");
  
  if (!db) {
    console.log("Firebase DB not initialized!");
    return;
  }

  const { bookings, bills } = mockData;

  console.log(`Found ${bookings.length} bookings and ${bills.length} bills in mock data.`);

  // Seed Bookings
  let bCount = 0;
  for (const booking of bookings) {
    try {
      const docRef = db.collection("bookings").doc(booking.id || `b_${Date.now()}_${bCount}`);
      // Remove id from the document data itself
      const { id, ...data } = booking;
      await docRef.set(data);
      bCount++;
      if (bCount % 100 === 0) console.log(`Seeded ${bCount} bookings...`);
    } catch (e) {
      console.error("Error seeding booking:", e);
    }
  }
  console.log(`Finished seeding ${bCount} bookings.`);

  // Seed Bills
  let billCount = 0;
  for (const bill of bills) {
    try {
      const docRef = db.collection("bills").doc(bill.id || `bill_${Date.now()}_${billCount}`);
      const { id, ...data } = bill;
      await docRef.set(data);
      billCount++;
      if (billCount % 100 === 0) console.log(`Seeded ${billCount} bills...`);
    } catch (e) {
      console.error("Error seeding bill:", e);
    }
  }
  console.log(`Finished seeding ${billCount} bills.`);

  console.log("Seeding complete!");
  process.exit(0);
}

seedFirestore();
