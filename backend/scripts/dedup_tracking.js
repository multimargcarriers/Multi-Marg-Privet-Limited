const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: __dirname + '/../.env' });

async function dedup() {
  console.log('[Deduplication] Connecting to MongoDB...');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('multimarg');

  const trackingCol = db.collection('tracking');
  const allTracks = await trackingCol.find({}).sort({ date: 1, createdAt: 1 }).toArray();
  console.log(`[Deduplication] Found ${allTracks.length} total tracking documents.`);

  // Group by AWB
  const byAwb = new Map();
  for (const t of allTracks) {
    if (!t.awb) continue;
    const awbKey = String(t.awb).trim().toLowerCase();
    if (!byAwb.has(awbKey)) byAwb.set(awbKey, []);
    byAwb.get(awbKey).push(t);
  }

  const deleteIds = [];

  for (const [awb, tracks] of byAwb.entries()) {
    // 1. Keep only 1 'Booked' entry
    const bookedEntries = tracks.filter(t => String(t.status || '').trim().toLowerCase().includes('book'));
    if (bookedEntries.length > 1) {
      // Keep the best booked entry (one with earliest date or proper remarks)
      const keepBooked = bookedEntries[0];
      for (let i = 1; i < bookedEntries.length; i++) {
        deleteIds.push(bookedEntries[i]._id);
      }
    }

    // 2. Keep only 1 'Delivered' entry
    const deliveredEntries = tracks.filter(t => String(t.status || '').trim().toLowerCase().includes('deliver'));
    if (deliveredEntries.length > 1) {
      // Prioritize entry with podUrl
      const keepDelivered = deliveredEntries.find(d => d.podUrl) || deliveredEntries[0];
      for (const d of deliveredEntries) {
        if (String(d._id) !== String(keepDelivered._id)) {
          deleteIds.push(d._id);
        }
      }
    }

    // 3. For all entries, remove duplicates with identical status + remarks (or status + location)
    const seenSignatures = new Map();
    for (const t of tracks) {
      if (deleteIds.includes(t._id)) continue;

      const statusNorm = String(t.status || '').trim().toLowerCase();
      const remarksNorm = String(t.remarks || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const locationNorm = String(t.location || '').trim().toLowerCase().replace(/\s+/g, ' ');

      // Signature based on status and remarks
      const sigRemarks = `${statusNorm}__rem__${remarksNorm}`;
      // Signature based on status and location
      const sigLocation = `${statusNorm}__loc__${locationNorm}`;

      if (seenSignatures.has(sigRemarks) || (remarksNorm && seenSignatures.has(sigLocation) && statusNorm.includes('transit'))) {
        deleteIds.push(t._id);
      } else {
        seenSignatures.set(sigRemarks, t);
        seenSignatures.set(sigLocation, t);
      }
    }
  }

  console.log(`[Deduplication] Identified ${deleteIds.length} duplicate tracking documents.`);

  if (deleteIds.length > 0) {
    // Delete in batches of 1000
    let totalDeleted = 0;
    const batchSize = 1000;
    for (let i = 0; i < deleteIds.length; i += batchSize) {
      const batch = deleteIds.slice(i, i + batchSize);
      const res = await trackingCol.deleteMany({ _id: { $in: batch } });
      totalDeleted += res.deletedCount;
    }
    console.log(`[Deduplication] Successfully deleted ${totalDeleted} duplicate documents.`);
  }

  const remainingTotal = await trackingCol.countDocuments();
  console.log(`[Deduplication] Remaining total tracking documents: ${remainingTotal}`);

  // Clear Redis cache
  try {
    const { delCache } = require('../src/config/redis');
    if (delCache) {
      await delCache('tracking');
      console.log('[Deduplication] Cleared tracking Redis cache.');
    }
  } catch (err) {
    console.warn('[Deduplication] Cache clear skipped:', err.message);
  }

  // Verification for sample AWBs
  const sampleAwbs = ['205497', '205381', '205388', '205380', '205391', '205379', '205383'];
  console.log('\n[Verification] Checking sample AWBs after deduplication:');
  for (const awb of sampleAwbs) {
    const records = await trackingCol.find({ awb: new RegExp(`^${awb}$`, 'i') }).sort({ date: 1 }).toArray();
    console.log(`AWB ${awb}: ${records.length} tracking records`);
    records.forEach((r, idx) => console.log(`   ${idx + 1}. [${r.status}] Loc: ${r.location} | Remarks: ${r.remarks}`));
  }

  await client.close();
  console.log('\n[Deduplication] Completed successfully.');
}

dedup().catch(console.error);
