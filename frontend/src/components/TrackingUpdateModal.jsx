import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { Loader2, X, Truck, MapPin, CheckCircle2, Clock, PackageCheck, AlertTriangle, RotateCcw, Sparkles } from "lucide-react";
import CopyButton, { AwbBadge } from "./CopyButton";
import { useToast } from "../context/ToastContext";
import TrackingLocationInput from "./TrackingLocationInput";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const STATUS_OPTIONS = [
  { value: "In Transit", label: "🔄 IN TRANSIT" },
  { value: "Out for Delivery", label: "🚚 OUT FOR DELIVERY" },
  { value: "Delivered", label: "✅ DELIVERED" },
  { value: "Delayed", label: "⚠️ DELAYED" },
  { value: "Returned", label: "↩️ RETURN TO ORIGIN (RTO)" }
];

const getStatusColor = (status) => {
  switch (status) {
    case "Picked Up": return "#0284c7";
    case "In Transit": return "#d97706";
    case "Reached Hub": return "#0d9488";
    case "Out for Delivery": return "#7c3aed";
    case "Delivered": return "#059669";
    case "Delayed": return "#ea580c";
    case "Returned": return "#dc2626";
    default: return "#475569";
  }
};

const getSensibleRemark = (status, location) => {
  const loc = location ? String(location).trim() : "facility";
  switch (status) {
    case "Delivered":
      return `Shipment delivers to client in ${loc}`;
    case "In Transit":
      return `Shipment leaves ${loc}`;
    case "Reached Hub":
      return `Shipment arrives at ${loc}`;
    case "Out for Delivery":
      return `Shipment goes for delivery in ${loc}`;
    case "Picked Up":
      return `We pick up shipment at ${loc}`;
    case "Delayed":
      return `Shipment delays at ${loc}`;
    case "Returned":
      return `Shipment returns to ${loc}`;
    default:
      return `Shipment is at ${loc}`;
  }
};

