import html2pdf from "html2pdf.js";

/**
 * Generates and downloads or prints a PDF using client-side html2pdf.js.
 * No backend Puppeteer call — avoids 500 errors on servers without Chromium.
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
  clone.style.margin = "0";
  clone.style.height = "auto";
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";
  clone.style.width = landscape ? "1120px" : "750px";
  clone.style.boxSizing = "border-box";
  clone.style.padding = "0";

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

  const safeFilename = filename.replace(/[\/\\]/g, "_");
  const finalFilename = safeFilename.toLowerCase().endsWith(".pdf") ? safeFilename : `${safeFilename}.pdf`;

  // Strict boolean check so SyntheticEvents don't trigger autoPrint
  const isAutoPrint = autoPrint === true;

  try {
    const opt = {
      margin: [2, 2, 2, 2],
      filename: finalFilename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        width: landscape ? 1120 : 750,
        windowWidth: landscape ? 1120 : 750
      },
      jsPDF: { unit: "mm", format: "a4", orientation: landscape ? "landscape" : "portrait" },
      pagebreak: { mode: ['avoid-all'] }
    };

    if (isAutoPrint) {
      // Generate blob and print via hidden iframe
      const pdfBlob = await html2pdf().set(opt).from(clone).outputPdf('blob');
      const url = window.URL.createObjectURL(new Blob([pdfBlob], { type: "application/pdf" }));
      
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
          // Print dialog blocked or failed
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          window.URL.revokeObjectURL(url);
        }, 5000);
      };
    } else {
      // Direct file download
      await html2pdf().set(opt).from(clone).save();
    }
  } catch (_err) {
    alert("Failed to download PDF. Please try again.");
  }
};
