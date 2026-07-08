import React, { useState, useEffect } from "react";
import axios from "axios";
import { CheckCircle, Loader2 } from "lucide-react";

const API = "http://localhost:5000/api";

const Tracking = () => {
  const [formData, setFormData] = useState({
    awb: "",
    date: "",
    location: "",
    status: "",
    remarks: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [locations, setLocations] = useState([]);
  
  useEffect(() => {
    // Fetch cities for the location dropdown
    const fetchCities = async () => {
      try {
        const res = await axios.get(`${API}/cities`);
        if (res.data.success) {
          setLocations(res.data.data.map(c => c.city));
        }
      } catch (err) {
        console.error("Failed to fetch cities", err);
      }
    };
    fetchCities();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);
    try {
      const response = await axios.post(`${API}/tracking`, formData);
      if (response.data.success) {
        setSuccess(true);
        setFormData({
          awb: "",
          date: "",
          location: "",
          status: "",
          remarks: ""
        });
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Error creating tracking entry", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem", color: "#111827" }}>
          Tracking
        </h3>
      </div>

      {success && (
        <div
          className="glass-panel"
          style={{
            padding: "1.5rem",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            background: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.2)",
          }}
        >
          <CheckCircle size={32} color="#16a34a" />
          <div>
            <h5 style={{ color: "#16a34a", marginBottom: "0.25rem", margin: 0 }}>
              Status Updated Successfully!
            </h5>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: "2.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>
              Awb No<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
            </label>
            <input 
              type="text" 
              className="form-control" 
              name="awb" 
              placeholder="Enter the AWB No." 
              value={formData.awb} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>
              Date<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
            </label>
            <input 
              type="date" 
              className="form-control" 
              name="date" 
              value={formData.date} 
              onChange={handleChange} 
              required 
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>
              Location<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
            </label>
            <select 
              className="form-control" 
              name="location" 
              value={formData.location} 
              onChange={handleChange} 
              required
            >
              <option value="">-- Please select the Location --</option>
              {locations.map((loc, i) => (
                <option key={i} value={loc}>{loc}</option>
              ))}
              {/* Fallback if no cities exist in DB yet */}
              {!locations.includes("Delhi Terminal") && <option value="Delhi Terminal">Delhi Terminal</option>}
              {!locations.includes("Mumbai Terminal") && <option value="Mumbai Terminal">Mumbai Terminal</option>}
              {!locations.includes("Jaipur") && <option value="Jaipur">Jaipur</option>}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>
              Status<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
            </label>
            <select 
              className="form-control" 
              name="status" 
              value={formData.status} 
              onChange={handleChange} 
              required
            >
              <option value="">-- Please select the Status --</option>
              <option value="Picked Up">Picked Up</option>
              <option value="In Transit">In Transit</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Returned">Returned</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: "2rem" }}>
          <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>
            Remarks<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
          </label>
          <input 
            type="text" 
            className="form-control" 
            name="remarks" 
            placeholder="Enter the Remarks if any...." 
            value={formData.remarks} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ padding: "0.5rem 2rem", height: "45px" }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="spinner" /> Updating...
              </>
            ) : (
              <>UPDATE STATUS</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Tracking;