const TrackingUpdateModal = ({ isOpen, onClose, booking, bulkBookings = [], onSuccess, onNavigateToTracking }) => {
  const { addToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBulk = Array.isArray(bulkBookings) && bulkBookings.length > 0;

  const [formData, setFormData] = useState({
    awb: "",
    awbs: [],
    date: new Date().toISOString().split('T')[0],
    location: "",
    status: "",
    remarks: ""
  });



  useEffect(() => {
    if (isOpen) {
      if (isBulk) {
        const awbList = bulkBookings.map(b => b.awb || b.consignment || b.lrNo || b.id?.slice(-6) || "").filter(Boolean);
        setFormData({
          awb: "",
          awbs: awbList,
          date: new Date().toISOString().split('T')[0],
          location: "",
          status: "",
          remarks: ""
        });
      } else if (booking) {
        const awb = booking.awb || booking.consignment || booking.lrNo || booking.id?.slice(-6) || "";
        const defaultLoc = String(booking.currentLocation || booking.origin || "").trim().toUpperCase();
        setFormData({
          awb: String(awb).toUpperCase(),
          awbs: [String(awb).toUpperCase()],
          date: new Date().toISOString().split('T')[0],
          location: defaultLoc,
          status: "In Transit",
          remarks: ""
        });
      }
    }
  }, [isOpen, booking, bulkBookings, isBulk]);

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setFormData(prev => ({
      ...prev,
      status: newStatus
    }));
  };

  const handleLocationChange = (newLocation) => {
    setFormData(prev => ({
      ...prev,
      location: newLocation
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.status || !formData.date || !formData.location) {
      addToast("Please fill Status, Location and Date", "warning");
      return;
    }

    if (isBulk && (!formData.awbs || formData.awbs.length === 0)) {
      addToast("No AWBs selected for update", "warning");
      return;
    }
    if (!isBulk && !formData.awb) {
      addToast("AWB number is missing", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalRemarks = formData.remarks ? String(formData.remarks).trim() : "";

      if (isBulk) {
        const payload = {
          awbs: formData.awbs,
          status: formData.status,
          location: formData.location,
          date: formData.date,
          remarks: finalRemarks
        };
        const response = await axios.post(`${API}/tracking/bulk`, payload);
        if (response.data.success) {
          addToast(`Tracking status updated for ${formData.awbs.length} shipments!`, "success");
          if (onSuccess) onSuccess(payload);
          onClose();
        } else {
          addToast(response.data.message || "Failed to update tracking", "error");
        }
      } else {
        const payload = {
          awb: formData.awb,
          status: formData.status,
          location: formData.location,
          date: formData.date,
          remarks: finalRemarks
        };
        const response = await axios.post(`${API}/tracking`, payload);
        if (response.data.success) {
          addToast("Tracking status updated successfully!", "success");
          if (onSuccess) onSuccess(payload);
          onClose();
        } else {
          addToast(response.data.message || "Failed to update tracking", "error");
        }
      }
    } catch (err) {
      console.error("Tracking update error", err);
      addToast("An error occurred while updating tracking", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 99999, 
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="modal-content" style={{
        background: 'white', borderRadius: '14px', padding: '1.5rem', 
        width: '100%', maxWidth: '540px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        border: '1px solid #e2e8f0',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>
                {isBulk ? `Update Tracking (${formData.awbs.length} Shipments)` : `Update Shipment Tracking`}
              </h3>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          
          {/* Target AWB / Multi-AWBs Box */}
          <div style={{ background: "#f8fafc", padding: "0.85rem 1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            {isBulk ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", textTransform: 'uppercase' }}>Selected Shipments ({formData.awbs.length})</span>
                  <span style={{ fontSize: "0.72rem", color: "#2563eb", fontWeight: 600 }}>All will update together</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '100px', overflowY: 'auto', padding: '4px', background: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  {formData.awbs.map((a, i) => (
                    <span key={i} style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      #{a}
                      <CopyButton text={a} size={11} />
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: "0.2rem" }}>AWB Number</div>
                <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a", marginBottom: booking ? "0.5rem" : "0", display: "flex", alignItems: "center", gap: "6px" }}>
                  {formData.awb}
                  <CopyButton text={formData.awb} />
                </div>
                {booking && (
                  <div style={{ padding: "0.6rem 0.75rem", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.80rem", color: "#334155", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                    <div><strong style={{ color: '#64748b' }}>ROUTE:</strong> {String(booking.origin || "-").toUpperCase()} &rarr; {String(booking.destination || "-").toUpperCase()}</div>
                    <div><strong style={{ color: '#64748b' }}>CLIENT:</strong> {String(booking.client || booking.clientName || "-").toUpperCase()}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status Selection */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              STATUS <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select 
              name="status" 
              value={formData.status} 
              onChange={handleStatusChange} 
              required
              style={{ 
                width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", 
                border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box",
                fontWeight: "800",
                fontSize: "0.88rem",
                color: formData.status ? getStatusColor(formData.status) : "#64748b",
                background: "#ffffff",
                cursor: "pointer"
              }}
            >
              <option value="">-- SELECT STATUS --</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ color: getStatusColor(opt.value), fontWeight: "700" }}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Location Selection - Enhanced TrackingLocationInput with IP & City Variants */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              CURRENT LOCATION <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <TrackingLocationInput
              value={formData.location}
              onChange={handleLocationChange}
              booking={booking}
              bulkBookings={bulkBookings}
              required
            />
          </div>

          {/* Date & Time */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              DATE & TIME <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.88rem",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Remarks */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ margin: 0, fontSize: "0.82rem", fontWeight: "700", color: "#334155", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                SPECIAL REMARKS
              </label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, remarks: getSensibleRemark(formData.status, formData.location) })}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#4f46e5', 
                  fontSize: '0.75rem', 
                  fontWeight: 700, 
                  cursor: 'pointer', 
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Auto-Generate Description"
              >
                <Sparkles size={13} />
                <span>AI GENERATE</span>
              </button>
            </div>
            <input
              type="text"
              name="remarks"
              placeholder="Enter your remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.88rem",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "10px", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontWeight: "700",
                fontSize: "0.88rem",
                cursor: "pointer"
              }}
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 2,
                padding: "0.75rem",
                borderRadius: "8px",
                border: "none",
                background: isSubmitting ? "#94a3b8" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#ffffff",
                fontWeight: "800",
                fontSize: "0.88rem",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.25)",
                letterSpacing: "0.02em"
              }}
            >
              {isSubmitting ? <Loader2 size={16} className="spin-animation" /> : <CheckCircle2 size={16} />}
              {isSubmitting ? "SAVING CHECKPOINT..." : (isBulk ? `UPDATE TRACKING FOR ${formData.awbs.length} AWBS` : "SAVE TRACKING CHECKPOINT")}
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
};

export default TrackingUpdateModal;
