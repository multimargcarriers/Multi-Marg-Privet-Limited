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

const CACHE_KEY = "unbilled";

function parseBookingDate(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === 'object' && dateVal.seconds) {
    return new Date(dateVal.seconds * 1000);
  }
  if (typeof dateVal === 'number') {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (!trimmed) return null;
    const matchDDMMYYYY = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(trimmed.split('T')[0]);
    if (matchDDMMYYYY) {
      return new Date(parseInt(matchDDMMYYYY[3], 10), parseInt(matchDDMMYYYY[2], 10) - 1, parseInt(matchDDMMYYYY[1], 10));
    }
    const matchYYYYMMDD = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(trimmed.split('T')[0]);
    if (matchYYYYMMDD) {
      return new Date(parseInt(matchYYYYMMDD[1], 10), parseInt(matchYYYYMMDD[2], 10) - 1, parseInt(matchYYYYMMDD[3], 10));
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

exports.parseBookingDate = parseBookingDate;

exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    let unbilledBookings = [];
    const billedLrs = new Set();
    const billedBillNos = new Set();

    if (db.mongoDb) {
      const bills = await db.mongoDb.collection("bills").find({}, { projection: { billNo: 1, invoice: 1, lrNo: 1, items: 1 } }).toArray();
      bills.forEach(bill => {
        if (bill.billNo) billedBillNos.add(String(bill.billNo).trim().toLowerCase());
        if (bill.invoice) billedBillNos.add(String(bill.invoice).trim().toLowerCase());
        if (bill.lrNo && bill.lrNo !== 'MULTIPLE') billedLrs.add(String(bill.lrNo).trim().toLowerCase());
        if (bill.items && Array.isArray(bill.items)) {
          bill.items.forEach(item => {
            if (item.lrNo) billedLrs.add(String(item.lrNo).trim().toLowerCase());
            if (item.awb) billedLrs.add(String(item.awb).trim().toLowerCase());
          });
        }
      });

      const allBookings = await db.mongoDb.collection("bookings").find({}).sort({ date: -1, createdAt: -1 }).toArray();
      allBookings.forEach(b => {
        const lr1 = String(b.awb || "").trim().toLowerCase();
        const lr2 = String(b.lrNumber || "").trim().toLowerCase();
        const lr3 = String(b.consignment || "").trim().toLowerCase();
        const lr4 = String(b.id || (b._id ? b._id.toString() : "")).trim().toLowerCase();
        const bNo = String(b.billNo || "").trim().toLowerCase();

        const isBilledInBill = (lr1 && billedLrs.has(lr1)) || 
                               (lr2 && billedLrs.has(lr2)) || 
                               (lr3 && billedLrs.has(lr3)) || 
                               (lr4 && billedLrs.has(lr4)) ||
                               (bNo && billedBillNos.has(bNo)) ||
                               b.billed === true ||
                               String(b.status || '').toLowerCase() === 'billed' ||
                               Boolean(b.billNo && String(b.billNo).trim() !== '');

        if (!isBilledInBill) {
          unbilledBookings.push({
            ...b,
            id: b.id || (b._id ? b._id.toString() : ""),
            client: b.client || b.consignor || b.billedTo || b.billing_party || b.party || ""
          });
        }
      });
    } else {
      const snap = await db.collection("bookings").get();
      snap.forEach(doc => {
        const d = doc.data();
        if (d.billed !== true && String(d.status || '').toLowerCase() !== 'billed') {
          unbilledBookings.push({
            id: doc.id,
            ...d,
            client: d.client || d.consignor || d.billedTo || d.billing_party || d.party || ""
          });
        }
      });
    }

    return unbilledBookings;
  }, 120);

  return success(res, "Unbilled bookings fetched successfully", data);
};

