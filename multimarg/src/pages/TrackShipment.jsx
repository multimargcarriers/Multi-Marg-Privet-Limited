import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, CheckCircle, Clock, Truck, Package, PackageCheck, AlertCircle, XCircle, Eye, Download, X, FileText, Check, ChevronDown, ChevronUp, Layers, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import SEOHead from '../components/SEOHead';
import CopyButton from '../components/CopyButton';

const API = `${import.meta.env.VITE_API_URL || ''}/api`;

const parseDateSecurely = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  const dateStr = String(dateVal).trim();
  if (!dateStr) return null;

  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
    const year = parseInt(dmyMatch[3], 10);
    
    const timeMatch = dateStr.match(/\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      return new Date(year, month, day, hours, minutes, seconds);
    }
    
    return new Date(year, month, day);
  }

  const parsedDate = new Date(dateStr);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }
  return null;
};

const formatCleanDate = (dateStr) => {
  const d = parseDateSecurely(dateStr);
  if (d) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return "-";
};

const formatCleanDateTime = (dateStr) => {
  if (!dateStr) return "N/A";
  const str = String(dateStr).trim();
  const d = parseDateSecurely(str);
  if (d) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    const hasTime = str.includes('T') || str.includes(':');
    if (hasTime) {
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = String(hours).padStart(2, '0');
      return `${day}-${month}-${year}, ${formattedHours}:${minutes} ${ampm}`;
    }

    return `${day}-${month}-${year}`;
  }
  return "N/A";
};

const normalizeStatus = (status) => {
  const s = String(status || '').trim().toLowerCase();
  if (s.includes('out for delivery') || s.includes('out_for_delivery')) return 'OUT FOR DELIVERY';
  if (s.includes('deliver')) return 'DELIVERED';
  if (s.includes('reach') || s.includes('hub') || s.includes('arrive')) return 'REACHED HUB';
  if (s.includes('transit') || s.includes('pickup') || s.includes('picked') || s.includes('book')) return 'IN TRANSIT';
  if (s.includes('delay')) return 'DELAYED';
  if (s.includes('return') || s.includes('rto')) return 'RETURNED';
  return String(status || 'IN TRANSIT').toUpperCase();
};

const getStatusIcon = (status) => {
  const norm = normalizeStatus(status);
  switch (norm) {
    case 'DELIVERED': return <PackageCheck size={22} />;
    case 'OUT FOR DELIVERY': return <Truck size={22} />;
    case 'IN TRANSIT': return <Truck size={22} />;
    case 'REACHED HUB': return <MapPin size={22} />;
    case 'PICKED UP': return <Package size={22} />;
    case 'SHIPMENT BOOKED': return <Package size={22} />;
    case 'DELAYED': return <Clock size={22} />;
    case 'RETURNED': return <XCircle size={22} />;
    default: return <Clock size={22} />;
  }
};

const getStatusColor = (status) => {
  const norm = normalizeStatus(status);
  switch (norm) {
    case 'DELIVERED': return '#059669'; // Emerald Green
    case 'OUT FOR DELIVERY': return '#7c3aed'; // Vibrant Purple
    case 'IN TRANSIT': return '#d97706'; // Amber / Gold
    case 'REACHED HUB': return '#0d9488'; // Teal
    case 'PICKED UP': return '#0284c7'; // Sky Blue
    case 'SHIPMENT BOOKED': return '#2563eb'; // Primary Royal Blue
    case 'DELAYED': return '#ea580c'; // Coral Orange
    case 'RETURNED': return '#dc2626'; // Red
    default: return '#475569';
  }
};

const getStatusBg = (status) => {
  const norm = normalizeStatus(status);
  switch (norm) {
    case 'DELIVERED': return '#ecfdf5';
    case 'OUT FOR DELIVERY': return '#f5f3ff';
    case 'IN TRANSIT': return '#fffbeb';
    case 'REACHED HUB': return '#f0fdfa';
    case 'PICKED UP': return '#f0f9ff';
    case 'SHIPMENT BOOKED': return '#eff6ff';
    case 'DELAYED': return '#fff7ed';
    case 'RETURNED': return '#fef2f2';
    default: return '#f8fafc';
  }
};

