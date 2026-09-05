/**
 * Local SQL to MongoDB AWB Synchronization Service
 * Compares MySQL trip + lr_details with MongoDB bookings and feeds missing/updated records.
 */

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const { MongoClient } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
const { db } = require("../config/database");

let mysql = null;
try {
  mysql = require("mysql2/promise");
} catch (e) {
  // lazy loaded
}

let fallbackMongoClient = null;

/**
 * Ensures a connected MongoDB instance is available
 */
async function getMongoDbInstance() {
  if (db && db.mongoDb) {
    return db.mongoDb;
  }
  if (!fallbackMongoClient) {
    const mongoUri = (process.env.MONGODB_URI || "").replace(/^["']|["']$/g, "").trim();
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not set in environment variables");
    }
    fallbackMongoClient = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 8000 });
    await fallbackMongoClient.connect();
  }
  return fallbackMongoClient.db("multimarg");
}

// MySQL Connection Configuration strictly from Environment Variables
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || "3306", 10),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectTimeout: 10000
};

/**
 * Creates a dedicated MySQL connection
 */
async function getSqlConnection() {
  if (!mysql) {
    try {
      mysql = require("mysql2/promise");
    } catch (e) {
      throw new Error("mysql2 driver is not installed. Please install mysql2 in backend dependencies.");
    }
  }
  if (!MYSQL_CONFIG.host || !MYSQL_CONFIG.user || !MYSQL_CONFIG.password || !MYSQL_CONFIG.database) {
    throw new Error("Missing MySQL credentials in environment variables (MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE).");
  }
  return await mysql.createConnection(MYSQL_CONFIG);
}

/**
 * Tests connection to both MySQL and MongoDB
 */
async function testConnections() {
  const result = {
    mysql: { ok: false, message: "" },
    mongodb: { ok: false, message: "" }
  };

  // Test MySQL
  try {
    const conn = await getSqlConnection();
    const [rows] = await conn.query("SELECT DATABASE() as db, VERSION() as version;");
    await conn.end();
    result.mysql = {
      ok: true,
      message: `Connected to ${rows[0].db} (MySQL ${rows[0].version})`
    };
  } catch (err) {
    result.mysql = {
      ok: false,
      message: err.message
    };
  }

  // Test MongoDB
  try {
    const mongoDb = await getMongoDbInstance();
    const collections = await mongoDb.listCollections().toArray();
    result.mongodb = {
      ok: true,
      message: `Connected to MongoDB (${collections.length} collections)`
    };
  } catch (err) {
    result.mongodb = {
      ok: false,
      message: err.message
    };
  }

  return result;
}

/**
 * Formats a Date object or string to DD-MM-YYYY
 */
