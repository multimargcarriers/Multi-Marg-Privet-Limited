import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import Table from "../../components/Table";
import { Plus, Truck, Check, X, Clock, Trash2, Edit } from "lucide-react";
import RupeeIcon from '../../components/RupeeIcon';
import { formatAllCaps, formatTitleCase, formatDate } from "../../utils/formatters";
import { useToast } from "../../context/ToastContext";
import { AuthContext } from "../../context/AuthContext";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const VendorMIS = () => {
  const { addToast } = useToast();
  const { token, user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';
  const isAdminOrSuperAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const initialVendorMisRow = { handoverTo: "", date: "", from: "", vehicleNo: "", to: "", particular: "", mode: "", others: "", amount: "", status: "Pending" };
  const initialVendorMisForm = { vendorName: "", details: [ { ...initialVendorMisRow } ] };
  
  const [vendorMisEntries, setVendorMisEntries] = useState([]);

  useEffect(() => {
    if(token) {
      axios.get(`${API}/vendor-mis`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => { if(res.data.success) setVendorMisEntries(res.data.data); })
        .catch(err => console.error(err));
    }
  }, [token]);

  const [vendorMisForm, setVendorMisForm] = useState(initialVendorMisForm);
  const [showVendorMisForm, setShowVendorMisForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingStatus, setEditingStatus] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showVendorMisForm && e.ctrlKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setVendorMisForm(prev => ({
          ...prev, 
          details: [...prev.details, { ...initialVendorMisRow }]
        }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showVendorMisForm]);

  return (
    <div>
      <div className="header-flex" style={{ marginBottom: "1.5rem" }}>
         <h3 style={{ fontSize: "1.5rem", color: "#111827", margin: 0 }}>Vendor Vehicle MIS</h3>
         <div style={{ display: "flex", gap: "10px" }}>
           {!showVendorMisForm && (
             <button className="btn btn-primary" onClick={() => { setVendorMisForm(initialVendorMisForm); setEditingId(null); setEditingStatus(''); setShowVendorMisForm(true); }}>
               <Plus size={16} style={{ marginRight: 6 }} /> Add Vendor MIS Entry
             </button>
           )}
         </div>
      </div>
      
      {showVendorMisForm && (
         <form className="glass-panel slide-down" style={{ padding: "2rem", marginBottom: "2rem" }} onSubmit={async e => {
              e.preventDefault();
              if (!vendorMisForm.vendorName) return addToast("Vendor Name is required", "error");
              if (vendorMisForm.details.length === 0) return addToast("Add at least one detail row", "error");
              
              const totalAmount = vendorMisForm.details.reduce((sum, d) => sum + (parseFloat(d.amount) || 0) + (parseFloat(d.others) || 0), 0);
              
              const newEntry = {
                vendorName: vendorMisForm.vendorName,
                details: vendorMisForm.details,
                totalAmount: totalAmount,
                createdAt: new Date().toISOString()
              };
              
              try {
                if (editingId) {
                  const res = await axios.put(`${API}/vendor-mis/${editingId}`, newEntry, { headers: { Authorization: `Bearer ${token}` } });
                  if(res.data.success) {
                    setVendorMisEntries(vendorMisEntries.map(v => v.id === editingId ? { ...v, ...newEntry } : v));
                    setVendorMisForm(initialVendorMisForm);
                    setEditingId(null);
                    setEditingStatus('');
                    setShowVendorMisForm(false);
                    addToast("Vendor MIS entry updated successfully!", "success");
                  }
                } else {
                  const res = await axios.post(`${API}/vendor-mis`, newEntry, { headers: { Authorization: `Bearer ${token}` } });
                  if(res.data.success) {
                    setVendorMisEntries([res.data.data, ...vendorMisEntries]);
                    setVendorMisForm(initialVendorMisForm);
                    setShowVendorMisForm(false);
                    addToast("Vendor MIS entry added successfully!", "success");
                  }
                }
              } catch(err) {
                 addToast(editingId ? "Failed to update entry" : "Failed to add entry", "error");
              }
         }}>
            <h5 style={{ marginBottom: "1.5rem", color: "var(--primary-color)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Truck size={20} /> {editingId ? "Edit Vendor MIS Details" : "Enter Vendor MIS Details"}
            </h5>
            <div style={{ padding: "1.5rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "2rem" }}>
              <div className="form-group" style={{ maxWidth: "400px" }}>
                <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Vendor Name<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
                <input type="text" className="form-control" placeholder="Enter Vendor Name" value={vendorMisForm.vendorName} onChange={e => setVendorMisForm({...vendorMisForm, vendorName: formatAllCaps(e.target.value)})} required />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.5rem", borderBottom: "1px solid #e5e7eb", marginBottom: "1rem" }}>
              <label className="form-label" style={{ fontWeight: "600", color: "#111827", textTransform: "uppercase", marginBottom: 0 }}>DETAILS<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <button type="button" onClick={() => setVendorMisForm({...vendorMisForm, details: [...vendorMisForm.details, { ...initialVendorMisRow }]})} style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", color: "#374151", cursor: "pointer", fontWeight: "600", fontSize: "0.875rem", padding: "4px 12px", display: "flex", alignItems: "center" }}>+ Add Row <span style={{ fontSize: "0.65rem", marginLeft: "6px", color: "#6b7280" }}>(Ctrl + +)</span></button>
            </div>
            
            <div style={{ marginBottom: "2rem", paddingBottom: "1rem" }}>
              {vendorMisForm.details.map((detail, idx) => (
                <div key={idx} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1rem", marginBottom: "1rem", position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "0.5rem" }}>
                    <span style={{ fontWeight: "600", color: "#374151" }}>Detail #{idx + 1}</span>
                    {idx > 0 && (
                      <button type="button" onClick={() => {
                          const newDetails = vendorMisForm.details.filter((_, i) => i !== idx);
                          setVendorMisForm({...vendorMisForm, details: newDetails});
                      }} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", fontSize: "0.875rem", fontWeight: "600" }}>
                        Remove Detail
                      </button>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Date</label>
                      <input type="date" className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} value={detail.date} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].date = e.target.value; setVendorMisForm({...vendorMisForm, details: newDetails}); }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>From</label>
                      <input className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="From" value={detail.from} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].from = formatAllCaps(e.target.value); setVendorMisForm({...vendorMisForm, details: newDetails}); }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>To</label>
                      <input className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="To" value={detail.to} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].to = formatAllCaps(e.target.value); setVendorMisForm({...vendorMisForm, details: newDetails}); }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Particular</label>
                      <input className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="Particular" value={detail.particular} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].particular = formatAllCaps(e.target.value); setVendorMisForm({...vendorMisForm, details: newDetails}); }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Mode</label>
                      <select className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} value={detail.mode} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].mode = e.target.value; setVendorMisForm({...vendorMisForm, details: newDetails}); }}>
                          <option value="">Mode...</option>
                          <option value="Air">Air</option>
                          <option value="Road">Road</option>
                          <option value="Train">Train</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Vehicle No</label>
                      <input className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="Vehicle No" value={detail.vehicleNo} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].vehicleNo = formatAllCaps(e.target.value); setVendorMisForm({...vendorMisForm, details: newDetails}); }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Others (₹)</label>
                      <input className="form-control" type="number" step="0.01" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="Others" value={detail.others} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].others = e.target.value; setVendorMisForm({...vendorMisForm, details: newDetails}); }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Amount (₹)</label>
                      <input className="form-control" type="number" step="0.01" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="Amount" value={detail.amount} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].amount = e.target.value; setVendorMisForm({...vendorMisForm, details: newDetails}); }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Handover To</label>
                      <input className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="Handover To" value={detail.handoverTo} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].handoverTo = formatAllCaps(e.target.value); setVendorMisForm({...vendorMisForm, details: newDetails}); }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Status</label>
                      <div style={{ fontSize: "0.85rem", padding: "8px", background: "#f3f4f6", color: "#6b7280", borderRadius: "4px", textAlign: "center", border: "1px solid #e5e7eb", height: "37px", display: "flex", alignItems: "center", justifyContent: "center" }}>Pending</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={() => { setShowVendorMisForm(false); setEditingId(null); setEditingStatus(''); setVendorMisForm(initialVendorMisForm); }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ padding: "0 2rem" }}>{editingId ? "Update Vendor MIS Entry" : "Save Vendor MIS Entry"}</button>
            </div>
         </form>
      )}

      <div className="table-responsive">
        <Table 
          loading={false}
          headers={["Vendor Name", "Date Created", "Details", "Total Amount", "Status", "Actions"]}
          data={vendorMisEntries}
          emptyMessage="No Vendor MIS entries added yet. Click 'Add Vendor MIS Entry' to start."
          renderRow={(item, idx) => (
            <tr key={idx}>
              <td className="font-semibold" style={{ color: "#1e3a8a", whiteSpace: "nowrap" }}>
                {item.vendorName || "-"}
                {isAdminOrSuperAdmin && (
                  <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "normal", marginTop: "4px" }}>
                    By: {item.creatorName || 'Unknown (Old Entry)'}
                  </div>
                )}
              </td>
              <td style={{ whiteSpace: "nowrap" }}>{item.createdAt ? formatDate(item.createdAt) : "-"}</td>
              <td style={{ padding: 0 }}>
                <div style={{ maxHeight: "300px", overflowY: "auto", margin: "10px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <table style={{ width: "100%", fontSize: "0.75rem", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Date</th>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Vehicle</th>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Route</th>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Particular</th>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Mode</th>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Handover</th>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Oth (₹)</th>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Amt (₹)</th>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.details?.map((p, i) => (
                        <tr key={i} style={{ borderBottom: i < item.details.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: "#64748b" }}>{p.date ? formatDate(p.date) : "-"}</td>
                          <td style={{ padding: "8px 12px", fontWeight: "600", color: "#1e293b", whiteSpace: "nowrap" }}>{p.vehicleNo || "-"}</td>
                          <td style={{ padding: "8px 12px", color: "#334155" }}>{p.from} <span style={{color:"#94a3b8"}}>→</span> {p.to}</td>
                          <td style={{ padding: "8px 12px", color: "#475569" }}>{p.particular || "-"}</td>
                          <td style={{ padding: "8px 12px", color: "#475569" }}>{p.mode || "-"}</td>
                          <td style={{ padding: "8px 12px", color: "#475569" }}>{p.handoverTo || "-"}</td>
                          <td style={{ padding: "8px 12px", color: "#64748b" }}>{p.others || "0"}</td>
                          <td style={{ padding: "8px 12px", fontWeight: "600", color: "#10b981" }}>{parseFloat(p.amount||0).toFixed(2)}</td>
                          <td style={{ padding: "8px 12px" }}>
                            {isAdminOrSuperAdmin ? (
                              <select 
                                style={{ fontSize: "0.7rem", padding: "4px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", outline: "none", color: p.status === "Approved" ? "#065f46" : p.status === "Rejected" ? "#991b1b" : "#92400e" }}
                                value={p.status || "Pending"}
                                onChange={async (e) => {
                                    const updatedStatus = e.target.value;
                                    const updatedDetails = [...item.details];
                                    updatedDetails[i].status = updatedStatus;
                                    try {
                                        const res = await axios.put(`${API}/vendor-mis/${item.id}`, { details: updatedDetails }, { headers: { Authorization: `Bearer ${token}` } });
                                        if (res.data.success) {
                                            const updated = [...vendorMisEntries];
                                            const entryIndex = vendorMisEntries.findIndex(entry => entry.id === item.id);
                                            if(entryIndex > -1) {
                                                updated[entryIndex].details = updatedDetails;
                                                setVendorMisEntries(updated);
                                            }
                                        }
                                    } catch(err) {
                                        addToast("Failed to update status", "error");
                                    }
                                }}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                              </select>
                            ) : (
                              <span style={{ fontSize: "0.7rem", padding: "3px 6px", borderRadius: "12px", fontWeight: 500, background: p.status === "Approved" ? "#d1fae5" : p.status === "Rejected" ? "#fee2e2" : "#fef3c7", color: p.status === "Approved" ? "#065f46" : p.status === "Rejected" ? "#991b1b" : "#92400e", display: "inline-block", textAlign: "center", minWidth: "60px" }}>
                                {p.status || "Pending"}
                              </span>
                            )}
                          </td>
                        </tr>
                      )) || (<tr><td colSpan="9" style={{padding: "8px", textAlign: "center", color: "#94a3b8"}}>No details added</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </td>
              <td style={{ whiteSpace: "nowrap", fontWeight: "700", color: "#10b981" }}>
                <RupeeIcon size={14} />{parseFloat(item.totalAmount || 0).toFixed(2)}
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
              <td style={{ textAlign: "right" }}>
                <div className="action-buttons-wrapper">
                  {isAdminOrSuperAdmin && (
                    <>
                      {item.approvalStatus !== 'Approved' && (
                        <button onClick={async () => {
                          try {
                            const res = await axios.put(`${API}/vendor-mis/${item.id}`, { approvalStatus: 'Approved' }, { headers: { Authorization: `Bearer ${token}` } });
                            if(res.data.success) {
                               const newEntries = [...vendorMisEntries];
                               newEntries[idx].approvalStatus = 'Approved';
                               setVendorMisEntries(newEntries);
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
                            const res = await axios.put(`${API}/vendor-mis/${item.id}`, { approvalStatus: 'Rejected' }, { headers: { Authorization: `Bearer ${token}` } });
                            if(res.data.success) {
                               const newEntries = [...vendorMisEntries];
                               newEntries[idx].approvalStatus = 'Rejected';
                               setVendorMisEntries(newEntries);
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
                            const res = await axios.put(`${API}/vendor-mis/${item.id}`, { approvalStatus: 'Pending' }, { headers: { Authorization: `Bearer ${token}` } });
                            if(res.data.success) {
                               const newEntries = [...vendorMisEntries];
                               newEntries[idx].approvalStatus = 'Pending';
                               setVendorMisEntries(newEntries);
                               addToast("Entry Moved to Pending", "success");
                            }
                          } catch(e) { addToast("Error moving to pending", "error"); }
                        }} className="action-btn action-btn-warning">
                          <Clock size={14} /> Pending
                        </button>
                      )}
                      
                      <button onClick={async () => {
                         if(window.confirm("Are you sure you want to delete this Vendor MIS entry?")) {
                            try {
                               const res = await axios.delete(`${API}/vendor-mis/${item.id}`, { headers: { Authorization: `Bearer ${token}` } });
                               if(res.data.success) {
                                 setVendorMisEntries(vendorMisEntries.filter((_, i) => i !== idx));
                                 addToast("Entry deleted successfully", "success");
                               }
                            } catch(err) {
                               addToast("Failed to delete entry", "error");
                            }
                         }
                      }} className="action-btn action-btn-secondary">
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                  {(isAdminOrSuperAdmin || (user?.role === 'Vendor' && item.createdBy === user?.id && item.approvalStatus !== 'Approved')) && (
                    <button onClick={() => {
                      setVendorMisForm(item);
                      setEditingId(item.id);
                      setEditingStatus(item.approvalStatus || 'Pending');
                      setShowVendorMisForm(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} className="action-btn action-btn-primary">
                      <Edit size={14} /> Edit
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )}
        />
      </div>
    </div>
  );
};

export default VendorMIS;
