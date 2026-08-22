import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Search, Download, RefreshCw, FileText, Calendar, Filter, X } from 'lucide-react';
import RupeeIcon from '../components/RupeeIcon';
import Table from '../components/Table';
import { toExportCaps } from "../utils/excelExport";
import { formatDate } from "../utils/formatters";
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const GST = () => {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({ fr: "", to: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const { addToast } = useToast();

  const fetchGST = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.fr) params.fr = filters.fr;
      if (filters.to) params.to = filters.to;

      const authToken = token || localStorage.getItem('token');
      const res = await axios.get(`${API}/reports/gst`, {
        params,
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      if (res.data.success) {
        setData(res.data.data || []);
      }
    } catch (err) {
      console.error("Fetch GST error", err);
      addToast("Failed to load GST tax report", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGST();
    // eslint-disable-next-line
  }, [filters.fr, filters.to]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();
    return data.filter(row => 
      (row.client && row.client.toLowerCase().includes(q)) ||
      (row.invoice && row.invoice.toLowerCase().includes(q)) ||
      (row.gstin && row.gstin.toLowerCase().includes(q)) ||
      (row.date && row.date.toLowerCase().includes(q))
    );
  }, [data, searchQuery]);

  const summary = useMemo(() => {
    let taxable = 0;
    let igst = 0;
    let cgst = 0;
    let sgst = 0;
    let totalTax = 0;
    let total = 0;

    filteredData.forEach(r => {
      taxable += parseFloat(r.taxable || 0);
      igst += parseFloat(r.igst || 0);
      cgst += parseFloat(r.cgst || 0);
      sgst += parseFloat(r.sgst || 0);
      totalTax += parseFloat(r.totalTax || 0);
      total += parseFloat(r.total || 0);
    });

    return { taxable, igst, cgst, sgst, totalTax, total, count: filteredData.length };
  }, [filteredData]);

  const handleExport = () => {
    if (filteredData.length === 0) {
      addToast("No GST report data available to export", "warning");
      return;
    }
    const headers = ["DATE", "INVOICE NO", "CLIENT", "GSTIN", "SAC/HSN", "TAXABLE VALUE", "IGST", "CGST", "SGST", "TOTAL TAX", "GRAND TOTAL"];
    const csvContent = [
      headers.map(h => toExportCaps(h)).join(","),
      ...filteredData.map(row => [
        toExportCaps(row.date || ""),
        toExportCaps(row.invoice || ""),
        `"${toExportCaps(row.client || "")}"`,
        toExportCaps(row.gstin || ""),
        toExportCaps(row.sac || ""),
        (parseFloat(row.taxable) || 0).toFixed(2),
        (parseFloat(row.igst) || 0).toFixed(2),
        (parseFloat(row.cgst) || 0).toFixed(2),
        (parseFloat(row.sgst) || 0).toFixed(2),
        (parseFloat(row.totalTax) || 0).toFixed(2),
        (parseFloat(row.total) || 0).toFixed(2)
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `GST_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("GST Report CSV downloaded successfully", "success");
  };

  const handleDatePreset = (preset) => {
    const today = new Date();
    if (preset === 'this_month') {
      const fr = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      const to = today.toISOString().slice(0, 10);
      setFilters({ fr, to });
    } else if (preset === 'last_month') {
      const fr = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 10);
      const to = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0, 10);
      setFilters({ fr, to });
    } else if (preset === 'all') {
      setFilters({ fr: '', to: '' });
    }
  };

  return (
    <div className="page-content" style={{ padding: "clamp(0.75rem, 2vw, 1.5rem)" }}>
      {/* Enterprise Unified Toolbar */}
      <div style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "0.85rem 1.15rem",
        marginBottom: "1rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }}>
        {/* Title Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.6rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "clamp(1.1rem, 2.2vw, 1.35rem)", color: "#0f172a", fontWeight: 800, letterSpacing: "-0.02em" }}>
              GST Tax Report (GSTR-1)
            </h3>
            <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 500 }}>
              Sales tax liability, GSTIN breakdown & compliance register
            </span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#1e40af", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "3px 10px", borderRadius: "12px", fontWeight: 700 }}>
            {filteredData.length} Invoices Found
          </span>
        </div>

        {/* Line 1: Search + Export + Refresh */}
        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.65rem" }}>
          <div style={{ position: "relative", flex: "1 1 240px", minWidth: "200px" }}>
            <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input 
              type="text"
              placeholder="Search by client, invoice no, GSTIN..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                height: "36px",
                padding: "0 10px 0 32px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.82rem",
                outline: "none",
                background: "#f8fafc"
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "2px" }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
            <button
              onClick={handleExport}
              style={{
                height: "36px",
                padding: "0 0.85rem",
                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                border: "none",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                boxShadow: "0 2px 4px rgba(16, 185, 129, 0.25)"
              }}
            >
              <Download size={15} /> Export GST CSV
            </button>

            <button
              onClick={fetchGST}
              disabled={loading}
              style={{
                height: "36px",
                padding: "0 0.75rem",
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                color: "#475569",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
              title="Refresh GST data"
            >
              <RefreshCw size={14} className={loading ? "spin-animation" : ""} />
            </button>
          </div>
        </div>

        {/* Line 2: Single Date Filter Row */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", background: "#f8fafc", padding: "0.45rem 0.65rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
            <Calendar size={14} color="#3b82f6" />
            <span>Date Filter:</span>
          </div>

          <input 
            type="date"
            value={filters.fr}
            onChange={e => setFilters({ ...filters, fr: e.target.value })}
            style={{ height: "30px", padding: "0 6px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem", background: "#fff" }}
          />
          <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>—</span>
          <input 
            type="date"
            value={filters.to}
            onChange={e => setFilters({ ...filters, to: e.target.value })}
            style={{ height: "30px", padding: "0 6px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem", background: "#fff" }}
          />

          {/* Quick Presets */}
          <div style={{ display: "flex", gap: "4px", marginLeft: "auto", flexWrap: "wrap" }}>
            <button 
              type="button"
              onClick={() => handleDatePreset('this_month')}
              style={{ fontSize: "0.72rem", padding: "2px 7px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#fff", color: "#334155", cursor: "pointer", fontWeight: 600 }}
            >
              This Month
            </button>
            <button 
              type="button"
              onClick={() => handleDatePreset('last_month')}
              style={{ fontSize: "0.72rem", padding: "2px 7px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#fff", color: "#334155", cursor: "pointer", fontWeight: 600 }}
            >
              Last Month
            </button>
            <button 
              type="button"
              onClick={() => handleDatePreset('all')}
              style={{ fontSize: "0.72rem", padding: "2px 7px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#fff", color: "#334155", cursor: "pointer", fontWeight: 600 }}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* GST Summary KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.75rem 1rem", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Taxable Sales</span>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
            <RupeeIcon size={14} style={{ marginRight: "1px" }} />
            {summary.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.75rem 1rem", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total IGST</span>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#3b82f6", marginTop: "2px" }}>
            <RupeeIcon size={14} style={{ marginRight: "1px" }} />
            {summary.igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.75rem 1rem", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>CGST + SGST</span>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#8b5cf6", marginTop: "2px" }}>
            <RupeeIcon size={14} style={{ marginRight: "1px" }} />
            {(summary.cgst + summary.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.75rem 1rem", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Tax (Output)</span>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#ea580c", marginTop: "2px" }}>
            <RupeeIcon size={14} style={{ marginRight: "1px" }} />
            {summary.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.75rem 1rem", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Gross Invoice Value</span>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#16a34a", marginTop: "2px" }}>
            <RupeeIcon size={14} style={{ marginRight: "1px" }} />
            {summary.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Main GST Table */}
      <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <Table
          loading={loading}
          pagination={true}
          headers={["Date", "Invoice No", "Client", "GSTIN", "SAC/HSN", "Taxable Value", "IGST", "CGST", "SGST", "Total Tax", "Grand Total"]}
          data={filteredData}
          renderRow={(item, index) => (
            <tr key={index} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>{formatDate(item.date)}</td>
              <td style={{ whiteSpace: "nowrap", fontWeight: 700, color: "#1e3a8a", fontSize: "0.82rem" }}>{item.invoice || "-"}</td>
              <td style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0f172a" }}>{item.client || "-"}</td>
              <td style={{ whiteSpace: "nowrap", fontSize: "0.78rem", color: "#64748b", fontFamily: "monospace" }}>{item.gstin || "-"}</td>
              <td style={{ whiteSpace: "nowrap", fontSize: "0.78rem", color: "#64748b" }}>{item.sac || "996511"}</td>
              <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                <span style={{ display: "inline-flex", alignItems: "center" }}><RupeeIcon size={13} />&nbsp;{parseFloat(item.taxable || 0).toFixed(2)}</span>
              </td>
              <td style={{ whiteSpace: "nowrap", color: "#3b82f6" }}>
                <span style={{ display: "inline-flex", alignItems: "center" }}><RupeeIcon size={13} />&nbsp;{parseFloat(item.igst || 0).toFixed(2)}</span>
              </td>
              <td style={{ whiteSpace: "nowrap", color: "#8b5cf6" }}>
                <span style={{ display: "inline-flex", alignItems: "center" }}><RupeeIcon size={13} />&nbsp;{parseFloat(item.cgst || 0).toFixed(2)}</span>
              </td>
              <td style={{ whiteSpace: "nowrap", color: "#8b5cf6" }}>
                <span style={{ display: "inline-flex", alignItems: "center" }}><RupeeIcon size={13} />&nbsp;{parseFloat(item.sgst || 0).toFixed(2)}</span>
              </td>
              <td style={{ whiteSpace: "nowrap", fontWeight: 700, color: "#ea580c" }}>
                <span style={{ display: "inline-flex", alignItems: "center" }}><RupeeIcon size={13} />&nbsp;{parseFloat(item.totalTax || 0).toFixed(2)}</span>
              </td>
              <td style={{ whiteSpace: "nowrap", fontWeight: 800, color: "#16a34a" }}>
                <span style={{ display: "inline-flex", alignItems: "center" }}><RupeeIcon size={13} />&nbsp;{parseFloat(item.total || 0).toFixed(2)}</span>
              </td>
            </tr>
          )}
        />
      </div>
    </div>
  );
};

export default GST;
