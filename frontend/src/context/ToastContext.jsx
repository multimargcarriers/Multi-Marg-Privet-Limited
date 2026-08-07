import React, { createContext, useContext, useState, useCallback, } from "react";
import { CheckCircle, XCircle, X, AlertTriangle, Info } from "lucide-react";

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div 
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          pointerEvents: "none"
        }}
      >
        <style>
          {`
            @keyframes toastSlideIn {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
            @keyframes toastFadeOut {
              from { transform: translateX(0); opacity: 1; }
              to { transform: translateX(100%); opacity: 0; }
            }
            .toast-item {
              pointer-events: auto;
              animation: toastSlideIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
              background: white;
              border-radius: 8px;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
              border-left: 4px solid;
              display: flex;
              align-items: center;
              padding: 12px 16px;
              min-width: 320px;
              max-width: 400px;
              overflow: hidden;
              position: relative;
            }
            .toast-success { border-left-color: #10b981; }
            .toast-warning { border-left-color: #eab308; }
            .toast-info { border-left-color: #3b82f6; }
            .toast-error { border-left-color: #ef4444; }
            .toast-logo {
              width: 32px;
              height: 32px;
              object-fit: contain;
              border-radius: 4px;
              margin-right: 12px;
              background: #f8fafc;
              padding: 2px;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }
            .toast-content { flex: 1; display: flex; flex-direction: column; justify-content: center; }
            .toast-title {
              margin: 0;
              font-size: 0.85rem;
              font-weight: 700;
              color: #1e293b;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .toast-message {
              margin: 3px 0 0 0;
              font-size: 0.8rem;
              color: #475569;
              line-height: 1.4;
            }
            .toast-close {
              background: transparent;
              border: none;
              color: #94a3b8;
              cursor: pointer;
              margin-left: 10px;
              padding: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 4px;
              transition: all 0.2s;
            }
            .toast-close:hover {
              background: #f1f5f9;
              color: #475569;
            }
          `}
        </style>
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item toast-${t.type}`}>
            <img 
              src="/logo.png" // User's company logo (assumes logo.png is in public folder)
              alt="Logo" 
              className="toast-logo"
              onError={(e) => {
                // Graceful fallback if no logo image exists
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback Icon */}
            <div style={{ display: 'none', marginRight: '12px', alignItems: 'center', justifyContent: 'center' }}>
               {t.type === 'success' ? <CheckCircle size={28} color="#10b981" /> : t.type === 'warning' ? <AlertTriangle size={28} color="#eab308" /> : t.type === 'info' ? <Info size={28} color="#3b82f6" /> : <XCircle size={28} color="#ef4444" />}
            </div>
            
            <div className="toast-content">
              <h4 className="toast-title">
                {t.type === "success" ? "Success" : t.type === "warning" ? "Warning" : t.type === "info" ? "Info" : "Error"}
              </h4>
              <p className="toast-message">{t.message}</p>
            </div>
            <button className="toast-close" onClick={() => removeToast(t.id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
