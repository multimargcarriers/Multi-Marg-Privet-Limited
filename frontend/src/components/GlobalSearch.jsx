import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Package, Users, Truck, FileText, X } from 'lucide-react';
import axios from 'axios';

const GlobalSearch = ({ isMobile = false }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce API calls
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
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
        
        if (response.data?.success) {
          setResults(response.data.data);
          setIsOpen(true);
        }
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

  const getIcon = (type) => {
    switch (type) {
      case 'Booking': return <Package size={16} style={{ color: 'var(--primary-color)' }} />;
      case 'Client': return <Users size={16} style={{ color: '#2563eb' }} />;
      case 'Vendor': return <Users size={16} style={{ color: '#16a34a' }} />;
      case 'Trip': return <Truck size={16} style={{ color: '#ea580c' }} />;
      case 'Bill': return <FileText size={16} style={{ color: '#9333ea' }} />;
      default: return <Search size={16} />;
    }
  };

  return (
    <div 
      ref={searchRef} 
      style={{ 
        position: 'relative', 
        width: '100%', 
        maxWidth: isMobile ? '100%' : '350px'
      }}
    >
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          background: isMobile ? 'transparent' : 'rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          padding: '0.4rem 0.8rem',
          border: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
          borderBottom: isMobile ? '1px solid var(--border-color)' : '1px solid rgba(255, 255, 255, 0.2)',
          transition: 'all 0.3s ease',
          boxShadow: isOpen && !isMobile ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        <Search size={16} color={isMobile ? "var(--text-muted)" : "#fff"} />
        <input
          type="text"
          placeholder="Search LRs, Clients, Trips..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            width: '100%',
            color: isMobile ? 'var(--text-dark)' : '#fff',
            fontSize: isMobile ? '0.85rem' : '0.9rem',
            marginLeft: '8px'
          }}
        />
        {isLoading && <Loader2 size={16} color={isMobile ? "var(--text-muted)" : "#fff"} className="spin" />}
        {query && !isLoading && (
          <button 
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={14} color={isMobile ? "var(--text-muted)" : "rgba(255,255,255,0.7)"} />
          </button>
        )}
      </div>

      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: '100%',
            background: 'var(--surface-color, #fff)',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--border-color)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No results found for "{query}"
            </div>
          ) : (
            <div style={{ padding: '0.5rem 0' }}>
              {/* Group results by type */}
              {['Booking', 'Client', 'Vendor', 'Trip', 'Bill'].map(type => {
                const typeResults = results.filter(r => r.type === type);
                if (typeResults.length === 0) return null;

                return (
                  <div key={type} style={{ marginBottom: '0.5rem' }}>
                    <div style={{ 
                      padding: '0.25rem 1rem', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      textTransform: 'uppercase', 
                      color: 'var(--text-muted)',
                      letterSpacing: '0.5px'
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
                          padding: '0.75rem 1rem',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background-color)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '8px', 
                          background: 'var(--background-color)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          {getIcon(result.type)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h6 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {result.title}
                          </h6>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {result.subtitle}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
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
  );
};

export default GlobalSearch;
