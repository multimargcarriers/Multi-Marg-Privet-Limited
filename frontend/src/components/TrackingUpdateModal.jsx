import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { Loader2, X, Truck, MapPin, CheckCircle2, Clock, PackageCheck, AlertTriangle, RotateCcw } from "lucide-react";
import { useToast } from "../context/ToastContext";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const STATUS_OPTIONS = [
  { value: "Picked Up", label: "📦 Picked Up (From Origin / Consignor)" },
  { value: "In Transit", label: "🔄 In Transit (En Route to Destination)" },
  { value: "Reached Hub", label: "🏢 Arrived at Transshipment Hub / Facility" },
  { value: "Out for Delivery", label: "🚚 Out for Delivery (Final Destination)" },
  { value: "Delivered", label: "✅ Delivered (Received by Consignee)" },
  { value: "Delayed", label: "⚠️ In Transit - Delayed" },
  { value: "Returned", label: "↩️ Return to Origin (RTO)" }
];

const getStatusColor = (status) => {
  switch (status) {
    case "Picked Up": return "#16a34a";
    case "In Transit": return "#2563eb";
    case "Reached Hub": return "#7c3aed";
    case "Out for Delivery": return "#f59e0b";
    case "Delivered": return "#10b981";
    case "Delayed": return "#ea580c";
    case "Returned": return "#ef4444";
    default: return "#64748b";
  }
};

const getSensibleRemark = (status, location) => {
  const loc = location ? String(location).trim() : "facility";
  switch (status) {
    case "Delivered":
      return `Shipment successfully delivered at destination in ${loc}`;
    case "In Transit":
      return `Shipment in transit en route via ${loc}`;
    case "Reached Hub":
      return `Shipment arrived at transshipment facility in ${loc}`;
    case "Out for Delivery":
      return `Shipment out for delivery in ${loc}`;
    case "Picked Up":
      return `Shipment picked up and booked at ${loc}`;
    case "Delayed":
      return `Shipment in transit - operational delay at ${loc}`;
    case "Returned":
      return `Shipment returned to origin facility at ${loc}`;
    default:
      return `Shipment update recorded at ${loc}`;
  }
};

