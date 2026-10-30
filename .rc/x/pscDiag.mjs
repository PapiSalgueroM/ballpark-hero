/* Fixer diagnostic for Round 1604 (runner only, sent as .rc/x/pscDiag.mjs).
   Writes scripts/pscDiag.mjs, a copy of playSoccerCareer.mjs that prints every
   step of the walk (phase, age, the button pressed, the first options seen),
   so the reason a seeded career plays 240 steps with no campaign can be read. */
import fs from 'node:fs';
const src = fs.readFileSync('scripts/playSoccerCareer.mjs', 'utf8').replaceAll('\r\n', '\n');
const anchor = "    trail.push(r);\n    if (r.phase === 'transfer_window')";
if (!src.includes(anchor)) { console.log('diag anchor not found'); process.exit(2); }
const line = "    console.log(`  step ${steps} ${r.phase} age ${r.age} -> ${r.action} | ${(r.options || []).slice(0, 8).join(' / ')}`);\n";
fs.writeFileSync('scripts/pscDiag.mjs', src.replace(anchor, "    trail.push(r);\n" + line + "    if (r.phase === 'transfer_window')"));
console.log('scripts/pscDiag.mjs written');
