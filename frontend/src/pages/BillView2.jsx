import RupeeIcon from '../components/RupeeIcon';
import React from "react";
import { useParams } from "react-router-dom";
import { Printer } from "lucide-react";

const BillView2 = () => {
  const { id } = useParams();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>Bill View - Format 2</h3>
          <p className="text-muted">Detailed invoice format. Bill ID: {id}</p>
        </div>
        <button className="btn" style={{ padding: "0 1.5rem", height: "45px" }} onClick={() => window.print()}>
          <Printer size={18} /> Print
        </button>
      </div>

      <div className="glass-panel" style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
          <div>
            <img src="/mc.png" alt="Multimarg Carriers Logo" style={{ height: "45px", marginBottom: "0.5rem" }} />
            <h2 style={{ margin: 0, fontSize: "1.3rem" }}>MULTIMARG CARRIERS</h2>
            <p style={{ margin: "0.25rem 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>Transport & Logistics Services</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h3 style={{ margin: "0 0 0.5rem", color: "var(--primary-color)", fontSize: "1.2rem" }}>INVOICE</h3>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>Invoice #: <strong>INV-{id?.slice(-6) || "000001"}</strong></p>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>Date: <strong>{new Date().toLocaleDateString()}</strong></p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem", padding: "1.5rem", background: "rgba(0, 0, 0, 0.02)", borderRadius: 12 }}>
          <div>
            <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Bill To</p>
            <p style={{ margin: "0.25rem 0", fontWeight: 600 }}>Client Name</p>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>Client Address</p>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>GST: 08ABCDE1234F1Z5</p>
          </div>
          <div>
            <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Ship To</p>
            <p style={{ margin: "0.25rem 0", fontWeight: 600 }}>Consignee Name</p>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>Consignee Address</p>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2rem" }}>
          <thead>
            <tr style={{ background: "var(--primary-color)", color: "#fff" }}>
              <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>#</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>Particulars</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Weight (KG)</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Rate</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>1</td>
              <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>Transport Charges - LR #LR001</td>
              <td style={{ padding: "0.75rem 1rem", textAlign: "right", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>500</td>
import React from "react";
import { useParams } from "react-router-dom";
import { Printer } from "lucide-react";

const BillView2 = () => {
  const { id } = useParams();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>Bill View - Format 2</h3>
          <p className="text-muted">Detailed invoice format. Bill ID: {id}</p>
        </div>
        <button className="btn" style={{ padding: "0 1.5rem", height: "45px" }} onClick={() => window.print()}>
          <Printer size={18} /> Print
        </button>
      </div>

      <div className="glass-panel" style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
          <div>
            <img src="/mc.png" alt="Multimarg Carriers Logo" style={{ height: "45px", marginBottom: "0.5rem" }} />
            <h2 style={{ margin: 0, fontSize: "1.3rem" }}>MULTIMARG CARRIERS</h2>
            <p style={{ margin: "0.25rem 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>Transport & Logistics Services</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h3 style={{ margin: "0 0 0.5rem", color: "var(--primary-color)", fontSize: "1.2rem" }}>INVOICE</h3>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>Invoice #: <strong>INV-{id?.slice(-6) || "000001"}</strong></p>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>Date: <strong>{new Date().toLocaleDateString()}</strong></p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem", padding: "1.5rem", background: "rgba(0, 0, 0, 0.02)", borderRadius: 12 }}>
          <div>
            <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Bill To</p>
            <p style={{ margin: "0.25rem 0", fontWeight: 600 }}>Client Name</p>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>Client Address</p>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>GST: 08ABCDE1234F1Z5</p>
          </div>
          <div>
            <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Ship To</p>
            <p style={{ margin: "0.25rem 0", fontWeight: 600 }}>Consignee Name</p>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>Consignee Address</p>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2rem" }}>
          <thead>
            <tr style={{ background: "var(--primary-color)", color: "#fff" }}>
              <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>#</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>Particulars</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Weight (KG)</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Rate</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>1</td>
              <td style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>Transport Charges - LR #LR001</td>
              <td style={{ padding: "0.75rem 1rem", textAlign: "right", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>500</td>
              <td style={{ padding: "0.75rem 1rem", textAlign: "right", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}><RupeeIcon size={12}/> 10.00</td>
              <td style={{ padding: "0.75rem 1rem", textAlign: "right", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}><RupeeIcon size={12}/> 5,000.00</td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "2rem" }}>
          <div style={{ width: 300 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>
              <span>Subtotal</span><span><RupeeIcon size={12}/> 5,000.00</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>
              <span>CGST (2.5%)</span><span><RupeeIcon size={12}/> 125.00</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>
              <span>SGST (2.5%)</span><span><RupeeIcon size={12}/> 125.00</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", fontWeight: 700, fontSize: "1.1rem", color: "var(--primary-color)" }}>
              <span>Total</span><span><RupeeIcon size={12}/> 5,250.00</span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(0, 0, 0, 0.1)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          <div>
            <p style={{ margin: "0.25rem 0", fontWeight: 600 }}>Amount in Words:</p>
            <p style={{ margin: "0.25rem 0" }}>Rupees Five Thousand Two Hundred Fifty Only</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: "0.25rem 0" }}>For Multimarg Carriers</p>
            <p style={{ margin: "2rem 0 0.25rem" }}>_________________</p>
            <p style={{ margin: "0.25rem 0" }}>Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillView2;