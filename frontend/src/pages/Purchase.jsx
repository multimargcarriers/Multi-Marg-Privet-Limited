import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Table from "../components/Table";
import { 
  Plus, 
  FileText, 

  Trash2, Edit3, 
  Eye, 
  X,
  Calendar, 
  RefreshCw,
  ExternalLink,
  Camera,
  Image as ImageIcon,
  ShoppingCart,
  Receipt,
  FileSpreadsheet,
  DollarSign, Search, Filter, Clock
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { BadgeContext } from "../context/BadgeContext";
import { useSocketSync } from "../hooks/useSocketSync";
import { useSync } from "../context/SyncContext";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate, formatAmount, getSafeCloudinaryPdfUrl } from '../utils/formatters';
import PODImageStudioModal from "../components/pod/PODImageStudioModal";
import RupeeIcon from '../components/RupeeIcon';
import CreatableDropdown from "../components/CreatableDropdown";
import QuickAddModal from "../components/QuickAddModal";
import StatsPanel from "../components/StatsPanel";
import SortDropdown from "../components/SortDropdown";
import useTableSort from "../hooks/useTableSort";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const Purchase = () => {
  const { user } = useContext(AuthContext);
  const { syncQueue } = useSync();
  const { clearBadge } = useContext(BadgeContext);
  const { confirm, alert: alertDialog } = useDialog();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimarg.com' || user?.role === 'admin';

  // Data states
  const [purchases, setPurchases] = useState([]);
  const [vendors, setVendors] = useState([]);
  
  // Filter States
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [minPending, setMinPending] = useState("");
  const [maxPending, setMaxPending] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  // Pay Bill State
  const [payBillOpen, setPayBillOpen] = useState(false);
  const [payBillData, setPayBillData] = useState(null);
  const [payingBill, setPayingBill] = useState(false);

  // Modal / Add Form states
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // { name, type, dataUrl }
  
  // QuickAdd Modal State for Vendors
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [modalInitialName, setModalInitialName] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    vendor: "",
    billNo: "",
    date: new Date().toISOString().slice(0, 10),
    taxable: "",
    gstSlab: "0",
    gst: "",
    total: ""
  });

  // Box Image Studio Modal state
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioMode, setStudioMode] = useState("camera"); // 'camera' | 'editor'
  const [studioInitialSrc, setStudioInitialSrc] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
    clearBadge("purchases");
  }, []);

  const fetchData = async () => {
    if (purchases.length === 0) setLoading(true);
    try {
      const [vendorsRes, purchasesRes] = await Promise.all([
        axios.get(`${API}/vendors`),
        axios.get(`${API}/purchases`)
      ]);
      if (vendorsRes.data.success) setVendors(vendorsRes.data.data || []);
      if (purchasesRes.data.success) setPurchases(purchasesRes.data.data || []);
    } catch (err) { 
      console.error("Fetch purchase data error", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useSocketSync("purchases", fetchData);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Effect to auto-calculate GST and Total
  useEffect(() => {
    const taxableVal = parseFloat(formData.taxable) || 0;
    
    if (formData.gstSlab !== "custom") {
      const slabPercentage = parseFloat(formData.gstSlab) || 0;
      const calculatedGst = (taxableVal * slabPercentage) / 100;
      const totalVal = taxableVal + calculatedGst;
      
      setFormData(prev => ({
        ...prev,
        gst: calculatedGst ? calculatedGst.toFixed(2) : "",
        total: totalVal ? totalVal.toFixed(2) : ""
      }));
    } else {
      // If custom, just calculate total based on whatever GST user manually typed
      const manualGst = parseFloat(formData.gst) || 0;
      const totalVal = taxableVal + manualGst;
      setFormData(prev => ({
        ...prev,
        total: totalVal ? totalVal.toFixed(2) : ""
      }));
    }
  }, [formData.taxable, formData.gstSlab, formData.gst]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateNew = (type, name) => {
    setModalType(type);
    setModalInitialName(name);
    setModalOpen(true);
  };

  const handleModalSave = (data) => {
    if (modalType === "vendor") {
      setVendors([...vendors, data]);
      setFormData({ ...formData, vendor: data.name || data.vendor });
    }
  };

  const fileToDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const dataUrl = await fileToDataURL(file);
      setSelectedFile({
        name: file.name,
        type: "pdf",
        dataUrl
      });
    } else {
      const dataUrl = await fileToDataURL(file);
      setStudioInitialSrc(dataUrl);
      setStudioMode("editor");
      setStudioOpen(true);
    }
    e.target.value = null;
  };

  const handleOpenCamera = () => {
    setStudioInitialSrc(null);
    setStudioMode("camera");
    setStudioOpen(true);
  };

  const handleStudioSave = (editedDataUrl, filename) => {
    setSelectedFile({
      name: filename || `PurchaseBill_${Date.now()}.jpg`,
      type: "image",
      dataUrl: editedDataUrl
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vendor || !formData.billNo || !formData.date) {
      alertDialog({ title: "Incomplete Details", message: "Please enter vendor, bill number, and date." });
      return;
    }

    setUploading(true);
    try {
      const payload = {
        vendor: formData.vendor?.name || formData.vendor,
        billNo: formData.billNo,
        date: formData.date,
        taxable: parseFloat(formData.taxable) || 0,
        gst: parseFloat(formData.gst) || 0,
        total: parseFloat(formData.total) || 0,
        fileName: selectedFile ? selectedFile.name : null,
        fileData: selectedFile ? selectedFile.dataUrl : null,
      };

      if (editMode && editId) {
        const res = await axios.put(`${API}/purchases/${editId}`, payload);
        if (res.data.success) {
          await fetchData();
          setFormData({ vendor: "", billNo: "", date: new Date().toISOString().slice(0, 10), taxable: "", gstSlab: "0", gst: "", total: "" });
          setSelectedFile(null);
          setIsAdding(false);
          setEditMode(false);
          setEditId(null);
        } else {
          alertDialog({ title: "Error", message: res.data.message || "Failed to update entry." });
        }
      } else {
        const res = await axios.post(`${API}/purchases`, payload);
        if (res.data.success) {
          await fetchData();
          setFormData({ vendor: "", billNo: "", date: new Date().toISOString().slice(0, 10), taxable: "", gstSlab: "0", gst: "", total: "" });
          setSelectedFile(null);
          setIsAdding(false);
        } else {
          alertDialog({ title: "Error", message: res.data.message || "Failed to save entry." });
        }
      }
    } catch (err) {
      console.error("Save purchase entry error", err);
      alertDialog({ title: "Error", message: "An error occurred while saving." });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setEditId(item.id);
    setIsAdding(true);
    let slab = "custom";
    if (item.taxable > 0 && item.gst >= 0) {
      const percentage = (item.gst / item.taxable) * 100;
      if ([0, 5, 12, 18, 28].includes(Math.round(percentage))) {
        slab = Math.round(percentage).toString();
      }
    }
    
    setFormData({
      vendor: item.vendor || "",
      billNo: item.billNo || "",
      date: item.date ? item.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      taxable: item.taxable || "",
      gstSlab: slab,
      gst: item.gst || "",
      total: item.total || ""
    });
    if (item.cloudinaryUrl || item.voucherUrl || item.fileName) {
      setSelectedFile({
        name: "Existing Voucher",
        type: "image",
        dataUrl: item.cloudinaryUrl || item.voucherUrl || (item.fileName ? `${API}/uploads/${item.fileName}` : null)
      });
    } else {
      setSelectedFile(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Purchase",
      message: "Are you sure you want to delete this purchase bill? This will also remove any attached bill image.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    setPurchases(prev => prev.filter(p => p.id !== id));
    try {
      await axios.delete(`${API}/purchases/${id}`);
    } catch (err) {
      console.error("Delete purchase error", err);
      fetchData();
    }
  };

  const handlePayBill = (item) => {
    const balance = Math.max(0, parseFloat(item.total || 0) - parseFloat(item.paidAmount || 0));
    setPayBillData({
      purchaseId: item.id,
      vendor: item.vendor,
      billNo: item.billNo,
      date: new Date().toISOString().slice(0, 10),
      amount: balance,
      remarks: "Entered by purchase sheet"
    });
    setPayBillOpen(true);
  };

  const handlePayBillSubmit = async (e) => {
    e.preventDefault();
    setPayingBill(true);
    try {
      const payload = {
        amount: parseFloat(payBillData.amount) || 0,
        date: payBillData.date,
        type: "out",
        partyType: "Vendor",
        partyName: payBillData.vendor,
        remarks: payBillData.remarks
      };
      
      const res = await axios.post(`${API}/cash`, payload);
      if (res.data.success) {
        setPayBillOpen(false);
        setPayBillData(null);
        await fetchData();
      } else {
        alertDialog({ title: "Error", message: res.data.message || "Failed to process payment." });
      }
    } catch (err) {
      console.error("Pay bill error", err);
      alertDialog({ title: "Error", message: "An error occurred while processing payment." });
    } finally {
      setPayingBill(false);
    }
  };

  
  const displayPurchases = useMemo(() => {
    const pending = (syncQueue || [])
      .filter(req => req.method === 'post' && req.url.includes('/purchases'))
      .map(req => ({
        ...req.data,
        id: req.tempId,
        isOfflinePending: true,
      }));
    return [...pending, ...purchases];
  }, [purchases, syncQueue]);

  const filteredPurchases = useMemo(() => {
    return displayPurchases.filter(item => {
      // Search
      const searchStr = search.toLowerCase();
      const matchesSearch = 
        (item.vendor || "").toLowerCase().includes(searchStr) ||
        (item.billNo || "").toLowerCase().includes(searchStr);
        
      // Date
      const itemDate = new Date(item.date || item.createdAt);
      const matchesFrom = fromDate ? itemDate >= new Date(fromDate) : true;
      
      const toDateObj = toDate ? new Date(toDate) : null;
      if (toDateObj) toDateObj.setHours(23, 59, 59, 999);
      const matchesTo = toDateObj ? itemDate <= toDateObj : true;

      // Status & Pending Amount
      const totalAmount = parseFloat(item.total || 0);
      const paidAmount = parseFloat(item.paidAmount || 0);
      const pendingAmount = totalAmount - paidAmount;
      
      const isPaid = pendingAmount <= 0.01; // fuzzy check for floats
      const isPending = pendingAmount > 0;
      const isPartial = pendingAmount > 0 && paidAmount > 0;

      let matchesStatus = true;
      if (statusFilter === "Paid") matchesStatus = isPaid;
      if (statusFilter === "Pending") matchesStatus = isPending || isPartial;

      let matchesPendingAmount = true;
      if (minPending !== "") {
        matchesPendingAmount = matchesPendingAmount && (pendingAmount >= parseFloat(minPending));
      }
      if (maxPending !== "") {
        matchesPendingAmount = matchesPendingAmount && (pendingAmount <= parseFloat(maxPending));
      }

      return matchesSearch && matchesFrom && matchesTo && matchesStatus && matchesPendingAmount;
    });
  }, [displayPurchases, search, fromDate, toDate, statusFilter, minPending, maxPending]);

  const { sortedData, sortOption, setSortOption } = useTableSort(filteredPurchases, "newest", { nameKey: "vendor", amountKey: "total" });

  const stats = useMemo(() => {
    const totalPurchases = filteredPurchases.length;
    const totalAmount = filteredPurchases.reduce((s, e) => s + parseFloat(e.total || 0), 0);
    const totalGst = filteredPurchases.reduce((s, e) => s + parseFloat(e.gst || 0), 0);
    const totalPaid = filteredPurchases.reduce((s, e) => s + parseFloat(e.paidAmount || 0), 0);
    const outstanding = totalAmount - totalPaid;
    return { totalPurchases, totalAmount, totalGst, outstanding, totalPaid };
  }, [filteredPurchases]);

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
          marginBottom: isAdding ? "0.35rem" : "1.25rem",
          transition: "margin-bottom 0.2s ease",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ background: "#f5f3ff", padding: "8px", borderRadius: "10px", display: "flex" }}>
            <ShoppingCart size={22} style={{ color: "#8b5cf6" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, color: "#0f172a" }}>
              Purchase Bills
            </h3>
            <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 500 }}>
              Manage vendor bills and purchase records
            </span>
          </div>
        </div>

        <div className="page-header-actions">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="page-header-btn"
          >
            <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          {!isAdding && (
            <button 
              onClick={() => setIsAdding(true)}
              className="page-header-btn page-header-btn-primary"
              style={{ background: "#8b5cf6", borderColor: "#8b5cf6", boxShadow: "0 2px 6px rgba(139, 92, 246, 0.2)" }}
            >
              <Plus size={15} />
              New Purchase
            </button>
          )}
        </div>
      </div>

      {/* NEW ENTRY WORKFLOW */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden", width: "100%" }}
          >
            <div 
              style={{
                backgroundColor: "white",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 20px 35px -10px rgba(0, 0, 0, 0.08)",
                marginBottom: "1rem",
                width: "100%",
                overflow: "hidden"
              }}
            >
              <div style={{ background: "linear-gradient(90deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)", height: "4px", width: "100%" }} />
              <div 
                style={{
                  padding: "1.25rem 1.75rem",
                  borderBottom: "1px solid #f1f5f9",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#fafcfd"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <div style={{ background: "#ede9fe", padding: "10px", borderRadius: "12px", color: "#8b5cf6", display: "flex" }}>
                    <Receipt size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700", color: "#0f172a" }}>
                      Record Purchase Bill
                    </h4>
                    <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
                      Log a new vendor bill and attach the receipt document
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  style={{
                    background: "#f1f5f9",
                    border: "none",
                    borderRadius: "8px",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#64748b"
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div 
                  style={{
                    padding: "1.75rem",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: "1.75rem",
                    alignItems: "start"
                  }}
                >
                  {/* COL 1: Details */}
                  <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                    <h5 style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                      1. Vendor & Bill Details
                    </h5>
                    
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Vendor Name *</label>
                      <div style={{ background: "white", borderRadius: "8px", padding: "2px" }}>
                         <CreatableDropdown 
                            options={vendors} 
                            value={formData.vendor} 
                            onChange={(val) => setFormData({ ...formData, vendor: val })} 
                            onCreate={(name) => handleCreateNew("vendor", name)}
                            placeholder="-- Select or type new Vendor --" 
                          />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Bill / Invoice No *</label>
                        <input
                          type="text"
                          name="billNo"
                          value={formData.billNo}
                          onChange={handleChange}
                          placeholder="e.g. INV-1029"
                          required
                          style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Bill Date *</label>
                        <input
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleChange}
                          required
                          style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Taxable Amount (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="taxable"
                          value={formData.taxable}
                          onChange={handleChange}
                          placeholder="0.00"
                          style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>GST Slab</label>
                        <select
                          name="gstSlab"
                          value={formData.gstSlab}
                          onChange={handleChange}
                          style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box", backgroundColor: "white" }}
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>GST Amount (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="gst"
                          value={formData.gst}
                          onChange={handleChange}
                          placeholder="0.00"
                          disabled={formData.gstSlab !== "custom"}
                          style={{ 
                            width: "100%", 
                            padding: "0.65rem", 
                            borderRadius: "8px", 
                            border: "1px solid #cbd5e1", 
                            outline: "none", 
                            boxSizing: "border-box",
                            backgroundColor: formData.gstSlab !== "custom" ? "#f1f5f9" : "white",
                            color: formData.gstSlab !== "custom" ? "#64748b" : "black"
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Total Amount (₹) *</label>
                        <input
                          type="number"
                          step="0.01"
                          name="total"
                          value={formData.total}
                          onChange={handleChange}
                          placeholder="0.00"
                          required
                          readOnly
                          style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1.5px solid #8b5cf6", outline: "none", boxSizing: "border-box", fontWeight: 700, backgroundColor: "#f5f3ff", color: "#6d28d9" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* COL 2: Voucher Document */}
                  <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
                    <h5 style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                      2. Attach Bill / Invoice Document
                    </h5>

                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      style={{ display: "none" }}
                    />

                    {!selectedFile ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", flex: 1 }}>
                        <button
                          type="button"
                          onClick={handleOpenCamera}
                          style={{
                            background: "white",
                            color: "#8b5cf6",
                            border: "1.5px solid #ddd6fe",
                            padding: "1.25rem 0.75rem",
                            borderRadius: "12px",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            transition: "all 0.15s",
                            boxShadow: "0 2px 6px rgba(139, 92, 246, 0.08)"
                          }}
                        >
                          <div style={{ background: "#ede9fe", padding: "10px", borderRadius: "50%", color: "#8b5cf6", display: "flex" }}>
                            <Camera size={22} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Scan Bill</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            background: "white",
                            color: "#334155",
                            border: "1.5px dashed #cbd5e1",
                            padding: "1.25rem 0.75rem",
                            borderRadius: "12px",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            transition: "all 0.15s"
                          }}
                        >
                          <div style={{ background: "#f1f5f9", padding: "10px", borderRadius: "50%", color: "#64748b", display: "flex" }}>
                            <ImageIcon size={22} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Browse Files</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <div style={{ background: "white", borderRadius: "10px", padding: "1rem", border: "1.5px solid #8b5cf6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                            {selectedFile.type === "pdf" ? (
                              <div style={{ background: "#fee2e2", padding: "12px", borderRadius: "8px", color: "#dc2626" }}>
                                <FileText size={24} />
                              </div>
                            ) : (
                              <img
                                src={selectedFile.dataUrl}
                                alt="Preview"
                                style={{ width: "56px", height: "56px", objectFit: "cover", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                              />
                            )}
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", maxWidth: "160px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedFile.name}</div>
                              <div style={{ fontSize: "0.75rem", color: "#8b5cf6", fontWeight: 600, marginTop: "2px" }}>✓ Ready to upload</div>
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {selectedFile.type !== "pdf" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setStudioInitialSrc(selectedFile.dataUrl);
                                  setStudioMode("editor");
                                  setStudioOpen(true);
                                }}
                                style={{
                                  background: "#f5f3ff",
                                  border: "1px solid #8b5cf6",
                                  color: "#6d28d9",
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  fontWeight: 600,
                                  fontSize: "0.75rem",
                                  cursor: "pointer"
                                }}
                              >
                                Edit
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedFile(null)}
                              style={{
                                background: "#fef2f2",
                                border: "1px solid #fca5a5",
                                color: "#dc2626",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                cursor: "pointer"
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                      {editMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditMode(false);
                            setEditId(null);
                            setIsAdding(false);
                            setFormData({ vendor: "", billNo: "", date: new Date().toISOString().slice(0, 10), taxable: "", gstSlab: "0", gst: "", total: "" });
                            setSelectedFile(null);
                          }}
                          style={{
                            background: "#f1f5f9",
                            color: "#475569",
                            border: "none",
                            padding: "0.85rem 1rem",
                            borderRadius: "10px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={uploading || !formData.vendor || !formData.billNo}
                        style={{
                          flex: 1,
                          background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
                          color: "white",
                          border: "none",
                          padding: "0.85rem 1rem",
                          borderRadius: "10px",
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          boxShadow: "0 4px 12px rgba(139, 92, 246, 0.25)",
                          opacity: uploading || !formData.vendor || !formData.billNo ? 0.5 : 1
                        }}
                      >
                        <Plus size={18} />
                        {uploading ? (editMode ? "Updating..." : "Saving Purchase...") : (editMode ? "Update Purchase" : "Record Purchase")}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STATS CARDS */}
      <StatsPanel stats={[
        { label: "Total Purchases", value: stats.totalPurchases, icon: FileSpreadsheet, color: "blue" },
        { label: "Total Value", value: "₹" + formatAmount(stats.totalAmount), icon: ShoppingCart, color: "purple" },
        { label: "Total Paid", value: "₹" + formatAmount(stats.totalPaid), icon: Receipt, color: "green" },
        { label: "Total GST Paid", value: "₹" + formatAmount(stats.totalGst), icon: FileText, color: "orange" },
        { label: "Total Outstanding", value: "₹" + formatAmount(stats.outstanding), icon: DollarSign, color: "red" }
      ]} />

      
      {/* FILTER BAR */}
      <div className="premium-filter-toolbar">
        <div className="premium-filter-grid">
          
          {/* Search Box */}
          <div className="premium-search-wrapper">
            <div className="premium-search-icon">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              className="premium-search-input" 
              placeholder="Search Vendor, Bill No..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>

          {/* Date Range */}
          <div className="premium-filter-group">
            <span className="premium-filter-label">Date:</span>
            <input 
              type="date" 
              className="premium-filter-input" 
              value={fromDate} 
              onChange={(e) => setFromDate(e.target.value)} 
            />
            <span style={{ color: "#94a3b8" }}>-</span>
            <input 
              type="date" 
              className="premium-filter-input" 
              value={toDate} 
              onChange={(e) => setToDate(e.target.value)} 
            />
          </div>

          {/* Status Filter */}
          <div className="premium-filter-group">
            <Filter size={16} color="#64748b" style={{ marginLeft: "4px" }} />
            <select 
              className="premium-filter-input" 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ cursor: "pointer" }}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending / Unpaid</option>
              <option value="Paid">Fully Paid</option>
            </select>
          </div>

          <div className="premium-filter-group">
            <span className="premium-filter-label">Pending Amount:</span>
            <input 
              type="number" 
              placeholder="Min" 
              value={minPending} 
              onChange={(e) => setMinPending(e.target.value)} 
              className="premium-filter-input"
              style={{ width: "60px" }}
            />
            <span style={{ color: "#94a3b8" }}>-</span>
            <input 
              type="number" 
              placeholder="Max" 
              value={maxPending} 
              onChange={(e) => setMaxPending(e.target.value)} 
              className="premium-filter-input"
              style={{ width: "60px" }}
            />
          </div>
          
          <SortDropdown 
            value={sortOption} 
            onChange={setSortOption} 
            options={["newest", "oldest", "amount_desc", "amount_asc", "az", "za"]} 
          />
        </div>

        {/* Clear Filters Button */}
        {(search || fromDate || toDate || statusFilter !== "All" || minPending || maxPending || sortOption !== "newest") && (
          <button 
            onClick={() => { setSearch(""); setFromDate(""); setToDate(""); setStatusFilter("All"); setMinPending(""); setMaxPending(""); setSortOption("newest"); }}
            className="premium-clear-btn"
            style={{ alignSelf: "flex-end" }}
          >
            <X size={14} /> Clear Filters
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="glass-panel" style={{ background: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <Table
          headers={["Date", "Vendor", "Bill No", "Taxable/GST", "Total", "Paid", "Balance", "Status", "Bill Image", "Actions"]}
          data={sortedData}
          loading={loading}
          pagination={true}
          renderRow={(item, index) => {
            const fileUrl = getSafeCloudinaryPdfUrl(item.cloudinaryUrl || item.voucherUrl || (item.fileName ? `${API.replace('/api', '')}/uploads/${item.fileName}` : null));

            return (
              <tr key={item.id || index} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "0.9rem", opacity: item.isOfflinePending ? 0.7 : 1 }}>
                <td style={{ padding: "1rem", color: "#475569" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Calendar size={14} /> {item.date ? formatDate(item.date) : "-"}
                    {item.isOfflinePending && (
                      <Clock size={14} color="#f59e0b" title="Pending Sync (Offline)" />
                    )}
                  </div>
                </td>
                
                <td style={{ padding: "1rem", fontWeight: 600, color: "#334155" }}>
                  {item.vendor}
                </td>

                <td style={{ padding: "1rem", color: "#0f172a" }}>
                  {item.billNo || "-"}
                </td>

                <td style={{ padding: "1rem", color: "#475569" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
                    <span style={{ fontSize: "0.9rem", color: "#0f172a" }}>
                       <RupeeIcon size={12}/>{formatAmount(item.taxable)}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#f59e0b", fontWeight: 600 }}>
                       + <RupeeIcon size={10}/>{formatAmount(item.gst)} GST
                    </span>
                  </div>
                </td>

                <td style={{ padding: "1rem", fontWeight: 700, color: "#8b5cf6" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <RupeeIcon size={14} /> {formatAmount(item.total)}
                  </div>
                </td>

                <td style={{ padding: "1rem", color: "#10b981", fontWeight: 600 }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <RupeeIcon size={14} /> {formatAmount(item.paidAmount)}
                  </div>
                </td>

                <td style={{ padding: "1rem", color: "#ef4444", fontWeight: 700 }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <RupeeIcon size={14} /> {formatAmount(Math.max(0, parseFloat(item.total || 0) - parseFloat(item.paidAmount || 0)))}
                  </div>
                </td>

                <td style={{ padding: "1rem" }}>
                  {(() => {
                    const total = parseFloat(item.total || 0);
                    const paid = parseFloat(item.paidAmount || 0);
                    let status = item.status || "Unpaid";
                    if (paid >= total && total > 0) status = "Paid";
                    else if (paid > 0 && paid < total) status = "Partial";
                    else if (paid === 0) status = "Unpaid";

                    if (status === 'Paid') {
                      return <span style={{ background: '#d1fae5', color: '#047857', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Paid</span>;
                    } else if (status === 'Partial') {
                      return <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Partial</span>;
                    } else {
                      return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Unpaid</span>;
                    }
                  })()}
                </td>

                <td style={{ padding: "1rem" }}>
                  {fileUrl ? (
                    <button
                      disabled={item.isOfflinePending}
                      onClick={() => navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}&title=Purchase%20Bill%20Viewer`)}
                      style={{
                        background: "#f5f3ff",
                        border: "1px solid #ddd6fe",
                        color: "#6d28d9",
                        padding: "0.4rem 0.85rem",
                        borderRadius: "6px",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        cursor: item.isOfflinePending ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        opacity: item.isOfflinePending ? 0.5 : 1
                      }}
                    >
                      <Eye size={14} />
                      View Bill
                    </button>
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: "0.8rem", fontStyle: "italic" }}>No document</span>
                  )}
                </td>

                <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {isSuperAdmin && item.status !== 'Paid' && !item.isOfflinePending && (
                       <button
                         onClick={() => handlePayBill(item)}
                         style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", color: "#6d28d9", cursor: "pointer", padding: "4px 8px", borderRadius: "6px", fontWeight: 600, fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
                         title="Pay Bill"
                       >
                         <DollarSign size={12} /> Pay
                       </button>
                    )}
                    {fileUrl && (
                      <a
                        href={item.isOfflinePending ? "#" : fileUrl}
                        target={item.isOfflinePending ? "_self" : "_blank"}
                        onClick={(e) => { if (item.isOfflinePending) e.preventDefault(); }}
                        rel="noopener noreferrer"
                        style={{ color: "#475569", padding: "4px", display: "inline-flex", textDecoration: "none", opacity: item.isOfflinePending ? 0.5 : 1, cursor: item.isOfflinePending ? "not-allowed" : "pointer" }}
                        title="Open in new tab"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                    {isSuperAdmin && !item.isOfflinePending && (
                      <button 
                        onClick={() => handleEdit(item)}
                        style={{ background: "transparent", border: "none", color: "#8b5cf6", cursor: "pointer", padding: "4px" }}
                        title="Edit Entry"
                      >
                        <Edit3 size={16} />
                      </button>
                    )}
                    {isSuperAdmin && !item.isOfflinePending && (
                      <button 
                        onClick={() => handleDelete(item.id)}
                        style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", padding: "4px" }}
                        title="Delete Entry"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          }}
        />
      </div>
      
      {/* QUICK ADD MODAL for Vendor Dropdown */}
      <QuickAddModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
        type={modalType}
        initialName={modalInitialName}
      />

      {/* STUDIO MODAL */}
      <PODImageStudioModal
        isOpen={studioOpen}
        onClose={() => setStudioOpen(false)}
        initialMode={studioMode}
        initialImageSrc={studioInitialSrc}
        onSave={handleStudioSave}
      />

      {/* PAY BILL MODAL */}
      <AnimatePresence>
        {payBillOpen && payBillData && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: "white", borderRadius: "16px", padding: "2rem", width: "100%", maxWidth: "400px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
            >
              <h3 style={{ margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "8px", color: "#0f172a" }}>
                <DollarSign size={20} color="#8b5cf6" /> Pay Vendor Bill
              </h3>
              
              <form onSubmit={handlePayBillSubmit}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.4rem" }}>Vendor Name</label>
                    <input type="text" value={payBillData.vendor} disabled style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f1f5f9", color: "#64748b", boxSizing: "border-box" }} />
                  </div>
                  
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.4rem" }}>Payment Date</label>
                    <input type="date" value={payBillData.date} onChange={(e) => setPayBillData({...payBillData, date: e.target.value})} required style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box", outline: "none" }} />
                  </div>
                  
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.4rem" }}>Payment Amount (₹)</label>
                    <input type="number" step="0.01" value={payBillData.amount} onChange={(e) => setPayBillData({...payBillData, amount: e.target.value})} required style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1.5px solid #8b5cf6", boxSizing: "border-box", outline: "none", fontWeight: 700 }} />
                  </div>
                  
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.4rem" }}>Remarks</label>
                    <input type="text" value={payBillData.remarks} onChange={(e) => setPayBillData({...payBillData, remarks: e.target.value})} style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box", outline: "none" }} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setPayBillOpen(false)} style={{ background: "#f1f5f9", color: "#475569", border: "none", padding: "0.65rem 1rem", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button type="submit" disabled={payingBill} style={{ background: "#8b5cf6", color: "white", border: "none", padding: "0.65rem 1rem", borderRadius: "8px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                    {payingBill ? "Processing..." : "Confirm Payment"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Purchase;
