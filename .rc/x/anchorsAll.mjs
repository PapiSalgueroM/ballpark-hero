// Release BP triage probe (never committed): make simHarnessAnchors print every offence of a bad harness, not only
// the first, on the runner's throwaway checkout. Exit 2 when its anchor is not there exactly once.
import fs from 'node:fs';
const file = 'scripts/simHarnessAnchors.mjs';
const src = fs.readFileSync(file, 'utf8');
const from = '    const o = b.offences[0];';
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`anchorsAll: CANNOT APPLY, anchor ${n} times`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, from + " for (const x of b.offences) console.log(`   offence ${b.f}: raw read line ${x.line} of ${x.rel}, anchor line ${x.anchorLine}`);"));
console.log('anchorsAll: every offence printed');
