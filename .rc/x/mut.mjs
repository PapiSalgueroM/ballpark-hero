// Round 1321 fix pass: one mutation of src/lib/nbaEarnedDraft.ts, its target asserted exactly once.
// node .rc/x/mut.mjs <name>   (the request line restores the tree with git checkout after the test)
import fs from 'node:fs';
const FILE = 'src/lib/nbaEarnedDraft.ts';
const MUTS = {
  // knob (i) back to the one season deal of 2c7b0e05 (F1)
  years: ['man.years = NBA_SECOND_ROUND_SEASONS + NBA_DRAFT_NIGHT_SUMMER;', 'man.years = 1;'],
  // knob (ii) from pick 14 instead of 13 (the review's k1, F3)
  k1: ['slot.overall >= late.from', 'slot.overall > late.from'],
  // knob (ii) from pick 12 (the other side of the edge)
  k0: ['slot.overall >= late.from', 'slot.overall >= late.from - 1'],
};
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.log(`no mutation ${name}`); process.exit(3); }
const src = fs.readFileSync(FILE, 'utf8');
const n = src.split(m[0]).length - 1;
if (n !== 1) { console.log(`mutation ${name}: target found ${n} times, not once`); process.exit(3); }
fs.writeFileSync(FILE, src.replace(m[0], m[1]));
console.log(`mutation ${name} applied to ${FILE}`);
