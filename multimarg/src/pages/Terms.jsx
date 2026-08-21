import React from 'react';
import { motion } from 'framer-motion';
import SEOHead from '../components/SEOHead';

const Terms = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', backgroundColor: 'var(--bg-light-grey)' }}>
      <SEOHead
        title="Terms & Conditions — Multimarg Carriers"
        description="Terms and Conditions of service for Multimarg Carriers Pvt. Ltd. Read our shipping rules, liability clauses, booking terms, and service agreements."
        keywords="multimarg terms and conditions, shipping terms, carrier liability, logistics agreement"
        canonicalPath="/terms"
      />
      {/* Hero Section */}
      <section style={{ 
        backgroundColor: 'var(--primary-blue)', 
        color: 'white',
        padding: '4rem 0',
      }}>
        <div className="container">
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={fadeInUp}
          >
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 800 }}>Terms and Conditions</h1>
            <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>Last updated: {new Date().toLocaleDateString()}</p>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="section-padding">
        <div className="container">
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={fadeInUp}
            style={{ 
              backgroundColor: 'white', 
              padding: '3rem', 
              borderRadius: '12px', 
              boxShadow: 'var(--shadow-md)',
              maxWidth: '900px',
              margin: '0 auto'
            }}
          >
            <div style={{ color: 'var(--text-light)', lineHeight: 1.8 }}>
              <h2 style={{ color: 'var(--primary-blue)', marginBottom: '1rem', marginTop: '0' }}>1. Introduction</h2>
              <p style={{ marginBottom: '2rem' }}>
                Welcome to Multimarg Carriers Private Limited. These Terms and Conditions govern your use of our website and services. By accessing or using our services, you agree to be bound by these terms. If you disagree with any part of the terms, you may not access our services.
              </p>

              <h2 style={{ color: 'var(--primary-blue)', marginBottom: '1rem' }}>2. Services Provided</h2>
              <p style={{ marginBottom: '2rem' }}>
                Multimarg Carriers provides freight forwarding, logistics, transportation, and warehousing services. All services are subject to availability and specific agreements made between the company and the client at the time of booking.
              </p>

              <h2 style={{ color: 'var(--primary-blue)', marginBottom: '1rem' }}>3. Quotations and Booking</h2>
              <p style={{ marginBottom: '2rem' }}>
                Quotations provided through our website or by our representatives are estimates based on the information provided by you. Final charges may vary based on actual weight, dimensions, fuel surcharges, and any additional services required during transit. Bookings are only confirmed once a formal agreement or Waybill is issued.
              </p>

              <h2 style={{ color: 'var(--primary-blue)', marginBottom: '1rem' }}>4. Cargo Liability and Insurance</h2>
              <p style={{ marginBottom: '2rem' }}>
                Our liability for loss or damage to cargo is strictly limited according to standard industry regulations and the specific terms outlined in our Waybill. We highly recommend that all clients purchase comprehensive cargo insurance for the full value of their goods.
              </p>

              <h2 style={{ color: 'var(--primary-blue)', marginBottom: '1rem' }}>5. Prohibited Items</h2>
              <p style={{ marginBottom: '2rem' }}>
                You agree not to tender any cargo that is illegal, hazardous (without proper declaration and certification), perishable (unless specifically agreed), or otherwise prohibited by law. We reserve the right to refuse or inspect any shipment at our discretion.
              </p>

              <h2 style={{ color: 'var(--primary-blue)', marginBottom: '1rem' }}>6. Payment Terms</h2>
              <p style={{ marginBottom: '2rem' }}>
                Invoices must be paid in full within the agreed-upon credit terms. Late payments may incur interest charges. We reserve the right to exercise a lien on your cargo for any outstanding payments.
              </p>

              <h2 style={{ color: 'var(--primary-blue)', marginBottom: '1rem' }}>7. Governing Law</h2>
              <p style={{ marginBottom: '2rem' }}>
                These Terms shall be governed and construed in accordance with the laws of India. Any disputes arising out of or related to these terms will be subject to the exclusive jurisdiction of the courts in Maharashtra, India.
              </p>

              <h2 style={{ color: 'var(--primary-blue)', marginBottom: '1rem' }}>8. Contact Us</h2>
              <p style={{ lineHeight: '1.7', color: 'var(--text-light)', marginBottom: '1rem' }}>
                If you have any questions about these Terms, please contact us at info@multimarg.com.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Terms;
