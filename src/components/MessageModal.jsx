import React, { useState, useRef, useCallback, useEffect } from 'react';

/* ═══════════════════════════════════════════════════════
   MessageModal — decorated memo book with natural page curl
   Swipe left → page curls and turns to reveal next message
   Swipe right → page curls back to reveal previous message
   ═══════════════════════════════════════════════════════ */

const YOYO_MESSAGE = [
  "大個女啦，唔再喺18/22啦。當初識你嘅時候，由比較斯文文靜嘅性格，到後來開始主動打開話題，好想了解大家嘅生活點滴，成個人唔同曬。",
  "Well, there are so many highs and lows in our life. 呢段期間可能經歷過唔開心的事，唔好因爲受到生活挫折氣餒。",
  "呢個app我由8月尾開始做，做到10月頭，前後大概20多個小時，每次構思要加啲咩新嘢，都要構思好耐，不過都係值得的，只要見到您開心，回味甜蜜時光，咁就夠啦。",
  "果次中秋，我咪問左你幾時影相攬住隻手，我記得您話未喺時候，到臨走排隊影埋嘅時候，果下攬住有些少意外，冇諗過大家咁快就有感情，感情得來不易，活在當下，珍惜眼前。",
  "由7/26到10/31，仲有兩日就剛剛100日，下個目標係記得相識1000日嘅日子，再下次係10000日后嘅日子!唔知做唔做到呢?",
  "我數下我地做過咩先：party-room → 釣墨魚 → 看電影 → 去宜家 → 中秋賞月 → 西貢 → 迪士尼樂園，好似玩左好多嘢，但後面仲有好多節目等緊我地去做，唔知期唔期待之後的事呢?",
  "最後俾你幾句祝福：快啲揾到工，身體健康，工作順利，心想事成！",
];

const TOTAL   = YOYO_MESSAGE.length;
const FLIP_MS = 420;
const FONT    = '"Fraunces","Noto Serif TC","Noto Serif SC","PingFang SC","Microsoft YaHei",serif';
const EASE    = `transform ${FLIP_MS}ms cubic-bezier(.32,.12,.22,1), box-shadow ${FLIP_MS}ms ease`;

/* ═══════════════════════════════════════════
   CurlLight — curvature lighting overlay
   ═══════════════════════════════════════════ */
function CurlLight({ amount = 0 }) {
  if (amount <= 0.03) return null;
  return (
    <div style={{
      position:'absolute', inset:0, pointerEvents:'none', zIndex:5,
      background:`linear-gradient(105deg,
        rgba(255,250,235,${amount*.16}) 0%,
        rgba(255,250,235,${amount*.24}) 18%,
        rgba(255,248,230,${amount*.10}) 38%,
        transparent 55%,
        rgba(80,55,25,${amount*.10}) 72%,
        rgba(55,35,12,${amount*.22}) 90%,
        rgba(40,22,8,${amount*.28}) 100%
      )`,
    }}/>
  );
}

/* ═══════════════════════════════════════════
   curvedClip — warps the right edge into a
   gentle curl curve (page isn't rectangular)
   ═══════════════════════════════════════════ */
function curvedClip(curlAmt) {
  if (curlAmt < 0.04) return undefined;
  const pts = [];
  const N   = 20;
  const bend = curlAmt * 8;
  for (let j = 0; j <= N; j++) {
    const t = j / N;
    const x = 100 - bend * Math.sin(Math.PI * t) - curlAmt * 2 * t;
    pts.push(`${x.toFixed(1)}% ${(t * 100).toFixed(1)}%`);
  }
  for (let j = N; j >= 0; j--) pts.push(`0% ${(j / N * 100).toFixed(1)}%`);
  return `polygon(${pts.join(',')})`;
}

/* ═══════════════════════════════════════════
   MemoPage — ruled paper with message
   ═══════════════════════════════════════════ */
