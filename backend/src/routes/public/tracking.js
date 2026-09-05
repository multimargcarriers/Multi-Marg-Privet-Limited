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
      let cleanRemarks = data.remarks;
      if (!cleanRemarks || String(cleanRemarks).trim().toLowerCase() === 'na' || String(cleanRemarks).trim() === '') {
        if (String(data.status || '').toLowerCase().includes('book')) {
          const loc = (data.location || 'ORIGIN').toUpperCase();
          cleanRemarks = `SHIPMENT BOOKED AT ${loc}. LORRY RECEIPT (LR) GENERATED.`;
        }
      }
      let entryStatus = data.status;
      if (String(data.status || '').toLowerCase().includes('book') || String(data.remarks || '').toUpperCase().includes('BOOKED')) {
        entryStatus = 'Booked';
      }
      entries.push({
        id: doc.id,
        awb: data.awb,
        status: entryStatus,
        location: data.location,
        date: realTimestamp,
        remarks: cleanRemarks ? String(cleanRemarks).toUpperCase() : cleanRemarks,
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
          awb: b.awb || b.consignment || b.awbNo || b.lrNumber || b.lrNo || docId,
          origin: b.origin || null,
          destination: b.destination || null,
          originAddress: b.consignor_address || b.originAddress || b.from_address || null,
          destinationAddress: b.consignee_address || b.destinationAddress || b.to_address || null,
          originPincode: b.originPincode || b.consignorPincode || null,
          destinationPincode: b.destinationPincode || b.consigneePincode || null,
          client: b.client || b.clientName || null,
          consignor: b.consignor || null,
          consignorGstin: b.consignor_gstin || b.consignorGstin || null,
          consignorPhone: b.consignor_phone || b.consignorPhone || null,
          consignee: b.consignee || null,
          consigneeGstin: b.consignee_gstin || b.consigneeGstin || null,
          consigneePhone: b.consignee_phone || b.consigneePhone || null,
          date: b.dispatch_date || b.date || b.createdAt || null,
          createdAt: b.createdAt || b.realBookingDate || b.created_at || null,
          status: b.status || null,
          delivery_status: b.delivery_status || null,
          transitStatus: b.transitStatus || null,
          trackingStatus: b.trackingStatus || null,
          deliveryDate: b.deliveryDate || null,
          mode: b.mode || null,
          paymentMode: b.paymentMode || b.payment || b.payment_mode || null,
          box: b.box || b.packages || b.pkg || b.pcs || b.package_count || b.boxCount || null,
          actual_wt: b.actual_wt || b.actualWeight || b.weight || null,
          charge_wt: b.charge_wt || b.chargeWeight || b.chargeable_weight || null,
          vehicleNo: b.vehicleNo || b.vehicle_no || b.truckNo || null,
          eway_bill: b.eway_bill || b.eway || b.ewayBill || b.eway_bill_no || null,
          invoice_no: b.invoice_no || b.refNo || b.reference_no || null,
          declared_value: b.declared_value || b.declaredValue || b.goodsValue || b.goods_value || null,
          goods_description: b.goods_description || b.goodsDescription || b.goods || b.commodity || b.description || null,
          invoiceDetails: (() => {
            const raw = Array.isArray(b.invoiceDetails) && b.invoiceDetails.length > 0
              ? b.invoiceDetails
              : (Array.isArray(b.parcels) && b.parcels.length > 0 ? b.parcels : []);
            return raw.map(p => ({
              invoice_no: p.invoiceNo || p.invoice_no || p.invoice || "",
              invoice_date: p.invoiceDate || p.invoice_date || p.invdate || p.date || "",
              part_no: p.partNumber || p.part_no || p.part || "",
              qty: p.quantity || p.qty || p.box || p.packages || "",
              value: p.invoiceValue || p.invoice_value || p.value || p.amount || "",
              eway_bill: p.ewayBill || p.eway_bill || p.eway || ""
            }));
          })(),
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
      const originName = booking.origin ? String(booking.origin).toUpperCase() : "ORIGIN HUB";

      // 1. Initial Milestone: Booked (Shipment Booked at origin)
      const hasBookedStatus = entries.some(e => String(e.status || '').toLowerCase().includes("book"));
      if (!hasBookedStatus) {
        entries.push({
          id: `booked-${booking.id || baseAwb}`,
          awb: baseAwb,
          status: "Booked",
          location: originName,
          date: bookingDateISO,
          remarks: `SHIPMENT BOOKED AT ${originName}. LORRY RECEIPT (LR) GENERATED.`,
          updatedAt: bookingDateISO
        });
      }

      // Check time elapsed since booking (in minutes)
      const bookingTimeMs = booking.createdAt 
        ? new Date(booking.createdAt).getTime() 
        : bookingDateObj.getTime();
      const minutesSinceBooking = (Date.now() - bookingTimeMs) / (60 * 1000);

      // 2. Second Milestone: In Transit (Auto-generated after 2-3 minutes with separate origin note)
      const hasInTransitStatus = entries.some(e => String(e.status || '').toLowerCase().includes("transit"));
      const isAutoTransit = minutesSinceBooking >= 2.5;

      if (hasInTransitStatus || isAutoTransit) {
        if (!hasInTransitStatus) {
          const transitDateObj = new Date(bookingTimeMs + 2.5 * 60 * 1000);
          const transitDateISO = transitDateObj.toISOString();
          entries.push({
            id: `transit-${booking.id || baseAwb}`,
            awb: baseAwb,
            status: "In Transit",
            location: originName,
            date: transitDateISO,
            remarks: (booking.remarks && String(booking.remarks).trim().toLowerCase() !== 'na' ? booking.remarks : `SHIPMENT IN TRANSIT FROM ${originName} FACILITY`).toUpperCase(),
            updatedAt: transitDateISO
          });
        }

        booking.currentLocation = String(booking.currentLocation || booking.origin || "ORIGIN FACILITY").trim().toUpperCase();
        if (!booking.transitStatus || ['booked', 'picked up', 'shipment booked', ''].includes(String(booking.transitStatus).toLowerCase())) {
          booking.transitStatus = 'In Transit';
        }
        if (!booking.status || ['booked', 'picked up', 'shipment booked', ''].includes(String(booking.status).toLowerCase())) {
          booking.status = 'In Transit';
        }

        // Keep DB booking doc in sync if it was created as Booked
        if (db.mongoDb && booking.id && (!booking.status || String(booking.status).toLowerCase() === 'booked')) {
          db.mongoDb.collection("bookings").updateOne(
            { _id: booking.id },
            { $set: { status: 'In Transit', transitStatus: 'In Transit' } }
          ).catch(e => console.error("[Auto In Transit DB Update Error]:", e));
        }
      } else {
        // Less than 2-3 minutes: status is strictly Booked
        booking.currentLocation = originName;
        booking.transitStatus = 'Booked';
        booking.status = 'Booked';
      }

      // 3. Check if POD is uploaded or if the shipment is marked as Delivered
      const isDeliveredBooking = String(booking.status || booking.delivery_status || booking.transitStatus || booking.trackingStatus || '').toLowerCase() === 'delivered';

      const podDoc = db.mongoDb ? await db.mongoDb.collection("pod").findOne({
        lrNo: { $in: queryVariations }
      }) : null;

      if (podDoc) {
        const pUrl = podDoc.podUrl || podDoc.cloudinaryUrl || podDoc.url || null;
        if (pUrl) {
          booking.podUrl = pUrl;
          booking.podUploaded = true;
        }
      }

      const hasDeliveredStatus = entries.some(e => String(e.status || '').toLowerCase().includes("delivered"));
      if (!hasDeliveredStatus && (isDeliveredBooking || podDoc)) {
        let deliveredTimeObj = null;
        if (podDoc && (podDoc.uploadedAt || podDoc.createdAt)) {
          deliveredTimeObj = new Date(podDoc.uploadedAt || podDoc.createdAt);
        } else if (booking.deliveryDate) {
          deliveredTimeObj = parseDateString(booking.deliveryDate);
        }

        const pickupTimestamp = bookingDateObj.getTime();
        if (!deliveredTimeObj || isNaN(deliveredTimeObj.getTime()) || deliveredTimeObj.getTime() <= pickupTimestamp) {
          // Default delivery time to 6 hours after pickup or next day
          deliveredTimeObj = new Date(pickupTimestamp + 6 * 3600 * 1000);
        }

        const podDate = deliveredTimeObj.toISOString();
        const destLocation = (booking && (booking.destination || booking.consigneeAddress || booking.consignee)) || (podDoc && podDoc.destination !== '-' ? podDoc.destination : '') || "Destination";
        entries.push({
          id: `delivered-${(podDoc && (podDoc.id || podDoc._id)) || booking.id || baseAwb}`,
          awb: baseAwb,
          status: "Delivered",
          location: String(destLocation).toUpperCase(),
          date: podDate,
          remarks: podDoc ? "Proof of Delivery (POD) uploaded. Shipment delivered at destination." : "Shipment successfully delivered at destination.",
          podUrl: booking.podUrl || null,
          updatedAt: podDate
        });
      } else if (hasDeliveredStatus && booking.podUrl) {
        // Attach podUrl to existing delivered entry if missing
        const delEntry = entries.find(e => String(e.status || '').toLowerCase().includes("delivered"));
        if (delEntry && !delEntry.podUrl) {
          delEntry.podUrl = booking.podUrl;
        }
      }

      const getStatusWeight = (statusStr) => {
        const s = String(statusStr || '').toLowerCase();
        if (s.includes('out for delivery') || s.includes('out_for_delivery')) return 80;
        if (s.includes('deliver')) return 100;
        if (s.includes('transit') || s.includes('reach') || s.includes('hub') || s.includes('arrive')) return 60;
        if (s.includes('pickup') || s.includes('picked')) return 40;
        if (s.includes('book')) return 20;
        return 50;
      };

      entries.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.date).getTime();
        const timeB = new Date(b.updatedAt || b.date).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return getStatusWeight(b.status) - getStatusWeight(a.status);
      });
    }

    entries.forEach(e => {
      if (e.remarks) e.remarks = String(e.remarks).toUpperCase();
    });

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
