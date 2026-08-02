import React, { useState, useEffect } from "react";
import axios from "axios";
import CreatableDropdown from "../../components/CreatableDropdown";
import QuickAddModal from "../../components/QuickAddModal";
import Table from "../../components/Table";
import { formatDate } from "../../utils/formatters";

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
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/clients`);
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
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/trips`);
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

  const handleSearchFilter = () => {
    applyFilters(allData, filters, searchQuery);
  };

  const handleSearchBoxChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    applyFilters(allData, filters, val);
  };

  const applyFilters = (trips, currentFilters, query) => {
    let filtered = [...trips];

    if (currentFilters.client) {
      const clientName = currentFilters.client.name || currentFilters.client;
      filtered = filtered.filter(t => t.client === clientName);
    }
    if (currentFilters.fr) {
      filtered = filtered.filter(t => new Date(t.date || t.createdAt) >= new Date(currentFilters.fr));
    }
    if (currentFilters.to) {
      filtered = filtered.filter(t => new Date(t.date || t.createdAt) <= new Date(currentFilters.to));
    }
    if (query) {
      const lowerQ = query.toLowerCase();
      filtered = filtered.filter(t => 
        (t.vendor || "").toLowerCase().includes(lowerQ) ||
        (t.client || "").toLowerCase().includes(lowerQ) ||
        (t.tripNo || "").toString().includes(lowerQ) ||
        (t.description || "").toLowerCase().includes(lowerQ)
      );
    }

    setData(filtered);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "20px" }}>
      {/* Title */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "1.6rem", color: "#64748b", margin: 0, fontWeight: "500" }}>Client Trip Report</h3>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem", textTransform: "uppercase" }}>Client</label>
          <div style={{ maxWidth: "100%" }}>
            <CreatableDropdown 
              options={clients} 
              value={filters.client} 
              onChange={(c) => setFilters({ ...filters, client: c })} 
              onCreate={(name) => handleCreateNew("client", name)}
              placeholder="-- Please select the Client --" 
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "2rem" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem", textTransform: "uppercase" }}>From Date</label>
            <input 
              type="date" min="1947-01-01" max="2200-12-31" 
              value={filters.fr} 
              onChange={(e) => setFilters({ ...filters, fr: e.target.value })} 
              style={{ width: "100%", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", color: "#475569" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem", textTransform: "uppercase" }}>To Date</label>
            <input 
              type="date" min="1947-01-01" max="2200-12-31" 
              value={filters.to} 
              onChange={(e) => setFilters({ ...filters, to: e.target.value })} 
              style={{ width: "100%", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", color: "#475569" }}
            />
          </div>
        </div>
      </div>
      
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
        <button 
          onClick={handleSearchFilter}
          style={{ backgroundColor: "#6366f1", color: "white", border: "none", padding: "0.5rem 2rem", borderRadius: "4px", fontWeight: "500", cursor: "pointer", textTransform: "uppercase", fontSize: "0.9rem" }}
        >
          Search
        </button>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button style={{ backgroundColor: "#6366f1", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "2px", fontWeight: "600", fontSize: "0.8rem" }}>
          CLIENT TRIP REPORT
        </button>
        <button style={{ backgroundColor: "#10b981", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "2px", fontWeight: "600", fontSize: "0.8rem" }}>
          GENERATE INVOICE
        </button>
      </div>

      {/* Table Section */}
      <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "10px" }}>
        {/* Table Toolbar */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", paddingBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.9rem", color: "#64748b" }}>Search:</label>
            <input 
              type="text" 
              value={searchQuery}
              onChange={handleSearchBoxChange}
              style={{ border: "1px solid #cbd5e1", padding: "0.25rem 0.5rem", borderRadius: "2px", width: "200px" }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <Table
            loading={loading}
            pagination={true}
            headers={["Trip No", "Date", "Vehicle Type", "Vehicle No", "Vendor", "Origin", "Destination", "Client", "Description", "Box", "Chargeable Weight", "Total Amount"]}
            data={data}
            renderRow={(item, idx) => (
              <tr key={item.id || idx} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: idx % 2 === 0 ? "#f8fafc" : "white" }}>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", whiteSpace: "nowrap" }}>{item.tripNo || "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", whiteSpace: "nowrap" }}>{item.date ? formatDate(item.date) : "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", whiteSpace: "nowrap" }}>{item.vehicleType || "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", whiteSpace: "nowrap" }}>{item.vehicleNo || "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", whiteSpace: "nowrap" }}>{item.vendor || "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", whiteSpace: "nowrap" }}>{item.origin || "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", whiteSpace: "nowrap" }}>{item.destination || "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", whiteSpace: "nowrap" }}>{item.client || "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", whiteSpace: "pre-line" }}>{item.description || "-"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", whiteSpace: "nowrap" }}>{item.box || "0"}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", whiteSpace: "nowrap" }}>{item.chargeableWeight || "0"} kg</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", whiteSpace: "nowrap" }}>{formatCurrency(item.amount || item.totalAmount)}</td>
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
