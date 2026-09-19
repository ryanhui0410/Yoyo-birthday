import React from 'react';
import Cake3D from '../Cake3D.jsx';
import PeachCake3D from './PeachCake3D.jsx';
export const CAKES = [
  { id:'peach',     label:'Peachy Party' },
  { id:'chocolate', label:'Chocolate' }   // backup, kept for reference
];

const D1=[[74,11,20],[96,9,30],[118,12,15],[141,10,34],[165,12,22],[190,9,28],[212,12,16],[235,10,26]];
const D2=[[105,9,14],[122,8,24],[142,10,12],[160,9,28],[180,10,16],[198,8,22]];

const Berry = ({x,y,s=1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse rx="6.5" ry="8.5" fill="#ff5b4d"/>
    <path d="M-4,-6 L0,-9.5 L4,-6 Z" fill="#7fae5a"/>
    <circle cx="-2.5" cy="-1" r=".9" fill="#ffd977"/>
    <circle cx="2.5" cy="0" r=".9" fill="#ffd977"/>
    <circle cx="0" cy="3.5" r=".9" fill="#ffd977"/>
  </g>
);
const Blueberry = ({x,y}) => (
  <g transform={`translate(${x} ${y})`}>
    <circle r="4.5" fill="#6b7fd7"/><circle r="1.4" fill="#4a5aa8" cy="-2"/>
  </g>
);

export function CakeArt({ style }){
  const P = {
    chocolate:{ body:'#4a2a18', drip:'#2b1508', top:'#38200f', ring:'#33200f' },
    fruit:    { body:'#f2dfc0', drip:'#fffdf6', top:'#fffdf6', ring:'#fffdf6' },
    rabbit:   { body:'#fbf4ea', drip:'#ffd9e2', top:'#fffdf6', ring:'#fffdf6' }
  }[style];
  return (
    <g>
      <defs>
        <clipPath id="t1"><rect x="64" y="103" width="192" height="72" rx="9"/></clipPath>
        <clipPath id="t2"><rect x="98" y="55" width="124" height="52" rx="9"/></clipPath>
        <linearGradient id="side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(255,255,255,.12)"/>
          <stop offset=".25" stopColor="rgba(255,255,255,0)"/>
          <stop offset=".8" stopColor="rgba(40,15,8,0)"/>
          <stop offset="1" stopColor="rgba(40,15,8,.22)"/>
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="196" rx="152" ry="12" fill="rgba(0,0,0,.38)"/>
      <ellipse cx="160" cy="189" rx="142" ry="15" fill="#c9b391"/>
      <ellipse cx="160" cy="186" rx="142" ry="15" fill="#efe1c6"/>
      <ellipse cx="160" cy="186" rx="118" ry="10" fill="#e2d2b2"/>
      <rect x="64" y="103" width="192" height="72" rx="9" fill={P.body}/>
      <g clipPath="url(#t1)">
        <rect x="64" y="103" width="192" height="72" fill="url(#side)"/>
        <rect x="64" y="103" width="192" height="14" fill={P.drip}/>
        {D1.map(([x,w,h],i)=>(
          <rect key={i} x={x} y={112} width={w} height={h} rx={w/2} fill={P.drip}/>))}
      </g>
      <ellipse cx="160" cy="103" rx="96" ry="10" fill={P.ring}/>
      {style==='fruit' && (
        <g>
          <Berry x={100} y={99} s={.8}/><Berry x={222} y={98} s={.8}/>
          <Blueberry x={82} y={101}/><Blueberry x={240} y={100}/>
        </g>)}
      {style==='chocolate' && (
        <g fill="#f0e3c8" opacity=".85">
          <ellipse cx="86" cy="100" rx="5" ry="2.5" transform="rotate(-18 86 100)"/>
          <ellipse cx="236" cy="99" rx="5" ry="2.5" transform="rotate(22 236 99)"/>
        </g>)}
      <rect x="98" y="55" width="124" height="52" rx="9" fill={P.body}/>
      <g clipPath="url(#t2)">
        <rect x="98" y="55" width="124" height="52" fill="url(#side)"/>
        <rect x="98" y="55" width="124" height="10" fill={P.drip}/>
        {D2.map(([x,w,h],i)=>(
          <rect key={'d'+i} x={x} y={60} width={w} height={h} rx={w/2} fill={P.drip}/>))}
      </g>
      {style==='rabbit' && (
        <g>
          <path d="M126,56 C118,34 120,10 130,10 C139,10 141,32 140,56 Z"
            fill={P.body} stroke="rgba(90,70,54,.18)" strokeWidth="1"/>
          <path d="M126,50 C122,38 123,18 130,18 C135,18 136,38 135,50 Z" fill="#ffd9e2"/>
          <path d="M194,56 C202,34 200,10 190,10 C181,10 179,32 180,56 Z"
            fill={P.body} stroke="rgba(90,70,54,.18)" strokeWidth="1"/>
          <path d="M185,50 C184,38 185,18 190,18 C195,18 198,38 197,50 Z" fill="#ffd9e2"/>
        </g>)}
      <ellipse cx="160" cy="55" rx="62" ry="8" fill={P.top}/>
      {style==='chocolate' && (
        <g>
          <g fill="#f0e3c8" opacity=".9">
            <ellipse cx="132" cy="52" rx="5" ry="2.5" transform="rotate(20 132 52)"/>
            <ellipse cx="156" cy="54" rx="5" ry="2.5" transform="rotate(-14 156 54)"/>
            <ellipse cx="182" cy="51" rx="5" ry="2.5" transform="rotate(34 182 51)"/>
          </g>
          <ellipse cx="142" cy="51" rx="20" ry="2.6" fill="#5a3a26" opacity=".55"/>
        </g>)}
      {style==='fruit' && (
        <g>
          <Berry x={128} y={50} s={.95}/><Berry x={192} y={50} s={.9}/>
          <Berry x={160} y={47} s={1.05}/>
          <Blueberry x={144} y={49}/><Blueberry x={177} y={49}/>
          <circle cx="112" cy="52" r="4.5" fill="#fffdf6"/>
          <circle cx="208" cy="52" r="4.5" fill="#fffdf6"/>
        </g>)}
      {style==='rabbit' && (
        <g transform="translate(186 49) rotate(12)">
          <path d="M0,0 L-10,-6 L-10,6 Z" fill="#ff6b4a"/>
          <path d="M0,0 L10,-6 L10,6 Z" fill="#ff6b4a"/>
          <circle r="3.5" fill="#ff6b4a"/>
        </g>)}
      {style==='rabbit' && (
        <g>
          <circle cx="140" cy="78" r="5" fill="#46322c"/>
          <circle cx="180" cy="78" r="5" fill="#46322c"/>
          <circle cx="141.8" cy="76.2" r="1.6" fill="#fff"/>
          <circle cx="181.8" cy="76.2" r="1.6" fill="#fff"/>
          <ellipse cx="160" cy="86" rx="4.5" ry="3.2" fill="#ff8a9a"/>
          <path d="M160,89 Q156,94 152,91 M160,89 Q164,94 168,91"
            stroke="#46322c" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
          <circle cx="130" cy="88" r="6" fill="#ffb3c1" opacity=".6"/>
          <circle cx="190" cy="88" r="6" fill="#ffb3c1" opacity=".6"/>
          <path d="M124,84 L110,82 M124,88 L111,90 M196,84 L210,82 M196,88 L209,90"
            stroke="rgba(90,70,54,.4)" strokeWidth="1.2" strokeLinecap="round"/>
        </g>)}
    </g>
  );
}

/* static icon for the chocolate chip (the real one is 3D) */
export const ChocoChipArt = () => (
  <g>
    <ellipse cx="160" cy="192" rx="148" ry="12" fill="rgba(0,0,0,.38)"/>
    <ellipse cx="160" cy="185" rx="138" ry="13" fill="#efe1c6"/>
    <rect x="72" y="106" width="176" height="70" rx="9" fill="#4a2a18"/>
    <ellipse cx="160" cy="104" rx="92" ry="9" fill="#33200f"/>
    <rect x="101" y="57" width="118" height="50" rx="9" fill="#4a2a18"/>
    <ellipse cx="160" cy="55" rx="62" ry="8" fill="#38200f"/>
    <g fill="#fff1dc">
      {Array.from({length: 9}).map((_, i) =>
        <circle key={i} cx={128 + i * 8} cy={50 + (i % 2) * 4} r="2.4"/>)}
    </g>
    <g fill="#ffb347">
      {Array.from({length: 9}).map((_, i) =>
        <circle key={'f'+i} cx={128 + i * 8} cy={42 + (i % 2) * 4} r="1.5"/>)}
    </g>
  </g>
);

export default function Cake({ candles, blowing, small, style }){
  const s = style || 'peach';   // peach is the default

  return (
    <div className={'cake-zone'+(small?' small':'')+(blowing?' blowing':'')}>
      <div className="cake-stage">
        {s === 'chocolate' ? (
          <Cake3D candles={candles} blowing={blowing}/>      /* backup blueberry */
        ) : s === 'peach' ? (
          <PeachCake3D candles={candles} blowing={blowing}/> /* default */
        ) : (
          /* SVG fallback for fruit/rabbit, unchanged */
          <React.Fragment>
            <svg className="cake-svg" viewBox="0 0 320 210" aria-hidden="true">
              <CakeArt style={s}/>
            </svg>
            {candles.map(c=>(
              <div key={c.id} className={'candle'+(c.out?' out':'')}
                style={{left:c.left+'%',bottom:c.bottom+'%',height:c.h+'cqw',
                  '--c1':c.c1,'--c2':c.c2,'--dur':c.dur+'s','--del':c.del+'s',
                  '--ig':c.ig+'ms','--s':c.s,'--r':c.rot+'deg','--z':c.z}}>
                <div className="fl-wrap"><div className="fl-ig"><div className="fl-flick">
                  <div className="flame"/></div></div></div>
                <div className="wick"/>
                {c.out && <div className="smoke"/>}
                <div className="c-body"/>
              </div>
            ))}
          </React.Fragment>
        )}
      </div>
    </div>
  );
}