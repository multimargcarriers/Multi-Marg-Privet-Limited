import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Shield, Plus, Edit2, Trash2 } from 'lucide-react';
import { TablePageSkeleton } from '../components/SkeletonLoader';
import Table from '../components/Table';
import { useDialog } from '../context/DialogContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from "framer-motion";

const PERMISSIONS_TREE = [
  { id: 'dashboard', name: 'Dashboard', isPage: true },
  { id: 'logs', name: 'Activity Logs', isPage: true },
  {
    id: 'masters',
    name: 'Masters Section',
    pages: [
      { id: 'clients', name: 'Clients' },
      { id: 'branches', name: 'Branches' },
      { id: 'cities', name: 'Cities' },
      { id: 'vendors', name: 'Vendors' }
    ]
  },
  {
    id: 'rates',
    name: 'Rates Section',
    pages: [
      { id: 'client_rates', name: 'Client Rates' }
    ]
  },
  {
    id: 'operations',
    name: 'Operations Section',
    pages: [
      { id: 'bookings', name: 'Bookings (LR)' },
      { id: 'create_booking', name: 'Create Booking' },
      { id: 'trips', name: 'Trips' },
      { id: 'tracking', name: 'Tracking' },
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
  const isSuperAdmin = currentUser?.role === 'SuperAdmin' || currentUser?.email === 'admin@multimargcarriers.co.in';
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    id: '', name: '', email: '', password: '', role: 'Admin', permissions: [], employeeId: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

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
    } catch (err) {
      addToast('Error deleting user', 'error');
      fetchUsers();
    }
  };

  const openModal = (user = null) => {
    if (user) {
      setFormData({ employeeId: '', ...user, password: '' });
    } else {
      setFormData({ id: '', name: '', email: '', password: '', role: 'Admin', permissions: [], employeeId: `MMPL-${Math.floor(1000 + Math.random() * 9000)}` });
    }
    setIsAdding(true);
  };

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "20px" }}>
      {/* Title & Add Button */}
      <div className="header-flex">
        <div>
          <h3 style={{ fontSize: "1.6rem", color: "#1e293b", margin: 0, fontWeight: "600", display: 'flex', alignItems: 'center' }}>
            <Shield size={24} style={{ marginRight: '10px', color: '#4F46E5' }} /> Identity & Access Management
          </h3>
          <p style={{ color: "#64748b", margin: "5px 0 0 34px", fontSize: "0.9rem" }}>Manage administrators and module permissions.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => openModal()}
            style={{ backgroundColor: "#4F46E5", color: "white", border: "none", padding: "0.6rem 1.2rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)" }}
          >
            + Add Admin
          </button>
        )}
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
            <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", marginBottom: "2rem", border: "1px solid #e2e8f0" }}>
              <h4 style={{ margin: "0 0 1.5rem 0", fontSize: "1.2rem", color: "#0f172a" }}>{formData.id ? 'Edit User' : 'Create New User'}</h4>
              <form onSubmit={handleSubmit}>
                <div className="grid-2-col">
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Name<span style={{ color: "#ef4444" }}>*</span></label>
                    <input 
                      type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      required 
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                      onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                      onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Employee ID<span style={{ color: "#ef4444" }}>*</span></label>
                    <input 
                      type="text" 
                      value={formData.employeeId || ''} 
                      onChange={e => setFormData({...formData, employeeId: e.target.value.toUpperCase()})} 
                      required 
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)", fontWeight: "600" }}
                      onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                      onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                      placeholder="MMPL-1234"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Email<span style={{ color: "#ef4444" }}>*</span></label>
                    <input 
                      type="email" 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                      required 
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                      onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                      onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                    />
                  </div>
                  {!formData.id && (
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Password<span style={{ color: "#ef4444" }}>*</span></label>
                      <input 
                        type="password" 
                        value={formData.password} 
                        onChange={e => setFormData({...formData, password: e.target.value})} 
                        required={!formData.id} 
                        style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                        onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                        onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                      />
                    </div>
                  )}
                  
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Role<span style={{ color: "#ef4444" }}>*</span></label>
                    <select 
                      value={formData.role} 
                      onChange={e => setFormData({...formData, role: e.target.value})}
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", backgroundColor: "white", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                      onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                      onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                    >
                      <option value="Admin">Admin</option>
                      <option value="SuperAdmin">Super Admin</option>
                    </select>
                  </div>

                  {formData.role === 'Admin' && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Module & Page Permissions</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '10px', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        {PERMISSIONS_TREE.map(node => (
                          <div key={node.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.95rem', color: '#1e293b', fontWeight: '600', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={formData.permissions.includes(node.id) || formData.permissions.includes('all')}
                                onChange={() => handleTogglePermission(node.id)}
                                style={{ marginRight: '8px', width: '16px', height: '16px', accentColor: '#4F46E5' }}
                              />
                              {node.name}
                            </label>
                            
                            {!node.isPage && node.pages && (
                              <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', borderLeft: '2px solid #e2e8f0', marginLeft: '8px' }}>
                                {node.pages.map(page => {
                                  // If parent is checked, visually show children as checked
                                  const isChecked = formData.permissions.includes(page.id) || formData.permissions.includes(node.id) || formData.permissions.includes('all');
                                  const isDisabled = formData.permissions.includes(node.id) || formData.permissions.includes('all');
                                  
                                  return (
                                    <label key={page.id} style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: isDisabled ? '#94a3b8' : '#475569', cursor: isDisabled ? 'not-allowed' : 'pointer' }}>
                                      <input 
                                        type="checkbox" 
                                        checked={isChecked}
                                        disabled={isDisabled}
                                        onChange={() => {
                                          if (!isDisabled) handleTogglePermission(page.id);
                                        }}
                                        style={{ marginRight: '8px', width: '14px', height: '14px', accentColor: isDisabled ? '#94a3b8' : '#4F46E5' }}
                                      />
                                      {page.name}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid #e2e8f0" }}>
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    style={{ backgroundColor: "transparent", color: "#64748b", border: "1px solid #cbd5e1", padding: "0.6rem 1.5rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseOver={(e) => { e.target.style.backgroundColor = "#f1f5f9"; e.target.style.color = "#0f172a"; }}
                    onMouseOut={(e) => { e.target.style.backgroundColor = "transparent"; e.target.style.color = "#64748b"; }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    style={{ backgroundColor: "#4F46E5", color: "white", border: "none", padding: "0.6rem 2rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer", transition: "background-color 0.2s", boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)" }}
                    onMouseOver={(e) => e.target.style.backgroundColor = "#4338ca"}
                    onMouseOut={(e) => e.target.style.backgroundColor = "#4F46E5"}
                  >
                    {formData.id ? "Save Changes" : "Save User"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Table
        loading={loading}
        headers={['Name', 'Employee ID', 'Email', 'Role', 'Permissions', 'Actions']}
        data={users}
        renderRow={(u, index) => (
          <tr key={u.id || index}>
            <td><strong>{u.name}</strong></td>
            <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: '#4F46E5' }}>{u.employeeId || 'N/A'}</td>
            <td>{u.email}</td>
            <td>
              <span 
                className="badge" 
                style={
                  u.role === 'SuperAdmin' 
                    ? { background: 'transparent', color: 'var(--primary-color)', border: '1px solid var(--primary-color)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }
                    : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }
                }
              >
                {u.role === 'SuperAdmin' && <Shield size={12} />}
                {u.role}
              </span>
            </td>
            <td style={{ fontSize: '0.85rem' }}>
              {u.permissions.includes('all') ? 'Full Access' : u.permissions.join(', ') || 'None'}
            </td>
            <td>
              <button className="btn" style={{ padding: '4px 8px', marginRight: '5px' }} onClick={() => openModal(u)}><Edit2 size={14} /></button>
              {isSuperAdmin && u.id !== currentUser.id && (
                <button className="btn" style={{ padding: '4px 8px', color: 'red' }} onClick={() => handleDelete(u.id)}><Trash2 size={14} /></button>
              )}
            </td>
          </tr>
        )}
      />

      </div>
  );
};

export default IAM;
