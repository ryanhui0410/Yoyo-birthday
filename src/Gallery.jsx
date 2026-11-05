import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { registerPlugin } from '@capacitor/core';
import {
  listRemotePhotos, fetchPhotoBlob, fetchPhotoOriginal, uploadPhoto,
  loadRemoteFolders, saveRemoteFolders, mergeFolders
} from './photosService.js';
const SavePhoto = registerPlugin('SavePhoto');
const TILTS = [-3.2, 2.4, -1.6, 3.4, -2.6, 1.2];
const ZMAX = 6;
const FOLDERS_KEY = 'yoyo-gallery-folders';
const DOWNLOADS_KEY = 'yoyo-downloaded-photos';

/* ═══════════════ IMAGE COMPRESSION ═══════════════ */
function compressImage(file, maxDim = 1920, quality = 0.82) {
  return new Promise((resolve) => {
    if (/\.hei[cf]$/i.test(file.name) || /image\/hei[cf]/i.test(file.type)) {
      resolve(file); return;
    }
    if (!file.type.startsWith('image/')) { resolve(file); return; }
    if (file.size < 200 * 1024) { resolve(file); return; }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      cv.toBlob((blob) => {
        if (blob && blob.size < file.size) {
          resolve(new File([blob], file.name, {
            type: 'image/jpeg', lastModified: Date.now()
          }));
        } else {
          resolve(file);
        }
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/* ═══════════════ DOWNLOADED TRACKING ═══════════════ */
function loadDownloaded() {
  try {
    return JSON.parse(localStorage.getItem(DOWNLOADS_KEY)) || [];
  } catch { return []; }
}
function markDownloaded(name) {
  const list = loadDownloaded();
  if (!list.includes(name)) {
    list.push(name);
    localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(list));
  }
}
function isDownloaded(name) {
  return loadDownloaded().includes(name);
}

/* ═══════════════ BLOB CACHE ═══════════════ */
const blobCache = new Map();

async function getCachedBlob(item) {
  const key = item.sha || item.name;
  if (blobCache.has(key)) return blobCache.get(key);
  const promise = fetchPhotoBlob(item).then(blob => {
    const url = URL.createObjectURL(blob);
    blobCache.set(key, url);
    return url;
  });
  blobCache.set(key, promise);
  return promise;
}

/* ═══════════════ FOLDER STORAGE ═══════════════ */
function loadFolders() {
  try {
    return JSON.parse(localStorage.getItem(FOLDERS_KEY)) || [];
  } catch { return []; }
}
function saveFolders(folders) {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

/* ═══════════════ ICONS ═══════════════ */

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

const FolderIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const FolderPlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    <path d="M12 10v6M9 13h6"/>
  </svg>
);

const TrashIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const EditIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true">
    <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
);

const MoveIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
  </svg>
);

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
  </svg>
);

const CloseIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18"/><path d="M6 6l12 12"/>
  </svg>
);

const CheckCircleIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>
  </svg>
);

const WarnIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true">
    <path d="M12 9v4"/><path d="M12 17h.01"/>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
  </svg>
);

/* ═══════════════ THUMBNAIL ═══════════════ */
function ThumbPhoto({ item, caption, className }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const src = item.download_url;
  if (failed) return (
    <div className="g-fail" role="img"><p>couldn't load</p><p className="g-fail-f">{caption}</p></div>
  );
  return (
    <div className="g-photo-wrap" style={{ position:'relative', width:'100%', height:'100%' }}>
      {!loaded && <div className="g-load" aria-hidden="true"><span/></div>}
      <img src={src} alt={caption} className={className}
        loading="lazy" decoding="async" fetchPriority="low"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        style={{
          width:'100%', height:'100%', objectFit:'cover', display:'block',
          opacity: loaded ? 1 : 0, transition:'opacity 0.3s ease'
        }}
      />
    </div>
  );
}

