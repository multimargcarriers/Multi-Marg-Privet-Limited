import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Phone, Mail, Menu, X, Truck } from 'lucide-react';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'About Us', path: '/about' },
    { name: 'Our Services', path: '/services' },
    { name: 'Industries We Serve', path: '/industries' },
    { name: 'Network', path: '/branches' },
  ];

  return (
    <header style={{ position: 'relative', width: '100%', zIndex: 100, boxShadow: 'var(--shadow-sm)', backgroundColor: 'white' }}>
      
      {/* Top Bar (Deep Blue) */}
      <div style={{ backgroundColor: 'var(--primary-blue)', color: 'white', padding: '0.4rem 0', fontSize: '0.85rem' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <a href="tel:+919045015097" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Phone size={14} /> +91 90450-15097
            </a>
            <a href="mailto:info@multimargcarriers.co.in" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={14} /> info@multimargcarriers.co.in
            </a>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {/* Social icons temporarily removed due to lucide-react deprecation */}
          </div>
        </div>
      </div>

      {/* Main Header (White) */}
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem' }}>
        
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 101 }}>
          <div style={{ color: 'var(--primary-blue)' }}>
            <Truck size={36} strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--primary-blue)', letterSpacing: '-0.5px' }}>
              MULTIMARG <span style={{ color: 'var(--primary-red)' }}>CARRIERS</span>
            </h1>
            <p style={{ fontSize: '0.65rem', margin: 0, color: 'var(--text-main)', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '500' }}>
              Simplifying Your Business
            </p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }} className="desktop-nav">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              to={link.path}
              style={{
                fontSize: '0.9rem',
                fontWeight: '500',
                color: location.pathname === link.path ? 'var(--primary-red)' : 'var(--text-main)',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-red)'}
              onMouseLeave={(e) => e.currentTarget.style.color = location.pathname === link.path ? 'var(--primary-red)' : 'var(--text-main)'}
            >
              {link.name}
            </Link>
          ))}
          
          <div style={{ display: 'flex', gap: '0.75rem', marginLeft: '1rem' }}>
            <Link to="/contact" className="btn btn-outline-red">
              Contact Us
            </Link>
            <a href="http://localhost:5173" target="_blank" rel="noreferrer" className="btn btn-red">
              Customer Login
            </a>
          </div>
        </nav>

        {/* Mobile Toggle */}
        <button 
          className="mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', zIndex: 101 }}
        >
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'white', padding: '1rem 2rem 2rem 2rem',
            boxShadow: 'var(--shadow-md)',
            display: 'flex', flexDirection: 'column', gap: '1rem',
            borderTop: '1px solid var(--border-color)'
          }}
          className="mobile-menu"
        >
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: '1rem',
                fontWeight: '500',
                padding: '0.5rem 0',
                borderBottom: '1px solid #f0f0f0',
                color: location.pathname === link.path ? 'var(--primary-red)' : 'var(--text-main)'
              }}
            >
              {link.name}
            </Link>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="btn btn-outline-red" style={{ width: '100%' }}>
              Contact Us
            </Link>
            <a href="http://localhost:5173" target="_blank" rel="noreferrer" className="btn btn-red" style={{ width: '100%' }}>
              Customer Login
            </a>
          </div>
        </div>
      )}
      
      <style>{`
        .social-icon { color: rgba(255,255,255,0.8); transition: color 0.2s; display: flex; }
        .social-icon:hover { color: white; }
        @media (min-width: 992px) { .mobile-toggle, .mobile-menu { display: none !important; } }
        @media (max-width: 991px) { .desktop-nav { display: none !important; } }
      `}</style>
    </header>
  );
};

export default Navbar;
