import React from 'react';

/* ✨ your permanent message for Yoyo — edit the text inside the quotes */
const YOYO_MESSAGE =
  "大個女啦，唔再係18/22啦。當初識你嘅時候，由比較斯文文靜嘅性格，到後來開始主動打開話題，好想了解我嘅生活點滴，成個人唔同曬。Well, there are so many highs and lows in our life.唔好因爲受到生活挫折氣餒，";

export default function MessageModal({ open, onClose }){
  if (!open) return null;
  return (
    <div onClick={onClose}
      style={{
        position:'fixed', inset:0, backgroundColor:'rgba(12,4,6,.95)', zIndex:9999999,
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'20px', pointerEvents:'auto'
      }}>
      <div onClick={(e)=>e.stopPropagation()}
        style={{
          backgroundColor:'#f8f1e3', padding:'40px', borderRadius:'12px',
          maxWidth:'420px', width:'100%', textAlign:'center',
          boxShadow:'0 30px 80px rgba(0,0,0,.6)', color:'#5a4636'
        }}>
        <h3 style={{fontFamily:'Fraunces, serif', fontStyle:'italic', fontSize:'26px',
          margin:'0 0 20px'}}>A message for you</h3>
        <div style={{backgroundColor:'#fffdf8', border:'1px solid #e8dfd0',
          borderRadius:'8px', padding:'24px', marginBottom:'24px'}}>
          <p style={{fontFamily:'Fraunces, serif', fontStyle:'italic', fontSize:'18px',
            lineHeight:'1.7', margin:0}}>
            "{YOYO_MESSAGE}"
          </p>
        </div>
        <button onClick={onClose}
          style={{
            backgroundColor:'#ff6b4a', color:'#fff1dc', border:'none',
            padding:'14px 24px', borderRadius:'999px', fontSize:'12px',
            fontWeight:'bold', cursor:'pointer', textTransform:'uppercase',
            letterSpacing:'1.5px', width:'100%'
          }}>
          Close
        </button>
      </div>
    </div>
  );
}