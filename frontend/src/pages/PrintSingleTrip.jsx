import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Download, ArrowLeft, Printer } from "lucide-react";
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
  const [showPrintAmounts, setShowPrintAmounts] = useState(false);
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
    const tripNo = (trip?.tripNo || trip?.trip || trip?.id?.slice(-6) || "").toString().trim().toUpperCase();
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

  const handleBrowserPrint = () => {
    window.print();
  };

  if (!trip) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h3>Trip not found.</h3>
        <button className="btn btn-primary mt-3" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const isSpecialMode = String(trip?.mode || '').toUpperCase() === 'SPECIAL' || Boolean(trip?.isSpecial);

  const baseFreight = parseFloat(
    trip?.freight ||
    trip?.parcels?.reduce(
      (s, p) =>
        s +
        (parseFloat(p.freight) || 0) +
        (parseFloat(p.pickup) || 0) +
        (parseFloat(p.delivery) || 0) +
        (parseFloat(p.special) || 0) +
        (parseFloat(p.other) || 0) +
        (parseFloat(p.parking) || 0) +
        (parseFloat(p.labor) || 0),
      0
    )
  ) || 0;

  const gstAmount = baseFreight * 0.18;
  const grandTotal = baseFreight + gstAmount;
  const amountPaid = parseFloat(trip?.paidAmount || 0);
  const remaining = grandTotal - amountPaid;

  const allParcels = trip.parcels && trip.parcels.length > 0 ? trip.parcels : [];
  
  // Intelligent Dynamic Page Splitting
  const pages = [];
  if (allParcels.length <= 14) {
    pages.push({ parcels: allParcels, pageNum: 1, isLast: true, isFirst: true });
  } else {
    const page1Items = allParcels.slice(0, 14);
    pages.push({ parcels: page1Items, pageNum: 1, isLast: false, isFirst: true });
    
    let currentIdx = 14;
    let pageCounter = 2;
    while (currentIdx < allParcels.length) {
      const chunkSize = 18;
      const chunk = allParcels.slice(currentIdx, currentIdx + chunkSize);
      pages.push({
        parcels: chunk,
        pageNum: pageCounter,
        isLast: currentIdx + chunkSize >= allParcels.length,
        isFirst: false
      });
      currentIdx += chunkSize;
      pageCounter++;
    }
  }

  const totalPages = pages.length;

  return (
    <div ref={containerRef} style={{ background: "#e2e8f0", minHeight: "100vh", padding: scale < 1 ? "0.5rem 0.25rem" : "1.5rem 0.75rem", boxSizing: "border-box", width: "100%", overflowX: "hidden" }} className="print-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
        
        .print-wrapper { font-family: 'Inter', 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif; }

        .single-trip-page {
          width: 1122px;
          height: auto;
          background: #ffffff;
          color: #0f172a;
          box-sizing: border-box;
          padding: 8px 10px;
          position: relative;
          margin-bottom: 20px;
          border: 2px solid #0f172a;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          page-break-after: always;
          break-after: page;
          display: flex;
          flex-direction: column;
        }

        .single-trip-page:last-child {
          margin-bottom: 0;
          page-break-after: auto;
          break-after: auto;
        }

        .manifest-table {
          width: 100% !important;
          min-width: 100% !important;
          max-width: 100% !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
          font-size: 0.65rem !important;
          background: transparent !important;
        }
        .manifest-table th, 
        .manifest-table td {
          border: 1px solid #94a3b8 !important;
          padding: 3px 5px !important;
          color: #0f172a !important;
          vertical-align: middle;
          box-sizing: border-box !important;
          line-height: 1.25 !important;
        }
        .nowrap-cell {
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .num-cell {
          white-space: nowrap !important;
          font-variant-numeric: tabular-nums;
        }
        .gray-cell {
          background-color: rgba(241, 245, 249, 0.85) !important;
          color: #1e293b !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          font-size: 0.62rem !important;
          letter-spacing: 0.3px !important;
        }
        .data-cell {
          font-weight: 600 !important;
          color: #0f172a !important;
          font-size: 0.67rem !important;
        }
        .section-header {
          background-color: #0f172a !important;
          color: #ffffff !important;
          padding: 3px 8px !important;
          font-weight: 700 !important;
          font-size: 0.7rem !important;
          letter-spacing: 0.5px !important;
          text-transform: uppercase !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          margin-top: 3px;
        }
        .blue-text { color: #1e3a8a !important; }

        @media print {
          @page { size: A4 landscape; margin: 5mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 1122px !important;
            transform: none !important;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .single-trip-page {
            margin-bottom: 0 !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Top Action Bar */}
      <div className="no-print" style={{ maxWidth: "900px", margin: "0 auto 1rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
        <button className="btn" style={{ background: "white", border: "1.5px solid #cbd5e1", color: "#334155", fontWeight: 600 }} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} className="mr-2" /> Back
        </button>
        <div className="top-actions-container" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {isSuperAdmin && (
            <select 
              className="form-control" 
              style={{ border: "1.5px solid #cbd5e1", height: "35px", fontSize: "0.85rem", width: "170px", padding: "0 8px", background: "white", borderRadius: "6px", outline: "none" }}
              value={printHeader}
              onChange={e => setPrintHeader(e.target.value)}
            >
              <option value="MULTIMARG">Header: Multimarg</option>
              <option value="PRIME">Header: Prime Roadways</option>
            </select>
          )}
          <select 
            className="form-control" 
            style={{ border: "1.5px solid #cbd5e1", height: "35px", fontSize: "0.85rem", width: "150px", padding: "0 8px", background: "white", borderRadius: "6px", outline: "none" }}
            value={showPrintAmounts ? "SHOW" : "HIDE"}
            onChange={e => setShowPrintAmounts(e.target.value === "SHOW")}
          >
            <option value="SHOW">Show Amounts</option>
            <option value="HIDE">Hide (0 / XXXX)</option>
          </select>
          <input 
            type="text" 
            value={signName} 
            onChange={(e) => setSignName(e.target.value)} 
            disabled={user?.role !== 'Admin' && user?.role !== 'SuperAdmin'}
            placeholder="Sign Name" 
            style={{ 
              padding: "7px 10px", 
              border: "1.5px solid #cbd5e1", 
              borderRadius: "6px", 
              fontSize: "0.85rem", 
              width: "150px", 
              outline: "none",
              background: (user?.role === 'Admin' || user?.role === 'SuperAdmin') ? "#ffffff" : "#f1f5f9",
              cursor: (user?.role === 'Admin' || user?.role === 'SuperAdmin') ? "text" : "not-allowed"
            }} 
          />
          <button className="btn" style={{ fontWeight: 600, background: "#ffffff", color: "#0f172a", border: "1.5px solid #cbd5e1", display: "flex", alignItems: "center", gap: "6px" }} onClick={handleBrowserPrint}>
            <Printer size={16} /> Print
          </button>
          <button className="btn btn-primary" style={{ fontWeight: 600, background: "#2563eb", border: "none", display: "flex", alignItems: "center", gap: "6px" }} onClick={handleDownloadPDF}>
            <Download size={16} /> Download PDF {totalPages > 1 ? `(${totalPages} Pages)` : ""}
          </button>
        </div>
      </div>

      {/* Main Print Container */}
      <div className="print-main-wrapper" style={{ display: "flex", justifyContent: "center", width: "100%", paddingBottom: "2rem" }}>
        <div 
          className="print-scale-wrapper" 
          style={{ 
            width: `${1122 * scale}px`, 
            height: "auto",
            position: "relative"
          }}
        >
          <div
            id="single-trip-content"
            className="print-container"
            style={{
              width: "1122px",
              background: "transparent",
              color: "#0f172a",
              boxSizing: "border-box",
              transform: `scale(${scale})`,
              transformOrigin: "top left"
            }}
          >
            {pages.map((page, pIdx) => (
              <div key={`page-${pIdx}`} className="single-trip-page">
                {/* Watermark - Seamless Constant Overlay */}
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "100%", height: "100%", zIndex: 10, pointerEvents: "none", display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <img src={printHeader === "PRIME" ? "/Prime RoadWAYS.png" : "/mc.png"} alt="Watermark" style={{ width: "48%", opacity: 0.16, objectFit: "contain", mixBlendMode: "multiply", pointerEvents: "none" }} />
                </div>

                <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
                  
                  {/* Header Banner */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", borderBottom: "1.5px solid #0f172a" }}>
                    {printHeader === "PRIME" ? (
                      <>
                        <div style={{ width: "110px", flexShrink: 0 }}><img src="/Prime RoadWAYS.png" alt="Prime Roadways" style={{ width: "100%", height: "auto" }} /></div>
                        <div style={{ textAlign: "center", flex: 1, padding: "0 8px", lineHeight: "1.15" }}>
                          <h1 style={{ margin: "0", fontSize: "1.25rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", color: "#b91c1c" }}>PRIME ROADWAYS</h1>
                          <span style={{ fontSize: "0.72rem", fontWeight: "600", color: "#334155" }}>PLOT NO 292/292A & 292B, OM VIHAR, WEST DELHI, NEW DELHI-110059</span>
                          <div style={{ fontSize: "0.68rem", fontWeight: "600", color: "#334155" }}>Contact: +91 7503112217&nbsp;&nbsp;|&nbsp;&nbsp;info@primeroadways.co.in</div>
                          <div style={{ fontSize: "0.68rem", fontWeight: "700", color: "#0f172a" }}>GST: 07BBCPP8550Q1ZX&nbsp;&nbsp;|&nbsp;&nbsp;PAN: BBCPP8550Q</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ width: "85px", flexShrink: 0 }}><img src="/mc.png" alt="Multimarg Carriers" style={{ width: "100%", height: "auto" }} /></div>
                        <div style={{ textAlign: "center", flex: 1, padding: "0 8px", lineHeight: "1.15" }}>
                          <h1 className="blue-text" style={{ margin: "0", fontSize: "1.25rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", color: "#1e3a8a" }}>MULTIMARG CARRIERS PVT. LTD.</h1>
                          <div style={{ fontSize: "0.7rem", fontWeight: "500", color: "#475569" }}>LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND-263153</div>
                          <div style={{ fontSize: "0.68rem", fontWeight: "600", color: "#334155" }}>Contact: +91 5944-324033&nbsp;&nbsp;|&nbsp;&nbsp;info@multimarg.com&nbsp;&nbsp;|&nbsp;&nbsp;www.multimarg.com</div>
                          <div style={{ fontSize: "0.68rem", fontWeight: "700", color: "#0f172a" }}>GST: 05AANCM3054E1ZN&nbsp;&nbsp;|&nbsp;&nbsp;PAN: AANCM3054E1ZN</div>
                        </div>
                      </>
                    )}
                    
                    {/* Trip No Badge & Page Indicator */}
                    <div style={{ width: "130px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <table style={{ borderCollapse: "collapse", border: "1.5px solid #0f172a", borderRadius: "4px", overflow: "hidden", backgroundColor: "#f8fafc", width: "125px", textAlign: "center", margin: 0 }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: "3px 4px 1px", fontSize: "0.6rem", fontWeight: "700", color: "#64748b", letterSpacing: "1px", border: "none" }}>TRIP NO</td>
                          </tr>
                          <tr>
                            <td style={{ padding: "0px 4px 3px", fontSize: "1rem", fontWeight: "800", color: "#e11d48", border: "none", whiteSpace: "nowrap" }}>{trip?.tripNo || "-"}</td>
                          </tr>
                        </tbody>
                      </table>
                      {totalPages > 1 && (
                        <div style={{ fontSize: "0.65rem", fontWeight: "700", color: "#64748b", marginTop: "2px", textTransform: "uppercase" }}>
                          Page {page.pageNum} of {totalPages}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Receipt Title */}
                  <div style={{ background: "#f8fafc", padding: "4px", textAlign: "center", borderBottom: "1px solid #cbd5e1" }}>
                    <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "#0f172a", letterSpacing: "2px", textTransform: "uppercase" }}>
                      TRIP RECEIPT {totalPages > 1 ? `(PART ${page.pageNum})` : ""}
                    </h2>
                  </div>

                  <div style={{ flex: 1, padding: "4px 8px", width: "100%", boxSizing: "border-box" }}>
                    
                    {/* Section 1: Vehicle & Trip Info */}
                    {page.isFirst && (
                      <>
                        <div className="section-header">1. Vehicle & Trip Info</div>
                        <table className="manifest-table" style={{ marginBottom: "4px" }}>
                          <tbody>
                            <tr>
                              <td className="gray-cell" style={{ width: "12%", textAlign: "left" }}>TRIP NO.</td>
                              <td className="data-cell nowrap-cell" style={{ width: "21%", color: "#e11d48", fontWeight: "700", textAlign: "left" }}>{(trip.tripNo || "-").toUpperCase()}</td>
                              <td className="gray-cell" style={{ width: "12%", textAlign: "left" }}>DATE</td>
                              <td className="data-cell nowrap-cell" style={{ width: "21%", textAlign: "left" }}>{trip.date ? formatDate(trip.date) : "-"}</td>
                              <td className="gray-cell" style={{ width: "13%", textAlign: "left" }}>CLIENT NAME</td>
                              <td className="data-cell nowrap-cell" style={{ width: "21%", color: "#1e3a8a", fontSize: "0.75rem", textAlign: "left" }}>{(trip.clientName || "-").toUpperCase()}</td>
                            </tr>
                            <tr>
                              <td className="gray-cell" style={{ textAlign: "left" }}>FROM</td>
                              <td className="data-cell nowrap-cell" style={{ fontWeight: "700", textAlign: "left" }}>{(trip.origin || "-").toUpperCase()}</td>
                              <td className="gray-cell" style={{ textAlign: "left" }}>TO</td>
                              <td className="data-cell nowrap-cell" style={{ fontWeight: "700", textAlign: "left" }}>{(trip.destination || "-").toUpperCase()}</td>
                              <td className="gray-cell" style={{ textAlign: "left" }}>MODE</td>
                              <td className="data-cell nowrap-cell" style={{ fontWeight: isSpecialMode ? "700" : "600", color: isSpecialMode ? "#1e3a8a" : "inherit", textAlign: "left" }}>
                                {(trip.mode || "-").toUpperCase()}
                              </td>
                            </tr>
                            <tr>
                              <td className="gray-cell" style={{ textAlign: "left" }}>VEHICLE NO.</td>
                              <td className="data-cell nowrap-cell" style={{ textAlign: "left" }}>{(trip.vehicleNo || "-").toUpperCase()}</td>
                              <td className="gray-cell" style={{ textAlign: "left" }}>VEHICLE TYPE</td>
                              <td className="data-cell nowrap-cell" style={{ textAlign: "left" }}>{(trip.vehicleType || "-").toUpperCase()}</td>
                              <td className="gray-cell" style={{ textAlign: "left" }}>{isSpecialMode ? "TOTAL FREIGHT" : "PAYMENT"}</td>
                              <td className="data-cell nowrap-cell" style={{ fontWeight: "700", color: isSpecialMode ? "#059669" : "#1e3a8a", fontSize: isSpecialMode ? "0.8rem" : "0.72rem", textAlign: "left" }}>
                                {isSpecialMode ? (showPrintAmounts ? `Rs. ${baseFreight.toFixed(2)}` : "Rs. 0") : (trip.payment || "-").toUpperCase()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </>
                    )}

                    {/* Section 2: Item Details */}
                    <div className="section-header">
                      <span>2. Item Details {totalPages > 1 ? `(Page ${page.pageNum} of ${totalPages})` : ""}</span>
                    </div>

                    {isSpecialMode ? (
                      /* Dedicated Special Mode Print: Clean 8 Physical Goods Columns */
                      <table className="manifest-table" style={{ width: "100%", tableLayout: "fixed" }}>
                        <thead>
                          <tr className="gray-cell">
                            <th style={{ width: "11%", textAlign: "center" }}>LR NO</th>
                            <th style={{ width: "21%", textAlign: "left" }}>CONSIGNOR</th>
                            <th style={{ width: "21%", textAlign: "left" }}>CONSIGNEE</th>
                            <th style={{ width: "14%", textAlign: "left" }}>LR ORIGIN</th>
                            <th style={{ width: "14%", textAlign: "left" }}>LR DESTINATION</th>
                            <th style={{ width: "7%", textAlign: "center" }}>MODE</th>
                            <th style={{ width: "6%", textAlign: "center" }}>BOX</th>
                            <th style={{ width: "6%", textAlign: "center" }}>WT (KG)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {page.parcels.length > 0 ? (
                            page.parcels.map((p, i) => (
                              <tr key={i} style={{ backgroundColor: i % 2 === 1 ? "rgba(241, 245, 249, 0.55)" : "transparent" }}>
                                <td className="data-cell nowrap-cell" style={{ color: "#ef4444", fontWeight: "700", textAlign: "center" }}>{p.lrNo || "-"}</td>
                                <td className="data-cell nowrap-cell" style={{ textAlign: "left" }}>{(p.consignor || "-").toUpperCase()}</td>
                                <td className="data-cell nowrap-cell" style={{ textAlign: "left" }}>{(p.consignee || "-").toUpperCase()}</td>
                                <td className="data-cell nowrap-cell" style={{ textAlign: "left" }}>{(p.origin || "-").toUpperCase()}</td>
                                <td className="data-cell nowrap-cell" style={{ textAlign: "left" }}>{(p.destination || "-").toUpperCase()}</td>
                                <td className="data-cell nowrap-cell" style={{ textAlign: "center" }}>{(p.mode || "-").toUpperCase()}</td>
                                <td className="data-cell num-cell" style={{ textAlign: "center" }}>{p.box || "-"}</td>
                                <td className="data-cell num-cell" style={{ textAlign: "center" }}>{p.weight || "-"}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="8" style={{ textAlign: "center", padding: "8px" }} className="data-cell">No items recorded.</td>
                            </tr>
                          )}
                        </tbody>
                        {page.isLast && (
                          <tfoot>
                            <tr className="gray-cell" style={{ backgroundColor: "rgba(226, 232, 240, 0.85)" }}>
                              <td colSpan="6" style={{ textAlign: "right", fontWeight: "700", color: "#0f172a" }}>TOTAL ITEMS ({trip.parcels?.length || 0}):</td>
                              <td className="data-cell num-cell" style={{ textAlign: "center", fontWeight: "700" }}>{trip.box || (trip.parcels?.reduce((s,p)=>s+(parseInt(p.box)||0),0) || 0)}</td>
                              <td className="data-cell num-cell" style={{ textAlign: "center", fontWeight: "700" }}>{trip.weight || (trip.parcels?.reduce((s,p)=>s+(parseFloat(p.weight)||0),0) || 0)}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    ) : (
                      /* Standard Mode: Balanced 16 Columns */
                      <table className="manifest-table" style={{ width: "100%", tableLayout: "fixed" }}>
                        <thead>
                          <tr className="gray-cell" style={{ fontSize: "0.6rem" }}>
                            <th style={{ width: "7.5%", textAlign: "center" }}>LR NO</th>
                            <th style={{ width: "9.5%", textAlign: "left" }}>CONSIGNOR</th>
                            <th style={{ width: "9.5%", textAlign: "left" }}>CONSIGNEE</th>
                            <th style={{ width: "7%", textAlign: "left" }}>ORIGIN</th>
                            <th style={{ width: "7%", textAlign: "left" }}>DEST</th>
                            <th style={{ width: "4.5%", textAlign: "center" }}>MODE</th>
                            <th style={{ width: "3.5%", textAlign: "center" }}>BOX</th>
                            <th style={{ width: "4%", textAlign: "center" }}>WT</th>
                            <th style={{ width: "6.5%", textAlign: "right" }}>FREIGHT</th>
                            <th style={{ width: "5%", textAlign: "right" }}>PICK</th>
                            <th style={{ width: "5%", textAlign: "right" }}>DLY</th>
                            <th style={{ width: "5%", textAlign: "right" }}>SPL</th>
                            <th style={{ width: "5%", textAlign: "right" }}>PARK</th>
                            <th style={{ width: "5%", textAlign: "right" }}>LABOUR</th>
                            <th style={{ width: "5.5%", textAlign: "right" }}>OTH</th>
                            <th style={{ width: "7.5%", textAlign: "right" }}>TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {page.parcels.length > 0 ? (
                            page.parcels.map((p, i) => (
                              <tr key={i} style={{ backgroundColor: i % 2 === 1 ? "rgba(241, 245, 249, 0.55)" : "transparent" }}>
                                <td className="data-cell nowrap-cell" style={{ color: "#ef4444", fontWeight: "700", textAlign: "center" }}>{p.lrNo || "-"}</td>
                                <td className="data-cell nowrap-cell" style={{ textAlign: "left" }}>{(p.consignor || "-").toUpperCase()}</td>
                                <td className="data-cell nowrap-cell" style={{ textAlign: "left" }}>{(p.consignee || "-").toUpperCase()}</td>
                                <td className="data-cell nowrap-cell" style={{ textAlign: "left" }}>{(p.origin || "-").toUpperCase()}</td>
                                <td className="data-cell nowrap-cell" style={{ textAlign: "left" }}>{(p.destination || "-").toUpperCase()}</td>
                                <td className="data-cell nowrap-cell" style={{ textAlign: "center" }}>{(p.mode || "-").toUpperCase()}</td>
                                <td className="data-cell num-cell" style={{ textAlign: "center" }}>{p.box || "-"}</td>
                                <td className="data-cell num-cell" style={{ textAlign: "center" }}>{p.weight || "-"}</td>
                                <td className="data-cell num-cell" style={{ textAlign: "right" }}>{showPrintAmounts ? parseFloat(p.freight || 0).toFixed(2) : "0"}</td>
                                <td className="data-cell num-cell" style={{ textAlign: "right" }}>{showPrintAmounts ? parseFloat(p.pickup || 0).toFixed(2) : "0"}</td>
                                <td className="data-cell num-cell" style={{ textAlign: "right" }}>{showPrintAmounts ? parseFloat(p.delivery || 0).toFixed(2) : "0"}</td>
                                <td className="data-cell num-cell" style={{ textAlign: "right" }}>{showPrintAmounts ? parseFloat(p.special || 0).toFixed(2) : "0"}</td>
                                <td className="data-cell num-cell" style={{ textAlign: "right" }}>{showPrintAmounts ? parseFloat(p.parking || 0).toFixed(2) : "0"}</td>
                                <td className="data-cell num-cell" style={{ textAlign: "right" }}>{showPrintAmounts ? parseFloat(p.labor || 0).toFixed(2) : "0"}</td>
                                <td className="data-cell num-cell" style={{ textAlign: "right" }}>{showPrintAmounts ? parseFloat(p.other || 0).toFixed(2) : "0"}</td>
                                <td className="data-cell num-cell" style={{ textAlign: "right", fontWeight: "700" }}>
                                  {showPrintAmounts ? ((parseFloat(p.freight) || 0) + (parseFloat(p.pickup) || 0) + (parseFloat(p.delivery) || 0) + (parseFloat(p.special) || 0) + (parseFloat(p.parking) || 0) + (parseFloat(p.labor) || 0) + (parseFloat(p.other) || 0)).toFixed(2) : "0"}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="16" style={{ textAlign: "center", padding: "8px" }} className="data-cell">No items recorded.</td>
                            </tr>
                          )}
                        </tbody>
                        {page.isLast && (
                          <tfoot>
                            <tr className="gray-cell" style={{ backgroundColor: "rgba(226, 232, 240, 0.85)", fontSize: "0.6rem" }}>
                              <td colSpan="6" style={{ textAlign: "right", fontWeight: "700", color: "#0f172a" }}>TOTAL:</td>
                              <td className="data-cell num-cell" style={{ textAlign: "center", fontWeight: "700" }}>{trip.box || (trip.parcels?.reduce((s,p)=>s+(parseInt(p.box)||0),0) || 0)}</td>
                              <td className="data-cell num-cell" style={{ textAlign: "center", fontWeight: "700" }}>{trip.weight || (trip.parcels?.reduce((s,p)=>s+(parseFloat(p.weight)||0),0) || 0)}</td>
                              <td className="data-cell num-cell" style={{ textAlign: "right", fontWeight: "700" }}>{showPrintAmounts ? (trip.parcels?.reduce((s,p)=>s+(parseFloat(p.freight)||0),0) || 0).toFixed(2) : "0"}</td>
                              <td className="data-cell num-cell" style={{ textAlign: "right", fontWeight: "700" }}>{showPrintAmounts ? (trip.parcels?.reduce((s,p)=>s+(parseFloat(p.pickup)||0),0) || 0).toFixed(2) : "0"}</td>
                              <td className="data-cell num-cell" style={{ textAlign: "right", fontWeight: "700" }}>{showPrintAmounts ? (trip.parcels?.reduce((s,p)=>s+(parseFloat(p.delivery)||0),0) || 0).toFixed(2) : "0"}</td>
                              <td className="data-cell num-cell" style={{ textAlign: "right", fontWeight: "700" }}>{showPrintAmounts ? (trip.parcels?.reduce((s,p)=>s+(parseFloat(p.special)||0),0) || 0).toFixed(2) : "0"}</td>
                              <td className="data-cell num-cell" style={{ textAlign: "right", fontWeight: "700" }}>{showPrintAmounts ? (trip.parcels?.reduce((s,p)=>s+(parseFloat(p.parking)||0),0) || 0).toFixed(2) : "0"}</td>
                              <td className="data-cell num-cell" style={{ textAlign: "right", fontWeight: "700" }}>{showPrintAmounts ? (trip.parcels?.reduce((s,p)=>s+(parseFloat(p.labor)||0),0) || 0).toFixed(2) : "0"}</td>
                              <td className="data-cell num-cell" style={{ textAlign: "right", fontWeight: "700" }}>{showPrintAmounts ? (trip.parcels?.reduce((s,p)=>s+(parseFloat(p.other)||0),0) || 0).toFixed(2) : "0"}</td>
                              <td className="data-cell num-cell" style={{ textAlign: "right", fontWeight: "700", color: "#059669" }}>
                                {showPrintAmounts ? `Rs. ${baseFreight.toFixed(2)}` : "Rs. 0"}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    )}

                    {/* Section 3: Payment Summary (Rendered on final page) */}
                    {page.isLast && (
                      <>
                        <div className="section-header" style={{ marginTop: "4px" }}>3. Payment Summary</div>
                        <table className="manifest-table">
                          <tbody>
                            <tr>
                              <td className="gray-cell" style={{ width: "25%", textAlign: "left" }}>PAYMENT MODE</td>
                              <td className="data-cell nowrap-cell" style={{ width: "25%", textAlign: "left" }}>{(trip.payment || "-").toUpperCase()}</td>
                              <td className="gray-cell" style={{ width: "25%", textAlign: "left" }}>TOTAL FREIGHT</td>
                              <td className="data-cell num-cell" style={{ width: "25%", fontWeight: "700", color: "#1e3a8a", textAlign: "right" }}>
                                Rs. {showPrintAmounts ? baseFreight.toFixed(2) : "0"}
                              </td>
                            </tr>
                            <tr>
                              <td className="gray-cell" style={{ textAlign: "left" }}>GST (18%)</td>
                              <td className="data-cell num-cell" style={{ textAlign: "right" }}>Rs. {showPrintAmounts ? gstAmount.toFixed(2) : "0"}</td>
                              <td className="gray-cell" style={{ textAlign: "left" }}>GRAND TOTAL</td>
                              <td className="data-cell num-cell" style={{ color: "#059669", fontSize: "0.85rem", fontWeight: "800", textAlign: "right" }}>
                                Rs. {showPrintAmounts ? grandTotal.toFixed(2) : "0"}
                              </td>
                            </tr>
                            <tr>
                              <td className="gray-cell" style={{ textAlign: "left" }}>AMOUNT PAID</td>
                              <td className="data-cell num-cell" style={{ color: "#d97706", textAlign: "right" }}>Rs. {showPrintAmounts ? amountPaid.toFixed(2) : "0"}</td>
                              <td className="gray-cell" style={{ textAlign: "left" }}>REMAINING AMOUNT</td>
                              <td className="data-cell num-cell" style={{ color: "#dc2626", fontWeight: "700", textAlign: "right" }}>
                                Rs. {showPrintAmounts ? remaining.toFixed(2) : "0"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </>
                    )}

                  </div>

                  {/* Note & Footer Signatures */}
                  <div style={{ marginTop: "auto", paddingTop: "4px" }}>
                    <div style={{ padding: "3px 10px", borderTop: "1px solid #0f172a", background: "#f8fafc", fontSize: "0.67rem", color: "#475569", lineHeight: "1.2" }}>
                      <span className="gray-cell" style={{ padding: "1px 4px", marginRight: "4px", fontSize: "0.6rem", borderRadius: "2px" }}>NOTE</span>
                      Quantity and quality not checked. We are not responsible for leakage &amp; damage. Subject to Uttarakhand jurisdiction only.
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "4px 1.2rem 2px" }}>
                      <div style={{ textAlign: "center", width: "180px" }}>
                        <div style={{ height: "22px", marginBottom: "2px" }}></div>
                        <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "2px", fontSize: "0.7rem", fontWeight: "600", color: "#475569" }}>
                          CLIENT / RECEIVER SIGNATURE
                        </div>
                      </div>
                      
                      <div style={{ textAlign: "center", width: "220px" }}>
                        {(user?.role === 'Admin' || user?.role === 'SuperAdmin') ? (
                          <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: "1.35rem", color: "#0f172a", height: "22px", display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: "2px" }}>
                            {signName}
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.7rem", color: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "22px", marginBottom: "2px", fontWeight: "600" }}>
                            <span>Digitally signed by</span>
                            <span>Multimarg Private Limited</span>
                          </div>
                        )}
                        <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "2px", fontSize: "0.7rem", fontWeight: "600", color: "#475569" }}>
                          AUTHORIZED SIGNATURE
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintSingleTrip;
