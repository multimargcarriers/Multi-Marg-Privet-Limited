import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import Table from "../components/Table";
import { Upload, Receipt, Eye, Trash2 } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";

const UploadVouchers = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const [voucherList, setVoucherList] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [voucherNo, setVoucherNo] = useState("");

  useEffect(() => { fetchVouchers(); }, []);

  const fetchVouchers = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/vouchers`);
      if (res.data.success) setVoucherList(res.data.data || []);
    } catch (err) { console.error("Fetch vouchers error", err); }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Voucher",
      message: "Are you sure you want to delete this voucher? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/vouchers/${id}`);
      fetchVouchers();
    } catch (err) { console.error("Delete voucher error", err); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("voucherNo", voucherNo);
      await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/vouchers`, formData);
      setSelectedFile(null);
      setVoucherNo("");
      fetchVouchers();
    } catch (err) { console.error("Upload voucher error", err); }
  };

  return (
    <div>
      <div className="header-flex">
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>Upload Vouchers</h3>
          <p className="text-muted">Upload and manage voucher documents.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h4 style={{ marginTop: 0, marginBottom: "1rem" }}>Upload New Voucher</h4>
        <form onSubmit={handleUpload}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
              <label className="form-label">Voucher No</label>
              <input className="form-control" value={voucherNo} onChange={(e) => setVoucherNo(e.target.value)} placeholder="Voucher number" />
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
        headers={["Voucher No", "File Name", "Upload Date", "Actions"]}
        data={voucherList}
        renderRow={(item, index) => (
          <tr key={index}>
            <td className="font-semibold"><Receipt size={16} style={{ marginRight: 8, verticalAlign: "middle", color: "var(--primary-color)" }} />{item.voucherNo || "-"}</td>
            <td>{item.filename}</td>
            <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</td>
            <td>
              <button onClick={() => window.open(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/uploads/vouchers/${item.filename}`, "_blank")} style={{ background: "transparent", border: "none", color: "var(--primary-color)", cursor: "pointer", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: 4 }}>
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

export default UploadVouchers;