/* Round 929: every Soccer Career season knows where the club finished.

   Before this round a playing season recorded only leagueTitle, a coin drawn
   by tier, so a player finished a season and never learned where his club
   ended up. And the elite title boost read one era blind list, so Man City
   and PSG won the league in about two seasons of three in a 1990s career
   while the era tier rules rated Man City tier 4 until 2008.

   This runs the real engine, bundled the way simCareerCleanSheets does it,
   over seeded careers, and measures:

   1. finish is 1 exactly when leagueTitle is true, every season, and a title
      season always carries a finish;
   2. a finish is never above the league size, never below 1, and a season
      in a league with a verified size always carries both fields;
   3. the tier ordering of mean finish holds over pooled seeds (elite, then
      tier 1, 2, 3, 4), each step of the ladder, not only its two ends;
   4. the current era digest: seeded careers starting in 2020 produce a state
      byte identical to the one recorded from main before this round, once the
      two new fields are taken out, so the main Math.random stream did not move;
   5. the elite boost is era aware: a season played at Man City in 1995 wins
      the title at its tier's rate, at Man City in 2020 at the elite rate, and
      Real Madrid in 1995 at the elite rate (forced seasons over many seeds).

   Negative controls (each asserts its anchor exists exactly once first):
   SIM_LEAGUE_FINISH_CONTROL=notitle   the title rule leaves the module: a
     title season is drawn a finish like any other. Section 1 must go red.
   SIM_LEAGUE_FINISH_CONTROL=eliteblind the engine reads the era blind list
     again. Section 5 must go red.
   Exit 1 when a control did its job, 2 when it proved nothing or its name is
   not one this harness knows.

   Record mode: node scripts/simCareerLeagueFinish.mjs --record prints the
   per career digests of the CURRENT tree (run on main, before the round).

   Run: node scripts/simCareerLeagueFinish.mjs [careersPerTier] */
import { build } from 'esbuild';
import crypto from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_LEAGUE_FINISH_CONTROL || '';
const CONTROLS = { notitle: [1], eliteblind: [5], stream: [4] };
if (CONTROL && !CONTROLS[CONTROL]) { console.error('unknown control ' + CONTROL + ' (known: ' + Object.keys(CONTROLS).join(', ') + ')'); process.exit(2); }
const RECORD = process.argv.includes('--record');
const TMP = process.env.TEMP || process.env.TMP || os.tmpdir();
const WORK = path.join(TMP, `sc-leaguefinish-${process.pid}`);
fs.mkdirSync(WORK, { recursive: true });
const OUT = path.join(WORK, 'bundle.mjs');
const ENTRY = path.join(WORK, 'entry.mjs');
const lib = `${ROOT}/src/lib/`.replaceAll('\\', '/');

/* A control edits a COPY. The copies live outside src/lib, so their relative
   imports are pointed back at the real files, except the engine's import of
   the league module when the league module is the copy being mutated. */
