import React, { useState, useEffect } from "react";
import axios from "axios";
import { Search, FileText } from "lucide-react";

const UpdateInvoice = () => {
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [form, setForm] = useState({ billNo: "", client: "", amount: "", status: "" });

  useEffect(() => { fetchBills(); }, []);

  const fetchBills = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills`);
      if (res.data.success) setBills(res.data.data || []);
    } catch (err) { console.error("Fetch bills error", err); }
  };

  const handleSelect = (bill) => {
    setSelectedBill(bill);
    setForm({ billNo: bill.billNo || "", client: bill.client || "", amount: bill.amount || bill.total || "", status: bill.status || "pending" });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedBill) return;
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills/${selectedBill.id}`, form);
      setSelectedBill(null);
      fetchBills();
    } catch (err) { console.error("Update bill error", err); }
  };

  const filtered = bills.filter(b =>
    !search || (b.billNo || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.client || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>Update Invoice</h3>
        <p className="text-muted">Search and update existing invoices.</p>
      </div>

      <div className="glass-panel" style={{ padding: "1rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <input className="form-control" placeholder="Search by bill no or client..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ height: 50 }}><Search size={18} /></button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selectedBill ? "1fr 1fr" : "1fr", gap: "2rem" }}>
        <div className="glass-panel" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(0, 0, 0, 0.02)" }}>
                <th style={{ padding: "1rem", textAlign: "left" }}>Bill No</th>
                <th style={{ padding: "1rem", textAlign: "left" }}>Client</th>
                <th style={{ padding: "1rem", textAlign: "left" }}>Amount</th>
                <th style={{ padding: "1rem", textAlign: "left" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, index) => (
                <tr key={index} style={{ borderTop: "1px solid rgba(0, 0, 0, 0.05)", cursor: "pointer", background: selectedBill?.id === item.id ? "rgba(13, 110, 253, 0.05)" : "transparent" }}
                  onClick={() => handleSelect(item)}>
                  <td style={{ padding: "1rem", fontWeight: 600 }}>#{item.billNo || item.id?.slice(-6) || index + 1}</td>
                  <td style={{ padding: "1rem" }}>{item.client}</td>
                  <td style={{ padding: "1rem" }}>? {parseFloat(item.amount || item.total || 0).toFixed(2)}</td>
                  <td style={{ padding: "1rem" }}>{item.status || "Pending"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedBill && (
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h4 style={{ marginTop: 0 }}>Edit Invoice</h4>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label className="form-label">Bill No</label>
                <input className="form-control" value={form.billNo} onChange={(e) => setForm({ ...form, billNo: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Client</label>
                <input className="form-control" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Amount</label>
                <input type="number" step="0.01" className="form-control" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%", height: 50 }}>
                <FileText size={18} /> Update Invoice
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateInvoice;