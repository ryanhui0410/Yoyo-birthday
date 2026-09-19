import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/* ============================================================
   PeachCake3D — Pinky Party Cake
   Two pink tiers, dripping cream, packed whole-strawberry rings
   on both tier tops, bunny topper (from the Kerom template),
   sprinkles on domes + skirts, candles ringing fruit & bunny.
   Full candle protocol restored (candles / blowing props).
   ============================================================ */

/* ---------------- procedural helpers ---------------- */

function mulberry32(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0;
  let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296; }; }

function radialTexture(inner, outer){
  const c=document.createElement('canvas'); c.width=c.height=128;
  const g=c.getContext('2d');
  const grd=g.createRadialGradient(64,64,0,64,64,64);
  grd.addColorStop(0,inner); grd.addColorStop(1,outer);
  g.fillStyle=grd; g.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}

function cakeTexture(){
  const rnd = mulberry32(7);
  const c=document.createElement('canvas'); c.width=1024; c.height=512;
  const g=c.getContext('2d');
  const grad=g.createLinearGradient(0,0,0,512);
  grad.addColorStop(0,'#f9bfd3'); grad.addColorStop(1,'#f4a2c0');   // pink sponge
  g.fillStyle=grad; g.fillRect(0,0,1024,512);
  for(let i=0;i<420;i++){
    const x=rnd()*1024, y=rnd()*512, r=2+rnd()*7;
    g.fillStyle = rnd()<0.72 ? 'rgba(253,228,240,0.85)' : 'rgba(230,130,170,0.6)';
    g.beginPath(); g.ellipse(x,y,r,r*(0.6+rnd()*0.5),rnd()*Math.PI,0,Math.PI*2); g.fill();
  }
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}

/* deep crimson strawberry skin with pale seeds */
function berryTexture(){
  const rnd = mulberry32(21);
  const c=document.createElement('canvas'); c.width=c.height=256;
  const g=c.getContext('2d');
  g.fillStyle='#b3122a'; g.fillRect(0,0,256,256);
  for(let i=0;i<120;i++){
    g.globalAlpha=0.15+rnd()*0.25; g.fillStyle='#7e0c1d';
    g.beginPath(); g.arc(rnd()*256,rnd()*256,2+rnd()*4,0,Math.PI*2); g.fill();
  }
  g.fillStyle='#ffdcb0';
  for(let gy=0;gy<9;gy++)for(let gx=0;gx<7;gx++){
    g.save();
    g.globalAlpha=0.75+rnd()*0.25;
    g.translate(gx*37+(gy%2?18:0)+(rnd()-0.5)*10, gy*28+14+(rnd()-0.5)*8);
    g.rotate((rnd()-0.5)*0.7);
    g.beginPath(); g.ellipse(0,0,2.4,4.2,0,0,Math.PI*2); g.fill();
    g.restore();
  }
  g.globalAlpha=1;
  const t=new THREE.CanvasTexture(c);
  t.colorSpace=THREE.SRGBColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(3,2);
  return t;
}

/* striped candle body per [c1,c2] pair (app-provided colors) */
const texCache = {};
function candleTexture(c1, c2){
  const key = c1 + '|' + c2;
  if (texCache[key]) return texCache[key];
  const cv = document.createElement('canvas');
  cv.width = 16; cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = c1; g.fillRect(0, 0, 16, 64);
  g.strokeStyle = c2; g.lineWidth = 5;
  for (let x = -64; x < 32; x += 14){
    g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 40, 0); g.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  texCache[key] = tex;
  return tex;
}

/* default pink-striped candle body */
function defaultCandleTexture(){
  const c=document.createElement('canvas'); c.width=c.height=128;
  const g=c.getContext('2d');
  g.fillStyle='#fff6ea'; g.fillRect(0,0,128,128);
  g.save(); g.translate(64,64); g.rotate(Math.PI/4);
  g.fillStyle='#f27ba8';
  for(let i=-5;i<=5;i++) g.fillRect(i*32-7,-96,14,192);
  g.restore();
  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(3,1);
  t.colorSpace=THREE.SRGBColorSpace; return t;
}

