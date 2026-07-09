import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, MapPin, Phone, Mail, ArrowRight } from 'lucide-react';

const Footer = () => {
  return (
    <footer style={{ background: 'var(--primary-blue-dark)', color: '#e0e0e0', paddingTop: '4rem', borderTop: '5px solid var(--primary-red)' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
          
          {/* Brand Col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'white' }}>
              <Truck size={32} />
              <div>
                <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'white' }}>MULTIMARG CARRIERS</h2>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.7', marginBottom: '1.5rem', color: '#b0c4de' }}>
              India's leading end-to-end logistics partner. We simplify your supply chain with our extensive network, dedicated fleet, and cutting-edge technology.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {/* Social icons removed due to lucide-react deprecation */}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Links</h4>
            <ul style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><ArrowRight size={14} color="var(--primary-red)"/> Home</Link></li>
              <li><Link to="/about" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><ArrowRight size={14} color="var(--primary-red)"/> About Us</Link></li>
              <li><Link to="/services" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><ArrowRight size={14} color="var(--primary-red)"/> Services</Link></li>
              <li><Link to="/industries" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><ArrowRight size={14} color="var(--primary-red)"/> Industries</Link></li>
              <li><Link to="/branches" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><ArrowRight size={14} color="var(--primary-red)"/> Network</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Our Services</h4>
            <ul style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li style={{ fontSize: '0.9rem' }}>Road Logistics (FTL & PTL)</li>
              <li style={{ fontSize: '0.9rem' }}>Train Cargo</li>
              <li style={{ fontSize: '0.9rem' }}>Air Freight</li>
              <li style={{ fontSize: '0.9rem' }}>Warehousing Solutions</li>
              <li style={{ fontSize: '0.9rem' }}>Supply Chain Management</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Corporate Office</h4>
            <ul style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.9rem' }}>
                <MapPin size={18} color="var(--primary-red)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Sector 1, Plot No 12, Transport Nagar, Pune, Maharashtra 411044</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                <Phone size={18} color="var(--primary-red)" style={{ flexShrink: 0 }} />
                <span>+91 90450-15097</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                <Mail size={18} color="var(--primary-red)" style={{ flexShrink: 0 }} />
                <span>info@multimargcarriers.co.in</span>
              </li>
            </ul>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', color: '#b0c4de' }}>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>&copy; {new Date().getFullYear()} Multimarg Carriers Private Limited. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
