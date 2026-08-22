import React, { useRef, useState } from "react";
import { Printer, Download, X, RefreshCw, FileText, Scale, CheckCircle2 } from "lucide-react";
import { formatDate, calculateDueDate } from "../utils/formatters";
import { downloadViaPuppeteer } from "../utils/puppeteerPdf";
import { useToast } from "../context/ToastContext";
import { getBillSettlementDetails } from "../utils/excelExport";

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(num);
};

const PartyLedgerPrintModal = ({ party, isOpen, onClose, initialStatusFilter = "all", initialDateRange = null }) => {
  const { addToast } = useToast();
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || "all");
  const [dateRange, setDateRange] = useState(initialDateRange || { type: "all", startDate: "", endDate: "" });
  const printAreaRef = useRef(null);

  React.useEffect(() => {
    if (initialStatusFilter) setStatusFilter(initialStatusFilter);
    if (initialDateRange) setDateRange(initialDateRange);
  }, [initialStatusFilter, initialDateRange, isOpen]);

  if (!isOpen || !party) return null;

  const isClient = (party.type || "Client").toLowerCase() === "client";
  const partyTypeLabel = isClient ? "CUSTOMER / CLIENT" : "VENDOR / SUPPLIER";
  const partyName = party.partyName || "Party";
  const sanitizedPartyName = partyName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const today = new Date().toISOString().split("T")[0];
  const formattedToday = formatDate(new Date());

  // 1. Build Chronological Ledger Entries
  const ledgerEntries = [];

  // A. Opening Balance (Include if not filtered out by custom date or settled filter)
  if (((party.openingDue || 0) > 0 || (party.priorBilled || 0) > 0) && (statusFilter !== "paid" || (party.openingDue || 0) <= 0.01)) {
    ledgerEntries.push({
      date: party.openingDoc?.financialYear ? `OPENING (${party.openingDoc.financialYear})` : "FY OPENING",
      rawDate: new Date("2000-01-01"),
      type: "OPENING BALANCE",
      ref: party.openingDoc?.financialYear ? `OPENING-${party.openingDoc.financialYear}` : "FY-OPENING-BAL",
      particulars: `Prior financial year closing balance carried forward (Billed: ₹${(party.priorBilled || 0).toFixed(2)}, Paid: ₹${(party.priorPaid || 0).toFixed(2)})`,
      mode: "OPENING ENTRY",
      debit: Number((party.openingDue || 0).toFixed(2)),
      credit: 0,
      status: (party.openingDue || 0) > 0 ? "UNPAID" : "SETTLED",
    });
  }

  // B. Current Period Invoices / Purchases
  const rawBills = isClient ? (party.bills || []) : (party.purchases || []);
  const filteredBills = rawBills.filter((b) => {
    const bTotal = Number(b.amount || b.total) || 0;
    const bPaid = Number(b.paidAmount) || 0;
    const bTds = Number(b.tdsAmount) || 0;
    const bDebt = Number(b.debtAmount) || 0;
    const isCancelled = String(b.status || "").toLowerCase() === "cancelled";
    const bDue = isCancelled ? 0 : Math.max(0, bTotal - bPaid - bTds - bDebt);

    if (statusFilter === "due_only" && bDue <= 0.01) return false;
    if (statusFilter === "paid" && bDue > 0.01) return false;
    if (statusFilter === "partial" && (bPaid === 0 || bDue <= 0.01)) return false;
    if (statusFilter === "unpaid" && (bPaid > 0 || bTds > 0 || bDebt > 0)) return false;

    if (dateRange?.type === "custom" && dateRange.startDate && dateRange.endDate) {
      const bDate = b.billDate || b.date || b.invoiceDate || b.createdAt;
      if (bDate) {
        try {
          const dStr = new Date(bDate).toISOString().split("T")[0];
          if (dStr < dateRange.startDate || dStr > dateRange.endDate) return false;
        } catch (_e) {}
      }
    }
    return true;
  });

  filteredBills.forEach((b) => {
    const bTotal = Number(b.amount || b.total) || 0;
    const bPaid = Number(b.paidAmount) || 0;
    const bTds = Number(b.tdsAmount) || 0;
    const bDebt = Number(b.debtAmount) || 0;
    const isCancelled = String(b.status || "").toLowerCase() === "cancelled";
    const bDue = isCancelled ? 0 : Math.max(0, bTotal - bPaid - bTds - bDebt);
    const bDate = b.invoice_date || b.billDate || b.date || b.createdAt || b.invoiceDate || b.purchaseDate || b.lrDate;
    const bNo = (b.invoice || b.billNo || b.invoiceNo || b.purchaseNo || b.billNumber || b.invNo || b.refNo || (b.id ? String(b.id).slice(-6) : "") || "-").toUpperCase();
    const status = isCancelled ? "CANCELLED" : bDue <= 0.01 ? "PAID" : (bPaid > 0 || bTds > 0 || bDebt > 0) ? "PARTIAL" : "UNPAID";

    let particulars = b.remarks || b.description || (isClient ? "Freight & Transportation Services" : "Vendor Transport Charges");
    if (b.vehicles || b.vehicleNo) particulars += ` (Veh: ${b.vehicles || b.vehicleNo})`;
    if (b.tripsCount) particulars += ` [${b.tripsCount} Trips]`;

    ledgerEntries.push({
      date: formatDate(bDate),
      rawDate: bDate ? new Date(bDate) : new Date(),
      type: isClient ? "SALES INVOICE" : "PURCHASE BILL",
      ref: bNo,
      particulars: particulars,
      mode: b.paymentMode && String(b.paymentMode).toUpperCase() !== "TBB" ? b.paymentMode : "BILL / INVOICE",
      debit: Number(bTotal.toFixed(2)),
      credit: 0,
      status: status,
      rawBill: b,
    });
  });

  // C. Cash / Bank Receipts or Payments
  const rawCash = (party.cash || []).filter((c) => {
    if (dateRange?.type === "custom" && dateRange.startDate && dateRange.endDate) {
      const cDate = c.date || c.createdAt;
      if (cDate) {
        try {
          const dStr = new Date(cDate).toISOString().split("T")[0];
          if (dStr < dateRange.startDate || dStr > dateRange.endDate) return false;
        } catch (_e) {}
      }
    }
    return true;
  });

  rawCash.forEach((c) => {
    const amt = Number(c.amount) || 0;
    const cDate = c.date || c.createdAt;
    const cRef = c.voucherNo || c.referenceNo || c.refNo || c.chequeNo || c.transactionId || "-";
    const isIncome = c.type === "in";
    const mode = c.paymentMode || c.mode || "BANK / CASH";
    let narration = c.narration || c.notes || c.particulars || (isIncome ? "Payment Received" : "Payment Disbursed");
    if (c.bankName) narration += ` via ${c.bankName}`;

    let debit = 0;
    let credit = 0;
    if (isClient) {
      if (isIncome) credit = amt;
      else debit = amt;
    } else {
      if (!isIncome) credit = amt;
      else debit = amt;
    }

    ledgerEntries.push({
      date: formatDate(cDate),
      rawDate: cDate ? new Date(cDate) : new Date(),
      type: isIncome ? "CASH/BANK RECEIPT" : "CASH/BANK PAYMENT",
      ref: cRef,
      particulars: narration,
      mode: mode,
      debit: Number(debit.toFixed(2)),
      credit: Number(credit.toFixed(2)),
      status: "SETTLED",
      rawCash: c,
    });
  });

  // D. TDS & Bad Debt Adjustments
  const rawAdj = (party.adjustments || []).filter((adj) => {
    if (dateRange?.type === "custom" && dateRange.startDate && dateRange.endDate) {
      const adjDate = adj.date || adj.createdAt;
      if (adjDate) {
        try {
          const dStr = new Date(adjDate).toISOString().split("T")[0];
          if (dStr < dateRange.startDate || dStr > dateRange.endDate) return false;
        } catch (_e) {}
      }
    }
    return true;
  });

  rawAdj.forEach((adj) => {
    const amt = Number(adj.amount) || 0;
    const adjDate = adj.date || adj.createdAt;
    const part = String(adj.particulars || "tds").toLowerCase();
    const isTds = part === "tds";
    const adjType = isTds ? "TDS / TAX DEDUCTION" : "DISCOUNT / DEBT ADJUSTMENT";
    const adjRef = adj.voucherNo || adj.referenceNo || adj.billNo || (isTds ? "TDS-DEDUCT" : "DEBT-ADJ");
    const mode = isTds ? "TAX DEDUCTED" : "DISCOUNT";
    const narration = adj.remarks || adj.reason || (isTds ? "Tax Deducted at Source (TDS)" : "Bad Debt / Discount Allowed");

    ledgerEntries.push({
      date: formatDate(adjDate),
      rawDate: adjDate ? new Date(adjDate) : new Date(),
      type: adjType,
      ref: adjRef,
      particulars: narration,
      mode: mode,
      debit: 0,
      credit: 0,
      tds: isTds ? Number(amt.toFixed(2)) : 0,
      debt: !isTds ? Number(amt.toFixed(2)) : 0,
      status: "ADJUSTED",
      rawAdj: adj,
    });
  });

  // Sort Chronologically
  ledgerEntries.sort((a, b) => {
    if (a.type === "OPENING BALANCE") return -1;
    if (b.type === "OPENING BALANCE") return 1;
    const tA = a.rawDate instanceof Date && !isNaN(a.rawDate.getTime()) ? a.rawDate.getTime() : 0;
    const tB = b.rawDate instanceof Date && !isNaN(b.rawDate.getTime()) ? b.rawDate.getTime() : 0;
    return tA - tB;
  });

  // Calculate Running Balance
  let runningBal = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  let totalTdsDeducted = 0;
  ledgerEntries.forEach((entry) => {
    totalDebit += entry.debit || 0;
    totalCredit += entry.credit || 0;
    totalTdsDeducted += entry.tds || 0;
    if (isClient) {
      runningBal = runningBal + (entry.debit || 0) - (entry.credit || 0) - (entry.tds || 0) - (entry.debt || 0);
    } else {
      runningBal = runningBal + (entry.credit || 0) - (entry.debit || 0) - (entry.tds || 0) - (entry.debt || 0);
    }
    entry.runningBalance = Number(runningBal.toFixed(2));
  });

  // Handle native browser print
  const handlePrint = () => {
    window.print();
  };

  // Handle high quality PDF download
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadViaPuppeteer({
        elementId: "party-ledger-printable-sheet",
        filename: `Statement_Of_Account_${sanitizedPartyName}_${today}.pdf`,
        landscape: true,
        width: "1120px"
      });
      addToast(`PDF statement for "${partyName}" downloaded successfully!`, "success");
    } catch (err) {
      console.error("PDF download error:", err);
      addToast(`Failed to generate PDF: ${err.message}`, "error");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "1rem",
        overflowY: "auto"
      }}
      onClick={onClose}
    >
      {/* Print CSS Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #party-ledger-printable-sheet, #party-ledger-printable-sheet * {
            visibility: visible !important;
          }
          #party-ledger-printable-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Floating Action Header Bar */}
      <div
        className="no-print"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "1120px",
          background: "#ffffff",
          borderRadius: "12px",
          padding: "0.75rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1rem",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          border: "1px solid #e2e8f0",
          position: "sticky",
          top: 0,
          zIndex: 10
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: "220px", flex: "1 1 auto" }}>
          <div style={{ background: "#eff6ff", padding: "6px", borderRadius: "8px", flexShrink: 0 }}>
            <Scale size={20} color="#2563eb" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
              Statement of Account - {partyName}
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              {partyTypeLabel} | {ledgerEntries.length} Transactions | Net Due: {formatCurrency(party.netOutstandingDue)}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#1e3a8a",
              color: "#ffffff",
              border: "none",
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(30, 58, 138, 0.25)"
            }}
          >
            <Printer size={15} /> Print / Save as PDF
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
              color: "#ffffff",
              border: "none",
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: downloadingPdf ? "not-allowed" : "pointer",
              boxShadow: "0 2px 4px rgba(16, 185, 129, 0.25)"
            }}
          >
            {downloadingPdf ? (
              <>
                <RefreshCw size={15} className="spin-animation" /> Generating PDF...
              </>
            ) : (
              <>
                <Download size={15} /> Download PDF
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "8px",
              padding: "0.55rem",
              cursor: "pointer",
              color: "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Close Preview"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Printable Sheet Area */}
      <div
        id="party-ledger-printable-sheet"
        ref={printAreaRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "1120px",
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          color: "#0f172a",
          fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
          boxSizing: "border-box"
        }}
      >
        {/* Company Header Block */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #1e3a8a", paddingBottom: "1rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <img
              src="/mc.png"
              alt="Multimarg Logo"
              style={{ width: "80px", height: "80px", objectFit: "contain" }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <div>
              <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#1e3a8a", letterSpacing: "-0.02em" }}>
                MULTIMARG CARRIERS PVT. LTD.
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#334155", fontWeight: 500 }}>
                LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND-263153
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#0f172a", fontWeight: 700 }}>
                GSTIN: 05AANCM3054E1ZN &nbsp;|&nbsp; PAN: AANCM3054E1ZN
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                Contact: +91 5944-324033 &nbsp;|&nbsp; Email: info@multimarg.com &nbsp;|&nbsp; Web: www.multimarg.com
              </p>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <span style={{
              display: "inline-block",
              background: "#1e3a8a",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "0.8rem",
              padding: "4px 10px",
              borderRadius: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "6px"
            }}>
              STATEMENT OF ACCOUNT
            </span>
            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
              Date: <strong style={{ color: "#0f172a" }}>{formattedToday}</strong>
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
              Period: <strong>Complete Financial Year</strong>
            </div>
          </div>
        </div>

        {/* 2-Column Info & Financial Snapshot Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
          {/* Left: Party Information */}
          <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "0.85rem 1rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "#1e3a8a", letterSpacing: "0.5px", marginBottom: "6px", borderBottom: "1px solid #e2e8f0", paddingBottom: "4px" }}>
                ACCOUNT & BILLING PROFILE ({partyTypeLabel})
              </div>
              
              <div style={{ fontSize: "1.0rem", fontWeight: 800, color: "#0f172a", marginBottom: "4px", lineHeight: "1.25", wordBreak: "break-word" }}>
                {partyName}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: "0.78rem", color: "#475569", marginBottom: "8px", borderBottom: "1px dashed #cbd5e1", paddingBottom: "6px" }}>
                <span><strong style={{ color: "#64748b" }}>Code:</strong> <strong style={{ color: "#1e293b" }}>{party.code || "-"}</strong></span>
                <span><strong style={{ color: "#64748b" }}>GSTIN:</strong> <strong style={{ color: "#0f172a" }}>{party.gst || "-"}</strong></span>
                <span><strong style={{ color: "#64748b" }}>Contact:</strong> <strong style={{ color: "#334155" }}>{party.contact || "-"}</strong></span>
              </div>
            </div>

            {/* Address cleanly formatted in 3-4 stacked lines below */}
            <div style={{ fontSize: "0.78rem", color: "#334155", lineHeight: "1.4", background: "#ffffff", padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontWeight: 800, color: "#475569", fontSize: "0.70rem", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
                Billing & Registered Address:
              </div>
              <div style={{ color: "#1e293b", wordBreak: "break-word", whiteSpace: "normal" }}>
                {party.address || "-"}
              </div>
            </div>
          </div>

          {/* Right: Executive Financial Summary */}
          <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "0.85rem 1rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "#1e3a8a", letterSpacing: "0.5px", marginBottom: "6px", borderBottom: "1px solid #e2e8f0", paddingBottom: "4px" }}>
              EXECUTIVE FINANCIAL POSITION
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "0.80rem", marginBottom: "8px" }}>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Prior FY Opening Due:</span>
                <strong style={{ color: "#b45309" }}>{formatCurrency(party.openingDue)}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Total Invoiced:</span>
                <strong style={{ color: "#0f172a" }}>{formatCurrency(party.totalInvoiced)}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Total Paid / Received:</span>
                <strong style={{ color: "#16a34a" }}>{formatCurrency(party.totalPaid)}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>TDS & Bad Debt:</span>
                <strong style={{ color: "#7c3aed" }}>{formatCurrency((party.totalTds || 0) + (party.totalDebt || 0))}</strong>
              </div>
            </div>

            {/* Prominent Net Due Box */}
            <div style={{
              background: party.netOutstandingDue > 0 ? "#fee2e2" : "#dcfce7",
              border: `1px solid ${party.netOutstandingDue > 0 ? "#fca5a5" : "#86efac"}`,
              borderRadius: "6px",
              padding: "6px 10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: party.netOutstandingDue > 0 ? "#991b1b" : "#166534" }}>
                  NET OUTSTANDING BALANCE DUE
                </span>
                <div style={{ fontSize: "1.15rem", fontWeight: 900, color: party.netOutstandingDue > 0 ? "#991b1b" : "#166534" }}>
                  {formatCurrency(party.netOutstandingDue)}
                </div>
              </div>
              <span style={{
                background: party.status === "paid" ? "#16a34a" : party.status === "partial" ? "#d97706" : "#dc2626",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "0.75rem",
                padding: "3px 8px",
                borderRadius: "12px",
                textTransform: "uppercase"
              }}>
                {party.status === "paid" ? "SETTLED" : party.status === "partial" ? `PARTIAL (${party.recoveryPercent}%)` : "OVERDUE"}
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Chronological Running Ledger */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.5rem" }}>
            <FileText size={16} color="#1e3a8a" />
            <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              1. Chronological Statement of Account (Running Ledger)
            </h4>
          </div>

          <table style={{ width: "100%", fontSize: "0.78rem", borderCollapse: "collapse", border: "1px solid #cbd5e1" }}>
            <thead>
              <tr style={{ background: "#1e3a8a", color: "#ffffff", textAlign: "left" }}>
                <th style={{ padding: "6px 8px", width: "35px", textAlign: "center" }}>SL</th>
                <th style={{ padding: "6px 8px", width: "85px", textAlign: "center" }}>Date</th>
                <th style={{ padding: "6px 8px", width: "135px" }}>Transaction Type</th>
                <th style={{ padding: "6px 8px", width: "110px" }}>Ref / Bill No</th>
                <th style={{ padding: "6px 8px" }}>Particulars / Narration</th>
                <th style={{ padding: "6px 8px", width: "95px", textAlign: "center" }}>Mode</th>
                <th style={{ padding: "6px 8px", width: "90px", textAlign: "right" }}>Debit (₹)</th>
                <th style={{ padding: "6px 8px", width: "90px", textAlign: "right" }}>Credit (₹)</th>
                <th style={{ padding: "6px 8px", width: "90px", textAlign: "right" }}>TDS Deducted (₹)</th>
                <th style={{ padding: "6px 8px", width: "100px", textAlign: "right" }}>Balance (₹)</th>
                <th style={{ padding: "6px 8px", width: "70px", textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.map((entry, idx) => {
                const isEven = idx % 2 === 1;
                return (
                  <tr key={idx} style={{ background: isEven ? "#f8fafc" : "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "5px 8px", textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                    <td style={{ padding: "5px 8px", textAlign: "center", whiteSpace: "nowrap", fontWeight: 600 }}>{entry.date}</td>
                    <td style={{ padding: "5px 8px", fontWeight: 600, color: entry.tds > 0 ? "#b45309" : "#334155" }}>{entry.type}</td>
                    <td style={{ padding: "5px 8px", fontWeight: 700, color: "#2563eb" }}>{entry.ref}</td>
                    <td style={{ padding: "5px 8px", color: "#334155" }}>{entry.particulars}</td>
                    <td style={{ padding: "5px 8px", textAlign: "center", fontSize: "0.72rem", color: "#64748b" }}>{entry.mode}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600, color: entry.debit > 0 ? "#0f172a" : "#94a3b8" }}>
                      {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                    </td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600, color: entry.credit > 0 ? "#16a34a" : "#94a3b8" }}>
                      {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                    </td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: entry.tds > 0 ? "#d97706" : entry.debt > 0 ? "#7c3aed" : "#94a3b8" }}>
                      {entry.tds > 0 ? formatCurrency(entry.tds) : entry.debt > 0 ? formatCurrency(entry.debt) : "-"}
                    </td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 800, color: entry.runningBalance > 0 ? (isClient ? "#1e3a8a" : "#be123c") : "#16a34a" }}>
                      {formatCurrency(entry.runningBalance)}
                    </td>
                    <td style={{ padding: "5px 8px", textAlign: "center" }}>
                      <span style={{
                        padding: "2px 6px",
                        borderRadius: "8px",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        backgroundColor: entry.status === "PAID" || entry.status === "SETTLED" ? "#dcfce7" : entry.status === "PARTIAL" ? "#fef3c7" : entry.status === "ADJUSTED" ? "#fef3c7" : "#fee2e2",
                        color: entry.status === "PAID" || entry.status === "SETTLED" ? "#166534" : entry.status === "PARTIAL" ? "#92400e" : entry.status === "ADJUSTED" ? "#92400e" : "#991b1b"
                      }}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#dbeafe", fontWeight: 800, color: "#1e3a8a", borderTop: "2px solid #1e3a8a" }}>
                <td colSpan={6} style={{ padding: "7px 10px", textAlign: "right", fontSize: "0.82rem" }}>
                  GRAND TOTAL ({ledgerEntries.length} TRANSACTIONS):
                </td>
                <td style={{ padding: "7px 8px", textAlign: "right", fontSize: "0.82rem" }}>
                  {formatCurrency(totalDebit)}
                </td>
                <td style={{ padding: "7px 8px", textAlign: "right", fontSize: "0.82rem", color: "#16a34a" }}>
                  {formatCurrency(totalCredit)}
                </td>
                <td style={{ padding: "7px 8px", textAlign: "right", fontSize: "0.82rem", color: "#d97706" }}>
                  {formatCurrency(totalTdsDeducted)}
                </td>
                <td style={{ padding: "7px 8px", textAlign: "right", fontSize: "0.90rem", fontWeight: 900, color: party.netOutstandingDue > 0 ? "#dc2626" : "#16a34a" }}>
                  {formatCurrency(party.netOutstandingDue)}
                </td>
                <td style={{ padding: "7px 8px", textAlign: "center", fontSize: "0.72rem", color: party.status === "paid" ? "#166534" : "#991b1b" }}>
                  {party.status === "paid" ? "SETTLED" : "DUE"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Section 2: Detailed Invoices & Bills Breakdown */}
        {rawBills.length > 0 && (
          <div style={{ marginBottom: "1.5rem", pageBreakInside: "avoid" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.5rem" }}>
              <FileText size={16} color="#1e3a8a" />
              <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                2. {isClient ? "Sales Invoices" : "Purchase Bills"} Breakdown ({rawBills.length} Bills)
              </h4>
            </div>

            <table style={{ width: "100%", fontSize: "0.78rem", borderCollapse: "collapse", border: "1px solid #cbd5e1" }}>
              <thead>
                <tr style={{ background: "#334155", color: "#ffffff", textAlign: "left" }}>
                  <th style={{ padding: "6px 8px", width: "35px", textAlign: "center" }}>SL</th>
                  <th style={{ padding: "6px 8px", width: "90px", textAlign: "center" }}>Bill Date</th>
                  <th style={{ padding: "6px 8px", width: "120px" }}>Bill / Invoice No</th>
                  <th style={{ padding: "6px 8px", width: "90px", textAlign: "center" }}>Due Date</th>
                  <th style={{ padding: "6px 8px" }}>Vehicle / Consignment Details</th>
                  <th style={{ padding: "6px 8px", width: "100px", textAlign: "right" }}>Total (₹)</th>
                  <th style={{ padding: "6px 8px", width: "90px", textAlign: "right" }}>Paid (₹)</th>
                  <th style={{ padding: "6px 8px", width: "80px", textAlign: "right" }}>TDS (₹)</th>
                  <th style={{ padding: "6px 8px", width: "80px", textAlign: "right" }}>Debt (₹)</th>
                  <th style={{ padding: "6px 8px", width: "95px", textAlign: "right" }}>Remaining Due</th>
                  <th style={{ padding: "6px 8px", width: "75px", textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rawBills.map((b, bIdx) => {
                  const bTot = Number(b.amount || b.total) || 0;
                  const bP = Number(b.paidAmount) || 0;
                  const bT = Number(b.tdsAmount) || 0;
                  const bD = Number(b.debtAmount) || 0;
                  const isCanc = String(b.status || "").toLowerCase() === "cancelled";
                  const bRem = isCanc ? 0 : Math.max(0, bTot - bP - bT - bD);
                  const bSt = isCanc ? "CANCELLED" : bRem <= 0.01 ? "PAID" : (bP > 0 || bT > 0 || bD > 0) ? "PARTIAL" : "UNPAID";
                  const bDate = b.invoice_date || b.billDate || b.date || b.createdAt || b.invoiceDate || b.purchaseDate || b.lrDate;
                  const bNo = (b.invoice || b.billNo || b.invoiceNo || b.purchaseNo || b.billNumber || b.invNo || b.refNo || (b.id ? String(b.id).slice(-6) : "") || "-").toUpperCase();
                  const stDetails = getBillSettlementDetails(b, rawCash, rawAdj);

                  return (
                    <tr key={bIdx} style={{ background: bIdx % 2 === 1 ? "#f8fafc" : "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "5px 8px", textAlign: "center", color: "#64748b" }}>{bIdx + 1}</td>
                      <td style={{ padding: "5px 8px", textAlign: "center", whiteSpace: "nowrap" }}>{formatDate(bDate)}</td>
                      <td style={{ padding: "5px 8px", fontWeight: 700, color: "#2563eb" }}>{bNo}</td>
                      <td style={{ padding: "5px 8px", textAlign: "center", color: "#64748b" }}>{calculateDueDate(bDate, b.dueDate)}</td>
                      <td style={{ padding: "5px 8px", color: "#334155" }}>
                        <div style={{ fontWeight: 600 }}>{b.vehicleNo || b.vehicles || b.description || (isClient ? "Freight & Transportation Services" : "Vendor Transport Charges")}</div>
                        {stDetails.paymentSummary !== "-" && (
                          <div style={{ fontSize: "0.70rem", color: "#166534", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <CheckCircle2 size={10} color="#16a34a" /> {stDetails.paymentSummary}
                          </div>
                        )}
                        {stDetails.tdsSummary !== "-" && (
                          <div style={{ fontSize: "0.70rem", color: "#b45309", marginTop: "1px" }}>
                            🏷️ {stDetails.tdsSummary}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600 }}>{formatCurrency(bTot)}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right", color: "#16a34a", fontWeight: 600 }}>{formatCurrency(bP)}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right", color: "#d97706" }}>{formatCurrency(bT)}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right", color: "#7c3aed" }}>{formatCurrency(bD)}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: bRem > 0 ? "#dc2626" : "#16a34a" }}>
                        {formatCurrency(bRem)}
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "center" }}>
                        <span style={{
                          padding: "2px 6px",
                          borderRadius: "8px",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          backgroundColor: bSt === "PAID" ? "#dcfce7" : bSt === "PARTIAL" ? "#fef3c7" : "#fee2e2",
                          color: bSt === "PAID" ? "#166534" : bSt === "PARTIAL" ? "#92400e" : "#991b1b"
                        }}>
                          {bSt}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot style={{ background: "#f1f5f9", fontWeight: 700, borderTop: "2px solid #cbd5e1" }}>
                <tr>
                  <td colSpan={5} style={{ padding: "7px 8px", textAlign: "right", color: "#1e3a8a", fontWeight: 800 }}>
                    GRAND TOTAL ({rawBills.length} BILLS)
                  </td>
                  <td style={{ padding: "7px 8px", textAlign: "right", color: "#0f172a", fontWeight: 800 }}>
                    {formatCurrency(rawBills.reduce((acc, b) => acc + (Number(b.amount || b.total) || 0), 0))}
                  </td>
                  <td style={{ padding: "7px 8px", textAlign: "right", color: "#16a34a", fontWeight: 800 }}>
                    {formatCurrency(rawBills.reduce((acc, b) => acc + (Number(b.paidAmount) || 0), 0))}
                  </td>
                  <td style={{ padding: "7px 8px", textAlign: "right", color: "#d97706", fontWeight: 800 }}>
                    {formatCurrency(rawBills.reduce((acc, b) => acc + (Number(b.tdsAmount) || 0), 0))}
                  </td>
                  <td style={{ padding: "7px 8px", textAlign: "right", color: "#7c3aed", fontWeight: 800 }}>
                    {formatCurrency(rawBills.reduce((acc, b) => acc + (Number(b.debtAmount) || 0), 0))}
                  </td>
                  <td style={{ padding: "7px 8px", textAlign: "right", color: "#dc2626", fontWeight: 800 }}>
                    {formatCurrency(rawBills.reduce((acc, b) => {
                      const tot = Number(b.amount || b.total) || 0;
                      const p = Number(b.paidAmount) || 0;
                      const t = Number(b.tdsAmount) || 0;
                      const d = Number(b.debtAmount) || 0;
                      return acc + Math.max(0, tot - p - t - d);
                    }, 0))}
                  </td>
                  <td style={{ padding: "7px 8px", textAlign: "center", color: "#1e3a8a", fontSize: "0.72rem" }}>
                    TOTALS
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Section 3: Payments & Adjustments Schedule */}
        {(rawCash.length > 0 || rawAdj.length > 0) && (
          <div style={{ marginBottom: "1.5rem", pageBreakInside: "avoid" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.5rem" }}>
              <FileText size={16} color="#1e3a8a" />
              <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                3. Cash Receipts, Bank Settlements & Tax Deductions
              </h4>
            </div>

            <table style={{ width: "100%", fontSize: "0.78rem", borderCollapse: "collapse", border: "1px solid #cbd5e1" }}>
              <thead>
                <tr style={{ background: "#475569", color: "#ffffff", textAlign: "left" }}>
                  <th style={{ padding: "6px 8px", width: "35px", textAlign: "center" }}>SL</th>
                  <th style={{ padding: "6px 8px", width: "90px", textAlign: "center" }}>Date</th>
                  <th style={{ padding: "6px 8px", width: "150px" }}>Category / Type</th>
                  <th style={{ padding: "6px 8px", width: "115px" }}>Voucher / Ref</th>
                  <th style={{ padding: "6px 8px", width: "115px" }}>Linked Bill No</th>
                  <th style={{ padding: "6px 8px", width: "105px", textAlign: "center" }}>Payment Mode</th>
                  <th style={{ padding: "6px 8px" }}>Narration / Remarks</th>
                  <th style={{ padding: "6px 8px", width: "105px", textAlign: "right" }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {rawCash.map((c, cIdx) => (
                  <tr key={`c-${cIdx}`} style={{ background: cIdx % 2 === 1 ? "#f8fafc" : "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "5px 8px", textAlign: "center", color: "#64748b" }}>{cIdx + 1}</td>
                    <td style={{ padding: "5px 8px", textAlign: "center" }}>{formatDate(c.date || c.createdAt)}</td>
                    <td style={{ padding: "5px 8px", fontWeight: 600, color: c.type === "in" ? "#16a34a" : "#dc2626" }}>
                      {c.type === "in" ? "Cash/Bank Receipt" : "Cash/Bank Payment"}
                    </td>
                    <td style={{ padding: "5px 8px", fontWeight: 700, color: "#2563eb" }}>{c.voucherNo || c.referenceNo || c.refNo || "-"}</td>
                    <td style={{ padding: "5px 8px", fontWeight: 600, color: "#475569" }}>{c.billNo || c.referenceNo || "-"}</td>
                    <td style={{ padding: "5px 8px", textAlign: "center", fontSize: "0.72rem" }}>{c.paymentMode || c.mode || "BANK / CASH"}</td>
                    <td style={{ padding: "5px 8px", color: "#334155" }}>{c.narration || c.notes || c.particulars || "-"}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: "#16a34a" }}>
                      {formatCurrency(c.amount)}
                    </td>
                  </tr>
                ))}
                {rawAdj.map((adj, aIdx) => {
                  const part = String(adj.particulars || "tds").toLowerCase();
                  return (
                    <tr key={`a-${aIdx}`} style={{ background: "#fdf4ff", borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "5px 8px", textAlign: "center", color: "#64748b" }}>{rawCash.length + aIdx + 1}</td>
                      <td style={{ padding: "5px 8px", textAlign: "center" }}>{formatDate(adj.date || adj.createdAt)}</td>
                      <td style={{ padding: "5px 8px", fontWeight: 700, color: part === "tds" ? "#d97706" : "#7c3aed" }}>
                        {part === "tds" ? "TDS Tax Deduction" : "Bad Debt / Discount"}
                      </td>
                      <td style={{ padding: "5px 8px", fontWeight: 700, color: "#2563eb" }}>{adj.voucherNo || adj.referenceNo || "ADJ-ENTRY"}</td>
                      <td style={{ padding: "5px 8px", fontWeight: 600, color: "#475569" }}>{adj.billNo || adj.linkedBillNo || "-"}</td>
                      <td style={{ padding: "5px 8px", textAlign: "center", fontSize: "0.72rem" }}>{part === "tds" ? "TAX DEDUCTED" : "DISCOUNT"}</td>
                      <td style={{ padding: "5px 8px", color: "#334155" }}>{adj.remarks || adj.reason || (part === "tds" ? "TDS Tax Deducted" : "Debt write-off")}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: "#7c3aed" }}>
                        {formatCurrency(adj.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot style={{ background: "#f1f5f9", fontWeight: 700, borderTop: "2px solid #cbd5e1" }}>
                <tr>
                  <td colSpan={7} style={{ padding: "7px 8px", textAlign: "right", color: "#1e3a8a", fontWeight: 800 }}>
                    TOTAL DISBURSEMENTS / SETTLEMENTS
                  </td>
                  <td style={{ padding: "7px 8px", textAlign: "right", color: "#16a34a", fontWeight: 800 }}>
                    {formatCurrency(
                      rawCash.reduce((acc, c) => acc + (Number(c.amount) || 0), 0) +
                      rawAdj.reduce((acc, a) => acc + (Number(a.amount) || 0), 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Verification & Sign-off Footer */}
        <div style={{ borderTop: "2px solid #cbd5e1", paddingTop: "1.25rem", marginTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", pageBreakInside: "avoid" }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
              This is a computer-generated Statement of Account from Multimarg ERP.
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
              Printed Date: {new Date().toLocaleString("en-IN")}
            </p>
            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ borderTop: "1px solid #94a3b8", width: "160px", paddingTop: "4px", fontSize: "0.78rem", color: "#475569", fontWeight: 600 }}>
                Prepared By (Accounts)
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 800, color: "#1e3a8a" }}>
              For MULTIMARG CARRIERS PVT. LTD.
            </p>
            <div style={{ marginTop: "2.5rem" }}>
              <div style={{ borderTop: "1px solid #1e3a8a", width: "200px", marginLeft: "auto", paddingTop: "4px", fontSize: "0.78rem", color: "#1e3a8a", fontWeight: 700 }}>
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartyLedgerPrintModal;
