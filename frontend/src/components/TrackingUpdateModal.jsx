import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { Loader2, X, AlertCircle } from "lucide-react";
import CreatableDropdown from "./CreatableDropdown";
import { useToast } from "../context/ToastContext";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const getStatusColor = (status) => {
  switch (status) {
    case "Picked Up": return "#3b82f6";
    case "In Transit": return "#8b5cf6";
    case "Out for Delivery": return "#f59e0b";
    case "Delivered": return "#10b981";
    case "Returned": return "#ef4444";
    default: return "#6b7280";
  }
};

const TrackingUpdateModal = ({ isOpen, onClose, booking, onSuccess, onNavigateToTracking }) => {
  const { addToast } = useToast();
  const [locations, setLocations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    awb: "",
    date: new Date().toISOString().split('T')[0],
    location: "",
    status: "",
    remarks: ""
  });

  useEffect(() => {
    if (isOpen && booking) {
      const awb = booking.awb || booking.consignment || booking.lrNo || booking.id?.slice(-6) || "";
      setFormData({
        awb: String(awb).toUpperCase(),
        date: new Date().toISOString().split('T')[0],
        location: booking.origin || "",
        status: "",
        remarks: ""
      });
      fetchCities();
    }
  }, [isOpen, booking]);

  const fetchCities = async () => {
    try {
      const res = await axios.get(`${API}/cities`);
      if (res.data.success) {
        setLocations(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch cities", err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.awb || !formData.status || !formData.date || !formData.location) {
      addToast("Please fill all required fields", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API}/tracking`, formData);
      if (response.data.success) {
        addToast("Tracking updated successfully!", "success");
        onSuccess(formData);
        onClose();
      } else {
        addToast(response.data.message || "Failed to update tracking", "error");
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
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, 
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="modal-content" style={{
        background: 'white', borderRadius: '12px', padding: '1.5rem', 
        width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Update Tracking</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "0.25rem" }}>AWB Number</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a", marginBottom: booking ? "0.75rem" : "0" }}>{formData.awb}</div>
            
            {booking && (
              <div style={{ padding: "0.75rem", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", fontSize: "0.85rem", color: "#0369a1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600 }}>Date:</span>
                  <span>{booking.date || booking.dispatch_date ? new Date(booking.date || booking.dispatch_date).toLocaleDateString('en-IN') : "-"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600 }}>Route:</span>
                  <span>{booking.origin || "-"} &rarr; {booking.destination || "-"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600 }}>Client:</span>
                  <span style={{ textAlign: "right" }}>{booking.client || booking.clientName || "-"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600 }}>Consignor:</span>
                  <span style={{ textAlign: "right" }}>{booking.consignor || "-"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>Consignee:</span>
                  <span style={{ textAlign: "right" }}>{booking.consignee || "-"}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "0.5rem" }}>
              Status <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select 
              name="status" 
              value={formData.status} 
              onChange={handleChange} 
              required
              style={{ 
                width: "100%", padding: "0.75rem", borderRadius: "8px", 
                border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box",
                fontWeight: formData.status ? "600" : "normal",
                color: formData.status ? getStatusColor(formData.status) : "inherit"
              }}
            >
              <option value="" style={{ color: "#000" }}>-- Select Status --</option>
              <option value="Picked Up" style={{ color: "#000" }}>Picked Up</option>
              <option value="In Transit" style={{ color: "#000" }}>In Transit</option>
              <option value="Out for Delivery" style={{ color: "#000" }}>Out for Delivery</option>
              <option value="Delivered" style={{ color: "#000" }}>Delivered</option>
              <option value="Returned" style={{ color: "#000" }}>Returned</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "0.5rem" }}>
                Date <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input 
                type="date" 
                name="date" 
                value={formData.date} 
                onChange={handleChange} 
                required 
                style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            
            <div style={{ position: "relative", zIndex: 10 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "0.5rem" }}>
                Location <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <CreatableDropdown 
                options={locations} 
                value={formData.location} 
                onChange={(val) => setFormData(prev => ({ ...prev, location: val }))} 
                placeholder="-- Select City --"
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#475569", marginBottom: "0.5rem" }}>Remarks (Optional)</label>
            <textarea 
              name="remarks" 
              value={formData.remarks} 
              onChange={handleChange} 
              placeholder="Add any additional notes here..."
              rows="3"
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box", resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            {onNavigateToTracking && (
              <button 
                type="button" 
                onClick={() => onNavigateToTracking(formData.awb)}
                style={{ 
                  flex: 1, padding: "0.75rem", borderRadius: "8px", 
                  background: "#f1f5f9", color: "#475569", 
                  border: "1px solid #cbd5e1", fontWeight: "600", cursor: "pointer" 
                }}
              >
                View History
              </button>
            )}
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ 
                flex: onNavigateToTracking ? 2 : 1, padding: "0.75rem", borderRadius: "8px", 
                background: "#3b82f6", color: "white", 
                border: "none", fontWeight: "700", cursor: isSubmitting ? "not-allowed" : "pointer",
                display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem"
              }}
            >
              {isSubmitting ? <Loader2 size={18} className="spinner" /> : "Update Status"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default TrackingUpdateModal;
