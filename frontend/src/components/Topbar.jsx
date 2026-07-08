import React, { useContext } from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Topbar = ({ toggleSidebar, isSidebarOpen }) => {
  const { user } = useContext(AuthContext);
  const userName = user?.name || 'User';
  const userRole = user?.role || 'Admin';
  return (
    <div style={{ height: 'var(--topbar-height)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', background: 'var(--secondary-color)', color: '#ffffff', position: 'fixed', top: 0, left: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <button onClick={toggleSidebar} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
          <Menu size={24} />
        </button>
        <img src="/mc.png" alt="Logo" style={{ height: '35px', filter: 'brightness(0) invert(1)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.4rem 1rem', borderRadius: '4px', width: '300px', border: '1px solid rgba(255,255,255,0.2)', marginLeft: '1rem' }}>
          <Search size={16} color="#fff" />
          <input type="text" placeholder="Search resources..." style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', color: '#fff', fontSize: '0.9rem' }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>
          <Bell size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right', display: window.innerWidth > 768 ? 'block' : 'none' }}>
            <h6 style={{ fontSize: '0.85rem', marginBottom: '0', fontWeight: 600, color: '#ffffff' }}>{userName}</h6>
            <p style={{ margin: '0', fontSize: '0.75rem', color: '#9ba7b6' }}>{userRole}</p>
          </div>
          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=FF9900&color=fff`} alt="User" className="avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
        </div>
      </div>
    </div>
  );
};

export default Topbar;
