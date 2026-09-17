/* synthesized audio engine — no assets, all WebAudio */
export const AK = {
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
  setMuted(m){ if(!this.ctx) return;
    this.master.gain.setTargetAtTime(m?0:this.vol,this.ctx.currentTime,.04); },
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
  melody(){ /* "hap-py birth-day to you" + resolving chord */
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
    const g=this.ctx.createGain(); g.gain.setValueAtTime(.25,t);
    g.gain.exponentialRampToValueAtTime(.001,t+.14);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t+.15);
    const o=this.ctx.createOscillator(); o.type='square';
    o.frequency.setValueAtTime(300,t); o.frequency.exponentialRampToValueAtTime(70,t+.09);
    const og=this.ctx.createGain(); og.gain.setValueAtTime(.10,t);
    og.gain.exponentialRampToValueAtTime(.001,t+.1);
    o.connect(og); og.connect(this.master); o.start(t); o.stop(t+.12);
  },
  puff(){
    if(!this.ctx) return; const t=this.t();
    const s=this.ctx.createBufferSource(); s.buffer=this.noise; s.playbackRate.value=.8;
    const f=this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=650;
    const g=this.ctx.createGain(); g.gain.setValueAtTime(.05,t);
    g.gain.exponentialRampToValueAtTime(.001,t+.16);
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