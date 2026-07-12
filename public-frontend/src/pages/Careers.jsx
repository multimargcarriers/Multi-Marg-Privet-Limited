import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

const JobCard = ({ title, location, type, department }) => {
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
          {department}
        </span>
        <h3 style={{ fontSize: '1.4rem', color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>{title}</h3>
      </div>
      
      <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-light)', fontSize: '0.95rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <MapPin size={16} /> {location}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={16} /> {type}
        </div>
      </div>
      
      <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
        <button style={{ 
          backgroundColor: 'transparent', 
          color: 'var(--primary-red)', 
          border: 'none', 
          fontWeight: 'bold', 
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: 0
        }}>
          Apply Now <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  );
};

const Careers = () => {
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

  const jobs = [
    { title: 'Senior Logistics Coordinator', location: 'Mumbai, India', type: 'Full-time', department: 'Operations' },
    { title: 'Customs Brokerage Specialist', location: 'Delhi, India', type: 'Full-time', department: 'Compliance' },
    { title: 'Heavy Duty Truck Driver', location: 'Multiple Locations', type: 'Full-time', department: 'Fleet' },
    { title: 'Warehouse Supervisor', location: 'Pune, India', type: 'Full-time', department: 'Warehousing' },
    { title: 'Supply Chain Analyst', location: 'Remote / Mumbai', type: 'Full-time', department: 'Analytics' },
    { title: 'Sales Executive - Freight', location: 'Chennai, India', type: 'Full-time', department: 'Sales' },
  ];

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

          <motion.div 
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem', marginTop: '3rem' }}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {jobs.map((job, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <JobCard {...job} />
              </motion.div>
            ))}
          </motion.div>
          
          <div style={{ textAlign: 'center', marginTop: '4rem' }}>
            <p style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>Don't see a role that fits?</p>
            <button style={{ 
              backgroundColor: 'white', 
              color: 'var(--primary-blue)', 
              border: '2px solid var(--primary-blue)', 
              padding: '0.8rem 2rem', 
              borderRadius: '50px', 
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}>
              Send us your Resume
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Careers;
