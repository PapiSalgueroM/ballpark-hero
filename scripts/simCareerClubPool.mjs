/* Round 1013: Soccer Career's clubs generated from Club Manager.

   Club Manager owns four leagues (premier, championship, laliga 2026-27 and
   brasileirao Serie A 2026). scripts/genCareerClubPool.mjs derives Soccer
   Career rows from them into src/data/soccerCareerClubPool.ts, the engine
   appends those rows after the 190 hand rows (HAND_CLUBS), and the market
   draws a league before a club (pickAcrossLeagues, capped at
   LEAGUE_DRAW_CAP = 5 clubs of weight per league and tier).

   Sections
   1 FRESH       the committed file equals a fresh derive, byte for byte.
   2 MEMBERSHIP  in the 2026 view each league label carries Club Manager's
                 lineup, with the pinned exceptions below and nothing else.
   3 IDENTITY    unique names and ids, ASCII, careerEras strings, colours
                 that are not Club Manager's fallback grey, Welsh clubs,
                 labels, and Red Bull Bragantino absent before 2020.
   4 TIERS       the tier rule re-derived independently, HAND_CLUBS frozen,
                 the Forest era rule, and the per league XI table.
   5 WEIGHTS     exact rationals: on HAND_CLUBS every club keeps 1/n; on the
                 full pool the four leagues hold 20/100 of tier 4.
   6 OFFERS      real careers over several seeds: (a) each league offers its
                 generated clubs, (b) the draws match their own analytic odds,
                 (c) every market offer came through pickAcrossLeagues, and
                 (d) home academies for youths rated 40 to 54 match the
                 analytic shares of the home list.
   7 OLD SAVES   saves at West Ham, Wolves, Girona, Norwich City, Flamengo and
                 Real Madrid built on the pre-round pool load and play on.

   The pinned exceptions (lead's decision 2026-10-05, option (a)): Soccer
   Career labels a club by one league in every era, and the 190 hand rows are
   never rewritten. So West Ham and Wolves keep "Premier League" and Girona
   keeps "La Liga" although Club Manager's 2026-27 world has West Ham and
   Wolves in the Championship and Girona in the Segunda. A league by year
   override is queued as its own round; until it lands these three are the
   only clubs allowed to differ, and section 2 names them.

   Negative controls, SIM_CLUB_POOL_CONTROL=<name>. Each asserts the source
   string it rewrites exists (in memory, never on disk), and the run exits 0
   only if its target section went red:
     stale        drop Coventry City from Club Manager's premier row   -> 1
     relabel      relabel West Ham "Championship"                      -> 2
     tier         Leeds United at tier 1 in the bundled pool           -> 4
     uncapped     LEAGUE_DRAW_CAP = Infinity                           -> 6
     nopool       FALLBACK_CLUBS without the generated rows            -> 2
     picksite     makeOffer back on the plain pick                     -> 6
     dropclub     remove West Ham's hand row                           -> 7
     nocolor      delete Coventry City's Club Manager colour           -> 3
     noforest     delete the Forest era rule                           -> 4
     nobragantino delete Red Bull Bragantino's founded year            -> 3

   Run: node scripts/simCareerClubPool.mjs   (SEEDS=n, CAREERS=n to scale 6)
   No network and no database: everything is bundled from this tree. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { bundleCareerSources, deriveCareerClubPool, poolInputs, renderPoolFile, LEAGUE_LABELS, POOL_LEAGUES, NAME_ALIASES } from './lib/careerClubPool.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_CLUB_POOL_CONTROL || '';
const SEEDS = Number(process.env.SEEDS || 6);
const CAREERS = Number(process.env.CAREERS || 48);
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const tmpDir = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'simpool-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });

const red = new Set();
let section = '0';
let failures = 0;
const fail = m => { failures += 1; red.add(section); console.error(`  FAIL [${section}]: ${m}`); };
const ok = (cond, m) => { if (!cond) fail(m); return cond; };
const head = (id, title) => { section = id; console.log(`\n${id}. ${title}`); };

/* Controls: file under src, the exact string it must find, the rewrite. */
const swap = (from, to) => s => {
  if (!s.includes(from)) { console.error(`control ${CONTROL}: anchor not found: ${from}`); process.exit(2); }
  return s.replace(from, to);
};
const CONTROLS = {
  stale: ['1', 'lib/clubManager.ts', swap(`'Coventry City', 'Crystal Palace'`, `'Crystal Palace'`)],
  relabel: ['2', 'lib/soccerCareerEngine.ts', swap(`name: "West Ham", country: "England", tier: 3, color: "#7A263A", league: "Premier League"`, `name: "West Ham", country: "England", tier: 3, color: "#7A263A", league: "Championship"`)],
  tier: ['4', 'data/soccerCareerClubPool.ts', swap(`name: "Leeds United", country: "England", tier: 4`, `name: "Leeds United", country: "England", tier: 1`)],
  uncapped: ['6', 'lib/soccerCareerEngine.ts', swap('export const LEAGUE_DRAW_CAP = 5;', 'export const LEAGUE_DRAW_CAP = Infinity;')],
  nopool: ['2', 'lib/soccerCareerEngine.ts', swap('[...HAND_CLUBS, ...CAREER_CLUB_POOL]', '[...HAND_CLUBS]')],
  picksite: ['6', 'lib/soccerCareerEngine.ts', swap('if (candidates.length === 0) return null;\n  const club = pickAcrossLeagues(candidates);', 'if (candidates.length === 0) return null;\n  const club = pick(candidates);')],
  dropclub: ['7', 'lib/soccerCareerEngine.ts', swap(`  { id: "fb-43", name: "West Ham", country: "England", tier: 3, color: "#7A263A", league: "Premier League" },\n`, '')],
  nocolor: ['3', 'lib/clubManager.ts', swap(`'Coventry City': '#66b2e8', `, '')],
  noforest: ['4', 'lib/careerEras.ts', swap('{ name: "Nottingham Forest", from: 1999, until: 2021, tier: 4 },', '')],
  nobragantino: ['3', 'lib/careerEras.ts', swap('"Red Bull Bragantino": 2020,', '')],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL} (${Object.keys(CONTROLS).join(', ')})`); process.exit(2); }

/* Every pickAcrossLeagues call is recorded (candidates and pick) by wrapping
   the function in memory, so section 6 can price each draw on its own list. */
const recordDraws = s => {
  const from = 'export function pickAcrossLeagues(candidates: ClubData[]): ClubData {';
  if (!s.includes(from)) { console.error('pickAcrossLeagues not found to record'); process.exit(2); }
  return `${s.replace(from, 'function __pickAcrossLeaguesInner(candidates: ClubData[]): ClubData {')}
