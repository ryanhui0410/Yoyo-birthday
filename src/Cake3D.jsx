import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CREAM } from './theme.js';
/* ---------- procedural candle assets ---------- */

/* striped candy-cane body texture per [c1,c2] pair */
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
  texCache[key] = tex;
  return tex;
}

/* soft radial glow texture for the halo sprite */
function glowTexture(){
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grd.addColorStop(0, 'rgba(255,190,90,.9)');
  grd.addColorStop(.35, 'rgba(255,150,50,.38)');
  grd.addColorStop(1, 'rgba(255,120,30,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* teardrop flame geometry: narrow at the wick, bulge low, taper to a tip */
function flameGeometry(){
  const profile = [
    [0.004, 0.00],
    [0.045, 0.03],
    [0.088, 0.14],
    [0.082, 0.30],
    [0.050, 0.45],
    [0.020, 0.56],
    [0.002, 0.62]
  ].map(p => new THREE.Vector2(p[0], p[1]));
  return new THREE.LatheGeometry(profile, 14);
}

/* fire gradient shader: blue base → white-hot core → orange → fading tip */
function flameMaterial(){
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `
      varying float vY;
      void main(){
        vY = uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying float vY;
      void main(){
        vec3 cBase = vec3(0.55, 0.65, 0.95);   /* soft warm base at the wick */
        vec3 cCore = vec3(1.00, 0.90, 0.55);   /* golden core — no longer white-hot */
        vec3 cMid  = vec3(1.00, 0.65, 0.18);   /* yellow-orange body */
        vec3 cTip  = vec3(0.95, 0.35, 0.06);   /* ember-orange tip */
        vec3 col = mix(cBase, cCore, smoothstep(0.00, 0.28, vY));
        col = mix(col, cMid, smoothstep(0.34, 0.68, vY));
        col = mix(col, cTip, smoothstep(0.72, 0.96, vY));
        /* opaque low, dissolving toward the tip */
        float alpha = smoothstep(1.0, 0.82, vY) * smoothstep(0.0, 0.10, vY);
        alpha = mix(alpha, 1.0, smoothstep(0.10, 0.55, vY));
        gl_FragColor = vec4(col * 1.05, alpha);
      }`
  });
}

