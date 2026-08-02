import React, { useState, useEffect } from "react";
import axios from "axios";
import { Search, Save, RefreshCw, Layers, Edit3, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import RupeeIcon from '../components/RupeeIcon';
import { formatDate } from '../utils/formatters';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const UpdateBill = () => {
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchParams] = useSearchParams();
  const billIdFromUrl = searchParams.get("id");

  // Form State
  const [form, setForm] = useState({
    billNo: "",
    createdAt: "",
    client: "",
    clientAddress: "",
    gstin: "",
    stateCode: "05",
    mode: "Road",
    sacCode: "996511",
    status: "pending",
    gst: 5,
    items: [],
    invoiceDetails: [{ invoiceNo: "", invoiceValue: "", invoiceDate: "", partNumber: "", ewayBill: "", quantity: "" }]
  });

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const res = await axios.get(`${API}/bills`);
      if (res.data.success) {
        const fetchedBills = res.data.data || [];
        setBills(fetchedBills);
        if (billIdFromUrl && !selectedBill) {
          const targetBill = fetchedBills.find(b => b.id === billIdFromUrl);
          if (targetBill) handleSelect(targetBill);
        }
      }
    } catch (err) {
      console.error("Fetch bills error", err);
    }
  };

  const handleSelect = (bill) => {
    setSelectedBill(bill);
    const dateFormatted = bill.createdAt ? new Date(bill.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    
    // Default items array if bill was simple
    const initialItems = (bill.items && bill.items.length > 0) ? bill.items : [
      {
        si: 1,
        lrNo: bill.lrNo || "204777",
        lrDt: bill.lrDate || "30-05-2026",
        ref: bill.refNo || "-",
        org: bill.origin || "DELHI",
        dest: bill.destination || "PANTNAGAR",
        pkg: bill.packages || "02",
        wt: bill.weight || "550",
        rate: bill.rate || "0",
        frg: bill.freight || "0",
        lr: bill.lrCharge || "0",
        pick: bill.pickupCharge || "0",
        del: bill.deliveryCharge || "0",
        spl: bill.specialCharge || bill.miscCharge || "6000",
        oth: bill.otherCharge || "0",
        total: parseFloat(bill.taxable || bill.subtotal || bill.amount || 6000).toFixed(2)
      }
    ];

    setForm({
      billNo: bill.billNo || "",
      createdAt: dateFormatted,
      client: bill.client || "",
      clientAddress: bill.clientAddress || "PLOT NO 15, SECTOR -10, SIDCUL PANTNAGAR -263153",
      gstin: bill.gstin || "05AAACB9378F1ZM",
      stateCode: bill.stateCode || "05",
      mode: bill.mode || "Road",
      sacCode: bill.sacCode || "996511",
      status: bill.status || "pending",
      gst: bill.gst !== undefined ? bill.gst : 5,
      items: initialItems,
      invoiceDetails: (bill.invoiceDetails && bill.invoiceDetails.length > 0) ? bill.invoiceDetails : [{ invoiceNo: "", invoiceValue: "", invoiceDate: "", partNumber: "", ewayBill: "", quantity: "" }]
    });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...form.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Auto calculate item total when charges/weight/rates change
    const item = updatedItems[index];
    const frg = parseFloat(item.frg || 0);
    const lr = parseFloat(item.lr || 0);
    const pick = parseFloat(item.pick || 0);
    const del = parseFloat(item.del || 0);
    const spl = parseFloat(item.spl || 0);
    const oth = parseFloat(item.oth || 0);
    const itemSubtotal = frg + lr + pick + del + spl + oth;
    item.total = itemSubtotal.toFixed(2);

    setForm({ ...form, items: updatedItems });
  };

  const addItemRow = () => {
    const newRow = {
      si: form.items.length + 1,
      lrNo: "",
      lrDt: formatDate(new Date()),
      ref: "-",
      org: "DELHI",
      dest: "PANTNAGAR",
      pkg: "1",
      wt: "100",
      rate: "0",
      frg: "0",
      lr: "0",
      pick: "0",
      del: "0",
      spl: "0",
      oth: "0",
      total: "0.00"
    };
    setForm({ ...form, items: [...form.items, newRow] });
  };

  const removeItemRow = (idx) => {
    if (form.items.length <= 1) return;
    const updated = form.items.filter((_, i) => i !== idx).map((item, i) => ({ ...item, si: i + 1 }));
    setForm({ ...form, items: updated });
  };

  const addInvoiceRow = () => {
    setForm({
      ...form,
      invoiceDetails: [...form.invoiceDetails, { invoiceNo: "", invoiceValue: "", invoiceDate: "", partNumber: "", ewayBill: "", quantity: "" }]
    });
  };

  const removeInvoiceRow = (index) => {
    setForm({
      ...form,
      invoiceDetails: form.invoiceDetails.filter((_, i) => i !== index)
    });
  };

  const updateInvoiceRow = (index, field, value) => {
    const updated = [...form.invoiceDetails];
    updated[index][field] = value;
    setForm({ ...form, invoiceDetails: updated });
  };

  // Calculations
  const calculatedTaxable = form.items.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
  const gstRate = parseFloat(form.gst || 0);
  const calculatedGst = calculatedTaxable * (gstRate / 100);
  
  const gstin = form.gstin || "";
  const clientStateCode = gstin ? gstin.substring(0, 2) : "";
  
  let calculatedCgst = 0, calculatedSgst = 0, calculatedIgst = 0;
  if (gstRate > 0) {
    if (clientStateCode === "05" || !clientStateCode) {
      calculatedCgst = calculatedGst / 2;
      calculatedSgst = calculatedGst / 2;
    } else {
      calculatedIgst = calculatedGst;
    }
  }
  
  const calculatedTotal = calculatedTaxable + calculatedGst;

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedBill) return;
    setSaving(true);

    const payload = {
      ...form,
      taxable: calculatedTaxable,
      subtotal: calculatedTaxable,
      cgst: calculatedCgst,
      sgst: calculatedSgst,
      igst: calculatedIgst,
      total: calculatedTotal,
      totalPayable: calculatedTotal,
      amount: calculatedTotal
    };

    try {
      await axios.put(`${API}/bills/${selectedBill.id}`, payload);
      alert("Invoice updated successfully!");
      setSelectedBill(null);
      fetchBills();
    } catch (err) {
      console.error("Update bill error", err);
      alert("Failed to update invoice");
    } finally {
      setSaving(false);
    }
  };

  const filtered = bills.filter(b =>
    !search || (b.billNo || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.client || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="header-flex" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem", color: "#0F172A" }}>Update & Manage Invoices</h3>
          <p className="text-muted">Edit weights, quantities, rates, LR numbers, and reference details for any invoice.</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="glass-panel" style={{ padding: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input 
              className="form-control" 
              placeholder="Search by Bill No, Client Name, or LR Number..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          <button className="btn btn-primary" style={{ padding: "0 1.5rem" }}><Search size={18} /></button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selectedBill ? "320px 1fr" : "1fr", gap: "1.5rem" }}>
        {/* Bill Selection Table */}
        <div className="glass-panel" style={{ padding: 0, overflow: "hidden", maxHeight: "800px", overflowY: "auto" }}>
          <div style={{ padding: "1rem", background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--border-color)", fontWeight: "700" }}>
            Select Invoice to Edit
          </div>
          <div className="table-responsive">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "rgba(0, 0, 0, 0.03)" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left" }}>Bill No</th>
                  <th style={{ padding: "0.75rem", textAlign: "left" }}>Client</th>
                  <th style={{ padding: "0.75rem", textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, index) => (
                  <tr 
                    key={index} 
                    style={{ 
                      borderTop: "1px solid rgba(0, 0, 0, 0.05)", 
                      cursor: "pointer", 
                      background: selectedBill?.id === item.id ? "rgba(13, 92, 150, 0.1)" : "transparent" 
                    }}
                    onClick={() => handleSelect(item)}
                  >
                    <td style={{ padding: "0.75rem", fontWeight: "700", color: "#0C4A6E" }}>#{item.billNo || item.id?.slice(-6)}</td>
                    <td style={{ padding: "0.75rem" }}>{item.client}</td>
                    <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: "700" }}>₹{parseFloat(item.total || item.amount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Full Executive Invoice Edit Form */}
        {selectedBill && (
          <div className="glass-panel" style={{ padding: "1.75rem", background: "#ffffff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "2px solid #0C4A6E", paddingBottom: "0.75rem" }}>
              <h4 style={{ margin: 0, fontSize: "1.25rem", color: "#0C4A6E", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Edit3 size={20} /> Editing Invoice: {form.billNo}
              </h4>
              <button 
                type="button" 
                onClick={() => setSelectedBill(null)}
                style={{ padding: "0.4rem 0.8rem", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}
              >
                Close Editor
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              {/* Header Fields Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem", background: "#F8FAFC", padding: "1rem", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div>
                  <label className="form-label" style={{ fontWeight: "700", fontSize: "0.8rem", color: "#334155" }}>Invoice Number</label>
                  <input className="form-control" value={form.billNo} onChange={(e) => setForm({ ...form, billNo: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: "700", fontSize: "0.8rem", color: "#334155" }}>Invoice Date</label>
                  <input type="date" className="form-control" value={form.createdAt} onChange={(e) => setForm({ ...form, createdAt: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: "700", fontSize: "0.8rem", color: "#334155" }}>Client Name</label>
                  <input className="form-control" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: "700", fontSize: "0.8rem", color: "#334155" }}>Client GSTIN</label>
                  <input className="form-control" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: "700", fontSize: "0.8rem", color: "#334155" }}>Mode</label>
                  <select className="form-control" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                    <option value="Road">Road</option>
                    <option value="Rail">Rail</option>
                    <option value="Air">Air</option>
                    <option value="Sea">Sea</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: "700", fontSize: "0.8rem", color: "#334155" }}>SAC Code</label>
                  <input className="form-control" value={form.sacCode} onChange={(e) => setForm({ ...form, sacCode: e.target.value })} />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label className="form-label" style={{ fontWeight: "700", fontSize: "0.8rem", color: "#334155" }}>Client Address</label>
                  <input className="form-control" value={form.clientAddress} onChange={(e) => setForm({ ...form, clientAddress: e.target.value })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: "700", fontSize: "0.8rem", color: "#334155" }}>State Code</label>
                  <input className="form-control" value={form.stateCode} onChange={(e) => setForm({ ...form, stateCode: e.target.value })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: "700", fontSize: "0.8rem", color: "#334155" }}>GST %</label>
                  <input type="number" className="form-control" value={form.gst} onChange={(e) => setForm({ ...form, gst: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: "700", fontSize: "0.8rem", color: "#334155" }}>Status</label>
                  <select className="form-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* INVOICE DETAILS */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.5rem", borderBottom: "1px solid #CBD5E1", marginBottom: "1rem" }}>
                  <label className="form-label" style={{ fontWeight: "800", color: "#0F172A", textTransform: "uppercase", marginBottom: 0, fontSize: "0.95rem" }}>INVOICE DETAILS</label>
                  <button type="button" onClick={addInvoiceRow} style={{ padding: "0.35rem 0.75rem", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}>
                    + Add Row
                  </button>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "5px", padding: "8px 0", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                   <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", paddingLeft: "4px" }}>Invoice No</div>
                   <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", paddingLeft: "4px" }}>Invoice Value</div>
                   <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", paddingLeft: "4px" }}>Invoice Date</div>
                   <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", paddingLeft: "4px" }}>Part Number</div>
                   <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", paddingLeft: "4px" }}>Eway Bill</div>
                   <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", paddingLeft: "4px" }}>Quantity</div>
                </div>
                {form.invoiceDetails.map((inv, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} value={inv.invoiceNo} onChange={(e) => updateInvoiceRow(i, "invoiceNo", e.target.value.toUpperCase())} />
                    <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} type="number" value={inv.invoiceValue} onChange={(e) => updateInvoiceRow(i, "invoiceValue", e.target.value)} />
                    <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} type="date" value={inv.invoiceDate} onChange={(e) => updateInvoiceRow(i, "invoiceDate", e.target.value)} />
                    <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} value={inv.partNumber} onChange={(e) => updateInvoiceRow(i, "partNumber", e.target.value)} />
                    <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} value={inv.ewayBill} onChange={(e) => updateInvoiceRow(i, "ewayBill", e.target.value)} />
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px", flex: 1 }} type="number" value={inv.quantity} onChange={(e) => updateInvoiceRow(i, "quantity", e.target.value)} />
                      {i > 0 && <button type="button" onClick={() => removeInvoiceRow(i)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px" }}>&times;</button>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Editable LR Items Table Grid */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <h5 style={{ margin: 0, fontWeight: "800", color: "#0F172A", fontSize: "0.95rem" }}>
                    Itemized LR Rows (Editable Weight, Quantity, Rates & Charges)
                  </h5>
                  <button type="button" onClick={addItemRow} style={{ padding: "0.35rem 0.75rem", background: "#0D5C96", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}>
                    + Add LR Row
                  </button>
                </div>

                <div className="table-responsive" style={{ border: "1px solid #CBD5E1", borderRadius: "6px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                    <thead>
                      <tr style={{ background: "#0F172A", color: "#FFFFFF" }}>
                        <th style={{ padding: "0.4rem", width: "30px", textAlign: "center" }}>#</th>
                        <th style={{ padding: "0.4rem", width: "85px" }}>LR NO</th>
                        <th style={{ padding: "0.4rem", width: "90px" }}>LR DT</th>
                        <th style={{ padding: "0.4rem", width: "85px" }}>REF NO</th>
                        <th style={{ padding: "0.4rem", width: "75px" }}>ORG</th>
                        <th style={{ padding: "0.4rem", width: "85px" }}>DEST</th>
                        <th style={{ padding: "0.4rem", width: "55px" }}>PKG</th>
                        <th style={{ padding: "0.4rem", width: "60px" }}>WT</th>
                        <th style={{ padding: "0.4rem", width: "60px" }}>RATE</th>
                        <th style={{ padding: "0.4rem", width: "65px" }}>FREIGHT</th>
                        <th style={{ padding: "0.4rem", width: "85px" }}>AWB CHARGE</th>
                        <th style={{ padding: "0.4rem", width: "55px" }}>PICK</th>
                        <th style={{ padding: "0.4rem", width: "55px" }}>DEL</th>
                        <th style={{ padding: "0.4rem", width: "60px" }}>SPL</th>
                        <th style={{ padding: "0.4rem", width: "55px" }}>OTH</th>
                        <th style={{ padding: "0.4rem", textAlign: "right" }}>TOTAL</th>
                        <th style={{ padding: "0.4rem", width: "30px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #E2E8F0" }}>
                          <td style={{ padding: "0.3rem", textAlign: "center", fontWeight: "700" }}>{idx + 1}</td>
                          <td style={{ padding: "0.3rem" }}>
                            <input className="form-control" style={{ padding: "0.25rem", fontSize: "0.75rem" }} value={item.lrNo} onChange={(e) => handleItemChange(idx, "lrNo", e.target.value)} />
                          </td>
                          <td style={{ padding: "0.3rem" }}>
                            <input className="form-control" style={{ padding: "0.25rem", fontSize: "0.75rem" }} value={item.lrDt} onChange={(e) => handleItemChange(idx, "lrDt", e.target.value)} />
                          </td>
                          <td style={{ padding: "0.3rem" }}>
                            <input className="form-control" style={{ padding: "0.25rem", fontSize: "0.75rem" }} value={item.ref} onChange={(e) => handleItemChange(idx, "ref", e.target.value)} />
                          </td>
                          <td style={{ padding: "0.3rem" }}>
                            <input className="form-control" style={{ padding: "0.25rem", fontSize: "0.75rem" }} value={item.org} onChange={(e) => handleItemChange(idx, "org", e.target.value)} />
                          </td>
                          <td style={{ padding: "0.3rem" }}>
                            <input className="form-control" style={{ padding: "0.25rem", fontSize: "0.75rem" }} value={item.dest} onChange={(e) => handleItemChange(idx, "dest", e.target.value)} />
                          </td>
                          <td style={{ padding: "0.3rem" }}>
                            <input type="number" className="form-control" style={{ padding: "0.25rem", fontSize: "0.75rem" }} value={item.pkg} onChange={(e) => handleItemChange(idx, "pkg", e.target.value)} />
                          </td>
                          <td style={{ padding: "0.3rem" }}>
                            <input type="number" className="form-control" style={{ padding: "0.25rem", fontSize: "0.75rem" }} value={item.wt} onChange={(e) => handleItemChange(idx, "wt", e.target.value)} />
                          </td>
                          <td style={{ padding: "0.3rem" }}>
                            <input type="number" className="form-control" style={{ padding: "0.25rem", fontSize: "0.75rem" }} value={item.rate} onChange={(e) => handleItemChange(idx, "rate", e.target.value)} />
                          </td>
                          <td style={{ padding: "0.3rem" }}>
                            <input type="number" className="form-control" style={{ padding: "0.25rem", fontSize: "0.75rem" }} value={item.frg} onChange={(e) => handleItemChange(idx, "frg", e.target.value)} />
                          </td>
                          <td style={{ padding: "0.3rem" }}>
                            <input type="number" className="form-control" style={{ padding: "0.25rem", fontSize: "0.75rem" }} value={item.lr} onChange={(e) => handleItemChange(idx, "lr", e.target.value)} />
                          </td>
                          <td style={{ padding: "0.3rem" }}>
                            <input type="number" className="form-control" style={{ padding: "0.25rem", fontSize: "0.75rem" }} value={item.pick} onChange={(e) => handleItemChange(idx, "pick", e.target.value)} />
                          </td>
                          <td style={{ padding: "0.3rem" }}>
                            <input type="number" className="form-control" style={{ padding: "0.25rem", fontSize: "0.75rem" }} value={item.del} onChange={(e) => handleItemChange(idx, "del", e.target.value)} />
                          </td>
                          <td style={{ padding: "0.3rem" }}>
                            <input type="number" className="form-control" style={{ padding: "0.25rem", fontSize: "0.75rem" }} value={item.spl} onChange={(e) => handleItemChange(idx, "spl", e.target.value)} />
                          </td>
                          <td style={{ padding: "0.3rem" }}>
                            <input type="number" className="form-control" style={{ padding: "0.25rem", fontSize: "0.75rem" }} value={item.oth} onChange={(e) => handleItemChange(idx, "oth", e.target.value)} />
                          </td>
                          <td style={{ padding: "0.3rem 0.4rem", textAlign: "right", fontWeight: "800" }}>₹{item.total}</td>
                          <td style={{ padding: "0.3rem", textAlign: "center" }}>
                            {form.items.length > 1 && (
                              <button type="button" onClick={() => removeItemRow(idx)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: 0 }}><Trash2 size={14} /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calculated Totals Preview Box */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F1F5F9", padding: "1rem 1.25rem", borderRadius: "8px", marginBottom: "1.5rem", border: "1px solid #CBD5E1" }}>
                <div>
                  <span style={{ fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Subtotal: <strong>₹{calculatedTaxable.toFixed(2)}</strong></span>
                  {calculatedIgst > 0 ? (
                    <span style={{ fontSize: "0.85rem", color: "#475569", fontWeight: "600", marginLeft: "1.5rem" }}>IGST ({gstRate}%): <strong>₹{calculatedIgst.toFixed(2)}</strong></span>
                  ) : (
                    <>
                      <span style={{ fontSize: "0.85rem", color: "#475569", fontWeight: "600", marginLeft: "1.5rem" }}>CGST ({gstRate/2}%): <strong>₹{calculatedCgst.toFixed(2)}</strong></span>
                      <span style={{ fontSize: "0.85rem", color: "#475569", fontWeight: "600", marginLeft: "1.5rem" }}>SGST ({gstRate/2}%): <strong>₹{calculatedSgst.toFixed(2)}</strong></span>
                    </>
                  )}
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: "900", color: "#0C4A6E" }}>
                  Total Payable: ₹{calculatedTotal.toFixed(2)}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                <button type="button" onClick={() => setSelectedBill(null)} className="btn" style={{ padding: "0 1.5rem", height: 46 }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: "0 2rem", height: 46 }}>
                  <Save size={18} /> {saving ? "Saving Changes..." : "Save Invoice Changes"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateBill;