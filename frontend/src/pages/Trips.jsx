import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Table from "../components/Table";
import { Plus, Truck, FileText, ClipboardList, CheckCircle, Loader2, Eye, Download, Trash2, Printer, Search, Upload, AlertCircle } from "lucide-react";
import RupeeIcon from '../components/RupeeIcon';


import { TablePageSkeleton, FormPageSkeleton } from '../components/SkeletonLoader';
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import CreatableDropdown from "../components/CreatableDropdown";
import SearchableSelect from "../components/SearchableSelect";
import { formatAllCaps, formatTitleCase } from "../utils/formatters";
import { useNotification } from "../context/NotificationContext";
import { useToast } from "../context/ToastContext";
import { useSocketSync } from "../hooks/useSocketSync";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const Trips = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';
  const isAdminOrSuperAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const hasAccess = (perm) => isSuperAdmin || (user?.permissions || []).includes('all') || (user?.permissions || []).includes(perm);

  const [trips, setTrips] = useState([]);
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { refreshNotifications } = useNotification();
  const { addToast } = useToast();

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
    } catch (e) {
      console.error(e);
      addToast(`Failed to create ${type}`, "error");
    }
  };

  const initialFormState = {
    tripNo: "", mode: "", type: "", bookingType: "Normal", date: "", awbNo: "", cdNo: "",
    vendor: "", origin: "", destination: "",
    materialDetails: [{ clientName: "", lrNo: "", consignor: "", consignee: "", box: "", weight: "", chWeight: "", origin: "", destination: "", rate: "", freight: "", gst: "", amount: "" }],
    specialInstruction: ""
  };
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem('manifestFormDraft');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialFormState;
  });
  const [view, setView] = useState("manifest");

  useEffect(() => {
    localStorage.setItem('manifestFormDraft', JSON.stringify(form));
  }, [form]);

  // Default view handling for restricted roles
  useEffect(() => {
  }, [user]);

  useEffect(() => {
    fetchData();
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
    } catch (err) { console.error("Fetch data error", err); }
    finally { setLoading(false); }
  };

  useSocketSync("trips", fetchData);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);

    // Calculate total amount
    const totalAmount = form.materialDetails.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const tripData = { ...form, totalAmount, approvalStatus: 'Pending' };

    try {
      const res = await axios.post(`${API}/trips`, tripData);
      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setShowForm(false);
          setForm(initialFormState);
          localStorage.removeItem('manifestFormDraft');
        }, 2000);
      }
    } catch (err) {
      console.error("Save trip error", err);
    } finally {
      setIsSubmitting(false);
    }
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

  const handlePreviewManifest = (id) => {
    window.open(`/print-manifest/${id}`, "_blank");
  };

  const handleDownloadManifest = (id) => {
    window.open(`/print-manifest/${id}?download=true`, "_blank");
  };

  const updateMaterialRow = (index, field, value) => {
    const updated = [...form.materialDetails];
    updated[index][field] = value;
    
    if (field === 'chWeight' || field === 'rate') {
      const chWeight = parseFloat(updated[index].chWeight) || 0;
      const rate = parseFloat(updated[index].rate) || 0;
      if (chWeight > 0 && rate > 0) {
        const freight = chWeight * rate;
        const gstAmount = freight * 0.18;
        const total = freight + gstAmount;
        updated[index].freight = freight.toFixed(2);
        updated[index].gst = gstAmount.toFixed(2);
        updated[index].amount = total.toFixed(2);
      } else {
        updated[index].freight = "";
        updated[index].gst = "";
        updated[index].amount = "";
      }
    }
    
    setForm({ ...form, materialDetails: updated });
  };

  const addMaterialRow = () => {
    setForm({ ...form, materialDetails: [...form.materialDetails, { clientName: "", lrNo: "", consignor: "", consignee: "", box: "", weight: "", chWeight: "", origin: "", destination: "", rate: "", freight: "", gst: "", amount: "" }] });
  };

  const removeMaterialRow = (index) => {
    setForm({ ...form, materialDetails: form.materialDetails.filter((_, i) => i !== index) });
  };

  if (loading) return <TablePageSkeleton />;

  return (
    <div>
      <div className="header-flex no-print">
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem", color: "#111827" }}>
            {view === 'manifest' ? 'Transport Bookings (Train / Air / Road)' : 
             view === 'bill' ? 'Trip Bill' : 'Trips'}
          </h3>
        </div>
        {!showForm && hasAccess('trips') && (
          <button className="btn btn-primary" style={{ padding: "0 1.5rem", height: "45px" }} onClick={() => setShowForm(true)}>
            <Plus size={18} /> New Manifest
          </button>
        )}
      </div>

      {!showForm && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }} className="no-print">
          <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid #3b82f6" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "0.5rem" }}>Total Trips</div>
            <div style={{ fontSize: "1.875rem", fontWeight: "700", color: "#111827" }}>{trips.length}</div>
          </div>
          <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid #10b981" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "0.5rem" }}>Total Freight</div>
            <div style={{ fontSize: "1.875rem", fontWeight: "700", color: "#111827", display: "flex", alignItems: "center" }}>
              <RupeeIcon size={24} />{trips.reduce((sum, t) => sum + (parseFloat(t.totalAmount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid #f59e0b" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "0.5rem" }}>Train / Air / Road</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "#374151", display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
              <span><span style={{ color: "#a21caf" }}>T:</span> {trips.filter(t => t.mode?.toLowerCase() === 'train').length}</span>
              <span><span style={{ color: "#0ea5e9" }}>A:</span> {trips.filter(t => t.mode?.toLowerCase() === 'flight').length}</span>
              <span><span style={{ color: "#f97316" }}>R:</span> {trips.filter(t => t.mode?.toLowerCase() === 'road').length}</span>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>
                {form.mode === 'Train' ? 'Train No' : form.mode === 'Road' ? 'Vehicle No' : form.mode === 'Flight' ? 'Flight No' : 'Trip No'}
                <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
              </label>
              <input type="text" className="form-control" placeholder={`Enter ${form.mode === 'Train' ? 'Train No' : form.mode === 'Road' ? 'Vehicle No' : form.mode === 'Flight' ? 'Flight No' : 'Trip No'}`} value={form.tripNo} onChange={e => setForm({ ...form, tripNo: formatAllCaps(e.target.value) })} required />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Mode<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <select className="form-control" value={form.mode || ""} onChange={e => setForm({ ...form, mode: e.target.value, ...(e.target.value !== 'Flight' ? { cdNo: '' } : {}) })} required>
                <option value="">-- Select Mode --</option>
                <option value="Train">Train</option>
                <option value="Flight">Flight</option>
                <option value="Road">Road</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Type<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <input type="text" list="type-options" className="form-control" placeholder="Select or Type" value={form.type || ""} onChange={e => setForm({ ...form, type: formatAllCaps(e.target.value) })} required />
              <datalist id="type-options">
                {form.mode === 'Flight' && (
                  <>
                    <option value="GCR FLIGHT" />
                    <option value="PRIME FLIGHT" />
                    <option value="EXPRESS MODE" />
                  </>
                )}
                {form.mode === 'Train' && (
                  <>
                    <option value="EXPRESS" />
                    <option value="SUPERFAST" />
                    <option value="PASSENGER" />
                  </>
                )}
                {form.mode === 'Road' && (
                  <>
                    <option value="FTL" />
                    <option value="PTL" />
                    <option value="EXPRESS" />
                  </>
                )}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Booking Type<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <select className="form-control" value={form.bookingType || "Normal"} onChange={e => setForm({ ...form, bookingType: e.target.value })} required>
                <option value="Normal">Normal</option>
                <option value="Special">Special</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Date<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <input type="date" min="1947-01-01" max="2200-12-31" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>
          </div>



          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>AWB No</label>
              <input type="text" className="form-control" placeholder="Enter AWB No" value={form.awbNo} onChange={e => setForm({ ...form, awbNo: formatAllCaps(e.target.value) })} />
            </div>
            {form.mode === 'Flight' && (
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>CD No</label>
                <input type="text" className="form-control" placeholder="Enter CD No" value={form.cdNo} onChange={e => setForm({ ...form, cdNo: formatAllCaps(e.target.value) })} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Vendor<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <CreatableDropdown
                options={vendors}
                value={form.vendor}
                onChange={(val) => setForm({ ...form, vendor: val })}
                onCreate={(name) => handleCreateNew("vendor", "vendor", name)}
                placeholder="-- Please select the Vendor --"
                format={formatAllCaps}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>From<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <CreatableDropdown
                options={cities}
                value={form.origin}
                onChange={(city) => setForm({ ...form, origin: city })}
                onCreate={(name) => handleCreateNew("city", "origin", name)}
                placeholder="-- Please select From --"
                format={formatAllCaps}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>To<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <CreatableDropdown
                options={cities}
                value={form.destination}
                onChange={(city) => setForm({ ...form, destination: city })}
                onCreate={(name) => handleCreateNew("city", "destination", name)}
                placeholder="-- Please select To --"
                format={formatAllCaps}
              />
            </div>
          </div>

          {/* MATERIAL DETAILS */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.5rem", borderBottom: "1px solid #e5e7eb", marginBottom: "1rem" }}>
            <label className="form-label" style={{ fontWeight: "600", color: "#111827", textTransform: "uppercase", marginBottom: 0 }}>MATERIAL DETAILS<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <button type="button" onClick={addMaterialRow} style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", color: "#374151", cursor: "pointer", fontWeight: "600", fontSize: "0.875rem", padding: "4px 12px", display: "flex", alignItems: "center" }}>+ Add Row</button>
          </div>

          <div style={{ marginBottom: "2rem", paddingBottom: "1rem" }}>
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
                      options={cities}
                      value={mat.destination}
                      onChange={val => updateMaterialRow(i, "destination", val)}
                      onCreate={(name) => handleCreateNew("city", "destination", name, i)}
                      placeholder="-- To --"
                      format={formatAllCaps}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Consignor</label>
                    <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} value={mat.consignor} onChange={e => updateMaterialRow(i, "consignor", formatAllCaps(e.target.value))} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Consignee</label>
                    <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} value={mat.consignee} onChange={e => updateMaterialRow(i, "consignee", formatAllCaps(e.target.value))} />
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

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Rate</label>
                    <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} type="number" step="0.01" value={mat.rate} onChange={e => updateMaterialRow(i, "rate", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Freight</label>
                    <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px", background: "#f3f4f6" }} type="number" step="0.01" value={mat.freight} readOnly title="Auto-calculated: Ch. Weight * Rate" />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>GST (18%)</label>
                    <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px", background: "#f3f4f6" }} type="number" step="0.01" value={mat.gst} readOnly title="Auto-calculated: Freight * 18%" />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Total Amount</label>
                    <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px", background: "#f3f4f6" }} type="number" step="0.01" value={mat.amount} readOnly title="Auto-calculated (Freight + 18% GST)" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginBottom: "2rem" }}>
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Special Instruction<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="text" className="form-control" placeholder="Enter the Special Instruction" value={form.specialInstruction} onChange={e => setForm({ ...form, specialInstruction: e.target.value })} required />
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
            <button type="button" className="btn" onClick={() => setShowForm(false)} disabled={isSubmitting} style={{ padding: "0 2rem", height: "45px" }}>
              CANCEL
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: "0 2rem", height: "45px" }}>
              {isSubmitting ? <><Loader2 size={18} className="spinner" /> Generating...</> : "ADD BOOKING"}
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="glass-panel no-print" style={{ padding: "1rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {[
            { key: "manifest", label: "TRANSPORT BOOKINGS", icon: ClipboardList, permission: "trips" },
            { key: "bill", label: "TRIP BILL", icon: FileText, permission: "trips" },
          ].filter(tab => hasAccess(tab.permission)).map(({ key, label, icon: Icon }) => (
            <button key={key}
              onClick={() => setView(key)}
              style={{
                flex: 1, padding: "0.75rem", borderRadius: 12, border: view === key ? "2px solid var(--primary-color)" : "1px solid rgba(0, 0, 0, 0.1)",
                background: view === key ? "rgba(13, 110, 253, 0.05)" : "transparent", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}>
              <Icon size={18} color={view === key ? "var(--primary-color)" : "var(--text-muted)"} />
              <span style={{ color: view === key ? "var(--primary-color)" : "var(--text-dark)" }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {view === "manifest" && (
        <Table
          loading={loading}
          headers={["Trip No", "Mode", "Type", "Booking", "Date", "Vendor", "Origin", "Destination", "Material Details", "Total Amount", "Status", "Actions"]}
          data={trips}
          renderRow={(item, index) => (
            <tr key={item.id || index}>
              <td className="font-semibold">{item.tripNo || "-"}</td>
              <td style={{ textTransform: 'uppercase' }}>{item.mode || "-"}</td>
              <td style={{ textTransform: 'uppercase' }}>{item.type || "-"}</td>
              <td style={{ textTransform: 'uppercase' }}>{item.bookingType || "NORMAL"}</td>
              <td>{item.date ? new Date(item.date).toLocaleDateString() : "-"}</td>
              <td style={{ textTransform: 'uppercase' }}>{item.vendor || "-"}</td>
              <td style={{ textTransform: 'uppercase' }}>{item.origin || "-"}</td>
              <td style={{ textTransform: 'uppercase' }}>{item.destination || "-"}</td>
              <td>
                {item.materialDetails && item.materialDetails.length > 0 ? (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxHeight: "100px", overflowY: "auto" }}>
                    {item.materialDetails.map((m, idx) => (
                      <div key={idx}>{m.lrNo} - {m.clientName}</div>
                    ))}
                  </div>
                ) : "-"}
              </td>
              <td style={{ fontWeight: "600", color: "#10b981" }}><span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}><RupeeIcon size={14} />&nbsp;{item.totalAmount || "0.00"}</span></td>
              <td>
                <span style={{
                    padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600",
                    background: item.approvalStatus === 'Approved' ? '#dcfce7' : item.approvalStatus === 'Rejected' ? '#fee2e2' : item.approvalStatus === 'Pending' ? '#fef9c3' : '#e0e7ff',
                    color: item.approvalStatus === 'Approved' ? '#166534' : item.approvalStatus === 'Rejected' ? '#991b1b' : item.approvalStatus === 'Pending' ? '#854d0e' : '#3730a3'
                }}>
                  {item.approvalStatus || 'Approved'}
                </span>
              </td>
              <td>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", minWidth: "100px" }}>
                  <button onClick={() => handlePreviewManifest(item.id)} style={{ background: "rgba(13, 110, 253, 0.1)", border: "none", color: "var(--primary-color)", padding: "6px", borderRadius: "8px", cursor: "pointer" }} title="Preview Manifest"><Eye size={16} /></button>
                  <button onClick={() => handleDownloadManifest(item.id)} style={{ background: "rgba(16, 185, 129, 0.1)", border: "none", color: "#10b981", padding: "6px", borderRadius: "8px", cursor: "pointer" }} title="Download Manifest"><Download size={16} /></button>
                  
                  {isAdminOrSuperAdmin && (
                    <>
                      {item.approvalStatus !== 'Approved' && (
                        <button onClick={async () => {
                          try {
                            const res = await axios.put(`${API}/trips/${item.id}`, { approvalStatus: 'Approved' });
                            if(res.data.success) {
                               const newTrips = [...trips];
                               newTrips[index].approvalStatus = 'Approved';
                               setTrips(newTrips);
                               addToast("Trip Approved!", "success");
                            }
                          } catch(e) { addToast("Error approving trip", "error"); }
                        }} style={{ background: "#10b981", color: "white", border: "none", borderRadius: "4px", fontSize: "0.7rem", padding: "4px 8px", cursor: "pointer", fontWeight: "600" }}>Approve</button>
                      )}
                      
                      {item.approvalStatus !== 'Rejected' && (
                        <button onClick={async () => {
                          try {
                            const res = await axios.put(`${API}/trips/${item.id}`, { approvalStatus: 'Rejected' });
                            if(res.data.success) {
                               const newTrips = [...trips];
                               newTrips[index].approvalStatus = 'Rejected';
                               setTrips(newTrips);
                               addToast("Trip Rejected", "success");
                            }
                          } catch(e) { addToast("Error rejecting trip", "error"); }
                        }} style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "4px", fontSize: "0.7rem", padding: "4px 8px", cursor: "pointer", fontWeight: "600" }}>Reject</button>
                      )}

                      {item.approvalStatus !== 'Pending' && (
                        <button onClick={async () => {
                          try {
                            const res = await axios.put(`${API}/trips/${item.id}`, { approvalStatus: 'Pending' });
                            if(res.data.success) {
                               const newTrips = [...trips];
                               newTrips[index].approvalStatus = 'Pending';
                               setTrips(newTrips);
                               addToast("Trip Moved to Pending", "success");
                            }
                          } catch(e) { addToast("Error moving to pending", "error"); }
                        }} style={{ background: "#f59e0b", color: "white", border: "none", borderRadius: "4px", fontSize: "0.7rem", padding: "4px 8px", cursor: "pointer", fontWeight: "600" }}>Pending</button>
                      )}
                    </>
                  )}
                  {isSuperAdmin && (
                    <button onClick={() => handleDelete(item.id)} style={{ background: "rgba(220, 38, 38, 0.1)", border: "none", color: "#dc2626", padding: "6px", borderRadius: "8px", cursor: "pointer" }} title="Delete Trip">Delete</button>
                  )}
                </div>
              </td>
            </tr>
          )}
        />
      )}

      {view === "bill" && (
        <div className="glass-panel" style={{ padding: "2rem", textAlign: "center" }}>
          <FileText size={48} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
          <h4>TRIP BILL</h4>
          <p className="text-muted">Currently viewing the trip bill tab.</p>
        </div>
      )}

    </div>
  );
};

export default Trips;