export function pickAcrossLeagues(candidates: ClubData[]): ClubData {
  const p = __pickAcrossLeaguesInner(candidates);
  const log = (globalThis as { __poolDrawLog?: (c: ClubData[], p: ClubData) => void }).__poolDrawLog;
  if (log) log(candidates, p);
  return p;
}
`;
};
const transforms = {};
const addT = (file, f) => { const b = transforms[file]; transforms[file] = b ? s => f(b(s)) : f; };
if (CONTROL) addT(CONTROLS[CONTROL][1], CONTROLS[CONTROL][2]);
const stubTransforms = { ...transforms };
addT('lib/soccerCareerEngine.ts', recordDraws);

function finish() {
  console.log('');
  if (CONTROL) {
    const target = CONTROLS[CONTROL][0];
    if (red.has(target)) { console.log(`control ${CONTROL}: section ${target} went red as it must (red: ${[...red].sort().join(', ')})`); process.exit(0); }
    console.log(`control ${CONTROL}: section ${target} stayed green, the control changed nothing it should have (red: ${[...red].sort().join(', ') || 'none'})`);
    process.exit(1);
  }
  console.log(failures ? `simCareerClubPool: ${failures} failure(s) in section(s) ${[...red].sort().join(', ')}` : 'simCareerClubPool: all sections green');
  process.exit(failures ? 1 : 0);
}

/* ─── 1. FRESH ─── */
head('1', 'FRESH: the committed pool equals a fresh derive from Club Manager');
let stubMod;
try { stubMod = await bundleCareerSources({ root: ROOT, tmpDir, stubPool: true, transforms: stubTransforms }); }
catch (e) { fail(`bundling with the pool stubbed failed: ${e.message.split('\n')[0]}`); finish(); }
const inputs = poolInputs(stubMod);
const derived = deriveCareerClubPool(inputs);
const want = renderPoolFile(derived.rows, stubMod.CM_ROSTER_META).split('\n');
const onDisk = fs.readFileSync(path.join(ROOT, 'src', 'data', 'soccerCareerClubPool.ts'), 'utf8').replaceAll('\r\n', '\n').split('\n');
const firstDiff = want.findIndex((l, i) => l !== onDisk[i]);
if (ok(firstDiff === -1 && want.length === onDisk.length, 'src/data/soccerCareerClubPool.ts is stale: rerun node scripts/genCareerClubPool.mjs')) {
  console.log(`  ${derived.rows.length} generated rows, the file matches a fresh derive line for line`);
} else {
  const i = firstDiff === -1 ? Math.min(want.length, onDisk.length) : firstDiff;
  console.log(`  first difference at line ${i + 1}\n    derived: ${want[i] ?? '(end)'}\n    on disk: ${onDisk[i] ?? '(end)'}`);
}

let mod;
try { mod = await bundleCareerSources({ root: ROOT, tmpDir, transforms }); }
catch (e) { fail(`bundling the engine failed (rerun genCareerClubPool?): ${e.message.split('\n')[0]}`); finish(); }
const { engine, eras, cm } = mod;
const POOL = engine.FALLBACK_CLUBS;
const HAND = engine.HAND_CLUBS;
const GENERATED = POOL.slice(HAND.length);
const FOUR = new Set(Object.values(LEAGUE_LABELS));
const cmName = n => NAME_ALIASES[n] ?? inputs.fold(n);

/* ─── 2. MEMBERSHIP ─── */
head('2', 'MEMBERSHIP: each label carries Club Manager\'s lineup in the 2026 view');
const PINNED = {
  premier: { extra: ['West Ham', 'Wolves'], missing: [] },
  championship: { extra: [], missing: ['West Ham', 'Wolves'] },
  laliga: { extra: ['Girona'], missing: [] },
  brasileirao: { extra: [], missing: [] },
};
const view2026 = eras.adjustClubsForYear(POOL, 2026);
for (const id of POOL_LEAGUES) {
  const label = LEAGUE_LABELS[id];
  const cmNames = cm.REAL_LEAGUES.find(l => l.id === id).clubs.map(cmName);
  const expected = new Set([...cmNames.filter(n => !PINNED[id].missing.includes(n)), ...PINNED[id].extra]);
  const actual = new Set(view2026.filter(c => c.league === label).map(c => c.name));
  const extra = [...actual].filter(n => !expected.has(n));
  const missing = [...expected].filter(n => !actual.has(n));
  ok(!extra.length && !missing.length, `${label}: extra [${extra.join(', ')}] missing [${missing.join(', ')}]`);
  console.log(`  ${label}: ${actual.size} clubs (Club Manager ${cmNames.length}, pinned +${PINNED[id].extra.join('/') || 0} -${PINNED[id].missing.join('/') || 0})`);
}
for (const n of ['West Ham', 'Wolves']) ok(HAND.find(c => c.name === n)?.league === 'Premier League', `${n} keeps its hand label "Premier League"`);
ok(HAND.find(c => c.name === 'Girona')?.league === 'La Liga', 'Girona keeps its hand label "La Liga"');
ok(!POOL.some(c => c.league === 'Segunda Division'), 'no club carries a "Segunda Division" label (option (a))');
ok(GENERATED.length > 0, `the engine appends generated rows (${GENERATED.length})`);

/* ─── 3. IDENTITY ─── */
head('3', 'IDENTITY: names, ids, careerEras strings, colours, countries, labels');
const foldKey = s => inputs.fold(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const dupes = arr => [...new Set(arr.filter((x, i) => arr.indexOf(x) !== i))];
ok(!dupes(POOL.map(c => c.name)).length, `names are unique (${dupes(POOL.map(c => c.name)).join(', ')})`);
ok(!dupes(POOL.map(c => c.id)).length, `ids are unique (${dupes(POOL.map(c => c.id)).join(', ')})`);
ok(!dupes(POOL.map(c => foldKey(c.name))).length, `names are unique after folding (${dupes(POOL.map(c => foldKey(c.name))).join(', ')})`);
ok(!dupes(POOL.map(c => foldKey(c.id))).length, 'ids are unique after folding');
const nonAscii = POOL.filter(c => !/^[ -~]+$/.test(c.name));
ok(!nonAscii.length, `every name is printable ASCII (${nonAscii.map(c => c.name).join(', ')})`);
const handNames = new Set(HAND.map(c => c.name));
ok(!GENERATED.some(c => handNames.has(c.name)), 'no generated name repeats a hand name');
const contenders = new Set();
for (let y = 1960; y <= 2060; y++) {
  for (const n of eras.getEraTopClubs(y)) contenders.add(n);
  for (const list of Object.values(eras.getEraLeagueClubs(y))) for (const n of list) contenders.add(n);
}
const poolByFold = new Map(POOL.map(c => [foldKey(c.name), c.name]));
let eraMatches = 0;
for (const n of contenders) {
  const p = poolByFold.get(foldKey(n));
  if (!p) continue;
  eraMatches += 1;
  ok(p === n, `careerEras names "${n}" but the pool says "${p}" (the world feed compares the strings)`);
}
const NEWLY_PLAYABLE = ['Leeds United', 'Blackburn Rovers', 'Valencia', 'Deportivo', 'Fluminense', 'Internacional', 'Atletico Mineiro', 'Vasco da Gama'];
for (const n of NEWLY_PLAYABLE) {
  ok(contenders.has(n), `${n} is a careerEras contender`);
  ok(GENERATED.some(c => c.name === n), `${n} is in the generated pool`);
}
console.log(`  ${contenders.size} careerEras contender names, ${eraMatches} of them in the pool, all byte identical`);
/* Club Manager's clubDefFor answers '#8899aa' for a club it has no colour
   for, so a hex check alone would pass a missing colour. */
const FALLBACK_GREY = '#8899aa';
let colours = 0;
for (const r of [...derived.rows, ...GENERATED]) {
  colours += 1;
  ok(/^#[0-9a-fA-F]{6}$/.test(r.color), `${r.name}: colour ${r.color} is hex`);
  ok(r.color.toLowerCase() !== FALLBACK_GREY, `${r.name}: colour is Club Manager's fallback grey, not a real colour`);
}
console.log(`  ${colours} colours checked (derived and bundled rows), none is the fallback grey`);
for (const n of ['Cardiff City', 'Swansea City', 'Wrexham']) ok(POOL.find(c => c.name === n)?.country === 'Wales', `${n} is Welsh`);
const handLabels = new Set(HAND.map(c => c.league));
ok(GENERATED.every(c => handLabels.has(c.league)), 'every generated league label already exists among the hand labels');
let bragantinoOk = true;
for (let y = 1990; y <= 2026; y++) {
  const has = eras.adjustClubsForYear(POOL, y).some(c => c.name === 'Red Bull Bragantino');
  if (has !== (y >= 2020)) { bragantinoOk = false; fail(`Red Bull Bragantino ${has ? 'present' : 'absent'} in ${y} (the name dates from the 2020 season)`); }
}
if (bragantinoOk) console.log('  Red Bull Bragantino absent from every pool before 2020 and present from 2020');

