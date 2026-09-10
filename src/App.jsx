import React, { useState, useEffect, useRef, useCallback } from 'react';
import Gallery, { PhotoIcon } from './Gallery.jsx';
import { listRemotePhotos } from './photosService.js';
import './gallery.css';
import rabbitImg from './rabbit.jpg'; // ✨ ADD THIS LINE
/* ================= palette & data ================= */
const CREAM = '#fff1dc';
const CONF_COLORS = ['#ff6b4a','#ffd678','#ff7fa3','#7fe3c4','#ffa046','#fff1dc'];
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

/* ================= synthesized audio (no assets) ================= */
const AK = {
  ctx:null, master:null, noise:null, whoosh:null, vol:.9,
  init(){
    if(this.ctx){ if(this.ctx.state==='suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if(!C) return;
    this.ctx = new C();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.vol;
    this.master.connect(this.ctx.destination);
    const n = this.ctx.sampleRate*1.2;
    const b = this.ctx.createBuffer(1,n,this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
    this.noise = b;
  },
  setMuted(m){ if(!this.ctx) return; this.master.gain.setTargetAtTime(m?0:this.vol,this.ctx.currentTime,.04); },
  t(){ return this.ctx ? this.ctx.currentTime : 0; },
  tone(f,at,dur,vol,type){
    if(!this.ctx) return;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type||'sine'; o.frequency.value=f;
    g.gain.setValueAtTime(0,at);
    g.gain.linearRampToValueAtTime(vol,at+.015);
    g.gain.exponentialRampToValueAtTime(.0001,at+dur);
    o.connect(g); g.connect(this.master); o.start(at); o.stop(at+dur+.1);
  },
  melody(){
    if(!this.ctx) return;
    const t=this.t()+.05, N=[392,392,440,392,523.25,493.88];
    N.forEach((f,i)=>this.tone(f,t+i*.17,.5,.14,'triangle'));
    const ct=t+N.length*.17+.12;
    [523.25,659.25,783.99,1046.5].forEach(f=>this.tone(f,ct,2.2,.055,'sine'));
    this.tone(2093,ct+.05,.5,.04,'sine'); this.tone(2637,ct+.16,.5,.03,'sine');
  },
  pop(){
    if(!this.ctx) return; const t=this.t();
    const s=this.ctx.createBufferSource(); s.buffer=this.noise; s.playbackRate.value=1.5;
    const f=this.ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=900;
    const g=this.ctx.createGain(); g.gain.setValueAtTime(.25,t); g.gain.exponentialRampToValueAtTime(.001,t+.14);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t+.15);
    const o=this.ctx.createOscillator(); o.type='square';
    o.frequency.setValueAtTime(300,t); o.frequency.exponentialRampToValueAtTime(70,t+.09);
    const og=this.ctx.createGain(); og.gain.setValueAtTime(.10,t); og.gain.exponentialRampToValueAtTime(.001,t+.1);
    o.connect(og); og.connect(this.master); o.start(t); o.stop(t+.12);
  },
  puff(){
    if(!this.ctx) return; const t=this.t();
    const s=this.ctx.createBufferSource(); s.buffer=this.noise; s.playbackRate.value=.8;
    const f=this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=650;
    const g=this.ctx.createGain(); g.gain.setValueAtTime(.05,t); g.gain.exponentialRampToValueAtTime(.001,t+.16);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t+.18);
  },
  whooshStart(){
    if(!this.ctx || this.whoosh) return;
    const s=this.ctx.createBufferSource(); s.buffer=this.noise; s.loop=true;
    const f=this.ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=520; f.Q.value=.8;
    const g=this.ctx.createGain();
    g.gain.setValueAtTime(0,this.t()); g.gain.linearRampToValueAtTime(.13,this.t()+.3);
    s.connect(f); f.connect(g); g.connect(this.master); s.start();
    this.whoosh={s,g};
  },
  whooshStop(){
    if(!this.whoosh || !this.ctx) return;
    const {s,g}=this.whoosh, t=this.t();
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value,t);
    g.gain.linearRampToValueAtTime(0,t+.2);
    s.stop(t+.25); this.whoosh=null;
  }
};

