import RupeeIcon from '../components/RupeeIcon';
import { formatDate } from '../utils/formatters';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { FileText, Search,   CheckCircle, Loader2, Calculator } from "lucide-react";
import CopyButton, { AwbBadge } from "../components/CopyButton";
import CreatableDropdown from "../components/CreatableDropdown";
import QuickAddModal from "../components/QuickAddModal";
import { useNavigate } from "react-router-dom";
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getCurrentFinancialYear, getFinancialYearOptions } from '../utils/financialYear';
import { useSocketSync } from '../hooks/useSocketSync';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const GenerateBill = () => {
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [rates, setRates] = useState([]);
  const [selected, setSelected] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [result, _setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const { _globalSettings } = useSettings();
  const { _user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [modalInitialName, setModalInitialName] = useState("");

  const [filters, setFilters] = useState({
    invoicePrefix: `MCPL/${getCurrentFinancialYear()}/`,
    invoiceNo: "",
    invoiceDate: "",
    client: "",
    mode: "",
    fromDate: "",
    toDate: "",
    gst: ""
  });

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

  const fetchData = async () => {
    try {
      const [bookingsRes, clientsRes, billsRes, ratesRes] = await Promise.all([
        axios.get(`${API}/unbilled`),
        axios.get(`${API}/clients`),
        axios.get(`${API}/bills`),
        axios.get(`${API}/rates`)
      ]);
      
      const fetchedRates = ratesRes.data.success ? ratesRes.data.data : [];
      setRates(fetchedRates);

      if (bookingsRes.data.success) {
        if (billsRes.data && billsRes.data.data) {
          let maxNum = 0;
          billsRes.data.data.forEach(bill => {
            
            // Calculate max invoice number
            const inv = bill.billNo || bill.invoice || "";
            const prefix = filters.invoicePrefix || `MCPL/${getCurrentFinancialYear()}/`;
            if (inv.startsWith(prefix)) {
              const numStr = inv.substring(prefix.length);
              const num = parseInt(numStr, 10);
              if (!isNaN(num) && num > maxNum) {
                maxNum = num;
              }
            }
          });
          
          const nextInvNo = String(maxNum + 1).padStart(4, '0');
          setFilters(prev => ({ ...prev, invoiceNo: nextInvNo }));
        }

        const unbilled = (bookingsRes.data.data || []).filter(b => {
          return b.status !== "Billed";
        }).map(b => {
          const bClient = (b.client || "").toString().trim().toLowerCase();
          const bOrigin = (b.origin || "").toString().trim().toLowerCase();
          const bDest = (b.destination || "").toString().trim().toLowerCase();
          const bMode = (b.mode || "Road").toString().trim();
          
          const wt = parseFloat(b.charge_wt || b.chargeable_weight || b.chargeWeight || b.weight_chargeable || b.weight || b.actual_wt || 0);
          let rateValue = parseFloat(b.rate || 0);
          let freight = (wt > 0 && rateValue > 0) ? (rateValue * wt) : (wt > 0 && b.freight_charge ? parseFloat(b.freight_charge) : 0);
          let awb = parseFloat(b.awb_charge || 0);
          let pickup = parseFloat(b.pickup_charge || 0);
          let delivery = parseFloat(b.delivery_charge || 0);
          
          const matchedRate = fetchedRates.find(r => {
            const rClient = (r.client?.name || r.client?.client || r.client || "").toString().trim().toLowerCase();
            const rOrigin = (r.origin?.name || r.origin?.city || r.origin || "").toString().trim().toLowerCase();
            const rDest = (r.destination?.name || r.destination?.city || r.destination || "").toString().trim().toLowerCase();
            return rClient === bClient && rOrigin === bOrigin && rDest === bDest;
          });

          if (matchedRate) {
            let foundRate = 0;
            let foundPickup = 0;
            let foundDelivery = 0;
            let foundAwb = parseFloat(matchedRate.awbCharge || 0);

            switch (bMode.toLowerCase()) {
              case "air": foundRate = parseFloat(matchedRate.airRate || 0); foundPickup = parseFloat(matchedRate.airPickup || 0); foundDelivery = parseFloat(matchedRate.airDelivery || 0); break;
              case "rail": 
              case "train": foundRate = parseFloat(matchedRate.trainRate || 0); foundPickup = parseFloat(matchedRate.trainPickup || 0); foundDelivery = parseFloat(matchedRate.trainDelivery || 0); break;
              case "road": foundRate = parseFloat(matchedRate.roadRate || 0); foundPickup = parseFloat(matchedRate.roadPickup || 0); foundDelivery = parseFloat(matchedRate.roadDelivery || 0); break;
              case "road express": foundRate = parseFloat(matchedRate.roadExpressRate || 0); foundPickup = parseFloat(matchedRate.roadExpressPickup || 0); foundDelivery = parseFloat(matchedRate.roadExpressDelivery || 0); break;
            }

            if (rateValue === 0 && foundRate > 0) rateValue = foundRate;
            
            if (foundRate > 0 && wt > 0) freight = foundRate * wt;
            if (awb === 0 && foundAwb > 0) awb = foundAwb;
            if (pickup === 0 && foundPickup > 0) pickup = foundPickup;
            if (delivery === 0 && foundDelivery > 0) delivery = foundDelivery;
          }

          return {
            ...b,
            editable_pkg: parseInt(b.box || b.pkg || b.boxes || b.package_count || b.packages || b.pcs || (b.dimensions && Array.isArray(b.dimensions) && b.dimensions.reduce((acc, d) => acc + (Number(d.boxCount) || 0), 0)) || 1),
            editable_wt: wt,
            editable_rate: rateValue,
            editable_freight: freight,
            editable_awb: awb,
            editable_pickup: pickup,
            editable_delivery: delivery,
            editable_special: parseFloat(b.packaging_charge || 0) + parseFloat(b.handling_charge || 0),
            editable_other: 0
          };
        });
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

  useSocketSync("unbilled", () => { fetchData(); });
  useSocketSync("bookings", () => { fetchData(); });
  useSocketSync("bills", () => { fetchData(); });

  useEffect(() => { 
    fetchData(); 
  }, []);

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    
    const newBookings = bookings.map(b => {
      const bClient = (b.client || "").toString().trim().toLowerCase();
      const bOrigin = (b.origin || "").toString().trim().toLowerCase();
      const bDest = (b.destination || "").toString().trim().toLowerCase();
      const effectiveMode = (filters.mode || b.mode || "Road").toString().trim();
      
      let rateValue = b.editable_rate;
      let freight = b.editable_freight;
      let awb = b.editable_awb;
      let pickup = b.editable_pickup;
      let delivery = b.editable_delivery;

      const matchedRate = rates.find(r => {
        const rClient = (r.client?.name || r.client?.client || r.client || "").toString().trim().toLowerCase();
        const rOrigin = (r.origin?.name || r.origin?.city || r.origin || "").toString().trim().toLowerCase();
        const rDest = (r.destination?.name || r.destination?.city || r.destination || "").toString().trim().toLowerCase();
        return rClient === bClient && rOrigin === bOrigin && rDest === bDest;
      });

      if (matchedRate) {
        let foundRate = 0;
        let foundPickup = 0;
        let foundDelivery = 0;
        let foundAwb = parseFloat(matchedRate.awbCharge || 0);

        switch (effectiveMode.toLowerCase()) {
          case "air": foundRate = parseFloat(matchedRate.airRate || 0); foundPickup = parseFloat(matchedRate.airPickup || 0); foundDelivery = parseFloat(matchedRate.airDelivery || 0); break;
          case "rail":
          case "train": foundRate = parseFloat(matchedRate.trainRate || 0); foundPickup = parseFloat(matchedRate.trainPickup || 0); foundDelivery = parseFloat(matchedRate.trainDelivery || 0); break;
          case "road": foundRate = parseFloat(matchedRate.roadRate || 0); foundPickup = parseFloat(matchedRate.roadPickup || 0); foundDelivery = parseFloat(matchedRate.roadDelivery || 0); break;
          case "road express": foundRate = parseFloat(matchedRate.roadExpressRate || 0); foundPickup = parseFloat(matchedRate.roadExpressPickup || 0); foundDelivery = parseFloat(matchedRate.roadExpressDelivery || 0); break;
        }

        if (foundRate > 0) rateValue = foundRate;
        const wt = parseFloat(b.editable_wt || b.charge_wt || b.weight_chargeable || b.weight || 0);
        if (foundRate > 0 && wt > 0) freight = foundRate * wt;
        if (foundAwb > 0) awb = foundAwb;
        if (foundPickup > 0) pickup = foundPickup;
        if (foundDelivery > 0) delivery = foundDelivery;
      }

      return {
        ...b,
        editable_rate: rateValue,
        editable_freight: freight,
        editable_awb: awb,
        editable_pickup: pickup,
        editable_delivery: delivery
      };
    });

    setBookings(newBookings);
    setHasSearched(true);
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleEditableChange = (id, field, value) => {
    const newBookings = bookings.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'editable_wt' || field === 'editable_rate') {
          updated.editable_freight = (parseFloat(updated.editable_wt || 0) * parseFloat(updated.editable_rate || 0)).toFixed(2);
        }
        return updated;
      }
      return item;
    });
    setBookings(newBookings);
  };

  const handleGenerate = async () => {
    if (selected.length === 0) return;
    if (!filters.invoiceNo) { addToast("Please enter an Invoice No before generating.", "warning"); return; }
    if (!filters.invoiceDate) { addToast("Please select an Invoice Date before generating.", "warning"); return; }
    if (!filters.gst) { addToast("Please select if GST is applicable before generating.", "warning"); return; }
    
    setGenerating(true);
    try {
      const selectedBookingsData = bookings.filter(b => selected.includes(b.id)).map(b => ({
        id: b.id,
        pkg: b.editable_pkg || 0,
        wt: b.editable_wt || 0,
        rate: b.editable_rate || 0,
        freight: b.editable_freight || 0,
        awb: b.editable_awb || 0,
        pickup: b.editable_pickup || 0,
        delivery: b.editable_delivery || 0,
        special: b.editable_special || 0,
        other: b.editable_other || 0
      }));

      const res = await axios.post(`${API}/bills/generate`, { 
        bookingIds: selected,
        bookingsData: selectedBookingsData,
        invoiceNo: `${filters.invoicePrefix}${filters.invoiceNo}`,
        invoiceDate: filters.invoiceDate,
        gst: filters.gst
      });
      addToast(`Invoice ${res.data?.invoice || res.data?.billNo || res.data?.data?.invoice || res.data?.data?.billNo || 'Generated'} Successfully!`, "success");
      navigate("/bills/all");
    } catch (err) { 
      console.error("Generate bill error", err); 
      addToast("Failed to generate bill", "error");
    }
    setGenerating(false);
  };

  // Filter bookings locally based on the form
  const filteredBookings = !hasSearched ? [] : bookings.filter(b => {
    let match = true;
    const filterClient = (filters.client && typeof filters.client === 'object' ? (filters.client.name || filters.client.client || '') : filters.client || "").trim().toLowerCase();
    const bClient = (b.client || "").trim().toLowerCase();
    
    if (filterClient) {
      const normFilter = filterClient.replace(/[^a-z0-9]/g, '');
      const normB = bClient.replace(/[^a-z0-9]/g, '');
      if (bClient !== filterClient && !normB.includes(normFilter) && !normFilter.includes(normB)) {
        match = false;
      }
    }
    if (filters.mode && (b.mode || "").toString().trim().toLowerCase() !== filters.mode.trim().toLowerCase()) match = false;

    if (filters.fromDate) {
      const bDate = new Date(b.dispatch_date || b.date || b.createdAt);
      const fDate = new Date(filters.fromDate);
      fDate.setHours(0, 0, 0, 0);
      if (!isNaN(bDate.getTime()) && bDate < fDate) match = false;
    }
    if (filters.toDate) {
      const bDate = new Date(b.dispatch_date || b.date || b.createdAt);
      const tDate = new Date(filters.toDate);
      tDate.setHours(23, 59, 59, 999);
      if (!isNaN(bDate.getTime()) && bDate > tDate) match = false;
    }

    return match;
  });

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "20px" }}>
      <div 
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "1rem 1.5rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          marginBottom: "1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ background: "#eff6ff", padding: "8px", borderRadius: "10px", display: "flex" }}>
            <Calculator size={22} style={{ color: "#3b82f6" }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.4rem", color: "#0f172a", fontWeight: 700 }}>Generate New Invoice</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem", marginTop: "2px" }}>Search unbilled trips and combine them into a single invoice.</p>
          </div>
        </div>
        
        <button 
          type="button"
          onClick={() => navigate("/bills/all")}
          style={{
            background: "#f1f5f9",
            color: "#475569",
            border: "1px solid #cbd5e1",
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s"
          }}
        >
          <FileText size={16} /> All Bills
        </button>
      </div>

      {result && (
        <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
          <CheckCircle size={32} color="#16a34a" />
          <div>
            <h5 style={{ color: "#16a34a", marginBottom: "0.25rem", margin: 0 }}>Invoice Generated Successfully!</h5>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#15803d" }}>Invoice No: <strong>{result.invoice || result.billNo || result.data?.invoice || result.data?.billNo}</strong></p>
          </div>
        </div>
      )}

      {/* SEARCH FORM */}
      <form onSubmit={handleSearch} style={{
          backgroundColor: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          marginBottom: "1.5rem",
          overflow: "hidden"
      }}>
        <div style={{ background: "linear-gradient(90deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)", height: "4px", width: "100%" }} />
        <div style={{ padding: "1.5rem 1.75rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Invoice Prefix *</label>
              <select name="invoicePrefix" value={filters.invoicePrefix} onChange={handleChange} style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box", backgroundColor: "white" }}>
                {getFinancialYearOptions(2025, 2030).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Invoice No *</label>
              <input type="text" name="invoiceNo" value={filters.invoiceNo} onChange={handleChange} style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Invoice Date *</label>
              <input type="date" min="1947-01-01" max="2200-12-31" name="invoiceDate" value={filters.invoiceDate} onChange={handleChange} style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Client *</label>
            <div style={{ background: "white", borderRadius: "8px", padding: "2px" }}>
              <CreatableDropdown 
                options={clients} 
                value={filters.client} 
                onChange={(val) => setFilters({ ...filters, client: val })} 
                onCreate={(name) => handleCreateNew("client", name)}
                placeholder="-- Please select the Client --" 
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.5fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Mode</label>
              <select name="mode" value={filters.mode} onChange={handleChange} style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box", backgroundColor: "white" }}>
                <option value="">-- All Modes --</option>
                <option value="Road">Road</option>
                <option value="Train">Train</option>
                <option value="Air">Air</option>
                <option value="Sea">Sea</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>From Date</label>
              <input type="date" min="1947-01-01" max="2200-12-31" name="fromDate" value={filters.fromDate} onChange={handleChange} style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>To Date</label>
              <input type="date" min="1947-01-01" max="2200-12-31" name="toDate" value={filters.toDate} onChange={handleChange} style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>GST Slab *</label>
              <select name="gst" value={filters.gst} onChange={handleChange} style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box", backgroundColor: "white" }}>
                <option value="">-- Select GST Slab --</option>
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button 
              type="submit" 
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                color: "white",
                border: "none",
                padding: "0.65rem 2rem",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.25)",
              }}
            >
              <Search size={16} /> SEARCH BOOKINGS
            </button>
          </div>
        </div>
      </form>

      {/* TABLE */}
      <div style={{ background: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}><Loader2 className="spinner" size={32} /></div>
        ) : (
          <div className="table-responsive">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(0, 0, 0, 0.02)" }}>
                <th style={{ padding: "0.75rem", textAlign: "left", width: 40, borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>
                  <input type="checkbox" onChange={(e) => setSelected(e.target.checked ? filteredBookings.map(b => b.id) : [])} checked={selected.length === filteredBookings.length && filteredBookings.length > 0} />
                </th>
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>Awb No</th>
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>Date</th>
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>Origin</th>
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>Destination</th>
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)", width: 90 }}>Pkg</th>
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)", width: 160 }}>Act / Chg Wt (Kg)</th>
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)", width: 100 }}>Rate</th>
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)", width: 110 }}>Freight</th>
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)", width: 110 }}>Awb Charge</th>
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)", width: 110 }}>Pickup</th>
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)", width: 110 }}>Delivery</th>
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)", width: 110 }}>Special Delivery</th>
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)", width: 110 }}>Other Charges</th>
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((item, index) => (
                <tr key={index} style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.05)", cursor: "pointer", background: selected.includes(item.id) ? "rgba(13, 110, 253, 0.05)" : "transparent" }} onClick={() => toggleSelect(item.id)}>
                  <td style={{ padding: "0.5rem" }}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleSelect(item.id)} onClick={(e) => e.stopPropagation()} /></td>
                  <td style={{ padding: "0.5rem", fontWeight: 600, fontSize: "0.8rem", whiteSpace: "nowrap" }}><AwbBadge awb={item.awb || item.consignment || item.id?.slice(-6) || index + 1} /></td>
                  <td style={{ padding: "0.5rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}>{item.dispatch_date || item.date || item.createdAt ? formatDate(item.dispatch_date || item.date || item.createdAt) : "-"}</td>
                  <td style={{ padding: "0.5rem", fontSize: "0.8rem" }}>{item.origin}</td>
                  <td style={{ padding: "0.5rem", fontSize: "0.8rem" }}>{item.destination}</td>
                  <td style={{ padding: "0.5rem", minWidth: "80px" }}>
                    <input type="number" style={{ width: "100%", minWidth: "70px", padding: "0.45rem 0.5rem", fontSize: "0.85rem", border: "1px solid #d1d5db", borderRadius: "4px", outline: "none", background: "#fff" }} value={item.editable_pkg} onChange={(e) => handleEditableChange(item.id, "editable_pkg", e.target.value)} onClick={(e) => e.stopPropagation()} title="Package Count" />
                  </td>
                  <td style={{ padding: "0.5rem", minWidth: "150px" }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Act: {item.actual_wt || item.actualWeight || item.weight || '0'} Kg</div>
                      <input type="number" step="any" style={{ width: "100%", padding: "0.45rem 0.5rem", fontSize: "0.85rem", border: "1px solid #d1d5db", borderRadius: "4px", outline: "none", background: "#fff" }} value={item.editable_wt} onChange={(e) => handleEditableChange(item.id, "editable_wt", e.target.value)} onClick={(e) => e.stopPropagation()} title="Charge Weight (Kg)" />
                    </div>
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <input type="number" style={{ width: "100%", minWidth: "80px", padding: "0.4rem 0.5rem", fontSize: "0.85rem", border: "1px solid #d1d5db", borderRadius: "4px", outline: "none", background: "#fff" }} value={item.editable_rate} onChange={(e) => handleEditableChange(item.id, "editable_rate", e.target.value)} onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <input type="number" style={{ width: "100%", minWidth: "90px", padding: "0.4rem 0.5rem", fontSize: "0.85rem", border: "1px solid #d1d5db", borderRadius: "4px", outline: "none", background: "#fff" }} value={item.editable_freight} onChange={(e) => handleEditableChange(item.id, "editable_freight", e.target.value)} onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <input type="number" style={{ width: "100%", minWidth: "90px", padding: "0.4rem 0.5rem", fontSize: "0.85rem", border: "1px solid #d1d5db", borderRadius: "4px", outline: "none", background: "#fff" }} value={item.editable_awb} onChange={(e) => handleEditableChange(item.id, "editable_awb", e.target.value)} onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <input type="number" style={{ width: "100%", minWidth: "90px", padding: "0.4rem 0.5rem", fontSize: "0.85rem", border: "1px solid #d1d5db", borderRadius: "4px", outline: "none", background: "#fff" }} value={item.editable_pickup} onChange={(e) => handleEditableChange(item.id, "editable_pickup", e.target.value)} onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <input type="number" style={{ width: "100%", minWidth: "90px", padding: "0.4rem 0.5rem", fontSize: "0.85rem", border: "1px solid #d1d5db", borderRadius: "4px", outline: "none", background: "#fff" }} value={item.editable_delivery} onChange={(e) => handleEditableChange(item.id, "editable_delivery", e.target.value)} onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <input type="number" style={{ width: "100%", minWidth: "90px", padding: "0.4rem 0.5rem", fontSize: "0.85rem", border: "1px solid #d1d5db", borderRadius: "4px", outline: "none", background: "#fff" }} value={item.editable_special} onChange={(e) => handleEditableChange(item.id, "editable_special", e.target.value)} onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <input type="number" style={{ width: "100%", minWidth: "90px", padding: "0.4rem 0.5rem", fontSize: "0.85rem", border: "1px solid #d1d5db", borderRadius: "4px", outline: "none", background: "#fff" }} value={item.editable_other} onChange={(e) => handleEditableChange(item.id, "editable_other", e.target.value)} onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td style={{ padding: "0.5rem", fontWeight: "700", color: "#10b981", fontSize: "0.8rem", whiteSpace: "nowrap" }}><span style={{ display: "inline-flex", alignItems: "center" }}><RupeeIcon size={12} />&nbsp;{(
                    parseFloat(item.editable_freight || 0) +
                    parseFloat(item.editable_awb || 0) +
                    parseFloat(item.editable_pickup || 0) +
                    parseFloat(item.editable_delivery || 0) +
                    parseFloat(item.editable_special || 0) +
                    parseFloat(item.editable_other || 0)
                  ).toFixed(2)}</span></td>
                </tr>
              ))}
              {filteredBookings.length === 0 && (
                <tr><td colSpan={15} style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>{hasSearched ? "No unbilled bookings found matching criteria." : "Select a client and click Search to load pending bookings."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
        <button 
          type="button" 
          onClick={handleGenerate} 
          disabled={selected.length === 0 || generating} 
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "white",
            border: "none",
            padding: "0.85rem 2.5rem",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
            opacity: selected.length === 0 || generating ? 0.5 : 1
          }}
        >
          <FileText size={18} />
          {generating ? "GENERATING..." : "GENERATE INVOICE"}
        </button>
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
