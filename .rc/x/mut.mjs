// Release AT review (area cm): one mutation of the VAR rule or the fixture binding, applied in the runner's checkout.
import fs from 'node:fs';
const VAR = 'src/lib/clubManagerVar.ts', ENG = 'src/lib/clubManager.ts', FIX = 'src/lib/clubManagerFixtures.ts';
const M = {
  V1: [[VAR, 'if (!overturned) accepted.push(goal);', 'accepted.push(goal);', 1]],
  V2: [[ENG, 'worldYear(state) >= 2026 && !isHistoricEra(state.eraId ?? DEFAULT_ERA_ID)', 'true', 1]],
  V3: [[VAR, 'missedFoulReview: 0.015', 'missedFoulReview: 0.15', 1]],
  V5: [[VAR, 'const rng = keyedRng(id);', 'const rng = Math.random;', 2]],
  F1: [[FIX, '&& state.season === 1', '&& true', 1], [ENG, '  delete state.realLeagueFixtures;', '  void 0;', 1]],
  F2: [[ENG, '  if (!world && !worldEdit && !custom && canBindRealPremierFixtures', '  if (!worldEdit && !custom && canBindRealPremierFixtures', 1]],
};
const name = process.argv[2];
if (!M[name]) { console.error('no such mutation ' + name); process.exit(2); }
for (const [file, from, to, count] of M[name]) {
  const src = fs.readFileSync(file, 'utf8');
  const found = src.split(from).length - 1;
  if (found !== count) { console.error(`MUTATION ABORTED: ${name} expected ${count} of its anchor in ${file}, found ${found}`); process.exit(2); }
  fs.writeFileSync(file, src.split(from).join(to));
}
console.log('MUTATED ' + name);
