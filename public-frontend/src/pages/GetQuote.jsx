import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calculator, User, Mail, Phone, MapPin, 
  Package, Scale, Ruler, Truck, Clock, 
  IndianRupee, CheckCircle2, ChevronRight 
} from 'lucide-react';
import './GetQuote.css';
import { useToast } from '../context/ToastContext';

const GetQuote = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    origin: '',
    destination: '',
    itemType: 'Cartons/Boxes',
    weight: '',
    length: '',
    breadth: '',
    height: ''
  });

  const [quoteResult, setQuoteResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const { addToast } = useToast();

  const handleProceed = () => {
    addToast("Thank you for choosing Multimarg Carriers! Our team will contact you shortly with the formal quote.", "success", 6000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const calculateQuote = (e) => {
    e.preventDefault();
    setIsCalculating(true);
    
    // Mock calculation logic for demonstration
    setTimeout(() => {
      const weightNum = parseFloat(formData.weight) || 10;
      const originLen = formData.origin.length || 5;
      const destLen = formData.destination.length || 5;
      
      // Rough mock math
      const baseRate = 500;
      const distanceFactor = Math.abs(originLen - destLen) * 50 + 200;
      const weightFactor = weightNum * 15;
      
      const estimatedAmount = Math.round(baseRate + distanceFactor + weightFactor);
      
      // Mock days
      const estimatedDays = Math.max(2, Math.min(10, Math.round((distanceFactor / 100) + (weightNum / 50))));

      setQuoteResult({
        amount: estimatedAmount,
        days: estimatedDays,
        origin: formData.origin || 'Origin',
        destination: formData.destination || 'Destination'
      });
      setIsCalculating(false);
    }, 1200); // 1.2s delay for professional calculation effect
  };

  return (
    <div className="quote-page">
      <div className="quote-bg-shape1"></div>
      <div className="quote-bg-shape2"></div>
      
      <div className="container quote-container">
        <div className="quote-header">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Get a <span>Quick Quote</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Provide us with the details of your shipment, and our smart calculator will give you a rough estimate instantly.
          </motion.p>
        </div>

        <motion.div className="quote-content" layout>
          {/* Left Form Side */}
          <motion.div 
            className="quote-form-card"
            layout
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <form onSubmit={calculateQuote}>
              
              {/* Personal Details */}
              <div className="form-section">
                <h3 className="form-section-title"><User size={24} /> Contact Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Full Name</label>
                    <div className="input-with-icon">
                      <User />
                      <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="form-input" placeholder="e.g. John Doe" required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <div className="input-with-icon">
                      <Phone />
                      <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="form-input" placeholder="e.g. +91 9876543210" required />
                    </div>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Email ID</label>
                    <div className="input-with-icon">
                      <Mail />
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="form-input" placeholder="e.g. john@example.com" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Transport Details */}
              <div className="form-section">
                <h3 className="form-section-title"><Truck size={24} /> Transport Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Pickup Location (Origin)</label>
                    <div className="input-with-icon">
                      <MapPin />
                      <input type="text" name="origin" value={formData.origin} onChange={handleInputChange} className="form-input" placeholder="City or Pincode" required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Drop Location (Destination)</label>
                    <div className="input-with-icon">
                      <MapPin style={{ color: 'var(--primary-red)' }} />
                      <input type="text" name="destination" value={formData.destination} onChange={handleInputChange} className="form-input" placeholder="City or Pincode" required />
                    </div>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Type of Item</label>
                    <div className="input-with-icon">
                      <Package />
                      <select name="itemType" value={formData.itemType} onChange={handleInputChange} className="form-select">
                        <option value="Cartons/Boxes">Cartons / Boxes</option>
                        <option value="Furniture">Furniture</option>
                        <option value="Electronics">Electronics & Appliances</option>
                        <option value="Machinery">Industrial Machinery</option>
                        <option value="Documents">Documents / Parcels</option>
                        <option value="Other">Other / Miscellaneous</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              <div className="form-section">
                <h3 className="form-section-title"><Scale size={24} /> Shipment Dimensions</h3>
                <div className="dimension-grid">
                  <div className="form-group">
                    <label>Weight (kg)</label>
                    <input type="number" name="weight" value={formData.weight} onChange={handleInputChange} className="form-input" placeholder="0" style={{ paddingLeft: '1rem' }} required min="1" />
                  </div>
                  <div className="form-group">
                    <label>Length (cm)</label>
                    <input type="number" name="length" value={formData.length} onChange={handleInputChange} className="form-input" placeholder="0" style={{ paddingLeft: '1rem' }} />
                  </div>
                  <div className="form-group">
                    <label>Breadth (cm)</label>
                    <input type="number" name="breadth" value={formData.breadth} onChange={handleInputChange} className="form-input" placeholder="0" style={{ paddingLeft: '1rem' }} />
                  </div>
                  <div className="form-group">
                    <label>Height (cm)</label>
                    <input type="number" name="height" value={formData.height} onChange={handleInputChange} className="form-input" placeholder="0" style={{ paddingLeft: '1rem' }} />
                  </div>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={isCalculating}>
                {isCalculating ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <Calculator size={20} />
                  </motion.div>
                ) : <Calculator size={20} />}
                {isCalculating ? 'Calculating...' : 'Calculate Estimate Quote'}
              </button>
            </form>
          </motion.div>

          {/* Right Result Side */}
          <AnimatePresence mode="popLayout">
            {(quoteResult || isCalculating) && (
              <motion.div 
                className="quote-result-card"
                layout
                initial={{ opacity: 0, scale: 0.9, x: 30 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 30 }}
                transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
              >
                {isCalculating ? (
                  <div className="calculating-overlay">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                      <Calculator size={48} color="var(--primary-blue)" />
                    </motion.div>
                    <h3 style={{ color: 'var(--primary-blue)' }}>Processing Routes...</h3>
                    <p style={{ color: 'var(--text-light)' }}>Analyzing distances and dimensions.</p>
                  </div>
                ) : (
                  <div className="result-content ticket-style">
                <div className="ticket-header">
                  <div className="success-badge">
                    <CheckCircle2 size={20} color="#4ade80" />
                    <span>Estimate Ready</span>
                  </div>
                  <p className="ticket-id">QUOTE-#{Math.floor(Math.random() * 90000) + 10000}</p>
                </div>

                <div className="ticket-body">
                  <div className="route-visual">
                    <div className="location-node">
                      <div className="node-dot origin"></div>
                      <span className="node-label">Pickup</span>
                      <strong className="node-city">{quoteResult.origin}</strong>
                    </div>
                    <div className="route-path-animated">
                       <Truck className="moving-truck" size={24} />
                    </div>
                    <div className="location-node text-right">
                      <div className="node-dot dest"></div>
                      <span className="node-label">Drop-off</span>
                      <strong className="node-city">{quoteResult.destination}</strong>
                    </div>
                  </div>

                  <div className="ticket-divider"></div>

                  <div className="ticket-details-grid">
                    <div className="detail-item">
                      <div className="detail-icon"><Clock size={18} /></div>
                      <div>
                        <span className="detail-title">Transit Time</span>
                        <strong className="detail-val">{quoteResult.days} - {quoteResult.days + 2} Days</strong>
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-icon"><Package size={18} /></div>
                      <div>
                        <span className="detail-title">Shipment Type</span>
                        <strong className="detail-val">{formData.itemType || 'Standard'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="ticket-price-box">
                    <span className="price-label">Estimated Total Budget</span>
                    <h2 className="price-amount">
                      <span>₹</span>
                      {quoteResult.amount.toLocaleString('en-IN')}
                    </h2>
                    <p className="price-sub">*Excludes applicable taxes & duties</p>
                  </div>
                </div>

                <div className="ticket-footer">
                  <button className="proceed-btn" onClick={handleProceed}>
                    Proceed with this Quote <ChevronRight size={20} />
                  </button>
                </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default GetQuote;
