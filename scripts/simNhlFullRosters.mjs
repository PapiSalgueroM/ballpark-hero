/**
 * Round 830: NHL Front Office on full real rosters.
 *
 * What this fences, section by section:
 *   1. The record and the bake. scripts/data/nhlRosters2026.json carries all 32
 *      published rosters and the 2025-26 lines; a fresh bake of it is byte for byte
 *      the committed src/data/nhlFoRosters2026.ts and the left out file; the ESPN
 *      spot check exists, was made the same day, checked exactly the men the fixed
 *      rule names, and stayed inside the bar (at most 2 mismatches in 50).
 *   2. Every man traces. Each club carries min(published, 23) men; every row is a
 *      record row of that club with the same name, position, age on the day read
 *      and the rule's rating; stand in ratings are exactly NHL_FO_PARTIAL; every
 *      published man is either in the game or in the left out file; nobody twice.
 *   3. The rule is the lost bake's rule. Over the Aug 5 2026 file (13 a club), every
 *      row with exactly one 2025-26 line of that name and group gets the same
 *      rating from the rule. Measured 2026-10-01: 414 of 416 rows match, 0 differ,
 *      2 have no line of that name (Jake Middleton, a 76, and Jaxson Stauber, a 68).
 *   4. A new league. initNhlFullLeague deals exactly the seeds, marks the stand ins,
 *      invents nobody on a roster, every club ices 12 forwards, 6 defensemen and 2
 *      goalies, and every payroll opens under the cap (measured: dearest 102.3M of
 *      104M, Tampa Bay; the old pay line put 15 clubs over).
 *   5. The limits. A full league is 20 to 23: Sign refuses at 23 with unlimited
 *      room, Waive refuses at 20; an older save keeps 8 to 15.
 *   6. Ten seeded franchises, five seasons each, the board's own loop (20 rounds
 *      with AI moves, the playoffs, two draft picks with the AI taking five after
 *      each, the offseason): no throw, no shared id, every club still ices 12, 6
 *      and 2 after every offseason, no invented man shares a name with anyone,
 *      the AI never signs past 23.
 *   7. An old save. A 13 man league from before this round, saved and loaded,
 *      plays a season, an offseason and a second season to the exact fingerprint
 *      the pre-830 engine produced (frozen below, taken 2026-10-01 from
 *      origin/main d02828c3 with NHL_FULL_PRINT_LEGACY), and never gains rosterDepth.
 *   8. What moved, and why. Adding the depth men changes no club's strength at the
 *      drop of the puck: a league dealt only each club's top 7 forwards, 4 D and 2
 *      goalies (the Aug 5 bake's cut) rates all 32 clubs identically. Season
 *      results under one seed DO move, for two reasons the section measures: the
 *      injury pass draws once per healthy man each round, so ten more men a club
 *      shift every later draw; and when a top six forward, top four D or the
 *      starter is hurt, a real depth man steps in instead of the group averaging
 *      fewer men. Over 160 seeded seasons each, the mean points by club with and
 *      without the depth men agree closely (bands below, from measured headroom).
 *   9. The cut down before puck drop (Round 830 review). The draft hands every
 *      club its picks before the summer, so a full roster league could open a
 *      season above 23 (before the fix: your club in 37 of 50 seasons, CPU clubs
 *      in 113 of 1550, the largest 27). Now nhlPuckDropRefusal greys Play above
 *      23 on a full league and never on an older save; nhlCutDownToLimit cuts a
 *      CPU club's lowest rated man from a group above its 12/6/2 floor, older
 *      first on a tie, through the shared cut; the summer cuts every CPU club and
 *      never the GM's own; and over sixteen franchise seasons no CPU club opens a
 *      season above 23 while the GM is refused exactly when he is above it and
 *      can always waive down.
 *  10. What the page says is what the data is (Round 830 review). Real names sit
 *      beside made up salaries, so the Roster box and the pick card say the money
 *      is the game's own; the guide states the camp rule (who of a camp roster is
 *      kept) and the stand in rule in the rules lib's own numbers; and no copy
 *      claims every player is rated off real stats, because 97 are stand ins.
 *      Read from the code with comments stripped.
 *
 * Controls (NHL_FULL_CONTROL=<name>), each served from memory, nothing on disk
 * changes; a control passes only when exactly its sections go red:
 *   invent    an invented forward added to one club's seeds         -> 2, 4, 9
 *             (9 too: the extra man opens Anaheim at 24, above the limit)
 *   age       one real man a year older than his birth date          -> 2
 *   spot      the spot check carrying three mismatches               -> 1
 *   thirteen  the engine dealt each club's top 13 only               -> 4, 5, 8, 9
 *   paycurve  a full league paid on the old 13 man line              -> 4
 *   partial   the stand in mark dropped at the deal                  -> 4
 *   ceiling   the full league's ceiling raised to 30                 -> 4, 5, 6
 *   refill    the offseason's full roster refill removed             -> 6
 *   legacy    the full roster refill run on every league, old saves too -> 7
 *   allmen    the strength read averaging every healthy forward      -> 7, 8
 *   dupname   every offseason fill named after a real man            -> 6
 *   notrim    the summer's CPU cut down removed                      -> 9
 *   nodrop    the puck drop refusal never fires                      -> 9
 *   trimfloor the CPU cut down ignores the position floors           -> 9
 *   trimall   the summer cuts the GM's own club too                  -> 9
 *   droplegacy the puck drop refusal fires on an older save too      -> 9
 *   flatfloor the CPU cut held at a flat 20 (a lopsided club opens at 24) -> 9
 *   overclaim the page says every player is rated off real stats     -> 10
 *   nosalary  the Roster box loses its made up salaries line         -> 10
 *   camprule  the guide's camp rule says eleven forwards             -> 10
 *
 * Measured headroom (2026-10-01, this record):
 *   section 6: after every offseason 0 clubs short of 12/6/2 and 0 of 1600 club
 *   seasons over the cap. The draft still carries your club past 23 in most
 *   summers (printed); the GM's loop here waives down before Play, as the board
 *   makes him, and no CPU club opens a season above 23 (section 9 asserts it).
 *   section 8: see the band constants; their measured values are printed each run.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ACTIVE_LIMIT, ageOn, buildRatings, chooseTwentyThree, gamePos, groupOf, nameKey, spotCheckClubs, spotCheckMen } from './lib/nhlFoRosterRules.mjs';
import { bake, RECORD, DATA, LEFT_OUT } from './genNhlFrontOfficeRoster.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(import.meta.url);
const CONTROL = process.env.NHL_FULL_CONTROL || '';
const PRINT_LEGACY = process.env.NHL_FULL_PRINT_LEGACY || '';

const EXPECT = {
  invent: [2, 4, 9], age: [2], spot: [1], thirteen: [4, 5, 8, 9], paycurve: [4], partial: [4],
  ceiling: [4, 5, 6, 9], refill: [6], legacy: [7], allmen: [7, 8], dupname: [6],
  notrim: [9], nodrop: [9], trimfloor: [9], trimall: [9], droplegacy: [9], flatfloor: [9],
  overclaim: [10], nosalary: [10], camprule: [10],
};
if (CONTROL && !EXPECT[CONTROL]) { console.error(`NHL_FULL_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(EXPECT).join(', ')})`); process.exit(1); }

const SECTION_NAMES = {
  1: 'the record and the bake', 2: 'every man traces to the record', 3: 'the rule is the lost bake\'s rule',
  4: 'a new league', 5: 'the roster limits', 6: 'ten franchises, five seasons each', 7: 'an old save plays as it did',
  8: 'what moved, and why', 9: 'the cut down before puck drop', 10: 'what the page says is what the data is',
};
const bySection = new Map();
const fails = [];
let checks = 0;
function ok(section, label, pass, detail = '') {
  checks += 1;
  const s = bySection.get(section) ?? { n: 0, bad: 0 };
  s.n += 1;
  if (!pass) { s.bad += 1; fails.push(`[${section}] ${label}${detail ? `: ${detail}` : ''}`); }
  bySection.set(section, s);
}
const eol = s => s.replace(/\r\n/g, '\n');
const mulberry = seed => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/* ---------- the source mutations a control makes, asserted to bind ---------- */
const ENGINE_FILE = path.join(ROOT, 'src/lib/nhlFrontOffice.ts');
const DATA_FILE = DATA;
function swap(label, src, edits) {
  let out = src;
  for (const [from, to] of edits) {
    if (out.split(from).length !== 2) throw new Error(`control ${CONTROL}: ${JSON.stringify(from.slice(0, 80))} is not in ${label} exactly once, so it would change nothing. Refusing to run.`);
    out = out.replace(from, to);
  }
  if (out === src) throw new Error(`control ${CONTROL}: the rewrite of ${label} changed nothing. Refusing to run.`);
  return out;
}
const ENGINE_EDITS = {
  thirteen: [['const league = seedNhlLeague(NHL_FO_FULL_ROSTERS, rng,', 'const league = seedNhlLeague(Object.fromEntries(Object.entries(NHL_FO_FULL_ROSTERS).map(([k, v]) => [k, [...v.filter(s => s.pos === \'C\' || s.pos === \'W\').slice(0, 7), ...v.filter(s => s.pos === \'D\').slice(0, 4), ...v.filter(s => s.pos === \'G\').slice(0, 2)]])), rng,']],
  paycurve: [['seedNhlLeague(NHL_FO_FULL_ROSTERS, rng, nhlDepthSalaryFor,', 'seedNhlLeague(NHL_FO_FULL_ROSTERS, rng, nhlSalaryFor,']],
  partial: [["if (partial?.has(`${abbr}:${s.pos}:${s.name}`)) p.partial = true;", 'void partial;']],
  ceiling: [['export const NHL_FULL_ROSTER_MAX = 23;', 'export const NHL_FULL_ROSTER_MAX = 30;']],
  refill: [['if (league.rosterDepth) replenishNhlRoster(t, rng, taken, NHL_FULL_FLOORS, nhlDepthSalaryFor);', 'void NHL_FULL_FLOORS;']],
  legacy: [['if (league.rosterDepth) replenishNhlRoster(t, rng, taken, NHL_FULL_FLOORS, nhlDepthSalaryFor);', 'if (true) replenishNhlRoster(t, rng, taken, NHL_FULL_FLOORS, nhlDepthSalaryFor);']],
  dupname: [['name: nhlGenName(rng, taken), pos,\n', "name: 'Elias Pettersson', pos,\n"]],
  allmen: [["healthy.filter(p => p.pos === 'C' || p.pos === 'W').sort((a, b) => b.ovr - a.ovr).slice(0, 6);", "healthy.filter(p => p.pos === 'C' || p.pos === 'W').sort((a, b) => b.ovr - a.ovr);"]],
  notrim: [['if (league.rosterDepth && t.abbr !== myTeam) nhlCutDownToLimit(t, league.freeAgents);', 'void nhlCutDownToLimit;']],
  nodrop: [['if (t.players.length > NHL_FULL_ROSTER_MAX) {\n    return `${t.players.length} on the roster.', 'if (false) {\n    return `${t.players.length} on the roster.']],
  trimfloor: [['.filter(p => count[nhlGroupOf(p)] > NHL_FULL_FLOORS[nhlGroupOf(p)])\n', '.filter(() => true)\n']],
  trimall: [['if (league.rosterDepth && t.abbr !== myTeam) nhlCutDownToLimit(t, league.freeAgents);', 'if (league.rosterDepth) nhlCutDownToLimit(t, league.freeAgents);']],
  flatfloor: [['cutPlayer(t, freeAgents, victim.id, Math.max(0, NHL_FULL_ROSTER_MIN - short))', 'cutPlayer(t, freeAgents, victim.id, NHL_FULL_ROSTER_MIN)']],
  droplegacy: [['  if (!lg.rosterDepth) return null;\n  if (t.players.length > NHL_FULL_ROSTER_MAX) {', '  if (!lg.rosterDepth) return t.players.length > 15 ? \'refused\' : null;\n  if (t.players.length > NHL_FULL_ROSTER_MAX) {']],
};
const DATA_EDITS = {
  invent: [["export const NHL_FO_FULL_ROSTERS: Record<string, NhlFoSeed[]> = {\n  ANA: [", "export const NHL_FO_FULL_ROSTERS: Record<string, NhlFoSeed[]> = {\n  ANA: [\n    { name: 'Torsten Halonen', pos: 'W', age: 27, ovr: 72 },"]],
  age: [["{ name: 'Leo Carlsson', pos: 'C', age: 21,", "{ name: 'Leo Carlsson', pos: 'C', age: 22,"]],
};

/* ---------- bundle the engine (and, for section 8, a core-only twin) ---------- */
const esbuild = req('esbuild');
const BUNDLE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'nhlFullRosters-'));
async function bundle(name, { engineSource = null, dataTail = '' } = {}) {
  const entry = path.join(BUNDLE_DIR, `${name}.entry.mjs`);
  const fwd = p => JSON.stringify(p.replaceAll('\\', '/'));
  fs.writeFileSync(entry, [
    'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
    `export * as E from ${fwd(ENGINE_FILE)};`,
    `export * as D from ${fwd(DATA_FILE)};`,
    `export * as OLD from ${fwd(path.join(ROOT, 'src/data/nhlFoPlayers.ts'))};`,
    `export { leagueNames } from ${fwd(path.join(ROOT, 'src/lib/foNames.ts'))};`,
  ].join('\n'));
  let engine = eol(fs.readFileSync(ENGINE_FILE, 'utf8'));
  let data = eol(fs.readFileSync(DATA_FILE, 'utf8'));
  if (engineSource) engine = engineSource;
  if (CONTROL && ENGINE_EDITS[CONTROL]) engine = swap('src/lib/nhlFrontOffice.ts', engine, ENGINE_EDITS[CONTROL]);
  if (CONTROL && DATA_EDITS[CONTROL]) data = swap('src/data/nhlFoRosters2026.ts', data, DATA_EDITS[CONTROL]);
  data += dataTail;
  const memory = {
    name: 'nhl-full-memory',
    setup(b) {
      b.onLoad({ filter: /nhlFrontOffice\.ts$/ }, a => (path.resolve(a.path) === path.resolve(ENGINE_FILE) ? { contents: engine, loader: 'ts', resolveDir: path.dirname(ENGINE_FILE) } : null));
      b.onLoad({ filter: /nhlFoRosters2026\.ts$/ }, a => (path.resolve(a.path) === path.resolve(DATA_FILE) ? { contents: data, loader: 'ts', resolveDir: path.dirname(DATA_FILE) } : null));
    },
  };
  const out = path.join(BUNDLE_DIR, `${name}.mjs`);
  await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins: [memory] });
  return import(pathToFileURL(out).href);
}

