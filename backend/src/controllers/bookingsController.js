const { emitDataUpdated } = require("../utils/socket");
const { filterByAccess, canModifyBooking, isBookingCreator } = require("../utils/security");
const {
  db
} = require("../config/database");
const {
  v4: uuidv4
} = require("uuid");
const {
  success,
  created,
  error
} = require("../utils/response");
const {
  asyncHandler
} = require("../middleware/errorHandler");
const {
  getOrSet,
  delCache
} = require("../config/redis");
const { logUserActivity } = require("../utils/activityLogger");
const {
  body,
  validationResult
} = require("express-validator");
const {
  generateLRNumber
} = require("../utils/helpers");

const CACHE_KEY = "bookings";

const generateOrUpdateBillForBooking = async (booking, isNew) => {
  const freight = parseFloat(booking.freight_charge || booking.freight || booking.frieght || 0);
  const awb = parseFloat(booking.awb_charge || 0);
  const pickup = parseFloat(booking.pickup_charge || 0);
  const delivery = parseFloat(booking.delivery_charge || 0);
  const packaging = parseFloat(booking.packaging_charge || 0);
  const handling = parseFloat(booking.handling_charge || 0);
  const insurance = parseFloat(booking.insurance_charge || booking.insuranceCharge || 0);
  const fuel = parseFloat(booking.fuel_surcharge || booking.fuelSurcharge || 0);
  const gstin = booking.gstin || booking.consignee_gstin || booking.consignor_gstin || "";
  const clientStateCode = gstin ? gstin.substring(0, 2) : "";
  
  const applyGst = true;
  const gstRate = applyGst ? 18 : 0;
  const taxable = freight + awb + pickup + delivery + packaging + handling + insurance + fuel;
  const gstAmt = taxable * gstRate / 100;
  
  let cgst = 0, sgst = 0, igst = 0;
  if (applyGst) {
    if (clientStateCode === "05" || !clientStateCode) {
      cgst = gstAmt / 2;
      sgst = gstAmt / 2;
    } else {
      igst = gstAmt;
    }
  }
  const total = taxable + gstAmt;

  const lrNumber = booking.awb || booking.lrNumber || booking.id;
  const refNumber = booking.invoice_no || booking.refNo || booking.reference_no || "-";
  const lrDateFormatted = booking.dispatch_date ? new Date(booking.dispatch_date).toLocaleDateString("en-GB") : (booking.date ? new Date(booking.date).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"));
  const originCity = booking.origin || "-";
  const destCity = booking.destination || "-";
  const pkgQty = booking.box || booking.pkg || booking.boxes || booking.package_count || booking.packages || booking.pcs || 1;
  const wtVal = booking.charge_wt || booking.chargeable_weight || booking.chargeWeight || booking.weight_chargeable || booking.weight || 0;
  const rateVal = booking.rate || 0;

  let existingBillId = null;
  let billNo = "";
  
  if (!isNew) {
    const snapshot = await db.collection("bills").where("lrNo", "==", lrNumber).get();
    if (!snapshot.empty) {
      existingBillId = snapshot.docs[0].id;
      billNo = snapshot.docs[0].data().billNo;
    }
  }
  
  if (!existingBillId) {
    if (booking.paymentMode === 'Credit') {
      return; // Do not auto-generate bills for Credit bookings. They will be generated manually in bulk.
    }
    const countSnap = await db.collection("bills").count().get();
    const totalBills = countSnap.data().count;
    const { getCurrentFinancialYear } = require("../utils/financialYear");
    billNo = `MCPL/${getCurrentFinancialYear()}/${String(totalBills + 1).padStart(4, "0")}`;
  }

  const bill = {
    billNo,
    client: booking.client,
    clientAddress: booking.consignee_address || booking.consignor_address || booking.clientAddress || "SIDCUL PANTNAGAR",
    gstin: gstin,
    stateCode: booking.stateCode || "05",
    mode: booking.mode || "Road",
    sacCode: booking.sacCode || "996511",
    amount: total,
    total,
    totalPayable: total,
    taxable,
    subtotal: taxable,
    gst: gstRate,
    cgst,
    sgst,
    igst,
    lrNo: lrNumber,
    lrDate: lrDateFormatted,
    refNo: refNumber,
    origin: originCity,
    destination: destCity,
    packages: pkgQty,
    weight: wtVal,
    rate: rateVal,
    freight,
    lrCharge: awb,
    pickupCharge: pickup,
    deliveryCharge: delivery,
    specialCharge: packaging + handling,
    otherCharge: insurance + fuel,
    insuranceCharge: insurance,
    fuelSurcharge: fuel,
    invoiceDetails: booking.invoiceDetails || [],
    items: [
      {
        si: 1,
        lrNo: lrNumber,
        lrDt: lrDateFormatted,
        ref: refNumber,
        org: originCity,
        dest: destCity,
        pkg: pkgQty,
        wt: wtVal,
        rate: rateVal,
        frg: freight,
        lr: awb,
        pick: pickup,
        del: delivery,
        spl: packaging + handling,
        oth: insurance + fuel,
        total: taxable.toFixed(2)
      }
    ]
  };

  if (existingBillId) {
    await db.collection("bills").doc(existingBillId).update(bill);
  } else {
    bill.id = uuidv4();
    bill.status = "pending";
    bill.createdAt = new Date().toISOString();
    await db.collection("bills").doc(bill.id).set(bill);
    await db.collection("bookings").doc(booking.id).update({ status: "Billed" });
  }
  await delCache("bills");
};


const generateSequentialAwb = async () => {
  if (!db.mongoDb) {
    return `${Date.now().toString().slice(-6)}`;
  }
  
  const countersCol = db.mongoDb.collection("counters");
  const bookingsCol = db.mongoDb.collection("bookings");

  // Step 1: Ensure counter document exists and syncs with existing max numeric AWB
  const counterDoc = await countersCol.findOne({ _id: "awb_counter" });
  if (!counterDoc || typeof counterDoc.seq !== "number") {
    let maxNum = 0;
    const allBookings = await bookingsCol.find({}, { projection: { consignment: 1, awb: 1, lrNo: 1 } }).toArray();
    allBookings.forEach((b) => {
      const awbStr = b.awb || b.consignment || b.lrNo || "";
      const match = String(awbStr).match(/^([^0-9]+)?(\d+)$/);
      if (match) {
        const num = parseInt(match[2], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    await countersCol.findOneAndUpdate(
      { _id: "awb_counter" },
      { $max: { seq: maxNum } },
      { returnDocument: "after", upsert: true }
    );
  }

  // Step 2: Atomic sequence increment with collision check
  let finalAwb = null;
  while (!finalAwb) {
    const updatedCounter = await countersCol.findOneAndUpdate(
      { _id: "awb_counter" },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true }
    );

    const seqVal = updatedCounter.seq ?? updatedCounter.value?.seq;
    const candidateStr = `${seqVal}`;

    // Verify candidate is not already used in DB
    const existing = await bookingsCol.findOne({
      $or: [
        { consignment: candidateStr },
        { awb: candidateStr },
        { lrNo: candidateStr }
      ]
    });

    if (!existing) {
      finalAwb = candidateStr;
    } else {
      console.warn(`[AWB Sequence] Candidate AWB ${candidateStr} already exists in DB. Advancing to next sequence...`);
    }
  }

  return finalAwb;
};

exports.postRoot_1 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const booking = req.body;
  const providedId = booking.id;
  delete booking.id;

  const enteredDate = booking.dispatch_date || booking.date || new Date().toISOString().split('T')[0];
  booking.dispatch_date = enteredDate;
  booking.date = enteredDate;
  booking.createdAt = new Date().toISOString();
  booking.realBookingDate = booking.createdAt;
  booking.status = "In Transit";
  booking.transitStatus = "In Transit";
  booking.currentLocation = String(booking.origin || "").trim().toUpperCase() || "ORIGIN FACILITY";
  booking.billed = false;
  booking.billNo = "";
  booking.lrNumber = generateLRNumber();
  
  const isSuperAdminUser = (req.user?.role || "").toLowerCase().replace(/\s+/g, '') === 'superadmin' || req.user?.email === 'admin@multimarg.com';
  const manualAwbRequested = isSuperAdminUser && (booking.isManualAwb || req.body.isManualAwb) && (booking.consignment || booking.awb || booking.lrNo);

  if (manualAwbRequested) {
    const rawCandidate = String(booking.consignment || booking.awb || booking.lrNo).trim();
    if (db.mongoDb) {
      const existing = await db.mongoDb.collection("bookings").findOne({
        $or: [
          { consignment: rawCandidate },
          { awb: rawCandidate },
          { lrNo: rawCandidate }
        ]
      });
      if (existing) {
        return error(res, `AWB Number "${rawCandidate}" is already used by another booking.`, 400);
      }
      // If numeric, ensure counter advances above it (no taking old gaps)
      const match = rawCandidate.match(/^([^0-9]+)?(\d+)$/);
      if (match) {
        const num = parseInt(match[2], 10);
        await db.mongoDb.collection("counters").findOneAndUpdate(
          { _id: "awb_counter" },
          { $max: { seq: num } },
          { upsert: true }
        );
      }
    }
    booking.consignment = rawCandidate;
    booking.awb = rawCandidate;
    booking.lrNo = rawCandidate;
  } else {
    try {
      // Strictly auto-generate unique sequential AWB number for all new bookings
      const sequentialAwb = await generateSequentialAwb();
      booking.consignment = sequentialAwb;
      booking.awb = sequentialAwb;
      booking.lrNo = sequentialAwb;
    } catch (err) {
      console.error("Error generating sequential AWB:", err);
      const fallback = `MMC-${Date.now().toString().slice(-6)}`;
      booking.consignment = fallback;
      booking.awb = fallback;
      booking.lrNo = fallback;
    }
  }
  delete booking.isManualAwb;

  if (!booking.clerk_name) {
    booking.clerk_name = req.user?.name || "Admin";
  }
  booking.createdBy_id = req.user?.id || null;
  booking.createdBy_email = req.user?.email || null;
  booking.createdBy = req.user?.name || "Admin";
  
  let docRefId;
  if (providedId && providedId.startsWith("offline_")) {
    await db.collection("bookings").doc(providedId).set(booking);
    docRefId = providedId;
  } else {
    const docRef = await db.collection("bookings").add(booking);
    docRefId = docRef.id;
  }
  
  const createdBooking = { id: docRefId, ...booking };
  
  // Create initial tracking entry
  try {
    const awbVal = String(booking.consignment || booking.awb || booking.lrNo || docRefId).trim();
    if (awbVal) {
      const nowStr = new Date().toISOString();
      let trackingDate = nowStr;
      if (booking.dispatch_date) {
        if (booking.dispatch_date.includes('T')) {
          trackingDate = booking.dispatch_date;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(booking.dispatch_date)) {
          trackingDate = `${booking.dispatch_date}T${nowStr.split('T')[1]}`;
        }
      }
      const initialOrigin = String(booking.origin || "").trim().toUpperCase() || "ORIGIN FACILITY";
      const initialTracking = {
        awb: awbVal,
        status: "In Transit",
        location: initialOrigin,
        date: trackingDate,
        remarks: booking.remarks || `Shipment in transit from ${initialOrigin}`,
        enteredBy: req.user?.name || req.user?.email || "Admin",
        enteredById: req.user?.id || null,
        enteredByRole: req.user?.role || "Admin",
        createdAt: nowStr,
        updatedAt: nowStr
      };
      await db.collection("tracking").add(initialTracking);
    }
  } catch (trkErr) {
    console.error("[Booking Create Auto Tracking Error]:", trkErr);
  }
  
  await delCache(CACHE_KEY);
  await delCache("unbilled");
  await delCache("bills");
  emitDataUpdated("bookings", "create");
  emitDataUpdated("unbilled", "update");
  emitDataUpdated("bills", "update");

  logUserActivity(req, {
    type: 'booking_create',
    title: `Created Booking AWB #${booking.consignment || docRefId} (${booking.consignor || 'Client'} -> ${booking.consignee || 'Consignee'})`,
    details: { bookingId: docRefId, consignment: booking.consignment, client: booking.consignor }
  });

  return created(res, "Booking created successfully", {
    id: docRefId,
    ...booking
  });
};

exports.getRoot_2 = async (req, res) => {
  const isWorldwide = req.query.worldwide === 'true';

  const data = await getOrSet(CACHE_KEY, async () => {
    // Fetch all active POD documents to ensure 100% accurate synchronization
    const activePodsMap = {};
    if (db.mongoDb) {
      const activePods = await db.mongoDb.collection("pod").find({}, { projection: { lrNo: 1, podUrl: 1, cloudinaryUrl: 1, url: 1, bookingId: 1 } }).toArray();
      activePods.forEach(p => {
        const raw = String(p.lrNo || '').trim().toLowerCase();
        const stripped = raw.replace(/^(mmc|lr|awb)[-_ ]*/i, '');
        const url = p.podUrl || p.cloudinaryUrl || p.url || '';
        if (raw) activePodsMap[raw] = url;
        if (stripped) activePodsMap[stripped] = url;
        if (p.bookingId) activePodsMap[String(p.bookingId)] = url;
      });
    }

    const snapshot = await db.collection("bookings").orderBy("date", "desc").get();
    
    // Scan cached PDFs directory to set hasPdf flags instantly
    const fs = require("fs");
    const path = require("path");
    const dirPath = path.join(__dirname, "../../uploads/downloaded_pdfs");
    const pdfsMap = {};
    try {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
          if (file.endsWith(".pdf")) {
            let fid = file;
            if (file.startsWith("LR_")) fid = file.substring(3);
            if (fid.endsWith(".pdf")) fid = fid.substring(0, fid.length - 4);
            pdfsMap[fid] = true;
          }
        });
      }
    } catch (e) {
      console.error("[Bookings Controller] Error reading PDF directory:", e.message);
    }

    const bookings = [];
    snapshot.forEach(doc => {
      const docData = doc.data();
      const bAwb = String(docData.awb || docData.consignment || docData.lrNo || '').trim().toLowerCase();
      const bStripped = bAwb.replace(/^(mmc|lr|awb)[-_ ]*/i, '');
      const matchingPodUrl = activePodsMap[bAwb] || activePodsMap[bStripped] || (doc.id && activePodsMap[String(doc.id)]) || null;

      if (!matchingPodUrl) {
        docData.podUploaded = false;
        docData.podUrl = null;
        docData.pod = null;
        if (String(docData.status || '').toLowerCase() === 'delivered') {
          docData.status = docData.transitStatus || 'In Transit';
        }
      } else {
        docData.podUploaded = true;
        docData.podUrl = matchingPodUrl;
      }

      // If not delivered, ensure transitStatus and status are 'In Transit' if booked/picked up or empty
      const currSt = String(docData.status || '').toLowerCase();
      const currTransit = String(docData.transitStatus || '').toLowerCase();
      if (!matchingPodUrl && currSt !== 'delivered' && currTransit !== 'delivered') {
        if (!docData.transitStatus || ['booked', 'picked up', 'shipment booked', ''].includes(currTransit)) {
          docData.transitStatus = 'In Transit';
        }
        if (!docData.status || ['booked', 'picked up', 'shipment booked', ''].includes(currSt)) {
          docData.status = 'In Transit';
        }
      }

      // Ensure currentLocation defaults to origin in uppercase
      if (!docData.currentLocation && docData.origin) {
        docData.currentLocation = String(docData.origin).trim().toUpperCase();
      } else if (docData.currentLocation) {
        docData.currentLocation = String(docData.currentLocation).trim().toUpperCase();
      }

      // Add hasPdf cache status flag
      docData.hasPdf = Boolean(pdfsMap[doc.id]);

      bookings.push({
        id: doc.id,
        ...docData
      });
    });
    return bookings;
  }, 300);
  
  let filteredData = data;
  if (isWorldwide) {
    filteredData = data.map(b => ({
      id: b.id,
      awb: b.awb,
      consignment: b.consignment,
      lrNo: b.lrNo,
      origin: b.origin,
      destination: b.destination,
      client: b.client,
      clientName: b.clientName,
      consignor: b.consignor,
      consignee: b.consignee,
      date: b.date,
      createdAt: b.createdAt,
      mode: b.mode,
      box: b.box || b.packages || b.pkg || b.pcs || b.package_count || b.boxCount
    }));
  } else {
    // Fetch global configuration for booking visibility policy
    const settings = await getOrSet("global_config", async () => {
      if (db && db.mongoDb) {
        return await db.mongoDb.collection("system_settings").findOne({ type: "global_config" });
      }
      return null;
    }, 3600);

    // Apply Row-Level Security with dynamic visibility window
    filteredData = filterByAccess(data, req.user, "bookings", settings);
  }
  
  return success(res, "Bookings fetched successfully", filteredData);
};

