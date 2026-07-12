import React, { useContext, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Plus, Receipt, Truck, Upload, DollarSign, FileText, MapPin, Users, Briefcase, Building2, TrendingUp, Activity } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const RightSidebar = () => {
  const { hasPermission } = useContext(AuthContext);
  const [isHovered, setIsHovered] = useState(false);

  const quickLinks = [
    {
      name: "New Booking (LR)",
      path: "/bookings/create",
      icon: <Plus size={18} />,
      permission: "operations",
      color: "var(--primary-color)"
    },
    {
      name: "Generate Bill",
      path: "/bills/generate",
      icon: <Receipt size={18} />,
      permission: "billing",
      color: "#10B981" // Emerald
    },
    {
      name: "Misc Bill",
      path: "/bills/misc",
      icon: <FileText size={18} />,
      permission: "billing",
      color: "#F43F5E" // Rose
    },
    {
      name: "Upload POD",
      path: "/pod",
      icon: <Upload size={18} />,
      permission: "operations",
      color: "#8B5CF6" // Violet
    },
    {
      name: "Tracking",
      path: "/tracking",
      icon: <MapPin size={18} />,
      permission: "operations",
      color: "#0EA5E9" // Sky Blue
    },
    {
      name: "Clients",
      path: "/clients",
      icon: <Users size={18} />,
      permission: "masters",
      color: "#F59E0B" // Amber
    },
    {
      name: "Vendors",
      path: "/vendors",
      icon: <Briefcase size={18} />,
      permission: "masters",
      color: "#D946EF" // Fuchsia
    },
    {
      name: "Branches",
      path: "/branches",
      icon: <Building2 size={18} />,
      permission: "masters",
      color: "#6366F1" // Indigo
    },
    {
      name: "Cash Sheet",
      path: "/cash-sheet",
      icon: <DollarSign size={18} />,
      permission: "accounts",
      color: "#3B82F6" // Blue
    },
    {
      name: "Deep Analytics",
      path: "/reports/analytics",
      icon: <TrendingUp size={18} />,
      permission: "reports",
      color: "#14B8A6" // Teal
    },
    {
      name: "System Logs",
      path: "/logs",
      icon: <Activity size={18} />,
      permission: "superadmin",
      color: "#EF4444" // Red
    }
  ];

  return (
    <aside 
      className="right-sidebar glass-panel" 
      style={{ height: 'calc(100vh - var(--topbar-height))', overflowY: 'hidden', overflowX: 'hidden' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="right-sidebar-header" style={{ padding: isHovered ? '1rem' : '1rem 0', borderBottom: '1px solid var(--border-color)', textAlign: isHovered ? 'left' : 'center', transition: 'padding var(--transition)' }}>
        {isHovered ? (
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Actions</h3>
        ) : (
          <div style={{ width: '100%', height: '4px', background: 'var(--primary-color)', borderRadius: '2px', opacity: 0.5, margin: '0 auto', maxWidth: '20px' }}></div>
        )}
      </div>
      
      <div className="right-sidebar-content" style={{ padding: isHovered ? '0.75rem 1rem' : '0.75rem 0', transition: 'padding var(--transition)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {quickLinks.map((link, index) => {
            if (link.permission && !hasPermission(link.permission)) return null;
            return (
              <NavLink 
                key={index} 
                to={link.path}
                className={({ isActive }) => `quick-action-card ${isActive ? 'active' : ''}`}
                title={!isHovered ? link.name : ""}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: isHovered ? 'flex-start' : 'center',
                  gap: isHovered ? '0.75rem' : '0', 
                  padding: isHovered ? '0.5rem 0.75rem' : '0.5rem 0', 
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'var(--text-dark)',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--border-color)',
                  transition: 'all var(--transition)'
                }}
              >
                <div style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '6px', 
                  backgroundColor: `${link.color}15`, 
                  color: link.color,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {React.cloneElement(link.icon, { size: 16 })}
                </div>
                {isHovered && (
                  <div style={{ flex: 1, whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, display: 'block' }}>{link.name}</span>
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;
