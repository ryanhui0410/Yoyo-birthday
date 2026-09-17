import { CONF_COLORS } from './theme.js';

/* confetti + meteor engine, drawn on one fullscreen canvas */
export function makeConfetti(canvas){
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

  /* shooting stars */
  function meteor(){
    const fromLeft=Math.random()<.5;
    meteors.push({
      x: fromLeft ? R(-40,W*.6) : R(W*.4,W+40),
      y: R(-60,H*.35),
      vx: Math.cos(R(.6,1.0))*R(13,21)*(fromLeft?1:-1),
      vy: Math.sin(R(.6,1.0))*R(13,21),
      life: 1, decay: R(.008,.014),
      w: R(4,6.5), tail: R(8,12)
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
    if(t<driz){ for(let k=0;k<2;k++) if(Math.random()<.7)
      pieces.push(piece(R(0,W),-20,R(-.7,.7),R(.6,1.6))); }
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