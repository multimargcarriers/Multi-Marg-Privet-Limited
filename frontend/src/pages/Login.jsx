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
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Animated Background Elements */}
      <div style={{ position: 'absolute', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(13, 110, 253, 0.15), transparent 70%)', top: '-10%', left: '-10%', borderRadius: '50%', animation: 'float 8s ease-in-out infinite alternate' }} />
      <div style={{ position: 'absolute', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(92, 167, 155, 0.15), transparent 70%)', bottom: '-10%', right: '-5%', borderRadius: '50%', animation: 'float 10s ease-in-out infinite alternate-reverse' }} />

      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '3rem 2.5rem', zIndex: 10, animation: 'slide-in-up 0.6s ease-out', position: 'relative' }}>
        
        {view !== 'login' && (
          <button 
            onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }}
            style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
        )}

        <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: view !== 'login' ? '1rem' : '0' }}>
          <div style={{ margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/mc.png" alt="Multimarg Carriers Logo" style={{ height: "60px" }} />
          </div>
          
          {view === 'login' && (
            <>
              <h3 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome Back</h3>
              <p className="text-muted">Login to <strong className="gradient-text">MULTIMARG CARRIERS</strong></p>
            </>
          )}
          
          {view === 'forgot' && (
            <>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Reset Password</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>Enter your email to receive a verification code.</p>
            </>
          )}
          
          {view === 'otp' && (
            <>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Verify Email</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>Enter the 6-digit code sent to <strong style={{color: 'var(--text-dark)'}}>{email}</strong>.</p>
            </>
          )}
          
          {view === 'reset' && (
            <>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>New Password</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>Create a strong password for your account.</p>
            </>
          )}
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {error}
          </div>
        )}
        
        {successMsg && (
          <div style={{ background: '#dcfce7', color: '#166534', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <CheckCircle size={16} /> {successMsg}
          </div>
        )}

        {view === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="your-email@gmail.com" 
                  style={{ paddingLeft: '2.5rem' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <button 
                  type="button" 
                  onClick={() => { setView('forgot'); setError(''); setSuccessMsg(''); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="••••••••" 
                  style={{ paddingLeft: '2.5rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', fontWeight: 600 }} disabled={loading}>
              {loading ? 'Authenticating...' : 'Log In →'}
            </button>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword}>
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="Enter your registered email" 
                  style={{ paddingLeft: '2.5rem' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={loading}>
              {loading ? 'Sending Code...' : <>Send Reset Code <ArrowRight size={18} /></>}
            </button>
          </form>
        )}
        
        {view === 'otp' && (
          <form onSubmit={handleVerifyOtp}>
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Verification Code (OTP)</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Key size={18} />
                </div>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="6-digit code" 
                  style={{ paddingLeft: '2.5rem', fontSize: '1.2rem', letterSpacing: '2px', fontWeight: 600 }}
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required 
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying...' : <>Verify Code <ArrowRight size={18} /></>}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Didn't receive it? </span>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                disabled={loading}
              >
                Resend Code
              </button>
            </div>
          </form>
        )}
        
        {view === 'reset' && (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="New password" 
                  style={{ paddingLeft: '2.5rem' }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required 
                  minLength={6}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="Confirm new password" 
                  style={{ paddingLeft: '2.5rem' }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required 
                  minLength={6}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={loading || !newPassword || !confirmPassword}>
              {loading ? 'Resetting...' : <>Reset Password <CheckCircle size={18} /></>}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default Login;