/* ---------------- materials ---------------- */

const icingMat    = new THREE.MeshStandardMaterial({ color:0xfff5e6, roughness:0.5, side:THREE.DoubleSide });
const cakeSideMat = new THREE.MeshStandardMaterial({ map:cakeTexture(), roughness:0.65 });
const cakeCapMat  = new THREE.MeshStandardMaterial({ color:0xf2a9c6, roughness:0.7 });
const ribbonMat   = new THREE.MeshStandardMaterial({ color:0xee6fa2, roughness:0.45 });
const plateMat    = new THREE.MeshStandardMaterial({ color:0xf27ba8, roughness:0.5 });
const plateInMat  = new THREE.MeshStandardMaterial({ color:0xffedf4, roughness:0.6 });

const berryMat    = new THREE.MeshStandardMaterial({ map:berryTexture(), roughness:0.32 });
const leafMat     = new THREE.MeshStandardMaterial({ color:0x5da53c, roughness:0.55 });
const defaultCandleTex = defaultCandleTexture();

/* ---------------- dripping cream skirt ---------------- */

function createDripSkirt(R, baseDepth, seed){
  const rnd = mulberry32(seed);
  const segs=200, rows=34;
  const th    = R*0.03 + 0.035;
  const bulge = R*0.035;

  const drips=[]; const n=9;
  for(let i=0;i<n;i++) drips.push({
    a:(i/n)*Math.PI*2 + (rnd()-0.5)*0.7,
    depth: baseDepth*(1.1+rnd()*0.45),
    w: 0.12+rnd()*0.12
  });
  const b0 = baseDepth*0.5;
  const depthAt = a=>{
    let d = b0 + baseDepth*0.08*Math.sin(a*3+1.7) + baseDepth*0.05*Math.sin(a*5+4.2);
    for(const D of drips){
      const da=Math.atan2(Math.sin(a-D.a),Math.cos(a-D.a));
      d += (D.depth-b0)*Math.exp(-(da*da)/(2*D.w*D.w));
    }
    return d;
  };

  const pos=[], uv=[], idx=[];
  for(let i=0;i<=rows;i++){
    const t=i/rows;
    for(let j=0;j<=segs;j++){
      const a=(j/segs)*Math.PI*2;
      const d=depthAt(a);
      const prom=THREE.MathUtils.clamp((d-b0)/(baseDepth*1.1),0,1);
      let r = R + th
            + bulge*Math.pow(Math.sin(Math.PI*t),0.75)*(0.3+0.7*prom)
            - th*(0.35+0.55*prom)*Math.pow(t,5);
      pos.push(Math.cos(a)*r, -t*d, Math.sin(a)*r);
      uv.push(j/segs, 1-t);
    }
  }
  for(let i=0;i<rows;i++) for(let j=0;j<segs;j++){
    const a0=i*(segs+1)+j, b=a0+1, c=a0+segs+1, d=c+1;
    idx.push(a0,b,c, b,d,c);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uv,2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo, icingMat);
  mesh.castShadow = mesh.receiveShadow = true;
  return { mesh, th };
}

