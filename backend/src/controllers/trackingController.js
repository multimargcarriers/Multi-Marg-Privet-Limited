const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { filterByAccess } = require("../utils/security");

const CACHE_KEY = "tracking";

exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("tracking").orderBy("updatedAt", "desc").get();
    const entries = [];
    const seen = new Set();
    snapshot.forEach(doc => {
      const docData = doc.data() || {};
      const docId = String(doc.id || docData.id || docData._id || '');
      const awbNorm = String(docData.awb || '').trim().toLowerCase();
      const statusNorm = String(docData.status || '').trim().toLowerCase();

      let cleanRemarks = docData.remarks;
      if (!cleanRemarks || String(cleanRemarks).trim().toLowerCase() === 'na' || String(cleanRemarks).trim() === '') {
        const loc = String(docData.location || 'ORIGIN').toUpperCase();
        if (statusNorm.includes('book')) {
          cleanRemarks = `SHIPMENT BOOKED AT ${loc}. LORRY RECEIPT (LR) GENERATED.`;
        } else if (statusNorm.includes('transit')) {
          cleanRemarks = `DISPATCHED FROM ${loc}`;
        }
      }

      const remarksNorm = String(cleanRemarks || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const locNorm = String(docData.location || '').trim().toLowerCase().replace(/\s+/g, ' ');

      // Deduplication signature: awb + status + (remarks or loc)
      const dedupKey = `${awbNorm}__${statusNorm}__${remarksNorm || locNorm}`;
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);

      entries.push({
        id: docId,
        _id: docId,
        ...docData,
        remarks: cleanRemarks ? String(cleanRemarks).toUpperCase() : cleanRemarks
      });
    });
    return entries;
  }, 120);
  return success(res, "Tracking entries fetched successfully", data);
};

