import React, { useState, useEffect } from "react";
import axios from "axios";
import Table from "../../components/Table";
import SearchableSelect from "../../components/SearchableSelect";
import { Search, Download } from "lucide-react";

const API = "http://localhost:5000/api";

const MISReports = () => {
  const [data, setData] = useState([]);
  const [clients, setClients] = useState([]);
  const [filters, setFilters] = useState({ client: "", fr: "", to: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { 
    fetchClients();
    fetchMIS(); 
  }, []);

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API}/clients`);
      if (res.data.success) {
        setClients(res.data.data || []);
      }
    } catch (err) { console.error("Fetch clients error", err); }
  };

  const fetchMIS = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/bookings`);
      if (res.data.success) {
        let bookings = res.data.data || [];
        
        if (filters.client) {
          const clientName = filters.client.name || filters.client;
          bookings = bookings.filter(b => b.client === clientName);
        }
        if (filters.fr) {
          bookings = bookings.filter(b => new Date(b.bookingDate) >= new Date(filters.fr));
        }
        if (filters.to) {
          bookings = bookings.filter(b => new Date(b.bookingDate) <= new Date(filters.to));
        }
        
        setData(bookings);
      }
    } catch (err) { console.error("Fetch MIS error", err); }
    finally { setLoading(false); }
  };

  const handleExport = () => {
    // Simple CSV export logic
    if (data.length === 0) return;
    const headers = ["Awb No", "Date", "Consignor", "Consignee", "Origin", "Destination", "Mode", "Invoice", "Invoice Date", "Part Number", "Box", "Quantity", "Chargeable Weight", "Status"];
    const csvContent = [
      headers.join(","),
      ...data.map(row => [
        row.lrNumber || "",
        row.bookingDate ? new Date(row.bookingDate).toLocaleDateString() : "",
        `"${row.consignor || ""}"`,
        `"${row.consignee || ""}"`,
        row.origin || "",
        row.destination || "",
        row.mode || "",
        row.invoiceNo || "",
        row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString() : "",
        row.partNumber || "",
        row.noOfPackages || "",
        row.actualWeight || "",
        row.chargedWeight || "",
        row.status || "SHIPMENT BOOKED"
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "MIS_Report.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: "0 1rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.5rem", color: "#6366f1", fontWeight: "600", marginBottom: "0.25rem" }}>Mis Report</h3>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "#6b7280" }}>CLIENT</label>
            <SearchableSelect 
              options={clients} 
              value={filters.client} 
              onChange={(c) => setFilters({ ...filters, client: c })} 
              placeholder="-- Select Client --" 
              displayKey="name" 
            />
          </div>
          
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
            <button className="btn btn-primary" style={{ padding: "0.4rem 2rem", background: "#6366f1", border: "none", fontSize: "0.85rem", fontWeight: "600" }} onClick={fetchMIS}>
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
          MIS REPORT
        </button>
      </div>
      
      <div className="glass-panel" style={{ padding: "0.5rem", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1500px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Awb No</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Date</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Consignor</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Consignee</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Origin</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Destination</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Mode</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Invoice</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Invoice Date</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Part Number</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Box</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Quantity</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", borderRight: "1px solid #f3f4f6" }}>Chargeable Weight</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="14" style={{ textAlign: "center", padding: "2rem" }}>Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="14" style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>No data available</td></tr>
            ) : (
              data.map((item, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #f3f4f6", fontSize: "0.75rem", color: "#4b5563" }}>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{item.lrNumber || "-"}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{item.bookingDate ? new Date(item.bookingDate).toLocaleDateString('en-IN') : "-"}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{item.consignor || "-"}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{item.consignee || "-"}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6", textTransform: "uppercase" }}>{item.origin || "-"}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6", textTransform: "uppercase" }}>{item.destination || "-"}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6", textTransform: "uppercase" }}>{item.mode || "-"}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{item.invoiceNo || "-"}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString('en-IN') : "-"}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{item.partNumber || "-"}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{item.noOfPackages || item.packages || "-"}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{item.actualWeight || "-"}</td>
                  <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6" }}>{item.chargedWeight || "0"}</td>
                  <td style={{ padding: "12px 16px" }}>{item.status || "SHIPMENT BOOKED"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MISReports;
