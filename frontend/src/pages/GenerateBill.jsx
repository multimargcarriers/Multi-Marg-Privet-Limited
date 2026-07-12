import RupeeIcon from '../components/RupeeIcon';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { FileText, Search, Download, Send, CheckCircle, Loader2 } from "lucide-react";
import SearchableSelect from "../components/SearchableSelect";
import CreatableDropdown from "../components/CreatableDropdown";
import QuickAddModal from "../components/QuickAddModal";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const GenerateBill = () => {
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [modalInitialName, setModalInitialName] = useState("");

  const handleCreateNew = (type, name) => {
    setModalType(type);
    setModalInitialName(name);
    setModalOpen(true);
  };

  const handleModalSave = (data) => {
    if (modalType === "client") {
      setClients([...clients, data]);
      setFilters({ ...filters, client: data.name || data.client });
    }
  };

  const [filters, setFilters] = useState({
    invoicePrefix: "MCPL/26-27/",
    invoiceNo: "",
    invoiceDate: "",
    client: "",
    mode: "",
    fromDate: "",
    toDate: "",
    gst: ""
  });

  useEffect(() => { 
    fetchData(); 
  }, []);

  const fetchData = async () => {
    try {
      const [bookingsRes, clientsRes] = await Promise.all([
        axios.get(`${API}/bookings`),
        axios.get(`${API}/clients`)
      ]);
      
      if (bookingsRes.data.success) {
        const unbilled = (bookingsRes.data.data || []).filter(b => b.status !== "Billed");
        setBookings(unbilled);
      }
      if (clientsRes.data.success) {
        setClients(clientsRes.data.data || []);
      }
    } catch (err) { 
      console.error("Fetch data error", err); 
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Normally we would refetch with filters here, but since we fetch all we can just filter locally for demo
    // or just trigger a refresh.
    console.log("Searching with filters:", filters);
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleGenerate = async () => {
    if (selected.length === 0) return;
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/bills/generate`, { 
        bookingIds: selected,
        invoiceNo: `${filters.invoicePrefix}${filters.invoiceNo}`,
        invoiceDate: filters.invoiceDate,
        gst: filters.gst === 'Yes'
      });
      setResult(res.data);
      setSelected([]);
      fetchData();
    } catch (err) { 
      console.error("Generate bill error", err); 
    }
    setGenerating(false);
  };

  // Filter bookings locally based on the form (specifically client and mode)
  const filteredBookings = bookings.filter(b => {
    let match = true;
    if (filters.client && typeof filters.client === 'object' ? b.client !== filters.client.name : (filters.client && b.client !== filters.client)) match = false;
    if (filters.mode && b.mode !== filters.mode) match = false;
    return match;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem", color: "#111827" }}>Generate Invoices</h3>
          <p className="text-muted">Select bookings and generate invoices/bills.</p>
        </div>
      </div>

      {result && (
        <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
          <CheckCircle size={32} color="#16a34a" />
          <div>
            <h5 style={{ color: "#16a34a", marginBottom: "0.25rem", margin: 0 }}>Invoice Generated Successfully!</h5>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#15803d" }}>Invoice No: <strong>{result.billNo || result.data?.billNo}</strong></p>
          </div>
        </div>
      )}

      {/* SEARCH FORM */}
      <form onSubmit={handleSearch} className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Invoice Prefix<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <select className="form-control" name="invoicePrefix" value={filters.invoicePrefix} onChange={handleChange} required>
              <option value="MCPL/26-27/">MCPL/26-27/</option>
              <option value="MCPL/25-26/">MCPL/25-26/</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Invoice No<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="text" className="form-control" name="invoiceNo" value={filters.invoiceNo} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Invoice Date<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="date" className="form-control" name="invoiceDate" value={filters.invoiceDate} onChange={handleChange} required />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: "1.5rem" }}>
          <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Client<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
          <CreatableDropdown 
            options={clients} 
            value={filters.client} 
            onChange={(val) => setFilters({ ...filters, client: val })} 
            onCreate={(name) => handleCreateNew("client", name)}
            placeholder="-- Please select the Client --" 
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.5fr", gap: "1.5rem", marginBottom: "2rem" }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Mode<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <select className="form-control" name="mode" value={filters.mode} onChange={handleChange}>
              <option value="">-- Please select the Mode --</option>
              <option value="Road">Road</option>
              <option value="Rail">Rail</option>
              <option value="Air">Air</option>
              <option value="Sea">Sea</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>From Date<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="date" className="form-control" name="fromDate" value={filters.fromDate} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>To Date<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="date" className="form-control" name="toDate" value={filters.toDate} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>GST<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <select className="form-control" name="gst" value={filters.gst} onChange={handleChange} required>
              <option value="">Please select if GST is applicable or not</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button 
            type="button" 
            onClick={handleGenerate} 
            disabled={selected.length === 0 || generating} 
            className="btn btn-primary" 
            style={{ padding: "0.5rem 3rem", height: "45px" }}
          >
            {generating ? "GENERATING..." : "ADD BILL"}
          </button>
        </div>
      </form>

      {/* TABLE */}
      <div className="glass-panel" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}><Loader2 className="spinner" size={32} /></div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(0, 0, 0, 0.02)" }}>
                <th style={{ padding: "1rem", textAlign: "left", width: 50, borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>
                  <input type="checkbox" onChange={(e) => setSelected(e.target.checked ? filteredBookings.map(b => b.id) : [])} checked={selected.length === filteredBookings.length && filteredBookings.length > 0} />
                </th>
                <th style={{ padding: "1rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.85rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>LR No</th>
                <th style={{ padding: "1rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.85rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>Client</th>
                <th style={{ padding: "1rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.85rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>Mode</th>
                <th style={{ padding: "1rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.85rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>Origin</th>
                <th style={{ padding: "1rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.85rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>Destination</th>
                <th style={{ padding: "1rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.85rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>Freight</th>
                <th style={{ padding: "1rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.85rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((item, index) => (
                <tr key={index} style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.05)", cursor: "pointer", background: selected.includes(item.id) ? "rgba(13, 110, 253, 0.05)" : "transparent" }} onClick={() => toggleSelect(item.id)}>
                  <td style={{ padding: "1rem" }}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleSelect(item.id)} onClick={(e) => e.stopPropagation()} /></td>
                  <td style={{ padding: "1rem", fontWeight: 600 }}>#{item.awb || item.consignment || item.id?.slice(-6) || index + 1}</td>
                  <td style={{ padding: "1rem" }}>{item.client}</td>
                  <td style={{ padding: "1rem" }}>{item.mode || "-"}</td>
                  <td style={{ padding: "1rem" }}>{item.origin}</td>
                  <td style={{ padding: "1rem" }}>{item.destination}</td>
                  <td style={{ padding: "1rem", fontWeight: "600", color: "#10b981" }}><RupeeIcon size={14} /> {parseFloat(item.freight_charge || item.freight || item.frieght || 0).toFixed(2)}</td>
                  <td style={{ padding: "1rem" }}>{item.dispatch_date || item.date || item.createdAt ? new Date(item.dispatch_date || item.date || item.createdAt).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
              {filteredBookings.length === 0 && (
                <tr><td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>No unbilled bookings found matching criteria.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

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

export default GenerateBill;
