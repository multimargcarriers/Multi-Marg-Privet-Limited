import React, { useState } from 'react';
import { Truck, MapPin, Package, Globe, ShieldCheck, Clock, Search, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  const [activeTab, setActiveTab] = useState('track');

  return (
    <div>
      {/* Floating Side Action Buttons */}
      <div className="floating-side-nav">
        <button className="floating-btn bg-green">Enquire Now</button>
        <button className="floating-btn bg-red">Pickup Request</button>
      </div>

      {/* Hero Section */}
      <section style={{ 
        position: 'relative', 
        minHeight: '85vh', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: '4rem',
        paddingBottom: '8rem',
        overflow: 'hidden'
      }}>
        {/* HTML5 Video Background */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: -2
          }}
        >
          {/* Using a placeholder logistics video URL. You can replace this src with your own generated MP4 file later! */}
          <source src="https://cdn.pixabay.com/video/2020/05/24/40061-424856424_large.mp4" type="video/mp4" />
        </video>
        
        {/* Dark overlay to make text readable */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 31, 57, 0.65)',
          zIndex: -1
        }}></div>
        
        <div className="container" style={{ textAlign: 'center', color: 'white', zIndex: 1 }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '500', marginBottom: '1rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Empowering Your Supply Chain
          </h2>
          <h1 style={{ fontSize: '4.5rem', fontWeight: '900', marginBottom: '2rem', lineHeight: '1.1' }}>
            NATIONWIDE LOGISTICS
          </h1>
          <p style={{ fontSize: '1.25rem', maxWidth: '800px', margin: '0 auto', opacity: 0.9 }}>
            Experience seamless transportation, secure warehousing, and real-time tracking with Multimarg Carriers. We deliver excellence across every route.
          </p>
        </div>

        {/* Tracking Widget - Overlapping bottom of Hero */}
        <div style={{ position: 'absolute', bottom: '-40px', left: 0, right: 0, zIndex: 10 }}>
          <div className="container" style={{ maxWidth: '1000px' }}>
            <div style={{ background: 'white', borderRadius: '4px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
              
              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: '#f9f9f9' }}>
                <button 
                  onClick={() => setActiveTab('track')}
                  style={{ flex: 1, padding: '1.25rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none', background: activeTab === 'track' ? 'white' : 'transparent', borderTop: activeTab === 'track' ? '3px solid var(--primary-red)' : '3px solid transparent', color: activeTab === 'track' ? 'var(--primary-red)' : 'var(--text-light)', fontWeight: activeTab === 'track' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <Search size={18} /> Track Shipment
                </button>
                <button 
                  onClick={() => setActiveTab('branch')}
                  style={{ flex: 1, padding: '1.25rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none', background: activeTab === 'branch' ? 'white' : 'transparent', borderTop: activeTab === 'branch' ? '3px solid var(--primary-red)' : '3px solid transparent', color: activeTab === 'branch' ? 'var(--primary-red)' : 'var(--text-light)', fontWeight: activeTab === 'branch' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <MapPin size={18} /> Branch Locator
                </button>
                <button 
                  onClick={() => setActiveTab('pickup')}
                  style={{ flex: 1, padding: '1.25rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none', background: activeTab === 'pickup' ? 'white' : 'transparent', borderTop: activeTab === 'pickup' ? '3px solid var(--primary-red)' : '3px solid transparent', color: activeTab === 'pickup' ? 'var(--primary-red)' : 'var(--text-light)', fontWeight: activeTab === 'pickup' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <Truck size={18} /> Pickup Request
                </button>
                <button 
                  onClick={() => setActiveTab('pincode')}
                  style={{ flex: 1, padding: '1.25rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none', background: activeTab === 'pincode' ? 'white' : 'transparent', borderTop: activeTab === 'pincode' ? '3px solid var(--primary-red)' : '3px solid transparent', color: activeTab === 'pincode' ? 'var(--primary-red)' : 'var(--text-light)', fontWeight: activeTab === 'pincode' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <Navigation size={18} /> Serviceable Pincode
                </button>
              </div>

              {/* Tab Content */}
              <div style={{ padding: '2rem' }}>
                {activeTab === 'track' && (
                  <form style={{ display: 'flex', gap: '1rem' }} onSubmit={(e) => e.preventDefault()}>
                    <select style={{ padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', width: '200px' }}>
                      <option>LR Number</option>
                      <option>Reference No.</option>
                      <option>E-Way Bill No.</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="Enter Number Here..."
                      style={{ flex: 1, padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none' }}
                    />
                    <button type="submit" className="btn btn-red" style={{ padding: '0 2rem' }}>Track</button>
                  </form>
                )}
                {activeTab === 'branch' && (
                  <form style={{ display: 'flex', gap: '1rem' }} onSubmit={(e) => e.preventDefault()}>
                     <select style={{ flex: 1, padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none' }}>
                      <option>Select State</option>
                      <option>Maharashtra</option>
                      <option>Delhi</option>
                      <option>Uttarakhand</option>
                    </select>
                    <select style={{ flex: 1, padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none' }}>
                      <option>Select City</option>
                    </select>
                    <button type="submit" className="btn btn-red" style={{ padding: '0 2rem' }}>Search</button>
                  </form>
                )}
                {activeTab === 'pickup' && (
                  <div style={{ textAlign: 'center', color: 'var(--text-light)' }}>Pickup Request form functionality coming soon.</div>
                )}
                {activeTab === 'pincode' && (
                   <form style={{ display: 'flex', gap: '1rem' }} onSubmit={(e) => e.preventDefault()}>
                    <input 
                      type="text" 
                      placeholder="Enter 6-digit Pincode"
                      style={{ flex: 1, padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none' }}
                    />
                    <button type="submit" className="btn btn-red" style={{ padding: '0 2rem' }}>Check Availability</button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* spacer for the overlapping widget */}
      <div style={{ height: '80px', background: 'var(--bg-light-grey)' }}></div>

      {/* What We Offer / Services */}
      <section className="section-padding" style={{ background: 'var(--bg-light-grey)' }}>
        <div className="container">
          <div className="section-title">
            <h2>What We Offer</h2>
            <p>Comprehensive logistics solutions tailored to meet the dynamic demands of modern businesses.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* Card 1 */}
            <div style={{ background: 'white', padding: '3rem 2rem', textAlign: 'center', borderBottom: '4px solid transparent', transition: 'all 0.3s', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
                 onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = 'var(--primary-red)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                 onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Truck size={48} color="var(--primary-blue)" style={{ margin: '0 auto 1.5rem auto' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Road Logistics (FTL / PTL)</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>High-volume and flexible cargo transport options connecting every corner of the country.</p>
              <Link to="/services" style={{ color: 'var(--primary-red)', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                Read More <span>&rarr;</span>
              </Link>
            </div>

            {/* Card 2 */}
            <div style={{ background: 'white', padding: '3rem 2rem', textAlign: 'center', borderBottom: '4px solid transparent', transition: 'all 0.3s', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
                 onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = 'var(--primary-red)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                 onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Globe size={48} color="var(--primary-blue)" style={{ margin: '0 auto 1.5rem auto' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Train & Air Cargo</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Cost-effective rail and time-critical air freight leveraging our premium partnerships.</p>
              <Link to="/services" style={{ color: 'var(--primary-red)', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                Read More <span>&rarr;</span>
              </Link>
            </div>

            {/* Card 3 */}
            <div style={{ background: 'white', padding: '3rem 2rem', textAlign: 'center', borderBottom: '4px solid transparent', transition: 'all 0.3s', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
                 onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = 'var(--primary-red)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                 onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Package size={48} color="var(--primary-blue)" style={{ margin: '0 auto 1.5rem auto' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Warehousing</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>State-of-the-art secure facilities with inventory management and distribution support.</p>
              <Link to="/services" style={{ color: 'var(--primary-red)', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                Read More <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-padding">
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: 'var(--primary-blue)' }}>Why Businesses Trust Multimarg</h2>
            <div style={{ width: '60px', height: '3px', background: 'var(--primary-red)', marginBottom: '2rem' }}></div>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-light)', marginBottom: '2rem', lineHeight: '1.8' }}>
              With operational excellence and a dedicated fleet, we ensure your supply chain never stops. Our extensive network guarantees that your shipments are handled with absolute precision.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <ShieldCheck size={32} color="var(--primary-red)" />
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>100% Safe</h4>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Secure handling and strict protocols.</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <Clock size={32} color="var(--primary-red)" />
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>On-Time</h4>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Optimized routing for swift deliveries.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <img 
              src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
              alt="Logistics Operations" 
              style={{ width: '100%', borderRadius: '4px', boxShadow: 'var(--shadow-lg)' }}
            />
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
