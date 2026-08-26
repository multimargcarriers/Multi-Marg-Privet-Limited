const { db } = require("../config/database");
const { success, error } = require("../utils/response");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const csv = require("csv-parser");
const { getOrSet, delCache } = require("../config/redis");

// ──────────────────────────────────────────────
// MODULE SCHEMAS — exact headers for sample/export/import
// ──────────────────────────────────────────────
const MODULE_SCHEMAS = {
  clients: ["client_code", "client_name", "gst", "address", "contact_person", "email"],
  cities: ["city", "short"],
  branches: ["code", "branch_name", "contact_person", "address", "phone", "email"],
  vendors: ["vendor_code", "name", "gst", "branch", "mode", "address", "contact_person", "phno", "email"],
  rates: ["client", "origin", "destination", "awb_charge", "air_rate", "air_pickup", "air_delivery", "train_rate", "train_pickup", "train_delivery", "road_rate", "road_pickup", "road_delivery", "road_express_rate", "road_express_pickup", "road_express_delivery"],

  // ── The 3 booking page modules ──
  bookings: [
    "awb", "date", "mode", "client", "origin", "origin_state", "origin_code",
    "destination", "dest_state", "dest_code",
    "consignor", "consignee", "consignor_gst", "consignee_gst", "client_gst",
    "box", "actual_wt", "charge_wt",
    "type_of_delivery", "insured", "description", "remarks",
    "payment_mode", "clerk_name", "status",
    "frieght_charge", "awb_charge", "pickup_charge", "delivery_charge",
    "packaging_charge", "handling_charge", "insurance_charge", "fuel_surcharge"
  ],

  lr_details: [
    "awb", "invdate", "value", "invoice", "part", "eway", "quantity"
  ],

  // Combined = bookings + lr_details merged (one row per invoice line, with booking fields repeated)
  bookings_combined: [
    "awb", "date", "mode", "client", "origin", "origin_state", "origin_code",
    "destination", "dest_state", "dest_code",
    "consignor", "consignee", "consignor_gst", "consignee_gst", "client_gst",
    "box", "actual_wt", "charge_wt",
    "type_of_delivery", "insured", "description", "remarks",
    "payment_mode", "clerk_name", "status",
    "frieght_charge", "awb_charge", "pickup_charge", "delivery_charge",
    "packaging_charge", "handling_charge", "insurance_charge", "fuel_surcharge",
    "invdate", "value", "invoice", "part", "eway", "quantity"
  ],

  // Bills module (used on AllBills page)
  bills: [
    "invoice", "invoice_date", "client", "origin", "destination", "mode",
    "awb", "awb_date", "box", "weight", "rate", "frieght",
    "awb_charge", "pickup", "delivery", "special_delivery", "other_charge", "gst"
  ]
};

