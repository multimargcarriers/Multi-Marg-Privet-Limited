import React, { useState, useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { Activity, AlertTriangle, Info, Shield, RefreshCw, Trash2, Calendar, Settings2, X } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const SystemLogs = () => {
  const { token, user } = useContext(AuthContext);
  const isSuperAdmin = user?.role?.toLowerCase() === 'superadmin' || user?.role?.toLowerCase() === 'admin'; // Based on authController
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Advanced Delete Modal State
  const [showAdvancedDelete, setShowAdvancedDelete] = useState(false);
  const [bulkLevel, setBulkLevel] = useState("ALL");
  const [bulkStartDate, setBulkStartDate] = useState("");
  const [bulkEndDate, setBulkEndDate] = useState("");

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null
  });

  const executeDeleteLog = async (id) => {
    setIsDeleting(true);
    try {
      const res = await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/logs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) fetchLogs();
    } catch (error) {
      console.error("Failed to delete log", error);
      addToast("Failed to delete log", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteLog = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Log",
      message: "Are you sure you want to delete this specific log entry? This action cannot be undone.",
      onConfirm: () => executeDeleteLog(id)
    });
  };

  const executeBulkDelete = async (isClearAll, payload) => {
    setIsDeleting(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/logs/bulk-delete`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        addToast(res.data.message, "success");
        setShowAdvancedDelete(false);
        fetchLogs();
      }
    } catch (error) {
      console.error("Failed to bulk delete logs", error);
      addToast("Failed to bulk delete logs", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = (isClearAll = false) => {
    const payload = isClearAll ? { all: true } : { level: bulkLevel, startDate: bulkStartDate, endDate: bulkEndDate };
    
    setConfirmDialog({
      isOpen: true,
      title: isClearAll ? "Clear All Logs" : "Bulk Delete Logs",
      message: isClearAll 
        ? "WARNING: This will permanently delete ALL system logs from the database. Are you absolutely sure you want to proceed?"
        : "Are you sure you want to delete all logs matching the selected criteria? This action cannot be undone.",
      onConfirm: () => executeBulkDelete(isClearAll, payload)
    });
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setLogs(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filter !== "ALL" && log.level.toLowerCase() !== filter.toLowerCase()) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "20px" }}>
      {/* Header */}
      <div className="header-flex">
        <div>
          <h3 style={{ fontSize: '1.8rem', color: '#0f172a', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={24} color="#6366f1" /> Activity Logs
          </h3>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Real-time audit trail of user actions across the platform.</p>
        </div>
        <button 
          onClick={fetchLogs} 
          style={{ padding: '0.6rem 1.2rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: '500', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px 8px 0 0", padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            onClick={() => setFilter("ALL")}
            style={{ padding: "0.4rem 1rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", border: filter === "ALL" ? "none" : "1px solid #e2e8f0", backgroundColor: filter === "ALL" ? "#475569" : "transparent", color: filter === "ALL" ? "white" : "#64748b" }}
          >
            All Logs
          </button>
          <button 
            onClick={() => setFilter("ERROR")}
            style={{ padding: "0.4rem 1rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", border: filter === "ERROR" ? "none" : "1px solid #e2e8f0", backgroundColor: filter === "ERROR" ? "#ef4444" : "transparent", color: filter === "ERROR" ? "white" : "#64748b", display: "flex", alignItems: "center", gap: "0.25rem" }}
          >
            <AlertTriangle size={14} /> Errors
          </button>
          <button 
            onClick={() => setFilter("INFO")}
            style={{ padding: "0.4rem 1rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", border: filter === "INFO" ? "none" : "1px solid #e2e8f0", backgroundColor: filter === "INFO" ? "#3b82f6" : "transparent", color: filter === "INFO" ? "white" : "#64748b", display: "flex", alignItems: "center", gap: "0.25rem" }}
          >
            <Info size={14} /> Info
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            onClick={() => setShowAdvancedDelete(true)}
            style={{ padding: "0.4rem 1rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", border: "1px solid #e2e8f0", backgroundColor: "white", color: "#64748b", display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Settings2 size={14} /> Advanced Delete
          </button>
          
          <input 
            type="text" 
            placeholder="Search message..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "0.5rem 1rem", borderRadius: "20px", border: "1px solid #cbd5e1", fontSize: "0.85rem", width: "250px", outline: "none" }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 8px 8px", overflowX: "auto" }}>
        <div className="table-responsive">
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontFamily: "monospace" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "12px 1.5rem", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", width: "180px" }}>Timestamp</th>
              <th style={{ padding: "12px 1.5rem", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", width: "100px" }}>Level</th>
              <th style={{ padding: "1rem 1.5rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Message</th>
              <th style={{ padding: "1rem 1.5rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Details</th>
              {isSuperAdmin && (
                <th style={{ padding: "1rem 1.5rem", textAlign: "right", fontSize: "0.75rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
                  <Activity size={24} className="animate-spin" style={{ margin: "0 auto 1rem auto" }} />
                  Loading Logs...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
                  No logs found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id || Math.random()} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 1.5rem", fontSize: "0.85rem", color: "#64748b" }}>
                    {log.timestamp}
                  </td>
                  <td style={{ padding: "12px 1.5rem" }}>
                    <span style={{ 
                      padding: "0.2rem 0.6rem", 
                      borderRadius: "4px", 
                      fontSize: "0.75rem", 
                      fontWeight: "700",
                      backgroundColor: log.level === "error" ? "#fef2f2" : "#eff6ff",
                      color: log.level === "error" ? "#ef4444" : "#3b82f6"
                    }}>
                      {log.level.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "12px 1.5rem", fontSize: "0.85rem", color: "#334155", fontWeight: "500" }}>
                    {log.message}
                  </td>
                  <td style={{ padding: "12px 1.5rem", fontSize: "0.8rem", color: "#94a3b8", maxWidth: "400px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.stack ? (
                      <span style={{ color: "#ef4444" }}>{log.stack.split('\n')[0]}</span>
                    ) : log.meta ? (
                      JSON.stringify(log.meta)
                    ) : (
                      "-"
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td style={{ padding: "12px 1.5rem", textAlign: "right" }}>
                      <button 
                        onClick={() => handleDeleteLog(log.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px' }}
                        title="Delete this log"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
      {/* Advanced Delete Modal */}
      {showAdvancedDelete && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trash2 size={20} color="#ef4444" /> Advanced Bulk Delete
              </h3>
              <button onClick={() => setShowAdvancedDelete(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Log Level to Delete</label>
                <select 
                  value={bulkLevel} 
                  onChange={(e) => setBulkLevel(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                >
                  <option value="ALL">All Levels</option>
                  <option value="ERROR">Errors Only</option>
                  <option value="INFO">Info Only</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>From Date (Optional)</label>
                  <input 
                    type="date" 
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>To Date (Optional)</label>
                  <input 
                    type="date" 
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                onClick={() => handleBulkDelete(true)}
                disabled={isDeleting}
                style={{ padding: '0.6rem 1rem', borderRadius: '6px', backgroundColor: '#fff', border: '1px solid #ef4444', color: '#ef4444', fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
              >
                Clear All Logs
              </button>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => setShowAdvancedDelete(false)}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', backgroundColor: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleBulkDelete(false)}
                  disabled={isDeleting}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', backgroundColor: '#ef4444', border: 'none', color: '#fff', fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {isDeleting ? "Deleting..." : "Delete Matching"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Confirmation Modal */}
      {confirmDialog.isOpen && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="fade-in" style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '400px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '50%' }}>
                <AlertTriangle size={24} color="#ef4444" />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>{confirmDialog.title}</h3>
            </div>
            
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '2rem' }}>
              {confirmDialog.message}
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', backgroundColor: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setConfirmDialog({ ...confirmDialog, isOpen: false });
                  confirmDialog.onConfirm();
                }}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', backgroundColor: '#ef4444', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SystemLogs;
