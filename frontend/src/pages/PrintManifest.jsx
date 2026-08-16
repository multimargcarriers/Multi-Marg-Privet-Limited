import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Download, ArrowLeft } from "lucide-react";

import html2pdf from "html2pdf.js";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { formatDate } from "../utils/formatters";
import appDB from "../utils/appDB";

const _API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const PrintManifest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const [signName, setSignName] = useState(user?.name || "Admin");
  const [scale, setScale] = useState(1);
  const containerRef = React.useRef(null);

  const handleBack = () => {
    window.close();
    navigate("/trips");
  };

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
    if (user?.name) setSignName(user.name);
  }, [user]);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const res = await axios.get(`${_API}/trips`);
        if (res.data.success) {
          const foundTrip = res.data.data.find(t => t.id === id);
          if (foundTrip) {
            setTrip(foundTrip);
          } else {
            console.error("Manifest not found on server");
          }
        }
      } catch (err) {
        console.error("Failed to fetch manifest", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [id]);

  useEffect(() => {
    if (trip) {
      const params = new URLSearchParams(location.search);
      if (params.get("download") === "true") {
        setTimeout(() => {
          handleDownloadPDF();
        }, 800);
      }
    }
  }, [trip, location]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>Loading Manifest...</div>;
  if (!trip) return <div style={{ padding: "2rem", textAlign: "center" }}><h3>Trip not found.</h3><button className="btn btn-primary mt-3" onClick={handleBack}>Go Back</button></div>;

  const handleDownloadPDF = async () => {
    const manifestNo = (trip?.trip || trip?.tripNo || trip?.id?.slice(-6) || id).toString().trim().toUpperCase();
    const origin = (trip?.origin || "").toString().trim().toUpperCase();
    const dest = (trip?.destination || "").toString().trim().toUpperCase();
    const routeStr = (origin && dest) ? `${origin} TO ${dest}` : (origin || dest || "");
    const vehicle = (trip?.vehicleNo || trip?.truckNo || "").toString().trim().toUpperCase();
    const filename = `MANIFEST ${manifestNo}${routeStr ? " - " + routeStr : ""}${vehicle ? " - " + vehicle : ""}.pdf`;

    await downloadViaPuppeteer({
      elementId: "manifest-content",
      filename,
      landscape: false
    });
  };

  const tripNo = trip.trip || trip.tripNo || trip.id.slice(-6);
  const date = trip.date ? formatDate(trip.date) : formatDate(new Date());

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
          @page { size: A4 portrait; margin: 8mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 800px !important; max-width: 800px !important; min-width: 800px !important; transform: none !important; margin: 0; padding: 0; background: white !important; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
          .manifest-table th, .manifest-table td { border-color: #cbd5e1 !important; color: #0f172a !important; }
          .section-header { 
             background-color: transparent !important;
             color: #1e293b !important;
             border-bottom: 1.5px solid #cbd5e1 !important;
             padding-left: 2px !important;
             padding-bottom: 2px !important;
          }
          .gray-cell { background-color: #f8fafc !important; color: #0f172a !important; font-weight: 700 !important; }
          .premium-border { border-color: #1e293b !important; }
        }
        .manifest-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
        .manifest-table th, .manifest-table td { border: 1px solid #cbd5e1; padding: 4px 8px; color: #0f172a; }
        .gray-cell { background-color: #f8fafc; color: #0f172a; font-weight: 700; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px; }
        .data-cell { font-weight: 600; color: #0f172a; font-size: 0.8rem; }
        .section-header {
          background-color: transparent;
          color: #1e293b;
          padding: 4px 2px 4px;
          font-weight: 700;
          font-size: 0.8rem;
          letter-spacing: 1px;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          border-bottom: 1.5px solid #cbd5e1;
          margin-bottom: 4px;
        }
        .manifest-section { margin-bottom: 0px; }
        .blue-text { color: #1e3a8a; }
        .premium-border { border: 2px solid #1e293b; }
      `}</style>

      <div className="no-print" style={{ maxWidth: "800px", margin: "0 auto 1rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
        <button className="btn" style={{ background: "white", border: "1px solid #cbd5e1", color: "#475569", fontWeight: 600 }} onClick={handleBack}>
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
            <Download size={18} className="mr-2" /> Download PDF Manifest
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", overflow: "hidden", width: "100%", paddingBottom: "2rem" }}>
        <div style={{ width: `${780 * scale}px`, height: `${1131 * scale}px`, position: "relative" }}>
          <div id="manifest-content" className="print-container" style={{
            width: "780px", height: "auto", minHeight: "0", background: "white", color: "#0f172a", boxSizing: "border-box", padding: "10px", overflow: "hidden",
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
            <div className="premium-border" style={{ height: "auto", minHeight: "1010px", position: "relative", display: "flex", flexDirection: "column" }}>

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

                <div style={{ background: "#f8fafc", padding: "4px", textAlign: "center", borderBottom: "1px solid #cbd5e1" }}>
                  <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#0f172a", letterSpacing: "2px", textTransform: "uppercase" }}>TRIP {trip.mode || "NA"} {trip.type || ""}</h2>
                </div>

                <div className="manifest-section">
                  <div className="section-header">1. Trip Details</div>
                  <table className="manifest-table">
                    <tbody>
                      <tr>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>SL NO.</td>
                        <td className="data-cell" style={{ width: "25%", color: "#ef4444", fontSize: "1rem", fontWeight: "bold" }}>{(trip.tripNo || "-").toUpperCase()}</td>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>DATE</td>
                        <td className="data-cell" style={{ width: "15%" }}>{date}</td>
                        <td className="gray-cell" style={{ width: "10%", textAlign: "center" }}>MODE</td>
                        <td className="data-cell" style={{ width: "20%" }}>{(trip.mode || "NA").toUpperCase()}</td>
                      </tr>
                      <tr>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>{trip.mode === 'AIR' ? 'FLIGHT NO.' : trip.mode === 'TRAIN' ? 'TRAIN NO.' : 'VEHICLE NO.'}</td>
                        <td className="data-cell" colSpan="5" style={{ fontSize: "1rem", fontWeight: "bold" }}>{(trip.vehicleNo || "NA").toUpperCase()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="manifest-section">
                  <div className="section-header">2. Documentation & Vendor Details</div>
                  <table className="manifest-table">
                    <tbody>
                      <tr>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>AWB NO.</td>
                        <td className="data-cell" style={{ width: "35%" }}>{(trip.awbNo || "NA").toUpperCase()}</td>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>CD NO.</td>
                        <td className="data-cell" style={{ width: "35%" }}>{(trip.cdNo || "NA").toUpperCase()}</td>
                      </tr>
                      <tr>
                        <td className="gray-cell" style={{ textAlign: "center" }}>VENDOR</td>
                        <td className="data-cell" colSpan="3">{(trip.vendor || "NA").toUpperCase()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="manifest-section">
                  <div className="section-header">3. Routing Details</div>
                  <table className="manifest-table">
                    <tbody>
                      <tr>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>ORIGIN</td>
                        <td className="data-cell" style={{ width: "35%" }}>{(trip.origin || "NA").toUpperCase()}</td>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>DESTINATION</td>
                        <td className="data-cell" style={{ width: "35%" }}>{(trip.destination || "NA").toUpperCase()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="manifest-section" style={{ flex: 1 }}>
                  <div className="section-header">4. Shipment Items</div>
                  <table className="manifest-table">
                    <thead>
                      <tr className="gray-cell">
                        <th style={{ width: "5%" }}>#</th>
                        <th style={{ width: "20%" }}>Client</th>
                        <th style={{ width: "15%" }}>LR No</th>
                        <th style={{ width: "15%" }}>Origin</th>
                        <th style={{ width: "15%" }}>Destination</th>
                        <th style={{ width: "10%" }}>Box</th>
                        <th style={{ width: "10%" }}>Weight</th>
                        <th style={{ width: "10%" }}>Ch. Wt.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trip.materialDetails && trip.materialDetails.length > 0 ? (
                        trip.materialDetails.map((mat, idx) => (
                          <tr key={idx}>
                            <td className="data-cell" style={{ textAlign: "center" }}>{idx + 1}</td>
                            <td className="data-cell">{(mat.clientName || "-").substring(0, 20)}</td>
                            <td className="data-cell">{mat.lrNo || "-"}</td>
                            <td className="data-cell">{(mat.origin || "-").substring(0, 15)}</td>
                            <td className="data-cell">{(mat.destination || "-").substring(0, 15)}</td>
                            <td className="data-cell" style={{ textAlign: "center" }}>{mat.box || "-"}</td>
                            <td className="data-cell" style={{ textAlign: "center" }}>{mat.weight || "-"}</td>
                            <td className="data-cell" style={{ textAlign: "center" }}>{mat.chWeight || "-"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="8" style={{ textAlign: "center", padding: "20px" }} className="data-cell">No shipment items available.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ padding: "8px 15px", borderTop: "2px solid #1e293b", background: "#f8fafc", fontSize: "0.7rem", color: "#475569", lineHeight: "1.3" }}>
                  <span className="gray-cell" style={{ padding: "2px 6px", marginRight: "6px" }}>NOTE</span>
                  Quantity and quality not checked. We are not responsible for leakage &amp; damage. Subject to Uttarakhand jurisdiction only.
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

                  <div style={{ textAlign: "center", width: "200px" }}>
                    <div style={{ height: "40px", marginBottom: "5px" }}></div>
                    <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "5px", fontSize: "0.75rem", fontWeight: "600", color: "#475569" }}>
                      DRIVER'S SIGNATURE
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

export default PrintManifest;
