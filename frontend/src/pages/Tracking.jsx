import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import axios from "axios";
import { CheckCircle, Loader2, Search, Package, Truck, MapPin, XCircle, Clock, PlusCircle, AlertCircle, Trash2, Edit, FileText, Eye, Download, X, Check, ChevronDown, ChevronUp, ExternalLink, ShieldCheck, FileSpreadsheet, Layers, Send, Lock } from "lucide-react";
import CreatableDropdown from "../components/CreatableDropdown";
import TrackingLocationInput from "../components/TrackingLocationInput";
import QuickAddModal from "../components/QuickAddModal";
import Table from "../components/Table";
import CopyButton, { AwbBadge } from "../components/CopyButton";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { useToast } from "../context/ToastContext";
import { useSync } from "../context/SyncContext";
import "../index.css"; 

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

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

const formatCleanDate = (dateStr) => {
  const d = parseDateSecurely(dateStr);
  if (d) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return "-";
};

const formatCleanDateTime = (dateStr) => {
  if (!dateStr) return "N/A";
  const str = String(dateStr).trim();
  const d = parseDateSecurely(str);
  if (d) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    const hasTime = str.includes('T') || str.includes(':');
    if (hasTime) {
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = String(hours).padStart(2, '0');
      return `${day}-${month}-${year}, ${formattedHours}:${minutes} ${ampm}`;
    }

    return `${day}-${month}-${year}`;
  }
  return "N/A";
};

