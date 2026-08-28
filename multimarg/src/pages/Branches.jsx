import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Mail, User, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import SEOHead from '../components/SEOHead';

const Branches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

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

  // Reset to first page on search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Sort branches numerically: mcpl1, mcpl2, mcpl3... first ("show 1st number earlier 1st")
  const sortedBranches = [...branches].sort((a, b) => {
    const aNum = parseInt(String(a.code || "").replace(/\D/g, ""), 10) || 0;
    const bNum = parseInt(String(b.code || "").replace(/\D/g, ""), 10) || 0;
    return aNum - bNum;
  });

  // Filter based on search query
  const filteredBranches = sortedBranches.filter(b => {
    const term = searchTerm.toLowerCase();
    return (
      (b.branch || '').toLowerCase().includes(term) ||
      (b.code || '').toLowerCase().includes(term) ||
      (b.address || '').toLowerCase().includes(term) ||
      (b.name || '').toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredBranches.length / itemsPerPage);
  const paginatedBranches = filteredBranches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div style={{ paddingTop: '80px' }}>
      <SEOHead
        title="Our Branches — Pan-India Branch Network & Logistics Offices"
        description="Locate Multimarg Carriers branch offices and hubs across India. Connect with our local logistics teams for seamless transport, booking, and support."
        keywords="multimarg branches, logistics offices india, transport branches, rudrapur logistics hub, pan india branch network, freight booking office"
        canonicalPath="/branches"
      />
      
      {/* Banner Section */}
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
              Locate any of our branches instantly. Filter by city, code, or address using our dynamic branch finder.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Table Finder Section */}
      <section className="section-padding" style={{ backgroundColor: 'var(--bg-light-grey)', minHeight: '60vh' }}>
        <div className="container">
          
          {/* Dynamic Search & Stats Header */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {/* Search Input Box */}
            <div style={{ 
              position: 'relative', 
              flex: '1 1 350px',
              maxWidth: '500px'
            }}>
              <Search 
                size={20} 
                color="#64748b" 
                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} 
              />
              <input
                type="text"
                placeholder="Search branches by city, code, manager, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  borderRadius: '30px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  outline: 'none',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'white'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary-red)';
                  e.target.style.boxShadow = '0 10px 15px -3px rgba(239, 68, 68, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                }}
              />
            </div>

            {/* Branch Count Pill */}
            {!loading && !error && (
              <div style={{
                backgroundColor: 'white',
                padding: '0.6rem 1.2rem',
                borderRadius: '30px',
                border: '1px solid #e2e8f0',
                boxShadow: 'var(--shadow-sm)',
                fontWeight: '600',
                fontSize: '0.95rem',
                color: 'var(--primary-blue)'
              }}>
                Showing <span style={{ color: 'var(--primary-red)' }}>{filteredBranches.length}</span> of {branches.length} Branches
              </div>
            )}
          </div>

          {/* Table Container */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
              <div style={{ width: '50px', height: '50px', border: '5px solid #e2e8f0', borderTop: '5px solid var(--primary-red)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              `}</style>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: '#fee2e2', borderRadius: '16px', color: '#991b1b', border: '1px solid #fca5a5' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '800' }}>Network Error</h3>
              <p>{error}</p>
            </div>
          ) : filteredBranches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'white', borderRadius: '16px', color: '#64748b', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-md)' }}>
              <Search size={48} color="#94a3b8" style={{ marginBottom: '1.5rem' }} />
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', color: '#334155', fontWeight: '700' }}>No Match Found</h3>
              <p>We couldn't find any branches matching "{searchTerm}". Try checking your spelling or search terms.</p>
            </div>
          ) : (
            <div>
              {/* Responsive Table Wrapper */}
              <div style={{
                width: '100%',
                overflowX: 'auto',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                backgroundColor: 'white'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '0.95rem'
                }}>
                  <thead>
                    <tr style={{
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #e2e8f0'
                    }}>
                      <th style={{ padding: '1.25rem 1.5rem', fontWeight: '700', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Code</th>
                      <th style={{ padding: '1.25rem 1.5rem', fontWeight: '700', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Branch / City</th>
                      <th style={{ padding: '1.25rem 1.5rem', fontWeight: '700', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Address</th>
                      <th style={{ padding: '1.25rem 1.5rem', fontWeight: '700', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Person</th>
                      <th style={{ padding: '1.25rem 1.5rem', fontWeight: '700', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Contact Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {paginatedBranches.map((branch, index) => (
                        <motion.tr
                          key={branch.id || index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc',
                            transition: 'background-color 0.2s ease',
                          }}
                          className="table-row-hover"
                        >
                          {/* Code Badge Column */}
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.35rem 0.75rem',
                              backgroundColor: (branch.code || '').toUpperCase() === 'HO' ? '#fee2e2' : '#f0fdf4',
                              color: (branch.code || '').toUpperCase() === 'HO' ? '#991b1b' : '#15803d',
                              borderRadius: '20px',
                              fontWeight: '700',
                              fontSize: '0.8rem',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase'
                            }}>
                              {(branch.code || '').toUpperCase()}
                            </span>
                          </td>

                          {/* Branch City Column */}
                          <td style={{ padding: '1.25rem 1.5rem', fontWeight: '700', color: 'var(--primary-blue)' }}>
                            {(branch.branch || '').toUpperCase()}
                          </td>

                          {/* Address Column */}
                          <td style={{ padding: '1.25rem 1.5rem', color: '#475569', lineHeight: '1.5', maxWidth: '350px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                              <MapPin size={16} color="var(--primary-red)" style={{ marginTop: '3px', flexShrink: 0 }} />
                              <span>{(branch.address || '').toUpperCase()}</span>
                            </div>
                          </td>

                          {/* Contact Person Column */}
                          <td style={{ padding: '1.25rem 1.5rem', color: '#0f172a', fontWeight: '500' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <User size={16} color="var(--primary-blue)" style={{ flexShrink: 0 }} />
                              <span>{(branch.name || 'Branch Manager').toUpperCase()}</span>
                            </div>
                          </td>

                          {/* Action Links Column */}
                          <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                              {branch.phno && (
                                <a href={`tel:${branch.phno.replace(/[^0-9+]/g, '')}`} style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                  color: 'var(--primary-blue)',
                                  textDecoration: 'none',
                                  fontWeight: '600',
                                  fontSize: '0.9rem',
                                  transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-red)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--primary-blue)'}
                                >
                                  <Phone size={14} /> {branch.phno}
                                </a>
                              )}
                              {branch.email && (
                                <a href={`mailto:${(branch.email || '').toLowerCase()}`} style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                  color: '#64748b',
                                  textDecoration: 'none',
                                  fontSize: '0.85rem',
                                  transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-red)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                                >
                                  <Mail size={14} /> {(branch.email || '').toLowerCase()}
                                </a>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Dynamic Pagination Controls */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '1rem',
                  marginTop: '2rem'
                }}>
                  {/* Previous Button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.6rem',
                      borderRadius: '50%',
                      border: '1px solid #e2e8f0',
                      backgroundColor: currentPage === 1 ? '#f1f5f9' : 'white',
                      color: currentPage === 1 ? '#94a3b8' : 'var(--primary-blue)',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <ChevronLeft size={20} />
                  </button>

                  {/* Page Indicator */}
                  <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#475569' }}>
                    Page <span style={{ color: 'var(--primary-red)' }}>{currentPage}</span> of {totalPages}
                  </span>

                  {/* Next Button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.6rem',
                      borderRadius: '50%',
                      border: '1px solid #e2e8f0',
                      backgroundColor: currentPage === totalPages ? '#f1f5f9' : 'white',
                      color: currentPage === totalPages ? '#94a3b8' : 'var(--primary-blue)',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <style>{`
        .table-row-hover:hover {
          background-color: #f1f5f9 !important;
        }
      `}</style>
    </div>
  );
};

export default Branches;
