import { useState, useMemo } from 'react';

const useTableSort = (data, defaultSort = "newest", config = {}) => {
  const [sortOption, setSortOption] = useState(defaultSort);

  const { dateKey = "createdAt", amountKey = "total", nameKey = "name" } = config;

  const sortedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    return [...data].sort((a, b) => {
      // Force offline pending items to the top always
      if (a.isOfflinePending && !b.isOfflinePending) return -1;
      if (!a.isOfflinePending && b.isOfflinePending) return 1;

      // Default dates fallback to 'createdAt' or 'date' if the configured key doesn't exist
      const dateA = new Date(a[dateKey] || a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b[dateKey] || b.date || b.createdAt || 0).getTime();

      const amountA = parseFloat(a[amountKey] || a.amount || a.taxable || 0);
      const amountB = parseFloat(b[amountKey] || b.amount || b.taxable || 0);

      const nameA = (a[nameKey] || a.client || a.vendor || a.city || a.branch || "").toString().toLowerCase();
      const nameB = (b[nameKey] || b.client || b.vendor || b.city || b.branch || "").toString().toLowerCase();

      const billNoA = (a.invoice || a.billNo || a.awb || a.consignment || a.lrNo || "").toString();
      const billNoB = (b.invoice || b.billNo || b.awb || b.consignment || b.lrNo || "").toString();

      switch (sortOption) {
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
        case "bill_desc":
        case "awb_desc":
          return billNoB.localeCompare(billNoA, undefined, { numeric: true, sensitivity: 'base' }) || (dateB - dateA);
        case "bill_asc":
        case "awb_asc":
          return billNoA.localeCompare(billNoB, undefined, { numeric: true, sensitivity: 'base' }) || (dateA - dateB);
        default:
          return dateB - dateA; // Fallback to newest
      }
    });
  }, [data, sortOption, dateKey, amountKey, nameKey]);

  return { sortedData, sortOption, setSortOption };
};

export default useTableSort;
