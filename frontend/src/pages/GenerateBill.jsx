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
  const [rates, setRates] = useState([]);
  const [selected, setSelected] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

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
      const [bookingsRes, clientsRes, billsRes, ratesRes] = await Promise.all([
        axios.get(`${API}/bookings`),
        axios.get(`${API}/clients`),
        axios.get(`${API}/bills`),
        axios.get(`${API}/rates`)
      ]);
      
      const fetchedRates = ratesRes.data.success ? ratesRes.data.data : [];
      setRates(fetchedRates);

      if (bookingsRes.data.success) {
        let pendingLrNos = new Set();
        if (billsRes.data && billsRes.data.data) {
          billsRes.data.data.forEach(bill => {
            if (bill.status === "pending" || bill.status === "Pending") {
              if (bill.items) {
                bill.items.forEach(item => pendingLrNos.add(item.lrNo));
              }
            }
          });
        }

        const unbilled = (bookingsRes.data.data || []).filter(b => {
          const isTrulyUnbilled = b.status !== "Billed";
          const isPendingInBill = b.status === "Billed" && (pendingLrNos.has(b.awb) || pendingLrNos.has(b.id));
          return isTrulyUnbilled || isPendingInBill;
        }).map(b => {
          const bClient = (b.client || "").toString().trim().toLowerCase();
          const bOrigin = (b.origin || "").toString().trim().toLowerCase();
          const bDest = (b.destination || "").toString().trim().toLowerCase();
          const bMode = (b.mode || "Road").toString().trim();
          
          let rateValue = parseFloat(b.rate || 0);
          let freight = parseFloat(b.freight_charge || b.freight || b.frieght || 0);
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

            switch (bMode) {
              case "Air": foundRate = parseFloat(matchedRate.airRate || 0); foundPickup = parseFloat(matchedRate.airPickup || 0); foundDelivery = parseFloat(matchedRate.airDelivery || 0); break;
              case "Rail": foundRate = parseFloat(matchedRate.trainRate || 0); foundPickup = parseFloat(matchedRate.trainPickup || 0); foundDelivery = parseFloat(matchedRate.trainDelivery || 0); break;
              case "Road": foundRate = parseFloat(matchedRate.roadRate || 0); foundPickup = parseFloat(matchedRate.roadPickup || 0); foundDelivery = parseFloat(matchedRate.roadDelivery || 0); break;
              case "Road Express": foundRate = parseFloat(matchedRate.roadExpressRate || 0); foundPickup = parseFloat(matchedRate.roadExpressPickup || 0); foundDelivery = parseFloat(matchedRate.roadExpressDelivery || 0); break;
            }

            if (rateValue === 0 && foundRate > 0) rateValue = foundRate;
            
            const wt = parseFloat(b.weight_chargeable || b.weight || 0);
            if (freight === 0 && foundRate > 0 && wt > 0) freight = foundRate * wt;
            if (awb === 0 && foundAwb > 0) awb = foundAwb;
            if (pickup === 0 && foundPickup > 0) pickup = foundPickup;
            if (delivery === 0 && foundDelivery > 0) delivery = foundDelivery;
          }

          return {
            ...b,
            editable_pkg: parseInt(b.package_count || b.pcs || b.packages || 1),
            editable_wt: parseFloat(b.weight_chargeable || b.weight || 0),
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

        switch (effectiveMode) {
          case "Air": foundRate = parseFloat(matchedRate.airRate || 0); foundPickup = parseFloat(matchedRate.airPickup || 0); foundDelivery = parseFloat(matchedRate.airDelivery || 0); break;
          case "Rail": foundRate = parseFloat(matchedRate.trainRate || 0); foundPickup = parseFloat(matchedRate.trainPickup || 0); foundDelivery = parseFloat(matchedRate.trainDelivery || 0); break;
          case "Road": foundRate = parseFloat(matchedRate.roadRate || 0); foundPickup = parseFloat(matchedRate.roadPickup || 0); foundDelivery = parseFloat(matchedRate.roadDelivery || 0); break;
          case "Road Express": foundRate = parseFloat(matchedRate.roadExpressRate || 0); foundPickup = parseFloat(matchedRate.roadExpressPickup || 0); foundDelivery = parseFloat(matchedRate.roadExpressDelivery || 0); break;
        }

        if (foundRate > 0) rateValue = foundRate;
        const wt = parseFloat(b.editable_wt || b.weight_chargeable || b.weight || 0);
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
    if (!filters.invoiceNo) { alert("Please enter an Invoice No before generating."); return; }
    if (!filters.invoiceDate) { alert("Please select an Invoice Date before generating."); return; }
    if (!filters.gst) { alert("Please select if GST is applicable before generating."); return; }
    
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

  // Filter bookings locally based on the form
  const filteredBookings = !hasSearched ? [] : bookings.filter(b => {
    let match = true;
    const filterClient = (filters.client && typeof filters.client === 'object' ? filters.client.name : filters.client || "").trim().toLowerCase();
    const bClient = (b.client || "").trim().toLowerCase();
    
    if (filterClient && bClient !== filterClient) match = false;
    if (filters.mode && b.mode !== filters.mode) match = false;
    return match;
  });

  return (
    <div>
      <div className="header-flex">
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
            <select className="form-control" name="invoicePrefix" value={filters.invoicePrefix} onChange={handleChange}>
              <option value="MCPL/26-27/">MCPL/26-27/</option>
              <option value="MCPL/25-26/">MCPL/25-26/</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Invoice No<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="text" className="form-control" name="invoiceNo" value={filters.invoiceNo} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Invoice Date<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="date" min="1947-01-01" max="2200-12-31" className="form-control" name="invoiceDate" value={filters.invoiceDate} onChange={handleChange} />
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
            <input type="date" min="1947-01-01" max="2200-12-31" className="form-control" name="fromDate" value={filters.fromDate} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>To Date<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="date" min="1947-01-01" max="2200-12-31" className="form-control" name="toDate" value={filters.toDate} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>GST<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <select className="form-control" name="gst" value={filters.gst} onChange={handleChange}>
              <option value="">Please select if GST is applicable or not</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
          <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem 3rem", height: "45px" }}>
            SEARCH
          </button>
        </div>
      </form>

      {/* TABLE */}
      <div className="glass-panel" style={{ padding: 0, overflow: "hidden" }}>
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
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)", width: 80 }}>Pkg</th>
                <th style={{ padding: "0.75rem", textAlign: "left", color: "#374151", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", borderBottom: "1px solid rgba(0, 0, 0, 0.05)", width: 100 }}>Weight</th>
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
                  <td style={{ padding: "0.5rem", fontWeight: 600, fontSize: "0.8rem", whiteSpace: "nowrap" }}>#{item.awb || item.consignment || item.id?.slice(-6) || index + 1}</td>
                  <td style={{ padding: "0.5rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}>{item.dispatch_date || item.date || item.createdAt ? new Date(item.dispatch_date || item.date || item.createdAt).toLocaleDateString() : "-"}</td>
                  <td style={{ padding: "0.5rem", fontSize: "0.8rem" }}>{item.origin}</td>
                  <td style={{ padding: "0.5rem", fontSize: "0.8rem" }}>{item.destination}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <input type="number" style={{ width: "100%", minWidth: "65px", padding: "0.4rem 0.5rem", fontSize: "0.85rem", border: "1px solid #d1d5db", borderRadius: "4px", outline: "none", background: "#fff" }} value={item.editable_pkg} onChange={(e) => handleEditableChange(item.id, "editable_pkg", e.target.value)} onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <input type="number" style={{ width: "100%", minWidth: "80px", padding: "0.4rem 0.5rem", fontSize: "0.85rem", border: "1px solid #d1d5db", borderRadius: "4px", outline: "none", background: "#fff" }} value={item.editable_wt} onChange={(e) => handleEditableChange(item.id, "editable_wt", e.target.value)} onClick={(e) => e.stopPropagation()} />
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

      <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
        <button 
          type="button" 
          onClick={handleGenerate} 
          disabled={selected.length === 0 || generating} 
          className="btn btn-primary" 
          style={{ padding: "0.75rem 3rem", fontSize: "1rem", fontWeight: "bold" }}
        >
          {generating ? "GENERATING..." : "GENERATE & PRINT"}
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