const Tracking = () => {
  const { user, hasPermission } = useContext(AuthContext);
  const _navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlAwb = searchParams.get('awb');
  const { confirm } = useDialog();
  const { addToast } = useToast();
  const { syncQueue } = useSync();
  const isAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimarg.com' || user?.role === 'admin';

  const [allUpdates, setAllUpdates] = useState([]);

  const displayUpdates = React.useMemo(() => {
    const pending = (syncQueue || [])
      .filter(req => req.method === 'post' && req.url.includes('/tracking'))
      .map(req => ({
        ...req.data,
        id: req.tempId,
        isOfflinePending: true,
      }));
    return [...pending, ...allUpdates];
  }, [allUpdates, syncQueue]);

  const [formData, setFormData] = useState({
    awb: "",
    date: "",
    location: "",
    status: "",
    remarks: ""
  });
  
  const [editingTrackingId, setEditingTrackingId] = useState(null);
  
  const [searchAwb, setSearchAwb] = useState("");
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [locations, setLocations] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showFormDropdown, setShowFormDropdown] = useState(false);
  
  const [selectedSearchBooking, setSelectedSearchBooking] = useState(null);
  const [selectedFormBooking, setSelectedFormBooking] = useState(null);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [modalInitialName, setModalInitialName] = useState("");
  const [showPodModal, setShowPodModal] = useState(false);
  const [selectedPodUrl, setSelectedPodUrl] = useState("");
  const [showTimelineDetails, setShowTimelineDetails] = useState(true);

  const handleCreateNew = (type, name) => {
    setModalType(type);
    setModalInitialName(name);
    setModalOpen(true);
  };

  const handleModalSave = (data) => {
    if (modalType === "city") {
      setLocations([...locations, data]);
      setFormData({ ...formData, location: data.city });
    }
  };
  
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await axios.get(`${API}/cities`);
        if (res.data.success) {
          setLocations(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch cities", err);
      }
    };
    
    const fetchBookings = async () => {
      try {
        const res = await axios.get(`${API}/bookings?worldwide=true`);
        if (res.data.success) {
          setBookingsList(res.data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch bookings", err);
      }
    };

    const fetchAllTrackings = async () => {
      try {
        const res = await axios.get(`${API}/tracking`);
        if (res.data.success) {
          setAllUpdates(res.data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch trackings", err);
      }
    };
    
    fetchCities();
    fetchBookings();
    fetchAllTrackings();
  }, []);

  useEffect(() => {
    if (urlAwb) {
      setSearchAwb(urlAwb);
      fetchTrackingHistory(urlAwb);
    }
  }, [urlAwb]);

  // Instant Search Effect (Debounced)
  useEffect(() => {
    if (!searchAwb.trim()) {
      setHasSearched(false);
      setTrackingHistory([]);
      return;
    }
    const timer = setTimeout(() => {
      // Only fetch if dropdown is closed (meaning they are done selecting/typing)
      if (!showSearchDropdown) {
         fetchTrackingHistory(searchAwb.trim());
      }
    }, 400); 
    
    return () => clearTimeout(timer);
  }, [searchAwb, showSearchDropdown]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === "awb") {
      setShowFormDropdown(true);
    }
  };

  const getBookingAwb = (b) => {
    return String(b.awb || b.consignment || b.awbNo || b.lrNumber || b.lrNo || b.lr_number || (b.id ? String(b.id).slice(-6).toUpperCase() : ""));
  };

  const fetchTrackingHistory = async (awbToSearch) => {
    if (!awbToSearch) return;
    setIsSearching(true);
    try {
      const cleanSearch = String(awbToSearch).trim().toLowerCase();
      
      // Find match using exact or partial inclusion
      const match = bookingsList.find(b => {
        const bAwb = getBookingAwb(b).toLowerCase();
        return bAwb === cleanSearch || bAwb.includes(cleanSearch);
      });
      
      const fullId = match ? match.id : null;
      // If we found a matching booking with a fuller AWB string (like MMC-123 instead of 123), use it to fetch
      const actualAwbToSearch = match ? getBookingAwb(match) : awbToSearch;

      // Call public endpoint which now returns both tracking history and the associated booking details (including invoices)
      const response = await axios.get(`${API}/public/tracking/${actualAwbToSearch}`);
      let data = response.data.success ? response.data.data : [];
      let bookingDetails = response.data.success ? response.data.booking : null;

      const getStatusWeight = (statusStr) => {
        const s = String(statusStr || '').toLowerCase();
        if (s.includes('out for delivery') || s.includes('out_for_delivery')) return 80;
        if (s.includes('deliver')) return 100;
        if (s.includes('transit') || s.includes('reach') || s.includes('hub') || s.includes('arrive')) return 60;
        if (s.includes('pickup') || s.includes('picked')) return 40;
        if (s.includes('book')) return 20;
        return 50;
      };

      if (fullId && fullId !== actualAwbToSearch) {
          try {
              const res2 = await axios.get(`${API}/public/tracking/${fullId}`);
              if (res2.data.success) {
                  const merged = [...data, ...res2.data.data];
                  merged.sort((a, b) => {
                      const dateA = parseDateSecurely(a.date || a.updatedAt);
                      const dateB = parseDateSecurely(b.date || b.updatedAt);
                      const timeA = dateA ? dateA.getTime() : 0;
                      const timeB = dateB ? dateB.getTime() : 0;
                      if (timeA !== timeB) return timeB - timeA;
                      return getStatusWeight(b.status) - getStatusWeight(a.status);
                  });
                  const unique = [];
                  const ids = new Set();
                  for(let item of merged) {
                      if(!ids.has(item.id)) {
                          ids.add(item.id);
                          unique.push(item);
                      }
                  }
                  data = unique;
                  // Merge booking details if they exist in the full ID fetch
                  if (res2.data.booking) bookingDetails = res2.data.booking;
              }
          } catch(err) {
              console.error("Error fetching for full ID", err);
          }
      }

      data.sort((a, b) => {
        const dateA = parseDateSecurely(a.date || a.updatedAt);
        const dateB = parseDateSecurely(b.date || b.updatedAt);
        const timeA = dateA ? dateA.getTime() : 0;
        const timeB = dateB ? dateB.getTime() : 0;
        if (timeA !== timeB) return timeB - timeA;
        return getStatusWeight(b.status) - getStatusWeight(a.status);
      });

      setTrackingHistory(data);
      // Use the returned booking to populate the shipment details card, ignoring client-side bookingsList
      // Fallback to local match if backend didn't return it for some reason
      setSelectedSearchBooking(bookingDetails || match || null);
      setHasSearched(true);
      // Pre-fill form AWB if searching
      setFormData(prev => ({ ...prev, awb: awbToSearch }));
    } catch (error) {
      console.error("Error fetching tracking history", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowSearchDropdown(false);
    
    // Clear selected booking if they just typed a random AWB manually that isn't matched
    if (!selectedSearchBooking || getBookingAwb(selectedSearchBooking) !== searchAwb) {
       const cleanSearch = String(searchAwb).trim().toLowerCase();
       const match = bookingsList.find(b => {
         const bAwb = getBookingAwb(b).toLowerCase();
         return bAwb === cleanSearch || bAwb.includes(cleanSearch);
       });
       setSelectedSearchBooking(match || null);
       
       if (match) {
         setSearchAwb(getBookingAwb(match));
         fetchTrackingHistory(getBookingAwb(match));
         return;
       }
    }
    
    fetchTrackingHistory(searchAwb);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);
    try {
      let response;
      if (editingTrackingId) {
        response = await axios.put(`${API}/tracking/${editingTrackingId}`, formData);
      } else {
        response = await axios.post(`${API}/tracking`, formData);
      }
      
      if (response.data.success) {
        setSuccess(true);
        const awbUpdated = formData.awb;
        
        setFormData({
          awb: awbUpdated,
          date: "",
          location: "",
          status: "",
          remarks: ""
        });
        setEditingTrackingId(null);
        
        if (hasSearched && String(searchAwb).toLowerCase() === String(awbUpdated).toLowerCase()) {
           fetchTrackingHistory(awbUpdated);
        }

        const refresh = await axios.get(`${API}/tracking`);
        if (refresh.data.success) setAllUpdates(refresh.data.data || []);

        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Error saving tracking entry", error);
      addToast(error.response?.data?.message || "Failed to save tracking update.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const normalizeStatus = (status) => {
    const s = String(status || '').trim().toLowerCase();
    if (s.includes('out for delivery') || s.includes('out_for_delivery')) return 'OUT FOR DELIVERY';
    if (s.includes('deliver')) return 'DELIVERED';
    if (s.includes('transit')) return 'IN TRANSIT';
    if (s.includes('reach') || s.includes('hub') || s.includes('arrive')) return 'REACHED HUB';
    if (s.includes('pickup') || s.includes('picked')) return 'PICKED UP';
    if (s.includes('book')) return 'BOOKED';
    if (s.includes('delay')) return 'DELAYED';
    if (s.includes('return') || s.includes('rto')) return 'RETURNED';
    return String(status || 'IN TRANSIT').toUpperCase();
  };

  const getStatusIcon = (status) => {
    const norm = normalizeStatus(status);
    switch (norm) {
      case "DELIVERED": return <CheckCircle size={22} />;
      case "OUT FOR DELIVERY": return <Truck size={22} />;
      case "IN TRANSIT": return <Truck size={22} />;
      case "REACHED HUB": return <MapPin size={22} />;
      case "PICKED UP": return <Package size={22} />;
      case "BOOKED":
      case "SHIPMENT BOOKED": return <Package size={22} />;
      case "DELAYED": return <Clock size={22} />;
      case "RETURNED": return <XCircle size={22} />;
      default: return <Clock size={22} />;
    }
  };

  const getStatusColor = (status) => {
    const norm = normalizeStatus(status);
    switch (norm) {
      case "DELIVERED": return "#059669"; // Emerald Green
      case "OUT FOR DELIVERY": return "#7c3aed"; // Vibrant Purple
      case "IN TRANSIT": return "#d97706"; // Amber / Gold
      case "REACHED HUB": return "#0d9488"; // Teal
      case "PICKED UP": return "#0284c7"; // Sky Blue
      case "BOOKED":
      case "SHIPMENT BOOKED": return "#1e40af"; // Deep Royal Blue
      case "DELAYED": return "#ea580c"; // Orange
      case "RETURNED": return "#dc2626"; // Red
      default: return "#475569";
    }
  };

  const getStatusBg = (status) => {
    const norm = normalizeStatus(status);
    switch (norm) {
      case "DELIVERED": return "#ecfdf5";
      case "OUT FOR DELIVERY": return "#f5f3ff";
      case "IN TRANSIT": return "#fffbeb";
      case "REACHED HUB": return "#f0fdfa";
      case "PICKED UP": return "#f0f9ff";
      case "BOOKED":
      case "SHIPMENT BOOKED": return "#eff6ff";
      case "DELAYED": return "#fff7ed";
      case "RETURNED": return "#fef2f2";
      default: return "#f8fafc";
    }
  };

  const getStatusBorder = (status) => {
    const norm = normalizeStatus(status);
    switch (norm) {
      case "DELIVERED": return "#a7f3d0";
      case "OUT FOR DELIVERY": return "#ddd6fe";
      case "IN TRANSIT": return "#fde68a";
      case "REACHED HUB": return "#99f6e4";
      case "PICKED UP": return "#bae6fd";
      case "BOOKED":
      case "SHIPMENT BOOKED": return "#bfdbfe";
      case "DELAYED": return "#fed7aa";
      case "RETURNED": return "#fecaca";
      default: return "#e2e8f0";
    }
  };

  // Autocomplete filtering logic
  const getFilteredBookings = (input) => {
    if (!input || !input.trim()) return [];
    const query = input.toLowerCase();
    return bookingsList.filter(b => {
      const lrStr = String(b.awb || b.consignment || b.lrNo || b.biltyNo || b.id || "").toLowerCase();
      const clientStr = String(b.client || b.clientName || "").toLowerCase();
      const originStr = String(b.origin || "").toLowerCase();
      const destStr = String(b.destination || "").toLowerCase();
      return lrStr.includes(query) || clientStr.includes(query) || originStr.includes(query) || destStr.includes(query);
    });
  };

  const searchFilteredLRs = getFilteredBookings(searchAwb);
  const formFilteredLRs = getFilteredBookings(formData.awb);


  const handleDelete = async (id) => {
    if (!id) {
      addToast("Invalid tracking ID provided", "error");
      return;
    }
    const isConfirmed = await confirm({
      title: "Delete Tracking Update",
      message: "Are you sure you want to delete this tracking update?",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;

    try {
      await axios.delete(`${API}/tracking/${id}`);
      setTrackingHistory(prev => prev.filter(t => (t.id || t._id) !== id));
      setAllUpdates(prev => prev.filter(t => (t.id || t._id) !== id));

      // Refresh bookings and tracking to immediately update status in memory
      try {
        const [bkRes, trkRes] = await Promise.all([
          axios.get(`${API}/bookings?worldwide=true`),
          axios.get(`${API}/tracking`)
        ]);
        if (bkRes?.data?.success) {
          const freshList = bkRes.data.data || [];
          setBookingsList(freshList);
          if (selectedFormBooking) {
            const updated = freshList.find(b => (b.id || b._id) === (selectedFormBooking.id || selectedFormBooking._id));
            if (updated) setSelectedFormBooking(updated);
          }
        }
        if (trkRes?.data?.success) {
          setAllUpdates(trkRes.data.data || []);
        }
      } catch (rErr) {}

      if (searchAwb) {
        fetchTrackingHistory(searchAwb);
      }

      addToast("Tracking update deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting tracking", error);
      addToast(error.response?.data?.message || "Failed to delete tracking update.", "error");
    }
  };

  const _handleDeleteBooking = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Booking",
      message: "Are you sure you want to delete this booking? This will also remove any associated data.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;

    try {
      await axios.delete(`${API}/bookings/${id}`);
      addToast("Booking deleted successfully!", "success");
      setSearchAwb("");
      setTrackingHistory([]);
      setSelectedSearchBooking(null);
      setHasSearched(false);
      // Re-fetch bookings list
      const res = await axios.get(`${API}/bookings?worldwide=true`);
      if (res.data.success) {
        setBookingsList(res.data.data || []);
      }
    } catch (error) {
      console.error("Error deleting booking", error);
      addToast("Failed to delete booking.", "error");
    }
  };

  const handleEdit = (entry) => {
    if (String(entry.status || '').toLowerCase().includes("deliver")) {
      addToast("Delivered entries are locked from editing. Delete the Delivered entry below to update the shipment.", "warning");
      return;
    }
    setEditingTrackingId(entry.id || entry._id);
    setFormData({
      awb: entry.awb,
      date: entry.date ? entry.date.split('T')[0] : "",
      location: entry.location || "",
      status: entry.status || "",
      remarks: entry.remarks || ""
    });
    const match = bookingsList.find(b => {
      const bAwb = b.awb || b.consignment || b.lrNo || (b.id ? b.id.slice(-6) : "");
      return String(bAwb) === String(entry.awb);
    });
    if (match) setSelectedFormBooking(match);
    
    // Scroll to form (mobile friendly)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const AutocompleteDropdown = ({ filteredList, onSelect }) => (
    <div 
      onMouseDown={(e) => e.preventDefault()}
      style={{
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      background: "white",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
      zIndex: 50,
      maxHeight: "250px",
      overflowY: "auto",
      marginTop: "4px"
    }}>
      {filteredList.map((booking, index) => {
        const awb = getBookingAwb(booking);
        return (
          <div 
            key={booking.id || index}
            onClick={() => onSelect(awb, booking)}
            style={{
              padding: "10px 15px",
              borderBottom: index < filteredList.length - 1 ? "1px solid #f1f5f9" : "none",
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
                {booking.origin} → {booking.destination} • <b>{booking.client || booking.clientName || "-"}</b>
              </div>
            </div>
            <span style={{ background: "#e0f2fe", color: "#0284c7", padding: "4px 8px", borderRadius: "6px", fontWeight: 700, fontSize: "0.75rem" }}>Select</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ width: "100%", margin: "0 auto", paddingBottom: "2rem" }}>
      
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem", color: "#111827", fontWeight: "700" }}>
            Shipment Tracking
          </h3>
          <p style={{ color: "#6b7280", margin: 0, fontSize: "0.95rem" }}>
            Track your shipments and post real-time updates professionally.
          </p>
        </div>
      </div>

      <div className="tracking-layout">
        
        {/* LEFT COLUMN: TRACKING VIEWER */}
        <div className="glass-panel" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column", height: "100%", minHeight: "500px" }}>
          
          <div className="tracking-panel-content" style={{ background: "rgba(249, 250, 251, 0.5)", borderBottom: "1px solid rgba(229, 231, 235, 0.5)" }}>
            <h4 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#374151", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Search size={18} color="#6366f1" /> Track Shipment
            </h4>
                <form onSubmit={handleSearchSubmit} className="tracking-search-form">
              <div style={{ position: "relative", flex: 1 }}>
                <label htmlFor="searchAwbInput" className="sr-only">Search AWB or LR Number</label>
                <input 
                  id="searchAwbInput"
                  name="searchAwb"
                  type="text" 
                  className="form-control" 
                  placeholder="Enter AWB or LR No..." 
                  value={searchAwb}
                  onChange={(e) => { 
                    setSearchAwb(e.target.value); 
                    setShowSearchDropdown(true); 
                    setSelectedSearchBooking(null);
                  }}
                  onFocus={() => setShowSearchDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                  style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "0.6rem 1rem", fontSize: "0.95rem", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)" }}
                  autoComplete="off"
                />
                {showSearchDropdown && searchAwb.trim().length > 0 && searchFilteredLRs.length > 0 && (
                  <AutocompleteDropdown 
                    filteredList={searchFilteredLRs} 
                    onSelect={(awb, booking) => { 
                      setSearchAwb(awb); 
                      setShowSearchDropdown(false); 
                      setSelectedSearchBooking(booking);
                      fetchTrackingHistory(awb); 
                    }} 
                  />
                )}
              </div>
              <button 
                type="submit" 
                className="btn"
                style={{ 
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)", 
                  color: "white", 
                  padding: "0.6rem 1.2rem", 
                  borderRadius: "8px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  cursor: "pointer",
                  transition: "transform 0.1s ease, box-shadow 0.2s ease",
                  boxShadow: "0 4px 6px rgba(99, 102, 241, 0.25)",
                  minHeight: "44px"
                }}
                disabled={isSearching || !searchAwb.trim()}
              >
                {isSearching ? <Loader2 size={18} className="spinner" /> : "Track"}
              </button>
            </form>
          </div>

          <div className="tracking-panel-content" style={{ flex: 1, background: "#ffffff", overflowY: "auto" }}>
            
            {!hasSearched ? (            
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                justifyContent: "center", 
                minHeight: "400px", 
                background: "#ffffff", 
                borderRadius: "20px", 
                border: "1px solid #e2e8f0", 
                padding: "3rem 2rem", 
                margin: "1rem 0", 
                textAlign: "center", 
                width: "100%", 
                boxSizing: "border-box",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.02), 0 8px 10px -6px rgba(0, 0, 0, 0.01)"
              }}>
               <div style={{ 
                  background: "#eff6ff", 
                  color: "#3b82f6", 
                  width: "90px",
                  height: "90px",
                  borderRadius: "50%", 
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "2rem",
                  boxShadow: "0 0 0 10px #f8fafc"
               }}>
                  <Search size={40} strokeWidth={2} />
               </div>
               <div style={{ display: "block", width: "100%" }}>
                 <h5 style={{ fontWeight: "800", color: "#0f172a", fontSize: "1.5rem", margin: "0 0 1rem 0", letterSpacing: "-0.02em" }}>
                   Ready to Track?
                 </h5>
                 <p style={{ margin: "0 auto", fontSize: "1.05rem", color: "#64748b", maxWidth: "340px", lineHeight: "1.6" }}>
                   Enter your <b>AWB</b> or <b>LR number</b> in the search bar above to instantly view real-time status and delivery timeline.
                 </p>
               </div>
            </div>
            ) : trackingHistory.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", textAlign: "center", padding: "2rem" }}>
                 <div style={{ background: "#fef2f2", padding: "1.5rem", borderRadius: "50%", marginBottom: "1rem" }}>
                    <AlertCircle size={40} color="#f87171" />
                 </div>
                 <h5 style={{ fontWeight: "600", color: "#6b7280", margin: "0 0 0.5rem 0" }}>No Tracking Data Found</h5>
                 <p style={{ margin: 0, fontSize: "0.9rem" }}>There is no tracking history recorded for <strong>{searchAwb}</strong>.</p>
              </div>
            ) : (
              <div>
                
                {/* DTDC STYLE PROFESSIONAL TRACKING VIEW */}
                {selectedSearchBooking && (() => {
                  const mainPodUrl = selectedSearchBooking.podUrl || selectedSearchBooking.pod || trackingHistory.find(t => t.podUrl)?.podUrl || null;
                  const currentAwb = getBookingAwb(selectedSearchBooking) || searchAwb;
                  
                  const latestEntry = trackingHistory[0] || {};
                  const rawStatus = String(latestEntry?.status || selectedSearchBooking.status || selectedSearchBooking.delivery_status || selectedSearchBooking.transitStatus || "Shipment Booked");
                  const normStatus = rawStatus.toLowerCase();

                  const isOutForDelivery = normStatus.includes("out for delivery") || normStatus.includes("out_for_delivery");
                  const isDelivered = normStatus.includes("deliver") && !isOutForDelivery;
                  const isBooked = normStatus.includes("book") && !normStatus.includes("transit") && !normStatus.includes("out") && !normStatus.includes("deliver");
                  const isInTransit = !isDelivered && !isOutForDelivery && !isBooked;

                  // Determine step index for the 4-step progress tracker:
                  // 1: Booked, 2: In Transit, 3: Out for Delivery, 4: Delivered
                  let currentStepNumber = 1;
                  if (isDelivered) currentStepNumber = 4;
                  else if (isOutForDelivery) currentStepNumber = 3;
                  else if (isInTransit) currentStepNumber = 2;
                  else currentStepNumber = 1;

                  const originCity = selectedSearchBooking.origin ? String(selectedSearchBooking.origin).toUpperCase() : "";
                  const destCity = selectedSearchBooking.destination ? String(selectedSearchBooking.destination).toUpperCase() : "";
                  const currentLoc = (latestEntry?.location || selectedSearchBooking?.currentLocation || "").trim().toUpperCase();

                  // Status Banner styling & messaging — GRADIENT THEME
                  let bannerBg = "linear-gradient(135deg, #046A38 0%, #059669 50%, #10b981 100%)";
                  let bannerAccent = "#059669";
                  let bannerTitle = "Delivered";
                  let bannerSubtitle = `Delivered on ${formatCleanDateTime(latestEntry.date || latestEntry.updatedAt || selectedSearchBooking.deliveryDate || selectedSearchBooking.date)}`;
                  let bannerRibbonBg = "linear-gradient(90deg, #ecfdf5, #d1fae5)";
                  let bannerRibbonText = "#065f46";
                  let bannerMessage = "🎉 Your Shipment has been Delivered on Time!";
                  let stepGradient = "linear-gradient(90deg, #046A38, #059669, #10b981)";

                  if (isDelivered) {
                    bannerBg = "linear-gradient(135deg, #046A38 0%, #059669 50%, #10b981 100%)";
                    bannerAccent = "#059669";
                    bannerTitle = "Delivered";
                    bannerSubtitle = `Delivered on ${formatCleanDateTime(latestEntry.date || latestEntry.updatedAt || selectedSearchBooking.deliveryDate || selectedSearchBooking.date)}`;
                    bannerRibbonBg = "linear-gradient(90deg, #ecfdf5, #d1fae5)";
                    bannerRibbonText = "#065f46";
                    bannerMessage = "🎉 Your Shipment has been Delivered on Time!";
                    stepGradient = "linear-gradient(90deg, #046A38, #059669, #10b981)";
                  } else if (isOutForDelivery) {
                    bannerBg = "linear-gradient(135deg, #5b21b6 0%, #7c3aed 50%, #a78bfa 100%)";
                    bannerAccent = "#7c3aed";
                    bannerTitle = "Out for Delivery";
                    bannerSubtitle = `Out for Delivery at ${destCity || "Destination"}`;
                    bannerRibbonBg = "linear-gradient(90deg, #f5f3ff, #ede9fe)";
                    bannerRibbonText = "#5b21b6";
                    bannerMessage = "🛵 Shipment is Out for Delivery with the executive.";
                    stepGradient = "linear-gradient(90deg, #5b21b6, #7c3aed, #a78bfa)";
                  } else if (isInTransit) {
                    bannerBg = "linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)";
                    bannerAccent = "#d97706";
                    bannerTitle = "In Transit";
                    const fromStr = originCity ? `In Transit from ${originCity}` : "In Transit";
                    const toStr = destCity ? ` to ${destCity}` : "";
                    bannerSubtitle = currentLoc ? `In Transit - Current Location: ${currentLoc}` : `${fromStr}${toStr}`;
                    bannerRibbonBg = "linear-gradient(90deg, #fffbeb, #fef3c7)";
                    bannerRibbonText = "#b45309";
                    bannerMessage = currentLoc 
                      ? `🚚 Your Shipment is currently at ${currentLoc}${destCity ? ` moving towards ${destCity}` : ''}.`
                      : `🚚 Your Shipment is In Transit from ${originCity || "origin"} and moving towards destination.`;
                    stepGradient = "linear-gradient(90deg, #b45309, #d97706, #f59e0b)";
                  } else {
                    bannerBg = "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)";
                    bannerAccent = "#1e40af";
                    bannerTitle = "Shipment Booked";
                    bannerSubtitle = originCity ? `Booked at ${originCity}` : "Shipment Booked";
                    bannerRibbonBg = "linear-gradient(90deg, #eff6ff, #dbeafe)";
                    bannerRibbonText = "#1e40af";
                    bannerMessage = originCity ? `📦 Shipment has been booked from ${originCity} and Lorry Receipt generated.` : "📦 Shipment has been booked and Lorry Receipt generated.";
                    stepGradient = "linear-gradient(90deg, #1e3a8a, #2563eb, #3b82f6)";
                  }

                  const steps = [
                    { id: 1, label: "Booked", icon: Package },
                    { id: 2, label: "In Transit", icon: Truck },
                    { id: 3, label: "Out for Delivery", icon: MapPin },
                    { id: 4, label: "Delivered", icon: CheckCircle }
                  ];

                  // Invoices Extraction
                  const invoices = (Array.isArray(selectedSearchBooking.invoiceDetails) && selectedSearchBooking.invoiceDetails.length > 0)
                    ? selectedSearchBooking.invoiceDetails
                    : (selectedSearchBooking.invoice_no || selectedSearchBooking.eway_bill)
                      ? [{
                          invoice_no: selectedSearchBooking.invoice_no || "-",
                          invoice_date: selectedSearchBooking.date || "-",
                          part_no: "-",
                          qty: selectedSearchBooking.box || selectedSearchBooking.packages || 1,
                          value: selectedSearchBooking.declared_value || selectedSearchBooking.invoice_value || "-",
                          eway_bill: selectedSearchBooking.eway_bill || selectedSearchBooking.eway || "-"
                        }]
                      : [];

                  const allInvoiceNumbers = invoices.map(i => i.invoice_no || i.invoiceNo).filter(Boolean).join(", ") || selectedSearchBooking.invoice_no || selectedSearchBooking.refNo || "-";

                  return (
                    <div style={{ marginBottom: "2rem" }}>
                      
                      {/* DTDC TOP HEADER BAR */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.75rem 0.5rem 1rem",
                        borderBottom: "1px solid #e2e8f0",
                        marginBottom: "1rem",
                        flexWrap: "wrap",
                        gap: "0.75rem"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <img 
                            src="/circle_crop_logo.png" 
                            alt="Multimarg Carriers Logo" 
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              objectFit: "cover",
                              flexShrink: 0
                            }}
                          />
                          <div>
                            <div style={{ fontSize: "clamp(0.85rem, 2.2vw, 1.05rem)", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                              Multimarg Carriers
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span style={{ fontWeight: 800, color: "#ea580c", fontSize: "1.15rem", letterSpacing: "0.5px" }}>
                                AWB: {currentAwb}
                              </span>
                              <CopyButton text={currentAwb} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* DTDC PROMINENT STATUS HERO BANNER */}
                      <div style={{
                        borderRadius: "8px",
                        overflow: "hidden",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
                        marginBottom: "1.5rem"
                      }}>
                        <div style={{
                          background: bannerBg,
                          color: "#ffffff",
                          padding: "1.25rem 1.5rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "1rem"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <div style={{
                              width: "48px",
                              height: "48px",
                              borderRadius: "8px",
                              backgroundColor: "rgba(255, 255, 255, 0.15)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              <Package size={28} color="#ffffff" />
                            </div>
                            <div>
                              <h2 style={{ margin: 0, fontSize: "clamp(1.3rem, 4vw, 1.75rem)", fontWeight: "800", letterSpacing: "-0.02em", lineHeight: 1.1, color: "#ffffff" }}>
                                {bannerTitle}
                              </h2>
                              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.9)", fontWeight: "500" }}>
                                {bannerSubtitle}
                              </p>
                            </div>
                          </div>

                          {mainPodUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPodUrl(mainPodUrl);
                                setShowPodModal(true);
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                padding: "0.5rem 1rem",
                                backgroundColor: "#ffffff",
                                color: bannerAccent,
                                border: "none",
                                borderRadius: "6px",
                                fontWeight: "700",
                                fontSize: "0.85rem",
                                cursor: "pointer",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                              }}
                            >
                              <Eye size={16} /> View POD Proof
                            </button>
                          )}
                        </div>

                        {/* Ribbon Message Bar */}
                        <div style={{
                          backgroundColor: bannerRibbonBg,
                          color: bannerRibbonText,
                          padding: "0.6rem 1.25rem",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem"
                        }}>
                          <span>{bannerMessage}</span>
                        </div>
                      </div>

                      {/* DTDC 4-STEP HORIZONTAL STEP TRACKER */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                        gap: "clamp(0.25rem, 1.5vw, 0.75rem)",
                        margin: "1.5rem 0",
                        padding: "0 0.15rem"
                      }}>
                        {steps.map((step) => {
                          const isCompleted = step.id <= currentStepNumber;
                          const isCurrent = step.id === currentStepNumber;
                          const StepIcon = step.icon;

                          return (
                            <div key={step.id} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                              {/* Top Step Indicator Bar */}
                              <div style={{
                                height: "4px",
                                borderRadius: "2px",
                                background: isCompleted ? stepGradient : "#e2e8f0",
                                transition: "all 0.3s ease"
                              }} />
                              
                              {/* Step Label & Icon */}
                              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", paddingTop: "0.2rem" }}>
                                {isCompleted ? (
                                  <div style={{
                                    width: "16px",
                                    height: "16px",
                                    borderRadius: "50%",
                                    background: stepGradient,
                                    color: "white",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0
                                  }}>
                                    <Check size={10} strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div style={{
                                    width: "16px",
                                    height: "16px",
                                    borderRadius: "50%",
                                    border: "1.5px solid #cbd5e1",
                                    backgroundColor: "white",
                                    flexShrink: 0
                                  }} />
                                )}
                                <span style={{
                                  fontSize: "clamp(0.68rem, 1.8vw, 0.8rem)",
                                  fontWeight: isCompleted ? 700 : 500,
                                  color: isCompleted ? "#0f172a" : "#64748b",
                                  lineHeight: 1.15,
                                  wordBreak: "break-word"
                                }}>
                                  {step.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* ORIGIN & DESTINATION STRIP */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "0.75rem 1rem",
                        marginBottom: "1.25rem",
                        fontSize: "0.85rem",
                        flexWrap: "wrap",
                        gap: "0.5rem"
                      }}>
                        <div>
                          <span style={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", display: "block" }}>Origin:</span>
                          <span style={{ color: "#0f172a", fontWeight: 700 }}>
                            {selectedSearchBooking.origin ? selectedSearchBooking.origin.toUpperCase() : "ORIGIN"}
                            {selectedSearchBooking.originPincode ? `, ${selectedSearchBooking.originPincode}` : ""}
                            {", INDIA"}
                          </span>
                        </div>
                        {currentLoc && (
                          <div style={{ textAlign: "center", padding: "0 0.5rem" }}>
                            <span style={{ color: "#d97706", fontWeight: 700, textTransform: "uppercase", fontSize: "0.75rem", display: "block" }}>Current Location:</span>
                            <span style={{ color: "#b45309", fontWeight: 800, fontSize: "0.9rem" }}>
                              📍 {currentLoc}
                            </span>
                          </div>
                        )}
                        <div style={{ textAlign: "right" }}>
                          <span style={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", display: "block" }}>Destination:</span>
                          <span style={{ color: "#0f172a", fontWeight: 700 }}>
                            {selectedSearchBooking.destination ? selectedSearchBooking.destination.toUpperCase() : "DESTINATION"}
                            {selectedSearchBooking.destinationPincode ? `, ${selectedSearchBooking.destinationPincode}` : ""}
                            {", INDIA"}
                          </span>
                        </div>
                      </div>

                      {/* SHIPMENT DETAILS HEADER AND CONTAINER */}
                      <div style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        overflow: "hidden",
                        marginBottom: "1.5rem",
                        backgroundColor: "#ffffff"
                      }}>
                        <div style={{
                          background: "linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%)",
                          padding: "0.5rem 0.75rem",
                          borderBottom: "1px solid #e2e8f0",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "#ffffff",
                          textTransform: "uppercase",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem"
                        }}>
                          <Layers size={13} color="#ffffff" /> SHIPMENT DETAILS
                        </div>

                        <div style={{ padding: "0.6rem 0.75rem" }}>
                          <div className="shipment-details-grid" style={{ fontSize: "0.78rem" }}>
                            {/* Row: Consignor */}
                            <div>
                              <span style={{ color: "#64748b", fontWeight: 600, marginRight: "0.35rem" }}>CONSIGNOR:</span>
                              <span style={{ fontWeight: 700, color: "#0f172a", wordBreak: "break-word" }}>
                                {selectedSearchBooking.consignor ? selectedSearchBooking.consignor.toUpperCase() : "-"}
                                {selectedSearchBooking.consignorGstin && (
                                  <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 500, fontFamily: "monospace", marginLeft: "0.3rem" }}>
                                    (GST: {selectedSearchBooking.consignorGstin})
                                  </span>
                                )}
                              </span>
                            </div>

                            {/* Row: Consignee */}
                            <div>
                              <span style={{ color: "#64748b", fontWeight: 600, marginRight: "0.35rem" }}>CONSIGNEE:</span>
                              <span style={{ fontWeight: 700, color: "#0f172a", wordBreak: "break-word" }}>
                                {selectedSearchBooking.consignee ? selectedSearchBooking.consignee.toUpperCase() : "-"}
                                {selectedSearchBooking.consigneeGstin && (
                                  <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 500, fontFamily: "monospace", marginLeft: "0.3rem" }}>
                                    (GST: {selectedSearchBooking.consigneeGstin})
                                  </span>
                                )}
                              </span>
                            </div>

                            {/* Row: Client */}
                            <div>
                              <span style={{ color: "#64748b", fontWeight: 600, marginRight: "0.35rem" }}>CLIENT:</span>
                              <span style={{ fontWeight: 700, color: "#0f172a", wordBreak: "break-word" }}>
                                {selectedSearchBooking.client ? selectedSearchBooking.client.toUpperCase() : (selectedSearchBooking.clientName ? selectedSearchBooking.clientName.toUpperCase() : "-")}
                              </span>
                            </div>

                            {/* Row: Booking Date */}
                            <div>
                              <span style={{ color: "#64748b", fontWeight: 600, marginRight: "0.35rem" }}>BOOKED ON:</span>
                              <span style={{ fontWeight: 700, color: "#0f172a" }}>
                                {formatCleanDate(selectedSearchBooking.dispatch_date || selectedSearchBooking.date || selectedSearchBooking.createdAt)}
                              </span>
                            </div>

                            {/* Row: Package Count */}
                            <div>
                              <span style={{ color: "#64748b", fontWeight: 600, marginRight: "0.35rem" }}>PACKAGES:</span>
                              <span style={{ fontWeight: 700, color: "#0f172a" }}>
                                {(() => {
                                  const bVal = selectedSearchBooking.box || selectedSearchBooking.packages || selectedSearchBooking.pkg || selectedSearchBooking.pcs || selectedSearchBooking.package_count || selectedSearchBooking.boxCount;
                                  return bVal ? `${bVal} PCS` : "-";
                                })()}
                              </span>
                            </div>

                            {/* Row: Mode / Payment */}
                            <div>
                              <span style={{ color: "#64748b", fontWeight: 600, marginRight: "0.35rem" }}>MODE:</span>
                              <span style={{ fontWeight: 700 }}>
                                <span style={{ color: "#1e3a8a" }}>{(selectedSearchBooking.mode || "ROAD").toUpperCase()}</span>
                                {" / "}
                                <span style={{ color: "#059669" }}>{(selectedSearchBooking.paymentMode || selectedSearchBooking.payment || "CREDIT").toUpperCase()}</span>
                              </span>
                            </div>

                            {/* Row: Weight (conditional) */}
                            {(() => {
                              const act = parseFloat(selectedSearchBooking.actual_wt || selectedSearchBooking.weight || 0);
                              const chg = parseFloat(selectedSearchBooking.charge_wt || selectedSearchBooking.weight || 0);
                              if (act > 0 || chg > 0) {
                                return (
                                  <div>
                                    <span style={{ color: "#64748b", fontWeight: 600, marginRight: "0.35rem" }}>WEIGHT:</span>
                                    <span style={{ fontWeight: 600, color: "#0f172a" }}>
                                      ACT: <strong style={{ color: "#1e3a8a" }}>{selectedSearchBooking.actual_wt || selectedSearchBooking.weight || "-"} KG</strong> | CHG: <strong style={{ color: "#059669" }}>{selectedSearchBooking.charge_wt || selectedSearchBooking.weight || "-"} KG</strong>
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Row: Vehicle No (conditional) */}
                            {selectedSearchBooking.vehicleNo && (
                              <div>
                                <span style={{ color: "#64748b", fontWeight: 600, marginRight: "0.35rem" }}>VEHICLE:</span>
                                <span style={{ fontWeight: 700, color: "#e11d48", fontFamily: "monospace" }}>
                                  {selectedSearchBooking.vehicleNo.toUpperCase()}
                                </span>
                              </div>
                            )}

                            {/* Row: Goods Description (conditional) */}
                            {(selectedSearchBooking.goods_description || selectedSearchBooking.goodsDescription || selectedSearchBooking.goods || selectedSearchBooking.commodity) && (
                              <div>
                                <span style={{ color: "#64748b", fontWeight: 600, marginRight: "0.35rem" }}>GOODS:</span>
                                <span style={{ fontWeight: 600, color: "#334155" }}>
                                  {(selectedSearchBooking.goods_description || selectedSearchBooking.goodsDescription || selectedSearchBooking.goods || selectedSearchBooking.commodity || "-").toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* INVOICE & E-WAY BILL DETAILS TABLE */}
                      {invoices.length > 0 && (
                        <div style={{
                          marginTop: "1rem",
                          marginBottom: "1.5rem",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          overflow: "hidden",
                          backgroundColor: "#ffffff",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}>
                          <div style={{
                            background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
                            padding: "0.5rem 0.75rem",
                            borderBottom: "1px solid #e2e8f0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "0.4rem"
                          }}>
                            <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "#ffffff", display: "flex", alignItems: "center", gap: "0.4rem", textTransform: "uppercase" }}>
                              <FileText size={14} color="#ffffff" /> Invoice & E-Way Bill Details ({invoices.length})
                            </div>
                            {selectedSearchBooking.eway_bill && (
                              <div style={{ fontSize: "0.72rem", color: "#eff6ff", fontWeight: 600 }}>
                                E-WAY: <strong style={{ color: "#ffffff", fontFamily: "monospace" }}>{selectedSearchBooking.eway_bill}</strong>
                              </div>
                            )}
                          </div>

                          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem", textAlign: "left", minWidth: "520px", textTransform: "uppercase" }}>
                              <thead>
                                <tr style={{ backgroundColor: "#f1f5f9", color: "#475569", fontWeight: 700, borderBottom: "1px solid #cbd5e1" }}>
                                  <th style={{ padding: "5px 6px", width: "28px", whiteSpace: "nowrap" }}>#</th>
                                  <th style={{ padding: "5px 6px", whiteSpace: "nowrap" }}>INVOICE NO</th>
                                  <th style={{ padding: "5px 6px", whiteSpace: "nowrap" }}>DATE</th>
                                  <th style={{ padding: "5px 6px", whiteSpace: "nowrap" }}>PART NO / DESC</th>
                                  <th style={{ padding: "5px 6px", textAlign: "center", whiteSpace: "nowrap" }}>PKGS</th>
                                  <th style={{ padding: "5px 6px", textAlign: "right", whiteSpace: "nowrap" }}>VALUE (₹)</th>
                                  <th style={{ padding: "5px 6px", whiteSpace: "nowrap" }}>E-WAY BILL NO</th>
                                </tr>
                              </thead>
                              <tbody>
                                {invoices.map((inv, iIdx) => {
                                  const invNo = inv.invoice_no || inv.invoiceNo || inv.invoice || "-";
                                  const invDate = inv.invoice_date || inv.invoiceDate || inv.date || inv.invdate || "";
                                  const partNo = inv.part_no || inv.partNumber || inv.part || inv.description || "-";
                                  const pkgs = inv.qty || inv.quantity || inv.box || inv.packages || "-";
                                  const val = inv.value || inv.invoiceValue || inv.invoice_value || inv.declared_value || inv.amount || "";
                                  const eway = inv.eway_bill || inv.ewayBill || inv.eway || selectedSearchBooking.eway_bill || "-";

                                  return (
                                    <tr key={iIdx} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: iIdx % 2 === 1 ? "#fafafa" : "#ffffff" }}>
                                      <td style={{ padding: "5px 6px", color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>{iIdx + 1}</td>
                                      <td style={{ padding: "5px 6px", fontWeight: 700, color: "#1e3a8a", whiteSpace: "nowrap" }}>
                                        {invNo}
                                      </td>
                                      <td style={{ padding: "5px 6px", color: "#334155", whiteSpace: "nowrap" }}>
                                        {formatCleanDate(invDate)}
                                      </td>
                                      <td style={{ padding: "5px 6px", color: "#475569", whiteSpace: "nowrap" }}>
                                        {partNo}
                                      </td>
                                      <td style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                                        {pkgs}
                                      </td>
                                      <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700, color: "#059669", whiteSpace: "nowrap" }}>
                                        {val ? `₹${parseFloat(val || 0).toLocaleString('en-IN')}` : "-"}
                                      </td>
                                      <td style={{ padding: "5px 6px", fontWeight: 600, color: "#0f172a", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                                        {eway}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* SHIPMENT PROGRESS TIMELINE HEADER */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.5rem 0.25rem",
                        marginBottom: "0.75rem",
                        borderBottom: "1px solid #e2e8f0"
                      }}>
                        <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <Clock size={18} color="#2563eb" /> Shipment Progress
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowTimelineDetails(prev => !prev)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#2563eb",
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem"
                          }}
                        >
                          {showTimelineDetails ? "View Less" : "View Details"}
                          {showTimelineDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>

                    </div>
                  );
                })()}

                {showTimelineDetails && (
                  <div className="tracking-timeline-container">
                    {/* Vertical Line */}
                    <div className="tracking-timeline-line"></div>
                    {trackingHistory.map((entry, index) => {
                      const isLatest = index === 0; 
                      const color = getStatusColor(entry.status);
                      const bg = getStatusBg(entry.status);
                      const border = getStatusBorder(entry.status);
                      const statusCaps = normalizeStatus(entry.status);

                      return (
                        <div key={entry.id || index} className="tracking-timeline-item" style={{ marginBottom: index === trackingHistory.length - 1 ? "0" : "2.2rem" }}>
                          
                          <div className="timeline-icon-circle" style={{ 
                            width: "44px", 
                            height: "44px", 
                            borderRadius: "50%", 
                            background: isLatest ? color : bg, 
                            border: `2.5px solid ${color}`,
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            color: isLatest ? "white" : color,
                            flexShrink: 0,
                            marginLeft: "-10px",
                            boxShadow: isLatest ? `0 0 0 4px ${color}25, 0 4px 10px ${color}30` : "0 0 0 4px white"
                          }}>
                            {getStatusIcon(entry.status)}
                          </div>

                          <div className="timeline-details-card" style={{ flex: 1, padding: "0.9rem 1.2rem", background: isLatest ? bg : "#ffffff", border: `1.5px solid ${isLatest ? border : '#e2e8f0'}`, borderRadius: "12px", boxShadow: isLatest ? `0 4px 12px -2px ${color}15` : "none" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem", flexWrap: "wrap", gap: "0.5rem" }}>
                              <span style={{ fontWeight: 800, color: color, fontSize: "1rem", letterSpacing: "0.03em" }}>{statusCaps}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                <span style={{ fontSize: "0.8rem", color: "#475569", background: isLatest ? "#ffffff" : "#f1f5f9", padding: "0.25rem 0.75rem", borderRadius: "20px", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem", border: "1px solid #e2e8f0" }}>
                                  <Clock size={12} color="#64748b" />
                                  {formatCleanDateTime(entry.updatedAt || entry.createdAt || entry.date)}
                                </span>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem", color: "#334155", fontSize: "0.9rem", fontWeight: 600 }}>
                              <MapPin size={14} color={color} />
                              <span style={{ textTransform: "uppercase", letterSpacing: "0.03em" }}>{entry.location ? String(entry.location).toUpperCase() : "LOCATION NOT PROVIDED"}</span>
                              {isAdmin && (
                                <span style={{ marginLeft: "auto", background: isLatest ? "#ffffff" : "#f1f5f9", border: "1px solid #e2e8f0", padding: "2px 8px", borderRadius: "12px", fontSize: "0.72rem", color: "#475569", fontWeight: 600 }}>
                                  BY: {(entry.enteredBy || "Admin").toUpperCase()}
                                </span>
                              )}
                            </div>
                            {entry.remarks && (
                              <div style={{ 
                                fontSize: "0.85rem", 
                                color: "#1e3a8a", 
                                background: "#eff6ff", 
                                padding: "0.55rem 0.85rem", 
                                borderRadius: "6px", 
                                borderLeft: "4px solid #1e40af", 
                                borderTop: "1px solid #bfdbfe",
                                borderRight: "1px solid #bfdbfe",
                                borderBottom: "1px solid #bfdbfe",
                                fontStyle: "normal", 
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.03em",
                                lineHeight: "1.45",
                                boxShadow: "0 1px 3px rgba(30, 64, 175, 0.08)"
                              }}>
                                {String(entry.remarks).toUpperCase()}
                              </div>
                            )}

                            {entry.podUrl && (
                              <div style={{ marginTop: "0.5rem" }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPodUrl(entry.podUrl);
                                    setShowPodModal(true);
                                  }}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    padding: "0.3rem 0.7rem",
                                    backgroundColor: "#ecfdf5",
                                    color: "#059669",
                                    border: "1px solid #a7f3d0",
                                    borderRadius: "6px",
                                    fontWeight: "700",
                                    fontSize: "0.78rem",
                                    cursor: "pointer"
                                  }}
                                >
                                  <Eye size={13} /> View Attached POD
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: UPDATE STATUS FORM */}
        {(hasPermission('update_tracking') || isAdmin) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%" }}>
          
          {success && (
            <div className="glass-panel" style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
              <CheckCircle size={24} color="#16a34a" />
              <h5 style={{ color: "#16a34a", margin: 0, fontWeight: "600", fontSize: "1rem" }}>
                Status Updated Successfully!
              </h5>
            </div>
          )}

          <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: "0", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            
            <div className="tracking-panel-content" style={{ background: "rgba(249, 250, 251, 0.5)", borderBottom: "1px solid rgba(229, 231, 235, 0.5)" }}>
              <h4 style={{ fontSize: "1.2rem", fontWeight: "600", color: "#374151", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <PlusCircle size={20} color="#6366f1" /> Add Status Update
              </h4>
            </div>

            {/* Status Check for Form Locking and Forward Progression */}
            {(() => {
              const currentFormAwb = String(formData.awb || '').trim().toLowerCase();
              const matchedFormBooking = selectedFormBooking || (currentFormAwb ? bookingsList.find(b => {
                const bAwb = String(b.awb || b.consignment || b.lrNo || b.lrNumber || (b.id ? b.id.slice(-6) : '')).trim().toLowerCase();
                return bAwb && bAwb === currentFormAwb;
              }) : null);

              const matchedFormUpdates = currentFormAwb ? allUpdates.filter(u => String(u.awb || '').trim().toLowerCase() === currentFormAwb) : [];
              const latestAwbCheckpoint = matchedFormUpdates[0];

              const rawFormStatus = String(latestAwbCheckpoint?.status || matchedFormBooking?.status || matchedFormBooking?.transitStatus || matchedFormBooking?.delivery_status || '').toLowerCase();
              const isFormDelivered = rawFormStatus.includes("deliver");
              const isFormOutForDelivery = !isFormDelivered && (rawFormStatus.includes("out for delivery") || rawFormStatus.includes("out_for_delivery"));

              return (
                <>
                  <div style={{ padding: "1.5rem 2rem", flex: 1, background: "white", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                    
                    {/* Delivered Lock Alert Banner */}
                    {isFormDelivered && (
                      <div style={{
                        padding: "0.85rem 1.1rem",
                        background: "#fef2f2",
                        border: "1.5px solid #fecaca",
                        borderRadius: "8px",
                        color: "#991b1b",
                        fontSize: "0.86rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.65rem",
                        boxShadow: "0 2px 4px rgba(220, 38, 38, 0.06)"
                      }}>
                        <Lock size={20} color="#dc2626" style={{ flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.3px", color: "#b91c1c" }}>
                            Shipment Delivered — Updates Locked
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#7f1d1d", marginTop: "2px", fontWeight: 500 }}>
                            This shipment is marked as Delivered. All further status updates are locked. To make updates, delete the Delivered tracking entry from the table below.
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="form-group" style={{ marginBottom: 0, position: "relative" }}>
                      <label htmlFor="statusUpdateAwb" className="form-label" style={{ fontWeight: "600", color: "#374151" }}>
                        AWB / LR No.<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
                      </label>
                      <input 
                        id="statusUpdateAwb"
                        type="text" 
                        className="form-control" 
                        name="awb" 
                        placeholder="e.g. AWB123456789 or LR987654" 
                        value={formData.awb} 
                        onChange={(e) => {
                          handleChange(e);
                          setSelectedFormBooking(null);
                        }}
                        onFocus={() => setShowFormDropdown(true)}
                        onBlur={() => setTimeout(() => setShowFormDropdown(false), 200)}
                        required 
                        autoComplete="off"
                        style={{ background: "#f8fafc", border: "1px solid #cbd5e1", width: "100%" }}
                      />
                      {showFormDropdown && formData.awb.trim().length > 0 && formFilteredLRs.length > 0 && (
                        <AutocompleteDropdown 
                          filteredList={formFilteredLRs} 
                          onSelect={(awb, booking) => { 
                            const loc = String(booking.currentLocation || booking.origin || "").trim().toUpperCase();
                            setFormData(prev => ({ 
                              ...prev, 
                              awb,
                              location: loc,
                              status: prev.status || "In Transit"
                            })); 
                            setSelectedFormBooking(booking);
                            setShowFormDropdown(false); 
                          }} 
                        />
                      )}

                      {/* MINI LR CONTEXT CARD */}
                      {selectedFormBooking && (
                        <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", fontSize: "0.85rem", color: "#0369a1" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                            <span style={{ fontWeight: 600 }}>Date:</span>
                            <span>{formatCleanDate(selectedFormBooking.dispatch_date || selectedFormBooking.date || selectedFormBooking.createdAt)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                            <span style={{ fontWeight: 600 }}>Route:</span>
                            <span>{selectedFormBooking.origin || "-"} &rarr; {selectedFormBooking.destination || "-"}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                            <span style={{ fontWeight: 600 }}>Client:</span>
                            <span style={{ textAlign: "right" }}>{selectedFormBooking.client || selectedFormBooking.clientName || "-"}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                            <span style={{ fontWeight: 600 }}>Consignor:</span>
                            <span style={{ textAlign: "right" }}>{selectedFormBooking.consignor || "-"}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontWeight: 600 }}>Consignee:</span>
                            <span style={{ textAlign: "right" }}>{selectedFormBooking.consignee || "-"}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="statusUpdateStatus" className="form-label" style={{ fontWeight: "600", color: "#374151" }}>
                        Status<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
                      </label>
                      <select 
                        id="statusUpdateStatus"
                        className="form-control" 
                        name="status" 
                        value={formData.status} 
                        onChange={handleChange} 
                        required
                        disabled={isFormDelivered}
                        style={{ cursor: isFormDelivered ? "not-allowed" : "pointer", border: "1px solid #cbd5e1", fontWeight: formData.status ? "600" : "normal", color: formData.status ? getStatusColor(formData.status) : "inherit", background: isFormDelivered ? "#f8fafc" : "#ffffff" }}
                      >
                        <option value="" style={{ color: "#000" }}>-- Please select the Status --</option>
                        <option value="In Transit" disabled={isFormOutForDelivery} style={{ color: isFormOutForDelivery ? "#94a3b8" : "#000" }}>
                          In Transit {isFormOutForDelivery ? "(Locked - Out for Delivery)" : ""}
                        </option>
                        <option value="Out for Delivery" style={{ color: "#000" }}>Out for Delivery</option>
                        <option value="Delivered" style={{ color: "#000" }}>Delivered</option>
                        <option value="Delayed" style={{ color: "#000" }}>Delayed</option>
                        <option value="Returned" style={{ color: "#000" }}>Returned</option>
                      </select>
                      {isFormOutForDelivery && (
                        <div style={{ fontSize: "0.76rem", color: "#7c3aed", fontWeight: 700, marginTop: "0.3rem", display: "flex", alignItems: "center", gap: "4px" }}>
                          <span>🚚 Status is Out for Delivery. Progression is forward-only (cannot be reverted to In Transit or Booked).</span>
                        </div>
                      )}
                    </div>

                    <div className="grid-2-col" style={{ gap: "1rem" }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="statusUpdateDate" className="form-label" style={{ fontWeight: "600", color: "#374151" }}>
                          Date<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
                        </label>
                        <input 
                          id="statusUpdateDate"
                          type="date" min="1947-01-01" max="2200-12-31" 
                          className="form-control" 
                          name="date" 
                          value={formData.date} 
                          onChange={handleChange} 
                          disabled={isFormDelivered}
                          required 
                          style={{ border: "1px solid #cbd5e1", background: isFormDelivered ? "#f8fafc" : "#ffffff", cursor: isFormDelivered ? "not-allowed" : "text" }}
                        />
                      </div>
                      
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="statusUpdateLocation" className="form-label" style={{ fontWeight: "600", color: "#374151" }}>
                          Current Location<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
                        </label>
                        <TrackingLocationInput
                          id="statusUpdateLocation"
                          name="location"
                          value={formData.location}
                          onChange={(val) => setFormData(prev => ({ ...prev, location: val }))}
                          booking={selectedFormBooking}
                          disabled={isFormDelivered}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="statusUpdateRemarks" className="form-label" style={{ fontWeight: "600", color: "#374151" }}>
                        Special Remarks
                      </label>
                      <textarea 
                        id="statusUpdateRemarks"
                        className="form-control" 
                        name="remarks" 
                        placeholder="Enter your remarks" 
                        value={formData.remarks} 
                        onChange={handleChange} 
                        disabled={isFormDelivered}
                        rows="3"
                        style={{ border: "1px solid #cbd5e1", resize: "vertical", minHeight: "80px", background: isFormDelivered ? "#f8fafc" : "#ffffff", cursor: isFormDelivered ? "not-allowed" : "text" }}
                      />
                    </div>

                  </div>

                  <div style={{ padding: "1.5rem 2rem", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting || isFormDelivered}
                      style={{ 
                        padding: "0.6rem 2.5rem", 
                        fontSize: "1.05rem", 
                        fontWeight: "700",
                        letterSpacing: "0.5px",
                        borderRadius: "8px",
                        background: isFormDelivered ? "#94a3b8" : undefined,
                        cursor: isFormDelivered ? "not-allowed" : "pointer",
                        boxShadow: isFormDelivered ? "none" : "0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -1px rgba(59, 130, 246, 0.06)",
                        transition: "all 0.2s"
                      }}
                    >
                      {isFormDelivered ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Lock size={16} /> Locked (Delivered)</span>
                      ) : isSubmitting ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Loader2 size={18} className="spinner" /> Saving...</span>
                      ) : (
                        editingTrackingId ? "Update Status" : "Post Update"
                      )}
                    </button>
                  </div>
                </>
              );
            })()}
          </form>

          {/* RECENT UPDATES FOR SELECTED AWB */}
          {formData.awb.trim() !== "" && (
            <div style={{ marginTop: "1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem" }}>
              <h5 style={{ fontSize: "0.95rem", fontWeight: "600", color: "#475569", margin: "0 0 0.75rem 0", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Clock size={16} /> Recent Updates for {formData.awb}
              </h5>
              
              {(() => {
                const recent = displayUpdates
                  .filter(u => String(u.awb).toLowerCase() === formData.awb.trim().toLowerCase())
                  .sort((a,b) => {
                    const dateA = parseDateSecurely(a.date || a.updatedAt);
                    const dateB = parseDateSecurely(b.date || b.updatedAt);
                    return (dateB ? dateB.getTime() : 0) - (dateA ? dateA.getTime() : 0);
                  });
                
                if (recent.length === 0) {
                  return <div style={{ fontSize: "0.85rem", color: "#9ca3af", fontStyle: "italic" }}>No tracking history found.</div>;
                }
                
                const isDelivered = recent.some(t => t.status === "Delivered");
                const _canModify = isAdmin || !isDelivered;
                
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "200px", overflowY: "auto", paddingRight: "5px" }}>
                    {recent.map((entry, idx) => (
                      <div key={entry.id || idx} style={{ background: "white", padding: "0.75rem", borderRadius: "6px", border: "1px solid #f1f5f9", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", opacity: entry.isOfflinePending ? 0.7 : 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
                          <span style={{ color: getStatusColor(entry.status), fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "4px" }}>
                            {getStatusIcon(entry.status)} {entry.status}
                            {entry.isOfflinePending && <Clock size={12} color="#f59e0b" title="Pending Sync" />}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                              {new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#334155", fontWeight: 500, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <MapPin size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} />
                            {entry.location}
                          </div>
                          {isAdmin && (
                            <span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "8px", fontSize: "0.75rem", color: "#475569" }}>
                              By: {entry.enteredBy || "Admin"}
                            </span>
                          )}
                        </div>
                        {entry.remarks && (
                          <div style={{ 
                            marginTop: "0.4rem", 
                            fontSize: "0.82rem", 
                            color: "#1e3a8a", 
                            background: "#eff6ff", 
                            padding: "0.45rem 0.75rem", 
                            borderRadius: "6px", 
                            borderLeft: "4px solid #1e40af", 
                            borderTop: "1px solid #bfdbfe",
                            borderRight: "1px solid #bfdbfe",
                            borderBottom: "1px solid #bfdbfe",
                            fontStyle: "normal",
                            fontWeight: 700, 
                            textTransform: "uppercase", 
                            letterSpacing: "0.03em",
                            lineHeight: "1.4" 
                          }}>
                            {String(entry.remarks).toUpperCase()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Tracking Updates Table */}
      {(isAdmin || hasPermission('update_tracking')) && (
        <div className="glass-panel" style={{ marginTop: "2rem", padding: "1.5rem" }}>
          <h4 style={{ fontSize: "1.2rem", fontWeight: "600", color: "#1e293b", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={20} color="#f59e0b" />
            {isAdmin ? "All System Tracking Updates (Admin Only)" : "Your Tracking Updates"}
          </h4>
          {(() => {
            const tableHeaders = isAdmin
              ? [
                  { label: "AWB / LR No", minWidth: "140px" },
                  { label: "Date", minWidth: "110px" },
                  { label: "Status", minWidth: "130px" },
                  { label: "Location", minWidth: "130px" },
                  { label: "Entered By", minWidth: "130px" },
                  { label: "Remarks", minWidth: "280px" },
                  { label: "Actions", minWidth: "100px", align: "center" }
                ]
              : [
                  { label: "AWB / LR No", minWidth: "140px" },
                  { label: "Date", minWidth: "110px" },
                  { label: "Status", minWidth: "130px" },
                  { label: "Location", minWidth: "130px" },
                  { label: "Remarks", minWidth: "280px" },
                  { label: "Actions", minWidth: "100px", align: "center" }
                ];

            // Only show user manual updates; POD-based auto deliveries are handled dynamically
            const displayUpdates = (allUpdates || []).filter(u => {
              const isAutoPod = u.enteredBy?.includes("Auto POD") || String(u.remarks || '').startsWith("Proof of Delivery (POD) uploaded");
              return !isAutoPod;
            });

            return (
              <Table 
                headers={tableHeaders} 
                data={isAdmin ? displayUpdates : displayUpdates.filter(u => u.enteredById === user?.id || u.enteredBy === user?.name || u.enteredBy === user?.email)} 
                pagination={true}
                defaultEntries={25}
                minWidth={isAdmin ? "1080px" : "920px"}
                renderRow={(row, index) => {
                  const userRole = (user?.role || "").toLowerCase().replace(/[\s_-]+/g, '');
                  const isSuperAdmin = userRole === 'superadmin' || userRole === 'admin' || user?.email === 'admin@multimarg.com' || user?.permissions?.includes('all') || user?.permissions?.includes('update_tracking') || user?.permissions?.includes('operations');
                  const isOwner = row.enteredById === user?.id || row.enteredBy === user?.name || row.enteredBy === user?.email;
                  const canModify = (isSuperAdmin || isOwner) && !row.isOfflinePending;
                  const rowId = row.id || row._id;
                  
                  return (
                    <tr key={rowId || index} style={{ opacity: row.isOfflinePending ? 0.7 : 1 }}>
                      <td style={{ fontWeight: 600, color: "#4f46e5", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {row.awb}
                          {row.isOfflinePending && <Clock size={14} color="#f59e0b" title="Pending Sync (Offline)" />}
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{row.date ? new Date(row.date).toLocaleDateString('en-GB') : "N/A"}</td>
                      <td style={{ whiteSpace: "nowrap" }}><span style={{ color: getStatusColor(row.status), fontWeight: 600 }}>{row.status}</span></td>
                      <td style={{ whiteSpace: "nowrap" }}>{row.location || "-"}</td>
                      {isAdmin && (
                        <td style={{ whiteSpace: "nowrap" }}>
                          <span style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: 500 }}>
                            {row.enteredBy || "Admin"}
                          </span>
                        </td>
                      )}
                      <td style={{ minWidth: "260px", maxWidth: "380px", verticalAlign: "middle", padding: "10px 14px" }}>
                        <div style={{
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          overflowWrap: "break-word",
                          lineHeight: "1.45",
                          color: row.remarks ? "#1e3a8a" : "#64748b",
                          fontWeight: row.remarks ? 700 : 400,
                          textTransform: row.remarks ? "uppercase" : "none",
                          fontSize: "0.86rem"
                        }}>
                          {row.remarks ? String(row.remarks).toUpperCase() : "-"}
                        </div>
                      </td>
                      <td style={{ minWidth: "110px", width: "110px", textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap", padding: "10px 14px" }}>
                        {canModify ? (
                          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                            {String(row.status || '').toLowerCase().includes("deliver") ? (
                              <span 
                                style={{ 
                                  background: "#f1f5f9", 
                                  border: "1px solid #e2e8f0", 
                                  color: "#94a3b8", 
                                  padding: "6px 8px", 
                                  borderRadius: "6px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                                title="Delivered entry locked from editing. Delete to revert."
                              >
                                <Lock size={15} />
                              </span>
                            ) : (
                              <button 
                                type="button" 
                                onClick={() => handleEdit(row)} 
                                style={{ 
                                  background: "#eff6ff", 
                                  border: "1px solid #bfdbfe", 
                                  color: "#2563eb", 
                                  cursor: "pointer", 
                                  padding: "6px 8px", 
                                  borderRadius: "6px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "all 0.15s"
                                }} 
                                title="Edit Update"
                              >
                                <Edit size={16} />
                              </button>
                            )}
                            <button 
                              type="button" 
                              onClick={() => handleDelete(rowId)} 
                              style={{ 
                                background: "#fef2f2", 
                                border: "1px solid #fecaca", 
                                color: "#dc2626", 
                                cursor: "pointer", 
                                padding: "6px 8px", 
                                borderRadius: "6px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.15s"
                              }} 
                              title={String(row.status || '').toLowerCase().includes("deliver") ? "Delete Delivered entry (unlocks shipment for updates)" : "Delete Update"}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                }}
              />
            );
          })()}
        </div>
      )}

      <QuickAddModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
        type={modalType}
        initialName={modalInitialName}
      />

      {/* Proof of Delivery (POD) Viewer Modal */}
      {showPodModal && selectedPodUrl && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          padding: "1rem"
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            maxWidth: "700px",
            width: "100%",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)"
          }}>
            {/* Modal Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1.2rem 1.5rem",
              borderBottom: "1px solid #e2e8f0",
              background: "#f8fafc"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FileText size={20} color="#2563eb" />
                <h4 style={{ margin: 0, color: "#0f172a", fontWeight: 700, fontSize: "1.1rem" }}>
                  Proof of Delivery (POD)
                </h4>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <a
                  href={selectedPodUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  style={{
                    padding: "0.4rem 0.8rem",
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    border: "1px solid #bfdbfe"
                  }}
                >
                  <Download size={14} /> Open / Download
                </a>
                <button
                  type="button"
                  onClick={() => setShowPodModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748b",
                    padding: "0.3rem",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: "1.5rem",
              flex: 1,
              overflowY: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#0f172a"
            }}>
              {selectedPodUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={selectedPodUrl}
                  title="POD PDF Document"
                  style={{ width: "100%", height: "500px", border: "none", borderRadius: "8px", background: "#fff" }}
                />
              ) : (
                <img
                  src={selectedPodUrl}
                  alt="Proof of Delivery Document"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "65vh",
                    objectFit: "contain",
                    borderRadius: "8px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tracking;
