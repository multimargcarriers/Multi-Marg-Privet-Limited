import React, { useState, useEffect } from 'react';
import { SkeletonBox } from './SkeletonLoader';

const Table = ({ headers, data, renderRow, loading = false }) => {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setShowLoader(true), 150);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);
  return (
    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && showLoader ? (
              // Render 5 Skeleton Rows
              [1, 2, 3, 4, 5].map((rowIdx) => (
                <tr key={`skel-${rowIdx}`}>
                  {headers.map((_, colIdx) => (
                    <td key={`skel-col-${colIdx}`}>
                      <SkeletonBox width="80%" height="16px" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 && !loading ? (
              // Empty State
              <tr>
                <td colSpan={headers.length} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No data available
                </td>
              </tr>
            ) : data.length > 0 ? (
              // Render Actual Data
              data.map((item, index) => renderRow(item, index))
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