/* ─── 4. TIERS ─── */
head('4', 'TIERS: the rule worked again, hand rows frozen, Forest across eras');
const partialSet = new Set(stubMod.CM_PARTIAL);
const handBy = new Map(HAND.map(c => [c.name, c]));
const tableLines = [];
for (const id of POOL_LEAGUES) {
  const members = cm.REAL_LEAGUES.find(l => l.id === id).clubs.map(n => ({ cm: n, name: cmName(n), xi: inputs.xiOf(n) }));
  const hands = members.filter(m => handBy.has(m.name)).map(m => ({ ...m, tier: handBy.get(m.name).tier }));
  const cells = [];
  for (const m of members) {
    const row = POOL.find(c => c.name === m.name);
    if (!ok(row, `${m.name} is in the pool`)) continue;
    cells.push(`${m.name} ${m.xi}/t${row.tier}${handBy.has(m.name) ? '*' : ''}`);
    if (handBy.has(m.name)) continue;
    for (const h of hands) if (h.xi > m.xi) ok(row.tier >= h.tier, `${m.name} (XI ${m.xi}, t${row.tier}) sits above ${h.name} (XI ${h.xi}, t${h.tier})`);
    let expect;
    if (id === 'championship' || partialSet.has(m.cm)) expect = 4;
    else {
      const stronger = hands.filter(h => h.xi >= m.xi);
      expect = stronger.length ? Math.max(...stronger.map(h => h.tier)) : (hands.length ? Math.min(...hands.map(h => h.tier)) : 4);
    }
    ok(row.tier === expect, `${m.name}: tier ${row.tier}, the rule says ${expect}`);
  }
  tableLines.push(`  ${LEAGUE_LABELS[id]} (* hand row): ${cells.join(', ')}`);
}
for (const l of tableLines) console.log(l);
const margin = Math.round((inputs.xiOf('Nottingham Forest') - inputs.xiOf('Aston Villa')) * 10) / 10;
console.log(`  Forest XI ${inputs.xiOf('Nottingham Forest')} vs Aston Villa (t3) ${inputs.xiOf('Aston Villa')}: margin ${margin}. At or below 0 Forest drops to tier 3 on the next regenerate.`);
/* HAND_CLUBS as origin/main shipped it before this round (cbc4e03a's
   FALLBACK_CLUBS, all six fields). Saves and the academy lookups read these
   rows by name, so they are never renamed, removed, reordered or retiered. */
