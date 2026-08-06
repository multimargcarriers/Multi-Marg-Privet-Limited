import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Table from "../components/Table";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Trash2, 
  AlertCircle, 
  Search, 
  Eye, 
  X, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  HelpCircle, 
  Calendar, 
  RefreshCw, 
  ExternalLink,
  Info,
  Filter,
  FileCheck,
  Camera,
  Image as ImageIcon,
  Wand2,
  Sliders,
  RotateCw
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from '../utils/formatters';
import PODImageStudioModal from "../components/pod/PODImageStudioModal";

const UploadBox = () => {
  const { user } = useContext(AuthContext);
  const { confirm, alert: alertDialog } = useDialog();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in' || user?.role === 'admin';

  // Data states
  const [boxList, setBoxList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal / Add Form states
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // { name, type, dataUrl }
  
  // LR Unified Smart Auto-Select State
  const [lrInput, setLrInput] = useState("");
  const [selectedLR, setSelectedLR] = useState(null); // explicitly clicked from dropdown or auto-matched
  const [remarks, setRemarks] = useState("");

  // Table Filter states
  const [tableSearch, setTableSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL"); // 'ALL' | 'VERIFIED' | 'UNKNOWN'
  const [previewImage, setPreviewImage] = useState(null); // URL for modal preview

  // Box Image Studio Modal state
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioMode, setStudioMode] = useState("camera"); // 'camera' | 'editor'
  const [studioInitialSrc, setStudioInitialSrc] = useState(null);

  const fileInputRef = useRef(null);
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchBoxes(), fetchBookings()]);
    setLoading(false);
  };

  const fetchBoxes = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/box`);
      if (res.data.success) {
        setBoxList(res.data.data || []);
      }
    } catch (err) {
      console.error("Fetch Box error", err);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/bookings?worldwide=true`);
      if (res.data.success) {
        setBookingsList(res.data.data || []);
      }
    } catch (err) {
      console.error("Fetch Bookings error", err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBoxes(), fetchBookings()]);
    setRefreshing(false);
  };

  // Helper to extract LR/AWB number cleanly
  const getBookingAwb = (b) => {
    if (!b) return "";
    return b.awb || b.consignment || b.lrNo || b.lr_number || b.lrNumber || b.awbNo || (b.id ? String(b.id).slice(-6) : "");
  };

  // Smart auto-detect if typed LR exists in database
  const matchedLR = useMemo(() => {
    if (selectedLR) return selectedLR;
    if (!lrInput || !lrInput.trim()) return null;
    const clean = lrInput.trim().toLowerCase();
    return bookingsList.find(b => getBookingAwb(b).toLowerCase() === clean) || null;
  }, [selectedLR, lrInput, bookingsList]);

  // Filtered LRs for autocomplete search in modal
  const filteredLRs = useMemo(() => {
    if (!lrInput || lrInput.trim().length === 0) return [];
    const q = lrInput.toLowerCase().trim();
    return bookingsList.filter(b => {
      const awb = getBookingAwb(b).toLowerCase();
      const client = (b.client || b.billedTo || b.billing_party || "").toLowerCase();
      const consignor = (b.consignor || "").toLowerCase();
      const consignee = (b.consignee || "").toLowerCase();
      const origin = (b.origin || "").toLowerCase();
      const destination = (b.destination || "").toLowerCase();
      return (
        awb.includes(q) ||
        client.includes(q) ||
        consignor.includes(q) ||
        consignee.includes(q) ||
        origin.includes(q) ||
        destination.includes(q)
      );
    }).slice(0, 10);
  }, [bookingsList, lrInput]);

  // Handle selecting an LR from the search dropdown
  const handleSelectLR = (booking) => {
    setSelectedLR(booking);
    setLrInput(getBookingAwb(booking));
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
      // PDF: accept immediately without cropping studio
      const dataUrl = await fileToDataURL(file);
      setSelectedFile({
        name: file.name,
        type: "pdf",
        dataUrl
      });
    } else {
      // Image: open in POD Image Studio Editor for cropping/rotation/enhancement
      const dataUrl = await fileToDataURL(file);
      setStudioInitialSrc(dataUrl);
      setStudioMode("editor");
      setStudioOpen(true);
    }
  };

  // Open Live Camera Scanner
  const handleOpenCamera = () => {
    setStudioInitialSrc(null);
    setStudioMode("camera");
    setStudioOpen(true);
  };

  // Callback from Box Image Studio when user saves edited/captured image
  const handleStudioSave = (editedDataUrl, filename) => {
    setSelectedFile({
      name: filename || `Box_Capture_${Date.now()}.jpg`,
      type: "image",
      dataUrl: editedDataUrl
    });
  };

  // Upload Box form submission
  const handleUpload = async (e) => {
    e.preventDefault();
    const finalLrNo = (matchedLR ? getBookingAwb(matchedLR) : lrInput).trim();

    if (!finalLrNo) {
      alertDialog({
        title: "LR Number Required",
        message: "Please enter an LR or AWB number.",
      });
      return;
    }

    if (!selectedFile || !selectedFile.dataUrl) {
      alertDialog({
        title: "Proof Document Required",
        message: "Please take a camera photo or select an image/PDF file as Box Document.",
      });
      return;
    }

    setUploading(true);
    try {
      const payload = {
        lrNo: finalLrNo,
        fileName: selectedFile.name,
        fileData: selectedFile.dataUrl,
        boxType: matchedLR ? "VERIFIED" : "UNKNOWN",
        bookingId: matchedLR ? matchedLR.id : null,
        consignor: matchedLR ? (matchedLR.consignor || "-") : "-",
        consignee: matchedLR ? (matchedLR.consignee || "-") : "-",
        origin: matchedLR ? (matchedLR.origin || "-") : "-",
        destination: matchedLR ? (matchedLR.destination || "-") : "-",
        client: matchedLR ? (matchedLR.client || matchedLR.billedTo || "-") : "-",
        remarks: remarks.trim()
      };

      const res = await axios.post(`${apiUrl}/api/box`, payload);
      if (res.data.success) {
        await fetchBoxes();
        // Reset form
        setSelectedFile(null);
        setSelectedLR(null);
        setLrInput("");
        setRemarks("");
        setIsAdding(false);
      } else {
        alertDialog({
          title: "Upload Failed",
          message: res.data.message || "Could not upload Box. Please try again.",
        });
      }
    } catch (err) {
      console.error("Upload Box error", err);
      alertDialog({
        title: "Error",
        message: "An error occurred while uploading the Box Document document.",
      });
    } finally {
      setUploading(false);
    }
  };

  // Delete Box
  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Box Document",
      message: "Are you sure you want to delete this Box Document? This will also remove the uploaded image from Cloudinary.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;

    setBoxList(prev => prev.filter(p => p.id !== id));
    try {
      await axios.delete(`${apiUrl}/api/box/${id}`);
    } catch (err) {
      console.error("Delete Box error", err);
      fetchBoxes();
    }
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const total = boxList.length;
    const verifiedCount = boxList.filter(p => (p.boxType === "VERIFIED" || p.bookingId || p.consignor !== "-" || p.origin !== "-")).length;
    const unknownCount = total - verifiedCount;
    
    // Uploaded today
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCount = boxList.filter(p => {
      const dt = p.uploadedAt || p.createdAt;
      return dt && dt.startsWith(todayStr);
    }).length;

    return { total, verifiedCount, unknownCount, todayCount };
  }, [boxList]);

  // Table filtering
  const filteredBoxes = useMemo(() => {
    return boxList.filter(item => {
      // Tab filter
      const isVerified = (item.boxType === "VERIFIED" || item.bookingId || (item.origin && item.origin !== "-"));
      if (activeTab === "VERIFIED" && !isVerified) return false;
      if (activeTab === "UNKNOWN" && isVerified) return false;

      // Search query filter
      if (!tableSearch || tableSearch.trim().length === 0) return true;
      const q = tableSearch.toLowerCase().trim();
      return (
        (item.lrNo && String(item.lrNo).toLowerCase().includes(q)) ||
        (item.client && String(item.client).toLowerCase().includes(q)) ||
        (item.consignor && String(item.consignor).toLowerCase().includes(q)) ||
        (item.consignee && String(item.consignee).toLowerCase().includes(q)) ||
        (item.origin && String(item.origin).toLowerCase().includes(q)) ||
        (item.destination && String(item.destination).toLowerCase().includes(q)) ||
        (item.fileName && String(item.fileName).toLowerCase().includes(q)) ||
        (item.remarks && String(item.remarks).toLowerCase().includes(q))
      );
    });
  }, [boxList, activeTab, tableSearch]);

  const getFileUrl = (item) => {
    if (item.boxUrl) return item.boxUrl;
    if (item.cloudinaryUrl) return item.cloudinaryUrl;
    return `${apiUrl}/api/uploads/box/${item.fileName || item.filename}`;
  };

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "20px" }}>
      {/* COMPACT SLEEK HEADER BAR */}
      <div 
        className="box-header-bar"
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
          <div style={{ background: "#f0f9ff", padding: "8px", borderRadius: "10px", display: "flex" }}>
            <FileCheck size={22} style={{ color: "#0284c7" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, color: "#0f172a" }}>
              Box Upload (Damage/Weight)
            </h3>
            <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 500 }}>
              Verify and manage receiving slips
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
              onClick={() => { setIsAdding(true); setSelectedLR(null); setLrInput(""); setSelectedFile(null); }}
              style={{
                background: "#0284c7",
                color: "white",
                border: "none",
                padding: "0.45rem 1rem",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 6px rgba(2, 132, 199, 0.2)",
                fontSize: "0.825rem"
              }}
            >
              <Upload size={15} />
              + Upload Box
            </button>
          )}
        </div>
      </div>

      {/* FULL-WIDTH ENTERPRISE Box UPLOAD CONSOLE */}
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
                marginTop: "0",
                marginBottom: "1rem",
                width: "100%",
                boxSizing: "border-box",
                overflow: "hidden"
              }}
            >
              {/* TOP ACCENT BAR & HEADER */}
              <div style={{ background: "linear-gradient(90deg, #0284c7 0%, #0369a1 50%, #0c4a6e 100%)", height: "4px", width: "100%" }} />
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
                  <div style={{ background: "#e0f2fe", padding: "10px", borderRadius: "12px", color: "#0284c7", display: "flex" }}>
                    <Upload size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700", color: "#0f172a" }}>
                      New Box Upload (Damage/Weight) Entry
                    </h4>
                    <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
                      Enter LR number, attach receiving proof document, and save to system
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {lrInput.trim().length > 0 && (
                    <span 
                      style={{
                        background: matchedLR ? "#dcfce7" : "#fef3c7",
                        color: matchedLR ? "#166534" : "#b45309",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      {matchedLR ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      {matchedLR ? "AUTO VERIFIED BOOKING" : "STANDALONE / UNKNOWN LR"}
                    </span>
                  )}
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
                      color: "#64748b",
                      transition: "all 0.15s"
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* FULL-WIDTH 3-COLUMN WORKFLOW GRID */}
              <form onSubmit={handleUpload}>
                <div 
                  className="box-workflow-grid"
                  style={{
                    padding: "1.75rem",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
                    gap: "1.75rem",
                    alignItems: "start"
                  }}
                >
                  {/* COLUMN 1: LR / AWB NUMBER & MATCH PREVIEW */}
                  <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.85rem" }}>
                      <Search size={18} color="#0284c7" />
                      <label style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>
                        1. LR / AWB Number <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                    </div>

                    <div style={{ position: "relative", marginBottom: "1rem" }}>
                      <input
                        type="text"
                        placeholder="Type LR No, Client, Consignor, Route..."
                        value={lrInput}
                        onChange={(e) => {
                          setLrInput(e.target.value);
                          setSelectedLR(null);
                        }}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          paddingLeft: "2.5rem",
                          borderRadius: "10px",
                          border: matchedLR ? "2px solid #22c55e" : "1.5px solid #cbd5e1",
                          fontSize: "0.95rem",
                          outline: "none",
                          boxSizing: "border-box",
                          background: "white",
                          fontWeight: 500
                        }}
                      />
                      <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />

                      {/* AUTOCOMPLETE DROPDOWN */}
                      {lrInput.trim().length > 0 && !selectedLR && filteredLRs.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            background: "white",
                            border: "1px solid #cbd5e1",
                            borderRadius: "10px",
                            marginTop: "6px",
                            maxHeight: "260px",
                            overflowY: "auto",
                            zIndex: 50,
                            boxShadow: "0 15px 25px rgba(0,0,0,0.12)"
                          }}
                        >
                          {filteredLRs.map((booking) => {
                            const awb = getBookingAwb(booking);
                            return (
                              <div
                                key={booking.id}
                                onClick={() => {
                                  setLrInput(awb);
                                  setSelectedLR(booking);
                                }}
                                style={{
                                  padding: "0.75rem 1rem",
                                  borderBottom: "1px solid #f1f5f9",
                                  cursor: "pointer",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center"
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f0f9ff")}
                                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "white")}
                              >
                                <div>
                                  <div style={{ fontWeight: 700, color: "#0369a1", fontSize: "0.9rem" }}>{awb}</div>
                                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
                                    {booking.origin} → {booking.destination} • <b>{booking.consignor || "-"}</b> to <b>{booking.consignee || "-"}</b>
                                  </div>
                                </div>
                                <span style={{ background: "#e0f2fe", color: "#0284c7", padding: "4px 8px", borderRadius: "6px", fontWeight: 700, fontSize: "0.75rem" }}>Select</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* LIVE BOOKING STATUS CARD */}
                    {lrInput.trim().length > 0 ? (
                      matchedLR ? (
                        <div style={{ background: "white", borderRadius: "10px", padding: "1rem", border: "1.5px solid #86efac", boxShadow: "0 2px 5px rgba(22, 163, 74, 0.08)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#166534", fontWeight: 700, fontSize: "0.85rem", marginBottom: "6px" }}>
                            <CheckCircle size={16} /> Verified Database Booking
                          </div>
                          <div style={{ fontSize: "0.82rem", color: "#334155", lineHeight: "1.5" }}>
                            <div><b>Route:</b> {matchedLR.origin} → {matchedLR.destination}</div>
                            <div><b>Consignor:</b> {matchedLR.consignor || "-"}</div>
                            <div><b>Consignee:</b> {matchedLR.consignee || "-"}</div>
                            <div><b>Client:</b> {matchedLR.client || matchedLR.billedTo || "-"}</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: "white", borderRadius: "10px", padding: "1rem", border: "1.5px solid #fde68a", boxShadow: "0 2px 5px rgba(217, 119, 6, 0.08)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#b45309", fontWeight: 700, fontSize: "0.85rem", marginBottom: "6px" }}>
                            <AlertCircle size={16} /> Offline / Standalone LR Entry
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#78350f", lineHeight: "1.4" }}>
                            No active booking matched <b>"{lrInput.trim()}"</b> in MongoDB. This Box will be saved under <b>Unknown Type</b> until linked.
                          </div>
                        </div>
                      )
                    ) : (
                      <div style={{ background: "white", borderRadius: "10px", padding: "1rem", border: "1px dashed #cbd5e1", textAlign: "center", color: "#64748b", fontSize: "0.82rem" }}>
                        Start typing an LR / AWB number above to automatically check against database bookings.
                      </div>
                    )}
                  </div>

                  {/* COLUMN 2: PROOF DOCUMENT CAPTURE / UPLOAD */}
                  <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.85rem" }}>
                      <ImageIcon size={18} color="#0284c7" />
                      <label style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>
                        2. Box Document Document <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      style={{ display: "none" }}
                    />

                    {!selectedFile ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                        <button
                          type="button"
                          onClick={handleOpenCamera}
                          style={{
                            background: "white",
                            color: "#0369a1",
                            border: "1.5px solid #bae6fd",
                            padding: "1.25rem 0.75rem",
                            borderRadius: "12px",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                            transition: "all 0.15s",
                            boxShadow: "0 2px 6px rgba(2, 132, 199, 0.08)"
                          }}
                        >
                          <div style={{ background: "#e0f2fe", padding: "10px", borderRadius: "50%", color: "#0284c7", display: "flex" }}>
                            <Camera size={22} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Camera Scanner</span>
                          <span style={{ fontSize: "0.72rem", color: "#64748b", textAlign: "center" }}>Live photo capture & enhancement</span>
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
                            gap: "8px",
                            transition: "all 0.15s"
                          }}
                        >
                          <div style={{ background: "#f1f5f9", padding: "10px", borderRadius: "50%", color: "#64748b", display: "flex" }}>
                            <ImageIcon size={22} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Browse Files</span>
                          <span style={{ fontSize: "0.72rem", color: "#64748b", textAlign: "center" }}>Select JPG, PNG, or PDF</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ background: "white", borderRadius: "10px", padding: "1rem", border: "1.5px solid #0284c7", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                          {selectedFile.type === "pdf" ? (
                            <div style={{ background: "#fee2e2", padding: "12px", borderRadius: "8px", color: "#dc2626" }}>
                              <FileText size={24} />
                            </div>
                          ) : (
                            <img
                              src={selectedFile.dataUrl}
                              alt="Box Preview"
                              style={{ width: "56px", height: "56px", objectFit: "cover", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                            />
                          )}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>{selectedFile.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 600, marginTop: "2px" }}>✓ Document ready for upload</div>
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
                                background: "#f0f9ff",
                                border: "1px solid #0284c7",
                                color: "#0369a1",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                cursor: "pointer"
                              }}
                            >
                              Edit / Enhance
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
                    )}
                  </div>

                  {/* COLUMN 3: REMARKS & SUBMIT ACTIONS */}
                  <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", boxSizing: "border-box" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.85rem" }}>
                        <FileCheck size={18} color="#0284c7" />
                        <label style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>
                          3. Receiving Remarks (Optional)
                        </label>
                      </div>

                      <input
                        type="text"
                        placeholder="e.g., Signed by Ramesh with stamp, 5 boxes OK..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "1px solid #cbd5e1",
                          borderRadius: "10px",
                          fontSize: "0.88rem",
                          outline: "none",
                          background: "white",
                          marginBottom: "1rem"
                        }}
                      />

                      {/* APPRECIATION & GOOD WISHES CARD */}
                      <div 
                        style={{
                          background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                          padding: "1rem 1.15rem",
                          borderRadius: "12px",
                          border: "1px solid #bbf7d0",
                          boxShadow: "0 2px 8px rgba(16, 185, 129, 0.06)",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px"
                        }}
                      >
                        <div style={{ background: "#dcfce7", padding: "8px", borderRadius: "10px", color: "#15803d", display: "flex", flexShrink: 0 }}>
                          <CheckCircle size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#14532d" }}>
                            Thank you for your hard work! 🌟
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#166534", marginTop: "4px", lineHeight: "1.4" }}>
                            Accurate Box records ensure smooth billing and happy clients. Wishing you a wonderful and successful day ahead!
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                      <button
                        type="button"
                        onClick={() => setIsAdding(false)}
                        style={{
                          flex: "1",
                          background: "white",
                          color: "#64748b",
                          border: "1px solid #cbd5e1",
                          padding: "0.75rem 1rem",
                          borderRadius: "10px",
                          fontWeight: 600,
                          fontSize: "0.88rem",
                          cursor: "pointer"
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={uploading || !lrInput.trim() || !selectedFile}
                        style={{
                          flex: "2",
                          background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                          color: "white",
                          border: "none",
                          padding: "0.75rem 1rem",
                          borderRadius: "10px",
                          fontWeight: 700,
                          fontSize: "0.88rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)",
                          opacity: uploading || !lrInput.trim() || !selectedFile ? 0.5 : 1
                        }}
                      >
                        <Upload size={16} />
                        {uploading ? "Saving..." : "Save Box Document"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ULTRA COMPACT SUMMARY CARDS */}
      <div 
        className="box-grid-stats"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0.75rem",
          marginBottom: "1.25rem"
        }}
      >
        <div style={{ background: "white", borderRadius: "10px", padding: "0.85rem 1rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.725rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Boxes</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{stats.total}</div>
          </div>
          <div style={{ background: "#f1f5f9", padding: "8px", borderRadius: "8px" }}><FileText size={18} color="#3b82f6" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "10px", padding: "0.85rem 1rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.725rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Verified LRs</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#10b981", marginTop: "2px" }}>{stats.verifiedCount}</div>
          </div>
          <div style={{ background: "#ecfdf5", padding: "8px", borderRadius: "8px" }}><CheckCircle size={18} color="#10b981" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "10px", padding: "0.85rem 1rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.725rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Unknown / Offline</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#f59e0b", marginTop: "2px" }}>{stats.unknownCount}</div>
          </div>
          <div style={{ background: "#fffbeb", padding: "8px", borderRadius: "8px" }}><AlertCircle size={18} color="#f59e0b" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "10px", padding: "0.85rem 1rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.725rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Uploaded Today</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#6366f1", marginTop: "2px" }}>{stats.todayCount}</div>
          </div>
          <div style={{ background: "#eef2ff", padding: "8px", borderRadius: "8px" }}><Calendar size={18} color="#6366f1" /></div>
        </div>
      </div>

      {/* FILTER BAR & CATEGORY TABS */}
      <div 
        className="box-filter-bar"
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          border: "1px solid #e2e8f0",
          marginBottom: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        {/* Category Tabs */}
        <div className="box-category-tabs" style={{ display: "flex", gap: "0.5rem" }}>
          {[
            { key: "ALL", label: "All Box Documents", count: stats.total },
            { key: "VERIFIED", label: "Verified LRs", count: stats.verifiedCount },
            { key: "UNKNOWN", label: "Unknown LR Type", count: stats.unknownCount }
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                background: activeTab === t.key ? "#0284c7" : "#f1f5f9",
                color: activeTab === t.key ? "white" : "#475569",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s"
              }}
            >
              {t.label}
              <span 
                style={{
                  background: activeTab === t.key ? "rgba(255,255,255,0.25)" : "#cbd5e1",
                  color: activeTab === t.key ? "white" : "#334155",
                  padding: "1px 7px",
                  borderRadius: "10px",
                  fontSize: "0.75rem",
                  fontWeight: 700
                }}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Live Search Table Filter */}
        <div style={{ position: "relative", minWidth: "280px" }}>
          <input
            type="text"
            placeholder="Search Boxes by LR, Client, Route, Remarks..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 1rem",
              paddingLeft: "2.5rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              outline: "none"
            }}
          />
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
        </div>
      </div>

      {/* Box LIST TABLE */}
      <div className="glass-panel" style={{ background: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <Table
          headers={["LR / AWB No", "Box Type", "Route", "Consignor → Consignee", "Client / Billed To", "Proof Document", "Remarks", "Upload Date", "Actions"]}
          data={filteredBoxes}
          loading={loading}
          pagination={true}
          renderRow={(item, index) => {
            const isVerified = (item.boxType === "VERIFIED" || item.bookingId || (item.origin && item.origin !== "-"));
            const fileUrl = getFileUrl(item);

            return (
              <tr key={item.id || index} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>
                {/* LR No */}
                <td style={{ padding: "1rem", fontWeight: 700, color: "#0284c7", whiteSpace: "nowrap" }}>
                  {item.lrNo}
                </td>

                {/* Box Type Badge */}
                <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>
                  {isVerified ? (
                    <span 
                      style={{
                        padding: "0.35rem 0.75rem",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        background: "#dcfce7",
                        color: "#166534",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      <CheckCircle size={14} />
                      Verified LR
                    </span>
                  ) : (
                    <span 
                      style={{
                        padding: "0.35rem 0.75rem",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        background: "#fef3c7",
                        color: "#b45309",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                      title="This Box was entered manually without matching an existing database LR"
                    >
                      <AlertCircle size={14} />
                      Unknown Type
                    </span>
                  )}
                </td>

                {/* Route */}
                <td style={{ padding: "1rem", whiteSpace: "nowrap", fontWeight: 600, color: "#334155" }}>
                  {item.origin && item.destination && item.origin !== "-" ? (
                    `${item.origin} → ${item.destination}`
                  ) : (
                    <span style={{ color: "#94a3b8" }}>—</span>
                  )}
                </td>

                {/* Consignor → Consignee */}
                <td style={{ padding: "1rem", color: "#475569" }}>
                  {item.consignor && item.consignee && item.consignor !== "-" ? (
                    <div>
                      <div><b>{item.consignor}</b></div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>→ {item.consignee}</div>
                    </div>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>—</span>
                  )}
                </td>

                {/* Client / Billed To */}
                <td style={{ padding: "1rem", color: "#334155", fontWeight: 600 }}>
                  {item.client && item.client !== "-" ? item.client : <span style={{ color: "#94a3b8" }}>—</span>}
                </td>

                {/* Proof Document Link / Preview */}
                <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>
                  <button
                    onClick={() => navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}&title=Box%20Document%20Viewer`)}
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
                    View Proof
                  </button>
                </td>

                {/* Remarks */}
                <td style={{ padding: "1rem", color: "#475569", maxWidth: "200px" }}>
                  {item.remarks ? (
                    <span style={{ fontStyle: "italic" }}>"{item.remarks}"</span>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>—</span>
                  )}
                </td>

                {/* Upload Date */}
                <td style={{ padding: "1rem", whiteSpace: "nowrap", color: "#64748b" }}>
                  {formatDate(item.uploadedAt || item.createdAt)}
                </td>

                {/* Actions */}
                <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#475569",
                        padding: "4px",
                        display: "inline-flex",
                        alignItems: "center",
                        textDecoration: "none"
                      }}
                      title="Open in new tab"
                    >
                      <ExternalLink size={16} />
                    </a>

                    {isSuperAdmin && (
                      <button 
                        onClick={() => handleDelete(item.id)}
                        style={{ 
                          background: "transparent", 
                          border: "none", 
                          color: "#dc2626", 
                          cursor: "pointer",
                          padding: "4px"
                        }}
                        title="Delete Box & Cloudinary Image"
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


      {/* PREMIUM Box IMAGE STUDIO MODAL (CAMERA & SCANNER EDITOR) */}
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

export default UploadBox;