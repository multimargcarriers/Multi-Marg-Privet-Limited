import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { Printer, Cloud, Download, CheckSquare, Square, Building2, ShieldCheck } from "lucide-react";
import axios from "axios";
import CompanyStamp from "../components/CompanyStamp";
import { SettingsContext } from "../context/SettingsContext";
import html2pdf from "html2pdf.js";

// Indian Currency Number to Words converter
const numberToWordsIndian = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "Rs. Zero Only.";
  const n = Math.floor(Math.abs(num));
  if (n === 0) return "Rs. Zero Only.";

  const units = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertChunk(val) {
    let str = "";
    if (val >= 100) {
      str += units[Math.floor(val / 100)] + " Hundred ";
      val %= 100;
    }
    if (val >= 20) {
      str += tens[Math.floor(val / 10)] + " ";
      val %= 10;
    }
    if (val > 0) {
      str += units[val] + " ";
    }
    return str;
  }

  let words = "";
  let temp = n;

  // Crore (1,00,00,000)
  const crore = Math.floor(temp / 10000000);
  if (crore > 0) {
    words += convertChunk(crore) + "Crore ";
    temp %= 10000000;
  }

  // Lakh (1,00,000)
  const lakh = Math.floor(temp / 100000);
  if (lakh > 0) {
    words += convertChunk(lakh) + "Lakh ";
    temp %= 100000;
  }

  // Thousand (1,000)
  const thousand = Math.floor(temp / 1000);
  if (thousand > 0) {
    words += convertChunk(thousand) + "Thousand ";
    temp %= 1000;
  }

  // Remaining Hundreds/Tens/Units
  if (temp > 0) {
    words += convertChunk(temp);
  }

  return `Rs. ${words.trim()} Only.`;
};

