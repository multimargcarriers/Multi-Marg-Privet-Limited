import React, { useState, useEffect } from 'react';
import { SkeletonBox } from './SkeletonLoader';

const Table = ({ headers, data, renderRow, loading = false, pagination = false, defaultEntries = 10, footerRow = null, minWidth = "1050px" }) => {
  const [showLoader, setShowLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(defaultEntries);

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setShowLoader(true), 150);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  // Reset page when data changes or entries per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data, entriesPerPage]);

  const totalPages = Math.ceil(data.length / entriesPerPage) || 1;
  const currentData = pagination ? data.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage) : data;

  const handleEntriesChange = (e) => {
    setEntriesPerPage(parseInt(e.target.value, 10));
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);
      
      if (start === 1) end = maxVisible;
      if (end === totalPages) start = totalPages - maxVisible + 1;
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (start > 1) {
        if (start > 2) pages.unshift('...');
        pages.unshift(1);
      }
      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="glass-panel" style={{ padding: '15px', overflow: 'hidden' }}>
      {pagination && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "15px" }}>
          <div style={{ fontSize: "0.9rem", color: "#64748b" }}>
            Show 
            <select value={entriesPerPage} onChange={handleEntriesChange} style={{ margin: "0 0.5rem", padding: "0.2rem 0.5rem", border: "1px solid #cbd5e1", borderRadius: "4px", outline: "none", cursor: "pointer" }}>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
             entries
          </div>
        </div>
      )}
      <div className="table-container" style={{ border: "1px solid #f1f5f9", borderRadius: "8px", overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", minWidth, borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f8fafc" }}>
            <tr>
              {headers.map((header, index) => (
                <th key={index} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && showLoader ? (
              // Render 5 Skeleton Rows
              [1, 2, 3, 4, 5].map((rowIdx) => (
                <tr key={`skel-${rowIdx}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  {headers.map((_, colIdx) => (
                    <td key={`skel-col-${colIdx}`} style={{ padding: "12px 16px" }}>
                      <SkeletonBox width="80%" height="16px" />
                    </td>
                  ))}
                </tr>
              ))
            ) : currentData.length === 0 && !loading ? (
              // Empty State
              <tr>
                <td colSpan={headers.length} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                  No data available
                </td>
              </tr>
            ) : currentData.length > 0 ? (
              // Render Actual Data
              <>
                {currentData.map((item, index) => renderRow(item, (currentPage - 1) * entriesPerPage + index))}
                {footerRow && footerRow}
              </>
            ) : null}
          </tbody>
        </table>
      </div>
      
      {pagination && data.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "15px", fontSize: "0.85rem", color: "#64748b", flexWrap: "wrap", gap: "10px" }}>
          <div>
            Showing {(currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, data.length)} of {data.length} entries
          </div>
          <div style={{ display: "flex", gap: "5px" }}>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ padding: "6px 12px", border: "1px solid #cbd5e1", borderRadius: "4px", backgroundColor: currentPage === 1 ? "#f8fafc" : "white", color: currentPage === 1 ? "#94a3b8" : "#334155", cursor: currentPage === 1 ? "not-allowed" : "pointer", transition: "all 0.2s" }}
            >
              Prev
            </button>
            
            {getPageNumbers().map((pageNum, idx) => (
              <button 
                key={idx}
                onClick={() => pageNum !== '...' && setCurrentPage(pageNum)}
                disabled={pageNum === '...'}
                style={{ 
                  padding: "6px 12px", 
                  border: "1px solid",
                  borderColor: currentPage === pageNum ? "#3b82f6" : pageNum === '...' ? "transparent" : "#cbd5e1",
                  borderRadius: "4px", 
                  backgroundColor: currentPage === pageNum ? "#3b82f6" : "white", 
                  color: currentPage === pageNum ? "white" : "#334155", 
                  cursor: pageNum === '...' ? "default" : "pointer",
                  fontWeight: currentPage === pageNum ? "600" : "400"
                }}
              >
                {pageNum}
              </button>
            ))}

            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: "6px 12px", border: "1px solid #cbd5e1", borderRadius: "4px", backgroundColor: currentPage === totalPages ? "#f8fafc" : "white", color: currentPage === totalPages ? "#94a3b8" : "#334155", cursor: currentPage === totalPages ? "not-allowed" : "pointer", transition: "all 0.2s" }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
