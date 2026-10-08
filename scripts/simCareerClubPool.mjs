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
   5 WEIGHTS     exact rationals: on the raw HAND_CLUBS every club keeps 1/n,
                 by season only Premier League tier 3 goes over the cap
                 (pinned); on the full pool the four leagues hold 20/100 of
                 tier 4 and the hand clubs' new shares are stated; the
                 sampler is driven over an exact grid on both of its
                 Math.random calls, so every club's count is exact.
   6 OFFERS      real careers over several seeds: (a) each league offers its
                 generated clubs, (b) the draws match their own analytic odds,
                 (c) every market offer and every worldwide academy fallback
                 came through pickAcrossLeagues, (d) home academies for
                 youths rated 40 to 54 match the analytic shares of the home
                 list, and (e) each reachable worldwide academy fallback
                 site, driven over the exact grid.
   7 OLD SAVES   saves at West Ham, Wolves, Girona, Norwich City, Flamengo and
                 Real Madrid built on the pre-round pool load and play on.

   The pinned exceptions (lead's decision 2026-10-05, option (a)): Soccer
   Career labels a club by one league in every era, and the 190 hand rows are
   never rewritten. So West Ham and Wolves keep "Premier League" and Girona
   keeps "La Liga" although Club Manager's 2026-27 world has West Ham and
   Wolves in the Championship and Girona in the Segunda. A league by year
   override is queued as its own round; until it lands these three are the
   only clubs allowed to differ, and section 2 names them.
   Round 1037 is that round: every season before 2026-27 is answered by the
   league ledgers (src/data/careerLeagueSeasons.ts), so the labels describe
   2026-27 alone and the three carry it (West Ham and Wolves Championship,
   Girona Segunda Division). Section 2 pins no exception now; section 4's
   fingerprint and section 5's over the cap seasons moved with them (see
   there), and relabel puts West Ham back in the Premier League.

   Negative controls, SIM_CLUB_POOL_CONTROL=<name>. Each asserts the source
   string it rewrites exists (in memory, never on disk), and the run exits 0
   only if its target section went red:
     stale        drop Coventry City from Club Manager's premier row   -> 1
     relabel      relabel West Ham "Premier League" again (Round 1037)  -> 2
     tier         Leeds United at tier 1 in the bundled pool           -> 4
     uncapped     LEAGUE_DRAW_CAP = Infinity                           -> 6
     nopool       FALLBACK_CLUBS without the generated rows            -> 2
     picksite     makeOffer back on the plain pick                     -> 6
     dropclub     drop West Ham from FALLBACK_CLUBS (its hand row and so
                  the old save stay): the save's club no longer resolves -> 7
     reread       relabel Wolves "Championship" t4 in FALLBACK_CLUBS only
                  and make repairCareer re-read league and tier from the
                  list, the regression a league by year override could
                  bring: the round trip and drift checks fire          -> 7
     (section 7's setup precondition, a hand row to sign with, reports as
     7s, so neither control can pass on the setup alone)
     nocolor      delete Coventry City's Club Manager colour           -> 3
     noforest     delete the Forest era rule                           -> 4
     forest90s    delete Forest's 1993-94 and 1997-98 rules            -> 4
     nobragantino delete Red Bull Bragantino's founded year            -> 3
     ingroup      the club inside a group drawn off the group's weight,
                  not its size: past the cap only 5 clubs reachable    -> 5
     academypick  the nine worldwide academy fallbacks back on pick    -> 6
     nosince      (Round 1100) careerEras stops reading the generated
                  first seasons: a held club is in a 1990 list         -> 3
     colourgone   (Round 1100) Club Manager gains a colour for
                  Macarthur FC: its POOL_COLORS row must go            -> 3
     unlisted     (Round 1100) Club Manager's Belgian league changes its
                  id, so the table reads a league that is not there    -> 2

   Round 1100: the career club pool grew from 241 to 460 clubs. The
   generator reads every current Club Manager league through ONE table
   (POOL_LEAGUE_ROWS; the three second flights Serie B, Ligue 2 and the
   Segunda Division are held), and this harness restates: section 2 walks
   every label (lineup, the facts file's members, a held league generates
   nothing, every Club Manager league has a row, a two league fixture
   derives from its table rows alone); section 3 holds countries
   (CLUB_COUNTRY and Club Manager's own clubCountry rows), supplied colours
   (only where Club Manager is grey, each in the facts file) and the since
   rule for EVERY generated club (the Bragantino check made general: a
   shipped club in every list from 1980 to 2060, a held one in none before
   2026-27); section 4 re-derives the tier rule per label and holds each
   ladder to its lineup in tier order; section 5 restates the exact weights
   (tier 4: 167 over 76 groups, main 100 over 70). Sections 6 and 7 are
   unchanged and their floors hold as measured (they price the four leagues
   Round 1013 read). The stepper of section 6 lives in
   scripts/lib/careerStep.mjs now.

   Open items, queued and not checked here: the first seasons of the clubs
   Round 1100 brought in (219 held out of every season before 2026-27 until
   two sources give each its first season; the facts file's clubSince lists
   them), and three generated names read as
   they do today in every era. Espanyol was spelled Espanol before 1995,
   Malaga CF dates from 1994 (CD Malaga, dissolved in 1992, came before it)
   and Athletico Paranaense was Atletico before 2019. CLUB_FOUNDED_AFTER
   would delete clubs that existed under the older name, so these need a
   name by year rule of their own.

   Run: node scripts/simCareerClubPool.mjs   (SEEDS=n, CAREERS=n to scale 6)
   No network and no database: everything is bundled from this tree. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { bundleCareerSources, deriveCareerClubPool, poolInputs, renderPoolFile, sinceInput, LEAGUE_LABELS, POOL_LEAGUES, POOL_LEAGUE_ROWS, HELD_LEAGUES, CLUB_COUNTRY, POOL_COLORS, FALLBACK_GREY, NAME_ALIASES } from './lib/careerClubPool.mjs';
import { careerStep, seedRandom } from './lib/careerStep.mjs';

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
  relabel: ['2', 'lib/soccerCareerEngine.ts', swap(`name: "West Ham", country: "England", tier: 3, color: "#7A263A", league: "Championship"`, `name: "West Ham", country: "England", tier: 3, color: "#7A263A", league: "Premier League"`)],
  tier: ['4', 'data/soccerCareerClubPool.ts', swap(`name: "Leeds United", country: "England", tier: 4`, `name: "Leeds United", country: "England", tier: 1`)],
  uncapped: ['6', 'lib/soccerCareerEngine.ts', swap('export const LEAGUE_DRAW_CAP = 5;', 'export const LEAGUE_DRAW_CAP = Infinity;')],
  nopool: ['2', 'lib/soccerCareerEngine.ts', swap('[...HAND_CLUBS, ...CAREER_CLUB_POOL]', '[...HAND_CLUBS]')],
  picksite: ['6', 'lib/soccerCareerEngine.ts', swap('if (candidates.length === 0) return null;\n  const club = pickAcrossLeagues(candidates);', 'if (candidates.length === 0) return null;\n  const club = pick(candidates);')],
  dropclub: ['7', 'lib/soccerCareerEngine.ts', swap('[...HAND_CLUBS, ...CAREER_CLUB_POOL]', '[...HAND_CLUBS.filter(c => c.name !== "West Ham"), ...CAREER_CLUB_POOL]')],
  reread: ['7', 'lib/soccerCareerEngine.ts', s => swap(
    'export function repairCareer<T extends CareerState>(state: T): T {\n  if (!state || typeof state !== "object") return state;\n  const s = state as CareerState;\n',
    'export function repairCareer<T extends CareerState>(state: T): T {\n  if (!state || typeof state !== "object") return state;\n  const s = state as CareerState;\n  { const row = FALLBACK_CLUBS.find(c => c.name === s.currentClub); if (row) { s.currentLeague = row.league; s.currentClubTier = row.tier; } }\n',
  )(swap('[...HAND_CLUBS, ...CAREER_CLUB_POOL]', '[...HAND_CLUBS.map(c => (c.name === "Wolves" ? { ...c, league: "Championship", tier: 4 } : c)), ...CAREER_CLUB_POOL]')(s))],
  nocolor: ['3', 'lib/clubManager.ts', swap(`'Coventry City': '#66b2e8', `, '')],
  noforest: ['4', 'lib/careerEras.ts', swap('{ name: "Nottingham Forest", from: 1999, until: 2021, tier: 4 },', '')],
  forest90s: ['4', 'lib/careerEras.ts', swap('{ name: "Nottingham Forest", from: 1993, until: 1993, tier: 4 }, { name: "Nottingham Forest", from: 1997, until: 1997, tier: 4 },', '')],
  nobragantino: ['3', 'lib/careerEras.ts', swap('"Red Bull Bragantino": 2020,', '')],
  /* Round 1100 */
  nosince: ['3', 'lib/careerEras.ts', swap('  ...CAREER_POOL_SINCE,\n', '')],
  colourgone: ['3', 'lib/clubManager.ts', swap(`'Coventry City': '#66b2e8', `, `'Coventry City': '#66b2e8', 'Macarthur FC': '#123456', `)],
  unlisted: ['2', 'lib/clubManager.ts', swap(`    id: 'proleague', name: 'Belgian Pro League',`, `    id: 'proleague2', name: 'Belgian Pro League',`)],
  ingroup: ['5', 'lib/soccerCareerEngine.ts', swap('return chosen.clubs[Math.floor(Math.random() * chosen.clubs.length)];', 'return chosen.clubs[Math.floor(Math.random() * chosen.weight)];')],
  academypick: ['6', 'lib/soccerCareerEngine.ts', s => {
    const a = s.indexOf('export function getYouthAcademyClub(');
    const b = s.indexOf('export function calcOverall(', a);
    const body = a < 0 || b < 0 ? '' : s.slice(a, b);
    const n = body.split('return pickAcrossLeagues(').length - 1;
    if (n !== 9) { console.error(`control academypick: ${n} pickAcrossLeagues returns in getYouthAcademyClub, 9 expected`); process.exit(2); }
    return s.slice(0, a) + body.replaceAll('return pickAcrossLeagues(', 'return pick(') + s.slice(b);
  }],
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
const FACTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'soccerCareerFacts.json'), 'utf8'));
let derived;
try { derived = deriveCareerClubPool({ ...inputs, since: sinceInput(ROOT) }); }
catch (e) {
  /* the generator refuses a grey colour, an undecided club, a name it would
     take for another league's hand club, and a league Club Manager lacks */
  section = /no colour for/.test(e.message) ? '3' : /has no league/.test(e.message) ? '2' : '1';
  fail(`the derive refused: ${e.message.split('\n')[0]}`);
  finish();
}
const want = renderPoolFile(derived.rows, stubMod.CM_ROSTER_META, derived.ladder, derived.poolSince).split('\n');
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
/* The four leagues Round 1013 read. Sections 5 and 6 were measured on them
   and still price them (FOUR); READ is every label the pool reads now. */