// ──────────────────────────────────────────────
// SAMPLE DATA — realistic example rows per module
// ──────────────────────────────────────────────
const SAMPLE_DATA = {
  bookings: [
    {
      awb: "203992", date: "05-01-2026", mode: "road",
      client: "cj darcl logistics limited", origin: "delhi", origin_state: "Delhi", origin_code: "DL",
      destination: "pantnagar", dest_state: "Uttarakhand", dest_code: "UK",
      consignor: "cj darcl logistics limited", consignee: "cj darcl logistics limited",
      consignor_gst: "07AABCD1234E1ZH", consignee_gst: "05AABCD5678E1ZK", client_gst: "07AABCD1234E1ZH",
      box: "6", actual_wt: "120", charge_wt: "150",
      type_of_delivery: "Door", insured: "owner", description: "auto parts", remarks: "",
      payment_mode: "To Pay", clerk_name: "akash", status: "Booked",
      frieght_charge: "3000", awb_charge: "100", pickup_charge: "500",
      delivery_charge: "500", packaging_charge: "0", handling_charge: "0",
      insurance_charge: "0", fuel_surcharge: "0"
    },
    {
      awb: "203991", date: "03-01-2026", mode: "train",
      client: "starways precisions pvt. ltd.", origin: "pune", origin_state: "Maharashtra", origin_code: "MH",
      destination: "sitarganj", dest_state: "Uttarakhand", dest_code: "UK",
      consignor: "starways precisions pvt. ltd.", consignee: "starways industries (si)",
      consignor_gst: "27AABCS1234E1ZA", consignee_gst: "05AABCS5678E1ZB", client_gst: "27AABCS1234E1ZA",
      box: "2", actual_wt: "50", charge_wt: "100",
      type_of_delivery: "Door", insured: "owner", description: "precision parts", remarks: "material delivered",
      payment_mode: "Paid", clerk_name: "dharmendra puri", status: "Booked",
      frieght_charge: "2000", awb_charge: "100", pickup_charge: "500",
      delivery_charge: "1000", packaging_charge: "200", handling_charge: "0",
      insurance_charge: "500", fuel_surcharge: "100"
    }
  ],

  lr_details: [
    {
      awb: "203992", invdate: "03-01-2026", value: "0",
      invoice: "10562963", part: "0", eway: "0", quantity: "0"
    },
    {
      awb: "203991", invdate: "03-01-2026", value: "65844",
      invoice: "sp/2526/56322", part: "jf181473", eway: "201110000000", quantity: "5000"
    },
    {
      awb: "203991", invdate: "03-01-2026", value: "13038.58",
      invoice: "sp/2526/56383", part: "pf561218", eway: "241110000000", quantity: "938"
    }
  ],

  bookings_combined: [
    {
      awb: "203992", date: "05-01-2026", mode: "road",
      client: "cj darcl logistics limited", origin: "delhi", origin_state: "Delhi", origin_code: "DL",
      destination: "pantnagar", dest_state: "Uttarakhand", dest_code: "UK",
      consignor: "cj darcl logistics limited", consignee: "cj darcl logistics limited",
      consignor_gst: "07AABCD1234E1ZH", consignee_gst: "05AABCD5678E1ZK", client_gst: "07AABCD1234E1ZH",
      box: "6", actual_wt: "120", charge_wt: "150",
      type_of_delivery: "Door", insured: "owner", description: "auto parts", remarks: "",
      payment_mode: "To Pay", clerk_name: "akash", status: "Booked",
      frieght_charge: "3000", awb_charge: "100", pickup_charge: "500",
      delivery_charge: "500", packaging_charge: "0", handling_charge: "0",
      insurance_charge: "0", fuel_surcharge: "0",
      invdate: "03-01-2026", value: "0", invoice: "10562963", part: "0", eway: "0", quantity: "0"
    },
    {
      awb: "203991", date: "03-01-2026", mode: "train",
      client: "starways precisions pvt. ltd.", origin: "pune", origin_state: "Maharashtra", origin_code: "MH",
      destination: "sitarganj", dest_state: "Uttarakhand", dest_code: "UK",
      consignor: "starways precisions pvt. ltd.", consignee: "starways industries (si)",
      consignor_gst: "27AABCS1234E1ZA", consignee_gst: "05AABCS5678E1ZB", client_gst: "27AABCS1234E1ZA",
      box: "2", actual_wt: "50", charge_wt: "100",
      type_of_delivery: "Door", insured: "owner", description: "precision parts", remarks: "material delivered",
      payment_mode: "Paid", clerk_name: "dharmendra puri", status: "Booked",
      frieght_charge: "2000", awb_charge: "100", pickup_charge: "500",
      delivery_charge: "1000", packaging_charge: "200", handling_charge: "0",
      insurance_charge: "500", fuel_surcharge: "100",
      invdate: "03-01-2026", value: "65844", invoice: "sp/2526/56322", part: "jf181473", eway: "201110000000", quantity: "5000"
    },
    {
      awb: "203991", date: "03-01-2026", mode: "train",
      client: "starways precisions pvt. ltd.", origin: "pune", origin_state: "Maharashtra", origin_code: "MH",
      destination: "sitarganj", dest_state: "Uttarakhand", dest_code: "UK",
      consignor: "starways precisions pvt. ltd.", consignee: "starways industries (si)",
      consignor_gst: "27AABCS1234E1ZA", consignee_gst: "05AABCS5678E1ZB", client_gst: "27AABCS1234E1ZA",
      box: "2", actual_wt: "50", charge_wt: "100",
      type_of_delivery: "Door", insured: "owner", description: "precision parts", remarks: "material delivered",
      payment_mode: "Paid", clerk_name: "dharmendra puri", status: "Booked",
      frieght_charge: "2000", awb_charge: "100", pickup_charge: "500",
      delivery_charge: "1000", packaging_charge: "200", handling_charge: "0",
      insurance_charge: "500", fuel_surcharge: "100",
      invdate: "03-01-2026", value: "13038.58", invoice: "sp/2526/56383", part: "pf561218", eway: "241110000000", quantity: "938"
    }
  ],

  bills: [
    {
      invoice: "MCPL/25-26/0246", invoice_date: "01-12-2025",
      client: "STARWAYS INDUSTRIES- CHAKAN", origin: "PUNE", destination: "STG",
      mode: "TRAIN", awb: "203887", awb_date: "25-11-2025",
      box: "20-Bag", weight: "370", rate: "20", frieght: "7400",
      awb_charge: "100", pickup: "500", delivery: "1000",
      special_delivery: "0", other_charge: "0", gst: "YES"
    },
    {
      invoice: "MCPL/25-26/0245", invoice_date: "01-12-2025",
      client: "STARWAYS INDUSTRIES- CHAKAN", origin: "PUNE", destination: "STG",
      mode: "AIR", awb: "203780", awb_date: "01-11-2025",
      box: "1Bag+1Box", weight: "50", rate: "65", frieght: "3250",
      awb_charge: "100", pickup: "500", delivery: "1000",
      special_delivery: "0", other_charge: "0", gst: "YES"
    }
  ]
};

