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

const CACHE_KEY = "sales";


exports.getRoot_1 = async (req, res) => {
  const {
    from,
    to,
    client
  } = req.query;
  const data = await getOrSet(`${CACHE_KEY}_${from || "all"}_${to || "all"}_${client || "all"}`, async () => {
    let query = db.collection("bills");
    if (client) query = query.where("client", "==", client);
    const snapshot = await query.orderBy("createdAt", "desc").get();
    const bills = [];
    snapshot.forEach(doc => bills.push({
      id: doc.id,
      ...doc.data()
    }));
    let filtered = bills;
    if (from) filtered = filtered.filter(b => new Date(b.createdAt) >= new Date(from));
    if (to) filtered = filtered.filter(b => new Date(b.createdAt) <= new Date(to));
    return {
      totalSales: filtered.reduce((s, b) => s + parseFloat(b.total || b.amount || 0), 0),
      totalTaxable: filtered.reduce((s, b) => s + parseFloat(b.taxable || b.amount || 0), 0),
      totalGST: filtered.reduce((s, b) => s + parseFloat(b.cgst || 0) + parseFloat(b.sgst || 0), 0),
      count: filtered.length,
      bills: filtered.map(b => ({
        billNo: b.billNo,
        client: b.client,
        date: b.createdAt,
        taxable: b.taxable || b.amount || 0,
        cgst: b.cgst || 0,
        sgst: b.sgst || 0,
        total: b.total || b.amount || 0,
        status: b.status
      }))
    };
  }, 600);
  return success(res, "Sales report fetched successfully", data);
};

exports.get_summary_2 = async (req, res) => {
  const {
    from,
    to
  } = req.query;
  const snapshot = await db.collection("bills").get();
  const bills = [];
  snapshot.forEach(doc => bills.push({
    id: doc.id,
    ...doc.data()
  }));
  let filtered = bills;
  if (from) filtered = filtered.filter(b => new Date(b.createdAt) >= new Date(from));
  if (to) filtered = filtered.filter(b => new Date(b.createdAt) <= new Date(to));
  return success(res, "Sales summary fetched successfully", {
    totalSales: filtered.reduce((s, b) => s + parseFloat(b.total || b.amount || 0), 0),
    totalBills: filtered.length,
    paidBills: filtered.filter(b => b.status === "paid").length,
    pendingBills: filtered.filter(b => b.status === "pending").length,
    averagePerBill: filtered.length > 0 ? filtered.reduce((s, b) => s + parseFloat(b.total || b.amount || 0), 0) / filtered.length : 0
  });
};