/* ================= confetti + meteor engine ================= */
function makeConfetti(canvas){
  const ctx=canvas.getContext('2d');
  let pieces=[],meteors=[],W=0,H=0,raf=null,driz=0;
  const R=(a,b)=>a+Math.random()*(b-a);
  function resize(){
    const d=Math.min(2,window.devicePixelRatio||1);
    W=window.innerWidth; H=window.innerHeight;
    canvas.width=W*d; canvas.height=H*d;
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    ctx.setTransform(d,0,0,d,0,0);
  }
  resize(); window.addEventListener('resize',resize);
  function piece(x,y,vx,vy){
    const sh=Math.random();
    return {x,y,vx,vy,rot:R(0,6.28),vr:R(-.2,.2),ph:R(0,6.28),fs:R(.15,.3),
      c:CONF_COLORS[(Math.random()*CONF_COLORS.length)|0],
      shape: sh<.35?'c':(sh<.75?'r':'rib'), w:R(6,11), h:R(8,15)};
  }
  function burst(x,y,n,ang,spread,power){
    for(let i=0;i<n;i++){
      const a=ang+(Math.random()-.5)*spread, v=power*R(.45,1.15);
      pieces.push(piece(x,y,Math.cos(a)*v,Math.sin(a)*v));
    }
    kick();
  }
  function drizzle(ms){ driz=performance.now()+ms; kick(); }
  function clear(){ pieces.length=0; meteors.length=0; driz=0;
    if(raf){cancelAnimationFrame(raf);raf=null;} ctx.clearRect(0,0,W,H); }

  /* ---- shooting stars ---- */
    /* ---- shooting stars ---- */
  function meteor(){
    const fromLeft=Math.random()<.5;
    meteors.push({
      x: fromLeft ? R(-40,W*.6) : R(W*.4,W+40),
      y: R(-60,H*.35),
      vx: Math.cos(R(.6,1.0))*R(13,21)*(fromLeft?1:-1),
      vy: Math.sin(R(.6,1.0))*R(13,21),
      life: 1, decay: R(.008,.014),
      w: R(4,6.5),          /* ← was R(1.5,2.6): much thicker streak */
      tail: R(8,12)
    });
    kick();
  }
  function meteorShower(n,over){
    for(let i=0;i<n;i++) setTimeout(meteor,R(0,over));
    kick();
  }
  function drawMeteor(p){
    const tx=p.x-p.vx*p.tail, ty=p.y-p.vy*p.tail;
    const g=ctx.createLinearGradient(p.x,p.y,tx,ty);
    g.addColorStop(0,`rgba(255,246,224,${.95*p.life})`);
    g.addColorStop(.3,`rgba(255,214,120,${.55*p.life})`);
    g.addColorStop(1,'rgba(255,214,120,0)');
    ctx.strokeStyle=g; ctx.lineWidth=p.w; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(tx,ty); ctx.stroke();
    ctx.fillStyle=`rgba(255,255,255,${p.life})`;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.w*.9,0,6.283); ctx.fill();
  }

  function loop(t){
    if(t<driz){ for(let k=0;k<2;k++) if(Math.random()<.7) pieces.push(piece(R(0,W),-20,R(-.7,.7),R(.6,1.6))); }
    ctx.clearRect(0,0,W,H);
    pieces=pieces.filter(p=>{
      p.vy+=.16; p.vx*=.992; p.vy*=.996;
      p.x+=p.vx+Math.sin(p.ph)*.7; p.y+=p.vy;
      p.ph+=p.fs; p.rot+=p.vr;
      if(p.y>H+40||p.x<-40||p.x>W+40) return false;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.c;
      if(p.shape==='c'){ ctx.beginPath(); ctx.arc(0,0,p.w*.45,0,6.283); ctx.fill(); }
      else if(p.shape==='r'){ ctx.scale(1,Math.cos(p.ph)); ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); }
      else { ctx.scale(1,Math.cos(p.ph)); ctx.fillRect(-2,-p.h*1.2,4,p.h*2.4); }
      ctx.restore(); return true;
    });
    meteors=meteors.filter(p=>{
      p.x+=p.vx; p.y+=p.vy; p.life-=p.decay;
      if(p.life<=0||p.y>H+60||p.x<-200||p.x>W+200) return false;
      drawMeteor(p); return true;
    });
    if(pieces.length||meteors.length||performance.now()<driz) raf=requestAnimationFrame(loop);
    else { raf=null; ctx.clearRect(0,0,W,H); }
  }
  function kick(){ if(!raf) raf=requestAnimationFrame(loop); }
  return {burst,drizzle,clear,meteor,meteorShower};
}
/* ================= candle layout ================= */
function makeCandles(){
  const R=(a,b)=>a+Math.random()*(b-a);
  const P=[['#ff6b4a',CREAM],['#ffd678',CREAM],['#ff7fa3',CREAM],['#7fe3c4',CREAM],
    ['#ffa046',CREAM],[CREAM,'#ff6b4a'],[CREAM,'#ff7fa3'],[CREAM,'#7fe3c4'],
    [CREAM,'#ffa046'],[CREAM,'#ffd678']];
  /* depth = how far down the glaze surface each row stands (viewBox units) */
  const rows=[
    {n:9,  x0:42, x1:58, depth:1.6, s:.74, z:1},   /* back row, near the far rim */
    {n:14, x0:33, x1:67, depth:7.2, s:1,   z:2}    /* front row, mid-surface */
  ];
  const out=[]; let ig=0;
  rows.forEach((row,ri)=>{
    for(let i=0;i<row.n;i++){
      const t=i/(row.n-1); ig+=34+Math.random()*60;
      const [c1,c2]=P[(Math.random()*P.length)|0];
      const left = row.x0+t*(row.x1-row.x0)+R(-1.1,1.1);
      /* project the candle base onto the curved top surface
         (ellipse cx=160 cy=55 rx=62 ry=8 in the 320x210 viewBox) */
      const vx = left*3.2;                       /* % of width → viewBox x */
      const dxn = (vx-160)/62;
      const surf = 55 - 8*Math.sqrt(Math.max(0,1-dxn*dxn));
      const y = surf + row.depth + R(-.6,.6);
      const bottom = ((210-y)/330*100) - .35;    /* → % from stage bottom, sunk a hair */
      out.push({
        id:ri+'-'+i,
        left,
        bottom,
        h: R(8.5,13), s: row.s*R(.95,1.05), z: row.z,
        th: R(.08,.95), c1, c2,
        dur: R(.17,.3), del: -Math.random(), rot: R(-4,4),
        ig: Math.round(ig), out:false
      });
    }
  });
  return out;
}

