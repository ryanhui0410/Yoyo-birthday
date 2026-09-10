import React, { useState, useEffect, useCallback, useRef } from 'react';
import { listRemotePhotos, fetchPhotoBlob, uploadPhoto } from './photosService.js';

const TILTS = [-3.2, 2.4, -1.6, 3.4, -2.6, 1.2];

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

/* photo fetched live from GitHub */
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

export default function Gallery({ onBack, initialRemote }) {
  const [open, setOpen] = useState(null);
  const [remote, setRemote] = useState(initialRemote || []);
  const [fresh, setFresh] = useState([]);   
  const [upload, setUpload] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncErr, setSyncErr] = useState('');
  const fileRef = useRef(null);
  const touchX = useRef(null);

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

    // --- 100% GITHUB ONLY LOGIC ---
  const tsOf = n => +((n.match(/^yoyo-(\d+)/) || [0, 0])[1]);
  const remoteSorted = [...remote].sort((a, b) => tsOf(b.name) - tsOf(a.name));

  // ✨ NEW: Get a list of all the instant-preview photo names
  const freshNames = new Set(fresh.map(f => f.name));

  const photos = [
    // 1. Just-uploaded photos (instant preview)
    ...fresh.map(f => ({ kind: 'f', url: f.url, name: f.name, caption: 'a new memory' })),
    
    // 2. ALL Remote (GitHub) photos. 
    ...remoteSorted
      .filter(r => !freshNames.has(r.name)) // ✨ NEW: Filter out photos that are already in 'fresh'
      .map(r => ({
        kind: 'r', 
        item: r,
        caption: r.name.replace(/^yoyo-\d+-\w+/i, '')
          .replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'a new memory'
      }))
  ];

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

  const swallow = (e) => e.stopPropagation();

  const renderImg = (p, hero) => {
    if (p.kind === 'f') return <img src={p.url} alt={p.caption}
      className={hero ? 'g-hero' : undefined} decoding="async"/>;
    // ONLY remote photos are rendered now!
    return <RemotePhoto item={p.item} caption={p.caption} className={hero ? 'g-hero' : undefined}/>;
  };

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
            {renderImg(p, true)}
            <button className="g-nav next" aria-label="next photo"
              onClick={(e) => { e.stopPropagation(); step(1); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6"/></svg>
            </button>
            <div className="g-cap">
              <span className="g-cap-n">{open + 1} / {photos.length}</span>
            </div>
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