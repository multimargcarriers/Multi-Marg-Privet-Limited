import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  Camera, 
  RefreshCw, 
  RotateCw, 
  RotateCcw, 
  Check, 
  X, 
  Sliders, 
  Sun, 
  Contrast, 
  Wand2, 
  Image as ImageIcon,
  FileCheck,
  AlertCircle,
  Crop
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

  // Editor enhancement states
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [brightness, setBrightness] = useState(0); // -100 to 100
  const [contrast, setContrast] = useState(0); // -100 to 100
  const [filterPreset, setFilterPreset] = useState("normal"); // 'normal' | 'magic' | 'scanner_bw'
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Initialize or cleanup when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setImageSrc(initialImageSrc);
      setRotation(0);
      setBrightness(0);
      setContrast(0);
      setFilterPreset("normal");

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

  // Update preview canvas whenever editing controls change
  useEffect(() => {
    if (isOpen && mode === "editor" && imageSrc) {
      renderEditedCanvas();
    }
  }, [isOpen, mode, imageSrc, rotation, brightness, contrast, filterPreset]);

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

  // Render edited image onto canvas with filters, rotation, brightness, and contrast
  const renderEditedCanvas = () => {
    if (!imageSrc || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      // Handle rotation swapping width/height
      const isRotated90or270 = rotation === 90 || rotation === 270;
      canvas.width = isRotated90or270 ? img.height : img.width;
      canvas.height = isRotated90or270 ? img.width : img.height;

      ctx.save();
      // Translate to center for rotation
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      // Apply pixel-level filter enhancements (Document Magic / B&W Scanner / Brightness / Contrast)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Calculate contrast factor: (259 * (C + 255)) / (255 * (259 - C))
      const c = contrast;
      const factor = (259 * (c + 255)) / (255 * (259 - c));
      const b = brightness;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let bl = data[i + 2];

        // Apply Preset filters first
        if (filterPreset === "magic") {
          // Document Magic: sharpen contrast and lift whites for text readability
          r = Math.min(255, Math.max(0, (r - 128) * 1.35 + 128 + 15));
          g = Math.min(255, Math.max(0, (g - 128) * 1.35 + 128 + 15));
          bl = Math.min(255, Math.max(0, (bl - 128) * 1.35 + 128 + 15));
        } else if (filterPreset === "scanner_bw") {
          // Grayscale Scanner: high contrast black and white document look
          const luma = 0.299 * r + 0.587 * g + 0.114 * bl;
          const val = luma > 140 ? 255 : luma < 90 ? 0 : (luma - 90) * (255 / 50);
          r = g = bl = Math.min(255, Math.max(0, val));
        }

        // Apply custom brightness slider
        r += b;
        g += b;
        bl += b;

        // Apply custom contrast slider
        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        bl = factor * (bl - 128) + 128;

        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, bl));
      }

      ctx.putImageData(imageData, 0, 0);
    };

    img.src = imageSrc;
  };

  // Export edited canvas and save
  const handleApplySave = () => {
    if (!previewCanvasRef.current) return;
    setIsProcessing(true);
    try {
      const editedDataUrl = previewCanvasRef.current.toDataURL("image/jpeg", 0.92);
      const timestamp = new Date().toISOString().slice(0, 10);
      const defaultFilename = `POD_Capture_${timestamp}.jpg`;
      onSave(editedDataUrl, defaultFilename);
      onClose();
    } catch (err) {
      console.error("Save edited image error:", err);
    } finally {
      setIsProcessing(false);
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
          backgroundColor: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          style={{
            background: "#1e293b",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "880px",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            border: "1px solid #334155",
            color: "white"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* STUDIO HEADER */}
          <div
            style={{
              padding: "1.25rem 1.75rem",
              background: "linear-gradient(90deg, #0f172a 0%, #1e293b 100%)",
              borderBottom: "1px solid #334155",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ background: "#0284c7", padding: "8px", borderRadius: "10px", display: "flex" }}>
                <Camera size={22} color="white" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                  {mode === "camera" ? "POD Live Camera Scanner" : "POD Document Scanner & Editor"}
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
                  {mode === "camera"
                    ? "Capture a physical signed LR receipt or proof of delivery document"
                    : "Crop, rotate, and enhance document contrast for clear sign-off readability"}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {mode === "editor" && (
                <button
                  onClick={() => {
                    setMode("camera");
                    startCamera(facingMode);
                  }}
                  style={{
                    background: "#334155",
                    color: "white",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Camera size={16} /> Retake Photo
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94a3b8",
                  cursor: "pointer"
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* STUDIO BODY CONTENT */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column" }}>
            {mode === "camera" ? (
              /* MODE 1: LIVE WEB RTC CAMERA VIEWFINDER */
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                {cameraError ? (
                  <div
                    style={{
                      padding: "3rem 2rem",
                      textAlign: "center",
                      background: "#334155",
                      borderRadius: "16px",
                      maxWidth: "480px",
                      margin: "auto"
                    }}
                  >
                    <AlertCircle size={48} color="#f59e0b" style={{ margin: "0 auto 16px auto" }} />
                    <h4 style={{ margin: "0 0 8px 0", fontSize: "1.15rem" }}>Camera Access Required</h4>
                    <p style={{ margin: "0 0 1.5rem 0", color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.5 }}>
                      {cameraError}
                    </p>
                    <button
                      onClick={onClose}
                      style={{
                        background: "#0284c7",
                        color: "white",
                        border: "none",
                        padding: "0.6rem 1.5rem",
                        borderRadius: "8px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Close & Choose File from Device
                    </button>
                  </div>
                ) : (
                  <div style={{ position: "relative", width: "100%", maxWidth: "640px", borderRadius: "16px", overflow: "hidden", background: "#000", border: "2px solid #475569" }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: "100%",
                        height: "auto",
                        maxHeight: "60vh",
                        display: "block",
                        transform: facingMode === "user" ? "scaleX(-1)" : "none"
                      }}
                    />

                    {/* Scanner Alignment Frame Overlay */}
                    <div
                      style={{
                        position: "absolute",
                        top: "12%",
                        left: "12%",
                        right: "12%",
                        bottom: "12%",
                        border: "2px dashed rgba(56, 189, 248, 0.7)",
                        borderRadius: "12px",
                        pointerEvents: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <span style={{ background: "rgba(0,0,0,0.6)", padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", color: "#38bdf8", fontWeight: 600 }}>
                        Align Document Receipt Inside Box
                      </span>
                    </div>

                    {/* Camera Switch button overlay */}
                    <button
                      type="button"
                      onClick={handleToggleCamera}
                      style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        background: "rgba(0, 0, 0, 0.65)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "white",
                        padding: "8px 14px",
                        borderRadius: "20px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <RefreshCw size={14} /> Flip Camera
                    </button>
                  </div>
                )}

                {/* Shutter Capture Controls */}
                {!cameraError && (
                  <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "1.5rem" }}>
                    <button
                      type="button"
                      onClick={handleCapturePhoto}
                      style={{
                        background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                        color: "white",
                        border: "4px solid #38bdf8",
                        width: "72px",
                        height: "72px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        boxShadow: "0 4px 15px rgba(2, 132, 199, 0.5)",
                        transition: "transform 0.15s"
                      }}
                      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
                      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                      title="Capture Document Photo"
                    >
                      <Camera size={32} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* MODE 2: IMAGE EDITOR & DOCUMENT SCANNER ENHANCEMENTS */
              <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "1.5rem", flex: 1 }}>
                {/* Canvas Viewport */}
                <div
                  style={{
                    background: "#090d16",
                    borderRadius: "16px",
                    border: "1px solid #334155",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "1rem",
                    minHeight: "380px",
                    overflow: "auto"
                  }}
                >
                  <canvas
                    ref={previewCanvasRef}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "55vh",
                      objectFit: "contain",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                      borderRadius: "6px"
                    }}
                  />
                </div>

                {/* Editor Sidebar Controls */}
                <div
                  style={{
                    background: "#0f172a",
                    borderRadius: "16px",
                    padding: "1.25rem",
                    border: "1px solid #334155",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem"
                  }}
                >
                  <div>
                    <h5 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      1. Scanner Filter Presets
                    </h5>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {[
                        { id: "normal", label: "Original / Normal", icon: ImageIcon },
                        { id: "magic", label: "Document Magic Enhance", icon: Wand2 },
                        { id: "scanner_bw", label: "B&W Document Scan", icon: FileCheck }
                      ].map((preset) => {
                        const Icon = preset.icon;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setFilterPreset(preset.id)}
                            style={{
                              background: filterPreset === preset.id ? "#0284c7" : "#1e293b",
                              color: "white",
                              border: `1px solid ${filterPreset === preset.id ? "#38bdf8" : "#334155"}`,
                              padding: "0.6rem 0.85rem",
                              borderRadius: "8px",
                              fontWeight: 600,
                              fontSize: "0.85rem",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              textAlign: "left"
                            }}
                          >
                            <Icon size={16} />
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rotate Controls */}
                  <div>
                    <h5 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      2. Rotate Document
                    </h5>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                        style={{
                          flex: 1,
                          background: "#1e293b",
                          border: "1px solid #334155",
                          color: "white",
                          padding: "0.6rem",
                          borderRadius: "8px",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px"
                        }}
                      >
                        <RotateCcw size={16} /> Left -90°
                      </button>
                      <button
                        type="button"
                        onClick={() => setRotation((prev) => (prev + 90) % 360)}
                        style={{
                          flex: 1,
                          background: "#1e293b",
                          border: "1px solid #334155",
                          color: "white",
                          padding: "0.6rem",
                          borderRadius: "8px",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px"
                        }}
                      >
                        <RotateCw size={16} /> Right +90°
                      </button>
                    </div>
                  </div>

                  {/* Brightness & Contrast Sliders */}
                  <div>
                    <h5 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      3. Brightness & Contrast
                    </h5>

                    <div style={{ marginBottom: "0.85rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#cbd5e1", marginBottom: "4px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Sun size={12} /> Brightness</span>
                        <b>{brightness}</b>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
                      />
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#cbd5e1", marginBottom: "4px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Contrast size={12} /> Contrast</span>
                        <b>{contrast}</b>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
                      />
                    </div>
                  </div>

                  {/* Reset Adjustments */}
                  <button
                    type="button"
                    onClick={() => {
                      setRotation(0);
                      setBrightness(0);
                      setContrast(0);
                      setFilterPreset("normal");
                    }}
                    style={{
                      background: "transparent",
                      border: "1px dashed #475569",
                      color: "#94a3b8",
                      padding: "0.5rem",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      marginTop: "auto"
                    }}
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STUDIO FOOTER ACTIONS */}
          {mode === "editor" && (
            <div
              style={{
                padding: "1.25rem 1.75rem",
                background: "#0f172a",
                borderTop: "1px solid #334155",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                Filter: <b>{filterPreset.toUpperCase()}</b> | Rotation: <b>{rotation}°</b>
              </span>

              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: "#334155",
                    color: "white",
                    border: "none",
                    padding: "0.65rem 1.5rem",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplySave}
                  disabled={isProcessing}
                  style={{
                    background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                    color: "white",
                    border: "none",
                    padding: "0.65rem 2rem",
                    borderRadius: "8px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 12px rgba(2, 132, 199, 0.4)"
                  }}
                >
                  <Check size={18} />
                  {isProcessing ? "Processing..." : "Apply & Use Edited POD Document"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  ), document.body);
};

export default PODImageStudioModal;
