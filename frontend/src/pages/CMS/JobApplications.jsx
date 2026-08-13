import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { Download, Trash2, Edit } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useDialog } from "../../context/DialogContext";

const JobApplications = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/applications`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) setApplications(res.data.data || []);
    } catch (err) {
      console.error("Fetch applications error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/applications/${id}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setApplications(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app));
    } catch (err) {
      console.error("Status update error", err);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Application",
      message: "Are you sure you want to delete this job application? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    setApplications(prev => prev.filter(a => a.id !== id));
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/applications/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (err) {
      console.error("Delete error", err);
      fetchApplications();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return { bg: '#e0f2fe', text: '#0284c7' };
      case 'Reviewed': return { bg: '#fef3c7', text: '#d97706' };
      case 'Interview': return { bg: '#dcfce7', text: '#16a34a' };
      case 'Hired': return { bg: '#dbeafe', text: '#1d4ed8' };
      case 'Rejected': return { bg: '#fee2e2', text: '#dc2626' };
      default: return { bg: '#f1f5f9', text: '#64748b' };
    }
  };

  const getSafeUrl = (url) => {
    if (!url) return "#";
    // If it accidentally got saved with localhost prepended in DB, strip it
    if (url.includes("res.cloudinary.com")) {
      const cloudIdx = url.indexOf("https://res.cloudinary.com");
      if (cloudIdx !== -1) {
        url = url.substring(cloudIdx);
      }
    }
    // Return direct URL if it's already a full HTTP link
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    // Fallback for old local files
    return `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${url}`;
  };

  return (
    <div className="page-content">
      <div className="header-flex" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: "1.8rem", color: "var(--primary-color)", margin: 0, fontWeight: "700", letterSpacing: "-0.5px" }}>Job Applications</h3>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Date</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Applicant Details</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Applied For</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600" }}>Status</th>
                <th style={{ padding: "12px", fontSize: "0.85rem", color: "#475569", fontWeight: "600", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading...</td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>No applications received yet.</td>
                </tr>
              ) : (
                applications.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "white", verticalAlign: "top" }}>
                    <td style={{ padding: "12px", color: "#64748b", fontSize: "0.9rem", whiteSpace: "nowrap" }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: "600", color: "#0f172a" }}>{item.name}</div>
                      <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "2px" }}>{item.email}</div>
                      <div style={{ fontSize: "0.85rem", color: "#64748b" }}>{item.phone}</div>
                    </td>
                    <td style={{ padding: "12px", color: "#0f172a", fontWeight: "500" }}>
                      {item.jobTitle}
                      {item.coverLetter && (
                        <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px", fontStyle: "italic", maxHeight: "60px", overflow: "hidden", textOverflow: "ellipsis" }}>
                          "{item.coverLetter}"
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <select 
                        value={item.status || "New"}
                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                        style={{ 
                          padding: "4px 8px", 
                          borderRadius: "12px", 
                          fontSize: "0.75rem", 
                          fontWeight: "600", 
                          backgroundColor: getStatusColor(item.status || "New").bg, 
                          color: getStatusColor(item.status || "New").text,
                          border: "none",
                          outline: "none",
                          cursor: "pointer"
                        }}
                      >
                        <option value="New">New</option>
                        <option value="Reviewed">Reviewed</option>
                        <option value="Interview">Interview</option>
                        <option value="Hired">Hired</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                    <td style={{ padding: "16px 12px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
                        {item.resumeUrl && (
                          <a 
                            href={getSafeUrl(item.resumeUrl)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-primary" 
                            style={{ width: "32px", height: "32px", padding: "0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: 'none' }}
                            title="Download Resume"
                          >
                            <Download size={14} />
                          </a>
                        )}
                        {isSuperAdmin && (
                          <button onClick={() => handleDelete(item.id)} className="btn btn-danger" style={{ width: "32px", height: "32px", padding: "0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }} title="Delete Application">
                            <Trash2 size={14} />
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
      </div>
    </div>
  );
};

export default JobApplications;
