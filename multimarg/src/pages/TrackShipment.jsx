import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, CheckCircle, Clock, Truck, Package, PackageCheck, AlertCircle, XCircle, Eye, Download, X, FileText } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import SEOHead from '../components/SEOHead';

const API = `${import.meta.env.VITE_API_URL || ''}/api`;

const formatCleanDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  const dmyMatch = String(dateStr).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = String(dmyMatch[1]).padStart(2, '0');
    const month = String(dmyMatch[2]).padStart(2, '0');
    const year = dmyMatch[3];
    return `${day}-${month}-${year}`;
  }
  return dateStr;
};

const formatCleanDateTime = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${mins}`;
  }
  return formatCleanDate(dateStr);
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'Shipment Booked':
    case 'Booked': return <Package size={20} />;
    case 'Picked Up': return <Package size={20} />;
    case 'In Transit': return <Truck size={20} />;
    case 'Out for Delivery': return <Truck size={20} />;
    case 'Delivered': return <PackageCheck size={20} />;
    case 'Returned': return <XCircle size={20} />;
    default: return <Clock size={20} />;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'Shipment Booked':
    case 'Booked': return '#2563eb';
    case 'Picked Up': return '#3b82f6';
    case 'In Transit': return '#f59e0b';
    case 'Out for Delivery': return '#8b5cf6';
    case 'Delivered': return '#22c55e';
    case 'Returned': return '#ef4444';
    default: return '#6b7280';
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
            {trackingResult && !isSearching && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ maxWidth: '900px', margin: '0 auto' }}
              >
                {/* Summary Card */}
                <div style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '16px', 
                  padding: 'clamp(1.25rem, 3vw, 2rem)', 
                  boxShadow: 'var(--shadow-md)',
                  marginBottom: '2rem'
                }}>
                  {/* Header with AWB, Status, and POD Eye Button */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: '1rem', 
                    borderBottom: '1px solid #eee', 
                    paddingBottom: '1.5rem', 
                    marginBottom: '1.5rem' 
                  }}>
                    <div>
                      <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Tracking Number</p>
                      <h2 style={{ color: 'var(--primary-blue)', margin: 0, fontSize: 'clamp(1.2rem, 3vw, 1.5rem)' }}>{trackingResult.tracking[0]?.awb}</h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            borderRadius: '50px',
                            fontWeight: '700',
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(37,99,235,0.1)'
                          }}
                          title="View Proof of Delivery (POD)"
                        >
                          <Eye size={16} /> View POD
                        </button>
                      )}

                      <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.5rem 1.2rem', 
                        backgroundColor: isDelivered ? '#dcfce7' : '#e8f4fd',
                        color: isDelivered ? '#16a34a' : getStatusColor(latestStatus),
                        borderRadius: '50px',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}>
                        {isDelivered ? <CheckCircle size={16} /> : <Clock size={16} />}
                        {latestStatus}
                      </span>
                    </div>
                  </div>

                  {/* Shipment Details Grid */}
                  {trackingResult.booking && (() => {
                    const b = trackingResult.booking;
                    const boxVal = b.box || b.packages || b.pkg || b.pcs || b.package_count || b.boxCount;

                    return (
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                        gap: '1.25rem',
                        marginTop: '1rem'
                      }}>
                        {/* 1. ROUTE CARD */}
                        <div style={{ 
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3a8a', fontWeight: '800', fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            <MapPin size={16} color="#3b82f6" /> Route Details
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Origin</span>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem', marginTop: '0.1rem' }}>{b.origin ? b.origin.toUpperCase() : '-'}</div>
                            </div>
                            <div style={{ color: '#94a3b8', fontWeight: 500, fontSize: '1.2rem', userSelect: 'none' }}>&rarr;</div>
                            <div style={{ flex: 1, textAlign: 'right' }}>
                              <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Destination</span>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem', marginTop: '0.1rem' }}>{b.destination ? b.destination.toUpperCase() : '-'}</div>
                            </div>
                          </div>
                        </div>

                        {/* 2. PARTIES CARD */}
                        <div style={{ 
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3a8a', fontWeight: '800', fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                            <Package size={16} color="#f59e0b" /> Party Information
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Consignor</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{b.consignor ? b.consignor.toUpperCase() : '-'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.2rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Consignee</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{b.consignee ? b.consignee.toUpperCase() : '-'}</span>
                          </div>
                        </div>

                        {/* 3. BOOKING CONTEXT CARD */}
                        <div style={{ 
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3a8a', fontWeight: '800', fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                            <Clock size={16} color="#8b5cf6" /> Booking Context
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Booking Date</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{formatCleanDate(b.date || b.dispatch_date)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.2rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Client</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{b.client ? b.client.toUpperCase() : (b.clientName ? b.clientName.toUpperCase() : '-')}</span>
                          </div>
                        </div>

                        {/* 4. CARGO & TRANSIT CARD */}
                        <div style={{ 
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3a8a', fontWeight: '800', fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                            <Truck size={16} color="#10b981" /> Cargo & Transit
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Package Count</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{boxVal ? `${boxVal} PCS` : '-'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.2rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Transport Mode</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>{b.mode ? (b.mode.toUpperCase() === 'RAIL' ? 'TRAIN' : b.mode.toUpperCase()) : '-'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* No booking data message */}
                  {!trackingResult.booking && (
                    <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      Shipment details not available. Showing tracking updates only.
                    </p>
                  )}
                </div>

                {/* Timeline */}
                <div style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '16px', 
                  padding: 'clamp(1.25rem, 3vw, 2.5rem)', 
                  boxShadow: 'var(--shadow-md)' 
                }}>
                  <h3 style={{ marginBottom: '2rem', color: 'var(--primary-blue)', fontSize: 'clamp(1.1rem, 3vw, 1.3rem)' }}>
                    <Clock size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                    Tracking History
                  </h3>
                  
                  <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                    {/* Vertical Line */}
                    <div style={{ 
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
                      
                      return (
                        <div key={entry.id || index} style={{ 
                          display: 'flex', 
                          gap: 'clamp(0.75rem, 2vw, 1.5rem)',
                          marginBottom: index !== trackingResult.tracking.length - 1 ? '2.5rem' : 0,
                          position: 'relative',
                          zIndex: 2
                        }}>
                          {/* Circle Icon */}
                          <div style={{ 
                            width: '44px', 
                            height: '44px', 
                            borderRadius: '50%', 
                            backgroundColor: isLatest ? color : 'white',
                            border: isLatest ? 'none' : `2px solid ${color}`,
                            color: isLatest ? 'white' : color,
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: isLatest ? `0 0 0 4px ${color}20, 0 4px 8px ${color}30` : '0 0 0 4px white',
                            marginLeft: '-3px'
                          }}>
                            {getStatusIcon(entry.status)}
                          </div>
                          
                          {/* Details */}
                          <div style={{ 
                            flex: 1,
                            padding: 'clamp(0.75rem, 2vw, 1rem) clamp(0.75rem, 2vw, 1.2rem)', 
                            background: isLatest ? '#f8fafc' : '#ffffff', 
                            border: isLatest ? '1px solid #e2e8f0' : '1px solid transparent', 
                            borderRadius: '12px', 
                            boxShadow: isLatest ? '0 4px 6px rgba(0,0,0,0.02)' : 'none' 
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 700, color: color, fontSize: 'clamp(0.9rem, 2vw, 1.05rem)' }}>{entry.status}</span>
                              <span style={{ 
                                fontSize: '0.85rem', 
                                color: '#6b7280', 
                                background: '#f3f4f6', 
                                padding: '0.2rem 0.6rem', 
                                borderRadius: '20px', 
                                fontWeight: 500, 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.3rem',
                                whiteSpace: 'nowrap'
                              }}>
                                <Clock size={12} />
                                {formatCleanDateTime(entry.date || entry.updatedAt)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#4b5563', fontSize: '0.95rem' }}>
                              <MapPin size={14} color="#9ca3af" />
                              <span style={{ fontWeight: 500, textTransform: 'uppercase' }}>{entry.location || 'Location not provided'}</span>
                            </div>

                            {entry.remarks && (
                              <div style={{ 
                                marginTop: '0.5rem', 
                                fontSize: '0.9rem', 
                                color: '#6b7280', 
                                background: '#f9fafb', 
                                padding: '0.6rem 0.8rem', 
                                borderRadius: '8px', 
                                borderLeft: '3px solid #d1d5db', 
                                fontStyle: 'italic' 
                              }}>
                                "{entry.remarks}"
                              </div>
                            )}

                            {entry.podUrl && (
                              <div style={{ marginTop: '0.6rem' }}>
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
                                    padding: '0.35rem 0.75rem',
                                    backgroundColor: '#ecfdf5',
                                    color: '#059669',
                                    border: '1px solid #a7f3d0',
                                    borderRadius: '6px',
                                    fontWeight: '700',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Eye size={14} /> View Attached POD
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </motion.div>
            )}
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
