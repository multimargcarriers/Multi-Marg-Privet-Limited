import React, { useState, useEffect, useContext, useMemo } from "react";
import axios from "axios";
import { Search, Eye, Printer, Trash2, Edit, ChevronLeft, ChevronRight, PackageOpen, FileCheck, Package, IndianRupee, Box, FileText, Clock, Download, Copy, Check, Truck, Calendar, X, MapPin, CheckCircle2 } from "lucide-react";
import { TablePageSkeleton } from '../components/SkeletonLoader';
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import RupeeIcon from '../components/RupeeIcon';
import { formatDate, getSafeCloudinaryPdfUrl } from '../utils/formatters';
import CsvImportExport from "../components/CsvImportExport";
import StatsPanel from "../components/StatsPanel";
import PodEntryModal from "../components/pod/PodEntryModal";
import BoxEntryModal from "../components/box/BoxEntryModal";
import TrackingUpdateModal from "../components/TrackingUpdateModal";
import { AnimatePresence } from "framer-motion";
import { useSocketSync } from '../hooks/useSocketSync';
import { BadgeContext } from "../context/BadgeContext";
import { SettingsContext } from "../context/SettingsContext";
import SortDropdown from "../components/SortDropdown";
import useTableSort from "../hooks/useTableSort";
import { useSync } from "../context/SyncContext";
import { useToast } from "../context/ToastContext";
import ExportModal from "../components/ExportModal";
import { exportBookingsList } from "../utils/excelExport";