const TrackingUpdateModal = ({ isOpen, onClose, booking, bulkBookings = [], onSuccess, onNavigateToTracking }) => {
  const { addToast } = useToast();
  const [locations, setLocations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBulk = Array.isArray(bulkBookings) && bulkBookings.length > 0;

  const [formData, setFormData] = useState({
    awb: "",
    awbs: [],
    date: new Date().toISOString().split('T')[0],
    location: "",
    status: "In Transit",
    remarks: ""
  });

  useEffect(() => {
    if (isOpen) {
      fetchCities();
      if (isBulk) {
        const awbList = bulkBookings.map(b => b.awb || b.consignment || b.lrNo || b.id?.slice(-6) || "").filter(Boolean);
        const defaultLoc = bulkBookings[0]?.origin || "";
        const initialStatus = "In Transit";
        setFormData({
          awb: "",
          awbs: awbList,
          date: new Date().toISOString().split('T')[0],
          location: defaultLoc,
          status: initialStatus,
          remarks: getSensibleRemark(initialStatus, defaultLoc)
        });
      } else if (booking) {
        const awb = booking.awb || booking.consignment || booking.lrNo || booking.id?.slice(-6) || "";
        const defaultLoc = booking.origin || "";
        const initialStatus = "In Transit";
        setFormData({
          awb: String(awb).toUpperCase(),
          awbs: [String(awb).toUpperCase()],
          date: new Date().toISOString().split('T')[0],
          location: defaultLoc,
          status: initialStatus,
          remarks: getSensibleRemark(initialStatus, defaultLoc)
        });
      }
    }
  }, [isOpen, booking, bulkBookings, isBulk]);

  const fetchCities = async () => {
    try {
      const res = await axios.get(`${API}/cities`);
      if (res.data.success) {
        setLocations(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch cities", err);
    }
  };

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setFormData(prev => ({
      ...prev,
      status: newStatus,
      remarks: getSensibleRemark(newStatus, prev.location)
    }));
  };

  const handleLocationChange = (newLocation) => {
    setFormData(prev => ({
      ...prev,
      location: newLocation,
      remarks: getSensibleRemark(prev.status, newLocation)
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
      const finalRemarks = formData.remarks ? String(formData.remarks).trim() : getSensibleRemark(formData.status, formData.location);

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
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                {isBulk ? 'Record location and status checkpoint for all selected shipments' : 'Record real-time movement and transit checkpoint'}
              </p>
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
                    <span key={i} style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #bfdbfe' }}>
                      #{a}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: "0.2rem" }}>AWB Number</div>
                <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a", marginBottom: booking ? "0.5rem" : "0" }}>
                  {formData.awb}
                </div>
                {booking && (
                  <div style={{ padding: "0.6rem 0.75rem", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.80rem", color: "#334155", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                    <div><strong style={{ color: '#64748b' }}>Route:</strong> {booking.origin || "-"} &rarr; {booking.destination || "-"}</div>
                    <div><strong style={{ color: '#64748b' }}>Client:</strong> {booking.client || booking.clientName || "-"}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status Selection */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Current Status <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select 
              name="status" 
              value={formData.status} 
              onChange={handleStatusChange} 
              required
              style={{ 
                width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", 
                border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box",
                fontWeight: "700",
                fontSize: "0.88rem",
                color: getStatusColor(formData.status),
                background: "#ffffff",
                cursor: "pointer"
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ color: getStatusColor(opt.value), fontWeight: "600" }}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Location Selection with DB Dropdown & Manual Input */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <label style={{ margin: 0, fontSize: "0.82rem", fontWeight: "700", color: "#334155", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Current Location / Facility <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Select from database or type custom</span>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              {/* Text Input with auto-complete list from Database */}
              <input
                type="text"
                list="db-cities-list"
                name="location"
                placeholder="Type location or select from list..."
                value={formData.location}
                onChange={(e) => handleLocationChange(e.target.value)}
                required
                style={{
                  flex: 1,
                  padding: "0.65rem 0.85rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  outline: "none"
                }}
              />
              <datalist id="db-cities-list">
                {locations.map((c, i) => (
                  <option key={i} value={c.city || c.name || c.cityName} />
                ))}
              </datalist>

              {/* Database Quick Dropdown */}
              {locations.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleLocationChange(e.target.value);
                  }}
                  style={{
                    padding: "0.65rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.82rem",
                    background: "#f8fafc",
                    color: "#334155",
                    fontWeight: 600,
                    cursor: "pointer",
                    maxWidth: "140px"
                  }}
                >
                  <option value="">Database Cities</option>
                  {locations.map((c, i) => {
                    const cityName = c.city || c.name || c.cityName;
                    return <option key={i} value={cityName}>{cityName}</option>;
                  })}
                </select>
              )}
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", color: "#334155", marginBottom: "0.4rem", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Checkpoint Date <span style={{ color: "#ef4444" }}>*</span>
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
                Status Remark / Milestone Note
              </label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, remarks: getSensibleRemark(formData.status, formData.location) })}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Auto-generate
              </button>
            </div>
            <input
              type="text"
              name="remarks"
              placeholder="e.g. Shipment in transit en route via Pune"
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
              Cancel
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
                boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.25)"
              }}
            >
              {isSubmitting ? <Loader2 size={16} className="spin-animation" /> : <CheckCircle2 size={16} />}
              {isSubmitting ? "Saving Checkpoint..." : (isBulk ? `Update Tracking for ${formData.awbs.length} AWBs` : "Save Tracking Checkpoint")}
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
};

export default TrackingUpdateModal;