function formatDateDDMMYYYY(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Formats a Date to YYYY-MM-DD for SQL queries
 */
function formatDateYYYYMMDD(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Fetches all AWBs from MySQL from a given date and compares with MongoDB
 */
async function tallyAwbs({ fromDate, toDate }) {
  let conn;
  try {
    conn = await getSqlConnection();

    // 1. Build Query for MySQL Trips
    let query = "SELECT * FROM trip";
    const params = [];
    const conditions = [];

    if (fromDate) {
      conditions.push("date >= ?");
      params.push(formatDateYYYYMMDD(fromDate));
    }
    if (toDate) {
      conditions.push("date <= ?");
      params.push(formatDateYYYYMMDD(toDate));
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY date DESC, pid DESC";

    const [trips] = await conn.query(query, params);

    if (trips.length === 0) {
      return {
        summary: {
          totalInSql: 0,
          totalInMongo: 0,
          missingInMongoCount: 0,
          differentCount: 0,
          exactMatchCount: 0
        },
        missingInMongo: [],
        discrepancies: [],
        matched: []
      };
    }

    // 2. Extract AWBs and fetch associated lr_details (Invoices / items)
    const awbList = trips.map(t => String(t.awb).trim()).filter(Boolean);
    const uniqueAwbs = [...new Set(awbList)];

    let lrDetailsMap = {};
    if (uniqueAwbs.length > 0) {
      // Chunk AWBs in groups of 500 for SQL IN clause
      for (let i = 0; i < uniqueAwbs.length; i += 500) {
        const chunk = uniqueAwbs.slice(i, i + 500);
        const [lrRows] = await conn.query(
          "SELECT * FROM lr_details WHERE awb IN (?) ORDER BY pid ASC",
          [chunk]
        );
        for (const row of lrRows) {
          const rawAwb = String(row.awb).trim();
          if (!lrDetailsMap[rawAwb]) {
            lrDetailsMap[rawAwb] = [];
          }
          lrDetailsMap[rawAwb].push({
            invoiceDate: formatDateDDMMYYYY(row.invdate),
            invoiceValue: String(row.value || "").trim(),
            value: String(row.value || "").trim(),
            invoiceNo: String(row.invoice || "").trim(),
            invoice: String(row.invoice || "").trim(),
            partNumber: String(row.part || "").trim(),
            part: String(row.part || "").trim(),
            ewayBill: String(row.eway || "").trim(),
            eway: String(row.eway || "").trim(),
            quantity: String(row.quantity || "").trim()
          });
        }
      }
    }

    // 3. Fetch matching MongoDB bookings
    const mongoDb = await getMongoDbInstance();
    const mongoBookings = await mongoDb
      .collection("bookings")
      .find({ awb: { $in: uniqueAwbs } })
      .toArray();

    const mongoMap = new Map();
    for (const b of mongoBookings) {
      if (b.awb) {
        mongoMap.set(String(b.awb).trim().toLowerCase(), b);
      }
    }

    // 4. Compare MySQL vs MongoDB
    const missingInMongo = [];
    const discrepancies = [];
    const matched = [];

    const clean = (val) => String(val || "").trim();
    const cleanLower = (val) => clean(val).toLowerCase();
    const cleanNum = (val) => {
      const n = parseFloat(String(val || "0").replace(/,/g, ""));
      return isNaN(n) ? 0 : n;
    };

    // Fuzzy 90% and punctuation-tolerant matcher for names / places
    const normalizeName = (str) => {
      if (!str) return "";
      return String(str)
        .toLowerCase()
        .replace(/[.\-_,/#&()]/g, " ")
        .replace(/\bpvt\b|\bprivate\b/gi, "")
        .replace(/\bltd\b|\blimited\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    const calculateSimilarity = (str1, str2) => {
      const s1 = normalizeName(str1);
      const s2 = normalizeName(str2);
      if (s1 === s2) return 1.0;
      if (!s1 || !s2) return 0.0;

      const s1Compact = s1.replace(/\s+/g, "");
      const s2Compact = s2.replace(/\s+/g, "");
      if (s1Compact === s2Compact) return 1.0;

      const longerLength = Math.max(s1.length, s2.length);
      if (longerLength === 0) return 1.0;

      const costs = [];
      for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
          if (i === 0) costs[j] = j;
          else {
            if (j > 0) {
              let newValue = costs[j - 1];
              if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
              }
              costs[j - 1] = lastValue;
              lastValue = newValue;
            }
          }
        }
        if (i > 0) costs[s2.length] = lastValue;
      }
      const editDistance = costs[s2.length];
      return (longerLength - editDistance) / parseFloat(longerLength);
    };

    const isFuzzyMatch = (str1, str2, threshold = 0.90) => {
      if (!str1 && !str2) return true;
      if (!str1 || !str2) return false;
      return calculateSimilarity(str1, str2) >= threshold;
    };

    for (const trip of trips) {
      const awbKey = String(trip.awb).trim();
      const awbLower = awbKey.toLowerCase();
      const lrInvoices = lrDetailsMap[awbKey] || [];
      const sqlDateStr = formatDateDDMMYYYY(trip.date);

      const sqlRecord = {
        awb: awbKey,
        date: sqlDateStr,
        mode: String(trip.mode || "").trim(),
        client: String(trip.client || "").trim(),
        origin: String(trip.origin || "").trim(),
        destination: String(trip.destination || "").trim(),
        consignor: String(trip.consignor || "").trim(),
        consignee: String(trip.consignee || "").trim(),
        box: String(trip.box || "").trim(),
        actual_wt: Number(trip.actual_wt || 0).toFixed(2),
        charge_wt: Number(trip.charge_wt || 0).toFixed(2),
        type_of_delivery: String(trip.type_of_delivery || "").trim(),
        insuredBy: String(trip.insured || "").trim(),
        remarks: String(trip.remarks || "").trim(),
        clerk_name: String(trip.clerk_name || "").trim(),
        freight_charge: Number(trip.frieght_charge || 0).toFixed(2),
        awb_charge: Number(trip.awb_charge || 0).toFixed(2),
        pickup_charge: Number(trip.pickup_charge || 0).toFixed(2),
        delivery_charge: Number(trip.delivery_charge || 0).toFixed(2),
        packaging_charge: Number(trip.packaging_charge || 0).toFixed(2),
        handling_charge: Number(trip.handling_charge || 0).toFixed(2),
        invoiceDetails: lrInvoices,
        invoiceCount: lrInvoices.length
      };

      const mongoBooking = mongoMap.get(awbLower);

      if (!mongoBooking) {
        // Missing in Mongo entirely
        missingInMongo.push(sqlRecord);
      } else {
        // Check for exhaustive field and word-level discrepancies
        const diffs = [];

        // 1. Booking Date
        const mongoDate = clean(mongoBooking.date);
        if (sqlDateStr && mongoDate && sqlDateStr !== mongoDate) {
          diffs.push({
            column: "Booking Date",
            field: "date",
            sql: sqlDateStr,
            mongo: mongoDate,
            type: "Date Mismatch"
          });
        }

        // 2. Mode
        if (cleanLower(sqlRecord.mode) !== cleanLower(mongoBooking.mode)) {
          diffs.push({
            column: "Transport Mode",
            field: "mode",
            sql: sqlRecord.mode || "Road",
            mongo: mongoBooking.mode || "Road",
            type: "Mode Mismatch"
          });
        }

        // 3. Client (Fuzzy >=90% & punctuation tolerant)
        if (!isFuzzyMatch(sqlRecord.client, mongoBooking.client, 0.90)) {
          diffs.push({
            column: "Client / Billing Party",
            field: "client",
            sql: sqlRecord.client || "(empty)",
            mongo: mongoBooking.client || "(empty)",
            type: "Client Name Difference"
          });
        }

        // 4. Origin (Fuzzy >=90% match)
        if (!isFuzzyMatch(sqlRecord.origin, mongoBooking.origin, 0.90)) {
          diffs.push({
            column: "Origin (From City)",
            field: "origin",
            sql: sqlRecord.origin || "(empty)",
            mongo: mongoBooking.origin || "(empty)",
            type: "Route Difference"
          });
        }

        // 5. Destination (Fuzzy >=90% match)
        if (!isFuzzyMatch(sqlRecord.destination, mongoBooking.destination, 0.90)) {
          diffs.push({
            column: "Destination (To City)",
            field: "destination",
            sql: sqlRecord.destination || "(empty)",
            mongo: mongoBooking.destination || "(empty)",
            type: "Route Difference"
          });
        }

        // 6. Consignor (Fuzzy >=90% match)
        if (!isFuzzyMatch(sqlRecord.consignor, mongoBooking.consignor, 0.90)) {
          diffs.push({
            column: "Consignor (Shipper)",
            field: "consignor",
            sql: sqlRecord.consignor || "(empty)",
            mongo: mongoBooking.consignor || "(empty)",
            type: "Party Name Difference"
          });
        }

        // 7. Consignee (Fuzzy >=90% match)
        if (!isFuzzyMatch(sqlRecord.consignee, mongoBooking.consignee, 0.90)) {
          diffs.push({
            column: "Consignee (Receiver)",
            field: "consignee",
            sql: sqlRecord.consignee || "(empty)",
            mongo: mongoBooking.consignee || "(empty)",
            type: "Party Name Difference"
          });
        }

        // 8. Box Count
        const sqlBoxClean = clean(sqlRecord.box).replace(/[^0-9]/g, "");
        const mongoBoxClean = clean(mongoBooking.box).replace(/[^0-9]/g, "");
        if (sqlBoxClean !== mongoBoxClean) {
          diffs.push({
            column: "Boxes / Packages Count",
            field: "box",
            sql: sqlRecord.box || "0",
            mongo: mongoBooking.box || "0",
            type: "Quantity Discrepancy"
          });
        }

        // 9. Actual Weight
        if (cleanNum(sqlRecord.actual_wt) !== cleanNum(mongoBooking.actual_wt)) {
          diffs.push({
            column: "Actual Weight (kg)",
            field: "actual_wt",
            sql: `${sqlRecord.actual_wt} kg`,
            mongo: `${mongoBooking.actual_wt || 0} kg`,
            type: "Weight Discrepancy"
          });
        }

        // 10. Charge Weight
        if (cleanNum(sqlRecord.charge_wt) !== cleanNum(mongoBooking.charge_wt)) {
          diffs.push({
            column: "Charged Weight (kg)",
            field: "charge_wt",
            sql: `${sqlRecord.charge_wt} kg`,
            mongo: `${mongoBooking.charge_wt || 0} kg`,
            type: "Weight Discrepancy"
          });
        }

        // 11. Type of Delivery / Description
        const mongoDesc = mongoBooking.type_of_delivery || mongoBooking.description || "";
        const sqlDesc = sqlRecord.type_of_delivery || "";
        if (sqlDesc && mongoDesc && !isFuzzyMatch(sqlDesc, mongoDesc, 0.85)) {
          diffs.push({
            column: "Type of Delivery / Description",
            field: "type_of_delivery",
            sql: sqlRecord.type_of_delivery,
            mongo: mongoBooking.type_of_delivery || mongoBooking.description || "(empty)",
            type: "Description Discrepancy"
          });
        }

        // 12. Invoices & lr_details Detailed Breakdown
        const mongoInvoices = Array.isArray(mongoBooking.invoiceDetails) 
          ? mongoBooking.invoiceDetails 
          : (Array.isArray(mongoBooking.parcels) ? mongoBooking.parcels : []);

        if (lrInvoices.length !== mongoInvoices.length) {
          diffs.push({
            column: "Total Invoice Rows",
            field: "invoice_count",
            sql: `${lrInvoices.length} row(s) in lr_details`,
            mongo: `${mongoInvoices.length} row(s) in MongoDB`,
            type: "Invoice Count Mismatch"
          });
        } else {
          for (let i = 0; i < lrInvoices.length; i++) {
            const sqlInv = lrInvoices[i];
            const mongoInv = mongoInvoices[i] || {};
            
            const sqlInvNo = clean(sqlInv.invoiceNo || sqlInv.invoice);
            const mongoInvNo = clean(mongoInv.invoiceNo || mongoInv.invoice);
            if (sqlInvNo && mongoInvNo && !isFuzzyMatch(sqlInvNo, mongoInvNo, 0.90)) {
              diffs.push({
                column: `Invoice #${i + 1} Number`,
                field: `invoice_${i + 1}_number`,
                sql: sqlInvNo || "(empty)",
                mongo: mongoInvNo || "(empty)",
                type: "Invoice No Mismatch"
              });
            }

            const sqlPart = clean(sqlInv.partNumber || sqlInv.part);
            const mongoPart = clean(mongoInv.partNumber || mongoInv.part);
            if (sqlPart && mongoPart && !isFuzzyMatch(sqlPart, mongoPart, 0.90)) {
              diffs.push({
                column: `Invoice #${i + 1} Part No`,
                field: `invoice_${i + 1}_part`,
                sql: sqlPart || "(empty)",
                mongo: mongoPart || "(empty)",
                type: "Part No Mismatch"
              });
            }

            const sqlEway = clean(sqlInv.ewayBill || sqlInv.eway);
            const mongoEway = clean(mongoInv.ewayBill || mongoInv.eway);
            const sqlEwayClean = cleanLower(sqlEway).replace(/[\s\-_]/g, "");
            const mongoEwayClean = cleanLower(mongoEway).replace(/[\s\-_]/g, "");
            if (sqlEwayClean && mongoEwayClean && sqlEwayClean !== mongoEwayClean) {
              diffs.push({
                column: `Invoice #${i + 1} E-Way Bill`,
                field: `invoice_${i + 1}_eway`,
                sql: sqlEway || "(empty)",
                mongo: mongoEway || "(empty)",
                type: "E-Way Bill Discrepancy"
              });
            }

            const sqlQty = clean(sqlInv.quantity);
            const mongoQty = clean(mongoInv.quantity);
            const sqlQtyNum = cleanNum(sqlQty);
            const mongoQtyNum = cleanNum(mongoQty);
            if (sqlQtyNum !== mongoQtyNum) {
              diffs.push({
                column: `Invoice #${i + 1} Quantity`,
                field: `invoice_${i + 1}_quantity`,
                sql: `${sqlQty || 0} pcs`,
                mongo: `${mongoQty || 0} pcs`,
                type: "Quantity Discrepancy"
              });
            }

            if (cleanNum(sqlInv.invoiceValue || sqlInv.value) !== cleanNum(mongoInv.invoiceValue || mongoInv.value)) {
              diffs.push({
                column: `Invoice #${i + 1} Value`,
                field: `invoice_${i + 1}_value`,
                sql: `₹${sqlInv.invoiceValue || sqlInv.value || 0}`,
                mongo: `₹${mongoInv.invoiceValue || mongoInv.value || 0}`,
                type: "Invoice Value Discrepancy"
              });
            }
          }
        }

        const sqlFreight = cleanNum(sqlRecord.freight_charge);
        const mongoFreight = cleanNum(mongoBooking.freight_charge || mongoBooking.freight);
        const freightDelta = sqlFreight - mongoFreight;

        if (diffs.length > 0) {
          discrepancies.push({
            awb: awbKey,
            sqlRecord,
            mongoRecord: {
              id: mongoBooking.id || mongoBooking._id,
              date: mongoBooking.date,
              mode: mongoBooking.mode,
              client: mongoBooking.client,
              origin: mongoBooking.origin,
              destination: mongoBooking.destination,
              consignor: mongoBooking.consignor,
              consignee: mongoBooking.consignee,
              box: mongoBooking.box,
              actual_wt: mongoBooking.actual_wt,
              charge_wt: mongoBooking.charge_wt,
              freight_charge: mongoFreight,
              type_of_delivery: mongoBooking.type_of_delivery || mongoBooking.description,
              invoiceCount: mongoInvoices.length,
              invoiceDetails: mongoInvoices,
              status: mongoBooking.status,
              podUploaded: Boolean(mongoBooking.podUploaded || mongoBooking.podUrl)
            },
            currentMongoAmount: mongoFreight,
            targetSqlAmount: sqlFreight,
            amountDelta: freightDelta,
            diffs
          });
        } else {
          matched.push({
            awb: awbKey,
            date: sqlDateStr,
            client: sqlRecord.client,
            origin: sqlRecord.origin,
            destination: sqlRecord.destination,
            box: sqlRecord.box,
            freight: sqlFreight,
            invoiceCount: lrInvoices.length,
            mongoId: mongoBooking.id || mongoBooking._id
          });
        }
      }
    }

    // Financial impact calculation across AWBs
    let currentMongoFreightTotal = 0;
    let targetSqlFreightTotal = 0;

    for (const b of mongoBookings) {
      currentMongoFreightTotal += cleanNum(b.freight_charge || b.freight || 0);
    }
    for (const t of trips) {
      targetSqlFreightTotal += cleanNum(t.frieght_charge || 0);
    }

    const netFreightDifference = targetSqlFreightTotal - currentMongoFreightTotal;

    return {
      summary: {
        totalInSql: trips.length,
        totalInMongo: mongoBookings.length,
        missingInMongoCount: missingInMongo.length,
        differentCount: discrepancies.length,
        exactMatchCount: matched.length,
        financialImpact: {
          currentMongoTotal: currentMongoFreightTotal,
          targetSqlTotal: targetSqlFreightTotal,
          netDifference: netFreightDifference,
          label: "Freight Charges"
        }
      },
      missingInMongo,
      discrepancies,
      matched
    };
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Synchronizes selected or all missing AWBs into MongoDB
 */
async function syncAwbs({ fromDate, toDate, selectedAwbs = [], syncMode = "missing_only" }) {
  let conn;
  try {
    conn = await getSqlConnection();

    // 1. Fetch relevant SQL trips
    let query = "SELECT * FROM trip";
    const params = [];
    const conditions = [];

    if (Array.isArray(selectedAwbs) && selectedAwbs.length > 0) {
      conditions.push("awb IN (?)");
      params.push(selectedAwbs);
    } else {
      if (fromDate) {
        conditions.push("date >= ?");
        params.push(formatDateYYYYMMDD(fromDate));
      }
      if (toDate) {
        conditions.push("date <= ?");
        params.push(formatDateYYYYMMDD(toDate));
      }
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY date ASC, pid ASC";

    const [trips] = await conn.query(query, params);

    if (trips.length === 0) {
      return { success: true, inserted: 0, updated: 0, total: 0, message: "No trips found matching criteria." };
    }

    const uniqueAwbs = [...new Set(trips.map(t => String(t.awb).trim()).filter(Boolean))];

    // 2. Fetch lr_details
    let lrDetailsMap = {};
    if (uniqueAwbs.length > 0) {
      for (let i = 0; i < uniqueAwbs.length; i += 500) {
        const chunk = uniqueAwbs.slice(i, i + 500);
        const [lrRows] = await conn.query(
          "SELECT * FROM lr_details WHERE awb IN (?) ORDER BY pid ASC",
          [chunk]
        );
        for (const row of lrRows) {
          const rawAwb = String(row.awb).trim();
          if (!lrDetailsMap[rawAwb]) {
            lrDetailsMap[rawAwb] = [];
          }
          lrDetailsMap[rawAwb].push({
            invoiceDate: formatDateDDMMYYYY(row.invdate),
            invoiceValue: String(row.value || "").trim(),
            value: String(row.value || "").trim(),
            invoiceNo: String(row.invoice || "").trim(),
            invoice: String(row.invoice || "").trim(),
            partNumber: String(row.part || "").trim(),
            part: String(row.part || "").trim(),
            ewayBill: String(row.eway || "").trim(),
            eway: String(row.eway || "").trim(),
            quantity: String(row.quantity || "").trim()
          });
        }
      }
    }

    // 3. Fetch bills if any to attach bill numbers
    let billsMap = {};
    if (uniqueAwbs.length > 0) {
      for (let i = 0; i < uniqueAwbs.length; i += 500) {
        const chunk = uniqueAwbs.slice(i, i + 500);
        const [billRows] = await conn.query(
          "SELECT awb, invoice FROM bills WHERE awb IN (?)",
          [chunk]
        );
        for (const b of billRows) {
          if (b.awb && b.invoice) {
            billsMap[String(b.awb).trim()] = String(b.invoice).trim();
          }
        }
      }
    }

    // 4. Check existing in Mongo
    const mongoDb = await getMongoDbInstance();
    const existingMongo = await mongoDb
      .collection("bookings")
      .find({ awb: { $in: uniqueAwbs } })
      .toArray();

    const existingMap = new Map();
    for (const b of existingMongo) {
      if (b.awb) {
        existingMap.set(String(b.awb).trim().toLowerCase(), b);
      }
    }

    let insertedCount = 0;
    let updatedCount = 0;
    const syncLog = [];

    for (const trip of trips) {
      const awbKey = String(trip.awb).trim();
      const awbLower = awbKey.toLowerCase();
      const existing = existingMap.get(awbLower);
      const invoices = lrDetailsMap[awbKey] || [];
      const billNo = billsMap[awbKey] || (existing ? existing.billNo : "");
      const sqlDate = formatDateDDMMYYYY(trip.date);

      if (!existing) {
        // INSERT NEW BOOKING
        const newId = uuidv4();
        const doc = {
          _id: newId,
          id: newId,
          createdAt: trip.date ? new Date(trip.date).toISOString() : new Date().toISOString(),
          status: billNo ? "Billed" : "Booked",
          awb: awbKey,
          date: sqlDate,
          mode: String(trip.mode || "road").trim().toLowerCase(),
          client: String(trip.client || "").trim().toLowerCase(),
          origin: String(trip.origin || "").trim().toLowerCase(),
          destination: String(trip.destination || "").trim().toLowerCase(),
          consignor: String(trip.consignor || "").trim().toLowerCase(),
          consignee: String(trip.consignee || "").trim().toLowerCase(),
          box: String(trip.box || "").trim(),
          actual_wt: Number(trip.actual_wt || 0).toFixed(2),
          charge_wt: Number(trip.charge_wt || 0).toFixed(2),
          description: String(trip.type_of_delivery || "").trim().toLowerCase(),
          type_of_delivery: String(trip.type_of_delivery || "").trim().toLowerCase(),
          insuredBy: String(trip.insured || "client").trim().toLowerCase(),
          remarks: String(trip.remarks || "").trim().toLowerCase(),
          clerk_name: String(trip.clerk_name || "admin").trim().toLowerCase(),
          freight_charge: Number(trip.frieght_charge || 0).toFixed(2),
          awb_charge: Number(trip.awb_charge || 0).toFixed(2),
          pickup_charge: Number(trip.pickup_charge || 0).toFixed(2),
          delivery_charge: Number(trip.delivery_charge || 0).toFixed(2),
          packaging_charge: Number(trip.packaging_charge || 0).toFixed(2),
          handling_charge: Number(trip.handling_charge || 0).toFixed(2),
          invoiceDetails: invoices,
          parcels: invoices,
          billNo: billNo || "",
          billed: Boolean(billNo),
          syncedFromSql: true,
          syncedAt: new Date().toISOString()
        };

        await mongoDb.collection("bookings").insertOne(doc);
        insertedCount++;
        syncLog.push({ awb: awbKey, action: "INSERTED", invoices: invoices.length });
      } else if (syncMode === "update_all" || syncMode === "update_existing") {
        // UPDATE EXISTING (Preserve existing PODs and status)
        const updateDoc = {
          date: sqlDate || existing.date,
          mode: String(trip.mode || existing.mode || "road").trim().toLowerCase(),
          client: String(trip.client || existing.client || "").trim().toLowerCase(),
          origin: String(trip.origin || existing.origin || "").trim().toLowerCase(),
          destination: String(trip.destination || existing.destination || "").trim().toLowerCase(),
          consignor: String(trip.consignor || existing.consignor || "").trim().toLowerCase(),
          consignee: String(trip.consignee || existing.consignee || "").trim().toLowerCase(),
          box: String(trip.box || existing.box || "").trim(),
          actual_wt: Number(trip.actual_wt || existing.actual_wt || 0).toFixed(2),
          charge_wt: Number(trip.charge_wt || existing.charge_wt || 0).toFixed(2),
          description: String(trip.type_of_delivery || existing.description || "").trim().toLowerCase(),
          type_of_delivery: String(trip.type_of_delivery || existing.type_of_delivery || "").trim().toLowerCase(),
          invoiceDetails: invoices.length > 0 ? invoices : (existing.invoiceDetails || []),
          parcels: invoices.length > 0 ? invoices : (existing.parcels || []),
          updatedAt: new Date().toISOString(),
          syncedFromSql: true,
          syncedAt: new Date().toISOString()
        };

        updateDoc.billNo = billNo || "";
        updateDoc.billed = Boolean(billNo);
        updateDoc.status = billNo ? "Billed" : "Booked";

        await mongoDb.collection("bookings").updateOne(
          { _id: existing._id },
          { $set: updateDoc }
        );
        updatedCount++;
        syncLog.push({ awb: awbKey, action: "UPDATED", invoices: invoices.length });
      }
    }

    return {
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      total: trips.length,
      syncLog
    };
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Tallies Bills / Tax Invoices between MySQL `bills` and MongoDB `bills`
 */
async function tallyBills({ fromDate, toDate } = {}) {
  let conn;
  try {
    conn = await getSqlConnection();
    const mongoDb = await getMongoDbInstance();

    let sqlQuery = "SELECT * FROM bills WHERE 1=1";
    const sqlParams = [];

    if (fromDate) {
      sqlQuery += " AND invoice_date >= ?";
      sqlParams.push(fromDate);
    }
    if (toDate) {
      sqlQuery += " AND invoice_date <= ?";
      sqlParams.push(toDate);
    }
    sqlQuery += " ORDER BY pid DESC";

    const [rows] = await conn.query(sqlQuery, sqlParams);

    // Group MySQL rows by `invoice` (Bill Number)
    const sqlBillsMap = new Map();
    for (const r of rows) {
      const invNo = String(r.invoice || "").trim();
      if (!invNo) continue;
      const invKey = invNo.toLowerCase();

      if (!sqlBillsMap.has(invKey)) {
        const invDateObj = r.invoice_date ? new Date(r.invoice_date) : null;
        const invDateFormatted = invDateObj ? formatDateDDMMYYYY(invDateObj) : "";
        const invDateYMD = invDateObj ? invDateObj.toISOString().split("T")[0] : "";

        sqlBillsMap.set(invKey, {
          invoice: invNo,
          invoice_date: invDateFormatted,
          invoice_date_ymd: invDateYMD,
          client: String(r.client || "").trim(),
          origin: String(r.origin || "").trim(),
          destination: String(r.destination || "").trim(),
          mode: String(r.mode || "Road").trim(),
          gst: String(r.gst || "YES").trim().toUpperCase(),
          items: [],
          subtotal: 0,
          taxable: 0,
          gstAmt: 0,
          total: 0
        });
      }

      const bill = sqlBillsMap.get(invKey);
      const awbDateObj = r.awb_date ? new Date(r.awb_date) : null;
      const awbDateFormatted = awbDateObj ? formatDateDDMMYYYY(awbDateObj) : "";

      const frg = parseFloat(r.frieght || 0) || 0;
      const awbChg = parseFloat(r.awb_charge || 0) || 0;
      const pick = parseFloat(r.pickup || 0) || 0;
      const del = parseFloat(r.delivery || 0) || 0;
      const spl = parseFloat(r.special_delivery || 0) || 0;
      const oth = parseFloat(r.other_charge || 0) || 0;
      const lineTotal = frg + awbChg + pick + del + spl + oth;

      bill.items.push({
        pid: String(r.pid || uuidv4()),
        invoice: bill.invoice,
        invoice_date: bill.invoice_date,
        client: bill.client,
        origin: String(r.origin || "").trim(),
        destination: String(r.destination || "").trim(),
        mode: String(r.mode || "Road").trim(),
        awb: String(r.awb || "").trim(),
        awb_date: awbDateFormatted,
        box: String(r.box || "").trim(),
        weight: parseFloat(r.weight || 0) || 0,
        rate: parseFloat(r.rate || 0) || 0,
        frieght: frg.toFixed(2),
        awb_charge: awbChg.toFixed(2),
        pickup: pick.toFixed(2),
        delivery: del.toFixed(2),
        special_delivery: spl.toFixed(2),
        other_charge: oth.toFixed(2),
        gst: bill.gst,
        lineTotal: lineTotal.toFixed(2)
      });

      bill.subtotal += lineTotal;
    }

    // Compute bill totals
    for (const bill of sqlBillsMap.values()) {
      bill.taxable = bill.subtotal;
      bill.gstAmt = bill.gst === "YES" ? Math.round(bill.taxable * 0.18) : 0;
      bill.total = Math.round(bill.taxable + bill.gstAmt);
      bill.itemCount = bill.items.length;
    }

    // Fetch MongoDB bills
    const mongoBills = await mongoDb.collection("bills").find({}).toArray();
    const mongoBillsMap = new Map();
    for (const mb of mongoBills) {
      const bNo = String(mb.billNo || mb.invoice || "").trim();
      if (bNo) {
        mongoBillsMap.set(bNo.toLowerCase(), mb);
      }
    }

    // Comparison helpers
    const clean = (val) => String(val || "").trim();
    const cleanLower = (val) => clean(val).toLowerCase();
    const cleanNum = (val) => {
      const n = parseFloat(String(val || "0").replace(/,/g, ""));
      return isNaN(n) ? 0 : n;
    };

    const normalizeName = (str) => {
      if (!str) return "";
      return String(str)
        .toLowerCase()
        .replace(/[.\-_,/#&()]/g, " ")
        .replace(/\bpvt\b|\bprivate\b/gi, "")
        .replace(/\bltd\b|\blimited\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    const calculateSimilarity = (str1, str2) => {
      const s1 = normalizeName(str1);
      const s2 = normalizeName(str2);
      if (s1 === s2) return 1.0;
      if (!s1 || !s2) return 0.0;

      const s1Compact = s1.replace(/\s+/g, "");
      const s2Compact = s2.replace(/\s+/g, "");
      if (s1Compact === s2Compact) return 1.0;

      const longerLength = Math.max(s1.length, s2.length);
      if (longerLength === 0) return 1.0;

      const costs = [];
      for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
          if (i === 0) costs[j] = j;
          else {
            if (j > 0) {
              let newValue = costs[j - 1];
              if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
              }
              costs[j - 1] = lastValue;
              lastValue = newValue;
            }
          }
        }
        if (i > 0) costs[s2.length] = lastValue;
      }
      const editDistance = costs[s2.length];
      return (longerLength - editDistance) / parseFloat(longerLength);
    };

    const isFuzzyMatch = (str1, str2, threshold = 0.90) => {
      if (!str1 && !str2) return true;
      if (!str1 || !str2) return false;
      return calculateSimilarity(str1, str2) >= threshold;
    };

    const missingInMongo = [];
    const discrepancies = [];
    const matched = [];

    for (const [invKey, sqlBill] of sqlBillsMap.entries()) {
      const mongoBill = mongoBillsMap.get(invKey);

      if (!mongoBill) {
        missingInMongo.push({
          invoice: sqlBill.invoice,
          billNo: sqlBill.invoice,
          client: sqlBill.client,
          date: sqlBill.invoice_date,
          itemCount: sqlBill.itemCount,
          subtotal: sqlBill.subtotal,
          total: sqlBill.total,
          items: sqlBill.items,
          status: "Missing in MongoDB"
        });
      } else {
        const diffs = [];

        // 1. Client Match
        if (!isFuzzyMatch(sqlBill.client, mongoBill.client, 0.90)) {
          diffs.push({
            column: "Client / Billing Party",
            field: "client",
            sql: sqlBill.client || "(empty)",
            mongo: mongoBill.client || "(empty)",
            type: "Client Name Difference"
          });
        }

        // Date equality helper
        const areDatesEqual = (d1, d2) => {
          if (!d1 && !d2) return true;
          if (!d1 || !d2) return false;
          const s1 = String(d1).trim();
          const s2 = String(d2).trim();
          if (s1 === s2) return true;
          const toYMD = (str) => {
            if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
              const parts = str.split("-");
              return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
              return str.split("T")[0];
            }
            const d = new Date(str);
            return isNaN(d.getTime()) ? str : d.toISOString().split("T")[0];
          };
          return toYMD(s1) === toYMD(s2);
        };

        // 2. Bill Date Match
        const mongoDate = clean(mongoBill.invoice_date || mongoBill.billDate || mongoBill.date);
        if (sqlBill.invoice_date && mongoDate && !areDatesEqual(sqlBill.invoice_date, mongoDate) && !areDatesEqual(sqlBill.invoice_date_ymd, mongoDate)) {
          diffs.push({
            column: "Bill / Invoice Date",
            field: "date",
            sql: sqlBill.invoice_date,
            mongo: mongoDate,
            type: "Date Mismatch"
          });
        }

        // 3. Total Bill Amount
        if (Math.abs(cleanNum(sqlBill.total) - cleanNum(mongoBill.total || mongoBill.totalPayable || mongoBill.amount)) > 1) {
          diffs.push({
            column: "Total Amount (₹)",
            field: "total",
            sql: `₹${sqlBill.total}`,
            mongo: `₹${mongoBill.total || mongoBill.totalPayable || mongoBill.amount || 0}`,
            type: "Total Amount Discrepancy"
          });
        }

        // 4. Subtotal / Taxable Amount
        if (Math.abs(cleanNum(sqlBill.subtotal) - cleanNum(mongoBill.subtotal || mongoBill.taxable)) > 1) {
          diffs.push({
            column: "Taxable / Subtotal (₹)",
            field: "subtotal",
            sql: `₹${sqlBill.subtotal.toFixed(2)}`,
            mongo: `₹${(mongoBill.subtotal || mongoBill.taxable || 0).toLocaleString()}`,
            type: "Subtotal Discrepancy"
          });
        }

        // 5. Total Line Items (Linked AWBs)
        const mongoItems = Array.isArray(mongoBill.items) ? mongoBill.items : [];
        if (sqlBill.items.length !== mongoItems.length) {
          diffs.push({
            column: "Total Line Items (AWBs)",
            field: "item_count",
            sql: `${sqlBill.items.length} item(s) in SQL`,
            mongo: `${mongoItems.length} item(s) in MongoDB`,
            type: "Item Count Mismatch"
          });
        } else {
          for (let i = 0; i < sqlBill.items.length; i++) {
            const sqlIt = sqlBill.items[i];
            const mongoIt = mongoItems[i] || {};

            const sqlAwb = clean(sqlIt.awb);
            const mongoAwb = clean(mongoIt.awb || mongoIt.lrNo);
            if (cleanLower(sqlAwb) !== cleanLower(mongoAwb)) {
              diffs.push({
                column: `Item #${i + 1} AWB No`,
                field: `item_${i + 1}_awb`,
                sql: sqlAwb || "(empty)",
                mongo: mongoAwb || "(empty)",
                type: "AWB Mismatch"
              });
            }

            if (cleanNum(sqlIt.rate) !== cleanNum(mongoIt.rate)) {
              diffs.push({
                column: `Item #${i + 1} Rate`,
                field: `item_${i + 1}_rate`,
                sql: `₹${sqlIt.rate}`,
                mongo: `₹${mongoIt.rate || 0}`,
                type: "Rate Discrepancy"
              });
            }

            if (cleanNum(sqlIt.frieght) !== cleanNum(mongoIt.frieght || mongoIt.frg)) {
              diffs.push({
                column: `Item #${i + 1} Freight`,
                field: `item_${i + 1}_frieght`,
                sql: `₹${sqlIt.frieght}`,
                mongo: `₹${mongoIt.frieght || mongoIt.frg || 0}`,
                type: "Freight Discrepancy"
              });
            }
          }
        }

        const sqlTotalAmt = cleanNum(sqlBill.total);
        const mongoTotalAmt = cleanNum(mongoBill.total || mongoBill.totalPayable || mongoBill.amount || 0);
        const billDelta = sqlTotalAmt - mongoTotalAmt;

        if (diffs.length > 0) {
          discrepancies.push({
            invoice: sqlBill.invoice,
            billNo: sqlBill.invoice,
            sqlBill,
            mongoBill,
            currentMongoAmount: mongoTotalAmt,
            targetSqlAmount: sqlTotalAmt,
            amountDelta: billDelta,
            diffs,
            totalDiffs: diffs.length
          });
        } else {
          matched.push({
            invoice: sqlBill.invoice,
            billNo: sqlBill.invoice,
            client: sqlBill.client,
            date: sqlBill.invoice_date,
            total: sqlBill.total,
            itemCount: sqlBill.itemCount
          });
        }
      }
    }

    // Financial impact calculation across Bills
    let currentMongoBillsTotal = 0;
    let targetSqlBillsTotal = 0;

    for (const mb of mongoBillsMap.values()) {
      currentMongoBillsTotal += cleanNum(mb.total || mb.totalPayable || mb.amount || 0);
    }
    for (const sb of sqlBillsMap.values()) {
      targetSqlBillsTotal += cleanNum(sb.total || 0);
    }

    const netBillsDifference = targetSqlBillsTotal - currentMongoBillsTotal;

    return {
      success: true,
      summary: {
        totalInSql: sqlBillsMap.size,
        totalInMongo: mongoBillsMap.size,
        missingInMongoCount: missingInMongo.length,
        differentCount: discrepancies.length,
        exactMatchCount: matched.length,
        financialImpact: {
          currentMongoTotal: currentMongoBillsTotal,
          targetSqlTotal: targetSqlBillsTotal,
          netDifference: netBillsDifference,
          label: "Total Bill Amount"
        }
      },
      missingInMongo,
      discrepancies,
      matched
    };
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Synchronizes MySQL `bills` into MongoDB collection `bills`
 */
async function syncBills({ fromDate, toDate, selectedBills, syncMode = "missing_only" } = {}) {
  let conn;
  try {
    conn = await getSqlConnection();
    const mongoDb = await getMongoDbInstance();

    let sqlQuery = "SELECT * FROM bills WHERE 1=1";
    const sqlParams = [];

    if (fromDate) {
      sqlQuery += " AND invoice_date >= ?";
      sqlParams.push(fromDate);
    }
    if (toDate) {
      sqlQuery += " AND invoice_date <= ?";
      sqlParams.push(toDate);
    }
    sqlQuery += " ORDER BY pid DESC";

    const [rows] = await conn.query(sqlQuery, sqlParams);

    // Group MySQL rows by `invoice`
    const sqlBillsMap = new Map();
    for (const r of rows) {
      const invNo = String(r.invoice || "").trim();
      if (!invNo) continue;
      const invKey = invNo.toLowerCase();

      if (!sqlBillsMap.has(invKey)) {
        const invDateObj = r.invoice_date ? new Date(r.invoice_date) : null;
        const invDateFormatted = invDateObj ? formatDateDDMMYYYY(invDateObj) : "";
        const invDateYMD = invDateObj ? invDateObj.toISOString().split("T")[0] : "";

        sqlBillsMap.set(invKey, {
          invoice: invNo,
          invoice_date: invDateFormatted,
          invoice_date_ymd: invDateYMD,
          client: String(r.client || "").trim(),
          origin: String(r.origin || "").trim(),
          destination: String(r.destination || "").trim(),
          mode: String(r.mode || "Road").trim(),
          gst: String(r.gst || "YES").trim().toUpperCase(),
          items: [],
          subtotal: 0,
          taxable: 0,
          gstAmt: 0,
          total: 0
        });
      }

      const bill = sqlBillsMap.get(invKey);
      const awbDateObj = r.awb_date ? new Date(r.awb_date) : null;
      const awbDateFormatted = awbDateObj ? formatDateDDMMYYYY(awbDateObj) : "";
      const awbDateYMD = awbDateObj ? awbDateObj.toISOString().split("T")[0] : "";

      const frg = parseFloat(r.frieght || 0) || 0;
      const awbChg = parseFloat(r.awb_charge || 0) || 0;
      const pick = parseFloat(r.pickup || 0) || 0;
      const del = parseFloat(r.delivery || 0) || 0;
      const spl = parseFloat(r.special_delivery || 0) || 0;
      const oth = parseFloat(r.other_charge || 0) || 0;
      const lineTotal = frg + awbChg + pick + del + spl + oth;

      bill.items.push({
        pid: String(r.pid || uuidv4()),
        lrNo: String(r.awb || "").trim(),
        lrDt: awbDateYMD || awbDateFormatted,
        ref: "-",
        org: String(r.origin || "").trim().toLowerCase(),
        dest: String(r.destination || "").trim().toLowerCase(),
        pkg: parseInt(String(r.box || "0").replace(/[^0-9]/g, ""), 10) || 0,
        wt: String(r.weight || "0"),
        rate: parseFloat(r.rate || 0) || 0,
        frg: frg.toFixed(2),
        lr: awbChg > 0 ? String(awbChg) : "",
        pick: pick.toFixed(2),
        del: del.toFixed(2),
        spl: spl.toFixed(2),
        oth: oth.toFixed(2),
        total: lineTotal.toFixed(2),
        invoice: bill.invoice,
        invoice_date: bill.invoice_date_ymd || bill.invoice_date,
        client: bill.client.toLowerCase(),
        origin: String(r.origin || "").trim().toLowerCase(),
        destination: String(r.destination || "").trim().toLowerCase(),
        mode: String(r.mode || "Road").trim().toLowerCase(),
        awb: String(r.awb || "").trim(),
        awb_date: awbDateYMD || awbDateFormatted,
        box: String(r.box || "").trim(),
        weight: parseFloat(r.weight || 0) || 0,
        frieght: frg.toFixed(2),
        awb_charge: awbChg,
        pickup: pick.toFixed(2),
        delivery: del.toFixed(2),
        special_delivery: spl.toFixed(2),
        other_charge: oth.toFixed(2),
        gst: bill.gst.toLowerCase()
      });

      bill.subtotal += lineTotal;
    }

    for (const bill of sqlBillsMap.values()) {
      bill.taxable = bill.subtotal;
      bill.gstAmt = bill.gst === "YES" ? Math.round(bill.taxable * 0.18) : 0;
      bill.total = Math.round(bill.taxable + bill.gstAmt);
      bill.itemCount = bill.items.length;
    }

    let billsToProcess = Array.from(sqlBillsMap.values());
    if (selectedBills && Array.isArray(selectedBills) && selectedBills.length > 0) {
      const selectedSet = new Set(selectedBills.map(b => String(b).trim().toLowerCase()));
      billsToProcess = billsToProcess.filter(b => selectedSet.has(b.invoice.toLowerCase()));
    }

    let insertedCount = 0;
    let updatedCount = 0;
    const syncLog = [];

    for (const b of billsToProcess) {
      const invKey = b.invoice.toLowerCase();
      const existing = await mongoDb.collection("bills").findOne({
        $or: [
          { billNo: { $regex: new RegExp(`^${b.invoice}$`, "i") } },
          { invoice: { $regex: new RegExp(`^${b.invoice}$`, "i") } }
        ]
      });

      if (!existing) {
        // INSERT NEW BILL
        const doc = {
          id: uuidv4(),
          invoice: b.invoice,
          billNo: b.invoice,
          invoice_date: b.invoice_date_ymd || b.invoice_date,
          billDate: b.invoice_date_ymd || b.invoice_date,
          date: b.invoice_date_ymd || b.invoice_date,
          createdAt: b.invoice_date_ymd || new Date().toISOString().split("T")[0],
          client: b.client.toLowerCase(),
          clientAddress: "",
          gstin: "",
          mode: b.mode.toLowerCase(),
          sacCode: "996511",
          stateCode: "27",
          status: "Unpaid",
          subtotal: b.subtotal,
          taxable: b.taxable,
          gst: b.gst === "YES" ? 18 : 0,
          cgst: 0,
          sgst: 0,
          igst: b.gstAmt,
          gstAmt: b.gstAmt,
          total: b.total,
          totalPayable: b.total,
          amount: b.total,
          paidAmount: 0,
          debtAmount: 0,
          tdsAmount: 0,
          items: b.items,
          syncedFromSql: true,
          syncedAt: new Date().toISOString()
        };

        await mongoDb.collection("bills").insertOne(doc);
        insertedCount++;
        syncLog.push({ invoice: b.invoice, action: "INSERTED", items: b.items.length });
      } else if (syncMode === "update_all" || syncMode === "update_existing") {
        // UPDATE EXISTING BILL
        const updateDoc = {
          client: b.client.toLowerCase(),
          invoice_date: b.invoice_date_ymd || existing.invoice_date || b.invoice_date,
          billDate: b.invoice_date_ymd || existing.billDate || b.invoice_date,
          subtotal: b.subtotal,
          taxable: b.taxable,
          gst: b.gst === "YES" ? 18 : 0,
          igst: b.gstAmt,
          gstAmt: b.gstAmt,
          total: b.total,
          totalPayable: b.total,
          amount: b.total,
          items: b.items.length > 0 ? b.items : (existing.items || []),
          syncedFromSql: true,
          syncedAt: new Date().toISOString()
        };

        await mongoDb.collection("bills").updateOne(
          { _id: existing._id },
          { $set: updateDoc }
        );
        updatedCount++;
        syncLog.push({ invoice: b.invoice, action: "UPDATED", items: b.items.length });
      }
    }

    // Automatically recalculate client settlements and outstanding
    try {
      const { db: adapter, initMongo } = require("../config/database");
      if (!adapter.mongoDb) await initMongo();
      const { recalculatePartyPayments } = require("../utils/paymentUtils");
      const clientSet = new Set(billsToProcess.map(b => String(b.client || "").toLowerCase().trim()).filter(Boolean));
      for (const cName of clientSet) {
        await recalculatePartyPayments("Client", cName, true);
      }
      const { delCache } = require("../config/redis");
      await Promise.all([
        delCache("bills"),
        delCache("outstanding"),
        delCache("cashEntries"),
        delCache("analytics")
      ]);
    } catch (rErr) {
      console.error("[SQL Sync] Recalculate bills warning:", rErr.message);
    }

    return {
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      total: billsToProcess.length,
      syncLog
    };
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Tallies Vendor Purchase Bills between MySQL `purchase` and MongoDB `purchases`
 */
async function tallyPurchases({ fromDate, toDate } = {}) {
  let conn;
  try {
    conn = await getSqlConnection();
    const mongoDb = await getMongoDbInstance();

    let sqlQuery = "SELECT * FROM purchase WHERE 1=1";
    const sqlParams = [];

    if (fromDate) {
      sqlQuery += " AND date >= ?";
      sqlParams.push(fromDate);
    }
    if (toDate) {
      sqlQuery += " AND date <= ?";
      sqlParams.push(toDate);
    }
    sqlQuery += " ORDER BY pid DESC";

    const [sqlPurchases] = await conn.query(sqlQuery, sqlParams);
    const mongoPurchases = await mongoDb.collection("purchases").find({}).toArray();

    const mongoPurchasesMap = new Map();
    for (const mp of mongoPurchases) {
      const bKey = String(mp.billNo || mp.bill || "").trim().toLowerCase();
      if (bKey) {
        mongoPurchasesMap.set(bKey, mp);
      }
    }

    const clean = (val) => String(val || "").trim();
    const cleanLower = (val) => clean(val).toLowerCase();
    const cleanNum = (val) => {
      const n = parseFloat(String(val || "0").replace(/,/g, ""));
      return isNaN(n) ? 0 : n;
    };

    const normalizeName = (str) => {
      if (!str) return "";
      return String(str)
        .toLowerCase()
        .replace(/[.\-_,/#&()]/g, " ")
        .replace(/\bpvt\b|\bprivate\b/gi, "")
        .replace(/\bltd\b|\blimited\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    const calculateSimilarity = (str1, str2) => {
      const s1 = normalizeName(str1);
      const s2 = normalizeName(str2);
      if (s1 === s2) return 1.0;
      if (!s1 || !s2) return 0.0;
      const s1Compact = s1.replace(/\s+/g, "");
      const s2Compact = s2.replace(/\s+/g, "");
      if (s1Compact === s2Compact) return 1.0;
      const longerLength = Math.max(s1.length, s2.length);
      if (longerLength === 0) return 1.0;
      const costs = [];
      for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
          if (i === 0) costs[j] = j;
          else {
            if (j > 0) {
              let newValue = costs[j - 1];
              if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
              }
              costs[j - 1] = lastValue;
              lastValue = newValue;
            }
          }
        }
        if (i > 0) costs[s2.length] = lastValue;
      }
      return (longerLength - costs[s2.length]) / parseFloat(longerLength);
    };

    const isFuzzyMatch = (str1, str2, threshold = 0.90) => {
      if (!str1 && !str2) return true;
      if (!str1 || !str2) return false;
      return calculateSimilarity(str1, str2) >= threshold;
    };

    const areDatesEqual = (d1, d2) => {
      if (!d1 && !d2) return true;
      if (!d1 || !d2) return false;
      const s1 = String(d1).trim();
      const s2 = String(d2).trim();
      if (s1 === s2) return true;
      const toYMD = (str) => {
        if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
          const parts = str.split("-");
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split("T")[0];
        const d = new Date(str);
        return isNaN(d.getTime()) ? str : d.toISOString().split("T")[0];
      };
      return toYMD(s1) === toYMD(s2);
    };

    const missingInMongo = [];
    const discrepancies = [];
    const matched = [];

    for (const sp of sqlPurchases) {
      const rawBill = String(sp.bill || "").trim();
      const fallbackBill = rawBill || `VCH-00${sp.pid}`;
      const billKey = fallbackBill.toLowerCase();
      const pDateObj = sp.date ? new Date(sp.date) : null;
      const dateFormatted = pDateObj ? formatDateDDMMYYYY(pDateObj) : "";
      const dateYMD = pDateObj ? pDateObj.toISOString().split("T")[0] : "";

      const sqlRecord = {
        pid: sp.pid,
        billNo: fallbackBill,
        bill: fallbackBill,
        vendor: String(sp.vendor || "").trim(),
        date: dateFormatted,
        date_ymd: dateYMD,
        subtotal: cleanNum(sp.subtotal),
        gst: cleanNum(sp.gst),
        total: cleanNum(sp.total),
        bill_upload: sp.bill_upload || ""
      };

      let mongoP = mongoPurchasesMap.get(billKey);
      if (!mongoP && !rawBill) {
        mongoP = mongoPurchases.find(mp => 
          normalizeName(mp.vendor) === normalizeName(sqlRecord.vendor) &&
          areDatesEqual(mp.date, dateYMD) &&
          Math.abs(cleanNum(mp.total) - sqlRecord.total) < 1
        );
      }

      if (!mongoP) {
        missingInMongo.push(sqlRecord);
      } else {
        const diffs = [];

        // 1. Vendor Name Match
        if (!isFuzzyMatch(sqlRecord.vendor, mongoP.vendor, 0.90)) {
          diffs.push({
            column: "Vendor Name",
            field: "vendor",
            sql: sqlRecord.vendor || "(empty)",
            mongo: mongoP.vendor || "(empty)",
            type: "Vendor Name Difference"
          });
        }

        // 2. Date Match
        const mongoDate = clean(mongoP.date);
        if (sqlRecord.date && mongoDate && !areDatesEqual(sqlRecord.date, mongoDate) && !areDatesEqual(sqlRecord.date_ymd, mongoDate)) {
          diffs.push({
            column: "Purchase Date",
            field: "date",
            sql: sqlRecord.date,
            mongo: mongoDate,
            type: "Date Mismatch"
          });
        }

        // 3. Subtotal / Taxable
        const mongoSubtotal = cleanNum(mongoP.subtotal || mongoP.taxable);
        if (Math.abs(sqlRecord.subtotal - mongoSubtotal) > 1) {
          diffs.push({
            column: "Taxable / Subtotal (₹)",
            field: "subtotal",
            sql: `₹${sqlRecord.subtotal.toFixed(2)}`,
            mongo: `₹${mongoSubtotal.toFixed(2)}`,
            type: "Subtotal Discrepancy"
          });
        }

        // 4. GST Amount
        const mongoGst = cleanNum(mongoP.gst);
        if (Math.abs(sqlRecord.gst - mongoGst) > 1) {
          diffs.push({
            column: "GST Amount (₹)",
            field: "gst",
            sql: `₹${sqlRecord.gst.toFixed(2)}`,
            mongo: `₹${mongoGst.toFixed(2)}`,
            type: "GST Discrepancy"
          });
        }

        // 5. Total Amount
        const mongoTotal = cleanNum(mongoP.total);
        if (Math.abs(sqlRecord.total - mongoTotal) > 1) {
          diffs.push({
            column: "Total Bill Amount (₹)",
            field: "total",
            sql: `₹${sqlRecord.total.toFixed(2)}`,
            mongo: `₹${mongoTotal.toFixed(2)}`,
            type: "Total Amount Discrepancy"
          });
        }

        const billDelta = sqlRecord.total - mongoTotal;

        if (diffs.length > 0) {
          discrepancies.push({
            billNo: sqlRecord.billNo,
            bill: sqlRecord.billNo,
            invoice: sqlRecord.billNo,
            sqlRecord,
            mongoRecord: mongoP,
            currentMongoAmount: mongoTotal,
            targetSqlAmount: sqlRecord.total,
            amountDelta: billDelta,
            diffs,
            totalDiffs: diffs.length
          });
        } else {
          matched.push({
            billNo: sqlRecord.billNo,
            bill: sqlRecord.billNo,
            vendor: sqlRecord.vendor,
            date: sqlRecord.date,
            total: sqlRecord.total,
            paidAmount: cleanNum(mongoP.paidAmount)
          });
        }
      }
    }

    let currentMongoTotal = 0;
    let targetSqlTotal = 0;
    for (const mp of mongoPurchases) currentMongoTotal += cleanNum(mp.total || 0);
    for (const sp of sqlPurchases) targetSqlTotal += cleanNum(sp.total || 0);

    return {
      success: true,
      summary: {
        totalInSql: sqlPurchases.length,
        totalInMongo: mongoPurchases.length,
        missingInMongoCount: missingInMongo.length,
        differentCount: discrepancies.length,
        exactMatchCount: matched.length,
        financialImpact: {
          currentMongoTotal,
          targetSqlTotal,
          netDifference: targetSqlTotal - currentMongoTotal,
          label: "Purchase Bills Value"
        }
      },
      missingInMongo,
      discrepancies,
      matched
    };
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Synchronizes MySQL `purchase` bills into MongoDB `purchases`
 */
async function syncPurchases({ fromDate, toDate, selectedPurchases, syncMode = "missing_only" } = {}) {
  let conn;
  try {
    conn = await getSqlConnection();
    const mongoDb = await getMongoDbInstance();

    let sqlQuery = "SELECT * FROM purchase WHERE 1=1";
    const sqlParams = [];

    if (fromDate) {
      sqlQuery += " AND date >= ?";
      sqlParams.push(fromDate);
    }
    if (toDate) {
      sqlQuery += " AND date <= ?";
      sqlParams.push(toDate);
    }
    sqlQuery += " ORDER BY pid DESC";

    const [sqlPurchases] = await conn.query(sqlQuery, sqlParams);
    let purchasesToProcess = sqlPurchases;

    if (selectedPurchases && Array.isArray(selectedPurchases) && selectedPurchases.length > 0) {
      const selectedSet = new Set(selectedPurchases.map(b => String(b).trim().toLowerCase()));
      purchasesToProcess = purchasesToProcess.filter(p => {
        const raw = String(p.bill || "").trim().toLowerCase();
        const fallback = (raw || `vch-00${p.pid}`).toLowerCase();
        return selectedSet.has(raw) || selectedSet.has(fallback) || selectedSet.has(String(p.pid));
      });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    const syncLog = [];

    for (const sp of purchasesToProcess) {
      const rawBill = String(sp.bill || "").trim();
      const billKey = rawBill || `VCH-00${sp.pid}`;

      const pDateObj = sp.date ? new Date(sp.date) : null;
      const dateYMD = pDateObj ? pDateObj.toISOString().split("T")[0] : "";

      const existing = await mongoDb.collection("purchases").findOne({
        $or: [
          { billNo: { $regex: new RegExp(`^${billKey}$`, "i") } },
          { bill: { $regex: new RegExp(`^${billKey}$`, "i") } }
        ]
      });

      if (!existing) {
        // INSERT NEW PURCHASE
        const doc = {
          id: uuidv4(),
          vendor: String(sp.vendor || "").trim().toLowerCase(),
          billNo: billKey,
          bill: billKey,
          date: dateYMD,
          taxable: parseFloat(sp.subtotal || 0) || 0,
          subtotal: parseFloat(sp.subtotal || 0) || 0,
          gst: parseFloat(sp.gst || 0) || 0,
          total: parseFloat(sp.total || 0) || 0,
          paidAmount: 0,
          status: "Unpaid",
          createdAt: new Date().toISOString(),
          debtAmount: 0,
          tdsAmount: 0,
          syncedFromSql: true,
          syncedAt: new Date().toISOString()
        };

        await mongoDb.collection("purchases").insertOne(doc);
        insertedCount++;
        syncLog.push({ billNo: billKey, action: "INSERTED" });
      } else if (syncMode === "update_all" || syncMode === "update_existing") {
        // UPDATE EXISTING PURCHASE (Preserve paidAmount and status)
        const updateDoc = {
          vendor: String(sp.vendor || "").trim().toLowerCase(),
          date: dateYMD || existing.date,
          taxable: parseFloat(sp.subtotal || 0) || 0,
          subtotal: parseFloat(sp.subtotal || 0) || 0,
          gst: parseFloat(sp.gst || 0) || 0,
          total: parseFloat(sp.total || 0) || 0,
          syncedFromSql: true,
          syncedAt: new Date().toISOString()
        };

        await mongoDb.collection("purchases").updateOne(
          { _id: existing._id },
          { $set: updateDoc }
        );
        updatedCount++;
        syncLog.push({ billNo: billKey, action: "UPDATED" });
      }
    }

    // Automatically recalculate vendor purchase settlements and outstanding
    try {
      const { db: adapter, initMongo } = require("../config/database");
      if (!adapter.mongoDb) await initMongo();
      const { recalculatePartyPayments } = require("../utils/paymentUtils");
      const vendorSet = new Set(purchasesToProcess.map(p => String(p.vendor || "").toLowerCase().trim()).filter(Boolean));
      for (const vName of vendorSet) {
        await recalculatePartyPayments("Vendor", vName, true);
      }
      const { delCache } = require("../config/redis");
      await Promise.all([
        delCache("purchases"),
        delCache("vendorOutstanding"),
        delCache("cashEntries"),
        delCache("outstanding"),
        delCache("analytics")
      ]);
    } catch (rErr) {
      console.error("[SQL Sync] Recalculate purchases warning:", rErr.message);
    }

    return {
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      total: purchasesToProcess.length,
      syncLog
    };
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Tallies Vendor Payments / Paid Vouchers between MySQL `vendor_outstanding` and MongoDB `vendorOutstanding`
 */
async function tallyVendorPayments({ fromDate, toDate } = {}) {
  let conn;
  try {
    conn = await getSqlConnection();
    const mongoDb = await getMongoDbInstance();

    let sqlQuery = "SELECT * FROM vendor_outstanding WHERE 1=1";
    const sqlParams = [];

    if (fromDate) {
      sqlQuery += " AND date >= ?";
      sqlParams.push(fromDate);
    }
    if (toDate) {
      sqlQuery += " AND date <= ?";
      sqlParams.push(toDate);
    }
    sqlQuery += " ORDER BY pid DESC";

    const [sqlPayments] = await conn.query(sqlQuery, sqlParams);
    const mongoPayments = await mongoDb.collection("vendorOutstanding").find({}).toArray();

    const cleanNum = (val) => {
      const n = parseFloat(String(val || "0").replace(/,/g, ""));
      return isNaN(n) ? 0 : n;
    };

    const normalizeName = (str) => {
      if (!str) return "";
      return String(str).toLowerCase().replace(/[.\-_,/#&()]/g, " ").replace(/\bpvt\b|\bprivate\b/gi, "").replace(/\bltd\b|\blimited\b/gi, "").replace(/\s+/g, " ").trim();
    };

    const areDatesEqual = (d1, d2) => {
      if (!d1 && !d2) return true;
      if (!d1 || !d2) return false;
      const toYMD = (str) => {
        if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
          const parts = str.split("-");
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split("T")[0];
        const d = new Date(str);
        return isNaN(d.getTime()) ? str : d.toISOString().split("T")[0];
      };
      return toYMD(d1) === toYMD(d2);
    };

    // Match payments by (date + vendor + amount)
    const missingInMongo = [];
    const matched = [];

    for (const sp of sqlPayments) {
      const pDateObj = sp.date ? new Date(sp.date) : null;
      const dateFormatted = pDateObj ? formatDateDDMMYYYY(pDateObj) : "";
      const dateYMD = pDateObj ? pDateObj.toISOString().split("T")[0] : "";
      const sqlVendor = String(sp.vendor || "").trim();
      const sqlAmt = cleanNum(sp.amount);

      const found = mongoPayments.find(mp => 
        areDatesEqual(mp.date, dateYMD) &&
        normalizeName(mp.vendor) === normalizeName(sqlVendor) &&
        Math.abs(cleanNum(mp.amount) - sqlAmt) < 1
      );

      const itemRecord = {
        pid: sp.pid,
        date: dateFormatted,
        date_ymd: dateYMD,
        vendor: sqlVendor,
        amount: sqlAmt,
        remarks: String(sp.remarks || "").trim()
      };

      if (!found) {
        missingInMongo.push(itemRecord);
      } else {
        matched.push(itemRecord);
      }
    }

    let currentMongoTotal = 0;
    let targetSqlTotal = 0;
    for (const mp of mongoPayments) currentMongoTotal += cleanNum(mp.amount || 0);
    for (const sp of sqlPayments) targetSqlTotal += cleanNum(sp.amount || 0);

    return {
      success: true,
      summary: {
        totalInSql: sqlPayments.length,
        totalInMongo: mongoPayments.length,
        missingInMongoCount: missingInMongo.length,
        differentCount: 0,
        exactMatchCount: matched.length,
        financialImpact: {
          currentMongoTotal,
          targetSqlTotal,
          netDifference: targetSqlTotal - currentMongoTotal,
          label: "Vendor Payments Paid"
        }
      },
      missingInMongo,
      discrepancies: [],
      matched
    };
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Synchronizes MySQL `vendor_outstanding` payments into MongoDB `vendorOutstanding`
 */
async function syncVendorPayments({ fromDate, toDate, selectedPayments } = {}) {
  let conn;
  try {
    conn = await getSqlConnection();
    const mongoDb = await getMongoDbInstance();

    let sqlQuery = "SELECT * FROM vendor_outstanding WHERE 1=1";
    const sqlParams = [];

    if (fromDate) {
      sqlQuery += " AND date >= ?";
      sqlParams.push(fromDate);
    }
    if (toDate) {
      sqlQuery += " AND date <= ?";
      sqlParams.push(toDate);
    }
    sqlQuery += " ORDER BY pid DESC";

    const [sqlPayments] = await conn.query(sqlQuery, sqlParams);
    let paymentsToProcess = sqlPayments;

    if (selectedPayments && Array.isArray(selectedPayments) && selectedPayments.length > 0) {
      const selectedPids = new Set(selectedPayments.map(p => String(p)));
      paymentsToProcess = paymentsToProcess.filter(p => selectedPids.has(String(p.pid)));
    }

    let insertedCount = 0;
    const syncLog = [];
    const affectedVendors = new Set();

    for (const sp of paymentsToProcess) {
      const pDateObj = sp.date ? new Date(sp.date) : null;
      const dateYMD = pDateObj ? pDateObj.toISOString().split("T")[0] : "";
      const vendorName = String(sp.vendor || "").trim().toLowerCase();
      const amount = parseFloat(sp.amount || 0) || 0;

      if (!vendorName || amount <= 0) continue;

      // 1. Sync into vendorOutstanding collection
      const existingVo = await mongoDb.collection("vendorOutstanding").findOne({
        date: dateYMD,
        vendor: vendorName,
        amount: amount
      });

      if (!existingVo) {
        const voDoc = {
          id: uuidv4(),
          pid: sp.pid,
          date: dateYMD,
          vendor: vendorName,
          amount: amount,
          paymentMode: String(sp.remarks || "Bank").trim(),
          remarks: String(sp.remarks || "").trim(),
          createdAt: new Date().toISOString(),
          syncedFromSql: true,
          syncedAt: new Date().toISOString()
        };
        await mongoDb.collection("vendorOutstanding").insertOne(voDoc);
        insertedCount++;
        syncLog.push({ pid: sp.pid, vendor: sp.vendor, amount, action: "INSERTED" });
      }

      // 2. Sync into cashEntries collection (Cash Book / Cash Sheet)
      const existingCash = await mongoDb.collection("cashEntries").findOne({
        date: dateYMD,
        partyType: "vendor",
        partyName: vendorName,
        amount: amount
      });

      if (!existingCash) {
        const cashDoc = {
          id: uuidv4(),
          amount: amount,
          date: dateYMD,
          type: "out",
          partyType: "vendor",
          partyName: vendorName,
          remarks: String(sp.remarks || "Vendor Payment").trim(),
          paymentMode: String(sp.remarks || "Bank").trim(),
          createdAt: new Date().toISOString(),
          syncedFromSql: true,
          syncedAt: new Date().toISOString()
        };
        await mongoDb.collection("cashEntries").insertOne(cashDoc);
      }

      affectedVendors.add(vendorName);
    }

    // 3. Recalculate purchase bill settlements and outstanding balances for all affected vendors
    try {
      const { db: adapter, initMongo } = require("../config/database");
      if (!adapter.mongoDb) {
        await initMongo();
      }
      const { recalculatePartyPayments } = require("../utils/paymentUtils");
      for (const vName of affectedVendors) {
        await recalculatePartyPayments("vendor", vName, true);
      }
    } catch (recalcErr) {
      console.error("[SQL Sync] Recalculate vendor payments warning:", recalcErr.message);
    }

    // 4. Invalidate Redis Caches so all frontend screens update immediately
    try {
      const { delCache } = require("../config/redis");
      await Promise.all([
        delCache("cashEntries"),
        delCache("purchases"),
        delCache("vendorOutstanding"),
        delCache("outstanding"),
        delCache("bills"),
        delCache("analytics")
      ]);
    } catch (cacheErr) {
      // ignore
    }

    return {
      success: true,
      inserted: insertedCount,
      updated: 0,
      total: paymentsToProcess.length,
      affectedVendors: Array.from(affectedVendors),
      syncLog
    };
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Tallies Client Payments between MySQL `outstanding` and MongoDB collections
 */
async function tallyClientPayments({ fromDate, toDate } = {}) {
  let conn;
  try {
    conn = await getSqlConnection();
    const mongoDb = await getMongoDbInstance();

    let sqlQuery = "SELECT * FROM outstanding WHERE 1=1";
    const sqlParams = [];

    if (fromDate) {
      sqlQuery += " AND date >= ?";
      sqlParams.push(fromDate);
    }
    if (toDate) {
      sqlQuery += " AND date <= ?";
      sqlParams.push(toDate);
    }
    sqlQuery += " ORDER BY pid DESC";

    const [sqlPayments] = await conn.query(sqlQuery, sqlParams);
    
    // Client payments are in Mongo either as:
    // 1. cashEntries with type "in", partyType "client" (for bank/cash payments)
    // 2. outstanding with partyType "client" (for TDS/debit adjustments)
    const mongoCash = await mongoDb.collection("cashEntries").find({ type: "in", partyType: { $regex: /^client$/i } }).toArray();
    const mongoAdjs = await mongoDb.collection("outstanding").find({ partyType: { $regex: /^client$/i } }).toArray();

    const cleanNum = (val) => {
      const n = parseFloat(String(val || "0").replace(/,/g, ""));
      return isNaN(n) ? 0 : n;
    };

    const normalizeName = (str) => {
      if (!str) return "";
      return String(str).toLowerCase().replace(/[.\-_,/#&()]/g, " ").replace(/\bpvt\b|\bprivate\b/gi, "").replace(/\bltd\b|\blimited\b/gi, "").replace(/\s+/g, " ").trim();
    };

    const areDatesEqual = (d1, d2) => {
      if (!d1 && !d2) return true;
      if (!d1 || !d2) return false;
      const toYMD = (str) => {
        if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
          const parts = str.split("-");
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split("T")[0];
        const d = new Date(str);
        return isNaN(d.getTime()) ? str : d.toISOString().split("T")[0];
      };
      return toYMD(d1) === toYMD(d2);
    };

    const missingInMongo = [];
    const matched = [];

    for (const sp of sqlPayments) {
      const pDateObj = sp.date ? new Date(sp.date) : null;
      const dateFormatted = pDateObj ? formatDateDDMMYYYY(pDateObj) : "";
      const dateYMD = pDateObj ? pDateObj.toISOString().split("T")[0] : "";
      const sqlClient = String(sp.client || "").trim();
      const sqlAmt = cleanNum(sp.amount);
      const isTds = String(sp.particulars || "").toLowerCase().trim() === "tds";

      let found = false;
      if (isTds) {
        found = mongoAdjs.some(ma => 
          areDatesEqual(ma.date, dateYMD) &&
          normalizeName(ma.client || ma.partyName) === normalizeName(sqlClient) &&
          Math.abs(cleanNum(ma.amount) - sqlAmt) < 1 &&
          String(ma.particulars || "").toLowerCase().trim() === "tds"
        );
      } else {
        found = mongoCash.some(mc => 
          areDatesEqual(mc.date, dateYMD) &&
          normalizeName(mc.partyName) === normalizeName(sqlClient) &&
          Math.abs(cleanNum(mc.amount) - sqlAmt) < 1
        );
      }

      const itemRecord = {
        pid: sp.pid,
        date: dateFormatted,
        date_ymd: dateYMD,
        client: sqlClient,
        amount: sqlAmt,
        particulars: String(sp.particulars || "").trim(),
        remarks: String(sp.bankname || "").trim()
      };

      if (!found) {
        missingInMongo.push(itemRecord);
      } else {
        matched.push(itemRecord);
      }
    }

    let currentMongoTotal = 0;
    let targetSqlTotal = 0;
    for (const mc of mongoCash) currentMongoTotal += cleanNum(mc.amount || 0);
    for (const ma of mongoAdjs) currentMongoTotal += cleanNum(ma.amount || 0);
    for (const sp of sqlPayments) targetSqlTotal += cleanNum(sp.amount || 0);

    return {
      success: true,
      summary: {
        totalInSql: sqlPayments.length,
        totalInMongo: mongoCash.length + mongoAdjs.length,
        missingInMongoCount: missingInMongo.length,
        differentCount: 0,
        matchedCount: matched.length,
        currentMongoTotal: Number(currentMongoTotal.toFixed(2)),
        targetSqlTotal: Number(targetSqlTotal.toFixed(2))
      },
      missingInMongo,
      different: [],
      matched
    };
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Synchronizes MySQL `outstanding` payments into MongoDB collections
 */
async function syncClientPayments({ fromDate, toDate, selectedPayments } = {}) {
  let conn;
  try {
    conn = await getSqlConnection();
    const mongoDb = await getMongoDbInstance();

    let sqlQuery = "SELECT * FROM outstanding WHERE 1=1";
    const sqlParams = [];

    if (fromDate) {
      sqlQuery += " AND date >= ?";
      sqlParams.push(fromDate);
    }
    if (toDate) {
      sqlQuery += " AND date <= ?";
      sqlParams.push(toDate);
    }
    sqlQuery += " ORDER BY pid DESC";

    const [sqlPayments] = await conn.query(sqlQuery, sqlParams);
    let paymentsToProcess = sqlPayments;

    if (selectedPayments && Array.isArray(selectedPayments) && selectedPayments.length > 0) {
      const selectedPids = new Set(selectedPayments.map(p => String(p)));
      paymentsToProcess = paymentsToProcess.filter(p => selectedPids.has(String(p.pid)));
    }

    let insertedCount = 0;
    const syncLog = [];
    const affectedClients = new Set();

    const cleanNum = (val) => {
      const n = parseFloat(String(val || "0").replace(/,/g, ""));
      return isNaN(n) ? 0 : n;
    };

    const normalizeName = (str) => {
      if (!str) return "";
      return String(str).toLowerCase().replace(/[.\-_,/#&()]/g, " ").replace(/\bpvt\b|\bprivate\b/gi, "").replace(/\bltd\b|\blimited\b/gi, "").replace(/\s+/g, " ").trim();
    };

    const areDatesEqual = (d1, d2) => {
      if (!d1 && !d2) return true;
      if (!d1 || !d2) return false;
      const toYMD = (str) => {
        if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
          const parts = str.split("-");
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split("T")[0];
        const d = new Date(str);
        return isNaN(d.getTime()) ? str : d.toISOString().split("T")[0];
      };
      return toYMD(d1) === toYMD(d2);
    };

    for (const sp of paymentsToProcess) {
      const pDateObj = sp.date ? new Date(sp.date) : null;
      const dateYMD = pDateObj ? pDateObj.toISOString().split("T")[0] : "";
      const clientName = String(sp.client || "").trim().toLowerCase();
      const amount = parseFloat(sp.amount || 0) || 0;
      const isTds = String(sp.particulars || "").toLowerCase().trim() === "tds";

      if (!clientName || amount <= 0) continue;

      if (isTds) {
        // Sync into outstanding (TDS adjustment)
        const existingVo = await mongoDb.collection("outstanding").findOne({
          date: dateYMD,
          partyType: "Client",
          client: clientName,
          amount: amount,
          particulars: "tds"
        });

        if (!existingVo) {
          const voDoc = {
            id: uuidv4(),
            pid: sp.pid,
            date: dateYMD,
            partyType: "Client",
            client: clientName,
            partyName: clientName,
            particulars: "tds",
            amount: amount,
            bankname: String(sp.bankname || "").trim(),
            remarks: String(sp.bankname || "").trim(),
            createdAt: new Date().toISOString(),
            syncedFromSql: true,
            syncedAt: new Date().toISOString()
          };
          await mongoDb.collection("outstanding").insertOne(voDoc);
          insertedCount++;
          syncLog.push({ pid: sp.pid, client: clientName, amount, action: "INSERTED" });
        }
      } else {
        // Sync into cashEntries collection (Cash Book / Cash Sheet)
        const existingCash = await mongoDb.collection("cashEntries").findOne({
          date: dateYMD,
          partyType: "client",
          partyName: clientName,
          amount: amount
        });

        if (!existingCash) {
          const cashDoc = {
            id: uuidv4(),
            pid: sp.pid,
            amount: amount,
            date: dateYMD,
            type: "in",
            partyType: "client",
            partyName: clientName,
            remarks: String(sp.bankname || sp.particulars || "Client Payment").trim(),
            paymentMode: String(sp.particulars || "Bank").trim(),
            createdAt: new Date().toISOString(),
            syncedFromSql: true,
            syncedAt: new Date().toISOString()
          };
          await mongoDb.collection("cashEntries").insertOne(cashDoc);
          insertedCount++;
          syncLog.push({ pid: sp.pid, client: clientName, amount, action: "INSERTED" });
        }
      }

      affectedClients.add(clientName);
    }

    // Recalculate settlements and outstanding balances for all affected clients
    try {
      const { db: adapter, initMongo } = require("../config/database");
      if (!adapter.mongoDb) {
        await initMongo();
      }
      const { recalculatePartyPayments } = require("../utils/paymentUtils");
      for (const cName of affectedClients) {
        await recalculatePartyPayments("Client", cName, true);
      }
    } catch (recalcErr) {
      console.error("[SQL Sync] Recalculate client payments warning:", recalcErr.message);
    }

    // Invalidate Redis Caches
    try {
      const { delCache } = require("../config/redis");
      await Promise.all([
        delCache("cashEntries"),
        delCache("outstanding"),
        delCache("bills"),
        delCache("analytics")
      ]);
    } catch (cErr) {
      console.error("[SQL Sync] Redis invalidation error:", cErr.message);
    }

    return {
      success: true,
      total: paymentsToProcess.length,
      inserted: insertedCount,
      log: syncLog
    };
  } finally {
    if (conn) await conn.end();
  }
}

/**
 * Synchronizes the billing status (unbilled vs billed) of ALL bookings in MongoDB with MySQL SQL database.
 */
async function syncAllBookingsBillingStatusFromSql() {
  let conn;
  try {
    conn = await getSqlConnection();
    const mongoDb = await getMongoDbInstance();

    console.log("[Billing Status Sync] Fetching billed AWBs from MySQL...");
    const [sqlBills] = await conn.query("SELECT awb, invoice FROM bills");
    
    const sqlBillsMap = new Map();
    for (const b of sqlBills) {
      if (b.awb && b.invoice) {
        sqlBillsMap.set(String(b.awb).trim().toLowerCase(), String(b.invoice).trim());
      }
    }
    console.log(`[Billing Status Sync] Found ${sqlBillsMap.size} unique billed AWBs in SQL.`);

    console.log("[Billing Status Sync] Fetching bookings from MongoDB...");
    const bookings = await mongoDb.collection("bookings").find({}).toArray();
    console.log(`[Billing Status Sync] Found ${bookings.length} bookings in MongoDB.`);

    let updatedCount = 0;
    const bulkOps = [];

    for (const b of bookings) {
      const awbKey = String(b.awb || b.consignment || "").trim().toLowerCase();
      if (!awbKey) continue;

      const sqlBillNo = sqlBillsMap.get(awbKey);
      const isBilledInSql = Boolean(sqlBillNo);

      const isBilledInMongo = b.billed === true || b.status === "Billed";
      const currentBillNo = b.billNo || "";

      if (isBilledInSql) {
        if (!isBilledInMongo || currentBillNo !== sqlBillNo) {
          bulkOps.push({
            updateOne: {
              filter: { _id: b._id },
              update: {
                $set: {
                  status: "Billed",
                  billed: true,
                  billNo: sqlBillNo,
                  updatedAt: new Date().toISOString()
                }
              }
            }
          });
          updatedCount++;
        }
      }
      // Never unbill MongoDB bookings from SQL because MongoDB is primary and contains direct bookings
    }

    if (bulkOps.length > 0) {
      console.log(`[Billing Status Sync] Executing bulkWrite for ${bulkOps.length} bookings...`);
      const chunkSize = 1000;
      for (let i = 0; i < bulkOps.length; i += chunkSize) {
        const chunk = bulkOps.slice(i, i + chunkSize);
        await mongoDb.collection("bookings").bulkWrite(chunk, { ordered: false });
      }
    }

    try {
      const { delCache } = require("../config/redis");
      await Promise.all([
        delCache("bookings"),
        delCache("unbilled"),
        delCache("bills")
      ]);
    } catch (e) {}

    return {
      success: true,
      totalBookings: bookings.length,
      updatedBookings: updatedCount
    };
  } finally {
    if (conn) await conn.end();
  }
}

module.exports = {
  testConnections,
  tallyAwbs,
  syncAwbs,
  tallyBills,
  syncBills,
  tallyPurchases,
  syncPurchases,
  tallyVendorPayments,
  syncVendorPayments,
  tallyClientPayments,
  syncClientPayments,
  syncAllBookingsBillingStatusFromSql
};


