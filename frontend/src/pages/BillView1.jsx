import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FileText, Printer, Cloud, Download } from "lucide-react";
import axios from "axios";

const BillView1 = () => {
  const { id } = useParams();
  const [bill, setBill] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills/${id}`);
        if (res.data.success) setBill(res.data.data);
      } catch (err) {
        console.error("Error fetching bill", err);
      }
    };
    fetchBill();
  }, [id]);

  const handleUploadCloudinary = async () => {
    setUploading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills/${id}/upload-pdf`);
      if (res.data.success) {
        alert("PDF successfully saved to Cloudinary! URL: " + res.data.data.url);
        // Refresh to show PDF link
        setBill({ ...bill, pdfUrl: res.data.data.url });
      }
    } catch (err) {
      alert("Failed to upload PDF");
    }
    setUploading(false);
  };

  if (!bill) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading bill details...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>Bill View - Format 1</h3>
          <p className="text-muted">Standard invoice format. Bill ID: {id}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {bill.pdfUrl && (
            <button className="btn" style={{ padding: "0 1rem", height: "45px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }} onClick={() => window.open(bill.pdfUrl, '_blank')}>
              <Download size={18} /> Download
            </button>
          )}
          <button className="btn" style={{ padding: "0 1rem", height: "45px" }} onClick={handleUploadCloudinary} disabled={uploading}>
            <Cloud size={18} /> {uploading ? "Saving..." : "Save to Cloud"}
          </button>
          <button className="btn btn-primary" style={{ padding: "0 1.5rem", height: "45px" }} onClick={() => window.print()}>
            <Printer size={18} /> Print
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "2px dashed rgba(0, 0, 0, 0.1)" }}>
          <img src="/mc.png" alt="Multimarg Carriers Logo" style={{ height: "50px", marginBottom: "0.5rem" }} />
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 600 }}>Transport & Logistics Services</p>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>GST: 08ABCDE1234F1Z5 | PAN: ABCDE1234F</p>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div>
            <h4 style={{ margin: "0 0 0.5rem", color: "var(--primary-color)" }}>TAX INVOICE</h4>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>Invoice No: <strong>{bill.billNo || id}</strong></p>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>Date: <strong>{new Date(bill.createdAt || Date.now()).toLocaleDateString()}</strong></p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", fontWeight: 600 }}>Bill To:</p>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", fontWeight: 600 }}>{bill.client}</p>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>LR No: {bill.lrNo || "-"}</p>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2rem" }}>
          <thead>
            <tr style={{ background: "rgba(13, 110, 253, 0.05)" }}>
              <th style={{ padding: "0.75rem 1rem", textAlign: "left", borderBottom: "2px solid var(--primary-color)" }}>#</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "left", borderBottom: "2px solid var(--primary-color)" }}>Description</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "right", borderBottom: "2px solid var(--primary-color)" }}>Qty</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "right", borderBottom: "2px solid var(--primary-color)" }}>Rate</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "right", borderBottom: "2px solid var(--primary-color)" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>1</td>
              <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>Transport Charges - {bill.description || `LR #${bill.lrNo || "-"}`}</td>
              <td style={{ padding: "0.75rem 1rem", textAlign: "right", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>1</td>
              <td style={{ padding: "0.75rem 1rem", textAlign: "right", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>? {parseFloat(bill.taxable || bill.amount).toFixed(2)}</td>
              <td style={{ padding: "0.75rem 1rem", textAlign: "right", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>? {parseFloat(bill.taxable || bill.amount).toFixed(2)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600 }}>Taxable Amount</td>
              <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>? {parseFloat(bill.taxable || bill.amount).toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={4} style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600 }}>CGST @ {(parseFloat(bill.gst) / 2 || 2.5).toFixed(1)}%</td>
              <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>? {parseFloat(bill.cgst || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={4} style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600 }}>SGST @ {(parseFloat(bill.gst) / 2 || 2.5).toFixed(1)}%</td>
              <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>? {parseFloat(bill.sgst || 0).toFixed(2)}</td>
            </tr>
            <tr style={{ background: "rgba(13, 110, 253, 0.05)" }}>
              <td colSpan={4} style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 700, fontSize: "1.1rem" }}>Total Amount</td>
              <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 700, fontSize: "1.1rem", color: "var(--primary-color)" }}>? {parseFloat(bill.total || bill.amount).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ borderTop: "2px dashed rgba(0, 0, 0, 0.1)", paddingTop: "1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          <p style={{ margin: "0.25rem 0" }}><strong>Terms & Conditions:</strong></p>
          <p style={{ margin: "0.25rem 0" }}>1. Payment due within 30 days.</p>
          <p style={{ margin: "0.25rem 0" }}>2. Interest charged on overdue payments.</p>
          <p style={{ margin: "0.25rem 0" }}>3. This is a computer-generated invoice.</p>
        </div>
      </div>
    </div>
  );
};

export default BillView1;