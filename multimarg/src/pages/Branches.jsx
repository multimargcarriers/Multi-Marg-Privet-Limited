import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Mail, User, ChevronDown } from 'lucide-react';

const BranchCard = ({ branch, bIdx, fadeInUp }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeInUp}
      transition={{ delay: (bIdx % 6) * 0.1 }}
      style={{ 
        backgroundColor: 'white', 
        padding: '2.5rem', 
        borderRadius: '16px', 
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
        border: '1px solid #e2e8f0',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
      whileHover={{ y: -8, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: branch.code === 'HO' ? 'var(--primary-red)' : 'var(--primary-blue)' }}></div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.5rem', color: '#0f172a', margin: '0 0 0.25rem 0', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{branch.branch}</h3>
          {branch.code && <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>CODE: {branch.code}</span>}
        </div>
        <span style={{ 
          fontSize: '0.75rem', 
          padding: '0.35rem 0.85rem', 
          backgroundColor: branch.code === 'HO' ? '#fee2e2' : '#e0e7ff',
          color: branch.code === 'HO' ? '#991b1b' : '#3730a3',
          borderRadius: '20px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          flexShrink: 0
        }}>
          {branch.code === 'HO' ? 'CORPORATE' : 'BRANCH'}
        </span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem', flexGrow: 1 }}>
        {branch.address && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', color: '#334155' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '8px', color: 'var(--primary-red)' }}>
              <MapPin size={18} />
            </div>
            <span style={{ lineHeight: 1.6, fontSize: '0.95rem' }}>{branch.address}</span>
          </div>
        )}
        
        {branch.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#334155' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '8px', color: 'var(--primary-red)' }}>
              <Mail size={18} />
            </div>
            <a href={`mailto:${branch.email}`} style={{ color: 'inherit', textDecoration: 'none', fontSize: '0.95rem' }}>{branch.email}</a>
          </div>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflow: 'hidden' }}
            >
              <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '0.5rem 0' }}></div>
              
              {branch.name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#334155' }}>
                  <div style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '8px', color: 'var(--primary-red)' }}>
                    <User size={18} />
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>Contact Person</span>
                    <span style={{ fontWeight: '600', fontSize: '0.95rem', textTransform: 'uppercase' }}>{branch.name}</span>
                  </div>
                </div>
              )}

              {branch.phno && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#334155' }}>
                  <div style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '8px', color: 'var(--primary-red)' }}>
                    <Phone size={18} />
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>Phone Number</span>
                    <a href={`tel:${branch.phno.replace(/[^0-9+]/g, '')}`} style={{ color: 'inherit', textDecoration: 'none', fontSize: '1rem', fontWeight: '600' }}>{branch.phno}</a>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
          {(branch.name || branch.phno) && (
            <button 
              onClick={() => setExpanded(!expanded)}
              style={{ 
                background: 'var(--bg-light-grey)', 
                border: '1px solid #e2e8f0', 
                color: 'var(--primary-blue)', 
                fontWeight: '600', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center', 
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                width: '100%',
                borderRadius: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-red)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--primary-red)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-light-grey)'; e.currentTarget.style.color = 'var(--primary-blue)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              {expanded ? 'HIDE DETAILS' : 'VIEW DETAILS'}
              <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.3 }} style={{ display: 'flex' }}>
                <ChevronDown size={16} />
              </motion.div>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const Branches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/public/branch`);
        if (response.data.success) {
          setBranches(response.data.data);
        } else {
          setError(response.data.message || 'Failed to load branches');
        }
      } catch (err) {
        console.error("Error fetching branches:", err);
        setError("Unable to connect to the server. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, []);

  return (
    <div style={{ paddingTop: '80px' }}>
      <section style={{ 
        backgroundColor: 'var(--primary-blue)', 
        color: 'white',
        padding: '5rem 0',
        position: 'relative'
      }}>
        {/* Subtle map background */}
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          opacity: 0.5
        }} />
        
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <motion.div initial="hidden" animate="visible" variants={fadeInUp} style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 800 }}>Our Pan-India Network</h1>
            <p style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', opacity: 0.9 }}>
              Strategic locations across the nation to ensure your cargo reaches its destination efficiently.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding" style={{ backgroundColor: 'var(--bg-color)', minHeight: '50vh' }}>
        <div className="container">
          
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
              <div style={{ width: '40px', height: '40px', border: '4px solid #f3f4f6', borderTop: '4px solid var(--primary-red)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              `}</style>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #fca5a5' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Oops!</h3>
              <p>{error}</p>
            </div>
          ) : branches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: '12px', color: '#64748b', border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', color: '#334155' }}>No Branches Found</h3>
              <p>We are currently updating our network data. Please check back later.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
              {branches.map((branch, bIdx) => (
                <BranchCard key={branch.id || bIdx} branch={branch} bIdx={bIdx} fadeInUp={fadeInUp} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Branches;
