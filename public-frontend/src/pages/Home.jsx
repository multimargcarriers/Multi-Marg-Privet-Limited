import React, { useState } from 'react';
import { Truck, MapPin, Package, Globe, ShieldCheck, Clock, Search, Navigation, ArrowRight, Users, HelpCircle, UserPlus, Phone, FileText, Briefcase, TrendingUp, CheckCircle, Monitor, CarFront, BriefcaseMedical, Factory } from 'lucide-react';
import { motion } from 'framer-motion';
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
        paddingTop: '140px', /* Increased padding to prevent navbar from hiding content on mobile */
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
          <source src="/Final.mp4" type="video/mp4" />
        </video>
        
        {/* Dark overlay to make text readable on the left, but leave video clear on the right */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(to right, rgba(11, 27, 61, 0.95) 0%, rgba(11, 27, 61, 0.6) 45%, rgba(0,0,0,0) 80%)',
          zIndex: -1
        }}></div>
        
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '4rem', alignItems: 'center', zIndex: 1, width: '100%' }}>
          
          {/* Left Text */}
          <div style={{ color: 'white' }}>
            <div style={{ display: 'inline-block', padding: '0.4rem 1rem', background: 'rgba(234, 88, 12, 0.2)', border: '1px solid var(--primary-red)', borderRadius: '50px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px', color: '#ffedd5' }}>
              Optimizing Supply Chains
            </div>
            <h1 style={{ fontSize: '3rem', fontWeight: '900', marginBottom: '1.5rem', lineHeight: '1.1', textTransform: 'uppercase', color: 'white' }}>
              Deliver Packages In Any Way <br/> <span style={{ color: 'var(--primary-red)' }}>Seamless Import & Export</span>
            </h1>
            <p style={{ fontSize: '1.15rem', marginBottom: '2.5rem', opacity: 0.9, lineHeight: '1.7', maxWidth: '500px' }}>
              Connecting Your World – Fast, Reliable Domestic Logistics by Air, Train, and Road. Unlocking Global Opportunities, One Trade at a Time.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link to="/about" className="btn btn-red" style={{ padding: '1rem 2rem' }}>
                Discover More
              </Link>
              <Link to="/quote" className="btn" style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '1rem 2rem' }}>
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
               <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'white' }}>Safety And Reliability</h4>
               <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Safety First, Reliability Always. Rigorous security checks and 100% insured transit.</p>
             </div>
             
             <div>
               <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                 <Clock size={36} color="var(--primary-red)" />
               </div>
               <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'white' }}>Seamless Journeys</h4>
               <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Effortless Transport. Strict adherence to delivery SLA and optimized routing.</p>
             </div>

             <div>
               <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                 <MapPin size={36} color="var(--primary-red)" />
               </div>
               <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'white' }}>Pan-India Reach</h4>
               <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Extensive branch network covering all major pin codes.</p>
             </div>
          </div>
        </div>
      </section>
      {/* Impact Statistics - Delivering Excellence */}
      <section style={{ padding: '5rem 0', background: 'var(--primary-red)', color: 'white' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
            <motion.div whileHover={{ scale: 1.1 }} style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>15+</h3>
              <p style={{ fontSize: '1.1rem', fontWeight: 500, opacity: 0.9 }}>Years of Excellence</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>500+</h3>
              <p style={{ fontSize: '1.1rem', fontWeight: 500, opacity: 0.9 }}>Pin Codes Covered</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>10k+</h3>
              <p style={{ fontSize: '1.1rem', fontWeight: 500, opacity: 0.9 }}>Successful Deliveries</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>99%</h3>
              <p style={{ fontSize: '1.1rem', fontWeight: 500, opacity: 0.9 }}>On-Time Delivery Rate</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Global Standards, Local Expertise */}
      <section className="section-padding" style={{ background: 'white' }}>
        <div className="container" style={{ display: 'flex', flexWrap: 'wrap', gap: '4rem', alignItems: 'center' }}>
          
          <div style={{ flex: '1 1 400px' }}>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--primary-blue)', marginBottom: '1.5rem', lineHeight: 1.2 }}>
              Global Standards, <br/><span style={{ color: 'var(--primary-red)' }}>Local Expertise.</span>
            </h2>
            <p style={{ color: 'var(--text-light)', fontSize: '1.1rem', lineHeight: 1.8, marginBottom: '2rem' }}>
              In today's fast-paced business environment, you need a logistics partner who understands the nuances of local terrain while adhering strictly to global standards of safety, compliance, and technological integration. Multimarg Carriers bridges this gap perfectly.
            </p>
            
            <ul style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '40px', height: '40px', background: 'var(--bg-light-grey)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Monitor size={20} color="var(--primary-blue)" />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>Advanced Tracking Tech</h4>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Real-time visibility into your cargo's journey, 24/7.</p>
                </div>
              </li>
              <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '40px', height: '40px', background: 'var(--bg-light-grey)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle size={20} color="var(--primary-blue)" />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>Regulatory Compliance</h4>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>We handle all documentation, ensuring smooth transit across state borders.</p>
                </div>
              </li>
              <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '40px', height: '40px', background: 'var(--bg-light-grey)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingUp size={20} color="var(--primary-blue)" />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>Scalable Solutions</h4>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>From single pallets to entire fleets, we scale with your business growth.</p>
                </div>
              </li>
            </ul>
          </div>

          <div style={{ flex: '1 1 400px', position: 'relative' }}>
            <div style={{ width: '100%', height: '500px', background: 'url("/logistics_global_standards.png")', backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }}></div>
            <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', background: 'var(--primary-blue)', color: 'white', padding: '2rem', borderRadius: '12px', boxShadow: 'var(--shadow-md)', maxWidth: '250px' }}>
              <h4 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>24/7</h4>
              <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>Dedicated Customer Support Operations</p>
            </div>
          </div>

        </div>
      </section>

      {/* About Us Preview */}
      <section className="section-padding" style={{ background: 'var(--bg-light-grey)' }}>
        <div className="container" style={{ display: 'flex', flexWrap: 'wrap', gap: '4rem', alignItems: 'center' }}>
          <div style={{ flex: '1 1 400px' }}>
            <div style={{ display: 'inline-block', padding: '0.4rem 1rem', background: 'rgba(234, 88, 12, 0.1)', color: 'var(--primary-red)', borderRadius: '50px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Who We Are
            </div>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--primary-blue)', marginBottom: '1.5rem', lineHeight: 1.2 }}>
              A Legacy of Logistics Excellence
            </h2>
            <p style={{ color: 'var(--text-light)', fontSize: '1.1rem', lineHeight: 1.8, marginBottom: '2rem' }}>
              For over a decade, Multimarg Carriers has been the backbone of supply chains across India. We don't just transport goods; we deliver promises. Our commitment to innovation, safety, and customer satisfaction has made us the preferred partner for industry leaders.
            </p>
            <Link to="/about" className="btn btn-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem' }}>
              Discover Our Story <ArrowRight size={18} />
            </Link>
          </div>
          <div style={{ flex: '1 1 400px' }}>
             <img src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="About Us" style={{ width: '100%', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }} />
          </div>
        </div>
      </section>

      {/* Industries Preview */}
      <section className="section-padding" style={{ background: 'white' }}>
        <div className="container">
          <div className="section-title" style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'var(--primary-blue)' }}>Industries We Empower</h2>
            <p>Specialized logistics solutions tailored to the unique demands of your sector.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginTop: '3rem' }}>
            <div style={{ padding: '3rem 2rem', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-light-grey)', textAlign: 'center', transition: 'all 0.3s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-red)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <CarFront size={48} color="var(--primary-red)" style={{ margin: '0 auto 1.5rem auto' }} />
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1rem', fontSize: '1.3rem' }}>Automotive</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>Just-in-time delivery of auto components and finished vehicles.</p>
            </div>
            <div style={{ padding: '3rem 2rem', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-light-grey)', textAlign: 'center', transition: 'all 0.3s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-red)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <BriefcaseMedical size={48} color="var(--primary-red)" style={{ margin: '0 auto 1.5rem auto' }} />
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1rem', fontSize: '1.3rem' }}>Pharmaceuticals</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>Temperature-controlled transit ensuring life-saving drugs remain safe.</p>
            </div>
            <div style={{ padding: '3rem 2rem', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-light-grey)', textAlign: 'center', transition: 'all 0.3s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-red)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <Factory size={48} color="var(--primary-red)" style={{ margin: '0 auto 1.5rem auto' }} />
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1rem', fontSize: '1.3rem' }}>FMCG & Retail</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>High-volume, rapid distribution to keep retail shelves stocked.</p>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link to="/industries" className="btn btn-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem' }}>
              View All Industries <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Careers Banner Preview */}
      <section style={{ padding: '5rem 0', background: 'var(--primary-blue)', color: 'white', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, opacity: 0.1, transform: 'translate(30%, -30%)' }}>
          <Users size={400} color="white" />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>
          <div style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 800 }}>Join the Multimarg Family</h2>
            <p style={{ fontSize: '1.1rem', opacity: 0.9, lineHeight: 1.6, marginBottom: '2rem' }}>
              We are always on the lookout for passionate drivers, logistics coordinators, and tech innovators. Build a rewarding career with an industry leader.
            </p>
            <Link to="/careers" className="btn btn-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', background: 'white', color: 'var(--primary-blue)' }}>
              Explore Open Roles <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="section-padding" style={{ background: 'white' }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="section-title" style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'var(--primary-blue)' }}>Got Questions?</h2>
            <p>Quick answers to our most commonly asked questions.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
            <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <h4 style={{ color: 'var(--primary-blue)', fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                How do I track my shipment?
              </h4>
              <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', margin: 0 }}>You can track your shipment directly from our homepage using your LR (Waybill) number or Invoice number in the tracking widget.</p>
            </div>
            <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <h4 style={{ color: 'var(--primary-blue)', fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                What regions do you cover?
              </h4>
              <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', margin: 0 }}>We provide Pan-India coverage with a massive network of branches and hubs across all major states and pin codes.</p>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link to="/faq" style={{ color: 'var(--primary-red)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              Visit FAQ Center <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      
      {/* Dual CTA Section */}
      <section className="section-padding" style={{ background: 'var(--bg-light-grey)' }}>
        <div className="container" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
          <div style={{ flex: '1 1 400px', background: 'var(--primary-red)', color: 'white', padding: '4rem 3rem', borderRadius: '16px', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 800 }}>Ready to Ship?</h2>
            <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '2rem', maxWidth: '400px', margin: '0 auto' }}>Get a customized logistics quote tailored precisely to your business needs.</p>
            <Link to="/quote" className="btn" style={{ background: 'white', color: 'var(--primary-red)', padding: '1rem 2rem', display: 'inline-block', borderRadius: '50px', fontWeight: 'bold' }}>Get a Free Quote</Link>
          </div>
          <div style={{ flex: '1 1 400px', background: 'var(--primary-blue)', color: 'white', padding: '4rem 3rem', borderRadius: '16px', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 800 }}>Need Assistance?</h2>
            <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '2rem', maxWidth: '400px', margin: '0 auto' }}>Our 24/7 support team is standing by to help you with any inquiries.</p>
            <Link to="/contact" className="btn" style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '1rem 2rem', display: 'inline-block', borderRadius: '50px', fontWeight: 'bold' }}>Contact Us Today</Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
