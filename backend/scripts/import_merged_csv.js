require('dotenv').config();
const { db, initMongo } = require('../src/config/database');
const fs = require('fs');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

async function runImport() {
  await initMongo();
  console.log("Starting CSV import and merge process...");

  const bookingsFile = path.join(__dirname, '../../frontend/public/trip (6).csv');
  const invoicesFile = path.join(__dirname, '../../frontend/public/lr_details (5).csv');

  if (!fs.existsSync(bookingsFile)) {
    console.error(`Bookings file not found: ${bookingsFile}`);
    return;
  }
  if (!fs.existsSync(invoicesFile)) {
    console.error(`Invoices file not found: ${invoicesFile}`);
    return;
  }

  // 1. Delete all existing bookings
  console.log("Clearing existing bookings from Firestore...");
  const collectionRef = db.collection('bookings');
  const snapshot = await collectionRef.get();
  
  if (!snapshot.empty) {
    let deleteBatch = db.batch();
    let deleteCount = 0;
    
    for (const doc of snapshot.docs) {
      deleteBatch.delete(doc.ref);
      deleteCount++;
      if (deleteCount % 500 === 0) {
        await deleteBatch.commit();
        deleteBatch = db.batch();
      }
    }
    if (deleteCount % 500 !== 0) {
      await deleteBatch.commit();
    }
    console.log(`Deleted ${deleteCount} existing bookings.`);
  }

  // 2. Parse Invoices
  console.log("Parsing invoice details...");
  const invoicesByAwb = {};
  await new Promise((resolve, reject) => {
    fs.createReadStream(invoicesFile)
      .pipe(csv())
      .on('data', (row) => {
        // Strip out ="" formatting if present
        Object.keys(row).forEach(k => {
          if (typeof row[k] === 'string') {
            row[k] = row[k].replace(/^="|"$/g, '').trim();
          }
        });

        const awb = row.awb;
        if (!awb) return;

        if (!invoicesByAwb[awb]) {
          invoicesByAwb[awb] = { invoiceDetails: [], parcels: [] };
        }

        const cleanValue = (val) => {
          if (!val) return '';
          if (val === '0' || val === 0) return '';
          if (typeof val === 'string' && /^\d+(\.\d+)?e\+\d+$/i.test(val)) {
            return Number(val).toLocaleString('fullwide', { useGrouping: false });
          }
          return val;
        };

        const invObj = {
          invoiceDate: row.invdate || '',
          invoiceValue: cleanValue(row.value),
          invoiceNo: cleanValue(row.invoice),
          partNumber: cleanValue(row.part),
          ewayBill: cleanValue(row.eway),
          quantity: cleanValue(row.quantity)
        };
        
        const parcelObj = {
          invoiceDate: row.invdate || '',
          value: cleanValue(row.value),
          invoice: cleanValue(row.invoice),
          part: cleanValue(row.part),
          eway: cleanValue(row.eway),
          quantity: cleanValue(row.quantity)
        };

        invoicesByAwb[awb].invoiceDetails.push(invObj);
        invoicesByAwb[awb].parcels.push(parcelObj);
      })
      .on('end', resolve)
      .on('error', reject);
  });
  console.log(`Parsed invoices for ${Object.keys(invoicesByAwb).length} unique AWBs.`);

  // 3. Parse Bookings and Merge
  console.log("Parsing and merging bookings...");
  const bookingsMap = {};
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(bookingsFile)
      .pipe(csv())
      .on('data', (row) => {
        Object.keys(row).forEach(k => {
          if (typeof row[k] === 'string') {
            row[k] = row[k].replace(/^="|"$/g, '').trim();
          }
        });

        const awb = row.awb;
        if (!awb) return;

        const cleanValue = (val) => {
          if (!val) return '';
          if (val === '0' || val === 0) return '';
          if (typeof val === 'string' && /^\d+(\.\d+)?e\+\d+$/i.test(val)) {
            return Number(val).toLocaleString('fullwide', { useGrouping: false });
          }
          return val;
        };

        // Ensure we only create one booking per AWB (in case trip(6) has duplicates for some reason)
        if (!bookingsMap[awb]) {
          let createdAtIso = new Date().toISOString();
          if (row.date) {
            const parts = row.date.split(/[-/ T]/);
            if (parts.length >= 3 && parts[0].length === 2 && parts[2].length === 4) {
              // DD-MM-YYYY
              createdAtIso = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`).toISOString();
            } else if (parts.length >= 3 && parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2) {
              // YYYY-MM-DD
              createdAtIso = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T00:00:00Z`).toISOString();
            }
          }

          const b = {
            id: uuidv4(),
            createdAt: createdAtIso,
            status: row.status === '1' || row.status === 'Booked' ? 'Booked' : (row.status || 'Booked'),
            awb: awb,
            date: row.date || '',
            mode: row.mode || 'Road',
            client: row.client || '',
            origin: row.origin || '',
            destination: row.destination || '',
            consignor: row.consignor || '',
            consignee: row.consignee || '',
            box: cleanValue(row.box),
            actual_wt: cleanValue(row.actual_wt),
            charge_wt: cleanValue(row.charge_wt),
            description: row.type_of_delivery || '',
            type_of_delivery: 'Door',
            insuredBy: row.insured || 'NA',
            remarks: row.remarks || '',
            clerk_name: row.clerk_name || 'Admin',
            freight_charge: cleanValue(row.frieght_charge || row.freight_charge),
            awb_charge: cleanValue(row.awb_charge),
            pickup_charge: cleanValue(row.pickup_charge),
            delivery_charge: cleanValue(row.delivery_charge),
            packaging_charge: cleanValue(row.packaging_charge),
            handling_charge: cleanValue(row.handling_charge)
          };

          // Merge invoices
          if (invoicesByAwb[awb]) {
            b.invoiceDetails = invoicesByAwb[awb].invoiceDetails;
            b.parcels = invoicesByAwb[awb].parcels;
          } else {
            b.invoiceDetails = [];
            b.parcels = [];
          }

          bookingsMap[awb] = b;
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  const bookingsList = Object.values(bookingsMap);
  console.log(`Successfully mapped ${bookingsList.length} complete bookings.`);

  // 4. Batch Insert
  console.log("Uploading to Firestore...");
  let insertBatch = db.batch();
  let insertCount = 0;
  
  for (const b of bookingsList) {
    const docRef = collectionRef.doc(b.id);
    insertBatch.set(docRef, b);
    insertCount++;
    
    if (insertCount % 500 === 0) {
      await insertBatch.commit();
      insertBatch = db.batch();
    }
  }
  
  if (insertCount % 500 !== 0) {
    await insertBatch.commit();
  }

  console.log(`Done! Successfully inserted ${insertCount} bookings.`);
  process.exit(0);
}

runImport().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
