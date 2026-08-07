const fs = require('fs');
let content = fs.readFileSync('src/pages/Settings.jsx', 'utf8');

// Ensure necessary imports are there
if (!content.includes('import Papa')) {
  content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect, useRef } from 'react';\nimport Papa from 'papaparse';\nimport { Download, Upload, FileText, Database } from 'lucide-react';");
}
if (!content.includes('import { Download, Upload')) {
  content = content.replace("import { Settings as SettingsIcon", "import { Settings as SettingsIcon, Download, Upload, FileText, Database");
}

// Add refs inside Settings component
if (!content.includes('const tripFileRef = useRef(null);')) {
  content = content.replace("const [stampPreview, setStampPreview] = useState(\"\");", "const [stampPreview, setStampPreview] = useState(\"\");\n  const tripFileRef = useRef(null);\n  const vendorFileRef = useRef(null);\n  const token = localStorage.getItem('token');\n  const API = import.meta.env.VITE_API_URL || \"http://localhost:5000/api\";");
}

// Add the import functions
const importFunctions = `
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split('T')[0];
  };

  const handleImportTripMIS = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data;
        if (data.length === 0) return addToast("CSV is empty", "error");
        const tripsMap = {};
        data.forEach(row => {
          const tripNo = row['Trip no'] || \`TRP-NEW-\${Math.floor(Math.random() * 10000)}\`;
          if (!tripsMap[tripNo]) {
            tripsMap[tripNo] = {
              tripNo,
              date: row['Created at'] ? formatDate(row['Created at']) : formatDate(new Date()),
              vehicleNo: row['Veh no'] || '',
              vehicleType: row['Veh type'] || '',
              mode: row['Mode'] || 'Normal',
              payment: row['Payment'] || 'To Pay',
              freight: parseFloat(row['Freight']) || 0,
              advance: parseFloat(row['Advance']) || 0,
              approvalStatus: row['Status'] || 'Pending',
              parcels: []
            };
          }
          if (row['Lr no'] || row['Consignor']) {
            tripsMap[tripNo].parcels.push({
              lrNo: row['Lr no'] || '',
              consignor: row['Consignor'] || '',
              consignee: row['Consignee'] || '',
              origin: row['Origin'] || '',
              destination: row['Destination'] || '',
              mode: row['Parcel Mode'] || 'Normal',
              box: row['Box'] || 1,
              weight: parseFloat(row['Weight']) || 0,
              totalAmount: parseFloat(row['Amount']) || 0,
              pickup: parseFloat(row['Pickup']) || 0,
              delivery: parseFloat(row['Delivery']) || 0,
              special: parseFloat(row['Special']) || 0,
              other: parseFloat(row['Other']) || 0,
              status: row['Parcel Status'] || 'Pending'
            });
          }
        });
        try {
          addToast("Importing Trip MIS data...", "info");
          for (let tripNo in tripsMap) {
            await axios.post(\`\${API}/trip-mis\`, tripsMap[tripNo], { headers: { Authorization: \`Bearer \${token}\` } });
          }
          addToast("Trip MIS imported successfully!", "success");
        } catch (err) {
          addToast("Import failed", "error");
        }
      }
    });
  };

  const handleImportVendorMIS = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data;
        if (data.length === 0) return addToast("CSV is empty", "error");
        const tripsMap = {};
        data.forEach(row => {
          const tripNo = row['Trip no'] || \`VND-NEW-\${Math.floor(Math.random() * 10000)}\`;
          if (!tripsMap[tripNo]) {
            tripsMap[tripNo] = {
              vendorName: row['Vendor name'] || 'Unknown Vendor',
              date: row['Created at'] ? formatDate(row['Created at']) : formatDate(new Date()),
              clientName: row['Client name'] || '',
              origin: row['Origin'] || '',
              destination: row['Destination'] || '',
              freight: parseFloat(row['Freight']) || 0,
              approvalStatus: row['Status'] || 'Pending',
              remarks: row['Remarks'] || '',
              parels: [] // using details array for Vendor
            };
          }
          if (row['Handover to'] || row['Vehicle no']) {
            if (!tripsMap[tripNo].details) tripsMap[tripNo].details = [];
            tripsMap[tripNo].details.push({
              date: row['Detail date'] ? formatDate(row['Detail date']) : formatDate(new Date()),
              handoverTo: row['Handover to'] || '',
              vehicleNo: row['Vehicle no'] || '',
              from: row['From'] || '',
              to: row['To'] || '',
              mode: row['Mode'] || 'Normal',
              amount: parseFloat(row['Amount']) || 0,
              status: row['Status'] || 'Pending'
            });
          }
        });
        try {
          addToast("Importing Vendor MIS data...", "info");
          for (let tripNo in tripsMap) {
            await axios.post(\`\${API}/vendor-mis\`, tripsMap[tripNo], { headers: { Authorization: \`Bearer \${token}\` } });
          }
          addToast("Vendor MIS imported successfully!", "success");
        } catch (err) {
          addToast("Import failed", "error");
        }
      }
    });
  };

  const downloadTripSample = () => {
    const csvStr = "Trip no,Created at,Veh no,Veh type,Mode,Payment,Freight,Advance,Status,Lr no,Consignor,Consignee,Origin,Destination,Parcel Mode,Box,Weight,Amount,Pickup,Delivery,Special,Other,Parcel Status\\nTRP-001,2023-10-01,DL1AB1234,Truck,Express,To Pay,5000,1000,Approved,LR-101,Acme Corp,Globex,Delhi,Mumbai,Express,10,500,2500,50,0,0,0,Delivered";
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trip_mis_sample.csv';
    a.click();
  };

  const downloadVendorSample = () => {
    const csvStr = "Trip no,Vendor name,Created at,Client name,Origin,Destination,Freight,Status,Remarks,Detail date,Handover to,Vehicle no,From,To,Mode,Amount,Status\\nVND-001,Fast Transit,2023-10-01,ABC Logistics,Delhi,Mumbai,8000,Pending,,2023-10-01,Rahul Driver,DL1XYZ,Delhi,Mumbai,Express,4000,Pending";
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vendor_mis_sample.csv';
    a.click();
  };
`;

