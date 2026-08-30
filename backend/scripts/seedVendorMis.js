require('dotenv').config();
const { db, initMongo } = require('../src/config/database');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

function formatDateToYYYYMMDD(dateStr) {
  if (!dateStr || dateStr.trim() === '') return '';
  const cleanStr = dateStr.trim();
  const parts = cleanStr.split(/[-./]/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`; // YYYY-MM-DD
  }
  return '';
}

function parseDateToISO(dateStr) {
  const ymd = formatDateToYYYYMMDD(dateStr);
  if (ymd) {
    return new Date(ymd + 'T00:00:00.000Z').toISOString();
  }
  return new Date().toISOString();
}

async function runSeed() {
  await initMongo();
  console.log("Starting Vendor MIS CSV seeding with strict YYYY-MM-DD details dates...");

  const csvFilePath = path.join(__dirname, '../../frontend/public/vendor_mis_sample-1.csv');

  if (!fs.existsSync(csvFilePath)) {
    console.error(`CSV file not found at: ${csvFilePath}`);
    process.exit(1);
  }

  const results = [];
  let currentParent = null;

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv({
        mapHeaders: ({ header, index }) => {
          const cleanHeader = header.trim();
          if (cleanHeader === 'Status') {
            return index === 7 ? 'approvalStatus' : 'detailStatus';
          }
          return cleanHeader;
        }
      }))
      .on('data', (row) => {
        Object.keys(row).forEach(k => {
          if (typeof row[k] === 'string') {
            row[k] = row[k].trim();
          }
        });

        const tripNo = row['Trip no'];
        const vendorName = row['Vendor name'];

        if (tripNo || vendorName) {
          // If we had a previous parent, push it to results
          if (currentParent) {
            currentParent.totalAmount = currentParent.details.reduce((sum, d) => sum + (parseFloat(d.amount) || 0) + (parseFloat(d.others) || 0), 0);
            results.push(currentParent);
          }

          currentParent = {
            tripNo: tripNo || '',
            vendorName: vendorName || '',
            createdAt: parseDateToISO(row['Created at']),
            createdBy: 'admin-id-seeder',
            creatorRole: 'SuperAdmin',
            creatorName: 'SuperAdmin',
            approvalStatus: row['approvalStatus'] || 'Pending',
            remarks: row['Remarks'] ? [
              {
                id: String(Date.now() - Math.floor(Math.random() * 100000)),
                senderId: 'admin-id-seeder',
                senderName: 'SuperAdmin',
                senderRole: 'SuperAdmin',
                message: row['Remarks'],
                createdAt: parseDateToISO(row['Created at'])
              }
            ] : [],
            origin: row['Origin'] || '',
            destination: row['Destination'] || '',
            details: [],
            // Temporary store for inheritance of missing details
            _activeDate: row['Created at'],
            _activeVehicle: row['Vehicle no'] || '-',
            _activeHandover: row['Handover to'] || 'NA'
          };
        }

        if (currentParent) {
          const detailDate = row['Detail date'] || currentParent._activeDate;
          const handoverTo = row['Handover to'] || currentParent._activeHandover;
          const vehicleNo = row['Vehicle no'] || currentParent._activeVehicle;

          currentParent.details.push({
            date: formatDateToYYYYMMDD(detailDate), // Must be YYYY-MM-DD for HTML date inputs!
            handoverTo: handoverTo || 'NA',
            vehicleNo: vehicleNo || '-',
            from: row['From'] || '',
            to: row['To'] || '',
            particular: row['Client name'] || '',
            mode: (row['Mode'] || '').toUpperCase(),
            amount: String(row['Amount'] || '0'),
            others: '0',
            status: row['detailStatus'] || 'Pending'
          });
        }
      })
      .on('end', () => {
        if (currentParent) {
          currentParent.totalAmount = currentParent.details.reduce((sum, d) => sum + (parseFloat(d.amount) || 0) + (parseFloat(d.others) || 0), 0);
          results.push(currentParent);
        }
        resolve();
      })
      .on('error', reject);
  });

  console.log(`Parsed ${results.length} grouped vendor MIS entries from CSV.`);

  // Clean temporary helper properties from parsed entries
  for (const entry of results) {
    delete entry._activeDate;
    delete entry._activeVehicle;
    delete entry._activeHandover;
  }

  // Clear existing entries with matching tripNo to avoid duplicates
  const snapshot = await db.collection("vendor_mis").get();
  let deleteBatch = db.batch();
  let deleteCount = 0;

  const tripNosToSeed = results.map(r => r.tripNo).filter(Boolean);

  snapshot.forEach(doc => {
    const data = doc.data();
    if (tripNosToSeed.includes(data.tripNo)) {
      deleteBatch.delete(doc.ref);
      deleteCount++;
    }
  });

  if (deleteCount > 0) {
    await deleteBatch.commit();
    console.log(`Cleared ${deleteCount} duplicate/existing vendor MIS entries.`);
  }

  // Insert parsed records
  let batch = db.batch();
  let insertCount = 0;
  for (const entry of results) {
    const docRef = db.collection("vendor_mis").doc();
    batch.set(docRef, entry);
    insertCount++;
    if (insertCount % 500 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (insertCount % 500 !== 0) {
    await batch.commit();
  }

  console.log(`Successfully seeded ${insertCount} vendor MIS entries with correct date formatting!`);
  process.exit(0);
}

runSeed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
