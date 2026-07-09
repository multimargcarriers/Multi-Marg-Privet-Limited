import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
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
  TrendingUp
} from "lucide-react";

const Sidebar = ({ isOpen, setIsSidebarOpen }) => {
  const { hasPermission, logout, user } = useContext(AuthContext);

  const handleLinkClick = () => {
    if (window.innerWidth <= 768 && setIsSidebarOpen) {
      setIsSidebarOpen(false);
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
      name: "System Logs",
      path: "/logs",
      icon: <Activity size={20} />,
      permission: "superadmin"
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
  ];

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
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
        {menuItems
          .filter(item => !item.permission || hasPermission(item.permission))
          .map((item, index) => {
          if (item.isHeader) {
            return (
              <div key={index} style={{ marginTop: "1rem" }}>
                {isOpen && (
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
                    title={!isOpen ? child.name : ""}
                    onClick={handleLinkClick}
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      justifyContent: isOpen ? "flex-start" : "center",
                      gap: isOpen ? "1rem" : "0",
                      padding: isOpen ? "0.75rem 1rem" : "0.75rem 0",
                      borderRadius: "4px",
                      textDecoration: "none",
                      color: isActive
                        ? "var(--primary-color)"
                        : "var(--text-muted)",
                      background: isActive
                        ? "rgba(255, 153, 0, 0.1)"
                        : "transparent",
                      borderLeft: isActive && isOpen ? "3px solid var(--primary-color)" : (isActive && !isOpen ? "3px solid var(--primary-color)" : "3px solid transparent"),
                      fontWeight: isActive ? "600" : "500",
                      transition: "var(--transition)",
                      marginBottom: "0.25rem",
                    })}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '24px', flexShrink: 0 }}>
                      {child.icon}
                    </div>
                    {isOpen && <span style={{ whiteSpace: "nowrap" }}>{child.name}</span>}
                  </NavLink>
                ))}
              </div>
            );
          }
          return (
            <NavLink
              key={index}
              to={item.path}
              title={!isOpen ? item.name : ""}
              onClick={handleLinkClick}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                justifyContent: isOpen ? "flex-start" : "center",
                gap: isOpen ? "1rem" : "0",
                padding: isOpen ? "0.75rem 1rem" : "0.75rem 0",
                borderRadius: "4px",
                textDecoration: "none",
                color: isActive ? "var(--primary-color)" : "var(--text-muted)",
                background: isActive
                  ? "rgba(255, 153, 0, 0.1)"
                  : "transparent",
                borderLeft: isActive && isOpen ? "3px solid var(--primary-color)" : (isActive && !isOpen ? "3px solid var(--primary-color)" : "3px solid transparent"),
                fontWeight: isActive ? "600" : "500",
                transition: "var(--transition)",
                marginBottom: "0.25rem",
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '24px', flexShrink: 0 }}>
                {item.icon}
              </div>
              {isOpen && <span style={{ whiteSpace: "nowrap" }}>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
        <button
          onClick={logout}
          title={!isOpen ? "Log Out" : ""}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isOpen ? "flex-start" : "center",
            gap: isOpen ? "1rem" : "0",
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
          {isOpen && <span style={{ whiteSpace: "nowrap" }}>Log Out</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
