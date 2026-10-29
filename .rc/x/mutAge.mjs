// Round 1559 closing fix: a mutation for the NHL default path row of FrontOfficeGmCareer.test.tsx.
// Free agents age two years a summer instead of one, so every save after the first summer moves.
// The row must go red at its summers. Exit 2 when the anchor is not in the file exactly once.
import fs from 'node:fs';

const f = 'src/lib/nhlFrontOffice.ts';
const s = fs.readFileSync(f, 'utf8');
const old = 'for (const fa of league.freeAgents) { fa.age += 1;';
if (s.split(old).length !== 2) {
  console.log('mutAge: the anchor is not in the file exactly once, so the mutation cannot run');
  process.exit(2);
}
fs.writeFileSync(f, s.replace(old, 'for (const fa of league.freeAgents) { fa.age += 2;'));
console.log('mutAge: applied (free agents age two years a summer); the NHL default path must go red at its summers');