const FOUR_IDS = ['premier', 'championship', 'laliga', 'brasileirao'];
const FOUR = new Set(FOUR_IDS.map(id => LEAGUE_LABELS[id]));
const READ_LABELS = [...new Set(POOL_LEAGUES.map(id => LEAGUE_LABELS[id]))];
const READ = new Set(READ_LABELS);
const idsOf = label => POOL_LEAGUES.filter(id => LEAGUE_LABELS[id] === label);
const cmName = n => NAME_ALIASES[n] ?? inputs.fold(n);

/* ─── 2. MEMBERSHIP ─── */
head('2', 'MEMBERSHIP: each label carries Club Manager\'s lineup in the 2026 view');
/* Round 1037 released the three held labels: no exception is pinned */
/* Round 1100: one walk over every label the generator's table reads (two
   Club Manager ids may share one: MLS). No exception is pinned today; a
   label absent from PINNED has none. */
const PINNED = {};
const pinOf = label => PINNED[label] ?? { extra: [], missing: [] };
const view2026 = eras.adjustClubsForYear(POOL, 2026);
const sizeLine = [];
for (const label of READ_LABELS) {
  const cmNames = idsOf(label).flatMap(id => cm.REAL_LEAGUES.find(l => l.id === id).clubs.map(cmName));
  const expected = new Set([...cmNames.filter(n => !pinOf(label).missing.includes(n)), ...pinOf(label).extra]);
  const actual = new Set(view2026.filter(c => c.league === label).map(c => c.name));
  const extra = [...actual].filter(n => !expected.has(n));
  const missing = [...expected].filter(n => !actual.has(n));
  ok(!extra.length && !missing.length, `${label}: extra [${extra.join(', ')}] missing [${missing.join(', ')}]`);
  /* and the facts file lists the same lineup, name for name */
  const world = FACTS.leagueWorld[label];
  if (ok(!!world, `${label}: no leagueWorld row in soccerCareerFacts.json`)) {
    ok(world.members.length === cmNames.length && cmNames.every(n => world.members.includes(n)), `${label}: the facts file's members are not Club Manager's lineup`);
  }
  sizeLine.push(`${label} ${actual.size}`);
}
console.log(`  ${READ_LABELS.length} labels, each carrying Club Manager's lineup and the facts file's members in the 2026 view: ${sizeLine.join(', ')}`);
/* every current Club Manager league is read or held with its reason, so a
   league Club Manager gains cannot stay out of the pool unnoticed */
