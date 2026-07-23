const {
  db
} = require("../config/database");
const {
  success,
  error
} = require("../utils/response");
const {
  asyncHandler
} = require("../middleware/errorHandler");
const {
  getOrSet
} = require("../config/redis");

exports.get_gst_1 = async (req, res) => {
  const {
    fr,
    to
  } = req.query;
  const data = await getOrSet(`${CACHE_KEY}_${fr || "all"}_${to || "all"}`, async () => {
    const snapshot = await db.collection("bills").get();
    const bills = [];
    snapshot.forEach(doc => bills.push({
      id: doc.id,
      ...doc.data()
    }));
    let filtered = bills;
    if (fr) filtered = filtered.filter(b => new Date(b.createdAt) >= new Date(fr));
    if (to) filtered = filtered.filter(b => new Date(b.createdAt) <= new Date(to));
    return filtered.map(b => ({
      date: b.date || b.createdAt,
      invoice: b.billNo,
      client: b.client,
      gstin: b.gstin || "N/A",
      sac: b.sac || "996511",
      taxable: b.taxable || 0,
      igst: b.igst || 0,
      cgst: b.cgst || 0,
      sgst: b.sgst || 0,
      totalTax: b.totalTax || (b.igst || 0) + (b.cgst || 0) + (b.sgst || 0),
      total: b.total || 0
    }));
  }, 600); // Longer TTL for reports

  return success(res, "GST report fetched successfully", data);
};

