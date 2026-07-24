import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Download, Info, Shield, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';

const IDCard = () => {
  const { user } = useContext(AuthContext);

  const getAvatarUrl = () => {
    if (user?.photo) {
      if (user.photo.startsWith('http')) return user.photo;
      if (user.photo.startsWith('/uploads/')) {
        const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
        return `${baseUrl}${user.photo}`;
      }
      return user.photo;
    }
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'User') + '&background=0078D4&color=fff&size=200';
  };

  const handleDownload = async (elementId, filename) => {
    try {
      const el = document.getElementById(elementId);
      if (!el) return;
      
      const originalTransform = el.style.transform;
      el.style.transform = 'scale(1)'; // reset scale for html2canvas
      
      const canvas = await html2canvas(el, { 
        scale: 3, 
        useCORS: true, 
        allowTaint: true, 
        backgroundColor: '#ffffff' 
      });
      
      el.style.transform = originalTransform;
      
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Failed to generate ID card", err);
    }
  };

  const handleDownloadBoth = async () => {
    await handleDownload('id-card-front', `ID_Card_Front_${user.name.replace(/\s+/g, '_')}.png`);
    setTimeout(() => {
      handleDownload('id-card-back', `ID_Card_Back_${user.name.replace(/\s+/g, '_')}.png`);
    }, 500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            display: flex !important;
            flex-direction: row !important;
            gap: 20px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Shield size={28} color="#3b82f6" /> Official ID Card
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.05rem', margin: 0 }}>
            Preview and download your official Multi Marg Carriers employee ID card.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={handleDownloadBoth}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Download size={18} /> Download High-Res
          </button>
          <button 
            onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
          >
            <Printer size={18} /> Print directly
          </button>
        </div>
      </div>

      <div className="no-print" style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1rem', color: '#4338ca' }}>
        <Info size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 700, fontSize: '1rem' }}>Print Guidelines</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
            These ID cards are designed at <strong>320px × 480px</strong> (CR80 standard ratio). For best results, use the "Download High-Res" button and print the images onto PVC cards using a dedicated ID card printer.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem', justifyContent: 'center' }}>
        
        {/* ================= FRONT OF CARD ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
          <h3 className="no-print" style={{ margin: 0, color: '#64748b', fontSize: '1.1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px' }}>Front</h3>
          
          <div 
            id="print-area"
            style={{ display: 'flex', gap: '2rem' }}
          >
            {/* FRONT CARD UI */}
            <div 
              id="id-card-front"
              style={{
                width: '320px',
                height: '480px',
                background: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                border: '1px solid #e2e8f0',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxSizing: 'border-box'
              }}
            >
              {/* Background Accent Graphics */}
              <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%', zIndex: 0 }}></div>
              <div style={{ position: 'absolute', bottom: '50px', left: '-50px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%', zIndex: 0 }}></div>

              {/* Header */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 1rem 0.5rem 1rem', zIndex: 1 }}>
                <img src="/mc.png" alt="Multi Marg Logo" style={{ height: '48px', objectFit: 'contain', marginBottom: '0.5rem' }} />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b', letterSpacing: '0.5px' }}>MULTI MARG CARRIERS</h2>
                <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 700, color: '#3b82f6', letterSpacing: '1px', textTransform: 'uppercase' }}>PVT. LTD.</p>
              </div>

              {/* Red Separator Line */}
              <div style={{ width: '80%', height: '2px', background: 'linear-gradient(90deg, transparent, #ef4444, transparent)', marginBottom: '1.5rem', zIndex: 1 }}></div>
              
              {/* Photo Container */}
              <div style={{ background: 'white', padding: '5px', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.12)', zIndex: 1, border: '1px solid #f1f5f9' }}>
                <img src={getAvatarUrl()} alt="Profile" style={{ width: '120px', height: '130px', borderRadius: '8px', objectFit: 'cover' }} crossOrigin="anonymous" />
              </div>

              {/* Name and Role */}
              <div style={{ textAlign: 'center', marginTop: '1rem', width: '100%', padding: '0 1rem', zIndex: 1 }}>
                <h2 style={{ margin: '0 0 0.15rem 0', color: '#0f172a', fontSize: '1.3rem', fontWeight: 800, textTransform: 'uppercase' }}>{user.name}</h2>
                <div style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', padding: '0.25rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1.25rem' }}>
                  {user.role || 'Employee'}
                </div>

                {/* ID Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%', padding: '0 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Emp ID</span>
                    <span style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700 }}>{user.employeeId || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Blood Group</span>
                    <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 800 }}>O+</span>
                  </div>
                </div>
              </div>

              {/* Footer Gradient Strip */}
              <div style={{ marginTop: 'auto', width: '100%', height: '16px', background: 'linear-gradient(90deg, #1e3a8a 0%, #3b82f6 100%)', zIndex: 1 }}></div>
            </div>

            {/* ================= BACK OF CARD ================= */}
            <div 
              id="id-card-back"
              style={{
                width: '320px',
                height: '480px',
                background: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                border: '1px solid #e2e8f0',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box'
              }}
            >
              {/* Header Strip */}
              <div style={{ width: '100%', background: 'linear-gradient(90deg, #1e3a8a 0%, #3b82f6 100%)', padding: '1.25rem 1rem', color: 'white', textAlign: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Terms & Conditions</h3>
              </div>

              {/* Instructions */}
              <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <ul style={{ margin: 0, padding: '0 0 0 1rem', color: '#334155', fontSize: '0.75rem', lineHeight: 1.6, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <li>This card is the property of <strong>Multi Marg Carriers Pvt. Ltd.</strong> and must be returned upon termination of employment.</li>
                  <li>This card is strictly non-transferable.</li>
                  <li>In case of loss, report immediately to the HR department or the issuing authority.</li>
                  <li>Wear this badge visibly at all times while on company premises.</li>
                </ul>

                {/* Return Address Box */}
                <div style={{ marginTop: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>If found, please return to:</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.5 }}>
                    Multi Marg Carriers Pvt. Ltd.<br/>
                    HQ, Logistics Hub, Mumbai<br/>
                    Contact: +91 98765 43210
                  </p>
                </div>
                
                {/* Email Display */}
                <div style={{ marginTop: 'auto', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Employee Contact</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#0f172a', fontWeight: 600 }}>{user.email}</p>
                </div>

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1.5rem' }}>
                  <div style={{ width: '45%', borderTop: '1px solid #94a3b8', paddingTop: '0.5rem', textAlign: 'center', fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>
                    Card Holder
                  </div>
                  <div style={{ width: '45%', borderTop: '1px solid #94a3b8', paddingTop: '0.5rem', textAlign: 'center', fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>
                    Auth. Signatory
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default IDCard;
