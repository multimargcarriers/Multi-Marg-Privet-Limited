const { emitDataUpdated } = require("../utils/socket");
const { filterByAccess } = require("../utils/security");
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
  const gstin = booking.gstin || booking.consignee_gstin || booking.consignor_gstin || "";
  const clientStateCode = gstin ? gstin.substring(0, 2) : "";
  
  const applyGst = true;
  const gstRate = applyGst ? 18 : 0;
  const taxable = freight + awb + pickup + delivery + packaging + handling;
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
  const pkgQty = booking.package_count || booking.pcs || booking.packages || 1;
  const wtVal = booking.weight_chargeable || booking.weight || 0;
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
    billNo = `MCPL/26-27/${String(totalBills + 1).padStart(4, "0")}`;
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
    otherCharge: 0,
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
        oth: 0,
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


exports.postRoot_1 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const booking = req.body;
  booking.date = new Date().toISOString();
  booking.status = "Booked";
  booking.lrNumber = generateLRNumber();
  
  const role = req.user?.role || "";
  const isAdmin = role === "Admin" || role === "SuperAdmin";
  
  if (!isAdmin || !booking.consignment) {
    try {
      // Find max AWB to ensure continuity with existing data
      const allBookings = await db.mongoDb.collection("bookings").find({}, { projection: { consignment: 1, awb: 1, lrNo: 1 } }).toArray();
      let maxNum = 0;
      allBookings.forEach(b => {
        const awbStr = b.awb || b.consignment || b.lrNo || "";
        const match = String(awbStr).match(/^([^0-9]+)?(\d+)$/);
        if (match) {
          const num = parseInt(match[2], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      
      const counterDoc = await db.mongoDb.collection("counters").findOneAndUpdate(
        { _id: "awb_counter" },
        { $max: { seq: maxNum } }, // Ensure counter is at least maxNum
        { returnDocument: "after", upsert: true }
      );
      
      const updatedCounter = await db.mongoDb.collection("counters").findOneAndUpdate(
        { _id: "awb_counter" },
        { $inc: { seq: 1 } },
        { returnDocument: "after" }
      );
      
      booking.consignment = `${updatedCounter.seq}`;
    } catch (err) {
      console.error("Error generating sequential AWB:", err);
      booking.consignment = `MMC-${Date.now().toString().slice(-6)}`; // Fallback
    }
  }

  if (!booking.clerk_name) {
    booking.clerk_name = req.user?.name || "Admin";
  }
  booking.createdBy_id = req.user?.id || null;
  const docRef = await db.collection("bookings").add(booking);
  
  const createdBooking = { id: docRef.id, ...booking };
  // await generateOrUpdateBillForBooking(createdBooking, true); // Disabled auto-generation per user request
  
  await delCache(CACHE_KEY);
  emitDataUpdated("bookings");
  return created(res, "Booking created successfully", {
    id: docRef.id,
    ...booking
  });
};

exports.getRoot_2 = async (req, res) => {
  const isWorldwide = req.query.worldwide === 'true';

  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("bookings").orderBy("date", "desc").get();
    const bookings = [];
    snapshot.forEach(doc => {
      bookings.push({
        id: doc.id,
        ...doc.data()
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
      createdAt: b.createdAt
    }));
  } else {
    // Apply Row-Level Security
    filteredData = filterByAccess(data, req.user, "bookings");
  }
  
  return success(res, "Bookings fetched successfully", filteredData);
};

exports.get_id_3 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("bookings").doc(id).get();
  if (!doc.exists) return error(res, "Booking not found", 404);
  return success(res, "Booking fetched successfully", {
    id: doc.id,
    ...doc.data()
  });
};

exports.put_id_4 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("bookings").doc(id).get();
  if (!doc.exists) return error(res, "Booking not found", 404);
  await db.collection("bookings").doc(id).update(req.body);
  
  const updatedBooking = { id, ...doc.data(), ...req.body };
  // await generateOrUpdateBillForBooking(updatedBooking, false); // Disabled auto-generation per user request
  
  await delCache(CACHE_KEY);
  emitDataUpdated("bookings");
    return success(res, "Booking updated successfully", {
    id,
    ...req.body
  });
};

exports.delete_id_5 = async (req, res) => {
  const { id } = req.params;
  const doc = await db.collection("bookings").doc(id).get();
  if (!doc.exists) return error(res, "Booking not found", 404);
  const bookingData = doc.data(); // capture before deletion
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
  emitDataUpdated("bookings");
  return success(res, "Booking and related data deleted successfully");
};

exports.delete_clear_all_6 = async (req, res) => {
  // Optional safety check: Ensure user is SuperAdmin
  const role = (req.user?.role || "").toLowerCase().replace(/\s+/g, '');
  if (role !== 'superadmin' && req.user?.email !== 'admin@multimargcarriers.co.in') {
    return error(res, "Forbidden: Only SuperAdmins can clear all bookings.", 403);
  }

  try {
    const snapshot = await db.collection("bookings").get();
    if (snapshot.empty) {
      emitDataUpdated("bookings");
    return success(res, "No bookings found to delete.");
    }

    // Insert all to Trash first
    const dbInstance = db.mongoDb;
    if (dbInstance) {
      const trashDocs = snapshot.docs.map(doc => ({
        originalCollection: "bookings",
        document: { id: doc.id, ...doc.data() },
        deletedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        deletedBy: req.user ? { id: req.user.id, name: req.user.name, role: req.user.role } : null
      }));
      await dbInstance.collection("trash").insertMany(trashDocs);
    }

    // Delete in batches since Firestore/MongoDB adapters might have limits
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(db.collection("bookings").doc(doc.id));
    });
    
    await batch.commit();
    await delCache(CACHE_KEY);
    return success(res, `Successfully moved ${snapshot.size} bookings to Trash.`);
  } catch (err) {
    console.error("Error clearing bookings:", err);
    return error(res, "Failed to clear bookings", 500);
  }
};

