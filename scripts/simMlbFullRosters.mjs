/* The MLB full rosters fence. Round 829.

   THE CHANGE. MLB Front Office shipped 13 real men a club, baked on
   2026-08-05 by a script that was never committed, so the rosters could not
   be rebuilt or checked. A real active roster is 26. Every club now carries
   26, chosen by one stated rule from MLB's own Stats API record of its major
   league roster on the last day of the 2026 regular season, rated off that
   season's numbers, and generated in the repo:
     scripts/fetchMlbFoRecord.mjs        the API, saved as a compact record
     scripts/data/mlbRosters2026.json    every 40 man list on 2026-09-27, plus
                                         the ESPN spot check
     scripts/data/mlbStats2026.json      the league's 2026 regular season lines
     scripts/lib/mlbFoRecord.mjs         the 26, the ratings, the ages (one rule)
     scripts/genMlbFrontOfficeRoster.mjs record to src/data/mlbFoRosters2026.ts
   Old saves keep their 13 to 16 man rules: the engine reads a club's depth
   field, which only a league dealt after this round carries.

   Sections, every one over the real engine bundled with esbuild, nothing read
   from dist or the clock:
     1) the record: 30 clubs read from the API on the record date, and the
        ESPN spot check done to its stated rule (five clubs, ten men, the same
        men the rule picks today) inside its 3 percent limit
     2) the data file is exactly the generator's output (--check) and says so
     3) every shipped man is a record row: 26 a club, the club's major league
        list on the record date, the age from his birth date, the position,
        rating and partial mark the rule gives, no name twice, and every club
        can field nine hitters, five starters and a bullpen of five
     4) a new league: 26 real men a club and nobody invented, the depth mark,
        and the payroll rule: the 13 the sim reads at the game's own price,
        the rest on depth deals, every club under the tax line
     5) the bench never moves a result: the strength of 26 equals the
        strength of the 13 it reads, and two leagues that differ only by
        extra depth men play the same season, round by round, with the same
        injuries, under the same seed. Then, printed and not asserted, what
        does move against a 13 man twin and why
     6) ten franchises, five seasons each, the board's own sequence (rounds,
        CPU moves, October, the draft, the offseason): no crash, every club
        still fields nine hitters, five starters and five relievers, no name
        twice, no id twice
     7) an old save: two leagues written by the engine as it stood before this
        round (scripts/data/mlbLegacySaveFixture.json) replay a scripted
        stretch (signings to the old ceiling, DFAs to the old floor, a season,
        October, a draft, an offseason and five rounds) to the same result,
        byte for byte on everything but the minted ids
     8) the board under vitest: the season close test for all four sims and
        the MLB board's own full roster test

   MEASURED (2026-10-01, ten seeds): every club's opening payroll 120 to 230
   against the 244 line; section 5's twin rounds compared 270 of 270 per seed.

   Controls, through MLB_FULL_CONTROL. Each edits a bundled copy, refuses to
   run if its anchor is not in the file, and must turn its own section red:
     invented      one shipped name swapped for an invented one   -> 3 and 4
     benchread     the strength reads every healthy bat           -> 5
     sharedstream  depth leagues roll injuries off the shared stream -> 5
     fullprice     no depth deals, everyone at the full price      -> 4
     legacylimits  an old save gets the new roster limits          -> 7

   The fixture: node scripts/simMlbFullRosters.mjs --write-legacy-fixture
   writes it with whatever engine is in src. It was written against the engine
   at d02828c3, before any Round 829 engine change; rewriting it after the
   change would only compare the engine with itself, so the mode refuses
   unless MLB_LEGACY_FIXTURE_FORCE=1.

   Run: node scripts/simMlbFullRosters.mjs
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { GAME_TEAMS, SPOT_TEAMS, SPOT_PER_TEAM, SPOT_LIMIT, selectTwentySix, gameNames, spotSample, buildPools, rateMan, ageOn, onMajorLeagueRoster } from './lib/mlbFoRecord.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = path.join(ROOT, 'src', 'lib', 'mlbFrontOffice.ts');
const DATA = path.join(ROOT, 'src', 'data', 'mlbFoRosters2026.ts');
const RECORD = path.join(ROOT, 'scripts', 'data', 'mlbRosters2026.json');
const STATS = path.join(ROOT, 'scripts', 'data', 'mlbStats2026.json');
const FIXTURE = path.join(ROOT, 'scripts', 'data', 'mlbLegacySaveFixture.json');
const CONTROL = process.env.MLB_FULL_CONTROL || '';
const WRITE_FIXTURE = process.argv.includes('--write-legacy-fixture');
const EXPECT = { invented: [3, 4], benchread: [5], sharedstream: [5], fullprice: [4], legacylimits: [7] };
if (CONTROL && !EXPECT[CONTROL]) { console.error(`MLB_FULL_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(EXPECT).join(', ')})`); process.exit(1); }

let checks = 0;
const fails = [];
const red = new Set();
const ok = (section, label, pass, detail) => {
  checks += 1;
  if (!pass) { red.add(section); fails.push(`[${section}] ${label}${detail ? `: ${detail}` : ''}`); }
};
const lcg = start => { let s = start >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const clone = v => JSON.parse(JSON.stringify(v));
const normaliseEol = t => t.split('\r\n').join('\n');
const req = createRequire(path.join(ROOT, 'package.json'));

/* ---- the engine and the data, bundled (a control edits a copy) ---------- */
const ENGINE_SWAPS = {
  benchread: [['.filter(p => !isPitcher(p)).sort((a, b) => b.ovr - a.ovr).slice(0, 8)', '.filter(p => !isPitcher(p)).sort((a, b) => b.ovr - a.ovr).slice(0, 99)']],
  sharedstream: [['  if (deep) rollDepthInjuries(league, myTeam, rng, notes);\n  else {', '  {']],
  fullprice: [['salary: core.has(i) ? mlbSalaryFor(s.ovr) : MLB_DEPTH_SALARY,', 'salary: mlbSalaryFor(s.ovr),']],
  legacylimits: [['export const mlbRosterMax = (t: { depth?: number }): number => (t.depth ? MLB_ROSTER_MAX : MLB_LEGACY_ROSTER_MAX);', 'export const mlbRosterMax = (t: { depth?: number }): number => (t.depth || true ? MLB_ROSTER_MAX : MLB_LEGACY_ROSTER_MAX);']],
};
const DATA_SWAPS = { invented: [['  ATL: [\n    { name: ', '  ATL: [\n    { name: "Harness Inventedman" }, { name: ']] };
const rewrite = (label, src, swaps) => {
  for (const [now] of swaps) if (!src.includes(now)) throw new Error(`control ${CONTROL}: ${JSON.stringify(now.slice(0, 80))} is not in ${label}, so it would change nothing. Refusing to run.`);
  let out = src;
  for (const [now, was] of swaps) out = out.split(now).join(was);
  if (out === src) throw new Error(`control ${CONTROL}: the rewrite of ${label} changed nothing. Refusing to run.`);
  return out;
};

