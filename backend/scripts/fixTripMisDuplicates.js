const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const { MongoClient } = require('mongodb');

async function fixDuplicates() {
  const uri = 'mongodb+srv://multimargcarrier_db_user:MultiMargPvtLtd105@multimarg.ctxkr9v.mongodb.net/multimarg?retryWrites=true&w=majority&appName=Multimarg';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('multimarg');
    const tripCol = db.collection('trip_mis');
    const countersCol = db.collection('counters');

    console.log('Connected to MongoDB. Starting reassignment...');

    // 1. Reassign 6ccb21be (10:08 UTC) to NOKA 0033
    const res1 = await tripCol.updateOne(
      { _id: '6ccb21be-f89a-4061-90ae-f5a778327721' },
      { $set: { tripNo: 'NOKA 0033' } }
    );
    console.log('Reassigned 6ccb21be to NOKA 0033:', res1.modifiedCount, 'document modified');

    // 2. Reassign d6db77c2 (10:13 UTC) to NOKA 0034
    const res2 = await tripCol.updateOne(
      { _id: 'd6db77c2-00f8-40b7-b285-3ce42049c92c' },
      { $set: { tripNo: 'NOKA 0034' } }
    );
    console.log('Reassigned d6db77c2 to NOKA 0034:', res2.modifiedCount, 'document modified');

    // 3. Set counter for NOKA to 34
    const counterRes = await countersCol.findOneAndUpdate(
      { _id: 'trip_mis_counter_NOKA' },
      { $set: { seq: 34 } },
      { returnDocument: 'after', upsert: true }
    );
    console.log('Updated trip_mis_counter_NOKA to seq 34:', counterRes);

    // 4. Verify all NOKA trip numbers in DB
    const allNoka = await tripCol.find({ tripNo: /noka/i }).sort({ createdAt: 1 }).toArray();
    console.log('\n--- VERIFICATION OF ALL NOKA ENTRIES ---');
    allNoka.forEach((t, i) => {
      console.log(`${i + 1}. [${t._id}] TripNo: ${t.tripNo} | Created: ${t.createdAt} | Vehicle: ${t.vehicleNo}`);
    });

  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await client.close();
  }

  // 5. Redis cache clearing
  try {
    const { delCache } = require('../src/config/redis');
    await delCache('trip_mis');
    console.log('Flushed Redis cache for trip_mis');
  } catch (redisErr) {
    console.log('Redis cache flush notice (not critical):', redisErr.message);
  }
}

fixDuplicates();
