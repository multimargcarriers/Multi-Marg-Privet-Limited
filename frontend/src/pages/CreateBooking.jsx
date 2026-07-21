import React, { useState, useEffect } from "react";
import axios from "axios";
import { CheckCircle, FileText, Loader2, MapPin } from "lucide-react";
import SearchableSelect from "../components/SearchableSelect";
import CreatableDropdown from "../components/CreatableDropdown";
import { FormPageSkeleton } from '../components/SkeletonLoader';
import { formatAllCaps } from "../utils/formatters";
import { useNotification } from "../context/NotificationContext";
import { useToast } from "../context/ToastContext";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const CreateBooking = () => {
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
    description: "",
    insuredBy: "",
    remarks: "",
  });
  const [clients, setClients] = useState([]);
  const [cities, setCities] = useState([]);
  const [rates, setRates] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);

  const { refreshNotifications } = useNotification();
  const { addToast } = useToast();

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
          axios.get(`${API}/clients`),
          axios.get(`${API}/cities`),
          axios.get(`${API}/rates`),
        ]);
        if (clientsRes.data.success) setClients(clientsRes.data.data);
        if (citiesRes.data.success) setCities(citiesRes.data.data);
        if (ratesRes.data.success) setRates(ratesRes.data.data);
      } catch (err) {
        console.error("Error fetching data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(null);
    try {
      // Removed old silent auto-create logic because we now use QuickAddModal for professional creation

      const response = await axios.post(`${API}/bookings`, formData);
      if (response.data.success) {
        setSuccess(response.data.data || []);
        setFormData({
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
          description: "",
          insuredBy: "",
          remarks: "",
        });
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
    <div style={{ maxWidth: "960px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem", color: "#111827" }}>
          Add Booking
        </h3>
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
              LR Generated Successfully!
            </h5>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#15803d" }}>
              LR Number: <strong>{success.lrNumber || success.id}</strong> has
              been created.
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="glass-panel"
        style={{ padding: "2.5rem" }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Awb No</label>
            <input type="text" className="form-control" name="consignment" value={formData.consignment} onChange={(e) => setFormData({...formData, consignment: formatAllCaps(e.target.value)})} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Billed To<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <CreatableDropdown 
              options={clients} 
              value={formData.client} 
              onChange={(val) => setFormData({ ...formData, client: val })} 
              onCreate={(name) => handleCreateNew("client", "client", name)}
              placeholder="-- Please select the Client --" 
              format={formatAllCaps}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Date<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="date" className="form-control" name="dispatch_date" value={formData.dispatch_date} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Mode<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <select className="form-control" name="mode" value={formData.mode} onChange={handleChange} required>
              <option value="">-- Please select the Mode --</option>
              <option value="Road">Road</option>
              <option value="Rail">Rail</option>
              <option value="Air">Air</option>
              <option value="Sea">Sea</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Consignor<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <CreatableDropdown 
              options={clients} 
              value={formData.consignor} 
              onChange={(val) => setFormData({ ...formData, consignor: val })} 
              onCreate={(name) => handleCreateNew("client", "consignor", name)}
              placeholder="-- Please select the Consignor --" 
              format={formatAllCaps}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Consignee<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <CreatableDropdown 
              options={clients} 
              value={formData.consignee} 
              onChange={(val) => setFormData({ ...formData, consignee: val })} 
              onCreate={(name) => handleCreateNew("client", "consignee", name)}
              placeholder="-- Please select the Consignee --" 
              format={formatAllCaps}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Origin<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <CreatableDropdown 
              options={cities} 
              value={formData.origin} 
              onChange={(city, opt) => setFormData({ ...formData, origin: city, originState: opt?.state || "", originCode: opt?.stateCode || "" })} 
              onCreate={(name) => handleCreateNew("city", "origin", name)}
              placeholder="-- Please select the Origin --" 
              format={formatAllCaps}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Destination<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <CreatableDropdown 
              options={cities} 
              value={formData.destination} 
              onChange={(city, opt) => setFormData({ ...formData, destination: city, destState: opt?.state || "", destCode: opt?.stateCode || "" })} 
              onCreate={(name) => handleCreateNew("city", "destination", name)}
              placeholder="-- Please select the Destination --" 
              format={formatAllCaps}
            />
          </div>
        </div>

        {/* INVOICE DETAILS */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.5rem", borderBottom: "1px solid #e5e7eb", marginBottom: "1rem" }}>
          <label className="form-label" style={{ fontWeight: "600", color: "#111827", textTransform: "uppercase", marginBottom: 0 }}>INVOICE DETAILS<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
          <button type="button" onClick={addInvoiceRow} style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", color: "#374151", cursor: "pointer", fontWeight: "600", fontSize: "0.875rem", padding: "4px 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>+ Add Row</button>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "5px", padding: "8px 0", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
           <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", paddingLeft: "4px" }}>Invoice No</div>
           <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", paddingLeft: "4px" }}>Invoice Value</div>
           <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", paddingLeft: "4px" }}>Invoice Date</div>
           <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", paddingLeft: "4px" }}>Part Number</div>
           <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", paddingLeft: "4px" }}>Eway Bill</div>
           <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", paddingLeft: "4px" }}>Quantity</div>
        </div>
        {formData.invoiceDetails.map((inv, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <input className="form-control" style={{ fontSize: "0.875rem", padding: "8px" }} value={inv.invoiceNo} onChange={(e) => updateInvoiceRow(i, "invoiceNo", formatAllCaps(e.target.value))} />
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", marginBottom: "2rem", marginTop: "2rem" }}>
          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Box<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="number" className="form-control" name="box" placeholder="Enter the Box" value={formData.box} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Actual Weight<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="number" step="0.01" className="form-control" name="actual_wt" placeholder="Enter the Actual Weight" value={formData.actual_wt} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Charge Weight<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="number" step="0.01" className="form-control" name="charge_wt" placeholder="Enter the Charge Weight" value={formData.charge_wt} onChange={handleChange} required />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Frieght Charge<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="number" step="0.01" className="form-control" name="freight_charge" placeholder="Enter the Frieght Charge" value={formData.freight_charge} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Awb Charge<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="number" step="0.01" className="form-control" name="awb_charge" placeholder="Enter the Awb Charge" value={formData.awb_charge} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Pickup Charge<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="number" step="0.01" className="form-control" name="pickup_charge" placeholder="Enter the Pickup Charge" value={formData.pickup_charge} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Delivery Charge<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="number" step="0.01" className="form-control" name="delivery_charge" placeholder="Enter the Delivery Charge" value={formData.delivery_charge} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Packaging Charge<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="number" step="0.01" className="form-control" name="packaging_charge" placeholder="Enter the Package Charge" value={formData.packaging_charge} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Handling Charge<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="number" step="0.01" className="form-control" name="handling_charge" placeholder="Enter the Handling Charge" value={formData.handling_charge} onChange={handleChange} required />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Description<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="text" className="form-control" name="description" placeholder="Enter the Description" value={formData.description} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Insured By<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <select className="form-control" name="insuredBy" value={formData.insuredBy} onChange={handleChange} required>
              <option value="">-- Please select Insured By --</option>
              <option value="Consignor">Consignor</option>
              <option value="Consignee">Consignee</option>
              <option value="Carrier">Carrier</option>
              <option value="Owner">Owner</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: "#374151", fontWeight: "500" }}>Remarks<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
            <input type="text" className="form-control" name="remarks" placeholder="Enter the Remarks" value={formData.remarks} onChange={handleChange} required />
          </div>
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
            onClick={() =>
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
                remarks: "",
                insuredBy: "",
                invoiceDetails: [{ invoiceNo: "", invoiceValue: "", invoiceDate: "", partNumber: "", ewayBill: "", quantity: "" }]
              })
            }
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
                <Loader2 size={18} className="spinner" /> Generating...
              </>
            ) : (
              <>ADD BOOKING</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBooking;
