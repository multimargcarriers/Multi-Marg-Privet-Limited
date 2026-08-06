const { db, connectDB } = require('./src/config/database');
async function test() {
  await connectDB();
  const snapshot = await db.collection("clients").get();
  const clients = [];
  snapshot.forEach(doc => clients.push({ id: doc.id, ...doc.data() }));
  console.log("Total clients in DB:", clients.length);
  process.exit(0);
}
test();
