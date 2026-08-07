import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Download, ArrowLeft } from "lucide-react";
import html2pdf from "html2pdf.js";
import { AuthContext } from "../context/AuthContext";
import { formatDate } from "../utils/formatters";

const PrintTripList = () => {
  const navigate = useNavigate();
  const _location = useLocation();
  const { user } = useContext(AuthContext);
  const [signName, setSignName] = useState(user?.name || "Admin");
  const [scale, setScale] = useState(1);
  const [tripListEntries, setTripListEntries] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("tripListEntries");
    if (saved) {
      setTripListEntries(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1150) {
        setScale((window.innerWidth - 32) / 1122);
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
    const element = document.getElementById("trip-list-content");
    const clone = element.cloneNode(true);
    clone.style.transform = "none";
    clone.style.position = "fixed";
    clone.style.top = "0";
    clone.style.left = "0";
    clone.style.zIndex = "-9999";
    clone.style.width = "1122px";
    clone.style.height = "794px";
    
    const wrapper = document.createElement("div");
    wrapper.className = "print-wrapper";
    wrapper.style.position = "fixed";
    wrapper.style.top = "0";
    wrapper.style.left = "-9999px";
    wrapper.style.width = "1122px";
    wrapper.style.height = "794px";
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    setTimeout(() => {
      const opt = {
        margin: 0,
        filename: `Trip_List_${formatDate(new Date())}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true, width: 1122, height: 794, windowWidth: 1122, scrollY: 0, scrollX: 0 },
        jsPDF: { unit: 'px', format: [1122, 794], orientation: 'landscape' }
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
        
        .print-wrapper { font-family: 'Outfit', sans-serif; }
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 1122px !important; max-width: 1122px !important; min-width: 1122px !important; margin: 0; padding: 0; background: white !important; box-shadow: none !important; border: none !important; }
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
          <button className="btn btn-primary" style={{ fontWeight: 600, background: "#1e293b", border: "none" }} onClick={handleDownloadPDF}>
            <Download size={18} className="mr-2" /> Download PDF Trip MIS
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", overflow: "hidden", width: "100%", paddingBottom: "2rem" }}>
        <div style={{ width: `${1122 * scale}px`, height: `${794 * scale}px`, position: "relative" }}>
          <div id="trip-list-content" className="print-container" style={{ 
            width: "1122px", height: "794px", background: "white", color: "#0f172a", boxSizing: "border-box", padding: "10px", overflow: "hidden",
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
