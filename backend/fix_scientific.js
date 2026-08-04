require('dotenv').config();
const { MongoClient } = require('mongodb');

async function fixScientific() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/logistics', { family: 4 });
  try {
    await client.connect();
    const db = client.db('multimarg');

    // Fix in Bookings
    const bookingsCol = db.collection('bookings');
    const bookings = await bookingsCol.find({}).toArray();
    let bookingsUpdated = 0;

    for (let b of bookings) {
      let changed = false;

      // Fix parcels
      if (b.parcels && Array.isArray(b.parcels)) {
        for (let p of b.parcels) {
          ['eway', 'ewayBill', 'invoice', 'invoiceNo', 'part', 'partNo', 'awb'].forEach(key => {
            if (p[key] && typeof p[key] === 'string' && /^\d+(\.\d+)?e\+\d+$/i.test(p[key])) {
              console.log(`Fixing booking ${b.awb || b._id} parcel ${key}: ${p[key]}`);
              p[key] = Number(p[key]).toLocaleString('fullwide', { useGrouping: false });
              changed = true;
            }
          });
        }
      }

      // Fix invoiceDetails
      if (b.invoiceDetails && Array.isArray(b.invoiceDetails)) {
        for (let inv of b.invoiceDetails) {
          ['eway', 'ewayBill', 'invoice', 'invoiceNo', 'part', 'partNo', 'awb'].forEach(key => {
            if (inv[key] && typeof inv[key] === 'string' && /^\d+(\.\d+)?e\+\d+$/i.test(inv[key])) {
              console.log(`Fixing booking ${b.awb || b._id} invoiceDetails ${key}: ${inv[key]}`);
              inv[key] = Number(inv[key]).toLocaleString('fullwide', { useGrouping: false });
              changed = true;
            }
          });
        }
      }

      if (changed) {
        await bookingsCol.updateOne({ _id: b._id }, { $set: { parcels: b.parcels, invoiceDetails: b.invoiceDetails } });
        bookingsUpdated++;
      }
    }
    console.log(`Updated ${bookingsUpdated} bookings.`);

    // Fix in Bills
    const billsCol = db.collection('bills');
    const bills = await billsCol.find({}).toArray();
    let billsUpdated = 0;

    for (let b of bills) {
      let changed = false;

      if (b.invoiceDetails && Array.isArray(b.invoiceDetails)) {
        for (let inv of b.invoiceDetails) {
          ['eway', 'ewayBill', 'invoice', 'invoiceNo', 'part', 'partNo', 'awb'].forEach(key => {
            if (inv[key] && typeof inv[key] === 'string' && /^\d+(\.\d+)?e\+\d+$/i.test(inv[key])) {
              console.log(`Fixing bill ${b.billNo || b._id} invoiceDetails ${key}: ${inv[key]}`);
              inv[key] = Number(inv[key]).toLocaleString('fullwide', { useGrouping: false });
              changed = true;
            }
          });
        }
      }

      if (changed) {
        await billsCol.updateOne({ _id: b._id }, { $set: { invoiceDetails: b.invoiceDetails } });
        billsUpdated++;
      }
    }
    console.log(`Updated ${billsUpdated} bills.`);

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

fixScientific();
