import React, { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Camera, User, Mail, Shield, Save, Key, Hash, Activity, Bell, Lock, LogOut, Globe, Clock, Smartphone, CheckCircle, ChevronRight, LayoutGrid, Code, MessageSquare, ShieldCheck, Monitor, History, Image as ImageIcon, X, IdCard, Download } from 'lucide-react';
import axios from 'axios';
import html2canvas from 'html2canvas';

const Profile = () => {
  const { user, updateUser, token, logout } = useContext(AuthContext);
  const { addToast } = useToast();
  
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [employeeId, setEmployeeId] = useState(user?.employeeId || '');
  const [newId, setNewId] = useState(user?.id || '');
  const [password, setPassword] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(user?.photo || null);
  const [banner, setBanner] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(user?.banner || null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [defaultAssets, setDefaultAssets] = useState({ avatars: [], banners: [] });
  const [showGallery, setShowGallery] = useState(false);
  const [galleryType, setGalleryType] = useState('photo'); // 'photo' or 'banner'
  
  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/default-assets`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.success) {
          setDefaultAssets({
            avatars: res.data.data.DEFAULT_AVATARS || [],
            banners: res.data.data.DEFAULT_BANNERS || []
          });
        }
      } catch (err) {
        console.error("Failed to fetch default assets", err);
      }
    };
    fetchDefaults();
  }, [token]);
  
  const [activities, setActivities] = useState([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  
  useEffect(() => {
    if (activeTab === 'history') {
      const fetchActivities = async () => {
        setIsLoadingActivities(true);
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/activity`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data?.success) {
            setActivities(res.data.data || []);
          }
        } catch (err) {
          console.error("Failed to fetch activities", err);
        } finally {
          setIsLoadingActivities(false);
        }
      };
      fetchActivities();
    }
  }, [activeTab, token]);

  const fileInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const getAvatarUrl = () => {
    if (photoPreview) {
      if (photoPreview.startsWith('http') || photoPreview.startsWith('blob')) return photoPreview;
      return `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${photoPreview}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=0078D4&color=fff&size=150`;
  };

  const getBannerUrl = () => {
    if (bannerPreview) {
      if (bannerPreview.startsWith('http') || bannerPreview.startsWith('blob')) return bannerPreview;
      return `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${bannerPreview}`;
    }
    return null;
  };

  const handlePhotoClick = () => fileInputRef.current.click();
  const handleBannerClick = () => bannerInputRef.current.click();

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast("Image must be less than 5MB", "error");
        return;
      }
      setPhotoPreview(URL.createObjectURL(file));
      setPhoto(file);
      setShowGallery(false);
      
      try {
        setIsLoading(true);
        const formData = new FormData();
        formData.append('photo', file);
        
        const response = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/profile`, formData, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data?.success) {
          addToast("Avatar uploaded and updated successfully!", "success");
          updateUser(response.data.data.user, response.data.data.token);
        } else {
          addToast(response.data?.message || "Failed to update avatar", "error");
        }
      } catch (error) {
        addToast(error.response?.data?.message || "An error occurred while updating avatar", "error");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBannerChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        addToast("Banner image must be less than 10MB", "error");
        return;
      }
      setBannerPreview(URL.createObjectURL(file));
      setBanner(file);
      setShowGallery(false);
      
      try {
        setIsLoading(true);
        const formData = new FormData();
        formData.append('banner', file);
        
        const response = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/profile`, formData, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data?.success) {
          addToast("Banner uploaded and updated successfully!", "success");
          updateUser(response.data.data.user, response.data.data.token);
        } else {
          addToast(response.data?.message || "Failed to update banner", "error");
        }
      } catch (error) {
        addToast(error.response?.data?.message || "An error occurred while updating banner", "error");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const openGallery = (type) => {
    setGalleryType(type);
    setShowGallery(true);
  };

  const handleSelectGallery = async (url) => {
    if (galleryType === 'photo') {
      setPhotoPreview(url);
      setPhoto(url);
    } else {
      setBannerPreview(url);
      setBanner(url);
    }
    setShowGallery(false);
    
    // Auto-save the selected asset for a professional workflow
    try {
      setIsLoading(true);
      const formData = new FormData();
      if (galleryType === 'photo') formData.append('photoUrl', url);
      else formData.append('bannerUrl', url);
      
      const response = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/profile`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data?.success) {
        addToast(`${galleryType === 'photo' ? 'Avatar' : 'Banner'} updated successfully!`, "success");
        updateUser(response.data.data.user, response.data.data.token);
      } else {
        addToast(response.data?.message || "Failed to update asset", "error");
      }
    } catch (error) {
      addToast(error.response?.data?.message || "An error occurred while updating asset", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      if (name !== user.name) formData.append('name', name);
      if (email !== user.email) formData.append('email', email);
      if (employeeId !== user.employeeId) formData.append('employeeId', employeeId.toUpperCase());
      if (newId !== user.id) formData.append('newId', newId);
      if (password) formData.append('password', password);
      if (photo) {
        if (typeof photo === 'string') formData.append('photoUrl', photo);
        else formData.append('photo', photo);
      }
      if (banner) {
        if (typeof banner === 'string') formData.append('bannerUrl', banner);
        else formData.append('banner', banner);
      }

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
        headers: { 'Authorization': `Bearer ${token}`
        }
      });

      if (response.data?.success) {
        addToast("Profile updated successfully!", "success");
        updateUser(response.data.data.user, response.data.data.token);
        setPassword('');
      } else {
        addToast(response.data?.message || "Failed to update profile", "error");
        if (response.status === 404 || response.status === 401) logout();
      }
    } catch (error) {
      addToast(error.response?.data?.message || "An error occurred while updating profile", "error");
      if (error.response?.status === 404 || error.response?.status === 401) logout();
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', icon: LayoutGrid, label: 'Overview', color: '#0078D4' },
    { id: 'idcard', icon: IdCard, label: 'ID Card', color: '#8E44AD' },
    { id: 'personal', icon: User, label: 'Your info', color: '#107C41' },
    { id: 'security', icon: ShieldCheck, label: 'Security', color: '#D83B01' },
    { id: 'devices', icon: Monitor, label: 'Devices', color: '#5C2D91' },
    { id: 'history', icon: History, label: 'Activity history', color: '#008272' },
  ];

  return (
    <div className="fade-in" style={{ backgroundColor: 'var(--bg-color)', minHeight: 'calc(100vh - 60px)' }}>
      <style>{`
        .profile-container {
          max-width: 1200px;
          margin: -80px auto 0;
          padding: 0 2rem 3rem 2rem;
          position: relative;
          z-index: 10;
          display: flex;
          gap: 2.5rem;
          align-items: flex-start;
        }
        .profile-sidebar {
          width: 320px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .profile-content {
          flex: 1;
          min-width: 0; /* Prevents overflow */
          margin-top: 100px;
        }
        .grid-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }
        @media (max-width: 900px) {
          .profile-container {
            flex-direction: column;
            align-items: center;
            padding: 0 1rem 2rem 1rem;
            margin-top: -60px;
          }
          .profile-sidebar {
            width: 100%;
            max-width: 400px;
          }
          .profile-content {
            width: 100%;
            margin-top: 0;
          }
          .grid-cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      
      {/* Microsoft/LinkedIn-style Hero Banner */}
      <div style={{ height: '220px', background: getBannerUrl() ? `url(${getBannerUrl()}) center/cover no-repeat` : 'linear-gradient(135deg, #0078D4 0%, #00B4F0 100%)', position: 'relative' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', height: '100%', position: 'relative' }}>
          {/* Decorative Elements (only if no banner image) */}
          {!getBannerUrl() && <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '40%', opacity: 0.1, backgroundImage: 'radial-gradient(circle at 100% 50%, white 0%, transparent 70%)' }}></div>}
          
          <div style={{ position: 'absolute', right: '2rem', top: '2rem', display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => openGallery('banner')}
              style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', backdropFilter: 'blur(4px)', transition: 'background 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
            >
              <Camera size={16} /> Edit banner
            </button>
          </div>
          <input type="file" ref={bannerInputRef} onChange={handleBannerChange} accept="image/jpeg, image/png, image/webp" style={{ display: 'none' }} />
        </div>
      </div>

      <div className="profile-container">
        
        {/* Left Sidebar Profile & Nav */}
        <div className="profile-sidebar">
          
          {/* Identity Card */}
          <div style={{ background: 'var(--surface-color)', borderRadius: '8px', padding: '2rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid var(--border-color)' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1.5rem auto' }}>
              <img src={getAvatarUrl()} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <button 
                onClick={() => openGallery('photo')}
                style={{ position: 'absolute', bottom: 0, right: 0, width: '36px', height: '36px', borderRadius: '50%', background: '#0078D4', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                title="Change Photo"
              >
                <Camera size={18} />
              </button>
              <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/jpeg, image/png, image/webp" style={{ display: 'none' }} />
            </div>
            
            <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-dark)' }}>{user?.name || 'Administrator'}</h2>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: 'var(--text-muted)' }}>{user?.email || 'admin@multimarg.com'}</p>
            
            {user?.employeeId && (
              <div style={{ margin: '0 auto 1.5rem auto', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 700, fontSize: '0.95rem', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)' }}>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>ID:</span> {user.employeeId}
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: 'rgba(0, 120, 212, 0.1)', color: '#0078D4', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
                <Shield size={14} /> {(user?.role === 'Admin' || !user?.role) ? 'Employee' : user.role} Account
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div style={{ background: 'var(--surface-color)', borderRadius: '8px', padding: '1rem 0', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <div 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{ 
                    padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
                    cursor: 'pointer', position: 'relative',
                    background: isActive ? 'var(--bg-color)' : 'transparent',
                    color: isActive ? 'var(--text-dark)' : 'var(--text-muted)',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-color)'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {isActive && <div style={{ position: 'absolute', left: 0, top: '10%', bottom: '10%', width: '4px', background: tab.color, borderRadius: '0 4px 4px 0' }}></div>}
                  <Icon size={20} color={isActive ? tab.color : 'currentColor'} />
                  {tab.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="profile-content">
          
          {activeTab === 'overview' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-dark)', margin: 0 }}>Welcome back, {user?.name?.split(' ')[0] || 'User'}</h1>
              
              {/* Grid of Microsoft-style Cards */}
              <div className="grid-cards">
                
                <div onClick={() => setActiveTab('personal')} style={{ background: 'var(--surface-color)', borderRadius: '8px', padding: '2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '220px', transition: 'transform 0.2s, box-shadow 0.2s' }} className="hover-lift">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(16, 124, 65, 0.1)', borderRadius: '8px', color: '#107C41' }}><User size={28} /></div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-dark)' }}>Your info</h3>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', flex: 1 }}>Keep your personal info up to date to personalize your Multimarg experience.</p>
                  <div style={{ color: '#0078D4', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Manage info <ChevronRight size={16} /></div>
                </div>

                <div onClick={() => setActiveTab('security')} style={{ background: 'var(--surface-color)', borderRadius: '8px', padding: '2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '220px', transition: 'transform 0.2s, box-shadow 0.2s' }} className="hover-lift">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(216, 59, 1, 0.1)', borderRadius: '8px', color: '#D83B01' }}><ShieldCheck size={28} /></div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-dark)' }}>Security</h3>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', flex: 1 }}>Keep your account secure by updating your password and enabling 2FA.</p>
                  <div style={{ color: '#0078D4', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Update security <ChevronRight size={16} /></div>
                </div>

                <div onClick={() => setActiveTab('devices')} style={{ background: 'var(--surface-color)', borderRadius: '8px', padding: '2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '220px', transition: 'transform 0.2s, box-shadow 0.2s' }} className="hover-lift">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(92, 45, 145, 0.1)', borderRadius: '8px', color: '#5C2D91' }}><Monitor size={28} /></div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-dark)' }}>Devices</h3>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', flex: 1 }}>Manage the devices linked to your account and review active sessions.</p>
                  <div style={{ color: '#0078D4', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>View devices <ChevronRight size={16} /></div>
                </div>

                <div onClick={() => setActiveTab('history')} style={{ background: 'var(--surface-color)', borderRadius: '8px', padding: '2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '220px', transition: 'transform 0.2s, box-shadow 0.2s' }} className="hover-lift">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(0, 130, 114, 0.1)', borderRadius: '8px', color: '#008272' }}><History size={28} /></div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-dark)' }}>Activity history</h3>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', flex: 1 }}>Review recent logins, profile updates, and system access logs.</p>
                  <div style={{ color: '#0078D4', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Review activity <ChevronRight size={16} /></div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'personal' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-dark)', margin: '0 0 0.5rem 0' }}>Your info</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>Manage your personal information and how it's displayed.</p>
              </div>

              <div style={{ background: 'var(--surface-color)', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
                <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.95rem' }}>Full Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', maxWidth: '500px', padding: '0.75rem 1rem', borderRadius: '4px', border: '1px solid #8A8886', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', background: 'var(--bg-color)', color: 'var(--text-dark)' }} onFocus={(e) => e.target.style.borderColor = '#0078D4'} onBlur={(e) => e.target.style.borderColor = '#8A8886'} />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.95rem' }}>Email Address {!isSuperAdmin && <span style={{ fontSize: '0.8rem', color: '#f59e0b', marginLeft: '0.5rem', fontWeight: 500 }}>(Contact SuperAdmin to change)</span>}</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isSuperAdmin} style={{ width: '100%', maxWidth: '500px', padding: '0.75rem 1rem', borderRadius: '4px', border: '1px solid #8A8886', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', background: !isSuperAdmin ? '#f1f5f9' : 'var(--bg-color)', color: !isSuperAdmin ? '#94a3b8' : 'var(--text-dark)', cursor: !isSuperAdmin ? 'not-allowed' : 'text' }} onFocus={(e) => !isSuperAdmin ? null : e.target.style.borderColor = '#0078D4'} onBlur={(e) => !isSuperAdmin ? null : e.target.style.borderColor = '#8A8886'} />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.95rem' }}>Employee ID {!isSuperAdmin && <span style={{ fontSize: '0.8rem', color: '#f59e0b', marginLeft: '0.5rem', fontWeight: 500 }}>(Contact SuperAdmin to change)</span>}</label>
                    <input type="text" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} disabled={!isSuperAdmin} placeholder="MMPL-1234" style={{ width: '100%', maxWidth: '500px', padding: '0.75rem 1rem', borderRadius: '4px', border: '1px solid #8A8886', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', background: !isSuperAdmin ? '#f1f5f9' : 'var(--bg-color)', color: !isSuperAdmin ? '#94a3b8' : 'var(--text-dark)', cursor: !isSuperAdmin ? 'not-allowed' : 'text' }} onFocus={(e) => !isSuperAdmin ? null : e.target.style.borderColor = '#0078D4'} onBlur={(e) => !isSuperAdmin ? null : e.target.style.borderColor = '#8A8886'} />
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <button onClick={handleSubmit} disabled={isLoading} style={{ padding: '0.6rem 1.5rem', background: '#0078D4', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'background 0.2s', opacity: isLoading ? 0.7 : 1 }}>
                      {isLoading ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-dark)', margin: '0 0 0.5rem 0' }}>Security</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>Keep your account safe with a strong password and two-factor authentication.</p>
              </div>

              <div style={{ background: 'var(--surface-color)', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', padding: '2rem' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Key size={20} color="#0078D4" /> Password security</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
                  <input type="password" placeholder="Current Password" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '4px', border: '1px solid #8A8886', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', background: 'var(--bg-color)', color: 'var(--text-dark)' }} onFocus={(e) => e.target.style.borderColor = '#0078D4'} onBlur={(e) => e.target.style.borderColor = '#8A8886'} />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New Password" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '4px', border: '1px solid #8A8886', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', background: 'var(--bg-color)', color: 'var(--text-dark)' }} onFocus={(e) => e.target.style.borderColor = '#0078D4'} onBlur={(e) => e.target.style.borderColor = '#8A8886'} />
                  
                  <div style={{ marginTop: '0.5rem' }}>
                    <button onClick={handleSubmit} disabled={isLoading || !password} style={{ padding: '0.6rem 1.5rem', background: password ? '#0078D4' : '#E1DFDD', color: password ? 'white' : '#A19F9D', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '0.95rem', cursor: password ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}>
                      Change password
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--surface-color)', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Shield size={20} color="#107C41" /> Two-step verification</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '600px' }}>Protect your account with an extra layer of security. We will ask for a verification code when you sign in from a new device.</p>
                  </div>
                  <button style={{ padding: '0.5rem 1rem', background: 'transparent', color: '#0078D4', border: '1px solid #0078D4', borderRadius: '4px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>Set up 2FA</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'devices' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-dark)', margin: '0 0 0.5rem 0' }}>Devices</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>Review the devices where you're currently signed in.</p>
              </div>

              <div style={{ background: 'var(--surface-color)', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ color: '#5C2D91' }}><Monitor size={48} strokeWidth={1.5} /></div>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', color: 'var(--text-dark)' }}>DESKTOP-9B4X2L</h3>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Windows 11 • Chrome Browser</p>
                      <div style={{ marginTop: '0.5rem', display: 'inline-block', padding: '0.1rem 0.5rem', background: 'rgba(16, 124, 65, 0.1)', color: '#107C41', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Active session</div>
                    </div>
                  </div>
                  <button style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text-dark)', border: '1px solid #8A8886', borderRadius: '4px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>Sign out</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-dark)', margin: '0 0 0.5rem 0' }}>Activity history</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>Review when and where you've used your account.</p>
              </div>

              <div style={{ background: 'var(--surface-color)', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {isLoadingActivities ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading activities...</div>
                  ) : activities.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No recent activity found.</div>
                  ) : (
                    activities.map((log, idx) => (
                      <div key={log.id || idx} style={{ padding: '1.5rem', borderBottom: idx !== activities.length - 1 ? '1px solid var(--border-color)' : 'none', display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                        <div style={{ color: log.type === 'logout' ? '#D83B01' : log.type === 'security' ? '#0078D4' : '#107C41' }}>
                          {log.type === 'logout' ? <LogOut size={24} /> : log.type === 'security' ? <ShieldCheck size={24} /> : <CheckCircle size={24} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', color: 'var(--text-dark)' }}>{log.title}</h4>
                          <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14} /> {new Date(log.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Globe size={14} /> {log.location || 'Unknown'}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Monitor size={14} /> {log.ip || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'idcard' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'flex-start', fontFamily: "'Inter', sans-serif" }}>
              <div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#000', margin: '0 0 0.5rem 0', letterSpacing: '-1px' }}>ID CARD</h1>
                <p style={{ color: '#666', fontSize: '1rem', margin: 0, fontWeight: 500 }}>Modern corporate identification.</p>
              </div>

              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', width: '100%', alignItems: 'flex-start', justifyContent: 'center', background: '#f5f5f5', padding: '3rem', borderRadius: '12px', border: '1px solid #e5e5e5' }}>
                
                {/* --- FRONT OF ID CARD --- */}
                <div 
                  id="id-card-front"
                  style={{
                    width: '320px',
                    height: '500px',
                    background: '#ffffff',
                    border: '2px solid #000000',
                    boxShadow: '8px 8px 0px #000000',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: "'Inter', sans-serif",
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Top Bar (Banana Yellow) */}
                  <div style={{ width: '100%', padding: '1rem 1.5rem', background: '#fbbf24', borderBottom: '2px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#000', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>MULTI MARG</h2>
                      <p style={{ margin: 0, fontSize: '0.65rem', color: '#000', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Logistics Core</p>
                    </div>
                  </div>
                  
                  {/* Photo Container */}
                  <div style={{ padding: '2rem 1.5rem 1rem 1.5rem', display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ width: '120px', height: '120px', border: '3px solid #000', background: '#f5f5f5', overflow: 'hidden' }}>
                      <img src={getAvatarUrl()} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.1) grayscale(0.2)' }} crossOrigin="anonymous" />
                    </div>
                  </div>

                  {/* Employee Details */}
                  <div style={{ padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 2 }}>
                    <div>
                      <h2 style={{ margin: '0 0 0.2rem 0', color: '#000', fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1px', lineHeight: 1.1 }}>{user.name}</h2>
                      <p style={{ margin: '0.2rem 0 1rem 0', color: '#666', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{user.role || 'CORE TEAM'}</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', borderBottom: '2px solid #000', paddingBottom: '0.4rem', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <span style={{ color: '#000', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>ID_NUM</span>
                        <span style={{ color: '#000', fontSize: '1.1rem', fontWeight: 900, fontFamily: 'monospace' }}>{user.employeeId || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', borderBottom: '2px solid #000', paddingBottom: '0.4rem', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <span style={{ color: '#000', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>BLOOD</span>
                        <span style={{ color: '#000', fontSize: '1.1rem', fontWeight: 900, fontFamily: 'monospace' }}>O+</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', background: '#000', padding: '1rem', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '2px' }}>ACCESS: AUTHORIZED</span>
                     <div style={{ width: '12px', height: '12px', background: '#fbbf24', borderRadius: '50%' }}></div>
                  </div>
                </div>

                {/* --- BACK OF ID CARD --- */}
                <div 
                  id="id-card-back"
                  style={{
                    width: '320px',
                    height: '500px',
                    background: '#000000',
                    border: '2px solid #000000',
                    boxShadow: '8px 8px 0px rgba(0,0,0,0.2)',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: "'Inter', sans-serif",
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ padding: '1.5rem', background: '#fbbf24', borderBottom: '2px solid #000' }}>
                     <h3 style={{ margin: 0, color: '#000', fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>IF FOUND</h3>
                  </div>

                  {/* Return Info */}
                  <div style={{ padding: '2rem 1.5rem 1rem 1.5rem' }}>
                    <p style={{ margin: 0, color: '#fff', fontSize: '0.85rem', lineHeight: 1.6, fontWeight: 500 }}>
                      Please return to:<br/><br/>
                      <strong style={{ fontSize: '1.1rem', fontWeight: 800 }}>MULTI MARG CARRIERS</strong><br/>
                      Global Logistics Hub<br/>
                      Mumbai, MH, India<br/>
                      TEL: +91 98765 43210
                    </p>
                  </div>

                  {/* QR Code */}
                  <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '0 1.5rem', margin: '1rem 0' }}>
                    <div style={{ padding: '0.5rem', background: '#fff' }}>
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=EMP:${user.employeeId || user.id}&color=000000`} alt="QR Code" style={{ width: '90px', height: '90px', display: 'block' }} crossOrigin="anonymous" />
                    </div>
                  </div>
                  
                  {/* Terms */}
                  <div style={{ padding: '1.5rem', marginTop: 'auto' }}>
                    <p style={{ margin: '0 0 1rem 0', color: '#888', fontSize: '0.65rem', lineHeight: 1.5, fontWeight: 500 }}>
                      This badge is strictly non-transferable property of Multi Marg Carriers.
                    </p>
                    
                    {/* Signatures */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1.5rem' }}>
                      <div style={{ width: '45%', borderTop: '2px solid #333', paddingTop: '0.5rem' }}>
                        <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>HOLDER</span>
                      </div>
                      <div style={{ width: '45%', borderTop: '2px solid #333', paddingTop: '0.5rem' }}>
                        <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>AUTH</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
                <button 
                  onClick={async (e) => {
                    const originalText = e.currentTarget.innerHTML;
                    e.currentTarget.innerHTML = 'PROCESSING...';
                    try {
                      const el = document.getElementById('id-card-front');
                      const canvas = await html2canvas(el, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: null });
                      const link = document.createElement('a');
                      link.download = `MMC_TECH_ID_Front_${user.name.replace(/\s+/g, '_')}.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                    } catch (err) {
                      addToast("Failed to download", "error");
                    }
                    e.currentTarget.innerHTML = originalText;
                  }}
                  style={{ padding: '1rem 2rem', background: '#fbbf24', color: '#000', border: '2px solid #000', boxShadow: '4px 4px 0px #000', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.1s' }}
                  onMouseDown={(e) => { e.currentTarget.style.boxShadow = '0px 0px 0px #000'; e.currentTarget.style.transform = 'translate(4px, 4px)'; }}
                  onMouseUp={(e) => { e.currentTarget.style.boxShadow = '4px 4px 0px #000'; e.currentTarget.style.transform = 'translate(0px, 0px)'; }}
                >
                  Download Front
                </button>
                <button 
                  onClick={async (e) => {
                    const originalText = e.currentTarget.innerHTML;
                    e.currentTarget.innerHTML = 'PROCESSING...';
                    try {
                      const el = document.getElementById('id-card-back');
                      const canvas = await html2canvas(el, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: null });
                      const link = document.createElement('a');
                      link.download = `MMC_TECH_ID_Back_${user.name.replace(/\s+/g, '_')}.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                    } catch (err) {
                      addToast("Failed to download", "error");
                    }
                    e.currentTarget.innerHTML = originalText;
                  }}
                  style={{ padding: '1rem 2rem', background: '#fff', color: '#000', border: '2px solid #000', boxShadow: '4px 4px 0px #000', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.1s' }}
                  onMouseDown={(e) => { e.currentTarget.style.boxShadow = '0px 0px 0px #000'; e.currentTarget.style.transform = 'translate(4px, 4px)'; }}
                  onMouseUp={(e) => { e.currentTarget.style.boxShadow = '4px 4px 0px #000'; e.currentTarget.style.transform = 'translate(0px, 0px)'; }}
                >
                  Download Back
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
      
      {/* Add specific custom CSS for this page locally */}
      <style dangerouslySetInnerHTML={{__html: `
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important;
        }
      `}} />

      {/* Asset Gallery Modal */}
      {showGallery && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="fade-in" style={{ background: 'var(--surface-color)', borderRadius: '12px', width: '90%', maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-dark)', fontWeight: 600 }}>Choose a Professional {galleryType === 'photo' ? 'Avatar' : 'Banner'}</h2>
              <button onClick={() => setShowGallery(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ padding: '2rem', overflowY: 'auto', display: 'grid', gridTemplateColumns: galleryType === 'photo' ? 'repeat(auto-fill, minmax(140px, 1fr))' : '1fr 1fr', gap: '1.5rem' }}>
              
              {/* Custom Upload Option */}
              <div 
                onClick={galleryType === 'photo' ? handlePhotoClick : handleBannerClick}
                style={{ 
                  cursor: 'pointer', 
                  borderRadius: galleryType === 'photo' ? '50%' : '8px',
                  border: '2px dashed var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  aspectRatio: galleryType === 'photo' ? '1/1' : '21/9',
                  background: 'rgba(0,0,0,0.02)',
                  color: 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0078D4'; e.currentTarget.style.color = '#0078D4'; e.currentTarget.style.background = 'rgba(0,120,212,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
              >
                <Camera size={galleryType === 'photo' ? 32 : 48} style={{ marginBottom: '0.5rem' }} />
                <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>Upload Custom</span>
              </div>

              {galleryType === 'photo' ? defaultAssets.avatars.map((url, idx) => (
                <div key={idx} onClick={() => handleSelectGallery(url)} style={{ cursor: 'pointer', borderRadius: '50%', overflow: 'hidden', aspectRatio: '1/1', border: '4px solid transparent', transition: 'border-color 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0078D4'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                  <img src={url} alt={`Avatar ${idx+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )) : defaultAssets.banners.map((url, idx) => (
                <div key={idx} onClick={() => handleSelectGallery(url)} style={{ cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', aspectRatio: '21/9', border: '4px solid transparent', transition: 'border-color 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0078D4'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                  <img src={url} alt={`Banner ${idx+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
