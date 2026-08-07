import { useState, useMemo } from 'react';

const useTableSort = (data, defaultSort = "newest", config = {}) => {
  const [sortOption, setSortOption] = useState(defaultSort);

  const { dateKey = "createdAt", amountKey = "total", nameKey = "name" } = config;

  const sortedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    return [...data].sort((a, b) => {
      // Default dates fallback to 'createdAt' or 'date' if the configured key doesn't exist
      const dateA = new Date(a[dateKey] || a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b[dateKey] || b.date || b.createdAt || 0).getTime();

      const amountA = parseFloat(a[amountKey] || a.amount || a.taxable || 0);
      const amountB = parseFloat(b[amountKey] || b.amount || b.taxable || 0);

      const nameA = (a[nameKey] || a.client || a.vendor || a.city || a.branch || "").toString().toLowerCase();
      const nameB = (b[nameKey] || b.client || b.vendor || b.city || b.branch || "").toString().toLowerCase();

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
        default:
          return dateB - dateA; // Fallback to newest
      }
    });
  }, [data, sortOption, dateKey, amountKey, nameKey]);

  return { sortedData, sortOption, setSortOption };
};

export default useTableSort;
