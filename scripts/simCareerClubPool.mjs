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
