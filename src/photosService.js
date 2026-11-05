/* ===== GitHub photo storage ===== */
import { GH_TOKEN } from './gh-token.js';

const OWNER = 'ryanhui0410';
const REPO  = 'Yoyo-birthday';
const FOLDER = 'src/photos';
const BRANCH = 'main';
const API = 'https://api.github.com';
const FOLDER_CONFIG = 'src/photos/.folders.json';

async function gh(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${GH_TOKEN}`,
      ...(opts.headers || {})
    }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || ('GitHub ' + res.status));
  }
  return await res.json();
}

/* decode the base64 payload returned by the Contents API */
function decodeContent(b64) {
  const raw = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/* ═══════════════ FOLDER MERGE ═══════════════ */
/*
 * Union of remote + local folder lists, by folder id.
 * - local wins field-by-field (so renames / photo moves on THIS device apply)
 * - folders deleted on ANY device (tombstone: deleted:true) stay deleted
 * - the same folder name created on two different devices is combined
 *   (photo lists merged, oldest creation date kept)
 * → no matter who saves last, nobody's folder ever gets wiped out.
 */
export function mergeFolders(remote = [], local = []) {
  const byId = new Map();

  for (const f of remote) {
    if (!f || (!f.id && !f.name)) continue;
    byId.set(f.id || ('name:' + f.name), { ...f });
  }
  for (const f of local) {
    if (!f || (!f.id && !f.name)) continue;
    const key = f.id || ('name:' + f.name);
    byId.set(key, { ...(byId.get(key) || {}), ...f });
  }

  /* tombstones win: a folder deleted on any device stays deleted */
  const list = [...byId.values()].filter(f => !f.deleted);

  /* combine same-name folders created independently on different devices */
  const byName = new Map();
  const out = [];
  for (const f of list) {
    const k = (f.name || '').toLowerCase();
    const hit = byName.get(k);
    if (!hit) {
      byName.set(k, f);
      out.push(f);
    } else {
      hit.photoKeys = [...new Set([...(hit.photoKeys || []), ...(f.photoKeys || [])])];
      if (f.created && (!hit.created || f.created < hit.created)) hit.created = f.created;
    }
  }
  return out;
}

/* ═══════════════ FOLDER SYNC ═══════════════ */
export async function loadRemoteFolders() {
  try {
    const data = await gh(`/repos/${OWNER}/${REPO}/contents/${FOLDER_CONFIG}?ref=${BRANCH}&t=${Date.now()}`);
    if (!data.content) return [];
    return JSON.parse(decodeContent(data.content));
  } catch {
    return [];
  }
}

export async function saveRemoteFolders(localFolders) {
  /* 1. read the freshest remote state RIGHT BEFORE writing
        (this is what prevents user A from wiping user B's new folder) */
  let sha = null;
  let remote = [];
  let remoteRaw = null;
  try {
    const existing = await gh(`/repos/${OWNER}/${REPO}/contents/${FOLDER_CONFIG}?ref=${BRANCH}&t=${Date.now()}`);
    sha = existing.sha;
    if (existing.content) {
      remoteRaw = decodeContent(existing.content);
      remote = JSON.parse(remoteRaw);
      if (!Array.isArray(remote)) remote = [];
    }
  } catch { /* file doesn't exist yet — first ever save */ }

  /* 2. union with local — nothing anyone created gets lost */
  const merged = mergeFolders(remote, localFolders);
  const json = JSON.stringify(merged, null, 2);

  /* 3. skip the commit entirely when nothing actually changed
        (stops useless commits every time the app opens) */
  if (remoteRaw !== null && json === remoteRaw) return merged;

  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const content = btoa(bin);

  await gh(`/repos/${OWNER}/${REPO}/contents/${FOLDER_CONFIG}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'update folder config',
      branch: BRANCH,
      content,
      ...(sha ? { sha } : {})
    })
  });
  return merged;
}

/* ═══════════════ PHOTO LISTING ═══════════════ */
export async function listRemotePhotos() {
  try {
    const url = `/repos/${OWNER}/${REPO}/contents/${FOLDER}?ref=${BRANCH}&t=${Date.now()}`;
    const data = await gh(url);
    if (!Array.isArray(data)) return [];
    return data
      .filter(f => f.type === 'file' && /\.(jpe?g|png|webp|gif|avif|bmp|svg|heic|heif)$/i.test(f.name))
      .map(f => ({
        name: f.name,
        path: f.path,
        sha: f.sha,
        download_url: f.download_url
      }));
  } catch (e) {
    console.error("GitHub Error:", e);
    return [];
  }
}

/* ═══════════════ PHOTO DOWNLOAD ═══════════════ */
export async function fetchPhotoBlob(item) {
  const url = item.download_url || `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${item.path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to download image');

  let blob = await res.blob();

  if (blob.size > 1024 * 1024) {
    try {
      blob = await compressForDisplay(blob);
    } catch (err) {
      console.warn("Compression failed, using original:", err);
    }
  }

  return blob;
}

export async function fetchPhotoOriginal(item) {
  const url = item.download_url || `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${item.path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to download image');
  return await res.blob();
}

/* ═══════════════ DISPLAY COMPRESSION ═══════════════ */
async function compressForDisplay(blob) {
  let img;
  try {
    img = await createImageBitmap(blob);
  } catch (e) {
    console.error("Browser could not decode image:", e);
    throw new Error("Image decoding failed");
  }

  let scale = 1;
  let quality = 0.85;
  let currentBlob = blob;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  for (let i = 0; i < 5; i++) {
    if (currentBlob.size <= 1.5 * 1024 * 1024) break;

    scale *= 0.85;
    quality = Math.max(0.5, quality * 0.9);

    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    currentBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
  }

  return currentBlob;
}

/* ═══════════════ PHOTO UPLOAD ═══════════════ */
export async function uploadPhoto(file) {
  let blob = file;
  let ext = file.name.split('.').pop().toLowerCase();

  if (/\.hei[cf]$/i.test(file.name) || /image\/hei[cf]/i.test(file.type)) {
    const { default: heic2any } = await import('heic2any');
    blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 1.0 });
    if (Array.isArray(blob)) blob = blob[0];
    ext = 'jpg';
  }

  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000)
    bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  const b64 = btoa(bin);

  const name = `yoyo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

  await gh(`/repos/${OWNER}/${REPO}/contents/${FOLDER}/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `add photo: ${file.name || name}`,
      branch: BRANCH,
      content: b64
    })
  });
  return { name, blob };
}