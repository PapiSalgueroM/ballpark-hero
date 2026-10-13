// Release AZ closing fixer (fix2), never committed; run on a runner checkout only:
//   node .rc/x/fx2mut.mjs     takes out 7942d4d1's one line (the new squad takes rosterCareer's squad after the
//                             emergency records), so the emergency signing carries no key again, as on 1de08c8e.
// Fails closed unless the line is in src/lib/clubManager.ts exactly once. Restore with: git checkout -- src scripts
import fs from 'node:fs';
const NL = String.fromCharCode(10), CRNL = String.fromCharCode(13, 10);
const f = 'src/lib/clubManager.ts';
const s = fs.readFileSync(f, 'utf8').split(CRNL).join(NL);
const line = '    if (emergencyFrom.size) squad = rosterCareer.squad;' + NL;
const n = s.split(line).length - 1;
if (n !== 1) { console.log(`fx2mut: the line is in ${f} ${n} times, it must be once`); process.exit(2); }
fs.writeFileSync(f, s.replace(line, ''));
console.log('fx2mut: 7942d4d1 taken out (the emergency signing carries no key)');
