import React from 'react';

export default function Badge(){
  return (
    <div className="badge" aria-hidden="true">
      <svg viewBox="0 0 130 130">
        <defs>
          <path id="cp" d="M65,65 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0"/>
        </defs>
        <circle cx="65" cy="65" r="63" fill="#ff6b4a"/>
        <text className="ring">
          <textPath href="#cp" textLength="289" lengthAdjust="spacingAndGlyphs">
            YOYO · TWENTY-THREE · YOYO · TWENTY-THREE ·
          </textPath>
        </text>
      </svg>
      <span className="badge-num">23</span>
    </div>
  );
}