import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Maximize2, ZoomIn, ZoomOut, RotateCw, RotateCcw } from "lucide-react";

const PodViewer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const imageUrl = queryParams.get("url");
  const title = queryParams.get("title") || "Proof of Delivery Viewer";

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const isSessionSource = queryParams.get("source") === "session";
  const finalImageUrl = isSessionSource ? sessionStorage.getItem("tempPodData") : imageUrl;
  const isPdf = finalImageUrl && (/\.pdf$/i.test(finalImageUrl) || finalImageUrl.startsWith("data:application/pdf"));

  useEffect(() => {
    if (!finalImageUrl) {
      navigate(-1);
    }
  }, [finalImageUrl, navigate]);

  if (!finalImageUrl) return null;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      backgroundColor: "#0f172a",
      color: "white"
    }}>
      {/* Header */}
      <div style={{
        padding: "1rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#1e293b",
        borderBottom: "1px solid #334155"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "transparent",
              border: "none",
              color: "#e2e8f0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem",
              borderRadius: "8px",
              transition: "background 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <ArrowLeft size={20} />
            <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Back</span>
          </button>
          <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>{title}</h1>
        </div>
        
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {!isPdf && (
            <>
              <button onClick={() => setRotation(r => r - 90)} style={actionButtonStyle} title="Rotate Left">
                <RotateCcw size={18} />
              </button>
              <button onClick={() => setRotation(r => r + 90)} style={actionButtonStyle} title="Rotate Right">
                <RotateCw size={18} />
              </button>
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} style={actionButtonStyle} title="Zoom Out">
                <ZoomOut size={18} />
              </button>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} style={actionButtonStyle} title="Zoom In">
                <ZoomIn size={18} />
              </button>
              <button onClick={() => { setZoom(1); setRotation(0); }} style={actionButtonStyle} title="Reset">
                <Maximize2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Container */}
      <div style={{
        flex: 1,
        overflow: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem"
      }}>
        {isPdf ? (
          <iframe 
            src={finalImageUrl} 
            title={title}
            style={{ width: "100%", height: "100%", border: "none", backgroundColor: "white", borderRadius: "8px" }} 
          />
        ) : (
          <img
            src={finalImageUrl}
            alt={title}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: "transform 0.2s ease",
              maxWidth: rotation % 180 === 0 ? "100%" : "70%",
              maxHeight: rotation % 180 === 0 ? "100%" : "70%",
              width: "auto",
              height: "auto",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
              objectFit: "contain"
            }}
          />
        )}
      </div>
    </div>
  );
};

const actionButtonStyle = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "white",
  padding: "0.5rem",
  borderRadius: "8px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

export default PodViewer;
