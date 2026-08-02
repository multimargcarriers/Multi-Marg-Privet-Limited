import React, { useState, useEffect } from "react";
import axios from "axios";
import Table from "../../components/Table";
import { Search } from "lucide-react";
import RupeeIcon from '../../components/RupeeIcon';
import { formatDate } from "../../utils/formatters";

const UnbilledReports = () => {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({ fr: "", to: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchUnbilled(); }, []);

  const fetchUnbilled = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bookings`);
      if (res.data.success) {
        let bookings = res.data.data || [];
        bookings = bookings.filter(b => b.status !== "Billed");
        
        if (filters.fr) {
          bookings = bookings.filter(b => new Date(b.bookingDate) >= new Date(filters.fr));
        }
        if (filters.to) {
          bookings = bookings.filter(b => new Date(b.bookingDate) <= new Date(filters.to));
        }
        
        setData(bookings);
      }
    } catch (err) { console.error("Fetch unbilled error", err); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem", color: "#111827" }}>Unbilled Bookings (LR) Reports</h3>
        <p className="text-muted">Track all bookings that have not yet been converted to a tax invoice.</p>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
            <label className="form-label">From Date</label>
            <input type="date" min="1947-01-01" max="2200-12-31" className="form-control" value={filters.fr} onChange={(e) => setFilters({ ...filters, fr: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
            <label className="form-label">To Date</label>
            <input type="date" min="1947-01-01" max="2200-12-31" className="form-control" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>
          <button className="btn btn-primary" onClick={fetchUnbilled}><Search size={18} /> Search</button>
        </div>
      </div>
      
      <div className="glass-panel" style={{ padding: "1rem" }}>
        <Table
          loading={loading}
          pagination={true}
          headers={["AWB No", "Date", "Consignor", "Consignee", "Origin", "Destination", "Mode", "Box", "Chargeable Weight", "Billed To", "Remarks"]}
          data={data}
          renderRow={(item, index) => (
            <tr key={index}>
              <td className="font-semibold" style={{ whiteSpace: "nowrap" }}>{item.awbNo || item.lrNumber || "-"}</td>
              <td style={{ whiteSpace: "nowrap" }}>{item.date ? formatDate(item.date) : item.bookingDate ? formatDate(item.bookingDate) : "-"}</td>
              <td style={{ whiteSpace: "nowrap" }}>{item.consignor || "-"}</td>
              <td style={{ whiteSpace: "nowrap" }}>{item.consignee || "-"}</td>
              <td style={{ whiteSpace: "nowrap" }}>{item.origin || "-"}</td>
              <td style={{ whiteSpace: "nowrap" }}>{item.destination || "-"}</td>
              <td style={{ whiteSpace: "nowrap" }}>{item.mode || "-"}</td>
              <td style={{ whiteSpace: "nowrap" }}>{item.box || item.packages || "-"}</td>
              <td style={{ whiteSpace: "nowrap" }}>{item.chargeableWeight || item.chargedWeight || "0"}</td>
              <td style={{ whiteSpace: "nowrap" }}>{item.billedTo || "-"}</td>
              <td style={{ whiteSpace: "nowrap" }}>{item.remarks || item.status || "-"}</td>
            </tr>
          )}
        />
      </div>
    </div>
  );
};

export default UnbilledReports;
