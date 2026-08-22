import React, { useState, useEffect, useContext } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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
  
  const location = useLocation();
  const isWebmailPage = location.pathname.startsWith('/webmail') || location.pathname.startsWith('/mail');

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
        <main
          className={`page-content ${isWebmailPage ? 'webmail-layout-root' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: isWebmailPage ? 'calc(100dvh - var(--topbar-height, 64px))' : 'calc(100vh - var(--topbar-height))',
            height: isWebmailPage ? 'calc(100dvh - var(--topbar-height, 64px))' : 'auto',
            maxHeight: isWebmailPage ? 'calc(100dvh - var(--topbar-height, 64px))' : 'none',
            overflow: isWebmailPage ? 'hidden' : 'visible',
            padding: isWebmailPage ? (isMobile ? '4px' : '8px') : undefined,
            justifyContent: 'space-between'
          }}
        >
          <div
            style={{
              flex: 1,
              paddingBottom: 0,
              height: isWebmailPage ? '100%' : 'auto',
              display: isWebmailPage ? 'flex' : 'block',
              flexDirection: isWebmailPage ? 'column' : 'row',
              overflow: isWebmailPage ? 'hidden' : 'visible'
            }}
          >
            <Outlet />
          </div>
          {!isWebmailPage && (
            <footer className="app-footer no-print">
              <div className="app-footer-brand">
                <img src="/circle_crop_logo.png" alt="Logo" style={{ height: '22px', width: '22px', objectFit: 'contain' }} />
                <span className="app-footer-brand-text">
                  MULTIMARG CARRIERS
                </span>
              </div>
              <div className="app-footer-meta">
                <span>
                  Support: <a href="mailto:info@multimarg.com" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>info@multimarg.com</a>
                </span>
                <span className="hide-on-mobile">•</span>
                <span>
                  &copy; {new Date().getFullYear()} Multimarg Carriers Private Limited. All rights reserved.
                </span>
              </div>
            </footer>
          )}
        </main>
      </div>
      {hasSidebar && hasRightSidebar && <RightSidebar />}
      <CommandPalette isOpen={isCommandPaletteOpen} setIsOpen={setIsCommandPaletteOpen} />
    </div>
  );
};

export default DashboardLayout;