exports.get_search_2 = async (req, res) => {
  const {
    client,
    from,
    to
  } = req.query;

  let bookings = [];
  const billedLrs = new Set();
  const billedBillNos = new Set();

  if (db.mongoDb) {
    const bills = await db.mongoDb.collection("bills").find({}, { projection: { billNo: 1, invoice: 1, lrNo: 1, items: 1 } }).toArray();
    bills.forEach(bill => {
      if (bill.billNo) billedBillNos.add(String(bill.billNo).trim().toLowerCase());
      if (bill.invoice) billedBillNos.add(String(bill.invoice).trim().toLowerCase());
      if (bill.lrNo && bill.lrNo !== 'MULTIPLE') billedLrs.add(String(bill.lrNo).trim().toLowerCase());
      if (bill.items && Array.isArray(bill.items)) {
        bill.items.forEach(item => {
          if (item.lrNo) billedLrs.add(String(item.lrNo).trim().toLowerCase());
          if (item.awb) billedLrs.add(String(item.awb).trim().toLowerCase());
        });
      }
    });

    const allBookings = await db.mongoDb.collection("bookings").find({}).sort({ date: -1, createdAt: -1 }).toArray();
    allBookings.forEach(b => {
      const lr1 = String(b.awb || "").trim().toLowerCase();
      const lr2 = String(b.lrNumber || "").trim().toLowerCase();
      const lr3 = String(b.consignment || "").trim().toLowerCase();
      const lr4 = String(b.id || (b._id ? b._id.toString() : "")).trim().toLowerCase();
      const bNo = String(b.billNo || "").trim().toLowerCase();

      const isBilledInBill = (lr1 && billedLrs.has(lr1)) || 
                             (lr2 && billedLrs.has(lr2)) || 
                             (lr3 && billedLrs.has(lr3)) || 
                             (lr4 && billedLrs.has(lr4)) ||
                             (bNo && billedBillNos.has(bNo)) ||
                             b.billed === true ||
                             String(b.status || '').toLowerCase() === 'billed' ||
                             Boolean(b.billNo && String(b.billNo).trim() !== '');

      if (!isBilledInBill) {
        bookings.push({
          ...b,
          id: b.id || (b._id ? b._id.toString() : ""),
          client: b.client || b.consignor || b.billedTo || b.billing_party || b.party || ""
        });
      }
    });
  } else {
    const snap = await db.collection("bookings").get();
    snap.forEach(doc => {
      const d = doc.data();
      if (d.billed !== true && String(d.status || '').toLowerCase() !== 'billed') {
        bookings.push({
          id: doc.id,
          ...d,
          client: d.client || d.consignor || d.billedTo || d.billing_party || d.party || ""
        });
      }
    });
  }

  if (client) {
    const filterClient = client.trim().toLowerCase();
    const normFilter = filterClient.replace(/[^a-z0-9]/g, '');
    bookings = bookings.filter(b => {
      const bClient = (b.client || "").toLowerCase();
      const normB = bClient.replace(/[^a-z0-9]/g, '');
      const consignor = (b.consignor || "").toLowerCase().replace(/[^a-z0-9]/g, '');
      return bClient === filterClient || 
             (normFilter && normB.includes(normFilter)) || 
             (normB && normFilter.includes(normB)) ||
             (consignor && (consignor.includes(normFilter) || normFilter.includes(consignor)));
    });
  }

  if (from) {
    const fromParts = from.split('-');
    const fromDate = fromParts.length === 3 
      ? new Date(parseInt(fromParts[0], 10), parseInt(fromParts[1], 10) - 1, parseInt(fromParts[2], 10), 0, 0, 0, 0)
      : new Date(from);
    bookings = bookings.filter(b => {
      const bDate = parseBookingDate(b.dispatch_date || b.date || b.createdAt || b.bookingDate);
      return bDate ? bDate >= fromDate : false;
    });
  }

  if (to) {
    const toParts = to.split('-');
    const toDate = toParts.length === 3 
      ? new Date(parseInt(toParts[0], 10), parseInt(toParts[1], 10) - 1, parseInt(toParts[2], 10), 23, 59, 59, 999)
      : new Date(to);
    bookings = bookings.filter(b => {
      const bDate = parseBookingDate(b.dispatch_date || b.date || b.createdAt || b.bookingDate);
      return bDate ? bDate <= toDate : false;
    });
  }

  return success(res, "Unbilled bookings fetched successfully", bookings);
};