const BUNDLE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-mlbfull-'));
let E, D, names;
try {
  let enginePath = ENGINE, dataPath = DATA;
  if (ENGINE_SWAPS[CONTROL]) {
    enginePath = path.join(BUNDLE_DIR, 'mlbFrontOffice.ts');
    const src = rewrite('mlbFrontOffice.ts', normaliseEol(fs.readFileSync(ENGINE, 'utf8')), ENGINE_SWAPS[CONTROL]);
    fs.writeFileSync(enginePath, src.split("from './").join("from '@/lib/"));
  }
  if (DATA_SWAPS[CONTROL]) {
    dataPath = path.join(BUNDLE_DIR, 'mlbFoRosters2026.ts');
    /* the invented row needs the rest of a row's fields */
    const src = rewrite('mlbFoRosters2026.ts', normaliseEol(fs.readFileSync(DATA, 'utf8')), DATA_SWAPS[CONTROL]);
    fs.writeFileSync(dataPath, src.replace('{ name: "Harness Inventedman" }', '{ name: "Harness Inventedman", pos: "SS", age: 27, ovr: 99 }'));
  }
  if (CONTROL) console.log(`   control ${CONTROL}: editing a bundled copy of ${ENGINE_SWAPS[CONTROL] ? 'the engine' : 'the data file'}`);
  const redirect = {
    name: 'dukb-mlbfull-copies',
    setup(b) {
      b.onResolve({ filter: /mlbFrontOffice(\.ts)?$/ }, () => ({ path: enginePath }));
      b.onResolve({ filter: /mlbFoRosters2026(\.ts)?$/ }, () => ({ path: dataPath }));
    },
  };
  const fwd = p => JSON.stringify(p.replaceAll('\\', '/'));
  const entry = path.join(BUNDLE_DIR, 'entry.mjs');
  const hasData = fs.existsSync(DATA);
  fs.writeFileSync(entry, [
    `export * as E from ${fwd(ENGINE)};`,
    hasData ? `export * as D from ${fwd(DATA)};` : 'export const D = null;',
    `export { leagueNames } from ${fwd(path.join(ROOT, 'src', 'lib', 'foNames.ts'))};`,
  ].join('\n'));
  const out = path.join(BUNDLE_DIR, 'bundle.mjs');
  const esbuild = await import(pathToFileURL(req.resolve('esbuild')).href);
  await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', alias: { '@': path.join(ROOT, 'src') }, plugins: [redirect], outfile: out, logLevel: 'error' });
  const mod = await import(pathToFileURL(out).href);
  E = mod.E; D = mod.D; names = mod.leagueNames;
} catch (e) {
  console.error(`FAIL: the engine could not be bundled: ${String(e && e.message ? e.message : e).slice(0, 300)}`);
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
  process.exit(1);
} finally {
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
}

