import React, { useState, useEffect } from "react";
import axios from "axios";
import { Search, Edit, Trash2 } from "lucide-react";

const CashsheetReports = () => {
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [filters, setFilters] = useState({ fr: "", to: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchCash();
  }, []);

  const fetchCash = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/cash`);
      if (res.data.success) {
        let entries = res.data.data || [];
        setAllData(entries);
        applyFilters(entries, filters, searchQuery);
      }
    } catch (err) {
      console.error("Fetch cash error", err);
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

  const applyFilters = (entries, currentFilters, query) => {
    let filtered = [...entries];

    if (currentFilters.fr) {
      filtered = filtered.filter(e => new Date(e.date) >= new Date(currentFilters.fr));
    }
    if (currentFilters.to) {
      filtered = filtered.filter(e => new Date(e.date) <= new Date(currentFilters.to));
    }
    if (query) {
      const lowerQ = query.toLowerCase();
      filtered = filtered.filter(e => 
        (e.remarks || "").toLowerCase().includes(lowerQ) ||
        (e.amount?.toString() || "").includes(lowerQ)
      );
    }

    setData(filtered);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this cash entry?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/cash/${id}`);
      fetchCash();
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  // Calculations
  const totalCashIn = data.reduce((sum, item) => (item.type === "in" || item.type === "income") ? sum + parseFloat(item.amount || 0) : sum, 0);
  const totalCashOut = data.reduce((sum, item) => (item.type === "out" || item.type === "expense") ? sum + parseFloat(item.amount || 0) : sum, 0);

  // Pagination logic
  const totalPages = Math.ceil(data.length / itemsPerPage) || 1;
  const currentData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "20px" }}>
      {/* Title */}
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.6rem", color: "#64748b", margin: 0, fontWeight: "500" }}>Cash Sheet Report</h3>
      </div>

      {/* Date Filters */}
      <div style={{ display: "flex", gap: "2rem", marginBottom: "1.5rem" }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem", textTransform: "uppercase" }}>From Date</label>
          <div style={{ position: "relative" }}>
            <input 
              type="date" 
              value={filters.fr} 
              onChange={(e) => setFilters({ ...filters, fr: e.target.value })} 
              style={{ width: "100%", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", color: "#475569" }}
            />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem", textTransform: "uppercase" }}>To Date</label>
          <div style={{ position: "relative" }}>
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

      {/* Table Section */}
      <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "4px" }}>
        {/* Table Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ backgroundColor: "#6366f1", color: "white", padding: "0.4rem 1rem", fontSize: "0.85rem", fontWeight: "600", borderRadius: "2px" }}>
            CASH SHEET REPORT
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#64748b" }}>Search Box:</label>
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
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>#</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Date</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Particulars</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Vouchers</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Cash In</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Cash Out</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading...</td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No data found.</td>
                </tr>
              ) : (
                currentData.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "12px", fontSize: "0.9rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.9rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>
                      {item.date ? new Date(item.date).toLocaleDateString("en-GB") : "-"}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.9rem", color: "#64748b", borderRight: "1px solid #e2e8f0", textTransform: "uppercase" }}>
                      {item.remarks || "-"}
                    </td>
                    <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0" }}>
                      <button style={{ backgroundColor: "#6366f1", border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer" }}>
                        <Edit size={16} />
                      </button>
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.9rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>
                      {(item.type === "in" || item.type === "income") ? parseFloat(item.amount || 0).toFixed(2) : ""}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.9rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>
                      {(item.type === "out" || item.type === "expense") ? parseFloat(item.amount || 0).toFixed(2) : ""}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        style={{ backgroundColor: "#ef4444", border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
              {/* Summary Row */}
              {!loading && currentData.length > 0 && (
                <tr style={{ backgroundColor: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                  <td colSpan="4" style={{ padding: "12px", borderRight: "1px solid #e2e8f0" }}></td>
                  <td style={{ padding: "12px", fontSize: "0.9rem", fontWeight: "600", color: "#334155", borderRight: "1px solid #e2e8f0" }}>
                    {totalCashIn > 0 ? totalCashIn.toFixed(2) : "0"}
                  </td>
                  <td style={{ padding: "12px", fontSize: "0.9rem", fontWeight: "600", color: "#334155", borderRight: "1px solid #e2e8f0" }}>
                    {totalCashOut > 0 ? totalCashOut.toFixed(2) : "0"}
                  </td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", padding: "1rem", gap: "0.5rem", fontSize: "0.85rem", color: "#64748b" }}>
          <button 
            onClick={prevPage}
            disabled={currentPage === 1}
            style={{ padding: "0.2rem 0.5rem", border: "1px solid #cbd5e1", backgroundColor: "white", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
          >
            Prev
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button 
            onClick={nextPage}
            disabled={currentPage === totalPages}
            style={{ padding: "0.2rem 0.5rem", border: "1px solid #cbd5e1", backgroundColor: "white", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default CashsheetReports;
