import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Mail, Lock, Key, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

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
        setResendTimer(180);
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
      backgroundColor: '#f8fafc',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif"
    }}>
      
      {/* --- LEFT SIDE: 60% SHOWCASE (Hidden on Mobile) --- */}
      <div className="showcase-sidebar" style={{
        flex: '0 0 60%',
        background: 'linear-gradient(135deg, #020617 0%, #1e3a8a 100%)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3rem 4rem',
        color: 'white',
        overflow: 'hidden'
      }}>
        {/* Abstract Dark Background Elements */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', filter: 'blur(60px)', animation: 'float 15s ease-in-out infinite alternate', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', filter: 'blur(80px)', animation: 'float 20s ease-in-out infinite alternate-reverse', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 10 }}>
          <img src="/mc.png" alt="Multi Marg Logo" style={{ height: '70px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))', marginBottom: '1.5rem' }} />
          
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.025em', background: 'linear-gradient(to right, #ffffff, #93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Driving the Future of Transport.
          </h1>
          
          <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1.6, maxWidth: '80%', marginBottom: '3rem' }}>
            Multi Marg Private Limited is revolutionizing logistics across India with unmatched speed, uncompromised safety, and total reliability.
          </p>

          {/* Marketing Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.25rem', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'inline-flex', background: 'rgba(56, 189, 248, 0.1)', padding: '0.75rem', borderRadius: '12px', color: '#38bdf8', marginBottom: '1rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Nationwide</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>End-to-end coverage across India.</p>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.25rem', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'inline-flex', background: 'rgba(167, 139, 250, 0.1)', padding: '0.75rem', borderRadius: '12px', color: '#a78bfa', marginBottom: '1rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>24/7 Support</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>Premium assistance anytime.</p>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.25rem', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'inline-flex', background: 'rgba(52, 211, 153, 0.1)', padding: '0.75rem', borderRadius: '12px', color: '#34d399', marginBottom: '1rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Maximum Security</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>State-of-the-art fleet tracking.</p>
            </div>
          </div>
        </div>

        {/* Map API Section */}
        <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '220px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d116834.00977792036!2d86.35338048600062!3d23.78082980749008!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39f6a74204d8095b%3A0xc48e9d6d1c8c1995!2sDhanbad%2C%20Jharkhand!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin" 
            width="100%" 
            height="100%" 
            style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) contrast(85%)' }} // Dark mode filter for generic iframe
            allowFullScreen="" 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade">
          </iframe>
          <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.2)' }}>
            📍 HQ: Dhanbad, Jharkhand
          </div>
        </div>
      </div>

      {/* --- RIGHT SIDE: 40% LOGIN FORM --- */}
      <div style={{
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        background: '#ffffff'
      }}>
        
        {/* Subtle background element behind form */}
        <div style={{ position: 'absolute', top: '10%', right: '10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div className="login-form-container" style={{ width: '100%', maxWidth: '440px', animation: 'fadeIn 0.5s ease-out' }}>
          
          {/* Mobile Logo (Visible only when left sidebar hides) */}
          <div className="mobile-only-logo" style={{ display: 'none', textAlign: 'center', marginBottom: '2rem' }}>
            <img src="/mc.png" alt="Logo" style={{ height: '60px' }} />
          </div>

          <style>{`
            @keyframes float {
              0% { transform: translate(0, 0) scale(1); }
              100% { transform: translate(5%, 10%) scale(1.1); }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
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
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 1rem 1rem 1rem 3rem;
              border-radius: 12px;
              color: #0f172a;
              font-size: 1rem;
              font-weight: 500;
              transition: all 0.3s ease;
              outline: none;
            }
            .input-field:focus {
              background: #ffffff;
              border-color: #3b82f6;
              box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
            }
            .input-field::placeholder {
              color: #94a3b8;
              font-weight: 400;
            }
            .icon-wrapper {
              position: absolute;
              left: 1rem;
              top: 50%;
              transform: translateY(-50%);
              color: #94a3b8;
              transition: color 0.3s ease;
              pointer-events: none;
            }
            .input-group:focus-within .icon-wrapper {
              color: #3b82f6;
            }
            .btn-primary {
              width: 100%;
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: white;
              border: none;
              padding: 1rem;
              border-radius: 12px;
              font-size: 1rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 10px 20px -10px rgba(37, 99, 235, 0.6);
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 0.5rem;
              margin-top: 1.5rem;
            }
            .btn-primary:hover:not(:disabled) {
              transform: translateY(-2px);
              box-shadow: 0 15px 25px -10px rgba(37, 99, 235, 0.8);
            }
            .btn-primary:active:not(:disabled) {
              transform: translateY(0);
            }
            .btn-primary:disabled {
              opacity: 0.7;
              cursor: not-allowed;
              background: #94a3b8;
              box-shadow: none;
            }
            .link-btn {
              background: transparent;
              border: none;
              color: #64748b;
              font-size: 0.875rem;
              font-weight: 600;
              cursor: pointer;
              transition: color 0.2s;
              padding: 0;
            }
            .link-btn:hover {
              color: #3b82f6;
            }
            .alert-box {
              padding: 1rem;
              border-radius: 12px;
              margin-bottom: 1.5rem;
              font-size: 0.9rem;
              font-weight: 500;
              display: flex;
              align-items: flex-start;
              gap: 0.75rem;
              animation: fadeIn 0.3s ease forwards;
            }
            .alert-error {
              background: #fef2f2;
              color: #b91c1c;
              border: 1px solid #fca5a5;
            }
            .alert-success {
              background: #f0fdf4;
              color: #15803d;
              border: 1px solid #86efac;
            }
          `}</style>
          
          {view !== 'login' && (
            <button 
              onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }}
              className="link-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '2rem' }}
            >
              <ArrowLeft size={16} /> Back to Sign In
            </button>
          )}

          <div style={{ marginBottom: '2.5rem', marginTop: view === 'login' ? '0' : '1rem' }}>
            
            {view === 'login' && (
              <>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.025em' }}>Welcome back</h2>
                <p style={{ color: '#64748b', margin: 0, fontSize: '1rem' }}>Sign in to access the administrator portal</p>
              </>
            )}
            
            {view === 'forgot' && (
              <>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.025em' }}>Recover password</h2>
                <p style={{ color: '#64748b', margin: 0, fontSize: '1rem' }}>We'll email you a secure verification code</p>
              </>
            )}
            
            {view === 'otp' && (
              <>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.025em' }}>Verify your email</h2>
                <p style={{ color: '#64748b', margin: 0, fontSize: '1rem' }}>We sent a code to <strong style={{color: '#0f172a'}}>{email}</strong></p>
              </>
            )}
            
            {view === 'reset' && (
              <>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.025em' }}>New password</h2>
                <p style={{ color: '#64748b', margin: 0, fontSize: '1rem' }}>Create a strong password to secure your account</p>
              </>
            )}
          </div>

          {error && (
            <div className="alert-box alert-error">
              <div style={{marginTop: '2px'}}><ShieldAlert size={18} /></div>
              <div>{error}</div>
            </div>
          )}
          
          {successMsg && (
            <div className="alert-box alert-success">
              <div style={{marginTop: '2px'}}><CheckCircle size={18} /></div>
              <div>{successMsg}</div>
            </div>
          )}

          {view === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="input-group">
                <div className="icon-wrapper"><Mail size={20} strokeWidth={1.5} /></div>
                <input 
                  type="email" 
                  className="input-field"
                  placeholder="Email address" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>

              <div className="input-group" style={{ marginBottom: '0.75rem' }}>
                <div className="icon-wrapper"><Lock size={20} strokeWidth={1.5} /></div>
                <input 
                  type="password" 
                  className="input-field"
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                <button 
                  type="button" 
                  className="link-btn"
                  onClick={() => { setView('forgot'); setError(''); setSuccessMsg(''); }}
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword}>
              <div className="input-group">
                <div className="icon-wrapper"><Mail size={20} strokeWidth={1.5} /></div>
                <input 
                  type="email" 
                  className="input-field"
                  placeholder="Enter your registered email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Sending Code...' : 'Continue'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          )}
          
          {view === 'otp' && (
            <form onSubmit={handleVerifyOtp}>
              <div className="input-group">
                <div className="icon-wrapper"><Key size={20} strokeWidth={1.5} /></div>
                <input 
                  type="text" 
                  className="input-field"
                  style={{ fontSize: '1.5rem', letterSpacing: '6px', textAlign: 'center', paddingLeft: '1rem', fontWeight: 700 }}
                  placeholder="000000" 
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required 
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading || otp.length !== 6}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Didn't receive a code? </span>
                <button 
                  type="button" 
                  className="link-btn"
                  onClick={handleForgotPassword}
                  style={{ color: resendTimer > 0 ? '#94a3b8' : '#3b82f6', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer' }}
                  disabled={loading || resendTimer > 0}
                >
                  {resendTimer > 0 ? `Resend in ${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')}` : 'Resend now'}
                </button>
              </div>
            </form>
          )}
          
          {view === 'reset' && (
            <form onSubmit={handleResetPassword}>
              <div className="input-group">
                <div className="icon-wrapper"><Lock size={20} strokeWidth={1.5} /></div>
                <input 
                  type="password" 
                  className="input-field"
                  placeholder="New password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required 
                  minLength={6}
                />
              </div>
              
              <div className="input-group">
                <div className="icon-wrapper"><CheckCircle size={20} strokeWidth={1.5} /></div>
                <input 
                  type="password" 
                  className="input-field"
                  placeholder="Confirm new password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required 
                  minLength={6}
                />
              </div>
              
              <button type="submit" className="btn-primary" disabled={loading || !newPassword || !confirmPassword}>
                {loading ? 'Updating...' : 'Secure My Account'}
              </button>
            </form>
          )}

        </div>
      </div>

    </div>
  );
};

export default Login;
