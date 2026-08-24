import { formatDate, calculateDueDate } from "./formatters";

/**
 * Dynamically loads ExcelJS in browser safe mode
 */
async function getExcelJS() {
  try {
    const mod = await import("exceljs/dist/exceljs.min.js");
    return mod.default || mod;
  } catch (_e) {
    const mod = await import("exceljs");
    return mod.default || mod;
  }
}

/**
 * Converts an image URL to ArrayBuffer for ExcelJS image embedding
 */
async function fetchImageBuffer(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch (err) {
    console.warn("Could not fetch logo for Excel export:", err);
    return null;
  }
}

/**
 * Converts any text value to ALL CAPS for Excel and CSV exports,
 * while preserving email addresses (e.g. info@multimarg.com) and website URLs (e.g. www.multimarg.com) in lowercase.
 */
export function toExportCaps(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "number" || typeof val === "boolean") return val;

  const str = String(val).trim();
  if (!str) return "";

  // If the entire string is an email address
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(str)) {
    return str.toLowerCase();
  }

  // If the entire string is a website URL or web domain
  if (/^(https?:\/\/|www\.)[^\s]+$/i.test(str)) {
    return str.toLowerCase();
  }

  // If string contains email or website embedded inside other text
  if (str.includes("@") || /https?:\/\/|www\./i.test(str)) {
    const emails = [];
    const urls = [];
    let processed = str
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi, (match) => {
        emails.push(match.toLowerCase());
        return `___EMAIL_${emails.length - 1}___`;
      })
      .replace(/\b(https?:\/\/[^\s]+|www\.[^\s]+)/gi, (match) => {
        urls.push(match.toLowerCase());
        return `___URL_${urls.length - 1}___`;
      })
      .toUpperCase();

    emails.forEach((email, i) => {
      processed = processed.replace(`___EMAIL_${i}___`, email);
    });
    urls.forEach((url, i) => {
      processed = processed.replace(`___URL_${i}___`, url);
    });

    return processed;
  }

  return str.toUpperCase();
}

/**
 * Converts column index (1-based) to letter (A, B, ..., Z, AA, AB...)
 */
function getColumnLetter(colIndex) {
  let temp;
  let letter = "";
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = Math.floor((colIndex - temp - 1) / 26);
  }
  return letter || "A";
}

/**
 * Professional Multimarg Excel Report Builder
 * Standardized with official company header details, prominent logo, and theme styling.
 */
export async function buildProfessionalExcelReport({
  reportTitle = "REPORT",
  subtitle = "",
  columns = [],
  rows = [],
  summaryTotals = null,
  filename = "Report.xlsx",
}) {
  const ExcelJS = await getExcelJS();

  const companyName = "MULTIMARG CARRIERS PVT. LTD.";
  const companyAddress = "LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND-263153";
  const companyContact = "CONTACT: +91 5944-324033  |  EMAIL: info@multimarg.com  |  WEBSITE: www.multimarg.com";
  const companyTaxInfo = "GSTIN: 05AANCM3054E1ZN  |  PAN: AANCM3054E1ZN";

  const primaryColorHex = "FF1E3A8A"; // Deep Navy Blue
  const secondaryColorHex = "FFDBEAFE"; // Soft Blue
  const darkTextColorHex = "FF0F172A"; // Slate Dark
  const lightZebraHex = "FFF8FAFC"; // Clean Slate White
  const borderColorHex = "FFCBD5E1"; // Light Gray Border

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Multimarg Carriers Pvt. Ltd.";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(reportTitle.slice(0, 30), {
    views: [{ showGridLines: true }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const totalColCount = Math.max(columns.length, 6);
  const lastColLetter = getColumnLetter(totalColCount);

  // 1. Set Column Definitions
  worksheet.columns = columns.map((col) => ({
    key: col.key || col.header,
    width: col.width || 15,
  }));

  // 2. Set Row Heights for Header Section
  worksheet.getRow(1).height = 26;
  worksheet.getRow(2).height = 18;
  worksheet.getRow(3).height = 18;
  worksheet.getRow(4).height = 18;
  worksheet.getRow(5).height = 6;  // Spacer

  // 3. Company Logo (Fully Square, Large & Crisp on Top Left)
  const logoBuffer = await fetchImageBuffer("/mc.png");
  if (logoBuffer) {
    try {
      const imageId = workbook.addImage({
        buffer: logoBuffer,
        extension: "png",
      });
      worksheet.addImage(imageId, {
        tl: { col: 0.15, row: 0.15 },
        ext: { width: 90, height: 90 },
      });
    } catch (_imgErr) {
      console.warn("Could not insert logo image into Excel:", _imgErr);
    }
  }

  // 4. Header Details Block (Columns C to Last Column)
  const headerStartCol = Math.min(3, Math.max(1, totalColCount - 3));
  const headerStartLetter = getColumnLetter(headerStartCol);

  // Row 1: Company Title
  worksheet.mergeCells(`${headerStartLetter}1:${lastColLetter}1`);
  const titleCell = worksheet.getCell(`${headerStartLetter}1`);
  titleCell.value = companyName;
  titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: primaryColorHex } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // Row 2: Registered Address
  worksheet.mergeCells(`${headerStartLetter}2:${lastColLetter}2`);
  const addrCell = worksheet.getCell(`${headerStartLetter}2`);
  addrCell.value = companyAddress;
  addrCell.font = { name: "Calibri", size: 9.5, color: { argb: "FF334155" } };
  addrCell.alignment = { horizontal: "center", vertical: "middle" };

  // Row 3: GSTIN & PAN Details
  worksheet.mergeCells(`${headerStartLetter}3:${lastColLetter}3`);
  const taxCell = worksheet.getCell(`${headerStartLetter}3`);
  taxCell.value = companyTaxInfo;
  taxCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
  taxCell.alignment = { horizontal: "center", vertical: "middle" };

  // Row 4: Contact Details
  worksheet.mergeCells(`${headerStartLetter}4:${lastColLetter}4`);
  const contactCell = worksheet.getCell(`${headerStartLetter}4`);
  contactCell.value = companyContact;
  contactCell.font = { name: "Calibri", size: 9, color: { argb: "FF334155" } };
  contactCell.alignment = { horizontal: "center", vertical: "middle" };

  // 5. Report Banner (Row 6)
  worksheet.mergeCells(`A6:${lastColLetter}6`);
  const bannerCell = worksheet.getCell("A6");
  bannerCell.value = `${reportTitle} ${subtitle ? ` - ${subtitle}` : ""}`.toUpperCase();
  bannerCell.font = { name: "Calibri", size: 11.5, bold: true, color: { argb: "FFFFFFFF" } };
  bannerCell.alignment = { horizontal: "center", vertical: "middle" };
  bannerCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: primaryColorHex },
  };
  worksheet.getRow(6).height = 26;

  // 6. Metadata Info Bar (Row 7)
  const halfCol = Math.floor(totalColCount / 2);
  const midLeftLetter = getColumnLetter(halfCol);
  const midRightLetter = getColumnLetter(halfCol + 1);

  worksheet.mergeCells(`A7:${midLeftLetter}7`);
  const metaLeft = worksheet.getCell("A7");
  metaLeft.value = `Exported Date: ${formatDate(new Date())}   |   Total Records: ${rows.length}`;
  metaLeft.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF334155" } };
  metaLeft.alignment = { horizontal: "left", vertical: "middle" };

  worksheet.mergeCells(`${midRightLetter}7:${lastColLetter}7`);
  const metaRight = worksheet.getCell(`${midRightLetter}7`);
  metaRight.value = "Generated from Multimarg ERP System";
  metaRight.font = { name: "Calibri", size: 9, bold: true, color: { argb: primaryColorHex } };
  metaRight.alignment = { horizontal: "right", vertical: "middle" };
  worksheet.getRow(7).height = 20;

  for (let c = 1; c <= totalColCount; c++) {
    const colRef = getColumnLetter(c);
    const cell = worksheet.getCell(`${colRef}7`);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: secondaryColorHex } };
    cell.border = { bottom: { style: "thin", color: { argb: borderColorHex } } };
  }

  // Row 8: Buffer row
  worksheet.getRow(8).height = 6;

  // 7. Table Headers (Row 9)
  const tableHeaderNames = columns.map((col) => toExportCaps(col.header));
  const headerRow = worksheet.addRow(tableHeaderNames);
  headerRow.height = 26;
  headerRow.eachCell((cell, colNumber) => {
    const colDef = columns[colNumber - 1] || {};
    cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = {
      horizontal: colDef.align || (colDef.numFmt ? "right" : "left"),
      vertical: "middle",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: primaryColorHex },
    };
    cell.border = {
      top: { style: "medium", color: { argb: primaryColorHex } },
      bottom: { style: "medium", color: { argb: primaryColorHex } },
      left: { style: "thin", color: { argb: "33FFFFFF" } },
      right: { style: "thin", color: { argb: "33FFFFFF" } },
    };
  });

  // 8. Data Rows (Row 10 onwards)
  let currentRowIndex = 10;

  rows.forEach((rowArr, rIdx) => {
    const isZebra = rIdx % 2 === 1;
    const rowBg = isZebra ? lightZebraHex : "FFFFFFFF";

    const formattedRowArr = rowArr.map((val) => toExportCaps(val));
    const dataRow = worksheet.addRow(formattedRowArr);
    dataRow.height = 20;

    dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colDef = columns[colNumber - 1] || {};
      cell.font = { name: "Calibri", size: 9, color: { argb: darkTextColorHex } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowBg },
      };

      cell.alignment = {
        horizontal: colDef.align || (typeof cell.value === "number" ? "right" : "left"),
        vertical: "middle",
      };

      if (colDef.numFmt && typeof cell.value === "number") {
        cell.numFmt = colDef.numFmt;
      }

      cell.border = {
        top: { style: "thin", color: { argb: borderColorHex } },
        bottom: { style: "thin", color: { argb: borderColorHex } },
        left: { style: "thin", color: { argb: borderColorHex } },
        right: { style: "thin", color: { argb: borderColorHex } },
      };
    });

    currentRowIndex++;
  });

  // 9. Summary / Totals Row
  if (summaryTotals && summaryTotals.totals && summaryTotals.totals.length > 0) {
    const totalRowNumber = currentRowIndex;
    const labelSpan = summaryTotals.labelColSpan || 1;
    const labelSpanLetter = getColumnLetter(labelSpan);

    if (labelSpan > 1) {
      worksheet.mergeCells(`A${totalRowNumber}:${labelSpanLetter}${totalRowNumber}`);
    }
    const labelCell = worksheet.getCell(`A${totalRowNumber}`);
    labelCell.value = `GRAND TOTAL (${rows.length} RECORDS)`;
    labelCell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: primaryColorHex } };
    labelCell.alignment = { horizontal: "right", vertical: "middle" };

    summaryTotals.totals.forEach((tot) => {
      const totColLetter = getColumnLetter(tot.colIndex);
      const totCell = worksheet.getCell(`${totColLetter}${totalRowNumber}`);
      totCell.value = tot.value;
      if (tot.numFmt) totCell.numFmt = tot.numFmt;
      totCell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: primaryColorHex } };
      totCell.alignment = { horizontal: tot.align || "right", vertical: "middle" };
    });

    worksheet.getRow(totalRowNumber).height = 24;
    for (let c = 1; c <= totalColCount; c++) {
      const colLetter = getColumnLetter(c);
      const cell = worksheet.getCell(`${colLetter}${totalRowNumber}`);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: secondaryColorHex },
      };
      cell.border = {
        top: { style: "medium", color: { argb: primaryColorHex } },
        bottom: { style: "double", color: { argb: primaryColorHex } },
        left: { style: "thin", color: { argb: borderColorHex } },
        right: { style: "thin", color: { argb: borderColorHex } },
      };
    }
  }

  // 10. Generate and Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Standard CSV Exporter
 */
