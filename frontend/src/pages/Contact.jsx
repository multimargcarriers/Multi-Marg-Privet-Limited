import React, { useState } from 'react';
import axios from 'axios';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      addToast('Name, Email, and Message are required.', 'warning');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/public/contact`, form);
      if (response.data.success) {
        addToast('Message sent successfully! We will get back to you soon.', 'success');
        setForm({ name: '', email: '', phone: '', subject: '', message: '' });
      }
    } catch (error) {
      console.error('Contact submission error:', error);
      addToast('Failed to send message. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '3rem auto', padding: '0 2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', color: '#0f172a', marginBottom: '1rem' }}>Contact Us</h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Have questions about our transport services? We're here to help. Send us a message and our team will respond shortly.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
        {/* Contact Info */}
        <div style={{ flex: '1', minWidth: '300px', backgroundColor: 'white', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid #e2e8f0', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '2rem', fontWeight: '700' }}>Get in Touch</h3>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <div style={{ padding: '0.85rem', backgroundColor: '#eef2ff', borderRadius: '12px', color: '#4f46e5', flexShrink: 0, transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <MapPin size={24} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e293b', fontSize: '1.05rem', fontWeight: '600' }}>Head Office</h4>
              <p style={{ margin: 0, color: '#64748b', lineHeight: '1.6', fontSize: '0.95rem' }}>
                Multi Marg Carriers<br />
                Rudrapur, Uttarakhand, India
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <div style={{ padding: '0.85rem', backgroundColor: '#eef2ff', borderRadius: '12px', color: '#4f46e5', flexShrink: 0, transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <Phone size={24} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e293b', fontSize: '1.05rem', fontWeight: '600' }}>Phone</h4>
              <a href="tel:+915944324033" style={{ margin: 0, color: '#4f46e5', lineHeight: '1.6', textDecoration: 'none', fontWeight: '500', fontSize: '0.95rem' }}>+91 5944-324033</a>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
            <div style={{ padding: '0.85rem', backgroundColor: '#eef2ff', borderRadius: '12px', color: '#4f46e5', flexShrink: 0, transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <Mail size={24} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e293b', fontSize: '1.05rem', fontWeight: '600' }}>Email</h4>
              <a href="mailto:info@multimarg.com" style={{ margin: 0, color: '#4f46e5', lineHeight: '1.6', textDecoration: 'none', fontWeight: '500', fontSize: '0.95rem' }}>info@multimarg.com</a>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div style={{ flex: '2', minWidth: '320px', backgroundColor: 'white', padding: 'clamp(2rem, 4vw, 3rem)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '2rem', fontWeight: '700' }}>Send us a Message</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Your Name *</label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  placeholder="John Doe"
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '1rem', transition: 'all 0.3s', outline: 'none', backgroundColor: '#f8fafc' }}
                  onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.backgroundColor = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Your Email *</label>
                <input 
                  type="email" 
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})} 
                  placeholder="john@example.com"
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '1rem', transition: 'all 0.3s', outline: 'none', backgroundColor: '#f8fafc' }}
                  onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.backgroundColor = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; }}
                  required
                />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Phone Number</label>
                <input 
                  type="tel" 
                  value={form.phone} 
                  onChange={e => setForm({...form, phone: e.target.value})} 
                  placeholder="+91 9876543210"
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '1rem', transition: 'all 0.3s', outline: 'none', backgroundColor: '#f8fafc' }}
                  onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.backgroundColor = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Subject</label>
                <input 
                  type="text" 
                  value={form.subject} 
                  onChange={e => setForm({...form, subject: e.target.value})} 
                  placeholder="How can we help?"
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '1rem', transition: 'all 0.3s', outline: 'none', backgroundColor: '#f8fafc' }}
                  onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.backgroundColor = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; }}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Message *</label>
              <textarea 
                value={form.message} 
                onChange={e => setForm({...form, message: e.target.value})} 
                placeholder="Write your message here..."
                style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '1rem', minHeight: '150px', resize: 'vertical', transition: 'all 0.3s', outline: 'none', backgroundColor: '#f8fafc' }}
                onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.backgroundColor = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; }}
                required
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '1rem', 
                backgroundColor: '#4f46e5', 
                color: 'white', 
                border: 'none', 
                borderRadius: '10px', 
                fontSize: '1.1rem', 
                fontWeight: '600', 
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: loading ? 0.8 : 1,
                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.3)',
                transition: 'all 0.2s',
                transform: loading ? 'none' : undefined
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading ? 'Sending...' : (
                <>
                  Send Message <Send size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
