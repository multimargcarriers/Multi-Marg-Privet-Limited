import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

const Contact = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div style={{ paddingTop: '80px', backgroundColor: 'var(--bg-light-grey)', minHeight: '100vh' }}>
      {/* Header */}
      <section style={{ 
        backgroundColor: 'var(--primary-blue)', 
        color: 'white',
        padding: '4rem 0',
        textAlign: 'center'
      }}>
        <div className="container">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 800 }}>Contact Us</h1>
            <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
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
                padding: '3rem', 
                borderRadius: '16px', 
                boxShadow: 'var(--shadow-md)',
                height: 'fit-content'
              }}
            >
              <h2 style={{ fontSize: '2rem', color: 'var(--primary-blue)', marginBottom: '2rem' }}>Corporate Office</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ 
                    width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--bg-light-grey)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <MapPin size={24} color="var(--primary-red)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem', color: 'var(--text-main)' }}>Address</h3>
                    <p style={{ color: 'var(--text-light)', lineHeight: 1.6 }}>LIG-194, AVAS VIKAS, RUDRAPUR, UK-263153</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ 
                    width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--bg-light-grey)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Phone size={24} color="var(--primary-red)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem', color: 'var(--text-main)' }}>Phone</h3>
                    <p style={{ color: 'var(--text-light)', lineHeight: 1.6 }}>+05944-324033</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ 
                    width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--bg-light-grey)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Mail size={24} color="var(--primary-red)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem', color: 'var(--text-main)' }}>Email</h3>
                    <p style={{ color: 'var(--text-light)', lineHeight: 1.6 }}>info@multimargcarriers.co.in</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ 
                    width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--bg-light-grey)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Clock size={24} color="var(--primary-red)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem', color: 'var(--text-main)' }}>Business Hours</h3>
                    <p style={{ color: 'var(--text-light)', lineHeight: 1.6 }}>Mon - Sat: 9:00 AM - 7:00 PM<br/>Sunday: Closed</p>
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
                padding: '3rem', 
                borderRadius: '16px', 
                boxShadow: 'var(--shadow-md)'
              }}
            >
              <h2 style={{ fontSize: '2rem', color: 'var(--primary-blue)', marginBottom: '2rem' }}>Send a Message</h2>
              
              <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-main)' }}>Your Name</label>
                    <input 
                      type="text" 
                      placeholder="John Doe"
                      style={{ 
                        width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                        fontSize: '1rem', outline: 'none', transition: 'border-color 0.3s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--primary-blue)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    />
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-main)' }}>Email Address</label>
                    <input 
                      type="email" 
                      placeholder="john@example.com"
                      style={{ 
                        width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                        fontSize: '1rem', outline: 'none', transition: 'border-color 0.3s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--primary-blue)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-main)' }}>Subject / Inquiry Type</label>
                  <select 
                    style={{ 
                      width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                      fontSize: '1rem', outline: 'none', transition: 'border-color 0.3s', backgroundColor: 'white'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-blue)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  >
                    <option>General Inquiry</option>
                    <option>Get a Quote</option>
                    <option>Track Shipment</option>
                    <option>Partnership</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-main)' }}>Your Message</label>
                  <textarea 
                    rows="5" 
                    placeholder="How can we help you?"
                    style={{ 
                      width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                      fontSize: '1rem', outline: 'none', transition: 'border-color 0.3s', resize: 'vertical'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-blue)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  ></textarea>
                </div>

                <button type="submit" className="btn btn-red" style={{ padding: '1rem', fontSize: '1.1rem', marginTop: '1rem' }}>
                  Send Message
                </button>
              </form>
            </motion.div>

          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
