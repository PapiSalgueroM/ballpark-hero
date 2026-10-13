/* Reviewer (run lens), Round 1319: apply ONE plausible mutation of the combine's rule or data path to the
   runner's checkout. The needle must occur exactly once (CRLF folded), or it refuses with exit 2. The request
   line restores the tree with git checkout in the same line. Never committed.
   Usage: node .rc/x/rvmut.mjs <id> */
import fs from 'node:fs';
const MUTS = {
  /* off by one at the top: the cuts walk stops one total short, so a grade only a perfect run reaches has no printed cut */
  mA: ['src/lib/careerPreDraft.ts', 'for (let total = 0; total <= 100 * n; total += 1) {', 'for (let total = 0; total < 100 * n; total += 1) {'],
  /* swapped argument: the reload settles every opened attempt as all out, whatever was opened */
  mB: ['src/lib/careerPreDraft.ts', 'return preDraftShowcase(desc, rest, combine.approach);', "return preDraftShowcase(desc, rest, 'allout');"],
  /* stale constant: the keys burst curve left at the pointer's anchors */
  mC: ['src/lib/careerPreDraft.ts', 'keys: { zeroAt: 22, fullAt: 58 }', 'keys: { zeroAt: 15, fullAt: 50 }'],
  /* data path: pitchers and hitters swapped in MLB */
  mD: ['src/lib/mlbCareerPreDraft.ts', 'stations: pos => (MLB_PITCHERS.includes(pos as MlbCareerPos)', 'stations: pos => (!MLB_PITCHERS.includes(pos as MlbCareerPos)'],
  /* dropped filter: the loader keeps an attempt at any phase whose showcase is empty (season, choice) */
  mE: ['src/lib/careerPreDraft.ts', "&& s.phase === 'showcase' && s.showcase === null) s.combine = { approach: cb.approach };", '&& s.showcase === null) s.combine = { approach: cb.approach };'],
  /* dropped guard: an attempt opens with no stations at all */
  mF: ['src/lib/careerPreDraft.ts', 'if (!preDraftStations(desc, prev).length) return prev;', ''],
};
const id = process.argv[2];
const m = MUTS[id];
if (!m) { console.error(`unknown mutation ${id}`); process.exit(2); }
const [file, needle, repl] = m;
const src = fs.readFileSync(file, 'utf8');
const folded = src.replace(/\r\n/g, '\n');
const count = folded.split(needle).length - 1;
if (count !== 1) { console.error(`MUT ${id}: needle occurs ${count} times in ${file}, refusing`); process.exit(2); }
const out = folded.replace(needle, repl);
if (out === folded) { console.error(`MUT ${id}: changed nothing, refusing`); process.exit(2); }
fs.writeFileSync(file, out);
console.log(`MUT ${id}: applied to ${file}`);
