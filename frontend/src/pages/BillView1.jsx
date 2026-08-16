import React, { useState, useEffect, useContext, } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Printer, Cloud, Download, CheckSquare, Square, ArrowLeft } from "lucide-react";
import axios from "axios";
import CompanyStamp from "../components/CompanyStamp";
import { SettingsContext } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import appDB from "../utils/appDB";
import { downloadViaPuppeteer } from "../utils/puppeteerPdf";
import { formatDate } from "../utils/formatters";

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
  const navigate = useNavigate();
  const { id: paramId } = useParams();
  const searchParams = new URLSearchParams(useLocation().search);
  const id = paramId || searchParams.get("id");
  const { globalSettings } = useContext(SettingsContext);
  const { addToast } = useToast();
  const [bill, setBill] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Email states
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState("idle");
  const [emailStatusMsg, setEmailStatusMsg] = useState("");
  const [emailSentCount, setEmailSentCount] = useState(0);
  const [emailSentTo, setEmailSentTo] = useState([]);

  useEffect(() => {
    if (bill) {
      setEmailSentCount(bill.emailSentCount || 0);
      setEmailSentTo(bill.emailSentTo || []);
    }
  }, [bill]);

  useEffect(() => {
    if (bill && clients.length > 0) {
      const clientName = typeof bill.client === 'string' ? bill.client : (bill.client?.name || bill.clientName || bill.customerName || "");
      const bName = String(clientName || "").trim().toLowerCase();
      
      const matched = clients.find(c => {
        const cName = String(c.name || "").trim().toLowerCase();
        const codeLower = String(c.clientCode || "").trim().toLowerCase();
        if (cName === bName || codeLower === bName) return true;
        
        const cNameClean = cName.replace(/[^a-z0-9]/g, '');
        const bNameClean = bName.replace(/[^a-z0-9]/g, '');
        if (cNameClean.length > 5 && bNameClean.length > 5) {
          if (cNameClean.includes(bNameClean) || bNameClean.includes(cNameClean)) return true;
        }
        return false;
      });

      if (matched && matched.email) {
        setRecipientEmail(matched.email);
      }
    }
  }, [bill, clients]);
  
  // Option toggle for official company stamp
  const [includeStamp, setIncludeStamp] = useState(() => {
    try {
      const saved = appDB.memGet("bill_include_stamp");
      return saved !== null ? saved : true;
    } catch (_e) {
      return true;
    }
  });

  const toggleStamp = (val) => {
    setIncludeStamp(val);
    try {
      appDB.set("bill_include_stamp", val);
    } catch (_e) {}
  };

  // Option toggle for official company background watermark
  const [showWatermark, setShowWatermark] = useState(() => {
    try {
      const saved = appDB.memGet("bill_show_watermark");
      return saved !== null ? saved : true;
    } catch (_e) {
      return true;
    }
  });

  const toggleWatermark = (val) => {
    setShowWatermark(val);
    try {
      appDB.set("bill_show_watermark", val);
    } catch (_e) {}
  };

  const [clients, setClients] = useState([]);
  const [scale, setScale] = useState(1);
  const [sheetHeight, setSheetHeight] = useState(1150);
  const containerRef = React.useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const horizontalMargin = window.innerWidth < 600 ? 16 : 32;
        const availWidth = containerWidth - horizontalMargin;
        setScale(Math.min(1, Math.max(0.2, availWidth / 940)));
      } else {
        const screenW = window.innerWidth;
        const horizontalMargin = screenW < 600 ? 32 : 48;
        setScale(Math.min(1, Math.max(0.2, (screenW - horizontalMargin) / 940)));
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    const timer = setTimeout(handleResize, 150);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const measureHeight = () => {
      const el = document.getElementById("bill-content");
      if (el) {
        setSheetHeight(el.scrollHeight || 1150);
      }
    };
    measureHeight();
    const timer = setTimeout(measureHeight, 300);
    return () => clearTimeout(timer);
  }, [bill, scale, includeStamp, showWatermark]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [billRes, clientsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills/${encodeURIComponent(id)}`),
          axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/clients`)
        ]);
        if (billRes.data.success) setBill(billRes.data.data);
        if (clientsRes.data.success) setClients(clientsRes.data.data || []);
      } catch (err) {
        console.error("Error fetching bill or clients", err);
      }
    };
    fetchData();
  }, [id]);

  const handleUploadCloudinary = async () => {
    setUploading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bills/${encodeURIComponent(id)}/upload-pdf`);
      if (res.data.success) {
        addToast("PDF saved to Cloudinary successfully!", "success");
        setBill({ ...bill, pdfUrl: res.data.data.url });
      } else {
        addToast("Failed to upload PDF", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Failed to upload PDF", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadLocalPDF = async (autoPrint = false) => {
    const clientName = typeof billData?.client === 'string' ? billData.client : (billData?.client?.name || billData?.clientName || billData?.customerName || "");
    const billNo = (billData?.invoice || billData?.billNo || billData?.invoiceNo || id).toString().replace(/[\/\\]/g, "_");
    const filename = `${billNo}${clientName ? " - " + clientName.toUpperCase() : ""}.pdf`;
    
    try {
      await downloadViaPuppeteer({
        elementId: "bill-content",
        filename,
        landscape: false,
        autoPrint
      });
    } catch (err) {
      console.error("Puppeteer PDF generation error:", err);
      addToast("Failed to generate PDF via backend", "error");
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientEmail.trim()) {
      alert("Please enter a valid recipient email address.");
      return;
    }
    
    setIsSendingEmail(true);
    setEmailStatus("sending");
    setEmailStatusMsg("Generating Tax Invoice PDF on browser...");
    
    try {
      const element = document.getElementById("bill-content");
      if (!element) {
        throw new Error("Tax Invoice content not found");
      }

      // Clone and clean element for PDF printing
      const clone = element.cloneNode(true);
      clone.style.transform = "none";
      clone.style.position = "static";
      clone.style.margin = "0";
      clone.style.width = "940px";
      clone.style.boxSizing = "border-box";
      clone.style.padding = "0";

      // Convert canvas elements to images if any
      const originalCanvases = element.querySelectorAll("canvas");
      const cloneCanvases = clone.querySelectorAll("canvas");
      originalCanvases.forEach((origCanvas, idx) => {
        if (cloneCanvases[idx]) {
          try {
            const dataUrl = origCanvas.toDataURL("image/png");
            const img = document.createElement("img");
            img.src = dataUrl;
            img.style.cssText = origCanvas.style.cssText || "display: block;";
            if (origCanvas.style.width) img.style.width = origCanvas.style.width;
            if (origCanvas.style.height) img.style.height = origCanvas.style.height;
            cloneCanvases[idx].parentNode.replaceChild(img, cloneCanvases[idx]);
          } catch (_e) {}
        }
      });

      const opt = {
        margin: [2, 2, 2, 2],
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 1.5, useCORS: true, logging: false, width: 940, windowWidth: 940 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ['avoid-all'] }
      };

      setEmailStatusMsg("Sending Tax Invoice via email...");
      const html2pdf = (await import("html2pdf.js")).default;
      const dataUri = await html2pdf().set(opt).from(clone).outputPdf('datauristring');
      const pdfBase64 = dataUri.split(';base64,')[1];

      const clientName = typeof billData?.client === 'string' ? billData.client : (billData?.client?.name || billData?.clientName || billData?.customerName || "");
      const billNo = (billData?.invoice || billData?.billNo || billData?.invoiceNo || id).toString().replace(/[\/\\]/g, "_");
      const filename = `${billNo}${clientName ? " - " + clientName.toUpperCase() : ""}.pdf`;

      const response = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/email/send-bill`, {
        billId: id,
        to: recipientEmail,
        pdfBase64,
        filename
      });
      
      if (response.data.success) {
        setEmailStatus("success");
        setEmailStatusMsg("Email successfully sent with attachment!");
        setEmailSentCount(prev => prev + 1);
        setEmailSentTo(prev => Array.from(new Set([...prev, ...recipientEmail.split(",").map(e => e.trim())])));
        addToast("Tax Invoice emailed successfully!", "success");
      } else {
        throw new Error(response.data.message || "Failed to send email");
      }
    } catch (err) {
      console.error("Failed to email Tax Invoice:", err);
      setEmailStatus("error");
      setEmailStatusMsg(`Error: ${err.message || "Failed to send email"}`);
      addToast(err.message || "Failed to email Tax Invoice", "error");
    } finally {
      setIsSendingEmail(false);
    }
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

  const _customStampUrl = globalSettings?.company?.companyStampUrl || "";

  const matchedClient = clients.find(c => {
    const cName = String(c.name || "").trim().toLowerCase();
    const bName = String(billData.client || "").trim().toLowerCase();
    if (cName === bName) return true;
    
    // Smart fuzzy match: ignore special characters and spaces
    const cNameClean = cName.replace(/[^a-z0-9]/g, '');
    const bNameClean = bName.replace(/[^a-z0-9]/g, '');
    
    if (cNameClean.length > 5 && bNameClean.length > 5) {
      if (cNameClean.includes(bNameClean) || bNameClean.includes(cNameClean)) return true;
      
      // Match if the first two main words are identical
      const cWords = cName.split(/[\s\-\(\)]+/).filter(w => w.length > 2);
      const bWords = bName.split(/[\s\-\(\)]+/).filter(w => w.length > 2);
      if (cWords.length >= 2 && bWords.length >= 2 && cWords[0] === bWords[0] && cWords[1] === bWords[1]) {
        return true;
      }
    }
    return false;
  }) || {};
  
  const displayAddress = (matchedClient.address && matchedClient.address.trim() !== "") 
    ? matchedClient.address 
    : (billData.clientAddress || "");
    
  const displayGst = (matchedClient.gst && matchedClient.gst.trim() !== "") 
    ? matchedClient.gst 
    : (billData.gstin || "");

  return (
    <div ref={containerRef} style={{ width: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      {/* Top Controls Bar (Hidden during Print) */}
      <div className="no-print" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", background: "var(--panel-solid-bg)", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid var(--border-color)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button className="btn" style={{ background: "white", border: "1px solid #cbd5e1", color: "#475569", fontWeight: 600, padding: "6px 12px", fontSize: "0.85rem" }} onClick={() => navigate(-1)}>
              <ArrowLeft size={16} className="mr-1" /> Back
            </button>
            <div>
              <h3 style={{ fontSize: "1.15rem", margin: 0, color: "var(--text-dark)", lineHeight: 1.2 }}>Tax Invoice View</h3>
              <p className="text-muted" style={{ margin: 0, fontSize: "0.78rem" }}>Invoice ID: {billData.billNo || id}</p>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
            {/* Stamp Toggle Control Option */}
            <button
              type="button"
              onClick={() => toggleStamp(!includeStamp)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "6px 14px", borderRadius: "6px",
                border: includeStamp ? "1.5px solid #10b981" : "1.5px solid #cbd5e1",
                background: includeStamp ? "#ecfdf5" : "#ffffff",
                color: includeStamp ? "#047857" : "#64748b",
                fontWeight: "700", cursor: "pointer", fontSize: "0.85rem",
                boxShadow: includeStamp ? "0 2px 4px rgba(16, 185, 129, 0.15)" : "none"
              }}
            >
              {includeStamp ? <CheckSquare size={16} color="#047857" /> : <Square size={16} color="#64748b" />} Official Stamp: {includeStamp ? "YES (Included)" : "NO (Hidden)"}
            </button>

            {/* Watermark Toggle Control Option */}
            <button
              type="button"
              onClick={() => toggleWatermark(!showWatermark)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "6px 10px", borderRadius: "6px",
                border: showWatermark ? "1.5px solid #0D5C96" : "1px solid #cbd5e1",
                background: showWatermark ? "rgba(13, 92, 150, 0.1)" : "#fff",
                color: showWatermark ? "#0D5C96" : "#64748b",
                fontWeight: "600", cursor: "pointer", fontSize: "0.8rem"
              }}
            >
              {showWatermark ? <CheckSquare size={14} /> : <Square size={14} />} Watermark: {showWatermark ? "On" : "Off"}
            </button>

            {/* Action Buttons */}
            <button className="btn" style={{ padding: "6px 12px", fontSize: "0.8rem", background: "#10b981", color: "white", border: "none", fontWeight: 600 }} onClick={() => handleDownloadLocalPDF(false)}>
              <Download size={14} className="mr-1" /> PDF
            </button>
            <button className="btn" style={{ padding: "6px 12px", fontSize: "0.8rem", background: "#0288d1", color: "white", border: "none", fontWeight: 600 }} onClick={handleUploadCloudinary} disabled={uploading}>
              <Cloud size={14} className="mr-1" /> {uploading ? "Saving..." : "Cloud"}
            </button>
            <button className="btn btn-primary" style={{ padding: "6px 12px", fontSize: "0.8rem", background: "#1e293b", color: "white", border: "none", fontWeight: 600 }} onClick={() => handleDownloadLocalPDF(true)}>
              <Printer size={14} className="mr-1" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* AWS Console-themed Send Email Panel */}
      <div className="no-print" style={{
        margin: "0.5rem 0 1rem 0",
        padding: "0.75rem 1rem",
        background: "#fafafa",
        border: "1px solid #d5dbdb",
        borderLeft: "4px solid #ec7211",
        borderRadius: "2px",
        fontFamily: "'Amazon Ember', 'Helvetica Neue', Roboto, sans-serif"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "280px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "#16191f", textTransform: "uppercase", letterSpacing: "0.5px" }}>Send Invoice Email:</span>
            
            <div style={{ display: "flex", alignItems: "center", position: "relative", flex: 1, maxWidth: "450px" }}>
              <input
                type="text"
                placeholder="Recipient Email ID(s) (comma separated)"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                disabled={isSendingEmail}
                style={{
                  width: "100%",
                  padding: "4px 8px",
                  fontSize: "0.8rem",
                  border: "1px solid #aab7b8",
                  borderRadius: "2px",
                  outline: "none",
                  height: "28px",
                  fontFamily: "monospace"
                }}
              />
            </div>

            <button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !recipientEmail.trim()}
              style={{
                background: isSendingEmail ? "#eaeded" : "#ec7211",
                color: isSendingEmail ? "#aab7b8" : "#ffffff",
                border: "1px solid " + (isSendingEmail ? "#d5dbdb" : "#dd6b10"),
                padding: "0 14px",
                height: "28px",
                fontSize: "0.78rem",
                fontWeight: "700",
                borderRadius: "2px",
                cursor: isSendingEmail || !recipientEmail.trim() ? "not-allowed" : "pointer",
                transition: "all 0.1s ease-in-out",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              {isSendingEmail ? (
                <>
                  <span className="spinner-border spinner-border-sm" style={{ width: "12px", height: "12px", borderWidth: "1.5px", display: "inline-block", borderRadius: "50%", borderStyle: "solid", borderColor: "#aab7b8 transparent #aab7b8 transparent", animation: "spin 0.8s linear infinite" }} /> Sending...
                </>
              ) : "Send Invoice"}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem" }}>
            <span style={{ color: "#545b64", fontWeight: "600" }}>
              Sent Count: <strong style={{ color: "#16191f" }}>{emailSentCount}</strong>
            </span>
            {emailSentTo.length > 0 && (
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ color: "#879196" }}>|</span>
                <span style={{ color: "#545b64", fontWeight: "600" }}>Sent To:</span>
                {emailSentTo.map((mail, idx) => (
                  <span key={idx} style={{
                    padding: "2px 6px",
                    background: "#eaeded",
                    color: "#44494f",
                    borderRadius: "12px",
                    fontSize: "0.7rem",
                    fontWeight: "600",
                    border: "1px solid #d5dbdb"
                  }}>
                    {mail}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status log lines */}
        {emailStatus !== "idle" && (
          <div style={{
            marginTop: "6px",
            fontSize: "0.72rem",
            fontWeight: "700",
            color: emailStatus === "sending" ? "#0073bb" : emailStatus === "success" ? "#067f58" : "#d13212"
          }}>
            {emailStatus === "sending" ? "● " : emailStatus === "success" ? "✓ " : "❌ "}
            {emailStatusMsg}
          </div>
        )}
      </div>

      {/* Print Styles Sheet */}
      <style>
        {`
          .print-container,
          .print-container *,
          .print-container div,
          .print-container div:has(> table) {
            max-width: none !important;
            min-width: 0 !important;
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            box-sizing: border-box !important;
          }
          .print-container table,
          .tax-invoice-sheet table {
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
          }

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
              transform: none !important;
            }
          }
        `}
      </style>

      {/* Premium Executive Tax Invoice Printable Document Sheet */}
      <div style={{ display: "flex", justifyContent: "center", width: "100%", paddingBottom: "2rem" }}>
        <div style={{ width: `${940 * scale}px`, height: `${sheetHeight * scale}px`, position: "relative" }}>
          <div id="bill-content" className="print-container" style={{
            width: "940px",
            height: `${sheetHeight}px`,
            background: "white",
            color: "#0f172a",
            boxSizing: "border-box",
            overflow: "hidden",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0
          }}>
          <div 
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
          <div style={{ width: "145px", flexShrink: 0 }}>
            <img src="/mc.png" alt="Multimarg Carriers Logo" style={{ height: "88px", width: "100%", objectFit: "contain" }} />
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: "0 1rem" }}>
            <h1 style={{ margin: "0 0 4px 0", color: "#0C4A6E", fontSize: "1.85rem", fontWeight: "900", letterSpacing: "0.5px" }}>
              MULTIMARG CARRIERS PVT. LTD.
            </h1>
            <p style={{ margin: "0 0 2px 0", color: "#0288D1", fontSize: "0.71rem", fontWeight: "700", whiteSpace: "nowrap" }}>
              ADDRESS : LIG-194, NEAR NATIONAL PUBLIC SCHOOL, AVAS VIKAS, RUDRAPUR-263153, UTTARAKHAND
            </p>
            <p style={{ margin: "0 0 2px 0", color: "#0288D1", fontSize: "0.71rem", fontWeight: "700", whiteSpace: "nowrap" }}>
              CONTACT : +91 5944-324033 &nbsp;&nbsp;|&nbsp;&nbsp; WEBSITE : <a href="https://multimarg.com" target="_blank" rel="noreferrer" className="no-transform" style={{ color: "#0288D1", textDecoration: "none", textTransform: "lowercase" }}>multimarg.com</a> &nbsp;&nbsp;|&nbsp;&nbsp; EMAIL : <a href="mailto:info@multimarg.com" className="no-transform" style={{ color: "#0288D1", textDecoration: "none", textTransform: "lowercase" }}>info@multimarg.com</a>
            </p>
            <p style={{ margin: 0, color: "#0288D1", fontSize: "0.71rem", fontWeight: "700", whiteSpace: "nowrap" }}>
              GSTIN : 05AANCM3054E1ZN &nbsp;&nbsp;|&nbsp;&nbsp; PAN NO : AANCM3054E &nbsp;&nbsp;|&nbsp;&nbsp; CIN : U60300UR2020PTC010749
            </p>
          </div>
          <div style={{ minWidth: "145px" }}></div>
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
              <h3 style={{ margin: "0 0 0.35rem 0", fontSize: "0.98rem", fontWeight: "800", color: "#0F172A", textTransform: "uppercase" }}>
                {billData.client}
              </h3>
              <p style={{ margin: "0 0 0.35rem 0", fontSize: "0.82rem", fontWeight: "600", textTransform: "uppercase", color: "#334155", lineHeight: "1.3" }}>
                {displayAddress}
              </p>
              <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.4rem", fontSize: "0.82rem", fontWeight: "700" }}>
                <span><strong style={{ color: "#0F172A" }}>GSTIN:</strong> {displayGst ? String(displayGst).toUpperCase() : ""}</span>
                <span><strong style={{ color: "#0F172A" }}>State Code:</strong> {billData.stateCode}</span>
              </div>
            </div>

            {/* Invoice Meta Grid */}
            <div style={{ flex: "1", padding: "0.75rem 0.85rem", background: "#F1F5F9", display: "grid", gridTemplateColumns: "100px 1fr", rowGap: "0.45rem", fontSize: "0.85rem" }}>
              <div style={{ fontWeight: "800", color: "#334155" }}>Invoice No:</div>
              <div style={{ fontWeight: "800", color: "#0C4A6E" }}>{billData.invoice || billData.billNo || billData.invoiceNo || "MCPL/26-27/0159"}</div>

              <div style={{ fontWeight: "800", color: "#334155" }}>Date:</div>
              <div style={{ fontWeight: "700", color: "#0F172A" }}>{formatDate(billData.invoice_date || billData.date || billData.lrDate || new Date())}</div>

              <div style={{ fontWeight: "800", color: "#334155" }}>Mode:</div>
              <div style={{ fontWeight: "700", color: "#0F172A", textTransform: "uppercase" }}>{billData.mode || "Road"}</div>

              <div style={{ fontWeight: "800", color: "#334155" }}>SAC Code:</div>
              <div style={{ fontWeight: "700", color: "#0F172A" }}>
                {(() => {
                  const modeLower = (billData.mode || "Road").toLowerCase();
                  if (modeLower === "train") return "996512";
                  if (modeLower === "air") return "996531";
                  return "996511";
                })()}
              </div>
            </div>
          </div>

          {/* LR / Items Table Grid (EXACT 16 COLUMNS OPTIMIZED FOR ALL DATA) */}
          <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", fontSize: "0.74rem" }}>
            <thead>
              <tr style={{ background: "#FFFFFF", color: "#000000", borderBottom: "1.5px solid #000000" }}>
                <th style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #334155", width: "3%", textAlign: "center", fontWeight: "800", fontSize: "0.58rem" }}>SI</th>
                <th style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #334155", width: "8%", textAlign: "center", fontWeight: "800", fontSize: "0.58rem" }}>LR NO</th>
                <th style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #334155", width: "8%", textAlign: "center", fontWeight: "800", fontSize: "0.58rem" }}>LR DT</th>
                <th style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #334155", width: "13%", textAlign: "center", fontWeight: "800", fontSize: "0.58rem" }}>REF</th>
                <th style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #334155", width: "8%", textAlign: "center", fontWeight: "800", fontSize: "0.58rem" }}>ORG</th>
                <th style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #334155", width: "12%", textAlign: "center", fontWeight: "800", fontSize: "0.58rem" }}>DEST</th>
                <th style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #334155", width: "4%", textAlign: "center", fontWeight: "800", fontSize: "0.58rem" }}>PKG</th>
                <th style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #334155", width: "4%", textAlign: "center", fontWeight: "800", fontSize: "0.58rem" }}>WT</th>
                <th style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #334155", width: "4%", textAlign: "center", fontWeight: "800", fontSize: "0.58rem" }}>RATE</th>
                <th style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #334155", width: "7%", textAlign: "center", fontWeight: "800", fontSize: "0.58rem" }}>FREIGHT</th>
                <th style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #334155", width: "4%", textAlign: "center", fontWeight: "800", fontSize: "0.58rem" }}>AWB</th>
                <th style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #334155", width: "4%", textAlign: "center", fontWeight: "800", fontSize: "0.58rem" }}>PCK</th>
                <th style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #334155", width: "4%", textAlign: "center", fontWeight: "800", fontSize: "0.58rem" }}>DEL</th>
                <th style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #334155", width: "3.5%", textAlign: "center", fontWeight: "800", fontSize: "0.58rem" }}>SPL</th>
                <th style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #334155", width: "3.5%", textAlign: "center", fontWeight: "800", fontSize: "0.58rem" }}>OTH</th>
                <th style={{ padding: "0.35rem 0.25rem", width: "10%", textAlign: "right", fontWeight: "800", fontSize: "0.58rem" }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {itemsList.map((item, idx) => {
                const refVal = item.ref || item.invoiceNo || item.invoiceNumber || item.invoice_number || (Array.isArray(item.invoiceDetails) ? item.invoiceDetails.map(i => i.invoiceNo || i.invoiceNumber).filter(Boolean).join(", ") : "") || "-";
                return (
                  <tr key={idx} style={{ pageBreakInside: "avoid", borderBottom: "1.5px solid #000000", background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}>
                    <td style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #000000", textAlign: "center", fontWeight: "700", fontSize: "0.65rem", wordBreak: "break-word", overflowWrap: "break-word" }}>{item.si || idx + 1}</td>
                    <td style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #000000", textAlign: "center", fontWeight: "800", color: "#0C4A6E", fontSize: "0.65rem", wordBreak: "break-word", overflowWrap: "break-word" }}>{item.lrNo || item.awb}</td>
                    <td style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem", wordBreak: "break-word", overflowWrap: "break-word" }}>{formatDate(item.lrDt || item.awb_date || item.date)}</td>
                    <td style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #000000", textAlign: "center", fontWeight: "600", fontSize: "0.62rem", wordBreak: "break-word", overflowWrap: "break-word" }}>{refVal}</td>
                    <td style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem", wordBreak: "break-word", overflowWrap: "break-word" }}>{item.org || item.origin}</td>
                    <td style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem", wordBreak: "break-word", overflowWrap: "break-word" }}>{item.dest || item.destination}</td>
                    <td style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem" }}>{item.pkg || item.box}</td>
                    <td style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem" }}>{item.wt || item.weight}</td>
                    <td style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem" }}>{item.rate}</td>
                    <td style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem" }}>{item.frg || item.frieght}</td>
                    <td style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem" }}>{item.lr || item.awb_charge}</td>
                    <td style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem" }}>{item.pick || item.pickup}</td>
                    <td style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem" }}>{item.del || item.delivery}</td>
                    <td style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem" }}>{item.spl || item.special_delivery}</td>
                    <td style={{ padding: "0.35rem 0.15rem", borderRight: "1px solid #000000", textAlign: "center", fontSize: "0.65rem" }}>{item.oth || item.other_charge}</td>
                    <td style={{ padding: "0.35rem 0.25rem", textAlign: "right", fontWeight: "800", color: "#0F172A", fontSize: "0.65rem" }}>{item.total || (parseFloat(item.frieght || 0) + parseFloat(item.awb_charge || 0) + parseFloat(item.pickup || 0) + parseFloat(item.delivery || 0) + parseFloat(item.special_delivery || 0) + parseFloat(item.other_charge || 0)).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Lower Grid: Accounts Details (Left) & Tax Summary (Right) */}
          <div style={{ display: "flex", borderTop: "1.5px solid #000000" }}>
            {/* Accounts Details (Left 60%) */}
                <div style={{ flex: "1.4", padding: "0.75rem 0.85rem", borderRight: "1.5px solid #000000", background: "#F8FAFC", fontSize: "0.85rem" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: "800", textTransform: "uppercase", color: "#0C4A6E", letterSpacing: "0.5px", marginBottom: "0.4rem" }}>
                    Accounts Details
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", rowGap: "0.35rem", fontSize: "0.85rem" }}>
                    <div style={{ fontWeight: "800", color: "#475569" }}>Bank:</div>
                    <div style={{ fontWeight: "700", color: "#0F172A" }}>{billData.bankDetails?.bank || "Bank of Baroda, Rudrapur"}</div>

                    <div style={{ fontWeight: "800", color: "#475569" }}>A/c:</div>
                    <div style={{ fontWeight: "800", color: "#000000", fontFamily: "monospace", fontSize: "0.9rem" }}>{billData.bankDetails?.acNo || "24980400007426"}</div>

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
                    <span style={{ fontWeight: "700", color: "#475569" }}>CGST ({cgstVal > 0 && billData.gst ? (parseFloat(billData.gst) / 2) + "%" : "0%"}):</span>
                    <span style={{ fontWeight: "600" }}>₹{cgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <span style={{ fontWeight: "700", color: "#475569" }}>SGST ({sgstVal > 0 && billData.gst ? (parseFloat(billData.gst) / 2) + "%" : "0%"}):</span>
                    <span style={{ fontWeight: "600" }}>₹{sgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.45rem" }}>
                    <span style={{ fontWeight: "700", color: "#475569" }}>IGST ({igstVal > 0 && billData.gst ? parseFloat(billData.gst) + "%" : "0%"}):</span>
                    <span style={{ fontWeight: "600" }}>₹{igstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0.6rem", background: "#0C4A6E", color: "#FFFFFF", borderRadius: "4px", fontWeight: "900", fontSize: "1rem", marginTop: "0.2rem" }}>
                    <span>Total Payable:</span>
                    <span>₹{totalPayableVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

          {/* CLOSE OUTER INVOICE BOX */}
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
                    <li style={{ marginBottom: "0.25rem" }}>Interest will be charged at 18% per annum if the payment not made within agreed period.</li>
                    <li>Contact within 3 days in case of any discrepancy in this bill.</li>
                  </ul>
                </div>

                {/* Official Stamp & Authorised Signature Block */}
                <div style={{ flex: 0.8, textAlign: "center", minWidth: "220px", background: "#FFFFFF", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.88rem", fontWeight: "800", color: "#0F172A" }}>
                    For Multimarg Carriers Pvt. Ltd.
                  </p>

                  {/* Stamp Slot: Conditional based on includeStamp toggle & custom uploaded stamp image */}
                  <div style={{ height: "105px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0.25rem 0" }}>
                    {includeStamp ? (
                      <img 
                        src={globalSettings?.company?.companyStampUrl || "/fab.png"} 
                        alt="Official Company Stamp" 
                        style={{ maxHeight: '105px', maxWidth: '140px', objectFit: 'contain' }} 
                      />
                    ) : (
                      <div style={{ height: "65px" }}></div>
                    )}
                  </div>

                    {includeStamp ? (
                      <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: "700", color: "#64748b" }}>
                        This is a system generated invoice,<br/>no signature required.
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: "800", color: "#0C4A6E" }}>
                        (Authorised Sign)
                      </p>
                    )}
                </div>
              </div>

              {/* Bottom Footer Note */}
              <div style={{ textAlign: "center", fontSize: "0.85rem", fontWeight: "700", color: "#0C4A6E", marginTop: "1rem", letterSpacing: "1px" }}>
                {"❖ Thank You For Your Business ❖"}
              </div>

          {/* Close tax-invoice-sheet */}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default BillView1;