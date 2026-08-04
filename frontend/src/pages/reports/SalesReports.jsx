import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Table from "../../components/Table";
import { Search, TrendingUp, IndianRupee, PieChart, FileText } from "lucide-react";
import RupeeIcon from '../../components/RupeeIcon';
import { formatDate } from "../../utils/formatters";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const SalesReports = () => {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({ fr: "", to: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchSales(); }, []);

  const fetchSales = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.get(`${API}/bills`);
      if (res.data.success) {
        let bills = res.data.data || [];
        
        if (filters.fr) {
          bills = bills.filter(b => new Date(b.createdAt) >= new Date(filters.fr));
        }
        if (filters.to) {
          bills = bills.filter(b => new Date(b.createdAt) <= new Date(filters.to));
        }
        
        setData(bills);
      }
    } catch (err) { console.error("Fetch sales error", err); }
    finally { setLoading(false); }
  };

  const stats = useMemo(() => {
    const totalInvoices = data.length;
    const totalTaxable = data.reduce((s, b) => s + parseFloat(b.taxable || b.amount || 0), 0);
    const totalSales = data.reduce((s, b) => s + parseFloat(b.total || b.amount || 0), 0);
    return { totalInvoices, totalTaxable, totalSales };
  }, [data]);

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
          <div style={{ background: "#eff6ff", padding: "8px", borderRadius: "10px", display: "flex" }}>
            <TrendingUp size={22} style={{ color: "#3b82f6" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, color: "#0f172a" }}>
              Sales & Invoice Report
            </h3>
            <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 500 }}>
              Track revenue, generated invoices, and payment statuses
            </span>
          </div>
        </div>
      </div>

      {/* SEARCH FORM */}
      <form onSubmit={fetchSales} style={{
          backgroundColor: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          marginBottom: "1.5rem",
          overflow: "hidden"
      }}>
        <div style={{ background: "linear-gradient(90deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)", height: "4px", width: "100%" }} />
        <div style={{ padding: "1.5rem 1.75rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
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
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button 
                type="submit" 
                style={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  color: "white",
                  border: "none",
                  padding: "0.65rem 2rem",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.25)",
                  height: "41px",
                  width: "100%",
                  justifyContent: "center"
                }}
              >
                <Search size={16} /> SEARCH SALES
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* STATS CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Invoices Generated</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", marginTop: "4px", display: "flex", alignItems: "center" }}>
               {stats.totalInvoices}
            </div>
          </div>
          <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "12px" }}><FileText size={24} color="#64748b" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Taxable Value</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#6366f1", marginTop: "4px", display: "flex", alignItems: "center" }}>
               <RupeeIcon size={24} /> {stats.totalTaxable.toFixed(2)}
            </div>
          </div>
          <div style={{ background: "#e0e7ff", padding: "12px", borderRadius: "12px" }}><PieChart size={24} color="#6366f1" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Gross Sales</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#3b82f6", marginTop: "4px", display: "flex", alignItems: "center" }}>
               <RupeeIcon size={24} /> {stats.totalSales.toFixed(2)}
            </div>
          </div>
          <div style={{ background: "#dbeafe", padding: "12px", borderRadius: "12px" }}><IndianRupee size={24} color="#3b82f6" /></div>
        </div>
      </div>

      {/* TABLE */}
      <div style={{ background: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <Table
          loading={loading}
          pagination={true}
          headers={["Invoice No", "Date", "Client", "LR No", "Status", "Taxable", "Total"]}
          data={data}
          renderRow={(item, index) => (
            <tr key={index} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "0.9rem" }}>
              <td style={{ padding: "1rem", fontWeight: 600, color: "#3b82f6" }}>{item.billNo || "-"}</td>
              <td style={{ padding: "1rem", color: "#475569" }}>{item.createdAt ? formatDate(item.createdAt) : "-"}</td>
              <td style={{ padding: "1rem", fontWeight: 600, color: "#334155" }}>{item.client || "-"}</td>
              <td style={{ padding: "1rem", color: "#475569" }}>{item.lrNo || "-"}</td>
              <td style={{ padding: "1rem" }}>
                 <span style={{
                    padding: "0.35rem 0.85rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700",
                    background: item.status === "paid" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)", 
                    color: item.status === "paid" ? "#10b981" : "#f59e0b"
                 }}>
                   {item.status ? item.status.toUpperCase() : "PENDING"}
                 </span>
              </td>
              <td style={{ padding: "1rem", color: "#64748b" }}>
                <span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}><RupeeIcon size={14} />&nbsp;{parseFloat(item.taxable || item.amount || 0).toFixed(2)}</span>
              </td>
              <td style={{ padding: "1rem", fontWeight: "700", color: "#0f172a" }}>
                <span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}><RupeeIcon size={14} />&nbsp;{parseFloat(item.total || item.amount || 0).toFixed(2)}</span>
              </td>
            </tr>
          )}
        />
      </div>
    </div>
  );
};

export default SalesReports;
