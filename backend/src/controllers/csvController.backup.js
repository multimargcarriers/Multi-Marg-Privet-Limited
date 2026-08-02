const { db } = require("../config/database");
const { success, error } = require("../utils/response");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const csv = require("csv-parser");
const { getOrSet, delCache } = require("../config/redis");

const MODULE_SCHEMAS = {
  clients: ["client_code", "client_name", "gst", "address", "contact_person", "email"],
  cities: ["city", "short"],
  branches: ["code", "branch_name", "contact_person", "address", "phone", "email"],
  vendors: ["vendor_code", "name", "gst", "branch", "mode", "address", "contact_person", "phno", "email"],
  bookings: ["lr_no", "date", "client", "origin", "destination", "weight", "packages", "rate", "freight"],
  rates: ["client", "origin", "destination", "awb_charge", "air_rate", "air_pickup", "air_delivery", "train_rate", "train_pickup", "train_delivery", "road_rate", "road_pickup", "road_delivery", "road_express_rate", "road_express_pickup", "road_express_delivery"]
};

// Map URL module names to database collection names
const COLLECTION_MAP = {
  clients: "clients",
  cities: "cities",
  branches: "branches",
  vendors: "vendors",
  bookings: "bookings",
  rates: "rates"
};

// Map URL module names to cache keys
const CACHE_MAP = {
  clients: "clients",
  cities: "cities",
  branches: "branches",
  vendors: "vendors",
  bookings: "bookings",
  rates: "rates"
};

function toCSV(headers, rows, module) {
  const headerLine = headers.join(",");
  const dataLines = rows.map((row) =>
    headers
      .map((h) => {
        let dbKey = h;
        if (module === 'bookings') {
          if (h === 'lr_no') dbKey = 'awb';
          if (h === 'packages') dbKey = 'package_count';
          if (h === 'weight') dbKey = 'weight_actual';
          if (h === 'freight') dbKey = 'freight_charge';
        } else if (module === 'branches') {
          if (h === 'branch_name') dbKey = 'branch';
          if (h === 'contact_person') dbKey = 'name';
          if (h === 'phone') dbKey = 'phno';
        } else if (module === 'vendors') {
          if (h === 'vendor_code') dbKey = 'vendorCode';
          if (h === 'contact_person') dbKey = 'contact';
        } else if (module === 'clients') {
          if (h === 'client_code') dbKey = 'clientCode';
          if (h === 'client_name') dbKey = 'name';
          if (h === 'contact_person') dbKey = 'contact';
        } else if (module === 'rates') {
          if (h === 'awb_charge') dbKey = 'awbCharge';
          if (h === 'air_rate') dbKey = 'airRate';
          if (h === 'air_pickup') dbKey = 'airPickup';
          if (h === 'air_delivery') dbKey = 'airDelivery';
          if (h === 'train_rate') dbKey = 'trainRate';
          if (h === 'train_pickup') dbKey = 'trainPickup';
          if (h === 'train_delivery') dbKey = 'trainDelivery';
          if (h === 'road_rate') dbKey = 'roadRate';
          if (h === 'road_pickup') dbKey = 'roadPickup';
          if (h === 'road_delivery') dbKey = 'roadDelivery';
          if (h === 'road_express_rate') dbKey = 'roadExpressRate';
          if (h === 'road_express_pickup') dbKey = 'roadExpressPickup';
          if (h === 'road_express_delivery') dbKey = 'roadExpressDelivery';
        }
        
        const val = row[dbKey] !== undefined && row[dbKey] !== null ? String(row[dbKey]).toLowerCase() : "";
        return val.includes(",") ? `"${val}"` : val;
      })
      .join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

exports.exportCSV = async (req, res) => {
  try {
    const { module } = req.params;
    const collectionName = COLLECTION_MAP[module];
    const headers = MODULE_SCHEMAS[module];

    if (!collectionName || !headers) {
      return error(res, "Invalid module", 400);
    }

    const snapshot = await db.collection(collectionName).get();
    const rows = [];
    snapshot.forEach((doc) => rows.push(doc.data()));

    const csvData = toCSV(headers, rows, module);
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${module}_export.csv`);
    return res.send(csvData);
  } catch (err) {
    console.error(`Error exporting ${req.params.module}:`, err);
    return error(res, err);
  }
};

exports.getSample = async (req, res) => {
  try {
    const { module } = req.params;
    const headers = MODULE_SCHEMAS[module];

    if (!headers) {
      return error(res, "Invalid module", 400);
    }

    const correctCsvData = headers.join(",") + "\n";
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${module}_sample.csv`);
    return res.send(correctCsvData);
  } catch (err) {
    console.error(`Error generating sample for ${req.params.module}:`, err);
    return error(res, err);
  }
};

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

    const results = [];
    let headersValid = true;
    let actualHeaders = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("headers", (headers) => {
          actualHeaders = headers.map(h => h.trim().toLowerCase());
          const missing = expectedHeaders.filter(eh => !actualHeaders.includes(eh));
          if (missing.length > 0) {
            headersValid = false;
          }
        })
        .on("data", (data) => {
          if (!headersValid) return; 

          const row = { id: uuidv4(), createdAt: new Date().toISOString() };
          
          // Bookings specific initialization if module is bookings
          if (module === 'bookings') {
            row.status = "Booked";
          }

          for (const key of expectedHeaders) {
            const actualKey = Object.keys(data).find(k => k.trim().toLowerCase() === key);
            let val = actualKey && data[actualKey] ? String(data[actualKey]).trim() : "";
            
            // Map bookings fields to internal schema names since internal schema is slightly different from sample headers
            if (module === 'bookings') {
              let dbKey = key;
              if (key === 'lr_no') dbKey = 'awb';
              if (key === 'packages') dbKey = 'package_count';
              if (key === 'weight') dbKey = 'weight_actual';
              if (key === 'freight') dbKey = 'freight_charge';
              row[dbKey] = val.toLowerCase();
              if (key === 'weight') row['weight_chargeable'] = val.toLowerCase();
            } else if (module === 'branches') {
               let dbKey = key;
               if (key === 'branch_name') dbKey = 'branch';
               if (key === 'contact_person') dbKey = 'name';
               if (key === 'phone') dbKey = 'phno';
               row[dbKey] = val.toLowerCase();
            } else if (module === 'vendors') {
               let dbKey = key;
               if (key === 'vendor_code') dbKey = 'vendorCode';
               if (key === 'contact_person') dbKey = 'contact';
               row[dbKey] = val.toLowerCase();
            } else if (module === 'clients') {
               let dbKey = key;
               if (key === 'client_code') dbKey = 'clientCode';
               if (key === 'client_name') dbKey = 'name';
               if (key === 'contact_person') dbKey = 'contact';
               row[dbKey] = val.toLowerCase();
            } else if (module === 'rates') {
               let dbKey = key;
               if (key === 'awb_charge') dbKey = 'awbCharge';
               if (key === 'air_rate') dbKey = 'airRate';
               if (key === 'air_pickup') dbKey = 'airPickup';
               if (key === 'air_delivery') dbKey = 'airDelivery';
               if (key === 'train_rate') dbKey = 'trainRate';
               if (key === 'train_pickup') dbKey = 'trainPickup';
               if (key === 'train_delivery') dbKey = 'trainDelivery';
               if (key === 'road_rate') dbKey = 'roadRate';
               if (key === 'road_pickup') dbKey = 'roadPickup';
               if (key === 'road_delivery') dbKey = 'roadDelivery';
               if (key === 'road_express_rate') dbKey = 'roadExpressRate';
               if (key === 'road_express_pickup') dbKey = 'roadExpressPickup';
               if (key === 'road_express_delivery') dbKey = 'roadExpressDelivery';
               row[dbKey] = val.toLowerCase();
            } else {
               row[key] = val.toLowerCase();
            }
          }
          results.push(row);
        })
        .on("end", () => {
          resolve();
        })
        .on("error", (err) => {
          reject(err);
        });
    });

    fs.unlinkSync(req.file.path);

    if (!headersValid) {
      return error(res, `Invalid CSV format. Please download and use the provided sample. Expected columns: ${expectedHeaders.join(", ")}`, 400);
    }

    if (results.length === 0) {
      return error(res, "CSV file is empty or contains no valid data rows", 400);
    }

    const batch = db.batch();
    for (const row of results) {
      const docRef = db.collection(collectionName).doc(row.id);
      batch.set(docRef, row);
    }
    await batch.commit();

    if (CACHE_MAP[module]) {
      await delCache(CACHE_MAP[module]);
    }

    return success(res, `Successfully imported ${results.length} records into ${module}`, { importedCount: results.length });

  } catch (err) {
    console.error(`Error importing ${req.params.module}:`, err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return error(res, "Failed to import CSV", 500);
  }
};
