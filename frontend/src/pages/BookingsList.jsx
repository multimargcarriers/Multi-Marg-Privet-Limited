import React, { useState, useEffect, useContext, useMemo } from "react";
import axios from "axios";
import { Search, Eye, Printer, Trash2, Edit, ChevronLeft, ChevronRight, PackageOpen, FileCheck, Package, IndianRupee, Box, FileText } from "lucide-react";
import { TablePageSkeleton } from '../components/SkeletonLoader';
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import RupeeIcon from '../components/RupeeIcon';
import { formatDate, getSafeCloudinaryPdfUrl } from '../utils/formatters';
import CsvImportExport from "../components/CsvImportExport";
import StatsPanel from "../components/StatsPanel";
import PodEntryModal from "../components/pod/PodEntryModal";
import BoxEntryModal from "../components/box/BoxEntryModal";
import { AnimatePresence } from "framer-motion";
import { useSocketSync } from '../hooks/useSocketSync';
import { BadgeContext } from "../context/BadgeContext";
import { SettingsContext } from "../context/SettingsContext";
import SortDropdown from "../components/SortDropdown";
import useTableSort from "../hooks/useTableSort";

const BookingsList = () => {
  const { user, hasPermission } = useContext(AuthContext);
  const { globalSettings } = useContext(SettingsContext);
  const { clearBadge } = useContext(BadgeContext);
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
  const [trackingMap, setTrackingMap] = useState({});

  // Box modal state & lookup map
  const [boxModalOpen, setBoxModalOpen] = useState(false);
  const [selectedBookingForBox, setSelectedBookingForBox] = useState(null);
  const [boxMap, setBoxMap] = useState({});

  // Local Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(50);

  const navigate = useNavigate();

  useEffect(() => { 
    fetchAllData(); 
    clearBadge("bookings");
  }, []);

  const fetchAllData = async () => {
    if (bookings.length === 0) setLoading(true);
    try {
      const [bookingsRes, podRes, boxRes, trackingRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bookings`),
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/pod`).catch(() => ({ data: { data: [] } })),
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/box`).catch(() => ({ data: { data: [] } })),
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/tracking`).catch(() => ({ data: { data: [] } }))
      ]);
      
      if (bookingsRes.data.success) setBookings(bookingsRes.data.data || []);
      
      // Build POD map
      if (podRes.data.success && Array.isArray(podRes.data.data)) {
        const map = {};
        podRes.data.data.forEach(item => {
          if (item.lrNo) map[String(item.lrNo).trim()] = item;
          if (item.bookingId) map[item.bookingId] = item;
        });
        setPodMap(map);
      }
      
      // Build Box map
      if (boxRes.data.success && Array.isArray(boxRes.data.data)) {
        const map = {};
        boxRes.data.data.forEach(item => {
          if (item.lrNo) map[String(item.lrNo).trim()] = item;
          if (item.bookingId) map[item.bookingId] = item;
        });
        setBoxMap(map);
      }
      
      // Build Tracking map
      if (trackingRes.data.success && Array.isArray(trackingRes.data.data)) {
        const map = {};
        const sorted = trackingRes.data.data.sort((a,b) => new Date(a.date) - new Date(b.date));
        sorted.forEach(t => {
          if (t.awb) map[String(t.awb).trim().toLowerCase()] = t.status;
        });
        setTrackingMap(map);
      }
    } catch (err) {
      console.error("Fetch data error", err);
    } finally {
      setLoading(false);
    }
  };

  useSocketSync("bookings", fetchAllData);

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
      fetchAllData();
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
      fetchAllData();
    } catch (err) { console.error("Clear all bookings error", err); }
  };

  const filtered = useMemo(() => {
    return bookings.filter(b =>
      !search || (b.client || b.consignor || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.awb || b.lrNo || b.consignment || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.origin || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.destination || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [bookings, search]);

  const { sortedData, sortOption, setSortOption } = useTableSort(filtered, "newest", { nameKey: "client", amountKey: "frieght" });

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / entriesPerPage);
  const indexOfLast = currentPage * entriesPerPage;
  const indexOfFirst = indexOfLast - entriesPerPage;
  const currentEntries = sortedData.slice(indexOfFirst, indexOfLast);

  // Ensure current page is valid when filtering changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [sortedData.length, totalPages, currentPage]);

  return (
    <div className="bookings-page-wrapper">
      <div className="header-flex booking-header-flex">
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem", color: '#1e293b' }}>ALL Bookings (LR)</h3>
          <p className="text-muted">View bookings alongside their nested LR details in a grouped format.</p>
        </div>
        <div className="page-header-actions">
            <div className="booking-csv-manager-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booking & LR CSV Manager</span>
                <CsvImportExport moduleName="bookings" onImportSuccess={fetchAllData} searchQuery={search} />
              </div>
            </div>
            {(isSuperAdmin && globalSettings?.integrations?.enableBulkDelete) && (
              <button className="page-header-btn" style={{ color: "#dc2626", borderColor: "#fecaca" }} onClick={handleClearAll} title="Clear All Bookings">
                <Trash2 size={14} /> Clear
              </button>
            )}
            {(hasPermission("create_booking") || isSuperAdmin) && (
              <button className="page-header-btn page-header-btn-primary" onClick={() => navigate("/bookings/create")}>
                + New Booking
              </button>
            )}
        </div>
      </div>

      <StatsPanel stats={[
        { label: "Total Bookings", value: filtered.length, color: "blue", icon: Package },
        { label: "Total Freight Value", value: "₹" + filtered.reduce((sum, b) => sum + parseFloat(b.freight_charge || b.freight || b.frieght || b.weight || 0), 0).toFixed(2), color: "green", icon: IndianRupee },
        { label: "With LR Details", value: filtered.filter(b => (b.invoiceDetails && b.invoiceDetails.length > 0) || (b.parcels && b.parcels.length > 0)).length, color: "purple", icon: FileCheck },
        { label: "Total Quantity (Pkgs)", value: filtered.reduce((sum, b) => {
            const parcels = (b.invoiceDetails && b.invoiceDetails.length > 0) ? b.invoiceDetails : (b.parcels || []);
            return sum + parcels.reduce((pSum, p) => pSum + (parseInt(p.quantity, 10) || 0), 0);
          }, 0), color: "orange", icon: Box },
        { label: "E-way Bills Attached", value: filtered.reduce((sum, b) => {
            const parcels = (b.invoiceDetails && b.invoiceDetails.length > 0) ? b.invoiceDetails : (b.parcels || []);
            return sum + parcels.filter(p => p.eway || p.ewayBill).length;
          }, 0), color: "red", icon: FileText }
      ]} />
      <div className="premium-filter-toolbar">
        <div className="premium-filter-grid">
          
          <div className="premium-search-wrapper">
            <div className="premium-search-icon">
              <Search size={18} />
            </div>
            <input 
              className="premium-search-input"
              placeholder="Search by client, LR no, origin, destination..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>

          <SortDropdown 
            value={sortOption} 
            onChange={setSortOption} 
            options={["newest", "oldest", "amount_desc", "amount_asc", "az", "za"]} 
          />

          <div className="premium-filter-group">
            <span className="premium-filter-label">Show</span>
            <select 
              value={entriesPerPage} 
              onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="premium-filter-input"
              style={{ cursor: "pointer", width: "50px" }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span className="premium-filter-label" style={{ marginLeft: 0 }}>entries</span>
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
                    {isSuperAdmin && (
                      <span style={{ background: "#e2e8f0", padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem", color: "#334155", fontWeight: "600", marginTop: "4px", display: "inline-block" }}>
                        Entered By: {item.clerk_name || "Admin"}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── LR Details Table (scrollable) ── */}
                {hasParcels ? (
                  <div className="booking-table-scroll" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table className="booking-lr-table" style={{ width: '100%', whiteSpace: 'nowrap' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>INV DATE</th>
                          <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>INVOICE</th>
                          <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>PART</th>
                          <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>EWAY</th>
                          <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>QTY</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>VALUE (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayParcels.map((parcel, pIdx) => (
                          <tr key={pIdx}>
                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{(parcel.invdate || parcel.invoiceDate) ? formatDate(parcel.invdate || parcel.invoiceDate) : '-'}</td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>{parcel.invoice || parcel.invoiceNo || '-'}</td>
                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{parcel.part || parcel.partNumber || '-'}</td>
                            <td style={{ padding: '0.75rem 1rem', color: '#0ea5e9', whiteSpace: 'nowrap' }}>{parcel.eway || parcel.ewayBill || '-'}</td>
                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{parcel.quantity || '-'}</td>
                            <td style={{ padding: '0.75rem 1rem', color: '#10b981', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>
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
                    {(() => {
                      const awbLower = String(awb).trim().toLowerCase();
                      const isDelivered = trackingMap[awbLower] === 'Delivered';
                      const canModify = isSuperAdmin || !isDelivered;
                      
                      return (
                        <>
                          {canModify && (
                            <button onClick={() => navigate(`/bookings/edit/${item.id}`)} className="booking-action-btn" title="Edit" style={{ color: '#3b82f6' }}><Edit size={15} /></button>
                          )}
                          <button onClick={() => navigate(`/bills?lr=${item.awb || item.lrNo || item.id}`)} className="booking-action-btn" title="View Bills" style={{ color: '#8b5cf6' }}><Eye size={15} /></button>
                          <button onClick={() => window.open(`/print-lr/${item.id}`, "_blank")} className="booking-action-btn" title="Print" style={{ color: '#64748b' }}><Printer size={15} /></button>
                          {canModify && (
                            <button onClick={() => handleDelete(item.id)} className="booking-action-btn" title="Delete" style={{ color: '#ef4444' }}><Trash2 size={15} /></button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  {canAccessPod && (
                    <div className="booking-actions-right">
                      <button 
                        onClick={() => {
                          if (hasBox) {
                            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
                            let fileUrl = hasBox.boxUrl || hasBox.cloudinaryUrl || `${apiUrl}/uploads/box/${hasBox.fileName || hasBox.filename}`;
                            fileUrl = getSafeCloudinaryPdfUrl(fileUrl);
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
                            let fileUrl = hasPodEntry.podUrl || hasPodEntry.cloudinaryUrl || `${apiUrl}/uploads/pod/${hasPodEntry.fileName || hasPodEntry.filename}`;
                            fileUrl = getSafeCloudinaryPdfUrl(fileUrl);
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
              fetchAllData();
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
              fetchAllData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingsList;