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
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      
      {/* LEFT SIDE - BRANDING (Hidden on small screens) */}
      <div style={{ 
        flex: 1, 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', 
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '4rem',
        color: 'white',
        '@media (maxWidth: 768px)': { display: 'none' } // Note: Inline styles don't support media queries perfectly without a styled component, so we'll use a standard class approach if needed, or just flex-basis.
      }} className="login-sidebar">
        {/* Animated Background Elements */}
        <div style={{ position: 'absolute', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(56, 189, 248, 0.1), transparent 70%)', top: '-10%', left: '-20%', borderRadius: '50%', animation: 'float 12s ease-in-out infinite alternate' }} />
        <div style={{ position: 'absolute', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15), transparent 70%)', bottom: '10%', right: '-10%', borderRadius: '50%', animation: 'float 8s ease-in-out infinite alternate-reverse' }} />
        
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '500px' }}>
          <img src="/mc.png" alt="Logo" style={{ height: '80px', marginBottom: '2rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }} />
          <h1 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', background: 'linear-gradient(to right, #ffffff, #bae6fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Elevating Your Logistics.
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '3rem' }}>
            Experience the next generation of transport management. Streamline operations, track fleet performance, and scale your business effortlessly.
          </p>
          
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8' }}>99.9%</div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Uptime Reliability</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8' }}>24/7</div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Premium Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - FORM */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '2rem',
        background: '#ffffff',
        position: 'relative'
      }}>
        <div style={{ width: '100%', maxWidth: '420px', animation: 'fade-in 0.5s ease-out' }}>
          
          {/* Mobile Logo Header */}
          <div className="mobile-logo-header" style={{ display: 'none', textAlign: 'center', marginBottom: '2rem' }}>
            <img src="/mc.png" alt="Logo" style={{ height: '60px' }} />
          </div>

          {view !== 'login' && (
            <button 
              onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }}
              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', marginBottom: '2rem', fontWeight: 500, padding: 0 }}
            >
              <ArrowLeft size={16} /> Back to Login
            </button>
          )}

          <div style={{ marginBottom: '2.5rem' }}>
            {view === 'login' && (
              <>
                <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Welcome Back</h2>
                <p style={{ color: '#64748b', fontSize: '1rem' }}>Enter your credentials to access your account.</p>
              </>
            )}
            
            {view === 'forgot' && (
              <>
                <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Reset Password</h2>
                <p style={{ color: '#64748b', fontSize: '1rem' }}>We'll send a verification code to your email.</p>
              </>
            )}
            
            {view === 'otp' && (
              <>
                <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Check your email</h2>
                <p style={{ color: '#64748b', fontSize: '1rem' }}>We've sent a 6-digit code to <strong style={{color: '#0f172a'}}>{email}</strong>.</p>
              </>
            )}
            
            {view === 'reset' && (
              <>
                <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Set New Password</h2>
                <p style={{ color: '#64748b', fontSize: '1rem' }}>Please create a strong password for your account.</p>
              </>
            )}
          </div>

          {error && (
            <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: '500', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', borderLeft: '4px solid #ef4444' }}>
              <div style={{marginTop: '2px'}}><Lock size={16} /></div>
              <div>{error}</div>
            </div>
          )}
          
          {successMsg && (
            <div style={{ background: '#f0fdf4', color: '#15803d', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: '500', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', borderLeft: '4px solid #22c55e' }}>
              <div style={{marginTop: '2px'}}><CheckCircle size={16} /></div>
              <div>{successMsg}</div>
            </div>
          )}

          {view === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', backgroundColor: '#f8fafc' }}
                    placeholder="Enter your email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    required 
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Password</label>
                  <button 
                    type="button" 
                    onClick={() => { setView('forgot'); setError(''); setSuccessMsg(''); }}
                    style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', backgroundColor: '#f8fafc' }}
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    required 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                style={{ 
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.875rem', 
                  borderRadius: '8px', 
                  fontSize: '1rem', 
                  fontWeight: 600, 
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '0.5rem',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
                  opacity: loading ? 0.7 : 1
                }} 
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', backgroundColor: '#f8fafc' }}
                    placeholder="Enter your registered email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    required 
                  />
                </div>
              </div>
              <button 
                type="submit" 
                style={{ 
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.875rem', 
                  borderRadius: '8px', 
                  fontSize: '1rem', 
                  fontWeight: 600, 
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
                  opacity: loading ? 0.7 : 1
                }} 
                disabled={loading}
              >
                {loading ? 'Sending Code...' : 'Send Reset Code'}
              </button>
            </form>
          )}
          
          {view === 'otp' && (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Verification Code (OTP)</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Key size={18} />
                  </div>
                  <input 
                    type="text" 
                    style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.25rem', outline: 'none', transition: 'border-color 0.2s', backgroundColor: '#f8fafc', letterSpacing: '4px', fontWeight: 700 }}
                    placeholder="000000" 
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    required 
                  />
                </div>
              </div>
              <button 
                type="submit" 
                style={{ 
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.875rem', 
                  borderRadius: '8px', 
                  fontSize: '1rem', 
                  fontWeight: 600, 
                  cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer',
                  marginTop: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
                  opacity: loading || otp.length !== 6 ? 0.7 : 1
                }} 
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Didn't receive it? </span>
                <button 
                  type="button" 
                  onClick={handleForgotPassword}
                  style={{ background: 'transparent', border: 'none', color: resendTimer > 0 ? '#94a3b8' : '#2563eb', fontSize: '0.85rem', fontWeight: 600, cursor: resendTimer > 0 ? 'not-allowed' : 'pointer', padding: 0 }}
                  disabled={loading || resendTimer > 0}
                >
                  {resendTimer > 0 ? `Resend in ${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')}` : 'Resend Code'}
                </button>
              </div>
            </form>
          )}
          
          {view === 'reset' && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', backgroundColor: '#f8fafc' }}
                    placeholder="Enter new password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    required 
                    minLength={6}
                  />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', backgroundColor: '#f8fafc' }}
                    placeholder="Confirm new password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    required 
                    minLength={6}
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                style={{ 
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.875rem', 
                  borderRadius: '8px', 
                  fontSize: '1rem', 
                  fontWeight: 600, 
                  cursor: loading || !newPassword || !confirmPassword ? 'not-allowed' : 'pointer',
                  marginTop: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
                  opacity: loading || !newPassword || !confirmPassword ? 0.7 : 1
                }} 
                disabled={loading || !newPassword || !confirmPassword}
              >
                {loading ? 'Resetting...' : 'Save New Password'}
              </button>
            </form>
          )}

        </div>
      </div>
      
      {/* Required CSS for mobile responsive hiding */}
      <style>{`
        @media (max-width: 900px) {
          .login-sidebar { display: none !important; }
          .mobile-logo-header { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default Login;
