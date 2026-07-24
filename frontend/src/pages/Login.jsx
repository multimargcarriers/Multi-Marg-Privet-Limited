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
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif"
    }}>
      
      {/* --- STUNNING BACKGROUND MESH & BLOBS --- */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-10%', left: '-10%', width: '60vw', height: '60vw',
          background: 'radial-gradient(circle, rgba(147,197,253,0.4) 0%, rgba(255,255,255,0) 70%)',
          borderRadius: '50%', filter: 'blur(60px)', animation: 'float 15s ease-in-out infinite alternate'
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-10%', width: '70vw', height: '70vw',
          background: 'radial-gradient(circle, rgba(196,181,253,0.4) 0%, rgba(255,255,255,0) 70%)',
          borderRadius: '50%', filter: 'blur(80px)', animation: 'float 20s ease-in-out infinite alternate-reverse'
        }} />
        <div style={{
          position: 'absolute', top: '20%', right: '20%', width: '30vw', height: '30vw',
          background: 'radial-gradient(circle, rgba(253,164,175,0.2) 0%, rgba(255,255,255,0) 70%)',
          borderRadius: '50%', filter: 'blur(40px)', animation: 'float 10s ease-in-out infinite alternate'
        }} />
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
        .glass-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 24px;
          padding: 3.5rem 3rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255,255,255,0.5) inset;
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .input-group {
          position: relative;
          margin-bottom: 1.25rem;
        }
        .input-field {
          width: 100%;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(203, 213, 225, 0.6);
          padding: 1rem 1rem 1rem 3rem;
          border-radius: 12px;
          color: #0f172a;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.3s ease;
          outline: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02) inset;
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
          background: rgba(254, 226, 226, 0.8);
          color: #b91c1c;
          border: 1px solid rgba(252, 165, 165, 0.5);
        }
        .alert-success {
          background: rgba(220, 252, 231, 0.8);
          color: #15803d;
          border: 1px solid rgba(134, 239, 172, 0.5);
        }
      `}</style>

      <div className="glass-card">
        
        {view !== 'login' && (
          <button 
            onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }}
            className="link-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '2rem' }}
          >
            <ArrowLeft size={16} /> Back to Sign In
          </button>
        )}

        <div style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: view === 'login' ? '0' : '1rem' }}>
          <img src="/mc.png" alt="Logo" style={{ height: '55px', margin: '0 auto 1.5rem', display: 'block', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.05))' }} />
          
          {view === 'login' && (
            <>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.025em' }}>Welcome back</h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Enter your details to access your account</p>
            </>
          )}
          
          {view === 'forgot' && (
            <>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.025em' }}>Recover password</h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>We'll email you a secure verification code</p>
            </>
          )}
          
          {view === 'otp' && (
            <>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.025em' }}>Verify your email</h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>We sent a code to <strong style={{color: '#0f172a'}}>{email}</strong></p>
            </>
          )}
          
          {view === 'reset' && (
            <>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.025em' }}>New password</h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Create a strong password to secure your account</p>
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
                style={{ fontSize: '1.25rem', letterSpacing: '4px', textAlign: 'center', paddingLeft: '1rem' }}
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
  );
};

export default Login;
