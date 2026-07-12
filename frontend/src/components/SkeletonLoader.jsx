import React from 'react';

/**
 * Modern Skeleton Screen components for different page layouts.
 */

// Basic Shimmering Box
export const SkeletonBox = ({ width = '100%', height = '20px', style = {}, className = '' }) => (
  <div 
    className={`skeleton-box ${className}`} 
    style={{ width, height, ...style }} 
  />
);

// Skeleton for a standard Data Table Page (Cities, Branches, Clients, etc.)
export const TablePageSkeleton = () => {
  return (
    <div style={{ width: '100%', animation: 'fade-in 0.3s ease' }}>
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <SkeletonBox width="250px" height="32px" style={{ marginBottom: '0.5rem' }} />
          <SkeletonBox width="350px" height="16px" />
        </div>
        <SkeletonBox width="150px" height="45px" style={{ borderRadius: '6px' }} />
      </div>

      {/* Table Area */}
      <div className="panel" style={{ padding: '1rem', overflow: 'hidden' }}>
        {/* Table Header Row */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <SkeletonBox width="20%" height="20px" />
          <SkeletonBox width="20%" height="20px" />
          <SkeletonBox width="20%" height="20px" />
          <SkeletonBox width="20%" height="20px" />
          <SkeletonBox width="10%" height="20px" />
        </div>

        {/* Table Data Rows */}
        {[1, 2, 3, 4, 5, 6].map((row) => (
          <div key={row} style={{ display: 'flex', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid rgba(0, 0, 0, 0.03)' }}>
            <SkeletonBox width="20%" height="16px" />
            <SkeletonBox width="15%" height="16px" />
            <SkeletonBox width="25%" height="16px" />
            <SkeletonBox width="15%" height="16px" />
            <div style={{ width: '10%', display: 'flex', gap: '8px' }}>
              <SkeletonBox width="40px" height="16px" />
              <SkeletonBox width="40px" height="16px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Skeleton for the Dashboard Cards
export const DashboardSkeleton = () => {
  return (
    <div style={{ width: '100%', animation: 'fade-in 0.3s ease' }}>
      <SkeletonBox width="200px" height="32px" style={{ marginBottom: '2rem' }} />
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <SkeletonBox width="100px" height="16px" />
              <SkeletonBox width="32px" height="32px" style={{ borderRadius: '50%' }} />
            </div>
            <SkeletonBox width="120px" height="32px" style={{ marginBottom: '0.5rem' }} />
            <SkeletonBox width="80px" height="14px" />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        <div className="panel" style={{ padding: '1.5rem', minHeight: '300px' }}>
          <SkeletonBox width="200px" height="24px" style={{ marginBottom: '1.5rem' }} />
          {[1, 2, 3, 4, 5].map(i => (
             <SkeletonBox key={i} width="100%" height="30px" style={{ marginBottom: '1rem' }} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Skeleton for Form Pages (Create Booking)
export const FormPageSkeleton = () => {
  return (
    <div style={{ width: '100%', animation: 'fade-in 0.3s ease' }}>
      <SkeletonBox width="250px" height="32px" style={{ marginBottom: '2rem' }} />
      
      <div className="panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <SkeletonBox width="100px" height="14px" style={{ marginBottom: '0.5rem' }} />
            <SkeletonBox width="100%" height="40px" />
          </div>
          <div>
            <SkeletonBox width="100px" height="14px" style={{ marginBottom: '0.5rem' }} />
            <SkeletonBox width="100%" height="40px" />
          </div>
          <div>
            <SkeletonBox width="100px" height="14px" style={{ marginBottom: '0.5rem' }} />
            <SkeletonBox width="100%" height="40px" />
          </div>
          <div>
            <SkeletonBox width="100px" height="14px" style={{ marginBottom: '0.5rem' }} />
            <SkeletonBox width="100%" height="40px" />
          </div>
        </div>
        
        <SkeletonBox width="200px" height="24px" style={{ marginBottom: '1.5rem', marginTop: '2rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i}>
              <SkeletonBox width="100px" height="14px" style={{ marginBottom: '0.5rem' }} />
              <SkeletonBox width="100%" height="40px" />
            </div>
          ))}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3rem' }}>
           <SkeletonBox width="180px" height="45px" style={{ borderRadius: '6px' }} />
        </div>
      </div>
    </div>
  );
}
