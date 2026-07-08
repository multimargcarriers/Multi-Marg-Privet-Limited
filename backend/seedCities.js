require('dotenv').config();
const { db } = require('./src/config/firebase');

const indianCities = [
  // Delhi
  { city: "New Delhi", short: "DEL", state: "Delhi", stateCode: "07" },
  // Maharashtra
  { city: "Mumbai", short: "BOM", state: "Maharashtra", stateCode: "27" },
  { city: "Pune", short: "PNQ", state: "Maharashtra", stateCode: "27" },
  { city: "Nagpur", short: "NAG", state: "Maharashtra", stateCode: "27" },
  { city: "Thane", short: "THA", state: "Maharashtra", stateCode: "27" },
  { city: "Nashik", short: "NSK", state: "Maharashtra", stateCode: "27" },
  // West Bengal
  { city: "Kolkata", short: "CCU", state: "West Bengal", stateCode: "19" },
  { city: "Howrah", short: "HWH", state: "West Bengal", stateCode: "19" },
  { city: "Siliguri", short: "SGU", state: "West Bengal", stateCode: "19" },
  // Karnataka
  { city: "Bangalore", short: "BLR", state: "Karnataka", stateCode: "29" },
  { city: "Mysore", short: "MYS", state: "Karnataka", stateCode: "29" },
  { city: "Mangalore", short: "IXE", state: "Karnataka", stateCode: "29" },
  { city: "Hubli", short: "HBX", state: "Karnataka", stateCode: "29" },
  // Tamil Nadu
  { city: "Chennai", short: "MAA", state: "Tamil Nadu", stateCode: "33" },
  { city: "Coimbatore", short: "CJB", state: "Tamil Nadu", stateCode: "33" },
  { city: "Madurai", short: "IXM", state: "Tamil Nadu", stateCode: "33" },
  { city: "Salem", short: "SXV", state: "Tamil Nadu", stateCode: "33" },
  // Uttar Pradesh
  { city: "Lucknow", short: "LKO", state: "Uttar Pradesh", stateCode: "09" },
  { city: "Kanpur", short: "KNU", state: "Uttar Pradesh", stateCode: "09" },
  { city: "Noida", short: "NOI", state: "Uttar Pradesh", stateCode: "09" },
  { city: "Agra", short: "AGR", state: "Uttar Pradesh", stateCode: "09" },
  { city: "Varanasi", short: "VNS", state: "Uttar Pradesh", stateCode: "09" },
  { city: "Ghaziabad", short: "GZB", state: "Uttar Pradesh", stateCode: "09" },
  // Gujarat
  { city: "Ahmedabad", short: "AMD", state: "Gujarat", stateCode: "24" },
  { city: "Surat", short: "STV", state: "Gujarat", stateCode: "24" },
  { city: "Vadodara", short: "BDQ", state: "Gujarat", stateCode: "24" },
  { city: "Rajkot", short: "RAJ", state: "Gujarat", stateCode: "24" },
  // Telangana
  { city: "Hyderabad", short: "HYD", state: "Telangana", stateCode: "36" },
  { city: "Warangal", short: "WGL", state: "Telangana", stateCode: "36" },
  // Rajasthan
  { city: "Jaipur", short: "JAI", state: "Rajasthan", stateCode: "08" },
  { city: "Jodhpur", short: "JDH", state: "Rajasthan", stateCode: "08" },
  { city: "Udaipur", short: "UDR", state: "Rajasthan", stateCode: "08" },
  { city: "Kota", short: "KTU", state: "Rajasthan", stateCode: "08" },
  // Haryana
  { city: "Gurgaon", short: "GUR", state: "Haryana", stateCode: "06" },
  { city: "Faridabad", short: "FBD", state: "Haryana", stateCode: "06" },
  { city: "Panipat", short: "PNP", state: "Haryana", stateCode: "06" },
  // Punjab
  { city: "Ludhiana", short: "LUH", state: "Punjab", stateCode: "03" },
  { city: "Amritsar", short: "ATQ", state: "Punjab", stateCode: "03" },
  { city: "Jalandhar", short: "JAL", state: "Punjab", stateCode: "03" },
  // Madhya Pradesh
  { city: "Indore", short: "IDR", state: "Madhya Pradesh", stateCode: "23" },
  { city: "Bhopal", short: "BHO", state: "Madhya Pradesh", stateCode: "23" },
  { city: "Jabalpur", short: "JLR", state: "Madhya Pradesh", stateCode: "23" },
  { city: "Gwalior", short: "GWL", state: "Madhya Pradesh", stateCode: "23" },
  // Bihar
  { city: "Patna", short: "PAT", state: "Bihar", stateCode: "10" },
  { city: "Gaya", short: "GAY", state: "Bihar", stateCode: "10" },
  // Andhra Pradesh
  { city: "Visakhapatnam", short: "VTZ", state: "Andhra Pradesh", stateCode: "37" },
  { city: "Vijayawada", short: "VGA", state: "Andhra Pradesh", stateCode: "37" },
  // Kerala
  { city: "Kochi", short: "COK", state: "Kerala", stateCode: "32" },
  { city: "Thiruvananthapuram", short: "TRV", state: "Kerala", stateCode: "32" },
  { city: "Kozhikode", short: "CCJ", state: "Kerala", stateCode: "32" },
  // Odisha
  { city: "Bhubaneswar", short: "BBI", state: "Odisha", stateCode: "21" },
  { city: "Cuttack", short: "CTC", state: "Odisha", stateCode: "21" },
  // Chhattisgarh
  { city: "Raipur", short: "RPR", state: "Chhattisgarh", stateCode: "22" },
  { city: "Bhilai", short: "BHL", state: "Chhattisgarh", stateCode: "22" },
  // Jharkhand
  { city: "Ranchi", short: "IXR", state: "Jharkhand", stateCode: "20" },
  { city: "Jamshedpur", short: "IXW", state: "Jharkhand", stateCode: "20" },
  // Assam
  { city: "Guwahati", short: "GAU", state: "Assam", stateCode: "18" },
  // Chandigarh
  { city: "Chandigarh", short: "IXC", state: "Chandigarh", stateCode: "04" },
  // Jammu and Kashmir
  { city: "Srinagar", short: "SXR", state: "Jammu and Kashmir", stateCode: "01" },
  { city: "Jammu", short: "IXJ", state: "Jammu and Kashmir", stateCode: "01" },
  // Uttarakhand
  { city: "Dehradun", short: "DED", state: "Uttarakhand", stateCode: "05" },
  // Himachal Pradesh
  { city: "Shimla", short: "SLV", state: "Himachal Pradesh", stateCode: "02" },
  // Goa
  { city: "Panaji", short: "GOI", state: "Goa", stateCode: "30" }
];

async function seedCities() {
  if (!db) {
    console.error("No Firebase DB connection found. Ensure USE_FIREBASE=true.");
    process.exit(1);
  }

  const citiesRef = db.collection('cities');
  
  console.log("Fetching existing cities...");
  const snapshot = await citiesRef.get();
  
  console.log(`Deleting ${snapshot.size} existing cities...`);
  const batchDelete = db.batch();
  snapshot.docs.forEach((doc) => {
    batchDelete.delete(doc.ref);
  });
  await batchDelete.commit();

  console.log(`Seeding ${indianCities.length} Indian cities...`);
  const batchInsert = db.batch();
  indianCities.forEach((cityData) => {
    const docRef = citiesRef.doc(); // Auto-generate ID
    batchInsert.set(docRef, {
      ...cityData,
      status: 'Active',
      createdAt: new Date().toISOString()
    });
  });
  
  await batchInsert.commit();
  
  console.log("Successfully seeded Indian cities with State and State Codes!");
  process.exit(0);
}

seedCities().catch(console.error);
