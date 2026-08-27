const express = require('express');
const router = express.Router();
const { db } = require("../../config/database");

// GET /api/public/tracking/:awb
router.get('/:awb', async (req, res) => {
  try {
    const { awb } = req.params;
    if (!awb || awb.trim().length < 3) {
      return res.status(400).json({ success: false, message: "Please enter a valid AWB/LR number" });
    }

    const baseAwb = awb.trim();
    const variations = new Set([baseAwb]);
    
    // Add uppercase/lowercase variants
    variations.add(baseAwb.toUpperCase());
    variations.add(baseAwb.toLowerCase());

    if (/^\d+$/.test(baseAwb)) {
      variations.add(`MMC-${baseAwb}`);
      variations.add(`MMC${baseAwb}`);
      variations.add(`mmc-${baseAwb}`);
      variations.add(`mmc${baseAwb}`);
    } 
    else if (/^mmc-?\d+$/i.test(baseAwb)) {
      const numMatch = baseAwb.match(/\d+/);
      if (numMatch) {
        const num = numMatch[0];
        variations.add(num);
        variations.add(`MMC-${num}`);
        variations.add(`MMC${num}`);
        variations.add(`mmc-${num}`);
        variations.add(`mmc${num}`);
      }
    }

    const queryVariations = Array.from(variations).slice(0, 10);
    const lowercaseVariations = queryVariations.map(v => v.toLowerCase());

    // Fetch tracking entries
    const snapshot = await db.collection("tracking").where("awb", "in", queryVariations).get();
    const entries = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const realTimestamp = data.updatedAt || data.createdAt || (data.date && data.date.includes('T') ? data.date : null) || new Date().toISOString();
      entries.push({
        id: doc.id,
        awb: data.awb,
        status: data.status,
        location: data.location,
        date: realTimestamp,
        remarks: data.remarks,
        updatedAt: realTimestamp
      });
    });

    // Sort entries locally because orderBy with 'in' requires a composite index
    entries.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    // Fetch booking details for shipment overview
    let booking = null;
    const bookingsSnapshot = await db.collection("bookings").get();
    bookingsSnapshot.forEach(doc => {
      const b = doc.data();
      const docId = doc.id;
      const bAwb = (b.awb || b.consignment || b.awbNo || b.lrNumber || b.lrNo || b.lr_number || docId.slice(-6)).toString().trim().toLowerCase();
      
      const cleanSearch = baseAwb.toLowerCase();
      if (bAwb === cleanSearch || bAwb.includes(cleanSearch) || lowercaseVariations.includes(bAwb) || docId.toLowerCase().includes(cleanSearch)) {
          booking = {
          id: docId,
          origin: b.origin || null,
          destination: b.destination || null,
          client: b.client || b.clientName || null,
          consignor: b.consignor || null,
          consignee: b.consignee || null,
          date: b.dispatch_date || b.date || b.createdAt || null,
          createdAt: b.createdAt || b.realBookingDate || b.created_at || null,
          mode: b.mode || null,
          box: b.box || b.packages || b.pkg || b.pcs || b.package_count || b.boxCount || null,
          invoiceDetails: b.invoiceDetails || [],
          parcels: b.parcels || [],
          podUrl: b.podUrl || b.pod || b.pod_url || b.podImage || null,
          podUploaded: !!(b.podUrl || b.pod || b.pod_url || b.podImage)
        };
      }
    });
    
    if (booking) {
      const parseDateString = (dateStr, fallbackIso) => {
        if (fallbackIso && !isNaN(new Date(fallbackIso).getTime())) return new Date(fallbackIso);
        if (!dateStr) return new Date();
        let parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) return parsed;
        const dmyMatch = String(dateStr).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (dmyMatch) {
          const day = parseInt(dmyMatch[1], 10);
          const month = parseInt(dmyMatch[2], 10) - 1;
          const year = parseInt(dmyMatch[3], 10);
          parsed = new Date(year, month, day);
          if (!isNaN(parsed.getTime())) return parsed;
        }
        return new Date();
      };

      const bookingDateObj = parseDateString(booking.date, booking.createdAt);
      const bookingDateISO = bookingDateObj.toISOString();

      // 1. Shipment Booked milestone
      const hasBookedStatus = entries.some(e => String(e.status || '').toLowerCase().includes("book"));
      if (!hasBookedStatus) {
        entries.push({
          id: `booked-${booking.id || baseAwb}`,
          awb: baseAwb,
          status: "Shipment Booked",
          location: booking.origin ? String(booking.origin).toUpperCase() : "ORIGIN HUB",
          date: bookingDateISO,
          remarks: "Shipment details received and Lorry Receipt (LR) generated.",
          updatedAt: bookingDateISO
        });
      }

      // 2. Picked Up milestone (automatically after booked at Origin)
      const hasPickedUpStatus = entries.some(e => String(e.status || '').toLowerCase().includes("pickup") || String(e.status || '').toLowerCase().includes("picked"));
      if (!hasPickedUpStatus) {
        const pickupDateObj = booking.createdAt ? new Date(new Date(booking.createdAt).getTime() + 15 * 60 * 1000) : bookingDateObj;
        const pickupDateISO = pickupDateObj.toISOString();
        entries.push({
          id: `picked-${booking.id || baseAwb}`,
          awb: baseAwb,
          status: "Picked Up",
          location: booking.origin ? String(booking.origin).toUpperCase() : "ORIGIN HUB",
          date: pickupDateISO,
          remarks: `Shipment packages received and picked up from ${booking.origin ? String(booking.origin).toUpperCase() : 'origin'} facility.`,
          updatedAt: pickupDateISO
        });
      }

      // 3. Check if POD is uploaded for this shipment
      const podDoc = db.mongoDb ? await db.mongoDb.collection("pod").findOne({
        lrNo: { $in: queryVariations }
      }) : null;

      if (podDoc) {
        const pUrl = podDoc.podUrl || podDoc.cloudinaryUrl || podDoc.url || null;
        if (pUrl) {
          booking.podUrl = pUrl;
          booking.podUploaded = true;
        }

        const hasDeliveredStatus = entries.some(e => String(e.status || '').toLowerCase().includes("delivered"));
        if (!hasDeliveredStatus) {
          const podDate = podDoc.uploadedAt || podDoc.createdAt || new Date().toISOString();
          const destLocation = (booking && (booking.destination || booking.consigneeAddress || booking.consignee)) || (podDoc.destination !== '-' ? podDoc.destination : '') || "Destination";
          entries.push({
            id: `pod-delivered-${podDoc.id || podDoc._id || baseAwb}`,
            awb: baseAwb,
            status: "Delivered",
            location: destLocation,
            date: podDate,
            remarks: "Proof of Delivery (POD) uploaded. Shipment delivered at destination.",
            podUrl: pUrl,
            updatedAt: podDate
          });
        } else {
          // Attach podUrl to existing delivered entry if missing
          const delEntry = entries.find(e => String(e.status || '').toLowerCase().includes("delivered"));
          if (delEntry && !delEntry.podUrl) {
            delEntry.podUrl = pUrl;
          }
        }
      }

      entries.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    return res.json({
      success: true,
      message: entries.length > 0 ? "Tracking data found" : "No tracking data found",
      data: entries,
      booking: booking
    });
  } catch (err) {
    console.error("Public tracking error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
