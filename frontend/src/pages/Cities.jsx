import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { Edit, Trash2 } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { formatAllCaps } from "../utils/formatters";
import { motion, AnimatePresence } from "framer-motion";
import CsvImportExport from "../components/CsvImportExport";
import StatsPanel from "../components/StatsPanel";
import { MapPin, Search, Clock } from "lucide-react";
import SortDropdown from "../components/SortDropdown";
import useTableSort from "../hooks/useTableSort";
import { useSync } from "../context/SyncContext";

const Cities = () => {
  const { syncQueue } = useSync();
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const initialFormState = {
    city: "",
    short: ""
  };
  const [form, setForm] = useState(initialFormState);

  // Pagination and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/cities`);
      if (res.data.success) setCities(res.data.data || []);
    } catch (err) {
      console.error("Fetch cities error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item) => {
    setForm({
      city: item.city || item.name || "", // sometimes the mock might have 'name' instead of 'city'
      short: item.short || ""
    });
    setEditing(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const tempId = "temp-" + Date.now();
    try {
      if (editing) {
        setCities(prev => prev.map(c => c.id === editing.id ? { ...c, ...form } : c));
        await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/cities/${editing.id}`, form);
        setEditing(null);
      } else {
        setCities(prev => [{ ...form, id: tempId }, ...prev]);
        const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/cities`, form);
        if (res.data.success && res.data.data) {
          setCities(prev => prev.map(c => c.id === tempId ? res.data.data : c));
        } else {
          fetchCities();
        }
      }
      setForm(initialFormState);
      setIsAdding(false);
    } catch (err) {
      console.error("Save error", err);
      fetchCities();
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete City",
      message: "Are you sure you want to delete this city? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    setCities(prev => prev.filter(c => c.id !== id));
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/cities/${id}`);
    } catch (err) {
      console.error("Delete error", err);
      fetchCities();
    }
  };

  // Filter cities based on search query
  const displayCities = React.useMemo(() => {
    const pending = (syncQueue || [])
      .filter(req => req.method === 'post' && req.url.includes('/cities'))
      .map(req => ({
        ...req.data,
        id: req.tempId,
        isOfflinePending: true,
      }));
    return [...pending, ...cities];
  }, [cities, syncQueue]);

  const filteredCities = displayCities.filter(c => {
    const query = searchQuery.toLowerCase();
    const cName = c.city || c.name || "";
    return (
      cName.toLowerCase().includes(query) ||
      (c.short || "").toLowerCase().includes(query)
    );
  });

  const { sortedData, sortOption, setSortOption } = useTableSort(filteredCities, "newest", { nameKey: "city", amountKey: "id" });

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
        <h3 style={{ fontSize: "1.8rem", color: "var(--primary-color)", margin: 0, fontWeight: "700", letterSpacing: "-0.5px" }}>Cities Master</h3>
        <div className="page-header-actions">
          <CsvImportExport moduleName="cities" onImportSuccess={fetchCities} />
          {!isAdding && !editing && (
            <button onClick={() => setIsAdding(true)} className="page-header-btn page-header-btn-primary">
              + Add New City
            </button>
          )}
        </div>
      </div>

      <StatsPanel stats={[
        { label: "Total Cities", value: displayCities.length, icon: MapPin, color: "blue" }
      ]} />

      {/* ADD/EDIT FORM SECTION */}
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
                {editing ? "Edit City Details" : "Add New City"}
              </h4>
              <form onSubmit={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>City Name<span style={{ color: "#ef4444" }}>*</span></label>
                    <input 
                      type="text" 
                      value={form.city} 
                      onChange={(e) => setForm({ ...form, city: formatAllCaps(e.target.value) })} 
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Short Code</label>
                    <input 
                      type="text" 
                      value={form.short} 
                      onChange={(e) => setForm({ ...form, short: formatAllCaps(e.target.value) })} 
                      placeholder="e.g. DEL"
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
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
                    {editing ? "Save Changes" : "Save City"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              placeholder="Search cities..."
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
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>City Name</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Short Code</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0", textAlign: "center", width: "60px" }}>Edit</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", textAlign: "center", width: "60px" }}>Delete</th>
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
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0", fontWeight: "500" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                        {item.city || item.name || "-"}
                        {item.isOfflinePending && (
                          <Clock size={14} color="#f59e0b" title="Pending Sync (Offline)" />
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>
                      {item.short ? (
                        <span style={{ padding: "0.2rem 0.5rem", borderRadius: "12px", backgroundColor: "#e0e7ff", color: "#4f46e5", fontWeight: "600", fontSize: "0.75rem" }}>
                          {item.short}
                        </span>
                      ) : "-"}
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
            Showing {filteredCities.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, filteredCities.length)} of {filteredCities.length} entries
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

export default Cities;