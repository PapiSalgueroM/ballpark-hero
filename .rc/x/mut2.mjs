// Release AT review (area cm): attribution. One input taken back in the runner's checkout, then the old material is replayed.
import fs from 'node:fs';
const NL = String.fromCharCode(10);
const M = {
  // The engine never binds the list (what Release AS did for everybody).
  NOBIND: [['src/lib/clubManager.ts', '    state.realLeagueFixtures = REAL_PREMIER_FIXTURE_KEY;', '    void 0;', 1]],
  // The lead's remedy, as small as it can be: the Hot Seat takes the key off before the first week is played.
  HOTSTRIP: [['src/lib/managerHotSeat.ts', '  let s = withSeed(mixSeed(setup.seed, 0), () => startCareer(setup.club));', '  let s = withSeed(mixSeed(setup.seed, 0), () => startCareer(setup.club));' + NL + '  delete s.realLeagueFixtures;', 1]],
};
const name = process.argv[2];
if (!M[name]) { console.error('no such edit ' + name); process.exit(2); }
for (const [file, from, to, count] of M[name]) {
  const src = fs.readFileSync(file, 'utf8');
  const found = src.split(from).length - 1;
  if (found !== count) { console.error(`EDIT ABORTED: ${name} expected ${count} of its anchor in ${file}, found ${found}`); process.exit(2); }
  fs.writeFileSync(file, src.split(from).join(to));
}
console.log('EDITED ' + name);
