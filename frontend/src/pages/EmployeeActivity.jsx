import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import { Users, Activity, Search, ShieldCheck, LogOut, CheckCircle, Clock, Globe, Monitor, Shield, Mail, Hash } from 'lucide-react';

const EmployeeActivity = () => {
  const { token, user } = useContext(AuthContext);
  const { addToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('activities');
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activitySearchTerm, setActivitySearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, activityRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/activity`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (usersRes.data?.success) {
          setUsers(usersRes.data.data);
        }
        if (activityRes.data?.success) {
          setActivities(activityRes.data.data);
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

  const getUserDetails = (userId) => {
    return users.find(u => u.id === userId) || { name: 'Unknown User', email: 'N/A' };
  };

  return (
    <div className="fade-in" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      
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
        <button 
          onClick={() => setActiveTab('activities')}
          style={{ 
            background: 'none', border: 'none', padding: '1rem 1.5rem', cursor: 'pointer',
            fontSize: '1rem', fontWeight: 600, color: activeTab === 'activities' ? 'var(--primary-color)' : 'var(--text-muted)',
            borderBottom: activeTab === 'activities' ? '3px solid var(--primary-color)' : '3px solid transparent',
            display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', flex: '1 1 auto', justifyContent: 'center'
          }}
        >
          <Activity size={18} /> Global Activity Logs
        </button>
        <button 
          onClick={() => setActiveTab('employees')}
          style={{ 
            background: 'none', border: 'none', padding: '1rem 1.5rem', cursor: 'pointer',
            fontSize: '1rem', fontWeight: 600, color: activeTab === 'employees' ? 'var(--primary-color)' : 'var(--text-muted)',
            borderBottom: activeTab === 'employees' ? '3px solid var(--primary-color)' : '3px solid transparent',
            display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', flex: '1 1 auto', justifyContent: 'center'
          }}
        >
          <Users size={18} /> Employee Data Directory
        </button>
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
                            <Clock size={14} /> <span style={{ width: '80px', fontWeight: 600 }}>Created On:</span> <span style={{ color: 'var(--text-dark)' }}>{emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : 'N/A'}</span>
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
        </>
      )}
    </div>
  );
};

export default EmployeeActivity;
