import React from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, X, MapPin, Package, ArrowRight, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { formatDate } from "../utils/formatters";

const BulkTrackingConfirmModal = ({
  isOpen,
  onClose,
  selectedBookings = [],
  onRemoveBooking,
  onConfirm
}) => {
  if (!isOpen || typeof document === "undefined") return null;

  const totalPkgs = selectedBookings.reduce((sum, b) => {
    const val = Number(b.pkgs || b.packages || b.totalPkgs || b.qty || 1);
    return sum + (isNaN(val) ? 1 : val);
  }, 0);

  const totalWeight = selectedBookings.reduce((sum, b) => {
    const val = Number(b.totalWeight || b.chargedWeight || b.actualWeight || b.weight || 0);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className="bulk-confirm-modal-overlay" onClick={onClose}>
        <motion.div
          className="bulk-confirm-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 26, stiffness: 380 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bulk-confirm-header">
            <div className="bulk-confirm-header-left">
              <div className="bulk-confirm-icon-badge">
                <Truck size={22} color="#ffffff" />
              </div>
              <div>
                <h3 className="bulk-confirm-title">Confirm Bulk Tracking Update</h3>
                <p className="bulk-confirm-subtitle">
                  Are you sure you want to update tracking for <strong>{selectedBookings.length}</strong> selected {selectedBookings.length === 1 ? 'consignment' : 'consignments'}?
                </p>
              </div>
            </div>
            <button className="bulk-confirm-close-btn" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>

          {/* Quick Metrics Banner */}
          <div className="bulk-confirm-metrics">
            <div className="bulk-confirm-metric-pill">
              <span className="metric-label">Selected:</span>
              <span className="metric-val">{selectedBookings.length} AWBs</span>
            </div>
            <div className="bulk-confirm-metric-pill">
              <span className="metric-label">Total Pkgs:</span>
              <span className="metric-val">{totalPkgs}</span>
            </div>
            {totalWeight > 0 && (
              <div className="bulk-confirm-metric-pill">
                <span className="metric-label">Total Wt:</span>
                <span className="metric-val">{totalWeight.toFixed(2)} KG</span>
              </div>
            )}
          </div>

          {/* Scrollable Booking List */}
          <div className="bulk-confirm-list-wrapper">
            <div className="bulk-confirm-list-header">
              <span>SELECTED CONSIGNMENTS ({selectedBookings.length})</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Review items before updating</span>
            </div>

            <div className="bulk-confirm-list">
              {selectedBookings.map((b, idx) => {
                const bookingId = b.id || b._id;
                const awbNo = b.awb || b.awbNo || b.lrNo || b.consignment || b.bookingId || "-";
                const fromCity = b.origin || b.fromCity || b.from || b.originCity || '-';
                const toCity = b.destination || b.toCity || b.to || b.destCity || '-';
                const consignor = b.client || b.consignor || b.consignorName || b.senderName || b.sender || '';
                const consignee = b.consignee || b.consigneeName || b.receiverName || b.receiver || '';
                const rawDate = b.createdAt || b.date || b.bookingDate;
                const dateStr = rawDate ? formatDate(rawDate) : '-';
                const pkgs = b.box || b.boxes || b.packages || b.packageCount || b.totalPkgs || b.pkgs || 1;

                return (
                  <div key={bookingId || idx} className="bulk-confirm-item-row">
                    {/* Left: AWB & Date */}
                    <div className="bulk-confirm-item-left">
                      <div className="bulk-confirm-awb-badge">
                        AWB: {awbNo}
                      </div>
                      <span className="bulk-confirm-date-tag">
                        📅 {dateStr}
                      </span>
                    </div>

                    {/* Middle: Route & Uppercase Parties Hint */}
                    <div className="bulk-confirm-item-mid">
                      <div className="bulk-confirm-route">
                        <span className="route-city" title={fromCity}>{fromCity}</span>
                        <ArrowRight size={12} className="route-arrow" />
                        <span className="route-city" title={toCity}>{toCity}</span>
                      </div>
                      {(consignor || consignee) && (
                        <div className="bulk-confirm-parties">
                          <span className="party-name" title={consignor}>{(consignor || '-').toUpperCase()}</span>
                          <span className="party-sep">→</span>
                          <span className="party-name" title={consignee}>{(consignee || '-').toUpperCase()}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Pkgs & Remove Cross */}
                    <div className="bulk-confirm-item-right">
                      <span className="bulk-confirm-pkgs-badge" title={`${pkgs} Packages`}>
                        <Package size={11} /> {pkgs} Pkg{pkgs > 1 ? 's' : ''}
                      </span>
                      {onRemoveBooking && (
                        <button
                          type="button"
                          className="bulk-confirm-remove-btn"
                          onClick={() => onRemoveBooking(bookingId)}
                          title="Remove from batch"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bulk-confirm-footer">
            <button type="button" className="bulk-confirm-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="bulk-confirm-proceed-btn"
              onClick={onConfirm}
              disabled={selectedBookings.length === 0}
            >
              <Truck size={16} />
              <span>Proceed to Update Tracking ({selectedBookings.length})</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default BulkTrackingConfirmModal;
