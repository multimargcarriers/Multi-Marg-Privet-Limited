import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Edit, Trash2, HelpCircle, Plus } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useDialog } from "../../context/DialogContext";

const ManageFAQ = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimarg.com';

  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const initialFormState = {
    question: "",
    answer: "",
    order: 0,
    isActive: true
  };
  const [form, setForm] = useState(initialFormState);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/cms/faqs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) setFaqs(res.data.data || []);
    } catch (err) {
      console.error("Fetch faqs error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item) => {
    setForm({
      question: item.question || "",
      answer: item.answer || "",
      order: item.order || 0,
      isActive: item.isActive !== false
    });
    setEditing(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, order: Number(form.order) };
      if (editing) {
        setFaqs(prev => prev.map(f => f.id === editing.id ? { ...f, ...payload } : f));
        await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/cms/faqs/${editing.id}`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/cms/faqs`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.data.success && res.data.data) {
          setFaqs(prev => [res.data.data, ...prev]);
        }
      }
      setForm(initialFormState);
      setEditing(null);
      setIsAdding(false);
    } catch (err) {
      console.error("Save error", err);
      fetchFaqs();
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete FAQ",
      message: "Are you sure you want to delete this FAQ? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    setFaqs(prev => prev.filter(f => f.id !== id));
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/cms/faqs/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (err) {
      console.error("Delete error", err);
      fetchFaqs();
    }
  };

  return (
    <div className="page-content">
      <div className="header-flex" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: "1.8rem", color: "var(--primary-color)", margin: 0, fontWeight: "700", letterSpacing: "-0.5px" }}>Manage FAQs</h3>
        <div className="page-header-actions">
          {!isAdding && !editing && (
            <button onClick={() => { setForm(initialFormState); setIsAdding(true); }} className="page-header-btn page-header-btn-primary">
              <Plus size={16} /> Add New FAQ
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
                {editing ? "Edit FAQ" : "Add New FAQ"}
              </h4>
              <form onSubmit={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Question<span style={{ color: "#ef4444" }}>*</span></label>
                    <input 
                      type="text" 
                      value={form.question} 
                      placeholder="e.g. How do I track my shipment?"
                      onChange={(e) => setForm({ ...form, question: e.target.value })} 
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Answer<span style={{ color: "#ef4444" }}>*</span></label>
                    <textarea 
                      rows="4"
                      value={form.answer} 
                      placeholder="Provide the answer here..."
                      onChange={(e) => setForm({ ...form, answer: e.target.value })} 
                      required
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", resize: "none", outline: "none" }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Display Order</label>
                      <input 
                        type="number" 
                        value={form.order} 
                        onChange={(e) => setForm({ ...form, order: e.target.value })} 
                        style={{ width: "100px", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Status</label>
                      <select 
                        value={form.isActive} 
                        onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                        style={{ padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", backgroundColor: "white" }}
                      >
                        <option value={true}>Active (Visible)</option>
                        <option value={false}>Draft (Hidden)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-color)" }}>
                  <button type="button" onClick={() => { setEditing(null); setIsAdding(false); setForm(initialFormState); }} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editing ? "Save Changes" : "Save FAQ"}
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
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Order</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Question</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Status</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading...</td>
                </tr>
              ) : faqs.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No FAQs found.</td>
                </tr>
              ) : (
                faqs.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "white" }}>
                    <td style={{ padding: "12px", color: "#64748b" }}>{item.order || 0}</td>
                    <td style={{ padding: "12px", color: "#0f172a", fontWeight: "500" }}>{item.question}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", backgroundColor: item.isActive ? "#dcfce7" : "#f1f5f9", color: item.isActive ? "#16a34a" : "#64748b" }}>
                        {item.isActive ? 'Active' : 'Draft'}
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

export default ManageFAQ;
