import React from 'react';

const IDCardFront = ({ user, avatarUrl, globalSettings }) => {
  return (
    <div 
      id="id-card-front"
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
      {/* Top Banner with Logistics Theme Gradient (Purple to Red based on logo) */}
      <div style={{ 
        position: 'absolute', top: 0, left: 0, right: 0, height: '160px', 
        background: 'linear-gradient(135deg, #7b2cbf 0%, #d00000 100%)', 
        zIndex: 1, 
        clipPath: 'polygon(0 0, 100% 0, 100% 75%, 0% 100%)' 
      }}>
        {/* Professional 3D Dotted overlay for Logistics Theme */}
        <div style={{ 
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundImage: "url(\"data:image/svg+xml;utf8,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='6' cy='6' r='2.5' fill='%23000000' opacity='0.15'/%3E%3Ccircle cx='5' cy='5' r='2.5' fill='%23ffffff' opacity='0.7'/%3E%3Ccircle cx='22' cy='22' r='4' fill='%23000000' opacity='0.1'/%3E%3Ccircle cx='21' cy='21' r='4' fill='%23ffffff' opacity='0.4'/%3E%3Ccircle cx='26' cy='8' r='1.5' fill='%23000000' opacity='0.2'/%3E%3Ccircle cx='25' cy='7' r='1.5' fill='%23ffffff' opacity='0.5'/%3E%3C/svg%3E\")", 
          backgroundSize: '32px 32px',
          opacity: 0.8
        }}></div>
      </div>

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.5rem', zIndex: 2 }}>
        {/* Company Logo uploaded by user */}
        <div style={{ width: '65px', height: '65px', background: '#fff', borderRadius: '12px', padding: '0.4rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <img src="/mc.png" alt="Company Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
        </div>
        <div style={{ textAlign: 'right', marginTop: '0.5rem', flex: 1, paddingLeft: '0.5rem' }}>
           <h2 style={{ margin: 0, color: '#ffffff', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
             {globalSettings?.company?.name || 'Multimarg Carriers'}
           </h2>
        </div>
      </div>
      
      {/* Photo Container */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', zIndex: 2, marginTop: '0.5rem' }}>
        <div style={{ width: '140px', height: '160px', borderRadius: '16px', border: '4px solid #ffffff', background: '#f5f5f5', overflow: 'hidden', boxShadow: '0 12px 24px rgba(0,0,0,0.15)' }}>
          <img 
            src={avatarUrl} 
            alt="Profile" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            crossOrigin="anonymous" 
            onError={(e) => {
              if (!e.currentTarget.src.includes('data:image')) {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ccc"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
              }
            }}
          />
        </div>
      </div>

      {/* Employee Details */}
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 2 }}>
        <h2 style={{ margin: '0 0 0.3rem 0', color: '#0f172a', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px', textTransform: 'uppercase', textAlign: 'center' }}>
          {user?.name || 'Employee Name'}
        </h2>
        <p style={{ margin: '0 0 1.2rem 0', color: '#d00000', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: 'center' }}>
          {user?.role || 'LOGISTICS OPERATIONS'}
        </p>

        {/* Data Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', marginTop: 'auto', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              {user?.role === 'Vendor' ? 'Vendor Account' : user?.role === 'Client' ? 'Client Account' : 'Employee ID'}
            </span>
            <span style={{ display: 'block', fontSize: '0.95rem', color: '#0f172a', fontWeight: 800 }}>{user?.employeeId || 'MC-1001'}</span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Blood Group</span>
            <span style={{ display: 'block', fontSize: '0.95rem', color: '#d00000', fontWeight: 800 }}>{user?.bloodGroup || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div style={{ height: '8px', background: "url(\"data:image/svg+xml;utf8,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='6' cy='6' r='2.5' fill='%23000000' opacity='0.15'/%3E%3Ccircle cx='5' cy='5' r='2.5' fill='%23ffffff' opacity='0.7'/%3E%3Ccircle cx='22' cy='22' r='4' fill='%23000000' opacity='0.1'/%3E%3Ccircle cx='21' cy='21' r='4' fill='%23ffffff' opacity='0.4'/%3E%3Ccircle cx='26' cy='8' r='1.5' fill='%23000000' opacity='0.2'/%3E%3Ccircle cx='25' cy='7' r='1.5' fill='%23ffffff' opacity='0.5'/%3E%3C/svg%3E\") 0 0 / 32px 32px, linear-gradient(90deg, #7b2cbf 0%, #d00000 100%)", width: '100%' }}></div>
    </div>
  );
};

export default IDCardFront;
