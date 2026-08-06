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
              <img src="/mc.png" alt="Multimarg Carriers Logo" style={{ height: '45px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.5px' }}>
                <span style={{ color: 'white' }}>MULTIMARG </span>
                <span style={{ color: 'var(--primary-red)' }}>CARRIERS</span>
              </span>
            </Link>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.8', color: '#94a3b8' }}>
              Multimarg Carriers Pvt Ltd handles the transportation, storage, and distribution of goods, ensuring products move efficiently from suppliers to customers. We provide services like freight forwarding, warehousing, supply chain management, and last-mile delivery.
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
              <li><Link to="/careers" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}><ArrowRight size={14} color="var(--primary-red)"/> Careers</Link></li>
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
                <span>LIG-194, AVAS VIKAS, RUDRAPUR, Uttarakhand-263153</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <PhoneCall size={20} color="var(--primary-red)" style={{ flexShrink: 0 }} />
                <span>+91 5944-324033</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <Mail size={20} color="var(--primary-red)" style={{ flexShrink: 0 }} />
                <span>info@multimargcarriers.co.in</span>
              </li>
            </ul>
            
          </div>
        </div>

        {/* Full Width Footer Map */}
        <div style={{ width: '100%', height: '350px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '2.5rem' }}>
          <iframe 
            src="https://maps.google.com/maps?q=MULTIMARG%20CARRIERS%20Pvt%20Ltd,%20Rudrapur,%20Uttarakhand&t=&z=15&ie=UTF8&iwloc=&output=embed" 
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen="" 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Multimarg Carriers Location"
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
