import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Building2,
  FileText,
  CreditCard,
  Percent,
  Receipt,
  ExternalLink,
  ShieldCheck,
  Scale,
  Calendar,
  Filter
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useDialog } from "../context/DialogContext";
import Table from "../components/Table";
import ExportModal from "../components/ExportModal";
import { buildProfessionalExcelReport, exportGenericCSV, toExportCaps } from "../utils/excelExport";
import { useSocketSync } from "../hooks/useSocketSync";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(num);
};

const formatCleanDate = (dateVal) => {
  if (!dateVal) return "-";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (_e) {
    return String(dateVal);
  }
};

const normalizePartyKey = (name) => {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[\s\-_.,/()]+/g, " ")
    .trim();
};

const OutstandingFinalSheet = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { alert: alertDialog } = useDialog();

  // Data states
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [bills, setBills] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [cashEntries, setCashEntries] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [openingBalances, setOpeningBalances] = useState([]);

  // Active view tab: 'clients' | 'vendors' | 'combined' | 'stream'
  const [activeTab, setActiveTab] = useState("clients");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'paid' | 'partial' | 'unpaid'
  const [balanceFilter, setBalanceFilter] = useState("all"); // 'all' | 'due_only' | 'zero_only'
  const [expandedParty, setExpandedParty] = useState(null); // Party Name or ID
  const [drilldownTab, setDrilldownTab] = useState("bills"); // 'bills' | 'cash' | 'adjustments' | 'opening'

  // Export modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch all core datasets
  const fetchAllData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [
        clientsRes,
        vendorsRes,
        billsRes,
        purchasesRes,
        cashRes,
        adjRes,
        openRes
      ] = await Promise.all([
        axios.get(`${API}/clients`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/vendors`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/bills`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/purchases`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/cash`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/outstanding`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/opening-balances`).catch(() => ({ data: { data: [] } }))
      ]);

      setClients(clientsRes.data?.data || []);
      setVendors(vendorsRes.data?.data || []);
      setBills(billsRes.data?.data || []);
      setPurchases(purchasesRes.data?.data || []);
      setCashEntries(cashRes.data?.data || []);
      setAdjustments(adjRes.data?.data || []);
      setOpeningBalances(openRes.data?.data || []);
    } catch (err) {
      console.error("Failed to load outstanding master sheet data:", err);
      if (showLoader) {
        addToast("Failed to load outstanding data", "error");
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAllData(true);
  }, [fetchAllData]);

  // Real-time automatic synchronization when data changes anywhere in the system
  useSocketSync("bills", () => fetchAllData(false));
  useSocketSync("purchases", () => fetchAllData(false));
  useSocketSync("cashEntries", () => fetchAllData(false));
  useSocketSync("outstanding", () => fetchAllData(false));
  useSocketSync("openingBalances", () => fetchAllData(false));
  useSocketSync("clients", () => fetchAllData(false));
  useSocketSync("vendors", () => fetchAllData(false));

  // Recalculate & Sync All live
  const handleRecalculateAll = async () => {
    setRecalculating(true);
    try {
      const res = await axios.post(`${API}/outstanding/recalculate-all`);
      if (res.data?.success) {
        addToast(res.data?.message || "All calculations synchronized successfully!", "success");
        await fetchAllData(false);
      } else {
        addToast(res.data?.message || "Recalculation completed", "info");
        await fetchAllData(false);
      }
    } catch (err) {
      console.error("Recalculate error:", err);
      addToast("Recalculate failed: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setRecalculating(false);
    }
  };

  // Helper match function
  const cleanMatch = (a, b) => {
    if (!a || !b) return false;
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  };

  // -------------------------------------------------------------
  // 1. Process Client Master Calculations
  // -------------------------------------------------------------
  const clientMasterList = useMemo(() => {
    const map = new Map();

    // Seed with all registered clients
    clients.forEach((c) => {
      const name = String(c.name || "").trim();
      if (!name) return;
      const key = normalizePartyKey(name);
      if (!map.has(key)) {
        map.set(key, {
          partyKey: key,
          partyName: name,
          code: c.clientCode || "-",
          gst: c.gst || "-",
          address: c.address || "-",
          contact: c.contact || c.phno || "-",
          type: "Client",
          // Prior FY Opening Balances
          priorBilled: 0,
          priorPaid: 0,
          priorTds: 0,
          priorDebt: 0,
          openingDue: 0,
          // Current FY Bills
          currentBilled: 0,
          currentBillsCount: 0,
          currentPaid: 0,
          currentTds: 0,
          currentDebt: 0,
          currentDue: 0,
          // Total Cash Receipts
          totalCashReceived: 0,
          // Adjustments Logged
          totalAdjTds: 0,
          totalAdjDebt: 0,
          // Raw references for drilldown
          bills: [],
          cash: [],
          adjustments: [],
          openingDoc: null
        });
      }
    });

    // Process Opening Balances for Clients
    openingBalances.forEach((op) => {
      if ((op.partyType || "client").toLowerCase() !== "client") return;
      const name = String(op.partyName || "").trim();
      if (!name) return;
      const key = normalizePartyKey(name);
      if (!map.has(key)) {
        map.set(key, {
          partyKey: key,
          partyName: name,
          code: "-",
          gst: "-",
          address: "-",
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
          cash: [],
          adjustments: [],
          openingDoc: null
        });
      }
      const item = map.get(key);
      const priorB = Number(
        op.totalBilledPrior !== undefined && Number(op.totalBilledPrior) > 0
          ? op.totalBilledPrior
          : (Number(op.openingOutstanding) || Number(op.initialOpeningDue) || 0)
      ) || 0;
      const priorP = Number(op.totalPaidPrior) || 0;
      const priorT = Number(op.totalTdsPrior) || 0;
      const priorD = Number(op.totalDebtPrior) || 0;
      const openDue = Number(
        op.openingOutstanding !== undefined && op.openingOutstanding !== null
          ? op.openingOutstanding
          : Math.max(0, priorB - priorP - priorT - priorD)
      ) || 0;

      const effectivePriorBilled = Math.max(priorB, openDue + priorP + priorT + priorD);

      item.priorBilled += effectivePriorBilled;
      item.priorPaid += priorP;
      item.priorTds += priorT;
      item.priorDebt += priorD;
      item.openingDue += openDue;
      item.openingDoc = op;
    });

    // Process Bills for Clients
    bills.forEach((b) => {
      const name = String(b.client || b.billedTo || "").trim();
      if (!name) return;
      const key = normalizePartyKey(name);
      if (!map.has(key)) {
        map.set(key, {
          partyKey: key,
          partyName: name,
          code: "-",
          gst: b.gstin || "-",
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
          cash: [],
          adjustments: [],
          openingDoc: null
        });
      }
      const item = map.get(key);
      const bTotal = Number(b.amount || b.total) || 0;
      const bPaid = Number(b.paidAmount) || 0;
      const bTds = Number(b.tdsAmount) || 0;
      const bDebt = Number(b.debtAmount) || 0;
      const isCancelled = String(b.status || "").toLowerCase() === "cancelled";
      const bDue = isCancelled ? 0 : Math.max(0, bTotal - bPaid - bTds - bDebt);

      item.currentBilled += bTotal;
      item.currentBillsCount += 1;
      item.currentPaid += bPaid;
      item.currentTds += bTds;
      item.currentDebt += bDebt;
      item.currentDue += bDue;
      item.bills.push(b);
    });

    // Process Cash Receipts for Clients
    cashEntries.forEach((c) => {
      const pType = String(c.partyType || "").toLowerCase();
      if (pType === "vendor") return;
      const name = String(c.partyName || "").trim();
      if (!name) return;
      const key = normalizePartyKey(name);
      if (map.has(key)) {
        const item = map.get(key);
        const amt = Number(c.amount) || 0;
        const netAmt = c.type === "in" ? amt : -amt;
        item.totalCashReceived += netAmt;
        item.cash.push(c);
      }
    });

    // Process TDS & Debt Adjustments for Clients
    adjustments.forEach((adj) => {
      const pType = String(adj.partyType || "").toLowerCase();
      if (pType === "vendor" || adj.vendor) return;
      const name = String(adj.client || adj.partyName || "").trim();
      if (!name) return;
      const key = normalizePartyKey(name);
      if (map.has(key)) {
        const item = map.get(key);
        const amt = Number(adj.amount) || 0;
        const part = String(adj.particulars || "tds").toLowerCase();
        if (part === "tds") item.totalAdjTds += amt;
        else item.totalAdjDebt += amt;
        item.adjustments.push(adj);
      }
    });

    // Calculate Grand Total Net Balance for Each Client
    const results = Array.from(map.values()).map((c) => {
      const totalInvoiced = c.priorBilled + c.currentBilled;
      const totalPaid = c.priorPaid + c.currentPaid;
      const totalTds = c.priorTds + c.currentTds;
      const totalDebt = c.priorDebt + c.currentDebt;
      const netOutstandingDue = Math.max(0, totalInvoiced - totalPaid - totalTds - totalDebt);

      let status = "unpaid";
      if (totalInvoiced > 0 && netOutstandingDue <= 0.01) {
        status = "paid";
      } else if (totalPaid > 0 || totalTds > 0 || totalDebt > 0) {
        status = "partial";
      } else if (totalInvoiced === 0) {
        status = "paid";
      }

      const recoveryPercent = totalInvoiced > 0
        ? Math.min(100, Math.round(((totalPaid + totalTds + totalDebt) / totalInvoiced) * 100))
        : 100;

      return {
        ...c,
        totalInvoiced,
        totalPaid,
        totalTds,
        totalDebt,
        netOutstandingDue,
        status,
        recoveryPercent
      };
    });

    // Only include clients who have actual entries, bills, payments, or non-zero opening balances
    const activeClients = results.filter((c) => {
      const hasTransactions = (c.bills?.length > 0) || (c.cash?.length > 0) || (c.adjustments?.length > 0);
      const hasFinancials = c.totalInvoiced > 0 || c.totalPaid > 0 || c.totalTds > 0 || c.totalDebt > 0 || c.netOutstandingDue > 0 || c.openingDue > 0;
      return hasTransactions || hasFinancials;
    });

    // Sort by Net Outstanding Due descending (highest dues first)
    activeClients.sort((a, b) => b.netOutstandingDue - a.netOutstandingDue || b.totalInvoiced - a.totalInvoiced);
    return activeClients;
  }, [clients, openingBalances, bills, cashEntries, adjustments]);

  // -------------------------------------------------------------
  // 2. Process Vendor Master Calculations
  // -------------------------------------------------------------
  const vendorMasterList = useMemo(() => {
    const map = new Map();

    // Seed with all registered vendors
    vendors.forEach((v) => {
      const name = String(v.name || "").trim();
      if (!name) return;
      const key = normalizePartyKey(name);
      if (!map.has(key)) {
        map.set(key, {
          partyKey: key,
          partyName: name,
          code: v.vendorCode || "-",
          gst: v.gst || "-",
          address: v.address || "-",
          contact: v.contact || v.phno || "-",
          type: "Vendor",
          // Prior FY Opening Balances
          priorBilled: 0,
          priorPaid: 0,
          priorTds: 0,
          priorDebt: 0,
          openingDue: 0,
          // Current FY Purchases
          currentBilled: 0,
          currentPurchasesCount: 0,
          currentPaid: 0,
          currentTds: 0,
          currentDebt: 0,
          currentDue: 0,
          // Total Cash Payments Made
          totalCashPaid: 0,
          // Adjustments Logged
          totalAdjTds: 0,
          totalAdjDebt: 0,
          purchases: [],
          cash: [],
          adjustments: [],
          openingDoc: null
        });
      }
    });

    // Process Opening Balances for Vendors
    openingBalances.forEach((op) => {
      if ((op.partyType || "").toLowerCase() !== "vendor") return;
      const name = String(op.partyName || "").trim();
      if (!name) return;
      const key = normalizePartyKey(name);
      if (!map.has(key)) {
        map.set(key, {
          partyKey: key,
          partyName: name,
          code: "-",
          gst: "-",
          address: "-",
          contact: "-",
          type: "Vendor",
          priorBilled: 0,
          priorPaid: 0,
          priorTds: 0,
          priorDebt: 0,
          openingDue: 0,
          currentBilled: 0,
          currentPurchasesCount: 0,
          currentPaid: 0,
          currentTds: 0,
          currentDebt: 0,
          currentDue: 0,
          totalCashPaid: 0,
          totalAdjTds: 0,
          totalAdjDebt: 0,
          purchases: [],
          cash: [],
          adjustments: [],
          openingDoc: null
        });
      }
      const item = map.get(key);
      const priorB = Number(
        op.totalBilledPrior !== undefined && Number(op.totalBilledPrior) > 0
          ? op.totalBilledPrior
          : (Number(op.openingOutstanding) || Number(op.initialOpeningDue) || 0)
      ) || 0;
      const priorP = Number(op.totalPaidPrior) || 0;
      const priorT = Number(op.totalTdsPrior) || 0;
      const priorD = Number(op.totalDebtPrior) || 0;
      const openDue = Number(
        op.openingOutstanding !== undefined && op.openingOutstanding !== null
          ? op.openingOutstanding
          : Math.max(0, priorB - priorP - priorT - priorD)
      ) || 0;

      const effectivePriorBilled = Math.max(priorB, openDue + priorP + priorT + priorD);

      item.priorBilled += effectivePriorBilled;
      item.priorPaid += priorP;
      item.priorTds += priorT;
      item.priorDebt += priorD;
      item.openingDue += openDue;
      item.openingDoc = op;
    });

    // Process Purchases for Vendors
    purchases.forEach((p) => {
      const name = String(p.vendor || "").trim();
      if (!name) return;
      const key = normalizePartyKey(name);
      if (!map.has(key)) {
        map.set(key, {
          partyKey: key,
          partyName: name,
          code: "-",
          gst: "-",
          address: "-",
          contact: "-",
          type: "Vendor",
          priorBilled: 0,
          priorPaid: 0,
          priorTds: 0,
          priorDebt: 0,
          openingDue: 0,
          currentBilled: 0,
          currentPurchasesCount: 0,
          currentPaid: 0,
          currentTds: 0,
          currentDebt: 0,
          currentDue: 0,
          totalCashPaid: 0,
          totalAdjTds: 0,
          totalAdjDebt: 0,
          purchases: [],
          cash: [],
          adjustments: [],
          openingDoc: null
        });
      }
      const item = map.get(key);
      const pTotal = Number(p.amount || p.total) || 0;
      const pPaid = Number(p.paidAmount) || 0;
      const pTds = Number(p.tdsAmount) || 0;
      const pDebt = Number(p.debtAmount) || 0;
      const pDue = Math.max(0, pTotal - pPaid - pTds - pDebt);

      item.currentBilled += pTotal;
      item.currentPurchasesCount += 1;
      item.currentPaid += pPaid;
      item.currentTds += pTds;
      item.currentDebt += pDebt;
      item.currentDue += pDue;
      item.purchases.push(p);
    });

    // Process Cash Payments to Vendors
    cashEntries.forEach((c) => {
      const pType = String(c.partyType || "").toLowerCase();
      if (pType !== "vendor") return;
      const name = String(c.partyName || "").trim();
      if (!name) return;
      const key = normalizePartyKey(name);
      if (map.has(key)) {
        const item = map.get(key);
        const amt = Number(c.amount) || 0;
        const netAmt = c.type === "out" ? amt : -amt;
        item.totalCashPaid += netAmt;
        item.cash.push(c);
      }
    });

    // Process TDS & Debt Adjustments for Vendors
    adjustments.forEach((adj) => {
      const pType = String(adj.partyType || "").toLowerCase();
      if (pType !== "vendor" && !adj.vendor) return;
      const name = String(adj.vendor || adj.partyName || adj.client || "").trim();
      if (!name) return;
      const key = normalizePartyKey(name);
      if (map.has(key)) {
        const item = map.get(key);
        const amt = Number(adj.amount) || 0;
        const part = String(adj.particulars || "tds").toLowerCase();
        if (part === "tds") item.totalAdjTds += amt;
        else item.totalAdjDebt += amt;
        item.adjustments.push(adj);
      }
    });

    // Calculate Grand Total Net Balance for Each Vendor
    const results = Array.from(map.values()).map((v) => {
      const totalInvoiced = v.priorBilled + v.currentBilled;
      const totalPaid = v.priorPaid + v.currentPaid;
      const totalTds = v.priorTds + v.currentTds;
      const totalDebt = v.priorDebt + v.currentDebt;
      const netOutstandingDue = Math.max(0, totalInvoiced - totalPaid - totalTds - totalDebt);

      let status = "unpaid";
      if (totalInvoiced > 0 && netOutstandingDue <= 0.01) {
        status = "paid";
      } else if (totalPaid > 0 || totalTds > 0 || totalDebt > 0) {
        status = "partial";
      } else if (totalInvoiced === 0) {
        status = "paid";
      }

      const recoveryPercent = totalInvoiced > 0
        ? Math.min(100, Math.round(((totalPaid + totalTds + totalDebt) / totalInvoiced) * 100))
        : 100;

      return {
        ...v,
        totalInvoiced,
        totalPaid,
        totalTds,
        totalDebt,
        netOutstandingDue,
        status,
        recoveryPercent
      };
    });

    // Only include vendors who have actual entries, purchases, payments, or non-zero opening balances
    const activeVendors = results.filter((v) => {
      const hasTransactions = (v.purchases?.length > 0) || (v.cash?.length > 0) || (v.adjustments?.length > 0);
      const hasFinancials = v.totalInvoiced > 0 || v.totalPaid > 0 || v.totalTds > 0 || v.totalDebt > 0 || v.netOutstandingDue > 0 || v.openingDue > 0;
      return hasTransactions || hasFinancials;
    });

    // Sort by Net Outstanding Due descending (highest payables first)
    activeVendors.sort((a, b) => b.netOutstandingDue - a.netOutstandingDue || b.totalInvoiced - a.totalInvoiced);
    return activeVendors;
  }, [vendors, openingBalances, purchases, cashEntries, adjustments]);

  // -------------------------------------------------------------
  // 3. Overall KPI Summaries
  // -------------------------------------------------------------
  const clientKpis = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalTds = 0;
    let totalDebt = 0;
    let totalDue = 0;
    let activeWithDueCount = 0;

    clientMasterList.forEach((c) => {
      totalInvoiced += c.totalInvoiced;
      totalPaid += c.totalPaid;
      totalTds += c.totalTds;
      totalDebt += c.totalDebt;
      totalDue += c.netOutstandingDue;
      if (c.netOutstandingDue > 0.01) activeWithDueCount += 1;
    });

    return {
      totalInvoiced,
      totalPaid,
      totalTds,
      totalDebt,
      totalDue,
      activeWithDueCount,
      totalCount: clientMasterList.length,
      recoveryRate: totalInvoiced > 0 ? ((totalPaid + totalTds + totalDebt) / totalInvoiced) * 100 : 100
    };
  }, [clientMasterList]);

  const vendorKpis = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalTds = 0;
    let totalDebt = 0;
    let totalDue = 0;
    let activeWithDueCount = 0;

    vendorMasterList.forEach((v) => {
      totalInvoiced += v.totalInvoiced;
      totalPaid += v.totalPaid;
      totalTds += v.totalTds;
      totalDebt += v.totalDebt;
      totalDue += v.netOutstandingDue;
      if (v.netOutstandingDue > 0.01) activeWithDueCount += 1;
    });

    return {
      totalInvoiced,
      totalPaid,
      totalTds,
      totalDebt,
      totalDue,
      activeWithDueCount,
      totalCount: vendorMasterList.length,
      recoveryRate: totalInvoiced > 0 ? ((totalPaid + totalTds + totalDebt) / totalInvoiced) * 100 : 100
    };
  }, [vendorMasterList]);

  // Combined Company Position
  const companyKpis = useMemo(() => {
    const netReceivables = clientKpis.totalDue;
    const netPayables = vendorKpis.totalDue;
    const netLiquidPosition = netReceivables - netPayables;
    return {
      netReceivables,
      netPayables,
      netLiquidPosition,
      isPositive: netLiquidPosition >= 0
    };
  }, [clientKpis, vendorKpis]);

  // -------------------------------------------------------------
  // 4. Filtered Lists for UI
  // -------------------------------------------------------------
  const filteredClientList = useMemo(() => {
    return clientMasterList.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.partyName.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.gst.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "all" ||
        c.status === statusFilter;

      const matchBalance =
        balanceFilter === "all" ||
        (balanceFilter === "due_only" && c.netOutstandingDue > 0.01) ||
        (balanceFilter === "zero_only" && c.netOutstandingDue <= 0.01);

      return matchSearch && matchStatus && matchBalance;
    });
  }, [clientMasterList, searchQuery, statusFilter, balanceFilter]);

  const filteredVendorList = useMemo(() => {
    return vendorMasterList.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        v.partyName.toLowerCase().includes(q) ||
        v.code.toLowerCase().includes(q) ||
        v.gst.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "all" ||
        v.status === statusFilter;

      const matchBalance =
        balanceFilter === "all" ||
        (balanceFilter === "due_only" && v.netOutstandingDue > 0.01) ||
        (balanceFilter === "zero_only" && v.netOutstandingDue <= 0.01);

      return matchSearch && matchStatus && matchBalance;
    });
  }, [vendorMasterList, searchQuery, statusFilter, balanceFilter]);

  // -------------------------------------------------------------
  // 5. Unified Transaction Audit Stream
  // -------------------------------------------------------------
  const unifiedStream = useMemo(() => {
    const list = [];

    // Sales Bills
    bills.forEach((b) => {
      list.push({
        id: b.id || b._id,
        date: b.invoice_date || b.date || b.createdAt,
        partyType: "Client",
        partyName: b.client || b.billedTo || "Client",
        type: "Sales Invoice",
        refNo: b.invoice || b.billNo || "-",
        debitAmt: Number(b.amount || b.total) || 0, // Invoiced to client (+)
        creditAmt: 0,
        paid: Number(b.paidAmount) || 0,
        tds: Number(b.tdsAmount) || 0,
        debt: Number(b.debtAmount) || 0,
        status: b.status || "Unpaid",
        remarks: `${b.items?.length || 1} LR(s) billed | Mode: ${b.mode || "Road"}`
      });
    });

    // Purchase Bills
    purchases.forEach((p) => {
      list.push({
        id: p.id || p._id,
        date: p.date || p.createdAt,
        partyType: "Vendor",
        partyName: p.vendor || "Vendor",
        type: "Purchase Bill",
        refNo: p.billNo || "-",
        debitAmt: 0,
        creditAmt: Number(p.amount || p.total) || 0, // Payable to vendor (-)
        paid: Number(p.paidAmount) || 0,
        tds: Number(p.tdsAmount) || 0,
        debt: Number(p.debtAmount) || 0,
        status: p.status || "Unpaid",
        remarks: `Purchase invoice recorded`
      });
    });

    // Cash / Bank Entries
    cashEntries.forEach((c) => {
      const isClient = (c.partyType || "client").toLowerCase() !== "vendor";
      list.push({
        id: c.id || c._id,
        date: c.date || c.createdAt,
        partyType: isClient ? "Client" : "Vendor",
        partyName: c.partyName || (isClient ? "Client" : "Vendor"),
        type: c.type === "in" ? "Receipt (In)" : "Payment (Out)",
        refNo: c.billNo || "General",
        debitAmt: 0,
        creditAmt: Number(c.amount) || 0,
        paid: Number(c.amount) || 0,
        tds: 0,
        debt: 0,
        status: "Completed",
        remarks: c.remarks || "Cash/Bank transaction"
      });
    });

    // TDS & Debt Adjustments
    adjustments.forEach((a) => {
      const isVendor = (a.partyType || "").toLowerCase() === "vendor" || !!a.vendor;
      const part = String(a.particulars || "tds").toLowerCase();
      list.push({
        id: a.id || a._id,
        date: a.date || a.createdAt,
        partyType: isVendor ? "Vendor" : "Client",
        partyName: a.client || a.vendor || a.partyName || "Party",
        type: part === "tds" ? "TDS Deduction" : "Bad Debt / Discount",
        refNo: a.billNo || a.linkedBillNo || "-",
        debitAmt: 0,
        creditAmt: Number(a.amount) || 0,
        paid: 0,
        tds: part === "tds" ? Number(a.amount) || 0 : 0,
        debt: part !== "tds" ? Number(a.amount) || 0 : 0,
        status: a.tdsStatus || "Applied",
        remarks: `${a.percentage ? `${a.percentage}% rate | ` : ""}${a.bankname ? `Bank: ${a.bankname}` : "Ledger entry"}`
      });
    });

    // Sort by Date descending
    list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return list;
  }, [bills, purchases, cashEntries, adjustments]);

  const filteredStream = useMemo(() => {
    return unifiedStream.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.partyName.toLowerCase().includes(q) ||
        item.refNo.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.remarks.toLowerCase().includes(q);

      return matchSearch;
    });
  }, [unifiedStream, searchQuery]);

  // -------------------------------------------------------------
  // 6. Professional Excel / CSV Export Handler
  // -------------------------------------------------------------
  const handleExport = async ({ format }) => {
    setIsExporting(true);
    try {
      const isClientTab = activeTab === "clients" || activeTab === "combined";
      const targetList = isClientTab ? filteredClientList : filteredVendorList;
      const reportTitle = isClientTab
        ? "CLIENT OUTSTANDING & LEDGER MASTER SHEET"
        : "VENDOR OUTSTANDING & PAYABLES MASTER SHEET";

      const columns = [
        { header: "SL", width: 6 },
        { header: isClientTab ? "CLIENT NAME" : "VENDOR NAME", width: 28 },
        { header: "CODE", width: 12 },
        { header: "GSTIN", width: 18 },
        { header: "PRIOR OPENING DUE", width: 18, align: "right", numFmt: "#,##0.00" },
        { header: "CURRENT BILLED", width: 18, align: "right", numFmt: "#,##0.00" },
        { header: "TOTAL INVOICED", width: 18, align: "right", numFmt: "#,##0.00" },
        { header: "TOTAL PAID / RECD", width: 18, align: "right", numFmt: "#,##0.00" },
        { header: "TDS DEDUCTED", width: 16, align: "right", numFmt: "#,##0.00" },
        { header: "DEBT / SAVINGS", width: 16, align: "right", numFmt: "#,##0.00" },
        { header: "NET OUTSTANDING", width: 20, align: "right", numFmt: "#,##0.00" },
        { header: "RECOVERY %", width: 14, align: "center" },
        { header: "STATUS", width: 14, align: "center" }
      ];

      let grandPrior = 0;
      let grandCurrent = 0;
      let grandInvoiced = 0;
      let grandPaid = 0;
      let grandTds = 0;
      let grandDebt = 0;
      let grandNetDue = 0;

      const rows = targetList.map((row, idx) => {
        grandPrior += row.openingDue || 0;
        grandCurrent += row.currentBilled || 0;
        grandInvoiced += row.totalInvoiced || 0;
        grandPaid += row.totalPaid || 0;
        grandTds += row.totalTds || 0;
        grandDebt += row.totalDebt || 0;
        grandNetDue += row.netOutstandingDue || 0;

        return [
          idx + 1,
          toExportCaps(row.partyName),
          toExportCaps(row.code),
          toExportCaps(row.gst),
          Number((row.openingDue || 0).toFixed(2)),
          Number((row.currentBilled || 0).toFixed(2)),
          Number((row.totalInvoiced || 0).toFixed(2)),
          Number((row.totalPaid || 0).toFixed(2)),
          Number((row.totalTds || 0).toFixed(2)),
          Number((row.totalDebt || 0).toFixed(2)),
          Number((row.netOutstandingDue || 0).toFixed(2)),
          `${row.recoveryPercent}%`,
          toExportCaps(row.status === "paid" ? "SETTLED" : row.status === "partial" ? "PARTIAL" : "OVERDUE")
        ];
      });

      const today = new Date().toISOString().split("T")[0];

      if (format === "csv") {
        exportGenericCSV({
          headers: columns.map((c) => c.header),
          rows,
          filename: `Outstanding_Master_Sheet_${today}.csv`
        });
      } else {
        await buildProfessionalExcelReport({
          reportTitle,
          subtitle: `Generated on ${formatCleanDate(new Date())} - Total Records: ${targetList.length}`,
          columns,
          rows,
          summaryTotals: {
            labelColSpan: 4,
            totals: [
              { colIndex: 5, value: Number(grandPrior.toFixed(2)), numFmt: "#,##0.00", align: "right" },
              { colIndex: 6, value: Number(grandCurrent.toFixed(2)), numFmt: "#,##0.00", align: "right" },
              { colIndex: 7, value: Number(grandInvoiced.toFixed(2)), numFmt: "#,##0.00", align: "right" },
              { colIndex: 8, value: Number(grandPaid.toFixed(2)), numFmt: "#,##0.00", align: "right" },
              { colIndex: 9, value: Number(grandTds.toFixed(2)), numFmt: "#,##0.00", align: "right" },
              { colIndex: 10, value: Number(grandDebt.toFixed(2)), numFmt: "#,##0.00", align: "right" },
              { colIndex: 11, value: Number(grandNetDue.toFixed(2)), numFmt: "#,##0.00", align: "right" }
            ]
          },
          filename: `Outstanding_Master_Sheet_${today}.xlsx`
        });
      }

      addToast("Master Sheet exported successfully!", "success");
      setExportModalOpen(false);
    } catch (err) {
      console.error("Export error:", err);
      addToast("Failed to export: " + err.message, "error");
    } finally {
      setIsExporting(false);
    }
  };

  const toggleExpand = (partyKey) => {
    if (expandedParty === partyKey) {
      setExpandedParty(null);
    } else {
      setExpandedParty(partyKey);
      setDrilldownTab("bills");
    }
  };

  return (
    <div className="page-container" style={{ padding: "1.5rem" }}>
      {/* Header Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)", padding: "10px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Scale size={26} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, color: "#0f172a", fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                Total Balances & Dues Summary
              </h2>
              <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "0.85rem" }}>
                Easy overall calculation of money to receive from customers and money to pay to vendors.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn"
            onClick={handleRecalculateAll}
            disabled={recalculating}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              fontWeight: 600,
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              cursor: "pointer"
            }}
            title="Recalculate all party balances live"
          >
            <RefreshCw size={16} className={recalculating ? "spinner" : ""} />
            {recalculating ? "Recalculating..." : "Recalculate & Sync"}
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => setExportModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#16a34a",
              color: "#ffffff",
              border: "none",
              fontWeight: 600,
              padding: "0.55rem 1.1rem",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            <Download size={16} /> Export Sheet
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => window.print()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              fontWeight: 600,
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* KPI Cards Section */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {/* Card 1: Net Client Receivables */}
        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "1.2rem", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.5px" }}>
              Money to Receive (Customers)
            </span>
            <div style={{ background: "#eff6ff", padding: "6px", borderRadius: "8px" }}>
              <Users size={18} color="#2563eb" />
            </div>
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#1e3a8a", marginBottom: "0.25rem" }}>
            {formatCurrency(clientKpis.totalDue)}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#64748b", display: "flex", justifyContent: "space-between" }}>
            <span>Billed: {formatCurrency(clientKpis.totalInvoiced)}</span>
            <span style={{ color: "#16a34a", fontWeight: 700 }}>{Math.round(clientKpis.recoveryRate)}% Received</span>
          </div>
        </div>

        {/* Card 2: Total Recovered / Paid */}
        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "1.2rem", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.5px" }}>
              Total Money Received
            </span>
            <div style={{ background: "#f0fdf4", padding: "6px", borderRadius: "8px" }}>
              <ArrowDownLeft size={18} color="#16a34a" />
            </div>
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#16a34a", marginBottom: "0.25rem" }}>
            {formatCurrency(clientKpis.totalPaid)}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
            Direct cash & bank collections recorded
          </div>
        </div>

        {/* Card 3: TDS Deducted */}
        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "1.2rem", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.5px" }}>
              TDS (Tax) & Discounts
            </span>
            <div style={{ background: "#fef3c7", padding: "6px", borderRadius: "8px" }}>
              <Percent size={18} color="#d97706" />
            </div>
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#d97706", marginBottom: "0.25rem" }}>
            {formatCurrency(clientKpis.totalTds)}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
            Discounts / Debts: {formatCurrency(clientKpis.totalDebt)}
          </div>
        </div>

        {/* Card 4: Net Vendor Payables */}
        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "1.2rem", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.5px" }}>
              Money to Pay (Vendors)
            </span>
            <div style={{ background: "#fff1f2", padding: "6px", borderRadius: "8px" }}>
              <Building2 size={18} color="#e11d48" />
            </div>
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#e11d48", marginBottom: "0.25rem" }}>
            {formatCurrency(vendorKpis.totalDue)}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#64748b", display: "flex", justifyContent: "space-between" }}>
            <span>Purchases: {formatCurrency(vendorKpis.totalInvoiced)}</span>
            <span style={{ color: "#16a34a", fontWeight: 700 }}>{Math.round(vendorKpis.recoveryRate)}% Paid</span>
          </div>
        </div>

        {/* Card 5: Net Liquid Position */}
        <div style={{
          background: companyKpis.isPositive ? "linear-gradient(135deg, #065f46 0%, #047857 100%)" : "linear-gradient(135deg, #991b1b 0%, #b91c1c 100%)",
          borderRadius: "14px",
          padding: "1.2rem",
          color: "#ffffff",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "rgba(255,255,255,0.85)", letterSpacing: "0.5px" }}>
              Net Balance
            </span>
            <ShieldCheck size={18} color="#ffffff" />
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, marginBottom: "0.25rem" }}>
            {formatCurrency(companyKpis.netLiquidPosition)}
          </div>
          <div style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.85)" }}>
            {companyKpis.isPositive ? "Money to receive is more than money to pay" : "Money to pay is more than money to receive"}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #e2e8f0",
        marginBottom: "1.25rem",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => { setActiveTab("clients"); setExpandedParty(null); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "0.65rem 1.1rem",
              border: "none",
              borderBottom: activeTab === "clients" ? "3px solid #2563eb" : "3px solid transparent",
              background: "none",
              color: activeTab === "clients" ? "#1e3a8a" : "#64748b",
              fontWeight: activeTab === "clients" ? 700 : 500,
              fontSize: "0.92rem",
              cursor: "pointer"
            }}
          >
            <Users size={17} color={activeTab === "clients" ? "#2563eb" : "#64748b"} />
            👤 Customers (Money to Receive) ({filteredClientList.length})
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("vendors"); setExpandedParty(null); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "0.65rem 1.1rem",
              border: "none",
              borderBottom: activeTab === "vendors" ? "3px solid #e11d48" : "3px solid transparent",
              background: "none",
              color: activeTab === "vendors" ? "#9f1239" : "#64748b",
              fontWeight: activeTab === "vendors" ? 700 : 500,
              fontSize: "0.92rem",
              cursor: "pointer"
            }}
          >
            <Building2 size={17} color={activeTab === "vendors" ? "#e11d48" : "#64748b"} />
            🏢 Vendors (Money to Pay) ({filteredVendorList.length})
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("stream"); setExpandedParty(null); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "0.65rem 1.1rem",
              border: "none",
              borderBottom: activeTab === "stream" ? "3px solid #059669" : "3px solid transparent",
              background: "none",
              color: activeTab === "stream" ? "#065f46" : "#64748b",
              fontWeight: activeTab === "stream" ? 700 : 500,
              fontSize: "0.92rem",
              cursor: "pointer"
            }}
          >
            <Receipt size={17} color={activeTab === "stream" ? "#059669" : "#64748b"} />
            📋 All Payment Records ({filteredStream.length})
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingBottom: "0.5rem" }}>
          <Link
            to="/outstanding"
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "#2563eb",
              textDecoration: "none",
              padding: "4px 8px",
              borderRadius: "6px",
              background: "#eff6ff",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            TDS & Deductions <ExternalLink size={12} />
          </Link>
          <Link
            to="/opening-outstanding"
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "#0891b2",
              textDecoration: "none",
              padding: "4px 8px",
              borderRadius: "6px",
              background: "#ecfeff",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            Old Year Balances <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "1rem 1.25rem",
        border: "1px solid #e2e8f0",
        marginBottom: "1.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        flexWrap: "wrap"
      }}>
        {/* Search Input */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "260px", background: "#f8fafc", padding: "0.45rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder={activeTab === "clients" ? "Search customer name, code, GSTIN..." : activeTab === "vendors" ? "Search vendor name, code, GSTIN..." : "Search all records, bill no, name..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "0.9rem", color: "#1e293b" }}
          />
        </div>

        {/* Filter Controls (For Clients and Vendors) */}
        {activeTab !== "stream" && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b" }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: "0.45rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff", fontWeight: 600, color: "#334155" }}
              >
                <option value="all">All</option>
                <option value="paid">Settled / Paid</option>
                <option value="partial">Partially Paid</option>
                <option value="unpaid">Pending / Unpaid</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b" }}>Balance:</span>
              <select
                value={balanceFilter}
                onChange={(e) => setBalanceFilter(e.target.value)}
                style={{ padding: "0.45rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#ffffff", fontWeight: 600, color: "#334155" }}
              >
                <option value="all">All Balances</option>
                <option value="due_only">Pending Balance (&gt; ₹0)</option>
                <option value="zero_only">Zero Balance (₹0 Due)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem 0", color: "#64748b" }}>
          <RefreshCw size={36} className="spinner" style={{ margin: "0 auto 1rem", display: "block", color: "#2563eb" }} />
          <p style={{ fontWeight: 600, fontSize: "1rem" }}>Calculating total balances...</p>
        </div>
      ) : activeTab === "clients" || activeTab === "vendors" ? (
        <div className="glass-panel" style={{ overflow: "hidden", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
          <Table
            minWidth="1650px"
            headers={[
              { label: "Company / Person Name", align: "left", minWidth: "280px" },
              { label: "Old Pending Balance", align: "right", minWidth: "160px" },
              { label: "This Year Bills", align: "right", minWidth: "150px" },
              { label: "Total Billed", align: "right", minWidth: "150px" },
              { label: activeTab === "clients" ? "Money Received" : "Money Paid", align: "right", minWidth: "150px" },
              { label: "TDS (Tax)", align: "right", minWidth: "130px" },
              { label: "Discounts / Debts", align: "right", minWidth: "130px" },
              { label: "Final Pending Due", align: "right", minWidth: "170px" },
              { label: "Payment Progress", align: "center", minWidth: "120px" },
              { label: "Status", align: "center", minWidth: "110px" },
              { label: "Details", align: "center", minWidth: "100px" }
            ]}
            data={activeTab === "clients" ? filteredClientList : filteredVendorList}
            pagination={true}
            defaultEntries={25}
            renderRow={(row, idx) => {
              const isExpanded = expandedParty === row.partyKey;
              return (
                <React.Fragment key={row.partyKey || idx}>
                  <tr
                    onClick={() => toggleExpand(row.partyKey)}
                    style={{
                      cursor: "pointer",
                      backgroundColor: isExpanded ? "#f8fafc" : undefined,
                      transition: "background-color 0.15s ease"
                    }}
                  >
                    <td style={{ minWidth: "280px", maxWidth: "360px", padding: "12px 14px", verticalAlign: "middle" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", lineHeight: "1.3" }}>
                          <span>{row.partyName}</span>
                          {row.code && row.code !== "-" && (
                            <span style={{ fontSize: "0.7rem", color: "#64748b", background: "#f1f5f9", padding: "1px 6px", borderRadius: "4px", flexShrink: 0, fontWeight: 800 }}>
                              {row.code}
                            </span>
                          )}
                        </div>
                        {row.gst && row.gst !== "-" && (
                          <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "3px" }}>
                            GST: {row.gst}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ minWidth: "160px", padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 600, color: row.openingDue > 0 ? "#b45309" : "#64748b", verticalAlign: "middle" }}>
                      {formatCurrency(row.openingDue)}
                    </td>
                    <td style={{ minWidth: "150px", padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 600, color: "#334155", verticalAlign: "middle" }}>
                      {formatCurrency(row.currentBilled)}
                      {row.currentBillsCount > 0 && (
                        <span style={{ fontSize: "0.72rem", color: "#64748b", display: "block" }}>
                          ({row.currentBillsCount} bill{row.currentBillsCount === 1 ? "" : "s"})
                        </span>
                      )}
                    </td>
                    <td style={{ minWidth: "150px", padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 700, color: "#1e293b", verticalAlign: "middle" }}>
                      {formatCurrency(row.totalInvoiced)}
                    </td>
                    <td style={{ minWidth: "150px", padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 700, color: "#16a34a", verticalAlign: "middle" }}>
                      {formatCurrency(row.totalPaid)}
                    </td>
                    <td style={{ minWidth: "130px", padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 600, color: "#d97706", verticalAlign: "middle" }}>
                      {formatCurrency(row.totalTds)}
                    </td>
                    <td style={{ minWidth: "130px", padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 600, color: "#7c3aed", verticalAlign: "middle" }}>
                      {formatCurrency(row.totalDebt)}
                    </td>
                    <td style={{ minWidth: "170px", padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 800, fontSize: "0.95rem", color: row.netOutstandingDue > 0 ? (activeTab === "clients" ? "#1e3a8a" : "#be123c") : "#16a34a", verticalAlign: "middle" }}>
                      {formatCurrency(row.netOutstandingDue)}
                    </td>
                    <td style={{ minWidth: "120px", padding: "12px 14px", textAlign: "center", verticalAlign: "middle" }}>
                      <div style={{ width: "90px", margin: "0 auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", fontWeight: 700, marginBottom: "2px", color: "#475569" }}>
                          <span>{row.recoveryPercent}%</span>
                        </div>
                        <div style={{ width: "100%", height: "6px", backgroundColor: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${row.recoveryPercent}%`,
                              height: "100%",
                              backgroundColor: row.recoveryPercent >= 100 ? "#16a34a" : row.recoveryPercent >= 50 ? "#2563eb" : "#f59e0b",
                              borderRadius: "3px"
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td style={{ minWidth: "110px", padding: "12px 14px", textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                      <span style={{
                        padding: "4px 9px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        backgroundColor: row.status === "paid" ? "#dcfce7" : row.status === "partial" ? "#fef3c7" : "#fee2e2",
                        color: row.status === "paid" ? "#166534" : row.status === "partial" ? "#92400e" : "#991b1b"
                      }}>
                        {row.status === "paid" ? "Settled" : row.status === "partial" ? "Partial" : "Unpaid"}
                      </span>
                    </td>
                    <td style={{ minWidth: "100px", padding: "12px 14px", textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleExpand(row.partyKey); }}
                        style={{
                          background: isExpanded ? "#e2e8f0" : "#f1f5f9",
                          border: "none",
                          padding: "5px 10px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: "#334155"
                        }}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? "Hide" : "Details"}
                      </button>
                    </td>
                  </tr>

                  {/* Inline Drill-down Details */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={11} style={{ padding: "1.25rem", background: "#f8fafc", borderBottom: "2px solid #cbd5e1" }}>
                        <div style={{ background: "#ffffff", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                          {/* Drill-down Header */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem" }}>
                            <div>
                              <h4 style={{ margin: 0, color: "#0f172a", fontSize: "1.1rem", fontWeight: 700 }}>
                                {row.partyName} - Detailed Audit Ledger
                              </h4>
                              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                Code: {row.code} | GSTIN: {row.gst} | Address: {row.address}
                              </span>
                            </div>

                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button
                                type="button"
                                onClick={() => setDrilldownTab("bills")}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid #cbd5e1",
                                  background: drilldownTab === "bills" ? "#2563eb" : "#ffffff",
                                  color: drilldownTab === "bills" ? "#ffffff" : "#475569",
                                  fontWeight: 600,
                                  fontSize: "0.8rem",
                                  cursor: "pointer"
                                }}
                              >
                                {activeTab === "clients" ? `Invoices (${row.bills.length})` : `Purchases (${row.purchases.length})`}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDrilldownTab("cash")}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid #cbd5e1",
                                  background: drilldownTab === "cash" ? "#16a34a" : "#ffffff",
                                  color: drilldownTab === "cash" ? "#ffffff" : "#475569",
                                  fontWeight: 600,
                                  fontSize: "0.8rem",
                                  cursor: "pointer"
                                }}
                              >
                                Cash & Bank ({row.cash.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setDrilldownTab("adjustments")}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid #cbd5e1",
                                  background: drilldownTab === "adjustments" ? "#d97706" : "#ffffff",
                                  color: drilldownTab === "adjustments" ? "#ffffff" : "#475569",
                                  fontWeight: 600,
                                  fontSize: "0.8rem",
                                  cursor: "pointer"
                                }}
                              >
                                TDS / Debt ({row.adjustments.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setDrilldownTab("opening")}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid #cbd5e1",
                                  background: drilldownTab === "opening" ? "#7c3aed" : "#ffffff",
                                  color: drilldownTab === "opening" ? "#ffffff" : "#475569",
                                  fontWeight: 600,
                                  fontSize: "0.8rem",
                                  cursor: "pointer"
                                }}
                              >
                                Prior FY Opening
                              </button>
                            </div>
                          </div>

                          {/* Drill-down Sub-views */}
                          {drilldownTab === "bills" && (
                            <div>
                              <h5 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", color: "#334155" }}>
                                {activeTab === "clients" ? "Sales Invoices for " : "Purchase Bills for "} {row.partyName}
                              </h5>
                              {(activeTab === "clients" ? row.bills : row.purchases).length === 0 ? (
                                <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: 0 }}>No current FY bills found for this party.</p>
                              ) : (
                                <div style={{ overflowX: "auto" }}>
                                  <table style={{ width: "100%", fontSize: "0.82rem", borderCollapse: "collapse" }}>
                                    <thead>
                                      <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#475569" }}>
                                        <th style={{ padding: "6px 10px" }}>Date</th>
                                        <th style={{ padding: "6px 10px" }}>Bill / Invoice No.</th>
                                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Total Amount</th>
                                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Paid Amount</th>
                                        <th style={{ padding: "6px 10px", textAlign: "right" }}>TDS Amount</th>
                                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Debt Amount</th>
                                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Remaining Due</th>
                                        <th style={{ padding: "6px 10px" }}>Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(activeTab === "clients" ? row.bills : row.purchases).map((item, bIdx) => {
                                        const bTot = Number(item.amount || item.total) || 0;
                                        const bPd = Number(item.paidAmount) || 0;
                                        const bT = Number(item.tdsAmount) || 0;
                                        const bD = Number(item.debtAmount) || 0;
                                        const bRemaining = Math.max(0, bTot - bPd - bT - bD);
                                        return (
                                          <tr key={item.id || bIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "6px 10px" }}>{formatCleanDate(item.invoice_date || item.date || item.createdAt)}</td>
                                            <td style={{ padding: "6px 10px", fontWeight: 600, color: "#2563eb" }}>{item.invoice || item.billNo || "-"}</td>
                                            <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600 }}>{formatCurrency(bTot)}</td>
                                            <td style={{ padding: "6px 10px", textAlign: "right", color: "#16a34a" }}>{formatCurrency(bPd)}</td>
                                            <td style={{ padding: "6px 10px", textAlign: "right", color: "#d97706" }}>{formatCurrency(bT)}</td>
                                            <td style={{ padding: "6px 10px", textAlign: "right", color: "#7c3aed" }}>{formatCurrency(bD)}</td>
                                            <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: bRemaining > 0 ? "#be123c" : "#16a34a" }}>{formatCurrency(bRemaining)}</td>
                                            <td style={{ padding: "6px 10px" }}>
                                              <span style={{
                                                padding: "2px 6px",
                                                borderRadius: "8px",
                                                fontSize: "0.7rem",
                                                fontWeight: 700,
                                                background: item.status === "Paid" ? "#dcfce7" : item.status === "Partial" ? "#fef3c7" : "#fee2e2",
                                                color: item.status === "Paid" ? "#166534" : item.status === "Partial" ? "#92400e" : "#991b1b"
                                              }}>
                                                {item.status || "Unpaid"}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {drilldownTab === "cash" && (
                            <div>
                              <h5 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", color: "#334155" }}>
                                Cash / Bank Transactions ({row.cash.length})
                              </h5>
                              {row.cash.length === 0 ? (
                                <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: 0 }}>No cash or bank entries found for this party.</p>
                              ) : (
                                <div style={{ overflowX: "auto" }}>
                                  <table style={{ width: "100%", fontSize: "0.82rem", borderCollapse: "collapse" }}>
                                    <thead>
                                      <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#475569" }}>
                                        <th style={{ padding: "6px 10px" }}>Date</th>
                                        <th style={{ padding: "6px 10px" }}>Type</th>
                                        <th style={{ padding: "6px 10px" }}>Linked Bill No.</th>
                                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Amount</th>
                                        <th style={{ padding: "6px 10px" }}>Remarks</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {row.cash.map((cItem, cIdx) => (
                                        <tr key={cItem.id || cIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                          <td style={{ padding: "6px 10px" }}>{formatCleanDate(cItem.date || cItem.createdAt)}</td>
                                          <td style={{ padding: "6px 10px" }}>
                                            <span style={{ fontWeight: 700, color: cItem.type === "in" ? "#16a34a" : "#dc2626" }}>
                                              {cItem.type === "in" ? "Receipt (In)" : "Payment (Out)"}
                                            </span>
                                          </td>
                                          <td style={{ padding: "6px 10px", color: "#2563eb", fontWeight: 600 }}>{cItem.billNo || "General"}</td>
                                          <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700 }}>{formatCurrency(cItem.amount)}</td>
                                          <td style={{ padding: "6px 10px", color: "#64748b" }}>{cItem.remarks || "-"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {drilldownTab === "adjustments" && (
                            <div>
                              <h5 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", color: "#334155" }}>
                                TDS & Bad Debt Adjustments ({row.adjustments.length})
                              </h5>
                              {row.adjustments.length === 0 ? (
                                <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: 0 }}>No TDS or debt adjustments found for this party.</p>
                              ) : (
                                <div style={{ overflowX: "auto" }}>
                                  <table style={{ width: "100%", fontSize: "0.82rem", borderCollapse: "collapse" }}>
                                    <thead>
                                      <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#475569" }}>
                                        <th style={{ padding: "6px 10px" }}>Date</th>
                                        <th style={{ padding: "6px 10px" }}>Type</th>
                                        <th style={{ padding: "6px 10px" }}>Linked Bill No.</th>
                                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Amount</th>
                                        <th style={{ padding: "6px 10px" }}>Bank / Details</th>
                                        <th style={{ padding: "6px 10px" }}>Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {row.adjustments.map((aItem, aIdx) => (
                                        <tr key={aItem.id || aIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                          <td style={{ padding: "6px 10px" }}>{formatCleanDate(aItem.date || aItem.createdAt)}</td>
                                          <td style={{ padding: "6px 10px", fontWeight: 700, color: aItem.particulars === "tds" ? "#d97706" : "#7c3aed" }}>
                                            {aItem.particulars === "tds" ? "TDS Deduction" : "Bad Debt / Discount"}
                                          </td>
                                          <td style={{ padding: "6px 10px", color: "#2563eb", fontWeight: 600 }}>{aItem.billNo || aItem.linkedBillNo || "-"}</td>
                                          <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700 }}>{formatCurrency(aItem.amount)}</td>
                                          <td style={{ padding: "6px 10px", color: "#64748b" }}>{aItem.bankname || aItem.remarks || "-"}</td>
                                          <td style={{ padding: "6px 10px" }}>
                                            <span style={{ padding: "2px 6px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 700, background: "#f1f5f9" }}>
                                              {aItem.tdsStatus || "Applied"}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {drilldownTab === "opening" && (
                            <div>
                              <h5 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", color: "#334155" }}>
                                Prior Financial Year (FY) Balances
                              </h5>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Prior FY Invoiced</span>
                                  <strong style={{ fontSize: "1.05rem", color: "#0f172a" }}>{formatCurrency(row.priorBilled)}</strong>
                                </div>
                                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Prior FY Paid</span>
                                  <strong style={{ fontSize: "1.05rem", color: "#16a34a" }}>{formatCurrency(row.priorPaid)}</strong>
                                </div>
                                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Prior FY TDS</span>
                                  <strong style={{ fontSize: "1.05rem", color: "#d97706" }}>{formatCurrency(row.priorTds)}</strong>
                                </div>
                                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Prior FY Bad Debt</span>
                                  <strong style={{ fontSize: "1.05rem", color: "#7c3aed" }}>{formatCurrency(row.priorDebt)}</strong>
                                </div>
                                <div style={{ background: "#eff6ff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                                  <span style={{ fontSize: "0.75rem", color: "#1d4ed8", display: "block" }}>Net Prior Opening Due</span>
                                  <strong style={{ fontSize: "1.05rem", color: "#1e3a8a" }}>{formatCurrency(row.openingDue)}</strong>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            }}
          />
        </div>
      ) : (
        /* Unified Transaction Audit Stream Tab */
        <div className="glass-panel" style={{ overflow: "hidden", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
          <Table
            minWidth="1400px"
            headers={[
              { label: "Date", align: "left", minWidth: "110px" },
              { label: "Party Type", align: "left", minWidth: "100px" },
              { label: "Party Name", align: "left", minWidth: "240px" },
              { label: "Transaction Type", align: "left", minWidth: "160px" },
              { label: "Reference / Bill No.", align: "left", minWidth: "160px" },
              { label: "Debit / Invoiced", align: "right", minWidth: "140px" },
              { label: "Credit / Paid", align: "right", minWidth: "140px" },
              { label: "TDS / Debt", align: "right", minWidth: "130px" },
              { label: "Status", align: "center", minWidth: "100px" },
              { label: "Remarks / Details", align: "left", minWidth: "200px" }
            ]}
            data={filteredStream}
            pagination={true}
            defaultEntries={50}
            renderRow={(row, sIdx) => (
              <tr key={row.id || sIdx}>
                <td style={{ minWidth: "110px", fontSize: "0.82rem", color: "#475569", whiteSpace: "nowrap" }}>
                  {formatCleanDate(row.date)}
                </td>
                <td style={{ minWidth: "100px", whiteSpace: "nowrap" }}>
                  <span style={{
                    padding: "3px 7px",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    backgroundColor: row.partyType === "Client" ? "#eff6ff" : "#fff1f2",
                    color: row.partyType === "Client" ? "#1e40af" : "#9f1239"
                  }}>
                    {row.partyType.toUpperCase()}
                  </span>
                </td>
                <td style={{ minWidth: "240px", maxWidth: "320px", fontWeight: 700, color: "#0f172a" }}>
                  {row.partyName}
                </td>
                <td style={{ minWidth: "160px", fontWeight: 600, color: "#334155", whiteSpace: "nowrap" }}>
                  {row.type}
                </td>
                <td style={{ minWidth: "160px", fontWeight: 600, color: "#2563eb", whiteSpace: "nowrap" }}>
                  {row.refNo}
                </td>
                <td style={{ minWidth: "140px", fontWeight: 700, color: row.debitAmt > 0 ? "#1e3a8a" : "#94a3b8", textAlign: "right", whiteSpace: "nowrap" }}>
                  {row.debitAmt > 0 ? formatCurrency(row.debitAmt) : "-"}
                </td>
                <td style={{ minWidth: "140px", fontWeight: 700, color: row.creditAmt > 0 ? "#16a34a" : "#94a3b8", textAlign: "right", whiteSpace: "nowrap" }}>
                  {row.creditAmt > 0 ? formatCurrency(row.creditAmt) : "-"}
                </td>
                <td style={{ minWidth: "130px", fontWeight: 600, color: (row.tds > 0 || row.debt > 0) ? "#d97706" : "#94a3b8", textAlign: "right", whiteSpace: "nowrap" }}>
                  {(row.tds > 0 || row.debt > 0) ? formatCurrency(row.tds + row.debt) : "-"}
                </td>
                <td style={{ minWidth: "100px", textAlign: "center", whiteSpace: "nowrap" }}>
                  <span style={{
                    padding: "3px 8px",
                    borderRadius: "8px",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    background: row.status === "Paid" || row.status === "Completed" || row.status === "Claimed" ? "#dcfce7" : row.status === "Partial" ? "#fef3c7" : "#fee2e2",
                    color: row.status === "Paid" || row.status === "Completed" || row.status === "Claimed" ? "#166534" : row.status === "Partial" ? "#92400e" : "#991b1b"
                  }}>
                    {row.status}
                  </span>
                </td>
                <td style={{ minWidth: "200px", fontSize: "0.8rem", color: "#64748b" }}>
                  {row.remarks}
                </td>
              </tr>
            )}
          />
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExport}
        title="Export Outstanding Master Sheet"
        subtitle={`Exporting ${activeTab === "clients" ? filteredClientList.length : filteredVendorList.length} party records`}
        itemCount={activeTab === "clients" ? filteredClientList.length : filteredVendorList.length}
        isExporting={isExporting}
      />
    </div>
  );
};

export default OutstandingFinalSheet;
