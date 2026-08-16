import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { Edit, Trash2, Users, ShieldCheck, AlertCircle, Search, Filter, Clock } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { SettingsContext } from "../context/SettingsContext";
import { useSync } from "../context/SyncContext";
import { formatAllCaps, formatTitleCase } from "../utils/formatters";
import { motion, AnimatePresence } from "framer-motion";
import CsvImportExport from "../components/CsvImportExport";
import StatsPanel from "../components/StatsPanel";
import SortDropdown from "../components/SortDropdown";
import useTableSort from "../hooks/useTableSort";

const Clients = () => {
  const { syncQueue } = useSync();
  const { user } = useContext(AuthContext);
  const { globalSettings } = useContext(SettingsContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimarg.com';
  const canBulkDelete = isSuperAdmin && globalSettings?.integrations?.enableBulkDelete;

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const initialFormState = {
    codeInitial: "MCPL",
    clientCode: "",
    name: "",
    gst: "",
    address: "",
    contact: "",
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
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/clients`);
      if (response.data.success) {
        setClients(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching clients", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item) => {
    setForm({
      codeInitial: item.codeInitial || "MCPL",
      clientCode: item.clientCode || "",
      name: item.name || "",
      gst: item.gst || "",
      address: item.address || "",
      contact: item.contact || "",
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
        setClients(prev => prev.map(c => c.id === editing.id ? { ...c, ...form } : c));
        await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/clients/${editing.id}`, form);
        setEditing(null);
      } else {
        setClients(prev => [{ ...form, id: tempId }, ...prev]);
        const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/clients`, form);
        if (res.data.success && res.data.data) {
          setClients(prev => prev.map(c => c.id === tempId ? res.data.data : c));
        } else {
          fetchClients();
        }
      }
      setForm(initialFormState);
      setIsAdding(false);
    } catch (err) {
      console.error("Save error", err);
      fetchClients();
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Client",
      message: "Are you sure you want to delete this client? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    setClients(prev => prev.filter(c => c.id !== id));
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/clients/${id}`);
    } catch (err) {
      console.error("Delete error", err);
      fetchClients();
    }
  };

  const handleAddClick = () => {
    let maxCode = 0;
    
    clients.forEach(c => {
      if (c.clientCode) {
        const numericMatch = String(c.clientCode).match(/\d+/);
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
      clientCode: nextCode
    });
    setIsAdding(true);
  };

  const handleDeleteAll = async () => {
    const isConfirmed = await confirm({
      title: "Delete All Clients",
      message: "Are you absolutely sure you want to delete ALL clients? This action is irreversible and all client data will be moved to Trash.",
      confirmText: "Yes, Delete All",
      cancelText: "Cancel",
      requireInput: "confirm"
    });
    if (!isConfirmed) return;
    
    setLoading(true);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/clients/all`);
      setClients([]);
    } catch (err) {
      console.error("Delete all error", err);
      fetchClients();
    } finally {
      setLoading(false);
    }
  };

  // Filter clients based on search query
  const displayClients = React.useMemo(() => {
    const pending = (syncQueue || [])
      .filter(req => req.method === 'post' && req.url.includes('/clients'))
      .map(req => ({
        ...req.data,
        id: req.tempId,
        isOfflinePending: true,
      }));
    return [...pending, ...clients];
  }, [clients, syncQueue]);

  const filteredClients = displayClients.filter(c => {
    const query = searchQuery.toLowerCase();
    const cName = c.name || "";
    
    const matchesSearch = cName.toLowerCase().includes(query) ||
      (c.clientCode || "").toLowerCase().includes(query) ||
      (c.gst || "").toLowerCase().includes(query) ||
      (c.address || "").toLowerCase().includes(query);
      
    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const { sortedData, sortOption, setSortOption } = useTableSort(filteredClients, "newest", { nameKey: "name", amountKey: "id" });

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
        <h3 style={{ fontSize: "1.8rem", color: "var(--primary-color)", margin: 0, fontWeight: "700", letterSpacing: "-0.5px" }}>Clients Master</h3>
        <div className="page-header-actions">
          <CsvImportExport moduleName="clients" onImportSuccess={fetchClients} />
          {canBulkDelete && clients.length > 0 && (
            <button onClick={handleDeleteAll} className="page-header-btn" style={{ color: "#dc2626", borderColor: "#fecaca" }}>
              <Trash2 size={16} /> Delete All
            </button>
          )}
          {!isAdding && !editing && (
            <button onClick={handleAddClick} className="page-header-btn page-header-btn-primary">
              + Add New Client
            </button>
          )}
        </div>
      </div>

      <StatsPanel stats={[
        { label: "Total Clients", value: displayClients.length, color: "blue", icon: Users },
        { label: "With GST", value: displayClients.filter(c => c.gst && c.gst.trim() !== '').length, color: "green", icon: ShieldCheck },
        { label: "Without GST", value: displayClients.filter(c => !c.gst || c.gst.trim() === '').length, color: "orange", icon: AlertCircle }
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
                {editing ? "Edit Client Details" : "Add New Client"}
              </h4>
              <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Client Code</label>
                <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)', backgroundColor: 'white', transition: "border-color 0.2s" }} onFocus={(e) => e.currentTarget.style.borderColor = "#4F46E5"} onBlur={(e) => e.currentTarget.style.borderColor = "#cbd5e1"}>
                  <span style={{ padding: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', borderRight: '1px solid #cbd5e1', fontWeight: '600' }}>
                    MCPL
                  </span>
                  <input 
                    type="text" 
                    value={form.clientCode} 
                    onChange={(e) => setForm({ ...form, clientCode: e.target.value.replace(/\D/g, '') })} 
                    placeholder="e.g. 201"
                    style={{ flex: 1, padding: '0.75rem', border: 'none', outline: 'none', color: '#0f172a' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Client Name<span style={{ color: "#ef4444" }}>*</span></label>
                <input 
                  type="text" 
                  value={form.name} 
                  placeholder="Enter Client Name"
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
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Contact Person</label>
                <input 
                  type="text" 
                  value={form.contact} 
                  placeholder="Enter Contact Person"
                  onChange={(e) => setForm({ ...form, contact: formatTitleCase(e.target.value) })} 
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                  onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                  onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Email (Multiple separated by comma)</label>
                <input 
                  type="text" 
                  value={form.email} 
                  placeholder="e.g. a@x.com, b@x.com"
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
                {editing ? "Save Changes" : "Save Client"}
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
              placeholder="Search clients..."
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
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0", width: "100px" }}>Code</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Client Name</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>GST</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Address</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Contact Person</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Email</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0", textAlign: "center", width: "60px" }}>Edit</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", textAlign: "center", width: "60px" }}>Delete</th>
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
                  <tr key={item.id || idx} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "white", opacity: item.isOfflinePending ? 0.7 : 1 }}>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0", fontWeight: "500" }}>
                      MCPL{String(item.clientCode || "").replace(/^mcpl-?/i, "")}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                      {formatAllCaps(item.name || "")}
                      {String(item.id).startsWith("offline_") && (
                        <Clock size={14} color="#f59e0b" title="Pending Sync (Offline)" />
                      )}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>
                      {formatAllCaps(item.gst || "NA")}
                    </td>
                    <td className="address-cell" style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>
                      {formatTitleCase(item.address || "NA")}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>
                      {formatTitleCase(item.contact || "NA")}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>
                      {item.email ? (
                        <div style={{ wordBreak: 'break-all', maxWidth: '200px' }}>
                          {item.email.split(',').map((email, i) => (
                            <div key={i} style={{ marginBottom: i < item.email.split(',').length - 1 ? '4px' : '0' }}>
                              {email.trim().toLowerCase()}
                            </div>
                          ))}
                        </div>
                      ) : (
                        "NA"
                      )}
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
            Showing {filteredClients.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, filteredClients.length)} of {filteredClients.length} entries
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

export default Clients;
