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
      entries.push({
        id: doc.id,
        awb: data.awb,
        status: data.status,
        location: data.location,
        date: data.date,
        remarks: data.remarks,
        updatedAt: data.updatedAt || data.date || new Date().toISOString()
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
          date: b.date || b.dispatch_date || null,
          mode: b.mode || null,
          box: b.box || null,
          invoiceDetails: b.invoiceDetails || [],
          parcels: b.parcels || []
        };
      }
    });
    
    if (booking) {
      // 1. Shipment Booked milestone
      const hasBookedStatus = entries.some(e => e.status === "Booked" || e.status === "Shipment Booked");
      if (!hasBookedStatus) {
        entries.push({
          id: `booked-${booking.id || baseAwb}`,
          awb: baseAwb,
          status: "Shipment Booked",
          location: booking.origin || "Origin",
          date: booking.date || new Date().toISOString(),
          remarks: "Shipment details received and Lorry Receipt (LR) generated.",
          updatedAt: booking.date || new Date().toISOString()
        });
      }

      // 2. Picked Up milestone
      const hasPickedUpStatus = entries.some(e => e.status === "Picked Up" || e.status === "Shipment Picked Up");
      if (!hasPickedUpStatus) {
        let pickupDate = new Date().toISOString();
        if (booking.date) {
          try {
            const dateObj = new Date(booking.date);
            dateObj.setMinutes(dateObj.getMinutes() + 5);
            pickupDate = dateObj.toISOString();
          } catch (e) {
            pickupDate = booking.date;
          }
        }
        entries.push({
          id: `picked-${booking.id || baseAwb}`,
          awb: baseAwb,
          status: "Picked Up",
          location: booking.origin || "Origin",
          date: pickupDate,
          remarks: "Shipment packages received and loaded into transport vehicle.",
          updatedAt: pickupDate
        });
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
