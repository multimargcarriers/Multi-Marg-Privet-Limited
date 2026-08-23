import React, { useState, useEffect, useContext, useMemo } from "react";
import axios from "axios";
import {
  X,
  Search,
  FileText,
  Package,
  Truck,
  Building2,
  Download,
  Calendar,
  IndianRupee,
  RefreshCw,
  Layers,
  FileSpreadsheet,
  FileType,
  Filter,
  CheckSquare,
  Square
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { formatDate } from "../../utils/formatters";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Dynamically load html2canvas and jsPDF
async function getPdfEngine() {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf")
  ]);
  return { html2canvas, jsPDF };
}

// Currency Formatter
const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(num);
};

// Indian Currency Number to Words converter
function numberToWordsIndian(num) {
  if (num === null || num === undefined || isNaN(num)) return "Rs. Zero Only.";
  const n = Math.floor(Math.abs(num));
  if (n === 0) return "Rs. Zero Only.";

  const units = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertChunk(val) {
    let str = "";
    if (val >= 100) {
      str += units[Math.floor(val / 100)] + " Hundred ";
      val %= 100;
    }
    if (val >= 20) {
      str += tens[Math.floor(val / 10)] + " ";
      val %= 10;
    }
    if (val > 0) {
      str += units[val] + " ";
    }
    return str;
  }

  let words = "";
  let temp = n;

  const crore = Math.floor(temp / 10000000);
  if (crore > 0) {
    words += convertChunk(crore) + "Crore ";
    temp %= 10000000;
  }

  const lakh = Math.floor(temp / 100000);
  if (lakh > 0) {
    words += convertChunk(lakh) + "Lakh ";
    temp %= 100000;
  }

  const thousand = Math.floor(temp / 1000);
  if (thousand > 0) {
    words += convertChunk(thousand) + "Thousand ";
    temp %= 1000;
  }

  if (temp > 0) {
    words += convertChunk(temp);
  }

  return `Rs. ${words.trim()} Only.`;
}

// Key normalizer
const normalizePartyKey = (name) => {
  if (!name) return "";
  let s = String(name).trim().toLowerCase().replace(/[\s\.\-_]+/g, " ");
  if (s === "sky 4 logistics" || s === "sky 4") s = "sky 4 pune";
  if (s === "cj darcl") s = "cj darcl logistics limited";
  return s;
};

// =========================================================================
// CRISP A4 COMPACT LAYOUT (PROPORTIONED PERFECTLY FOR STANDARD A4 SHEET)
// =========================================================================

const renderCompanyHeaderHtml = (partyName, todayFormatted, pageNum, totalPages) => `
  <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e3a8a; padding-bottom: 6px; margin-bottom: 8px;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <img src="/mc.png" alt="Logo" style="width: 52px; height: 52px; object-fit: contain;" />
      <div>
        <h1 style="margin: 0; font-size: 16px; font-weight: 900; color: #1e3a8a; letter-spacing: -0.02em;">MULTIMARG CARRIERS PVT. LTD.</h1>
        <p style="margin: 1px 0 0; font-size: 9.5px; color: #334155; font-weight: 500;">LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND-263153</p>
        <p style="margin: 1px 0 0; font-size: 9.5px; color: #0f172a; font-weight: 700;">GSTIN: 05AANCM3054E1ZN &nbsp;|&nbsp; PAN: AANCM3054E1ZN</p>
        <p style="margin: 1px 0 0; font-size: 8.5px; color: #64748b;">Contact: +91 5944-324033 &nbsp;|&nbsp; Email: info@multimarg.com &nbsp;|&nbsp; Web: www.multimarg.com</p>
      </div>
    </div>

    <div style="text-align: right;">
      <span style="display: inline-block; background: #1e3a8a; color: #ffffff; font-weight: 800; font-size: 9.5px; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px;">
        STATEMENT OF ACCOUNT
      </span>
      <div style="font-size: 9.5px; color: #64748b;">Date: <strong style="color: #0f172a;">${todayFormatted}</strong></div>
      <div style="font-size: 9px; color: #1e3a8a; font-weight: 700;">Page ${pageNum} of ${totalPages}</div>
    </div>
  </div>
`;

const renderContinuationHeaderHtml = (partyName, todayFormatted, pageNum, totalPages) => `
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #1e3a8a; padding: 5px 8px; margin-bottom: 8px; background: #f8fafc; border-radius: 4px;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <img src="/mc.png" alt="Logo" style="width: 24px; height: 24px; object-fit: contain;" />
      <span style="font-size: 12px; font-weight: 900; color: #1e3a8a;">MULTIMARG CARRIERS</span>
      <span style="color: #64748b; font-size: 10px;">•</span>
      <span style="font-size: 11px; font-weight: 800; color: #0f172a;">STATEMENT OF ACCOUNT (Contd.) — ${partyName}</span>
    </div>
    <div style="font-size: 9.5px; color: #475569; font-weight: 700;">
      Date: ${todayFormatted} &nbsp;|&nbsp; <span style="background: #1e3a8a; color: #ffffff; padding: 1px 6px; border-radius: 3px;">Page ${pageNum} of ${totalPages}</span>
    </div>
  </div>
`;

const renderTwoCardsHtml = (party, partyTypeLabel) => `
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
    <!-- Left: Party Information -->
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.4px; margin-bottom: 2px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
          ACCOUNT & BILLING PROFILE (${partyTypeLabel})
        </div>
        <div style="font-size: 12.5px; font-weight: 900; color: #0f172a; margin-bottom: 2px;">
          ${party.partyName}
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 2px 10px; font-size: 9px; color: #475569; margin-bottom: 4px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px;">
          <span>Code: <strong style="color: #1e293b;">${party.code || "-"}</strong></span>
          <span>GSTIN: <strong style="color: #0f172a;">${party.gst || "-"}</strong></span>
          <span>Contact: <strong style="color: #334155;">${party.contact || "-"}</strong></span>
        </div>
      </div>
      <div style="font-size: 9px; color: #334155; line-height: 1.3; background: #ffffff; padding: 4px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
        <strong style="color: #475569; font-size: 8.5px; text-transform: uppercase;">Address:</strong> ${party.address || "-"}
      </div>
    </div>

    <!-- Right: Executive Financial Summary -->
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px;">
      <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.4px; margin-bottom: 2px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
        EXECUTIVE FINANCIAL POSITION
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3px 8px; font-size: 9.5px; margin-bottom: 4px;">
        <div><span style="color: #64748b;">Prior FY Opening:</span> <strong style="color: #b45309;">${formatCurrency(party.openingDue)}</strong></div>
        <div><span style="color: #64748b;">Total Invoiced:</span> <strong style="color: #0f172a;">${formatCurrency(party.totalInvoiced)}</strong></div>
        <div><span style="color: #64748b;">Total Paid / Recd:</span> <strong style="color: #16a34a;">${formatCurrency(party.totalPaid)}</strong></div>
        <div><span style="color: #64748b;">TDS & Bad Debt:</span> <strong style="color: #7c3aed;">${formatCurrency((party.totalTds || 0) + (party.totalDebt || 0))}</strong></div>
      </div>
      <div style="background: ${party.netOutstandingDue > 0.01 ? '#fee2e2' : '#dcfce7'}; border: 1px solid ${party.netOutstandingDue > 0.01 ? '#fca5a5' : '#86efac'}; border-radius: 4px; padding: 4px 8px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: ${party.netOutstandingDue > 0.01 ? '#991b1b' : '#166534'};">NET OUTSTANDING BALANCE DUE</div>
          <div style="font-size: 14px; font-weight: 900; color: ${party.netOutstandingDue > 0.01 ? '#991b1b' : '#166534'};">${formatCurrency(party.netOutstandingDue)}</div>
        </div>
        <span style="background: ${party.status === 'paid' ? '#16a34a' : party.status === 'partial' ? '#d97706' : '#dc2626'}; color: #ffffff; font-weight: 800; font-size: 9px; padding: 2px 7px; border-radius: 8px; text-transform: uppercase;">
          ${party.status === 'paid' ? 'SETTLED' : party.status === 'partial' ? `PARTIAL (${party.recoveryPercent}%)` : 'OVERDUE'}
        </span>
      </div>
    </div>
  </div>
`;