/* ---------- the board's own loop, shared by sections 6, 7 and 8 ---------- */
function playRounds(E, lg, me, rng, onRound) {
  for (let r = 1; r <= E.NHL_FO_ROUNDS; r += 1) {
    lg.round = r;
    E.simNhlRound(lg, me, rng);
    E.nhlAiMoves(lg, me, rng);
    if (onRound) onRound(lg);
  }
}
function closeSeason(M, lg, me, rng) {
  const { E, leagueNames } = M;
  const post = E.runNhlFoPlayoffs(lg, rng);
  lg.champions.push({ season: lg.season, team: post.champion });
  /* the board's draft: two picks, the best scouted grade each time, the AI taking five after each */
  let cls = E.nhlDraftClass(rng, 24, leagueNames(lg));
  for (let pick = 0; pick < 2; pick += 1) {
    const mine = cls[0];
    lg.teams[me].players.push(E.nhlProspectToPlayer(mine, rng));
    const remaining = cls.filter(p => p.id !== mine.id);
    const aiTakes = remaining.slice(0, 5);
    const order = E.nhlFoStandings(lg).map(t => t.abbr).reverse().filter(a => a !== me);
    aiTakes.forEach((p, i) => lg.teams[order[i % order.length]].players.push(E.nhlProspectToPlayer(p, rng)));
    cls = remaining.filter(p => !aiTakes.includes(p));
  }
  /* the board passes its own club, which the summer leaves to its GM (Round 830 review) */
  return { post, notes: E.nhlOffseason(lg, rng, me) };
}

/* The GM at the start of a season above 23, as the board makes him: the Waive
   button, lowest rated man from a group above twelve forwards, six defensemen
   and two goalies, until Play is live. Returns the number of waivers, or -1
   when a refusal stands and no waiver is possible (a dead end). */
function gmCutDown(E, lg, me) {
  const t = lg.teams[me];
  const { min } = E.nhlRosterLimits(lg);
  const floor = { F: 12, D: 6, G: 2 };
  const grp = p => (p.pos === 'G' ? 'G' : p.pos === 'D' ? 'D' : 'F');
  let n = 0;
  while (E.nhlPuckDropRefusal(lg, t)) {
    const count = { F: 0, D: 0, G: 0 };
    for (const p of t.players) count[grp(p)] += 1;
    const victim = [...t.players].filter(p => count[grp(p)] > floor[grp(p)]).sort((a, b) => a.ovr - b.ovr)[0];
    if (!victim || !E.nhlRelease(t, lg.freeAgents, victim.id, min)) return -1;
    n += 1;
  }
  return n;
}

/* Section 7's campaign, the one NHL_FULL_PRINT_LEGACY prints for a given engine. */
function legacyCampaign(M, seed) {
  const { E } = M;
  const rng = mulberry(seed);
  let lg = E.initNhlLeague(rng);
  const abbrs = Object.keys(lg.teams);
  const me = abbrs[seed % abbrs.length];
  lg = JSON.parse(JSON.stringify(lg));
  const team = lg.teams[me];
  const moves = [];
  const cut = [...team.players].sort((a, b) => a.ovr - b.ovr)[0];
  moves.push(E.nhlRelease(team, lg.freeAgents, cut.id));
  const fa = [...lg.freeAgents].filter(p => p.id !== cut.id).sort((a, b) => a.salary - b.salary)[0];
  moves.push(E.nhlSign(team, lg.freeAgents, fa.id, lg.cap));
  const other = lg.teams[abbrs[(abbrs.indexOf(me) + 5) % abbrs.length]];
  const mine = [...team.players].sort((a, b) => b.ovr - a.ovr)[1];
  const theirs = [...other.players].sort((a, b) => b.ovr - a.ovr)[3];
  moves.push(E.nhlTrade(team, other, mine.id, theirs.id, true, lg.cap));
  playRounds(E, lg, me, rng);
  const first = closeSeason(M, lg, me, rng);
  lg = JSON.parse(JSON.stringify(lg));
  playRounds(E, lg, me, rng);
  const second = E.runNhlFoPlayoffs(lg, rng);
  /* ids are minted as h<random epoch>-<counter>, and the counter's start depends on what ran
     before in this process, so every id is relabelled by first sight in a fixed walk */
  const labels = new Map();
  const label = id => { if (!labels.has(id)) labels.set(id, `p${labels.size}`); return labels.get(id); };
  const MINTED = /^h[0-9a-z]+-\d+$/;
  const walk = v => (Array.isArray(v) ? v.map(walk) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : typeof v === 'string' && MINTED.test(v) ? label(v) : v);
  const norm = walk({ lg, moves, first, second });
  return { digest: createHash('sha256').update(JSON.stringify(norm)).digest('hex').slice(0, 24), depth: 'rosterDepth' in lg };
}
const LEGACY_SEEDS = [11, 830, 2026];

if (PRINT_LEGACY) {
  const M = await bundle('legacy', { engineSource: eol(fs.readFileSync(PRINT_LEGACY, 'utf8')) });
  for (const seed of LEGACY_SEEDS) console.log(`legacy ${seed}: ${legacyCampaign(M, seed).digest}`);
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
  process.exit(0);
}
/* Frozen 2026-10-01 from the pre-830 engine (origin/main d02828c3). */
const LEGACY_DIGESTS = { 11: '273445857cf78c022bc0b09a', 830: '2a6c7b5639b50bee9ff8ccb4', 2026: 'f91e46d67ff12c4cad6df5c1' };

let M, CORE;
try {
  M = await bundle('full');
  /* The core twin: the same engine and data, each club cut to the Aug 5 bake's shape (top 7 F, 4 D, 2 G by rating). */
  CORE = await bundle('core', { dataTail: "\nfor (const k of Object.keys(NHL_FO_FULL_ROSTERS)) { const v = NHL_FO_FULL_ROSTERS[k]; NHL_FO_FULL_ROSTERS[k] = [...v.filter(s => s.pos === 'C' || s.pos === 'W').slice(0, 7), ...v.filter(s => s.pos === 'D').slice(0, 4), ...v.filter(s => s.pos === 'G').slice(0, 2)]; }\n" });
} finally {
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
}
const { E, D, OLD } = M;

