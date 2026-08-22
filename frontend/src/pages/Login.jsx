import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Mail, Lock, Key, ArrowRight, ArrowLeft, CheckCircle, ShieldAlert, Package, MapPin, Eye, EyeOff, Fingerprint, ShieldCheck, Smartphone, Scan, Camera } from 'lucide-react';
import { promptDeviceScreenLock, isBiometricSupported } from '../utils/deviceBiometrics';
import FaceVerificationModal from '../components/FaceVerificationModal';

import { useNavigate } from 'react-router-dom';
import appDB from '../utils/appDB';

const Login = () => {
  const navigate = useNavigate();
  // View states: 'login', 'forgot', 'otp', 'reset', 'device_auth'
  const [view, setView] = useState('login');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [pendingAuth, setPendingAuth] = useState(null);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [step2Password, setStep2Password] = useState('');
  const [showStep2PasswordInput, setShowStep2PasswordInput] = useState(false);
  const [showStep2PasswordText, setShowStep2PasswordText] = useState(false);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [deviceAuthLoading, setDeviceAuthLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  // Check for active OTP session on mount
  useEffect(() => {
    const savedSession = appDB.memGet('otpSession');
    if (savedSession) {
      const { email: savedEmail, expiresAt, resendAt } = savedSession;
      const now = Date.now();
      
      if (now < expiresAt) {
        setEmail(savedEmail);
        setView('otp');
        const remainingResend = Math.max(0, Math.floor((resendAt - now) / 1000));
        setResendTimer(remainingResend);
      } else {
        appDB.remove('otpSession');
      }
    }
  }, []);

  useEffect(() => {
    let interval;
    if (resendTimer > 0 && view === 'otp') {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer, view]);
  
  const { login, user, loading: authLoading } = useContext(AuthContext);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const triggerDeviceVerification = async (targetUser, targetToken) => {
    const userObj = targetUser || pendingAuth?.user;
    const tokenObj = targetToken || pendingAuth?.token;
    if (!userObj || !tokenObj) return;

    setDeviceAuthLoading(true);
    setError('');
    try {
      const res = await promptDeviceScreenLock(userObj);
      if (res.success) {
        login(userObj, tokenObj);
      } else if (res.reason === 'CANCELLED') {
        setError('Device verification was cancelled. Tap below to scan fingerprint or authorize this device.');
      } else {
        setError(res.message || 'Device authentication required. Tap below to scan or confirm.');
      }
    } catch (err) {
      console.error("Device auth error:", err);
      setError('Device verification error. Tap below to verify.');
    } finally {
      setDeviceAuthLoading(false);
    }
  };

  const handleStep2PasswordVerify = async (e) => {
    if (e) e.preventDefault();
    if (!step2Password) {
      setError('Please enter your account password.');
      return;
    }
    setDeviceAuthLoading(true);
    setError('');
    try {
      const emailVal = pendingAuth?.user?.email || pendingAuth?.user?.username || email;
      const res = await axios.post(`${API_URL}/api/auth/login`, {
        email: emailVal,
        password: step2Password
      });
      if (res.data?.success) {
        login(pendingAuth.user, pendingAuth.token);
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Password verification failed. Try again.');
    } finally {
      setDeviceAuthLoading(false);
    }
  };

  const handleGoogleCredentialResponse = async (response) => {
    const idToken = response.credential;
    if (!idToken) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await axios.post(`${API_URL}/api/auth/google-login`, { idToken });
      if (res.data.success) {
        const authData = res.data.data;
        const requires2Fa = authData.user?.twoFactorEnabled !== false;
        if (requires2Fa) {
          setPendingAuth(authData);
          setView('device_auth');
          setTimeout(() => triggerDeviceVerification(authData.user, authData.token), 100);
        } else {
          login(authData.user, authData.token);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Google Sign-In failed. Access denied.');
    } finally {
      setLoading(false);
    }
  };

  const triggerGoogleSignIn = () => {
    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      setError('Google Sign-In SDK is initializing. Please try again in a moment.');
      return;
    }
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        window.google.accounts.id.prompt();
      }
    });
  };

  // Google Sign-In SDK Initialization (run only once)
  const googleInitRef = React.useRef(false);
  useEffect(() => {
    if (googleInitRef.current) return;
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      console.error('Google Client ID missing');
      return;
    }
    const initGoogle = () => {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          use_fedcm_for_prompt: true
        });
      }
    };
    if (window.google && window.google.accounts) {
      initGoogle();
    } else {
      const script = document.createElement('script');
      script.id = 'google-jssdk';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
    }
    googleInitRef.current = true;
  }, []);

  useEffect(() => {
    if (user && !authLoading) {
      const isSuperAdmin = user.role === 'SuperAdmin' || user.email === 'admin@multimarg.com';
      const hasDashboard = isSuperAdmin || (user.permissions && (user.permissions.includes('all') || user.permissions.includes('dashboard')));
      
      let target = '/profile';
      if (hasDashboard) {
        target = '/dashboard';
      } else if (user.role === 'Client' || user.role === 'Vendor') {
        if (user.permissions && user.permissions.includes('tripmis')) {
          target = '/trip-mis';
        } else if (user.permissions && user.permissions.includes('vendormis')) {
          target = '/vendor-mis';
        } else if (user.permissions && user.permissions.includes('trips')) {
          target = '/trips';
        }
      }
      navigate(target, { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });

      if (response.data.success) {
        const authData = response.data.data;
        const targetUser = authData.user || {};
        const faceOn = targetUser.faceAuthEnabled !== false;
        const fingerOn = targetUser.fingerprintAuthEnabled !== false;
        const requires2Fa = (targetUser.twoFactorEnabled !== false) && (faceOn || fingerOn);

        if (requires2Fa) {
          setPendingAuth(authData);
          setView('device_auth');
          if (faceOn && !fingerOn) {
            setTimeout(() => setShowFaceModal(true), 150);
          } else {
            setTimeout(() => triggerDeviceVerification(authData.user, authData.token), 150);
          }
        } else {
          // If 2-step verification is turned OFF for this user, log in directly!
          login(authData.user, authData.token);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      if (response.data.success) {
        setSuccessMsg('An OTP has been sent to your email.');
        setView('otp');
        setResendTimer(120);
        
        appDB.set('otpSession', {
          email,
          expiresAt: Date.now() + 5 * 60 * 1000,
          resendAt: Date.now() + 2 * 60 * 1000
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/verify-otp`, { email, otp });
      if (response.data.success) {
        setResetToken(response.data.data.resetToken);
        setSuccessMsg('OTP verified! Please set a new password.');
        setView('reset');
        appDB.remove('otpSession');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/reset-password`, { 
        email, 
        resetToken, 
        newPassword 
      });
      if (response.data.success) {
        setSuccessMsg('Password has been reset successfully! You can now log in.');
        setView('login');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setOtp('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      background: '#ffffff',
      overflow: 'hidden',
      fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    }}>
      
      {/* Main Full-Bleed Split Layout */}
      <div style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#ffffff',
      }}>
        
        {/* --- LEFT SIDE: BRAND SHOWCASE --- */}
        <div className="showcase-sidebar" style={{
          flex: '1',
          background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.8) 45%, rgba(255, 255, 255, 0) 100%), url("/3d-factory-bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'right center',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          padding: '4rem 5rem',
          zIndex: 5,
        }}>
          {/* Top Header */}
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            {/* Minimalist Logo Overlay */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <a href={import.meta.env.VITE_FRONTEND_URL || "http://localhost:5174"} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: '1.5rem' }}>
                <img src="/circle_crop_logo.png" alt="Multi Marg Logo" className="breathing-logo" style={{ width: '120px', height: '120px', objectFit: 'contain', borderRadius: '50%' }} />
                <div>
                  <h2 style={{ 
                    margin: 0, 
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '2.5rem', 
                    fontWeight: 800, 
                    letterSpacing: '-0.03em', 
                    background: 'linear-gradient(135deg, #FF8A00 0%, #FF5A1F 50%, #E53935 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1.1,
                  }}>
                    Multimarg Carriers Private Limited
                  </h2>
                  <p style={{ 
                    margin: '0.2rem 0 0 0', 
                    fontFamily: "'Outfit', sans-serif", 
                    fontSize: '1.25rem', 
                    color: '#FF5A1F', 
                    textTransform: 'uppercase', 
                    letterSpacing: '3px', 
                    fontWeight: 700 
                  }}>
                    Logistics Platform
                  </p>
                </div>
              </a>
            </div>

            {/* Floating Stat Widget */}
            <div style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#c4b5fd', padding: '0.75rem', borderRadius: '50%', color: '#6d28d9' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20v-4"></path></svg>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#4b5563', fontWeight: 600 }}>Delivering Impact</p>
                <p style={{ margin: 0, fontSize: '1.4rem', color: '#111827', fontWeight: 800 }}>99.8%</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>On-time Delivery</p>
              </div>
            </div>
          </div>

          {/* Marketing Copy */}
          <div style={{ marginTop: '4rem', maxWidth: '500px' }}>
            <h1 style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, color: '#111827', marginBottom: '1.5rem' }}>
              Smarter <span style={{ color: '#7c3aed' }}>Logistics.</span><br/>
              Stronger <span style={{ color: '#7c3aed' }}>Supply Chains.</span>
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#4b5563', lineHeight: 1.6, marginBottom: '3rem' }}>
              Streamline operations, track in real-time, and deliver excellence every time.
            </p>

            {/* Feature List (Trimmed to avoid crowding) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ background: '#f5f3ff', padding: '0.6rem', borderRadius: '10px', color: '#7c3aed' }}><MapPin size={24} /></div>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>Real-time Tracking</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>Monitor every shipment in real-time</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ background: '#f5f3ff', padding: '0.6rem', borderRadius: '10px', color: '#7c3aed' }}><ShieldAlert size={24} /></div>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>Secure & Reliable</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>Enterprise-grade security for your data</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom Floating Stats */}
          <div style={{ marginTop: 'auto', background: '#312e81', color: 'white', padding: '1.5rem', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', gap: '1rem', width: 'fit-content', boxShadow: '0 15px 30px rgba(49, 46, 129, 0.4)' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '12px' }}><Package size={24} /></div>
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>Powering thousands</p>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>of deliveries every day</p>
            </div>
          </div>
        </div>

        {/* --- RIGHT SIDE: LOGIN FORM --- */}
        <div className="login-sidebar" style={{
          flex: '0 0 480px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem',
          background: '#f8fafc',
          position: 'relative',
          overflow: 'hidden'
        }}>
          
          {/* Abstract Purple Wave Background (Top Right) */}
          <div style={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, rgba(255,255,255,0) 70%)',
            borderRadius: '50%',
            zIndex: 0,
            pointerEvents: 'none'
          }}></div>

          <div className="login-form-container" style={{ 
            width: '100%', 
            maxWidth: '440px', 
            position: 'relative', 
            zIndex: 10,
            background: '#ffffff',
            padding: '2.75rem 2.25rem',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(226, 232, 240, 0.8)',
            border: 'none'
          }}>
            
            {/* Centered Brand Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '1.75rem' }}>
              <a href={import.meta.env.VITE_FRONTEND_URL || "http://localhost:5174"} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img 
                    src="/circle_crop_logo.png" 
                    alt="Multimarg Logo" 
                    className="breathing-logo"
                    style={{ 
                      width: '68px', 
                      height: '68px', 
                      objectFit: 'contain', 
                      marginBottom: '0.75rem',
                      borderRadius: '50%'
                    }} 
                  />
                </div>
                <h2 style={{ 
                  margin: 0, 
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '1.35rem', 
                  fontWeight: 800, 
                  letterSpacing: '-0.02em', 
                  background: 'linear-gradient(135deg, #FF8A00 0%, #FF5A1F 50%, #E53935 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  lineHeight: 1.2
                }}>
                  Multimarg Carriers
                </h2>
                <p style={{ 
                  margin: '0.2rem 0 0 0', 
                  fontFamily: "'Outfit', sans-serif", 
                  fontSize: '0.68rem', 
                  color: '#FF5A1F', 
                  textTransform: 'uppercase', 
                  letterSpacing: '2.5px', 
                  fontWeight: 700 
                }}>
                  Logistics Platform
                </p>
              </a>
            </div>

          <style>{`
            @keyframes logoBreathe {
              0% {
                transform: scale(1);
                filter: drop-shadow(0 4px 10px rgba(255, 90, 31, 0.25));
              }
              50% {
                transform: scale(1.08);
                filter: drop-shadow(0 8px 25px rgba(255, 90, 31, 0.75)) drop-shadow(0 0 35px rgba(255, 138, 0, 0.5));
              }
              100% {
                transform: scale(1);
                filter: drop-shadow(0 4px 10px rgba(255, 90, 31, 0.25));
              }
            }
            .breathing-logo {
              animation: logoBreathe 3s ease-in-out infinite;
              will-change: transform, filter;
            }
            @media (max-width: 1100px) {
              .showcase-sidebar { display: none !important; }
              .login-sidebar { 
                flex: 1 !important; 
                max-width: 100% !important; 
                padding: 1.5rem 1rem !important; 
                background: linear-gradient(180deg, #f8fafc 0%, #ede9fe 100%) !important;
                min-height: 100vh !important;
              }
              .login-form-container {
                padding: 2.25rem 1.5rem !important;
                border-radius: 20px !important;
                box-shadow: 0 15px 35px -10px rgba(30, 27, 75, 0.12), 0 0 0 1px rgba(226, 232, 240, 0.9) !important;
              }
            }
            @media (max-width: 480px) {
              .login-sidebar {
                padding: 1rem 0.75rem !important;
              }
              .login-form-container {
                padding: 1.75rem 1.25rem !important;
                border-radius: 18px !important;
              }
            }
            .input-group {
              position: relative;
              margin-bottom: 1.15rem;
            }
            .input-field {
              width: 100%;
              height: 48px;
              background: #f8fafc;
              border: 1.5px solid #e2e8f0;
              padding: 0 2.8rem;
              border-radius: 10px;
              color: #0f172a;
              font-size: 0.95rem;
              transition: all 0.2s ease;
              outline: none;
              box-sizing: border-box;
            }
            .input-field:hover {
              border-color: #cbd5e1;
              background: #ffffff;
            }
            .input-field:focus {
              border-color: #2563eb;
              background: #ffffff;
              box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
            }
            .input-field::placeholder {
              color: #94a3b8;
            }
            .icon-wrapper {
              position: absolute;
              left: 0.95rem;
              top: 50%;
              transform: translateY(-50%);
              color: #94a3b8;
              transition: color 0.2s ease;
              pointer-events: none;
              display: flex;
              align-items: center;
            }
            .input-group:focus-within .icon-wrapper {
              color: #2563eb;
            }
            .password-toggle-btn {
              position: absolute;
              right: 0.85rem;
              top: 50%;
              transform: translateY(-50%);
              background: transparent;
              border: none;
              color: #94a3b8;
              cursor: pointer;
              padding: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: color 0.2s ease;
              border-radius: 6px;
            }
            .password-toggle-btn:hover {
              color: #0f172a;
              background: rgba(0,0,0,0.04);
            }
            .btn-primary {
              width: 100%;
              height: 48px;
              background: linear-gradient(135deg, #FF8A00 0%, #FF5A1F 50%, #E53935 100%);
              color: #ffffff;
              border: none;
              padding: 0 1.25rem;
              border-radius: 10px;
              font-size: 1rem;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.2s ease;
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 0.5rem;
              box-shadow: 0 8px 20px rgba(255, 90, 31, 0.3);
            }
            .btn-primary:hover:not(:disabled) {
              background: linear-gradient(135deg, #ea7b00 0%, #e04a12 50%, #cc2c28 100%);
              box-shadow: 0 10px 24px rgba(255, 90, 31, 0.4);
              transform: translateY(-1px);
            }
            .btn-primary:active:not(:disabled) {
              transform: translateY(1px);
            }
            .btn-primary:disabled {
              opacity: 0.65;
              cursor: not-allowed;
            }
            .link-btn {
              background: transparent;
              border: none;
              color: #2563eb;
              font-size: 0.875rem;
              font-weight: 600;
              cursor: pointer;
              transition: color 0.2s;
              padding: 0;
            }
            .link-btn:hover {
              color: #1d4ed8;
              text-decoration: underline;
            }
            .alert-box {
              padding: 0.75rem 1rem;
              border-radius: 8px;
              margin-bottom: 1.25rem;
              font-size: 0.88rem;
              font-weight: 500;
              display: flex;
              align-items: flex-start;
              gap: 0.65rem;
            }
            .alert-error {
              background: #fef2f2;
              color: #b91c1c;
              border: 1px solid #fecaca;
            }
            .alert-success {
              background: #f0fdf4;
              color: #15803d;
              border: 1px solid #bbf7d0;
            }
            .google-btn {
              width: 100%;
              height: 46px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 0.75rem;
              background: #ffffff;
              border: 1.5px solid #e2e8f0;
              color: #334155;
              font-family: inherit;
              font-weight: 600;
              font-size: 0.92rem;
              border-radius: 10px;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
            }
            .google-btn:hover {
              background: #f8fafc;
              border-color: #cbd5e1;
              color: #0f172a;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
            }
            .sr-only {
              position: absolute;
              width: 1px;
              height: 1px;
              padding: 0;
              margin: -1px;
              overflow: hidden;
              clip: rect(0, 0, 0, 0);
              white-space: nowrap;
              border-width: 0;
            }
          `}</style>
          
          {view !== 'login' && (
            <button 
              onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }}
              className="link-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1.5rem', textDecoration: 'none' }}
            >
              <ArrowLeft size={16} /> Back to sign in
            </button>
          )}

          <div style={{ marginBottom: '1.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {view === 'login' && (
              <>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem 0', fontFamily: "inherit", textAlign: 'center', letterSpacing: '-0.02em' }}>
                  Welcome <span style={{ color: '#FF5A1F' }}>back!</span>
                </h2>
                <p style={{ color: '#64748b', margin: 0, fontSize: '0.92rem', textAlign: 'center' }}>Sign in to your Multi Marg account</p>
              </>
            )}
            
            {view === 'device_auth' && (
              <>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem 0', fontFamily: "inherit", textAlign: 'center', letterSpacing: '-0.02em' }}>
                  Device <span style={{ color: '#2563eb' }}>Verification</span>
                </h2>
                <p style={{ color: '#64748b', margin: 0, fontSize: '0.85rem', textAlign: 'center' }}>Step 2 of 2 • Compulsory device security check</p>
              </>
            )}

            {view === 'forgot' && (
              <>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem 0', fontFamily: "inherit", textAlign: 'center' }}>Account <span style={{ color: '#FF5A1F' }}>recovery</span></h2>
                <p style={{ color: '#64748b', margin: 0, fontSize: '0.92rem', textAlign: 'center' }}>Recover your Multi Marg Account</p>
              </>
            )}
            
            {view === 'otp' && (
              <>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem 0', fontFamily: "inherit", textAlign: 'center' }}>Verify it's <span style={{ color: '#FF5A1F' }}>you</span></h2>
                <p style={{ color: '#64748b', margin: 0, fontSize: '0.92rem', textAlign: 'center' }}>We sent a code to your registered email for <strong>{email}</strong></p>
              </>
            )}
            
            {view === 'reset' && (
              <>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem 0', fontFamily: "inherit", textAlign: 'center' }}>Change <span style={{ color: '#FF5A1F' }}>password</span></h2>
                <p style={{ color: '#64748b', margin: 0, fontSize: '0.92rem', textAlign: 'center' }}>Create a strong password</p>
              </>
            )}
          </div>

          {error && (
            <div className="alert-box alert-error">
              <div style={{marginTop: '2px'}}><ShieldAlert size={16} /></div>
              <div>{error}</div>
            </div>
          )}
          
          {successMsg && (
            <div className="alert-box alert-success">
              <div style={{marginTop: '2px'}}><CheckCircle size={16} /></div>
              <div>{successMsg}</div>
            </div>
          )}

          {view === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label htmlFor="login-email" className="sr-only">Email, Username, or Emp Code</label>
                <div className="icon-wrapper"><Mail size={18} strokeWidth={2} /></div>
                <input 
                  id="login-email"
                  name="email"
                  type="text" 
                  className="input-field"
                  placeholder="Email, Username, or Emp Code" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  autoComplete="username"
                  aria-label="Email, Username, or Emp Code"
                />
              </div>

              <div className="input-group" style={{ marginBottom: '0.5rem' }}>
                <label htmlFor="login-password" className="sr-only">Password</label>
                <div className="icon-wrapper"><Lock size={18} strokeWidth={2} /></div>
                <input 
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"} 
                  className="input-field"
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  autoComplete="current-password"
                  aria-label="Password"
                />
                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)} tabIndex="-1" aria-label="Toggle password visibility">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.25rem', marginTop: '0.4rem' }}>
                <button 
                  type="button" 
                  className="link-btn"
                  onClick={() => { setView('forgot'); setError(''); setSuccessMsg(''); }}
                  style={{ color: '#2563eb' }}
                >
                  Forgot password?
                </button>
              </div>

              <div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', position: 'relative' }}>
                    <span>{loading ? 'Signing in...' : 'Sign in'}</span>
                    {!loading && <ArrowRight size={18} style={{ position: 'absolute', right: '0.5rem' }} />}
                  </div>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0 1.25rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                <span style={{ padding: '0 0.85rem', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
              </div>
              
              <button 
                type="button" 
                className="google-btn" 
                onClick={triggerGoogleSignIn}
              >
                <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </button>
            </form>
          )}

          {view === 'device_auth' && pendingAuth && (() => {
            const rawPhoto = pendingAuth.user?.photo || pendingAuth.user?.avatar || pendingAuth.user?.picture;
            const photoUrl = rawPhoto ? (rawPhoto.startsWith('/uploads/') ? `${API_URL}${rawPhoto}` : rawPhoto) : null;
            const initials = (pendingAuth.user?.name || pendingAuth.user?.email || 'U').slice(0, 2).toUpperCase();

            return (
              <div style={{ width: '100%', textAlign: 'center' }}>
                {/* Visual Avatar with Cyber Ring */}
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  padding: '3px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #7c3aed 100%)',
                  boxShadow: '0 4px 18px rgba(37, 99, 235, 0.3)',
                  margin: '0 auto 0.65rem auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  {photoUrl ? (
                    <img 
                      src={photoUrl} 
                      alt={pendingAuth.user?.name || 'User'} 
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
                      color: '#ffffff',
                      fontSize: '1.5rem',
                      fontWeight: 800
                    }}>
                      {initials}
                    </div>
                  )}
                </div>

                <h3 style={{ margin: '0 0 2px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {pendingAuth.user?.name || pendingAuth.user?.fullName || 'User'}
                </h3>
                <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                  {pendingAuth.user?.email || pendingAuth.user?.username}
                </p>

                {/* Minimal Visual 4-Step Pipeline */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '4px',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '8px 6px',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ padding: '4px 2px', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.70rem', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                    <Scan size={15} color="#0284c7" />
                    <span>Face</span>
                  </div>
                  <div style={{ padding: '4px 2px', borderRadius: '8px', background: '#ffffff', color: '#334155', fontSize: '0.70rem', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <Fingerprint size={15} color="#2563eb" />
                    <span>Finger</span>
                  </div>
                  <div style={{ padding: '4px 2px', borderRadius: '8px', background: '#ffffff', color: '#475569', fontSize: '0.70rem', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <Smartphone size={15} color="#0284c7" />
                    <span>PIN</span>
                  </div>
                  <div style={{ padding: '4px 2px', borderRadius: '8px', background: '#ffffff', color: '#64748b', fontSize: '0.70rem', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <Key size={15} color="#64748b" />
                    <span>Password</span>
                  </div>
                </div>

                {!showStep2PasswordInput ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {/* Face ID Camera Verification (if enabled) */}
                    {(pendingAuth?.user?.faceAuthEnabled !== false) && (
                      <button
                        type="button"
                        onClick={() => setShowFaceModal(true)}
                        className="btn-primary"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #1d4ed8 100%)',
                          boxShadow: '0 4px 16px rgba(14, 165, 233, 0.4)',
                          height: '48px',
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          borderRadius: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        <Camera size={20} />
                        <span>Verify with Face ID (Camera)</span>
                      </button>
                    )}

                    {/* Fingerprint / Windows Hello / Touch ID Verification (if enabled) */}
                    {(pendingAuth?.user?.fingerprintAuthEnabled !== false) && (
                      <button
                        type="button"
                        onClick={() => triggerDeviceVerification(pendingAuth.user, pendingAuth.token)}
                        disabled={deviceAuthLoading}
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '12px',
                          padding: '0.70rem 1rem',
                          color: '#0f172a',
                          fontSize: '0.86rem',
                          fontWeight: 700,
                          cursor: deviceAuthLoading ? 'not-allowed' : 'pointer',
                          width: '100%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                      >
                        <Fingerprint size={18} color="#2563eb" className={deviceAuthLoading ? "spin-animation" : ""} />
                        <span>{deviceAuthLoading ? 'Verifying...' : 'Device Finger / Windows PIN'}</span>
                      </button>
                    )}

                    {/* Tertiary Password Option */}
                    <button
                      type="button"
                      onClick={() => setShowStep2PasswordInput(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: '100%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '0.4rem'
                      }}
                    >
                      <Key size={14} color="#64748b" /> Use Password Instead
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleStep2PasswordVerify}>
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '0.74rem',
                      color: '#475569',
                      marginBottom: '0.85rem',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}>
                      <ShieldCheck size={14} color="#2563eb" />
                      <span>Manual keyboard input required • Clipboard & autofill blocked</span>
                    </div>

                    <div className="input-group" style={{ marginBottom: '0.85rem' }}>
                      <div className="icon-wrapper"><Lock size={18} strokeWidth={2} /></div>
                      <input 
                        type="password" 
                        name="sec_step2_password_manual"
                        className="input-field"
                        placeholder="Type account password..." 
                        value={step2Password}
                        onChange={(e) => setStep2Password(e.target.value)}
                        onPaste={(e) => {
                          e.preventDefault();
                          setError('Paste is blocked for security. Please type your password manually.');
                        }}
                        onCopy={(e) => e.preventDefault()}
                        onCut={(e) => e.preventDefault()}
                        onDrop={(e) => e.preventDefault()}
                        onContextMenu={(e) => e.preventDefault()}
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-form-type="other"
                        required 
                        autoFocus
                        style={{ letterSpacing: '2.5px', height: '46px' }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={deviceAuthLoading || !step2Password}
                      className="btn-primary"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginBottom: '0.75rem',
                        height: '46px',
                        borderRadius: '12px'
                      }}
                    >
                      <ShieldCheck size={18} />
                      <span>{deviceAuthLoading ? 'Verifying...' : 'Verify Password & Unlock'}</span>
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                      <button
                        type="button"
                        onClick={() => { setShowStep2PasswordInput(false); setShowFaceModal(true); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0284c7',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px'
                        }}
                      >
                        <Camera size={14} /> Face ID
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowStep2PasswordInput(false); triggerDeviceVerification(pendingAuth.user, pendingAuth.token); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px'
                        }}
                      >
                        <Fingerprint size={14} /> Fingerprint
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })()}

          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword}>
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="forgot-email" className="sr-only">Email, Username, or Emp Code</label>
                <div className="icon-wrapper"><Mail size={18} strokeWidth={2} /></div>
                <input 
                  id="forgot-email"
                  name="email"
                  type="text" 
                  className="input-field"
                  placeholder="Email, Username, or Emp Code" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  autoComplete="username"
                  aria-label="Email, Username, or Emp Code for password reset"
                />
              </div>
              
              <div style={{ marginTop: '1.25rem' }}>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Sending...' : 'Next'}
                </button>
              </div>
            </form>
          )}
          
          {view === 'otp' && (
            <form onSubmit={handleVerifyOtp}>
              <div className="input-group">
                <label htmlFor="otp-code" className="sr-only">One-time password code</label>
                <div className="icon-wrapper"><Key size={18} strokeWidth={2} /></div>
                <input 
                  id="otp-code"
                  name="otp"
                  type="text" 
                  className="input-field"
                  style={{ fontSize: '1.25rem', letterSpacing: '4px', textAlign: 'center', paddingLeft: '1rem', fontWeight: 500 }}
                  placeholder="G-000000" 
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required 
                  autoComplete="one-time-code"
                  aria-label="One-time password code"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn-primary" disabled={loading || otp.length !== 6}>
                  {loading ? 'Verifying...' : 'Verify'}
                </button>

                <button 
                  type="button" 
                  className="link-btn"
                  onClick={handleForgotPassword}
                  style={{ color: resendTimer > 0 ? '#94a3b8' : '#2563eb', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer', textAlign: 'center', width: '100%', marginTop: '0.25rem' }}
                  disabled={loading || resendTimer > 0}
                >
                  {resendTimer > 0 ? `Resend code in ${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')}` : 'Resend code'}
                </button>
              </div>
            </form>
          )}
          
          {view === 'reset' && (
            <form onSubmit={handleResetPassword}>
              <div className="input-group">
                <label htmlFor="new-password" className="sr-only">New password</label>
                <div className="icon-wrapper"><Lock size={18} strokeWidth={2} /></div>
                <input 
                  id="new-password"
                  name="newPassword"
                  type={showPassword ? "text" : "password"} 
                  className="input-field"
                  placeholder="Create password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required 
                  minLength={6}
                  autoComplete="new-password"
                  aria-label="New password"
                />
                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)} tabIndex="-1" aria-label="Toggle password visibility">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="confirm-password" className="sr-only">Confirm new password</label>
                <div className="icon-wrapper"><CheckCircle size={18} strokeWidth={2} /></div>
                <input 
                  id="confirm-password"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"} 
                  className="input-field"
                  placeholder="Confirm password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required 
                  minLength={6}
                  autoComplete="new-password"
                  aria-label="Confirm new password"
                />
                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)} tabIndex="-1" aria-label="Toggle password visibility">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              <div style={{ marginTop: '1.25rem' }}>
                <button type="submit" className="btn-primary" disabled={loading || !newPassword || !confirmPassword}>
                  {loading ? 'Saving...' : 'Save password'}
                </button>
              </div>
            </form>
          )}

          <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
            © 2026 Multimarg Carriers Pvt Ltd
          </div>

          </div>
        </div>

      </div>

      {/* Live Camera Face Verification Modal */}
      <FaceVerificationModal
        isOpen={showFaceModal}
        user={pendingAuth?.user}
        onVerified={(_data) => {
          setShowFaceModal(false);
          if (pendingAuth?.user && pendingAuth?.token) {
            login(pendingAuth.user, pendingAuth.token);
          }
        }}
        onCancel={() => setShowFaceModal(false)}
        onSwitchToFingerprint={() => {
          setShowFaceModal(false);
          triggerDeviceVerification(pendingAuth?.user, pendingAuth?.token);
        }}
        onSwitchToPassword={() => {
          setShowFaceModal(false);
          setShowStep2PasswordInput(true);
        }}
      />
    </div>
  );
};

export default Login;
