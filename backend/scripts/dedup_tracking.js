const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: __dirname + '/../.env' });

async function dedup() {
  console.log('[Deduplication] Connecting to MongoDB...');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const trackingCol = db.collection('tracking');
  const allTracks = await trackingCol.find({}).toArray();
  console.log(`[Deduplication] Found ${allTracks.length} total tracking documents.`);

  // Group by awb + status
  const seen = new Map();
  const duplicateIds = [];

  for (const t of allTracks) {
    if (!t.awb) continue;
    const awbClean = String(t.awb).trim().toLowerCase();
    const statusClean = String(t.status || '').trim().toLowerCase();
    const key = `${awbClean}__${statusClean}`;

    if (seen.has(key)) {
      // Keep the one that has better remarks or earlier date
      const existing = seen.get(key);
      const existingHasBetterRemarks = existing.remarks && existing.remarks.length > (t.remarks?.length || 0);
      if (existingHasBetterRemarks) {
        duplicateIds.push(t._id);
      } else {
        duplicateIds.push(existing._id);
        seen.set(key, t);
      }
    } else {
      seen.set(key, t);
    }
  }

  console.log(`[Deduplication] Found ${duplicateIds.length} duplicate tracking documents to delete.`);

  if (duplicateIds.length > 0) {
    const res = await trackingCol.deleteMany({ _id: { $in: duplicateIds } });
    console.log(`[Deduplication] Deleted ${res.deletedCount} documents.`);
  }

  // Clear Redis cache
  try {
    const { delCache } = require('../src/config/redis');
    if (delCache) {
      await delCache('tracking');
      console.log('[Deduplication] Cleared tracking cache.');
    }
  } catch (err) {
    console.warn('[Deduplication] Cache clear skipped:', err.message);
  }

  // Verify AWB 205497
  const trk205497 = await trackingCol.find({ awb: '205497' }).sort({ date: 1 }).toArray();
  console.log('\n[Verification] Tracking entries for AWB 205497:');
  trk205497.forEach((t, i) => console.log(`${i + 1}. [${t.status}] Location: ${t.location} | Remarks: ${t.remarks} | Date: ${t.date}`));

  await client.close();
  console.log('[Deduplication] Done.');
}

dedup().catch(console.error);
