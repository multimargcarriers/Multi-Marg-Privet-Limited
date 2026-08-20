import React, { useContext, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { SettingsContext } from "../context/SettingsContext";
import { BadgeContext } from "../context/BadgeContext";
import appDB from "../utils/appDB";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  Building2,
  Briefcase,
  MapPin,
  DollarSign,
  Truck,
  ClipboardList,
  Receipt,

  ShoppingCart,
  Upload,


  Package,
  MessageSquare,
  Shield,
  Activity,
  TrendingUp,
  Search,
  ChevronDown,
  ChevronRight,
  Layers,
  Trash2,
  Calendar,
  Globe
} from "lucide-react";

export const menuItems = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: <LayoutDashboard size={20} />,
    permission: "dashboard"
  },
  {
    name: "Operations",
    isHeader: true,
    icon: <ClipboardList size={18} />,
    permission: "operations",
    children: [
      {
        name: "ALL AWB Bookings",
        path: "/bookings",
        icon: <ClipboardList size={18} />,
        permission: "bookings",
        moduleKey: "bookings"
      },
      { name: "Vendor Ship MIS", path: "/trips", icon: <Truck size={18} />, permission: "trips", moduleKey: "trips" },
      { name: "Vehicle Trip MIS", path: "/trip-mis", icon: <FileText size={18} />, permission: "tripmis" },
      { name: "Vendor Vehicle MIS", path: "/vendor-mis", icon: <Truck size={18} />, permission: "vendormis" },
      { name: "Tracking", path: "/tracking", icon: <MapPin size={18} /> },
      { name: "POD Upload", path: "/pod", icon: <Upload size={18} />, permission: "pod" },
      {
        name: "Upload Box",
        path: "/upload-box",
        icon: <Package size={18} />,
        permission: "upload_box"
      },
    ],
  },
  {
    name: "Accounts",
    isHeader: true,
    icon: <FileText size={18} />,
    permission: "accounts",
    children: [
      { 
        name: "Sales Bills", 
        path: "/bills/all", 
        icon: <Receipt size={18} />, 
        permission: "all_bills",
        moduleKey: "bills" 
      },
      {
        name: "Purchase Bills",
        path: "/purchases",
        icon: <ShoppingCart size={18} />,
        permission: "purchases",
        moduleKey: "purchases"
      },
      {
        name: "Cash Sheet",
        path: "/cash-sheet",
        icon: <DollarSign size={18} />,
        permission: "cash_sheet",
        moduleKey: "cashEntries"
      },
      {
        name: "TDS & Debt Adjustment",
        path: "/outstanding",
        icon: <DollarSign size={18} />,
        permission: "accounts"
      },
      {
        name: "Opening Balances & FY Close",
        path: "/opening-outstanding",
        icon: <Calendar size={18} />,
        permission: "accounts"
      },
    ],
  },
  {
    name: "Reports",
    isHeader: true,
    icon: <TrendingUp size={18} />,
    permission: "reports",
    children: [
      { name: "Deep Analytics", path: "/reports/analytics", icon: <TrendingUp size={18} />, permission: "analytics" },
      { name: "GSTR Reports", path: "/reports/gst", icon: <FileText size={18} />, permission: "gst_reports" },
      { name: "MIS Reports", path: "/reports/mis", icon: <LayoutDashboard size={18} />, permission: "mis_reports" },
      { name: "Unbilled Reports", path: "/reports/unbilled", icon: <ClipboardList size={18} />, permission: "unbilled_reports" },
      { name: "Sales Reports", path: "/reports/sales", icon: <Receipt size={18} />, permission: "sales_reports" },
      { name: "Purchase Reports", path: "/reports/purchases", icon: <ShoppingCart size={18} />, permission: "purchase_reports" },
      { name: "Cashsheet Reports", path: "/reports/cashsheet", icon: <DollarSign size={18} />, permission: "cashsheet_reports" },
      { name: "Client Trip Reports", path: "/reports/client-trips", icon: <Truck size={18} />, permission: "client_trip_reports" },
    ],
  },
  {
    name: "Masters",
    isHeader: true,
    icon: <Building2 size={18} />,
    permission: "masters",
    children: [
      { name: "Clients", path: "/clients", icon: <Users size={18} />, permission: "clients" },
      { name: "Branches", path: "/branches", icon: <Building2 size={18} />, permission: "branches" },
      { name: "Cities", path: "/cities", icon: <MapPin size={18} />, permission: "cities" },
      { name: "Vendors", path: "/vendors", icon: <Users size={18} />, permission: "vendors" },
    ],
  },
  {
    name: "Rates",
    isHeader: true,
    icon: <DollarSign size={18} />,
    permission: "rates",
    children: [
      {
        name: "Client Rates",
        path: "/rates",
        icon: <DollarSign size={18} />,
        permission: "client_rates"
      },
    ],
  },
  {
    name: "Website",
    isHeader: true,
    icon: <Globe size={18} />,
    permission: "superadmin",
    children: [
      { name: "Quote Requests", path: "/quotes", icon: <FileText size={18} />, permission: "superadmin" },
      { name: "Contact Queries", path: "/contact-submissions", icon: <MessageSquare size={18} />, permission: "superadmin" },
      { name: "Job Applications", path: "/applications", icon: <Briefcase size={18} />, permission: "superadmin" },
      { name: "Manage FAQs", path: "/cms/faqs", icon: <FileText size={18} />, permission: "superadmin" },
      { name: "Manage Careers", path: "/cms/careers", icon: <Users size={18} />, permission: "superadmin" },
      { name: "Manage Services", path: "/cms/services", icon: <Package size={18} />, permission: "superadmin" },
    ],
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
    permission: "logs"
  },
  {
    name: "Employee Data",
    path: "/employee-activity",
    icon: <Users size={20} />,
    permission: "superadmin"
  },
  {
    name: "Settings & Integrations",
    path: "/settings",
    icon: <Settings size={20} />,
    permission: "superadmin"
  },
  {
    name: "Trash",
    path: "/trash",
    icon: <Trash2 size={20} />
  }
];

