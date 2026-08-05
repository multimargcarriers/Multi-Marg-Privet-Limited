const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// 1. Remove pid from CSV
const csvPath = path.join(__dirname, 'frontend/public/bills (6).csv');
try {
  let content = fs.readFileSync(csvPath, 'utf8');
  let lines = content.split('\n');
  let newLines = lines.map(line => {
    // Match the first quoted value and the comma after it, e.g., "1264",
    return line.replace(/^"[^"]*",/, '');
  });
  fs.writeFileSync(csvPath, newLines.join('\n'));
  console.log('Successfully removed pid from CSV.');
} catch (e) {
  console.error('Error modifying CSV:', e);
}

// 2. Remove pid from DB bills
// Using the same config as the app to connect to DB
const { db } = require('./backend/src/config/database');

async function migrate() {
  try {
    const snapshot = await db.collection('bills').get();
    let count = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      let changed = false;
      
      if (data.items && Array.isArray(data.items)) {
        const newItems = data.items.map(item => {
          if (item.hasOwnProperty('pid')) {
            changed = true;
            delete item.pid;
          }
          return item;
        });
        
        if (changed) {
          await db.collection('bills').doc(doc.id).update({ items: newItems });
          count++;
        }
      }
    }
    
    console.log(`Successfully removed pid from ${count} bills in DB.`);
    process.exit(0);
  } catch (err) {
    console.error('Error in DB migration:', err);
    process.exit(1);
  }
}

migrate();
