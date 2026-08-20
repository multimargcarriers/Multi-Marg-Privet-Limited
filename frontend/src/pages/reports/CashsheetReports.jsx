import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Search, Download, Trash2, FileSpreadsheet, IndianRupee, PieChart } from "lucide-react";
import Table from "../../components/Table";
import { formatDate } from "../../utils/formatters";
import { useDialog } from "../../context/DialogContext";
import RupeeIcon from "../../components/RupeeIcon";
import ExportModal from "../../components/ExportModal";
import { exportCashSheetList } from "../../utils/excelExport";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const CashsheetReports = () => {
  const { confirm } = useDialog();
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [filters, setFilters] = useState({ fr: "", to: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  // Selection State
  const [selectedCashIds, setSelectedCashIds] = useState([]);

  const handleToggleSelectCash = (id) => {
    if (id === undefined || id === null) return;
    setSelectedCashIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleExport = () => {
    if (data.length === 0) return;
    setShowExportModal(true);
  };

  const handleExecuteExport = async ({ format }) => {
    try {
      setIsExporting(true);
      let dataToExport = data;
      if (selectedCashIds.length > 0) {
        dataToExport = data.filter((b, idx) => selectedCashIds.includes(b.id || b._id || idx));
      }
      await exportCashSheetList({
        entries: dataToExport,
        format,
        dateRange: { startDate: filters.fr, endDate: filters.to },
      });
      setShowExportModal(false);
    } catch (err) {
      console.error("Export error", err);
    } finally {
      setIsExporting(false);
    }
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
              type="submit" 
              className="btn btn-primary" 
              style={{ padding: "0.65rem 1.5rem", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, border: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white" }}
            >
              <Search size={16} /> Filter Data
            </button>
            <button 
              type="button" 
              onClick={handleExport} 
              className="btn btn-secondary" 
              style={{ padding: "0.65rem 1.5rem", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", color: "#334155" }}
            >
              <Download size={16} /> Export
            </button>
          </div>
        </div>
      </form>

      {/* METRIC CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "white", padding: "1.5rem", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#64748b", fontSize: "0.85rem", fontWeight: 600 }}>Total Cash In</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#16a34a", marginTop: "0.5rem", display: "flex", alignItems: "center" }}>
                <RupeeIcon size={20} />&nbsp;{stats.totalCashIn.toFixed(2)}
              </div>
            </div>
            <div style={{ background: "#dcfce7", padding: "12px", borderRadius: "12px" }}>
              <IndianRupee size={24} color="#16a34a" />
            </div>
          </div>
        </div>

        <div style={{ background: "white", padding: "1.5rem", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#64748b", fontSize: "0.85rem", fontWeight: 600 }}>Total Cash Out</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ef4444", marginTop: "0.5rem", display: "flex", alignItems: "center" }}>
                <RupeeIcon size={20} />&nbsp;{stats.totalCashOut.toFixed(2)}
              </div>
            </div>
            <div style={{ background: "#fee2e2", padding: "12px", borderRadius: "12px" }}>
              <IndianRupee size={24} color="#ef4444" />
            </div>
          </div>
        </div>

        <div style={{ background: "white", padding: "1.5rem", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#64748b", fontSize: "0.85rem", fontWeight: 600 }}>Net Balance</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: stats.netBalance >= 0 ? "#0f172a" : "#ef4444", marginTop: "0.5rem", display: "flex", alignItems: "center" }}>
                <RupeeIcon size={20} />&nbsp;{stats.netBalance.toFixed(2)}
              </div>
            </div>
            <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "12px" }}>
              <PieChart size={24} color="#475569" />
            </div>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)" }}>
        <Table 
          loading={loading}
          data={data}
          headers={[
            <div key="select-all-cash-rep" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <input
                type="checkbox"
                checked={data.length > 0 && data.every((b, idx) => selectedCashIds.includes(b.id || b._id || idx))}
                onChange={() => {
                  const visibleIds = data.map((b, idx) => b.id || b._id || idx);
                  const allSelected = visibleIds.every(id => selectedCashIds.includes(id));
                  if (allSelected) {
                    setSelectedCashIds(prev => prev.filter(id => !visibleIds.includes(id)));
                  } else {
                    setSelectedCashIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                  }
                }}
                style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#16a34a" }}
                title="Toggle Select All"
              />
            </div>,
            "Date", "Party Name", "Remarks", "Cash In (₹)", "Cash Out (₹)", "Actions"
          ]}
          renderRow={(item, index) => {
            const itemId = item.id || item._id || index;
            const isSelected = selectedCashIds.includes(itemId);
            return (
            <tr key={index} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "0.9rem", backgroundColor: isSelected ? "rgba(22, 163, 74, 0.08)" : undefined }}>
              <td style={{ width: "40px", textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleSelectCash(itemId)}
                  style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#16a34a" }}
                />
              </td>
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
            );
          }}
        />
      </div>

      {/* Unified Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Cash Sheet Report"
        itemCount={selectedCashIds.length > 0 ? selectedCashIds.length : data.length}
        subtitle={selectedCashIds.length > 0 ? `Exporting ${selectedCashIds.length} selected cash entry(ies)` : `Exporting all ${data.length} cash entries`}
        isExporting={isExporting}
        onExport={handleExecuteExport}
      />
    </div>
  );
};

export default CashsheetReports;
