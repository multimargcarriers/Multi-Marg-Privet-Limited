import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, CheckCircle, Clock, Truck, Package, PackageCheck } from 'lucide-react';

const TrackShipment = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [trackingResult, setTrackingResult] = useState(null);

  const handleTrack = (e) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setIsSearching(true);
    setTrackingResult(null);

    // Simulate API call
    setTimeout(() => {
      setIsSearching(false);
      setTrackingResult({
        id: trackingNumber.toUpperCase(),
        status: 'In Transit',
        estimatedDelivery: 'Oct 25, 2026',
        origin: 'Mumbai Port, India',
        destination: 'Dubai, UAE',
        timeline: [
          { status: 'Shipment Created', location: 'Mumbai Port', date: 'Oct 20, 2026, 09:00 AM', completed: true, icon: <Package size={20} /> },
          { status: 'Customs Cleared', location: 'Mumbai Port', date: 'Oct 21, 2026, 02:30 PM', completed: true, icon: <CheckCircle size={20} /> },
          { status: 'Departed Facility', location: 'Mumbai Port', date: 'Oct 22, 2026, 11:15 AM', completed: true, icon: <Truck size={20} /> },
          { status: 'In Transit', location: 'Arabian Sea', date: 'Oct 23, 2026, 08:00 AM', completed: false, icon: <Clock size={20} /> },
          { status: 'Arrived at Destination', location: 'Jebel Ali Port, Dubai', date: 'Pending', completed: false, icon: <MapPin size={20} /> },
          { status: 'Delivered', location: 'Consignee', date: 'Pending', completed: false, icon: <PackageCheck size={20} /> },
        ]
      });
    }, 1500);
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', backgroundColor: 'var(--bg-light-grey)' }}>
      {/* Hero Section */}
      <section style={{ 
        background: 'linear-gradient(135deg, var(--primary-blue-dark) 0%, var(--primary-blue) 100%)', 
        color: 'white',
        padding: '5rem 0',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', filter: 'blur(40px)' }} />
        
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={fadeInUp}
            style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}
          >
            <h1 style={{ fontSize: '3rem', marginBottom: '1.5rem', fontWeight: 800 }}>Track Your Shipment</h1>
            <p style={{ fontSize: '1.2rem', opacity: 0.9, lineHeight: 1.6, marginBottom: '2.5rem' }}>
              Enter your AWB, Container Number, or Booking Reference to get real-time status updates on your cargo.
            </p>

            <form onSubmit={handleTrack} style={{ display: 'flex', maxWidth: '600px', margin: '0 auto', gap: '0.5rem', backgroundColor: 'white', padding: '0.5rem', borderRadius: '50px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
              <input 
                type="text" 
                placeholder="Enter tracking number (e.g. MMC-123456)" 
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                style={{ 
                  flex: 1, 
                  border: 'none', 
                  outline: 'none', 
                  padding: '1rem 1.5rem', 
                  fontSize: '1rem',
                  borderRadius: '50px',
                  color: 'var(--text-main)'
                }}
                required
              />
              <button 
                type="submit" 
                disabled={isSearching}
                style={{ 
                  backgroundColor: 'var(--primary-red)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '50px', 
                  padding: '0 2rem', 
                  fontSize: '1rem', 
                  fontWeight: 'bold',
                  cursor: isSearching ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background-color 0.3s ease'
                }}
              >
                {isSearching ? 'Searching...' : <>Track <Search size={18} /></>}
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Results Section */}
      <section className="section-padding" style={{ minHeight: '50vh' }}>
        <div className="container">
          <AnimatePresence mode="wait">
            {!trackingResult && !isSearching && (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: 'center', color: 'var(--text-light)', padding: '3rem 0' }}
              >
                <Search size={64} style={{ opacity: 0.2, margin: '0 auto 1.5rem', display: 'block' }} />
                <h3>Enter a tracking number above to see details</h3>
              </motion.div>
            )}

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
                <style>{`
                  @keyframes spin { 100% { transform: rotate(360deg); } }
                `}</style>
              </motion.div>
            )}

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
                  padding: '2rem', 
                  boxShadow: 'var(--shadow-md)',
                  marginBottom: '2rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #eee', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                    <div>
                      <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>Tracking Number</p>
                      <h2 style={{ color: 'var(--primary-blue)', margin: 0 }}>{trackingResult.id}</h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '0.5rem 1rem', 
                        backgroundColor: '#e8f4fd', 
                        color: 'var(--primary-blue)', 
                        borderRadius: '50px',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}>
                        {trackingResult.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                    <div>
                      <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>From</p>
                      <p style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={16} color="var(--primary-red)"/> {trackingResult.origin}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>To</p>
                      <p style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={16} color="var(--primary-blue)"/> {trackingResult.destination}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Estimated Delivery</p>
                      <p style={{ fontWeight: 600, color: 'var(--primary-red)' }}>{trackingResult.estimatedDelivery}</p>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '2.5rem', boxShadow: 'var(--shadow-md)' }}>
                  <h3 style={{ marginBottom: '2rem', color: 'var(--primary-blue)' }}>Tracking History</h3>
                  
                  <div style={{ position: 'relative' }}>
                    {/* Vertical Line */}
                    <div style={{ 
                      position: 'absolute', 
                      left: '20px', 
                      top: '20px', 
                      bottom: '20px', 
                      width: '2px', 
                      backgroundColor: '#eee',
                      zIndex: 1
                    }} />

                    {trackingResult.timeline.map((event, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        gap: '1.5rem',
                        marginBottom: index !== trackingResult.timeline.length - 1 ? '2.5rem' : 0,
                        position: 'relative',
                        zIndex: 2,
                        opacity: event.completed ? 1 : 0.5
                      }}>
                        {/* Icon */}
                        <div style={{ 
                          width: '42px', 
                          height: '42px', 
                          borderRadius: '50%', 
                          backgroundColor: event.completed ? 'var(--primary-blue)' : '#f0f0f0',
                          color: event.completed ? 'white' : 'var(--text-light)',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: event.completed ? '0 0 0 4px #e8f4fd' : '0 0 0 4px white'
                        }}>
                          {event.icon}
                        </div>
                        
                        {/* Details */}
                        <div style={{ paddingTop: '0.3rem' }}>
                          <h4 style={{ margin: '0 0 0.3rem 0', color: event.completed ? 'var(--text-main)' : 'var(--text-light)' }}>{event.status}</h4>
                          <p style={{ margin: '0 0 0.3rem 0', color: 'var(--text-light)', fontSize: '0.95rem' }}>{event.location}</p>
                          <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '0.85rem' }}>{event.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
};

export default TrackShipment;
