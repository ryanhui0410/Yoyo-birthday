import React, { useState, useEffect, useRef, useCallback } from 'react';
import rabbitImg from './rabbit.jpg';
import Gallery, { PhotoIcon } from './Gallery.jsx';
import { listRemotePhotos } from './photosService.js';
import { AK } from './audio.js';
import { makeConfetti } from './fx.js';
import { makeCandles } from './candles.js';
import { MessageIcon, WindIcon, SoundOnIcon, SoundOffIcon, ReplayIcon, StarIcon } from './icons.jsx';
import Lights from './components/Lights.jsx';
import Cake, { CAKES, CakeArt, ChocoChipArt } from './components/Cake.jsx';
import Balloons from './components/Balloons.jsx';
import Badge from './components/Badge.jsx';
import MessageModal from './components/MessageModal.jsx';
import './gallery.css';

export default function App(){
  /* ---------- state ---------- */
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
  const [view,setView]=useState('cake');
  const [cakeStyle,setCakeStyle]=useState('chocolate');
  const [bootRemote,setBootRemote]=useState(null);
  const [showMsgModal,setShowMsgModal]=useState(false);

  const lit=candles.filter(c=>!c.out).length;

  /* ---------- effects ---------- */
  useEffect(() => { listRemotePhotos().then(setBootRemote); }, []);
  useEffect(() => { confettiRef.current = makeConfetti(fxRef.current); }, []);

  useEffect(()=>{
    if(phase==='dark'){
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
      const t4=setTimeout(()=>CE.meteorShower(18,3800),600);
      const sky=setInterval(()=>{
        CE.meteor();
        if(Math.random()<.4) CE.meteor();
      },2600);
      return ()=>{ [t1,t2,t3,t4].forEach(clearTimeout); clearInterval(sky); };
    }
  },[phase]);

  /* ---------- blow interaction ---------- */
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

  /* ---------- global input: hold = blow, drag = rotate, tap = confetti ---------- */
  const fnRef=useRef({});
  fnRef.current={startBlow,stopBlow,phase};
  useEffect(()=>{
    let sx=0, sy=0;                       /* properly declared this time */
    const down=(e)=>{
      if(e.target.closest('button, a')) return;
      sx=e.clientX; sy=e.clientY;
      const {startBlow,phase}=fnRef.current;
      if(phase==='intro'){ e.preventDefault(); startBlow(); }
      else if(phase==='party'){
        AK.init(); AK.pop();
        confettiRef.current.burst(e.clientX,e.clientY,26,-Math.PI/2,1.6,6);
      }
    };
    const move=(e)=>{
      if(holdRef.current && Math.hypot(e.clientX-sx,e.clientY-sy)>25)
        fnRef.current.stopBlow();
    };
    const up=()=>fnRef.current.stopBlow();
    const kd=(e)=>{ if(e.code==='Space'){ e.preventDefault(); if(!e.repeat) fnRef.current.startBlow(); } };
    const ku=(e)=>{ if(e.code==='Space') fnRef.current.stopBlow(); };
    window.addEventListener('pointerdown',down);
    window.addEventListener('pointermove',move);
    window.addEventListener('pointerup',up);
    window.addEventListener('pointercancel',up);
    window.addEventListener('blur',up);
    window.addEventListener('keydown',kd);
    window.addEventListener('keyup',ku);
    return ()=>{
      window.removeEventListener('pointerdown',down);
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerup',up);
      window.removeEventListener('pointercancel',up);
      window.removeEventListener('blur',up);
      window.removeEventListener('keydown',kd);
      window.removeEventListener('keyup',ku);
    };
  },[]);

  /* ---------- actions ---------- */
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
  const relight=()=>{
    progRef.current=0;
    holdRef.current=false; setHolding(false);
    cancelAnimationFrame(rafRef.current);
    const fresh=makeCandles();
    candlesRef.current=fresh; setCandles(fresh);
    setPhase('intro');
  };
  const chooseCake=(s)=>{ setCakeStyle(s); relight(); };
  const replay=()=>{
    confettiRef.current.clear();
    setPopped([]);
    relight();
  };

  /* ---------- derived ---------- */
  const countClass='count'+(lit<=6&&lit>0?' low':'');
  const countText = lit===23 ? 'twenty-three candles to go'
    : lit===0 ? '…'
    : lit<=6 ? `almost there — ${lit} to go`
    : `${lit} candles to go`;

  /* ---------- render ---------- */
  if (view==='gallery')
    return <Gallery onBack={()=>setView('cake')} initialRemote={bootRemote}/>;

  return (
    <div className={'app '+phase}>
      <div className="floor" style={{opacity:(lit/23)*.9}}/>
      <Lights on={phase==='party'}/>
      <Cake candles={candles} blowing={holding} small={phase==='party'} style={cakeStyle}/>
      <canvas id="fx" ref={fxRef}/>

      <div className="corner tl">Yoyo · Twenty-Three</div>
      <div className="corner tr">
        <button className="icon-btn" onClick={()=>setShowMsgModal(true)}
          aria-label="a message for you" title="a message for you">
          <MessageIcon/>
        </button>
        <button className="icon-btn"
          onClick={()=>setView(v=>v==='cake'?'gallery':'cake')}
          aria-label="photo gallery" title="photo gallery">
          <PhotoIcon/>
        </button>
        <button className="icon-btn" onClick={toggleMute}
          aria-label={muted?'unmute':'mute'}>
          {muted ? <SoundOffIcon/> : <SoundOnIcon/>}
        </button>
      </div>

      {phase==='intro' && (
        <div className="hint">
          <div className="cake-pick" role="tablist" aria-label="choose your cake">
            {CAKES.map(c=>(
              <button key={c.id}
                className={'cake-chip'+(cakeStyle===c.id?' sel':'')}
                onClick={()=>chooseCake(c.id)}
                role="tab" aria-selected={cakeStyle===c.id}>
                <svg viewBox="0 0 320 210" className="chip-art" aria-hidden="true">
                  {c.id==='chocolate' ? <ChocoChipArt/> : <CakeArt style={c.id}/>}
                </svg>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
          <p className="wish">Make a wish, <em>Yoyo</em>
            <img src={rabbitImg} alt="Yoyo" className="yoyo-pic"/></p>
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
              <img src={rabbitImg} alt="Yoyo" className="yoyo-pic"/>
            </h1>
            <p className="tag">Twenty-three looks wonderful on you.</p>
            <button className="again" onClick={replay}>
              <ReplayIcon/> light the candles again
            </button>
          </main>
          <div className="tip">tap anywhere for confetti — pop the balloons too</div>
        </React.Fragment>
      )}

      <MessageModal open={showMsgModal} onClose={()=>setShowMsgModal(false)}/>
      <div className="vignette"/>
      <div className="grain"/>
    </div>
  );
}