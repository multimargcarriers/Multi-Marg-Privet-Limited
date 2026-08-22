import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, CheckCircle2, ShieldAlert, X } from 'lucide-react';

const ConfirmDialog = ({ isOpen, title, message, confirmText, cancelText, requireInput, onConfirm, onCancel }) => {
  const [show, setShow] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      setInputValue('');
    } else {
      const timer = setTimeout(() => setShow(false), 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!show && !isOpen) return null;

  const isDanger = confirmText && (
    confirmText.toLowerCase().includes('delete') || 
    confirmText.toLowerCase().includes('remove') || 
    confirmText.toLowerCase().includes('revoke') ||
    confirmText.toLowerCase().includes('discard')
  );

  const isConfirmDisabled = requireInput && inputValue.trim() !== requireInput;

  return createPortal((
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 99999999,
        background: isOpen ? 'rgba(15, 23, 42, 0.65)' : 'rgba(15, 23, 42, 0)',
        backdropFilter: isOpen ? 'blur(12px) saturate(150%)' : 'blur(0px)',
        WebkitBackdropFilter: isOpen ? 'blur(12px) saturate(150%)' : 'blur(0px)',
        transition: 'all 0.25s ease-in-out',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        padding: '1rem',
        boxSizing: 'border-box'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && cancelText && onCancel) onCancel();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxSizing: 'border-box',
          fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        {/* Top Accent Stripe */}
        <div style={{
          height: '4px',
          width: '100%',
          background: isDanger 
            ? 'linear-gradient(90deg, #ef4444, #dc2626)' 
            : 'linear-gradient(90deg, #0284c7, #2563eb)'
        }} />

        <div style={{ padding: '1.75rem 1.75rem 1rem', textAlign: 'center' }}>
          {/* Context Icon */}
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: isDanger ? '#fee2e2' : '#eff6ff',
            color: isDanger ? '#dc2626' : '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.15rem',
            boxShadow: isDanger ? '0 0 0 8px #fef2f2' : '0 0 0 8px #f8fafc'
          }}>
            {isDanger ? (
              <AlertTriangle size={28} strokeWidth={2.2} />
            ) : cancelText ? (
              <Info size={28} strokeWidth={2.2} />
            ) : (
              <CheckCircle2 size={28} strokeWidth={2.2} color="#16a34a" />
            )}
          </div>

          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#0f172a', fontWeight: 800, letterSpacing: '-0.01em' }}>
            {title || 'Confirmation Required'}
          </h3>
          <p style={{ margin: 0, color: '#475569', fontSize: '0.92rem', lineHeight: 1.55 }}>
            {message}
          </p>

          {requireInput && (
            <div style={{ marginTop: '1.25rem', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#334155', marginBottom: '6px', fontWeight: 600 }}>
                Please type <strong style={{ color: isDanger ? '#dc2626' : '#0284c7' }}>{requireInput}</strong> to confirm:
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Type "${requireInput}"`}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = isDanger ? '#ef4444' : '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          padding: '1rem 1.75rem 1.75rem', 
          gap: '10px', 
          justifyContent: 'center' 
        }}>
          {cancelText && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => e.target.style.background = '#f8fafc'}
              onMouseOut={(e) => e.target.style.background = '#ffffff'}
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              background: isConfirmDisabled 
                ? '#94a3b8' 
                : isDanger 
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                  : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#ffffff',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: isConfirmDisabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: isConfirmDisabled 
                ? 'none' 
                : isDanger 
                  ? '0 4px 14px rgba(239, 68, 68, 0.35)' 
                  : '0 4px 14px rgba(37, 99, 235, 0.35)',
              opacity: isConfirmDisabled ? 0.6 : 1
            }}
          >
            {confirmText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  ), document.body);
};

export default ConfirmDialog;
