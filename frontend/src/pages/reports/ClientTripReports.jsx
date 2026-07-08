import React, { useState, useEffect } from "react";
import axios from "axios";
import SearchableSelect from "../../components/SearchableSelect";

const ClientTripReports = () => {
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [clients, setClients] = useState([]);
  const [filters, setFilters] = useState({ client: "", fr: "", to: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

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
    setCurrentPage(1);
  };

  const handleSearchBoxChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    applyFilters(allData, filters, val);
    setCurrentPage(1);
  };

  const handleEntriesChange = (e) => {
    setEntriesPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
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

  // Pagination logic
  const totalPages = Math.ceil(data.length / entriesPerPage) || 1;
  const currentData = data.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
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
            <SearchableSelect 
              options={clients} 
              value={filters.client} 
              onChange={(c) => setFilters({ ...filters, client: c })} 
              placeholder="-- Please select the Client --" 
              displayKey="name" 
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "2rem" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem", textTransform: "uppercase" }}>From Date</label>
            <input 
              type="date" 
              value={filters.fr} 
              onChange={(e) => setFilters({ ...filters, fr: e.target.value })} 
              style={{ width: "100%", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", color: "#475569" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem", textTransform: "uppercase" }}>To Date</label>
            <input 
              type="date" 
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "10px" }}>
          <div style={{ fontSize: "0.9rem", color: "#64748b" }}>
            Show 
            <select value={entriesPerPage} onChange={handleEntriesChange} style={{ margin: "0 0.5rem", padding: "0.2rem", border: "1px solid #cbd5e1", borderRadius: "2px" }}>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            entries
          </div>
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
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", borderTop: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Trip No ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Date ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Vehicle Type ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Vehicle No ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Vendor ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Origin ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Destination ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Client ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Description ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Box ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Chargeable Weight ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Amount ⇅</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="12" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading...</td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan="12" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No data found.</td>
                </tr>
              ) : (
                currentData.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: idx % 2 === 0 ? "#f8fafc" : "white" }}>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b" }}>{item.tripNo || "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b" }}>{item.date ? new Date(item.date).toLocaleDateString("en-GB") : "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b" }}>{item.vehicleType || "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b" }}>{item.vehicleNo || "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b" }}>{item.vendor || "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b" }}>{item.origin || "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b" }}>{item.destination || "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b" }}>{item.client || "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", whiteSpace: "pre-line" }}>{item.description || "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b" }}>{item.box || "0"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b" }}>{item.chargeableWeight || "0"} kg</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b" }}>{formatCurrency(item.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "10px", fontSize: "0.85rem", color: "#64748b" }}>
          <div>
            Showing {(currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, data.length)} of {data.length} entries
          </div>
          <div style={{ display: "flex", gap: "0.2rem" }}>
            <button 
              onClick={prevPage}
              disabled={currentPage === 1}
              style={{ padding: "0.4rem 0.8rem", border: "1px solid #cbd5e1", backgroundColor: currentPage === 1 ? "#f1f5f9" : "white", color: currentPage === 1 ? "#94a3b8" : "#334155", cursor: currentPage === 1 ? "not-allowed" : "pointer", borderTopLeftRadius: "4px", borderBottomLeftRadius: "4px" }}
            >
              Previous
            </button>
            <div style={{ padding: "0.4rem 0.8rem", borderTop: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", backgroundColor: "#6366f1", color: "white" }}>
              {currentPage}
            </div>
            <button 
              onClick={nextPage}
              disabled={currentPage === totalPages}
              style={{ padding: "0.4rem 0.8rem", border: "1px solid #cbd5e1", backgroundColor: currentPage === totalPages ? "#f1f5f9" : "white", color: currentPage === totalPages ? "#94a3b8" : "#334155", cursor: currentPage === totalPages ? "not-allowed" : "pointer", borderTopRightRadius: "4px", borderBottomRightRadius: "4px" }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientTripReports;