/* ---- the old save recipe, shared by the fixture writer and section 7 ---- */
/* Everything a save holds except the minted ids, which carry a random page
   epoch and so differ between any two loads by design. */
const projectLeague = lg => ({
  season: lg.season, cap: lg.cap, round: lg.round, champions: lg.champions,
  teams: Object.keys(lg.teams).sort().map(a => {
    const t = lg.teams[a];
    return {
      abbr: a, wins: t.wins, losses: t.losses, picks: t.picks, depth: t.depth ?? null,
      players: t.players.map(p => [p.name, p.pos, p.age, p.ovr, p.salary, p.years, p.out, p.pot]),
      dead: (t.deadCap ?? []).map(d => [d.name, d.amount, d.seasonsLeft]),
      released: (t.releasedThisSeason ?? []).length,
    };
  }),
  freeAgents: lg.freeAgents.map(p => [p.name, p.pos, p.age, p.ovr, p.salary, p.years, p.out, p.pot]),
});
const sha = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');

function legacyRecipe(lg, myTeam, rng) {
  const log = [];
  const my = () => lg.teams[myTeam];
  /* signings until the ceiling refuses (13 men, ceiling 16 on the old rules) */
  for (let i = 0; i < 5; i += 1) {
    const fa = [...lg.freeAgents].sort((a, b) => a.salary - b.salary || a.name.localeCompare(b.name))[0];
    if (!fa) break;
    log.push(['sign', fa.name, E.mlbSign(my(), lg.freeAgents, fa.id, lg.cap), my().players.length]);
  }
  /* DFAs until the floor refuses (old floor 9) */
  for (let i = 0; i < 9; i += 1) {
    const worst = [...my().players].sort((a, b) => a.ovr - b.ovr || a.name.localeCompare(b.name))[0];
    log.push(['dfa', worst.name, E.mlbRelease(my(), lg.freeAgents, worst.id), my().players.length]);
  }
  for (let r = 1; r <= E.MLB_ROUNDS; r += 1) {
    const rep = E.simMlbRound(lg, myTeam, rng);
    E.mlbAiMoves(lg, myTeam, rng);
    log.push(['round', r, rep.myWins, rep.myLosses, rep.notes.length]);
    if (r < E.MLB_ROUNDS) lg.round += 1;
  }
  const po = E.runMlbPlayoffs(lg, rng);
  lg.champions.push({ season: lg.season, team: po.champion });
  log.push(['october', po.champion, po.series.map(s => `${s.name}:${s.winner}:${s.homeWins}-${s.awayWins}`).join('|')]);
  const cls = E.mlbDraftClass(rng, 24, names(lg));
  for (const pr of cls.slice(0, 2)) my().players.push(E.mlbProspectToPlayer(pr, rng));
  log.push(['draft', cls.slice(0, 2).map(p => `${p.name}:${p.trueOvr}`).join('|')]);
  log.push(['offseason', E.mlbOffseason(lg, rng).length]);
  for (let r = 1; r <= 5; r += 1) {
    const rep = E.simMlbRound(lg, myTeam, rng);
    E.mlbAiMoves(lg, myTeam, rng);
    log.push(['round2', r, rep.myWins, rep.myLosses]);
    lg.round += 1;
  }
  return log;
}
const FIXTURE_SEEDS = [{ seed: 829, team: 'BOS' }, { seed: 1729, team: 'SDP' }];

