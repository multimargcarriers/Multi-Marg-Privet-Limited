import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Edit, Trash2, Plus, Briefcase } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useDialog } from "../../context/DialogContext";

const ManageCareers = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const initialFormState = {
    title: "",
    department: "",
    location: "",
    type: "Full-Time",
    description: "",
    isActive: true
  };
  const [form, setForm] = useState(initialFormState);

  useEffect(() => {
    fetchCareers();
  }, []);

  const fetchCareers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/cms/careers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) setCareers(res.data.data || []);
    } catch (err) {
      console.error("Fetch careers error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item) => {
    setForm({
      title: item.title || "",
      department: item.department || "",
      location: item.location || "",
      type: item.type || "Full-Time",
      description: item.description || "",
      isActive: item.isActive !== false
    });
    setEditing(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        setCareers(prev => prev.map(c => c.id === editing.id ? { ...c, ...form } : c));
        await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/cms/careers/${editing.id}`, form, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/cms/careers`, form, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.data.success && res.data.data) {
          setCareers(prev => [res.data.data, ...prev]);
        }
      }
      setForm(initialFormState);
      setEditing(null);
      setIsAdding(false);
    } catch (err) {
      console.error("Save error", err);
      fetchCareers();
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Career Opening",
      message: "Are you sure you want to delete this job posting? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    setCareers(prev => prev.filter(c => c.id !== id));
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/cms/careers/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (err) {
      console.error("Delete error", err);
      fetchCareers();
    }
  };

  return (
    <div className="page-content">
      <div className="header-flex" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: "1.8rem", color: "var(--primary-color)", margin: 0, fontWeight: "700", letterSpacing: "-0.5px" }}>Manage Careers</h3>
        <div className="page-header-actions">
          {!isAdding && !editing && (
            <button onClick={() => { setForm(initialFormState); setIsAdding(true); }} className="page-header-btn page-header-btn-primary">
              <Plus size={16} /> Post New Job
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(isAdding || editing) && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            style={{ overflow: "hidden", marginBottom: "2rem" }}
          >
            <div className="glass-panel" style={{ padding: "2.5rem" }}>
              <h4 style={{ margin: "0 0 2rem 0", fontSize: "1.4rem", color: "var(--text-dark)", borderBottom: "2px solid var(--border-color)", paddingBottom: "1rem" }}>
                {editing ? "Edit Job Posting" : "Create Job Posting"}
              </h4>
              <form onSubmit={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Job Title<span style={{ color: "#ef4444" }}>*</span></label>
                    <input 
                      type="text" 
                      value={form.title} 
                      placeholder="e.g. Senior Logistics Manager"
                      onChange={(e) => setForm({ ...form, title: e.target.value })} 
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Department</label>
                    <input 
                      type="text" 
                      value={form.department} 
                      placeholder="e.g. Operations"
                      onChange={(e) => setForm({ ...form, department: e.target.value })} 
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Location</label>
                    <input 
                      type="text" 
                      value={form.location} 
                      placeholder="e.g. Mumbai, MH or Remote"
                      onChange={(e) => setForm({ ...form, location: e.target.value })} 
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Employment Type</label>
                    <select 
                      value={form.type} 
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", backgroundColor: "white" }}
                    >
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Job Description<span style={{ color: "#ef4444" }}>*</span></label>
                  <textarea 
                    rows="6"
                    value={form.description} 
                    placeholder="Describe the role, responsibilities, and requirements..."
                    onChange={(e) => setForm({ ...form, description: e.target.value })} 
                    required
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", resize: "vertical", outline: "none" }}
                  />
                </div>

                <div style={{ marginTop: '1.5rem', width: '200px' }}>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Status</label>
                  <select 
                    value={form.isActive} 
                    onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                    style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", backgroundColor: "white" }}
                  >
                    <option value={true}>Open (Accepting Apps)</option>
                    <option value={false}>Closed (Hidden)</option>
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-color)" }}>
                  <button type="button" onClick={() => { setEditing(null); setIsAdding(false); setForm(initialFormState); }} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editing ? "Save Changes" : "Post Job"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Title</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Department & Location</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Type</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Status</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading...</td>
                </tr>
              ) : careers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No job postings found.</td>
                </tr>
              ) : (
                careers.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "white" }}>
                    <td style={{ padding: "12px", color: "#0f172a", fontWeight: "500" }}>{item.title}</td>
                    <td style={{ padding: "12px", color: "#64748b", fontSize: "0.9rem" }}>
                      {item.department} <br/>
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{item.location}</span>
                    </td>
                    <td style={{ padding: "12px", color: "#64748b" }}>{item.type}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", backgroundColor: item.isActive ? "#dcfce7" : "#fef2f2", color: item.isActive ? "#16a34a" : "#ef4444" }}>
                        {item.isActive ? 'Open' : 'Closed'}
                      </span>
                    </td>
                    <td style={{ padding: "16px 12px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
                        <button onClick={() => handleEditClick(item)} className="btn btn-primary" style={{ width: "32px", height: "32px", padding: "0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Edit size={14} />
                        </button>
                        {isSuperAdmin && (
                          <button onClick={() => handleDelete(item.id)} className="btn btn-danger" style={{ width: "32px", height: "32px", padding: "0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageCareers;
