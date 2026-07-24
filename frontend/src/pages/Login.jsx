import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Mail, Lock, Key, ArrowRight, ArrowLeft, CheckCircle, ShieldAlert, Plane, Truck, Ship, Package, Train, MapPin } from 'lucide-react';

const Login = () => {
  // View states: 'login', 'forgot', 'otp', 'reset'
  const [view, setView] = useState('login');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Check for active OTP session on mount
  React.useEffect(() => {
    const savedSession = localStorage.getItem('otpSession');
    if (savedSession) {
      const { email: savedEmail, expiresAt, resendAt } = JSON.parse(savedSession);
      const now = Date.now();
      
      if (now < expiresAt) {
        setEmail(savedEmail);
        setView('otp');
        const remainingResend = Math.max(0, Math.floor((resendAt - now) / 1000));
        setResendTimer(remainingResend);
      } else {
        localStorage.removeItem('otpSession');
      }
    }
  }, []);

  React.useEffect(() => {
    let interval;
    if (resendTimer > 0 && view === 'otp') {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer, view]);
  
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
        login(response.data.data.user, response.data.data.token);
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
        
        localStorage.setItem('otpSession', JSON.stringify({
          email,
          expiresAt: Date.now() + 5 * 60 * 1000,
          resendAt: Date.now() + 2 * 60 * 1000
        }));
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
        localStorage.removeItem('otpSession');
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

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      backgroundColor: '#ffffff',
      overflow: 'hidden',
      fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    }}>
      
      {/* --- LEFT SIDE: 60% BRAND SHOWCASE (AWS/Corporate Dark Navy + 3D Render) --- */}
      <div className="showcase-sidebar" style={{
        flex: '0 0 60%',
        background: 'linear-gradient(135deg, rgba(15, 21, 28, 0.75) 0%, rgba(2, 6, 12, 0.95) 100%), url("/3d-bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '4rem 5rem',
        color: 'white',
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        zIndex: 5
      }}>
        
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
            <img src="/mc.png" alt="Multi Marg Logo" style={{ height: '65px', background: '#fff', padding: '0.5rem', borderRadius: '8px' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '1px', color: '#ffffff' }}>MULTI MARG</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px' }}>Private Limited</p>
            </div>
          </div>
          
          <h1 style={{ fontSize: '3.2rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.5rem', color: '#ffffff' }}>
            Driving the Future of Transport.
          </h1>
          
          <p style={{ fontSize: '1.15rem', color: '#cbd5e1', lineHeight: 1.6, maxWidth: '90%', marginBottom: '3.5rem' }}>
            Revolutionizing logistics across India with unmatched speed, uncompromised safety, and total reliability.
          </p>

          {/* Marketing Grid with Premium Glassmorphism */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3.5rem' }}>
            
            {/* Card 1: Google Blue */}
            <div style={{ background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: '1.5rem', borderRadius: '12px', color: '#202124', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.4)' }}>
              <div style={{ display: 'inline-flex', background: '#e8f0fe', padding: '0.75rem', borderRadius: '50%', color: '#1a73e8', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(26,115,232,0.2)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Nationwide</h3>
              <p style={{ color: '#5f6368', fontSize: '0.9rem', margin: 0, lineHeight: 1.4 }}>End-to-end logistics coverage across India.</p>
            </div>
            
            {/* Card 2: AWS Orange */}
            <div style={{ background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: '1.5rem', borderRadius: '12px', color: '#202124', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.4)' }}>
              <div style={{ display: 'inline-flex', background: '#fff3e0', padding: '0.75rem', borderRadius: '50%', color: '#FF9900', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(255,153,0,0.2)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>24/7 Support</h3>
              <p style={{ color: '#5f6368', fontSize: '0.9rem', margin: 0, lineHeight: 1.4 }}>Premium enterprise assistance anytime.</p>
            </div>
            
            {/* Card 3: Google Green */}
            <div style={{ background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: '1.5rem', borderRadius: '12px', color: '#202124', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.4)' }}>
              <div style={{ display: 'inline-flex', background: '#e6f4ea', padding: '0.75rem', borderRadius: '50%', color: '#188038', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(24,128,56,0.2)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Secure Fleet</h3>
              <p style={{ color: '#5f6368', fontSize: '0.9rem', margin: 0, lineHeight: 1.4 }}>State-of-the-art GPS fleet tracking.</p>
            </div>
          </div>

          {/* Map API Section - Premium Glass Container */}
          <div style={{ background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: '0.5rem', borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.3)' }}>
            <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '4px', overflow: 'hidden' }}>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d116834.00977792036!2d86.35338048600062!3d23.78082980749008!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39f6a74204d8095b%3A0xc48e9d6d1c8c1995!2sDhanbad%2C%20Jharkhand!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade">
              </iframe>
              <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', background: '#ffffff', padding: '0.4rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, color: '#202124', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: '#EA4335' }}>📍</span> HQ: Dhanbad, Jharkhand
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- RIGHT SIDE: 40% LOGIN FORM (Pristine White Corporate) --- */}
      <div style={{
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: '#ffffff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        {/* Subtle Professional Transport Pattern Background */}
        <div style={{
          position: 'absolute',
          top: '-10%', left: '-10%', right: '-10%', bottom: '-10%',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '4rem',
          opacity: 0.03, // Extremely subtle so it looks premium, not distracting
          pointerEvents: 'none',
          transform: 'rotate(-10deg) scale(1.2)',
          zIndex: 0,
          color: '#0f151c' // Dark color that will show up lightly due to 3% opacity
        }}>
          {/* Create a structured repeating grid of transport icons */}
          {Array.from({ length: 40 }).map((_, i) => {
            const icons = [<Plane size={48} />, <Truck size={48} />, <Ship size={48} />, <Package size={48} />, <Train size={48} />, <MapPin size={48} />];
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {icons[i % icons.length]}
              </div>
            );
          })}
        </div>

        <div className="login-form-container" style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 10 }}>
          
          {/* Mobile Logo */}
          <div className="mobile-only-logo" style={{ display: 'none', textAlign: 'center', marginBottom: '2rem' }}>
            <img src="/mc.png" alt="Logo" style={{ height: '60px' }} />
          </div>

          <style>{`
            @media (max-width: 1100px) {
              .showcase-sidebar { display: none !important; }
              .mobile-only-logo { display: block !important; }
            }
            .input-group {
              position: relative;
              margin-bottom: 1.25rem;
            }
            .input-field {
              width: 100%;
              background: #ffffff;
              border: 1px solid #dadce0;
              padding: 0.85rem 1rem 0.85rem 2.8rem;
              border-radius: 4px;
              color: #202124;
              font-size: 1rem;
              transition: all 0.2s ease;
              outline: none;
            }
            .input-field:hover {
              border-color: #9aa0a6;
            }
            .input-field:focus {
              border-color: #1a73e8;
              box-shadow: inset 0 0 0 1px #1a73e8;
            }
            .input-field::placeholder {
              color: #80868b;
            }
            .icon-wrapper {
              position: absolute;
              left: 0.85rem;
              top: 50%;
              transform: translateY(-50%);
              color: #5f6368;
              transition: color 0.2s ease;
              pointer-events: none;
            }
            .input-group:focus-within .icon-wrapper {
              color: #1a73e8;
            }
            .btn-primary {
              width: 100%;
              background: #1a73e8;
              color: white;
              border: none;
              padding: 0.85rem;
              border-radius: 4px;
              font-size: 0.95rem;
              font-weight: 600;
              cursor: pointer;
              transition: background 0.2s ease;
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 0.5rem;
              margin-top: 1.5rem;
            }
            .btn-primary:hover:not(:disabled) {
              background: #1557b0;
              box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15);
            }
            .btn-primary:active:not(:disabled) {
              background: #174ea6;
            }
            .btn-primary:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }
            .link-btn {
              background: transparent;
              border: none;
              color: #1a73e8;
              font-size: 0.875rem;
              font-weight: 600;
              cursor: pointer;
              transition: color 0.2s;
              padding: 0;
            }
            .link-btn:hover {
              color: #1557b0;
              text-decoration: underline;
            }
            .alert-box {
              padding: 0.75rem 1rem;
              border-radius: 4px;
              margin-bottom: 1.5rem;
              font-size: 0.9rem;
              font-weight: 500;
              display: flex;
              align-items: flex-start;
              gap: 0.75rem;
            }
            .alert-error {
              background: #fce8e6;
              color: #c5221f;
              border: 1px solid #fad2cf;
            }
            .alert-success {
              background: #e6f4ea;
              color: #137333;
              border: 1px solid #ceead6;
            }
            .google-btn {
              width: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 0.75rem;
              background: #ffffff;
              border: 1px solid #dadce0;
              color: #3c4043;
              font-family: "Google Sans", Roboto, Arial, sans-serif;
              font-weight: 500;
              font-size: 0.95rem;
              height: 44px;
              border-radius: 4px;
              cursor: pointer;
              transition: background-color 0.2s, box-shadow 0.2s;
            }
            .google-btn:hover {
              background: #f8f9fa;
              box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15);
            }
          `}</style>
          
          {view !== 'login' && (
            <button 
              onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }}
              className="link-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '2rem', textDecoration: 'none' }}
            >
              <ArrowLeft size={16} /> Back to sign in
            </button>
          )}

          <div style={{ marginBottom: '2rem', marginTop: view === 'login' ? '0' : '1rem' }}>
            
            {view === 'login' && (
              <>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#202124', margin: '0 0 0.5rem 0', fontFamily: "'Google Sans', Roboto, Arial, sans-serif" }}>Sign in</h2>
                <p style={{ color: '#5f6368', margin: 0, fontSize: '1rem' }}>Use your Multi Marg Account</p>
              </>
            )}
            
            {view === 'forgot' && (
              <>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#202124', margin: '0 0 0.5rem 0', fontFamily: "'Google Sans', Roboto, Arial, sans-serif" }}>Account recovery</h2>
                <p style={{ color: '#5f6368', margin: 0, fontSize: '1rem' }}>Recover your Multi Marg Account</p>
              </>
            )}
            
            {view === 'otp' && (
              <>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#202124', margin: '0 0 0.5rem 0', fontFamily: "'Google Sans', Roboto, Arial, sans-serif" }}>Verify it's you</h2>
                <p style={{ color: '#5f6368', margin: 0, fontSize: '1rem' }}>We sent a code to <strong>{email}</strong></p>
              </>
            )}
            
            {view === 'reset' && (
              <>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#202124', margin: '0 0 0.5rem 0', fontFamily: "'Google Sans', Roboto, Arial, sans-serif" }}>Change password</h2>
                <p style={{ color: '#5f6368', margin: 0, fontSize: '1rem' }}>Create a strong password</p>
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
                <div className="icon-wrapper"><Mail size={18} strokeWidth={2} /></div>
                <input 
                  id="login-email"
                  name="email"
                  type="email" 
                  className="input-field"
                  placeholder="Email or phone" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  autoComplete="username"
                />
              </div>

              <div className="input-group" style={{ marginBottom: '0.75rem' }}>
                <div className="icon-wrapper"><Lock size={18} strokeWidth={2} /></div>
                <input 
                  id="login-password"
                  name="password"
                  type="password" 
                  className="input-field"
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  autoComplete="current-password"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.5rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="link-btn"
                  onClick={() => { setView('forgot'); setError(''); setSuccessMsg(''); }}
                >
                  Forgot password?
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.5rem', marginTop: 0 }} disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', margin: '2rem 0 1.5rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                <span style={{ padding: '0 1rem', color: '#64748b', fontSize: '0.85rem' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
              </div>
              
              <button 
                type="button" 
                className="google-btn" 
                onClick={() => setSuccessMsg('Google Single Sign-On (SSO) integration is coming soon!')}
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

          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword}>
              <div className="input-group" style={{ marginBottom: '2rem' }}>
                <div className="icon-wrapper"><Mail size={18} strokeWidth={2} /></div>
                <input 
                  id="forgot-email"
                  name="email"
                  type="email" 
                  className="input-field"
                  placeholder="Email or phone" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  autoComplete="username"
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.5rem', marginTop: 0 }} disabled={loading}>
                  {loading ? 'Sending...' : 'Next'}
                </button>
              </div>
            </form>
          )}
          
          {view === 'otp' && (
            <form onSubmit={handleVerifyOtp}>
              <div className="input-group">
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
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
                <button 
                  type="button" 
                  className="link-btn"
                  onClick={handleForgotPassword}
                  style={{ color: resendTimer > 0 ? '#80868b' : '#1a73e8', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer' }}
                  disabled={loading || resendTimer > 0}
                >
                  {resendTimer > 0 ? `Resend code in ${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')}` : 'Resend code'}
                </button>
                
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.5rem', marginTop: 0 }} disabled={loading || otp.length !== 6}>
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>
          )}
          
          {view === 'reset' && (
            <form onSubmit={handleResetPassword}>
              <div className="input-group">
                <div className="icon-wrapper"><Lock size={18} strokeWidth={2} /></div>
                <input 
                  id="new-password"
                  name="newPassword"
                  type="password" 
                  className="input-field"
                  placeholder="Create password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required 
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              
              <div className="input-group" style={{ marginBottom: '2rem' }}>
                <div className="icon-wrapper"><CheckCircle size={18} strokeWidth={2} /></div>
                <input 
                  id="confirm-password"
                  name="confirmPassword"
                  type="password" 
                  className="input-field"
                  placeholder="Confirm password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required 
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.5rem', marginTop: 0 }} disabled={loading || !newPassword || !confirmPassword}>
                  {loading ? 'Saving...' : 'Save password'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

    </div>
  );
};

export default Login;