if (WRITE_FIXTURE) {
  if (fs.existsSync(FIXTURE) && process.env.MLB_LEGACY_FIXTURE_FORCE !== '1') {
    console.error('The legacy fixture exists. It must come from the engine as it stood before Round 829; set MLB_LEGACY_FIXTURE_FORCE=1 only if you know the engine in src is that one.');
    process.exit(1);
  }
  const rows = [];
  for (const { seed, team } of FIXTURE_SEEDS) {
    const lg = E.initMlbLeague(lcg(seed));
    if (Object.values(lg.teams).some(t => t.depth)) { console.error('FAIL: this engine deals depth leagues, so it is not the pre Round 829 engine'); process.exit(1); }
    /* canonical ids, so the fixture reads the same on any machine */
    let n = 0;
    for (const t of Object.values(lg.teams)) for (const p of t.players) p.id = `x${++n}`;
    for (const p of lg.freeAgents) p.id = `x${++n}`;
    const start = clone(lg);
    E.ensureMlbLeagueIds(lg);
    const log = legacyRecipe(lg, team, lcg(seed * 7 + 1));
    const end = projectLeague(lg);
    rows.push({ seed, team, rngSeed: seed * 7 + 1, start, log, endSha256: sha(end), endStandings: end.teams.map(t => `${t.abbr} ${t.wins}-${t.losses} ${t.players.length}`).join(', ') });
    console.log(`   seed ${seed} (${team}): ${log.filter(l => l[0] === 'sign' && l[2]).length} signed, ${log.filter(l => l[0] === 'dfa' && l[2]).length} DFA'd, champion ${log.find(l => l[0] === 'october')[1]}`);
  }
  const head = {
    madeBy: 'scripts/simMlbFullRosters.mjs --write-legacy-fixture, against src/lib/mlbFrontOffice.ts as it stood at d02828c3, before any Round 829 engine change',
    recipe: 'legacyRecipe in scripts/simMlbFullRosters.mjs: the cheapest free agents signed until the ceiling refuses, the worst man DFAd until the floor refuses, 27 rounds with CPU moves, October, two draftees, the offseason, five more rounds. The end state is hashed without ids.',
  };
  fs.writeFileSync(FIXTURE, `${JSON.stringify({ ...head, rows })}\n`);
  console.log(`wrote ${path.relative(ROOT, FIXTURE)}`);
  process.exit(0);
}

const record = JSON.parse(fs.readFileSync(RECORD, 'utf8'));
const stats = JSON.parse(fs.readFileSync(STATS, 'utf8'));
const pools = buildPools(stats);
const PITCH = new Set(['SP', 'RP', 'CL']);
const isP = p => PITCH.has(p.pos);
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => i * 7919);

/* ---- 1. the record ------------------------------------------------------ */
console.log('1) the record: 30 clubs from the API on the record date, and the spot check');
{
  ok(1, 'the record names the Stats API as its source', /statsapi\.mlb\.com/.test(record.meta.source));
  ok(1, 'the record date is the last day of the 2026 regular season', record.meta.rosterDate === '2026-09-27', record.meta.rosterDate);
  ok(1, 'all 30 clubs are in the record', GAME_TEAMS.every(a => record.teams[a]), GAME_TEAMS.filter(a => !record.teams[a]).join(' '));
  for (const a of GAME_TEAMS) {
    const t = record.teams[a];
    if (!t) continue;
    ok(1, `${a}: read from the Stats API on the record date`, t.statsapiUrl.includes('statsapi.mlb.com') && t.statsapiUrl.includes(`date=${record.meta.rosterDate}`) && /^\d{4}-\d{2}-\d{2}$/.test(t.read));
    ok(1, `${a}: 26 or more men on the major league roster that day`, t.players.filter(m => onMajorLeagueRoster(m.status)).length >= 26);
  }
  const sc = record.spotCheck;
  ok(1, 'the spot check is in the record', !!sc);
  if (sc) {
    ok(1, 'the spot check read the five clubs its rule names', JSON.stringify(sc.teams.map(t => t.team)) === JSON.stringify(SPOT_TEAMS), sc.teams.map(t => t.team).join(' '));
    let n = 0, bad = 0;
    for (const t of sc.teams) {
      const want = spotSample(selectTwentySix(record.teams[t.team].players).men).map(m => m.id);
      ok(1, `${t.team}: the ten checked are the ten the rule picks from today's 26`, JSON.stringify(t.checked.map(c => c.id)) === JSON.stringify(want));
      ok(1, `${t.team}: ESPN's page and data are named`, /espn\.com/.test(t.espnPage) && /espn\.com/.test(t.espnData));
      n += t.checked.length;
      bad += t.checked.filter(c => c.result !== 'agrees').length;
    }
    ok(1, `the spot check covers ${SPOT_TEAMS.length * SPOT_PER_TEAM} men`, n === SPOT_TEAMS.length * SPOT_PER_TEAM, String(n));
    ok(1, `the spot check disagreement is inside ${SPOT_LIMIT * 100} percent`, n > 0 && bad / n <= SPOT_LIMIT, `${bad} of ${n}`);
    console.log(`   ${n} men checked against ESPN, ${bad} disagree`);
  }
}

