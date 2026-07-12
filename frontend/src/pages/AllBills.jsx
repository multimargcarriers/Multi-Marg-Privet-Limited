import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import Table from "../components/Table";
import { Eye, FileText, Search, Download, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";

const AllBills = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => { fetchBills(); }, []);

  const fetchBills = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills`);
      if (res.data.success) setBills(res.data.data || []);
    } catch (err) { console.error("Fetch bills error", err); }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Bill",
      message: "Are you sure you want to delete this bill? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    setBills(prev => prev.filter(b => b.id !== id));
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills/${id}`);
    } catch (err) {
      console.error("Delete bill error", err);
      fetchBills();
    }
  };

  const filtered = bills.filter(b =>
    !search || (b.billNo || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.client || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>All Bills</h3>
          <p className="text-muted">View and manage all generated invoices and bills.</p>
        </div>
        <button className="btn btn-primary" style={{ padding: "0 1.5rem", height: "45px" }} onClick={() => navigate("/bills/generate")}>
          <FileText size={18} /> Generate New
        </button>
      </div>

      <div className="glass-panel" style={{ padding: "1rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <input className="form-control" placeholder="Search by bill no or client..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ height: 50 }}><Search size={18} /></button>
        </div>
      </div>

      <Table
        headers={["Bill No", "Client", "Amount", "Date", "Status", "Actions"]}
        data={filtered}
        renderRow={(item, index) => (
          <tr key={item.id || index}>
            <td className="font-semibold">#{item.billNo || item.id?.slice(-6) || index + 1}</td>
            <td>{item.client}</td>
            <td>? {parseFloat(item.amount || item.total || 0).toFixed(2)}</td>
            <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</td>
            <td>
              <span style={{
                padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600",
                background: item.status === "paid" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                color: item.status === "paid" ? "#10b981" : "#f59e0b"
              }}>
                {item.status || "Pending"}
              </span>
            </td>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                <button onClick={() => window.open(`/bills/view1/${item.id}`, "_blank")} style={{ background: "transparent", border: "none", color: "var(--primary-color)", cursor: "pointer", display: 'flex' }}><Eye size={18} /></button>
                <button onClick={() => window.open(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills/${item.id}/pdf`, "_blank")} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: 'flex' }}><Download size={18} /></button>
                {isSuperAdmin && (
                  <button onClick={() => handleDelete(item.id)} style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", display: 'flex' }}><Trash2 size={18} /></button>
                )}
              </div>
            </td>
          </tr>
        )}
      />
    </div>
  );
};

export default AllBills;