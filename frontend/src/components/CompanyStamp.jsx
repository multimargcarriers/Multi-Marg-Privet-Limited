import React from 'react';

const CompanyStamp = ({ size = 110 }) => {
  return (
    <div style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: 'rotate(-8deg)' }} // Authentic hand-stamped angle
      >
        {/* Outer Circular Rings */}
        <circle cx="100" cy="100" r="95" stroke="#1E3A8A" strokeWidth="4.5" strokeDasharray="none" />
        <circle cx="100" cy="100" r="88" stroke="#1E3A8A" strokeWidth="1.5" />
        
        {/* Inner Ring */}
        <circle cx="100" cy="100" r="62" stroke="#1E3A8A" strokeWidth="2" />

        {/* Curved Text Path Top */}
        <defs>
          <path
            id="textPathTop"
            d="M 24,100 A 76,76 0 1,1 176,100"
            fill="none"
          />
          <path
            id="textPathBottom"
            d="M 176,100 A 76,76 0 0,1 24,100"
            fill="none"
          />
        </defs>

        {/* Top Text: MULTIMARG CARRIERS PVT. LTD. */}
        <text fill="#1E3A8A" fontSize="13.5" fontWeight="800" letterSpacing="1.2">
          <textPath href="#textPathTop" startOffset="50%" textAnchor="middle">
            MULTIMARG CARRIERS PVT. LTD.
          </textPath>
        </text>

        {/* Bottom Text: RUDRAPUR • 01 */}
        <text fill="#1E3A8A" fontSize="12" fontWeight="800" letterSpacing="1.5">
          <textPath href="#textPathBottom" startOffset="50%" textAnchor="middle">
            RUDRAPUR • 01
          </textPath>
        </text>

        {/* Center Logo & Signature Art */}
        <g stroke="#1E3A8A" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Logo Arc */}
          <path d="M 68 82 C 75 60, 125 60, 132 82 C 122 100, 78 100, 68 82 Z" strokeWidth="2" />
          <circle cx="100" cy="74" r="7" fill="#1E3A8A" />
          {/* Signature strokes */}
          <path d="M 62 125 Q 85 85 100 115 T 138 95 T 142 125" strokeWidth="2.8" />
          <path d="M 75 120 L 125 120" strokeWidth="1.8" />
        </g>
      </svg>
    </div>
  );
};

export default CompanyStamp;