/* ---- 2. the data file is the generator's output -------------------------- */
console.log('2) the data file is exactly what the generator makes of the record');
{
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'genMlbFrontOfficeRoster.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8' });
  ok(2, 'genMlbFrontOfficeRoster --check exits 0', r.status === 0, (r.stdout + r.stderr).trim().split('\n').slice(-3).join(' | '));
  const head = fs.existsSync(DATA) ? fs.readFileSync(DATA, 'utf8').slice(0, 400) : '';
  ok(2, 'the data file says it is generated and from what', /GENERATED by scripts\/genMlbFrontOfficeRoster\.mjs/.test(head) && head.includes('mlbRosters2026.json') && head.includes('mlbStats2026.json'));
}

/* ---- 3. every shipped man is a record row -------------------------------- */
console.log('3) every shipped man is a record row, rated and aged by the rule');
let shipped = 0, partialN = 0;
{
  const R = D ? D.MLB_FO_ROSTERS_2026 : {};
  ok(3, 'the data file ships all 30 clubs', GAME_TEAMS.every(a => Array.isArray(R[a])) && Object.keys(R).length === 30, Object.keys(R).length);
  const seen = new Set();
  let dup = 0;
  const partialNames = [];
  const selected = Object.fromEntries(GAME_TEAMS.map(a => [a, selectTwentySix(record.teams[a].players).men]));
  const shownAs = gameNames(selected);
  for (const a of GAME_TEAMS) {
    const rows = R[a] ?? [];
    ok(3, `${a}: 26 men`, rows.length === 26, String(rows.length));
    const byName = new Map(selected[a].map(m => [shownAs.get(m.id), m]));
    for (const row of rows) {
      shipped += 1;
      if (seen.has(row.name)) dup += 1;
      seen.add(row.name);
      const m = byName.get(row.name);
      ok(3, `${a}: ${row.name} is one of the club's 26 in the record`, !!m);
      if (!m) continue;
      const rated = rateMan(m, pools);
      ok(3, `${a}: ${row.name} on the major league roster on the record date`, onMajorLeagueRoster(m.status), m.status);
      ok(3, `${a}: ${row.name} is ${ageOn(m.birthDate, record.meta.rosterDate)} from his birth date`, row.age === ageOn(m.birthDate, record.meta.rosterDate), String(row.age));
      ok(3, `${a}: ${row.name} rated ${rated.ovr} ${rated.pos} by the rule`, row.ovr === rated.ovr && row.pos === rated.pos, `${row.ovr} ${row.pos}`);
      ok(3, `${a}: ${row.name} partial mark follows the rule`, !!row.partial === rated.partial);
      if (row.partial) partialNames.push(row.name);
    }
    const hitters = rows.filter(p => !isP(p)).length;
    const sp = rows.filter(p => p.pos === 'SP').length;
    const pen = rows.filter(p => p.pos === 'RP' || p.pos === 'CL').length;
    ok(3, `${a}: can field nine hitters, five starters and a bullpen of five`, hitters >= 9 && sp >= 5 && pen >= 5, `${hitters} hitters, ${sp} SP, ${pen} RP`);
  }
  partialN = partialNames.length;
  ok(3, 'no name is shipped twice', dup === 0, String(dup));
  ok(3, 'MLB_FO_PARTIAL lists exactly the partial ratings', D && JSON.stringify([...D.MLB_FO_PARTIAL].sort()) === JSON.stringify(partialNames.sort()));
  console.log(`   ${shipped} men shipped, ${partialN} ratings marked partial`);
}

