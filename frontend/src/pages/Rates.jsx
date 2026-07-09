import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { Edit, Trash2 } from "lucide-react";
import CreatableDropdown from "../components/CreatableDropdown";
import QuickAddModal from "../components/QuickAddModal";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { motion, AnimatePresence } from "framer-motion";

const Rates = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const [rates, setRates] = useState([]);
  const [cities, setCities] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const initialFormState = {
    client: "", origin: "", destination: "", awbCharge: "",
    airRate: "", airPickup: "", airDelivery: "",
    trainRate: "", trainPickup: "", trainDelivery: "",
    roadRate: "", roadPickup: "", roadDelivery: "",
    roadExpressRate: "", roadExpressPickup: "", roadExpressDelivery: ""
  };
  const [form, setForm] = useState(initialFormState);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [modalInitialName, setModalInitialName] = useState("");
  const [pendingField, setPendingField] = useState("");

  const handleCreateNew = (type, field, name) => {
    setModalType(type);
    setPendingField(field);
    setModalInitialName(name);
    setModalOpen(true);
  };

  const handleModalSave = (data) => {
    if (modalType === "client") setClients([...clients, data]);
    else if (modalType === "city") setCities([...cities, data]);

    const name = data.name || data.client || data.city;
    setForm({ ...form, [pendingField]: name });
  };

  // Pagination and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { 
    fetchRates(); 
    fetchCities();
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/clients`);
      if (response.data.success) {
        setClients(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching clients", error);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/cities`);
      if (response.data.success) {
        setCities(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching cities", error);
    }
  };

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/rates`);
      if (res.data.success) setRates(res.data.data || []);
    } catch (err) { console.error("Fetch rates error", err); }
    finally { setLoading(false); }
  };

  const handleEditClick = (item) => {
    setForm({
      client: item.client || "",
      origin: item.origin || "",
      destination: item.destination || "",
      awbCharge: item.awbCharge || "",
      airRate: item.airRate || "",
      airPickup: item.airPickup || "",
      airDelivery: item.airDelivery || "",
      trainRate: item.trainRate || "",
      trainPickup: item.trainPickup || "",
      trainDelivery: item.trainDelivery || "",
      roadRate: item.roadRate || "",
      roadPickup: item.roadPickup || "",
      roadDelivery: item.roadDelivery || "",
      roadExpressRate: item.roadExpressRate || "",
      roadExpressPickup: item.roadExpressPickup || "",
      roadExpressDelivery: item.roadExpressDelivery || "",
    });
    setEditing(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const tempId = "temp-" + Date.now();
    try {
      if (editing) {
        setRates(prev => prev.map(r => r.id === editing.id ? { ...r, ...form } : r));
        await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/rates/${editing.id}`, form);
        setEditing(null);
      } else {
        setRates(prev => [{ ...form, id: tempId }, ...prev]);
        const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/rates`, form);
        if (res.data.success && res.data.data) {
          setRates(prev => prev.map(r => r.id === tempId ? res.data.data : r));
        } else {
          fetchRates();
        }
      }
      setForm(initialFormState);
      setIsAdding(false);
    } catch (err) {
      console.error("Save error", err);
      fetchRates();
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Rate",
      message: "Are you sure you want to delete this rate? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    setRates(prev => prev.filter(r => r.id !== id));
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/rates/${id}`);
    } catch (err) {
      console.error("Delete error", err);
      fetchRates();
    }
  };

  // Filter rates based on search query
  const filteredRates = rates.filter(r => {
    const query = searchQuery.toLowerCase();
    return (
      (r.client || "").toLowerCase().includes(query) ||
      (r.origin || "").toLowerCase().includes(query) ||
      (r.destination || "").toLowerCase().includes(query)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredRates.length / entriesPerPage) || 1;
  const currentData = filteredRates.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleEntriesChange = (e) => {
    setEntriesPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "20px" }}>
      {/* Title & Add Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "1.6rem", color: "#1e293b", margin: 0, fontWeight: "600" }}>Rates Master</h3>
        {!isAdding && !editing && (
          <button 
            onClick={() => setIsAdding(true)}
            style={{ backgroundColor: "#4F46E5", color: "white", border: "none", padding: "0.6rem 1.2rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)" }}
          >
            + Add New
          </button>
        )}
      </div>

      {/* Form Section */}
      <AnimatePresence>
        {(isAdding || editing) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", marginBottom: "2rem", border: "1px solid #e2e8f0" }}>
              <h4 style={{ margin: "0 0 1.5rem 0", fontSize: "1.2rem", color: "#0f172a" }}>{editing ? "Edit Rate Details" : "Add New Rate"}</h4>
              <form onSubmit={handleSave}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Client<span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)", borderRadius: "6px" }}>
                  <CreatableDropdown
                    options={clients}
                    value={form.client}
                    onChange={(client) => setForm({ ...form, client })}
                    onCreate={(name) => handleCreateNew("client", "client", name)}
                    placeholder="-- Please select the Client --"
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Origin<span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)", borderRadius: "6px" }}>
                  <CreatableDropdown
                    options={cities}
                    value={form.origin}
                    onChange={(origin) => setForm({ ...form, origin })}
                    onCreate={(name) => handleCreateNew("city", "origin", name)}
                    placeholder="-- Please select Origin --"
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Destination<span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)", borderRadius: "6px" }}>
                  <CreatableDropdown
                    options={cities}
                    value={form.destination}
                    onChange={(destination) => setForm({ ...form, destination })}
                    onCreate={(name) => handleCreateNew("city", "destination", name)}
                    placeholder="-- Please select Destination --"
                  />
                </div>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>AWB Charge<span style={{ color: "#ef4444" }}>*</span></label>
                <input 
                  className="form-control" 
                  value={form.awbCharge} 
                  placeholder="Enter Awb Charge" 
                  onChange={(e) => setForm({ ...form, awbCharge: e.target.value })} 
                  required 
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)" }}
                  onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                  onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", marginBottom: "2rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Air Rate<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" value={form.airRate} onChange={(e) => setForm({ ...form, airRate: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Air Pickup<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" value={form.airPickup} onChange={(e) => setForm({ ...form, airPickup: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Air Delivery<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" value={form.airDelivery} onChange={(e) => setForm({ ...form, airDelivery: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Train Rate<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" value={form.trainRate} onChange={(e) => setForm({ ...form, trainRate: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Train Pickup<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" value={form.trainPickup} onChange={(e) => setForm({ ...form, trainPickup: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Train Delivery<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" value={form.trainDelivery} onChange={(e) => setForm({ ...form, trainDelivery: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Road Rate<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" value={form.roadRate} onChange={(e) => setForm({ ...form, roadRate: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Road Pickup<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" value={form.roadPickup} onChange={(e) => setForm({ ...form, roadPickup: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Road Delivery<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" value={form.roadDelivery} onChange={(e) => setForm({ ...form, roadDelivery: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Road Express Rate<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" value={form.roadExpressRate} onChange={(e) => setForm({ ...form, roadExpressRate: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Road Express Pickup<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" value={form.roadExpressPickup} onChange={(e) => setForm({ ...form, roadExpressPickup: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Road Express Delivery<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" value={form.roadExpressDelivery} onChange={(e) => setForm({ ...form, roadExpressDelivery: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid #e2e8f0" }}>
              <button 
                type="button"
                onClick={() => { setEditing(null); setIsAdding(false); setForm(initialFormState); }}
                style={{ backgroundColor: "transparent", color: "#64748b", border: "1px solid #cbd5e1", padding: "0.6rem 1.5rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}
                onMouseOver={(e) => { e.target.style.backgroundColor = "#f1f5f9"; e.target.style.color = "#0f172a"; }}
                onMouseOut={(e) => { e.target.style.backgroundColor = "transparent"; e.target.style.color = "#64748b"; }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                style={{ backgroundColor: "#4F46E5", color: "white", border: "none", padding: "0.6rem 2rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer", transition: "background-color 0.2s", boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)" }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#4338ca"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#4F46E5"}
              >
                {editing ? "Save Changes" : "Save Rate"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
        )}
      </AnimatePresence>

      {/* Table Section */}
      <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "10px" }}>
        
        {/* Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "10px" }}>
          <div style={{ fontSize: "0.9rem", color: "#64748b" }}>
            Show 
            <select value={entriesPerPage} onChange={handleEntriesChange} style={{ margin: "0 0.5rem", padding: "0.2rem", border: "1px solid #cbd5e1", borderRadius: "2px" }}>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            entries
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.9rem", color: "#64748b" }}>Search:</label>
            <input 
              type="text" 
              value={searchQuery}
              onChange={handleSearchChange}
              style={{ border: "1px solid #cbd5e1", padding: "0.25rem 0.5rem", borderRadius: "2px", width: "200px" }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Client</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Origin</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Destination</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Awb Charge</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0", textAlign: "center", width: "60px" }}>Edit</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", textAlign: "center", width: "60px" }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading...</td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No matching records found.</td>
                </tr>
              ) : (
                currentData.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "white" }}>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0", fontWeight: "500" }}>
                      {item.client}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0", fontWeight: "600" }}>
                      {item.origin}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>
                      {item.destination}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>
                      â‚¹{item.awbCharge || "0"}
                    </td>
                    <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <button 
                          onClick={() => handleEditClick(item)} 
                          style={{ backgroundColor: "#6366f1", border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer" }}
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        {isSuperAdmin ? (
                          <button 
                            onClick={() => handleDelete(item.id)}
                            style={{ backgroundColor: "#ef4444", border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button 
                            disabled
                            style={{ backgroundColor: "#fca5a5", border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "not-allowed" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "15px", fontSize: "0.85rem", color: "#64748b" }}>
          <div>
            Showing {filteredRates.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, filteredRates.length)} of {filteredRates.length} entries
          </div>
          <div style={{ display: "flex", gap: "0.2rem" }}>
            <button 
              onClick={prevPage}
              disabled={currentPage === 1}
              style={{ padding: "0.4rem 0.8rem", border: "1px solid #cbd5e1", backgroundColor: currentPage === 1 ? "#f1f5f9" : "white", color: currentPage === 1 ? "#94a3b8" : "#334155", cursor: currentPage === 1 ? "not-allowed" : "pointer", borderTopLeftRadius: "4px", borderBottomLeftRadius: "4px" }}
            >
              Previous
            </button>
            <div style={{ padding: "0.4rem 0.8rem", borderTop: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", backgroundColor: "#6366f1", color: "white" }}>
              {currentPage}
            </div>
            <button 
              onClick={nextPage}
              disabled={currentPage === totalPages}
              style={{ padding: "0.4rem 0.8rem", border: "1px solid #cbd5e1", backgroundColor: currentPage === totalPages ? "#f1f5f9" : "white", color: currentPage === totalPages ? "#94a3b8" : "#334155", cursor: currentPage === totalPages ? "not-allowed" : "pointer", borderTopRightRadius: "4px", borderBottomRightRadius: "4px" }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      
      <QuickAddModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
        type={modalType}
        initialName={modalInitialName}
      />
    </div>
  );
};

export default Rates;