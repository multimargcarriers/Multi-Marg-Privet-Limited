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
import { SettingsContext } from "../context/SettingsContext";

const BookingsList = () => {
  const { user } = useContext(AuthContext);
  const { globalSettings } = useContext(SettingsContext);
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
    const filteredList = bookings.filter(b =>
      !search || (b.client || b.consignor || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.awb || b.lrNo || b.consignment || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.origin || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.destination || "").toLowerCase().includes(search.toLowerCase())
    );

    filteredList.sort((a, b) => {
      const awbA = a.awb || a.consignment || a.lrNo || "";
      const awbB = b.awb || b.consignment || b.lrNo || "";
      const numA = parseInt(String(awbA).replace(/\D/g, '')) || 0;
      const numB = parseInt(String(awbB).replace(/\D/g, '')) || 0;
      return numB - numA;
    });

    return filteredList;
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
    <div className="bookings-page-wrapper">
      <div className="header-flex booking-header-flex">
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem", color: '#1e293b' }}>ALL Bookings (LR)</h3>
          <p className="text-muted">View bookings alongside their nested LR details in a grouped format.</p>
        </div>
        <div className="top-actions-container">
            <div className="booking-csv-manager-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booking & LR CSV Manager</span>
                <CsvImportExport moduleName="bookings" onImportSuccess={fetchBookings} searchQuery={search} />
              </div>
            </div>
          <div className="booking-action-buttons-row">
            {(isSuperAdmin && globalSettings?.integrations?.enableBulkDelete) && (
              <button 
                className="btn btn-clear-all"
                onClick={handleClearAll}
                title="Clear All Bookings"
              >
                <Trash2 size={14} style={{ display: 'inline', marginRight: '4px', marginBottom: '-2px' }} /> Clear
              </button>
            )}
            <button className="btn btn-primary btn-new-booking" onClick={() => navigate("/bookings/create")}>
              + New Booking
            </button>
          </div>
        </div>
      </div>

      <div className="booking-search-card">
        <div className="booking-search-row">
          <div className="booking-search-field">
            <div className="booking-search-icon">
              <Search size={18} />
            </div>
            <input 
              className="booking-search-input"
              placeholder="Search by client, LR no, origin, destination..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          <div className="booking-entries-select-group">
            <span>Show</span>
            <select 
              value={entriesPerPage} 
              onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="booking-entries-select"
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
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#64748b", background: "#fff", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
          <PackageOpen size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#334155' }}>No bookings found</h4>
          <p style={{ marginTop: '0.5rem' }}>Try adjusting your search filters or import new data.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {currentEntries.map((item, index) => {
            const displayParcels = item.invoiceDetails && item.invoiceDetails.length > 0 
              ? item.invoiceDetails.filter(inv => inv.invoiceNo || inv.partNumber || inv.ewayBill || inv.invoiceValue) 
              : (item.parcels || []);
            const hasParcels = displayParcels.length > 0;
            const awb = item.awb || item.consignment || item.lrNo || item.id?.slice(-6);
            const hasBox = boxMap[item.awb || item.lrNo || item.id];
            const hasPodEntry = podMap[item.awb || item.lrNo || item.id];
            return (
              <div key={item.id || index} className="booking-card">
                
                {/* ── Card Header ── */}
                <div className="booking-card-header">
                  <div className="booking-card-header-left">
                    <h4 className="booking-client-name">
                      {item.client || item.consignor || "UNKNOWN CLIENT"}
                    </h4>
                    <div className="booking-meta-row">
                      <span className="booking-meta-badge booking-meta-awb">AWB: {awb}</span>
                      <span className="booking-meta-badge">{item.createdAt ? formatDate(item.createdAt) : item.date ? formatDate(item.date) : "-"}</span>
                      <span className="booking-meta-badge">{(item.origin || "-")} → {(item.destination || "-")}</span>
                      {item.mode && <span className="booking-meta-badge booking-meta-mode">{item.mode}</span>}
                    </div>
                  </div>
                  <div className="booking-card-header-right">
                    <div className="booking-freight">
                      <RupeeIcon size={12} /> {parseFloat(item.freight_charge || item.freight || item.frieght || item.weight || 0).toFixed(2)}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>By: {item.clerk_name || "Admin"}</span>
                  </div>
                </div>

                {/* ── LR Details Table (scrollable) ── */}
                {hasParcels ? (
                  <div className="booking-table-scroll">
                    <table className="booking-lr-table">
                      <thead>
                        <tr>
                          <th>INV DATE</th>
                          <th>INVOICE</th>
                          <th>PART</th>
                          <th>EWAY</th>
                          <th>QTY</th>
                          <th style={{ textAlign: 'right' }}>VALUE (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayParcels.map((parcel, pIdx) => (
                          <tr key={pIdx}>
                            <td>{(parcel.invdate || parcel.invoiceDate) ? formatDate(parcel.invdate || parcel.invoiceDate) : '-'}</td>
                            <td style={{ fontWeight: 600, color: '#334155' }}>{parcel.invoice || parcel.invoiceNo || '-'}</td>
                            <td>{parcel.part || parcel.partNumber || '-'}</td>
                            <td style={{ color: '#0ea5e9' }}>{parcel.eway || parcel.ewayBill || '-'}</td>
                            <td>{parcel.quantity || '-'}</td>
                            <td style={{ color: '#10b981', fontWeight: 600, textAlign: 'right' }}>
                              {(parcel.value || parcel.invoiceValue) ? parseFloat(parcel.value || parcel.invoiceValue).toFixed(2) : '0.00'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="booking-empty-lr">
                    <PackageOpen size={28} style={{ opacity: 0.35, marginBottom: '0.25rem' }} />
                    <span>No LR details attached</span>
                  </div>
                )}

                {/* ── Card Footer: Actions ── */}
                <div className="booking-card-footer">
                  <div className="booking-actions-left">
                    <button onClick={() => navigate(`/bookings/edit/${item.id}`)} className="booking-action-btn" title="Edit" style={{ color: '#3b82f6' }}><Edit size={15} /></button>
                    <button onClick={() => navigate(`/bills?lr=${item.awb || item.lrNo || item.id}`)} className="booking-action-btn" title="View Bills" style={{ color: '#8b5cf6' }}><Eye size={15} /></button>
                    <button onClick={() => window.open(`/print-lr/${item.id}`, "_blank")} className="booking-action-btn" title="Print" style={{ color: '#64748b' }}><Printer size={15} /></button>
                    {isSuperAdmin && (
                      <button onClick={() => handleDelete(item.id)} className="booking-action-btn" title="Delete" style={{ color: '#ef4444' }}><Trash2 size={15} /></button>
                    )}
                  </div>
                  {canAccessPod && (
                    <div className="booking-actions-right">
                      <button 
                        onClick={() => {
                          if (hasBox) {
                            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
                            let fileUrl = hasBox.boxUrl || hasBox.cloudinaryUrl || `${apiUrl}/api/uploads/box/${hasBox.fileName || hasBox.filename}`;
                            navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}&title=Box%20Document%20Viewer`);
                          } else {
                            setSelectedBookingForBox(item);
                            setBoxModalOpen(true);
                          }
                        }} 
                        className="booking-pod-btn"
                        style={{ background: hasBox ? '#fef3c7' : '#fefce8', border: `1px solid ${hasBox ? '#fde68a' : '#fef08a'}`, color: hasBox ? '#d97706' : '#ca8a04' }}
                        title={hasBox ? "View Box" : "Upload Box"}
                      >
                        {hasBox ? <Eye size={13} /> : <PackageOpen size={13} />}
                        {hasBox ? "BOX" : "+ BOX"}
                      </button>
                      <button 
                        onClick={() => {
                          if (hasPodEntry) {
                            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
                            let fileUrl = hasPodEntry.podUrl || hasPodEntry.cloudinaryUrl || `${apiUrl}/api/uploads/pod/${hasPodEntry.fileName || hasPodEntry.filename}`;
                            navigate(`/pod/view?url=${encodeURIComponent(fileUrl)}`);
                          } else {
                            setSelectedBookingForPod(item);
                            setPodModalOpen(true);
                          }
                        }} 
                        className="booking-pod-btn"
                        style={{ background: hasPodEntry ? '#ecfdf5' : '#e0f2fe', border: `1px solid ${hasPodEntry ? '#a7f3d0' : '#bae6fd'}`, color: hasPodEntry ? '#10b981' : '#0284c7' }}
                        title={hasPodEntry ? "View POD" : "Upload POD"}
                      >
                        {hasPodEntry ? <Eye size={13} /> : <FileCheck size={13} />}
                        {hasPodEntry ? "POD" : "+ POD"}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && filtered.length > 0 && (
        <div className="booking-pagination-container">
          <div className="booking-pagination-info">
            Showing <span>{indexOfFirst + 1}</span> to <span>{Math.min(indexOfLast, filtered.length)}</span> of <span>{filtered.length}</span> entries
          </div>
          <div className="booking-pagination-controls">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
              disabled={currentPage === 1}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f8fafc' : '#fff', color: currentPage === 1 ? '#cbd5e1' : '#334155', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={16} />
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
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