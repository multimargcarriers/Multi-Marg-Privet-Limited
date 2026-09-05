const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: __dirname + '/../.env' });

async function migrate() {
  console.log('[Migration] Connecting to MongoDB...');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const bookingsCol = db.collection('bookings');
  const trackingCol = db.collection('tracking');

  const allBookings = await bookingsCol.find({}).toArray();
  const allTracking = await trackingCol.find({}).toArray();
  console.log(`[Migration] Found ${allBookings.length} bookings and ${allTracking.length} tracking records.`);

  // Group tracking by normalized AWB
  const trackingByAwb = new Map();
  for (const t of allTracking) {
    if (!t.awb) continue;
    const raw = String(t.awb).trim();
    const clean = raw.toLowerCase();
    const stripped = clean.replace(/^(mmc|lr|awb)[-_ ]*/i, '');

    const keys = [raw, clean, stripped];
    for (const k of keys) {
      if (!trackingByAwb.has(k)) trackingByAwb.set(k, []);
      trackingByAwb.get(k).push(t);
    }
  }

  const nowMs = Date.now();
  const trackingToInsert = [];
  const bookingBulkOps = [];

  for (const b of allBookings) {
    const awbVal = String(b.awb || b.consignment || b.lrNo || b.id || b._id).trim();
    if (!awbVal) continue;

    const raw = awbVal;
    const clean = raw.toLowerCase();
    const stripped = clean.replace(/^(mmc|lr|awb)[-_ ]*/i, '');

    const existingTrks = trackingByAwb.get(raw) || trackingByAwb.get(clean) || trackingByAwb.get(stripped) || [];

    const originClean = String(b.origin || '').trim().toUpperCase() || 'ORIGIN';
    const bDate = b.dispatch_date || b.date || b.bookingDate || b.createdAt;
    let bDateIso = new Date().toISOString();
    if (bDate) {
      if (typeof bDate === 'string' && bDate.includes('T')) {
        bDateIso = bDate;
      } else if (typeof bDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(bDate)) {
        bDateIso = `${bDate}T09:00:00.000Z`;
      } else {
        const dObj = new Date(bDate);
        if (!isNaN(dObj.getTime())) bDateIso = dObj.toISOString();
      }
    }

    const bookingTimeMs = new Date(b.createdAt || bDateIso).getTime();
    const minutesSinceBooking = (nowMs - bookingTimeMs) / (60 * 1000);

    const hasBooked = existingTrks.some(t => String(t.status || '').toLowerCase().includes('book'));
    const hasTransit = existingTrks.some(t => String(t.status || '').toLowerCase().includes('transit'));
    const isDelivered = String(b.status || b.transitStatus || '').toLowerCase() === 'delivered';

    // 1. Ensure 1st Milestone: Booked exists
    if (!hasBooked) {
      const bookedDoc = {
        id: uuidv4(),
        _id: uuidv4(),
        awb: awbVal,
        status: 'Booked',
        location: originClean,
        date: bDateIso,
        remarks: `SHIPMENT BOOKED AT ${originClean}. LORRY RECEIPT (LR) GENERATED.`,
        enteredBy: 'System',
        createdAt: bDateIso,
        updatedAt: bDateIso
      };
      trackingToInsert.push(bookedDoc);
      if (!trackingByAwb.has(raw)) trackingByAwb.set(raw, []);
      trackingByAwb.get(raw).push(bookedDoc);
    }

    // 2. Ensure 2nd Milestone: In Transit exists (for bookings older than 2.5 mins)
    if (!hasTransit && minutesSinceBooking >= 2.5) {
      const transitTimeMs = bookingTimeMs + 2.5 * 60 * 1000;
      const transitDateIso = new Date(transitTimeMs).toISOString();

      const transitDoc = {
        id: uuidv4(),
        _id: uuidv4(),
        awb: awbVal,
        status: 'In Transit',
        location: originClean,
        date: transitDateIso,
        remarks: `DISPATCHED FROM ${originClean}`,
        enteredBy: 'System',
        createdAt: transitDateIso,
        updatedAt: transitDateIso
      };
      trackingToInsert.push(transitDoc);
      if (!trackingByAwb.has(raw)) trackingByAwb.set(raw, []);
      trackingByAwb.get(raw).push(transitDoc);
    }

    // 3. Update booking status if needed
    if (!isDelivered && minutesSinceBooking >= 2.5) {
      const currStatus = String(b.status || '').trim().toLowerCase();
      const currTransit = String(b.transitStatus || '').trim().toLowerCase();
      const needsStatusUpdate = currStatus === 'booked' || currStatus === 'picked up' || currStatus === '';
      const needsTransitUpdate = currTransit === 'booked' || currTransit === 'picked up' || currTransit === '' || !b.transitStatus;
      const needsLocUpdate = !b.currentLocation || b.currentLocation !== originClean;

      if (needsStatusUpdate || needsTransitUpdate || needsLocUpdate) {
        const updateFields = {};
        if (needsStatusUpdate) updateFields.status = 'In Transit';
        if (needsTransitUpdate) updateFields.transitStatus = 'In Transit';
        if (needsLocUpdate) updateFields.currentLocation = originClean;

        bookingBulkOps.push({
          updateOne: {
            filter: { _id: b._id },
            update: { $set: updateFields }
          }
        });
      }
    }
  }

  console.log(`[Migration] Tracking documents to insert: ${trackingToInsert.length}`);
  console.log(`[Migration] Bookings to update: ${bookingBulkOps.length}`);

  if (trackingToInsert.length > 0) {
    // Insert in chunks of 500
    for (let i = 0; i < trackingToInsert.length; i += 500) {
      const chunk = trackingToInsert.slice(i, i + 500);
      await trackingCol.insertMany(chunk);
      console.log(`[Migration] Inserted tracking chunk ${i} to ${i + chunk.length}`);
    }
  }

  if (bookingBulkOps.length > 0) {
    for (let i = 0; i < bookingBulkOps.length; i += 500) {
      const chunk = bookingBulkOps.slice(i, i + 500);
      await bookingsCol.bulkWrite(chunk);
      console.log(`[Migration] Updated bookings chunk ${i} to ${i + chunk.length}`);
    }
  }

  // Clear Redis caches
  try {
    const { delCache } = require('../src/config/redis');
    if (delCache) {
      await delCache('bookings');
      await delCache('tracking');
      console.log('[Migration] Redis cache cleared.');
    }
  } catch (rErr) {
    console.warn('[Migration] Redis cache clear skipped:', rErr.message);
  }

  // Verify AWB 205497
  const trk205497 = await trackingCol.find({ awb: '205497' }).toArray();
  console.log('\n[Verification] Tracking entries for AWB 205497:');
  trk205497.forEach(t => console.log(`- ${t.status} | Location: ${t.location} | Remarks: ${t.remarks} | Date: ${t.date}`));

  await client.close();
  console.log('[Migration] Completed successfully.');
}

migrate().catch(console.error);
