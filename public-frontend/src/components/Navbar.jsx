import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Truck, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    { name: 'Services', path: '/services' },
    { name: 'Branches', path: '/branches' },
  ];

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      transition: 'all 0.3s ease',
      padding: isScrolled ? '1rem 0' : '1.5rem 0',
      background: isScrolled ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
      backdropFilter: isScrolled ? 'blur(10px)' : 'none',
      boxShadow: isScrolled ? '0 4px 6px -1px rgba(0, 0, 0, 0.05)' : 'none',
      borderBottom: isScrolled ? '1px solid rgba(0,0,0,0.05)' : '1px solid transparent'
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 101 }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
            padding: '0.5rem', borderRadius: '8px', color: 'white', display: 'flex'
          }}>
            <Truck size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', margin: 0, color: isScrolled || mobileMenuOpen ? 'var(--secondary-color)' : 'white' }}>Multimarg Carriers</h1>
            <p style={{ fontSize: '0.7rem', margin: 0, color: isScrolled || mobileMenuOpen ? 'var(--text-light)' : 'rgba(255,255,255,0.8)', letterSpacing: '1px' }}>PVT LTD</p>
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
                fontWeight: location.pathname === link.path ? '600' : '500',
                color: isScrolled ? (location.pathname === link.path ? 'var(--primary-color)' : 'var(--text-main)') : 'white',
                borderBottom: location.pathname === link.path ? `2px solid ${isScrolled ? 'var(--primary-color)' : 'white'}` : '2px solid transparent',
                paddingBottom: '0.25rem'
              }}
            >
              {link.name}
            </Link>
          ))}
          <Link to="/contact" className={isScrolled ? "btn btn-primary" : "btn btn-white"} style={{ padding: '0.5rem 1.5rem' }}>
            Contact Us
          </Link>
          {/* Dashboard Link */}
          <a href="http://localhost:5173" target="_blank" rel="noreferrer" style={{ fontSize: '0.9rem', fontWeight: '500', color: isScrolled ? 'var(--text-light)' : 'rgba(255,255,255,0.8)', textDecoration: 'underline' }}>
            Staff Login
          </a>
        </nav>

        {/* Mobile Toggle */}
        <button 
          className="mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ background: 'transparent', border: 'none', color: isScrolled || mobileMenuOpen ? 'var(--secondary-color)' : 'white', cursor: 'pointer', zIndex: 101 }}
        >
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'white', padding: '2rem',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              display: 'flex', flexDirection: 'column', gap: '1.5rem',
              borderTop: '1px solid #f1f5f9'
            }}
            className="mobile-menu"
          >
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontSize: '1.1rem',
                  fontWeight: location.pathname === link.path ? '600' : '500',
                  color: location.pathname === link.path ? 'var(--primary-color)' : 'var(--text-main)'
                }}
              >
                {link.name}
              </Link>
            ))}
            <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary" style={{ justifyContent: 'center' }}>
              Contact Us
            </Link>
            <a href="http://localhost:5173" target="_blank" rel="noreferrer" style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-light)', marginTop: '1rem' }}>
              Staff Login (Admin)
            </a>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        @media (min-width: 769px) { .mobile-toggle, .mobile-menu { display: none !important; } }
        @media (max-width: 768px) { .desktop-nav { display: none !important; } }
      `}</style>
    </header>
  );
};

export default Navbar;