const HAND_FINGERPRINT = '52c917c0fb1034e0';
const handPrint = createHash('sha256').update(JSON.stringify(HAND.map(c => [c.id, c.name, c.country, c.tier, c.color, c.league]))).digest('hex').slice(0, 16);
ok(HAND.length === 190, `HAND_CLUBS has ${HAND.length} rows, 190 expected`);
ok(handPrint === HAND_FINGERPRINT, `HAND_CLUBS fingerprint ${handPrint}, frozen ${HAND_FINGERPRINT}`);
ok(POOL.slice(0, HAND.length).every((c, i) => c === HAND[i]), 'FALLBACK_CLUBS starts with HAND_CLUBS in order, so every hand index survives');
const forestTier = y => eras.adjustClubsForYear(POOL, y).find(c => c.name === 'Nottingham Forest')?.tier;
const forestBase = GENERATED.find(c => c.name === 'Nottingham Forest')?.tier;
for (const y of [1990, 1998, 2022, 2026]) ok(forestTier(y) === forestBase, `Forest in ${y}: tier ${forestTier(y)}, the generated tier ${forestBase}`);
for (let y = 1999; y <= 2021; y++) ok(forestTier(y) === 4, `Forest in ${y} (outside the top flight 1999-00 to 2021-22): tier ${forestTier(y)}, 4 expected`);
console.log(`  HAND_CLUBS ${HAND.length} rows, fingerprint ${handPrint}; Forest t${forestBase}, t4 from 1999 to 2021`);

