import React, { useState, useEffect } from "react";
import axios from "axios";
import { Search, Download } from "lucide-react";

const API = "http://localhost:5000/api";

const GST = () => {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({ fr: "", to: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchGST(); }, []);

  const fetchGST = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.fr) params.fr = filters.fr;
      if (filters.to) params.to = filters.to;
      const res = await axios.get(`${API}/reports/gst`, { params });
      if (res.data.success) setData(res.data.data || []);
    } catch (err) { console.error("Fetch GST error", err); }
    finally { setLoading(false); }
  };

  const handleExport = () => {
    if (data.length === 0) return;
    const headers = ["Date", "Invoice No", "Client", "GSTIN", "SAC/HSN", "Taxable Value", "IGST", "CGST", "SGST", "Total Tax", "Grand Total"];
    const csvContent = [
      headers.join(","),
      ...data.map(row => [
        row.date || "",
        row.invoice || "",
        `"${row.client || ""}"`,
        row.gstin || "",
        row.sac || "",
        row.taxable || 0,
        row.igst || 0,
        row.cgst || 0,
        row.sgst || 0,
        row.totalTax || 0,
        row.total || 0
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "GST_Report.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: "0 1rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.5rem", color: "#6366f1", fontWeight: "600", marginBottom: "0.25rem" }}>GST Report</h3>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "#6b7280" }}>FROM DATE</label>
              <input type="date" className="form-control" value={filters.fr} onChange={(e) => setFilters({ ...filters, fr: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "#6b7280" }}>TO DATE</label>
              <input type="date" className="form-control" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            </div>
          </div>
          
          <div style={{ display: "flex", justifyContent: "center", marginTop: "0.5rem" }}>
            <button className="btn btn-primary" style={{ padding: "0.4rem 2rem", background: "#6366f1", border: "none", fontSize: "0.85rem", fontWeight: "600" }} onClick={fetchGST}>
              SEARCH
            </button>
          </div>

        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <button 
          onClick={handleExport}
          style={{ 
            background: "#6366f1", 
            color: "white", 
            border: "none", 
            padding: "0.4rem 1rem", 
            borderRadius: "4px", 
            fontSize: "0.75rem", 
            fontWeight: "600", 
            cursor: "pointer",
            textTransform: "uppercase"
          }}>
          GST REPORT
        </button>
      </div>

      <div className="glass-panel" style={{ padding: "0.5rem", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Date</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Invoice No</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Client</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>GSTIN</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>SAC/HSN</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Taxable Value</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>IGST</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>CGST</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>SGST</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Total Tax</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600" }}>Grand Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="11" style={{ textAlign: "center", padding: "2rem" }}>Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="11" style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>No data available</td></tr>
            ) : (
              data.map((item, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #f3f4f6", fontSize: "0.75rem", color: "#4b5563" }}>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{item.date || "-"}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{item.invoice || "-"}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{item.client || "-"}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{item.gstin || "-"}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{item.sac || "-"}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{parseFloat(item.taxable || 0).toFixed(2)}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{parseFloat(item.igst || 0).toFixed(2)}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{parseFloat(item.cgst || 0).toFixed(2)}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{parseFloat(item.sgst || 0).toFixed(2)}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{parseFloat(item.totalTax || 0).toFixed(2)}</td>
                  <td style={{ padding: "12px 16px" }}>{parseFloat(item.total || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GST;
