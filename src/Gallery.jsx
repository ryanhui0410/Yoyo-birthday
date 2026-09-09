import React, { useState, useEffect, useCallback, useRef } from 'react';

/* auto-scan src/photos — every image you drop in appears here */
const MODULES = import.meta.glob(
  './photos/*.{jpg,jpeg,png,webp,gif,avif,bmp,svg,heic,heif,JPG,JPEG,PNG,WEBP,GIF,AVIF,BMP,SVG,HEIC,HEIF}',
  { eager: true, query: '?url', import: 'default' }
);

const isHeic = (p) => /\.(heic|heif)$/i.test(p);

const PHOTOS = Object.entries(MODULES).map(([path, url]) => {
  const file = path.split('/').pop();
  const caption = file
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { id: path, url, caption, heic: isHeic(path) };
});

const TILTS = [-3.2, 2.4, -1.6, 3.4, -2.6, 1.2];

export function PhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15.5 16 10l-9 9"/>
    </svg>
  );
}

/* ---- one <img> that transparently decodes HEIC into a JPEG blob ---- */
function PhotoImg({ photo, className, decoding }) {
  const [url, setUrl] = useState(photo.heic ? null : photo.url);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!photo.heic) { setUrl(photo.url); return; }
    let dead = false, objectUrl = null;
    (async () => {
      try {
        const { default: heic2any } = await import('heic2any');
        const res = await fetch(photo.url);
        const blob = await res.blob();
        const out = await heic2any({ blob, toType: 'image/jpeg', quality: 0.92 });
        const jpeg = Array.isArray(out) ? out[0] : out;
        objectUrl = URL.createObjectURL(jpeg);
        if (!dead) setUrl(objectUrl);
      } catch (e) {
        console.warn('HEIC decode failed:', photo.url, e);
        if (!dead) setFailed(true);
      }
    })();
    return () => { dead = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [photo.url, photo.heic]);

  if (failed) {
    return (
      <div className="g-fail" role="img" aria-label="unsupported image">
        <p>couldn't decode this photo</p>
        <p className="g-fail-f">{photo.caption}</p>
      </div>
    );
  }
  if (!url) return <div className="g-load" aria-hidden="true"><span/></div>;
  return (
    <img src={url} alt={photo.caption}
      className={className} loading="lazy" decoding={decoding || 'async'}/>
  );
}

export default function Gallery({ onBack }) {
  const [open, setOpen] = useState(null);
  const touchX = useRef(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d) => {
    setOpen((o) => (o === null ? o : (o + d + PHOTOS.length) % PHOTOS.length));
  }, []);

  /* keyboard navigation in the lightbox */
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

  const swallow = (e) => e.stopPropagation();

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
          {PHOTOS.length} {PHOTOS.length === 1 ? 'frame' : 'frames'}
        </p>
      </header>

      {PHOTOS.length === 0 ? (
        <div className="g-empty">
          <p>No photos yet.</p>
          <p className="g-empty-hint">
            Drop your pictures into <code>src/photos/</code> —
            jpg, png, webp, gif, heic all work. They appear instantly.
          </p>
        </div>
      ) : (
        <div className="g-wall">
          {PHOTOS.map((p, i) => (
            <figure key={p.id} className="g-card"
              style={{
                '--tilt': TILTS[i % TILTS.length] + 'deg',
                '--dly': (i % 7) * 60 + 'ms'
              }}
              onClick={() => setOpen(i)}>
              <PhotoImg photo={p}/>
              {p.caption && <figcaption>{p.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}

      {open !== null && PHOTOS[open] && (
        <div className="g-light" onClick={close} role="dialog" aria-modal="true"
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}>
          <button className="g-nav prev" aria-label="previous photo"
            onClick={(e) => { e.stopPropagation(); step(-1); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <PhotoImg photo={PHOTOS[open]} className="g-hero" decoding="sync"/>
          <button className="g-nav next" aria-label="next photo"
            onClick={(e) => { e.stopPropagation(); step(1); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6"/>
            </svg>
          </button>
          <div className="g-cap">
            <span className="g-cap-t">{PHOTOS[open].caption}</span>
            <span className="g-cap-n">{open + 1} / {PHOTOS.length}</span>
          </div>
          <button className="g-close" aria-label="close" onClick={close}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18"/><path d="M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}