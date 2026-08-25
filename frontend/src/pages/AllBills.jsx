import React, { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import Table from "../components/Table";
import { Eye, FileText, Search, Download, Trash2, Edit3, Upload, Filter, TrendingUp, TrendingDown, Wallet, AlertCircle, Clock, CreditCard, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { useToast } from "../context/ToastContext";
import { SettingsContext } from "../context/SettingsContext";
import { useSocketSync } from "../hooks/useSocketSync";
import { useSync } from "../context/SyncContext";
import { BadgeContext } from "../context/BadgeContext";
import RupeeIcon from '../components/RupeeIcon';
import { formatDate } from '../utils/formatters';
import StatsPanel from "../components/StatsPanel";
import SortDropdown from "../components/SortDropdown";
import useTableSort from "../hooks/useTableSort";
import ExportModal from "../components/ExportModal";
import { exportSalesBillsList } from "../utils/excelExport";

const AllBills = () => {
  const { user } = useContext(AuthContext);
  const { syncQueue } = useSync();
  const { confirm } = useDialog();
  const { clearBadge } = useContext(BadgeContext);
  const { addToast } = useToast();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimarg.com';

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

  const [outstandingEntries, setOutstandingEntries] = useState([]);
  const [clients, setClients] = useState([]);

  // Payment Modal States
  const [payBillOpen, setPayBillOpen] = useState(false);
  const [payingBill, setPayingBill] = useState(false);
  const [payBillData, setPayBillData] = useState({
    client: "",
    billNo: "",
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    remarks: ""
  });

  const fetchClients = useCallback(async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/clients`);
      if (res.data.success) setClients(res.data.data || []);
    } catch (err) { console.error("Fetch clients error", err); }
  }, []);

  const fetchOutstanding = useCallback(async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/outstanding`);
      if (res.data.success) setOutstandingEntries(res.data.data || []);
    } catch (err) { console.error("Fetch outstanding error", err); }
  }, []);

  const fetchBills = useCallback(async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills`);
      if (res.data.success) setBills(res.data.data || []);
    } catch (err) { console.error("Fetch bills error", err); }
  }, []);

  useEffect(() => {
    if (payBillOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [payBillOpen]);

  useEffect(() => {
    fetchBills();
    fetchOutstanding();
    fetchClients();
    clearBadge("bills");
  }, [fetchBills, fetchOutstanding, fetchClients, clearBadge]);

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

  const handleClearAll = async () => {
    const hasDateRange = fromDate || toDate;
    let title = "Clear ALL Bills";
    let message = "WARNING: This will permanently delete ALL bills from the database and revert their bookings back to Booked status. Are you absolutely sure you want to proceed?";
    let url = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills/clear/all`;

    if (hasDateRange) {
      const startStr = fromDate ? formatDate(fromDate) : "anytime";
      const endStr = toDate ? formatDate(toDate) : "anytime";
      title = `Delete ${filtered.length} Bills`;
      message = `WARNING: This will permanently delete ${filtered.length} bills (and revert their bookings back to Booked status) from ${startStr} to ${endStr}. Are you absolutely sure you want to proceed?`;
      url += `?startDate=${fromDate}&endDate=${toDate}`;
    }

    const isConfirmed = await confirm({
      title,
      message,
      confirmText: hasDateRange ? "Yes, Delete Filtered" : "Yes, Delete Everything",
      cancelText: "Cancel",
      requireInput: "confirm"
    });
    if (!isConfirmed) return;

    try {
      await axios.delete(url);
      addToast("Bills cleared successfully", "success");
      fetchBills();
    } catch (err) { 
      console.error("Clear bills error", err); 
      addToast("Failed to clear bills", "error");
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

  const handlePayBill = (item, pendingAmt) => {
    const clientName = item.client || item.billedTo || "";
    const bNo = item.invoice || item.billNo || item.id || "";
    const balance = pendingAmt > 0 ? pendingAmt : (parseFloat(item.amount || item.total || 0));
    setPayBillData({
      client: clientName,
      billNo: bNo,
      date: new Date().toISOString().slice(0, 10),
      amount: balance,
      remarks: `Payment for bill ${bNo}`
    });
    setPayBillOpen(true);
  };

  const handleOpenDirectPayment = () => {
    setPayBillData({
      client: "",
      billNo: "",
      date: new Date().toISOString().slice(0, 10),
      amount: "",
      remarks: "Direct client payment"
    });
    setPayBillOpen(true);
  };

  const handlePayBillSubmit = async (e) => {
    e.preventDefault();
    if (!payBillData.client) {
      addToast("Please select or enter client name", "error");
      return;
    }
    if (!payBillData.amount || Number(payBillData.amount) <= 0) {
      addToast("Please enter a valid payment amount", "error");
      return;
    }

    setPayingBill(true);
    try {
      const payload = {
        amount: parseFloat(payBillData.amount) || 0,
        date: payBillData.date,
        type: "in",
        partyType: "Client",
        partyName: payBillData.client,
        billNo: payBillData.billNo || "",
        remarks: payBillData.remarks || `Payment for ${payBillData.client}`
      };

      const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/cash`, payload);
      if (res.data.success) {
        addToast("Payment recorded successfully! Automatically cleared oldest unpaid bills first.", "success");
        setPayBillOpen(false);
        fetchBills();
        fetchOutstanding();
      } else {
        addToast(res.data.message || "Failed to record payment", "error");
      }
    } catch (err) {
      console.error("Pay bill error", err);
      addToast("Failed to process payment", "error");
    } finally {
      setPayingBill(false);
    }
  };

  const displayBills = useMemo(() => {
    const pending = (syncQueue || [])
      .filter(req => req.method === 'post' && req.url.includes('/bills'))
      .map(req => ({
        ...req.data,
        id: req.tempId,
        isOfflinePending: true,
      }));
    return [...pending, ...bills];
  }, [bills, syncQueue]);

  const filtered = useMemo(() => {
    return displayBills.filter(b => {
      // Search text filter
      if (search) {
        const query = search.toLowerCase();
        const invoiceMatch = (b.invoice || b.billNo || "").toLowerCase().includes(query);
        const clientMatch = (b.client || b.billedTo || "").toLowerCase().includes(query);
        if (!invoiceMatch && !clientMatch) return false;
      }
      
      // Dynamic Status check
      const totalAmount = parseFloat(b.amount || b.total || 0);
      const paidAmount = parseFloat(b.paidAmount || 0);
      const billNo = String(b.invoice || b.billNo || b.id || '').toLowerCase().trim();
      
      const directTdsFromEntries = outstandingEntries.filter(e => String(e.billNo || '').toLowerCase().trim() === billNo && String(e.particulars).toLowerCase() === 'tds').reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const billTds = Math.max(parseFloat(b.tdsAmount || 0), directTdsFromEntries);

      const directDebitFromEntries = outstandingEntries.filter(e => String(e.billNo || '').toLowerCase().trim() === billNo && (String(e.particulars).toLowerCase() === 'debit' || String(e.particulars).toLowerCase() === 'debt')).reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const billDebit = Math.max(parseFloat(b.debtAmount || 0), directDebitFromEntries);
      
      const pendingAmount = Math.max(0, totalAmount - paidAmount - billTds - billDebit);

      const isPaid = pendingAmount <= 0.01;
      const isUnpaid = (paidAmount + billTds + billDebit) <= 0.01;
      const isPartial = pendingAmount > 0.01 && (paidAmount + billTds + billDebit) > 0.01;
      const isCancelled = (b.status || "").toLowerCase() === "cancelled";

      // Status filter
      if (filterStatus !== "All") {
        if (filterStatus === "paid" && !isPaid) return false;
        if (filterStatus === "unpaid" && !isUnpaid) return false;
        if (filterStatus === "partial" && !isPartial) return false;
        if (filterStatus === "pending" && !isUnpaid && !isPartial) return false;
        if (filterStatus === "cancelled" && !isCancelled) return false;
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

      if (minPending !== "" && pendingAmount < parseFloat(minPending)) return false;
      if (maxPending !== "" && pendingAmount > parseFloat(maxPending)) return false;

      return true;
    });
  }, [displayBills, search, filterStatus, fromDate, toDate, minPending, maxPending, outstandingEntries]);

  const { sortedData, sortOption, setSortOption } = useTableSort(filtered, "bill_desc", { nameKey: "client", amountKey: "amount" });

  const stats = useMemo(() => {
    let totalBilled = 0;
    let totalReceived = 0;
    let totalPending = 0;
    let countPaid = 0;
    let countPending = 0;
    
    filtered.forEach(b => {
      const amt = parseFloat(b.amount || b.total || 0);
      const rec = parseFloat(b.paidAmount || 0);
      const billNo = String(b.invoice || b.billNo || b.id || '').toLowerCase().trim();
      
      const directTdsFromEntries = outstandingEntries.filter(e => String(e.billNo || '').toLowerCase().trim() === billNo && String(e.particulars).toLowerCase() === 'tds').reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const billTds = Math.max(parseFloat(b.tdsAmount || 0), directTdsFromEntries);

      const directDebitFromEntries = outstandingEntries.filter(e => String(e.billNo || '').toLowerCase().trim() === billNo && (String(e.particulars).toLowerCase() === 'debit' || String(e.particulars).toLowerCase() === 'debt')).reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const billDebit = Math.max(parseFloat(b.debtAmount || 0), directDebitFromEntries);
      
      totalBilled += amt;
      totalReceived += rec;
      const pAmt = Math.max(0, amt - rec - billTds - billDebit);
      totalPending += pAmt;
      
      if (pAmt <= 0.01) countPaid++;
      else countPending++;
    });
    
    return { totalBilled, totalReceived, totalPending, countPaid, countPending };
  }, [filtered, outstandingEntries]);

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

  // Row Selection State
  const [selectedBillIds, setSelectedBillIds] = useState([]);

  const handleToggleSelectBill = (id) => {
    if (!id) return;
    setSelectedBillIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const isAllVisibleSelected = useMemo(() => {
    const ids = sortedData.map(b => b.id).filter(Boolean);
    return ids.length > 0 && ids.every(id => selectedBillIds.includes(id));
  }, [sortedData, selectedBillIds]);

  const handleToggleSelectAll = () => {
    const ids = sortedData.map(b => b.id).filter(Boolean);
    if (isAllVisibleSelected) {
      setSelectedBillIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedBillIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExecuteExport = async ({ format }) => {
    if (filtered.length === 0) {
      addToast("No data to export", "warning");
      return;
    }
    try {
      setIsExporting(true);
      let dataToExport = sortedData;
      if (selectedBillIds.length > 0) {
        dataToExport = sortedData.filter(b => selectedBillIds.includes(b.id));
      }
      await exportSalesBillsList({
        bills: dataToExport,
        format,
        dateRange: { startDate: fromDate, endDate: toDate },
      });
      setShowExportModal(false);
    } catch (err) {
      console.error("Export error", err);
      addToast("Failed to export bills", "error");
    } finally {
      setIsExporting(false);
    }
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
          <button className="btn btn-secondary page-header-btn" onClick={() => setShowExportModal(true)}>
            <Download size={16} /> Export
          </button>
          <button 
            className="btn btn-secondary page-header-btn" 
            style={{ color: "#059669", borderColor: "#a7f3d0", backgroundColor: "#ecfdf5", display: "flex", alignItems: "center", gap: "6px" }}
            onClick={handleOpenDirectPayment}
            title="Receive client payment and clear oldest invoices"
          >
            <CreditCard size={16} /> Receive Payment
          </button>
          {((isSuperAdmin || user?.role === 'Admin') && globalSettings?.integrations?.enableBulkDelete) && (
            <button 
              className="btn btn-secondary page-header-btn" 
              style={{ 
                color: "#dc2626", 
                borderColor: "#fecaca", 
                backgroundColor: (fromDate || toDate) ? '#fef2f2' : 'transparent',
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px' 
              }} 
              onClick={handleClearAll} 
              title={(fromDate || toDate) ? "Delete Filtered Bills" : "Clear All Bills"}
            >
              <Trash2 size={16} />
              {(fromDate || toDate) ? `Delete Filtered (${filtered.length})` : "Delete All Bills"}
            </button>
          )}
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
              <option value="pending">Pending / Outstandings</option>
              <option value="unpaid">Fully Unpaid</option>
              <option value="partial">Partial Payments</option>
              <option value="paid">Fully Paid</option>
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
            options={["bill_desc", "bill_asc", "newest", "oldest", "amount_desc", "amount_asc", "az", "za"]} 
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
          headers={[
            <div key="select-all-bills" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <input
                type="checkbox"
                checked={isAllVisibleSelected}
                onChange={handleToggleSelectAll}
                style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }}
                title={isAllVisibleSelected ? "Deselect All" : "Select All"}
              />
            </div>,
            "Bill No", "Client", "Total Amt", "Received", "TDS", "DEBT", "Pending", "Date", "Status", "Actions"
          ]}
          data={sortedData}
          renderRow={(item, index) => {
            const isSelected = selectedBillIds.includes(item.id);
            const totalAmt = parseFloat(item.amount || item.total || 0);
            const receivedAmt = parseFloat(item.paidAmount || 0);
            const billNo = String(item.invoice || item.billNo || item.id || '').toLowerCase().trim();
            const billTds = outstandingEntries.filter(e => String(e.billNo || '').toLowerCase().trim() === billNo && String(e.particulars).toLowerCase() === 'tds').reduce((sum, e) => sum + Number(e.amount || 0), 0);
            const billTdsReceived = outstandingEntries.filter(e => String(e.billNo || '').toLowerCase().trim() === billNo && String(e.particulars).toLowerCase() === 'tds' && String(e.tdsStatus).toLowerCase() === 'received').reduce((sum, e) => sum + Number(e.amount || 0), 0);
            const isTdsFullyRecovered = billTds > 0 && billTdsReceived >= billTds;
            const billDebit = outstandingEntries.filter(e => String(e.billNo || '').toLowerCase().trim() === billNo && (String(e.particulars).toLowerCase() === 'debit' || String(e.particulars).toLowerCase() === 'debt')).reduce((sum, e) => sum + Number(e.amount || 0), 0);
            const pendingAmt = Math.max(0, totalAmt - receivedAmt - billTds - billDebit);
            
            return (
            <tr key={item.id || index} style={{ borderBottom: "1px solid #f1f5f9", opacity: item.isOfflinePending ? 0.7 : 1, backgroundColor: isSelected ? "rgba(59, 130, 246, 0.08)" : undefined }}>
              <td style={{ width: "40px", textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleSelectBill(item.id)}
                  style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }}
                />
              </td>
              <td style={{ padding: "1rem", fontWeight: "700", color: "#0f172a", whiteSpace: "nowrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {item.invoice || item.billNo || item.id?.slice(-6) || index + 1}
                  {item.isOfflinePending && (
                    <Clock size={14} color="#f59e0b" title="Pending Sync (Offline)" />
                  )}
                </div>
              </td>
              <td style={{ padding: "1rem", color: "#334155", fontWeight: "500", whiteSpace: "nowrap" }}>{item.client || item.billedTo || "-"}</td>
              <td style={{ padding: "1rem", whiteSpace: "nowrap" }}><span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", color: "#0ea5e9", fontWeight: "700" }}><RupeeIcon size={14} />&nbsp;{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
              <td style={{ padding: "1rem", whiteSpace: "nowrap" }}><span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", color: "#10b981", fontWeight: "700" }}><RupeeIcon size={14} />&nbsp;{receivedAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
              <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>
                {billTds > 0 ? (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", color: "#d97706", fontWeight: "700" }}>
                      <RupeeIcon size={14} />&nbsp;{billTds.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ 
                      fontSize: "0.65rem", 
                      padding: "1px 5px", 
                      borderRadius: "10px", 
                      fontWeight: "800",
                      backgroundColor: isTdsFullyRecovered ? "#dcfce7" : "#fef3c7",
                      color: isTdsFullyRecovered ? "#15803d" : "#b45309"
                    }}>
                      {isTdsFullyRecovered ? "Recd" : "Claimable"}
                    </span>
                  </div>
                ) : (
                  <span style={{ color: "#94a3b8" }}>-</span>
                )}
              </td>
              <td style={{ padding: "1rem", whiteSpace: "nowrap" }}><span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", color: "#f43f5e", fontWeight: "700" }}><RupeeIcon size={14} />&nbsp;{billDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
              <td style={{ padding: "1rem", whiteSpace: "nowrap" }}><span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", color: "#ef4444", fontWeight: "700" }}><RupeeIcon size={14} />&nbsp;{pendingAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
              <td style={{ padding: "1rem", color: "#64748b", fontSize: "0.85rem", fontWeight: "500", whiteSpace: "nowrap" }}>{formatDate(item.invoice_date || item.date || item.createdAt)}</td>
              <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>
                {(() => {
                  let displayStatus = "pending";
                  if (pendingAmt <= 0.01) displayStatus = "paid";
                  else if (receivedAmt > 0.01 && pendingAmt > 0.01) displayStatus = "partial";
                  else if ((item.status || "").toLowerCase() === "cancelled") displayStatus = "cancelled";

                  return (
                    <select 
                      value={displayStatus}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      disabled={displayStatus === "partial"}
                      style={{
                        padding: "0.35rem 0.75rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "700",
                        background: displayStatus === "paid" ? "rgba(5, 150, 105, 0.1)" : 
                                    displayStatus === "cancelled" ? "rgba(220, 38, 38, 0.1)" : 
                                    displayStatus === "partial" ? "rgba(217, 119, 6, 0.1)" : "rgba(245, 158, 11, 0.1)",
                        color: displayStatus === "paid" ? "var(--color-success)" : 
                               displayStatus === "cancelled" ? "#dc2626" : 
                               displayStatus === "partial" ? "var(--color-warning)" : "#f59e0b",
                        border: "1px solid transparent", outline: "none", cursor: displayStatus === "partial" ? "not-allowed" : "pointer",
                        appearance: "none", WebkitAppearance: "none", MozAppearance: "none",
                        textAlign: "center", letterSpacing: "0.5px"
                      }}
                    >
                      <option value="pending" style={{ color: "#f59e0b" }}>Pending</option>
                      <option value="partial" style={{ color: "var(--color-warning)" }}>Partial</option>
                      <option value="paid" style={{ color: "var(--color-success)" }}>Paid</option>
                      <option value="cancelled" style={{ color: "#dc2626" }}>Cancelled</option>
                    </select>
                  );
                })()}
              </td>
              <td className="actions-cell" style={{ padding: "1rem" }}>
                <div className="table-actions" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem' }}>
                  {isSuperAdmin && pendingAmt > 0.01 && !item.isOfflinePending && (
                    <button 
                      onClick={() => handlePayBill(item, pendingAmt)} 
                      style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#059669", cursor: "pointer", display: 'flex', alignItems: 'center', gap: '4px', padding: "4px 8px", borderRadius: "6px", fontWeight: "700", fontSize: "0.75rem", transition: "all 0.2s" }} 
                      title="Receive Payment (Clears oldest invoices first)"
                    >
                      <CreditCard size={13} /> Pay
                    </button>
                  )}
                  <button disabled={item.isOfflinePending} onClick={() => window.open(`/bills/view1/${encodeURIComponent(encodeURIComponent(item.id))}`, "_blank")} style={{ background: "rgba(14, 165, 233, 0.1)", border: "none", color: "#0ea5e9", cursor: item.isOfflinePending ? "not-allowed" : "pointer", display: 'flex', padding: "6px", borderRadius: "6px", transition: "all 0.2s", opacity: item.isOfflinePending ? 0.5 : 1 }} title="View Bill"><Eye size={16} /></button>
                  <button disabled={item.isOfflinePending} onClick={() => navigate(`/bills/update?id=${encodeURIComponent(item.id)}`)} style={{ background: "rgba(245, 158, 11, 0.1)", border: "none", color: "#f59e0b", cursor: item.isOfflinePending ? "not-allowed" : "pointer", display: 'flex', padding: "6px", borderRadius: "6px", transition: "all 0.2s", opacity: item.isOfflinePending ? 0.5 : 1 }} title="Edit Bill"><Edit3 size={16} /></button>
                  <button disabled={item.isOfflinePending} onClick={() => window.open(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills/${encodeURIComponent(encodeURIComponent(item.id))}/pdf?token=${localStorage.getItem('token')}`, "_blank")} style={{ background: "rgba(100, 116, 139, 0.1)", border: "none", color: "#64748b", cursor: item.isOfflinePending ? "not-allowed" : "pointer", display: 'flex', padding: "6px", borderRadius: "6px", transition: "all 0.2s", opacity: item.isOfflinePending ? 0.5 : 1 }} title="Download PDF"><Download size={16} /></button>
                  {isSuperAdmin && !item.isOfflinePending && (
                    <button onClick={() => handleDelete(item.id)} style={{ background: "rgba(239, 68, 68, 0.1)", border: "none", color: "#ef4444", cursor: "pointer", display: 'flex', padding: "6px", borderRadius: "6px", transition: "all 0.2s" }} title="Delete Bill"><Trash2 size={16} /></button>
                  )}
                </div>
              </td>
            </tr>
            );
          }}
        />
      </div>

      {/* Pay Modal for Sales Bills mounted to document.body */}
      {payBillOpen && typeof document !== "undefined" && createPortal(
        <div 
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setPayBillOpen(false); }}
        >
          <div className="modal-dialog-card">
            
            {/* Modal Header */}
            <div className="modal-header-section">
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: "1.15rem", color: "#0f172a", fontWeight: "700", margin: 0, lineHeight: "1.3" }}>
                  Receive Client Payment
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.75rem", margin: "2px 0 0 0", lineHeight: "1.3" }}>
                  FIFO Clearing: Automatically settles oldest unpaid bills first (25-26 first).
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setPayBillOpen(false)} 
                style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form (Scrollable body + Fixed Footer) */}
            <form onSubmit={handlePayBillSubmit} className="modal-form-container">
              <div className="modal-body-section">
                <div className="form-group">
                  <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem", display: "block" }}>
                    CLIENT NAME *
                  </label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required
                    list="clientDatalist"
                    placeholder="Type or select client name..."
                    value={payBillData.client} 
                    onChange={(e) => setPayBillData({ ...payBillData, client: e.target.value })}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                  <datalist id="clientDatalist">
                    {clients.map(c => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>

                {payBillData.billNo && (
                  <div style={{ padding: "0.6rem 0.8rem", borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "0.75rem", color: "#475569" }}>
                    <span>Initiated for Bill: <strong>{payBillData.billNo}</strong></span>
                  </div>
                )}

                <div className="form-group">
                  <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem", display: "block" }}>
                    PAYMENT AMOUNT (₹) *
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-control" 
                    required 
                    placeholder="Amount in Rupees"
                    value={payBillData.amount} 
                    onChange={(e) => setPayBillData({ ...payBillData, amount: e.target.value })}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1.5px solid #10b981", fontWeight: "700", color: "#065f46" }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem", display: "block" }}>
                    PAYMENT DATE *
                  </label>
                  <input 
                    type="date" 
                    className="form-control" 
                    required 
                    value={payBillData.date} 
                    onChange={(e) => setPayBillData({ ...payBillData, date: e.target.value })}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem", display: "block" }}>
                    REMARKS / REFERENCE (OPTIONAL)
                  </label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Bank Ref, Cheque No, RTGS..."
                    value={payBillData.remarks} 
                    onChange={(e) => setPayBillData({ ...payBillData, remarks: e.target.value })}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>
              </div>

              {/* Modal Sticky Footer (Always Visible at bottom of dialog!) */}
              <div className="modal-footer-section">
                <button 
                  type="button" 
                  onClick={() => setPayBillOpen(false)} 
                  style={{ padding: "0.45rem 1rem", borderRadius: "8px", border: "1px solid #cbd5e1", cursor: "pointer", backgroundColor: "#fff", color: "#475569", fontWeight: "600", fontSize: "0.85rem" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={payingBill} 
                  style={{ padding: "0.45rem 1.5rem", borderRadius: "8px", border: "none", cursor: payingBill ? "not-allowed" : "pointer", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", fontWeight: "600", fontSize: "0.85rem", boxShadow: "0 2px 4px rgba(5, 150, 105, 0.25)" }}
                >
                  {payingBill ? "Processing..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Unified Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Sales Invoices"
        itemCount={selectedBillIds.length > 0 ? selectedBillIds.length : sortedData.length}
        subtitle={selectedBillIds.length > 0 
          ? `Exporting ${selectedBillIds.length} selected invoice(s)` 
          : (search || fromDate || toDate || filterStatus !== 'All' ? `Exporting ${sortedData.length} filtered invoice(s)` : `Exporting all ${sortedData.length} invoices`)}
        isExporting={isExporting}
        onExport={handleExecuteExport}
      />
    </div>
  );
};

export default AllBills;
