import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, ArrowRight, CheckCircle2, X } from 'lucide-react';
import axios from 'axios';

const ApplyModal = ({ isOpen, onClose, job }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    coverLetter: ''
  });
  const [resume, setResume] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setResume(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('coverLetter', formData.coverLetter);
      if (job?.id) data.append('jobId', job.id);
      data.append('jobTitle', job?.title || 'General Application');
      if (resume) data.append('resume', resume);

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/public/applications`, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          onClose();
          setSubmitStatus(null);
          setFormData({ name: '', email: '', phone: '', coverLetter: '' });
          setResume(null);
        }, 3000);
      } else {
        setSubmitStatus('error');
      }
    } catch (err) {
      console.error("Error submitting application:", err);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative'
        }}
      >
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '1.5rem', right: '1.5rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-light)'
          }}
        >
          <X size={24} />
        </button>
        
        <div style={{ padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>
            Apply for {job?.title || 'a Position'}
          </h2>
          <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
            Fill out the form below to submit your application.
          </p>

          {submitStatus === 'success' ? (
            <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <CheckCircle2 size={48} style={{ margin: '0 auto 1rem', display: 'block' }} />
              <h3 style={{ marginBottom: '0.5rem' }}>Application Submitted!</h3>
              <p>Thank you for applying. Our team will review your application and get back to you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-main)' }}>Full Name *</label>
                <input 
                  type="text" 
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }} 
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-main)' }}>Email Address *</label>
                  <input 
                    type="email" 
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-main)' }}>Phone Number *</label>
                  <input 
                    type="tel" 
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-main)' }}>Cover Letter</label>
                <textarea 
                  name="coverLetter"
                  rows="4"
                  value={formData.coverLetter}
                  onChange={handleInputChange}
                  placeholder="Tell us why you're a great fit for this role..."
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', resize: 'vertical' }} 
                ></textarea>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-main)' }}>Resume/CV (PDF, DOCX) *</label>
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx"
                  required
                  onChange={handleFileChange}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px dashed #bbb', backgroundColor: '#f9f9f9', cursor: 'pointer' }} 
                />
              </div>

              {submitStatus === 'error' && (
                <div style={{ color: 'red', fontSize: '0.9rem' }}>
                  There was an error submitting your application. Please try again.
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting}
                style={{
                  backgroundColor: 'var(--primary-red)',
                  color: 'white',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  marginTop: '1rem'
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const JobCard = ({ job, onApply }) => {
  return (
    <motion.div 
      whileHover={{ y: -5, boxShadow: 'var(--shadow-lg)' }}
      style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '2rem',
        boxShadow: 'var(--shadow-md)',
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <span style={{ 
          backgroundColor: '#e8f4fd', 
          color: 'var(--primary-blue)', 
          padding: '0.4rem 0.8rem', 
          borderRadius: '50px',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'inline-block',
          marginBottom: '1rem'
        }}>
          {job.department || 'General'}
        </span>
        <h3 style={{ fontSize: '1.4rem', color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>{job.title}</h3>
      </div>
      
      <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-light)', fontSize: '0.95rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <MapPin size={16} /> {job.location || 'Remote'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={16} /> {job.type || 'Full-time'}
        </div>
      </div>

      <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {job.description}
      </p>
      
      <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
        <button 
          onClick={() => onApply(job)}
          style={{ 
            backgroundColor: 'transparent', 
            color: 'var(--primary-red)', 
            border: 'none', 
            fontWeight: 'bold', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: 0,
            fontSize: '1rem'
          }}
        >
          Apply Now <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  );
};

const Careers = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/public/cms/careers`);
        if (res.data.success) {
          setJobs(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching careers:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const handleApplyClick = (job) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const benefits = [
    "Competitive Salary & Bonuses",
    "Comprehensive Health Insurance",
    "Provident Fund (PF) Contributions",
    "Paid Time Off & Holidays",
    "Professional Development Programs",
    "Employee Safety First Culture"
  ];

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', backgroundColor: 'var(--bg-light-grey)' }}>
      <AnimatePresence>
        {isModalOpen && (
          <ApplyModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            job={selectedJob} 
          />
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section style={{ 
        background: 'linear-gradient(135deg, var(--primary-blue-dark) 0%, var(--primary-blue) 100%)', 
        color: 'white',
        padding: '6rem 0',
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
            <span style={{ 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              padding: '0.5rem 1rem', 
              borderRadius: '50px', 
              fontSize: '0.9rem', 
              textTransform: 'uppercase', 
              letterSpacing: '1px',
              marginBottom: '1.5rem',
              display: 'inline-block'
            }}>Join Our Team</span>
            <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', fontWeight: 800 }}>Drive Your Career Forward</h1>
            <p style={{ fontSize: '1.25rem', opacity: 0.9, lineHeight: 1.6 }}>
              At Multimarg Carriers, we are always looking for passionate, driven individuals to join our mission of transforming the logistics landscape.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why Join Us Section */}
      <section className="section-padding">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center' }}>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
            >
              <h2 style={{ fontSize: '2.5rem', color: 'var(--primary-blue)', marginBottom: '1.5rem' }}>Why work with us?</h2>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-light)', marginBottom: '2rem', lineHeight: 1.8 }}>
                We believe that our people are our greatest asset. When you join Multimarg Carriers, you are joining a family that values innovation, dedication, and safety. We offer a dynamic work environment where you can grow your skills and make a real impact in global supply chains.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {benefits.map((benefit, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <CheckCircle2 color="var(--primary-red)" size={20} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                    <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{benefit}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
            >
              <div style={{ position: 'relative' }}>
                <img 
                  src="https://images.unsplash.com/photo-1587293852726-70cdb56c2866?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="Team working in warehouse" 
                  style={{ width: '100%', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', position: 'relative', zIndex: 2 }}
                />
                <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', width: '100%', height: '100%', border: '4px solid var(--primary-blue)', borderRadius: '12px', zIndex: 1 }} />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="section-padding" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="container">
          <div className="section-title">
            <h2>Open Positions</h2>
            <p>Explore our current openings and find where you belong.</p>
          </div>

          {loading ? (
             <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-light)' }}>
                Loading positions...
             </div>
          ) : jobs.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-light)' }}>
                There are no open positions at the moment. Please check back later.
             </div>
          ) : (
            <motion.div 
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem', marginTop: '3rem' }}
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
            >
              {jobs.map((job) => (
                <motion.div key={job.id} variants={fadeInUp}>
                  <JobCard job={job} onApply={handleApplyClick} />
                </motion.div>
              ))}
            </motion.div>
          )}
          
          <div style={{ textAlign: 'center', marginTop: '4rem' }}>
            <p style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>Don't see a role that fits?</p>
            <button 
              onClick={() => handleApplyClick(null)}
              style={{ 
                display: 'inline-block',
                backgroundColor: 'white', 
                color: 'var(--primary-blue)', 
                border: '2px solid var(--primary-blue)', 
                padding: '0.8rem 2rem', 
                borderRadius: '50px', 
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                textDecoration: 'none'
              }}
            >
              Send us your Resume
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Careers;