function createIcingDome(Rover, k){
  const mesh=new THREE.Mesh(
    new THREE.SphereGeometry(Rover, 72, 20, 0, Math.PI*2, 0, Math.PI/2), icingMat);
  mesh.scale.y=k;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/* ---------------- tier factory ---------------- */

function makeTier(cfg, seed){
  const {R,H,drip}=cfg;
  const g=new THREE.Group();

  const body=new THREE.Mesh(new THREE.CylinderGeometry(R,R,H,80,1),
                            [cakeSideMat, cakeCapMat, cakeCapMat]);
  body.position.y=H/2; body.castShadow=body.receiveShadow=true; g.add(body);

  const ribbon=new THREE.Mesh(new THREE.TorusGeometry(R+0.015, H*0.06, 16, 100), ribbonMat);
  ribbon.rotation.x=Math.PI/2; ribbon.position.y=H*0.085;
  ribbon.castShadow=true; g.add(ribbon);

  const skirt=createDripSkirt(R, drip, seed);
  const Rover=R+skirt.th, k=0.155;
  const icing=new THREE.Group();
  icing.add(createIcingDome(Rover,k), skirt.mesh);
  icing.position.y=H; g.add(icing);

  return { group:g, Rover, k, th:skirt.th, icingBaseY:H, domeH:Rover*k, skirtDepth:drip };
}

/* ---------------- decal geometry (side hearts/stars) ---------------- */

function heartGeo(h, d){
  const s=new THREE.Shape();
  s.moveTo(2.5,2.5);
  s.bezierCurveTo(2.5,2.5,2,0,0,0);
  s.bezierCurveTo(-3,0,-3,3.5,-3,3.5);
  s.bezierCurveTo(-3,5.5,-1,7.7,2.5,9.5);
  s.bezierCurveTo(6,7.7,8,5.5,8,3.5);
  s.bezierCurveTo(8,3.5,8,0,5,0);
  s.bezierCurveTo(3.5,0,2.5,2.5,2.5,2.5);
  const sc=h/9.5;
  const g=new THREE.ExtrudeGeometry(s,{ depth:d/sc, bevelEnabled:true,
    bevelThickness:d*0.3/sc, bevelSize:d*0.3/sc, bevelSegments:3, curveSegments:22 });
  g.center(); g.scale(sc,sc,sc); g.rotateZ(Math.PI);
  return g;
}

function starGeo(finalR, finalD){
  const shape=new THREE.Shape(); const spikes=5;
  for(let i=0;i<spikes*2;i++){
    const r=i%2===0?1:0.45;
    const a=i/(spikes*2)*Math.PI*2 - Math.PI/2;
    i===0?shape.moveTo(Math.cos(a)*r,Math.sin(a)*r)
         :shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);
  }
  shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{ depth:finalD/finalR, bevelEnabled:true,
    bevelThickness:finalD*0.3/finalR, bevelSize:finalD*0.25/finalR,
    bevelSegments:2, curveSegments:8 });
  g.scale(finalR,finalR,finalR); g.center(); return g;
}

/* ---------------- strawberry geometry ---------------- */

function latheFrom(ctrl, seg){
  const curve=new THREE.CatmullRomCurve3(ctrl.map(p=>new THREE.Vector3(p[0],p[1],0)));
  const pts=curve.getPoints(46).map(v=>new THREE.Vector2(Math.max(0,v.x),v.y));
  return new THREE.LatheGeometry(pts, seg||40);
}

const berryGeo = latheFrom([[0,0],[0.18,0.08],[0.34,0.26],[0.45,0.55],
  [0.47,0.8],[0.4,1.02],[0.22,1.1],[0,1.13]], 36);

const leafGeo = new THREE.SphereGeometry(0.14,10,8);
const stemGeo = new THREE.CylinderGeometry(0.035,0.05,0.18,8);

/* ---------------- bunny topper (ported from the Kerom template) ---------------- */

