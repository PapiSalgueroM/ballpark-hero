/* Round 1210, second fix pass. AN EXPERIMENT, never committed and not proposed as the fix: sent to a runner as
   .rc/x/lazyFlag.mjs to MEASURE the one alternative to moving the /footle row, so the lead decides on a number.
   It rewrites src/pages/Footle.tsx in the runner's checkout so the flags file is asked for only when a flag is
   first drawn (a late import, each of the three prints waiting on it with the bare name shown meanwhile).
   It refuses unless the import line is there once and exactly three prints match. Exit 0 when written. */
import fs from 'node:fs';

const file = 'src/pages/Footle.tsx';
const src = fs.readFileSync(file, 'utf-8');
const IMPORT = "import { FlagImg } from '@/components/FlagImg';";
if (src.split(IMPORT).length !== 2) { console.error('lazyFlag: the FlagImg import line is not there exactly once; nothing written'); process.exit(2); }
const PRINT = new RegExp('<FlagImg name=\\{([^}]+)\\} size=\\{12\\} showLabel />', 'g');
const hits = [...src.matchAll(PRINT)];
if (hits.length !== 3) { console.error(`lazyFlag: expected three flag prints, found ${hits.length}; nothing written`); process.exit(2); }
const late = [
  "import { lazy as lazyFx, Suspense as SuspenseFx } from 'react';",
  "const FlagImgLate = lazyFx(() => import('@/components/FlagImg').then(m => ({ default: m.FlagImg })));",
].join('\n');
const next = src
  .replace(IMPORT, late)
  .replace(PRINT, (_all, name) => `<SuspenseFx fallback={${name}}><FlagImgLate name={${name}} size={12} showLabel /></SuspenseFx>`);
if (next.includes('<FlagImg ')) { console.error('lazyFlag: a FlagImg print was left behind; nothing written'); process.exit(2); }
fs.writeFileSync(file, next);
console.log(`lazyFlag: ${file} rewritten, 3 prints wait on a late import`);
