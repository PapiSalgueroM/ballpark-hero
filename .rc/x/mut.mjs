/* Review mutation of Round 1521 (runner only, never committed). node .rc/x/mut.mjs <name>
   Each mutation asserts its anchor is in the file exactly once, replaces it, and checks the file changed.
   Exit 3 when the anchor is missing (the mutation did not run). The caller restores with git checkout. */
import fs from 'node:fs';

const SCENE = 'src/components/pitch-motion/scene.ts';
const VIEWER = 'src/components/club-manager/LiveSimScreen.tsx';
const M = {
  /* M1: my mentality's sign swapped where the viewer stages its pitch (attacking drawn as defensive). */
  mapswap: [VIEWER, "build: { me: mentality === 'attacking' ? 1 : mentality === 'defensive' ? -1 : 0, opp: 0 },", "build: { me: mentality === 'attacking' ? -1 : mentality === 'defensive' ? 1 : 0, opp: 0 },"],
  /* M2: the fouled man drawn from the fouler's own line, not the line he faces (the walk's centre back at the far box). */
  facing: [SCENE, 'const facingMen = by ? outfield.filter(f => f.line === facing[by.line]) : [];', 'const facingMen = by ? outfield.filter(f => f.line === by.line) : [];'],
  /* M3: the metres of a unit across and along swapped (the round's own earlier defect). */
  metres: [SCENE, 'const METRES = { x: 0.68, y: 1.05 };', 'const METRES = { x: 1.05, y: 0.68 };'],
  /* M3b: the long ball threshold back at the round's earlier 32 metres (48 per cent of passes in the air). */
  longpass: [SCENE, 'const LONG_PASS = 45;', 'const LONG_PASS = 32;'],
  /* M4: off by one, a back pass of a single line gets no reason. */
  resetoff: [SCENE, 'if (figure && prior && rank(figure.line) < priorRank && at) {', 'if (figure && prior && rank(figure.line) < priorRank - 1 && at) {'],
  /* M5: dropped filter, the feeder may stand further up than the shooter. */
  chain: [SCENE, 'const behind = build && shooter ? mates.filter(f => rank(f.line) <= rank(shooter.line)) : [];', 'const behind = build && shooter ? mates : [];'],
  /* M6: off by one minute, a foul may wait into the next minute. */
  minute: [SCENE, 'const latest = Math.min(p + 1 - BEAT_SPAN, to - BEAT_SPAN);', 'const latest = Math.min(p + 2 - BEAT_SPAN, to - BEAT_SPAN);'],
  /* M7: dropped filter, a card goes to that man's first foul wherever it was. */
  cardplace: [SCENE, 'e.side === card.side && e.text === card.text && placeOf(e) === placeOf(card));', 'e.side === card.side && e.text === card.text);'],
};
const name = process.argv[2];
const m = M[name];
if (!m) { console.log(`mut: unknown mutation ${name}`); process.exit(3); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const count = src.split(from).length - 1;
if (count !== 1) { console.log(`mut ${name}: anchor found ${count} times in ${file}, not run`); process.exit(3); }
const out = src.replace(from, to);
if (out === src) { console.log(`mut ${name}: nothing changed, not run`); process.exit(3); }
fs.writeFileSync(file, out);
console.log(`mut ${name}: applied to ${file}`);