exports.get_awb_2 = async (req, res) => {
  const { awb } = req.params;
  const cleanAwb = String(awb || '').trim();
  const snapshot = await db.collection("tracking").where("awb", "==", cleanAwb).orderBy("updatedAt", "desc").get();
  const entries = [];
  snapshot.forEach(doc => entries.push({
    id: doc.id,
    ...doc.data()
  }));

  // Ensure initial milestones (Booked and In Transit) exist if matching booking is found
  try {
    let booking = null;
    if (db.mongoDb) {
      const awbRegex = new RegExp(`^${cleanAwb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      booking = await db.mongoDb.collection("bookings").findOne({
        $or: [{ awb: awbRegex }, { consignment: awbRegex }, { lrNo: awbRegex }]
      });
    }
    if (booking) {
      const originLoc = String(booking.origin || "").trim().toUpperCase() || "ORIGIN";
      const bookingDate = booking.dispatch_date 
        ? (booking.dispatch_date.includes('T') ? booking.dispatch_date : `${booking.dispatch_date}T09:00:00.000Z`) 
        : (booking.createdAt || new Date().toISOString());

      const bookingTimeMs = new Date(booking.createdAt || booking.realBookingDate || bookingDate).getTime();
      const minutesSinceBooking = (Date.now() - bookingTimeMs) / (60 * 1000);

      const hasBooked = entries.some(e => String(e.status || '').toLowerCase().includes("book"));
      if (!hasBooked) {
        entries.push({
          id: `booked-${booking.id || cleanAwb}`,
          awb: cleanAwb,
          status: "Booked",
          location: originLoc,
          date: bookingDate,
          remarks: `SHIPMENT BOOKED AT ${originLoc}. LORRY RECEIPT (LR) GENERATED.`,
          enteredBy: "System",
          createdAt: bookingDate,
          updatedAt: bookingDate
        });
      }

      const bookingStatusNorm = String(booking.status || booking.transitStatus || '').toLowerCase().trim();
      const isTransitEligible = hasTransit || minutesSinceBooking >= 30 || (bookingStatusNorm !== 'booked' && bookingStatusNorm !== '');
      if (isTransitEligible) {
        if (!hasTransit) {
          const transitDate = new Date(bookingTimeMs + 30 * 60 * 1000).toISOString();
          entries.push({
            id: `transit-${booking.id || cleanAwb}`,
            awb: cleanAwb,
            status: "In Transit",
            location: originLoc,
            date: transitDate,
            remarks: `DISPATCHED FROM ${originLoc}`,
            enteredBy: "System",
            createdAt: transitDate,
            updatedAt: transitDate
          });
        }
      }

      entries.forEach(e => {
        const loc = (e.location || originLoc).toUpperCase();
        if (!e.remarks || String(e.remarks).trim().toLowerCase() === 'na' || String(e.remarks).trim() === '') {
          if (String(e.status || '').toLowerCase().includes('book')) {
            e.remarks = `SHIPMENT BOOKED AT ${loc}. LORRY RECEIPT (LR) GENERATED.`;
          } else if (String(e.status || '').toLowerCase().includes('transit')) {
            e.remarks = `DISPATCHED FROM ${loc}`;
          }
        }
        if (String(e.remarks || '').toUpperCase().includes('BOOKED') && !String(e.status || '').toLowerCase().includes('transit')) {
          e.status = 'Booked';
        }
        if (e.remarks) e.remarks = String(e.remarks).toUpperCase();
      });

      if (booking.podUrl) {
        const delEntry = entries.find(e => String(e.status || '').toLowerCase().includes("delivered"));
        if (delEntry && !delEntry.podUrl) {
          delEntry.podUrl = booking.podUrl;
        }
      }
    }
  } catch (err) {
    console.error("[get_awb_2 booking check error]:", err);
  }

  // Deduplicate entries in-memory to guarantee no repeated milestones in the timeline
  const dedupMap = new Map();
  for (const e of entries) {
    const sNorm = String(e.status || '').trim().toLowerCase();
    const rNorm = String(e.remarks || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const lNorm = String(e.location || '').trim().toLowerCase().replace(/\s+/g, ' ');

    let dedupKey;
    if (sNorm.includes('book')) {
      dedupKey = `booked`;
    } else if (sNorm.includes('deliver')) {
      dedupKey = `delivered`;
    } else {
      dedupKey = `${sNorm}__${rNorm || lNorm}`;
    }

    if (!dedupMap.has(dedupKey)) {
      dedupMap.set(dedupKey, e);
    } else {
      const existing = dedupMap.get(dedupKey);
      if (e.podUrl && !existing.podUrl) existing.podUrl = e.podUrl;
    }
  }

  const cleanEntries = Array.from(dedupMap.values());
  cleanEntries.sort((a, b) => {
    const timeA = new Date(a.date || a.updatedAt || 0).getTime();
    const timeB = new Date(b.date || b.updatedAt || 0).getTime();
    return timeB - timeA;
  });

  return success(res, "Tracking entries fetched successfully", cleanEntries);
};

exports.postRoot_3 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const entry = req.body;
  
  const cleanAwb = String(entry.awb || '').trim();
  if (!cleanAwb) return error(res, "AWB number is required", 400);

  // 1. Fetch matching booking and existing tracking entries
  let existingBooking = null;
  let awbRegex = null;
  try {
    if (db.mongoDb) {
      awbRegex = new RegExp(`^${cleanAwb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      existingBooking = await db.mongoDb.collection("bookings").findOne({
        $or: [{ awb: awbRegex }, { consignment: awbRegex }, { lrNo: awbRegex }]
      });
    }
  } catch (err) {
    console.error("[Tracking check booking error]:", err);
  }

  const existingTrackingSnap = await db.collection("tracking").where("awb", "==", cleanAwb).get();
  const existingEntries = [];
  existingTrackingSnap.forEach(d => existingEntries.push({ id: d.id, ...d.data() }));

  const targetStatusNorm = String(entry.status || '').trim().toLowerCase();
  const targetRemarksNorm = String(entry.remarks || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const targetLocationNorm = String(entry.location || '').trim().toLowerCase().replace(/\s+/g, ' ');

  // DUPLICATE CHECK: Prevent duplicate updates with same remarks / same status
  const isDuplicate = existingEntries.some(e => {
    const eStatusNorm = String(e.status || '').trim().toLowerCase();
    const eRemarksNorm = String(e.remarks || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const eLocNorm = String(e.location || '').trim().toLowerCase().replace(/\s+/g, ' ');

    if (eStatusNorm === targetStatusNorm) {
      if (targetStatusNorm.includes('book')) return true; // only 1 Booked allowed
      if (targetStatusNorm.includes('deliver')) return true; // only 1 Delivered allowed
      if (targetRemarksNorm && eRemarksNorm === targetRemarksNorm) return true; // duplicate remarks
      if (targetLocationNorm && eLocNorm === targetLocationNorm) return true; // duplicate location status
    }
    return false;
  });

  if (isDuplicate) {
    return error(res, `A tracking update with status "${entry.status}" and matching remarks/location already exists for this shipment.`, 400);
  }

  // FLOW RULE 1: If shipment is already Delivered, all update options are strictly locked!
  const isAlreadyDelivered = existingEntries.some(e => String(e.status || '').toLowerCase().includes("delivered")) ||
    (existingBooking && String(existingBooking.status || existingBooking.transitStatus || '').toLowerCase() === 'delivered');

  if (isAlreadyDelivered) {
    return error(res, "Shipment is already Delivered. Tracking updates are locked. Delete the Delivered entry first to make changes.", 400);
  }

  // FLOW RULE 2: "it should not be backed" - if currently Out for Delivery, cannot revert to In Transit or Booked
  const isAlreadyOutForDelivery = existingEntries.some(e => {
    const s = String(e.status || '').toLowerCase();
    return s.includes("out for delivery") || s.includes("out_for_delivery");
  }) || (existingBooking && (String(existingBooking.status || '').toLowerCase().includes("out for delivery") || String(existingBooking.transitStatus || '').toLowerCase().includes("out for delivery")));

  if (isAlreadyOutForDelivery && (targetStatusNorm.includes("transit") || targetStatusNorm.includes("book") || targetStatusNorm.includes("pickup"))) {
    return error(res, "Shipment is already Out for Delivery and cannot be moved backward to In Transit or Booked.", 400);
  }

  const now = new Date().toISOString();
  if (!entry.date || !entry.date.includes('T')) {
    if (entry.date && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
      entry.date = `${entry.date}T${now.split('T')[1]}`;
    } else {
      entry.date = now;
    }
  }

  // FLOW RULE 3: "if we select one out for delivery for shipment the intrinsit should be done after the out for deliovery"
  // If moving to Out for Delivery, ensure In Transit milestone exists prior in the timeline
  if (targetStatusNorm.includes("out for delivery") || targetStatusNorm.includes("out_for_delivery")) {
    const hasInTransit = existingEntries.some(e => String(e.status || '').toLowerCase().includes("transit"));
    if (!hasInTransit) {
      const originLoc = existingBooking?.origin ? String(existingBooking.origin).trim().toUpperCase() : (entry.location || "ORIGIN");
      const bDate = existingBooking?.dispatch_date || existingBooking?.date || existingBooking?.createdAt || now;
      const bDateObj = new Date(bDate);
      const transitDateObj = new Date(bDateObj.getTime() + 2.5 * 60 * 1000);
      const transitIso = !isNaN(transitDateObj.getTime()) ? transitDateObj.toISOString() : now;

      const autoTransit = {
        awb: cleanAwb,
        status: "In Transit",
        location: originLoc,
        date: transitIso,
        remarks: `DISPATCHED FROM ${originLoc}`,
        enteredBy: req.user?.name || req.user?.email || "System",
        enteredById: req.user?.id || null,
        enteredByRole: req.user?.role || "System",
        createdAt: transitIso,
        updatedAt: transitIso
      };
      await db.collection("tracking").add(autoTransit);
    }
  }

  // Save who entered the tracking update
  entry.enteredBy = req.user?.name || req.user?.email || "Unknown";
  entry.enteredById = req.user?.id || null;
  entry.enteredByRole = req.user?.role || "Unknown";
  entry.location = String(entry.location || '').trim().toUpperCase();
  if (entry.remarks) entry.remarks = String(entry.remarks).trim().toUpperCase();
  entry.createdAt = entry.createdAt || now;
  entry.updatedAt = now;

  const docRef = await db.collection("tracking").add(entry);

  // Sync transit status into matching booking
  try {
    if (existingBooking && db.mongoDb) {
      const bookingUpdate = {
        lastTrackingUpdate: now,
        currentLocation: entry.location,
        transitStatus: entry.status,
        trackingStatus: entry.status,
        status: entry.status === 'Delivered' ? 'Delivered' : ((existingBooking.status === "Billed" || existingBooking.status === "Unbilled") ? existingBooking.status : entry.status)
      };

      if (entry.status === 'Delivered') {
        bookingUpdate.deliveryDate = entry.date || now;
      }

      await db.mongoDb.collection("bookings").updateOne({ _id: existingBooking._id }, { $set: bookingUpdate });
    }
  } catch (bkErr) {
    console.error("[Tracking Sync to Booking Error]:", bkErr);
  }

  await Promise.all([
    delCache(CACHE_KEY),
    delCache("bookings"),
    delCache("dashboard_stats")
  ]);

  try {
    const { emitDataUpdated } = require("../utils/socket");
    emitDataUpdated("tracking", "create");
    emitDataUpdated("bookings", "update");
  } catch (sockErr) {}

  return created(res, "Tracking entry created successfully", {
    id: docRef.id,
    ...entry
  });
};

exports.delete_id_4 = async (req, res) => {
  const { id } = req.params;
  if (!id || id === 'undefined' || id === 'null') {
    return error(res, "Invalid tracking ID provided", 400);
  }

  // Handle synthetic IDs like booked-xxx or transit-xxx gracefully
  if (typeof id === 'string' && (id.startsWith('booked-') || id.startsWith('transit-'))) {
    return success(res, "Initial milestone entry removed from view");
  }

  let entry = null;
  let docRef = null;

  // 1. Try adapter lookup
  try {
    const doc = await db.collection("tracking").doc(id).get();
    if (doc.exists) {
      entry = doc.data();
      docRef = doc.ref;
    }
  } catch (adapterErr) {
    console.warn("[Tracking Delete] Adapter lookup failed:", adapterErr.message);
  }

  // 2. Direct MongoDB fallback if not found by adapter
  if (!entry && db.mongoDb) {
    try {
      const { ObjectId } = require("mongodb");
      const queries = [{ id: id }];
      if (typeof id === 'string' && id.length === 24 && ObjectId.isValid(id)) {
        queries.push({ _id: new ObjectId(id) });
      }
      queries.push({ _id: id });
      const directDoc = await db.mongoDb.collection("tracking").findOne({ $or: queries });
      if (directDoc) {
        entry = { ...directDoc };
        delete entry._id;
      }
    } catch (mErr) {
      console.error("[Tracking Delete] MongoDB lookup error:", mErr);
    }
  }

  if (!entry) {
    return error(res, "Tracking entry not found", 404);
  }

  const role = (req.user?.role || "").toLowerCase().replace(/[\s_-]+/g, '');
  const isSuperAdmin = role === 'superadmin' || role === 'admin' || req.user?.email === 'admin@multimarg.com' || (req.user?.permissions && (req.user.permissions.includes('all') || req.user.permissions.includes('update_tracking') || req.user.permissions.includes('operations')));
  const isOwner = entry.enteredById === req.user?.id || entry.enteredBy === req.user?.name || entry.enteredBy === req.user?.email;

  if (!isSuperAdmin && !isOwner) {
    return error(res, "Unauthorized to delete this tracking entry", 403);
  }

  const awbNo = String(entry.awb || entry.consignment || entry.lrNo || '').trim();

  // Delete from tracking collection (both via docRef and direct mongo delete to ensure 100% cleanliness)
  try {
    if (docRef) {
      await docRef.delete();
    }
    if (db.mongoDb) {
      const { ObjectId } = require("mongodb");
      const queries = [{ id: id }];
      if (typeof id === 'string' && id.length === 24 && ObjectId.isValid(id)) {
        queries.push({ _id: new ObjectId(id) });
      }
      queries.push({ _id: id });
      await db.mongoDb.collection("tracking").deleteOne({ $or: queries });
    }
  } catch (delErr) {
    console.error("[Tracking Delete] Document deletion error:", delErr);
  }

  try {
    if (awbNo && db.mongoDb) {
      const awbRegex = new RegExp(`^${awbNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      
      const existingBooking = await db.mongoDb.collection("bookings").findOne({
        $or: [{ awb: awbRegex }, { consignment: awbRegex }, { lrNo: awbRegex }]
      });

      // If deleting a Delivered entry, also purge any attached POD document so delivery is fully reversed
      const isDeliveredEntryDeleted = String(entry.status || '').toLowerCase().includes("deliver");
      if (isDeliveredEntryDeleted) {
        const podFilter = [{ lrNo: awbRegex }, { awb: awbRegex }, { consignment: awbRegex }];
        if (existingBooking) {
          podFilter.push({ bookingId: existingBooking.id || existingBooking._id.toString() });
        }
        await db.mongoDb.collection("pod").deleteMany({ $or: podFilter });
      }

      if (existingBooking) {
        const snapshot = await db.collection("tracking").where("awb", "==", awbNo).get();
        const checkpoints = [];
        snapshot.forEach(doc => {
          if (doc.id !== id && doc.id !== entry.id) {
            checkpoints.push(doc.data());
          }
        });

        const remainingPodDoc = isDeliveredEntryDeleted ? null : await db.mongoDb.collection("pod").findOne({
          $or: [
            { lrNo: awbRegex },
            { awb: awbRegex },
            { consignment: awbRegex },
            { bookingId: existingBooking.id || existingBooking._id.toString() }
          ]
        });

        const originLoc = existingBooking.origin ? String(existingBooking.origin).trim().toUpperCase() : "ORIGIN";
        let newStatus = "In Transit";
        let currentLocation = originLoc;

        if (remainingPodDoc) {
          newStatus = "Delivered";
        } else if (checkpoints.length > 0) {
          const parseDateSecurely = (dateVal) => {
            if (!dateVal) return 0;
            const parsed = new Date(dateVal);
            return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
          };
          checkpoints.sort((a, b) => parseDateSecurely(b.date || b.updatedAt || b.createdAt) - parseDateSecurely(a.date || a.updatedAt || a.createdAt));
          
          const latestCheckpoint = checkpoints[0];
          newStatus = latestCheckpoint.status || "In Transit";
          currentLocation = latestCheckpoint.location ? String(latestCheckpoint.location).trim().toUpperCase() : originLoc;
        }

        const bookingUpdate = {
          transitStatus: newStatus,
          trackingStatus: newStatus,
          status: (existingBooking.status === "Billed" || existingBooking.status === "Unbilled") ? existingBooking.status : newStatus,
          currentLocation: currentLocation,
          podUploaded: Boolean(remainingPodDoc),
          podUrl: remainingPodDoc ? (remainingPodDoc.podUrl || remainingPodDoc.cloudinaryUrl) : null,
          updatedAt: new Date().toISOString()
        };

        if (newStatus !== "Delivered") {
          bookingUpdate.deliveryDate = null;
        }

        await db.mongoDb.collection("bookings").updateOne({ _id: existingBooking._id }, { $set: bookingUpdate });
      }
    }
  } catch (bkErr) {
    console.error("[Tracking Delete Sync to Booking Error]:", bkErr);
  }

  await Promise.all([
    delCache(CACHE_KEY),
    delCache("bookings"),
    delCache("pod"),
    delCache("dashboard_stats")
  ]);

  try {
    const { emitDataUpdated } = require("../utils/socket");
    emitDataUpdated("tracking", "delete");
    emitDataUpdated("bookings", "update");
    emitDataUpdated("pod", "delete");
  } catch (sockErr) {}

  return success(res, "Tracking entry deleted successfully");
};

exports.put_id_5 = async (req, res) => {
  const { id } = req.params;
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  
  const doc = await db.collection("tracking").doc(id).get();
  const existingEntry = doc.data();
  const role = (req.user?.role || "").toLowerCase().replace(/[\s_-]+/g, '');
  const isSuperAdmin = role === 'superadmin' || role === 'admin' || req.user?.email === 'admin@multimarg.com' || (req.user?.permissions && (req.user.permissions.includes('all') || req.user.permissions.includes('update_tracking') || req.user.permissions.includes('operations')));
  const isOwner = existingEntry.enteredById === req.user?.id || existingEntry.enteredBy === req.user?.name || existingEntry.enteredBy === req.user?.email;

  if (!isSuperAdmin && !isOwner) {
    return error(res, "Unauthorized to modify this tracking entry", 403);
  }

  // FLOW RULE: Delivered entries are locked from modification
  if (String(existingEntry.status || '').toLowerCase().includes("deliver")) {
    return error(res, "Delivered tracking entry is locked. Delete the Delivered entry to update the shipment status.", 400);
  }

  const updates = {
    ...req.body,
    location: req.body.location ? String(req.body.location).trim().toUpperCase() : existingEntry.location,
    remarks: req.body.remarks ? String(req.body.remarks).trim().toUpperCase() : existingEntry.remarks,
    updatedAt: new Date().toISOString(),
    enteredBy: req.user?.name || req.user?.email || "Unknown",
    enteredById: req.user?.id || null,
    enteredByRole: req.user?.role || "Unknown"
  };
  
  await db.collection("tracking").doc(id).update(updates);
  await delCache(CACHE_KEY);
  
  return success(res, "Tracking entry updated successfully", { id, ...updates });
};

exports.postBulk_6 = async (req, res) => {
  const { awbs, status, location, date, remarks } = req.body;
  if (!awbs || !Array.isArray(awbs) || awbs.length === 0) {
    return error(res, "awbs array is required", 400);
  }
  if (!status || !location) {
    return error(res, "status and location are required", 400);
  }

  const enteredBy = req.user?.name || req.user?.email || "Admin";
  const enteredById = req.user?.id || null;
  const enteredByRole = req.user?.role || "Admin";
  const now = new Date().toISOString();
  let trackingDate = now;
  if (date) {
    if (date.includes('T')) {
      trackingDate = date;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      trackingDate = `${date}T${now.split('T')[1]}`;
    }
  }

  const createdEntries = [];

  const cleanLoc = String(location || '').trim().toUpperCase();
  for (const awb of awbs) {
    const cleanAwb = String(awb).trim().toUpperCase();

    // Check if shipment is already delivered (if so, skip because updates are locked)
    if (cleanAwb && db.mongoDb) {
      const awbRegex = new RegExp(`^${cleanAwb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      const existingBooking = await db.mongoDb.collection("bookings").findOne({
        $or: [{ awb: awbRegex }, { consignment: awbRegex }, { lrNo: awbRegex }]
      });
      if (existingBooking) {
        const curSt = String(existingBooking.status || existingBooking.transitStatus || '').toLowerCase();
        if (curSt === 'delivered') {
          continue; // Delivered shipment is locked from updates
        }
      }
    }

    const entryData = {
      awb: cleanAwb,
      status,
      location: cleanLoc,
      date: trackingDate,
      remarks: remarks ? String(remarks).trim().toUpperCase() : "",
      enteredBy,
      enteredById,
      enteredByRole,
      createdAt: now,
      updatedAt: now
    };
    const docRef = await db.collection("tracking").add(entryData);
    createdEntries.push({ id: docRef.id, ...entryData });

    // Sync transit status into matching booking
    try {
      if (cleanAwb && db.mongoDb) {
        const awbRegex = new RegExp(`^${cleanAwb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        
        const existingBooking = await db.mongoDb.collection("bookings").findOne({
          $or: [{ awb: awbRegex }, { consignment: awbRegex }, { lrNo: awbRegex }]
        });

        if (existingBooking) {
          const currentStatus = String(existingBooking.status || '').toLowerCase();
          const currentTransit = String(existingBooking.transitStatus || '').toLowerCase();
          
          const isFinal = currentStatus === 'delivered' || currentStatus === 'billed' || currentTransit === 'delivered';
          
          const bookingUpdate = {
            lastTrackingUpdate: now,
            currentLocation: cleanLoc
          };

          if (!isFinal) {
            bookingUpdate.transitStatus = status;
            bookingUpdate.trackingStatus = status;
            if (status === 'Delivered') {
              bookingUpdate.status = 'Delivered';
              bookingUpdate.deliveryDate = trackingDate;
            }
          }

          await db.mongoDb.collection("bookings").updateOne({ _id: existingBooking._id }, { $set: bookingUpdate });
        }
      }
    } catch (bkErr) {}
  }

  await Promise.all([
    delCache(CACHE_KEY),
    delCache("bookings"),
    delCache("dashboard_stats")
  ]);

  try {
    const { emitDataUpdated } = require("../utils/socket");
    emitDataUpdated("tracking", "create");
    emitDataUpdated("bookings", "update");
  } catch (sockErr) {}

  return created(res, `Tracking updated successfully for ${createdEntries.length} AWBs`, createdEntries);
};



