import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Table from "../../components/Table";
import RupeeIcon from "../../components/RupeeIcon";
import { formatDate } from "../../utils/formatters";
import { 
  Search, 
  RefreshCw, 
  Printer, 

  Package, 
  TrendingUp, 
  FileText, 
  X,
  AlertCircle,
  Download
} from "lucide-react";
import CopyButton, { AwbBadge } from "../../components/CopyButton";
import ExportModal from "../../components/ExportModal";
import { exportUnbilledReport } from "../../utils/excelExport";
import { useSocketSync } from "../../hooks/useSocketSync";

// Robust Date Formatter that handles DD-MM-YYYY, ISO strings, and timestamp objects
const formatRowDate = (dateVal) => {
  if (!dateVal) return "-";
  if (typeof dateVal === "string" && /^\d{2}-\d{2}-\d{4}$/.test(dateVal)) {
    return dateVal; // Already DD-MM-YYYY
  }
  if (typeof dateVal === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(dateVal)) {
    const parts = dateVal.split("/");
    return `${parts[0]}-${parts[1]}-${parts[2]}`;
  }
  const formatted = formatDate(dateVal);
  return formatted !== "-" ? formatted : String(dateVal).split("T")[0] || "-";
};

// Robust Date Object getter for date filter comparisons
const getBookingDateObj = (item) => {
  const d = item.date || item.dispatch_date || item.bookingDate || item.booking_date || item.createdAt || item.created_at;
  if (!d) return null;
  if (typeof d === "string" && /^\d{2}-\d{2}-\d{4}$/.test(d)) {
    const [day, month, year] = d.split("-");
    return new Date(`${year}-${month}-${day}`);
  }
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// Get AWB Number across all possible DB field names
const getAwbNo = (b) => {
  return b.awb || b.consignment || b.awbNo || b.lrNumber || b.lrNo || b.lr_number || (b.id ? String(b.id).slice(-6) : "-");
};

// Get Chargeable Weight across all possible DB field names
const getChargeableWeight = (b) => {
  const val = b.charge_wt || b.chargeable_weight || b.chargeableWeight || b.chargedWeight || b.charged_weight || b.weight || b.actual_wt || b.actualWeight || b.chargeWeight || 0;
  return parseFloat(val) || 0;
};

// Get Box / Package Count across all possible DB field names
const getBoxCount = (b) => {
  let count = parseInt(b.box || b.boxes || b.packages || b.pkg || b.pcs || b.package_count || b.packageCount || b.noOfPackages || b.qty || 0, 10);
  if (!count && b.parcels && Array.isArray(b.parcels)) {
    count = b.parcels.reduce((acc, p) => acc + (parseInt(p.quantity, 10) || 0), 0);
  }
  if (!count && b.dimensions && Array.isArray(b.dimensions)) {
    count = b.dimensions.reduce((acc, d) => acc + (parseInt(d.boxCount, 10) || 0), 0);
  }
  return count || 0;
};

// Get Freight Amount across all possible DB field names
const getFreightAmount = (b) => {
  const val = b.freight_charge || b.freight || b.frieght || b.total_amount || b.amount || b.awb_charge || 0;
  return parseFloat(val) || 0;
};

// Get Billed To / Client across all possible DB field names
const getBilledTo = (b) => {
  return b.client || b.billedTo || b.billed_to || b.billing_party || b.consignor || "-";
};

// Get Mode Badge Styling
const getModeBadge = (mode) => {
  const m = (mode || "ROAD").toUpperCase();
  if (m === "AIR") {
    return { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" };
  } else if (m === "TRAIN" || m === "RAIL") {
    return { bg: "#faf5ff", color: "#6b21a8", border: "#e9d5ff" };
  } else if (m.includes("EXPRESS")) {
    return { bg: "#fff7ed", color: "#9a3412", border: "#fed7aa" };
  }
  return { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" };
};

const UnbilledReports = () => {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({ fr: "", to: "", search: "" });
  const [loading, setLoading] = useState(false);

  const fetchUnbilled = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bookings`);
      if (res.data.success) {
        let bookings = res.data.data || [];
        // Keep only bookings that are NOT billed
        bookings = bookings.filter((b) => b.billed === false || (b.billed !== true && String(b.status || "").toLowerCase() !== "billed"));
        setData(bookings);
      }
    } catch (err) {
      console.error("Fetch unbilled error", err);
    } finally {
      setLoading(false);
    }
  };

  useSocketSync("unbilled", fetchUnbilled);
  useSocketSync("bookings", fetchUnbilled);
  useSocketSync("bills", fetchUnbilled);

  useEffect(() => {
    fetchUnbilled();
  }, []);

  // Compute filtered data based on date range & search filter
  const filteredData = useMemo(() => {
    let list = [...data];

    if (filters.fr) {
      const frDate = new Date(filters.fr);
      list = list.filter((b) => {
        const dObj = getBookingDateObj(b);
        return dObj ? dObj >= frDate : true;
      });
    }

    if (filters.to) {
      const toDate = new Date(filters.to);
      toDate.setHours(23, 59, 59, 999);
      list = list.filter((b) => {
        const dObj = getBookingDateObj(b);
        return dObj ? dObj <= toDate : true;
      });
    }

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter((b) => {
        const awbStr = String(getAwbNo(b)).toLowerCase();
        const clientStr = String(getBilledTo(b)).toLowerCase();
        const consignorStr = String(b.consignor || "").toLowerCase();
        const consigneeStr = String(b.consignee || "").toLowerCase();
        const originStr = String(b.origin || "").toLowerCase();
        const destStr = String(b.destination || "").toLowerCase();
        const remStr = String(b.remarks || b.status || "").toLowerCase();
        return (
          awbStr.includes(q) ||
          clientStr.includes(q) ||
          consignorStr.includes(q) ||
          consigneeStr.includes(q) ||
          originStr.includes(q) ||
          destStr.includes(q) ||
          remStr.includes(q)
        );
      });
    }

    return list;
  }, [data, filters]);

  // Compute Summary Statistics
  const stats = useMemo(() => {
    const totalBookings = filteredData.length;
    const totalBoxes = filteredData.reduce((acc, b) => acc + getBoxCount(b), 0);
    const totalWeight = filteredData.reduce((acc, b) => acc + getChargeableWeight(b), 0);
    const totalFreight = filteredData.reduce((acc, b) => acc + getFreightAmount(b), 0);
    return { totalBookings, totalBoxes, totalWeight, totalFreight };
  }, [filteredData]);

  const handleClearFilters = () => {
    setFilters({ fr: "", to: "", search: "" });
  };

  // Selection State
  const [selectedUnbilledIds, setSelectedUnbilledIds] = useState([]);

  const handleToggleSelectUnbilled = (id) => {
    if (id === undefined || id === null) return;
    setSelectedUnbilledIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (filteredData.length === 0) return;
    setShowExportModal(true);
  };

  const handleExecuteExport = async ({ format }) => {
    try {
      setIsExporting(true);
      let dataToExport = filteredData;
      if (selectedUnbilledIds.length > 0) {
        dataToExport = filteredData.filter((b, idx) => selectedUnbilledIds.includes(b.id || b._id || getAwbNo(b) || idx));
      }
      await exportUnbilledReport({
        unbilled: dataToExport,
        format,
        dateRange: { startDate: filters.fr, endDate: filters.to },
      });
      setShowExportModal(false);
    } catch (err) {
      console.error("Export error", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ paddingBottom: "3rem" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: "16px",
          padding: "1.75rem 2rem",
          marginBottom: "1.75rem",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(59, 130, 246, 0.2)",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#60a5fa",
              }}
            >
              <FileText size={22} />
            </div>
            <span
              style={{
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
                color: "#93c5fd",
                background: "rgba(59, 130, 246, 0.15)",
                padding: "0.25rem 0.75rem",
                borderRadius: "999px",
                border: "1px solid rgba(59, 130, 246, 0.3)",
              }}
            >
              Finance & LR Register
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
            Unbilled Bookings (LR) Report
          </h2>
          <p style={{ margin: "0.35rem 0 0 0", color: "#94a3b8", fontSize: "0.95rem" }}>
            Complete audit register of pending LRs not yet converted into tax invoices.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={fetchUnbilled}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              padding: "0.65rem 1.15rem",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "#3b82f6",
              border: "none",
              color: "#ffffff",
              padding: "0.65rem 1.25rem",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
            }}
          >
            <Printer size={16} />
            Print Report
          </button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.75rem",
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: "1.25rem 1.5rem",
            borderRadius: "14px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#eff6ff",
              color: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Pending LRs
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>
              {stats.totalBookings.toLocaleString()}
            </div>
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: "1.25rem 1.5rem",
            borderRadius: "14px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#f0fdf4",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Package size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Total Boxes / Pkg
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>
              {stats.totalBoxes.toLocaleString()}
            </div>
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: "1.25rem 1.5rem",
            borderRadius: "14px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#faf5ff",
              color: "#a855f7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Chargeable Weight
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>
              {stats.totalWeight.toLocaleString("en-IN", { maximumFractionDigits: 2 })} <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#64748b" }}>kg</span>
            </div>
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: "1.25rem 1.5rem",
            borderRadius: "14px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#fff7ed",
              color: "#ea580c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <RupeeIcon size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Unbilled Freight Value
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ea580c", display: "flex", alignItems: "center" }}>
              <RupeeIcon size={20} />&nbsp;{stats.totalFreight.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: "1.25rem 1.5rem",
          borderRadius: "14px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 4px -1px rgba(0,0,0,0.02)",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          {/* Live Search */}
          <div style={{ flex: "2 1 280px" }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.4rem", textTransform: "uppercase" }}>
              Search Filter
            </label>
            <div style={{ position: "relative" }}>
              <Search
                size={18}
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
              />
              <input
                type="text"
                placeholder="Search by AWB No, Billed To, Consignor, Consignee, Origin, Destination..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "0.6rem 2.5rem 0.6rem 2.5rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                  outline: "none",
                  background: "#f8fafc",
                  color: "#0f172a",
                }}
              />
              {filters.search && (
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* From Date */}
          <div style={{ flex: "1 1 170px" }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.4rem", textTransform: "uppercase" }}>
              From Date
            </label>
            <input
              type="date"
              min="1947-01-01"
              max="2200-12-31"
              className="form-control"
              value={filters.fr}
              onChange={(e) => setFilters((prev) => ({ ...prev, fr: e.target.value }))}
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.9rem",
                background: "#f8fafc",
                color: "#0f172a",
              }}
            />
          </div>

          {/* To Date */}
          <div style={{ flex: "1 1 170px" }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.4rem", textTransform: "uppercase" }}>
              To Date
            </label>
            <input
              type="date"
              min="1947-01-01"
              max="2200-12-31"
              className="form-control"
              value={filters.to}
              onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.9rem",
                background: "#f8fafc",
                color: "#0f172a",
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="responsive-btn-group" style={{ marginLeft: "auto" }}>
            <button
              onClick={handleExport}
              disabled={filteredData.length === 0}
              style={{
                background: "#e2e8f0",
                border: "none",
                color: "#475569",
                padding: "0.6rem 1rem",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: filteredData.length === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                opacity: filteredData.length === 0 ? 0.5 : 1
              }}
            >
              <Download size={16} /> Export CSV
            </button>
            {(filters.fr || filters.to || filters.search) && (
            <button
              onClick={handleClearFilters}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                color: "#475569",
                padding: "0.6rem 1rem",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <X size={16} /> Clear Filters
            </button>
          )}
          </div>
        </div>
      </div>

      {/* Main Report Table Container */}
      <div
        className="glass-panel"
        style={{
          padding: "1rem",
          borderRadius: "14px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 12px -2px rgba(0,0,0,0.03)",
          overflowX: "auto",
        }}
      >
        <Table
          loading={loading}
          pagination={true}
          headers={[
            <div key="select-all-unbilled-rep" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <input
                type="checkbox"
                checked={filteredData.length > 0 && filteredData.every((b, idx) => selectedUnbilledIds.includes(b.id || b._id || getAwbNo(b) || idx))}
                onChange={() => {
                  const visibleIds = filteredData.map((b, idx) => b.id || b._id || getAwbNo(b) || idx);
                  const allSelected = visibleIds.every(id => selectedUnbilledIds.includes(id));
                  if (allSelected) {
                    setSelectedUnbilledIds(prev => prev.filter(id => !visibleIds.includes(id)));
                  } else {
                    setSelectedUnbilledIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                  }
                }}
                style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }}
                title="Toggle Select All"
              />
            </div>,
            "AWB NO",
            "DATE",
            "CONSIGNOR",
            "CONSIGNEE",
            "ORIGIN",
            "DESTINATION",
            "MODE",
            "BOX",
            "CHARGEABLE WT",
            "BILLED TO / CLIENT",
            "FREIGHT (₹)",
            "REMARKS",
          ]}
          data={filteredData}
          renderRow={(item, index) => {
            const itemId = item.id || item._id || getAwbNo(item) || index;
            const isSelected = selectedUnbilledIds.includes(itemId);
            const awbNo = String(getAwbNo(item)).toUpperCase();
            const dateStr = formatRowDate(item.date || item.dispatch_date || item.bookingDate || item.booking_date || item.createdAt || item.created_at);
            const consignor = String(item.consignor || "-").toUpperCase();
            const consignee = String(item.consignee || "-").toUpperCase();
            const origin = String(item.origin || "-").toUpperCase();
            const destination = String(item.destination || "-").toUpperCase();
            const mode = String(item.mode || "ROAD").toUpperCase();
            const modeBadge = getModeBadge(mode);
            const boxCount = getBoxCount(item);
            const chargeWt = getChargeableWeight(item);
            const billedTo = String(getBilledTo(item)).toUpperCase();
            const freightAmt = getFreightAmount(item);
            const remarks = String(item.remarks || item.remark || item.notes || item.status || "UNBILLED").toUpperCase();

            return (
              <tr
                key={item.id || index}
                style={{
                  borderBottom: "1px solid #f1f5f9",
                  transition: "background-color 0.15s",
                  backgroundColor: isSelected ? "rgba(59, 130, 246, 0.08)" : undefined,
                }}
              >
                {/* SELECT CHECKBOX */}
                <td style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelectUnbilled(itemId)}
                    style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }}
                  />
                </td>

                {/* AWB NO */}
                <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap" }}>
                  <span
                    style={{
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      padding: "0.3rem 0.6rem",
                      borderRadius: "6px",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      letterSpacing: "0.02em",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      textTransform: "uppercase"
                    }}
                  >
                    {awbNo}
                    <CopyButton text={awbNo} size={13} />
                  </span>
                </td>

                {/* DATE */}
                <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap", color: "#334155", fontWeight: 600, fontSize: "0.85rem" }}>
                  {dateStr}
                </td>

                {/* CONSIGNOR */}
                <td
                  style={{
                    padding: "0.85rem 1rem",
                    color: "#1e293b",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    maxWidth: "190px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textTransform: "uppercase"
                  }}
                  title={consignor}
                >
                  {consignor}
                </td>

                {/* CONSIGNEE */}
                <td
                  style={{
                    padding: "0.85rem 1rem",
                    color: "#1e293b",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    maxWidth: "190px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textTransform: "uppercase"
                  }}
                  title={consignee}
                >
                  {consignee}
                </td>

                {/* ORIGIN */}
                <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap", fontWeight: 700, color: "#475569", fontSize: "0.85rem", textTransform: "uppercase" }}>
                  {origin}
                </td>

                {/* DESTINATION */}
                <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap", fontWeight: 700, color: "#0f172a", fontSize: "0.85rem", textTransform: "uppercase" }}>
                  {destination}
                </td>

                {/* MODE */}
                <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap" }}>
                  <span
                    style={{
                      background: modeBadge.bg,
                      color: modeBadge.color,
                      border: `1px solid ${modeBadge.border}`,
                      padding: "0.2rem 0.6rem",
                      borderRadius: "999px",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      textTransform: "uppercase"
                    }}
                  >
                    {mode}
                  </span>
                </td>

                {/* BOX */}
                <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap", fontWeight: 700, color: "#334155", textAlign: "center", fontSize: "0.9rem" }}>
                  {boxCount}
                </td>

                {/* CHARGEABLE WT */}
                <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap", fontWeight: 700, color: "#1e293b", fontSize: "0.9rem" }}>
                  {chargeWt.toLocaleString("en-IN", { maximumFractionDigits: 2 })} <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>KG</span>
                </td>

                {/* BILLED TO / CLIENT */}
                <td
                  style={{
                    padding: "0.85rem 1rem",
                    whiteSpace: "nowrap",
                    fontWeight: 700,
                    color: "#1e3a8a",
                    fontSize: "0.85rem",
                    maxWidth: "200px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textTransform: "uppercase"
                  }}
                  title={billedTo}
                >
                  {billedTo}
                </td>

                {/* FREIGHT (₹) */}
                <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap", fontWeight: 800, color: "#166534", fontSize: "0.9rem" }}>
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    <RupeeIcon size={13} />&nbsp;{freightAmt.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </span>
                </td>

                {/* REMARKS */}
                <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap", color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase" }}>
                  {remarks}
                </td>
              </tr>
            );
          }}
        />
      </div>

      {/* Unified Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Unbilled Shipments Report"
        itemCount={selectedUnbilledIds.length > 0 ? selectedUnbilledIds.length : filteredData.length}
        subtitle={selectedUnbilledIds.length > 0 ? `Exporting ${selectedUnbilledIds.length} selected unbilled shipment(s)` : `Exporting all ${filteredData.length} unbilled shipments`}
        isExporting={isExporting}
        onExport={handleExecuteExport}
      />
    </div>
  );
};

export default UnbilledReports;

