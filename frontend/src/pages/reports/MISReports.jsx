import React, { useState, useEffect } from "react";
import axios from "axios";
import Table from "../../components/Table";
import CreatableDropdown from "../../components/CreatableDropdown";
import QuickAddModal from "../../components/QuickAddModal";
import { Search, Download } from "lucide-react";
import { formatDate } from "../../utils/formatters";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const MISReports = () => {
  const [data, setData] = useState([]);
  const [clients, setClients] = useState([]);
  const [filters, setFilters] = useState({ client: "", fr: "", to: "" });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [modalInitialName, setModalInitialName] = useState("");

  const handleCreateNew = (type, name) => {
    setModalType(type);
    setModalInitialName(name);
    setModalOpen(true);
  };

  const handleModalSave = (data) => {
    if (modalType === "client") {
      setClients([...clients, data]);
      setFilters({ ...filters, client: data.name || data.client });
    }
  };

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
      ...data.map(row => {
        const awb = row.awb || row.consignment || row.lrNumber || row.lrNo || row.lr_number || row.awbNo || (row.id ? String(row.id).slice(-6) : "");
        const rawDate = row.date || row.dispatch_date || row.bookingDate || row.booking_date || row.createdAt || row.created_at;
        const dateStr = rawDate ? (/^\d{2}-\d{2}-\d{4}$/.test(String(rawDate)) ? String(rawDate) : formatDate(rawDate)) : "";
        const boxCount = row.box || row.boxes || row.noOfPackages || row.packages || row.qty || "";
        const chgWt = row.charge_wt || row.chargeable_weight || row.chargedWeight || row.chargeableWeight || row.weight || row.actual_wt || "0";
        return [
          `"${awb}"`,
          `"${dateStr}"`,
          `"${row.consignor || ""}"`,
          `"${row.consignee || ""}"`,
          row.origin || "",
          row.destination || "",
          row.mode || "",
          `"${row.invoiceNo || row.invoice || ""}"`,
          `"${row.invoiceDate ? formatDate(row.invoiceDate) : ""}"`,
          `"${row.partNumber || row.partNo || ""}"`,
          boxCount,
          row.actualWeight || row.quantity || "",
          chgWt,
          row.status || "SHIPMENT BOOKED"
        ].join(",");
      })
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
            <CreatableDropdown 
              options={clients} 
              value={filters.client} 
              onChange={(c) => setFilters({ ...filters, client: c })} 
              onCreate={(name) => handleCreateNew("client", name)}
              placeholder="-- Select Client --" 
            />
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "#6b7280" }}>FROM DATE</label>
              <input type="date" min="1947-01-01" max="2200-12-31" className="form-control" value={filters.fr} onChange={(e) => setFilters({ ...filters, fr: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "#6b7280" }}>TO DATE</label>
              <input type="date" min="1947-01-01" max="2200-12-31" className="form-control" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
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
        <Table
          loading={loading}
          pagination={true}
          headers={["AWB No", "Date", "Consignor", "Consignee", "Origin", "Destination", "Mode", "Invoice(s)", "Invoice Date(s)", "Part Number(s)", "Box", "Quantity", "Chargeable Weight", "Status"]}
          data={data}
          renderRow={(item, index) => {
            const awb = item.awb || item.consignment || item.lrNumber || item.lrNo || item.lr_number || item.awbNo || (item.id ? String(item.id).slice(-6) : "-");
            const rawDate = item.date || item.dispatch_date || item.bookingDate || item.booking_date || item.createdAt || item.created_at;
            const dateStr = rawDate ? (/^\d{2}-\d{2}-\d{4}$/.test(String(rawDate)) ? String(rawDate) : formatDate(rawDate)) : "-";
            const boxCount = item.box || item.boxes || item.noOfPackages || item.packages || item.qty || "-";
            const chgWt = item.charge_wt || item.chargeable_weight || item.chargedWeight || item.chargeableWeight || item.weight || item.actual_wt || "0";
            return (
              <tr key={index} style={{ borderBottom: "1px solid #f3f4f6", fontSize: "0.75rem", color: "#4b5563" }}>
                <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6", whiteSpace: "nowrap", fontWeight: "600", color: "#1e3a8a" }}>{awb}</td>
                <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6", whiteSpace: "nowrap" }}>{dateStr}</td>
                <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6", whiteSpace: "nowrap" }}>{item.consignor || "-"}</td>
                <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6", whiteSpace: "nowrap" }}>{item.consignee || "-"}</td>
                <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6", textTransform: "uppercase", whiteSpace: "nowrap" }}>{item.origin || "-"}</td>
                <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6", textTransform: "uppercase", whiteSpace: "nowrap" }}>{item.destination || "-"}</td>
                <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6", textTransform: "uppercase", whiteSpace: "nowrap" }}>{item.mode || "-"}</td>
                <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6", whiteSpace: "pre-line" }}>{item.invoiceNo || item.invoice || "-"}</td>
                <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6", whiteSpace: "pre-line" }}>{item.invoiceDate || "-"}</td>
                <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6", whiteSpace: "pre-line" }}>{item.partNumber || item.partNo || "-"}</td>
                <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6", whiteSpace: "pre-line" }}>{boxCount}</td>
                <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6", whiteSpace: "pre-line" }}>{item.actualWeight || item.quantity || "-"}</td>
                <td style={{ padding: "12px 16px", borderRight: "1px solid #f3f4f6", whiteSpace: "nowrap" }}>{chgWt}</td>
                <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>{item.status || "SHIPMENT BOOKED"}</td>
              </tr>
            );
          }}
        />
      </div>

      <QuickAddModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
        type={modalType}
        initialName={modalInitialName}
      />
    </div>
  );
};

export default MISReports;
