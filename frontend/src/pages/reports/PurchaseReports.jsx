import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Table from "../../components/Table";
import { Search, Download, ShoppingCart, IndianRupee, PieChart, Users, Calendar } from "lucide-react";
import RupeeIcon from "../../components/RupeeIcon";
import { formatDate } from "../../utils/formatters";

const PurchaseReports = () => {
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [filters, setFilters] = useState({ search: "", fr: "", to: "" });
  const [loading, setLoading] = useState(false);

  const _handleSearch = (e) => {
    if (e) e.preventDefault();
    fetchData(); // Refetch or refilter based on requirements, but wait, data is fetched once. Let's filter locally if possible, or refetch. Actually, we should refilter locally if we already have the raw data.
  };

  const fetchAndFilter = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/purchases`);
      let purchases = res.data.success ? (res.data.data || []) : [];

      if (filters.fr) {
        purchases = purchases.filter(p => new Date(p.date || p.createdAt) >= new Date(filters.fr));
      }
      if (filters.to) {
        purchases = purchases.filter(p => new Date(p.date || p.createdAt) <= new Date(filters.to));
      }

      purchases.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

      if (filters.search) {
        const lowerSearch = filters.search.toLowerCase();
        purchases = purchases.filter(item => 
          (item.vendor || "").toLowerCase().includes(lowerSearch) ||
          (item.billNo || "").toLowerCase().includes(lowerSearch)
        );
      }

      setAllData(purchases);
      setData(purchases);
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndFilter();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchAndFilter();
  };

  const handleExport = () => {
    if (data.length === 0) return;
    const headers = ["Date", "Vendor", "Bill No", "Taxable", "GST", "Total", "Paid", "Balance", "Status"];
    const csvContent = [
      headers.join(","),
      ...data.map(row => {
        const dateStr = row.date ? formatDate(row.date) : (row.createdAt ? formatDate(row.createdAt) : "");
        const balance = Math.max(0, parseFloat(row.total || 0) - parseFloat(row.paidAmount || 0));
        return [
          `"${dateStr}"`,
          `"${row.vendor || ""}"`,
          `"${row.billNo || ""}"`,
          parseFloat(row.taxable || 0).toFixed(2),
          parseFloat(row.gst || 0).toFixed(2),
          parseFloat(row.total || 0).toFixed(2),
          parseFloat(row.paidAmount || 0).toFixed(2),
          balance.toFixed(2),
          `"${row.status || ""}"`
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Purchase_Bills_Report.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const stats = useMemo(() => {
    const uniqueVendors = new Set(allData.map(item => item.vendor));
    const totalVendors = uniqueVendors.size;
    const totalPurchases = allData.reduce((s, item) => s + parseFloat(item.total || 0), 0);
    const totalOutstanding = allData.reduce((s, item) => s + Math.max(0, parseFloat(item.total || 0) - parseFloat(item.paidAmount || 0)), 0);
    return { totalVendors, totalPurchases, totalOutstanding };
  }, [allData]);

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "20px" }}>
      {/* HEADER BAR */}
      <div 
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "1rem 1.5rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ background: "#f5f3ff", padding: "8px", borderRadius: "10px", display: "flex" }}>
            <ShoppingCart size={22} style={{ color: "#8b5cf6" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, color: "#0f172a" }}>
              Purchase & Vendor Report
            </h3>
            <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 500 }}>
              Monitor purchase expenses and track outstanding vendor balances
            </span>
          </div>
        </div>
      </div>

      {/* SEARCH FORM */}
      <form onSubmit={handleFilterSubmit} style={{
          backgroundColor: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          marginBottom: "1.5rem",
          overflow: "hidden"
      }}>
        <div style={{ background: "linear-gradient(90deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)", height: "4px", width: "100%" }} />
        <div style={{ padding: "1.5rem 1.75rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>From Date</label>
              <input 
                type="date" min="1947-01-01" max="2200-12-31" 
                value={filters.fr} 
                onChange={(e) => setFilters({ ...filters, fr: e.target.value })} 
                style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>To Date</label>
              <input 
                type="date" min="1947-01-01" max="2200-12-31" 
                value={filters.to} 
                onChange={(e) => setFilters({ ...filters, to: e.target.value })} 
                style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Search Vendor Name</label>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input 
                  type="text" 
                  placeholder="Type vendor name..." 
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  style={{ width: "100%", padding: "0.65rem 0.65rem 0.65rem 2.25rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>
          </div>
          
          <div className="responsive-btn-group" style={{ marginTop: "1.5rem" }}>
            <button 
              type="button" 
              onClick={handleExport}
              disabled={data.length === 0}
              style={{
                backgroundColor: "#e2e8f0",
                color: "#475569",
                border: "none",
                padding: "0.65rem 1.5rem",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: data.length === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: data.length === 0 ? 0.5 : 1
              }}
            >
              <Download size={16} /> EXPORT CSV
            </button>
            <button 
              type="submit" 
              style={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                color: "white",
                border: "none",
                padding: "0.65rem 2.5rem",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(139, 92, 246, 0.25)",
                height: "41px"
              }}
            >
              <Search size={16} /> FILTER REPORT
            </button>
          </div>
        </div>
      </form>

      {/* STATS CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Active Vendors</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", marginTop: "4px", display: "flex", alignItems: "center" }}>
               {stats.totalVendors}
            </div>
          </div>
          <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "12px" }}><Users size={24} color="#64748b" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Purchase Value</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#8b5cf6", marginTop: "4px", display: "flex", alignItems: "center" }}>
               {formatCurrency(stats.totalPurchases)}
            </div>
          </div>
          <div style={{ background: "#ede9fe", padding: "12px", borderRadius: "12px" }}><IndianRupee size={24} color="#8b5cf6" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Outstanding</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#ef4444", marginTop: "4px", display: "flex", alignItems: "center" }}>
               {formatCurrency(stats.totalOutstanding)}
            </div>
          </div>
          <div style={{ background: "#fee2e2", padding: "12px", borderRadius: "12px" }}><PieChart size={24} color="#ef4444" /></div>
        </div>
      </div>

      {/* TABLE */}
      <div style={{ background: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <div style={{ padding: "1rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
          <div style={{ position: "relative", minWidth: "200px", flex: "0 1 300px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input 
              type="text" 
              placeholder="Quick search vendors..."
              onChange={(e) => {
                const lowerQ = e.target.value.toLowerCase();
                if (lowerQ) {
                  setData(allData.filter(i => (i.vendor || "").toLowerCase().includes(lowerQ) || (i.billNo || "").toLowerCase().includes(lowerQ)));
                } else {
                  setData(allData);
                }
              }}
              style={{ padding: "0.45rem 0.45rem 0.45rem 2rem", borderRadius: "6px", border: "1px solid #cbd5e1", width: "100%", fontSize: "0.85rem", outline: "none" }}
            />
          </div>
        </div>

        <Table
          headers={["Date", "Vendor", "Bill No", "Taxable/GST", "Total", "Paid", "Balance", "Status"]}
          data={data}
          loading={loading}
          pagination={true}
          renderRow={(item, index) => {
            const balance = Math.max(0, parseFloat(item.total || 0) - parseFloat(item.paidAmount || 0));
            return (
              <tr key={index} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "0.9rem" }}>
                <td style={{ padding: "1rem", color: "#475569" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Calendar size={14} /> {item.date ? formatDate(item.date) : (item.createdAt ? formatDate(item.createdAt) : "-")}
                  </div>
                </td>
                
                <td style={{ padding: "1rem", fontWeight: 600, color: "#334155" }}>
                  {item.vendor || "-"}
                </td>

                <td style={{ padding: "1rem", color: "#0f172a" }}>
                  {item.billNo || "-"}
                </td>

                <td style={{ padding: "1rem", color: "#475569" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
                    <span style={{ fontSize: "0.9rem", color: "#0f172a" }}>
                       <RupeeIcon size={12}/>{parseFloat(item.taxable || 0).toFixed(2)}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#f59e0b", fontWeight: 600 }}>
                       + <RupeeIcon size={10}/>{parseFloat(item.gst || 0).toFixed(2)} GST
                    </span>
                  </div>
                </td>

                <td style={{ padding: "1rem", fontWeight: 700, color: "#8b5cf6" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <RupeeIcon size={14} /> {parseFloat(item.total || 0).toFixed(2)}
                  </div>
                </td>

                <td style={{ padding: "1rem", color: "#10b981", fontWeight: 600 }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <RupeeIcon size={14} /> {parseFloat(item.paidAmount || 0).toFixed(2)}
                  </div>
                </td>

                <td style={{ padding: "1rem", color: "#ef4444", fontWeight: 700 }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <RupeeIcon size={14} /> {balance.toFixed(2)}
                  </div>
                </td>

                <td style={{ padding: "1rem" }}>
                  {(() => {
                    const total = parseFloat(item.total || 0);
                    const paid = parseFloat(item.paidAmount || 0);
                    let status = item.status || "Unpaid";
                    if (paid >= total && total > 0) status = "Paid";
                    else if (paid > 0 && paid < total) status = "Partial";
                    else if (paid === 0) status = "Unpaid";

                    if (status === 'Paid') {
                      return <span style={{ background: '#d1fae5', color: '#047857', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Paid</span>;
                    } else if (status === 'Partial') {
                      return <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Partial</span>;
                    } else {
                      return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Unpaid</span>;
                    }
                  })()}
                </td>
              </tr>
            );
          }}
        />
      </div>
    </div>
  );
};

export default PurchaseReports;
