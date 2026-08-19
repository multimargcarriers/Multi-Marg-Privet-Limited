import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import Papa from "papaparse";
import Table from "../../components/Table";
import { Plus, Truck, Check, X, Clock, Trash2, Edit, Printer, Download, Filter, Search, Upload, FileText, MessageSquare, Send, Settings } from "lucide-react";
import RupeeIcon from '../../components/RupeeIcon';
import { formatAllCaps,  formatDate } from "../../utils/formatters";
import { useToast } from "../../context/ToastContext";
import { AuthContext } from "../../context/AuthContext";
import { useDialog } from "../../context/DialogContext";
import appDB from "../../utils/appDB";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const VendorMIS = () => {
  const { addToast } = useToast();
  const { confirm } = useDialog();
  const { token, user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimarg.com';
  const isAdminOrSuperAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.email === 'admin@multimarg.com';

  const initialVendorMisRow = { handoverTo: "", date: "", from: "", vehicleNo: "", to: "", particular: "", mode: "", others: "", amount: "", status: "Pending" };
  const getInitialVendorMisForm = () => ({
    vendorName: !isSuperAdmin ? formatAllCaps(user?.name || "") : "",
    details: [{ ...initialVendorMisRow }]
  });
  const initialVendorMisForm = getInitialVendorMisForm();
  
  const [vendorMisEntries, setVendorMisEntries] = useState([]);
  const [activeRemarksModal, setActiveRemarksModal] = useState(null);
  const [remarkText, setRemarkText] = useState("");
  const [submittingRemark, setSubmittingRemark] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [printHeader, setPrintHeader] = useState("MULTIMARG");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedMode, setSelectedMode] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const remarksEndRef = useRef(null);

  const uniqueVendors = useMemo(() => {
    const set = new Set();
    vendorMisEntries.forEach(item => {
      if (item.vendorName) set.add(item.vendorName);
    });
    return Array.from(set).sort();
  }, [vendorMisEntries]);

  const uniqueVehicles = useMemo(() => {
    const set = new Set();
    vendorMisEntries.forEach(item => {
      item.details?.forEach(d => {
        if (d.vehicleNo) set.add(d.vehicleNo);
      });
    });
    return Array.from(set).sort();
  }, [vendorMisEntries]);

  const uniqueModes = useMemo(() => {
    const set = new Set();
    vendorMisEntries.forEach(item => {
      item.details?.forEach(d => {
        if (d.mode) set.add(d.mode);
      });
    });
    return Array.from(set).sort();
  }, [vendorMisEntries]);

  useEffect(() => {
    if (activeRemarksModal && activeRemarksModal.remarks) {
      remarksEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeRemarksModal?.remarks]);

  const filteredEntries = useMemo(() => {
    const filtered = vendorMisEntries.filter(item => {
      // 1. Date Filter
      if (startDate || endDate) {
        const mainDate = item.details?.[0]?.date || item.createdAt;
        const itemDate = new Date(mainDate);
        itemDate.setHours(0,0,0,0);
        const start = startDate ? new Date(startDate) : new Date("1970-01-01");
        start.setHours(0,0,0,0);
        const end = endDate ? new Date(endDate) : new Date("2100-01-01");
        end.setHours(23,59,59,999);
        if (itemDate < start || itemDate > end) return false;
      }

      // 2. Vendor Dropdown Filter
      if (selectedVendor && item.vendorName !== selectedVendor) {
        return false;
      }

      // 3. Approval Status Dropdown Filter
      if (selectedApprovalStatus && item.approvalStatus !== selectedApprovalStatus) {
        return false;
      }

      // 4. Vehicle Dropdown Filter
      if (selectedVehicle && !item.details?.some(d => d.vehicleNo === selectedVehicle)) {
        return false;
      }

      // 5. Mode Dropdown Filter
      if (selectedMode && !item.details?.some(d => d.mode === selectedMode)) {
        return false;
      }

      // 6. Status Dropdown Filter
      if (selectedStatus && !item.details?.some(d => d.status === selectedStatus)) {
        return false;
      }
      
      // 7. Search Filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesVendor = (item.vendorName || "").toLowerCase().includes(q);
        const matchesApproval = (item.approvalStatus || "").toLowerCase().includes(q);
        const matchesDetails = item.details?.some(d => 
          (d.particular || "").toLowerCase().includes(q) ||
          (d.vehicleNo || "").toLowerCase().includes(q) ||
          (d.from || "").toLowerCase().includes(q) ||
          (d.to || "").toLowerCase().includes(q) ||
          (d.handoverTo || "").toLowerCase().includes(q) ||
          (d.mode || "").toLowerCase().includes(q) ||
          (d.status || "").toLowerCase().includes(q) ||
          String(d.amount || "").includes(q) ||
          String(d.others || "").includes(q)
        );
        if (!matchesVendor && !matchesApproval && !matchesDetails) return false;
      }
      return true;
    });

    // Sort by vendor-entered date (details[0]?.date or createdAt fallback) descending
    return [...filtered].sort((a, b) => {
      const dateA = a.details?.[0]?.date || a.createdAt || "";
      const dateB = b.details?.[0]?.date || b.createdAt || "";
      return new Date(dateB) - new Date(dateA);
    });
  }, [vendorMisEntries, startDate, endDate, searchQuery, selectedVendor, selectedVehicle, selectedMode, selectedStatus, selectedApprovalStatus]);

  // Exclude pending/rejected entries from total
  const totalReceivable = filteredEntries.reduce((sum, item) => {
    if (item.approvalStatus === 'Pending' || item.approvalStatus === 'Rejected') {
      return sum;
    }
    const approvedDetailsAmount = (item.details || []).reduce((dSum, d) => {
      if (d.status === 'Pending' || d.status === 'Rejected') {
        return dSum;
      }
      return dSum + (parseFloat(d.amount) || 0) + (parseFloat(d.others) || 0);
    }, 0);
    return sum + (approvedDetailsAmount > 0 ? approvedDetailsAmount : (parseFloat(item.totalAmount) || 0));
  }, 0);

  const handleExportCSV = () => {
    let csv = "Vendor name,Handover to,Date,From,To,Veh no,Particular,Mode,Amount,Others,Status,Total amount,Approval status,Created at\n";
    filteredEntries.forEach(item => {
      if (item.details && item.details.length > 0) {
        item.details.forEach((d, dIdx) => {
          const createdAt = dIdx === 0 ? (item.createdAt ? formatDate(item.createdAt) : '') : '';
          const vendorName = dIdx === 0 ? (item.vendorName || '') : '';
          const totalAmt = dIdx === 0 ? (item.totalAmount || '') : '';
          const approvalStatus = dIdx === 0 ? (item.approvalStatus || '') : '';
          
          csv += `"${vendorName}","${d.handoverTo || ''}","${d.date ? formatDate(d.date) : ''}","${d.from || ''}","${d.to || ''}","${d.vehicleNo || ''}","${d.particular || ''}","${d.mode || ''}","${d.amount || ''}","${d.others || ''}","${d.status || ''}","${totalAmt}","${approvalStatus}","${createdAt}"\n`;
        });
      } else {
        csv += `"${item.vendorName || ''}","","","","","","","","","","","${item.totalAmount || ''}","${item.approvalStatus || ''}","${item.createdAt ? formatDate(item.createdAt) : ''}"\n`;
      }
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `Vendor_MIS_Export_${formatDate(new Date())}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const fileInputRef = useRef(null);

  const handleSampleCSV = () => {
    const csv = "Vendor name,Handover to,Date,From,To,Veh no,Particular,Mode,Amount,Others,Status,Total amount,Approval status,Created at\nABC Logistics,John Doe,2026-08-01,Delhi,Mumbai,DL1A1234,Transport,Road,15000,500,Pending,15500,Approved,2026-08-01\n";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `Vendor_MIS_Sample.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data;
        if (data.length === 0) {
          addToast("CSV is empty", "error");
          return;
        }

        const vendorsMap = {};

        data.forEach(row => {
          // Fallback vendor name if empty
          const vendorName = row['Vendor name'] || `Unknown Vendor ${Math.floor(Math.random() * 1000)}`;
          if (!vendorsMap[vendorName]) {
            vendorsMap[vendorName] = {
              vendorName: vendorName,
              createdAt: row['Created at'] ? formatDate(row['Created at']) : formatDate(new Date()),
              details: []
            };
          }

          if (row['Date'] || row['Veh no']) {
            vendorsMap[vendorName].details.push({
              handoverTo: row['Handover to'] || '',
              date: formatDate(row['Date'] || new Date()),
              from: row['From'] || '',
              to: row['To'] || '',
              vehicleNo: row['Veh no'] || '',
              particular: row['Particular'] || '',
              mode: row['Mode'] || 'Road',
              amount: row['Amount'] || '0',
              others: row['Others'] || '0',
              status: row['Status'] || (isAdminOrSuperAdmin ? 'Approved' : 'Pending')
            });
          }
        });

        const vendorsToImport = Object.values(vendorsMap);
        let successCount = 0;

        for (let vendor of vendorsToImport) {
          try {
            vendor.totalAmount = vendor.details.reduce((sum, d) => sum + (parseFloat(d.amount) || 0) + (parseFloat(d.others) || 0), 0);
            await axios.post(`${API}/vendor-mis`, vendor, { headers: { Authorization: `Bearer ${token}` } });
            successCount++;
          } catch (error) {
            console.error("Failed to import vendor entry:", error);
          }
        }

        addToast(`Imported ${successCount} entries successfully!`, "success");
        axios.get(`${API}/vendor-mis`, { headers: { Authorization: `Bearer ${token}` } })
          .then(res => { if (res.data.success) setVendorMisEntries(res.data.data); })
          .catch(err => console.error(err));
      },
      error: (error) => {
        addToast("Error parsing CSV: " + error.message, "error");
      }
    });
    e.target.value = null;
  };

  useEffect(() => {
    if(token) {
      axios.get(`${API}/vendor-mis`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => { if(res.data.success) setVendorMisEntries(res.data.data); })
        .catch(err => console.error(err));
    }
  }, [token]);

  const [vendorMisForm, setVendorMisForm] = useState(initialVendorMisForm);
  const [showVendorMisForm, setShowVendorMisForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [_editingStatus, setEditingStatus] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showVendorMisForm && e.ctrlKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setVendorMisForm(prev => ({
          ...prev, 
          details: [...prev.details, { ...initialVendorMisRow }]
        }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showVendorMisForm]);

  return (
    <div>
      <div className="no-print">
      <div className="header-flex" style={{ marginBottom: "1.5rem" }}>
         <h3 style={{ fontSize: "1.5rem", color: "#111827", margin: 0 }}>Vendor Vehicle MIS</h3>
         <div className="top-actions-container">
           <div className="date-filter-group" style={{ display: "flex", gap: "5px", alignItems: "center", background: "white", padding: "4px 8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
             <Filter size={16} color="#64748b" />
             <input type="date" className="form-control" style={{ border: "none", height: "30px", padding: "0 5px", fontSize: "0.8rem", width: "115px" }} value={startDate} onChange={e => setStartDate(e.target.value)} />
             <span style={{ color: "#94a3b8" }}>-</span>
             <input type="date" className="form-control" style={{ border: "none", height: "30px", padding: "0 5px", fontSize: "0.8rem", width: "115px" }} value={endDate} onChange={e => setEndDate(e.target.value)} />
           </div>
           
           <button className="btn" style={{ background: "white", border: "1px solid #cbd5e1" }} onClick={handleExportCSV}>
             <Download size={16} style={{ marginRight: 6 }} /> Export CSV
           </button>
           
           {isSuperAdmin && (
             <select 
               className="form-control" 
               style={{ border: "1px solid #cbd5e1", height: "30px", fontSize: "0.8rem", width: "170px", padding: "0 5px", background: "white" }}
               value={printHeader}
               onChange={e => setPrintHeader(e.target.value)}
             >
               <option value="MULTIMARG">Header: Multimarg</option>
               <option value="PRIME">Header: Prime Roadways</option>
             </select>
           )}
           
           <button className="btn" style={{ background: "white", border: "1px solid #cbd5e1" }} onClick={() => window.print()}>
             <Printer size={16} style={{ marginRight: 6 }} /> Print All
           </button>
           
           {!showVendorMisForm && (
             <button className="btn btn-primary" onClick={() => { setVendorMisForm(initialVendorMisForm); setEditingId(null); setEditingStatus(''); setShowVendorMisForm(true); }}>
               <Plus size={16} style={{ marginRight: 6 }} /> Add Vendor Vehicle MIS Entry
             </button>
           )}
         </div>
      </div>
      
      <style>{`
        /* AWS Console Premium Theme Styles */
        .aws-search-container {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          align-items: center;
          width: 100%;
        }
        .aws-search-wrapper {
          position: relative;
          flex: 1;
        }
        .aws-input {
          width: 100%;
          height: 38px;
          padding-left: 40px;
          padding-right: 12px;
          border: 1px solid #aab7b8;
          border-radius: 4px;
          background-color: #ffffff;
          font-size: 0.9rem;
          color: #1e293b;
          transition: all 0.15s ease-in-out;
        }
        .aws-input:focus {
          border-color: #ec7211;
          box-shadow: 0 0 0 2px rgba(236, 114, 17, 0.15);
          outline: none;
        }
        .aws-date-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid #aab7b8;
          border-radius: 4px;
          padding: 0 0.75rem;
          background: #ffffff;
          height: 38px;
        }
        .aws-date-input {
          border: none;
          height: 32px;
          font-size: 0.85rem;
          color: #1e293b;
          outline: none;
          background: transparent;
        }
        .aws-btn-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          height: 38px;
          padding: 0 1rem;
          background: #ffffff;
          border: 1px solid #aab7b8;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.85rem;
          color: #545b64;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .aws-btn-toggle:hover {
          background: #f8f9fa;
          border-color: #545b64;
        }
        .aws-btn-toggle.active {
          background: #f1f5f9;
          border-color: #ec7211;
          color: #ec7211;
        }
        .aws-filters-panel {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1.25rem;
          background: #f8f9fa;
          border: 1px solid #eaeded;
          border-radius: 4px;
          animation: slideDown 0.2s ease-out;
        }
        .aws-filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .aws-filter-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #545b64;
          letter-spacing: 0.5px;
        }
        .aws-select {
          height: 34px;
          border: 1px solid #aab7b8;
          border-radius: 4px;
          background-color: #ffffff;
          font-size: 0.85rem;
          color: #1e293b;
          padding: 0 8px;
          outline: none;
          transition: all 0.15s;
        }
        .aws-select:focus {
          border-color: #ec7211;
          box-shadow: 0 0 0 2px rgba(236, 114, 17, 0.15);
        }
        .aws-btn-reset {
          height: 34px;
          border: 1px solid #d5dbdb;
          background: #fafafa;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.85rem;
          color: #545b64;
          cursor: pointer;
          transition: all 0.15s;
          width: 100%;
        }
        .aws-btn-reset:hover {
          background: #f2f2f2;
          border-color: #aab7b8;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .aws-search-container {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }
          .aws-date-group {
            width: 100%;
            justify-content: space-between;
          }
          .aws-date-input {
            flex: 1;
            text-align: center;
          }
          .aws-btn-toggle {
            width: 100%;
            justify-content: center;
          }
          /* Hide less critical drop downs on mobile by default to keep it neat */
          .aws-mobile-hide {
            display: none !important;
          }
        }
      `}</style>

      {/* Global Search & Date Filters */}
      <div className="no-print aws-search-container">
        <div className="aws-search-wrapper">
          <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input 
            type="text" 
            className="aws-input" 
            placeholder="Search by vendor name, vehicle no, origin, destination, particulars..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
        </div>
        <div className="aws-date-group">
          <Filter size={16} color="#64748b" />
          <input type="date" className="aws-date-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span style={{ color: "#94a3b8" }}>-</span>
          <input type="date" className="aws-date-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <button
          type="button"
          className={`aws-btn-toggle ${showAdvancedFilters ? "active" : ""}`}
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          <Filter size={16} />
          {showAdvancedFilters ? "Hide Dropdowns" : "Show Dropdowns"}
        </button>
      </div>

      {/* Dropdown Filters Grid */}
      {showAdvancedFilters && (
        <div className="no-print aws-filters-panel">
          <div className="aws-filter-group">
            <label className="aws-filter-label">Vendor</label>
            <select className="aws-select" value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
              <option value="">All Vendors</option>
              {uniqueVendors.map((v, i) => <option key={i} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="aws-filter-group">
            <label className="aws-filter-label">Vehicle No</label>
            <select className="aws-select" value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}>
              <option value="">All Vehicles</option>
              {uniqueVehicles.map((v, i) => <option key={i} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="aws-filter-group">
            <label className="aws-filter-label">Mode</label>
            <select className="aws-select" value={selectedMode} onChange={e => setSelectedMode(e.target.value)}>
              <option value="">All Modes</option>
              {uniqueModes.map((m, i) => <option key={i} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="aws-filter-group aws-mobile-hide">
            <label className="aws-filter-label">Row Status</label>
            <select className="aws-select" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
              <option value="">All Row Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div className="aws-filter-group aws-mobile-hide">
            <label className="aws-filter-label">Overall Approval</label>
            <select className="aws-select" value={selectedApprovalStatus} onChange={e => setSelectedApprovalStatus(e.target.value)}>
              <option value="">All Approvals</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div className="aws-filter-group" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="aws-btn-reset" onClick={() => {
              setSelectedVendor("");
              setSelectedVehicle("");
              setSelectedMode("");
              setSelectedStatus("");
              setSelectedApprovalStatus("");
              setStartDate("");
              setEndDate("");
              setSearchQuery("");
            }}>Reset Filters</button>
          </div>
        </div>
      )}

      {showVendorMisForm && (
         <form className="glass-panel slide-down" style={{ padding: "2rem", marginBottom: "2rem" }} onSubmit={async e => {
              e.preventDefault();
              if (!vendorMisForm.vendorName) return addToast("Vendor Name is required", "error");
              if (vendorMisForm.details.length === 0) return addToast("Add at least one detail row", "error");
              
              const totalAmount = vendorMisForm.details.reduce((sum, d) => sum + (parseFloat(d.amount) || 0) + (parseFloat(d.others) || 0), 0);
              
              const newEntry = {
                vendorName: vendorMisForm.vendorName,
                details: vendorMisForm.details,
                totalAmount: totalAmount,
                createdAt: new Date().toISOString()
              };
              
              try {
                if (editingId) {
                  const res = await axios.put(`${API}/vendor-mis/${editingId}`, newEntry, { headers: { Authorization: `Bearer ${token}` } });
                  if(res.data.success) {
                    setVendorMisEntries(vendorMisEntries.map(v => v.id === editingId ? { ...v, ...newEntry } : v));
                    setVendorMisForm(initialVendorMisForm);
                    setEditingId(null);
                    setEditingStatus('');
                    setShowVendorMisForm(false);
                    addToast("Vendor MIS entry updated successfully!", "success");
                  }
                } else {
                  const res = await axios.post(`${API}/vendor-mis`, newEntry, { headers: { Authorization: `Bearer ${token}` } });
                  if(res.data.success) {
                    setVendorMisEntries([res.data.data, ...vendorMisEntries]);
                    setVendorMisForm(initialVendorMisForm);
                    setShowVendorMisForm(false);
                    addToast("Vendor MIS entry added successfully!", "success");
                  }
                }
              } catch(_err) {
                 addToast(editingId ? "Failed to update entry" : "Failed to add entry", "error");
              }
         }}>
            <h5 style={{ marginBottom: "1.5rem", color: "var(--primary-color)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Truck size={20} /> {editingId ? "Edit Vendor MIS Details" : "Enter Vendor MIS Details"}
            </h5>
            <div style={{ padding: "1.5rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "2rem" }}>
              <div className="form-group" style={{ maxWidth: "400px" }}>
                <label className="form-label" style={{ fontWeight: "500", color: "#374151" }}>Vendor Name<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
                {isSuperAdmin ? (
                  <input type="text" className="form-control" placeholder="Enter Vendor Name" value={vendorMisForm.vendorName} onChange={e => setVendorMisForm({...vendorMisForm, vendorName: formatAllCaps(e.target.value)})} required />
                ) : (
                  <input type="text" className="form-control" value={vendorMisForm.vendorName} readOnly style={{ background: "#f3f4f6", cursor: "not-allowed" }} />
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.5rem", borderBottom: "1px solid #e5e7eb", marginBottom: "1rem" }}>
              <label className="form-label" style={{ fontWeight: "600", color: "#111827", textTransform: "uppercase", marginBottom: 0 }}>DETAILS<span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
              <button type="button" onClick={() => setVendorMisForm({...vendorMisForm, details: [...vendorMisForm.details, { ...initialVendorMisRow }]})} style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", color: "#374151", cursor: "pointer", fontWeight: "600", fontSize: "0.875rem", padding: "4px 12px", display: "flex", alignItems: "center" }}>+ Add Row <span style={{ fontSize: "0.65rem", marginLeft: "6px", color: "#6b7280" }}>(Ctrl + +)</span></button>
            </div>
            
            <div style={{ marginBottom: "2rem", paddingBottom: "1rem" }}>
              {vendorMisForm.details.map((detail, idx) => (
                <div key={idx} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1rem", marginBottom: "1rem", position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "0.5rem" }}>
                    <span style={{ fontWeight: "600", color: "#374151" }}>Detail #{idx + 1}</span>
                    {idx > 0 && (
                      <button type="button" onClick={() => {
                          const newDetails = vendorMisForm.details.filter((_, i) => i !== idx);
                          setVendorMisForm({...vendorMisForm, details: newDetails});
                      }} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", fontSize: "0.875rem", fontWeight: "600" }}>
                        Remove Detail
                      </button>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Date</label>
                      <input type="date" className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} value={detail.date} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].date = e.target.value; setVendorMisForm({...vendorMisForm, details: newDetails}); }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>From</label>
                      <input className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="From" value={detail.from} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].from = formatAllCaps(e.target.value); setVendorMisForm({...vendorMisForm, details: newDetails}); }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>To</label>
                      <input className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="To" value={detail.to} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].to = formatAllCaps(e.target.value); setVendorMisForm({...vendorMisForm, details: newDetails}); }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Particular</label>
                      <input className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="Particular" value={detail.particular} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].particular = formatAllCaps(e.target.value); setVendorMisForm({...vendorMisForm, details: newDetails}); }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Mode</label>
                      <select className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} value={detail.mode} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].mode = e.target.value; setVendorMisForm({...vendorMisForm, details: newDetails}); }}>
                          <option value="">Mode...</option>
                          <option value="ROAD">Road</option>
                          <option value="TRAIN">Train</option>
                          <option value="FLIGHT">Flight</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Vehicle No</label>
                      <input className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="Vehicle No" value={detail.vehicleNo} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].vehicleNo = formatAllCaps(e.target.value); setVendorMisForm({...vendorMisForm, details: newDetails}); }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Others (₹)</label>
                      <input className="form-control" type="number" step="0.01" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="Others" value={detail.others} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].others = e.target.value; setVendorMisForm({...vendorMisForm, details: newDetails}); }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Amount (₹)</label>
                      <input className="form-control" type="number" step="0.01" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="Amount" value={detail.amount} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].amount = e.target.value; setVendorMisForm({...vendorMisForm, details: newDetails}); }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Handover To</label>
                      <input className="form-control" style={{ fontSize: "0.85rem", padding: "8px" }} placeholder="Handover To" value={detail.handoverTo} onChange={e => { const newDetails = [...vendorMisForm.details]; newDetails[idx].handoverTo = formatAllCaps(e.target.value); setVendorMisForm({...vendorMisForm, details: newDetails}); }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Status</label>
                      <div style={{ fontSize: "0.85rem", padding: "8px", background: "#f3f4f6", color: "#6b7280", borderRadius: "4px", textAlign: "center", border: "1px solid #e5e7eb", height: "37px", display: "flex", alignItems: "center", justifyContent: "center" }}>Pending</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={() => { setShowVendorMisForm(false); setEditingId(null); setEditingStatus(''); setVendorMisForm(initialVendorMisForm); }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ padding: "0 2rem" }}>{editingId ? "Update Vendor MIS Entry" : "Save Vendor MIS Entry"}</button>
            </div>
         </form>
      )}

      <div className="table-responsive">
        <Table 
          loading={false}
          headers={["Vendor Name", "Date Created", "Details", "Total Amount", "Status", "Remarks", "Actions"]}
          data={filteredEntries}
          emptyMessage="No Vendor MIS entries added yet. Click 'Add Vendor MIS Entry' to start."
          renderRow={(item, idx) => (
            <tr key={idx}>
              <td className="font-semibold" style={{ color: "#1e3a8a", whiteSpace: "nowrap" }}>
                {item.vendorName || "-"}
                {isAdminOrSuperAdmin && (
                  <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "normal", marginTop: "4px" }}>
                    By: {item.creatorName || 'Unknown (Old Entry)'}
                  </div>
                )}
              </td>
              <td style={{ whiteSpace: "nowrap" }}>{item.createdAt ? formatDate(item.createdAt) : "-"}</td>
              <td style={{ padding: 0 }}>
                <div style={{ maxHeight: "300px", overflowY: "auto", margin: "10px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <table style={{ width: "100%", fontSize: "0.75rem", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Date</th>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Vehicle</th>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Route</th>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Particular</th>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Mode</th>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Handover</th>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Oth (₹)</th>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Amt (₹)</th>
                        <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.details?.map((p, i) => (
                        <tr key={i} style={{ borderBottom: i < item.details.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: "#64748b" }}>{p.date ? formatDate(p.date) : "-"}</td>
                          <td style={{ padding: "8px 12px", fontWeight: "600", color: "#1e293b", whiteSpace: "nowrap" }}>{p.vehicleNo || "-"}</td>
                          <td style={{ padding: "8px 12px", color: "#334155" }}>{p.from} <span style={{color:"#94a3b8"}}>→</span> {p.to}</td>
                          <td style={{ padding: "8px 12px", color: "#475569" }}>{p.particular || "-"}</td>
                          <td style={{ padding: "8px 12px", color: "#475569" }}>{p.mode || "-"}</td>
                          <td style={{ padding: "8px 12px", color: "#475569" }}>{p.handoverTo || "-"}</td>
                          <td style={{ padding: "8px 12px", color: "#64748b" }}>{p.others || "0"}</td>
                          <td style={{ padding: "8px 12px", fontWeight: "600", color: "#10b981" }}>{parseFloat(p.amount||0).toFixed(2)}</td>
                          <td style={{ padding: "8px 12px" }}>
                            {isAdminOrSuperAdmin ? (
                              <select 
                                style={{ fontSize: "0.7rem", padding: "4px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", outline: "none", color: p.status === "Approved" ? "#065f46" : p.status === "Rejected" ? "#991b1b" : "#92400e" }}
                                value={p.status || "Pending"}
                                onChange={async (e) => {
                                    const updatedStatus = e.target.value;
                                    const updatedDetails = [...item.details];
                                    updatedDetails[i].status = updatedStatus;
                                    try {
                                        const res = await axios.put(`${API}/vendor-mis/${item.id}`, { details: updatedDetails }, { headers: { Authorization: `Bearer ${token}` } });
                                        if (res.data.success) {
                                            const updated = [...vendorMisEntries];
                                            const entryIndex = vendorMisEntries.findIndex(entry => entry.id === item.id);
                                            if(entryIndex > -1) {
                                                updated[entryIndex].details = updatedDetails;
                                                setVendorMisEntries(updated);
                                            }
                                        }
                                    } catch(_err) {
                                        addToast("Failed to update status", "error");
                                    }
                                }}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                              </select>
                            ) : (
                              <span style={{ fontSize: "0.7rem", padding: "3px 6px", borderRadius: "12px", fontWeight: 500, background: p.status === "Approved" ? "#d1fae5" : p.status === "Rejected" ? "#fee2e2" : "#fef3c7", color: p.status === "Approved" ? "#065f46" : p.status === "Rejected" ? "#991b1b" : "#92400e", display: "inline-block", textAlign: "center", minWidth: "60px" }}>
                                {p.status || "Pending"}
                              </span>
                            )}
                          </td>
                        </tr>
                      )) || (<tr><td colSpan="9" style={{padding: "8px", textAlign: "center", color: "#94a3b8"}}>No details added</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </td>
              <td style={{ whiteSpace: "nowrap", fontWeight: "700", color: "#10b981" }}>
                <RupeeIcon size={14} />{parseFloat(item.totalAmount || 0).toFixed(2)}
              </td>
              <td>
                <span style={{
                    padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600",
                    background: String(item.approvalStatus || 'Approved').toLowerCase() === 'approved' ? '#dcfce7' : String(item.approvalStatus).toLowerCase() === 'rejected' ? '#fee2e2' : '#fef9c3',
                    color: String(item.approvalStatus || 'Approved').toLowerCase() === 'approved' ? '#166534' : String(item.approvalStatus).toLowerCase() === 'rejected' ? '#991b1b' : '#854d0e'
                }}>
                  {item.approvalStatus || 'Approved'}
                </span>
              </td>
              {/* Remarks Column */}
              <td style={{ textAlign: "center" }}>
                <button
                  onClick={() => { setActiveRemarksModal(item); setRemarkText(""); }}
                  style={{
                    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                    border: "1px solid #bfdbfe",
                    borderRadius: "8px",
                    padding: "6px 14px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#1e40af",
                    transition: "all 0.2s",
                    position: "relative"
                  }}
                  title="Open Remarks"
                >
                  <MessageSquare size={15} />
                  <span>Remarks</span>
                  {(item.remarks && item.remarks.length > 0) && (
                    <span style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-6px",
                      background: "#2563eb",
                      color: "#fff",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 4px rgba(37, 99, 235, 0.4)"
                    }}>
                      {item.remarks.length}
                    </span>
                  )}
                </button>
              </td>
              <td style={{ textAlign: "right", whiteSpace: "nowrap", minWidth: "max-content" }}>
                <div className="action-buttons-wrapper" style={{ display: "flex", flexWrap: "nowrap", flexDirection: "row", justifyContent: "flex-end", gap: "6px", width: "max-content" }}>
                  {isAdminOrSuperAdmin && (
                    <>
                      {String(item.approvalStatus || 'Approved').toLowerCase() === 'approved' ? (
                        <select
                          value={item.approvalStatus}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            if (newStatus === item.approvalStatus) return;
                            try {
                              const res = await axios.put(`${API}/vendor-mis/${item.id}`, { approvalStatus: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
                              if(res.data.success) {
                                 const newEntries = [...vendorMisEntries];
                                 const entryIndex = newEntries.findIndex(e => e.id === item.id);
                                 if (entryIndex !== -1) newEntries[entryIndex].approvalStatus = newStatus;
                                 setVendorMisEntries(newEntries);
                                 addToast(`Status changed to ${newStatus}`, "success");
                              }
                            } catch(_e) { addToast("Error updating status", "error"); }
                          }}
                          className="action-btn"
                          style={{ padding: "4px 8px", borderRadius: "4px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", cursor: "pointer", fontWeight: 600, outline: "none" }}
                        >
                          <option value="Approved">Approved</option>
                          <option value="Pending">Pending</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      ) : (
                        <>
                          <button onClick={async () => {
                            try {
                              const updatedDetails = (item.details || []).map(d => ({ ...d, status: 'Approved' }));
                              const res = await axios.put(`${API}/vendor-mis/${item.id}`, { approvalStatus: 'Approved', details: updatedDetails }, { headers: { Authorization: `Bearer ${token}` } });
                              if(res.data.success) {
                                 const newEntries = [...vendorMisEntries];
                                 const entryIndex = newEntries.findIndex(e => e.id === item.id);
                                 if (entryIndex !== -1) {
                                     newEntries[entryIndex].approvalStatus = 'Approved';
                                     newEntries[entryIndex].details = updatedDetails;
                                 }
                                 setVendorMisEntries(newEntries);
                                 addToast("Entry Approved!", "success");
                              }
                            } catch(_e) { addToast("Error approving entry", "error"); }
                          }} className="action-btn action-btn-success">
                            <Check size={14} /> Approve
                          </button>
                          
                          {item.approvalStatus !== 'Rejected' && (
                            <button onClick={async () => {
                              try {
                                const res = await axios.put(`${API}/vendor-mis/${item.id}`, { approvalStatus: 'Rejected' }, { headers: { Authorization: `Bearer ${token}` } });
                                if(res.data.success) {
                                   const newEntries = [...vendorMisEntries];
                                   const entryIndex = newEntries.findIndex(e => e.id === item.id);
                                   if (entryIndex !== -1) newEntries[entryIndex].approvalStatus = 'Rejected';
                                   setVendorMisEntries(newEntries);
                                   addToast("Entry Rejected", "success");
                                }
                              } catch(_e) { addToast("Error rejecting entry", "error"); }
                            }} className="action-btn action-btn-danger">
                              <X size={14} /> Reject
                            </button>
                          )}
                        </>
                      )}
                      
                      <button onClick={async () => {
                         const isConfirmed = await confirm({
                            title: "Delete Vendor MIS Entry",
                            message: "Are you sure you want to delete this Vendor MIS entry?",
                            confirmText: "Delete",
                            cancelText: "Cancel"
                         });
                         if(isConfirmed) {
                            try {
                               const res = await axios.delete(`${API}/vendor-mis/${item.id}`, { headers: { Authorization: `Bearer ${token}` } });
                               if(res.data.success) {
                                 setVendorMisEntries(vendorMisEntries.filter((_, i) => i !== idx));
                                 addToast("Entry deleted successfully", "success");
                               }
                            } catch(_err) {
                               addToast("Failed to delete entry", "error");
                            }
                         }
                      }} className="action-btn action-btn-secondary">
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                  {(isAdminOrSuperAdmin || (user?.role === 'Vendor' && item.createdBy === user?.id && item.approvalStatus !== 'Approved')) && (
                    <button onClick={() => {
                      setVendorMisForm(item);
                      setEditingId(item.id);
                      setEditingStatus(item.approvalStatus || 'Pending');
                      setShowVendorMisForm(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} className="action-btn action-btn-primary">
                      <Edit size={14} /> Edit
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      appDB.set("printSingleTripData", item);
                      window.open(`/print-vendor-trip/mis-print`, '_blank');
                    }}
                    className="action-btn action-btn-light"
                    title="Print Single Vendor Trip"
                  >
                    <Printer size={14} /> Print
                  </button>
                </div>
              </td>
            </tr>
          )}
        />
      </div>
      </div>

      {/* Communication & Remarks Modal */}
      {activeRemarksModal && createPortal(
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.7)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            width: "95%",
            maxWidth: "640px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            maxHeight: "88vh",
            border: "1px solid #cbd5e1"
          }}>
            {/* Modal Header with Company Logo & Status Info */}
            <div style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
              color: "#ffffff",
              padding: "1rem 1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              flexShrink: 0
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img
                  src="/mc.png"
                  alt="Multimarg Logo"
                  style={{
                    height: "40px",
                    width: "auto",
                    objectFit: "contain",
                    background: "#ffffff",
                    padding: "4px 8px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                  }}
                />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "800", fontSize: "1rem", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                    <span>Multimarg Carriers</span>
                    <span style={{ fontSize: "0.65rem", background: "rgba(255,255,255,0.15)", padding: "2px 6px", borderRadius: "6px", fontWeight: "700" }}>COMMUNICATIONS</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: "4px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span>Vendor: <strong style={{ color: "#ffffff" }}>{activeRemarksModal.vendorName}</strong></span>
                    <span>•</span>
                    <span>Amount: <strong style={{ color: "#10b981" }}><RupeeIcon size={12} />{parseFloat(activeRemarksModal.totalAmount || 0).toFixed(2)}</strong></span>
                    <span>•</span>
                    <span style={{
                      background: String(activeRemarksModal.approvalStatus || 'Approved').toLowerCase() === 'approved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: String(activeRemarksModal.approvalStatus || 'Approved').toLowerCase() === 'approved' ? '#6ee7b7' : '#fcd34d',
                      padding: "1px 6px",
                      borderRadius: "4px",
                      fontWeight: 700,
                      fontSize: "0.7rem"
                    }}>
                      {activeRemarksModal.approvalStatus || 'Approved'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveRemarksModal(null)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "#ffffff",
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s",
                  flexShrink: 0,
                  marginLeft: "10px"
                }}
                title="Close Modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conversation Messages List */}
            <div style={{
              padding: "1.25rem",
              overflowY: "auto",
              flex: "1 1 auto",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              background: "#f8fafc",
              minHeight: "240px"
            }}>
              {(!activeRemarksModal.remarks || activeRemarksModal.remarks.length === 0) ? (
                <div style={{
                  textAlign: "center",
                  padding: "2.5rem 1rem",
                  color: "#64748b",
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px dashed #cbd5e1"
                }}>
                  <MessageSquare size={36} style={{ color: "#94a3b8", marginBottom: "8px" }} />
                  <p style={{ fontWeight: 600, margin: "0 0 4px", color: "#334155" }}>No communication history yet</p>
                  <p style={{ fontSize: "0.85rem", margin: 0 }}>Start the discussion between Vendor and Admin below.</p>
                </div>
              ) : (
                activeRemarksModal.remarks.map((remark, idx) => {
                  const isVendor = remark.senderRole === 'Vendor';
                  return (
                    <div
                      key={idx}
                      style={{
                        alignSelf: isVendor ? "flex-start" : "flex-end",
                        maxWidth: "85%",
                        background: isVendor ? "#ffffff" : "#eff6ff",
                        border: isVendor ? "1px solid #e2e8f0" : "1px solid #bfdbfe",
                        borderRadius: isVendor ? "14px 14px 14px 4px" : "14px 14px 4px 14px",
                        padding: "12px 16px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "10px",
                            background: isVendor ? "#fef3c7" : "#dbeafe",
                            color: isVendor ? "#92400e" : "#1e40af",
                            textTransform: "uppercase"
                          }}>
                            {isVendor ? "Vendor" : (remark.senderRole === 'SuperAdmin' ? "Super Admin" : "Admin")}
                          </span>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#334155" }}>
                            {remark.senderName || (isVendor ? "Vendor" : "Admin")}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                          {remark.createdAt ? formatDate(remark.createdAt) : ""}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "#1e293b", lineHeight: "1.4", wordBreak: "break-word" }}>
                        {remark.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={remarksEndRef} />
            </div>

            {/* Input Footer or Closed Notice */}
            {(user?.role === 'Vendor' && String(activeRemarksModal.approvalStatus || 'Approved').toLowerCase() === 'approved') ? (
              <div style={{
                padding: "1.25rem 1.5rem",
                background: "#fff1f2",
                borderTop: "1px solid #fecdd3",
                color: "#be123c",
                textAlign: "center",
                fontSize: "0.85rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                flexShrink: 0,
                boxShadow: "0 -2px 10px rgba(0,0,0,0.02)"
              }}>
                <span style={{ fontSize: "1.1rem" }}>🔒</span>
                <span>Remarks are closed for Vendors because this entry has been Approved.</span>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!remarkText || !remarkText.trim() || submittingRemark) return;
                  setSubmittingRemark(true);
                  try {
                    const res = await axios.post(
                      `${API}/vendor-mis/${activeRemarksModal.id}/remarks`,
                      { message: remarkText.trim() },
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (res.data.success && res.data.data) {
                      const newRemark = res.data.data;
                      const updatedRemarks = [...(activeRemarksModal.remarks || []), newRemark];
                      setActiveRemarksModal({
                        ...activeRemarksModal,
                        remarks: updatedRemarks
                      });
                      const updatedEntries = vendorMisEntries.map(entry =>
                        entry.id === activeRemarksModal.id
                          ? { ...entry, remarks: updatedRemarks }
                          : entry
                      );
                      setVendorMisEntries(updatedEntries);
                      setRemarkText("");
                      addToast("Remark sent!", "success");
                    }
                  } catch (err) {
                    addToast(err.response?.data?.message || "Failed to send remark", "error");
                  } finally {
                    setSubmittingRemark(false);
                  }
                }}
                style={{
                  padding: "1rem 1.25rem",
                  background: "#ffffff",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-end",
                  flexShrink: 0,
                  boxShadow: "0 -2px 10px rgba(0,0,0,0.03)"
                }}
              >
                <div style={{ flex: 1 }}>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Write a remark for Admin / Vendor..."
                    value={remarkText}
                    onChange={(e) => setRemarkText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.form.requestSubmit();
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem",
                      resize: "none",
                      outline: "none",
                      fontFamily: "inherit"
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingRemark || !remarkText.trim()}
                  style={{
                    background: submittingRemark || !remarkText.trim() ? "#94a3b8" : "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: submittingRemark || !remarkText.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    height: "42px",
                    transition: "background 0.2s",
                    flexShrink: 0
                  }}
                >
                  <Send size={16} />
                  <span>Send</span>
                </button>
              </form>
            )}
          </div>
        </div>
      , document.body)}

      <div className="print-only">
        {printHeader === "PRIME" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "15px", borderBottom: "2px solid #1e293b", paddingBottom: "10px" }}>
              <img src="/Prime RoadWAYS.png" alt="Prime Roadways" style={{ height: "70px", objectFit: "contain" }} />
              <div style={{ textAlign: "right" }}>
                <h2 style={{ margin: "0 0 4px", color: "#b91c1c", textTransform: "uppercase", letterSpacing: "1px" }}>PRIME ROADWAYS</h2>
                <p style={{ margin: "0 0 2px", fontSize: "9pt", color: "#334155" }}>PLOT NO 292/292A & 292B, OM VIHAR, WEST DELHI, NEW DELHI-110059</p>
                <p style={{ margin: "0 0 2px", fontSize: "9pt", color: "#334155" }}>+91 7503112217 | info@primeroadways.co.in</p>
                <p style={{ margin: 0, fontSize: "9pt", color: "#334155", fontWeight: "600" }}>GSTIN: 07BBCPP8550Q1ZX | PAN NO: BBCPP8550Q</p>
              </div>
            </div>
            <h4 style={{ margin: "0 0 15px", color: "#1e293b", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Vendor MIS Report {startDate && endDate ? `(${formatDate(startDate)} to ${formatDate(endDate)})` : "(Complete Record)"}
            </h4>
          </>
        ) : (
          <div style={{ textAlign: "center", marginBottom: "20px", borderBottom: "2px solid #1e293b", paddingBottom: "10px" }}>
            <h2 style={{ margin: "0 0 5px", color: "#1e3a8a", textTransform: "uppercase" }}>MULTIMARG CARRIERS PVT. LTD.</h2>
            <h4 style={{ margin: 0, color: "#475569" }}>Vendor MIS Report {startDate && endDate ? `(${formatDate(startDate)} to ${formatDate(endDate)})` : "(Complete Record)"}</h4>
          </div>
        )}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt", fontFamily: "sans-serif" }}>
          <thead>
            <tr style={{ backgroundColor: "#1e293b", color: "white", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "left" }}>Vendor Details</th>
              <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "left" }}>Date & Vehicle</th>
              <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "left" }}>Route & Mode</th>
              <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "left" }}>Particulars</th>
              <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "left" }}>Handover</th>
              <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "right" }}>Amount (₹)</th>
              <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "center" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((item, idx) => {
              const details = item.details && item.details.length > 0 ? item.details : [{}];
              const createdDate = item.createdAt ? formatDate(item.createdAt) : "-";
              
              return details.map((d, dIdx) => (
                <tr key={`${idx}-${dIdx}`} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px" }}>
                    {dIdx === 0 && (
                      <>
                        <strong>{item.vendorName || "-"}</strong><br/>
                        <span style={{ fontSize: "8pt", color: "#64748b" }}>Created: {createdDate}</span>
                      </>
                    )}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px" }}>
                    {d.date ? formatDate(d.date) : "-"}<br/>
                    <strong>{d.vehicleNo || "-"}</strong>
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px" }}>
                    {d.from || "-"} &rarr; {d.to || "-"}<br/>
                    <span style={{ fontSize: "8pt", color: "#475569" }}>Mode: {d.mode || "-"}</span>
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px" }}>{d.particular || "-"}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px" }}>{d.handoverTo || "-"}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "right" }}>
                    <strong>{parseFloat(d.amount || 0).toFixed(2)}</strong><br/>
                    {parseFloat(d.others || 0) > 0 && <span style={{ fontSize: "8pt", color: "#64748b" }}>+ Others: {d.others}</span>}
                  </td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "center", fontWeight: "bold", color: d.status === 'Pending' ? '#d97706' : '#16a34a' }}>
                    {d.status || 'Pending'}
                  </td>
                </tr>
              ));
            })}
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>No data available for the selected dates.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VendorMIS;
