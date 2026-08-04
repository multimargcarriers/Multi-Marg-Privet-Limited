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
  bookings: ["awb", "date", "mode", "client", "origin", "destination", "consignor", "consignee", "box", "actual_wt", "charge_wt", "type_of_delivery", "insured", "remarks", "clerk_name", "status", "frieght_charge", "awb_charge", "pickup_charge", "delivery_charge", "packaging_charge", "handling_charge", "invdate", "value", "invoice", "part", "eway", "quantity"],
  rates: ["client", "origin", "destination", "awb_charge", "air_rate", "air_pickup", "air_delivery", "train_rate", "train_pickup", "train_delivery", "road_rate", "road_pickup", "road_delivery", "road_express_rate", "road_express_pickup", "road_express_delivery"]
};

// Map URL module names to database collection names
const COLLECTION_MAP = {
  clients: "clients",
  cities: "cities",
  branches: "branches",
  vendors: "vendors",
  bookings: "bookings",
  lr_details: "bookings", // stored inside bookings collection
  rates: "rates"
};

// Map URL module names to cache keys
const CACHE_MAP = {
  clients: "clients",
  cities: "cities",
  branches: "branches",
  vendors: "vendors",
  bookings: "bookings",
  lr_details: "bookings",
  rates: "rates"
};

