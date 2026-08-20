import { formatDate } from "./formatters";

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
  const companyContact = "Contact: +91 5944-324033  |  Email: info@multimarg.com  |  Website: www.multimarg.com";
  const companyTaxInfo = "GSTIN: 05AANCM3054E1ZN  |  PAN: AANCM3054E1ZN";
  const companyTagline = "EXPRESS CARGO & SUPPLY CHAIN MANAGEMENT SERVICES";

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
  worksheet.getRow(1).height = 24;
  worksheet.getRow(2).height = 16;
  worksheet.getRow(3).height = 16;
  worksheet.getRow(4).height = 16;
  worksheet.getRow(5).height = 16;
  worksheet.getRow(6).height = 6;  // Spacer

  // 3. Company Logo (High Resolution & Prominent on Top Left)
  const logoBuffer = await fetchImageBuffer("/mc.png");
  if (logoBuffer) {
    try {
      const imageId = workbook.addImage({
        buffer: logoBuffer,
        extension: "png",
      });
      worksheet.addImage(imageId, {
        tl: { col: 0.15, row: 0.2 },
        ext: { width: 175, height: 72 },
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
  addrCell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FF475569" } };
  addrCell.alignment = { horizontal: "center", vertical: "middle" };

  // Row 3: Contact Details
  worksheet.mergeCells(`${headerStartLetter}3:${lastColLetter}3`);
  const contactCell = worksheet.getCell(`${headerStartLetter}3`);
  contactCell.value = companyContact;
  contactCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF334155" } };
  contactCell.alignment = { horizontal: "center", vertical: "middle" };

  // Row 4: GSTIN & PAN Details
  worksheet.mergeCells(`${headerStartLetter}4:${lastColLetter}4`);
  const taxCell = worksheet.getCell(`${headerStartLetter}4`);
  taxCell.value = companyTaxInfo;
  taxCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
  taxCell.alignment = { horizontal: "center", vertical: "middle" };

  // Row 5: Tagline / Business Scope
  worksheet.mergeCells(`${headerStartLetter}5:${lastColLetter}5`);
  const taglineCell = worksheet.getCell(`${headerStartLetter}5`);
  taglineCell.value = companyTagline;
  taglineCell.font = { name: "Calibri", size: 8.5, italic: true, color: { argb: "FF64748B" } };
  taglineCell.alignment = { horizontal: "center", vertical: "middle" };

  // 5. Report Banner (Row 7)
  worksheet.mergeCells(`A7:${lastColLetter}7`);
  const bannerCell = worksheet.getCell("A7");
  bannerCell.value = `${reportTitle} ${subtitle ? ` - ${subtitle}` : ""}`.toUpperCase();
  bannerCell.font = { name: "Calibri", size: 11.5, bold: true, color: { argb: "FFFFFFFF" } };
  bannerCell.alignment = { horizontal: "center", vertical: "middle" };
  bannerCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: primaryColorHex },
  };
  worksheet.getRow(7).height = 26;

  // 6. Metadata Info Bar (Row 8)
  const halfCol = Math.floor(totalColCount / 2);
  const midLeftLetter = getColumnLetter(halfCol);
  const midRightLetter = getColumnLetter(halfCol + 1);

  worksheet.mergeCells(`A8:${midLeftLetter}8`);
  const metaLeft = worksheet.getCell("A8");
  metaLeft.value = `Exported Date: ${formatDate(new Date())}   |   Total Records: ${rows.length}`;
  metaLeft.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF334155" } };
  metaLeft.alignment = { horizontal: "left", vertical: "middle" };

  worksheet.mergeCells(`${midRightLetter}8:${lastColLetter}8`);
  const metaRight = worksheet.getCell(`${midRightLetter}8`);
  metaRight.value = "Generated from Multimarg ERP System";
  metaRight.font = { name: "Calibri", size: 9, bold: true, color: { argb: primaryColorHex } };
  metaRight.alignment = { horizontal: "right", vertical: "middle" };
  worksheet.getRow(8).height = 20;

  for (let c = 1; c <= totalColCount; c++) {
    const colRef = getColumnLetter(c);
    const cell = worksheet.getCell(`${colRef}8`);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: secondaryColorHex } };
    cell.border = { bottom: { style: "thin", color: { argb: borderColorHex } } };
  }

  // Row 9: Buffer row
  worksheet.getRow(9).height = 6;

  // 7. Table Headers (Row 10)
  const tableHeaderNames = columns.map((col) => col.header);
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

  // 8. Data Rows
  let currentRowIndex = 11;

  rows.forEach((rowArr, rIdx) => {
    const isZebra = rIdx % 2 === 1;
    const rowBg = isZebra ? lightZebraHex : "FFFFFFFF";

    const dataRow = worksheet.addRow(rowArr);
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
    headers.join(","),
    ...rows.map((row) =>
      row.map((val) => `"${String(val !== undefined && val !== null ? val : "").replace(/"/g, '""')}"`).join(",")
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
    { header: "Actual Wt (KG)", width: 14, align: "right", numFmt: "#,##0.00" },
    { header: "Charged Wt (KG)", width: 14, align: "right", numFmt: "#,##0.00" },
    { header: "Rate (₹)", width: 12, align: "right", numFmt: "#,##0.00" },
    { header: "Freight (₹)", width: 14, align: "right", numFmt: "#,##0.00" },
    { header: "Docket (₹)", width: 12, align: "right", numFmt: "#,##0.00" },
    { header: "FOV (₹)", width: 12, align: "right", numFmt: "#,##0.00" },
    { header: "Other Chg (₹)", width: 12, align: "right", numFmt: "#,##0.00" },
    { header: "Total Amount (₹)", width: 16, align: "right", numFmt: "#,##0.00" },
    { header: "Payment Mode", width: 14, align: "center" },
    { header: "Invoice No", width: 16 },
    { header: "Invoice Date", width: 14, align: "center" },
    { header: "Part No", width: 14 },
    { header: "Qty", width: 10, align: "center" },
    { header: "Invoice Value (₹)", width: 16, align: "right", numFmt: "#,##0.00" },
    { header: "E-Way Bill No", width: 18 },
  ];

  let sl = 1;
  let totalBoxes = 0;
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

    const parcels = b.parcels && b.parcels.length > 0 ? b.parcels : [{}];

    parcels.forEach((p, pIdx) => {
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
        pIdx === 0 ? (actWt || "-") : "",
        pIdx === 0 ? (chgWt || "-") : "",
        pIdx === 0 ? (rate || "-") : "",
        pIdx === 0 ? (freight || "-") : "",
        pIdx === 0 ? (docket || "-") : "",
        pIdx === 0 ? (fov || "-") : "",
        pIdx === 0 ? (other || "-") : "",
        pIdx === 0 ? (totalAmt || "-") : "",
        pIdx === 0 ? (b.payment_type || b.paymentMode || "TBB") : "",
        p.invoice || p.invoiceNo || "-",
        p.invdate || p.invoiceDate ? formatDate(p.invdate || p.invoiceDate) : "-",
        p.part || p.partNumber || "-",
        p.quantity || "-",
        p.value || p.invoiceValue ? parseFloat(p.value || p.invoiceValue) : "-",
        p.eway || p.ewayBill || "-",
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
          { colIndex: 10, value: totalActualWt, numFmt: "#,##0.00", align: "right" },
          { colIndex: 11, value: totalChargedWt, numFmt: "#,##0.00", align: "right" },
          { colIndex: 13, value: totalFreight, numFmt: "#,##0.00", align: "right" },
          { colIndex: 17, value: totalGrandAmt, numFmt: "#,##0.00", align: "right" },
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
    { header: "GST Amount (₹)", width: 14, align: "right", numFmt: "#,##0.00" },
    { header: "Grand Total (₹)", width: 18, align: "right", numFmt: "#,##0.00" },
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
