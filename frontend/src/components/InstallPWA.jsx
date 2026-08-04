import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check if the app is already installed/running in standalone mode
    const isAppStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(isAppStandalone);

    if (isAppStandalone) return;

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    if (iOS) {
      // Show iOS prompt after a short delay
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    // Android / Desktop Chrome support
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Auto-hide the prompt after 7 seconds whenever it is shown
  useEffect(() => {
    if (showInstallPrompt) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [showInstallPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const closePrompt = () => {
    setShowInstallPrompt(false);
  };

  // Only show on the login page (root path)
  if (location.pathname !== '/') return null;

  if (isStandalone || !showInstallPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '400px',
      background: '#ffffff',
      borderRadius: '16px',
      padding: '16px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: '#ffffff',
            padding: '6px',
            borderRadius: '12px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '48px',
            height: '48px'
          }}>
            <img src="/mc.png" alt="Multimarg Carriers" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', color: '#1e293b', fontWeight: 700 }}>Install App</h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              For a faster, full-screen experience
            </p>
          </div>
        </div>
        <button onClick={closePrompt} style={{
          background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px'
        }}>
          <X size={18} />
        </button>
      </div>

      {isIOS ? (
        <div style={{
          background: '#f8fafc',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '0.85rem',
          color: '#334155',
          lineHeight: '1.5'
        }}>
          To install this app on your iPhone or iPad:
          <ol style={{ margin: '8px 0 0', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Tap the Share button <Share size={16} color="#3b82f6" />
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Scroll and select <strong>Add to Home Screen</strong> <PlusSquare size={16} color="#3b82f6" />
            </li>
          </ol>
        </div>
      ) : (
        <button 
          onClick={handleInstallClick}
          style={{
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
            width: '100%'
          }}
          onMouseEnter={(e) => e.target.style.background = '#1d4ed8'}
          onMouseLeave={(e) => e.target.style.background = '#2563eb'}
        >
          Install Now
        </button>
      )}
    </div>
  );
};

export default InstallPWA;
