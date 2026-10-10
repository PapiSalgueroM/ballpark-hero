// Reviewer probe for Round 1214, runner only: can a SHIPPED module actually import the door?
// The round lands src/lib/cmAgeRead.ts for part two's engine to import, and proved it with the type
// gate and an esbuild bundle of the door alone. This plants the first shipped import (in
// src/lib/clubManagerEras.ts, the file part two edits) so the request can run the type gate and the
// real vite build on it. The request line restores the tree. Exit 3: the anchor is not there once.
import fs from 'node:fs';

const file = 'src/lib/clubManagerEras.ts';
const anchor = "import { CM_ROSTER_META } from '@/data/clubManagerRosters';";
const src = fs.readFileSync(file, 'utf8');
const n = src.split(anchor).length - 1;
if (n !== 1) { console.log(`REV BIND REFUSED: the anchor is in ${file} ${n} time(s)`); process.exit(3); }
const planted = [
  anchor,
  "import { ageRead as revAgeRead, levelFrom as revLevelFrom, ERA_RATING_AGE_SHIFT as REV_SHIFT } from '@/lib/cmAgeRead';",
  '/* reviewer probe: a side effect so the bundler has to keep the import */',
  '(globalThis as any).__revAgeProbe = (level: number, age: number, top: number): number[] => [revAgeRead(level, age + REV_SHIFT, top), revLevelFrom(level, age, top)];',
].join('\n');
fs.writeFileSync(file, src.replace(anchor, () => planted));
console.log('REV BIND APPLIED: src/lib/clubManagerEras.ts imports the door');
