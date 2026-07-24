import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { SettingsContext } from '../context/SettingsContext';

const ProtectedRoute = ({ requiredPermission }) => {
  const { user, loading, hasPermission } = useContext(AuthContext);
  const { globalSettings, loadingSettings } = useContext(SettingsContext);

  if (loading || loadingSettings) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Enforce global feature toggle 
  // Map permission strings exactly to modules setting keys where they match
  if (requiredPermission && globalSettings?.modules) {
    const isModuleDisabled = globalSettings.modules[requiredPermission] === false;
    if (isModuleDisabled) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
