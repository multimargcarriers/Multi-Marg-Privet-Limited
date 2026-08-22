const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

// Helper functions to dynamically load images from backend/public folder into Base64 strings on demand.
// This guarantees that any changes to assets (such as transparency updates) take effect immediately.
function getMcLogoBase64() {
  try {
    const mcPath = path.join(__dirname, '../../public/mc.png');
    const fallbackMcPath = path.join(__dirname, '../../../frontend/public/mc.png');
    const targetPath = fs.existsSync(mcPath) ? mcPath : (fs.existsSync(fallbackMcPath) ? fallbackMcPath : null);
    if (targetPath) {
      return `data:image/png;base64,${fs.readFileSync(targetPath).toString('base64')}`;
    }
  } catch (e) {
    console.error("Failed to load mc.png logo:", e);
  }
  return '';
}

function getPrimeLogoBase64() {
  try {
    const primePath = path.join(__dirname, '../../public/Prime RoadWAYS.png');
    const fallbackPrimePath = path.join(__dirname, '../../../frontend/public/Prime RoadWAYS.png');
    const targetPath = fs.existsSync(primePath) ? primePath : (fs.existsSync(fallbackPrimePath) ? fallbackPrimePath : null);
    if (targetPath) {
      return `data:image/png;base64,${fs.readFileSync(targetPath).toString('base64')}`;
    }
  } catch (e) {
    console.error("Failed to load Prime RoadWAYS.png logo:", e);
  }
  return '';
}

function getFabStampBase64() {
  try {
    const fabPath = path.join(__dirname, '../../public/fab.png');
    const fallbackFabPath = path.join(__dirname, '../../../frontend/public/fab.png');
    const targetPath = fs.existsSync(fabPath) ? fabPath : (fs.existsSync(fallbackFabPath) ? fallbackFabPath : null);
    if (targetPath) {
      return `data:image/png;base64,${fs.readFileSync(targetPath).toString('base64')}`;
    }
  } catch (e) {
    console.error("Failed to load fab.png stamp:", e);
  }
  return '';
}

// --- Chromium availability check (runs once at startup) ---
let chromiumAvailable = null; // null = not checked yet, true/false after check

async function checkChromiumAvailability() {
  if (chromiumAvailable !== null) return chromiumAvailable;
  let browser;
  try {
    browser = await launchBrowser();
    chromiumAvailable = true;
    console.log('✅ Puppeteer Chromium is available — vector PDF generation enabled');
  } catch (e) {
    chromiumAvailable = false;
    console.log(`⚠️ Puppeteer Chromium not available: ${e.message} — PDF generation will fallback/fail.`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        // Ignore close/unlink errors during initial check
      }
    }
  }
  return chromiumAvailable;
}

function getExecutablePath() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  const possibleExecutablePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    // Windows paths
    path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
    path.join(programFiles, 'Microsoft\\Edge\\Application\\msedge.exe'),
    localAppData ? path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe') : null,
    // Linux / Mac paths
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium'
  ].filter(Boolean);

  return possibleExecutablePaths.find(p => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  }) || undefined;
}

function launchBrowser() {
  const executablePath = getExecutablePath();
  return puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-default-browser-check',
      '--font-render-hinting=none'
    ],
    ...(executablePath ? { executablePath } : {})
  });
}

/**
 * Generates an optimized vector PDF buffer from an HTML string using Puppeteer.
 * - Text is fully selectable and searchable
 * - File size is minimal (vector, not raster)
 * - All local images are embedded as base64
 * @param {string} htmlContent - The HTML string to convert to PDF.
 * @param {Object} options - PDF generation options.
 * @returns {Promise<Buffer>} - The generated PDF buffer.
 */
