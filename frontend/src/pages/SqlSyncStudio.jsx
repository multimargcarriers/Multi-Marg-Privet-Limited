import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Database, 
  RefreshCw, 
  CheckCircle, 
  CheckCircle2,
  AlertTriangle, 
  AlertCircle, 
  ArrowRight, 
  Calendar, 
  Check, 
  X, 
  Layers, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Download, 
  Play, 
  RotateCcw,
  SlidersHorizontal,
  Package,
  Truck,
  Receipt,
  ShoppingCart,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  Zap,
  Sparkles
} from "lucide-react";
import { useToast } from "../context/ToastContext";

const API_BASE = import.meta.env.VITE_API_URL || "";

const SqlSyncStudio = () => {
  const toastCtx = useToast();
  const showToast = (msg, type) => {
    if (toastCtx && typeof toastCtx.addToast === "function") {
      toastCtx.addToast(msg, type);
    } else if (toastCtx && typeof toastCtx.showToast === "function") {
      toastCtx.showToast(msg, type);
    } else {
      console.log(`[Toast ${type}]:`, msg);
    }
  };

  // Sync Entity Switcher: "AWB" | "BILLS" | "PURCHASES" | "VENDOR_PAYMENTS" | "CLIENT_PAYMENTS"
  const [syncEntity, setSyncEntity] = useState("AWB");

  // Date filters
  const [fromDate, setFromDate] = useState("2026-08-01");
  const [toDate, setToDate] = useState("");
  const [datePreset, setDatePreset] = useState("THIS_MONTH");

  // Connection status
  const [connStatus, setConnStatus] = useState({ mysql: { ok: false, message: "" }, mongodb: { ok: false, message: "" } });
  const [testingConn, setTestingConn] = useState(false);

  // Tally state
  const [loadingTally, setLoadingTally] = useState(false);
  const [tallyData, setTallyData] = useState(null);
  const [activeTab, setActiveTab] = useState("MISSING"); // "MISSING" | "DIFF" | "MATCHED"

  // Search & Filter within results
  const [searchTerm, setSearchTerm] = useState("");
  const [mismatchTypeFilter, setMismatchTypeFilter] = useState("ALL");
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [expandedItem, setExpandedItem] = useState(null);

  // Professional Sync Modal State
  const [syncModal, setSyncModal] = useState({
    isOpen: false,
    mode: "missing_only",
    targetItems: null,
    count: 0,
    step: "confirm", // "confirm" | "progress" | "result"
    result: null,
    error: null
  });

  // Quick Date Presets
  const applyPreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === "TODAY") {
      setFromDate(fmt(now));
      setToDate(fmt(now));
    } else if (preset === "YESTERDAY") {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      setFromDate(fmt(y));
      setToDate(fmt(y));
    } else if (preset === "LAST_7_DAYS") {
      const d7 = new Date(now);
      d7.setDate(now.getDate() - 7);
      setFromDate(fmt(d7));
      setToDate(fmt(now));
    } else if (preset === "THIS_MONTH") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(fmt(first));
      setToDate(fmt(now));
    } else if (preset === "ALL_TIME") {
      setFromDate("");
      setToDate("");
    }
  };

  // Test database connections
  const checkConnections = async () => {
    setTestingConn(true);
    try {
      const res = await axios.get(`${API_BASE}/api/sql-sync/test`);
      setConnStatus(res.data);
      if (res.data.mysql.ok && res.data.mongodb.ok) {
        showToast("Connected to MySQL & MongoDB databases successfully", "success");
      } else {
        showToast("Connection issue: " + (res.data.mysql.message || res.data.mongodb.message), "warning");
      }
    } catch (err) {
      setConnStatus({
        mysql: { ok: false, message: err.message },
        mongodb: { ok: false, message: "Failed to connect to backend" }
      });
      showToast("Failed to reach sync endpoints: " + err.message, "error");
    } finally {
      setTestingConn(false);
    }
  };

  const [syncingBillingStatus, setSyncingBillingStatus] = useState(false);

  const handleSyncBillingStatus = async () => {
    setSyncingBillingStatus(true);
    try {
      const res = await axios.post(`${API_BASE}/api/sql-sync/sync-unbilled`);
      showToast(
        `Successfully synced billing status: ${res.data.updatedBookings} of ${res.data.totalBookings} bookings corrected!`,
        "success"
      );
    } catch (err) {
      showToast("Sync failed: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setSyncingBillingStatus(false);
    }
  };

  useEffect(() => {
    checkConnections();
  }, []);

  // Helper for current entity label
  const getEntityLabel = (ent = syncEntity) => {
    if (ent === "AWB") return "AWBs & Bookings";
    if (ent === "BILLS") return "Sales Bills";
    if (ent === "PURCHASES") return "Vendor Purchases";
    if (ent === "VENDOR_PAYMENTS") return "Vendor Payments";
    if (ent === "CLIENT_PAYMENTS") return "Client Payments";
    return "Records";
  };

  // Run Tally
  const runTally = async (targetEntity = syncEntity) => {
    setLoadingTally(true);
    setSelectedItems(new Set());
    setExpandedItem(null);
    try {
      let endpoint = "/api/sql-sync/tally";
      if (targetEntity === "BILLS") endpoint = "/api/sql-sync/tally-bills";
      else if (targetEntity === "PURCHASES") endpoint = "/api/sql-sync/tally-purchases";
      else if (targetEntity === "VENDOR_PAYMENTS") endpoint = "/api/sql-sync/tally-vendor-payments";
      else if (targetEntity === "CLIENT_PAYMENTS") endpoint = "/api/sql-sync/tally-client-payments";

      const res = await axios.post(`${API_BASE}${endpoint}`, {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      });
      setTallyData(res.data);
      if (res.data.summary.missingInMongoCount > 0) {
        setActiveTab("MISSING");
      } else if (res.data.summary.differentCount > 0) {
        setActiveTab("DIFF");
      } else {
        setActiveTab("MATCHED");
      }
      showToast(
        `${getEntityLabel(targetEntity)} Tally complete: ${res.data.summary.totalInSql} SQL, ${res.data.summary.missingInMongoCount} Missing, ${res.data.summary.differentCount} Differ`,
        "info"
      );
    } catch (err) {
      showToast("Tally failed: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setLoadingTally(false);
    }
  };

  // Auto run tally when entity changes
  useEffect(() => {
    setTallyData(null);
    setSelectedItems(new Set());
    setMismatchTypeFilter("ALL");
    setSearchTerm("");
    runTally(syncEntity);
  }, [syncEntity]);

  // Selection handlers
  const getItemKey = (item) => {
    if (syncEntity === "VENDOR_PAYMENTS" || syncEntity === "CLIENT_PAYMENTS") return item.pid || item.sqlRecord?.pid;
    if (syncEntity === "PURCHASES") return item.billNo || item.bill || item.sqlRecord?.billNo;
    if (syncEntity === "BILLS") return item.invoice || item.billNo || item.sqlBill?.invoice;
    return item.awb || item.sqlRecord?.awb;
  };

  const handleSelectAll = (items) => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(it => getItemKey(it))));
    }
  };

  const handleToggleItem = (key) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Open Professional Sync Dialog Modal
  const openSyncDialog = (mode, specificItems = null) => {
    let targetItems = null;
    let countToSync = 0;

    if (specificItems && specificItems.length > 0) {
      targetItems = specificItems;
      countToSync = specificItems.length;
    } else if (selectedItems.size > 0) {
      targetItems = Array.from(selectedItems);
      countToSync = selectedItems.size;
    } else {
      if (mode === "missing_only") {
        countToSync = tallyData?.summary?.missingInMongoCount || 0;
      } else if (mode === "update_all" || mode === "update_existing") {
        countToSync = tallyData?.summary?.differentCount || 0;
        targetItems = (tallyData?.discrepancies || []).map(d => getItemKey(d));
      }
    }

    if (countToSync === 0) {
      showToast(`No records to synchronize for this action.`, "warning");
      return;
    }

    setSyncModal({
      isOpen: true,
      mode,
      targetItems,
      count: countToSync,
      step: "confirm",
      result: null,
      error: null
    });
  };

  // Execute Sync from Modal
  const confirmExecuteSync = async () => {
    setSyncModal(prev => ({ ...prev, step: "progress", error: null }));
    try {
      let endpoint = "/api/sql-sync/sync";
      let payloadKey = "selectedAwbs";

      if (syncEntity === "BILLS") {
        endpoint = "/api/sql-sync/sync-bills";
        payloadKey = "selectedBills";
      } else if (syncEntity === "PURCHASES") {
        endpoint = "/api/sql-sync/sync-purchases";
        payloadKey = "selectedPurchases";
      } else if (syncEntity === "VENDOR_PAYMENTS") {
        endpoint = "/api/sql-sync/sync-vendor-payments";
        payloadKey = "selectedPayments";
      } else if (syncEntity === "CLIENT_PAYMENTS") {
        endpoint = "/api/sql-sync/sync-client-payments";
        payloadKey = "selectedPayments";
      }

      const res = await axios.post(`${API_BASE}${endpoint}`, {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        [payloadKey]: syncModal.targetItems,
        syncMode: syncModal.mode
      });

      setSyncModal(prev => ({
        ...prev,
        step: "result",
        result: res.data
      }));

      showToast(`Sync completed: ${res.data.inserted} inserted, ${res.data.updated} updated`, "success");
    } catch (err) {
      setSyncModal(prev => ({
        ...prev,
        step: "result",
        error: err.response?.data?.error || err.message
      }));
      showToast("Sync encountered an error: " + (err.response?.data?.error || err.message), "error");
    }
  };

  const handleCloseModal = async () => {
    const shouldRefresh = syncModal.step === "result" && !syncModal.error;
    setSyncModal(prev => ({ ...prev, isOpen: false }));
    if (shouldRefresh) {
      await runTally();
    }
  };

  // Compute Mismatch Categories breakdown dynamically
  const mismatchCategoryCounts = useMemo(() => {
    if (!tallyData?.discrepancies) return { ALL: 0, QUANTITY: 0, INVOICE_VALUE: 0, INVOICE_ROWS: 0, EWAY_BILL: 0, WEIGHT: 0, PARTY: 0, ROUTE: 0, DATE: 0, TOTAL_AMOUNT: 0, RATE: 0 };
    const counts = { ALL: tallyData.discrepancies.length, QUANTITY: 0, INVOICE_VALUE: 0, INVOICE_ROWS: 0, EWAY_BILL: 0, WEIGHT: 0, PARTY: 0, ROUTE: 0, DATE: 0, TOTAL_AMOUNT: 0, RATE: 0 };
    
    for (const item of tallyData.discrepancies) {
      const diffs = item.diffs || [];
      let hasQty = false, hasVal = false, hasRows = false, hasEway = false, hasWeight = false, hasParty = false, hasRoute = false, hasDate = false, hasTot = false, hasRate = false;
      
      for (const d of diffs) {
        const f = String(d.field || "").toLowerCase();
        const col = String(d.column || "").toLowerCase();
        
        if (f.includes("quantity") || col.includes("quantity") || f === "box" || col.includes("boxes")) hasQty = true;
        if (f.includes("value") || col.includes("value") || f === "gst") hasVal = true;
        if (f.includes("item_count") || f.includes("invoice_count") || col.includes("invoice rows") || col.includes("total line items") || col.includes("total invoice")) hasRows = true;
        if (f.includes("eway") || col.includes("eway") || col.includes("e-way")) hasEway = true;
        if (f.includes("wt") || col.includes("weight")) hasWeight = true;
        if (f === "client" || f === "consignor" || f === "consignee" || f === "vendor" || col.includes("client") || col.includes("vendor") || col.includes("party")) hasParty = true;
        if (f === "origin" || f === "destination" || col.includes("origin") || col.includes("destination") || col.includes("route")) hasRoute = true;
        if (f === "date" || col.includes("date")) hasDate = true;
        if (f === "total" || col.includes("total amount") || col.includes("subtotal")) hasTot = true;
        if (f.includes("rate") || col.includes("rate") || f.includes("frieght") || col.includes("freight")) hasRate = true;
      }
      
      if (hasQty) counts.QUANTITY++;
      if (hasVal) counts.INVOICE_VALUE++;
      if (hasRows) counts.INVOICE_ROWS++;
      if (hasEway) counts.EWAY_BILL++;
      if (hasWeight) counts.WEIGHT++;
      if (hasParty) counts.PARTY++;
      if (hasRoute) counts.ROUTE++;
      if (hasDate) counts.DATE++;
      if (hasTot) counts.TOTAL_AMOUNT++;
      if (hasRate) counts.RATE++;
    }
    return counts;
  }, [tallyData]);

  // Filter items in active tab based on live search and mismatch type
  const filteredList = useMemo(() => {
    if (!tallyData) return [];
    let list = [];
    if (activeTab === "MISSING") list = tallyData.missingInMongo || [];
    else if (activeTab === "DIFF") {
      list = tallyData.discrepancies || [];
      if (mismatchTypeFilter !== "ALL") {
        list = list.filter(item => {
          const diffs = item.diffs || [];
          return diffs.some(d => {
            const f = String(d.field || "").toLowerCase();
            const col = String(d.column || "").toLowerCase();
            if (mismatchTypeFilter === "QUANTITY") return f.includes("quantity") || col.includes("quantity") || f === "box" || col.includes("boxes");
            if (mismatchTypeFilter === "INVOICE_VALUE") return f.includes("value") || col.includes("value") || f === "gst";
            if (mismatchTypeFilter === "INVOICE_ROWS") return f.includes("item_count") || f.includes("invoice_count") || col.includes("invoice rows") || col.includes("total line items");
            if (mismatchTypeFilter === "EWAY_BILL") return f.includes("eway") || col.includes("eway") || col.includes("e-way");
            if (mismatchTypeFilter === "WEIGHT") return f.includes("wt") || col.includes("weight");
            if (mismatchTypeFilter === "PARTY") return f === "client" || f === "consignor" || f === "consignee" || f === "vendor" || col.includes("client") || col.includes("vendor") || col.includes("party");
            if (mismatchTypeFilter === "ROUTE") return f === "origin" || f === "destination" || col.includes("origin") || col.includes("destination") || col.includes("route");
            if (mismatchTypeFilter === "DATE") return f === "date" || col.includes("date");
            if (mismatchTypeFilter === "TOTAL_AMOUNT") return f === "total" || col.includes("total amount") || col.includes("subtotal");
            if (mismatchTypeFilter === "RATE") return f.includes("rate") || col.includes("rate") || f.includes("frieght") || col.includes("freight");
            return false;
          });
        });
      }
    }
    else if (activeTab === "MATCHED") list = tallyData.matched || [];

    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase().trim();

    return list.filter(item => {
      const idKey = String(getItemKey(item) || "");
      const party = String(item.client || item.vendor || item.sqlRecord?.client || item.sqlRecord?.vendor || item.sqlBill?.client || item.mongoRecord?.client || item.mongoRecord?.vendor || item.mongoBill?.client || "");
      const origin = String(item.origin || item.sqlRecord?.origin || item.sqlBill?.origin || "");
      const destination = String(item.destination || item.sqlRecord?.destination || item.sqlBill?.destination || "");
      
      if (idKey.toLowerCase().includes(q) || party.toLowerCase().includes(q) || origin.toLowerCase().includes(q) || destination.toLowerCase().includes(q)) {
        return true;
      }

      // Match inside differences
      if (item.diffs && Array.isArray(item.diffs)) {
        const hasDiffMatch = item.diffs.some(d => 
          String(d.column || "").toLowerCase().includes(q) ||
          String(d.field || "").toLowerCase().includes(q) ||
          String(d.type || "").toLowerCase().includes(q) ||
          String(d.sql || "").toLowerCase().includes(q) ||
          String(d.mongo || "").toLowerCase().includes(q)
        );
        if (hasDiffMatch) return true;
      }

      // Match inside invoice / bill line items
      const invs = item.invoiceDetails || item.sqlRecord?.invoiceDetails || item.items || item.sqlBill?.items || [];
      if (Array.isArray(invs)) {
        const hasInvMatch = invs.some(inv => 
          String(inv.invoiceNo || "").toLowerCase().includes(q) ||
          String(inv.partNumber || "").toLowerCase().includes(q) ||
          String(inv.ewayBill || "").toLowerCase().includes(q) ||
          String(inv.quantity || "").toLowerCase().includes(q) ||
          String(inv.awb || "").toLowerCase().includes(q) ||
          String(inv.lrNo || "").toLowerCase().includes(q)
        );
        if (hasInvMatch) return true;
      }

      return false;
    });
  }, [tallyData, activeTab, mismatchTypeFilter, searchTerm, syncEntity]);

  return (
    <div className="sync-studio-container" style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "1.25rem", boxSizing: "border-box" }}>
      
      {/* RESPONSIVE CSS STYLES FOR ALL VIEWPORTS */}
      <style>{`
        @media (max-width: 640px) {
          .sync-studio-container {
            padding: 0.5rem !important;
          }
          .sync-header-box {
            padding: 0.85rem !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.75rem !important;
          }
          .sync-entity-switcher {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            width: 100% !important;
            gap: 4px !important;
          }
          .sync-entity-switcher button {
            justify-content: center !important;
            padding: 0.5rem 0.4rem !important;
            font-size: 0.75rem !important;
          }
          .sync-filters-grid {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .sync-filters-grid > div {
            width: 100% !important;
          }
          .sync-filters-grid input {
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .sync-tally-btn {
            width: 100% !important;
            justify-content: center !important;
          }
          .financial-impact-banner {
            padding: 0.9rem !important;
          }
          .financial-impact-values {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.65rem !important;
            width: 100% !important;
          }
          .financial-arrow {
            display: none !important;
          }
          .stats-cards-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 0.5rem !important;
          }
          .stats-cards-grid > div {
            padding: 0.75rem !important;
          }
          .sync-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .sync-toolbar-tabs {
            width: 100% !important;
            display: flex !important;
          }
          .sync-toolbar-tabs button {
            flex: 1 !important;
            justify-content: center !important;
            font-size: 0.7rem !important;
            padding: 0.4rem 0.3rem !important;
          }
          .sync-search-actions {
            width: 100% !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .sync-search-input {
            width: 100% !important;
          }
          .sync-modal-dialog {
            max-width: 95vw !important;
            margin: 0.5rem !important;
            max-height: 92vh !important;
          }
        }

        @media (min-width: 641px) and (max-width: 1024px) {
          .sync-entity-switcher {
            display: flex !important;
            flex-wrap: wrap !important;
          }
          .stats-cards-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>

      {/* HEADER BAR & 4-WAY ENTITY SWITCHER */}
      <div 
        className="sync-header-box"
        style={{
          background: "white",
          borderRadius: "14px",
          padding: "1.25rem 1.5rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
          marginBottom: "1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: "240px" }}>
          <div style={{ background: "#f0f9ff", padding: "10px", borderRadius: "10px", display: "flex" }}>
            <Database size={24} color="#0284c7" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0, color: "#0f172a" }}>
                MySQL → MongoDB Sync Studio
              </h2>
              <span style={{ background: "#e0f2fe", color: "#0369a1", fontSize: "0.7rem", fontWeight: 800, padding: "2px 8px", borderRadius: "12px", border: "1px solid #bae6fd" }}>
                ADMIN TOOL
              </span>
            </div>
            <p style={{ color: "#64748b", fontSize: "0.78rem", margin: "2px 0 0 0" }}>
              Tally trips, bills, purchases & vendor payments with automated accounting.
            </p>
          </div>
        </div>

        {/* 5-WAY ENTITY TOGGLE BUTTONS */}
        <div className="sync-entity-switcher" style={{ display: "flex", background: "#f1f5f9", padding: "4px", borderRadius: "10px", border: "1px solid #e2e8f0", flexWrap: "wrap", gap: "2px" }}>
          {[
            { key: "AWB", label: "1. AWBs & Trips", icon: <Package size={14} /> },
            { key: "BILLS", label: "2. Sales Invoices", icon: <Receipt size={14} /> },
            { key: "PURCHASES", label: "3. Vendor Purchases", icon: <ShoppingCart size={14} /> },
            { key: "VENDOR_PAYMENTS", label: "4. Vendor Vouchers", icon: <CreditCard size={14} /> },
            { key: "CLIENT_PAYMENTS", label: "5. Client Vouchers", icon: <CreditCard size={14} /> }
          ].map(tab => {
            const isSelected = syncEntity === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSyncEntity(tab.key)}
                style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: "7px",
                  border: "none",
                  background: isSelected ? "#0284c7" : "transparent",
                  color: isSelected ? "white" : "#475569",
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? "0 2px 4px rgba(2,132,199,0.25)" : "none"
                }}
              >
                {tab.icon} {tab.label}
              </button>
            );
          })}
        </div>

        {/* CONNECTION STATUS PILLS */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <div 
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 10px",
              borderRadius: "8px",
              fontSize: "0.75rem",
              fontWeight: 600,
              background: connStatus.mysql.ok ? "#f0fdf4" : "#fef2f2",
              color: connStatus.mysql.ok ? "#166534" : "#991b1b",
              border: `1px solid ${connStatus.mysql.ok ? "#bbf7d0" : "#fecaca"}`
            }}
            title={connStatus.mysql.message}
          >
            {connStatus.mysql.ok ? <CheckCircle size={14} color="#16a34a" /> : <AlertCircle size={14} color="#dc2626" />}
            <span>MySQL: {connStatus.mysql.ok ? "Connected" : "Disconnected"}</span>
          </div>

          <div 
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 10px",
              borderRadius: "8px",
              fontSize: "0.75rem",
              fontWeight: 600,
              background: connStatus.mongodb.ok ? "#f0fdf4" : "#fef2f2",
              color: connStatus.mongodb.ok ? "#166534" : "#991b1b",
              border: `1px solid ${connStatus.mongodb.ok ? "#bbf7d0" : "#fecaca"}`
            }}
            title={connStatus.mongodb.message}
          >
            {connStatus.mongodb.ok ? <CheckCircle size={14} color="#16a34a" /> : <AlertCircle size={14} color="#dc2626" />}
            <span>MongoDB: {connStatus.mongodb.ok ? "Connected" : "Disconnected"}</span>
          </div>

          <button
            type="button"
            onClick={checkConnections}
            disabled={testingConn}
            style={{
              background: "white",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "5px 8px",
              cursor: "pointer",
              color: "#475569",
              display: "flex",
              alignItems: "center"
            }}
            title="Re-check connections"
          >
            <RefreshCw size={13} className={testingConn ? "spin-animation" : ""} />
          </button>

          <button
            type="button"
            onClick={handleSyncBillingStatus}
            disabled={syncingBillingStatus}
            style={{
              background: "#0284c7",
              border: "1px solid #0284c7",
              borderRadius: "8px",
              padding: "5px 12px",
              cursor: "pointer",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.75rem",
              fontWeight: 600
            }}
            title="Sync all unbilled bookings status from SQL"
          >
            <RefreshCw size={13} className={syncingBillingStatus ? "spin-animation" : ""} />
            <span>{syncingBillingStatus ? "Syncing..." : "Sync Billing Status"}</span>
          </button>
        </div>
      </div>

      {/* FILTER & TALLY CONTROLS CARD */}
      <div 
        style={{
          background: "white",
          borderRadius: "14px",
          padding: "1.25rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
          marginBottom: "1.25rem"
        }}
      >
        <div className="sync-filters-grid" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          {/* Date Range Inputs */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", width: "100%", maxWidth: "800px" }}>
            <div style={{ flex: "1 1 140px" }}>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", marginBottom: "4px", textTransform: "uppercase" }}>
                From Date
              </label>
              <div style={{ position: "relative" }}>
                <input 
                  type="date"
                  value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setDatePreset("CUSTOM"); }}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "0.45rem 0.75rem",
                    paddingLeft: "2rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    outline: "none",
                    background: "#f8fafc",
                    color: "#0f172a"
                  }}
                />
                <Calendar size={14} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              </div>
            </div>

            <div style={{ flex: "1 1 140px" }}>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", marginBottom: "4px", textTransform: "uppercase" }}>
                To Date (Optional)
              </label>
              <div style={{ position: "relative" }}>
                <input 
                  type="date"
                  value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setDatePreset("CUSTOM"); }}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "0.45rem 0.75rem",
                    paddingLeft: "2rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    outline: "none",
                    background: "#f8fafc",
                    color: "#0f172a"
                  }}
                />
                <Calendar size={14} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              </div>
            </div>

            {/* Quick Presets */}
            <div style={{ flex: "2 1 240px" }}>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", marginBottom: "4px", textTransform: "uppercase" }}>
                Quick Presets
              </label>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {[
                  { key: "THIS_MONTH", label: "This Month" },
                  { key: "LAST_7_DAYS", label: "Last 7 Days" },
                  { key: "TODAY", label: "Today" },
                  { key: "ALL_TIME", label: "All Time" }
                ].map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p.key)}
                    style={{
                      padding: "0.45rem 0.65rem",
                      borderRadius: "6px",
                      border: "1px solid",
                      borderColor: datePreset === p.key ? "#0284c7" : "#e2e8f0",
                      background: datePreset === p.key ? "#f0f9ff" : "white",
                      color: datePreset === p.key ? "#0284c7" : "#475569",
                      fontSize: "0.78rem",
                      fontWeight: datePreset === p.key ? 700 : 500,
                      cursor: "pointer"
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Run Tally Button */}
          <div style={{ flexShrink: 0 }}>
            <button
              className="sync-tally-btn"
              type="button"
              onClick={() => runTally()}
              disabled={loadingTally}
              style={{
                backgroundColor: "#0284c7",
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "0.65rem 1.4rem",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: loadingTally ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 2px 6px rgba(2, 132, 199, 0.25)",
                transition: "all 0.2s ease"
              }}
            >
              <RefreshCw size={16} className={loadingTally ? "spin-animation" : ""} />
              {loadingTally ? `Tallying ${getEntityLabel()}...` : `Tally ${getEntityLabel()} with MySQL`}
            </button>
          </div>
        </div>
      </div>

      {/* SUMMARY STATS & TABS */}
      {tallyData && (
        <>
          {/* FINANCIAL IMPACT & VALUE DELTA SUMMARY CARD */}
          {tallyData.summary.financialImpact && (
            <div 
              className="financial-impact-banner"
              style={{ 
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", 
                borderRadius: "14px", 
                padding: "1.25rem 1.5rem", 
                marginBottom: "1.25rem",
                color: "white",
                boxShadow: "0 4px 15px rgba(15, 23, 42, 0.15)",
                border: "1px solid #334155"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: "6px", fontWeight: 800, color: "#93c5fd" }}>
                      FINANCIAL IMPACT ANALYSIS
                    </span>
                    <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                      {tallyData.summary.financialImpact.label || "Value Breakdown"}
                    </span>
                  </div>
                  <h3 style={{ margin: "6px 0 0 0", fontSize: "1.15rem", fontWeight: 800 }}>
                    Financial Delta if you Approve & Synchronize:
                  </h3>
                </div>

                <div className="financial-impact-values" style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  {/* Current DB Value */}
                  <div>
                    <span style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                      Current MongoDB Value
                    </span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#f1f5f9" }}>
                      ₹{Math.round(tallyData.summary.financialImpact.currentMongoTotal).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="financial-arrow" style={{ color: "#64748b", fontSize: "1.2rem", fontWeight: 300, display: "flex", alignItems: "center" }}>
                    →
                  </div>

                  {/* Target SQL Value */}
                  <div>
                    <span style={{ fontSize: "0.7rem", color: "#93c5fd", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                      Target MySQL Value
                    </span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#38bdf8" }}>
                      ₹{Math.round(tallyData.summary.financialImpact.targetSqlTotal).toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Net Delta / Difference */}
                  <div 
                    style={{ 
                      background: tallyData.summary.financialImpact.netDifference >= 0 ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                      border: `1px solid ${tallyData.summary.financialImpact.netDifference >= 0 ? "#22c55e" : "#ef4444"}`,
                      borderRadius: "10px",
                      padding: "0.5rem 1rem"
                    }}
                  >
                    <span style={{ fontSize: "0.68rem", color: "#cbd5e1", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                      Net Difference if Approved
                    </span>
                    <span 
                      style={{ 
                        fontSize: "1.25rem", 
                        fontWeight: 900, 
                        color: tallyData.summary.financialImpact.netDifference >= 0 ? "#4ade80" : "#f87171" 
                      }}
                    >
                      {tallyData.summary.financialImpact.netDifference >= 0 ? "+" : ""}
                      ₹{Math.round(tallyData.summary.financialImpact.netDifference).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STATS CARDS */}
          <div 
            className="stats-cards-grid"
            style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
              gap: "1rem", 
              marginBottom: "1.25rem" 
            }}
          >
            {/* Card 1: Total in SQL */}
            <div style={{ background: "white", padding: "1.1rem", borderRadius: "12px", border: "1px solid #e2e8f0", borderLeft: "4px solid #0284c7" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                Total in MySQL Source
              </div>
              <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                {tallyData.summary.totalInSql}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#0284c7", marginTop: "2px" }}>
                MySQL database total
              </div>
            </div>

            {/* Card 2: Missing in Mongo */}
            <div 
              onClick={() => setActiveTab("MISSING")}
              style={{ 
                background: activeTab === "MISSING" ? "#fff7ed" : "white", 
                padding: "1.1rem", 
                borderRadius: "12px", 
                border: "1px solid", 
                borderColor: activeTab === "MISSING" ? "#ea580c" : "#fed7aa",
                borderLeft: "4px solid #ea580c",
                cursor: "pointer",
                transition: "all 0.15s"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "#9a3412", fontWeight: 700, textTransform: "uppercase" }}>
                  🚨 Missing in MongoDB
                </span>
                {activeTab === "MISSING" && <span style={{ fontSize: "0.68rem", background: "#ea580c", color: "white", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>ACTIVE</span>}
              </div>
              <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#c2410c", marginTop: "4px" }}>
                {tallyData.summary.missingInMongoCount}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#9a3412", marginTop: "2px" }}>
                Need to feed into Mongo
              </div>
            </div>

            {/* Card 3: Differences */}
            <div 
              onClick={() => setActiveTab("DIFF")}
              style={{ 
                background: activeTab === "DIFF" ? "#f0f9ff" : "white", 
                padding: "1.1rem", 
                borderRadius: "12px", 
                border: "1px solid", 
                borderColor: activeTab === "DIFF" ? "#0284c7" : "#bae6fd",
                borderLeft: "4px solid #0284c7",
                cursor: "pointer",
                transition: "all 0.15s"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "#0369a1", fontWeight: 700, textTransform: "uppercase" }}>
                  ⚠️ Field Differences
                </span>
                {activeTab === "DIFF" && <span style={{ fontSize: "0.68rem", background: "#0284c7", color: "white", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>ACTIVE</span>}
              </div>
              <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#0369a1", marginTop: "4px" }}>
                {tallyData.summary.differentCount}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#0369a1", marginTop: "2px" }}>
                Mismatch in fields/items
              </div>
            </div>

            {/* Card 4: Matched */}
            <div 
              onClick={() => setActiveTab("MATCHED")}
              style={{ 
                background: activeTab === "MATCHED" ? "#f0fdf4" : "white", 
                padding: "1.1rem", 
                borderRadius: "12px", 
                border: "1px solid", 
                borderColor: activeTab === "MATCHED" ? "#16a34a" : "#bbf7d0",
                borderLeft: "4px solid #16a34a",
                cursor: "pointer",
                transition: "all 0.15s"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>
                  ✅ Matched (Exact)
                </span>
                {activeTab === "MATCHED" && <span style={{ fontSize: "0.68rem", background: "#16a34a", color: "white", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>ACTIVE</span>}
              </div>
              <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#15803d", marginTop: "4px" }}>
                {tallyData.summary.exactMatchCount}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#166534", marginTop: "2px" }}>
                100% matched
              </div>
            </div>
          </div>

          {/* MAIN RESULTS DATA CONTAINER */}
          <div style={{ background: "white", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.03)", overflow: "hidden" }}>
            
            {/* TOOLBAR */}
            <div 
              className="sync-toolbar"
              style={{
                padding: "0.85rem 1.25rem",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.75rem"
              }}
            >
              {/* TABS */}
              <div className="sync-toolbar-tabs" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setActiveTab("MISSING")}
                  style={{
                    background: activeTab === "MISSING" ? "#ea580c" : "#f8fafc",
                    color: activeTab === "MISSING" ? "white" : "#475569",
                    border: activeTab === "MISSING" ? "1px solid #ea580c" : "1px solid #e2e8f0",
                    padding: "0.45rem 0.9rem",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  🚨 Missing in MongoDB
                  <span style={{ background: activeTab === "MISSING" ? "rgba(255,255,255,0.25)" : "#fed7aa", color: activeTab === "MISSING" ? "white" : "#c2410c", padding: "1px 6px", borderRadius: "10px", fontSize: "0.72rem" }}>
                    {tallyData.summary.missingInMongoCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("DIFF")}
                  style={{
                    background: activeTab === "DIFF" ? "#0284c7" : "#f8fafc",
                    color: activeTab === "DIFF" ? "white" : "#475569",
                    border: activeTab === "DIFF" ? "1px solid #0284c7" : "1px solid #e2e8f0",
                    padding: "0.45rem 0.9rem",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  ⚠️ Field Differences
                  <span style={{ background: activeTab === "DIFF" ? "rgba(255,255,255,0.25)" : "#bae6fd", color: activeTab === "DIFF" ? "white" : "#0369a1", padding: "1px 6px", borderRadius: "10px", fontSize: "0.72rem" }}>
                    {tallyData.summary.differentCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("MATCHED")}
                  style={{
                    background: activeTab === "MATCHED" ? "#16a34a" : "#f8fafc",
                    color: activeTab === "MATCHED" ? "white" : "#475569",
                    border: activeTab === "MATCHED" ? "1px solid #16a34a" : "1px solid #e2e8f0",
                    padding: "0.45rem 0.9rem",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  ✅ Matched (OK)
                  <span style={{ background: activeTab === "MATCHED" ? "rgba(255,255,255,0.25)" : "#bbf7d0", color: activeTab === "MATCHED" ? "white" : "#15803d", padding: "1px 6px", borderRadius: "10px", fontSize: "0.72rem" }}>
                    {tallyData.summary.exactMatchCount}
                  </span>
                </button>
              </div>

              {/* SEARCH & BULK ACTIONS */}
              <div className="sync-search-actions" style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                {/* Search */}
                <div className="sync-search-input" style={{ position: "relative", minWidth: "200px" }}>
                  <input
                    type="text"
                    placeholder={`Filter ${getEntityLabel()}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "0.45rem 0.85rem",
                      paddingLeft: "2.1rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.8rem",
                      outline: "none",
                      background: "#f8fafc"
                    }}
                  />
                  <Search size={14} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      style={{ position: "absolute", right: "7px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Action Buttons */}
                {activeTab === "MISSING" && tallyData.summary.missingInMongoCount > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => openSyncDialog("missing_only")}
                      style={{
                        background: "#ea580c",
                        color: "white",
                        border: "none",
                        padding: "0.45rem 0.95rem",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 4px rgba(234, 88, 12, 0.25)"
                      }}
                    >
                      <Zap size={14} /> Feed All Missing ({tallyData.summary.missingInMongoCount})
                    </button>
                  </div>
                )}

                {activeTab === "DIFF" && tallyData.summary.differentCount > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => openSyncDialog("update_all")}
                      style={{
                        background: "#0284c7",
                        color: "white",
                        border: "none",
                        padding: "0.45rem 0.95rem",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 4px rgba(2, 132, 199, 0.25)"
                      }}
                    >
                      <Zap size={14} /> Update All Discrepancies ({tallyData.summary.differentCount})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* TAB 1: MISSING ITEMS (TABLE VIEW) */}
            {activeTab === "MISSING" && (
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", minWidth: "650px" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "10px 12px", width: "36px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={filteredList.length > 0 && selectedItems.size === filteredList.length}
                          onChange={() => handleSelectAll(filteredList)}
                          style={{ cursor: "pointer" }}
                        />
                      </th>
                      <th style={{ padding: "10px 12px", textAlign: "left" }}>
                        {syncEntity === "AWB" ? "AWB No" : (syncEntity === "BILLS" ? "Bill No" : (syncEntity === "PURCHASES" ? "Purchase Bill No" : "S.No."))}
                      </th>
                      <th style={{ padding: "10px 12px", textAlign: "left" }}>Date</th>
                      <th style={{ padding: "10px 12px", textAlign: "left" }}>Party / Vendor</th>

                      {syncEntity === "AWB" && (
                        <>
                          <th style={{ padding: "10px 12px", textAlign: "left" }}>Route</th>
                          <th style={{ padding: "10px 12px", textAlign: "left" }}>Mode</th>
                          <th style={{ padding: "10px 12px", textAlign: "left" }}>Boxes</th>
                          <th style={{ padding: "10px 12px", textAlign: "left" }}>Invoices</th>
                        </>
                      )}

                      {syncEntity === "BILLS" && (
                        <>
                          <th style={{ padding: "10px 12px", textAlign: "left" }}>Linked AWBs</th>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>Subtotal</th>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>Total Amount</th>
                        </>
                      )}

                      {syncEntity === "PURCHASES" && (
                        <>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>Taxable</th>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>GST</th>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>Total Amount</th>
                        </>
                      )}

                      {(syncEntity === "VENDOR_PAYMENTS" || syncEntity === "CLIENT_PAYMENTS") && (
                        <>
                          <th style={{ padding: "10px 12px", textAlign: "left" }}>Payment Mode / Remarks</th>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>Amount Paid</th>
                        </>
                      )}

                      <th style={{ padding: "10px 12px", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
                          <CheckCircle size={36} color="#16a34a" style={{ margin: "0 auto 10px auto", display: "block" }} />
                          <b style={{ fontSize: "1rem", color: "#0f172a" }}>No missing {getEntityLabel().toLowerCase()}!</b>
                          <p style={{ margin: "4px 0 0 0", fontSize: "0.825rem" }}>All records from MySQL already exist in MongoDB.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredList.map((item, idx) => {
                        const itemKey = getItemKey(item);
                        const isSelected = selectedItems.has(itemKey);
                        const isExpanded = expandedItem === itemKey;

                        return (
                          <React.Fragment key={itemKey || idx}>
                            <tr style={{ borderBottom: "1px solid #f1f5f9", background: isSelected ? "#fff7ed" : "white" }}>
                              <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleItem(itemKey)}
                                  style={{ cursor: "pointer" }}
                                />
                              </td>
                              <td style={{ padding: "10px 12px", fontWeight: 800, color: (syncEntity === "VENDOR_PAYMENTS" || syncEntity === "CLIENT_PAYMENTS") ? "#64748b" : "#ea580c" }}>
                                {(syncEntity === "VENDOR_PAYMENTS" || syncEntity === "CLIENT_PAYMENTS") ? `#${idx + 1}` : itemKey}
                              </td>
                              <td style={{ padding: "10px 12px", color: "#475569" }}>
                                {item.date || item.invoice_date || "—"}
                              </td>
                              <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1e293b" }}>
                                {item.client || item.vendor || "—"}
                              </td>

                              {syncEntity === "AWB" && (
                                <>
                                  <td style={{ padding: "10px 12px", color: "#475569" }}>
                                    {item.origin} → {item.destination}
                                  </td>
                                  <td style={{ padding: "10px 12px" }}>
                                    <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700 }}>
                                      {item.mode || "Road"}
                                    </span>
                                  </td>
                                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                                    {item.box || 0}
                                  </td>
                                  <td style={{ padding: "10px 12px" }}>
                                    <button
                                      type="button"
                                      onClick={() => setExpandedItem(isExpanded ? null : itemKey)}
                                      style={{
                                        background: "#f1f5f9",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "6px",
                                        padding: "2px 8px",
                                        fontSize: "0.72rem",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px"
                                      }}
                                    >
                                      <FileText size={12} />
                                      {item.invoiceCount} row(s)
                                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                  </td>
                                </>
                              )}

                              {syncEntity === "BILLS" && (
                                <>
                                  <td style={{ padding: "10px 12px" }}>
                                    <span style={{ background: "#f1f5f9", color: "#334155", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
                                      {item.itemCount} items
                                    </span>
                                  </td>
                                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>
                                    ₹{Number(item.subtotal || 0).toLocaleString()}
                                  </td>
                                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                                    ₹{Number(item.total || 0).toLocaleString()}
                                  </td>
                                </>
                              )}

                              {syncEntity === "PURCHASES" && (
                                <>
                                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>
                                    ₹{Number(item.subtotal || 0).toLocaleString()}
                                  </td>
                                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#64748b" }}>
                                    ₹{Number(item.gst || 0).toLocaleString()}
                                  </td>
                                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                                    ₹{Number(item.total || 0).toLocaleString()}
                                  </td>
                                </>
                              )}

                              {(syncEntity === "VENDOR_PAYMENTS" || syncEntity === "CLIENT_PAYMENTS") && (
                                <>
                                  <td style={{ padding: "10px 12px", color: "#475569" }}>
                                    <span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem" }}>
                                      {item.remarks || item.particulars || "Bank"}
                                    </span>
                                  </td>
                                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#16a34a" }}>
                                    ₹{Number(item.amount || 0).toLocaleString()}
                                  </td>
                                </>
                              )}

                              <td style={{ padding: "10px 12px", textAlign: "right" }}>
                                <button
                                  type="button"
                                  onClick={() => openSyncDialog("missing_only", [itemKey])}
                                  style={{
                                    background: "#ea580c",
                                    color: "white",
                                    border: "none",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    cursor: "pointer"
                                  }}
                                >
                                  Feed to Mongo
                                </button>
                              </td>
                            </tr>

                            {/* EXPANDABLE INVOICE ROWS PREVIEW (AWB) */}
                            {isExpanded && item.invoiceDetails && item.invoiceDetails.length > 0 && (
                              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                <td colSpan="9" style={{ padding: "12px 18px" }}>
                                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e40af", marginBottom: "6px" }}>
                                    📄 Linked Invoice Rows (from SQL <code style={{ color: "#0369a1" }}>lr_details</code>):
                                  </div>
                                  <table style={{ width: "100%", background: "white", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.75rem", borderCollapse: "collapse" }}>
                                    <thead>
                                      <tr style={{ background: "#f1f5f9", color: "#475569" }}>
                                        <th style={{ padding: "6px 10px", textAlign: "left" }}>#</th>
                                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Invoice Date</th>
                                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Invoice No</th>
                                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Part No</th>
                                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Eway Bill</th>
                                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Qty</th>
                                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Value (₹)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {item.invoiceDetails.map((inv, idx2) => (
                                        <tr key={idx2} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                          <td style={{ padding: "6px 10px", color: "#64748b" }}>{idx2 + 1}</td>
                                          <td style={{ padding: "6px 10px" }}>{inv.invoiceDate || "—"}</td>
                                          <td style={{ padding: "6px 10px", fontWeight: 700, color: "#0f172a" }}>{inv.invoiceNo || "—"}</td>
                                          <td style={{ padding: "6px 10px" }}>{inv.partNumber || "—"}</td>
                                          <td style={{ padding: "6px 10px" }}>{inv.ewayBill || "—"}</td>
                                          <td style={{ padding: "6px 10px", fontWeight: 600 }}>{inv.quantity || "—"}</td>
                                          <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600 }}>₹{inv.invoiceValue || "0.00"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: FIELD DIFFERENCES INSPECTOR */}
            {activeTab === "DIFF" && (
              <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* MULTI-OPTION MISMATCH CATEGORY FILTER BAR */}
                <div 
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "0.75rem 1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
                      <SlidersHorizontal size={14} color="#0284c7" /> Filter by Mismatch Type ({filteredList.length} records shown):
                    </span>

                    {mismatchTypeFilter !== "ALL" && (
                      <button
                        type="button"
                        onClick={() => setMismatchTypeFilter("ALL")}
                        style={{
                          background: "#fee2e2",
                          border: "1px solid #fecaca",
                          color: "#b91c1c",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <X size={12} /> Reset to All ({mismatchCategoryCounts.ALL})
                      </button>
                    )}
                  </div>

                  {/* FILTER PILLS */}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                    {[
                      { key: "ALL", label: "All Mismatches", count: mismatchCategoryCounts.ALL, color: "#0284c7", bg: "#f0f9ff" },
                      { key: "QUANTITY", label: "📦 Quantity & Boxes", count: mismatchCategoryCounts.QUANTITY, color: "#ea580c", bg: "#fff7ed" },
                      { key: "INVOICE_VALUE", label: "💰 Invoice Value / GST", count: mismatchCategoryCounts.INVOICE_VALUE, color: "#16a34a", bg: "#f0fdf4" },
                      { key: "TOTAL_AMOUNT", label: "💵 Total Amount", count: mismatchCategoryCounts.TOTAL_AMOUNT, color: "#16a34a", bg: "#f0fdf4" },
                      { key: "RATE", label: "🏷️ Rates & Freight", count: mismatchCategoryCounts.RATE, color: "#0284c7", bg: "#f0f9ff" },
                      { key: "INVOICE_ROWS", label: "📄 Missing / Extra Rows", count: mismatchCategoryCounts.INVOICE_ROWS, color: "#9333ea", bg: "#faf5ff" },
                      { key: "EWAY_BILL", label: "🚚 E-Way Bill", count: mismatchCategoryCounts.EWAY_BILL, color: "#0284c7", bg: "#f0f9ff" },
                      { key: "WEIGHT", label: "⚖️ Weight", count: mismatchCategoryCounts.WEIGHT, color: "#d97706", bg: "#fffbeb" },
                      { key: "PARTY", label: "🏢 Parties & Vendors", count: mismatchCategoryCounts.PARTY, color: "#4f46e5", bg: "#eef2ff" },
                      { key: "ROUTE", label: "🗺️ Route (Origin/Dest)", count: mismatchCategoryCounts.ROUTE, color: "#0d9488", bg: "#f0fdfa" },
                      { key: "DATE", label: "📅 Date", count: mismatchCategoryCounts.DATE, color: "#e11d48", bg: "#fff1f2" }
                    ].filter(cat => cat.key === "ALL" || cat.count > 0).map(cat => {
                      const isSelected = mismatchTypeFilter === cat.key;
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => setMismatchTypeFilter(cat.key)}
                          style={{
                            background: isSelected ? cat.color : cat.bg,
                            color: isSelected ? "white" : "#334155",
                            border: `1.5px solid ${isSelected ? cat.color : "#e2e8f0"}`,
                            borderRadius: "8px",
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.75rem",
                            fontWeight: isSelected ? 800 : 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.15s ease",
                            boxShadow: isSelected ? "0 2px 6px rgba(0,0,0,0.12)" : "none"
                          }}
                        >
                          {cat.label}
                          <span 
                            style={{
                              background: isSelected ? "rgba(255,255,255,0.3)" : "white",
                              color: isSelected ? "white" : cat.color,
                              border: isSelected ? "none" : "1px solid #cbd5e1",
                              padding: "1px 6px",
                              borderRadius: "10px",
                              fontSize: "0.68rem",
                              fontWeight: 800
                            }}
                          >
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {filteredList.length === 0 ? (
                  <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
                    <CheckCircle size={36} color="#16a34a" style={{ margin: "0 auto 10px auto", display: "block" }} />
                    <b style={{ fontSize: "1rem", color: "#0f172a" }}>No discrepancies found matching filter!</b>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.825rem" }}>All existing MongoDB records match MySQL data.</p>
                  </div>
                ) : (
                  filteredList.map((item, idx) => {
                    const itemKey = getItemKey(item);
                    const isExpanded = expandedItem === itemKey;
                    const sqlObj = item.sqlRecord || item.sqlBill || {};
                    const mongoObj = item.mongoRecord || item.mongoBill || {};

                    return (
                      <div 
                        key={itemKey || idx}
                        style={{
                          background: "#ffffff",
                          borderRadius: "12px",
                          border: "1.5px solid #e2e8f0",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                          overflow: "hidden"
                        }}
                      >
                        {/* CARD HEADER */}
                        <div 
                          style={{
                            background: "#f8fafc",
                            padding: "0.85rem 1.15rem",
                            borderBottom: "1px solid #e2e8f0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "0.75rem"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "1rem", fontWeight: 800, color: "#0284c7" }}>
                              {syncEntity === "VENDOR_PAYMENTS" ? `Payment Voucher #${idx + 1}` : `#${itemKey}`}
                            </span>
                            <span style={{ color: "#64748b", fontSize: "0.825rem" }}>
                              📅 {sqlObj.date || sqlObj.invoice_date || "—"}
                            </span>
                            <span style={{ color: "#334155", fontWeight: 600, fontSize: "0.825rem" }}>
                              🏢 {sqlObj.client || sqlObj.vendor || "—"}
                            </span>
                            {sqlObj.origin && sqlObj.destination && (
                              <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", color: "#475569" }}>
                                🗺️ {sqlObj.origin} → {sqlObj.destination}
                              </span>
                            )}

                            {/* Financial Delta Badge for Card */}
                            {item.currentMongoAmount !== undefined && item.targetSqlAmount !== undefined && (
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "2px 8px", fontSize: "0.75rem" }}>
                                <span style={{ color: "#475569" }}>Current: <b>₹{Math.round(item.currentMongoAmount).toLocaleString("en-IN")}</b></span>
                                <span style={{ color: "#94a3b8" }}>→</span>
                                <span style={{ color: "#0369a1" }}>Target: <b>₹{Math.round(item.targetSqlAmount).toLocaleString("en-IN")}</b></span>
                                {item.amountDelta !== 0 && (
                                  <span style={{ color: item.amountDelta > 0 ? "#15803d" : "#b91c1c", fontWeight: 800 }}>
                                    ({item.amountDelta > 0 ? "+" : ""}₹{Math.round(item.amountDelta).toLocaleString("en-IN")})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: "0.75rem", fontWeight: 800, padding: "3px 8px", borderRadius: "8px", border: "1px solid #fecaca" }}>
                              {item.diffs.length} Difference(s) Found
                            </span>
                            
                            <button
                              type="button"
                              onClick={() => setExpandedItem(isExpanded ? null : itemKey)}
                              style={{
                                background: "white",
                                border: "1px solid #cbd5e1",
                                borderRadius: "6px",
                                padding: "4px 8px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              {isExpanded ? "Hide Full Comparison" : "🔍 Full Side-by-Side"}
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>

                            <button
                              type="button"
                              onClick={() => openSyncDialog("update_existing", [itemKey])}
                              style={{
                                background: "#0284c7",
                                color: "white",
                                border: "none",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              <Zap size={12} /> Update Mongo with SQL
                            </button>
                          </div>
                        </div>

                        {/* DIFFERENCE BLOCKS */}
                        <div style={{ padding: "0.85rem 1.15rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.75rem" }}>
                          {item.diffs.map((d, idx2) => (
                            <div 
                              key={idx2}
                              style={{
                                background: "#fff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                padding: "0.65rem 0.85rem",
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px"
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155" }}>
                                  {d.column}
                                </span>
                                <span style={{ background: "#fef3c7", color: "#b45309", fontSize: "0.68rem", fontWeight: 800, padding: "1px 6px", borderRadius: "6px" }}>
                                  {d.type}
                                </span>
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "4px", fontSize: "0.78rem" }}>
                                {/* MySQL Value */}
                                <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "6px", padding: "4px 8px" }}>
                                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#0284c7", display: "block" }}>MySQL Workbench:</span>
                                  <span style={{ fontWeight: 700, color: "#0369a1", wordBreak: "break-word" }}>{d.sql}</span>
                                </div>

                                {/* MongoDB Value */}
                                <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: "6px", padding: "4px 8px" }}>
                                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#854d0e", display: "block" }}>Current MongoDB:</span>
                                  <span style={{ fontWeight: 700, color: "#713f12", wordBreak: "break-word" }}>{d.mongo}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* EXPANDABLE FULL SIDE-BY-SIDE INSPECTOR */}
                        {isExpanded && (
                          <div style={{ padding: "1rem", background: "#f8fafc", borderTop: "1px solid #e2e8f0", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#1e293b", marginBottom: "8px" }}>
                              🔍 Full Side-by-Side Verification:
                            </div>
                            <table style={{ width: "100%", background: "white", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.75rem", borderCollapse: "collapse", minWidth: "550px" }}>
                              <thead>
                                <tr style={{ background: "#f1f5f9", color: "#475569" }}>
                                  <th style={{ padding: "6px 10px", textAlign: "left", width: "25%" }}>Field / Attribute</th>
                                  <th style={{ padding: "6px 10px", textAlign: "left", width: "37.5%", color: "#0284c7" }}>MySQL Source Value</th>
                                  <th style={{ padding: "6px 10px", textAlign: "left", width: "37.5%", color: "#b45309" }}>Current MongoDB Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {syncEntity === "AWB" && [
                                  { label: "AWB Number", sql: sqlObj.awb, mongo: mongoObj.awb || mongoObj.id },
                                  { label: "Booking Date", sql: sqlObj.date, mongo: mongoObj.date },
                                  { label: "Transport Mode", sql: sqlObj.mode, mongo: mongoObj.mode },
                                  { label: "Client Name", sql: sqlObj.client, mongo: mongoObj.client },
                                  { label: "Consignor (Shipper)", sql: sqlObj.consignor, mongo: mongoObj.consignor },
                                  { label: "Consignee (Receiver)", sql: sqlObj.consignee, mongo: mongoObj.consignee },
                                  { label: "Origin City", sql: sqlObj.origin, mongo: mongoObj.origin },
                                  { label: "Destination City", sql: sqlObj.destination, mongo: mongoObj.destination },
                                  { label: "Boxes / Packages", sql: sqlObj.box, mongo: mongoObj.box },
                                  { label: "Actual Weight (kg)", sql: sqlObj.actual_wt, mongo: mongoObj.actual_wt },
                                  { label: "Charged Weight (kg)", sql: sqlObj.charge_wt, mongo: mongoObj.charge_wt },
                                  { label: "Freight Charge (₹)", sql: sqlObj.freight_charge, mongo: mongoObj.freight_charge || mongoObj.freight },
                                  { label: "Total Invoice Rows", sql: `${(sqlObj.invoiceDetails || []).length} rows`, mongo: `${(mongoObj.invoiceDetails || []).length} rows` }
                                ].map((row, rIdx) => (
                                  <tr key={rIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "6px 10px", fontWeight: 700, color: "#475569" }}>{row.label}</td>
                                    <td style={{ padding: "6px 10px", color: "#0369a1", fontWeight: 600 }}>{String(row.sql ?? "—")}</td>
                                    <td style={{ padding: "6px 10px", color: "#713f12", fontWeight: 600 }}>{String(row.mongo ?? "—")}</td>
                                  </tr>
                                ))}

                                {syncEntity === "BILLS" && [
                                  { label: "Bill / Invoice No", sql: sqlObj.invoice, mongo: mongoObj.billNo || mongoObj.invoice },
                                  { label: "Bill Date", sql: sqlObj.invoice_date, mongo: mongoObj.invoice_date || mongoObj.billDate || mongoObj.date },
                                  { label: "Client Name", sql: sqlObj.client, mongo: mongoObj.client },
                                  { label: "Linked AWBs Count", sql: `${(sqlObj.items || []).length} items`, mongo: `${(mongoObj.items || []).length} items` },
                                  { label: "Subtotal (Taxable)", sql: `₹${sqlObj.subtotal?.toFixed(2)}`, mongo: `₹${(mongoObj.subtotal || mongoObj.taxable || 0).toLocaleString()}` },
                                  { label: "GST Amount", sql: `₹${sqlObj.gstAmt}`, mongo: `₹${mongoObj.gstAmt || mongoObj.igst || 0}` },
                                  { label: "Total Bill Amount", sql: `₹${sqlObj.total}`, mongo: `₹${mongoObj.total || mongoObj.totalPayable || mongoObj.amount || 0}` }
                                ].map((row, rIdx) => (
                                  <tr key={rIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "6px 10px", fontWeight: 700, color: "#475569" }}>{row.label}</td>
                                    <td style={{ padding: "6px 10px", color: "#0369a1", fontWeight: 600 }}>{String(row.sql ?? "—")}</td>
                                    <td style={{ padding: "6px 10px", color: "#713f12", fontWeight: 600 }}>{String(row.mongo ?? "—")}</td>
                                  </tr>
                                ))}

                                {syncEntity === "PURCHASES" && [
                                  { label: "Purchase Bill No", sql: sqlObj.billNo, mongo: mongoObj.billNo || mongoObj.bill },
                                  { label: "Purchase Date", sql: sqlObj.date, mongo: mongoObj.date },
                                  { label: "Vendor Name", sql: sqlObj.vendor, mongo: mongoObj.vendor },
                                  { label: "Taxable / Subtotal", sql: `₹${Number(sqlObj.subtotal || 0).toFixed(2)}`, mongo: `₹${Number(mongoObj.subtotal || mongoObj.taxable || 0).toFixed(2)}` },
                                  { label: "GST Amount", sql: `₹${Number(sqlObj.gst || 0).toFixed(2)}`, mongo: `₹${Number(mongoObj.gst || 0).toFixed(2)}` },
                                  { label: "Total Bill Amount", sql: `₹${Number(sqlObj.total || 0).toFixed(2)}`, mongo: `₹${Number(mongoObj.total || 0).toFixed(2)}` }
                                ].map((row, rIdx) => (
                                  <tr key={rIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "6px 10px", fontWeight: 700, color: "#475569" }}>{row.label}</td>
                                    <td style={{ padding: "6px 10px", color: "#0369a1", fontWeight: 600 }}>{String(row.sql ?? "—")}</td>
                                    <td style={{ padding: "6px 10px", color: "#713f12", fontWeight: 600 }}>{String(row.mongo ?? "—")}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 3: MATCHED (TABLE VIEW) */}
            {activeTab === "MATCHED" && (
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", minWidth: "600px" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "10px 12px", textAlign: "left" }}>
                        {syncEntity === "AWB" ? "AWB No" : (syncEntity === "BILLS" ? "Bill No" : (syncEntity === "PURCHASES" ? "Purchase Bill No" : "S.No."))}
                      </th>
                      <th style={{ padding: "10px 12px", textAlign: "left" }}>Date</th>
                      <th style={{ padding: "10px 12px", textAlign: "left" }}>Party / Vendor</th>

                      {syncEntity === "AWB" && (
                        <>
                          <th style={{ padding: "10px 12px", textAlign: "left" }}>Route</th>
                          <th style={{ padding: "10px 12px", textAlign: "left" }}>Mode</th>
                          <th style={{ padding: "10px 12px", textAlign: "left" }}>Status</th>
                        </>
                      )}

                      {syncEntity === "BILLS" && (
                        <>
                          <th style={{ padding: "10px 12px", textAlign: "left" }}>Linked AWBs</th>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>Total Amount</th>
                        </>
                      )}

                      {syncEntity === "PURCHASES" && (
                        <>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>Total Amount</th>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>Paid Amount</th>
                        </>
                      )}

                      {(syncEntity === "VENDOR_PAYMENTS" || syncEntity === "CLIENT_PAYMENTS") && (
                        <>
                          <th style={{ padding: "10px 12px", textAlign: "left" }}>Remarks</th>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>Amount</th>
                        </>
                      )}

                      <th style={{ padding: "10px 12px", textAlign: "center" }}>Integrity Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
                          No matched records found for this date filter.
                        </td>
                      </tr>
                    ) : (
                      filteredList.map((item, idx) => {
                        const itemKey = getItemKey(item);
                        return (
                          <tr key={itemKey || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 12px", fontWeight: 700, color: (syncEntity === "VENDOR_PAYMENTS" || syncEntity === "CLIENT_PAYMENTS") ? "#64748b" : "#0f172a" }}>
                              {(syncEntity === "VENDOR_PAYMENTS" || syncEntity === "CLIENT_PAYMENTS") ? `#${idx + 1}` : itemKey}
                            </td>
                            <td style={{ padding: "10px 12px", color: "#475569" }}>
                              {item.date || item.invoice_date || "—"}
                            </td>
                            <td style={{ padding: "10px 12px", color: "#1e293b", fontWeight: 600 }}>
                              {item.client || item.vendor || "—"}
                            </td>

                            {syncEntity === "AWB" && (
                              <>
                                <td style={{ padding: "10px 12px", color: "#475569" }}>
                                  {item.origin} → {item.destination}
                                </td>
                                <td style={{ padding: "10px 12px" }}>
                                  <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 6px", borderRadius: "4px", fontSize: "0.72rem" }}>
                                    {item.mode || "Road"}
                                  </span>
                                </td>
                                <td style={{ padding: "10px 12px" }}>
                                  <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "2px 6px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700 }}>
                                    {item.status || "Synced"}
                                  </span>
                                </td>
                              </>
                            )}

                            {syncEntity === "BILLS" && (
                              <>
                                <td style={{ padding: "10px 12px" }}>
                                  <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600 }}>
                                    {item.itemCount} items
                                  </span>
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                                  ₹{Number(item.total || 0).toLocaleString()}
                                </td>
                              </>
                            )}

                            {syncEntity === "PURCHASES" && (
                              <>
                                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                                  ₹{Number(item.total || 0).toLocaleString()}
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "right", color: "#16a34a" }}>
                                  ₹{Number(item.paidAmount || 0).toLocaleString()}
                                </td>
                              </>
                            )}

                            {(syncEntity === "VENDOR_PAYMENTS" || syncEntity === "CLIENT_PAYMENTS") && (
                              <>
                                <td style={{ padding: "10px 12px", color: "#64748b" }}>
                                  {item.remarks || item.particulars || "Bank"}
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#16a34a" }}>
                                  ₹{Number(item.amount || 0).toLocaleString()}
                                </td>
                              </>
                            )}

                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                              <span style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", padding: "3px 8px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: 800 }}>
                                ✓ Exact Match
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* PROFESSIONAL PORTAL SYNC MODAL */}
      {syncModal.isOpen && createPortal(
        <div 
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            boxSizing: "border-box",
            zIndex: 99999999
          }}
        >
          <motion.div
            className="sync-modal-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            style={{
              background: "white",
              borderRadius: "18px",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              overflow: "hidden",
              border: "1px solid #e2e8f0"
            }}
          >
            {/* Modal Header */}
            <div 
              style={{
                background: syncModal.step === "result" && !syncModal.error ? "#f0fdf4" : (syncModal.error ? "#fef2f2" : "#f8fafc"),
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {syncModal.step === "confirm" && (
                  <div style={{ background: "#e0f2fe", padding: "8px", borderRadius: "10px", color: "#0284c7" }}>
                    <ShieldCheck size={22} />
                  </div>
                )}
                {syncModal.step === "progress" && (
                  <div style={{ background: "#e0f2fe", padding: "8px", borderRadius: "10px", color: "#0284c7" }}>
                    <RefreshCw size={22} className="spin-animation" />
                  </div>
                )}
                {syncModal.step === "result" && !syncModal.error && (
                  <div style={{ background: "#dcfce7", padding: "8px", borderRadius: "10px", color: "#16a34a" }}>
                    <CheckCircle2 size={22} />
                  </div>
                )}
                {syncModal.step === "result" && syncModal.error && (
                  <div style={{ background: "#fee2e2", padding: "8px", borderRadius: "10px", color: "#dc2626" }}>
                    <AlertTriangle size={22} />
                  </div>
                )}
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                    {syncModal.step === "confirm" && `Confirm ${getEntityLabel()} Sync`}
                    {syncModal.step === "progress" && `Synchronizing ${getEntityLabel()}...`}
                    {syncModal.step === "result" && (syncModal.error ? "Sync Encountered an Error" : "Sync Completed Successfully")}
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                    {syncModal.step === "confirm" && "Verify parameters before executing synchronization"}
                    {syncModal.step === "progress" && "Writing records to MongoDB..."}
                    {syncModal.step === "result" && (syncModal.error ? "Please check your network connection" : "Database records have been updated")}
                  </p>
                </div>
              </div>

              {syncModal.step !== "progress" && (
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "6px"
                  }}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.5rem" }}>
              {/* STEP 1: CONFIRMATION */}
              {syncModal.step === "confirm" && (
                <div>
                  <div style={{ background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1rem", marginBottom: "1.25rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.825rem" }}>
                      <div>
                        <span style={{ color: "#64748b", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Entity:</span>
                        <b style={{ color: "#0f172a" }}>{getEntityLabel()}</b>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Sync Mode:</span>
                        <b style={{ color: syncModal.mode === "missing_only" ? "#ea580c" : "#0284c7" }}>
                          {syncModal.mode === "missing_only" ? "Insert Missing Only" : "Update Existing Discrepancies"}
                        </b>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Target Count:</span>
                        <b style={{ fontSize: "1rem", color: "#0284c7" }}>{syncModal.count} record(s)</b>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Date Range:</span>
                        <b style={{ color: "#0f172a" }}>{fromDate || "All Time"} {toDate ? `to ${toDate}` : ""}</b>
                      </div>
                    </div>

                    {tallyData?.summary?.financialImpact && (
                      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "10px", padding: "0.75rem", marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", flexWrap: "wrap", gap: "6px" }}>
                        <div>
                          <span style={{ color: "#0369a1", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                            Financial Impact Preview:
                          </span>
                          <span style={{ color: "#334155" }}>
                            Current: <b>₹{Math.round(tallyData.summary.financialImpact.currentMongoTotal).toLocaleString("en-IN")}</b> → Target: <b>₹{Math.round(tallyData.summary.financialImpact.targetSqlTotal).toLocaleString("en-IN")}</b>
                          </span>
                        </div>
                        <span style={{ background: tallyData.summary.financialImpact.netDifference >= 0 ? "#dcfce7" : "#fee2e2", color: tallyData.summary.financialImpact.netDifference >= 0 ? "#15803d" : "#b91c1c", padding: "3px 8px", borderRadius: "6px", fontWeight: 800 }}>
                          {tallyData.summary.financialImpact.netDifference >= 0 ? "+" : ""}₹{Math.round(tallyData.summary.financialImpact.netDifference).toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "1rem", fontSize: "0.8rem", color: "#475569" }}>
                    <Check size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <span>Existing payments, uploads, and statuses will be safely preserved.</span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      style={{
                        background: "white",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        padding: "0.55rem 1.15rem",
                        color: "#475569",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer"
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmExecuteSync}
                      style={{
                        background: "#0284c7",
                        border: "none",
                        borderRadius: "8px",
                        padding: "0.55rem 1.4rem",
                        color: "white",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 6px rgba(2, 132, 199, 0.35)"
                      }}
                    >
                      <Play size={14} /> Start Sync Now
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: IN PROGRESS */}
              {syncModal.step === "progress" && (
                <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                  <div 
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      border: "4px solid #e0f2fe",
                      borderTopColor: "#0284c7",
                      margin: "0 auto 1.25rem auto",
                      animation: "spin 1s linear infinite"
                    }}
                  />
                  <h4 style={{ margin: "0 0 0.5rem 0", color: "#0f172a", fontSize: "1.1rem" }}>
                    Syncing {syncModal.count} record(s)...
                  </h4>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "0.825rem" }}>
                    Connecting to MySQL, validating data integrity, and writing to MongoDB.
                  </p>
                </div>
              )}

              {/* STEP 3: RESULT */}
              {syncModal.step === "result" && (
                <div>
                  {syncModal.error ? (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "1rem", color: "#991b1b", fontSize: "0.85rem" }}>
                      <b>Error details:</b>
                      <p style={{ margin: "4px 0 0 0" }}>{syncModal.error}</p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "1rem", textAlign: "center", marginBottom: "1.25rem" }}>
                        <h4 style={{ margin: "0 0 0.5rem 0", color: "#166534", fontSize: "1.15rem" }}>
                          🎉 Synchronization Succeeded!
                        </h4>
                        <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginTop: "0.75rem" }}>
                          <div>
                            <span style={{ fontSize: "0.72rem", color: "#166534", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Inserted New</span>
                            <b style={{ fontSize: "1.4rem", color: "#15803d" }}>{syncModal.result?.inserted || 0}</b>
                          </div>
                          <div>
                            <span style={{ fontSize: "0.72rem", color: "#166534", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Updated Existing</span>
                            <b style={{ fontSize: "1.4rem", color: "#0284c7" }}>{syncModal.result?.updated || 0}</b>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={handleCloseModal}
                          style={{
                            background: "#16a34a",
                            border: "none",
                            borderRadius: "8px",
                            padding: "0.6rem 1.5rem",
                            color: "white",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            boxShadow: "0 2px 6px rgba(22, 163, 74, 0.35)"
                          }}
                        >
                          Done & Refresh
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default SqlSyncStudio;