// ──────────────────────────────────────────────
// COLLECTION MAP & CACHE MAP
// ──────────────────────────────────────────────
const COLLECTION_MAP = {
  clients: "clients",
  cities: "cities",
  branches: "branches",
  vendors: "vendors",
  bookings: "bookings",
  lr_details: "bookings",
  bookings_combined: "bookings",
  bills: "bills",
  rates: "rates"
};

const CACHE_MAP = {
  clients: "clients",
  cities: "cities",
  branches: "branches",
  vendors: "vendors",
  bookings: "bookings",
  lr_details: "bookings",
  bookings_combined: "bookings",
  bills: "bills",
  rates: "rates"
};

// ──────────────────────────────────────────────
// FIELD MAPPING — CSV column → DB field
// ──────────────────────────────────────────────
function getDbKeyForExport(module, csvHeader, row) {
  if (module === 'branches') {
    if (csvHeader === 'branch_name') return 'branch';
    if (csvHeader === 'contact_person') return 'name';
    if (csvHeader === 'phone') return 'phno';
  } else if (module === 'vendors') {
    if (csvHeader === 'vendor_code') return 'vendorCode';
    if (csvHeader === 'contact_person') return 'contact';
  } else if (module === 'clients') {
    if (csvHeader === 'client_code') return 'clientCode';
    if (csvHeader === 'client_name') return 'name';
    if (csvHeader === 'contact_person') return 'contact';
  } else if (module === 'rates') {
    const rateMap = {
      awb_charge: 'awbCharge', air_rate: 'airRate', air_pickup: 'airPickup',
      air_delivery: 'airDelivery', train_rate: 'trainRate', train_pickup: 'trainPickup',
      train_delivery: 'trainDelivery', road_rate: 'roadRate', road_pickup: 'roadPickup',
      road_delivery: 'roadDelivery', road_express_rate: 'roadExpressRate',
      road_express_pickup: 'roadExpressPickup', road_express_delivery: 'roadExpressDelivery'
    };
    if (rateMap[csvHeader]) return rateMap[csvHeader];
  }
  return csvHeader;
}

// ──────────────────────────────────────────────
// FIX SCIENTIFIC NOTATION — "2.8211e+11" → "282110000000"
// ──────────────────────────────────────────────
function fixScientificNotation(val) {
  if (!val || typeof val !== 'string') return val;
  // Strip Excel formula wrapper ="..."
  val = val.replace(/^="?|"?$/g, '');
  // Fix scientific notation
  if (/^\d+(\.\d+)?e\+\d+$/i.test(val)) {
    try {
      return BigInt(Math.round(Number(val))).toString();
    } catch {
      return Number(val).toLocaleString('fullwide', { useGrouping: false });
    }
  }
  return val;
}

// ──────────────────────────────────────────────
// HELPER: Extract all booking fields from a DB document
// ──────────────────────────────────────────────
function extractBookingRow(b) {
  return {
    awb: b.awb || b.consignment || b.lrNo || '',
    date: b.date || b.dispatch_date || b.createdAt || '',
    mode: b.mode || 'Road',
    client: b.client || b.clientName || '',
    origin: b.origin || '',
    origin_state: b.originState || '',
    origin_code: b.originCode || '',
    destination: b.destination || '',
    dest_state: b.destState || '',
    dest_code: b.destCode || '',
    consignor: b.consignor || '',
    consignee: b.consignee || '',
    consignor_gst: b.consignorGst || '',
    consignee_gst: b.consigneeGst || '',
    client_gst: b.clientGst || '',
    box: b.box || b.boxes || b.pkg || b.packages || b.pkgs || '',
    actual_wt: b.actual_wt || b.actualWeight || b.actualWt || '',
    charge_wt: b.charge_wt || b.chargeWeight || b.chargeWt || '',
    type_of_delivery: b.type_of_delivery || b.deliveryType || 'Door',
    insured: b.insured || b.insuredBy || '',
    description: b.description || b.desc || b.goods || '',
    remarks: b.remarks || '',
    payment_mode: b.paymentMode || b.payment_mode || '',
    clerk_name: b.clerk_name || b.clerkName || 'Admin',
    status: b.status || 'Booked',
    frieght_charge: b.freight_charge || b.frieght_charge || b.frieght || b.freight || 0,
    awb_charge: b.awb_charge || b.awbCharge || 0,
    pickup_charge: b.pickup_charge || b.pickupCharge || 0,
    delivery_charge: b.delivery_charge || b.deliveryCharge || 0,
    packaging_charge: b.packaging_charge || b.packagingCharge || 0,
    handling_charge: b.handling_charge || b.handlingCharge || 0,
    insurance_charge: b.insurance_charge || b.insuranceCharge || 0,
    fuel_surcharge: b.fuel_surcharge || b.fuelSurcharge || 0
  };
}