const BillView1 = () => {
  const { id } = useParams();
  const { globalSettings } = useContext(SettingsContext);
  const [bill, setBill] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Option toggle for official company stamp
  const [includeStamp, setIncludeStamp] = useState(() => {
    try {
      const saved = localStorage.getItem("bill_include_stamp");
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });

  const toggleStamp = (val) => {
    setIncludeStamp(val);
    try {
      localStorage.setItem("bill_include_stamp", JSON.stringify(val));
    } catch (e) {}
  };

  // Option toggle for official company background watermark
  const [showWatermark, setShowWatermark] = useState(() => {
    try {
      const saved = localStorage.getItem("bill_show_watermark");
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });

  const toggleWatermark = (val) => {
    setShowWatermark(val);
    try {
      localStorage.setItem("bill_show_watermark", JSON.stringify(val));
    } catch (e) {}
  };

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
        setBill({ ...bill, pdfUrl: res.data.data.url });
      }
    } catch (err) {
      alert("Failed to upload PDF");
    }
    setUploading(false);
  };

  const handleDownloadLocalPDF = () => {
    window.scrollTo(0, 0);
    const element = document.getElementById("bill-content");
    const clone = element.cloneNode(true);
    clone.style.transform = "none";
    clone.style.position = "static"; // static inside the wrapper
    clone.style.margin = "0";
    clone.style.boxShadow = "none";
    clone.style.width = "940px"; // Original width of the invoice
    
    const wrapper = document.createElement("div");
    wrapper.className = "print-wrapper";
    wrapper.style.position = "fixed";
    wrapper.style.top = "0";
    wrapper.style.left = "-9999px";
    wrapper.style.width = "980px"; // 940 + 20 + 20 padding
    wrapper.style.padding = "20px"; // Natural margin for the PDF
    wrapper.style.background = "#ffffff";
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    // Allow DOM to repaint
    setTimeout(() => {
      const opt = {
        margin:       0,
        filename:     `Invoice_${billData.billNo || id}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          width: 980,
          windowWidth: 980,
          scrollY: 0,
          scrollX: 0
        },
        jsPDF:        { unit: 'px', format: [980, 1131], orientation: 'portrait' }
      };
      
      html2pdf().set(opt).from(wrapper).save().then(() => {
        document.body.removeChild(wrapper);
      }).catch(err => {
        console.error("PDF generation failed:", err);
        document.body.removeChild(wrapper);
      });
    }, 300);
  };

  // Mock / Fallback Bill Data formatted to match Tax Invoice exact layout
  const billData = bill || {
    billNo: "MCPL/26-27/0159",
    date: "30-07-2026",
    mode: "Road",
    sacCode: "996511",
    client: "BELRISE INDUSTRIES LTD UNIT -IX",
    clientAddress: "PLOT NO 15, SECTOR -10, SIDCUL PANTNAGAR -263153",
    gstin: "05AAACB9378F1ZM",
    stateCode: "05",
    items: [
      {
        si: 1,
        lrNo: "204777",
        lrDt: "30-05-2026",
        ref: "9521097",
        org: "DELHI",
        dest: "PANTNAGAR",
        pkg: "02",
        wt: "550",
        rate: "0",
        frg: "0",
        lr: "0",
        pick: "0",
        del: "0",
        spl: "6000",
        oth: "0",
        total: "6,000.00"
      }
    ],
    bankDetails: {
      bank: "Bank of Baroda, Rudrapur",
      acNo: "24980400007426",
      ifsc: "BARBORUDAVA"
    },
    subtotal: 6000,
    cgst: 540,
    sgst: 540,
    igst: 0,
    totalPayable: 7080
  };

  const itemsList = billData.items || [
    {
      si: 1,
      lrNo: billData.lrNo || "204777",
      lrDt: billData.lrDate || "30-05-2026",
      ref: billData.refNo || "9521097",
      org: billData.origin || "DELHI",
      dest: billData.destination || "PANTNAGAR",
      pkg: billData.packages || "02",
      wt: billData.weight || "550",
      rate: billData.rate || "0",
      frg: billData.freight || "0",
      lr: billData.lrCharge || "0",
      pick: billData.pickupCharge || "0",
      del: billData.deliveryCharge || "0",
      spl: billData.specialCharge || billData.miscCharge || "6000",
      oth: billData.otherCharge || "0",
      total: parseFloat(billData.taxable || billData.subtotal || 6000).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    }
  ];

  const subtotalVal = parseFloat(billData.subtotal || billData.taxable || 6000);
  const cgstVal = parseFloat(billData.cgst !== undefined ? billData.cgst : 540);
  const sgstVal = parseFloat(billData.sgst !== undefined ? billData.sgst : 540);
  const igstVal = parseFloat(billData.igst || 0);
  const totalPayableVal = parseFloat(billData.totalPayable || billData.total || (subtotalVal + cgstVal + sgstVal + igstVal));

  const customStampUrl = localStorage.getItem("company_custom_stamp") || globalSettings?.company?.companyStampUrl || "";

  return (
    <div>
      {/* Top Controls Bar (Hidden during Print) */}
      <div className="no-print" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", background: "var(--panel-solid-bg)", padding: "1rem 1.5rem", borderRadius: "10px", border: "1px solid var(--border-color)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div>
            <h3 style={{ fontSize: "1.4rem", margin: "0 0 0.25rem 0", color: "var(--text-dark)" }}>Tax Invoice View</h3>
            <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Invoice ID: {billData.billNo || id}</p>
          </div>

          {/* Stamp Toggle Control Option */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", background: "rgba(0, 0, 0, 0.03)", padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-dark)" }}>Official Stamp:</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => toggleStamp(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.4rem 0.85rem",
                  borderRadius: "6px",
                  border: includeStamp ? "1.5px solid #0D5C96" : "1px solid #ccc",
                  background: includeStamp ? "rgba(13, 92, 150, 0.12)" : "#fff",
                  color: includeStamp ? "#0D5C96" : "#666",
                  fontWeight: includeStamp ? "700" : "500",
                  cursor: "pointer",
                  fontSize: "0.85rem"
                }}
              >
                {includeStamp ? <CheckSquare size={16} /> : <Square size={16} />} Yes (With Stamp)
              </button>
              <button
                type="button"
                onClick={() => toggleStamp(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.4rem 0.85rem",
                  borderRadius: "6px",
                  border: !includeStamp ? "1.5px solid #dc2626" : "1px solid #ccc",
                  background: !includeStamp ? "rgba(220, 38, 38, 0.1)" : "#fff",
                  color: !includeStamp ? "#dc2626" : "#666",
                  fontWeight: !includeStamp ? "700" : "500",
                  cursor: "pointer",
                  fontSize: "0.85rem"
                }}
              >
                {!includeStamp ? <CheckSquare size={16} /> : <Square size={16} />} No (Without Stamp)
              </button>
            </div>
          </div>

          {/* Watermark Toggle Control Option */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "rgba(0, 0, 0, 0.03)", padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-dark)" }}>Watermark:</span>
            <button
              type="button"
              onClick={() => toggleWatermark(!showWatermark)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.4rem 0.85rem",
                borderRadius: "6px",
                border: showWatermark ? "1.5px solid #0D5C96" : "1px solid #ccc",
                background: showWatermark ? "rgba(13, 92, 150, 0.12)" : "#fff",
                color: showWatermark ? "#0D5C96" : "#666",
                fontWeight: showWatermark ? "700" : "500",
                cursor: "pointer",
                fontSize: "0.85rem"
              }}
            >
              {showWatermark ? <CheckSquare size={16} /> : <Square size={16} />} {showWatermark ? "On" : "Off"}
            </button>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn" style={{ padding: "0 1rem", height: "42px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }} onClick={handleDownloadLocalPDF}>
              <Download size={16} /> Download PDF
            </button>
            <button className="btn" style={{ padding: "0 1rem", height: "42px" }} onClick={handleUploadCloudinary} disabled={uploading}>
              <Cloud size={16} /> {uploading ? "Saving..." : "Save to Cloud"}
            </button>
            <button className="btn btn-primary" style={{ padding: "0 1.5rem", height: "42px" }} onClick={() => window.print()}>
              <Printer size={16} /> Print Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Print Styles Sheet */}
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              background: #ffffff !important;
              color: #000000 !important;
              font-family: Arial, Helvetica, sans-serif !important;
            }
            .no-print, header, nav, .sidebar, .topbar, .right-sidebar {
              display: none !important;
            }
            .main-content {
              margin: 0 !important;
              padding: 0 !important;
            }
            .tax-invoice-sheet {
              box-shadow: none !important;
              border: none !important;
              margin: 0 auto !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
            }
          }
        `}
      </style>

      {/* Premium Executive Tax Invoice Printable Document Sheet */}
      <div 
        id="bill-content"
        className="tax-invoice-sheet"
        style={{
          background: "#ffffff",
          color: "#000000",
          fontFamily: "Arial, Helvetica, sans-serif",
          padding: "2.25rem",
          maxWidth: "940px",
          margin: "0 auto",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          borderRadius: "8px",
          border: "1px solid #E2E8F0",
          position: "relative",
          lineHeight: "1.35",
          overflow: "hidden"
        }}
      >
        {/* Official Company Background Watermark Overlay */}
        {showWatermark && (
          <div
            style={{
              position: "absolute",
              top: "52%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-24deg)",
              opacity: 0.07,
              pointerEvents: "none",
              zIndex: 0,
              userSelect: "none",
              textAlign: "center",
              width: "720px"
            }}
          >
            <img 
              src="/mc.png" 
              alt="Company Watermark" 
              style={{ width: "380px", height: "auto", filter: "grayscale(20%)", marginBottom: "0.75rem" }} 
            />
            <div style={{ fontSize: "3.2rem", fontWeight: "900", color: "#0C4A6E", letterSpacing: "3px", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              MULTIMARG CARRIERS
            </div>
          </div>
        )}

        {/* Top Decorative Gradient Accent Bar */}
        <div style={{ height: "5px", background: "linear-gradient(90deg, #0C4A6E 0%, #0288D1 50%, #0369A1 100%)", borderRadius: "8px 8px 0 0", margin: "-2.25rem -2.25rem 1.75rem -2.25rem" }} />

        {/* Header Section */}
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "0.75rem", justifyContent: "space-between" }}>
          <div style={{ width: "120px", flexShrink: 0 }}>
            <img src="/mc.png" alt="Multimarg Carriers Logo" style={{ height: "72px", objectFit: "contain" }} />
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: "0 1rem" }}>
            <h1 style={{ margin: "0 0 4px 0", color: "#0C4A6E", fontSize: "1.85rem", fontWeight: "900", letterSpacing: "0.5px" }}>
              MULTIMARG CARRIERS PVT. LTD.
            </h1>
            <p style={{ margin: "0 0 2px 0", color: "#0288D1", fontSize: "0.71rem", fontWeight: "700", whiteSpace: "nowrap" }}>
              ADDRESS : LIG-194, NEAR NATIONAL PUBLIC SCHOOL, AVAS VIKAS, RUDRAPUR-263153, UTTARAKHAND
            </p>
            <p style={{ margin: "0 0 2px 0", color: "#0288D1", fontSize: "0.71rem", fontWeight: "700", whiteSpace: "nowrap" }}>
              CONTACT : 05944-324033 &nbsp;&nbsp;|&nbsp;&nbsp; WEBSITE : www.multimargcarriers.co.in &nbsp;&nbsp;|&nbsp;&nbsp; EMAIL : info@multimargcarriers.co.in
            </p>
            <p style={{ margin: 0, color: "#0288D1", fontSize: "0.71rem", fontWeight: "700", whiteSpace: "nowrap" }}>
              GSTIN : 05AANCM3054E1ZN &nbsp;&nbsp;|&nbsp;&nbsp; PAN NO : AANCM3054E &nbsp;&nbsp;|&nbsp;&nbsp; CIN : U60300UR2020PTC010749
            </p>
          </div>

          {/* Original Copy Badge */}
          <div style={{ textAlign: "right", minWidth: "120px" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", background: "#F1F5F9", color: "#334155", padding: "0.35rem 0.65rem", borderRadius: "4px", border: "1px solid #CBD5E1", display: "inline-block" }}>
              ORIGINAL RECIPIENT
            </span>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "0.75rem", borderBottom: "2px solid #0C4A6E", paddingBottom: "0.4rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", color: "#0C4A6E" }}>
            Tax Invoice
          </h2>
        </div>

        {/* Outer Invoice Box */}
        <div style={{ border: "1.5px solid #000000", borderRadius: "2px", overflow: "hidden" }}>
          {/* Upper Grid: Bill To (Left 60%) & Invoice Meta (Right 40%) */}
          <div style={{ display: "flex", borderBottom: "1.5px solid #000000" }}>
            {/* Bill To */}
            <div style={{ flex: "1.4", padding: "0.75rem 0.85rem", borderRight: "1.5px solid #000000", background: "#FAFBFD" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: "800", textTransform: "uppercase", color: "#0C4A6E", letterSpacing: "0.5px", marginBottom: "0.35rem" }}>
                Bill To:
              </div>
              <h3 style={{ margin: "0 0 0.35rem 0", fontSize: "0.98rem", fontWeight: "800", color: "#0F172A" }}>
                {billData.client}
              </h3>
              <p style={{ margin: "0 0 0.35rem 0", fontSize: "0.82rem", fontWeight: "600", textTransform: "uppercase", color: "#334155", lineHeight: "1.3" }}>
                {billData.clientAddress}
              </p>
              <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.4rem", fontSize: "0.82rem", fontWeight: "700" }}>
                <span><strong style={{ color: "#0F172A" }}>GSTIN:</strong> {billData.gstin}</span>
                <span><strong style={{ color: "#0F172A" }}>State Code:</strong> {billData.stateCode}</span>
              </div>
            </div>

            {/* Invoice Meta Grid */}
            <div style={{ flex: "1", padding: "0.75rem 0.85rem", background: "#F1F5F9", display: "grid", gridTemplateColumns: "100px 1fr", rowGap: "0.45rem", fontSize: "0.85rem" }}>
              <div style={{ fontWeight: "800", color: "#334155" }}>Invoice No:</div>
              <div style={{ fontWeight: "800", color: "#0C4A6E" }}>{billData.billNo || billData.invoiceNo || "MCPL/26-27/0159"}</div>

              <div style={{ fontWeight: "800", color: "#334155" }}>Date:</div>
              <div style={{ fontWeight: "700", color: "#0F172A" }}>{billData.date || "30-07-2026"}</div>

              <div style={{ fontWeight: "800", color: "#334155" }}>Mode:</div>
              <div style={{ fontWeight: "700", color: "#0F172A" }}>{billData.mode || "Road"}</div>

              <div style={{ fontWeight: "800", color: "#334155" }}>SAC Code:</div>
              <div style={{ fontWeight: "700", color: "#0F172A" }}>{billData.sacCode || "996511"}</div>
            </div>
          </div>

          {/* LR / Items Table Grid (EXACT 16 COLUMNS PRESERVED 1:1) */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
            <thead>
              <tr style={{ background: "#FFFFFF", color: "#000000", borderBottom: "1.5px solid #000000" }}>
                <th style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #334155", width: "25px", textAlign: "center", fontWeight: "800", fontSize: "0.6rem", whiteSpace: "nowrap" }}>SI</th>
                <th style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #334155", width: "55px", textAlign: "center", fontWeight: "800", fontSize: "0.6rem", whiteSpace: "nowrap" }}>LR NO</th>
                <th style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #334155", width: "65px", textAlign: "center", fontWeight: "800", fontSize: "0.6rem", whiteSpace: "nowrap" }}>LR DT</th>
                <th style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #334155", width: "55px", textAlign: "center", fontWeight: "800", fontSize: "0.6rem", whiteSpace: "nowrap" }}>REF</th>
                <th style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #334155", width: "55px", textAlign: "center", fontWeight: "800", fontSize: "0.6rem", whiteSpace: "nowrap" }}>ORG</th>
                <th style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #334155", width: "65px", textAlign: "center", fontWeight: "800", fontSize: "0.6rem", whiteSpace: "nowrap" }}>DEST</th>
                <th style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #334155", width: "35px", textAlign: "center", fontWeight: "800", fontSize: "0.6rem", whiteSpace: "nowrap" }}>PKG</th>
                <th style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #334155", width: "40px", textAlign: "center", fontWeight: "800", fontSize: "0.6rem", whiteSpace: "nowrap" }}>WT</th>
                <th style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #334155", width: "40px", textAlign: "center", fontWeight: "800", fontSize: "0.6rem", whiteSpace: "nowrap" }}>RATE</th>
                <th style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #334155", width: "50px", textAlign: "center", fontWeight: "800", fontSize: "0.6rem", whiteSpace: "nowrap" }}>FREIGHT</th>
                <th style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #334155", width: "50px", textAlign: "center", fontWeight: "800", fontSize: "0.6rem", whiteSpace: "nowrap" }}>AWB CHG</th>
                <th style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #334155", width: "40px", textAlign: "center", fontWeight: "800", fontSize: "0.6rem", whiteSpace: "nowrap" }}>PICK</th>
                <th style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #334155", width: "40px", textAlign: "center", fontWeight: "800", fontSize: "0.6rem", whiteSpace: "nowrap" }}>DEL</th>
                <th style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #334155", width: "45px", textAlign: "center", fontWeight: "800", fontSize: "0.6rem", whiteSpace: "nowrap" }}>SPL</th>
                <th style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #334155", width: "40px", textAlign: "center", fontWeight: "800", fontSize: "0.6rem", whiteSpace: "nowrap" }}>OTH</th>
                <th style={{ padding: "0.4rem 0.4rem", textAlign: "right", fontWeight: "800", fontSize: "0.6rem", whiteSpace: "nowrap" }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {itemsList.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: "1.5px solid #000000", background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}>
                  <td style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #000000", textAlign: "center", fontWeight: "700", fontSize: "0.65rem", whiteSpace: "nowrap" }}>{item.si || idx + 1}</td>
                  <td style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #000000", textAlign: "center", fontWeight: "800", color: "#0C4A6E", fontSize: "0.65rem", whiteSpace: "nowrap" }}>{item.lrNo}</td>
                  <td style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem", whiteSpace: "nowrap" }}>{item.lrDt}</td>
                  <td style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem", whiteSpace: "nowrap" }}>{item.ref}</td>
                  <td style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem", whiteSpace: "nowrap" }}>{item.org}</td>
                  <td style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem", whiteSpace: "nowrap" }}>{item.dest}</td>
                  <td style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem", whiteSpace: "nowrap" }}>{item.pkg}</td>
                  <td style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem", whiteSpace: "nowrap" }}>{item.wt}</td>
                  <td style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem", whiteSpace: "nowrap" }}>{item.rate}</td>
                  <td style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem", whiteSpace: "nowrap" }}>{item.frg}</td>
                  <td style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem", whiteSpace: "nowrap" }}>{item.lr}</td>
                  <td style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem", whiteSpace: "nowrap" }}>{item.pick}</td>
                  <td style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem", whiteSpace: "nowrap" }}>{item.del}</td>
                  <td style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem", whiteSpace: "nowrap" }}>{item.spl}</td>
                  <td style={{ padding: "0.4rem 0.2rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem", whiteSpace: "nowrap" }}>{item.oth}</td>
                  <td style={{ padding: "0.4rem 0.4rem", textAlign: "right", fontWeight: "800", color: "#0F172A", fontSize: "0.65rem", whiteSpace: "nowrap" }}>{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Lower Grid: Accounts Details (Left) & Tax Summary (Right) */}
          <div style={{ display: "flex" }}>
            {/* Accounts Details (Left 60%) */}
            <div style={{ flex: "1.4", padding: "0.75rem 0.85rem", borderRight: "1.5px solid #000000", background: "#F8FAFC", fontSize: "0.85rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: "800", textTransform: "uppercase", color: "#0C4A6E", letterSpacing: "0.5px", marginBottom: "0.4rem" }}>
                Accounts Details
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", rowGap: "0.35rem", fontSize: "0.85rem" }}>
                <div style={{ fontWeight: "800", color: "#475569" }}>Bank:</div>
                <div style={{ fontWeight: "700", color: "#0F172A" }}>{billData.bankDetails?.bank || "Bank of Baroda, Rudrapur"}</div>

                <div style={{ fontWeight: "800", color: "#475569" }}>A/c:</div>
                <div style={{ fontWeight: "800", color: "#0C4A6E", fontFamily: "monospace", fontSize: "0.9rem" }}>{billData.bankDetails?.acNo || "24980400007426"}</div>

                <div style={{ fontWeight: "800", color: "#475569" }}>IFSC:</div>
                <div style={{ fontWeight: "800", color: "#0F172A", fontFamily: "monospace" }}>{billData.bankDetails?.ifsc || "BARBORUDAVA"}</div>
              </div>
            </div>

            {/* Tax Totals Grid (Right 40%) */}
            <div style={{ flex: "1", padding: "0.6rem 0.85rem", fontSize: "0.85rem", background: "#FFFFFF" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                <span style={{ fontWeight: "700", color: "#475569" }}>Subtotal:</span>
                <span style={{ fontWeight: "800", color: "#0F172A" }}>₹{subtotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                <span style={{ fontWeight: "700", color: "#475569" }}>CGST:</span>
                <span style={{ fontWeight: "600" }}>₹{cgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                <span style={{ fontWeight: "700", color: "#475569" }}>SGST:</span>
                <span style={{ fontWeight: "600" }}>₹{sgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.45rem" }}>
                <span style={{ fontWeight: "700", color: "#475569" }}>IGST:</span>
                <span style={{ fontWeight: "600" }}>₹{igstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0.6rem", background: "#0C4A6E", color: "#FFFFFF", borderRadius: "4px", fontWeight: "900", fontSize: "1rem", marginTop: "0.2rem" }}>
                <span>Total Payable:</span>
                <span>₹{totalPayableVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Amount In Words Highlight Box */}
        <div style={{ marginTop: "0.85rem", marginBottom: "1.25rem", padding: "0.6rem 0.85rem", background: "#F1F5F9", borderRadius: "4px", borderLeft: "4px solid #0C4A6E", fontSize: "0.88rem" }}>
          <strong style={{ color: "#0C4A6E" }}>Amount In Words:</strong> &nbsp;<span style={{ fontWeight: "700", color: "#0F172A" }}>{numberToWordsIndian(totalPayableVal)}</span>
        </div>

        {/* Terms & Signature Section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", gap: "1.5rem" }}>
          {/* Terms & Conditions */}
          <div style={{ flex: 1.2, fontSize: "0.82rem", background: "#FAFBFD", padding: "0.75rem", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
            <p style={{ margin: "0 0 0.35rem 0", fontWeight: "800", textTransform: "uppercase", color: "#0C4A6E", fontSize: "0.8rem", letterSpacing: "0.5px" }}>Terms & Conditions</p>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: "1.45", color: "#334155" }}>
              <li style={{ marginBottom: "0.25rem" }}>Payment due on receipt of the bill.</li>
              <li style={{ marginBottom: "0.25rem" }}>Payment to be made by Cheque/DD/RTGS in favour of <strong>MULTIMARG CARRIERS PVT. LTD.</strong> only.</li>
              <li>Interest will be charged at 18% per annum if the payment not made within agreed period.</li>
            </ul>
          </div>

          {/* Official Stamp & Authorised Signature Block */}
          <div style={{ flex: 0.8, textAlign: "center", minWidth: "220px", background: "#FFFFFF", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
            <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.88rem", fontWeight: "800", color: "#0F172A" }}>
              For Multimarg Carriers Pvt. Ltd.
            </p>

            {/* Stamp Slot: Conditional based on includeStamp toggle & custom uploaded stamp image */}
            <div style={{ height: "105px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0.25rem 0" }}>
              {includeStamp ? (
                (localStorage.getItem("company_custom_stamp") || globalSettings?.company?.companyStampUrl) ? (
                  <img 
                    src={localStorage.getItem("company_custom_stamp") || globalSettings?.company?.companyStampUrl} 
                    alt="Official Company Stamp" 
                    style={{ maxHeight: '105px', maxWidth: '140px', objectFit: 'contain', transform: 'rotate(-4deg)' }} 
                  />
                ) : (
                  <CompanyStamp size={105} />
                )
              ) : (
                <div style={{ height: "65px" }}></div>
              )}
            </div>

            <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: "800", color: "#0C4A6E" }}>
              (Authorised Sign)
            </p>
          </div>
        </div>

        {/* Bottom Footer Note */}
        <div style={{ textAlign: "center", fontSize: "0.85rem", fontWeight: "700", color: "#0C4A6E", marginTop: "1rem", letterSpacing: "1px" }}>
          ❖ Thank You For Your Business ❖
        </div>
      </div>
    </div>
  );
};

export default BillView1;