require('dotenv').config();
const { db } = require('./src/config/firebase');
const https = require('https');

const GST_CODES = {
  "Jammu and Kashmir": "01",
  "Himachal Pradesh": "02",
  "Punjab": "03",
  "Chandigarh": "04",
  "Uttarakhand": "05",
  "Haryana": "06",
  "Delhi": "07",
  "Rajasthan": "08",
  "Uttar Pradesh": "09",
  "Bihar": "10",
  "Sikkim": "11",
  "Arunachal Pradesh": "12",
  "Nagaland": "13",
  "Manipur": "14",
  "Mizoram": "15",
  "Tripura": "16",
  "Meghalaya": "17",
  "Assam": "18",
  "West Bengal": "19",
  "Jharkhand": "20",
  "Odisha": "21",
  "Chhattisgarh": "22",
  "Madhya Pradesh": "23",
  "Gujarat": "24",
  "Daman and Diu": "25",
  "Dadra and Nagar Haveli": "26",
  "Maharashtra": "27",
  "Karnataka": "29",
  "Goa": "30",
  "Lakshadweep": "31",
  "Kerala": "32",
  "Tamil Nadu": "33",
  "Puducherry": "34",
  "Andaman and Nicobar Islands": "35",
  "Telangana": "36",
  "Andhra Pradesh": "37",
  "Ladakh": "38"
};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Chunks array into smaller arrays of size
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function seedAllCities() {
  if (!db) {
    console.error("No Firebase DB connection found. Ensure USE_FIREBASE=true.");
    process.exit(1);
  }

  console.log("Downloading India States & Districts data...");
  const url = "https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts/master/states-and-districts.json";
  
  let data;
  try {
    data = await fetchJSON(url);
  } catch (err) {
    console.error("Failed to download JSON:", err);
    process.exit(1);
  }

  const allCities = [];
  data.states.forEach(stateObj => {
    const stateName = stateObj.state;
    // Match GST code or fallback
    const stateCode = GST_CODES[stateName] || "";
    
    stateObj.districts.forEach(district => {
      allCities.push({
        city: district,
        short: district.substring(0, 3).toUpperCase(),
        state: stateName,
        stateCode: stateCode,
        status: 'Active',
        createdAt: new Date().toISOString()
      });
    });
  });

  console.log(`Found ${allCities.length} districts across India.`);
  
  const citiesRef = db.collection('cities');
  
  console.log("Fetching existing cities to delete...");
  const snapshot = await citiesRef.get();
  
  // Delete existing cities in batches of 400
  const deleteChunks = chunkArray(snapshot.docs, 400);
  console.log(`Deleting ${snapshot.size} existing cities...`);
  
  for (const chunk of deleteChunks) {
    const batchDelete = db.batch();
    chunk.forEach(doc => batchDelete.delete(doc.ref));
    await batchDelete.commit();
  }

  // Insert new cities in batches of 400
  console.log(`Seeding ${allCities.length} cities/districts...`);
  const insertChunks = chunkArray(allCities, 400);
  
  let count = 0;
  for (const chunk of insertChunks) {
    const batchInsert = db.batch();
    chunk.forEach(cityData => {
      const docRef = citiesRef.doc();
      batchInsert.set(docRef, cityData);
    });
    await batchInsert.commit();
    count += chunk.length;
    console.log(`Inserted ${count}/${allCities.length}...`);
  }
  
  // Clear redis cache
  try {
    const { delCache } = require('./src/config/redis');
    await delCache('cities');
    console.log("Redis cache cleared for cities.");
  } catch (e) {
    console.log("Redis cache could not be cleared automatically.");
  }
  
  console.log("Successfully seeded ALL Indian districts with State and State Codes!");
  process.exit(0);
}

seedAllCities().catch(console.error);
