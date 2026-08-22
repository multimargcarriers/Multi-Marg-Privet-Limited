import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Fingerprint, Lock, KeyRound, ShieldCheck, LogOut, AlertCircle, ArrowRight, Eye, EyeOff, Scan } from 'lucide-react';
import { promptDeviceScreenLock, isBiometricSupported } from '../utils/deviceBiometrics';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const DeviceLockModal = ({ user, onUnlock, onLogout }) => {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPasswordMode, setShowPasswordMode] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    isBiometricSupported().then(supported => {
      if (isMounted) {
        setBiometricAvailable(supported);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const handleBiometricUnlock = async () => {
    setErrorMsg('');
    setAuthenticating(true);
    try {
      const res = await promptDeviceScreenLock(user);
      if (res.success) {
        setTimeout(() => onUnlock(), 10);
      } else if (res.reason === 'CANCELLED') {
        setErrorMsg('Authentication cancelled. Tap below or use your account password.');
      } else if (res.reason === 'NOT_SUPPORTED') {
        setShowPasswordMode(true);
        setErrorMsg('Device biometrics not available. Please enter your account password.');
      } else {
        setErrorMsg(res.message || 'Device authentication failed. Try password.');
        setShowPasswordMode(true);
      }
    } catch (err) {
      console.error('Biometric error:', err);
      setErrorMsg('Failed to verify device. Use password below.');
      setShowPasswordMode(true);
    } finally {
      setAuthenticating(false);
    }
  };

  const handlePasswordUnlock = async (e) => {
    if (e) e.preventDefault();
    if (!password) {
      setErrorMsg('Please enter your account password');
      return;
    }

    setPasswordLoading(true);
    setErrorMsg('');
    try {
      const email = user?.email || user?.username;
      const res = await axios.post(`${API}/auth/login`, {
        email,
        password
      });

      if (res.data?.success) {
        onUnlock();
      } else {
        setErrorMsg('Invalid password. Please try again.');
      }
    } catch (err) {
      console.error('Password unlock error:', err);
      setErrorMsg(err.response?.data?.message || 'Incorrect password. Try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const getUserPhotoUrl = () => {
    let src = user?.photo || user?.avatar || user?.picture;
    if (src) {
      if (typeof src === 'string' && src.startsWith('/uploads/')) {
        return `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${src}`;
      }
      return src;
    }
    return null;
  };

  const userPhoto = getUserPhotoUrl();
  const initials = (user?.name || user?.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      background: 'rgba(15, 23, 42, 0.55)',
      backdropFilter: 'blur(24px) saturate(160%)',
      WebkitBackdropFilter: 'blur(24px) saturate(160%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.25rem',
      color: '#0f172a',
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid rgba(226, 232, 240, 0.95)',
        borderRadius: '24px',
        padding: 'clamp(1.75rem, 4vw, 2.5rem)',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.04)',
        textAlign: 'center',
        position: 'relative',
        boxSizing: 'border-box'
      }}>
        {/* Security Shield Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 14px',
          borderRadius: '20px',
          background: '#eff6ff',
          border: '1px solid #dbeafe',
          color: '#1d4ed8',
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '1.25rem'
        }}>
          <ShieldCheck size={14} color="#2563eb" />
          <span>Device Security Lock</span>
        </div>

        {/* User Profile Card with Centered Profile Picture */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '1.25rem'
        }}>
          <div style={{
            width: '82px',
            height: '82px',
            borderRadius: '50%',
            padding: '3px',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #4f46e5 100%)',
            boxShadow: '0 4px 18px rgba(37, 99, 235, 0.25)',
            marginBottom: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            {userPhoto ? (
              <img
                src={userPhoto}
                alt={user?.name || 'User'}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: 800,
                color: '#ffffff'
              }}>
                {initials}
              </div>
            )}
          </div>

          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
            {user?.name || user?.fullName || 'Authenticated User'}
          </h3>
          <span style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '3px', fontWeight: 500 }}>
            {user?.email || user?.username}
          </span>
          <span style={{
            marginTop: '6px',
            fontSize: '0.72rem',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            padding: '3px 10px',
            borderRadius: '6px',
            color: '#334155',
            fontWeight: 600
          }}>
            {user?.role || 'Staff'} • Multi-Marg
          </span>
        </div>

        {/* Status / Priority Flow Notice */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          fontSize: '0.78rem',
          color: '#475569',
          marginBottom: '1.25rem',
          lineHeight: '1.45',
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
            Multi-Tier Authentication Flow
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', flexWrap: 'wrap', fontSize: '0.72rem', color: '#2563eb', fontWeight: 600 }}>
            <span>1️⃣ Face Lock</span>
            <span style={{ color: '#94a3b8' }}>➔</span>
            <span>2️⃣ Fingerprint</span>
            <span style={{ color: '#94a3b8' }}>➔</span>
            <span>3️⃣ Device PIN</span>
            <span style={{ color: '#94a3b8' }}>➔</span>
            <span style={{ color: '#64748b' }}>4️⃣ Password</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '0.65rem 0.85rem',
            fontSize: '0.78rem',
            color: '#b91c1c',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textAlign: 'left'
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Biometric Trigger or Password Input */}
        {!showPasswordMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {/* Primary: Device Biometric Unlock (Native Face Lock 1st / Fingerprint 2nd / Screen Lock 3rd) */}
            <button
              onClick={handleBiometricUnlock}
              disabled={authenticating}
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #1d4ed8 100%)',
                color: '#ffffff',
                fontSize: '0.90rem',
                fontWeight: 700,
                cursor: authenticating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 15px -1px rgba(14, 165, 233, 0.45)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <Scan size={20} />
                <Fingerprint size={20} className={authenticating ? "spin-animation" : ""} />
              </div>
              <span>{authenticating ? 'Checking Face / Fingerprint...' : 'Unlock with Face Lock / Fingerprint / PIN'}</span>
            </button>

            {/* Secondary: Password fallback */}
            <button
              type="button"
              onClick={() => setShowPasswordMode(true)}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                color: '#334155',
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0.65rem 1rem',
                width: '100%',
                transition: 'all 0.15s ease',
                marginTop: '2px'
              }}
            >
              <KeyRound size={15} color="#2563eb" /> Verify with Account Password (4th Option)
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordUnlock}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.74rem',
              color: '#475569',
              marginBottom: '0.75rem',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}>
              <ShieldCheck size={13} color="#2563eb" />
              <span>Manual typing required • Copy-paste & autofill disabled</span>
            </div>

            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="password"
                name="sec_reauth_pin_manual"
                placeholder="Type account password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  setErrorMsg('Paste is blocked for security. Please type your password manually.');
                }}
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                autoFocus
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 14px 0 38px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.95rem',
                  letterSpacing: '2px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading || !password}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: (passwordLoading || !password) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                marginBottom: '0.75rem'
              }}
            >
              {passwordLoading ? 'Verifying...' : 'Unlock Account'} <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => { setShowPasswordMode(false); handleBiometricUnlock(); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px'
              }}
            >
              <Fingerprint size={14} /> Switch to Device Face Lock / Fingerprint
            </button>
          </form>
        )}

        {/* Footer: Switch Account */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
          <button
            type="button"
            onClick={onLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc2626',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '8px',
              transition: 'background 0.2s ease'
            }}
          >
            <LogOut size={14} /> Log out or switch account
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DeviceLockModal;
