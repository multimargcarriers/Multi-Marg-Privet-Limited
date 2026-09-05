import React, { useState, useEffect, useContext, useMemo } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { Search, Eye, Printer, Trash2, Edit, ChevronLeft, ChevronRight, PackageOpen, FileCheck, Package, IndianRupee, Box, FileText, Clock, Download, Copy, Check, Truck, Calendar, X, MapPin, CheckCircle2, Plus, RefreshCw, Filter, RotateCcw } from "lucide-react";
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
import { canModifyBooking } from "../utils/bookingPermissions";

const parseDateSecurely = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  const dateStr = String(dateVal).trim();
  if (!dateStr) return null;

  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
    const year = parseInt(dmyMatch[3], 10);
    
    const timeMatch = dateStr.match(/\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      return new Date(year, month, day, hours, minutes, seconds);
    }
    
    return new Date(year, month, day);
  }

  const parsedDate = new Date(dateStr);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }
  return null;
};

const formatRealDateTimeSec = (dateVal) => {
  if (!dateVal) return "-";
  const d = parseDateSecurely(dateVal);
  if (!d || isNaN(d.getTime())) return String(dateVal);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${mins}:${secs}`;
};

// 5 Professional Enterprise Accent Colors for Selector-Side Visual Separation
const BOOKING_CARD_PALETTES = [
  {
    id: 0,
    name: "navy",
    border: "#1e40af",      // Corporate Navy Blue
    hover: "#1d4ed8",
    glow: "rgba(30, 64, 175, 0.16)",
    checkbox: "#1e40af",
  },
  {
    id: 1,
    name: "emerald",
    border: "#047857",      // Deep Forest Emerald
    hover: "#065f46",
    glow: "rgba(4, 120, 87, 0.16)",
    checkbox: "#047857",
  },
  {
    id: 2,
    name: "bronze",
    border: "#b45309",      // Warm Industrial Bronze / Amber
    hover: "#92400e",
    glow: "rgba(180, 83, 9, 0.16)",
    checkbox: "#b45309",
  },
  {
    id: 3,
    name: "slate",
    border: "#334155",      // Steel Slate / Charcoal
    hover: "#1e293b",
    glow: "rgba(51, 65, 85, 0.16)",
    checkbox: "#334155",
  },
  {
    id: 4,
    name: "teal",
    border: "#0e7490",      // Deep Ocean Teal
    hover: "#155e75",
    glow: "rgba(14, 116, 144, 0.16)",
    checkbox: "#0e7490",
  },
];

const BookingsList = () => {
  const { syncQueue } = useSync();
  const { user, hasPermission } = useContext(AuthContext);
  const { globalSettings } = useContext(SettingsContext);
  const { clearBadge } = useContext(BadgeContext);
  const { confirm } = useDialog();
  const { addToast } = useToast();
  const isSuperAdmin = Boolean(
    user?.role === 'SuperAdmin' ||
    user?.role === 'Super Admin' ||
    (user?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin' ||
    user?.role === 'Admin' ||
    (user?.role || '').toLowerCase() === 'admin' ||
    user?.email === 'admin@multimarg.com' ||
    user?.email?.includes('admin') ||
    user?.permissions?.includes('all') ||
    user?.permissions?.includes('superadmin')
  );
  const canAccessPod = isSuperAdmin || user?.role === 'Admin' || user?.permissions?.includes('pod') || true;

  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
  const [entriesPerPage, setEntriesPerPage] = useState(() => {
    try {
      const saved = localStorage.getItem('mmc_bookings_entries_per_page');
      return saved ? Number(saved) : 50;
    } catch (e) {
      return 50;
    }
  });

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

      // Build comprehensive POD map with all AWB variations
      if (podRes.data.success && Array.isArray(podRes.data.data)) {
        const map = {};
        podRes.data.data.forEach(item => {
          const raw = String(item.lrNo || '').trim();
          const clean = raw.toLowerCase();
          const stripped = clean.replace(/^(mmc|lr|awb)[-_ ]*/i, '');
          if (raw) map[raw] = item;
          if (clean) map[clean] = item;
          if (stripped) map[stripped] = item;
          if (item.bookingId) map[String(item.bookingId)] = item;
          if (item.id) map[String(item.id)] = item;
          if (item._id) map[String(item._id)] = item;
        });
        setPodMap(map);
      }

      // Build comprehensive Box map
      if (boxRes.data.success && Array.isArray(boxRes.data.data)) {
        const map = {};
        boxRes.data.data.forEach(item => {
          const raw = String(item.lrNo || '').trim();
          const clean = raw.toLowerCase();
          const stripped = clean.replace(/^(mmc|lr|awb)[-_ ]*/i, '');
          if (raw) map[raw] = item;
          if (clean) map[clean] = item;
          if (stripped) map[stripped] = item;
          if (item.bookingId) map[String(item.bookingId)] = item;
          if (item.id) map[String(item.id)] = item;
          if (item._id) map[String(item._id)] = item;
        });
        setBoxMap(map);
      }

      // Build Tracking map
      if (trackingRes.data.success && Array.isArray(trackingRes.data.data)) {
        const map = {};
        const sorted = [...trackingRes.data.data].sort((a, b) => {
          const dateA = parseDateSecurely(a.updatedAt || a.date || a.createdAt);
          const dateB = parseDateSecurely(b.updatedAt || b.date || b.createdAt);
          return (dateA ? dateA.getTime() : 0) - (dateB ? dateB.getTime() : 0);
        });
        sorted.forEach(t => {
          if (t.awb) {
            const raw = String(t.awb).trim();
            const clean = raw.toLowerCase();
            const stripped = clean.replace(/^(mmc|lr|awb)[-_ ]*/i, '');
            map[raw] = t;
            map[clean] = t;
            map[stripped] = t;
          }
        });
        setTrackingMap(map);
      }
    } catch (err) {
      console.error("Fetch data error", err);
    } finally {
      setLoading(false);
    }
  };



  const handlePrintAction = (item) => {
    const cachedFilename = `LR_${item.id}.pdf`;
    let apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    if (apiBaseUrl.endsWith("/api")) {
      apiBaseUrl = apiBaseUrl.slice(0, -4);
    } else if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.startsWith("http")) {
      apiBaseUrl = import.meta.env.VITE_API_URL.endsWith("/")
        ? import.meta.env.VITE_API_URL.slice(0, -1)
        : import.meta.env.VITE_API_URL;
    } else if (window.location.port) {
      apiBaseUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
    } else {
      apiBaseUrl = window.location.origin;
    }
    
    if (item.hasPdf) {
      const viewUrl = `${apiBaseUrl}/api/print/view-pdf/${cachedFilename}`;
      window.open(viewUrl, "_blank");
    } else {
      window.open(`/print-lr/${item.id}?autoprint=true`, "_blank");
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
    const d = item.dispatch_date || item.date || item.bookingDate || item.booking_date || item.createdAt || item.created_at;
    if (!d) return null;
    if (typeof d === "string" && /^\d{2}-\d{2}-\d{4}$/.test(d)) {
      const [day, month, year] = d.split("-");
      return new Date(`${year}-${month}-${day}`);
    }
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const checkIsDelivered = useMemo(() => {
    return (item) => {
      if (!item) return false;
      const awbStr = String(item.awb || item.consignment || item.lrNo || item.lrNumber || '').trim();
      const awbClean = awbStr.toLowerCase();
      const awbStripped = awbClean.replace(/^(mmc|lr|awb)[-_ ]*/i, '');
      const idStr = String(item.id || item._id || '').trim();

      // 1. Direct status flags on booking
      const transitLower = String(item.transitStatus || '').trim().toLowerCase();
      const statusLower = String(item.status || '').trim().toLowerCase();
      const delivStatusLower = String(item.delivery_status || '').trim().toLowerCase();
      if (transitLower === 'delivered' || statusLower === 'delivered' || delivStatusLower === 'delivered' || item.deliveryDate) {
        return true;
      }

      // 2. POD exists
      const hasPodEntry = Boolean(
        (podMap && (podMap[awbStr] || podMap[awbClean] || podMap[awbStripped] || podMap[idStr])) ||
        item.podUrl ||
        item.podUploaded ||
        item.pod
      );
      if (hasPodEntry) return true;

      // 3. Tracking latest status is Delivered
      const track = (trackingMap && (trackingMap[awbStr] || trackingMap[awbClean] || trackingMap[awbStripped])) || null;
      const trackStatus = typeof track === 'object' ? track?.status : track;
      if (String(trackStatus || '').trim().toLowerCase() === 'delivered') {
        return true;
      }

      // 4. Date rule: on or before 20 Aug 2026 is delivered
      const dateObj = getBookingDateObj(item);
      if (dateObj && !isNaN(dateObj.getTime())) {
        const y = dateObj.getFullYear();
        const m = dateObj.getMonth();
        const d = dateObj.getDate();
        if (y < 2026 || (y === 2026 && (m < 7 || (m === 7 && d <= 20)))) {
          return true;
        }
      }

      return false;
    };
  }, [podMap, trackingMap]);

  const getBookingStatusInfo = useMemo(() => {
    return (item) => {
      if (!item) return { status: 'BOOKED', displayStatus: 'BOOKED', isDelivered: false, isPending: true };
      const awbStr = String(item.awb || item.consignment || item.lrNo || item.lrNumber || '').trim();
      const awbClean = awbStr.toLowerCase();
      const awbStripped = awbClean.replace(/^(mmc|lr|awb)[-_ ]*/i, '');

      const isDelivered = checkIsDelivered(item);
      if (isDelivered) {
        return { status: 'DELIVERED', displayStatus: 'DELIVERED', isDelivered: true, isPending: false };
      }

      const track = (trackingMap && (trackingMap[awbStr] || trackingMap[awbClean] || trackingMap[awbStripped])) || null;
      const trackStatus = typeof track === 'object' ? track?.status : track;
      const explicitStatus = trackStatus || item.transitStatus || item.trackingStatus || item.delivery_status || item.status || '';
      const norm = String(explicitStatus).trim().toLowerCase();

      if (norm.includes('out for delivery') || norm.includes('out_for_delivery')) {
        return { status: 'OUT FOR DELIVERY', displayStatus: 'OUT FOR DELIVERY', isDelivered: false, isPending: true };
      }
      if (norm.includes('deliver')) {
        return { status: 'DELIVERED', displayStatus: 'DELIVERED', isDelivered: true, isPending: false };
      }
      if (norm.includes('reach') || norm.includes('hub') || norm.includes('arrive')) {
        return { status: 'REACHED HUB', displayStatus: 'REACHED HUB', isDelivered: false, isPending: true };
      }
      if (norm.includes('transit')) {
        return { status: 'IN TRANSIT', displayStatus: 'IN TRANSIT', isDelivered: false, isPending: true };
      }
      if (norm.includes('delay')) {
        return { status: 'DELAYED', displayStatus: 'DELAYED', isDelivered: false, isPending: true };
      }
      if (norm.includes('return') || norm.includes('rto')) {
        return { status: 'RETURNED', displayStatus: 'RETURNED', isDelivered: false, isPending: true };
      }
      if (norm.includes('book')) {
        return { status: 'BOOKED', displayStatus: 'BOOKED', isDelivered: false, isPending: true };
      }

      return { status: 'BOOKED', displayStatus: 'BOOKED', isDelivered: false, isPending: true };
    };
  }, [checkIsDelivered, trackingMap]);

  const filtered = useMemo(() => {
    return displayBookings.filter(b => {
      const matchesSearch = !search ||
        (b.client || b.consignor || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.awb || b.lrNo || b.consignment || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.origin || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.destination || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.invoiceNo || b.invoice_no || b.invNo || b.invoice || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.invoiceDetails && Array.isArray(b.invoiceDetails) && b.invoiceDetails.some(inv => 
          (inv.invoiceNo || inv.invoice_no || inv.invNo || inv.invoice || "").toLowerCase().includes(search.toLowerCase())
        ));

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

      if (statusFilter && statusFilter !== 'all') {
        const info = getBookingStatusInfo(b);
        const norm = info.status.toLowerCase();
        if (statusFilter === 'pending') {
          if (!info.isPending) return false;
        } else if (statusFilter === 'delivered') {
          if (!info.isDelivered) return false;
        } else if (statusFilter === 'booked') {
          if (!norm.includes('book')) return false;
        } else if (statusFilter === 'transit') {
          if (!norm.includes('transit')) return false;
        } else if (statusFilter === 'out_for_delivery') {
          if (!norm.includes('out for delivery') && !norm.includes('out_for_delivery')) return false;
        } else if (statusFilter === 'delayed') {
          if (!norm.includes('delay')) return false;
        } else if (statusFilter === 'returned') {
          if (!norm.includes('return') && !norm.includes('rto')) return false;
        }
      }

      return true;
    });
  }, [displayBookings, search, startDate, endDate, statusFilter, getBookingStatusInfo]);

  const { sortedData, sortOption, setSortOption } = useTableSort(filtered, "awb_desc", { nameKey: "client", amountKey: "frieght", dateKey: "dispatch_date" });

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

  // Full / Lifetime & Monthly AWB Status Metrics with full breakdowns
  const awbStats = useMemo(() => {
    const list = displayBookings;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentMonthName = now.toLocaleString('default', { month: 'long' });

    let fullDelivered = 0;
    let fullBooked = 0;
    let fullTransit = 0;
    let fullOut = 0;
    let fullDelayed = 0;
    let fullReturned = 0;

    let monthTotal = 0;
    let monthDelivered = 0;

    for (const item of list) {
      const info = getBookingStatusInfo(item);
      if (info.isDelivered) {
        fullDelivered++;
      } else {
        const s = info.status;
        if (s === 'BOOKED') fullBooked++;
        else if (s === 'IN TRANSIT') fullTransit++;
        else if (s === 'OUT FOR DELIVERY') fullOut++;
        else if (s === 'DELAYED') fullDelayed++;
        else if (s === 'RETURNED') fullReturned++;
        else fullBooked++;
      }

      const dateObj = getBookingDateObj(item);
      if (dateObj && !isNaN(dateObj.getTime())) {
        if (dateObj.getFullYear() === currentYear && dateObj.getMonth() === currentMonth) {
          monthTotal++;
          if (info.isDelivered) monthDelivered++;
        }
      }
    }

    const fullTotal = list.length;
    const fullPending = Math.max(0, fullTotal - fullDelivered);
    const monthPending = Math.max(0, monthTotal - monthDelivered);

    return {
      currentMonthName,
      full: {
        total: fullTotal,
        delivered: fullDelivered,
        pending: fullPending,
        booked: fullBooked,
        transit: fullTransit,
        out: fullOut,
        delayed: fullDelayed,
        returned: fullReturned
      },
      monthly: {
        total: monthTotal,
        delivered: monthDelivered,
        pending: monthPending
      }
    };
  }, [displayBookings, getBookingStatusInfo]);

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

      {/* ── SuperAdmin Shipment Status Summary Bar (Full & Monthly) ── */}
      {isSuperAdmin && awbStats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <div className="glass-panel" style={{ padding: "1.25rem 1.5rem", borderLeft: "4px solid #f59e0b", borderRadius: "10px" }}>
            <div style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              ALL AWB STATUS
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: "600", color: "#374151", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => { setStatusFilter('delivered'); setCurrentPage(1); }}
                style={{ background: statusFilter === 'delivered' ? '#ecfdf5' : 'transparent', border: statusFilter === 'delivered' ? '1px solid #10b981' : '1px solid transparent', borderRadius: '6px', padding: '3px 6px', cursor: 'pointer' }}
                title="Filter: Delivered Shipments"
              >
                <span style={{ color: "#10b981", fontWeight: "700" }}>D:</span> {awbStats.full.delivered.toLocaleString()} <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: "500" }}>(Delivered)</span>
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
                style={{ background: statusFilter === 'pending' ? '#fffbeb' : 'transparent', border: statusFilter === 'pending' ? '1px solid #f59e0b' : '1px solid transparent', borderRadius: '6px', padding: '3px 6px', cursor: 'pointer' }}
                title="Filter: Pending AWBs"
              >
                <span style={{ color: "#f59e0b", fontWeight: "700" }}>P:</span> {awbStats.full.pending.toLocaleString()} <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: "500" }}>(Pending)</span>
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter('all'); setStartDate(''); setEndDate(''); setCurrentPage(1); }}
                style={{ background: statusFilter === 'all' && !startDate && !endDate ? '#f0f9ff' : 'transparent', border: statusFilter === 'all' && !startDate && !endDate ? '1px solid #0ea5e9' : '1px solid transparent', borderRadius: '6px', padding: '3px 6px', cursor: 'pointer' }}
                title="View All Bookings"
              >
                <span style={{ color: "#0ea5e9", fontWeight: "700" }}>T:</span> {awbStats.full.total.toLocaleString()} <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: "500" }}>(Total)</span>
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.25rem 1.5rem", borderLeft: "4px solid #10b981", borderRadius: "10px" }}>
            <div style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: "600", marginBottom: "0.5rem" }}>
              Current ({awbStats.currentMonthName})
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: "600", color: "#374151", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
              {(() => {
                const now = new Date();
                const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => { setStartDate(mStart); setEndDate(mEnd); setStatusFilter('delivered'); setCurrentPage(1); }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '3px 6px' }}
                      title={`Filter: ${awbStats.currentMonthName} Delivered`}
                    >
                      <span style={{ color: "#10b981", fontWeight: "700" }}>D:</span> {awbStats.monthly.delivered.toLocaleString()} <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: "500" }}>(Delivered)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStartDate(mStart); setEndDate(mEnd); setStatusFilter('pending'); setCurrentPage(1); }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '3px 6px' }}
                      title={`Filter: ${awbStats.currentMonthName} Pending`}
                    >
                      <span style={{ color: "#f59e0b", fontWeight: "700" }}>P:</span> {awbStats.monthly.pending.toLocaleString()} <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: "500" }}>(Pending)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStartDate(mStart); setEndDate(mEnd); setStatusFilter('all'); setCurrentPage(1); }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '3px 6px' }}
                      title={`Filter: ${awbStats.currentMonthName} All`}
                    >
                      <span style={{ color: "#0ea5e9", fontWeight: "700" }}>T:</span> {awbStats.monthly.total.toLocaleString()} <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: "500" }}>(Total)</span>
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

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
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setEntriesPerPage(val);
                  try {
                    localStorage.setItem('mmc_bookings_entries_per_page', String(val));
                  } catch (err) {
                    console.error('Failed to save entries per page preference', err);
                  }
                  setCurrentPage(1);
                }}
                className="premium-filter-input"
                style={{ cursor: "pointer", minWidth: "54px", width: "auto" }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="75">75</option>
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

          {/* Status Filter Dropdown & Reset Action */}
          <div className="premium-status-filter-row" style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
            <div className="premium-filter-group" style={{ flex: "1 1 210px", minWidth: "190px" }}>
              <Filter size={15} style={{ color: "#64748b", flexShrink: 0 }} />
              <span className="premium-filter-label">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="premium-filter-input"
                style={{
                  cursor: "pointer",
                  flex: 1,
                  fontWeight: statusFilter !== 'all' ? '600' : 'normal',
                  color: statusFilter !== 'all' ? '#1e40af' : 'inherit'
                }}
              >
                <option value="all">All Statuses ({awbStats?.full?.total || displayBookings.length})</option>
                <option value="pending">⏳ Pending AWB ({awbStats?.full?.pending ?? 0})</option>
                <option value="booked">📦 Booked ({awbStats?.full?.booked ?? 0})</option>
                <option value="transit">🚚 In Transit ({awbStats?.full?.transit ?? 0})</option>
                <option value="out_for_delivery">🛵 Out for Delivery ({awbStats?.full?.out ?? 0})</option>
                <option value="delivered">✅ Delivered ({awbStats?.full?.delivered ?? 0})</option>
                <option value="delayed">⚠️ Delayed ({awbStats?.full?.delayed ?? 0})</option>
                <option value="returned">↩️ Returned / RTO ({awbStats?.full?.returned ?? 0})</option>
              </select>
              {statusFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                  title="Clear Status Filter"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {(statusFilter !== 'all' || startDate || endDate || search) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setStartDate("");
                  setEndDate("");
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="btn-reset-filters"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
                title="Reset all filters and search query"
              >
                <RotateCcw size={13} />
                <span>Reset Filters</span>
              </button>
            )}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {currentEntries.map((item, index) => {
            const itemId = item.id || item._id;
            const isSelected = selectedBookingIds.includes(itemId);
            const displayParcels = item.invoiceDetails && item.invoiceDetails.length > 0
              ? item.invoiceDetails.filter(inv => inv.invoiceNo || inv.partNumber || inv.ewayBill || inv.invoiceValue)
              : (item.parcels || []);
            const hasParcels = displayParcels.length > 0;
            const awb = item.awb || item.consignment || item.lrNo || item.id?.slice(-6);
            const awbStr = String(awb || '').trim();
            const awbClean = awbStr.toLowerCase();
            const awbStripped = awbClean.replace(/^(mmc|lr|awb)[-_ ]*/i, '');

            const activeBox = (
              boxMap[awbStr] || 
              boxMap[awbClean] || 
              boxMap[awbStripped] || 
              (item.id && boxMap[String(item.id)]) || 
              (item._id && boxMap[String(item._id)]) ||
              (item.boxUrl ? { boxUrl: item.boxUrl } : null)
            );
            const hasBox = Boolean(activeBox || item.boxUploaded || item.boxUrl);

            const activePod = (
              podMap[awbStr] || 
              podMap[awbClean] || 
              podMap[awbStripped] || 
              (item.id && podMap[String(item.id)]) || 
              (item._id && podMap[String(item._id)]) ||
              (item.podUrl ? { podUrl: item.podUrl } : null)
            );
            const hasPodEntry = Boolean(activePod || item.podUploaded || item.podUrl);
            const itemWithAwb = { ...item, awb: awb || item.awb || item.awbNo || item.consignment || item.lrNo };

            // Assign one of the 5 attractive colors so consecutive cards alternate cleanly
            const colorIndex = (typeof item.colorIndex === 'number')
              ? (item.colorIndex % BOOKING_CARD_PALETTES.length)
              : ((indexOfFirst + index) % BOOKING_CARD_PALETTES.length);
            const cardTheme = BOOKING_CARD_PALETTES[colorIndex];

            return (
              <div 
                key={itemId || `booking-${index}`} 
                className={`booking-card card-accent-${colorIndex}${item.isOfflinePending ? ' is-offline-pending' : ''}`}
                style={{ 
                  opacity: item.isOfflinePending ? 0.8 : 1, 
                  borderColor: isSelected 
                    ? cardTheme.border 
                    : (item.isOfflinePending ? "#f59e0b" : undefined), 
                  borderLeftColor: item.isOfflinePending 
                    ? "#f59e0b" 
                    : cardTheme.border,
                  boxShadow: isSelected 
                    ? `0 4px 16px ${cardTheme.glow}` 
                    : undefined,
                  background: isSelected ? "#f8faff" : undefined 
                }}
              >

                {/* ── Card Header ── */}
                <div className="booking-card-header">
                  <div className="booking-card-top-row">
                    <div className="booking-client-select-group">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectBooking(itemId)}
                        style={{ 
                          width: "18px", 
                          height: "18px", 
                          cursor: "pointer", 
                          accentColor: cardTheme.checkbox, 
                          flexShrink: 0 
                        }}
                      />
                      <h4 className="booking-client-name">
                        {String(item.client || item.consignor || "UNKNOWN CLIENT").toUpperCase()}
                        {item.isOfflinePending && (
                          <Clock size={16} color="#f59e0b" title="Pending Sync (Offline)" />
                        )}
                      </h4>
                    </div>

                    {/* Status badge & Location in top right */}
                    {(() => {
                      const track = trackingMap[awbStr] || trackingMap[awbClean] || trackingMap[awbStripped];
                      const statusInfo = getBookingStatusInfo(item);
                      const isDelivered = statusInfo.isDelivered;

                      const rawLocation = isDelivered 
                        ? (item.destination || (typeof track === 'object' ? track?.location : null) || item.currentLocation || 'Destination')
                        : ((typeof track === 'object' ? track?.location : null) || item.currentLocation || item.origin || 'Origin Facility');

                      const location = String(rawLocation || '').trim().toUpperCase();
                      const displayStatus = statusInfo.displayStatus;
                      const normStatus = statusInfo.status.toLowerCase();

                      let bg = '#eff6ff';
                      let color = '#2563eb';
                      let border = '#bfdbfe';
                      let icon = <Package size={13} />;

                      if (normStatus.includes('out for delivery') || normStatus.includes('out_for_delivery')) {
                        bg = '#f5f3ff';
                        color = '#7c3aed';
                        border = '#ddd6fe';
                        icon = <Truck size={13} />;
                      } else if (normStatus.includes('deliver')) {
                        bg = '#ecfdf5';
                        color = '#059669';
                        border = '#a7f3d0';
                        icon = <CheckCircle2 size={13} />;
                      } else if (normStatus.includes('reach') || normStatus.includes('hub') || normStatus.includes('arrive')) {
                        bg = '#f0fdfa';
                        color = '#0d9488';
                        border = '#99f6e4';
                        icon = <MapPin size={13} />;
                      } else if (normStatus.includes('transit')) {
                        bg = '#fffbeb';
                        color = '#d97706';
                        border = '#fde68a';
                        icon = <Truck size={13} />;
                      } else if (normStatus.includes('delay')) {
                        bg = '#fff7ed';
                        color = '#ea580c';
                        border = '#fed7aa';
                        icon = <Clock size={13} />;
                      } else if (normStatus.includes('return') || normStatus.includes('rto')) {
                        bg = '#fef2f2';
                        color = '#dc2626';
                        border = '#fecaca';
                        icon = <RotateCcw size={13} />;
                      } else {
                        // Default to BOOKED
                        bg = '#eff6ff';
                        color = '#2563eb';
                        border = '#bfdbfe';
                        icon = <Package size={13} />;
                      }

                      return (
                        <div className="booking-status-wrapper">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBookingForTracking(itemWithAwb);
                              setBulkBookingsForTracking([]);
                              setTrackingModalOpen(true);
                            }}
                            className="booking-status-pill"
                            style={{
                              background: bg,
                              color: color,
                              border: `1.5px solid ${border}`,
                            }}
                            title={`Status: ${displayStatus}${location ? ` • ${location}` : ''} (Click to update tracking checkpoint)`}
                          >
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 800, fontSize: "0.72rem", letterSpacing: "0.02em" }}>
                              {icon} <span>{displayStatus}</span>
                            </div>
                            {location && (
                              <span 
                                style={{ 
                                  fontSize: "0.58rem", 
                                  fontWeight: 700, 
                                  color: "#ef4444", 
                                  display: "inline-flex", 
                                  alignItems: "center", 
                                  gap: "2px", 
                                  textTransform: "uppercase",
                                  lineHeight: 1,
                                  letterSpacing: "0.02em"
                                }}
                              >
                                <MapPin size={8} color="#ef4444" /> {location}
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    })()}
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
                    <span className="booking-meta-badge" title="Entered Booking Date">
                      📅 {formatDate(item.dispatch_date || item.date || item.createdAt)}
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
                      <Package size={13} /> Pkg: {item.box || item.boxes || item.packages || item.pkg || item.pcs || item.package_count || item.packageCount || item.pieces || (item.dimensions && Array.isArray(item.dimensions) && item.dimensions.reduce((acc, d) => acc + (Number(d.boxCount) || 0), 0)) || 1}
                    </span>

                    {/* Weight Badge */}
                    <span className="booking-meta-badge booking-badge-wt" style={{ background: "#f8fafc", color: "#334155", border: "1px solid #e2e8f0" }}>
                      ⚖️ Wt: {item.charge_wt || item.chargeable_weight || item.chargeWeight || item.weight || item.actual_wt || "0"} Kg
                    </span>

                    {/* Billing Status Badge */}
                    {item.billed === true || String(item.status || '').toLowerCase() === 'billed' || item.billNo ? (
                      <span className="booking-meta-badge booking-badge-billed" style={{ background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", fontWeight: 700 }} title={`Invoice: ${item.billNo || 'Billed'}`}>
                        🧾 BILLED {item.billNo ? `(${item.billNo})` : ""}
                      </span>
                    ) : (
                      <span className="booking-meta-badge booking-badge-unbilled" style={{ background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a", fontWeight: 600 }}>
                        📄 UNBILLED
                      </span>
                    )}

                    {item.dimensions && Array.isArray(item.dimensions) && item.dimensions.some(d => d.length || d.breadth || d.height || d.boxCount) && (
                      <span className="booking-meta-badge booking-badge-dims">
                        Dims: {item.dimensions.filter(d => d.length || d.breadth || d.height).map((d) => `${d.length || 0}x${d.breadth || 0}x${d.height || 0}cm (${d.boxCount || 0} Pcs)`).join(', ')}
                      </span>
                    )}

                    {/* Super Admin Audit: Booked By & Real Timestamp */}
                    {isSuperAdmin && (
                      <div className="booking-superadmin-meta">
                        <span 
                          className="booking-meta-badge"
                          style={{ 
                            background: "#f1f5f9", 
                            color: "#475569", 
                            border: "1px solid #cbd5e1",
                            fontWeight: 700,
                            letterSpacing: "0.02em",
                            textTransform: "uppercase"
                          }}
                          title={`Booked by: ${item.clerk_name || "Admin"}`}
                        >
                          👤 BOOKED BY: {String(item.clerk_name || "Admin").toUpperCase()}
                        </span>
                        <span 
                          className="booking-meta-badge" 
                          style={{ 
                            background: "#f8fafc", 
                            color: "#64748b", 
                            border: "1px solid #e2e8f0",
                            fontWeight: 500,
                            letterSpacing: "0.02em"
                          }} 
                          title={`Database Real Creation Timestamp (Super Admin Tracking): ${item.createdAt || item.realBookingDate || item.created_at || item.date}`}
                        >
                          🕒 REAL: {formatRealDateTimeSec(item.createdAt || item.realBookingDate || item.created_at || item.date)}
                        </span>
                      </div>
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
                          {displayParcels.map((parcel, pIdx) => {
                            const rawVal = parcel.value !== undefined && parcel.value !== null && parcel.value !== '' ? parcel.value : parcel.invoiceValue;
                            const numVal = parseFloat(rawVal);
                            const displayVal = !isNaN(numVal) ? `₹${numVal.toFixed(2)}` : (rawVal && String(rawVal) !== 'NaN' ? (String(rawVal).startsWith('₹') ? rawVal : `₹${rawVal}`) : 'NA');

                            return (
                              <tr key={pIdx}>
                                <td style={{ fontWeight: 600 }}>{parcel.invoice || parcel.invoiceNo || '-'}</td>
                                <td>{(parcel.invdate || parcel.invoiceDate) ? formatDate(parcel.invdate || parcel.invoiceDate) : '-'}</td>
                                <td>{parcel.part || parcel.partNumber || '-'}</td>
                                <td>{parcel.quantity || '-'}</td>
                                <td style={{ fontWeight: 600, textAlign: 'right' }}>
                                  {displayVal}
                                </td>
                                <td>{parcel.eway || parcel.ewayBill || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View: High Density Full-Width Parcel Cards */}
                    <div className="booking-mobile-parcel-list">
                      {displayParcels.map((parcel, pIdx) => {
                        const rawVal = parcel.value !== undefined && parcel.value !== null && parcel.value !== '' ? parcel.value : parcel.invoiceValue;
                        const numVal = parseFloat(rawVal);
                        const displayVal = !isNaN(numVal) ? `₹${numVal.toFixed(2)}` : (rawVal && String(rawVal) !== 'NaN' ? (String(rawVal).startsWith('₹') ? rawVal : `₹${rawVal}`) : 'NA');

                        return (
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
                                  {displayVal}
                                </span>
                              </div>
                              <div className="booking-mobile-parcel-item">
                                <span className="booking-mobile-label">E-Way</span>
                                <span className="booking-mobile-val">{parcel.eway || parcel.ewayBill || '-'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="booking-empty-lr">
                    <PackageOpen size={24} style={{ opacity: 0.4, marginBottom: '0.25rem' }} />
                    <span>No LR details attached</span>
                  </div>
                )}

                {/* ── Action Buttons Footer ── */}
                {(() => {
                  if (isSuperAdmin) {
                    return (
                      <div className="booking-card-footer booking-card-footer-multiline">
                        <div className="booking-footer-row booking-footer-row-admin">
                          <button
                            onClick={() => navigate(`/bookings/edit/${item.id}`)}
                            className="booking-action-btn booking-btn-edit"
                            title="Edit Booking"
                          >
                            <Edit size={13} />
                            <span className="booking-action-btn-text">EDIT</span>
                          </button>
                          {!item.isOfflinePending && (
                            <>
                              <button
                                onClick={() => handlePrintAction(item)}
                                className="booking-action-btn booking-btn-print"
                                title="Direct Print LR (Opens Printer)"
                              >
                                <Printer size={13} />
                                <span className="booking-action-btn-text">PRINT</span>
                              </button>
                              <button
                                onClick={() => window.open(`/print-lr/${item.id}`, "_blank")}
                                className="booking-action-btn booking-btn-download"
                                title="View LR / Bilty Page"
                              >
                                <Eye size={13} />
                                <span className="booking-action-btn-text">VIEW</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(item.id || item._id)}
                            className="booking-action-btn booking-btn-delete"
                            title="Delete Booking"
                          >
                            <Trash2 size={13} />
                            <span className="booking-action-btn-text">DELETE</span>
                          </button>
                        </div>
                        <div className="booking-footer-row booking-footer-row-ops">
                          <button
                            disabled={item.isOfflinePending}
                            onClick={() => {
                              if (hasBox) {
                                const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
                                const boxObj = activeBox || {};
                                let fileUrl = boxObj.boxUrl || boxObj.cloudinaryUrl || `${apiUrl}/uploads/box/${boxObj.fileName || boxObj.filename || ""}`;
                                fileUrl = getSafeCloudinaryPdfUrl(fileUrl);
                                navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}&title=Box%20Document%20Viewer`);
                              } else {
                                setSelectedBookingForBox(itemWithAwb);
                                setBoxModalOpen(true);
                              }
                            }}
                            className={`booking-action-btn ${hasBox ? 'booking-btn-box-has' : 'booking-btn-box-add'}`}
                            style={{ opacity: item.isOfflinePending ? 0.5 : 1, cursor: item.isOfflinePending ? "not-allowed" : "pointer" }}
                            title={hasBox ? "View Box Document" : "Upload Box Document"}
                          >
                            {hasBox ? <Eye size={13} /> : <PackageOpen size={13} />}
                            <span className="booking-action-btn-text">{hasBox ? "BOX" : "+ BOX"}</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBookingForTracking(itemWithAwb);
                              setTrackingModalOpen(true);
                            }}
                            className="booking-action-btn booking-btn-track"
                            title="Update Shipment Tracking"
                          >
                            <Truck size={13} />
                            <span className="booking-action-btn-text">TRACK</span>
                          </button>
                          <button
                            disabled={item.isOfflinePending}
                            onClick={() => {
                              if (hasPodEntry) {
                                const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
                                const podObj = activePod || {};
                                let fileUrl = podObj.podUrl || podObj.cloudinaryUrl || podObj.fileData || `${apiUrl}/uploads/pod/${podObj.fileName || podObj.filename || ""}`;
                                if (fileUrl && fileUrl.startsWith('data:')) {
                                  try {
                                    sessionStorage.setItem('tempPodData', fileUrl);
                                    navigate(`/pod/view?source=session&title=Proof%20of%20Delivery`);
                                  } catch (e) {
                                    navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}`);
                                  }
                                } else if (fileUrl) {
                                  fileUrl = getSafeCloudinaryPdfUrl(fileUrl);
                                  navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}`);
                                }
                              } else {
                                setSelectedBookingForPod(itemWithAwb);
                                setPodModalOpen(true);
                              }
                            }}
                            className={`booking-action-btn ${hasPodEntry ? 'booking-btn-pod-has' : 'booking-btn-pod-add'}`}
                            style={{ opacity: item.isOfflinePending ? 0.5 : 1, cursor: item.isOfflinePending ? "not-allowed" : "pointer" }}
                            title={hasPodEntry ? "View Proof of Delivery" : "Upload Proof of Delivery"}
                          >
                            {hasPodEntry ? <Eye size={13} /> : <FileCheck size={13} />}
                            <span className="booking-action-btn-text">{hasPodEntry ? "POD" : "+ POD"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="booking-card-footer booking-card-footer-singleline">
                      {!item.isOfflinePending && (
                        <>
                          <button
                            onClick={() => handlePrintAction(item)}
                            className="booking-action-btn booking-btn-print"
                            title="Direct Print LR (Opens Printer)"
                          >
                            <Printer size={13} />
                            <span className="booking-action-btn-text">PRINT</span>
                          </button>
                          <button
                            onClick={() => window.open(`/print-lr/${item.id}`, "_blank")}
                            className="booking-action-btn booking-btn-download"
                            title="View LR / Bilty Page"
                          >
                            <Eye size={13} />
                            <span className="booking-action-btn-text">VIEW</span>
                          </button>
                        </>
                      )}
                      {canAccessPod && (
                        <>
                          <button
                            disabled={item.isOfflinePending}
                            onClick={() => {
                              if (hasBox) {
                                const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
                                const boxObj = activeBox || {};
                                let fileUrl = boxObj.boxUrl || boxObj.cloudinaryUrl || `${apiUrl}/uploads/box/${boxObj.fileName || boxObj.filename || ""}`;
                                fileUrl = getSafeCloudinaryPdfUrl(fileUrl);
                                navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}&title=Box%20Document%20Viewer`);
                              } else {
                                setSelectedBookingForBox(itemWithAwb);
                                setBoxModalOpen(true);
                              }
                            }}
                            className={`booking-action-btn ${hasBox ? 'booking-btn-box-has' : 'booking-btn-box-add'}`}
                            style={{ opacity: item.isOfflinePending ? 0.5 : 1, cursor: item.isOfflinePending ? "not-allowed" : "pointer" }}
                            title={hasBox ? "View Box Document" : "Upload Box Document"}
                          >
                            {hasBox ? <Eye size={13} /> : <PackageOpen size={13} />}
                            <span className="booking-action-btn-text">{hasBox ? "BOX" : "+ BOX"}</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBookingForTracking(itemWithAwb);
                              setTrackingModalOpen(true);
                            }}
                            className="booking-action-btn booking-btn-track"
                            title="Update Shipment Tracking"
                          >
                            <Truck size={13} />
                            <span className="booking-action-btn-text">TRACK</span>
                          </button>
                          <button
                            disabled={item.isOfflinePending}
                            onClick={() => {
                              if (hasPodEntry) {
                                const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
                                const podObj = activePod || {};
                                let fileUrl = podObj.podUrl || podObj.cloudinaryUrl || podObj.fileData || `${apiUrl}/uploads/pod/${podObj.fileName || podObj.filename || ""}`;
                                if (fileUrl && fileUrl.startsWith('data:')) {
                                  try {
                                    sessionStorage.setItem('tempPodData', fileUrl);
                                    navigate(`/pod/view?source=session&title=Proof%20of%20Delivery`);
                                  } catch (e) {
                                    navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}`);
                                  }
                                } else if (fileUrl) {
                                  fileUrl = getSafeCloudinaryPdfUrl(fileUrl);
                                  navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}`);
                                }
                              } else {
                                setSelectedBookingForPod(itemWithAwb);
                                setPodModalOpen(true);
                              }
                            }}
                            className={`booking-action-btn ${hasPodEntry ? 'booking-btn-pod-has' : 'booking-btn-pod-add'}`}
                            style={{ opacity: item.isOfflinePending ? 0.5 : 1, cursor: item.isOfflinePending ? "not-allowed" : "pointer" }}
                            title={hasPodEntry ? "View Proof of Delivery" : "Upload Proof of Delivery"}
                          >
                            {hasPodEntry ? <Eye size={13} /> : <FileCheck size={13} />}
                            <span className="booking-action-btn-text">{hasPodEntry ? "POD" : "+ POD"}</span>
                          </button>
                        </>
                      )}
                    </div>
                  );
                })()}
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