/* ---- 4. a new league ----------------------------------------------------- */
console.log('4) a new league: 26 real men a club, nobody invented, the payroll rule');
{
  const R = D ? D.MLB_FO_ROSTERS_2026 : {};
  let lo = Infinity, hi = -Infinity;
  for (const seed of SEEDS) {
    const lg = E.initMlbLeague(lcg(seed));
    for (const a of GAME_TEAMS) {
      const t = lg.teams[a];
      const data = new Map((R[a] ?? []).map(s => [s.name, s]));
      ok(4, `seed ${seed} ${a}: 26 men, all from the data file`, t.players.length === 26 && t.players.every(p => data.has(p.name)), `${t.players.length}, ${t.players.filter(p => !data.has(p.name)).map(p => p.name).join(' ')}`);
      ok(4, `seed ${seed} ${a}: dealt as a depth club`, t.depth === E.MLB_DEPTH);
      const core = new Set(E.mlbSimReads(t));
      const priced = t.players.every(p => (core.has(p.id) ? p.salary === E.mlbSalaryFor(p.ovr) : p.salary === E.MLB_DEPTH_SALARY));
      ok(4, `seed ${seed} ${a}: the 13 the sim reads at the full price, the rest on depth deals`, priced && core.size === 13, `${core.size} read`);
      const pay = E.mlbCapUsed(t);
      lo = Math.min(lo, pay); hi = Math.max(hi, pay);
      ok(4, `seed ${seed} ${a}: opening payroll under the tax line`, pay <= lg.cap, `${pay} against ${lg.cap}`);
      ok(4, `seed ${seed} ${a}: ages and ratings are the data's`, t.players.every(p => data.get(p.name) && data.get(p.name).age === p.age && data.get(p.name).ovr === p.ovr));
    }
  }
  console.log(`   opening payrolls ${Math.round(lo)} to ${Math.round(hi)} against the line`);
}

/* ---- 5. the bench never moves a result ----------------------------------- */
console.log('5) the bench never moves a result');
{
  const reads = t => new Set(E.mlbSimReads(t));
  let compared = 0, total = 0, ilSame = 0, ilTotal = 0, strengthSame = 0;
  const moved = [];
  for (const seed of SEEDS) {
    const A = E.initMlbLeague(lcg(seed));
    /* (a) the strength of 26 is the strength of the 13 it reads */
    for (const a of GAME_TEAMS) {
      const t = A.teams[a];
      const core = reads(t);
      const only = { ...t, players: t.players.filter(p => core.has(p.id)) };
      if (Math.abs(E.mlbStrength(t) - E.mlbStrength(only)) < 1e-9) strengthSame += 1;
    }
    /* (b) a twin with four more depth hitters a club, rated under everybody */
    const B = clone(A);
    let k = 0;
    for (const a of GAME_TEAMS) {
      for (const pos of ['C', '1B', 'LF', 'DH']) {
        k += 1;
        B.teams[a].players.push({ id: `twin${k}`, name: `Twin Depthman ${k}`, pos, age: 30, ovr: 50, salary: 0.7, years: 1, out: 0, pot: 50 });
      }
    }
    const ra = lcg(seed + 11), rb = lcg(seed + 11);
    for (let r = 1; r <= E.MLB_ROUNDS; r += 1) {
      E.simMlbRound(A, 'NYY', ra);
      E.simMlbRound(B, 'NYY', rb);
      /* the IL during the games is what the round left behind */
      for (const a of GAME_TEAMS) {
        for (const p of A.teams[a].players) {
          const q = B.teams[a].players.find(x => x.id === p.id);
          ilTotal += 1;
          if (q && q.out === p.out) ilSame += 1;
        }
      }
      const comparable = GAME_TEAMS.every(a => Math.abs(E.mlbStrength(A.teams[a]) - E.mlbStrength(B.teams[a])) < 1e-9);
      total += 1;
      if (!comparable) continue;
      compared += 1;
      const same = GAME_TEAMS.every(a => A.teams[a].wins === B.teams[a].wins && A.teams[a].losses === B.teams[a].losses);
      if (!same) moved.push(`seed ${seed} round ${r}`);
    }
    /* (c) printed, not asserted: against a 13 man twin, what moves and why */
    const A2 = E.initMlbLeague(lcg(seed));
    const C = clone(A2);
    for (const a of GAME_TEAMS) { const core = reads(C.teams[a]); C.teams[a].players = C.teams[a].players.filter(p => core.has(p.id)); }
    const r2a = lcg(seed + 23), r2c = lcg(seed + 23);
    for (let r = 1; r <= E.MLB_ROUNDS; r += 1) { E.simMlbRound(A2, 'NYY', r2a); E.simMlbRound(C, 'NYY', r2c); }
    const diffs = GAME_TEAMS.map(a => Math.abs(A2.teams[a].wins - C.teams[a].wins));
    if (seed === SEEDS[0]) console.log(`   against a 13 man twin (seed ${seed}): ${diffs.filter(d => d > 0).length} of 30 clubs end on a different win total, mean ${(diffs.reduce((s, d) => s + d, 0) / 30).toFixed(1)} wins. Why: when one of the 13 is on the IL the 26 man club plays its next man, the 13 man club plays short (the strength averages fewer men), and that changes the strengths in those games.`);
  }
  ok(5, 'every club\'s strength with 26 equals its strength with the 13 it reads', strengthSame === SEEDS.length * 30, `${strengthSame} of ${SEEDS.length * 30}`);
  ok(5, 'the depth twins put the same men on the IL every round', ilSame === ilTotal, `${ilTotal - ilSame} of ${ilTotal} differ`);
  ok(5, 'nearly every round is comparable (no twin depth man reached a read)', compared >= total * 0.95, `${compared} of ${total}`);
  ok(5, 'every comparable round ends with the same record for every club', moved.length === 0, moved.slice(0, 4).join(', '));
  console.log(`   ${compared} of ${total} twin rounds compared, ${moved.length} moved; IL identical on ${ilSame} of ${ilTotal} man rounds`);
}

