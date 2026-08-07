import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Package, Users, Truck, FileText,  Compass, Zap, Plus } from 'lucide-react';
import axios from 'axios';

const CommandPalette = ({ isOpen, setIsOpen }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Quick Actions to show when query is empty
  const QUICK_ACTIONS = [
    { type: 'Quick Action', title: 'Create New LR (Booking)', subtitle: 'Generate a new transport booking', link: '/bookings/create', icon: <Plus size={16} color="#10b981" /> },
    { type: 'Quick Action', title: 'Add New Client', subtitle: 'Register a new customer', link: '/clients', icon: <Users size={16} color="#3b82f6" /> },
    { type: 'Quick Action', title: 'Generate Bill', subtitle: 'Create an invoice for clients', link: '/bills/generate', icon: <FileText size={16} color="#8b5cf6" /> },
    { type: 'Quick Action', title: 'System Settings', subtitle: 'Configure global preferences', link: '/settings', icon: <Zap size={16} color="#f59e0b" /> }
  ];

  const MENU_ITEMS = [
    { type: 'Menu', id: 'm1', title: 'Dashboard', subtitle: 'View main dashboard', link: '/' },
    { type: 'Menu', id: 'm2', title: 'Create LR (Booking)', subtitle: 'Add a new Booking', link: '/bookings/create' },
    { type: 'Menu', id: 'm3', title: 'Bookings List', subtitle: 'View all Bookings', link: '/bookings' },
    { type: 'Menu', id: 'm4', title: 'Add Trip', subtitle: 'Create a new Trip', link: '/trips/create' },
    { type: 'Menu', id: 'm5', title: 'Trips List', subtitle: 'View all Trips', link: '/trips' },
    { type: 'Menu', id: 'm6', title: 'Add Client', subtitle: 'Create a new Client', link: '/clients/create' },
    { type: 'Menu', id: 'm7', title: 'Clients List', subtitle: 'View all Clients', link: '/clients' },
    { type: 'Menu', id: 'm8', title: 'Add Vendor', subtitle: 'Create a new Vendor', link: '/vendors/create' },
    { type: 'Menu', id: 'm9', title: 'Vendors List', subtitle: 'View all Vendors', link: '/vendors' },
    { type: 'Menu', id: 'm10', title: 'Generate Bill', subtitle: 'Create a new Bill', link: '/bills/generate' },
    { type: 'Menu', id: 'm11', title: 'Bills List', subtitle: 'View all Bills', link: '/bills' },
    { type: 'Menu', id: 'm12', title: 'Cities List', subtitle: 'Manage Cities', link: '/cities' },
    { type: 'Menu', id: 'm13', title: 'Branches List', subtitle: 'Manage Branches', link: '/branches' },
    { type: 'Menu', id: 'm14', title: 'Reports', subtitle: 'View Analytics & Reports', link: '/reports' },
    { type: 'Menu', id: 'm15', title: 'Tracking', subtitle: 'Track Shipments', link: '/tracking' },
  ];

  // Listen for Ctrl+K and custom event
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    const handleOpenEvent = () => {
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleOpenEvent);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleOpenEvent);
    };
  }, [isOpen, setIsOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Debounce API calls
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await axios.get(`${apiUrl}/api/search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        let allResults = [];
        
        const qLower = query.toLowerCase();
        const navMatches = MENU_ITEMS.filter(item => 
          item.title.toLowerCase().includes(qLower) || 
          item.subtitle.toLowerCase().includes(qLower)
        ).slice(0, 4);
        
        allResults.push(...navMatches);

        if (response.data?.success) {
          allResults.push(...response.data.data);
        }
        
        setResults(allResults);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleResultClick = (result) => {
    setQuery('');
    setIsOpen(false);
    navigate(result.link);
  };

  const getIcon = (type, customIcon) => {
    if (customIcon) return customIcon;
    switch (type) {
      case 'Menu': return <Compass size={16} style={{ color: '#0ea5e9' }} />;
      case 'Booking': return <Package size={16} style={{ color: 'var(--primary-color)' }} />;
      case 'Client': return <Users size={16} style={{ color: '#2563eb' }} />;
      case 'Vendor': return <Users size={16} style={{ color: '#16a34a' }} />;
      case 'Trip': return <Truck size={16} style={{ color: '#ea580c' }} />;
      case 'Bill': return <FileText size={16} style={{ color: '#9333ea' }} />;
      default: return <Search size={16} />;
    }
  };

  if (!isOpen) return null;

  const displayResults = query.trim().length === 0 ? QUICK_ACTIONS : results;

  return createPortal((
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={() => setIsOpen(false)}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '600px',
          backgroundColor: 'var(--panel-solid-bg)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Area */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <Search size={24} color="var(--primary-color)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for bookings, trips, clients, or type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--text-dark)',
              fontSize: '1.2rem',
              marginLeft: '12px',
              fontFamily: 'Inter, sans-serif'
            }}
          />
          {isLoading && <Loader2 size={20} color="var(--primary-color)" className="spin" />}
          <div style={{ marginLeft: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-color)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>ESC</div>
        </div>

        {/* Results Area */}
        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '1rem' }}>
          {query.trim().length > 0 && results.length === 0 && !isLoading ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ marginBottom: '1rem' }}><Search size={48} opacity={0.2} style={{ margin: '0 auto' }} /></div>
              <p style={{ fontSize: '1.1rem', margin: 0 }}>No results found for "{query}"</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Try searching for a LR number or client name</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {['Quick Action', 'Menu', 'Booking', 'Client', 'Vendor', 'Trip', 'Bill'].map(type => {
                const typeResults = displayResults.filter(r => r.type === type);
                if (typeResults.length === 0) return null;

                return (
                  <div key={type} style={{ marginBottom: '1rem' }}>
                    <div style={{ 
                      padding: '0 0.75rem', 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      textTransform: 'uppercase', 
                      color: 'var(--text-muted)',
                      letterSpacing: '0.05em',
                      marginBottom: '0.5rem'
                    }}>
                      {type}s
                    </div>
                    {typeResults.map((result, idx) => (
                      <div
                        key={`${result.type}-${result.id}-${idx}`}
                        onClick={() => handleResultClick(result)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--primary-glow)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '10px', 
                          background: 'var(--bg-color)', 
                          border: '1px solid var(--border-color)',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {getIcon(result.type, result.icon)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h6 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-dark)', fontWeight: 600 }}>
                            {result.title}
                          </h6>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {result.subtitle}
                          </p>
                        </div>
                        <div style={{ opacity: 0.5 }}>
                          <Compass size={16} color="var(--text-muted)" />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-20px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  ), document.body);
};

export default CommandPalette;
