import React from 'react';

const RupeeIcon = ({ size = 14, style = {}, className = "" }) => (
  <img 
    src="/rupee_symbol.png" 
    alt="Rupee"
    width={size}
    height={size}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }} 
    className={className} 
  />
);

export default RupeeIcon;
