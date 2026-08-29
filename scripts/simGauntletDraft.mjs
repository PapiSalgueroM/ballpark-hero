/* Gauntlet Draft (Round 328): every pick is a real choice, every draft is
 * finishable, and the cup rewards the draft.
 *
 * WHAT IT HOLDS, on the same fallback pool the game plays offline:
 *   1. THE DEAL LAW, over 250 seeded drafts: eleven picks, five distinct
 *      fitting players each, no player dealt twice in a draft, and every
 *      pick offers a genuine choice (the best and worst card at least 6
 *      rating points apart, floor measured well under the observed spread);
 *   2. DETERMINISM: one seed one draft, and one finished XI one cup run,
 *      byte identical on the replay; a year of daily seeds deals a year of
 *      genuinely different drafts;
 *   3. THE CUP REWARDS THE DRAFT, measured not hoped: over 300 drafts, the
 *      always-best-card XI clears more rounds on average than the
 *      always-worst-card XI by a wide measured margin, and the best-card
 *      XI lifts the trophy a real share of the time while the worst-card
 *      XI almost never does;
 *   4. SCORING: a full run is exactly 100, an instant exit exactly 0, and
 *      the score never decreases with another round survived.
 *
 * NEGATIVE CONTROL: SIM_GAUNTLET_CONTROL=flatdeal collapses the band spread
 * in a bundled copy (every card drawn from one band) and section 1's
 * genuine-choice floor must go red.
 *
 * Run: node scripts/simGauntletDraft.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.SIM_GAUNTLET_CONTROL || '';
if (CONTROL && CONTROL !== 'flatdeal') { console.error(`SIM_GAUNTLET_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

const TMP = os.tmpdir().replace(/\\/g, '/');
const ENTRY = `${TMP}/gauntletDraft.entry.mjs`;
const BUNDLE = `${TMP}/gauntletDraft.bundle.mjs`;

let libPath = `${ROOT}/src/lib/gauntletDraft.ts`;
if (CONTROL === 'flatdeal') {
  const src = fs.readFileSync(libPath, 'utf8');
  const needle = 'for (const [lo, hi] of [[0, 0.12], [0.15, 0.4], [0.3, 0.6], [0.5, 0.8], [0.8, 1]] as const) {';
  if (!src.includes(needle)) { console.error('control run: the band spread to collapse is not in the source, refusing to run a dead control'); process.exit(1); }
  libPath = `${TMP}/gauntletDraft.control.ts`;
  fs.writeFileSync(libPath, src.replace(needle, 'for (const [lo, hi] of [[0.4, 0.6], [0.4, 0.6], [0.4, 0.6], [0.4, 0.6], [0.4, 0.6]] as const) {'));
  console.log('NEGATIVE CONTROL ON: the band spread collapsed in a bundled copy, the genuine-choice floor must now go red');
}
fs.writeFileSync(ENTRY, `
export * as gd from '${libPath}';
export { players as POOL } from '${ROOT}/src/data/players.ts';
export { playerRating } from '${ROOT}/src/lib/squadDeal.ts';
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --alias:@=${ROOT}/src`, { stdio: 'inherit' });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { gd, POOL, playerRating } = await import(pathToFileURL(BUNDLE).href);
const { GAUNTLET_ROUNDS, buildDraft, dailyDraftSeed, runGauntlet } = gd;

const draftWith = (draft, chooser) => draft.picks.map(pick => chooser(pick.choices));
const best = choices => [...choices].sort((a, b) => playerRating(b) - playerRating(a))[0];
const worst = choices => [...choices].sort((a, b) => playerRating(a) - playerRating(b))[0];

console.log('1) the deal law, 250 seeded drafts');
{
  let flat = 0;
  let spreadSum = 0;
  const DRAFTS = 250;
  for (let s = 1; s <= DRAFTS; s += 1) {
    const d = buildDraft(POOL, s * 9973);
    if (d.picks.length !== d.formation.slots.length) fail(`seed ${s}: ${d.picks.length} picks for ${d.formation.slots.length} slots`);
    const names = new Set();
    for (const pick of d.picks) {
      if (pick.choices.length !== 5) { fail(`seed ${s}: a pick dealt ${pick.choices.length} cards`); continue; }
      for (const c of pick.choices) {
        if (names.has(c.name)) fail(`seed ${s}: ${c.name} dealt twice in one draft`);
        names.add(c.name);
      }
      const rs = pick.choices.map(playerRating);
      const spread = Math.max(...rs) - Math.min(...rs);
      spreadSum += spread;
      if (spread < 6) flat += 1;
    }
  }
  const meanSpread = spreadSum / (DRAFTS * 11);
  if (CONTROL === 'flatdeal') {
    if (flat > DRAFTS) { console.log(`simGauntletDraft control: green. Collapsed, ${flat} picks offered no real choice (mean spread ${meanSpread.toFixed(1)}).`); process.exit(0); }
    console.error(`simGauntletDraft control: RED. Only ${flat} flat picks with the bands collapsed.`);
    process.exit(1);
  }
  /* Measured over repeated runs: mean spread 14.5 to 15 rating points and
     zero of 2,750 picks under the 6 point floor, which sits at well under
     half the measured mean, so a collapsed deal fails while healthy
     variance cannot. */
  if (flat > 0) fail(`${flat} of ${DRAFTS * 11} picks offered no genuine choice (spread under 6)`);
  console.log(`   ${DRAFTS} drafts: five distinct fitting cards per pick, nobody dealt twice, mean star-to-bargain spread ${meanSpread.toFixed(1)} rating points`);
}