/* ---- 6. ten franchises, five seasons -------------------------------------- */
console.log('6) ten franchises, five seasons each');
function playSeason(lg, myTeam, rng) {
  for (let r = 1; r <= E.MLB_ROUNDS; r += 1) {
    E.simMlbRound(lg, myTeam, rng);
    E.mlbAiMoves(lg, myTeam, rng);
    if (r < E.MLB_ROUNDS) lg.round += 1;
  }
  const po = E.runMlbPlayoffs(lg, rng);
  lg.champions.push({ season: lg.season, team: po.champion });
  /* the board's draft: my pick, then five rival picks per pick, worst first */
  let cls = E.mlbDraftClass(rng, 24, names(lg));
  for (let pick = 0; pick < 2; pick += 1) {
    const mine = cls[0];
    lg.teams[myTeam].players.push(E.mlbProspectToPlayer(mine, rng));
    const remaining = cls.filter(p => p.id !== mine.id);
    const ai = remaining.slice(0, 5);
    const order = E.mlbStandings(lg).map(t => t.abbr).reverse().filter(a => a !== myTeam);
    ai.forEach((p, i) => lg.teams[order[i % order.length]].players.push(E.mlbProspectToPlayer(p, rng)));
    cls = remaining.filter(p => !ai.includes(p));
  }
  E.mlbOffseason(lg, rng);
}
{
  let seasons = 0;
  for (let i = 0; i < SEEDS.length; i += 1) {
    const seed = SEEDS[i];
    const myTeam = GAME_TEAMS[(i * 3) % 30];
    const rng = lcg(seed + 5);
    let lg;
    try {
      lg = E.initMlbLeague(rng);
      for (let s = 0; s < 5; s += 1) {
        playSeason(lg, myTeam, rng);
        seasons += 1;
        const shortClubs = GAME_TEAMS.filter(a => {
          const t = lg.teams[a];
          return t.players.filter(p => !isP(p)).length < 9 || t.players.filter(p => p.pos === 'SP').length < 5 || t.players.filter(p => p.pos === 'RP' || p.pos === 'CL').length < 5 || t.players.length < E.MLB_ROSTER_MIN;
        });
        ok(6, `seed ${seed} (${myTeam}) season ${s + 1}: every club fields nine hitters, five starters and five relievers`, shortClubs.length === 0, shortClubs.join(' '));
        const all = [...Object.values(lg.teams).flatMap(t => t.players), ...lg.freeAgents];
        ok(6, `seed ${seed} season ${s + 1}: no name twice`, new Set(all.map(p => p.name)).size === all.length);
        ok(6, `seed ${seed} season ${s + 1}: no id twice`, new Set(all.map(p => p.id)).size === all.length);
      }
      ok(6, `seed ${seed}: five champions recorded`, lg.champions.length === 5);
    } catch (e) {
      ok(6, `seed ${seed} (${myTeam}): five seasons without a crash`, false, String(e && e.stack ? e.stack : e).slice(0, 300));
    }
  }
  console.log(`   ${seasons} seasons played across ${SEEDS.length} franchises`);
}

