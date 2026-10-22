/* Round 1539 review mutations (runner only, never committed). node .rc/x/mutrun.mjs <id>
 * Each replaces one string that must occur exactly once, or exits 2 (ABORTED). Restore with git checkout -- src scripts. */
import fs from 'node:fs';

const M = {
  clock1740: ['src/lib/stadiumTycoon.ts', 'export const AWAY_MATCHDAY_SEC = 1680;', 'export const AWAY_MATCHDAY_SEC = 1740;'],
  clock1620: ['src/lib/stadiumTycoon.ts', 'export const AWAY_MATCHDAY_SEC = 1680;', 'export const AWAY_MATCHDAY_SEC = 1620;'],
  hookround: ['src/hooks/useStadiumTycoon.ts', 'Math.floor(awaySecondsOf(trip, now) / AWAY_MATCHDAY_SEC)', 'Math.round(awaySecondsOf(trip, now) / AWAY_MATCHDAY_SEC)'],
  modal30: ['src/pages/StadiumTycoon.tsx', 'awayMatchMin: AWAY_MATCHDAY_SEC / 60,', 'awayMatchMin: 30,'],
  guidehalf: ['src/data/gameContent/stadiumManagement.ts', 'one for every 28 minutes of the trip', 'one for every half hour of the trip'],
  nofriendly: ['src/lib/stadiumTycoon.ts', 'return Math.min(n, (lg.carryover ? 1 : 0) + beforeFinal);', 'return Math.min(n, beforeFinal);'],
  finalline: ['src/pages/StadiumTycoon.tsx', 'const awayTableLine = !standing ? \'\' : standing.left <= 1', 'const awayTableLine = !standing ? \'\' : standing.left < 1'],
  closejump: ['src/pages/StadiumTycoon.tsx', '<button onClick={g.dismissAway} className="mt-4 w-full', '<button onClick={() => { g.dismissAway(); window.scrollBy(0, 120); }} className="mt-4 w-full'],
};
const id = process.argv[2];
const m = M[id];
if (!m) { console.log(`mutrun ABORTED: no mutation ${id}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`mutrun ABORTED: ${id} expects 1 occurrence of its string in ${file}, found ${n}`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`mutrun: ${id} applied to ${file}`);
