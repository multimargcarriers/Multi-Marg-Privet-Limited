import React, { useState, useEffect } from "react";
import axios from "axios";
import Table from "../../components/Table";

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

      // Sort alphabetically by vendor name
      aggregatedData.sort((a, b) => a.vendor.localeCompare(b.vendor));

      setAllData(aggregatedData);
      setData(aggregatedData);
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
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

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100%", padding: "20px", borderRadius: "8px" }}>
      <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)" }}>
        <h4 style={{ fontSize: "1.2rem", color: "#374151", margin: 0, marginBottom: "1rem", fontWeight: "600" }}>
          Purchase Bills Overview
        </h4>
        
        <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: "1.5rem" }}></div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <input 
            type="text" 
            placeholder="Search Company" 
            value={searchCompany}
            onChange={(e) => setSearchCompany(e.target.value)}
            style={{ 
              padding: "0.375rem 0.75rem", 
              border: "1px solid #ccc", 
              borderRadius: "4px",
              fontSize: "0.9rem",
              minWidth: "250px"
            }}
          />
          <button 
            onClick={handleSearch}
            style={{ 
              backgroundColor: "#e5e7eb", 
              border: "1px solid #9ca3af", 
              padding: "0.375rem 1rem", 
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: "500",
              color: "#374151"
            }}
          >
            Search
          </button>
        </div>

        <Table
          loading={loading}
          pagination={true}
          headers={["Vendor", "Total Bill", "Outstanding"]}
          data={data}
          renderRow={(item, index) => (
            <tr key={index} style={{ backgroundColor: index % 2 !== 0 ? "#f9fafb" : "white" }}>
              <td style={{ color: "#3b82f6", fontWeight: "500", fontSize: "0.85rem", textTransform: "uppercase" }}>
                {item.vendor}
              </td>
              <td style={{ color: "#10b981", fontWeight: "600", fontSize: "0.85rem", textAlign: "right", paddingRight: "2rem" }}>
                {formatCurrency(item.totalBill)}
              </td>
              <td style={{ color: "#10b981", fontWeight: "600", fontSize: "0.85rem", textAlign: "right", paddingRight: "2rem" }}>
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
