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
    snapshot.forEach(doc => entries.push({
      id: doc.id,
      ...doc.data()
    }));
    return entries;
  }, 300);
  return success(res, "Tracking entries fetched successfully", data);
};

exports.get_awb_2 = async (req, res) => {
  const { awb } = req.params;
  const snapshot = await db.collection("tracking").where("awb", "==", awb).orderBy("updatedAt", "desc").get();
  const entries = [];
  snapshot.forEach(doc => entries.push({
    id: doc.id,
    ...doc.data()
  }));
  return success(res, "Tracking entries fetched successfully", entries);
};

exports.postRoot_3 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const entry = req.body;
  
  // Save who entered the tracking update
  entry.enteredBy = req.user?.name || req.user?.email || "Unknown";
  entry.enteredById = req.user?.id || null;
  entry.enteredByRole = req.user?.role || "Unknown";

  const now = new Date().toISOString();
  if (!entry.date || !entry.date.includes('T')) {
    if (entry.date && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
      entry.date = `${entry.date}T${now.split('T')[1]}`;
    } else {
      entry.date = now;
    }
  }
  entry.createdAt = entry.createdAt || now;
  entry.updatedAt = now;
  const docRef = await db.collection("tracking").add(entry);

  // Sync transit status into matching booking
  try {
    const cleanAwb = String(entry.awb || '').trim();
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
          lastTrackingUpdate: new Date().toISOString()
        };

        if (!isFinal) {
          bookingUpdate.transitStatus = entry.status;
          bookingUpdate.trackingStatus = entry.status;
          bookingUpdate.currentLocation = entry.location;
          if (entry.status === 'Delivered') {
            bookingUpdate.status = 'Delivered';
            bookingUpdate.deliveryDate = entry.date || new Date().toISOString();
          }
        } else {
          // If it is final, only update current location if provided, but don't touch status
          bookingUpdate.currentLocation = entry.location || existingBooking.currentLocation;
        }

        await db.mongoDb.collection("bookings").updateOne({ _id: existingBooking._id }, { $set: bookingUpdate });
      }
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
  const doc = await db.collection("tracking").doc(id).get();
  if (!doc.exists) return error(res, "Tracking entry not found", 404);
  
  const entry = doc.data();

  const isSuperAdmin = req.user?.role === 'SuperAdmin' || req.user?.email === 'admin@multimarg.com';
  const isOwner = entry.enteredById === req.user?.id || entry.enteredBy === req.user?.name || entry.enteredBy === req.user?.email;

  if (!isSuperAdmin && !isOwner) {
    return error(res, "Unauthorized to delete this tracking entry", 403);
  }

  const awbNo = String(entry.awb || '').trim();

  await db.collection("tracking").doc(id).delete();

  try {
    if (awbNo && db.mongoDb) {
      const awbRegex = new RegExp(`^${awbNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      
      const existingBooking = await db.mongoDb.collection("bookings").findOne({
        $or: [{ awb: awbRegex }, { consignment: awbRegex }, { lrNo: awbRegex }]
      });

      if (existingBooking) {
        const snapshot = await db.collection("tracking").where("awb", "==", awbNo).get();
        const checkpoints = [];
        snapshot.forEach(doc => {
          if (doc.id !== id) {
            checkpoints.push(doc.data());
          }
        });

        const podDoc = await db.mongoDb.collection("pod").findOne({
          $or: [
            { lrNo: awbRegex },
            { bookingId: existingBooking.id || existingBooking._id.toString() }
          ]
        });

        let newStatus = "Picked Up";
        let currentLocation = null;

        if (podDoc) {
          newStatus = "Delivered";
        } else if (checkpoints.length > 0) {
          const parseDateSecurely = (dateVal) => {
            if (!dateVal) return 0;
            const parsed = new Date(dateVal);
            return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
          };
          checkpoints.sort((a, b) => parseDateSecurely(b.date || b.updatedAt || b.createdAt) - parseDateSecurely(a.date || a.updatedAt || a.createdAt));
          
          const latestCheckpoint = checkpoints[0];
          newStatus = latestCheckpoint.status || "Picked Up";
          currentLocation = latestCheckpoint.location || null;
        }

        const bookingUpdate = {
          transitStatus: newStatus,
          trackingStatus: newStatus,
          status: (existingBooking.status === "Billed" || existingBooking.status === "Unbilled") ? existingBooking.status : newStatus,
          currentLocation: currentLocation,
          podUploaded: Boolean(podDoc),
          podUrl: podDoc ? (podDoc.podUrl || podDoc.cloudinaryUrl) : null,
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
    delCache("dashboard_stats")
  ]);

  try {
    const { emitDataUpdated } = require("../utils/socket");
    emitDataUpdated("tracking", "delete");
    emitDataUpdated("bookings", "update");
  } catch (sockErr) {}

  return success(res, "Tracking entry deleted successfully");
};

exports.put_id_5 = async (req, res) => {
  const { id } = req.params;
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  
  const doc = await db.collection("tracking").doc(id).get();
  const existingEntry = doc.data();
  const isSuperAdmin = req.user?.role === 'SuperAdmin' || req.user?.email === 'admin@multimarg.com';
  const isOwner = existingEntry.enteredById === req.user?.id || existingEntry.enteredBy === req.user?.name || existingEntry.enteredBy === req.user?.email;

  if (!isSuperAdmin && !isOwner) {
    return error(res, "Unauthorized to modify this tracking entry", 403);
  }

  const updates = {
    ...req.body,
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

  const getSensibleRemark = (st, loc) => {
    const l = loc || "facility";
    if (st === "Delivered") return `Shipment delivers to client in ${l}`;
    if (st === "In Transit") return `Shipment leaves ${l}`;
    if (st === "Reached Hub") return `Shipment arrives at ${l}`;
    if (st === "Out for Delivery") return `Shipment goes for delivery in ${l}`;
    if (st === "Picked Up") return `We pick up shipment at ${l}`;
    if (st === "Delayed") return `Shipment delays at ${l}`;
    if (st === "Returned") return `Shipment returns to ${l}`;
    return `Shipment is at ${l}`;
  };

  for (const awb of awbs) {
    const cleanAwb = String(awb).trim().toUpperCase();
    const entryData = {
      awb: cleanAwb,
      status,
      location,
      date: trackingDate,
      remarks: remarks ? String(remarks).trim() : getSensibleRemark(status, location),
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
            lastTrackingUpdate: now
          };

          if (!isFinal) {
            bookingUpdate.transitStatus = status;
            bookingUpdate.trackingStatus = status;
            bookingUpdate.currentLocation = location;
            if (status === 'Delivered') {
              bookingUpdate.status = 'Delivered';
              bookingUpdate.deliveryDate = trackingDate;
            }
          } else {
            // If it is final, only update current location if provided, but don't touch status
            bookingUpdate.currentLocation = location || existingBooking.currentLocation;
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



