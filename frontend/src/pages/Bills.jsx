import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import Table from "../components/Table";
import { } from "../components/SkeletonLoader";
import { Trash2, FileText, IndianRupee, CreditCard, AlertCircle, Clock } from "lucide-react";
import RupeeIcon from '../components/RupeeIcon';
import StatsPanel from "../components/StatsPanel";
import { useSync } from "../context/SyncContext";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { formatDate, formatAmount } from '../utils/formatters';

const Bills = () => {
  const { syncQueue } = useSync();
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimarg.com';

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
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills/${encodeURIComponent(id)}`);
    } catch (err) {
      console.error("Delete bill error", err);
      fetchBills();
    }
  };

  const displayBills = React.useMemo(() => {
    const pending = (syncQueue || [])
      .filter(req => req.method === 'post' && req.url.includes('/bills'))
      .map(req => ({
        ...req.data,
        id: req.tempId,
        isOfflinePending: true,
      }));
    return [...pending, ...bills];
  }, [bills, syncQueue]);

  return (
    <div className="page-content">
      <div className="header-flex">
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "10px" }}>
            Bills / Invoices
          </h3>
          <p className="text-muted" style={{ margin: 0 }}>View generated bills and invoices.</p>
        </div>
      </div>
      
      <StatsPanel stats={[
        { label: "Total Bills", value: displayBills.length, icon: FileText, color: "blue" },
        { label: "Total Amount", value: "₹" + displayBills.reduce((sum, b) => sum + parseFloat(b.amount || b.total || 0), 0).toFixed(2), icon: IndianRupee, color: "green" },
        { label: "Amount Paid", value: "₹" + displayBills.reduce((sum, b) => sum + parseFloat(b.paidAmount || 0), 0).toFixed(2), icon: CreditCard, color: "orange" },
        { label: "Outstanding", value: "₹" + displayBills.reduce((sum, b) => sum + parseFloat((b.amount || b.total || 0) - (b.paidAmount || 0)), 0).toFixed(2), icon: AlertCircle, color: "red" }
      ]} />

      <Table
        pagination={true}
        loading={loading}
        headers={["Bill No", "Date", "Client", "Amount (₹)", "Status", "Actions"]}
        data={displayBills}
        renderRow={(b, i) => (
          <tr key={b.id || i} style={{ opacity: b.isOfflinePending ? 0.7 : 1 }}>
            <td>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {b.id}
                {b.isOfflinePending && <Clock size={14} color="#f59e0b" title="Pending Sync (Offline)" />}
              </div>
            </td>
            <td>{formatDate(b.invoice_date || b.date || b.createdAt)}</td>
            <td>{b.client || "-"}</td>
            <td><span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}><RupeeIcon size={14} />&nbsp;{formatAmount(b.amount || b.total)}</span></td>
            <td>
              {(() => {
                const total = parseFloat(b.amount || b.total || 0);
                const paid = parseFloat(b.paidAmount || 0);
                let status = b.status || "Unpaid";
                if (paid >= total && total > 0) status = "Paid";
                else if (paid > 0 && paid < total) status = "Partial";
                else if (paid === 0) status = "Unpaid";

                const isPaid = status === "Paid";
                const isPartial = status === "Partial";

                return (
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '0.75rem', 
                    fontWeight: '600',
                    backgroundColor: isPaid ? '#dcfce7' : (isPartial ? '#fef9c3' : '#fee2e2'),
                    color: isPaid ? '#166534' : (isPartial ? '#854d0e' : '#991b1b')
                  }}>
                    {status}
                  </span>
                );
              })()}
            </td>
            <td>
              <button
                disabled={b.isOfflinePending}
                onClick={() => window.location.href = `/bills/view1/${b.id}`}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--primary-color)",
                  cursor: b.isOfflinePending ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  opacity: b.isOfflinePending ? 0.5 : 1
                }}
              >
                View
              </button>
              {isSuperAdmin && !b.isOfflinePending && (
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
