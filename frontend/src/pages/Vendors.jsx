import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { Edit, Trash2, Truck, FileText, CheckCircle, Search, Filter, Clock } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { SettingsContext } from "../context/SettingsContext";
import { useSync } from "../context/SyncContext";
import { formatAllCaps, formatTitleCase, formatPhoneNumber } from "../utils/formatters";
import { motion, AnimatePresence } from "framer-motion";
import CsvImportExport from "../components/CsvImportExport";
import StatsPanel from "../components/StatsPanel";
import SortDropdown from "../components/SortDropdown";
import useTableSort from "../hooks/useTableSort";

const Vendors = () => {
  const { syncQueue } = useSync();
  const { user } = useContext(AuthContext);
  const { globalSettings } = useContext(SettingsContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimarg.com';
  const canBulkDelete = isSuperAdmin && globalSettings?.integrations?.enableBulkDelete;

  const [vendors, setVendors] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const initialFormState = {
    codeInitial: "MCPL",
    vendorCode: "",
    name: "",
    gst: "",
    branch: "",
    mode: "",
    address: "",
    contact: "",
    phno: "",
    email: "",
    status: "Active",
  };
  const [form, setForm] = useState(initialFormState);

  // Pagination and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    fetchVendors();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/branches`);
      if (response.data.success) {
        setBranches(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching branches", error);
    }
  };

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/vendors`);
      if (response.data.success) {
        setVendors(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching vendors", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item) => {
    setForm({
      codeInitial: item.codeInitial || "MCPL",
      vendorCode: item.vendorCode || "",
      name: item.name || "",
      gst: item.gst || "",
      branch: item.branch || "",
      mode: item.mode || "",
      address: item.address || "",
      contact: item.contact || "",
      phno: item.phno || "",
      email: item.email || "",
      status: item.status || "Active",
    });
    setEditing(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const tempId = "temp-" + Date.now();
    try {
      if (editing) {
        setVendors(prev => prev.map(v => v.id === editing.id ? { ...v, ...form } : v));
        await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/vendors/${editing.id}`, form);
        setEditing(null);
      } else {
        setVendors(prev => [{ ...form, id: tempId }, ...prev]);
        const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/vendors`, form);
        if (res.data.success && res.data.data) {
          setVendors(prev => prev.map(v => v.id === tempId ? res.data.data : v));
        } else {
          fetchVendors();
        }
      }
      setForm(initialFormState);
      setIsAdding(false);
    } catch (err) {
      console.error("Save error", err);
      fetchVendors();
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Vendor",
      message: "Are you sure you want to delete this vendor? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    setVendors(prev => prev.filter(v => v.id !== id));
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/vendors/${id}`);
    } catch (err) {
      console.error("Delete error", err);
      fetchVendors();
    }
  };

  const handleAddClick = () => {
    let maxCode = 0;
    
    vendors.forEach(v => {
      if (v.vendorCode) {
        const numericMatch = String(v.vendorCode).match(/\d+/);
        if (numericMatch) {
          const code = parseInt(numericMatch[0], 10);
          if (!isNaN(code) && code > maxCode) {
            maxCode = code;
          }
        }
      }
    });
    
    // If no numeric code is found at all, start at 201. Otherwise, increment the absolute highest found.
    const nextCode = maxCode === 0 ? "201" : String(maxCode + 1).padStart(3, '0');
    
    setForm({
      ...initialFormState,
      vendorCode: nextCode
    });
    setIsAdding(true);
  };

  const handleDeleteAll = async () => {
    const isConfirmed = await confirm({
      title: "Delete All Vendors",
      message: "Are you absolutely sure you want to delete ALL vendors? This action is irreversible and all vendor data will be moved to Trash.",
      confirmText: "Yes, Delete All",
      cancelText: "Cancel",
      requireInput: "confirm"
    });
    if (!isConfirmed) return;
    
    setLoading(true);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/vendors/all`);
      setVendors([]);
    } catch (err) {
      console.error("Delete all error", err);
      fetchVendors();
    } finally {
      setLoading(false);
    }
  };

  const displayVendors = React.useMemo(() => {
    const pending = (syncQueue || [])
      .filter(req => req.method === 'post' && req.url.includes('/vendors'))
      .map(req => ({
        ...req.data,
        id: req.tempId,
        isOfflinePending: true,
      }));
    return [...pending, ...vendors];
  }, [vendors, syncQueue]);

  const filteredVendors = displayVendors.filter(v => {
    const query = searchQuery.toLowerCase();
    const vName = v.name || "";
    
    const matchesSearch = vName.toLowerCase().includes(query) ||
      (v.vendorCode || "").toLowerCase().includes(query) ||
      (v.gst || "").toLowerCase().includes(query) ||
      (v.address || "").toLowerCase().includes(query) ||
      (v.contact || "").toLowerCase().includes(query);
      
    const matchesStatus = statusFilter === "All" || v.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const { sortedData, sortOption, setSortOption } = useTableSort(filteredVendors, "newest", { nameKey: "name", amountKey: "id" });

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
        <h3 style={{ fontSize: "1.8rem", color: "var(--primary-color)", margin: 0, fontWeight: "700", letterSpacing: "-0.5px" }}>Vendors Master</h3>
        <div className="page-header-actions">
          <CsvImportExport moduleName="vendors" onImportSuccess={fetchVendors} />
          {canBulkDelete && vendors.length > 0 && (
            <button onClick={handleDeleteAll} className="page-header-btn" style={{ color: "#dc2626", borderColor: "#fecaca" }}>
              <Trash2 size={16} /> Delete All
            </button>
          )}
          {!isAdding && !editing && (
            <button onClick={handleAddClick} className="page-header-btn page-header-btn-primary">
              + Add New Vendor
            </button>
          )}
        </div>
      </div>

      <StatsPanel stats={[
        { label: "Total Vendors", value: displayVendors.length, color: "blue", icon: Truck },
        { label: "With GST/PAN", value: displayVendors.filter(v => (v.gst && v.gst.trim() !== '') || (v.pan && v.pan.trim() !== '')).length, color: "green", icon: CheckCircle },
        { label: "Pending KYC", value: displayVendors.filter(v => (!v.gst || v.gst.trim() === '') && (!v.pan || v.pan.trim() === '')).length, color: "orange", icon: FileText }
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
                {editing ? "Edit Vendor Details" : "Add New Vendor"}
              </h4>
              <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Vendor Code</label>
                <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)', backgroundColor: 'white', transition: "border-color 0.2s" }} onFocus={(e) => e.currentTarget.style.borderColor = "#4F46E5"} onBlur={(e) => e.currentTarget.style.borderColor = "#cbd5e1"}>
                  <span style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', borderRight: '1px solid #cbd5e1', fontWeight: '600' }}>
                    MCPL
                  </span>
                  <input 
                    type="text" 
                    value={form.vendorCode} 
                    onChange={(e) => setForm({ ...form, vendorCode: e.target.value.replace(/\D/g, '') })} 
                    placeholder="e.g. 201"
                    style={{ flex: 1, padding: '0.75rem', border: 'none', outline: 'none', color: '#0f172a' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Vendor Name<span style={{ color: "#ef4444" }}>*</span></label>
                <input 
                  type="text" 
                  value={form.name} 
                  placeholder="Enter Vendor Name"
                  onChange={(e) => setForm({ ...form, name: formatAllCaps(e.target.value) })} 
                  required
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                  onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                  onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>GST<span style={{ color: "#ef4444" }}>*</span></label>
                <input 
                  type="text" 
                  value={form.gst} 
                  placeholder="Enter GST"
                  onChange={(e) => setForm({ ...form, gst: e.target.value.toUpperCase() })} 
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                  onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                  onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Branch<span style={{ color: "#ef4444" }}>*</span></label>
                <select 
                  value={form.branch} 
                  onChange={(e) => setForm({ ...form, branch: e.target.value })} 
                  required
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", backgroundColor: "white", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                  onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                  onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                >
                  <option value="">-- Please select Branch --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.branch}>{b.branch}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Mode<span style={{ color: "#ef4444" }}>*</span></label>
                <input 
                  type="text"
                  list="vendor-modes"
                  value={form.mode} 
                  placeholder="e.g. Bike, Local Tempo"
                  onChange={(e) => setForm({ ...form, mode: e.target.value })} 
                  required
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", backgroundColor: "white", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                  onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                  onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                />
                <datalist id="vendor-modes">
                  <option value="Bike" />
                  <option value="Scooter" />
                  <option value="Local Tempo" />
                  <option value="Mini Truck" />
                  <option value="Pickup Truck" />
                  <option value="Heavy Truck" />
                  <option value="ROAD" />
                  <option value="TRAIN" />
                  <option value="AIR" />
                  <option value="Road Express" />
                </datalist>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Contact Person</label>
                <input 
                  type="text" 
                  value={form.contact} 
                  placeholder="Contact Person Name"
                  onChange={(e) => setForm({ ...form, contact: formatTitleCase(e.target.value) })} 
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                  onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                  onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Phone Number</label>
                <input 
                  type="text" 
                  value={form.phno} 
                  placeholder="Phone Number"
                  onChange={(e) => setForm({ ...form, phno: formatPhoneNumber(e.target.value) })} 
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                  onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                  onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Email</label>
                <input 
                  type="email" 
                  value={form.email} 
                  placeholder="Email Address"
                  onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })} 
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                  onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                  onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Address<span style={{ color: "#ef4444" }}>*</span></label>
                <textarea 
                  value={form.address} 
                  placeholder="Enter Address"
                  onChange={(e) => setForm({ ...form, address: formatTitleCase(e.target.value) })} 
                  required
                  rows="2"
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", resize: "none", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                  onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                  onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                />
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
                {editing ? "Save Changes" : "Save Vendor"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
        )}
      </AnimatePresence>

      {/* Table Section */}
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
              placeholder="Search vendors..."
            />
          </div>

          <div className="premium-filter-group">
            <Filter size={16} color="#64748b" style={{ marginLeft: "4px" }} />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)} 
              className="premium-filter-input"
              style={{ cursor: "pointer" }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
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
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0", width: "80px" }}>Code</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Vendor Name</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>GST</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Branch</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Mode</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Address</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Contact</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Email</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0", textAlign: "center", width: "60px" }}>Edit</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", textAlign: "center", width: "60px" }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading...</td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No matching records found.</td>
                </tr>
              ) : (
                currentData.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "white", opacity: item.isOfflinePending ? 0.7 : 1 }}>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0", fontWeight: "500" }}>
                      MCPL{String(item.vendorCode || "").replace(/^mcpl-?/i, "")}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                      {formatAllCaps(item.name || "")}
                      {item.isOfflinePending && (
                        <Clock size={14} color="#f59e0b" title="Pending Sync (Offline)" />
                      )}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>
                      {formatAllCaps(item.gst || "NA")}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0", textTransform: "uppercase" }}>
                      {item.branch || "NA"}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>
                      {item.mode ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {item.mode.split(',').map((m, i) => {
                            const modeText = m.trim();
                            if (!modeText) return null;
                            return (
                              <div key={i} style={{ 
                                backgroundColor: '#f1f5f9', 
                                color: '#334155', 
                                padding: '4px 10px', 
                                borderRadius: '4px', 
                                fontSize: '0.75rem', 
                                fontWeight: '700',
                                textAlign: 'center',
                                border: '1px solid #e2e8f0',
                                textTransform: 'uppercase',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                              }}>
                                {modeText}
                              </div>
                            );
                          })}
                        </div>
                      ) : "NA"}
                    </td>
                    <td className="address-cell" style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>
                      {formatTitleCase(item.address || "NA")}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>
                      {formatTitleCase(item.contact || "NA")}<br/>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{item.phno}</span>
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>
                      {item.email ? (item.email).toLowerCase() : "NA"}
                    </td>
                    <td style={{ padding: "16px 12px", borderRight: "1px solid var(--border-color)", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <button 
                          onClick={() => handleEditClick(item)} 
                          disabled={item.isOfflinePending}
                          className="btn btn-primary"
                          style={{ width: "36px", height: "36px", padding: "0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", opacity: item.isOfflinePending ? 0.5 : 1, cursor: item.isOfflinePending ? "not-allowed" : "pointer" }}
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "16px 12px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        {isSuperAdmin && !item.isOfflinePending ? (
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="btn btn-danger"
                            style={{ width: "36px", height: "36px", padding: "0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button 
                            disabled
                            style={{ backgroundColor: "#fca5a5", border: "none", width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "not-allowed" }}
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
        </div>
        
        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "15px", fontSize: "0.85rem", color: "#64748b" }}>
          <div>
            Showing {filteredVendors.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, filteredVendors.length)} of {filteredVendors.length} entries
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

export default Vendors;
