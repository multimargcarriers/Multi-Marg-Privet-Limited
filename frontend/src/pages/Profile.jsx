import React, { useState, useContext, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Camera, User, Shield, Key, LogOut, Globe, Clock, CheckCircle, ChevronRight, LayoutGrid, ShieldCheck, Monitor, History, X, IdCard, Fingerprint, Scan } from 'lucide-react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import IDCardFront from '../components/IDCardFront';
import IDCardBack from '../components/IDCardBack';
import { SettingsContext } from '../context/SettingsContext';
import { promptDeviceScreenLock } from '../utils/deviceBiometrics';
import { getInitialsAvatar } from '../utils/avatar';
import FaceVerificationModal from '../components/FaceVerificationModal';

const Profile = () => {
  const { user, updateUser, token, logout } = useContext(AuthContext);
  const { globalSettings } = useContext(SettingsContext);
  const { addToast } = useToast();

  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimarg.com';

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [employeeId, setEmployeeId] = useState(user?.employeeId || '');
  const [username, setUsername] = useState((user?.username || '').toLowerCase());
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [photoPreview, setPhotoPreview] = useState(user?.photo || null);
  const [bannerPreview, setBannerPreview] = useState(user?.banner || null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showTestFaceScanner, setShowTestFaceScanner] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled !== false);
  const [faceAuthEnabled, setFaceAuthEnabled] = useState(user?.faceAuthEnabled !== false);
  const [fingerprintAuthEnabled, setFingerprintAuthEnabled] = useState(user?.fingerprintAuthEnabled !== false);
  const [toggling2Fa, setToggling2Fa] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.faceAuthEnabled !== undefined) setFaceAuthEnabled(user.faceAuthEnabled !== false);
      if (user.fingerprintAuthEnabled !== undefined) setFingerprintAuthEnabled(user.fingerprintAuthEnabled !== false);
      if (user.twoFactorEnabled !== undefined) setTwoFactorEnabled(user.twoFactorEnabled !== false);
    }
  }, [user]);

  const [defaultAssets, setDefaultAssets] = useState({ avatars: [], banners: [] });
  const [showGallery, setShowGallery] = useState(false);
  const [galleryType, setGalleryType] = useState('photo'); // 'photo' or 'banner'
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/default-assets`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.success) {
          setDefaultAssets({
            avatars: (res.data.data.DEFAULT_AVATARS || []),
            banners: (res.data.data.DEFAULT_BANNERS || [])
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

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setEmployeeId(user.employeeId || '');
      setUsername(user.username || '');
      setBloodGroup(user.bloodGroup || '');
      const userPhoto = user.photo || user.avatar || user.picture || null;
      if (userPhoto) setPhotoPreview(userPhoto);
      if (user.banner || user.bannerUrl) setBannerPreview(user.banner || user.bannerUrl);
    }
  }, [user]);

  const getAvatarUrl = () => {
    let src = photoPreview || user?.photo || user?.avatar || user?.picture;
    if (src) {
      if (typeof src === 'string' && src.includes('res.cloudinary.com')) {
        // Cloudinary URLs are case-sensitive, do not lowercase them
      } else if (typeof src === 'string' && src.startsWith('/uploads/')) {
        src = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${src}`;
      }
      return src;
    }
    return getInitialsAvatar(user?.name || 'User', '#0078D4', '#ffffff');
  };

  const getBannerUrl = () => {
    let src = bannerPreview || user?.banner || user?.bannerUrl;
    if (src) {
      if (typeof src === 'string' && src.includes('res.cloudinary.com')) {
        // Cloudinary URLs are case-sensitive, do not lowercase them
      } else if (typeof src === 'string' && src.startsWith('/uploads/')) {
        src = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${src}`;
      }
      return src;
    }
    return null;
  };

  const fileToDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoClick = () => fileInputRef.current.click();
  const handleBannerClick = () => bannerInputRef.current.click();

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast("Image must be less than 5MB", "error");
        return;
      }
      try {
        const dataUrl = await fileToDataURL(file);
        setPhotoPreview(dataUrl);
        setShowGallery(false);
        setIsLoading(true);

        const payload = {
          photoData: dataUrl,
          fileName: file.name
        };

        const response = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/profile`, payload, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data?.success) {
          addToast("Avatar uploaded and updated successfully!", "success");
          const updatedUser = response.data.data.user;
          const newPhoto = updatedUser?.photo || updatedUser?.avatar || updatedUser?.photoUrl || dataUrl;
          setPhotoPreview(newPhoto);
          updateUser(updatedUser, response.data.data.token);
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
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        addToast("Banner image must be less than 10MB", "error");
        return;
      }
      try {
        const dataUrl = await fileToDataURL(file);
        setBannerPreview(dataUrl);
        setShowGallery(false);
        setIsLoading(true);

        const payload = {
          bannerData: dataUrl,
          fileName: file.name
        };

        const response = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/profile`, payload, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data?.success) {
          addToast("Banner uploaded and updated successfully!", "success");
          const updatedUser = response.data.data.user;
          const newBanner = updatedUser?.banner || updatedUser?.bannerUrl || dataUrl;
          setBannerPreview(newBanner);
          updateUser(updatedUser, response.data.data.token);
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

  const handleToggleFaceAuth = async () => {
    setToggling2Fa(true);
    const nextState = !faceAuthEnabled;
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/toggle-2fa`,
        { faceAuthEnabled: nextState },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setFaceAuthEnabled(nextState);
        const new2Fa = nextState || fingerprintAuthEnabled;
        setTwoFactorEnabled(new2Fa);
        updateUser({ ...user, faceAuthEnabled: nextState, twoFactorEnabled: new2Fa });
        addToast(
          nextState 
            ? "Live Face ID Verification Enabled" 
            : "Face ID Verification Disabled", 
          "success"
        );
      }
    } catch (err) {
      console.error("Failed to toggle Face Auth:", err);
      addToast(err.response?.data?.message || "Failed to update Face ID preference", "error");
    } finally {
      setToggling2Fa(false);
    }
  };

  const handleToggleFingerprintAuth = async () => {
    setToggling2Fa(true);
    const nextState = !fingerprintAuthEnabled;
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/toggle-2fa`,
        { fingerprintAuthEnabled: nextState },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setFingerprintAuthEnabled(nextState);
        const new2Fa = faceAuthEnabled || nextState;
        setTwoFactorEnabled(new2Fa);
        updateUser({ ...user, fingerprintAuthEnabled: nextState, twoFactorEnabled: new2Fa });
        addToast(
          nextState 
            ? "Fingerprint & Device PIN Verification Enabled" 
            : "Fingerprint & Device PIN Verification Disabled", 
          "success"
        );
      }
    } catch (err) {
      console.error("Failed to toggle Fingerprint Auth:", err);
      addToast(err.response?.data?.message || "Failed to update Fingerprint preference", "error");
    } finally {
      setToggling2Fa(false);
    }
  };

  const handleToggle2FA = async () => {
    setToggling2Fa(true);
    const nextState = !twoFactorEnabled;
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/toggle-2fa`,
        { enabled: nextState },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setTwoFactorEnabled(nextState);
        setFaceAuthEnabled(nextState);
        setFingerprintAuthEnabled(nextState);
        updateUser({ ...user, twoFactorEnabled: nextState, faceAuthEnabled: nextState, fingerprintAuthEnabled: nextState });
        addToast(
          nextState 
            ? "All Biometric Verification Enabled" 
            : "All Biometric Verification Disabled", 
          "success"
        );
      }
    } catch (err) {
      console.error("Failed to toggle 2FA:", err);
      addToast(err.response?.data?.message || "Failed to update 2-step verification preference", "error");
    } finally {
      setToggling2Fa(false);
    }
  };

  const handleSelectGallery = async (url) => {
    if (galleryType === 'photo') {
      setPhotoPreview(url);
    } else {
      setBannerPreview(url);
    }
    setShowGallery(false);

    try {
      setIsLoading(true);
      const payload = {};
      if (galleryType === 'photo') payload.photoUrl = url;
      else payload.bannerUrl = url;

      const response = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/profile`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.success) {
        addToast(`${galleryType === 'photo' ? 'Avatar' : 'Banner'} updated successfully!`, "success");
        const updatedUser = response.data.data.user;
        if (galleryType === 'photo') {
          const newPhoto = updatedUser?.photo || updatedUser?.avatar || updatedUser?.photoUrl || url;
          setPhotoPreview(newPhoto);
        }
        if (galleryType === 'banner') {
          const newBanner = updatedUser?.banner || updatedUser?.bannerUrl || url;
          setBannerPreview(newBanner);
        }
        updateUser(updatedUser, response.data.data.token);
      } else {
        addToast(response.data?.message || "Failed to update asset", "error");
      }
    } catch (error) {
      addToast(error.response?.data?.message || "An error occurred while updating asset", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e, skipConfirm = false) => {
    if (e && e.preventDefault) e.preventDefault();

    if (username && username !== (user?.username || '') && !skipConfirm) {
      setShowConfirmDialog(true);
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        name,
        bloodGroup: bloodGroup || '',
      };
      if (isSuperAdmin) {
        if (email) payload.email = email;
        if (employeeId) payload.employeeId = employeeId;
      }
      if (username) {
        payload.username = username.trim();
      }
      if (password) {
        payload.password = password;
        if (currentPassword) payload.currentPassword = currentPassword;
      }

      const response = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/profile`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.success) {
        addToast("Profile updated successfully!", "success");
        const updatedUser = response.data.data.user;
        updateUser(updatedUser, response.data.data.token);
        if (updatedUser?.bloodGroup !== undefined) setBloodGroup(updatedUser.bloodGroup);
        if (updatedUser?.name) setName(updatedUser.name);
        setPassword('');
        setCurrentPassword('');
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
        <div style={{ width: "100%", margin: '0 auto', height: '100%', position: 'relative' }}>
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
              <img
                src={getAvatarUrl()}
                alt="Profile"
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                onError={(e) => {
                  if (!e.currentTarget.src.includes('data:image')) {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ccc"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
                  }
                }}
              />
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
              <div style={{ margin: '0 auto 0.75rem auto', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 700, fontSize: '0.95rem', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)' }}>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>ID:</span> {user.employeeId}
              </div>
            )}

            {user?.bloodGroup && (
              <div style={{ margin: '0 auto 1rem auto', background: '#fef2f2', border: '1px solid #fecaca', padding: '0.35rem 0.85rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#dc2626', fontWeight: 700, fontSize: '0.85rem' }}>
                <span style={{ color: '#ef4444', fontWeight: 500 }}>Blood:</span> {user.bloodGroup}
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
                    <input type="text" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} disabled={!isSuperAdmin} placeholder="MCPL-1234" style={{ width: '100%', maxWidth: '500px', padding: '0.75rem 1rem', borderRadius: '4px', border: '1px solid #8A8886', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', background: !isSuperAdmin ? '#f1f5f9' : 'var(--bg-color)', color: !isSuperAdmin ? '#94a3b8' : 'var(--text-dark)', cursor: !isSuperAdmin ? 'not-allowed' : 'text' }} onFocus={(e) => !isSuperAdmin ? null : e.target.style.borderColor = '#0078D4'} onBlur={(e) => !isSuperAdmin ? null : e.target.style.borderColor = '#8A8886'} />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.95rem' }}>Blood Group</label>
                    <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} style={{ width: '100%', maxWidth: '500px', padding: '0.75rem 1rem', borderRadius: '4px', border: '1px solid #8A8886', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', background: 'var(--bg-color)', color: 'var(--text-dark)' }} onFocus={(e) => e.target.style.borderColor = '#0078D4'} onBlur={(e) => e.target.style.borderColor = '#8A8886'}>
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.95rem' }}>Username <span>(Optional)</span></label>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))} placeholder="e.g. john_doe" style={{ width: '100%', maxWidth: '500px', padding: '0.75rem 1rem', borderRadius: '4px', border: '1px solid #8A8886', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', background: 'var(--bg-color)', color: 'var(--text-dark)' }} onFocus={(e) => e.target.style.borderColor = '#0078D4'} onBlur={(e) => e.target.style.borderColor = '#8A8886'} />
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
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current Password" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '4px', border: '1px solid #8A8886', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', background: 'var(--bg-color)', color: 'var(--text-dark)' }} onFocus={(e) => e.target.style.borderColor = '#0078D4'} onBlur={(e) => e.target.style.borderColor = '#8A8886'} />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New Password" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '4px', border: '1px solid #8A8886', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', background: 'var(--bg-color)', color: 'var(--text-dark)' }} onFocus={(e) => e.target.style.borderColor = '#0078D4'} onBlur={(e) => e.target.style.borderColor = '#8A8886'} />

                  <div style={{ marginTop: '0.5rem' }}>
                    <button onClick={handleSubmit} disabled={isLoading || !password || !currentPassword} style={{ padding: '0.6rem 1.5rem', background: (password && currentPassword) ? '#0078D4' : '#E1DFDD', color: (password && currentPassword) ? 'white' : '#A19F9D', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '0.95rem', cursor: (password && currentPassword) ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}>
                      Change password
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--surface-color)', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', padding: '2rem' }}>
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '4px', color: '#0078D4' }}>
                        <Scan size={22} />
                        <Fingerprint size={22} />
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-dark)', fontWeight: 700 }}>
                        Biometric & 2-Step Device Verification
                      </h3>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: (faceAuthEnabled && fingerprintAuthEnabled) 
                        ? 'rgba(16, 124, 65, 0.12)' 
                        : (faceAuthEnabled || fingerprintAuthEnabled)
                        ? 'rgba(0, 120, 212, 0.12)'
                        : '#f1f5f9',
                      color: (faceAuthEnabled && fingerprintAuthEnabled)
                        ? '#107C41'
                        : (faceAuthEnabled || fingerprintAuthEnabled)
                        ? '#0078D4'
                        : '#64748b'
                    }}>
                      {(faceAuthEnabled && fingerprintAuthEnabled) ? '✨ DUAL BIOMETRICS (EITHER METHOD)' : faceAuthEnabled ? '📸 FACE ID ONLY' : fingerprintAuthEnabled ? '👆 FINGERPRINT / PIN ONLY' : 'OFF'}
                    </span>
                  </div>
                  <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    Configure independent verification methods. When both are enabled, <strong>any one method is sufficient to unlock</strong> your session.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* TOGGLE 1: Live Face ID Verification */}
                  <div style={{
                    padding: '1.25rem',
                    borderRadius: '10px',
                    border: `1px solid ${faceAuthEnabled ? '#bae6fd' : 'var(--border-color)'}`,
                    background: faceAuthEnabled ? 'rgba(2, 132, 199, 0.03)' : 'var(--bg-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1.25rem',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                          <Camera size={16} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-dark)' }}>
                          1. Face ID Verification
                        </h4>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', background: faceAuthEnabled ? '#e0f2fe' : '#f1f5f9', color: faceAuthEnabled ? '#0284c7' : '#64748b' }}>
                          {faceAuthEnabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                        Live camera face detection & neural match on login and after 5 minutes of inactivity.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowTestFaceScanner(true)}
                        style={{
                          background: '#ffffff',
                          color: '#0284c7',
                          border: '1px solid #bae6fd',
                          borderRadius: '6px',
                          padding: '5px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 3px rgba(2, 132, 199, 0.1)'
                        }}
                      >
                        <Camera size={13} /> Test Camera Face ID
                      </button>
                    </div>

                    {/* Toggle Button for Face ID */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={handleToggleFaceAuth}
                        disabled={toggling2Fa}
                        aria-label="Toggle Face ID Verification"
                        style={{
                          width: '56px',
                          height: '30px',
                          borderRadius: '15px',
                          background: faceAuthEnabled ? '#0284c7' : '#cbd5e1',
                          position: 'relative',
                          border: 'none',
                          cursor: toggling2Fa ? 'not-allowed' : 'pointer',
                          transition: 'background-color 0.25s ease',
                          padding: 0,
                          outline: 'none',
                          boxShadow: faceAuthEnabled ? '0 0 10px rgba(2, 132, 199, 0.35)' : 'none'
                        }}
                      >
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            position: 'absolute',
                            top: '3px',
                            left: faceAuthEnabled ? '29px' : '3px',
                            transition: 'left 0.25s ease',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                          }}
                        />
                      </button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: faceAuthEnabled ? '#0284c7' : '#64748b', minWidth: '45px' }}>
                        {faceAuthEnabled ? 'Active' : 'Off'}
                      </span>
                    </div>
                  </div>

                  {/* TOGGLE 2: Fingerprint / Device PIN Verification */}
                  <div style={{
                    padding: '1.25rem',
                    borderRadius: '10px',
                    border: `1px solid ${fingerprintAuthEnabled ? '#ddd6fe' : 'var(--border-color)'}`,
                    background: fingerprintAuthEnabled ? 'rgba(124, 58, 237, 0.03)' : 'var(--bg-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1.25rem',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                          <Fingerprint size={16} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-dark)' }}>
                          2. Fingerprint & Device PIN Verification
                        </h4>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', background: fingerprintAuthEnabled ? '#ede9fe' : '#f1f5f9', color: fingerprintAuthEnabled ? '#7c3aed' : '#64748b' }}>
                          {fingerprintAuthEnabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                        Hardware-backed Windows Hello, Touch ID, or Device Screen PIN verified on your secure security chip.
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await promptDeviceScreenLock(user);
                          if (res.success) {
                            addToast("Device biometrics verified successfully!", "success");
                          } else if (res.reason === "CANCELLED") {
                            addToast("Biometric prompt was cancelled.", "info");
                          } else {
                            addToast(res.message || "Biometric check failed.", "error");
                          }
                        }}
                        style={{
                          background: '#ffffff',
                          color: '#7c3aed',
                          border: '1px solid #ddd6fe',
                          borderRadius: '6px',
                          padding: '5px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 3px rgba(124, 58, 237, 0.1)'
                        }}
                      >
                        <Fingerprint size={13} /> Test Fingerprint / PIN
                      </button>
                    </div>

                    {/* Toggle Button for Fingerprint */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={handleToggleFingerprintAuth}
                        disabled={toggling2Fa}
                        aria-label="Toggle Fingerprint & PIN Verification"
                        style={{
                          width: '56px',
                          height: '30px',
                          borderRadius: '15px',
                          background: fingerprintAuthEnabled ? '#7c3aed' : '#cbd5e1',
                          position: 'relative',
                          border: 'none',
                          cursor: toggling2Fa ? 'not-allowed' : 'pointer',
                          transition: 'background-color 0.25s ease',
                          padding: 0,
                          outline: 'none',
                          boxShadow: fingerprintAuthEnabled ? '0 0 10px rgba(124, 58, 237, 0.35)' : 'none'
                        }}
                      >
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            position: 'absolute',
                            top: '3px',
                            left: fingerprintAuthEnabled ? '29px' : '3px',
                            transition: 'left 0.25s ease',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                          }}
                        />
                      </button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: fingerprintAuthEnabled ? '#7c3aed' : '#64748b', minWidth: '45px' }}>
                        {fingerprintAuthEnabled ? 'Active' : 'Off'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Combined Architecture Info Note */}
                <div style={{ marginTop: '1.25rem', padding: '0.85rem 1.25rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ShieldCheck size={20} color="#059669" />
                  <p style={{ margin: 0, fontSize: '0.83rem', color: '#475569', lineHeight: '1.4' }}>
                    {(faceAuthEnabled && fingerprintAuthEnabled) && (
                      <span><strong>Flexible Dual Security:</strong> Both Face ID and Fingerprint are active. You can authenticate using <strong>any one method</strong> when prompted.</span>
                    )}
                    {faceAuthEnabled && !fingerprintAuthEnabled && (
                      <span><strong>Face ID Active:</strong> Facial recognition will be required to unlock your session.</span>
                    )}
                    {!faceAuthEnabled && fingerprintAuthEnabled && (
                      <span><strong>Fingerprint / PIN Active:</strong> Hardware biometric or screen lock PIN will be required to unlock your session.</span>
                    )}
                    {!faceAuthEnabled && !fingerprintAuthEnabled && (
                      <span><strong>Biometrics Disabled:</strong> Direct password access is enabled for this account.</span>
                    )}
                  </p>
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
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'flex-start', fontFamily: "'Inter', sans-serif", width: '100%' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-dark)', margin: '0 0 0.5rem 0' }}>Corporate ID Card</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>Vibrant corporate identification badge.</p>
              </div>

              <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap', width: '100%', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-color)', padding: '3rem 1rem', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>

                {/* --- FRONT OF ID CARD --- */}
                <div className="id-card-scaler">
                  <IDCardFront user={user} avatarUrl={getAvatarUrl()} globalSettings={globalSettings} />
                </div>

                {/* --- BACK OF ID CARD --- */}
                <div className="id-card-scaler">
                  <IDCardBack user={user} globalSettings={globalSettings} />
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
                      const canvas = await html2canvas(el, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: null, width: 320, height: 540, windowWidth: 320, windowHeight: 540 });
                      const link = document.createElement('a');
                      link.download = `MULTIMARG_ID_Front_${user.name.replace(/\s+/g, '_')}.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                    } catch (_err) {
                      addToast("Failed to download", "error");
                    }
                    e.currentTarget.innerHTML = originalText;
                  }}
                  style={{ padding: '0.75rem 1.5rem', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(30, 64, 175, 0.4)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(30, 64, 175, 0.3)'; }}
                >
                  Download Front
                </button>
                <button
                  onClick={async (e) => {
                    const originalText = e.currentTarget.innerHTML;
                    e.currentTarget.innerHTML = 'PROCESSING...';
                    try {
                      const el = document.getElementById('id-card-back');
                      const canvas = await html2canvas(el, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: null, width: 320, height: 540, windowWidth: 320, windowHeight: 540 });
                      const link = document.createElement('a');
                      link.download = `MULTIMARG_ID_Back_${user.name.replace(/\s+/g, '_')}.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                    } catch (_err) {
                      addToast("Failed to download", "error");
                    }
                    e.currentTarget.innerHTML = originalText;
                  }}
                  style={{ padding: '0.75rem 1.5rem', background: '#fff', color: '#1e40af', border: '1px solid #1e40af', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  Download Back
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Add specific custom CSS for this page locally */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important;
        }
        @media (max-width: 400px) {
          .id-card-scaler {
            transform: scale(0.85);
            transform-origin: top center;
            margin-bottom: -80px;
          }
        }
        @media (max-width: 340px) {
          .id-card-scaler {
            transform: scale(0.75);
            transform-origin: top center;
            margin-bottom: -135px;
          }
        }
      `}} />

      {/* Asset Gallery Modal */}
      {showGallery && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '90%', maxWidth: '800px', maxHeight: '90vh', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', overflow: 'hidden', position: 'relative' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b', fontWeight: 700 }}>Choose a Professional {galleryType === 'photo' ? 'Avatar' : 'Banner'}</h2>
              <button onClick={() => setShowGallery(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.25rem' }}><X size={24} /></button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(90vh - 70px)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: galleryType === 'photo' ? 'repeat(auto-fit, minmax(80px, 1fr))' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', justifyItems: 'center' }}>

                {/* Custom Upload Option */}
                <div
                  onClick={galleryType === 'photo' ? handlePhotoClick : handleBannerClick}
                  style={{
                    cursor: 'pointer',
                    borderRadius: galleryType === 'photo' ? '50%' : '8px',
                    border: '2px dashed #cbd5e1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    aspectRatio: galleryType === 'photo' ? '1/1' : '21/9',
                    background: '#f8fafc',
                    color: '#64748b',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0078D4'; e.currentTarget.style.color = '#0078D4'; e.currentTarget.style.background = '#f0f9ff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = '#f8fafc'; }}
                >
                  <Camera size={galleryType === 'photo' ? 32 : 40} style={{ marginBottom: '0.5rem' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Upload Custom</span>
                </div>

                {galleryType === 'photo' ? defaultAssets.avatars.map((url, idx) => (
                  <div key={idx} onClick={() => handleSelectGallery(url)} style={{ cursor: 'pointer', borderRadius: '50%', overflow: 'hidden', width: '100%', aspectRatio: '1/1', border: '3px solid transparent', transition: 'border-color 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0078D4'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                    <img src={url} alt={`Avatar ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )) : defaultAssets.banners.map((url, idx) => (
                  <div key={idx} onClick={() => handleSelectGallery(url)} style={{ cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', width: '100%', aspectRatio: '21/9', border: '3px solid transparent', transition: 'border-color 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0078D4'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                    <img src={url} alt={`Banner ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showConfirmDialog && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '90%', maxWidth: '450px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', overflow: 'hidden', position: 'relative' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b', fontWeight: 700 }}>Confirm Username Change</h2>
              <button onClick={() => setShowConfirmDialog(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.25rem' }}><X size={24} /></button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ margin: '0 0 1.5rem 0', color: '#475569', fontSize: '1rem', lineHeight: 1.5 }}>
                Are you sure you want to change your username? This will be used for your next login.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  style={{ padding: '0.6rem 1.25rem', background: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowConfirmDialog(false); handleSubmit(null, true); }}
                  style={{ padding: '0.6rem 1.25rem', background: '#0078D4', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#005a9e'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#0078D4'; }}
                >
                  Confirm Change
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Live Camera Face Verification Test Modal */}
      <FaceVerificationModal
        isOpen={showTestFaceScanner}
        user={user}
        onVerified={(_data) => {
          setShowTestFaceScanner(false);
          addToast("Face biometric verified successfully!", "success");
        }}
        onCancel={() => setShowTestFaceScanner(false)}
        onSwitchToFingerprint={async () => {
          setShowTestFaceScanner(false);
          const res = await promptDeviceScreenLock(user);
          if (res.success) {
            addToast("Device biometrics verified successfully!", "success");
          } else if (res.reason === "CANCELLED") {
            addToast("Biometric prompt was cancelled.", "info");
          } else {
            addToast(res.message || "Biometric check failed.", "error");
          }
        }}
      />
    </div>
  );
};

export default Profile;
