import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Shield, Edit2, Trash2, Users, Lock, ChevronDown, ChevronRight, History, KeyRound, Eye, EyeOff, X, ShieldCheck } from 'lucide-react';
import { } from '../components/SkeletonLoader';
import Table from '../components/Table';
import { useDialog } from '../context/DialogContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from "framer-motion";

const PERMISSIONS_TREE = [
  { id: 'dashboard', name: 'Dashboard', isPage: true },
  { id: 'mail', name: 'Multimarg Mailbox (Hostinger Business Mail)', isPage: true },
  { id: 'logs', name: 'Activity Logs', isPage: true },
  {
    id: 'masters',
    name: 'Masters Section',
    pages: [
      { id: 'clients', name: 'Clients' },
      { id: 'clients_data', name: 'Clients (Data Access Only)' },
      { id: 'branches', name: 'Branches' },
      { id: 'branches_data', name: 'Branches (Data Access Only)' },
      { id: 'cities', name: 'Cities' },
      { id: 'cities_data', name: 'Cities (Data Access Only)' },
      { id: 'vendors', name: 'Vendors' },
      { id: 'vendors_data', name: 'Vendors (Data Access Only)' }
    ]
  },
  {
    id: 'rates',
    name: 'Rates Section',
    pages: [
      { id: 'client_rates', name: 'Client Rates' },
      { id: 'client_rates_data', name: 'Client Rates (Data Access Only)' }
    ]
  },
  {
    id: 'operations',
    name: 'Operations Section',
    pages: [
      { id: 'bookings', name: 'Bookings (View)' },
      { id: 'create_booking', name: 'Create Booking' },
      { id: 'trips', name: 'Vendor Ship MIS' },
      { id: 'tripmis', name: 'Vehicle Trip MIS' },
      { id: 'vendormis', name: 'Vendor Vehicle MIS' },
      { id: 'track_shipment', name: 'Track Shipment (View)' },
      { id: 'update_tracking', name: 'Update Tracking (Add Status)' },
      { id: 'pod', name: 'POD Upload' }
    ]
  },
  {
    id: 'billing',
    name: 'Billing Section',
    pages: [
      { id: 'all_bills', name: 'All Bills' },
      { id: 'generate_bills', name: 'Generate Bills' },
      { id: 'misc_bill', name: 'Misc Bill' },
      { id: 'update_bill', name: 'Update Bill' }
    ]
  },
  {
    id: 'accounts',
    name: 'Accounts Section',
    pages: [
      { id: 'cash_sheet', name: 'Cash Sheet' },
      { id: 'purchases', name: 'Purchases' }
    ]
  },
  {
    id: 'reports',
    name: 'Reports Section',
    pages: [
      { id: 'analytics', name: 'Deep Analytics' },
      { id: 'gst_reports', name: 'GSTR Reports' },
      { id: 'mis_reports', name: 'MIS Reports' },
      { id: 'unbilled_reports', name: 'Unbilled Reports' },
      { id: 'sales_reports', name: 'Sales Reports' },
      { id: 'purchase_reports', name: 'Purchase Reports' },
      { id: 'cashsheet_reports', name: 'Cashsheet Reports' },
      { id: 'client_trip_reports', name: 'Client Trip Reports' }
    ]
  },
  {
    id: 'uploads',
    name: 'Uploads Section',
    pages: [
      { id: 'upload_box', name: 'Upload Box' },
      { id: 'upload_vouchers', name: 'Upload Vouchers' }
    ]
  },
  { id: 'profile_only', name: 'Profile Only (No other access)', isPage: true }
];

