import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import CreatableDropdown from "../../components/CreatableDropdown";
import QuickAddModal from "../../components/QuickAddModal";
import Table from "../../components/Table";
import { formatDate } from "../../utils/formatters";
import { Search, Download, Map, Truck, Users, Activity } from "lucide-react";
import RupeeIcon from "../../components/RupeeIcon";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const ClientTripReports = () => {
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [clients, setClients] = useState([]);
  const [filters, setFilters] = useState({ client: "", fr: "", to: "" });
  const [searchQuery, setSearchQuery] = useState("");
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
    fetchTrips();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API}/clients`);
      if (res.data.success) {
        setClients(res.data.data || []);
      }
    } catch (err) {
      console.error("Fetch clients error", err);
    }
  };

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/trips`);
      if (res.data.success) {
        let trips = res.data.data || [];
        setAllData(trips);
        applyFilters(trips, filters, searchQuery);
      }
    } catch (err) {
      console.error("Fetch trips error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchFilter = (e) => {
    if (e) e.preventDefault();
    applyFilters(allData, filters, searchQuery);
  };

  const handleSearchBoxChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    applyFilters(allData, filters, val);
  };

  const applyFilters = (entries, currentFilters, query) => {
    let filtered = [...entries];

    if (currentFilters.client) {
      const clientName = currentFilters.client.name || currentFilters.client;
      filtered = filtered.filter(e => e.client === clientName);
    }
    if (currentFilters.fr) {
      filtered = filtered.filter(e => new Date(e.date) >= new Date(currentFilters.fr));
    }
    if (currentFilters.to) {
      filtered = filtered.filter(e => new Date(e.date) <= new Date(currentFilters.to));
    }
    if (query) {
      const lowerQ = query.toLowerCase();
      filtered = filtered.filter(e => 
        (e.tripNo || "").toLowerCase().includes(lowerQ) ||
        (e.vehicleNo || "").toLowerCase().includes(lowerQ) ||
        (e.origin || "").toLowerCase().includes(lowerQ) ||
        (e.destination || "").toLowerCase().includes(lowerQ)
      );
    }

    setData(filtered);
  };

  const stats = useMemo(() => {
    const totalTrips = data.length;
    const totalBoxes = data.reduce((s, t) => s + parseInt(t.box || 0), 0);
    const totalAmount = data.reduce((s, t) => s + parseFloat(t.amount || t.totalAmount || 0), 0);
    return { totalTrips, totalBoxes, totalAmount };
  }, [data]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const handleExport = () => {
    if (data.length === 0) return;
    const headers = ["Trip No", "Date", "Vehicle Type", "Vehicle No", "Vendor", "Origin", "Destination", "Client", "Description", "Box", "Chg. Wt", "Total"];
    const csvContent = [
      headers.join(","),
      ...data.map(row => {
        const dateStr = row.date ? formatDate(row.date) : "";
        return [
          `"${row.tripNo || ""}"`,
          `"${dateStr}"`,
          `"${row.vehicleType || ""}"`,
          `"${row.vehicleNo || ""}"`,
          `"${row.vendor || ""}"`,
          `"${row.origin || ""}"`,
          `"${row.destination || ""}"`,
          `"${row.client || ""}"`,
          `"${row.description || ""}"`,
          row.box || "0",
          row.chargeableWeight || "0",
          parseFloat(row.amount || row.totalAmount || 0).toFixed(2)
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Client_Trip_Report.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          <div style={{ background: "#ecfeff", padding: "8px", borderRadius: "10px", display: "flex" }}>
            <Map size={22} style={{ color: "#06b6d4" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, color: "#0f172a" }}>
              Client Trip Report
            </h3>
            <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 500 }}>
              Monitor ongoing and completed trips associated with specific clients
            </span>
          </div>
        </div>
      </div>

      {/* SEARCH FORM */}
      <form onSubmit={handleSearchFilter} style={{
          backgroundColor: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          marginBottom: "1.5rem",
          overflow: "hidden"
      }}>
        <div style={{ background: "linear-gradient(90deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)", height: "4px", width: "100%" }} />
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
                placeholder="Search Trips, Vehicle..."
                value={searchQuery}
                onChange={handleSearchBoxChange}
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
              <button type="button" style={{ backgroundColor: "#06b6d4", color: "white", border: "none", padding: "0.65rem 1rem", borderRadius: "8px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer", boxShadow: "0 2px 4px rgba(6, 182, 212, 0.2)" }}>
                CLIENT TRIP REPORT
              </button>
              <button type="button" style={{ backgroundColor: "#10b981", color: "white", border: "none", padding: "0.65rem 1rem", borderRadius: "8px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer", boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)" }}>
                GENERATE INVOICE
              </button>
            <button 
              type="submit" 
              style={{
                background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
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
                boxShadow: "0 4px 12px rgba(6, 182, 212, 0.25)",
              }}
            >
              <Search size={16} /> FILTER TRIPS
            </button>
          </div>
        </div>
      </form>

      {/* STATS CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Trips</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", marginTop: "4px", display: "flex", alignItems: "center" }}>
               {stats.totalTrips}
            </div>
          </div>
          <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "12px" }}><Truck size={24} color="#64748b" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Boxes Moved</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#06b6d4", marginTop: "4px", display: "flex", alignItems: "center" }}>
               {stats.totalBoxes}
            </div>
          </div>
          <div style={{ background: "#cffafe", padding: "12px", borderRadius: "12px" }}><Activity size={24} color="#06b6d4" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Trip Value</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0ea5e9", marginTop: "4px", display: "flex", alignItems: "center" }}>
               <RupeeIcon size={24} /> {stats.totalAmount.toFixed(2)}
            </div>
          </div>
          <div style={{ background: "#e0f2fe", padding: "12px", borderRadius: "12px" }}><Users size={24} color="#0ea5e9" /></div>
        </div>
      </div>

      {/* TABLE */}
      <div style={{ background: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>TRIP RECORDS</div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <Table
            loading={loading}
            pagination={true}
            headers={["Trip No", "Date", "Vehicle Type", "Vehicle No", "Vendor", "Origin", "Destination", "Client", "Description", "Box", "Chg. Wt", "Total"]}
            data={data}
            renderRow={(item, idx) => (
              <tr key={item.id || idx} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: idx % 2 === 0 ? "#f8fafc" : "white" }}>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#0891b2", fontWeight: 600, whiteSpace: "nowrap" }}>{item.tripNo || "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", whiteSpace: "nowrap" }}>{item.date ? formatDate(item.date) : "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", whiteSpace: "nowrap" }}>{item.vehicleType || "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", whiteSpace: "nowrap", fontWeight: 600 }}>{item.vehicleNo || "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", whiteSpace: "nowrap" }}>{item.vendor || "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", whiteSpace: "nowrap" }}>{item.origin || "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", whiteSpace: "nowrap" }}>{item.destination || "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#0f172a", fontWeight: 600, whiteSpace: "nowrap" }}>{item.client || "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", whiteSpace: "pre-line", minWidth: "150px" }}>{item.description || "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", whiteSpace: "nowrap" }}>{item.box || "0"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", whiteSpace: "nowrap" }}>{item.chargeableWeight || "0"} kg</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#0f172a", fontWeight: 700, whiteSpace: "nowrap" }}>{formatCurrency(item.amount || item.totalAmount)}</td>
              </tr>
            )}
          />
        </div>
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

export default ClientTripReports;
