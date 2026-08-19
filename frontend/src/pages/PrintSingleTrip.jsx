import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Download, ArrowLeft } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { formatDate } from "../utils/formatters";
import appDB from "../utils/appDB";
import { downloadViaPuppeteer } from "../utils/puppeteerPdf";


const PrintSingleTrip = () => {
  const { index } = useParams();
  const navigate = useNavigate();
  const _location = useLocation();
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'admin@multimarg.com';
  const [signName, setSignName] = useState(user?.name || "Admin");
  const [scale, setScale] = useState(1);
  const [trip, setTrip] = useState(null);
  const [printHeader, setPrintHeader] = useState("MULTIMARG");
  const containerRef = React.useRef(null);

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
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const horizontalMargin = window.innerWidth < 600 ? 16 : 32;
        const availWidth = containerWidth - horizontalMargin;
        setScale(Math.min(1, Math.max(0.2, availWidth / 1122)));
      } else {
        const screenW = window.innerWidth;
        const horizontalMargin = screenW < 600 ? 32 : 48;
        setScale(Math.min(1, Math.max(0.2, (screenW - horizontalMargin) / 1122)));
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
    if (user?.name) setSignName(user.name);
  }, [user]);

  const handleDownloadPDF = async () => {
    const tripNo = (trip?.tripNo || trip?.trip || trip?.id?.slice(-6) || id).toString().trim().toUpperCase();
    const origin = (trip?.origin || "").toString().trim().toUpperCase();
    const dest = (trip?.destination || "").toString().trim().toUpperCase();
    const routeStr = (origin && dest) ? `${origin} TO ${dest}` : (origin || dest || "");
    const vehicle = (trip?.vehicleNo || trip?.truckNo || "").toString().trim().toUpperCase();
    const filename = `TRIP ${tripNo}${routeStr ? " - " + routeStr : ""}${vehicle ? " - " + vehicle : ""}.pdf`;

    await downloadViaPuppeteer({
      elementId: "single-trip-content",
      filename,
      landscape: true
    });
  };

  if (!trip) return <div style={{ padding: "2rem", textAlign: "center" }}><h3>Trip not found.</h3><button className="btn btn-primary mt-3" onClick={() => navigate(-1)}>Go Back</button></div>;

  const baseFreight = parseFloat(trip?.freight || trip?.parcels?.reduce((s,p)=>s+(parseFloat(p.freight)||0),0)) || 0;
  const gstAmount = baseFreight * 0.18;
  const grandTotal = baseFreight + gstAmount;
  const amountPaid = parseFloat(trip?.paidAmount || 0);
  const remaining = grandTotal - amountPaid;

  return (
    <div ref={containerRef} style={{ background: "#e2e8f0", minHeight: "100vh", padding: scale < 1 ? "0.5rem 0.25rem" : "1.5rem 0.75rem", boxSizing: "border-box", width: "100%", overflowX: "hidden" }} className="print-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
        
        .print-wrapper { font-family: 'Outfit', sans-serif; }

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
        .manifest-table {
          width: 100% !important;
          min-width: 100% !important;
          max-width: 100% !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
        }
        .print-container th, 
        .print-container td,
        .manifest-table th,
        .manifest-table td {
          white-space: normal !important;
          word-break: break-word !important;
        }

        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 1122px !important; max-width: 1122px !important; min-width: 1122px !important; transform: none !important; margin: 0; padding: 0; background: white !important; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
          .manifest-table th, .manifest-table td { border-color: #cbd5e1 !important; color: #0f172a !important; }
          .section-header { background-color: #1e293b !important; color: white !important; }
          .gray-cell { background-color: #f1f5f9 !important; }
          .premium-border { border-color: #1e293b !important; }
        }
        .manifest-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: center; }
        .manifest-table th, .manifest-table td { border: 1.5px solid #64748b; padding: 4px 8px; color: #0f172a; text-align: center; }
        .gray-cell { background-color: #f8fafc; color: #475569; font-weight: 500; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px; text-align: center; }
        .data-cell { font-weight: 600; color: #0f172a; font-size: 0.75rem; text-align: center; }
        .section-header { background-color: #1e293b; color: #ffffff; padding: 6px 15px; font-weight: 600; font-size: 0.9rem; letter-spacing: 1px; text-transform: uppercase; display: flex; align-items: center; margin-top: 8px; }
        .blue-text { color: #1e3a8a; }
        .premium-border { border: 2px solid #1e293b; }
      `}</style>

      <div className="no-print" style={{ maxWidth: "800px", margin: "0 auto 1rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
        <button className="btn" style={{ background: "white", border: "1.5px solid #64748b", color: "#475569", fontWeight: 600 }} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} className="mr-2" /> Back
        </button>
        <div className="top-actions-container">
          {isSuperAdmin && (
            <select 
              className="form-control" 
              style={{ border: "1.5px solid #64748b", height: "35px", fontSize: "0.85rem", width: "170px", padding: "0 5px", background: "white", borderRadius: "6px", outline: "none" }}
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
              border: "1.5px solid #64748b", 
              borderRadius: "6px", 
              fontSize: "0.85rem", 
              width: "160px", 
              outline: "none",
              background: (user?.role === 'Admin' || user?.role === 'SuperAdmin') ? "#ffffff" : "#f1f5f9",
              cursor: (user?.role === 'Admin' || user?.role === 'SuperAdmin') ? "text" : "not-allowed"
            }} 
          />
          <button className="btn btn-primary" style={{ fontWeight: 600, background: "#1e293b", border: "none" }} onClick={() => handleDownloadPDF(false)}>
            <Download size={18} className="mr-2" /> Download PDF
          </button>
        </div>
      </div>

      <div className="print-main-wrapper" style={{ display: "flex", justifyContent: "center", overflow: "hidden", width: "100%", paddingBottom: "2rem" }}>
        <div className="print-scale-wrapper" style={{ width: `${1122 * scale}px`, height: `${794 * scale}px`, position: "relative", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
          <div id="single-trip-content" className="print-container print-container-trip" style={{ 
            width: "1122px", height: "auto", minHeight: "0", background: "white", color: "#0f172a", boxSizing: "border-box", padding: "10px", overflow: "hidden",
            transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0
          }}>
            <style>
              {`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
                
                * {
                  font-family: 'Outfit', sans-serif !important;
                }
                .print-header-reset,
                .print-header-reset * {
                  margin: 0 !important;
                  padding: 0 !important;
                  line-height: 1.15 !important;
                  box-sizing: border-box !important;
                }
                .print-header-reset h1 { margin: 0 !important; padding: 0 !important; }
                .print-header-reset span { margin: 0 !important; padding: 0 !important; display: block !important; }
                .print-header-reset a { display: inline !important; }
                .manifest-table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  font-size: 0.68rem !important;
                  table-layout: fixed !important;
                }
                .manifest-table th, .manifest-table td {
                  border: 1.5px solid #64748b !important;
                  padding: 3px 5px !important;
                  color: #0f172a !important;
                }
                .gray-cell {
                  background-color: #f8fafc !important;
                  color: #0f172a !important;
                  font-weight: 700 !important;
                  text-transform: uppercase !important;
                  font-size: 0.64rem !important;
                  letter-spacing: 0.4px !important;
                }
                .data-cell {
                  font-weight: 600 !important;
                  color: #0f172a !important;
                  font-size: 0.7rem !important;
                }
                .section-header {
                  background-color: #1e293b !important;
                  color: #ffffff !important;
                  padding: 3px 8px !important;
                  font-weight: 600 !important;
                  font-size: 0.72rem !important;
                  letter-spacing: 0.5px !important;
                  text-transform: uppercase !important;
                  display: flex !important;
                  align-items: center !important;
                }
                .blue-text { color: #1e3a8a !important; }
                .premium-border { border: 2px solid #1e293b !important; }
              `}
            </style>
            <div className="premium-border" style={{ height: "auto", minHeight: "720px", position: "relative", display: "flex", flexDirection: "column" }}>
              
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 2, pointerEvents: "none", display: "flex", justifyContent: "center", alignItems: "center" }}>
                 <img src={printHeader === "PRIME" ? "/Prime RoadWAYS.png" : "/mc.png"} alt="Watermark" style={{ width: "45%", opacity: 0.1 }} />
              </div>
      
              <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 1.5rem", borderBottom: "2px solid #1e293b" }}>
                  {printHeader === "PRIME" ? (
                    <>
                      <div style={{ width: "120px", flexShrink: 0 }}><img src="/Prime RoadWAYS.png" alt="Prime Roadways" style={{ width: "100%", height: "auto" }} /></div>
                      <div className="print-header-reset" style={{ textAlign: "center", flex: 1, padding: "0 15px", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "0px", lineHeight: "1" }}>
                        <h1 style={{ margin: "0", padding: "0", fontSize: "1.4rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", color: "#b91c1c", lineHeight: "1.15", width: "100%" }}>PRIME ROADWAYS</h1>
                        <span style={{ margin: "0", padding: "0", fontSize: "0.85rem", fontWeight: "600", color: "#334155", lineHeight: "1.15" }}>PLOT NO 292/292A & 292B, OM VIHAR, WEST DELHI, NEW DELHI-110059</span>
                        <span style={{ margin: "0", padding: "0", fontSize: "0.75rem", fontWeight: "600", color: "#334155", lineHeight: "1.15" }}>Contact: +91 7503112217&nbsp;&nbsp;|&nbsp;&nbsp;info@primeroadways.co.in</span>
                        <span style={{ margin: "0", padding: "0", fontSize: "0.75rem", fontWeight: "700", color: "#0f172a", lineHeight: "1.15" }}>GST: 07BBCPP8550Q1ZX&nbsp;&nbsp;|&nbsp;&nbsp;PAN: BBCPP8550Q</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ width: "100px", flexShrink: 0 }}><img src="/mc.png" alt="Multimarg Carriers" style={{ width: "100%", height: "auto" }} /></div>
                      <div className="print-header-reset" style={{ textAlign: "center", flex: 1, padding: "0 10px", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "0px", lineHeight: "1" }}>
                        <h1 className="blue-text" style={{ margin: "0", padding: "0", fontSize: "1.4rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: "1.15", width: "100%" }}>MULTIMARG CARRIERS PVT. LTD.</h1>
                        <span style={{ margin: "0", padding: "0", fontSize: "0.72rem", fontWeight: "500", color: "#475569", lineHeight: "1.15", whiteSpace: "nowrap" }}>LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND-263153</span>
                        <span style={{ margin: "0", padding: "0", fontSize: "0.72rem", fontWeight: "600", color: "#334155", lineHeight: "1.15" }}>Contact: +91 5944-324033&nbsp;&nbsp;|&nbsp;&nbsp;<a href="mailto:info@multimarg.com" className="no-transform" style={{ color: "inherit", textDecoration: "none", textTransform: "lowercase" }}>info@multimarg.com</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="https://multimarg.com" target="_blank" rel="noreferrer" className="no-transform" style={{ color: "inherit", textDecoration: "none", textTransform: "lowercase" }}>www.multimarg.com</a></span>
                        <span style={{ margin: "0", padding: "0", fontSize: "0.72rem", fontWeight: "700", color: "#0f172a", lineHeight: "1.15" }}>GST: 05AANCM3054E1ZN&nbsp;&nbsp;|&nbsp;&nbsp;PAN: AANCM3054E1ZN</span>
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
                    <table className="manifest-table" style={{ fontSize: "0.68rem", width: "100%", tableLayout: "fixed" }}>
                        <thead>
                            <tr className="gray-cell" style={{ fontSize: "0.65rem" }}>
                                <th style={{ width: "7.5%", padding: "5px 3px", whiteSpace: "nowrap" }}>LR NO</th>
                                <th style={{ width: "11%", padding: "5px 3px", whiteSpace: "nowrap" }}>CONSIGNOR</th>
                                <th style={{ width: "11%", padding: "5px 3px", whiteSpace: "nowrap" }}>CONSIGNEE</th>
                                <th style={{ width: "9%", padding: "5px 3px", whiteSpace: "nowrap" }}>ORIGIN</th>
                                <th style={{ width: "9%", padding: "5px 3px", whiteSpace: "nowrap" }}>DEST</th>
                                <th style={{ width: "5.5%", padding: "5px 3px", whiteSpace: "nowrap" }}>MODE</th>
                                <th style={{ width: "4.5%", textAlign: "center", padding: "5px 3px", whiteSpace: "nowrap" }}>BOX</th>
                                <th style={{ width: "4.5%", textAlign: "center", padding: "5px 3px", whiteSpace: "nowrap" }}>WT</th>
                                <th style={{ width: "7.5%", textAlign: "right", padding: "5px 3px", whiteSpace: "nowrap" }}>FRT</th>
                                <th style={{ width: "6%", textAlign: "right", padding: "5px 3px", whiteSpace: "nowrap" }}>PICK</th>
                                <th style={{ width: "6%", textAlign: "right", padding: "5px 3px", whiteSpace: "nowrap" }}>DELV</th>
                                <th style={{ width: "6%", textAlign: "right", padding: "5px 3px", whiteSpace: "nowrap" }}>SPEC</th>
                                <th style={{ width: "4.5%", textAlign: "right", padding: "5px 3px", whiteSpace: "nowrap" }}>OTH</th>
                                <th style={{ width: "8%", textAlign: "right", padding: "5px 3px", whiteSpace: "nowrap" }}>TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trip.parcels && trip.parcels.length > 0 ? (
                                trip.parcels.map((p, i) => (
                                    <tr key={i}>
                                        <td className="data-cell" style={{ color: "#ef4444", fontWeight: "700", padding: "4px 3px" }}>{p.lrNo || "-"}</td>
                                        <td className="data-cell" style={{ padding: "4px 3px" }}>{(p.consignor || "-").toUpperCase()}</td>
                                        <td className="data-cell" style={{ padding: "4px 3px" }}>{(p.consignee || "-").toUpperCase()}</td>
                                        <td className="data-cell" style={{ padding: "4px 3px" }}>{(p.origin || "-").toUpperCase()}</td>
                                        <td className="data-cell" style={{ padding: "4px 3px" }}>{(p.destination || "-").toUpperCase()}</td>
                                        <td className="data-cell" style={{ padding: "4px 3px" }}>{(p.mode || "-").toUpperCase()}</td>
                                        <td className="data-cell" style={{ textAlign: "center", padding: "4px 3px" }}>{p.box || "-"}</td>
                                        <td className="data-cell" style={{ textAlign: "center", padding: "4px 3px" }}>{p.weight || "-"}</td>
                                        <td className="data-cell" style={{ textAlign: "right", padding: "4px 3px" }}>{parseFloat(p.freight || 0).toFixed(2)}</td>
                                        <td className="data-cell" style={{ textAlign: "right", padding: "4px 3px" }}>{parseFloat(p.pickup || 0).toFixed(2)}</td>
                                        <td className="data-cell" style={{ textAlign: "right", padding: "4px 3px" }}>{parseFloat(p.delivery || 0).toFixed(2)}</td>
                                        <td className="data-cell" style={{ textAlign: "right", padding: "4px 3px" }}>{parseFloat(p.special || 0).toFixed(2)}</td>
                                        <td className="data-cell" style={{ textAlign: "right", padding: "4px 3px" }}>{parseFloat(p.other || 0).toFixed(2)}</td>
                                        <td className="data-cell" style={{ textAlign: "right", fontWeight: "700", padding: "4px 3px" }}>
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
                            <tr className="gray-cell" style={{ backgroundColor: "#e2e8f0", fontSize: "0.65rem" }}>
                                <td colSpan="6" style={{ textAlign: "right", fontWeight: "700", color: "#0f172a", padding: "5px 3px", whiteSpace: "nowrap" }}>TOTAL:</td>
                                <td className="data-cell" style={{ textAlign: "center", fontWeight: "700", padding: "5px 3px", whiteSpace: "nowrap" }}>{trip.box || trip.parcels?.reduce((s,p)=>s+(parseInt(p.box)||0),0)}</td>
                                <td className="data-cell" style={{ textAlign: "center", fontWeight: "700", padding: "5px 3px", whiteSpace: "nowrap" }}>{trip.weight || trip.parcels?.reduce((s,p)=>s+(parseFloat(p.weight)||0),0)}</td>
                                <td className="data-cell" style={{ textAlign: "right", fontWeight: "700", padding: "5px 3px", whiteSpace: "nowrap" }}>{trip.parcels?.reduce((s,p)=>s+(parseFloat(p.freight)||0),0).toFixed(2)}</td>
                                <td className="data-cell" style={{ textAlign: "right", fontWeight: "700", padding: "5px 3px", whiteSpace: "nowrap" }}>{trip.parcels?.reduce((s,p)=>s+(parseFloat(p.pickup)||0),0).toFixed(2)}</td>
                                <td className="data-cell" style={{ textAlign: "right", fontWeight: "700", padding: "5px 3px", whiteSpace: "nowrap" }}>{trip.parcels?.reduce((s,p)=>s+(parseFloat(p.delivery)||0),0).toFixed(2)}</td>
                                <td className="data-cell" style={{ textAlign: "right", fontWeight: "700", padding: "5px 3px", whiteSpace: "nowrap" }}>{trip.parcels?.reduce((s,p)=>s+(parseFloat(p.special)||0),0).toFixed(2)}</td>
                                <td className="data-cell" style={{ textAlign: "right", fontWeight: "700", padding: "5px 3px", whiteSpace: "nowrap" }}>{trip.parcels?.reduce((s,p)=>s+(parseFloat(p.other)||0),0).toFixed(2)}</td>
                                <td className="data-cell" style={{ textAlign: "right", fontWeight: "700", color: "#10b981", padding: "5px 3px", whiteSpace: "nowrap" }}>
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

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "10px 2rem", marginTop: "auto" }}>
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
