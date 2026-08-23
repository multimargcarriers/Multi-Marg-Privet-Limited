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
      margin: [14, 6, 14, 6],
      filename: finalFilename,
      image: { type: "jpeg", quality: 0.98 },
      // Force windowWidth to 1200px to ensure mobile responsive media queries do not trigger!
      html2canvas: { scale: 2, useCORS: true, logging: false, width: canvasWidth, windowWidth: 1200 },
      jsPDF: { unit: "mm", format: "a4", orientation: landscape ? "landscape" : "portrait" },
      pagebreak: { mode: ['css', 'legacy'], before: '.pdf-page-break' }
    };

    // Generate PDF and add page decorations
    const worker = html2pdf().set(opt).from(clone);
    const pdf = await worker.outputPdf('datauristring');

    // Re-generate with jsPDF access for decorations
    const pdfDoc = await worker.toPdf().get('pdf');
    const totalPages = pdfDoc.internal.getNumberOfPages();
    const pageWidth = pdfDoc.internal.pageSize.getWidth();
    const pageHeight = pdfDoc.internal.pageSize.getHeight();

    for (let i = 1; i <= totalPages; i++) {
      pdfDoc.setPage(i);

      // Draw page border (elegant double-line effect)
      pdfDoc.setDrawColor(30, 58, 138); // #1e3a8a
      pdfDoc.setLineWidth(0.5);
      pdfDoc.rect(4, 4, pageWidth - 8, pageHeight - 8);
      pdfDoc.setDrawColor(148, 163, 184); // #94a3b8
      pdfDoc.setLineWidth(0.2);
      pdfDoc.rect(5.5, 5.5, pageWidth - 11, pageHeight - 11);

      // Top header bar on every page
      pdfDoc.setFillColor(30, 58, 138);
      pdfDoc.rect(5.5, 5.5, pageWidth - 11, 8, 'F');
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setFontSize(7.5);
      pdfDoc.setTextColor(255, 255, 255);
      pdfDoc.text("MULTIMARG CARRIERS PVT. LTD.  |  STATEMENT OF ACCOUNT", 9, 10.5);
      pdfDoc.setFontSize(6.5);
      pdfDoc.text(`Page ${i} of ${totalPages}`, pageWidth - 9, 10.5, { align: "right" });

      // Bottom footer bar
      pdfDoc.setFillColor(241, 245, 249);
      pdfDoc.rect(5.5, pageHeight - 11.5, pageWidth - 11, 6, 'F');
      pdfDoc.setFontSize(5.5);
      pdfDoc.setTextColor(100, 116, 139);
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.text("Computer Generated Statement  |  Multimarg ERP System", 9, pageHeight - 7.5);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setTextColor(30, 58, 138);
      pdfDoc.text(`Page ${i} / ${totalPages}`, pageWidth - 9, pageHeight - 7.5, { align: "right" });
    }

    if (isAutoPrint) {
      const pdfBlob = pdfDoc.output('blob');
      const url = window.URL.createObjectURL(new Blob([pdfBlob], { type: "application/pdf" }));
      printFromUrl(url);
    } else {
      pdfDoc.save(finalFilename);
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
    margin: [14, 6, 14, 6],
    image: { type: "jpeg", quality: 0.98 },
    // Force windowWidth to 1200px to bypass mobile responsive media queries completely!
    html2canvas: { scale: 2, useCORS: true, logging: false, width: canvasWidth, windowWidth: 1200 },
    jsPDF: { unit: "mm", format: "a4", orientation: landscape ? "landscape" : "portrait" },
    pagebreak: { mode: ['css', 'legacy'], before: '.pdf-page-break' }
  };
  
  const worker = html2pdf().set(opt).from(clone);
  const pdfDoc = await worker.toPdf().get('pdf');
  const totalPages = pdfDoc.internal.getNumberOfPages();
  const pageWidth = pdfDoc.internal.pageSize.getWidth();
  const pageHeight = pdfDoc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    pdfDoc.setPage(i);
    // Page border
    pdfDoc.setDrawColor(30, 58, 138);
    pdfDoc.setLineWidth(0.5);
    pdfDoc.rect(4, 4, pageWidth - 8, pageHeight - 8);
    pdfDoc.setDrawColor(148, 163, 184);
    pdfDoc.setLineWidth(0.2);
    pdfDoc.rect(5.5, 5.5, pageWidth - 11, pageHeight - 11);
    // Top header
    pdfDoc.setFillColor(30, 58, 138);
    pdfDoc.rect(5.5, 5.5, pageWidth - 11, 8, 'F');
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.setFontSize(7.5);
    pdfDoc.setTextColor(255, 255, 255);
    pdfDoc.text("MULTIMARG CARRIERS PVT. LTD.  |  STATEMENT OF ACCOUNT", 9, 10.5);
    pdfDoc.setFontSize(6.5);
    pdfDoc.text(`Page ${i} of ${totalPages}`, pageWidth - 9, 10.5, { align: "right" });
    // Bottom footer
    pdfDoc.setFillColor(241, 245, 249);
    pdfDoc.rect(5.5, pageHeight - 11.5, pageWidth - 11, 6, 'F');
    pdfDoc.setFontSize(5.5);
    pdfDoc.setTextColor(100, 116, 139);
    pdfDoc.setFont("helvetica", "normal");
    pdfDoc.text("Computer Generated Statement  |  Multimarg ERP System", 9, pageHeight - 7.5);
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.setTextColor(30, 58, 138);
    pdfDoc.text(`Page ${i} / ${totalPages}`, pageWidth - 9, pageHeight - 7.5, { align: "right" });
  }

  const pdfOutput = pdfDoc.output('datauristring');
  return pdfOutput.split(';base64,')[1];
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
