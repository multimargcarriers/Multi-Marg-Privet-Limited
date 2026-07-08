import React, { useState, useEffect } from "react";
import axios from "axios";
import { Activity, AlertTriangle, Info, Shield, RefreshCw } from "lucide-react";

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/logs`, {
        withCredentials: true // Requires admin auth cookie
      });
      if (res.data.success) {
        setLogs(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filter !== "ALL" && log.level.toLowerCase() !== filter.toLowerCase()) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "20px" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h3 style={{ fontSize: '1.8rem', color: '#0f172a', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={24} color="#6366f1" /> System Logs
          </h3>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Real-time database-backed application logs (SuperAdmin Only)</p>
        </div>
        <button 
          onClick={fetchLogs} 
          style={{ padding: '0.6rem 1.2rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: '500', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px 8px 0 0", padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            onClick={() => setFilter("ALL")}
            style={{ padding: "0.4rem 1rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", border: filter === "ALL" ? "none" : "1px solid #e2e8f0", backgroundColor: filter === "ALL" ? "#475569" : "transparent", color: filter === "ALL" ? "white" : "#64748b" }}
          >
            All Logs
          </button>
          <button 
            onClick={() => setFilter("ERROR")}
            style={{ padding: "0.4rem 1rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", border: filter === "ERROR" ? "none" : "1px solid #e2e8f0", backgroundColor: filter === "ERROR" ? "#ef4444" : "transparent", color: filter === "ERROR" ? "white" : "#64748b", display: "flex", alignItems: "center", gap: "0.25rem" }}
          >
            <AlertTriangle size={14} /> Errors
          </button>
          <button 
            onClick={() => setFilter("INFO")}
            style={{ padding: "0.4rem 1rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", border: filter === "INFO" ? "none" : "1px solid #e2e8f0", backgroundColor: filter === "INFO" ? "#3b82f6" : "transparent", color: filter === "INFO" ? "white" : "#64748b", display: "flex", alignItems: "center", gap: "0.25rem" }}
          >
            <Info size={14} /> Info
          </button>
        </div>
        
        <div>
          <input 
            type="text" 
            placeholder="Search message..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "0.5rem 1rem", borderRadius: "20px", border: "1px solid #cbd5e1", fontSize: "0.85rem", width: "250px", outline: "none" }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 8px 8px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontFamily: "monospace" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "12px 1.5rem", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", width: "180px" }}>Timestamp</th>
              <th style={{ padding: "12px 1.5rem", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", width: "100px" }}>Level</th>
              <th style={{ padding: "12px 1.5rem", fontSize: "0.85rem", color: "#64748b", fontWeight: "600" }}>Message</th>
              <th style={{ padding: "12px 1.5rem", fontSize: "0.85rem", color: "#64748b", fontWeight: "600" }}>Meta / Stack</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
                  <Activity size={24} className="animate-spin" style={{ margin: "0 auto 1rem auto" }} />
                  Loading Logs...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
                  No logs found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id || Math.random()} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 1.5rem", fontSize: "0.85rem", color: "#64748b" }}>
                    {log.timestamp}
                  </td>
                  <td style={{ padding: "12px 1.5rem" }}>
                    <span style={{ 
                      padding: "0.2rem 0.6rem", 
                      borderRadius: "4px", 
                      fontSize: "0.75rem", 
                      fontWeight: "700",
                      backgroundColor: log.level === "error" ? "#fef2f2" : "#eff6ff",
                      color: log.level === "error" ? "#ef4444" : "#3b82f6"
                    }}>
                      {log.level.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "12px 1.5rem", fontSize: "0.85rem", color: "#334155", fontWeight: "500" }}>
                    {log.message}
                  </td>
                  <td style={{ padding: "12px 1.5rem", fontSize: "0.8rem", color: "#94a3b8", maxWidth: "400px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.stack ? (
                      <span style={{ color: "#ef4444" }}>{log.stack.split('\n')[0]}</span>
                    ) : log.meta ? (
                      JSON.stringify(log.meta)
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SystemLogs;