/* ================= icons (inline SVG) ================= */
const MessageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const WindIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
    <path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/>
  </svg>
);
const SoundOnIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 6a8.5 8.5 0 0 1 0 12"/>
  </svg>
);
const SoundOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 5 6 9H3v6h3l5 4z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/>
  </svg>
);
const ReplayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
  </svg>
);
const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/>
  </svg>
);

/* ================= string lights ================= */
function Lights({on}){
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

/* ================= cake (SVG) + candle overlay ================= */
const D1=[[74,11,20],[96,9,30],[118,12,15],[141,10,34],[165,12,22],[190,9,28],[212,12,16],[235,10,26]];
const D2=[[105,9,14],[122,8,24],[142,10,12],[160,9,28],[180,10,16],[198,8,22]];
const SPRK_B=[[82,114,20,'#7fe3c4'],[108,117,-15,'#ff7fa3'],[133,113,40,CREAM],
  [157,121,-30,'#7fe3c4'],[180,114,10,'#ff7fa3'],[206,119,-20,CREAM],
  [229,113,25,'#7fe3c4'],[248,120,-10,'#ff7fa3']];
const SPRK_T=[[110,63,15,'#ff6b4a'],[136,61,-25,'#ff7fa3'],[159,65,10,'#7fe3c4'],
  [184,62,-15,'#ff6b4a'],[206,64,30,'#ff7fa3']];

function Cake({candles,blowing,small}){
  return (
    <div className={'cake-zone'+(small?' small':'')+(blowing?' blowing':'')}>
      <div className="cake-stage">
        <svg className="cake-svg" viewBox="0 0 320 210" aria-hidden="true">
          <defs>
            <clipPath id="t1"><rect x="64" y="103" width="192" height="72" rx="9"/></clipPath>
            <clipPath id="t2"><rect x="98" y="55" width="124" height="52" rx="9"/></clipPath>
            <linearGradient id="side" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="rgba(255,255,255,.10)"/>
              <stop offset=".22" stopColor="rgba(255,255,255,0)"/>
              <stop offset=".8" stopColor="rgba(60,20,12,0)"/>
              <stop offset="1" stopColor="rgba(60,20,12,.18)"/>
            </linearGradient>
          </defs>
          <ellipse cx="160" cy="196" rx="152" ry="12" fill="rgba(0,0,0,.38)"/>
          <ellipse cx="160" cy="189" rx="142" ry="15" fill="#c9b391"/>
          <ellipse cx="160" cy="186" rx="142" ry="15" fill="#efe1c6"/>
          <ellipse cx="160" cy="186" rx="118" ry="10" fill="#e2d2b2"/>
          <rect x="64" y="103" width="192" height="72" rx="9" fill="#f6e9d3"/>
          <g clipPath="url(#t1)">
            <rect x="64" y="103" width="192" height="72" fill="url(#side)"/>
            <rect x="64" y="103" width="192" height="24" fill="#ff6b4a"/>
            {D1.map(([x,w,h],i)=>(<rect key={i} x={x} y={112} width={w} height={h} rx={w/2} fill="#ff6b4a"/>))}
            {SPRK_B.map(([x,y,a,c],i)=>(
              <rect key={'s'+i} width="7" height="2.6" rx="1.3" fill={c}
                transform={`translate(${x} ${y}) rotate(${a})`}/>))}
          </g>
          <ellipse cx="160" cy="103" rx="96" ry="10" fill="#ff7554"/>
          <rect x="98" y="55" width="124" height="52" rx="9" fill="#f6e9d3"/>
          <g clipPath="url(#t2)">
            <rect x="98" y="55" width="124" height="52" fill="url(#side)"/>
            <rect x="98" y="55" width="124" height="17" fill="#ffd678"/>
            {D2.map(([x,w,h],i)=>(<rect key={'d'+i} x={x} y={60} width={w} height={h} rx={w/2} fill="#ffd678"/>))}
            {SPRK_T.map(([x,y,a,c],i)=>(
              <rect key={'t'+i} width="7" height="2.6" rx="1.3" fill={c}
                transform={`translate(${x} ${y}) rotate(${a})`}/>))}
          </g>
          <ellipse cx="160" cy="55" rx="62" ry="8" fill="#ffdf95"/>
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
      </div>
    </div>
  );
}

/* ================= balloons ================= */
function Balloons({popped,onPop}){
  return (
    <div className="balloons" aria-hidden="true">
      {BALLOONS.filter(b=>!popped.includes(b.id)).map(b=>(
        <div key={b.id} className="balloon"
          style={{left:b.x+'%','--d':b.d+'s','--del':b.del+'s','--sd':b.sd+'s'}}
          onPointerDown={(e)=>onPop(e,b.id)}>
          <div className="b-sway">
            <svg width={Math.round(64*b.s)} viewBox="0 0 64 118">
              <path d="M32 70 C22 88 42 100 32 116" stroke="rgba(255,241,220,.45)" fill="none" strokeWidth="1.4"/>
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

/* ================= rotating age badge ================= */
function Badge(){
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

/* ================= app ================= */
export default function App(){
  const [phase,setPhase]=useState('intro');
  const [candles,setCandles]=useState(()=>makeCandles());
  const candlesRef=useRef(candles);
  const [holding,setHolding]=useState(false);
  const holdRef=useRef(false);
  const progRef=useRef(0);
  const rafRef=useRef(0);
  const [muted,setMuted]=useState(false);
  const [popped,setPopped]=useState([]);
  const fxRef=useRef(null);
  const confettiRef=useRef(null);
  const [view, setView] = useState('cake');
  const lit=candles.filter(c=>!c.out).length;
    const [bootRemote, setBootRemote] = useState(null);
  const [showMsgModal, setShowMsgModal] = useState(false);
  
  // ✨ YOUR PERMANENT MESSAGE FOR YOYO — edit the text inside the quotes!
  const YOYO_MESSAGE = "Happy 23rd Birthday, Yoyo! I hope this year brings you endless joy, laughter, and all the things you've been wishing for. You are so incredibly loved.";
    /* the moment the app opens, quietly fetch the latest photo list */
  useEffect(() => {
    listRemotePhotos().then(setBootRemote);
  }, []);
  useEffect(()=>{ confettiRef.current=makeConfetti(fxRef.current); },[]);
    useEffect(()=>{
    if(phase==='dark'){
      /* the wish is granted — a single star falls across the dark sky */
      const tm=setTimeout(()=>confettiRef.current.meteorShower(3,900),300);
      const t=setTimeout(()=>setPhase('party'),1400);
      return ()=>{ clearTimeout(t); clearTimeout(tm); };
    }
    if(phase==='party'){
      AK.init(); AK.melody();
      const CE=confettiRef.current;
      const t1=setTimeout(()=>{ CE.burst(window.innerWidth/2,window.innerHeight+10,130,-Math.PI/2,1.0,13); AK.pop(); },350);
      const t2=setTimeout(()=>{
        CE.burst(60,window.innerHeight-20,85,-Math.PI/2.8,.5,12);
        CE.burst(window.innerWidth-60,window.innerHeight-20,85,-Math.PI+Math.PI/2.8,.5,12);
        AK.pop();
      },650);
      const t3=setTimeout(()=>CE.drizzle(6000),1000);
      /* full meteor shower sweeping the reveal */
      const t4=setTimeout(()=>CE.meteorShower(18,3800),600);
      /* then the sky keeps the memory alive: a stray star now and then */
      const sky=setInterval(()=>{
        CE.meteor();
        if(Math.random()<.4) CE.meteor();
      },2600);
      return ()=>{
        [t1,t2,t3,t4].forEach(clearTimeout);
        clearInterval(sky);
      };
    }
  },[phase]);

  const startBlow=useCallback(()=>{
    if(phase!=='intro'||holdRef.current) return;
    holdRef.current=true; AK.init(); AK.whooshStart(); setHolding(true);
    let last=performance.now();
    const step=(t)=>{
      const dt=Math.min(50,t-last); last=t;
      progRef.current=Math.min(1,progRef.current+dt/2300);
      const cs=candlesRef.current;
      let changed=false; const puffs=[];
      const ns=cs.map(c=>{
        if(!c.out && progRef.current>=c.th){ changed=true; puffs.push(1); return {...c,out:true}; }
        return c;
      });
      if(changed){ candlesRef.current=ns; setCandles(ns); puffs.forEach(()=>AK.puff()); }
      if(ns.every(c=>c.out)){
        holdRef.current=false; setHolding(false); AK.whooshStop();
        cancelAnimationFrame(rafRef.current); setPhase('dark'); return;
      }
      rafRef.current=requestAnimationFrame(step);
    };
    rafRef.current=requestAnimationFrame(step);
  },[phase]);

  const stopBlow=useCallback(()=>{
    if(!holdRef.current) return;
    holdRef.current=false; setHolding(false); AK.whooshStop();
    cancelAnimationFrame(rafRef.current);
    if(candlesRef.current.every(c=>c.out)) setPhase('dark');
  },[]);

  const fnRef=useRef({}); fnRef.current={startBlow,stopBlow,phase};
  useEffect(()=>{
    const down=(e)=>{
      if(e.target.closest('button, a')) return;
      const {startBlow,phase}=fnRef.current;
      if(phase==='intro'){ e.preventDefault(); startBlow(); }
      else if(phase==='party'){
        AK.init(); AK.pop();
        confettiRef.current.burst(e.clientX,e.clientY,26,-Math.PI/2,1.6,6);
      }
    };
    const up=()=>fnRef.current.stopBlow();
    const kd=(e)=>{ if(e.code==='Space'){ e.preventDefault(); if(!e.repeat) fnRef.current.startBlow(); } };
    const ku=(e)=>{ if(e.code==='Space') fnRef.current.stopBlow(); };
    window.addEventListener('pointerdown',down);
    window.addEventListener('pointerup',up);
    window.addEventListener('pointercancel',up);
    window.addEventListener('blur',up);
    window.addEventListener('keydown',kd);
    window.addEventListener('keyup',ku);
    return ()=>{
      window.removeEventListener('pointerdown',down);
      window.removeEventListener('pointerup',up);
      window.removeEventListener('pointercancel',up);
      window.removeEventListener('blur',up);
      window.removeEventListener('keydown',kd);
      window.removeEventListener('keyup',ku);
    };
  },[]);

  const popBalloon=(e,id)=>{
    e.stopPropagation(); e.preventDefault();
    AK.init(); AK.pop();
    confettiRef.current.burst(e.clientX,e.clientY,24,0,Math.PI*2,5.5);
    setPopped(p=>[...p,id]);
  };

  const toggleMute=()=>{
    const m=!muted; setMuted(m);
    AK.init(); AK.setMuted(m);
  };

  const replay=()=>{
    confettiRef.current.clear();
    progRef.current=0;
    const fresh=makeCandles();
    candlesRef.current=fresh; setCandles(fresh);
    setPopped([]);
    setPhase('intro');
  };

  const countClass='count'+(lit<=6&&lit>0?' low':'');
  const countText = lit===23 ? 'twenty-three candles to go'
    : lit===0 ? '…'
    : lit<=6 ? `almost there — ${lit} to go`
    : `${lit} candles to go`;
    if (view === 'gallery') {
    return <Gallery onBack={() => setView('cake')} initialRemote={bootRemote} />;
  }
  return (
    <div className={'app '+phase}>
      <div className="floor" style={{opacity:(lit/23)*.9}}/>
      <Lights on={phase==='party'}/>
      <Cake candles={candles} blowing={holding} small={phase==='party'}/>
      <canvas id="fx" ref={fxRef}/>

      <div className="corner tl">Yoyo · Twenty-Three</div>
                  <div className="corner tr">
                <button 
          className="icon-btn" 
          onPointerDown={(e) => e.stopPropagation()} // Blocks the global "blow" listener
          onClick={(e) => {
            e.stopPropagation();
            alert("🎉 Button clicked! If you see this popup, the click works perfectly. The modal will now open.");
            setShowMsgModal(true);
          }} 
          aria-label="a message for you" 
          title="a message for you"
          style={{ position: 'relative', zIndex: 99999 }} // Forces button above everything
        >
          <MessageIcon />
        </button>

        <button className="icon-btn" onClick={() => setView(v => v === 'cake' ? 'gallery' : 'cake')}
          aria-label="photo gallery" title="photo gallery">
          <PhotoIcon/>
        </button>
        <button className="icon-btn" onClick={toggleMute} aria-label={muted?'unmute':'mute'}>
          {muted ? <SoundOffIcon/> : <SoundOnIcon/>}
        </button>
      </div>

            {phase==='intro' && (
        <div className="hint">
          <p className="wish">Make a wish, <em>Yoyo</em> <img src={rabbitImg} alt="Yoyo" className="yoyo-pic" /></p>
          <div className={'pill'+(holding?' hold':'')}>
            <WindIcon/>
            <span>{holding ? 'keep blowing' : 'press & hold to blow'}</span>
          </div>
          <p className={countClass} aria-live="polite">{countText}</p>
        </div>
      )}

      {phase==='dark' && <div className="whisper">…wish made.</div>}

      {phase==='party' && (
        <React.Fragment>
          <Balloons popped={popped} onPop={popBalloon}/>
          <Badge/>
          <main className="party">
            <div className="eyebrow">
              <span className="rule"/><StarIcon/> Happy Birthday <StarIcon/><span className="rule"/>
            </div>
            <h1 className="big" aria-label="Yoyo!">
              {'Yoyo!'.split('').map((ch,i)=>(
                <span key={i} className={'ch'+(ch==='!'?' bang':'')}
                  style={{'--i':i}}>{ch}</span>
              ))}
              {/* ✨ ADD THE PICTURE HERE */}
              <img src={rabbitImg} alt="Yoyo" className="yoyo-pic" />
            </h1>
            <p className="tag">Twenty-three looks wonderful on you.</p>
            <button className="again" onClick={replay}>
              <ReplayIcon/> light the candles again
            </button>
          </main>
        </React.Fragment>
      )}
            {/* ✨ NEW: The Session Box / Modal Overlay */}
      <div className="vignette"/>
      <div className="grain"/>
            {/* ✨ Message popup — read only, no typing! */}
            {/* ✨ BULLETPROOF INLINE-STYLED MODAL */}
      {showMsgModal && (
        <div 
          onClick={() => setShowMsgModal(false)} 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(12, 4, 6, 0.95)', zIndex: 9999999, // Massive z-index to beat vignette/grain
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', pointerEvents: 'auto'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{
              backgroundColor: '#f8f1e3', padding: '40px', borderRadius: '12px',
              maxWidth: '420px', width: '100%', textAlign: 'center',
              boxShadow: '0 30px 80px rgba(0,0,0,0.6)', zIndex: 10000000,
              position: 'relative', color: '#5a4636'
            }}
          >
            <h3 style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: '26px', marginBottom: '20px', marginTop: 0 }}>
              A message for you
            </h3>
            <div style={{ backgroundColor: '#fffdf8', border: '1px solid #e8dfd0', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
              <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: '18px', lineHeight: '1.7', margin: 0 }}>
                "{YOYO_MESSAGE}"
              </p>
            </div>
            <button 
              onClick={() => setShowMsgModal(false)}
              style={{
                backgroundColor: '#ff6b4a', color: '#fff1dc', border: 'none',
                padding: '14px 24px', borderRadius: '999px', fontSize: '12px',
                fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase',
                letterSpacing: '1.5px', width: '100%'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}