function buildBunny(){
  const white  = new THREE.MeshStandardMaterial({ color:0xfffaf3, roughness:.55 });
  const pinkIn = new THREE.MeshStandardMaterial({ color:0xffc7d2, roughness:.6 });
  const blush  = new THREE.MeshStandardMaterial({ color:0xffb9c4, roughness:.7 });
  const pinkN  = new THREE.MeshStandardMaterial({ color:0xff8fa3, roughness:.5 });
  const black  = new THREE.MeshStandardMaterial({ color:0x2e2530, roughness:.25 });
  const hi     = new THREE.MeshBasicMaterial({ color:0xffffff });
  const green  = new THREE.MeshStandardMaterial({ color:0x5fbf6e, roughness:.6 });
  const orange = new THREE.MeshStandardMaterial({ color:0xff7a45, roughness:.6 });
  const hatM   = new THREE.MeshStandardMaterial({ color:0xff9cb5, roughness:.55 });

  const bunny = new THREE.Group();
  const S = (r, ws = 16, hs = 12) => new THREE.SphereGeometry(r, ws, hs);
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent = bunny) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true;
    parent.add(m); return m;
  };

  add(S(.36), white, 0, .35, 0, 1, .95, .9);                          // body
  add(S(.31), white, 0, .83, .02);                                    // head
  const earL = add(new THREE.CapsuleGeometry(.088, .30, 6, 12), white, -.16, 1.27, -.02, 1, 1, .42);
  earL.rotation.set(-.12, 0, .3);
  add(new THREE.CapsuleGeometry(.05, .20, 5, 10), pinkIn, -.16, 1.28, .04, 1, 1, .22).rotation.set(-.12, 0, .3);
  const earR = add(new THREE.CapsuleGeometry(.088, .30, 6, 12), white, .16, 1.27, -.02, 1, 1, .42);
  earR.rotation.set(-.12, 0, -.3);
  add(new THREE.CapsuleGeometry(.05, .20, 5, 10), pinkIn, .16, 1.28, .04, 1, 1, .22).rotation.set(-.12, 0, -.3);
  add(S(.048, 12, 10), black, -.115, .88, .26);                       // eyes
  add(S(.048, 12, 10), black,  .115, .88, .26);
  add(S(.015, 8, 6), hi, -.10, .90, .30); add(S(.015, 8, 6), hi, .13, .90, .30);
  add(S(.06, 12, 10), blush, -.20, .75, .20, 1, .6, .75);             // cheeks
  add(S(.06, 12, 10), blush,  .20, .75, .20, 1, .6, .75);
  add(S(.03, 10, 8), pinkN, 0, .81, .30);                             // nose
  add(new THREE.TorusGeometry(.034, .007, 6, 12, Math.PI), black, 0, .765, .287).rotation.z = Math.PI;
  add(S(.10, 12, 10), white, -.30, .42, .14, 1, .75, .75);            // arms
  add(S(.10, 12, 10), white,  .30, .42, .14, 1, .75, .75);
  add(S(.12, 12, 10), white, -.17, .07, .26, 1, .5, 1.35);            // feet
  add(S(.12, 12, 10), white,  .17, .07, .26, 1, .5, 1.35);
  add(S(.09, 12, 10), white, 0, .30, -.33);                           // tail
  add(new THREE.ConeGeometry(.14, .32, 16), hatM, 0, 1.20, .02).rotation.z = .14;   // party hat
  add(S(.05, 10, 8), white, -.02, 1.37, .05);                         // pompom
  const carr = add(new THREE.ConeGeometry(.075, .28, 10), orange, .46, .13, .32);   // carrot
  carr.rotation.set(.35, .4, -.55);
  add(S(.035, 8, 6), green, -.03, .17, 0, 1, 1, 1, carr);
  add(S(.030, 8, 6), green,  .03, .15, .02, 1, 1, 1, carr);

  return { group: bunny, earL, earR, earLBase: .3, earRBase: -.3 };
}

/* ============================================================ */

