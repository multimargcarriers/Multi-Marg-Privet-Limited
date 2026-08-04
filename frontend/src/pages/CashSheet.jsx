import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { CheckCircle, Loader2, Trash2 } from "lucide-react";
import Table from "../components/Table";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import RupeeIcon from '../components/RupeeIcon';
import { formatDate } from '../utils/formatters';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const CashSheet = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const [formData, setFormData] = useState({
    amount: "",
    date: "",
    type: "",
    remarks: "",
    file: null
  });
  
  const [entries, setEntries] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    fetchData(); 
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/cash`);
      if (res.data.success) {
        setEntries(res.data.data || []);
      }
    } catch (err) { 
      console.error("Fetch cash error", err); 
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);
    try {
      const payload = {
        amount: parseFloat(formData.amount) || 0,
        date: formData.date,
        type: formData.type,
        remarks: formData.remarks,
      };
      const res = await axios.post(`${API}/cash`, payload);
      if (res.data.success) {
        setSuccess(true);
        setFormData({
          amount: "",
          date: "",
          type: "",
          remarks: "",
          file: null
        });
        fetchData();
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Save cash entry error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Entry",
      message: "Are you sure you want to delete this cash entry? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    try {
      setEntries(prev => prev.filter(e => e.id !== id));
      await axios.delete(`${API}/cash/${id}`);
    } catch (err) {
      console.error("Delete cash entry error", err);
      fetchData();
    }
  };

  const totalIncome = entries.filter(e => e.type === "in" || e.type === "income").reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const totalExpense = entries.filter(e => e.type === "out" || e.type === "expense").reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  return (
    <div style={{ width: "100%", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem", color: "#111827" }}>
          Cash sheet
        </h3>
      </div>

      {success && (
        <div
          className="glass-panel"
          style={{
            padding: "1.5rem",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            background: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.2)",
          }}
        >
          <CheckCircle size={32} color="#16a34a" />
          <div>
            <h5 style={{ color: "#16a34a", marginBottom: "0.25rem", margin: 0 }}>
              Cash Sheet Updated Successfully!
            </h5>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: "2.5rem", marginBottom: "3rem" }}>
        <div className="grid-2-col">
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>
              Amount<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
            </label>
            <input 
              type="number" 
              step="0.01"
              className="form-control" 
              name="amount" 
              placeholder="Enter the amount" 
              value={formData.amount} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>
              Date<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
            </label>
            <input 
              type="date" min="1947-01-01" max="2200-12-31" 
              className="form-control" 
              name="date" 
              value={formData.date} 
              onChange={handleChange} 
              required 
            />
          </div>
        </div>

        <div className="grid-2-col">
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>
              Cash In/Out<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
            </label>
            <select 
              className="form-control" 
              name="type" 
              value={formData.type} 
              onChange={handleChange} 
              required
            >
              <option value="">-- Please select the option --</option>
              <option value="in">Cash In</option>
              <option value="out">Cash Out</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>
              Remarks<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
            </label>
            <input 
              type="text" 
              className="form-control" 
              name="remarks" 
              placeholder="Enter the Remarks if any...." 
              value={formData.remarks} 
              onChange={handleChange} 
              required 
            />
          </div>
        </div>

        <div className="form-group flex-responsive" style={{ marginBottom: "2.5rem" }}>
          <label className="form-label" style={{ fontWeight: "500", color: "#374151", margin: 0 }}>
            Upload Voucher<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
          </label>
          <input 
            type="file" 
            name="file" 
            onChange={handleFileChange} 
            style={{ fontSize: "0.9rem" }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ padding: "0.5rem 2rem", height: "45px" }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="spinner" /> Updating...
              </>
            ) : (
              <>UPDATE CASH SHEET</>
            )}
          </button>
        </div>
      </form>

      {/* Summary Cards */}
      <div className="grid-3-col" style={{ marginBottom: "2rem" }}>
        <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
          <p className="text-muted" style={{ marginBottom: "0.5rem", fontWeight: "500" }}>Total Cash In</p>
          <h3 style={{ color: "#10b981", margin: 0, fontSize: "2rem", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RupeeIcon size={28} /> {totalIncome.toFixed(2)}
          </h3>
        </div>
        <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
          <p className="text-muted" style={{ marginBottom: "0.5rem", fontWeight: "500" }}>Total Cash Out</p>
          <h3 style={{ color: "#ef4444", margin: 0, fontSize: "2rem", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RupeeIcon size={28} /> {totalExpense.toFixed(2)}
          </h3>
        </div>
        <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
          <p className="text-muted" style={{ marginBottom: "0.5rem", fontWeight: "500" }}>Net Balance</p>
          <h3 style={{ color: netBalance >= 0 ? "#10b981" : "#ef4444", margin: 0, fontSize: "2rem", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RupeeIcon size={28} /> {netBalance.toFixed(2)}
          </h3>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "2rem" }}>
        <h4 style={{ marginTop: 0, marginBottom: "1.5rem", color: "#111827", fontSize: "1.2rem" }}>Recent Cash Entries</h4>
        <Table
          loading={loading}
          headers={["Date", "Cash In/Out", "Amount", "Remarks", "Actions"]}
          data={entries}
          renderRow={(item, index) => (
            <tr key={item.id || index}>
              <td>{item.date ? formatDate(item.date) : "-"}</td>
              <td>
                <span style={{
                  padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600",
                  background: (item.type === "in" || item.type === "income") ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  color: (item.type === "in" || item.type === "income") ? "#10b981" : "#ef4444"
                }}>
                  {(item.type === "in" || item.type === "income") ? "Cash In" : "Cash Out"}
                </span>
              </td>
              <td style={{ fontWeight: "600", color: (item.type === "in" || item.type === "income") ? "#10b981" : "#ef4444" }}>
                <div style={{ display: 'flex', alignItems: 'center' }}><RupeeIcon size={14} /> {parseFloat(item.amount || 0).toFixed(2)}</div>
              </td>
              <td>{item.remarks || "-"}</td>
              <td>
                {isSuperAdmin && (
                  <button onClick={() => handleDelete(item.id)} style={{ background: "rgba(220, 38, 38, 0.1)", border: "none", color: "#dc2626", padding: "6px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Delete">
                    <Trash2 size={16} />
                  </button>
                )}
              </td>
            </tr>
          )}
        />
      </div>
    </div>
  );
};

export default CashSheet;
