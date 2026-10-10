/* Round 1218 fixer: mutations that the review found alive (A, B, J, L) and the ones it found held (C, D, E, F),
   written against the fixed head. Usage: node .rc/x/fxmut.mjs <name>. Exits 2 when an anchor is not found. */
import fs from 'node:fs';
const ENGINE = 'src/lib/clubManager.ts', VAR = 'src/lib/clubManagerVar.ts', GEN = 'scripts/genCmVarRates.mjs';
const MUTATIONS = {
  A: [
    { file: GEN, from: 'goalReview: n6(goals.low / engine.reviewableGoalsPerMatch)', to: 'goalReview: n6(goals.high / engine.reviewableGoalsPerMatch)', times: 1 },
    { file: GEN, from: 'missedFoulReview: n6(pens.low / engine.awardsPerMatchPerUnitRate)', to: 'missedFoulReview: n6(pens.high / engine.awardsPerMatchPerUnitRate)', times: 1 },
  ],
  B: [{ file: VAR, from: 'const rng = keyedRng(id);', to: 'const rng = Math.random;', times: 2 }],
  C: [{ file: ENGINE, from: "entry.type === 'cup' ? `cup:${careerLeagueOf(state).cupName}` : 'ucl'", to: "'ucl'", times: 1 }],
  D: [{ file: ENGINE, from: '...(varReviews && worldYear(state) >= 2026', to: '...(varReviews && worldYear(state) > 2026', times: 1 }],
  E: [{ file: GEN, from: "const covered = comps.rows.filter(r => r.verdict === 'yes');", to: "const covered = comps.rows.filter(r => r.verdict !== 'no');", times: 1 }],
  F: [{ file: ENGINE, from: '`league:${careerLeagueOf(state).id}`', to: "'league:premier'", times: 1 }],
  J: [{ file: ENGINE, from: ' && !isHistoricEra(state.eraId ?? DEFAULT_ERA_ID)\n      && cmVarCovers(', to: '\n      && cmVarCovers(', times: 1 }],
  L: [{ file: GEN, from: 'names: covered.map(r => r.name),', to: "names: comps.rows.filter(r => r.verdict !== 'no').map(r => r.name),", times: 1 }],
  /* One publisher's figure read again: the target taken over every reading, the way the first ledger did. */
  M: [{ file: GEN, from: 'const strict = confirmed.map(f => f.strict)', to: 'const strict = all', times: 1 }],
};
const name = process.argv[2];
if (!MUTATIONS[name]) { console.log(`fxmut: unknown mutation ${name}`); process.exit(2); }
for (const m of MUTATIONS[name]) {
  const before = fs.readFileSync(m.file, 'utf8').replaceAll('\r\n', '\n');
  const found = before.split(m.from).length - 1;
  if (found !== m.times) { console.log(`fxmut ${name}: anchor found ${found} time(s) in ${m.file}, wanted ${m.times}`); process.exit(2); }
  fs.writeFileSync(m.file, before.split(m.from).join(m.to));
  console.log(`MUTATED ${name}: ${m.file}, ${found} place(s)`);
}
