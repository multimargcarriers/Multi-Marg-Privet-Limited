const puppeteer = require('puppeteer');

/**
 * Generates a PDF buffer from an HTML string using Puppeteer.
 * @param {string} htmlContent - The HTML string to convert to PDF.
 * @returns {Promise<Buffer>} - The generated PDF buffer.
 */
async function generatePDF(htmlContent) {
  let browser;
  try {
    // Launch headless browser
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();

    // Set HTML content
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0', // Wait until no new network connections are made
      timeout: 30000 // 30 seconds timeout
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px'
      }
    });

    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  generatePDF
};
