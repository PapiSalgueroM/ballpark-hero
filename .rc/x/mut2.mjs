// Round 1321 rulings: one mutation of the SYMMETRIC knobs in src/lib/nbaEarnedDraft.ts, by name.
// Usage: node .rc/x/mut2.mjs <name>. Exits 3 when the target is not found exactly once (the mutation cannot run).
import fs from 'node:fs';
const FILE = 'src/lib/nbaEarnedDraft.ts';
const M = {
  /* knob (i) back to rivals only: his second rounder escapes the one season minimum */
  rivalonly: ['      }\n      if (NBA_DRAFT_KNOBS.secondOnMin && slot.round === 2) {', '      } else if (NBA_DRAFT_KNOBS.secondOnMin && slot.round === 2) {'],
  /* knob (ii) back to rivals only: his late picks keep their ceiling */
  rivalonlypot: ['      if (late && slot.overall >= late.from) man.pot', '      if (late && slot.overall >= late.from && club !== ctx.me) man.pot'],
  /* the ceiling cap ignores the pick it starts from */
  latefrom: ['      if (late && slot.overall >= late.from) man.pot', '      if (late) man.pot'],
  /* knob (i) puts first rounders on the minimum too */
  firsttoo: ['NBA_DRAFT_KNOBS.secondOnMin && slot.round === 2', 'NBA_DRAFT_KNOBS.secondOnMin && slot.round >= 1'],
  /* the cap lets a man fall under his own rating */
  underown: ['man.pot = Math.max(man.ovr, Math.min(man.pot, late.cap));', 'man.pot = Math.min(man.pot, late.cap - 1);'],
};
const name = process.argv[2];
const pair = M[name];
if (!pair) { console.log(`no mutation ${name}`); process.exit(3); }
const src = fs.readFileSync(FILE, 'utf8').replaceAll('\r\n', '\n');
const n = src.split(pair[0]).length - 1;
if (n !== 1) { console.log(`MUTATION ${name} target found ${n} times, not once`); process.exit(3); }
fs.writeFileSync(FILE, src.split(pair[0]).join(pair[1]));
console.log(`MUTATION ${name} APPLIED`);
