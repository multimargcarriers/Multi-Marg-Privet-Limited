const { db } = require('./src/config/database');
async function check() {
  const snapshot = await db.collection('users').get();
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data().name, doc.data().role, doc.data().permissions);
  });
  process.exit(0);
}
check();
