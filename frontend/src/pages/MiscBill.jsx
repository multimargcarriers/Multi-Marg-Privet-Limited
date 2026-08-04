import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { 
  FileText, 
  CheckCircle, 
  Plus, 
  X, 
  RefreshCw, 
  Trash2, 
  Eye, 
  Calendar,
  IndianRupee,
  Receipt,
  FileSpreadsheet
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Table from "../components/Table";
import { formatDate } from '../utils/formatters';
import RupeeIcon from '../components/RupeeIcon';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const MiscBill = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const [form, setForm] = useState({ 
    client: "", 
    date: new Date().toISOString().slice(0, 10), 
    description: "", 
    amount: "", 
    gstSlab: "5", 
    gstAmount: "",
    total: "",
    remarks: "" 
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/bills/misc`);
      // Assuming a GET endpoint exists. If not, we might not have list data.
      if (res.data && res.data.success) {
        setBills(res.data.data || []);
      }
    } catch (err) {
      console.error("Fetch misc bills error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    const taxableVal = parseFloat(form.amount) || 0;
    if (form.gstSlab !== "custom") {
      const slabPercentage = parseFloat(form.gstSlab) || 0;
      const calculatedGst = (taxableVal * slabPercentage) / 100;
      const totalVal = taxableVal + calculatedGst;
      
      setForm(prev => ({
        ...prev,
        gstAmount: calculatedGst ? calculatedGst.toFixed(2) : "",
        total: totalVal ? totalVal.toFixed(2) : ""
      }));
    } else {
      const manualGst = parseFloat(form.gstAmount) || 0;
      const totalVal = taxableVal + manualGst;
      setForm(prev => ({
        ...prev,
        total: totalVal ? totalVal.toFixed(2) : ""
      }));
    }
  }, [form.amount, form.gstSlab, form.gstAmount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client || !form.amount) return;

    setGenerating(true);
    try {
      const payload = {
        client: form.client,
        date: form.date,
        description: form.description,
        amount: parseFloat(form.amount) || 0,
        gst: form.gstSlab !== "custom" ? form.gstSlab : (parseFloat(form.gstAmount) ? "custom" : "0"),
        gstAmount: parseFloat(form.gstAmount) || 0,
        total: parseFloat(form.total) || 0,
        remarks: form.remarks
      };
      const res = await axios.post(`${API}/bills/misc`, payload);
      setResult(res.data);
      setForm({ client: "", date: new Date().toISOString().slice(0, 10), description: "", amount: "", gstSlab: "5", gstAmount: "", total: "", remarks: "" });
      setIsAdding(false);
      fetchData();
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setResult(null), 5000);
    } catch (err) { 
      console.error("Create misc bill error", err); 
    } finally {
      setGenerating(false);
    }
  };

  const stats = useMemo(() => {
    const totalBills = bills.length;
    const totalAmount = bills.reduce((s, b) => s + parseFloat(b.total || b.amount || 0), 0);
    const totalGst = bills.reduce((s, b) => s + parseFloat(b.gstAmount || 0), 0);
    return { totalBills, totalAmount, totalGst };
  }, [bills]);

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "20px" }}>
      {/* HEADER BAR */}
      <div 
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "1rem 1.5rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          marginBottom: isAdding ? "0.35rem" : "1.25rem",
          transition: "margin-bottom 0.2s ease",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ background: "#fffbeb", padding: "8px", borderRadius: "10px", display: "flex" }}>
            <FileText size={22} style={{ color: "#f59e0b" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, color: "#0f172a" }}>
              Miscellaneous Bills
            </h3>
            <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 500 }}>
              Create and manage ad-hoc non-booking charges
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#475569",
              padding: "0.45rem 0.85rem",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 600,
              fontSize: "0.8rem"
            }}
          >
            <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          {!isAdding && (
            <button 
              onClick={() => setIsAdding(true)}
              style={{
                background: "#f59e0b",
                color: "white",
                border: "none",
                padding: "0.45rem 1rem",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 6px rgba(245, 158, 11, 0.2)",
                fontSize: "0.825rem"
              }}
            >
              <Plus size={15} />
              Generate Misc Bill
            </button>
          )}
        </div>
      </div>

      {result && (
        <div className="glass-panel" style={{ padding: "1rem 1.5rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "1rem", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
          <CheckCircle size={28} color="#16a34a" />
          <div>
            <h4 style={{ margin: 0, color: "#16a34a", fontSize: "1rem" }}>Bill Generated Successfully!</h4>
            <p style={{ margin: "0.25rem 0 0", color: "#15803d", fontSize: "0.85rem" }}>Bill No: <strong>{result.billNo || result.data?.billNo}</strong></p>
          </div>
        </div>
      )}

      {/* NEW ENTRY WORKFLOW */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden", width: "100%" }}
          >
            <div 
              style={{
                backgroundColor: "white",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 20px 35px -10px rgba(0, 0, 0, 0.08)",
                marginBottom: "1.5rem",
                width: "100%",
                overflow: "hidden"
              }}
            >
              <div style={{ background: "linear-gradient(90deg, #f59e0b 0%, #d97706 50%, #b45309 100%)", height: "4px", width: "100%" }} />
              <div 
                style={{
                  padding: "1.25rem 1.75rem",
                  borderBottom: "1px solid #f1f5f9",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#fafcfd"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <div style={{ background: "#fef3c7", padding: "10px", borderRadius: "12px", color: "#d97706", display: "flex" }}>
                    <Plus size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700", color: "#0f172a" }}>
                      Create Miscellaneous Bill
                    </h4>
                    <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
                      Generate an ad-hoc invoice for clients
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  style={{
                    background: "#f1f5f9",
                    border: "none",
                    borderRadius: "8px",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#64748b"
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ padding: "1.75rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.75rem" }}>
                  
                  {/* General Info */}
                  <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                    <h5 style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                      1. General Details
                    </h5>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Client Name *</label>
                        <input
                          type="text"
                          name="client"
                          value={form.client}
                          onChange={(e) => setForm({ ...form, client: e.target.value })}
                          placeholder="e.g. ABC Corp"
                          required
                          style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Date *</label>
                        <input
                          type="date"
                          name="date"
                          value={form.date}
                          onChange={(e) => setForm({ ...form, date: e.target.value })}
                          required
                          style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Description of Charges *</label>
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Detailed description of the miscellaneous charge..."
                        required
                        style={{ width: "100%", height: "80px", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box", resize: "vertical" }}
                      />
                    </div>
                  </div>

                  {/* Financial Info */}
                  <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                    <h5 style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                      2. Tax & Amounts
                    </h5>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Taxable Amount (₹) *</label>
                        <input
                          type="number"
                          step="0.01"
                          name="amount"
                          value={form.amount}
                          onChange={(e) => setForm({ ...form, amount: e.target.value })}
                          placeholder="0.00"
                          required
                          style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>GST Slab</label>
                        <select
                          name="gstSlab"
                          value={form.gstSlab}
                          onChange={(e) => setForm({ ...form, gstSlab: e.target.value })}
                          style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box", backgroundColor: "white" }}
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>GST Amount (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="gstAmount"
                          value={form.gstAmount}
                          onChange={(e) => setForm({ ...form, gstAmount: e.target.value })}
                          placeholder="0.00"
                          disabled={form.gstSlab !== "custom"}
                          style={{ 
                            width: "100%", 
                            padding: "0.65rem", 
                            borderRadius: "8px", 
                            border: "1px solid #cbd5e1", 
                            outline: "none", 
                            boxSizing: "border-box",
                            backgroundColor: form.gstSlab !== "custom" ? "#f1f5f9" : "white",
                            color: form.gstSlab !== "custom" ? "#64748b" : "black"
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Total Amount (₹) *</label>
                        <input
                          type="number"
                          step="0.01"
                          name="total"
                          value={form.total}
                          placeholder="0.00"
                          required
                          readOnly
                          style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1.5px solid #f59e0b", outline: "none", boxSizing: "border-box", fontWeight: 700, backgroundColor: "#fffbeb", color: "#b45309" }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Remarks (Optional)</label>
                      <input
                        type="text"
                        name="remarks"
                        value={form.remarks}
                        onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                        placeholder="Internal notes..."
                        style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                  <button
                    type="submit"
                    disabled={generating || !form.client || !form.amount}
                    style={{
                      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
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
                      boxShadow: "0 4px 12px rgba(245, 158, 11, 0.25)",
                      opacity: generating || !form.client || !form.amount ? 0.5 : 1
                    }}
                  >
                    <FileText size={18} />
                    {generating ? "Generating..." : "Generate Bill"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STATS CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Misc Bills Generated</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", marginTop: "4px", display: "flex", alignItems: "center" }}>
               {stats.totalBills}
            </div>
          </div>
          <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "12px" }}><FileSpreadsheet size={24} color="#64748b" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Billed Value</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f59e0b", marginTop: "4px", display: "flex", alignItems: "center" }}>
               <RupeeIcon size={24} /> {stats.totalAmount.toFixed(2)}
            </div>
          </div>
          <div style={{ background: "#fffbeb", padding: "12px", borderRadius: "12px" }}><IndianRupee size={24} color="#f59e0b" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total GST Collected</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#16a34a", marginTop: "4px", display: "flex", alignItems: "center" }}>
               <RupeeIcon size={24} /> {stats.totalGst.toFixed(2)}
            </div>
          </div>
          <div style={{ background: "#dcfce7", padding: "12px", borderRadius: "12px" }}><Receipt size={24} color="#16a34a" /></div>
        </div>
      </div>

      {/* TABLE */}
      {bills.length > 0 && (
        <div className="glass-panel" style={{ background: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
          <Table
            headers={["Bill No", "Date", "Client", "Description", "Taxable", "GST", "Total"]}
            data={bills}
            loading={loading}
            pagination={true}
            renderRow={(item, index) => (
              <tr key={item.id || index} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "0.9rem" }}>
                <td style={{ padding: "1rem", fontWeight: 700, color: "#f59e0b" }}>{item.billNo}</td>
                <td style={{ padding: "1rem", color: "#475569" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Calendar size={14} /> {item.date ? formatDate(item.date) : "-"}
                  </div>
                </td>
                <td style={{ padding: "1rem", fontWeight: 600, color: "#334155" }}>{item.client}</td>
                <td style={{ padding: "1rem", color: "#475569", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.description}</td>
                <td style={{ padding: "1rem", color: "#475569" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <RupeeIcon size={14} /> {parseFloat(item.amount || 0).toFixed(2)}
                  </div>
                </td>
                <td style={{ padding: "1rem", color: "#16a34a" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <RupeeIcon size={14} /> {parseFloat(item.gstAmount || 0).toFixed(2)}
                  </div>
                </td>
                <td style={{ padding: "1rem", fontWeight: 700, color: "#0f172a" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <RupeeIcon size={14} /> {parseFloat(item.total || 0).toFixed(2)}
                  </div>
                </td>
              </tr>
            )}
          />
        </div>
      )}
    </div>
  );
};

export default MiscBill;
