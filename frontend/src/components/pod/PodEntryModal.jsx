import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { 
  X, 
  Upload, 
  Camera, 
  Image as ImageIcon, 
  CheckCircle, 
  FileText, 
  AlertCircle, 
  Loader2, 
  Heart, 
  Sparkles, 
  ExternalLink,
  FileCheck,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PODImageStudioModal from "./PODImageStudioModal";
import { useDialog } from "../../context/DialogContext";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const PodEntryModal = ({
  isOpen,
  onClose,
  booking,
  existingPod = null,
  onSuccess
}) => {
  const { alert: alertDialog } = useDialog();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [remarks, setRemarks] = useState(existingPod?.remarks || "");
  const [isSaving, setIsSaving] = useState(false);

  // Studio states for Camera & Image Cropping
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioMode, setStudioMode] = useState("camera"); // 'camera' | 'editor'
  const [studioSrc, setStudioSrc] = useState(null);

  if (!isOpen || !booking) return null;

  const awbNo = booking.awb || booking.lrNo || booking.id || "UNKNOWN";

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
      setStudioSrc(dataUrl);
      setStudioMode("editor");
      setStudioOpen(true);
    }
  };

  const handleOpenCamera = () => {
    setStudioSrc(null);
    setStudioMode("camera");
    setStudioOpen(true);
  };

  const handleStudioSave = (editedDataUrl, filename) => {
    setSelectedFile({
      name: filename || `POD_${awbNo}_${Date.now()}.png`,
      type: "image",
      dataUrl: editedDataUrl
    });
    setStudioOpen(false);
  };

  const handleSavePod = async () => {
    if (!selectedFile && !existingPod) {
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
          podType: "VERIFIED",
          bookingId: booking.id || null,
          consignor: booking.consignor || "-",
          consignee: booking.consignee || "-",
          origin: booking.origin || "-",
          destination: booking.destination || "-",
          client: booking.client || booking.billedTo || "-",
          remarks: remarks.trim()
        };

        const res = await axios.post(`${API}/pod`, payload);
        if (res.data.success) {
          alertDialog({
            title: "POD Verified & Uploaded",
            message: `Proof of Delivery successfully attached to LR #${awbNo}.`
          });
          if (onSuccess) onSuccess(res.data.data);
          onClose();
        } else {
          throw new Error(res.data.message || "Failed to save POD.");
        }
      } else if (existingPod) {
        alertDialog({
          title: "POD Already Verified",
          message: `LR #${awbNo} already has an active Proof of Delivery document attached.`
        });
        onClose();
      }
    } catch (err) {
      console.error("Save POD Error:", err);
      alertDialog({
        title: "Upload Failed",
        message: err.response?.data?.message || err.message || "Could not save Proof of Delivery."
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
                Enterprise POD Submission
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                Proof of Delivery Attachment & Verification Studio
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
                LR / AWB Number
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, marginTop: "2px" }}>
                #{awbNo}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.725rem", textTransform: "uppercase", opacity: 0.85, fontWeight: 600 }}>
                Client / Consignor
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 700, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {booking.client || booking.consignor || "Standard Client"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.725rem", textTransform: "uppercase", opacity: 0.85, fontWeight: 600 }}>
                Route
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "2px" }}>
                {booking.origin || "-"} &rarr; {booking.destination || "-"}
              </div>
            </div>
          </div>

          {/* EXISTING POD NOTICE IF ANY */}
          {existingPod && (
            <div 
              style={{
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: "12px",
                padding: "0.85rem 1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.5rem"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#065f46", fontSize: "0.875rem", fontWeight: 600 }}>
                <CheckCircle size={18} color="#10b981" />
                This LR already has a Verified POD attached.
              </div>
              {existingPod.cloudinaryUrl && (
                <a 
                  href={existingPod.cloudinaryUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.825rem",
                    color: "#059669",
                    fontWeight: 700,
                    textDecoration: "none"
                  }}
                >
                  View Document <ExternalLink size={14} />
                </a>
              )}
            </div>
          )}

          {/* DOCUMENT CAPTURE OPTIONS */}
          <div>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.75rem" }}>
              1. Attach Verified Proof Document <span style={{ color: "#ef4444" }}>*</span>
            </label>

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
                    padding: "1.2rem 0.75rem",
                    borderRadius: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s"
                  }}
                >
                  <Camera size={26} color="#0284c7" />
                  <div>Camera Scanner</div>
                  <span style={{ fontSize: "0.725rem", fontWeight: 500, color: "#64748b" }}>
                    Live Capture & Image Studio
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: "white",
                    color: "#334155",
                    border: "1.5px solid #cbd5e1",
                    padding: "1.2rem 0.75rem",
                    borderRadius: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s"
                  }}
                >
                  <ImageIcon size={26} color="#475569" />
                  <div>Gallery / Device File</div>
                  <span style={{ fontSize: "0.725rem", fontWeight: 500, color: "#64748b" }}>
                    Browse Image or PDF
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
                      alt="POD Preview"
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
              2. Receiving Remarks / Delivery Note
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g., Delivered in good condition, signed by receiver..."
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
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSavePod}
            disabled={isSaving}
            style={{
              padding: "0.65rem 1.5rem",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              color: "white",
              fontWeight: 700,
              cursor: isSaving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.9rem",
              boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)"
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="spinner" /> Saving Proof...
              </>
            ) : (
              <>
                <Check size={18} /> Save Proof of Delivery
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

export default PodEntryModal;
