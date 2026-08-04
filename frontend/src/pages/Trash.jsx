import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  Search,
  Filter,
  AlertCircle,
  Database,
  Calendar,
  X
} from 'lucide-react';
import axios from 'axios';
import { useDialog } from '../context/DialogContext';
import { useToast } from '../context/ToastContext';
import { AuthContext } from '../context/AuthContext';

const Trash = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collectionFilter, setCollectionFilter] = useState('');
  const [search, setSearch] = useState('');
  
  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const { confirm } = useDialog();
  const { addToast } = useToast();
  const { user } = React.useContext(AuthContext);
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = new URL(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/trash`);
      if (collectionFilter) url.searchParams.append('collection', collectionFilter);
      
      const res = await axios.get(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setItems(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching trash:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, [collectionFilter]);

  const handleRestore = async (id, originalCollection) => {
    const isConfirmed = await confirm({
      title: "Restore Data",
      message: `Are you sure you want to restore this data back to ${originalCollection}?`,
      confirmText: "Restore"
    });
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/trash/restore/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTrash();
      addToast("Item restored successfully", "success");
    } catch (err) {
      console.error("Restore error", err);
      addToast("Failed to restore item. " + (err.response?.data?.error || err.message), "error");
    }
  };

  const handleForceDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Permanently Delete",
      message: "WARNING: This will permanently delete this data. This action CANNOT be undone. Are you absolutely sure?",
      confirmText: "Permanently Delete",
      requireInput: "DELETE"
    });
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/trash/force/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTrash();
      addToast("Item permanently deleted", "success");
    } catch (err) {
      console.error("Delete error", err);
      addToast("Failed to delete item.", "error");
    }
  };

  const handleClearTrash = async () => {
    if (!isSuperAdmin) {
      addToast("Only SuperAdmin can clear all trash.", "error");
      return;
    }
    
    if (items.length === 0) {
      addToast("Trash is already empty.", "info");
      return;
    }

    const isConfirmed = await confirm({
      title: "Clear All Trash",
      message: "WARNING: This will permanently delete ALL data in the trash. This action CANNOT be undone. Are you absolutely sure you want to clear all trash?",
      confirmText: "Clear All",
      requireInput: "confirm"
    });
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/trash/clear`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTrash();
      addToast("Trash cleared successfully", "success");
    } catch (err) {
      console.error("Clear trash error", err);
      addToast("Failed to clear trash.", "error");
    }
  };

  const getPreviewText = (doc) => {
    if (!doc) return "Unknown Data";
    const parts = [];
    if (doc.name) parts.push(doc.name);
    if (doc.clientName && doc.clientName !== doc.name) parts.push(`Client: ${doc.clientName}`);
    if (doc.vendorName && doc.vendorName !== doc.name) parts.push(`Vendor: ${doc.vendorName}`);
    if (doc.lrNumber) parts.push(`LR: ${doc.lrNumber}`);
    if (doc.awb && doc.awb !== doc.lrNumber) parts.push(`AWB: ${doc.awb}`);
    if (doc.billNo) parts.push(`Bill: ${doc.billNo}`);
    if (doc.tripNo) parts.push(`Trip: ${doc.tripNo}`);
    if (doc.invoiceNo) parts.push(`Inv: ${doc.invoiceNo}`);
    if (doc.branchName) parts.push(`Branch: ${doc.branchName}`);
    if (doc.origin && doc.destination) parts.push(`${doc.origin} ➔ ${doc.destination}`);
    if (doc.email) parts.push(doc.email);
    if (doc.phone || doc.mobile) parts.push(doc.phone || doc.mobile);

    if (parts.length > 0) return parts.join(" | ");
    
    // Fallback: show first 2-3 meaningful string/number properties
    const keys = Object.keys(doc).filter(k => 
      !['_id', 'id', 'createdAt', 'updatedAt', '__v'].includes(k) && 
      (typeof doc[k] === 'string' || typeof doc[k] === 'number')
    );
    if (keys.length > 0) {
      return keys.slice(0, 3).map(k => `${k}: ${doc[k]}`).join(" | ");
    }

    return doc.id || doc._id || "Document";
  };

  const filteredItems = items.filter(item => {
    if (search && search.trim() !== '') {
      const searchLower = search.toLowerCase().trim();
      const matchInDoc = JSON.stringify(item.document || {}).toLowerCase().includes(searchLower);
      const matchInMeta = JSON.stringify({
        collection: item.originalCollection,
        deletedBy: item.deletedBy
      }).toLowerCase().includes(searchLower);
      const matchInPreview = getPreviewText(item.document).toLowerCase().includes(searchLower);
      
      if (!matchInDoc && !matchInMeta && !matchInPreview) return false;
    }

    if (startDate) {
      const itemDate = new Date(item.deletedAt);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (itemDate < start) return false;
    }
    
    if (endDate) {
      const itemDate = new Date(item.deletedAt);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (itemDate > end) return false;
    }

    return true;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Trash2 className="icon-large" style={{ color: "#ef4444", marginRight: "8px" }} />
            Trash
          </h1>
          <p className="page-subtitle">Manage and restore deleted data (items are permanently deleted after 30 days)</p>
        </div>
      </div>

      <div className="data-table-container">
        {/* Professional Full-Width Grid Toolbar */}
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", backgroundColor: "#fff" }}>
          {/* Top Row: Full-width modern Search Bar */}
          <div style={{ position: "relative", width: "100%", marginBottom: "1rem" }}>
            <Search style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b", width: "18px", height: "18px" }} />
            <input
              type="text"
              placeholder="Search by name, LR number, bill no, city, amount, or deleted by..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem 2.5rem 0.75rem 2.5rem",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                outline: "none",
                fontSize: "0.95rem",
                color: "#1e293b",
                backgroundColor: "#f8fafc",
                transition: "all 0.2s",
                boxSizing: "border-box"
              }}
              onFocus={(e) => {
                e.target.style.backgroundColor = "#fff";
                e.target.style.borderColor = "#3b82f6";
                e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = "#f8fafc";
                e.target.style.borderColor = "#cbd5e1";
                e.target.style.boxShadow = "none";
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px"
                }}
                title="Clear search"
              >
                <X style={{ width: "16px", height: "16px" }} />
              </button>
            )}
          </div>

          {/* Bottom Row: Responsive Grid (2 to 3 items per line, taking full device width) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            alignItems: "center",
            width: "100%"
          }}>
            {/* From Date */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", backgroundColor: "#f8fafc", padding: "0.55rem 1rem", borderRadius: "8px", border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Calendar style={{ color: "#64748b", width: "16px", height: "16px" }} />
                <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600", whiteSpace: "nowrap" }}>From:</label>
              </div>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ border: "none", backgroundColor: "transparent", outline: "none", fontSize: "0.88rem", color: "#1e293b", fontWeight: "600", cursor: "pointer" }}
              />
            </div>
            
            {/* To Date */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", backgroundColor: "#f8fafc", padding: "0.55rem 1rem", borderRadius: "8px", border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Calendar style={{ color: "#64748b", width: "16px", height: "16px" }} />
                <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600", whiteSpace: "nowrap" }}>To:</label>
              </div>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ border: "none", backgroundColor: "transparent", outline: "none", fontSize: "0.88rem", color: "#1e293b", fontWeight: "600", cursor: "pointer" }}
              />
            </div>

            {/* Collection Filter */}
            <div style={{ position: "relative", width: "100%", boxSizing: "border-box" }}>
              <Filter style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b", width: "16px", height: "16px", pointerEvents: "none" }} />
              <select
                value={collectionFilter}
                onChange={(e) => setCollectionFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 1rem 0.6rem 2.5rem",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  backgroundColor: "#f8fafc",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  outline: "none",
                  color: "#1e293b",
                  cursor: "pointer",
                  boxSizing: "border-box"
                }}
              >
                <option value="">All Collections</option>
                <option value="clients">Clients</option>
                <option value="vendors">Vendors</option>
                <option value="bookings">Bookings (LR)</option>
                <option value="trips">Trips</option>
                <option value="bills">Bills</option>
                <option value="branches">Branches</option>
                <option value="rates">Rates</option>
              </select>
            </div>

            {/* Clear All Button */}
            {isSuperAdmin && items.length > 0 && (
              <button
                onClick={handleClearTrash}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 1.25rem",
                  backgroundColor: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 4px 6px -1px rgba(239, 68, 68, 0.25), 0 2px 4px -1px rgba(239, 68, 68, 0.15)",
                  width: "100%",
                  boxSizing: "border-box"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#dc2626";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#ef4444";
                }}
              >
                <Trash2 style={{ width: "18px", height: "18px" }} />
                Clear All Trash
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <th style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Data Preview</th>
                <th style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Collection</th>
                {isSuperAdmin && <th style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Deleted By</th>}
                <th style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Deleted On</th>
                <th style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Expires In</th>
                <th style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? "6" : "5"} style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
                    Loading...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? "6" : "5"} style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
                    <Trash2 style={{ width: "3.5rem", height: "3.5rem", margin: "0 auto 1rem auto", color: "#cbd5e1", opacity: 0.8 }} />
                    <p style={{ fontSize: "1.1rem", fontWeight: "600", color: "#475569" }}>No items found in trash</p>
                    <p style={{ fontSize: "0.9rem", color: "#94a3b8", marginTop: "6px" }}>Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item._id} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: "white", transition: "background-color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}>
                    <td style={{ padding: "14px 16px", fontSize: "0.9rem", fontWeight: "600", color: "#1e293b" }}>
                      {getPreviewText(item.document)}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700", backgroundColor: "#f1f5f9", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", border: "1px solid #e2e8f0" }}>
                        <Database size={12} />
                        {item.originalCollection}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569", fontWeight: "500" }}>
                        {item.deletedBy ? (
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: "600", color: "#1e293b" }}>{item.deletedBy.name}</span>
                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.deletedBy.role}</span>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontStyle: "italic" }}>System / Unknown</span>
                        )}
                      </td>
                    )}
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#64748b", fontWeight: "500" }}>
                      {new Date(item.deletedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "600", backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                        <Calendar size={12} />
                        {Math.ceil((new Date(item.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))} days
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                        <button
                          onClick={() => handleRestore(item._id, item.originalCollection)}
                          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", backgroundColor: "#ecfdf5", color: "#10b981", border: "1px solid #a7f3d0", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", transition: "all 0.2s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#d1fae5"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#ecfdf5"; }}
                          title="Restore Item"
                        >
                          <RotateCcw size={14} />
                          Restore
                        </button>
                        <button
                          onClick={() => handleForceDelete(item._id)}
                          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", backgroundColor: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", transition: "all 0.2s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fee2e2"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fef2f2"; }}
                          title="Permanently Delete"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Trash;
