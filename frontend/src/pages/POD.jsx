import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import Table from "../components/Table";
import { Upload, FileText, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";

const POD = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const [podList, setPodList] = useState([]);
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
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>POD Upload</h3>
          <p className="text-muted">Upload Proof of Delivery documents for bookings.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h4 style={{ marginTop: 0, marginBottom: "1rem" }}>Upload New POD</h4>
        <form onSubmit={handleUpload}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
              <label className="form-label">LR No</label>
              <input className="form-control" value={lrNo} onChange={(e) => setLrNo(e.target.value)} placeholder="Enter LR number" required />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
              <label className="form-label">POD File (PDF/Image)</label>
              <input type="file" className="form-control" style={{ padding: "0.5rem 1.2rem", height: "auto" }} onChange={(e) => setSelectedFile(e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png" required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={uploading} style={{ height: 50 }}>
              <Upload size={18} /> {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </div>

      <Table
        headers={["LR No", "File Name", "Upload Date", "Status", "Actions"]}
        data={podList}
        renderRow={(item, index) => (
          <tr key={item.id || index}>
            <td className="font-semibold">#{item.lrNo}</td>
            <td><FileText size={16} style={{ marginRight: 8, verticalAlign: "middle", color: "var(--primary-color)" }} />{item.filename}</td>
            <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</td>
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