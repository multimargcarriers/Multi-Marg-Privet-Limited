import React, { useState, useEffect, useContext, useMemo } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { Search, Eye, Printer, Trash2, Edit, ChevronLeft, ChevronRight, PackageOpen, FileCheck, Package, IndianRupee, Box, FileText, Clock, Download, Copy, Check, Truck, Calendar, X, MapPin, CheckCircle2, Plus, RefreshCw } from "lucide-react";
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
import BulkTrackingConfirmModal from "../components/BulkTrackingConfirmModal";
import { AnimatePresence, motion } from "framer-motion";
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
  const [bulkConfirmModalOpen, setBulkConfirmModalOpen] = useState(false);
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
      {/* ── Page Header Toolbar ── */}
      <div className="bookings-header-toolbar">
        <div className="bookings-header-main-row">
          {/* Left: Page Title with Count & Refresh */}
          <div className="bookings-header-title-group">
            <h2 className="bookings-page-title">
              ALL AWB BOOKINGS
            </h2>
            <span className="bookings-count-badge">
              {filtered.length} {filtered.length === 1 ? 'Booking' : 'Bookings'}
            </span>
            <button 
              onClick={fetchAllData} 
              className="bookings-refresh-btn" 
              title="Refresh Bookings"
            >
              <RefreshCw size={14} className={loading ? "spin-animation" : ""} />
            </button>
          </div>

          {/* Right: Primary Action Buttons (Export on Left & + New Booking on Right) */}
          <div className="bookings-header-primary-actions">
            <button
              onClick={() => setShowExportModal(true)}
              className="btn-export-bookings"
              title="Export Bookings to Excel / CSV"
            >
              <Download size={15} />
              <span>Export</span>
            </button>

            {(hasPermission("create_booking") || isSuperAdmin) && (
              <button 
                className="btn-create-booking" 
                onClick={() => navigate("/bookings/create")}
                title="Create New Consignment / Booking"
              >
                <Plus size={16} />
                <span>New Booking</span>
              </button>
            )}
          </div>
        </div>

        {/* Secondary CSV Tools & Bulk Delete Bar */}
        {((globalSettings?.integrations?.enableCsvImport !== false) || (isSuperAdmin && globalSettings?.integrations?.enableBulkDelete)) && (
          <div className="bookings-header-secondary-tools">
            {globalSettings?.integrations?.enableCsvImport !== false && (
              <div className="bookings-csv-tools-group">
                <span className="bookings-tools-label">CSV:</span>
                <div className="bookings-csv-tool-item">
                  <span className="bookings-csv-tag tag-awb">AWB</span>
                  <CsvImportExport moduleName="bookings" onImportSuccess={fetchAllData} searchQuery={search} />
                </div>
                <div className="bookings-csv-tool-item">
                  <span className="bookings-csv-tag tag-lr">LR</span>
                  <CsvImportExport moduleName="lr_details" onImportSuccess={fetchAllData} searchQuery={search} />
                </div>
                <div className="bookings-csv-tool-item">
                  <span className="bookings-csv-tag tag-combined">Combined</span>
                  <CsvImportExport moduleName="bookings_combined" onImportSuccess={fetchAllData} searchQuery={search} />
                </div>
              </div>
            )}

            {(isSuperAdmin && globalSettings?.integrations?.enableBulkDelete) && (
              <button 
                className="btn-bulk-delete" 
                onClick={handleClearAll} 
                title={(startDate || endDate) ? "Delete Filtered Bookings" : "Clear All Bookings"}
              >
                <Trash2 size={15} />
                {(startDate || endDate) && <span>Delete Filtered ({filtered.length})</span>}
              </button>
            )}
          </div>
        )}
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

          {/* Sort Dropdown & Show Entries: Always in 1 same row */}
          <div className="premium-sort-show-row">
            <SortDropdown 
              value={sortOption} 
              onChange={setSortOption} 
              options={["awb_desc", "awb_asc", "newest", "oldest", "amount_desc", "amount_asc", "az", "za"]} 
            />

            <div className="premium-filter-group show-entries-group">
              <span className="premium-filter-label">Show</span>
              <select
                value={entriesPerPage}
                onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="premium-filter-input"
                style={{ cursor: "pointer", width: "45px" }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span className="premium-filter-label" style={{ marginLeft: 0 }}>entries</span>
            </div>
          </div>

          {/* Date Range: Always in 1 same row */}
          <div className="premium-date-range-row">
            <div className="premium-filter-group date-filter-item">
              <Calendar size={15} style={{ color: "#64748b", flexShrink: 0 }} />
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
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                  title="Clear From Date"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="premium-filter-group date-filter-item">
              <Calendar size={15} style={{ color: "#64748b", flexShrink: 0 }} />
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
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                  title="Clear To Date"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Quick Select All Toggle Bar (Clean Micro Bar) */}
      {currentEntries.length > 0 && (
        <div className="bookings-quick-select-bar">
          <label className="bookings-quick-select-label">
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
              className="bookings-quick-checkbox"
            />
            <span>Select All on Page ({currentEntries.length})</span>
          </label>

          {selectedBookingIds.length > 0 && (
            <button 
              type="button" 
              onClick={() => setSelectedBookingIds([])} 
              className="bookings-quick-clear-btn"
            >
              Clear selection ({selectedBookingIds.length})
            </button>
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
                  <div className="booking-card-top-row">
                    <div className="booking-client-select-group">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectBooking(itemId)}
                        style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#2563eb", flexShrink: 0 }}
                      />
                      <h4 className="booking-client-name">
                        {item.client || item.consignor || "UNKNOWN CLIENT"}
                        {item.isOfflinePending && (
                          <Clock size={16} color="#f59e0b" title="Pending Sync (Offline)" />
                        )}
                      </h4>
                    </div>

                    {/* Status badge in top row */}
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
                        <div className="booking-status-wrapper">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBookingForTracking(item);
                              setBulkBookingsForTracking([]);
                              setTrackingModalOpen(true);
                            }}
                            className="booking-status-pill"
                            style={{
                              background: bg,
                              color: color,
                              border: `1px solid ${border}`
                            }}
                            title="Click to update tracking checkpoint"
                          >
                            {icon} <span>{status}</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Sub-row: Location & Clerk */}
                  <div className="booking-card-sub-info">
                    {(() => {
                      const awbLower = String(awb || '').trim().toLowerCase();
                      const track = trackingMap[awbLower];
                      const location = (typeof track === 'object' ? track?.location : null) || item.origin || 'Origin Hub';
                      return (
                        <span className="booking-location-text">
                          <MapPin size={12} color="#64748b" /> {location}
                        </span>
                      );
                    })()}
                    {isSuperAdmin && (
                      <span className="booking-clerk-badge">
                        Booked By: {item.clerk_name || "Admin"}
                      </span>
                    )}
                  </div>

                  {/* Badges Flow */}
                  <div className="booking-meta-row">
                    <span className="booking-meta-badge booking-badge-awb">
                      <strong>AWB:</strong> {awb}
                      <span 
                        onClick={(e) => handleCopyAwb(e, awb)} 
                        className="booking-awb-copy-btn"
                        title="Copy AWB"
                      >
                        {copiedAwb === awb ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                      </span>
                    </span>
                    <span className="booking-meta-badge">
                      📅 {item.createdAt ? formatDate(item.createdAt) : item.date ? formatDate(item.date) : "-"}
                    </span>
                    <span className="booking-meta-badge booking-badge-route">
                      {(item.origin || "-")} → {(item.destination || "-")}
                    </span>
                    {item.mode && (
                      <span className="booking-meta-badge booking-badge-mode">
                        {item.mode}
                      </span>
                    )}
                    
                    {/* Package / Box Count Badge */}
                    <span className="booking-meta-badge booking-badge-pkg">
                      <Package size={13} /> Pkg: {item.box || item.boxes || item.packages || item.packageCount || item.pieces || (item.dimensions && item.dimensions.reduce((acc, d) => acc + (Number(d.boxCount) || 0), 0)) || 1}
                    </span>

                    {item.dimensions && Array.isArray(item.dimensions) && item.dimensions.some(d => d.length || d.breadth || d.height || d.boxCount) && (
                      <span className="booking-meta-badge booking-badge-dims">
                        Dims: {item.dimensions.filter(d => d.length || d.breadth || d.height).map((d) => `${d.length || 0}x${d.breadth || 0}x${d.height || 0}cm (${d.boxCount || 0} Pcs)`).join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── LR Details Section: Responsive Table on Desktop + Mobile Card View ── */}
                {hasParcels ? (
                  <div className="booking-details-wrapper">
                    {/* Desktop View */}
                    <div className="booking-desktop-table-scroll">
                      <table className="booking-lr-table">
                        <thead>
                          <tr>
                            <th>INVOICE</th>
                            <th>INV DATE</th>
                            <th>PART</th>
                            <th>QTY</th>
                            <th style={{ textAlign: 'right' }}>VALUE (₹)</th>
                            <th>EWAY</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayParcels.map((parcel, pIdx) => (
                            <tr key={pIdx}>
                              <td style={{ fontWeight: 600 }}>{parcel.invoice || parcel.invoiceNo || '-'}</td>
                              <td>{(parcel.invdate || parcel.invoiceDate) ? formatDate(parcel.invdate || parcel.invoiceDate) : '-'}</td>
                              <td>{parcel.part || parcel.partNumber || '-'}</td>
                              <td>{parcel.quantity || '-'}</td>
                              <td style={{ fontWeight: 600, textAlign: 'right' }}>
                                {(parcel.value || parcel.invoiceValue) ? parseFloat(parcel.value || parcel.invoiceValue).toFixed(2) : '0.00'}
                              </td>
                              <td>{parcel.eway || parcel.ewayBill || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View: High Density Full-Width Parcel Cards */}
                    <div className="booking-mobile-parcel-list">
                      {displayParcels.map((parcel, pIdx) => (
                        <div key={pIdx} className="booking-mobile-parcel-card">
                          <div className="booking-mobile-parcel-header">
                            <div className="booking-mobile-parcel-inv">
                              <span className="booking-mobile-label">INV:</span>
                              <strong>{parcel.invoice || parcel.invoiceNo || 'AS PER INVOICE'}</strong>
                            </div>
                            <span className="booking-mobile-date">
                              {(parcel.invdate || parcel.invoiceDate) ? formatDate(parcel.invdate || parcel.invoiceDate) : '-'}
                            </span>
                          </div>
                          <div className="booking-mobile-parcel-grid">
                            <div className="booking-mobile-parcel-item">
                              <span className="booking-mobile-label">Part</span>
                              <span className="booking-mobile-val">{parcel.part || parcel.partNumber || 'NA'}</span>
                            </div>
                            <div className="booking-mobile-parcel-item">
                              <span className="booking-mobile-label">Qty</span>
                              <span className="booking-mobile-val">{parcel.quantity || 'NA'}</span>
                            </div>
                            <div className="booking-mobile-parcel-item">
                              <span className="booking-mobile-label">Value</span>
                              <span className="booking-mobile-val booking-mobile-val-highlight">
                                ₹{(parcel.value || parcel.invoiceValue) ? parseFloat(parcel.value || parcel.invoiceValue).toFixed(2) : '0.00'}
                              </span>
                            </div>
                            <div className="booking-mobile-parcel-item">
                              <span className="booking-mobile-label">E-Way</span>
                              <span className="booking-mobile-val">{parcel.eway || parcel.ewayBill || '-'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="booking-empty-lr">
                    <PackageOpen size={24} style={{ opacity: 0.4, marginBottom: '0.25rem' }} />
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
                            <button 
                              onClick={() => navigate(`/bookings/edit/${item.id}`)} 
                              className="booking-action-btn booking-btn-edit" 
                              title="Edit Booking"
                            >
                              <Edit size={14} />
                              <span className="booking-action-btn-text">Edit</span>
                            </button>
                          )}
                          {!item.isOfflinePending && (
                            <>
                              <button 
                                onClick={() => window.open(`/print-lr/${item.id}`, "_blank")} 
                                className="booking-action-btn booking-btn-print" 
                                title="View / Print LR"
                              >
                                <Printer size={14} />
                                <span className="booking-action-btn-text">Print</span>
                              </button>
                              <button 
                                onClick={() => window.open(`/print-lr/${item.id}?download=true`, "_blank")} 
                                className="booking-action-btn booking-btn-download" 
                                title="Direct Download PDF"
                              >
                                <Download size={14} />
                                <span className="booking-action-btn-text">PDF</span>
                              </button>
                            </>
                          )}
                          {canModify && (
                            <button 
                              onClick={() => handleDelete(item.id || item._id)} 
                              className="booking-action-btn booking-btn-delete" 
                              title="Delete Booking"
                            >
                              <Trash2 size={14} />
                              <span className="booking-action-btn-text">Delete</span>
                            </button>
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
                        className={`booking-pod-btn ${hasBox ? 'booking-btn-box-has' : 'booking-btn-box-add'}`}
                        style={{ opacity: item.isOfflinePending ? 0.5 : 1, cursor: item.isOfflinePending ? "not-allowed" : "pointer" }}
                        title={hasBox ? "View Box Document" : "Upload Box Document"}
                      >
                        {hasBox ? <Eye size={14} /> : <PackageOpen size={14} />}
                        <span>{hasBox ? "BOX" : "+ BOX"}</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedBookingForTracking(item);
                          setTrackingModalOpen(true);
                        }}
                        className="booking-pod-btn booking-btn-track"
                        title="Update Shipment Tracking"
                      >
                        <Truck size={14} />
                        <span>TRACK</span>
                      </button>

                      <button
                        disabled={item.isOfflinePending}
                        onClick={() => {
                          if (hasPodEntry) {
                            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
                            let fileUrl = hasPodEntry.podUrl || hasPodEntry.cloudinaryUrl || hasPodEntry.fileData || `${apiUrl}/uploads/pod/${hasPodEntry.fileName || hasPodEntry.filename}`;
                            if (fileUrl.startsWith('data:')) {
                              try {
                                sessionStorage.setItem('tempPodData', fileUrl);
                                navigate(`/pod/view?source=session&title=Proof%20of%20Delivery`);
                              } catch (e) {
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
                        className={`booking-pod-btn ${hasPodEntry ? 'booking-btn-pod-has' : 'booking-btn-pod-add'}`}
                        style={{ opacity: item.isOfflinePending ? 0.5 : 1, cursor: item.isOfflinePending ? "not-allowed" : "pointer" }}
                        title={hasPodEntry ? "View Proof of Delivery" : "Upload Proof of Delivery"}
                      >
                        {hasPodEntry ? <Eye size={14} /> : <FileCheck size={14} />}
                        <span>{hasPodEntry ? "POD" : "+ POD"}</span>
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

        <BulkTrackingConfirmModal
          key="bulk-tracking-confirm-modal"
          isOpen={bulkConfirmModalOpen}
          onClose={() => setBulkConfirmModalOpen(false)}
          selectedBookings={bulkBookingsForTracking}
          onRemoveBooking={(idToRemove) => {
            setSelectedBookingIds(prev => prev.filter(id => id !== idToRemove));
            setBulkBookingsForTracking(prev => prev.filter(b => (b.id || b._id) !== idToRemove));
          }}
          onConfirm={() => {
            setBulkConfirmModalOpen(false);
            setTrackingModalOpen(true);
          }}
        />

      </AnimatePresence>

      {/* Floating Bottom Toast Portal (Fixed on Viewport) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedBookingIds.length > 0 && (
            <motion.div
              key="floating-bulk-toast-dock"
              initial={{ opacity: 0, y: 30, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 30, x: "-50%" }}
              transition={{ type: "spring", damping: 25, stiffness: 380 }}
              className="floating-bulk-toast"
            >
              <div className="bulk-toast-pill">
                <span className="bulk-toast-count" title={`${selectedBookingIds.length} Selected`}>
                  {selectedBookingIds.length}
                </span>

                <button
                  type="button"
                  className="bulk-toast-action-btn"
                  onClick={() => {
                    const selectedList = bookings.filter(b => selectedBookingIds.includes(b.id || b._id));
                    setBulkBookingsForTracking(selectedList);
                    setSelectedBookingForTracking(null);
                    setBulkConfirmModalOpen(true);
                  }}
                >
                  <Truck size={15} />
                  <span>Update Track</span>
                </button>

                <button
                  type="button"
                  className="bulk-toast-clear-btn"
                  onClick={() => setSelectedBookingIds([])}
                  title="Clear Selection"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

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