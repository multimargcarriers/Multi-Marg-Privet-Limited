import { useState, useMemo } from 'react';

const parseDateValue = (raw) => {
  if (!raw) return 0;
  if (typeof raw === 'number') return raw;
  const str = String(raw).trim();
  const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const time = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`).getTime();
    if (!isNaN(time)) return time;
  }
  const parsed = new Date(str).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

const extractNaturalNumber = (raw) => {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return raw;
  const str = String(raw).trim();
  const digits = str.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

const useTableSort = (data, defaultSort = "awb_desc", config = {}) => {
  const [sortOption, setSortOption] = useState(defaultSort);

  const { dateKey = "createdAt", amountKey = "total", nameKey = "name" } = config;

  const sortedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    return [...data].sort((a, b) => {
      // Force offline pending items to the top always
      if (a.isOfflinePending && !b.isOfflinePending) return -1;
      if (!a.isOfflinePending && b.isOfflinePending) return 1;

      // Default dates fallback to 'createdAt' or 'date' if the configured key doesn't exist
      const dateA = parseDateValue(a[dateKey] || a.date || a.createdAt || a.dispatch_date || a.bookingDate);
      const dateB = parseDateValue(b[dateKey] || b.date || b.createdAt || b.dispatch_date || b.bookingDate);

      const amountA = parseFloat(a[amountKey] || a.amount || a.taxable || 0);
      const amountB = parseFloat(b[amountKey] || b.amount || b.taxable || 0);

      const nameA = (a[nameKey] || a.client || a.vendor || a.city || a.branch || "").toString().toLowerCase();
      const nameB = (b[nameKey] || b.client || b.vendor || b.city || b.branch || "").toString().toLowerCase();

      // Prioritize actual AWB / Bill / Consignment number over internal mongo _id / id
      const billNoA = (a.awb || a.lrNo || a.consignment || a.invoice || a.billNo || a.id || "").toString();
      const billNoB = (b.awb || b.lrNo || b.consignment || b.invoice || b.billNo || b.id || "").toString();

      switch (sortOption) {
        case "awb_desc": {
          const numA = extractNaturalNumber(a.awb || a.lrNo || a.consignment);
          const numB = extractNaturalNumber(b.awb || b.lrNo || b.consignment);
          if (numA && numB && numA !== numB) {
            return numB - numA;
          }
          return billNoB.localeCompare(billNoA, undefined, { numeric: true, sensitivity: 'base' }) || (dateB - dateA);
        }
        case "awb_asc": {
          const numA = extractNaturalNumber(a.awb || a.lrNo || a.consignment);
          const numB = extractNaturalNumber(b.awb || b.lrNo || b.consignment);
          if (numA && numB && numA !== numB) {
            return numA - numB;
          }
          return billNoA.localeCompare(billNoB, undefined, { numeric: true, sensitivity: 'base' }) || (dateA - dateB);
        }
        case "bill_desc": {
          const numA = extractNaturalNumber(a.billNo || a.invoice);
          const numB = extractNaturalNumber(b.billNo || b.invoice);
          if (numA && numB && numA !== numB) {
            return numB - numA;
          }
          return billNoB.localeCompare(billNoA, undefined, { numeric: true, sensitivity: 'base' }) || (dateB - dateA);
        }
        case "bill_asc": {
          const numA = extractNaturalNumber(a.billNo || a.invoice);
          const numB = extractNaturalNumber(b.billNo || b.invoice);
          if (numA && numB && numA !== numB) {
            return numA - numB;
          }
          return billNoA.localeCompare(billNoB, undefined, { numeric: true, sensitivity: 'base' }) || (dateA - dateB);
        }
        case "newest":
          return dateB - dateA; // Descending
        case "oldest":
          return dateA - dateB; // Ascending
        case "amount_desc":
          return amountB - amountA;
        case "amount_asc":
          return amountA - amountB;
        case "az":
          return nameA.localeCompare(nameB);
        case "za":
          return nameB.localeCompare(nameA);
        default:
          return billNoB.localeCompare(billNoA, undefined, { numeric: true, sensitivity: 'base' }) || (dateB - dateA);
      }
    });
  }, [data, sortOption, dateKey, amountKey, nameKey]);

  return { sortedData, sortOption, setSortOption };
};

export default useTableSort;
