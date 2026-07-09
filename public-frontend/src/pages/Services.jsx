import React from 'react';
import { motion } from 'framer-motion';
import { Truck, PackageSearch, Warehouse, Globe, Zap, Navigation } from 'lucide-react';

const Services = () => {
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

  const services = [
    {
      icon: <Zap size={48} color="var(--primary-red)" />,
      title: "Air Transport",
      desc: "Sky-High Speed, Global Reach. Emphasizes fast and expansive nature of air transport, ensuring quick deliveries across long distances.",
      features: ["Guaranteed delivery times", "Priority handling", "Global network"]
    },
    {
      icon: <Truck size={48} color="var(--primary-red)" />,
      title: "Road Transport",
      desc: "On Time, Every Mile. Emphasizes reliability and punctuality, ensuring goods reach destination safely and on schedule.",
      features: ["Point-to-point delivery", "Real-time tracking", "Extensive fleet"]
    },
    {
      icon: <Globe size={48} color="var(--primary-red)" />,
      title: "Import & Export",
      desc: "Bridging Markets, Ensuring Quality Delivery. Emphasizes smooth global trade connections and dependable, high-standard service.",
      features: ["Customs clearance", "International shipping", "Compliance support"]
    },
    {
      icon: <Navigation size={48} color="var(--primary-red)" />,
      title: "Rail Transport",
      desc: "Efficient Rail, Reliable Logistics. Emphasizes efficiency and dependability for logistics, ensuring fast, safe, and reliable delivery of goods via rail.",
      features: ["Cost-effective", "Bulk cargo", "Environmentally friendly"]
    },
    {
      icon: <Warehouse size={48} color="var(--primary-red)" />,
      title: "Warehousing",
      desc: "Secure Storage, Seamless Supply. Emphasizes reliability of goods, ensuring efficient inventory management and easy access.",
      features: ["Inventory management", "Cross-docking", "24/7 security"]
    },
    {
      icon: <PackageSearch size={48} color="var(--primary-red)" />,
      title: "Supply Chain Management",
      desc: "Expert handling of transportation, storage, and distribution of goods, ensuring products move efficiently from suppliers to customers.",
      features: ["End-to-end management", "Last-mile delivery", "Process optimization"]
    }
  ];

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
          <motion.div 
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2.5rem' }}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {services.map((service, index) => (
              <motion.div 
                key={index}
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
                    {service.icon}
                  </div>
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--primary-blue)', marginBottom: '1rem' }}>{service.title}</h3>
                  <p style={{ color: 'var(--text-light)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    {service.desc}
                  </p>
                  
                  <ul style={{ padding: 0 }}>
                    {service.features.map((feature, fIndex) => (
                      <li key={fIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-red)' }} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </motion.div>
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
            <a href="/contact" className="btn btn-red" style={{ fontSize: '1.1rem', padding: '1rem 2.5rem' }}>
              Request a Quote
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Services;
