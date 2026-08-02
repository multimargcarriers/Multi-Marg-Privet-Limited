import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { 
  Server, Database, Cloud, HardDrive, RefreshCw, AlertCircle, MemoryStick, 
  ToggleLeft, ToggleRight, Building, Palette, Shield, FileText, Bell, Save,
  ChevronDown, ChevronRight, Upload, RotateCcw, Image as ImageIcon
} from 'lucide-react';
import CompanyStamp from '../components/CompanyStamp';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import { SettingsContext } from '../context/SettingsContext';
import { useDialog } from '../context/DialogContext';
import { useToast } from '../context/ToastContext';

// Helper to format bytes
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatUptime = (seconds) => {
  const d = Math.floor(seconds / (3600*24));
  const h = Math.floor(seconds % (3600*24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  return `${d}d ${h}h ${m}m`;
};

const ProgressBar = ({ value, max, color = '#6366f1' }) => {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div style={{ width: '100%', backgroundColor: '#e2e8f0', borderRadius: '999px', height: '8px', overflow: 'hidden', marginTop: '0.5rem' }}>
      <div 
        style={{ 
          height: '100%', 
          backgroundColor: color, 
          width: `${percentage}%`,
          transition: 'width 1s ease-in-out'
        }} 
      />
    </div>
  );
};

const Settings = () => {
  const { globalSettings, updateGlobalSettings } = useContext(SettingsContext);
  const { confirm } = useDialog();
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [updatingToggles, setUpdatingToggles] = useState(false);

  // Local state for complex forms (Company Profile)
  const [localCompany, setLocalCompany] = useState({});
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [isUploadingStamp, setIsUploadingStamp] = useState(false);
  const [stampPreview, setStampPreview] = useState(() => {
    return globalSettings?.company?.companyStampUrl || "";
  });

  useEffect(() => {
    if (globalSettings?.company) {
      setLocalCompany(globalSettings.company);
      if (globalSettings.company.companyStampUrl) {
        setStampPreview(globalSettings.company.companyStampUrl);
      }
    }
  }, [globalSettings]);

  const handleStampFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      addToast("File size too large. Please select an image under 2MB.", "error");
      return;
    }

    setIsUploadingStamp(true);
    const formData = new FormData();
    formData.append("stampImage", file);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/settings/upload-stamp`, formData, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        addToast("Stamp uploaded successfully!", "success");
        // Force refresh the global settings from context so the new stamp is loaded
        if (typeof window !== 'undefined') {
           window.dispatchEvent(new CustomEvent('settings-refresh-needed'));
        }
        
        // Also update local state for preview
        const newStampUrl = response.data.data.company.companyStampUrl;
        setStampPreview(newStampUrl);
        setLocalCompany(prev => ({ ...prev, companyStampUrl: newStampUrl }));
        
        // Let's also update the global settings in context via updateGlobalSettings? No, refreshSettings is better, but it's not destructured. 
        // We'll update the settings locally in the context state by calling updateGlobalSettings with the returned data.
        await updateGlobalSettings(response.data.data);
      } else {
        addToast("Failed to upload stamp: " + response.data.message, "error");
      }
    } catch (err) {
      console.error("Error uploading stamp:", err);
      addToast("Error uploading stamp. Check console.", "error");
    } finally {
      setIsUploadingStamp(false);
    }
  };

  const handleResetStamp = () => {
    setStampPreview("");
    setLocalCompany(prev => ({ ...prev, companyStampUrl: "" }));
    addToast("Reset to default vector stamp seal.", "success");
  };

  const handleToggle = async (category, key) => {
    if (!globalSettings || updatingToggles) return;
    setUpdatingToggles(true);
    const newSettings = { ...globalSettings };
    if (!newSettings[category]) newSettings[category] = {};
    newSettings[category][key] = !newSettings[category][key];
    await updateGlobalSettings(newSettings);
    setUpdatingToggles(false);
  };

  const handleCompanyChange = (e) => {
    const { name, value } = e.target;
    setLocalCompany(prev => ({ ...prev, [name]: value }));
  };

  const saveCompanyProfile = async () => {
    if (!globalSettings) return;
    setIsSavingForm(true);
    const newSettings = { ...globalSettings, company: localCompany };
    await updateGlobalSettings(newSettings);
    setIsSavingForm(false);
  };

  const fetchStats = async () => {
    try {
      setSyncing(true);
      setError(null);
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/settings/system-stats`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch stats');
      }
    } catch (err) {
      console.error('Error fetching system stats:', err);
      setError(err.response?.data?.message || 'Error fetching system stats. You might need SuperAdmin privileges.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleClearCache = async () => {
    const isConfirmed = await confirm({
      title: "Clear System Cache",
      message: "Are you sure you want to flush the Redis cache and clear local browser storage? This might temporarily slow down the app.",
      confirmText: "Clear Cache",
      cancelText: "Cancel"
    });
    
    if (!isConfirmed) return;
    
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/settings/clear-cache`, {}, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Clear local storage (except auth tokens)
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      localStorage.clear();
      sessionStorage.clear();
      if (token) localStorage.setItem('token', token);
      if (user) localStorage.setItem('user', user);
      
      addToast("Cache cleared successfully!", "success");
      fetchStats();
    } catch (err) {
      console.error(err);
      addToast("Failed to clear cache: " + (err.response?.data?.message || err.message), "error");
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error && !data) {
    return (
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
        <h2 style={{ color: '#0f172a', margin: '0 0 0.5rem 0' }}>Access Denied or Error</h2>
        <p style={{ color: '#64748b' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "20px" }}>
      {/* Header */}
      <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h3 style={{ fontSize: '1.8rem', color: '#0f172a', margin: '0 0 0.25rem 0' }}>Settings & Control Panel</h3>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Configure company profile, preferences, notifications, and system integrations.</p>
        </div>
        <button 
          onClick={fetchStats}
          disabled={syncing}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: syncing ? '#94a3b8' : '#6366f1', 
            color: 'white', 
            borderRadius: '8px', 
            border: 'none', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            fontSize: '0.9rem', 
            fontWeight: '500', 
            cursor: syncing ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <RefreshCw size={16} className={syncing ? "spin-animation" : ""} />
          {syncing ? 'Refreshing...' : 'Refresh Live Stats'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        {/* Company Profile Section */}
        {globalSettings?.company && (
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: '#f1f5f9', padding: '0.5rem', borderRadius: '8px', color: '#3b82f6' }}><Building size={24} /></div>
              <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Company Profile</h4>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem', fontWeight: 500 }}>Company Name</label>
                <input 
                  type="text" name="name" value={localCompany.name || ''} onChange={handleCompanyChange}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem', fontWeight: 500 }}>GSTIN</label>
                <input 
                  type="text" name="gstin" value={localCompany.gstin || ''} onChange={handleCompanyChange}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem', fontWeight: 500 }}>Email Address</label>
                <input 
                  type="email" name="email" value={localCompany.email || ''} onChange={handleCompanyChange}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem', fontWeight: 500 }}>Phone Number</label>
                <input 
                  type="text" name="phone" value={localCompany.phone || ''} onChange={handleCompanyChange}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem', fontWeight: 500 }}>Registered Address</label>
                <textarea 
                  name="address" value={localCompany.address || ''} onChange={handleCompanyChange} rows={3}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical' }}
                />
              </div>

              {/* Official Stamp Upload Option */}
              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Official Company Stamp / Seal Image
                </label>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 1rem 0' }}>
                  Upload a custom official stamp seal (PNG, JPG, SVG, WebP) to use on bills and tax invoices. If empty, the default vector seal will be used.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {/* Stamp Live Preview */}
                  <div style={{ width: '120px', height: '120px', borderRadius: '8px', border: '2px dashed #cbd5e1', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', position: 'relative', overflow: 'hidden' }}>
                    {stampPreview ? (
                      <img src={stampPreview} alt="Company Stamp Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                        <CompanyStamp size={75} />
                        <span style={{ fontSize: '0.7rem', display: 'block', marginTop: '4px', fontWeight: 600 }}>Default Seal</span>
                      </div>
                    )}
                  </div>

                  {/* Stamp File Upload Buttons */}
                  <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input
                      type="file"
                      id="stamp-file-input"
                      accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                      onChange={handleStampFileUpload}
                      style={{ display: 'none' }}
                    />

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <label
                        htmlFor="stamp-file-input"
                        style={{
                          padding: '0.65rem 1.25rem',
                          backgroundColor: '#0D5C96',
                          color: 'white',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <Upload size={16} /> {isUploadingStamp ? 'Uploading...' : 'Choose & Upload Stamp Image'}
                      </label>

                      {stampPreview && (
                        <button
                          type="button"
                          onClick={handleResetStamp}
                          style={{
                            padding: '0.65rem 1rem',
                            backgroundColor: '#f1f5f9',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          <RotateCcw size={15} /> Reset to Default Stamp
                        </button>
                      )}
                    </div>

                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Recommended: Transparent PNG or high-res seal image. Maximum size: 2MB.
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button 
                onClick={saveCompanyProfile}
                disabled={isSavingForm}
                style={{ padding: '0.6rem 1.2rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isSavingForm ? 'not-allowed' : 'pointer', fontWeight: 500 }}
              >
                <Save size={16} /> {isSavingForm ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}

        {/* Global Configurations Grid */}
        {globalSettings && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            
            {/* UI Preferences */}
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: '#fdf4ff', padding: '0.5rem', borderRadius: '8px', color: '#c026d3' }}><Palette size={20} /></div>
                <h5 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>UI & Preferences</h5>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Object.entries(globalSettings.ui || {}).map(([key, value]) => {
                  if (typeof value === 'boolean') {
                    return (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.95rem', color: '#334155' }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                        <button onClick={() => handleToggle('ui', key)} style={{ background: 'none', border: 'none', cursor: updatingToggles ? 'not-allowed' : 'pointer', padding: 0, color: value ? '#10b981' : '#94a3b8' }}>
                          {value ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                        </button>
                      </div>
                    )
                  }
                  return null;
                })}

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Sidebar Dropdowns Quick Actions</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('sidebar-expand-all'));
                        addToast('Expanded all sidebar dropdown sections', 'success');
                      }}
                      style={{
                        flex: 1,
                        padding: '0.45rem 0.75rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <ChevronDown size={14} /> Expand All
                    </button>
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('sidebar-collapse-all'));
                        addToast('Collapsed all sidebar dropdown sections', 'success');
                      }}
                      style={{
                        flex: 1,
                        padding: '0.45rem 0.75rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <ChevronRight size={14} /> Collapse All
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Defaults */}
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: '#ecfdf5', padding: '0.5rem', borderRadius: '8px', color: '#10b981' }}><FileText size={20} /></div>
                <h5 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Billing & Invoicing</h5>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Object.entries(globalSettings.billing || {}).map(([key, value]) => {
                  if (typeof value === 'boolean') {
                    return (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.95rem', color: '#334155' }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                        <button onClick={() => handleToggle('billing', key)} style={{ background: 'none', border: 'none', cursor: updatingToggles ? 'not-allowed' : 'pointer', padding: 0, color: value ? '#10b981' : '#94a3b8' }}>
                          {value ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                        </button>
                      </div>
                    )
                  }
                  return null;
                })}
              </div>
            </div>

            {/* Security */}
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: '#fef2f2', padding: '0.5rem', borderRadius: '8px', color: '#ef4444' }}><Shield size={20} /></div>
                <h5 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Security Options</h5>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Object.entries(globalSettings.security || {}).map(([key, value]) => {
                  if (typeof value === 'boolean') {
                    return (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.95rem', color: '#334155' }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                        <button onClick={() => handleToggle('security', key)} style={{ background: 'none', border: 'none', cursor: updatingToggles ? 'not-allowed' : 'pointer', padding: 0, color: value ? '#10b981' : '#94a3b8' }}>
                          {value ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                        </button>
                      </div>
                    )
                  }
                  return null;
                })}
              </div>
            </div>

            {/* Notifications */}
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: '#fffbeb', padding: '0.5rem', borderRadius: '8px', color: '#f59e0b' }}><Bell size={20} /></div>
                <h5 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Notifications</h5>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Object.entries(globalSettings.notifications || {}).map(([key, value]) => {
                  if (typeof value === 'boolean') {
                    return (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.95rem', color: '#334155' }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                        <button onClick={() => handleToggle('notifications', key)} style={{ background: 'none', border: 'none', cursor: updatingToggles ? 'not-allowed' : 'pointer', padding: 0, color: value ? '#10b981' : '#94a3b8' }}>
                          {value ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                        </button>
                      </div>
                    )
                  }
                  return null;
                })}
              </div>
            </div>

            {/* Modules Toggles */}
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: '#eff6ff', padding: '0.5rem', borderRadius: '8px', color: '#3b82f6' }}><HardDrive size={20} /></div>
                <h5 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Module Enablers</h5>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Object.entries(globalSettings.modules || {}).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ textTransform: 'capitalize', fontSize: '0.95rem', color: '#334155' }}>{key} Module</span>
                    <button onClick={() => handleToggle('modules', key)} style={{ background: 'none', border: 'none', cursor: updatingToggles ? 'not-allowed' : 'pointer', padding: 0, color: value ? '#6366f1' : '#94a3b8' }}>
                      {value ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Integrations Toggles */}
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: '8px', color: '#475569' }}><Server size={20} /></div>
                <h5 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>External Integrations</h5>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Object.entries(globalSettings.integrations || {}).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ textTransform: 'capitalize', fontSize: '0.95rem', color: '#334155' }}>{key} Integration</span>
                    <button onClick={() => handleToggle('integrations', key)} style={{ background: 'none', border: 'none', cursor: updatingToggles ? 'not-allowed' : 'pointer', padding: 0, color: value ? '#10b981' : '#94a3b8' }}>
                      {value ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Live Infrastructure Metrics */}
        <div>
          <h4 style={{ margin: '1rem 0 1.5rem 0', fontSize: '1.2rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Live Infrastructure Metrics</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            
            {/* Node.js Server Resources */}
            {data?.server && (
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ backgroundColor: '#f1f5f9', padding: '0.5rem', borderRadius: '8px', color: '#6366f1' }}><Server size={24} /></div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Server Resources</h4>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#64748b', fontWeight: '500' }}>RAM Usage</span>
                    <span style={{ color: '#0f172a', fontWeight: '600' }}>{formatBytes(data.server.memory.used)} / {formatBytes(data.server.memory.total)}</span>
                  </div>
                  <ProgressBar value={data.server.memory.used} max={data.server.memory.total} color="#4f46e5" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Process Mem</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: 600 }}>{formatBytes(data.server.memory.processRss)}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Uptime</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: 600 }}>{formatUptime(data.server.uptime)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* MongoDB Statistics */}
            {data?.mongodb && !data.mongodb.error && (
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ backgroundColor: '#ecfdf5', padding: '0.5rem', borderRadius: '8px', color: '#10b981' }}><Database size={24} /></div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>MongoDB Stats</h4>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#64748b', fontWeight: '500' }}>Storage Size (Allocated)</span>
                    <span style={{ color: '#0f172a', fontWeight: '600' }}>{formatBytes(data.mongodb.storageSize)} / 512 GB (M10 limits approx)</span>
                  </div>
                  <ProgressBar value={data.mongodb.storageSize} max={512 * 1024 * 1024 * 1024} color="#10b981" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Data Size (Actual)</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: 600 }}>{formatBytes(data.mongodb.dataSize)}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Documents</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: 600 }}>{data.mongodb.objects.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Redis Cache Statistics */}
            {data?.redis && !data.redis.error && !data.redis.disabled && (
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: '#fef2f2', padding: '0.5rem', borderRadius: '8px', color: '#ef4444' }}><MemoryStick size={24} /></div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Redis Cache</h4>
                  </div>
                  <button onClick={handleClearCache} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <RefreshCw size={14} /> Clear Cache
                  </button>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#64748b', fontWeight: '500' }}>Memory Used</span>
                    <span style={{ color: '#0f172a', fontWeight: '600' }}>{formatBytes(data.redis.usedMemory)}</span>
                  </div>
                  <ProgressBar value={data.redis.usedMemory} max={32 * 1024 * 1024} color="#ef4444" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Cache Hits</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', color: '#10b981', fontWeight: 600 }}>{data.redis.hits.toLocaleString()}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Cache Misses</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', color: '#ef4444', fontWeight: 600 }}>{data.redis.misses.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Cloudinary Statistics */}
            {data?.cloudinary && !data.cloudinary.error && !data.cloudinary.disabled && (
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ backgroundColor: '#f0f9ff', padding: '0.5rem', borderRadius: '8px', color: '#0ea5e9' }}><Cloud size={24} /></div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Cloudinary Storage</h4>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#64748b', fontWeight: '500' }}>Storage Limit (Credits)</span>
                    <span style={{ color: '#0f172a', fontWeight: '600' }}>{data.cloudinary.storage?.usage || 0} / {data.cloudinary.storage?.limit || 0}</span>
                  </div>
                  <ProgressBar value={data.cloudinary.storage?.usage || 0} max={data.cloudinary.storage?.limit || 100} color="#0ea5e9" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Bandwidth Used</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: 600 }}>{formatBytes(data.cloudinary.bandwidth?.usage || 0)}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Requests</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: 600 }}>{(data.cloudinary.requests?.usage || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
