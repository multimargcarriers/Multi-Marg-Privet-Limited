import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  MessageCircle, X, Send, RotateCcw, Bot, User, 
  Package, Truck, ChevronDown, MapPin, Phone, Mail, Search, HelpCircle
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || ''}/api`;

const renderMessageContent = (text) => {
  if (!text) return "";
  const parts = text.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} style={{ fontWeight: 800 }}>{part}</strong>;
    }
    return part;
  });
};

const Chatbot = () => {
  const [enabled, setEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to **Multimarg Carriers Private Limited**! 🚛\n\nI am your AI Support Assistant. How can I help you today? You can choose one of the quick features below, ask me a question, or track your shipment!'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedTracking, setExpandedTracking] = useState({});
  const [activeFaqId, setActiveFaqId] = useState(null);
  const [branchSearch, setBranchSearch] = useState('');

  const messagesEndRef = useRef(null);

  // Check if chatbot is enabled
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await axios.get(`${API}/public/chatbot/config`);
        if (res.data && res.data.success) {
          setEnabled(res.data.enabled);
        }
      } catch (err) {
        console.error("Failed to fetch chatbot config status:", err);
        setEnabled(false);
      }
    };
    checkConfig();
  }, []);

  // Handle screen resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    if (!textToSend) setInputText('');

    // Append user message
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build history payload
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      const res = await axios.post(`${API}/public/chatbot/chat`, {
        message: text,
        history
      });

      if (res.data && res.data.success) {
        const assistantMsg = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: res.data.response,
          trackingData: res.data.trackingData,
          servicesData: res.data.servicesData,
          branchesData: res.data.branchesData,
          faqsData: res.data.faqsData,
          contactData: res.data.contactData
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        throw new Error(res.data.message || "Unknown error");
      }
    } catch (err) {
      console.error("Chatbot query error:", err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: "I apologize, I am experiencing network connectivity issues. Please try again in a moment, or feel free to contact our customer support directly."
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const triggerFeature = (featureName) => {
    if (featureName === 'SERVICES') {
      handleSend("Show me the services offered by Multimarg Carriers 🚛");
    } else if (featureName === 'BRANCHES') {
      handleSend("Show me the branch offices and contact details 📍");
    } else if (featureName === 'CONTACT') {
      handleSend("What are the customer support helplines and addresses? 📞");
    } else if (featureName === 'FAQS') {
      handleSend("Browse FAQ help desk 💡");
    } else if (featureName === 'TRACK_GUIDE') {
      handleSend("How can I track my shipment? 📦");
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Chat history cleared. Welcome to **Multimarg Carriers Private Limited**! 🚛\n\nI am your AI Support Assistant. How can I help you today?'
      }
    ]);
    setActiveFaqId(null);
    setBranchSearch('');
  };

  const toggleTrackingDetails = (msgId) => {
    setExpandedTracking(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  if (!enabled) return null;

  return (
    <div style={{ zIndex: 99999, position: 'relative' }}>
      {/* 1. FLOATING CHAT BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Chat Support"
          title="Chat with Multimarg AI"
          style={{
            position: 'fixed',
            bottom: isMobile ? '20px' : '26px',
            right: isMobile ? '20px' : '26px',
            width: isMobile ? '48px' : '54px',
            height: isMobile ? '48px' : '54px',
            borderRadius: '50%',
            backgroundColor: '#0B1B3D',
            color: '#ffffff',
            border: '2px solid #ffffff',
            boxShadow: '0 8px 24px rgba(11, 27, 61, 0.35), 0 2px 10px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(11, 27, 61, 0.5), 0 4px 12px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(11, 27, 61, 0.35), 0 2px 10px rgba(0,0,0,0.12)';
          }}
        >
          <MessageCircle size={isMobile ? 22 : 24} />
        </button>
      )}

      {/* 2. CHAT PANEL */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: isMobile ? '16px' : '26px',
            right: isMobile ? '16px' : '26px',
            width: isMobile ? 'calc(100vw - 32px)' : '385px',
            height: isMobile ? 'calc(100vh - 32px)' : '550px',
            maxHeight: isMobile ? 'none' : '650px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            animation: 'slideUpChat 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            fontFamily: "'Roboto', sans-serif"
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1rem 1.25rem',
              background: 'linear-gradient(135deg, #0B1B3D 0%, #172a53 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#C8102E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(200, 16, 46, 0.3)'
                }}
              >
                <Bot size={20} color="#ffffff" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, letterSpacing: '0.2px' }}>Multimarg AI Support</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                  <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 500 }}>Answers Instantly • Online</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={handleResetChat}
                title="Restart Conversation"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Chat"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div
            style={{
              flex: 1,
              padding: '1rem',
              overflowY: 'auto',
              backgroundColor: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            {messages.map((msg) => {
              const isBot = msg.role === 'assistant';
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {/* Message Bubble wrapper */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: isBot ? 'flex-start' : 'flex-end',
                      alignItems: 'flex-start',
                      gap: '0.5rem'
                    }}
                  >
                    {isBot && (
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#0B1B3D',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px'
                        }}
                      >
                        <Bot size={15} color="#ffffff" />
                      </div>
                    )}
                    
                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '0.7rem 0.9rem',
                        borderRadius: isBot ? '4px 14px 14px 14px' : '14px 14px 4px 14px',
                        backgroundColor: isBot ? '#ffffff' : '#0B1B3D',
                        color: isBot ? '#1e293b' : '#ffffff',
                        fontSize: '0.88rem',
                        lineHeight: 1.45,
                        boxShadow: isBot ? '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.03)' : 'none',
                        border: isBot ? '1px solid #eaeaea' : 'none',
                        whiteSpace: 'pre-line'
                      }}
                    >
                      {renderMessageContent(msg.content)}
                    </div>
                  </div>

                  {/* --- FEATURE PANEL OPTIONS GRID (Shown on welcome message) --- */}
                  {msg.id === 'welcome' && (
                    <div
                      style={{
                        marginLeft: '36px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.5rem',
                        marginTop: '0.25rem'
                      }}
                    >
                      <button
                        onClick={() => triggerFeature('TRACK_GUIDE')}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#0B1B3D',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0B1B3D'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
                      >
                        <Package size={14} color="#C8102E" /> Track Cargo 📦
                      </button>
                      <button
                        onClick={() => triggerFeature('SERVICES')}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#0B1B3D',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0B1B3D'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
                      >
                        <Truck size={14} color="#C8102E" /> View Services 🚛
                      </button>
                      <button
                        onClick={() => triggerFeature('BRANCHES')}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#0B1B3D',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0B1B3D'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
                      >
                        <MapPin size={14} color="#C8102E" /> Locate Branch 📍
                      </button>
                      <button
                        onClick={() => triggerFeature('CONTACT')}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#0B1B3D',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0B1B3D'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
                      >
                        <Phone size={14} color="#C8102E" /> Support Help 📞
                      </button>
                      <button
                        onClick={() => triggerFeature('FAQS')}
                        style={{
                          gridColumn: 'span 2',
                          padding: '0.5rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#0B1B3D',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0B1B3D'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
                      >
                        <HelpCircle size={14} color="#C8102E" /> Browse Help Desk FAQs 💡
                      </button>
                    </div>
                  )}

                  {/* --- RENDER DETECTED SERVICES FEATURE CARD --- */}
                  {isBot && msg.servicesData && (
                    <div
                      style={{
                        marginLeft: '36px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        marginTop: '0.25rem'
                      }}
                    >
                      {msg.servicesData.map((srv, idx) => (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                          }}
                        >
                          <h5 style={{ margin: '0 0 4px 0', color: '#0B1B3D', fontSize: '0.82rem', fontWeight: 800 }}>
                            {srv.name}
                          </h5>
                          <p style={{ margin: 0, color: '#64748b', fontSize: '0.72rem', lineHeight: 1.35 }}>
                            {srv.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* --- RENDER DETECTED BRANCH locator CARD --- */}
                  {isBot && msg.branchesData && (
                    <div
                      style={{
                        marginLeft: '36px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '0.75rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        marginTop: '0.25rem'
                      }}
                    >
                      {/* Search Bar inside card */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>
                        <Search size={13} color="#94a3b8" />
                        <input
                          type="text"
                          value={branchSearch}
                          onChange={(e) => setBranchSearch(e.target.value)}
                          placeholder="SEARCH BRANCH CITY..."
                          style={{
                            background: 'none',
                            border: 'none',
                            outline: 'none',
                            fontSize: '0.7rem',
                            width: '100%',
                            color: '#334155',
                            fontWeight: 700
                          }}
                        />
                        {branchSearch && <X size={12} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setBranchSearch('')} />}
                      </div>

                      {/* Filtered Branch List */}
                      <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '2px' }}>
                        {msg.branchesData
                          .filter(b => b.branch.toLowerCase().includes(branchSearch.toLowerCase()))
                          .map((b, idx) => (
                            <div
                              key={idx}
                              style={{
                                borderBottom: idx < msg.branchesData.length - 1 ? '1px solid #f1f5f9' : 'none',
                                paddingBottom: '0.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0B1B3D' }}>{b.branch}</span>
                                <span style={{ fontSize: '0.62rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#64748b', padding: '1px 5px', borderRadius: '4px' }}>{b.code}</span>
                              </div>
                              <span style={{ fontSize: '0.7rem', color: '#334155', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                                <MapPin size={11} style={{ marginTop: '2px', flexShrink: 0 }} /> {b.address}
                              </span>
                              {b.name && <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>CONTACT: {b.name}</span>}
                              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2px' }}>
                                <a href={`tel:${b.phno}`} style={{ fontSize: '0.68rem', color: '#C8102E', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                  <Phone size={10} /> {b.phno}
                                </a>
                                {b.email && (
                                  <a href={`mailto:${b.email}`} style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <Mail size={10} /> {b.email}
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        {msg.branchesData.filter(b => b.branch.toLowerCase().includes(branchSearch.toLowerCase())).length === 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', padding: '10px 0' }}>NO MATCHING BRANCH FOUND</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* --- RENDER CONTACT SUPPORT CARD --- */}
                  {isBot && msg.contactData && (
                    <div
                      style={{
                        marginLeft: '36px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '1rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                        marginTop: '0.25rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bot size={18} color="#C8102E" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0B1B3D' }}>MULTIMARG HELP DESK</span>
                      </div>
                      <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={14} color="#64748b" />
                          <div>
                            <span style={{ fontSize: '0.62rem', color: '#94a3b8', display: 'block' }}>HELPLINE NUMBER:</span>
                            <a href="tel:+915944324033" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#C8102E' }}>+91 5944-324033</a>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Mail size={14} color="#64748b" />
                          <div>
                            <span style={{ fontSize: '0.62rem', color: '#94a3b8', display: 'block' }}>EMAIL ADDRESS:</span>
                            <a href="mailto:info@multimarg.com" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0B1B3D' }}>info@multimarg.com</a>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <MapPin size={14} color="#64748b" style={{ marginTop: '2px' }} />
                          <div>
                            <span style={{ fontSize: '0.62rem', color: '#94a3b8', display: 'block' }}>CORPORATE OFFICE:</span>
                            <span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 600 }}>
                              LIG-194, NEAR NATIONAL PUBLIC SCHOOL, AVAS VIKAS, RUDRAPUR-263153, UTTARAKHAND
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- RENDER HELP DESK FAQS ACCORDION CARD --- */}
                  {isBot && msg.faqsData && (
                    <div
                      style={{
                        marginLeft: '36px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '0.5rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        marginTop: '0.25rem'
                      }}
                    >
                      {msg.faqsData.map((faq) => {
                        const isExpanded = activeFaqId === faq.id;
                        return (
                          <div
                            key={faq.id}
                            style={{
                              border: '1px solid #f1f5f9',
                              borderRadius: '6px',
                              overflow: 'hidden'
                            }}
                          >
                            <button
                              onClick={() => setActiveFaqId(isExpanded ? null : faq.id)}
                              style={{
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.6rem 0.75rem',
                                backgroundColor: isExpanded ? '#f8fafc' : '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#0B1B3D',
                                gap: '0.5rem'
                              }}
                            >
                              <span>{faq.question}</span>
                              <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
                            </button>
                            {isExpanded && (
                              <div
                                style={{
                                  padding: '0.6rem 0.75rem',
                                  fontSize: '0.72rem',
                                  color: '#64748b',
                                  lineHeight: 1.4,
                                  backgroundColor: '#ffffff',
                                  borderTop: '1px solid #f1f5f9',
                                  whiteSpace: 'pre-line'
                                }}
                              >
                                {faq.answer}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Render Visual Tracking Card if trackingData is available */}
                  {isBot && msg.trackingData && (
                    <div
                      style={{
                        marginLeft: '36px',
                        marginTop: '0.25rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '1rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      {/* Tracking Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Package size={16} color="#0B1B3D" />
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0B1B3D' }}>
                            {String(msg.trackingData.booking?.awb || 'Shipment').toUpperCase()}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '20px',
                            backgroundColor: 
                              String(msg.trackingData.booking?.status || '').includes('DELIVER') ? '#ecfdf5' : '#eff6ff',
                            color: 
                              String(msg.trackingData.booking?.status || '').includes('DELIVER') ? '#059669' : '#2563eb',
                            textTransform: 'uppercase'
                          }}
                        >
                          {msg.trackingData.booking?.status || 'IN TRANSIT'}
                        </span>
                      </div>

                      {/* Route Info */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', margin: '2px 0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Origin</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                            {msg.trackingData.booking?.origin || 'N/A'}
                          </span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ height: '1.5px', backgroundColor: '#cbd5e1', flex: 1, position: 'relative' }} />
                          <Truck size={14} color="#94a3b8" style={{ margin: '0 6px' }} />
                          <div style={{ height: '1.5px', backgroundColor: '#cbd5e1', flex: 1 }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Destination</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                            {msg.trackingData.booking?.destination || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Packages & Weight info */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', backgroundColor: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                        <div>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Packages count:</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
                            {msg.trackingData.booking?.box || 'N/A'} Boxes
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Total weight:</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
                            {msg.trackingData.booking?.weight ? `${msg.trackingData.booking.weight} kg` : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Transit Logs Toggle Button */}
                      {msg.trackingData.entries && msg.trackingData.entries.length > 0 && (
                        <div>
                          <button
                            onClick={() => toggleTrackingDetails(msg.id)}
                            style={{
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              color: '#C8102E',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              padding: '2px 0'
                            }}
                          >
                            {expandedTracking[msg.id] ? (
                              <>Hide detailed timeline <ChevronDown size={13} style={{ transform: 'rotate(180deg)' }} /></>
                            ) : (
                              <>View detailed timeline <ChevronDown size={13} /></>
                            )}
                          </button>

                          {/* Expanded Transit Log History */}
                          {expandedTracking[msg.id] && (
                            <div style={{ marginTop: '0.5rem', borderTop: '1px dashed #e2e8f0', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                              {msg.trackingData.entries.map((entry, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                                  {/* Line connector */}
                                  {idx < msg.trackingData.entries.length - 1 && (
                                    <div style={{ position: 'absolute', left: '7.5px', top: '16px', bottom: '-10px', width: '1px', backgroundColor: '#cbd5e1' }} />
                                  )}
                                  {/* Dot */}
                                  <div
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      backgroundColor: idx === 0 ? '#C8102E' : '#94a3b8',
                                      border: '3px solid #ffffff',
                                      boxShadow: '0 0 0 1px #cbd5e1',
                                      flexShrink: 0,
                                      marginTop: '2px'
                                    }}
                                  />
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: idx === 0 ? '#C8102E' : '#475569' }}>
                                      {entry.status} at {entry.location || 'Branch'}
                                    </span>
                                    <span style={{ fontSize: '0.62rem', color: '#64748b' }}>
                                      {new Date(entry.date).toLocaleString()}
                                    </span>
                                    {entry.remarks && (
                                      <span style={{ fontSize: '0.68rem', color: '#64748b', fontStyle: 'italic', marginTop: '1px' }}>
                                        Remarks: {entry.remarks}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {loading && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#0B1B3D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}
                >
                  <Bot size={15} color="#ffffff" />
                </div>
                <div
                  style={{
                    padding: '0.7rem 0.9rem',
                    borderRadius: '4px 14px 14px 14px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #eaeaea',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                  }}
                >
                  <span className="dot-typing" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#64748b', display: 'inline-block', animation: 'bounceChat 1.4s infinite ease-in-out both' }} />
                  <span className="dot-typing" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#64748b', display: 'inline-block', animation: 'bounceChat 1.4s infinite ease-in-out both 0.2s' }} />
                  <span className="dot-typing" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#64748b', display: 'inline-block', animation: 'bounceChat 1.4s infinite ease-in-out both 0.4s' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Dynamic Suggestion Chips */}
          {!loading && (
            <div
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                gap: '0.4rem',
                overflowX: 'auto',
                flexShrink: 0,
                borderTop: '1px solid #e2e8f0',
                scrollbarWidth: 'none'
              }}
            >
              <button
                onClick={() => triggerFeature('TRACK_GUIDE')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '15px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0B1B3D',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                Track Shipment 📦
              </button>
              <button
                onClick={() => triggerFeature('SERVICES')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '15px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0B1B3D',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                Our Services 🚛
              </button>
              <button
                onClick={() => triggerFeature('BRANCHES')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '15px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0B1B3D',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                Office Locations 📍
              </button>
              <button
                onClick={() => triggerFeature('CONTACT')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '15px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0B1B3D',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                Helpline 📞
              </button>
            </div>
          )}

          {/* Input Footer */}
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #eaeaea',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything or track shipment..."
              style={{
                flex: 1,
                padding: '0.55rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#0B1B3D'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !inputText.trim()}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: (loading || !inputText.trim()) ? '#cbd5e1' : '#0B1B3D',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (loading || !inputText.trim()) ? 'default' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Embedded keyframe styles for smooth animations */}
      <style>{`
        @keyframes slideUpChat {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes bounceChat {
          0%, 80%, 100% { 
            transform: scale(0);
          } 
          40% { 
            transform: scale(1.0);
          }
        }
      `}</style>
    </div>
  );
};

export default Chatbot;