/* ─── 5. WEIGHTS ─── */
head('5', 'WEIGHTS: exact odds from leagueDrawGroups, as rationals');
const CAP = 5; // the harness's own copy of the rule, so a changed engine cap cannot move the yardstick
const fourOdds = cands => {
  const groups = new Map();
  for (const c of cands) { const k = `${c.league}|${c.tier}`; groups.set(k, (groups.get(k) || 0) + 1); }
  let w = 0; let four = 0;
  for (const [k, n] of groups) { const wt = Math.min(n, CAP); w += wt; if (FOUR.has(k.split('|')[0])) four += wt; }
  return { four, w };
};
const handSets = [[1], [2], [3], [4], [1, 2], [2, 3], [3, 4]];
for (const tiers of handSets) {
  const cands = HAND.filter(c => tiers.includes(c.tier));
  const groups = engine.leagueDrawGroups(cands);
  const W = groups.reduce((s, g) => s + g.weight, 0);
  const n = cands.length;
  /* P(club) = weight/W * 1/size, which is 1/n exactly when weight * n === W * size */
  const off = groups.filter(g => g.weight * n !== W * g.clubs.length);
  ok(groups.reduce((s, g) => s + g.clubs.length, 0) === n, `tiers ${tiers}: the groups partition the candidates`);
  ok(!off.length, `HAND_CLUBS tiers ${tiers}: ${off.map(g => g.key).join(', ')} are off 1/${n}`);
  if (!off.length) console.log(`  HAND_CLUBS tier ${tiers.join('+')}: ${n} clubs, ${groups.length} league groups (largest ${Math.max(...groups.map(g => g.clubs.length))}), every club exactly 1/${n}`);
}
const t4 = POOL.filter(c => c.tier === 4);
const g4 = engine.leagueDrawGroups(t4);
const W4 = g4.reduce((s, g) => s + g.weight, 0);
const F4 = g4.filter(g => FOUR.has(g.clubs[0].league)).reduce((s, g) => s + g.weight, 0);
const rawFour = t4.filter(c => FOUR.has(c.league)).length;
ok(F4 === 20 && W4 === 100, `the four leagues hold ${F4}/${W4} of the tier 4 draw weight, 20/100 expected`);
/* The sampler itself, without sampling: drive the first Math.random call
   over a midpoint grid of W4 * M points (the second call fixed), and every
   group must be chosen on exactly weight * M of them. */
{
  const realRandom = Math.random;
  const M = 4;
  const K = W4 * M;
  const hits = new Map(g4.map(g => [g.key, 0]));
  let k = 0;
  for (; k < K; k++) {
    let call = 0;
    Math.random = () => (call++ === 0 ? (k + 0.5) / K : 0.5);
    const p = engine.pickAcrossLeagues(t4);
    const key = `${p.league}|${p.tier}`;
    hits.set(key, (hits.get(key) || 0) + 1);
  }
  Math.random = realRandom;
  const offGrid = g4.filter(g => hits.get(g.key) !== g.weight * M);
  ok(!offGrid.length, `pickAcrossLeagues chose ${offGrid.map(g => `${g.key} ${hits.get(g.key)}/${g.weight * M}`).join(', ')} off its weights`);
  if (!offGrid.length) console.log(`  pickAcrossLeagues over tier 4: on a ${K} point grid every league group is chosen exactly weight x ${M} times`);
}
console.log(`  full pool tier 4: four leagues ${F4}/${W4} capped; a plain pick would give them ${rawFour}/${t4.length}`);

