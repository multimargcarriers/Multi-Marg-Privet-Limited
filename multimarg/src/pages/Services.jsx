import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/public/cms/services`);
        if (res.data.success) {
          setServices(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching services:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const getIcon = (iconName) => {
    const IconComponent = Icons[iconName];
    if (IconComponent) {
      return <IconComponent size={48} color="var(--primary-red)" />;
    }
    return <Icons.Package size={48} color="var(--primary-red)" />; // Fallback
  };

  return (
    <div style={{ paddingTop: '80px' }}>
      {/* Hero Section */}
      <section style={{ 
        backgroundColor: 'var(--bg-light-grey)',
        padding: '5rem 0',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div className="container">
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={fadeInUp}
            style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}
          >
            <h1 style={{ fontSize: '3rem', color: 'var(--primary-blue)', marginBottom: '1.5rem' }}>Our Services</h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-light)', lineHeight: 1.6 }}>
              Comprehensive logistics and transport solutions tailored to meet the unique demands of your business. We deliver excellence, every mile.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="section-padding">
        <div className="container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-light)' }}>
              Loading services...
            </div>
          ) : services.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-light)' }}>
              No services found.
            </div>
          ) : (
            <motion.div 
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2.5rem' }}
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
            >
              {services.map((service, index) => (
                <motion.div 
                  key={service.id || index}
                  variants={fadeInUp}
                  style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '16px', 
                    boxShadow: 'var(--shadow-md)',
                    overflow: 'hidden',
                    position: 'relative',
                    border: '1px solid var(--border-color)',
                    transition: 'all 0.3s ease'
                  }}
                  whileHover={{ 
                    y: -10, 
                    boxShadow: 'var(--shadow-lg)',
                    borderColor: 'var(--primary-red)'
                  }}
                >
                  <div style={{ 
                    height: '6px', 
                    width: '100%', 
                    background: 'linear-gradient(90deg, var(--primary-red) 0%, var(--primary-blue) 100%)' 
                  }} />
                  
                  <div style={{ padding: '2.5rem' }}>
                    <div style={{ marginBottom: '1.5rem', display: 'inline-block', padding: '1rem', backgroundColor: 'var(--bg-light-grey)', borderRadius: '12px' }}>
                      {getIcon(service.icon)}
                    </div>
                    <h3 style={{ fontSize: '1.5rem', color: 'var(--primary-blue)', marginBottom: '1rem' }}>{service.title}</h3>
                    <p style={{ color: 'var(--text-main)', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1rem' }}>
                      {service.shortDescription}
                    </p>
                    <p style={{ color: 'var(--text-light)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                      {service.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ backgroundColor: 'var(--primary-blue)', color: 'white', padding: '4rem 0', textAlign: 'center' }}>
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Ready to optimize your supply chain?</h2>
            <p style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
              Contact our experts today for a customized logistics solution tailored to your specific requirements.
            </p>
            <Link to="/quote" className="btn btn-red" style={{ fontSize: '1.1rem', padding: '1rem 2.5rem' }}>
              Request a Quote
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Services;
