import React from 'react';
import { ArrowUpDown } from 'lucide-react';

const SortDropdown = ({ value, onChange, options = [] }) => {
  const getLabel = (opt) => {
    switch (opt) {
      case "newest": return "Newest First";
      case "oldest": return "Oldest First";
      case "amount_desc": return "Amount: High to Low";
      case "amount_asc": return "Amount: Low to High";
      case "az": return "A to Z";
      case "za": return "Z to A";
      default: return opt;
    }
  };

  return (
    <div className="premium-filter-group">
      <ArrowUpDown size={16} color="#64748b" style={{ marginLeft: "4px" }} />
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="premium-filter-input"
        style={{ cursor: "pointer", fontWeight: "500" }}
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{getLabel(opt)}</option>
        ))}
      </select>
    </div>
  );
};

export default SortDropdown;
