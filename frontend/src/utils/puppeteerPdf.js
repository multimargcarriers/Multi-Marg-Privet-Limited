/**
 * Generates and downloads/prints a PDF using client-side html2pdf.js.
 * 
 * Strategy:
 * - Render locally on client browser (works everywhere, no backend Chromium dependency)
 * - Force windowWidth to 1200px to bypass mobile media queries (<768px) and ensure desktop layout is preserved on any device
 */

export const downloadViaPuppeteer = async ({
  elementId,
  filename = "document.pdf",
  landscape = false,
  autoPrint = false,
  width = null
}) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found`);
    return;
  }

  const cloneWidth = width || (landscape ? "1120px" : "750px");
  const canvasWidth = parseInt(cloneWidth);

  const clone = element.cloneNode(true);
  clone.style.transform = "none";
  clone.style.position = "static";
  clone.style.margin = "0";
  clone.style.height = "auto";
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";
  clone.style.width = cloneWidth;
  clone.style.boxSizing = "border-box";
  clone.style.padding = element.style.padding || "0";

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

  const safeFilename = filename.replace(/[\/\\]/g, "_");
  const finalFilename = safeFilename.toLowerCase().endsWith(".pdf") ? safeFilename : `${safeFilename}.pdf`;
  const isAutoPrint = autoPrint === true;

  try {
    const html2pdf = (await import("html2pdf.js")).default;
    const opt = {
      margin: [2, 2, 2, 2],
      filename: finalFilename,
      image: { type: "jpeg", quality: 0.98 },
      // Force windowWidth to 1200px to ensure mobile responsive media queries do not trigger!
      html2canvas: { scale: 2, useCORS: true, logging: false, width: canvasWidth, windowWidth: 1200 },
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
  } catch (err) {
    console.error("PDF generation failed:", err);
    try {
      window.dispatchEvent(new CustomEvent('app-toast', { 
        detail: { message: "Failed to generate PDF. Please try again.", type: "error" } 
      }));
    } catch (_e) {}
    throw err;
  }
};

/**
 * Generates base64 encoded PDF string using client-side html2pdf.js.
 * Forced to render with 1200px windowWidth to bypass mobile media queries.
 */
export const getPdfBase64ViaPuppeteer = async ({
  elementId,
  landscape = false,
  width = null
}) => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element #${elementId} not found`);
  }

  const cloneWidth = width || (landscape ? "1120px" : "750px");
  const canvasWidth = parseInt(cloneWidth);

  const clone = element.cloneNode(true);
  clone.style.transform = "none";
  clone.style.position = "static";
  clone.style.margin = "0";
  clone.style.height = "auto";
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";
  clone.style.width = cloneWidth;
  clone.style.boxSizing = "border-box";
  clone.style.padding = element.style.padding || "0";

  // Convert canvas elements to images
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

  const html2pdf = (await import("html2pdf.js")).default;
  const opt = {
    margin: [2, 2, 2, 2],
    image: { type: "jpeg", quality: 0.98 },
    // Force windowWidth to 1200px to bypass mobile responsive media queries completely!
    html2canvas: { scale: 2, useCORS: true, logging: false, width: canvasWidth, windowWidth: 1200 },
    jsPDF: { unit: "mm", format: "a4", orientation: landscape ? "landscape" : "portrait" },
    pagebreak: { mode: ['avoid-all'] }
  };
  const dataUri = await html2pdf().set(opt).from(clone).outputPdf('datauristring');
  return dataUri.split(';base64,')[1];
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
