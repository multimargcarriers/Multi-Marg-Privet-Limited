const { db, initMongo } = require('./src/config/database');
require('dotenv').config();
async function test() {
  await initMongo();
  const snapshot = await db.collection("users").get();
  console.log("Total users:", snapshot.size);
  snapshot.forEach(doc => {
    console.log(doc.id, "email:", doc.data().email, "empId:", doc.data().employeeId);
  });
  process.exit(0);
}
test();
