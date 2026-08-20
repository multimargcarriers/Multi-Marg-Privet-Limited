import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Download, X, FileSpreadsheet, FileText, Building2, Loader2, CheckCircle2 } from "lucide-react";

const ExportModal = ({
  isOpen,
  onClose,
  onExport,
  title = "Export Data",
  subtitle = "",
  itemCount = 0,
  isExporting = false,
}) => {
  const [format, setFormat] = useState("excel");

  if (!isOpen) return null;

  const handleDownload = () => {
    onExport({ format });
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "95%",
          maxWidth: "520px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          border: "1px solid #cbd5e1",
          animation: "scaleUp 0.15s ease-out",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
            color: "#ffffff",
            padding: "1.25rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "rgba(255,255,255,0.15)", padding: "8px", borderRadius: "10px" }}>
              <Download size={22} color="#ffffff" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "#ffffff" }}>
                {title}
              </h4>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#cbd5e1" }}>
                {subtitle || `${itemCount} record${itemCount !== 1 ? "s" : ""} selected for export`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "#ffffff",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label
              style={{
                fontSize: "0.78rem",
                fontWeight: "700",
                textTransform: "uppercase",
                color: "#475569",
                marginBottom: "8px",
                display: "block",
                letterSpacing: "0.5px",
              }}
            >
              Select Export Format
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {/* Excel Option */}
              <div
                onClick={() => setFormat("excel")}
                style={{
                  border: format === "excel" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  background: format === "excel" ? "#eff6ff" : "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", color: "#1e3a8a", fontSize: "0.92rem" }}>
                    <FileSpreadsheet size={20} color="#16a34a" />
                    <span>Excel (.xlsx)</span>
                  </div>
                  <span
                    style={{
                      background: "#16a34a",
                      color: "#fff",
                      fontSize: "0.62rem",
                      fontWeight: "700",
                      padding: "2px 6px",
                      borderRadius: "6px",
                    }}
                  >
                    RECOMMENDED
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "0.74rem", color: "#64748b", lineHeight: "1.3" }}>
                  Official document with Multimarg logo, GSTIN, PAN, address, themed header, and grand totals.
                </p>
              </div>

              {/* CSV Option */}
              <div
                onClick={() => setFormat("csv")}
                style={{
                  border: format === "csv" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  background: format === "csv" ? "#eff6ff" : "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", color: "#334155", fontSize: "0.92rem" }}>
                    <FileText size={20} color="#0284c7" />
                    <span>CSV (.csv)</span>
                  </div>
                  <span
                    style={{
                      background: "#e2e8f0",
                      color: "#475569",
                      fontSize: "0.62rem",
                      fontWeight: "700",
                      padding: "2px 6px",
                      borderRadius: "6px",
                    }}
                  >
                    STANDARD
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "0.74rem", color: "#64748b", lineHeight: "1.3" }}>
                  Standard comma-separated table aligned with entry form structure.
                </p>
              </div>
            </div>
          </div>

          {/* Company Details Badge */}
          <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <Building2 size={16} color="#1e3a8a" />
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1e3a8a" }}>
                MULTIMARG CARRIERS PVT. LTD.
              </span>
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "#16a34a", fontWeight: "600" }}>
                <CheckCircle2 size={13} /> Verified ERP Header
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#475569", lineHeight: "1.4" }}>
              <div><strong>Address:</strong> LIG-194, Near National Public School, Rudrapur, UK-263153</div>
              <div><strong>Tax Info:</strong> GSTIN: 05AANCM3054E1ZN | PAN: AANCM3054E1ZN</div>
            </div>
          </div>

          {/* Export Scope Notice */}
          <div style={{ fontSize: "0.78rem", color: "#475569", background: "#f1f5f9", padding: "9px 12px", borderRadius: "8px" }}>
            <strong>Export Structure:</strong> Aligned with form entry fields. Client-facing and clean without internal status tags.
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={isExporting}
            style={{ padding: "0 1.25rem", height: "38px" }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDownload}
            disabled={isExporting || itemCount === 0}
            style={{
              padding: "0 1.75rem",
              height: "38px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: format === "excel" ? "#16a34a" : "#2563eb",
              borderColor: format === "excel" ? "#16a34a" : "#2563eb",
              fontWeight: "700",
            }}
          >
            {isExporting ? (
              <>
                <Loader2 size={16} className="spinner" /> Generating...
              </>
            ) : (
              <>
                <Download size={16} /> Download {format.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ExportModal;
