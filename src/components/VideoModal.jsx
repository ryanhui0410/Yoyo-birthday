import React, { useRef, useEffect, useState } from 'react';
import videoUrl from '../assets/Video_1031_Ryan_Yoyo.mp4';
const FONT = '"Fraunces","Noto Serif TC","Noto Serif SC","PingFang SC","Microsoft YaHei",serif';

export default function VideoModal({ open, onClose }) {
  const videoRef = useRef(null);
  const [orientation, setOrientation] = useState('landscape'); // 'landscape' | 'portrait'

  /* play / pause with modal */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (open) {
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [open]);

  /* detect video orientation on metadata load */
  const handleMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setOrientation(v.videoHeight > v.videoWidth ? 'portrait' : 'landscape');
  };

  if (!open) return null;

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0,
      background:'rgba(8,4,2,.96)',
      zIndex:9999999,
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'20px', pointerEvents:'auto',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%',
        maxWidth: orientation === 'portrait' ? '380px' : '720px',
        display:'flex', flexDirection:'column', gap:'14px',
      }}>

        {/* title */}
        <h3 style={{
          fontFamily:FONT, fontStyle:'italic', fontSize:'22px',
          margin:0, color:'#f8e8d0', textAlign:'center',
          textShadow:'0 2px 12px rgba(0,0,0,.3)',
        }}>A little memory 🎬</h3>

        {/* video frame */}
        <div style={{
          position:'relative',
          borderRadius:'14px', overflow:'hidden',
          background:'#1a1008',
          boxShadow:'0 24px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(255,200,160,.08)',
          /* aspect ratio adapts to orientation */
          aspectRatio: orientation === 'portrait' ? '9/16' : '16/9',
          maxHeight:'65vh',
          width:'100%',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {/* decorative warm glow behind video */}
          <div style={{
            position:'absolute', inset:0,
            background:'radial-gradient(ellipse at 50% 50%, rgba(255,160,80,.06) 0%, transparent 70%)',
            pointerEvents:'none',
          }}/>

          <video
            ref={videoRef}
            src={videoUrl} 
            onLoadedMetadata={handleMetadata}
            controls
            playsInline
            preload="metadata"
            style={{
              width:'100%', height:'100%',
              objectFit:'contain',          // letterbox instead of crop
              borderRadius:'14px',
              display:'block',
            }}
          />
        </div>

        {/* caption */}
        <p style={{
          fontFamily:FONT, fontStyle:'italic', fontSize:'13px',
          color:'rgba(255,200,180,.35)', textAlign:'center', margin:0,
          letterSpacing:'.5px',
        }}>
          {orientation === 'portrait' ? '📱 tap fullscreen for the best view' : ''}
        </p>

        {/* close */}
        <button onClick={onClose} style={{
          background:'#ff6b4a', color:'#fff1dc', border:'none',
          padding:'14px 24px', borderRadius:'999px', fontSize:'12px',
          fontWeight:'bold', cursor:'pointer', textTransform:'uppercase',
          letterSpacing:'1.5px', width:'100%', transition:'transform .15s',
        }}>Close</button>
      </div>
    </div>
  );
}