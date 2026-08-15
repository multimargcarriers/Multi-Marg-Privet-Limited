import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import axios from 'axios';

const FAQItem = ({ question, answer, isOpen, onClick }) => {
  return (
    <div style={{ 
      marginBottom: '1rem', 
      border: '1px solid #eaeaea', 
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: 'white',
      boxShadow: isOpen ? '0 10px 25px rgba(0,0,0,0.05)' : 'none',
      transition: 'box-shadow 0.3s'
    }}>
      <button
        onClick={onClick}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '1.1rem',
          fontWeight: 600,
          color: 'var(--primary-blue)'
        }}
      >
        <span>{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown color="var(--primary-red)" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ padding: '0 1.5rem 1.5rem', color: 'var(--text-light)', lineHeight: 1.7 }}>
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/public/cms/faqs`);
        if (res.data.success) {
          setFaqs(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching FAQs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', backgroundColor: 'var(--bg-light-grey)' }}>
      {/* Hero Section */}
      <section style={{ 
        background: 'linear-gradient(135deg, var(--primary-blue-dark) 0%, var(--primary-blue) 100%)', 
        color: 'white',
        padding: '5rem 0',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={fadeInUp}
            style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}
          >
            <h1 style={{ fontSize: '3rem', marginBottom: '1.5rem', fontWeight: 800 }}>Frequently Asked Questions</h1>
            <p style={{ fontSize: '1.2rem', opacity: 0.9, lineHeight: 1.6 }}>
              Find answers to the most frequently asked questions about our logistics, shipping, and supply chain services.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="section-padding">
        <div className="container">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-light)' }}>
                Loading FAQs...
              </div>
            ) : faqs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-light)' }}>
                No FAQs available at the moment.
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {faqs.map((faq, index) => (
                  <FAQItem 
                    key={faq.id || index}
                    question={faq.question}
                    answer={faq.answer}
                    isOpen={openIndex === index}
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Still have questions CTA */}
      <section style={{ padding: '4rem 0', backgroundColor: 'var(--primary-blue)', color: 'white', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ marginBottom: '1rem' }}>Still have questions?</h2>
          <p style={{ opacity: 0.9, marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
            Can't find the answer you're looking for? Please chat to our friendly team.
          </p>
          <a href="/contact" style={{
            display: 'inline-block',
            backgroundColor: 'var(--primary-red)',
            color: 'white',
            padding: '1rem 2.5rem',
            borderRadius: '50px',
            textDecoration: 'none',
            fontWeight: 'bold',
            boxShadow: 'var(--shadow-md)'
          }}>
            Contact Us
          </a>
        </div>
      </section>
    </div>
  );
};

export default FAQ;
