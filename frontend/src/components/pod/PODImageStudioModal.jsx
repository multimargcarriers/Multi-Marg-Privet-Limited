import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { 

  RefreshCw, 
  RotateCw, 
  RotateCcw, 
  Check, 
  X, 




Image as

  AlertCircle,

} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Enterprise POD Image Studio Modal
 * Provides Live HTML5 Camera Capture, Document Scanner Filters, Rotation, and Brightness/Contrast controls
 */
const PODImageStudioModal = ({
  isOpen,
  onClose,
  initialMode = "camera", // 'camera' or 'editor'
  initialImageSrc = null,
  onSave
}) => {
  const [mode, setMode] = useState(initialMode); // 'camera' | 'editor'
  const [imageSrc, setImageSrc] = useState(initialImageSrc);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // 'environment' (back) | 'user' (front)
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  // Initialize or cleanup when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setImageSrc(initialImageSrc);
      setRotation(0);

      if (initialMode === "camera") {
        startCamera(facingMode);
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, initialMode, initialImageSrc]);

  // Restart camera when facingMode changes
  useEffect(() => {
    if (isOpen && mode === "camera") {
      startCamera(facingMode);
    }
  }, [facingMode]);


  // Start video stream
  const startCamera = async (facing = "environment") => {
    stopCamera();
    setCameraError(null);
    try {
      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("[POD Camera Error]", err);
      setCameraError(
        "Camera access denied or not available on this device. Please use 'Choose from Gallery / Files' instead."
      );
    }
  };

  // Stop video stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Capture frame from live video
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    
    stopCamera();
    setImageSrc(dataUrl);
    setMode("editor");
  };

  // Toggle between front and back camera
  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Save captured image
  const handleApplySave = () => {
    if (!imageSrc) return;
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const defaultFilename = `POD_Capture_${timestamp}.jpg`;
      
      if (rotation !== 0) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const isRotated90or270 = rotation === 90 || rotation === 270;
          canvas.width = isRotated90or270 ? img.height : img.width;
          canvas.height = isRotated90or270 ? img.width : img.height;
          
          const ctx = canvas.getContext("2d");
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          
          const editedDataUrl = canvas.toDataURL("image/jpeg", 0.92);
          onSave(editedDataUrl, defaultFilename);
          onClose();
        };
        img.src = imageSrc;
      } else {
        onSave(imageSrc, defaultFilename);
        onClose();
      }
    } catch (err) {
      console.error("Save edited image error:", err);
    }
  };

  if (!isOpen) return null;

  return createPortal((
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          style={{
            background: "#0f172a",
            borderRadius: "24px",
            width: "100%",
            maxWidth: "600px",
            maxHeight: "95vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            border: "1px solid #1e293b",
            color: "white"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div
            style={{
              padding: "1rem 1.5rem",
              background: "rgba(15, 23, 42, 0.95)",
              borderBottom: "1px solid #1e293b",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 10
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, letterSpacing: "0.02em" }}>
                {mode === "camera" ? "Scan Document" : "Review Document"}
              </h3>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"}
            >
              <X size={18} />
            </button>
          </div>

          {/* BODY */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", backgroundColor: "#000" }}>
            {mode === "camera" ? (
              <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
                {cameraError ? (
                  <div style={{ padding: "3rem", textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <AlertCircle size={48} color="#f59e0b" style={{ margin: "0 auto 16px auto" }} />
                    <h4 style={{ margin: "0 0 8px 0", fontSize: "1.15rem" }}>Camera Error</h4>
                    <p style={{ margin: "0 0 1.5rem 0", color: "#cbd5e1", fontSize: "0.9rem" }}>{cameraError}</p>
                  </div>
                ) : (
                  <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transform: facingMode === "user" ? "scaleX(-1)" : "none"
                      }}
                    />

                    {/* Viewfinder Overlay */}
                    <div style={{
                      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none"
                    }}>
                      <div style={{ width: "80%", height: "70%", position: "relative" }}>
                        {/* Corners */}
                        <div style={{ position: "absolute", top: 0, left: 0, width: "30px", height: "30px", borderTop: "3px solid #fff", borderLeft: "3px solid #fff", borderRadius: "4px 0 0 0" }} />
                        <div style={{ position: "absolute", top: 0, right: 0, width: "30px", height: "30px", borderTop: "3px solid #fff", borderRight: "3px solid #fff", borderRadius: "0 4px 0 0" }} />
                        <div style={{ position: "absolute", bottom: 0, left: 0, width: "30px", height: "30px", borderBottom: "3px solid #fff", borderLeft: "3px solid #fff", borderRadius: "0 0 0 4px" }} />
                        <div style={{ position: "absolute", bottom: 0, right: 0, width: "30px", height: "30px", borderBottom: "3px solid #fff", borderRight: "3px solid #fff", borderRadius: "0 0 4px 0" }} />
                        <div style={{ position: "absolute", bottom: "-35px", left: "0", right: "0", textAlign: "center" }}>
                          <span style={{ background: "rgba(0,0,0,0.6)", padding: "4px 12px", borderRadius: "12px", fontSize: "0.75rem", color: "white", fontWeight: 500, letterSpacing: "0.05em" }}>
                            Align Document
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Camera Controls Footer */}
                {!cameraError && (
                  <div style={{
                    padding: "1.5rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#0f172a"
                  }}>
                    {/* Empty div for flex spacing */}
                    <div style={{ flex: 1 }} />
                    
                    {/* Shutter Button */}
                    <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                      <button
                        type="button"
                        onClick={handleCapturePhoto}
                        style={{
                          width: "70px",
                          height: "70px",
                          borderRadius: "50%",
                          background: "white",
                          border: "4px solid #334155",
                          outline: "2px solid white",
                          outlineOffset: "2px",
                          cursor: "pointer",
                          transition: "transform 0.1s",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                        onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                        title="Capture Photo"
                      />
                    </div>

                    {/* Flip Camera */}
                    <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={handleToggleCamera}
                        style={{
                          background: "rgba(255,255,255,0.1)",
                          border: "none",
                          color: "white",
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "background 0.2s"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)"}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"}
                      >
                        <RefreshCw size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                {/* Image Preview Container */}
                <div style={{ 
                  flex: 1, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  overflow: "hidden", 
                  padding: "1rem",
                  minHeight: 0,
                  maxHeight: "calc(95vh - 200px)"
                }}>
                  <img
                    src={imageSrc}
                    alt="Captured POD"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      width: "auto",
                      height: "auto",
                      objectFit: "contain",
                      borderRadius: "8px",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                      transform: `rotate(${rotation}deg)`,
                      transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      ...(rotation % 180 !== 0 ? { maxWidth: "70%", maxHeight: "70%" } : {})
                    }}
                  />
                </div>
                
                {/* Editor Controls Footer */}
                <div style={{ background: "#0f172a", padding: "1.25rem 1.5rem" }}>
                  
                  {/* Rotation Controls */}
                  <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                    <button
                      type="button"
                      onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                      style={{
                        background: "#1e293b",
                        border: "1px solid #334155",
                        color: "white",
                        padding: "0.6rem 1rem",
                        borderRadius: "10px",
                        fontSize: "0.85rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = "#334155"}
                      onMouseOut={(e) => e.currentTarget.style.background = "#1e293b"}
                    >
                      <RotateCcw size={16} /> Rotate Left
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation((prev) => (prev + 90) % 360)}
                      style={{
                        background: "#1e293b",
                        border: "1px solid #334155",
                        color: "white",
                        padding: "0.6rem 1rem",
                        borderRadius: "10px",
                        fontSize: "0.85rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = "#334155"}
                      onMouseOut={(e) => e.currentTarget.style.background = "#1e293b"}
                    >
                      <RotateCw size={16} /> Rotate Right
                    </button>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("camera");
                        startCamera(facingMode);
                      }}
                      style={{
                        flex: 1,
                        background: "transparent",
                        color: "white",
                        border: "1px solid #334155",
                        padding: "0.85rem",
                        borderRadius: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                      onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={handleApplySave}
                      style={{
                        flex: 2,
                        background: "#0ea5e9", // A vibrant professional blue
                        color: "white",
                        border: "none",
                        padding: "0.85rem",
                        borderRadius: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)",
                        transition: "background 0.2s"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = "#0284c7"}
                      onMouseOut={(e) => e.currentTarget.style.background = "#0ea5e9"}
                    >
                      <Check size={18} />
                      Use Document
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  ), document.body);
};

export default PODImageStudioModal;
