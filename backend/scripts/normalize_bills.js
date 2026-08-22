require('dotenv').config();
const { db, initMongo } = require('../src/config/database');
const { delCache } = require('../src/config/redis');

async function directFix() {
  await initMongo();
  const mongo = db.mongoDb;
  const cursor = mongo.collection('bills').find({});
  const docs = await cursor.toArray();
  console.log('Total bills:', docs.length);
  let count = 0;

  for (const doc of docs) {
    const rawInv = doc.billNo || doc.invoice || doc.invoiceNo || doc.billNumber || doc.invNo || doc.refNo || '';
    const inv = rawInv.toUpperCase();
    const invDate = doc.invoice_date || doc.billDate || doc.date || doc.invoiceDate || (doc.createdAt ? String(doc.createdAt).split('T')[0] : '2026-04-01');
    const created = doc.createdAt || (invDate ? new Date(invDate).toISOString() : new Date().toISOString());

    const setFields = {};
    if (!doc.billNo && inv) setFields.billNo = inv;
    if (!doc.invoice && inv) setFields.invoice = inv;
    if (!doc.invoice_date && invDate) setFields.invoice_date = invDate;
    if (!doc.billDate && invDate) setFields.billDate = invDate;
    if (!doc.date && invDate) setFields.date = invDate;
    if (!doc.createdAt && created) setFields.createdAt = created;

    if (Object.keys(setFields).length > 0) {
      await mongo.collection('bills').updateOne({ _id: doc._id }, { $set: setFields });
      count++;
    }
  }

  console.log('Updated bills count:', count);
  await delCache('bills');
  await delCache('reports_gst');
  process.exit(0);
}
directFix().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
