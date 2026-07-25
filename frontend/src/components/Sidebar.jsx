import React, { useContext, useState } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { SettingsContext } from "../context/SettingsContext";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  Building2,
  MapPin,
  DollarSign,
  Truck,
  ClipboardList,
  Receipt,
  Plus,
  ShoppingCart,
  Upload,
  Eye,
  Download,
  Package,
  Edit,
  Shield,
  Activity,
  TrendingUp,
  Search,
  IdCard
} from "lucide-react";

const Sidebar = ({ isOpen, setIsSidebarOpen }) => {
  const { hasPermission, logout, user } = useContext(AuthContext);
  const { globalSettings } = useContext(SettingsContext);
  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = isOpen || isHovered;

  const handleLinkClick = () => {
    if (window.innerWidth <= 1024) {
      if (setIsSidebarOpen) setIsSidebarOpen(false);
      setIsHovered(false);
    }
  };

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard size={20} />,
      permission: null // Available to all logged-in users
    },
    {
      name: "IAM",
      path: "/iam",
      icon: <Shield size={20} />,
      permission: "superadmin"
    },
    {
      name: "Activity Logs",
      path: "/logs",
      icon: <Activity size={20} />,
      permission: null
    },
    {
      name: "Masters",
      isHeader: true,
      permission: "masters",
      children: [
        { name: "Clients", path: "/clients", icon: <Users size={18} /> },
        { name: "Branches", path: "/branches", icon: <Building2 size={18} /> },
        { name: "Cities", path: "/cities", icon: <MapPin size={18} /> },
        { name: "Vendors", path: "/vendors", icon: <Users size={18} /> },
      ],
    },
    {
      name: "Rates",
      isHeader: true,
      permission: "masters",
      children: [
        {
          name: "Client Rates",
          path: "/rates",
          icon: <DollarSign size={18} />,
        },
      ],
    },
    {
      name: "Operations",
      isHeader: true,
      permission: "operations",
      children: [
        {
          name: "Bookings (LR)",
          path: "/bookings",
          icon: <ClipboardList size={18} />,
        },
        {
          name: "Create Booking",
          path: "/bookings/create",
          icon: <Plus size={18} />,
        },
        { name: "Trips", path: "/trips", icon: <Truck size={18} /> },
        { name: "Tracking", path: "/tracking", icon: <MapPin size={18} /> },
        { name: "POD Upload", path: "/pod", icon: <Upload size={18} /> },
      ],
    },
    {
      name: "Bills",
      isHeader: true,
      permission: "billing",
      children: [
        { name: "All Bills", path: "/bills/all", icon: <Receipt size={18} /> },
        {
          name: "Generate Bills",
          path: "/bills/generate",
          icon: <Plus size={18} />,
        },
        {
          name: "Misc Bill",
          path: "/bills/misc",
          icon: <FileText size={18} />,
        },
        {
          name: "Update Bill",
          path: "/bills/update",
          icon: <Edit size={18} />,
        },
      ],
    },
    {
      name: "Accounts",
      isHeader: true,
      permission: "accounts",
      children: [
        {
          name: "Cash Sheet",
          path: "/cash-sheet",
          icon: <DollarSign size={18} />,
        },
        {
          name: "Purchases",
          path: "/purchases",
          icon: <ShoppingCart size={18} />,
        },
      ],
    },
    {
      name: "Reports",
      isHeader: true,
      permission: "reports",
      children: [
        { name: "Deep Analytics", path: "/reports/analytics", icon: <TrendingUp size={18} /> },
        { name: "GSTR Reports", path: "/reports/gst", icon: <FileText size={18} /> },
        { name: "MIS Reports", path: "/reports/mis", icon: <LayoutDashboard size={18} /> },
        { name: "Unbilled Reports", path: "/reports/unbilled", icon: <ClipboardList size={18} /> },
        { name: "Sales Reports", path: "/reports/sales", icon: <Receipt size={18} /> },
        { name: "Purchase Reports", path: "/reports/purchases", icon: <ShoppingCart size={18} /> },
        { name: "Cashsheet Reports", path: "/reports/cashsheet", icon: <DollarSign size={18} /> },
        { name: "Client Trip Reports", path: "/reports/client-trips", icon: <Truck size={18} /> },
      ],
    },
    {
      name: "Uploads",
      isHeader: true,
      permission: "uploads",
      children: [
        {
          name: "Upload Box",
          path: "/upload-box",
          icon: <Package size={18} />,
        },
        {
          name: "Upload Vouchers",
          path: "/upload-vouchers",
          icon: <Upload size={18} />,
        },
      ],
    },
    {
      name: "Settings & Integrations",
      path: "/settings",
      icon: <Settings size={20} />,
      permission: "superadmin"
    }
  ];

  return (
    <div 
      className={`sidebar ${isExpanded ? 'open' : 'closed'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ overflowX: 'hidden' }}
    >
      <nav
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
          overflowY: "auto",
          scrollbarWidth: "none", /* Firefox */
          msOverflowStyle: "none", /* IE/Edge */
        }}
        className="sidebar-nav"
      >
        <div 
          className="sidebar-search-mobile" 
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          style={{ padding: '0.75rem 1rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
        >
          {isExpanded ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              <Search size={16} color="var(--text-muted)" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Search... (Ctrl+K)</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={16} color="var(--text-muted)" />
            </div>
          )}
        </div>

        {menuItems
          .filter(item => {
            // First check user role permissions
            if (item.permission && !hasPermission(item.permission)) return false;
            // Second check global feature toggles for modules
            if (item.permission && globalSettings?.modules) {
               // E.g., if module 'operations' is false in settings, hide it
               if (globalSettings.modules[item.permission] === false) return false;
            }
            return true;
          })
          .map((item, index) => {
          if (item.isHeader) {
            return (
              <div key={index} style={{ marginTop: "1rem" }}>
                {isExpanded && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      fontWeight: "700",
                      padding: "0.5rem 1rem",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {item.name}
                  </div>
                )}
                {item.children.map((child, cIndex) => (
                  <NavLink
                    key={cIndex}
                    to={child.path}
                    title={!isExpanded ? child.name : ""}
                    onClick={handleLinkClick}
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      justifyContent: isExpanded ? "flex-start" : "center",
                      gap: isExpanded ? "1rem" : "0",
                      padding: isExpanded ? "0.75rem 1rem" : "0.75rem 0",
                      borderRadius: "4px",
                      textDecoration: "none",
                      color: isActive
                        ? "var(--primary-color)"
                        : "var(--text-muted)",
                      background: isActive
                        ? "rgba(255, 153, 0, 0.1)"
                        : "transparent",
                      borderLeft: isActive && isExpanded ? "3px solid var(--primary-color)" : (isActive && !isExpanded ? "3px solid var(--primary-color)" : "3px solid transparent"),
                      fontWeight: isActive ? "600" : "500",
                      transition: "var(--transition)",
                      marginBottom: "0.25rem",
                    })}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '24px', flexShrink: 0 }}>
                      {child.icon}
                    </div>
                    {isExpanded && <span style={{ whiteSpace: "nowrap" }}>{child.name}</span>}
                  </NavLink>
                ))}
              </div>
            );
          }
          return (
            <NavLink
              key={index}
              to={item.path}
              title={!isExpanded ? item.name : ""}
              onClick={handleLinkClick}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                justifyContent: isExpanded ? "flex-start" : "center",
                gap: isExpanded ? "1rem" : "0",
                padding: isExpanded ? "0.75rem 1rem" : "0.75rem 0",
                borderRadius: "4px",
                textDecoration: "none",
                color: isActive ? "var(--primary-color)" : "var(--text-muted)",
                background: isActive
                  ? "rgba(255, 153, 0, 0.1)"
                  : "transparent",
                borderLeft: isActive && isExpanded ? "3px solid var(--primary-color)" : (isActive && !isExpanded ? "3px solid var(--primary-color)" : "3px solid transparent"),
                fontWeight: isActive ? "600" : "500",
                transition: "var(--transition)",
                marginBottom: "0.25rem",
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '24px', flexShrink: 0 }}>
                {item.icon}
              </div>
              {isExpanded && <span style={{ whiteSpace: "nowrap" }}>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
        <button
          onClick={logout}
          title={!isExpanded ? "Log Out" : ""}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isExpanded ? "flex-start" : "center",
            gap: isExpanded ? "1rem" : "0",
            padding: "0.75rem 1rem",
            color: "#ef4444",
            textDecoration: "none",
            fontWeight: "500",
            borderRadius: "4px",
            background: "transparent",
            border: "none",
            width: "100%",
            cursor: "pointer",
            transition: "var(--transition)",
          }}
        >
          <LogOut size={20} />
          {isExpanded && <span style={{ whiteSpace: "nowrap" }}>Log Out</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