const getStatusBorder = (status) => {
  const norm = normalizeStatus(status);
  switch (norm) {
    case 'DELIVERED': return '#a7f3d0';
    case 'OUT FOR DELIVERY': return '#ddd6fe';
    case 'IN TRANSIT': return '#fde68a';
    case 'REACHED HUB': return '#99f6e4';
    case 'PICKED UP': return '#bae6fd';
    case 'SHIPMENT BOOKED': return '#bfdbfe';
    case 'DELAYED': return '#fed7aa';
    case 'RETURNED': return '#fecaca';
    default: return '#e2e8f0';
  }
};

const TrackShipment = () => {
  const [searchParams] = useSearchParams();
  const awbQuery = searchParams.get('awb');

  const [trackingNumber, setTrackingNumber] = useState(awbQuery || '');
  const [isSearching, setIsSearching] = useState(false);
  const [trackingResult, setTrackingResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [showPodModal, setShowPodModal] = useState(false);
  const [selectedPodUrl, setSelectedPodUrl] = useState('');
  const [showTimelineDetails, setShowTimelineDetails] = useState(true);
  const searchStarted = useRef(false);

  const performSearch = async (awb) => {
    const trimmed = (awb || '').trim();
    if (!trimmed) return;

    setIsSearching(true);
    setTrackingResult(null);
    setErrorMessage('');
    setHasSearched(true);

    try {
      const res = await axios.get(`${API}/public/tracking/${encodeURIComponent(trimmed)}`);
      if (res.data.success && res.data.data && res.data.data.length > 0) {
        setTrackingResult({
          tracking: res.data.data,
          booking: res.data.booking
        });
      } else {
        setErrorMessage(`No tracking data found for "${trimmed}". Please check your AWB / LR number and try again.`);
      }
    } catch (err) {
      console.error('Tracking error:', err);
      if (err.response?.status === 400) {
        setErrorMessage(err.response.data?.message || 'Invalid tracking number.');
      } else {
        setErrorMessage('Unable to connect to the tracking server. Please try again later.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (awbQuery && !searchStarted.current) {
      searchStarted.current = true;
      performSearch(awbQuery);
    }
  }, [awbQuery]);

  const handleTrack = (e) => {
    if (e) e.preventDefault();
    performSearch(trackingNumber);
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const latestStatus = trackingResult?.tracking?.[0]?.status || '';
  const isDelivered = latestStatus === 'Delivered';
  const mainPodUrl = trackingResult?.booking?.podUrl || trackingResult?.tracking?.find(t => t.podUrl)?.podUrl || null;

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', backgroundColor: 'var(--bg-light-grey)' }}>
      <SEOHead
        title="Track Shipment — Real-time Consignment & AWB Tracking"
        description="Track your Multimarg Carriers shipment live. Enter your AWB / consignment number or LR number to view real-time location updates, delivery status, and transit history."
        keywords="track multimarg shipment, multimarg tracking, AWB tracking india, consignment tracking, LR status check, freight live tracking, multimarg courier tracking"
        canonicalPath="/track"
      />
      {/* Hero Section */}
      <section style={{ 
        background: 'linear-gradient(135deg, var(--primary-blue-dark) 0%, var(--primary-blue) 100%)', 
        color: 'white',
        padding: '4rem 0 5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '-30%', right: '-5%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(200, 16, 46, 0.08)', filter: 'blur(60px)' }} />
        
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={fadeInUp}
            style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}
          >
            <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', marginBottom: '1rem', fontWeight: 800 }}>Track Your Shipment</h1>
            <p style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.2rem)', opacity: 0.9, lineHeight: 1.6, marginBottom: '2.5rem' }}>
              Enter your complete AWB / LR Number to get real-time status updates.
            </p>

            <form onSubmit={handleTrack} style={{ 
              display: 'flex', 
              maxWidth: '650px', 
              margin: '0 auto', 
              gap: '0', 
              backgroundColor: 'white', 
              padding: '0.4rem', 
              borderRadius: '50px', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              flexWrap: 'nowrap'
            }}>
              <input 
                type="text" 
                placeholder="Enter AWB / LR No." 
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                style={{ 
                  flex: 1, 
                  border: 'none', 
                  outline: 'none', 
                  padding: '0.9rem 1.5rem', 
                  fontSize: 'clamp(0.85rem, 2vw, 1rem)',
                  borderRadius: '50px',
                  color: 'var(--text-main)',
                  minWidth: 0
                }}
                required
                autoComplete="off"
              />
              <button 
                type="submit" 
                disabled={isSearching}
                style={{ 
                  backgroundColor: 'var(--primary-red)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '50px', 
                  padding: '0 clamp(1rem, 3vw, 2rem)', 
                  fontSize: 'clamp(0.85rem, 2vw, 1rem)', 
                  fontWeight: 'bold',
                  cursor: isSearching ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background-color 0.3s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  opacity: isSearching ? 0.7 : 1
                }}
              >
                {isSearching ? 'Searching...' : <>Track <Search size={18} /></>}
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Results Section */}
      <section className="section-padding" style={{ minHeight: '40vh' }}>
        <div className="container">
          <AnimatePresence mode="wait">
            {/* Empty State */}
            {!hasSearched && !isSearching && (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: 'center', color: 'var(--text-light)', padding: '3rem 0' }}
              >
                <Search size={64} style={{ opacity: 0.15, margin: '0 auto 1.5rem', display: 'block' }} />
                <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Enter your tracking number above</h3>
                <p style={{ opacity: 0.7, fontSize: '0.95rem' }}>You must enter the full AWB / LR number to search.</p>
              </motion.div>
            )}

            {/* Loading State */}
            {isSearching && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '4rem 0' }}
              >
                <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
                  <Search size={40} color="var(--primary-blue)" />
                </div>
                <p style={{ marginTop: '1rem', color: 'var(--text-light)', fontSize: '1.1rem' }}>Locating your shipment...</p>
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
              </motion.div>
            )}

            {/* Error / Not Found State */}
            {errorMessage && !isSearching && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '3rem 0', maxWidth: '600px', margin: '0 auto' }}
              >
                <div style={{ 
                  background: '#fef2f2', 
                  padding: '2rem', 
                  borderRadius: '16px', 
                  border: '1px solid #fecaca' 
                }}>
                  <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem', display: 'block' }} />
                  <h3 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>Shipment Not Found</h3>
                  <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>{errorMessage}</p>
                </div>
              </motion.div>
            )}

            {/* Results State */}
            {trackingResult && !isSearching && (() => {
              const b = trackingResult.booking || {};
              const mainPodUrl = b.podUrl || b.pod || trackingResult.tracking.find(t => t.podUrl)?.podUrl || null;
              const currentAwb = trackingResult.tracking[0]?.awb || b.awb || trackingNumber;
              
              const latestEntry = trackingResult.tracking[0] || {};
              const rawStatus = String(latestEntry?.status || b.transitStatus || b.status || b.delivery_status || "In Transit");
              const normStatus = rawStatus.toLowerCase();

              const isOutForDelivery = normStatus.includes("out for delivery") || normStatus.includes("out_for_delivery");
              const isDelivered = normStatus.includes("deliver") && !isOutForDelivery;
              const isInTransit = !isDelivered && !isOutForDelivery;

              // Determine step index for the 4-step progress tracker:
              // 1: Booked, 2: In Transit, 3: Out for Delivery, 4: Delivered
              let currentStepNumber = 2;
              if (isDelivered) currentStepNumber = 4;
              else if (isOutForDelivery) currentStepNumber = 3;
              else currentStepNumber = 2;

              const originCity = b.origin ? String(b.origin).toUpperCase() : "";
              const destCity = b.destination ? String(b.destination).toUpperCase() : "";
              const currentLoc = (latestEntry?.location || b.currentLocation || originCity || "ORIGIN").trim().toUpperCase();

              // Status Banner styling & messaging — GRADIENT THEME
              let bannerBg = "linear-gradient(135deg, #046A38 0%, #059669 50%, #10b981 100%)";
              let bannerAccent = "#059669";
              let bannerTitle = "Delivered";
              let bannerSubtitle = `Delivered on ${formatCleanDateTime(latestEntry.date || latestEntry.updatedAt || b.deliveryDate || b.date)}`;
              let bannerRibbonBg = "linear-gradient(90deg, #ecfdf5, #d1fae5)";
              let bannerRibbonText = "#065f46";
              bannerMessage = "🎉 Your Shipment has been Delivered on Time!";
              let stepGradient = "linear-gradient(90deg, #046A38, #059669, #10b981)";

              if (isDelivered) {
                bannerBg = "linear-gradient(135deg, #046A38 0%, #059669 50%, #10b981 100%)";
                bannerAccent = "#059669";
                bannerTitle = "Delivered";
                bannerSubtitle = `Delivered on ${formatCleanDateTime(latestEntry.date || latestEntry.updatedAt || b.deliveryDate || b.date)}`;
                bannerRibbonBg = "linear-gradient(90deg, #ecfdf5, #d1fae5)";
                bannerRibbonText = "#065f46";
                bannerMessage = "🎉 Your Shipment has been Delivered on Time!";
                stepGradient = "linear-gradient(90deg, #046A38, #059669, #10b981)";
              } else if (isOutForDelivery) {
                bannerBg = "linear-gradient(135deg, #5b21b6 0%, #7c3aed 50%, #a78bfa 100%)";
                bannerAccent = "#7c3aed";
                bannerTitle = "Out for Delivery";
                bannerSubtitle = `Out for Delivery at ${destCity || "Destination"}`;
                bannerRibbonBg = "linear-gradient(90deg, #f5f3ff, #ede9fe)";
                bannerRibbonText = "#5b21b6";
                bannerMessage = "🛵 Shipment is Out for Delivery with the executive.";
                stepGradient = "linear-gradient(90deg, #5b21b6, #7c3aed, #a78bfa)";
              } else if (isInTransit) {
                bannerBg = "linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)";
                bannerAccent = "#d97706";
                bannerTitle = "In Transit";
                const fromStr = originCity ? `In Transit from ${originCity}` : "In Transit";
                const toStr = destCity ? ` to ${destCity}` : "";
                bannerSubtitle = currentLoc ? `In Transit - Current Location: ${currentLoc}` : `${fromStr}${toStr}`;
                bannerRibbonBg = "linear-gradient(90deg, #fffbeb, #fef3c7)";
                bannerRibbonText = "#b45309";
                bannerMessage = currentLoc
                  ? `🚚 Your Shipment is currently at ${currentLoc}${destCity ? ` moving towards ${destCity}` : ''}.`
                  : `🚚 Your Shipment is In Transit from ${originCity || "origin"} and moving towards destination.`;
                stepGradient = "linear-gradient(90deg, #b45309, #d97706, #f59e0b)";
              } else {
                bannerBg = "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)";
                bannerAccent = "#1e40af";
                bannerTitle = "Shipment Booked";
                bannerSubtitle = originCity ? `Booked at ${originCity}` : "Shipment Booked";
                bannerRibbonBg = "linear-gradient(90deg, #eff6ff, #dbeafe)";
                bannerRibbonText = "#1e40af";
                bannerMessage = originCity ? `📦 Shipment has been booked from ${originCity} and Lorry Receipt generated.` : "📦 Shipment has been booked and Lorry Receipt generated.";
                stepGradient = "linear-gradient(90deg, #1e3a8a, #2563eb, #3b82f6)";
              }

              const steps = [
                { id: 1, label: "Booked", icon: Package },
                { id: 2, label: "In Transit", icon: Truck },
                { id: 3, label: "Out for Delivery", icon: MapPin },
                { id: 4, label: "Delivered", icon: CheckCircle }
              ];

              // Invoices Extraction
              const invoices = (Array.isArray(b.invoiceDetails) && b.invoiceDetails.length > 0)
                ? b.invoiceDetails
                : (b.invoice_no || b.eway_bill)
                  ? [{
                      invoice_no: b.invoice_no || "-",
                      invoice_date: b.date || "-",
                      part_no: "-",
                      qty: b.box || b.packages || 1,
                      value: b.declared_value || b.invoice_value || "-",
                      eway_bill: b.eway_bill || b.eway || "-"
                    }]
                  : [];

              const allInvoiceNumbers = invoices.map(i => i.invoice_no || i.invoiceNo).filter(Boolean).join(", ") || b.invoice_no || b.refNo || "-";

return (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ maxWidth: '960px', margin: '0 auto' }}
                >
                  {/* Main Tracking Card */}
                  <div className="tracking-card" style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '16px', 
                    padding: 'clamp(1.25rem, 3vw, 2rem)', 
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                    marginBottom: '2rem',
                    borderTop: '3px solid transparent',
                    borderImage: stepGradient + ' 1'
                  }}>
                    {/* Top Header Bar */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      flexWrap: 'wrap', 
                      gap: '0.75rem', 
                      backgroundColor: '#ffffff',
                      borderBottom: '2px solid #f1f5f9',
                      padding: '0 0.25rem 0.85rem', 
                      marginBottom: '1rem' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                          src="/circle_crop_logo.png"
                          alt="Multimarg Carriers Logo"
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            flexShrink: 0,
                            border: '2px solid #fed7aa'
                          }}
                        />
                        <div>
                          <div style={{ color: '#c2410c', fontSize: 'clamp(0.85rem, 2.2vw, 1.05rem)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                            Multimarg Carriers
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ 
                              color: '#ea580c', 
                              fontWeight: 800, 
                              fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)', 
                              letterSpacing: '0.5px' 
                            }}>
                              AWB: {currentAwb}
                            </span>
                            <CopyButton text={currentAwb} size={16} />
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* DTDC Prominent Status Hero Banner */}
                    <div style={{
                      borderRadius: '8px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                      marginBottom: '1.5rem'
                    }}>
                      <div style={{
                        background: bannerBg,
                        color: '#ffffff',
                        padding: 'clamp(0.75rem, 2vw, 1.25rem) clamp(0.85rem, 2.5vw, 1.5rem)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: 'clamp(36px, 6vw, 48px)',
                            height: 'clamp(36px, 6vw, 48px)',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Package size={24} color="#ffffff" />
                          </div>
                          <div>
                            <h2 style={{ margin: 0, fontSize: 'clamp(1.3rem, 4vw, 1.75rem)', fontWeight: '800', letterSpacing: '-0.02em', lineHeight: 1.1, color: '#ffffff' }}>
                              {bannerTitle}
                            </h2>
                            <p style={{ margin: '0.15rem 0 0 0', fontSize: 'clamp(0.72rem, 2vw, 0.9rem)', color: 'rgba(255, 255, 255, 0.9)', fontWeight: '500' }}>
                              {bannerSubtitle}
                            </p>
                          </div>
                        </div>

                        {mainPodUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPodUrl(mainPodUrl);
                              setShowPodModal(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.5rem 1.1rem',
                              backgroundColor: '#ffffff',
                              color: bannerAccent,
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: '700',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            <Eye size={16} /> View POD Proof
                          </button>
                        )}
                      </div>

                      {/* Ribbon Message Bar */}
                      <div style={{
                        background: bannerRibbonBg,
                        color: bannerRibbonText,
                        padding: '0.6rem 1.25rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        {bannerMessage}
                      </div>
                    </div>

                    {/* Step Progress Tracker */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                      gap: "clamp(0.25rem, 1.5vw, 0.75rem)",
                      margin: "1.5rem 0",
                      padding: "0 0.15rem"
                    }}>
                      {steps.map((step) => {
                        const isCompleted = step.id <= currentStepNumber;
                        const isCurrent = step.id === currentStepNumber;
                        const StepIcon = step.icon;

                        return (
                          <div key={step.id} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            {/* Top Step Indicator Bar */}
                            <div style={{
                              height: "4px",
                              borderRadius: "2px",
                              background: isCompleted ? stepGradient : "#e2e8f0",
                              transition: "all 0.3s ease"
                            }} />
                            
                            {/* Step Label & Icon */}
                            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", paddingTop: "0.2rem" }}>
                              {isCompleted ? (
                                <div style={{
                                  width: "16px",
                                  height: "16px",
                                  borderRadius: "50%",
                                  background: stepGradient,
                                  color: "white",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0
                                }}>
                                  <Check size={10} strokeWidth={3} />
                                </div>
                              ) : (
                                <div style={{
                                  width: "16px",
                                  height: "16px",
                                  borderRadius: "50%",
                                  border: "1.5px solid #cbd5e1",
                                  backgroundColor: "white",
                                  flexShrink: 0
                                }} />
                              )}
                              
                              <span style={{ 
                                fontSize: "clamp(0.65rem, 1.8vw, 0.8rem)", 
                                fontWeight: isCurrent ? "700" : (isCompleted ? "600" : "500"),
                                color: isCurrent ? bannerAccent : (isCompleted ? "#1e293b" : "#64748b"),
                                lineHeight: 1.15,
                                wordBreak: "break-word"
                              }}>
                                {step.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* ORIGIN & CURRENT LOCATION & DESTINATION STRIP */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "0.75rem 1rem",
                      marginBottom: "1.25rem",
                      fontSize: "0.85rem",
                      flexWrap: "wrap",
                      gap: "0.5rem"
                    }}>
                      <div>
                        <span style={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", display: "block" }}>Origin:</span>
                        <span style={{ color: "#0f172a", fontWeight: 700 }}>
                          {originCity || "ORIGIN"}
                          {b.originPincode ? `, ${b.originPincode}` : ""}
                          {", INDIA"}
                        </span>
                      </div>
                      {currentLoc && (
                        <div style={{ textAlign: "center", padding: "0 0.5rem" }}>
                          <span style={{ color: "#d97706", fontWeight: 700, textTransform: "uppercase", fontSize: "0.75rem", display: "block" }}>Current Location:</span>
                          <span style={{ color: "#b45309", fontWeight: 800, fontSize: "0.9rem" }}>
                            📍 {currentLoc}
                          </span>
                        </div>
                      )}
                      <div style={{ textAlign: "right" }}>
                        <span style={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", display: "block" }}>Destination:</span>
                        <span style={{ color: "#0f172a", fontWeight: 700 }}>
                          {destCity || "DESTINATION"}
                          {b.destinationPincode ? `, ${b.destinationPincode}` : ""}
                          {", INDIA"}
                        </span>
                      </div>
                    </div>

                    {/* Basic Info Details Card - TABLE-LIKE HEADER LAYOUT */}
                    <div style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      marginBottom: '1.5rem',
                      backgroundColor: '#ffffff'
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%)',
                        padding: '0.5rem 0.75rem',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#ffffff',
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <Layers size={13} color="#ffffff" /> SHIPMENT DETAILS
                      </div>

                      <div style={{ padding: '0.6rem 0.75rem' }}>
                        <div className="shipment-details-grid" style={{ fontSize: '0.78rem' }}>
                          {/* Row: Consignor */}
                          <div>
                            <span style={{ color: '#64748b', fontWeight: 600, marginRight: '0.35rem' }}>CONSIGNOR:</span>
                            <span style={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>
                              {b.consignor ? b.consignor.toUpperCase() : '-'}
                              {b.consignorGstin && (
                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500, fontFamily: 'monospace', marginLeft: '0.3rem' }}>
                                  (GST: {b.consignorGstin})
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Row: Consignee */}
                          <div>
                            <span style={{ color: '#64748b', fontWeight: 600, marginRight: '0.35rem' }}>CONSIGNEE:</span>
                            <span style={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>
                              {b.consignee ? b.consignee.toUpperCase() : '-'}
                              {b.consigneeGstin && (
                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500, fontFamily: 'monospace', marginLeft: '0.3rem' }}>
                                  (GST: {b.consigneeGstin})
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Row: Booking Date */}
                          <div>
                            <span style={{ color: '#64748b', fontWeight: 600, marginRight: '0.35rem' }}>BOOKED ON:</span>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              {formatCleanDate(b.dispatch_date || b.date || b.createdAt)}
                            </span>
                          </div>

                          {/* Row: Package Count */}
                          <div>
                            <span style={{ color: '#64748b', fontWeight: 600, marginRight: '0.35rem' }}>PACKAGES:</span>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              {(() => {
                                const bVal = b.box || b.packages || b.pkg || b.pcs || b.package_count || b.boxCount;
                                return bVal ? `${bVal} PCS` : '-';
                              })()}
                            </span>
                          </div>

                          {/* Row: Mode / Payment */}
                          <div>
                            <span style={{ color: '#64748b', fontWeight: 600, marginRight: '0.35rem' }}>MODE:</span>
                            <span style={{ fontWeight: 700 }}>
                              <span style={{ color: '#1e3a8a' }}>{(b.mode || 'ROAD').toUpperCase()}</span>
                              {' / '}
                              <span style={{ color: '#059669' }}>{(b.paymentMode || b.payment || 'CREDIT').toUpperCase()}</span>
                            </span>
                          </div>

                          {/* Row: Weight (conditional) */}
                          {(() => {
                            const act = parseFloat(b.actual_wt || b.weight || 0);
                            const chg = parseFloat(b.charge_wt || b.weight || 0);
                            if (act > 0 || chg > 0) {
                              return (
                                <div>
                                  <span style={{ color: '#64748b', fontWeight: 600, marginRight: '0.35rem' }}>WEIGHT:</span>
                                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                    ACT: <strong style={{ color: '#1e3a8a' }}>{b.actual_wt || b.weight || '-'} KG</strong> | CHG: <strong style={{ color: '#059669' }}>{b.charge_wt || b.weight || '-'} KG</strong>
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Row: Vehicle No (conditional) */}
                          {b.vehicleNo && (
                            <div>
                              <span style={{ color: '#64748b', fontWeight: 600, marginRight: '0.35rem' }}>VEHICLE:</span>
                              <span style={{ fontWeight: 700, color: '#e11d48', fontFamily: 'monospace' }}>
                                {b.vehicleNo.toUpperCase()}
                              </span>
                            </div>
                          )}

                          {/* Row: Goods Description (conditional) */}
                          {(b.goods_description || b.goodsDescription || b.goods || b.commodity) && (
                            <div>
                              <span style={{ color: '#64748b', fontWeight: 600, marginRight: '0.35rem' }}>COMMODITY:</span>
                              <span style={{ fontWeight: 600, color: '#334155' }}>
                                {(b.goods_description || b.goodsDescription || b.goods || b.commodity || '-').toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* INVOICE & E-WAY BILL DETAILS TABLE */}
                    {invoices.length > 0 && (
                      <div style={{
                        marginTop: '1rem',
                        marginBottom: '1.5rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                      }}>
                         <div style={{
                           background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                           padding: '0.5rem 0.75rem',
                           borderBottom: '1px solid #e2e8f0',
                           display: 'flex',
                           justifyContent: 'space-between',
                           alignItems: 'center',
                           flexWrap: 'wrap',
                           gap: '0.4rem'
                         }}>
                           <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase' }}>
                             <FileText size={14} color="#ffffff" /> Invoice Details ({invoices.length})
                           </div>
                         </div>

                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', textAlign: 'left', minWidth: '380px', textTransform: 'uppercase' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 700, borderBottom: '1px solid #cbd5e1' }}>
                                <th style={{ padding: '5px 6px', width: '28px', whiteSpace: 'nowrap' }}>#</th>
                                <th style={{ padding: '5px 6px', whiteSpace: 'nowrap' }}>INVOICE NO</th>
                                <th style={{ padding: '5px 6px', whiteSpace: 'nowrap' }}>DATE</th>
                                <th style={{ padding: '5px 6px', whiteSpace: 'nowrap' }}>PART NO</th>
                                <th style={{ padding: '5px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>QTY</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoices.map((inv, iIdx) => {
                                const invNo = inv.invoice_no || inv.invoiceNo || inv.invoice || "-";
                                const invDate = inv.invoice_date || inv.invoiceDate || inv.date || inv.invdate || "";
                                const partNo = inv.part_no || inv.partNumber || inv.part || inv.description || "-";
                                const pkgs = inv.qty || inv.quantity || inv.box || inv.packages || "-";

                                return (
                                  <tr key={iIdx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: iIdx % 2 === 1 ? '#fafafa' : '#ffffff' }}>
                                    <td style={{ padding: '5px 6px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{iIdx + 1}</td>
                                    <td style={{ padding: '5px 6px', fontWeight: 700, color: '#1e3a8a', whiteSpace: 'nowrap' }}>
                                      {invNo}
                                    </td>
                                    <td style={{ padding: '5px 6px', color: '#334155', whiteSpace: 'nowrap' }}>
                                      {formatCleanDate(invDate)}
                                    </td>
                                    <td style={{ padding: '5px 6px', color: '#475569', whiteSpace: 'nowrap' }}>
                                      {partNo}
                                    </td>
                                    <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                      {pkgs}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* SHIPMENT PROGRESS TIMELINE HEADER */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0.25rem',
                      marginBottom: '0.75rem',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={18} color="#2563eb" /> Shipment Progress
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowTimelineDetails(prev => !prev)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#2563eb',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        {showTimelineDetails ? 'View Less' : 'View Details'}
                        {showTimelineDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {/* Timeline List */}
                    {showTimelineDetails && (
                      <div className="timeline-list-container" style={{ position: 'relative', paddingLeft: '1.5rem', marginTop: '1.5rem' }}>
                        {/* Vertical Line */}
                        <div className="timeline-vertical-line" style={{ 
                          position: 'absolute', 
                          left: '20px', 
                          top: '20px', 
                          bottom: '20px', 
                          width: '2px', 
                          backgroundColor: '#e5e7eb',
                          zIndex: 1
                        }} />

                        {trackingResult.tracking.map((entry, index) => {
                          const isLatest = index === 0;
                          const color = getStatusColor(entry.status);
                          const bg = getStatusBg(entry.status);
                          const border = getStatusBorder(entry.status);
                          const statusCaps = normalizeStatus(entry.status);
                          
                          return (
                            <div key={entry.id || index} className="timeline-item" style={{ 
                              display: 'flex', 
                              gap: 'clamp(0.75rem, 2vw, 1.5rem)',
                              marginBottom: index !== trackingResult.tracking.length - 1 ? '2.2rem' : 0,
                              position: 'relative',
                              zIndex: 2
                            }}>
                              {/* Circle Icon */}
                              <div className="timeline-icon-circle" style={{ 
                                width: '44px', 
                                height: '44px', 
                                borderRadius: '50%', 
                                backgroundColor: isLatest ? color : bg,
                                border: `2.5px solid ${color}`,
                                color: isLatest ? 'white' : color,
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: isLatest ? `0 0 0 4px ${color}25, 0 4px 10px ${color}30` : '0 0 0 4px white',
                                marginLeft: '-3px'
                              }}>
                                {getStatusIcon(entry.status)}
                              </div>
                              
                              {/* Details */}
                              <div className="timeline-details-card" style={{ 
                                flex: 1,
                                padding: 'clamp(0.85rem, 2vw, 1.1rem) clamp(0.85rem, 2vw, 1.3rem)', 
                                background: isLatest ? bg : '#ffffff', 
                                border: `1.5px solid ${isLatest ? border : '#e2e8f0'}`, 
                                borderRadius: '12px', 
                                boxShadow: isLatest ? `0 4px 12px -2px ${color}15` : 'none' 
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <span style={{ fontWeight: 800, color: color, fontSize: 'clamp(0.95rem, 2vw, 1.05rem)', letterSpacing: '0.03em' }}>
                                    {statusCaps}
                                  </span>
                                  <span style={{ 
                                    fontSize: '0.8rem', 
                                    color: '#475569', 
                                    background: isLatest ? '#ffffff' : '#f1f5f9', 
                                    padding: '0.25rem 0.75rem', 
                                    borderRadius: '20px', 
                                    fontWeight: 600, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.35rem',
                                    border: '1px solid #e2e8f0',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    <Clock size={12} color="#64748b" />
                                    {formatCleanDateTime(entry.updatedAt || entry.createdAt || entry.date)}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#334155', fontSize: '0.9rem', fontWeight: 600 }}>
                                  <MapPin size={14} color={color} />
                                  <span style={{ textTransform: 'uppercase', letterSpacing: '0.03em' }}>{entry.location ? String(entry.location).toUpperCase() : 'LOCATION NOT PROVIDED'}</span>
                                </div>

                                {entry.remarks && (
                                  <div style={{ 
                                    marginTop: '0.5rem', 
                                    fontSize: '0.85rem', 
                                    color: '#334155', 
                                    background: isLatest ? 'rgba(255, 255, 255, 0.85)' : '#f8fafc', 
                                    padding: '0.5rem 0.75rem', 
                                    borderRadius: '6px', 
                                    borderLeft: `3px solid ${color}`, 
                                    fontStyle: 'italic',
                                    fontWeight: 500
                                  }}>
                                    "{entry.remarks}"
                                  </div>
                                )}

                                {entry.podUrl && (
                                  <div style={{ marginTop: '0.5rem' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedPodUrl(entry.podUrl);
                                        setShowPodModal(true);
                                      }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        padding: '0.3rem 0.7rem',
                                        backgroundColor: '#ecfdf5',
                                        color: '#059669',
                                        border: '1px solid #a7f3d0',
                                        borderRadius: '6px',
                                        fontWeight: '700',
                                        fontSize: '0.78rem',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <Eye size={13} /> View Attached POD
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      </section>

      {/* POD Viewer Modal */}
      {showPodModal && selectedPodUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.2rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} color="#2563eb" />
                <h4 style={{ margin: 0, color: '#0f172a', fontWeight: 700, fontSize: '1.1rem' }}>
                  Proof of Delivery (POD)
                </h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <a
                  href={selectedPodUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  style={{
                    padding: '0.4rem 0.8rem',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    border: '1px solid #bfdbfe'
                  }}
                >
                  <Download size={14} /> Open / Download
                </a>
                <button
                  type="button"
                  onClick={() => setShowPodModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: '0.3rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: '1.5rem',
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0f172a'
            }}>
              {selectedPodUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={selectedPodUrl}
                  title="POD PDF Document"
                  style={{ width: '100%', height: '500px', border: 'none', borderRadius: '8px', background: '#fff' }}
                />
              ) : (
                <img
                  src={selectedPodUrl}
                  alt="Proof of Delivery Document"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '65vh',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackShipment;
