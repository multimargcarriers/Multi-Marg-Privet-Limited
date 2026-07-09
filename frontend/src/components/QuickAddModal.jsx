import React, { useState, useEffect } from "react";
import axios from "axios";
import { X } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { formatAllCaps, formatTitleCase, formatPhoneNumber } from "../utils/formatters";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const QuickAddModal = ({ isOpen, onClose, onSave, type, initialName }) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      let formattedName = initialName || "";
      if (formattedName) {
        if (type === "city" || type === "client" || type === "vendor" || type === "branch") {
          formattedName = formatAllCaps(formattedName);
        }
      }

      if (type === "client" || type === "vendor") {
        setFormData({ name: formattedName, gst: "", address: "", contact: "", email: "", mode: "Road", phno: "", branch: "" });
      } else if (type === "branch") {
        setFormData({ branch: formattedName, name: "", address: "", phno: "", email: "" });
      } else if (type === "city") {
        setFormData({ city: formattedName, short: "", state: "", stateCode: "" });
      }
    }
  }, [isOpen, type, initialName]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let endpoint = `${API}/api/${type === "city" ? "cities" : type === "branch" ? "branches" : type + "s"}`;
      const res = await axios.post(endpoint, formData);
      addToast(`${type.charAt(0).toUpperCase() + type.slice(1)} created successfully!`, "success");
      onSave(res.data.data);
      onClose();
    } catch (err) {
      addToast(err.response?.data?.message || `Failed to create ${type}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    let { name, value } = e.target;
    
    // Apply Formatting Rules
    if (type === "city") {
      if (name === "city" || name === "short" || name === "state") value = formatAllCaps(value);
    } else if (type === "client" || type === "vendor") {
      if (name === "name") value = formatAllCaps(value); // Company Name
      if (name === "contact") value = formatTitleCase(value); // Person Name
      if (name === "phno") value = formatPhoneNumber(value);
      if (name === "branch") value = formatAllCaps(value);
    } else if (type === "branch") {
      if (name === "branch") value = formatAllCaps(value);
      if (name === "name") value = formatTitleCase(value); // Person Name
      if (name === "phno") value = formatPhoneNumber(value);
    }

    setFormData({ ...formData, [name]: value });
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(15, 23, 42, 0.6)", 
      backdropFilter: "blur(4px)",
      zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.2s ease-out"
    }}>
      <style>
        {`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          .modal-input {
            width: 100%;
            padding: 0.6rem 0.8rem;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 0.9rem;
            color: #334155;
            transition: all 0.2s;
            box-sizing: border-box;
          }
          .modal-input:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
          }
          .modal-label {
            display: block;
            font-size: 0.8rem;
            font-weight: 600;
            color: #475569;
            margin-bottom: 0.4rem;
            text-transform: uppercase;
            letter-spacing: 0.025em;
          }
          .btn-modal-primary {
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: white;
            border: none;
            padding: 0.6rem 1.5rem;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
          }
          .btn-modal-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 8px -1px rgba(99, 102, 241, 0.4);
          }
          .btn-modal-secondary {
            background: white;
            color: #64748b;
            border: 1px solid #cbd5e1;
            padding: 0.6rem 1.5rem;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          .btn-modal-secondary:hover {
            background: #f8fafc;
            color: #475569;
          }
        `}
      </style>
      <div style={{ 
        width: "100%", maxWidth: "550px", 
        background: "white", 
        padding: "2rem", 
        borderRadius: "12px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        animation: "slideUp 0.3s ease-out",
        borderTop: "4px solid #6366f1"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: "1.4rem", 
            fontWeight: "700",
            background: "linear-gradient(135deg, #1e293b, #475569)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            Create New {type.charAt(0).toUpperCase() + type.slice(1)}
          </h2>
          <button type="button" onClick={onClose} style={{ 
            background: "#f1f5f9", border: "none", cursor: "pointer", 
            color: "#64748b", borderRadius: "50%", padding: "6px",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s"
          }} onMouseOver={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseOut={(e) => e.currentTarget.style.background = "#f1f5f9"}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {type === "client" || type === "vendor" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label className="modal-label">Name</label>
                <input className="modal-input" name="name" value={formData.name || ""} onChange={handleChange} required placeholder={`Enter ${type} name`} />
              </div>
              <div>
                <label className="modal-label">GST Number</label>
                <input className="modal-input" name="gst" value={formData.gst || ""} onChange={handleChange} required placeholder="27XXXXX0000X1Z5" />
              </div>
              <div>
                <label className="modal-label">Contact Person</label>
                <input className="modal-input" name="contact" value={formData.contact || ""} onChange={handleChange} required placeholder="John Doe" />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label className="modal-label">Email</label>
                <input className="modal-input" type="email" name="email" value={formData.email || ""} onChange={handleChange} required placeholder="contact@example.com" />
              </div>
              {type === "vendor" && (
                <>
                  <div>
                    <label className="modal-label">Phone Number</label>
                    <input className="modal-input" name="phno" value={formData.phno || ""} onChange={handleChange} required placeholder="+91 9999999999" />
                  </div>
                  <div>
                    <label className="modal-label">Branch</label>
                    <input className="modal-input" name="branch" value={formData.branch || ""} onChange={handleChange} required placeholder="Main Branch" />
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label className="modal-label">Mode</label>
                    <select className="modal-input" name="mode" value={formData.mode || "Road"} onChange={handleChange} required>
                      <option value="Road">Road</option>
                      <option value="Train">Train</option>
                      <option value="Air">Air</option>
                    </select>
                  </div>
                </>
              )}
              <div style={{ gridColumn: "span 2" }}>
                <label className="modal-label">Address</label>
                <textarea className="modal-input" name="address" value={formData.address || ""} onChange={handleChange} required rows={2} placeholder="Complete physical address..." />
              </div>
            </div>
          ) : type === "city" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label className="modal-label">City Name</label>
                <input className="modal-input" name="city" value={formData.city || ""} onChange={handleChange} required placeholder="e.g. Mumbai" />
              </div>
              <div>
                <label className="modal-label">Short Code</label>
                <input className="modal-input" name="short" value={formData.short || ""} onChange={handleChange} placeholder="e.g. BOM" />
              </div>
              <div>
                <label className="modal-label">State</label>
                <input className="modal-input" name="state" value={formData.state || ""} onChange={handleChange} placeholder="e.g. Maharashtra" />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label className="modal-label">State Code</label>
                <input className="modal-input" name="stateCode" value={formData.stateCode || ""} onChange={handleChange} placeholder="e.g. 27" />
              </div>
            </div>
          ) : type === "branch" ? (
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label className="modal-label">Branch Name</label>
                <input className="modal-input" name="branch" value={formData.branch || ""} onChange={handleChange} required placeholder="e.g. Head Office" />
              </div>
              <div>
                <label className="modal-label">Contact Person</label>
                <input className="modal-input" name="name" value={formData.name || ""} onChange={handleChange} required placeholder="Manager Name" />
              </div>
              <div>
                <label className="modal-label">Phone Number</label>
                <input className="modal-input" name="phno" value={formData.phno || ""} onChange={handleChange} required placeholder="+91 9876543210" />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label className="modal-label">Email</label>
                <input className="modal-input" type="email" name="email" value={formData.email || ""} onChange={handleChange} required placeholder="branch@example.com" />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label className="modal-label">Address</label>
                <textarea className="modal-input" name="address" value={formData.address || ""} onChange={handleChange} required rows={2} placeholder="Branch address..." />
              </div>
            </div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid #f1f5f9" }}>
            <button type="button" className="btn-modal-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-modal-primary" disabled={loading}>
              {loading ? "Saving..." : `Save ${type.charAt(0).toUpperCase() + type.slice(1)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickAddModal;
