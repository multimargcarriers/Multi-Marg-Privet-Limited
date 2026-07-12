import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import Table from "../components/Table";
import { TablePageSkeleton } from "../components/SkeletonLoader";
import { Trash2 } from "lucide-react";
import RupeeIcon from '../components/RupeeIcon';
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";

const Bills = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills`);
      if (res.data.success) setBills(res.data.data || []);
    } catch (err) {
      console.error("Fetch bills", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Bill",
      message: "Are you sure you want to delete this bill? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!isConfirmed) return;
    
    setBills(prev => prev.filter(b => b.id !== id));
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills/${id}`);
    } catch (err) {
      console.error("Delete bill error", err);
      fetchBills();
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>
            Bills / Invoices
          </h3>
          <p className="text-muted">View generated bills and invoices.</p>
        </div>
      </div>

      <Table
        loading={loading}
        headers={["Bill No", "Date", "Client", "Amount (?)", "Status", "Actions"]}
        data={bills}
        renderRow={(b, i) => (
          <tr key={b.id || i}>
            <td>{b.id}</td>
            <td>{b.client || "-"}</td>
            <td><RupeeIcon size={14} /> {b.amount || "-"}</td>
            <td>
              {b.createdAt ? new Date(b.createdAt).toLocaleString() : "-"}
            </td>
            <td>
              <button
                onClick={() => window.location.href = `/bills/view1/${b.id}`}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--primary-color)",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                View
              </button>
              {isSuperAdmin && (
                <button
                  onClick={() => handleDelete(b.id)}
                  style={{
                    marginLeft: 8,
                    background: "transparent",
                    border: "none",
                    color: "#dc2626",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </td>
          </tr>
        )}
      />
    </div>
  );
};

export default Bills;