function MemoPage({ message, pageNum, curlAmount = 0 }) {
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(180deg,#fffaf2,#fef8e6 35%,#fdf4dc 75%,#f8edd0)',
      }}/>
      <div style={{
        position:'absolute', inset:0, opacity:.04, pointerEvents:'none',
        backgroundImage:'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.85\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        backgroundSize:'150px 150px',
      }}/>
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        backgroundImage:'repeating-linear-gradient(transparent,transparent 28px,rgba(195,175,140,.16) 28px,rgba(195,175,140,.16) 29px)',
        backgroundPosition:'0 38px',
      }}/>
      <div style={{
        position:'absolute', left:'42px', top:0, bottom:0, width:'1.5px',
        background:'linear-gradient(180deg,rgba(210,95,95,.1),rgba(210,95,95,.2),rgba(210,95,95,.1))',
        pointerEvents:'none',
      }}/>
      <div style={{
        position:'absolute', inset:0, padding:'38px 20px 44px 56px',
        overflowY:'auto', WebkitOverflowScrolling:'touch', touchAction:'pan-y',
      }}>
        <p style={{
          fontFamily:FONT, fontStyle:'italic', fontSize:'15.5px', lineHeight:'28px',
          margin:0, color:'#4a3828', textAlign:'left', letterSpacing:'.3px',
        }}>{message}</p>
      </div>
      <div style={{
        position:'absolute', bottom:'14px', right:'18px',
        display:'flex', alignItems:'center', gap:'5px',
      }}>
        <span style={{
          width:'24px', height:'24px', borderRadius:'50%',
          background:'rgba(255,107,74,.12)', display:'flex',
          alignItems:'center', justifyContent:'center',
          fontFamily:FONT, fontSize:'11px', color:'#c4926e', fontWeight:'bold',
        }}>{pageNum}</span>
        <span style={{ fontSize:'10px', color:'#c0ae98', fontFamily:FONT }}>/ {TOTAL}</span>
      </div>
      <span style={{ position:'absolute', bottom:'16px', left:'54px', fontSize:'15px', opacity:.14, pointerEvents:'none' }}>♡</span>
      <span style={{ position:'absolute', top:'42px', right:'20px', fontSize:'11px', opacity:.1, pointerEvents:'none' }}>✿</span>
      <span style={{ position:'absolute', top:'65%', right:'30px', fontSize:'13px', opacity:.08, pointerEvents:'none' }}>☆</span>
      <CurlLight amount={curlAmount}/>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PageBack — decorative reverse side
   ═══════════════════════════════════════════ */
function PageBack({ curlAmount = 0 }) {
  return (
    <div style={{
      position:'absolute', inset:0, overflow:'hidden',
      background:'linear-gradient(145deg,#f2e8d2,#ece0c4 50%,#f2e8d2)',
    }}>
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        backgroundImage:[
          'radial-gradient(ellipse at 30% 75%,rgba(200,180,140,.08),transparent 55%)',
          'radial-gradient(ellipse at 80% 20%,rgba(200,180,140,.06),transparent 45%)',
        ].join(','),
      }}/>
      <div style={{
        position:'absolute', top:'50%', left:'50%',
        transform:'translate(-50%,-50%) rotate(-14deg)',
        fontFamily:FONT, fontStyle:'italic', fontSize:'28px',
        color:'rgba(180,155,115,.07)', whiteSpace:'nowrap', pointerEvents:'none',
      }}>~ written with love ~</div>
      <div style={{
        position:'absolute', bottom:'18%', right:'14%',
        width:'72px', height:'72px', borderRadius:'50%',
        border:'3.5px solid rgba(185,145,100,.07)', pointerEvents:'none',
      }}/>
      {Array.from({length:10},(_,i)=>(
        <div key={i} style={{
          position:'absolute', left:`${8+i*9.5}%`, top:0, bottom:0, width:'1px',
          background:'rgba(200,180,150,.035)', pointerEvents:'none',
        }}/>
      ))}
      <CurlLight amount={curlAmount * .7}/>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main modal
   ═══════════════════════════════════════════ */
