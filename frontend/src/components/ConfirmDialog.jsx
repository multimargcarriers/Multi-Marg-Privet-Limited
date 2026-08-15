import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const ConfirmDialog = ({ isOpen, title, message, confirmText, cancelText, requireInput, onConfirm, onCancel }) => {
  const [show, setShow] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      setInputValue('');
    } else {
      const timer = setTimeout(() => setShow(false), 300); // match transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!show && !isOpen) return null;

  const isConfirmDisabled = requireInput && inputValue.trim() !== requireInput;

  return createPortal((
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
          border: '1px solid rgba(0, 0, 0, 0.1)',
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

          {requireInput && (
            <div style={{ marginTop: '20px', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#374151', marginBottom: '6px', fontWeight: 500 }}>
                Please type <strong>{requireInput}</strong> to confirm:
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Type "${requireInput}"`}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>
          )}
        </div>
        <div style={{ 
          display: 'flex', 
          padding: '16px 24px 24px', 
          gap: '12px', 
          justifyContent: 'center' 
        }}>
          {cancelText && (
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
          )}
          <button
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: isConfirmDisabled ? (cancelText ? '#fca5a5' : '#93c5fd') : (cancelText ? '#ef4444' : '#3b82f6'),
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: isConfirmDisabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: isConfirmDisabled ? 'none' : `0 4px 6px -1px ${cancelText ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
              opacity: isConfirmDisabled ? 0.7 : 1
            }}
            onMouseOver={(e) => !isConfirmDisabled && (e.target.style.background = cancelText ? '#dc2626' : '#2563eb')}
            onMouseOut={(e) => !isConfirmDisabled && (e.target.style.background = cancelText ? '#ef4444' : '#3b82f6')}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  ), document.body);
};

export default ConfirmDialog;
