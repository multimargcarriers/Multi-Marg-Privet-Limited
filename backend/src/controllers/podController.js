const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { uploadFile } = require("../config/cloudinary");

const CACHE_KEY = "podEntries";

exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("pod").orderBy("uploadedAt", "desc").get();
    const entries = [];
    snapshot.forEach(doc => entries.push({
      id: doc.id,
      ...doc.data()
    }));
    return entries;
  }, 300);
  return success(res, "POD entries fetched successfully", data);
};

exports.postRoot_2 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const {
    lrNo,
    fileName,
    fileData,
    podType,
    bookingId,
    consignor,
    consignee,
    origin,
    destination,
    client,
    remarks
  } = req.body;

  const entry = {
    lrNo: lrNo || "UNKNOWN",
    fileName: fileName || "uploaded_file",
    podType: podType || "UNKNOWN", // "VERIFIED" vs "UNKNOWN"
    bookingId: bookingId || null,
    consignor: consignor || "-",
    consignee: consignee || "-",
    origin: origin || "-",
    destination: destination || "-",
    client: client || "-",
    remarks: remarks || "",
    uploadedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  // Upload to Cloudinary if file data is provided
  if (fileData) {
    try {
      const { uploadBase64 } = require("../config/cloudinary");
      const uploadResult = await uploadBase64(fileData, {
        folder: "multimarg/pod",
        originalName: fileName || `POD_${lrNo}_${Date.now()}.jpg`
      });

      if (uploadResult && uploadResult.success && uploadResult.url) {
        entry.cloudinaryUrl = uploadResult.url;
        entry.cloudinaryPublicId = uploadResult.publicId;
        entry.podUrl = uploadResult.url;
      } else {
        console.error("[POD Controller] Upload failed:", uploadResult?.message);
        return error(res, `Cloudinary Upload Failed: ${uploadResult?.message || "Unknown error"}`, 400);
      }
    } catch (uploadErr) {
      console.error("[POD Cloudinary Error]", uploadErr.message);
      return error(res, `Cloudinary Upload Error: ${uploadErr.message}`, 500);
    }
  }

  const docRef = await db.collection("pod").add(entry);

  // --- AUTO-MARK TRACKING & BOOKINGS AS DELIVERED WITH DESTINATION ADDRESS ---
  try {
    const awbNo = String(entry.lrNo || '').trim();
    if (awbNo && awbNo !== 'UNKNOWN') {
      let destAddress = entry.destination !== '-' ? entry.destination : '';
      let matchedBookingDocId = entry.bookingId;

      // Lookup booking to retrieve detailed destination address if missing or to update booking status
      if (db.mongoDb) {
        const escapedAwb = awbNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const awbRegex = new RegExp(`^${escapedAwb}$`, 'i');
        const bookingDoc = await db.mongoDb.collection("bookings").findOne({
          $or: [
            { awb: awbRegex },
            { awbNo: awbRegex },
            { lrNumber: awbRegex },
            { lrNo: awbRegex },
            { consignment: awbRegex },
            ...(matchedBookingDocId ? [{ _id: matchedBookingDocId }, { id: matchedBookingDocId }] : [])
          ]
        });

        if (bookingDoc) {
          matchedBookingDocId = bookingDoc.id || bookingDoc._id.toString();
          destAddress = destAddress || bookingDoc.destinationAddress || bookingDoc.destination || bookingDoc.consigneeAddress || bookingDoc.consignee || 'Destination';
          
          // Update booking status to Delivered with POD URL
          await db.collection("bookings").doc(matchedBookingDocId).update({
            status: "Delivered",
            deliveryDate: new Date().toISOString(),
            podUploaded: true,
            podUrl: entry.podUrl || entry.cloudinaryUrl || "",
            updatedAt: new Date().toISOString()
          });
        }
      }

      destAddress = destAddress || "Destination";
      // Booking is marked Delivered with POD attached; no synthetic tracking table row needed.
    }
  } catch (syncErr) {
    console.error("[POD Auto-Delivery Error]:", syncErr);
  }

  await Promise.all([
    delCache(CACHE_KEY),
    delCache("tracking"),
    delCache("bookings")
  ]);

  try {
    const { emitDataUpdated } = require("../utils/socket");
    emitDataUpdated("podEntries", "create");
    emitDataUpdated("tracking", "create");
    emitDataUpdated("bookings", "update");
  } catch (sockErr) {}

  return created(res, "POD entry created successfully", {
    id: docRef.id,
    ...entry
  });
};

