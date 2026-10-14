// Round 1332 closing check (never committed). The review's mutant choicetargets, ported to the fixed engine's
// lines: gmCardSafe forgets the men an option moves at the deal (only the subject when it is a role is kept).
// The answer time recheck is left as it is, exactly as the review's mutant left the rest of the engine.
//   node .rc/x/mutvfy.mjs choicetargets
import fs from 'node:fs';

const ENGINE = 'src/lib/gmInbox.ts';
const MUTS = {
  choicetargets: [ENGINE, '  people.push(...tagRoles(e, e.choices));',
    "  if (typeof e.subject === 'string') people.push({ role: e.subject }); /* mutant: choicetargets, ported */"],
};
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.error(`no mutation ${name}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`mutation ${name}: its anchor is in ${file} ${n} times, not once, refusing`); process.exit(2); }
const out = src.replace(from, to);
if (out === src) { console.error(`mutation ${name} changed nothing, refusing`); process.exit(2); }
fs.writeFileSync(file, out);
console.log(`mutation ${name} applied to ${file}`);
