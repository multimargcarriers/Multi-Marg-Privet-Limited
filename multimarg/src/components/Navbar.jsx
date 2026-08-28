import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, PhoneCall, ChevronDown } from 'lucide-react';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [clickedDropdown, setClickedDropdown] = useState(null);
  const clickTimeoutRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  const handleDropdownClick = (name) => {
    if (clickedDropdown === name) {
      // Toggle off if already clicked
      setClickedDropdown(null);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    } else {
      // Toggle on and set 10 second timeout
      setClickedDropdown(name);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);

      clickTimeoutRef.current = setTimeout(() => {
        setClickedDropdown(null);
      }, 10000);
    }
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    {
      name: 'Company',
      isDropdown: true,
      items: [
        { name: 'About Us', path: '/about' },
        { name: 'Network & Branches', path: '/branches' },
        { name: 'Careers', path: '/careers' },
        { name: 'FAQ', path: '/faq' },
      ]
    },
    { name: 'Services', path: '/services' },
    { name: 'Industries', path: '/industries' },
    { name: 'Track', path: '/track' },
    { name: 'Contact', path: '/contact' },
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

      <div className="container nav-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: scrolled ? '0.5rem' : '1rem', paddingBottom: scrolled ? '0.5rem' : '1rem', transition: 'padding 0.3s ease', gap: '1rem' }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.4rem, 1.5vw, 0.75rem)', zIndex: 101, textDecoration: 'none' }}>
          <img className="nav-logo-img" src="/circle_crop_logo.png" alt="Multimarg Carriers Logo" style={{ height: scrolled ? '48px' : '60px', width: scrolled ? '48px' : '60px', objectFit: 'contain', transition: 'all 0.3s ease' }} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 className="nav-brand-title" style={{ 
              margin: 0, 
              fontFamily: "'Montserrat', sans-serif",
              fontSize: scrolled ? '1.4rem' : '1.8rem', 
              fontWeight: 800, 
              letterSpacing: '-0.03em', 
              background: 'linear-gradient(135deg, #FF8A00 0%, #FF5A1F 50%, #E53935 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textTransform: 'uppercase',
              lineHeight: 1.1,
              transition: 'font-size 0.3s ease'
            }}>
              MULTIMARG
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1px' }}>
              <span className="nav-brand-sub1" style={{ 
                fontFamily: "'Roboto', sans-serif", 
                fontSize: scrolled ? '0.65rem' : '0.8rem', 
                fontWeight: 700, 
                color: '#FF5A1F', 
                textTransform: 'uppercase', 
                letterSpacing: scrolled ? '1px' : '2px',
                transition: 'all 0.3s ease'
              }}>
                CARRIERS
              </span>
              <span className="nav-brand-sub2" style={{ 
                fontFamily: "'Roboto', sans-serif", 
                fontSize: scrolled ? '0.55rem' : '0.65rem', 
                fontWeight: 500, 
                color: '#64748b', 
                textTransform: 'uppercase', 
                letterSpacing: '1px',
                transition: 'all 0.3s ease'
              }}>
                PVT. LTD.
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }} className="desktop-nav">
          {navLinks.map((link) => (
            link.isDropdown ? (
              <div
                key={link.name}
                className={`dropdown-container ${clickedDropdown === link.name ? 'clicked-open' : ''}`}
                style={{ position: 'relative' }}
              >
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: link.items.some(item => location.pathname === item.path) ? 'var(--primary-red)' : 'var(--text-main)',
                    cursor: 'pointer',
                    padding: '0.5rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'color 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                  className="dropdown-trigger"
                  onClick={() => handleDropdownClick(link.name)}
                >
                  {link.name} <ChevronDown size={16} />
                  {link.items.some(item => location.pathname === item.path) && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '2px', backgroundColor: 'var(--primary-red)' }}></div>
                  )}
                </div>
                <div className="dropdown-menu" style={{
                  position: 'absolute',
                  top: '100%',
                  left: '-1rem',
                  backgroundColor: 'white',
                  minWidth: '200px',
                  boxShadow: 'var(--shadow-lg)',
                  borderRadius: '8px',
                  padding: '0.5rem 0',
                  display: 'none',
                  flexDirection: 'column',
                  zIndex: 100,
                  border: '1px solid var(--border-color)',
                  marginTop: '0.5rem'
                }}>
                  {link.items.map(subItem => (
                    <Link
                      key={subItem.name}
                      to={subItem.path}
                      onClick={() => setClickedDropdown(null)} // close dropdown on link click
                      style={{
                        padding: '0.75rem 1.5rem',
                        color: location.pathname === subItem.path ? 'var(--primary-red)' : 'var(--text-main)',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        display: 'block',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-light-grey)';
                        e.currentTarget.style.color = 'var(--primary-red)';
                        e.currentTarget.style.paddingLeft = '1.75rem';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = location.pathname === subItem.path ? 'var(--primary-red)' : 'var(--text-main)';
                        e.currentTarget.style.paddingLeft = '1.5rem';
                      }}
                    >
                      {subItem.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
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
                  padding: '0.5rem 0',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-red)'}
                onMouseLeave={(e) => e.currentTarget.style.color = location.pathname === link.path ? 'var(--primary-red)' : 'var(--text-main)'}
              >
                {link.name}
                {location.pathname === link.path && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '2px', backgroundColor: 'var(--primary-red)' }}></div>
                )}
              </Link>
            )
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-blue)', fontWeight: '700', whiteSpace: 'nowrap' }}>
              <PhoneCall size={18} />
              <a href="tel:+915944324033" style={{ color: 'inherit', textDecoration: 'none' }}>+91 5944-324033</a>
            </div>
            <Link to="/quote" className="btn btn-red" style={{ padding: '0.65rem 1.25rem', whiteSpace: 'nowrap', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)', fontWeight: '600' }}>
              Get Quote
            </Link>
            <a href={import.meta.env.VITE_ADMIN_URL || "http://localhost:5173"} target="_blank" rel="noreferrer" style={{ fontWeight: '600', color: 'var(--text-main)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-red)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-main)'}>
              Login
            </a>
          </div>
        </nav>

        {/* Mobile Toggle */}
        <button
          className="mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', zIndex: 101, marginLeft: 'auto' }}
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
            borderTop: '1px solid var(--border-color)',
            maxHeight: 'calc(100vh - 70px)',
            overflowY: 'auto'
          }}
          className="mobile-menu"
        >
          {navLinks.map((link) => (
            link.isDropdown ? (
              <div key={link.name} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  padding: '0.75rem 0',
                  color: 'var(--primary-blue)',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  {link.name}
                </div>
                {link.items.map(subItem => (
                  <Link
                    key={subItem.name}
                    to={subItem.path}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: '500',
                      padding: '0.75rem 0 0.75rem 1.5rem',
                      borderBottom: '1px solid #f0f0f0',
                      color: location.pathname === subItem.path ? 'var(--primary-red)' : 'var(--text-main)'
                    }}
                  >
                    {subItem.name}
                  </Link>
                ))}
              </div>
            ) : (
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
            )
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-blue)', fontWeight: '700', padding: '0.5rem 0' }}>
              <PhoneCall size={18} />
              <a href="tel:+915944324033" style={{ color: 'inherit', textDecoration: 'none' }}>+91 5944-324033</a>
            </div>
            <Link to="/quote" onClick={() => setMobileMenuOpen(false)} className="btn btn-red" style={{ width: '100%', justifyContent: 'center' }}>
              Get Quote
            </Link>
            <a href={import.meta.env.VITE_ADMIN_URL || "http://localhost:5173"} target="_blank" rel="noreferrer" className="btn btn-outline-red" style={{ width: '100%', justifyContent: 'center' }}>
              Login
            </a>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 1350px) { 
          .mobile-toggle, .mobile-menu { display: none !important; } 
        }
        @media (max-width: 1349px) { 
          .desktop-nav { display: none !important; } 
        }
        
        @media (max-width: 768px) {
          .nav-container {
            padding-top: 0.35rem !important;
            padding-bottom: 0.35rem !important;
          }
          .nav-logo-img {
            height: 38px !important;
            width: 38px !important;
          }
          .nav-brand-title {
            font-size: 1.15rem !important;
          }
          .nav-brand-sub1 {
            font-size: 0.52rem !important;
            letter-spacing: 1px !important;
          }
          .nav-brand-sub2 {
            font-size: 0.45rem !important;
          }
          .mobile-toggle {
            transition: transform 0.2s ease;
          }
          .mobile-toggle:active {
            transform: scale(0.95);
          }
        }

        /* Hover state OR clicked open state */
        .dropdown-container:hover .dropdown-trigger,
        .dropdown-container.clicked-open .dropdown-trigger {
          color: var(--primary-red) !important;
        }
        
        .dropdown-container:hover .dropdown-menu,
        .dropdown-container.clicked-open .dropdown-menu {
          display: flex !important;
          animation: dropdownFadeIn 0.2s ease forwards;
        }

        /* Bridge the physical gap between trigger and menu to maintain hover */
        .dropdown-menu::before {
          content: '';
          position: absolute;
          top: -15px;
          left: 0;
          right: 0;
          height: 15px;
        }

        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
