import React, { useState, useEffect, useContext } from "react";

import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import {
  FileText, Search, Trash2, CheckCircle, Clock, TrendingUp,
RefreshCw,
  ChevronLeft, ChevronRight, AlertCircle, Filter
} from "lucide-react";
import axios from "axios";
import StatsPanel from "../components/StatsPanel";
import SortDropdown from "../components/SortDropdown";
import useTableSort from "../hooks/useTableSort";

const Quotes = () => {
  const { token } = useContext(AuthContext);
  const { confirm } = useDialog();
  const [quotes, setQuotes] = useState([]);
  const [stats, setStats] = useState({ total: 0, estimated: 0, proceeded: 0, todayCount: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/quotes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setQuotes(res.data.data);
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch quotes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Quote",
      message: "Are you sure you want to delete this quote?",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    try {
      await axios.delete(`${API}/api/quotes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchQuotes();
    } catch (err) {
      console.error("Failed to delete quote:", err);
    }
  };

  // Filter and search
  const filtered = quotes.filter((q) => {
    const matchesSearch =
      !searchQuery ||
      q.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.phone?.includes(searchQuery) ||
      q.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.quoteRef?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.originDistrict?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.destinationDistrict?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || q.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const { sortedData, sortOption, setSortOption } = useTableSort(filtered, "newest", { nameKey: "name", amountKey: "id" }); // No amount in quotes, use id as fallback

  const totalPages = Math.ceil(sortedData.length / entriesPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statCards = [
    { label: "Total Quotes", value: stats.total, icon: FileText, color: "blue" },
    { label: "Estimated", value: stats.estimated, icon: Clock, color: "orange" },
    { label: "Proceeded", value: stats.proceeded, icon: CheckCircle, color: "green" },
    { label: "Today", value: stats.todayCount, icon: TrendingUp, color: "purple" },
  ];

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="header-flex" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-color)", margin: 0 }}>
            Quote Requests
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "0.25rem" }}>
            All quote enquiries from the public website
          </p>
        </div>
        <div className="page-header-actions">
          <button onClick={fetchQuotes} className="page-header-btn">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsPanel stats={statCards} />

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
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="premium-search-input"
              placeholder="Name, phone, ref..."
            />
          </div>

          <div className="premium-filter-group">
            <Filter size={16} color="#64748b" style={{ marginLeft: "4px" }} />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="premium-filter-input"
              style={{ cursor: "pointer" }}
            >
              <option value="all">All Status</option>
              <option value="estimated">Estimated</option>
              <option value="proceeded">Proceeded</option>
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
              onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
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
                  <th style={{ padding: "12px", fontSize: "0.8rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Ref</th>
                  <th style={{ padding: "12px", fontSize: "0.8rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Name</th>
                  <th style={{ padding: "12px", fontSize: "0.8rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Phone</th>
                  <th style={{ padding: "12px", fontSize: "0.8rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Origin → Dest</th>
                  <th style={{ padding: "12px", fontSize: "0.8rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Mode</th>
                  <th style={{ padding: "12px", fontSize: "0.8rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Weight</th>
                  <th style={{ padding: "12px", fontSize: "0.8rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Amount</th>
                  <th style={{ padding: "12px", fontSize: "0.8rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Status</th>
                  <th style={{ padding: "12px", fontSize: "0.8rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Date</th>
                  <th style={{ padding: "12px", fontSize: "0.8rem", color: "#475569", fontWeight: "600" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" style={{ padding: "3rem", color: "#64748b" }}>Loading quotes...</td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ padding: "3rem", color: "#64748b" }}>
                      <AlertCircle size={32} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
                      <br />No quote requests found.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((q, idx) => (
                    <tr
                      key={q.id}
                      style={{
                        borderBottom: "1px solid #e2e8f0",
                        backgroundColor: idx % 2 === 0 ? "white" : "#fafbfc",
                        transition: "background-color 0.2s",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "white" : "#fafbfc")}
                    >
                      <td style={{ padding: "10px", fontSize: "0.8rem", color: "#4F46E5", fontWeight: "600" }}>{q.quoteRef || "-"}</td>
                      <td style={{ padding: "10px", fontSize: "0.8rem", fontWeight: "600" }}>
                        {q.name || "-"}
                        {q.email && <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "400" }}>{q.email}</div>}
                      </td>
                      <td style={{ padding: "10px", fontSize: "0.8rem" }}>{q.phone || "-"}</td>
                      <td style={{ padding: "10px", fontSize: "0.75rem", textTransform: "uppercase" }}>
                        <span style={{ color: "#4F46E5" }}>{q.originDistrict}</span>
                        <span style={{ color: "#94a3b8", margin: "0 4px" }}>→</span>
                        <span style={{ color: "#ef4444" }}>{q.destinationDistrict}</span>
                        <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{q.distanceKm} km</div>
                      </td>
                      <td style={{ padding: "10px", fontSize: "0.75rem" }}>{q.transportMode || "-"}</td>
                      <td style={{ padding: "10px", fontSize: "0.8rem" }}>{q.chargeableWeight || q.weight} kg</td>
                      <td style={{ padding: "10px", fontSize: "0.85rem", fontWeight: "700", color: "#0f172a" }}>₹{(q.estimatedAmount || 0).toLocaleString("en-IN")}</td>
                      <td style={{ padding: "10px" }}>
                        {q.status === "proceeded" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", background: "rgba(16, 185, 129, 0.1)", color: "#059669", fontSize: "0.75rem", fontWeight: "700" }}>
                            <CheckCircle size={14} /> PROCEEDED
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", background: "rgba(245, 158, 11, 0.1)", color: "#d97706", fontSize: "0.75rem", fontWeight: "700" }}>
                            <Clock size={14} /> ESTIMATED
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px", fontSize: "0.75rem", color: "#64748b" }}>{formatDate(q.createdAt)}</td>
                      <td style={{ padding: "10px" }}>
                        <button
                          onClick={() => handleDelete(q.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "4px" }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0", flexWrap: "wrap", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Showing {(currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, filtered.length)} of {filtered.length} entries
            </span>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: "0.4rem 0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px", background: "white", cursor: currentPage === 1 ? "default" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      padding: "0.4rem 0.8rem",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      background: currentPage === pageNum ? "#4F46E5" : "white",
                      color: currentPage === pageNum ? "white" : "#0f172a",
                      cursor: "pointer",
                      fontWeight: currentPage === pageNum ? 700 : 400,
                      fontSize: "0.85rem"
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ padding: "0.4rem 0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px", background: "white", cursor: currentPage === totalPages ? "default" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quotes;
