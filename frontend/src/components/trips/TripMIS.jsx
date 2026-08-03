import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import Table from "../../components/Table";
import { Plus, Truck, Check, X, Clock, Trash2, Edit, Printer, Download, Filter, Search, MessageSquare, Send, User } from "lucide-react";
import RupeeIcon from '../../components/RupeeIcon';
import { formatAllCaps, formatTitleCase, formatDate } from "../../utils/formatters";
import { useToast } from "../../context/ToastContext";
import { AuthContext } from "../../context/AuthContext";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const TripMIS = () => {
  const { addToast } = useToast();
  const { token, user } = useContext(AuthContext);
  const isAdminOrSuperAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const initialParcel = { lrNo: "", consignor: "", consignee: "", origin: "", destination: "", mode: "", box: "", weight: "", freight: "", pickup: "", delivery: "", special: "", other: "" };
  const initialTripListForm = { tripNo: "", origin: "", destination: "", clientName: "", date: "", vehicleType: "", vehicleNo: "", mode: "", payment: "", parcels: [ { ...initialParcel } ] };
  
  const [tripListEntries, setTripListEntries] = useState([]);
  const [activeRemarksModal, setActiveRemarksModal] = useState(null);
  const [remarkText, setRemarkText] = useState("");
  const [submittingRemark, setSubmittingRemark] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [printHeader, setPrintHeader] = useState("MULTIMARG");

  const filteredEntries = tripListEntries.filter(item => {
    // 1. Date Filter
    if (startDate || endDate) {
      const itemDate = new Date(item.date || item.createdAt);
      itemDate.setHours(0,0,0,0);
      const start = startDate ? new Date(startDate) : new Date("1970-01-01");
      start.setHours(0,0,0,0);
      const end = endDate ? new Date(endDate) : new Date("2100-01-01");
      end.setHours(23,59,59,999);
      if (itemDate < start || itemDate > end) return false;
    }
    
    // 2. Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesMain = 
        (item.clientName || "").toLowerCase().includes(q) ||
        (item.tripNo || "").toLowerCase().includes(q) ||
        (item.vehicleNo || "").toLowerCase().includes(q) ||
        (item.origin || "").toLowerCase().includes(q) ||
        (item.destination || "").toLowerCase().includes(q);
        
      const matchesParcels = item.parcels?.some(p => 
        (p.lrNo || "").toLowerCase().includes(q) ||
        (p.consignor || "").toLowerCase().includes(q) ||
        (p.consignee || "").toLowerCase().includes(q) ||
        (p.origin || "").toLowerCase().includes(q) ||
        (p.destination || "").toLowerCase().includes(q)
      );
      if (!matchesMain && !matchesParcels) return false;
    }
    return true;
  });

  // Exclude pending/rejected entries from total freight
  const totalFreight = filteredEntries.reduce((sum, item) => {
    if (item.approvalStatus === 'Pending' || item.approvalStatus === 'Rejected') {
      return sum;
    }
    const parcelsFreight = (item.parcels || []).reduce((pSum, p) => pSum + (parseFloat(p.freight) || 0), 0);
    return sum + parcelsFreight;
  }, 0);

  const handleExportCSV = () => {
    let csv = "Trip Date,Trip No,Vehicle No,Vehicle Type,Mode,Payment,Client Name,Origin,Destination,LR No,Consignor,Consignee,LR Origin,LR Destination,Box,Weight,Freight,Pickup,Delivery,Special,Other,Paid Amount,Approval Status\n";
    filteredEntries.forEach(trip => {
      if (trip.parcels && trip.parcels.length > 0) {
        trip.parcels.forEach((p, pIdx) => {
          const tripDate = pIdx === 0 ? (trip.date || (trip.createdAt ? trip.createdAt.substring(0,10) : '')) : '';
          const tripNo = pIdx === 0 ? (trip.tripNo || '') : '';
          const vehicleNo = pIdx === 0 ? (trip.vehicleNo || '') : '';
          const vehicleType = pIdx === 0 ? (trip.vehicleType || '') : '';
          const clientName = pIdx === 0 ? (trip.clientName || '') : '';
          const mode = pIdx === 0 ? (trip.mode || '') : '';
          const payment = pIdx === 0 ? (trip.payment || '') : '';
          const origin = pIdx === 0 ? (trip.origin || '') : '';
          const destination = pIdx === 0 ? (trip.destination || '') : '';
          const paidAmount = pIdx === 0 ? (trip.paidAmount || '') : '';
          const approvalStatus = pIdx === 0 ? (trip.approvalStatus || '') : '';
          
          csv += `"${tripDate}","${tripNo}","${vehicleNo}","${vehicleType}","${mode}","${payment}","${clientName}","${origin}","${destination}","${p.lrNo || ''}","${p.consignor || ''}","${p.consignee || ''}","${p.origin || ''}","${p.destination || ''}","${p.box || ''}","${p.weight || ''}","${p.freight || ''}","${p.pickup || ''}","${p.delivery || ''}","${p.special || ''}","${p.other || ''}","${paidAmount}","${approvalStatus}"\n`;
        });
      } else {
        csv += `"${trip.date || (trip.createdAt ? trip.createdAt.substring(0,10) : '')}","${trip.tripNo || ''}","${trip.vehicleNo || ''}","${trip.vehicleType || ''}","${trip.mode || ''}","${trip.payment || ''}","${trip.clientName || ''}","${trip.origin || ''}","${trip.destination || ''}","","","","","","","","","","","","","${trip.paidAmount || ''}","${trip.approvalStatus || ''}"\n`;
      }
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `Trip_MIS_Export_${formatDate(new Date())}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    if(token) {
      axios.get(`${API}/trip-mis`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => { if(res.data.success) setTripListEntries(res.data.data); })
        .catch(err => console.error(err));
    }
  }, [token]);

  const [tripListForm, setTripListForm] = useState(initialTripListForm);
  const [showTripListForm, setShowTripListForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingStatus, setEditingStatus] = useState('');
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, idx: null, amount: "", maxAmount: 0 });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showTripListForm && e.ctrlKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setTripListForm(prev => ({
          ...prev, 
          parcels: [...prev.parcels, { ...initialParcel }]
        }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTripListForm]);

  return (
    <div>
      <div className="no-print">
      <div className="header-flex" style={{ marginBottom: "1.5rem" }}>
         <h3 style={{ fontSize: "1.5rem", color: "#111827", margin: 0 }}>Trip MIS Entries</h3>
         <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
           <div style={{ display: "flex", gap: "5px", alignItems: "center", background: "white", padding: "4px 8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
             <Filter size={16} color="#64748b" />
             <input type="date" className="form-control" style={{ border: "none", height: "30px", padding: "0 5px", fontSize: "0.8rem", width: "115px" }} value={startDate} onChange={e => setStartDate(e.target.value)} />
             <span style={{ color: "#94a3b8" }}>-</span>
             <input type="date" className="form-control" style={{ border: "none", height: "30px", padding: "0 5px", fontSize: "0.8rem", width: "115px" }} value={endDate} onChange={e => setEndDate(e.target.value)} />
           </div>
           
           <button className="btn" style={{ background: "white", border: "1px solid #cbd5e1" }} onClick={handleExportCSV}>
             <Download size={16} style={{ marginRight: 6 }} /> Export CSV
           </button>
           
           {isSuperAdmin && (
             <select 
               className="form-control" 
               style={{ border: "1px solid #cbd5e1", height: "30px", fontSize: "0.8rem", width: "170px", padding: "0 5px", background: "white" }}
               value={printHeader}
               onChange={e => setPrintHeader(e.target.value)}
             >
               <option value="MULTIMARG">Header: Multimarg</option>
               <option value="PRIME">Header: Prime Roadways</option>
             </select>
           )}
           
           <button className="btn" style={{ background: "white", border: "1px solid #cbd5e1" }} onClick={() => window.print()}>
             <Printer size={16} style={{ marginRight: 6 }} /> Print All
           </button>
           {!showTripListForm && (
             <button className="btn btn-primary" onClick={() => { setTripListForm(initialTripListForm); setEditingId(null); setEditingStatus(''); setShowTripListForm(true); }}>
               <Plus size={16} style={{ marginRight: 6 }} /> Add Trip MIS Entry
             </button>
           )}
         </div>
      </div>
      
      <div className="no-print" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
         <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
           <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
           <input 
             type="text" 
             className="form-control" 
             placeholder="Search by client, trip no, vehicle, LR no, origin, destination..." 
             style={{ paddingLeft: '40px', height: '45px', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} 
             value={searchQuery} 
             onChange={e => setSearchQuery(e.target.value)} 
           />
         </div>
         <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#047857', padding: '0 1.5rem', borderRadius: '8px', height: '45px', display: 'flex', alignItems: 'center', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>
           Total Freight: &nbsp;<RupeeIcon size={14} /> {totalFreight.toFixed(2)}
         </div>
       </div>
       
      {showTripListForm && (
         <form className="glass-panel slide-down" style={{ padding: "2rem", marginBottom: "2rem" }} onSubmit={async (e) => {
             e.preventDefault();
              const totalFreight = tripListForm.parcels.reduce((sum, p) => sum + 
                (parseFloat(p.freight) || 0) + 
                (parseFloat(p.pickup) || 0) + 
                (parseFloat(p.delivery) || 0) + 
                (parseFloat(p.special) || 0) + 
                (parseFloat(p.other) || 0), 0);
              const totalBox = tripListForm.parcels.reduce((sum, p) => sum + (parseInt(p.box) || 0), 0);
              const totalWeight = tripListForm.parcels.reduce((sum, p) => sum + (parseFloat(p.weight) || 0), 0);
              
              const newEntry = {
                tripNo: tripListForm.tripNo,
                origin: tripListForm.origin,
                destination: tripListForm.destination,
                clientName: tripListForm.clientName,
                date: tripListForm.date,
                vehicleType: tripListForm.vehicleType,
                vehicleNo: tripListForm.vehicleNo,
                mode: tripListForm.mode,
                payment: tripListForm.payment,
                parcels: tripListForm.parcels,
                freight: totalFreight,
                box: totalBox,
                weight: totalWeight,
                paidAmount: 0
              };
              
              try {
                if (editingId) {
                  const res = await axios.put(`${API}/trip-mis/${editingId}`, newEntry, { headers: { Authorization: `Bearer ${token}` } });
                  if(res.data.success) {
                    setTripListEntries(tripListEntries.map(t => t.id === editingId ? { ...t, ...newEntry } : t));
                    setTripListForm(initialTripListForm);
                    setEditingId(null);
                    setEditingStatus('');
                    setShowTripListForm(false);
                    addToast("Trip MIS entry updated successfully!", "success");
                  }
                } else {
                  const res = await axios.post(`${API}/trip-mis`, newEntry, { headers: { Authorization: `Bearer ${token}` } });
                  if(res.data.success) {
                    setTripListEntries([res.data.data, ...tripListEntries]);
                    setTripListForm(initialTripListForm);
                    setShowTripListForm(false);
                    addToast("Trip MIS entry added successfully!", "success");
                  }
                }
              } catch(err) {
                addToast(editingId ? "Failed to update entry" : "Failed to add entry", "error");
              }
         }}>
            <h5 style={{ marginBottom: "1.5rem", color: "var(--primary-color)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Truck size={20} /> {editingId ? "Edit Trip Details" : "Enter Trip Details"}
            </h5>
            <div className="grid-3-col" style={{ padding: "1.5rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "2rem" }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Trip Number<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
                <input type="text" className="form-control" placeholder="Auto-generated (e.g. TRP-1)" value={tripListForm.tripNo} disabled />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>From<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
                <input type="text" className="form-control" placeholder="Enter From" value={tripListForm.origin} onChange={e => setTripListForm({...tripListForm, origin: formatAllCaps(e.target.value)})} required />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>To<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
                <input type="text" className="form-control" placeholder="Enter To" value={tripListForm.destination} onChange={e => setTripListForm({...tripListForm, destination: formatAllCaps(e.target.value)})} required />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Client Name<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
                <input type="text" className="form-control" placeholder="Enter Client Name" value={tripListForm.clientName} onChange={e => setTripListForm({...tripListForm, clientName: formatAllCaps(e.target.value)})} required />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Date<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
                <input type="date" className="form-control" value={tripListForm.date} onChange={e => setTripListForm({...tripListForm, date: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Vehicle Type<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
                <input type="text" className="form-control" placeholder="e.g. Container" value={tripListForm.vehicleType} onChange={e => setTripListForm({...tripListForm, vehicleType: formatTitleCase(e.target.value)})} required />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Vehicle Number<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
                <input type="text" className="form-control" placeholder="e.g. DL 1A 1234" value={tripListForm.vehicleNo} onChange={e => setTripListForm({...tripListForm, vehicleNo: formatAllCaps(e.target.value)})} required />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Mode<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
                <select className="form-control" value={tripListForm.mode} onChange={e => setTripListForm({...tripListForm, mode: e.target.value})} required>
                  <option value="">Select Mode...</option>
                  <option value="Normal">Normal</option>
                  <option value="Part Load">Part Load</option>
                  <option value="Special">Special</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Payment Mode<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
                <select className="form-control" value={tripListForm.payment} onChange={e => setTripListForm({...tripListForm, payment: e.target.value})} required>
                  <option value="">Select Payment...</option>
                  <option value="Paid">Paid</option>
                  <option value="To Pay">To Pay</option>
                  <option value="Credit">Credit</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.5rem", borderBottom: "1px solid #e5e7eb", marginBottom: "1rem" }}>
              <label className="form-label" style={{ fontWeight: "600", color: "#111827", textTransform: "uppercase", marginBottom: 0 }}>PARCEL DETAILS<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <button type="button" onClick={() => setTripListForm({...tripListForm, parcels: [...tripListForm.parcels, { ...initialParcel }]})} style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", color: "#374151", cursor: "pointer", fontWeight: "600", fontSize: "0.875rem", padding: "4px 12px", display: "flex", alignItems: "center" }}>+ Add Row <span style={{ fontSize: "0.65rem", marginLeft: "6px", color: "#6b7280" }}>(Ctrl + +)</span></button>
            </div>
            
            <div style={{ marginBottom: "2rem", paddingBottom: "1rem" }}>
              {tripListForm.parcels.map((parcel, idx) => {
                const rowTotal = (parseFloat(parcel.freight) || 0) + (parseFloat(parcel.pickup) || 0) + (parseFloat(parcel.delivery) || 0) + (parseFloat(parcel.special) || 0) + (parseFloat(parcel.other) || 0);
                return (
                <div key={idx} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1rem", marginBottom: "1rem", position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "0.5rem" }}>
                    <span style={{ fontWeight: "600", color: "#374151" }}>Parcel #{idx + 1}</span>
                    {idx > 0 && (
                      <button type="button" onClick={() => {
                          const newParcels = tripListForm.parcels.filter((_, i) => i !== idx);
                          setTripListForm({...tripListForm, parcels: newParcels});
                      }} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", fontSize: "0.875rem", fontWeight: "600" }}>
                        Remove Parcel
                      </button>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>LR No</label>
                      <input className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="LR No" value={parcel.lrNo} onChange={e => { const newParcels = [...tripListForm.parcels]; newParcels[idx].lrNo = e.target.value; setTripListForm({...tripListForm, parcels: newParcels}); }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>From</label>
                      <input className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="From" value={parcel.origin} onChange={e => { const newParcels = [...tripListForm.parcels]; newParcels[idx].origin = formatAllCaps(e.target.value); setTripListForm({...tripListForm, parcels: newParcels}); }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>To</label>
                      <input className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="To" value={parcel.destination} onChange={e => { const newParcels = [...tripListForm.parcels]; newParcels[idx].destination = formatAllCaps(e.target.value); setTripListForm({...tripListForm, parcels: newParcels}); }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Consignor</label>
                      <input className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="Consignor" value={parcel.consignor} onChange={e => { const newParcels = [...tripListForm.parcels]; newParcels[idx].consignor = formatAllCaps(e.target.value); setTripListForm({...tripListForm, parcels: newParcels}); }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Consignee</label>
                      <input className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="Consignee" value={parcel.consignee} onChange={e => { const newParcels = [...tripListForm.parcels]; newParcels[idx].consignee = formatAllCaps(e.target.value); setTripListForm({...tripListForm, parcels: newParcels}); }} required />
                    </div>

                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Mode</label>
                      <select className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} value={parcel.mode} onChange={e => { const newParcels = [...tripListForm.parcels]; newParcels[idx].mode = e.target.value; setTripListForm({...tripListForm, parcels: newParcels}); }} required>
                          <option value="">Mode...</option>
                          <option value="Air">Air</option>
                          <option value="Road">Road</option>
                          <option value="Express Road">Express Road</option>
                          <option value="Train">Train</option>
                          <option value="Surface">Surface</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Box</label>
                      <input className="form-control" type="number" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="Box" value={parcel.box} onChange={e => { const newParcels = [...tripListForm.parcels]; newParcels[idx].box = e.target.value; setTripListForm({...tripListForm, parcels: newParcels}); }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Weight</label>
                      <input className="form-control" type="number" step="0.01" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="Weight" value={parcel.weight} onChange={e => { const newParcels = [...tripListForm.parcels]; newParcels[idx].weight = e.target.value; setTripListForm({...tripListForm, parcels: newParcels}); }} required />
                    </div>
                    
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Freight</label>
                      <div style={{position: "relative"}}><span style={{position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "#9ca3af"}}>₹</span><input className="form-control" type="number" step="0.01" style={{ fontSize: "0.85rem", padding: "8px 8px 8px 20px" }} placeholder="Freight" value={parcel.freight} onChange={e => { const newParcels = [...tripListForm.parcels]; newParcels[idx].freight = e.target.value; setTripListForm({...tripListForm, parcels: newParcels}); }} required /></div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Pickup</label>
                      <div style={{position: "relative"}}><span style={{position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "#9ca3af"}}>₹</span><input className="form-control" type="number" step="0.01" style={{ fontSize: "0.85rem", padding: "8px 8px 8px 20px" }} placeholder="Pickup" value={parcel.pickup} onChange={e => { const newParcels = [...tripListForm.parcels]; newParcels[idx].pickup = e.target.value; setTripListForm({...tripListForm, parcels: newParcels}); }} /></div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Delivery</label>
                      <div style={{position: "relative"}}><span style={{position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "#9ca3af"}}>₹</span><input className="form-control" type="number" step="0.01" style={{ fontSize: "0.85rem", padding: "8px 8px 8px 20px" }} placeholder="Delivery" value={parcel.delivery} onChange={e => { const newParcels = [...tripListForm.parcels]; newParcels[idx].delivery = e.target.value; setTripListForm({...tripListForm, parcels: newParcels}); }} /></div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Special</label>
                      <div style={{position: "relative"}}><span style={{position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "#9ca3af"}}>₹</span><input className="form-control" type="number" step="0.01" style={{ fontSize: "0.85rem", padding: "8px 8px 8px 20px" }} placeholder="Special" value={parcel.special} onChange={e => { const newParcels = [...tripListForm.parcels]; newParcels[idx].special = e.target.value; setTripListForm({...tripListForm, parcels: newParcels}); }} /></div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Other</label>
                      <div style={{position: "relative"}}><span style={{position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "#9ca3af"}}>₹</span><input className="form-control" type="number" step="0.01" style={{ fontSize: "0.85rem", padding: "8px 8px 8px 20px" }} placeholder="Other" value={parcel.other} onChange={e => { const newParcels = [...tripListForm.parcels]; newParcels[idx].other = e.target.value; setTripListForm({...tripListForm, parcels: newParcels}); }} /></div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Total</label>
                      <div style={{ background: "#f1f5f9", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", fontWeight: "700", color: "#10b981", display: "flex", alignItems: "center", height: "37px" }}>₹ {rowTotal.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
            
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={() => { setShowTripListForm(false); setEditingId(null); setEditingStatus(''); setTripListForm(initialTripListForm); }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ padding: "0 2rem" }}>{editingId ? "Update Trip MIS Entry" : "Save Trip MIS Entry"}</button>
            </div>
         </form>
      )}

      <div className="table-responsive">
        <Table 
          loading={false}
          headers={[
            "Trip No", "Client Name", "Date", "Vehicle Details", "Mode", "Parcels (LRs)", "Total Box", "Total Weight", 
            <div style={{ textAlign: "center", lineHeight: "1.2" }}>Total Freight<br/><span style={{ fontSize: "0.65rem", color: "#6b7280" }}>Payment Mode</span></div>,
            "Status", "Remarks", "Actions"
          ]}
          data={filteredEntries}
          emptyMessage="No trip MIS entries added yet. Click 'Add Trip MIS Entry' to start."
          renderRow={(item, idx) => (
            <tr key={idx}>
              <td className="font-semibold" style={{ color: "#1e3a8a", whiteSpace: "nowrap" }}>{item.tripNo || "-"}</td>
              <td className="font-semibold" style={{ whiteSpace: "nowrap" }}>
                {item.clientName || "-"}
                {isAdminOrSuperAdmin && (
                  <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "normal", marginTop: "4px" }}>
                    By: {item.creatorName || 'Unknown (Old Entry)'}
                  </div>
                )}
              </td>
              <td style={{ whiteSpace: "nowrap" }}>{item.date ? formatDate(item.date) : "-"}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Truck size={14} color="var(--text-muted)" /> {item.vehicleNo}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.vehicleType}</div>
              </td>
              <td>
                <span style={{ 
                  padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase",
                  background: item.mode === 'Normal' ? '#f1f5f9' : item.mode === 'Special' ? '#f3e8ff' : '#fef3c7',
                  color: item.mode === 'Normal' ? '#475569' : item.mode === 'Special' ? '#7e22ce' : '#b45309'
                }}>
                  {item.mode}
                </span>
              </td>
              <td>
                <div style={{ fontSize: "0.8rem", color: "var(--text-dark)", maxHeight: "60px", overflowY: "auto" }}>
                  {item.parcels?.map((p, i) => (
                    <div key={i}><strong className="text-primary">{p.lrNo}</strong> <span style={{fontSize: "0.7rem", color: "#6b7280"}}>({p.origin?.substring(0,6)}-{p.destination?.substring(0,6)})</span></div>
                  )) || "-"}
                </div>
              </td>
              <td>{item.box || item.parcels?.reduce((s, p) => s + (parseInt(p.box)||0), 0) || "-"}</td>
              <td style={{ whiteSpace: "nowrap" }}>{item.weight || item.parcels?.reduce((s, p) => s + (parseFloat(p.weight)||0), 0) || "-"} kg</td>
              <td style={{ whiteSpace: "nowrap" }}>
                <div style={{ fontWeight: "600", color: "#10b981", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <RupeeIcon size={14} />{((parseFloat(item.freight) || 0) * 1.18).toFixed(2)}
                  <span style={{ fontSize: "0.6rem", color: "#6b7280" }}>(Inc 18% GST)</span>
                </div>
                {(parseFloat(item.paidAmount) > 0 && item.payment !== 'Paid') && (
                  <div style={{ fontSize: "0.75rem", color: "#f59e0b", marginBottom: "6px", fontWeight: "600" }}>
                    Paid: {item.paidAmount} | Rem: {(((parseFloat(item.freight) || 0) * 1.18) - parseFloat(item.paidAmount)).toFixed(2)}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: "12px", fontSize: "0.65rem", fontWeight: "600",
                    background: item.payment === 'Paid' ? '#dcfce7' : item.payment === 'To Pay' ? '#fee2e2' : '#e0e7ff',
                    color: item.payment === 'Paid' ? '#15803d' : item.payment === 'To Pay' ? '#b91c1c' : '#4338ca'
                  }}>
                    {item.payment}
                  </span>
                  {item.payment !== 'Paid' && (
                    <button 
                      onClick={() => {
                        const totalWithGst = (parseFloat(item.freight) || 0) * 1.18;
                        const paid = parseFloat(item.paidAmount) || 0;
                        setPaymentModal({ isOpen: true, idx, maxAmount: totalWithGst - paid, amount: (totalWithGst - paid).toFixed(2) });
                      }}
                      style={{
                        background: "#10b981", color: "white", border: "none", borderRadius: "6px", 
                        fontSize: "0.75rem", padding: "6px 12px", cursor: "pointer", fontWeight: "600",
                        boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)", transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      title="Mark as Paid"
                    >
                      Mark Paid
                    </button>
                  )}
                </div>
              </td>
              <td>
                <span style={{
                    padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600",
                    background: item.approvalStatus === 'Approved' ? '#dcfce7' : item.approvalStatus === 'Rejected' ? '#fee2e2' : '#fef9c3',
                    color: item.approvalStatus === 'Approved' ? '#166534' : item.approvalStatus === 'Rejected' ? '#991b1b' : '#854d0e'
                }}>
                  {item.approvalStatus || 'Approved'}
                </span>
              </td>
              {/* Remarks Column */}
              <td style={{ textAlign: "center" }}>
                <button
                  onClick={() => { setActiveRemarksModal(item); setRemarkText(""); }}
                  style={{
                    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                    border: "1px solid #bfdbfe",
                    borderRadius: "8px",
                    padding: "6px 14px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#1e40af",
                    transition: "all 0.2s",
                    position: "relative"
                  }}
                  title="Open Remarks"
                >
                  <MessageSquare size={15} />
                  <span>Remarks</span>
                  {(item.remarks && item.remarks.length > 0) && (
                    <span style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-6px",
                      background: "#2563eb",
                      color: "#fff",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 4px rgba(37, 99, 235, 0.4)"
                    }}>
                      {item.remarks.length}
                    </span>
                  )}
                </button>
              </td>
              <td style={{ textAlign: "right" }}>
                <div className="action-buttons-wrapper">
                  {isAdminOrSuperAdmin && (
                    <>
                      {item.approvalStatus !== 'Approved' && (
                        <button onClick={async () => {
                          try {
                            const res = await axios.put(`${API}/trip-mis/${item.id}`, { approvalStatus: 'Approved' }, { headers: { Authorization: `Bearer ${token}` } });
                            if(res.data.success) {
                               const newEntries = [...tripListEntries];
                               newEntries[idx].approvalStatus = 'Approved';
                               setTripListEntries(newEntries);
                               addToast("Entry Approved!", "success");
                            }
                          } catch(e) { addToast("Error approving entry", "error"); }
                        }} className="action-btn action-btn-success">
                          <Check size={14} /> Approve
                        </button>
                      )}
                      
                      {item.approvalStatus !== 'Rejected' && (
                        <button onClick={async () => {
                          try {
                            const res = await axios.put(`${API}/trip-mis/${item.id}`, { approvalStatus: 'Rejected' }, { headers: { Authorization: `Bearer ${token}` } });
                            if(res.data.success) {
                               const newEntries = [...tripListEntries];
                               newEntries[idx].approvalStatus = 'Rejected';
                               setTripListEntries(newEntries);
                               addToast("Entry Rejected", "success");
                            }
                          } catch(e) { addToast("Error rejecting entry", "error"); }
                        }} className="action-btn action-btn-danger">
                          <X size={14} /> Reject
                        </button>
                      )}

                      {item.approvalStatus !== 'Pending' && (
                        <button onClick={async () => {
                          try {
                            const res = await axios.put(`${API}/trip-mis/${item.id}`, { approvalStatus: 'Pending' }, { headers: { Authorization: `Bearer ${token}` } });
                            if(res.data.success) {
                               const newEntries = [...tripListEntries];
                               newEntries[idx].approvalStatus = 'Pending';
                               setTripListEntries(newEntries);
                               addToast("Entry Moved to Pending", "success");
                            }
                          } catch(e) { addToast("Error moving to pending", "error"); }
                        }} className="action-btn action-btn-warning">
                          <Clock size={14} /> Pending
                        </button>
                      )}
                      <button onClick={async () => {
                        if (window.confirm("Are you sure you want to delete this Trip MIS entry?")) {
                          try {
                            const res = await axios.delete(`${API}/trip-mis/${item.id}`, { headers: { Authorization: `Bearer ${token}` } });
                            if (res.data.success) {
                              setTripListEntries(tripListEntries.filter(t => t.id !== item.id));
                              addToast("Entry deleted successfully", "success");
                            }
                          } catch(e) { addToast("Error deleting entry", "error"); }
                        }
                      }} className="action-btn action-btn-secondary">
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                  {(isAdminOrSuperAdmin || (user?.role === 'Vendor' && item.createdBy === user?.id && item.approvalStatus !== 'Approved')) && (
                    <button onClick={() => {
                      setTripListForm(item);
                      setEditingId(item.id);
                      setEditingStatus(item.approvalStatus || 'Pending');
                      setShowTripListForm(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} className="action-btn action-btn-primary">
                      <Edit size={14} /> Edit
                    </button>
                  )}
                  {isAdminOrSuperAdmin && (
                    <button 
                      onClick={() => {
                        localStorage.setItem("printSingleTripData", JSON.stringify(item));
                        window.open(`/print-single-trip/mis-print`, '_blank');
                      }}
                      className="action-btn action-btn-light"
                      title="Print Single Trip"
                    >
                      <Printer size={14} /> Print
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )}
        />
      </div>

      {paymentModal.isOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel slide-down" style={{ padding: "2rem", width: "400px", maxWidth: "90%", background: "white" }}>
            <h4 style={{ marginBottom: "1rem" }}>Mark Payment</h4>
            <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
              Remaining amount to be paid: <strong>{paymentModal.maxAmount}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Amount Paid</label>
              <input type="number" className="form-control" value={paymentModal.amount} onChange={(e) => setPaymentModal({...paymentModal, amount: e.target.value})} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
              <button className="btn" onClick={() => setPaymentModal({ isOpen: false, idx: null, amount: "", maxAmount: 0 })}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                const payAmt = parseFloat(paymentModal.amount) || 0;
                if (payAmt <= 0) return addToast("Please enter a valid amount", "error");
                if (payAmt > paymentModal.maxAmount) return addToast("Amount cannot exceed remaining balance", "error");
                
                const entry = tripListEntries[paymentModal.idx];
                const currentPaid = parseFloat(entry.paidAmount) || 0;
                const newPaid = currentPaid + payAmt;
                const total = parseFloat(entry.freight) || 0;
                
                const newStatus = newPaid >= total ? 'Paid' : entry.payment;
                
                try {
                  const res = await axios.put(`${API}/trip-mis/${entry.id}`, { paidAmount: newPaid, payment: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
                  if(res.data.success) {
                    const newEntries = [...tripListEntries];
                    newEntries[paymentModal.idx] = { ...entry, paidAmount: newPaid, payment: newStatus };
                    setTripListEntries(newEntries);
                    setPaymentModal({ isOpen: false, idx: null, amount: "", maxAmount: 0 });
                    addToast("Payment updated successfully!", "success");
                  }
                } catch(e) {
                   addToast("Error updating payment", "error");
                }
              }}>Save Payment</button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Communication & Remarks Modal */}
      {activeRemarksModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.7)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            width: "95%",
            maxWidth: "640px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            maxHeight: "88vh",
            border: "1px solid #cbd5e1"
          }}>
            {/* Modal Header with Company Logo & Status Info */}
            <div style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
              color: "#ffffff",
              padding: "1rem 1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              flexShrink: 0
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img
                  src="/mc.png"
                  alt="Multimarg Logo"
                  style={{
                    height: "40px",
                    width: "auto",
                    objectFit: "contain",
                    background: "#ffffff",
                    padding: "4px 8px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                  }}
                />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "800", fontSize: "1rem", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                    <span>Multimarg Carriers</span>
                    <span style={{ fontSize: "0.65rem", background: "rgba(255,255,255,0.15)", padding: "2px 6px", borderRadius: "6px", fontWeight: "700" }}>COMMUNICATIONS</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: "4px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span>Trip: <strong style={{ color: "#ffffff" }}>{activeRemarksModal.tripNo}</strong></span>
                    <span>•</span>
                    <span>Client: <strong style={{ color: "#ffffff" }}>{activeRemarksModal.clientName}</strong></span>
                    <span>•</span>
                    <span style={{
                      background: activeRemarksModal.approvalStatus === 'Approved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: activeRemarksModal.approvalStatus === 'Approved' ? '#6ee7b7' : '#fcd34d',
                      padding: "1px 6px",
                      borderRadius: "4px",
                      fontWeight: 700,
                      fontSize: "0.7rem"
                    }}>
                      {activeRemarksModal.approvalStatus || 'Approved'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveRemarksModal(null)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "#ffffff",
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s",
                  flexShrink: 0,
                  marginLeft: "10px"
                }}
                title="Close Modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conversation Messages List */}
            <div style={{
              padding: "1.25rem",
              overflowY: "auto",
              flex: "1 1 auto",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              background: "#f8fafc",
              minHeight: "240px"
            }}>
              {(!activeRemarksModal.remarks || activeRemarksModal.remarks.length === 0) ? (
                <div style={{
                  textAlign: "center",
                  padding: "2.5rem 1rem",
                  color: "#64748b",
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px dashed #cbd5e1"
                }}>
                  <MessageSquare size={36} style={{ color: "#94a3b8", marginBottom: "8px" }} />
                  <p style={{ fontWeight: 600, margin: "0 0 4px", color: "#334155" }}>No communication history yet</p>
                  <p style={{ fontSize: "0.85rem", margin: 0 }}>Start the discussion between Client and Admin below.</p>
                </div>
              ) : (
                activeRemarksModal.remarks.map((remark, idx) => {
                  const isClient = remark.senderRole === 'Vendor' || remark.senderRole === 'Client';
                  return (
                    <div
                      key={idx}
                      style={{
                        alignSelf: isClient ? "flex-start" : "flex-end",
                        maxWidth: "85%",
                        background: isClient ? "#ffffff" : "#eff6ff",
                        border: isClient ? "1px solid #e2e8f0" : "1px solid #bfdbfe",
                        borderRadius: isClient ? "14px 14px 14px 4px" : "14px 14px 4px 14px",
                        padding: "12px 16px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "10px",
                            background: isClient ? "#fef3c7" : "#dbeafe",
                            color: isClient ? "#92400e" : "#1e40af",
                            textTransform: "uppercase"
                          }}>
                            {isClient ? "Client" : (remark.senderRole === 'SuperAdmin' ? "Super Admin" : "Admin")}
                          </span>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#334155" }}>
                            {remark.senderName || (isClient ? "Client" : "Admin")}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                          {remark.createdAt ? formatDate(remark.createdAt) : ""}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "#1e293b", lineHeight: "1.4", wordBreak: "break-word" }}>
                        {remark.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Footer or Closed Notice */}
            {(user?.role === 'Vendor' && activeRemarksModal.approvalStatus === 'Approved') ? (
              <div style={{
                padding: "1.25rem 1.5rem",
                background: "#fff1f2",
                borderTop: "1px solid #fecdd3",
                color: "#be123c",
                textAlign: "center",
                fontSize: "0.85rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                flexShrink: 0,
                boxShadow: "0 -2px 10px rgba(0,0,0,0.02)"
              }}>
                <span style={{ fontSize: "1.1rem" }}>🔒</span>
                <span>Remarks are closed for Clients because this entry has been Approved.</span>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!remarkText || !remarkText.trim() || submittingRemark) return;
                  setSubmittingRemark(true);
                  try {
                    const res = await axios.post(
                      `${API}/trip-mis/${activeRemarksModal.id}/remarks`,
                      { message: remarkText.trim() },
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (res.data.success && res.data.data) {
                      const newRemark = res.data.data;
                      const updatedRemarks = [...(activeRemarksModal.remarks || []), newRemark];
                      setActiveRemarksModal({
                        ...activeRemarksModal,
                        remarks: updatedRemarks
                      });
                      const updatedEntries = tripListEntries.map(entry =>
                        entry.id === activeRemarksModal.id
                          ? { ...entry, remarks: updatedRemarks }
                          : entry
                      );
                      setTripListEntries(updatedEntries);
                      setRemarkText("");
                      addToast("Remark sent!", "success");
                    }
                  } catch (err) {
                    addToast(err.response?.data?.message || "Failed to send remark", "error");
                  } finally {
                    setSubmittingRemark(false);
                  }
                }}
                style={{
                  padding: "1rem 1.25rem",
                  background: "#ffffff",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-end",
                  flexShrink: 0,
                  boxShadow: "0 -2px 10px rgba(0,0,0,0.03)"
                }}
              >
                <div style={{ flex: 1 }}>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Write a remark for Admin / Client..."
                    value={remarkText}
                    onChange={(e) => setRemarkText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.form.requestSubmit();
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem",
                      resize: "none",
                      outline: "none",
                      fontFamily: "inherit"
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingRemark || !remarkText.trim()}
                  style={{
                    background: submittingRemark || !remarkText.trim() ? "#94a3b8" : "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: submittingRemark || !remarkText.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    height: "42px",
                    transition: "background 0.2s",
                    flexShrink: 0
                  }}
                >
                  <Send size={16} />
                  <span>Send</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="print-only">
        {printHeader === "PRIME" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "15px", borderBottom: "2px solid #1e293b", paddingBottom: "10px" }}>
              <img src="/Prime RoadWAYS.png" alt="Prime Roadways" style={{ height: "70px", objectFit: "contain" }} />
              <div style={{ textAlign: "right" }}>
                <h2 style={{ margin: "0 0 4px", color: "#b91c1c", textTransform: "uppercase", letterSpacing: "1px" }}>PRIME ROADWAYS</h2>
                <p style={{ margin: "0 0 2px", fontSize: "9pt", color: "#334155" }}>PLOT NO 292/292A & 292B, OM VIHAR, WEST DELHI, NEW DELHI-110059</p>
                <p style={{ margin: "0 0 2px", fontSize: "9pt", color: "#334155" }}>+91 7503112217 | info@primeroadways.co.in</p>
                <p style={{ margin: 0, fontSize: "9pt", color: "#334155", fontWeight: "600" }}>GSTIN: 07BBCPP8550Q1ZX | PAN NO: BBCPP8550Q</p>
              </div>
            </div>
            <h4 style={{ margin: "0 0 15px", color: "#1e293b", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Trip MIS Report {startDate && endDate ? `(${formatDate(startDate)} to ${formatDate(endDate)})` : "(Complete Record)"}
            </h4>
          </>
        ) : (
          <div style={{ textAlign: "center", marginBottom: "20px", borderBottom: "2px solid #1e293b", paddingBottom: "10px" }}>
            <h2 style={{ margin: "0 0 5px", color: "#1e3a8a", textTransform: "uppercase" }}>MULTIMARG CARRIERS PVT. LTD.</h2>
            <h4 style={{ margin: 0, color: "#475569" }}>Trip MIS Report {startDate && endDate ? `(${formatDate(startDate)} to ${formatDate(endDate)})` : "(Complete Record)"}</h4>
          </div>
        )}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt", fontFamily: "sans-serif" }}>
          <thead>
            <tr style={{ backgroundColor: "#1e293b", color: "white", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "left" }}>Trip Info</th>
              <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "left" }}>Vehicle & Route</th>
              <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "left" }}>LR Details</th>
              <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "left" }}>Parcels</th>
              <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "right" }}>Freight (₹)</th>
              <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "center" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((item, idx) => {
              const tripDate = item.date ? formatDate(item.date) : (item.createdAt ? formatDate(item.createdAt) : "-");
              const parcels = item.parcels && item.parcels.length > 0 ? item.parcels : [{}];
              
              return parcels.map((p, pIdx) => (
                <tr key={`${idx}-${pIdx}`} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px" }}>
                    {pIdx === 0 && (
                      <>
                        <strong>{item.tripNo || "-"}</strong><br/>
                        <span style={{ color: "#64748b", fontSize: "8pt" }}>{tripDate}</span><br/>
                        <span style={{ color: "#475569", fontSize: "8pt" }}>{item.clientName}</span>
                      </>
                    )}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px" }}>
                    {pIdx === 0 && (
                      <>
                        <strong>{item.vehicleNo}</strong> <span style={{ color: "#64748b", fontSize: "8pt" }}>({item.vehicleType})</span><br/>
                        <span style={{ fontSize: "8pt" }}>{item.origin} &rarr; {item.destination}</span>
                      </>
                    )}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px" }}>
                    <strong>{p.lrNo || "-"}</strong><br/>
                    <span style={{ fontSize: "8pt", color: "#475569" }}>From: {p.consignor || "-"}</span><br/>
                    <span style={{ fontSize: "8pt", color: "#475569" }}>To: {p.consignee || "-"}</span>
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px" }}>
                    Box: {p.box || "0"} | Wt: {p.weight || "0"}<br/>
                    <span style={{ fontSize: "8pt", color: "#64748b" }}>{p.origin || "-"} &rarr; {p.destination || "-"}</span>
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "right" }}>
                    <strong>{parseFloat(p.freight || 0).toFixed(2)}</strong><br/>
                    {parseFloat(p.pickup || 0) > 0 && <span style={{ fontSize: "8pt", color: "#64748b" }}>+ Pickup: {p.pickup}</span>}
                    {parseFloat(p.delivery || 0) > 0 && <span style={{ fontSize: "8pt", color: "#64748b" }}>+ Del: {p.delivery}</span>}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "center", fontWeight: "bold", color: item.approvalStatus === 'Pending' ? '#d97706' : '#16a34a' }}>
                    {pIdx === 0 ? (item.approvalStatus || 'Approved') : ''}
                  </td>
                </tr>
              ));
            })}
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>No data available for the selected dates.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TripMIS;
