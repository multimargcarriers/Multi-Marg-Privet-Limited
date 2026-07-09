import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, PhoneCall } from 'lucide-react';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'About Us', path: '/about' },
    { name: 'Services', path: '/services' },
    { name: 'Industries', path: '/industries' },
    { name: 'Network', path: '/branches' },
  ];

  return (
    <header style={{ 
      position: 'fixed', 
      top: 0, 
      width: '100%', 
      zIndex: 1000, 
      transition: 'all 0.3s ease',
      backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'white',
      backdropFilter: scrolled ? 'blur(10px)' : 'none',
      boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
      borderBottom: scrolled ? 'none' : '1px solid var(--border-color)'
    }}>
      
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: scrolled ? '0.75rem 2rem' : '1.25rem 2rem', transition: 'padding 0.3s ease' }}>
        
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 101, textDecoration: 'none' }}>
          <img src="/mc.png" alt="Multimarg Carriers Logo" style={{ height: scrolled ? '45px' : '55px', objectFit: 'contain', transition: 'height 0.3s ease' }} />
          <div>
            <h1 style={{ fontSize: scrolled ? '1.2rem' : '1.4rem', margin: 0, color: 'var(--primary-blue)', letterSpacing: '-0.5px', fontWeight: '800', transition: 'all 0.3s ease' }}>
              MULTIMARG <span style={{ color: 'var(--primary-red)' }}>CARRIERS</span>
            </h1>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }} className="desktop-nav">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              to={link.path}
              style={{
                fontSize: '0.95rem',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: location.pathname === link.path ? 'var(--primary-red)' : 'var(--text-main)',
                position: 'relative',
                padding: '0.5rem 0'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-red)'}
              onMouseLeave={(e) => e.currentTarget.style.color = location.pathname === link.path ? 'var(--primary-red)' : 'var(--text-main)'}
            >
              {link.name}
              {location.pathname === link.path && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '2px', backgroundColor: 'var(--primary-red)' }}></div>
              )}
            </Link>
          ))}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginLeft: '1rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-blue)', fontWeight: '700' }}>
              <PhoneCall size={18} />
              <span>+91 90450-15097</span>
            </div>
            <a href="http://localhost:5173" target="_blank" rel="noreferrer" className="btn btn-red">
              Login
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
                padding: '0.75rem 0',
                borderBottom: '1px solid #f0f0f0',
                color: location.pathname === link.path ? 'var(--primary-red)' : 'var(--text-main)'
              }}
            >
              {link.name}
            </Link>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-blue)', fontWeight: '700', padding: '0.5rem 0' }}>
              <PhoneCall size={18} />
              <span>+91 90450-15097</span>
            </div>
            <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="btn btn-outline-red" style={{ width: '100%', justifyContent: 'center' }}>
              Contact Us
            </Link>
            <a href="http://localhost:5173" target="_blank" rel="noreferrer" className="btn btn-red" style={{ width: '100%', justifyContent: 'center' }}>
              Customer Login
            </a>
          </div>
        </div>
      )}
      
      <style>{`
        @media (min-width: 1024px) { .mobile-toggle, .mobile-menu { display: none !important; } }
        @media (max-width: 1023px) { .desktop-nav { display: none !important; } }
      `}</style>
    </header>
  );
};

export default Navbar;
