/* ═══════════════════════════════════════════════
   BIRTHDAY REGISTRY
   Each birthday year folder must export:
     Cake, Lights, Balloons, Badge, MessageModal,
     PEACH_COUNT, STRAWBERRY_COUNT

   To add a new year:
   1. Copy 23th_birthday/ → 24th_birthday/
   2. Modify the components inside
   3. Uncomment the import + entry below
   ═══════════════════════════════════════════════ */

import * as B23 from './23th_birthday/index.js';
// import * as B24 from './24th_birthday/index.js';   // ← uncomment when ready
// import * as B25 from './25th_birthday/index.js';   // ← uncomment when ready

export const BIRTHDAYS = [
  { age: 23, year: 2025, label: '23rd Birthday', ...B23 },
  // { age: 24, year: 2026, label: '24th Birthday', ...B24 },
  // { age: 25, year: 2027, label: '25th Birthday', ...B25 },
];