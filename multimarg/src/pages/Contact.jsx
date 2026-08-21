import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import SEOHead from '../components/SEOHead';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: 'General Inquiry', message: '' });
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      addToast('Name, Email, and Message are required.', 'error');
      return;
    }
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.post(`${apiUrl}/api/public/contact`, form);
      if (response.data.success) {
        addToast('Message sent successfully! We will get back to you soon.', 'success');
        setForm({ name: '', email: '', subject: 'General Inquiry', message: '' });
      }
    } catch (error) {
      console.error('Contact submission error:', error);
      addToast('Failed to send message. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div style={{ paddingTop: '80px', backgroundColor: 'var(--bg-light-grey)', minHeight: '100vh' }}>
      <SEOHead
        title="Contact Us — Get in Touch with Multimarg Carriers"
        description="Contact Multimarg Carriers Pvt. Ltd. for logistics inquiries, freight quotes, partnership opportunities, or branch details. Call +91 5944-324033 or email info@multimarg.com."
        keywords="contact multimarg, multimarg phone number, multimarg email, multimarg address, rudrapur logistics contact, transport inquiry india"
        canonicalPath="/contact"
      />
      {/* Header */}
      <section style={{ 
        background: 'linear-gradient(135deg, var(--primary-blue) 0%, #1e3a8a 100%)', 
        color: 'white',
        padding: '5rem 0',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Abstract Background Shapes */}
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '150px', height: '150px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}></div>
        
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
            <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: '1rem', fontWeight: 800, letterSpacing: '-0.025em' }}>Contact Us</h1>
            <p style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', opacity: 0.9, maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
              Get in touch with our logistics experts. We're here to help you move forward.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
            
            {/* Contact Information */}
            <motion.div 
              initial="hidden" 
              animate="visible" 
              variants={fadeInUp}
              style={{ 
                backgroundColor: 'white', 
                padding: 'clamp(2rem, 4vw, 3rem)', 
                borderRadius: '24px', 
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
                height: 'fit-content',
                border: '1px solid rgba(0,0,0,0.05)'
              }}
            >
              <h2 style={{ fontSize: '2rem', color: 'var(--primary-blue)', marginBottom: '2.5rem', fontWeight: '800' }}>Corporate Office</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{ 
                    width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform 0.3s ease'
                  }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    <MapPin size={26} color="var(--primary-red)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem', color: 'var(--text-main)', fontWeight: '700' }}>Address</h3>
                    <p style={{ color: 'var(--text-light)', lineHeight: 1.6, fontSize: '0.95rem' }}>LIG-194, AVAS VIKAS, RUDRAPUR, Uttarakhand-263153</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{ 
                    width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform 0.3s ease'
                  }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    <Phone size={26} color="var(--primary-red)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem', color: 'var(--text-main)', fontWeight: '700' }}>Phone</h3>
                    <a href="tel:+915944324033" style={{ color: 'var(--primary-blue)', lineHeight: 1.6, textDecoration: 'none', fontSize: '0.95rem', fontWeight: '500' }}>+91 5944-324033</a>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{ 
                    width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform 0.3s ease'
                  }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    <Mail size={26} color="var(--primary-red)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem', color: 'var(--text-main)', fontWeight: '700' }}>Email</h3>
                    <a href="mailto:info@multimarg.com" style={{ color: 'var(--primary-blue)', lineHeight: 1.6, textDecoration: 'none', fontSize: '0.95rem', fontWeight: '500' }}>info@multimarg.com</a>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{ 
                    width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform 0.3s ease'
                  }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    <Clock size={26} color="var(--primary-red)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem', color: 'var(--text-main)', fontWeight: '700' }}>Business Hours</h3>
                    <p style={{ color: 'var(--text-light)', lineHeight: 1.6, fontSize: '0.95rem' }}>Mon - Sat: 9:00 AM - 7:00 PM<br/>Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div 
              initial="hidden" 
              animate="visible" 
              variants={fadeInUp}
              transition={{ delay: 0.2 }}
              style={{ 
                backgroundColor: 'white', 
                padding: 'clamp(2rem, 4vw, 3.5rem)', 
                borderRadius: '24px', 
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
                border: '1px solid rgba(0,0,0,0.05)'
              }}
            >
              <h2 style={{ fontSize: '2rem', color: 'var(--primary-blue)', marginBottom: '2.5rem', fontWeight: '800' }}>Send a Message</h2>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Name</label>
                    <input 
                      type="text" 
                      placeholder="John Doe"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      style={{ 
                        width: '100%', padding: '1rem', borderRadius: '12px', border: '2px solid #e2e8f0',
                        fontSize: '1rem', outline: 'none', transition: 'all 0.3s', backgroundColor: '#f8fafc'
                      }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--primary-blue)'; e.target.style.backgroundColor = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                    <input 
                      type="email" 
                      placeholder="john@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      style={{ 
                        width: '100%', padding: '1rem', borderRadius: '12px', border: '2px solid #e2e8f0',
                        fontSize: '1rem', outline: 'none', transition: 'all 0.3s', backgroundColor: '#f8fafc'
                      }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--primary-blue)'; e.target.style.backgroundColor = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject / Inquiry Type</label>
                  <select 
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    style={{ 
                      width: '100%', padding: '1rem', borderRadius: '12px', border: '2px solid #e2e8f0',
                      fontSize: '1rem', outline: 'none', transition: 'all 0.3s', backgroundColor: '#f8fafc',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--primary-blue)'; e.target.style.backgroundColor = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Get a Quote">Get a Quote</option>
                    <option value="Track Shipment">Track Shipment</option>
                    <option value="Partnership">Partnership</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Message</label>
                  <textarea 
                    rows="6" 
                    placeholder="How can we help you?"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    style={{ 
                      width: '100%', padding: '1rem', borderRadius: '12px', border: '2px solid #e2e8f0',
                      fontSize: '1rem', outline: 'none', transition: 'all 0.3s', resize: 'vertical', backgroundColor: '#f8fafc'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--primary-blue)'; e.target.style.backgroundColor = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                    required
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="btn btn-red" 
                  style={{ 
                    padding: '1.25rem', 
                    fontSize: '1.1rem', 
                    marginTop: '0.5rem', 
                    opacity: loading ? 0.7 : 1,
                    borderRadius: '12px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)',
                    transform: loading ? 'none' : undefined
                  }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Map Section */}
      <section style={{ height: '500px', width: '100%' }}>
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
      </section>
    </div>
  );
};

export default Contact;
