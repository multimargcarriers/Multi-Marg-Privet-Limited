import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Download, ArrowLeft } from "lucide-react";
import html2pdf from "html2pdf.js";
import { AuthContext } from "../context/AuthContext";
import { formatDate } from "../utils/formatters";
import appDB from "../utils/appDB";


const PrintSingleTrip = () => {
  const { index } = useParams();
  const navigate = useNavigate();
  const _location = useLocation();
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimargcarriers.co.in';
  const [signName, setSignName] = useState(user?.name || "Admin");
  const [scale, setScale] = useState(1);
  const [trip, setTrip] = useState(null);
  const [printHeader, setPrintHeader] = useState("MULTIMARG");

  useEffect(() => {
    if (index === 'mis-print') {
      const saved = appDB.memGet("printSingleTripData");
      if (saved) setTrip(saved);
    } else {
      const saved = appDB.memGet("tripListEntries");
      if (saved) {
        const entries = saved;
        if (entries[index]) {
          setTrip(entries[index]);
        }
      }
    }
  }, [index]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1450) {
        setScale((window.innerWidth - 32) / 1400);
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (user?.name) setSignName(user.name);
  }, [user]);

  const handleDownloadPDF = () => {
    window.scrollTo(0, 0);
    const element = document.getElementById("single-trip-content");
    const clone = element.cloneNode(true);
    clone.style.transform = "none";
    clone.style.position = "fixed";
    clone.style.top = "0";
    clone.style.left = "0";
    clone.style.zIndex = "-9999";
    clone.style.width = "1400px";
    clone.style.height = "990px";
    
    const wrapper = document.createElement("div");
    wrapper.className = "print-wrapper";
    wrapper.style.position = "fixed";
    wrapper.style.top = "0";
    wrapper.style.left = "-9999px";
    wrapper.style.width = "1400px";
    wrapper.style.height = "990px";
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    setTimeout(() => {
      const originStr = trip?.origin ? ` - ${trip.origin.toUpperCase()}` : '';
      const destStr = trip?.destination ? ` - ${trip.destination.toUpperCase()}` : '';
      const nameStr = trip?.clientName ? ` - ${trip.clientName.toUpperCase()}` : '';

      const opt = {
        margin: 0,
        filename: `TRIP ${trip?.tripNo || index}${originStr}${destStr}${nameStr}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true, width: 1400, height: 990, windowWidth: 1400, scrollY: 0, scrollX: 0 },
        jsPDF: { unit: 'px', format: [1400, 990], orientation: 'landscape' }
      };
      
      html2pdf().set(opt).from(clone).save().then(() => {
        document.body.removeChild(wrapper);
      }).catch(err => {
        console.error("PDF generation failed:", err);
        document.body.removeChild(wrapper);
      });
    }, 300);
  };

  if (!trip) return <div style={{ padding: "2rem", textAlign: "center" }}><h3>Trip not found.</h3><button className="btn btn-primary mt-3" onClick={() => navigate(-1)}>Go Back</button></div>;

  const baseFreight = parseFloat(trip?.freight || trip?.parcels?.reduce((s,p)=>s+(parseFloat(p.freight)||0),0)) || 0;
  const gstAmount = baseFreight * 0.18;
  const grandTotal = baseFreight + gstAmount;
  const amountPaid = parseFloat(trip?.paidAmount || 0);
  const remaining = grandTotal - amountPaid;

  return (
    <div style={{ background: "#e2e8f0", minHeight: "100vh", padding: "2rem" }} className="print-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
        
        .print-wrapper { font-family: 'Outfit', sans-serif; }
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 1400px !important; max-width: 1400px !important; min-width: 1400px !important; margin: 0; padding: 0; background: white !important; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
          .manifest-table th, .manifest-table td { border-color: #cbd5e1 !important; color: #0f172a !important; }
          .section-header { background-color: #1e293b !important; color: white !important; }
          .gray-cell { background-color: #f1f5f9 !important; }
          .premium-border { border-color: #1e293b !important; }
        }
        .manifest-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: center; }
        .manifest-table th, .manifest-table td { border: 1px solid #cbd5e1; padding: 4px 8px; color: #0f172a; text-align: center; }
        .gray-cell { background-color: #f8fafc; color: #475569; font-weight: 500; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px; text-align: center; }
        .data-cell { font-weight: 600; color: #0f172a; font-size: 0.75rem; text-align: center; }
        .section-header { background-color: #1e293b; color: #ffffff; padding: 6px 15px; font-weight: 600; font-size: 0.9rem; letter-spacing: 1px; text-transform: uppercase; display: flex; align-items: center; margin-top: 8px; }
        .blue-text { color: #1e3a8a; }
        .premium-border { border: 2px solid #1e293b; }
      `}</style>

      <div className="no-print" style={{ maxWidth: "800px", margin: "0 auto 1rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
        <button className="btn" style={{ background: "white", border: "1px solid #cbd5e1", color: "#475569", fontWeight: 600 }} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} className="mr-2" /> Back
        </button>
        <div className="top-actions-container">
          {isSuperAdmin && (
            <select 
              className="form-control" 
              style={{ border: "1px solid #cbd5e1", height: "35px", fontSize: "0.85rem", width: "170px", padding: "0 5px", background: "white", borderRadius: "6px", outline: "none" }}
              value={printHeader}
              onChange={e => setPrintHeader(e.target.value)}
            >
              <option value="MULTIMARG">Header: Multimarg</option>
              <option value="PRIME">Header: Prime Roadways</option>
            </select>
          )}
          <input 
            type="text" 
            value={signName} 
            onChange={(e) => setSignName(e.target.value)} 
            disabled={user?.role !== 'Admin' && user?.role !== 'SuperAdmin'}
            placeholder="Sign Name" 
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
            <Download size={18} className="mr-2" /> Download Trip Receipt
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", overflow: "hidden", width: "100%", paddingBottom: "2rem" }}>
        <div style={{ width: `${1400 * scale}px`, height: `${990 * scale}px`, position: "relative", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
          <div id="single-trip-content" className="print-container" style={{ 
            width: "1400px", height: "990px", background: "white", color: "#0f172a", boxSizing: "border-box", padding: "10px", overflow: "hidden",
            transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0
          }}>
            <div className="premium-border" style={{ height: "100%", position: "relative", display: "flex", flexDirection: "column" }}>
              
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: "none", display: "flex", justifyContent: "center", alignItems: "center" }}>
                 <img src={printHeader === "PRIME" ? "/Prime RoadWAYS.png" : "/mc.png"} alt="Watermark" style={{ width: "400px", opacity: 0.05 }} />
              </div>
      
              <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 2rem", borderBottom: "2px solid #1e293b" }}>
                  {printHeader === "PRIME" ? (
                    <>
                      <div style={{ width: "120px", flexShrink: 0 }}><img src="/Prime RoadWAYS.png" alt="Prime Roadways" style={{ width: "100%", height: "auto" }} /></div>
                      <div style={{ textAlign: "center", flex: 1, padding: "0 15px", minWidth: 0 }}>
                        <h1 style={{ margin: "0 0 2px", fontSize: "1.6rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", color: "#b91c1c" }}>PRIME ROADWAYS</h1>
                        <p style={{ margin: "0 0 2px", fontSize: "1rem", fontWeight: "600", color: "#334155" }}>PLOT NO 292/292A & 292B, OM VIHAR, WEST DELHI, NEW DELHI-110059</p>
                        <div style={{ display: "flex", justifyContent: "center", gap: "15px", margin: "2px 0 0", fontSize: "0.9rem", fontWeight: "600", color: "#334155" }}>
                          <span>Contact: +91 7503112217</span><span>|</span><span>info@primeroadways.co.in</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", gap: "15px", margin: "2px 0 0", fontSize: "0.9rem", fontWeight: "700", color: "#0f172a" }}>
                          <span>GST: 07BBCPP8550Q1ZX</span><span>|</span><span>PAN: BBCPP8550Q</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ width: "120px", flexShrink: 0 }}><img src="/mc.png" alt="Multimarg Carriers" style={{ width: "100%", height: "auto" }} /></div>
                      <div style={{ textAlign: "center", flex: 1, padding: "0 15px", minWidth: 0 }}>
                        <h1 className="blue-text" style={{ margin: "0 0 2px", fontSize: "1.6rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>MULTIMARG CARRIERS PVT. LTD.</h1>
                        <p style={{ margin: "0 0 2px", fontSize: "1rem", fontWeight: "600", color: "#334155" }}>PREMIER LOGISTICS & TRANSPORTATION SERVICES</p>
                        <p style={{ margin: "2px 0 2px", fontSize: "0.9rem", fontWeight: "500", color: "#475569" }}>LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND-263153</p>
                        <div style={{ display: "flex", justifyContent: "center", gap: "15px", margin: "2px 0 0", fontSize: "0.9rem", fontWeight: "600", color: "#334155" }}>
                          <span>Contact: +91 5944-324033</span><span>|</span><span>info@multimargcarriers.co.in</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", gap: "15px", margin: "2px 0 0", fontSize: "0.9rem", fontWeight: "700", color: "#0f172a" }}>
                          <span>GST: 05AANCM3054E1ZN</span><span>|</span><span>PAN: AANCM3054E1ZN</span>
                        </div>
                      </div>
                    </>
                  )}
                  <div style={{ width: "140px", flexShrink: 0, display: "flex", justifyContent: "flex-end", alignSelf: "flex-start" }}>
                    <table style={{ borderCollapse: "collapse", border: "2px solid #1e293b", borderRadius: "6px", overflow: "hidden", backgroundColor: "#f8fafc", width: "120px", textAlign: "center", margin: 0 }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: "6px 8px 2px 8px", fontSize: "0.65rem", fontWeight: "700", color: "#475569", letterSpacing: "1px", border: "none" }}>TRIP NO</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "0px 8px 6px 8px", fontSize: "1.1rem", fontWeight: "800", color: "#e11d48", border: "none" }}>{trip?.tripNo || "-"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ background: "#f8fafc", padding: "6px", textAlign: "center", borderBottom: "1px solid #cbd5e1" }}>
                  <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: "700", color: "#0f172a", letterSpacing: "2px", textTransform: "uppercase" }}>TRIP RECEIPT</h2>
                </div>

                <div style={{ flex: 1, padding: "6px 20px" }}>
                    
                    <div className="section-header">1. Vehicle & Trip Info</div>
                    <table className="manifest-table">
                        <tbody>
                            <tr>
                                <td className="gray-cell" style={{ width: "12%" }}>TRIP NO.</td>
                                <td className="data-cell" style={{ width: "21%", color: "#e11d48", fontWeight: "700" }}>{(trip.tripNo || "-").toUpperCase()}</td>
                                <td className="gray-cell" style={{ width: "12%" }}>DATE</td>
                                <td className="data-cell" style={{ width: "21%" }}>{trip.date ? formatDate(trip.date) : "-"}</td>
                                <td className="gray-cell" style={{ width: "13%" }}>CLIENT NAME</td>
                                <td className="data-cell" style={{ width: "21%", color: "#1e3a8a", fontSize: "0.85rem" }}>{(trip.clientName || "-").toUpperCase()}</td>
                            </tr>
                            <tr>
                                <td className="gray-cell">FROM</td>
                                <td className="data-cell" style={{ fontWeight: "700" }}>{(trip.origin || "-").toUpperCase()}</td>
                                <td className="gray-cell">TO</td>
                                <td className="data-cell" style={{ fontWeight: "700" }}>{(trip.destination || "-").toUpperCase()}</td>
                                <td className="gray-cell">MODE</td>
                                <td className="data-cell">{(trip.mode || "-").toUpperCase()}</td>
                            </tr>
                            <tr>
                                <td className="gray-cell">VEHICLE NO.</td>
                                <td className="data-cell">{(trip.vehicleNo || "-").toUpperCase()}</td>
                                <td className="gray-cell">VEHICLE TYPE</td>
                                <td className="data-cell">{(trip.vehicleType || "-").toUpperCase()}</td>
                                <td className="gray-cell"></td>
                                <td className="data-cell"></td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="section-header">2. Item Details</div>
                    <table className="manifest-table" style={{ fontSize: "0.7rem", width: "100%" }}>
                        <thead>
                            <tr className="gray-cell" style={{ fontSize: "0.7rem" }}>
                                <th style={{ padding: "6px 4px", whiteSpace: "nowrap" }}>LR NO</th>
                                <th style={{ padding: "6px 4px", whiteSpace: "nowrap" }}>CONSIGNOR</th>
                                <th style={{ padding: "6px 4px", whiteSpace: "nowrap" }}>CONSIGNEE</th>
                                <th style={{ padding: "6px 4px", whiteSpace: "nowrap" }}>ORIGIN</th>
                                <th style={{ padding: "6px 4px", whiteSpace: "nowrap" }}>DEST</th>
                                <th style={{ padding: "6px 4px", whiteSpace: "nowrap" }}>MODE</th>
                                <th style={{ textAlign: "center", padding: "6px 4px", whiteSpace: "nowrap" }}>BOX</th>
                                <th style={{ textAlign: "center", padding: "6px 4px", whiteSpace: "nowrap" }}>WT</th>
                                <th style={{ textAlign: "right", padding: "6px 4px", whiteSpace: "nowrap" }}>FRT</th>
                                <th style={{ textAlign: "right", padding: "6px 4px", whiteSpace: "nowrap" }}>PICK</th>
                                <th style={{ textAlign: "right", padding: "6px 4px", whiteSpace: "nowrap" }}>DELV</th>
                                <th style={{ textAlign: "right", padding: "6px 4px", whiteSpace: "nowrap" }}>SPEC</th>
                                <th style={{ textAlign: "right", padding: "6px 4px", whiteSpace: "nowrap" }}>OTH</th>
                                <th style={{ textAlign: "right", padding: "6px 4px", whiteSpace: "nowrap" }}>TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trip.parcels && trip.parcels.length > 0 ? (
                                trip.parcels.map((p, i) => (
                                    <tr key={i}>
                                        <td className="data-cell" style={{ color: "#ef4444", fontWeight: "700", padding: "4px", whiteSpace: "nowrap" }}>{p.lrNo || "-"}</td>
                                        <td className="data-cell" style={{ padding: "4px", whiteSpace: "nowrap" }}>{(p.consignor || "-").toUpperCase()}</td>
                                        <td className="data-cell" style={{ padding: "4px", whiteSpace: "nowrap" }}>{(p.consignee || "-").toUpperCase()}</td>
                                        <td className="data-cell" style={{ padding: "4px", whiteSpace: "nowrap" }}>{(p.origin || "-").toUpperCase()}</td>
                                        <td className="data-cell" style={{ padding: "4px", whiteSpace: "nowrap" }}>{(p.destination || "-").toUpperCase()}</td>
                                        <td className="data-cell" style={{ padding: "4px", whiteSpace: "nowrap" }}>{(p.mode || "-").toUpperCase()}</td>
                                        <td className="data-cell" style={{ textAlign: "center", padding: "4px", whiteSpace: "nowrap" }}>{p.box || "-"}</td>
                                        <td className="data-cell" style={{ textAlign: "center", padding: "4px", whiteSpace: "nowrap" }}>{p.weight || "-"}</td>
                                        <td className="data-cell" style={{ textAlign: "right", padding: "4px", whiteSpace: "nowrap" }}>{parseFloat(p.freight || 0).toFixed(2)}</td>
                                        <td className="data-cell" style={{ textAlign: "right", padding: "4px", whiteSpace: "nowrap" }}>{parseFloat(p.pickup || 0).toFixed(2)}</td>
                                        <td className="data-cell" style={{ textAlign: "right", padding: "4px", whiteSpace: "nowrap" }}>{parseFloat(p.delivery || 0).toFixed(2)}</td>
                                        <td className="data-cell" style={{ textAlign: "right", padding: "4px", whiteSpace: "nowrap" }}>{parseFloat(p.special || 0).toFixed(2)}</td>
                                        <td className="data-cell" style={{ textAlign: "right", padding: "4px", whiteSpace: "nowrap" }}>{parseFloat(p.other || 0).toFixed(2)}</td>
                                        <td className="data-cell" style={{ textAlign: "right", fontWeight: "700", padding: "4px", whiteSpace: "nowrap" }}>
                                            {((parseFloat(p.freight) || 0) + (parseFloat(p.pickup) || 0) + (parseFloat(p.delivery) || 0) + (parseFloat(p.special) || 0) + (parseFloat(p.other) || 0)).toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="14" style={{ textAlign: "center", padding: "10px" }} className="data-cell">No parcels available.</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="gray-cell" style={{ backgroundColor: "#e2e8f0", fontSize: "0.7rem" }}>
                                <td colSpan="6" style={{ textAlign: "right", fontWeight: "700", color: "#0f172a", padding: "6px 4px", whiteSpace: "nowrap" }}>TOTAL:</td>
                                <td className="data-cell" style={{ textAlign: "center", fontWeight: "700", padding: "6px 4px", whiteSpace: "nowrap" }}>{trip.box || trip.parcels?.reduce((s,p)=>s+(parseInt(p.box)||0),0)}</td>
                                <td className="data-cell" style={{ textAlign: "center", fontWeight: "700", padding: "6px 4px", whiteSpace: "nowrap" }}>{trip.weight || trip.parcels?.reduce((s,p)=>s+(parseFloat(p.weight)||0),0)}</td>
                                <td className="data-cell" style={{ textAlign: "right", fontWeight: "700", padding: "6px 4px", whiteSpace: "nowrap" }}>{trip.parcels?.reduce((s,p)=>s+(parseFloat(p.freight)||0),0).toFixed(2)}</td>
                                <td className="data-cell" style={{ textAlign: "right", fontWeight: "700", padding: "6px 4px", whiteSpace: "nowrap" }}>{trip.parcels?.reduce((s,p)=>s+(parseFloat(p.pickup)||0),0).toFixed(2)}</td>
                                <td className="data-cell" style={{ textAlign: "right", fontWeight: "700", padding: "6px 4px", whiteSpace: "nowrap" }}>{trip.parcels?.reduce((s,p)=>s+(parseFloat(p.delivery)||0),0).toFixed(2)}</td>
                                <td className="data-cell" style={{ textAlign: "right", fontWeight: "700", padding: "6px 4px", whiteSpace: "nowrap" }}>{trip.parcels?.reduce((s,p)=>s+(parseFloat(p.special)||0),0).toFixed(2)}</td>
                                <td className="data-cell" style={{ textAlign: "right", fontWeight: "700", padding: "6px 4px", whiteSpace: "nowrap" }}>{trip.parcels?.reduce((s,p)=>s+(parseFloat(p.other)||0),0).toFixed(2)}</td>
                                <td className="data-cell" style={{ textAlign: "right", fontWeight: "700", color: "#10b981", padding: "6px 4px", whiteSpace: "nowrap" }}>
                                    Rs. {parseFloat(trip.freight || trip.parcels?.reduce((s,p)=>s+(parseFloat(p.freight)||0)+(parseFloat(p.pickup)||0)+(parseFloat(p.delivery)||0)+(parseFloat(p.special)||0)+(parseFloat(p.other)||0),0)).toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="section-header">3. Payment Summary</div>
                    <table className="manifest-table">
                        <tbody>
                            <tr>
                                <td className="gray-cell" style={{ width: "25%" }}>PAYMENT MODE</td>
                                <td className="data-cell" style={{ width: "25%" }}>{(trip.payment || "-").toUpperCase()}</td>
                                <td className="gray-cell" style={{ width: "25%" }}>FREIGHT (BASE)</td>
                                <td className="data-cell" style={{ width: "25%" }}>
                                    Rs. {baseFreight.toFixed(2)}
                                </td>
                            </tr>
                            <tr>
                                <td className="gray-cell">GST (18%)</td>
                                <td className="data-cell">Rs. {gstAmount.toFixed(2)}</td>
                                <td className="gray-cell">GRAND TOTAL</td>
                                <td className="data-cell" style={{ color: "#10b981", fontSize: "1.1rem" }}>
                                    Rs. {grandTotal.toFixed(2)}
                                </td>
                            </tr>
                            <tr>
                                <td className="gray-cell">AMOUNT PAID</td>
                                <td className="data-cell" style={{ color: "#f59e0b" }}>Rs. {amountPaid.toFixed(2)}</td>
                                <td className="gray-cell">REMAINING AMOUNT</td>
                                <td className="data-cell" style={{ color: "#ef4444" }}>
                                    Rs. {remaining.toFixed(2)}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                </div>

                <div style={{ padding: "6px 20px", borderTop: "2px solid #1e293b", background: "#f8fafc", fontSize: "0.8rem", color: "#475569", lineHeight: "1.4" }}>
                  <span className="gray-cell" style={{ padding: "2px 6px", marginRight: "6px", fontSize: "0.7rem" }}>NOTE</span>
                  Quantity and quality not checked. We are not responsible for leakage &amp; damage. Subject to Uttarakhand jurisdiction only.
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "10px 2rem", height: "80px" }}>
                  <div style={{ textAlign: "center", width: "200px" }}>
                    <div style={{ height: "40px", marginBottom: "5px" }}></div>
                    <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "5px", fontSize: "0.9rem", fontWeight: "600", color: "#475569" }}>
                      CLIENT / RECEIVER SIGNATURE
                    </div>
                  </div>
                  
                  <div style={{ textAlign: "center", width: "250px" }}>
                    {(user?.role === 'Admin' || user?.role === 'SuperAdmin') ? (
                      <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: "2rem", color: "#0f172a", height: "40px", display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: "5px" }}>
                        {signName}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.85rem", color: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "40px", marginBottom: "5px", fontWeight: "600" }}>
                        <span>Digitally signed by</span>
                        <span>Multimarg Private Limited</span>
                      </div>
                    )}
                    <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "5px", fontSize: "0.9rem", fontWeight: "600", color: "#475569" }}>
                      AUTHORIZED SIGNATURE
                    </div>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintSingleTrip;
