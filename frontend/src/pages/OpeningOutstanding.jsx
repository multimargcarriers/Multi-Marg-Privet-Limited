import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import axios from "axios";
import Papa from "papaparse";
import { 
  Plus, 
  Download, 
  Trash2, 
  Edit3, 
  Search, 
  X, 
  Calendar, 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Building2,
  Users,
  Scale
} from "lucide-react";
import { useDialog } from "../context/DialogContext";
import { useToast } from "../context/ToastContext";
import { useSocketSync } from "../hooks/useSocketSync";
import Table from "../components/Table";
import { formatDate } from "../utils/formatters";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const OpeningOutstanding = () => {
  const navigate = useNavigate();
  const { confirm, alert: alertDialog } = useDialog();
  const { addToast } = useToast();

  // State
  const [openingBalances, setOpeningBalances] = useState([]);
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFY, setSelectedFY] = useState(() => sessionStorage.getItem("active_opening_fy") || "2026-2027");
  const [partyTab, setPartyTab] = useState(() => sessionStorage.getItem("active_opening_tab") || "All"); // 'All' | 'Client' | 'Vendor'
  const [searchQuery, setSearchQuery] = useState("");

  const initialFormData = {
    financialYear: "2026-2027",
    asOfDate: "2026-03-31",
    effectiveFrom: "2026-04-01",
    partyType: "Client",
    partyName: "",
    openingOutstanding: "",
    totalBilledPrior: "",
    totalPaidPrior: "",
    totalTdsPrior: "",
    totalDebtPrior: "",
    notes: ""
  };

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(() => {
    try {
      const saved = sessionStorage.getItem("draft_opening_balance_form");
      return saved ? JSON.parse(saved) : initialFormData;
    } catch {
      return initialFormData;
    }
  });
  const [saving, setSaving] = useState(false);

  // Auto-save draft and active tab to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("active_opening_fy", selectedFY);
  }, [selectedFY]);

  useEffect(() => {
    sessionStorage.setItem("active_opening_tab", partyTab);
  }, [partyTab]);

  useEffect(() => {
    if (!editingId) {
      sessionStorage.setItem("draft_opening_balance_form", JSON.stringify(formData));
    }
  }, [formData, editingId]);

  // Close Financial Year Modal State
  const [closeFYModalOpen, setCloseFYModalOpen] = useState(false);
  const [closeFYData, setCloseFYData] = useState({
    cutoffDate: "2026-03-31",
    targetFY: "2026-2027",
    effectiveDate: "2026-04-01",
    notes: "Carried forward from FY 2025-2026 on 31-03-2026"
  });
  const [closingFY, setClosingFY] = useState(false);
  const [exportedBackup, setExportedBackup] = useState(false);

  // Scroll locking for modals
  useEffect(() => {
    if (modalOpen || closeFYModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen, closeFYModalOpen]);

  // Fetch Data
  const fetchData = useCallback(async (forceSync = false) => {
    setLoading(true);
    try {
      if (forceSync) {
        try {
          await axios.post(`${API}/opening-balances/recalculate-all`);
          addToast("All ledgers & balances recalculated successfully", "success");
        } catch (sErr) {
          console.warn("Recalculate sync warning:", sErr);
        }
      }
      const [openRes, clientsRes, vendorsRes] = await Promise.all([
        axios.get(`${API}/opening-balances`),
        axios.get(`${API}/clients`),
        axios.get(`${API}/vendors`)
      ]);
      if (openRes.data.success) {
        setOpeningBalances(openRes.data.data || []);
      }
      if (clientsRes.data.success) {
        setClients(clientsRes.data.data || []);
      }
      if (vendorsRes.data.success) {
        setVendors(vendorsRes.data.data || []);
      }
    } catch (err) {
      console.error("Fetch opening balances error:", err);
      addToast("Failed to fetch opening balances", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time synchronization
  useSocketSync("openingBalances", () => fetchData(false));
  useSocketSync("outstanding", () => fetchData(false));
  useSocketSync("bills", () => fetchData(false));
  useSocketSync("purchases", () => fetchData(false));
  useSocketSync("clients", () => fetchData(false));
  useSocketSync("vendors", () => fetchData(false));

  // Available Financial Years in data
  const availableFYs = useMemo(() => {
    const set = new Set(["2026-2027", "2025-2026", "2024-2025"]);
    openingBalances.forEach((e) => {
      if (e.financialYear) set.add(e.financialYear);
    });
    return Array.from(set).sort().reverse();
  }, [openingBalances]);

  // Filtered List
  const filteredList = useMemo(() => {
    return openingBalances.filter((e) => {
      const eFY = (e.financialYear || "").trim();
      const matchesFY = selectedFY === "All" || eFY.toLowerCase() === selectedFY.toLowerCase().trim();
      const eParty = (e.partyType || "Client").trim().toLowerCase();
      const matchesParty = partyTab === "All" || eParty === partyTab.toLowerCase().trim();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (e.partyName || "").toLowerCase().includes(q) ||
        (e.notes || "").toLowerCase().includes(q);
      return matchesFY && matchesParty && matchesSearch;
    });
  }, [openingBalances, selectedFY, partyTab, searchQuery]);

  // Dynamic Financial Metrics (Context-Aware for Selected Target Tab & Filters)
  const metrics = useMemo(() => {
    const list = filteredList;
    const clientList = list.filter((e) => (e.partyType || "Client").trim().toLowerCase() === "client");
    const vendorList = list.filter((e) => (e.partyType || "").trim().toLowerCase() === "vendor");

    const clientOutstanding = clientList.reduce((s, e) => s + (Number(e.openingOutstanding) || 0), 0);
    const vendorOutstanding = vendorList.reduce((s, e) => s + (Number(e.openingOutstanding) || 0), 0);
    const totalPriorBilled = list.reduce((s, e) => s + (Number(e.totalBilledPrior) || 0), 0);
    const totalPriorPaid = list.reduce((s, e) => s + (Number(e.totalPaidPrior) || 0), 0);
    const totalPriorTds = list.reduce((s, e) => s + (Number(e.totalTdsPrior) || 0), 0);
    const totalPriorDebt = list.reduce((s, e) => s + (Number(e.totalDebtPrior) || 0), 0);

    const allFYList = selectedFY === "All" ? openingBalances : openingBalances.filter((e) => (e.financialYear || "").trim().toLowerCase() === selectedFY.toLowerCase().trim());

    return {
      clientOutstanding,
      vendorOutstanding,
      totalPriorBilled,
      totalPriorPaid,
      totalPriorTds,
      totalPriorDebt,
      totalCount: allFYList.length,
      clientCount: allFYList.filter((e) => (e.partyType || "Client").trim().toLowerCase() === "client").length,
      vendorCount: allFYList.filter((e) => (e.partyType || "").trim().toLowerCase() === "vendor").length
    };
  }, [filteredList, selectedFY, openingBalances]);

  // Handle Open Create / Edit Modal
  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        financialYear: item.financialYear || "2026-2027",
        asOfDate: item.asOfDate || "2026-03-31",
        effectiveFrom: item.effectiveFrom || "2026-04-01",
        partyType: item.partyType || "Client",
        partyName: item.partyName || "",
        openingOutstanding: String(item.openingOutstanding || ""),
        totalBilledPrior: String(item.totalBilledPrior || ""),
        totalPaidPrior: String(item.totalPaidPrior || ""),
        totalTdsPrior: String(item.totalTdsPrior || ""),
        totalDebtPrior: String(item.totalDebtPrior || ""),
        notes: item.notes || ""
      });
    } else {
      setEditingId(null);
      setFormData({
        financialYear: selectedFY !== "All" ? selectedFY : "2026-2027",
        asOfDate: "2026-03-31",
        effectiveFrom: "2026-04-01",
        partyType: partyTab !== "All" ? partyTab : "Client",
        partyName: "",
        openingOutstanding: "",
        totalBilledPrior: "",
        totalPaidPrior: "",
        totalTdsPrior: "",
        totalDebtPrior: "",
        notes: ""
      });
    }
    setModalOpen(true);
  };

  // Save Modal
  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!formData.partyName || !formData.partyName.trim()) {
      alertDialog("Please select or enter a party name");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`${API}/opening-balances/${editingId}`, formData);
        addToast("Opening balance updated successfully", "success");
      } else {
        await axios.post(`${API}/opening-balances`, formData);
        addToast("Opening balance created successfully", "success");
        sessionStorage.removeItem("draft_opening_balance_form");
        setFormData(initialFormData);
      }
      setModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error("Save opening balance error:", err);
      alertDialog("Failed to save opening balance: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Delete Entry
  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Opening Balance",
      message: "Are you sure you want to delete this opening balance entry?",
      confirmText: "Delete",
      type: "danger"
    });
    if (!isConfirmed) return;

    try {
      await axios.delete(`${API}/opening-balances/${id}`);
      addToast("Opening balance deleted", "info");
      await fetchData();
    } catch (err) {
      console.error("Delete error:", err);
      addToast("Failed to delete entry", "error");
    }
  };

  // Export Detailed CSV
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      alertDialog("No records to export in the current view");
      return;
    }
    const csvData = filteredList.map((e) => ({
      "Financial Year": e.financialYear,
      "Party Type": e.partyType,
      "Party Name": e.partyName,
      "Closing Balance (₹)": e.totalBilledPrior || 0,
      "Amount Received (₹)": e.totalPaidPrior || 0,
      "TDS (₹)": e.totalTdsPrior || 0,
      "Bad Debt / Debit (₹)": e.totalDebtPrior || 0,
      "Outstanding (₹)": e.openingOutstanding,
      "Cutoff Date": formatDate(e.asOfDate),
      "Effective Starting Date": formatDate(e.effectiveFrom),
      "Notes / Reference": e.notes || ""
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Opening_Outstanding_Report_${selectedFY}_${partyTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportedBackup(true);
    addToast("Opening Outstanding Report exported successfully!", "success");
  };

  // Execute Financial Year Close
  const handleExecuteCloseFY = async (e) => {
    e.preventDefault();
    if (!exportedBackup) {
      const proceedWithoutBackup = await confirm({
        title: "Export Recommended Before Close",
        message: "You haven't exported a backup report yet. We strongly recommend exporting first. Do you still want to proceed with Closing and Archiving prior year data?",
        confirmText: "Proceed Anyway",
        type: "warning"
      });
      if (!proceedWithoutBackup) return;
    }

    const finalConfirm = await confirm({
      title: "CONFIRM FINANCIAL YEAR CLOSE",
      message: `Are you sure you want to close financial records up to ${closeFYData.cutoffDate}? Completed bills and paid AWBs on or before ${closeFYData.cutoffDate} will be archived, while net balances will roll over into FY ${closeFYData.targetFY}. (Unbilled AWBs are safely preserved).`,
      confirmText: "Execute Close & Reset",
      type: "danger"
    });
    if (!finalConfirm) return;

    setClosingFY(true);
    try {
      const res = await axios.post(`${API}/opening-balances/close-fy`, closeFYData);
      setCloseFYModalOpen(false);
      await fetchData();
      const r = res.data.data;
      alertDialog({
        title: "Financial Year Closed Successfully!",
        message: `FY Rollover Complete:\n• ${r.clientsCarriedForward} Client opening balances created\n• ${r.vendorsCarriedForward} Vendor opening balances created\n• ${r.billsDeleted} prior sales bills cleared\n• ${r.purchasesDeleted} prior purchase bills cleared\n• ${r.cashEntriesDeleted || 0} prior cash sheet settlements archived\n• ${r.adjustmentsDeleted || 0} prior TDS/DEBT adjustments archived\n• ${r.awbsDeleted} prior completed AWBs cleared\n• ${r.awbsRetainedUnbilled} pending/unbilled AWBs SAFELY PRESERVED for new billing.`
      });
    } catch (err) {
      console.error("Close FY error:", err);
      alertDialog("Financial Year Close failed: " + (err.response?.data?.message || err.message));
    } finally {
      setClosingFY(false);
    }
  };

  return (
    <div style={{ padding: "clamp(0.75rem, 2vw, 1.5rem)", width: "100%", boxSizing: "border-box" }}>
      {/* Enterprise Unified Header */}
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        padding: "1rem 1.25rem",
        marginBottom: "1.25rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }}>
        {/* Top Title Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.85rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem" }}>
          <div>
            <h2 style={{ fontSize: "clamp(1.15rem, 2.2vw, 1.45rem)", color: "#0f172a", fontWeight: "800", margin: 0, letterSpacing: "-0.02em" }}>
              Prior Financial Year Opening Balances
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.8rem", margin: "2px 0 0", fontWeight: 500 }}>
              Stored prior financial year closing outstandings (before 31st March) carried forward as reference balances
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/outstanding/final-sheet")}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.8rem", padding: "0.45rem 0.85rem", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}
            >
              <Scale size={14} /> Balances Summary
            </button>

            <button
              onClick={() => setCloseFYModalOpen(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.8rem", padding: "0.45rem 0.85rem", background: "#fffbeb", border: "1px solid #fde68a", color: "#b45309", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}
            >
              <Calendar size={14} /> Close Financial Year
            </button>
          </div>
        </div>

        {/* Action Controls Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={() => handleOpenModal(null)}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.82rem", padding: "0.5rem 1rem", background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", border: "none", color: "white", borderRadius: "8px", cursor: "pointer", fontWeight: "700", boxShadow: "0 2px 4px rgba(37, 99, 235, 0.25)" }}
            >
              <Plus size={16} /> Add Opening Balance
            </button>

            <button
              onClick={handleExportCSV}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.82rem", padding: "0.5rem 0.85rem", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", fontWeight: "600", color: "#334155" }}
            >
              <Download size={14} /> Export Report
            </button>

            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.82rem", padding: "0.5rem 0.85rem", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer", fontWeight: "600", color: "#334155" }}
            >
              <RefreshCw size={14} className={loading ? "spin-animation" : ""} /> {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Top View Mode Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "2px solid #e2e8f0", paddingBottom: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={() => setPartyTab("All")}
          style={{
            padding: "0.55rem 1.25rem",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: "700",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: partyTab === "All" ? "#1e293b" : "transparent",
            color: partyTab === "All" ? "#ffffff" : "#64748b",
            boxShadow: partyTab === "All" ? "0 2px 4px rgba(0,0,0,0.15)" : "none"
          }}
        >
          👥 All Opening Balances
          <span style={{ fontSize: "0.75rem", padding: "1px 7px", borderRadius: "10px", backgroundColor: partyTab === "All" ? "rgba(255,255,255,0.2)" : "#e2e8f0", color: partyTab === "All" ? "#fff" : "#475569", fontWeight: "800" }}>
            {metrics.totalCount}
          </span>
        </button>

        <button
          onClick={() => setPartyTab("Client")}
          style={{
            padding: "0.55rem 1.25rem",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: "700",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: partyTab === "Client" ? "#2563eb" : "transparent",
            color: partyTab === "Client" ? "#ffffff" : "#64748b",
            boxShadow: partyTab === "Client" ? "0 2px 4px rgba(37,99,235,0.25)" : "none"
          }}
        >
          👤 Client Receivables (Sales)
          <span style={{ fontSize: "0.75rem", padding: "1px 7px", borderRadius: "10px", backgroundColor: partyTab === "Client" ? "rgba(255,255,255,0.2)" : "#dbeafe", color: partyTab === "Client" ? "#fff" : "#1d4ed8", fontWeight: "800" }}>
            {metrics.clientCount}
          </span>
        </button>

        <button
          onClick={() => setPartyTab("Vendor")}
          style={{
            padding: "0.55rem 1.25rem",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: "700",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: partyTab === "Vendor" ? "#7c3aed" : "transparent",
            color: partyTab === "Vendor" ? "#ffffff" : "#64748b",
            boxShadow: partyTab === "Vendor" ? "0 2px 4px rgba(124,58,237,0.25)" : "none"
          }}
        >
          🏢 Vendor Payables (Purchases)
          <span style={{ fontSize: "0.75rem", padding: "1px 7px", borderRadius: "10px", backgroundColor: partyTab === "Vendor" ? "rgba(255,255,255,0.2)" : "#ede9fe", color: partyTab === "Vendor" ? "#fff" : "#6d28d9", fontWeight: "800" }}>
            {metrics.vendorCount}
          </span>
        </button>
      </div>

      {/* Filter and FY Bar */}
      <div className="glass-panel" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem" }}>
              FINANCIAL YEAR
            </label>
            <select
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              className="form-control"
              style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
            >
              <option value="All">All Financial Years</option>
              {availableFYs.map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy} (Opening on 1st April {fy.split("-")[0]})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem" }}>
              SEARCH PARTY NAME / NOTES
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Type client or vendor name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards (Context-Aware for Target Tab) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.85rem", marginBottom: "1.5rem" }}>
        
        {/* Card 1: Opening Due / Receivable / Payable */}
        <div style={{ padding: "1rem 1.25rem", borderRadius: "10px", background: partyTab === "Vendor" ? "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)" : "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)", border: partyTab === "Vendor" ? "1px solid #ddd6fe" : "1px solid #bfdbfe", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: partyTab === "Vendor" ? "#5b21b6" : "#1e3a8a", textTransform: "uppercase" }}>
                {partyTab === "Vendor" ? "Vendor Outstanding" : "Client Outstanding"}
              </span>
              {partyTab === "Vendor" ? <Building2 size={16} style={{ color: "#5b21b6" }} /> : <Users size={16} style={{ color: "#1e3a8a" }} />}
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: "800", color: partyTab === "Vendor" ? "#5b21b6" : "#1e3a8a", margin: "0.5rem 0" }}>
              ₹{(partyTab === "Vendor" ? metrics.vendorOutstanding : metrics.clientOutstanding).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <span style={{ fontSize: "0.7rem", color: partyTab === "Vendor" ? "#7c3aed" : "#3b82f6" }}>
            {partyTab === "Vendor" ? "Total net payable to vendors" : "Total net receivable from clients"}
          </span>
        </div>

        {/* Card 2: Vendor Due (in All view) OR Closing Balance */}
        {partyTab === "All" ? (
          <div style={{ padding: "1rem 1.25rem", borderRadius: "10px", background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)", border: "1px solid #ddd6fe", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#5b21b6", textTransform: "uppercase" }}>Vendor Outstanding</span>
                <Building2 size={16} style={{ color: "#5b21b6" }} />
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "#5b21b6", margin: "0.5rem 0" }}>
                ₹{metrics.vendorOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <span style={{ fontSize: "0.7rem", color: "#7c3aed" }}>Net payable to vendors</span>
          </div>
        ) : (
          <div style={{ padding: "1rem 1.25rem", borderRadius: "10px", background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "1px solid #bbf7d0", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#14532d", textTransform: "uppercase" }}>
                  Closing Balance
                </span>
                <Activity size={16} style={{ color: "#14532d" }} />
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "#14532d", margin: "0.5rem 0" }}>
                ₹{metrics.totalPriorBilled.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <span style={{ fontSize: "0.7rem", color: "#22c55e" }}>Total gross balance</span>
          </div>
        )}

        {/* Card 3: Closing Balance (in All view) OR Amount Received */}
        {partyTab === "All" ? (
          <div style={{ padding: "1rem 1.25rem", borderRadius: "10px", background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "1px solid #bbf7d0", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#14532d", textTransform: "uppercase" }}>Closing Balance</span>
                <Activity size={16} style={{ color: "#14532d" }} />
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "#14532d", margin: "0.5rem 0" }}>
                ₹{metrics.totalPriorBilled.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <span style={{ fontSize: "0.7rem", color: "#22c55e" }}>Total gross balance</span>
          </div>
        ) : (
          <div style={{ padding: "1rem 1.25rem", borderRadius: "10px", background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", border: "1px solid #fde68a", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#78350f", textTransform: "uppercase" }}>
                  Amount Received
                </span>
                <TrendingUp size={16} style={{ color: "#78350f" }} />
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "#78350f", margin: "0.5rem 0" }}>
                ₹{metrics.totalPriorPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <span style={{ fontSize: "0.7rem", color: "#78350f" }}>Total payments received</span>
          </div>
        )}

        {/* Card 4: Amount Received (in All view) OR TDS & Adjustments */}
        {partyTab === "All" ? (
          <div style={{ padding: "1rem 1.25rem", borderRadius: "10px", background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", border: "1px solid #fde68a", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#78350f", textTransform: "uppercase" }}>Amount Received</span>
                <TrendingUp size={16} style={{ color: "#78350f" }} />
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "#78350f", margin: "0.5rem 0" }}>
                ₹{metrics.totalPriorPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <span style={{ fontSize: "0.7rem", color: "#78350f" }}>Total payments received</span>
          </div>
        ) : (
          <div style={{ padding: "1rem 1.25rem", borderRadius: "10px", background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)", border: "1px solid #fecdd3", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#881337", textTransform: "uppercase" }}>TDS & DEBT</span>
                <TrendingDown size={16} style={{ color: "#881337" }} />
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "#881337", margin: "0.5rem 0" }}>
                ₹{(metrics.totalPriorTds + metrics.totalPriorDebt).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <span style={{ fontSize: "0.7rem", color: "#f43f5e" }}>TDS & debt adjustments</span>
          </div>
        )}

      </div>

      {/* Main Table */}
      <div style={{ marginBottom: "2rem" }}>
        <Table
          headers={["Financial Year", "Party Type", "Party Name", "Closing Balance", "Amount Received", "TDS", "Outstanding", "Effective From", "Actions"]}
          data={filteredList}
          loading={loading}
          pagination={true}
          defaultEntries={25}
          renderRow={(item) => {
            const isVendor = String(item.partyType || "").toLowerCase().trim() === "vendor";
            return (
              <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "12px 16px", fontWeight: "700", color: "#475569", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                  {item.financialYear}
                </td>

                <td style={{ padding: "12px 16px" }}>
                  <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "4px", fontWeight: "800", backgroundColor: isVendor ? "#f5f3ff" : "#eff6ff", color: isVendor ? "#7c3aed" : "#2563eb" }}>
                    {isVendor ? "VENDOR" : "CLIENT"}
                  </span>
                </td>

                <td style={{ padding: "12px 16px", fontWeight: "700", color: "#1e293b", fontSize: "0.85rem" }}>
                  {item.partyName}
                </td>

                <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "0.85rem" }}>
                  ₹{(Number(item.totalBilledPrior) || 0).toLocaleString("en-IN")}
                </td>

                <td style={{ padding: "12px 16px", color: "#10b981", fontWeight: "600", fontSize: "0.85rem" }}>
                  ₹{(Number(item.totalPaidPrior) || 0).toLocaleString("en-IN")}
                </td>

                <td style={{ padding: "12px 16px", color: "#d97706", fontWeight: "600", fontSize: "0.85rem" }}>
                  ₹{(Number(item.totalTdsPrior) || 0).toLocaleString("en-IN")}
                </td>

                <td style={{ padding: "12px 16px", fontWeight: "900", color: (Number(item.openingOutstanding) || 0) > 0 ? (isVendor ? "#7c3aed" : "#ef4444") : "#10b981", fontSize: "0.95rem" }}>
                  ₹{(Number(item.openingOutstanding) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>

                <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                  {formatDate(item.effectiveFrom || "2026-04-01")}
                </td>

                <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                  <div style={{ display: "inline-flex", flexDirection: "row", flexWrap: "nowrap", gap: "6px", alignItems: "center" }}>
                    <button
                      onClick={() => handleOpenModal(item)}
                      style={{ background: "rgba(139, 92, 246, 0.1)", border: "none", color: "#7c3aed", cursor: "pointer", padding: "6px", borderRadius: "6px" }}
                      title="Edit Entry"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{ background: "rgba(239, 68, 68, 0.1)", border: "none", color: "#dc2626", cursor: "pointer", padding: "6px", borderRadius: "6px" }}
                      title="Delete Entry"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          }}
        />
      </div>

      {/* Manual Add / Edit Modal */}
      {modalOpen && typeof document !== "undefined" && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal-dialog-card">
            <div className="modal-header-section">
              <div>
                <h3 style={{ fontSize: "1.15rem", color: "#0f172a", fontWeight: "700", margin: 0 }}>
                  {editingId ? "Edit Opening Balance" : "Add Opening Outstanding"}
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.75rem", margin: "2px 0 0 0" }}>
                  Reference starting balance carried forward from prior financial year.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="modal-form-container">
              <div className="modal-body-section">
                {/* Party Type */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem" }}>PARTY TYPE *</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, partyType: "Client", partyName: "" })}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "8px",
                        border: formData.partyType === "Client" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                        backgroundColor: formData.partyType === "Client" ? "#eff6ff" : "#fff",
                        color: formData.partyType === "Client" ? "#1d4ed8" : "#475569",
                        fontWeight: "700",
                        fontSize: "0.8rem",
                        cursor: "pointer"
                      }}
                    >
                      👤 Client (Sales)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, partyType: "Vendor", partyName: "" })}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "8px",
                        border: formData.partyType === "Vendor" ? "2px solid #7c3aed" : "1px solid #cbd5e1",
                        backgroundColor: formData.partyType === "Vendor" ? "#f5f3ff" : "#fff",
                        color: formData.partyType === "Vendor" ? "#6d28d9" : "#475569",
                        fontWeight: "700",
                        fontSize: "0.8rem",
                        cursor: "pointer"
                      }}
                    >
                      🏢 Vendor (Purchases)
                    </button>
                  </div>
                </div>

                {/* Party Name */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem" }}>
                    {formData.partyType === "Client" ? "CLIENT NAME *" : "VENDOR NAME *"}
                  </label>
                  <input
                    type="text"
                    required
                    list="partyListDatalist"
                    placeholder="Type or select party..."
                    value={formData.partyName}
                    onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                  <datalist id="partyListDatalist">
                    {(formData.partyType === "Client" ? clients : vendors).map((p) => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                </div>

                {/* Financial Year */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem" }}>FINANCIAL YEAR *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2026-2027"
                      value={formData.financialYear}
                      onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem" }}>EFFECTIVE FROM</label>
                    <input
                      type="date"
                      value={formData.effectiveFrom}
                      onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                </div>

                {/* Closing Balance (Prior Invoiced) Amount */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem" }}>
                      CLOSING BALANCE (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Total closing balance before 31 March"
                      value={formData.totalBilledPrior}
                      onChange={(e) => {
                        const val = e.target.value;
                        const billed = parseFloat(val) || 0;
                        const paid = parseFloat(formData.totalPaidPrior) || 0;
                        const tds = parseFloat(formData.totalTdsPrior) || 0;
                        const debt = parseFloat(formData.totalDebtPrior) || 0;
                        const calculatedOutstanding = Math.max(0, billed - paid - tds - debt);
                        setFormData({
                          ...formData,
                          totalBilledPrior: val,
                          openingOutstanding: calculatedOutstanding > 0 ? String(calculatedOutstanding) : String(billed)
                        });
                      }}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1.5px solid #0284c7", fontWeight: "700", color: "#0369a1" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem" }}>
                      AMOUNT RECEIVED (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount received before 31 Mar"
                      value={formData.totalPaidPrior}
                      onChange={(e) => {
                        const val = e.target.value;
                        const paid = parseFloat(val) || 0;
                        const billed = parseFloat(formData.totalBilledPrior) || 0;
                        const tds = parseFloat(formData.totalTdsPrior) || 0;
                        const debt = parseFloat(formData.totalDebtPrior) || 0;
                        const calculatedOutstanding = Math.max(0, billed - paid - tds - debt);
                        setFormData({
                          ...formData,
                          totalPaidPrior: val,
                          openingOutstanding: billed > 0 ? String(calculatedOutstanding) : formData.openingOutstanding
                        });
                      }}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                </div>

                {/* TDS and Bad Debt */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem" }}>
                      TDS (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="TDS before 31 Mar"
                      value={formData.totalTdsPrior}
                      onChange={(e) => {
                        const val = e.target.value;
                        const tds = parseFloat(val) || 0;
                        const billed = parseFloat(formData.totalBilledPrior) || 0;
                        const paid = parseFloat(formData.totalPaidPrior) || 0;
                        const debt = parseFloat(formData.totalDebtPrior) || 0;
                        const calculatedOutstanding = Math.max(0, billed - paid - tds - debt);
                        setFormData({
                          ...formData,
                          totalTdsPrior: val,
                          openingOutstanding: billed > 0 ? String(calculatedOutstanding) : formData.openingOutstanding
                        });
                      }}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem" }}>
                      BAD DEBT / DEBIT (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Bad debts before 31 Mar"
                      value={formData.totalDebtPrior}
                      onChange={(e) => {
                        const val = e.target.value;
                        const debt = parseFloat(val) || 0;
                        const billed = parseFloat(formData.totalBilledPrior) || 0;
                        const paid = parseFloat(formData.totalPaidPrior) || 0;
                        const tds = parseFloat(formData.totalTdsPrior) || 0;
                        const calculatedOutstanding = Math.max(0, billed - paid - tds - debt);
                        setFormData({
                          ...formData,
                          totalDebtPrior: val,
                          openingOutstanding: billed > 0 ? String(calculatedOutstanding) : formData.openingOutstanding
                        });
                      }}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                </div>

                {/* Outstanding Amount */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem" }}>
                    OUTSTANDING (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Net outstanding balance from prior year"
                    value={formData.openingOutstanding}
                    onChange={(e) => setFormData({ ...formData, openingOutstanding: e.target.value })}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1.5px solid #3b82f6", fontWeight: "700", color: "#1d4ed8" }}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem" }}>NOTES / REFERENCE</label>
                  <input
                    type="text"
                    placeholder="e.g. Audited balance as of 31-03-2026..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>
              </div>

              <div className="modal-footer-section">
                <button type="button" onClick={() => setModalOpen(false)} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "0.45rem 1rem", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem", color: "#475569" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#fff", border: "none", padding: "0.45rem 1.5rem", borderRadius: "8px", cursor: saving ? "not-allowed" : "pointer", fontWeight: "700", fontSize: "0.85rem" }}>
                  {saving ? "Saving..." : (editingId ? "Update Balance" : "Save Balance")}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Close Financial Year Action Modal */}
      {closeFYModalOpen && typeof document !== "undefined" && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setCloseFYModalOpen(false); }}>
          <div className="modal-dialog-card" style={{ maxWidth: "560px" }}>
            <div className="modal-header-section" style={{ backgroundColor: "#fef3c7" }}>
              <div>
                <h3 style={{ fontSize: "1.15rem", color: "#92400e", fontWeight: "800", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                  <Calendar size={18} /> Close Financial Year & Migrate Balances
                </h3>
                <p style={{ color: "#b45309", fontSize: "0.75rem", margin: "2px 0 0 0" }}>
                  Freeze prior year outstandings and start the new financial year clean.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCloseFYModalOpen(false)}
                style={{ background: "#fef3c7", border: "none", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#92400e" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleExecuteCloseFY} className="modal-form-container">
              <div className="modal-body-section">
                {/* Notice Box */}
                <div style={{ padding: "0.75rem", borderRadius: "8px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", fontSize: "0.8rem", color: "#1e3a8a", lineHeight: "1.4" }}>
                  <strong>Smart Archival & Unbilled Protection:</strong>
                  <ul style={{ margin: "6px 0 0 1rem", padding: 0 }}>
                    <li>Computes net balance up to Cutoff Date and carries it forward to Opening Balances.</li>
                    <li>Deletes completed bills and paid AWBs on or before cutoff.</li>
                    <li><strong>Unbilled / Pending AWBs are strictly preserved</strong> so you can still bill them in the new financial year!</li>
                  </ul>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem" }}>CUTOFF DATE *</label>
                    <input
                      type="date"
                      required
                      value={closeFYData.cutoffDate}
                      onChange={(e) => setCloseFYData({ ...closeFYData, cutoffDate: e.target.value })}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem" }}>NEW TARGET FY *</label>
                    <input
                      type="text"
                      required
                      value={closeFYData.targetFY}
                      onChange={(e) => setCloseFYData({ ...closeFYData, targetFY: e.target.value })}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                </div>

                {/* Pre-close Export Button */}
                <div style={{ padding: "0.75rem", borderRadius: "8px", backgroundColor: exportedBackup ? "#f0fdf4" : "#fef3c7", border: `1px solid ${exportedBackup ? "#bbf7d0" : "#fde68a"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "0.8rem", color: exportedBackup ? "#14532d" : "#78350f" }}>
                      {exportedBackup ? "✅ Backup Exported Successfully" : "⚠️ Step 1: Export Backup Report"}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: exportedBackup ? "#15803d" : "#92400e" }}>
                      Download full closing ledger report before purging.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#fff", color: "#1e293b", fontWeight: "700", fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Download size={14} /> Export Backup
                  </button>
                </div>
              </div>

              <div className="modal-footer-section">
                <button type="button" onClick={() => setCloseFYModalOpen(false)} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "0.45rem 1rem", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem", color: "#475569" }}>
                  Cancel
                </button>
                <button type="submit" disabled={closingFY} style={{ background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", color: "#fff", border: "none", padding: "0.45rem 1.5rem", borderRadius: "8px", cursor: closingFY ? "not-allowed" : "pointer", fontWeight: "700", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  {closingFY ? "Closing Financial Year..." : "Execute FY Close & Reset"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default OpeningOutstanding;
