import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import { useSocketSync } from "../hooks/useSocketSync";
import Papa from "papaparse";
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
  Banknote,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { useToast } from "../context/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate, getSafeCloudinaryPdfUrl } from '../utils/formatters';
import PODImageStudioModal from "../components/pod/PODImageStudioModal";
import RupeeIcon from '../components/RupeeIcon';
import CreatableDropdown from "../components/CreatableDropdown";
import ExportModal from "../components/ExportModal";
import { exportCashSheetList } from "../utils/excelExport";
import { Download } from "lucide-react";
import QuickAddModal from "../components/QuickAddModal";
import { BadgeContext } from "../context/BadgeContext";
import { useSync } from "../context/SyncContext";
import { useSettings } from "../context/SettingsContext";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const CashSheet = () => {
  const { user } = useContext(AuthContext);
  const { globalSettings } = useSettings();
  const enableCsvImport = globalSettings?.integrations?.enableCsvImport !== false;
  const { syncQueue } = useSync();
  const { confirm } = useDialog();
  const { clearBadge } = useContext(BadgeContext);
  const { addToast } = useToast();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimarg.com' || user?.role === 'admin';

  // Data states
  const [entries, setEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const [filterSearch, setFilterSearch] = useState("");
  const [filterPartyType, setFilterPartyType] = useState("All");
  const [filterType, setFilterType] = useState("All");

  // Selection State
  const [selectedCashIds, setSelectedCashIds] = useState([]);

  const handleToggleSelectCash = (id) => {
    if (!id) return;
    setSelectedCashIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExecuteExport = async ({ format }) => {
    try {
      setIsExporting(true);
      let dataToExport = filteredEntries;
      if (selectedCashIds.length > 0) {
        dataToExport = filteredEntries.filter(b => selectedCashIds.includes(b.id || b._id));
      }
      await exportCashSheetList({
        entries: dataToExport,
        format,
        dateRange: { startDate: "", endDate: "" },
      });
      setShowExportModal(false);
    } catch (err) {
      console.error("Export error", err);
    } finally {
      setIsExporting(false);
    }
  };

  const displayEntries = useMemo(() => {
    const pending = (syncQueue || [])
      .filter(req => req.method === 'post' && req.url.includes('/cash'))
      .map(req => ({
        ...req.data,
        id: req.tempId,
        isOfflinePending: true,
      }));
    return [...pending, ...entries];
  }, [entries, syncQueue]);

  const filteredEntries = useMemo(() => {
    return displayEntries.filter(e => {
      // 1. Party Type Filter
      if (filterPartyType !== "All" && e.partyType?.toLowerCase() !== filterPartyType.toLowerCase()) return false;
      
      // 2. Transaction Type Filter
      if (filterType === "Cash In" && e.type !== "in") return false;
      if (filterType === "Cash Out" && e.type !== "out") return false;
      
      // 3. Search Query Filter
      if (filterSearch) {
        const query = filterSearch.toLowerCase();
        const partyNameMatch = e.partyName?.toLowerCase().includes(query);
        const remarksMatch = e.remarks?.toLowerCase().includes(query);
        const amountMatch = e.amount?.toString().includes(query);
        if (!partyNameMatch && !remarksMatch && !amountMatch) return false;
      }
      
      return true;
    });
  }, [displayEntries, filterSearch, filterPartyType, filterType]);

  const csvInputRef = useRef(null);
  const [importing, setImporting] = useState(false);

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await axios.post(`${API}/cash/import`, { entries: results.data });
          addToast(`Successfully imported ${res.data.data.count} entries!`, "success");
          fetchData();
        } catch (err) {
          console.error("Import error", err);
          addToast("Failed to import entries", "error");
        } finally {
          setImporting(false);
          if (csvInputRef.current) csvInputRef.current.value = "";
        }
      },
      error: (err) => {
        console.error("CSV Parse Error", err);
        addToast("Failed to parse CSV file", "error");
        setImporting(false);
        if (csvInputRef.current) csvInputRef.current.value = "";
      }
    });
  };

  const csvVendorInputRef = useRef(null);
  const [importingVendor, setImportingVendor] = useState(false);

  const handleVendorImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportingVendor(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await axios.post(`${API}/cash/import/vendor`, { entries: results.data });
          addToast(`Successfully imported ${res.data.data.count} vendor entries!`, "success");
          fetchData();
        } catch (err) {
          console.error("Vendor Import error", err);
          addToast("Failed to import vendor entries", "error");
        } finally {
          setImportingVendor(false);
          if (csvVendorInputRef.current) csvVendorInputRef.current.value = "";
        }
      },
      error: (err) => {
        console.error("CSV Parse Error", err);
        addToast("Failed to parse CSV file", "error");
        setImportingVendor(false);
        if (csvVendorInputRef.current) csvVendorInputRef.current.value = "";
      }
    });
  };

  // QuickAdd Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [modalInitialName, setModalInitialName] = useState("");

  // Modal / Add Form states
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // { name, type, dataUrl }
  
  // Form State
  const [formData, setFormData] = useState({
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    type: "in",
    partyType: "Other",
    partyName: "",
    remarks: ""
  });

  // Box Image Studio Modal state
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioMode, setStudioMode] = useState("camera"); // 'camera' | 'editor'
  const [studioInitialSrc, setStudioInitialSrc] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
    clearBadge("cashEntries");
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [cashRes, clientRes, vendorRes, userRes] = await Promise.all([
        axios.get(`${API}/cash`),
        axios.get(`${API}/clients`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/vendors`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API}/users`).catch(() => ({ data: { data: [] } }))
      ]);
      if (cashRes.data.success) setEntries(cashRes.data.data || []);
      setClients(clientRes.data.data || []);
      setVendors(vendorRes.data.data || []);
      setEmployees(userRes.data?.data || []);
    } catch (err) { 
      console.error("Fetch cash error", err); 
    } finally {
      setLoading(false);
    }
  }
  
  useSocketSync("cashEntries", fetchData);

  const [clearingFiltered, setClearingFiltered] = useState(false);
  const handleClearFiltered = async () => {
    if (filteredEntries.length === 0) return;
    
    const isConfirmed = await confirm({
      title: "Clear Filtered Entries",
      message: `Are you sure you want to permanently delete the ${filteredEntries.length} currently visible entries? This action cannot be undone.`,
      confirmText: "Delete All",
      cancelText: "Cancel"
    });
    
    if (!isConfirmed) return;
    
    setClearingFiltered(true);
    try {
      const ids = filteredEntries.map(e => e.id || e._id);
      const res = await axios.post(`${API}/cash/bulk-delete`, { ids });
      addToast(res.data.message || `Successfully deleted ${ids.length} entries!`, "success");
      fetchData();
    } catch (err) {
      console.error("Bulk delete error:", err);
      addToast(err.response?.data?.message || "Failed to delete entries", "error");
    } finally {
      setClearingFiltered(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleCreateNew = (type, name) => {
    setModalType(type);
    setModalInitialName(name);
    setModalOpen(true);
  };

  const handleModalSave = (data) => {
    if (modalType === "client") {
      setClients([...clients, data]);
      setFormData({ ...formData, partyName: data.name || data.client });
    } else if (modalType === "vendor") {
      setVendors([...vendors, data]);
      setFormData({ ...formData, partyName: data.name || data.vendor });
    } else if (modalType === "employee") {
      setEmployees([...employees, data]);
      setFormData({ ...formData, partyName: data.name || data.employee });
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Convert File to Base64 Data URL
  const fileToDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Handle Gallery / File selection
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
    // reset input so same file can be selected again
    e.target.value = null;
  };

  // Open Live Camera Scanner
  const handleOpenCamera = () => {
    setStudioInitialSrc(null);
    setStudioMode("camera");
    setStudioOpen(true);
  };

  // Callback from Image Studio when user saves
  const handleStudioSave = (editedDataUrl, filename) => {
    setSelectedFile({
      name: filename || `Voucher_${Date.now()}.jpg`,
      type: "image",
      dataUrl: editedDataUrl
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      addToast("Please enter a valid positive amount.", "error");
      return;
    }
    if (!formData.partyName) {
      addToast("Please enter or select a name for this transaction.", "error");
      return;
    }

    setUploading(true);
    try {
      const payload = {
        amount: parseFloat(formData.amount),
        date: formData.date,
        type: formData.type,
        partyType: formData.partyType,
        partyName: formData.partyName?.name || formData.partyName,
        remarks: formData.remarks,
        fileName: selectedFile ? selectedFile.name : null,
        fileData: selectedFile ? selectedFile.dataUrl : null,
      };

      if (editMode && editId) {
        const res = await axios.put(`${API}/cash/${editId}`, payload);
        if (res.data.success) {
          await fetchData();
          setFormData({ amount: "", date: new Date().toISOString().slice(0, 10), type: "in", partyType: "Other", partyName: "", remarks: "" });
          setSelectedFile(null);
          setIsAdding(false);
          setEditMode(false);
          setEditId(null);
        } else {
          addToast(res.data.message || "Failed to update entry.", "error");
        }
      } else {
        const res = await axios.post(`${API}/cash`, payload);
        if (res.data.success) {
          await fetchData();
          setFormData({ amount: "", date: new Date().toISOString().slice(0, 10), type: "in", partyType: "Other", partyName: "", remarks: "" });
          setSelectedFile(null);
          setIsAdding(false);
        } else {
          addToast(res.data.message || "Failed to save entry.", "error");
        }
      }
    } catch (err) {
      console.error("Save cash entry error", err);
      addToast("An error occurred while saving.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setEditId(item.id);
    setIsAdding(true);
    setFormData({
      amount: item.amount || "",
      date: item.date || new Date().toISOString().slice(0, 10),
      type: item.type || "in",
      partyType: item.partyType || "Other",
      partyName: item.partyName || "",
      remarks: item.remarks || ""
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
      title: "Delete Entry",
      message: "Are you sure you want to delete this cash entry? This will also remove any attached voucher.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    setEntries(prev => prev.filter(e => e.id !== id));
    try {
      await axios.delete(`${API}/cash/${id}`);
    } catch (err) {
      console.error("Delete cash entry error", err);
      fetchData();
    }
  };

  const stats = useMemo(() => {
    const totalIncome = filteredEntries.filter(e => e.type === "in" || e.type === "income").reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const totalExpense = filteredEntries.filter(e => e.type === "out" || e.type === "expense").reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const netBalance = totalIncome - totalExpense;
    return { totalIncome, totalExpense, netBalance };
  }, [filteredEntries]);

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
          <div style={{ background: "#f0fdf4", padding: "8px", borderRadius: "10px", display: "flex" }}>
            <Banknote size={22} style={{ color: "#16a34a" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, color: "#0f172a" }}>
              Cash Sheet
            </h3>
            <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 500 }}>
              Manage incoming & outgoing cash transactions
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          {enableCsvImport && (
            <>
              <input 
                type="file" 
                accept=".csv" 
                ref={csvInputRef} 
                style={{ display: "none" }} 
                onChange={handleImport} 
              />
              <button
                onClick={() => csvInputRef.current?.click()}
                disabled={importing}
                style={{
                  background: "#3b82f6",
                  border: "none",
                  color: "white",
                  padding: "0.45rem 0.85rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 600,
                  fontSize: "0.8rem"
                }}
              >
                <FileText size={14} />
                {importing ? "Importing..." : "Import CSV"}
              </button>
              <input 
                type="file" 
                accept=".csv" 
                ref={csvVendorInputRef} 
                style={{ display: "none" }} 
                onChange={handleVendorImport} 
              />
              <button
                onClick={() => csvVendorInputRef.current?.click()}
                disabled={importingVendor}
                style={{
                  background: "#10b981",
                  border: "none",
                  color: "white",
                  padding: "0.45rem 0.85rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 600,
                  fontSize: "0.8rem"
                }}
              >
                <FileText size={14} />
                {importingVendor ? "Importing..." : "Import Vendor CSV"}
              </button>
            </>
          )}
          
          <button
            onClick={() => setShowExportModal(true)}
            style={{
              background: "#16a34a",
              border: "none",
              color: "white",
              padding: "0.45rem 0.85rem",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 600,
              fontSize: "0.8rem",
            }}
          >
            <Download size={14} />
            Export
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#475569",
              padding: "0.45rem 0.85rem",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 600,
              fontSize: "0.8rem"
            }}
          >
            <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          
          {filteredEntries.length > 0 && (
            <button
              onClick={handleClearFiltered}
              disabled={clearingFiltered}
              style={{
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                color: "#ef4444",
                padding: "0.45rem 0.85rem",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 600,
                fontSize: "0.8rem"
              }}
            >
              <Trash2 size={14} />
              {clearingFiltered ? "Deleting..." : `Delete (${filteredEntries.length})`}
            </button>
          )}

          {!isAdding && (
            <button 
              onClick={() => setIsAdding(true)}
              style={{
                background: "#16a34a",
                color: "white",
                border: "none",
                padding: "0.45rem 1rem",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 6px rgba(22, 163, 74, 0.2)",
                fontSize: "0.825rem"
              }}
            >
              <Plus size={15} />
              New Entry
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
              <div style={{ background: "linear-gradient(90deg, #16a34a 0%, #15803d 50%, #14532d 100%)", height: "4px", width: "100%" }} />
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
                  <div style={{ background: "#dcfce7", padding: "10px", borderRadius: "12px", color: "#16a34a", display: "flex" }}>
                    <Plus size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700", color: "#0f172a" }}>
                      Record Cash Transaction
                    </h4>
                    <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
                      Log a new Cash In/Out entry and attach a voucher if needed
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
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "1.75rem",
                    alignItems: "start"
                  }}
                >
                  {/* COL 1: Details */}
                  <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                    <h5 style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                      1. Transaction Details
                    </h5>
                    
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Type</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, type: "in" })}
                          style={{
                            padding: "0.65rem",
                            borderRadius: "8px",
                            border: formData.type === "in" ? "2px solid #16a34a" : "1px solid #cbd5e1",
                            background: formData.type === "in" ? "#f0fdf4" : "white",
                            color: formData.type === "in" ? "#16a34a" : "#64748b",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px"
                          }}
                        >
                          <TrendingUp size={16} /> Cash In
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, type: "out" })}
                          style={{
                            padding: "0.65rem",
                            borderRadius: "8px",
                            border: formData.type === "out" ? "2px solid #ef4444" : "1px solid #cbd5e1",
                            background: formData.type === "out" ? "#fef2f2" : "white",
                            color: formData.type === "out" ? "#ef4444" : "#64748b",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px"
                          }}
                        >
                          <TrendingDown size={16} /> Cash Out
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Amount (₹) *</label>
                        <input
                          type="number"
                          step="0.01"
                          name="amount"
                          value={formData.amount}
                          onChange={handleChange}
                          placeholder="0.00"
                          required
                          style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Date *</label>
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

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Party Type</label>
                        <select
                          name="partyType"
                          value={formData.partyType}
                          onChange={(e) => setFormData({...formData, partyType: e.target.value, partyName: ""})}
                          style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box", backgroundColor: "white" }}
                        >
                          <option value="Client">Client</option>
                          <option value="Vendor">Vendor</option>
                          <option value="Employee">Employee</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>
                          {formData.partyType} Name *
                        </label>
                        {formData.partyType === "Other" ? (
                          <input
                            type="text"
                            name="partyName"
                            value={formData.partyName}
                            onChange={handleChange}
                            placeholder="Enter name..."
                            required
                            style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                          />
                        ) : (
                          <div style={{ background: "white", borderRadius: "8px", padding: "2px" }}>
                            <CreatableDropdown 
                              category={formData.partyType === "Client" ? "client" : formData.partyType === "Vendor" ? "vendor" : "general"}
                              options={formData.partyType === "Client" ? clients : formData.partyType === "Vendor" ? vendors : employees} 
                              value={formData.partyName} 
                              onChange={(val) => setFormData({ ...formData, partyName: val })} 
                              onCreate={(name) => handleCreateNew(formData.partyType.toLowerCase(), name)}
                              placeholder={`-- Select ${formData.partyType} --`} 
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Remarks</label>
                      <input
                        type="text"
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleChange}
                        placeholder="e.g. Paid for fuel, received from client..."
                        style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>

                  {/* COL 2: Voucher Document */}
                  <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
                    <h5 style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                      2. Attach Voucher / Receipt
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
                            color: "#16a34a",
                            border: "1.5px solid #bbf7d0",
                            padding: "1.25rem 0.75rem",
                            borderRadius: "12px",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            transition: "all 0.15s",
                            boxShadow: "0 2px 6px rgba(22, 163, 74, 0.08)"
                          }}
                        >
                          <div style={{ background: "#dcfce7", padding: "10px", borderRadius: "50%", color: "#16a34a", display: "flex" }}>
                            <Camera size={22} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Scan Receipt</span>
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
                        <div style={{ background: "white", borderRadius: "10px", padding: "1rem", border: "1.5px solid #16a34a", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
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
                              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>{selectedFile.name}</div>
                              <div style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 600, marginTop: "2px" }}>✓ Ready to upload</div>
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
                                  background: "#f0fdf4",
                                  border: "1px solid #16a34a",
                                  color: "#15803d",
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
                            setFormData({ amount: "", date: new Date().toISOString().slice(0, 10), type: "in", remarks: "" });
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
                        disabled={uploading || !formData.amount || !formData.partyName}
                        style={{
                          flex: 1,
                          background: formData.type === "in" ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" : "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
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
                          boxShadow: formData.type === "in" ? "0 4px 12px rgba(22, 163, 74, 0.25)" : "0 4px 12px rgba(239, 68, 68, 0.25)",
                          opacity: uploading || !formData.amount || !formData.partyName ? 0.5 : 1
                        }}
                      >
                        <Plus size={18} />
                        {uploading ? (editMode ? "Updating..." : "Saving Entry...") : (editMode ? "Update Entry" : `Record Cash ${formData.type === "in" ? "In" : "Out"}`)}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTERS BAR */}
      <div style={{
        background: "white",
        padding: "1rem",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        marginBottom: "1.25rem",
        display: "flex",
        gap: "1rem",
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        <div style={{ flex: "1 1 250px", display: "flex", alignItems: "center", background: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <Search size={16} color="#64748b" style={{ marginRight: "8px" }} />
          <input 
            type="text" 
            placeholder="Search by name, remarks, amount..." 
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "0.9rem" }}
          />
        </div>
        
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", flex: "1 1 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Filter size={14} color="#64748b" />
            <select 
              value={filterPartyType} 
              onChange={(e) => setFilterPartyType(e.target.value)}
              style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.85rem", background: "white", outline: "none" }}
            >
              <option value="All">All Parties</option>
              <option value="Client">Client</option>
              <option value="Vendor">Vendor</option>
              <option value="Employee">Employee</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.85rem", background: "white", outline: "none" }}
            >
              <option value="All">All Types</option>
              <option value="Cash In">Cash In</option>
              <option value="Cash Out">Cash Out</option>
            </select>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Cash In</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#16a34a", marginTop: "4px", display: "flex", alignItems: "center" }}>
               <RupeeIcon size={24} /> {stats.totalIncome.toFixed(2)}
            </div>
          </div>
          <div style={{ background: "#dcfce7", padding: "12px", borderRadius: "12px" }}><TrendingUp size={24} color="#16a34a" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Cash Out</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#ef4444", marginTop: "4px", display: "flex", alignItems: "center" }}>
               <RupeeIcon size={24} /> {stats.totalExpense.toFixed(2)}
            </div>
          </div>
          <div style={{ background: "#fef2f2", padding: "12px", borderRadius: "12px" }}><TrendingDown size={24} color="#ef4444" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Net Balance</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: stats.netBalance >= 0 ? "#0f172a" : "#ef4444", marginTop: "4px", display: "flex", alignItems: "center" }}>
               <RupeeIcon size={24} /> {stats.netBalance.toFixed(2)}
            </div>
          </div>
          <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "12px" }}><Wallet size={24} color="#475569" /></div>
        </div>
      </div>

      {/* TABLE */}
      <div className="glass-panel" style={{ background: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <Table
          headers={[
            <div key="select-all-cash" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <input
                type="checkbox"
                checked={filteredEntries.length > 0 && filteredEntries.every(b => selectedCashIds.includes(b.id || b._id))}
                onChange={() => {
                  const visibleIds = filteredEntries.map(b => b.id || b._id).filter(Boolean);
                  const allSelected = visibleIds.every(id => selectedCashIds.includes(id));
                  if (allSelected) {
                    setSelectedCashIds(prev => prev.filter(id => !visibleIds.includes(id)));
                  } else {
                    setSelectedCashIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                  }
                }}
                style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#16a34a" }}
                title="Toggle Select All"
              />
            </div>,
            "Date", "Type", "Amount", "Party", "Remarks", "Voucher", "Actions"
          ]}
          data={filteredEntries}
          loading={loading}
          pagination={true}
          renderRow={(item, index) => {
            const itemId = item.id || item._id;
            const isSelected = selectedCashIds.includes(itemId);
            const isIncome = item.type === "in" || item.type === "income";
            const fileUrl = getSafeCloudinaryPdfUrl(item.cloudinaryUrl || item.voucherUrl || (item.fileName ? `${API.replace('/api', '')}/uploads/${item.fileName}` : null));

            return (
              <tr key={itemId || index} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "0.9rem", opacity: item.isOfflinePending ? 0.7 : 1, backgroundColor: isSelected ? "rgba(22, 163, 74, 0.08)" : undefined }}>
                <td style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelectCash(itemId)}
                    style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#16a34a" }}
                  />
                </td>
                <td style={{ padding: "1rem", color: "#475569" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Calendar size={14} /> {item.date ? formatDate(item.date) : "-"}
                    {item.isOfflinePending && (
                      <Clock size={14} color="#f59e0b" title="Pending Sync (Offline)" />
                    )}
                  </div>
                </td>
                
                <td style={{ padding: "1rem" }}>
                  <span 
                    style={{
                      padding: "0.35rem 0.75rem",
                      borderRadius: "20px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: isIncome ? "#dcfce7" : "#fef2f2",
                      color: isIncome ? "#16a34a" : "#ef4444",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px"
                    }}
                  >
                    {isIncome ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {isIncome ? "Cash In" : "Cash Out"}
                  </span>
                </td>

                <td style={{ padding: "1rem", fontWeight: 700, color: isIncome ? "#16a34a" : "#ef4444" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {isIncome ? "+" : "-"}<RupeeIcon size={14} /> {parseFloat(item.amount || 0).toFixed(2)}
                  </div>
                </td>

                <td style={{ padding: "1rem" }}>
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>{item.partyName || "—"}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.partyType || "Other"}</div>
                </td>

                <td style={{ padding: "1rem", color: "#334155" }}>
                  {item.remarks || <span style={{ color: "#94a3b8" }}>—</span>}
                </td>

                <td style={{ padding: "1rem" }}>
                  {fileUrl ? (
                    <button
                      disabled={item.isOfflinePending}
                      onClick={() => navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}&title=Cash%20Voucher%20Viewer`)}
                      style={{
                        background: "#f0f9ff",
                        border: "1px solid #bae6fd",
                        color: "#0369a1",
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
                      View Voucher
                    </button>
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: "0.8rem", fontStyle: "italic" }}>No document</span>
                  )}
                </td>

                <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
                        style={{ background: "transparent", border: "none", color: "#3b82f6", cursor: "pointer", padding: "4px" }}
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

      {/* QUICK ADD MODAL for Dropdowns */}
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

      {/* Unified Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Cash Sheet Statement"
        itemCount={selectedCashIds.length > 0 ? selectedCashIds.length : filteredEntries.length}
        subtitle={selectedCashIds.length > 0 
          ? `Exporting ${selectedCashIds.length} selected cash entry(ies)` 
          : (filterSearch || filterPartyType !== 'All' || filterType !== 'All' ? `Exporting ${filteredEntries.length} filtered cash entry(ies)` : `Exporting all ${filteredEntries.length} cash entries`)}
        isExporting={isExporting}
        onExport={handleExecuteExport}
      />
    </div>
  );
};

export default CashSheet;