function toCSV(headers, rows, module) {
  const headerLine = headers.join(",");
  const dataLines = rows.map((row) =>
    headers
      .map((h) => {
        let dbKey = h;
        if (module === 'branches') {
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
        
        const val = row[dbKey] !== undefined && row[dbKey] !== null ? String(row[dbKey]) : "";
        
        // Protect large numeric strings (like e-way bills) and specific fields from being converted 
        // into scientific notation (e.g. 5.65E+11) when opened in Excel
        if (dbKey === 'eway' || dbKey === 'ewayBill' || dbKey === 'invoice' || dbKey === 'part' || dbKey === 'awb' || /^\d{10,}$/.test(val)) {
          // Use Excel's formula syntax to force text formatting
          return `="${val}"`;
        }
        
        return val.includes(",") ? `"${val}"` : val;
      })
      .join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

exports.exportCSV = async (req, res) => {
  try {
    const { module } = req.params;
    const { search } = req.query;
    const collectionName = COLLECTION_MAP[module];
    const headers = MODULE_SCHEMAS[module];

    if (!collectionName || !headers) {
      return error(res, "Invalid module", 400);
    }

    const snapshot = await db.collection(collectionName).get();
    let rows = [];
    
    if (module === 'bookings') {
      snapshot.forEach((doc) => {
        const booking = doc.data();
        
        // Apply search filter if provided
        if (search) {
          const s = search.toLowerCase();
          const matches = (booking.client || booking.consignor || "").toLowerCase().includes(s) ||
                          (booking.awb || booking.lrNo || booking.consignment || "").toLowerCase().includes(s) ||
                          (booking.origin || "").toLowerCase().includes(s) ||
                          (booking.destination || "").toLowerCase().includes(s);
          if (!matches) return;
        }

        const parcels = (booking.invoiceDetails && booking.invoiceDetails.length > 0) ? booking.invoiceDetails : (booking.parcels || []);
        
        const bookingHeaders = {
          awb: booking.awb || booking.lrNo || booking.consignment || '',
          date: booking.date || booking.lrDate || booking.createdAt || '',
          mode: booking.mode || 'Road',
          client: booking.client || booking.clientName || '',
          origin: booking.origin || '',
          destination: booking.destination || '',
          consignor: booking.consignor || '',
          consignee: booking.consignee || '',
          box: booking.boxes || booking.box || booking.pkgs || booking.quantity || '',
          actual_wt: booking.actualWeight || booking.actual_wt || '',
          charge_wt: booking.chargedWeight || booking.charge_wt || '',
          type_of_delivery: booking.deliveryType || booking.type_of_delivery || 'Door',
          insured: booking.insured || 'NA',
          remarks: booking.remarks || '',
          clerk_name: booking.clerkName || booking.clerk_name || 'Admin',
          status: booking.status || 'Booked',
          frieght_charge: booking.freightCharge || booking.frieght_charge || booking.frieght || booking.freight || booking.weight || 0,
          awb_charge: booking.awbCharge || booking.awb_charge || 0,
          pickup_charge: booking.pickupCharge || booking.pickup_charge || 0,
          delivery_charge: booking.deliveryCharge || booking.delivery_charge || 0,
          packaging_charge: booking.packagingCharge || booking.packaging_charge || 0,
          handling_charge: booking.handlingCharge || booking.handling_charge || 0
        };

        if (parcels.length > 0) {
          parcels.forEach(parcel => {
            rows.push({
              ...bookingHeaders,
              invdate: parcel.invdate || parcel.invoiceDate || '',
              value: parcel.value || parcel.invoiceValue || '',
              invoice: parcel.invoice || parcel.invoiceNo || '',
              part: parcel.part || parcel.partNo || parcel.partNumber || '',
              eway: parcel.eway || parcel.ewayBill || '',
              quantity: parcel.quantity || parcel.qty || ''
            });
          });
        } else {
          // Booking with no parcels
          rows.push({
            ...bookingHeaders,
            invdate: '',
            value: '',
            invoice: '',
            part: '',
            eway: '',
            quantity: ''
          });
        }
      });
    } else {
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
              p[key] = Number(p[key]).toLocaleString('fullwide', { useGrouping: false });
              changed = true;
            }
          });
        });
      }

      if (b.invoiceDetails && Array.isArray(b.invoiceDetails)) {
        b.invoiceDetails.forEach(inv => {
          ['eway', 'ewayBill', 'invoice', 'invoiceNo', 'part', 'partNo', 'awb'].forEach(key => {
            if (inv[key] && typeof inv[key] === 'string' && /^\d+(\.\d+)?e\+\d+$/i.test(inv[key])) {
              inv[key] = Number(inv[key]).toLocaleString('fullwide', { useGrouping: false });
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

          const row = {};
          if (module !== 'lr_details') {
            row.id = uuidv4();
            row.createdAt = new Date().toISOString();
          }
          
          if (module === 'bookings') {
            row.status = "Booked";
          }

          for (const key of expectedHeaders) {
            const actualKey = Object.keys(data).find(k => k.trim().toLowerCase() === key);
            let val = actualKey && data[actualKey] ? String(data[actualKey]).trim() : "";
            
            // Strip Excel formula string formatting if present (e.g. ="1234")
            val = val.replace(/^="|"$/g, '');
            
            if (module === 'branches') {
               let dbKey = key;
               if (key === 'branch_name') dbKey = 'branch';
               if (key === 'contact_person') dbKey = 'name';
               if (key === 'phone') dbKey = 'phno';
               row[dbKey] = val;
            } else if (module === 'vendors') {
               let dbKey = key;
               if (key === 'vendor_code') dbKey = 'vendorCode';
               if (key === 'contact_person') dbKey = 'contact';
               row[dbKey] = val;
            } else if (module === 'clients') {
               let dbKey = key;
               if (key === 'client_code') dbKey = 'clientCode';
               if (key === 'client_name') dbKey = 'name';
               if (key === 'contact_person') dbKey = 'contact';
               row[dbKey] = val;
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
               row[dbKey] = val;
            } else {
               row[key] = val;
            }
          }
          
          if (module === 'bookings' && !row.clerk_name) {
            row.clerk_name = req.user?.name || "Admin";
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

    if (module === 'bookings') {
      const bookingsByAwb = {};
      results.forEach(row => {
        const awb = row.awb;
        if (!awb) return;

        if (!bookingsByAwb[awb]) {
          // Create the booking header using the first row
          const bookingData = { ...row };
          delete bookingData.invdate;
          delete bookingData.value;
          delete bookingData.invoice;
          delete bookingData.part;
          delete bookingData.eway;
          delete bookingData.quantity;
          bookingData.parcels = [];
          bookingData.invoiceDetails = [];
          bookingsByAwb[awb] = bookingData;
        }

        // Add parcel details if present in this row
        if (row.invdate || row.value || row.invoice || row.part || row.eway || row.quantity) {
          bookingsByAwb[awb].invoiceDetails.push({
            invdate: row.invdate || '',
            invoiceValue: row.value || '',
            invoiceNo: row.invoice || '',
            partNumber: row.part || '',
            ewayBill: row.eway || '',
            qty: row.quantity || ''
          });
          bookingsByAwb[awb].parcels.push({
            invdate: row.invdate || '',
            value: row.value || '',
            invoice: row.invoice || '',
            part: row.part || '',
            eway: row.eway || '',
            quantity: row.quantity || ''
          });
        }
      });

      const batch = db.batch();
      const uniqueBookings = Object.values(bookingsByAwb);
      
      for (const booking of uniqueBookings) {
        // Find existing booking by awb to preserve id, or use the new id
        const docRef = db.collection(collectionName).doc(booking.id);
        batch.set(docRef, booking);
      }
      await batch.commit();

      if (CACHE_MAP[module]) {
        await delCache(CACHE_MAP[module]);
      }

      return success(res, `Successfully imported ${uniqueBookings.length} bookings with nested parcels`, { importedCount: uniqueBookings.length });
    } else {
      // Standard insert for others
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
    }

  } catch (err) {
    console.error(`Error importing ${req.params.module}:`, err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return error(res, "Failed to import CSV", 500);
  }
};