/* ---------- 1. the record and the bake ---------- */
console.log('1) The record and the bake');
let rec = JSON.parse(fs.readFileSync(RECORD, 'utf8'));
if (CONTROL === 'spot') {
  rec = structuredClone(rec);
  let n = 0;
  for (const c of rec.espnSpotCheck.clubs) for (const r of c.rows) if (n < 3) { r.match = false; r.problems = ['control: marked as a mismatch']; n += 1; }
  rec.espnSpotCheck.mismatches = 3;
}
const ABBRS = [...E.EASTERN, ...E.WESTERN].sort();
ok(1, 'the record carries the 32 clubs the engine plays', JSON.stringify(Object.keys(rec.teams).sort()) === JSON.stringify(ABBRS), Object.keys(rec.teams).join(','));
ok(1, 'the record says which day it was read', /^\d{4}-\d{2}-\d{2}$/.test(rec.meta.read), rec.meta.read);
ok(1, 'every club roster was read from the NHL API season roster', Object.entries(rec.teams).every(([a, t]) => t.url === `https://api-web.nhle.com/v1/roster/${a}/20262027`));
ok(1, 'the 2025-26 lines are all there (940 skaters, 98 goalies as read)', rec.stats2025_26.skaters.length === 940 && rec.stats2025_26.goalies.length === 98);
let baked = null;
try { baked = bake(rec); } catch (e) { ok(1, 'the record bakes', false, String(e.message)); }
if (baked) {
  ok(1, 'a fresh bake is the committed data file', baked.ts === eol(fs.readFileSync(DATA, 'utf8')));
  ok(1, 'a fresh bake is the committed left out file', baked.leftJson === eol(fs.readFileSync(LEFT_OUT, 'utf8')));
}
const spot = rec.espnSpotCheck;
ok(1, 'the spot check exists and was made the day the record was read', !!spot && spot.read === rec.meta.read);
if (spot) {
  const wantClubs = spotCheckClubs(Object.keys(rec.teams));
  ok(1, 'the spot check covers the five clubs the fixed rule names', JSON.stringify(spot.clubs.map(c => c.team)) === JSON.stringify(wantClubs), spot.clubs.map(c => c.team).join(','));
  const spotRate = buildRatings(rec.stats2025_26);
  for (const c of spot.clubs) {
    const want = spotCheckMen(chooseTwentyThree(rec.teams[c.team].players, spotRate).kept.map(x => x.p)).map(p => p.id);
    ok(1, `${c.team}: the spot check checked exactly the ten men the rule names`, JSON.stringify(c.rows.map(r => r.id)) === JSON.stringify(want));
    ok(1, `${c.team}: each checked row is on ESPN with the same group and birth date, or is counted as a mismatch`,
      c.rows.every(r => r.match === (!!r.espn && r.espn.group === r.group && r.espn.birthDate === r.birthDate)));
  }
  const counted = spot.clubs.reduce((n, c) => n + c.rows.filter(r => !r.match).length, 0);
  ok(1, 'the mismatch count is the rows that disagree', counted === spot.mismatches, `${counted} vs ${spot.mismatches}`);
  ok(1, 'fifty men checked', spot.checked === 50, String(spot.checked));
  ok(1, 'at most 2 of 50 disagree (the stop and report bar)', spot.mismatches <= 2, `${spot.mismatches} mismatches`);
}

/* ---------- 2. every man traces to the record ---------- */
console.log('2) Every man on every club traces to a record row');
const realRec = JSON.parse(fs.readFileSync(RECORD, 'utf8'));
const rate = buildRatings(realRec.stats2025_26);
const leftOut = JSON.parse(fs.readFileSync(LEFT_OUT, 'utf8'));
const partialSet = new Set(D.NHL_FO_PARTIAL);
let traced = 0, partialSeen = 0;
const shortClubs = [];
ok(2, 'the data file carries the same 32 clubs', JSON.stringify(Object.keys(D.NHL_FO_FULL_ROSTERS).sort()) === JSON.stringify(ABBRS));
for (const abbr of ABBRS) {
  const seeds = D.NHL_FO_FULL_ROSTERS[abbr] ?? [];
  const published = realRec.teams[abbr].players;
  const want = Math.min(published.length, ACTIVE_LIMIT);
  if (want < ACTIVE_LIMIT) shortClubs.push(`${abbr} ${published.length}`);
  ok(2, `${abbr}: carries min(published ${published.length}, 23) = ${want} men`, seeds.length === want, `${seeds.length}`);
  const used = new Set();
  for (const s of seeds) {
    const rows = published.filter(p => p.name === s.name && gamePos(p.pos) === s.pos && !used.has(p.id));
    const row = rows[0];
    ok(2, `${abbr} ${s.name}: is a record row of this club`, !!row, `no ${s.pos} of that name on the ${realRec.meta.read} roster`);
    if (!row) continue;
    used.add(row.id);
    traced += 1;
    ok(2, `${abbr} ${s.name}: age is his age on the day read`, s.age === ageOn(row.birthDate, realRec.meta.read), `${s.age} vs ${ageOn(row.birthDate, realRec.meta.read)}`);
    const r = rate(row);
    ok(2, `${abbr} ${s.name}: rating is the rule's`, s.ovr === r.ovr, `${s.ovr} vs ${r.ovr}`);
    const key = `${abbr}:${s.pos}:${s.name}`;
    ok(2, `${abbr} ${s.name}: marked partial exactly when the rule had no number`, partialSet.has(key) === r.partial);
    if (r.partial) partialSeen += 1;
  }
  const out = new Set(leftOut.leftOut.filter(x => x.team === abbr).map(x => x.id));
  ok(2, `${abbr}: every published man is in the game or in the left out file, never both`,
    published.every(p => used.has(p.id) !== out.has(p.id)), `${published.filter(p => used.has(p.id) === out.has(p.id)).map(p => p.name).join(', ')}`);
}
ok(2, 'the partial list holds nobody who is not on a roster', D.NHL_FO_PARTIAL.length === partialSeen, `${D.NHL_FO_PARTIAL.length} listed, ${partialSeen} on rosters`);
console.log(`   ${traced} men traced, ${partialSeen} stand in ratings, ${leftOut.count} left out, clubs under 23 as published: ${shortClubs.join(', ') || 'none'}`);

/* ---------- 3. the rule is the lost bake's rule ---------- */
console.log('3) The rating rule reproduces the Aug 5 2026 bake');
{
  const lines = new Map();
  for (const s of realRec.stats2025_26.skaters) { const k = `${nameKey(s.name)}|${s.pos === 'D' ? 'D' : 'F'}`; lines.set(k, [...(lines.get(k) ?? []), s.id]); }
  for (const s of realRec.stats2025_26.goalies) { const k = `${nameKey(s.name)}|G`; lines.set(k, [...(lines.get(k) ?? []), s.id]); }
  let same = 0, differ = 0, none = 0;
  const diffs = [];
  for (const [abbr, seeds] of Object.entries(OLD.NHL_FO_ROSTERS)) {
    for (const s of seeds) {
      const g = groupOf(s.pos === 'W' ? 'L' : s.pos);
      const ids = lines.get(`${nameKey(s.name)}|${g}`) ?? [];
      if (ids.length !== 1) { none += 1; continue; }
      const r = rate({ id: ids[0], pos: g === 'F' ? 'C' : g });
      if (r.ovr === s.ovr) same += 1; else { differ += 1; diffs.push(`${abbr} ${s.name} ${s.ovr} vs ${r.ovr}`); }
    }
  }
  console.log(`   ${same} rows rate the same, ${differ} differ, ${none} have no single line of that name`);
  ok(3, 'no row of the old file rates differently under the rule', differ === 0, diffs.slice(0, 4).join('; '));
  ok(3, 'the rule was tested on at least 400 of the 416 rows', same >= 400, String(same));
}