function mutate(file, anchor, replacement) {
  const src = fs.readFileSync(`${ROOT}/src/lib/${file}`, 'utf8');
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.error(`control ${CONTROL}: the anchor appears ${n} times in ${file}, refusing to run a dead control`); process.exit(2); }
  return src.replace(anchor, replacement);
}
const relocate = (src, keep = '') => src.replace(/from (['"])\.\/([A-Za-z0-9_]+)\1/g, (m, q, name) => name === keep ? m : `from ${q}${lib}${name}${q}`);
let enginePath = `${ROOT}/src/lib/soccerCareerEngine.ts`;
if (CONTROL === 'notitle') {
  const league = mutate('soccerCareerLeague.ts', 'if (input.leagueTitle) return { leagueFinish: 1', 'if (false) return { leagueFinish: 1');
  fs.writeFileSync(path.join(WORK, 'soccerCareerLeague.ts'), relocate(league));
  enginePath = path.join(WORK, 'soccerCareerEngine.ts');
  fs.writeFileSync(enginePath, relocate(fs.readFileSync(`${ROOT}/src/lib/soccerCareerEngine.ts`, 'utf8'), 'soccerCareerLeague'));
} else if (CONTROL === 'stream') {
  const league = mutate('soccerCareerLeague.ts', 'const rng = forkRng(input.seedKey);', 'const rng = forkRng(input.seedKey); Math.random();');
  fs.writeFileSync(path.join(WORK, 'soccerCareerLeague.ts'), relocate(league));
  enginePath = path.join(WORK, 'soccerCareerEngine.ts');
  fs.writeFileSync(enginePath, relocate(fs.readFileSync(`${ROOT}/src/lib/soccerCareerEngine.ts`, 'utf8'), 'soccerCareerLeague'));
} else if (CONTROL === 'eliteblind') {
  const engine = mutate('soccerCareerEngine.ts', 'const isElite = eliteInYear(ELITE_CLUBS, state.currentClub, seasonYear);', 'const isElite = ELITE_CLUBS.includes(state.currentClub);');
  enginePath = path.join(WORK, 'soccerCareerEngine.ts');
  fs.writeFileSync(enginePath, relocate(engine));
}

/* Same two stage entry with a localStorage stub as simCareerEngaged: the
   engine's import chain reaches the Supabase client module, which reads
   localStorage as it loads. Nothing here fetches anything. */
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${enginePath.replaceAll('\\', '/')}');
export const engine = mod;
export const league = await import('${lib}soccerCareerLeague.ts');
export const eras = await import('${lib}careerEras.ts');
`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error', alias: { '@': './src' }, absWorkingDir: ROOT });
const { engine, league, eras } = await import(pathToFileURL(OUT).href);
try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* temp only */ }
const NEED = ['initCareer', 'advanceYouthYear', 'acceptOffer', 'advanceProSeason', 'dismissSummary', 'dismissNewspaper', 'dismissDebut', 'dismissWorldCup', 'dismissRivalryEvent', 'dismissBallonDor', 'applyEventChoice', 'dismissMoralDilemma', 'dismissSocialMediaPhase', 'dismissAppealResult', 'applyBdorSpeech', 'applyWorldCupSpeech', 'acceptRetirementSuggestion', 'stayAtClub', 'applyRehabChoice', 'FALLBACK_CLUBS'];
for (const k of NEED) if (!engine[k]) { console.error('engine export missing: ' + k + ', so nothing below measures anything'); process.exit(1); }
const clubs = engine.FALLBACK_CLUBS;

/* Deterministic: a seeded generator stands in for Math.random for the length
   of each career, so every red here reproduces. */
function seeded(seed) { let x = (seed * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const stats = v => ({ pace: v, shooting: v, passing: v, dribbling: v, defending: v, physical: v, reflexes: v });
const POSITIONS = ['ST', 'CM', 'CB', 'GK', 'LW', 'CAM', 'RB', 'CDM'];

/* simCareerCleanSheets' full phase switch: every pause the engine can raise
   between seasons is answered, an unknown one is nudged once. */
function step(s) {
  const e = engine;
  switch (s.phase) {
    case 'youth': return e.advanceYouthYear(s, clubs);
    case 'contract_offer': { const offers = s.pendingOffers || []; return offers.length ? e.acceptOffer(s, offers[0]) : { ...s, phase: 'playing' }; }
    case 'playing': return e.advanceProSeason(s, clubs);
    case 'newspaper': return e.dismissNewspaper(s);
    case 'season_summary': return e.dismissSummary(s, clubs);
    case 'international_debut': return e.dismissDebut(s, clubs);
    case 'world_cup': return e.dismissWorldCup(s, clubs);
    case 'rehab_choice': return e.applyRehabChoice(s, 1);
    case 'rivalry_event': return e.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return e.dismissBallonDor(s, clubs);
    case 'bdor_speech': return e.applyBdorSpeech(s, 0);
    case 'wc_speech': return e.applyWorldCupSpeech(s, 0);
    case 'moral_dilemma': return e.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return e.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return e.dismissAppealResult(s, clubs);
    case 'retirement_suggestion': return e.acceptRetirementSuggestion(s);
    case 'retirement_ceremony': case 'retired': return { ...s, retired: true };
    case 'random_events': {
      const ev = (s.pendingEvents || [])[0];
      if (!ev || !ev.choices || !ev.choices.length) return { ...s, phase: 'playing', pendingEvents: [] };
      return e.applyEventChoice(s, ev.choices.length - 1, clubs);
    }
    case 'contract_expiring': case 'transfer_window': return e.stayAtClub(s);
    default: { const n = e.advanceProSeason(s, clubs); return n.phase === s.phase ? { ...n, retired: true } : n; }
  }
}

function runCareer(seed, { era = '2020-24', startYear = 2020, proSeasons = 10, ovr = 64, nation = 'England', until = null } = {}) {
  const realRandom = Math.random;
  Math.random = seeded(seed * 7919 + 13);
  try {
    const position = POSITIONS[seed % POSITIONS.length];
    let s = engine.initCareer(`Sim ${seed}`, nation, position, era, stats(ovr), ovr, startYear, clubs, null, 82);
    let guard = 0;
    const played = () => (s.seasons || []).filter(r => r.type === 'playing').length;
    while (!s.retired && guard++ < 500 && played() < proSeasons) {
      if (until && until(s)) return s;
      s = step(s);
    }
    return s;
  } finally {
    Math.random = realRandom;
  }
}

/* The digest drops the two new fields and nothing else. Everything the engine
   writes into the state goes in, so a moved Math.random stream anywhere in a
   season shows up as a changed hash. */
const NEW_FIELDS = ['leagueFinish', 'leagueSize'];
function digest(s) {
  const json = JSON.stringify(s, (k, v) => (NEW_FIELDS.includes(k) ? undefined : v));
  return crypto.createHash('sha256').update(json).digest('hex').slice(0, 16);
}
const DIGEST_SEEDS = 16;
/* Recorded with --record on the untouched tree at origin/main 5f2622fd, before
   any line of this round existed, and twice to prove the digest is stable. */
const BASELINE = ['539858d7000e4591', 'e62cdae073abe906', 'da4789abe4543321', '92f21863034d5bce', '707970f71384bd3d', '5879c7a10fb90659', '1a9c7b940f5968e4', '69e1d33d413b0656', '8cdcb230d5724e65', '4ebd88d3d4b6a6a0', '48ca4ba73be9e9fe', '74d8b0a22eed6238', 'de756b5070df2302', '197b2357e2742487', '2dc97ee74f43440b', '6009b15056656286'];
if (RECORD) {
  const out = [];
  for (let i = 1; i <= DIGEST_SEEDS; i++) out.push(digest(runCareer(i)));
  console.log(JSON.stringify(out));
  process.exit(0);
}

let failures = 0;
const red = new Set();
let section = 0;
const fail = m => { failures += 1; red.add(section); console.error('  FAIL: ' + m); };
const ELITE = ['Bayern Munich', 'PSG', 'Man City', 'Real Madrid', 'Barcelona', 'Liverpool'];

/* The pool: every era start, six nations whose academies feed the five
   verified leagues and beyond, three starting levels so every tier is
   reached. */
const PER = Number(process.argv[2] || 6);
/* A second argument shifts every seed, so the bands can be measured over several draws. */
const OFFSET = Number(process.argv[3] || 0);
const STARTS = [[1990, '1990-94'], [1995, '1995-99'], [2000, '2000-04'], [2005, '2005-09'], [2010, '2010-14'], [2015, '2015-19'], [2020, '2020-24']];
const NATIONS = ['England', 'Spain', 'Germany', 'Italy', 'France', 'Netherlands'];
const OVRS = [56, 64, 72];
const seasons = [];
let careers = 0;
for (const [startYear, era] of STARTS) for (const nation of NATIONS) for (const ovr of OVRS) for (let i = 0; i < PER; i++) {
  const seed = startYear * 1000 + NATIONS.indexOf(nation) * 100 + ovr + i * 7 + OFFSET * 1000003;
  const s = runCareer(seed, { era, startYear, proSeasons: 8, ovr, nation });
  careers += 1;
  for (const r of s.seasons || []) if (r.type === 'playing') seasons.push(r);
}
const leagueOf = name => (clubs.find(c => c.name === name) || {}).league || '';
const sized = seasons.filter(r => league.leagueSizeFor(leagueOf(r.club), r.year));
console.log(`pool: ${careers} careers, ${seasons.length} playing seasons, ${sized.length} in a league with a verified size, ${seasons.filter(r => r.leagueTitle).length} titles`);
if (seasons.length < careers * 4) { section = 1; fail(`only ${seasons.length} playing seasons over ${careers} careers, the walk is not reaching the season loop`); }

/* Forced seasons: a career walked to its first pro season, then put at one
   club, era correct tier and league, for one season, over many seeds. They
   feed section 5, and the Man City 1990s rows give section 3 its tier 4 step,
   which no natural career reaches in a verified league. */
const FORCED = 240;
function forcedSeasons(club, startYear, era) {
  let titles = 0, n = 0, year = null;
  const rows = [];
  for (let i = 1; i <= FORCED; i++) {
    const seed = 50000 + startYear * 7 + i + OFFSET * 1000003;
    let s = runCareer(seed, { era, startYear, until: x => x.phase === 'playing' && !(x.seasons || []).some(r => r.type === 'playing') });
    if (s.phase !== 'playing') continue;
    const next = (s.seasons[s.seasons.length - 1]?.year ?? startYear) + 1;
    const adj = eras.adjustClubsForYear(clubs, next).find(c => c.name === club);
    s = { ...s, currentClub: club, currentClubTier: adj.tier, currentLeague: adj.league, currentClubCountry: adj.country };
    const realRandom = Math.random;
    Math.random = seeded(seed * 31 + 7);
    try { s = engine.advanceProSeason(s, clubs); } finally { Math.random = realRandom; }
    const row = (s.seasons || []).filter(r => r.type === 'playing').pop();
    if (!row || row.club !== club) continue;
    n += 1; year = row.year; rows.push(row); if (row.leagueTitle) titles += 1;
  }
  return { rate: n ? titles / n : 0, n, year, rows };
}
const CASES = [
  ['Man City', 1990, '1990-94', 'tier'], ['Man City', 2020, '2020-24', 'elite'],
  ['Real Madrid', 1990, '1990-94', 'elite'], ['PSG', 2000, '2000-04', 'tier'],
];
const FORCED_RESULTS = {};
for (const [club, startYear, era, want] of CASES) FORCED_RESULTS[club + want] = forcedSeasons(club, startYear, era);

section = 1;
console.log('1) finish is 1 exactly when leagueTitle is true');
{
  let bad = 0, titled = 0, titledNoFinish = 0, firstsNoTitle = 0;
  for (const r of seasons) {
    if (r.leagueTitle) { titled += 1; if (r.leagueFinish !== 1) { titledNoFinish += 1; bad += 1; } }
    else if (r.leagueFinish === 1) { firstsNoTitle += 1; bad += 1; }
  }
  console.log(`   ${titled} title seasons, ${titledNoFinish} of them without a 1st; ${firstsNoTitle} seasons 1st without the title`);
  if (titled < 20) fail(`only ${titled} title seasons in the pool, too few to say anything`);
  if (bad) fail(`${bad} seasons break the rule`);
}

section = 2;
console.log('2) never above the league size, never below 1, and a verified league always carries both');
{
  let over = 0, under = 0, missing = 0, wrongSize = 0, unsizedClaim = 0, cutShort = 0;
  for (const r of seasons) {
    const size = league.leagueSizeFor(leagueOf(r.club), r.year);
    if (r.leagueFinish !== undefined && r.leagueFinish < 1) under += 1;
    if (r.leagueSize !== undefined && r.leagueFinish > r.leagueSize) over += 1;
    /* A severe injury stops the season at the rehab choice and drops the
       title roll (Round 850); the finish goes with it, by design. */
    if (size && r.leagueFinish === undefined && r.injurySevere && !r.leagueTitle) { cutShort += 1; continue; }
    if (size && (r.leagueFinish === undefined || r.leagueSize !== size)) { if (r.leagueFinish === undefined) missing += 1; else wrongSize += 1; }
    if (!size && r.leagueSize !== undefined) unsizedClaim += 1;
    if (!size && r.leagueFinish !== undefined && r.leagueFinish !== 1) unsizedClaim += 1;
  }
  console.log(`   over ${over}, under ${under}, verified without a finish ${missing}, wrong size ${wrongSize}, a claim in an unverified league ${unsizedClaim}; ${cutShort} seasons cut short by a severe injury carry none, by design`);
  if (sized.length < seasons.length * 0.3) fail(`only ${sized.length} of ${seasons.length} seasons in a verified league, the pool is not testing the sizes`);
  if (over + under + missing + wrongSize + unsizedClaim) fail('a finish sits outside its table, or a size is claimed where none is verified');
}

section = 3;
console.log('3) the tier ladder of mean finish, as a share of the table, every step');
const STEP_MIN = [0.05, 0.1, 0.1, 0.04];
const groupOf = r =>(league.eliteInYear(ELITE, r.club, r.year) ? 'elite' : `tier ${Math.min(4, r.clubTier)}`);
const LADDER = ['elite', 'tier 1', 'tier 2', 'tier 3', 'tier 4'];
const groups = Object.fromEntries(LADDER.map(g => [g, []]));
const forcedLow = FORCED_RESULTS['Man Citytier'].rows;
for (const r of [...sized, ...forcedLow]) if (r.leagueFinish !== undefined && r.leagueSize) groups[groupOf(r)].push(r.leagueFinish / r.leagueSize);
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const means = LADDER.map(g => mean(groups[g]));
console.log('   ' + LADDER.map((g, i) => `${g}: ${means[i].toFixed(3)} over ${groups[g].length}`).join(', '));
for (let i = 1; i < LADDER.length; i++) {
  const [a, b] = [LADDER[i - 1], LADDER[i]];
  if (groups[a].length < 15 || groups[b].length < 15) { fail(`${a} (${groups[a].length}) or ${b} (${groups[b].length}) has fewer than 15 seasons, the step cannot be read`); continue; }
  if (!(means[i] - means[i - 1] >= STEP_MIN[i - 1])) fail(`${b} mean share ${means[i].toFixed(3)} is not at least ${STEP_MIN[i - 1]} below ${a} ${means[i - 1].toFixed(3)}`);
}

section = 4;
console.log('4) a current era career is byte identical to main once the two new fields are out');
{
  let same = 0, withFinish = 0, totalSeasons = 0;
  for (let i = 1; i <= DIGEST_SEEDS; i++) {
    const s = runCareer(i);
    if (digest(s) === BASELINE[i - 1]) same += 1;
    for (const r of s.seasons || []) if (r.type === 'playing') { totalSeasons += 1; if (r.leagueFinish !== undefined) withFinish += 1; }
  }
  console.log(`   ${same} of ${DIGEST_SEEDS} careers match the main digest; ${withFinish} of their ${totalSeasons} playing seasons carry a finish`);
  if (same !== DIGEST_SEEDS) fail(`${DIGEST_SEEDS - same} careers moved: the main Math.random stream or something else in the state changed`);
  if (withFinish === 0) fail('no digest season carries a finish, so the match above proves nothing about the new fields');
}

section = 5;
console.log('5) the elite boost reads the era: forced first seasons over many seeds');
const ELITE_MIN = 0.45;
const TIER_MAX = 0.3;
for (const [club, , , want] of CASES) {
  const r = FORCED_RESULTS[club + want];
  console.log(`   ${club}, first pro season ${r.year}: title rate ${(r.rate * 100).toFixed(1)}% over ${r.n} seasons, expected the ${want} rate`);
  if (r.n < FORCED * 0.6) { fail(`${club}: only ${r.n} forced seasons landed, the setup is not reaching the season`); continue; }
  if (want === 'elite' && r.rate < ELITE_MIN) fail(`${club} ${r.year}: ${(r.rate * 100).toFixed(1)}% is under the elite floor ${ELITE_MIN * 100}%`);
  if (want === 'tier' && r.rate > TIER_MAX) fail(`${club} ${r.year}: ${(r.rate * 100).toFixed(1)}% is over the era tier ceiling ${TIER_MAX * 100}%, the era blind boost is back`);
}

console.log('');
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const got = [...red].sort();
  const same = got.length === want.length && want.every(w => red.has(w));
  if (same) { console.log(`simCareerLeagueFinish: control ${CONTROL} turned section ${want.join(', ')} red and nothing else. The check works.`); process.exit(1); }
  console.log(`simCareerLeagueFinish: control ${CONTROL} should have reddened exactly section ${want.join(', ')}, got [${got.join(', ') || 'none'}]. The control proves nothing.`);
  process.exit(2);
}
if (failures) { console.error(`simCareerLeagueFinish: ${failures} failure(s) in section(s) ${[...red].sort().join(', ')}`); process.exit(1); }
console.log(`simCareerLeagueFinish: green. ${careers} careers, ${seasons.length} seasons, ${sized.length} in a verified league; finish and title agree, the ladder holds, main's stream is untouched and the elite boost reads the era.`);
