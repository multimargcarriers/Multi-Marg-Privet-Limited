import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail } from 'lucide-react';

const Branches = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const regions = [
    {
      name: "North India Hub",
      branches: [
        { city: "Rudrapur, Uttarakhand", address: "LIG-194, AVAS VIKAS, RUDRAPUR, Uttarakhand-263153", phone: "+91 5944-324033", type: "Corporate Office" },
        { city: "Chandigarh", address: "Phase 1, Industrial Area", phone: "+91-XXXXXXXXXX", type: "Branch Office" },
        { city: "Jaipur", address: "VKI Area, Jaipur", phone: "+91-XXXXXXXXXX", type: "Branch Office" }
      ]
    },
    {
      name: "West India Hub",
      branches: [
        { city: "Mumbai", address: "Andheri East, Mumbai", phone: "+91-XXXXXXXXXX", type: "Regional Head" },
        { city: "Ahmedabad", address: "Sarkhej, Ahmedabad", phone: "+91-XXXXXXXXXX", type: "Branch Office" },
        { city: "Pune", address: "Chakan Industrial Area", phone: "+91-XXXXXXXXXX", type: "Branch Office" }
      ]
    },
    {
      name: "South India Hub",
      branches: [
        { city: "Bengaluru", address: "Peenya Industrial Area", phone: "+91-XXXXXXXXXX", type: "Regional Head" },
        { city: "Chennai", address: "Guindy Industrial Estate", phone: "+91-XXXXXXXXXX", type: "Branch Office" },
        { city: "Hyderabad", address: "Jeedimetla", phone: "+91-XXXXXXXXXX", type: "Branch Office" }
      ]
    }
  ];

  return (
    <div style={{ paddingTop: '80px' }}>
      <section style={{ 
        backgroundColor: 'var(--primary-blue)', 
        color: 'white',
        padding: '5rem 0',
        position: 'relative'
      }}>
        {/* Subtle map background */}
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          opacity: 0.5
        }} />
        
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <motion.div initial="hidden" animate="visible" variants={fadeInUp} style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 800 }}>Our Pan-India Network</h1>
            <p style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', opacity: 0.9 }}>
              Strategic locations across the nation to ensure your cargo reaches its destination efficiently.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="container">
          {regions.map((region, idx) => (
            <div key={idx} style={{ marginBottom: '4rem' }}>
              <motion.div 
                initial="hidden" 
                whileInView="visible" 
                viewport={{ once: true }} 
                variants={fadeInUp}
              >
                <h2 style={{ 
                  fontSize: '2rem', 
                  color: 'var(--primary-red)', 
                  marginBottom: '2rem',
                  borderBottom: '2px solid var(--border-color)',
                  paddingBottom: '0.5rem',
                  display: 'inline-block'
                }}>
                  {region.name}
                </h2>
              </motion.div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {region.branches.map((branch, bIdx) => (
                  <motion.div
                    key={bIdx}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeInUp}
                    transition={{ delay: bIdx * 0.1 }}
                    style={{ 
                      backgroundColor: 'white', 
                      padding: '2rem', 
                      borderRadius: '12px', 
                      boxShadow: 'var(--shadow-sm)',
                      border: '1px solid var(--border-color)',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                    }}
                    whileHover={{ y: -5, boxShadow: 'var(--shadow-md)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1.4rem', color: 'var(--primary-blue)', margin: 0 }}>{branch.city}</h3>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.25rem 0.75rem', 
                        backgroundColor: branch.type === 'Corporate Office' ? 'var(--primary-red)' : 'var(--bg-light-grey)',
                        color: branch.type === 'Corporate Office' ? 'white' : 'var(--text-light)',
                        borderRadius: '20px',
                        fontWeight: 600
                      }}>
                        {branch.type}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: 'var(--text-main)' }}>
                        <MapPin size={20} color="var(--primary-red)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ lineHeight: 1.5 }}>{branch.address}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
                        <Phone size={20} color="var(--primary-red)" style={{ flexShrink: 0 }} />
                        <span>{branch.phone}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Branches;
