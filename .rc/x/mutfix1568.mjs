// Round 1568 fixer mutations (never committed, sent as .rc/x/mutfix1568.mjs), run on a throwaway worktree:
//   node .rc/x/mutfix1568.mjs <m2|m2b|mg|m3|mesc> <worktree dir>
// Each asserts its old text is in the file exactly once before it edits, or exits 3 (an ABORT, not a result).
import fs from 'node:fs';
import path from 'node:path';

const MUTS = {
  /* the review's m2: a phone toast rests 12 px higher (48 px from the top), its 15 px hover strip over the bar */
  m2: ['src/pages/SoccerCareer.tsx', '[@media(max-width:600px)]:top-11 ', '[@media(max-width:600px)]:top-8 '],
  /* the review's m2b: the front toast slides back up across the bar on its way out */
  m2b: ['src/pages/SoccerCareer.tsx', ' [@media(max-width:600px)]:data-[removed=true]:data-[front=true]:[--y:translateY(0)]', ''],
  /* this fixer's F1 undone: a leaving phone toast keeps the library's exit ghost */
  mg: ['src/pages/SoccerCareer.tsx', ' [@media(max-width:600px)]:data-[removed=true]:before:hidden', ''],
  /* the review's m3: the timeline's scroll margin cut to 40 px */
  m3: ['src/components/conquest/ConquestTimeline.tsx', 'cq-timeline mt-1 w-full scroll-mt-20', 'cq-timeline mt-1 w-full scroll-mt-10'],
  /* this fixer's F11 undone: the stage takes every Escape again */
  mesc: ['src/components/club-manager/LiveSimScreen.tsx', "if (e.key === 'Escape' && !e.defaultPrevented) onEscape.current();", "if (e.key === 'Escape') onEscape.current();"],
};
const [name, dir] = process.argv.slice(2);
const m = MUTS[name];
if (!m || !dir) { console.log(`mutfix1568: ABORT, usage <${Object.keys(MUTS).join('|')}> <dir>`); process.exit(3); }
const file = path.join(dir, m[0]);
const src = fs.readFileSync(file, 'utf8');
const count = src.split(m[1]).length - 1;
if (count !== 1) { console.log(`mutfix1568: ABORT, ${name} expects its old text once in ${m[0]}, found ${count}`); process.exit(3); }
fs.writeFileSync(file, src.replace(m[1], m[2]));
if (fs.readFileSync(file, 'utf8') === src) { console.log(`mutfix1568: ABORT, ${name} changed nothing`); process.exit(3); }
console.log(`mutfix1568: ${name} applied to ${m[0]} (${JSON.stringify(m[1])} -> ${JSON.stringify(m[2])})`);
