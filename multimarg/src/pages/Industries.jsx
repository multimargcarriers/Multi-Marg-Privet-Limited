import React from 'react';
import { motion } from 'framer-motion';
import { Car, ShoppingBag, Pill, Cpu, Factory, Hammer } from 'lucide-react';
import SEOHead from '../components/SEOHead';

const Industries = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const industries = [
    {
      name: "Automotive",
      icon: <Car size={40} color="var(--primary-blue)" />,
      desc: "Just-in-time delivery for auto parts, ensuring assembly lines never stop.",
      image: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "FMCG",
      icon: <ShoppingBag size={40} color="var(--primary-blue)" />,
      desc: "Fast-moving consumer goods demand agile logistics. We deliver speed and reliability.",
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Pharmaceuticals",
      icon: <Pill size={40} color="var(--primary-blue)" />,
      desc: "Temperature-controlled transport for life-saving medicines and healthcare products.",
      image: "https://images.unsplash.com/photo-1585435557343-3b092031a831?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Electronics",
      icon: <Cpu size={40} color="var(--primary-blue)" />,
      desc: "High-security handling for fragile and high-value electronic components.",
      image: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Manufacturing",
      icon: <Factory size={40} color="var(--primary-blue)" />,
      desc: "Moving heavy machinery and raw materials seamlessly across the country.",
      image: "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Construction",
      icon: <Hammer size={40} color="var(--primary-blue)" />,
      desc: "On-site delivery of building materials to keep your projects on schedule.",
      image: "/construction_materials.png"
    }
  ];

  return (
    <div style={{ paddingTop: '80px' }}>
      <SEOHead
        title="Industries We Serve — Automotive, FMCG, Pharma, Electronics & More"
        description="Multimarg Carriers provides specialized logistics solutions for Automotive, FMCG, Pharmaceuticals, Electronics, Manufacturing, and Construction industries across India."
        keywords="industry logistics, automotive transport, FMCG logistics, pharma logistics india, electronics shipping, manufacturing logistics, construction materials transport, ecommerce logistics"
        canonicalPath="/industries"
      />
      <section style={{ 
        background: 'linear-gradient(rgba(11, 27, 61, 0.9), rgba(11, 27, 61, 0.9)), url("https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80") no-repeat center center / cover',
        color: 'white',
        padding: '8rem 0',
        textAlign: 'center'
      }}>
        <div className="container">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
            <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', fontWeight: 800 }}>Industries We Serve</h1>
            <p style={{ fontSize: '1.25rem', maxWidth: '700px', margin: '0 auto', opacity: 0.9 }}>
              Decades of experience across diverse sectors enables us to provide specialized logistics solutions tailored to industry-specific challenges.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding" style={{ backgroundColor: 'var(--bg-light-grey)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem' }}>
            {industries.map((ind, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeInUp}
                transition={{ delay: index * 0.1 }}
                style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '16px', 
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'transform 0.3s ease',
                }}
                whileHover={{ y: -15, boxShadow: 'var(--shadow-lg)' }}
              >
                <div style={{ height: '200px', overflow: 'hidden' }}>
                  <img 
                    src={ind.image} 
                    alt={ind.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                    className="industry-img"
                  />
                </div>
                <div style={{ padding: '2rem', position: 'relative' }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: '-30px', 
                    right: '2rem', 
                    backgroundColor: 'white', 
                    padding: '1rem', 
                    borderRadius: '50%',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    {ind.icon}
                  </div>
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '1rem' }}>{ind.name}</h3>
                  <p style={{ color: 'var(--text-light)', lineHeight: 1.6 }}>{ind.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      <style>{`
        .industry-img:hover {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
};

export default Industries;