if (!content.includes('const handleImportTripMIS')) {
  content = content.replace("const handleClearCache = async () => {", importFunctions + "\n  const handleClearCache = async () => {");
}

const dataManagementJSX = `
            {/* Data Management */}
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: '#e0e7ff', padding: '0.5rem', borderRadius: '8px', color: '#4f46e5' }}><Database size={20} /></div>
                <h5 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Data Management (MIS)</h5>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <h6 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Vehicle Trip MIS</h6>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#64748b' }}>Import or download sample format for Vehicle Trips.</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="file" accept=".csv" ref={tripFileRef} style={{ display: 'none' }} onChange={handleImportTripMIS} />
                    <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => tripFileRef.current.click()}><Upload size={14} style={{ marginRight: 4 }} /> Import CSV</button>
                    <button className="btn" style={{ background: 'white', border: '1px solid #cbd5e1', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={downloadTripSample}><FileText size={14} style={{ marginRight: 4 }} /> Sample CSV</button>
                  </div>
                </div>
                <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <h6 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Vendor Vehicle MIS</h6>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#64748b' }}>Import or download sample format for Vendor Trips.</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="file" accept=".csv" ref={vendorFileRef} style={{ display: 'none' }} onChange={handleImportVendorMIS} />
                    <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => vendorFileRef.current.click()}><Upload size={14} style={{ marginRight: 4 }} /> Import CSV</button>
                    <button className="btn" style={{ background: 'white', border: '1px solid #cbd5e1', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={downloadVendorSample}><FileText size={14} style={{ marginRight: 4 }} /> Sample CSV</button>
                  </div>
                </div>
              </div>
            </div>
`;

if (!content.includes('Data Management (MIS)')) {
  content = content.replace("{/* Security */}", dataManagementJSX + "\n\n            {/* Security */}");
}

fs.writeFileSync('src/pages/Settings.jsx', content);