exports.get_id_3 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("bookings").doc(id).get();
  if (!doc.exists) return error(res, "Booking not found", 404);
  
  const settings = await getOrSet("global_config", async () => {
    if (db && db.mongoDb) {
      return await db.mongoDb.collection("system_settings").findOne({ type: "global_config" });
    }
    return null;
  }, 3600);

  const bookingData = { id: doc.id, ...doc.data() };
  const filtered = filterByAccess([bookingData], req.user, "bookings", settings);
  if (filtered.length === 0) {
    return error(res, "Forbidden: Access denied to this booking", 403);
  }

  return success(res, "Booking fetched successfully", bookingData);
};

exports.put_id_4 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("bookings").doc(id).get();
  if (!doc.exists) return error(res, "Booking not found", 404);
  
  const settings = await getOrSet("global_config", async () => {
    if (db && db.mongoDb) {
      return await db.mongoDb.collection("system_settings").findOne({ type: "global_config" });
    }
    return null;
  }, 3600);

  const bookingData = { id, ...doc.data() };
  if (!canModifyBooking(bookingData, req.user)) {
    return error(res, "Forbidden: You can only edit bookings created by you.", 403);
  }
  const filtered = filterByAccess([bookingData], req.user, "bookings", settings);
  if (filtered.length === 0) {
    return error(res, "Forbidden: Access denied to edit this booking", 403);
  }

  const isSuperAdmin = (req.user?.role || "").toLowerCase().replace(/\s+/g, '') === 'superadmin' || req.user?.email === 'admin@multimarg.com';
  const existingData = doc.data();
  const oldAwb = String(existingData.consignment || existingData.awb || existingData.lrNo || '').trim();
  const requestedAwb = req.body.consignment !== undefined 
    ? String(req.body.consignment).trim() 
    : (req.body.awb !== undefined ? String(req.body.awb).trim() : oldAwb);

  // Check if AWB number is being changed
  if (requestedAwb && oldAwb && requestedAwb !== oldAwb) {
    if (!isSuperAdmin) {
      return error(res, "Forbidden: Only Super Admin can edit the AWB Number after booking.", 403);
    }
    
    // Super Admin edit: Check if requested AWB is already in use by another booking
    if (db.mongoDb) {
      const conflict = await db.mongoDb.collection("bookings").findOne({
        _id: { $ne: id },
        id: { $ne: id },
        $or: [
          { consignment: requestedAwb },
          { awb: requestedAwb },
          { lrNo: requestedAwb }
        ]
      });
      if (conflict) {
        return error(res, `AWB Number "${requestedAwb}" is already used by another booking.`, 400);
      }

      // Cascade update related collections referencing old AWB
      if (oldAwb) {
        await db.mongoDb.collection("tracking").updateMany(
          { awb: oldAwb },
          { $set: { awb: requestedAwb } }
        );
        await db.mongoDb.collection("pod").updateMany(
          { lrNo: oldAwb },
          { $set: { lrNo: requestedAwb } }
        );
        await db.mongoDb.collection("box").updateMany(
          { lrNo: oldAwb },
          { $set: { lrNo: requestedAwb } }
        );
        await db.mongoDb.collection("bills").updateMany(
          { lrNo: oldAwb },
          { $set: { lrNo: requestedAwb } }
        );
      }

      // If requested AWB is numeric, ensure counter is >= requestedAwb
      const match = requestedAwb.match(/^([^0-9]+)?(\d+)$/);
      if (match) {
        const num = parseInt(match[2], 10);
        await db.mongoDb.collection("counters").findOneAndUpdate(
          { _id: "awb_counter" },
          { $max: { seq: num } },
          { upsert: true }
        );
      }
    }

    req.body.consignment = requestedAwb;
    req.body.awb = requestedAwb;
    req.body.lrNo = requestedAwb;
  } else if (!isSuperAdmin) {
    // Prevent non-superadmin from changing or removing existing AWB
    if (oldAwb) {
      req.body.consignment = oldAwb;
      req.body.awb = oldAwb;
      req.body.lrNo = oldAwb;
    }
  }

  if (req.body.dispatch_date || req.body.date) {
    const updatedDate = req.body.dispatch_date || req.body.date;
    req.body.dispatch_date = updatedDate;
    req.body.date = updatedDate;
  }

  // Intercept tracking-related updates for step-by-step history
  const remarksChanged = req.body.remarks !== undefined && String(req.body.remarks).trim() !== String(existingData.remarks || '').trim();
  const transitStatusChanged = req.body.transitStatus !== undefined && String(req.body.transitStatus).trim() !== String(existingData.transitStatus || '').trim();
  const statusChanged = req.body.status !== undefined && String(req.body.status).trim() !== String(existingData.status || '').trim();
  const locationChanged = req.body.currentLocation !== undefined && String(req.body.currentLocation).trim() !== String(existingData.currentLocation || '').trim();

  if (remarksChanged || transitStatusChanged || statusChanged || locationChanged) {
    try {
      const now = new Date();
      const newRemarks = req.body.remarks !== undefined ? String(req.body.remarks).trim() : String(existingData.remarks || '').trim();
      const newStatus = req.body.transitStatus || req.body.status || existingData.transitStatus || existingData.status || "In Transit";
      const newLocation = req.body.currentLocation || req.body.origin || existingData.currentLocation || existingData.origin || "Origin Facility";

      const newTracking = {
        awb: requestedAwb || oldAwb,
        status: newStatus,
        location: newLocation,
        date: now.toISOString(),
        remarks: newRemarks || `Status updated to ${newStatus}`,
        enteredBy: req.user?.name || req.user?.email || "Admin",
        enteredById: req.user?.id || null,
        enteredByRole: req.user?.role || "Admin",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
      await db.collection("tracking").add(newTracking);
    } catch (trkErr) {
      console.error("[Booking Edit Remarks Tracking Sync Error]:", trkErr);
    }
  }

  await db.collection("bookings").doc(id).update(req.body);
  
  const updatedBooking = { id, ...doc.data(), ...req.body };
  
  await delCache(CACHE_KEY);
  await delCache("unbilled");
  await delCache("bills");
  emitDataUpdated("bookings", "update");
  emitDataUpdated("unbilled", "update");
  emitDataUpdated("bills", "update");

  logUserActivity(req, {
    type: 'booking_update',
    title: `Updated Booking #${updatedBooking.consignment || id}`,
    details: { bookingId: id }
  });

  return success(res, "Booking updated successfully", {
    id,
    ...req.body
  });
};

