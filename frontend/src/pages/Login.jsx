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
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f2f1', fontFamily: "'Segoe UI', 'Helvetica Neue', 'Inter', sans-serif" }}>
      
      <div style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', backgroundColor: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', animation: 'fade-in 0.3s ease-out' }}>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <img src="/mc.png" alt="Logo" style={{ height: '36px' }} />
        </div>

        {view !== 'login' && (
          <button 
            onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }}
            style={{ background: 'transparent', border: 'none', color: '#0067b8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem', marginBottom: '1.5rem', padding: 0 }}
          >
            <ArrowLeft size={16} /> Back
          </button>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          {view === 'login' && (
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1b1b1b', margin: 0 }}>Sign in</h2>
          )}
          
          {view === 'forgot' && (
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1b1b1b', margin: 0 }}>Reset your password</h2>
          )}
          
          {view === 'otp' && (
            <>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1b1b1b', margin: 0, marginBottom: '0.5rem' }}>Enter code</h2>
              <p style={{ color: '#1b1b1b', fontSize: '0.95rem', margin: 0 }}>We emailed a code to <strong>{email}</strong>.</p>
            </>
          )}
          
          {view === 'reset' && (
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1b1b1b', margin: 0 }}>Create a new password</h2>
          )}
        </div>

        {error && (
          <div style={{ color: '#d13438', padding: '0', marginBottom: '1rem', fontSize: '0.95rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div style={{marginTop: '2px'}}><Lock size={16} /></div>
            <div>{error}</div>
          </div>
        )}
        
        {successMsg && (
          <div style={{ color: '#107c10', padding: '0', marginBottom: '1rem', fontSize: '0.95rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div style={{marginTop: '2px'}}><CheckCircle size={16} /></div>
            <div>{successMsg}</div>
          </div>
        )}

        {view === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1rem' }}>
              <input 
                type="email" 
                style={{ width: '100%', padding: '0.5rem 0', border: 'none', borderBottom: '1px solid #605e5c', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', backgroundColor: 'transparent', color: '#1b1b1b' }}
                placeholder="Email, phone, or Skype" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={(e) => e.target.style.borderBottom = '2px solid #0067b8'}
                onBlur={(e) => e.target.style.borderBottom = '1px solid #605e5c'}
                required 
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <input 
                type="password" 
                style={{ width: '100%', padding: '0.5rem 0', border: 'none', borderBottom: '1px solid #605e5c', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', backgroundColor: 'transparent', color: '#1b1b1b' }}
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={(e) => e.target.style.borderBottom = '2px solid #0067b8'}
                onBlur={(e) => e.target.style.borderBottom = '1px solid #605e5c'}
                required 
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <button 
                type="button" 
                onClick={() => { setView('forgot'); setError(''); setSuccessMsg(''); }}
                style={{ background: 'transparent', border: 'none', color: '#0067b8', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
              >
                Can't access your account?
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                style={{ 
                  background: '#0067b8', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.5rem 2.5rem', 
                  fontSize: '0.95rem', 
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }} 
                disabled={loading}
              >
                {loading ? 'Please wait...' : 'Sign in'}
              </button>
            </div>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '2rem' }}>
              <input 
                type="email" 
                style={{ width: '100%', padding: '0.5rem 0', border: 'none', borderBottom: '1px solid #605e5c', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', backgroundColor: 'transparent', color: '#1b1b1b' }}
                placeholder="Email address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={(e) => e.target.style.borderBottom = '2px solid #0067b8'}
                onBlur={(e) => e.target.style.borderBottom = '1px solid #605e5c'}
                required 
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                style={{ 
                  background: '#0067b8', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.5rem 2.5rem', 
                  fontSize: '0.95rem', 
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }} 
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Next'}
              </button>
            </div>
          </form>
        )}
        
        {view === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <input 
                type="text" 
                style={{ width: '100%', padding: '0.5rem 0', border: 'none', borderBottom: '1px solid #605e5c', fontSize: '1.25rem', outline: 'none', transition: 'border-color 0.2s', backgroundColor: 'transparent', color: '#1b1b1b', letterSpacing: '2px' }}
                placeholder="Code" 
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                onFocus={(e) => e.target.style.borderBottom = '2px solid #0067b8'}
                onBlur={(e) => e.target.style.borderBottom = '1px solid #605e5c'}
                required 
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                style={{ background: 'transparent', border: 'none', color: resendTimer > 0 ? '#605e5c' : '#0067b8', fontSize: '0.85rem', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer', padding: 0 }}
                disabled={loading || resendTimer > 0}
              >
                {resendTimer > 0 ? `Resend code in ${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')}` : 'Resend code'}
              </button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                style={{ 
                  background: '#0067b8', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.5rem 2.5rem', 
                  fontSize: '0.95rem', 
                  cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer',
                  opacity: loading || otp.length !== 6 ? 0.7 : 1
                }} 
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
        )}
        
        {view === 'reset' && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1rem' }}>
              <input 
                type="password" 
                style={{ width: '100%', padding: '0.5rem 0', border: 'none', borderBottom: '1px solid #605e5c', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', backgroundColor: 'transparent', color: '#1b1b1b' }}
                placeholder="New password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={(e) => e.target.style.borderBottom = '2px solid #0067b8'}
                onBlur={(e) => e.target.style.borderBottom = '1px solid #605e5c'}
                required 
                minLength={6}
              />
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <input 
                type="password" 
                style={{ width: '100%', padding: '0.5rem 0', border: 'none', borderBottom: '1px solid #605e5c', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', backgroundColor: 'transparent', color: '#1b1b1b' }}
                placeholder="Confirm password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={(e) => e.target.style.borderBottom = '2px solid #0067b8'}
                onBlur={(e) => e.target.style.borderBottom = '1px solid #605e5c'}
                required 
                minLength={6}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                style={{ 
                  background: '#0067b8', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.5rem 2.5rem', 
                  fontSize: '0.95rem', 
                  cursor: loading || !newPassword || !confirmPassword ? 'not-allowed' : 'pointer',
                  opacity: loading || !newPassword || !confirmPassword ? 0.7 : 1
                }} 
                disabled={loading || !newPassword || !confirmPassword}
              >
                {loading ? 'Please wait...' : 'Finish'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default Login;
