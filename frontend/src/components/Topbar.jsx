import React, { useContext } from 'react';
import { Bell, Search, Menu, Plus } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Topbar = ({ toggleSidebar, isSidebarOpen }) => {
  const { user, hasPermission } = useContext(AuthContext);
  const userName = user?.name || 'User';
  const userRole = user?.role || 'Admin';

  return (
    <div style={{ height: 'var(--topbar-height)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', background: 'var(--secondary-color)', color: '#ffffff', position: 'fixed', top: 0, left: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <button onClick={toggleSidebar} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
          <Menu size={24} />
        </button>
        <img src="/mc.png" alt="Logo" style={{ height: '35px', filter: 'brightness(0) invert(1)' }} />
        <div className="topbar-search">
          <Search size={16} color="#fff" />
          <input type="text" placeholder="Search..." style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', color: '#fff', fontSize: '0.9rem' }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }} className="topbar-right">
        {/* Quick Action Buttons - Topbar */}
        <div style={{ display: 'flex', gap: '0.5rem' }} className="hide-on-mobile">
          {(!user || hasPermission('operations')) && (
            <NavLink to="/bookings/create" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--primary-color)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)' }}>
              <Plus size={14} /> New LR
            </NavLink>
          )}
          {(!user || hasPermission('operations')) && (
            <NavLink to="/trips" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.1)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(255,255,255,0.2)' }}>
              <Plus size={14} /> Add Trip
            </NavLink>
          )}
          {(!user || hasPermission('billing')) && (
            <NavLink to="/bills/generate" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.1)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(255,255,255,0.2)' }}>
              <Plus size={14} /> New Bill
            </NavLink>
          )}
        </div>

        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>
          <Bell size={20} />
        </button>
        <NavLink to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ textAlign: 'right', display: window.innerWidth > 768 ? 'block' : 'none' }}>
            <h6 style={{ fontSize: '0.85rem', marginBottom: '0', fontWeight: 600, color: '#ffffff' }}>{userName}</h6>
            <p style={{ margin: '0', fontSize: '0.75rem', color: '#9ba7b6' }}>{userRole}</p>
          </div>
          <img 
            src={user?.photo && (user.photo.startsWith('http') || user.photo.startsWith('blob')) ? user.photo : (user?.photo ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${user.photo}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=FF9900&color=fff`)} 
            alt="User" 
            className="avatar" 
            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} 
          />
        </NavLink>
      </div>
    </div>
  );
};

export default Topbar;
