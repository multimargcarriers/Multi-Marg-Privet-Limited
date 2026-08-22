import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Camera, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck, X, Scan, Fingerprint, KeyRound, Sparkles, UserCheck, ShieldAlert } from 'lucide-react';
import { analyzeFrame } from '../utils/faceBiometrics';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

// Web Audio API Synthesizer for biometric sound feedback
const playBiometricSound = (type = 'scan') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'beep') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      osc.frequency.setValueAtTime(1046.50, now + 0.24);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.45);
    } else if (type === 'error') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(165, now + 0.12);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.3);
    }
  } catch (_e) {
    // Browser audio policy handled
  }
};

const FaceVerificationModal = ({ isOpen, user, onVerified, onCancel, onSwitchToFingerprint, onSwitchToPassword }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const offscreenCanvasRef = useRef(document.createElement('canvas'));
  const historyRef = useRef([]);
  const scanIntervalRef = useRef(null);

  const [cameraState, setCameraState] = useState('requesting'); // 'requesting', 'scanning', 'verifying', 'verified', 'mismatch', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [telemetryStatus, setTelemetryStatus] = useState('Initializing Optical Sensor...');
  const [confidenceScore, setConfidenceScore] = useState(null);
  const [detectedFaceBox, setDetectedFaceBox] = useState(null);
  const [isFaceAligned, setIsFaceAligned] = useState(false);

  // Start Live Camera
  const startCamera = async () => {
    setCameraState('requesting');
    setErrorMessage('');
    setScanProgress(0);
    setConfidenceScore(null);
    setDetectedFaceBox(null);
    setIsFaceAligned(false);
    historyRef.current = [];
    setTelemetryStatus('Requesting Camera Access...');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported on this browser or connection.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState('scanning');
      setTelemetryStatus('Scanning for Face...');
      playBiometricSound('beep');
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraState('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera access was blocked. Please grant camera permission in your browser URL bar to use Face Verification.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera hardware found on this device. You can verify using Device Fingerprint / PIN or Password.');
      } else {
        setErrorMessage(err.message || 'Unable to access camera. Please check your camera settings.');
      }
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (_e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Mount/Unmount effect
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Real-Time Computer Vision & Liveness Loop
  useEffect(() => {
    if (cameraState !== 'scanning') {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      return;
    }

    let accumulatedDescriptor = null;
    let consecutiveAlignedFrames = 0;
    const REQUIRED_FRAMES = 8;

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        const result = await analyzeFrame(videoRef.current, offscreenCanvasRef.current, historyRef);

        if (!result.detected) {
          consecutiveAlignedFrames = Math.max(0, consecutiveAlignedFrames - 1);
          setIsFaceAligned(false);
          setDetectedFaceBox(null);
          setTelemetryStatus(result.message || 'Position Face in Viewfinder');
          setScanProgress(Math.floor((consecutiveAlignedFrames / REQUIRED_FRAMES) * 100));
          return;
        }

        if (!result.centered) {
          consecutiveAlignedFrames = Math.max(0, consecutiveAlignedFrames - 1);
          setIsFaceAligned(false);
          setDetectedFaceBox(result.box);
          setTelemetryStatus(result.message || 'Center Face in Viewfinder');
          setScanProgress(Math.floor((consecutiveAlignedFrames / REQUIRED_FRAMES) * 100));
          return;
        }

        // Real Face Detected and Centered!
        setIsFaceAligned(true);
        setDetectedFaceBox(result.box);
        consecutiveAlignedFrames++;
        accumulatedDescriptor = result.descriptor;

        const currentPct = Math.min(100, Math.floor((consecutiveAlignedFrames / REQUIRED_FRAMES) * 100));
        setScanProgress(currentPct);

        if (consecutiveAlignedFrames === 2) {
          setTelemetryStatus('Face Detected • Hold Steady');
          playBiometricSound('beep');
        } else if (consecutiveAlignedFrames === 4) {
          setTelemetryStatus('Extracting Biometric Landmarks...');
          playBiometricSound('beep');
        } else if (consecutiveAlignedFrames === 6) {
          setTelemetryStatus('Verifying Liveness & Profile Match...');
          playBiometricSound('beep');
        } else if (consecutiveAlignedFrames >= REQUIRED_FRAMES) {
          // Verification ready: send to backend
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
          setCameraState('verifying');
          setTelemetryStatus('Authenticating Biometrics...');

          await verifyWithServer(accumulatedDescriptor, result.livenessScore, result.landmarksCount);
        }
      } catch (err) {
        console.error('Frame analysis error:', err);
      }
    }, 140);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [cameraState]);

  // Server Authentication Verification
  const verifyWithServer = async (descriptor, livenessScore, landmarksCount) => {
    try {
      const email = user?.email || user?.username;
      const userId = user?.id || user?._id;

      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post(`${API}/auth/verify-face`, {
        email,
        userId,
        descriptor,
        livenessScore,
        landmarksCount
      }, { headers });

      if (res.data?.success && res.data?.data?.verified) {
        const conf = res.data.data.confidence || 96.5;
        setConfidenceScore(conf);
        setCameraState('verified');
        setTelemetryStatus(`Identity Confirmed • ${conf}% Match`);
        playBiometricSound('success');

        setTimeout(() => {
          stopCamera();
          onVerified({ method: 'face_camera', confidence: conf, timestamp: Date.now() });
        }, 900);
      } else {
        throw new Error(res.data?.message || 'Face identity mismatch.');
      }
    } catch (err) {
      console.error('Face verification failed:', err);
      playBiometricSound('error');
      const msg = err.response?.data?.message || err.message || 'Face verification failed.';
      setErrorMessage(msg);
      setCameraState('mismatch');
      setTelemetryStatus('Verification Rejected • Face Mismatch');
    }
  };

  if (!isOpen) return null;

  const userDisplayName = user?.name || user?.fullName || user?.email || 'User';

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999999,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid rgba(226, 232, 240, 0.95)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '430px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        animation: 'modalEntrance 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header Bar */}
        <div style={{
          padding: '1.25rem 1.5rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: cameraState === 'verified' 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : cameraState === 'mismatch'
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              {cameraState === 'verified' ? <UserCheck size={18} /> : cameraState === 'mismatch' ? <ShieldAlert size={18} /> : <Scan size={18} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Real Face ID Scanner
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Liveness Vision • {userDisplayName}
              </span>
            </div>
          </div>

          {onCancel && (
            <button
              onClick={() => { stopCamera(); onCancel(); }}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Viewport Area */}
        <div style={{
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'linear-gradient(180deg, #fafafa 0%, #f1f5f9 100%)'
        }}>
          {/* Scanner Viewfinder Box */}
          <div style={{
            position: 'relative',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#090d16',
            border: cameraState === 'verified' 
              ? '4px solid #10b981' 
              : cameraState === 'mismatch'
              ? '4px solid #ef4444'
              : isFaceAligned 
              ? '4px solid #38bdf8' 
              : '4px solid #64748b',
            boxShadow: cameraState === 'verified' 
              ? '0 0 30px rgba(16, 185, 129, 0.5)' 
              : cameraState === 'mismatch'
              ? '0 0 30px rgba(239, 68, 68, 0.5)'
              : isFaceAligned
              ? '0 0 25px rgba(56, 189, 248, 0.45)'
              : '0 0 15px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease'
          }}>
            {/* Live Camera Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)', // Mirror webcam
                display: (cameraState === 'scanning' || cameraState === 'verifying' || cameraState === 'verified' || cameraState === 'mismatch') ? 'block' : 'none'
              }}
            />

            {/* Requesting State Placeholder */}
            {cameraState === 'requesting' && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>
                <Camera size={44} className="spin-animation" style={{ color: '#38bdf8', marginBottom: '8px' }} />
                <span style={{ fontSize: '0.8rem', display: 'block', color: '#e2e8f0', fontWeight: 600 }}>Accessing Camera...</span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Please allow browser prompt</span>
              </div>
            )}

            {/* Error State Placeholder */}
            {cameraState === 'error' && (
              <div style={{ textAlign: 'center', color: '#f87171', padding: '1rem' }}>
                <AlertCircle size={44} style={{ color: '#ef4444', marginBottom: '8px' }} />
                <span style={{ fontSize: '0.8rem', display: 'block', color: '#fca5a5', fontWeight: 700 }}>Camera Unavailable</span>
              </div>
            )}

            {/* Biometric Scanning Overlay Elements */}
            {(cameraState === 'scanning' || cameraState === 'verifying') && (
              <>
                {/* Horizontal Laser Scanning Line */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: isFaceAligned
                    ? 'linear-gradient(90deg, transparent 0%, #38bdf8 50%, transparent 100%)'
                    : 'linear-gradient(90deg, transparent 0%, #f59e0b 50%, transparent 100%)',
                  boxShadow: isFaceAligned ? '0 0 12px #38bdf8, 0 0 24px #0284c7' : '0 0 12px #f59e0b',
                  animation: 'biometricLaserScan 1.8s ease-in-out infinite'
                }} />

                {/* HUD Targeting Brackets */}
                <div style={{ position: 'absolute', top: '25px', left: '25px', width: '20px', height: '20px', borderTop: `2.5px solid ${isFaceAligned ? '#38bdf8' : '#94a3b8'}`, borderLeft: `2.5px solid ${isFaceAligned ? '#38bdf8' : '#94a3b8'}` }} />
                <div style={{ position: 'absolute', top: '25px', right: '25px', width: '20px', height: '20px', borderTop: `2.5px solid ${isFaceAligned ? '#38bdf8' : '#94a3b8'}`, borderRight: `2.5px solid ${isFaceAligned ? '#38bdf8' : '#94a3b8'}` }} />
                <div style={{ position: 'absolute', bottom: '25px', left: '25px', width: '20px', height: '20px', borderBottom: `2.5px solid ${isFaceAligned ? '#38bdf8' : '#94a3b8'}`, borderLeft: `2.5px solid ${isFaceAligned ? '#38bdf8' : '#94a3b8'}` }} />
                <div style={{ position: 'absolute', bottom: '25px', right: '25px', width: '20px', height: '20px', borderBottom: `2.5px solid ${isFaceAligned ? '#38bdf8' : '#94a3b8'}`, borderRight: `2.5px solid ${isFaceAligned ? '#38bdf8' : '#94a3b8'}` }} />

                {/* Oval Face Guide */}
                <div style={{
                  position: 'absolute',
                  width: '130px',
                  height: '160px',
                  borderRadius: '50%',
                  border: isFaceAligned ? '2px solid rgba(56, 189, 248, 0.85)' : '1.5px dashed rgba(245, 158, 11, 0.6)',
                  boxShadow: isFaceAligned ? 'inset 0 0 20px rgba(56, 189, 248, 0.25)' : 'inset 0 0 10px rgba(245, 158, 11, 0.15)',
                  pointerEvents: 'none'
                }} />
              </>
            )}

            {/* Success Overlay Checkmark */}
            {cameraState === 'verified' && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(16, 185, 129, 0.40)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                backdropFilter: 'blur(4px)'
              }}>
                <CheckCircle2 size={64} style={{ color: '#ffffff', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '8px', letterSpacing: '0.5px' }}>VERIFIED</span>
                {confidenceScore && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.9 }}>{confidenceScore}% Match</span>
                )}
              </div>
            )}

            {/* Mismatch Overlay */}
            {cameraState === 'mismatch' && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(220, 38, 38, 0.55)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                backdropFilter: 'blur(4px)',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <ShieldAlert size={56} style={{ color: '#ffffff', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '6px', letterSpacing: '0.5px' }}>ACCESS DENIED</span>
                <span style={{ fontSize: '0.70rem', opacity: 0.9, marginTop: '4px' }}>Face Profile Mismatch</span>
              </div>
            )}
          </div>

          {/* Progress Bar & Telemetry Status */}
          <div style={{ width: '100%', marginTop: '1rem', textAlign: 'center' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: cameraState === 'verified' ? '#16a34a' : (cameraState === 'error' || cameraState === 'mismatch') ? '#dc2626' : isFaceAligned ? '#0284c7' : '#d97706',
              marginBottom: '6px'
            }}>
              {(cameraState === 'scanning' || cameraState === 'verifying') && <Sparkles size={14} className="spin-animation" />}
              {cameraState === 'verified' && <ShieldCheck size={16} />}
              {(cameraState === 'error' || cameraState === 'mismatch') && <AlertCircle size={16} />}
              <span>{telemetryStatus}</span>
            </div>

            {(cameraState === 'scanning' || cameraState === 'verifying') && (
              <div style={{
                width: '100%',
                height: '6px',
                background: '#e2e8f0',
                borderRadius: '999px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${scanProgress}%`,
                  height: '100%',
                  background: isFaceAligned ? 'linear-gradient(90deg, #0284c7, #38bdf8, #10b981)' : '#f59e0b',
                  transition: 'width 0.15s ease',
                  borderRadius: '999px'
                }} />
              </div>
            )}
          </div>

          {/* Error / Mismatch Details & Retry */}
          {(cameraState === 'error' || cameraState === 'mismatch') && (
            <div style={{ marginTop: '0.75rem', width: '100%', textAlign: 'center' }}>
              <p style={{ fontSize: '0.78rem', color: '#991b1b', margin: '0 0 0.75rem 0', lineHeight: 1.4, fontWeight: 500 }}>
                {errorMessage || 'Identity could not be confirmed.'}
              </p>
              <button
                type="button"
                onClick={startCamera}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
                }}
              >
                <RefreshCw size={14} /> Scan Face Again
              </button>
            </div>
          )}
        </div>

        {/* Alternative Verification Methods Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          background: '#ffffff',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
            Or Verify Using
          </span>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {onSwitchToFingerprint && (
              <button
                type="button"
                onClick={() => { stopCamera(); onSwitchToFingerprint(); }}
                style={{
                  flex: 1,
                  padding: '0.65rem 0.75rem',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  color: '#334155',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Fingerprint size={16} color="#2563eb" />
                <span>Device Finger / PIN</span>
              </button>
            )}

            {onSwitchToPassword && (
              <button
                type="button"
                onClick={() => { stopCamera(); onSwitchToPassword(); }}
                style={{
                  flex: 1,
                  padding: '0.65rem 0.75rem',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  color: '#334155',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <KeyRound size={16} color="#475569" />
                <span>Password</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Embedded CSS for Biometric Laser & Modal Animation */}
      <style>{`
        @keyframes biometricLaserScan {
          0% { top: 10%; opacity: 0.8; }
          50% { top: 90%; opacity: 1; }
          100% { top: 10%; opacity: 0.8; }
        }
        @keyframes modalEntrance {
          0% { opacity: 0; transform: scale(0.94) translateY(12px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default FaceVerificationModal;