const BookingsList = () => {
  const { syncQueue } = useSync();
  const { user, hasPermission } = useContext(AuthContext);
  const { globalSettings } = useContext(SettingsContext);
  const { clearBadge } = useContext(BadgeContext);
  const { confirm } = useDialog();
  const { addToast } = useToast();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimarg.com';
  const canAccessPod = isSuperAdmin || user?.role === 'Admin' || user?.permissions?.includes('pod') || true;

  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // POD modal state & lookup map
  const [podModalOpen, setPodModalOpen] = useState(false);
  const [selectedBookingForPod, setSelectedBookingForPod] = useState(null);
  const [podMap, setPodMap] = useState({});
  const [trackingMap, setTrackingMap] = useState({});
  const [copiedAwb, setCopiedAwb] = useState(null);

  // Tracking modal state
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [selectedBookingForTracking, setSelectedBookingForTracking] = useState(null);
  const [bulkBookingsForTracking, setBulkBookingsForTracking] = useState([]);

  const handleCopyAwb = (e, awbStr) => {
    e.stopPropagation();
    navigator.clipboard.writeText(awbStr);
    setCopiedAwb(awbStr);
    setTimeout(() => setCopiedAwb(null), 2000);
  };

  // Box modal state & lookup map
  const [boxModalOpen, setBoxModalOpen] = useState(false);
  const [selectedBookingForBox, setSelectedBookingForBox] = useState(null);
  const [boxMap, setBoxMap] = useState({});

  // Selection state
  const [selectedBookingIds, setSelectedBookingIds] = useState([]);

  const handleToggleSelectBooking = (id) => {
    if (!id) return;
    setSelectedBookingIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExecuteExport = async ({ format }) => {
    try {
      setIsExporting(true);
      let dataToExport = sortedData;
      if (selectedBookingIds.length > 0) {
        dataToExport = sortedData.filter(b => selectedBookingIds.includes(b.id || b._id));
      }
      await exportBookingsList({
        bookings: dataToExport,
        format,
        dateRange: { startDate, endDate },
      });
      setShowExportModal(false);
    } catch (err) {
      console.error("Export error", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Local Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(50);

  const navigate = useNavigate();

  useEffect(() => {
    fetchAllData();
    clearBadge("bookings");
  }, []);

  const fetchAllData = async () => {
    if (bookings.length === 0) setLoading(true);
    try {
      const [bookingsRes, podRes, boxRes, trackingRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bookings`),
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/pod`).catch(() => ({ data: { data: [] } })),
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/box`).catch(() => ({ data: { data: [] } })),
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/tracking`).catch(() => ({ data: { data: [] } }))
      ]);

      if (bookingsRes.data.success) setBookings(bookingsRes.data.data || []);

      // Build POD map
      if (podRes.data.success && Array.isArray(podRes.data.data)) {
        const map = {};
        podRes.data.data.forEach(item => {
          if (item.lrNo) map[String(item.lrNo).trim()] = item;
          if (item.bookingId) map[item.bookingId] = item;
        });
        setPodMap(map);
      }

      // Build Box map
      if (boxRes.data.success && Array.isArray(boxRes.data.data)) {
        const map = {};
        boxRes.data.data.forEach(item => {
          if (item.lrNo) map[String(item.lrNo).trim()] = item;
          if (item.bookingId) map[item.bookingId] = item;
        });
        setBoxMap(map);
      }

      // Build Tracking map
      if (trackingRes.data.success && Array.isArray(trackingRes.data.data)) {
        const map = {};
        const sorted = [...trackingRes.data.data].sort((a, b) => new Date(a.updatedAt || a.date || a.createdAt) - new Date(b.updatedAt || b.date || b.createdAt));
        sorted.forEach(t => {
          if (t.awb) map[String(t.awb).trim().toLowerCase()] = t;
        });
        setTrackingMap(map);
      }
    } catch (err) {
      console.error("Fetch data error", err);
    } finally {
      setLoading(false);
    }
  };

  useSocketSync("bookings", fetchAllData);

  const handleClearAll = async () => {
    const hasDateRange = startDate || endDate;
    let title = "Clear ALL Bookings";
    let message = "WARNING: This will permanently delete ALL bookings and their associated LR details from the database. Are you absolutely sure you want to proceed?";
    let url = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bookings/clear/all`;

    if (hasDateRange) {
      const startStr = startDate ? formatDate(startDate) : "anytime";
      const endStr = endDate ? formatDate(endDate) : "anytime";
      title = `Delete ${filtered.length} Bookings`;
      message = `WARNING: This will permanently delete ${filtered.length} bookings (and their associated LR details/tracking) from ${startStr} to ${endStr}. Are you absolutely sure you want to proceed?`;
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }

    const isConfirmed = await confirm({
      title,
      message,
      confirmText: hasDateRange ? "Yes, Delete Filtered" : "Yes, Delete Everything",
      cancelText: "Cancel",
      requireInput: "confirm"
    });
    if (!isConfirmed) return;

    try {
      await axios.delete(url);
      fetchAllData();
      setCurrentPage(1);
    } catch (err) { console.error("Clear bookings error", err); }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    const isConfirmed = await confirm({
      title: "Delete Booking",
      message: "Are you sure you want to permanently delete this booking? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!isConfirmed) return;

    setBookings(prev => prev.filter(b => b.id !== id && b._id !== id));
    try {
      const res = await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bookings/${id}`);
      if (res.data?.success) {
        addToast("Booking deleted successfully", "success");
      }
      fetchAllData();
    } catch (err) {
      console.error("Delete booking error", err);
      addToast(err.response?.data?.message || "Failed to delete booking", "error");
      fetchAllData();
    }
  };

  const displayBookings = useMemo(() => {
    const pending = (syncQueue || [])
      .filter(req => req.method === 'post' && req.url.includes('/bookings'))
      .map(req => ({
        ...req.data,
        id: req.tempId,
        isOfflinePending: true,
      }));
    return [...pending, ...bookings];
  }, [bookings, syncQueue]);

  const getBookingDateObj = (item) => {
    const d = item.createdAt || item.date || item.dispatch_date || item.bookingDate || item.booking_date || item.created_at;
    if (!d) return null;
    if (typeof d === "string" && /^\d{2}-\d{2}-\d{4}$/.test(d)) {
      const [day, month, year] = d.split("-");
      return new Date(`${year}-${month}-${day}`);
    }
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const filtered = useMemo(() => {
    return displayBookings.filter(b => {
      const matchesSearch = !search || 
        (b.client || b.consignor || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.awb || b.lrNo || b.consignment || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.origin || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.destination || "").toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (startDate || endDate) {
        const bDate = getBookingDateObj(b);
        if (bDate) {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (bDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (bDate > end) return false;
          }
        } else {
          return false;
        }
      }

      return true;
    });
  }, [displayBookings, search, startDate, endDate]);

  const { sortedData, sortOption, setSortOption } = useTableSort(filtered, "awb_desc", { nameKey: "client", amountKey: "frieght", dateKey: "createdAt" });

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / entriesPerPage);
  const indexOfLast = currentPage * entriesPerPage;
  const indexOfFirst = indexOfLast - entriesPerPage;
  const currentEntries = sortedData.slice(indexOfFirst, indexOfLast);

  // Ensure current page is valid when filtering changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [sortedData.length, totalPages, currentPage]);

  return (
    <div className="bookings-page-wrapper">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', width: '100%', marginBottom: '1.5rem', gap: '1rem' }}>
        {/* Left Side: Title / Refresh Button */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            className="page-header-btn page-header-btn-primary" 
            onClick={fetchAllData}
            style={{ padding: '0 2.5rem', height: '42px', fontSize: '1.05rem', whiteSpace: 'nowrap', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(14, 165, 233, 0.2)', fontWeight: 800, letterSpacing: '1px' }}
          >
            ALL&nbsp;&nbsp;&nbsp;AWB&nbsp;&nbsp;&nbsp;BOOKING
          </button>
        </div>
        
        {/* Center Side: Main Action */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {(hasPermission("create_booking") || isSuperAdmin) && (
            <button 
              className="page-header-btn page-header-btn-primary" 
              onClick={() => navigate("/bookings/create")}
              style={{ padding: '0 2.5rem', height: '42px', fontSize: '1.05rem', whiteSpace: 'nowrap', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(14, 165, 233, 0.2)' }}
            >
              + New Booking
            </button>
          )}
        </div>

        {/* Right Side: Tools */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowExportModal(true)}
            style={{
              padding: '0 1.25rem',
              height: '42px',
              fontSize: '0.92rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
              whiteSpace: 'nowrap'
            }}
          >
            <Download size={16} /> EXPORT
          </button>

          {globalSettings?.integrations?.enableCsvImport !== false && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Bookings (AWB) CSV */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>AWB</span>
                <CsvImportExport moduleName="bookings" onImportSuccess={fetchAllData} searchQuery={search} />
              </div>

              <div style={{ width: '1px', height: '28px', backgroundColor: '#cbd5e1' }}></div>

              {/* LR Details (Invoice Items) CSV */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>LR</span>
                <CsvImportExport moduleName="lr_details" onImportSuccess={fetchAllData} searchQuery={search} />
              </div>

              <div style={{ width: '1px', height: '28px', backgroundColor: '#cbd5e1' }}></div>

              {/* Combined (AWB + LR) CSV */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Combined</span>
                <CsvImportExport moduleName="bookings_combined" onImportSuccess={fetchAllData} searchQuery={search} />
              </div>
            </div>
          )}
          
          {(isSuperAdmin && globalSettings?.integrations?.enableBulkDelete) && (
            <button 
              className="page-header-btn" 
              style={{ 
                color: "#dc2626", 
                borderColor: "#fecaca", 
                height: '42px', 
                padding: (startDate || endDate) ? '0 1rem' : '0', 
                width: (startDate || endDate) ? 'auto' : '42px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                borderRadius: '6px',
                gap: '6px',
                backgroundColor: (startDate || endDate) ? '#fef2f2' : 'transparent'
              }} 
              onClick={handleClearAll} 
              title={(startDate || endDate) ? "Delete Filtered Bookings" : "Clear All Bookings"}
            >
              <Trash2 size={16} />
              {(startDate || endDate) && <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Delete Filtered ({filtered.length})</span>}
            </button>
          )}
        </div>
      </div>

      <div className="premium-filter-toolbar">
        <div className="premium-filter-grid">

          <div className="premium-search-wrapper">
            <div className="premium-search-icon">
              <Search size={18} />
            </div>
            <input
              className="premium-search-input"
              placeholder="Search by client, LR no, origin, destination..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <SortDropdown 
            value={sortOption} 
            onChange={setSortOption} 
            options={["awb_desc", "awb_asc", "newest", "oldest", "amount_desc", "amount_asc", "az", "za"]} 
          />

          <div className="premium-filter-group" style={{ flex: '1 1 200px' }}>
            <Calendar size={16} style={{ color: "#64748b" }} />
            <span className="premium-filter-label">From:</span>
            <input
              type="date"
              className="premium-filter-input"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              style={{ cursor: 'pointer' }}
            />
            {startDate && (
              <button 
                onClick={() => { setStartDate(""); setCurrentPage(1); }} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                title="Clear From Date"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="premium-filter-group" style={{ flex: '1 1 200px' }}>
            <Calendar size={16} style={{ color: "#64748b" }} />
            <span className="premium-filter-label">To:</span>
            <input
              type="date"
              className="premium-filter-input"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              style={{ cursor: 'pointer' }}
            />
            {endDate && (
              <button 
                onClick={() => { setEndDate(""); setCurrentPage(1); }} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                title="Clear To Date"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="premium-filter-group">
            <span className="premium-filter-label">Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="premium-filter-input"
              style={{ cursor: "pointer", width: "50px" }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span className="premium-filter-label" style={{ marginLeft: 0 }}>entries</span>
          </div>

        </div>
      </div>

      {/* Select All / Batch Action Toolbar */}
      {currentEntries.length > 0 && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#ffffff",
          padding: "0.65rem 1rem",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          marginBottom: "1rem",
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem", color: "#334155" }}>
            <input
              type="checkbox"
              checked={currentEntries.length > 0 && currentEntries.every(b => selectedBookingIds.includes(b.id || b._id))}
              onChange={() => {
                const visibleIds = currentEntries.map(b => b.id || b._id).filter(Boolean);
                const allSelected = visibleIds.every(id => selectedBookingIds.includes(id));
                if (allSelected) {
                  setSelectedBookingIds(prev => prev.filter(id => !visibleIds.includes(id)));
                } else {
                  setSelectedBookingIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                }
              }}
              style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }}
            />
            <span>Select All Visible ({currentEntries.length})</span>
          </label>

          {selectedBookingIds.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8rem", color: "#2563eb", fontWeight: "700" }}>
                {selectedBookingIds.length} booking(s) selected
              </span>
              <button
                type="button"
                onClick={() => {
                  const selectedList = bookings.filter(b => selectedBookingIds.includes(b.id || b._id));
                  setBulkBookingsForTracking(selectedList);
                  setSelectedBookingForTracking(null);
                  setTrackingModalOpen(true);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#ffffff",
                  border: "none",
                  padding: "0.45rem 0.9rem",
                  borderRadius: "7px",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(37,99,235,0.25)"
                }}
              >
                <Truck size={14} /> Bulk Update Tracking ({selectedBookingIds.length})
              </button>
              <button
                onClick={() => setSelectedBookingIds([])}
                style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline" }}
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <TablePageSkeleton />
      ) : currentEntries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#64748b", background: "#fff", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
          <PackageOpen size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#334155' }}>No bookings found</h4>
          <p style={{ marginTop: '0.5rem' }}>Try adjusting your search filters or import new data.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {currentEntries.map((item, index) => {
            const itemId = item.id || item._id;
            const isSelected = selectedBookingIds.includes(itemId);
            const displayParcels = item.invoiceDetails && item.invoiceDetails.length > 0
              ? item.invoiceDetails.filter(inv => inv.invoiceNo || inv.partNumber || inv.ewayBill || inv.invoiceValue)
              : (item.parcels || []);
            const hasParcels = displayParcels.length > 0;
            const awb = item.awb || item.consignment || item.lrNo || item.id?.slice(-6);
            const hasBox = boxMap[item.awb || item.lrNo || item.id];
            const hasPodEntry = podMap[item.awb || item.lrNo || item.id];
            return (
              <div key={itemId || `booking-${index}`} className="booking-card" style={{ opacity: item.isOfflinePending ? 0.8 : 1, border: isSelected ? "2px solid #2563eb" : (item.isOfflinePending ? "2px dashed #f59e0b" : undefined), background: isSelected ? "#f8faff" : undefined }}>

                {/* ── Card Header ── */}
                <div className="booking-card-header">
                  <div className="booking-card-header-left">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectBooking(itemId)}
                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }}
                      />
                      <h4 className="booking-client-name" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        {item.client || item.consignor || "UNKNOWN CLIENT"}
                        {item.isOfflinePending && (
                          <Clock size={16} color="#f59e0b" title="Pending Sync (Offline)" />
                        )}
                      </h4>
                    </div>
                    <div className="booking-meta-row">
                      <span className="booking-meta-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        AWB: {awb}
                        <span 
                          onClick={(e) => handleCopyAwb(e, awb)} 
                          style={{ cursor: 'pointer', color: copiedAwb === awb ? '#10b981' : '#94a3b8', display: 'flex', alignItems: 'center' }} 
                          title="Copy AWB"
                        >
                          {copiedAwb === awb ? <Check size={14} /> : <Copy size={14} />}
                        </span>
                      </span>
                      <span className="booking-meta-badge">{item.createdAt ? formatDate(item.createdAt) : item.date ? formatDate(item.date) : "-"}</span>
                      <span className="booking-meta-badge">{(item.origin || "-")} → {(item.destination || "-")}</span>
                      {item.mode && <span className="booking-meta-badge">{item.mode}</span>}
                      
                      {/* Package / Box Count Badge */}
                      <span className="booking-meta-badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Package size={13} color="#2563eb" /> Pkg: {item.box || item.boxes || item.packages || item.packageCount || item.pieces || (item.dimensions && item.dimensions.reduce((acc, d) => acc + (Number(d.boxCount) || 0), 0)) || 1}
                      </span>

                      {item.dimensions && Array.isArray(item.dimensions) && item.dimensions.some(d => d.length || d.breadth || d.height || d.boxCount) && (
                        <span className="booking-meta-badge" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center' }}>
                          Dims: {item.dimensions.filter(d => d.length || d.breadth || d.height).map((d, dIdx) => `${d.length || 0}x${d.breadth || 0}x${d.height || 0}cm (${d.boxCount || 0} Pcs)`).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="booking-card-header-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    {(() => {
                      const awbLower = String(awb || '').trim().toLowerCase();
                      const track = trackingMap[awbLower];
                      const status = (typeof track === 'object' ? track?.status : track) || 'Picked Up';
                      const location = (typeof track === 'object' ? track?.location : null) || item.origin || 'Origin Hub';

                      let bg = '#eff6ff';
                      let color = '#2563eb';
                      let border = '#bfdbfe';
                      let icon = <Truck size={13} />;

                      if (status === 'Delivered') {
                        bg = '#ecfdf5';
                        color = '#059669';
                        border = '#a7f3d0';
                        icon = <CheckCircle2 size={13} />;
                      } else if (status === 'Out for Delivery') {
                        bg = '#fffbeb';
                        color = '#d97706';
                        border = '#fde68a';
                        icon = <Truck size={13} />;
                      } else if (status === 'Reached Hub') {
                        bg = '#f5f3ff';
                        color = '#7c3aed';
                        border = '#ddd6fe';
                        icon = <MapPin size={13} />;
                      } else if (status === 'Picked Up') {
                        bg = '#f0fdf4';
                        color = '#16a34a';
                        border = '#bbf7d0';
                        icon = <Package size={13} />;
                      } else if (status === 'Delayed') {
                        bg = '#fff7ed';
                        color = '#ea580c';
                        border = '#fed7aa';
                        icon = <Clock size={13} />;
                      }

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                          <span
                            onClick={() => {
                              setSelectedBookingForTracking(item);
                              setBulkBookingsForTracking([]);
                              setTrackingModalOpen(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '0.80rem',
                              fontWeight: 800,
                              background: bg,
                              color: color,
                              border: `1px solid ${border}`,
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                              transition: 'transform 0.15s'
                            }}
                            title="Click to update tracking checkpoint"
                          >
                            {icon} {status}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <MapPin size={11} color="#94a3b8" /> {location}
                          </span>
                        </div>
                      );
                    })()}
                    {isSuperAdmin && (
                      <span style={{ background: "#e2e8f0", padding: "2px 8px", borderRadius: "12px", fontSize: "0.72rem", color: "#334155", fontWeight: "600", marginTop: "2px", display: "inline-block" }}>
                        Clerk: {item.clerk_name || "Admin"}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── LR Details Table (scrollable) ── */}
                {hasParcels ? (
                  <div className="booking-table-scroll" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table className="booking-lr-table" style={{ width: '100%', whiteSpace: 'nowrap' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>INVOICE</th>
                          <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>INV DATE</th>
                          <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>PART</th>
                          <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>QTY</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>VALUE (₹)</th>
                          <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>EWAY</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayParcels.map((parcel, pIdx) => (
                          <tr key={pIdx}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{parcel.invoice || parcel.invoiceNo || '-'}</td>
                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{(parcel.invdate || parcel.invoiceDate) ? formatDate(parcel.invdate || parcel.invoiceDate) : '-'}</td>
                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{parcel.part || parcel.partNumber || '-'}</td>
                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{parcel.quantity || '-'}</td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {(parcel.value || parcel.invoiceValue) ? parseFloat(parcel.value || parcel.invoiceValue).toFixed(2) : '0.00'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{parcel.eway || parcel.ewayBill || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="booking-empty-lr">
                    <PackageOpen size={28} style={{ opacity: 0.35, marginBottom: '0.25rem' }} />
                    <span>No LR details attached</span>
                  </div>
                )}

                {/* ── Card Footer: Actions ── */}
                <div className="booking-card-footer">
                  <div className="booking-actions-left">
                    {(() => {
                      const awbLower = String(awb).trim().toLowerCase();
                      const trackObj = trackingMap[awbLower];
                      const isDelivered = (typeof trackObj === 'object' ? trackObj?.status : trackObj) === 'Delivered';
                      const canModify = (isSuperAdmin || !isDelivered) && !item.isOfflinePending;

                      return (
                        <>
                          {canModify && (
                            <button onClick={() => navigate(`/bookings/edit/${item.id}`)} className="booking-action-btn" title="Edit" style={{ color: '#3b82f6' }}><Edit size={15} /></button>
                          )}
                          {!item.isOfflinePending && (
                            <>
                              <button onClick={() => window.open(`/print-lr/${item.id}`, "_blank")} className="booking-action-btn" title="View Print" style={{ color: '#64748b' }}><Printer size={15} /></button>
                              <button onClick={() => window.open(`/print-lr/${item.id}?download=true`, "_blank")} className="booking-action-btn" title="Direct Download" style={{ color: '#0ea5e9' }}><Download size={15} /></button>
                            </>
                          )}
                          {canModify && (
                            <button onClick={() => handleDelete(item.id || item._id)} className="booking-action-btn" title="Delete" style={{ color: '#ef4444' }}><Trash2 size={15} /></button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  {canAccessPod && (
                    <div className="booking-actions-right">
                      <button
                        disabled={item.isOfflinePending}
                        onClick={() => {
                          if (hasBox) {
                            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
                            let fileUrl = hasBox.boxUrl || hasBox.cloudinaryUrl || `${apiUrl}/uploads/box/${hasBox.fileName || hasBox.filename}`;
                            fileUrl = getSafeCloudinaryPdfUrl(fileUrl);
                            navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}&title=Box%20Document%20Viewer`);
                          } else {
                            setSelectedBookingForBox(item);
                            setBoxModalOpen(true);
                          }
                        }}
                        className="booking-pod-btn"
                        style={{ background: hasBox ? '#fef3c7' : '#fefce8', border: `1px solid ${hasBox ? '#fde68a' : '#fef08a'}`, color: hasBox ? '#d97706' : '#ca8a04', opacity: item.isOfflinePending ? 0.5 : 1, cursor: item.isOfflinePending ? "not-allowed" : "pointer" }}
                        title={hasBox ? "View Box" : "Upload Box"}
                      >
                        {hasBox ? <Eye size={13} /> : <PackageOpen size={13} />}
                        {hasBox ? "BOX" : "+ BOX"}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBookingForTracking(item);
                          setTrackingModalOpen(true);
                        }}
                        className="booking-pod-btn"
                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#3b82f6', cursor: "pointer" }}
                        title="Update Shipment Tracking"
                      >
                        <Truck size={13} /> TRACK
                      </button>
                      <button
                        disabled={item.isOfflinePending}
                        onClick={() => {
                          if (hasPodEntry) {
                            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
                            let fileUrl = hasPodEntry.podUrl || hasPodEntry.cloudinaryUrl || hasPodEntry.fileData || `${apiUrl}/uploads/pod/${hasPodEntry.fileName || hasPodEntry.filename}`;
                            // Prevent encoding massive base64 strings in URL parameters which causes 431 errors
                            if (fileUrl.startsWith('data:')) {
                              // If it's base64 data, we can store it in sessionStorage and pass a flag, 
                              // or just let the viewer handle it if it supports data URIs (most do, but URL length might be an issue)
                              try {
                                sessionStorage.setItem('tempPodData', fileUrl);
                                navigate(`/pod/view?source=session&title=Proof%20of%20Delivery`);
                              } catch (e) {
                                // If quota exceeded, fallback to direct url (might break if too large)
                                navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}`);
                              }
                            } else {
                              fileUrl = getSafeCloudinaryPdfUrl(fileUrl);
                              navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}`);
                            }
                          } else {
                            setSelectedBookingForPod(item);
                            setPodModalOpen(true);
                          }
                        }}
                        className="booking-pod-btn"
                        style={{ background: hasPodEntry ? '#ecfdf5' : '#e0f2fe', border: `1px solid ${hasPodEntry ? '#a7f3d0' : '#bae6fd'}`, color: hasPodEntry ? '#10b981' : '#0284c7', opacity: item.isOfflinePending ? 0.5 : 1, cursor: item.isOfflinePending ? "not-allowed" : "pointer" }}
                        title={hasPodEntry ? "View POD" : "Upload POD"}
                      >
                        {hasPodEntry ? <Eye size={13} /> : <FileCheck size={13} />}
                        {hasPodEntry ? "POD" : "+ POD"}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && filtered.length > 0 && (
        <div className="booking-pagination-container">
          <div className="booking-pagination-info">
            Showing <span>{indexOfFirst + 1}</span> to <span>{Math.min(indexOfLast, filtered.length)}</span> of <span>{filtered.length}</span> entries
          </div>
          <div className="booking-pagination-controls">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f8fafc' : '#fff', color: currentPage === 1 ? '#cbd5e1' : '#334155', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', border: pageNum === currentPage ? 'none' : '1px solid #cbd5e1', background: pageNum === currentPage ? 'var(--primary-color)' : '#fff', color: pageNum === currentPage ? '#fff' : '#334155', fontWeight: pageNum === currentPage ? 600 : 400, cursor: 'pointer' }}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', background: (currentPage === totalPages || totalPages === 0) ? '#f8fafc' : '#fff', color: (currentPage === totalPages || totalPages === 0) ? '#cbd5e1' : '#334155', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* POD UPLOAD MODAL STUDIO */}
      <AnimatePresence>
        {podModalOpen && (
          <PodEntryModal
            key="pod-entry-modal"
            isOpen={podModalOpen}
            onClose={() => {
              setPodModalOpen(false);
              setSelectedBookingForPod(null);
            }}
            booking={selectedBookingForPod}
            existingPod={selectedBookingForPod ? podMap[selectedBookingForPod.awb || selectedBookingForPod.lrNo || selectedBookingForPod.id] : null}
            onSuccess={() => {
              fetchAllData();
            }}
          />
        )}
        {boxModalOpen && (
          <BoxEntryModal
            key="box-entry-modal"
            isOpen={boxModalOpen}
            onClose={() => {
              setBoxModalOpen(false);
              setSelectedBookingForBox(null);
            }}
            booking={selectedBookingForBox}
            existingBox={selectedBookingForBox ? boxMap[selectedBookingForBox.awb || selectedBookingForBox.lrNo || selectedBookingForBox.id] : null}
            onSuccess={() => {
              fetchAllData();
            }}
          />
        )}
        <TrackingUpdateModal
          key="tracking-update-modal"
          isOpen={trackingModalOpen}
          onClose={() => {
            setTrackingModalOpen(false);
            setSelectedBookingForTracking(null);
            setBulkBookingsForTracking([]);
          }}
          booking={selectedBookingForTracking}
          bulkBookings={bulkBookingsForTracking}
          onNavigateToTracking={(awb) => navigate(`/tracking?awb=${awb}`)}
          onSuccess={() => {
            fetchAllData(); 
            setSelectedBookingIds([]);
          }}
        />
      </AnimatePresence>

      {/* Unified Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export AWB Bookings & Consignments"
        itemCount={selectedBookingIds.length > 0 ? selectedBookingIds.length : sortedData.length}
        subtitle={selectedBookingIds.length > 0 
          ? `Exporting ${selectedBookingIds.length} selected booking(s)` 
          : (search || startDate || endDate ? `Exporting ${sortedData.length} filtered booking(s)` : `Exporting all ${sortedData.length} bookings`)}
        isExporting={isExporting}
        onExport={handleExecuteExport}
      />
    </div>
  );
};

export default BookingsList;