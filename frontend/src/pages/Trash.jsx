import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  Search,
  Filter,
  AlertCircle,
  Database,
  Calendar
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

  const getPreviewText = (doc) => {
    if (!doc) return "Unknown Data";
    if (doc.name) return doc.name;
    if (doc.lrNumber) return `LR: ${doc.lrNumber}`;
    if (doc.billNo) return `Bill: ${doc.billNo}`;
    if (doc.tripNo) return `Trip: ${doc.tripNo}`;
    return doc.id || "Document";
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = getPreviewText(item.document).toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

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
        {/* Toolbar */}
        <div style={{ padding: "1.25rem", borderBottom: "1px solid #e2e8f0", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyItems: "space-between" }}>
          
          <div className="search-wrapper" style={{ flex: "1 1 300px", position: "relative" }}>
            <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", width: "18px", height: "18px" }} />
            <input
              type="text"
              placeholder="Search deleted items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "0.5rem 1rem 0.5rem 2.2rem", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", fontSize: "0.9rem" }}
            />
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginLeft: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600" }}>From:</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: "0.4rem 0.8rem", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", fontSize: "0.9rem", color: "#475569" }}
              />
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600" }}>To:</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: "0.4rem 0.8rem", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", fontSize: "0.9rem", color: "#475569" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Filter style={{ color: "#94a3b8", width: "18px", height: "18px" }} />
              <select
                value={collectionFilter}
                onChange={(e) => setCollectionFilter(e.target.value)}
                style={{ padding: "0.45rem 1rem", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "#fff", fontSize: "0.9rem", outline: "none", color: "#475569", minWidth: "150px" }}
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
