import React, { useEffect, useState } from 'react';

const ConfirmDialog = ({ isOpen, title, message, confirmText, cancelText, onConfirm, onCancel }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 300); // match transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!show && !isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        background: isOpen ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0)',
        backdropFilter: isOpen ? 'blur(4px)' : 'blur(0px)',
        transition: 'all 0.3s ease-in-out',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '90%',
          maxWidth: '450px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-20px)',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          border: '1px solid rgba(0₹₹₹.1)',
        }}
      >
        <div style={{ padding: '24px 24px 16px', textAlign: 'center' }}>
          <img 
            src="/mc.png" 
            alt="MultiMarg Carriers" 
            style={{ height: '50px', objectFit: 'contain', marginBottom: '16px', margin: '0 auto', display: 'block' }} 
            onError={(e) => e.target.style.display = 'none'}
          />
          <h3 style={{ margin: '0 0 12px', fontSize: '1.4rem', color: '#1f2937', fontWeight: 600 }}>
            {title}
          </h3>
          <p style={{ margin: 0, color: '#4b5563', fontSize: '1rem', lineHeight: 1.5 }}>
            {message}
          </p>
        </div>
        <div style={{ 
          display: 'flex', 
          padding: '16px 24px 24px', 
          gap: '12px', 
          justifyContent: 'center' 
        }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#374151',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => e.target.style.background = '#f3f4f6'}
            onMouseOut={(e) => e.target.style.background = '#ffffff'}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)',
            }}
            onMouseOver={(e) => e.target.style.background = '#dc2626'}
            onMouseOut={(e) => e.target.style.background = '#ef4444'}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
