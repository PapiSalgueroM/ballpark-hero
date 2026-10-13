// Release AZ fixer, attribution of the digest move (never committed; run on a runner checkout only):
//   node .rc/x/fxmut.mjs noprune     the rollover stores the ledger unpruned (4e87f296's call taken out)
//   node .rc/x/fxmut.mjs noguard     b1424731 reverted (the seeded free agent name guards and the emergency signing)
// Each fails closed unless its edit lands exactly once. Restore with: git checkout -- src scripts
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const NL = String.fromCharCode(10), CRNL = String.fromCharCode(13, 10);
const modes = process.argv.slice(2);
if (!modes.length || modes.some(m => m !== 'noprune' && m !== 'noguard')) { console.log('fxmut: modes are noprune and noguard'); process.exit(2); }
const f = 'src/lib/clubManager.ts';
let s = fs.readFileSync(f, 'utf8').split(CRNL).join(NL);
const swap = (from, to, want) => { const n = s.split(from).length - 1; if (n !== want) { console.log(`fxmut: ${n} of ${want} for ${from.trim().slice(0, 70)}`); process.exit(2); } s = s.split(from).join(to); };
if (modes.includes('noguard')) {
  swap('    ...marketBase(yearsOn(state), state.eraId, worldSeedOf(state)).map(m => m.name),', '    ...marketBase(yearsOn(state), state.eraId).map(m => m.name),', 2);
  swap('  const baseline = projectedXIAvg(clubName, yearsOnNow, eraId, worldSeed)', '  const baseline = projectedXIAvg(clubName, yearsOnNow, eraId)', 1);
  swap('  const invented = marketBase(yearsOnNow, eraId, worldSeed)', '  const invented = marketBase(yearsOnNow, eraId)', 1);
  swap('    for (const [name, club] of emergencyFrom) {', '    for (const [name, club] of new Map<string, string>()) {', 1);
  fs.writeFileSync(f, s);
  console.log('fxmut: b1424731 taken out (unseeded guards and gap fill, no recording)');
}
if (modes.includes('noprune')) {
  const from = '  rosterCareer = pruneWorldRoster(refreshWorldRoster(snapshotWorldRosterClub(rosterCareer, clubName)));' + NL;
  const to = '  rosterCareer = refreshWorldRoster(snapshotWorldRosterClub(rosterCareer, clubName));' + NL;
  const n = s.split(from).length - 1;
  if (n !== 1) { console.log(`fxmut: the prune call is in ${f} ${n} times, it must be once`); process.exit(2); }
  s = s.replace(from, to);
  fs.writeFileSync(f, s);
  console.log('fxmut: the rollover prune taken out');
}