/* ---------- 4. a new league ---------- */
console.log('4) A new league on the full rosters');
const recNames = new Set(Object.values(realRec.teams).flatMap(t => t.players.map(p => p.name)));
for (const seed of [1, 830]) {
  const lg = E.initNhlFullLeague(mulberry(seed));
  ok(4, `seed ${seed}: the league carries rosterDepth 23`, lg.rosterDepth === 23);
  let invented = 0, partialFlags = 0, shortIce = [], over = [];
  for (const abbr of ABBRS) {
    const t = lg.teams[abbr];
    const seeds = D.NHL_FO_FULL_ROSTERS[abbr];
    ok(4, `seed ${seed} ${abbr}: the roster is the seeds, in order`, JSON.stringify(t.players.map(p => [p.name, p.pos, p.age, p.ovr])) === JSON.stringify(seeds.map(s => [s.name, s.pos, s.age, s.ovr])));
    invented += t.players.filter(p => !recNames.has(p.name)).length;
    for (const p of t.players) {
      const want = partialSet.has(`${abbr}:${p.pos}:${p.name}`);
      if (want !== (p.partial === true)) ok(4, `seed ${seed} ${abbr} ${p.name}: partial flag`, false, `flag ${p.partial}, list ${want}`);
      if (p.partial) partialFlags += 1;
    }
    const f = t.players.filter(p => p.pos === 'C' || p.pos === 'W').length, d = t.players.filter(p => p.pos === 'D').length, g = t.players.filter(p => p.pos === 'G').length;
    if (f < 12 || d < 6 || g < 2) shortIce.push(`${abbr} ${f}/${d}/${g}`);
    const used = E.nhlCapUsed(t);
    if (used > lg.cap) over.push(`${abbr} ${used}`);
  }
  ok(4, `seed ${seed}: nobody on a roster is invented`, invented === 0, `${invented} names not in the record`);
  ok(4, `seed ${seed}: every stand in rating carries the flag`, partialFlags === D.NHL_FO_PARTIAL.length, `${partialFlags} flagged, ${D.NHL_FO_PARTIAL.length} listed`);
  ok(4, `seed ${seed}: every club ices 12 forwards, 6 defensemen and 2 goalies`, shortIce.length === 0, shortIce.join(', '));
  ok(4, `seed ${seed}: every club opens under the ${lg.cap}M cap`, over.length === 0, over.join(', '));
  if (seed === 1) {
    const pays = ABBRS.map(a => [a, E.nhlCapUsed(lg.teams[a])]).sort((x, y) => y[1] - x[1]);
    console.log(`   payrolls: dearest ${pays[0][0]} ${pays[0][1]}M, middle ${pays[16][1]}M, cheapest ${pays[31][0]} ${pays[31][1]}M of ${lg.cap}M`);
  }
  ok(4, `seed ${seed}: the free agent pool is invented men only, none of them a real name`, lg.freeAgents.every(p => !recNames.has(p.name)));
}

/* ---------- 5. the limits ---------- */
console.log('5) The roster limits');
{
  const lg = E.initNhlFullLeague(mulberry(5));
  const classic = E.initNhlLeague(mulberry(5));
  ok(5, 'a full league is 20 to 23', JSON.stringify(E.nhlRosterLimits(lg)) === JSON.stringify({ min: 20, max: 23 }), JSON.stringify(E.nhlRosterLimits(lg)));
  ok(5, 'an older save is 8 to 15', JSON.stringify(E.nhlRosterLimits(classic)) === JSON.stringify({ min: 8, max: 15 }));
  const full = Object.values(lg.teams).find(t => t.players.length === 23);
  ok(5, 'a club at the 23 man ceiling exists (fixture)', !!full);
  if (full) {
    const { max, min } = E.nhlRosterLimits(lg);
    const fa = lg.freeAgents[0];
    ok(5, `${full.abbr}: Sign refuses a 24th man even with unlimited room`, E.nhlSign(full, lg.freeAgents, fa.id, 1e9, max) === false && full.players.length === 23);
    const cut = [...full.players].sort((a, b) => a.ovr - b.ovr);
    let made = 0;
    for (const p of cut) { if (E.nhlRelease(full, lg.freeAgents, p.id, min)) made += 1; }
    ok(5, `${full.abbr}: Waive stops at 20`, full.players.length === 20 && made === 3, `${full.players.length} left after ${made} cuts`);
    ok(5, `${full.abbr}: at 20 the next Waive is refused`, E.nhlRelease(full, lg.freeAgents, full.players[0].id, min) === false);
    const back = lg.freeAgents.find(p => !(full.releasedThisSeason ?? []).includes(p.id));
    ok(5, `${full.abbr}: under the ceiling a Sign goes through again`, E.nhlSign(full, lg.freeAgents, back.id, 1e9, max) === true && full.players.length === 21);
  }
  /* the board passes these limits; the engine's own defaults stay the older save's */
  const old = Object.values(classic.teams)[0];
  ok(5, 'an older save still signs a 14th and 15th man and refuses a 16th by default', (() => {
    while (old.players.length < 15 && classic.freeAgents.length) if (!E.nhlSign(old, classic.freeAgents, classic.freeAgents[0].id, 1e9)) return false;
    return old.players.length === 15 && E.nhlSign(old, classic.freeAgents, classic.freeAgents[0].id, 1e9) === false;
  })());
}

/* ---------- 6. ten franchises, five seasons each ---------- */
console.log('6) Ten seeded franchises, five seasons each');
{
  const FRANCHISES = ['TOR', 'EDM', 'VAN', 'NSH', 'NJD', 'COL', 'TBL', 'SJS', 'WPG', 'BOS'];
  let seasons = 0, largest = 0, overCap = 0, teamSeasons = 0, aiPast = 0, aboveMine = 0, aboveCpu = 0, gmWaivers = 0;
  const realTwice = new Map();
  for (const seeds of Object.values(D.NHL_FO_FULL_ROSTERS)) for (const s of seeds) realTwice.set(s.name, (realTwice.get(s.name) ?? 0) + 1);
  const problems = [];
  FRANCHISES.forEach((me, i) => {
    try {
      const rng = mulberry(8300 + i);
      let lg = E.initNhlFullLeague(rng);
      for (let s = 0; s < 5; s += 1) {
        lg = JSON.parse(JSON.stringify(lg));
        /* the board greys Play above 23, so the GM waives down first */
        const waived = gmCutDown(E, lg, me);
        if (waived < 0) problems.push(`${me} season ${s + 1}: above 23 and no waiver possible`);
        else gmWaivers += waived;
        const before = Object.fromEntries(ABBRS.map(a => [a, lg.teams[a].players.length]));
        playRounds(E, lg, me, rng, l => {
          for (const a of ABBRS) if (a !== me && l.teams[a].players.length > Math.max(23, before[a])) aiPast += 1;
        });
        closeSeason(M, lg, me, rng);
        seasons += 1;
        const ids = [...Object.values(lg.teams).flatMap(t => t.players.map(p => p.id)), ...lg.freeAgents.map(p => p.id)];
        if (new Set(ids).size !== ids.length) problems.push(`${me} season ${s + 1}: a shared id`);
        for (const a of ABBRS) {
          const t = lg.teams[a];
          const f = t.players.filter(p => p.pos === 'C' || p.pos === 'W').length, d = t.players.filter(p => p.pos === 'D').length, g = t.players.filter(p => p.pos === 'G').length;
          if (f < 12 || d < 6 || g < 2) problems.push(`${me} season ${s + 1}: ${a} ices only ${f}/${d}/${g}`);
          if (t.players.some(p => !Number.isFinite(p.salary) || !Number.isFinite(p.ovr))) problems.push(`${me} season ${s + 1}: ${a} has a broken number`);
          largest = Math.max(largest, t.players.length);
          if (t.players.length > 23) { if (a === me) aboveMine += 1; else aboveCpu += 1; }
          teamSeasons += 1;
          if (E.nhlCapUsed(t) > lg.cap) overCap += 1;
        }
        if (lg.rosterDepth !== 23) problems.push(`${me} season ${s + 1}: lost rosterDepth`);
        /* Round 211's rule on a full league: an invented man never shares a name with anyone.
           Two real men may (Vancouver carries two Elias Petterssons, a centre and a defenseman). */
        const count = new Map();
        for (const p of [...Object.values(lg.teams).flatMap(t => t.players), ...lg.freeAgents]) count.set(p.name, (count.get(p.name) ?? 0) + 1);
        for (const [n, k] of count) if (k > 1 && (realTwice.get(n) ?? 0) < k) problems.push(`${me} season ${s + 1}: ${n} appears ${k} times`);
      }
    } catch (e) {
      problems.push(`${me}: threw ${String(e && e.message ? e.message : e).slice(0, 160)}`);
    }
  });
  console.log(`   ${seasons} franchise seasons, ${teamSeasons} club seasons; largest roster seen ${largest} (printed, not asserted); clubs over the cap at a season start ${overCap} of ${teamSeasons}; over 23 out of the summer: your club ${aboveMine} of ${seasons} (waived down by the GM before Play, ${gmWaivers} waivers), CPU clubs ${aboveCpu} of ${teamSeasons - seasons}`);
  ok(6, 'fifty franchise seasons played without a throw, a shared id or name, a broken number or a club short of 12/6/2', problems.length === 0, problems.slice(0, 4).join('; '));
  ok(6, 'all fifty seasons ran', seasons === 50, String(seasons));
  ok(6, 'the AI never signed a club past 23 in season', aiPast === 0, `${aiPast} club rounds past 23`);
}

