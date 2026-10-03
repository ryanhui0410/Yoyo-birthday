import { CREAM } from './theme.js';

export function makeCandles(count = 23){
  const R=(a,b)=>a+Math.random()*(b-a);
  const P=[['#ff6b4a',CREAM],['#ffd678',CREAM],['#ff7fa3',CREAM],['#7fe3c4',CREAM],
    ['#ffa046',CREAM],[CREAM,'#ff6b4a'],[CREAM,'#ff7fa3'],[CREAM,'#7fe3c4'],
    [CREAM,'#ffa046'],[CREAM,'#ffd678']];

  /* ---- adaptive row layout ----
     count ≥ 16  → two rows, inner/outer ratio ≈ 9:14 (the original 2D cake)
     count <  16 → single row centred on the cake top
     Positioning only matters for the 2D CakeArt; 3D cakes ignore it. */
  let rows;
  if (count >= 16){
    const inner = Math.round(count * 9 / 23);         // 9 for 23, 12 for 30 …
    rows=[
      {n:inner,      x0:42, x1:58, depth:1.6, s:.74, z:1},
      {n:count-inner, x0:33, x1:67, depth:7.2, s:1,   z:2}
    ];
  } else {
    rows=[
      {n:count, x0:36, x1:64, depth:4.4, s:.88, z:1}
    ];
  }

  const out=[]; let ig=0;
  rows.forEach((row,ri)=>{
    for(let i=0;i<row.n;i++){
      const t = row.n > 1 ? i/(row.n-1) : 0.5;         // 0‥1 across the row
      ig += 34 + Math.random()*60;
      const [c1,c2] = P[(Math.random()*P.length)|0];
      const left = row.x0 + t*(row.x1-row.x0) + R(-1.1,1.1);
      const vx   = left*3.2;
      const dxn  = (vx-160)/62;
      const surf = 55 - 8*Math.sqrt(Math.max(0,1-dxn*dxn));
      const y    = surf + row.depth + R(-.6,.6);
      const bottom = ((210-y)/330*100) - .35;
      out.push({
        id: ri+'-'+i,
        left, bottom,
        h: R(8.5,13), s: row.s*R(.95,1.05), z: row.z,
        th: R(.08,.95),          /* blow-out threshold, works for any count */
        c1, c2,
        dur: R(.17,.3), del: -Math.random(), rot: R(-4,4),
        ig: Math.round(ig),
        out: false
      });
    }
  });
  return out;
}