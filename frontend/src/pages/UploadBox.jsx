import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import Table from "../components/Table";
import { Upload, Package, Eye, Trash2 } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";

const UploadBox = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const [boxList, setBoxList] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState("");

  useEffect(() => { fetchBoxes(); }, []);

  const fetchBoxes = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/box`);
      if (res.data.success) setBoxList(res.data.data || []);
    } catch (err) { console.error("Fetch boxes error", err); }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Box",
      message: "Are you sure you want to delete this box record? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/box/${id}`);
      fetchBoxes();
    } catch (err) { console.error("Delete box error", err); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("description", description);
      await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/box`, formData);
      setSelectedFile(null);
      setDescription("");
      fetchBoxes();
    } catch (err) { console.error("Upload box error", err); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>Upload Box</h3>
          <p className="text-muted">Upload box/package images and documents.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h4 style={{ marginTop: 0, marginBottom: "1rem" }}>Upload New Box File</h4>
        <form onSubmit={handleUpload}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
              <label className="form-label">Description</label>
              <input className="form-control" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Box description" />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
              <label className="form-label">File</label>
              <input type="file" className="form-control" style={{ padding: "0.5rem 1.2rem", height: "auto" }} onChange={(e) => setSelectedFile(e.target.files[0])} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: 50 }}>
              <Upload size={18} /> Upload
            </button>
          </div>
        </form>
      </div>

      <Table
        headers={["File Name", "Description", "Upload Date", "Actions"]}
        data={boxList}
        renderRow={(item, index) => (
          <tr key={index}>
            <td className="font-semibold"><Package size={16} style={{ marginRight: 8, verticalAlign: "middle", color: "var(--primary-color)" }} />{item.filename}</td>
            <td>{item.description || "-"}</td>
            <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</td>
            <td>
              <button onClick={() => window.open(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/uploads/box/${item.filename}`, "_blank")} style={{ background: "transparent", border: "none", color: "var(--primary-color)", cursor: "pointer", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Eye size={16} /> View
              </button>
              {isSuperAdmin && (
                <button onClick={() => handleDelete(item.id)} style={{ marginLeft: 8, background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Trash2 size={16} /> Delete
                </button>
              )}
            </td>
          </tr>
        )}
      />
    </div>
  );
};

export default UploadBox;