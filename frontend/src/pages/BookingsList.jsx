import React, { useState, useEffect, useContext, useMemo } from "react";
import axios from "axios";
import { Search, Eye, Printer, Trash2, Edit, ChevronLeft, ChevronRight, PackageOpen, FileCheck } from "lucide-react";
import { TablePageSkeleton } from '../components/SkeletonLoader';
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import RupeeIcon from '../components/RupeeIcon';
import { formatDate } from '../utils/formatters';
import CsvImportExport from "../components/CsvImportExport";
import PodEntryModal from "../components/pod/PodEntryModal";
import BoxEntryModal from "../components/box/BoxEntryModal";
import { AnimatePresence } from "framer-motion";
import { useSocketSync } from '../hooks/useSocketSync';

const BookingsList = () => {
  const { user } = useContext(AuthContext);
  const { confirm } = useDialog();
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';
  const canAccessPod = isSuperAdmin || user?.role === 'Admin' || user?.permissions?.includes('pod') || true;

  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  // POD modal state & lookup map
  const [podModalOpen, setPodModalOpen] = useState(false);
  const [selectedBookingForPod, setSelectedBookingForPod] = useState(null);
  const [podMap, setPodMap] = useState({});

  // Box modal state & lookup map
  const [boxModalOpen, setBoxModalOpen] = useState(false);
  const [selectedBookingForBox, setSelectedBookingForBox] = useState(null);
  const [boxMap, setBoxMap] = useState({});

  // Local Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(50);

  const navigate = useNavigate();

  useEffect(() => { 
    fetchBookings(); 
    fetchPodEntries(); 
    fetchBoxEntries();
  }, []);

  const fetchBoxEntries = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/box`);
      if (res.data.success && Array.isArray(res.data.data)) {
        const map = {};
        res.data.data.forEach(item => {
          if (item.lrNo) map[String(item.lrNo).trim()] = item;
          if (item.bookingId) map[item.bookingId] = item;
        });
        setBoxMap(map);
      }
    } catch (err) {
      console.error("Fetch Boxes error in BookingsList:", err);
    }
  };

  const fetchPodEntries = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/pod`);
      if (res.data.success && Array.isArray(res.data.data)) {
        const map = {};
        res.data.data.forEach(item => {
          if (item.lrNo) map[String(item.lrNo).trim()] = item;
          if (item.bookingId) map[item.bookingId] = item;
        });
        setPodMap(map);
      }
    } catch (err) {
      console.error("Fetch PODs error in BookingsList:", err);
    }
  };

  const fetchBookings = async () => {
    try {
      // Avoid flickering if already loading
      if (bookings.length === 0) setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bookings`);
      if (res.data.success) {
        setBookings(res.data.data || []);
      }
    } catch (err) { 
      console.error("Fetch bookings error", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useSocketSync("bookings", fetchBookings);

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

  const handleClearAll = async () => {
    const isConfirmed = await confirm({
      title: "Clear ALL Bookings",
      message: "WARNING: This will permanently delete ALL bookings and their associated LR details from the database. Are you absolutely sure you want to proceed?",
      confirmText: "Yes, Delete Everything",
      cancelText: "Cancel",
      requireInput: "confirm"
    });
    if (!isConfirmed) return;
    
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bookings/clear/all`);
      fetchBookings();
    } catch (err) { console.error("Clear all bookings error", err); }
  };

  const filtered = useMemo(() => {
    return bookings.filter(b =>
      !search || (b.client || b.consignor || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.awb || b.lrNo || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.origin || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.destination || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [bookings, search]);

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / entriesPerPage);
  const indexOfLast = currentPage * entriesPerPage;
  const indexOfFirst = indexOfLast - entriesPerPage;
  const currentEntries = filtered.slice(indexOfFirst, indexOfLast);

  // Ensure current page is valid when filtering changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filtered.length, totalPages, currentPage]);

  return (
    <div style={{ width: "100%", margin: '0 auto', paddingBottom: '2rem' }}>
      <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem", color: '#1e293b' }}>Grouped Bookings (LR)</h3>
          <p className="text-muted">View bookings alongside their nested LR details in a grouped format.</p>
        </div>
        <div className="top-actions-container">
          <div style={{ display: 'flex', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 1rem', gap: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 1: Bookings</span>
              <CsvImportExport moduleName="bookings" onImportSuccess={fetchBookings} />
            </div>
            <div style={{ width: '1px', backgroundColor: 'var(--border-color)' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 2: LR Details</span>
              <CsvImportExport moduleName="lr_details" onImportSuccess={fetchBookings} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', flex: '1 1 auto', width: '100%' }}>
            {isSuperAdmin && (
              <button 
                className="btn"
                style={{ flex: '3', padding: "0 0.5rem", height: "45px", whiteSpace: "nowrap", background: "#fef2f2", color: "#dc2626", border: "1px solid #f87171", borderRadius: '8px', fontSize: '0.85rem' }} 
                onClick={handleClearAll}
                title="Clear All Bookings"
              >
                <Trash2 size={14} style={{ display: 'inline', marginRight: '4px', marginBottom: '-2px' }} /> Clear
              </button>
            )}
            <button className="btn btn-primary" style={{ flex: isSuperAdmin ? '7' : '1', padding: "0 1.5rem", height: "45px", whiteSpace: "nowrap", borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(14, 165, 233, 0.3)' }} onClick={() => navigate("/bookings/create")}>
              + New Booking
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              <Search size={18} />
            </div>
            <input 
              style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' }}
              placeholder="Search by client, LR no, origin, destination..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.9rem' }}>
            <span>Show</span>
            <select 
              value={entriesPerPage} 
              onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
              style={{ padding: '0.4rem 2rem 0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
            </select>
            <span>entries</span>
          </div>
        </div>
      </div>

      {loading ? (
        <TablePageSkeleton />
      ) : currentEntries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#64748b", background: "#fff", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
          <PackageOpen size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#334155' }}>No bookings found</h4>
          <p style={{ marginTop: '0.5rem' }}>Try adjusting your search filters or import new data.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {currentEntries.map((item, index) => {
            const hasParcels = item.parcels && item.parcels.length > 0;
            return (
              <div key={item.id || index} style={{ display: 'flex', flexWrap: 'wrap', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
                
                {/* Left Side: Booking Header Info */}
                <div style={{ width: '100%', maxWidth: '280px', padding: '1.5rem', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#f8fafc', position: 'relative' }}>
                  <h4 style={{ color: '#1e3a8a', fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.4rem 0', textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.3 }}>
                    {item.client || item.consignor || "UNKNOWN CLIENT"}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '1rem' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', textTransform: 'capitalize' }}>
                      By: {item.clerk_name || "Admin"}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                      {item.createdAt ? formatDate(item.createdAt) : item.date ? formatDate(item.date) : "-"}
                    </p>
                  </div>
                  
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                     <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Booking AWB</div>
                     <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>
                       {item.awb || item.lrNo || item.id?.slice(-6)}
                     </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1', flexWrap: 'wrap' }}>
                    <button onClick={() => navigate(`/bookings/edit/${item.id}`)} style={{ background: "transparent", border: "none", color: "#3b82f6", cursor: "pointer", padding: '4px', borderRadius: '4px' }} title="Edit"><Edit size={16} /></button>
                    <button onClick={() => navigate(`/bills?lr=${item.awb || item.lrNo || item.id}`)} style={{ background: "transparent", border: "none", color: "#8b5cf6", cursor: "pointer", padding: '4px', borderRadius: '4px' }} title="View Bills"><Eye size={16} /></button>
                    <button onClick={() => window.open(`/print-lr/${item.id}`, "_blank")} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: '4px', borderRadius: '4px' }} title="Print"><Printer size={16} /></button>
                    {isSuperAdmin && (
                      <button onClick={() => handleDelete(item.id)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: '4px', borderRadius: '4px' }} title="Delete"><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>

                {/* Right Side: LR Details / Parcels Nested Table */}
                <div style={{ flex: 1, minWidth: '300px', overflowX: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {hasParcels ? (
                    <div style={{ padding: '0.5rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '1rem 0.75rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>INV DATE</th>
                            <th style={{ padding: '1rem 0.75rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>INVOICE</th>
                            <th style={{ padding: '1rem 0.75rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>PART</th>
                            <th style={{ padding: '1rem 0.75rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>EWAY</th>
                            <th style={{ padding: '1rem 0.75rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>QTY</th>
                            <th style={{ padding: '1rem 0.75rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>VALUE (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.parcels.map((parcel, pIdx) => (
                            <tr key={pIdx} style={{ transition: 'background-color 0.15s', ':hover': { backgroundColor: '#f8fafc' }, textTransform: 'uppercase' }}>
                              <td style={{ padding: '0.85rem 0.75rem', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{parcel.invdate || '-'}</td>
                              <td style={{ padding: '0.85rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: '#334155' }}>{parcel.invoice || '-'}</td>
                              <td style={{ padding: '0.85rem 0.75rem', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{parcel.part || '-'}</td>
                              <td style={{ padding: '0.85rem 0.75rem', borderBottom: '1px solid #f1f5f9', color: '#0ea5e9' }}>{parcel.eway || '-'}</td>
                              <td style={{ padding: '0.85rem 0.75rem', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{parcel.quantity || '-'}</td>
                              <td style={{ padding: '0.85rem 0.75rem', borderBottom: '1px solid #f1f5f9', color: '#10b981', fontWeight: 600, textAlign: 'right' }}>
                                {parcel.value ? parseFloat(parcel.value).toFixed(2) : '0.00'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '3rem 1rem' }}>
                      <PackageOpen size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                      <span style={{ fontSize: '0.9rem' }}>No nested LR Details attached to this booking.</span>
                      <span style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.8 }}>Use the Step 2 CSV Importer to link parcels via AWB.</span>
                    </div>
                  )}
                  
                  {/* Trip Summary footer inside right block */}
                  <div style={{ marginTop: 'auto', padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '2rem', fontSize: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                       <span style={{ color: '#64748b', fontWeight: 600 }}>ROUTE:</span>
                       <span style={{ color: '#334155', textTransform: 'uppercase' }}>{item.origin || "-"} &rarr; {item.destination || "-"}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                       <span style={{ color: '#64748b', fontWeight: 600 }}>MODE:</span>
                       <span style={{ color: '#334155', textTransform: 'uppercase' }}>{item.mode || "-"}</span>
                    </div>

                    {canAccessPod && (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button 
                          onClick={() => {
                            const existingBox = boxMap[item.awb || item.lrNo || item.id];
                            if (existingBox) {
                              const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
                              let fileUrl = existingBox.boxUrl || existingBox.cloudinaryUrl || `${apiUrl}/api/uploads/box/${existingBox.fileName || existingBox.filename}`;
                              navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}&title=Box%20Document%20Viewer`);
                            } else {
                              setSelectedBookingForBox(item);
                              setBoxModalOpen(true);
                            }
                          }} 
                          style={{ 
                            background: boxMap[item.awb || item.lrNo || item.id] ? "#fef3c7" : "#fefce8", 
                            border: boxMap[item.awb || item.lrNo || item.id] ? "1px solid #fde68a" : "1px solid #fef08a", 
                            color: boxMap[item.awb || item.lrNo || item.id] ? "#d97706" : "#ca8a04", 
                            cursor: "pointer", 
                            padding: "4px 8px", 
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontWeight: 700,
                            fontSize: "0.75rem"
                          }} 
                          title={boxMap[item.awb || item.lrNo || item.id] ? "Box Upload Verified — Click to View" : "Upload Box / Damage Photo"}
                        >
                          {boxMap[item.awb || item.lrNo || item.id] ? <Eye size={14} /> : <PackageOpen size={14} />}
                          {boxMap[item.awb || item.lrNo || item.id] ? "VIEW BOX" : "+ BOX"}
                        </button>

                        <button 
                          onClick={() => {
                            const existingPod = podMap[item.awb || item.lrNo || item.id];
                            if (existingPod) {
                              const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
                              let fileUrl = existingPod.podUrl || existingPod.cloudinaryUrl || `${apiUrl}/api/uploads/pod/${existingPod.fileName || existingPod.filename}`;
                              navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}`);
                            } else {
                              setSelectedBookingForPod(item);
                              setPodModalOpen(true);
                            }
                          }} 
                          style={{ 
                            background: podMap[item.awb || item.lrNo || item.id] ? "#ecfdf5" : "#e0f2fe", 
                            border: podMap[item.awb || item.lrNo || item.id] ? "1px solid #a7f3d0" : "1px solid #bae6fd", 
                            color: podMap[item.awb || item.lrNo || item.id] ? "#10b981" : "#0284c7", 
                            cursor: "pointer", 
                            padding: "4px 8px", 
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontWeight: 700,
                            fontSize: "0.75rem"
                          }} 
                          title={podMap[item.awb || item.lrNo || item.id] ? "POD Verified — Click to View" : "Upload Proof of Delivery (POD)"}
                        >
                          {podMap[item.awb || item.lrNo || item.id] ? <Eye size={14} /> : <FileCheck size={14} />}
                          {podMap[item.awb || item.lrNo || item.id] ? "VIEW POD" : "+ POD"}
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                       <span style={{ color: '#64748b', fontWeight: 600 }}>FREIGHT:</span>
                       <span style={{ color: '#10b981', fontWeight: 700 }}><RupeeIcon size={11} /> {parseFloat(item.freight_charge || item.freight || item.frieght || item.weight || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1rem', background: '#fff', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
            Showing <span style={{ fontWeight: 600, color: '#334155' }}>{indexOfFirst + 1}</span> to <span style={{ fontWeight: 600, color: '#334155' }}>{Math.min(indexOfLast, filtered.length)}</span> of <span style={{ fontWeight: 600, color: '#334155' }}>{filtered.length}</span> entries
          </div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
              disabled={currentPage === 1}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f8fafc' : '#fff', color: currentPage === 1 ? '#cbd5e1' : '#334155', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={16} />
            </button>
            
            {/* Simple page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              // Logic to show pages around current page
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
              
              return (
                <button 
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', border: pageNum === currentPage ? 'none' : '1px solid #cbd5e1', background: pageNum === currentPage ? 'var(--primary-color)' : '#fff', color: pageNum === currentPage ? '#fff' : '#334155', fontWeight: pageNum === currentPage ? 600 : 400, cursor: 'pointer' }}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
              disabled={currentPage === totalPages || totalPages === 0}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', background: (currentPage === totalPages || totalPages === 0) ? '#f8fafc' : '#fff', color: (currentPage === totalPages || totalPages === 0) ? '#cbd5e1' : '#334155', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* POD UPLOAD MODAL STUDIO */}
      <AnimatePresence>
        {podModalOpen && (
          <PodEntryModal
            isOpen={podModalOpen}
            onClose={() => {
              setPodModalOpen(false);
              setSelectedBookingForPod(null);
            }}
            booking={selectedBookingForPod}
            existingPod={selectedBookingForPod ? podMap[selectedBookingForPod.awb || selectedBookingForPod.lrNo || selectedBookingForPod.id] : null}
            onSuccess={() => {
              fetchBookings();
              fetchPodEntries();
            }}
          />
        )}
        {boxModalOpen && (
          <BoxEntryModal
            isOpen={boxModalOpen}
            onClose={() => {
              setBoxModalOpen(false);
              setSelectedBookingForBox(null);
            }}
            booking={selectedBookingForBox}
            existingBox={selectedBookingForBox ? boxMap[selectedBookingForBox.awb || selectedBookingForBox.lrNo || selectedBookingForBox.id] : null}
            onSuccess={() => {
              fetchBookings();
              fetchBoxEntries();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingsList;