import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Fingerprint, Lock, KeyRound, ShieldCheck, LogOut, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
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
      background: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.98) 0%, rgba(2, 6, 23, 1) 100%)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.25rem',
      color: '#ffffff',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: 'rgba(30, 41, 59, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '24px',
        padding: 'clamp(1.5rem, 4vw, 2.5rem)',
        width: '100%',
        maxWidth: '430px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 35px rgba(59, 130, 246, 0.15)',
        textAlign: 'center',
        position: 'relative',
        boxSizing: 'border-box'
      }}>
        {/* Security Shield Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 12px',
          borderRadius: '20px',
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(96, 165, 250, 0.3)',
          color: '#93c5fd',
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '1.5rem'
        }}>
          <ShieldCheck size={14} color="#60a5fa" />
          <span>Device Security Lock</span>
        </div>

        {/* User Profile Card */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '1.75rem'
        }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#ffffff',
            boxShadow: '0 0 25px rgba(59, 130, 246, 0.4)',
            marginBottom: '0.85rem'
          }}>
            {initials}
          </div>

          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
            {user?.name || user?.fullName || 'Authenticated User'}
          </h3>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px', fontWeight: 500 }}>
            {user?.email || user?.username}
          </span>
          <span style={{
            marginTop: '6px',
            fontSize: '0.72rem',
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '2px 8px',
            borderRadius: '6px',
            color: '#cbd5e1',
            fontWeight: 600
          }}>
            {user?.role || 'Staff'} • Multi-Marg
          </span>
        </div>

        {/* Status / Inactivity Notice */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          fontSize: '0.8rem',
          color: '#cbd5e1',
          marginBottom: '1.5rem',
          lineHeight: '1.4'
        }}>
          Session locked after 5 minutes of inactivity. Authenticate with device screen lock or fingerprint to continue.
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            borderRadius: '10px',
            padding: '0.65rem 0.85rem',
            fontSize: '0.78rem',
            color: '#fca5a5',
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
          <div>
            <button
              onClick={handleBiometricUnlock}
              disabled={authenticating}
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: authenticating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
                transition: 'all 0.2s ease',
                marginBottom: '0.75rem'
              }}
            >
              <Fingerprint size={22} className={authenticating ? "spin-animation" : ""} />
              {authenticating ? 'Verifying Device...' : 'Unlock with Fingerprint / Device Lock'}
            </button>

            <button
              type="button"
              onClick={() => setShowPasswordMode(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px'
              }}
            >
              <KeyRound size={14} /> Or enter account password
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordUnlock}>
            <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type={showPasswordText ? 'text' : 'password'}
                placeholder="Enter account password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 40px 0 38px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPasswordText(!showPasswordText)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={passwordLoading || !password}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: (passwordLoading || !password) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                marginBottom: '0.75rem'
              }}
            >
              {passwordLoading ? 'Verifying...' : 'Unlock Account'} <ArrowRight size={16} />
            </button>

            {biometricAvailable && (
              <button
                type="button"
                onClick={() => { setShowPasswordMode(false); handleBiometricUnlock(); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60a5fa',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px'
                }}
              >
                <Fingerprint size={14} /> Switch to Fingerprint / Device Screen Lock
              </button>
            )}
          </form>
        )}

        {/* Footer: Switch Account */}
        <div style={{ marginTop: '1.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
          <button
            type="button"
            onClick={onLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
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
