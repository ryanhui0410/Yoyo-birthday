import React, { useState, useEffect, useCallback, useRef } from 'react';
import { listRemotePhotos, fetchPhotoBlob, fetchPhotoOriginal, uploadPhoto }
  from './photosService.js';

const TILTS = [-3.2, 2.4, -1.6, 3.4, -2.6, 1.2];
const ZMAX = 6;

export function PhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15.5 16 10l-9 9"/>
    </svg>
  );
}
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
);
const SyncIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>
  </svg>
);

/* photo fetched live from GitHub (display-quality) */
function RemotePhoto({ item, caption, className }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let dead = false, obj = null;
    fetchPhotoBlob(item)
      .then(blob => { obj = URL.createObjectURL(blob); if (!dead) setUrl(obj); })
      .catch(() => { if (!dead) setFailed(true); });
    return () => { dead = true; if (obj) URL.revokeObjectURL(obj); };
  }, [item]);
  if (failed) return (
    <div className="g-fail" role="img"><p>couldn't load this photo</p>
      <p className="g-fail-f">{caption}</p></div>);
  if (!url) return <div className="g-load" aria-hidden="true"><span/></div>;
  return <img src={url} alt={caption} className={className} loading="lazy"/>;
}

const blobToB64 = blob => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(',')[1]);
  r.onerror = rej;
  r.readAsDataURL(blob);
});

