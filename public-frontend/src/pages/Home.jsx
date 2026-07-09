import React, { useState } from 'react';
import { Truck, MapPin, Package, Globe, ShieldCheck, Clock, Search, Navigation, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  const [activeTab, setActiveTab] = useState('track');

  return (
    <div>
      {/* Hero Section */}
      <section style={{ 
        position: 'relative', 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center',
        paddingTop: '80px',
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
          <source src="/i_dont_want_logo_gemini_i_want.mp4" type="video/mp4" />
        </video>
        
        {/* Dark overlay to make text readable */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(30, 58, 138, 0.7)', /* Royal Blue Overlay */
          zIndex: -1
        }}></div>
        
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '4rem', alignItems: 'center', zIndex: 1, width: '100%' }}>
          
          {/* Left Text */}
          <div style={{ color: 'white' }}>
            <div style={{ display: 'inline-block', padding: '0.4rem 1rem', background: 'rgba(234, 88, 12, 0.2)', border: '1px solid var(--primary-red)', borderRadius: '50px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px', color: '#ffedd5' }}>
              Optimizing Supply Chains
            </div>
            <h1 style={{ fontSize: '4rem', fontWeight: '900', marginBottom: '1.5rem', lineHeight: '1.1', textTransform: 'uppercase' }}>
              Nationwide <br/> <span style={{ color: 'var(--primary-red)' }}>Logistics</span>
            </h1>
            <p style={{ fontSize: '1.15rem', marginBottom: '2.5rem', opacity: 0.9, lineHeight: '1.7', maxWidth: '500px' }}>
              Experience seamless transportation, secure warehousing, and real-time tracking. Multimarg Carriers delivers operational excellence across every route in India.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link to="/about" className="btn btn-red" style={{ padding: '1rem 2rem' }}>
                Discover More
              </Link>
              <Link to="/contact" className="btn" style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '1rem 2rem' }}>
                Get a Quote
              </Link>
            </div>
          </div>

          {/* Right Tracking Widget */}
          <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <div style={{ background: 'var(--bg-light-grey)', display: 'flex' }}>
              <button 
                onClick={() => setActiveTab('track')}
                style={{ flex: 1, padding: '1.25rem 0', border: 'none', background: activeTab === 'track' ? 'white' : 'transparent', borderTop: activeTab === 'track' ? '4px solid var(--primary-blue)' : '4px solid transparent', color: activeTab === 'track' ? 'var(--primary-blue)' : 'var(--text-light)', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
              >
                <Search size={20} /> <span style={{ fontSize: '0.85rem' }}>Track</span>
              </button>
              <button 
                onClick={() => setActiveTab('branch')}
                style={{ flex: 1, padding: '1.25rem 0', border: 'none', background: activeTab === 'branch' ? 'white' : 'transparent', borderTop: activeTab === 'branch' ? '4px solid var(--primary-blue)' : '4px solid transparent', color: activeTab === 'branch' ? 'var(--primary-blue)' : 'var(--text-light)', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
              >
                <MapPin size={20} /> <span style={{ fontSize: '0.85rem' }}>Branch</span>
              </button>
              <button 
                onClick={() => setActiveTab('pincode')}
                style={{ flex: 1, padding: '1.25rem 0', border: 'none', background: activeTab === 'pincode' ? 'white' : 'transparent', borderTop: activeTab === 'pincode' ? '4px solid var(--primary-blue)' : '4px solid transparent', color: activeTab === 'pincode' ? 'var(--primary-blue)' : 'var(--text-light)', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
              >
                <Navigation size={20} /> <span style={{ fontSize: '0.85rem' }}>Pincode</span>
              </button>
            </div>

            <div style={{ padding: '2.5rem 2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--primary-blue)' }}>
                {activeTab === 'track' && 'Track Your Cargo'}
                {activeTab === 'branch' && 'Locate a Branch'}
                {activeTab === 'pincode' && 'Check Serviceability'}
              </h3>
              
              {activeTab === 'track' && (
                <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <select style={{ padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', background: 'var(--bg-light-grey)' }}>
                    <option>LR Number (Waybill)</option>
                    <option>Invoice Number</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Enter Tracking Number"
                    style={{ padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none' }}
                  />
                  <button type="submit" className="btn btn-blue" style={{ marginTop: '0.5rem', padding: '1rem' }}>Track Now</button>
                </form>
              )}
              {activeTab === 'branch' && (
                <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   <select style={{ padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none' }}>
                    <option>Select State</option>
                    <option>Maharashtra</option>
                    <option>Delhi</option>
                    <option>Uttarakhand</option>
                  </select>
                  <select style={{ padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none' }}>
                    <option>Select City</option>
                  </select>
                  <button type="submit" className="btn btn-blue" style={{ marginTop: '0.5rem', padding: '1rem' }}>Find Branch</button>
                </form>
              )}
              {activeTab === 'pincode' && (
                 <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input 
                    type="text" 
                    placeholder="Enter 6-digit Pincode"
                    style={{ padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none' }}
                  />
                  <button type="submit" className="btn btn-blue" style={{ marginTop: '0.5rem', padding: '1rem' }}>Check Availability</button>
                </form>
              )}
            </div>
            <div style={{ background: 'var(--primary-blue)', padding: '1.25rem', textAlign: 'center' }}>
               <Link to="/contact" style={{ color: 'white', fontWeight: '500', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                 Need help? Request a Callback <ArrowRight size={16} />
               </Link>
            </div>
          </div>

        </div>
      </section>

      {/* Services Grid Section */}
      <section className="section-padding" style={{ background: 'white' }}>
        <div className="container">
          <div className="section-title">
            <h2 style={{ color: 'var(--primary-blue)' }}>Core Logistics Solutions</h2>
            <p>From factory floor to final destination, we provide robust transportation services engineered for scale and speed.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* Card 1 */}
            <div style={{ background: 'var(--bg-light-grey)', padding: '3rem 2rem', border: '1px solid var(--border-color)', borderRadius: '8px', transition: 'all 0.3s', cursor: 'pointer' }}
                 onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-red)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                 onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Truck size={40} color="var(--primary-red)" style={{ marginBottom: '1.5rem' }} />
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Road Transportation</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>FTL and PTL logistics with a vast fleet of specialized vehicles across India.</p>
              <Link to="/services" style={{ color: 'var(--primary-blue)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Explore Road Cargo &rarr;</Link>
            </div>

            {/* Card 2 */}
            <div style={{ background: 'var(--bg-light-grey)', padding: '3rem 2rem', border: '1px solid var(--border-color)', borderRadius: '8px', transition: 'all 0.3s', cursor: 'pointer' }}
                 onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-red)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                 onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Globe size={40} color="var(--primary-red)" style={{ marginBottom: '1.5rem' }} />
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Train & Air Freight</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Secure rail bulk movement and expedited air shipments for time-sensitive cargo.</p>
              <Link to="/services" style={{ color: 'var(--primary-blue)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Explore Air & Train &rarr;</Link>
            </div>

            {/* Card 3 */}
            <div style={{ background: 'var(--bg-light-grey)', padding: '3rem 2rem', border: '1px solid var(--border-color)', borderRadius: '8px', transition: 'all 0.3s', cursor: 'pointer' }}
                 onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-red)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                 onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Package size={40} color="var(--primary-red)" style={{ marginBottom: '1.5rem' }} />
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Warehousing</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Modern secure facilities integrated with digital inventory and distribution management.</p>
              <Link to="/services" style={{ color: 'var(--primary-blue)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Explore Warehousing &rarr;</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section - distinct layout */}
      <section className="section-padding" style={{ background: 'var(--primary-blue)', color: 'white' }}>
        <div className="container">
          <div className="section-title" style={{ color: 'white' }}>
            <h2 style={{ color: 'white' }}>The Multimarg Advantage</h2>
            <div style={{ width: '60px', height: '3px', background: 'var(--primary-red)', margin: '1rem auto' }}></div>
            <p style={{ color: '#cbd5e1' }}>We don't just move freight; we optimize your entire supply chain infrastructure.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem', textAlign: 'center', marginTop: '4rem' }}>
             <div>
               <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                 <ShieldCheck size={36} color="var(--primary-red)" />
               </div>
               <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Zero Pilferage</h4>
               <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Rigorous security checks and 100% insured transit.</p>
             </div>
             
             <div>
               <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                 <Clock size={36} color="var(--primary-red)" />
               </div>
               <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Rapid Turnaround</h4>
               <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Strict adherence to delivery SLA and optimized routing.</p>
             </div>

             <div>
               <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                 <MapPin size={36} color="var(--primary-red)" />
               </div>
               <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Pan-India Reach</h4>
               <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Extensive branch network covering all major pin codes.</p>
             </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
