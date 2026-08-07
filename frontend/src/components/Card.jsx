import React from 'react';

const Card = ({ title, value, icon, subtitle }) => {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <h2 className="text-dark mb-1 font-weight-medium" style={{ fontSize: '2rem' }}>{value}</h2>
        <h6 className="text-muted font-weight-normal mb-0">{title}</h6>
        {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
      </div>
      {icon && (
        <div style={{ padding: '1rem', background: 'rgba(13, 110, 253, 0.1)', borderRadius: '12px', color: 'var(--primary-color)' }}>
          {icon}
        </div>
      )}
    </div>
  );
};

export default Card;
