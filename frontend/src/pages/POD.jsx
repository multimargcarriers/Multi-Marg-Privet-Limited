import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Table from "../components/Table";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Trash2, 
  AlertCircle, 
  Search, 
  Eye, 
  X, 
  Calendar, 
  RefreshCw, 
  ExternalLink,
  Clock,
  FileCheck,
  Camera,
  Image as ImageIcon,
  Filter,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  MapPin,
  Building,
  User,
  FileType,
  Check,
  SlidersHorizontal,
  ArrowRight,
  Tag,
  Layers,
  Info
} from "lucide-react";
import CopyButton, { AwbBadge } from "../components/CopyButton";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { useToast } from "../context/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate, getSafeCloudinaryPdfUrl } from '../utils/formatters';
import PODImageStudioModal from "../components/pod/PODImageStudioModal";
import { useSync } from "../context/SyncContext";
import { compressImage } from "../utils/imageCompressor";

const POD = () => {
  const { user } = useContext(AuthContext);
  const { syncQueue } = useSync();
  const { confirm, alert: alertDialog } = useDialog();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimarg.com' || user?.role === 'admin';

  // Data states
  const [podList, setPodList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal / Add Form states
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // { name, type, dataUrl }
  
  // LR Unified Smart Auto-Select State
  const [lrInput, setLrInput] = useState("");
  const [selectedLR, setSelectedLR] = useState(null); // explicitly clicked from dropdown or auto-matched
  const [remarks, setRemarks] = useState("");

  // Table Filter states
  const [tableSearch, setTableSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL"); // 'ALL' | 'VERIFIED' | 'UNKNOWN'
  const [_previewImage, _setPreviewImage] = useState(null); // URL for modal preview

  // Advanced Filters State - Dual Date Filters (POD Upload Date & AWB Booking Date)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeDateMode, setActiveDateMode] = useState("POD_UPLOAD"); // 'POD_UPLOAD' | 'AWB_BOOKING'
  const [uploadDatePreset, setUploadDatePreset] = useState("ALL"); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'
  const [uploadStartDate, setUploadStartDate] = useState("");
  const [uploadEndDate, setUploadEndDate] = useState("");
  const [bookingDatePreset, setBookingDatePreset] = useState("ALL"); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'
  const [bookingStartDate, setBookingStartDate] = useState("");
  const [bookingEndDate, setBookingEndDate] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedOrigin, setSelectedOrigin] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("");
  const [selectedConsignor, setSelectedConsignor] = useState("");
  const [selectedConsignee, setSelectedConsignee] = useState("");
  const [selectedDocType, setSelectedDocType] = useState("ALL"); // 'ALL' | 'IMAGE' | 'PDF'
  const [remarksFilter, setRemarksFilter] = useState("ALL"); // 'ALL' | 'WITH_REMARKS' | 'WITHOUT_REMARKS'

  // POD Image Studio Modal state
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioMode, setStudioMode] = useState("camera"); // 'camera' | 'editor'
  const [studioInitialSrc, setStudioInitialSrc] = useState(null);

  const fileInputRef = useRef(null);
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchPODs(), fetchBookings()]);
    setLoading(false);
  };

  const fetchPODs = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/pod`);
      if (res.data.success) {
        setPodList(res.data.data || []);
      }
    } catch (err) {
      console.error("Fetch POD error", err);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/bookings?worldwide=true`);
      if (res.data.success) {
        setBookingsList(res.data.data || []);
      }
    } catch (err) {
      console.error("Fetch Bookings error", err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPODs(), fetchBookings()]);
    setRefreshing(false);
  };

  // Helper to extract LR/AWB number cleanly
  const getBookingAwb = (b) => {
    if (!b) return "";
    return b.awb || b.consignment || b.lrNo || b.lr_number || b.lrNumber || b.awbNo || (b.id ? String(b.id).slice(-6) : "");
  };

  // Smart auto-detect if typed LR exists in database
  const matchedLR = useMemo(() => {
    if (selectedLR) return selectedLR;
    if (!lrInput || !lrInput.trim()) return null;
    const clean = lrInput.trim().toLowerCase();
    return bookingsList.find(b => getBookingAwb(b).toLowerCase() === clean) || null;
  }, [selectedLR, lrInput, bookingsList]);

  // Filtered LRs for autocomplete search in modal
  const filteredLRs = useMemo(() => {
    if (!lrInput || lrInput.trim().length === 0) return [];
    const q = lrInput.toLowerCase().trim();
    return bookingsList.filter(b => {
      const awb = getBookingAwb(b).toLowerCase();
      const client = (b.client || b.billedTo || b.billing_party || "").toLowerCase();
      const consignor = (b.consignor || "").toLowerCase();
      const consignee = (b.consignee || "").toLowerCase();
      const origin = (b.origin || "").toLowerCase();
      const destination = (b.destination || "").toLowerCase();
      return (
        awb.includes(q) ||
        client.includes(q) ||
        consignor.includes(q) ||
        consignee.includes(q) ||
        origin.includes(q) ||
        destination.includes(q)
      );
    });
  }, [bookingsList, lrInput]);

  // Handle selecting an LR from the search dropdown
  const _handleSelectLR = (booking) => {
    setSelectedLR(booking);
    setLrInput(getBookingAwb(booking));
  };

  // Convert File to Base64 Data URL
  const fileToDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Handle Gallery / File selection
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      // PDF: accept immediately without cropping studio
      const dataUrl = await fileToDataURL(file);
      setSelectedFile({
        name: file.name,
        type: "pdf",
        dataUrl,
        sizeBytes: file.size
      });
    } else {
      // Compress and open in POD Image Studio Editor for cropping/rotation/enhancement
      const compressed = await compressImage(file, {
        maxDimension: 1920,
        targetMaxBytes: 700 * 1024,
        initialQuality: 0.85
      });
      setStudioInitialSrc(compressed.dataUrl);
      setStudioMode("editor");
      setStudioOpen(true);
    }
  };

  // Open Live Camera Scanner
  const handleOpenCamera = () => {
    setStudioInitialSrc(null);
    setStudioMode("camera");
    setStudioOpen(true);
  };

  // Callback from POD Image Studio when user saves edited/captured image
  const handleStudioSave = async (editedDataUrl, filename) => {
    // Ensure final output is compressed under 1MB with high sharpness
    const compressed = await compressImage(editedDataUrl, {
      maxDimension: 1920,
      targetMaxBytes: 700 * 1024,
      initialQuality: 0.85
    });

    setSelectedFile({
      name: filename || `POD_Capture_${Date.now()}.jpg`,
      type: "image",
      dataUrl: compressed.dataUrl,
      sizeBytes: compressed.sizeBytes,
      originalSizeBytes: compressed.originalSizeBytes
    });
  };

  // Upload POD form submission
  const handleUpload = async (e) => {
    e.preventDefault();
    const finalLrNo = (matchedLR ? getBookingAwb(matchedLR) : lrInput).trim();

    if (!finalLrNo) {
      alertDialog({
        title: "LR Number Required",
        message: "Please enter an LR or AWB number.",
      });
      return;
    }

    if (!selectedFile || !selectedFile.dataUrl) {
      alertDialog({
        title: "Proof Document Required",
        message: "Please take a camera photo or select an image/PDF file as Proof of Delivery.",
      });
      return;
    }

    setUploading(true);
    try {
      const payload = {
        lrNo: finalLrNo,
        fileName: selectedFile.name,
        fileData: selectedFile.dataUrl,
        podType: matchedLR ? "VERIFIED" : "UNKNOWN",
        bookingId: matchedLR ? matchedLR.id : null,
        consignor: matchedLR ? (matchedLR.consignor || "-") : "-",
        consignee: matchedLR ? (matchedLR.consignee || "-") : "-",
        origin: matchedLR ? (matchedLR.origin || "-") : "-",
        destination: matchedLR ? (matchedLR.destination || "-") : "-",
        client: matchedLR ? (matchedLR.client || matchedLR.billedTo || "-") : "-",
        remarks: remarks.trim()
      };

      const res = await axios.post(`${apiUrl}/api/pod`, payload);
      if (res.data.success) {
        await fetchPODs();
        // Reset form
        setSelectedFile(null);
        setSelectedLR(null);
        setLrInput("");
        setRemarks("");
        setIsAdding(false);
      } else {
        alertDialog({
          title: "Upload Failed",
          message: res.data.message || "Could not upload POD. Please try again.",
        });
      }
    } catch (err) {
      console.error("Upload POD error", err);
      alertDialog({
        title: "Error",
        message: "An error occurred while uploading the Proof of Delivery document.",
      });
    } finally {
      setUploading(false);
    }
  };

  // Delete POD
  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete POD Document",
      message: "Are you sure you want to delete this Proof of Delivery? This will also revert the shipment's delivery status back to its previous position.",
      confirmText: "Delete & Revert",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;

    setPodList(prev => prev.filter(p => p.id !== id));
    try {
      const res = await axios.delete(`${apiUrl}/api/pod/${id}`);
      if (res.data.success) {
        addToast("POD document deleted and shipment position reversed!", "success");
      }
      fetchPODs();
    } catch (err) {
      console.error("Delete POD error", err);
      fetchPODs();
    }
  };

  // Stats Calculations
  const displayPODs = useMemo(() => {
    const pending = (syncQueue || [])
      .filter(req => req.method === 'post' && req.url.includes('/pod'))
      .map(req => ({
        ...req.data,
        id: req.tempId,
        isOfflinePending: true,
      }));
    return [...pending, ...podList];
  }, [podList, syncQueue]);

  const stats = useMemo(() => {
    const total = displayPODs.length;
    const verifiedCount = displayPODs.filter(p => (p.podType === "VERIFIED" || p.bookingId || p.consignor !== "-" || p.origin !== "-")).length;
    const unknownCount = total - verifiedCount;
    
    // Uploaded today
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCount = displayPODs.filter(p => {
      const dt = p.uploadedAt || p.createdAt;
      return dt && dt.startsWith(todayStr);
    }).length;

    return { total, verifiedCount, unknownCount, todayCount };
  }, [displayPODs]);

  // Fast Booking Lookup Map for AWB linking & Booking Date detection
  const bookingByLrMap = useMemo(() => {
    const map = new Map();
    bookingsList.forEach(b => {
      const awb = getBookingAwb(b);
      if (awb) {
        const raw = String(awb).trim();
        const lower = raw.toLowerCase();
        const stripped = lower.replace(/^(mmc|lr|awb)[-_ ]*/i, '');
        map.set(raw, b);
        map.set(lower, b);
        if (stripped) map.set(stripped, b);
      }
      if (b.id) map.set(String(b.id), b);
      if (b._id) map.set(String(b._id), b);
    });
    return map;
  }, [bookingsList]);

  // Helper to retrieve matched booking for a POD item
  const getBookingByLr = (item) => {
    if (!item) return null;
    if (item.bookingId && bookingByLrMap.has(String(item.bookingId))) {
      return bookingByLrMap.get(String(item.bookingId));
    }
    const cleanLr = String(item.lrNo || '').toLowerCase().trim();
    if (cleanLr && bookingByLrMap.has(cleanLr)) {
      return bookingByLrMap.get(cleanLr);
    }
    const stripped = cleanLr.replace(/^(mmc|lr|awb)[-_ ]*/i, '');
    if (stripped && bookingByLrMap.has(stripped)) {
      return bookingByLrMap.get(stripped);
    }
    return null;
  };

  // Helper to extract booking / consignment creation date (YYYY-MM-DD)
  const getBookingDateStr = (item) => {
    const b = getBookingByLr(item);
    if (!b) return "";
    const raw = b.date || b.dispatch_date || b.bookingDate || b.booking_date || b.createdAt || b.created_at;
    if (!raw) return "";
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return "";
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  };

  // Date helper utilities
  const getItemDateStr = (item) => {
    const dt = item.uploadedAt || item.createdAt;
    if (!dt) return "";
    try {
      const d = new Date(dt);
      if (isNaN(d.getTime())) return "";
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  };

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getSevenDaysAgoStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getThisMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const getLastMonthStr = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Generic Date matcher for presets & custom date ranges
  const matchesDateFilter = (dateStr, preset, start, end) => {
    if (preset === "ALL") return true;
    if (!dateStr) return false;
    const today = getTodayStr();

    if (preset === "TODAY") return dateStr === today;
    if (preset === "YESTERDAY") return dateStr === getYesterdayStr();
    if (preset === "LAST_7_DAYS") return dateStr >= getSevenDaysAgoStr() && dateStr <= today;
    if (preset === "THIS_MONTH") return dateStr.startsWith(getThisMonthStr());
    if (preset === "LAST_MONTH") return dateStr.startsWith(getLastMonthStr());
    if (preset === "CUSTOM") {
      if (start && dateStr < start) return false;
      if (end && dateStr > end) return false;
      return true;
    }
    return true;
  };

  // Dynamic filter option lists derived from data
  const filterOptions = useMemo(() => {
    const clients = new Set();
    const origins = new Set();
    const destinations = new Set();
    const consignors = new Set();
    const consignees = new Set();

    displayPODs.forEach(p => {
      if (p.client && p.client !== "-") clients.add(String(p.client).trim());
      if (p.origin && p.origin !== "-") origins.add(String(p.origin).trim());
      if (p.destination && p.destination !== "-") destinations.add(String(p.destination).trim());
      if (p.consignor && p.consignor !== "-") consignors.add(String(p.consignor).trim());
      if (p.consignee && p.consignee !== "-") consignees.add(String(p.consignee).trim());
    });

    bookingsList.forEach(b => {
      const client = b.client || b.billedTo || b.billing_party;
      if (client && client !== "-") clients.add(String(client).trim());
      if (b.origin && b.origin !== "-") origins.add(String(b.origin).trim());
      if (b.destination && b.destination !== "-") destinations.add(String(b.destination).trim());
      if (b.consignor && b.consignor !== "-") consignors.add(String(b.consignor).trim());
      if (b.consignee && b.consignee !== "-") consignees.add(String(b.consignee).trim());
    });

    return {
      clients: Array.from(clients).sort((a, b) => a.localeCompare(b)),
      origins: Array.from(origins).sort((a, b) => a.localeCompare(b)),
      destinations: Array.from(destinations).sort((a, b) => a.localeCompare(b)),
      consignors: Array.from(consignors).sort((a, b) => a.localeCompare(b)),
      consignees: Array.from(consignees).sort((a, b) => a.localeCompare(b)),
    };
  }, [displayPODs, bookingsList]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeTab !== "ALL") count++;
    if (uploadDatePreset !== "ALL") count++;
    if (uploadDatePreset === "CUSTOM" && (uploadStartDate || uploadEndDate)) count++;
    if (bookingDatePreset !== "ALL") count++;
    if (bookingDatePreset === "CUSTOM" && (bookingStartDate || bookingEndDate)) count++;
    if (selectedClient) count++;
    if (selectedOrigin) count++;
    if (selectedDestination) count++;
    if (selectedConsignor) count++;
    if (selectedConsignee) count++;
    if (selectedDocType !== "ALL") count++;
    if (remarksFilter !== "ALL") count++;
    if (tableSearch.trim()) count++;
    return count;
  }, [
    activeTab, 
    uploadDatePreset, 
    uploadStartDate, 
    uploadEndDate, 
    bookingDatePreset, 
    bookingStartDate, 
    bookingEndDate, 
    selectedClient, 
    selectedOrigin, 
    selectedDestination, 
    selectedConsignor, 
    selectedConsignee, 
    selectedDocType, 
    remarksFilter, 
    tableSearch
  ]);

  const resetAllFilters = () => {
    setActiveTab("ALL");
    setUploadDatePreset("ALL");
    setUploadStartDate("");
    setUploadEndDate("");
    setBookingDatePreset("ALL");
    setBookingStartDate("");
    setBookingEndDate("");
    setSelectedClient("");
    setSelectedOrigin("");
    setSelectedDestination("");
    setSelectedConsignor("");
    setSelectedConsignee("");
    setSelectedDocType("ALL");
    setRemarksFilter("ALL");
    setTableSearch("");
  };

  // Active filter chips for button pill display
  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (activeTab !== "ALL") {
      chips.push({
        id: "tab",
        label: "Status",
        value: activeTab === "VERIFIED" ? "Verified LRs" : "Unknown LR",
        onRemove: () => setActiveTab("ALL")
      });
    }
    // POD Upload Date Chip
    if (uploadDatePreset !== "ALL") {
      let dateLabel = uploadDatePreset;
      if (uploadDatePreset === "TODAY") dateLabel = "Today";
      else if (uploadDatePreset === "YESTERDAY") dateLabel = "Yesterday";
      else if (uploadDatePreset === "LAST_7_DAYS") dateLabel = "Last 7 Days";
      else if (uploadDatePreset === "THIS_MONTH") dateLabel = "This Month";
      else if (uploadDatePreset === "LAST_MONTH") dateLabel = "Last Month";
      else if (uploadDatePreset === "CUSTOM") dateLabel = `${uploadStartDate || "Start"} → ${uploadEndDate || "End"}`;
      chips.push({
        id: "uploadDate",
        label: "📸 POD Upload Date",
        value: dateLabel,
        onRemove: () => { setUploadDatePreset("ALL"); setUploadStartDate(""); setUploadEndDate(""); }
      });
    }
    // AWB Booking Date Chip
    if (bookingDatePreset !== "ALL") {
      let dateLabel = bookingDatePreset;
      if (bookingDatePreset === "TODAY") dateLabel = "Today";
      else if (bookingDatePreset === "YESTERDAY") dateLabel = "Yesterday";
      else if (bookingDatePreset === "LAST_7_DAYS") dateLabel = "Last 7 Days";
      else if (bookingDatePreset === "THIS_MONTH") dateLabel = "This Month";
      else if (bookingDatePreset === "LAST_MONTH") dateLabel = "Last Month";
      else if (bookingDatePreset === "CUSTOM") dateLabel = `${bookingStartDate || "Start"} → ${bookingEndDate || "End"}`;
      chips.push({
        id: "bookingDate",
        label: "📦 AWB Booking Date",
        value: dateLabel,
        onRemove: () => { setBookingDatePreset("ALL"); setBookingStartDate(""); setBookingEndDate(""); }
      });
    }
    if (selectedClient) {
      chips.push({
        id: "client",
        label: "Client",
        value: selectedClient,
        onRemove: () => setSelectedClient("")
      });
    }
    if (selectedOrigin) {
      chips.push({
        id: "origin",
        label: "From",
        value: selectedOrigin,
        onRemove: () => setSelectedOrigin("")
      });
    }
    if (selectedDestination) {
      chips.push({
        id: "destination",
        label: "To",
        value: selectedDestination,
        onRemove: () => setSelectedDestination("")
      });
    }
    if (selectedConsignor) {
      chips.push({
        id: "consignor",
        label: "Consignor",
        value: selectedConsignor,
        onRemove: () => setSelectedConsignor("")
      });
    }
    if (selectedConsignee) {
      chips.push({
        id: "consignee",
        label: "Consignee",
        value: selectedConsignee,
        onRemove: () => setSelectedConsignee("")
      });
    }
    if (selectedDocType !== "ALL") {
      chips.push({
        id: "doctype",
        label: "Doc Type",
        value: selectedDocType === "PDF" ? "PDF Only" : "Images Only",
        onRemove: () => setSelectedDocType("ALL")
      });
    }
    if (remarksFilter !== "ALL") {
      chips.push({
        id: "remarks",
        label: "Remarks",
        value: remarksFilter === "WITH_REMARKS" ? "Has Remarks" : "No Remarks",
        onRemove: () => setRemarksFilter("ALL")
      });
    }
    if (tableSearch.trim()) {
      chips.push({
        id: "search",
        label: "Search",
        value: `"${tableSearch.trim()}"`,
        onRemove: () => setTableSearch("")
      });
    }
    return chips;
  }, [
    activeTab, 
    uploadDatePreset, 
    uploadStartDate, 
    uploadEndDate, 
    bookingDatePreset, 
    bookingStartDate, 
    bookingEndDate, 
    selectedClient, 
    selectedOrigin, 
    selectedDestination, 
    selectedConsignor, 
    selectedConsignee, 
    selectedDocType, 
    remarksFilter, 
    tableSearch
  ]);

  // Multi-criteria Table filtering (including POD Upload Date & AWB Booking Date)
  const filteredPODs = useMemo(() => {
    return displayPODs.filter(item => {
      // 1. Tab / Verification Status filter
      const isVerified = (item.podType === "VERIFIED" || item.bookingId || (item.origin && item.origin !== "-"));
      if (activeTab === "VERIFIED" && !isVerified) return false;
      if (activeTab === "UNKNOWN" && isVerified) return false;

      // 2. POD Upload Date filter
      if (uploadDatePreset !== "ALL") {
        const uploadDtStr = getItemDateStr(item);
        if (!matchesDateFilter(uploadDtStr, uploadDatePreset, uploadStartDate, uploadEndDate)) {
          return false;
        }
      }

      // 3. AWB / Booking Date filter
      if (bookingDatePreset !== "ALL") {
        const bookingDtStr = getBookingDateStr(item);
        if (!matchesDateFilter(bookingDtStr, bookingDatePreset, bookingStartDate, bookingEndDate)) {
          return false;
        }
      }

      // 4. Client filter
      if (selectedClient && String(item.client || "").trim() !== selectedClient) {
        return false;
      }

      // 5. Origin filter
      if (selectedOrigin && String(item.origin || "").trim() !== selectedOrigin) {
        return false;
      }

      // 6. Destination filter
      if (selectedDestination && String(item.destination || "").trim() !== selectedDestination) {
        return false;
      }

      // 7. Consignor filter
      if (selectedConsignor && String(item.consignor || "").trim() !== selectedConsignor) {
        return false;
      }

      // 8. Consignee filter
      if (selectedConsignee && String(item.consignee || "").trim() !== selectedConsignee) {
        return false;
      }

      // 9. Document format filter
      if (selectedDocType !== "ALL") {
        const isPdf = 
          (item.fileName && item.fileName.toLowerCase().endsWith(".pdf")) ||
          (item.podUrl && item.podUrl.toLowerCase().includes(".pdf")) ||
          (item.cloudinaryUrl && item.cloudinaryUrl.toLowerCase().includes(".pdf")) ||
          item.type === "pdf" || item.fileType === "pdf";
        if (selectedDocType === "PDF" && !isPdf) return false;
        if (selectedDocType === "IMAGE" && isPdf) return false;
      }

      // 10. Remarks filter
      if (remarksFilter === "WITH_REMARKS" && (!item.remarks || !item.remarks.trim() || item.remarks === "-")) {
        return false;
      }
      if (remarksFilter === "WITHOUT_REMARKS" && item.remarks && item.remarks.trim() && item.remarks !== "-") {
        return false;
      }

      // 11. Search query filter
      if (tableSearch && tableSearch.trim().length > 0) {
        const q = tableSearch.toLowerCase().trim();
        const matches = (
          (item.lrNo && String(item.lrNo).toLowerCase().includes(q)) ||
          (item.client && String(item.client).toLowerCase().includes(q)) ||
          (item.consignor && String(item.consignor).toLowerCase().includes(q)) ||
          (item.consignee && String(item.consignee).toLowerCase().includes(q)) ||
          (item.origin && String(item.origin).toLowerCase().includes(q)) ||
          (item.destination && String(item.destination).toLowerCase().includes(q)) ||
          (item.fileName && String(item.fileName).toLowerCase().includes(q)) ||
          (item.remarks && String(item.remarks).toLowerCase().includes(q))
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [
    displayPODs, 
    activeTab, 
    uploadDatePreset, 
    uploadStartDate, 
    uploadEndDate, 
    bookingDatePreset, 
    bookingStartDate, 
    bookingEndDate, 
    selectedClient, 
    selectedOrigin, 
    selectedDestination, 
    selectedConsignor, 
    selectedConsignee, 
    selectedDocType, 
    remarksFilter, 
    tableSearch,
    bookingByLrMap
  ]);

  const getFileUrl = (item) => {
    if (item.podUrl) return getSafeCloudinaryPdfUrl(item.podUrl);
    if (item.cloudinaryUrl) return getSafeCloudinaryPdfUrl(item.cloudinaryUrl);
    return `${apiUrl}/uploads/pod/${item.fileName || item.filename}`;
  };

  return (
    <div className="pod-page-container">
      {/* COMPACT SLEEK HEADER BAR */}
      <div 
        className="pod-header-bar"
        style={{
          marginBottom: isAdding ? "0.35rem" : "1.25rem",
          transition: "margin-bottom 0.2s ease"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ background: "#f0f9ff", padding: "8px", borderRadius: "10px", display: "flex" }}>
            <FileCheck size={22} style={{ color: "#0284c7" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, color: "#0f172a" }}>
              Proof of Delivery (POD)
            </h3>
            <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 500 }}>
              Verify and manage receiving slips
            </span>
          </div>
        </div>

        <div className="pod-header-actions">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#475569",
              padding: "0.45rem 0.85rem",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 600,
              fontSize: "0.8rem"
            }}
          >
            <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          {!isAdding && (
            <button 
              onClick={() => { setIsAdding(true); setSelectedLR(null); setLrInput(""); setSelectedFile(null); }}
              style={{
                background: "#0284c7",
                color: "white",
                border: "none",
                padding: "0.45rem 1rem",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 6px rgba(2, 132, 199, 0.2)",
                fontSize: "0.825rem"
              }}
            >
              <Upload size={15} />
              + Upload POD
            </button>
          )}
        </div>
      </div>

      {/* FULL-WIDTH ENTERPRISE POD UPLOAD CONSOLE */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden", width: "100%" }}
          >
            <div 
              style={{
                backgroundColor: "white",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 20px 35px -10px rgba(0, 0, 0, 0.08)",
                marginTop: "0",
                marginBottom: "1rem",
                width: "100%",
                boxSizing: "border-box",
                overflow: "hidden"
              }}
            >
              {/* TOP ACCENT BAR & HEADER */}
              <div style={{ background: "linear-gradient(90deg, #0284c7 0%, #0369a1 50%, #0c4a6e 100%)", height: "4px", width: "100%" }} />
              <div 
                style={{
                  padding: "1.25rem 1.75rem",
                  borderBottom: "1px solid #f1f5f9",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#fafcfd"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <div style={{ background: "#e0f2fe", padding: "10px", borderRadius: "12px", color: "#0284c7", display: "flex" }}>
                    <Upload size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700", color: "#0f172a" }}>
                      New Proof of Delivery (POD) Entry
                    </h4>
                    <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
                      Enter LR number, attach receiving proof document, and save to system
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {lrInput.trim().length > 0 && (
                    <span 
                      style={{
                        background: matchedLR ? "#dcfce7" : "#fef3c7",
                        color: matchedLR ? "#166534" : "#b45309",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      {matchedLR ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      {matchedLR ? "AUTO VERIFIED BOOKING" : "STANDALONE / UNKNOWN LR"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    style={{
                      background: "#f1f5f9",
                      border: "none",
                      borderRadius: "8px",
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#64748b",
                      transition: "all 0.15s"
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* FULL-WIDTH 3-COLUMN WORKFLOW GRID */}
              <form onSubmit={handleUpload}>
                <div 
                  className="pod-workflow-grid"
                  style={{
                    padding: "1.75rem",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
                    gap: "1.75rem",
                    alignItems: "start"
                  }}
                >
                  {/* COLUMN 1: LR / AWB NUMBER & MATCH PREVIEW */}
                  <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.85rem" }}>
                      <Search size={18} color="#0284c7" />
                      <label style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>
                        1. LR / AWB Number <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                    </div>

                    <div style={{ position: "relative", marginBottom: "1rem" }}>
                      <input
                        type="text"
                        placeholder="Type LR No, Client, Consignor, Route..."
                        value={lrInput}
                        onChange={(e) => {
                          setLrInput(e.target.value);
                          setSelectedLR(null);
                        }}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          paddingLeft: "2.5rem",
                          borderRadius: "10px",
                          border: matchedLR ? "2px solid #22c55e" : "1.5px solid #cbd5e1",
                          fontSize: "0.95rem",
                          outline: "none",
                          boxSizing: "border-box",
                          background: "white",
                          fontWeight: 500
                        }}
                      />
                      <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />

                      {/* AUTOCOMPLETE DROPDOWN */}
                      {lrInput.trim().length > 0 && !selectedLR && filteredLRs.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            background: "white",
                            border: "1px solid #cbd5e1",
                            borderRadius: "10px",
                            marginTop: "6px",
                            maxHeight: "260px",
                            overflowY: "auto",
                            zIndex: 50,
                            boxShadow: "0 15px 25px rgba(0,0,0,0.12)"
                          }}
                        >
                          {filteredLRs.map((booking) => {
                            const awb = getBookingAwb(booking);
                            return (
                              <div
                                key={booking.id}
                                onClick={() => {
                                  setLrInput(awb);
                                  setSelectedLR(booking);
                                }}
                                style={{
                                  padding: "0.75rem 1rem",
                                  borderBottom: "1px solid #f1f5f9",
                                  cursor: "pointer",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center"
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f0f9ff")}
                                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "white")}
                              >
                                <div>
                                  <div style={{ fontWeight: 700, color: "#0369a1", fontSize: "0.9rem" }}>{awb}</div>
                                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
                                    {booking.origin} → {booking.destination} • <b>{booking.consignor || "-"}</b> to <b>{booking.consignee || "-"}</b>
                                  </div>
                                </div>
                                <span style={{ background: "#e0f2fe", color: "#0284c7", padding: "4px 8px", borderRadius: "6px", fontWeight: 700, fontSize: "0.75rem" }}>Select</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* LIVE BOOKING STATUS CARD */}
                    {lrInput.trim().length > 0 ? (
                      matchedLR ? (
                        <div style={{ background: "white", borderRadius: "10px", padding: "1rem", border: "1.5px solid #86efac", boxShadow: "0 2px 5px rgba(22, 163, 74, 0.08)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#166534", fontWeight: 700, fontSize: "0.85rem", marginBottom: "6px" }}>
                            <CheckCircle size={16} /> Verified Database Booking
                          </div>
                          <div style={{ fontSize: "0.82rem", color: "#334155", lineHeight: "1.5" }}>
                            <div><b>Route:</b> {matchedLR.origin} → {matchedLR.destination}</div>
                            <div><b>Consignor:</b> {matchedLR.consignor || "-"}</div>
                            <div><b>Consignee:</b> {matchedLR.consignee || "-"}</div>
                            <div><b>Client:</b> {matchedLR.client || matchedLR.billedTo || "-"}</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: "white", borderRadius: "10px", padding: "1rem", border: "1.5px solid #fde68a", boxShadow: "0 2px 5px rgba(217, 119, 6, 0.08)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#b45309", fontWeight: 700, fontSize: "0.85rem", marginBottom: "6px" }}>
                            <AlertCircle size={16} /> Offline / Standalone LR Entry
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#78350f", lineHeight: "1.4" }}>
                            No active booking matched <b>"{lrInput.trim()}"</b> in MongoDB. This POD will be saved under <b>Unknown Type</b> until linked.
                          </div>
                        </div>
                      )
                    ) : (
                      <div style={{ background: "white", borderRadius: "10px", padding: "1rem", border: "1px dashed #cbd5e1", textAlign: "center", color: "#64748b", fontSize: "0.82rem" }}>
                        Start typing an LR / AWB number above to automatically check against database bookings.
                      </div>
                    )}
                  </div>

                  {/* COLUMN 2: PROOF DOCUMENT CAPTURE / UPLOAD */}
                  <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.85rem" }}>
                      <ImageIcon size={18} color="#0284c7" />
                      <label style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>
                        2. Proof of Delivery Document <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      style={{ display: "none" }}
                    />

                    {!selectedFile ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                        <button
                          type="button"
                          onClick={handleOpenCamera}
                          style={{
                            background: "white",
                            color: "#0369a1",
                            border: "1.5px solid #bae6fd",
                            padding: "1.25rem 0.75rem",
                            borderRadius: "12px",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                            transition: "all 0.15s",
                            boxShadow: "0 2px 6px rgba(2, 132, 199, 0.08)"
                          }}
                        >
                          <div style={{ background: "#e0f2fe", padding: "10px", borderRadius: "50%", color: "#0284c7", display: "flex" }}>
                            <Camera size={22} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Camera Scanner</span>
                          <span style={{ fontSize: "0.72rem", color: "#64748b", textAlign: "center" }}>Live photo capture & enhancement</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            background: "white",
                            color: "#334155",
                            border: "1.5px dashed #cbd5e1",
                            padding: "1.25rem 0.75rem",
                            borderRadius: "12px",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                            transition: "all 0.15s"
                          }}
                        >
                          <div style={{ background: "#f1f5f9", padding: "10px", borderRadius: "50%", color: "#64748b", display: "flex" }}>
                            <ImageIcon size={22} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Browse Files</span>
                          <span style={{ fontSize: "0.72rem", color: "#64748b", textAlign: "center" }}>Select JPG, PNG, or PDF</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ background: "white", borderRadius: "10px", padding: "1rem", border: "1.5px solid #0284c7", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                          {selectedFile.type === "pdf" ? (
                            <div style={{ background: "#fee2e2", padding: "12px", borderRadius: "8px", color: "#dc2626" }}>
                              <FileText size={24} />
                            </div>
                          ) : (
                            <img
                              src={selectedFile.dataUrl}
                              alt="POD Preview"
                              style={{ width: "56px", height: "56px", objectFit: "cover", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                            />
                          )}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>{selectedFile.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                              <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 600 }}>✓ Document ready</span>
                              {selectedFile.sizeBytes && (
                                <span style={{
                                  fontSize: "0.70rem",
                                  fontWeight: 700,
                                  background: "rgba(16, 124, 65, 0.1)",
                                  color: "#15803d",
                                  padding: "2px 6px",
                                  borderRadius: "6px"
                                }}>
                                  ⚡ {Math.round(selectedFile.sizeBytes / 1024)} KB
                                  {selectedFile.originalSizeBytes && selectedFile.originalSizeBytes > selectedFile.sizeBytes ? (
                                    <span style={{ color: '#64748b', fontWeight: 500, marginLeft: '3px' }}>
                                      (saved {Math.round((selectedFile.originalSizeBytes - selectedFile.sizeBytes) / 1024)} KB)
                                    </span>
                                  ) : null}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {selectedFile.type !== "pdf" && (
                            <button
                              type="button"
                              onClick={() => {
                                setStudioInitialSrc(selectedFile.dataUrl);
                                setStudioMode("editor");
                                setStudioOpen(true);
                              }}
                              style={{
                                background: "#f0f9ff",
                                border: "1px solid #0284c7",
                                color: "#0369a1",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                cursor: "pointer"
                              }}
                            >
                              Edit / Enhance
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            style={{
                              background: "#fef2f2",
                              border: "1px solid #fca5a5",
                              color: "#dc2626",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              cursor: "pointer"
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* COLUMN 3: REMARKS & SUBMIT ACTIONS */}
                  <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", boxSizing: "border-box" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.85rem" }}>
                        <FileCheck size={18} color="#0284c7" />
                        <label style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>
                          3. Receiving Remarks (Optional)
                        </label>
                      </div>

                      <input
                        type="text"
                        placeholder="e.g., Signed by Ramesh with stamp, 5 boxes OK..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "1px solid #cbd5e1",
                          borderRadius: "10px",
                          fontSize: "0.88rem",
                          outline: "none",
                          background: "white",
                          marginBottom: "1rem"
                        }}
                      />

                      {/* APPRECIATION & GOOD WISHES CARD */}
                      <div 
                        style={{
                          background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                          padding: "1rem 1.15rem",
                          borderRadius: "12px",
                          border: "1px solid #bbf7d0",
                          boxShadow: "0 2px 8px rgba(16, 185, 129, 0.06)",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px"
                        }}
                      >
                        <div style={{ background: "#dcfce7", padding: "8px", borderRadius: "10px", color: "#15803d", display: "flex", flexShrink: 0 }}>
                          <CheckCircle size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#14532d" }}>
                            Thank you for your hard work! 🌟
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#166534", marginTop: "4px", lineHeight: "1.4" }}>
                            Accurate POD records ensure smooth billing and happy clients. Wishing you a wonderful and successful day ahead!
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                      <button
                        type="button"
                        onClick={() => setIsAdding(false)}
                        style={{
                          flex: "1",
                          background: "white",
                          color: "#64748b",
                          border: "1px solid #cbd5e1",
                          padding: "0.75rem 1rem",
                          borderRadius: "10px",
                          fontWeight: 600,
                          fontSize: "0.88rem",
                          cursor: "pointer"
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={uploading || !lrInput.trim() || !selectedFile}
                        style={{
                          flex: "2",
                          background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                          color: "white",
                          border: "none",
                          padding: "0.75rem 1rem",
                          borderRadius: "10px",
                          fontWeight: 700,
                          fontSize: "0.88rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)",
                          opacity: uploading || !lrInput.trim() || !selectedFile ? 0.5 : 1
                        }}
                      >
                        <Upload size={16} />
                        {uploading ? "Saving..." : "Save Proof of Delivery"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ULTRA COMPACT SUMMARY CARDS */}
      <div 
        className="pod-grid-stats"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0.75rem",
          marginBottom: "1.25rem"
        }}
      >
        <div style={{ background: "white", borderRadius: "10px", padding: "0.85rem 1rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.725rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total PODs</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{stats.total}</div>
          </div>
          <div style={{ background: "#f1f5f9", padding: "8px", borderRadius: "8px" }}><FileText size={18} color="#3b82f6" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "10px", padding: "0.85rem 1rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.725rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Verified LRs</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#10b981", marginTop: "2px" }}>{stats.verifiedCount}</div>
          </div>
          <div style={{ background: "#ecfdf5", padding: "8px", borderRadius: "8px" }}><CheckCircle size={18} color="#10b981" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "10px", padding: "0.85rem 1rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.725rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Unknown / Offline</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#f59e0b", marginTop: "2px" }}>{stats.unknownCount}</div>
          </div>
          <div style={{ background: "#fffbeb", padding: "8px", borderRadius: "8px" }}><AlertCircle size={18} color="#f59e0b" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "10px", padding: "0.85rem 1rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.725rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Uploaded Today</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#6366f1", marginTop: "2px" }}>{stats.todayCount}</div>
          </div>
          <div style={{ background: "#eef2ff", padding: "8px", borderRadius: "8px" }}><Calendar size={18} color="#6366f1" /></div>
        </div>
      </div>

      {/* COMPREHENSIVE FILTER TOOLBAR WITH DROPDOWN & ACTIVE FILTER BUTTONS */}
      <div 
        className="pod-filter-toolbar-container"
        style={{
          background: "white",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          marginBottom: "1.25rem",
          overflow: "hidden"
        }}
      >
        {/* TOP FILTER BAR */}
        <div 
          className="pod-filter-bar"
          style={{
            padding: "1rem 1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.85rem",
            background: "#ffffff"
          }}
        >
          {/* LEFT: Category Tabs & "All Filters" Dropdown Toggle */}
          <div className="pod-filter-bar-left">
            {/* Category Tabs */}
            <div className="pod-category-tabs" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {[
                { key: "ALL", label: "All PODs", count: stats.total },
                { key: "VERIFIED", label: "Verified LRs", count: stats.verifiedCount },
                { key: "UNKNOWN", label: "Unknown / Standalone", count: stats.unknownCount }
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    background: activeTab === t.key ? "#0284c7" : "#f8fafc",
                    color: activeTab === t.key ? "white" : "#475569",
                    border: activeTab === t.key ? "1px solid #0284c7" : "1px solid #e2e8f0",
                    padding: "0.45rem 0.85rem",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "0.825rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.15s ease"
                  }}
                >
                  {t.label}
                  <span 
                    style={{
                      background: activeTab === t.key ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                      color: activeTab === t.key ? "white" : "#334155",
                      padding: "1px 6px",
                      borderRadius: "10px",
                      fontSize: "0.725rem",
                      fontWeight: 700
                    }}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* DIVIDER */}
            <div style={{ width: "1px", height: "24px", background: "#e2e8f0", margin: "0 4px" }} />

            {/* "ALL FILTERS" DROPDOWN TRIGGER BUTTON */}
            <button
              onClick={() => setShowFilterDropdown(prev => !prev)}
              style={{
                background: showFilterDropdown ? "#0369a1" : (activeFiltersCount > 0 ? "#f0f9ff" : "#f8fafc"),
                color: showFilterDropdown ? "white" : (activeFiltersCount > 0 ? "#0284c7" : "#334155"),
                border: showFilterDropdown ? "1px solid #0369a1" : (activeFiltersCount > 0 ? "1.5px solid #38bdf8" : "1px solid #cbd5e1"),
                padding: "0.45rem 0.95rem",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "0.825rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "7px",
                transition: "all 0.15s ease",
                boxShadow: showFilterDropdown ? "0 2px 6px rgba(3, 105, 161, 0.25)" : "none"
              }}
            >
              <SlidersHorizontal size={15} color={showFilterDropdown ? "white" : (activeFiltersCount > 0 ? "#0284c7" : "#475569")} />
              <span>{showFilterDropdown ? "Hide Filters" : "All Filters"}</span>
              {activeFiltersCount > 0 && (
                <span 
                  style={{
                    background: showFilterDropdown ? "white" : "#0284c7",
                    color: showFilterDropdown ? "#0369a1" : "white",
                    padding: "1px 7px",
                    borderRadius: "12px",
                    fontSize: "0.725rem",
                    fontWeight: 800
                  }}
                >
                  {activeFiltersCount}
                </span>
              )}
              {showFilterDropdown ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {/* QUICK DATE PILLS (WITH DUAL-DATE MODE TOGGLE) */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center", background: "#f1f5f9", padding: "3px 6px", borderRadius: "8px" }}>
              {/* Date Mode Switcher */}
              <div style={{ display: "flex", background: "white", borderRadius: "6px", padding: "2px", border: "1px solid #e2e8f0" }}>
                <button
                  type="button"
                  onClick={() => setActiveDateMode("POD_UPLOAD")}
                  style={{
                    background: activeDateMode === "POD_UPLOAD" ? "#0284c7" : "transparent",
                    color: activeDateMode === "POD_UPLOAD" ? "white" : "#64748b",
                    border: "none",
                    padding: "0.25rem 0.55rem",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                  title="Filter by POD document upload date"
                >
                  📸 POD Date
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDateMode("AWB_BOOKING")}
                  style={{
                    background: activeDateMode === "AWB_BOOKING" ? "#0284c7" : "transparent",
                    color: activeDateMode === "AWB_BOOKING" ? "white" : "#64748b",
                    border: "none",
                    padding: "0.25rem 0.55rem",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                  title="Filter on behalf of consignment / AWB booking date"
                >
                  📦 AWB Date
                </button>
              </div>

              {/* Quick Preset Pills for Active Date Mode */}
              <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                {[
                  { key: "TODAY", label: "Today" },
                  { key: "YESTERDAY", label: "Yesterday" },
                  { key: "THIS_MONTH", label: "This Month" },
                ].map(dp => {
                  const currentPreset = activeDateMode === "POD_UPLOAD" ? uploadDatePreset : bookingDatePreset;
                  const isSelected = currentPreset === dp.key;
                  return (
                    <button
                      key={dp.key}
                      onClick={() => {
                        if (activeDateMode === "POD_UPLOAD") {
                          if (isSelected) {
                            setUploadDatePreset("ALL");
                          } else {
                            setUploadDatePreset(dp.key);
                            setUploadStartDate("");
                            setUploadEndDate("");
                          }
                        } else {
                          if (isSelected) {
                            setBookingDatePreset("ALL");
                          } else {
                            setBookingDatePreset(dp.key);
                            setBookingStartDate("");
                            setBookingEndDate("");
                          }
                        }
                      }}
                      style={{
                        background: isSelected ? "#0284c7" : "white",
                        color: isSelected ? "white" : "#475569",
                        border: isSelected ? "1px solid #0284c7" : "1px solid #cbd5e1",
                        padding: "0.25rem 0.55rem",
                        borderRadius: "5px",
                        fontSize: "0.72rem",
                        fontWeight: isSelected ? 700 : 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px"
                      }}
                    >
                      <Calendar size={11} />
                      {dp.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Search & Reset */}
          <div className="pod-filter-bar-right">
            {/* Live Search Input */}
            <div style={{ position: "relative", width: "100%", maxWidth: "340px" }}>
              <input
                type="text"
                placeholder="Search LR, Client, Party, City..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem 1rem",
                  paddingLeft: "2.3rem",
                  paddingRight: tableSearch ? "2rem" : "1rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#f8fafc"
                }}
              />
              <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
              {tableSearch && (
                <button
                  onClick={() => setTableSearch("")}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "2px",
                    display: "flex"
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Clear all / Reset Filters */}
            {activeFiltersCount > 0 && (
              <button
                onClick={resetAllFilters}
                style={{
                  background: "#fef2f2",
                  color: "#dc2626",
                  border: "1px solid #fca5a5",
                  padding: "0.45rem 0.75rem",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  whiteSpace: "nowrap"
                }}
                title="Reset all filters"
              >
                <RotateCcw size={13} />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* EXPANDABLE ALL-FILTERS DROPDOWN PANEL (ANIMATED) */}
        <AnimatePresence>
          {showFilterDropdown && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              <div 
                style={{
                  background: "#f8fafc",
                  borderTop: "1px solid #e2e8f0",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem"
                }}
              >
                {/* DUAL-DATE FILTERING SUITE (POD UPLOAD DATE & AWB BOOKING DATE) */}
                <div className="pod-dual-date-grid">
                  {/* CARD 1: POD UPLOAD DATE */}
                  <div style={{ background: "white", padding: "1rem 1.15rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0f172a", fontWeight: 700, fontSize: "0.85rem" }}>
                        <Calendar size={15} color="#0284c7" />
                        <span>1. 📸 POD Upload Date Filter</span>
                      </div>
                      {uploadDatePreset !== "ALL" && (
                        <button
                          onClick={() => { setUploadDatePreset("ALL"); setUploadStartDate(""); setUploadEndDate(""); }}
                          style={{ background: "none", border: "none", color: "#dc2626", fontSize: "0.72rem", cursor: "pointer", fontWeight: 600 }}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Presets */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "0.75rem" }}>
                      {[
                        { key: "ALL", label: "All Time" },
                        { key: "TODAY", label: "Today" },
                        { key: "YESTERDAY", label: "Yesterday" },
                        { key: "LAST_7_DAYS", label: "7 Days" },
                        { key: "THIS_MONTH", label: "This Month" },
                        { key: "LAST_MONTH", label: "Last Month" },
                        { key: "CUSTOM", label: "Custom Range" },
                      ].map(p => {
                        const active = uploadDatePreset === p.key;
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => {
                              setUploadDatePreset(p.key);
                              if (p.key !== "CUSTOM") {
                                setUploadStartDate("");
                                setUploadEndDate("");
                              }
                            }}
                            style={{
                              background: active ? "#0284c7" : "#f1f5f9",
                              color: active ? "white" : "#475569",
                              border: active ? "1px solid #0284c7" : "1px solid #e2e8f0",
                              padding: "0.3rem 0.65rem",
                              borderRadius: "5px",
                              fontSize: "0.75rem",
                              fontWeight: active ? 700 : 500,
                              cursor: "pointer",
                              transition: "all 0.15s"
                            }}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Range Inputs */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f8fafc", padding: "6px 8px", borderRadius: "8px", border: "1px solid #e2e8f0", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>From:</span>
                      <input
                        type="date"
                        value={uploadStartDate}
                        onChange={(e) => {
                          setUploadStartDate(e.target.value);
                          setUploadDatePreset("CUSTOM");
                        }}
                        style={{
                          padding: "0.25rem 0.45rem",
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.75rem",
                          outline: "none",
                          background: "white",
                          flex: "1",
                          minWidth: "120px"
                        }}
                      />
                      <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>→</span>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>To:</span>
                      <input
                        type="date"
                        value={uploadEndDate}
                        onChange={(e) => {
                          setUploadEndDate(e.target.value);
                          setUploadDatePreset("CUSTOM");
                        }}
                        style={{
                          padding: "0.25rem 0.45rem",
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.75rem",
                          outline: "none",
                          background: "white",
                          flex: "1",
                          minWidth: "120px"
                        }}
                      />
                    </div>
                  </div>

                  {/* CARD 2: AWB BOOKING DATE */}
                  <div style={{ background: "white", padding: "1rem 1.15rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0f172a", fontWeight: 700, fontSize: "0.85rem" }}>
                        <Calendar size={15} color="#16a34a" />
                        <span>2. 📦 AWB Booking Date Filter</span>
                      </div>
                      {bookingDatePreset !== "ALL" && (
                        <button
                          onClick={() => { setBookingDatePreset("ALL"); setBookingStartDate(""); setBookingEndDate(""); }}
                          style={{ background: "none", border: "none", color: "#dc2626", fontSize: "0.72rem", cursor: "pointer", fontWeight: 600 }}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Presets */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "0.75rem" }}>
                      {[
                        { key: "ALL", label: "All Time" },
                        { key: "TODAY", label: "Today" },
                        { key: "YESTERDAY", label: "Yesterday" },
                        { key: "LAST_7_DAYS", label: "7 Days" },
                        { key: "THIS_MONTH", label: "This Month" },
                        { key: "LAST_MONTH", label: "Last Month" },
                        { key: "CUSTOM", label: "Custom Range" },
                      ].map(p => {
                        const active = bookingDatePreset === p.key;
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => {
                              setBookingDatePreset(p.key);
                              if (p.key !== "CUSTOM") {
                                setBookingStartDate("");
                                setBookingEndDate("");
                              }
                            }}
                            style={{
                              background: active ? "#16a34a" : "#f1f5f9",
                              color: active ? "white" : "#475569",
                              border: active ? "1px solid #16a34a" : "1px solid #e2e8f0",
                              padding: "0.3rem 0.65rem",
                              borderRadius: "5px",
                              fontSize: "0.75rem",
                              fontWeight: active ? 700 : 500,
                              cursor: "pointer",
                              transition: "all 0.15s"
                            }}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Range Inputs */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f8fafc", padding: "6px 8px", borderRadius: "8px", border: "1px solid #e2e8f0", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>From:</span>
                      <input
                        type="date"
                        value={bookingStartDate}
                        onChange={(e) => {
                          setBookingStartDate(e.target.value);
                          setBookingDatePreset("CUSTOM");
                        }}
                        style={{
                          padding: "0.25rem 0.45rem",
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.75rem",
                          outline: "none",
                          background: "white",
                          flex: "1",
                          minWidth: "120px"
                        }}
                      />
                      <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>→</span>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>To:</span>
                      <input
                        type="date"
                        value={bookingEndDate}
                        onChange={(e) => {
                          setBookingEndDate(e.target.value);
                          setBookingDatePreset("CUSTOM");
                        }}
                        style={{
                          padding: "0.25rem 0.45rem",
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.75rem",
                          outline: "none",
                          background: "white",
                          flex: "1",
                          minWidth: "120px"
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: GRID OF MULTI-FILTERS (PARTY, ROUTE, CLIENT, DOC TYPE, REMARKS) */}
                <div className="pod-entities-grid">
                  {/* Client / Billed To */}
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                      <Building size={14} color="#0284c7" /> Client / Billed To
                    </label>
                    <select
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.82rem",
                        background: "white",
                        outline: "none",
                        color: selectedClient ? "#0f172a" : "#64748b"
                      }}
                    >
                      <option value="">All Clients</option>
                      {filterOptions.clients.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Origin City */}
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                      <MapPin size={14} color="#0284c7" /> Origin (From)
                    </label>
                    <select
                      value={selectedOrigin}
                      onChange={(e) => setSelectedOrigin(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.82rem",
                        background: "white",
                        outline: "none",
                        color: selectedOrigin ? "#0f172a" : "#64748b"
                      }}
                    >
                      <option value="">All Origin Cities</option>
                      {filterOptions.origins.map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>

                  {/* Destination City */}
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                      <MapPin size={14} color="#0284c7" /> Destination (To)
                    </label>
                    <select
                      value={selectedDestination}
                      onChange={(e) => setSelectedDestination(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.82rem",
                        background: "white",
                        outline: "none",
                        color: selectedDestination ? "#0f172a" : "#64748b"
                      }}
                    >
                      <option value="">All Destination Cities</option>
                      {filterOptions.destinations.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Consignor */}
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                      <User size={14} color="#0284c7" /> Consignor (Sender)
                    </label>
                    <select
                      value={selectedConsignor}
                      onChange={(e) => setSelectedConsignor(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.82rem",
                        background: "white",
                        outline: "none",
                        color: selectedConsignor ? "#0f172a" : "#64748b"
                      }}
                    >
                      <option value="">All Consignors</option>
                      {filterOptions.consignors.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Consignee */}
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                      <User size={14} color="#0284c7" /> Consignee (Receiver)
                    </label>
                    <select
                      value={selectedConsignee}
                      onChange={(e) => setSelectedConsignee(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.82rem",
                        background: "white",
                        outline: "none",
                        color: selectedConsignee ? "#0f172a" : "#64748b"
                      }}
                    >
                      <option value="">All Consignees</option>
                      {filterOptions.consignees.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Document Format */}
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                      <FileType size={14} color="#0284c7" /> Document Format
                    </label>
                    <select
                      value={selectedDocType}
                      onChange={(e) => setSelectedDocType(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.82rem",
                        background: "white",
                        outline: "none",
                        color: selectedDocType !== "ALL" ? "#0f172a" : "#64748b"
                      }}
                    >
                      <option value="ALL">All File Types</option>
                      <option value="IMAGE">Image Files (JPG, PNG, WEBP)</option>
                      <option value="PDF">PDF Documents</option>
                    </select>
                  </div>

                  {/* Remarks Filter */}
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                      <FileText size={14} color="#0284c7" /> Notes & Remarks
                    </label>
                    <select
                      value={remarksFilter}
                      onChange={(e) => setRemarksFilter(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.82rem",
                        background: "white",
                        outline: "none",
                        color: remarksFilter !== "ALL" ? "#0f172a" : "#64748b"
                      }}
                    >
                      <option value="ALL">All Records</option>
                      <option value="WITH_REMARKS">With Remarks Only</option>
                      <option value="WITHOUT_REMARKS">Without Remarks</option>
                    </select>
                  </div>
                </div>

                {/* BOTTOM ACTION & SUMMARY BAR */}
                <div 
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "0.85rem",
                    flexWrap: "wrap",
                    gap: "0.75rem"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "#334155" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#f0fdf4", color: "#16a34a", padding: "3px 8px", borderRadius: "6px", fontWeight: 700, fontSize: "0.75rem", border: "1px solid #bbf7d0" }}>
                      ⚡ Auto-Filtering Live
                    </span>
                    <span>
                      Showing <b>{filteredPODs.length}</b> of <b>{displayPODs.length}</b> records
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      disabled={activeFiltersCount === 0}
                      style={{
                        background: "white",
                        border: "1px solid #cbd5e1",
                        color: activeFiltersCount > 0 ? "#dc2626" : "#94a3b8",
                        padding: "0.45rem 0.9rem",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: activeFiltersCount > 0 ? "pointer" : "not-allowed",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      <RotateCcw size={13} />
                      Reset All Filters
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowFilterDropdown(false)}
                      style={{
                        background: "#0284c7",
                        color: "white",
                        border: "none",
                        padding: "0.45rem 1.1rem",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 6px rgba(2, 132, 199, 0.2)"
                      }}
                    >
                      <ChevronUp size={14} />
                      Close Filter Panel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ACTIVE FILTER PILLS / BUTTONS (SHOWN WHEN DROPDOWN IS COLLAPSED OR EXPANDED WITH ACTIVE FILTERS) */}
        {!showFilterDropdown && activeFilterChips.length > 0 && (
          <div 
            className="pod-active-filter-pills"
            style={{
              padding: "0.65rem 1.25rem",
              background: "#f8fafc",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem"
            }}
          >
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
              <Tag size={13} color="#0284c7" /> Active Filters:
            </span>

            {activeFilterChips.map(chip => (
              <div
                key={chip.id}
                style={{
                  background: "white",
                  border: "1px solid #bae6fd",
                  borderRadius: "20px",
                  padding: "3px 10px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.775rem",
                  color: "#0369a1",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
                }}
              >
                <span style={{ color: "#64748b", fontWeight: 500 }}>{chip.label}:</span>
                <span style={{ fontWeight: 700 }}>{chip.value}</span>
                <button
                  onClick={chip.onRemove}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 1px",
                    marginLeft: "2px"
                  }}
                  title={`Remove ${chip.label} filter`}
                >
                  <X size={13} />
                </button>
              </div>
            ))}

            <button
              onClick={resetAllFilters}
              style={{
                background: "transparent",
                border: "none",
                color: "#dc2626",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                padding: "2px 6px",
                textDecoration: "underline"
              }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* POD LIST TABLE */}
      <div className="glass-panel" style={{ background: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <Table
          headers={["LR / AWB No", "POD Type", "Route", "Consignor → Consignee", "Client / Billed To", "Proof Document", "Remarks", "Dates (Booking & Upload)", "Actions"]}
          data={filteredPODs}
          loading={loading}
          pagination={true}
          renderRow={(item, index) => {
            const isVerified = (item.podType === "VERIFIED" || item.bookingId || (item.origin && item.origin !== "-"));
            const fileUrl = getFileUrl(item);
            const bookingDate = getBookingDateStr(item);

            return (
              <tr key={item.id || index} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem", opacity: item.isOfflinePending ? 0.7 : 1 }}>
                {/* LR No */}
                <td style={{ padding: "1rem", fontWeight: 700, color: "#0284c7", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {item.lrNo}
                    <CopyButton text={item.lrNo} />
                    {item.isOfflinePending && (
                      <Clock size={14} color="#f59e0b" title="Pending Sync (Offline)" />
                    )}
                  </div>
                </td>

                {/* POD Type Badge */}
                <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>
                  {isVerified ? (
                    <span 
                      style={{
                        padding: "0.35rem 0.75rem",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        background: "#dcfce7",
                        color: "#166534",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      <CheckCircle size={14} />
                      Verified LR
                    </span>
                  ) : (
                    <span 
                      style={{
                        padding: "0.35rem 0.75rem",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        background: "#fef3c7",
                        color: "#b45309",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                      title="This POD was entered manually without matching an existing database LR"
                    >
                      <AlertCircle size={14} />
                      Unknown Type
                    </span>
                  )}
                </td>

                {/* Route */}
                <td style={{ padding: "1rem", whiteSpace: "nowrap", fontWeight: 600, color: "#334155" }}>
                  {item.origin && item.destination && item.origin !== "-" ? (
                    `${item.origin} → ${item.destination}`
                  ) : (
                    <span style={{ color: "#94a3b8" }}>—</span>
                  )}
                </td>

                {/* Consignor → Consignee */}
                <td style={{ padding: "1rem", color: "#475569" }}>
                  {item.consignor && item.consignee && item.consignor !== "-" ? (
                    <div>
                      <div><b>{item.consignor}</b></div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>→ {item.consignee}</div>
                    </div>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>—</span>
                  )}
                </td>

                {/* Client / Billed To */}
                <td style={{ padding: "1rem", color: "#334155", fontWeight: 600 }}>
                  {item.client && item.client !== "-" ? item.client : <span style={{ color: "#94a3b8" }}>—</span>}
                </td>

                {/* Proof Document Link / Preview */}
                <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>
                  <button
                    disabled={item.isOfflinePending}
                    onClick={() => navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}`)}
                    style={{
                      background: "#f0f9ff",
                      border: "1px solid #bae6fd",
                      color: "#0369a1",
                      padding: "0.4rem 0.85rem",
                      borderRadius: "6px",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      cursor: item.isOfflinePending ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      opacity: item.isOfflinePending ? 0.5 : 1
                    }}
                  >
                    <Eye size={14} />
                    View Proof
                  </button>
                </td>

                {/* Remarks */}
                <td style={{ padding: "1rem", color: "#475569", maxWidth: "200px" }}>
                  {item.remarks ? (
                    <span style={{ fontStyle: "italic" }}>"{item.remarks}"</span>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>—</span>
                  )}
                </td>

                {/* Dates (Booking Date & POD Upload Date) */}
                <td style={{ padding: "1rem", whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#334155", fontWeight: 600 }}>
                      <span style={{ color: "#64748b", fontSize: "0.72rem" }}>📦 AWB:</span>
                      <span>{bookingDate ? formatDate(bookingDate) : "—"}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#0284c7", fontSize: "0.75rem", marginTop: "3px" }}>
                      <span style={{ color: "#64748b", fontSize: "0.72rem" }}>📸 POD:</span>
                      <span>{formatDate(item.uploadedAt || item.createdAt)}</span>
                    </div>
                  </div>
                </td>

                {/* Actions */}
                <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <a
                      href={item.isOfflinePending ? "#" : fileUrl}
                      target={item.isOfflinePending ? "_self" : "_blank"}
                      onClick={(e) => { if (item.isOfflinePending) e.preventDefault(); }}
                      rel="noopener noreferrer"
                      style={{
                        color: "#475569",
                        padding: "4px",
                        display: "inline-flex",
                        alignItems: "center",
                        textDecoration: "none",
                        opacity: item.isOfflinePending ? 0.5 : 1,
                        cursor: item.isOfflinePending ? "not-allowed" : "pointer"
                      }}
                      title="Open in new tab"
                    >
                      <ExternalLink size={16} />
                    </a>

                    {isSuperAdmin && !item.isOfflinePending && (
                      <button 
                        onClick={() => handleDelete(item.id)}
                        style={{ 
                          background: "transparent", 
                          border: "none", 
                          color: "#dc2626", 
                          cursor: "pointer",
                          padding: "4px"
                        }}
                        title="Delete POD & Cloudinary Image"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          }}
        />
      </div>



      {/* PREMIUM POD IMAGE STUDIO MODAL (CAMERA & SCANNER EDITOR) */}
      <PODImageStudioModal
        isOpen={studioOpen}
        onClose={() => setStudioOpen(false)}
        initialMode={studioMode}
        initialImageSrc={studioInitialSrc}
        onSave={handleStudioSave}
      />
    </div>
  );
};

export default POD;