export const getVisibleMenuItems = (hasPermission, globalSettings, user) => {
  return menuItems
    .map(item => {
      if (item.isHeader) {
        const hasParentPermission = !item.permission || hasPermission(item.permission);
        const visibleChildren = item.children.filter(child => {
          if (item.permission && globalSettings?.modules && globalSettings.modules[item.permission] === false) return false;
          if (!child.permission) return true;
          
          if (hasParentPermission) return true;
          return child.permission && hasPermission(child.permission);
        });
        return { ...item, children: visibleChildren };
      }
      return item;
    })
    .filter(item => {
      if (item.isHeader) {
        return item.children.length > 0;
      } else {
        if (item.permission && globalSettings?.modules && globalSettings.modules[item.permission] === false) return false;
        return !item.permission || hasPermission(item.permission);
      }
    });
};

const Sidebar = ({ isOpen, setIsSidebarOpen, isMobile }) => {
  const { hasPermission, logout, user } = useContext(AuthContext);
  const { unreadCounts } = useContext(BadgeContext);
  const { globalSettings } = useContext(SettingsContext);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredPopover, setHoveredPopover] = useState(null);
  const location = useLocation();

  const effectiveIsMobile = isMobile !== undefined ? isMobile : (typeof window !== 'undefined' && window.innerWidth <= 1024);
  const isExpanded = effectiveIsMobile ? isOpen : (isOpen || isHovered);

  // Track accordion open/closed state for sections
  const [openSections, setOpenSections] = useState(() => {
    try {
      const saved = appDB.memGet("sidebar_open_sections");
      if (saved) return saved;
    } catch (e) {
      console.error("Failed to parse sidebar_open_sections from appDB", e);
    }
    return {
      Masters: true,
      Rates: true,
      Operations: true,
      Bills: true,
      Accounts: true,
      Reports: true,
      Uploads: true,
    };
  });

  // Automatically open the dropdown section containing current active path
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.isHeader && item.children) {
        const isChildActive = item.children.some(
          (child) => location.pathname === child.path || (child.path !== '/' && location.pathname.startsWith(child.path))
        );
        if (isChildActive) {
          setOpenSections((prev) => {
            if (!prev[item.name]) {
              const updated = { ...prev, [item.name]: true };
              appDB.set("sidebar_open_sections", updated);
              return updated;
            }
            return prev;
          });
        }
      }
    });
  }, [location.pathname]);

  // Listen for Expand All / Collapse All custom events from Settings page
  useEffect(() => {
    const handleExpandAll = () => {
      const allOpen = {};
      menuItems.forEach((item) => {
        if (item.isHeader) allOpen[item.name] = true;
      });
      setOpenSections(allOpen);
      appDB.set("sidebar_open_sections", allOpen);
    };

    const handleCollapseAll = () => {
      const allClosed = {};
      menuItems.forEach((item) => {
        if (item.isHeader) allClosed[item.name] = false;
      });
      setOpenSections(allClosed);
      appDB.set("sidebar_open_sections", allClosed);
    };

    window.addEventListener("sidebar-expand-all", handleExpandAll);
    window.addEventListener("sidebar-collapse-all", handleCollapseAll);
    return () => {
      window.removeEventListener("sidebar-expand-all", handleExpandAll);
      window.removeEventListener("sidebar-collapse-all", handleCollapseAll);
    };
  }, []);

  const toggleSection = (sectionName) => {
    setOpenSections((prev) => {
      const updated = { ...prev, [sectionName]: !prev[sectionName] };
      appDB.set("sidebar_open_sections", updated);
      return updated;
    });
  };

  const handleLinkClick = () => {
    setHoveredPopover(null);
    if (window.innerWidth <= 1024) {
      if (setIsSidebarOpen) setIsSidebarOpen(false);
      setIsHovered(false);
    }
  };

  const visibleItems = getVisibleMenuItems(hasPermission, globalSettings, user);
  const accordionEnabled = globalSettings?.ui?.accordionSidebar !== false;

  return (
    <div 
      className={`sidebar ${isExpanded ? 'open' : 'closed'} ${effectiveIsMobile ? (isOpen ? 'mobile-open' : 'mobile-closed') : ''}`}
      onMouseEnter={() => !effectiveIsMobile && setIsHovered(true)}
      onMouseLeave={() => {
        if (!effectiveIsMobile) {
          setIsHovered(false);
          setHoveredPopover(null);
        }
      }}
      style={{ overflowX: 'visible' }}
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
        {/* Search Bar */}
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

        {/* Menu Items */}
        {visibleItems.map((item, index) => {
          if (item.isHeader) {
            const isSectionOpen = accordionEnabled ? !!openSections[item.name] : true;
            const hasActiveChild = item.children.some(
              (child) => location.pathname === child.path || (child.path !== '/' && location.pathname.startsWith(child.path))
            );

            return (
              <div 
                key={index} 
                style={{ marginTop: "0.5rem", marginBottom: "0.25rem", position: "relative" }}
                onMouseEnter={() => !isExpanded && setHoveredPopover(item.name)}
                onMouseLeave={() => !isExpanded && setHoveredPopover(null)}
              >
                {isExpanded ? (
                  /* Expanded Header Button */
                  <button
                    type="button"
                    onClick={() => accordionEnabled && toggleSection(item.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      background: hasActiveChild && !isSectionOpen ? "rgba(255, 153, 0, 0.08)" : "transparent",
                      border: "none",
                      borderRadius: "6px",
                      color: hasActiveChild ? "var(--primary-color)" : "var(--text-muted)",
                      cursor: accordionEnabled ? "pointer" : "default",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      transition: "all 0.2s ease",
                      userSelect: "none"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {item.icon && <span style={{ opacity: 0.85 }}>{item.icon}</span>}
                      <span>{item.name}</span>
                    </div>
                    {accordionEnabled && (
                      <span style={{ display: "flex", alignItems: "center" }}>
                        {isSectionOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                    )}
                  </button>
                ) : (
                  /* Collapsed Icon View */
                  <div
                    title={item.name}
                    onClick={() => accordionEnabled && toggleSection(item.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0.6rem 0",
                      color: hasActiveChild ? "var(--primary-color)" : "var(--text-muted)",
                      cursor: "pointer",
                      borderRadius: "4px"
                    }}
                  >
                    {item.icon || <Layers size={18} />}
                  </div>
                )}

                {/* Sub-item Links & Icons: Displayed when Dropdown is OPEN (both expanded & collapsed rail) */}
                {isSectionOpen && (
                  <div style={{ paddingLeft: isExpanded ? "0.5rem" : "0", marginTop: "0.15rem" }}>
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
                          gap: isExpanded ? "0.75rem" : "0",
                          padding: isExpanded ? "0.6rem 0.85rem" : "0.6rem 0",
                          borderRadius: "4px",
                          textDecoration: "none",
                          color: isActive
                            ? "var(--primary-color)"
                            : "var(--text-muted)",
                          background: isActive
                            ? "rgba(255, 153, 0, 0.12)"
                            : "transparent",
                          borderLeft: isActive && isExpanded ? "3px solid var(--primary-color)" : (isActive && !isExpanded ? "3px solid var(--primary-color)" : "3px solid transparent"),
                          fontWeight: isActive ? "600" : "500",
                          fontSize: "0.88rem",
                          transition: "var(--transition)",
                          marginBottom: "0.2rem",
                        })}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', flexShrink: 0 }}>
                          {child.icon}
                        </div>
                        {isExpanded && <span style={{ whiteSpace: "nowrap" }}>{child.name}</span>}
                      </NavLink>
                    ))}
                  </div>
                )}

                {/* Floating Popover Sub-items with Icons when Collapsed */}
                {!isExpanded && hoveredPopover === item.name && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "65px",
                      width: "220px",
                      backgroundColor: "var(--panel-solid-bg)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                      padding: "0.5rem",
                      zIndex: 1000,
                      animation: "fadeInRight 0.15s ease-out forwards"
                    }}
                  >
                    <style>
                      {`
                        @keyframes fadeInRight {
                          from { opacity: 0; transform: translateX(-5px); }
                          to { opacity: 1; transform: translateX(0); }
                        }
                      `}
                    </style>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", padding: "0.4rem 0.6rem 0.5rem 0.6rem", borderBottom: "1px solid var(--border-color)", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {item.icon} {item.name}
                    </div>
                    {item.children.map((child, cIndex) => (
                      <NavLink
                        key={cIndex}
                        to={child.path}
                        onClick={handleLinkClick}
                        style={({ isActive }) => ({
                          display: "flex",
                          alignItems: "center",
                          gap: "0.65rem",
                          padding: "0.55rem 0.65rem",
                          borderRadius: "4px",
                          textDecoration: "none",
                          color: isActive ? "var(--primary-color)" : "var(--text-dark)",
                          background: isActive ? "rgba(255, 153, 0, 0.12)" : "transparent",
                          fontWeight: isActive ? "600" : "500",
                          fontSize: "0.85rem",
                          marginBottom: "0.2rem",
                        })}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '18px' }}>
                          {child.icon}
                        </div>
                        <span>{child.name}</span>
                  {child.moduleKey && unreadCounts?.[child.moduleKey] > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {unreadCounts[child.moduleKey]}
                    </span>
                  )}
                      </NavLink>
                    ))}
                  </div>
                )}
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

      {/* Logout Button */}
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
