import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import axios from "axios";
import Papa from "papaparse";
import { 
  Trash2, 
  Plus, 
  Search, 
  Edit, 
  Download, 
  Upload, 
  Activity, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle,
  X,
  Percent,
  Check,
  Calendar,
  RefreshCw,
  Clock
} from "lucide-react";
import { useDialog } from "../context/DialogContext";
import { useToast } from "../context/ToastContext";
import Table from "../components/Table";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const TdsDebtManagement = () => {
  const navigate = useNavigate();
  const { confirm, alert: alertDialog } = useDialog();
  const { addToast } = useToast();

  // States
  const [clients, setClients] = useState([]);
  const [bills, setBills] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [openingBalances, setOpeningBalances] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedBillNo, setSelectedBillNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  
  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [particularsFilter, setParticularsFilter] = useState("All");
  const [partyFilter, setPartyFilter] = useState(() => sessionStorage.getItem("active_tds_tab") || "All"); // 'All' | 'Client' | 'Vendor'

  // Autocomplete Top Filter states (Matches Clients, Vendors, Sales Bills, Purchase Bills)
  const [topSearchInput, setTopSearchInput] = useState("");
  const [topSearchResults, setTopSearchResults] = useState([]);

  // Form Autocomplete search states
  const [billSearchInput, setBillSearchInput] = useState("");
  const [billSearchResults, setBillSearchResults] = useState([]);
  const [isDirectPayment, setIsDirectPayment] = useState(false);
  const [formClientSearchInput, setFormClientSearchInput] = useState("");
  const [formClientSearchResults, setFormClientSearchResults] = useState([]);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const initialFormState = {
    partyType: "Client", // 'Client' | 'Vendor'
    client: "",
    particulars: "tds",
    amount: "",
    percentage: "",
    date: new Date().toISOString().split("T")[0],
    bankname: "",
    billNo: "",
    billAmount: 0,
    tdsStatus: "pending"
  };
  const [form, setForm] = useState(() => {
    try {
      const saved = sessionStorage.getItem("draft_tds_form");
      return saved ? JSON.parse(saved) : initialFormState;
    } catch {
      return initialFormState;
    }
  });

  // Auto-save draft and active tab to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("active_tds_tab", partyFilter);
  }, [partyFilter]);

  useEffect(() => {
    if (!editingId) {
      sessionStorage.setItem("draft_tds_form", JSON.stringify(form));
    }
  }, [form, editingId]);

  // Fetch all initial data
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsRes, billsRes, adjRes, vendorsRes, purchasesRes, openRes] = await Promise.all([
        axios.get(`${API}/clients`),
        axios.get(`${API}/bills`),
        axios.get(`${API}/outstanding`),
        axios.get(`${API}/vendors`),
        axios.get(`${API}/purchases`),
        axios.get(`${API}/opening-balances`)
      ]);
      
      if (clientsRes.data.success) setClients(clientsRes.data.data || []);
      if (billsRes.data.success) setBills(billsRes.data.data || []);
      if (adjRes.data.success) setAdjustments(adjRes.data.data || []);
      if (vendorsRes.data.success) setVendors(vendorsRes.data.data || []);
      if (purchasesRes.data.success) setPurchases(purchasesRes.data.data || []);
      if (openRes.data.success) setOpeningBalances(openRes.data.data || []);
    } catch (error) {
      console.error("Error loading data", error);
      addToast("Failed to fetch records", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const handleRecalculateAll = async () => {
    setRecalculating(true);
    try {
      const res = await axios.post(`${API}/outstanding/recalculate-all`);
      if (res.data.success) {
        addToast("All client & vendor payments, TDS, and outstanding recalculated successfully!", "success");
        await fetchInitialData();
      } else {
        addToast(res.data.message || "Recalculation failed", "error");
      }
    } catch (err) {
      console.error("Recalculate error:", err);
      addToast("Failed to recalculate: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => {
    if (showFormModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showFormModal]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Compute a bill's actual payment status dynamically
  const getBillStatus = useCallback((bill) => {
    const billNo = String(bill.invoice || bill.billNo || bill.id || '').toLowerCase().trim();
    const totalAmt = Number(bill.total || bill.amount) || 0;
    const receivedAmt = Number(bill.paidAmount || 0);

    const billAdjustments = adjustments.filter(e => String(e.billNo || '').toLowerCase().trim() === billNo);
    const tdsAmt = billAdjustments.filter(e => String(e.particulars).toLowerCase() === 'tds').reduce((sum, e) => sum + Number(e.amount), 0);
    const debtAmt = billAdjustments.filter(e => String(e.particulars).toLowerCase() === 'debit' || String(e.particulars).toLowerCase() === 'debt').reduce((sum, e) => sum + Number(e.amount), 0);
    
    const pendingAmt = Math.max(0, totalAmt - receivedAmt - tdsAmt - debtAmt);

    if ((bill.status || "").toLowerCase() === "cancelled") return "Cancelled";
    if (pendingAmt <= 0.01) return "Paid";
    if ((receivedAmt + tdsAmt + debtAmt) <= 0.01) return "Unpaid";
    return "Partial";
  }, [adjustments]);

  // Filtered bills of selected client/bill
  const clientBills = useMemo(() => {
    if (selectedBillNo) {
      return bills.filter(b => String(b.invoice || b.billNo || b.id).toLowerCase().trim() === selectedBillNo.toLowerCase().trim());
    }
    if (selectedClient) {
      return bills.filter(b => 
        (b.client || b.billedTo || "").toLowerCase().trim() === selectedClient.toLowerCase().trim()
      );
    }
    return bills;
  }, [bills, selectedClient, selectedBillNo]);

  // Combined adjustments including prior year opening TDS entries
  const allAdjustmentsCombined = useMemo(() => {
    const list = [...adjustments];
    
    // Inject prior FY TDS from opening balances
    openingBalances.forEach(o => {
      const priorTds = Number(o.totalTdsPrior) || 0;
      if (priorTds > 0) {
        list.push({
          id: `prior_opening_${o.id}`,
          isPriorFYOpening: true,
          openingBalanceId: o.id,
          financialYear: o.financialYear || "2025-2026",
          partyType: o.partyType || "Client",
          client: o.partyName,
          vendor: o.partyName,
          particulars: "tds",
          amount: priorTds,
          date: o.asOfDate || "2026-03-31",
          bankname: `Prior FY ${o.financialYear || '2025-2026'} Carried TDS`,
          billNo: `Prior FY Opening`,
          tdsStatus: o.tdsStatus || "pending",
          notes: o.notes || "Carried forward prior year TDS balance"
        });
      }
    });

    return list;
  }, [adjustments, openingBalances]);

  // Adjustments of the selected client/bill (matched case-insensitively)
  const clientAdjustments = useMemo(() => {
    if (selectedBillNo) {
      return allAdjustmentsCombined.filter(e => String(e.billNo || '').toLowerCase().trim() === selectedBillNo.toLowerCase().trim());
    }
    if (selectedClient) {
      return allAdjustmentsCombined.filter(e => 
        (e.client || e.vendor || "").toLowerCase().trim() === selectedClient.toLowerCase().trim()
      );
    }
    return allAdjustmentsCombined;
  }, [allAdjustmentsCombined, selectedClient, selectedBillNo]);

  // Filtered adjustments list for rendering in Table
  const filteredAdjustments = useMemo(() => {
    return clientAdjustments.filter(e => {
      const matchesSearch = 
        (e.client || e.vendor || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.billNo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.bankname || e.bankName || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesParticulars = 
        particularsFilter === "All" || 
        e.particulars === particularsFilter;

      const isVendorRecord = String(e.partyType || "").toLowerCase() === "vendor";
      const matchesParty = 
        partyFilter === "All" || 
        (partyFilter === "Vendor" ? isVendorRecord : !isVendorRecord);

      return matchesSearch && matchesParticulars && matchesParty;
    });
  }, [clientAdjustments, searchQuery, particularsFilter, partyFilter]);

  // Calculation Metrics (Context-Aware for All / Client / Vendor)
  const metrics = useMemo(() => {
    let relevantBills = [];
    let relevantAdj = [];
    let relevantOpenings = [];

    if (partyFilter === "Vendor") {
      relevantBills = selectedBillNo ? purchases.filter(p => (p.billNo || '').toLowerCase() === selectedBillNo.toLowerCase()) : (selectedClient ? purchases.filter(p => (p.vendor || '').toLowerCase() === selectedClient.toLowerCase()) : purchases);
      relevantAdj = allAdjustmentsCombined.filter(a => String(a.partyType || "").toLowerCase() === "vendor");
      relevantOpenings = openingBalances.filter(o => String(o.partyType || '').toLowerCase() === 'vendor');
    } else if (partyFilter === "Client") {
      relevantBills = selectedBillNo ? bills.filter(b => (b.invoice || b.billNo || '').toLowerCase() === selectedBillNo.toLowerCase()) : (selectedClient ? bills.filter(b => (b.client || b.billedTo || '').toLowerCase() === selectedClient.toLowerCase()) : bills);
      relevantAdj = allAdjustmentsCombined.filter(a => String(a.partyType || "client").toLowerCase() !== "vendor");
      relevantOpenings = openingBalances.filter(o => String(o.partyType || 'Client').toLowerCase() === 'client');
    } else {
      // All
      const allSales = selectedBillNo ? bills.filter(b => (b.invoice || b.billNo || '').toLowerCase() === selectedBillNo.toLowerCase()) : (selectedClient ? bills.filter(b => (b.client || b.billedTo || '').toLowerCase() === selectedClient.toLowerCase()) : bills);
      const allPurchases = selectedBillNo ? purchases.filter(p => (p.billNo || '').toLowerCase() === selectedBillNo.toLowerCase()) : (selectedClient ? purchases.filter(p => (p.vendor || '').toLowerCase() === selectedClient.toLowerCase()) : purchases);
      relevantBills = [...allSales, ...allPurchases];
      relevantAdj = allAdjustmentsCombined;
      relevantOpenings = openingBalances;
    }

    if (selectedClient || selectedBillNo) {
      if (selectedBillNo) {
        relevantAdj = relevantAdj.filter(e => String(e.billNo || '').toLowerCase().trim() === selectedBillNo.toLowerCase().trim());
        relevantOpenings = [];
      } else if (selectedClient) {
        relevantAdj = relevantAdj.filter(e => String(e.client || e.vendor || '').toLowerCase().trim() === selectedClient.toLowerCase().trim());
        relevantOpenings = relevantOpenings.filter(o => String(o.partyName || '').toLowerCase().trim() === selectedClient.toLowerCase().trim());
      }
    }

    const currentBilled = relevantBills.reduce((sum, b) => sum + (Number(b.total || b.amount) || 0), 0);
    const currentPaid = relevantBills.reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0);
    
    const priorBilled = relevantOpenings.reduce((sum, o) => sum + (Number(o.totalBilledPrior) || 0), 0);
    const priorPaid = relevantOpenings.reduce((sum, o) => sum + (Number(o.totalPaidPrior) || 0), 0);
    const priorDebt = relevantOpenings.reduce((sum, o) => sum + (Number(o.totalDebtPrior) || 0), 0);
    const priorOutstanding = relevantOpenings.reduce((sum, o) => sum + (Number(o.openingOutstanding) || 0), 0);

    const totalBilled = currentBilled + priorBilled;
    const totalPayments = currentPaid + priorPaid;
    
    // TDS calculations (from all combined adjustments including prior opening)
    const tdsList = relevantAdj.filter(e => String(e.particulars).toLowerCase() === "tds");
    const totalTds = tdsList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalTdsRec = tdsList
      .filter(e => String(e.tdsStatus).toLowerCase() === "received")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalTdsPend = tdsList
      .filter(e => String(e.tdsStatus).toLowerCase() !== "received")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const totalDebt = relevantAdj
      .filter(e => String(e.particulars).toLowerCase() === "debit" || String(e.particulars).toLowerCase() === "debt")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0) + priorDebt;
    
    const outstanding = Math.max(0, totalBilled - totalPayments - totalTds - totalDebt);

    return { 
      totalBilled, 
      totalPayments, 
      totalTds, 
      totalTdsRec, 
      totalTdsPend, 
      totalDebt, 
      outstanding,
      currentBilled,
      priorBilled,
      priorOutstanding
    };
  }, [partyFilter, selectedClient, selectedBillNo, bills, purchases, allAdjustmentsCombined, openingBalances]);

  // Top search matching clients, vendors, sales bills, and purchase bills
  const handleTopSearchChange = (query) => {
    setTopSearchInput(query);
    if (!query.trim()) {
      setTopSearchResults([]);
      return;
    }

    const cleanQuery = query.toLowerCase().trim();
    const normalize = (str) => String(str || "").toLowerCase().replace(/[\s\-\/,]/g, "");
    const normQuery = normalize(cleanQuery);

    const matchedClients = clients.filter(c => {
      const name = c.name || "";
      const code = c.clientCode || "";
      return name.toLowerCase().includes(cleanQuery) || code.toLowerCase().includes(cleanQuery) || normalize(name).includes(normQuery);
    }).map(c => ({ type: "client", name: c.name, id: c.id }));

    const matchedVendors = vendors.filter(v => {
      const name = v.name || "";
      const code = v.vendorCode || "";
      return name.toLowerCase().includes(cleanQuery) || code.toLowerCase().includes(cleanQuery) || normalize(name).includes(normQuery);
    }).map(v => ({ type: "vendor", name: v.name, id: v.id }));

    const matchedBills = bills.filter(b => {
      const invoiceNo = b.invoice || b.billNo || b.id || "";
      const clientName = b.client || b.billedTo || "";
      const lrNo = b.lrNo || b.awb || b.awbNo || "";
      return invoiceNo.toLowerCase().includes(cleanQuery) || clientName.toLowerCase().includes(cleanQuery) || lrNo.toLowerCase().includes(cleanQuery) || normalize(invoiceNo).includes(normQuery);
    }).map(b => ({
      type: "bill",
      id: b.id,
      billNo: b.invoice || b.billNo || b.id,
      client: b.client || b.billedTo,
      amount: Number(b.total || b.amount) || 0,
      status: getBillStatus(b)
    }));

    const matchedPurchases = purchases.filter(p => {
      const billNo = p.billNo || p.id || "";
      const vendorName = p.vendor || "";
      return billNo.toLowerCase().includes(cleanQuery) || vendorName.toLowerCase().includes(cleanQuery) || normalize(billNo).includes(normQuery);
    }).map(p => ({
      type: "purchase",
      id: p.id,
      billNo: p.billNo || p.id,
      client: p.vendor,
      amount: Number(p.total || p.amount) || 0,
      status: p.status || "Pending"
    }));

    setTopSearchResults([...matchedClients.slice(0, 3), ...matchedVendors.slice(0, 3), ...matchedBills.slice(0, 8), ...matchedPurchases.slice(0, 8)]);
  };

  const handleSelectTopResult = (item) => {
    if (item.type === "client" || item.type === "vendor") {
      setSelectedClient(item.name);
      setSelectedBillNo("");
      setTopSearchInput(item.name);
    } else if (item.type === "bill" || item.type === "purchase") {
      setSelectedClient("");
      setSelectedBillNo(item.billNo);
      setTopSearchInput(item.billNo);
    }
    setTopSearchResults([]);
  };

  const handleClearTopFilter = () => {
    setSelectedClient("");
    setSelectedBillNo("");
    setTopSearchInput("");
    setTopSearchResults([]);
  };

  // Form Party Search handler (Clients or Vendors based on partyType)
  const handleFormClientSearchChange = (query) => {
    setFormClientSearchInput(query);
    if (!query.trim()) {
      setFormClientSearchResults([]);
      return;
    }

    const cleanQuery = query.toLowerCase().trim();
    const normalize = (str) => String(str || "").toLowerCase().replace(/[\s\-\/,]/g, "");
    const normQuery = normalize(cleanQuery);

    if (form.partyType === "Vendor") {
      const matches = vendors.filter(v => {
        const name = v.name || "";
        const code = v.vendorCode || "";
        return name.toLowerCase().includes(cleanQuery) || code.toLowerCase().includes(cleanQuery) || normalize(name).includes(normQuery);
      });
      setFormClientSearchResults(matches.slice(0, 10));
    } else {
      const matches = clients.filter(c => {
        const name = c.name || "";
        const code = c.clientCode || "";
        return name.toLowerCase().includes(cleanQuery) || code.toLowerCase().includes(cleanQuery) || normalize(name).includes(normQuery);
      });
      setFormClientSearchResults(matches.slice(0, 10));
    }
  };

  const handleSelectFormClient = (partyName) => {
    setForm(prev => ({ ...prev, client: partyName }));
    setFormClientSearchInput(partyName);
    setFormClientSearchResults([]);
  };

  // Form Bill Search handler (Sales Bills or Vendor Purchase Bills)
  const handleBillSearchChange = (query) => {
    setBillSearchInput(query);
    if (!query.trim()) {
      setBillSearchResults([]);
      return;
    }

    const cleanQuery = query.toLowerCase().trim();
    const normalize = (str) => String(str || "").toLowerCase().replace(/[\s\-\/,]/g, "");
    const normQuery = normalize(cleanQuery);

    if (form.partyType === "Vendor") {
      const matches = purchases.filter(p => {
        const bNo = p.billNo || p.id || "";
        const vName = p.vendor || "";
        return bNo.toLowerCase().includes(cleanQuery) || vName.toLowerCase().includes(cleanQuery) || normalize(bNo).includes(normQuery);
      }).map(p => ({
        id: p.id,
        billNo: p.billNo || p.id,
        client: p.vendor,
        amount: Number(p.total || p.amount) || 0,
        status: p.status || "Pending",
        isVendor: true
      }));
      setBillSearchResults(matches.slice(0, 12));
    } else {
      const matches = bills.filter(b => {
        const invoiceNo = b.invoice || b.billNo || b.id || "";
        const clientName = b.client || b.billedTo || "";
        const lrNo = b.lrNo || b.awb || b.awbNo || "";
        return invoiceNo.toLowerCase().includes(cleanQuery) || clientName.toLowerCase().includes(cleanQuery) || lrNo.toLowerCase().includes(cleanQuery) || normalize(invoiceNo).includes(normQuery);
      }).map(b => ({
        id: b.id,
        billNo: b.invoice || b.billNo || b.id,
        client: b.client || b.billedTo,
        amount: Number(b.total || b.amount) || 0,
        status: getBillStatus(b),
        isVendor: false
      }));
      setBillSearchResults(matches.slice(0, 12));
    }
  };

  // Selecting a searched bill
  const handleSelectSearchedBill = (bill) => {
    const billNumber = bill.invoice || bill.billNo || bill.id;
    const billAmt = Number(bill.total || bill.amount) || 0;
    const clientName = bill.client || bill.billedTo || "";

    setForm(prev => ({
      ...prev,
      billNo: billNumber,
      billAmount: billAmt,
      client: clientName, 
      percentage: "",
      amount: ""
    }));

    setBillSearchInput(`${billNumber} — ${clientName} (₹${billAmt.toLocaleString("en-IN")})`);
    setFormClientSearchInput(clientName); 
    setBillSearchResults([]);
  };

  const handleParticularsChange = (val) => {
    setForm(prev => ({
      ...prev,
      particulars: val
    }));
  };

  // Bidirectional calculations
  const handlePercentageChange = (e) => {
    const pct = e.target.value;
    const billAmt = form.billAmount || 0;
    let amt = "";
    if (pct && billAmt) {
      amt = ((billAmt * Number(pct)) / 100).toFixed(2);
    }
    setForm(prev => ({
      ...prev,
      percentage: pct,
      amount: amt
    }));
  };

  const handleAmountChange = (e) => {
    const amt = e.target.value;
    const billAmt = form.billAmount || 0;
    let pct = "";
    if (amt && billAmt && billAmt > 0) {
      pct = ((Number(amt) / billAmt) * 100).toFixed(2);
    }
    setForm(prev => ({
      ...prev,
      amount: amt,
      percentage: pct
    }));
  };

  const setQuickTds = () => {
    const billAmt = form.billAmount || 0;
    if (billAmt) {
      const amt = ((billAmt * 2) / 100).toFixed(2);
      setForm(prev => ({
        ...prev,
        percentage: "2",
        amount: amt
      }));
    }
  };

  const openForm = () => {
    setEditingId(null);
    if (selectedBillNo) {
      const isVendor = partyFilter === "Vendor";
      const pool = isVendor ? purchases : bills;
      const matched = pool.find(b => (b.invoice || b.billNo || b.id) === selectedBillNo);
      const bNo = matched ? (matched.invoice || matched.billNo || matched.id) : selectedBillNo;
      const bAmt = matched ? Number(matched.total || matched.amount) || 0 : 0;
      const cName = matched ? (matched.client || matched.billedTo || matched.vendor || "") : selectedClient || "";
      
      setForm({
        ...initialFormState,
        partyType: isVendor ? "Vendor" : "Client",
        billNo: bNo,
        billAmount: bAmt,
        client: cName,
        percentage: "",
        amount: ""
      });
      setBillSearchInput(`${bNo} — ${cName} (₹${bAmt.toLocaleString("en-IN")})`);
      setFormClientSearchInput(cName);
      setIsDirectPayment(false);
    } else if (selectedClient) {
      setForm({
        ...initialFormState,
        partyType: partyFilter === "Vendor" ? "Vendor" : "Client",
        client: selectedClient
      });
      setFormClientSearchInput(selectedClient);
      setIsDirectPayment(true);
    } else {
      setForm({
        ...initialFormState,
        partyType: partyFilter === "Vendor" ? "Vendor" : "Client"
      });
      setBillSearchInput("");
      setFormClientSearchInput("");
      setIsDirectPayment(false);
    }
    setShowFormModal(true);
  };

  const closeForm = () => {
    setShowFormModal(false);
    setEditingId(null);
    setForm(initialFormState);
    setBillSearchInput("");
    setBillSearchResults([]);
    setIsDirectPayment(false);
    setFormClientSearchInput("");
    setFormClientSearchResults([]);
  };

  const handleEditClick = (item) => {
    if (item.isPriorFYOpening) {
      addToast("Prior Financial Year TDS can be toggled between Claimable / Recovered directly in the table, or updated under Prior FY Balances.", "info");
      return;
    }
    setEditingId(item.id);
    const partyName = item.client || item.vendor || "";
    const isVendor = item.partyType === "Vendor" || !!item.vendor;
    
    let billAmt = 0;
    if (item.billNo) {
      const pool = isVendor ? purchases : bills;
      const matched = pool.find(b => (b.invoice || b.billNo || b.id) === item.billNo);
      if (matched) {
        billAmt = Number(matched.total || matched.amount) || 0;
        setBillSearchInput(`${item.billNo} — ${partyName} (₹${billAmt.toLocaleString("en-IN")})`);
      } else {
        setBillSearchInput(item.billNo);
      }
      setIsDirectPayment(false);
    } else {
      setIsDirectPayment(true);
      setBillSearchInput("");
    }

    setForm({
      partyType: isVendor ? "Vendor" : "Client",
      client: partyName,
      particulars: item.particulars || "tds",
      amount: String(item.amount || ""),
      percentage: item.percentage ? String(item.percentage) : "",
      date: item.date ? item.date.split("T")[0] : new Date().toISOString().split("T")[0],
      bankname: item.bankname || item.bankName || "",
      billNo: item.billNo || "",
      billAmount: billAmt,
      tdsStatus: item.tdsStatus || "pending"
    });
    setFormClientSearchInput(partyName);
    setShowFormModal(true);
  };

  // Toggle TDS status (Received / Pending) - Works for regular adjustments & prior year opening TDS
  const handleToggleTdsStatus = async (item) => {
    try {
      const newStatus = item.tdsStatus === "received" ? "pending" : "received";
      
      if (item.isPriorFYOpening && item.openingBalanceId) {
        const res = await axios.put(`${API}/opening-balances/${item.openingBalanceId}`, {
          tdsStatus: newStatus
        });
        if (res.data.success) {
          addToast(`Prior Year TDS marked as ${newStatus === "received" ? "Recovered / Received" : "Claimable / Pending"}`, "success");
          fetchInitialData();
        }
      } else {
        const payload = {
          ...item,
          tdsStatus: newStatus
        };
        delete payload.id;
        
        const res = await axios.put(`${API}/outstanding/${item.id}`, payload);
        if (res.data.success) {
          addToast(`TDS marked as ${newStatus === "received" ? "Recovered / Received" : "Claimable / Pending"}`, "success");
          fetchInitialData();
        }
      }
    } catch (error) {
      console.error("Toggle TDS status error", error);
      addToast("Failed to update TDS status", "error");
    }
  };

  // Handle Save (Create / Update)
  const handleSave = async (e) => {
    e.preventDefault();
    const clientName = form.client || selectedClient;
    if (!clientName) {
      addToast("Please select a client or search and link a bill", "error");
      return;
    }
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) {
      addToast("Please enter a valid amount", "error");
      return;
    }

    setSubmitLoading(true);
    const normalizedParticulars = String(form.particulars || "tds").toLowerCase().trim();
    const isVendorParty = String(form.partyType || "Client").toLowerCase() === "vendor";
    const payload = {
      partyType: isVendorParty ? "Vendor" : "Client",
      partyName: clientName,
      client: isVendorParty ? "" : clientName,
      vendor: isVendorParty ? clientName : "",
      particulars: normalizedParticulars,
      amount: Number(form.amount),
      date: form.date,
      bankname: form.bankname || "",
      billNo: form.billNo || "",
      percentage: form.percentage ? Number(form.percentage) : "",
      tdsStatus: normalizedParticulars === "tds" ? (form.tdsStatus || "pending") : ""
    };

    try {
      if (editingId) {
        // Update entry
        const res = await axios.put(`${API}/outstanding/${editingId}`, payload);
        if (res.data.success) {
          addToast("Adjustment updated successfully", "success");
          fetchInitialData();
          closeForm();
        }
      } else {
        // Create entry
        const res = await axios.post(`${API}/outstanding`, payload);
        if (res.data.success) {
          addToast("Adjustment recorded successfully", "success");
          sessionStorage.removeItem("draft_tds_form");
          setForm(initialFormState);
          fetchInitialData();
          closeForm();
        }
      }
    } catch (error) {
      console.error("Save error", error);
      addToast("Failed to save entry", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete Adjustment
  const handleDelete = async (idOrItem) => {
    const item = typeof idOrItem === "object" ? idOrItem : filteredAdjustments.find(e => e.id === idOrItem);
    const isPrior = item?.isPriorFYOpening;

    const isConfirmed = await confirm({
      title: isPrior ? "Clear Prior Year TDS" : "Delete Entry",
      message: isPrior
        ? "Are you sure you want to clear this Prior Financial Year TDS record from opening balances?"
        : "Are you sure you want to delete this adjustment entry? This will modify the net outstanding calculation.",
      confirmText: isPrior ? "Clear TDS" : "Delete",
      cancelText: "Cancel"
    });
    
    if (!isConfirmed) return;

    try {
      if (isPrior && item?.openingBalanceId) {
        await axios.put(`${API}/opening-balances/${item.openingBalanceId}`, {
          totalTdsPrior: 0
        });
        addToast("Prior Year TDS cleared successfully", "success");
        fetchInitialData();
      } else {
        const targetId = typeof idOrItem === "object" ? idOrItem.id : idOrItem;
        const res = await axios.delete(`${API}/outstanding/${targetId}`);
        if (res.data.success) {
          addToast("Entry deleted successfully", "success");
          fetchInitialData();
        }
      }
    } catch (error) {
      console.error("Delete error", error);
      addToast("Failed to delete entry", "error");
    }
  };

  // Export entries to CSV
  const handleExport = () => {
    if (filteredAdjustments.length === 0) {
      addToast("No data to export", "warning");
      return;
    }

    const csvData = filteredAdjustments.map(e => ({
      date: e.date ? e.date.split("T")[0] : "",
      particulars: e.particulars,
      amount: e.amount,
      client: e.client,
      bankname: e.bankname || e.bankName || "",
      billNo: e.billNo || "",
      percentage: e.percentage || "",
      tdsStatus: e.particulars === "tds" ? (e.tdsStatus || "pending") : ""
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const filename = selectedClient 
      ? `Outstanding_Adjustments_${selectedClient.replace(/\s+/g, "_")}.csv`
      : "All_Outstanding_Adjustments.csv";
    
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Exported successfully", "success");
  };

  // CSV Line parsing helper
  const parseCSVLine = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ""));
    return result;
  };

  // Import entries from CSV bulk
  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        addToast("CSV is empty or missing headers", "error");
        setIsImporting(false);
        return;
      }

      // Detect headers
      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
      const dateIdx = headers.indexOf("date");
      const partIdx = headers.indexOf("particulars");
      const amtIdx = headers.indexOf("amount");
      const clientIdx = headers.indexOf("client");
      const bankIdx = headers.indexOf("bankname");
      const tdsStatusIdx = headers.indexOf("tdsstatus");

      if (dateIdx === -1 || partIdx === -1 || amtIdx === -1 || clientIdx === -1) {
        addToast("CSV must contain 'date', 'particulars', 'amount', and 'client' columns", "error");
        setIsImporting(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      // Import records sequentially
      for (let i = 1; i < lines.length; i++) {
        const rowValues = parseCSVLine(lines[i]);
        if (rowValues.length < 4) continue;

        const date = rowValues[dateIdx];
        const particulars = rowValues[partIdx]?.toLowerCase().trim();
        const amountStr = rowValues[amtIdx];
        const clientVal = rowValues[clientIdx];
        const banknameVal = bankIdx !== -1 ? rowValues[bankIdx] : "";
        const tdsStatusVal = (tdsStatusIdx !== -1 && rowValues[tdsStatusIdx]) 
          ? rowValues[tdsStatusIdx].toLowerCase().trim() 
          : "pending";

        // Basic validate
        if (!clientVal || !particulars || !amountStr || isNaN(amountStr)) {
          failCount++;
          continue;
        }

        const validParticulars = ["tds", "debit", "bank", "cash"].includes(particulars) 
          ? particulars 
          : particulars === "debt" ? "debit" : "bank"; // fallback

        const payload = {
          client: clientVal,
          particulars: validParticulars,
          amount: Number(amountStr),
          date: date || new Date().toISOString().split("T")[0],
          bankname: banknameVal || "",
          tdsStatus: validParticulars === "tds" ? tdsStatusVal : ""
        };

        try {
          await axios.post(`${API}/outstanding`, payload);
          successCount++;
        } catch (err) {
          console.error("Bulk save error row " + i, err);
          failCount++;
        }
      }

      addToast(`Import Completed: ${successCount} successful, ${failCount} failed`, "success");
      fetchInitialData();
      setIsImporting(false);
    };

    reader.readAsText(file);
    event.target.value = null; // reset input
  };

  return (
    <div style={{ padding: "0 clamp(0.5rem, 2vw, 1.5rem)", width: "100%", boxSizing: "border-box" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "clamp(1.25rem, 3vw, 1.8rem)", color: "#1e293b", fontWeight: "700", margin: "0 0 0.25rem 0" }}>
            TDS & Debt Adjustment Management
          </h2>
          <p style={{ color: "#64748b", fontSize: "clamp(0.75rem, 2vw, 0.9rem)", margin: 0 }}>
            Manage tax deductions, client bad debts, and adjust ledger outstanding balances.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* CSV Import */}
          <label className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", padding: "0.5rem 0.85rem", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: isImporting ? "not-allowed" : "pointer", fontWeight: "600", backgroundColor: "#fff", color: "#334155" }}>
            <Upload size={15} />
            {isImporting ? "Importing..." : "Import CSV"}
            <input type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportCSV} disabled={isImporting} />
          </label>

          {/* Export */}
          <button onClick={handleExport} className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", padding: "0.5rem 0.85rem", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "600", backgroundColor: "#fff", color: "#334155" }}>
            <Download size={15} /> Export
          </button>

          {/* Opening Balances */}
          <button onClick={() => navigate("/opening-outstanding")} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", padding: "0.5rem 0.95rem", background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", border: "none", color: "white", borderRadius: "6px", cursor: "pointer", fontWeight: "600", boxShadow: "0 2px 4px rgba(2, 132, 199, 0.25)" }}>
            <Calendar size={15} /> Prior FY Balances
          </button>

          {/* Recalculate & Sync All */}
          <button onClick={handleRecalculateAll} disabled={recalculating} className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", padding: "0.5rem 0.85rem", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: recalculating ? "not-allowed" : "pointer", fontWeight: "600", backgroundColor: "#fff", color: "#334155" }}>
            <RefreshCw size={15} className={recalculating ? "spin" : ""} style={{ animation: recalculating ? "spin 1s linear infinite" : "none" }} /> {recalculating ? "Recalculating..." : "Recalculate & Sync"}
          </button>

          {/* New Record */}
          <button onClick={openForm} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", padding: "0.5rem 1.15rem", background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", border: "none", color: "white", borderRadius: "6px", cursor: "pointer", fontWeight: "600", boxShadow: "0 2px 4px rgba(79, 70, 229, 0.25)" }}>
            <Plus size={16} /> Add Adjustment
          </button>
        </div>
      </div>

      {/* View Mode Tabs: All | Clients (Sales) | Vendors (Purchases) */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "2px solid #e2e8f0", paddingBottom: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={() => { setPartyFilter("All"); setSelectedClient(""); setSelectedBillNo(""); }}
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
            backgroundColor: partyFilter === "All" ? "#1e293b" : "transparent",
            color: partyFilter === "All" ? "#ffffff" : "#64748b",
            boxShadow: partyFilter === "All" ? "0 2px 4px rgba(0,0,0,0.15)" : "none",
            transition: "all 0.2s ease"
          }}
        >
          👥 All Adjustments
          <span style={{ fontSize: "0.75rem", padding: "1px 7px", borderRadius: "10px", backgroundColor: partyFilter === "All" ? "rgba(255,255,255,0.2)" : "#e2e8f0", color: partyFilter === "All" ? "#fff" : "#475569", fontWeight: "800" }}>
            {adjustments.length}
          </span>
        </button>

        <button
          onClick={() => { setPartyFilter("Client"); setSelectedClient(""); setSelectedBillNo(""); }}
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
            backgroundColor: partyFilter === "Client" ? "#2563eb" : "transparent",
            color: partyFilter === "Client" ? "#ffffff" : "#64748b",
            boxShadow: partyFilter === "Client" ? "0 2px 4px rgba(37,99,235,0.25)" : "none",
            transition: "all 0.2s ease"
          }}
        >
          👤 Client TDS & Debt (Sales)
          <span style={{ fontSize: "0.75rem", padding: "1px 7px", borderRadius: "10px", backgroundColor: partyFilter === "Client" ? "rgba(255,255,255,0.2)" : "#dbeafe", color: partyFilter === "Client" ? "#fff" : "#1d4ed8", fontWeight: "800" }}>
            {adjustments.filter(a => a.partyType !== "Vendor" && !a.vendor).length}
          </span>
        </button>

        <button
          onClick={() => { setPartyFilter("Vendor"); setSelectedClient(""); setSelectedBillNo(""); }}
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
            backgroundColor: partyFilter === "Vendor" ? "#7c3aed" : "transparent",
            color: partyFilter === "Vendor" ? "#ffffff" : "#64748b",
            boxShadow: partyFilter === "Vendor" ? "0 2px 4px rgba(124,58,237,0.25)" : "none",
            transition: "all 0.2s ease"
          }}
        >
          🏢 Vendor TDS & Deductions (Purchases)
          <span style={{ fontSize: "0.75rem", padding: "1px 7px", borderRadius: "10px", backgroundColor: partyFilter === "Vendor" ? "rgba(255,255,255,0.2)" : "#ede9fe", color: partyFilter === "Vendor" ? "#fff" : "#6d28d9", fontWeight: "800" }}>
            {adjustments.filter(a => a.partyType === "Vendor" || !!a.vendor).length}
          </span>
        </button>
      </div>

      {/* Selector and Filter Panel */}
      <div className="glass-panel" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", borderRadius: "12px", border: "1px solid #e2e8f0", position: "relative", zIndex: 10, overflow: "visible" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", alignItems: "end" }}>
          
          {/* Unified Top Search Filter */}
          <div style={{ position: "relative" }}>
            <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem", display: "block" }}>
              SEARCH CLIENT / VENDOR / BILL NO
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search Client, Vendor, Sales/Purchase Bill..."
                value={topSearchInput}
                onChange={(e) => handleTopSearchChange(e.target.value)}
                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              />
              {topSearchInput && (
                <button 
                  type="button" 
                  onClick={() => { setTopSearchInput(""); setSelectedClient(""); setSelectedBillNo(""); setTopSearchResults([]); }}
                  style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Top Autocomplete Dropdown */}
            {topSearchResults.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.15)", maxHeight: "250px", overflowY: "auto", zIndex: 9999 }}>
                {topSearchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectTopResult(item)}
                    style={{ padding: "0.6rem 0.8rem", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: "0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#ffffff"}
                  >
                    <div>
                      <strong style={{ color: "#1e293b" }}>{item.type === "client" ? `👤 ${item.name}` : (item.type === "vendor" ? `🏢 ${item.name}` : `📄 ${item.billNo}`)}</strong>
                      {(item.type === "bill" || item.type === "purchase") && <span style={{ color: "#64748b", marginLeft: "6px", fontSize: "0.75rem" }}>({item.client})</span>}
                    </div>
                    <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: item.type === "client" ? "#eff6ff" : (item.type === "vendor" ? "#f5f3ff" : (item.type === "purchase" ? "#fef3c7" : "#ecfdf5")), color: item.type === "client" ? "#2563eb" : (item.type === "vendor" ? "#7c3aed" : (item.type === "purchase" ? "#b45309" : "#059669")), fontWeight: "700" }}>
                      {item.type.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "#475569", marginBottom: "0.5rem", display: "block" }}>
              FILTER TYPE
            </label>
            <select
              value={particularsFilter}
              onChange={(e) => setParticularsFilter(e.target.value)}
              className="form-control"
              style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
            >
              <option value="All">All Adjustments</option>
              <option value="tds">TDS Deductions</option>
              <option value="debit">Bill Corrections (DEBT)</option>
            </select>
          </div>
          <div style={{ position: "relative" }}>
            <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "#475569", marginBottom: "0.5rem", display: "block" }}>
              SEARCH LOGS
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search bill, bank..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "0.5rem 0.5rem 0.5rem 2rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              />
              <Search size={14} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Purpose-Focused TDS & Adjustment Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        
        {/* 1. Total TDS Deducted */}
        <div style={{ padding: "1.1rem 1.25rem", borderRadius: "10px", background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)", border: "1px solid #bfdbfe", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#1e3a8a", textTransform: "uppercase" }}>
                {partyFilter === "Vendor" ? "Total Vendor TDS" : (partyFilter === "Client" ? "Total Client TDS" : "Total TDS Deducted")}
              </span>
              <Percent size={16} style={{ color: "#1e3a8a" }} />
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "#1e3a8a", margin: "0.5rem 0" }}>
              ₹{metrics.totalTds.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <span style={{ fontSize: "0.72rem", color: "#3b82f6", fontWeight: "600" }}>
            Total tax deductions recorded
          </span>
        </div>

        {/* 2. Claimable / Pending TDS */}
        <div style={{ padding: "1.1rem 1.25rem", borderRadius: "10px", background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", border: "1px solid #fde68a", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#92400e", textTransform: "uppercase" }}>
                Claimable / Pending TDS
              </span>
              <Clock size={16} style={{ color: "#b45309" }} />
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "#b45309", margin: "0.5rem 0" }}>
              ₹{metrics.totalTdsPend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <span style={{ fontSize: "0.72rem", color: "#b45309", fontWeight: "600" }}>
            To be claimed in Form 26AS / Pending
          </span>
        </div>

        {/* 3. Recovered / Received TDS */}
        <div style={{ padding: "1.1rem 1.25rem", borderRadius: "10px", background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "1px solid #bbf7d0", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#14532d", textTransform: "uppercase" }}>
                Recovered / Received TDS
              </span>
              <CheckCircle size={16} style={{ color: "#15803d" }} />
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "#15803d", margin: "0.5rem 0" }}>
              ₹{metrics.totalTdsRec.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <span style={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: "600" }}>
            Verified, received & reconciled
          </span>
        </div>

        {/* 4. Bad Debt & Corrections */}
        <div style={{ padding: "1.1rem 1.25rem", borderRadius: "10px", background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)", border: "1px solid #fecdd3", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#881337", textTransform: "uppercase" }}>
                {partyFilter === "Vendor" ? "Vendor Debit Notes" : "Bad Debt & Corrections"}
              </span>
              <TrendingDown size={16} style={{ color: "#9f1239" }} />
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "#9f1239", margin: "0.5rem 0" }}>
              ₹{metrics.totalDebt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <span style={{ fontSize: "0.72rem", color: "#e11d48", fontWeight: "600" }}>
            Written-off deductions / penalty losses
          </span>
        </div>

      </div>

      {/* Optional Selected Party Context Banner */}
      {(selectedClient || selectedBillNo) && (
        <div style={{ marginBottom: "1.25rem", padding: "0.75rem 1rem", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.9rem" }}>
              Filtered for: {selectedClient ? `👤 ${selectedClient}` : `📄 ${selectedBillNo}`}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.85rem" }}>
            <span style={{ color: "#475569" }}>
              Net Ledger Due: <strong style={{ color: metrics.outstanding > 0 ? "#dc2626" : "#16a34a" }}>₹{metrics.outstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
            </span>
            <button 
              onClick={() => { setSelectedClient(""); setSelectedBillNo(""); setTopSearchInput(""); }}
              style={{ background: "#e2e8f0", border: "none", borderRadius: "4px", padding: "2px 8px", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600", color: "#334155" }}
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div style={{ marginBottom: "2rem" }}>
        <Table
          headers={["Date", "Party / Name", "Particulars", "Linked Bill No.", "Amount", "Status", "Bank Details", "Actions"]}
          data={filteredAdjustments}
          loading={loading}
          pagination={true}
          defaultEntries={15}
          renderRow={(item) => {
            const part = String(item.particulars || "").toLowerCase().trim();
            const isTds = part === "tds";
            const isDebit = part === "debit" || part === "debt";
            const isBank = part === "bank";
            const isCash = part === "cash";
            const isTdsReceived = isTds && String(item.tdsStatus || "").toLowerCase().trim() === "received";
            const isVendor = String(item.partyType || "").toLowerCase() === "vendor";

            return (
              <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                {/* Date */}
                <td style={{ padding: "12px 16px", color: "#475569", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                  {item.date ? new Date(item.date).toLocaleDateString("en-IN") : "-"}
                </td>
                
                {/* Party Name */}
                <td style={{ padding: "12px 16px", fontWeight: "600", color: "#1e293b", fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ 
                      fontSize: "0.65rem", 
                      padding: "2px 6px", 
                      borderRadius: "4px", 
                      fontWeight: "700",
                      backgroundColor: isVendor ? "#f5f3ff" : "#eff6ff", 
                      color: isVendor ? "#7c3aed" : "#2563eb" 
                    }}>
                      {isVendor ? "VENDOR" : "CLIENT"}
                    </span>
                    <span>{item.client || item.vendor}</span>
                  </div>
                </td>
                
                {/* Particulars badge */}
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ 
                    padding: "4px 8px", 
                    borderRadius: "4px", 
                    fontSize: "0.75rem", 
                    fontWeight: "700", 
                    textTransform: "uppercase",
                    backgroundColor: 
                      isBank ? "#dcfce7" :
                      isCash ? "#f0fdf4" :
                      isTds ? "#fef3c7" : 
                      isDebit ? "#fee2e2" : "#f1f5f9",
                    color: 
                      isBank ? "#15803d" :
                      isCash ? "#166534" :
                      isTds ? "#b45309" : 
                      isDebit ? "#b91c1c" : "#475569"
                  }}>
                    {isBank ? "Bank Payment" : 
                     isCash ? "Cash Payment" : 
                     isTds ? "TDS Deducted" : 
                     isDebit ? "Bill Correction (DEBT)" : item.particulars}
                  </span>
                </td>
                
                {/* Linked Bill */}
                <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "0.85rem", fontFamily: "monospace", fontWeight: "bold" }}>
                  {item.isPriorFYOpening ? (
                    <span style={{ 
                      display: "inline-flex", 
                      alignItems: "center", 
                      gap: "4px", 
                      padding: "3px 8px", 
                      borderRadius: "6px", 
                      fontSize: "0.75rem", 
                      fontWeight: "700", 
                      backgroundColor: "#f3e8ff", 
                      color: "#7e22ce", 
                      border: "1px solid #d8b4fe" 
                    }}>
                      🏛️ Prior FY ({item.financialYear || "Opening"})
                    </span>
                  ) : item.billNo ? (
                    <span style={{ display: "flex", flexDirection: "column" }}>
                      <span>{item.billNo}</span>
                      {item.percentage && (
                        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>({item.percentage}% of bill)</span>
                      )}
                    </span>
                  ) : "-"}
                </td>
                
                {/* Amount */}
                <td style={{ padding: "12px 16px", fontWeight: "700", color: "#0f172a", fontSize: "0.85rem" }}>
                  ₹{Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>

                {/* Status */}
                <td style={{ padding: "12px 16px" }}>
                  {isTds ? (
                    <span style={{
                      padding: "2px 6px",
                      borderRadius: "12px",
                      fontSize: "0.7rem",
                      fontWeight: "600",
                      backgroundColor: isTdsReceived ? "#dcfce7" : "#fef3c7",
                      color: isTdsReceived ? "#166534" : "#d97706",
                      border: `1px solid ${isTdsReceived ? "#bbf7d0" : "#fde68a"}`
                    }}>
                      {isTdsReceived ? "Recovered" : "Claimable"}
                    </span>
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>N/A</span>
                  )}
                </td>
                
                {/* Bank Name */}
                <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "0.85rem" }}>
                  {item.bankname || item.bankName || "-"}
                </td>
                
                {/* Actions */}
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    {isTds && (
                      <button
                        onClick={() => handleToggleTdsStatus(item)}
                        style={{ 
                          background: isTdsReceived ? "#f1f5f9" : "#dcfce7", 
                          border: `1px solid ${isTdsReceived ? "#cbd5e1" : "#bbf7d0"}`, 
                          cursor: "pointer", 
                          color: isTdsReceived ? "#475569" : "#166534", 
                          padding: "2px 6px", 
                          borderRadius: "4px",
                          fontSize: "0.7rem",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px"
                        }}
                        title={isTdsReceived ? "Revert to Claimable" : "Mark as Recovered/Received"}
                      >
                        <Check size={12} />
                        <span>{isTdsReceived ? "Undo" : "Receive"}</span>
                      </button>
                    )}
                    <button 
                      onClick={() => handleEditClick(item)} 
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#6366f1", padding: 0 }}
                      title="Edit Entry"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(item)} 
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 0 }}
                      title="Delete Entry"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          }}
        />
      </div>

      {/* Add / Edit Form Modal Rendered directly to document.body */}
      {showFormModal && typeof document !== "undefined" && createPortal(
        <div 
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}
        >
          <div className="modal-dialog-card">
            
            {/* Modal Header */}
            <div className="modal-header-section">
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: "1.15rem", color: "#0f172a", fontWeight: "700", margin: 0, lineHeight: "1.3" }}>
                  {editingId ? "Edit Adjustment Entry" : "Create Outstanding Adjustment"}
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.75rem", margin: "2px 0 0 0", lineHeight: "1.3" }}>
                  Record TDS deduction or Bill Correction (DEBT) for client ledger.
                </p>
              </div>
              <button 
                type="button"
                onClick={closeForm} 
                style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form (Scrollable body + Fixed Footer) */}
            <form onSubmit={handleSave} className="modal-form-container">
              <div className="modal-body-section">
                
                {/* Party Type Selector (Client vs Vendor) */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "700", color: "#1e293b", marginBottom: "0.4rem", display: "block" }}>
                    SELECT PARTY TYPE *
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, partyType: "Client", client: "", billNo: "", billAmount: 0 }));
                        setBillSearchInput("");
                        setBillSearchResults([]);
                        setFormClientSearchInput("");
                        setFormClientSearchResults([]);
                      }}
                      style={{
                        padding: "0.6rem 0.5rem",
                        borderRadius: "8px",
                        border: (form.partyType || "Client") === "Client" ? "2px solid #3b82f6" : "1px solid #cbd5e1",
                        backgroundColor: (form.partyType || "Client") === "Client" ? "#eff6ff" : "#ffffff",
                        color: (form.partyType || "Client") === "Client" ? "#1d4ed8" : "#475569",
                        fontWeight: "700",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px"
                      }}
                    >
                      👤 Client (Sales)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, partyType: "Vendor", client: "", billNo: "", billAmount: 0 }));
                        setBillSearchInput("");
                        setBillSearchResults([]);
                        setFormClientSearchInput("");
                        setFormClientSearchResults([]);
                      }}
                      style={{
                        padding: "0.6rem 0.5rem",
                        borderRadius: "8px",
                        border: form.partyType === "Vendor" ? "2px solid #8b5cf6" : "1px solid #cbd5e1",
                        backgroundColor: form.partyType === "Vendor" ? "#f5f3ff" : "#ffffff",
                        color: form.partyType === "Vendor" ? "#6d28d9" : "#475569",
                        fontWeight: "700",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px"
                      }}
                    >
                      🏢 Vendor (Purchase)
                    </button>
                  </div>
                </div>

                {/* Top Adjustment Type Selector (Exclusively TDS vs DEBT) */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "700", color: "#1e293b", marginBottom: "0.4rem", display: "block" }}>
                    SELECT ADJUSTMENT TYPE *
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <button
                      type="button"
                      onClick={() => handleParticularsChange("tds")}
                      style={{
                        padding: "0.6rem 0.5rem",
                        borderRadius: "8px",
                        border: form.particulars === "tds" ? "2px solid #d97706" : "1px solid #cbd5e1",
                        backgroundColor: form.particulars === "tds" ? "#fef3c7" : "#ffffff",
                        color: form.particulars === "tds" ? "#92400e" : "#475569",
                        fontWeight: "700",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        boxShadow: form.particulars === "tds" ? "0 2px 4px rgba(217, 119, 6, 0.2)" : "none"
                      }}
                    >
                      🛡️ TDS Deducted
                    </button>
                    <button
                      type="button"
                      onClick={() => handleParticularsChange("debit")}
                      style={{
                        padding: "0.6rem 0.5rem",
                        borderRadius: "8px",
                        border: form.particulars === "debit" ? "2px solid #e11d48" : "1px solid #cbd5e1",
                        backgroundColor: form.particulars === "debit" ? "#ffe4e6" : "#ffffff",
                        color: form.particulars === "debit" ? "#9f1239" : "#475569",
                        fontWeight: "700",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        boxShadow: form.particulars === "debit" ? "0 2px 4px rgba(225, 29, 72, 0.2)" : "none"
                      }}
                    >
                      📉 Bill Correction (DEBT)
                    </button>
                  </div>
                </div>

                {/* Toggle Direct payment vs Link with bill */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input 
                    type="checkbox"
                    id="isDirectPaymentCheckbox"
                    checked={isDirectPayment}
                    onChange={(e) => {
                      setIsDirectPayment(e.target.checked);
                      setForm(prev => ({ ...prev, billNo: "", billAmount: 0, client: "" }));
                      setBillSearchInput("");
                      setBillSearchResults([]);
                      setFormClientSearchInput("");
                      setFormClientSearchResults([]);
                    }}
                    style={{ cursor: "pointer" }}
                  />
                  <label htmlFor="isDirectPaymentCheckbox" style={{ fontSize: "0.8rem", fontWeight: "600", color: "#475569", cursor: "pointer" }}>
                    Direct Adjustment (No linked bill)
                  </label>
                </div>

                {/* Linked Bill Selection using Autocomplete search input */}
                {!isDirectPayment && (
                  <div className="form-group" style={{ position: "relative", padding: "0.75rem", borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem", display: "block" }}>
                      SEARCH & LINK BILL (BY BILL NO, CLIENT, AWB, ROUTE)
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Type Bill No, Client, AWB or Route to search..."
                        value={billSearchInput}
                        onChange={(e) => handleBillSearchChange(e.target.value)}
                        style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                      />
                      {billSearchInput && (
                        <button 
                          type="button" 
                          onClick={() => { setBillSearchInput(""); setForm(prev => ({ ...prev, billNo: "", billAmount: 0, client: "" })); setBillSearchResults([]); }}
                          style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    {/* Search dropdown suggestions list overlay */}
                    {billSearchResults.length > 0 && (
                      <div style={{ 
                        position: "absolute", 
                        top: "100%", 
                        left: 0, 
                        right: 0, 
                        backgroundColor: "#ffffff", 
                        border: "1px solid #cbd5e1", 
                        borderRadius: "8px", 
                        maxHeight: "180px", 
                        overflowY: "auto", 
                        zIndex: 1050, 
                        boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
                        marginTop: "4px"
                      }}>
                        {billSearchResults.map((b) => {
                          const bNo = b.invoice || b.billNo || b.id;
                          const cName = b.client || b.billedTo;
                          const bAmt = Number(b.total || b.amount) || 0;
                          const routeStr = b.origin && b.destination ? `${b.origin} ➔ ${b.destination}` : "";
                          const awbStr = b.lrNo || b.awb || "";
                          const status = getBillStatus(b);

                          return (
                            <div 
                              key={b.id}
                              onClick={() => handleSelectSearchedBill(b)}
                              style={{ 
                                padding: "0.5rem 0.75rem", 
                                borderBottom: "1px solid #f1f5f9", 
                                cursor: "pointer", 
                                fontSize: "0.75rem"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", color: "#1e293b", marginBottom: "2px" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span>{bNo}</span>
                                  <span style={{ 
                                    padding: "1px 6px", 
                                    borderRadius: "10px", 
                                    fontSize: "0.6rem", 
                                    fontWeight: "800",
                                    backgroundColor: 
                                      status === "Paid" ? "#dcfce7" :
                                      status === "Unpaid" ? "#fee2e2" :
                                      status === "Cancelled" ? "#f1f5f9" : "#fef3c7",
                                    color: 
                                      status === "Paid" ? "#15803d" :
                                      status === "Unpaid" ? "#b91c1c" :
                                      status === "Cancelled" ? "#475569" : "#b45309"
                                  }}>
                                    {status}
                                  </span>
                                </span>
                                <span style={{ color: "#10b981" }}>₹{bAmt.toLocaleString("en-IN")}</span>
                              </div>
                              <div style={{ color: "#475569", display: "flex", justifyContent: "space-between" }}>
                                <span>{cName}</span>
                                <span style={{ color: "#64748b" }}>
                                  {routeStr} {awbStr ? `(AWB: ${awbStr})` : ""}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Calculations area when Bill is linked and TDS or DEBT is selected */}
                    {form.billNo && (form.particulars === "tds" || form.particulars === "debit") && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.75rem" }}>
                        <div>
                          <label style={{ fontSize: "0.7rem", fontWeight: "700", color: "#64748b" }}>PERCENTAGE (%)</label>
                          <div style={{ display: "flex", gap: "4px" }}>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control"
                              placeholder="e.g. 2"
                              value={form.percentage}
                              onChange={handlePercentageChange}
                              style={{ width: "100%", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                            />
                            {form.particulars === "tds" && (
                              <button
                                type="button"
                                onClick={setQuickTds}
                                style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                              >
                                2%
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: "0.7rem", fontWeight: "700", color: "#64748b" }}>AMOUNT (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            placeholder="Amount"
                            value={form.amount}
                            onChange={handleAmountChange}
                            style={{ width: "100%", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Client Selection Autocomplete Search Input */}
                <div className="form-group" style={{ position: "relative" }}>
                  <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem", display: "block" }}>
                    CLIENT NAME *
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search client name..."
                      value={formClientSearchInput}
                      onChange={(e) => handleFormClientSearchChange(e.target.value)}
                      disabled={!!selectedClient || !isDirectPayment}
                      required
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                    />
                    {formClientSearchInput && isDirectPayment && !selectedClient && (
                      <button 
                        type="button" 
                        onClick={() => { setFormClientSearchInput(""); setForm(prev => ({ ...prev, client: "" })); setFormClientSearchResults([]); }}
                        style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* Form client suggestion autocomplete list */}
                  {formClientSearchResults.length > 0 && (
                    <div style={{ 
                      position: "absolute", 
                      top: "100%", 
                      left: 0, 
                      right: 0, 
                      backgroundColor: "#ffffff", 
                      border: "1px solid #cbd5e1", 
                      borderRadius: "8px", 
                      maxHeight: "180px", 
                      overflowY: "auto", 
                      zIndex: 1050, 
                      boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
                      marginTop: "4px"
                    }}>
                      {formClientSearchResults.map(c => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectFormClient(c.name)}
                          style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: "0.8rem", color: "#1e293b", fontWeight: "500" }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        >
                          {c.name} {c.clientCode ? `(${c.clientCode})` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct Amount input (shown if no bill selected or for Cash/Bank payments) */}
                {(isDirectPayment || (form.particulars !== "tds" && form.particulars !== "debit")) && (
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem", display: "block" }}>
                      AMOUNT (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      required
                      placeholder="Enter Amount in Rupees"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                )}

                {/* TDS Status Dropdown (Shown only if type is TDS) */}
                {form.particulars === "tds" && (
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem", display: "block" }}>
                      TDS RECEIVAL STATUS
                    </label>
                    <select
                      value={form.tdsStatus}
                      onChange={(e) => setForm({ ...form, tdsStatus: e.target.value })}
                      className="form-control"
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                    >
                      <option value="pending">Pending Recovery (Claimable from Govt)</option>
                      <option value="received">Received / Recovered (Settled)</option>
                    </select>
                  </div>
                )}

                {/* Date */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.4rem", display: "block" }}>
                    DATE *
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  />
                </div>
              </div>

              {/* Modal Sticky Footer (Always Visible at bottom of dialog!) */}
              <div className="modal-footer-section">
                <button
                  type="button"
                  onClick={closeForm}
                  style={{ padding: "0.45rem 1rem", borderRadius: "8px", border: "1px solid #cbd5e1", cursor: "pointer", backgroundColor: "#fff", color: "#475569", fontWeight: "600", fontSize: "0.85rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  style={{ padding: "0.45rem 1.5rem", borderRadius: "8px", border: "none", cursor: submitLoading ? "not-allowed" : "pointer", background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "white", fontWeight: "600", fontSize: "0.85rem", boxShadow: "0 2px 4px rgba(29, 78, 216, 0.25)" }}
                >
                  {submitLoading ? "Saving..." : (editingId ? "Update Entry" : "Save Adjustment")}
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

export default TdsDebtManagement;
