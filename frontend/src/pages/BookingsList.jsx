import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import Table from "../components/Table";
import { Search, Eye, Printer, Trash2 } from "lucide-react";
import { TablePageSkeleton } from '../components/SkeletonLoader';
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";

const BookingsList = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bookings`);
      if (res.data.success) setBookings(res.data.data || []);
    } catch (err) { console.error("Fetch bookings error", err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Booking",
      message: "Are you sure you want to delete this booking? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bookings/${id}`);
      fetchBookings();
    } catch (err) { console.error("Delete booking error", err); }
  };

  const filtered = bookings.filter(b =>
    !search || (b.client || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.awb || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.origin || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.destination || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>All Bookings (LR)</h3>
          <p className="text-muted">View and manage all lorry receipt bookings.</p>
        </div>
        <button className="btn btn-primary" style={{ padding: "0 1.5rem", height: "45px" }} onClick={() => navigate("/bookings/create")}>
          + New Booking
        </button>
      </div>

      <div className="glass-panel" style={{ padding: "1rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <input className="form-control" placeholder="Search by client, LR no, origin, destination..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ height: 50 }}><Search size={18} /></button>
        </div>
      </div>

      <Table
        loading={loading}
        headers={["LR No", "Date", "Client", "Origin", "Destination", "Freight (₹)", "Status", "Actions"]}
        data={filtered}
        renderRow={(item, index) => (
          <tr key={index}>
            <td className="font-semibold">#{item.awb || item.id?.slice(-6) || index + 1}</td>
            <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</td>
            <td>{item.client}</td>
            <td>{item.origin}</td>
            <td>{item.destination}</td>
            <td>₹ {parseFloat(item.freight || item.frieght || 0).toFixed(2)}</td>
            <td><span style={{ padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600", background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>Active</span></td>
            <td>
              <button onClick={() => navigate(`/bills?lr=${item.awb || item.id}`)} style={{ marginRight: 8, background: "transparent", border: "none", color: "var(--primary-color)", cursor: "pointer" }}><Eye size={18} /></button>
              <button onClick={() => window.open(`/print-lr/${item.id}`, "_blank")} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><Printer size={18} /></button>
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

export default BookingsList;