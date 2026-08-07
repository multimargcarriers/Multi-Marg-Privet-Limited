import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Package, Shield, Globe } from 'lucide-react';
import RupeeIcon from '../components/RupeeIcon';

const FAQItem = ({ question, answer, isOpen, onClick }) => {
  return (
    <div style={{ 
      marginBottom: '1rem', 
      border: '1px solid #eaeaea', 
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: 'white'
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
  const [activeCategory, setActiveCategory] = useState('general');

  const categories = [
    { id: 'general', label: 'General', icon: <HelpCircle size={20} /> },
    { id: 'shipping', label: 'Shipping & Freight', icon: <Package size={20} /> },
    { id: 'customs', label: 'Customs & Duties', icon: <Globe size={20} /> },
    { id: 'insurance', label: 'Insurance', icon: <Shield size={20} /> },
  ];

  const faqs = {
    general: [
      {
        question: "What areas do you service?",
        answer: "Multimarg Carriers provides extensive coverage across India. We also handle international freight forwarding, connecting major global ports and airports to seamless domestic distribution networks."
      },
      {
        question: "How can I request a quote for my shipment?",
        answer: "You can easily request a quote by visiting our 'Get Quote' page. Fill in the required details including origin, destination, weight, and dimensions, and our team will get back to you with a customized, competitive rate within 24 hours."
      },
      {
        question: "Do you offer warehousing services?",
        answer: "Yes, we offer secure, strategically located warehousing facilities for short-term and long-term storage, order fulfillment, and cross-docking services."
      }
    ],
    shipping: [
      {
        question: "How do I track my shipment?",
        answer: "You can track your shipment in real-time by entering your AWB, Container Number, or Booking Reference on our 'Track Shipment' page. The system will provide you with the latest status and location of your cargo."
      },
      {
        question: "What types of freight do you handle?",
        answer: "We handle a wide variety of freight including Full Truckload (FTL), Less Than Truckload (LTL), over-dimensional cargo, refrigerated goods, and hazardous materials (subject to proper certification)."
      },
      {
        question: "What is the difference between FTL and LTL?",
        answer: "FTL (Full Truckload) means your goods occupy an entire truck, which is faster and ideal for large shipments. LTL (Less Than Truckload) means your goods share space with other shipments, which is more cost-effective for smaller loads."
      }
    ],
    customs: [
      {
        question: "Do you handle customs clearance?",
        answer: "Yes, we have experienced in-house customs brokers who manage all necessary documentation, duties, and compliance requirements to ensure smooth and fast clearance of your import/export goods."
      },
      {
        question: "What documents do I need for international shipping?",
        answer: "Typically, you will need a Commercial Invoice, Packing List, Bill of Lading (or Air Waybill), and Certificate of Origin. Depending on the goods, specific permits or licenses may also be required."
      }
    ],
    insurance: [
      {
        question: "Is my cargo insured during transit?",
        answer: "Standard liability coverage is included, but it may not cover the full value of high-worth goods. We highly recommend purchasing comprehensive Cargo Insurance, which we can arrange for you at competitive rates."
      },
      {
        question: "How do I file a claim in case of damage?",
        answer: "In the rare event of damage, please note it on the delivery receipt and contact our support team immediately. You will need to provide photos of the damage and a formal claim letter within 7 days of delivery."
      }
    ]
  };

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
            <h1 style={{ fontSize: '3rem', marginBottom: '1.5rem', fontWeight: 800 }}>How Can We Help You?</h1>
            <p style={{ fontSize: '1.2rem', opacity: 0.9, lineHeight: 1.6 }}>
              Find answers to the most frequently asked questions about our logistics, shipping, and supply chain services.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="section-padding">
        <div className="container">
          <div style={{ display: 'flex', flexDirection: 'column', md: { flexDirection: 'row' }, gap: '3rem' }}>
            
            {/* Sidebar / Categories */}
            <div style={{ flex: '0 0 300px' }}>
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '16px', 
                padding: '1.5rem',
                boxShadow: 'var(--shadow-md)',
                position: 'sticky',
                top: '100px'
              }}>
                <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary-blue)', fontSize: '1.2rem' }}>Categories</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setActiveCategory(category.id);
                        setOpenIndex(0);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: activeCategory === category.id ? '#e8f4fd' : 'transparent',
                        color: activeCategory === category.id ? 'var(--primary-blue)' : 'var(--text-light)',
                        fontWeight: activeCategory === category.id ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'left'
                      }}
                    >
                      {category.icon}
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* FAQ List */}
            <div style={{ flex: 1 }}>
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2 style={{ marginBottom: '2rem', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {categories.find(c => c.id === activeCategory)?.icon}
                  {categories.find(c => c.id === activeCategory)?.label} FAQs
                </h2>
                
                {faqs[activeCategory].map((faq, index) => (
                  <FAQItem 
                    key={index}
                    question={faq.question}
                    answer={faq.answer}
                    isOpen={openIndex === index}
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  />
                ))}
              </motion.div>
            </div>

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
