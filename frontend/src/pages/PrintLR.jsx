import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Download, ArrowLeft } from "lucide-react";
import RupeeIcon from "../components/RupeeIcon";
import html2pdf from "html2pdf.js";
import { AuthContext } from "../context/AuthContext";
import { QRCodeCanvas } from "qrcode.react";
import { formatDate } from "../utils/formatters";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const PrintLR = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const [signName, setSignName] = useState(user?.name || "Admin");
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 850) {
        setScale((window.innerWidth - 32) / 800); // 32px for padding
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (user?.name) {
      setSignName(user.name);
    }
  }, [user]);
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await axios.get(`${API}/bookings/${id}`);
        if (res.data.success) {
          setBooking(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch booking", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

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

  const invoices = booking.invoiceDetails && booking.invoiceDetails.length > 0 && booking.invoiceDetails[0].invoiceNo 
    ? booking.invoiceDetails 
    : [{ invoiceNo: "NA", invoiceValue: "0", invoiceDate: null, partNumber: "NA", ewayBill: "NA", quantity: "0" }];

  const handleDownloadPDF = () => {
    window.scrollTo(0, 0);
    
    const element = document.getElementById("bilty-content");
    
    // We will clone it and append to body to avoid ANY mobile viewport CSS constraints.
    const clone = element.cloneNode(true);
    clone.style.transform = "none";
    clone.style.position = "fixed"; // Fixed to avoid scrolling
    clone.style.top = "0";
    clone.style.left = "0";
    clone.style.zIndex = "-9999";
    clone.style.width = "800px";
    clone.style.height = "1131px";
    
    // Create a wrapper to strictly contain the clone
    const wrapper = document.createElement("div");
    wrapper.className = "print-wrapper"; // Ensure fonts apply
    wrapper.style.position = "fixed";
    wrapper.style.top = "0";
    wrapper.style.left = "-9999px"; // Hide it off-screen
    wrapper.style.width = "800px";
    wrapper.style.height = "1131px";
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    // Copy canvas data for QR Code (cloneNode doesn't copy canvas content)
    const originalCanvases = element.getElementsByTagName("canvas");
    const clonedCanvases = clone.getElementsByTagName("canvas");
    for (let i = 0; i < originalCanvases.length; i++) {
      const ctx = clonedCanvases[i].getContext("2d");
      ctx.drawImage(originalCanvases[i], 0, 0);
    }

    // Allow DOM to repaint
    setTimeout(() => {
      const opt = {
        margin:       0,
        filename:     `Bilty_${booking.awb || booking.lrNumber || booking.id.slice(-6)}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          width: 800,
          height: 1131,
          windowWidth: 800,
          scrollY: 0,
          scrollX: 0
        },
        jsPDF:        { unit: 'px', format: [800, 1131], orientation: 'portrait' }
      };
      
      html2pdf().set(opt).from(clone).save().then(() => {
        document.body.removeChild(wrapper);
      }).catch(err => {
        console.error("PDF generation failed:", err);
        document.body.removeChild(wrapper);
      });
    }, 300);
  };

  return (
    <div style={{ background: "#e2e8f0", minHeight: "100vh", padding: "2rem" }} className="print-wrapper">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
          
          .print-wrapper {
            font-family: 'Outfit', sans-serif;
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
            border: 1px solid #cbd5e1;
            padding: 4px 8px;
            color: #0f172a;
          }
          .gray-cell {
            background-color: #f8fafc;
            color: #475569;
            font-weight: 500;
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
        <button className="btn" style={{ background: "white", border: "1px solid #cbd5e1", color: "#475569", fontWeight: 600 }} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} className="mr-2" /> Back
        </button>
        <div className="top-actions-container">
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
          <button className="btn btn-primary" style={{ fontWeight: 600, background: "#1e293b", border: "none" }} onClick={handleDownloadPDF}>
            <Download size={18} className="mr-2" /> Download PDF Bilty
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", overflow: "hidden", width: "100%", paddingBottom: "2rem" }}>
        <div style={{ width: `${800 * scale}px`, height: `${1131 * scale}px`, position: "relative" }}>
          <div id="bilty-content" className="print-container" style={{ 
            width: "800px", 
            height: "1131px", 
            background: "white", 
            color: "#0f172a", 
            boxSizing: "border-box", 
            padding: "10px",
            overflow: "hidden",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0
          }}>
        
        <div className="premium-border" style={{ height: "100%", position: "relative", display: "flex", flexDirection: "column" }}>
          {/* Professional Logo Watermark */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: "none", display: "flex", justifyContent: "center", alignItems: "center" }}>
             <img src="/mc.png" alt="Watermark" style={{ width: "400px", opacity: 0.1 }} />
          </div>
  
          <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Header Section */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 1.5rem", borderBottom: "2px solid #1e293b" }}>
            {/* Logo */}
            <div style={{ width: "120px", flexShrink: 0 }}>
              <img src="/mc.png" alt="Multimarg Carriers" style={{ width: "100%", height: "auto" }} />
            </div>
            
            {/* Company Details */}
            <div style={{ textAlign: "center", flex: 1, padding: "0 15px", minWidth: 0 }}>
              <h1 className="blue-text" style={{ margin: "0 0 2px", fontSize: "1.5rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>MULTIMARG CARRIERS PVT. LTD.</h1>
              <p style={{ margin: "0 0 2px", fontSize: "0.85rem", fontWeight: "600", color: "#334155" }}>PREMIER LOGISTICS & TRANSPORTATION SERVICES</p>
              <p style={{ margin: "2px 0 2px", fontSize: "0.75rem", fontWeight: "500", color: "#475569" }}>LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND-263153</p>
              <div style={{ display: "flex", justifyContent: "center", gap: "15px", margin: "4px 0 0", fontSize: "0.75rem", fontWeight: "600", color: "#334155" }}>
                <span>Contact: 05944-324033</span>
                <span>|</span>
                <span>info@multimargcarriers.co.in</span>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "15px", margin: "2px 0 0", fontSize: "0.75rem", fontWeight: "700", color: "#0f172a" }}>
                <span>GST: 05AANCM3054E1ZN</span>
                <span>|</span>
                <span>PAN: AANCM3054E1ZN</span>
              </div>
            </div>
            
            {/* QR Code & Tracking */}
            <div style={{ width: "110px", textAlign: "center", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ padding: "4px", background: "white", border: "2px solid #1e293b", borderRadius: "6px", display: "inline-flex", justifyContent: "center", alignItems: "center", width: "80px", height: "80px" }}>
                <QRCodeCanvas value={window.location.origin + '/tracking?lr=' + booking.id} size={70} style={{ display: "block" }} />
              </div>
              <div style={{ fontSize: "0.7rem", fontWeight: "800", color: "#1e3a8a", marginTop: "4px", letterSpacing: "0.5px" }}>SCAN TO TRACK</div>
            </div>
          </div>

          {/* Consignment Note Title */}
          <div style={{ background: "#f8fafc", padding: "4px", textAlign: "center", borderBottom: "1px solid #cbd5e1" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: "700", color: "#0f172a", letterSpacing: "2px", textTransform: "uppercase" }}>NON-NEGOTIABLE CONSIGNMENT NOTE</h2>
          </div>

          {/* AWB Details */}
          <div className="bilty-section">
            <table className="bilty-table">
              <tbody>
                <tr>
                  <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>AWB NO.</td>
                  <td className="data-cell" style={{ width: "25%", color: "#ef4444", fontSize: "1rem", whiteSpace: "nowrap" }}>{booking.awb || booking.lrNumber || booking.id.slice(-6)}</td>
                  <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>DATE</td>
                  <td className="data-cell" style={{ width: "25%" }}>{booking.dispatch_date ? formatDate(booking.dispatch_date) : formatDate(booking.createdAt)}</td>
                  <td className="gray-cell" style={{ width: "10%", textAlign: "center" }}>MODE</td>
                  <td className="data-cell" style={{ width: "10%" }}>{booking.mode?.toUpperCase()}</td>
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
                  <td className="data-cell" style={{ width: "20%" }}>{booking.consignorGst || "NA"}</td>
                </tr>
                <tr>
                  <td className="gray-cell" style={{ textAlign: "center" }}>CONSIGNEE</td>
                  <td className="data-cell">{booking.consignee?.toUpperCase()}</td>
                  <td className="gray-cell" style={{ textAlign: "center" }}>GSTIN</td>
                  <td className="data-cell">{booking.consigneeGst || "NA"}</td>
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
                  <td className="data-cell" style={{ width: "25%" }}>{booking.origin?.toUpperCase()}</td>
                  <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>DESTINATION</td>
                  <td className="data-cell" style={{ width: "25%" }}>{booking.destination?.toUpperCase()}</td>
                  <td className="gray-cell" style={{ width: "10%", textAlign: "center" }}>PKG(S)</td>
                  <td className="data-cell" style={{ width: "10%", textAlign: "center", fontSize: "1rem" }}>{String(booking.box || "0").padStart(2, '0')}</td>
                </tr>
                <tr>
                  <td className="gray-cell" style={{ textAlign: "center" }}>ACTUAL WT.</td>
                  <td className="data-cell">{parseNum(booking.actual_wt).toFixed(2)} Kg</td>
                  <td className="gray-cell" style={{ textAlign: "center" }}>CHARGE WT.</td>
                  <td className="data-cell">{parseNum(booking.charge_wt).toFixed(2)} Kg</td>
                  <td className="gray-cell" style={{ textAlign: "center" }}>INSURED BY</td>
                  <td className="data-cell" style={{ textAlign: "center" }}>{booking.insuredBy || "NA"}</td>
                </tr>
                <tr>
                  <td className="gray-cell" style={{ textAlign: "center" }}>DESCRIPTION</td>
                  <td className="data-cell" colSpan="3">{booking.description || "NA"}</td>
                  <td className="gray-cell" style={{ textAlign: "center" }}>VEHICLE NO.</td>
                  <td className="data-cell" style={{ textAlign: "center" }}>{booking.vehicleNo || "NA"}</td>
                </tr>
              </tbody>
            </table>
          </div>

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
            
            {/* Terms & Conditions (Left Side) */}
            <div style={{ flex: 1, borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
               <div className="section-header" style={{ borderBottom: "1px solid #cbd5e1" }}>4. Terms & Conditions</div>
               <div style={{ padding: "6px", fontSize: "0.65rem", color: "#475569", lineHeight: "1.2" }}>
                 <p style={{ margin: "0 0 2px", fontWeight: "600", color: "#0f172a" }}>Subject to Uttarakhand Jurisdiction.</p>
                 <ol style={{ paddingLeft: "15px", margin: 0 }}>
                   <li>Consignment booked at owner's risk unless explicitly insured by carrier.</li>
                   <li>Carrier is not responsible for leakage, breakage, or damage due to poor packaging.</li>
                   <li>Demurrage will be charged if delivery is not taken within 7 days of arrival.</li>
                   <li>Goods are delivered only against the original consignee copy.</li>
                 </ol>
                 <div style={{ marginTop: "6px" }}>
                   <span className="gray-cell" style={{ padding: "4px 8px", background: "#f1f5f9", borderRadius: "2px" }}>REMARKS:</span>
                   <span className="data-cell" style={{ marginLeft: "8px" }}>{booking.remarks || "No special instructions."}</span>
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
          <div style={{ flex: 1 }}></div> {/* Spacer to push signatures to bottom if needed */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "10px 1.5rem", height: "70px" }}>
            <div style={{ textAlign: "center", width: "230px" }}>
              {(user?.role === 'Admin' || user?.role === 'SuperAdmin') ? (
                <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: "1.8rem", color: "#0f172a", height: "40px", display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: "5px" }}>
                  {signName}
                </div>
              ) : (
                <div style={{ fontSize: "0.85rem", color: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "40px", marginBottom: "5px", fontWeight: "600" }}>
                  <span>Digitally signed by</span>
                  <span>Multimarg Private Limited</span>
                </div>
              )}
              <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "5px", fontSize: "0.75rem", fontWeight: "600", color: "#475569" }}>
                AUTHORIZED SIGNATURE
              </div>
            </div>
            
            <div style={{ textAlign: "center", width: "180px" }}>
              <div style={{ height: "40px", marginBottom: "5px" }}></div>
              <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "5px", fontSize: "0.75rem", fontWeight: "600", color: "#475569" }}>
                DRIVER'S SIGNATURE
              </div>
            </div>

            <div style={{ textAlign: "center", width: "180px" }}>
              <div style={{ height: "40px", marginBottom: "5px" }}></div>
              <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "5px", fontSize: "0.75rem", fontWeight: "600", color: "#475569" }}>
                CONSIGNEE'S SIGNATURE
              </div>
            </div>
          </div>

          {/* Footer Copies */}
          <div style={{ background: "#1e293b", color: "white", padding: "6px 1.5rem", display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: "600", letterSpacing: "1px", marginTop: "auto" }}>
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

