import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Download, ArrowLeft } from "lucide-react";
import html2pdf from "html2pdf.js";
import { AuthContext } from "../context/AuthContext";
import { formatDate } from "../utils/formatters";
import appDB from "../utils/appDB";
import { downloadViaPuppeteer } from "../utils/puppeteerPdf";

const PrintTripList = () => {
  const navigate = useNavigate();
  const _location = useLocation();
  const { user } = useContext(AuthContext);
  const [signName, setSignName] = useState(user?.name || "Admin");
  const [scale, setScale] = useState(1);
  const [tripListEntries, setTripListEntries] = useState([]);
  const containerRef = React.useRef(null);

  useEffect(() => {
    const saved = appDB.memGet("tripListEntries");
    if (saved) {
      setTripListEntries(saved);
    }
  }, []);

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
    const filename = `TRIP SUMMARY LIST - ${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`;

    await downloadViaPuppeteer({
      elementId: "trip-list-content",
      filename,
      landscape: true
    });
  };

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
        .manifest-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
        .manifest-table th, .manifest-table td { border: 1px solid #cbd5e1; padding: 4px 6px; color: #0f172a; word-wrap: break-word; }
        .gray-cell { background-color: #f8fafc; color: #475569; font-weight: 500; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px; }
        .data-cell { font-weight: 600; color: #0f172a; font-size: 0.8rem; }
        .section-header { background-color: #1e293b; color: #ffffff; padding: 4px 10px; font-weight: 600; font-size: 0.8rem; letter-spacing: 1px; text-transform: uppercase; display: flex; align-items: center; }
        .manifest-section { margin-bottom: 0px; }
        .blue-text { color: #1e3a8a; }
        .premium-border { border: 2px solid #1e293b; }
      `}</style>

      <div className="no-print" style={{ maxWidth: "1122px", margin: "0 auto 1rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
        <button className="btn" style={{ background: "white", border: "1px solid #cbd5e1", color: "#475569", fontWeight: 600 }} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} className="mr-2" /> Back
        </button>
        <div className="top-actions-container">
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
          <button className="btn btn-primary" style={{ fontWeight: 600, background: "#1e293b", border: "none" }} onClick={() => handleDownloadPDF(false)}>
            <Download size={18} className="mr-2" /> Download Trip List PDF
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", overflow: "hidden", width: "100%", paddingBottom: "2rem" }}>
        <div style={{ width: `${1122 * scale}px`, height: `${794 * scale}px`, position: "relative" }}>
          <div id="trip-list-content" className="print-container" style={{ 
            width: "1122px", height: "auto", minHeight: "0", background: "white", color: "#0f172a", boxSizing: "border-box", padding: "10px", overflow: "hidden",
            transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0
          }}>
            <style>
              {`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
                
                .manifest-table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  font-size: 0.75rem !important;
                  table-layout: fixed !important;
                }
                .manifest-table th, .manifest-table td {
                  border: 1px solid #cbd5e1 !important;
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
                .blue-text { color: #1e3a8a !important; }
                .premium-border { border: 2px solid #1e293b !important; }
              `}
            </style>
            <div className="premium-border" style={{ height: "auto", minHeight: "0", position: "relative", display: "flex", flexDirection: "column" }}>
              
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: "none", display: "flex", justifyContent: "center", alignItems: "center" }}>
                 <img src="/mc.png" alt="Watermark" style={{ width: "400px", opacity: 0.05 }} />
              </div>
      
              <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 1.5rem", borderBottom: "2px solid #1e293b" }}>
                  <div style={{ width: "145px", flexShrink: 0 }}><img src="/mc.png" alt="Multimarg Carriers" style={{ width: "100%", height: "auto" }} /></div>
                  <div style={{ textAlign: "center", flex: 1, padding: "0 15px", minWidth: 0 }}>
                    <h1 className="blue-text" style={{ margin: "0 0 2px", fontSize: "1.5rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>MULTIMARG CARRIERS PVT. LTD.</h1>
                    <p style={{ margin: "0 0 2px", fontSize: "0.85rem", fontWeight: "600", color: "#334155" }}>PREMIER LOGISTICS & TRANSPORTATION SERVICES</p>
                    <p style={{ margin: "2px 0 2px", fontSize: "0.75rem", fontWeight: "500", color: "#475569" }}>LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND-263153</p>
                    <div style={{ display: "flex", justifyContent: "center", gap: "15px", margin: "4px 0 0", fontSize: "0.75rem", fontWeight: "600", color: "#334155" }}>
                      <span>Contact: +91 5944-324033</span><span>|</span><a href="mailto:info@multimarg.com" className="no-transform" style={{ color: "inherit", textDecoration: "none", textTransform: "lowercase" }}>info@multimarg.com</a><span>|</span><a href="https://multimarg.com" target="_blank" rel="noreferrer" className="no-transform" style={{ color: "inherit", textDecoration: "none", textTransform: "lowercase" }}>multimarg.com</a>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: "15px", margin: "2px 0 0", fontSize: "0.75rem", fontWeight: "700", color: "#0f172a" }}>
                      <span>GST: 05AANCM3054E1ZN</span><span>|</span><span>PAN: AANCM3054E1ZN</span>
                    </div>
                  </div>
                  <div style={{ width: "145px", flexShrink: 0 }}></div>
                </div>

                <div style={{ background: "#f8fafc", padding: "4px", textAlign: "center", borderBottom: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 20px" }}>
                  <div style={{ width: "150px" }}></div>
                  <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#0f172a", letterSpacing: "2px", textTransform: "uppercase" }}>TRIP MIS</h2>
                  <div style={{ width: "150px", textAlign: "right", fontSize: "0.8rem", fontWeight: "600", color: "#475569" }}>Date: {formatDate(new Date())}</div>
                </div>

                <div className="manifest-section" style={{ flex: 1, padding: "10px" }}>
                  <table className="manifest-table">
                    <thead>
                      <tr className="gray-cell">
                        <th style={{ width: "3%" }}>#</th>
                        <th style={{ width: "8%" }}>Date</th>
                        <th style={{ width: "10%" }}>Client</th>
                        <th style={{ width: "7%" }}>LR No</th>
                        <th style={{ width: "9%" }}>Consignor</th>
                        <th style={{ width: "9%" }}>Consignee</th>
                        <th style={{ width: "7%" }}>Origin</th>
                        <th style={{ width: "7%" }}>Dest.</th>
                        <th style={{ width: "4%" }}>Box</th>
                        <th style={{ width: "5%" }}>Wt.</th>
                        <th style={{ width: "10%" }}>Vehicle</th>
                        <th style={{ width: "6%" }}>Mode</th>
                        <th style={{ width: "7%", textAlign: "right" }}>Freight</th>
                        <th style={{ width: "8%" }}>Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tripListEntries && tripListEntries.length > 0 ? (
                        tripListEntries.map((item, idx) => (
                          <tr key={idx}>
                            <td className="data-cell" style={{ textAlign: "center" }}>{idx + 1}</td>
                            <td className="data-cell">{item.date ? formatDate(item.date) : "-"}</td>
                            <td className="data-cell">{(item.clientName || "-").substring(0, 15)}</td>
                            <td className="data-cell">{item.lrNo || "-"}</td>
                            <td className="data-cell">{(item.consignor || "-").substring(0, 12)}</td>
                            <td className="data-cell">{(item.consignee || "-").substring(0, 12)}</td>
                            <td className="data-cell">{(item.origin || "-").substring(0, 10)}</td>
                            <td className="data-cell">{(item.destination || "-").substring(0, 10)}</td>
                            <td className="data-cell" style={{ textAlign: "center" }}>{item.box || "-"}</td>
                            <td className="data-cell" style={{ textAlign: "center" }}>{item.weight || "-"}</td>
                            <td className="data-cell">{item.vehicleNo}<br/><span style={{ fontSize: "0.65rem", color: "#475569", fontWeight: "normal" }}>{item.vehicleType}</span></td>
                            <td className="data-cell" style={{ textAlign: "center", textTransform: "uppercase" }}>{item.mode || "-"}</td>
                            <td className="data-cell" style={{ textAlign: "right" }}>
                                {parseFloat(item.freight || 0).toFixed(2)}
                                {(parseFloat(item.paidAmount) > 0 && item.payment !== 'Paid') && (
                                    <div style={{ fontSize: "0.6rem", color: "#000", fontWeight: "normal" }}>
                                        Pd:{item.paidAmount} Rm:{(parseFloat(item.freight) || 0) - parseFloat(item.paidAmount)}
                                    </div>
                                )}
                            </td>
                            <td className="data-cell" style={{ textAlign: "center" }}>{item.payment || "-"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="14" style={{ textAlign: "center", padding: "20px" }} className="data-cell">No trip MIS entries available.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "10px 1.5rem", height: "80px" }}>
                  <div style={{ textAlign: "center", width: "250px" }}>
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
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintTripList;
