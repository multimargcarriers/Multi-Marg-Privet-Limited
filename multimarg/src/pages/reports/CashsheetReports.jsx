import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Search, Download,  Trash2, FileSpreadsheet, IndianRupee, PieChart } from "lucide-react";
import Table from "../../components/Table";
import { formatDate } from "../../utils/formatters";
import { useDialog } from "../../context/DialogContext";
import RupeeIcon from "../../components/RupeeIcon";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const CashsheetReports = () => {
  const { confirm } = useDialog();
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [filters, setFilters] = useState({ fr: "", to: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCash();
  }, []);

  const fetchCash = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/cash`);
      if (res.data.success) {
        let entries = res.data.data || [];
        setAllData(entries);
        applyFilters(entries, filters, searchQuery);
      }
    } catch (err) {
      console.error("Fetch cash error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchFilter = (e) => {
    if (e) e.preventDefault();
    applyFilters(allData, filters, searchQuery);
  };

  const handleSearchBoxChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    applyFilters(allData, filters, val);
  };

  const applyFilters = (entries, currentFilters, query) => {
    let filtered = [...entries];

    if (currentFilters.fr) {
      filtered = filtered.filter(e => new Date(e.date) >= new Date(currentFilters.fr));
    }
    if (currentFilters.to) {
      filtered = filtered.filter(e => new Date(e.date) <= new Date(currentFilters.to));
    }
    if (query) {
      const lowerQ = query.toLowerCase();
      filtered = filtered.filter(e => 
        (e.remarks || "").toLowerCase().includes(lowerQ) ||
        (e.partyName || "").toLowerCase().includes(lowerQ) ||
        (e.amount?.toString() || "").includes(lowerQ)
      );
    }

    setData(filtered);
  };

  const handleExport = () => {
    if (data.length === 0) return;
    const headers = ["Date", "Party", "Type", "Amount", "Remarks"];
    const csvContent = [
      headers.join(","),
      ...data.map(row => {
        const dateStr = row.date ? formatDate(row.date) : "";
        return [
          `"${dateStr}"`,
          `"${row.partyName || ""}"`,
          `"${row.type || ""}"`,
          parseFloat(row.amount || 0).toFixed(2),
          `"${row.remarks || ""}"`
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Cashsheet_Report.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Cash Entry",
      message: "Are you sure you want to delete this cash entry?",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    try {
      await axios.delete(`${API}/cash/${id}`);
      fetchCash();
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  // Calculations
  const stats = useMemo(() => {
    const totalCashIn = data.reduce((sum, item) => (item.type === "in" || item.type === "income") ? sum + parseFloat(item.amount || 0) : sum, 0);
    const totalCashOut = data.reduce((sum, item) => (item.type === "out" || item.type === "expense") ? sum + parseFloat(item.amount || 0) : sum, 0);
    const netBalance = totalCashIn - totalCashOut;
    return { totalCashIn, totalCashOut, netBalance };
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
          <div style={{ background: "#ecfdf5", padding: "8px", borderRadius: "10px", display: "flex" }}>
            <FileSpreadsheet size={22} style={{ color: "#10b981" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, color: "#0f172a" }}>
              Cash Sheet Report
            </h3>
            <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 500 }}>
              Analyze cash flow, income, and expenses over time
            </span>
          </div>
        </div>
      </div>

      {/* SEARCH FORM */}
      <form onSubmit={handleSearchFilter} style={{
          backgroundColor: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          marginBottom: "1.5rem",
          overflow: "hidden"
      }}>
        <div style={{ background: "linear-gradient(90deg, #10b981 0%, #059669 50%, #047857 100%)", height: "4px", width: "100%" }} />
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
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Search Keyword</label>
              <input 
                type="text" 
                placeholder="Search Title, Remarks..."
                value={searchQuery}
                onChange={handleSearchBoxChange}
                style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
              />
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
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
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
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
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
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Cash In</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#16a34a", marginTop: "4px", display: "flex", alignItems: "center" }}>
               <RupeeIcon size={24} /> {stats.totalCashIn.toFixed(2)}
            </div>
          </div>
          <div style={{ background: "#dcfce7", padding: "12px", borderRadius: "12px" }}><IndianRupee size={24} color="#16a34a" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Cash Out</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#ef4444", marginTop: "4px", display: "flex", alignItems: "center" }}>
               <RupeeIcon size={24} /> {stats.totalCashOut.toFixed(2)}
            </div>
          </div>
          <div style={{ background: "#fee2e2", padding: "12px", borderRadius: "12px" }}><IndianRupee size={24} color="#ef4444" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Net Balance</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: stats.netBalance >= 0 ? "#0f172a" : "#ef4444", marginTop: "4px", display: "flex", alignItems: "center" }}>
               <RupeeIcon size={24} /> {stats.netBalance.toFixed(2)}
            </div>
          </div>
          <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "12px" }}><PieChart size={24} color="#64748b" /></div>
        </div>
      </div>

      {/* TABLE */}
      <div style={{ background: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>CASH ENTRIES</div>
        </div>

        <Table
          loading={loading}
          pagination={true}
          headers={["#", "Date", "Party", "Particulars", "Cash In", "Cash Out", "Delete"]}
          data={data}
          renderRow={(item, idx) => (
            <tr key={item.id || idx} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "0.9rem" }}>
              <td style={{ padding: "1rem", fontWeight: 600, color: "#64748b" }}>{idx + 1}</td>
              <td style={{ padding: "1rem", color: "#475569" }}>{item.date ? formatDate(item.date) : "-"}</td>
              <td style={{ padding: "1rem" }}>
                <div style={{ fontWeight: 600, color: "#0f172a", textTransform: "uppercase" }}>{item.partyName || "—"}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.partyType || "Other"}</div>
              </td>
              <td style={{ padding: "1rem", color: "#0f172a", textTransform: "uppercase", fontWeight: 500 }}>{item.remarks || "-"}</td>
              <td style={{ padding: "1rem", color: "#16a34a", fontWeight: 600 }}>
                {(item.type === "in" || item.type === "income") ? parseFloat(item.amount || 0).toFixed(2) : ""}
              </td>
              <td style={{ padding: "1rem", color: "#ef4444", fontWeight: 600 }}>
                {(item.type === "out" || item.type === "expense") ? parseFloat(item.amount || 0).toFixed(2) : ""}
              </td>
              <td style={{ padding: "1rem" }}>
                <button 
                  onClick={() => handleDelete(item.id)}
                  style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                  title="Delete Entry"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          )}
        />
      </div>
    </div>
  );
};

export default CashsheetReports;