export default function Gallery({ onBack, initialRemote }) {
  /* ---------- state ---------- */
  const [open, setOpen] = useState(null);
  const [remote, setRemote] = useState(initialRemote || []);
  const [fresh, setFresh] = useState([]);
  const [upload, setUpload] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncErr, setSyncErr] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const fileRef = useRef(null);
  const touchX = useRef(null);

  /* ---------- zoom: all imperative, zero re-renders ---------- */
  const zoomEl = useRef(null);
  const z = useRef({ s: 1, x: 0, y: 0 });
  const pts = useRef(new Map());
  const gest = useRef(null);
  const lastTap = useRef(0);

  const applyZoom = () => {
    const el = zoomEl.current; if (!el) return;
    const v = z.current;
    el.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.s})`;
    el.classList.toggle('active', v.s > 1);
  };

  /* ---------- data sync ---------- */
  const refresh = useCallback(async (silent) => {
    if (!silent) setSyncing(true);
    try {
      setRemote(await listRemotePhotos());
      if (!silent) setSyncErr('');
    } catch (e) {
      if (!silent) setSyncErr('sync failed — showing last saved photos');
    }
    if (!silent) setSyncing(false);
  }, []);

  useEffect(() => { refresh(true); }, [refresh]);
  useEffect(() => {
    const id = setInterval(() => refresh(true), 30000);
    return () => clearInterval(id);
  }, [refresh]);
  useEffect(() => () => {
    fresh.forEach(f => f.url && URL.revokeObjectURL(f.url));
  }, [fresh]);

  /* reset the zoom whenever the photo changes or the lightbox closes */
  useEffect(() => {
    z.current = { s: 1, x: 0, y: 0 };
    pts.current.clear(); gest.current = null;
    applyZoom();
  }, [open]);

  /* ---------- the wall ---------- */
  const tsOf = n => +((n.match(/^yoyo-(\d+)/) || [0, 0])[1]);
  const remoteSorted = [...remote].sort((a, b) => tsOf(b.name) - tsOf(a.name));
  const freshNames = new Set(fresh.map(f => f.name));

  const photos = [
    ...fresh.map(f => ({ kind: 'f', url: f.url, name: f.name,
      caption: 'a new memory' })),
    ...remoteSorted
      .filter(r => !freshNames.has(r.name))
      .map(r => ({
        kind: 'r', item: r, name: r.name,
        caption: r.name.replace(/^yoyo-\d+-\w+/i, '')
          .replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'a new memory'
      }))
  ];

  /* ---------- lightbox navigation ---------- */
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d) => {
    setOpen(o => (o === null ? o : (o + d + photos.length) % photos.length));
  }, [photos.length]);

  useEffect(() => {
    if (open === null) return;
    const kd = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [open, close, step]);

  /* ---------- uploads ---------- */
  const onPick = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    setSyncErr('');
    for (let i = 0; i < files.length; i++) {
      setUpload({ done: i, total: files.length });
      try {
        const { name, blob } = await uploadPhoto(files[i]);
        const url = URL.createObjectURL(blob);
        setFresh(f => [{ name, url }, ...f]);
      } catch (err) {
        setUpload(null);
        setSyncErr('upload failed: ' + (err.message || 'check token & connection'));
        return;
      }
    }
    setUpload(null);
    await refresh(true);
  };

  /* ---------- zoom & pan gestures (imperative → smooth) ---------- */
  const clampS = s => Math.min(ZMAX, Math.max(1, s));

  const zoomDown = (e) => {
    e.stopPropagation();
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const list = [...pts.current.values()];
    if (list.length === 1)
      gest.current = { mode: 'pan', zoom: { ...z.current },
        x: e.clientX, y: e.clientY, moved: false };
    else if (list.length === 2){
      const [a, b] = list;
      gest.current = { mode: 'pinch', zoom: { ...z.current },
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, moved: true };
    }
  };
  const zoomMove = (e) => {
    if (!pts.current.has(e.pointerId)) return;
    e.stopPropagation();
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gest.current; if (!g) return;
    const list = [...pts.current.values()];
    if (g.mode === 'pinch' && list.length >= 2){
      const [a, b] = list;
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = clampS(g.zoom.s * d / g.dist);
      z.current = { s,
        x: g.zoom.x + (mid.x - g.mid.x), y: g.zoom.y + (mid.y - g.mid.y) };
      applyZoom();
    } else if (g.mode === 'pan' && list.length === 1 && g.zoom.s > 1){
      g.moved = true;
      z.current = { s: g.zoom.s,
        x: g.zoom.x + (e.clientX - g.x), y: g.zoom.y + (e.clientY - g.y) };
      applyZoom();
    }
  };
  const zoomUp = (e) => {
    if (!pts.current.has(e.pointerId)) return;
    e.stopPropagation();
    pts.current.delete(e.pointerId);
    if (pts.current.size === 0){
      const g = gest.current; gest.current = null;
      /* a clean tap (no drag) — double-tap toggles the zoom */
      if (g && g.mode === 'pan' && !g.moved){
        const now = Date.now();
        if (now - lastTap.current < 300){
          z.current = z.current.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.4, x: 0, y: 0 };
          applyZoom();
          lastTap.current = 0;
        } else lastTap.current = now;
      }
    } else if (pts.current.size === 1){
      const [a] = [...pts.current.values()];
      gest.current = { mode: 'pan', zoom: { ...z.current }, x: a.x, y: a.y, moved: true };
    }
  };
  const zoomWheel = (e) => {
    e.stopPropagation();
    z.current = { ...z.current,
      s: clampS(z.current.s * (e.deltaY < 0 ? 1.15 : .87)) };
    applyZoom();
  };

  /* ---------- download / save ---------- */
  const downloadPhoto = async () => {
    const p = photos[open];
    if (!p || downloading) return;
    setDownloading(true);
    setSavedMsg('');
    try {
      const blob = p.kind === 'f'
        ? await (await fetch(p.url)).blob()
        : await fetchPhotoOriginal(p.item);
      const fname = p.name || 'yoyo-photo.jpg';
      const ext = (fname.split('.').pop() || 'jpg').toLowerCase();
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';

      if (window.Capacitor && window.Capacitor.isNativePlatform &&
          window.Capacitor.isNativePlatform()){
        const { SavePhoto } = window.Capacitor.Plugins;
        const b64 = await blobToB64(blob);
        await SavePhoto.save({ base64: b64, name: fname, mime });
        setSavedMsg('Saved to your gallery ✓');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fname;
        document.body.appendChild(a); a.click(); a.remove();
        setSavedMsg('Photo downloaded ✓');
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err) {
      setSyncErr('download failed: ' + (err.message || ''));
    }
    setDownloading(false);
  };

  const swallow = (e) => e.stopPropagation();

  const renderImg = (p, hero) => {
    if (p.kind === 'f') return <img src={p.url} alt={p.caption}
      className={hero ? 'g-hero' : undefined} decoding="async"/>;
    return <RemotePhoto item={p.item} caption={p.caption}
      className={hero ? 'g-hero' : undefined}/>;
  };

  /* ---------- render ---------- */
  return (
    <div className="gallery" onPointerDown={swallow}>
      <header className="g-head">
        <button className="g-back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
          back to the cake
        </button>
        <p className="g-title">A year of Yoyo</p>
        <p className="g-count">
          {photos.length} {photos.length === 1 ? 'frame' : 'frames'}
        </p>

        <div className="g-tools">
          <button className="g-add" onClick={() => fileRef.current && fileRef.current.click()}
            disabled={!!upload}>
            <PlusIcon/> add photos
          </button>
          <input ref={fileRef} type="file" accept="image/*,.heic,.heif" multiple
            hidden onChange={onPick}/>
          <button className={'g-sync' + (syncing ? ' spin' : '')}
            onClick={() => refresh()} aria-label="refresh" title="refresh from GitHub">
            <SyncIcon/>
          </button>
        </div>
        {upload && <p className="g-status">uploading {upload.done}/{upload.total}…</p>}
        {syncErr && <p className="g-status err">{syncErr}</p>}
      </header>

      {photos.length === 0 ? (
        <div className="g-empty">
          <p>No photos yet.</p>
          <p className="g-empty-hint">
            Tap <strong>add photos</strong> to upload from this device.
          </p>
        </div>
      ) : (
        <div className="g-wall">
          {photos.map((p, i) => (
            <figure key={p.kind === 'f' ? p.name : p.item.sha}
              className={'g-card' + (p.kind === 'f' ? ' is-new' : '')}
              style={{ '--tilt': TILTS[i % TILTS.length] + 'deg', '--dly': (i % 7) * 60 + 'ms' }}
              onClick={() => setOpen(i)}>
              {renderImg(p, false)}
            </figure>
          ))}
        </div>
      )}

      {open !== null && photos[open] && (() => {
        const p = photos[open];
        return (
          <div className="g-light" onClick={close} role="dialog" aria-modal="true"
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              if (z.current.s > 1){ touchX.current = null; return; }
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
              touchX.current = null;
            }}>
            <button className="g-nav prev" aria-label="previous photo"
              onClick={(e) => { e.stopPropagation(); step(-1); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6"/></svg>
            </button>

            {/* zoomable / pannable photo — transform driven imperatively */}
            <div ref={zoomEl} className="g-zoom"
              onPointerDown={zoomDown} onPointerMove={zoomMove}
              onPointerUp={zoomUp} onPointerCancel={zoomUp}
              onWheel={zoomWheel}>
              {renderImg(p, true)}
            </div>

            <button className="g-nav next" aria-label="next photo"
              onClick={(e) => { e.stopPropagation(); step(1); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6"/></svg>
            </button>
            <div className="g-cap">
              <span className="g-cap-n">{open + 1} / {photos.length}</span>
            </div>

            <button className="g-dl" onClick={(e) => { e.stopPropagation(); downloadPhoto(); }}
              disabled={downloading} aria-label="save photo"
              title="save this photo">
              <DownloadIcon/>
            </button>

            {savedMsg && (
              <div className="g-toast" onClick={(e) => e.stopPropagation()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
                <span>{savedMsg}</span>
              </div>
            )}

            <button className="g-close" aria-label="close" onClick={close}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
            </button>
          </div>
        );
      })()}
    </div>
  );
}