/* ---------- 7. an old save plays as it did ---------- */
console.log('7) A league saved before this round plays to the pre-830 fingerprint');
for (const seed of LEGACY_SEEDS) {
  const got = legacyCampaign(M, seed);
  ok(7, `seed ${seed}: the 13 man save plays a season, an offseason and a season to the frozen fingerprint`, got.digest === LEGACY_DIGESTS[seed], `${got.digest} vs ${LEGACY_DIGESTS[seed]}`);
  ok(7, `seed ${seed}: and never gains rosterDepth`, got.depth === false);
}

/* ---------- 8. what moved, and why ---------- */
console.log('8) What the depth men change');
{
  /* Bands from measured headroom, 2026-10-01, see the printed values. */
  /* Measured 2026-10-01 over four seed streams (bases 0, 100000, 200000, 300000):
     r 0.993, 0.996, 0.997, 0.994 and mean gap 1.02, 0.82, 0.72, 0.88 points against a
     club spread of about 11.3. Two independent 160 season means differ by about 0.7
     points on noise alone, so the gap is mostly noise; fewer seasons make both checks
     harder to pass, not easier. Bands sit clear of the worst stream. */
  const BAND_R = 0.98, BAND_GAP = 1.6;
  /* measurement only: shifts every seed in this section so the bands can be measured over fresh streams */
  const SEED_BASE = Number(process.env.NHL_FULL_SEED_BASE || 0);
  const N = 160;
  const full0 = E.initNhlFullLeague(mulberry(1));
  const core0 = CORE.E.initNhlFullLeague(mulberry(1));
  const sameStrength = ABBRS.filter(a => E.nhlStrength(full0.teams[a]) === CORE.E.nhlStrength(core0.teams[a]));
  ok(8, 'the depth men change no club\'s strength at the drop of the puck', sameStrength.length === 32, `${32 - sameStrength.length} clubs differ`);
  ok(8, 'the core twin really is the 13 man cut', Object.values(core0.teams).every(t => t.players.length <= 13) && Object.values(full0.teams).every(t => t.players.length >= 22));
  const ptsFull = Object.fromEntries(ABBRS.map(a => [a, 0])), ptsCore = Object.fromEntries(ABBRS.map(a => [a, 0]));
  let sameSeedEqual = 0, sameSeedClubs = 0, stepIns = 0, clubRounds = 0;
  const coreIds = lg => new Set(Object.values(lg.teams).flatMap(t => {
    const by = pos => t.players.filter(p => pos.includes(p.pos)).sort((a, b) => b.ovr - a.ovr);
    return [...by(['C', 'W']).slice(0, 7), ...by(['D']).slice(0, 4), ...by(['G']).slice(0, 2)].map(p => p.id);
  }));
  for (let s = 0; s < N; s += 1) {
    const f = E.initNhlFullLeague(mulberry(9000 + SEED_BASE + s));
    const c = CORE.E.initNhlFullLeague(mulberry(9000 + SEED_BASE + s));
    const inCore = coreIds(f);
    playRounds(E, f, 'TOR', mulberry(5000 + SEED_BASE + s), lg => {
      for (const t of Object.values(lg.teams)) {
        const sel = E.nhlContributors(t);
        clubRounds += 1;
        if ([...sel.forwards, ...sel.defense, ...(sel.goalie ? [sel.goalie] : [])].some(id => !inCore.has(id))) stepIns += 1;
      }
    });
    playRounds(CORE.E, c, 'TOR', mulberry(5000 + SEED_BASE + s));
    for (const a of ABBRS) {
      ptsFull[a] += E.nhlPoints(f.teams[a]) / N;
      ptsCore[a] += CORE.E.nhlPoints(c.teams[a]) / N;
      sameSeedClubs += 1;
      if (E.nhlPoints(f.teams[a]) === CORE.E.nhlPoints(c.teams[a])) sameSeedEqual += 1;
    }
  }
  const xs = ABBRS.map(a => ptsCore[a]), ys = ABBRS.map(a => ptsFull[a]);
  const mean = v => v.reduce((x, y) => x + y, 0) / v.length;
  const mx = mean(xs), my = mean(ys);
  const r = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0));
  const mad = mean(ABBRS.map(a => Math.abs(ptsFull[a] - ptsCore[a])));
  const spread = Math.sqrt(mean(xs.map(x => (x - mx) ** 2)));
  console.log(`   ${N} seasons a side: mean points by club correlate r=${r.toFixed(3)}, mean gap ${mad.toFixed(2)} pts against a club spread of ${spread.toFixed(2)};`
    + ` under one seed ${sameSeedEqual} of ${sameSeedClubs} club seasons end level on points; a depth man stepped into the strength read in ${(100 * stepIns / clubRounds).toFixed(1)}% of club rounds`);
  ok(8, 'mean points by club with and without the depth men correlate (r above BAND_R)', r > BAND_R, r.toFixed(3));
  ok(8, 'and sit close (mean gap under BAND_GAP points)', mad < BAND_GAP, mad.toFixed(2));
  ok(8, 'depth men really do step in for the injured (some club rounds)', stepIns > 0, String(stepIns));
}