/* ---- 7. an old save ------------------------------------------------------ */
console.log('7) an old save replays exactly as it did before this round');
{
  const fx = fs.existsSync(FIXTURE) ? JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) : null;
  ok(7, 'the legacy fixture is present', !!fx && fx.rows.length === FIXTURE_SEEDS.length);
  for (const row of fx ? fx.rows : []) {
    const lg = clone(row.start);
    ok(7, `seed ${row.seed}: the old save carries no depth mark`, Object.values(lg.teams).every(t => t.depth === undefined));
    ok(7, `seed ${row.seed}: the old save reads the old limits`, E.mlbRosterMin(lg.teams[row.team]) === E.MLB_LEGACY_ROSTER_MIN && E.mlbRosterMax(lg.teams[row.team]) === E.MLB_LEGACY_ROSTER_MAX);
    let log, end;
    try {
      E.ensureMlbLeagueIds(lg);
      log = legacyRecipe(lg, row.team, lcg(row.rngSeed));
      end = projectLeague(lg);
    } catch (e) {
      ok(7, `seed ${row.seed}: the old save plays`, false, String(e && e.message ? e.message : e).slice(0, 200));
      continue;
    }
    ok(7, `seed ${row.seed}: every move and every round as before`, JSON.stringify(log) === JSON.stringify(row.log),
      (() => { const i = log.findIndex((l, j) => JSON.stringify(l) !== JSON.stringify(row.log[j])); return i < 0 ? 'lengths differ' : `first difference at step ${i}: ${JSON.stringify(log[i])} vs ${JSON.stringify(row.log[i])}`; })());
    ok(7, `seed ${row.seed}: the end state is byte for byte the old engine's`, sha(end) === row.endSha256);
  }
}

/* ---- 8. the boards under vitest ------------------------------------------ */
if (CONTROL) console.log('8) skipped under a control: the controls edit bundled copies, vitest reads src');
else {
  console.log('8) the boards under vitest');
  const vitest = (() => { for (const base of [ROOT, path.resolve(ROOT, '..'), path.resolve(ROOT, '../..'), path.resolve(ROOT, '../../..')]) { const p = path.join(base, 'node_modules', 'vitest', 'vitest.mjs'); if (fs.existsSync(p)) return p; } return null; })();
  ok(8, 'vitest is installed', !!vitest);
  if (vitest) {
    const files = ['src/components/front-office-shared/FrontOfficeSeasonClose.test.tsx', 'src/test/mlbFullRosters.test.tsx'];
    const r = spawnSync(process.execPath, [vitest, 'run', ...files], { cwd: ROOT, encoding: 'utf8', timeout: 200000 });
    const outText = `${r.stdout}\n${r.stderr}`;
    const passed = /Test Files\s+\d+ passed/.test(outText) && !/failed/.test(outText.split('Test Files').pop());
    ok(8, 'the season close test and the MLB full roster test pass', r.status === 0 && passed, outText.split('\n').filter(l => /Test Files|Tests|FAIL|failed/.test(l)).slice(0, 6).join(' | '));
  }
}

/* ---- verdict ------------------------------------------------------------- */
console.log('');
if (CONTROL) {
  const want = EXPECT[CONTROL];
  const fired = want.every(s => red.has(s));
  console.log(`control ${CONTROL}: wanted red ${want.join(', ')}, got red ${[...red].sort().join(', ') || 'nothing'}`);
  for (const f of fails.slice(0, 6)) console.log(`   ${f}`);
  if (!fired) { console.log(`FAIL: control ${CONTROL} did not turn its sections red`); process.exit(1); }
  console.log(`simMlbFullRosters: control ${CONTROL} fired as designed (${checks} checks)`);
  process.exit(0);
}
for (const f of fails.slice(0, 40)) console.log(`FAIL ${f}`);
if (fails.length) { console.log(`simMlbFullRosters: ${fails.length} of ${checks} checks failed`); process.exit(1); }
console.log(`simMlbFullRosters: all ${checks} checks pass`);