exports.delete_id_5 = async (req, res) => {
  const { id } = req.params;
  const doc = await db.collection("bookings").doc(id).get();
  if (!doc.exists) return error(res, "Booking not found", 404);
  const bookingData = { id, ...doc.data() }; // capture before deletion

  if (!canModifyBooking(bookingData, req.user)) {
    return error(res, "Forbidden: You can only delete bookings created by you.", 403);
  }

  const settings = await getOrSet("global_config", async () => {
    if (db && db.mongoDb) {
      return await db.mongoDb.collection("system_settings").findOne({ type: "global_config" });
    }
    return null;
  }, 3600);

  const filtered = filterByAccess([bookingData], req.user, "bookings", settings);
  if (filtered.length === 0) {
    return error(res, "Forbidden: Access denied to delete this booking", 403);
  }

  await db.collection("bookings").doc(id).delete(req.user);

  // Cascade delete related tracking entries
  if (bookingData?.consignment) {
    const trackingSnap = await db.collection("tracking")
      .where("awb", "==", bookingData.consignment)
      .get();
    const batchDel = db.batch();
    trackingSnap.forEach(trkDoc => {
      batchDel.delete(db.collection("tracking").doc(trkDoc.id));
    });
    await batchDel.commit();
  }

  // Cascade delete related bills
  if (bookingData?.lrNumber) {
    const billsSnap = await db.collection("bills")
      .where("lrNo", "==", bookingData.lrNumber)
      .get();
    const batchBills = db.batch();
    billsSnap.forEach(billDoc => {
      batchBills.delete(db.collection("bills").doc(billDoc.id));
    });
    await batchBills.commit();
  }

  await delCache(CACHE_KEY);
  await delCache("unbilled");
  await delCache("bills");
  emitDataUpdated("bookings", "delete");
  emitDataUpdated("unbilled", "update");
  emitDataUpdated("bills", "update");
  return success(res, "Booking and related data deleted successfully");
};

