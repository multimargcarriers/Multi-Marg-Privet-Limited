import React from "react";
import maintenanceImage from "../assets/maintenance.png";

const MaintenancePage = ({ companyName }) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        padding: "20px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "3rem",
          borderRadius: "24px",
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.05)",
          textAlign: "center",
          maxWidth: "600px",
          width: "100%",
          border: "1px solid #e2e8f0"
        }}
      >
        <img
          src={maintenanceImage}
          alt="Under Maintenance"
          style={{ width: "250px", height: "auto", marginBottom: "2rem" }}
        />
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: "800",
            color: "#0f172a",
            marginBottom: "1rem",
            letterSpacing: "-0.02em"
          }}
        >
          We'll be back soon!
        </h1>
        <p
          style={{
            fontSize: "1.1rem",
            color: "#64748b",
            lineHeight: "1.6",
            marginBottom: "2rem",
          }}
        >
          <strong>{companyName || "Our systems"}</strong> is currently undergoing scheduled maintenance and upgrades. We are working hard to improve your experience. Thank you for your patience!
        </p>
        <div
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            backgroundColor: "#f1f5f9",
            borderRadius: "12px",
            color: "#475569",
            fontWeight: "600",
            fontSize: "0.9rem"
          }}
        >
          Check back in a few moments.
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