/* ---------- 9. the cut down before puck drop ---------- */
console.log('9) The cut down before puck drop');
{
  /* the refusal: a full league above 23 waits, at 23 it plays, an older save never waits */
  const lg = E.initNhlFullLeague(mulberry(9));
  const atLimit = Object.values(lg.teams).filter(t => t.players.length === 23);
  ok(9, 'no club of a new league is refused at puck drop', Object.values(lg.teams).every(t => E.nhlPuckDropRefusal(lg, t) === null));
  const t24 = atLimit[0];
  ok(9, 'a club at the 23 man limit exists (fixture)', !!t24);
  if (t24) {
    t24.players.push(E.nhlProspectToPlayer({ id: 'x', name: 'Torsten Ranta', pos: 'C', age: 19, grade: 80, trueOvr: 80 }, mulberry(1)));
    const said = E.nhlPuckDropRefusal(lg, t24);
    ok(9, 'a full league club at 24 is refused, and the sentence says 24 and 23', typeof said === 'string' && said.includes('24') && said.includes('23'), String(said));
    const { min } = E.nhlRosterLimits(lg);
    const cutOne = [...t24.players].sort((a, b) => a.ovr - b.ovr)[0];
    ok(9, 'one waiver takes him back to 23 and Play is live again', E.nhlRelease(t24, lg.freeAgents, cutOne.id, min) && E.nhlPuckDropRefusal(lg, t24) === null);
  }
  const old = E.initNhlLeague(mulberry(9));
  const oldTeam = Object.values(old.teams)[0];
  while (oldTeam.players.length < 18 && old.freeAgents.length) oldTeam.players.push(old.freeAgents.pop());
  ok(9, 'an older save at 18 is never refused (its rules are 8 to 15 with no puck drop rule)', oldTeam.players.length === 18 && E.nhlPuckDropRefusal(old, oldTeam) === null, String(oldTeam.players.length));

  /* the CPU cut down: lowest rated from a group above its floor, older first on a tie, through the shared cut */
  const mk = (pos, ovr, age, i) => ({ id: `t${i}`, name: `Test ${i}`, pos, age, ovr, salary: 1, years: 2, out: 0, pot: ovr });
  let i = 0;
  const team = { abbr: 'TST', wins: 0, losses: 0, otLosses: 0, picks: [1, 2], players: [] };
  for (let k = 0; k < 13; k += 1) team.players.push(mk(k % 3 === 0 ? 'C' : 'W', 70 + k, 25, i++));
  for (let k = 0; k < 7; k += 1) team.players.push(mk('D', 70 + k, 25, i++));
  team.players.push(mk('G', 60, 25, i++), mk('G', 61, 25, i++));
  /* 22 so far: 13 F (70..82), 7 D (70..76), 2 G (60, 61). Four more make 26. */
  team.players.push(mk('G', 59, 25, 'g3'), mk('D', 65, 25, 'd8'), mk('W', 69, 24, 'young'), mk('C', 69, 33, 'old'));
  const pool = [];
  const cut = E.nhlCutDownToLimit(team, pool);
  ok(9, 'the CPU cut down leaves 23', team.players.length === 23, String(team.players.length));
  ok(9, 'it cuts the lowest rated men from groups above their floor: the third goalie, the eighth D, then the older of two 69 forwards, never the second goalie (60)',
    JSON.stringify(cut.map(p => p.id)) === JSON.stringify(['tg3', 'td8', 'told']), cut.map(p => `${p.id} ${p.pos} ${p.ovr}`).join(', '));
  ok(9, 'it keeps twelve forwards, six defensemen and two goalies or more', team.players.filter(p => p.pos === 'G').length >= 2 && team.players.filter(p => p.pos === 'D').length >= 6 && team.players.filter(p => p.pos === 'C' || p.pos === 'W').length >= 12);
  ok(9, 'it goes through the shared cut: each man is in the pool on one year with his dead money on the ledger',
    pool.length === 3 && pool.every(p => p.years === 1) && (team.deadCap ?? []).length === 3 && (team.releasedThisSeason ?? []).length === 3);
  /* a club short of a floor keeps room for the refill: 25 men with one goalie stops at 22, so the refill's goalie makes 23 */
  const short = { abbr: 'SHT', wins: 0, losses: 0, otLosses: 0, picks: [1, 2], players: [] };
  for (let k = 0; k < 17; k += 1) short.players.push(mk('W', 70 + k, 25, `s${k}`));
  for (let k = 0; k < 7; k += 1) short.players.push(mk('D', 70 + k, 25, `sd${k}`));
  short.players.push(mk('G', 75, 25, 'sg'));
  E.nhlCutDownToLimit(short, []);
  ok(9, 'a club one goalie short is cut to 22 so the summer refill lands it on 23', short.players.length === 22 && short.players.filter(p => p.pos === 'G').length === 1, String(short.players.length));
  /* found by the review's 300 season probe: a lopsided club at exactly 20 (8 F, 10 D, 2 G) is owed four
     forwards, so it must drop a defenseman below 20; held at a flat 20 it opened the season at 24 */
  const lop = { abbr: 'LOP', wins: 0, losses: 0, otLosses: 0, picks: [1, 2], players: [] };
  for (let k = 0; k < 8; k += 1) lop.players.push(mk('W', 75 + k, 25, `lf${k}`));
  for (let k = 0; k < 10; k += 1) lop.players.push(mk('D', 70 + k, 25, `ld${k}`));
  lop.players.push(mk('G', 75, 25, 'lg1'), mk('G', 76, 25, 'lg2'));
  const lopCut = E.nhlCutDownToLimit(lop, []);
  E.replenishNhlRoster(lop, mulberry(3), new Set(), { forwards: 12, defense: 6, goalies: 2, total: 20 });
  ok(9, 'a lopsided club of 20 (8 F, 10 D, 2 G) drops its lowest defenseman so the refill lands it on 23, not 24',
    lopCut.length === 1 && lopCut[0].id === 'tld0' && lop.players.length === 23, `${lopCut.map(p => p.id).join(',')} cut, ${lop.players.length} after the refill`);

  /* the summer: every CPU club above 23 is cut, the GM's own never is */
  const sl = E.initNhlFullLeague(mulberry(19));
  const ME = 'MTL', CPU = 'BOS';
  for (const abbr of [ME, CPU]) {
    for (const p of sl.teams[abbr].players) { p.age = 25; p.years = 5; }
    for (let k = 0; k < 3; k += 1) sl.teams[abbr].players.push(E.nhlProspectToPlayer({ id: `${abbr}${k}`, name: `${abbr === ME ? 'Wilhelm' : 'Valter'} ${['Grahn', 'Sjodin', 'Ranta'][k]}`, pos: 'W', age: 19, grade: 75, trueOvr: 75 }, mulberry(k)));
  }
  const meBefore = sl.teams[ME].players.length, cpuBefore = sl.teams[CPU].players.length;
  E.nhlOffseason(sl, mulberry(29), ME);
  ok(9, `the summer leaves the GM's club alone (${meBefore} in, nobody retiring or walking, ${meBefore} out)`, sl.teams[ME].players.length === meBefore, String(sl.teams[ME].players.length));
  ok(9, `and cuts a CPU club from ${cpuBefore} to 23`, sl.teams[CPU].players.length === 23, String(sl.teams[CPU].players.length));
  ok(9, 'and the GM is then refused at puck drop until he waives down', !!E.nhlPuckDropRefusal(sl, sl.teams[ME]) && gmCutDown(E, sl, ME) === meBefore - 23 && E.nhlPuckDropRefusal(sl, sl.teams[ME]) === null);

  /* sixteen franchise seasons through the board's loop */
  let cpuOver = 0, refusedRight = 0, refusedWrong = 0, mineOver = 0, deadEnds = 0, waivers = 0, clubSeasons = 0;
  ['ANA', 'CAR', 'MTL', 'VGK'].forEach((me, k) => {
    const rng = mulberry(9300 + k);
    let lg2 = E.initNhlFullLeague(rng);
    for (let s = 0; s < 4; s += 1) {
      playRounds(E, lg2, me, rng);
      closeSeason(M, lg2, me, rng);
      lg2 = JSON.parse(JSON.stringify(lg2));
      for (const [a, t] of Object.entries(lg2.teams)) {
        clubSeasons += 1;
        const refused = !!E.nhlPuckDropRefusal(lg2, t);
        if (refused === (t.players.length > 23)) refusedRight += 1; else refusedWrong += 1;
        if (a !== me && t.players.length > 23) cpuOver += 1;
      }
      if (lg2.teams[me].players.length > 23) mineOver += 1;
      const w = gmCutDown(E, lg2, me);
      if (w < 0) deadEnds += 1; else waivers += w;
    }
  });
  console.log(`   16 franchise seasons: your club came out of the summer above 23 in ${mineOver} and waived ${waivers} men to get back to 23; CPU clubs above 23 at a season start ${cpuOver} of ${clubSeasons - 16}`);
  ok(9, 'no CPU club opens a season above 23', cpuOver === 0, `${cpuOver} club seasons`);
  ok(9, 'the refusal fires exactly when a club is above 23', refusedWrong === 0 && refusedRight === clubSeasons, `${refusedWrong} wrong of ${clubSeasons}`);
  ok(9, 'the GM can always waive down to a legal roster', deadEnds === 0, `${deadEnds} dead ends`);
  ok(9, 'the draft really did carry the GM past 23 (the refusal was exercised)', mineOver > 0, String(mineOver));
}

