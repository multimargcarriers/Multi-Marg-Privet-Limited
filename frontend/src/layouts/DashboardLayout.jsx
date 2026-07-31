import React, { useState, useEffect, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar, { getVisibleMenuItems } from '../components/Sidebar';
import RightSidebar from '../components/RightSidebar';
import Topbar from '../components/Topbar';
import CommandPalette from '../components/CommandPalette';
import { AuthContext } from '../context/AuthContext';
import { SettingsContext } from '../context/SettingsContext';

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  
  const { hasPermission } = useContext(AuthContext);
  const { globalSettings } = useContext(SettingsContext);

  const visibleMenuItems = getVisibleMenuItems(hasPermission, globalSettings);
  const hasSidebar = visibleMenuItems.length > 0;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="app-container">
      {hasSidebar && <Sidebar isOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />}
      <div className={`main-content ${hasSidebar ? (isSidebarOpen ? 'sidebar-open' : 'sidebar-closed') : 'no-sidebar'}`}>
        <Topbar toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} hasSidebar={hasSidebar} />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
      {hasSidebar && <RightSidebar />}
      <CommandPalette isOpen={isCommandPaletteOpen} setIsOpen={setIsCommandPaletteOpen} />
    </div>
  );
};

export default DashboardLayout;
