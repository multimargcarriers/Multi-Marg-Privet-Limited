import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calculator, User, Mail, Phone, MapPin, 
  Package, Scale, Ruler, Truck, Clock, CheckCircle2, ChevronRight, Plane,
  ShieldCheck, BadgePercent, Headset, Check
} from 'lucide-react';
import './GetQuote.css';
import { useToast } from '../context/ToastContext';
import RupeeIcon from '../components/RupeeIcon';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:5000/api';

const GetQuote = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    origin: '',
    destination: '',
    itemType: 'Cartons/Boxes',
    transportMode: 'Road (Standard)',
    weight: '',
    length: '',
    breadth: '',
    height: ''
  });

  const [quoteResult, setQuoteResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasProceeded, setHasProceeded] = useState(false);
  const [quoteId, setQuoteId] = useState(null);
  const { addToast } = useToast();

  const handleProceed = async () => {
    if (!quoteId) return;
    try {
      await axios.patch(`${API}/public/quote/${quoteId}/proceed`);
      setHasProceeded(true);
      addToast("Thank you for choosing Multimarg Carriers! Our team will contact you shortly with the formal quote.", "success", 6000);
    } catch (err) {
      addToast("Something went wrong. Please try again.", "error");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const calculateQuote = async (e) => {
    e.preventDefault();
    setIsCalculating(true);
    setQuoteResult(null);
    setHasProceeded(false);
    setQuoteId(null);

    try {
      const res = await axios.post(`${API}/public/quote`, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        originPincode: formData.origin,
        destinationPincode: formData.destination,
        itemType: formData.itemType,
        transportMode: formData.transportMode,
        weight: formData.weight,
        length: formData.length,
        breadth: formData.breadth,
        height: formData.height
      });

      if (res.data.success) {
        const d = res.data.data;
        setQuoteId(d.id);
        setQuoteResult({
          quoteRef: d.quoteRef,
          amount: d.estimatedAmount,
          days: d.estimatedDays,
          origin: `${d.originDistrict}, ${d.originState}`,
          destination: `${d.destinationDistrict}, ${d.destinationState}`,
          distanceKm: d.distanceKm,
          chargeableWeight: d.chargeableWeight,
          transportMode: d.transportMode,
          itemType: d.itemType
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to calculate quote. Please check your pincodes and try again.";
      addToast(msg, "error", 5000);
    } finally {
      setIsCalculating(false);
    }
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
          <AnimatePresence mode="popLayout">
            {!quoteResult && !isCalculating && (
              <motion.div
                className="quote-trust-panel"
                layout
                initial={{ opacity: 0, scale: 0.9, x: -30 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -30 }}
                transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
              >
                <div className="trust-panel-content">
                  <img src="/mc.png" alt="Multimarg Carriers Logo" style={{ height: '45px', marginBottom: '1rem', objectFit: 'contain' }} />
                  <h2>Why Multimarg Carriers?</h2>
                  <p>Experience hassle-free logistics tailored to your business needs.</p>
                  
                  <div className="trust-features">
                    <div className="trust-feature">
                      <div className="trust-icon"><ShieldCheck size={24} /></div>
                      <div>
                        <h4>100% Safe & Insured</h4>
                        <p>Complete protection for your valuable cargo.</p>
                      </div>
                    </div>
                    <div className="trust-feature">
                      <div className="trust-icon"><Clock size={24} /></div>
                      <div>
                        <h4>On-Time Guarantee</h4>
                        <p>We stick to schedules so you never face delays.</p>
                      </div>
                    </div>
                    <div className="trust-feature">
                      <div className="trust-icon"><BadgePercent size={24} /></div>
                      <div>
                        <h4>Transparent Pricing</h4>
                        <p>No hidden fees. You pay exactly what is agreed upon.</p>
                      </div>
                    </div>
                  </div>

                  <div className="trust-support-box">
                    <Headset size={32} />
                    <div>
                      <span>Need Help? Call Us</span>
                      <h4>+05944-324033</h4>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Left Form Side */}
          <motion.div 
            className="quote-form-card"
            layout
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <img src="/mc.png" alt="Multimarg Carriers Logo" style={{ height: '28px', objectFit: 'contain' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Official Estimate Form</span>
            </div>
            
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
                    <label>Pickup Pincode (Origin)</label>
                    <div className="input-with-icon">
                      <MapPin />
                      <input type="text" name="origin" value={formData.origin} onChange={handleInputChange} className="form-input" placeholder="e.g. 110001" required maxLength={6} pattern="\d{6}" title="Enter a valid 6-digit Indian pincode" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Drop Pincode (Destination)</label>
                    <div className="input-with-icon">
                      <MapPin style={{ color: 'var(--primary-red)' }} />
                      <input type="text" name="destination" value={formData.destination} onChange={handleInputChange} className="form-input" placeholder="e.g. 400001" required maxLength={6} pattern="\d{6}" title="Enter a valid 6-digit Indian pincode" />
                    </div>
                  </div>
                  <div className="form-group">
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
                  <div className="form-group">
                    <label>Mode of Transport</label>
                    <div className="input-with-icon">
                      <Plane />
                      <select name="transportMode" value={formData.transportMode} onChange={handleInputChange} className="form-select">
                        <option value="Company Best Suggestion">✨ Company Best Suggestion (Let us decide)</option>
                        <option value="Road (Standard)">🚛 Road (Standard)</option>
                        <option value="Road (Express)">🚀 Road (Express)</option>
                        <option value="Air (Fastest)">✈️ Air (Fastest)</option>
                        <option value="Train (Economical)">🚂 Train (Economical)</option>
                        <option value="Sea / Water">🚢 Sea / Water</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              <div className="form-section">
                <h3 className="form-section-title"><Scale size={24} /> Shipment Dimensions</h3>
                <div className="dimension-grid">
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label>Weight (kg)</label>
                    <input type="number" name="weight" value={formData.weight} onChange={handleInputChange} className="form-input" placeholder="0" style={{ paddingLeft: '1rem' }} required min="1" />
                    {formData.weight && parseFloat(formData.weight) < 100 && (
                      <div style={{ fontSize: '0.7rem', color: '#d97706', marginTop: '0.25rem', lineHeight: '1.2' }}>
                        *We deliver high volume material. Minimum 100kg will be charged.
                      </div>
                    )}
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
                    <p style={{ color: 'var(--text-light)' }}>Analyzing distances, dimensions & transport modes.</p>
                  </div>
                ) : (
                  <div className="result-content ticket-style">
                <div className="ticket-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src="/mc.png" alt="Logo" style={{ height: '24px', objectFit: 'contain' }} />
                    <div className="success-badge">
                      <CheckCircle2 size={16} color="#10b981" />
                      <span>Estimate Ready</span>
                    </div>
                  </div>
                  <p className="ticket-id">{quoteResult.quoteRef}</p>
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
                        <strong className="detail-val">{quoteResult.itemType || 'Standard'}</strong>
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-icon"><MapPin size={18} /></div>
                      <div>
                        <span className="detail-title">Distance</span>
                        <strong className="detail-val">~{quoteResult.distanceKm} km</strong>
                      </div>
                    </div>
                    {Number(quoteResult.chargeableWeight) > Number(formData.weight) && (
                      <div className="detail-item">
                        <div className="detail-icon"><Scale size={18} /></div>
                        <div>
                          <span className="detail-title">Chargeable Wt.</span>
                          <strong className="detail-val">{quoteResult.chargeableWeight} kg</strong>
                        </div>
                      </div>
                    )}
                    <div className="detail-item">
                      <div className="detail-icon"><Scale size={18} /></div>
                      <div>
                        <span className="detail-title">Actual Wt.</span>
                        <strong className="detail-val">{formData.weight} kg</strong>
                      </div>
                    </div>
                  </div>

                  <div className="ticket-price-box">
                    <span className="price-label">Estimated Total Budget</span>
                    <h2 className="price-amount" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <RupeeIcon size="0.8em" />
                      {quoteResult.amount.toLocaleString('en-IN')}
                    </h2>
                    <p className="price-sub" style={{ fontSize: '0.65rem', color: 'var(--text-light)', opacity: 0.8, lineHeight: '1.4', marginTop: '0.5rem' }}>
                      *This is an estimated price. Taxes are exempted from this price; extra tax will be charged based on government rules.
                    </p>
                  </div>
                </div>

                <div className="ticket-footer">
                  {hasProceeded ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1rem 0' }}
                    >
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={32} color="white" strokeWidth={3} />
                      </div>
                      <p style={{ fontWeight: '700', color: '#059669', fontSize: '1.05rem', textAlign: 'center' }}>Quote Submitted Successfully!</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', textAlign: 'center' }}>Our team will contact you shortly.</p>
                    </motion.div>
                  ) : (
                    <button className="proceed-btn" onClick={handleProceed}>
                      Proceed with this Quote <ChevronRight size={20} />
                    </button>
                  )}
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
