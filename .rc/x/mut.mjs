/* Reviewer mutation (round 1321): applies ONE small plausible mutation to a source file on the runner, asserting
   its target is there exactly once. The request line restores the tree with git checkout in the same line. */
import fs from 'node:fs';

const M = {
  /* rivals choose on HIS scout's read instead of the engine's own grade (A5) */
  m1: ['src/lib/nbaEarnedDraft.ts', '    read: (p, club) => (club === ctx.me ? scout(p) : p.grade),', '    read: scout,'],
  /* the curve's band lookup off by one at each band's first slot */
  m2: ['src/lib/nbaFrontOffice.ts', 'NBA_EARNED_CLASS_CURVE.find(b => man >= b.from && man <= b.to)', 'NBA_EARNED_CLASS_CURVE.find(b => man > b.from && man <= b.to)'],
  /* every draftee of his signs the first round scale, a stale constant for the slot's round */
  m3: ['src/lib/nbaEarnedDraft.ts', '        nbaSignDraftee(man, slot.round);', '        nbaSignDraftee(man, 1);'],
  /* the heading's clock line loses its filter: whoever is on the clock, he is told he is */
  m4: ['src/lib/gmEarnedDraft.ts', '  if (next && next.holder === me) lines.push(', '  if (next) lines.push('],
  /* the need weight ten times the size the brief calls small */
  m5: ['src/lib/nbaFrontOffice.ts', 'export const NBA_DRAFT_NEED_WEIGHT = 2;', 'export const NBA_DRAFT_NEED_WEIGHT = 20;'],
  /* the press notes his draftees on the re-sign ledger for his first round only */
  m6: ['src/lib/nbaEarnedDraft.ts', '  for (const round of [...new Set(signedMine.map(s => s.round))]) {', '  for (const round of [...new Set(signedMine.map(s => s.round))].slice(0, 1)) {'],
  /* the class's head: eleven of today's men instead of twelve */
  m7: ['src/lib/nbaFrontOffice.ts', '  const out = nbaDraftClass(rng, 24, taken).slice(0, Math.min(12, size));', '  const out = nbaDraftClass(rng, 24, taken).slice(0, Math.min(11, size));'],
};
const name = process.argv[2];
const m = M[name];
if (!m) { console.log(`MUTATION ${name} UNKNOWN`); process.exit(3); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`MUTATION ${name} CANNOT RUN: ${file} holds its target ${n} times`); process.exit(3); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`MUTATION ${name} APPLIED to ${file}`);
