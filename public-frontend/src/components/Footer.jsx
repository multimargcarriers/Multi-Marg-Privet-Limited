import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, MapPin, Phone, Mail, ArrowRight } from 'lucide-react';

const Footer = () => {
  return (
    <footer style={{ background: '#0f172a', color: '#cbd5e1', paddingTop: '5rem', paddingBottom: '2rem' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem', marginBottom: '4rem' }}>
          
          {/* Brand Col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                padding: '0.5rem', borderRadius: '8px', color: 'white', display: 'flex'
              }}>
                <Truck size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'white' }}>Multimarg Carriers</h2>
                <p style={{ fontSize: '0.7rem', margin: 0, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px' }}>PVT LTD</p>
              </div>
            </div>
            <p style={{ fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
              Delivering excellence in logistics across India. From air freight to road cargo, we ensure your goods arrive safely and on time.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1.5rem' }}>Quick Links</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} color="var(--primary-color)"/> Home</Link></li>
              <li><Link to="/about" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} color="var(--primary-color)"/> About Us</Link></li>
              <li><Link to="/services" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} color="var(--primary-color)"/> Services</Link></li>
              <li><Link to="/branches" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} color="var(--primary-color)"/> Network</Link></li>
              <li><Link to="/contact" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} color="var(--primary-color)"/> Contact</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1.5rem' }}>Our Services</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li>Road Logistics & FTL</li>
              <li>Train Cargo</li>
              <li>Air Freight</li>
              <li>Warehousing Solutions</li>
              <li>Supply Chain Management</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1.5rem' }}>Corporate Office</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <MapPin size={20} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Sector 1, Plot No 12, Transport Nagar, Pune, Maharashtra 411044</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Phone size={20} color="var(--primary-color)" style={{ flexShrink: 0 }} />
                <span>+91 9045015097</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Mail size={20} color="var(--primary-color)" style={{ flexShrink: 0 }} />
                <span>info@multimargcarriers.co.in</span>
              </li>
            </ul>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>&copy; {new Date().getFullYear()} Multimarg Carriers Private Limited. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
            <a href="#" style={{ color: '#cbd5e1' }}>Privacy Policy</a>
            <a href="#" style={{ color: '#cbd5e1' }}>Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
