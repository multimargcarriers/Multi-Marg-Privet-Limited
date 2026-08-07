require('dotenv').config({ path: '../.env' });
require('../src/config/database').initMongo().then(async () => {
  try {
    const { db } = require('../src/config/database');
    const mongoDb = db.mongoDb;
    const billsCursor = mongoDb.collection('bills').find({}, { projection: { items: 1, lrNo: 1 } });
    const billedLrs = new Set();
    for await (const bill of billsCursor) {
      if (bill.lrNo && bill.lrNo !== 'MULTIPLE') billedLrs.add(bill.lrNo);
      if (bill.items && Array.isArray(bill.items)) {
        bill.items.forEach(item => {
          if (item.awb) billedLrs.add(item.awb);
          if (item.lrNo) billedLrs.add(item.lrNo);
        });
      }
    }
    console.log(`Found ${billedLrs.size} billed LRs`);
    let updated = 0;
    const bookingsCursor = mongoDb.collection('bookings').find({ status: { $nin: ['Billed', 'billed'] } }, { projection: { awb: 1, lrNumber: 1, id: 1 } });
    for await (const b of bookingsCursor) {
      if (billedLrs.has(b.awb) || billedLrs.has(b.lrNumber) || billedLrs.has(b._id.toString()) || billedLrs.has(b.id)) {
        await mongoDb.collection('bookings').updateOne({ _id: b._id }, { $set: { status: 'Billed' } });
        updated++;
      }
    }
    console.log(`Updated ${updated} bookings to Billed`);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
});
