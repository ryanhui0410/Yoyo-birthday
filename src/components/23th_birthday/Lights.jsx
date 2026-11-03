import React, { useRef, useState, useEffect } from 'react';

export default function Lights({ on }){
  const boxRef=useRef(null);
  const [geo,setGeo]=useState(null);
  useEffect(()=>{
    const el=boxRef.current;
    const build=()=>{
      const w=el.clientWidth||window.innerWidth;
      const N=Math.max(4,Math.round(w/190));
      const seg=(w+24)/N, y0=16, cy=y0+88;
      let d=`M ${-12} ${y0}`;
      const bulbs=[];
      const qy=t=>(1-t)*(1-t)*y0+2*(1-t)*t*cy+t*t*y0;
      const qx=(t,x0)=>(1-t)*(1-t)*x0+2*(1-t)*t*(x0+seg/2)+t*t*(x0+seg);
      for(let i=0;i<N;i++){
        const x0=-12+i*seg;
        d+=` Q ${(x0+seg/2).toFixed(1)} ${cy} ${(x0+seg).toFixed(1)} ${y0}`;
        [.27,.73].forEach(t=>bulbs.push({x:qx(t,x0).toFixed(1), y:qy(t).toFixed(1)}));
      }
      setGeo({d,bulbs});
    };
    build();
    const ro=new ResizeObserver(build); ro.observe(el);
    return ()=>ro.disconnect();
  },[]);
  const cols=['#ffd678','#ff8a6a','#ff9fb0','#ffe08a'];
  return (
    <div className={'lights'+(on?' on':'')} ref={boxRef} aria-hidden="true">
      {geo && (
        <svg width="100%" height="92">
          <path className="wire" d={geo.d}/>
          {geo.bulbs.map((b,i)=>(
            <g key={i} transform={`translate(${b.x} ${b.y})`}>
              <g className="bulb" style={{'--td':(i*60)+'ms','--sd':(-(i*.7))+'s','--b':cols[i%4]}}>
                <rect className="cap" x="-2.5" y="-1" width="5" height="4.5" rx="1.5"/>
                <rect className="glass" x="-3.2" y="3" width="6.4" height="12.5" rx="3.2"/>
              </g>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}