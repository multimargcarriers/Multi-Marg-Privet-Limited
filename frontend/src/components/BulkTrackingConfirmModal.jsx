import React from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, X, Package, ArrowRight } from "lucide-react";
import CopyButton, { AwbBadge } from "./CopyButton";
import { formatDate } from "../utils/formatters";

const BulkTrackingConfirmModal = ({
  isOpen,
  onClose,
  selectedBookings = [],
  onRemoveBooking,
  onConfirm
}) => {
  if (!isOpen || typeof document === "undefined") return null;

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
                <Truck size={18} color="#ffffff" />
              </div>
              <div className="bulk-confirm-title-wrap">
                <h3 className="bulk-confirm-title">Confirm Bulk Tracking Update</h3>
                <span className="bulk-confirm-badge">
                  {selectedBookings.length} {selectedBookings.length === 1 ? 'AWB' : 'AWBs'} Selected
                </span>
              </div>
            </div>
            <button className="bulk-confirm-close-btn" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Booking List */}
          <div className="bulk-confirm-list-wrapper">
            <div className="bulk-confirm-list-header">
              <span>SELECTED CONSIGNMENTS ({selectedBookings.length})</span>
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
                      <div className="bulk-confirm-awb-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        AWB: {awbNo}
                        <CopyButton text={awbNo} size={11} />
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
