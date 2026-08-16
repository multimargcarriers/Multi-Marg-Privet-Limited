import axios from "axios";

/**
 * Generates and downloads or prints a vector PDF via backend Puppeteer service.
 * @param {Object} params
 * @param {string} params.elementId - DOM ID of the element to print
 * @param {string} params.filename - Desired PDF filename
 * @param {boolean} [params.landscape=false] - Whether PDF is landscape
 * @param {boolean} [params.autoPrint=false] - Whether to trigger print dialog
 */
export const downloadViaPuppeteer = async ({
  elementId,
  filename = "document.pdf",
  landscape = false,
  autoPrint = false
}) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found`);
    return;
  }

  const clone = element.cloneNode(true);
  clone.style.transform = "none";
  clone.style.position = "static";
  clone.style.margin = "0 auto";
  clone.style.height = "auto";
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";

  // Convert canvas elements (QR codes, signatures, barcodes) into <img> PNG Data URLs
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

  // Extract all page style blocks so all custom CSS classes (.section-header, .gray-cell, etc.) are preserved
  const pageStyles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
    .map(el => el.outerHTML)
    .join("\n");

  const safeFilename = filename.replace(/[\/\\]/g, "_");

  const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${pageStyles}
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');

    * { 
      box-sizing: border-box !important; 
    }
    body, div, span, p, td, th, label, h1, h2, h3, h4, h5, h6, b, strong, tr, table { 
      text-transform: uppercase !important; 
    }
    a, a *, .no-transform, .no-transform * {
      text-transform: lowercase !important;
      text-decoration: none !important;
      color: inherit !important;
    }
    body { 
      margin: 0 !important; 
      padding: 0 !important; 
      background: #ffffff !important; 
      color: #0f172a !important; 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
      font-family: 'Outfit', sans-serif !important;
    }
    .no-print { display: none !important; }
    .print-container, 
    .tax-invoice-sheet, 
    .print-wrapper { 
      max-width: none !important; 
      min-width: 0 !important; 
      width: 100% !important; 
      height: auto !important;
      transform: none !important; 
      box-shadow: none !important; 
      border: none !important; 
      margin: 0 !important; 
      padding: 0 !important; 
      overflow: visible !important; 
    }
    table { 
      width: 100% !important; 
      min-width: 100% !important; 
      max-width: 100% !important; 
    }
    th, td { 
      word-break: break-word !important; 
    }
    svg, canvas { 
      display: inline-block !important; 
      max-width: 100% !important; 
    }
    img {
      display: inline-block !important;
      max-width: 100% !important;
    }
    @page { 
      size: A4 ${landscape ? "landscape" : "portrait"}; 
      margin: 3mm; 
    }
    @media print {
      html, body {
        height: 100% !important;
        overflow: hidden !important;
      }
      .print-container {
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
        height: auto !important;
        min-height: 0 !important;
      }
    }
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`;

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const token = localStorage.getItem("token");
  const finalFilename = safeFilename.toLowerCase().endsWith(".pdf") ? safeFilename : `${safeFilename}.pdf`;

  try {
    const res = await axios.post(
      `${API_URL}/api/print/generate-pdf`,
      { html: fullHTML, filename: safeFilename, landscape },
      { 
        responseType: "blob",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    );

    // res.data is ALREADY the raw PDF Blob object from Axios
    const blob = res.data instanceof Blob 
      ? res.data 
      : new Blob([res.data], { type: "application/pdf" });
      
    const url = window.URL.createObjectURL(blob);

    // Strict boolean check so SyntheticEvents don't trigger autoPrint
    const isAutoPrint = autoPrint === true;

    if (isAutoPrint) {
      // Print via hidden iframe
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (err) {
          console.error("Print error:", err);
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          window.URL.revokeObjectURL(url);
        }, 5000);
      };
    } else {
      // Direct file download to user's Downloads folder
      const link = document.createElement("a");
      link.href = url;
      link.download = finalFilename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
      }, 5000);
    }
  } catch (_err) {
    // Silently fall back to client-side html2pdf.js when backend PDF endpoint is unavailable or returns 500
    try {
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;
      const opt = {
        margin: landscape ? [3, 3, 3, 3] : [3, 3, 3, 3],
        filename: finalFilename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: landscape ? "landscape" : "portrait" }
      };
      await html2pdf().set(opt).from(clone).save();
    } catch (fallbackErr) {
      console.error("Both backend and client-side PDF generation failed:", fallbackErr);
      alert("Failed to download PDF. Please try again.");
    }
  }
};