const IAM = () => {
  const { token, user: currentUser, updateUser } = useContext(AuthContext);
  const { confirm } = useDialog();
  const { addToast } = useToast();
  const isSuperAdmin = currentUser?.role === 'SuperAdmin' || currentUser?.email === 'admin@multimarg.com';
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientsList, setClientsList] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [isCustomName, setIsCustomName] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'Admin',
    permissions: [],
    employeeId: ''
  });

  // Direct Super Admin Change Password Modal
  const [passModal, setPassModal] = useState({
    isOpen: false,
    user: null,
    newPassword: '',
    confirmPassword: '',
    showPass: false,
    loading: false
  });

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passModal.newPassword || passModal.newPassword.trim().length < 4) {
      addToast('Password must be at least 4 characters long', 'error');
      return;
    }
    if (passModal.newPassword !== passModal.confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }

    setPassModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/${passModal.user.id}/change-password`,
        { newPassword: passModal.newPassword.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      addToast(res.data?.message || 'Password changed successfully', 'success');
      setPassModal({ isOpen: false, user: null, newPassword: '', confirmPassword: '', showPass: false, loading: false });
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'Failed to change password', 'error');
      setPassModal(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchClientsAndVendors();
  }, []);

  const fetchClientsAndVendors = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const cRes = await axios.get(`${apiUrl}/api/clients`, { headers: { Authorization: `Bearer ${token}` } });
      if (cRes.data.success) setClientsList(cRes.data.data || []);
      const vRes = await axios.get(`${apiUrl}/api/vendors`, { headers: { Authorization: `Bearer ${token}` } });
      if (vRes.data.success) setVendorsList(vRes.data.data || []);
    } catch (err) {
      console.error("Error fetching clients/vendors in IAM:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setUsers(res.data.data || []);
    } catch (err) {
      console.error(err);
      addToast('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (moduleId) => {
    setFormData(prev => {
      const perms = prev.permissions.includes(moduleId)
        ? prev.permissions.filter(p => p !== moduleId)
        : [...prev.permissions, moduleId];
      return { ...prev, permissions: perms };
    });
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsAdding(false);
    const tempId = "temp-" + Date.now();
    try {
      if (formData.id) {
        setUsers(prev => prev.map(u => u.id === formData.id ? { ...u, ...formData } : u));
        const res = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/${formData.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (currentUser.id === formData.id && res.data.success) {
          updateUser(res.data.data);
        }
        addToast("User updated successfully!", "success");
      } else {
        setUsers(prev => [{ ...formData, id: tempId }, ...prev]);
        const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success && res.data.data) {
          setUsers(prev => prev.map(u => u.id === tempId ? res.data.data : u));
          addToast("User created successfully!", "success");
        } else {
          fetchUsers();
          addToast("Failed to create user", "error");
        }
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Error saving user', 'error');
      fetchUsers();
    }
  };

  const handleClearHistory = async (id) => {
    const isConfirmed = await confirm({
      title: "Clear Login History",
      message: "Are you sure you want to delete all login history for this employee?",
      confirmText: "Clear History",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/activity/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      addToast("Login history cleared successfully!", "success");
    } catch (err) {
      addToast(err.response?.data?.message || 'Error clearing history', 'error');
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete User",
      message: "Are you sure you want to delete this user? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    setUsers(prev => prev.filter(u => u.id !== id));
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      addToast("User deleted successfully!", "success");
    } catch (_err) {
      addToast('Error deleting user', 'error');
      fetchUsers();
    }
  };

  const openModal = (user = null) => {
    if (user) {
      setFormData({
        employeeId: '',
        bloodGroup: '',
        phone: '',
        phoneNumber: '',
        designation: '',
        ...user,
        phone: user.phone || user.phoneNumber || '',
        designation: user.designation || '',
        username: (user.username || '').toLowerCase(),
        password: ''
      });
      if ((user.role === 'Client' || user.role === 'Vendor') && user.name) {
        const inList = user.role === 'Client' 
          ? clientsList.some(c => (c.name || c.clientName) === user.name)
          : vendorsList.some(v => (v.name || v.vendorName) === user.name);
        setIsCustomName(!inList);
      } else {
        setIsCustomName(false);
      }
    } else {
      setFormData({
        id: '',
        name: '',
        username: '',
        email: '',
        phone: '',
        phoneNumber: '',
        designation: '',
        password: '',
        role: 'Admin',
        permissions: [],
        employeeId: `MCPL-${Math.floor(1000 + Math.random() * 9000)}`,
        bloodGroup: ''
      });
      setIsCustomName(false);
    }
    // Expand all sections by default when opening modal
    const expanded = {};
    PERMISSIONS_TREE.forEach(node => { if (!node.isPage) expanded[node.id] = true; });
    setExpandedSections(expanded);
    setIsAdding(true);
  };

  return (
    <div className="iam-page">
      <style>{`
        .iam-page {
          background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 50%, #ede9fe 100%);
          min-height: 100vh;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .iam-header-icon {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          padding: 10px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .iam-title {
          font-size: 1.8rem;
          color: #1e293b;
          margin: 0;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .iam-subtitle {
          color: #64748b;
          margin: 6px 0 0 0;
          font-size: 0.9rem;
          padding-left: 54px;
        }
        .iam-add-btn {
          background: linear-gradient(135deg, #6366F1, #4F46E5);
          border: none;
          color: white;
          padding: 0.65rem 1.5rem;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(99,102,241,0.35);
          font-size: 0.9rem;
          white-space: nowrap;
        }
        .iam-add-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99,102,241,0.45);
        }
        .iam-form-card {
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          border: 1px solid rgba(255,255,255,0.85);
        }
        .iam-form-title {
          margin: 0 0 1.5rem 0;
          font-size: 1.2rem;
          color: #0f172a;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .iam-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .iam-form-field label {
          display: block;
          font-size: 0.82rem;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 0.4rem;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .iam-form-field label span { color: #ef4444; }
        .iam-input {
          width: 100%;
          padding: 0.7rem 0.85rem;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          color: #0f172a;
          background: white;
          outline: none;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          font-size: 0.9rem;
          box-sizing: border-box;
        }
        .iam-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }
        .iam-perms-section {
          grid-column: 1 / -1;
        }
        .iam-perms-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-top: 0.75rem;
          background: rgba(248,250,252,0.8);
          padding: 1.25rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        .iam-perm-group {
          background: white;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          transition: box-shadow 0.2s;
        }
        .iam-perm-group:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .iam-perm-header {
          display: flex;
          align-items: center;
          padding: 0.65rem 0.85rem;
          cursor: pointer;
          gap: 8px;
          background: #fafbfc;
          border-bottom: 1px solid #f1f5f9;
          user-select: none;
        }
        .iam-perm-header:hover {
          background: #f1f5f9;
        }
        .iam-perm-header-label {
          font-size: 0.88rem;
          color: #1e293b;
          font-weight: 600;
          flex: 1;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .iam-perm-children {
          padding: 0.5rem 0.75rem 0.5rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .iam-perm-child {
          display: flex;
          align-items: center;
          font-size: 0.82rem;
          color: #475569;
          cursor: pointer;
          padding: 0.2rem 0;
        }
        .iam-perm-child.disabled {
          color: #94a3b8;
          cursor: not-allowed;
        }
        .iam-perm-standalone {
          background: white;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          padding: 0.65rem 0.85rem;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: box-shadow 0.2s;
        }
        .iam-perm-standalone:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .iam-checkbox {
          width: 16px;
          height: 16px;
          accent-color: #4F46E5;
          flex-shrink: 0;
          cursor: pointer;
        }
        .iam-checkbox-sm {
          width: 14px;
          height: 14px;
          accent-color: #4F46E5;
          flex-shrink: 0;
        }
        .iam-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1.25rem;
          border-top: 1px solid #e2e8f0;
        }
        .iam-btn-cancel {
          background: transparent;
          color: #64748b;
          border: 1.5px solid #cbd5e1;
          padding: 0.6rem 1.5rem;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9rem;
        }
        .iam-btn-cancel:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .iam-btn-save {
          background: linear-gradient(135deg, #6366F1, #4F46E5);
          color: white;
          border: none;
          padding: 0.6rem 2rem;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(99,102,241,0.35);
          font-size: 0.9rem;
        }
        .iam-btn-save:hover {
          opacity: 0.92;
          transform: translateY(-1px);
        }
        .iam-table-wrap {
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.85);
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          overflow: hidden;
        }
        .iam-role-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          white-space: nowrap;
        }
        .iam-role-super {
          background: linear-gradient(135deg, #eef2ff, #e0e7ff);
          color: #4F46E5;
          border: 1px solid #c7d2fe;
        }
        .iam-role-default {
          background: #f8fafc;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }
        .iam-action-btn {
          padding: 6px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.15s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .iam-action-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .iam-action-btn.delete {
          color: #ef4444;
        }
        .iam-action-btn.delete:hover {
          background: #fef2f2;
          border-color: #fecaca;
        }
        .iam-name-toggle {
          background: transparent;
          border: none;
          color: #4F46E5;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        /* ---- TABLET ---- */
        @media (max-width: 1024px) {
          .iam-perms-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* ---- MOBILE ---- */
        @media (max-width: 768px) {
          .iam-page {
            padding: 1rem;
            gap: 1rem;
          }
          .iam-title {
            font-size: 1.25rem;
          }
          .iam-subtitle {
            padding-left: 0;
            font-size: 0.82rem;
          }
          .iam-form-card {
            padding: 1.25rem;
            border-radius: 12px;
          }
          .iam-form-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          .iam-perms-grid {
            grid-template-columns: 1fr;
            padding: 0.75rem;
          }
          .iam-form-actions {
            flex-direction: column;
          }
          .iam-btn-cancel, .iam-btn-save {
            width: 100%;
            text-align: center;
            justify-content: center;
          }
          .iam-table-wrap {
            border-radius: 12px;
          }
        }

        @media (max-width: 480px) {
          .iam-page {
            padding: 0.75rem;
          }
          .iam-header-icon {
            padding: 7px;
            border-radius: 8px;
          }
          .iam-header-icon svg {
            width: 16px;
            height: 16px;
          }
          .iam-title {
            font-size: 1.1rem;
            gap: 8px;
          }
          .iam-form-card {
            padding: 1rem;
          }
        }
      `}</style>

      {/* Title & Add Button */}
      <div className="header-flex">
        <div>
          <h3 className="iam-title">
            <div className="iam-header-icon">
              <Shield size={20} color="#fff" />
            </div>
            Identity & Access Management
          </h3>
          <p className="iam-subtitle">Manage user accounts, roles, and module-level permissions.</p>
        </div>
        <div className="page-header-actions">
          {!isAdding && (
            <button onClick={() => openModal()} className="iam-add-btn">
              + Add User
            </button>
          )}
        </div>
      </div>

      {/* Form Section */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="iam-form-card">
              <h4 className="iam-form-title">
                <Users size={18} color="#4F46E5" />
                {formData.id ? 'Edit User' : 'Create New User'}
              </h4>
              <form onSubmit={handleSubmit}>
                <div className="iam-form-grid">
                  <div className="iam-form-field">
                    <label>Role<span>*</span></label>
                    <select 
                      value={formData.role} 
                      onChange={e => {
                        const newRole = e.target.value;
                        setFormData({...formData, role: newRole, name: (newRole === 'Client' || newRole === 'Vendor') ? '' : formData.name});
                        setIsCustomName(false);
                      }}
                      className="iam-input"
                    >
                      <option value="Vendor">Vendor</option>
                      <option value="Client">Client</option>
                      <option value="Employee">Employee</option>
                      <option value="Admin">Admin</option>
                      <option value="SuperAdmin">Super Admin</option>
                    </select>
                  </div>
                  <div className="iam-form-field">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <label style={{ margin: 0 }}>
                        {formData.role === 'Client' ? 'Client Account' : formData.role === 'Vendor' ? 'Vendor Account' : 'Name'}<span>*</span>
                      </label>
                      {(formData.role === 'Client' || formData.role === 'Vendor') && (
                        <button type="button" onClick={() => { setIsCustomName(!isCustomName); setFormData({ ...formData, name: '' }); }} className="iam-name-toggle">
                          {isCustomName ? "← Select from List" : "+ Enter Manual Name"}
                        </button>
                      )}
                    </div>
                    {(formData.role === 'Client' || formData.role === 'Vendor') && !isCustomName ? (
                      <select 
                        value={formData.name || ''} 
                        onChange={e => {
                          if (e.target.value === "__CUSTOM__") {
                            setIsCustomName(true);
                            setFormData({ ...formData, name: '' });
                          } else {
                            setFormData({...formData, name: e.target.value});
                          }
                        }} 
                        required 
                        className="iam-input"
                      >
                        <option value="">-- Select {formData.role} Name --</option>
                        {formData.role === 'Client' ? (
                          clientsList.map((cl, i) => (
                            <option key={cl.id || i} value={cl.name || cl.clientName}>
                              {cl.name || cl.clientName} {cl.gst ? `(${cl.gst})` : ''}
                            </option>
                          ))
                        ) : (
                          vendorsList.map((v, i) => (
                            <option key={v.id || i} value={v.name || v.vendorName}>
                              {v.name || v.vendorName}
                            </option>
                          ))
                        )}
                        <option value="__CUSTOM__" style={{ fontWeight: "700", color: "#4F46E5" }}>+ Enter Manual Name...</option>
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        required 
                        placeholder={isCustomName ? `Enter ${formData.role} name manually...` : "Enter Name..."}
                        className="iam-input"
                      />
                    )}
                  </div>
                  <div className="iam-form-field">
                    <label>Employee ID<span>*</span></label>
                    <input 
                      type="text" 
                      value={formData.employeeId || ''} 
                      onChange={e => setFormData({...formData, employeeId: e.target.value.toUpperCase()})} 
                      required 
                      className="iam-input"
                      style={{ fontWeight: "600" }}
                      placeholder="MCPL-1234"
                    />
                  </div>
                  <div className="iam-form-field">
                    <label>Designation <span>(Optional)</span></label>
                    <input 
                      type="text" 
                      value={formData.designation || ''} 
                      onChange={e => setFormData({...formData, designation: e.target.value})} 
                      className="iam-input"
                      placeholder="e.g. Accounts Head, Logistics Manager"
                    />
                  </div>
                  <div className="iam-form-field">
                    <label>Phone Number <span>(Optional)</span></label>
                    <input 
                      type="tel" 
                      value={formData.phone || formData.phoneNumber || ''} 
                      onChange={e => setFormData({...formData, phone: e.target.value, phoneNumber: e.target.value})} 
                      className="iam-input"
                      placeholder="e.g. +91 98765 43210"
                    />
                  </div>
                  <div className="iam-form-field">
                    <label>Blood Group</label>
                    <select
                      value={formData.bloodGroup || ''}
                      onChange={e => setFormData({...formData, bloodGroup: e.target.value})}
                      className="iam-input"
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div className="iam-form-field">
                    <label>Username <span>(Optional)</span></label>
                    <input 
                      type="text" 
                      value={formData.username || ''} 
                      onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '')})} 
                      className="iam-input"
                      placeholder="e.g. john_doe"
                    />
                  </div>
                  <div className="iam-form-field">
                    <label>Email<span>*</span></label>
                    <input 
                      type="email" 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                      required 
                      className="iam-input"
                    />
                  </div>
                  {!formData.id && (
                    <div className="iam-form-field">
                      <label>Password<span>*</span></label>
                      <input 
                        type="password" 
                        value={formData.password} 
                        onChange={e => setFormData({...formData, password: e.target.value})} 
                        required={!formData.id} 
                        className="iam-input"
                      />
                    </div>
                  )}
                  
                  {formData.role !== 'SuperAdmin' && (
                    <div className="iam-perms-section">
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                        <Lock size={14} /> Module & Page Permissions
                      </label>
                      <div className="iam-perms-grid">
                        {PERMISSIONS_TREE.map(node => {
                          if (node.isPage) {
                            return (
                              <div key={node.id} className="iam-perm-standalone" onClick={() => handleTogglePermission(node.id)}>
                                <input 
                                  type="checkbox" 
                                  checked={formData.permissions.includes(node.id) || formData.permissions.includes('all')}
                                  onChange={() => handleTogglePermission(node.id)}
                                  className="iam-checkbox-sm"
                                  style={{ marginRight: '8px', accentColor: '#4F46E5' }}
                                />
                                <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: '600' }}>{node.name}</span>
                              </div>
                            );
                          }
                          
                          return (
                            <div key={node.id} className="iam-perm-group">
                              <div className="iam-perm-header" onClick={() => toggleSection(node.id)}>
                                {expandedSections[node.id] !== false ? <ChevronDown size={16} color="#64748b" /> : <ChevronRight size={16} color="#64748b" />}
                                <input 
                                  type="checkbox" 
                                  checked={formData.permissions.includes(node.id) || formData.permissions.includes('all')}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleTogglePermission(node.id);
                                  }}
                                  className="iam-checkbox-sm"
                                  style={{ accentColor: '#4F46E5', marginRight: '8px' }}
                                />
                                <span className="iam-perm-header-label">
                                  {node.name}
                                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '400', marginLeft: '4px' }}>({node.pages.length})</span>
                                </span>
                              </div>
                              {expandedSections[node.id] !== false && node.pages && (
                                <div className="iam-perm-children">
                                  {node.pages.map(page => {
                                    const isChecked = formData.permissions.includes(page.id) || formData.permissions.includes(node.id) || formData.permissions.includes('all');
                                    const isDisabled = formData.permissions.includes(node.id) || formData.permissions.includes('all');
                                    
                                    return (
                                      <label key={page.id} className={`iam-perm-child ${isDisabled ? 'disabled' : ''}`}>
                                        <input 
                                          type="checkbox" 
                                          checked={isChecked}
                                          disabled={isDisabled}
                                          onChange={() => {
                                            if (!isDisabled) handleTogglePermission(page.id);
                                          }}
                                          className="iam-checkbox-sm"
                                          style={{ marginRight: '8px', accentColor: isDisabled ? '#94a3b8' : '#4F46E5' }}
                                        />
                                        {page.name}
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="iam-form-actions">
                  <button type="button" onClick={() => setIsAdding(false)} className="iam-btn-cancel">
                    Cancel
                  </button>
                  <button type="submit" className="iam-btn-save">
                    {formData.id ? "Save Changes" : "Save User"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users Table */}
      <div className="iam-table-wrap">
        <Table
          loading={loading}
          headers={['Name & Designation', 'Username', 'Employee ID', 'Phone Number', 'Email', 'Role', 'Permissions', 'Actions']}
          data={users}
          renderRow={(u, index) => (
            <tr key={u.id || index}>
              <td>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.name}</div>
                {u.designation && (
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{u.designation}</div>
                )}
              </td>
              <td style={{ color: '#64748b' }}>{u.username ? `@${u.username.toLowerCase()}` : <span style={{opacity: 0.5}}>-</span>}</td>
              <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: '#4F46E5' }}>{u.employeeId || 'N/A'}</td>
              <td style={{ whiteSpace: 'nowrap', color: '#0f172a', fontWeight: 500 }}>
                {u.phone || u.phoneNumber || <span style={{ opacity: 0.4 }}>Not set</span>}
              </td>
              <td>{u.email}</td>
              <td>
                <span className={`iam-role-badge ${u.role === 'SuperAdmin' ? 'iam-role-super' : 'iam-role-default'}`}>
                  {u.role === 'SuperAdmin' && <Shield size={12} />}
                  {u.role}
                </span>
              </td>
              <td style={{ fontSize: '0.85rem' }}>
                {u.permissions.includes('all') ? 'Full Access' : u.permissions.join(', ') || 'None'}
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="iam-action-btn" onClick={() => openModal(u)} title="Edit"><Edit2 size={14} /></button>
                {' '}
                {isSuperAdmin && (
                  <>
                    <button className="iam-action-btn" style={{ color: '#0284c7' }} onClick={() => setPassModal({ isOpen: true, user: u, newPassword: '', confirmPassword: '', showPass: false, loading: false })} title="Change Password Directly">
                      <KeyRound size={14} />
                    </button>
                    {' '}
                  </>
                )}
                {isSuperAdmin && u.id !== currentUser.id && (
                  <>
                    <button className="iam-action-btn" style={{ color: '#0078D4' }} onClick={() => handleClearHistory(u.id)} title="Clear Login History"><History size={14} /></button>
                    {' '}
                    <button className="iam-action-btn delete" onClick={() => handleDelete(u.id)} title="Delete"><Trash2 size={14} /></button>
                  </>
                )}
              </td>
            </tr>
          )}
        />
      </div>

      {/* SUPER ADMIN DIRECT PASSWORD CHANGE MODAL */}
      {passModal.isOpen && passModal.user && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            boxSizing: 'border-box',
            zIndex: 99999999
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0'
            }}
          >
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', padding: '1.25rem 1.5rem', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>
                  <KeyRound size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Change Password</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', opacity: 0.9 }}>Super Admin Direct Password Override</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPassModal({ isOpen: false, user: null, newPassword: '', confirmPassword: '', showPass: false, loading: false })}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSavePassword} style={{ padding: '1.5rem' }}>
              {/* User Summary Card */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                  {passModal.user.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '3px' }}>
                  <span>Role: <b style={{ color: '#0284c7' }}>{passModal.user.role}</b></span>
                  <span>•</span>
                  <span>ID: <b style={{ color: '#475569' }}>{passModal.user.employeeId || 'N/A'}</b></span>
                  <span>•</span>
                  <span>{passModal.user.email}</span>
                </div>
              </div>

              {/* Notice */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.65rem 0.85rem', marginBottom: '1.25rem', fontSize: '0.78rem', color: '#166534', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <ShieldCheck size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>No OTP or old password required. You can directly set and save a new password.</span>
              </div>

              {/* New Password Input */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  New Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={passModal.showPass ? 'text' : 'password'}
                    value={passModal.newPassword}
                    onChange={(e) => setPassModal(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password (min 4 characters)"
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.65rem 2.5rem 0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      background: '#f8fafc'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setPassModal(prev => ({ ...prev, showPass: !prev.showPass }))}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    {passModal.showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type={passModal.showPass ? 'text' : 'password'}
                  value={passModal.confirmPassword}
                  onChange={(e) => setPassModal(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Re-enter new password"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    outline: 'none',
                    background: '#f8fafc'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setPassModal({ isOpen: false, user: null, newPassword: '', confirmPassword: '', showPass: false, loading: false })}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.55rem 1.2rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passModal.loading}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.55rem 1.5rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: passModal.loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {passModal.loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default IAM;
