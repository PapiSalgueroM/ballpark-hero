// Round 1568 reviewer mutations. Never committed. Sent as .rc/x/mut1568.mjs and run on a throwaway worktree:
//   node .rc/x/mut1568.mjs <m1|m2|m2b|m3> <worktree dir>
// Each mutation asserts its old text is in the file exactly once before it edits, or exits 3 (an ABORT, not a result).
import fs from 'node:fs';
import path from 'node:path';

const MUTS = {
  /* the stage over the pending cookie notice (60): the brief says never above 60 */
  m1: ['src/components/club-manager/LiveSimMotion.css', 'z-index:55;overflow:hidden', 'z-index:65;overflow:hidden'],
  /* a stale offset: a phone toast rests 12 px higher (48 px from the top), so its 15 px hover strip crosses the bar */
  m2: ['src/pages/SoccerCareer.tsx', '[@media(max-width:600px)]:top-11 ', '[@media(max-width:600px)]:top-8 '],
  /* a dropped state: the front toast slides back up across the bar on its way out again */
  m2b: ['src/pages/SoccerCareer.tsx', ' [@media(max-width:600px)]:data-[removed=true]:data-[front=true]:[--y:translateY(0)]', ''],
  /* a margin cut to 40 px: the input clears the 44 px bar's centre test but its labels row sits under the bar */
  m3: ['src/components/conquest/ConquestTimeline.tsx', 'cq-timeline mt-1 w-full scroll-mt-20', 'cq-timeline mt-1 w-full scroll-mt-10'],
  /* attribution: the calendar sources note without its margin (the links keep theirs) */
  m4: ['src/components/club-manager/CalendarScreen.tsx', 'className="scroll-mt-14 rounded-lg', 'className="rounded-lg'],
  /* attribution: the record tile without its bottom margin (the top one stays) */
  m5: ['src/components/soccer-career/CareerRecordsTile.tsx', 'scroll-mt-14 scroll-mb-24 ', 'scroll-mt-14 '],
};
const [name, dir] = process.argv.slice(2);
const m = MUTS[name];
if (!m || !dir) { console.log(`mut1568: ABORT, usage <${Object.keys(MUTS).join('|')}> <dir>`); process.exit(3); }
const file = path.join(dir, m[0]);
const src = fs.readFileSync(file, 'utf8');
const count = src.split(m[1]).length - 1;
if (count !== 1) { console.log(`mut1568: ABORT, ${name} expects its old text once in ${m[0]}, found ${count}`); process.exit(3); }
fs.writeFileSync(file, src.replace(m[1], m[2]));
const after = fs.readFileSync(file, 'utf8');
if (after === src) { console.log(`mut1568: ABORT, ${name} changed nothing`); process.exit(3); }
console.log(`mut1568: ${name} applied to ${m[0]} (${JSON.stringify(m[1])} -> ${JSON.stringify(m[2])})`);
