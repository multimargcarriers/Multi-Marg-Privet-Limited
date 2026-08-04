import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Table from "../../components/Table";
import CreatableDropdown from "../../components/CreatableDropdown";
import QuickAddModal from "../../components/QuickAddModal";
import { Search, Download, FileSpreadsheet, Activity, Package, Layers } from "lucide-react";
import { formatDate } from "../../utils/formatters";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const MISReports = () => {
  const [data, setData] = useState([]);
  const [clients, setClients] = useState([]);
  const [filters, setFilters] = useState({ client: "", fr: "", to: "", search: "" });
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

  const fetchMIS = async (e) => {
    if (e) e.preventDefault();
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
        if (filters.search) {
          const q = filters.search.toLowerCase();
          bookings = bookings.filter(b => {
            const awb = b.awb || b.consignment || b.lrNumber || b.lrNo || b.lr_number || b.awbNo || (b.id ? String(b.id).slice(-6) : "");
            return (
              (awb.toLowerCase().includes(q)) ||
              (b.consignor || "").toLowerCase().includes(q) ||
              (b.consignee || "").toLowerCase().includes(q) ||
              (b.origin || "").toLowerCase().includes(q) ||
              (b.destination || "").toLowerCase().includes(q)
            );
          });
        }
        
        setData(bookings);
      }
    } catch (err) { console.error("Fetch MIS error", err); }
    finally { setLoading(false); }
  };

  const handleExport = () => {
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

  const stats = useMemo(() => {
    const totalBookings = data.length;
    const totalBoxes = data.reduce((sum, item) => {
      const val = parseInt(item.box || item.boxes || item.noOfPackages || item.packages || item.qty || 0, 10);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    const totalWeight = data.reduce((sum, item) => {
      const val = parseFloat(item.charge_wt || item.chargeable_weight || item.chargedWeight || item.chargeableWeight || item.weight || item.actual_wt || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    return { totalBookings, totalBoxes, totalWeight };
  }, [data]);

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "20px" }}>
      {/* HEADER BAR */}
      <div 
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "1rem 1.5rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ background: "#fdf4ff", padding: "8px", borderRadius: "10px", display: "flex" }}>
            <FileSpreadsheet size={22} style={{ color: "#d946ef" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, color: "#0f172a" }}>
              MIS Report
            </h3>
            <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 500 }}>
              Management Information System: Consolidated Booking Data
            </span>
          </div>
        </div>
      </div>

      {/* SEARCH FORM */}
      <form onSubmit={fetchMIS} style={{
          backgroundColor: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          marginBottom: "1.5rem",
          overflow: "hidden"
      }}>
        <div style={{ background: "linear-gradient(90deg, #d946ef 0%, #c026d3 50%, #a21caf 100%)", height: "4px", width: "100%" }} />
        <div style={{ padding: "1.5rem 1.75rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Client</label>
              <div style={{ background: "white", borderRadius: "8px", padding: "1px" }}>
                <CreatableDropdown 
                  options={clients} 
                  value={filters.client} 
                  onChange={(c) => setFilters({ ...filters, client: c })} 
                  onCreate={(name) => handleCreateNew("client", name)}
                  placeholder="-- All Clients --" 
                />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>From Date</label>
              <input 
                type="date" min="1947-01-01" max="2200-12-31" 
                value={filters.fr} 
                onChange={(e) => setFilters({ ...filters, fr: e.target.value })} 
                style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>To Date</label>
              <input 
                type="date" min="1947-01-01" max="2200-12-31" 
                value={filters.to} 
                onChange={(e) => setFilters({ ...filters, to: e.target.value })} 
                style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Search Keyword</label>
              <input 
                type="text" 
                placeholder="Search AWB, Origin, Dest..."
                value={filters.search} 
                onChange={(e) => setFilters({ ...filters, search: e.target.value })} 
                style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div className="responsive-btn-group" style={{ marginTop: "1.5rem" }}>
            <button 
              type="button" 
              onClick={handleExport}
              disabled={data.length === 0}
              style={{
                backgroundColor: "#e2e8f0",
                color: "#475569",
                border: "none",
                padding: "0.65rem 1.5rem",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: data.length === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: data.length === 0 ? 0.5 : 1
              }}
            >
              <Download size={16} /> EXPORT CSV
            </button>
            <button 
              type="submit" 
              style={{
                background: "linear-gradient(135deg, #d946ef 0%, #c026d3 100%)",
                color: "white",
                border: "none",
                padding: "0.65rem 2.5rem",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(217, 70, 239, 0.25)",
              }}
            >
              <Search size={16} /> FILTER REPORT
            </button>
          </div>
        </div>
      </form>

      {/* STATS CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Bookings</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", marginTop: "4px", display: "flex", alignItems: "center" }}>
               {stats.totalBookings}
            </div>
          </div>
          <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "12px" }}><Activity size={24} color="#64748b" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Packages/Boxes</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#d946ef", marginTop: "4px", display: "flex", alignItems: "center" }}>
               {stats.totalBoxes}
            </div>
          </div>
          <div style={{ background: "#fae8ff", padding: "12px", borderRadius: "12px" }}><Package size={24} color="#d946ef" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Chargeable Wt</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#c026d3", marginTop: "4px", display: "flex", alignItems: "center" }}>
               {stats.totalWeight.toFixed(2)} kg
            </div>
          </div>
          <div style={{ background: "#fdf4ff", padding: "12px", borderRadius: "12px" }}><Layers size={24} color="#c026d3" /></div>
        </div>
      </div>

      {/* TABLE */}
      <div style={{ background: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <Table
          loading={loading}
          pagination={true}
          headers={["AWB No", "Date", "Consignor", "Consignee", "Origin", "Destination", "Mode", "Invoice", "Invoice Date", "Part No", "Box", "Qty", "Chg Wt", "Status"]}
          data={data}
          renderRow={(item, index) => {
            const awb = item.awb || item.consignment || item.lrNumber || item.lrNo || item.lr_number || item.awbNo || (item.id ? String(item.id).slice(-6) : "-");
            const rawDate = item.date || item.dispatch_date || item.bookingDate || item.booking_date || item.createdAt || item.created_at;
            const dateStr = rawDate ? (/^\d{2}-\d{2}-\d{4}$/.test(String(rawDate)) ? String(rawDate) : formatDate(rawDate)) : "-";
            const boxCount = item.box || item.boxes || item.noOfPackages || item.packages || item.qty || "-";
            const chgWt = item.charge_wt || item.chargeable_weight || item.chargedWeight || item.chargeableWeight || item.weight || item.actual_wt || "0";
            return (
              <tr key={index} style={{ borderBottom: "1px solid #f8fafc", fontSize: "0.8rem", color: "#475569" }}>
                <td style={{ padding: "12px 16px", whiteSpace: "nowrap", fontWeight: "600", color: "#c026d3" }}>{awb}</td>
                <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>{dateStr}</td>
                <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>{item.consignor || "-"}</td>
                <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>{item.consignee || "-"}</td>
                <td style={{ padding: "12px 16px", textTransform: "uppercase", whiteSpace: "nowrap" }}>{item.origin || "-"}</td>
                <td style={{ padding: "12px 16px", textTransform: "uppercase", whiteSpace: "nowrap" }}>{item.destination || "-"}</td>
                <td style={{ padding: "12px 16px", textTransform: "uppercase", whiteSpace: "nowrap", fontWeight: 600 }}>{item.mode || "-"}</td>
                <td style={{ padding: "12px 16px", whiteSpace: "pre-line" }}>{item.invoiceNo || item.invoice || "-"}</td>
                <td style={{ padding: "12px 16px", whiteSpace: "pre-line" }}>{item.invoiceDate || "-"}</td>
                <td style={{ padding: "12px 16px", whiteSpace: "pre-line" }}>{item.partNumber || item.partNo || "-"}</td>
                <td style={{ padding: "12px 16px", whiteSpace: "pre-line" }}>{boxCount}</td>
                <td style={{ padding: "12px 16px", whiteSpace: "pre-line" }}>{item.actualWeight || item.quantity || "-"}</td>
                <td style={{ padding: "12px 16px", whiteSpace: "nowrap", fontWeight: 600 }}>{chgWt}</td>
                <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                  <span style={{
                    padding: "0.25rem 0.6rem", borderRadius: "12px", fontSize: "0.7rem", fontWeight: "700",
                    background: "#f1f5f9", color: "#64748b"
                  }}>
                    {item.status || "SHIPMENT BOOKED"}
                  </span>
                </td>
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