/* ─── 6. OFFERS ─── */
head('6', `OFFERS: ${SEEDS} seeds x ${CAREERS} careers from 2020 through the real loop`);
function seedRandom(n) {
  let seed = n | 0;
  Math.random = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const stats = ovr => ({ pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr });
const NATS = ['England', 'Spain', 'Brazil', 'Wales', 'Japan', 'Nigeria', 'USA', 'Argentina'];
const POSITIONS = ['ST', 'CM', 'CB', 'GK'];
/* One engine step, the same dispatch as simClubSquads' fleet. */
function step(s, clubs) {
  if (s.phase === 'rehab_choice') return engine.applyRehabChoice(s, 1);
  switch (s.phase) {
    case 'youth': return engine.advanceYouthYear(s, clubs);
    case 'contract_offer': {
      const offers = s.pendingOffers || [];
      if (!offers.length) return { ...s, phase: 'playing' };
      return engine.acceptOffer(s, offers[0]);
    }
    case 'playing': return engine.advanceProSeason(s, clubs);
    case 'newspaper': return engine.dismissNewspaper(s);
    case 'season_summary': return engine.dismissSummary(s, clubs);
    case 'random_events':
      if (!s.pendingEvents || !s.pendingEvents[0]) return { ...s, pendingEvents: [], phase: 'playing' };
      return engine.applyEventChoice(s, 0, clubs);
    case 'moral_dilemma': return engine.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return engine.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return engine.dismissAppealResult(s, clubs);
    case 'international_debut': return engine.dismissDebut(s, clubs);
    case 'world_cup': return engine.dismissWorldCup(s, clubs);
    case 'rivalry_event': return engine.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return engine.dismissBallonDor(s, clubs);
    case 'transfer_window': {
      const sit = s.transferSituation;
      if (sit && sit.type === 'one_offer') return engine.acceptOffer(s, sit.offer);
      if (sit && sit.type === 'bidding_war') return engine.acceptOffer(s, sit.offerA);
      if (sit && sit.type === 'dream_club') return engine.acceptOffer(s, sit.offer);
      if (sit && sit.type === 'frozen_out' && sit.offers.length) {
        const o = sit.offers[0];
        return o.isLoan ? engine.acceptLoan(s, o) : engine.acceptOffer(s, o);
      }
      return engine.stayAtClub(s, clubs);
    }
    default: return { ...s, retired: true };
  }
}
const offersOf = s => {
  const out = [...(s.pendingOffers || []), ...(s.pendingLoanOffers || [])];
  const sit = s.transferSituation;
  if (sit) {
    if (sit.offer) out.push(sit.offer);
    if (sit.offerA) out.push(sit.offerA);
    if (sit.offerB) out.push(sit.offerB);
    if (Array.isArray(sit.offers)) out.push(...sit.offers);
  }
  return out;
};
/* Plays one seed. Every pickAcrossLeagues draw is priced on its own list;
   every market offer (not the homegrown ones, which name the academy) must
   carry a club that a pickAcrossLeagues call returned in that same step. */
function playSeed(seed, startYear, careers, era) {
  seedRandom(seed);
  const r = { draws: 0, measured: 0, expected: 0, variance: 0, offers: 0, uncovered: [], byLeague: new Map(), marketFour: 0, marketAll: 0, rivals: [] };
  let stepPicks = new Set();
  globalThis.__poolDrawLog = (cands, p) => {
    const { four, w } = fourOdds(cands);
    const q = four / w;
    r.draws += 1; r.expected += q; r.variance += q * (1 - q);
    if (FOUR.has(p.league)) r.measured += 1;
    stepPicks.add(p);
  };
  const seen = new WeakSet();
  for (let c = 0; c < careers; c++) {
    const ovr = 45 + (c % 28);
    let s = engine.initCareer(`Pool ${seed} ${c}`, NATS[c % NATS.length], POSITIONS[c % POSITIONS.length], era, stats(ovr), ovr, startYear, POOL, null);
    let guard = 0;
    while (!s.retired && guard++ < 140) {
      stepPicks = new Set();
      s = step(s, POOL);
      for (const o of offersOf(s)) {
        if (!o || !o.club || seen.has(o)) continue;
        seen.add(o);
        r.offers += 1;
        if (o.club.id.startsWith('cm-')) {
          if (!r.byLeague.has(o.club.league)) r.byLeague.set(o.club.league, new Set());
          r.byLeague.get(o.club.league).add(o.club.name);
        }
        if (o.isHomegrown) continue;
        r.marketAll += 1;
        if (FOUR.has(o.club.league)) r.marketFour += 1;
        if (!stepPicks.has(o.club)) r.uncovered.push(`${o.club.name} (${s.phase})`);
      }
    }
    if (s.rival && s.rival.club) r.rivals.push(s.rival.club);
  }
  globalThis.__poolDrawLog = undefined;
  return r;
}

/* Bands, set from measured headroom (see the numbers below). */
/* Measured 2026-10-05 over 12 seeds x 48 careers (seeds 0x1013a + i * 7919):
   distinct generated clubs offered per seed, minimum (range): Premier League
   3 (3 to 7), Championship 6 (6 to 13), La Liga 4 (4 to 8), Brasileirao 4
   (4 to 11). Each floor is half the minimum, rounded down, at least 1; the
   nopool control gives 0. */
const F_MIN_DISTINCT = { 'Premier League': 1, Championship: 3, 'La Liga': 2, Brasileirao: 2 };
/* Four leagues' wins over their expected wins, per seed: 0.911 to 1.080
   over the same 12 seeds (z -1.90 to 1.70, about 1150 to 1230 draws each,
   one seed's ratio sd about 0.05). The band 0.2 is about four sd and twice
   the worst seed; the uncapped control lands far outside it. */
const D_RATIO = 0.2;
const SEED_LIST = Array.from({ length: SEEDS }, (_, i) => 0x1013a + i * 7919);
const results = [];
const t0 = Date.now();
for (const seed of SEED_LIST) {
  const r = playSeed(seed, 2020, CAREERS, '2020s');
  results.push(r);
  const ratio = r.measured / r.expected;
  const z = (r.measured - r.expected) / Math.sqrt(r.variance || 1);
  const leagues = [...FOUR].map(l => `${l} ${r.byLeague.get(l)?.size ?? 0}`).join(', ');
  console.log(`  seed ${seed}: ${r.draws} draws, four leagues ${r.measured} vs ${r.expected.toFixed(1)} expected (ratio ${ratio.toFixed(3)}, z ${z.toFixed(2)}); ${r.offers} offers; distinct generated clubs offered: ${leagues}; uncovered ${r.uncovered.length}`);
  for (const l of FOUR) ok((r.byLeague.get(l)?.size ?? 0) >= F_MIN_DISTINCT[l], `seed ${seed}: ${l} offered ${r.byLeague.get(l)?.size ?? 0} distinct generated clubs, at least ${F_MIN_DISTINCT[l]} expected`);
  ok(r.draws >= 200, `seed ${seed}: only ${r.draws} pickAcrossLeagues draws, the comparison needs at least 200`);
  ok(Math.abs(ratio - 1) <= D_RATIO, `seed ${seed}: the four leagues won ${r.measured} draws against ${r.expected.toFixed(1)} on the draws' own odds (ratio ${ratio.toFixed(3)}, band 1 +/- ${D_RATIO})`);
  ok(!r.uncovered.length, `seed ${seed}: market offers that no pickAcrossLeagues call produced: ${r.uncovered.slice(0, 5).join(', ')}`);
}
const ratios = results.map(r => r.measured / r.expected);
const mins = [...FOUR].map(l => `${l} ${Math.min(...results.map(r => r.byLeague.get(l)?.size ?? 0))}`).join(', ');
console.log(`  ratio range ${Math.min(...ratios).toFixed(3)} to ${Math.max(...ratios).toFixed(3)}; per league minimum distinct generated clubs: ${mins}; ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const mk = results.reduce((a, r) => [a[0] + r.marketFour, a[1] + r.marketAll], [0, 0]);
const rv = results.flatMap(r => r.rivals);
const rvFour = rv.filter(n => FOUR.has(POOL.find(c => c.name === n)?.league)).length;
console.log(`  (printed, not gated) market offers from the four leagues ${mk[0]}/${mk[1]}; rivals ${rvFour}/${rv.length}`);
const t3up = POOL.filter(c => c.tier >= 3);
console.log(`  (printed, not gated) manager and owner clubs are a plain pick over tier 3 and 4: four leagues ${t3up.filter(c => FOUR.has(c.league)).length}/${t3up.length} (before this round ${HAND.filter(c => c.tier >= 3 && FOUR.has(c.league)).length}/${HAND.filter(c => c.tier >= 3).length})`);
const r95 = playSeed(0x1995, 1995, Math.max(8, Math.round(CAREERS / 3)), '1990s');
console.log(`  (printed, not gated) a 1995 start: four leagues won ${r95.measured} of ${r95.draws} draws (${r95.expected.toFixed(1)} expected); market offers ${r95.marketFour}/${r95.marketAll}; uncovered ${r95.uncovered.length}`);

/* 6d. Home academies for youths rated 40 to 54 are a plain pick over the
   home clubs at tier 3 or 4, so the bigger pool moves the mix: the tier 3
   share falls for English, Spanish and Brazilian youths. Measured against
   the analytic share of each home list, before (HAND_CLUBS, which is
   origin/main's pool row for row) and after. Wales is printed only: every
   Welsh tier 3 or 4 club is generated, so its share is 100% by construction. */
/* Largest deviation measured over the 12 seeds, 3000 draws each: 0.0230
   (England), 0.0185 (Spain), 0.0160 (Brazil); one share's sd is about
   0.008. The band 0.04 is about five sd. */
const D_ACAD = 0.04;
const ACAD_N = 3000;
console.log('  academies, youths rated 40 to 54, 2020 pool:');
for (const [label, pool] of [['before', HAND], ['after ', POOL]]) {
  const p2020 = eras.adjustClubsForYear(pool, 2020);
  for (const nat of ['England', 'Spain', 'Brazil', 'Wales']) {
    const home = p2020.filter(c => c.country === nat && c.tier >= 3);
    if (!home.length) { console.log(`    ${label} ${nat}: no home club at tier 3 or 4`); continue; }
    const aGen = home.filter(c => c.id.startsWith('cm-')).length / home.length;
    const nT3 = home.filter(c => c.tier === 3).length;
    const aT3 = nT3 / home.length;
    const devs = [];
    for (const seed of SEED_LIST) {
      seedRandom(seed ^ 0x5a5a);
      let gen = 0; let t3 = 0;
      for (let i = 0; i < ACAD_N; i++) {
        const club = engine.getYouthAcademyClub(p2020, nat, 40 + (i % 15));
        if (club.id.startsWith('cm-')) gen += 1;
        if (club.tier === 3) t3 += 1;
      }
      const dGen = gen / ACAD_N - aGen;
      const dT3 = t3 / ACAD_N - aT3;
      devs.push(Math.max(Math.abs(dGen), Math.abs(dT3)));
      if (label === 'after ' && nat !== 'Wales') ok(Math.abs(dGen) <= D_ACAD && Math.abs(dT3) <= D_ACAD, `${nat} seed ${seed}: academy shares off the home list (generated ${dGen.toFixed(4)}, tier 3 ${dT3.toFixed(4)}, band ${D_ACAD})`);
    }
    console.log(`    ${label} ${nat}: home list ${home.length}, tier 3 ${nT3}/${home.length} (${(aT3 * 100).toFixed(1)}%), generated ${(aGen * 100).toFixed(1)}%; largest seed deviation ${Math.max(...devs).toFixed(4)}`);
  }
}

/* ─── 7. OLD SAVES ─── */
head('7', 'OLD SAVES: careers signed on the pre-round pool load and play on');
/* Each save is built directly, not hoped for: a career started on the
   pre-round pool (HAND_CLUBS, identical to origin/main's list), signed with
   that club's own row, written to JSON, read back through the page's guard
   and repairCareer, then played three seasons on the new pool. It never
   moves on its own: windows are declined and a renewal is taken from the
   same club. A dilemma that moves the player ends the identity check. */
const OLD = ['West Ham', 'Wolves', 'Girona', 'Norwich City', 'Flamengo', 'Real Madrid'];
seedRandom(0x7007);
for (const name of OLD) {
  const row = HAND.find(c => c.name === name);
  if (!ok(row, `${name} has a hand row to sign with`)) continue;
  try {
    let s = engine.initCareer(`Old ${name}`, row.country, 'CM', '2020s', stats(70), 70, 2020, HAND, null);
    let g = 0;
    while (s.phase === 'youth' && g++ < 12) s = engine.advanceYouthYear(s, HAND);
    s = engine.acceptOffer(s, { club: { ...row }, contractYears: 5, wage: 20000, transferFee: 0 });
    const blob = JSON.parse(JSON.stringify(s));
    ok(mod.save.isSoccerCareerSave(blob), `${name}: the saved blob passes isSoccerCareerSave`);
    let t = engine.repairCareer(blob);
    const want7 = `${row.name}|${row.league}|${row.tier}`;
    const snap = x => `${x.currentClub}|${x.currentLeague}|${x.currentClubTier}`;
    ok(snap(t) === want7, `${name}: after the round trip the save reads ${snap(t)}, ${want7} expected`);
    ok(POOL.some(c => c.name === t.currentClub), `${name}: the save's club still resolves by name in FALLBACK_CLUBS`);
    ok(!t.academyClubName || POOL.some(c => c.name === t.academyClubName), `${name}: the academy club ${t.academyClubName} still resolves by name`);
    const start = t.seasons.length;
    let moved = false; let drift = ''; let guard = 0;
    while (!t.retired && t.seasons.length < start + 3 && guard++ < 120) {
      const before = t.currentClub;
      if (t.phase === 'transfer_window') t = engine.stayAtClub(t);
      else if (t.phase === 'contract_offer') {
        const same = (t.pendingOffers || []).find(o => o.club.name === t.currentClub);
        if (same) t = engine.acceptOffer(t, same); else { moved = true; t = step(t, POOL); }
      } else t = step(t, POOL);
      if (t.phase === 'moral_dilemma' || before !== t.currentClub) { if (before !== t.currentClub) moved = true; }
      if (!moved && !drift && snap(t) !== want7) drift = `${snap(t)} in phase ${t.phase}`;
    }
    ok(!drift, `${name}: the save changed club, league or tier without a move: ${drift}`);
    ok(t.retired || t.seasons.length >= start + 3, `${name}: only ${t.seasons.length - start} seasons played`);
    console.log(`  ${name}: ${t.seasons.length - start} seasons on the new pool, ${moved ? 'moved later' : `still ${snap(t)}`}`);
  } catch (e) { fail(`${name}: threw ${e && e.message}`); }
}

finish();
