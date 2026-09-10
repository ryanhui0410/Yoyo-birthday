/* ===== GitHub photo storage ===== */
import { GH_TOKEN } from './gh-token.js';

const OWNER = 'ryanhui0410';
const REPO  = 'Yoyo-birthday';
const FOLDER = 'src/photos';
const BRANCH = 'main';
const API = 'https://api.github.com';

async function gh(path, opts = {}){
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${GH_TOKEN}`,
      ...(opts.headers || {})
    }
  });
  if (!res.ok){
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || ('GitHub ' + res.status));
  }
  return await res.json();
}

/* live listing of the photos folder in the repo */
export async function listRemotePhotos(){
  try{
    const url = `/repos/${OWNER}/${REPO}/contents/${FOLDER}?ref=${BRANCH}&t=${Date.now()}`;
    const data = await gh(url);
    if (!Array.isArray(data)) return [];
    return data
      .filter(f => f.type === 'file' && /\.(jpe?g|png|webp|gif|avif|bmp|svg|heic|heif)$/i.test(f.name))
      .map(f => ({ 
        name: f.name, 
        path: f.path, 
        sha: f.sha,
        download_url: f.download_url // ✨ Grab the direct raw download link!
      }));
  } catch(e){ 
    console.error("❌ GitHub Error:", e); 
    return []; 
  }
}

/* download one photo's bytes (handles large files perfectly in Android WebViews) */
export async function fetchPhotoBlob(item){
  // ✨ DIRECT DOWNLOAD: We use the download_url. 
  // IMPORTANT: Do NOT send the Authorization header here! 
  // GitHub already baked a temporary token into the URL for private repos.
  // Sending the header forces a CORS preflight request, which Android WebViews block.
  const url = item.download_url || `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${item.path}`;
  
  const res = await fetch(url); // 🚀 No headers needed!
  
  if (!res.ok) throw new Error('Failed to download image');
  
  let blob = await res.blob();

  // If the downloaded image is larger than 1MB, compress it dynamically for smooth UI display
  if (blob.size > 1024 * 1024) {
    try {
      blob = await compressForDisplay(blob);
    } catch (err) {
      console.warn("⚠️ Compression failed, attempting to display original large image:", err);
    }
  }

  return blob;
}

/* Helper: Compress an image blob until it is under 1.5MB */
async function compressForDisplay(blob) {
  let img;
  try {
    // If the browser can't decode the file format (e.g. corrupted or HEIC), this catches it cleanly
    img = await createImageBitmap(blob);
  } catch (e) {
    console.error("❌ Browser could not decode this image format:", e);
    throw new Error("Image decoding failed");
  }

  let scale = 1;
  let quality = 0.85;
  let currentBlob = blob;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Try up to 5 times to get it under 1.5MB (giving it a little breathing room)
  for (let i = 0; i < 5; i++) {
    if (currentBlob.size <= 1.5 * 1024 * 1024) break;
    
    scale *= 0.85; // Shrink dimensions by 15%
    quality = Math.max(0.5, quality * 0.9); // Lower JPEG quality safely
    
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    currentBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
  }
  
  return currentBlob;
}
/* ✨ upload photo WITHOUT compressing or downscaling! ✨ */
export async function uploadPhoto(file){
  let blob = file;
  
  // 1. Get the original file extension (e.g., 'png', 'jpg', 'jpeg')
  let ext = file.name.split('.').pop().toLowerCase();

  // 2. Only process HEIC files (convert to max quality JPEG so browsers can read them)
  if (/\.hei[cf]$/i.test(file.name) || /image\/hei[cf]/i.test(file.type)){
    const { default: heic2any } = await import('heic2any');
    // quality: 1.0 means maximum quality, no heavy compression
    blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 1.0 }); 
    if (Array.isArray(blob)) blob = blob[0];
    ext = 'jpg'; // HEIC becomes JPG
  }

  // ✨ NO DOWNSCALING OR COMPRESSION HAPPENS HERE! ✨
  // The original blob is sent exactly as it is.

  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000)
    bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  const b64 = btoa(bin);   

  // 3. Use the correct extension so PNGs don't break by being named .jpg
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