console.log('2) determinism, and a year of different dailies');
{
  const a = buildDraft(POOL, 31337);
  const b = buildDraft(POOL, 31337);
  const fp = d => d.formation.name + '|' + d.picks.map(p => p.choices.map(c => c.name).join(',')).join(';');
  if (fp(a) !== fp(b)) fail('the same seed dealt two different drafts');
  const squad = draftWith(a, best);
  if (JSON.stringify(runGauntlet(squad)) !== JSON.stringify(runGauntlet(squad))) fail('the same XI ran two different gauntlets');
  const prints = new Set();
  const d0 = new Date(Date.UTC(2026, 0, 1));
  for (let i = 0; i < 365; i += 1) {
    const d = new Date(d0.getTime() + i * 86400000);
    const str = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    prints.add(fp(buildDraft(POOL, dailyDraftSeed(str))));
  }
  if (prints.size < 360) fail(`a year of daily seeds dealt only ${prints.size} distinct drafts`);
  console.log(`   drafted twice byte identical, ran twice byte identical, 365 dailies gave ${prints.size} distinct drafts`);
}

console.log('3) the cup rewards the draft, measured');
{
  let bestRounds = 0; let worstRounds = 0; let bestTrophies = 0; let worstTrophies = 0;
  const DRAFTS = 300;
  for (let s = 1; s <= DRAFTS; s += 1) {
    const d = buildDraft(POOL, s * 104729 + 7);
    const runBest = runGauntlet(draftWith(d, best));
    const runWorst = runGauntlet(draftWith(d, worst));
    bestRounds += runBest.roundsCleared;
    worstRounds += runWorst.roundsCleared;
    if (runBest.champion) bestTrophies += 1;
    if (runWorst.champion) worstTrophies += 1;
  }
  const meanBest = bestRounds / DRAFTS;
  const meanWorst = worstRounds / DRAFTS;
  /* Measured over repeated 300 draft runs AFTER the ladder retune (the
     first ladder gave a perfect draft a 3 percent trophy rate, pure luck):
     best-card XIs clear about 3.4 rounds and lift the trophy around 12
     percent of the time; worst-card XIs clear about 0.7 and never won in
     any run. Floors: a 1.5 round gap (well under the measured 2.6) and
     best trophies at 7 percent, both far above a broken settle and far
     below healthy runs. */
  if (meanBest - meanWorst < 1.5) fail(`best-card XIs clear only ${(meanBest - meanWorst).toFixed(2)} more rounds than worst-card XIs`);
  if (bestTrophies / DRAFTS < 0.07) fail(`best-card XIs lifted only ${bestTrophies} trophies in ${DRAFTS} runs`);
  if (worstTrophies > DRAFTS * 0.05) fail(`worst-card XIs lifted ${worstTrophies} trophies, the gauntlet is not a test`);
  console.log(`   best-card XIs ${meanBest.toFixed(2)} rounds and ${bestTrophies} trophies; worst-card XIs ${meanWorst.toFixed(2)} and ${worstTrophies}, over ${DRAFTS} drafts`);
}

console.log('4) scoring identities');
{
  const d = buildDraft(POOL, 777);
  const full = runGauntlet(draftWith(d, best));
  if (full.champion && full.score !== 100) fail(`a champion scored ${full.score}, not 100`);
  if (!full.champion && full.score !== full.roundsCleared * 16) fail(`an exit at ${full.roundsCleared} scored ${full.score}`);
  if (GAUNTLET_ROUNDS.length * 16 + 20 !== 100) fail('the scoring arithmetic no longer lands a champion on exactly 100');
  console.log('   16 a round, 20 for the trophy, a champion is exactly 100');
}

console.log('');
if (failures > 0) { console.error(`simGauntletDraft: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simGauntletDraft: green. Every pick is a choice, and the cup is won in the draft.');
