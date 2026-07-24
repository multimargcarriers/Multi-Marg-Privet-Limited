import React, { useState, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Camera, User, Mail, Shield, Save, Key, Hash, Activity, Bell, Lock, LogOut } from 'lucide-react';
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
    <div className="profile-page fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          <User size={28} color="var(--primary-color)" /> My Profile
        </h1>
      </div>

      <div className="glass-panel" style={{ display: 'flex', borderRadius: '16px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', minHeight: '600px' }}>
        
        {/* Profile Sidebar */}
        <div style={{ width: '250px', backgroundColor: 'rgba(0,0,0,0.02)', borderRight: '1px solid var(--border-color)', padding: '1.5rem 0' }}>
          <div style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Settings</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div 
              onClick={() => setActiveTab('personal')}
              style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', borderLeft: activeTab === 'personal' ? '3px solid var(--primary-color)' : '3px solid transparent', backgroundColor: activeTab === 'personal' ? 'var(--bg-color)' : 'transparent', color: activeTab === 'personal' ? 'var(--primary-color)' : 'var(--text-dark)', fontWeight: activeTab === 'personal' ? 600 : 500, transition: 'var(--transition-fast)' }}
            >
              <User size={18} /> Personal Info
            </div>
            <div 
              onClick={() => setActiveTab('security')}
              style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', borderLeft: activeTab === 'security' ? '3px solid var(--primary-color)' : '3px solid transparent', backgroundColor: activeTab === 'security' ? 'var(--bg-color)' : 'transparent', color: activeTab === 'security' ? 'var(--primary-color)' : 'var(--text-dark)', fontWeight: activeTab === 'security' ? 600 : 500, transition: 'var(--transition-fast)' }}
            >
              <Lock size={18} /> Security
            </div>
            <div 
              onClick={() => setActiveTab('notifications')}
              style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', borderLeft: activeTab === 'notifications' ? '3px solid var(--primary-color)' : '3px solid transparent', backgroundColor: activeTab === 'notifications' ? 'var(--bg-color)' : 'transparent', color: activeTab === 'notifications' ? 'var(--primary-color)' : 'var(--text-dark)', fontWeight: activeTab === 'notifications' ? 600 : 500, transition: 'var(--transition-fast)' }}
            >
              <Bell size={18} /> Notifications
            </div>
            <div 
              onClick={() => setActiveTab('activity')}
              style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', borderLeft: activeTab === 'activity' ? '3px solid var(--primary-color)' : '3px solid transparent', backgroundColor: activeTab === 'activity' ? 'var(--bg-color)' : 'transparent', color: activeTab === 'activity' ? 'var(--primary-color)' : 'var(--text-dark)', fontWeight: activeTab === 'activity' ? 600 : 500, transition: 'var(--transition-fast)' }}
            >
              <Activity size={18} /> Activity Log
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, padding: '2.5rem' }}>
          
          {activeTab === 'personal' && (
            <form onSubmit={handleSubmit} className="fade-in">
              <h2 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>Personal Information</h2>
          
          {/* Avatar Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
            <div 
              style={{ 
                position: 'relative', 
                width: '120px', 
                height: '120px', 
                borderRadius: '50%', 
                cursor: 'pointer',
                boxShadow: 'var(--shadow-md)',
                transition: 'var(--transition)',
                border: '4px solid white'
              }}
              onClick={handlePhotoClick}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <img 
                src={getAvatarUrl()} 
                alt="Profile" 
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                backgroundColor: 'var(--primary-color)',
                color: 'white',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid white',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <Camera size={18} />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoChange} 
              accept="image/jpeg, image/png, image/webp" 
              style={{ display: 'none' }} 
            />
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Click photo to update (Max 5MB)
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            
            {/* Read Only Fields */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px', backgroundColor: 'rgba(0, 0, 0, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Hash size={20} />
                </div>
                <div style={{ width: '100%' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Unique User ID</label>
                  <input 
                    type="text" 
                    value={newId} 
                    onChange={(e) => setNewId(e.target.value)} 
                    required
                    style={{ 
                      padding: '0.5rem', 
                      borderRadius: '6px', 
                      border: '1px solid var(--border-color)', 
                      fontSize: '0.95rem', 
                      width: '100%', 
                      outline: 'none', 
                      fontFamily: 'monospace',
                      transition: 'var(--transition)',
                      backgroundColor: 'white'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                </div>
              </div>

              <div style={{ flex: '1 1 300px', backgroundColor: 'rgba(0, 0, 0, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={20} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>System Role</label>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-dark)' }}>{user?.role}</span>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={14} /> Full Name
              </label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required
                style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.95rem', width: '100%', outline: 'none', transition: 'var(--transition)' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} /> Email Address
              </label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required
                style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.95rem', width: '100%', outline: 'none', transition: 'var(--transition)' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>

            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', marginTop: '2rem' }}>
              <button 
                type="submit" 
                disabled={isLoading}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', 
                  backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', 
                  borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem', cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1, boxShadow: 'var(--shadow-md)', transition: 'var(--transition)'
                }}
              >
                {isLoading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
              </button>
            </div>
          </form>
          )}

          {activeTab === 'security' && (
            <div className="fade-in">
              <h2 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>Security Settings</h2>
              
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>Change Password</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>Current Password</label>
                    <input type="password" placeholder="Enter current password" style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.95rem', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>New Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.95rem', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>Confirm New Password</label>
                    <input type="password" placeholder="Confirm new password" style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.95rem', outline: 'none' }} />
                  </div>
                  <button onClick={handleSubmit} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '1rem' }}>Update Password</button>
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>Active Sessions</h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Windows PC - Chrome</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mumbai, India • Current Session</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', backgroundColor: '#ecfdf5', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>Active Now</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="fade-in">
              <h2 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>Notification Preferences</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {[
                  { title: "Email Notifications", desc: "Receive daily summary reports and billing updates via email." },
                  { title: "Push Notifications", desc: "Get real-time browser alerts when a booking is created or assigned." },
                  { title: "SMS Alerts", desc: "Receive text messages for critical dispatches or emergency alerts." }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{item.desc}</div>
                    </div>
                    <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px' }}>
                      <input type="checkbox" defaultChecked={idx < 2} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span className="slider round" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: idx < 2 ? 'var(--primary-color)' : '#ccc', transition: '.4s', borderRadius: '24px' }}></span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'activity' && (
            <div className="fade-in">
              <h2 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>Activity Log</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { action: "Updated Profile", date: "Today at 10:45 AM", ip: "192.168.1.45" },
                  { action: "Logged In", date: "Today at 09:00 AM", ip: "192.168.1.45" },
                  { action: "Created LR #84920", date: "Yesterday at 04:30 PM", ip: "192.168.1.12" },
                  { action: "Logged In", date: "Yesterday at 08:50 AM", ip: "192.168.1.12" }
                ].map((item, idx) => (
                  <div key={idx} style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.action}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.date}</div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontFamily: 'monospace' }}>IP: {item.ip}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Profile;
