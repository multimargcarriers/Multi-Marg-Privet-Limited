
/**
 * Generates and downloads/prints a PDF.
 * 
 * Strategy:
 * 1. PRIMARY: Backend Puppeteer (vector PDF — selectable text, small file size, print-quality)
 * 2. FALLBACK: Client-side html2pdf.js (raster PDF — works everywhere, no backend dependency)
 * 
 * Uses fetch() instead of axios to avoid browser console 500 error logging.
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
  clone.style.margin = "0";
  clone.style.height = "auto";
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";
  clone.style.width = landscape ? "1120px" : "750px";
  clone.style.boxSizing = "border-box";
  clone.style.padding = "0";

  // Convert canvas elements (QR codes, signatures) into <img> PNG Data URLs
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

  // Extract all page style blocks for backend rendering
  const pageStyles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
    .map(el => el.outerHTML)
    .join("\n");

  const safeFilename = filename.replace(/[\/\\]/g, "_");
  const finalFilename = safeFilename.toLowerCase().endsWith(".pdf") ? safeFilename : `${safeFilename}.pdf`;
  const isAutoPrint = autoPrint === true;

  // Build full HTML document for backend Puppeteer
  const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${pageStyles}
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
    * { box-sizing: border-box !important; }
    body, div, span, p, td, th, label, h1, h2, h3, h4, h5, h6, b, strong, tr, table { 
      text-transform: uppercase !important; 
    }
    a, a *, .no-transform, .no-transform * {
      text-transform: lowercase !important;
      text-decoration: none !important;
      color: inherit !important;
    }
    body { 
      margin: 0 !important; padding: 0 !important; 
      background: #fff !important; color: #0f172a !important; 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
      font-family: 'Outfit', sans-serif !important;
    }
    .no-print { display: none !important; }
    .print-container, .tax-invoice-sheet, .print-wrapper { 
      max-width: none !important; min-width: 0 !important; 
      width: 100% !important; height: auto !important;
      transform: none !important; box-shadow: none !important; 
      border: none !important; margin: 0 !important; 
      padding: 0 !important; overflow: visible !important; 
    }
    table { width: 100% !important; }
    th, td { word-break: break-word !important; }
    svg, canvas, img { display: inline-block !important; max-width: 100% !important; }
    @page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 3mm; }
    @media print {
      html, body { height: 100% !important; overflow: hidden !important; }
      .print-container { page-break-after: avoid !important; page-break-inside: avoid !important; height: auto !important; min-height: 0 !important; }
    }
  </style>
</head>
<body>${clone.outerHTML}</body>
</html>`;

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const token = localStorage.getItem("token");

  // --- 1. Try Backend Puppeteer (vector PDF, selectable text, small size) ---
  let puppeteerOk = false;
  try {
    const res = await fetch(`${API_URL}/api/print/generate-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ html: fullHTML, filename: safeFilename, landscape })
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      puppeteerOk = true;

      if (isAutoPrint) {
        printFromUrl(url);
      } else {
        downloadFromUrl(url, finalFilename);
      }
    }
  } catch (_e) {
    // Backend unreachable — silently fall through to html2pdf
  }

  // --- 2. Fallback: Client-side html2pdf.js (raster, works everywhere) ---
  if (!puppeteerOk) {
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: [2, 2, 2, 2],
        filename: finalFilename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, width: landscape ? 1120 : 750, windowWidth: landscape ? 1120 : 750 },
        jsPDF: { unit: "mm", format: "a4", orientation: landscape ? "landscape" : "portrait" },
        pagebreak: { mode: ['avoid-all'] }
      };

      if (isAutoPrint) {
        const pdfBlob = await html2pdf().set(opt).from(clone).outputPdf('blob');
        const url = window.URL.createObjectURL(new Blob([pdfBlob], { type: "application/pdf" }));
        printFromUrl(url);
      } else {
        await html2pdf().set(opt).from(clone).save();
      }
    } catch (_fallbackErr) {
      alert("Failed to download PDF. Please try again.");
    }
  }
};

// --- Helper: Download a blob URL as a file ---
function downloadFromUrl(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.contains(link) && document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 5000);
}

// --- Helper: Print a PDF from a blob URL via hidden iframe ---
function printFromUrl(url) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:none;";
  iframe.src = url;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (_e) {}
    setTimeout(() => {
      document.body.contains(iframe) && document.body.removeChild(iframe);
      window.URL.revokeObjectURL(url);
    }, 5000);
  };
}