/* ═══════════════ HERO IMAGE ═══════════════ */
function HeroPhoto({ item, caption, className }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const directUrl = item?.download_url;

  if (failed) return (
    <div className="g-fail" role="img"><p>couldn't load</p><p className="g-fail-f">{caption}</p></div>
  );

  if (directUrl) {
    return (
      <div style={{ position:'relative', width:'100%', height:'100%' }}>
        {!loaded && <div className="g-load" aria-hidden="true"><span/></div>}
        <img src={directUrl} alt={caption} className={className}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={{
            width:'100%', height:'100%', objectFit:'contain', display:'block',
            opacity: loaded ? 1 : 0, transition:'opacity 0.2s ease'
          }}
        />
      </div>
    );
  }
  return <HeroPhotoBlob item={item} caption={caption} className={className}/>;
}

function HeroPhotoBlob({ item, caption, className }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let dead = false;
    getCachedBlob(item).then(u => { if (!dead) setUrl(u); }).catch(() => { if (!dead) setFailed(true); });
    return () => { dead = true; };
  }, [item]);
  if (failed) return <div className="g-fail" role="img"><p>couldn't load</p></div>;
  if (!url) return <div className="g-load" aria-hidden="true"><span/></div>;
  return <img src={url} alt={caption} className={className} decoding="async"
    style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }}/>;
}

/* ═══════════════ HELPERS ═══════════════ */
const blobToB64 = blob => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(',')[1]);
  r.onerror = rej;
  r.readAsDataURL(blob);
});

const getPhotoKey = (p) => p.name;

/* ═══════════════════════════════════════════
   GALLERY
   ═══════════════════════════════════════════ */