export default function MessageModal({ open, onClose }){

  const [page,    setPage]    = useState(0);
  const [angle,   setAngle]   = useState(0);
  const [flipDir, setFlipDir] = useState(null);
  const [anim,    setAnim]    = useState(false);

  const drag    = useRef({ active:false, startX:0, startY:0, w:400, started:false });
  const bookRef = useRef(null);
  const pRef    = useRef(0);
  const aRef    = useRef(0);
  const dRef    = useRef(null);
  const busy    = useRef(false);
  const timers  = useRef([]);

  useEffect(()=>{ pRef.current = page; }, [page]);

  const clearTimers = useCallback(()=>{
    timers.current.forEach(t=>clearTimeout(t));
    timers.current = [];
    busy.current = false;
  },[]);

  useEffect(()=> clearTimers, [clearTimers]);

  useEffect(()=>{
    if(open){
      clearTimers();
      setPage(0); pRef.current=0;
      setAngle(0); aRef.current=0;
      setFlipDir(null); dRef.current=null;
      setAnim(false);
    }
  },[open, clearTimers]);

  const later = useCallback((fn,ms)=>{
    const id = setTimeout(fn,ms);
    timers.current.push(id);
    return id;
  },[]);

  const doFlip = useCallback((dir)=>{
    if(busy.current) return;
    const np = pRef.current + dir;
    if(np < 0 || np >= TOTAL) return;
    busy.current = true;

    if(dir === 1){
      setFlipDir(1); dRef.current=1;
      setAngle(0); aRef.current=0;
      setAnim(true);
      requestAnimationFrame(()=>{ setAngle(-180); aRef.current=-180; });
      later(()=>{
        setPage(np); pRef.current=np;
        setAngle(0); aRef.current=0;
        setFlipDir(null); dRef.current=null;
        setAnim(false); busy.current=false;
      }, FLIP_MS + 30);
    } else {
      setFlipDir(-1); dRef.current=-1;
      setAngle(-180); aRef.current=-180;
      setAnim(false);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        setAnim(true);
        setAngle(0); aRef.current=0;
        later(()=>{
          setPage(np); pRef.current=np;
          setAngle(0); aRef.current=0;
          setFlipDir(null); dRef.current=null;
          setAnim(false); busy.current=false;
        }, FLIP_MS + 30);
      }));
    }
  },[later]);

  const flipNext = useCallback(()=> doFlip(1),  [doFlip]);
  const flipPrev = useCallback(()=> doFlip(-1), [doFlip]);

  /* ── keyboard ── */
  useEffect(()=>{
    if(!open) return;
    const k = e => {
      if(e.key==='ArrowRight'||e.key==='ArrowDown'){ e.preventDefault(); flipNext(); }
      if(e.key==='ArrowLeft' ||e.key==='ArrowUp'){ e.preventDefault(); flipPrev(); }
      if(e.key==='Escape') onClose();
    };
    window.addEventListener('keydown', k);
    return ()=>window.removeEventListener('keydown', k);
  },[open, flipNext, flipPrev, onClose]);

  /* ── pointer drag = page flip ── */
  const onDown = useCallback(e=>{
    if(busy.current) return;
    e.stopPropagation();
    const r = bookRef.current?.getBoundingClientRect();
    if(!r) return;
    drag.current = { active:true, startX:e.clientX, startY:e.clientY, w:r.width, started:false };
    try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(_){}
  },[]);

  const onMove = useCallback(e=>{
    if(!drag.current.active || busy.current) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;

    if(!drag.current.started){
      if(Math.abs(dx) < 10) return;
      if(Math.abs(dy) > Math.abs(dx) * 1.6){ drag.current.active = false; return; }
      drag.current.started = true;

      if(dx < 0 && pRef.current < TOTAL-1){
        setFlipDir(1); dRef.current=1; setAngle(0); aRef.current=0;
      } else if(dx > 0 && pRef.current > 0){
        setFlipDir(-1); dRef.current=-1; setAngle(-180); aRef.current=-180;
      } else { drag.current.active = false; return; }
      setAnim(false);
    }

    const w = drag.current.w;
    if(dRef.current === 1){
      const p = Math.min(1, Math.abs(dx) / (w * .82));
      const a = -180 * p; setAngle(a); aRef.current=a;
    } else if(dRef.current === -1){
      const p = Math.min(1, dx / (w * .82));
      const a = -180 + 180 * p; setAngle(a); aRef.current=a;
    }
  },[]);

  const onUp = useCallback(()=>{
    if(!drag.current.active) return;
    drag.current.active = false;
    if(!drag.current.started) return;

    const a = aRef.current, d = dRef.current;

    if(d === 1){
      if(a < -88){ doFlip(1); }
      else {
        busy.current = true;
        setAnim(true); setAngle(0); aRef.current=0;
        later(()=>{ setFlipDir(null); dRef.current=null; setAnim(false); busy.current=false; }, FLIP_MS+30);
      }
    } else if(d === -1){
      if(a > -88){ doFlip(-1); }
      else {
        busy.current = true;
        setAnim(true); setAngle(-180); aRef.current=-180;
        later(()=>{
          setAnim(false); setAngle(0); aRef.current=0;
          setFlipDir(null); dRef.current=null; busy.current=false;
        }, FLIP_MS+30);
      }
    }
  },[doFlip, later]);

  if(!open) return null;

  /* ── message routing ── */
  const curMsg   = YOYO_MESSAGE[page];
  const underMsg = flipDir===1 && page<TOTAL-1 ? YOYO_MESSAGE[page+1] : curMsg;
  const frontMsg = flipDir===-1 && page>0 ? YOYO_MESSAGE[page-1] : curMsg;
  const underNum = flipDir===1 && page<TOTAL-1 ? page+2 : page+1;
  const frontNum = flipDir===-1 && page>0 ? page : page+1;

  /* ═══════ CURL CALCULATIONS ═══════ */
  const absAngle = Math.abs(angle);
  const curlAmt  = flipDir ? Math.sin(Math.PI * absAngle / 180) : 0;
  const clipPath = curvedClip(curlAmt);
  const curlSkew = curlAmt * 2;
  const curlTilt = curlAmt * 1.2;
  const flipShadow = `0 ${absAngle*.05}px ${6+absAngle*.14}px rgba(0,0,0,${.06+absAngle*.0022})`;

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(12,4,6,.95)',
      zIndex:9999999, display:'flex', alignItems:'center', justifyContent:'center',
      padding:'20px', pointerEvents:'auto',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%', maxWidth:'440px', maxHeight:'88vh',
        display:'flex', flexDirection:'column', gap:'12px',
      }}>

        <h3 style={{
          fontFamily:FONT, fontStyle:'italic', fontSize:'24px',
          margin:0, color:'#f8e8d0', textAlign:'center',
          textShadow:'0 2px 12px rgba(0,0,0,.3)',
        }}>A message for you</h3>

        {/* ═══════ BOOK ═══════ */}
        <div ref={bookRef} onPointerDown={onDown} onPointerMove={onMove}
          onPointerUp={onUp} onPointerCancel={onUp} style={{
            position:'relative', perspective:'1200px', flex:'1', minHeight:'340px',
            touchAction:'pan-y', cursor:'grab', userSelect:'none', WebkitUserSelect:'none',
          }}>

          {/* book cover */}
          <div style={{
            position:'absolute', inset:'-12px', borderRadius:'8px 18px 18px 8px',
            background:'linear-gradient(135deg,#7a5c1e,#5a3e0e 40%,#4a3208 70%,#7a5c1e)',
            boxShadow:'0 28px 70px rgba(0,0,0,.55), inset 0 0 40px rgba(0,0,0,.25)',
          }}/>
          <div style={{
            position:'absolute', inset:'-12px', borderRadius:'8px 18px 18px 8px',
            opacity:.06, pointerEvents:'none',
            backgroundImage:'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'g\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.65\' numOctaves=\'5\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23g)\'/%3E%3C/svg%3E")',
            backgroundSize:'120px 120px',
          }}/>
          {/* page stack edges */}
          {[3,2,1,0].map(i=>(
            <div key={i} style={{
              position:'absolute', inset:0, marginLeft:`${(i+1)*1.8}px`, marginTop:`${(i+1)*1.2}px`,
              borderRadius:'2px 13px 13px 2px',
              background:'linear-gradient(180deg,#f0e8d4,#e6dac2)', opacity:.65-i*.12,
            }}/>
          ))}

          {/* under page */}
          <div style={{
            position:'absolute', inset:0, borderRadius:'2px 13px 13px 2px',
            overflow:'hidden', zIndex:1,
            boxShadow:`inset 3px 0 ${12+curlAmt*8}px rgba(0,0,0,${.1+curlAmt*.08})`,
          }}>
            <MemoPage message={underMsg} pageNum={underNum} curlAmount={curlAmt * 0.3}/>
          </div>

          {/* ═══════ FLIPPING PAGE ═══════ */}
          <div style={{
            position:'absolute', inset:0,
            transformStyle:'preserve-3d',
            transformOrigin:'left center',
            transform:`rotateY(${angle}deg) skewY(${curlSkew}deg) rotateZ(${curlTilt}deg)`,
            transition: anim ? EASE : 'none',
            zIndex:2, borderRadius:'2px 13px 13px 2px', boxShadow: flipShadow,
          }}>

            {/* front face */}
            <div style={{
              position:'absolute', inset:0,
              backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
              clipPath,
              overflow:'hidden',
            }}>
              <MemoPage message={frontMsg} pageNum={frontNum} curlAmount={curlAmt}/>
              {/* curved edge shadow */}
              {curlAmt > 0.03 && (
                <div style={{
                  position:'absolute', inset:0, pointerEvents:'none', zIndex:7,
                  background:`linear-gradient(90deg,
                    transparent 60%,
                    rgba(0,0,0,${curlAmt*.06}) 80%,
                    rgba(0,0,0,${curlAmt*.16}) 95%,
                    rgba(0,0,0,${curlAmt*.22}) 100%
                  )`,
                }}/>
              )}
            </div>

            {/* back face */}
            <div style={{
              position:'absolute', inset:0,
              backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
              transform:'rotateY(180deg)',
              clipPath,
              overflow:'hidden',
            }}>
              <PageBack curlAmount={curlAmt}/>
              {curlAmt > 0.03 && (
                <div style={{
                  position:'absolute', inset:0, pointerEvents:'none', zIndex:7,
                  background:`linear-gradient(270deg,
                    transparent 60%,
                    rgba(0,0,0,${curlAmt*.05}) 80%,
                    rgba(0,0,0,${curlAmt*.12}) 95%
                  )`,
                }}/>
              )}
            </div>
          </div>

          {/* spiral binding */}
          <div style={{
            position:'absolute', left:'18px', top:'20px', bottom:'20px',
            display:'flex', flexDirection:'column', justifyContent:'space-between',
            zIndex:10, pointerEvents:'none',
          }}>
            {Array.from({length:11},(_,i)=>(
              <div key={i} style={{
                width:'14px', height:'14px', borderRadius:'50%',
                background:'radial-gradient(circle at 36% 30%,#d0c8b8,#9a8e78)',
                boxShadow:'inset 0 2.5px 4px rgba(0,0,0,.3), 0 1px 2px rgba(255,255,255,.12)',
                border:'1px solid rgba(130,110,85,.25)',
              }}/>
            ))}
          </div>
          <div style={{
            position:'absolute', left:'24.5px', top:'20px', bottom:'20px',
            width:'2px', zIndex:9, pointerEvents:'none',
            background:'linear-gradient(180deg,#b8a890,#c8bcac,#b8a890)', opacity:.45,
          }}/>

          {/* washi tapes */}
          <div style={{
            position:'absolute', top:'-11px', right:'38px', width:'120px', height:'23px',
            background:'linear-gradient(90deg,rgba(255,172,182,.82),rgba(255,142,162,.9),rgba(255,172,182,.82))',
            transform:'rotate(-4deg)', borderRadius:'1px',
            boxShadow:'0 3px 8px rgba(0,0,0,.12)', zIndex:11, pointerEvents:'none',
            display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden',
          }}>
            <span style={{
              fontFamily:FONT, fontSize:'8.5px', color:'rgba(255,255,255,.92)',
              letterSpacing:'2.5px', textTransform:'uppercase', fontWeight:'600',
            }}>for Yoyo ♡</span>
          </div>
          <div style={{
            position:'absolute', top:'-6px', left:'55px', width:'52px', height:'16px',
            background:'linear-gradient(90deg,rgba(180,210,255,.5),rgba(140,185,255,.55),rgba(180,210,255,.5))',
            transform:'rotate(2deg)', borderRadius:'1px', zIndex:11, pointerEvents:'none',
          }}/>

          {/* swipe hint */}
          {page===0 && !flipDir && (
            <div style={{
              position:'absolute', right:'16px', top:'50%', transform:'translateY(-50%)',
              zIndex:12, pointerEvents:'none', opacity:.35,
              display:'flex', flexDirection:'column', alignItems:'center', gap:'2px',
            }}>
              <span style={{fontSize:'18px', color:'#c0aa88'}}>‹</span>
              <span style={{
                fontFamily:FONT, fontSize:'8px', color:'#c0aa88',
                writingMode:'vertical-rl', letterSpacing:'2px',
              }}>swipe</span>
            </div>
          )}
        </div>

        {/* ═══════ NAVIGATION ═══════ */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' }}>
          <button onClick={flipPrev} disabled={page===0} aria-label="Previous page" style={{
            width:'38px', height:'38px', borderRadius:'50%',
            border:`1.5px solid ${page===0?'rgba(255,200,180,.12)':'rgba(255,200,180,.32)'}`,
            background:'transparent',
            color:page===0?'rgba(255,200,180,.12)':'rgba(255,200,180,.8)',
            cursor:page===0?'default':'pointer', fontSize:'17px', fontWeight:'bold',
            display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s',
          }}>‹</button>

          <div style={{ display:'flex', gap:'5px', alignItems:'center', padding:'0 8px' }}>
            {YOYO_MESSAGE.map((_,i)=>(
              <button key={i} onClick={()=>{ if(!busy.current){ if(i>page) flipNext(); else if(i<page) flipPrev(); } }}
                aria-label={`Go to page ${i+1}`} style={{
                  width:i===page?'26px':'8px', height:'8px', borderRadius:'4px',
                  background:i===page?'#ff6b4a':'rgba(255,200,180,.22)',
                  border:'none', cursor:'pointer', padding:0,
                  transition:'all .35s cubic-bezier(.25,.8,.25,1)',
                }}/>
            ))}
          </div>

          <button onClick={flipNext} disabled={page===TOTAL-1} aria-label="Next page" style={{
            width:'38px', height:'38px', borderRadius:'50%',
            border:`1.5px solid ${page===TOTAL-1?'rgba(255,200,180,.12)':'rgba(255,200,180,.32)'}`,
            background:'transparent',
            color:page===TOTAL-1?'rgba(255,200,180,.12)':'rgba(255,200,180,.8)',
            cursor:page===TOTAL-1?'default':'pointer', fontSize:'17px', fontWeight:'bold',
            display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s',
          }}>›</button>
        </div>

        <div style={{
          textAlign:'center', fontSize:'11px', color:'rgba(255,200,180,.35)',
          fontFamily:FONT, letterSpacing:'1px',
        }}>
          {page+1} / {TOTAL} · swipe to flip
        </div>

        <button onClick={onClose} style={{
          background:'#ff6b4a', color:'#fff1dc', border:'none',
          padding:'14px 24px', borderRadius:'999px', fontSize:'12px',
          fontWeight:'bold', cursor:'pointer', textTransform:'uppercase',
          letterSpacing:'1.5px', width:'100%', transition:'transform .15s',
        }}>Close</button>
      </div>
    </div>
  );
}