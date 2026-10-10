/* Reviewer (run lens), Round 1215: one small mutation of a tracked file ON THE RUNNER, never committed.
   usage: node .rc/x/rmut.mjs <mode>
   Each mutation asserts its anchor is in the file exactly once before it edits, and that the file changed. */
import fs from 'node:fs';

const W = 'scripts/playLiveMatchFit.mjs';
const L = 'scripts/lib/pageSeed.mjs';
const MAIN = 'src/main.tsx';
const MUT = {
  /* the seed is never installed on any context */
  noseedcall: [W, '  if (seed !== null) await seedPages(context, seed);', '  /* mutation: the seed is never installed */'],
  /* the generator ignores the seed it is given */
  flatstream: [L, '    let a = start >>> 0;', '    let a = 1;'],
  /* every arm and every context runs on one seed */
  flatseedat: [W, 'const seedAt = n => (SEED + n) >>> 0;', 'const seedAt = n => (SEED + n * 0) >>> 0;'],
  /* the digest reads the opponent only (the thin digest the critic ruled out) */
  thindigest: [W, '  const text = JSON.stringify(plain(drawn));', '  const text = JSON.stringify(plain({ opponent: drawn.opponent }));'],
  /* every watched goal dumps its save, red or not (a way to get dumps of all three contexts) */
  alwaysdump: [W, '    if (failures > before) dumpSave();', '    dumpSave();'],
};
const mode = process.argv[2] || '';
if (mode.startsWith('timer')) {
  /* the PAGE draws on a timer: timer400, timer6000 ... (the product is mutated on the runner only) */
  const ms = Number(mode.slice(5));
  if (!Number.isInteger(ms) || ms < 50) { console.error('timer wants milliseconds'); process.exit(2); }
  const before = fs.readFileSync(MAIN, 'utf8');
  if (before.includes('__reviewTimer')) { console.error('already mutated'); process.exit(2); }
  fs.writeFileSync(MAIN, before + `\n(window as unknown as { __reviewTimer: number }).__reviewTimer = window.setInterval(() => { Math.random(); }, ${ms});\n`);
  console.log(`MUTATED ${MAIN}: the page now draws once every ${ms} ms`);
  process.exit(0);
}
const spec = MUT[mode];
if (!spec) { console.error(`unknown mutation ${mode}`); process.exit(2); }
const [file, from, to] = spec;
const text = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
const hits = text.split(from).length - 1;
if (hits !== 1) { console.error(`MUTATION ABORTED: the anchor of ${mode} is in ${file} ${hits} times, not once`); process.exit(2); }
const next = text.split(from).join(to);
if (next === text) { console.error('MUTATION ABORTED: nothing changed'); process.exit(2); }
fs.writeFileSync(file, next);
console.log(`MUTATED ${file} (${mode}): "${from.trim()}" became "${to.trim()}"`);
