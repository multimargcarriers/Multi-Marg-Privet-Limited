import React, { useContext, useState, useRef, useEffect } from 'react';
import { Bell, Menu, Plus, Minus, AlertCircle, Search, User, Settings, LogOut, Type, Clock } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { SettingsContext } from '../context/SettingsContext';
import { useNotification } from '../context/NotificationContext';
import { BadgeContext } from '../context/BadgeContext';
import { useSync } from '../context/SyncContext';
import QuickAddModal from './QuickAddModal';
import axios from 'axios';
import { } from '../context/ToastContext';

const Topbar = ({ toggleSidebar, _isSidebarOpen, hasSidebar = true }) => {
  const { user, hasPermission } = useContext(AuthContext);
  const { totalIncomplete, incompleteItems, refreshNotifications } = useNotification();
  const { notifications, totalUnreadActivity, markAsRead } = useContext(BadgeContext);
  const { globalSettings, fontSize, changeFontSize, increaseFontSize, decreaseFontSize, resetFontSize } = useContext(SettingsContext);
  const { syncQueue, isOnline, isSyncing } = useSync() || { syncQueue: [] };
  const [fontInputValue, setFontInputValue] = useState(fontSize ? fontSize.toString() : '100');

  useEffect(() => {
    setFontInputValue(fontSize ? fontSize.toString() : '100');
  }, [fontSize]);
  const userName = user?.name || 'User';
  const userRole = (user?.role === 'Admin' || !user?.role) ? 'Employee' : user.role;

  const getUserAvatarUrl = () => {
    let src = user?.photo || user?.avatar || user?.picture;
    if (src) {
      if (typeof src === 'string' && src.includes('res.cloudinary.com')) {
        src = src.toLowerCase();
      } else if (typeof src === 'string' && src.startsWith('/uploads/')) {
        src = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${src}`;
      }
      return src;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=FF9900&color=fff`;
  };

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const navigate = useNavigate();

  // QuickAddModal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [modalInitialName, setModalInitialName] = useState("");
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalNotificationCount = totalIncomplete + totalUnreadActivity;

  const handleActivityClick = (item) => {
    markAsRead(item.id);
    setDropdownOpen(false);
    
    let path = "/dashboard";
    if (item.module === "bookings") path = "/bookings";
    if (item.module === "trips") path = "/trips";
    if (item.module === "bills") path = "/bills/all";
    if (item.module === "purchases") path = "/purchases";
    if (item.module === "cashEntries") path = "/cash-sheet";
    
    navigate(path);
  };

  const handleNotificationClick = (item) => {
    setDropdownOpen(false);
    setModalType(item.type);
    setModalInitialName(item.name);
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleModalSave = async (data) => {
    // We update the item via PUT using its ID
    if (!editingItem) return;
    
    try {
      const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";
      const endpoint = `${API}/${editingItem.type === 'city' ? 'cities' : editingItem.type + 's'}/${editingItem.id}`;
      
      // Merge with data and set isIncomplete false
      const payload = { ...data, isIncomplete: false };
      
      await axios.put(endpoint, payload);
      addToast(`${editingItem.type} details completed successfully!`, "success");
      refreshNotifications();
    } catch (e) {
      console.error(e);
      addToast(`Failed to update ${editingItem.type}`, "error");
    }
  };

  return (
    <>
    <style>{`
      @media (max-width: 768px) {
        .topbar {
          padding: 0 0.75rem !important;
        }
        .topbar-right {
          gap: 0.5rem !important;
        }
        .font-size-adjuster {
          gap: 0 !important;
          padding: 1px 4px !important;
          margin-right: 0 !important;
          transform: scale(0.9);
          transform-origin: right center;
        }
        .font-size-adjuster input {
          width: 28px !important;
          font-size: 0.75rem !important;
        }
        .topbar-avatar {
          width: 28px !important;
          height: 28px !important;
        }
        .topbar-logo {
          height: 28px !important;
        }
      }
    `}</style>
    <div className="topbar no-print" style={{ height: 'var(--topbar-height)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', background: 'var(--secondary-color)', color: '#ffffff', position: 'fixed', top: 0, left: 0, zIndex: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {hasSidebar && (
          <button onClick={toggleSidebar} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
            <Menu size={24} />
          </button>
        )}
        <img src="/mc.png?v=2" alt="Logo" className="topbar-logo" style={{ height: '52px', filter: 'invert(1) grayscale(1) contrast(1.5)', mixBlendMode: 'screen' }} />
        {/* Global Search (Available for all roles) */}
        <div 
          className="topbar-search"
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', minWidth: '200px' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={16} color="rgba(255,255,255,0.7)" />
              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>Search bookings...</span>
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.2)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
              Ctrl K
            </div>
          </div>

      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }} className="topbar-right">
        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: '2px' }} className="hide-on-mobile">
          {hasPermission('bookings') && (
            <NavLink to="/bookings/create" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--primary-color)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(255, 255, 255, 0.1)', whiteSpace: 'nowrap' }}>
              <Plus size={14} /> New LR
            </NavLink>
          )}
          {hasPermission('trips') && (
            <NavLink to="/trips" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.1)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(255, 255, 255, 0.2)', whiteSpace: 'nowrap' }}>
              <Plus size={14} /> Add Trip
            </NavLink>
          )}
          {(hasPermission('billing') || hasPermission('all_bills')) && (
            <NavLink to="/bills/generate" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.1)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(255, 255, 255, 0.2)', whiteSpace: 'nowrap' }}>
              <Plus size={14} /> New Bill
            </NavLink>
          )}
          {hasPermission('pod') && (
            <NavLink to="/pod" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.1)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(255, 255, 255, 0.2)', whiteSpace: 'nowrap' }}>
              <Plus size={14} /> POD Upload
            </NavLink>
          )}
          {hasPermission('upload_box') && (
            <NavLink to="/upload-box" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.1)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(255, 255, 255, 0.2)', whiteSpace: 'nowrap' }}>
              <Plus size={14} /> Box Upload
            </NavLink>
          )}
          {(!user || hasPermission('tracking')) && (
            <NavLink to="/tracking" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.1)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(255, 255, 255, 0.2)', whiteSpace: 'nowrap' }}>
              <Search size={14} /> Tracking
            </NavLink>
          )}
        </div>

        {/* Font Size Adjuster Controls */}
        <div 
          className="font-size-adjuster"
          title="Adjust Application Text Size"
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '3px 6px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            gap: '0.2rem',
            marginRight: '0.5rem',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          <button
            type="button"
            onClick={decreaseFontSize}
            title="Decrease Text Size (-)"
            disabled={fontSize <= 50}
            style={{
              background: 'transparent',
              border: 'none',
              color: fontSize <= 50 ? 'rgba(255, 255, 255, 0.3)' : '#ffffff',
              cursor: fontSize <= 50 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.25rem',
              borderRadius: '4px',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => { if (fontSize > 50) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <Minus size={14} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '0 2px' }}>
            <Type 
              size={12} 
              style={{ opacity: 0.85, cursor: 'pointer', color: '#ffffff' }} 
              onClick={resetFontSize}
              title="Click to reset text size to 100%"
            />
            <label htmlFor="font-size-input" style={{ display: 'none' }}>Font Size</label>
            <input
              id="font-size-input"
              name="fontSize"
              type="text"
              value={fontInputValue}
              onChange={(e) => setFontInputValue(e.target.value)}
              onBlur={() => {
                const val = parseInt(fontInputValue, 10);
                if (!isNaN(val)) {
                  changeFontSize(val);
                } else {
                  setFontInputValue(fontSize.toString());
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = parseInt(fontInputValue, 10);
                  if (!isNaN(val)) {
                    changeFontSize(val);
                  } else {
                    setFontInputValue(fontSize.toString());
                  }
                  e.target.blur();
                }
              }}
              title="Type custom text size percentage (50 - 400) & press Enter"
              style={{
                width: '32px',
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: '600',
                textAlign: 'center',
                outline: 'none',
                padding: '0'
              }}
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>%</span>
          </div>

          <button
            type="button"
            onClick={increaseFontSize}
            title="Increase Text Size (+)"
            disabled={fontSize >= 400}
            style={{
              background: 'transparent',
              border: 'none',
              color: fontSize >= 400 ? 'rgba(255, 255, 255, 0.3)' : '#ffffff',
              cursor: fontSize >= 400 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.25rem',
              borderRadius: '4px',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => { if (fontSize < 400) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Notifications (Admin, Super Admin, and those with activity permissions) */}
        {hasSidebar && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1rem' }} ref={dropdownRef}>
            
            {/* Manual Sync Button for Offline Items */}
            {globalSettings?.ui?.showManualSyncButton && syncQueue && syncQueue.length > 0 && (
              <button 
                onClick={() => {
                  import('../utils/syncManager').then(m => m.default.syncAll());
                }} 
                style={{ 
                  background: isSyncing ? '#f59e0b' : '#ef4444', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '20px', 
                  padding: '0.3rem 0.75rem', 
                  fontSize: '0.75rem', 
                  fontWeight: 600,
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.4rem',
                  cursor: (isSyncing || !isOnline) ? 'not-allowed' : 'pointer',
                  opacity: (isSyncing || !isOnline) ? 0.7 : 1,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}
                disabled={isSyncing || !isOnline}
                title={!isOnline ? "Connect to internet to sync" : "Click to push offline items"}
              >
                <Clock size={14} className={isSyncing ? "spin-animation" : ""} /> 
                {isSyncing ? "Syncing..." : `Sync ${syncQueue.length} Items`}
              </button>
            )}

            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', position: 'relative', display: 'flex', alignItems: 'center' }}
            >
              <Bell size={20} />
              {totalNotificationCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-5px', right: '-8px',
                  background: '#ef4444', color: 'white', borderRadius: '50%',
                  padding: '0.1rem 0.4rem', fontSize: '0.7rem', fontWeight: 'bold'
                }}>
                  {totalNotificationCount}
                </span>
              )}
            </button>
            
            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '10px',
                width: '320px', background: 'white', borderRadius: '8px',
                boxShadow: '0 10px 25px -3px rgba(0,0,0,0.15), 0 4px 6px -2px rgba(0,0,0,0.05)',
                border: '1px solid #e2e8f0', color: '#1e293b', zIndex: 1000
              }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Notifications</span>
                  <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>{totalNotificationCount} New</span>
                </div>
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {incompleteItems.length === 0 && notifications.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                      No pending notifications!
                    </div>
                  ) : (
                    <>
                      {/* Real-time Activity Notifications */}
                      {notifications.map(item => (
                        <div 
                          key={item.id} 
                          onClick={() => handleActivityClick(item)}
                          style={{ 
                            padding: '1rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                            display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                            background: item.read ? 'white' : '#eff6ff',
                            transition: 'background 0.2s'
                          }}
                          onMouseOver={e => e.currentTarget.style.background = item.read ? '#f8fafc' : '#dbeafe'}
                          onMouseOut={e => e.currentTarget.style.background = item.read ? 'white' : '#eff6ff'}
                        >
                          <Bell size={18} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: item.read ? '500' : '600' }}>{item.title || item.message}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                              {new Date(item.timestamp).toLocaleString()}
                            </div>
                          </div>
                          {!item.read && (
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', marginTop: '6px' }} />
                          )}
                        </div>
                      ))}

                      {/* Incomplete Master Notifications */}
                      {incompleteItems.map(item => (
                        <div 
                          key={item.id} 
                          onClick={() => handleNotificationClick(item)}
                          style={{ 
                            padding: '1rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                            display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                            background: 'white',
                            transition: 'background 0.2s'
                          }}
                          onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseOut={e => e.currentTarget.style.background = 'white'}
                        >
                          <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Incomplete {item.type.charAt(0).toUpperCase() + item.type.slice(1)}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>"{item.name}" requires more details. Click to complete.</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Profile */}
        <div style={{ position: 'relative' }} ref={profileDropdownRef}>
          <div 
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.25rem', borderRadius: '8px', transition: 'background 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ textAlign: 'right', display: window.innerWidth > 768 ? 'block' : 'none' }}>
              <h6 style={{ fontSize: '0.85rem', marginBottom: '0', fontWeight: 600, color: '#ffffff' }}>{userName}</h6>
              <p style={{ margin: '0', fontSize: '0.75rem', color: '#9ba7b6' }}>{userRole}</p>
            </div>
            <img 
              src={getUserAvatarUrl()} 
              alt="User" 
              className="avatar topbar-avatar" 
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }} 
            />
          </div>
          
          {profileDropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '10px',
              width: '220px', background: 'var(--panel-solid-bg)', borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-color)', color: 'var(--text-dark)', zIndex: 1000,
              overflow: 'hidden'
            }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img 
                  src={getUserAvatarUrl()} 
                  alt="User" 
                  style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} 
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{userName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email || 'admin@multimarg.com'}</div>
                </div>
              </div>
              
              <div style={{ padding: '0.5rem' }}>
                <div 
                  onClick={() => { setProfileDropdownOpen(false); navigate('/profile'); }}
                  style={{ padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--text-dark)', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-color)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <User size={16} color="var(--text-muted)" /> My Profile
                </div>
                
                {(!user || hasPermission('superadmin')) && (
                  <div 
                    onClick={() => { setProfileDropdownOpen(false); navigate('/settings'); }}
                    style={{ padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--text-dark)', transition: 'all 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-color)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Settings size={16} color="var(--text-muted)" /> System Settings
                  </div>
                )}
                
                <div style={{ margin: '0.5rem 0', height: '1px', background: 'var(--border-color)' }}></div>
                
                <div 
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    // assuming logout is in AuthContext or just reload
                    localStorage.removeItem('token');
                    window.location.href = '/';
                  }}
                  style={{ padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', borderRadius: '6px', fontSize: '0.9rem', color: '#ef4444', transition: 'all 0.2s' }}
                  onMouseOver={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ef4444'; }}
                >
                  <LogOut size={16} /> Logout
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <QuickAddModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
        type={modalType}
        initialName={modalInitialName}
      />
    </div>
    </>
  );
};

export default Topbar;
