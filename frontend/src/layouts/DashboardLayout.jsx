import React, { useState, useEffect, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar, { getVisibleMenuItems } from '../components/Sidebar';
import RightSidebar from '../components/RightSidebar';
import Topbar from '../components/Topbar';
import CommandPalette from '../components/CommandPalette';
import { AuthContext } from '../context/AuthContext';
import { SettingsContext } from '../context/SettingsContext';

const DashboardLayout = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  
  const { hasPermission } = useContext(AuthContext);
  const { globalSettings } = useContext(SettingsContext);

  const visibleMenuItems = getVisibleMenuItems(hasPermission, globalSettings);
  const hasSidebar = visibleMenuItems.length > 0;
  const hasRightSidebar = ['operations', 'billing', 'masters', 'accounts', 'reports', 'superadmin'].some(perm => hasPermission(perm));

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (mobile && isSidebarOpen) {
        // Automatically close on transition to tablet/mobile layout
        setIsSidebarOpen(false);
      } else if (!mobile && !isSidebarOpen) {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className={`app-container ${isMobile ? 'is-mobile' : 'is-desktop'}`}>
      {hasSidebar && isMobile && isSidebarOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {hasSidebar && <Sidebar isOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isMobile={isMobile} />}
      <div className={`main-content ${hasSidebar ? (isSidebarOpen ? 'sidebar-open' : 'sidebar-closed') : 'no-sidebar'} ${!hasRightSidebar ? 'no-right-sidebar' : ''}`}>
        <Topbar toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} hasSidebar={hasSidebar} />
        <main className="page-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - var(--topbar-height))', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, paddingBottom: '2rem' }}>
            <Outlet />
          </div>
          <footer className="no-print" style={{ 
            padding: '1.25rem 2rem', 
            background: '#ffffff', 
            borderTop: '1px solid #e2e8f0', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#64748b',
            marginTop: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img src="/circle_crop_logo.png" alt="Logo" style={{ height: '24px', width: '24px', objectFit: 'contain' }} />
              <span style={{ 
                fontFamily: "'Montserrat', sans-serif", 
                fontWeight: 800, 
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #FF8A00 0%, #FF5A1F 50%, #E53935 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                MULTIMARG CARRIERS
              </span>
            </div>
            <div>
              &copy; {new Date().getFullYear()} Multimarg Carriers Private Limited. All rights reserved.
            </div>
          </footer>
        </main>
      </div>
      {hasSidebar && hasRightSidebar && <RightSidebar />}
      <CommandPalette isOpen={isCommandPaletteOpen} setIsOpen={setIsCommandPaletteOpen} />
    </div>
  );
};

export default DashboardLayout;