export default function PeachCake3D({ candles, blowing }){
  const mountRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      38, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 100);
    camera.position.set(0.6, 3.6, 8.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2.05, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.1;
    controls.minDistance = 4.5;  controls.maxDistance = 14;
    controls.minPolarAngle = 0.2; controls.maxPolarAngle = 1.45;
    controls.update();

    /* ---- lights ---- */
    scene.add(new THREE.HemisphereLight(0xfff4e4, 0xffd9ae, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(5, 9, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;   key.shadow.camera.far = 25;
    key.shadow.camera.left = -6;  key.shadow.camera.right = 6;
    key.shadow.camera.top  =  8;  key.shadow.camera.bottom = -4;
    key.shadow.bias = -0.0003;    key.shadow.normalBias = 0.03;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffe2c8, 0.45);
    fill.position.set(-6, 4, -5);
    scene.add(fill);
    const candleLight = new THREE.PointLight(0xffbf76, 2.4, 7, 2);
    scene.add(candleLight);

    /* ---- assemble the cake ---- */
    const cake=new THREE.Group(); cake.scale.setScalar(0.001); scene.add(cake);

    const plate=new THREE.Mesh(new THREE.CylinderGeometry(3.02,3.14,0.24,90), plateMat);
    plate.position.y=0.12; plate.castShadow=plate.receiveShadow=true; cake.add(plate);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(3.03,0.055,14,100), plateMat);
    rim.rotation.x=Math.PI/2; rim.position.y=0.24; cake.add(rim);
    const inner=new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.56,0.12,80), plateInMat);
    inner.position.y=0.29; inner.receiveShadow=true; cake.add(inner);
    const PLATE_TOP=0.35;

    const t1=makeTier({R:2.15,H:1.5,drip:0.30}, 11);
    t1.group.position.y=PLATE_TOP; cake.add(t1.group);
    const t1BaseY = PLATE_TOP + t1.icingBaseY;

    const y2 = t1BaseY + t1.k*Math.sqrt(t1.Rover*t1.Rover-1.32*1.32) - 0.04;
    const t2=makeTier({R:1.32,H:1.05,drip:0.26}, 23);
    t2.group.position.y=y2; cake.add(t2.group);
    const t2BaseY = y2 + t2.icingBaseY;
    const t2TopY  = t2BaseY + t2.domeH;

    const SURF={
      t1:{Rover:t1.Rover, k:t1.k, baseY:t1BaseY},
      t2:{Rover:t2.Rover, k:t2.k, baseY:t2BaseY}
    };
    const domeY=(s,r)=> s.baseY + s.k*Math.sqrt(Math.max(s.Rover*s.Rover-r*r,0));

    /* ---- strawberry helper (whole berries only, planted ~30% deep) ---- */
    const rndB = mulberry32(77);
    const SINK_BERRY = 0.30;

    function addBerry(surf, x, z, s){
      const grp=new THREE.Group();
      const r=Math.hypot(x,z);
      grp.position.set(x, domeY(surf,r) - SINK_BERRY*s, z);
      cake.add(grp);

      const body=new THREE.Mesh(berryGeo, berryMat);
      body.scale.setScalar(s);
      body.rotation.set((rndB()-0.5)*0.16, rndB()*Math.PI*2, (rndB()-0.5)*0.16);
      body.castShadow=true;
      grp.add(body);

      for(let i=0;i<5;i++){
        const pv=new THREE.Group();
        pv.rotation.y=i/5*Math.PI*2+(rndB()-0.5)*0.24;
        const leaf=new THREE.Mesh(leafGeo, leafMat);
        leaf.scale.set(1.5,0.3,0.8);
        leaf.position.set(0.21,1.08,0);
        leaf.rotation.z=-0.4;
        leaf.castShadow=true;
        pv.add(leaf); body.add(pv);
      }
      const stem=new THREE.Mesh(stemGeo, leafMat);
      stem.position.y=1.14; stem.castShadow=true;
      body.add(stem);
    }

    /* ---- top tier: berry ring, bunny replaces the center berry ---- */
    const nTop=8;
    for(let i=0;i<nTop;i++){
      const a=(i+0.5)/nTop*Math.PI*2+(rndB()-0.5)*0.12;
      addBerry(SURF.t2, Math.cos(a)*0.68, Math.sin(a)*0.68, 0.52+rndB()*0.08);
    }

    const BUNNY_S = 0.78;
    const bun = buildBunny();
    bun.group.position.set(0, t2TopY - 0.04, 0);   // feet planted into the icing
    bun.group.rotation.y = 0.12;
    bun.group.scale.setScalar(BUNNY_S);
    cake.add(bun.group);

    /* ---- bottom tier: tightly packed berry ring ---- */
    const nBot=14;
    for(let i=0;i<nBot;i++){
      const a=(i+0.5)/nBot*Math.PI*2+(rndB()-0.5)*0.06;
      const r=1.55+(rndB()-0.5)*0.08;              // slight radial jitter so they nestle
      addBerry(SURF.t1, Math.cos(a)*r, Math.sin(a)*r, 0.55+rndB()*0.07);
    }

    /* ---- side decals: stars + hearts share one slot ring ---- */
    const rndS=mulberry32(31);
    const starColors=[0xc9a0f2,0xb993ec,0xf4b1d8,0xd9b3f7];

    const SLOTS=11, STEP=(Math.PI*2)/SLOTS;
    const heartSlots=new Map([[3,0xf0629c],[8,0xf49fc4]]);
    let starIdx=0;
    for(let s=0;s<SLOTS;s++){
      const a=s*STEP + (rndS()-0.5)*STEP*0.3;
      const isHeart=heartSlots.has(s);
      const m=new THREE.Mesh(
        isHeart ? heartGeo(0.5,0.08) : starGeo(0.24+rndS()*0.12, 0.09),
        new THREE.MeshStandardMaterial({
          color: isHeart ? heartSlots.get(s) : starColors[starIdx++ % starColors.length],
          roughness:0.45 }));
      const y=PLATE_TOP + (s%2===0 ? 0.40 : 0.62) + rndS()*0.12;
      m.position.set(Math.cos(a)*2.16, y, Math.sin(a)*2.16);
      m.rotation.y=Math.PI/2-a; m.castShadow=true; cake.add(m);
    }

    /* ---- rainbow sprinkles: dome bands + drip skirts ----
       Bands are chosen to avoid the berry rings, bunny and candles. */
    const palette=[0xff5b5b,0xffa53e,0xffd93d,0x5fd068,0x54a9ff,0xa97df2,0xff8ac2];
    const MAXS=210;
    const sprinkles=new THREE.InstancedMesh(
      new THREE.CapsuleGeometry(0.042,0.17,4,10),
      new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.35 }), MAXS);
    sprinkles.castShadow=true;
    const dummy=new THREE.Object3D(), col=new THREE.Color(), rndK=mulberry32(55);
    let si=0;
    const paint=()=> sprinkles.setColorAt(si, col.setHex(palette[(rndK()*7)|0]));

    function onDome(surf, rMin, rMax, n){
      for(let k=0;k<n && si<MAXS;k++,si++){
        const a=rndK()*Math.PI*2;
        const r=Math.sqrt(rMin*rMin+(rMax*rMax-rMin*rMin)*rndK());
        dummy.position.set(Math.cos(a)*r, domeY(surf,r)+0.015, Math.sin(a)*r);
        dummy.rotation.set(0, rndK()*Math.PI*2, 0);
        dummy.rotateZ(Math.PI/2+(rndK()-0.5)*0.5);
        dummy.rotateX((rndK()-0.5)*0.4);
        dummy.updateMatrix(); sprinkles.setMatrixAt(si,dummy.matrix); paint();
      }
    }
    function onSkirt(R, th, baseY, depth, n){
      for(let k=0;k<n && si<MAXS;k++,si++){
        const a=rndK()*Math.PI*2, t=0.08+rndK()*0.38;
        dummy.position.set(Math.cos(a)*(R+th-0.01), baseY-t*depth*0.9, Math.sin(a)*(R+th-0.01));
        dummy.rotation.set(0, a+Math.PI/2, 0);
        dummy.rotateZ(Math.PI/2+(rndK()-0.5)*0.3);
        dummy.rotateX((rndK()-0.5)*0.5);
        dummy.updateMatrix(); sprinkles.setMatrixAt(si,dummy.matrix); paint();
      }
    }
    onDome(SURF.t2, 1.18, 1.32, 45);   // top edge band, outside candles
    onDome(SURF.t1, 1.80, 1.93, 60);   // bottom band between berries & candles
    onSkirt(2.15, t1.th, t1BaseY, t1.skirtDepth, 55);
    onSkirt(1.32, t2.th, t2BaseY, t2.skirtDepth, 45);
    dummy.position.set(0,-10,0); dummy.scale.setScalar(0.0001);
    dummy.rotation.set(0,0,0); dummy.updateMatrix();
    for(let k=si;k<MAXS;k++) sprinkles.setMatrixAt(k, dummy.matrix);   // hide unused
    sprinkles.instanceColor.needsUpdate=true;
    cake.add(sprinkles);

    /* ---- candle slots: ring around top berries+bunny, ring around bottom berries ---- */
    const slots=[];
    const rndC = mulberry32(99);
    const nTopC=6, nBotC=10;
    for(let i=0;i<nTopC;i++){
      const a=i/nTopC*Math.PI*2+0.4, r=1.08;
      slots.push({ x:Math.cos(a)*r, z:Math.sin(a)*r, surf:SURF.t2,
                   h:0.95+rndC()*0.25, phase:rndC()*10 });
    }
    for(let i=0;i<nBotC;i++){
      const a=(i+0.5)/nBotC*Math.PI*2+0.15, r=2.02;
      slots.push({ x:Math.cos(a)*r, z:Math.sin(a)*r, surf:SURF.t1,
                   h:0.8+rndC()*0.3, phase:rndC()*10 });
    }

    const wickMat = new THREE.MeshStandardMaterial({ color:0x5c4030, roughness:0.9 });
    const flameMat= new THREE.MeshBasicMaterial({ color:0xffa03c }); flameMat.toneMapped=false;
    const coreMat = new THREE.MeshBasicMaterial({ color:0xffe9a8 }); coreMat.toneMapped=false;
    const glowTex = radialTexture('rgba(255,190,110,0.85)','rgba(255,190,110,0)');
    const smokeTex= radialTexture('rgba(225,220,225,0.5)','rgba(225,220,225,0)');

    const flames=[], bodies=[];
    function addCandle(slot){
      const { x, z, h, phase } = slot;
      const rr = Math.max(0.2, Math.hypot(x, z));
      const grp=new THREE.Group();
      grp.position.set(x, domeY(slot.surf, rr)-0.05, z);
      const body=new THREE.Mesh(new THREE.CylinderGeometry(0.085,0.085,h,18),
        new THREE.MeshStandardMaterial({ map: defaultCandleTex, roughness:0.5 }));
      body.position.y=h/2; body.castShadow=true; grp.add(body);
      bodies.push(body);
      const cap=new THREE.Mesh(new THREE.SphereGeometry(0.085,18,10,0,Math.PI*2,0,Math.PI/2),
        body.material);
      cap.position.y=h; cap.scale.y=0.5; grp.add(cap);
      const wick=new THREE.Mesh(new THREE.CylinderGeometry(0.013,0.013,0.09,8), wickMat);
      wick.position.y=h+0.04; grp.add(wick);

      const flame=new THREE.Group();
      const outer=new THREE.Mesh(new THREE.SphereGeometry(0.085,14,14), flameMat);
      outer.scale.set(0.6,1.55,0.6); outer.position.y=0.09;
      const core=new THREE.Mesh(new THREE.SphereGeometry(0.085,12,12), coreMat);
      core.scale.set(0.34,0.85,0.34); core.position.y=0.05;
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, transparent:true,
        blending:THREE.AdditiveBlending, depthWrite:false, opacity:0.8 }));
      glow.material.toneMapped=false; glow.scale.set(0.55,0.55,1); glow.position.y=0.12;
      flame.add(outer,core,glow);
      flame.position.y=h+0.10; grp.add(flame);
      cake.add(grp);

      flames.push({ flame, glow, phase, cur:1, out:false,
        dirX: x / rr, dirZ: z / rr });
    }
    slots.forEach(addCandle);
    candleLight.position.set(0, t2TopY+0.55, 0);

    /* ---- ground shadow ---- */
    const shadowPlane=new THREE.Mesh(new THREE.CircleGeometry(7,48),
      new THREE.ShadowMaterial({ opacity:0.16 }));
    shadowPlane.rotation.x=-Math.PI/2; shadowPlane.position.y=-0.02;
    shadowPlane.receiveShadow=true; scene.add(shadowPlane);

    /* ---- smoke puffs ---- */
    const smoke=[];
    function spawnSmokeAt(flameGroup){
      const wp=new THREE.Vector3(); flameGroup.getWorldPosition(wp);
      for(let k=0;k<4;k++){
        const sp=new THREE.Sprite(new THREE.SpriteMaterial({ map:smokeTex, transparent:true,
          opacity:0, depthWrite:false }));
        sp.material.toneMapped=false;
        sp.position.copy(wp); sp.scale.setScalar(0.12);
        sp.userData={ life:-k*0.12, max:1.3,
          vel:new THREE.Vector3((Math.random()-0.5)*0.25, 0.55+Math.random()*0.3, (Math.random()-0.5)*0.25) };
        scene.add(sp); smoke.push(sp);
      }
    }
    function updateSmoke(dt){
      for(let i=smoke.length-1;i>=0;i--){
        const s=smoke[i], u=s.userData; u.life+=dt;
        if(u.life<0) continue;
        s.position.addScaledVector(u.vel,dt); u.vel.multiplyScalar(1-0.6*dt);
        const f=u.life/u.max;
        s.material.opacity=Math.max(0,0.45*(1-f));
        s.scale.setScalar(0.12+f*0.5);
        if(f>=1){ scene.remove(s); s.material.dispose(); smoke.splice(i,1); }
      }
    }

    /* ---- React ↔ scene bridge ---- */
    const prevOut = [];
    const engine = {
      blowFlag: false,
      setBlowing(b){ this.blowFlag = b; },
      syncCandles(cs){
        cs.forEach((c, i) => {
          const f = flames[i % flames.length];
          const body = bodies[i % bodies.length];
          if (!f) return;
          if (c.out && !f.out){
            f.out = true;
            if (!prevOut[i]) spawnSmokeAt(f.flame);
          } else if (!c.out && f.out){
            f.out = false; f.cur = 1; f.flame.visible = true;
          }
          prevOut[i] = !!c.out;
          if (body){
            const bm = body.material;
            if (c.c1 && c.c2){
              bm.map = candleTexture(c.c1, c.c2);
              bm.color.set(0xffffff);
            } else {
              bm.map = defaultCandleTex;
              bm.color.set(0xffffff);
            }
            bm.needsUpdate = true;
          }
        });
      }
    };
    engineRef.current = engine;

    /* ---- animation ---- */
    const clock=new THREE.Clock();
    let raf;
    function easeOutBack(x){ const c1=1.70158,c3=c1+1; return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2); }
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt=Math.min(clock.getDelta(),0.05), t=clock.elapsedTime;

      if(t<1.2) cake.scale.setScalar(Math.max(0.001, easeOutBack(t/1.2)));

      let lit = 0;
      flames.forEach(f=>{
        if(f.out){ f.cur=Math.max(0,f.cur-dt*7); if(f.cur===0){ f.flame.visible=false; } }
        else     { f.cur=Math.min(1,f.cur+dt*4); lit++; if(!f.flame.visible) f.flame.visible=true; }
        if(!f.flame.visible) return;
        const s=0.15+0.85*f.cur;
        const fy=1+0.16*Math.sin(t*9+f.phase)+0.07*Math.sin(t*17+f.phase*2);
        const fx=1+0.09*Math.sin(t*11+f.phase*3);
        f.flame.scale.set(s*fx, s*fy, s*fx);
        f.flame.position.x=0.008*Math.sin(t*13+f.phase);
        f.glow.material.opacity=(0.55+0.2*Math.sin(t*8+f.phase))*s;
        const k = engine.blowFlag ? 0.45 : 0;
        f.flame.rotation.x = THREE.MathUtils.lerp(f.flame.rotation.x, k * f.dirZ, 0.2);
        f.flame.rotation.z = THREE.MathUtils.lerp(f.flame.rotation.z, -k * f.dirX, 0.2);
      });
      candleLight.intensity = lit > 0 ? 2.3+0.5*Math.sin(t*7.3) : 0.2;

      /* bunny idle: gentle breathing + lazy ear sway */
      bun.group.scale.y = BUNNY_S*(1 + 0.012*Math.sin(t*2.2));
      bun.earL.rotation.z = bun.earLBase + 0.04*Math.sin(t*1.6);
      bun.earR.rotation.z = bun.earRBase - 0.04*Math.sin(t*1.6+0.7);

      updateSmoke(dt);
      controls.update();
      renderer.render(scene,camera);
    };
    loop();

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth, h = Math.max(1, mount.clientHeight);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      controls.dispose(); renderer.dispose();
      mount.removeChild(renderer.domElement);
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (engineRef.current) engineRef.current.syncCandles(candles);
  }, [candles]);
  useEffect(() => {
    if (engineRef.current) engineRef.current.setBlowing(blowing);
  }, [blowing]);

  return <div ref={mountRef} className="cake3d" aria-hidden="true"/>;
}