import React from 'react';
import { motion } from 'framer-motion';
import { Truck, ShieldCheck, Globe, Map, Package, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Hero Section */}
      <section className="gradient-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: '80px', color: 'white' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center' }}>
          
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '50px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: '500', letterSpacing: '1px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
              DELIVERING EXCELLENCE ACROSS INDIA
            </div>
            <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', lineHeight: '1.1', color: 'white' }}>
              Your Trusted <br/>
              <span className="gradient-text">Logistics Partner</span>
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', marginBottom: '2.5rem', maxWidth: '500px', lineHeight: '1.7' }}>
              Fast, reliable, and secure cargo solutions. Multimarg Carriers connects your business to the world with seamless road, train, and air logistics.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/contact" className="btn btn-primary" style={{ padding: '0.9rem 2rem', fontSize: '1.1rem' }}>
                Get a Quote <ArrowRight size={20} />
              </Link>
              <Link to="/services" className="btn btn-outline" style={{ padding: '0.9rem 2rem', fontSize: '1.1rem', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                Our Services
              </Link>
            </div>
          </motion.div>

          {/* Hero Tracking Card */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="glass-dark"
            style={{ padding: '2.5rem', borderRadius: '16px' }}
          >
            <h3 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '1.5rem' }}>Track Your Shipment</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '2rem' }}>
              Enter your LR Number or Booking ID to instantly track the status of your cargo.
            </p>
            
            <form onSubmit={(e) => { e.preventDefault(); alert("Tracking feature coming soon!"); }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>LR Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. 205096"
                  style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none', fontSize: '1rem' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Track Now
              </button>
            </form>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                <h4 style={{ color: 'white', fontSize: '1.5rem', margin: 0 }}>4+</h4>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: 0 }}>Major Branches</p>
              </div>
              <div>
                <h4 style={{ color: 'white', fontSize: '1.5rem', margin: 0 }}>200+</h4>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: 0 }}>Clients Served</p>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Services Overview */}
      <section className="section-padding" style={{ background: '#f8fafc' }}>
        <div className="container">
          <div className="section-title">
            <h2 style={{ color: '#0f172a' }}>Comprehensive Logistics Solutions</h2>
            <p>We provide tailored transportation services to meet the complex demands of modern supply chains.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <motion.div whileHover={{ y: -5 }} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(79, 70, 229, 0.1)', padding: '1rem', borderRadius: '12px', width: 'max-content', color: 'var(--primary-color)' }}>
                <Truck size={32} />
              </div>
              <h3 style={{ fontSize: '1.3rem' }}>Road Logistics</h3>
              <p style={{ color: 'var(--text-light)' }}>Full Truck Load (FTL) and Part Truck Load (PTL) services across our vast network with real-time tracking.</p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '1rem', borderRadius: '12px', width: 'max-content', color: 'var(--accent-color)' }}>
                <Map size={32} />
              </div>
              <h3 style={{ fontSize: '1.3rem' }}>Train Cargo</h3>
              <p style={{ color: 'var(--text-light)' }}>Cost-effective and highly secure rail transport for bulk goods with guaranteed transit times.</p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '12px', width: 'max-content', color: '#10b981' }}>
                <Globe size={32} />
              </div>
              <h3 style={{ fontSize: '1.3rem' }}>Air Freight</h3>
              <p style={{ color: 'var(--text-light)' }}>Time-critical cargo deliveries leveraging our premium airline partnerships for immediate dispatch.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-padding">
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: '#0f172a' }}>Why Businesses Trust Multimarg</h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-light)', marginBottom: '2rem', lineHeight: '1.8' }}>
              With years of operational excellence, we ensure your supply chain never stops. Our extensive network and dedicated fleet guarantee that your shipments are handled with precision.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <ShieldCheck size={24} color="var(--primary-color)" style={{ marginTop: '4px' }} />
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>100% Safe & Secure</h4>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>End-to-end insurance and rigorous safety protocols for all cargo.</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <Clock size={24} color="var(--primary-color)" style={{ marginTop: '4px' }} />
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>On-Time Delivery</h4>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>Optimized routing ensures we meet strict delivery deadlines.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <Package size={24} color="var(--primary-color)" style={{ marginTop: '4px' }} />
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Modern Infrastructure</h4>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>Digital PODs, automated billing, and a state-of-the-art tracking dashboard.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ position: 'relative' }}>
            <div style={{ width: '100%', height: '500px', borderRadius: '24px', background: 'linear-gradient(45deg, #f1f5f9, #e2e8f0)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               {/* This is a placeholder for a real image, but we'll make it look like a stylized graphic */}
               <Truck size={150} color="#cbd5e1" />
            </div>
            {/* Floating badge */}
            <motion.div 
              animate={{ y: [0, -10, 0] }} 
              transition={{ repeat: Infinity, duration: 3 }}
              style={{ position: 'absolute', bottom: '-20px', left: '-20px', background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: '1rem' }}
            >
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '50%', color: '#10b981' }}>
                <Globe size={28} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.2rem' }}>Nationwide</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)' }}>Coverage Area</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ margin: '4rem 2rem', position: 'relative' }}>
        <div className="container gradient-bg" style={{ borderRadius: '24px', padding: '4rem 2rem', textAlign: 'center', color: 'white' }}>
          <h2 style={{ color: 'white', fontSize: '2.5rem', marginBottom: '1.5rem' }}>Ready to optimize your logistics?</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem auto' }}>
            Get in touch with our supply chain experts today to get a customized quote for your transportation needs.
          </p>
          <Link to="/contact" className="btn btn-white" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
            Contact Us Today
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
