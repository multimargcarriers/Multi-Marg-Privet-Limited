import React, { useState } from "react";
import axios from "axios";
import { FileText } from "lucide-react";

const MiscBill = () => {
  const [form, setForm] = useState({ client: "", date: "", description: "", amount: "", gst: "5", remarks: "" });
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills/misc`, form);
      setResult(res.data);
      setForm({ client: "", date: "", description: "", amount: "", gst: "5", remarks: "" });
    } catch (err) { console.error("Create misc bill error", err); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>Miscellaneous Bill</h3>
          <p className="text-muted">Create ad-hoc bills for non-booking charges.</p>
        </div>
      </div>

      {result && (
        <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem", borderLeft: "4px solid #10b981" }}>
          <h4 style={{ margin: 0, color: "#10b981" }}>✓ Bill Created Successfully</h4>
          <p style={{ margin: "0.5rem 0 0" }}>Bill No: <strong>{result.billNo}</strong></p>
        </div>
      )}

      <div className="glass-panel" style={{ padding: "2rem", maxWidth: 700, margin: "0 auto" }}>
        <h4 style={{ marginTop: 0, marginBottom: "1.5rem" }}>New Miscellaneous Bill</h4>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Client Name</label>
              <input className="form-control" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-control" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label">Description</label>
              <textarea className="form-control" style={{ height: 80, padding: "0.8rem 1.2rem", resize: "vertical" }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input type="number" step="0.01" className="form-control" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">GST (%)</label>
              <select className="form-control" value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })}>
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label">Remarks</label>
              <input className="form-control" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem", width: "100%", height: 50 }}>
            <FileText size={18} /> Generate Bill
          </button>
        </form>
      </div>
    </div>
  );
};

export default MiscBill;