export default function Cake3D({ candles, blowing }){
  const mountRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45, mount.clientWidth / Math.max(1, mount.clientHeight), .1, 1000);
    camera.position.set(0, 10, 16);   

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .05;
    controls.maxPolarAngle = Math.PI / 2 + .02;
    controls.minDistance = 7; controls.maxDistance = 24;
    controls.target.set(0, 1.8, 0);
    controls.autoRotate = true; controls.autoRotateSpeed = 1.2;

    /* ---- lighting ---- */
    scene.add(new THREE.AmbientLight(0xfff0e6, .9));
    const key = new THREE.DirectionalLight(0xfff5ea, 1.6);
    key.position.set(7, 12, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0003;
    scene.add(key);
    const warm = new THREE.PointLight(0xffaa55, .8, 25, 0);
    warm.position.set(-8, 5, -6); scene.add(warm);
    const cool = new THREE.DirectionalLight(0x7090ff, .5);
    cool.position.set(-5, 8, -8); scene.add(cool);
    const glow = new THREE.PointLight(0xffa050, 1.2, 16, 0);
    glow.position.set(0, 4, 0); scene.add(glow);

    /* ---- materials ---- */
    const ganache = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: .35, metalness: .05 });
    const cream   = new THREE.MeshStandardMaterial({ color: 0xfffae6, roughness: .3 });
    const plateM  = new THREE.MeshStandardMaterial({ color: 0xf5f5f7, roughness: .1, metalness: .05 });
    const calyx   = new THREE.MeshStandardMaterial({ color: 0x1a1d2e, roughness: .9 });
    const wickM   = new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: .8 });

    const cake = new THREE.Group();

    /* ---- plate with rim ---- */
    const plateBase = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 3.8, .25, 64), plateM);
    plateBase.position.y = .125;
    plateBase.receiveShadow = true; plateBase.castShadow = true;
    cake.add(plateBase);
    const plateRim = new THREE.Mesh(new THREE.TorusGeometry(5.15, .18, 16, 64), plateM);
    plateRim.rotation.x = Math.PI / 2; plateRim.position.y = .22;
    plateRim.castShadow = true; cake.add(plateRim);

    /* ---- tiers ---- */
    const R = 3.8, YS = .25;
    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(R, R, .9, 64), ganache);
    bottom.position.y = YS + .45;
    bottom.castShadow = bottom.receiveShadow = true; cake.add(bottom);
    const seam = new THREE.Mesh(new THREE.CylinderGeometry(R + .02, R + .02, .2, 64), cream);
    seam.position.y = YS + 1; seam.castShadow = true; cake.add(seam);
    const topLayer = new THREE.Mesh(new THREE.CylinderGeometry(R, R, .9, 64), ganache);
    topLayer.position.y = YS + 1.55;
    topLayer.castShadow = topLayer.receiveShadow = true; cake.add(topLayer);
    const TOP_Y = YS + 2.2;
    const ganacheTop = new THREE.Mesh(new THREE.CylinderGeometry(R + .04, R + .04, .4, 64), ganache);
    ganacheTop.position.y = TOP_Y - .2;
    ganacheTop.castShadow = ganacheTop.receiveShadow = true; cake.add(ganacheTop);
    const glaze = new THREE.Mesh(new THREE.TorusGeometry(R + .02, .18, 16, 64), ganache);
    glaze.rotation.x = Math.PI / 2; glaze.position.y = TOP_Y - .05;
    glaze.castShadow = true; cake.add(glaze);

    /* ---- blueberries ---- */
    function berryMaterial(){
      const m = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0x5a67d6),
        roughness: .55, metalness: 0,
        clearcoat: .35, clearcoatRoughness: .6 });
      m.color.offsetHSL(
        (Math.random() - .5) * .04,
        (Math.random() - .5) * .15,
        (Math.random() - .5) * .08);
      return m;
    }
    function berryGeometry(seed){
      const g = new THREE.SphereGeometry(.48, 32, 32);
      const pos = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++){
        v.fromBufferAttribute(pos, i);
        const bump = Math.sin(v.x * 8.2 + seed) *
                     Math.sin(v.y * 7.1 + seed * 1.7) *
                     Math.sin(v.z * 9.3 + seed * .6);
        v.multiplyScalar(1 + bump * .035);
        pos.setXYZ(i, v.x, v.y * .85, v.z);
      }
      g.computeVertexNormals();
      return g;
    }
    function bigBlueberry(){
      const g = new THREE.Group();
      const b = new THREE.Mesh(berryGeometry(Math.random() * 100), berryMaterial());
      b.castShadow = true; g.add(b);
      const dimple = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 12), calyx);
      dimple.scale.set(1, .5, 1); dimple.position.y = .4; g.add(dimple);
      const spikeGeo = new THREE.ConeGeometry(.022, .09, 5);
      for (let s = 0; s < 5; s++){
        const sp = new THREE.Mesh(spikeGeo, calyx);
        const a = (s / 5) * Math.PI * 2;
        sp.position.set(Math.cos(a) * .07, .415, Math.sin(a) * .07);
        sp.rotation.x = Math.PI * .5; sp.rotation.y = -a;
        g.add(sp);
      }
      g.scale.setScalar(.7);
      return g;
    }
    const N_BERRY = 22, berryRing = 3.0;
    for (let i = 0; i < N_BERRY; i++){
      const a = (i / N_BERRY) * Math.PI * 2;
      const x = Math.cos(a) * berryRing, z = Math.sin(a) * berryRing;
      const bb = bigBlueberry();
      bb.position.set(x, TOP_Y + .12, z);
      bb.rotation.x = (Math.random() - .5) * .4;
      bb.rotation.z = (Math.random() - .5) * .4;
      bb.rotation.y = Math.random() * Math.PI * 2;
      bb.scale.multiplyScalar(.95 + Math.random() * .2);
      cake.add(bb);
    }

    /* ---- rainbow sprinkles ---- */
    const sprinkleColors = [0xff4d4d,0xff9a3d,0xffe14d,0x5ddc55,0x4db8ff,0x9b5dff,0xff6bd6,0xffffff];
    const sprinkleGeo = new THREE.CylinderGeometry(.032, .032, .16, 8);
    const sprinkleLimit = berryRing - .44;
    for (let i = 0; i < 90; i++){
      const r = Math.sqrt(Math.random()) * sprinkleLimit;
      const a = Math.random() * Math.PI * 2;
      const c = new THREE.Color(sprinkleColors[(Math.random() * sprinkleColors.length) | 0]);
      c.offsetHSL(0, (Math.random() - .5) * .1, (Math.random() - .5) * .08);
      const m = new THREE.MeshStandardMaterial({ color: c, roughness: .25, metalness: .05 });
      const sp = new THREE.Mesh(sprinkleGeo, m);
      sp.position.set(Math.cos(a) * r, TOP_Y + .05, Math.sin(a) * r);
      sp.rotation.set(Math.PI / 2 + (Math.random() - .5) * .5,
        Math.random() * 6.28, Math.random() * 6.28);
      sp.scale.setScalar(.85 + Math.random() * .3);
      cake.add(sp);
    }

    /* ---- 23 candles with realistic flames ---- */
    const flameGeo = flameGeometry();
    const flameMat = flameMaterial();
    const glowTex = glowTexture();

    const rows = [{ n: 9, r: .95, h: 1.0 }, { n: 14, r: 1.85, h: 1.25 }];
    const flames = [], bodies = [];
    rows.forEach((row, ri) => {
      for (let i = 0; i < row.n; i++){
        const a = (i / row.n) * Math.PI * 2 + (ri ? Math.PI / 14 : .3);
        const x = Math.cos(a) * row.r, z = Math.sin(a) * row.r;
        const h = row.h + (i % 3) * .07;

        /* striped body */
        const bm = new THREE.MeshStandardMaterial({ color: CREAM, roughness: .6 });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, h, 12), bm);
        body.position.set(x, TOP_Y + h / 2, z);
        cake.add(body); bodies.push(body);

        /* wick */
        const wick = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .1, 6), wickM);
        wick.position.set(x, TOP_Y + h + .05, z); cake.add(wick);

        /* flame = teardrop shader mesh + additive glow halo */
        const fg = new THREE.Group();
        fg.position.set(x, TOP_Y + h + .06, z);
        const core = new THREE.Mesh(flameGeo, flameMat);
        core.scale.setScalar(.8);
        fg.add(core);
        const glowMat = new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xffa04a,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: .4
        });
        const halo = new THREE.Sprite(glowMat);
        halo.scale.set(.38, .8, 1);
        halo.position.y = .18;
        fg.add(halo);
        cake.add(fg);

        const rr = Math.max(.4, Math.hypot(x, z));
        flames.push({ group: fg, core, halo, phase: Math.random() * 6.28,
          dirX: x / rr, dirZ: z / rr });
      }
    });

    scene.add(cake);

    /* ---- React ↔ scene bridge ---- */
    const engine = {
      flames, bodies, glow, blowFlag: false, litTarget: 23,
      setBlowing(b){ this.blowFlag = b; },
      syncCandles(cs){
        let lit = 0;
        cs.forEach((c, i) => {
          if (flames[i]) flames[i].group.visible = !c.out;
          if (bodies[i]){
            const bm = bodies[i].material;
            if (c.c1 && c.c2){
              bm.map = candleTexture(c.c1, c.c2);
              bm.color.set(0xffffff);
              bm.needsUpdate = true;
            } else {
              bm.color.set(CREAM);
            }
          }
          if (!c.out) lit++;
        });
        this.litTarget = lit;
      }
    };
    engineRef.current = engine;

    /* ---- animation: rich multi-frequency flicker ---- */
    const clock = new THREE.Clock();
    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      flames.forEach(f => {
        if (!f.group.visible) return;
        /* three overlapping sine bands = organic flicker, unique per flame */
        const n = Math.sin(t * 9  + f.phase)     * .5
                + Math.sin(t * 23 + f.phase * 2) * .3
                + Math.sin(t * 5.7 + f.phase * 3) * .2;
        f.core.scale.set(.8 + .06 * n, .8 * (1 + .22 * n), .8 + .06 * n);
        f.core.position.x = .015 * n;
        f.core.rotation.z = .06 * Math.sin(t * 7 + f.phase);
        f.halo.material.opacity = .32 + .14 * n;
        f.halo.scale.set(.38 + .04 * n, .55 + .1 * n, 1);
        /* lean outward while blowing */
        const k = engine.blowFlag ? .55 : 0;
        f.group.rotation.x = THREE.MathUtils.lerp(f.group.rotation.x, k * f.dirZ, .2);
        f.group.rotation.z = THREE.MathUtils.lerp(f.group.rotation.z, -k * f.dirX, .2);
      });
      glow.intensity = 1.2 * (engine.litTarget / 23) * (.9 + .1 * Math.sin(t * 9));
      controls.update();
      renderer.render(scene, camera);
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