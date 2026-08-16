import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { CheckCircle, FileText, Loader2,  FileCheck } from "lucide-react";

import CreatableDropdown from "../components/CreatableDropdown";
import { FormPageSkeleton } from '../components/SkeletonLoader';
import { formatAllCaps } from "../utils/formatters";
import { useNotification } from "../context/NotificationContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import PodEntryModal from "../components/pod/PodEntryModal";
import { AnimatePresence } from "framer-motion";
import appDB from "../utils/appDB";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const CreateBooking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [podModalOpen, setPodModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    client: "",
    consignment: "",
    dispatch_date: "",
    mode: "",
    origin: "",
    originState: "",
    originCode: "",
    destination: "",
    destState: "",
    destCode: "",
    consignor: "",
    consignee: "",
    type_of_delivery: "Door",
    clerk_name: "",
    invoiceDetails: [{ invoiceNo: "", invoiceValue: "", invoiceDate: "", partNumber: "", ewayBill: "", quantity: "" }],
    box: "",
    actual_wt: "",
    charge_wt: "",
    freight_charge: "",
    awb_charge: "",
    pickup_charge: "",
    delivery_charge: "",
    packaging_charge: "",
    handling_charge: "",
    insurance_charge: "",
    fuel_surcharge: "",
    description: "",
    insuredBy: "",
    remarks: "",
    paymentMode: "",
    dimensions: [{ length: "", breadth: "", height: "", boxCount: "" }],
  });
  const [clients, setClients] = useState([]);
  const [cities, setCities] = useState([]);
  const [rates, setRates] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);

  const { refreshNotifications } = useNotification();
  const { addToast } = useToast();
  const { user } = useAuth();
  
  const canEditAwb = user?.role === 'Admin' || user?.role === 'SuperAdmin';

  const handleCreateNew = async (type, field, name) => {
    try {
      const endpoint = `${API}/${type === 'city' ? 'cities' : type + 's'}`;
      let payload = { isIncomplete: true };
      if (type === 'city') payload.city = name;
      else payload.name = name;
      
      const res = await axios.post(endpoint, payload);
      const data = res.data.data;
      
      if (type === 'client') setClients([...clients, data]);
      else if (type === 'city') setCities([...cities, data]);

      if (field === "origin") {
        setFormData({ ...formData, origin: data.city || data.name, originState: "", originCode: "" });
      } else if (field === "destination") {
        setFormData({ ...formData, destination: data.city || data.name, destState: "", destCode: "" });
      } else {
        setFormData({ ...formData, [field]: data.name || data.client || data.city });
      }
      
      addToast(`${type.charAt(0).toUpperCase() + type.slice(1)} details are incomplete. Please fill in the ${type} details.`, "warning");
      refreshNotifications();
    } catch (e) {
      console.error(e);
      addToast(`Failed to create ${type}`, "error");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, citiesRes, ratesRes] = await Promise.all([
          axios.get(`${API}/clients`).catch(() => ({ data: { success: false } })),
          axios.get(`${API}/cities`).catch(() => ({ data: { success: false } })),
          axios.get(`${API}/rates`).catch(() => ({ data: { success: false } })),
        ]);
        if (clientsRes.data.success) setClients(clientsRes.data.data);
        if (citiesRes.data.success) setCities(citiesRes.data.data);
        if (ratesRes.data.success) setRates(ratesRes.data.data);
        
        if (id) {
          const bookingRes = await axios.get(`${API}/bookings/${id}`);
          if (bookingRes.data.success) {
            const b = bookingRes.data.data;
            const fixDate = (raw) => {
              if (!raw) return "";
              if (typeof raw === 'string') {
                const parts = raw.split(/[-/ T]/);
                if (parts[0]?.length === 2 && parts[2]?.length === 4) {
                   return `${parts[2]}-${parts[1]}-${parts[0]}`;
                } else if (parts[0]?.length === 4 && parts[1]?.length === 2 && parts[2]?.length === 2) {
                   return `${parts[0]}-${parts[1]}-${parts[2]}`;
                }
                return raw.split('T')[0];
              }
              try { return new Date(raw).toISOString().split('T')[0]; } catch(e) { return ""; }
            };

            let parcels = (b.invoiceDetails && b.invoiceDetails.length > 0) ? b.invoiceDetails : (b.parcels || []);
            if (parcels && parcels.length > 0) {
              b.invoiceDetails = parcels.map(p => ({
                invoiceNo: p.invoiceNo || p.invoice || "",
                invoiceValue: p.invoiceValue || p.value || "",
                invoiceDate: fixDate(p.invoiceDate || p.invdate || p.date || ""),
                partNumber: p.partNumber || p.part || "",
                ewayBill: p.ewayBill || p.eway || "",
                quantity: p.quantity || p.qty || ""
              }));
            } else {
              b.invoiceDetails = [{ invoiceNo: "", invoiceValue: "", invoiceDate: "", partNumber: "", ewayBill: "", quantity: "" }];
            }

            b.dispatch_date = fixDate(b.dispatch_date || b.date || b.createdAt);

            if (b.mode) {
               const lowerMode = b.mode.toLowerCase();
               if (lowerMode === "road") b.mode = "Road";
               else if (lowerMode === "rail" || lowerMode === "train") b.mode = "Train";
               else if (lowerMode === "air") b.mode = "Air";
               else if (lowerMode === "sea") b.mode = "Sea";
            }
            
            if (b.paymentMode) {
               const pm = b.paymentMode.toLowerCase().replace(/\s/g, '');
               if (pm === "topay") b.paymentMode = "To Pay";
               else if (pm === "paid") b.paymentMode = "Paid";
               else if (pm === "credit") b.paymentMode = "Credit";
            }
            
            // Auto-fill missing GST for old bookings so they fix themselves when edited
            const clientsList = clientsRes.data.data || [];
            const findGstForParty = (partyName) => {
              if (!partyName) return "";
              const searchVal = String(partyName).trim().toLowerCase();
              const cClient = clientsList.find(c => 
                String(c.name || "").trim().toLowerCase() === searchVal || 
                String(c.client || "").trim().toLowerCase() === searchVal ||
                String(c.clientCode || "").trim().toLowerCase() === searchVal
              );
              return cClient ? (cClient.gst || "") : "";
            };

            if (!b.consignorGst || String(b.consignorGst).trim().toUpperCase() === "NA") {
               const matchedGst = findGstForParty(b.consignor);
               if (matchedGst) b.consignorGst = matchedGst;
            }
            if (!b.consigneeGst || String(b.consigneeGst).trim().toUpperCase() === "NA") {
               const matchedGst = findGstForParty(b.consignee);
               if (matchedGst) b.consigneeGst = matchedGst;
            }
            if (!b.clientGst || String(b.clientGst).trim().toUpperCase() === "NA") {
               const matchedGst = findGstForParty(b.client);
               if (matchedGst) b.clientGst = matchedGst;
            }

            // Full fallback mapping for all fields from possible imported CSV structures
            b.consignment = b.consignment || b.awb || b.lrNo || b.lr || "";
            b.client = b.client || b.billedTo || "";
            
            b.box = b.box || b.boxes || b.pkg || b.packages || "";
            b.actual_wt = b.actual_wt || b.actualWt || b.weight || b.actualWeight || "";
            b.charge_wt = b.charge_wt || b.chargeWt || b.chargeWeight || b.weight || "";
            
            b.freight_charge = b.freight_charge || b.freight || b.frieght || b.frieghtCharge || "";
            b.awb_charge = b.awb_charge || b.awbCharge || b.docketCharge || "";
            b.pickup_charge = b.pickup_charge || b.pickupCharge || "";
            b.delivery_charge = b.delivery_charge || b.deliveryCharge || "";
            b.packaging_charge = b.packaging_charge || b.packagingCharge || b.pkgCharge || "";
            b.handling_charge = b.handling_charge || b.handlingCharge || "";
            b.insurance_charge = b.insurance_charge || b.insuranceCharge || "";
            b.fuel_surcharge = b.fuel_surcharge || b.fuelSurcharge || "";
            
            b.type_of_delivery = b.type_of_delivery || b.deliveryType || "Door";
            b.clerk_name = b.clerk_name || b.clerkName || "Admin";

            b.description = b.description || b.desc || b.goods || "";
            b.remarks = b.remarks || b.remark || "";
            
            if (b.insuredBy) {
               const ib = String(b.insuredBy).toLowerCase();
               if (ib === "consignor") b.insuredBy = "Consignor";
               else if (ib === "consignee") b.insuredBy = "Consignee";
               else if (ib === "carrier") b.insuredBy = "Carrier";
               else if (ib === "owner") b.insuredBy = "Owner";
            } else {
               const fallback = String(b.insured || b.insurance || "").toLowerCase();
               if (fallback === "consignor") b.insuredBy = "Consignor";
               else if (fallback === "consignee") b.insuredBy = "Consignee";
               else if (fallback === "carrier") b.insuredBy = "Carrier";
               else if (fallback === "owner") b.insuredBy = "Owner";
               else b.insuredBy = fallback || "";
            }

            if (b.invoiceDetails && Array.isArray(b.invoiceDetails)) {
               b.invoiceDetails = b.invoiceDetails.map(inv => ({
                 ...inv,
                 quantity: inv.quantity || inv.qty || "",
                 invoiceDate: inv.invoiceDate || inv.invdate || ""
               }));
            }

            b.dimensions = b.dimensions || [{ length: "", breadth: "", height: "", boxCount: "" }];
 
            setFormData(b);
          }
        } else {
          const bookingsRes = await axios.get(`${API}/bookings`);
          if (bookingsRes.data.success) {
            const allBookings = bookingsRes.data.data;
            let maxNum = 0;
            // Prefix is ignored; we only keep numeric part
            allBookings.forEach(b => {
              const awbStr = b.awb || b.consignment || b.lrNo || "";
              const match = String(awbStr).match(/^([^0-9]+)?(\d+)$/);
              if (match) {
                const num = parseInt(match[2], 10);
                if (num > maxNum) {
                  maxNum = num;
                }
              }
            });
            if (maxNum > 0) {
              const nextAwb = `${maxNum + 1}`;
              setFormData(prev => ({ ...prev, consignment: nextAwb }));
            }
          }
        }
      } catch (err) {
        console.error("Error fetching data", err);
      } finally {
        setLoading(false);
      }
    };
    
    // Load draft if not in edit mode
    if (!id) {
      const savedDraft = appDB.memGet('bookingFormDraft');
      if (savedDraft) {
        try {
          if (savedDraft) {
            setFormData(prev => ({ ...prev, ...savedDraft }));
          }
        } catch (e) {
          console.error("Failed to parse booking draft", e);
        }
      }
    }

    fetchData();
  }, [id]);

  // Auto-save draft
  useEffect(() => {
    if (!isEditMode && formData) {
      appDB.set('bookingFormDraft', formData);
    }
  }, [formData, isEditMode]);

  // Auto-calculate rates
  useEffect(() => {
    if (formData.client && formData.origin && formData.destination && formData.mode && formData.charge_wt) {
      const rate = rates.find(r => 
        (r.client === formData.client || r.client?.name === formData.client || r.client?.client === formData.client) &&
        (r.origin === formData.origin || r.origin?.name === formData.origin || r.origin?.city === formData.origin) &&
        (r.destination === formData.destination || r.destination?.name === formData.destination || r.destination?.city === formData.destination)
      );

      if (rate) {
        let rateValue = 0;
        let pickup = 0;
        let delivery = 0;
        let awb = parseFloat(rate.awbCharge || 0);

        switch (formData.mode) {
          case "Air":
            rateValue = parseFloat(rate.airRate || 0);
            pickup = parseFloat(rate.airPickup || 0);
            delivery = parseFloat(rate.airDelivery || 0);
            break;
          case "Rail":
          case "Train":
            rateValue = parseFloat(rate.trainRate || 0);
            pickup = parseFloat(rate.trainPickup || 0);
            delivery = parseFloat(rate.trainDelivery || 0);
            break;
          case "Road":
            rateValue = parseFloat(rate.roadRate || 0);
            pickup = parseFloat(rate.roadPickup || 0);
            delivery = parseFloat(rate.roadDelivery || 0);
            break;
          case "Road Express":
            rateValue = parseFloat(rate.roadExpressRate || 0);
            pickup = parseFloat(rate.roadExpressPickup || 0);
            delivery = parseFloat(rate.roadExpressDelivery || 0);
            break;
          default:
            break;
        }

        const chargeWt = parseFloat(formData.charge_wt || 0);
        const freight = rateValue * chargeWt;

        setFormData(prev => ({
          ...prev,
          freight_charge: freight > 0 ? freight.toFixed(2) : prev.freight_charge,
          awb_charge: awb > 0 ? awb.toFixed(2) : prev.awb_charge,
          pickup_charge: pickup > 0 ? pickup.toFixed(2) : prev.pickup_charge,
          delivery_charge: delivery > 0 ? delivery.toFixed(2) : prev.delivery_charge,
        }));
      }
    }
  }, [formData.client, formData.origin, formData.destination, formData.mode, formData.charge_wt, rates]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "paymentMode" && value === "Credit") {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        freight_charge: 0,
        awb_charge: 0,
        pickup_charge: 0,
        delivery_charge: 0,
        packaging_charge: 0,
        handling_charge: 0,
        insurance_charge: 0,
        fuel_surcharge: 0,
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const addInvoiceRow = () => {
    setFormData({
      ...formData,
      invoiceDetails: [...formData.invoiceDetails, { invoiceNo: "", invoiceValue: "", invoiceDate: "", partNumber: "", ewayBill: "", quantity: "" }]
    });
  };

  const removeInvoiceRow = (index) => {
    setFormData({
      ...formData,
      invoiceDetails: formData.invoiceDetails.filter((_, i) => i !== index)
    });
  };

  const updateInvoiceRow = (index, field, value) => {
    const updated = [...formData.invoiceDetails];
    updated[index][field] = value;
    setFormData({ ...formData, invoiceDetails: updated });
  };
  
  const addDimensionRow = () => {
    setFormData(prev => ({
      ...prev,
      dimensions: [...(prev.dimensions || []), { length: "", breadth: "", height: "", boxCount: "" }]
    }));
  };

  const removeDimensionRow = (index) => {
    setFormData(prev => ({
      ...prev,
      dimensions: (prev.dimensions || []).filter((_, i) => i !== index)
    }));
  };

  const updateDimensionRow = (index, field, value) => {
    setFormData(prev => {
      const updated = [...(prev.dimensions || [])];
      if (!updated[index]) {
        updated[index] = { length: "", breadth: "", height: "", boxCount: "" };
      }
      updated[index][field] = value;
      return { ...prev, dimensions: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(null);
    try {
      // Removed old silent auto-create logic because we now use QuickAddModal for professional creation

      let response;
      if (isEditMode) {
        response = await axios.put(`${API}/bookings/${id}`, formData);
      } else {
        response = await axios.post(`${API}/bookings`, formData);
      }
      
      if (response.data.success) {
        addToast(`Booking ${isEditMode ? 'updated' : 'created'} successfully`, "success");
        if (!isEditMode) {
          appDB.remove('bookingFormDraft');
        }
        navigate("/bookings");
      }
    } catch (error) {
      console.error("Error creating booking", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <FormPageSkeleton />;
  }

  return (
    <div style={{ width: "100%", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h3 style={{ fontSize: "1.8rem", marginBottom: 0, color: "#111827" }}>
            {isEditMode ? "Edit Booking" : "Add Booking"}
          </h3>
          <button 
            type="button"
            onClick={() => navigate("/bookings")}
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
            <FileText size={16} /> All Bookings
          </button>
        </div>

        {isEditMode && (
          <button
            type="button"
            onClick={() => setPodModalOpen(true)}
            style={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              color: "white",
              border: "none",
              padding: "0.6rem 1.25rem",
              borderRadius: "10px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              boxShadow: "0 4px 10px rgba(2, 132, 199, 0.25)",
              fontSize: "0.9rem"
            }}
          >
            <FileCheck size={18} />
            Attach / Manage POD Document
          </button>
        )}
      </div>

      {success && (
        <div
          className="glass-panel"
          style={{
            padding: "1.5rem",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            background: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.2)",
          }}
        >
          <CheckCircle size={32} color="#16a34a" />
          <div>
            <h5
              style={{ color: "#16a34a", marginBottom: "0.25rem", margin: 0 }}
            >
              {isEditMode ? "LR Updated Successfully!" : "LR Generated Successfully!"}
            </h5>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#15803d" }}>
              LR Number: <strong>{success.lrNumber || success.id}</strong> has
              been {isEditMode ? "updated" : "created"}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPodModalOpen(true)}
            style={{
              marginLeft: "auto",
              background: "#15803d",
              color: "white",
              border: "none",
              padding: "0.55rem 1.1rem",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <FileCheck size={16} /> Attach POD Now
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="glass-panel"
        style={{ padding: "1.5rem" }}
      >
        {/* 1. Booking Details */}
        <h5 style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #ef4444", paddingBottom: "4px", display: "inline-block" }}>1. Booking Details</h5>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Awb No</label>
            <input type="text" className="form-control" name="consignment" value={formData.consignment} onChange={(e) => setFormData({...formData, consignment: formatAllCaps(e.target.value)})} readOnly={!canEditAwb} style={{ backgroundColor: !canEditAwb ? '#f1f5f9' : 'white', height: "36px", fontSize: "0.85rem", padding: "6px 10px" }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Date<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="date" min="1947-01-01" max="2200-12-31" className="form-control" name="dispatch_date" value={formData.dispatch_date} onChange={handleChange} required style={{ height: "36px", fontSize: "0.85rem", padding: "6px 10px" }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Mode<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <select className="form-control" name="mode" value={formData.mode} onChange={handleChange} required style={{ height: "36px", fontSize: "0.85rem", padding: "6px 10px" }}>
              <option value="">-- Mode --</option>
              <option value="Road">Road</option>
              <option value="Train">Train</option>
              <option value="Air">Air</option>
              <option value="Sea">Sea</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Payment Mode<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <select className="form-control" name="paymentMode" value={formData.paymentMode} onChange={handleChange} required style={{ height: "36px", fontSize: "0.85rem", padding: "6px 10px" }}>
              <option value="" disabled>-- Select --</option>
              <option value="To Pay">To Pay</option>
              <option value="Paid">Paid</option>
              <option value="Credit">Credit</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Billed To<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <CreatableDropdown 
              options={clients} 
              value={formData.client} 
              onChange={(val) => {
                const selectedClient = clients.find(c => c.name === val || c.client === val);
                setFormData({ 
                  ...formData, 
                  client: val, 
                  clientGst: selectedClient?.gst || ""
                });
              }}
              onCreate={(name) => handleCreateNew("client", "client", name)}
              placeholder="-- Select Billed To --" 
              format={formatAllCaps}
              style={{ height: "36px", fontSize: "0.85rem" }}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Type of Delivery<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <select className="form-control" name="type_of_delivery" value={formData.type_of_delivery} onChange={handleChange} required style={{ height: "36px", fontSize: "0.85rem", padding: "6px 10px" }}>
              <option value="Door">Door</option>
              <option value="Godown">Godown</option>
            </select>
          </div>
          {formData.clerk_name ? (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Clerk Name</label>
              <input 
                type="text" 
                className="form-control" 
                name="clerk_name"
                value={formData.clerk_name} 
                onChange={handleChange}
                disabled={!canEditAwb} 
                style={{ backgroundColor: !canEditAwb ? '#f1f5f9' : '#fff', height: "36px", fontSize: "0.85rem", padding: "6px 10px" }} 
              />
            </div>
          ) : <div />}
        </div>

        {/* 2. Route & Parties */}
        <hr style={{ border: 0, borderTop: "1px solid #e2e8f0", margin: "1.25rem 0" }} />
        <h5 style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #ef4444", paddingBottom: "4px", display: "inline-block" }}>2. Route & Party Details</h5>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Consignor<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <CreatableDropdown 
              options={clients} 
              value={formData.consignor} 
              onChange={(val) => {
                const selectedClient = clients.find(c => c.name === val || c.client === val);
                setFormData({ 
                  ...formData, 
                  consignor: val, 
                  consignorGst: selectedClient?.gst || ""
                });
              }}
              onCreate={(name) => handleCreateNew("client", "consignor", name)}
              placeholder="-- Consignor --" 
              format={formatAllCaps}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Consignee<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <CreatableDropdown 
              options={clients} 
              value={formData.consignee} 
              onChange={(val) => {
                const selectedClient = clients.find(c => c.name === val || c.client === val);
                setFormData({ 
                  ...formData, 
                  consignee: val, 
                  consigneeGst: selectedClient?.gst || ""
                });
              }}
              onCreate={(name) => handleCreateNew("client", "consignee", name)}
              placeholder="-- Consignee --" 
              format={formatAllCaps}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Origin<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <CreatableDropdown 
              options={cities} 
              value={formData.origin} 
              onChange={(city, opt) => setFormData({ ...formData, origin: city, originState: opt?.state || "", originCode: opt?.stateCode || "" })} 
              onCreate={(name) => handleCreateNew("city", "origin", name)}
              placeholder="-- Origin --" 
              format={formatAllCaps}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Destination<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <CreatableDropdown 
              options={cities} 
              value={formData.destination} 
              onChange={(city, opt) => setFormData({ ...formData, destination: city, destState: opt?.state || "", destCode: opt?.stateCode || "" })} 
              onCreate={(name) => handleCreateNew("city", "destination", name)}
              placeholder="-- Destination --" 
              format={formatAllCaps}
            />
          </div>
        </div>

        {/* 3. Invoice Details */}
        <hr style={{ border: 0, borderTop: "1px solid #e2e8f0", margin: "1.25rem 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h5 style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #ef4444", paddingBottom: "4px", display: "inline-block" }}>3. Invoice Details</h5>
          <button type="button" onClick={addInvoiceRow} style={{ background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", padding: "4px 12px", fontSize: "0.75rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>+ Add Invoice</button>
        </div>
        
        <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                <th style={{ padding: "8px 4px", textAlign: "center", fontSize: "0.75rem", color: "#475569", fontWeight: "600", textTransform: "uppercase", width: "5%" }}>S.No.</th>
                <th style={{ padding: "8px 4px", textAlign: "left", fontSize: "0.75rem", color: "#475569", fontWeight: "600", textTransform: "uppercase", width: "16%" }}>Invoice No</th>
                <th style={{ padding: "8px 4px", textAlign: "left", fontSize: "0.75rem", color: "#475569", fontWeight: "600", textTransform: "uppercase", width: "16%" }}>Invoice Date</th>
                <th style={{ padding: "8px 4px", textAlign: "left", fontSize: "0.75rem", color: "#475569", fontWeight: "600", textTransform: "uppercase", width: "16%" }}>Part Number</th>
                <th style={{ padding: "8px 4px", textAlign: "left", fontSize: "0.75rem", color: "#475569", fontWeight: "600", textTransform: "uppercase", width: "15%" }}>Quantity</th>
                <th style={{ padding: "8px 4px", textAlign: "left", fontSize: "0.75rem", color: "#475569", fontWeight: "600", textTransform: "uppercase", width: "16%" }}>Invoice Value</th>
                <th style={{ padding: "8px 4px", textAlign: "left", fontSize: "0.75rem", color: "#475569", fontWeight: "600", textTransform: "uppercase", width: "16%" }}>Eway Bill</th>
              </tr>
            </thead>
            <tbody>
              {formData.invoiceDetails.map((inv, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "6px 4px", textAlign: "center", fontWeight: "500", color: "#374151", fontSize: "0.8rem" }}>{i + 1}</td>
                  <td style={{ padding: "4px" }}>
                    <input id={`invoiceNo-${i}`} aria-label="Invoice Number" className="form-control" style={{ fontSize: "0.85rem", padding: "6px", width: "100%", margin: 0, height: "32px" }} value={inv.invoiceNo} onChange={(e) => updateInvoiceRow(i, "invoiceNo", formatAllCaps(e.target.value))} />
                  </td>
                  <td style={{ padding: "4px" }}>
                    <input id={`invoiceDate-${i}`} aria-label="Invoice Date" className="form-control" style={{ fontSize: "0.85rem", padding: "6px", width: "100%", margin: 0, height: "32px" }} type="date" min="1947-01-01" max="2200-12-31" value={inv.invoiceDate} onChange={(e) => updateInvoiceRow(i, "invoiceDate", e.target.value)} />
                  </td>
                  <td style={{ padding: "4px" }}>
                    <input id={`partNumber-${i}`} aria-label="Part Number" className="form-control" style={{ fontSize: "0.85rem", padding: "6px", width: "100%", margin: 0, height: "32px" }} value={inv.partNumber} onChange={(e) => updateInvoiceRow(i, "partNumber", e.target.value)} />
                  </td>
                  <td style={{ padding: "4px" }}>
                    <input id={`quantity-${i}`} aria-label="Quantity" className="form-control" style={{ fontSize: "0.85rem", padding: "6px", width: "100%", margin: 0, height: "32px" }} type="number" value={inv.quantity} onChange={(e) => updateInvoiceRow(i, "quantity", e.target.value)} />
                  </td>
                  <td style={{ padding: "4px" }}>
                    <input id={`invoiceValue-${i}`} aria-label="Invoice Value" className="form-control" style={{ fontSize: "0.85rem", padding: "6px", width: "100%", margin: 0, height: "32px" }} type="number" value={inv.invoiceValue} onChange={(e) => updateInvoiceRow(i, "invoiceValue", e.target.value)} />
                  </td>
                  <td style={{ padding: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input id={`ewayBill-${i}`} aria-label="E-way Bill" className="form-control" style={{ fontSize: "0.85rem", padding: "6px", width: "100%", margin: 0, height: "32px" }} value={inv.ewayBill} onChange={(e) => updateInvoiceRow(i, "ewayBill", e.target.value)} />
                      {i > 0 && <button type="button" onClick={() => removeInvoiceRow(i)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>&times;</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. Cargo details */}
        <hr style={{ border: 0, borderTop: "1px solid #e2e8f0", margin: "1.25rem 0" }} />
        <h5 style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #ef4444", paddingBottom: "4px", display: "inline-block" }}>4. Cargo Details</h5>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Box<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="number" className="form-control" name="box" placeholder="Qty" value={formData.box} onChange={handleChange} required style={{ height: "36px", fontSize: "0.85rem", padding: "6px 10px" }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Actual Wt.<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="number" step="0.01" className="form-control" name="actual_wt" placeholder="Kg" value={formData.actual_wt} onChange={handleChange} required style={{ height: "36px", fontSize: "0.85rem", padding: "6px 10px" }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Charge Wt.<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="number" step="0.01" className="form-control" name="charge_wt" placeholder="Kg" value={formData.charge_wt} onChange={handleChange} required style={{ height: "36px", fontSize: "0.85rem", padding: "6px 10px" }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Description<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="text" className="form-control" name="description" placeholder="Description" value={formData.description} onChange={handleChange} required style={{ height: "36px", fontSize: "0.85rem", padding: "6px 10px" }} />
          </div>
        </div>

        {/* Dynamic Dimensions */}
        <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.825rem", fontWeight: "600", color: "#475569" }}>Package Dimensions (Optional)</span>
            <button type="button" onClick={addDimensionRow} style={{ background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", padding: "3px 10px", fontSize: "0.75rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>+ Add Dimension</button>
          </div>
          <table className="bilty-table" style={{ background: "white", borderRadius: "6px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "6px 8px", fontSize: "0.75rem", color: "#475569", fontWeight: "600" }}>Length (cm)</th>
                <th style={{ padding: "6px 8px", fontSize: "0.75rem", color: "#475569", fontWeight: "600" }}>Breadth (cm)</th>
                <th style={{ padding: "6px 8px", fontSize: "0.75rem", color: "#475569", fontWeight: "600" }}>Height (cm)</th>
                <th style={{ padding: "6px 8px", fontSize: "0.75rem", color: "#475569", fontWeight: "600" }}>Box Count</th>
                <th style={{ padding: "6px 8px", width: "40px" }}></th>
              </tr>
            </thead>
            <tbody>
              {(formData.dimensions || []).map((dim, i) => (
                <tr key={i} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "4px" }}>
                    <input className="form-control" type="number" placeholder="L" style={{ fontSize: "0.85rem", padding: "6px", width: "100%", margin: 0, height: "30px" }} value={dim.length} onChange={(e) => updateDimensionRow(i, "length", e.target.value)} />
                  </td>
                  <td style={{ padding: "4px" }}>
                    <input className="form-control" type="number" placeholder="B" style={{ fontSize: "0.85rem", padding: "6px", width: "100%", margin: 0, height: "30px" }} value={dim.breadth} onChange={(e) => updateDimensionRow(i, "breadth", e.target.value)} />
                  </td>
                  <td style={{ padding: "4px" }}>
                    <input className="form-control" type="number" placeholder="H" style={{ fontSize: "0.85rem", padding: "6px", width: "100%", margin: 0, height: "30px" }} value={dim.height} onChange={(e) => updateDimensionRow(i, "height", e.target.value)} />
                  </td>
                  <td style={{ padding: "4px" }}>
                    <input className="form-control" type="number" placeholder="Qty" style={{ fontSize: "0.85rem", padding: "6px", width: "100%", margin: 0, height: "30px" }} value={dim.boxCount} onChange={(e) => updateDimensionRow(i, "boxCount", e.target.value)} />
                  </td>
                  <td style={{ padding: "4px", textAlign: "center" }}>
                    {i > 0 && (
                      <button type="button" onClick={() => removeDimensionRow(i)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "1.1rem" }}>
                        &times;
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 5. Financial Charges */}
        <hr style={{ border: 0, borderTop: "1px solid #e2e8f0", margin: "1.25rem 0" }} />
        <h5 style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #ef4444", paddingBottom: "4px", display: "inline-block" }}>5. Financial Details</h5>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Freight Charge{formData.paymentMode !== "Credit" && <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>}</label>
            <input type="number" step="0.01" className="form-control" name="freight_charge" placeholder="₹" value={formData.freight_charge} onChange={handleChange} required={formData.paymentMode !== "Credit"} style={{ height: "36px", fontSize: "0.85rem", padding: "6px 10px" }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Awb Charge{formData.paymentMode !== "Credit" && <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>}</label>
            <input type="number" step="0.01" className="form-control" name="awb_charge" placeholder="₹" value={formData.awb_charge} onChange={handleChange} required={formData.paymentMode !== "Credit"} style={{ height: "36px", fontSize: "0.85rem", padding: "6px 10px" }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Pickup Charge{formData.paymentMode !== "Credit" && <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>}</label>
            <input type="number" step="0.01" className="form-control" name="pickup_charge" placeholder="₹" value={formData.pickup_charge} onChange={handleChange} required={formData.paymentMode !== "Credit"} style={{ height: "36px", fontSize: "0.85rem", padding: "6px 10px" }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Delivery Charge{formData.paymentMode !== "Credit" && <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>}</label>
            <input type="number" step="0.01" className="form-control" name="delivery_charge" placeholder="₹" value={formData.delivery_charge} onChange={handleChange} required={formData.paymentMode !== "Credit"} style={{ height: "36px", fontSize: "0.85rem", padding: "6px 10px" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Packaging Charge{formData.paymentMode !== "Credit" && <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>}</label>
            <input type="number" step="0.01" className="form-control" name="packaging_charge" placeholder="₹" value={formData.packaging_charge} onChange={handleChange} required={formData.paymentMode !== "Credit"} style={{ height: "36px", fontSize: "0.85rem", padding: "6px 10px" }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Handling Charge{formData.paymentMode !== "Credit" && <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>}</label>
            <input type="number" step="0.01" className="form-control" name="handling_charge" placeholder="₹" value={formData.handling_charge} onChange={handleChange} required={formData.paymentMode !== "Credit"} style={{ height: "36px", fontSize: "0.85rem", padding: "6px 10px" }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Insurance Charge{formData.paymentMode !== "Credit" && <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>}</label>
            <input type="number" step="0.01" className="form-control" name="insurance_charge" placeholder="₹" value={formData.insurance_charge} onChange={handleChange} required={formData.paymentMode !== "Credit"} style={{ height: "36px", fontSize: "0.85rem", padding: "6px 10px" }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Fuel Surcharge{formData.paymentMode !== "Credit" && <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>}</label>
            <input type="number" step="0.01" className="form-control" name="fuel_surcharge" placeholder="₹" value={formData.fuel_surcharge} onChange={handleChange} required={formData.paymentMode !== "Credit"} style={{ height: "36px", fontSize: "0.85rem", padding: "6px 10px" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Insured By<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <select className="form-control" name="insuredBy" value={formData.insuredBy} onChange={handleChange} required style={{ height: "36px", fontSize: "0.85rem", padding: "6px 10px" }}>
              <option value="">-- Insured By --</option>
              <option value="Consignor">Consignor</option>
              <option value="Consignee">Consignee</option>
              <option value="Carrier">Carrier</option>
              <option value="Owner">Owner</option>
            </select>
          </div>
          <div style={{ visibility: "hidden" }} />
          <div style={{ visibility: "hidden" }} />
          <div style={{ visibility: "hidden" }} />
        </div>

        <div className="form-group" style={{ margin: "1rem 0 1.5rem" }}>
          <label className="form-label" style={{ fontSize: "0.825rem", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>Remarks<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
          <textarea className="form-control" name="remarks" placeholder="Enter remarks/instructions here..." value={formData.remarks} onChange={handleChange} required style={{ minHeight: "80px", resize: "vertical", fontSize: "0.85rem", padding: "8px 12px" }} />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "1rem",
            borderTop: "1px solid rgba(0, 0, 0, 0.05)",
            paddingTop: "1.5rem",
          }}
        >
          <button
            type="reset"
            className="btn"
            style={{
              background: "transparent",
              border: "1px solid #e2e8f0",
              color: "var(--text-muted)",
            }}
            onClick={() => {
              setFormData({
                ...formData,
                client: "",
                consignment: "",
                origin: "",
                originState: "",
                originCode: "",
                destination: "",
                destState: "",
                destCode: "",
                consignor: "",
                consignee: "",
                description: "",
                box: "",
                insured: "",
                actual_wt: "",
                charge_wt: "",
                freight_charge: "",
                awb_charge: "",
                pickup_charge: "",
                delivery_charge: "",
                packaging_charge: "",
                handling_charge: "",
                insurance_charge: "",
                fuel_surcharge: "",
                remarks: "",
                paymentMode: "",
                insuredBy: "",
                invoiceDetails: [{ invoiceNo: "", invoiceValue: "", invoiceDate: "", partNumber: "", ewayBill: "", quantity: "" }]
              });
              if (!isEditMode) {
                appDB.remove('bookingFormDraft');
              }
            }}
          >
            Reset
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="spinner" /> {isEditMode ? "Updating..." : "Generating..."}
              </>
            ) : (
              <>{isEditMode ? "UPDATE BOOKING" : "ADD BOOKING"}</>
            )}
          </button>
        </div>
      </form>

      {/* POD UPLOAD MODAL STUDIO */}
      <AnimatePresence>
        {podModalOpen && (
          <PodEntryModal
            isOpen={podModalOpen}
            onClose={() => setPodModalOpen(false)}
            booking={{
              id: id || success?.id,
              awb: success?.lrNumber || success?.id || formData.awb || id,
              client: formData.client,
              consignor: formData.consignor,
              consignee: formData.consignee,
              origin: formData.origin,
              destination: formData.destination
            }}
            onSuccess={() => {
              // modal closed on success
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreateBooking;
