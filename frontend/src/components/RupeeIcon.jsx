import React from 'react';
import { IndianRupee } from 'lucide-react';

const RupeeIcon = ({ size = 14, style = {}, className = "", color = "currentColor" }) => (
  <IndianRupee 
    size={size} 
    color={color}
    style={{ display: 'inline-block', verticalAlign: '-2px', ...style }} 
    className={className} 
  />
);

export default RupeeIcon;
