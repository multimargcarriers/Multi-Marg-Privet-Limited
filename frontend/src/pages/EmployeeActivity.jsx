import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDialog } from '../context/DialogContext';
import axios from 'axios';
import { Users, Activity, Search, ShieldCheck, LogOut, CheckCircle, Clock, Globe, Monitor, Shield, Mail, Hash, AlertTriangle, XCircle, Eye, MapPin, Server, Smartphone, Network, Fingerprint,  X } from 'lucide-react';
import { formatDate } from '../utils/formatters';

const EmployeeActivity = () => {
  const { token, user } = useContext(AuthContext);
  const { addToast } = useToast();
  const { confirm } = useDialog();
  
  const [activeTab, setActiveTab] = useState('activities');
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [failedLogins, setFailedLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [failedSearchTerm, setFailedSearchTerm] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, activityRes, failedRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/activity`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/failed-google-logins`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (usersRes.data?.success) {
          setUsers(usersRes.data.data);
        }
        if (activityRes.data?.success) {
          setActivities(activityRes.data.data);
        }
        if (failedRes.data?.success) {
          setFailedLogins(failedRes.data.data);
        }
      } catch (err) {
        console.error(err);
        addToast("Failed to fetch IAM data", "error");
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      fetchData();
    }
  }, [token, addToast]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.employeeId && u.employeeId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredActivities = activities.filter(a => {
    const u = users.find(user => user.id === a.userId);
    const searchStr = activitySearchTerm.toLowerCase();
    return (
      (u && u.name.toLowerCase().includes(searchStr)) ||
      (a.ip && a.ip.toLowerCase().includes(searchStr)) ||
      (a.location && a.location.toLowerCase().includes(searchStr)) ||
      (a.title && a.title.toLowerCase().includes(searchStr))
    );
  });

  const filteredFailedLogins = failedLogins.filter(f => {
    const searchStr = failedSearchTerm.toLowerCase();
    return (
      (f.email && f.email.toLowerCase().includes(searchStr)) ||
      (f.ip && f.ip.toLowerCase().includes(searchStr)) ||
      (f.reason && f.reason.toLowerCase().includes(searchStr)) ||
      (f.userAgent && f.userAgent.toLowerCase().includes(searchStr))
    );
  });

  const getUserDetails = (userId) => {
    return users.find(u => u.id === userId) || { name: 'Unknown User', email: 'N/A' };
  };

  const isSupremeAdmin = user?.email === 'praveen.pr105@gmail.com' || user?.role?.toLowerCase() === 'superadmin' || user?.role?.toLowerCase() === 'super_admin';

  const liveSessions = users.map(u => {
    const userActs = activities.filter(a => a.userId === u.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastAct = userActs[0];
    const isOnline = lastAct?.type === 'login';
    const lastLogin = userActs.find(a => a.type === 'login');
    const lastLogout = userActs.find(a => a.type === 'logout');
    return {
      user: u,
      isOnline,
      lastLoginDate: lastLogin?.date,
      lastLogoutDate: lastLogout?.date,
      lastIp: lastAct?.ip || 'Unknown',
      lastLocation: lastAct?.location || 'Unknown'
    };
  }).sort((a, b) => (b.isOnline === a.isOnline ? 0 : (b.isOnline ? 1 : -1)));

  const handleDeleteReport = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Threat Report",
      message: "Are you sure you want to permanently delete this threat report?",
      confirmText: "Delete Permanently",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    try {
      const res = await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/failed-google-logins/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        addToast("Report deleted permanently.", "success");
        setFailedLogins(prev => prev.filter(f => f.id !== id));
        if (selectedAttempt?.id === id) setIsModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || "Failed to delete report.", "error");
    }
  };

  const handleForceLogout = async (userId, userName) => {
    const isConfirmed = await confirm({
      title: "Force Logout & Ban",
      message: `Are you sure you want to forcibly logout and ban ${userName} for 3 minutes?`,
      confirmText: "Force Logout",
      cancelText: "Cancel",
      requireInput: "ban"
    });
    if (!isConfirmed) return;
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/force-logout/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        addToast(`${userName} has been forcefully logged out and banned for 3 minutes.`, "success");
        // Update local state to reflect logout immediately without full reload
        setActivities(prev => [{
          id: Date.now().toString(),
          userId,
          type: 'logout',
          title: 'Forcibly logged out (3m Ban)',
          date: new Date().toISOString(),
          location: 'System Action',
          ip: 'Supreme Admin'
        }, ...prev]);
      }
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || "Failed to force logout.", "error");
    }
  };

  const tabStyle = (tabName) => ({
    background: 'none', border: 'none', padding: '1rem 1.5rem', cursor: 'pointer',
    fontSize: '1rem', fontWeight: 600, color: activeTab === tabName ? 'var(--primary-color)' : 'var(--text-muted)',
    borderBottom: activeTab === tabName ? '3px solid var(--primary-color)' : '3px solid transparent',
    display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', flex: '1 1 auto', justifyContent: 'center'
  });

  return (
    <div className="fade-in" style={{ padding: '2rem', width: "100%", margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-dark)', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={32} color="var(--primary-color)" /> IAM & Activity Logs
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>
            Monitor employee data, security events, and login history across the enterprise.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('activities')} style={tabStyle('activities')}>
          <Activity size={18} /> Global Activity Logs
        </button>
        <button onClick={() => setActiveTab('employees')} style={tabStyle('employees')}>
          <Users size={18} /> Employee Data Directory
        </button>
        <button onClick={() => setActiveTab('failed')} style={tabStyle('failed')}>
          <AlertTriangle size={18} /> Failed Login Attempts
          {failedLogins.length > 0 && (
            <span style={{
              background: '#ef4444', color: '#fff', borderRadius: '50%', minWidth: '22px', height: '22px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700,
              marginLeft: '0.25rem', padding: '0 5px', animation: 'pulse 2s infinite'
            }}>
              {failedLogins.length}
            </span>
          )}
        </button>
        {isSupremeAdmin && (
          <button onClick={() => setActiveTab('live_sessions')} style={tabStyle('live_sessions')}>
            <Monitor size={18} /> Live Sessions Audit
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          Loading enterprise data...
        </div>
      ) : (
        <>
          {activeTab === 'activities' && (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                  <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    placeholder="Search logs by name, IP..."
                    value={activitySearchTerm}
                    onChange={(e) => setActivitySearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)', overflowX: 'auto', boxShadow: 'var(--shadow-sm)' }}>
                <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: 'var(--bg-color)' }}>
                    <tr>
                      <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Event</th>
                      <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Employee</th>
                      <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Timestamp</th>
                      <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Location & IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No activities found.</td>
                      </tr>
                    ) : (
                      filteredActivities.map((log) => {
                        const employee = getUserDetails(log.userId);
                        return (
                          <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg-color)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '1rem 1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ color: log.type === 'logout' ? '#ef4444' : log.type === 'security' ? '#3b82f6' : '#10b981', background: log.type === 'logout' ? '#fef2f2' : log.type === 'security' ? '#eff6ff' : '#ecfdf5', padding: '0.5rem', borderRadius: '6px' }}>
                                  {log.type === 'logout' ? <LogOut size={16} /> : log.type === 'security' ? <ShieldCheck size={16} /> : <CheckCircle size={16} />}
                                </div>
                                <span style={{ fontWeight: 500, color: 'var(--text-dark)', fontSize: '0.95rem' }}>{log.title}</span>
                              </div>
                            </td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.9rem' }}>{employee.name}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{employee.email}</span>
                              </div>
                            </td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                <Clock size={14} />
                                {new Date(log.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-dark)', fontSize: '0.85rem' }}><Globe size={12} color="var(--text-muted)" /> {log.location || 'Unknown'}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}><Monitor size={12} /> {log.ip || 'Unknown'}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'employees' && (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                  <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
                {filteredUsers.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No employees found.</div>
                ) : (
                  filteredUsers.map(emp => (
                    <div key={emp.id} style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column' }} className="hover-lift">
                      
                      {/* Banner */}
                      <div style={{ 
                        width: '100%', height: '100px', 
                        background: emp.banner && !emp.banner.startsWith('/api') ? `url(${emp.banner}) center/cover` : (emp.banner ? `url(${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${emp.banner}) center/cover` : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)')
                      }}></div>
                      
                      <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '-30px' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <img 
                            src={emp.photo && !emp.photo.startsWith('/api') ? emp.photo : (emp.photo ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${emp.photo}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=f3f4f6&color=475569`)}
                            alt={emp.name}
                            style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface-color)', backgroundColor: 'var(--surface-color)', boxShadow: 'var(--shadow-sm)' }}
                          />
                          <span style={{ display: 'inline-flex', padding: '0.25rem 0.75rem', background: 'rgba(0, 120, 212, 0.1)', color: '#0078D4', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(0, 120, 212, 0.2)' }}>
                            {emp.role === 'Admin' ? 'Employee' : (emp.role || 'Employee')}
                          </span>
                        </div>

                        <div>
                          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', color: 'var(--text-dark)', fontWeight: 700 }}>{emp.name}</h3>
                          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Mail size={14} /> {emp.email}
                          </p>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <Hash size={14} /> <span style={{ width: '80px', fontWeight: 600 }}>Employee ID:</span> <span style={{ color: 'var(--text-dark)', fontFamily: 'monospace', background: 'var(--bg-color)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{emp.employeeId || 'N/A'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <Clock size={14} /> <span style={{ width: '80px', fontWeight: 600 }}>Created On:</span> <span style={{ color: 'var(--text-dark)' }}>{emp.createdAt ? formatDate(emp.createdAt) : 'N/A'}</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                            <Shield size={14} style={{ marginTop: '2px' }} /> <span style={{ width: '80px', fontWeight: 600 }}>Access Rights:</span> 
                            <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {emp.permissions && emp.permissions.length > 0 ? (
                                emp.permissions.map(p => (
                                  <span key={p} style={{ background: 'var(--bg-color)', color: 'var(--text-dark)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>{p}</span>
                                ))
                              ) : (
                                <span style={{ background: '#fef2f2', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', border: '1px solid #fca5a5' }}>No Access</span>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ===== FAILED LOGIN ATTEMPTS TAB ===== */}
          {activeTab === 'failed' && (
            <div className="fade-in">
              {/* Warning Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: '#991b1b', fontSize: '1rem', fontWeight: 700 }}>
                    Security Alert — Unauthorized Access Attempts
                  </h4>
                  <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.85rem' }}>
                    The following records show failed Google sign-in attempts. These could be fake or unauthorized login attempts. Review regularly and take action on suspicious entries.
                  </p>
                </div>
                <div style={{
                  marginLeft: 'auto',
                  background: '#dc2626',
                  color: '#fff',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  minWidth: '60px',
                  textAlign: 'center',
                  flexShrink: 0
                }}>
                  {failedLogins.length}
                  <div style={{ fontSize: '0.65rem', fontWeight: 500, opacity: 0.9 }}>Total</div>
                </div>
              </div>

              {/* Search */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                  <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    placeholder="Search by email, IP, reason..."
                    value={failedSearchTerm}
                    onChange={(e) => setFailedSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Failed Logins Table */}
              <div style={{ background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid #fecaca', overflowX: 'auto', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.1)' }}>
                <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)' }}>
                    <tr>
                      <th style={{ padding: '1rem 1.25rem', borderBottom: '2px solid #fecaca', color: '#991b1b', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
                      <th style={{ padding: '1rem 1.25rem', borderBottom: '2px solid #fecaca', color: '#991b1b', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Attempted</th>
                      <th style={{ padding: '1rem 1.25rem', borderBottom: '2px solid #fecaca', color: '#991b1b', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</th>
                      <th style={{ padding: '1rem 1.25rem', borderBottom: '2px solid #fecaca', color: '#991b1b', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IP Address</th>
                      <th style={{ padding: '1rem 1.25rem', borderBottom: '2px solid #fecaca', color: '#991b1b', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamp</th>
                      <th style={{ padding: '1rem 1.25rem', borderBottom: '2px solid #fecaca', color: '#991b1b', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Browser / Device</th>
                      <th style={{ padding: '1rem 1.25rem', borderBottom: '2px solid #fecaca', color: '#991b1b', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFailedLogins.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                            <ShieldCheck size={40} color="#10b981" />
                            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#10b981' }}>All Clear!</span>
                            <span>No failed Google login attempts found. Your system is secure.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredFailedLogins.map((attempt, idx) => {
                        // Parse user agent for a shorter display
                        const shortUA = attempt.userAgent
                          ? attempt.userAgent.length > 60 
                            ? attempt.userAgent.substring(0, 60) + '…' 
                            : attempt.userAgent
                          : 'Unknown';

                        return (
                          <tr 
                            key={attempt.id} 
                            style={{ 
                              borderBottom: '1px solid var(--border-color)', 
                              transition: 'background 0.2s',
                              background: idx % 2 === 0 ? 'transparent' : 'rgba(254, 202, 202, 0.05)'
                            }} 
                            onMouseOver={e => e.currentTarget.style.background = '#fef2f2'} 
                            onMouseOut={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(254, 202, 202, 0.05)'}
                          >
                            <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '0.9rem 1.25rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{
                                  background: '#fef2f2',
                                  color: '#ef4444',
                                  borderRadius: '50%',
                                  width: '30px',
                                  height: '30px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <XCircle size={14} />
                                </div>
                                <span style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.9rem' }}>
                                  {attempt.email || 'N/A'}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '0.9rem 1.25rem' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: '#fef2f2',
                                color: '#dc2626',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                border: '1px solid #fecaca'
                              }}>
                                <AlertTriangle size={12} />
                                {attempt.reason || 'Unknown'}
                              </span>
                            </td>
                            <td style={{ padding: '0.9rem 1.25rem' }}>
                              <span style={{ 
                                fontFamily: 'monospace', 
                                fontSize: '0.85rem', 
                                color: 'var(--text-dark)',
                                background: 'var(--bg-color)',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px'
                              }}>
                                {attempt.ip || 'Unknown'}
                              </span>
                            </td>
                            <td style={{ padding: '0.9rem 1.25rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                <Clock size={13} />
                                {attempt.timestamp 
                                  ? new Date(attempt.timestamp).toLocaleString('en-IN', { 
                                      day: '2-digit', month: 'short', year: 'numeric',
                                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                                    })
                                  : 'N/A'}
                              </div>
                            </td>
                            <td style={{ padding: '0.9rem 1.25rem' }}>
                              <span 
                                style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: '1.3', display: 'block', maxWidth: '220px' }}
                                title={attempt.userAgent || 'Unknown'}
                              >
                                {shortUA}
                              </span>
                            </td>
                            <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                              <button 
                                onClick={() => {
                                  setSelectedAttempt(attempt);
                                  setIsModalOpen(true);
                                }}
                                style={{
                                  background: '#ef4444',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '0.5rem 0.85rem',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                                  transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
                                onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
                              >
                                <Eye size={14} /> Full Report
                              </button>
                              <button 
                                onClick={() => handleDeleteReport(attempt.id)}
                                style={{
                                  background: 'transparent',
                                  color: '#ef4444',
                                  border: '1px solid #ef4444',
                                  padding: '0.5rem 0.85rem',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                  marginLeft: '0.5rem',
                                  transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                              >
                                <XCircle size={14} /> Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary footer */}
              {filteredFailedLogins.length > 0 && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1.25rem',
                  background: 'var(--bg-color)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)'
                }}>
                  <span>Showing {filteredFailedLogins.length} of {failedLogins.length} records</span>
                  <span style={{ fontWeight: 600, color: '#dc2626' }}>
                    ⚠ Review suspicious IPs and take necessary security action
                  </span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'live_sessions' && isSupremeAdmin && (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Monitor size={20} color="var(--primary-color)" /> System-Wide Live Sessions (Supreme Audit)
                </h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                   <div style={{ padding: '0.5rem 1rem', background: '#dcfce7', color: '#166534', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', border: '1px solid #bbf7d0' }}>
                     {liveSessions.filter(s => s.isOnline).length} Admins Online
                   </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>Status</th>
                      <th>Admin / Employee</th>
                      <th>Role</th>
                      <th>Last Login Time</th>
                      <th>Last Logout Time</th>
                      <th>Network IP</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveSessions.map((session, i) => (
                      <tr key={i} style={{ background: session.isOnline ? '#f0fdf4' : 'transparent', borderLeft: session.isOnline ? '3px solid #22c55e' : '3px solid transparent' }}>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ 
                            width: '12px', height: '12px', borderRadius: '50%', margin: '0 auto',
                            background: session.isOnline ? '#22c55e' : '#cbd5e1',
                            boxShadow: session.isOnline ? '0 0 8px rgba(34, 197, 94, 0.5)' : 'none'
                          }}></div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{session.user.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{session.user.email}</div>
                        </td>
                        <td>
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: '#f1f5f9', color: '#475569', textTransform: 'uppercase' }}>
                            {session.user.role || 'employee'}
                          </span>
                        </td>
                        <td style={{ color: session.isOnline ? '#166534' : 'var(--text-muted)', fontWeight: session.isOnline ? 600 : 400 }}>
                          {session.lastLoginDate ? new Date(session.lastLoginDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {session.lastLogoutDate ? new Date(session.lastLogoutDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {session.lastIp} <br/>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'sans-serif' }}>{session.lastLocation}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {session.isOnline && (
                            <button 
                              onClick={() => handleForceLogout(session.user.id, session.user.name)}
                              style={{
                                background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.4rem 0.75rem',
                                borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s',
                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                              }}
                              onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                              onMouseOut={e => e.currentTarget.style.background = '#fef2f2'}
                            >
                              <LogOut size={14} /> Force Logout
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {liveSessions.length === 0 && (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No session data available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Security Threat Intelligence Modal */}
      {isModalOpen && selectedAttempt && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setIsModalOpen(false)}>
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', position: 'sticky', top: 0, zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.2)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Fingerprint size={28} color="#ffffff" />
                </div>
                <div>
                  <h2 style={{ color: '#ffffff', margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Threat Intelligence Report</h2>
                  <p style={{ color: '#fca5a5', margin: '0.25rem 0 0 0', fontSize: '0.9rem', fontWeight: 500 }}>Comprehensive forensic data for unauthorized access attempt</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', background: '#f8fafc' }}>
              
              {/* Identity Block */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ background: '#f1f5f9', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase' }}>
                  <Users size={16} /> Attacker Identity Profile
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    {selectedAttempt.picture ? (
                      <img src={selectedAttempt.picture} alt="Profile" style={{ width: '64px', height: '64px', borderRadius: '50%', border: '3px solid #ef4444', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#334155', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, border: '3px solid #ef4444' }}>
                        {(selectedAttempt.name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>{selectedAttempt.name || 'Unknown'}</div>
                      <div style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Mail size={14} /> {selectedAttempt.email || 'N/A'}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Google ID</div>
                      <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500, wordBreak: 'break-all' }}>{selectedAttempt.googleId || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Failure Reason</div>
                      <div style={{ fontSize: '0.9rem', color: '#dc2626', fontWeight: 700, display: 'inline-block', background: '#fef2f2', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #fecaca' }}>{selectedAttempt.reason || 'Unknown'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Locale</div>
                      <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>{selectedAttempt.googleLocale || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Hosted Domain</div>
                      <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>{selectedAttempt.googleDomain || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Geo/Network Block */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ background: '#f1f5f9', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase' }}>
                  <MapPin size={16} /> Geo-Location & Network
                </div>
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <Server size={24} color="#3b82f6" style={{ flexShrink: 0, marginTop: '4px' }} />
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{selectedAttempt.ip || 'Unknown'}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>IP Address / X-Forwarded-For Chain: <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>{selectedAttempt.ipChain || 'N/A'}</span></div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Location</div>
                      <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>{selectedAttempt.location || 'Unknown'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Country Code</div>
                      <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>{selectedAttempt.countryCode || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>ISP</div>
                      <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>{selectedAttempt.isp || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Organization</div>
                      <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>{selectedAttempt.org || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Coordinates</div>
                      <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>{selectedAttempt.lat ? `${selectedAttempt.lat}, ${selectedAttempt.lon}` : 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Timezone / ZIP</div>
                      <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>{selectedAttempt.timezone || 'N/A'} / {selectedAttempt.zip || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Threat Flags */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {selectedAttempt.proxy ? <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AlertTriangle size={12}/> VPN / PROXY</span> : null}
                    {selectedAttempt.hosting ? <span style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Server size={12}/> DATACENTER</span> : null}
                    {selectedAttempt.mobile ? <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Smartphone size={12}/> MOBILE IP</span> : null}
                  </div>
                </div>
              </div>

              {/* Request Footprint Block */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', gridColumn: '1 / -1' }}>
                <div style={{ background: '#f1f5f9', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase' }}>
                  <Network size={16} /> Device & Request Footprint
                </div>
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>User Agent String</div>
                    <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500, fontFamily: 'monospace', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', wordBreak: 'break-all' }}>
                      {selectedAttempt.userAgent || 'Unknown'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Referer</div>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500, wordBreak: 'break-all' }}>{selectedAttempt.referer || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Origin</div>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500, wordBreak: 'break-all' }}>{selectedAttempt.origin || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Client Platform</div>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500 }}>{selectedAttempt.secChUaPlatform || 'N/A'} {selectedAttempt.secChUaMobile === '?1' ? '(Mobile)' : ''}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Browser Engine</div>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500 }}>{selectedAttempt.secChUa || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Accept Language</div>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500 }}>{selectedAttempt.acceptLanguage || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Timestamp</div>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }}>
                        {selectedAttempt.timestamp 
                          ? new Date(selectedAttempt.timestamp).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'long' })
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
            
            {/* Modal Footer */}
            <div style={{ background: '#fff', padding: '1.25rem 2rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <button onClick={() => handleDeleteReport(selectedAttempt.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.6rem 1.5rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#fee2e2'} onMouseOut={e => e.currentTarget.style.background = '#fef2f2'}>
                <XCircle size={16} /> Delete Report Permanently
              </button>
              <button onClick={() => setIsModalOpen(false)} style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '0.6rem 1.5rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'} onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}>
                Close Report
              </button>
            </div>
            
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EmployeeActivity;
