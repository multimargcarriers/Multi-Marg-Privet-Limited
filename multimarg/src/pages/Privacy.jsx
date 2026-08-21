import React from 'react';
import { motion } from 'framer-motion';
import SEOHead from '../components/SEOHead';

const Privacy = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', backgroundColor: 'var(--bg-light-grey)' }}>
      <SEOHead
        title="Privacy Policy — Multimarg Carriers"
        description="Privacy Policy for Multimarg Carriers Pvt. Ltd. Learn how we collect, use, protect, and handle your personal and shipping data securely."
        keywords="multimarg privacy policy, data security, customer privacy logistics"
        canonicalPath="/privacy"
      />
      {/* Hero Section */}
      <section style={{ 
        backgroundColor: 'var(--primary-blue-dark)', 
        color: 'white',
        padding: '4rem 0',
      }}>
        <div className="container">
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={fadeInUp}
          >
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 800 }}>Privacy Policy</h1>
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
                At Multimarg Carriers Private Limited, we respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website, use our services, or interact with us.
              </p>

              <h2 style={{ color: 'var(--primary-blue)', marginBottom: '1rem' }}>2. The Data We Collect About You</h2>
              <p style={{ marginBottom: '0.5rem' }}>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
              <ul style={{ marginBottom: '2rem', paddingLeft: '1.5rem' }}>
                <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
                <li><strong>Contact Data:</strong> includes billing address, delivery address, email address and telephone numbers.</li>
                <li><strong>Financial Data:</strong> includes bank account and payment card details (processed securely via our payment providers).</li>
                <li><strong>Transaction Data:</strong> includes details about payments to and from you and other details of services you have purchased from us.</li>
                <li><strong>Technical Data:</strong> includes internet protocol (IP) address, browser type and version, time zone setting and location.</li>
              </ul>

              <h2 style={{ color: 'var(--primary-blue)', marginBottom: '1rem' }}>3. How We Use Your Personal Data</h2>
              <p style={{ marginBottom: '0.5rem' }}>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
              <ul style={{ marginBottom: '2rem', paddingLeft: '1.5rem' }}>
                <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., providing a shipping quote or tracking a shipment).</li>
                <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                <li>Where we need to comply with a legal or regulatory obligation (such as customs compliance).</li>
              </ul>

              <h2 style={{ color: 'var(--primary-blue)', marginBottom: '1rem' }}>4. Data Security</h2>
              <p style={{ marginBottom: '2rem' }}>
                We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
              </p>

              <h2 style={{ color: 'var(--primary-blue)', marginBottom: '1rem' }}>5. Data Retention</h2>
              <p style={{ marginBottom: '2rem' }}>
                We will only retain your personal data for as long as necessary to fulfil the purposes we collected it for, including for the purposes of satisfying any legal, accounting, or reporting requirements.
              </p>

              <h2 style={{ color: 'var(--primary-blue)', marginBottom: '1rem' }}>6. Your Legal Rights</h2>
              <p style={{ marginBottom: '2rem' }}>
                Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, restriction, transfer, to object to processing, to portability of data and (where the lawful ground of processing is consent) to withdraw consent.
              </p>

              <h2 style={{ color: 'var(--primary-blue)', marginBottom: '1rem' }}>7. Contact Us</h2>
              <p style={{ lineHeight: '1.7', color: 'var(--text-light)', marginBottom: '1rem' }}>
                If you have any questions about this privacy policy or our privacy practices, please contact us at privacy@multimarg.com.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Privacy;
