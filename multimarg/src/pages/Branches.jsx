import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Edit, Trash2, Building, MapPin, CheckCircle, Search } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { SettingsContext } from "../context/SettingsContext";
import {  formatTitleCase, formatPhoneNumber } from "../utils/formatters";
import CsvImportExport from "../components/CsvImportExport";
import StatsPanel from "../components/StatsPanel";
import SortDropdown from "../components/SortDropdown";
import useTableSort from "../hooks/useTableSort";

const Branches = () => {
  const { user } = useContext(AuthContext);
  const { globalSettings } = useContext(SettingsContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';
  const canBulkDelete = isSuperAdmin && globalSettings?.integrations?.enableBulkDelete;

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const initialFormState = {
    code: "",
    branch: "",
    name: "",
    address: "",
    phno: "",
    email: ""
  };
  const [form, setForm] = useState(initialFormState);

  // Pagination and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/branches`);
      if (res.data.success) setBranches(res.data.data || []);
    } catch (err) {
      console.error("Fetch branches error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item) => {
    setForm({
      code: item.code || "",
      branch: item.branch || "",
      name: item.name || "",
      address: item.address || "",
      phno: item.phno || "",
      email: item.email || ""
    });
    setEditing(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const tempId = "temp-" + Date.now();
    try {
      if (editing) {
        setBranches(prev => prev.map(b => b.id === editing.id ? { ...b, ...form } : b));
        await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/branches/${editing.id}`, form);
        setEditing(null);
      } else {
        setBranches(prev => [{ ...form, id: tempId }, ...prev]);
        const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/branches`, form);
        if (res.data.success && res.data.data) {
          setBranches(prev => prev.map(b => b.id === tempId ? res.data.data : b));
        } else {
          fetchBranches();
        }
      }
      setForm(initialFormState);
      setIsAdding(false);
    } catch (err) {
      console.error("Save error", err);
      fetchBranches();
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Branch",
      message: "Are you sure you want to delete this branch? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    setBranches(prev => prev.filter(b => b.id !== id));
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/branches/${id}`);
    } catch (err) {
      console.error("Delete error", err);
      fetchBranches();
    }
  };

  const handleDeleteAll = async () => {
    const isConfirmed = await confirm({
      title: "Delete ALL Branches",
      message: "WARNING: This will permanently delete ALL branches from the database. This action CANNOT be undone. Are you absolutely sure?",
      confirmText: "DELETE ALL",
      cancelText: "Cancel",
      requireInput: "confirm"
    });
    if (!isConfirmed) return;

    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/branches/all`);
      setBranches([]);
    } catch (err) {
      console.error("Delete all error", err);
      fetchBranches();
    }
  };

  const handleAddNewClick = () => {
    let nextCode = 101;
    if (branches.length > 0) {
      const codes = branches.map(b => {
        if (!b.code) return NaN;
        // Extract only the numbers from the string (e.g. "MCP-105" -> 105)
        const digits = b.code.replace(/\D/g, '');
        return digits ? parseInt(digits, 10) : NaN;
      }).filter(n => !isNaN(n));
      
      if (codes.length > 0) {
        nextCode = Math.max(...codes) + 1;
      }
    }
    setForm({ ...initialFormState, code: `MCPL${nextCode}` });
    setIsAdding(true);
  };

  // Filter and sort branches based on search query and latest first
  const filteredBranches = branches.filter(b => {
    const query = searchQuery.toLowerCase();
    return (
      (b.code || "").toLowerCase().includes(query) ||
      (b.branch || "").toLowerCase().includes(query) ||
      (b.name || "").toLowerCase().includes(query) ||
      (b.address || "").toLowerCase().includes(query) ||
      (b.phno || "").toLowerCase().includes(query) ||
      (b.email || "").toLowerCase().includes(query)
    );
  });

  const { sortedData, sortOption, setSortOption } = useTableSort(filteredBranches, "newest", { nameKey: "branch", amountKey: "id" });

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
        <h3 style={{ fontSize: "1.8rem", color: "var(--primary-color)", margin: 0, fontWeight: "700", letterSpacing: "-0.5px" }}>Branches Master</h3>
        <div className="page-header-actions">
          {canBulkDelete && branches.length > 0 && (
            <button onClick={handleDeleteAll} className="page-header-btn" style={{ color: "#dc2626", borderColor: "#fecaca" }}>
              <Trash2 size={16} /> Delete All Data
            </button>
          )}
          <CsvImportExport moduleName="branches" onImportSuccess={fetchBranches} />
          {!isAdding && !editing && (
            <button onClick={handleAddNewClick} className="page-header-btn page-header-btn-primary">
              + Add New Branch
            </button>
          )}
        </div>
      </div>

      <StatsPanel stats={[
        { label: "Total Branches", value: branches.length, color: "blue", icon: Building },
        { label: "Unique Cities", value: new Set(branches.map(b => b.city)).size, color: "purple", icon: MapPin },
        { label: "With Contact Info", value: branches.filter(b => b.phone && b.phone.trim() !== '').length, color: "green", icon: CheckCircle }
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
                {editing ? "Edit Branch Details" : "Add New Branch"}
              </h4>
              <form onSubmit={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Branch Code</label>
                    <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)', backgroundColor: 'white', transition: "border-color 0.2s" }} onFocus={(e) => e.currentTarget.style.borderColor = "#4F46E5"} onBlur={(e) => e.currentTarget.style.borderColor = "#cbd5e1"}>
                      <span style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', borderRight: '1px solid #cbd5e1', fontWeight: '600' }}>
                        MCPL
                      </span>
                      <input 
                        type="text" 
                        value={form.code ? form.code.replace(/mcpl/i, '') : ''} 
                        onChange={(e) => setForm({ ...form, code: 'MCPL' + e.target.value.replace(/\D/g, '') })}
                        placeholder="101"
                        style={{ flex: 1, padding: '0.75rem', border: 'none', outline: 'none', color: '#0f172a' }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Branch Name<span style={{ color: "#ef4444" }}>*</span></label>
                    <input 
                      type="text" 
                      value={form.branch} 
                      placeholder="Enter Branch"
                      onChange={(e) => setForm({ ...form, branch: e.target.value.toLowerCase() })} 
                      required
                      style={{ textTransform: "uppercase", width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                      onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                      onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Contact Person<span style={{ color: "#ef4444" }}>*</span></label>
                    <input 
                      type="text" 
                      value={form.name} 
                      placeholder="Enter the Contact Person Name"
                      onChange={(e) => setForm({ ...form, name: formatTitleCase(e.target.value) })} 
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                      onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                      onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "1.5rem", marginTop: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Address<span style={{ color: "#ef4444" }}>*</span></label>
                  <textarea 
                    rows="3"
                    value={form.address} 
                    placeholder="Enter the Address"
                    onChange={(e) => setForm({ ...form, address: formatTitleCase(e.target.value) })} 
                    required
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", resize: "none", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                    onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                    onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Phone Number<span style={{ color: "#ef4444" }}>*</span></label>
                    <input 
                      type="text" 
                      value={form.phno} 
                      placeholder="Enter the Phone Number"
                      onChange={(e) => setForm({ ...form, phno: formatPhoneNumber(e.target.value) })} 
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                      onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                      onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Email<span style={{ color: "#ef4444" }}>*</span></label>
                    <input 
                      type="email" 
                      value={form.email} 
                      placeholder="Enter the Email"
                      onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })} 
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
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
                    {editing ? "Save Changes" : "Save Branch"}
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
              placeholder="Search branches..."
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
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Branch Code</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Branch Name</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Contact Person</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Address</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Phone Number</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Email</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0", textAlign: "center" }}>Edit</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", textAlign: "center" }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading...</td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No matching records found.</td>
                </tr>
              ) : (
                currentData.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "white" }}>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0", textTransform: "uppercase" }}>{item.code || "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0", textTransform: "uppercase" }}>{item.branch || "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0", textTransform: "uppercase" }}>{item.name || "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0", maxWidth: "250px", textTransform: "capitalize" }}>{item.address || "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>{item.phno || "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>{item.email || "-"}</td>
                    <td style={{ padding: "16px 12px", borderRight: "1px solid var(--border-color)", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <button 
                          onClick={() => handleEditClick(item)} 
                          className="btn btn-primary"
                          style={{ width: "36px", height: "36px", padding: "0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "16px 12px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        {isSuperAdmin ? (
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
            Showing {filteredBranches.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, filteredBranches.length)} of {filteredBranches.length} entries
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

export default Branches;