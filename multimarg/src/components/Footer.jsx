import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, PhoneCall, Mail, ArrowRight } from 'lucide-react';

const Footer = () => {
  return (
    <footer style={{ background: 'var(--primary-blue-dark)', color: '#e2e8f0' }}>
      <div className="container" style={{ paddingTop: '4rem', paddingBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '4rem', marginBottom: '3rem' }}>
          
          {/* Brand Col */}
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', marginBottom: '1.5rem' }}>
              <img src="/circle_crop_logo.png" alt="Multimarg Carriers Logo" style={{ height: '60px', width: '60px', objectFit: 'contain' }} />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ 
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '1.4rem', 
                  fontWeight: 800, 
                  letterSpacing: '-0.03em', 
                  background: 'linear-gradient(135deg, #FF8A00 0%, #FF5A1F 50%, #E53935 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textTransform: 'uppercase',
                  lineHeight: 1.1
                }}>
                  MULTIMARG
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1px' }}>
                  <span style={{ 
                    fontFamily: "'Roboto', sans-serif", 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: '#FF5A1F', 
                    textTransform: 'uppercase', 
                    letterSpacing: '2px'
                  }}>
                    CARRIERS
                  </span>
                  <span style={{ 
                    fontFamily: "'Roboto', sans-serif", 
                    fontSize: '0.65rem', 
                    fontWeight: 500, 
                    color: '#94a3b8', 
                    textTransform: 'uppercase', 
                    letterSpacing: '1px'
                  }}>
                    PVT. LTD.
                  </span>
                </div>
              </div>
            </Link>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.8', color: '#94a3b8' }}>
              Multimarg Carriers Pvt Ltd handles the transportation, storage, and distribution of goods, ensuring products move efficiently from suppliers to customers. We provide services like freight forwarding, warehousing, supply chain management, and last-mile delivery.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: '500' }}>Company</h4>
            <ul style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem', listStyle: 'none', margin: 0 }}>
              <li><Link to="/about" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='white'} onMouseLeave={e => e.currentTarget.style.color='#cbd5e1'}><ArrowRight size={14} color="var(--primary-red)"/> About Us</Link></li>
              <li><Link to="/branches" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='white'} onMouseLeave={e => e.currentTarget.style.color='#cbd5e1'}><ArrowRight size={14} color="var(--primary-red)"/> Network & Branches</Link></li>
              <li><Link to="/careers" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='white'} onMouseLeave={e => e.currentTarget.style.color='#cbd5e1'}><ArrowRight size={14} color="var(--primary-red)"/> Careers</Link></li>
              <li><Link to="/faq" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='white'} onMouseLeave={e => e.currentTarget.style.color='#cbd5e1'}><ArrowRight size={14} color="var(--primary-red)"/> FAQ</Link></li>
              <li><Link to="/contact" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='white'} onMouseLeave={e => e.currentTarget.style.color='#cbd5e1'}><ArrowRight size={14} color="var(--primary-red)"/> Contact Us</Link></li>
            </ul>
          </div>

          {/* Services & Tools */}
          <div>
            <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: '500' }}>Services & Tools</h4>
            <ul style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem', listStyle: 'none', margin: 0 }}>
              <li><Link to="/services" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='white'} onMouseLeave={e => e.currentTarget.style.color='#cbd5e1'}><ArrowRight size={14} color="var(--primary-red)"/> Our Services</Link></li>
              <li><Link to="/industries" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='white'} onMouseLeave={e => e.currentTarget.style.color='#cbd5e1'}><ArrowRight size={14} color="var(--primary-red)"/> Industries We Serve</Link></li>
              <li><Link to="/track" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='white'} onMouseLeave={e => e.currentTarget.style.color='#cbd5e1'}><ArrowRight size={14} color="var(--primary-red)"/> Track Shipment</Link></li>
              <li><Link to="/quote" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='white'} onMouseLeave={e => e.currentTarget.style.color='#cbd5e1'}><ArrowRight size={14} color="var(--primary-red)"/> Request a Quote</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: '500' }}>Contact Us</h4>
            <ul style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <MapPin size={20} color="var(--primary-red)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <span>LIG-194, AVAS VIKAS, RUDRAPUR, Uttarakhand-263153</span>
                  <div style={{ marginTop: '4px' }}>
                    <a 
                      href="https://maps.app.goo.gl/VijJXSt2mgaYGbLw8" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#f87171', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <MapPin size={12} /> View on Google Maps &rarr;
                    </a>
                  </div>
                </div>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <PhoneCall size={20} color="var(--primary-red)" style={{ flexShrink: 0 }} />
                <span>+91 5944-324033</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <Mail size={20} color="var(--primary-red)" style={{ flexShrink: 0 }} />
                <span><a href="mailto:info@multimarg.com" style={{ color: '#cbd5e1', textDecoration: 'none' }}>info@multimarg.com</a></span>
              </li>
            </ul>
          </div>  
        </div>

        {/* Full Width Footer Map */}
        <div style={{ position: 'relative', width: '100%', height: '350px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '2.5rem' }}>
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: 5,
            background: 'rgba(15, 23, 42, 0.90)',
            backdropFilter: 'blur(6px)',
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ color: '#ffffff', fontSize: '0.82rem', fontWeight: 700 }}>Multimarg Carriers Private Limited Office</span>
            <a 
              href="https://maps.app.goo.gl/VijJXSt2mgaYGbLw8"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: 'var(--primary-red)',
                color: '#ffffff',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              Open Map &rarr;
            </a>
          </div>
          <iframe 
            src="https://maps.google.com/maps?q=28.989096,79.4184503+(Multimarg%20Carriers%20Private%20Limited%20Office)&t=&z=16&ie=UTF8&iwloc=B&output=embed" 
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen="" 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Multimarg Carriers Private Limited Office Location"
          ></iframe>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', color: '#64748b' }}>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>&copy; {new Date().getFullYear()} Multimarg Carriers Private Limited. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
            <Link to="/privacy" style={{ color: '#64748b' }}>Privacy Policy</Link>
            <Link to="/terms" style={{ color: '#64748b' }}>Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
