import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  X,
  FileSpreadsheet,
  FileText,
  Printer,
  Building2,
  Users,
  CheckCircle2,
  Filter,
  Calendar,
  IndianRupee,
  Layers,
  Sparkles
} from "lucide-react";
import { formatDate } from "../utils/formatters";

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(num);
};

const OutstandingExportFilterModal = ({
  isOpen,
  onClose,
  onExecuteExport,
  initialTarget = null, // null (Master export) or specific party object (Row export)
  clientList = [],
  vendorList = [],
  activeTab = "clients", // 'clients' | 'vendors'
  defaultFormat = "excel", // 'excel' | 'csv' | 'print'
  isExporting = false
}) => {
  // Mode selection: 'master' or 'single_party'
  const [targetScope, setTargetScope] = useState(initialTarget ? "single_party" : activeTab === "vendors" ? "vendors" : "clients");
  const [selectedParty, setSelectedParty] = useState(initialTarget);

  // Filter criteria
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'due_only' | 'partial' | 'paid' | 'unpaid'
  const [amountRange, setAmountRange] = useState("all"); // 'all' | 'high' (>=5L) | 'medium' (1L-5L) | 'low' (<1L) | 'zero'
  const [dateFilterType, setDateFilterType] = useState("all"); // 'all' | 'current_fy' | 'custom'
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Format selection
  const [format, setFormat] = useState(defaultFormat || "excel"); // 'excel' | 'csv' | 'print'

  // Update when initialTarget or defaultFormat changes
  React.useEffect(() => {
    if (initialTarget) {
      setTargetScope("single_party");
      setSelectedParty(initialTarget);
    } else {
      setTargetScope(activeTab === "vendors" ? "vendors" : "clients");
      setSelectedParty(null);
    }
    if (defaultFormat) {
      setFormat(defaultFormat);
    }
  }, [initialTarget, activeTab, defaultFormat, isOpen]);

  // Compute filtered parties for Master export preview
  const computedMasterList = useMemo(() => {
    if (targetScope === "single_party") {
      return selectedParty ? [selectedParty] : [];
    }

    const baseList = targetScope === "vendors" ? vendorList : clientList;

    return baseList.filter((p) => {
      // 1. Status Filter
      if (statusFilter === "due_only" && (p.netOutstandingDue || 0) <= 0.01) return false;
      if (statusFilter === "paid" && (p.netOutstandingDue || 0) > 0.01) return false;
      if (statusFilter === "partial" && p.status !== "partial") return false;
      if (statusFilter === "unpaid" && p.status !== "unpaid") return false;

      // 2. Amount Range Filter
      const due = p.netOutstandingDue || 0;
      if (amountRange === "high" && due < 500000) return false;
      if (amountRange === "medium" && (due < 100000 || due >= 500000)) return false;
      if (amountRange === "low" && (due <= 0 || due >= 100000)) return false;
      if (amountRange === "zero" && due > 0.01) return false;

      return true;
    });
  }, [targetScope, selectedParty, clientList, vendorList, statusFilter, amountRange]);

  // Total KPIs for the selected export batch
  const batchSummary = useMemo(() => {
    let count = 0;
    let totalBilled = 0;
    let totalPaid = 0;
    let totalTds = 0;
    let totalDue = 0;

    computedMasterList.forEach((p) => {
      count++;
      totalBilled += p.totalInvoiced || 0;
      totalPaid += p.totalPaid || 0;
      totalTds += (p.totalTds || 0) + (p.totalDebt || 0);
      totalDue += p.netOutstandingDue || 0;
    });

    return { count, totalBilled, totalPaid, totalTds, totalDue };
  }, [computedMasterList]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onExecuteExport({
      targetScope,
      party: targetScope === "single_party" ? selectedParty : null,
      filteredList: computedMasterList,
      statusFilter,
      amountRange,
      dateRange: {
        type: dateFilterType,
        startDate: dateFilterType === "custom" ? startDate : "",
        endDate: dateFilterType === "custom" ? endDate : ""
      },
      format
    });
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "1rem"
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          border: "1px solid #cbd5e1",
          overflow: "hidden",
          animation: "scaleUp 0.15s ease-out"
        }}
      >
        {/* Modal Header Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
            color: "#ffffff",
            padding: "1.25rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.1)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ background: "rgba(255,255,255,0.15)", padding: "8px", borderRadius: "10px" }}>
              <Download size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.01em" }}>
                Export & Statement Configuration
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#cbd5e1" }}>
                {targetScope === "single_party" && selectedParty
                  ? `Customized Statement of Account for ${selectedParty.partyName}`
                  : "Filter & download comprehensive financial statements & ledgers"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "#ffffff",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body with Scroll */}
        <div style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Section 1: Scope Selection */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", color: "#475569", marginBottom: "8px", display: "block", letterSpacing: "0.5px" }}>
              1. Export Scope / Target
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
              <button
                type="button"
                onClick={() => { setTargetScope("clients"); setSelectedParty(null); }}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: targetScope === "clients" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: targetScope === "clients" ? "#eff6ff" : "#ffffff",
                  color: targetScope === "clients" ? "#1e3a8a" : "#334155",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  textAlign: "left"
                }}
              >
                <Users size={16} color={targetScope === "clients" ? "#2563eb" : "#64748b"} />
                <div>
                  <div>All Customers</div>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>Receivables Master</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setTargetScope("vendors"); setSelectedParty(null); }}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: targetScope === "vendors" ? "2px solid #e11d48" : "1px solid #cbd5e1",
                  background: targetScope === "vendors" ? "#fff1f2" : "#ffffff",
                  color: targetScope === "vendors" ? "#9f1239" : "#334155",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  textAlign: "left"
                }}
              >
                <Building2 size={16} color={targetScope === "vendors" ? "#e11d48" : "#64748b"} />
                <div>
                  <div>All Vendors</div>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>Payables Master</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetScope("single_party");
                  if (!selectedParty) {
                    setSelectedParty(initialTarget || (activeTab === "vendors" ? vendorList[0] : clientList[0]) || null);
                  }
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: targetScope === "single_party" ? "2px solid #059669" : "1px solid #cbd5e1",
                  background: targetScope === "single_party" ? "#ecfdf5" : "#ffffff",
                  color: targetScope === "single_party" ? "#065f46" : "#334155",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  textAlign: "left"
                }}
              >
                <Sparkles size={16} color={targetScope === "single_party" ? "#059669" : "#64748b"} />
                <div>
                  <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                    {selectedParty ? selectedParty.partyName : "Single Party"}
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 600 }}>Individual Detailed Ledger</span>
                </div>
              </button>
            </div>

            {targetScope === "single_party" && (
              <div style={{ marginTop: "10px", background: "#f8fafc", padding: "10px 12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#065f46", marginBottom: "6px", display: "block" }}>
                  Select Customer or Vendor for Detailed Statement:
                </label>
                <select
                  value={selectedParty ? `${selectedParty.type || (selectedParty.bills ? "Client" : "Vendor")}_${selectedParty.partyKey}` : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setSelectedParty(null);
                      return;
                    }
                    const [type, ...keyParts] = val.split("_");
                    const key = keyParts.join("_");
                    const found = (type === "Client" ? clientList : vendorList).find(p => p.partyKey === key);
                    if (found) setSelectedParty(found);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "#1e293b",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="">-- Select a Customer or Vendor --</option>
                  <optgroup label="CUSTOMERS / CLIENTS">
                    {clientList.map((c) => (
                      <option key={`Client_${c.partyKey}`} value={`Client_${c.partyKey}`}>
                        {c.partyName} {c.code && c.code !== "-" ? `(${c.code})` : ""} - Due: ₹{(c.netOutstandingDue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="VENDORS / TRANSPORTERS">
                    {vendorList.map((v) => (
                      <option key={`Vendor_${v.partyKey}`} value={`Vendor_${v.partyKey}`}>
                        {v.partyName} {v.code && v.code !== "-" ? `(${v.code})` : ""} - Due: ₹{(v.netOutstandingDue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}
          </div>

          {/* Section 2: Status & Dues Filter */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", color: "#475569", marginBottom: "8px", display: "block", letterSpacing: "0.5px" }}>
              2. What Records / Dues to Include
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px" }}>
              {[
                { id: "all", label: "All Records", desc: "Full Portfolio", color: "#2563eb", bg: "#eff6ff" },
                { id: "due_only", label: "Pending Dues Only", desc: "> ₹0 Remaining", color: "#dc2626", bg: "#fef2f2" },
                { id: "partial", label: "Partial Payments", desc: "1% - 99% Paid", color: "#d97706", bg: "#fffbeb" },
                { id: "paid", label: "Cleared / Settled", desc: "100% Cleared (₹0)", color: "#16a34a", bg: "#f0fdf4" },
                { id: "unpaid", label: "0% Unpaid", desc: "No payments yet", color: "#991b1b", bg: "#fef2f2" }
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setStatusFilter(item.id)}
                  style={{
                    border: statusFilter === item.id ? `2px solid ${item.color}` : "1px solid #cbd5e1",
                    borderRadius: "10px",
                    padding: "8px 10px",
                    background: statusFilter === item.id ? item.bg : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "0.82rem", color: statusFilter === item.id ? item.color : "#1e293b" }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: "0.70rem", color: "#64748b", marginTop: "2px" }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Amount Range (For Master Lists) */}
          {targetScope !== "single_party" && (
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", color: "#475569", marginBottom: "8px", display: "block", letterSpacing: "0.5px" }}>
                3. Amount Range Filter
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px" }}>
                {[
                  { id: "all", label: "All Amounts" },
                  { id: "high", label: "High (≥ ₹5 Lakhs)" },
                  { id: "medium", label: "Medium (₹1L - ₹5L)" },
                  { id: "low", label: "Low (< ₹1 Lakh)" },
                  { id: "zero", label: "Zero Due (₹0)" }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAmountRange(item.id)}
                    style={{
                      padding: "7px 10px",
                      borderRadius: "8px",
                      border: amountRange === item.id ? "2px solid #1e3a8a" : "1px solid #cbd5e1",
                      background: amountRange === item.id ? "#eff6ff" : "#ffffff",
                      color: amountRange === item.id ? "#1e3a8a" : "#334155",
                      fontWeight: amountRange === item.id ? 700 : 500,
                      fontSize: "0.78rem",
                      cursor: "pointer"
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Date & Financial Period */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", color: "#475569", marginBottom: "8px", display: "block", letterSpacing: "0.5px" }}>
              {targetScope === "single_party" ? "3. Date Range & Period" : "4. Date Range & Period"}
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setDateFilterType("all")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "7px",
                  border: dateFilterType === "all" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: dateFilterType === "all" ? "#eff6ff" : "#ffffff",
                  color: dateFilterType === "all" ? "#1e3a8a" : "#475569",
                  fontWeight: 700,
                  fontSize: "0.80rem",
                  cursor: "pointer"
                }}
              >
                All Time History
              </button>
              <button
                type="button"
                onClick={() => setDateFilterType("current_fy")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "7px",
                  border: dateFilterType === "current_fy" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: dateFilterType === "current_fy" ? "#eff6ff" : "#ffffff",
                  color: dateFilterType === "current_fy" ? "#1e3a8a" : "#475569",
                  fontWeight: 700,
                  fontSize: "0.80rem",
                  cursor: "pointer"
                }}
              >
                Current FY (2024-25 / 25-26)
              </button>
              <button
                type="button"
                onClick={() => setDateFilterType("custom")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "7px",
                  border: dateFilterType === "custom" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: dateFilterType === "custom" ? "#eff6ff" : "#ffffff",
                  color: dateFilterType === "custom" ? "#1e3a8a" : "#475569",
                  fontWeight: 700,
                  fontSize: "0.80rem",
                  cursor: "pointer"
                }}
              >
                Custom Date Range
              </button>
            </div>

            {dateFilterType === "custom" && (
              <div style={{ display: "flex", gap: "10px", marginTop: "8px", alignItems: "center", background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.80rem" }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.80rem" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Export Format Selection */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", color: "#475569", marginBottom: "8px", display: "block", letterSpacing: "0.5px" }}>
              {targetScope === "single_party" ? "4. Output Format" : "5. Output Format"}
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              {/* Excel */}
              <div
                onClick={() => setFormat("excel")}
                style={{
                  border: format === "excel" ? "2px solid #059669" : "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "10px",
                  background: format === "excel" ? "#ecfdf5" : "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#065f46", fontWeight: 800, fontSize: "0.88rem" }}>
                  <FileSpreadsheet size={18} color="#059669" />
                  Excel (.xlsx)
                </div>
                <span style={{ fontSize: "0.70rem", color: "#047857", display: "block", marginTop: "3px" }}>
                  Official styled sheets with formulas & logo
                </span>
              </div>

              {/* CSV */}
              <div
                onClick={() => setFormat("csv")}
                style={{
                  border: format === "csv" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "10px",
                  background: format === "csv" ? "#eff6ff" : "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#1e3a8a", fontWeight: 800, fontSize: "0.88rem" }}>
                  <FileText size={18} color="#2563eb" />
                  CSV Data (.csv)
                </div>
                <span style={{ fontSize: "0.70rem", color: "#1d4ed8", display: "block", marginTop: "3px" }}>
                  Clean data format for external accounting
                </span>
              </div>

              {/* Print / PDF */}
              <div
                onClick={() => setFormat("print")}
                style={{
                  border: format === "print" ? "2px solid #7c3aed" : "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "10px",
                  background: format === "print" ? "#f5f3ff" : "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#5b21b6", fontWeight: 800, fontSize: "0.88rem" }}>
                  <Printer size={18} color="#7c3aed" />
                  PDF / Print
                </div>
                <span style={{ fontSize: "0.70rem", color: "#6d28d9", display: "block", marginTop: "3px" }}>
                  A4 layout ready to print or save PDF
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Export Batch Preview Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ background: "#1e3a8a", color: "#ffffff", fontWeight: 800, fontSize: "0.75rem", padding: "3px 8px", borderRadius: "6px" }}>
                {batchSummary.count} {targetScope === "single_party" ? "Statement" : "Parties Selected"}
              </div>
              <span style={{ fontSize: "0.80rem", color: "#334155" }}>
                Total Invoiced: <strong>{formatCurrency(batchSummary.totalBilled)}</strong>
              </span>
              <span style={{ fontSize: "0.80rem", color: "#16a34a" }}>
                Paid: <strong>{formatCurrency(batchSummary.totalPaid)}</strong>
              </span>
            </div>

            <div style={{ fontSize: "0.85rem", fontWeight: 800, color: batchSummary.totalDue > 0 ? "#dc2626" : "#16a34a" }}>
              Net Batch Due: {formatCurrency(batchSummary.totalDue)}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.6rem 1.25rem",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
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
            onClick={handleSubmit}
            disabled={isExporting || (targetScope === "single_party" && !selectedParty)}
            style={{
              padding: "0.6rem 1.5rem",
              background: format === "print"
                ? "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)"
                : "linear-gradient(135deg, #059669 0%, #10b981 100%)",
              border: "none",
              borderRadius: "8px",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "0.88rem",
              cursor: isExporting ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
            }}
          >
            {format === "print" ? (
              <>
                <Printer size={16} /> Open Print / PDF Document
              </>
            ) : (
              <>
                <Download size={16} /> Export {format.toUpperCase()} Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default OutstandingExportFilterModal;
