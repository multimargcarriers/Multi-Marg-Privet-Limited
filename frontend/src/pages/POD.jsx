import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import Table from "../components/Table";
import { Upload, FileText, CheckCircle, Trash2 } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from '../utils/formatters';

const POD = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const [podList, setPodList] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [lrNo, setLrNo] = useState("");

  useEffect(() => { fetchPODs(); }, []);

  const fetchPODs = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/pod`);
      if (res.data.success) setPodList(res.data.data || []);
    } catch (err) { console.error("Fetch POD error", err); }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete POD",
      message: "Are you sure you want to delete this POD? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    setPodList(prev => prev.filter(p => p.id !== id));
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/pod/${id}`);
    } catch (err) {
      console.error("Delete POD error", err);
      fetchPODs();
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !lrNo) return;
    setUploading(true);
    const tempId = "temp-" + Date.now();
    try {
      setPodList(prev => [{
        id: tempId,
        lrNo,
        filename: selectedFile.name,
        createdAt: new Date().toISOString()
      }, ...prev]);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("lrNo", lrNo);
      const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/pod`, formData);
      if (res.data.success && res.data.data) {
        setPodList(prev => prev.map(p => p.id === tempId ? res.data.data : p));
      } else {
        fetchPODs();
      }
      setSelectedFile(null);
      setLrNo("");
    } catch (err) {
      console.error("Upload POD error", err);
      fetchPODs();
    }
    setUploading(false);
    setIsAdding(false);
  };

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "20px" }}>
      {/* Title & Add Button */}
      <div className="header-flex">
        <div>
          <h3 style={{ fontSize: "1.6rem", color: "#1e293b", margin: 0, fontWeight: "600", display: 'flex', alignItems: 'center' }}>
            <FileText size={24} style={{ marginRight: '10px', color: '#4F46E5' }} /> POD Upload
          </h3>
          <p style={{ color: "#64748b", margin: "5px 0 0 34px", fontSize: "0.9rem" }}>Upload Proof of Delivery documents for bookings.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            style={{ backgroundColor: "#4F46E5", color: "white", border: "none", padding: "0.6rem 1.2rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)" }}
          >
            + Add POD
          </button>
        )}
      </div>

      {/* Form Section */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", marginBottom: "2rem", border: "1px solid #e2e8f0" }}>
              <h4 style={{ margin: "0 0 1.5rem 0", fontSize: "1.2rem", color: "#0f172a" }}>Upload New POD</h4>
              <form onSubmit={handleUpload}>
                <div className="grid-2-col">
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>LR No<span style={{ color: "#ef4444" }}>*</span></label>
                    <input 
                      className="form-control" 
                      value={lrNo} 
                      onChange={(e) => setLrNo(e.target.value)} 
                      placeholder="Enter LR number" 
                      required 
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }}
                      onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                      onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>POD File (PDF/Image)<span style={{ color: "#ef4444" }}>*</span></label>
                    <input 
                      type="file" 
                      className="form-control" 
                      style={{ width: "100%", padding: "0.6rem", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#0f172a", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)" }} 
                      onChange={(e) => setSelectedFile(e.target.files[0])} 
                      accept=".pdf,.jpg,.jpeg,.png" 
                      required 
                      onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                      onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                    />
                  </div>
                </div>
                
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid #e2e8f0" }}>
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    style={{ backgroundColor: "transparent", color: "#64748b", border: "1px solid #cbd5e1", padding: "0.6rem 1.5rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseOver={(e) => { e.target.style.backgroundColor = "#f1f5f9"; e.target.style.color = "#0f172a"; }}
                    onMouseOut={(e) => { e.target.style.backgroundColor = "transparent"; e.target.style.color = "#64748b"; }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={uploading} 
                    style={{ backgroundColor: "#4F46E5", color: "white", border: "none", padding: "0.6rem 2rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer", transition: "background-color 0.2s", boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)", display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseOver={(e) => e.target.style.backgroundColor = "#4338ca"}
                    onMouseOut={(e) => e.target.style.backgroundColor = "#4F46E5"}
                  >
                    <Upload size={18} /> {uploading ? "Uploading..." : "Upload POD"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Table
        headers={["LR No", "File Name", "Upload Date", "Status", "Actions"]}
        data={podList}
        renderRow={(item, index) => (
          <tr key={item.id || index}>
            <td className="font-semibold">#{item.lrNo}</td>
            <td><FileText size={16} style={{ marginRight: 8, verticalAlign: "middle", color: "var(--primary-color)" }} />{item.filename}</td>
            <td>{item.createdAt ? formatDate(item.createdAt) : "-"}</td>
            <td>
              <span style={{ padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <CheckCircle size={14} /> Uploaded
              </span>
            </td>
            <td>
              <button onClick={() => window.open(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/uploads/pod/${item.filename}`, "_blank")} style={{ background: "transparent", border: "none", color: "var(--primary-color)", cursor: "pointer", fontWeight: "600" }}>View</button>
              {isSuperAdmin && (
                <button onClick={() => handleDelete(item.id)} style={{ marginLeft: 8, background: "transparent", border: "none", color: "#dc2626", cursor: "pointer" }}><Trash2 size={18} /></button>
              )}
            </td>
          </tr>
        )}
      />
    </div>
  );
};

export default POD;