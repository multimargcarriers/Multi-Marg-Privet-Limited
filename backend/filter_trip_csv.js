const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { MongoClient } = require('mongodb');
const dns = require('dns');

// Fix for Windows DNS resolving MongoDB Atlas SRV records
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();

const csvFilePath = path.join(__dirname, '../frontend/public/trip (8).csv');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found in env");
    process.exit(1);
  }

  // 1. Read CSV and parse its rows and headers
  let headers = [];
  const csvRows = [];
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('headers', (hdrList) => {
        headers = hdrList;
      })
      .on('data', (row) => {
        csvRows.push(row);
      })
      .on('end', () => {
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      });
  });

  const initialRowCount = csvRows.length;
  console.log(`Loaded CSV with ${initialRowCount} rows. Headers: ${headers.join(', ')}`);

  // 2. Fetch all AWBs from MongoDB bookings collection
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully");
    const db = client.db();
    const bookingsCol = db.collection('bookings');
    
    // Fetch bookings with only relevant projection
    const bookings = await bookingsCol.find({}, {
      projection: {
        id: 1,
        awb: 1,
        consignment: 1,
        lrNo: 1,
        lr_number: 1,
        lrNumber: 1,
        awbNo: 1
      }
    }).toArray();
    
    console.log(`Retrieved ${bookings.length} bookings from MongoDB.`);

    // 3. Build a set of all valid DB AWB variations
    const dbAwbs = new Set();
    bookings.forEach(b => {
      const candidates = [
        b.awb,
        b.consignment,
        b.lrNo,
        b.lr_number,
        b.lrNumber,
        b.awbNo
      ];
      
      candidates.forEach(cand => {
        if (cand !== null && cand !== undefined) {
          const val = String(cand).trim().toLowerCase();
          if (val) {
            dbAwbs.add(val);
          }
        }
      });
    });

    console.log(`Total unique DB AWBs collected: ${dbAwbs.size}`);

    // 4. Filter CSV rows
    const filteredRows = csvRows.filter(row => {
      const rawAwb = row.awb ? String(row.awb).trim() : '';
      const awb = rawAwb.toLowerCase();
      if (!awb) return false;

      // Try exact check and stripped prefix check (e.g. removing mmc/lr/awb prefixes)
      const stripped = awb.replace(/^(mmc|lr|awb)[-_ ]*/i, '');
      return dbAwbs.has(awb) || dbAwbs.has(stripped);
    });

    const finalRowCount = filteredRows.length;
    const removedCount = initialRowCount - finalRowCount;

    console.log(`Filtering complete.`);
    console.log(`Initial rows: ${initialRowCount}`);
    console.log(`Final rows: ${finalRowCount}`);
    console.log(`Rows removed: ${removedCount}`);

    // 5. Overwrite the CSV file if changes were made or even to normalize
    if (headers.length > 0) {
      // Create CSV content manually preserving headers exactly
      const csvContent = [
        headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
        ...filteredRows.map(row => headers.map(h => {
          const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
          return `"${val.replace(/"/g, '""')}"`;
        }).join(','))
      ].join('\n') + '\n';

      fs.writeFileSync(csvFilePath, csvContent, 'utf8');
      console.log(`Successfully updated: ${csvFilePath}`);
    } else {
      console.warn("No headers found, skipping overwrite.");
    }

  } catch (err) {
    console.error("An error occurred during filtering:", err);
  } finally {
    await client.close();
  }
}

run();
