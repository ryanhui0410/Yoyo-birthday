import React from 'react';

/* ✨ your permanent message for Yoyo — each string is one paragraph */
const YOYO_MESSAGE = [
  "大個女啦，唔再喺18/22啦。當初識你嘅時候，由比較斯文文靜嘅性格，到後來開始主動打開話題，好想了解大家嘅生活點滴，成個人唔同曬。",

  "Well, there are so many highs and lows in our life. 呢段期間可能經歷過唔開心的事，唔好因爲受到生活挫折氣餒。",

  "呢個app我由8月尾開始做，做到10月頭，前後大概20多個小時，每次構思要加啲咩新嘢，都要構思好耐，不過都係值得的，只要見到您開心，回味甜蜜時光，咁就夠啦。",

  "拍拖兩個字，我覺得我地已經稱得上'拍'字，咁另一個字'拖'呢？幾時開始啊？我地日後仲有大把事等住我地去做啊。",

  "雖然我唔知我喺你心中10分攞幾分，但我會盡量成全每個人希望，將細節做好去。",

  "最後俾你幾句祝福：快啲揾到工，身體健康，工作順利，心想事成！"
];

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
          backgroundColor:'#f8f1e3', padding:'32px 28px', borderRadius:'12px',
          maxWidth:'420px', width:'100%', color:'#5a4636',
          maxHeight:'86vh',
          display:'flex', flexDirection:'column',
          boxShadow:'0 30px 80px rgba(0,0,0,.6)'
        }}>
        <h3 style={{fontFamily:'Fraunces, serif', fontStyle:'italic', fontSize:'26px',
          margin:'0 0 16px', flex:'none'}}>A message for you</h3>

        {/* scrolls when the message is longer than the screen */}
        <div style={{backgroundColor:'#fffdf8', border:'1px solid #e8dfd0',
          borderRadius:'8px', padding:'20px', marginBottom:'20px',
          overflowY:'auto', flex:'1', WebkitOverflowScrolling:'touch'}}>
          {YOYO_MESSAGE.map((para, i) => (
            <p key={i}
              style={{fontFamily:'Fraunces, serif', fontStyle:'italic', fontSize:'17px',
                lineHeight:'1.8',
                margin: i === 0 ? 0 : '14px 0 0',   /* space between paragraphs */
                textAlign:'left'}}>
              {i === YOYO_MESSAGE.length - 1 ? para : para + '…'}
            </p>
          ))}
        </div>

        <button onClick={onClose}
          style={{
            backgroundColor:'#ff6b4a', color:'#fff1dc', border:'none',
            padding:'14px 24px', borderRadius:'999px', fontSize:'12px',
            fontWeight:'bold', cursor:'pointer', textTransform:'uppercase',
            letterSpacing:'1.5px', width:'100%', flex:'none'
          }}>
          Close
        </button>
      </div>
    </div>
  );
}