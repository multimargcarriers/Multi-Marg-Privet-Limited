import React, { useState, useEffect, useContext, useMemo } from "react";
import axios from "axios";
import Table from "../components/Table";
import { Eye, FileText, Search, Download, Trash2, Edit3, Upload, Filter, TrendingUp, TrendingDown, Wallet, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { useToast } from "../context/ToastContext";
import { SettingsContext } from "../context/SettingsContext";
import { useSocketSync } from "../hooks/useSocketSync";
import RupeeIcon from '../components/RupeeIcon';
import { formatDate } from '../utils/formatters';
import StatsPanel from "../components/StatsPanel";
import SortDropdown from "../components/SortDropdown";
import useTableSort from "../hooks/useTableSort";

const AllBills = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const { addToast } = useToast();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [minPending, setMinPending] = useState("");
  const [maxPending, setMaxPending] = useState("");
  const navigate = useNavigate();
  const { globalSettings } = useContext(SettingsContext);
  const enableCsvImport = globalSettings?.integrations?.enableCsvImport !== false;

  useEffect(() => { fetchBills(); }, []);

  const fetchBills = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills`);
      if (res.data.success) setBills(res.data.data || []);
    } catch (err) { console.error("Fetch bills error", err); }
  };

  useSocketSync("bills", fetchBills);

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Bill",
      message: "Are you sure you want to delete this bill? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    setBills(prev => prev.filter(b => b.id !== id));
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills/${id}`);
      addToast("Bill deleted successfully", "success");
    } catch (err) {
      console.error("Delete bill error", err);
      addToast("Failed to delete bill", "error");
      fetchBills();
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills/${id}`, { status: newStatus });
      setBills(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
      addToast("Status updated successfully", "success");
    } catch (err) {
      console.error("Update status error", err);
      addToast("Failed to update status", "error");
    }
  };

  const filtered = useMemo(() => {
    return bills.filter(b => {
      // Search text filter
      if (search) {
        const query = search.toLowerCase();
        const invoiceMatch = (b.invoice || b.billNo || "").toLowerCase().includes(query);
        const clientMatch = (b.client || b.billedTo || "").toLowerCase().includes(query);
        if (!invoiceMatch && !clientMatch) return false;
      }
      
      // Status filter
      if (filterStatus !== "All") {
        const currentStatus = (b.status || "pending").toLowerCase();
        if (currentStatus !== filterStatus.toLowerCase()) return false;
      }
      
      // Date filter
      if (fromDate || toDate) {
        const bDate = b.createdAt ? new Date(b.createdAt) : null;
        if (bDate) {
          if (fromDate && bDate < new Date(fromDate)) return false;
          if (toDate) {
            const tDate = new Date(toDate);
            tDate.setHours(23, 59, 59, 999);
            if (bDate > tDate) return false;
          }
        } else {
          return false;
        }
      }

      // Pending Amount filter
      const amt = parseFloat(b.amount || b.total || 0);
      const rec = parseFloat(b.paidAmount || 0);
      const pendingAmount = amt - rec;

      if (minPending !== "" && pendingAmount < parseFloat(minPending)) return false;
      if (maxPending !== "" && pendingAmount > parseFloat(maxPending)) return false;

      return true;
    });
  }, [bills, search, filterStatus, fromDate, toDate, minPending, maxPending]);

  const { sortedData, sortOption, setSortOption } = useTableSort(filtered, "newest", { nameKey: "client", amountKey: "amount" });

  const stats = useMemo(() => {
    let totalBilled = 0;
    let totalReceived = 0;
    let totalPending = 0;
    let countPaid = 0;
    let countPending = 0;
    
    filtered.forEach(b => {
      const amt = parseFloat(b.amount || b.total || 0);
      const rec = parseFloat(b.paidAmount || 0);
      totalBilled += amt;
      totalReceived += rec;
      totalPending += (amt - rec);
      
      const status = (b.status || "pending").toLowerCase();
      if (status === "paid") countPaid++;
      else if (status === "pending") countPending++;
    });
    
    return { totalBilled, totalReceived, totalPending, countPaid, countPending };
  }, [filtered]);

  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills/import`, { items: results.data });
          if (res.data.success) {
            addToast(res.data.message || "Bills imported successfully", "success");
            fetchBills();
          }
        } catch (error) {
          console.error("Import error", error);
          addToast("Failed to import bills", "error");
        }
      },
      error: (error) => {
        console.error("CSV parse error", error);
        addToast("Error parsing CSV file", "error");
      }
    });
    event.target.value = null; // reset
  };

  const downloadSampleCSV = () => {
    const sampleHeaders = "invoice,invoice_date,client,origin,destination,mode,awb,awb_date,box,weight,rate,frieght,awb_charge,pickup,delivery,special_delivery,other_charge,gst\n";
    const blob = new Blob([sampleHeaders], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bills_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    if (filtered.length === 0) {
      addToast("No data to export", "warning");
      return;
    }
    const exportData = filtered.map(b => ({
      "Bill No": b.invoice || b.billNo,
      "Client": b.client || b.billedTo,
      "Total Amt": parseFloat(b.amount || b.total || 0).toFixed(2),
      "Received": parseFloat(b.paidAmount || 0).toFixed(2),
      "Pending": (parseFloat(b.amount || b.total || 0) - parseFloat(b.paidAmount || 0)).toFixed(2),
      "Date": formatDate(b.invoice_date || b.date || b.createdAt),
      "Status": b.status
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bills_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ paddingBottom: "2rem" }}>
      <div className="header-flex" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "10px", color: "#0f172a" }}>
            Sales Bills 
            <span style={{ fontSize: "0.95rem", background: "#f1f5f9", color: "#475569", padding: "4px 12px", borderRadius: "20px", border: "1px solid #cbd5e1", fontWeight: "600", display: "flex", alignItems: "center" }}>
              {filtered.length} entries matching
            </span>
          </h3>
          <p className="text-muted">Comprehensive overview of all generated invoices, payments, and outstandings.</p>
        </div>
        <div className="page-header-actions">
          {enableCsvImport && (
            <>
              <button className="btn btn-secondary page-header-btn" onClick={downloadSampleCSV}>
                <Download size={16} /> Sample
              </button>
              <label className="btn btn-secondary page-header-btn" style={{ cursor: 'pointer' }}>
                <Upload size={16} /> Import
                <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />
              </label>
            </>
          )}
          <button className="btn btn-secondary page-header-btn" onClick={exportToCSV}>
            <Download size={16} /> Export
          </button>
          <button className="btn btn-secondary page-header-btn" onClick={() => navigate("/bills/misc")}>
            <FileText size={16} /> New Misc Bill
          </button>
          <button className="btn btn-primary page-header-btn page-header-btn-primary" onClick={() => navigate("/bills/generate")}>
            <FileText size={16} /> Generate New
          </button>
        </div>
      </div>

      {/* DASHBOARD STATS */}
      <StatsPanel stats={[
        { label: "Total Billed Value", value: "₹" + stats.totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), icon: Wallet, color: "blue" },
        { label: "Amount Received", value: "₹" + stats.totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), icon: TrendingUp, color: "green" },
        { label: "Outstanding Due", value: "₹" + stats.totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), icon: TrendingDown, color: "red" },
        { label: "Pending Invoices", value: stats.countPending, icon: AlertCircle, color: "orange" }
      ]} />

      {/* Filters */}
      <div className="premium-filter-toolbar">
        <div className="premium-filter-grid">
          
          <div className="premium-search-wrapper">
            <div className="premium-search-icon">
              <Search size={16} />
            </div>
            <input 
              type="text" 
              placeholder="Search by Bill No or Client Name..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="premium-search-input"
            />
          </div>

          <div className="premium-filter-group">
            <Filter size={16} color="#64748b" style={{ marginLeft: "4px" }} />
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="premium-filter-input"
              style={{ cursor: "pointer" }}
            >
              <option value="All">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="premium-filter-group">
            <span className="premium-filter-label">Date:</span>
            <input 
              type="date" 
              value={fromDate} 
              onChange={(e) => setFromDate(e.target.value)}
              className="premium-filter-input"
            />
            <span style={{ color: "#94a3b8" }}>-</span>
            <input 
              type="date" 
              value={toDate} 
              onChange={(e) => setToDate(e.target.value)}
              className="premium-filter-input"
            />
          </div>

          <div className="premium-filter-group">
            <span className="premium-filter-label">Pending Amount:</span>
            <input 
              type="number" 
              placeholder="Min" 
              value={minPending} 
              onChange={(e) => setMinPending(e.target.value)} 
              className="premium-filter-input"
              style={{ width: "70px" }}
            />
            <span style={{ color: "#94a3b8" }}>-</span>
            <input 
              type="number" 
              placeholder="Max" 
              value={maxPending} 
              onChange={(e) => setMaxPending(e.target.value)} 
              className="premium-filter-input"
              style={{ width: "70px" }}
            />
          </div>

          <SortDropdown 
            value={sortOption} 
            onChange={setSortOption} 
            options={["newest", "oldest", "amount_desc", "amount_asc", "az", "za"]} 
          />
        </div>

        {(search || filterStatus !== "All" || fromDate || toDate || minPending || maxPending || sortOption !== "newest") && (
          <button 
            onClick={() => { setSearch(""); setFilterStatus("All"); setFromDate(""); setToDate(""); setMinPending(""); setMaxPending(""); setSortOption("newest"); }}
            className="premium-clear-btn"
            style={{ alignSelf: "flex-end" }}
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ background: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <Table 
          pagination={true}
          headers={["Bill No", "Client", "Total Amt", "Received", "Pending", "Date", "Status", "Actions"]}
          data={sortedData}
          renderRow={(item, index) => {
            const totalAmt = parseFloat(item.amount || item.total || 0);
            const receivedAmt = parseFloat(item.paidAmount || 0);
            const pendingAmt = totalAmt - receivedAmt;
            
            return (
            <tr key={item.id || index} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "1rem", fontWeight: "700", color: "#0f172a", whiteSpace: "nowrap" }}>{item.invoice || item.billNo || item.id?.slice(-6) || index + 1}</td>
              <td style={{ padding: "1rem", color: "#334155", fontWeight: "500", whiteSpace: "nowrap" }}>{item.client || item.billedTo || "-"}</td>
              <td style={{ padding: "1rem", whiteSpace: "nowrap" }}><span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", color: "#0ea5e9", fontWeight: "700" }}><RupeeIcon size={14} />&nbsp;{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
              <td style={{ padding: "1rem", whiteSpace: "nowrap" }}><span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", color: "#10b981", fontWeight: "700" }}><RupeeIcon size={14} />&nbsp;{receivedAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
              <td style={{ padding: "1rem", whiteSpace: "nowrap" }}><span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", color: "#ef4444", fontWeight: "700" }}><RupeeIcon size={14} />&nbsp;{pendingAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
              <td style={{ padding: "1rem", color: "#64748b", fontSize: "0.85rem", fontWeight: "500", whiteSpace: "nowrap" }}>{formatDate(item.invoice_date || item.date || item.createdAt)}</td>
              <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>
                <select 
                  value={(item.status || "pending").toLowerCase()}
                  onChange={(e) => handleStatusChange(item.id, e.target.value)}
                  style={{
                    padding: "0.35rem 0.75rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "700",
                    background: (item.status || "pending").toLowerCase() === "paid" ? "rgba(16, 185, 129, 0.1)" : 
                                (item.status || "pending").toLowerCase() === "cancelled" ? "rgba(220, 38, 38, 0.1)" : "rgba(245, 158, 11, 0.1)",
                    color: (item.status || "pending").toLowerCase() === "paid" ? "#10b981" : 
                           (item.status || "pending").toLowerCase() === "cancelled" ? "#dc2626" : "#f59e0b",
                    border: "1px solid transparent", outline: "none", cursor: "pointer",
                    appearance: "none", WebkitAppearance: "none", MozAppearance: "none",
                    textAlign: "center", letterSpacing: "0.5px"
                  }}
                >
                  <option value="pending" style={{ color: "#f59e0b" }}>Pending</option>
                  <option value="paid" style={{ color: "#10b981" }}>Paid</option>
                  <option value="cancelled" style={{ color: "#dc2626" }}>Cancelled</option>
                </select>
              </td>
              <td style={{ padding: "1rem" }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.75rem' }}>
                  <button onClick={() => window.open(`/bills/view1/${encodeURIComponent(encodeURIComponent(item.id))}`, "_blank")} style={{ background: "rgba(14, 165, 233, 0.1)", border: "none", color: "#0ea5e9", cursor: "pointer", display: 'flex', padding: "6px", borderRadius: "6px", transition: "all 0.2s" }} title="View Bill"><Eye size={16} /></button>
                  <button onClick={() => navigate(`/bills/update?id=${encodeURIComponent(item.id)}`)} style={{ background: "rgba(245, 158, 11, 0.1)", border: "none", color: "#f59e0b", cursor: "pointer", display: 'flex', padding: "6px", borderRadius: "6px", transition: "all 0.2s" }} title="Edit Bill"><Edit3 size={16} /></button>
                  <button onClick={() => window.open(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills/${encodeURIComponent(encodeURIComponent(item.id))}/pdf`, "_blank")} style={{ background: "rgba(100, 116, 139, 0.1)", border: "none", color: "#64748b", cursor: "pointer", display: 'flex', padding: "6px", borderRadius: "6px", transition: "all 0.2s" }} title="Download PDF"><Download size={16} /></button>
                  {isSuperAdmin && (
                    <button onClick={() => handleDelete(item.id)} style={{ background: "rgba(239, 68, 68, 0.1)", border: "none", color: "#ef4444", cursor: "pointer", display: 'flex', padding: "6px", borderRadius: "6px", transition: "all 0.2s" }} title="Delete Bill"><Trash2 size={16} /></button>
                  )}
                </div>
              </td>
            </tr>
            );
          }}
        />
      </div>
    </div>
  );
};

export default AllBills;
