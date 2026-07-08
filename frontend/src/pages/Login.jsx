import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/login`, {
        email,
        password
      });

      if (response.data.success) {
        // Store token/user info using AuthContext
        login(response.data.data.user, response.data.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Animated Background Elements */}
      <div style={{ position: 'absolute', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(13,110,253,0.15), transparent 70%)', top: '-10%', left: '-10%', borderRadius: '50%', animation: 'float 8s ease-in-out infinite alternate' }} />
      <div style={{ position: 'absolute', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(92,167,255,0.15), transparent 70%)', bottom: '-10%', right: '-5%', borderRadius: '50%', animation: 'float 10s ease-in-out infinite alternate-reverse' }} />

      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '3rem 2.5rem', zIndex: 10, animation: 'slide-in-up 0.6s ease-out' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/mc.png" alt="Multimarg Carriers Logo" style={{ height: "60px" }} />
          </div>
          <h3 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome Back</h3>
          <p className="text-muted">Login to <strong className="gradient-text">MULTIMARG CARRIERS</strong></p>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center', fontWeight: '500' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="your-email@gmail.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Log In →'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
