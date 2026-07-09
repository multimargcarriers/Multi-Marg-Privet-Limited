import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, PhoneCall, Mail, ArrowRight } from 'lucide-react';

const Footer = () => {
  return (
    <footer style={{ background: 'var(--primary-blue-dark)', color: '#e2e8f0' }}>
      
      {/* Top CTA Banner */}
      <div style={{ background: 'var(--primary-red)', padding: '2rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.5rem', color: 'white', margin: 0, fontWeight: '500' }}>Ready to transform your supply chain?</h3>
          <Link to="/contact" style={{ background: 'white', color: 'var(--primary-red)', padding: '0.75rem 2rem', borderRadius: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Get a Free Quote
          </Link>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '4rem', paddingBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '4rem', marginBottom: '3rem' }}>
          
          {/* Brand Col */}
          <div>
            <Link to="/">
              <img src="/mc.png" alt="Multimarg Carriers Logo" style={{ height: '45px', objectFit: 'contain', marginBottom: '1.5rem', filter: 'brightness(0) invert(1)' }} />
            </Link>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.8', color: '#94a3b8' }}>
              We simplify your supply chain with our extensive network, dedicated fleet, and cutting-edge technology. Experience logistics excellence.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: '500' }}>Company</h4>
            <ul style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <li><Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}><ArrowRight size={14} color="var(--primary-red)"/> Home</Link></li>
              <li><Link to="/about" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}><ArrowRight size={14} color="var(--primary-red)"/> About Us</Link></li>
              <li><Link to="/industries" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}><ArrowRight size={14} color="var(--primary-red)"/> Industries We Serve</Link></li>
              <li><Link to="/branches" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}><ArrowRight size={14} color="var(--primary-red)"/> Network & Branches</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: '500' }}>Our Expertise</h4>
            <ul style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <li style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>Road Logistics (FTL / PTL)</li>
              <li style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>Train Cargo Solutions</li>
              <li style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>Air Freight</li>
              <li style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>Secure Warehousing</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: '500' }}>Contact Us</h4>
            <ul style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <MapPin size={20} color="var(--primary-red)" style={{ flexShrink: 0 }} />
                <span>Sector 1, Plot No 12, Transport Nagar, Pune, Maharashtra 411044</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <PhoneCall size={20} color="var(--primary-red)" style={{ flexShrink: 0 }} />
                <span>+91 90450-15097</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <Mail size={20} color="var(--primary-red)" style={{ flexShrink: 0 }} />
                <span>info@multimargcarriers.co.in</span>
              </li>
            </ul>
          </div>
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
