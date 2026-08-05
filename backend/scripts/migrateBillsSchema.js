require("dotenv").config();
const { db, initMongo } = require("../src/config/database");

async function migrate() {
  await initMongo();
  console.log("Starting bills schema migration...");
  
  const snapshot = await db.collection("bills").get();
  
  let count = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Check if already migrated
    if (data.invoice && !data.billNo) {
      continue;
    }
    
    // Map bill level fields
    const invoice = data.billNo || data.invoice || "";
    const invoice_date = data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : (data.date || new Date().toISOString().split('T')[0]);
    const client = data.client || data.billedTo || "";
    
    // Map items
    let newItems = [];
    if (data.items && Array.isArray(data.items)) {
      newItems = data.items.map((item, index) => {
        return {
          invoice: invoice,
          invoice_date: invoice_date,
          client: client,
          origin: item.org || item.origin || "",
          destination: item.dest || item.destination || "",
          mode: data.mode || item.mode || "ROAD",
          awb: item.lrNo || item.awb || "",
          awb_date: item.lrDt || item.awb_date || "",
          box: item.pkg || item.box || item.packages || "1",
          weight: parseFloat(item.wt || item.weight || 0).toString(),
          rate: parseFloat(item.rate || 0).toString(),
          frieght: parseFloat(item.frg || item.freight || item.frieght || 0).toString(),
          awb_charge: parseFloat(item.lr || item.awb_charge || 0).toString(),
          pickup: parseFloat(item.pick || item.pickup || 0).toString(),
          delivery: parseFloat(item.del || item.delivery || 0).toString(),
          special_delivery: parseFloat(item.spl || item.special_delivery || item.packaging || 0).toString(),
          other_charge: parseFloat(item.oth || item.other_charge || 0).toString(),
          gst: data.gst > 0 ? "YES" : "NO"
        };
      });
    }

    const updatedData = {
      ...data,
      invoice: invoice,
      invoice_date: invoice_date,
      items: newItems
    };
    
    delete updatedData.billNo;

    await db.collection("bills").doc(doc.id).set(updatedData);
    count++;
    console.log(`Migrated bill: ${invoice}`);
  }
  
  console.log(`Migration completed! Migrated ${count} bills.`);
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
