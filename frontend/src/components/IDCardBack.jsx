import React from 'react';

const IDCardBack = ({ user, globalSettings }) => {
  return (
    <div 
      id="id-card-back"
      style={{
        width: '320px',
        height: '500px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', sans-serif",
        boxSizing: 'border-box',
        border: '1px solid #e2e8f0'
      }}
    >
      {/* Top Header */}
      <div style={{ background: "url(\"data:image/svg+xml;utf8,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='6' cy='6' r='2.5' fill='%23000000' opacity='0.15'/%3E%3Ccircle cx='5' cy='5' r='2.5' fill='%23ffffff' opacity='0.7'/%3E%3Ccircle cx='22' cy='22' r='4' fill='%23000000' opacity='0.1'/%3E%3Ccircle cx='21' cy='21' r='4' fill='%23ffffff' opacity='0.4'/%3E%3Ccircle cx='26' cy='8' r='1.5' fill='%23000000' opacity='0.2'/%3E%3Ccircle cx='25' cy='7' r='1.5' fill='%23ffffff' opacity='0.5'/%3E%3C/svg%3E\") 0 0 / 32px 32px, linear-gradient(90deg, #7b2cbf 0%, #d00000 100%)", padding: '1rem', textAlign: 'center' }}>
        <h3 style={{ margin: 0, color: '#ffffff', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>Terms & Conditions</h3>
      </div>

      {/* Policies */}
      <div style={{ padding: '0.75rem 1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <ul style={{ margin: 0, paddingLeft: '1rem', color: '#334155', fontSize: '0.65rem', lineHeight: 1.4, fontWeight: 600 }}>
          <li style={{ marginBottom: '0.3rem' }}>Property of {globalSettings?.company?.name || 'Multimarg Carriers'}.</li>
          <li style={{ marginBottom: '0.3rem' }}>Non-transferable; must be worn visibly on premises.</li>
          <li style={{ marginBottom: '0.3rem' }}>Report loss immediately to HR/Security.</li>
          <li>Return upon termination of employment.</li>
        </ul>
        
        {/* Contact/Return Box */}
        <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: 'auto', overflow: 'hidden' }}>
           <span style={{ display: 'block', color: '#d00000', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>If found, please return to:</span>
           
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <div style={{ flex: 1, minWidth: 0 }}>
               <p style={{ margin: 0, color: '#0f172a', fontSize: '0.75rem', fontWeight: 800, lineHeight: 1.2 }}>
                 {globalSettings?.company?.name || 'Multimarg Carriers Pvt. Ltd.'}
               </p>
               <p style={{ margin: '0.15rem 0 0 0', color: '#334155', fontSize: '0.65rem', fontWeight: 600, lineHeight: 1.3, whiteSpace: 'pre-line' }}>
                 {globalSettings?.company?.address || 'Global Logistics Hub\nMumbai, MH, India 400001'}
               </p>
               <p style={{ margin: '0.15rem 0 0 0', color: '#0f172a', fontSize: '0.65rem', fontWeight: 700 }}>
                 Ph: {globalSettings?.company?.phone || '+91 800 123 4567'}
               </p>
             </div>
             
             {/* Verified Badge */}
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, background: '#ffffff', padding: '0.3rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '60px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
               <img src="/mc.png" alt="Company Stamp" style={{ width: '32px', height: '32px', objectFit: 'contain' }} crossOrigin="anonymous" />
               <span style={{ fontSize: '0.4rem', fontWeight: 800, color: '#7b2cbf', textAlign: 'center', marginTop: '3px', lineHeight: 1.1, textTransform: 'uppercase' }}>Multimarg<br/>Verified ID</span>
             </div>
           </div>
        </div>
      </div>

      {/* Bottom Section: QR and Signatures */}
      <div style={{ padding: '0 1.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        
        {/* QR Code */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ padding: '0.4rem', border: '2px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${user?.role === 'Vendor' ? 'VENDOR' : user?.role === 'Client' ? 'CLIENT' : 'EMP'}:${user?.employeeId || user?.id}&color=7b2cbf`} alt="QR Code" style={{ width: '70px', height: '70px', display: 'block' }} crossOrigin="anonymous" />
          </div>
          <span style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>SCAN TO VERIFY</span>
        </div>

        {/* Auth Signature */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, pointerEvents: 'none' }}>
             <img src="https://res.cloudinary.com/mne6vzev/image/upload/v1785830846/stamps/jjvyicqa7vjhhie09x9v.png" alt="Company Stamp" style={{ width: '100px', height: '100px', objectFit: 'contain', opacity: 0.85 }} crossOrigin="anonymous" />
          </div>
          <div style={{ height: '40px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', borderBottom: '1px solid #94a3b8', width: '100%', marginBottom: '0.4rem', position: 'relative', zIndex: 1 }}>
             {/* Signature line left blank, stamp overlaps it */}
          </div>
          <span style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center', position: 'relative', zIndex: 2 }}>Issuing Authority</span>
        </div>

      </div>

      {/* Bottom Bar */}
      <div style={{ height: '8px', background: "url(\"data:image/svg+xml;utf8,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='6' cy='6' r='2.5' fill='%23000000' opacity='0.15'/%3E%3Ccircle cx='5' cy='5' r='2.5' fill='%23ffffff' opacity='0.7'/%3E%3Ccircle cx='22' cy='22' r='4' fill='%23000000' opacity='0.1'/%3E%3Ccircle cx='21' cy='21' r='4' fill='%23ffffff' opacity='0.4'/%3E%3Ccircle cx='26' cy='8' r='1.5' fill='%23000000' opacity='0.2'/%3E%3Ccircle cx='25' cy='7' r='1.5' fill='%23ffffff' opacity='0.5'/%3E%3C/svg%3E\") 0 0 / 32px 32px, linear-gradient(90deg, #7b2cbf 0%, #d00000 100%)", width: '100%' }}></div>
    </div>
  );
};

export default IDCardBack;
