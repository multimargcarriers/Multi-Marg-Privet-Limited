import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Table from "../../components/Table";
import { Search, ShoppingCart, IndianRupee, PieChart, Users } from "lucide-react";

const PurchaseReports = () => {
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [searchCompany, setSearchCompany] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [purchasesRes, outstandingsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/purchases`),
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/vendor-outstanding`)
      ]);

      const purchases = purchasesRes.data.success ? (purchasesRes.data.data || []) : [];
      const outstandings = outstandingsRes.data.success ? (outstandingsRes.data.data || []) : [];

      const vendorMap = {};

      purchases.forEach(p => {
        if (!p.vendor) return;
        if (!vendorMap[p.vendor]) {
          vendorMap[p.vendor] = { vendor: p.vendor, totalBill: 0, payments: 0 };
        }
        vendorMap[p.vendor].totalBill += parseFloat(p.total || 0);
      });

      outstandings.forEach(o => {
        if (!o.vendor) return;
        if (!vendorMap[o.vendor]) {
          vendorMap[o.vendor] = { vendor: o.vendor, totalBill: 0, payments: 0 };
        }
        vendorMap[o.vendor].payments += parseFloat(o.amount || 0);
      });

      const aggregatedData = Object.values(vendorMap).map(v => ({
        vendor: v.vendor,
        totalBill: v.totalBill,
        outstanding: v.totalBill - v.payments
      }));

      aggregatedData.sort((a, b) => a.vendor.localeCompare(b.vendor));

      setAllData(aggregatedData);
      setData(aggregatedData);
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (!searchCompany.trim()) {
      setData(allData);
      return;
    }
    const lowerSearch = searchCompany.toLowerCase();
    const filtered = allData.filter(item => 
      item.vendor.toLowerCase().includes(lowerSearch)
    );
    setData(filtered);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const stats = useMemo(() => {
    const totalVendors = allData.length;
    const totalPurchases = allData.reduce((s, item) => s + item.totalBill, 0);
    const totalOutstanding = allData.reduce((s, item) => s + item.outstanding, 0);
    return { totalVendors, totalPurchases, totalOutstanding };
  }, [allData]);

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
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ background: "#f5f3ff", padding: "8px", borderRadius: "10px", display: "flex" }}>
            <ShoppingCart size={22} style={{ color: "#8b5cf6" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, color: "#0f172a" }}>
              Purchase & Vendor Report
            </h3>
            <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 500 }}>
              Monitor purchase expenses and track outstanding vendor balances
            </span>
          </div>
        </div>
      </div>

      {/* SEARCH FORM */}
      <form onSubmit={handleSearch} style={{
          backgroundColor: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          marginBottom: "1.5rem",
          overflow: "hidden"
      }}>
        <div style={{ background: "linear-gradient(90deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)", height: "4px", width: "100%" }} />
        <div style={{ padding: "1.5rem 1.75rem" }}>
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Search Vendor Name</label>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input 
                  type="text" 
                  placeholder="Type vendor name..." 
                  value={searchCompany}
                  onChange={(e) => setSearchCompany(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem 0.65rem 0.65rem 2.25rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>
            <div>
              <button 
                type="submit" 
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  color: "white",
                  border: "none",
                  padding: "0.65rem 2.5rem",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(139, 92, 246, 0.25)",
                  height: "41px"
                }}
              >
                FILTER
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* STATS CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Active Vendors</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", marginTop: "4px", display: "flex", alignItems: "center" }}>
               {stats.totalVendors}
            </div>
          </div>
          <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "12px" }}><Users size={24} color="#64748b" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Purchase Value</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#8b5cf6", marginTop: "4px", display: "flex", alignItems: "center" }}>
               {formatCurrency(stats.totalPurchases)}
            </div>
          </div>
          <div style={{ background: "#ede9fe", padding: "12px", borderRadius: "12px" }}><IndianRupee size={24} color="#8b5cf6" /></div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Outstanding</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#ef4444", marginTop: "4px", display: "flex", alignItems: "center" }}>
               {formatCurrency(stats.totalOutstanding)}
            </div>
          </div>
          <div style={{ background: "#fee2e2", padding: "12px", borderRadius: "12px" }}><PieChart size={24} color="#ef4444" /></div>
        </div>
      </div>

      {/* TABLE */}
      <div style={{ background: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <Table
          loading={loading}
          pagination={true}
          headers={["Vendor", "Total Bill", "Outstanding"]}
          data={data}
          renderRow={(item, index) => (
            <tr key={index} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "0.95rem" }}>
              <td style={{ padding: "1rem", color: "#0f172a", fontWeight: "600", textTransform: "uppercase" }}>
                {item.vendor}
              </td>
              <td style={{ padding: "1rem", color: "#64748b", fontWeight: "600", textAlign: "right", paddingRight: "2rem" }}>
                {formatCurrency(item.totalBill)}
              </td>
              <td style={{ padding: "1rem", color: item.outstanding > 0 ? "#ef4444" : "#10b981", fontWeight: "700", textAlign: "right", paddingRight: "2rem" }}>
                {formatCurrency(item.outstanding)}
              </td>
            </tr>
          )}
        />
      </div>
    </div>
  );
};

export default PurchaseReports;
