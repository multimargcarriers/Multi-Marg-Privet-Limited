import React, { useContext, useState, useRef, useEffect } from 'react';
import { Bell, Menu, Plus, AlertCircle, Search, User, Settings, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import QuickAddModal from './QuickAddModal';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

const Topbar = ({ toggleSidebar, isSidebarOpen, hasSidebar = true }) => {
  const { user, hasPermission } = useContext(AuthContext);
  const { totalIncomplete, incompleteItems, refreshNotifications } = useNotification();
  const { addToast } = useToast();
  const userName = user?.name || 'User';
  const userRole = (user?.role === 'Admin' || !user?.role) ? 'Employee' : user.role;

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
    <div style={{ height: 'var(--topbar-height)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', background: 'var(--secondary-color)', color: '#ffffff', position: 'fixed', top: 0, left: 0, zIndex: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {hasSidebar && (
          <button onClick={toggleSidebar} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
            <Menu size={24} />
          </button>
        )}
        <img src="/mc.png" alt="Logo" style={{ height: '35px', filter: 'brightness(0) invert(1)' }} />
        {(!user || hasPermission('operations') || hasPermission('dashboard')) && (
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
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }} className="topbar-right">
        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }} className="hide-on-mobile">
          {hasPermission('operations') && (
            <NavLink to="/bookings/create" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--primary-color)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <Plus size={14} /> New LR
            </NavLink>
          )}
          {hasPermission('operations') && (
            <NavLink to="/trips" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.1)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <Plus size={14} /> Add Trip
            </NavLink>
          )}
          {hasPermission('billing') && (
            <NavLink to="/bills/generate" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.1)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <Plus size={14} /> New Bill
            </NavLink>
          )}
        </div>

        {/* Notifications */}
        {hasSidebar && (
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', position: 'relative', display: 'flex', alignItems: 'center' }}
            >
              <Bell size={20} />
              {totalIncomplete > 0 && (
                <span style={{
                  position: 'absolute', top: '-5px', right: '-8px',
                  background: '#ef4444', color: 'white', borderRadius: '50%',
                  padding: '0.1rem 0.4rem', fontSize: '0.7rem', fontWeight: 'bold'
                }}>
                  {totalIncomplete}
                </span>
              )}
            </button>
            
            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '10px',
                width: '300px', background: 'white', borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                border: '1px solid #e2e8f0', color: '#1e293b', zIndex: 1000
              }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', fontWeight: '600' }}>
                  Notifications ({totalIncomplete})
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {incompleteItems.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                      No pending notifications!
                    </div>
                  ) : (
                    incompleteItems.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => handleNotificationClick(item)}
                        style={{ 
                          padding: '1rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                          display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
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
                    ))
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
              src={user?.photo && (user.photo.startsWith('http') || user.photo.startsWith('blob')) ? user.photo : (user?.photo ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${user.photo}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=FF9900&color=fff`)} 
              alt="User" 
              className="avatar" 
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
                  src={user?.photo && (user.photo.startsWith('http') || user.photo.startsWith('blob')) ? user.photo : (user?.photo ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${user.photo}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=FF9900&color=fff`)} 
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
  );
};

export default Topbar;
