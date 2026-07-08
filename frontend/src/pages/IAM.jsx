import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Shield, Plus, Edit2, Trash2 } from 'lucide-react';
import { TablePageSkeleton } from '../components/SkeletonLoader';
import Table from '../components/Table';
import { useDialog } from '../context/DialogContext';

const MODULES = [
  { id: 'masters', name: 'Masters (Clients, Vendors, Rates)' },
  { id: 'operations', name: 'Operations (Bookings, Trips, POD)' },
  { id: 'billing', name: 'Billing (Invoices, Generate Bills)' },
  { id: 'accounts', name: 'Accounts (Cash Sheet, Purchases)' },
  { id: 'reports', name: 'Reports (MIS, Sales)' },
  { id: 'uploads', name: 'Uploads (Box, Vouchers)' }
];

const IAM = () => {
  const { token, user: currentUser } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = currentUser?.role === 'SuperAdmin' || currentUser?.email === 'admin@multimargcarriers.co.in';
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: '', name: '', email: '', password: '', role: 'Admin', permissions: []
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
      alert('Failed to fetch users');
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
    setShowModal(false);
    const tempId = "temp-" + Date.now();
    try {
      if (formData.id) {
        setUsers(prev => prev.map(u => u.id === formData.id ? { ...u, ...formData } : u));
        await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/${formData.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        setUsers(prev => [{ ...formData, id: tempId }, ...prev]);
        const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success && res.data.data) {
          setUsers(prev => prev.map(u => u.id === tempId ? res.data.data : u));
        } else {
          fetchUsers();
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving user');
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
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting user');
      fetchUsers();
    }
  };

  const openModal = (user = null) => {
    if (user) {
      setFormData({ ...user, password: '' });
    } else {
      setFormData({ id: '', name: '', email: '', password: '', role: 'Admin', permissions: [] });
    }
    setShowModal(true);
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title"><Shield size={24} style={{ marginRight: '10px' }} />Identity & Access Management</h2>
          <p className="text-muted">Manage administrators and module permissions.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}><Plus size={18} /> New Admin</button>
      </div>

      <Table
        loading={loading}
        headers={['Name', 'Email', 'Role', 'Permissions', 'Actions']}
        data={users}
        renderRow={(u, index) => (
          <tr key={u.id || index}>
            <td><strong>{u.name}</strong></td>
            <td>{u.email}</td>
            <td><span className="badge" style={{ background: u.role === 'SuperAdmin' ? '#4f46e5' : '#10b981' }}>{u.role}</span></td>
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

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="panel" style={{ width: '500px', padding: '2rem', background: '#fff' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{formData.id ? 'Edit User' : 'Create New User'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
              </div>
              {!formData.id && (
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input type="password" className="form-control" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!formData.id} />
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-control" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="Admin">Admin</option>
                  <option value="SuperAdmin">Super Admin</option>
                </select>
              </div>

              {formData.role === 'Admin' && (
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="form-label">Module Permissions</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                    {MODULES.map(mod => (
                      <label key={mod.id} style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}>
                        <input 
                          type="checkbox" 
                          checked={formData.permissions.includes(mod.id) || formData.permissions.includes('all')}
                          onChange={() => handleTogglePermission(mod.id)}
                          style={{ marginRight: '8px' }}
                        />
                        {mod.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '2rem' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IAM;