const renderLedgerTableHeader = () => `
  <thead>
    <tr style="background: #1e3a8a; color: #ffffff; text-align: left;">
      <th style="padding: 4px 5px; width: 25px; text-align: center;">SL</th>
      <th style="padding: 4px 5px; width: 68px; text-align: center;">Date</th>
      <th style="padding: 4px 5px; width: 105px;">Type</th>
      <th style="padding: 4px 5px; width: 90px;">Ref / Bill No</th>
      <th style="padding: 4px 5px;">Particulars / Narration</th>
      <th style="padding: 4px 5px; width: 75px; text-align: right;">Debit (₹)</th>
      <th style="padding: 4px 5px; width: 75px; text-align: right;">Credit (₹)</th>
      <th style="padding: 4px 5px; width: 65px; text-align: right;">TDS (₹)</th>
      <th style="padding: 4px 5px; width: 85px; text-align: right;">Balance (₹)</th>
      <th style="padding: 4px 5px; width: 55px; text-align: center;">Status</th>
    </tr>
  </thead>
`;

const renderLedgerRows = (rows, startIndex) => rows.map((e, idx) => `
  <tr style="background: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #e2e8f0; font-size: 8.5px;">
    <td style="padding: 3.5px 5px; text-align: center; color: #64748b;">${startIndex + idx + 1}</td>
    <td style="padding: 3.5px 5px; text-align: center; white-space: nowrap; font-weight: 600;">${e.date}</td>
    <td style="padding: 3.5px 5px; font-weight: 600; color: ${e.tds > 0 ? '#b45309' : '#334155'};">${e.type}</td>
    <td style="padding: 3.5px 5px; font-weight: 700; color: #2563eb;">${e.ref}</td>
    <td style="padding: 3.5px 5px; color: #334155;">${e.particulars}</td>
    <td style="padding: 3.5px 5px; text-align: right; font-weight: 600; color: ${e.debit > 0 ? '#0f172a' : '#94a3b8'};">${e.debit > 0 ? formatCurrency(e.debit) : "-"}</td>
    <td style="padding: 3.5px 5px; text-align: right; font-weight: 600; color: ${e.credit > 0 ? '#16a34a' : '#94a3b8'};">${e.credit > 0 ? formatCurrency(e.credit) : "-"}</td>
    <td style="padding: 3.5px 5px; text-align: right; font-weight: 700; color: ${e.tds > 0 ? '#d97706' : '#94a3b8'};">${e.tds > 0 ? formatCurrency(e.tds) : "-"}</td>
    <td style="padding: 3.5px 5px; text-align: right; font-weight: 800; color: ${e.runningBalance > 0 ? '#1e3a8a' : '#16a34a'};">${formatCurrency(e.runningBalance)}</td>
    <td style="padding: 3.5px 5px; text-align: center;">
      <span style="padding: 1px 4px; border-radius: 6px; font-size: 7.5px; font-weight: 700; background: ${e.status === 'PAID' || e.status === 'SETTLED' ? '#dcfce7' : e.status === 'PARTIAL' || e.status === 'ADJUSTED' ? '#fef3c7' : '#fee2e2'}; color: ${e.status === 'PAID' || e.status === 'SETTLED' ? '#166534' : e.status === 'PARTIAL' || e.status === 'ADJUSTED' ? '#92400e' : '#991b1b'};">
        ${e.status}
      </span>
    </td>
  </tr>
`).join("");

const renderBillsTableHeader = () => `
  <thead>
    <tr style="background: #334155; color: #ffffff; text-align: left;">
      <th style="padding: 4px 5px; width: 25px; text-align: center;">SL</th>
      <th style="padding: 4px 5px; width: 68px; text-align: center;">Bill Date</th>
      <th style="padding: 4px 5px; width: 85px;">Bill / Invoice No</th>
      <th style="padding: 4px 5px;">Vehicle / Details</th>
      <th style="padding: 4px 5px; width: 75px; text-align: right;">Taxable (₹)</th>
      <th style="padding: 4px 5px; width: 65px; text-align: right;">GST (₹)</th>
      <th style="padding: 4px 5px; width: 75px; text-align: right;">Total (₹)</th>
      <th style="padding: 4px 5px; width: 70px; text-align: right;">Paid (₹)</th>
      <th style="padding: 4px 5px; width: 55px; text-align: right;">TDS (₹)</th>
      <th style="padding: 4px 5px; width: 75px; text-align: right;">Due (₹)</th>
      <th style="padding: 4px 5px; width: 50px; text-align: center;">Status</th>
    </tr>
  </thead>
`;

const renderBillsRows = (bills, startIndex) => bills.map((b, bIdx) => {
  const bTot = Number(b.amount || b.totalAmount || b.total) || 0;
  const bTaxable = Number(b.taxableAmount || b.taxable) || (b.gstAmount || b.gst ? bTot - Number(b.gstAmount || b.gst) : bTot / 1.18);
  const bGst = Number(b.gstAmount || b.gst) || (bTot - bTaxable);
  const bP = Number(b.paidAmount) || 0;
  const bT = Number(b.tdsAmount) || 0;
  const bRem = Math.max(0, bTot - bP - bT);
  const bSt = bRem <= 0.01 ? "PAID" : bP > 0 ? "PARTIAL" : "UNPAID";
  const bDate = b.invoice_date || b.billDate || b.date || b.createdAt;
  const bNo = (b.invoice || b.billNo || b.invoiceNo || b.purchaseNo || b.billNumber || "-").toUpperCase();

  return `
    <tr style="background: ${bIdx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #e2e8f0; font-size: 8.5px;">
      <td style="padding: 3.5px 5px; text-align: center; color: #64748b;">${startIndex + bIdx + 1}</td>
      <td style="padding: 3.5px 5px; text-align: center; white-space: nowrap;">${formatDate(bDate)}</td>
      <td style="padding: 3.5px 5px; font-weight: 700; color: #2563eb;">${bNo}</td>
      <td style="padding: 3.5px 5px; color: #334155;">${b.vehicleNo || b.vehicles || "Freight & Transportation Services"}</td>
      <td style="padding: 3.5px 5px; text-align: right; color: #475569;">${formatCurrency(bTaxable)}</td>
      <td style="padding: 3.5px 5px; text-align: right; color: #4f46e5; font-weight: 600;">${formatCurrency(bGst)}</td>
      <td style="padding: 3.5px 5px; text-align: right; font-weight: 700; color: #0f172a;">${formatCurrency(bTot)}</td>
      <td style="padding: 3.5px 5px; text-align: right; color: #16a34a; font-weight: 600;">${formatCurrency(bP)}</td>
      <td style="padding: 3.5px 5px; text-align: right; color: #d97706;">${formatCurrency(bT)}</td>
      <td style="padding: 3.5px 5px; text-align: right; font-weight: 700; color: ${bRem > 0 ? '#dc2626' : '#16a34a'};">${formatCurrency(bRem)}</td>
      <td style="padding: 3.5px 5px; text-align: center;">
        <span style="padding: 1px 4px; border-radius: 6px; font-size: 7.5px; font-weight: 700; background: ${bSt === 'PAID' ? '#dcfce7' : bSt === 'PARTIAL' ? '#fef3c7' : '#fee2e2'}; color: ${bSt === 'PAID' ? '#166534' : bSt === 'PARTIAL' ? '#92400e' : '#991b1b'};">
          ${bSt}
        </span>
      </td>
    </tr>
  `;
}).join("");

const renderFooterAndSignaturesHtml = (party) => `
  <!-- Bank Remittance Coordinates -->
  <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 5px 8px; font-size: 8.5px; margin-top: 6px; margin-bottom: 6px;">
    <strong style="color: #1e3a8a; text-transform: uppercase;">Official Electronic Remittance Coordinates:</strong>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 2px;">
      <div>Beneficiary: <strong>MULTIMARG CARRIERS PRIVATE LIMITED</strong> • Bank: <strong>HDFC Bank</strong></div>
      <div>A/c No: <strong style="color: #1e3a8a;">50200065432109</strong> • IFSC: <strong>HDFC0001234</strong> • Branch: <strong>Pantnagar</strong></div>
    </div>
  </div>

  <!-- Signatures -->
  <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 8.5px; border-top: 1px solid #cbd5e1; padding-top: 4px;">
    <div>Terms: All accounts verified as per company ERP records. Subject to Pantnagar jurisdiction.</div>
    <div style="text-align: right;">
      <div style="font-weight: 800; color: #1e3a8a;">For MULTIMARG CARRIERS PVT. LTD.</div>
      <div style="margin-top: 12px; font-weight: 700; color: #64748b;">Authorized Signatory</div>
    </div>
  </div>
`;