export function exportGenericCSV({ headers = [], rows = [], filename = "Export.csv" }) {
  const csvContent = [
    headers.map((h) => toExportCaps(h)).join(","),
    ...rows.map((row) =>
      row.map((val) => {
        const processed = toExportCaps(val);
        return `"${String(processed !== undefined && processed !== null ? processed : "").replace(/"/g, '""')}"`;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// SPECIFIC MODULE EXPORTERS (WITHOUT STATUS COLUMN)
// ─────────────────────────────────────────────────────────────

/**
 * 1. VENDOR SHIP MIS EXPORT (WITHOUT STATUS)
 */
export async function exportVendorShipMis({
  trips = [],
  modeFilter = "ALL",
  dateRange = { startDate: "", endDate: "" },
  format = "excel",
}) {
  const columns = [
    { header: "SL No", key: "slNo", width: 8, align: "center" },
    { header: "Mode", key: "mode", width: 12, align: "center" },
    { header: "Date", key: "date", width: 13, align: "center" },
    { header: "Vehicle / Flight / Train No", key: "vehicleNo", width: 22 },
    { header: "Type", key: "type", width: 14 },
    { header: "AWB No", key: "awbNo", width: 16 },
    { header: "CD No", key: "cdNo", width: 14 },
    { header: "Vendor Name", key: "vendor", width: 22 },
    { header: "Trip Origin", key: "origin", width: 16 },
    { header: "Trip Destination", key: "destination", width: 16 },
    { header: "Client Name", key: "clientName", width: 22 },
    { header: "LR No", key: "lrNo", width: 16 },
    { header: "LR Origin", key: "lrOrigin", width: 16 },
    { header: "LR Destination", key: "lrDestination", width: 16 },
    { header: "Box", key: "box", width: 10, align: "center" },
    { header: "Weight (KG)", key: "weight", width: 14, align: "right", numFmt: "#,##0.00" },
    { header: "Ch. Wt (KG)", key: "chWeight", width: 14, align: "right", numFmt: "#,##0.00" },
    { header: "Special Instruction", key: "specialInstruction", width: 26 },
  ];

  let slCounter = 1;
  let totalBoxes = 0;
  let totalWeight = 0;
  let totalChWeight = 0;
  const rows = [];

  trips.forEach((trip) => {
    const formattedDate = trip.date ? formatDate(trip.date) : "-";
    const materials = trip.materialDetails && trip.materialDetails.length > 0 ? trip.materialDetails : [{}];

    materials.forEach((m, mIdx) => {
      const boxNum = m.box !== undefined && m.box !== "" ? parseInt(m.box, 10) || 0 : 0;
      const wtNum = m.weight !== undefined && m.weight !== "" ? parseFloat(m.weight) || 0 : 0;
      const chWtNum = m.chWeight !== undefined && m.chWeight !== "" ? parseFloat(m.chWeight) || 0 : 0;

      totalBoxes += boxNum;
      totalWeight += wtNum;
      totalChWeight += chWtNum;

      rows.push([
        mIdx === 0 ? slCounter : "",
        mIdx === 0 ? trip.mode || "-" : "",
        mIdx === 0 ? formattedDate : "",
        mIdx === 0 ? trip.vehicleNo || "-" : "",
        mIdx === 0 ? trip.type || "-" : "",
        mIdx === 0 ? trip.awbNo || "-" : "",
        mIdx === 0 ? trip.cdNo || "-" : "",
        mIdx === 0 ? trip.vendor || "-" : "",
        mIdx === 0 ? trip.origin || "-" : "",
        mIdx === 0 ? trip.destination || "-" : "",
        m.clientName || "-",
        m.lrNo || "-",
        m.origin || "-",
        m.destination || "-",
        boxNum || "-",
        wtNum || "-",
        chWtNum || "-",
        mIdx === 0 ? trip.specialInstruction || "-" : "",
      ]);
    });
    slCounter++;
  });

  const sanitizedDate = new Date().toISOString().split("T")[0];
  const dateStr = dateRange.startDate && dateRange.endDate
    ? `(${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)})`
    : "";

  if (format === "csv") {
    exportGenericCSV({
      headers: columns.map((c) => c.header),
      rows,
      filename: `Vendor_Ship_MIS_${modeFilter}_${sanitizedDate}.csv`,
    });
  } else {
    await buildProfessionalExcelReport({
      reportTitle: `VENDOR SHIP MIS REPORT - ${modeFilter} MODE`,
      subtitle: dateStr,
      columns,
      rows,
      summaryTotals: {
        labelColSpan: 14,
        totals: [
          { colIndex: 15, value: totalBoxes, align: "center" },
          { colIndex: 16, value: totalWeight, numFmt: "#,##0.00", align: "right" },
          { colIndex: 17, value: totalChWeight, numFmt: "#,##0.00", align: "right" },
        ],
      },
      filename: `Vendor_Ship_MIS_${modeFilter}_${sanitizedDate}.xlsx`,
    });
  }
}

// Backward compatibility alias for Trips.jsx
export const exportVendorShipMisToExcel = ({ trips, modeFilter, dateRange }) =>
  exportVendorShipMis({ trips, modeFilter, dateRange, format: "excel" });

export const exportVendorShipMisToCSV = ({ trips, modeFilter }) =>
  exportVendorShipMis({ trips, modeFilter, format: "csv" });

/**
 * 2. AWB BOOKINGS EXPORT (WITHOUT STATUS)
 */
export async function exportBookingsList({
  bookings = [],
  format = "excel",
  dateRange = { startDate: "", endDate: "" },
}) {
  const columns = [
    { header: "SL No", width: 8, align: "center" },
    { header: "AWB / LR No", width: 16 },
    { header: "Booking Date", width: 14, align: "center" },
    { header: "Origin", width: 16 },
    { header: "Destination", width: 16 },
    { header: "Consignor (Client)", width: 22 },
    { header: "Consignee", width: 22 },
    { header: "Mode", width: 12, align: "center" },
    { header: "Box", width: 10, align: "center" },
    { header: "Invoice No", width: 16 },
    { header: "Invoice Date", width: 14, align: "center" },
    { header: "Part No", width: 14 },
    { header: "Qty", width: 10, align: "center" },
    { header: "Invoice Value (₹)", width: 16, align: "right", numFmt: "#,##0.00" },
    { header: "E-Way Bill No", width: 18 },
    { header: "Actual Wt (KG)", width: 14, align: "right", numFmt: "#,##0.00" },
    { header: "Charged Wt (KG)", width: 14, align: "right", numFmt: "#,##0.00" },
    { header: "Rate (₹)", width: 12, align: "right", numFmt: "#,##0.00" },
    { header: "Freight (₹)", width: 14, align: "right", numFmt: "#,##0.00" },
    { header: "Docket (₹)", width: 12, align: "right", numFmt: "#,##0.00" },
    { header: "FOV (₹)", width: 12, align: "right", numFmt: "#,##0.00" },
    { header: "Other Chg (₹)", width: 12, align: "right", numFmt: "#,##0.00" },
    { header: "Total Amount (₹)", width: 16, align: "right", numFmt: "#,##0.00" },
    { header: "Payment Mode", width: 14, align: "center" },
  ];

  let sl = 1;
  let totalBoxes = 0;
  let totalInvoiceValue = 0;
  let totalActualWt = 0;
  let totalChargedWt = 0;
  let totalFreight = 0;
  let totalGrandAmt = 0;
  const rows = [];

  bookings.forEach((b) => {
    const awbNo = b.awb || b.consignment || b.awbNo || b.lrNumber || b.lrNo || "-";
    const bDate = b.date || b.bookingDate || b.createdAt;
    const formattedBDate = bDate ? formatDate(bDate) : "-";

    const boxCount = parseInt(b.box || b.boxes || b.noOfPackages || b.packages || b.qty || 0, 10);
    const actWt = parseFloat(b.actual_wt || b.actualWeight || b.weight || 0);
    const chgWt = parseFloat(b.charge_wt || b.chargeable_weight || b.chargedWeight || b.chargeableWeight || actWt || 0);
    const rate = parseFloat(b.rate || 0);
    const freight = parseFloat(b.freight_charge || b.freight || b.frieght || b.total_amount || 0);
    const docket = parseFloat(b.awb_charge || b.docket || 0);
    const fov = parseFloat(b.fov || b.insurance || 0);
    const other = parseFloat(b.other_charge || b.otherCharge || b.handling || 0);
    const totalAmt = parseFloat(b.total_amount || b.amount || b.grandTotal || (freight + docket + fov + other) || 0);

    totalBoxes += boxCount;
    totalActualWt += actWt;
    totalChargedWt += chgWt;
    totalFreight += freight;
    totalGrandAmt += totalAmt;

    const parcels = (b.invoiceDetails && b.invoiceDetails.length > 0)
      ? b.invoiceDetails
      : (b.parcels && b.parcels.length > 0 ? b.parcels : [{}]);

    parcels.forEach((p, pIdx) => {
      const invVal = parseFloat(p.value || p.invoiceValue || 0);
      if (!isNaN(invVal) && invVal > 0) totalInvoiceValue += invVal;

      rows.push([
        pIdx === 0 ? sl : "",
        pIdx === 0 ? awbNo : "",
        pIdx === 0 ? formattedBDate : "",
        pIdx === 0 ? b.origin || "-" : "",
        pIdx === 0 ? b.destination || "-" : "",
        pIdx === 0 ? b.consignor || b.client || "-" : "",
        pIdx === 0 ? b.consignee || "-" : "",
        pIdx === 0 ? b.mode || "-" : "",
        pIdx === 0 ? (boxCount || "-") : "",
        p.invoice || p.invoiceNo || "-",
        p.invdate || p.invoiceDate ? formatDate(p.invdate || p.invoiceDate) : "-",
        p.part || p.partNumber || "-",
        p.quantity || p.qty || "-",
        p.value || p.invoiceValue ? parseFloat(p.value || p.invoiceValue) : "-",
        p.eway || p.ewayBill || "-",
        pIdx === 0 ? (actWt || "-") : "",
        pIdx === 0 ? (chgWt || "-") : "",
        pIdx === 0 ? (rate || "-") : "",
        pIdx === 0 ? (freight || "-") : "",
        pIdx === 0 ? (docket || "-") : "",
        pIdx === 0 ? (fov || "-") : "",
        pIdx === 0 ? (other || "-") : "",
        pIdx === 0 ? (totalAmt || "-") : "",
        pIdx === 0 ? (b.payment_type || b.paymentMode || "TBB") : "",
      ]);
    });

    sl++;
  });

  const sanitizedDate = new Date().toISOString().split("T")[0];
  const dateStr = dateRange.startDate && dateRange.endDate
    ? `(${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)})`
    : "";

  if (format === "csv") {
    exportGenericCSV({
      headers: columns.map((c) => c.header),
      rows,
      filename: `AWB_Bookings_Report_${sanitizedDate}.csv`,
    });
  } else {
    await buildProfessionalExcelReport({
      reportTitle: "AWB BOOKINGS & CONSIGNMENTS REPORT",
      subtitle: dateStr,
      columns,
      rows,
      summaryTotals: {
        labelColSpan: 8,
        totals: [
          { colIndex: 9, value: totalBoxes, align: "center" },
          { colIndex: 14, value: totalInvoiceValue > 0 ? totalInvoiceValue : 0, numFmt: "#,##0.00", align: "right" },
          { colIndex: 16, value: totalActualWt, numFmt: "#,##0.00", align: "right" },
          { colIndex: 17, value: totalChargedWt, numFmt: "#,##0.00", align: "right" },
          { colIndex: 19, value: totalFreight, numFmt: "#,##0.00", align: "right" },
          { colIndex: 23, value: totalGrandAmt, numFmt: "#,##0.00", align: "right" },
        ],
      },
      filename: `AWB_Bookings_Report_${sanitizedDate}.xlsx`,
    });
  }
}

/**
 * 3. SALES BILLS / INVOICES EXPORT (WITHOUT STATUS)
 */
export async function exportSalesBillsList({
  bills = [],
  format = "excel",
  dateRange = { startDate: "", endDate: "" },
}) {
  const columns = [
    { header: "SL No", width: 8, align: "center" },
    { header: "Invoice / Bill No", width: 18 },
    { header: "Invoice Date", width: 14, align: "center" },
    { header: "Client Name", width: 24 },
    { header: "Origin", width: 16 },
    { header: "Destination", width: 16 },
    { header: "LR Count", width: 10, align: "center" },
    { header: "Total Boxes", width: 12, align: "center" },
    { header: "Total Weight (KG)", width: 16, align: "right", numFmt: "#,##0.00" },
    { header: "Taxable Amount (₹)", width: 18, align: "right", numFmt: "#,##0.00" },
    { header: "GST 18% (₹)", width: 14, align: "right", numFmt: "#,##0.00" },
    { header: "Grand Total (Incl. GST) (₹)", width: 22, align: "right", numFmt: "#,##0.00" },
    { header: "Received (₹)", width: 16, align: "right", numFmt: "#,##0.00" },
    { header: "Pending Balance (₹)", width: 18, align: "right", numFmt: "#,##0.00" },
  ];

  let sl = 1;
  let totalTaxable = 0;
  let totalGst = 0;
  let totalGrand = 0;
  let totalReceived = 0;
  let totalPending = 0;
  const rows = [];

  bills.forEach((b) => {
    const invNo = b.invoice || b.billNo || b.id || "-";
    const invDate = b.invoice_date || b.date || b.createdAt;
    const formattedDate = invDate ? formatDate(invDate) : "-";

    const lrCount = b.lr_details ? b.lr_details.length : b.lrNo ? 1 : 0;
    const boxCount = parseInt(b.box || b.boxes || b.total_boxes || 0, 10);
    const wt = parseFloat(b.weight || b.total_weight || 0);

    const taxable = parseFloat(b.taxable || b.taxableAmount || b.amount || 0);
    const gst = parseFloat(b.gst || b.gstAmount || b.cgst + b.sgst || 0);
    const grand = parseFloat(b.total || b.grandTotal || b.amount || 0);
    const paid = parseFloat(b.paidAmount || b.paid || 0);
    const pending = Math.max(0, grand - paid);

    totalTaxable += taxable;
    totalGst += gst;
    totalGrand += grand;
    totalReceived += paid;
    totalPending += pending;

    rows.push([
      sl,
      invNo,
      formattedDate,
      b.client || b.billedTo || "-",
      b.origin || "-",
      b.destination || "-",
      lrCount || "-",
      boxCount || "-",
      wt || "-",
      taxable,
      gst,
      grand,
      paid,
      pending,
    ]);

    sl++;
  });

  const sanitizedDate = new Date().toISOString().split("T")[0];
  const dateStr = dateRange.startDate && dateRange.endDate
    ? `(${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)})`
    : "";

  if (format === "csv") {
    exportGenericCSV({
      headers: columns.map((c) => c.header),
      rows,
      filename: `Sales_Invoices_Report_${sanitizedDate}.csv`,
    });
  } else {
    await buildProfessionalExcelReport({
      reportTitle: "SALES INVOICES & BILLING STATEMENT",
      subtitle: dateStr,
      columns,
      rows,
      summaryTotals: {
        labelColSpan: 9,
        totals: [
          { colIndex: 10, value: totalTaxable, numFmt: "#,##0.00", align: "right" },
          { colIndex: 11, value: totalGst, numFmt: "#,##0.00", align: "right" },
          { colIndex: 12, value: totalGrand, numFmt: "#,##0.00", align: "right" },
          { colIndex: 13, value: totalReceived, numFmt: "#,##0.00", align: "right" },
          { colIndex: 14, value: totalPending, numFmt: "#,##0.00", align: "right" },
        ],
      },
      filename: `Sales_Invoices_Report_${sanitizedDate}.xlsx`,
    });
  }
}

/**
 * 4. PURCHASE BILLS EXPORT (WITHOUT STATUS)
 */
export async function exportPurchaseBillsList({
  purchases = [],
  format = "excel",
  dateRange = { startDate: "", endDate: "" },
}) {
  const columns = [
    { header: "SL No", width: 8, align: "center" },
    { header: "Purchase Bill No", width: 18 },
    { header: "Bill Date", width: 14, align: "center" },
    { header: "Vendor Name", width: 24 },
    { header: "Category / Purpose", width: 18 },
    { header: "Description / Remarks", width: 24 },
    { header: "Taxable (₹)", width: 16, align: "right", numFmt: "#,##0.00" },
    { header: "GST Amount (₹)", width: 14, align: "right", numFmt: "#,##0.00" },
    { header: "Grand Total (₹)", width: 18, align: "right", numFmt: "#,##0.00" },
    { header: "Paid Amount (₹)", width: 16, align: "right", numFmt: "#,##0.00" },
    { header: "Balance Due (₹)", width: 16, align: "right", numFmt: "#,##0.00" },
  ];

  let sl = 1;
  let totalTaxable = 0;
  let totalGst = 0;
  let totalGrand = 0;
  let totalPaid = 0;
  let totalBalance = 0;
  const rows = [];

  purchases.forEach((p) => {
    const billDate = p.date || p.createdAt;
    const formattedDate = billDate ? formatDate(billDate) : "-";

    const taxable = parseFloat(p.taxable || p.amount || 0);
    const gst = parseFloat(p.gst || p.tax || 0);
    const grand = parseFloat(p.total || taxable + gst || 0);
    const paid = parseFloat(p.paidAmount || p.paid || 0);
    const balance = Math.max(0, grand - paid);

    totalTaxable += taxable;
    totalGst += gst;
    totalGrand += grand;
    totalPaid += paid;
    totalBalance += balance;

    rows.push([
      sl,
      p.billNo || "-",
      formattedDate,
      p.vendor || "-",
      p.category || p.expenseType || "-",
      p.description || p.remarks || "-",
      taxable,
      gst,
      grand,
      paid,
      balance,
    ]);

    sl++;
  });

  const sanitizedDate = new Date().toISOString().split("T")[0];
  const dateStr = dateRange.startDate && dateRange.endDate
    ? `(${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)})`
    : "";

  if (format === "csv") {
    exportGenericCSV({
      headers: columns.map((c) => c.header),
      rows,
      filename: `Purchase_Bills_Report_${sanitizedDate}.csv`,
    });
  } else {
    await buildProfessionalExcelReport({
      reportTitle: "PURCHASE BILLS & VENDOR EXPENSES REPORT",
      subtitle: dateStr,
      columns,
      rows,
      summaryTotals: {
        labelColSpan: 6,
        totals: [
          { colIndex: 7, value: totalTaxable, numFmt: "#,##0.00", align: "right" },
          { colIndex: 8, value: totalGst, numFmt: "#,##0.00", align: "right" },
          { colIndex: 9, value: totalGrand, numFmt: "#,##0.00", align: "right" },
          { colIndex: 10, value: totalPaid, numFmt: "#,##0.00", align: "right" },
          { colIndex: 11, value: totalBalance, numFmt: "#,##0.00", align: "right" },
        ],
      },
      filename: `Purchase_Bills_Report_${sanitizedDate}.xlsx`,
    });
  }
}

/**
 * 5. CASH SHEET EXPORT (WITHOUT STATUS)
 */
export async function exportCashSheetList({
  entries = [],
  format = "excel",
  dateRange = { startDate: "", endDate: "" },
}) {
  const columns = [
    { header: "SL No", width: 8, align: "center" },
    { header: "Date", width: 14, align: "center" },
    { header: "Type", width: 14, align: "center" },
    { header: "Party Name", width: 24 },
    { header: "Party Type", width: 16 },
    { header: "Cash In / Income (₹)", width: 18, align: "right", numFmt: "#,##0.00" },
    { header: "Cash Out / Expense (₹)", width: 18, align: "right", numFmt: "#,##0.00" },
    { header: "Remarks / Narration", width: 30 },
  ];

  let sl = 1;
  let totalIncome = 0;
  let totalExpense = 0;
  const rows = [];

  entries.forEach((e) => {
    const formattedDate = e.date ? formatDate(e.date) : "-";
    const isIncome = e.type === "in" || e.type === "income";
    const amt = parseFloat(e.amount || 0);

    if (isIncome) totalIncome += amt;
    else totalExpense += amt;

    rows.push([
      sl,
      formattedDate,
      isIncome ? "CASH IN" : "CASH OUT",
      e.partyName || "-",
      e.partyType || "Other",
      isIncome ? amt : "-",
      !isIncome ? amt : "-",
      e.remarks || "-",
    ]);

    sl++;
  });

  const sanitizedDate = new Date().toISOString().split("T")[0];
  const dateStr = dateRange.startDate && dateRange.endDate
    ? `(${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)})`
    : "";

  if (format === "csv") {
    exportGenericCSV({
      headers: columns.map((c) => c.header),
      rows,
      filename: `Cash_Sheet_Report_${sanitizedDate}.csv`,
    });
  } else {
    await buildProfessionalExcelReport({
      reportTitle: "CASH SHEET & FINANCIAL TRANSACTION STATEMENT",
      subtitle: dateStr,
      columns,
      rows,
      summaryTotals: {
        labelColSpan: 5,
        totals: [
          { colIndex: 6, value: totalIncome, numFmt: "#,##0.00", align: "right" },
          { colIndex: 7, value: totalExpense, numFmt: "#,##0.00", align: "right" },
        ],
      },
      filename: `Cash_Sheet_Report_${sanitizedDate}.xlsx`,
    });
  }
}

/**
 * 6. UNBILLED SHIPMENTS EXPORT (WITHOUT STATUS)
 */
export async function exportUnbilledReport({
  unbilled = [],
  format = "excel",
  dateRange = { startDate: "", endDate: "" },
}) {
  const columns = [
    { header: "SL No", width: 8, align: "center" },
    { header: "AWB / LR No", width: 16 },
    { header: "Booking Date", width: 14, align: "center" },
    { header: "Consignor (Client)", width: 22 },
    { header: "Consignee", width: 22 },
    { header: "Origin", width: 16 },
    { header: "Destination", width: 16 },
    { header: "Mode", width: 12, align: "center" },
    { header: "Box Count", width: 12, align: "center" },
    { header: "Chargeable Wt (KG)", width: 16, align: "right", numFmt: "#,##0.00" },
    { header: "Freight Amount (₹)", width: 16, align: "right", numFmt: "#,##0.00" },
    { header: "Remarks / Instructions", width: 26 },
  ];

  let sl = 1;
  let totalBoxes = 0;
  let totalChWeight = 0;
  let totalFreight = 0;
  const rows = [];

  unbilled.forEach((b) => {
    const awbNo = b.awb || b.consignment || b.awbNo || b.lrNumber || b.lrNo || "-";
    const bDate = b.date || b.bookingDate || b.createdAt;
    const formattedBDate = bDate ? formatDate(bDate) : "-";

    const boxCount = parseInt(b.box || b.boxes || b.noOfPackages || b.packages || b.qty || 0, 10);
    const chgWt = parseFloat(b.charge_wt || b.chargeable_weight || b.chargedWeight || b.chargeableWeight || b.weight || 0);
    const freight = parseFloat(b.freight_charge || b.freight || b.frieght || b.total_amount || 0);

    totalBoxes += boxCount;
    totalChWeight += chgWt;
    totalFreight += freight;

    rows.push([
      sl,
      awbNo,
      formattedBDate,
      b.consignor || b.client || "-",
      b.consignee || "-",
      b.origin || "-",
      b.destination || "-",
      b.mode || "ROAD",
      boxCount || "-",
      chgWt || "-",
      freight || "-",
      b.remarks || b.specialInstruction || "-",
    ]);

    sl++;
  });

  const sanitizedDate = new Date().toISOString().split("T")[0];
  const dateStr = dateRange.startDate && dateRange.endDate
    ? `(${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)})`
    : "";

  if (format === "csv") {
    exportGenericCSV({
      headers: columns.map((c) => c.header),
      rows,
      filename: `Unbilled_Shipments_Report_${sanitizedDate}.csv`,
    });
  } else {
    await buildProfessionalExcelReport({
      reportTitle: "UNBILLED SHIPMENTS & PENDING BILLING REPORT",
      subtitle: dateStr,
      columns,
      rows,
      summaryTotals: {
        labelColSpan: 8,
        totals: [
          { colIndex: 9, value: totalBoxes, align: "center" },
          { colIndex: 10, value: totalChWeight, numFmt: "#,##0.00", align: "right" },
          { colIndex: 11, value: totalFreight, numFmt: "#,##0.00", align: "right" },
        ],
      },
      filename: `Unbilled_Shipments_Report_${sanitizedDate}.xlsx`,
    });
  }
}

/**
 * 7. CLIENT TRIP REPORT EXPORT (WITHOUT STATUS)
 */
export async function exportClientTripReport({
  trips = [],
  format = "excel",
  dateRange = { startDate: "", endDate: "" },
}) {
  const columns = [
    { header: "SL No", width: 8, align: "center" },
    { header: "Trip No", width: 16 },
    { header: "Trip Date", width: 14, align: "center" },
    { header: "Vehicle Type", width: 16 },
    { header: "Vehicle No", width: 18 },
    { header: "Vendor Name", width: 22 },
    { header: "Origin", width: 16 },
    { header: "Destination", width: 16 },
    { header: "Client Name", width: 22 },
    { header: "Description", width: 24 },
    { header: "Boxes", width: 10, align: "center" },
    { header: "Chg. Wt (KG)", width: 14, align: "right", numFmt: "#,##0.00" },
    { header: "Freight Amount (₹)", width: 16, align: "right", numFmt: "#,##0.00" },
  ];

  let sl = 1;
  let totalBoxes = 0;
  let totalChWeight = 0;
  let totalFreight = 0;
  const rows = [];

  trips.forEach((t) => {
    const tripDate = t.date || t.createdAt;
    const formattedDate = tripDate ? formatDate(tripDate) : "-";

    const boxCount = parseInt(t.box || 0, 10);
    const chgWt = parseFloat(t.chargeableWeight || 0);
    const amt = parseFloat(t.amount || t.totalAmount || 0);

    totalBoxes += boxCount;
    totalChWeight += chgWt;
    totalFreight += amt;

    rows.push([
      sl,
      t.tripNo || "-",
      formattedDate,
      t.vehicleType || "-",
      t.vehicleNo || "-",
      t.vendor || "-",
      t.origin || "-",
      t.destination || "-",
      t.client || "-",
      t.description || "-",
      boxCount || "-",
      chgWt || "-",
      amt || "-",
    ]);

    sl++;
  });

  const sanitizedDate = new Date().toISOString().split("T")[0];
  const dateStr = dateRange.startDate && dateRange.endDate
    ? `(${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)})`
    : "";

  if (format === "csv") {
    exportGenericCSV({
      headers: columns.map((c) => c.header),
      rows,
      filename: `Client_Trip_Report_${sanitizedDate}.csv`,
    });
  } else {
    await buildProfessionalExcelReport({
      reportTitle: "CLIENT TRIP & SHIPMENT MOVEMENT REPORT",
      subtitle: dateStr,
      columns,
      rows,
      summaryTotals: {
        labelColSpan: 10,
        totals: [
          { colIndex: 11, value: totalBoxes, align: "center" },
          { colIndex: 12, value: totalChWeight, numFmt: "#,##0.00", align: "right" },
          { colIndex: 13, value: totalFreight, numFmt: "#,##0.00", align: "right" },
        ],
      },
      filename: `Client_Trip_Report_${sanitizedDate}.xlsx`,
    });
  }
}

/**
 * 8. VEHICLE TRIP MIS EXPORT (WITHOUT STATUS)
 */
export async function exportVehicleTripMisList({
  trips = [],
  format = "excel",
  dateRange = {},
}) {
  const columns = [
    { header: "S.No", width: 6, align: "center" },
    { header: "Trip No", width: 16 },
    { header: "Date", width: 14, align: "center" },
    { header: "Client", width: 22 },
    { header: "Route (From - To)", width: 24 },
    { header: "Vehicle No", width: 18 },
    { header: "Vehicle Type", width: 16 },
    { header: "LR No", width: 16 },
    { header: "Consignor", width: 22 },
    { header: "Consignee", width: 22 },
    { header: "LR Route", width: 22 },
    { header: "Mode", width: 12, align: "center" },
    { header: "Boxes", width: 10, align: "center" },
    { header: "Weight (Kg)", width: 14, numFmt: "#,##0.00", align: "right" },
    { header: "Freight (₹)", width: 16, numFmt: "#,##0.00", align: "right" },
    { header: "Extra Chgs (₹)", width: 14, numFmt: "#,##0.00", align: "right" },
    { header: "Payment", width: 14, align: "center" },
    { header: "Remarks", width: 22 }
  ];

  const rows = [];
  let sl = 1;
  let totalBoxes = 0;
  let totalWeight = 0;
  let totalFreight = 0;
  let totalExtra = 0;

  trips.forEach((trip) => {
    const tripDate = trip.date ? formatDate(trip.date) : (trip.createdAt ? formatDate(trip.createdAt) : "-");
    const tripRoute = `${trip.origin || "-"} ➔ ${trip.destination || "-"}`;
    
    if (trip.parcels && trip.parcels.length > 0) {
      trip.parcels.forEach((p, pIdx) => {
        const box = parseInt(p.box || 0, 10) || 0;
        const wt = parseFloat(p.weight || 0) || 0;
        const frt = parseFloat(p.freight || 0) || 0;
        const extra = (parseFloat(p.pickup || 0) || 0) + (parseFloat(p.delivery || 0) || 0) + (parseFloat(p.special || 0) || 0) + (parseFloat(p.other || 0) || 0) + (parseFloat(p.parking || 0) || 0) + (parseFloat(p.labor || 0) || 0);

        totalBoxes += box;
        totalWeight += wt;
        totalFreight += frt;
        totalExtra += extra;

        rows.push([
          pIdx === 0 ? sl : "",
          pIdx === 0 ? trip.tripNo || "-" : "",
          pIdx === 0 ? tripDate : "",
          pIdx === 0 ? trip.clientName || "-" : "",
          pIdx === 0 ? tripRoute : "",
          pIdx === 0 ? trip.vehicleNo || "-" : "",
          pIdx === 0 ? trip.vehicleType || "-" : "",
          p.lrNo || "-",
          p.consignor || "-",
          p.consignee || "-",
          `${p.origin || "-"} ➔ ${p.destination || "-"}`,
          p.mode || trip.mode || "ROAD",
          box || "-",
          wt || "-",
          frt || "-",
          extra || "-",
          pIdx === 0 ? trip.payment || "Credit" : "",
          pIdx === 0 ? trip.tripRemarks || "-" : "",
        ]);
      });
      sl++;
    } else {
      const frt = parseFloat(trip.freight || 0) || 0;
      totalFreight += frt;

      rows.push([
        sl,
        trip.tripNo || "-",
        tripDate,
        trip.clientName || "-",
        tripRoute,
        trip.vehicleNo || "-",
        trip.vehicleType || "-",
        "-",
        "-",
        "-",
        "-",
        trip.mode || "ROAD",
        "-",
        "-",
        frt || "-",
        "-",
        trip.payment || "Credit",
        trip.tripRemarks || "-",
      ]);
      sl++;
    }
  });

  const sanitizedDate = new Date().toISOString().split("T")[0];
  const dateStr = dateRange.startDate && dateRange.endDate
    ? `(${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)})`
    : "";

  if (format === "csv") {
    exportGenericCSV({
      headers: columns.map((c) => c.header),
      rows,
      filename: `Vehicle_Trip_MIS_${sanitizedDate}.csv`,
    });
  } else {
    await buildProfessionalExcelReport({
      reportTitle: "VEHICLE TRIP MIS REPORT",
      subtitle: dateStr,
      columns,
      rows,
      summaryTotals: {
        labelColSpan: 12,
        totals: [
          { colIndex: 13, value: totalBoxes, align: "center" },
          { colIndex: 14, value: totalWeight, numFmt: "#,##0.00", align: "right" },
          { colIndex: 15, value: totalFreight, numFmt: "#,##0.00", align: "right" },
          { colIndex: 16, value: totalExtra, numFmt: "#,##0.00", align: "right" },
        ],
      },
      filename: `Vehicle_Trip_MIS_${sanitizedDate}.xlsx`,
    });
  }
}

/**
 * 9. VENDOR VEHICLE MIS EXPORT (WITHOUT STATUS)
 */
export async function exportVendorVehicleMisList({
  entries = [],
  format = "excel",
  dateRange = {},
}) {
  const columns = [
    { header: "S.No", width: 6, align: "center" },
    { header: "Vendor Name", width: 24 },
    { header: "Date", width: 14, align: "center" },
    { header: "Handover To / Driver", width: 22 },
    { header: "Vehicle No", width: 18 },
    { header: "Particular", width: 24 },
    { header: "From", width: 18 },
    { header: "To", width: 18 },
    { header: "Mode", width: 12, align: "center" },
    { header: "Amount (₹)", width: 16, numFmt: "#,##0.00", align: "right" },
    { header: "Other Chgs (₹)", width: 14, numFmt: "#,##0.00", align: "right" },
    { header: "Total Amount (₹)", width: 18, numFmt: "#,##0.00", align: "right" },
  ];

  const rows = [];
  let sl = 1;
  let grandAmount = 0;
  let grandOthers = 0;
  let grandTotal = 0;

  entries.forEach((item) => {
    const createdDate = item.createdAt ? formatDate(item.createdAt) : "-";
    if (item.details && item.details.length > 0) {
      item.details.forEach((d, dIdx) => {
        const dDate = d.date ? formatDate(d.date) : createdDate;
        const amt = parseFloat(d.amount || 0) || 0;
        const oth = parseFloat(d.others || 0) || 0;
        const tot = amt + oth;

        grandAmount += amt;
        grandOthers += oth;
        grandTotal += tot;

        rows.push([
          dIdx === 0 ? sl : "",
          dIdx === 0 ? item.vendorName || "-" : "",
          dDate,
          d.handoverTo || "-",
          d.vehicleNo || "-",
          d.particular || "-",
          d.from || "-",
          d.to || "-",
          d.mode || "ROAD",
          amt || "-",
          oth || "-",
          tot || "-",
        ]);
      });
      sl++;
    } else {
      const tot = parseFloat(item.totalAmount || 0) || 0;
      grandTotal += tot;

      rows.push([
        sl,
        item.vendorName || "-",
        createdDate,
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
        tot || "-",
      ]);
      sl++;
    }
  });

  const sanitizedDate = new Date().toISOString().split("T")[0];
  const dateStr = dateRange.startDate && dateRange.endDate
    ? `(${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)})`
    : "";

  if (format === "csv") {
    exportGenericCSV({
      headers: columns.map((c) => c.header),
      rows,
      filename: `Vendor_Vehicle_MIS_${sanitizedDate}.csv`,
    });
  } else {
    await buildProfessionalExcelReport({
      reportTitle: "VENDOR VEHICLE MIS REPORT",
      subtitle: dateStr,
      columns,
      rows,
      summaryTotals: {
        labelColSpan: 9,
        totals: [
          { colIndex: 10, value: grandAmount, numFmt: "#,##0.00", align: "right" },
          { colIndex: 11, value: grandOthers, numFmt: "#,##0.00", align: "right" },
          { colIndex: 12, value: grandTotal, numFmt: "#,##0.00", align: "right" },
        ],
      },
      filename: `Vendor_Vehicle_MIS_${sanitizedDate}.xlsx`,
    });
  }
}

/**
 * Helper to compute detailed settlement and payment history for a specific bill.
 */
export const getBillSettlementDetails = (b, rawCash = [], rawAdj = []) => {
  const bNo = (b.invoice || b.billNo || b.invoiceNo || b.purchaseNo || b.billNumber || b.invNo || b.refNo || "").toUpperCase();

  // Matched cash/bank receipts
  const matchedCash = (rawCash || []).filter((c) => {
    const cRef = String(c.billNo || c.referenceNo || c.refNo || c.linkedBillNo || "").toUpperCase();
    return cRef && bNo && (cRef === bNo || cRef.includes(bNo) || bNo.includes(cRef));
  });

  // Matched TDS / Adjustments
  const matchedAdj = (rawAdj || []).filter((a) => {
    const aRef = String(a.billNo || a.linkedBillNo || a.referenceNo || "").toUpperCase();
    return aRef && bNo && (aRef === bNo || aRef.includes(bNo) || bNo.includes(aRef));
  });

  const payItems = [];
  matchedCash.forEach((c) => {
    const dt = formatDate(c.date || c.createdAt);
    const amt = Number(c.amount) || 0;
    const ref = c.voucherNo || c.referenceNo || c.chequeNo || "";
    const mode = c.paymentMode || c.mode || "Bank/Cash";
    payItems.push(`₹${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })} on ${dt} (${mode}${ref ? ` Ref: ${ref}` : ""})`);
  });

  if (payItems.length === 0 && (Number(b.paidAmount) || 0) > 0) {
    const pDt = b.paymentDate || b.paidDate || b.updatedAt || b.date || b.invoice_date;
    payItems.push(`₹${Number(b.paidAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}${pDt ? ` on ${formatDate(pDt)}` : ""}`);
  }

  const tdsItems = [];
  matchedAdj.filter((a) => String(a.particulars || "tds").toLowerCase() === "tds").forEach((a) => {
    const dt = formatDate(a.date || a.createdAt);
    const amt = Number(a.amount) || 0;
    tdsItems.push(`TDS ₹${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })} on ${dt}`);
  });

  if (tdsItems.length === 0 && (Number(b.tdsAmount) || 0) > 0) {
    tdsItems.push(`TDS ₹${Number(b.tdsAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`);
  }

  const payDates = [];
  matchedCash.forEach((c) => {
    const dt = formatDate(c.date || c.createdAt);
    const mode = c.paymentMode || c.mode || "Bank";
    const ref = c.voucherNo || c.referenceNo || "";
    payDates.push(`${dt} (${mode}${ref ? `:${ref}` : ""})`);
  });
  if (payDates.length === 0 && (Number(b.paidAmount) || 0) > 0) {
    const pDt = b.paymentDate || b.paidDate || b.updatedAt || b.date || b.invoice_date;
    if (pDt) payDates.push(formatDate(pDt));
  }

  return {
    matchedCash,
    matchedAdj,
    paymentSummary: payItems.join(" | ") || (Number(b.paidAmount) > 0 ? `₹${Number(b.paidAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"),
    paymentDateList: payDates.join(", ") || "-",
    tdsSummary: tdsItems.join(" | ") || (Number(b.tdsAmount) > 0 ? `₹${Number(b.tdsAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-")
  };
};

/**
 * 17. DETAILED PARTY STATEMENT OF ACCOUNT & RUNNING-BALANCE LEDGER EXPORTER (EXCEL & CSV)
 * Creates a professional, calculation-based audit statement with company letterhead,
 * executive financial summary cards, color-coded badges, chronological transaction ledger,
 * and comprehensive bills & payment schedules.
 */
export async function exportPartyDetailedLedger({
  party,
  format = "excel",
  statusFilter = "all",
  dateRange = { type: "all", startDate: "", endDate: "" },
}) {
  if (!party) return;

  const isClient = (party.type || "Client").toLowerCase() === "client";
  const partyTypeLabel = isClient ? "CUSTOMER / CLIENT" : "VENDOR / SUPPLIER";
  const partyName = party.partyName || "Party";
  const sanitizedPartyName = partyName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const today = new Date().toISOString().split("T")[0];
  const formattedToday = formatDate(new Date());

  // 1. Build Chronological Ledger Entries
  const ledgerEntries = [];

  // A. Opening Balance (Include if not filtered out by custom date or settled filter)
  if (((party.openingDue || 0) > 0 || (party.priorBilled || 0) > 0) && (statusFilter !== "paid" || (party.openingDue || 0) <= 0.01)) {
    ledgerEntries.push({
      date: party.openingDoc?.financialYear ? `OPENING (${party.openingDoc.financialYear})` : "FY OPENING",
      rawDate: new Date("2000-01-01"),
      type: "OPENING BALANCE",
      ref: party.openingDoc?.financialYear ? `OPENING-${party.openingDoc.financialYear}` : "FY-OPENING-BAL",
      particulars: `Prior financial year closing balance carried forward (Billed: ₹${(party.priorBilled || 0).toFixed(2)}, Paid: ₹${(party.priorPaid || 0).toFixed(2)})`,
      mode: "OPENING ENTRY",
      taxable: 0,
      gst: 0,
      debit: Number((party.openingDue || 0).toFixed(2)),
      credit: 0,
      status: (party.openingDue || 0) > 0 ? "UNPAID" : "SETTLED",
    });
  }

  // B. Current Period Invoices / Purchases
  const rawBills = isClient ? (party.bills || []) : (party.purchases || []);
  const filteredBills = rawBills.filter((b) => {
    const bTotal = Number(b.amount || b.total) || 0;
    const bPaid = Number(b.paidAmount) || 0;
    const bTds = Number(b.tdsAmount) || 0;
    const bDebt = Number(b.debtAmount) || 0;
    const isCancelled = String(b.status || "").toLowerCase() === "cancelled";
    const bDue = isCancelled ? 0 : Math.max(0, bTotal - bPaid - bTds - bDebt);

    if (statusFilter === "due_only" && bDue <= 0.01) return false;
    if (statusFilter === "paid" && bDue > 0.01) return false;
    if (statusFilter === "partial" && (bPaid === 0 || bDue <= 0.01)) return false;
    if (statusFilter === "unpaid" && (bPaid > 0 || bTds > 0 || bDebt > 0)) return false;

    if (dateRange?.type === "custom" && dateRange.startDate && dateRange.endDate) {
      const bDate = b.billDate || b.date || b.invoiceDate || b.createdAt;
      if (bDate) {
        try {
          const dStr = new Date(bDate).toISOString().split("T")[0];
          if (dStr < dateRange.startDate || dStr > dateRange.endDate) return false;
        } catch (_e) {}
      }
    }
    return true;
  });

  filteredBills.forEach((b) => {
    const bTotal = Number(b.amount || b.total) || 0;
    const bPaid = Number(b.paidAmount) || 0;
    const bTds = Number(b.tdsAmount) || 0;
    const bDebt = Number(b.debtAmount) || 0;
    const isCancelled = String(b.status || "").toLowerCase() === "cancelled";
    const bDue = isCancelled ? 0 : Math.max(0, bTotal - bPaid - bTds - bDebt);
    const bDate = b.invoice_date || b.billDate || b.date || b.createdAt || b.invoiceDate || b.purchaseDate || b.lrDate;
    const bNo = (b.invoice || b.billNo || b.invoiceNo || b.purchaseNo || b.billNumber || b.invNo || b.refNo || (b.id ? String(b.id).slice(-6) : "") || "-").toUpperCase();
    const status = isCancelled ? "CANCELLED" : bDue <= 0.01 ? "PAID" : (bPaid > 0 || bTds > 0 || bDebt > 0) ? "PARTIAL" : "UNPAID";

    let particulars = b.remarks || b.description || (isClient ? "Freight & Transportation Services" : "Vendor Transport Charges");
    if (b.vehicles || b.vehicleNo) particulars += ` (Veh: ${b.vehicles || b.vehicleNo})`;
    if (b.tripsCount) particulars += ` [${b.tripsCount} Trips]`;

    const bTaxable = Number(b.taxableAmount || b.taxable) || (b.gstAmount || b.gst ? bTotal - Number(b.gstAmount || b.gst) : bTotal / 1.18);
    const bGst = Number(b.gstAmount || b.gst) || (bTotal - bTaxable);

    ledgerEntries.push({
      date: formatDate(bDate),
      rawDate: bDate ? new Date(bDate) : new Date(),
      type: isClient ? "SALES INVOICE" : "PURCHASE BILL",
      ref: bNo,
      particulars: particulars,
      mode: b.paymentMode && String(b.paymentMode).toUpperCase() !== "TBB" ? b.paymentMode : "BILL / INVOICE",
      taxable: Number(bTaxable.toFixed(2)),
      gst: Number(bGst.toFixed(2)),
      debit: Number(bTotal.toFixed(2)),
      credit: 0,
      status: status,
      rawBill: b,
    });
  });

  // C. Cash / Bank Receipts or Payments
  const rawCash = (party.cash || []).filter((c) => {
    if (dateRange?.type === "custom" && dateRange.startDate && dateRange.endDate) {
      const cDate = c.date || c.createdAt;
      if (cDate) {
        try {
          const dStr = new Date(cDate).toISOString().split("T")[0];
          if (dStr < dateRange.startDate || dStr > dateRange.endDate) return false;
        } catch (_e) {}
      }
    }
    return true;
  });

  rawCash.forEach((c) => {
    const amt = Number(c.amount) || 0;
    const cDate = c.date || c.createdAt;
    const cRef = c.voucherNo || c.referenceNo || c.refNo || c.chequeNo || c.transactionId || "-";
    const isIncome = c.type === "in";
    const mode = c.paymentMode || c.mode || "BANK / CASH";
    let narration = c.narration || c.notes || c.particulars || (isIncome ? "Payment Received" : "Payment Disbursed");
    if (c.bankName) narration += ` via ${c.bankName}`;

    let debit = 0;
    let credit = 0;
    if (isClient) {
      if (isIncome) credit = amt;
      else debit = amt;
    } else {
      if (!isIncome) credit = amt;
      else debit = amt;
    }

    ledgerEntries.push({
      date: formatDate(cDate),
      rawDate: cDate ? new Date(cDate) : new Date(),
      type: isIncome ? "CASH/BANK RECEIPT" : "CASH/BANK PAYMENT",
      ref: cRef,
      particulars: narration,
      mode: mode,
      taxable: 0,
      gst: 0,
      debit: Number(debit.toFixed(2)),
      credit: Number(credit.toFixed(2)),
      status: "SETTLED",
      rawCash: c,
    });
  });

  // D. TDS & Bad Debt Adjustments
  const rawAdj = (party.adjustments || []).filter((adj) => {
    if (dateRange?.type === "custom" && dateRange.startDate && dateRange.endDate) {
      const adjDate = adj.date || adj.createdAt;
      if (adjDate) {
        try {
          const dStr = new Date(adjDate).toISOString().split("T")[0];
          if (dStr < dateRange.startDate || dStr > dateRange.endDate) return false;
        } catch (_e) {}
      }
    }
    return true;
  });
  rawAdj.forEach((adj) => {
    const amt = Number(adj.amount) || 0;
    const adjDate = adj.date || adj.createdAt;
    const part = String(adj.particulars || "tds").toLowerCase();
    const isTds = part === "tds";
    const adjType = isTds ? "TDS / TAX DEDUCTION" : "DISCOUNT / DEBT ADJUSTMENT";
    const adjRef = adj.voucherNo || adj.referenceNo || adj.billNo || (isTds ? "TDS-DEDUCT" : "DEBT-ADJ");
    const mode = isTds ? "TAX DEDUCTED" : "DISCOUNT";
    const narration = adj.remarks || adj.reason || (isTds ? "Tax Deducted at Source (TDS)" : "Bad Debt / Discount Allowed");

    ledgerEntries.push({
      date: formatDate(adjDate),
      rawDate: adjDate ? new Date(adjDate) : new Date(),
      type: adjType,
      ref: adjRef,
      particulars: narration,
      mode: mode,
      taxable: 0,
      gst: 0,
      debit: 0,
      credit: 0,
      tds: isTds ? Number(amt.toFixed(2)) : 0,
      debt: !isTds ? Number(amt.toFixed(2)) : 0,
      status: "ADJUSTED",
      rawAdj: adj,
    });
  });

  // Sort Chronologically (Opening Balance first, then by date)
  ledgerEntries.sort((a, b) => {
    if (a.type === "OPENING BALANCE") return -1;
    if (b.type === "OPENING BALANCE") return 1;
    const tA = a.rawDate instanceof Date && !isNaN(a.rawDate.getTime()) ? a.rawDate.getTime() : 0;
    const tB = b.rawDate instanceof Date && !isNaN(b.rawDate.getTime()) ? b.rawDate.getTime() : 0;
    return tA - tB;
  });

  // Calculate Running Balance
  let runningBal = 0;
  let totalLedgerDebit = 0;
  let totalLedgerCredit = 0;
  let totalLedgerTds = 0;
  let totalLedgerTaxable = 0;
  let totalLedgerGst = 0;
  ledgerEntries.forEach((entry) => {
    totalLedgerDebit += entry.debit || 0;
    totalLedgerCredit += entry.credit || 0;
    totalLedgerTds += entry.tds || 0;
    totalLedgerTaxable += entry.taxable || 0;
    totalLedgerGst += entry.gst || 0;

    if (isClient) {
      runningBal = runningBal + (entry.debit || 0) - (entry.credit || 0) - (entry.tds || 0) - (entry.debt || 0);
    } else {
      runningBal = runningBal + (entry.credit || 0) - (entry.debit || 0) - (entry.tds || 0) - (entry.debt || 0);
    }
    entry.runningBalance = Number(runningBal.toFixed(2));
  });

  // -------------------------------------------------------------
  // CSV EXPORT MODE
  // -------------------------------------------------------------
  if (format === "csv") {
    const csvRows = [];
    csvRows.push(["MULTIMARG CARRIERS PVT. LTD."]);
    csvRows.push(["LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND-263153"]);
    csvRows.push(["GSTIN: 05AANCM3054E1ZN | PAN: AANCM3054E1ZN | PHONE: +91 5944-324033 | EMAIL: info@multimarg.com"]);
    csvRows.push([]);
    csvRows.push([`STATEMENT OF ACCOUNT & RUNNING LEDGER - ${partyName.toUpperCase()}`]);
    csvRows.push([`Generated Date: ${formattedToday}`, `Account Type: ${partyTypeLabel}`, `Code: ${party.code || "-"}`, `GSTIN: ${party.gst || "-"}`]);
    csvRows.push([`Address: ${party.address || "-"}`, `Contact: ${party.contact || "-"}`]);
    csvRows.push([]);
    csvRows.push(["EXECUTIVE FINANCIAL SUMMARY"]);
    csvRows.push([
      "Prior FY Opening Due",
      "Current Period Invoiced",
      "Total Invoiced",
      "Total Paid / Received",
      "Total TDS Deducted",
      "Total Bad Debt / Discount",
      "Net Outstanding Due",
      "Account Status"
    ]);
    csvRows.push([
      party.openingDue || 0,
      party.currentBilled || 0,
      party.totalInvoiced || 0,
      party.totalPaid || 0,
      party.totalTds || 0,
      party.totalDebt || 0,
      party.netOutstandingDue || 0,
      party.status === "paid" ? "SETTLED (100%)" : party.status === "partial" ? `PARTIAL (${party.recoveryPercent}%)` : "OVERDUE (0%)"
    ]);
    csvRows.push([]);
    csvRows.push(["TRANSACTION AUDIT LEDGER (CHRONOLOGICAL)"]);
    csvRows.push([
      "SL No",
      "Date",
      "Transaction Type",
      "Reference / Bill No",
      "Particulars / Narration",
      "Payment Mode",
      "Taxable (₹)",
      "GST 18% (₹)",
      "Debit / Billed (₹)",
      "Credit / Paid (₹)",
      "TDS Deducted (₹)",
      "Running Balance (₹)",
      "Status"
    ]);

    ledgerEntries.forEach((entry, idx) => {
      csvRows.push([
        idx + 1,
        entry.date,
        entry.type,
        entry.ref,
        entry.particulars,
        entry.mode,
        entry.taxable > 0 ? entry.taxable : "-",
        entry.gst > 0 ? entry.gst : "-",
        entry.debit > 0 ? entry.debit : "-",
        entry.credit > 0 ? entry.credit : "-",
        entry.tds > 0 ? entry.tds : entry.debt > 0 ? entry.debt : "-",
        entry.runningBalance,
        entry.status
      ]);
    });

    csvRows.push([
      "TOTAL",
      "",
      `GRAND TOTAL (${ledgerEntries.length} TRANSACTIONS)`,
      "",
      "",
      "",
      Number(totalLedgerTaxable.toFixed(2)),
      Number(totalLedgerGst.toFixed(2)),
      Number(totalLedgerDebit.toFixed(2)),
      Number(totalLedgerCredit.toFixed(2)),
      Number(totalLedgerTds.toFixed(2)),
      Number((party.netOutstandingDue || 0).toFixed(2)),
      party.status === "paid" ? "SETTLED" : "DUE"
    ]);

    // Bills schedule section in CSV
    if (rawBills.length > 0) {
      csvRows.push([]);
      csvRows.push([`${isClient ? "INVOICES & BILLS SCHEDULE" : "PURCHASE BILLS SCHEDULE"}`]);
      csvRows.push([
        "SL No",
        "Bill Date",
        "Bill / Invoice No",
        "Due Date",
        "Taxable Amount (₹)",
        "GST 18% (₹)",
        "Total Invoiced (₹)",
        "Payment Dates & Settlement Details",
        "Paid Amount (₹)",
        "TDS Deducted & Dates (₹)",
        "Debt / Discount (₹)",
        "Remaining Due (₹)",
        "Payment Status"
      ]);
      let totCsvTaxable = 0;
      let totCsvGst = 0;
      let totCsvBilled = 0;
      let totCsvPaid = 0;
      let totCsvTds = 0;
      let totCsvDebt = 0;
      let totCsvDue = 0;

      rawBills.forEach((b, bIdx) => {
        const bTot = Number(b.amount || b.total) || 0;
        const bTax = Number(b.taxableAmount || b.taxable) || (b.gstAmount || b.gst ? bTot - Number(b.gstAmount || b.gst) : bTot / 1.18);
        const bGst = Number(b.gstAmount || b.gst) || (bTot - bTax);
        const bP = Number(b.paidAmount) || 0;
        const bT = Number(b.tdsAmount) || 0;
        const bD = Number(b.debtAmount) || 0;
        const bRem = Math.max(0, bTot - bP - bT - bD);
        const bSt = bRem <= 0.01 ? "PAID" : (bP > 0 || bT > 0 || bD > 0) ? "PARTIAL" : "UNPAID";
        const bDate = b.invoice_date || b.billDate || b.date || b.createdAt || b.invoiceDate || b.purchaseDate || b.lrDate;
        const bNo = (b.invoice || b.billNo || b.invoiceNo || b.purchaseNo || b.billNumber || b.invNo || b.refNo || (b.id ? String(b.id).slice(-6) : "") || "-").toUpperCase();
        const stDetails = getBillSettlementDetails(b, rawCash, rawAdj);

        totCsvTaxable += bTax;
        totCsvGst += bGst;
        totCsvBilled += bTot;
        totCsvPaid += bP;
        totCsvTds += bT;
        totCsvDebt += bD;
        totCsvDue += bRem;

        csvRows.push([
          bIdx + 1,
          formatDate(bDate),
          bNo,
          calculateDueDate(bDate, b.dueDate),
          Number(bTax.toFixed(2)),
          Number(bGst.toFixed(2)),
          bTot,
          stDetails.paymentSummary,
          bP,
          stDetails.tdsSummary,
          bD,
          bRem,
          bSt
        ]);
      });

      csvRows.push([
        "TOTAL",
        "",
        `TOTAL (${rawBills.length} BILLS)`,
        "",
        Number(totCsvTaxable.toFixed(2)),
        Number(totCsvGst.toFixed(2)),
        totCsvBilled,
        "",
        totCsvPaid,
        `TDS: ₹${totCsvTds.toFixed(2)}`,
        totCsvDebt,
        totCsvDue,
        totCsvDue <= 0.01 ? "SETTLED" : "DUE"
      ]);
    }

    const csvContent = csvRows
      .map((row) =>
        row
          .map((val) => {
            const str = String(val !== undefined && val !== null ? val : "");
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Ledger_Statement_${sanitizedPartyName}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // -------------------------------------------------------------
  // PROFESSIONAL EXCEL (.XLSX) EXPORT MODE
  // -------------------------------------------------------------
  const ExcelJS = await getExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Multimarg Carriers Pvt. Ltd.";
  workbook.created = new Date();

  const primaryColorHex = "FF1E3A8A"; // Deep Navy Blue
  const secondaryColorHex = "FFDBEAFE"; // Soft Blue
  const darkTextColorHex = "FF0F172A"; // Slate Dark
  const lightZebraHex = "FFF8FAFC"; // Clean Slate White
  const borderColorHex = "FFCBD5E1"; // Light Gray Border
  const accentRedHex = "FFE11D48";
  const accentGreenHex = "FF16A34A";
  const accentAmberHex = "FFD97706";

  const greenBgHex = "FFDCFCE7";
  const greenTextHex = "FF166534";
  const yellowBgHex = "FFFEF3C7";
  const yellowTextHex = "FF92400E";
  const redBgHex = "FFFEE2E2";
  const redTextHex = "FF991B1B";
  const purpleBgHex = "FFF3E8FF";
  const purpleTextHex = "FF6B21A8";

  // ─────────────────────────────────────────────────────────────
  // WORKSHEET 1: STATEMENT OF ACCOUNT (RUNNING LEDGER)
  // ─────────────────────────────────────────────────────────────
  const ws1 = workbook.addWorksheet("Statement of Account", {
    views: [{ showGridLines: true }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const columnsDef1 = [
    { header: "SL", key: "sl", width: 7, align: "center" },
    { header: "DATE", key: "date", width: 14, align: "center" },
    { header: "TRANSACTION TYPE", key: "type", width: 24 },
    { header: "REFERENCE / BILL NO", key: "ref", width: 22 },
    { header: "PARTICULARS / NARRATION", key: "particulars", width: 38 },
    { header: "PAYMENT MODE", key: "mode", width: 18, align: "center" },
    { header: "TAXABLE (₹)", key: "taxable", width: 16, align: "right", numFmt: "#,##0.00" },
    { header: "GST 18% (₹)", key: "gst", width: 16, align: "right", numFmt: "#,##0.00" },
    { header: "DEBIT / BILLED (₹)", key: "debit", width: 16, align: "right", numFmt: "#,##0.00" },
    { header: "CREDIT / PAID (₹)", key: "credit", width: 16, align: "right", numFmt: "#,##0.00" },
    { header: "TDS DEDUCTION (₹)", key: "tds", width: 16, align: "right", numFmt: "#,##0.00" },
    { header: "RUNNING BALANCE (₹)", key: "balance", width: 20, align: "right", numFmt: "#,##0.00" },
    { header: "STATUS", key: "status", width: 14, align: "center" },
  ];

  ws1.columns = columnsDef1.map((col) => ({
    key: col.key,
    width: col.width,
  }));

  const totalCols = columnsDef1.length;
  const lastColLetter = getColumnLetter(totalCols);

  // Set Row Heights for Header
  ws1.getRow(1).height = 25;
  ws1.getRow(2).height = 17;
  ws1.getRow(3).height = 17;
  ws1.getRow(4).height = 17;
  ws1.getRow(5).height = 6;  // Spacer

  // Company Logo on Top Left
  const logoBuffer = await fetchImageBuffer("/mc.png");
  if (logoBuffer) {
    try {
      const imageId = workbook.addImage({
        buffer: logoBuffer,
        extension: "png",
      });
      ws1.addImage(imageId, {
        tl: { col: 0.15, row: 0.15 },
        ext: { width: 90, height: 90 },
      });
    } catch (_imgErr) {
      console.warn("Could not insert logo image into Excel:", _imgErr);
    }
  }

  // Row 1: Company Title
  ws1.mergeCells(`C1:${lastColLetter}1`);
  const cTitle = ws1.getCell("C1");
  cTitle.value = "MULTIMARG CARRIERS PVT. LTD.";
  cTitle.font = { name: "Calibri", size: 16, bold: true, color: { argb: primaryColorHex } };
  cTitle.alignment = { horizontal: "center", vertical: "middle" };

  // Row 2: Address
  ws1.mergeCells(`C2:${lastColLetter}2`);
  const cAddr = ws1.getCell("C2");
  cAddr.value = "LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND-263153";
  cAddr.font = { name: "Calibri", size: 9.5, color: { argb: "FF334155" } };
  cAddr.alignment = { horizontal: "center", vertical: "middle" };

  // Row 3: Tax Info
  ws1.mergeCells(`C3:${lastColLetter}3`);
  const cTax = ws1.getCell("C3");
  cTax.value = "GSTIN: 05AANCM3054E1ZN   |   PAN: AANCM3054E1ZN";
  cTax.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
  cTax.alignment = { horizontal: "center", vertical: "middle" };

  // Row 4: Contact
  ws1.mergeCells(`C4:${lastColLetter}4`);
  const cContact = ws1.getCell("C4");
  cContact.value = "CONTACT: +91 5944-324033   |   EMAIL: info@multimarg.com   |   WEBSITE: www.multimarg.com";
  cContact.font = { name: "Calibri", size: 9, color: { argb: "FF334155" } };
  cContact.alignment = { horizontal: "center", vertical: "middle" };

  // Row 6: Statement Banner
  ws1.mergeCells(`A6:${lastColLetter}6`);
  const banner1 = ws1.getCell("A6");
  banner1.value = `STATEMENT OF ACCOUNT & OUTSTANDING LEDGER - ${toExportCaps(partyName)}`;
  banner1.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  banner1.alignment = { horizontal: "center", vertical: "middle" };
  banner1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: primaryColorHex } };
  ws1.getRow(6).height = 26;

  // Row 7: Info Bar
  ws1.mergeCells(`A7:E7`);
  const metaLeft = ws1.getCell("A7");
  metaLeft.value = `Generated Date: ${formattedToday}   |   Account Type: ${partyTypeLabel}`;
  metaLeft.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FF334155" } };
  metaLeft.alignment = { horizontal: "left", vertical: "middle" };

  ws1.mergeCells(`F7:${lastColLetter}7`);
  const metaRight = ws1.getCell("F7");
  metaRight.value = `Statement Period: Complete Financial History`;
  metaRight.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: primaryColorHex } };
  metaRight.alignment = { horizontal: "right", vertical: "middle" };
  ws1.getRow(7).height = 20;

  for (let c = 1; c <= totalCols; c++) {
    const colRef = getColumnLetter(c);
    const cell = ws1.getCell(`${colRef}7`);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: secondaryColorHex } };
    cell.border = { bottom: { style: "thin", color: { argb: borderColorHex } } };
  }

  // Row 8: Spacer
  ws1.getRow(8).height = 6;

  // Rows 9 to 12: Party Information Card (Left) & Financial Summary Card (Right)
  // Left: Party Details Box (A9:E12)
  ws1.mergeCells("A9:E9");
  const pCardHead = ws1.getCell("A9");
  pCardHead.value = "ACCOUNT & BILLING PROFILE";
  pCardHead.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: primaryColorHex } };
  pCardHead.alignment = { horizontal: "left", vertical: "middle" };

  ws1.mergeCells("A10:E10");
  const pCardRow1 = ws1.getCell("A10");
  pCardRow1.value = `Party Name: ${toExportCaps(partyName)}   |   Code: ${party.code || "-"}`;
  pCardRow1.font = { name: "Calibri", size: 9, bold: true, color: { argb: darkTextColorHex } };

  ws1.mergeCells("A11:E11");
  const pCardRow2 = ws1.getCell("A11");
  pCardRow2.value = `GSTIN: ${party.gst || "-"}   |   Contact: ${party.contact || "-"}`;
  pCardRow2.font = { name: "Calibri", size: 9, color: { argb: "FF334155" } };

  ws1.mergeCells("A12:E12");
  const pCardRow3 = ws1.getCell("A12");
  pCardRow3.value = `Address: ${party.address || "-"}`;
  pCardRow3.font = { name: "Calibri", size: 8.5, color: { argb: "FF334155" } };
  pCardRow3.alignment = { horizontal: "left", vertical: "top", wrapText: true };

  // Style Left Box
  for (let r = 9; r <= 12; r++) {
    ws1.getRow(r).height = r === 12 && (party.address || "").length > 45 ? 26 : 18;
    for (let c = 1; c <= 5; c++) {
      const colLetter = getColumnLetter(c);
      const cell = ws1.getCell(`${colLetter}${r}`);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      cell.border = {
        top: r === 9 ? { style: "thin", color: { argb: primaryColorHex } } : undefined,
        bottom: r === 12 ? { style: "thin", color: { argb: borderColorHex } } : undefined,
        left: c === 1 ? { style: "thin", color: { argb: borderColorHex } } : undefined,
        right: c === 5 ? { style: "thin", color: { argb: borderColorHex } } : undefined,
      };
    }
  }

  // Right: Financial Summary Box (F9:J12)
  ws1.mergeCells("F9:J9");
  const sCardHead = ws1.getCell("F9");
  sCardHead.value = "EXECUTIVE FINANCIAL POSITION";
  sCardHead.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: primaryColorHex } };
  sCardHead.alignment = { horizontal: "left", vertical: "middle" };

  ws1.mergeCells("F10:H10");
  const sRow1L = ws1.getCell("F10");
  sRow1L.value = `Prior FY Opening Due: ₹ ${(party.openingDue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  sRow1L.font = { name: "Calibri", size: 9, color: { argb: "FF92400E" } };

  ws1.mergeCells("I10:J10");
  const sRow1R = ws1.getCell("I10");
  sRow1R.value = `Total Invoiced: ₹ ${(party.totalInvoiced || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  sRow1R.font = { name: "Calibri", size: 9, bold: true, color: { argb: darkTextColorHex } };

  ws1.mergeCells("F11:H11");
  const sRow2L = ws1.getCell("F11");
  sRow2L.value = `Total Paid / Received: ₹ ${(party.totalPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  sRow2L.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF166534" } };

  ws1.mergeCells("I11:J11");
  const sRow2R = ws1.getCell("I11");
  sRow2R.value = `TDS / Debt Adj: ₹ ${((party.totalTds || 0) + (party.totalDebt || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  sRow2R.font = { name: "Calibri", size: 9, color: { argb: "FF6B21A8" } };

  // NET OUTSTANDING ROW (Row 12)
  ws1.mergeCells("F12:H12");
  const netDueLabel = ws1.getCell("F12");
  netDueLabel.value = `NET OUTSTANDING BALANCE DUE: ₹ ${(party.netOutstandingDue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  netDueLabel.font = { name: "Calibri", size: 10, bold: true, color: { argb: (party.netOutstandingDue || 0) > 0 ? accentRedHex : accentGreenHex } };
  netDueLabel.alignment = { horizontal: "left", vertical: "middle" };

  ws1.mergeCells("I12:J12");
  const netStatusCell = ws1.getCell("I12");
  netStatusCell.value = `STATUS: ${party.status === "paid" ? "SETTLED (100%)" : party.status === "partial" ? `PARTIAL (${party.recoveryPercent}%)` : "OVERDUE (0%)"}`;
  netStatusCell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: party.status === "paid" ? greenTextHex : party.status === "partial" ? yellowTextHex : redTextHex } };
  netStatusCell.alignment = { horizontal: "center", vertical: "middle" };

  // Style Right Box
  for (let r = 9; r <= 12; r++) {
    for (let c = 6; c <= totalCols; c++) {
      const colLetter = getColumnLetter(c);
      const cell = ws1.getCell(`${colLetter}${r}`);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: r === 12 ? (party.netOutstandingDue > 0 ? redBgHex : greenBgHex) : "FFF1F5F9" };
      cell.border = {
        top: r === 9 ? { style: "thin", color: { argb: primaryColorHex } } : undefined,
        bottom: r === 12 ? { style: "thin", color: { argb: borderColorHex } } : undefined,
        left: c === 6 ? { style: "thin", color: { argb: borderColorHex } } : undefined,
        right: c === totalCols ? { style: "thin", color: { argb: borderColorHex } } : undefined,
      };
    }
  }

  // Row 13: Spacer
  ws1.getRow(13).height = 8;

  // Row 14: Table Headers for Ledger
  const headerRow1 = ws1.addRow(columnsDef1.map((c) => toExportCaps(c.header)));
  headerRow1.height = 26;
  headerRow1.eachCell((cell, colNumber) => {
    const colDef = columnsDef1[colNumber - 1] || {};
    cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = {
      horizontal: colDef.align || (colDef.numFmt ? "right" : "left"),
      vertical: "middle",
      wrapText: true,
    };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: primaryColorHex } };
    cell.border = {
      top: { style: "medium", color: { argb: primaryColorHex } },
      bottom: { style: "medium", color: { argb: primaryColorHex } },
      left: { style: "thin", color: { argb: "33FFFFFF" } },
      right: { style: "thin", color: { argb: "33FFFFFF" } },
    };
  });

  // Data Rows (Row 15 onwards)
  let currentRowIndex = 15;
  ledgerEntries.forEach((entry, idx) => {
    const isZebra = idx % 2 === 1;
    const rowBg = isZebra ? lightZebraHex : "FFFFFFFF";

    const rowValues = [
      idx + 1,
      entry.date,
      entry.type,
      entry.ref,
      entry.particulars,
      entry.mode,
      entry.taxable > 0 ? entry.taxable : "-",
      entry.gst > 0 ? entry.gst : "-",
      entry.debit > 0 ? entry.debit : "-",
      entry.credit > 0 ? entry.credit : "-",
      entry.tds > 0 ? entry.tds : entry.debt > 0 ? entry.debt : "-",
      entry.runningBalance,
      entry.status,
    ];

    const dataRow = ws1.addRow(rowValues);
    dataRow.height = 20;

    dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colDef = columnsDef1[colNumber - 1] || {};
      cell.font = { name: "Calibri", size: 9, color: { argb: darkTextColorHex } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      cell.alignment = {
        horizontal: colDef.align || (typeof cell.value === "number" ? "right" : "left"),
        vertical: "middle",
      };

      if (colDef.numFmt && typeof cell.value === "number") {
        cell.numFmt = colDef.numFmt;
      }

      // Format Status column with colored pills
      if (colDef.key === "status") {
        const st = String(cell.value || "").toUpperCase();
        if (st === "PAID" || st === "SETTLED") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: greenBgHex } };
          cell.font = { name: "Calibri", size: 8.5, bold: true, color: { argb: greenTextHex } };
        } else if (st === "PARTIAL") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: yellowBgHex } };
          cell.font = { name: "Calibri", size: 8.5, bold: true, color: { argb: yellowTextHex } };
        } else if (st === "UNPAID" || st === "OVERDUE") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: redBgHex } };
          cell.font = { name: "Calibri", size: 8.5, bold: true, color: { argb: redTextHex } };
        } else if (st === "ADJUSTED") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: purpleBgHex } };
          cell.font = { name: "Calibri", size: 8.5, bold: true, color: { argb: purpleTextHex } };
        }
      }

      // Highlight Running Balance
      if (colDef.key === "balance" && typeof cell.value === "number") {
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: cell.value > 0 ? (isClient ? primaryColorHex : accentRedHex) : accentGreenHex } };
      }

      cell.border = {
        top: { style: "thin", color: { argb: borderColorHex } },
        bottom: { style: "thin", color: { argb: borderColorHex } },
        left: { style: "thin", color: { argb: borderColorHex } },
        right: { style: "thin", color: { argb: borderColorHex } },
      };
    });

    currentRowIndex++;
  });

  // Grand Total Summary Row for Worksheet 1
  const totalRowNumber1 = currentRowIndex;
  ws1.mergeCells(`A${totalRowNumber1}:F${totalRowNumber1}`);
  const grandLabelCell1 = ws1.getCell(`A${totalRowNumber1}`);
  grandLabelCell1.value = `GRAND TOTAL (${ledgerEntries.length} TRANSACTIONS)`;
  grandLabelCell1.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: primaryColorHex } };
  grandLabelCell1.alignment = { horizontal: "right", vertical: "middle" };

  const taxableTotCell = ws1.getCell(`G${totalRowNumber1}`);
  taxableTotCell.value = Number(totalLedgerTaxable.toFixed(2));
  taxableTotCell.numFmt = "#,##0.00";
  taxableTotCell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FF475569" } };
  taxableTotCell.alignment = { horizontal: "right", vertical: "middle" };

  const gstTotCell = ws1.getCell(`H${totalRowNumber1}`);
  gstTotCell.value = Number(totalLedgerGst.toFixed(2));
  gstTotCell.numFmt = "#,##0.00";
  gstTotCell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FF4F46E5" } };
  gstTotCell.alignment = { horizontal: "right", vertical: "middle" };

  const debitTotCell = ws1.getCell(`I${totalRowNumber1}`);
  debitTotCell.value = Number(totalLedgerDebit.toFixed(2));
  debitTotCell.numFmt = "#,##0.00";
  debitTotCell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: primaryColorHex } };
  debitTotCell.alignment = { horizontal: "right", vertical: "middle" };

  const creditTotCell = ws1.getCell(`J${totalRowNumber1}`);
  creditTotCell.value = Number(totalLedgerCredit.toFixed(2));
  creditTotCell.numFmt = "#,##0.00";
  creditTotCell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FF166534" } };
  creditTotCell.alignment = { horizontal: "right", vertical: "middle" };

  const tdsTotCell = ws1.getCell(`K${totalRowNumber1}`);
  tdsTotCell.value = Number(totalLedgerTds.toFixed(2));
  tdsTotCell.numFmt = "#,##0.00";
  tdsTotCell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FF92400E" } };
  tdsTotCell.alignment = { horizontal: "right", vertical: "middle" };

  const finalBalCell = ws1.getCell(`L${totalRowNumber1}`);
  finalBalCell.value = Number((party.netOutstandingDue || 0).toFixed(2));
  finalBalCell.numFmt = "#,##0.00";
  finalBalCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: (party.netOutstandingDue || 0) > 0 ? accentRedHex : accentGreenHex } };
  finalBalCell.alignment = { horizontal: "right", vertical: "middle" };

  const finalStatusCell = ws1.getCell(`M${totalRowNumber1}`);
  finalStatusCell.value = party.status === "paid" ? "SETTLED" : "DUE";
  finalStatusCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: party.status === "paid" ? greenTextHex : redTextHex } };
  finalStatusCell.alignment = { horizontal: "center", vertical: "middle" };

  ws1.getRow(totalRowNumber1).height = 24;
  for (let c = 1; c <= totalCols; c++) {
    const colLetter = getColumnLetter(c);
    const cell = ws1.getCell(`${colLetter}${totalRowNumber1}`);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: secondaryColorHex } };
    cell.border = {
      top: { style: "medium", color: { argb: primaryColorHex } },
      bottom: { style: "double", color: { argb: primaryColorHex } },
      left: { style: "thin", color: { argb: borderColorHex } },
      right: { style: "thin", color: { argb: borderColorHex } },
    };
  }

  // Sign-off / Verification Footer (Row + 3)
  const signRow = totalRowNumber1 + 3;
  ws1.mergeCells(`A${signRow}:E${signRow}`);
  const prepCell = ws1.getCell(`A${signRow}`);
  prepCell.value = "Prepared By: Accounts Department\nMultimarg Carriers Pvt. Ltd.";
  prepCell.font = { name: "Calibri", size: 9, color: { argb: "FF475569" } };
  prepCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

  ws1.mergeCells(`F${signRow}:${lastColLetter}${signRow}`);
  const authCell = ws1.getCell(`F${signRow}`);
  authCell.value = "For MULTIMARG CARRIERS PVT. LTD.\n\n\nAuthorized Signatory";
  authCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: primaryColorHex } };
  authCell.alignment = { horizontal: "right", vertical: "middle", wrapText: true };
  ws1.getRow(signRow).height = 36;

  // ─────────────────────────────────────────────────────────────
  // WORKSHEET 2: DETAILED INVOICES & BILLS SCHEDULE
  // ─────────────────────────────────────────────────────────────
  if (rawBills.length > 0) {
    const ws2 = workbook.addWorksheet("Invoices Schedule", {
      views: [{ showGridLines: true }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const columnsDef2 = [
      { header: "SL", key: "sl", width: 6, align: "center" },
      { header: "BILL DATE", key: "billDate", width: 13, align: "center" },
      { header: "BILL / INVOICE NO", key: "billNo", width: 22 },
      { header: "DUE DATE", key: "dueDate", width: 13, align: "center" },
      { header: "VEHICLE / DETAILS", key: "details", width: 24 },
      { header: "TAXABLE AMOUNT (₹)", key: "taxable", width: 18, align: "right", numFmt: "#,##0.00" },
      { header: "GST 18% (₹)", key: "gst", width: 14, align: "right", numFmt: "#,##0.00" },
      { header: "TOTAL INVOICED (₹)", key: "total", width: 18, align: "right", numFmt: "#,##0.00" },
      { header: "TOTAL PAID (₹)", key: "paid", width: 16, align: "right", numFmt: "#,##0.00" },
      { header: "PAYMENT DATES & MODE", key: "payments", width: 32 },
      { header: "TDS DEDUCTED (₹)", key: "tds", width: 16, align: "right", numFmt: "#,##0.00" },
      { header: "DEBT / DISCOUNT (₹)", key: "debt", width: 16, align: "right", numFmt: "#,##0.00" },
      { header: "REMAINING DUE (₹)", key: "due", width: 18, align: "right", numFmt: "#,##0.00" },
      { header: "STATUS", key: "status", width: 14, align: "center" },
    ];

    ws2.columns = columnsDef2.map((col) => ({ key: col.key, width: col.width }));
    const totalCols2 = columnsDef2.length;
    const lastColLetter2 = getColumnLetter(totalCols2);

    // Banner
    ws2.mergeCells(`A1:${lastColLetter2}1`);
    const bCell2 = ws2.getCell("A1");
    bCell2.value = `${isClient ? "SALES INVOICES" : "PURCHASE BILLS"} SCHEDULE - ${toExportCaps(partyName)}`;
    bCell2.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    bCell2.alignment = { horizontal: "center", vertical: "middle" };
    bCell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: primaryColorHex } };
    ws2.getRow(1).height = 26;

    // Header Row
    const headerRow2 = ws2.addRow(columnsDef2.map((c) => toExportCaps(c.header)));
    headerRow2.height = 24;
    headerRow2.eachCell((cell, colNumber) => {
      const colDef = columnsDef2[colNumber - 1] || {};
      cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: colDef.align || "left", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: primaryColorHex } };
      cell.border = {
        top: { style: "medium", color: { argb: primaryColorHex } },
        bottom: { style: "medium", color: { argb: primaryColorHex } },
      };
    });

    let totTaxable2 = 0;
    let totGst2 = 0;
    let totBilled2 = 0;
    let totPaid2 = 0;
    let totTds2 = 0;
    let totDebt2 = 0;
    let totDue2 = 0;

    rawBills.forEach((b, idx) => {
      const bTot = Number(b.amount || b.total) || 0;
      const bTax = Number(b.taxableAmount || b.taxable) || (b.gstAmount || b.gst ? bTot - Number(b.gstAmount || b.gst) : bTot / 1.18);
      const bGst = Number(b.gstAmount || b.gst) || (bTot - bTax);
      const bP = Number(b.paidAmount) || 0;
      const bT = Number(b.tdsAmount) || 0;
      const bD = Number(b.debtAmount) || 0;
      const isCanc = String(b.status || "").toLowerCase() === "cancelled";
      const bRem = isCanc ? 0 : Math.max(0, bTot - bP - bT - bD);
      const bSt = isCanc ? "CANCELLED" : bRem <= 0.01 ? "PAID" : (bP > 0 || bT > 0 || bD > 0) ? "PARTIAL" : "UNPAID";

      totTaxable2 += bTax;
      totGst2 += bGst;
      totBilled2 += bTot;
      totPaid2 += bP;
      totTds2 += bT;
      totDebt2 += bD;
      totDue2 += bRem;

      const bDate = b.invoice_date || b.billDate || b.date || b.createdAt || b.invoiceDate || b.purchaseDate || b.lrDate;
      const bNo = (b.invoice || b.billNo || b.invoiceNo || b.purchaseNo || b.billNumber || b.invNo || b.refNo || (b.id ? String(b.id).slice(-6) : "") || "-").toUpperCase();
      const stDetails = getBillSettlementDetails(b, rawCash, rawAdj);

      const rowVals2 = [
        idx + 1,
        formatDate(bDate),
        bNo,
        calculateDueDate(bDate, b.dueDate),
        b.vehicleNo || b.vehicles || b.description || "-",
        Number(bTax.toFixed(2)),
        Number(bGst.toFixed(2)),
        bTot,
        bP,
        stDetails.paymentDateList || "-",
        bT,
        bD,
        bRem,
        bSt,
      ];

      const r2 = ws2.addRow(rowVals2);
      r2.height = 20;
      r2.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const colDef = columnsDef2[colNumber - 1] || {};
        cell.font = { name: "Calibri", size: 9, color: { argb: darkTextColorHex } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 1 ? lightZebraHex : "FFFFFFFF" } };
        cell.alignment = { horizontal: colDef.align || "left", vertical: "middle" };
        if (colDef.numFmt && typeof cell.value === "number") cell.numFmt = colDef.numFmt;

        if (colDef.key === "status") {
          const st = String(cell.value || "").toUpperCase();
          if (st === "PAID") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: greenBgHex } };
            cell.font = { name: "Calibri", size: 8.5, bold: true, color: { argb: greenTextHex } };
          } else if (st === "PARTIAL") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: yellowBgHex } };
            cell.font = { name: "Calibri", size: 8.5, bold: true, color: { argb: yellowTextHex } };
          } else if (st === "UNPAID") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: redBgHex } };
            cell.font = { name: "Calibri", size: 8.5, bold: true, color: { argb: redTextHex } };
          }
        }

        cell.border = {
          top: { style: "thin", color: { argb: borderColorHex } },
          bottom: { style: "thin", color: { argb: borderColorHex } },
          left: { style: "thin", color: { argb: borderColorHex } },
          right: { style: "thin", color: { argb: borderColorHex } },
        };
      });
    });

    // Summary row for ws2
    const totRow2Number = ws2.rowCount + 1;
    ws2.mergeCells(`A${totRow2Number}:E${totRow2Number}`);
    const lbl2 = ws2.getCell(`A${totRow2Number}`);
    lbl2.value = `GRAND TOTAL (${rawBills.length} BILLS)`;
    lbl2.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: primaryColorHex } };
    lbl2.alignment = { horizontal: "right", vertical: "middle" };

    const setTotCell = (colL, val) => {
      const c = ws2.getCell(`${colL}${totRow2Number}`);
      c.value = Number(val.toFixed(2));
      c.numFmt = "#,##0.00";
      c.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: primaryColorHex } };
      c.alignment = { horizontal: "right", vertical: "middle" };
    };

    setTotCell("F", totTaxable2);
    setTotCell("G", totGst2);
    setTotCell("H", totBilled2);
    setTotCell("I", totPaid2);
    
    // Empty cell for payment dates column J
    const jCell = ws2.getCell(`J${totRow2Number}`);
    jCell.value = "";

    setTotCell("K", totTds2);
    setTotCell("L", totDebt2);
    setTotCell("M", totDue2);

    const stCell = ws2.getCell(`N${totRow2Number}`);
    stCell.value = totDue2 <= 0.01 ? "SETTLED" : "DUE";
    stCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: totDue2 <= 0.01 ? greenTextHex : redTextHex } };
    stCell.alignment = { horizontal: "center", vertical: "middle" };

    ws2.getRow(totRow2Number).height = 24;
    for (let c = 1; c <= totalCols2; c++) {
      const colL = getColumnLetter(c);
      const cell = ws2.getCell(`${colL}${totRow2Number}`);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: secondaryColorHex } };
      cell.border = {
        top: { style: "medium", color: { argb: primaryColorHex } },
        bottom: { style: "double", color: { argb: primaryColorHex } },
        left: { style: "thin", color: { argb: borderColorHex } },
        right: { style: "thin", color: { argb: borderColorHex } },
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // WORKSHEET 3: PAYMENTS, RECEIPTS & ADJUSTMENTS SCHEDULE
  // ─────────────────────────────────────────────────────────────
  if (rawCash.length > 0 || rawAdj.length > 0) {
    const ws3 = workbook.addWorksheet("Payments & Adjustments", {
      views: [{ showGridLines: true }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const columnsDef3 = [
      { header: "SL", key: "sl", width: 7, align: "center" },
      { header: "DATE", key: "date", width: 14, align: "center" },
      { header: "CATEGORY / TYPE", key: "type", width: 26 },
      { header: "VOUCHER / REF NO", key: "ref", width: 22 },
      { header: "PAYMENT MODE", key: "mode", width: 18, align: "center" },
      { header: "NARRATION / REMARKS", key: "narration", width: 38 },
      { header: "AMOUNT (₹)", key: "amount", width: 18, align: "right", numFmt: "#,##0.00" },
    ];

    ws3.columns = columnsDef3.map((c) => ({ key: c.key, width: c.width }));
    const totalCols3 = columnsDef3.length;
    const lastColLetter3 = getColumnLetter(totalCols3);

    // Banner
    ws3.mergeCells(`A1:${lastColLetter3}1`);
    const bCell3 = ws3.getCell("A1");
    bCell3.value = `PAYMENTS, RECEIPTS & TAX ADJUSTMENTS - ${toExportCaps(partyName)}`;
    bCell3.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    bCell3.alignment = { horizontal: "center", vertical: "middle" };
    bCell3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: primaryColorHex } };
    ws3.getRow(1).height = 26;

    // Header Row
    const headerRow3 = ws3.addRow(columnsDef3.map((c) => toExportCaps(c.header)));
    headerRow3.height = 24;
    headerRow3.eachCell((cell, colNumber) => {
      const colDef = columnsDef3[colNumber - 1] || {};
      cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: colDef.align || "left", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: primaryColorHex } };
      cell.border = {
        top: { style: "medium", color: { argb: primaryColorHex } },
        bottom: { style: "medium", color: { argb: primaryColorHex } },
      };
    });

    let totalDisbursements = 0;
    const allPayItems = [];

    rawCash.forEach((c) => {
      const amt = Number(c.amount) || 0;
      allPayItems.push({
        date: formatDate(c.date || c.createdAt),
        type: c.type === "in" ? "CASH/BANK RECEIPT" : "CASH/BANK PAYMENT",
        ref: c.voucherNo || c.referenceNo || c.chequeNo || "-",
        mode: c.paymentMode || c.mode || "BANK / CASH",
        narration: c.narration || c.notes || c.particulars || (c.type === "in" ? "Payment Received" : "Payment Disbursed"),
        amount: amt,
      });
    });

    rawAdj.forEach((adj) => {
      const amt = Number(adj.amount) || 0;
      const part = String(adj.particulars || "tds").toLowerCase();
      allPayItems.push({
        date: formatDate(adj.date || adj.createdAt),
        type: part === "tds" ? "TDS / TAX DEDUCTION" : "BAD DEBT / DISCOUNT",
        ref: adj.voucherNo || adj.referenceNo || "ADJ-ENTRY",
        mode: part === "tds" ? "TAX DEDUCTED" : "DISCOUNT",
        narration: adj.remarks || adj.reason || (part === "tds" ? "Tax Deducted at Source (TDS)" : "Bad Debt / Discount Allowed"),
        amount: amt,
      });
    });

    allPayItems.forEach((pItem, idx) => {
      totalDisbursements += pItem.amount;
      const rowVals3 = [
        idx + 1,
        pItem.date,
        pItem.type,
        pItem.ref,
        pItem.mode,
        pItem.narration,
        pItem.amount,
      ];

      const r3 = ws3.addRow(rowVals3);
      r3.height = 20;
      r3.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const colDef = columnsDef3[colNumber - 1] || {};
        cell.font = { name: "Calibri", size: 9, color: { argb: darkTextColorHex } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 1 ? lightZebraHex : "FFFFFFFF" } };
        cell.alignment = { horizontal: colDef.align || "left", vertical: "middle" };
        if (colDef.numFmt && typeof cell.value === "number") cell.numFmt = colDef.numFmt;

        cell.border = {
          top: { style: "thin", color: { argb: borderColorHex } },
          bottom: { style: "thin", color: { argb: borderColorHex } },
          left: { style: "thin", color: { argb: borderColorHex } },
          right: { style: "thin", color: { argb: borderColorHex } },
        };
      });
    });

    // Summary Row for ws3
    const totRow3Number = ws3.rowCount + 1;
    ws3.mergeCells(`A${totRow3Number}:F${totRow3Number}`);
    const lbl3 = ws3.getCell(`A${totRow3Number}`);
    lbl3.value = `TOTAL PAYMENTS & ADJUSTMENTS (${allPayItems.length} RECORDS)`;
    lbl3.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: primaryColorHex } };
    lbl3.alignment = { horizontal: "right", vertical: "middle" };

    const amtTotCell = ws3.getCell(`G${totRow3Number}`);
    amtTotCell.value = Number(totalDisbursements.toFixed(2));
    amtTotCell.numFmt = "#,##0.00";
    amtTotCell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: primaryColorHex } };
    amtTotCell.alignment = { horizontal: "right", vertical: "middle" };

    ws3.getRow(totRow3Number).height = 24;
    for (let c = 1; c <= totalCols3; c++) {
      const colL = getColumnLetter(c);
      const cell = ws3.getCell(`${colL}${totRow3Number}`);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: secondaryColorHex } };
      cell.border = {
        top: { style: "medium", color: { argb: primaryColorHex } },
        bottom: { style: "double", color: { argb: primaryColorHex } },
        left: { style: "thin", color: { argb: borderColorHex } },
        right: { style: "thin", color: { argb: borderColorHex } },
      };
    }
  }

  // 10. Generate and Download Excel File
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Statement_Of_Account_${sanitizedPartyName}_${today}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
