import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Table from "../components/Table";
import { 
  Plus, 
  FileText, 
  CheckCircle, 
  Trash2, 
  AlertCircle, 
  Eye, 
  X,
  Calendar, 
  RefreshCw,
  ExternalLink,
  Camera,
  Image as ImageIcon,
  Banknote,
  TrendingUp,
  TrendingDown,
  Wallet
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from '../utils/formatters';
import PODImageStudioModal from "../components/pod/PODImageStudioModal";
import RupeeIcon from '../components/RupeeIcon';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const CashSheet = () => {
  const { user } = useContext(AuthContext);
  const { confirm, alert: alertDialog } = useDialog();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in' || user?.role === 'admin';

  // Data states
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal / Add Form states
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // { name, type, dataUrl }
  
  // Form State
  const [formData, setFormData] = useState({
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    type: "in",
    remarks: ""
  });

  // Box Image Studio Modal state
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioMode, setStudioMode] = useState("camera"); // 'camera' | 'editor'
  const [studioInitialSrc, setStudioInitialSrc] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/cash`);
      if (res.data.success) {
        setEntries(res.data.data || []);
      }
    } catch (err) { 
      console.error("Fetch cash error", err); 
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
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
      alertDialog({ title: "Invalid Amount", message: "Please enter a valid positive amount." });
      return;
    }

    setUploading(true);
    try {
      const payload = {
        amount: parseFloat(formData.amount),
        date: formData.date,
        type: formData.type,
        remarks: formData.remarks,
        fileName: selectedFile ? selectedFile.name : null,
        fileData: selectedFile ? selectedFile.dataUrl : null,
      };

      const res = await axios.post(`${API}/cash`, payload);
      if (res.data.success) {
        await fetchData();
        // Reset form
        setFormData({
          amount: "",
          date: new Date().toISOString().slice(0, 10),
          type: "in",
          remarks: ""
        });
        setSelectedFile(null);
        setIsAdding(false);
      } else {
        alertDialog({ title: "Error", message: res.data.message || "Failed to save entry." });
      }
    } catch (err) {
      console.error("Save cash entry error", err);
      alertDialog({ title: "Error", message: "An error occurred while saving." });
    } finally {
      setUploading(false);
    }
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
    const totalIncome = entries.filter(e => e.type === "in" || e.type === "income").reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const totalExpense = entries.filter(e => e.type === "out" || e.type === "expense").reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const netBalance = totalIncome - totalExpense;
    return { totalIncome, totalExpense, netBalance };
  }, [entries]);

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

        <div style={{ display: "flex", gap: "0.5rem" }}>
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
                      <button
                        type="submit"
                        disabled={uploading || !formData.amount}
                        style={{
                          width: "100%",
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
                          opacity: uploading || !formData.amount ? 0.5 : 1
                        }}
                      >
                        <Plus size={18} />
                        {uploading ? "Saving Entry..." : `Record Cash ${formData.type === "in" ? "In" : "Out"}`}
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
          headers={["Date", "Type", "Amount", "Remarks", "Voucher", "Actions"]}
          data={entries}
          loading={loading}
          pagination={true}
          renderRow={(item, index) => {
            const isIncome = item.type === "in" || item.type === "income";
            const fileUrl = item.cloudinaryUrl || item.voucherUrl || (item.fileName ? `${API}/uploads/${item.fileName}` : null);

            return (
              <tr key={item.id || index} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "0.9rem" }}>
                <td style={{ padding: "1rem", color: "#475569" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Calendar size={14} /> {item.date ? formatDate(item.date) : "-"}
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

                <td style={{ padding: "1rem", color: "#334155" }}>
                  {item.remarks || <span style={{ color: "#94a3b8" }}>—</span>}
                </td>

                <td style={{ padding: "1rem" }}>
                  {fileUrl ? (
                    <button
                      onClick={() => navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}&title=Cash%20Voucher%20Viewer`)}
                      style={{
                        background: "#f0f9ff",
                        border: "1px solid #bae6fd",
                        color: "#0369a1",
                        padding: "0.4rem 0.85rem",
                        borderRadius: "6px",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
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
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#475569", padding: "4px", display: "inline-flex", textDecoration: "none" }}
                        title="Open in new tab"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                    {isSuperAdmin && (
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

      {/* STUDIO MODAL */}
      <PODImageStudioModal
        isOpen={studioOpen}
        onClose={() => setStudioOpen(false)}
        initialMode={studioMode}
        initialImageSrc={studioInitialSrc}
        onSave={handleStudioSave}
      />
    </div>
  );
};

export default CashSheet;
