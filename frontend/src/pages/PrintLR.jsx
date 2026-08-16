import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Download, ArrowLeft } from "lucide-react";
import RupeeIcon from "../components/RupeeIcon";
import html2pdf from "html2pdf.js";
import { AuthContext } from "../context/AuthContext";
import { QRCodeCanvas } from "qrcode.react";
import { formatDate } from "../utils/formatters";
import { downloadViaPuppeteer } from "../utils/puppeteerPdf";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const PrintLR = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const [signName, setSignName] = useState(user?.name || "Admin");
  const [scale, setScale] = useState(1);
  const containerRef = React.useRef(null);

  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState("idle"); // 'idle', 'sending', 'success', 'error'
  const [emailStatusMsg, setEmailStatusMsg] = useState("");
  const [emailSentCount, setEmailSentCount] = useState(0);
  const [emailSentTo, setEmailSentTo] = useState([]);

  useEffect(() => {
    if (booking) {
      setRecipientEmail(booking.clientEmail || "");
      setEmailSentCount(booking.emailSentCount || 0);
      setEmailSentTo(booking.emailSentTo || []);
    }
  }, [booking]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const horizontalMargin = window.innerWidth < 600 ? 16 : 32;
        const availWidth = containerWidth - horizontalMargin;
        setScale(Math.min(1, Math.max(0.2, availWidth / 800)));
      } else {
        const screenW = window.innerWidth;
        const horizontalMargin = screenW < 600 ? 32 : 48;
        setScale(Math.min(1, Math.max(0.2, (screenW - horizontalMargin) / 800)));
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
    if (user?.name) {
      setSignName(user.name);
    }
  }, [user]);
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const [res, clientsRes] = await Promise.all([
          axios.get(`${API}/bookings/${id}`),
          axios.get(`${API}/clients`).catch(() => ({ data: { success: false, data: [] } }))
        ]);

        if (res.data.success) {
          const b = res.data.data;
          // Dynamically fill missing GST for old bookings
          if (clientsRes.data.success) {
            const clientsList = clientsRes.data.data || [];
            if (!b.consignorGst && b.consignor) {
              const cClient = clientsList.find(c => c.name === b.consignor || c.client === b.consignor);
              if (cClient) b.consignorGst = cClient.gst;
            }
            if (!b.consigneeGst && b.consignee) {
              const cClient = clientsList.find(c => c.name === b.consignee || c.client === b.consignee);
              if (cClient) b.consigneeGst = cClient.gst;
            }
            if (!b.clientGst && b.client) {
              const cClient = clientsList.find(c => c.name === b.client || c.client === b.client);
              if (cClient) b.clientGst = cClient.gst;
            }
          }

          // Apply fallback mapping for CSV imported bookings
          b.consignment = b.consignment || b.awb || b.lrNo || b.lr || "";
          b.client = b.client || b.billedTo || "";

          if (clientsRes.data.success) {
            const clientsList = clientsRes.data.data || [];
            const searchClient = String(b.client || b.billedTo || "").trim().toLowerCase();
            const searchConsignor = String(b.consignor || "").trim().toLowerCase();
            
            let matchedClient = clientsList.find(c => {
              const nameLower = String(c.name || "").trim().toLowerCase();
              const codeLower = String(c.clientCode || "").trim().toLowerCase();
              return searchClient && (nameLower === searchClient || codeLower === searchClient);
            });
            
            if (!matchedClient && searchConsignor) {
              matchedClient = clientsList.find(c => {
                const nameLower = String(c.name || "").trim().toLowerCase();
                const codeLower = String(c.clientCode || "").trim().toLowerCase();
                return nameLower === searchConsignor || codeLower === searchConsignor;
              });
            }

            if (matchedClient) {
              b.clientEmail = matchedClient.email || "";
            }
          }

          b.box = b.box || b.boxes || b.pkg || b.packages || "";
          b.actual_wt = b.actual_wt || b.actualWt || b.weight || b.actualWeight || "";
          b.charge_wt = b.charge_wt || b.chargeWt || b.chargeWeight || b.weight || "";

          b.freight_charge = b.freight_charge || b.freight || b.frieght || b.frieghtCharge || "";
          b.awb_charge = b.awb_charge || b.awbCharge || b.docketCharge || "";
          b.pickup_charge = b.pickup_charge || b.pickupCharge || "";
          b.delivery_charge = b.delivery_charge || b.deliveryCharge || "";
          b.packaging_charge = b.packaging_charge || b.packagingCharge || b.pkgCharge || "";
          b.handling_charge = b.handling_charge || b.handlingCharge || "";

          b.type_of_delivery = b.type_of_delivery || b.deliveryType || "Door";
          b.clerk_name = b.clerk_name || b.clerkName || "Admin";

          b.description = b.description || b.desc || b.goods || "";
          b.remarks = b.remarks || b.remark || "";

          if (b.insuredBy) {
            const ib = String(b.insuredBy).toLowerCase();
            if (ib === "consignor") b.insuredBy = "Consignor";
            else if (ib === "consignee") b.insuredBy = "Consignee";
            else if (ib === "carrier") b.insuredBy = "Carrier";
            else if (ib === "owner") b.insuredBy = "Owner";
          } else {
            const fallback = String(b.insured || b.insurance || "").toLowerCase();
            if (fallback === "consignor") b.insuredBy = "Consignor";
            else if (fallback === "consignee") b.insuredBy = "Consignee";
            else if (fallback === "carrier") b.insuredBy = "Carrier";
            else if (fallback === "owner") b.insuredBy = "Owner";
            else b.insuredBy = fallback || "";
          }

          if (b.mode) {
            const lm = b.mode.toLowerCase();
            if (lm === "rail" || lm === "train") {
              b.mode = "Train";
            }
          }

          let parcels = (b.invoiceDetails && b.invoiceDetails.length > 0) ? b.invoiceDetails : (b.parcels || []);
          if (parcels && parcels.length > 0) {
            b.invoiceDetails = parcels.map(p => ({
              invoiceNo: p.invoiceNo || p.invoice || "",
              invoiceValue: p.invoiceValue || p.value || "",
              invoiceDate: p.invoiceDate || p.invdate || p.date || "",
              partNumber: p.partNumber || p.part || "",
              ewayBill: p.ewayBill || p.eway || "",
              quantity: p.quantity || p.qty || ""
            }));
          }

          setBooking(b);
        }
      } catch (err) {
        console.error("Failed to fetch booking", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      window.close();
      navigate("/bookings");
    }
  };

  const handleDownloadPDF = async (onComplete, autoPrint = false) => {
    const awb = (booking?.consignment || booking?.awb || booking?.lrNumber || booking?.id?.slice(-6) || id).toString().trim().toUpperCase();
    const origin = (booking?.origin || booking?.from || "").toString().trim().toUpperCase();
    const dest = (booking?.destination || booking?.to || "").toString().trim().toUpperCase();
    const routeStr = (origin && dest) ? `${origin} TO ${dest}` : (origin || dest || "");
    const clientName = (booking?.consignee || booking?.consignor || booking?.clientName || booking?.client || "").toString().trim().toUpperCase();
    const filename = `${awb}${routeStr ? " - " + routeStr : ""}${clientName ? " - " + clientName : ""}.pdf`;

    try {
      await downloadViaPuppeteer({
        elementId: "bilty-content",
        filename,
        landscape: false,
        autoPrint
      });
      if (typeof onComplete === 'function') onComplete();
    } catch (err) {
      console.error("Puppeteer PDF generation failed:", err);
      if (typeof onComplete === 'function') onComplete();
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientEmail.trim()) {
      alert("Please enter a valid recipient email address.");
      return;
    }
    
    setIsSendingEmail(true);
    setEmailStatus("sending");
    setEmailStatusMsg("Generating Lorry Receipt PDF on browser...");
    
    try {
      const element = document.getElementById("bilty-content");
      if (!element) {
        throw new Error("Lorry Receipt content not found");
      }

      // Clone and clean element for PDF printing
      const clone = element.cloneNode(true);
      clone.style.transform = "none";
      clone.style.position = "static";
      clone.style.margin = "0";
      clone.style.height = "auto";
      clone.style.maxHeight = "none";
      clone.style.overflow = "visible";
      clone.style.width = "750px";
      clone.style.boxSizing = "border-box";
      clone.style.padding = "0";

      // Convert canvas elements (QR codes) to images
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
        html2canvas: { scale: 2, useCORS: true, logging: false, width: 750, windowWidth: 750 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ['avoid-all'] }
      };

      setEmailStatusMsg("Sending Lorry Receipt via email...");
      const dataUri = await html2pdf().set(opt).from(clone).outputPdf('datauristring');
      const pdfBase64 = dataUri.split(';base64,')[1];

      const awb = (booking?.consignment || booking?.awb || booking?.lrNumber || booking?.id?.slice(-6) || id).toString().trim().toUpperCase();
      const origin = (booking?.origin || booking?.from || "").toString().trim().toUpperCase();
      const dest = (booking?.destination || booking?.to || "").toString().trim().toUpperCase();
      const routeStr = (origin && dest) ? `${origin} TO ${dest}` : (origin || dest || "");
      const clientName = (booking?.consignee || booking?.consignor || booking?.clientName || booking?.client || "").toString().trim().toUpperCase();
      const filename = `${awb}${routeStr ? " - " + routeStr : ""}${clientName ? " - " + clientName : ""}.pdf`;

      const response = await axios.post(`${API}/email/send-lr`, {
        lrId: id,
        to: recipientEmail,
        pdfBase64,
        filename
      });
      
      if (response.data.success) {
        setEmailStatus("success");
        setEmailStatusMsg("Email successfully sent with attachment!");
        setEmailSentCount(response.data.data.emailSentCount || 0);
        setEmailSentTo(response.data.data.emailSentTo || []);
      } else {
        throw new Error(response.data.message || "Failed to send email");
      }
    } catch (err) {
      console.error(err);
      setEmailStatus("error");
      setEmailStatusMsg(err.response?.data?.message || err.message || "Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('download') === 'true' && booking) {
      // Add a slight delay to ensure QR codes and canvas render completely
      setTimeout(() => {
        handleDownloadPDF(() => {
          setTimeout(() => {
            window.close();
            // Fallback if window.close is blocked
            navigate("/bookings");
          }, 500);
        });
      }, 500);
    }
  }, [booking]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        Loading LR...
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h3>Booking not found.</h3>
        <button className="btn btn-primary mt-3" onClick={() => navigate("/bookings")}>Go Back</button>
      </div>
    );
  }

  const parseNum = (val) => parseFloat(val || 0);

  const isCredit = booking.paymentMode === "Credit";

  const printFreight = isCredit ? 0 : parseNum(booking.freight_charge);
  const printAwb = isCredit ? 0 : parseNum(booking.awb_charge);
  const printPickup = isCredit ? 0 : parseNum(booking.pickup_charge);
  const printDelivery = isCredit ? 0 : parseNum(booking.delivery_charge);
  const printPackaging = isCredit ? 0 : parseNum(booking.packaging_charge);
  const printHandling = isCredit ? 0 : parseNum(booking.handling_charge);

  const subTotal = printFreight + printAwb + printPickup + printDelivery + printPackaging + printHandling;

  const gst = 0; // Customize if GST applies
  const totalAmount = subTotal + gst;

  const validInvoices = (booking.invoiceDetails || []).filter(inv =>
    inv.invoiceNo || inv.invoiceValue || inv.partNumber || inv.ewayBill || (inv.quantity && inv.quantity !== "0")
  );

  const invoices = validInvoices.length > 0
    ? validInvoices
    : [{ invoiceNo: "NA", invoiceValue: "0", invoiceDate: null, partNumber: "NA", ewayBill: "NA", quantity: "0" }];


  return (
    <div ref={containerRef} style={{ background: "#e2e8f0", minHeight: "100vh", padding: scale < 1 ? "0.5rem 0.25rem" : "1.5rem 0.75rem", boxSizing: "border-box", width: "100%", overflowX: "hidden" }} className="print-wrapper">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
          
          .print-wrapper {
            font-family: 'Outfit', sans-serif;
          }

          /* Prevent any global responsive table scrollbar injection inside print preview */
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
          .bilty-table {
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          .print-container th, 
          .print-container td,
          .bilty-table th,
          .bilty-table td {
            white-space: normal !important;
            word-break: break-word !important;
          }

          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              background: white !important;
            }
            body * { visibility: hidden; }
            .print-container, .print-container * { visibility: visible; }
            .print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 800px !important;
              max-width: 800px !important;
              min-width: 800px !important;
              transform: none !important;
              margin: 0;
              padding: 0;
              background: white !important;
              box-shadow: none !important;
              border: none !important;
            }
            .no-print { display: none !important; }
            .bilty-table th, .bilty-table td {
               border-color: #cbd5e1 !important;
               color: #0f172a !important;
            }
            .section-header { 
              background-color: #1e293b !important;
              color: white !important;
            }
            .gray-cell { background-color: #f1f5f9 !important; }
            .premium-border { border-color: #1e293b !important; }
          }
          .bilty-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.75rem;
          }
          .bilty-table th, .bilty-table td {
            border: 1.5px solid #64748b;
            padding: 4px 8px;
            color: #0f172a;
          }
          .gray-cell {
            background-color: #f8fafc;
            color: #0f172a;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 0.7rem;
            letter-spacing: 0.5px;
          }
          .data-cell {
            font-weight: 600;
            color: #0f172a;
            font-size: 0.8rem;
          }
          .section-header {
            background-color: #1e293b;
            color: #ffffff;
            padding: 4px 10px;
            font-weight: 600;
            font-size: 0.8rem;
            letter-spacing: 1px;
            text-transform: uppercase;
            display: flex;
            align-items: center;
          }
          .bilty-section {
            margin-bottom: 0px;
          }
          .blue-text { color: #1e3a8a; }
          .premium-border {
            border: 2px solid #1e293b;
          }
        `}
      </style>

      <div className="no-print" style={{ maxWidth: "800px", margin: "0 auto 1rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
        <button className="btn" style={{ background: "white", border: "1px solid #cbd5e1", color: "#475569", fontWeight: 600 }} onClick={handleBack}>
          <ArrowLeft size={18} className="mr-2" /> Back
        </button>
        <div className="top-actions-container" style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          <input
            type="text"
            value={signName}
            onChange={(e) => setSignName(e.target.value)}
            disabled={user?.role !== 'Admin' && user?.role !== 'SuperAdmin'}
            placeholder="Sign Name (Blank for none)"
            style={{
              padding: "8px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontSize: "0.85rem",
              width: "160px",
              outline: "none",
              background: (user?.role === 'Admin' || user?.role === 'SuperAdmin') ? "#ffffff" : "#f1f5f9",
              cursor: (user?.role === 'Admin' || user?.role === 'SuperAdmin') ? "text" : "not-allowed"
            }}
          />
          <button className="btn btn-primary" style={{ fontWeight: 600, background: "#1e293b", border: "none" }} onClick={() => handleDownloadPDF()}>
            <Download size={18} className="mr-2" /> Download PDF Bilty
          </button>
        </div>
      </div>

      {/* Email Sending Card */}
      <div className="no-print" style={{
        maxWidth: "800px",
        margin: "0 auto 0.75rem",
        background: "#fafafa",
        borderRadius: "2px",
        padding: "0.75rem 1rem",
        boxShadow: "none",
        border: "1px solid #d5dbdb",
        boxSizing: "border-box"
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "10px", borderBottom: "1px solid #eaeded", paddingBottom: "0.5rem", marginBottom: "0.5rem" }}>
          <h4 style={{ margin: 0, color: "#16191f", fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            <span>✉️</span> Send LR Email
          </h4>
          <div style={{ fontSize: "0.75rem", color: "#545b64", fontWeight: "600" }}>
            Status: {emailSentCount > 0 ? (
              <span style={{ color: "#1d8102" }}>
                Sent ({emailSentCount} time{emailSentCount > 1 ? 's' : ''})
              </span>
            ) : (
              <span style={{ color: "#ec7211" }}>Not Sent</span>
            )}
          </div>
        </div>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          <div style={{ flex: "1 1 350px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.75rem", color: "#545b64", fontWeight: "700", whiteSpace: "nowrap" }}>
              To:
            </span>
            <input
              type="text"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="e.g. client@company.com, transport@company.com"
              style={{
                flex: 1,
                padding: "6px 10px",
                border: "1px solid #aab7b8",
                borderRadius: "2px",
                fontSize: "0.8rem",
                outline: "none",
                boxSizing: "border-box",
                background: "#ffffff",
                color: "#16191f"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#ec7211";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#aab7b8";
              }}
            />
          </div>
          
          <button
            onClick={handleSendEmail}
            disabled={isSendingEmail}
            style={{
              padding: "6px 14px",
              background: "#ec7211",
              color: "white",
              border: "1px solid #ec7211",
              borderRadius: "2px",
              fontSize: "0.8rem",
              fontWeight: "600",
              cursor: isSendingEmail ? "not-allowed" : "pointer",
              transition: "background 0.1s",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              height: "30px"
            }}
            onMouseOver={(e) => {
              if (!isSendingEmail) e.target.style.background = "#d45f0d";
            }}
            onMouseOut={(e) => {
              if (!isSendingEmail) e.target.style.background = "#ec7211";
            }}
          >
            {isSendingEmail ? (
              <span className="spinner" style={{
                width: "12px",
                height: "12px",
                border: "2px solid rgba(255, 255, 255, 0.3)",
                borderTop: "2px solid white",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 1s linear infinite"
              }} />
            ) : "🚀"} 
            {isSendingEmail ? "Sending..." : "Send LR Mail"}
          </button>
        </div>

        {/* Email status messages */}
        {emailStatus !== 'idle' && (
          <div style={{
            marginTop: "8px",
            padding: "6px 10px",
            borderRadius: "2px",
            fontSize: "0.75rem",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: emailStatus === 'success' ? '#f0fdf4' : emailStatus === 'error' ? '#fef2f2' : '#f8fafc',
            color: emailStatus === 'success' ? '#15803d' : emailStatus === 'error' ? '#b91c1c' : '#475569',
            border: `1px solid ${emailStatus === 'success' ? '#bbf7d0' : emailStatus === 'error' ? '#fecaca' : '#e2e8f0'}`
          }}>
            <span>{emailStatus === 'success' ? '✅' : emailStatus === 'error' ? '❌' : 'ℹ️'}</span>
            {emailStatusMsg}
          </div>
        )}

        {/* Recipient list */}
        {emailSentTo && emailSentTo.length > 0 && (
          <div style={{
            marginTop: "6px",
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
            alignItems: "center"
          }}>
            <span style={{ fontSize: "0.7rem", color: "#545b64", fontWeight: "700" }}>Sent history:</span>
            {emailSentTo.map((email, idx) => (
              <span key={idx} style={{
                background: "#eaeded",
                color: "#16191f",
                padding: "1px 6px",
                borderRadius: "2px",
                fontSize: "0.7rem",
                fontWeight: "500",
                border: "1px solid #cbd5e1"
              }}>
                {email}
              </span>
            ))}
          </div>
        )}
        
        {/* CSS Keyframes for Spinner */}
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>

      <div style={{ display: "flex", justifyContent: "center", overflow: "hidden", width: "100%", paddingBottom: "2rem" }}>
        <div style={{ width: `${750 * scale}px`, height: `${1131 * scale}px`, position: "relative" }}>
          <div id="bilty-content" className="print-container" style={{
            width: "750px",
            height: "auto",
            minHeight: "0",
            background: "white",
            color: "#0f172a",
            boxSizing: "border-box",
            padding: "8px",
            overflow: "hidden",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0
          }}>
            <style>
              {`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
                
                .bilty-table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  font-size: 0.75rem !important;
                  table-layout: fixed !important;
                }
                .bilty-table th, .bilty-table td {
                  border: 1.5px solid #64748b !important;
                  padding: 4px 8px !important;
                  color: #0f172a !important;
                }
                .gray-cell {
                  background-color: #f8fafc !important;
                  color: #0f172a !important;
                  font-weight: 700 !important;
                  text-transform: uppercase !important;
                  font-size: 0.7rem !important;
                  letter-spacing: 0.5px !important;
                }
                .data-cell {
                  font-weight: 600 !important;
                  color: #0f172a !important;
                  font-size: 0.8rem !important;
                }
                .section-header {
                  background-color: #1e293b !important;
                  color: #ffffff !important;
                  padding: 4px 10px !important;
                  font-weight: 600 !important;
                  font-size: 0.8rem !important;
                  letter-spacing: 1px !important;
                  text-transform: uppercase !important;
                  display: flex !important;
                  align-items: center !important;
                }
                .bilty-section {
                  margin-bottom: 0px !important;
                }
                .blue-text { color: #1e3a8a !important; }
                .premium-border { border: 2px solid #1e293b !important; }
              `}
            </style>

            <div className="premium-border" style={{ height: "auto", minHeight: "1020px", position: "relative", display: "flex", flexDirection: "column" }}>
              {/* Professional Logo Watermark */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 2, pointerEvents: "none", display: "flex", justifyContent: "center", alignItems: "center", paddingBottom: "120px" }}>
                <img src="/mc.png" alt="Watermark" style={{ width: "100%", opacity: 0.15 }} />
              </div>

              <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Header Section */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 10px", borderBottom: "2px solid #1e293b" }}>
                  {/* Logo */}
                  <div style={{ width: "100px", flexShrink: 0 }}>
                    <img src="/mc.png" alt="Multimarg Carriers" style={{ width: "100%", height: "auto" }} />
                  </div>

                  {/* Company Details */}
                  <div style={{ textAlign: "center", flex: 1, padding: "0 6px", minWidth: 0 }}>
                    <h1 className="blue-text" style={{ margin: "0", fontSize: "1.6rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: "1.2" }}>MULTIMARG CARRIERS PVT. LTD.</h1>
                    <p style={{ margin: "0", fontSize: "0.72rem", fontWeight: "500", color: "#475569", lineHeight: "1.3", whiteSpace: "nowrap" }}>LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND-263153</p>
                    <div style={{ display: "flex", justifyContent: "center", gap: "10px", margin: "0", fontSize: "0.72rem", fontWeight: "600", color: "#334155", lineHeight: "1.3" }}>
                      <span>Contact: +91 5944-324033</span>
                      <span>|</span>
                      <a href="mailto:info@multimarg.com" className="no-transform" style={{ color: "inherit", textDecoration: "none", textTransform: "lowercase" }}>info@multimarg.com</a>
                      <span>|</span>
                      <a href="https://multimarg.com" target="_blank" rel="noreferrer" className="no-transform" style={{ color: "inherit", textDecoration: "none", textTransform: "lowercase" }}>multimarg.com</a>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: "10px", margin: "0", fontSize: "0.72rem", fontWeight: "700", color: "#0f172a", lineHeight: "1.3" }}>
                      <span>GST: 05AANCM3054E1ZN</span>
                      <span>|</span>
                      <span>PAN: AANCM3054E1ZN</span>
                    </div>
                  </div>

                  {/* QR Code & Tracking */}
                  <div style={{ width: "80px", textAlign: "center", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ padding: "3px", background: "#ffffff", border: "1.5px solid #1e293b", borderRadius: "4px", display: "inline-flex", justifyContent: "center", alignItems: "center" }}>
                      <img
                        id="lr-qr-code"
                        data-qr-value={`${import.meta.env.VITE_FRONTEND_URL || "https://multimarg.com"}/track?awb=${booking.consignment || booking.awb || booking.lrNumber || booking.id.slice(-6)}`}
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent((import.meta.env.VITE_FRONTEND_URL || "https://multimarg.com") + "/track?awb=" + (booking.consignment || booking.awb || booking.lrNumber || booking.id.slice(-6)))}`}
                        alt="SCAN TO TRACK"
                        style={{ width: "52px", height: "52px", display: "block" }}
                      />
                    </div>
                    <div style={{ fontSize: "0.48rem", fontWeight: "800", color: "#1e3a8a", marginTop: "2px", letterSpacing: "0.5px" }}>SCAN TO TRACK</div>
                  </div>
                </div>

                {/* AWB Details */}
                <div className="bilty-section">
                  <table className="bilty-table">
                    <tbody>
                      <tr>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>AWB NO.</td>
                        <td className="data-cell" style={{ width: "25%", color: "#ef4444", fontSize: "1rem", whiteSpace: "nowrap" }}>{booking.consignment || booking.awb || booking.lrNumber || booking.id.slice(-6)}</td>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>DATE</td>
                        <td className="data-cell" style={{ width: "25%" }}>{booking.dispatch_date ? formatDate(booking.dispatch_date) : formatDate(booking.createdAt)}</td>
                        <td className="gray-cell" style={{ width: "10%", textAlign: "center" }}>MODE</td>
                        <td className="data-cell" style={{ width: "10%" }}>{(booking.mode && (booking.mode.toLowerCase() === 'rail' || booking.mode.toLowerCase() === 'train') ? 'TRAIN' : booking.mode?.toUpperCase())}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Parties */}
                <div className="bilty-section">
                  <div className="section-header">1. Party Details</div>
                  <table className="bilty-table">
                    <tbody>
                      <tr>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>CONSIGNOR</td>
                        <td className="data-cell" style={{ width: "55%" }}>{booking.consignor?.toUpperCase()}</td>
                        <td className="gray-cell" style={{ width: "10%", textAlign: "center" }}>GSTIN</td>
                        <td className="data-cell" style={{ width: "20%" }}>{booking.consignorGst ? String(booking.consignorGst).toUpperCase() : "NA"}</td>
                      </tr>
                      <tr>
                        <td className="gray-cell" style={{ textAlign: "center" }}>CONSIGNEE</td>
                        <td className="data-cell">{booking.consignee?.toUpperCase()}</td>
                        <td className="gray-cell" style={{ textAlign: "center" }}>GSTIN</td>
                        <td className="data-cell">{booking.consigneeGst ? String(booking.consigneeGst).toUpperCase() : "NA"}</td>
                      </tr>
                      <tr>
                        <td className="gray-cell" style={{ textAlign: "center" }}>BILL TO</td>
                        <td className="data-cell" colSpan="3" style={{ color: "#1e3a8a" }}>{booking.client?.toUpperCase()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Shipment Info */}
                <div className="bilty-section">
                  <div className="section-header">2. Shipment Information</div>
                  <table className="bilty-table">
                    <tbody>
                      <tr>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>ORIGIN</td>
                        <td className="data-cell" style={{ width: "35%" }} colSpan="2">{booking.origin?.toUpperCase()}</td>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>DESTINATION</td>
                        <td className="data-cell" style={{ width: "35%" }} colSpan="2">{booking.destination?.toUpperCase()}</td>
                      </tr>
                      <tr>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>PKG(S)</td>
                        <td className="data-cell" style={{ width: "18%", textAlign: "center", fontSize: "1rem", fontWeight: "700" }}>{String(booking.box || "0").padStart(2, '0')}</td>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>ACTUAL WT.</td>
                        <td className="data-cell" style={{ width: "18%" }}>{parseNum(booking.actual_wt).toFixed(2)} Kg</td>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>CHARGE WT.</td>
                        <td className="data-cell" style={{ width: "19%" }}>{parseNum(booking.charge_wt).toFixed(2)} Kg</td>
                      </tr>
                      <tr>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>DESCRIPTION</td>
                        <td className="data-cell" style={{ width: "18%" }}>{booking.description || "NA"}</td>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>INSURED BY</td>
                        <td className="data-cell" style={{ width: "18%", textAlign: "center" }}>{booking.insuredBy || "NA"}</td>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>VEHICLE NO.</td>
                        <td className="data-cell" style={{ width: "19%", textAlign: "center" }}>{booking.vehicleNo || "NA"}</td>
                      </tr>
                      {/* Dimensions row removed from main shipment table */}
                    </tbody>
                  </table>
                </div>

                {/* Package Dimensions block removed from full-width view */}

                {/* Invoice Items */}
                <div className="bilty-section">
                  <div className="section-header">3. Invoice & Item Details</div>
                  <table className="bilty-table">
                    <thead>
                      <tr className="gray-cell">
                        <th style={{ textAlign: "center" }}>Invoice No</th>
                        <th style={{ textAlign: "center" }}>Invoice Date</th>
                        <th style={{ textAlign: "center" }}>Qty</th>
                        <th style={{ textAlign: "center" }}>Part / Item</th>
                        <th style={{ textAlign: "center" }}>Invoice Value (₹)</th>
                        <th style={{ textAlign: "center" }}>E-Way Bill No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv, idx) => (
                        <tr key={idx}>
                          <td className="data-cell" style={{ textAlign: "center" }}>{inv.invoiceNo || "-"}</td>
                          <td className="data-cell" style={{ textAlign: "center" }}>{inv.invoiceDate ? formatDate(inv.invoiceDate) : "-"}</td>
                          <td className="data-cell" style={{ textAlign: "center" }}>{inv.quantity || "-"}</td>
                          <td className="data-cell" style={{ textAlign: "center" }}>{inv.partNumber || "-"}</td>
                          <td className="data-cell" style={{ textAlign: "center" }}>{inv.invoiceValue || "-"}</td>
                          <td className="data-cell" style={{ textAlign: "center" }}>{inv.ewayBill || "NA"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Charges and Terms */}
                <div className="bilty-section" style={{ display: "flex" }}>

                  {/* Terms & Conditions (Left Side) - Formatted as table */}
                  <div style={{ flex: 1, borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", display: "flex", flexDirection: "column" }}>
                    {/* Optional Dimensions Table (Compact and inside left column) */}
                    {booking.dimensions && Array.isArray(booking.dimensions) && booking.dimensions.some(d => d.length || d.breadth || d.height || d.boxCount) && (
                      <div style={{ borderBottom: "1px solid #cbd5e1" }}>
                        <div className="section-header" style={{ fontSize: "0.7rem", borderTop: "none", borderLeft: "none", borderRight: "none" }}>Package Dimensions (Optional)</div>
                        <table className="bilty-table" style={{ border: "none", width: "100%", textAlign: "center" }}>
                          <thead>
                            <tr className="gray-cell" style={{ fontSize: "0.65rem" }}>
                              <th style={{ textAlign: "center", padding: "3px", borderTop: "none", borderLeft: "none" }}>L (cm)</th>
                              <th style={{ textAlign: "center", padding: "3px", borderTop: "none" }}>B (cm)</th>
                              <th style={{ textAlign: "center", padding: "3px", borderTop: "none" }}>H (cm)</th>
                              <th style={{ textAlign: "center", padding: "3px", borderTop: "none", borderRight: "none" }}>Boxes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {booking.dimensions.filter(d => d.length || d.breadth || d.height || d.boxCount).map((d, idx) => (
                              <tr key={idx} style={{ fontSize: "0.65rem" }}>
                                <td className="data-cell" style={{ textAlign: "center", padding: "3px", borderLeft: "none" }}>{d.length || "0"}</td>
                                <td className="data-cell" style={{ textAlign: "center", padding: "3px" }}>{d.breadth || "0"}</td>
                                <td className="data-cell" style={{ textAlign: "center", padding: "3px" }}>{d.height || "0"}</td>
                                <td className="data-cell" style={{ textAlign: "center", padding: "3px", fontWeight: "700", borderRight: "none" }}>{d.boxCount || "0"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Shortened Carriage Declaration */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <div className="section-header" style={{ borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "1px solid #cbd5e1" }}>4. Carriage Declaration & Agreement</div>
                      <table className="bilty-table" style={{ border: "none", width: "100%", borderCollapse: "collapse" }}>
                        <tbody>
                          <tr>
                            <td className="gray-cell" style={{ borderLeft: "none", borderTop: "none", borderBottom: "none", width: "30%", fontSize: "0.65rem", padding: "4px 8px" }}>Jurisdiction</td>
                            <td className="data-cell" style={{ borderRight: "none", borderTop: "none", borderBottom: "none", fontSize: "0.65rem", padding: "4px 8px" }}>Subject to Uttarakhand Jurisdiction.</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Dedicated full-width spacious Remarks block */}
                      <div style={{ borderTop: "1px solid #cbd5e1", padding: "6px 8px", fontSize: "0.7rem", flex: 1, background: "#f8fafc" }}>
                        <div style={{ fontWeight: "700", color: "#475569", textTransform: "uppercase", fontSize: "0.6rem", marginBottom: "3px" }}>Special Remarks / Instructions</div>
                        <div style={{ color: "#0f172a", fontWeight: "600", minHeight: "45px", lineHeight: "1.3", wordBreak: "break-word" }}>
                          {booking.remarks || "No special instructions."}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Charges (Right Side) */}
                  <div style={{ width: "320px", borderBottom: "1px solid #cbd5e1" }}>
                    <div className="section-header" style={{ borderBottom: "1px solid #cbd5e1", borderLeft: "none" }}>5. Financials</div>
                    <table className="bilty-table" style={{ border: "none" }}>
                      <tbody>
                        <tr>
                          <td className="gray-cell" style={{ borderLeft: "none", borderTop: "none" }}>Freight</td>
                          <td className="data-cell" style={{ textAlign: "right", borderRight: "none", borderTop: "none" }}><RupeeIcon size={11} />{printFreight.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="gray-cell" style={{ borderLeft: "none" }}>AWB / Docket</td>
                          <td className="data-cell" style={{ textAlign: "right", borderRight: "none" }}><RupeeIcon size={11} />{printAwb.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="gray-cell" style={{ borderLeft: "none" }}>Pickup</td>
                          <td className="data-cell" style={{ textAlign: "right", borderRight: "none" }}><RupeeIcon size={11} />{printPickup.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="gray-cell" style={{ borderLeft: "none" }}>Delivery</td>
                          <td className="data-cell" style={{ textAlign: "right", borderRight: "none" }}><RupeeIcon size={11} />{printDelivery.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="gray-cell" style={{ borderLeft: "none" }}>Handling & Pkg</td>
                          <td className="data-cell" style={{ textAlign: "right", borderRight: "none" }}><RupeeIcon size={11} />{(printHandling + printPackaging).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="gray-cell" style={{ borderLeft: "none" }}>GST</td>
                          <td className="data-cell" style={{ textAlign: "right", borderRight: "none" }}><RupeeIcon size={11} />{gst.toFixed(2)}</td>
                        </tr>
                        <tr style={{ background: "#f8fafc" }}>
                          <td className="gray-cell" style={{ borderLeft: "none", borderBottom: "none", color: "#1e3a8a", fontWeight: 700, fontSize: "0.85rem" }}>GRAND TOTAL</td>
                          <td className="data-cell" style={{ textAlign: "right", borderRight: "none", borderBottom: "none", color: "#1e3a8a", fontWeight: 700, fontSize: "1rem" }}><RupeeIcon size={13} />{totalAmount.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signatures */}
                <div style={{ flex: 1 }}></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "4px 1.5rem", height: "50px" }}>
                  <div style={{ textAlign: "center", width: "230px" }}>
                    {(user?.role === 'Admin' || user?.role === 'SuperAdmin') ? (
                      <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: "1.6rem", color: "#0f172a", height: "30px", display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: "3px" }}>
                        {signName}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.8rem", color: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "30px", marginBottom: "3px", fontWeight: "600" }}>
                        <span>Digitally signed by</span>
                        <span>Multimarg Private Limited</span>
                      </div>
                    )}
                    <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "3px", fontSize: "0.7rem", fontWeight: "600", color: "#475569" }}>
                      AUTHORIZED SIGNATURE
                    </div>
                  </div>
                  <div style={{ textAlign: "center", width: "180px" }}>
                    <div style={{ height: "30px", marginBottom: "3px" }}></div>
                    <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "3px", fontSize: "0.7rem", fontWeight: "600", color: "#475569" }}>
                      DRIVER'S SIGNATURE
                    </div>
                  </div>
                  <div style={{ textAlign: "center", width: "180px" }}>
                    <div style={{ height: "30px", marginBottom: "3px" }}></div>
                    <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "3px", fontSize: "0.7rem", fontWeight: "600", color: "#475569" }}>
                      RECEIVER'S SIGNATURE
                    </div>
                  </div>
                </div>

                {/* Footer Copies */}
                <div style={{ background: "#1e293b", color: "white", padding: "5px 1.5rem", display: "flex", justifyContent: "space-between", fontSize: "0.7rem", fontWeight: "600", letterSpacing: "1px" }}>
                  <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><input type="checkbox" style={{ marginRight: "6px", accentColor: "#1e3a8a" }} /> CONSIGNOR COPY</label>
                  <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><input type="checkbox" style={{ marginRight: "6px", accentColor: "#1e3a8a" }} /> CONSIGNEE COPY</label>
                  <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><input type="checkbox" style={{ marginRight: "6px", accentColor: "#1e3a8a" }} defaultChecked /> ACCOUNTS COPY</label>
                  <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><input type="checkbox" style={{ marginRight: "6px", accentColor: "#1e3a8a" }} /> P.O.D. COPY</label>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintLR;