const tableIds = new Set(POOL_LEAGUE_ROWS.map(r => r.id));
for (const l of cm.REAL_LEAGUES) ok(tableIds.has(l.id), `Club Manager league ${l.id} has no POOL_LEAGUE_ROWS row: give it one (and a leagueWorld row), or hold it with a reason`);
for (const [id, why] of Object.entries(HELD_LEAGUES)) {
  ok(tableIds.has(id) && typeof why === 'string' && why.length > 10, `held league ${id} needs a table row and a reason`);
  const label = LEAGUE_LABELS[id];
  ok(!GENERATED.some(c => c.league === label), `${label} is held, yet a generated club carries its label`);
  ok(derived.ladder[label] === undefined, `${label} is held, yet it has a ladder`);
}
console.log(`  held, none of their clubs generated: ${Object.keys(HELD_LEAGUES).map(id => LEAGUE_LABELS[id]).join(', ') || 'none'}`);
for (const n of ['West Ham', 'Wolves']) ok(HAND.find(c => c.name === n)?.league === 'Championship', `${n} carries its 2026-27 label "Championship" (Round 1037)`);
ok(HAND.find(c => c.name === 'Girona')?.league === 'Segunda Division', 'Girona carries its 2026-27 label "Segunda Division" (Round 1037)');
ok(GENERATED.length > 0, `the engine appends generated rows (${GENERATED.length})`);
/* A new league is one table row and no other code (the lead's addendum h):
   two made up leagues derived through the same function, one a top flight
   with a hand club in it and one a second flight. */
{
  const rows = [{ id: 'fixA', label: 'Fixture League', country: 'Freedonia', top: true }, { id: 'fixB', label: 'Fixture Second', country: 'Freedonia', top: false }];
  const fx = deriveCareerClubPool({
    realLeagues: [{ id: 'fixA', clubs: ['Hand United', 'Strong Town', 'Weak Town', 'Thin Town'] }, { id: 'fixB', clubs: ['Lower City', 'Lower Rovers'] }],
    xiOf: n => ({ 'Hand United': 75, 'Strong Town': 80, 'Weak Town': 70, 'Thin Town': 60, 'Lower City': 72, 'Lower Rovers': 66 })[n],
    colorOf: () => '#123456', partial: ['Thin Town'], rankable: n => n !== 'Thin Town', fold: s => s,
    handClubs: [{ id: 'h1', name: 'Hand United', country: 'Freedonia', tier: 2, color: '#000000', league: 'Fixture League' }],
    leagueRows: rows, held: {},
  });
  const got = JSON.stringify([fx.rows.map(r => `${r.name}:${r.tier}:${r.league}:${r.country}`), fx.ladder]);
  const wantFx = JSON.stringify([['Strong Town:2:Fixture League:Freedonia', 'Weak Town:2:Fixture League:Freedonia', 'Thin Town:4:Fixture League:Freedonia', 'Lower City:4:Fixture Second:Freedonia', 'Lower Rovers:4:Fixture Second:Freedonia'],
    { 'Fixture League': [['Strong Town'], ['Hand United'], ['Weak Town'], ['Thin Town']], 'Fixture Second': [['Lower City'], ['Lower Rovers']] }]);
  ok(got === wantFx, `a two league fixture derives ${got}, ${wantFx} expected`);
  console.log('  a two league fixture (a top flight with a hand club, a second flight) derives rows and ladders from its table rows alone');
}

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
let colours = 0;
for (const r of [...derived.rows, ...GENERATED]) {
  colours += 1;
  ok(/^#[0-9a-fA-F]{6}$/.test(r.color), `${r.name}: colour ${r.color} is hex`);
  ok(r.color.toLowerCase() !== FALLBACK_GREY, `${r.name}: colour is Club Manager's fallback grey, not a real colour`);
}
console.log(`  ${colours} colours checked (derived and bundled rows), none is the fallback grey`);
/* Round 1100: a colour the generator supplies exists only where Club Manager
   answers grey, and is the rendering of a colour in words the facts file
   holds from two sources. The list may only shrink. */
for (const [cmClub, hex] of Object.entries(POOL_COLORS)) {
  ok(inputs.colorOf(cmClub).toLowerCase() === FALLBACK_GREY, `${cmClub}: Club Manager colours it now (${inputs.colorOf(cmClub)}), so its POOL_COLORS row must go`);
  const fact = FACTS.clubColours.clubs[cmName(cmClub)];
  ok(!!fact && fact.hex === hex && Array.isArray(fact.sources) && fact.sources.length >= 2, `${cmClub}: POOL_COLORS says ${hex}, soccerCareerFacts.json clubColours ${fact ? fact.hex : 'has no row'}`);
}
console.log(`  ${Object.keys(POOL_COLORS).length} colour(s) supplied where Club Manager is grey (${Object.keys(POOL_COLORS).join(', ')}), each in the facts file`);
/* countries: the league's, unless Club Manager's own clubCountry row or the
   generator's CLUB_COUNTRY says otherwise, and each of those is in the
   facts file */
const cmCountry = new Map();
for (const id of POOL_LEAGUES) for (const n of cm.REAL_LEAGUES.find(l => l.id === id).clubs) {
  const own = cm.LEAGUE_RULES?.[id]?.clubCountry?.[n];
  cmCountry.set(cmName(n), own ?? CLUB_COUNTRY[cmName(n)] ?? POOL_LEAGUE_ROWS.find(r => r.id === id).country);
}
let abroad = 0;
for (const c of GENERATED) {
  ok(c.country === cmCountry.get(c.name), `${c.name}: country ${c.country}, ${cmCountry.get(c.name)} expected`);
  if (CLUB_COUNTRY[c.name]) {
    abroad += 1;
    const fact = FACTS.clubCountries.clubs[c.name];
    ok(!!fact && fact.country === c.country && (fact.shipped || (Array.isArray(fact.sources) && fact.sources.length >= 2)), `${c.name}: its country ${c.country} has no two sourced row in soccerCareerFacts.json clubCountries`);
  }
}
for (const n of ['Cardiff City', 'Swansea City', 'Wrexham']) ok(POOL.find(c => c.name === n)?.country === 'Wales', `${n} is Welsh`);
const handCountryOf = new Map(HAND.map(c => [c.league, c.country]));
for (const r of POOL_LEAGUE_ROWS) if (handCountryOf.has(r.label) && r.label !== 'MLS') ok(HAND.some(c => c.league === r.label && c.country === r.country), `${r.label}: the table says ${r.country}, no hand club of that league is from there`);
console.log(`  ${GENERATED.length} generated countries checked, ${abroad} of them not their league's (${Object.entries(CLUB_COUNTRY).map(([n, c]) => `${n} ${c}`).join(', ')})`);
/* the one label the pool may bring that no hand club carries (Serie B, held today) */
const NEW_LABELS = new Set(['Serie B']);
const handLabels = new Set(HAND.map(c => c.league));
ok(GENERATED.every(c => handLabels.has(c.league) || NEW_LABELS.has(c.league)), 'every generated league label already exists among the hand labels (or is Serie B)');
/* Round 1100 (critic 1): since when the game offers each generated club.
   Every generated club has one decision in the facts file's clubSince, and
   adjustClubsForYear obeys it in every season a career can reach: a shipped
   club (Round 1013's 51) is in every list, a held one in none before the
   facts file's heldBefore, one with a first season from that season on.
   A typed CLUB_FOUNDED_AFTER row wins over the generated one: these four
   name a generated club (careerEras.ts). */
const TYPED_SINCE = { 'Red Bull Bragantino': 2020, 'New York City FC': 2015, 'Austin FC': 2021, 'Charlotte FC': 2022 };
const SINCE = sinceInput(ROOT);
const views = new Map();
for (let y = 1980; y <= 2060; y++) views.set(y, new Set(eras.adjustClubsForYear(POOL, y).map(c => c.name)));
const sinceTally = { shipped: 0, held: 0, year: 0, typed: 0 };
for (const c of GENERATED) {
  const kinds = [SINCE.shipped.has(c.name), SINCE.held.has(c.name), SINCE.years.has(c.name)].filter(Boolean).length;
  if (!ok(kinds === 1, `${c.name}: ${kinds} clubSince decisions in soccerCareerFacts.json, exactly one wanted`)) continue;
  const fromFacts = SINCE.shipped.has(c.name) ? 1980 : SINCE.held.has(c.name) ? SINCE.heldBefore : Math.max(1980, SINCE.years.get(c.name));
  const from = TYPED_SINCE[c.name] ?? fromFacts;
  if (TYPED_SINCE[c.name]) sinceTally.typed += 1;
  else sinceTally[SINCE.shipped.has(c.name) ? 'shipped' : SINCE.held.has(c.name) ? 'held' : 'year'] += 1;
  let bad = null;
  for (let y = 1980; y <= 2060 && bad === null; y++) if (views.get(y).has(c.name) !== (y >= from)) bad = y;
  ok(bad === null, `${c.name}: ${bad !== null && views.get(bad).has(c.name) ? 'present' : 'absent'} in ${bad}, the game offers it from ${from}`);
}
ok(sinceTally.held > 0 && sinceTally.shipped > 0, `the since rule saw ${sinceTally.shipped} shipped and ${sinceTally.held} held clubs`);
console.log(`  since: ${sinceTally.shipped} shipped clubs in every list 1980 to 2060, ${sinceTally.held} held out of every list before ${SINCE.heldBefore}, ${sinceTally.year} from a two sourced first season, ${sinceTally.typed} under a typed row (${Object.entries(TYPED_SINCE).map(([n, y]) => `${n} ${y}`).join(', ')})`);

/* ─── 4. TIERS ─── */
head('4', 'TIERS: the rule worked again, hand rows frozen, Forest across eras');
const partialSet = new Set(stubMod.CM_PARTIAL);
const handBy = new Map(HAND.map(c => [c.name, c]));
const tableLines = [];
let aboveFour = 0;
for (const label of READ_LABELS) {
  /* Round 1100: the rule runs once over a label (both MLS rows together) */
  const top = POOL_LEAGUE_ROWS.find(r => r.label === label).top;
  const members = idsOf(label).flatMap(id => cm.REAL_LEAGUES.find(l => l.id === id).clubs).map(n => ({ cm: n, name: cmName(n), xi: inputs.xiOf(n) }));
  const hands = members.filter(m => handBy.has(m.name)).map(m => ({ ...m, tier: handBy.get(m.name).tier }));
  const cells = [];
  for (const m of members) {
    const row = POOL.find(c => c.name === m.name);
    if (!ok(row, `${m.name} is in the pool`)) continue;
    cells.push(`${m.name} ${m.xi}/t${row.tier}${handBy.has(m.name) ? '*' : ''}`);
    if (handBy.has(m.name)) continue;
    for (const h of hands) if (h.xi > m.xi) ok(row.tier >= h.tier, `${m.name} (XI ${m.xi}, t${row.tier}) sits above ${h.name} (XI ${h.xi}, t${h.tier})`);
    let expect;
    if (!top || partialSet.has(m.cm)) expect = 4;
    else {
      const stronger = hands.filter(h => h.xi >= m.xi);
      expect = stronger.length ? Math.max(...stronger.map(h => h.tier)) : (hands.length ? Math.min(...hands.map(h => h.tier)) : 4);
    }
    ok(row.tier === expect, `${m.name}: tier ${row.tier}, the rule says ${expect}`);
    if (row.tier < 4) aboveFour += 1;
  }
  /* the ladder is the same clubs, each once, tier ascending */
  const flat = (derived.ladder[label] ?? []).flat();
  ok(flat.length === members.length && members.every(m => flat.includes(m.name)), `${label}: its ladder is not its lineup`);
  const tiersInOrder = flat.map(n => POOL.find(c => c.name === n)?.tier);
  ok(tiersInOrder.every((t, i) => i === 0 || t >= tiersInOrder[i - 1]), `${label}: its ladder is not in tier order`);
  tableLines.push(`  ${label} (* hand row): ${cells.join(', ')}`);
}
if (process.env.POOL_TABLE === '1') for (const l of tableLines) console.log(l);
else console.log(`  ${tableLines.length} leagues re-derived club by club, ${aboveFour} generated clubs above tier 4 (POOL_TABLE=1 prints every club with its XI and tier)`);
const margin = Math.round((inputs.xiOf('Nottingham Forest') - inputs.xiOf('Aston Villa')) * 10) / 10;
console.log(`  Forest XI ${inputs.xiOf('Nottingham Forest')} vs Aston Villa (t3) ${inputs.xiOf('Aston Villa')}: margin ${margin}. At or below 0 Forest drops to tier 3 on the next regenerate.`);
/* HAND_CLUBS as origin/main shipped it before this round (cbc4e03a's
   FALLBACK_CLUBS, all six fields). Saves and the academy lookups read these
   rows by name, so they are never renamed, removed, reordered or retiered. */
/* Round 1037: e12e673153af2568 after releasing the seven held labels (West Ham,
   Wolves, Girona, Hertha Berlin, Nantes, River Plate Asuncion, Persija
   Jakarta); with those seven labels put back the rows print 52c917c0fb1034e0,
   the fingerprint before it, so nothing else in the hand rows moved */
const HAND_FINGERPRINT = 'e12e673153af2568';
const handPrint = createHash('sha256').update(JSON.stringify(HAND.map(c => [c.id, c.name, c.country, c.tier, c.color, c.league]))).digest('hex').slice(0, 16);
ok(HAND.length === 190, `HAND_CLUBS has ${HAND.length} rows, 190 expected`);
ok(handPrint === HAND_FINGERPRINT, `HAND_CLUBS fingerprint ${handPrint}, frozen ${HAND_FINGERPRINT}`);
ok(POOL.slice(0, HAND.length).every((c, i) => c === HAND[i]), 'FALLBACK_CLUBS starts with HAND_CLUBS in order, so every hand index survives');
const forestTier = y => eras.adjustClubsForYear(POOL, y).find(c => c.name === 'Nottingham Forest')?.tier;
const forestBase = GENERATED.find(c => c.name === 'Nottingham Forest')?.tier;
/* Every season a career can reach, against the seasons Forest really spent
   outside the top flight (start years; rsssf's tables and Wikipedia's list
   of the club's seasons): 1993-94 and 1997-98 in Division One, then 1999-00
   to 2021-22 in the second and third tiers. Every other season from 1988-89
   on was top flight. */
const FOREST_OUT = new Set([1993, 1997, ...Array.from({ length: 23 }, (_, i) => 1999 + i)]);
let forestBad = 0;
for (let y = 1988; y <= 2060; y++) {
  const want = FOREST_OUT.has(y) ? 4 : forestBase;
  if (forestTier(y) !== want) { forestBad += 1; fail(`Forest in ${y}-${String((y + 1) % 100).padStart(2, '0')}: tier ${forestTier(y)}, ${want} expected (${FOREST_OUT.has(y) ? 'outside the top flight' : 'top flight, the generated tier'})`); }
}
console.log(`  HAND_CLUBS ${HAND.length} rows, fingerprint ${handPrint}; Forest t${forestBase}, t4 in 1993, 1997 and 1999 to 2021, checked every season 1988 to 2060${forestBad ? ` (${forestBad} wrong)` : ''}`);

/* ─── 5. WEIGHTS ─── */
head('5', 'WEIGHTS: exact odds from leagueDrawGroups, as rationals');
const CAP = 5; // the harness's own copy of the rule, so a changed engine cap cannot move the yardstick
const fourOdds = cands => {
  const groups = new Map();
  for (const c of cands) { const k = `${c.league}|${c.tier}`; groups.set(k, (groups.get(k) || 0) + 1); }
  let w = 0; let four = 0; let bites = false;
  for (const [k, n] of groups) { const wt = Math.min(n, CAP); w += wt; if (n > CAP) bites = true; if (FOUR.has(k.split('|')[0])) four += wt; }
  return { four, w, bites };
};
/* gridOdds runs a sampler that must make exactly two Math.random calls (a
   league group, then a club inside it) over an exact grid instead of
   sampling: the first call over W * M midpoints, and for each of them the
   second call over n * M2 midpoints, n being the size of the group that
   first value chose. Under the capped rule every club of group g is then
   drawn exactly min(n_g, CAP) * M * M2 times, which is P = weight/W * 1/n.
   A sampler that skips the second call, draws a club off the wrong count or
   returns a club outside the list misses those counts. */
function gridOdds(sampler, cands, M = 2, M2 = 2) {
  const groups = new Map();
  for (const c of cands) { const k = `${c.league}|${c.tier}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); }
  const W = [...groups.values()].reduce((s, g) => s + Math.min(g.length, CAP), 0);
  const K = W * M;
  const hits = new Map();
  let draws = 0; let badCalls = 0; let strays = 0;
  const realRandom = Math.random;
  try {
    for (let k = 0; k < K; k++) {
      const u = (k + 0.5) / K;
      let calls = 0;
      Math.random = () => (calls++ === 0 ? u : 0.5);
      const probe = sampler();
      const g = probe && groups.get(`${probe.league}|${probe.tier}`);
      if (!g) { strays += 1; continue; }
      const L = g.length * M2;
      for (let j = 0; j < L; j++) {
        calls = 0;
        Math.random = () => (calls++ === 0 ? u : (j + 0.5) / L);
        const p = sampler();
        draws += 1;
        if (calls !== 2) badCalls += 1;
        hits.set(p, (hits.get(p) || 0) + 1);
      }
    }
  } finally { Math.random = realRandom; }
  const off = [];
  for (const [key, g] of groups) {
    const want = Math.min(g.length, CAP) * M * M2;
    for (const c of g) if ((hits.get(c) || 0) !== want) off.push(`${c.name} (${key}) ${hits.get(c) || 0}/${want}`);
  }
  for (const c of hits.keys()) if (!cands.includes(c)) off.push(`${c ? c.name : 'nothing'} drawn, not a candidate`);
  return { off, draws, badCalls, strays, K, W, groups: groups.size };
}
const gridOk = (res, what) => ok(!res.off.length && !res.badCalls && !res.strays,
  `${what}: ${res.off.length} clubs off their exact count (${res.off.slice(0, 4).join(', ')}), ${res.badCalls} draws without exactly two Math.random calls, ${res.strays} first values that drew no candidate`);
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
  const gr = gridOdds(() => engine.pickAcrossLeagues(cands), cands);
  gridOk(gr, `pickAcrossLeagues over HAND_CLUBS tiers ${tiers}`);
  if (!off.length) console.log(`  HAND_CLUBS tier ${tiers.join('+')}: ${n} clubs, ${groups.length} league groups (largest ${Math.max(...groups.map(g => g.clubs.length))}), every club exactly 1/${n}; the sampler matched it on a ${gr.draws} draw grid`);
}
/* The raw list is not what a career draws from: adjustClubsForYear moves
   clubs between tiers by season, and that can push a hand group past CAP.
   Every season from 1980 to 2060 is checked. The only group that goes over
   is Premier League tier 3, which holds 6 hand clubs in every season to
   1996, in 2007 to 2009 and in 2017, and 7 in 2018 to 2021 (Brighton and
   Wolves come up through their era rules). In those seasons each of those
   clubs keeps 5/6 or 5/7 of its share of the draws for that group, and
   every other club gains a little. Pinned exactly, so a new era rule that
   pushes another group over the cap goes red here and has to be stated. */
/* Round 1037: West Ham and Wolves (tier 3) play 2026-27 in the
   Championship, so the Premier League's tier 3 never holds more than five
   hand clubs and no group is over the cap in any season: every hand club is
   exactly 1/n of its tier's draws. Before it the group was over the cap in
   1980 to 1996 (6), 2007 to 2009 (6), 2017 (6) and 2018 to 2021 (7). */
const HAND_OVER_CAP = {};
const overCap = {};
let yearsNeutral = 0;
for (let y = 1980; y <= 2060; y++) {
  const view = eras.adjustClubsForYear(HAND, y);
  let neutral = true;
  for (const tiers of handSets) {
    const cands = view.filter(c => tiers.includes(c.tier));
    const groups = engine.leagueDrawGroups(cands);
    const W = groups.reduce((s, g) => s + g.weight, 0);
    /* every club is exactly 1/n iff no group is cut by the cap; a cut group
       moves every club's odds, so the cut groups are what gets pinned */
    if (groups.every(g => g.weight * cands.length === W * g.clubs.length)) continue;
    neutral = false;
    const cut = groups.filter(g => g.weight < g.clubs.length);
    ok(cut.length, `${y} tiers ${tiers}: odds off 1/n with no group over the cap`);
    for (const g of cut) (overCap[g.key] ||= {})[y] = g.clubs.length;
  }
  if (neutral) yearsNeutral += 1;
}
const pinKeys = new Set([...Object.keys(HAND_OVER_CAP), ...Object.keys(overCap)]);
for (const key of pinKeys) {
  const got = JSON.stringify(overCap[key] || {});
  const want = JSON.stringify(HAND_OVER_CAP[key] || {});
  ok(got === want, `hand group ${key} off 1/n in seasons ${got}, pinned ${want}: restate the cap's effect on the old pool`);
}
console.log(`  HAND_CLUBS by season 1980 to 2060: ${yearsNeutral} seasons every club exactly 1/n; Premier League tier 3 over the cap in ${Object.keys(overCap['Premier League|3'] || {}).length} seasons, as pinned`);
const t4 = POOL.filter(c => c.tier === 4);
const g4 = engine.leagueDrawGroups(t4);
const W4 = g4.reduce((s, g) => s + g.weight, 0);
const F4 = g4.filter(g => FOUR.has(g.clubs[0].league)).reduce((s, g) => s + g.weight, 0);
const rawFour = t4.filter(c => FOUR.has(c.league)).length;
/* Round 1100, restated exactly (the raw list is the world from 2026-27 on;
   before it the held clubs are in no list, section 3). With 22 labels read
   and the three second flights held: tier 4 draw weight 167 over 76 league
   groups (main: 100 over 70), the labels the pool reads hold 109 of it
   (main: 43 of 100 on the same labels), the four leagues of Round 1013
   still 20. Tier 3 is 69 (main 49), tier 2 is 39 (37), tier 1 is 18 (18).
   So a tier 4 draw from a league the pool does not read falls from 57 in
   100 to 58 in 167 (Ligue 2 counts as one of those until its release). This
   is the round's intent (whole leagues to sign for); LEAGUE_DRAW_CAP is the
   engine's and is reviewed in Round 1106. */
const R4 = g4.filter(g => READ.has(g.clubs[0].league)).reduce((s, g) => s + g.weight, 0);
const tierW = t => engine.leagueDrawGroups(POOL.filter(c => c.tier === t)).reduce((s, g) => s + g.weight, 0);
ok(F4 === 20 && W4 === 167 && R4 === 109 && g4.length === 76, `tier 4: the four leagues hold ${F4}, the read labels ${R4}, of ${W4} over ${g4.length} groups; 20, 109, 167 and 76 expected`);
ok(tierW(1) === 18 && tierW(2) === 39 && tierW(3) === 69, `tier 1 to 3 draw weights ${tierW(1)}, ${tierW(2)}, ${tierW(3)}; 18, 39 and 69 expected`);
/* The sampler itself on the full tier 4, both calls on the grid: every club
   in every group, capped ones included, drawn exactly weight * M * M2 times. */
const gr4 = gridOdds(() => engine.pickAcrossLeagues(t4), t4);
if (gridOk(gr4, 'pickAcrossLeagues over the full tier 4')) console.log(`  pickAcrossLeagues over tier 4: ${gr4.groups} league groups, both Math.random calls on a ${gr4.draws} draw grid, every club drawn exactly weight/${W4} x 1/size`);
console.log(`  full pool tier 4: four leagues ${F4}/${W4} capped; a plain pick would give them ${rawFour}/${t4.length}`);
/* What the cap costs the hand clubs, stated rather than hidden: on the full
   pool a tier 4 hand club outside the four leagues goes from 1/87 of tier 4
   draws to 1/100, and one inside them shares its league's 5 with the new
   clubs (Norwich 1/440 in the Championship's 22, Brentford and Palace 1/160
   in the Premier League's 8, Betis and Celta 1/260, Cruzeiro and Santos
   1/280). Checked exactly against the groups, raw list. */
{
  const handT4 = HAND.filter(c => c.tier === 4).length;
  const share = name => { const g = g4.find(x => x.clubs.some(c => c.name === name)); return g ? `${g.weight}/${W4 * g.clubs.length}` : 'none'; };
  /* Round 1100: the same clubs on the grown pool (main's shares in the
     comment above): Norwich 5/3674 in the Championship's 22, Brentford and
     Palace 5/1336 in the Premier League's 8, Betis and Celta 5/2171 (13),
     Cruzeiro and Santos 5/2338 (14), and a club alone in its league, Enyimba,
     1/167 where it was 1/100. Newly whole leagues: Twente and Utrecht 5/2338
     in the Eredivisie's 14 tier 4 clubs, Hearts 5/1670 in Scotland's 10. */
  const WANT_SHARE = { 'Norwich City': [5, 3674], Brentford: [5, 1336], 'Crystal Palace': [5, 1336], 'Real Betis': [5, 2171], 'Celta Vigo': [5, 2171], Cruzeiro: [5, 2338], Santos: [5, 2338], Enyimba: [1, 167], Twente: [5, 2338], Utrecht: [5, 2338], Hearts: [5, 1670] };
  for (const [name, [a, b]] of Object.entries(WANT_SHARE)) {
    const g = g4.find(x => x.clubs.some(c => c.name === name));
    ok(g && g.weight * b === a * W4 * g.clubs.length, `${name}: tier 4 share ${share(name)}, ${a}/${b} stated`);
  }
  console.log(`  hand tier 4 clubs before: each 1/${handT4}; now 1/${W4} outside the four leagues, Norwich ${share('Norwich City')}, Brentford ${share('Brentford')}, Betis ${share('Real Betis')}, Cruzeiro ${share('Cruzeiro')}`);
}

/* ─── 6. OFFERS ─── */
head('6', `OFFERS: ${SEEDS} seeds x ${CAREERS} careers from 2020 through the real loop`);
const stats = ovr => ({ pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr });
const NATS = ['England', 'Spain', 'Brazil', 'Wales', 'Japan', 'Nigeria', 'USA', 'Argentina'];
const POSITIONS = ['ST', 'CM', 'CB', 'GK'];
/* One engine step: scripts/lib/careerStep.mjs (lifted out of this section by
   Round 1100 so simCareerLeagueWorld plays the same careers). */
const step = (s, clubs) => careerStep(engine, s, clubs);
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
/* The home list getYouthAcademyClub tries first at each band; empty means
   the academy comes from a worldwide fallback, which must be a
   pickAcrossLeagues draw. 75 and up tries home tier 1 and then the elite
   list with a plain pick, so it never counts as a fallback here. */
function homeOf(pool, nat, ovr) {
  const home = pool.filter(c => c.country === nat);
  if (ovr >= 75) return [null];
  if (ovr >= 66) return home.filter(c => c.tier === 1 || c.tier === 2);
  if (ovr >= 55) return home.filter(c => c.tier === 2 || c.tier === 3);
  if (ovr >= 40) return home.filter(c => c.tier >= 3);
  return home.filter(c => c.tier === 4);
}
function playSeed(seed, startYear, careers, era) {
  seedRandom(seed);
  const r = { draws: 0, measured: 0, expected: 0, variance: 0, bDraws: 0, bMeasured: 0, bExpected: 0, bVariance: 0, offers: 0, uncovered: [], byLeague: new Map(), marketFour: 0, marketAll: 0, rivals: [], academyFallbacks: 0, uncoveredAcademy: [] };
  const startView = eras.adjustClubsForYear(POOL, startYear);
  let stepPicks = new Set();
  globalThis.__poolDrawLog = (cands, p) => {
    const { four, w, bites } = fourOdds(cands);
    const q = four / w;
    const won = FOUR.has(p.league) ? 1 : 0;
    r.draws += 1; r.expected += q; r.variance += q * (1 - q); r.measured += won;
    /* the draws where the cap changes the odds (some league group over CAP):
       the only draws that can tell a capped draw from a plain one */
    if (bites) { r.bDraws += 1; r.bExpected += q; r.bVariance += q * (1 - q); r.bMeasured += won; }
    stepPicks.add(p);
  };
  const seen = new WeakSet();
  for (let c = 0; c < careers; c++) {
    const ovr = 45 + (c % 28);
    const nat = NATS[c % NATS.length];
    stepPicks = new Set();
    let s = engine.initCareer(`Pool ${seed} ${c}`, nat, POSITIONS[c % POSITIONS.length], era, stats(ovr), ovr, startYear, POOL, null);
    if (!homeOf(startView, nat, ovr).length) {
      r.academyFallbacks += 1;
      if (![...stepPicks].some(p => p.name === s.academyClubName)) r.uncoveredAcademy.push(`${nat} ${ovr}: ${s.academyClubName}`);
    }
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
   nopool control gives 0.
   Re-measured 2026-10-07 by Round 1041 over the same 12 seeds: on release-
   ai-int (the round taken out in memory) Brasileirao's minimum is 3 (two
   seeds; 3 to 10), and on the round's tree 1 (seed 89607, whose careers the
   round moves: a season with no cup is never won, and the world crowns cup
   winners by association; 1 to 10, mean 5.75 against 6.17). The other three
   leagues: Premier League 3, Championship 5, La Liga 4 on the round's tree.
   The recipe above on either tree gives Brasileirao a floor of 1, so 2 was
   already a coin toss for any change that moves a career.
   Round 1041 review: a floor at the measured minimum has no margin either
   (a seed giving 0 turns red with nothing wrong), so the statistic changed
   rather than the floor: the gate is the MEAN over the run's seeds, not
   each seed. Measured on the round's tree (f61ec5bd) over 48 seeds, the
   eight six seed windows' means: Premier League 4.00 to 5.17 (one seed
   alone 1 to 7), Championship 8.00 to 9.17 (5 to 12), La Liga 5.33 to 6.83
   (3 to 9), Brasileirao 4.67 to 7.00 (1 to 10); a six seed mean's sd is
   about 0.9. Each floor is half the smallest window mean, rounded down to a
   half; nopool gives 0.00 in all four (measured, section 6 red beside its
   own section 2). The floors hold for the default 6 seeds or more. */
const F_MEAN_DISTINCT = { 'Premier League': 2, Championship: 4, 'La Liga': 2.5, Brasileirao: 2 };
/* Gated only on the draws where the cap changes the odds (a league group
   over CAP in the candidate list): over all draws the uncapped control
   moved the ratio to just 1.07 to 1.14, inside the healthy spread, because
   most draws never reach the cap. On the capped draws, over the same 12
   seeds: 233 to 284 draws a seed, about 50 four league wins expected, ratio
   0.822 to 1.172 (z -1.41 to 1.41, one seed's sd about 0.13), while the
   uncapped control gave 1.456 to 1.886 over 6 seeds. One seed is too small
   to separate the two cleanly, so the gate is the ratio over all the run's
   seeds: 0.970 over the first 6 healthy seeds and 0.959 over all 12 (sd of a
   6 seed ratio about 0.053), against 1.68 for the uncapped control. The band
   0.25 is about 4.7 sd of the 6 seed ratio and sits well clear of both. The
   draw floor is half the fewest capped draws a seed showed. */
const D_RATIO = 0.25;
const B_MIN_DRAWS = 115;
const SEED_LIST = Array.from({ length: SEEDS }, (_, i) => 0x1013a + i * 7919);
const results = [];
const t0 = Date.now();
for (const seed of SEED_LIST) {
  const r = playSeed(seed, 2020, CAREERS, '2020s');
  results.push(r);
  const ratio = r.bMeasured / r.bExpected;
  const z = (r.bMeasured - r.bExpected) / Math.sqrt(r.bVariance || 1);
  const leagues = [...FOUR].map(l => `${l} ${r.byLeague.get(l)?.size ?? 0}`).join(', ');
  console.log(`  seed ${seed}: ${r.draws} draws (four leagues ${r.measured} vs ${r.expected.toFixed(1)}), ${r.bDraws} where the cap bites (four leagues ${r.bMeasured} vs ${r.bExpected.toFixed(1)}, ratio ${ratio.toFixed(3)}, z ${z.toFixed(2)}); ${r.offers} offers; distinct generated clubs offered: ${leagues}; uncovered ${r.uncovered.length}`);
  ok(r.bDraws >= B_MIN_DRAWS, `seed ${seed}: only ${r.bDraws} draws where the cap bites, the comparison needs at least ${B_MIN_DRAWS}`);
  ok(!r.uncovered.length, `seed ${seed}: market offers that no pickAcrossLeagues call produced: ${r.uncovered.slice(0, 5).join(', ')}`);
  ok(r.academyFallbacks > 0, `seed ${seed}: no career reached a worldwide academy fallback, the coverage check below saw nothing`);
  ok(!r.uncoveredAcademy.length, `seed ${seed}: worldwide academy fallbacks that no pickAcrossLeagues call produced: ${r.uncoveredAcademy.slice(0, 5).join(', ')}`);
  console.log(`    ${r.academyFallbacks} careers started at a worldwide academy fallback, uncovered ${r.uncoveredAcademy.length}`);
}
const ratios = results.map(r => r.bMeasured / r.bExpected);
const agg = results.reduce((a, r) => ({ m: a.m + r.bMeasured, e: a.e + r.bExpected, v: a.v + r.bVariance }), { m: 0, e: 0, v: 0 });
const aggRatio = agg.m / agg.e;
console.log(`  over all ${SEED_LIST.length} seeds, where the cap bites: four leagues won ${agg.m} against ${agg.e.toFixed(1)} expected (ratio ${aggRatio.toFixed(3)}, z ${((agg.m - agg.e) / Math.sqrt(agg.v || 1)).toFixed(2)})`);
ok(Math.abs(aggRatio - 1) <= D_RATIO, `where the cap bites the four leagues won ${agg.m} draws against ${agg.e.toFixed(1)} on the draws' own odds (ratio ${aggRatio.toFixed(3)}, band 1 +/- ${D_RATIO}): the market is not drawing on the capped weights`);
for (const l of FOUR) {
  const mean = results.reduce((a, r) => a + (r.byLeague.get(l)?.size ?? 0), 0) / results.length;
  console.log(`  ${l}: ${mean.toFixed(2)} distinct generated clubs offered per seed over ${results.length} seeds (floor ${F_MEAN_DISTINCT[l]})`);
  ok(mean >= F_MEAN_DISTINCT[l], `${l} offered ${mean.toFixed(2)} distinct generated clubs per seed over ${results.length} seeds, at least ${F_MEAN_DISTINCT[l]} expected`);
}
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

/* 6e. The worldwide academy fallbacks, site by site. A youth with no home
   club in his band (most of the page's 134 nationalities at most ratings)
   gets an academy drawn from the whole world through pickAcrossLeagues.
   Each reachable site is driven over the exact grid with a nationality that
   has no home club there: Nigeria (one tier 4 club) at 70 and 60,
   Montenegro (no club) at 47 and 30, plus two pools built to reach the last
   fallbacks: no elite club at 80, no tier 4 club at 30. The other three
   sites in getYouthAcademyClub only run on an empty list and draw nothing. */
{
  const ELITE = ['Bayern Munich', 'PSG', 'Man City', 'Real Madrid', 'Barcelona', 'Liverpool'];
  const p2020 = eras.adjustClubsForYear(POOL, 2020);
  const noElite = p2020.filter(c => !ELITE.includes(c.name));
  const noT4 = p2020.filter(c => c.tier !== 4);
  const SITES = [
    ['Nigeria', 70, 'the 2020 pool', p2020, c => c.tier === 1 || c.tier === 2],
    ['Nigeria', 60, 'the 2020 pool', p2020, c => c.tier === 2 || c.tier === 3],
    ['Montenegro', 47, 'the 2020 pool', p2020, c => c.tier >= 3],
    ['Montenegro', 30, 'the 2020 pool', p2020, c => c.tier === 4],
    ['Montenegro', 80, 'a pool with no elite club', noElite, c => c.tier === 1],
    ['Montenegro', 30, 'a pool with no tier 4 club', noT4, c => c.tier === 3],
  ];
  console.log('  worldwide academy fallbacks (exact grid):');
  for (const [nat, ovr, what, pool, pred] of SITES) {
    const home = pool.filter(c => c.country === nat);
    ok(ovr >= 75 ? !home.some(c => c.tier === 1) : !homeOf(pool, nat, ovr).length, `${nat} ${ovr}: has a home club in its band, the site is not reached`);
    const cands = pool.filter(pred);
    const res = gridOdds(() => engine.getYouthAcademyClub(pool, nat, ovr), cands);
    gridOk(res, `academy fallback ${nat} ${ovr} on ${what}`);
    const { four, w } = fourOdds(cands);
    console.log(`    ${nat} ${ovr} on ${what}: ${cands.length} candidates, ${res.draws} grid draws; four leagues ${four}/${w} capped, ${cands.filter(c => FOUR.has(c.league)).length}/${cands.length} by a plain pick`);
  }
}

/* ─── 7. OLD SAVES ─── */
head('7', 'OLD SAVES: careers signed on the pre-round pool load and play on');
/* Each save is built directly, not hoped for: a career started on the
   pre-round pool (HAND_CLUBS, identical to origin/main's list), signed with
   that club's own row, written to JSON, read back through the page's guard
   and repairCareer, then played three seasons on the new pool. It never
   moves on its own: windows are declined and a renewal is taken from the
   same club. A dilemma that moves the player ends the identity check.
   Under option (a) the pre-round rows and the shipped rows are the same, so
   this section cannot tell old from new rows by itself; what it guards is
   that nothing re-reads a running save's league or tier from the list
   (the reread control is that regression). The cross engine proof (saves
   written by origin/main's engine, loaded by this one) was run once by hand
   in review, not here. */
const OLD = ['West Ham', 'Wolves', 'Girona', 'Norwich City', 'Flamengo', 'Real Madrid'];
seedRandom(0x7007);
for (const name of OLD) {
  const row = HAND.find(c => c.name === name);
  if (!row) { section = '7s'; fail(`${name} has a hand row to sign with`); section = '7'; continue; }
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
