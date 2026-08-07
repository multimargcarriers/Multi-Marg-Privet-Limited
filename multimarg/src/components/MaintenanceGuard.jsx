import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { SettingsContext } from "../context/SettingsContext";
import MaintenancePage from "../pages/MaintenancePage";

const MaintenanceGuard = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const { globalSettings, loadingSettings } = useContext(SettingsContext);

  if (loading || loadingSettings) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#f8fafc" }}>
        <p style={{ color: "#64748b", fontWeight: "600" }}>Loading...</p>
      </div>
    );
  }

  const isMaintenanceMode = globalSettings?.system?.maintenanceMode;
  const isSuperAdmin = user?.role === "SuperAdmin";

  if (isMaintenanceMode && !isSuperAdmin) {
    return <MaintenancePage companyName={globalSettings?.company?.name} />;
  }

  return children;
};

export default MaintenanceGuard;
