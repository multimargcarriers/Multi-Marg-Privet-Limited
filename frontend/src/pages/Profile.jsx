import React, { useState, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Camera, User, Mail, Shield, Save, Key, Hash, Activity, Bell, Lock, LogOut, Globe, Clock, Smartphone, CheckCircle, ChevronRight, LayoutGrid, Github, Slack } from 'lucide-react';
import axios from 'axios';

const Profile = () => {
  const { user, updateUser, token, logout } = useContext(AuthContext);
  const { addToast } = useToast();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newId, setNewId] = useState(user?.id || '');
  const [password, setPassword] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(user?.photo || null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  
  const fileInputRef = useRef(null);

  const getAvatarUrl = () => {
    if (photoPreview) {
      if (photoPreview.startsWith('http') || photoPreview.startsWith('blob')) return photoPreview;
      return `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${photoPreview}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=FF9900&color=fff&size=150`;
  };

  const handlePhotoClick = () => {
    fileInputRef.current.click();
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast("Image must be less than 5MB", "error");
        return;
      }
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      if (name !== user.name) formData.append('name', name);
      if (email !== user.email) formData.append('email', email);
      if (newId !== user.id) formData.append('newId', newId);
      if (password) formData.append('password', password);
      if (photo) formData.append('photo', photo);

      // Only send request if there's actually something to update
      let hasUpdates = false;
      for (let pair of formData.entries()) {
        hasUpdates = true;
        break;
      }

      if (!hasUpdates) {
        addToast("No changes made to update.", "info");
        setIsLoading(false);
        return;
      }

      const response = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data?.success) {
        addToast("Profile updated successfully!", "success");
        updateUser(response.data.data.user, response.data.data.token);
        setPassword('');
      } else {
        addToast(response.data?.message || "Failed to update profile", "error");
        if (response.status === 404 || response.status === 401) {
          logout();
        }
      }
    } catch (error) {
      console.error(error);
      addToast(error.response?.data?.message || "An error occurred while updating profile", "error");
      if (error.response?.status === 404 || error.response?.status === 401) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-page fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
          Account Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>
          Manage your account settings and preferences.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '3rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Navigation Sidebar */}
        <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {[
            { id: 'personal', icon: User, label: 'General' },
            { id: 'security', icon: Lock, label: 'Security & Sign-in' },
            { id: 'notifications', icon: Bell, label: 'Notifications' },
            { id: 'integrations', icon: LayoutGrid, label: 'Connected Apps' },
            { id: 'activity', icon: Activity, label: 'Audit Log' }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <div 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ 
                  padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', borderRadius: '8px',
                  backgroundColor: isActive ? 'rgba(26, 115, 232, 0.1)' : 'transparent', 
                  color: isActive ? 'var(--primary-color)' : 'var(--text-dark)', 
                  fontWeight: isActive ? 600 : 500, 
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-color)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon size={18} opacity={isActive ? 1 : 0.6} /> {tab.label}
                </div>
                {isActive && <ChevronRight size={16} />}
              </div>
            );
          })}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {activeTab === 'personal' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Profile Card */}
              <div className="glass-panel" style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-dark)' }}>Avatar</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>This is your avatar. Click on the avatar to upload a custom one.</p>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div 
                      onClick={handlePhotoClick}
                      style={{ width: '80px', height: '80px', borderRadius: '50%', border: '1px solid var(--border-color)', cursor: 'pointer', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}
                      onMouseEnter={(e) => { e.currentTarget.children[1].style.opacity = 1; }}
                      onMouseLeave={(e) => { e.currentTarget.children[1].style.opacity = 0; }}
                    >
                      <img src={getAvatarUrl()} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', color: 'white' }}>
                        <Camera size={24} />
                      </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/jpeg, image/png, image/webp" style={{ display: 'none' }} />
                  </div>
                </div>
                <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>An avatar is optional but strongly recommended.</span>
                </div>
              </div>

              {/* Display Name Card */}
              <div className="glass-panel" style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-dark)' }}>Display Name</h3>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Please enter your full name, or a display name you are comfortable with.</p>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', maxWidth: '400px', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.95rem', outline: 'none' }} />
                </div>
                <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Please use 32 characters at maximum.</span>
                  <button onClick={handleSubmit} style={{ padding: '0.5rem 1rem', background: 'var(--text-dark)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Save</button>
                </div>
              </div>

              {/* Email Card */}
              <div className="glass-panel" style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-dark)' }}>Email Address</h3>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>We will use this email address to communicate with you.</p>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', maxWidth: '400px', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.95rem', outline: 'none' }} />
                </div>
                <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>We will email you to verify the change.</span>
                  <button onClick={handleSubmit} style={{ padding: '0.5rem 1rem', background: 'var(--text-dark)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Save</button>
                </div>
              </div>

              {/* System Role (Read Only) */}
              <div className="glass-panel" style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-dark)' }}>System Role</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Your current role and access level within the system.</p>
                  </div>
                  <span style={{ padding: '0.4rem 1rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', borderRadius: '20px', fontWeight: 600, fontSize: '0.85rem' }}>{user?.role || 'Admin'}</span>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'security' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              <div className="glass-panel" style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-dark)' }}>Change Password</h3>
                  <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Update your password to keep your account secure.</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
                    <input type="password" placeholder="Current Password" style={{ padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.95rem', outline: 'none' }} />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New Password" style={{ padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.95rem', outline: 'none' }} />
                    <input type="password" placeholder="Confirm New Password" style={{ padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.95rem', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ensure your password is at least 8 characters.</span>
                  <button onClick={handleSubmit} style={{ padding: '0.5rem 1rem', background: 'var(--text-dark)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Update Password</button>
                </div>
              </div>

              <div className="glass-panel" style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-dark)' }}>Two-Factor Authentication (2FA)</h3>
                  <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Add an extra layer of security to your account.</p>
                  
                  <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <Smartphone size={24} color="var(--text-muted)" />
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-dark)' }}>Authenticator App</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Use an app like Google Authenticator to generate codes.</p>
                      </div>
                    </div>
                    <button style={{ padding: '0.4rem 1rem', background: 'transparent', color: 'var(--text-dark)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Enable</button>
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-dark)' }}>Active Sessions</h3>
                  <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage the devices that are logged into your account.</p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <Globe size={24} color="var(--primary-color)" />
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Windows PC - Chrome <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: '#ecfdf5', color: '#10b981', borderRadius: '4px' }}>Active Now</span></h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mumbai, India • IP: 192.168.1.100</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-panel" style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-dark)' }}>Notification Preferences</h3>
                  <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Choose how you want to be notified about activity in your account.</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {[
                      { title: "Email Notifications", desc: "Receive daily summary reports and billing updates via email." },
                      { title: "Push Notifications", desc: "Get real-time browser alerts when a booking is created or assigned." },
                      { title: "SMS Alerts", desc: "Receive text messages for critical dispatches or emergency alerts." },
                      { title: "Weekly Digest", desc: "Receive a weekly overview of your logistics performance." }
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 0', borderBottom: idx !== 3 ? '1px solid var(--border-color)' : 'none' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-dark)' }}>{item.title}</h4>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{item.desc}</p>
                        </div>
                        <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px' }}>
                          <input type="checkbox" defaultChecked={idx < 2} style={{ opacity: 0, width: 0, height: 0 }} />
                          <span className="slider round" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: idx < 2 ? 'var(--primary-color)' : '#ccc', transition: '.4s', borderRadius: '24px' }}></span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'integrations' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-panel" style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-dark)' }}>Connected Apps</h3>
                  <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Connect your account to third-party services.</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', background: '#F1F5F9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Slack size={20} color="#4A154B" /></div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-dark)' }}>Slack Integration</h4>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Send dispatch notifications to your team's Slack channel.</p>
                        </div>
                      </div>
                      <button style={{ padding: '0.4rem 1rem', background: 'transparent', color: 'var(--text-dark)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Connect</button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', background: '#F1F5F9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Github size={20} color="#24292e" /></div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-dark)' }}>GitHub Single Sign-On</h4>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sign in to your dashboard securely using your GitHub account.</p>
                        </div>
                      </div>
                      <button style={{ padding: '0.4rem 1rem', background: 'transparent', color: 'var(--text-dark)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Connect</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-panel" style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-dark)' }}>Audit Log</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>A comprehensive log of actions taken by your account.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {[
                    { action: "Updated Profile Avatar", date: "Today, 10:45 AM", ip: "192.168.1.45" },
                    { action: "Logged In successfully", date: "Today, 09:00 AM", ip: "192.168.1.45" },
                    { action: "Created LR Document #84920", date: "Yesterday, 04:30 PM", ip: "192.168.1.12" },
                    { action: "Logged In successfully", date: "Yesterday, 08:50 AM", ip: "192.168.1.12" },
                    { action: "Enabled Dark Mode Preference", date: "Oct 12, 11:20 AM", ip: "192.168.1.12" }
                  ].map((item, idx) => (
                    <div key={idx} style={{ padding: '1rem 1.5rem', borderBottom: idx !== 4 ? '1px solid var(--border-color)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'var(--bg-color)', padding: '0.5rem', borderRadius: '50%' }}><Clock size={16} color="var(--text-muted)" /></div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-dark)' }}>{item.action}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.date}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', background: 'var(--bg-color)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{item.ip}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Profile;
