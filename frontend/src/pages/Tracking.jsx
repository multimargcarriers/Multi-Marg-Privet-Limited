import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { CheckCircle, Loader2, Search, Package, Truck, MapPin, XCircle, Clock, PlusCircle, AlertCircle, Trash2, Edit } from "lucide-react";
import CreatableDropdown from "../components/CreatableDropdown";
import QuickAddModal from "../components/QuickAddModal";
import Table from "../components/Table";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { useToast } from "../context/ToastContext";
import { useSync } from "../context/SyncContext";
import "../index.css"; 

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const Tracking = () => {
  const { user, hasPermission } = useContext(AuthContext);
  const _navigate = useNavigate();
  const { confirm } = useDialog();
  const { addToast } = useToast();
  const { syncQueue } = useSync();
  const isAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in' || user?.role === 'admin';

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
    return String(b.awb || b.consignment || b.awbNo || b.lrNumber || b.lrNo || b.lr_number || (b.id ? String(b.id).substring(0, 8).toUpperCase() : ""));
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

      const response = await axios.get(`${API}/tracking/${actualAwbToSearch}`);
      let data = response.data.success ? response.data.data : [];

      if (fullId && fullId !== actualAwbToSearch) {
          try {
              const res2 = await axios.get(`${API}/tracking/${fullId}`);
              if (res2.data.success) {
                  const merged = [...data, ...res2.data.data];
                  merged.sort((a, b) => new Date(b.date) - new Date(a.date));
                  const unique = [];
                  const ids = new Set();
                  for(let item of merged) {
                      if(!ids.has(item.id)) {
                          ids.add(item.id);
                          unique.push(item);
                      }
                  }
                  data = unique;
              }
          } catch(err) {
              console.error("Error fetching for full ID", err);
          }
      }

      setTrackingHistory(data);
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
      addToast("Failed to save tracking update.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Picked Up": return <Package size={20} />;
      case "In Transit": return <Truck size={20} />;
      case "Out for Delivery": return <MapPin size={20} />;
      case "Delivered": return <CheckCircle size={20} />;
      case "Returned": return <XCircle size={20} />;
      default: return <Clock size={20} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Picked Up": return "#3b82f6"; 
      case "In Transit": return "#f59e0b"; 
      case "Out for Delivery": return "#8b5cf6"; 
      case "Delivered": return "#10b981"; 
      case "Returned": return "#ef4444"; 
      default: return "#6b7280"; 
    }
  };

  // Autocomplete filtering logic
  const getFilteredBookings = (input) => {
    if (!input || !input.trim()) return [];
    const query = input.toLowerCase();
    return bookingsList.filter(b => {
      const lrStr = String(b.lrNo || b.biltyNo || b.id || "").toLowerCase();
      const clientStr = String(b.client || b.clientName || "").toLowerCase();
      const originStr = String(b.origin || "").toLowerCase();
      const destStr = String(b.destination || "").toLowerCase();
      return lrStr.includes(query) || clientStr.includes(query) || originStr.includes(query) || destStr.includes(query);
    }).slice(0, 10);
  };

  const searchFilteredLRs = getFilteredBookings(searchAwb);
  const formFilteredLRs = getFilteredBookings(formData.awb);


  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Tracking Update",
      message: "Are you sure you want to delete this tracking update?",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;

    try {
      await axios.delete(`${API}/tracking/${id}`);
      setTrackingHistory(trackingHistory.filter(t => t.id !== id));
      setAllUpdates(allUpdates.filter(t => t.id !== id));
      addToast("Tracking update deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting tracking", error);
      addToast("Failed to delete tracking update.", "error");
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
    setEditingTrackingId(entry.id);
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 350px), 1fr))", gap: "2rem", alignItems: "start" }}>
        
        {/* LEFT COLUMN: TRACKING VIEWER */}
        <div className="glass-panel" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column", height: "100%", minHeight: "500px" }}>
          
          <div style={{ padding: "1.5rem", background: "rgba(249, 250, 251, 0.5)", borderBottom: "1px solid rgba(229, 231, 235, 0.5)" }}>
            <h4 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#374151", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Search size={18} color="#6366f1" /> Track Shipment
            </h4>
                <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", position: "relative" }}>
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
                  padding: "0 1.2rem", 
                  borderRadius: "8px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  cursor: "pointer",
                  transition: "transform 0.1s ease, box-shadow 0.2s ease",
                  boxShadow: "0 4px 6px rgba(99, 102, 241, 0.25)"
                }}
                disabled={isSearching || !searchAwb.trim()}
              >
                {isSearching ? <Loader2 size={18} className="spinner" /> : "Track"}
              </button>
            </form>
          </div>

          <div style={{ padding: "1.5rem", flex: 1, background: "#ffffff", overflowY: "auto" }}>
            
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
                
                {/* SHIPMENT DETAILS CARD (Auto-populated from LR) */}
                {selectedSearchBooking && (
                  <div style={{
                    background: "linear-gradient(to right, #f8fafc, #f1f5f9)",
                    border: "1px solid #cbd5e1",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    marginBottom: "2rem",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                  }}>
                    <h5 style={{ margin: "0 0 1rem 0", color: "#334155", fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Package size={18} color="#0284c7" /> Shipment Overview
                    </h5>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.9rem" }}>
                      <div>
                        <div style={{ color: "#64748b", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.2rem" }}>Booking Date</div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                          {selectedSearchBooking.date || selectedSearchBooking.dispatch_date 
                            ? new Date(selectedSearchBooking.date || selectedSearchBooking.dispatch_date).toLocaleDateString('en-IN') 
                            : "-"}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#64748b", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.2rem" }}>Route</div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{selectedSearchBooking.origin || "-"} &rarr; {selectedSearchBooking.destination || "-"}</div>
                      </div>
                      <div>
                        <div style={{ color: "#64748b", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.2rem" }}>Client</div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{selectedSearchBooking.client || selectedSearchBooking.clientName || "-"}</div>
                      </div>
                      <div>
                        <div style={{ color: "#64748b", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.2rem" }}>Consignor</div>
                        <div style={{ fontWeight: 600, color: "#334155" }}>{selectedSearchBooking.consignor || "-"}</div>
                      </div>
                      <div>
                        <div style={{ color: "#64748b", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.2rem" }}>Consignee</div>
                        <div style={{ fontWeight: 600, color: "#334155" }}>{selectedSearchBooking.consignee || "-"}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ position: "relative", paddingLeft: "1.5rem" }}>
                  {/* Vertical Line */}
                  <div style={{ 
                    position: "absolute", 
                    left: "26px", 
                    top: "10px", 
                    bottom: "10px", 
                    width: "2px", 
                    background: "#e5e7eb", 
                    zIndex: 0 
                  }}></div>

                {trackingHistory.map((entry, index) => {
                  const isLatest = index === 0; 
                  const color = getStatusColor(entry.status);
                  const isDelivered = trackingHistory.some(t => t.status === "Delivered");
                  const _canModify = isAdmin || !isDelivered;

                  return (
                    <div key={entry.id} style={{ position: "relative", zIndex: 1, marginBottom: index === trackingHistory.length - 1 ? "0" : "2.5rem", display: "flex", gap: "1.5rem" }}>
                      
                      <div style={{ 
                        width: "44px", 
                        height: "44px", 
                        borderRadius: "50%", 
                        background: "white", 
                        border: `2px solid ${color}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: color,
                        flexShrink: 0,
                        marginLeft: "-11px",
                        boxShadow: isLatest ? `0 0 0 4px ${color}20` : "none"
                      }}>
                        {getStatusIcon(entry.status)}
                      </div>

                      <div style={{ flex: 1, padding: "1rem 1.2rem", background: isLatest ? "#f8fafc" : "#ffffff", border: isLatest ? "1px solid #e2e8f0" : "1px solid transparent", borderRadius: "12px", boxShadow: isLatest ? "0 4px 6px rgba(0,0,0,0.02)" : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
                          <span style={{ fontWeight: "700", color: color, fontSize: "1.05rem" }}>{entry.status}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <span style={{ fontSize: "0.85rem", color: "#6b7280", background: "#f3f4f6", padding: "0.2rem 0.6rem", borderRadius: "20px", fontWeight: "500", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                              <Clock size={12} />
                              {entry.date ? new Date(entry.date).toLocaleDateString('en-GB') : "N/A"}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", color: "#4b5563", fontSize: "0.95rem" }}>
                          <MapPin size={15} color="#9ca3af" />
                          <span style={{ fontWeight: "500" }}>{entry.location || "Location not provided"}</span>
                          {isAdmin && (
                            <span style={{ marginLeft: "auto", background: "#f1f5f9", padding: "2px 8px", borderRadius: "12px", fontSize: "0.8rem", color: "#475569" }}>
                              By: {entry.enteredBy || "Admin"}
                            </span>
                          )}
                        </div>
                        {entry.remarks && (
                          <div style={{ fontSize: "0.9rem", color: "#6b7280", background: "#f9fafb", padding: "0.75rem", borderRadius: "8px", borderLeft: "3px solid #d1d5db", fontStyle: "italic" }}>
                            "{entry.remarks}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
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
            
            <div style={{ padding: "1.5rem", background: "rgba(249, 250, 251, 0.5)", borderBottom: "1px solid rgba(229, 231, 235, 0.5)" }}>
              <h4 style={{ fontSize: "1.2rem", fontWeight: "600", color: "#374151", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <PlusCircle size={20} color="#6366f1" /> Add Status Update
              </h4>
              <p style={{ margin: "0.25rem 0 0 0", color: "#6b7280", fontSize: "0.85rem" }}>
                Fill out the details below to log a new checkpoint.
              </p>
            </div>

            <div style={{ padding: "1.5rem 2rem", flex: 1, background: "white", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              
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
                      setFormData(prev => ({ 
                        ...prev, 
                        awb,
                        // Auto-fill location with origin if empty
                        location: prev.location || booking.origin || ""
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
                      <span>{selectedFormBooking.date || selectedFormBooking.dispatch_date ? new Date(selectedFormBooking.date || selectedFormBooking.dispatch_date).toLocaleDateString('en-IN') : "-"}</span>
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
                  style={{ cursor: "pointer", border: "1px solid #cbd5e1", fontWeight: formData.status ? "600" : "normal", color: formData.status ? getStatusColor(formData.status) : "inherit" }}
                >
                  <option value="" style={{ color: "#000" }}>-- Please select the Status --</option>
                  <option value="Picked Up" style={{ color: "#000" }}>Picked Up</option>
                  <option value="In Transit" style={{ color: "#000" }}>In Transit</option>
                  <option value="Out for Delivery" style={{ color: "#000" }}>Out for Delivery</option>
                  <option value="Delivered" style={{ color: "#000" }}>Delivered</option>
                  <option value="Returned" style={{ color: "#000" }}>Returned</option>
                </select>
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
                    required 
                    style={{ border: "1px solid #cbd5e1" }}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="statusUpdateLocation" className="form-label" style={{ fontWeight: "600", color: "#374151" }}>
                    Location<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
                  </label>
                  <div style={{ position: "relative", zIndex: 10 }}>
                    <CreatableDropdown 
                      id="statusUpdateLocation"
                      options={locations} 
                      value={formData.location} 
                      onChange={(loc) => setFormData({ ...formData, location: loc })} 
                      onCreate={(name) => handleCreateNew("city", name)}
                      placeholder="-- Select City --" 
                    />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="statusUpdateRemarks" className="form-label" style={{ fontWeight: "600", color: "#374151" }}>
                  Remarks<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
                </label>
                <textarea 
                  id="statusUpdateRemarks"
                  className="form-control" 
                  name="remarks" 
                  placeholder="Enter detailed remarks about this status update..." 
                  value={formData.remarks} 
                  onChange={handleChange} 
                  required 
                  rows="3"
                  style={{ border: "1px solid #cbd5e1", resize: "vertical", minHeight: "80px" }}
                />
              </div>

            </div>

            <div style={{ padding: "1.5rem 2rem", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ 
                  padding: "0.6rem 2.5rem", 
                  fontSize: "1.05rem", 
                  fontWeight: "700",
                  letterSpacing: "0.5px",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -1px rgba(59, 130, 246, 0.06)",
                  transition: "all 0.2s"
                }}
              >
                {isSubmitting ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Loader2 size={18} className="spinner" /> Saving...</span>
                ) : (
                  "Post Update"
                )}
              </button>
            </div>
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
                  .sort((a,b) => new Date(b.date) - new Date(a.date));
                
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
                          <div style={{ marginTop: "0.3rem", fontSize: "0.8rem", color: "#64748b", fontStyle: "italic" }}>
                            "{entry.remarks}"
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
          <Table 
            headers={isAdmin ? ["AWB / LR No", "Date", "Status", "Location", "Entered By", "Remarks", "Actions"] : ["AWB / LR No", "Date", "Status", "Location", "Remarks", "Actions"]} 
            data={isAdmin ? displayUpdates : displayUpdates.filter(u => u.enteredById === user?.id || u.enteredBy === user?.name || u.enteredBy === user?.email)} 
            pagination={true}
            defaultEntries={25}
            renderRow={(row, index) => {
              const isDelivered = displayUpdates.some(t => t.awb === row.awb && t.status === "Delivered");
              const canModify = (isAdmin || !isDelivered) && !row.isOfflinePending;
              
              return (
                <tr key={row.id || index} style={{ opacity: row.isOfflinePending ? 0.7 : 1 }}>
                  <td style={{ fontWeight: 600, color: "#4f46e5" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {row.awb}
                      {row.isOfflinePending && <Clock size={14} color="#f59e0b" title="Pending Sync (Offline)" />}
                    </div>
                  </td>
                  <td>{row.date ? new Date(row.date).toLocaleDateString('en-GB') : "N/A"}</td>
                  <td><span style={{ color: getStatusColor(row.status), fontWeight: 600 }}>{row.status}</span></td>
                  <td>{row.location}</td>
                  {isAdmin && (
                    <td>
                      <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "12px", fontSize: "0.85rem", color: "#475569" }}>
                        {row.enteredBy || "Admin"}
                      </span>
                    </td>
                  )}
                  <td>{row.remarks}</td>
                  <td>
                    {canModify && (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button type="button" onClick={() => handleEdit(row)} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", padding: "4px" }} title="Edit Update">
                          <Edit size={18} />
                        </button>
                        <button type="button" onClick={() => handleDelete(row.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }} title="Delete Update">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            }}
          />
        </div>
      )}

      <QuickAddModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
        type={modalType}
        initialName={modalInitialName}
      />
    </div>
  );
};

export default Tracking;
