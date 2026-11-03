import React from 'react';

const BALLOONS = [
  {id:1, x:6,  c:'#ff6b4a', d:15,   s:.80, del:1.2, sd:-2.1},
  {id:2, x:18, c:'#ffd678', d:19,   s:.62, del:2.6, sd:-0.7},
  {id:3, x:30, c:'#ff7fa3', d:13,   s:.95, del:0.4, sd:-3.4},
  {id:4, x:46, c:'#7fe3c4', d:21,   s:.70, del:3.4, sd:-1.6},
  {id:5, x:58, c:'#ffa046', d:16,   s:.88, del:1.8, sd:-2.8},
  {id:6, x:70, c:'#ff7fa3', d:12.5, s:1.0, del:0.8, sd:-0.4},
  {id:7, x:82, c:'#ffd678', d:18,   s:.72, del:2.2, sd:-3.0},
  {id:8, x:91, c:'#ff6b4a', d:15.5, s:.85, del:3.0, sd:-1.2},
];

export default function Balloons({ popped, onPop }){
  return (
    <div className="balloons" aria-hidden="true">
      {BALLOONS.filter(b=>!popped.includes(b.id)).map(b=>(
        <div key={b.id} className="balloon"
          style={{left:b.x+'%','--d':b.d+'s','--del':b.del+'s','--sd':b.sd+'s'}}
          onPointerDown={(e)=>onPop(e,b.id)}>
          <div className="b-sway">
            <svg width={Math.round(64*b.s)} viewBox="0 0 64 118">
              <path d="M32 70 C22 88 42 100 32 116"
                stroke="rgba(255,241,220,.45)" fill="none" strokeWidth="1.4"/>
              <ellipse cx="32" cy="34" rx="24" ry="30" fill={b.c}/>
              <path d="M28 62 L36 62 L32 70 Z" fill={b.c}/>
              <ellipse cx="24" cy="24" rx="6" ry="10" fill="rgba(255,255,255,.30)"
                transform="rotate(-18 24 24)"/>
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}