function buildPaginatedPartyLedgerPages(party, todayFormatted) {
  const isClient = (party.type || "Client").toLowerCase() === "client";
  const partyTypeLabel = isClient ? "CUSTOMER / CLIENT" : "VENDOR / SUPPLIER";
  const partyName = party.partyName || "Party";

  // Build full chronological ledger
  const ledgerEntries = [];
  if (((party.openingDue || 0) > 0 || (party.priorBilled || 0) > 0)) {
    ledgerEntries.push({
      date: party.openingDoc?.financialYear ? `OPENING (${party.openingDoc.financialYear})` : "FY OPENING",
      type: "OPENING BALANCE",
      ref: "FY-OPENING-BAL",
      particulars: `Prior financial year closing balance carried forward (Billed: ₹${(party.priorBilled || 0).toFixed(2)}, Paid: ₹${(party.priorPaid || 0).toFixed(2)})`,
      mode: "OPENING ENTRY",
      debit: Number((party.openingDue || 0).toFixed(2)),
      credit: 0,
      tds: 0,
      status: (party.openingDue || 0) > 0 ? "UNPAID" : "SETTLED"
    });
  }

  const rawBills = party.bills || [];
  rawBills.forEach(b => {
    const bTotal = Number(b.amount || b.totalAmount || b.total || 0);
    const bPaid = Number(b.paidAmount || 0);
    const bTds = Number(b.tdsAmount || 0);
    const bDebt = Number(b.debtAmount || 0);
    const isCancelled = String(b.status || "").toLowerCase() === "cancelled";
    const bDue = isCancelled ? 0 : Math.max(0, bTotal - bPaid - bTds - bDebt);
    const bDate = b.invoice_date || b.billDate || b.date || b.createdAt;
    const bNo = (b.invoice || b.billNo || b.invoiceNo || b.purchaseNo || b.billNumber || "-").toUpperCase();
    const status = isCancelled ? "CANCELLED" : bDue <= 0.01 ? "PAID" : (bPaid > 0 || bTds > 0 || bDebt > 0) ? "PARTIAL" : "UNPAID";

    ledgerEntries.push({
      date: formatDate(bDate),
      type: isClient ? "SALES INVOICE" : "PURCHASE BILL",
      ref: bNo,
      particulars: b.remarks || b.description || (isClient ? "Freight & Transportation Services" : "Vendor Transport Charges"),
      mode: "BILL / INVOICE",
      debit: Number(bTotal.toFixed(2)),
      credit: 0,
      tds: 0,
      status: status,
      rawBill: b
    });
  });

  const rawCash = party.cash || [];
  rawCash.forEach(c => {
    const amt = Number(c.amount || 0);
    const isIncome = c.type === "in";
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
      date: formatDate(c.date || c.createdAt),
      type: isIncome ? "CASH/BANK RECEIPT" : "CASH/BANK PAYMENT",
      ref: c.voucherNo || c.referenceNo || c.refNo || "-",
      particulars: c.narration || (isIncome ? "Payment Received" : "Payment Disbursed"),
      mode: c.paymentMode || c.mode || "BANK / CASH",
      debit: Number(debit.toFixed(2)),
      credit: Number(credit.toFixed(2)),
      tds: 0,
      status: "SETTLED"
    });
  });

  const rawAdj = party.adjustments || [];
  rawAdj.forEach(adj => {
    const amt = Number(adj.amount || 0);
    const part = String(adj.particulars || "tds").toLowerCase();
    const isTds = part === "tds";

    ledgerEntries.push({
      date: formatDate(adj.date || adj.createdAt),
      type: isTds ? "TDS / TAX DEDUCTION" : "DISCOUNT / DEBT ADJUSTMENT",
      ref: adj.voucherNo || (isTds ? "TDS-ADJ" : "DEBT-ADJ"),
      particulars: adj.remarks || adj.reason || (isTds ? "Tax Deducted at Source (TDS)" : "Bad Debt / Discount Allowed"),
      mode: isTds ? "TAX DEDUCTED" : "DISCOUNT",
      debit: 0,
      credit: 0,
      tds: isTds ? Number(amt.toFixed(2)) : 0,
      debt: !isTds ? Number(amt.toFixed(2)) : 0,
      status: "ADJUSTED"
    });
  });

  // Calculate running balances
  let runningBal = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  let totalTdsDeducted = 0;
  ledgerEntries.forEach(entry => {
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

  const totalLedgerCount = ledgerEntries.length;
  const pageUnits = [];

  // =========================================================================
  // Standard A4 Compact Row Limits:
  // Page 1: Header + 2 Cards + Table Header + 14 Rows
  // Subsequent Pages: Compact Header + Table Header + 24 Rows
  // =========================================================================
  const PAGE1_LEDGER_ROWS = 14;
  const SUBSEQUENT_PAGE_ROWS = 24;

  const ledgerChunks = [];
  if (totalLedgerCount <= PAGE1_LEDGER_ROWS) {
    ledgerChunks.push({ rows: ledgerEntries, startIndex: 0, isFirst: true, isLast: true });
  } else {
    ledgerChunks.push({ rows: ledgerEntries.slice(0, PAGE1_LEDGER_ROWS), startIndex: 0, isFirst: true, isLast: false });
    let offset = PAGE1_LEDGER_ROWS;
    while (offset < totalLedgerCount) {
      const nextChunk = ledgerEntries.slice(offset, offset + SUBSEQUENT_PAGE_ROWS);
      const isLast = (offset + SUBSEQUENT_PAGE_ROWS) >= totalLedgerCount;
      ledgerChunks.push({ rows: nextChunk, startIndex: offset, isFirst: false, isLast });
      offset += SUBSEQUENT_PAGE_ROWS;
    }
  }

  const billChunks = [];
  if (rawBills.length > 0) {
    let bOffset = 0;
    while (bOffset < rawBills.length) {
      const nextBChunk = rawBills.slice(bOffset, bOffset + SUBSEQUENT_PAGE_ROWS);
      const isLastB = (bOffset + SUBSEQUENT_PAGE_ROWS) >= rawBills.length;
      billChunks.push({ bills: nextBChunk, startIndex: bOffset, isLast: isLastB });
      bOffset += SUBSEQUENT_PAGE_ROWS;
    }
  }

  const totalCalculatedPages = ledgerChunks.length + billChunks.length;

  // Build HTML for each Ledger Page (A4 Sized: 780px wide)
  ledgerChunks.forEach((lChunk, idx) => {
    const pageNum = idx + 1;
    const isFirstPage = lChunk.isFirst;
    const isLastLedgerPage = lChunk.isLast;
    const hasMoreBillPages = billChunks.length > 0;

    pageUnits.push(`
      <div style="width: 780px; min-height: 1060px; background: #ffffff; padding: 14px 18px; color: #0f172a; font-family: 'Segoe UI', Arial, sans-serif; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          ${isFirstPage
            ? renderCompanyHeaderHtml(partyName, todayFormatted, pageNum, totalCalculatedPages)
            : renderContinuationHeaderHtml(partyName, todayFormatted, pageNum, totalCalculatedPages)
          }

          ${isFirstPage ? renderTwoCardsHtml(party, partyTypeLabel) : ""}

          <!-- Section 1: Running Ledger Grid (A4 Compact) -->
          <div style="margin-bottom: 4px;">
            <div style="font-size: 10.5px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 3px;">
              1. Chronological Statement of Account (Running Ledger) ${!isFirstPage ? "(Contd.)" : ""}
            </div>
            <table style="width: 100%; font-size: 8.5px; border-collapse: collapse; border: 1px solid #cbd5e1;">
              ${renderLedgerTableHeader()}
              <tbody>
                ${renderLedgerRows(lChunk.rows, lChunk.startIndex)}
              </tbody>
              ${isLastLedgerPage ? `
                <tfoot>
                  <tr style="background: #dbeafe; font-weight: 800; color: #1e3a8a; border-top: 1.5px solid #1e3a8a; font-size: 9px;">
                    <td colspan="5" style="padding: 4px 6px; text-align: right;">GRAND TOTAL (${totalLedgerCount} TRANSACTIONS):</td>
                    <td style="padding: 4px 5px; text-align: right;">${formatCurrency(totalDebit)}</td>
                    <td style="padding: 4px 5px; text-align: right; color: #16a34a;">${formatCurrency(totalCredit)}</td>
                    <td style="padding: 4px 5px; text-align: right; color: #d97706;">${formatCurrency(totalTdsDeducted)}</td>
                    <td style="padding: 4px 5px; text-align: right; font-size: 9.5px; color: ${party.netOutstandingDue > 0.01 ? '#dc2626' : '#16a34a'};">${formatCurrency(party.netOutstandingDue)}</td>
                    <td style="padding: 4px 5px; text-align: center; color: ${party.status === 'paid' ? '#166534' : '#991b1b'};">${party.status === 'paid' ? 'SETTLED' : 'DUE'}</td>
                  </tr>
                </tfoot>
              ` : ""}
            </table>
          </div>
        </div>

        <div>
          ${isLastLedgerPage && !hasMoreBillPages
            ? renderFooterAndSignaturesHtml(party)
            : `<div style="font-size: 8.5px; color: #64748b; text-align: right; margin-top: 4px; font-weight: 600;">(Continued on next page...)</div>`
          }
        </div>
      </div>
    `);
  });

  // Build HTML for each Bill Page (Section 2)
  billChunks.forEach((bChunk, bIdx) => {
    const pageNum = ledgerChunks.length + bIdx + 1;
    const isLastBillPage = bChunk.isLast;

    pageUnits.push(`
      <div style="width: 780px; min-height: 1060px; background: #ffffff; padding: 14px 18px; color: #0f172a; font-family: 'Segoe UI', Arial, sans-serif; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          ${renderContinuationHeaderHtml(partyName, todayFormatted, pageNum, totalCalculatedPages)}

          <!-- Section 2: Sales Invoices Breakdown Grid (A4 Compact) -->
          <div style="margin-bottom: 4px;">
            <div style="font-size: 10.5px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 3px;">
              2. Sales Invoices Breakdown (${rawBills.length} Bills) ${bIdx > 0 ? "(Contd.)" : ""}
            </div>
            <table style="width: 100%; font-size: 8.5px; border-collapse: collapse; border: 1px solid #cbd5e1;">
              ${renderBillsTableHeader()}
              <tbody>
                ${renderBillsRows(bChunk.bills, bChunk.startIndex)}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          ${isLastBillPage
            ? renderFooterAndSignaturesHtml(party)
            : `<div style="font-size: 8.5px; color: #64748b; text-align: right; margin-top: 4px; font-weight: 600;">(Continued on next page...)</div>`
          }
        </div>
      </div>
    `);
  });

  return pageUnits;
}

const AttachSoftwareModal = ({ isOpen, onClose, onAttachFiles }) => {
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("outstanding");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdf");
  const [statusFilter, setStatusFilter] = useState("all");
  const [generating, setGenerating] = useState(false);

  // Raw ERP datasets
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [bills, setBills] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [cashEntries, setCashEntries] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [openingBalances, setOpeningBalances] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [trips, setTrips] = useState([]);

  // Selected item IDs
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Fetch all core datasets from Multimarg ERP
  useEffect(() => {
    if (!isOpen) return;

    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [
          clientsRes,
          vendorsRes,
          billsRes,
          purchasesRes,
          cashRes,
          adjRes,
          openRes,
          bookingsRes,
          tripsRes
        ] = await Promise.allSettled([
          axios.get(`${API_BASE}/api/clients`),
          axios.get(`${API_BASE}/api/vendors`),
          axios.get(`${API_BASE}/api/bills`),
          axios.get(`${API_BASE}/api/purchases`),
          axios.get(`${API_BASE}/api/cash`),
          axios.get(`${API_BASE}/api/outstanding`),
          axios.get(`${API_BASE}/api/opening-balances`),
          axios.get(`${API_BASE}/api/bookings`),
          axios.get(`${API_BASE}/api/trips`)
        ]);

        if (clientsRes.status === "fulfilled") setClients(clientsRes.value.data?.data || []);
        if (vendorsRes.status === "fulfilled") setVendors(vendorsRes.value.data?.data || []);
        if (billsRes.status === "fulfilled") setBills(billsRes.value.data?.data || []);
        if (purchasesRes.status === "fulfilled") setPurchases(purchasesRes.value.data?.data || []);
        if (cashRes.status === "fulfilled") setCashEntries(cashRes.value.data?.data || []);
        if (adjRes.status === "fulfilled") setAdjustments(adjRes.value.data?.data || []);
        if (openRes.status === "fulfilled") setOpeningBalances(openRes.value.data?.data || []);
        if (bookingsRes.status === "fulfilled") setBookings(bookingsRes.value.data?.data || []);
        if (tripsRes.status === "fulfilled") setTrips(tripsRes.value.data?.data || []);
      } catch (err) {
        console.error("Error loading software data:", err);
        addToast("Error fetching live records from software", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [isOpen, addToast]);

  // Reset selection on tab change
  useEffect(() => {
    setSelectedIds(new Set());
    setSearch("");
  }, [activeTab]);

  // Process Party Master Calculations
  const partyMasterList = useMemo(() => {
    const map = new Map();

    clients.forEach((c) => {
      const name = String(c.name || "").trim();
      if (!name) return;
      const key = normalizePartyKey(name);
      if (!map.has(key)) {
        map.set(key, {
          id: c._id || c.id || key,
          partyKey: key,
          partyName: name,
          code: c.clientCode || "-",
          gst: c.gst || c.gstin || "-",
          address: c.address || c.billingAddress || "-",
          contact: c.contact || c.phone || c.phno || "-",
          type: "Client",
          priorBilled: 0,
          priorPaid: 0,
          priorTds: 0,
          priorDebt: 0,
          openingDue: 0,
          currentBilled: 0,
          currentBillsCount: 0,
          currentPaid: 0,
          currentTds: 0,
          currentDebt: 0,
          currentDue: 0,
          totalCashReceived: 0,
          totalAdjTds: 0,
          totalAdjDebt: 0,
          bills: [],
          purchases: [],
          cash: [],
          adjustments: [],
          openingDoc: null
        });
      }
    });

    openingBalances.forEach((op) => {
      const name = String(op.partyName || "").trim();
      if (!name) return;
      const key = normalizePartyKey(name);
      if (!map.has(key)) {
        map.set(key, {
          id: op._id || op.id || key,
          partyKey: key,
          partyName: name,
          code: "-",
          gst: "-",
          address: "-",
          contact: "-",
          type: op.partyType || "Client",
          priorBilled: 0,
          priorPaid: 0,
          priorTds: 0,
          priorDebt: 0,
          openingDue: 0,
          currentBilled: 0,
          currentBillsCount: 0,
          currentPaid: 0,
          currentTds: 0,
          currentDebt: 0,
          currentDue: 0,
          totalCashReceived: 0,
          totalAdjTds: 0,
          totalAdjDebt: 0,
          bills: [],
          purchases: [],
          cash: [],
          adjustments: [],
          openingDoc: null
        });
      }
      const item = map.get(key);
      const priorB = Number(op.totalBilledPrior || op.openingOutstanding || op.initialOpeningDue || 0);
      const priorP = Number(op.totalPaidPrior || 0);
      const priorT = Number(op.totalTdsPrior || 0);
      const priorD = Number(op.totalDebtPrior || 0);
      const openDue = Number(op.openingOutstanding !== undefined ? op.openingOutstanding : Math.max(0, priorB - priorP - priorT - priorD));

      item.priorBilled += priorB;
      item.priorPaid += priorP;
      item.priorTds += priorT;
      item.priorDebt += priorD;
      item.openingDue += openDue;
      item.openingDoc = op;
    });

    bills.forEach((b) => {
      const name = String(b.client || b.billedTo || b.clientName || "").trim();
      if (!name) return;
      const key = normalizePartyKey(name);
      if (!map.has(key)) {
        map.set(key, {
          id: b._id || b.id || key,
          partyKey: key,
          partyName: name,
          code: "-",
          gst: b.gstin || b.clientGst || "-",
          address: b.clientAddress || "-",
          contact: "-",
          type: "Client",
          priorBilled: 0,
          priorPaid: 0,
          priorTds: 0,
          priorDebt: 0,
          openingDue: 0,
          currentBilled: 0,
          currentBillsCount: 0,
          currentPaid: 0,
          currentTds: 0,
          currentDebt: 0,
          currentDue: 0,
          totalCashReceived: 0,
          totalAdjTds: 0,
          totalAdjDebt: 0,
          bills: [],
          purchases: [],
          cash: [],
          adjustments: [],
          openingDoc: null
        });
      }
      const item = map.get(key);
      const bTotal = Number(b.amount || b.totalAmount || b.total || 0);
      const bPaid = Number(b.paidAmount || 0);
      const bTds = Number(b.tdsAmount || 0);
      const bDebt = Number(b.debtAmount || 0);
      const isCancelled = String(b.status || "").toLowerCase() === "cancelled";
      const bDue = isCancelled ? 0 : Math.max(0, bTotal - bPaid - bTds - bDebt);

      if (!isCancelled) {
        item.currentBilled += bTotal;
        item.currentBillsCount += 1;
        item.currentPaid += bPaid;
        item.currentTds += bTds;
        item.currentDebt += bDebt;
        item.currentDue += bDue;
      }
      item.bills.push(b);
    });

    cashEntries.forEach((c) => {
      const name = String(c.partyName || c.client || c.vendor || "").trim();
      if (!name) return;
      const key = normalizePartyKey(name);
      if (map.has(key)) {
        const item = map.get(key);
        item.cash.push(c);
        if (c.type === "in") {
          item.totalCashReceived += Number(c.amount || 0);
        }
      }
    });

    adjustments.forEach((adj) => {
      const name = String(adj.partyName || adj.clientName || "").trim();
      if (!name) return;
      const key = normalizePartyKey(name);
      if (map.has(key)) {
        const item = map.get(key);
        item.adjustments.push(adj);
        const part = String(adj.particulars || "tds").toLowerCase();
        if (part === "tds") {
          item.totalAdjTds += Number(adj.amount || 0);
        } else {
          item.totalAdjDebt += Number(adj.amount || 0);
        }
      }
    });

    const finalParties = [];
    map.forEach((item) => {
      const totalInvoiced = item.priorBilled + item.currentBilled;
      const totalPaid = item.priorPaid + item.currentPaid;
      const totalTds = item.priorTds + item.currentTds + item.totalAdjTds;
      const totalDebt = item.priorDebt + item.currentDebt + item.totalAdjDebt;
      const netOutstandingDue = Math.max(0, item.openingDue + item.currentDue - item.totalAdjTds - item.totalAdjDebt);

      const totalDeductions = totalPaid + totalTds + totalDebt;
      const recoveryPercent = totalInvoiced > 0 ? Math.min(100, Math.round((totalDeductions / totalInvoiced) * 100)) : 100;

      let status = "paid";
      if (netOutstandingDue > 0.01) {
        status = (totalPaid > 0 || totalTds > 0) ? "partial" : "due";
      }

      finalParties.push({
        ...item,
        totalInvoiced,
        totalPaid,
        totalTds,
        totalDebt,
        netOutstandingDue,
        recoveryPercent,
        status,
        totalLrsCount: bookings.filter(b => normalizePartyKey(b.consignor) === item.partyKey || normalizePartyKey(b.consignee) === item.partyKey).length
      });
    });

    return finalParties.sort((a, b) => b.netOutstandingDue - a.netOutstandingDue);
  }, [clients, openingBalances, bills, cashEntries, adjustments, bookings]);

  // Filtered dataset for current active tab
  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (activeTab === "outstanding") {
      return partyMasterList.filter(c => {
        if (statusFilter === "due_only" && c.netOutstandingDue <= 0.01) return false;
        if (statusFilter === "zero_only" && c.netOutstandingDue > 0.01) return false;
        if (!q) return true;
        return (
          c.partyName.toLowerCase().includes(q) ||
          String(c.address || "").toLowerCase().includes(q) ||
          String(c.gst || "").toLowerCase().includes(q) ||
          String(c.contact || "").toLowerCase().includes(q)
        );
      });
    } else if (activeTab === "bills") {
      return bills.filter(b => {
        const bStatus = String(b.status || "").toLowerCase();
        if (statusFilter === "due_only" && (bStatus === "paid" || Number(b.pendingAmount || b.balance) === 0)) return false;
        if (statusFilter === "zero_only" && bStatus !== "paid") return false;
        if (!q) return true;
        return (
          String(b.billNo || b.billNumber || "").toLowerCase().includes(q) ||
          String(b.client || b.clientName || "").toLowerCase().includes(q) ||
          String(b.clientAddress || "").toLowerCase().includes(q) ||
          String(b.clientGst || b.gstin || "").toLowerCase().includes(q)
        );
      });
    } else if (activeTab === "bookings") {
      return bookings.filter(lr => {
        if (!q) return true;
        return (
          String(lr.awbNo || lr.lrNo || lr.consignment || "").toLowerCase().includes(q) ||
          String(lr.consignor || "").toLowerCase().includes(q) ||
          String(lr.consignee || "").toLowerCase().includes(q) ||
          String(lr.from || "").toLowerCase().includes(q) ||
          String(lr.to || "").toLowerCase().includes(q)
        );
      });
    } else if (activeTab === "trips") {
      return trips.filter(t => {
        if (!q) return true;
        return (
          String(t.tripNo || t.tripNumber || "").toLowerCase().includes(q) ||
          String(t.vehicleNo || "").toLowerCase().includes(q) ||
          String(t.driverName || "").toLowerCase().includes(q)
        );
      });
    }
    return [];
  }, [activeTab, search, partyMasterList, bills, bookings, trips, statusFilter]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredData.length && filteredData.length > 0) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(filteredData.map(item => item.id || item._id || item.partyKey || item.billNo || item.awbNo || item.tripNo));
      setSelectedIds(allIds);
    }
  };

  // Convert selected items into requested document format (PDF / Excel / CSV)
  const handleAttachSelected = async () => {
    if (selectedIds.size === 0) {
      addToast("Please select at least one record to attach", "warning");
      return;
    }

    setGenerating(true);
    try {
      const selectedItems = filteredData.filter(item => {
        const id = item.id || item._id || item.partyKey || item.billNo || item.awbNo || item.tripNo;
        return selectedIds.has(id);
      });

      const generatedFiles = [];

      // ==========================================
      // 1. CSV EXPORT
      // ==========================================
      if (exportFormat === "csv") {
        for (const party of selectedItems) {
          if (activeTab === "outstanding") {
            const ledgerEntries = [];
            if ((party.openingDue || 0) > 0 || (party.priorBilled || 0) > 0) {
              ledgerEntries.push({
                date: party.openingDoc?.financialYear ? `OPENING (${party.openingDoc.financialYear})` : "FY OPENING",
                type: "OPENING BALANCE",
                ref: "OPENING-BAL",
                particulars: "Prior financial year balance",
                mode: "OPENING",
                debit: party.openingDue,
                credit: 0,
                status: party.openingDue > 0 ? "UNPAID" : "SETTLED"
              });
            }
            (party.bills || []).forEach(b => {
              const bTotal = Number(b.amount || b.totalAmount || 0);
              const bPaid = Number(b.paidAmount || 0);
              ledgerEntries.push({
                date: formatDate(b.date || b.billDate || b.createdAt),
                type: "SALES INVOICE",
                ref: b.billNo || b.billNumber || "INV",
                particulars: "Freight & Transportation Services",
                mode: "BILL",
                debit: bTotal,
                credit: bPaid,
                status: bPaid >= bTotal ? "PAID" : "DUE"
              });
            });

            const headers = ["Date", "Type", "Ref / Bill No", "Particulars", "Debit (INR)", "Credit (INR)", "Status"];
            const rows = ledgerEntries.map(e => [e.date, e.type, e.ref, e.particulars, e.debit || 0, e.credit || 0, e.status]);
            const csvContent = [headers.join(","), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const fileName = `Multimarg_Statement_${party.partyName.replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`;
            generatedFiles.push(new File([blob], fileName, { type: "text/csv" }));
          }
        }

      // ==========================================
      // 2. EXCEL (.XLSX) EXPORT
      // ==========================================
      } else if (exportFormat === "excel") {
        for (const party of selectedItems) {
          if (activeTab === "outstanding") {
            const ExcelJS = (await import("exceljs/dist/exceljs.min.js")).default || (await import("exceljs")).default;
            const workbook = new ExcelJS.Workbook();
            workbook.creator = "Multimarg Carriers Pvt. Ltd.";

            const ws = workbook.addWorksheet("Statement of Account");
            ws.mergeCells("A1", "H1");
            const h1 = ws.getCell("A1");
            h1.value = "MULTIMARG CARRIERS PVT. LTD.";
            h1.font = { size: 14, bold: true, color: { argb: "FFFFFFFF" } };
            h1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
            h1.alignment = { horizontal: "center", vertical: "middle" };
            ws.getRow(1).height = 28;

            ws.mergeCells("A2", "H2");
            const h2 = ws.getCell("A2");
            h2.value = `STATEMENT OF ACCOUNT & OUTSTANDING LEDGER - ${party.partyName.toUpperCase()}`;
            h2.font = { size: 11, bold: true, color: { argb: "FF1E3A8A" } };
            h2.alignment = { horizontal: "center", vertical: "middle" };
            ws.getRow(2).height = 22;

            const r4 = ws.getRow(4);
            r4.values = ["Party Name:", party.partyName, "GSTIN:", party.gst, "Prior Due:", party.openingDue, "Net Due:", party.netOutstandingDue];
            r4.font = { bold: true };

            const colHeaders = ["SL", "Date", "Transaction Type", "Ref #", "Particulars", "Debit (₹)", "Credit (₹)", "Status"];
            const r6 = ws.getRow(6);
            r6.values = colHeaders;
            r6.font = { bold: true, color: { argb: "FFFFFFFF" } };
            r6.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
            r6.height = 24;

            let rowIdx = 7;
            (party.bills || []).forEach((b, idx) => {
              const bTotal = Number(b.amount || b.totalAmount || 0);
              const bPaid = Number(b.paidAmount || 0);
              const r = ws.getRow(rowIdx++);
              r.values = [idx + 1, formatDate(b.date || b.billDate || b.createdAt), "SALES INVOICE", b.billNo || b.billNumber || "INV", "Freight Charges", bTotal, bPaid, bPaid >= bTotal ? "PAID" : "DUE"];
            });

            ws.columns = [{ width: 8 }, { width: 14 }, { width: 22 }, { width: 18 }, { width: 32 }, { width: 16 }, { width: 16 }, { width: 14 }];

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const fileName = `Multimarg_Statement_${party.partyName.replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`;
            generatedFiles.push(new File([blob], fileName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
          }
        }

      // ==========================================
      // 3. OFFICIAL A4 PDF EXPORT (COMPACT A4 PORTRAIT)
      // ==========================================
      } else {
        const { html2canvas, jsPDF } = await getPdfEngine();

        for (const item of selectedItems) {
          const todayFormatted = formatDate(new Date());

          // --- A. COMPANY-WISE STATEMENT OF ACCOUNT (A4 PORTRAIT) ---
          if (activeTab === "outstanding") {
            const party = item;
            const pagesHtml = buildPaginatedPartyLedgerPages(party, todayFormatted);

            const pdf = new jsPDF({
              orientation: "portrait",
              unit: "mm",
              format: "a4"
            });

            const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
            const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
            const marginX = 5;
            const marginY = 5;
            const printableWidth = pageWidth - (marginX * 2); // 200mm

            for (let pIdx = 0; pIdx < pagesHtml.length; pIdx++) {
              const container = document.createElement("div");
              container.style.position = "fixed";
              container.style.top = "0";
              container.style.left = "0";
              container.style.width = "780px";
              container.style.zIndex = "99999999";
              container.style.backgroundColor = "#ffffff";
              container.style.color = "#000000";
              container.style.opacity = "1";
              container.style.pointerEvents = "none";
              container.style.boxSizing = "border-box";
              container.innerHTML = pagesHtml[pIdx];
              document.body.appendChild(container);

              // Wait for images
              const images = Array.from(container.querySelectorAll("img"));
              await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(res => {
                  img.onload = res;
                  img.onerror = res;
                  setTimeout(res, 180);
                });
              }));

              await new Promise(r => setTimeout(r, 60));

              const pageCanvas = await html2canvas(container, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                width: 780,
                windowWidth: 1200
              });

              if (container && container.parentNode) {
                container.parentNode.removeChild(container);
              }

              const imgData = pageCanvas.toDataURL("image/jpeg", 0.98);
              const imgHeightMm = (pageCanvas.height * printableWidth) / pageCanvas.width;

              if (pIdx > 0) {
                pdf.addPage();
              }
              pdf.addImage(imgData, "JPEG", marginX, marginY, printableWidth, Math.min(imgHeightMm, pageHeight - (marginY * 2)));
            }

            const pdfBlob = pdf.output("blob");
            const safeDocName = String(party.partyName).replace(/[^a-zA-Z0-9_-]/g, "_");
            const cleanName = `STATEMENT_OF_ACCOUNT_${safeDocName}_${new Date().toISOString().slice(0, 10)}.pdf`;
            generatedFiles.push(new File([pdfBlob], cleanName, { type: "application/pdf" }));

          // --- B. TAX INVOICE (PORTRAIT A4) ---
          } else if (activeTab === "bills") {
            const billData = item;
            const taxableAmt = Number(billData.taxableAmount || billData.amount || 0);
            const gstAmt = Number(billData.gst || billData.gstAmount || 0);
            const totalAmt = Number(billData.totalAmount || billData.amount || 0);
            const amountInWords = numberToWordsIndian(totalAmt);

            const contentHtml = `
              <div style="font-family: Arial, sans-serif; color: #0f172a; padding: 14px; background: #ffffff; width: 780px; box-sizing: border-box;">
                <div style="border-bottom: 2px solid #0C4A6E; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                  <img src="/mc.png" alt="Logo" style="width: 70px; height: auto;" />
                  <div style="text-align: center; line-height: 1.2;">
                    <h1 style="margin: 0; color: #0C4A6E; font-size: 18px; font-weight: 900;">MULTIMARG CARRIERS PVT. LTD.</h1>
                    <span style="color: #0288D1; font-size: 9.5px; font-weight: 700; display: block;">LIG-194, NEAR NATIONAL PUBLIC SCHOOL, AVAS VIKAS, RUDRAPUR-263153</span>
                    <span style="color: #0288D1; font-size: 9.5px; font-weight: 700; display: block;">GSTIN: 05AANCM3054E1ZN | PAN: AANCM3054E | CIN: U60300UR2020PTC010749</span>
                  </div>
                  <div style="min-width: 70px;"></div>
                </div>

                <div style="text-align: center; margin-bottom: 8px; border-bottom: 2px solid #0C4A6E; padding-bottom: 3px;">
                  <h2 style="margin: 0; font-size: 13.5px; font-weight: 900; color: #0C4A6E; text-transform: uppercase;">TAX INVOICE</h2>
                </div>

                <div style="border: 1.5px solid #000000; border-radius: 2px; overflow: hidden; margin-bottom: 10px;">
                  <div style="display: flex; border-bottom: 1.5px solid #000000;">
                    <div style="flex: 1.4; padding: 8px 10px; border-right: 1.5px solid #000000; background: #FAFBFD;">
                      <div style="font-size: 8.5px; font-weight: 800; color: #0C4A6E; text-transform: uppercase;">Bill To:</div>
                      <h3 style="margin: 0 0 3px 0; font-size: 13px; font-weight: 900; color: #0F172A;">${billData.client || billData.clientName}</h3>
                      <p style="margin: 0; font-size: 10px; color: #334155;">${billData.clientAddress || "Industrial Area, Pantnagar"}</p>
                      <div style="margin-top: 3px; font-size: 10px; font-weight: 700;">GSTIN: ${billData.clientGst || billData.gstin || "URP"}</div>
                    </div>
                    <div style="flex: 1; padding: 8px 10px; background: #F1F5F9; font-size: 10px; line-height: 1.5;">
                      <div>Invoice No: <strong style="color: #0C4A6E;">${billData.invoice || billData.billNo || billData.billNumber}</strong></div>
                      <div>Date: <strong>${formatDate(billData.invoice_date || billData.date || billData.createdAt)}</strong></div>
                      <div>Mode: <strong>${billData.mode || "ROAD"}</strong> &nbsp;|&nbsp; SAC: <strong>996511</strong></div>
                    </div>
                  </div>

                  <table style="width: 100%; border-collapse: collapse; font-size: 9.5px;">
                    <thead>
                      <tr style="background: #FFFFFF; border-bottom: 1.5px solid #000000;">
                        <th style="padding: 5px; border-right: 1px solid #334155;">SI</th>
                        <th style="padding: 5px; border-right: 1px solid #334155; text-align: left;">LR / REF NO</th>
                        <th style="padding: 5px; border-right: 1px solid #334155; text-align: left;">ROUTE</th>
                        <th style="padding: 5px; border-right: 1px solid #334155; text-align: right;">TAXABLE (₹)</th>
                        <th style="padding: 5px; border-right: 1px solid #334155; text-align: right;">GST (₹)</th>
                        <th style="padding: 5px; text-align: right;">TOTAL (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style="padding: 5px; border-right: 1px solid #cbd5e1; text-align: center;">1</td>
                        <td style="padding: 5px; border-right: 1px solid #cbd5e1; font-weight: 700;">#${billData.billNo || billData.billNumber}</td>
                        <td style="padding: 5px; border-right: 1px solid #cbd5e1;">Freight & Transportation Services</td>
                        <td style="padding: 5px; border-right: 1px solid #cbd5e1; text-align: right;">${formatCurrency(taxableAmt)}</td>
                        <td style="padding: 5px; border-right: 1px solid #cbd5e1; text-align: right;">${formatCurrency(gstAmt)}</td>
                        <td style="padding: 5px; text-align: right; font-weight: 700;">${formatCurrency(totalAmt)}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr style="background: #F1F5F9; font-weight: 800; border-top: 1.5px solid #000000;">
                        <td colspan="3" style="padding: 5px; text-align: right;">Grand Total:</td>
                        <td style="padding: 5px; text-align: right;">${formatCurrency(taxableAmt)}</td>
                        <td style="padding: 5px; text-align: right;">${formatCurrency(gstAmt)}</td>
                        <td style="padding: 5px; text-align: right; font-size: 11px; color: #0C4A6E;">${formatCurrency(totalAmt)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  <div style="border-top: 1.5px solid #000000; padding: 6px 10px; background: #FAFBFD; font-size: 9.5px;">
                    <div><strong>Amount In Words:</strong> <span style="color: #0C4A6E; font-weight: 700;">${amountInWords}</span></div>
                    <div style="margin-top: 3px;">Bank: <strong>HDFC Bank</strong> | A/c No: <strong>50200065432109</strong> | IFSC: <strong>HDFC0001234</strong> | Branch: <strong>Pantnagar</strong></div>
                  </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 12px; font-size: 9px;">
                  <div>Terms: Goods transported at owner's risk. Subject to Pantnagar jurisdiction.</div>
                  <div style="text-align: right;">
                    <div style="font-weight: 800; color: #0C4A6E;">For MULTIMARG CARRIERS PVT. LTD.</div>
                    <div style="margin-top: 16px; font-weight: 700;">Authorized Signatory</div>
                  </div>
                </div>
              </div>
            `;

            const container = document.createElement("div");
            container.style.position = "fixed";
            container.style.top = "0";
            container.style.left = "0";
            container.style.width = "780px";
            container.style.zIndex = "99999999";
            container.style.backgroundColor = "#ffffff";
            container.style.color = "#000000";
            container.style.opacity = "1";
            container.style.pointerEvents = "none";
            container.innerHTML = contentHtml;
            document.body.appendChild(container);

            await new Promise(r => setTimeout(r, 60));

            const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false, width: 780, windowWidth: 1200 });
            if (container && container.parentNode) container.parentNode.removeChild(container);

            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 5;
            const printableWidth = pageWidth - (margin * 2);
            pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", margin, margin, printableWidth, (canvas.height * printableWidth) / canvas.width);

            const pdfBlob = pdf.output("blob");
            const cleanName = `TAX_INVOICE_${billData.billNo || billData.billNumber || "Doc"}.pdf`;
            generatedFiles.push(new File([pdfBlob], cleanName, { type: "application/pdf" }));

          // --- C. AWB / LR (PORTRAIT A4) ---
          } else {
            const booking = item;
            const awbNo = booking.consignment || booking.awb || booking.lrNo || booking.awbNo || booking.id;

            const contentHtml = `
              <div style="border: 2px solid #1e293b; padding: 12px; font-family: Arial, sans-serif; background: #ffffff; width: 780px; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e293b; padding-bottom: 6px;">
                  <img src="/mc.png" alt="Logo" style="width: 65px; height: auto;" />
                  <div style="text-align: center; line-height: 1.2;">
                    <h1 style="margin: 0; font-size: 16px; font-weight: 900; color: #1e3a8a;">MULTIMARG CARRIERS PVT. LTD.</h1>
                    <span style="font-size: 9px; color: #475569; display: block;">LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND-263153</span>
                    <span style="font-size: 9px; font-weight: 700; color: #0f172a; display: block;">GSTIN: 05AANCM3054E1ZN | PAN: AANCM3054E1ZN</span>
                  </div>
                  <div style="width: 65px;"></div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; padding: 6px 0; border-bottom: 1.5px solid #64748b; font-size: 10px;">
                  <div>AWB NO: <strong style="color: #ef4444; font-size: 11.5px;">#${awbNo}</strong></div>
                  <div>DATE: <strong>${formatDate(booking.dispatch_date || booking.date || booking.createdAt)}</strong></div>
                  <div>MODE: <strong style="text-transform: uppercase;">${booking.mode || "ROAD"}</strong></div>
                </div>

                <div style="background: #1e293b; color: #ffffff; padding: 3px 6px; font-size: 9px; font-weight: 700; text-transform: uppercase; margin-top: 5px;">1. Party Details</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 9.5px; padding: 5px 0;">
                  <div>Consignor: <strong>${(booking.consignor || "N/A").toUpperCase()}</strong> (${booking.consignorGst || "URP"})</div>
                  <div>Consignee: <strong>${(booking.consignee || "N/A").toUpperCase()}</strong> (${booking.consigneeGst || "URP"})</div>
                </div>

                <div style="background: #1e293b; color: #ffffff; padding: 3px 6px; font-size: 9px; font-weight: 700; text-transform: uppercase; margin-top: 5px;">2. Shipment Information</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; font-size: 9.5px; padding: 5px 0;">
                  <div>Route: <strong>${booking.from || "Pantnagar"} → ${booking.to || "Destination"}</strong></div>
                  <div>Packages: <strong>${booking.packages || 1} Pkgs</strong></div>
                  <div>Weight: <strong>${booking.weight || 0} KG</strong></div>
                </div>

                <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #64748b; padding-top: 6px; margin-top: 6px; font-size: 10.5px;">
                  <div>Payment: <strong>${booking.paymentType || "TBB"}</strong></div>
                  <div>Total Freight: <strong style="color: #1e3a8a; font-size: 12.5px;">${formatCurrency(booking.grandTotal || booking.freight || 0)}</strong></div>
                </div>
              </div>
            `;

            const container = document.createElement("div");
            container.style.position = "fixed";
            container.style.top = "0";
            container.style.left = "0";
            container.style.width = "780px";
            container.style.zIndex = "99999999";
            container.style.backgroundColor = "#ffffff";
            container.style.color = "#000000";
            container.style.opacity = "1";
            container.style.pointerEvents = "none";
            container.innerHTML = contentHtml;
            document.body.appendChild(container);

            await new Promise(r => setTimeout(r, 60));

            const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false, width: 780, windowWidth: 1200 });
            if (container && container.parentNode) container.parentNode.removeChild(container);

            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 5;
            const printableWidth = pageWidth - (margin * 2);
            pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", margin, margin, printableWidth, (canvas.height * printableWidth) / canvas.width);

            const pdfBlob = pdf.output("blob");
            const cleanName = `CONSIGNMENT_${awbNo}.pdf`;
            generatedFiles.push(new File([pdfBlob], cleanName, { type: "application/pdf" }));
          }
        }
      }

      onAttachFiles(generatedFiles);
      addToast(`Attached ${generatedFiles.length} official document(s) matching exact system format!`, "success");
      onClose();
    } catch (err) {
      console.error("Error generating software attachments:", err);
      addToast("Failed to generate attachments", "error");
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "1020px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.3)",
          overflow: "hidden",
          border: "1px solid #cbd5e1"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            backgroundColor: "#1e3a8a",
            padding: "16px 20px",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ backgroundColor: "rgba(255, 255, 255, 0.15)", padding: "8px", borderRadius: "10px" }}>
              <Layers size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "800" }}>Attach from Multimarg Software</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#bfdbfe" }}>
                Official Outstanding Ledgers, Tax Invoices, and AWBs matching the exact ERP records & calculations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer", padding: "4px", display: "flex" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Categories Tab Bar */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            padding: "0 16px",
            overflowX: "auto"
          }}
        >
          {[
            { id: "outstanding", label: "Company-Wise Full Ledger & Statement", icon: Building2, count: partyMasterList.length },
            { id: "bills", label: "Tax Invoices & Bills", icon: FileText, count: bills.length },
            { id: "bookings", label: "LRs / Consignment Notes", icon: Package, count: bookings.length },
            { id: "trips", label: "Trips & Dispatches", icon: Truck, count: trips.length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "12px 18px",
                  border: "none",
                  background: "none",
                  borderBottom: isActive ? "3px solid #2563eb" : "3px solid transparent",
                  color: isActive ? "#2563eb" : "#64748b",
                  fontWeight: isActive ? "800" : "600",
                  fontSize: "13px",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    style={{
                      fontSize: "10.5px",
                      padding: "1px 7px",
                      borderRadius: "10px",
                      backgroundColor: isActive ? "#dbeafe" : "#e2e8f0",
                      color: isActive ? "#1e40af" : "#475569",
                      fontWeight: "700"
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Controls Toolbar */}
        <div
          style={{
            padding: "12px 20px",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px"
          }}
        >
          {/* Search Box & Quick Status Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "260px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "7px 12px",
                flex: 1,
                maxWidth: "380px"
              }}
            >
              <Search size={15} color="#64748b" />
              <input
                type="text"
                placeholder={
                  activeTab === "outstanding"
                    ? "Search company, address, GSTIN, code..."
                    : activeTab === "bills"
                    ? "Search bill no, client, GSTIN, amount..."
                    : activeTab === "bookings"
                    ? "Search LR/AWB no, consignor, e-way bill..."
                    : "Search trip no, vehicle, driver..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: "12.5px",
                  width: "100%",
                  backgroundColor: "transparent"
                }}
              />
              {search && (
                <X size={14} color="#94a3b8" style={{ cursor: "pointer" }} onClick={() => setSearch("")} />
              )}
            </div>

            {/* Quick Status Toggle */}
            {(activeTab === "outstanding" || activeTab === "bills") && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: "7px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#334155",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="all">Show All Companies</option>
                <option value="due_only">With Outstanding Balance Only</option>
                <option value="zero_only">Settled / Zero Due Only</option>
              </select>
            )}
          </div>

          {/* Controls: Select All & Output Format */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={toggleSelectAll}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                background: "none",
                border: "1px solid #cbd5e1",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                color: "#334155",
                cursor: "pointer"
              }}
            >
              {selectedIds.size === filteredData.length && filteredData.length > 0 ? (
                <CheckSquare size={14} color="#2563eb" />
              ) : (
                <Square size={14} color="#64748b" />
              )}
              <span>Select All ({filteredData.length})</span>
            </button>

            {/* Document Format Switcher */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#f1f5f9", padding: "3px", borderRadius: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", padding: "0 6px" }}>Format:</span>
              {[
                { id: "pdf", label: "PDF", icon: FileText },
                { id: "excel", label: "Excel (.xlsx)", icon: FileSpreadsheet },
                { id: "csv", label: "CSV", icon: FileType }
              ].map(fmt => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setExportFormat(fmt.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: exportFormat === fmt.id ? "#2563eb" : "transparent",
                    color: exportFormat === fmt.id ? "#ffffff" : "#475569",
                    fontSize: "11.5px",
                    fontWeight: exportFormat === fmt.id ? "700" : "600",
                    cursor: "pointer"
                  }}
                >
                  <fmt.icon size={13} />
                  <span>{fmt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Cards List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", minHeight: "340px", backgroundColor: "#f8fafc" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", color: "#64748b", gap: "10px" }}>
              <RefreshCw size={24} className="animate-spin" color="#2563eb" />
              <span style={{ fontSize: "13px", fontWeight: "600" }}>Loading Multimarg master records...</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", color: "#94a3b8", gap: "8px" }}>
              <Filter size={32} color="#cbd5e1" />
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#64748b" }}>No matching records found</span>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Try adjusting your search or filters</span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(450px, 1fr))", gap: "12px" }}>
              {filteredData.map(item => {
                const id = item.id || item._id || item.partyKey || item.billNo || item.awbNo || item.tripNo;
                const isSelected = selectedIds.has(id);

                return (
                  <div
                    key={id}
                    onClick={() => toggleSelect(id)}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "10px",
                      border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      padding: "14px 16px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "8px",
                      boxShadow: isSelected ? "0 4px 14px rgba(37, 99, 235, 0.12)" : "0 1px 4px rgba(0,0,0,0.03)",
                      transition: "all 0.15s ease",
                      position: "relative"
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#2563eb" }}
                        />
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: "800",
                            color: activeTab === "outstanding" ? "#0f172a" : "#1e3a8a",
                            backgroundColor: activeTab === "outstanding" ? "#f1f5f9" : "#eff6ff",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            border: activeTab === "outstanding" ? "1px solid #e2e8f0" : "1px solid #bfdbfe"
                          }}
                        >
                          {activeTab === "outstanding" && item.partyName}
                          {activeTab === "bills" && `Bill #${item.billNo || item.billNumber}`}
                          {activeTab === "bookings" && `LR #${item.awbNo || item.lrNo || item.consignment}`}
                          {activeTab === "trips" && `Trip #${item.tripNo || item.tripNumber}`}
                        </span>
                      </div>

                      {activeTab !== "outstanding" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#64748b", fontWeight: "600" }}>
                          <Calendar size={12} />
                          <span>{formatDate(item.date || item.billDate || item.bookingDate || item.tripDate || item.createdAt)}</span>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "800",
                            padding: "2px 9px",
                            borderRadius: "10px",
                            backgroundColor: item.netOutstandingDue > 0.01 ? "#fee2e2" : "#dcfce7",
                            color: item.netOutstandingDue > 0.01 ? "#b91c1c" : "#15803d"
                          }}
                        >
                          {item.netOutstandingDue > 0.01 ? `${formatCurrency(item.netOutstandingDue)} DUE` : "CLEARED"}
                        </span>
                      )}
                    </div>

                    {/* Content Details */}
                    <div style={{ fontSize: "12px", color: "#334155", display: "flex", flexDirection: "column", gap: "5px" }}>
                      {/* COMPANY-WISE VIEW */}
                      {activeTab === "outstanding" && (
                        <>
                          <div style={{ color: "#475569", fontSize: "11.5px" }}>
                            <strong>Address:</strong> {item.address || "N/A"}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", color: "#64748b", fontSize: "11px" }}>
                            <span>GSTIN: <strong style={{ color: "#1e3a8a" }}>{item.gst}</strong></span>
                            <span>Contact: <strong>{item.contact}</strong></span>
                            <span>Bills Count: <strong>{item.bills.length} Invoices</strong></span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", backgroundColor: "#f8fafc", padding: "6px 10px", borderRadius: "6px", fontSize: "11px" }}>
                            <div>Total Invoiced: <strong>{formatCurrency(item.totalInvoiced)}</strong></div>
                            <div>Total Paid: <strong style={{ color: "#16a34a" }}>{formatCurrency(item.totalPaid)}</strong></div>
                            <div>TDS / Adjustments: <strong style={{ color: "#7c3aed" }}>{formatCurrency(item.totalTds + item.totalDebt)}</strong></div>
                          </div>
                        </>
                      )}

                      {/* BILLS VIEW */}
                      {activeTab === "bills" && (
                        <>
                          <div style={{ fontWeight: "700", color: "#0f172a" }}>Client: {item.client || item.clientName || "N/A"}</div>
                          <div style={{ color: "#64748b", fontSize: "11px" }}>
                            <div>Address: {item.clientAddress || "N/A"}</div>
                            <div>GSTIN: <strong>{item.clientGst || item.gstin || "N/A"}</strong></div>
                          </div>
                        </>
                      )}

                      {/* BOOKINGS / LR VIEW */}
                      {activeTab === "bookings" && (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: "700", color: "#0f172a" }}>
                            <span>{item.consignor || "N/A"}</span>
                            <span style={{ color: "#94a3b8" }}>→</span>
                            <span>{item.consignee || "N/A"}</span>
                          </div>
                          <div style={{ color: "#64748b", fontSize: "11px" }}>
                            <div>Route: <strong>{item.from || "N/A"} → {item.to || "N/A"}</strong></div>
                            <div>Cargo: {item.packages || 1} pkgs ({item.weight || 0} KG) • Type: {item.paymentType || "TBB"}</div>
                          </div>
                        </>
                      )}

                      {/* TRIPS VIEW */}
                      {activeTab === "trips" && (
                        <>
                          <div style={{ fontWeight: "700", color: "#0f172a" }}>Vehicle: {item.vehicleNo || "N/A"} • Driver: {item.driverName || "N/A"}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "11px" }}>
                            <span>Route: {item.fromBranch || item.from} → {item.toBranch || item.to}</span>
                            <span>Status: {item.status || "Dispatched"}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Bottom Financial Row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: "6px", marginTop: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                        {activeTab === "outstanding" ? "Current Net Balance Due" : activeTab === "bills" ? "Total Bill Value" : activeTab === "bookings" ? "Total Freight Charge" : "Dispatch Status"}
                      </span>
                      <span style={{ fontSize: "13.5px", fontWeight: "800", color: activeTab === "outstanding" ? (item.netOutstandingDue > 0.01 ? "#b91c1c" : "#15803d") : "#1e3a8a" }}>
                        {activeTab === "outstanding" && formatCurrency(item.netOutstandingDue)}
                        {activeTab === "bills" && formatCurrency(item.totalAmount || item.amount || 0)}
                        {activeTab === "bookings" && formatCurrency(item.grandTotal || item.freight || 0)}
                        {activeTab === "trips" && (item.status || "Dispatched")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "14px 20px",
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#475569" }}>
            <span>Selected: </span>
            <strong style={{ color: "#2563eb" }}>{selectedIds.size} record(s)</strong>
            <span style={{ fontSize: "11.5px", color: "#64748b", marginLeft: "6px" }}>
              (Exact Multimarg ERP official document format)
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                fontSize: "13px",
                fontWeight: "600",
                color: "#475569",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={selectedIds.size === 0 || generating}
              onClick={handleAttachSelected}
              style={{
                padding: "8px 22px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: selectedIds.size === 0 || generating ? "#94a3b8" : "#2563eb",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: "700",
                cursor: selectedIds.size === 0 || generating ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: selectedIds.size > 0 ? "0 2px 8px rgba(37, 99, 235, 0.3)" : "none"
              }}
            >
              {generating ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
              <span>{generating ? "Generating Official Documents..." : `Attach Selected (${selectedIds.size})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttachSoftwareModal;
