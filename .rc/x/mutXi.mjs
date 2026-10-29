// Reviewer xi400: one source mutation for PR 400's same side rule, applied on the RUNNER checkout only.
// Usage: node .rc/x/mutXi.mjs <name>. Asserts the string it replaces exists exactly once, or exits 3.
import fs from 'node:fs';

const XI = 'src/lib/xiFit.ts';
const PF = 'src/lib/positionFit.ts';
const LWB = "    if (s.role === 'LWB' && s.man.position === 'LB') return 'natural';\n";
const RWB = "    if (s.role === 'RWB' && s.man.position === 'RB') return 'natural';\n";
const MUTS = {
  // the fix taken out, one side at a time
  nolwb: { file: XI, from: LWB, to: '' },
  norwb: { file: XI, from: RWB, to: '' },
  // both lines taken out (the base rule)
  nofix: { file: XI, from: LWB + RWB, to: '' },
  // over widened: any full back at any wing back, the wrong side included
  anyside: { file: XI, from: LWB + RWB, to: "    if ((s.role === 'LWB' || s.role === 'RWB') && (s.man.position === 'LB' || s.man.position === 'RB')) return 'natural';\n" },
  // widened to verified history instead of the primary (a keeper with LB history would reach LWB)
  history: { file: XI, from: LWB, to: "    if (s.role === 'LWB' && (held ?? []).includes('LB')) return 'natural';\n" },
  // the other way to write the fix: LB put into the LWB slot's own list (widens the pick gate)
  slotlist: { file: PF, from: "  LWB: ['LW', 'LM', 'LWB'],\n", to: "  LWB: ['LW', 'LM', 'LWB', 'LB'],\n" },
  // a wing back at the same side full back slot made natural too (it already is: must change nothing measurable)
  wbtofb: { file: XI, from: LWB, to: LWB + "    if (s.role === 'LB' && s.man.position === 'LWB') return 'natural';\n" },
};
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.log(`MUT unknown ${name}`); process.exit(3); }
const src = fs.readFileSync(m.file, 'utf8').replace(/\r\n/g, '\n');
const hits = src.split(m.from).length - 1;
if (hits !== 1) { console.log(`MUT ${name} CANNOT APPLY: ${hits} hits in ${m.file}`); process.exit(3); }
const out = src.replace(m.from, m.to);
if (out === src) { console.log(`MUT ${name} changed nothing`); process.exit(3); }
fs.writeFileSync(m.file, out);
console.log(`MUT ${name} applied to ${m.file}`);