/* ---------- 10. what the page says is what the data is ---------- */
console.log('10) What the page says is what the data is');
{
  /* code, not comments: block comments and whole line // comments go before any match */
  const code = f => eol(fs.readFileSync(path.join(ROOT, f), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  let board = code('src/components/nhl-front-office/NhlFrontOfficeBoard.tsx');
  let page = code('src/pages/NhlFrontOffice.tsx');
  const guideAll = code('src/data/gameContent/hockey.ts');
  const gStart = guideAll.indexOf("'/nhl-front-office': {");
  let guide = gStart < 0 ? '' : guideAll.slice(gStart, guideAll.indexOf("\n  '/", gStart + 5) > 0 ? guideAll.indexOf("\n  '/", gStart + 5) : undefined);
  const news = code('src/pages/WhatsNew.tsx');
  let entry = (news.split('<li>').find(li => li.includes('NHL Front Office: real rosters')) ?? '');
  const rules = eol(fs.readFileSync(path.join(ROOT, 'scripts/lib/nhlFoRosterRules.mjs'), 'utf8'));
  const bind = (label, text, from, to) => {
    if (text.split(from).length !== 2) throw new Error(`control ${CONTROL}: ${JSON.stringify(from.slice(0, 60))} is not in ${label} exactly once. Refusing to run.`);
    return text.replace(from, to);
  };
  if (CONTROL === 'overclaim') page = bind('the page', page, "22 or 23 real players from the league's own data, rated off real 2025-26 stats (a rookie or anyone without a full season gets a marked stand in rating)", "22 or 23 real players, every one rated off real 2025-26 stats");
  if (CONTROL === 'nosalary') board = bind('the board', board, '. Player salaries and contract years are made up for the game, not their real deals.', '.');
  if (CONTROL === 'camprule') guide = bind('the guide', guide, 'twelve forwards and six defensemen', 'eleven forwards and six defensemen');
  ok(10, 'the guide entry and the What\'s New line were found', guide.length > 500 && entry.length > 200, `${guide.length} ${entry.length}`);
  /* the money: real names sit beside made up salaries, so the box and the pick card say so */
  const salaryNote = (board.match(/data-salary-note[^>]*>([^<]*)</) ?? [])[1] ?? '';
  ok(10, 'the Roster box says the salaries and contract years are made up', /made up for the game/.test(salaryNote), salaryNote.slice(0, 80));
  ok(10, 'the pick card says salaries and contracts are made up', /Salaries and contracts are made up/.test(board));
  /* the camp rule, in the guide, in the rules lib's own numbers */
  const keep = rules.match(/KEEP_AT_LEAST = \{ G: (\d+), F: (\d+), D: (\d+) \}/);
  const limit = Number((rules.match(/ACTIVE_LIMIT = (\d+)/) ?? [])[1]);
  const words = { 2: 'two', 3: 'three', 6: 'six', 12: 'twelve' };
  const extra = keep ? limit - Number(keep[1]) - Number(keep[2]) - Number(keep[3]) : NaN;
  const campLine = keep ? `keeps ${limit}: the ${words[keep[1]]} goalies, ${words[keep[2]]} forwards and ${words[keep[3]]} defensemen with the most NHL games in 2025-26, then the ${words[extra]} skaters left with the most` : '(rule not found)';
  ok(10, 'the guide states the camp rule in the rules lib\'s numbers', guide.includes(campLine), campLine);
  ok(10, 'the What\'s New line says camp clubs keep the 23 with the most games', /keep the 23 who played the most NHL games/.test(entry));
  /* the stand in, in the rules lib's numbers */
  /* the rules lib rates goalies first (under 15 games) and skaters second (under 30) */
  const [gk, sk] = [...rules.matchAll(/s\.gp < (\d+)\) return \{ ovr: PARTIAL_RATING/g)].map(m => Number(m[1]));
  const pr = Number((rules.match(/PARTIAL_RATING = (\d+)/) ?? [])[1]);
  const flat = t => t.replace(/\s+/g, ' ');
  ok(10, 'the guide and the Roster box give the stand in rule in the rules lib\'s numbers',
    [guide, board].every(t => flat(t).includes(`(${sk} games for a skater, ${gk} for a goalie)`) && flat(t).includes(`starts on ${pr}`)), `${sk}/${gk}/${pr}`);
  /* no copy claims every man is rated off real stats: 97 are stand ins */
  const everyRated = /every (one|player|man)[^.]{0,40}rated off real/i;
  ok(10, 'no copy says every player is rated off real stats', ![board, page, guide, entry].some(t => everyRated.test(flat(t))), [board, page, guide, entry].map(t => (flat(t).match(everyRated) ?? [''])[0]).join(' | '));
}

/* ---------- report ---------- */
if (checks === 0) { console.error('FAIL: NOTHING WAS CHECKED'); process.exit(1); }
for (const [n, s] of [...bySection.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`   ${n}. ${SECTION_NAMES[n]}: ${s.n} check${s.n === 1 ? '' : 's'}${s.bad ? `, ${s.bad} FAILED` : ''}`);
}
if (CONTROL) {
  const red = [...bySection.entries()].filter(([, s]) => s.bad > 0).map(([n]) => n).sort((a, b) => a - b);
  for (const f of fails.slice(0, 4)) console.log(`   red: ${f}`);
  if (red.join(',') === EXPECT[CONTROL].join(',')) {
    console.log(`control "${CONTROL}": section${EXPECT[CONTROL].length === 1 ? '' : 's'} ${EXPECT[CONTROL].join(' and ')} went red as expected (${fails.length} failures) and nothing else moved, the check works`);
    process.exit(0);
  }
  console.error(`control "${CONTROL}": expected ${EXPECT[CONTROL].join(' and ')} red, got ${red.join(' and ') || 'nothing'}, so a check is dead or bleeds`);
  process.exit(1);
}
if (fails.length) {
  console.error(`simNhlFullRosters: ${fails.length} of ${checks} checks FAILED`);
  for (const f of fails.slice(0, 24)) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`simNhlFullRosters: ${checks} checks passed. 32 real rosters traced to the NHL record, a full league plays five seasons, and an old save plays exactly as it did.`);
