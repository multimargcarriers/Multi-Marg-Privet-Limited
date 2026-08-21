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

const CACHE_KEY = "reports_gst";

const parseAnyDateToMillis = (dStr) => {
  if (!dStr) return 0;
  if (dStr instanceof Date) return dStr.getTime();
  if (typeof dStr === 'number') return dStr;
  const str = String(dStr).trim();
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).getTime();
  }
  const parsed = new Date(str).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

exports.get_gst_1 = async (req, res) => {
  const { fr, to } = req.query;
  const data = await getOrSet(`${CACHE_KEY}_${fr || "all"}_${to || "all"}`, async () => {
    const snapshot = await db.collection("bills").get();
    const bills = [];
    snapshot.forEach(doc => bills.push({
      id: doc.id,
      ...doc.data()
    }));

    let filtered = bills;
    if (fr) {
      const fromTime = parseAnyDateToMillis(fr);
      if (fromTime > 0) {
        filtered = filtered.filter(b => parseAnyDateToMillis(b.date || b.createdAt) >= fromTime);
      }
    }
    if (to) {
      const toTime = parseAnyDateToMillis(to) + 86400000 - 1; // End of day
      if (toTime > 0) {
        filtered = filtered.filter(b => parseAnyDateToMillis(b.date || b.createdAt) <= toTime);
      }
    }

    return filtered.map(b => ({
      date: b.date || b.createdAt,
      invoice: b.billNo || b.invoiceNo || b.invoice || "-",
      client: b.client || b.clientName || "-",
      gstin: b.gstin || "N/A",
      sac: b.sac || "996511",
      taxable: parseFloat(b.taxable || (b.subtotal || 0)),
      igst: parseFloat(b.igst || 0),
      cgst: parseFloat(b.cgst || 0),
      sgst: parseFloat(b.sgst || 0),
      totalTax: parseFloat(b.totalTax || (parseFloat(b.igst || 0) + parseFloat(b.cgst || 0) + parseFloat(b.sgst || 0))),
      total: parseFloat(b.total || (parseFloat(b.grand_total || 0)))
    }));
  }, 120);

  return success(res, "GST report fetched successfully", data);
};