// ──────────────────────────────────────────────
// HELPER: Map CSV row to booking DB document
// ──────────────────────────────────────────────
function csvRowToBookingDoc(row, user) {
  const clerkName = typeof user === 'string' ? user : (user?.name || 'Admin');
  const userId = typeof user === 'object' ? (user?.id || null) : null;
  const userEmail = typeof user === 'object' ? (user?.email || null) : null;

  return {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    awb: row.awb,
    consignment: row.awb,
    date: row.date || new Date().toISOString(),
    dispatch_date: row.date || '',
    mode: row.mode || 'Road',
    client: row.client || '',
    origin: row.origin || '',
    originState: row.origin_state || '',
    originCode: row.origin_code || '',
    destination: row.destination || '',
    destState: row.dest_state || '',
    destCode: row.dest_code || '',
    consignor: row.consignor || '',
    consignee: row.consignee || '',
    consignorGst: row.consignor_gst || '',
    consigneeGst: row.consignee_gst || '',
    clientGst: row.client_gst || '',
    box: row.box || '',
    actual_wt: row.actual_wt || '',
    charge_wt: row.charge_wt || '',
    type_of_delivery: row.type_of_delivery || 'Door',
    insured: row.insured || '',
    insuredBy: row.insured || '',
    description: row.description || '',
    remarks: row.remarks || '',
    paymentMode: row.payment_mode || '',
    clerk_name: row.clerk_name || clerkName,
    createdBy: clerkName,
    createdBy_id: userId,
    createdBy_email: userEmail,
    status: row.status || 'Booked',
    freight_charge: row.frieght_charge || '0',
    frieght: row.frieght_charge || '0',
    awb_charge: row.awb_charge || '0',
    pickup_charge: row.pickup_charge || '0',
    delivery_charge: row.delivery_charge || '0',
    packaging_charge: row.packaging_charge || '0',
    handling_charge: row.handling_charge || '0',
    insurance_charge: row.insurance_charge || '0',
    insuranceCharge: row.insurance_charge || '0',
    fuel_surcharge: row.fuel_surcharge || '0',
    fuelSurcharge: row.fuel_surcharge || '0',
    invoiceDetails: [],
    parcels: [],
    dimensions: []
  };
}

