import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { Edit, Trash2, IndianRupee, Users, TrendingUp, Search, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CreatableDropdown from "../components/CreatableDropdown";
import { useSync } from "../context/SyncContext";

import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { SettingsContext } from "../context/SettingsContext";
import { useNotification } from "../context/NotificationContext";
import { useToast } from "../context/ToastContext";
import CsvImportExport from "../components/CsvImportExport";
import StatsPanel from "../components/StatsPanel";
import SortDropdown from "../components/SortDropdown";
import useTableSort from "../hooks/useTableSort";

const Rates = () => {
  const { syncQueue } = useSync();
  const { user } = useContext(AuthContext);
  const { globalSettings } = useContext(SettingsContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimarg.com';
  const canBulkDelete = isSuperAdmin && globalSettings?.integrations?.enableBulkDelete;

  const [rates, setRates] = useState([]);
  const [clients, setClients] = useState([]);
  const [cities, setCities] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  const { refreshNotifications } = useNotification();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);

  const initialFormState = {
    client: "", origin: "", destination: "", awbCharge: "",
    airRate: "", airPickup: "", airDelivery: "",
    trainRate: "", trainPickup: "", trainDelivery: "",
    roadRate: "", roadPickup: "", roadDelivery: "",
    roadExpressRate: "", roadExpressPickup: "", roadExpressDelivery: ""
  };
  const [form, setForm] = useState(initialFormState);

  const handleCreateNew = async (type, field, name) => {
    try {
      const endpoint = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/${type === 'city' ? 'cities' : type + 's'}`;
      let payload = { isIncomplete: true };
      if (type === 'city') payload.city = name;
      else payload.name = name;
      
      const res = await axios.post(endpoint, payload);
      const data = res.data.data;
      
      if (type === 'client') setClients([...clients, data]);
      else if (type === 'city') setCities([...cities, data]);

      const entityName = data.name || data.client || data.city;
      setForm({ ...form, [field]: entityName });
      
      addToast(`${type.charAt(0).toUpperCase() + type.slice(1)} details are incomplete. Please fill in the ${type} details.`, "warning");
      refreshNotifications();
    } catch (e) {
      console.error(e);
      addToast(`Failed to create ${type}`, "error");
    }
  };

  // Pagination and search state

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

  const handleDeleteAll = async () => {
    const isConfirmed = await confirm({
      title: "Delete All Rates",
      message: "Are you absolutely sure you want to delete ALL rates? This action is irreversible and they will be moved to Trash.",
      confirmText: "Yes, Delete All",
      cancelText: "Cancel",
      requireInput: "confirm"
    });
    if (!isConfirmed) return;
    
    setLoading(true);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/rates/all`);
      setRates([]);
    } catch (err) {
      console.error("Delete all error", err);
      fetchRates();
    } finally {
      setLoading(false);
    }
  };

  // Filter rates based on search query
  const displayRates = React.useMemo(() => {
    const pending = (syncQueue || [])
      .filter(req => req.method === 'post' && req.url.includes('/rates'))
      .map(req => ({
        ...req.data,
        id: req.tempId,
        isOfflinePending: true,
      }));
    return [...pending, ...rates];
  }, [rates, syncQueue]);

  const filteredRates = displayRates.filter(r => {
    const query = searchQuery.toLowerCase();
    return (
      (r.client || "").toLowerCase().includes(query) ||
      (r.origin || "").toLowerCase().includes(query) ||
      (r.destination || "").toLowerCase().includes(query)
    );
  });

  const { sortedData, sortOption, setSortOption } = useTableSort(filteredRates, "newest", { nameKey: "client", amountKey: "id" });

  // Pagination calculations
  const totalPages = Math.ceil(sortedData.length / entriesPerPage) || 1;
  const currentData = sortedData.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

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
    <div className="page-content">
      {/* Title & Add Button */}
      <div className="header-flex" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: "1.8rem", color: "var(--primary-color)", margin: 0, fontWeight: "700", letterSpacing: "-0.5px" }}>Rates Master</h3>
        <div className="page-header-actions">
          <CsvImportExport moduleName="rates" onImportSuccess={fetchRates} />
          {canBulkDelete && rates.length > 0 && (
            <button onClick={handleDeleteAll} className="page-header-btn" style={{ color: "#dc2626", borderColor: "#fecaca" }}>
              Delete All
            </button>
          )}
          {!isAdding && !editing && (
            <button onClick={() => setIsAdding(true)} className="page-header-btn page-header-btn-primary">
              + Add New Rate
            </button>
          )}
        </div>
      </div>

      <StatsPanel stats={[
        { label: "Total Active Rates", value: rates.length, color: "blue", icon: IndianRupee },
        { label: "Unique Clients", value: new Set(rates.map(r => r.client)).size, color: "green", icon: Users },
        { label: "Most Used Route", value: rates.length > 0 ? Array.from(rates.reduce((acc, r) => acc.set(`${r.origin}-${r.destination}`, (acc.get(`${r.origin}-${r.destination}`) || 0) + 1), new Map()).entries()).sort((a, b) => b[1] - a[1])[0][0] : "N/A", color: "purple", icon: TrendingUp }
      ]} />

      {/* Form Section */}
      <AnimatePresence>
        {(isAdding || editing) && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            style={{ overflow: "hidden", marginBottom: "2rem" }}
          >
            <div className="glass-panel" style={{ padding: "2.5rem" }}>
              <h4 style={{ margin: "0 0 2rem 0", fontSize: "1.4rem", color: "var(--text-dark)", borderBottom: "2px solid var(--border-color)", paddingBottom: "1rem" }}>
                {editing ? "Edit Rate Details" : "Add New Rate"}
              </h4>
              <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Client<span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{ boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)", borderRadius: "6px" }}>
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
                <div style={{ boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)", borderRadius: "6px" }}>
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
                <div style={{ boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)", borderRadius: "6px" }}>
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
                  type="number"
                  step="any"
                  className="form-control" 
                  value={form.awbCharge} 
                  placeholder="Enter Awb Charge" 
                  onChange={(e) => setForm({ ...form, awbCharge: e.target.value })} 
                  required 
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                  onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                  onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Air Rate<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="number" step="any" value={form.airRate} onChange={(e) => setForm({ ...form, airRate: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Air Pickup<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="number" step="any" value={form.airPickup} onChange={(e) => setForm({ ...form, airPickup: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Air Delivery<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="number" step="any" value={form.airDelivery} onChange={(e) => setForm({ ...form, airDelivery: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Train Rate<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="number" step="any" value={form.trainRate} onChange={(e) => setForm({ ...form, trainRate: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Train Pickup<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="number" step="any" value={form.trainPickup} onChange={(e) => setForm({ ...form, trainPickup: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Train Delivery<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="number" step="any" value={form.trainDelivery} onChange={(e) => setForm({ ...form, trainDelivery: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Road Rate<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="number" step="any" value={form.roadRate} onChange={(e) => setForm({ ...form, roadRate: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Road Pickup<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="number" step="any" value={form.roadPickup} onChange={(e) => setForm({ ...form, roadPickup: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Road Delivery<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="number" step="any" value={form.roadDelivery} onChange={(e) => setForm({ ...form, roadDelivery: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Road Express Rate<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="number" step="any" value={form.roadExpressRate} onChange={(e) => setForm({ ...form, roadExpressRate: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Road Express Pickup<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="number" step="any" value={form.roadExpressPickup} onChange={(e) => setForm({ ...form, roadExpressPickup: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Road Express Delivery<span style={{ color: "#ef4444" }}>*</span></label>
                <input type="number" step="any" value={form.roadExpressDelivery} onChange={(e) => setForm({ ...form, roadExpressDelivery: e.target.value })} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }} onFocus={(e) => e.target.style.borderColor = "#4F46E5"} onBlur={(e) => e.target.style.borderColor = "#cbd5e1"} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-color)" }}>
              <button 
                type="button"
                onClick={() => { setEditing(null); setIsAdding(false); setForm(initialFormState); }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="btn btn-primary"
              >
                {editing ? "Save Changes" : "Save Rate"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="premium-filter-toolbar">
        <div className="premium-filter-grid">
          
          <div className="premium-search-wrapper">
            <div className="premium-search-icon">
              <Search size={16} />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={handleSearchChange}
              className="premium-search-input"
              placeholder="Search rates..."
            />
          </div>

          <SortDropdown 
            value={sortOption} 
            onChange={setSortOption} 
            options={["newest", "oldest", "az", "za"]} 
          />

          <div className="premium-filter-group">
            <span className="premium-filter-label">Show</span>
            <select 
              value={entriesPerPage} 
              onChange={handleEntriesChange} 
              className="premium-filter-input"
              style={{ cursor: "pointer", width: "50px" }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span className="premium-filter-label" style={{ marginLeft: 0 }}>entries</span>
          </div>

        </div>
      </div>

      {/* Table Section */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <div className="table-responsive">
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0", textAlign: "center", whiteSpace: "nowrap" }}>Client</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0", textAlign: "center", whiteSpace: "nowrap" }}>Origin</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0", textAlign: "center", whiteSpace: "nowrap" }}>Destination</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", textAlign: "center" }}>Rates & Charges</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading...</td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No matching records found.</td>
                </tr>
              ) : (
                currentData.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "white", opacity: item.isOfflinePending ? 0.7 : 1 }}>
                    <td style={{ padding: "12px", fontSize: "0.95rem", color: "#1e293b", borderRight: "1px solid #e2e8f0", fontWeight: "700", textTransform: "uppercase", textAlign: "center", whiteSpace: "nowrap", verticalAlign: "top" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                        {item.client}
                        {item.isOfflinePending && (
                          <Clock size={14} color="#f59e0b" title="Pending Sync (Offline)" />
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.95rem", color: "#1e293b", borderRight: "1px solid #e2e8f0", fontWeight: "600", textTransform: "uppercase", textAlign: "center", whiteSpace: "nowrap", verticalAlign: "top" }}>
                      {item.origin}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.95rem", color: "#1e293b", borderRight: "1px solid #e2e8f0", fontWeight: "600", textTransform: "uppercase", textAlign: "center", whiteSpace: "nowrap", verticalAlign: "top" }}>
                      {item.destination}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b" }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                          <div style={{ fontWeight: '700', color: '#334155', marginBottom: '4px', fontSize: '0.85rem' }}>BASIC CHARGES</div>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem' }}>
                            <span>AWB: <span style={{color: '#0f172a', fontWeight: '600'}}>₹{item.awbCharge || '0'}</span></span>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', textAlign: 'left' }}>
                          <div style={{ backgroundColor: '#eff6ff', padding: '8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                            <div style={{ fontWeight: '700', color: '#1d4ed8', marginBottom: '4px', fontSize: '0.85rem' }}>AIR</div>
                            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', color: '#475569' }}>
                              <span>Rate: <span style={{color: '#1e293b', fontWeight: '500'}}>₹{item.airRate || '0'}</span></span>
                              <span>Pickup: <span style={{color: '#1e293b', fontWeight: '500'}}>₹{item.airPickup || '0'}</span></span>
                              <span>Delivery: <span style={{color: '#1e293b', fontWeight: '500'}}>₹{item.airDelivery || '0'}</span></span>
                            </div>
                          </div>
                          <div style={{ backgroundColor: '#fdf4ff', padding: '8px', borderRadius: '4px', border: '1px solid #fbcfe8' }}>
                            <div style={{ fontWeight: '700', color: '#a21caf', marginBottom: '4px', fontSize: '0.85rem' }}>TRAIN</div>
                            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', color: '#475569' }}>
                              <span>Rate: <span style={{color: '#1e293b', fontWeight: '500'}}>₹{item.trainRate || '0'}</span></span>
                              <span>Pickup: <span style={{color: '#1e293b', fontWeight: '500'}}>₹{item.trainPickup || '0'}</span></span>
                              <span>Delivery: <span style={{color: '#1e293b', fontWeight: '500'}}>₹{item.trainDelivery || '0'}</span></span>
                            </div>
                          </div>
                          <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                            <div style={{ fontWeight: '700', color: '#15803d', marginBottom: '4px', fontSize: '0.85rem' }}>ROAD</div>
                            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', color: '#475569' }}>
                              <span>Rate: <span style={{color: '#1e293b', fontWeight: '500'}}>₹{item.roadRate || '0'}</span></span>
                              <span>Pickup: <span style={{color: '#1e293b', fontWeight: '500'}}>₹{item.roadPickup || '0'}</span></span>
                              <span>Delivery: <span style={{color: '#1e293b', fontWeight: '500'}}>₹{item.roadDelivery || '0'}</span></span>
                            </div>
                          </div>
                          <div style={{ backgroundColor: '#fff7ed', padding: '8px', borderRadius: '4px', border: '1px solid #fed7aa' }}>
                            <div style={{ fontWeight: '700', color: '#c2410c', marginBottom: '4px', fontSize: '0.85rem' }}>ROAD EXPRESS</div>
                            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', color: '#475569' }}>
                              <span>Rate: <span style={{color: '#1e293b', fontWeight: '500'}}>₹{item.roadExpressRate || '0'}</span></span>
                              <span>Pickup: <span style={{color: '#1e293b', fontWeight: '500'}}>₹{item.roadExpressPickup || '0'}</span></span>
                              <span>Delivery: <span style={{color: '#1e293b', fontWeight: '500'}}>₹{item.roadExpressDelivery || '0'}</span></span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                          <button 
                            onClick={() => handleEditClick(item)} 
                            disabled={item.isOfflinePending}
                            className="btn btn-primary"
                            style={{ width: "36px", height: "36px", padding: "0", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: item.isOfflinePending ? 0.5 : 1, cursor: item.isOfflinePending ? "not-allowed" : "pointer" }}
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          {isSuperAdmin && !item.isOfflinePending ? (
                            <button 
                              onClick={() => handleDelete(item.id)}
                              className="btn btn-danger"
                              style={{ width: "36px", height: "36px", padding: "0", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <button 
                              disabled
                              style={{ backgroundColor: "#fca5a5", border: "none", width: "36px", height: "36px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "not-allowed", flexShrink: 0 }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
    </div>
  );
};

export default Rates;