import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { Eye, Trash2 } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";

const Branches = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  
  const initialFormState = {
    codeInitial: "MCPL",
    code: "",
    branch: "",
    name: "",
    address: "",
    phno: "",
    email: ""
  };
  const [form, setForm] = useState(initialFormState);

  // Pagination and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/branches`);
      if (res.data.success) setBranches(res.data.data || []);
    } catch (err) {
      console.error("Fetch branches error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item) => {
    setForm({
      codeInitial: item.codeInitial || "MCPL",
      code: item.code || "",
      branch: item.branch || "",
      name: item.name || "",
      address: item.address || "",
      phno: item.phno || "",
      email: item.email || ""
    });
    setEditing(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const tempId = "temp-" + Date.now();
    try {
      if (editing) {
        setBranches(prev => prev.map(b => b.id === editing.id ? { ...b, ...form } : b));
        await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/branches/${editing.id}`, form);
        setEditing(null);
      } else {
        setBranches(prev => [{ ...form, id: tempId }, ...prev]);
        const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/branches`, form);
        if (res.data.success && res.data.data) {
          setBranches(prev => prev.map(b => b.id === tempId ? res.data.data : b));
        } else {
          fetchBranches();
        }
      }
      setForm(initialFormState);
    } catch (err) {
      console.error("Save error", err);
      fetchBranches();
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Branch",
      message: "Are you sure you want to delete this branch? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    setBranches(prev => prev.filter(b => b.id !== id));
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/branches/${id}`);
    } catch (err) {
      console.error("Delete error", err);
      fetchBranches();
    }
  };

  // Filter branches based on search query
  const filteredBranches = branches.filter(b => {
    const query = searchQuery.toLowerCase();
    return (
      (b.code || "").toLowerCase().includes(query) ||
      (b.branch || "").toLowerCase().includes(query) ||
      (b.name || "").toLowerCase().includes(query) ||
      (b.address || "").toLowerCase().includes(query) ||
      (b.phno || "").toLowerCase().includes(query) ||
      (b.email || "").toLowerCase().includes(query)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredBranches.length / entriesPerPage) || 1;
  const currentData = filteredBranches.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleEntriesChange = (e) => {
    setEntriesPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "20px" }}>
      {/* Title */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "1.6rem", color: "#64748b", margin: 0, fontWeight: "500" }}>{editing ? "Edit Branch" : "Add Branch"}</h3>
      </div>

      {/* Form Section */}
      <div style={{ marginBottom: "2rem" }}>
        <form onSubmit={handleSave}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Code Initial</label>
              <input 
                type="text" 
                value={form.codeInitial} 
                readOnly
                style={{ width: "100%", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", backgroundColor: "#f1f5f9", color: "#475569", outline: "none" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Branch Code</label>
              <input 
                type="text" 
                value={form.code} 
                onChange={(e) => setForm({ ...form, code: e.target.value })} 
                style={{ width: "100%", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", color: "#475569" }}
              />
            </div>
            
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Branch Name<span style={{ color: "#ef4444" }}>*</span></label>
              <input 
                type="text" 
                value={form.branch} 
                placeholder="Enter Branch"
                onChange={(e) => setForm({ ...form, branch: e.target.value })} 
                required
                style={{ width: "100%", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", color: "#475569" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Contact Person<span style={{ color: "#ef4444" }}>*</span></label>
              <input 
                type="text" 
                value={form.name} 
                placeholder="Enter the Contact Person Name"
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                required
                style={{ width: "100%", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", color: "#475569" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Address<span style={{ color: "#ef4444" }}>*</span></label>
            <textarea 
              rows="3"
              value={form.address} 
              placeholder="Enter the Address"
              onChange={(e) => setForm({ ...form, address: e.target.value })} 
              required
              style={{ width: "100%", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", color: "#475569", resize: "none" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Phone Number<span style={{ color: "#ef4444" }}>*</span></label>
              <input 
                type="text" 
                value={form.phno} 
                placeholder="Enter the Phone Number"
                onChange={(e) => setForm({ ...form, phno: e.target.value })} 
                required
                style={{ width: "100%", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", color: "#475569" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginBottom: "0.5rem" }}>Email<span style={{ color: "#ef4444" }}>*</span></label>
              <input 
                type="email" 
                value={form.email} 
                placeholder="Enter the Email"
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
                required
                style={{ width: "100%", padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", color: "#475569" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
            <button 
              type="submit"
              style={{ backgroundColor: "#6366f1", color: "white", border: "none", padding: "0.6rem 2rem", borderRadius: "4px", fontWeight: "500", cursor: "pointer", textTransform: "uppercase", fontSize: "0.9rem" }}
            >
              {editing ? "UPDATE BRANCH" : "ADD BRANCH"}
            </button>
            {editing && (
              <button 
                type="button"
                onClick={() => { setEditing(null); setForm(initialFormState); }}
                style={{ marginLeft: "1rem", backgroundColor: "#94a3b8", color: "white", border: "none", padding: "0.6rem 2rem", borderRadius: "4px", fontWeight: "500", cursor: "pointer", textTransform: "uppercase", fontSize: "0.9rem" }}
              >
                CANCEL
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table Section */}
      <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "10px" }}>
        
        {/* Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "10px" }}>
          <div style={{ fontSize: "0.9rem", color: "#64748b" }}>
            Show 
            <select value={entriesPerPage} onChange={handleEntriesChange} style={{ margin: "0 0.5rem", padding: "0.2rem", border: "1px solid #cbd5e1", borderRadius: "2px" }}>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            entries
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.9rem", color: "#64748b" }}>Search:</label>
            <input 
              type="text" 
              value={searchQuery}
              onChange={handleSearchChange}
              style={{ border: "1px solid #cbd5e1", padding: "0.25rem 0.5rem", borderRadius: "2px", width: "200px" }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Branch Code ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Branch Name ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Contact Person ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Address ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Phone Number ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0" }}>Email ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", borderRight: "1px solid #e2e8f0", textAlign: "center" }}>Edit ⇅</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", textAlign: "center" }}>Delete ⇅</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading...</td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No matching records found.</td>
                </tr>
              ) : (
                currentData.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "white" }}>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>{item.codeInitial || "MCPL"}-{item.code || ""}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>{item.branch || "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0", textTransform: "uppercase" }}>{item.name || "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0", maxWidth: "250px" }}>{item.address || "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>{item.phno || "-"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>{item.email || "-"}</td>
                    <td style={{ padding: "12px", borderRight: "1px solid #e2e8f0", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <button 
                          onClick={() => handleEditClick(item)} 
                          style={{ backgroundColor: "#6366f1", border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer" }}
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        {isSuperAdmin ? (
                          <button 
                            onClick={() => handleDelete(item.id)}
                            style={{ backgroundColor: "#ef4444", border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button 
                            disabled
                            style={{ backgroundColor: "#fca5a5", border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "not-allowed" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "15px", fontSize: "0.85rem", color: "#64748b" }}>
          <div>
            Showing {filteredBranches.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, filteredBranches.length)} of {filteredBranches.length} entries
          </div>
          <div style={{ display: "flex", gap: "0.2rem" }}>
            <button 
              onClick={prevPage}
              disabled={currentPage === 1}
              style={{ padding: "0.4rem 0.8rem", border: "1px solid #cbd5e1", backgroundColor: currentPage === 1 ? "#f1f5f9" : "white", color: currentPage === 1 ? "#94a3b8" : "#334155", cursor: currentPage === 1 ? "not-allowed" : "pointer", borderTopLeftRadius: "4px", borderBottomLeftRadius: "4px" }}
            >
              Previous
            </button>
            <div style={{ padding: "0.4rem 0.8rem", borderTop: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", backgroundColor: "#6366f1", color: "white" }}>
              {currentPage}
            </div>
            <button 
              onClick={nextPage}
              disabled={currentPage === totalPages}
              style={{ padding: "0.4rem 0.8rem", border: "1px solid #cbd5e1", backgroundColor: currentPage === totalPages ? "#f1f5f9" : "white", color: currentPage === totalPages ? "#94a3b8" : "#334155", cursor: currentPage === totalPages ? "not-allowed" : "pointer", borderTopRightRadius: "4px", borderBottomRightRadius: "4px" }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Branches;