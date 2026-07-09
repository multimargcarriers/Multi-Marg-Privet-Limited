import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { CheckCircle, Loader2, ShoppingCart, Trash2 } from "lucide-react";
import CreatableDropdown from "../components/CreatableDropdown";
import QuickAddModal from "../components/QuickAddModal";
import Table from "../components/Table";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";

const API = "http://localhost:5000/api";

const Purchase = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const [formData, setFormData] = useState({
    vendor: "",
    billNo: "",
    date: "",
    taxable: "",
    gst: "",
    total: "",
    file: null
  });
  
  const [purchases, setPurchases] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [vendors, setVendors] = useState([]);
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
    if (modalType === "vendor") {
      setVendors([...vendors, data]);
      setFormData({ ...formData, vendor: data.name || data.vendor });
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vendorsRes, purchasesRes] = await Promise.all([
        axios.get(`${API}/vendors`),
        axios.get(`${API}/purchases`)
      ]);
      if (vendorsRes.data.success) setVendors(vendorsRes.data.data || []);
      if (purchasesRes.data.success) setPurchases(purchasesRes.data.data || []);
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);
    try {
      const payload = {
        vendor: formData.vendor?.name || formData.vendor,
        billNo: formData.billNo,
        date: formData.date,
        taxable: parseFloat(formData.taxable) || 0,
        gst: parseFloat(formData.gst) || 0,
        total: parseFloat(formData.total) || 0,
      };
      
      const response = await axios.post(`${API}/purchases`, payload);
      if (response.data.success) {
        setSuccess(true);
        setFormData({
          vendor: "",
          billNo: "",
          date: "",
          taxable: "",
          gst: "",
          total: "",
          file: null
        });
        fetchData();
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Error creating purchase entry", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Purchase",
      message: "Are you sure you want to delete this purchase bill? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    try {
      setPurchases(prev => prev.filter(p => p.id !== id));
      await axios.delete(`${API}/purchases/${id}`);
    } catch (err) {
      console.error("Delete purchase error", err);
      fetchData();
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem", color: "#111827" }}>
          Purchase Bills
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
            <h5 style={{ color: "#16a34a", marginBottom: "0.25rem", margin: 0 }}>
              Purchase Bill Added Successfully!
            </h5>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: "2.5rem", marginBottom: "3rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>
              Vendor Name<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
            </label>
            <CreatableDropdown 
              options={vendors} 
              value={formData.vendor} 
              onChange={(val) => setFormData({ ...formData, vendor: val })} 
              onCreate={(name) => handleCreateNew("vendor", name)}
              placeholder="-- Please select the Vendor --" 
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>
              Vendor Bill No<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
            </label>
            <input 
              type="text" 
              className="form-control" 
              name="billNo" 
              placeholder="Enter the Bill No" 
              value={formData.billNo} 
              onChange={handleChange} 
              required 
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>
              Date<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
            </label>
            <input 
              type="date" 
              className="form-control" 
              name="date" 
              value={formData.date} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>
              Taxable Value<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
            </label>
            <input 
              type="number" 
              step="0.01"
              className="form-control" 
              name="taxable" 
              placeholder="Enter the Taxable Value" 
              value={formData.taxable} 
              onChange={handleChange} 
              required 
            />
          </div>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>
              Gst<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
            </label>
            <input 
              type="number" 
              step="0.01"
              className="form-control" 
              name="gst" 
              placeholder="Enter the Gst" 
              value={formData.gst} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>
              Total<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
            </label>
            <input 
              type="number" 
              step="0.01"
              className="form-control" 
              name="total" 
              placeholder="Enter the Total amount" 
              value={formData.total} 
              onChange={handleChange} 
              required 
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: "2.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <label className="form-label" style={{ fontWeight: "500", color: "#374151", margin: 0 }}>
            Upload Bill<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
          </label>
          <input 
            type="file" 
            name="file" 
            onChange={handleFileChange} 
            style={{ fontSize: "0.9rem" }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ padding: "0.5rem 2rem", height: "45px" }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="spinner" /> Updating...
              </>
            ) : (
              <>UPDATE PURCHASE SHEET</>
            )}
          </button>
        </div>
      </form>

      <div className="glass-panel" style={{ padding: "2rem" }}>
        <h4 style={{ marginTop: 0, marginBottom: "1.5rem", color: "#111827", fontSize: "1.2rem" }}>Recent Purchase Bills</h4>
        <Table
          loading={loading}
          headers={["Vendor Name", "Vendor Bill No", "Date", "Taxable Value", "Gst", "Total", "Actions"]}
          data={purchases}
          renderRow={(item, index) => (
            <tr key={item.id || index}>
              <td className="font-semibold"><ShoppingCart size={16} style={{ marginRight: 8, verticalAlign: "middle", color: "var(--primary-color)" }} />{item.vendor}</td>
              <td>{item.billNo || "-"}</td>
              <td>{item.date ? new Date(item.date).toLocaleDateString() : "-"}</td>
              <td>₹ {parseFloat(item.taxable || 0).toFixed(2)}</td>
              <td>₹ {parseFloat(item.gst || 0).toFixed(2)}</td>
              <td style={{ fontWeight: "600", color: "#10b981" }}>₹ {parseFloat(item.total || 0).toFixed(2)}</td>
              <td>
                {isSuperAdmin && (
                  <button onClick={() => handleDelete(item.id)} style={{ background: "rgba(220, 38, 38, 0.1)", border: "none", color: "#dc2626", padding: "6px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Delete">
                    <Trash2 size={16} />
                  </button>
                )}
              </td>
            </tr>
          )}
        />
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

export default Purchase;
