import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import Table from "../components/Table";
import { Plus, Truck, FileText, ClipboardList, CheckCircle, Loader2 } from "lucide-react";
import { TablePageSkeleton, FormPageSkeleton } from '../components/SkeletonLoader';
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import CreatableDropdown from "../components/CreatableDropdown";
import QuickAddModal from "../components/QuickAddModal";
import { formatAllCaps, formatTitleCase } from "../utils/formatters";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const Trips = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const [trips, setTrips] = useState([]);
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [modalInitialName, setModalInitialName] = useState("");
  const [pendingField, setPendingField] = useState({ index: null, field: "" });

  const handleCreateNew = (type, field, name, index = null) => {
    setModalType(type);
    setPendingField({ index, field });
    setModalInitialName(name);
    setModalOpen(true);
  };

  const handleModalSave = (data) => {
    if (modalType === "client") setClients([...clients, data]);
    else if (modalType === "city") setCities([...cities, data]);
    else if (modalType === "vendor") setVendors([...vendors, data]);

    const name = data.name || data.client || data.city;
    if (pendingField.index !== null) {
      updateMaterialRow(pendingField.index, pendingField.field, name);
    } else {
      setForm({ ...form, [pendingField.field]: name });
    }
  };
  
  const initialFormState = {
    tripNo: "", date: "", vehicleType: "", vehicleRate: "", vehicleNo: "",
    driverName: "", vendor: "", origin: "", destination: "",
    materialDetails: [{ clientName: "", lrNo: "", consignor: "", consignee: "", box: "", weight: "", chWeight: "", invoiceNo: "", bookingType: "", amount: "", paymentType: "" }],
    specialInstruction: ""
  };
  const [form, setForm] = useState(initialFormState);
  const [view, setView] = useState("manifest");

  useEffect(() => { 
    fetchData(); 
  }, []);

  const fetchData = async () => {
    try {
      const [tripsRes, clientsRes, vendorsRes, citiesRes] = await Promise.all([
        axios.get(`${API}/trips`),
        axios.get(`${API}/clients`),
        axios.get(`${API}/vendors`),
        axios.get(`${API}/cities`)
      ]);
      if (tripsRes.data.success) setTrips(tripsRes.data.data || []);
      if (clientsRes.data.success) setClients(clientsRes.data.data || []);
      if (vendorsRes.data.success) setVendors(vendorsRes.data.data || []);
      if (citiesRes.data.success) setCities(citiesRes.data.data || []);
    } catch (err) { console.error("Fetch data error", err); }
    finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);
    
    // Calculate total amount
    const totalAmount = form.materialDetails.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const tripData = { ...form, totalAmount };
    
    const tempId = "temp-" + Date.now();
    try {
      setTrips(prev => [{ ...tripData, id: tempId }, ...prev]);
      const res = await axios.post(`${API}/trips`, tripData);
      if (res.data.success && res.data.data) {
        setTrips(prev => prev.map(t => t.id === tempId ? res.data.data : t));
        setSuccess(true);
        setTimeout(() => {
            setSuccess(false);
            setShowForm(false);
            setForm(initialFormState);
        }, 2000);
      } else {
        fetchData();
      }
    } catch (err) {
      console.error("Save trip error", err);
      fetchData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({ title: "Delete Trip", message: "Are you sure you want to delete this trip?", confirmText: "Delete", cancelText: "Cancel" });
    if (!isConfirmed) return;
    setTrips(prev => prev.filter(t => t.id !== id));
    try {
      await axios.delete(`${API}/trips/${id}`);
    } catch (err) {
      console.error("Delete trip error", err);
      fetchData();
    }
  };

  const updateMaterialRow = (index, field, value) => {
    const updated = [...form.materialDetails];
    updated[index][field] = value;
    setForm({ ...form, materialDetails: updated });
  };

  const addMaterialRow = () => {
    setForm({ ...form, materialDetails: [...form.materialDetails, { clientName: "", lrNo: "", consignor: "", consignee: "", box: "", weight: "", chWeight: "", invoiceNo: "", bookingType: "", amount: "", paymentType: "" }] });
  };
  
  const removeMaterialRow = (index) => {
    setForm({ ...form, materialDetails: form.materialDetails.filter((_, i) => i !== index) });
  };

  if (loading) return <TablePageSkeleton />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem", color: "#111827" }}>Add Manifest</h3>
        </div>
        {!showForm && (
          <button className="btn btn-primary" style={{ padding: "0 1.5rem", height: "45px" }} onClick={() => setShowForm(true)}>
            <Plus size={18} /> New Manifest
          </button>
        )}
      </div>

      {success && (
        <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
          <CheckCircle size={32} color="#16a34a" />
          <div>
            <h5 style={{ color: "#16a34a", marginBottom: "0.25rem", margin: 0 }}>Manifest Created Successfully!</h5>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="glass-panel" style={{ padding: "2.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Trip No</label>
              <input type="text" className="form-control" value={form.tripNo} onChange={e => setForm({...form, tripNo: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Date<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <input type="date" className="form-control" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Vehicle Type<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <select className="form-control" value={form.vehicleType} onChange={e => setForm({...form, vehicleType: e.target.value})} required>
                <option value="">-- Please select the Type --</option>
                <option value="Open">Open</option>
                <option value="Container">Container</option>
                <option value="Trailer">Trailer</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Vehicle Rate<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <input type="number" className="form-control" placeholder="Enter Rate" value={form.vehicleRate} onChange={e => setForm({...form, vehicleRate: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Vehicle No<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <input type="text" className="form-control" placeholder="-- Please select the Vehicle no --" value={form.vehicleNo} onChange={e => setForm({...form, vehicleNo: formatAllCaps(e.target.value)})} required />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Driver Name<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <input type="text" className="form-control" value={form.driverName} onChange={e => setForm({...form, driverName: formatTitleCase(e.target.value)})} required />
            </div>
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
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Origin<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <CreatableDropdown 
                options={cities} 
                value={form.origin} 
                onChange={(city) => setForm({ ...form, origin: city })} 
                onCreate={(name) => handleCreateNew("city", "origin", name)}
                placeholder="-- Please select the Origin --" 
                format={formatAllCaps}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Destination<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <CreatableDropdown 
                options={cities} 
                value={form.destination} 
                onChange={(city) => setForm({ ...form, destination: city })} 
                onCreate={(name) => handleCreateNew("city", "destination", name)}
                placeholder="-- Please select the Destination --" 
                format={formatAllCaps}
              />
            </div>
          </div>

          {/* MATERIAL DETAILS */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.5rem", borderBottom: "1px solid #e5e7eb", marginBottom: "1rem" }}>
            <label className="form-label" style={{ fontWeight: "600", color: "#111827", textTransform: "uppercase", marginBottom: 0 }}>MATERIAL DETAILS<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <button type="button" onClick={addMaterialRow} style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", color: "#374151", cursor: "pointer", fontWeight: "600", fontSize: "0.875rem", padding: "4px 12px", display: "flex", alignItems: "center" }}>+ Add Row</button>
          </div>

          <div style={{ overflowX: "auto", marginBottom: "2rem", paddingBottom: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 0.5fr 0.8fr 0.8fr 1fr 1fr 1fr 1fr 30px", gap: "8px", minWidth: "1200px", padding: "8px 0", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", marginBottom: "10px" }}>
              {["Client Name", "LR No", "Consignor", "Consignee", "Box", "Weight", "Ch. Weight", "Invoice No", "Booking Type", "Amount", "Payment Type", ""].map((h, idx) => (
                <div key={idx} style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", paddingLeft: "4px" }}>{h}</div>
              ))}
            </div>
            
            {form.materialDetails.map((mat, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 0.5fr 0.8fr 0.8fr 1fr 1fr 1fr 1fr 30px", gap: "8px", minWidth: "1200px", marginBottom: "8px", alignItems: "center" }}>
                <CreatableDropdown 
                  options={clients} 
                  value={mat.clientName} 
                  onChange={val => updateMaterialRow(i, "clientName", val)} 
                  onCreate={(name) => handleCreateNew("client", "clientName", name, i)}
                  placeholder="-- Client --" 
                  format={formatAllCaps}
                />
                <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} value={mat.lrNo} onChange={e => updateMaterialRow(i, "lrNo", e.target.value)} />
                <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} value={mat.consignor} onChange={e => updateMaterialRow(i, "consignor", formatAllCaps(e.target.value))} />
                <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} value={mat.consignee} onChange={e => updateMaterialRow(i, "consignee", formatAllCaps(e.target.value))} />
                <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} type="number" value={mat.box} onChange={e => updateMaterialRow(i, "box", e.target.value)} />
                <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} type="number" step="0.01" value={mat.weight} onChange={e => updateMaterialRow(i, "weight", e.target.value)} />
                <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} type="number" step="0.01" value={mat.chWeight} onChange={e => updateMaterialRow(i, "chWeight", e.target.value)} />
                <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} value={mat.invoiceNo} onChange={e => updateMaterialRow(i, "invoiceNo", e.target.value)} />
                <select className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} value={mat.bookingType} onChange={e => updateMaterialRow(i, "bookingType", e.target.value)}>
                  <option value="">Booking Typ...</option>
                  <option value="Paid">Paid</option>
                  <option value="To Pay">To Pay</option>
                  <option value="TBB">TBB</option>
                </select>
                <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} type="number" step="0.01" value={mat.amount} onChange={e => updateMaterialRow(i, "amount", e.target.value)} />
                <select className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} value={mat.paymentType} onChange={e => updateMaterialRow(i, "paymentType", e.target.value)}>
                  <option value="">Payment Typ...</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="Credit">Credit</option>
                </select>
                {i > 0 ? (
                  <button type="button" onClick={() => removeMaterialRow(i)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>&times;</button>
                ) : <div/>}
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginBottom: "2rem" }}>
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Special Instruction<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="text" className="form-control" placeholder="Enter the Special Instruction" value={form.specialInstruction} onChange={e => setForm({...form, specialInstruction: e.target.value})} required />
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: "0 2rem", height: "45px" }}>
              {isSubmitting ? <><Loader2 size={18} className="spinner" /> Generating...</> : "ADD BOOKING"}
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="glass-panel" style={{ padding: "1rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {[
            { key: "manifest", label: "TRIP MANIFEST", icon: ClipboardList },
            { key: "list", label: "TRIP LIST", icon: Truck },
            { key: "sheet", label: "TRIP SHEET", icon: FileText },
            { key: "bill", label: "TRIP BILL", icon: FileText },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key}
              onClick={() => setView(key)}
              style={{
                flex: 1, padding: "0.75rem", borderRadius: 12, border: view === key ? "2px solid var(--primary-color)" : "1px solid rgba(0,0,0,0.1)",
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
          headers={["Trip No", "Date", "Vehicle Type", "Vehicle No", "Driver Name", "Vendor", "Origin", "Destination", "Material Details", "Total Amount", "Actions"]}
          data={trips}
          renderRow={(item, index) => (
            <tr key={item.id || index}>
              <td className="font-semibold">{item.tripNo || "-"}</td>
              <td>{item.date ? new Date(item.date).toLocaleDateString() : "-"}</td>
              <td>{item.vehicleType || "-"}</td>
              <td><Truck size={16} style={{ marginRight: 8, verticalAlign: "middle", color: "var(--primary-color)" }} />{item.vehicleNo || item.vehicle || "-"}</td>
              <td>{item.driverName || item.driver || "-"}</td>
              <td>{item.vendor || "-"}</td>
              <td>{item.origin || "-"}</td>
              <td>{item.destination || "-"}</td>
              <td>
                {item.materialDetails && item.materialDetails.length > 0 ? (
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxHeight: "100px", overflowY: "auto" }}>
                        {item.materialDetails.map((m, idx) => (
                            <div key={idx}>{m.lrNo} - {m.clientName}</div>
                        ))}
                    </div>
                ) : "-"}
              </td>
              <td style={{ fontWeight: "600", color: "#10b981" }}>{item.totalAmount || "0.00"}</td>
              <td>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button style={{ background: "rgba(13, 110, 253, 0.1)", border: "none", color: "var(--primary-color)", padding: "6px", borderRadius: "8px", cursor: "pointer" }}><FileText size={16} /></button>
                  {isSuperAdmin && (
                    <button onClick={() => handleDelete(item.id)} style={{ background: "rgba(220, 38, 38, 0.1)", border: "none", color: "#dc2626", padding: "6px", borderRadius: "8px", cursor: "pointer" }}>Delete</button>
                  )}
                </div>
              </td>
            </tr>
          )}
        />
      )}

      {view !== "manifest" && (
        <div className="glass-panel" style={{ padding: "2rem", textAlign: "center" }}>
          <FileText size={48} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
          <h4>{view.toUpperCase()}</h4>
          <p className="text-muted">Currently viewing the {view} tab.</p>
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

export default Trips;
