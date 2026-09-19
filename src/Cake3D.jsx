import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CREAM } from './theme.js';

/* striped candy-cane texture per [c1,c2] pair — mirrors the 2D candles */
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

export default function Cake3D({ candles, blowing }){
  const mountRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45, mount.clientWidth / Math.max(1, mount.clientHeight), .1, 1000);
    camera.position.set(0, 9.5, 14.5);

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
    controls.minDistance = 5; controls.maxDistance = 22;
    controls.target.set(0, 1.8, 0);
    controls.autoRotate = true; controls.autoRotateSpeed = 1.2;

    /* ---- lighting (decay:0 restores the r128-template look on modern three) ---- */
    scene.add(new THREE.AmbientLight(0xfff0e6, .9));
    const key = new THREE.DirectionalLight(0xfff5ea, 1.6);
    key.position.set(7, 12, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0003;
    scene.add(key);
    const warm = new THREE.PointLight(0xffaa55, .8, 25, 0);   /* decay 0 */
    warm.position.set(-8, 5, -6); scene.add(warm);
    const cool = new THREE.DirectionalLight(0x7090ff, .5);
    cool.position.set(-5, 8, -8); scene.add(cool);
    const glow = new THREE.PointLight(0xffa050, 1.2, 16, 0);  /* decay 0 */
    glow.position.set(0, 4, 0); scene.add(glow);

    /* ---- materials: exact template colors ---- */
    const ganache = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: .35, metalness: .05 });
    const cream   = new THREE.MeshStandardMaterial({ color: 0xfffae6, roughness: .3 });
    const plateM  = new THREE.MeshStandardMaterial({ color: 0xf5f5f7, roughness: .1, metalness: .05 });
    const calyx   = new THREE.MeshStandardMaterial({ color: 0x1a1d2e, roughness: .9 });
    const wickM   = new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: .8 });
    const flameM  = new THREE.MeshStandardMaterial({
      color: 0xffb347, emissive: 0xff8c1a, emissiveIntensity: 1.8, roughness: .4 });

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

    /* ---- blueberries: the template's material & geometry, untouched ---- */
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

    /* ---- 23 candles inside the berry ring ----
       bodies default to CREAM from theme.js; syncCandles applies each
       candle's [c1,c2] pair as a striped texture (same palette as 2D) */
    const rows = [{ n: 9, r: .95, h: 1.0 }, { n: 14, r: 1.85, h: 1.25 }];
    const flames = [], bodies = [];
    rows.forEach((row, ri) => {
      for (let i = 0; i < row.n; i++){
        const a = (i / row.n) * Math.PI * 2 + (ri ? Math.PI / 14 : .3);
        const x = Math.cos(a) * row.r, z = Math.sin(a) * row.r;
        const h = row.h + (i % 3) * .07;
        const bm = new THREE.MeshStandardMaterial({
          color: CREAM, roughness: .6 });           /* ← CREAM default */
        const body = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, h, 12), bm);
        body.position.set(x, TOP_Y + h / 2, z);
        cake.add(body); bodies.push(body);
        const wick = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .09, 6), wickM);
        wick.position.set(x, TOP_Y + h + .04, z); cake.add(wick);
        const fg = new THREE.Group();
        fg.position.set(x, TOP_Y + h + .1, z);
        const fl = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 10), flameM);
        fl.scale.set(1, 1.7, 1); fg.add(fl); cake.add(fg);
        const rr = Math.max(.4, Math.hypot(x, z));
        flames.push({ group: fg, mesh: fl, phase: Math.random() * 6.28,
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
              bm.color.set(0xffffff);               /* map supplies the color */
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

    const clock = new THREE.Clock();
    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      flames.forEach(f => {
        if (!f.group.visible) return;
        const s = .85 + .25 * Math.sin(t * 10 + f.phase);
        f.mesh.scale.set(1, s * 1.7, 1);
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