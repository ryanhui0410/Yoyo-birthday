import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function Cake3D({ candles, blowing }){
  const mountRef = useRef(null);
  const engineRef = useRef(null);

  /* build the scene once */
  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45, mount.clientWidth / Math.max(1, mount.clientHeight), .1, 100);
    camera.position.set(0, 7, 13);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .06;
    controls.maxPolarAngle = Math.PI / 2 + .05;
    controls.minDistance = 6; controls.maxDistance = 20;
    controls.target.set(0, 2, 0);

    /* lighting: dim room + warm key + a shared candle-glow point light */
    const amb = new THREE.AmbientLight(0xffffff, .38);
    const key = new THREE.DirectionalLight(0xfff0dd, 1.05);
    key.position.set(8, 14, 6);
    const glow = new THREE.PointLight(0xffa050, 1.2, 16, 2);
    glow.position.set(0, 4.6, 0);
    scene.add(amb, key, glow);

    /* materials */
    const choc  = new THREE.MeshStandardMaterial({ color: 0x2b1704, roughness: .25, metalness: .08 });
    const cream = new THREE.MeshStandardMaterial({ color: 0xfff5df, roughness: .5 });
    const plateM= new THREE.MeshStandardMaterial({ color: 0xf0ead8, roughness: .3 });
    const cherr = new THREE.MeshStandardMaterial({ color: 0x9b1b1b, roughness: .15, metalness: .1 });
    const wickM = new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: .8 });
    const flameM= new THREE.MeshStandardMaterial({
      color: 0xffb347, emissive: 0xff8c1a, emissiveIntensity: 1.8, roughness: .4 });

    const cake = new THREE.Group();
    /* plate + two chocolate tiers + cream seam + drip torus */
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 4.6, .35, 48), plateM);
    plate.position.y = .18; cake.add(plate);
    const t1 = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 1.8, 48), choc);
    t1.position.y = 1.25; cake.add(t1);
    const seam = new THREE.Mesh(new THREE.CylinderGeometry(4.03, 4.03, .18, 48), cream);
    seam.position.y = 2.22; cake.add(seam);
    const t2 = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 1.3, 48), choc);
    t2.position.y = 2.95; cake.add(t2);
    const drip = new THREE.Mesh(new THREE.TorusGeometry(3.12, .16, 12, 48), choc);
    drip.rotation.x = Math.PI / 2; drip.position.y = 3.62; cake.add(drip);
    /* cream dollops + cherries around the rim */
    for (let i = 0; i < 10; i++){
      const a = i / 10 * Math.PI * 2;
      const x = Math.cos(a) * 2.72, z = Math.sin(a) * 2.72;
      const dol = new THREE.Mesh(new THREE.SphereGeometry(.3, 14, 12), cream);
      dol.scale.y = .7; dol.position.set(x, 3.66, z); cake.add(dol);
      const ch = new THREE.Mesh(new THREE.SphereGeometry(.18, 12, 10), cherr);
      ch.position.set(x, 3.94, z); cake.add(ch);
    }
    scene.add(cake);

    /* 23 candles in two rings — same row split as the 2D cakes (9 + 14) */
    const TOP_Y = 3.68;
    const rows = [{ n: 9, r: 1.45, h: .95 }, { n: 14, r: 2.3, h: 1.2 }];
    const flames = [], bodies = [];
    rows.forEach((row, ri) => {
      for (let i = 0; i < row.n; i++){
        const a = (i / row.n) * Math.PI * 2 + (ri ? Math.PI / 14 : .3);
        const x = Math.cos(a) * row.r, z = Math.sin(a) * row.r;
        const h = row.h + (i % 3) * .07;
        const bodyM = new THREE.MeshStandardMaterial({ color: 0xfff1dc, roughness: .6 });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, h, 10), bodyM);
        body.position.set(x, TOP_Y + h / 2, z); cake.add(body);
        bodies.push(body);
        const wick = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .09, 6), wickM);
        wick.position.set(x, TOP_Y + h + .04, z); cake.add(wick);
        const fg = new THREE.Group();
        fg.position.set(x, TOP_Y + h + .1, z);
        const fl = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 10), flameM);
        fl.scale.set(1, 1.7, 1); fg.add(fl); cake.add(fg);
        const r = Math.max(.4, Math.hypot(x, z));
        flames.push({ group: fg, mesh: fl, phase: Math.random() * 6.28,
          dirX: x / r, dirZ: z / r });
      }
    });

    const engine = { flames, bodies, glow, blowFlag: false, litTarget: 23,
      setBlowing(b){ this.blowFlag = b; },
      syncCandles(cs){
        let lit = 0;
        cs.forEach((c, i) => {
          if (flames[i]) flames[i].group.visible = !c.out;
          if (bodies[i]) bodies[i].material.color.set(c.c1);
          if (!c.out) lit++;
        });
        this.litTarget = lit;
      }
    };

    const clock = new THREE.Clock();
    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      cake.rotation.y += .0025;                 /* idle spin */
      flames.forEach(f => {
        if (!f.group.visible) return;
        const s = .85 + .25 * Math.sin(t * 10 + f.phase);
        f.mesh.scale.set(1, s * 1.7, 1);
        const k = engine.blowFlag ? .55 : 0;    /* lean outward while blowing */
        f.group.rotation.x = THREE.MathUtils.lerp(f.group.rotation.x, k * f.dirZ, .2);
        f.group.rotation.z = THREE.MathUtils.lerp(f.group.rotation.z, -k * f.dirX, .2);
      });
      glow.intensity = engine.litTarget * .07 * (0.9 + .1 * Math.sin(t * 9));
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

    engineRef.current = engine;

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      controls.dispose(); renderer.dispose();
      mount.removeChild(renderer.domElement);
      engineRef.current = null;
    };
  }, []);

  /* react to app state: lit candles, blowing */
  useEffect(() => {
    if (engineRef.current) engineRef.current.syncCandles(candles);
  }, [candles]);
  useEffect(() => {
    if (engineRef.current) engineRef.current.setBlowing(blowing);
  }, [blowing]);

  return <div ref={mountRef} className="cake3d" aria-hidden="true"/>;
}