export default function Gallery({ onBack, initialRemote, inFolderRef }) {

  const [open, setOpen] = useState(null);
  const [remote, setRemote] = useState(initialRemote || []);
  const [fresh, setFresh] = useState([]);
  const [upload, setUpload] = useState(null);
  const [uploadPhase, setUploadPhase] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncErr, setSyncErr] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const fileRef = useRef(null);
  const touchX = useRef(null);

  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }, []);

  const freshUrlsRef = useRef([]);
  useEffect(() => {
    fresh.forEach(f => {
      if (f.url && !freshUrlsRef.current.includes(f.url)) freshUrlsRef.current.push(f.url);
    });
  }, [fresh]);
  useEffect(() => () => {
    freshUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    freshUrlsRef.current = [];
  }, []);

  const [folders, setFolders] = useState(loadFolders);
  const [activeFolder, setActiveFolder] = useState(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const [movingKeys, setMovingKeys] = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(null);

  const liveFolders = useMemo(() => folders.filter(f => !f.deleted), [folders]);

  /* ---------- back gesture support ---------- */
  useEffect(() => {
    if (inFolderRef) inFolderRef.current = !!activeFolder;
  }, [activeFolder, inFolderRef]);

  useEffect(() => {
    const handler = () => {
      if (activeFolder) {
        setActiveFolder(null);
        setOpen(null);
      }
    };
    window.addEventListener('gallery-back', handler);
    return () => window.removeEventListener('gallery-back', handler);
  }, [activeFolder]);

  /* ---------- folder sync ---------- */
  const foldersLoaded = useRef(false);
  const saveTimerRef = useRef(null);
  const latestFoldersRef = useRef(folders);

  useEffect(() => {
    loadRemoteFolders().then(remoteFolders => {
      setFolders(prev => mergeFolders(remoteFolders, prev));
      foldersLoaded.current = true;
    }).catch(() => {
      foldersLoaded.current = true;
    });
  }, []);

  useEffect(() => {
    if (!foldersLoaded.current) return;
    saveFolders(folders);
    latestFoldersRef.current = folders;

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveRemoteFolders(latestFoldersRef.current).catch(err => {
        console.warn('Failed to save folders to GitHub:', err);
      });
    }, 300);

    return () => clearTimeout(saveTimerRef.current);
  }, [folders]);

  /* ---------- lightbox zoom ---------- */
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

  const refresh = useCallback(async (silent) => {
    if (!silent) setSyncing(true);
    try {
      const data = await listRemotePhotos();
      setRemote(data);
      const remoteNames = new Set(data.map(r => r.name));
      setFresh(prev => {
        const kept = prev.filter(f => !remoteNames.has(f.name));
        if (kept.length !== prev.length) {
          prev.forEach(f => {
            if (remoteNames.has(f.name) && f.url) {
              URL.revokeObjectURL(f.url);
              const idx = freshUrlsRef.current.indexOf(f.url);
              if (idx !== -1) freshUrlsRef.current.splice(idx, 1);
            }
          });
        }
        return kept;
      });
      if (!silent) setSyncErr('');
    } catch {
      if (!silent) setSyncErr('sync failed — showing last saved photos');
    }
    if (!silent) setSyncing(false);
  }, []);

  useEffect(() => { refresh(true); }, [refresh]);
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) refresh(true); }, 300000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    z.current = { s: 1, x: 0, y: 0 };
    pts.current.clear(); gest.current = null;
    applyZoom();
  }, [open]);

  /* ---------- derived data ---------- */
  const tsOf = n => +((n.match(/^yoyo-(\d+)/) || [0, 0])[1]);
  const remoteSorted = useMemo(() =>
    [...remote].sort((a, b) => tsOf(b.name) - tsOf(a.name)), [remote]);

  const allPhotos = useMemo(() => {
    const seen = new Set();
    const result = [];
    remoteSorted.forEach(r => {
      if (seen.has(r.name)) return;
      seen.add(r.name);
      result.push({
        kind: 'r', item: r, name: r.name,
        caption: r.name.replace(/^yoyo-\d+-\w+/i, '').replace(/\.[^.]+$/, '')
          .replace(/[-_]+/g, ' ').trim() || 'a new memory'
      });
    });
    fresh.forEach(f => {
      if (seen.has(f.name)) return;
      seen.add(f.name);
      result.push({ kind: 'f', url: f.url, name: f.name, caption: 'a new memory' });
    });
    return result;
  }, [fresh, remoteSorted]);

  const folderPhotoCounts = useMemo(() => {
    const nameSet = new Set(allPhotos.map(p => getPhotoKey(p)));
    const map = {};
    liveFolders.forEach(f => {
      map[f.id] = f.photoKeys.filter(k => nameSet.has(k)).length;
    });
    return map;
  }, [allPhotos, liveFolders]);

  const allFiledKeys = useMemo(() => new Set(liveFolders.flatMap(f => f.photoKeys)), [liveFolders]);
  const unfiledPhotos = useMemo(() =>
    allPhotos.filter(p => !allFiledKeys.has(getPhotoKey(p))), [allPhotos, allFiledKeys]);
  const activeFolderObj = useMemo(() =>
    liveFolders.find(f => f.id === activeFolder), [liveFolders, activeFolder]);
  const folderPhotos = useMemo(() => {
    if (!activeFolderObj) return [];
    const keys = new Set(activeFolderObj.photoKeys);
    return allPhotos.filter(p => keys.has(getPhotoKey(p)));
  }, [allPhotos, activeFolderObj]);
  const displayPhotos = activeFolder ? folderPhotos : unfiledPhotos;

  /* ---------- folder actions ---------- */
  const createFolder = useCallback(() => {
    const name = newFolderName.trim();
    if (!name) return;
    const existing = liveFolders.find(f => f.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setActiveFolder(existing.id);
      setNewFolderName(''); setShowNewFolder(false);
      showToast(`Folder "${existing.name}" already exists`);
      return;
    }
    const id = 'f_' + Date.now();
    setFolders(f => [...f, { id, name, photoKeys: [], created: Date.now() }]);
    setNewFolderName(''); setShowNewFolder(false);
    showToast(`Folder "${name}" created`);
  }, [newFolderName, liveFolders, showToast]);

  const deleteFolder = useCallback((id) => {
    const folder = liveFolders.find(f => f.id === id);
    if (!folder) return;
    if (!window.confirm('Delete this folder? Photos will return to All Photos.')) return;
    setFolders(f => f.map(fol =>
      fol.id === id ? { ...fol, deleted: true, deletedAt: Date.now() } : fol
    ));
    if (activeFolder === id) setActiveFolder(null);
    showToast(`Folder "${folder.name}" deleted`);
  }, [activeFolder, liveFolders, showToast]);

  const startRename = useCallback((folder) => {
    setRenamingId(folder.id);
    setRenameVal(folder.name);
  }, []);

  const confirmRename = useCallback((providedName) => {
    const name = (providedName ?? renameVal).trim();
    if (!name) { setRenamingId(null); setRenameVal(''); return; }
    setFolders(f => f.map(folder =>
      folder.id === renamingId ? { ...folder, name } : folder
    ));
    setRenamingId(null); setRenameVal('');
    showToast(`Renamed to "${name}"`);
  }, [renamingId, renameVal, showToast]);

  const movePhotosToFolder = useCallback((photoKeys, folderId) => {
    const folder = liveFolders.find(f => f.id === folderId);
    const keySet = new Set(photoKeys);
    setFolders(f => f.map(fol => ({
      ...fol,
      photoKeys: fol.photoKeys.filter(k => !keySet.has(k))
    })).map(fol =>
      fol.id === folderId
        ? { ...fol, photoKeys: [...fol.photoKeys, ...photoKeys.filter(k => !fol.photoKeys.includes(k))] }
        : fol
    ));
    const count = photoKeys.length;
    showToast(
      count > 1
        ? `${count} photos moved to "${folder?.name}" ✓`
        : `Photo moved to "${folder?.name}" ✓`
    );
  }, [liveFolders, showToast]);

  const removePhotosFromFolder = useCallback((photoKeys) => {
    const keySet = new Set(photoKeys);
    setFolders(f => f.map(folder => ({
      ...folder,
      photoKeys: folder.photoKeys.filter(k => !keySet.has(k))
    })));
    showToast(photoKeys.length > 1
      ? `${photoKeys.length} photos removed from folder`
      : 'Photo removed from folder');
  }, [showToast]);

  /* ---------- drag & drop ---------- */
  const onPhotoDragStart = useCallback((e, photoKey) => {
    e.dataTransfer.setData('text/plain', photoKey);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const onFolderDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onFolderDrop = useCallback((e, folderId) => {
    e.preventDefault();
    const key = e.dataTransfer.getData('text/plain');
    if (key) movePhotosToFolder([key], folderId);
    setDragOverFolder(null);
  }, [movePhotosToFolder]);

  /* ---------- lightbox ---------- */
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d) => {
    setOpen(o => (o === null ? o : (o + d + displayPhotos.length) % displayPhotos.length));
  }, [displayPhotos.length]);

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

  /* ---------- upload ---------- */
  const onPick = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    setSyncErr('');

    for (let i = 0; i < files.length; i++) {
      setUpload({ done: i, total: files.length });
      setUploadPhase('compressing');
      try {
        const compressed = await compressImage(files[i]);
        setUploadPhase('uploading');
        const { name, blob } = await uploadPhoto(compressed);
        const url = URL.createObjectURL(blob);
        setFresh(f => [{ name, url }, ...f]);
        if (activeFolder) {
          setFolders(f => f.map(folder =>
            folder.id === activeFolder
              ? { ...folder, photoKeys: [...folder.photoKeys, name] }
              : folder
          ));
        }
      } catch (err) {
        setUpload(null);
        setUploadPhase('');
        setSyncErr('upload failed: ' + (err.message || 'check token & connection'));
        return;
      }
    }
    setUpload(null);
    setUploadPhase('');
    await refresh(true);
    showToast('Photos uploaded ✓');
  };

  /* ---------- lightbox zoom ---------- */
  const clampS = s => Math.min(ZMAX, Math.max(1, s));
  const zoomDown = (e) => {
    e.stopPropagation();
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const list = [...pts.current.values()];
    if (list.length === 1)
      gest.current = { mode:'pan', zoom:{...z.current}, x:e.clientX, y:e.clientY, moved:false };
    else if (list.length === 2) {
      const [a,b] = list;
      gest.current = { mode:'pinch', zoom:{...z.current},
        dist:Math.hypot(a.x-b.x, a.y-b.y)||1,
        mid:{x:(a.x+b.x)/2, y:(a.y+b.y)/2}, moved:true };
    }
  };
  const zoomMove = (e) => {
    if (!pts.current.has(e.pointerId)) return;
    e.stopPropagation();
    pts.current.set(e.pointerId, { x:e.clientX, y:e.clientY });
    const g = gest.current; if (!g) return;
    const list = [...pts.current.values()];
    if (g.mode === 'pinch' && list.length >= 2) {
      const [a,b] = list;
      const d = Math.hypot(a.x-b.x, a.y-b.y)||1;
      const mid = { x:(a.x+b.x)/2, y:(a.y+b.y)/2 };
      const s = clampS(g.zoom.s * d / g.dist);
      z.current = { s, x:g.zoom.x+(mid.x-g.mid.x), y:g.zoom.y+(mid.y-g.mid.y) };
      applyZoom();
    } else if (g.mode === 'pan' && list.length === 1 && g.zoom.s > 1) {
      g.moved = true;
      z.current = { s:g.zoom.s, x:g.zoom.x+(e.clientX-g.x), y:g.zoom.y+(e.clientY-g.y) };
      applyZoom();
    }
  };
  const zoomUp = (e) => {
    if (!pts.current.has(e.pointerId)) return;
    e.stopPropagation();
    pts.current.delete(e.pointerId);
    if (pts.current.size === 0) {
      const g = gest.current; gest.current = null;
      if (g && g.mode === 'pan' && !g.moved) {
        const now = Date.now();
        if (now - lastTap.current < 300) {
          z.current = z.current.s > 1 ? {s:1,x:0,y:0} : {s:2.4,x:0,y:0};
          applyZoom(); lastTap.current = 0;
        } else lastTap.current = now;
      }
    } else if (pts.current.size === 1) {
      const [a] = [...pts.current.values()];
      gest.current = { mode:'pan', zoom:{...z.current}, x:a.x, y:a.y, moved:true };
    }
  };
  const zoomWheel = (e) => {
    e.stopPropagation();
    z.current = { ...z.current, s: clampS(z.current.s * (e.deltaY<0 ? 1.15 : .87)) };
    applyZoom();
  };

  /* ---------- grid zoom (pinch/pan on photo grid) ---------- */
  const gridZoomEl = useRef(null);
  const gz = useRef({ s: 1, x: 0, y: 0 });
  const gpts = useRef(new Map());
  const ggest = useRef(null);

  const applyGridZoom = () => {
    const el = gridZoomEl.current; if (!el) return;
    const v = gz.current;
    el.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.s})`;
    el.style.cursor = v.s > 1 ? 'grab' : 'default';
  };

  const clampGZ = s => Math.min(4, Math.max(1, s));

  const gridZoomDown = (e) => {
    gpts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const list = [...gpts.current.values()];
    if (list.length === 1) {
      if (gz.current.s === 1) return;
      e.stopPropagation();
      ggest.current = { mode:'pan', zoom:{...gz.current}, x:e.clientX, y:e.clientY };
    } else if (list.length === 2) {
      e.stopPropagation();
      const [a,b] = list;
      ggest.current = { mode:'pinch', zoom:{...gz.current},
        dist:Math.hypot(a.x-b.x, a.y-b.y)||1,
        mid:{x:(a.x+b.x)/2, y:(a.y+b.y)/2} };
    }
  };
  const gridZoomMove = (e) => {
    if (!gpts.current.has(e.pointerId)) return;
    gpts.current.set(e.pointerId, { x:e.clientX, y:e.clientY });
    const g = ggest.current;
    if (!g) return;
    e.stopPropagation();
    const list = [...gpts.current.values()];
    if (g.mode === 'pinch' && list.length >= 2) {
      const [a,b] = list;
      const d = Math.hypot(a.x-b.x, a.y-b.y)||1;
      const mid = { x:(a.x+b.x)/2, y:(a.y+b.y)/2 };
      const s = clampGZ(g.zoom.s * d / g.dist);
      gz.current = { s, x:g.zoom.x+(mid.x-g.mid.x), y:g.zoom.y+(mid.y-g.mid.y) };
      applyGridZoom();
    } else if (g.mode === 'pan' && list.length === 1 && g.zoom.s > 1) {
      gz.current = { s:g.zoom.s, x:g.zoom.x+(e.clientX-g.x), y:g.zoom.y+(e.clientY-g.y) };
      applyGridZoom();
    }
  };
  const gridZoomUp = (e) => {
    if (!gpts.current.has(e.pointerId)) return;
    e.stopPropagation();
    gpts.current.delete(e.pointerId);
    if (gpts.current.size === 0) ggest.current = null;
    else if (gpts.current.size === 1) {
      const [a] = [...gpts.current.values()];
      ggest.current = { mode:'pan', zoom:{...gz.current}, x:a.x, y:a.y };
    }
  };
  const gridZoomWheel = (e) => {
    if (gz.current.s === 1 && e.deltaY > 0) return;
    e.preventDefault();
    e.stopPropagation();
    gz.current = { ...gz.current, s: clampGZ(gz.current.s * (e.deltaY<0 ? 1.12 : .89)) };
    if (gz.current.s === 1) gz.current = { s:1, x:0, y:0 };
    applyGridZoom();
  };

  /* ---------- download ---------- */
  const downloadPhoto = async () => {
    const p = displayPhotos[open];
    if (!p || downloading) return;
    const fname = p.name || 'yoyo-photo.jpg';

    if (isDownloaded(fname)) {
      const again = window.confirm(
        `"${fname}" has already been downloaded to this phone.\n\nDo you want to download it again?`
      );
      if (!again) return;
    }

    setDownloading(true); setSavedMsg('');
    try {
      const blob = p.kind === 'f'
        ? await (await fetch(p.url)).blob()
        : await fetchPhotoOriginal(p.item);
      const ext = (fname.split('.').pop()||'jpg').toLowerCase();
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';

      if (window.Capacitor?.isNativePlatform?.()) {
        const b64 = await blobToB64(blob);
        await SavePhoto.save({ base64:b64, name:fname, mime });
        markDownloaded(fname);
        setSavedMsg('Saved to gallery ✓');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href=url; a.download=fname;
        document.body.appendChild(a); a.click(); a.remove();
        markDownloaded(fname);
        setSavedMsg('Downloaded ✓');
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err) {
      setSyncErr('download failed: ' + (err.message||''));
    }
    setDownloading(false);
  };

  const swallowRef = useRef(null);
  useEffect(() => {
    const el = swallowRef.current;
    if (!el) return;
    const block = (e) => e.stopPropagation();
    el.addEventListener('pointerdown', block, true);
    return () => el.removeEventListener('pointerdown', block, true);
  }, []);

  const swallow = (e) => e.stopPropagation();

  const renderImg = (p, hero) => {
    if (p.kind === 'f')
      return <img src={p.url} alt={p.caption}
        className={hero?'g-hero':undefined} decoding="async"
        style={{ width:'100%', height:'100%', objectFit: hero?'contain':'cover', display:'block' }}/>;
    return hero
      ? <HeroPhoto item={p.item} caption={p.caption} className="g-hero"/>
      : <ThumbPhoto item={p.item} caption={p.caption}/>;
  };

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <div className="gallery" ref={swallowRef} onPointerDown={swallow}>

      {toastVisible && (
        <div className="g-success-toast">
          <CheckCircleIcon size={22}/>
          <span>{toastMsg}</span>
        </div>
      )}

      <header className="g-head">
        <button className="g-back" onClick={() => {
          if (activeFolder) setActiveFolder(null);
          else onBack();
        }}>
          <BackIcon/>
          {activeFolder ? 'all folders' : 'back to the cake'}
        </button>

        <p className="g-title">
          {activeFolder ? (
            <span className="g-folder-title">
              <FolderIcon size={18}/> {activeFolderObj?.name}
            </span>
          ) : 'A year of Yoyo'}
        </p>

        <p className="g-count">
          {activeFolder
            ? `${displayPhotos.length} ${displayPhotos.length === 1 ? 'frame' : 'frames'}`
            : `${allPhotos.length} ${allPhotos.length === 1 ? 'frame' : 'frames'}`
          }
        </p>

        <div className="g-tools">
          <button className="g-add"
            onClick={() => fileRef.current?.click()} disabled={!!upload}>
            <PlusIcon/> add
          </button>
          <input ref={fileRef} type="file" accept="image/*,.heic,.heif" multiple
            hidden onChange={onPick}/>
          <button className={'g-sync' + (syncing?' spin':'')}
            onClick={() => refresh()} aria-label="refresh" title="refresh from GitHub">
            <SyncIcon/>
          </button>
        </div>

        {upload && (
          <div className="g-upload-progress">
            <div className="g-upload-bar">
              <div className="g-upload-fill"
                style={{ width: `${((upload.done + (uploadPhase === 'uploading' ? 0.5 : 0)) / upload.total * 100)}%` }}/>
            </div>
            <p className="g-status">
              {uploadPhase === 'compressing' ? 'optimizing' : 'uploading'}
              {' '}{upload.done + 1}/{upload.total}…
            </p>
          </div>
        )}
        {syncErr && <p className="g-status err">{syncErr}</p>}
      </header>

      {!activeFolder && (
        <React.Fragment>
          {!showNewFolder ? (
            <div className="g-folder-bar">
              <button className="g-new-folder" onClick={() => setShowNewFolder(true)}>
                <FolderPlusIcon/> New Folder
              </button>
            </div>
          ) : (
            <div className="g-folder-bar">
              <div className="g-new-folder-form">
                <input autoFocus className="g-folder-input" placeholder="folder name…"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key==='Enter') createFolder();
                    if (e.key==='Escape'){ setShowNewFolder(false); setNewFolderName(''); }
                  }}/>
                <button className="g-folder-create" onClick={createFolder}>Create</button>
                <button className="g-folder-cancel"
                  onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}>
                  <CloseIcon size={14}/>
                </button>
              </div>
            </div>
          )}

          {liveFolders.length > 0 && (
            <div className="g-folder-grid">
              {liveFolders.map(folder => (
                <div key={folder.id}
                  className={'g-folder-card' + (dragOverFolder===folder.id?' drag-over':'')}
                  onClick={() => {
                    if (renamingId===folder.id) return;
                    setActiveFolder(folder.id); setOpen(null);
                  }}
                  onDragOver={(e) => { onFolderDragOver(e); setDragOverFolder(folder.id); }}
                  onDragLeave={() => setDragOverFolder(null)}
                  onDrop={(e) => onFolderDrop(e, folder.id)}>
                  <div className="g-folder-icon"><FolderIcon size={32}/></div>
                  <p className="g-folder-name">{folder.name}</p>
                  <p className="g-folder-count">
                    {folderPhotoCounts[folder.id]} {folderPhotoCounts[folder.id]===1?'photo':'photos'}
                  </p>
                  <div className="g-folder-actions" onClick={e=>e.stopPropagation()}>
                    <button className="g-folder-act danger"
                      onClick={() => deleteFolder(folder.id)}
                      aria-label="delete folder" title="delete"><TrashIcon size={13}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {unfiledPhotos.length === 0 && liveFolders.length === 0 ? (
            <div className="g-empty">
              <p>No photos yet.</p>
              <p className="g-empty-hint">Tap <strong>add photos</strong> to upload from this device.</p>
            </div>
          ) : unfiledPhotos.length > 0 && (
            <div className="g-section-label">
              {liveFolders.length > 0 ? 'All Photos' : ''}
            </div>
          )}

          {unfiledPhotos.length > 0 && (
            <div className="g-grid-zoom-wrap"
              onPointerDown={gridZoomDown} onPointerMove={gridZoomMove}
              onPointerUp={gridZoomUp} onPointerCancel={gridZoomUp}
              onWheel={gridZoomWheel}>
              <div ref={gridZoomEl} className="g-grid-zoom">
                <div className="g-folder-view-grid">
                  {unfiledPhotos.map((p, i) => {
                    const key = getPhotoKey(p);
                    return (
                      <figure key={key}
                        className={'g-folder-photo' + (p.kind==='f'?' is-new':'')}
                        style={{ '--dly': (i%7)*40+'ms' }}
                        draggable="true"
                        onDragStart={(e) => onPhotoDragStart(e, key)}
                        onClick={() => {
                          if (gz.current.s > 1) { gz.current = {s:1,x:0,y:0}; applyGridZoom(); return; }
                          setOpen(i);
                        }}>
                        {renderImg(p, false)}
                        <button className="g-move-btn"
                          onClick={(e) => { e.stopPropagation(); setMovingKeys([key]); }}
                          aria-label="move to folder" title="move to folder">
                          <MoveIcon size={14}/>
                        </button>
                      </figure>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </React.Fragment>
      )}

      {activeFolder && (
        <React.Fragment>
          <div className="g-folder-actions-bar">
            <button className="g-folder-bar-btn danger"
              onClick={() => deleteFolder(activeFolder)}>
              <TrashIcon size={14}/> delete folder
            </button>
          </div>

          {folderPhotos.length === 0 ? (
            <div className="g-empty">
              <p>This folder is empty.</p>
              <p className="g-empty-hint">
                Drag photos here from <strong>All Photos</strong>, or tap the
                <strong> → </strong> button on any photo to move it in.
              </p>
            </div>
          ) : (
            <div className="g-grid-zoom-wrap"
              onPointerDown={gridZoomDown} onPointerMove={gridZoomMove}
              onPointerUp={gridZoomUp} onPointerCancel={gridZoomUp}
              onWheel={gridZoomWheel}>
              <div ref={gridZoomEl} className="g-grid-zoom">
                <div className="g-folder-view-grid">
                  {folderPhotos.map((p, i) => {
                    const key = getPhotoKey(p);
                    return (
                      <figure key={key}
                        className="g-folder-photo"
                        onClick={() => {
                          if (gz.current.s > 1) { gz.current = {s:1,x:0,y:0}; applyGridZoom(); return; }
                          setOpen(i);
                        }}>
                        {renderImg(p, false)}
                        <button className="g-remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePhotosFromFolder([key]);
                          }}
                          aria-label="remove from folder" title="remove from folder">
                          <CloseIcon size={12}/>
                        </button>
                      </figure>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </React.Fragment>
      )}

      {open !== null && displayPhotos[open] && (() => {
        const p = displayPhotos[open];
        return (
          <div className="g-light" onClick={close}
            role="dialog" aria-modal="true"
            onTouchStart={(e)=>{ touchX.current=e.touches[0].clientX; }}
            onTouchEnd={(e)=>{
              if(touchX.current===null) return;
              if(z.current.s>1){ touchX.current=null; return; }
              const dx=e.changedTouches[0].clientX-touchX.current;
              if(Math.abs(dx)>40) step(dx<0?1:-1);
              touchX.current=null;
            }}>

            <div className="g-light-topbar">
              <button className="g-action-btn"
                onClick={(e)=>{ e.stopPropagation(); downloadPhoto(); }}
                disabled={downloading} aria-label="save photo" title="save">
                <DownloadIcon/>
              </button>
              <button className="g-action-btn"
                onClick={(e)=>{ e.stopPropagation(); setMovingKeys([getPhotoKey(p)]); }}
                aria-label="move to folder" title="move to folder">
                <MoveIcon size={18}/>
              </button>
              <button className="g-action-btn g-close-btn"
                aria-label="close" onClick={close}>
                <CloseIcon/>
              </button>
            </div>

            <button className="g-nav prev" aria-label="previous photo"
              onClick={(e)=>{ e.stopPropagation(); step(-1); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>

            <div ref={zoomEl} className="g-zoom"
              onPointerDown={zoomDown} onPointerMove={zoomMove}
              onPointerUp={zoomUp} onPointerCancel={zoomUp}
              onWheel={zoomWheel}>
              {renderImg(p, true)}
            </div>

            <button className="g-nav next" aria-label="next photo"
              onClick={(e)=>{ e.stopPropagation(); step(1); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6"/>
              </svg>
            </button>

            <div className="g-cap">
              <span className="g-cap-n">{open+1} / {displayPhotos.length}</span>
            </div>

            {savedMsg && (
              <div className="g-toast" onClick={e=>e.stopPropagation()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
                <span>{savedMsg}</span>
              </div>
            )}
          </div>
        );
      })()}

      {movingKeys && movingKeys.length > 0 && (
        <div className="g-move-overlay" onClick={() => setMovingKeys(null)}>
          <div className="g-move-dialog" onClick={e=>e.stopPropagation()}>
            <h3 className="g-move-title">
              <MoveIcon size={18}/>
              {movingKeys.length > 1
                ? `Move ${movingKeys.length} photos to…`
                : 'Move photo to…'}
            </h3>
            <div className="g-move-list">
              {liveFolders.map(folder => (
                <button key={folder.id} className="g-move-item"
                  onClick={() => {
                    movePhotosToFolder(movingKeys, folder.id);
                    setMovingKeys(null);
                  }}>
                  <FolderIcon size={20}/>
                  <span>{folder.name}</span>
                  <span className="g-move-count">{folderPhotoCounts[folder.id]}</span>
                </button>
              ))}
              <button className="g-move-item g-move-remove"
                onClick={() => {
                  removePhotosFromFolder(movingKeys);
                  setMovingKeys(null);
                }}>
                <CloseIcon size={18}/>
                <span>Remove from folder</span>
              </button>
            </div>
            <button className="g-move-close" onClick={() => setMovingKeys(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}