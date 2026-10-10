// Round 1218 review (run lens): one small mutation by name, applied to the runner's checkout.
// Usage: node .rc/x/r1218mut.mjs <name>. Exits 9 and prints ABORT when an anchor is not found the expected number of times.
import fs from 'node:fs';

const VAR = 'src/lib/clubManagerVar.ts', ENGINE = 'src/lib/clubManager.ts', GEN = 'scripts/genCmVarRates.mjs', FLEET = 'scripts/lib/cmVarFleet.mjs';
const MUTATIONS = {
  // The rate is derived from the HIGHEST reading instead of the lowest (the stricter reading dropped).
  A: [
    { file: GEN, from: 'goals.low / engine.reviewableGoalsPerMatch', to: 'goals.high / engine.reviewableGoalsPerMatch', times: 1 },
    { file: GEN, from: 'pens.low / engine.awardsPerMatchPerUnitRate', to: 'pens.high / engine.awardsPerMatchPerUnitRate', times: 1 },
  ],
  // A review dealt from the match's own random stream instead of its keyed generator (fix-AT section 7 item 3).
  B: [{ file: VAR, from: 'const rng = keyedRng(id);', to: 'const rng = Math.random;', times: 2 }],
  // The cup filter dropped: a domestic cup tie asks under the Champions League key.
  C: [{ file: ENGINE, from: "entry.type === 'cup' ? `cup:${careerLeagueOf(state).cupName}` : 'ucl'", to: "'ucl'", times: 1 }],
  // Off by one on the year: the first modern season gets no reviews.
  D: [{ file: ENGINE, from: '...(varReviews && worldYear(state) >= 2026', to: '...(varReviews && worldYear(state) > 2026', times: 1 }],
  // The generator's coverage filter dropped: a row that is unknown is covered too.
  E: [{ file: GEN, from: "comps.rows.filter(r => r.verdict === 'yes').map(r => [r.key,", to: "comps.rows.filter(r => r.verdict !== 'no').map(r => [r.key,", times: 1 }],
  // The league key is a stale constant: every league match asks as the Premier League.
  F: [{ file: ENGINE, from: '`league:${careerLeagueOf(state).id}`', to: "'league:premier'", times: 1 }],
  // A review penalty is awarded on twice as many fouls (a stale rate inside the helper, not in the generated file).
  G: [{ file: VAR, from: 'CM_VAR_GAME_RATES.missedFoulReview', to: '(CM_VAR_GAME_RATES.missedFoulReview * 2)', times: -1 }],
};

const name = process.argv[2];
const list = MUTATIONS[name];
if (!list) { console.log(`ABORT: unknown mutation ${name}`); process.exit(9); }
for (const m of list) {
  const src = fs.readFileSync(m.file, 'utf8');
  const n = src.split(m.from).length - 1;
  if (n === 0 || (m.times > 0 && n !== m.times)) { console.log(`ABORT: mutation ${name}: anchor found ${n} time(s) in ${m.file}, wanted ${m.times}: ${m.from}`); process.exit(9); }
  const out = src.split(m.from).join(m.to);
  if (out === src) { console.log(`ABORT: mutation ${name} changed nothing in ${m.file}`); process.exit(9); }
  fs.writeFileSync(m.file, out);
  console.log(`MUTATED ${name}: ${m.file}, ${n} place(s): ${m.from}  ->  ${m.to}`);
}
