import React, { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Table from "../components/Table";
import { Plus, CheckCircle, Loader2, Download, Clock, Truck, Train, Plane, Edit, Check, X, Search, Filter, Layers, RefreshCw } from "lucide-react";

import { TablePageSkeleton } from '../components/SkeletonLoader';
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import CreatableDropdown from "../components/CreatableDropdown";

import { formatAllCaps, formatDate } from "../utils/formatters";
import { AwbBadge } from "../components/CopyButton";
import { exportVendorShipMis } from "../utils/excelExport";
import ExportModal from "../components/ExportModal";
import { useNotification } from "../context/NotificationContext";
import { useToast } from "../context/ToastContext";
import { useSocketSync } from "../hooks/useSocketSync";
import appDB from "../utils/appDB";
import { BadgeContext } from "../context/BadgeContext";
import { useSync } from "../context/SyncContext";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const Trips = () => {
  const _navigate = useNavigate();
  const { user, hasPermission } = useContext(AuthContext);
  const { confirm } = useDialog();
  const { clearBadge } = useContext(BadgeContext);
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimarg.com';
  const isAdminOrSuperAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.email === 'admin@multimarg.com' || (user?.role === 'Employee' && hasPermission('trips'));

  const hasAccess = (perm) => hasPermission(perm);

  const [trips, setTrips] = useState([]);
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [editId, setEditId] = useState(null);
  const [modeFilter, setModeFilter] = useState("ALL");
  const [selectedTripIds, setSelectedTripIds] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedOrigin, setSelectedOrigin] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("");
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const { refreshNotifications } = useNotification();
  const { addToast } = useToast();
  const { syncQueue } = useSync();

  const initialFormState = {
    tripNo: "", vehicleNo: "", mode: "", type: "", date: "", awbNo: "", cdNo: "",
    vendor: "", origin: "", destination: "",
    materialDetails: [{ clientName: "", lrNo: "", box: "", weight: "", chWeight: "", origin: "", destination: "" }],
    specialInstruction: ""
  };
  const [form, setForm] = useState(() => {
    try {
      const saved = appDB.memGet('manifestFormDraft');
      if (saved) {
        const isNewFormat = saved.hasOwnProperty('data') && saved.hasOwnProperty('timestamp');
        const draftData = isNewFormat ? saved.data : saved;
        const draftTimestamp = isNewFormat ? saved.timestamp : Date.now();
        const age = Date.now() - draftTimestamp;
        if (age > 5 * 60 * 1000) {
          appDB.remove('manifestFormDraft');
        } else {
          return draftData;
        }
      }
    } catch (err) {
      console.error("Error loading draft", err);
    }
    return initialFormState;
  });

  const handleCreateNew = async (type, field, name, index = null) => {
    try {
      const endpoint = `${API}/${type === 'city' ? 'cities' : type + 's'}`;
      let payload = { isIncomplete: true };
      if (type === 'city') payload.city = name;
      else payload.name = name;

      const res = await axios.post(endpoint, payload);
      const data = res.data.data;

      if (type === 'client') setClients([...clients, data]);
      else if (type === 'city') setCities([...cities, data]);
      else if (type === 'vendor') setVendors([...vendors, data]);

      const entityName = data.name || data.client || data.city;
      if (index !== null) {
        updateMaterialRow(index, field, entityName);
      } else {
        setForm({ ...form, [field]: entityName });
      }

      addToast(`${type.charAt(0).toUpperCase() + type.slice(1)} details are incomplete. Please fill in the ${type} details.`, "warning");
      refreshNotifications();
    } catch (err) {
      console.error(err);
      addToast(`Failed to create ${type}`, "error");
    }
  };

  useEffect(() => {
    if (!editId) {
      appDB.set('manifestFormDraft', { data: form, timestamp: Date.now() });
    }
  }, [form, editId]);

  useEffect(() => {
    fetchData();
    clearBadge("trips");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      if (trips.length === 0) setLoading(true);
      const [clientsRes, vendorsRes, citiesRes, tripsRes] = await Promise.all([
        axios.get(`${API}/clients`).catch(() => ({ data: { success: false } })),
        axios.get(`${API}/vendors`).catch(() => ({ data: { success: false } })),
        axios.get(`${API}/cities`).catch(() => ({ data: { success: false } })),
        axios.get(`${API}/trips`).catch(() => ({ data: { success: false } })),
      ]);
      
      if (tripsRes.data.success) setTrips(tripsRes.data.data || []);
      if (clientsRes.data.success) setClients(clientsRes.data.data || []);
      if (vendorsRes.data.success) setVendors(vendorsRes.data.data || []);
      if (citiesRes.data.success) setCities(citiesRes.data.data || []);
    } catch (err) {
      console.error("Fetch data error", err);
    }
    finally { setLoading(false); }
  };

  useSocketSync("trips", fetchData);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);

    // Total amount no longer calculated here
    const tripData = { ...form, totalAmount: 0, approvalStatus: 'Pending' };

    try {
      let res;
      if (editId) {
        res = await axios.put(`${API}/trips/${editId}`, tripData);
      } else {
        res = await axios.post(`${API}/trips`, tripData);
      }
      
      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setShowForm(false);
          setEditId(null);
          setForm(initialFormState);
          appDB.remove('manifestFormDraft');
        }, 2000);
      }
    } catch (err) {
      console.error("Save trip error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      ...initialFormState,
      ...item,
      materialDetails: item.materialDetails?.length ? item.materialDetails : initialFormState.materialDetails
    });
    setEditId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({ title: "Delete Trip", message: "Are you sure you want to delete this trip?", confirmText: "Delete", cancelText: "Cancel" });
    if (!isConfirmed) return;
    
    try {
      await axios.delete(`${API}/trips/${id}`);
    } catch (err) {
      console.error("Delete trip error", err);
    }
  };

  const matchesMode = (tripMode, targetFilter) => {
    if (targetFilter === 'ALL') return true;
    const m = String(tripMode || '').toUpperCase();
    if (targetFilter === 'ROAD') return m === 'ROAD';
    if (targetFilter === 'TRAIN') return m === 'TRAIN' || m === 'RAIL';
    if (targetFilter === 'AIR') return m === 'AIR' || m === 'FLIGHT';
    return false;
  };

  const handleOpenExportModal = () => {
    setShowExportModal(true);
  };

  const handleExecuteExport = async ({ format }) => {
    try {
      setIsExporting(true);
      let tripsToExport = [];
      if (selectedTripIds.length > 0) {
        tripsToExport = displayTrips.filter(t => selectedTripIds.includes(t.id));
      } else {
        tripsToExport = activeFilteredTrips;
      }

      if (tripsToExport.length === 0) {
        addToast("No trips found to export", "warning");
        setIsExporting(false);
        return;
      }

      const modeLabel = selectedTripIds.length > 0 ? `Selected (${tripsToExport.length})` : modeFilter;

      await exportVendorShipMis({
        trips: tripsToExport,
        modeFilter: modeLabel,
        dateRange: { startDate, endDate },
        format,
      });
      addToast(`Vendor Ship MIS ${format.toUpperCase()} downloaded successfully!`, "success");
      setShowExportModal(false);
    } catch (err) {
      addToast("Failed to export: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsExporting(false);
    }
  };

  const updateMaterialRow = (index, field, value) => {
    const updated = [...form.materialDetails];
    updated[index][field] = value;
    setForm({ ...form, materialDetails: updated });
  };

  const addMaterialRow = () => {
    setForm({ ...form, materialDetails: [...form.materialDetails, { clientName: "", lrNo: "", box: "", weight: "", chWeight: "", origin: "", destination: "" }] });
  };

  const removeMaterialRow = (index) => {
    setForm({ ...form, materialDetails: form.materialDetails.filter((_, i) => i !== index) });
  };

  const displayTrips = useMemo(() => {
    const pendingTrips = (syncQueue || [])
      .filter(req => req.method === 'post' && req.url.includes('/trips'))
      .map(req => ({
        ...req.data,
        id: req.tempId,
        isOfflinePending: true,
      }));
    return [...pendingTrips, ...trips];
  }, [trips, syncQueue]);

  const uniqueVendors = useMemo(() => {
    const s = new Set();
    displayTrips.forEach(t => { if (t.vendor) s.add(t.vendor); });
    return Array.from(s).sort();
  }, [displayTrips]);

  const uniqueClients = useMemo(() => {
    const s = new Set();
    displayTrips.forEach(t => {
      t.materialDetails?.forEach(m => { if (m.clientName) s.add(m.clientName); });
    });
    return Array.from(s).sort();
  }, [displayTrips]);

  const uniqueVehicles = useMemo(() => {
    const s = new Set();
    displayTrips.forEach(t => { if (t.vehicleNo) s.add(t.vehicleNo); });
    return Array.from(s).sort();
  }, [displayTrips]);

  const uniqueOrigins = useMemo(() => {
    const s = new Set();
    displayTrips.forEach(t => { if (t.origin) s.add(t.origin); });
    return Array.from(s).sort();
  }, [displayTrips]);

  const uniqueDestinations = useMemo(() => {
    const s = new Set();
    displayTrips.forEach(t => { if (t.destination) s.add(t.destination); });
    return Array.from(s).sort();
  }, [displayTrips]);

  const filteredTrips = useMemo(() => {
    return displayTrips.filter(t => {
      if (startDate || endDate) {
        const itemDate = new Date(t.date || t.createdAt);
        itemDate.setHours(0, 0, 0, 0);
        const start = startDate ? new Date(startDate) : new Date("1970-01-01");
        start.setHours(0, 0, 0, 0);
        const end = endDate ? new Date(endDate) : new Date("2100-01-01");
        end.setHours(23, 59, 59, 999);
        if (itemDate < start || itemDate > end) return false;
      }

      if (selectedVendor && t.vendor !== selectedVendor) return false;
      if (selectedClient && !t.materialDetails?.some(m => m.clientName === selectedClient)) return false;
      if (selectedVehicle && t.vehicleNo !== selectedVehicle) return false;
      if (selectedOrigin && t.origin !== selectedOrigin) return false;
      if (selectedDestination && t.destination !== selectedDestination) return false;
      if (selectedApprovalStatus && t.approvalStatus !== selectedApprovalStatus) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesMain = (t.tripNo || "").toLowerCase().includes(q) ||
          (t.vehicleNo || "").toLowerCase().includes(q) ||
          (t.mode || "").toLowerCase().includes(q) ||
          (t.type || "").toLowerCase().includes(q) ||
          (t.awbNo || "").toLowerCase().includes(q) ||
          (t.cdNo || "").toLowerCase().includes(q) ||
          (t.vendor || "").toLowerCase().includes(q) ||
          (t.origin || "").toLowerCase().includes(q) ||
          (t.destination || "").toLowerCase().includes(q) ||
          (t.approvalStatus || "").toLowerCase().includes(q);

        const matchesMaterials = t.materialDetails?.some(m =>
          (m.clientName || "").toLowerCase().includes(q) ||
          (m.lrNo || "").toLowerCase().includes(q) ||
          (m.origin || "").toLowerCase().includes(q) ||
          (m.destination || "").toLowerCase().includes(q)
        );

        if (!matchesMain && !matchesMaterials) return false;
      }

      return true;
    });
  }, [displayTrips, startDate, endDate, selectedVendor, selectedClient, selectedVehicle, selectedOrigin, selectedDestination, selectedApprovalStatus, searchQuery]);

  const activeFilteredTrips = useMemo(() => {
    return filteredTrips.filter(t => matchesMode(t.mode, modeFilter));
  }, [filteredTrips, modeFilter]);

  const handleToggleSelectTrip = (id) => {
    if (!id) return;
    setSelectedTripIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllVisibleSelected = useMemo(() => {
    return activeFilteredTrips.length > 0 && activeFilteredTrips.every(t => selectedTripIds.includes(t.id));
  }, [activeFilteredTrips, selectedTripIds]);

  const handleToggleSelectAll = () => {
    const visibleIds = activeFilteredTrips.map(t => t.id).filter(Boolean);
    if (isAllVisibleSelected) {
      setSelectedTripIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedTripIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };
  const handleClearSelection = () => {
    setSelectedTripIds([]);
  };

  const calculateTotalChWeight = (tripsList, modeList, currentMonthOnly = false) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return tripsList
      .filter(t => {
        if (!modeList.includes((t.mode || "").toLowerCase())) return false;
        if (currentMonthOnly) {
          if (!t.date) return false;
          const parts = String(t.date).split('-');
          if (parts.length >= 2) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            return y === currentYear && m === currentMonth;
          }
          const d = new Date(t.date);
          return d && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        }
        return true;
      })
      .reduce((total, t) => {
        const tripChWeight = (t.materialDetails || []).reduce((sum, mat) => sum + (parseFloat(mat.chWeight) || 0), 0);
        return total + tripChWeight;
      }, 0);
  };

  const tripsStats = useMemo(() => {
    return {
      totalAmount: filteredTrips.reduce((sum, t) => sum + (parseFloat(t.totalAmount) || 0), 0),
      totalTripsInMode: activeFilteredTrips.length,
      trainChWeight: calculateTotalChWeight(filteredTrips, ['train', 'rail']),
      flightChWeight: calculateTotalChWeight(filteredTrips, ['air', 'flight']),
      roadChWeight: calculateTotalChWeight(filteredTrips, ['road']),
      roadTripsCount: filteredTrips.filter(t => (t.mode || "").toLowerCase() === 'road').length,
      trainTripsCount: filteredTrips.filter(t => ['train', 'rail'].includes((t.mode || "").toLowerCase())).length,
      flightTripsCount: filteredTrips.filter(t => ['air', 'flight'].includes((t.mode || "").toLowerCase())).length,
      curMonthRoadChWeight: calculateTotalChWeight(filteredTrips, ['road'], true),
      curMonthTrainChWeight: calculateTotalChWeight(filteredTrips, ['train', 'rail'], true),
      curMonthFlightChWeight: calculateTotalChWeight(filteredTrips, ['air', 'flight'], true),
    };
  }, [filteredTrips, activeFilteredTrips]);

  if (loading) return <TablePageSkeleton />;

  const renderTripRow = (item, index) => {
    const isSelected = selectedTripIds.includes(item.id);
    return (
      <tr key={item.id || index} style={{ opacity: item.isOfflinePending ? 0.7 : 1, backgroundColor: isSelected ? "rgba(59, 130, 246, 0.08)" : undefined }}>
       <td style={{ width: "40px", textAlign: "center" }}>
         <input
           type="checkbox"
           checked={isSelected}
           onChange={() => handleToggleSelectTrip(item.id)}
           style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }}
         />
       </td>
       <td className="font-semibold">
         <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
           {item.isOfflinePending && <Clock size={14} color="#f59e0b" title="Pending Offline Sync" />}
           {index + 1}
         </div>
       </td>
       <td style={{ textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
         <span style={{
           padding: "2px 8px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 700,
           background: String(item.mode).toUpperCase() === 'ROAD' ? '#d1fae5' : String(item.mode).toUpperCase() === 'TRAIN' || String(item.mode).toUpperCase() === 'RAIL' ? '#fae8ff' : '#e0f2fe',
           color: String(item.mode).toUpperCase() === 'ROAD' ? '#065f46' : String(item.mode).toUpperCase() === 'TRAIN' || String(item.mode).toUpperCase() === 'RAIL' ? '#86198f' : '#0369a1',
         }}>
           {item.mode || "-"}
         </span>
       </td>
       <td style={{ whiteSpace: 'nowrap' }}>{item.date ? formatDate(item.date) : "-"}</td>
       <td style={{ textTransform: 'uppercase', whiteSpace: 'nowrap', fontWeight: 600 }}>{item.vehicleNo || "-"}</td>
       <td style={{ textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{item.type || "-"}</td>
       <td style={{ textTransform: 'uppercase', whiteSpace: 'nowrap' }}><AwbBadge awb={item.awbNo} /></td>
       <td style={{ textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{item.cdNo || "-"}</td>
       <td style={{ textTransform: 'uppercase', whiteSpace: 'nowrap', fontWeight: 600, color: "#1e3a8a" }}>{item.vendor || "-"}</td>
       <td style={{ textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{item.origin || "-"}</td>
       <td style={{ textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{item.destination || "-"}</td>
       <td style={{ padding: "6px" }}>
         {item.materialDetails && item.materialDetails.length > 0 ? (
            <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
              <table style={{ width: "100%", fontSize: "0.7rem", borderCollapse: "collapse", textAlign: "left" }}>
                <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: "6px 8px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>LR No</th>
                    <th style={{ padding: "6px 8px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>Client</th>
                    <th style={{ padding: "6px 8px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap", textAlign: "center" }}>Box</th>
                    <th style={{ padding: "6px 8px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap", textAlign: "center" }}>Wt.</th>
                    <th style={{ padding: "6px 8px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap", textAlign: "center" }}>Ch.Wt.</th>
                  </tr>
                </thead>
                <tbody>
                  {item.materialDetails.map((m, idx) => (
                    <tr key={idx} style={{ borderBottom: idx < item.materialDetails.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "6px 8px", fontWeight: "600", color: "#1e293b", whiteSpace: "nowrap" }}><AwbBadge awb={m.lrNo} /></td>
                      <td style={{ padding: "6px 8px", color: "#334155", whiteSpace: "nowrap" }} title={m.clientName}>{m.clientName || "-"}</td>
                      <td style={{ padding: "6px 8px", color: "#475569", textAlign: "center" }}>{m.box || "0"}</td>
                      <td style={{ padding: "6px 8px", color: "#475569", textAlign: "center" }}>{m.weight || "0"}</td>
                      <td style={{ padding: "6px 8px", color: "#475569", textAlign: "center", fontWeight: "600" }}>{m.chWeight || "0"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
         ) : "-"}
       </td>
       <td>
         <span style={{
             padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600",
             background: item.isOfflinePending ? '#fef3c7' : String(item.approvalStatus || 'Approved').toLowerCase() === 'approved' ? '#dcfce7' : String(item.approvalStatus).toLowerCase() === 'rejected' ? '#fee2e2' : String(item.approvalStatus).toLowerCase() === 'pending' ? '#fef9c3' : '#e0e7ff',
             color: item.isOfflinePending ? '#b45309' : String(item.approvalStatus || 'Approved').toLowerCase() === 'approved' ? '#166534' : String(item.approvalStatus).toLowerCase() === 'rejected' ? '#991b1b' : String(item.approvalStatus).toLowerCase() === 'pending' ? '#854d0e' : '#3730a3',
             display: "inline-flex", alignItems: "center", gap: "4px"
         }}>
           {item.isOfflinePending && <Clock size={12} />}
           {item.isOfflinePending ? 'Pending Sync' : (item.approvalStatus || 'Approved')}
         </span>
       </td>
       <td>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", minWidth: "100px" }}>
            <button disabled={item.isOfflinePending} onClick={() => handleEdit(item)} style={{ background: "rgba(245, 158, 11, 0.1)", border: "none", color: "#f59e0b", padding: "6px", borderRadius: "8px", cursor: item.isOfflinePending ? "not-allowed" : "pointer", opacity: item.isOfflinePending ? 0.5 : 1 }} title="Edit Trip"><Edit size={16} /></button>
            
            {isAdminOrSuperAdmin && !item.isOfflinePending && (
             <>
               {String(item.approvalStatus || 'Approved').toLowerCase() === 'approved' ? (
                 <select
                   value={item.approvalStatus || 'Approved'}
                   onChange={async (e) => {
                     const newStatus = e.target.value;
                     if (newStatus === (item.approvalStatus || 'Approved')) return;
                      try {
                        const res = await axios.put(`${API}/trips/${item.id}`, { approvalStatus: newStatus });
                        if(res.data.success) {
                           const newTrips = [...trips];
                           const tripIndex = newTrips.findIndex(t => t.id === item.id);
                           if (tripIndex !== -1) newTrips[tripIndex].approvalStatus = newStatus;
                           setTrips(newTrips);
                           addToast(`Status changed to ${newStatus}`, "success");
                        }
                      } catch (err) {
                        console.error(err);
                        addToast("Error updating status", "error");
                      }
                   }}
                   className="action-btn"
                   style={{ padding: "4px 8px", borderRadius: "4px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", cursor: "pointer", fontWeight: 600, outline: "none", fontSize: "0.75rem" }}
                 >
                   <option value="Approved">Approved</option>
                   <option value="Pending">Pending</option>
                   <option value="Rejected">Rejected</option>
                 </select>
               ) : (
                 <>
                    <button onClick={async () => {
                      try {
                        const res = await axios.put(`${API}/trips/${item.id}`, { approvalStatus: 'Approved' });
                        if(res.data.success) {
                           const newTrips = [...trips];
                           const tripIndex = newTrips.findIndex(t => t.id === item.id);
                           if (tripIndex !== -1) newTrips[tripIndex].approvalStatus = 'Approved';
                           setTrips(newTrips);
                           addToast("Trip Approved!", "success");
                        }
                      } catch (err) {
                        console.error(err);
                        addToast("Error approving trip", "error");
                      }
                    }} className="action-btn action-btn-success" style={{ background: "#10b981", color: "white", border: "none", borderRadius: "4px", fontSize: "0.7rem", padding: "4px 8px", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Check size={14} /> Approve
                    </button>
                    
                    {item.approvalStatus !== 'Rejected' && (
                      <button onClick={async () => {
                        try {
                          const res = await axios.put(`${API}/trips/${item.id}`, { approvalStatus: 'Rejected' });
                          if(res.data.success) {
                             const newTrips = [...trips];
                             const tripIndex = newTrips.findIndex(t => t.id === item.id);
                             if (tripIndex !== -1) newTrips[tripIndex].approvalStatus = 'Rejected';
                             setTrips(newTrips);
                             addToast("Trip Rejected", "success");
                          }
                        } catch (err) {
                          console.error(err);
                          addToast("Error rejecting trip", "error");
                        }
                      }} className="action-btn action-btn-danger" style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "4px", fontSize: "0.7rem", padding: "4px 8px", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                        <X size={14} /> Reject
                      </button>
                    )}
                    {item.approvalStatus !== 'Pending' && (
                      <button onClick={async () => {
                        try {
                          const res = await axios.put(`${API}/trips/${item.id}`, { approvalStatus: 'Pending' });
                          if(res.data.success) {
                             const newTrips = [...trips];
                             const tripIndex = newTrips.findIndex(t => t.id === item.id);
                             if (tripIndex !== -1) newTrips[tripIndex].approvalStatus = 'Pending';
                             setTrips(newTrips);
                             addToast("Trip marked Pending", "success");
                          }
                        } catch (err) {
                          console.error(err);
                          addToast("Error updating trip", "error");
                        }
                      }} className="action-btn action-btn-warning" style={{ background: "#f59e0b", color: "white", border: "none", borderRadius: "4px", fontSize: "0.7rem", padding: "4px 8px", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={14} /> Pending
                      </button>
                    )}
                 </>
               )}
             </>
            )}
            {isSuperAdmin && !item.isOfflinePending && (
              <button onClick={() => handleDelete(item.id)} style={{ background: "rgba(220, 38, 38, 0.1)", border: "none", color: "#dc2626", padding: "6px", borderRadius: "8px", cursor: "pointer" }} title="Delete Trip">Delete</button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div>
      {/* Batch Selection Sticky Banner */}
      {selectedTripIds.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)",
          color: "white",
          padding: "10px 18px",
          borderRadius: "10px",
          marginBottom: "1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 10px 25px -5px rgba(30, 58, 138, 0.3)",
          animation: "fadeIn 0.2s ease-in-out"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ background: "#3b82f6", color: "white", padding: "3px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700 }}>
              {selectedTripIds.length} SELECTED
            </span>
            <span style={{ fontSize: "0.9rem", color: "#e2e8f0" }}>
              Ready to export selected entries
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={handleClearSelection}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "white", borderRadius: "6px", padding: "6px 14px", fontSize: "0.82rem", cursor: "pointer", fontWeight: 600 }}
            >
              Clear Selection
            </button>
            <button
              onClick={handleOpenExportModal}
              style={{ background: "#10b981", border: "none", color: "white", borderRadius: "6px", padding: "6px 18px", fontSize: "0.82rem", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)" }}
            >
              <Download size={15} /> Export Selected ({selectedTripIds.length})
            </button>
          </div>
        </div>
      )}

      {/* ── Page Header Toolbar ── */}
      <div className="bookings-header-toolbar no-print">
        <div className="bookings-header-main-row">
          {/* Left: Page Title with Count & Refresh */}
          <div className="bookings-header-title-group">
            <h2 className="bookings-page-title">
              MANIFEST / TRIPS
            </h2>
            <span className="bookings-count-badge">
              {filteredTrips.length} {filteredTrips.length === 1 ? 'Trip' : 'Trips'}
            </span>
            <button 
              onClick={fetchData} 
              className="bookings-refresh-btn" 
              title="Refresh Trips"
            >
              <RefreshCw size={14} className={loading ? "spin-animation" : ""} />
            </button>
          </div>

          {/* Right: Primary Action Buttons (Export on Left & + New Manifest on Right) */}
          <div className="bookings-header-primary-actions">
            <button
              onClick={handleOpenExportModal}
              className="btn-export-bookings"
              title="Export Trips to Excel / CSV"
            >
              <Download size={15} />
              <span>Export</span>
            </button>

            {!showForm && hasAccess('trips') && (
              <button 
                className="btn-create-booking" 
                onClick={() => setShowForm(true)}
                title="Create New Manifest / Trip"
              >
                <Plus size={16} />
                <span>New Manifest</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {!showForm && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid #f59e0b" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "0.5rem" }}>VENDOR SHIP WEIGHT</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "#374151", display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
              <span><span style={{ color: "#f97316" }}>R:</span> {tripsStats.roadChWeight.toFixed(2)} KG</span>
              <span><span style={{ color: "#a21caf" }}>T:</span> {tripsStats.trainChWeight.toFixed(2)} KG</span>
              <span><span style={{ color: "#0ea5e9" }}>A:</span> {tripsStats.flightChWeight.toFixed(2)} KG</span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid #10b981" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: "600", marginBottom: "0.5rem" }}>
              Current ({new Date().toLocaleString('default', { month: 'long' })})
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "#374151", display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
              <span><span style={{ color: "#f97316" }}>R:</span> {tripsStats.curMonthRoadChWeight.toFixed(2)} KG</span>
              <span><span style={{ color: "#a21caf" }}>T:</span> {tripsStats.curMonthTrainChWeight.toFixed(2)} KG</span>
              <span><span style={{ color: "#0ea5e9" }}>A:</span> {tripsStats.curMonthFlightChWeight.toFixed(2)} KG</span>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="glass-panel no-print" style={{ padding: "1.5rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
          <CheckCircle size={32} color="#16a34a" />
          <div>
            <h5 style={{ color: "#16a34a", marginBottom: "0.25rem", margin: 0 }}>Manifest Created Successfully!</h5>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="glass-panel" style={{ padding: "2.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Mode<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <select className="form-control" value={form.mode || ""} onChange={e => setForm({ ...form, mode: e.target.value, ...(e.target.value !== 'AIR' ? { cdNo: '' } : {}) })} required>
                <option value="">-- Select Mode --</option>
                <option value="ROAD">ROAD</option>
                <option value="TRAIN">TRAIN</option>
                <option value="AIR">AIR</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Date<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <input type="date" min="1947-01-01" max="2200-12-31" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>
                {form.mode === 'TRAIN' ? 'Train No' : form.mode === 'ROAD' ? 'Vehicle No' : form.mode === 'AIR' ? 'Flight No' : 'Vehicle/Flight No'}
                <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <input type="text" className="form-control" placeholder={`Enter ${form.mode === 'TRAIN' ? 'Train No' : form.mode === 'ROAD' ? 'Vehicle No' : form.mode === 'AIR' ? 'Flight No' : 'Vehicle/Flight No'}`} value={form.vehicleNo} onChange={e => setForm({ ...form, vehicleNo: formatAllCaps(e.target.value) })} required />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Type<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <input type="text" list="type-options" className="form-control" placeholder="Select or Type" value={form.type || ""} onChange={e => setForm({ ...form, type: formatAllCaps(e.target.value) })} required />
              <datalist id="type-options">
                {form.mode === 'AIR' && (
                  <>
                    <option value="GCR AIR" />
                    <option value="PRIME AIR" />
                  </>
                )}
                {form.mode === 'ROAD' && (
                  <>
                    <option value="FTL" />
                    <option value="PTL" />
                  </>
                )}
              </datalist>
            </div>
          </div>



          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>AWB No</label>
              <input type="text" className="form-control" placeholder="Enter AWB No" value={form.awbNo} onChange={e => setForm({ ...form, awbNo: formatAllCaps(e.target.value) })} />
            </div>
            {form.mode === 'AIR' && (
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>CD No</label>
                <input type="text" className="form-control" placeholder="Enter CD No" value={form.cdNo} onChange={e => setForm({ ...form, cdNo: formatAllCaps(e.target.value) })} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Vendor<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <CreatableDropdown
                category="vendor"
                options={vendors}
                value={form.vendor}
                onChange={(val) => setForm({ ...form, vendor: val })}
                onCreate={(name) => handleCreateNew("vendor", "vendor", name)}
                placeholder="-- Please select the Vendor --"
                format={formatAllCaps}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Origin<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <CreatableDropdown
                category="origin"
                options={cities}
                value={form.origin}
                onChange={(city) => setForm({ ...form, origin: city })}
                onCreate={(name) => handleCreateNew("city", "origin", name)}
                placeholder="-- Please select Origin --"
                format={formatAllCaps}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Destination<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <CreatableDropdown
                category="destination"
                options={cities}
                value={form.destination}
                onChange={(city) => setForm({ ...form, destination: city })}
                onCreate={(name) => handleCreateNew("city", "destination", name)}
                placeholder="-- Please select Destination --"
                format={formatAllCaps}
              />
            </div>
          </div>

          {/* MATERIAL DETAILS */}
          <div style={{ paddingBottom: "0.5rem", borderBottom: "1px solid #e5e7eb", marginBottom: "1rem" }}>
            <label className="form-label" style={{ fontWeight: "600", color: "#111827", textTransform: "uppercase", marginBottom: 0 }}>MATERIAL DETAILS<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            {form.materialDetails.map((mat, i) => (
              <div key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1rem", marginBottom: "1rem", position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "0.5rem" }}>
                  <span style={{ fontWeight: "600", color: "#374151" }}>Vendor - {i + 1}</span>
                  {i > 0 && (
                    <button type="button" onClick={() => removeMaterialRow(i)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", fontSize: "0.875rem", fontWeight: "600" }}>
                      Remove Vendor
                    </button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Client Name</label>
                    <CreatableDropdown
                      category="client"
                      options={clients}
                      value={mat.clientName}
                      onChange={val => updateMaterialRow(i, "clientName", val)}
                      onCreate={(name) => handleCreateNew("client", "clientName", name, i)}
                      placeholder="-- Client --"
                      format={formatAllCaps}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>LR No</label>
                    <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} value={mat.lrNo} onChange={e => updateMaterialRow(i, "lrNo", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>From</label>
                    <CreatableDropdown
                      category="origin"
                      options={cities}
                      value={mat.origin}
                      onChange={val => updateMaterialRow(i, "origin", val)}
                      onCreate={(name) => handleCreateNew("city", "origin", name, i)}
                      placeholder="-- From --"
                      format={formatAllCaps}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>To</label>
                    <CreatableDropdown
                      category="destination"
                      options={cities}
                      value={mat.destination}
                      onChange={val => updateMaterialRow(i, "destination", val)}
                      onCreate={(name) => handleCreateNew("city", "destination", name, i)}
                      placeholder="-- To --"
                      format={formatAllCaps}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Box</label>
                    <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} type="number" value={mat.box} onChange={e => updateMaterialRow(i, "box", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Weight</label>
                    <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} type="number" step="0.01" value={mat.weight} onChange={e => updateMaterialRow(i, "weight", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Ch. Weight</label>
                    <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} type="number" step="0.01" value={mat.chWeight} onChange={e => updateMaterialRow(i, "chWeight", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
            <button
              type="button"
              onClick={addMaterialRow}
              style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "4px", color: "#374151", cursor: "pointer", fontWeight: "600", fontSize: "0.8rem", padding: "4px 12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              + Add <span style={{ fontSize: "0.65rem", color: "#6b7280" }}>(Ctrl + +)</span>
            </button>
          </div>

          <div className="form-group" style={{ marginBottom: "2rem" }}>
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Special Instruction</label>
            <input type="text" className="form-control" placeholder="Enter the Special Instruction" value={form.specialInstruction} onChange={e => setForm({ ...form, specialInstruction: e.target.value })} />
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
            <button type="button" className="btn" onClick={() => { setShowForm(false); setEditId(null); setForm(initialFormState); appDB.remove('manifestFormDraft'); }} disabled={isSubmitting} style={{ padding: "0 2rem", height: "45px" }}>
              CANCEL
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: "0 2rem", height: "45px" }}>
              {isSubmitting ? <><Loader2 size={18} className="spinner" /> Saving...</> : editId ? "UPDATE TRIP" : "ADD TRIP"}
            </button>
          </div>
        </form>
      )}

      {/* Mode Filter Tabs */}
      <div className="glass-panel no-print" style={{ padding: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {[
            { key: "ALL", label: "ALL TRIPS", color: "#3b82f6", icon: <Layers size={18} /> },
            { key: "ROAD", label: "ROAD TRIP", color: "#10b981", icon: <Truck size={18} /> },
            { key: "TRAIN", label: "TRAIN TRIP", color: "#a21caf", icon: <Train size={18} /> },
            { key: "AIR", label: "AIR TRIP", color: "#0ea5e9", icon: <Plane size={18} /> },
          ].map(({ key, label, color, icon }) => {
            const count = filteredTrips.filter(t => matchesMode(t.mode, key)).length;
            const isActive = modeFilter === key;
            return (
              <button key={key}
                onClick={() => setModeFilter(key)}
                style={{
                  flex: 1, padding: "0.75rem", borderRadius: 12, border: isActive ? `2px solid ${color}` : "1px solid rgba(0, 0, 0, 0.1)",
                  background: isActive ? `${color}15` : "transparent", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s"
                }}>
                {icon && React.cloneElement(icon, { color: isActive ? color : "var(--text-muted)" })}
                <span style={{ color: isActive ? color : "var(--text-dark)" }}>{label} ({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        /* AWS Console Premium Theme Styles */
        .aws-search-container {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          align-items: center;
          width: 100%;
        }
        .aws-search-wrapper {
          position: relative;
          flex: 1;
        }
        .aws-input {
          width: 100%;
          height: 38px;
          padding-left: 40px;
          padding-right: 12px;
          border: 1px solid #aab7b8;
          border-radius: 4px;
          background-color: #ffffff;
          font-size: 0.9rem;
          color: #1e293b;
          transition: all 0.15s ease-in-out;
        }
        .aws-input:focus {
          border-color: #ec7211;
          box-shadow: 0 0 0 2px rgba(236, 114, 17, 0.15);
          outline: none;
        }
        .aws-date-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid #aab7b8;
          border-radius: 4px;
          padding: 0 0.75rem;
          background: #ffffff;
          height: 38px;
        }
        .aws-date-input {
          border: none;
          height: 32px;
          font-size: 0.85rem;
          color: #1e293b;
          outline: none;
          background: transparent;
        }
        .aws-btn-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          height: 38px;
          padding: 0 1rem;
          background: #ffffff;
          border: 1px solid #aab7b8;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.85rem;
          color: #545b64;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .aws-btn-toggle:hover {
          background: #f8f9fa;
          border-color: #545b64;
        }
        .aws-btn-toggle.active {
          background: #f1f5f9;
          border-color: #ec7211;
          color: #ec7211;
        }
        .aws-filters-panel {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1.25rem;
          background: #f8f9fa;
          border: 1px solid #eaeded;
          border-radius: 4px;
          animation: slideDown 0.2s ease-out;
        }
        .aws-filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .aws-filter-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #545b64;
          letter-spacing: 0.5px;
        }
        .aws-select {
          height: 34px;
          border: 1px solid #aab7b8;
          border-radius: 4px;
          background-color: #ffffff;
          font-size: 0.85rem;
          color: #1e293b;
          padding: 0 8px;
          outline: none;
          transition: all 0.15s;
        }
        .aws-select:focus {
          border-color: #ec7211;
          box-shadow: 0 0 0 2px rgba(236, 114, 17, 0.15);
        }
        .aws-btn-reset {
          height: 34px;
          border: 1px solid #d5dbdb;
          background: #fafafa;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.85rem;
          color: #545b64;
          cursor: pointer;
          transition: all 0.15s;
          width: 100%;
        }
        .aws-btn-reset:hover {
          background: #f2f2f2;
          border-color: #aab7b8;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .aws-search-container {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }
          .aws-date-group {
            width: 100%;
            justify-content: space-between;
          }
          .aws-date-input {
            flex: 1;
            text-align: center;
          }
          .aws-btn-toggle {
            width: 100%;
            justify-content: center;
          }
          .aws-mobile-hide {
            display: none !important;
          }
        }
      `}</style>

      {/* Global Search & Date Filters */}
      <div className="no-print aws-search-container">
        <div className="aws-search-wrapper">
          <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            className="aws-input"
            placeholder="Search by anything: CD No, AWB No, vehicle, vendor, client..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="aws-date-group">
          <Filter size={16} color="#64748b" />
          <input type="date" className="aws-date-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span style={{ color: "#94a3b8" }}>-</span>
          <input type="date" className="aws-date-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <button
          type="button"
          className={`aws-btn-toggle ${showAdvancedFilters ? "active" : ""}`}
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          <Filter size={16} />
          {showAdvancedFilters ? "Hide Dropdowns" : "Show Dropdowns"}
        </button>
      </div>

      {/* Dropdown Filters Grid */}
      {showAdvancedFilters && (
        <div className="no-print aws-filters-panel">
          <div className="aws-filter-group">
            <label className="aws-filter-label">Vendor</label>
            <select className="aws-select" value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
              <option value="">All Vendors</option>
              {uniqueVendors.map((v, i) => <option key={i} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="aws-filter-group">
            <label className="aws-filter-label">Client</label>
            <select className="aws-select" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
              <option value="">All Clients</option>
              {uniqueClients.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="aws-filter-group">
            <label className="aws-filter-label">Vehicle No</label>
            <select className="aws-select" value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}>
              <option value="">All Vehicles</option>
              {uniqueVehicles.map((v, i) => <option key={i} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="aws-filter-group aws-mobile-hide">
            <label className="aws-filter-label">Origin</label>
            <select className="aws-select" value={selectedOrigin} onChange={e => setSelectedOrigin(e.target.value)}>
              <option value="">All Origins</option>
              {uniqueOrigins.map((o, i) => <option key={i} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="aws-filter-group aws-mobile-hide">
            <label className="aws-filter-label">Destination</label>
            <select className="aws-select" value={selectedDestination} onChange={e => setSelectedDestination(e.target.value)}>
              <option value="">All Destinations</option>
              {uniqueDestinations.map((d, i) => <option key={i} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="aws-filter-group aws-mobile-hide">
            <label className="aws-filter-label">Approval Status</label>
            <select className="aws-select" value={selectedApprovalStatus} onChange={e => setSelectedApprovalStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div className="aws-filter-group" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="aws-btn-reset" onClick={() => {
              setSelectedVendor("");
              setSelectedClient("");
              setSelectedVehicle("");
              setSelectedOrigin("");
              setSelectedDestination("");
              setSelectedApprovalStatus("");
              setStartDate("");
              setEndDate("");
              setSearchQuery("");
            }}>Reset Filters</button>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <h4 style={{
          marginBottom: "1rem",
          color: modeFilter === 'ALL' ? '#3b82f6' : modeFilter === 'ROAD' ? '#10b981' : modeFilter === 'TRAIN' ? '#a21caf' : '#0ea5e9',
          borderBottom: `2px solid ${modeFilter === 'ALL' ? '#3b82f6' : modeFilter === 'ROAD' ? '#10b981' : modeFilter === 'TRAIN' ? '#a21caf' : '#0ea5e9'}`,
          paddingBottom: "0.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          textTransform: 'uppercase'
        }}>
           {modeFilter === 'ALL' ? <Layers size={20} /> : modeFilter === 'ROAD' ? <Truck size={20} /> : modeFilter === 'TRAIN' ? <Train size={20} /> : <Plane size={20} />}
           {`${modeFilter === 'ALL' ? 'ALL' : modeFilter} TRIP RECORD`} ({activeFilteredTrips.length})
        </h4>
        <Table
          loading={loading}
          pagination={true}
          defaultEntries={10}
          headers={[
            <div key="select-all" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <input
                type="checkbox"
                checked={isAllVisibleSelected}
                onChange={handleToggleSelectAll}
                style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }}
                title={isAllVisibleSelected ? "Deselect All Visible" : "Select All Visible"}
              />
            </div>,
            "SL Number",
            "Mode",
            "Date",
            "Vehicle / Flight / Train No",
            "Type",
            "AWB No",
            "CD No",
            "Vendor",
            "Origin",
            "Destination",
            "Material Details",
            "Status",
            "Actions"
          ]}
          data={activeFilteredTrips}
          renderRow={renderTripRow}
        />
      </div>

      {/* Unified Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Vendor Ship MIS Report"
        itemCount={selectedTripIds.length > 0 ? selectedTripIds.length : activeFilteredTrips.length}
        subtitle={selectedTripIds.length > 0 ? `Exporting ${selectedTripIds.length} selected row(s)` : `Exporting all ${activeFilteredTrips.length} row(s) in ${modeFilter} mode`}
        isExporting={isExporting}
        onExport={handleExecuteExport}
      />
    </div>
  );
};

export default Trips;
