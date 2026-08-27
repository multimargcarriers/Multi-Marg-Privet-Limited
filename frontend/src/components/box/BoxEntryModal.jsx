import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { 
  X, 
  Camera, 
  Image as ImageIcon, 
  CheckCircle, 
  FileText, 
  Loader2, 
  Sparkles, 
  ExternalLink,
  FileCheck,
  Check
} from "lucide-react";
import { motion } from "framer-motion";
import PODImageStudioModal from "../pod/PODImageStudioModal";
import { useDialog } from "../../context/DialogContext";
import { getSafeCloudinaryPdfUrl } from "../../utils/formatters";
import { compressImage } from "../../utils/imageCompressor";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const BoxEntryModal = ({
  isOpen,
  onClose,
  booking,
  existingBox = null,
  onSuccess
}) => {
  const { alert: alertDialog } = useDialog();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [remarks, setRemarks] = useState(existingBox?.remarks || "");
  const [isSaving, setIsSaving] = useState(false);

  // Studio states for Camera & Image Cropping
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioMode, setStudioMode] = useState("camera"); // 'camera' | 'editor'
  const [studioSrc, setStudioSrc] = useState(null);

  if (!isOpen || !booking) return null;

  const awbNo = booking.awb || booking.awbNo || booking.awb_no || booking.consignment || booking.consignmentNo || booking.lrNo || booking.lr_no || booking.lrNumber || booking.docketNo || booking.docket_no || (booking.id && String(booking.id).length <= 10 ? booking.id : (booking.id ? String(booking.id).slice(-6).toUpperCase() : "UNKNOWN"));

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
      const compressed = await compressImage(file, {
        maxDimension: 1920,
        targetMaxBytes: 700 * 1024,
        initialQuality: 0.85
      });
      setStudioSrc(compressed.dataUrl);
      setStudioMode("editor");
      setStudioOpen(true);
    }
  };

  const handleOpenCamera = () => {
    setStudioSrc(null);
    setStudioMode("camera");
    setStudioOpen(true);
  };

  const handleStudioSave = async (editedDataUrl, filename) => {
    const compressed = await compressImage(editedDataUrl, {
      maxDimension: 1920,
      targetMaxBytes: 700 * 1024,
      initialQuality: 0.85
    });

    setSelectedFile({
      name: filename || `Box_${awbNo}_${Date.now()}.png`,
      type: "image",
      dataUrl: compressed.dataUrl
    });
    setStudioOpen(false);
  };

  const handleSaveBox = async () => {
    if (!selectedFile && !existingBox) {
      alertDialog({
        title: "Proof Required",
        message: "Please capture a camera photo or select a document image/PDF to verify delivery."
      });
      return;
    }

    setIsSaving(true);
    try {
      if (selectedFile) {
        const payload = {
          lrNo: awbNo,
          fileName: selectedFile.name,
          fileData: selectedFile.dataUrl,
          boxType: "VERIFIED",
          bookingId: booking.id || null,
          consignor: booking.consignor || "-",
          consignee: booking.consignee || "-",
          origin: booking.origin || "-",
          destination: booking.destination || "-",
          client: booking.client || booking.billedTo || "-",
          remarks: remarks.trim()
        };

        const res = await axios.post(`${API}/box`, payload);
        if (res.data.success) {
          alertDialog({
            title: "Box Verified & Uploaded",
            message: `Box Upload Document successfully attached to LR #${awbNo}.`
          });
          if (onSuccess) onSuccess(res.data.data);
          onClose();
        } else {
          throw new Error(res.data.message || "Failed to save Box document.");
        }
      } else if (existingBox) {
        alertDialog({
          title: "Box Already Verified",
          message: `LR #${awbNo} already has an active Box Upload Document document attached.`
        });
        onClose();
      }
    } catch (err) {
      console.error("Save Box Error:", err);
      alertDialog({
        title: "Upload Failed",
        message: err.response?.data?.message || err.message || "Could not save Box Upload Document."
      });
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal((
    <div 
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem"
      }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        style={{
          backgroundColor: "white",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* MODAL HEADER */}
        <div 
          style={{ 
            padding: "1.25rem 1.5rem", 
            borderBottom: "1px solid #f1f5f9", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between",
            background: "linear-gradient(to right, #f8fafc, #ffffff)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div 
              style={{ 
                background: "#e0f2fe", 
                padding: "10px", 
                borderRadius: "12px", 
                color: "#0284c7",
                display: "flex"
              }}
            >
              <FileCheck size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
                Enterprise Box Upload Submission
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                Box Upload Document Attachment & Verification Studio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#475569"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          
          {/* LR VERIFICATION BADGE CARD */}
          <div 
            style={{ 
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", 
              borderRadius: "14px", 
              padding: "1.1rem 1.35rem", 
              color: "white",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "1rem",
              boxShadow: "0 10px 20px -5px rgba(2, 132, 199, 0.25)"
            }}
          >
            <div>
              <div style={{ fontSize: "0.725rem", textTransform: "uppercase", opacity: 0.85, fontWeight: 600 }}>
                LR / AWB NUMBER
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, marginTop: "2px" }}>
                #{awbNo}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.725rem", textTransform: "uppercase", opacity: 0.85, fontWeight: 600 }}>
                CLIENT / CONSIGNOR
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 700, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {String(booking.client || booking.consignor || "STANDARD CLIENT").toUpperCase()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.725rem", textTransform: "uppercase", opacity: 0.85, fontWeight: 600 }}>
                ROUTE
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "2px" }}>
                {String(booking.origin || "-").toUpperCase()} &rarr; {String(booking.destination || "-").toUpperCase()}
              </div>
            </div>
          </div>

          {/* EXISTING BOX NOTICE IF ANY */}
          {existingBox && (
            <div 
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "12px",
                padding: "0.85rem 1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#166534" }}>
                <CheckCircle size={18} color="#16a34a" />
                <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                  Box Document Uploaded
                </span>
              </div>
              {existingBox.boxUrl && (
                <a
                  href={getSafeCloudinaryPdfUrl(existingBox.boxUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "#0284c7",
                    fontSize: "0.825rem",
                    fontWeight: 600,
                    textDecoration: "none"
                  }}
                >
                  View Document <ExternalLink size={13} />
                </a>
              )}
            </div>
          )}

          {/* UPLOAD / ATTACH SECTION */}
          <div>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.6rem" }}>
              1. Attach Box Upload Document
            </label>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              style={{ display: "none" }}
            />

            {!selectedFile ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={handleOpenCamera}
                  style={{
                    background: "#f8fafc",
                    border: "2px dashed #cbd5e1",
                    borderRadius: "14px",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = "#0284c7"; e.currentTarget.style.background = "#f0f9ff"; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.background = "#f8fafc"; }}
                >
                  <div style={{ background: "#0284c7", color: "white", padding: "10px", borderRadius: "50%" }}>
                    <Camera size={20} />
                  </div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                    Scan with Camera
                  </span>
                  <span style={{ fontSize: "0.725rem", color: "#64748b" }}>
                    Auto-crop & enhance
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: "#f8fafc",
                    border: "2px dashed #cbd5e1",
                    borderRadius: "14px",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = "#0284c7"; e.currentTarget.style.background = "#f0f9ff"; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.background = "#f8fafc"; }}
                >
                  <div style={{ background: "#f1f5f9", color: "#475569", padding: "10px", borderRadius: "50%" }}>
                    <ImageIcon size={20} />
                  </div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                    Choose Gallery / PDF
                  </span>
                  <span style={{ fontSize: "0.725rem", color: "#64748b" }}>
                    JPG, PNG, WebP or PDF
                  </span>
                </button>
              </div>
            ) : (
              <div 
                style={{
                  background: "#f0fdf4",
                  border: "1.5px solid #86efac",
                  borderRadius: "12px",
                  padding: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {selectedFile.type === "pdf" ? (
                    <div style={{ background: "#dcfce7", padding: "10px", borderRadius: "10px" }}>
                      <FileText size={24} color="#16a34a" />
                    </div>
                  ) : (
                    <img
                      src={selectedFile.dataUrl}
                      alt="Box Preview"
                      style={{ width: "54px", height: "54px", objectFit: "cover", borderRadius: "8px", border: "1px solid #bbf7d0" }}
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, color: "#166534", fontSize: "0.95rem" }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#15803d", marginTop: "2px" }}>
                      Ready to attach to LR #{awbNo}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  style={{
                    background: "white",
                    border: "1px solid #bbf7d0",
                    color: "#166534",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Change File
                </button>
              </div>
            )}
          </div>

          {/* RECEIVING REMARKS */}
          <div>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.4rem" }}>
              2. Receiving Remarks / Note
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g., Box packaging verified in good condition..."
              rows={2}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                fontSize: "0.9rem",
                fontFamily: "inherit",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* HEARTFELT WISHES CARD */}
          <div 
            style={{
              background: "linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)",
              borderRadius: "12px",
              padding: "0.85rem 1rem",
              border: "1px solid #fde68a",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#92400e"
            }}
          >
            <Sparkles size={20} color="#d97706" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: "0.825rem", lineHeight: "1.4" }}>
              <strong>Thank you for your dedicated service!</strong> Wishing you and your team smooth operations, safe journeys, and seamless deliveries every single day.
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div 
          style={{ 
            padding: "1.1rem 1.5rem", 
            borderTop: "1px solid #f1f5f9", 
            background: "#f8fafc", 
            display: "flex", 
            justifyContent: "flex-end", 
            gap: "0.75rem" 
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              background: "white",
              color: "#475569",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSaveBox}
            disabled={isSaving}
            style={{
              padding: "0.65rem 1.5rem",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              color: "white",
              fontWeight: 800,
              cursor: isSaving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.9rem",
              boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
              letterSpacing: "0.02em"
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="spinner" /> SAVING DOCUMENT...
              </>
            ) : (
              <>
                <Check size={18} /> SAVE BOX UPLOAD DOCUMENT
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* STUDIO MODAL FOR CAMERA / CROPPING */}
      <PODImageStudioModal
        isOpen={studioOpen}
        onClose={() => setStudioOpen(false)}
        initialMode={studioMode}
        initialImageSrc={studioSrc}
        onSave={handleStudioSave}
      />
    </div>
  ), document.body);
};

export default BoxEntryModal;