async function generatePDF(htmlContent, options = {}) {
  let browser;
  try {
    let processedHTML = htmlContent;

    // Generate/Inject QR code Base64 images on the backend for 100% reliable PDF printing
    const qrMatchRegex = /<img[^>]*data-qr-value="([^"]+)"[^>]*>/gi;
    let match;
    const qrPromises = [];
    while ((match = qrMatchRegex.exec(processedHTML)) !== null) {
      const fullTag = match[0];
      const qrUrl = match[1];
      qrPromises.push(
        QRCode.toDataURL(qrUrl, { margin: 1, width: 250, color: { dark: '#0f172a', light: '#ffffff' } })
          .then(base64Qr => {
            const updatedTag = fullTag.replace(/src="[^"]*"/gi, `src="${base64Qr}"`);
            processedHTML = processedHTML.replace(fullTag, updatedTag);
          })
          .catch(err => console.error("QR Code generation error:", err))
      );
    }
    if (qrPromises.length > 0) {
      await Promise.all(qrPromises);
    }

    // Fallback: If HTML contains AWB number but no data-qr-value was present, auto-generate tracking QR
    const awbRegex = /AWB\s*NO\.?\s*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i;
    const awbMatch = awbRegex.exec(processedHTML);
    if (awbMatch && awbMatch[1]) {
      const awbVal = awbMatch[1].trim();
      if (awbVal && awbVal !== 'UNKNOWN') {
        const trackUrl = `https://multimarg.com/track?awb=${awbVal}`;
        try {
          const base64Qr = await QRCode.toDataURL(trackUrl, { margin: 1, width: 250, color: { dark: '#0f172a', light: '#ffffff' } });
          processedHTML = processedHTML.replace(/<img[^>]*alt="[^"]*QR[^"]*"[^>]*>/gi, `<img src="${base64Qr}" alt="SCAN TO TRACK" style="width:66px;height:66px;display:block;margin:0 auto;" />`);
          processedHTML = processedHTML.replace(/<img[^>]*alt="[^"]*Tracking[^"]*"[^>]*>/gi, `<img src="${base64Qr}" alt="SCAN TO TRACK" style="width:66px;height:66px;display:block;margin:0 auto;" />`);
        } catch (e) {
          console.error("Failed fallback QR generation:", e);
        }
      }
    }

    // Strict replacement of local assets ONLY.
    // Never overwrite external Cloudinary / DB image URLs so Puppeteer fetches custom DB stamp images cleanly!
    processedHTML = processedHTML.replace(/<img[^>]*>/gi, (imgTag) => {
      // If the image tag uses an external URL (Cloudinary, AWS, HTTP/S), leave it untouched so Puppeteer loads the custom DB stamp
      if (imgTag.includes('src="http://') || imgTag.includes('src="https://') || imgTag.includes('cloudinary')) {
        return imgTag;
      }

      const fabStamp = getFabStampBase64();
      if ((imgTag.includes('fab.png') || imgTag.includes('/fab')) && fabStamp) {
        return imgTag.replace(/src="[^"]*"/gi, `src="${fabStamp}"`);
      }
      const primeLogo = getPrimeLogoBase64();
      if ((imgTag.includes('Prime') || imgTag.includes('RoadWAYS')) && primeLogo) {
        return imgTag.replace(/src="[^"]*"/gi, `src="${primeLogo}"`);
      }
      const mcLogo = getMcLogoBase64();
      if ((imgTag.includes('mc.png') || imgTag.includes('/mc') || imgTag.includes('Watermark') || imgTag.includes('Logo')) && mcLogo) {
        return imgTag.replace(/src="[^"]*"/gi, `src="${mcLogo}"`);
      }
      return imgTag;
    });

    // Launch headless browser
    browser = await launchBrowser();
    const page = await browser.newPage();

    // Block unnecessary resources for faster rendering and smaller output
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      // Block videos, media, and websockets - not needed for PDF
      if (['media', 'websocket', 'manifest', 'other'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    if (options.landscape) {
      await page.setViewport({ width: 1400, height: 990 });
    } else {
      await page.setViewport({ width: 940, height: 1200 });
    }

    // Set HTML content
    await page.setContent(processedHTML, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Generate optimized PDF
    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      landscape: !!options.landscape,
      printBackground: true,
      preferCSSPageSize: true,
      margin: options.margin || {
        top: '3mm',
        bottom: '3mm',
        left: '3mm',
        right: '3mm'
      }
    });

    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF with Puppeteer:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  generatePDF,
  checkChromiumAvailability
};
