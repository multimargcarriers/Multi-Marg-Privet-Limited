import React, { useState, useEffect } from "react";
import axios from "axios";
import Table from "../../components/Table";
import { Search } from "lucide-react";

const SalesReports = () => {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({ fr: "", to: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchSales(); }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills`);
      if (res.data.success) {
        let bills = res.data.data || [];
        
        if (filters.fr) {
          bills = bills.filter(b => new Date(b.createdAt) >= new Date(filters.fr));
        }
        if (filters.to) {
          bills = bills.filter(b => new Date(b.createdAt) <= new Date(filters.to));
        }
        
        setData(bills);
      }
    } catch (err) { console.error("Fetch sales error", err); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem", color: "#111827" }}>Sales Reports</h3>
        <p className="text-muted">A detailed view of all generated invoices and bills.</p>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
            <label className="form-label">From Date</label>
            <input type="date" className="form-control" value={filters.fr} onChange={(e) => setFilters({ ...filters, fr: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
            <label className="form-label">To Date</label>
            <input type="date" className="form-control" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>
          <button className="btn btn-primary" onClick={fetchSales}><Search size={18} /> Search</button>
        </div>
      </div>
      
      <div className="glass-panel" style={{ padding: "1rem" }}>
        <Table
          loading={loading}
          headers={["Invoice No", "Date", "Client", "LR No", "Status", "Taxable", "Total"]}
          data={data}
          renderRow={(item, index) => (
            <tr key={index}>
              <td className="font-semibold">{item.billNo || "-"}</td>
              <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</td>
              <td>{item.client || "-"}</td>
              <td>{item.lrNo || "-"}</td>
              <td>
                 <span style={{
                    padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600",
                    background: item.status === "paid" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)", 
                    color: item.status === "paid" ? "#10b981" : "#f59e0b"
                 }}>
                   {item.status ? item.status.toUpperCase() : "PENDING"}
                 </span>
              </td>
              <td>? {parseFloat(item.taxable || item.amount || 0).toFixed(2)}</td>
              <td style={{ fontWeight: "600", color: "#10b981" }}>? {parseFloat(item.total || item.amount || 0).toFixed(2)}</td>
            </tr>
          )}
        />
      </div>
    </div>
  );
};

export default SalesReports;
