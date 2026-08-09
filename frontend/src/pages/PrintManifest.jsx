import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Download, ArrowLeft } from "lucide-react";

import html2pdf from "html2pdf.js";
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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 850) {
        setScale((window.innerWidth - 32) / 800);
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

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const localTrips = appDB.memGet('mockTrips') || [];
        const foundTrip = localTrips.find(t => t.id === id);
        if (foundTrip) {
          setTrip(foundTrip);
        } else {
          console.error("Manifest not found locally");
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
  if (!trip) return <div style={{ padding: "2rem", textAlign: "center" }}><h3>Trip not found.</h3><button className="btn btn-primary mt-3" onClick={() => navigate("/trips")}>Go Back</button></div>;

  const handleDownloadPDF = () => {
    window.scrollTo(0, 0);
    const element = document.getElementById("manifest-content");
    const clone = element.cloneNode(true);
    clone.style.transform = "none";
    clone.style.position = "fixed";
    clone.style.top = "0";
    clone.style.left = "0";
    clone.style.zIndex = "-9999";
    clone.style.width = "800px";
    clone.style.height = "1131px";
    
    const wrapper = document.createElement("div");
    wrapper.className = "print-wrapper";
    wrapper.style.position = "fixed";
    wrapper.style.top = "0";
    wrapper.style.left = "-9999px";
    wrapper.style.width = "800px";
    wrapper.style.height = "1131px";
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    setTimeout(() => {
      const originStr = trip?.origin ? ` - ${trip.origin.toUpperCase()}` : '';
      const destStr = trip?.destination ? ` - ${trip.destination.toUpperCase()}` : '';
      const nameStr = trip?.clientName ? ` - ${trip.clientName.toUpperCase()}` : '';

      const opt = {
        margin: 0,
        filename: `MANIFEST ${trip.trip || trip.tripNo || trip.id.slice(-6)}${originStr}${destStr}${nameStr}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true, width: 800, height: 1131, windowWidth: 800, scrollY: 0, scrollX: 0 },
        jsPDF: { unit: 'px', format: [800, 1131], orientation: 'portrait' }
      };
      
      html2pdf().set(opt).from(clone).save().then(() => {
        document.body.removeChild(wrapper);
      }).catch(err => {
        console.error("PDF generation failed:", err);
        document.body.removeChild(wrapper);
      });
    }, 300);
  };

  const tripNo = trip.trip || trip.tripNo || trip.id.slice(-6);
  const date = trip.date ? formatDate(trip.date) : formatDate(new Date());

  return (
    <div style={{ background: "#e2e8f0", minHeight: "100vh", padding: "2rem" }} className="print-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
        
        .print-wrapper { font-family: 'Outfit', sans-serif; }
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 800px !important; max-width: 800px !important; min-width: 800px !important; margin: 0; padding: 0; background: white !important; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
          .manifest-table th, .manifest-table td { border-color: #cbd5e1 !important; color: #0f172a !important; }
          .section-header { background-color: #1e293b !important; color: white !important; }
          .gray-cell { background-color: #f1f5f9 !important; }
          .premium-border { border-color: #1e293b !important; }
        }
        .manifest-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
        .manifest-table th, .manifest-table td { border: 1px solid #cbd5e1; padding: 4px 8px; color: #0f172a; }
        .gray-cell { background-color: #f8fafc; color: #475569; font-weight: 500; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px; }
        .data-cell { font-weight: 600; color: #0f172a; font-size: 0.8rem; }
        .section-header { background-color: #1e293b; color: #ffffff; padding: 4px 10px; font-weight: 600; font-size: 0.8rem; letter-spacing: 1px; text-transform: uppercase; display: flex; align-items: center; }
        .manifest-section { margin-bottom: 0px; }
        .blue-text { color: #1e3a8a; }
        .premium-border { border: 2px solid #1e293b; }
      `}</style>

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
            <Download size={18} className="mr-2" /> Download PDF Manifest
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", overflow: "hidden", width: "100%", paddingBottom: "2rem" }}>
        <div style={{ width: `${800 * scale}px`, height: `${1131 * scale}px`, position: "relative" }}>
          <div id="manifest-content" className="print-container" style={{ 
            width: "800px", height: "1131px", background: "white", color: "#0f172a", boxSizing: "border-box", padding: "10px", overflow: "hidden",
            transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0
          }}>
            <div className="premium-border" style={{ height: "100%", position: "relative", display: "flex", flexDirection: "column" }}>
              
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: "none", display: "flex", justifyContent: "center", alignItems: "center" }}>
                 <img src="/mc.png" alt="Watermark" style={{ width: "400px", opacity: 0.05 }} />
              </div>
      
              <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 1.5rem", borderBottom: "2px solid #1e293b" }}>
                  <div style={{ width: "120px", flexShrink: 0 }}><img src="/mc.png" alt="Multimarg Carriers" style={{ width: "100%", height: "auto" }} /></div>
                  <div style={{ textAlign: "center", flex: 1, padding: "0 15px", minWidth: 0 }}>
                    <h1 className="blue-text" style={{ margin: "0 0 2px", fontSize: "1.5rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>MULTIMARG CARRIERS PVT. LTD.</h1>
                    <p style={{ margin: "0 0 2px", fontSize: "0.85rem", fontWeight: "600", color: "#334155" }}>PREMIER LOGISTICS & TRANSPORTATION SERVICES</p>
                    <p style={{ margin: "2px 0 2px", fontSize: "0.75rem", fontWeight: "500", color: "#475569" }}>LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND-263153</p>
                    <div style={{ display: "flex", justifyContent: "center", gap: "15px", margin: "4px 0 0", fontSize: "0.75rem", fontWeight: "600", color: "#334155" }}>
                      <span>Contact: +91 5944-324033</span><span>|</span><span>info@multimargcarriers.co.in</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: "15px", margin: "2px 0 0", fontSize: "0.75rem", fontWeight: "700", color: "#0f172a" }}>
                      <span>GST: 05AANCM3054E1ZN</span><span>|</span><span>PAN: AANCM3054E1ZN</span>
                    </div>
                  </div>
                  <div style={{ width: "120px", flexShrink: 0 }}></div>
                </div>

                <div style={{ background: "#f8fafc", padding: "4px", textAlign: "center", borderBottom: "1px solid #cbd5e1" }}>
                  <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#0f172a", letterSpacing: "2px", textTransform: "uppercase" }}>TRIP AIR / FLIGHT EXPRESS</h2>
                </div>

                <div className="manifest-section">
                  <div className="section-header">1. Trip Details</div>
                  <table className="manifest-table">
                    <tbody>
                      <tr>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>FLIGHT NO.</td>
                        <td className="data-cell" style={{ width: "25%", color: "#ef4444", fontSize: "1rem" }}>{(trip.tripNo || tripNo).toUpperCase()}</td>
                        <td className="gray-cell" style={{ width: "15%", textAlign: "center" }}>DATE</td>
                        <td className="data-cell" style={{ width: "15%" }}>{date}</td>
                        <td className="gray-cell" style={{ width: "10%", textAlign: "center" }}>MODE</td>
                        <td className="data-cell" style={{ width: "20%" }}>{(trip.mode || "NA").toUpperCase()}</td>
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
                        <th style={{ width: "4%" }}>#</th>
                        <th style={{ width: "16%" }}>Client</th>
                        <th style={{ width: "10%" }}>LR No</th>
                        <th style={{ width: "15%" }}>Consignor</th>
                        <th style={{ width: "15%" }}>Consignee</th>
                        <th style={{ width: "6%" }}>Box</th>
                        <th style={{ width: "8%" }}>Wt.</th>
                        <th style={{ width: "9%" }}>Type</th>
                        <th style={{ width: "8%", textAlign: "right" }}>Amount</th>
                        <th style={{ width: "9%" }}>P. Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trip.materialDetails && trip.materialDetails.length > 0 ? (
                        trip.materialDetails.map((mat, idx) => (
                          <tr key={idx}>
                            <td className="data-cell" style={{ textAlign: "center" }}>{idx + 1}</td>
                            <td className="data-cell">{(mat.clientName || "-").substring(0, 15)}</td>
                            <td className="data-cell">{mat.lrNo || "-"}</td>
                            <td className="data-cell">{(mat.consignor || "-").substring(0, 15)}</td>
                            <td className="data-cell">{(mat.consignee || "-").substring(0, 15)}</td>
                            <td className="data-cell" style={{ textAlign: "center" }}>{mat.box || "-"}</td>
                            <td className="data-cell" style={{ textAlign: "center" }}>{mat.weight || "-"}</td>
                            <td className="data-cell" style={{ textAlign: "center" }}>{mat.bookingType || "-"}</td>
                            <td className="data-cell" style={{ textAlign: "right" }}>{parseFloat(mat.amount || 0).toFixed(2)}</td>
                            <td className="data-cell" style={{ textAlign: "center" }}>{mat.paymentType || "-"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="10" style={{ textAlign: "center", padding: "20px" }} className="data-cell">No shipment items available.</td></tr>
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
