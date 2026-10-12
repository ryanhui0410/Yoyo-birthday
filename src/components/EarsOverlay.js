/* EarsOverlay — draws cat ears over the detected face each frame.
   Coordinates account for the CSS cover-fit + horizontal mirror. */

export default function EarsOverlay(video, canvas, landmarker){
  const ctx = canvas.getContext('2d');
  let raf, dead = false, lastVideoTime = -1;

  function drawEars(cx, baseY, w, tilt){
    const h = w * 0.95;
    ctx.save();
    ctx.translate(cx, baseY);
    ctx.rotate(tilt);

    /* left ear */
    ctx.save();
    ctx.translate(-w * 0.32, 0);
    ctx.rotate(-0.22);
    earPath(w * 0.42, h);
    ctx.restore();

    /* right ear */
    ctx.save();
    ctx.translate(w * 0.32, 0);
    ctx.rotate(0.22);
    earPath(w * 0.42, h);
    ctx.restore();

    ctx.restore();

    function earPath(ew, eh){
      /* outer ear — soft anime triangle */
      ctx.beginPath();
      ctx.moveTo(-ew / 2, eh * 0.18);
      ctx.quadraticCurveTo(-ew * 0.45, -eh * 0.25, 0, -eh * 0.75);
      ctx.quadraticCurveTo(ew * 0.45, -eh * 0.25, ew / 2, eh * 0.18);
      ctx.quadraticCurveTo(0, eh * 0.42, -ew / 2, eh * 0.18);
      ctx.closePath();
      ctx.fillStyle = '#3a2a2e';              // dark outer (anime hair-ish)
      ctx.fill();
      ctx.lineWidth = Math.max(2, ew * 0.06);
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.stroke();

      /* inner ear — pink */
      ctx.beginPath();
      ctx.moveTo(-ew * 0.24, eh * 0.10);
      ctx.quadraticCurveTo(-ew * 0.22, -eh * 0.18, 0, -eh * 0.52);
      ctx.quadraticCurveTo(ew * 0.22, -eh * 0.18, ew * 0.24, eh * 0.10);
      ctx.quadraticCurveTo(0, eh * 0.26, -ew * 0.24, eh * 0.10);
      ctx.closePath();
      ctx.fillStyle = '#f79ab8';
      ctx.fill();
    }
  }

  function loop(){
    if (dead) return;
    raf = requestAnimationFrame(loop);

    if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
    lastVideoTime = video.currentTime;

    const sw = window.innerWidth, sh = window.innerHeight;

    /* keep the overlay backing store at device resolution */
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== sw * dpr){
      canvas.width = sw * dpr; canvas.height = sh * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, sw, sh);

    const res = landmarker.detectForVideo(video, performance.now());
    const lm = res.faceLandmarks && res.faceLandmarks[0];
    if (!lm) return;

    /* cover-fit mapping: video px → screen px */
    const vw = video.videoWidth, vh = video.videoHeight;
    const scale = Math.max(sw / vw, sh / vh);
    const dw = vw * scale, dh = vh * scale;
    const ox = (sw - dw) / 2, oy = (sh - dh) / 2;
    const toScreen = (p) => {
      const x = ox + p.x * dw;
      const y = oy + p.y * dh;
      return { x: sw - x, y };              /* ← horizontal mirror to match display */
    };

    const L = toScreen(lm[234]);            // left temple
    const R = toScreen(lm[454]);            // right temple
    const T = toScreen(lm[10]);             // top of forehead

    const faceW = Math.hypot(R.x - L.x, R.y - L.y);
    const cx = (L.x + R.x) / 2;
    const tilt = Math.atan2(R.y - L.y, R.x - L.x);

    /* ears sit on top of the head: base slightly above the forehead point */
    drawEars(cx, T.y - faceW * 0.06, faceW * 0.95, tilt);
  }
  loop();

  return { stop(){ dead = true; cancelAnimationFrame(raf); } };
}