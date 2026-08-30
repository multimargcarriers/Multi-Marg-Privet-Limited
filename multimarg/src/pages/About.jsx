import React from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, ShieldCheck, Clock } from 'lucide-react';
import SEOHead from '../components/SEOHead';

const About = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div style={{ paddingTop: '80px' }}>
      <SEOHead
        title="About Us — Premier Logistics Partner"
        description="Learn about Multimarg Carriers Private Limited — India's trusted logistics company. Our mission is to provide reliable, efficient, and cost-effective transport solutions across India with integrity and innovation."
        keywords="about multimarg, multimarg history, logistics company rudrapur, transport company uttarakhand, multimarg mission, multimarg vision, multimarg carriers about, who is multimarg"
        canonicalPath="/about"
      />
      {/* Hero Section */}
      <section style={{ 
        background: 'linear-gradient(135deg, var(--primary-blue-dark) 0%, var(--primary-blue) 100%)', 
        color: 'white',
        padding: '6rem 0',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative elements */}
        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-5%', width: '300px', height: '300px', borderRadius: '50%', background: 'var(--primary-red)', opacity: '0.1', filter: 'blur(50px)' }} />
        
        <div className="container">
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={fadeInUp}
            style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}
          >
            <h1 style={{ fontSize: '3rem', marginBottom: '1.5rem', fontWeight: 800 }}>About Multimarg Carriers</h1>
            <p style={{ fontSize: '1.25rem', opacity: 0.9, lineHeight: 1.6 }}>
              Driving excellence in logistics. We are a premier transport and logistics partner committed to delivering your goods safely, efficiently, and on time across India.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="section-padding" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center' }}>
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
            >
              <div style={{ position: 'relative' }}>
                <img 
                  src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="Our Fleet" 
                  style={{ width: '100%', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', position: 'relative', zIndex: 2 }}
                />
                <div style={{ position: 'absolute', top: '20px', left: '-20px', width: '100%', height: '100%', backgroundColor: 'var(--primary-red)', borderRadius: '12px', zIndex: 1 }} />
              </div>
            </motion.div>
            
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
            >
              <h2 style={{ fontSize: '2.5rem', color: 'var(--primary-blue)', marginBottom: '1.5rem' }}>Our Journey</h2>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-light)', marginBottom: '1.5rem', lineHeight: 1.8 }}>
                We provide full range of transportation. At MULTIMARG CARRIERS PRIVATE LIMITED, we specialize in providing efficient, reliable, and cost-effective logistics solutions that cater to the unique needs of businesses across industries.
              </p>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-light)', marginBottom: '2rem', lineHeight: 1.8 }}>
                With years of expertise in the logistics and supply chain sector, we are committed to delivering exceptional services, from transportation and warehousing to inventory management and distribution. Our advanced technology, professional team, and extensive network ensure that your goods reach their destination on time and in perfect condition.
              </p>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div>
                  <h3 style={{ fontSize: '2.5rem', color: 'var(--primary-red)', marginBottom: '0.5rem' }}>10+</h3>
                  <p style={{ color: 'var(--text-main)', fontWeight: 600 }}>Years Experience</p>
                </div>
                <div>
                  <h3 style={{ fontSize: '2.5rem', color: 'var(--primary-red)', marginBottom: '0.5rem' }}>500+</h3>
                  <p style={{ color: 'var(--text-main)', fontWeight: 600 }}>Happy Clients</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="section-padding" style={{ backgroundColor: 'var(--bg-light-grey)' }}>
        <div className="container">
          <div className="section-title">
            <h2>Our Core Philosophy</h2>
            <p>The principles that guide our operations and commitment to our partners.</p>
          </div>

          <motion.div 
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '3rem' }}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {[
              {
                icon: <Target size={40} color="var(--primary-red)" />,
                title: "Transparent Pricing",
                desc: "Transparency in Every Transaction. We believe in building trust through clear and honest pricing models."
              },
              {
                icon: <Eye size={40} color="var(--primary-red)" />,
                title: "Real Time Tracking",
                desc: "Instant Tracking, Maximum Efficiency. Keep an eye on your shipment every step of the way."
              },
              {
                icon: <ShieldCheck size={40} color="var(--primary-red)" />,
                title: "Safety And Reliability",
                desc: "Safety First, Reliability Always. Emphasizing top priority on secure transport and consistent service."
              },
              {
                icon: <Clock size={40} color="var(--primary-red)" />,
                title: "Warehouse Storage",
                desc: "Where Space Meets Efficiency. Reliable warehousing solutions tailored for your business needs."
              }
            ].map((item, index) => (
              <motion.div 
                key={index}
                variants={fadeInUp}
                style={{ 
                  backgroundColor: 'white', 
                  padding: '2.5rem', 
                  borderRadius: '12px', 
                  boxShadow: 'var(--shadow-md)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  cursor: 'default'
                }}
                whileHover={{ y: -10, boxShadow: 'var(--shadow-lg)' }}
              >
                <div style={{ marginBottom: '1.5rem' }}>{item.icon}</div>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--primary-blue)', marginBottom: '1rem' }}>{item.title}</h3>
                <p style={{ color: 'var(--text-light)', lineHeight: 1.6 }}>{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;
