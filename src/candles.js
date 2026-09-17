import { CREAM } from './theme.js';

/* 23 candles: two rows projected onto the curved top surface
   (ellipse cx=160 cy=55 rx=62 ry=8 in the 320×210 viewBox) */
export function makeCandles(){
  const R=(a,b)=>a+Math.random()*(b-a);
  const P=[['#ff6b4a',CREAM],['#ffd678',CREAM],['#ff7fa3',CREAM],['#7fe3c4',CREAM],
    ['#ffa046',CREAM],[CREAM,'#ff6b4a'],[CREAM,'#ff7fa3'],[CREAM,'#7fe3c4'],
    [CREAM,'#ffa046'],[CREAM,'#ffd678']];
  const rows=[
    {n:9,  x0:42, x1:58, depth:1.6, s:.74, z:1},
    {n:14, x0:33, x1:67, depth:7.2, s:1,   z:2}
  ];
  const out=[]; let ig=0;
  rows.forEach((row,ri)=>{
    for(let i=0;i<row.n;i++){
      const t=i/(row.n-1); ig+=34+Math.random()*60;
      const [c1,c2]=P[(Math.random()*P.length)|0];
      const left = row.x0+t*(row.x1-row.x0)+R(-1.1,1.1);
      const vx = left*3.2;
      const dxn = (vx-160)/62;
      const surf = 55 - 8*Math.sqrt(Math.max(0,1-dxn*dxn));
      const y = surf + row.depth + R(-.6,.6);
      const bottom = ((210-y)/330*100) - .35;
      out.push({
        id:ri+'-'+i, left, bottom,
        h: R(8.5,13), s: row.s*R(.95,1.05), z: row.z,
        th: R(.08,.95), c1, c2,
        dur: R(.17,.3), del: -Math.random(), rot: R(-4,4),
        ig: Math.round(ig), out:false
      });
    }
  });
  return out;
}