exports.deleteRoot_3 = async (req, res) => {
  const { id } = req.params;
  const docRef = db.collection("pod").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return error(res, "POD entry not found", 404);
  }
  const data = doc.data();
  const lrNo = String(data.lrNo || '').trim();
  const bookingId = data.bookingId;

  // Delete image from Cloudinary if hosted there
  if (data.cloudinaryPublicId || data.cloudinaryUrl) {
    try {
      const { deleteFile } = require("../config/cloudinary");
      await deleteFile(data.cloudinaryPublicId || data.cloudinaryUrl);
    } catch (e) {
      console.warn("Failed to delete POD image from Cloudinary:", e.message);
    }
  }

  // Delete the POD record
  await docRef.delete();

  // Check if any other POD exists for this LR number
  try {
    let hasOtherPod = false;
    if (lrNo && db.mongoDb) {
      const otherPod = await db.mongoDb.collection("pod").findOne({
        _id: { $ne: docRef.id },
        lrNo: { $regex: new RegExp(`^${lrNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      if (otherPod) hasOtherPod = true;
    }

    // If no other POD document exists, reverse booking status back to pre-POD state
    if (!hasOtherPod && (lrNo || bookingId) && db.mongoDb) {
      const lrRegex = lrNo ? new RegExp(`^${lrNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : null;
      const bookingQuery = lrRegex ? {
        $or: [
          { awb: lrRegex },
          { consignment: lrRegex },
          { lrNo: lrRegex },
          ...(bookingId ? [{ _id: bookingId }, { id: bookingId }] : [])
        ]
      } : { _id: bookingId };

      // Look up latest active tracking checkpoint if any
      let revertStatus = "Picked Up";
      let revertLocation = null;

      if (lrRegex) {
        const latestNonDeliveredTrack = await db.mongoDb.collection("tracking")
          .find({
            awb: lrRegex,
            status: { $not: { $regex: /^delivered$/i } }
          })
          .sort({ date: -1, updatedAt: -1, createdAt: -1 })
          .limit(1)
          .toArray();

        if (latestNonDeliveredTrack && latestNonDeliveredTrack.length > 0) {
          revertStatus = latestNonDeliveredTrack[0].status || "In Transit";
          revertLocation = latestNonDeliveredTrack[0].location || null;
        }

        // Clean up any synthetic tracking entry that was auto-generated for this POD
        await db.mongoDb.collection("tracking").deleteMany({
          awb: lrRegex,
          remarks: { $regex: /Proof of Delivery \(POD\) uploaded/i }
        });
      }

      // Revert booking fields
      const revertUpdate = {
        podUploaded: false,
        podUrl: null,
        pod: null,
        deliveryDate: null,
        transitStatus: revertStatus,
        trackingStatus: revertStatus,
        updatedAt: new Date().toISOString()
      };
      if (revertLocation) {
        revertUpdate.currentLocation = revertLocation;
      }

      // Update matching bookings (reverting status to Picked Up / In Transit if it was Delivered)
      const matchingBookings = await db.mongoDb.collection("bookings").find(bookingQuery).toArray();
      for (const bk of matchingBookings) {
        const updateDoc = { ...revertUpdate };
        if (String(bk.status || '').toLowerCase() === "delivered") {
          updateDoc.status = revertStatus;
        }
        await db.mongoDb.collection("bookings").updateOne({ _id: bk._id }, { $set: updateDoc });
      }
    }
  } catch (revertErr) {
    console.error("[POD Reversal Error]:", revertErr);
  }

  await Promise.all([
    delCache(CACHE_KEY),
    delCache("podEntries"),
    delCache("bookings"),
    delCache("tracking"),
    delCache("dashboard_stats")
  ]);

  try {
    const { emitDataUpdated } = require("../utils/socket");
    emitDataUpdated("podEntries", "delete");
    emitDataUpdated("bookings", "update");
    emitDataUpdated("tracking", "delete");
  } catch (sockErr) {}

  return success(res, "POD entry deleted and shipment status reversed successfully");
};