// ──────────────────────────────────────────────
// CSV SERIALIZATION
// ──────────────────────────────────────────────
function toCSV(headers, rows, module) {
  const headerLine = headers.join(",");
  const dataLines = rows.map((row) =>
    headers
      .map((h) => {
        const dbKey = getDbKeyForExport(module, h, row);
        const val = row[dbKey] !== undefined && row[dbKey] !== null ? String(row[dbKey]) : (row[h] !== undefined && row[h] !== null ? String(row[h]) : "");

        // Protect large numeric strings from Excel scientific notation
        if (['eway', 'ewayBill', 'invoice', 'part', 'awb', 'consignor_gst', 'consignee_gst', 'client_gst'].includes(h) || /^\d{10,}$/.test(val)) {
          return `="${val}"`;
        }

        return val.includes(",") ? `"${val}"` : val;
      })
      .join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

// ──────────────────────────────────────────────
// STREAMING CSV PARSER — handles 100K+ rows with O(1) memory
// ──────────────────────────────────────────────
function parseCSVStream(filePath, expectedHeaders) {
  return new Promise((resolve, reject) => {
    const results = [];
    let headersValid = true;
    let actualHeaders = [];
    let missingHeaders = [];

    fs.createReadStream(filePath, { highWaterMark: 64 * 1024 }) // 64KB buffer for fast streaming
      .pipe(csv())
      .on("headers", (headers) => {
        actualHeaders = headers.map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
        missingHeaders = expectedHeaders.filter(eh => !actualHeaders.includes(eh));
        if (missingHeaders.length > 0) {
          console.warn(`[CSV Import] Missing headers: ${missingHeaders.join(', ')}. Got: ${actualHeaders.join(', ')}. Continuing with available columns.`);
          // Don't fail — allow partial imports, just fill missing with empty
        }
      })
      .on("data", (data) => {
        const row = {};
        for (const key of expectedHeaders) {
          const actualKey = Object.keys(data).find(k => k.trim().toLowerCase().replace(/\s+/g, '_') === key);
          let val = actualKey && data[actualKey] ? String(data[actualKey]).trim() : "";
          // Strip Excel formula wrapper ="..."
          val = val.replace(/^="?|"?$/g, '');
          // Fix scientific notation on import
          val = fixScientificNotation(val);
          row[key] = val;
        }
        results.push(row);
      })
      .on("end", () => {
        resolve({ results, headersValid, actualHeaders, missingHeaders });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

// ──────────────────────────────────────────────
// EXPORT CSV
// ──────────────────────────────────────────────
exports.exportCSV = async (req, res) => {
  try {
    const { module } = req.params;
    const { search } = req.query;
    const collectionName = COLLECTION_MAP[module];
    const headers = MODULE_SCHEMAS[module];

    if (!collectionName || !headers) {
      return error(res, "Invalid module", 400);
    }

    let rows = [];

    if (module === 'bookings') {
      // ── Export bookings (AWB master data only)
      const snapshot = await db.collection("bookings").get();
      snapshot.forEach((doc) => {
        const b = doc.data();
        if (search) {
          const s = search.toLowerCase();
          const matches = (b.client || b.consignor || "").toLowerCase().includes(s) ||
                          (b.awb || b.lrNo || b.consignment || "").toLowerCase().includes(s) ||
                          (b.origin || "").toLowerCase().includes(s) ||
                          (b.destination || "").toLowerCase().includes(s);
          if (!matches) return;
        }
        rows.push(extractBookingRow(b));
      });

    } else if (module === 'lr_details') {
      // ── Export LR details (invoice line items from all bookings)
      const snapshot = await db.collection("bookings").get();
      snapshot.forEach((doc) => {
        const b = doc.data();
        const awb = b.awb || b.consignment || b.lrNo || '';
        if (search) {
          const s = search.toLowerCase();
          if (!awb.toLowerCase().includes(s) &&
              !(b.client || '').toLowerCase().includes(s)) return;
        }

        const parcels = (b.invoiceDetails && b.invoiceDetails.length > 0)
          ? b.invoiceDetails
          : (b.parcels || []);

        if (parcels.length > 0) {
          parcels.forEach(p => {
            rows.push({
              awb: awb,
              invdate: p.invdate || p.invoiceDate || '',
              value: p.value || p.invoiceValue || '',
              invoice: p.invoice || p.invoiceNo || '',
              part: p.part || p.partNumber || '',
              eway: p.eway || p.ewayBill || '',
              quantity: p.quantity || p.qty || ''
            });
          });
        }
      });

    } else if (module === 'bookings_combined') {
      // ── Export combined: booking fields + invoice line items per row
      const snapshot = await db.collection("bookings").get();
      snapshot.forEach((doc) => {
        const b = doc.data();
        if (search) {
          const s = search.toLowerCase();
          const awb = (b.awb || b.consignment || b.lrNo || '').toLowerCase();
          const matches = (b.client || b.consignor || "").toLowerCase().includes(s) ||
                          awb.includes(s) ||
                          (b.origin || "").toLowerCase().includes(s) ||
                          (b.destination || "").toLowerCase().includes(s);
          if (!matches) return;
        }

        const bookingFields = extractBookingRow(b);
        const parcels = (b.invoiceDetails && b.invoiceDetails.length > 0)
          ? b.invoiceDetails
          : (b.parcels || []);

        if (parcels.length > 0) {
          parcels.forEach(p => {
            rows.push({
              ...bookingFields,
              invdate: p.invdate || p.invoiceDate || '',
              value: p.value || p.invoiceValue || '',
              invoice: p.invoice || p.invoiceNo || '',
              part: p.part || p.partNumber || '',
              eway: p.eway || p.ewayBill || '',
              quantity: p.quantity || p.qty || ''
            });
          });
        } else {
          rows.push({
            ...bookingFields,
            invdate: '', value: '', invoice: '', part: '', eway: '', quantity: ''
          });
        }
      });

    } else if (module === 'bills') {
      // ── Export bills
      const snapshot = await db.collection("bills").get();
      snapshot.forEach((doc) => {
        const bill = doc.data();
        if (search) {
          const s = search.toLowerCase();
          const matches = (bill.billNo || bill.invoice || "").toLowerCase().includes(s) ||
                          (bill.client || "").toLowerCase().includes(s) ||
                          (bill.lrNo || bill.awb || "").toLowerCase().includes(s);
          if (!matches) return;
        }
        rows.push({
          invoice: bill.billNo || bill.invoice || '',
          invoice_date: bill.invoiceDate || bill.lrDate || bill.createdAt || '',
          client: bill.client || '',
          origin: bill.origin || '',
          destination: bill.destination || '',
          mode: bill.mode || '',
          awb: bill.lrNo || bill.awb || '',
          awb_date: bill.lrDate || '',
          box: bill.packages || bill.box || '',
          weight: bill.weight || '',
          rate: bill.rate || '',
          frieght: bill.freight || bill.frg || '',
          awb_charge: bill.lrCharge || bill.awbCharge || '',
          pickup: bill.pickupCharge || bill.pickup || '',
          delivery: bill.deliveryCharge || bill.delivery || '',
          special_delivery: bill.specialCharge || bill.special || '',
          other_charge: bill.otherCharge || bill.other || '',
          gst: bill.gst > 0 ? 'YES' : 'NO'
        });
      });

    } else {
      // ── Generic export for clients/cities/branches/vendors/rates
      const snapshot = await db.collection(collectionName).get();
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (search) {
          const s = search.toLowerCase();
          const matches = Object.values(data).some(val => String(val).toLowerCase().includes(s));
          if (!matches) return;
        }
        rows.push(data);
      });
    }

    const csvData = toCSV(headers, rows, module);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${module}_export.csv`);
    return res.send(csvData);
  } catch (err) {
    console.error(`Error exporting ${req.params.module}:`, err);
    return error(res, err);
  }
};

// ──────────────────────────────────────────────
// FIX SCIENTIFIC (migration endpoint)
// ──────────────────────────────────────────────
exports.fixScientific = async (req, res) => {
  try {
    const dbCollection = db.collection('bookings');
    const snapshot = await dbCollection.get();
    let updated = 0;

    const updates = [];
    snapshot.forEach(doc => {
      const b = doc.data();
      let changed = false;

      if (b.parcels && Array.isArray(b.parcels)) {
        b.parcels.forEach(p => {
          ['eway', 'ewayBill', 'invoice', 'invoiceNo', 'part', 'partNo', 'awb'].forEach(key => {
            if (p[key] && typeof p[key] === 'string' && /^\d+(\.\d+)?e\+\d+$/i.test(p[key])) {
              p[key] = fixScientificNotation(p[key]);
              changed = true;
            }
          });
        });
      }

      if (b.invoiceDetails && Array.isArray(b.invoiceDetails)) {
        b.invoiceDetails.forEach(inv => {
          ['eway', 'ewayBill', 'invoice', 'invoiceNo', 'part', 'partNo', 'awb'].forEach(key => {
            if (inv[key] && typeof inv[key] === 'string' && /^\d+(\.\d+)?e\+\d+$/i.test(inv[key])) {
              inv[key] = fixScientificNotation(inv[key]);
              changed = true;
            }
          });
        });
      }

      if (changed) {
        updates.push({ id: b.id || doc.id, parcels: b.parcels, invoiceDetails: b.invoiceDetails });
      }
    });

    for (let u of updates) {
      await dbCollection.doc(u.id).update({ parcels: u.parcels, invoiceDetails: u.invoiceDetails });
      updated++;
    }

    res.json({ success: true, updated });
  } catch (err) {
    console.error("Fix scientific error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ──────────────────────────────────────────────
// GET SAMPLE CSV
// ──────────────────────────────────────────────
exports.getSample = async (req, res) => {
  try {
    const { module } = req.params;
    const headers = MODULE_SCHEMAS[module];

    if (!headers) {
      return error(res, "Invalid module", 400);
    }

    const sampleRows = SAMPLE_DATA[module];
    if (sampleRows && sampleRows.length > 0) {
      const csvData = toCSV(headers, sampleRows, module);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${module}_sample.csv`);
      return res.send(csvData);
    }

    // Fallback: headers only
    const csvData = headers.join(",") + "\n";
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${module}_sample.csv`);
    return res.send(csvData);
  } catch (err) {
    console.error(`Error generating sample for ${req.params.module}:`, err);
    return error(res, err);
  }
};

// ──────────────────────────────────────────────
// IMPORT CSV — handles 100,000+ rows via streaming + chunked batch
// ──────────────────────────────────────────────
exports.importCSV = async (req, res) => {
  try {
    const { module } = req.params;
    const collectionName = COLLECTION_MAP[module];
    const expectedHeaders = MODULE_SCHEMAS[module];

    if (!collectionName || !expectedHeaders) {
      if (req.file) fs.unlinkSync(req.file.path);
      return error(res, "Invalid module", 400);
    }

    if (!req.file) {
      return error(res, "No CSV file uploaded", 400);
    }

    console.log(`[CSV Import] Starting import for module: ${module}, file: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

    // Stream-parse the CSV (handles 100K+ rows without loading all into memory at once)
    const { results, missingHeaders } = await parseCSVStream(req.file.path, expectedHeaders);

    // Cleanup uploaded temp file
    fs.unlinkSync(req.file.path);

    if (results.length === 0) {
      return error(res, "CSV file is empty or contains no valid data rows", 400);
    }

    console.log(`[CSV Import] Parsed ${results.length} rows for module: ${module}${missingHeaders.length > 0 ? ` (missing cols: ${missingHeaders.join(', ')})` : ''}`);

    // ── BOOKINGS IMPORT ──
    if (module === 'bookings') {
      const batch = db.batch();
      let importedCount = 0;

      for (const row of results) {
        const awb = row.awb;
        if (!awb) continue;

        const booking = csvRowToBookingDoc(row, req.user);
        const docRef = db.collection("bookings").doc(booking.id);
        batch.set(docRef, booking);
        importedCount++;
      }

      await batch.commit();
      await delCache(CACHE_MAP[module]);
      console.log(`[CSV Import] Bookings: ${importedCount} records imported`);
      return success(res, `Successfully imported ${importedCount} bookings`, { importedCount });
    }

    // ── BOOKINGS COMBINED IMPORT ──
    if (module === 'bookings_combined') {
      // Group rows by AWB — booking fields from first row, invoice details from all rows
      const bookingsByAwb = {};
      for (const row of results) {
        const awb = row.awb;
        if (!awb) continue;

        if (!bookingsByAwb[awb]) {
          bookingsByAwb[awb] = csvRowToBookingDoc(row, req.user);
        }

        // Add invoice/parcel data if any invoice column has data
        if (row.invdate || row.value || row.invoice || row.part || row.eway || row.quantity) {
          bookingsByAwb[awb].invoiceDetails.push({
            invoiceNo: row.invoice || '',
            invoiceValue: row.value || '',
            invoiceDate: row.invdate || '',
            partNumber: row.part || '',
            ewayBill: row.eway || '',
            quantity: row.quantity || ''
          });
          bookingsByAwb[awb].parcels.push({
            invoice: row.invoice || '',
            value: row.value || '',
            invdate: row.invdate || '',
            part: row.part || '',
            eway: row.eway || '',
            quantity: row.quantity || ''
          });
        }
      }

      const batch = db.batch();
      const uniqueBookings = Object.values(bookingsByAwb);
      for (const booking of uniqueBookings) {
        const docRef = db.collection("bookings").doc(booking.id);
        batch.set(docRef, booking);
      }
      await batch.commit();
      await delCache(CACHE_MAP[module]);
      console.log(`[CSV Import] Combined: ${uniqueBookings.length} bookings with nested parcels from ${results.length} rows`);
      return success(res, `Successfully imported ${uniqueBookings.length} bookings with ${results.length} total invoice rows`, { importedCount: uniqueBookings.length, totalRows: results.length });
    }

    // ── LR DETAILS IMPORT ──
    if (module === 'lr_details') {
      // Group rows by AWB
      const groupedByAwb = {};
      for (const row of results) {
        const awb = row.awb;
        if (!awb) continue;
        if (!groupedByAwb[awb]) groupedByAwb[awb] = [];
        groupedByAwb[awb].push({
          invoiceNo: row.invoice || '',
          invoiceValue: row.value || '',
          invoiceDate: row.invdate || '',
          partNumber: row.part || '',
          ewayBill: row.eway || '',
          quantity: row.quantity || ''
        });
      }

      const awbKeys = Object.keys(groupedByAwb);
      console.log(`[CSV Import] LR Details: ${results.length} rows across ${awbKeys.length} unique AWBs`);

      // Find matching bookings by AWB
      const snapshot = await db.collection("bookings").get();
      const existingBookings = {};
      snapshot.forEach(doc => {
        const b = doc.data();
        const awb = String(b.awb || b.consignment || b.lrNo || '').trim();
        if (awb) {
          existingBookings[awb] = { docId: doc.id, data: b };
        }
      });

      let updatedCount = 0;
      let skippedCount = 0;
      const skippedAwbs = [];

      for (const awb of awbKeys) {
        const invoiceRows = groupedByAwb[awb];
        const existing = existingBookings[awb];

        if (existing) {
          const newInvoiceDetails = invoiceRows.map(r => ({
            invoiceNo: r.invoiceNo,
            invoiceValue: r.invoiceValue,
            invoiceDate: r.invoiceDate,
            partNumber: r.partNumber,
            ewayBill: r.ewayBill,
            quantity: r.quantity
          }));

          const newParcels = invoiceRows.map(r => ({
            invoice: r.invoiceNo,
            value: r.invoiceValue,
            invdate: r.invoiceDate,
            part: r.partNumber,
            eway: r.ewayBill,
            quantity: r.quantity
          }));

          await db.collection("bookings").doc(existing.docId).update({
            invoiceDetails: newInvoiceDetails,
            parcels: newParcels
          });
          updatedCount++;
        } else {
          skippedCount++;
          if (skippedAwbs.length < 10) skippedAwbs.push(awb);
        }
      }

      await delCache(CACHE_MAP[module]);
      console.log(`[CSV Import] LR Details: ${updatedCount} bookings updated, ${skippedCount} AWBs not found`);

      let message = `Successfully imported LR details for ${updatedCount} bookings (${results.length} total rows)`;
      if (skippedCount > 0) {
        message += `. ${skippedCount} AWB(s) not found in bookings${skippedAwbs.length > 0 ? ': ' + skippedAwbs.join(', ') : ''}`;
      }
      return success(res, message, { updatedCount, skippedCount, totalRows: results.length });
    }

    // ── BILLS IMPORT ──
    if (module === 'bills') {
      const batch = db.batch();
      let importedCount = 0;

      for (const row of results) {
        const bill = {
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          billNo: row.invoice || '',
          invoice: row.invoice || '',
          invoiceDate: row.invoice_date || '',
          client: row.client || '',
          origin: row.origin || '',
          destination: row.destination || '',
          mode: row.mode || '',
          lrNo: row.awb || '',
          awb: row.awb || '',
          lrDate: row.awb_date || '',
          packages: row.box || '',
          box: row.box || '',
          weight: row.weight || '',
          rate: row.rate || '',
          freight: parseFloat(row.frieght || 0),
          lrCharge: parseFloat(row.awb_charge || 0),
          pickupCharge: parseFloat(row.pickup || 0),
          deliveryCharge: parseFloat(row.delivery || 0),
          specialCharge: parseFloat(row.special_delivery || 0),
          otherCharge: parseFloat(row.other_charge || 0),
          gst: (row.gst || '').toUpperCase() === 'YES' ? 18 : 0,
          status: 'pending'
        };

        // Calculate totals
        const taxable = bill.freight + bill.lrCharge + bill.pickupCharge +
                         bill.deliveryCharge + bill.specialCharge + bill.otherCharge;
        const gstAmt = taxable * bill.gst / 100;
        bill.taxable = taxable;
        bill.subtotal = taxable;
        bill.total = taxable + gstAmt;
        bill.totalPayable = taxable + gstAmt;
        bill.cgst = bill.gst > 0 ? gstAmt / 2 : 0;
        bill.sgst = bill.gst > 0 ? gstAmt / 2 : 0;
        bill.igst = 0;

        const docRef = db.collection("bills").doc(bill.id);
        batch.set(docRef, bill);
        importedCount++;
      }

      await batch.commit();
      await delCache(CACHE_MAP[module]);
      console.log(`[CSV Import] Bills: ${importedCount} records imported`);
      return success(res, `Successfully imported ${importedCount} bills`, { importedCount });
    }

    // ── GENERIC IMPORT (clients, cities, branches, vendors, rates) ──
    const batch = db.batch();
    for (const row of results) {
      row.id = uuidv4();
      row.createdAt = new Date().toISOString();

      // Map CSV column names to DB field names
      const mappedRow = { ...row };
      if (module === 'branches') {
        if (row.branch_name) { mappedRow.branch = row.branch_name; delete mappedRow.branch_name; }
        if (row.contact_person) { mappedRow.name = row.contact_person; delete mappedRow.contact_person; }
        if (row.phone) { mappedRow.phno = row.phone; delete mappedRow.phone; }
      } else if (module === 'vendors') {
        if (row.vendor_code) { mappedRow.vendorCode = row.vendor_code; delete mappedRow.vendor_code; }
        if (row.contact_person) { mappedRow.contact = row.contact_person; delete mappedRow.contact_person; }
      } else if (module === 'clients') {
        if (row.client_code) { mappedRow.clientCode = row.client_code; delete mappedRow.client_code; }
        if (row.client_name) { mappedRow.name = row.client_name; delete mappedRow.client_name; }
        if (row.contact_person) { mappedRow.contact = row.contact_person; delete mappedRow.contact_person; }
      } else if (module === 'rates') {
        const rateKeyMap = {
          awb_charge: 'awbCharge', air_rate: 'airRate', air_pickup: 'airPickup',
          air_delivery: 'airDelivery', train_rate: 'trainRate', train_pickup: 'trainPickup',
          train_delivery: 'trainDelivery', road_rate: 'roadRate', road_pickup: 'roadPickup',
          road_delivery: 'roadDelivery', road_express_rate: 'roadExpressRate',
          road_express_pickup: 'roadExpressPickup', road_express_delivery: 'roadExpressDelivery'
        };
        for (const [csvKey, dbKey] of Object.entries(rateKeyMap)) {
          if (row[csvKey] !== undefined) {
            mappedRow[dbKey] = row[csvKey];
            delete mappedRow[csvKey];
          }
        }
      }

      const docRef = db.collection(collectionName).doc(mappedRow.id);
      batch.set(docRef, mappedRow);
    }

    await batch.commit();
    if (CACHE_MAP[module]) {
      await delCache(CACHE_MAP[module]);
    }

    console.log(`[CSV Import] ${module}: ${results.length} records imported`);
    return success(res, `Successfully imported ${results.length} records into ${module}`, { importedCount: results.length });

  } catch (err) {
    console.error(`Error importing ${req.params.module}:`, err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return error(res, "Failed to import CSV", 500);
  }
};