exports.delete_clear_all_6 = async (req, res) => {
  // Optional safety check: Ensure user is SuperAdmin
  const role = (req.user?.role || "").toLowerCase().replace(/\s+/g, '');
  if (role !== 'superadmin' && req.user?.email !== 'admin@multimarg.com') {
    return error(res, "Forbidden: Only SuperAdmins can clear bookings.", 403);
  }

  const { startDate, endDate } = req.query;

  try {
    const snapshot = await db.collection("bookings").get();
    if (snapshot.empty) {
      emitDataUpdated("bookings", "update");
      return success(res, "No bookings found to delete.");
    }

    const parseBookingDate = (d) => {
      if (!d) return null;
      if (typeof d === "string" && /^\d{2}-\d{2}-\d{4}$/.test(d)) {
        const [day, month, year] = d.split("-");
        return new Date(`${year}-${month}-${day}`);
      }
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    const docsToDelete = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      let keep = true;

      if (startDate || endDate) {
        const bDate = parseBookingDate(data.createdAt || data.date || data.dispatch_date);
        if (bDate) {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (bDate < start) keep = false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (bDate > end) keep = false;
          }
        } else {
          keep = false; // exclude if date range is set but date is missing/invalid
        }
      }

      if (keep) {
        docsToDelete.push({ id: doc.id, data });
      }
    });

    if (docsToDelete.length === 0) {
      return success(res, "No bookings found within the specified date range.");
    }

    // Insert filtered to Trash first
    const dbInstance = db.mongoDb;
    if (dbInstance) {
      const trashDocs = docsToDelete.map(item => ({
        originalCollection: "bookings",
        document: { id: item.id, ...item.data },
        deletedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        deletedBy: req.user ? { id: req.user.id, name: req.user.name, role: req.user.role } : null
      }));
      await dbInstance.collection("trash").insertMany(trashDocs);
    }

    // Delete in batches since Firestore/MongoDB adapters might have limits
    const batch = db.batch();
    for (const item of docsToDelete) {
      batch.delete(db.collection("bookings").doc(item.id));

      // Cascade delete related tracking entries
      if (item.data.consignment) {
        const trackingSnap = await db.collection("tracking")
          .where("awb", "==", item.data.consignment)
          .get();
        trackingSnap.forEach(trkDoc => {
          batch.delete(db.collection("tracking").doc(trkDoc.id));
        });
      }

      // Cascade delete related bills
      const lrNo = item.data.lrNumber || item.data.awb || item.data.lrNo;
      if (lrNo) {
        const billsSnap = await db.collection("bills")
          .where("lrNo", "==", lrNo)
          .get();
        billsSnap.forEach(billDoc => {
          batch.delete(db.collection("bills").doc(billDoc.id));
        });
      }
    }
    
    await batch.commit();
    await delCache(CACHE_KEY);
    await delCache("unbilled");
    await delCache("bills");
    emitDataUpdated("bookings", "delete");
    emitDataUpdated("unbilled", "update");
    emitDataUpdated("bills", "update");
    return success(res, `Successfully moved ${docsToDelete.length} bookings to Trash.`);
  } catch (err) {
    console.error("Error clearing bookings:", err);
    return error(res, "Failed to clear bookings", 500);
  }
};


