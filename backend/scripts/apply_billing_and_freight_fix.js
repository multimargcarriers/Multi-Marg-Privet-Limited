const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
require('dotenv').config({ path: __dirname + '/../.env' });
const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');

(async () => {
  let sqlConn;
  let mongoClient;
  try {
    sqlConn = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: process.env.MYSQL_PORT || 3306
    });

    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db('multimarg');

    console.log('Fetching bills from MySQL...');
    const [sqlBills] = await sqlConn.query('SELECT DISTINCT awb, invoice FROM bills WHERE awb IS NOT NULL');
    const sqlAwbMap = new Map();
    sqlBills.forEach(r => {
      if (r.awb && r.invoice) {
        const norm = String(r.awb).trim().toLowerCase().replace(/^(mmc|lr|awb)[-_ ]*/i, '');
        sqlAwbMap.set(norm, String(r.invoice).trim());
      }
    });
    console.log(`Found ${sqlAwbMap.size} distinct billed AWBs in MySQL.`);

    // 1. Update all MongoDB bookings that have a bill in MySQL
    console.log('\nUpdating billed status in MongoDB bookings...');
    const allBookings = await db.collection('bookings').find({}).toArray();

    const billedBulkOps = [];
    allBookings.forEach(b => {
      const norm = String(b.awb || b.lrNumber || b.consignment || '').trim().toLowerCase().replace(/^(mmc|lr|awb)[-_ ]*/i, '');
      const billNo = sqlAwbMap.get(norm);
      if (billNo && (b.billed !== true || b.status !== 'Billed' || b.billNo !== billNo)) {
        billedBulkOps.push({
          updateOne: {
            filter: { _id: b._id },
            update: {
              $set: {
                status: 'Billed',
                billed: true,
                billNo: billNo,
                updatedAt: new Date().toISOString()
              }
            }
          }
        });
      }
    });

    if (billedBulkOps.length > 0) {
      console.log(`Executing update for ${billedBulkOps.length} bookings to status: "Billed"...`);
      const res = await db.collection('bookings').bulkWrite(billedBulkOps);
      console.log(`Updated ${res.modifiedCount} bookings to Billed.`);
    } else {
      console.log('No bookings needed billing update.');
    }

    // 2. Fix corrupted freight on bookings where freight == commercial goods invoice value
    console.log('\nChecking for corrupted freight (where freight == commercial invoice value)...');
    const freshBookings = await db.collection('bookings').find({}).toArray();
    const freightBulkOps = [];

    freshBookings.forEach(b => {
      const frt = Number(b.freight_charge || b.freight || 0);
      if (frt <= 0) return;

      let invTotal = 0;
      if (b.invoiceDetails && Array.isArray(b.invoiceDetails)) {
        b.invoiceDetails.forEach(inv => {
          invTotal += Number(inv.invoiceValue || inv.value || 0);
        });
      }

      // If freight matches commercial goods value or exceeds 100,000 while rate is undefined and matches goods value
      if (invTotal > 0 && Math.abs(frt - invTotal) < 1) {
        freightBulkOps.push({
          updateOne: {
            filter: { _id: b._id },
            update: {
              $set: {
                freight_charge: 0,
                freight: 0,
                updatedAt: new Date().toISOString()
              }
            }
          }
        });
      }
    });

    if (freightBulkOps.length > 0) {
      console.log(`Fixing corrupted freight for ${freightBulkOps.length} bookings...`);
      const res2 = await db.collection('bookings').bulkWrite(freightBulkOps);
      console.log(`Reset freight to 0 for ${res2.modifiedCount} bookings (commercial invoice values preserved in invoiceDetails).`);
    } else {
      console.log('No bookings with corrupted freight found.');
    }

    // 3. Re-audit MongoDB unbilled stats
    const finalUnbilled = await db.collection('bookings').find({
      billed: { $ne: true },
      status: { $ne: 'Billed' }
    }).toArray();

    let totalBoxes = 0;
    let totalWeight = 0;
    let totalFreight = 0;
    const byYear = {};

    finalUnbilled.forEach(b => {
      totalBoxes += parseInt(b.box || b.packages || 0, 10) || 0;
      totalWeight += parseFloat(b.charge_wt || b.actual_wt || 0) || 0;
      totalFreight += parseFloat(b.freight_charge || b.freight || 0) || 0;

      const s = String(b.date || b.dispatch_date || b.createdAt || '');
      const yr = s.includes('2025') ? '2025' : (s.includes('2026') ? '2026' : 'Unknown');
      byYear[yr] = (byYear[yr] || 0) + 1;
    });

    console.log('\n=== NEW ACCURATE UNBILLED AUDIT ===');
    console.log(`Pending Unbilled LRs: ${finalUnbilled.length}`);
    console.log(`Breakdown by Year:`, byYear);
    console.log(`Total Boxes: ${totalBoxes}`);
    console.log(`Total Chargeable Weight: ${totalWeight.toFixed(2)} kg`);
    console.log(`Unbilled Freight Value: ₹ ${totalFreight.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    if (sqlConn) await sqlConn.end();
    if (mongoClient) await mongoClient.close();
  }
})();
