const fs = require('fs');
const file = 'frontend/src/pages/Trips.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const manifestStart = lines.findIndex(l => l.includes('{view === "manifest" && ('));
if (manifestStart !== -1) {
    let newLines = lines.slice(0, manifestStart);
    
    let correctEnding = `      {view === "manifest" && (
        <Table
          loading={loading}
          headers={["Trip No", "Date", "Vehicle Type", "Vehicle No", "Driver Name", "Vendor", "Origin", "Destination", "Material Details", "Total Amount", "Actions"]}
          data={trips}
          renderRow={(item, index) => (
            <tr key={item.id || index}>
              <td className="font-semibold">{item.tripNo || "-"}</td>
              <td>{item.date ? formatDate(item.date) : "-"}</td>
              <td>{item.vehicleType || "-"}</td>
              <td><Truck size={16} style={{ marginRight: 8, verticalAlign: "middle", color: "var(--primary-color)" }} />{item.vehicleNo || item.vehicle || "-"}</td>
              <td>{item.driverName || item.driver || "-"}</td>
              <td>{item.vendor || "-"}</td>
              <td>{item.origin || "-"}</td>
              <td>{item.destination || "-"}</td>
              <td>
                {item.materialDetails && item.materialDetails.length > 0 ? (
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxHeight: "100px", overflowY: "auto" }}>
                        {item.materialDetails.map((m, idx) => (
                            <div key={idx}>{m.lrNo} - {m.clientName}</div>
                        ))}
                    </div>
                ) : "-"}
              </td>
              <td style={{ fontWeight: "600", color: "#10b981" }}><span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}><RupeeIcon size={14} />&nbsp;{item.totalAmount || "0.00"}</span></td>
              <td>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => handlePreviewManifest(item.id)} style={{ background: "rgba(13, 110, 253, 0.1)", border: "none", color: "var(--primary-color)", padding: "6px", borderRadius: "8px", cursor: "pointer" }} title="Preview Manifest"><Eye size={16} /></button>
                  <button onClick={() => handleDownloadManifest(item.id)} style={{ background: "rgba(16, 185, 129, 0.1)", border: "none", color: "#10b981", padding: "6px", borderRadius: "8px", cursor: "pointer" }} title="Download Manifest"><Download size={16} /></button>
                  {isSuperAdmin && (
                    <button onClick={() => handleDelete(item.id)} style={{ background: "rgba(220, 38, 38, 0.1)", border: "none", color: "#dc2626", padding: "6px", borderRadius: "8px", cursor: "pointer" }} title="Delete Trip">Delete</button>
                  )}
                </div>
              </td>
            </tr>
          )}
        />
      )}

      {view === "list" && <TripMIS />}
      {view === "sheet" && <VendorMIS />}
      {view === "bill" && (
        <div className="glass-panel" style={{ padding: "2rem", textAlign: "center" }}>
          <FileText size={48} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
          <h4>{view.toUpperCase()}</h4>
          <p className="text-muted">Currently viewing the {view} tab.</p>
        </div>
      )}

    </div>
  );
};

export default Trips;`;
    
    newLines.push(correctEnding);
    fs.writeFileSync(file, newLines.join('\n'));
}
