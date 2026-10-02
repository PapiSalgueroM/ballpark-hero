/* NFL Front Office: the whole club. Round 828.

   The owner: "we are yet to have way more leagues and players for ... all the
   gm games". NFL Front Office shipped fifteen real men a club. A new league
   now carries every club's real active roster (the fifteen starters plus the
   bench, src/data/frontOfficeDepth.ts) and its practice squad, both baked by
   scripts/genFrontOfficeRoster.mjs. This harness fences what that promised:

     1) THE DATA. Every club carries its real active roster in the eight
        groups the game knows (the 53 less kickers, punters and long snappers,
        plus starters back from a reserve list) and its practice squad. Every
        bench and practice squad man is matched to a row of that club with
        that status on the committed record of the release (scripts/data/
        nflRosters2026.json), so nobody is invented, and the bake is redone
        from that record and must match the three committed files (the two
        data files and the left out list) byte for byte. The second source record
        (scripts/data/nflRosterSecondSource.json: three clubs, ten men each,
        checked against the club's own site and ESPN) must agree with the
        bake. The engine's constants agree with the generator's: the starter
        shape is the bake's SLOTS, the backup band is the bake's DEPTH_SCALE,
        and the refill targets are the medians of the real rosters.
     2) THE BENCH SITS UNDER THE STARTERS. Every bench and practice squad
        rating is on the backup band, under every starter at his position on
        every club, and above the engine's replacement level, so an empty
        slot is never worth more than a real man.
     3) EVERY GROUP CAN FIELD ITS STARTERS: every club, at the start and
        after every offseason of the franchises in section 6.
     4) THE BENCH MOVES NO RESULT. For one seed a full league and a fifteen
        man league open on the same starters, the same market and the same
        fixtures. Every club's strength is the same, to 1e-9, with the bench
        fit or hurt; a season played on those fixtures gives the same score
        in every game; and the strength of a full club is exactly that of the
        same club cut back to the men the chart starts.
     5) WHAT DOES MOVE, measured: with the board's weekly loop (injuries and
        CPU signings on), a starter who is hurt is now replaced by his
        backup. The share of club weeks with a backup in a starting unit is
        reported, and the season win totals of the two leagues stay in step
        club by club (rank correlation over many seeds, band measured).
     6) TEN FRANCHISES, FIVE SEASONS EACH, the way the board plays them: the
        weekly loop, three draft picks, the franchise tag, a cut, a signing,
        the offseason. Every computer club opens and ends every offseason at
        or under 53; the GM's own club is never cut behind his back (the
        shape MLB and the NHL use): when the draft or the Giants' opening 54
        puts him over, he owes the cut, the week will not play, and he cuts
        through the shared release, so every club enters every season at 53
        or under. Every cut costs exactly the dead money the cuts module says, a tagged
        man never reaches the pool, every drafted man is on his club (the
        roster or the practice squad) unless the cut to 53 released him, the
        refill calls up practice squad men before it invents anybody, ids
        and names stay unique, the cap
        holds for every club, and the save stays inside its size budget. The
        cut to 53 is a real cut (cutPlayer: the pool, dead money, no way back
        this season), checked directly on a club six men over.
     7) AN OLD SAVE LOADS AND PLAYS AS IT DID. A fifteen man league is played
        for three seasons, the board's way, by this engine and by the engine
        as it stood before this round (read from git at BASE), from one seed.
        Every league state after every week and offseason is identical, and
        the old save never grows a bench: it is not topped up.
     8) THE BOARD, under vitest (src/components/front-office/
        FrontOfficeFullRoster.test.tsx): a full roster's Roster box opens on
        group tiles, a practice squad man is called up while there is a spot,
        the call up and every Sign are greyed with the reason at 53, a tapped
        team starts a league with the whole club, a rating that is only a
        draft spot carries its mark on the depth chart and both trade lists,
        a Giants GM (54 at the opening) finds Play locked with the count he
        owes until he cuts one man himself, and a fifteen man save keeps its
        old list.

   MEASUREMENTS (2026-10-01, the bake of that day, the harness's own seeds):
     Section 1: active rosters 50 to 54 a club (1638 men), practice squads 15
     to 18 (525); 1683 of 1683 bench and practice squad men found on their
     club, with their status, on the committed record of the release's week
     4; the bake of the record matches all three committed files, 360 men
     left out with a reason; second source 28 of 30 settled by both sources,
     28 of 28 agreeing with the bake, 2 split (an elevated practice squad
     tight end, a fresh signing); the review's spot check 60 men over six
     clubs, 59 settled, 1 split, 1 held out on position (James Ester).
     Section 4: 192 clubs, fit and with 3363 bench men hurt, 0 strength
     differences; 1632 games replayed, 0 different.
     Section 5, over four sets of forty seasons (NFL_FULL_SEED_BASE 5000,
     100, 900, 3000): a backup in a starting unit in 22.0 to 23.4 percent of
     club weeks; rank correlation of mean wins per club 0.959 to 0.972; mean
     gap 0.29 to 0.42 wins a club; spread of wins inside a season 2.81 to
     2.94 full against 2.83 to 2.90 fifteen man. Bands: share above 0.05
     (the bench does play), correlation at least 0.90, gap at most 0.6.
     Section 6: 50 seasons, 50 cuts with the rule's dead money, 50 signings
     refused at 53, 50 tags, 1050 draftees all on their clubs; 4509 men
     called up and 6564 depth men invented over 500 club offseasons, none of
     them while a practice squad man at his position waited; 40 computer
     club men released in the cut to 53, none of them draftees, and none of
     the GM's; the GM owed a cut before 7 of 50 seasons (the Giants' opening
     54 among them) and made 13 cuts himself; biggest practice squad 18;
     biggest save 300K (budget 700K); highest payroll 90.6 percent of the
     cap; real men still 63 to 65 percent of the active rosters after five
     seasons. (Re-measured 2026-10-01 after the follow up that stopped the
     offseason cutting the GM's club; before it, 46 released and 93.5.)
     Section 7: 162 league states over three seeds and three seasons, 0
     different from the engine at 1d2e5d96.

   CONTROLS, through NFL_FULL_CONTROL. Each rewrites a copy of the engine or
   the depth data in OS temp (src is never touched), refuses to run if its
   anchor is missing, and must turn its sections red:
     allbench     a full club's units read every healthy man     -> 4
     benchabove   the bench rated 10 above its band              -> 2, 4
     inventfirst  the refill invents before it calls anybody up  -> 6
     nocutdown    the offseason never cuts down to 53            -> 6
     deepold      every club reads its units the full roster way -> 7
     bigbench     every bench salary six times larger            -> 6
     sharedcopy   the finder's probe copy is the club itself     -> 6
     promoteover  a call up ignores the 53                        -> 6
     autocut      the offseason cuts the GM's own club too         -> 6
     declinefloor a decline lifts a 61 back to the old floor 62    -> 6
     recordedit   the record moves one KC bench man to DEN        -> 1
     noheld       the bake ignores the spot check's held out list -> 1
     spotstale    the spot check is dated a month before the record -> 1
   Under a control the process exits non zero whether or not the expected
   sections went red, and says which it was.

   Run: node scripts/simNflFullRosters.mjs
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = path.join(ROOT, 'src', 'lib', 'frontOffice.ts');
const DEPTH_FILE = path.join(ROOT, 'src', 'data', 'frontOfficeDepth.ts');
const CONTROL = process.env.NFL_FULL_CONTROL || '';
/* The engine as it stood before this round, for section 7. */
const BASE = '1d2e5d96';
const EXPECT = {
  allbench: [4],
  benchabove: [2, 4],
  inventfirst: [6],
  nocutdown: [6],
  deepold: [7],
  sharedcopy: [6],
  promoteover: [6],
  autocut: [6],
  declinefloor: [6],
  bigbench: [6],
  recordedit: [1],
  noheld: [1],
  spotstale: [1],
};
if (CONTROL && !EXPECT[CONTROL]) {
  console.error(`NFL_FULL_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(EXPECT).join(', ')})`);
  process.exit(1);
}
/* engine rewrites: [anchor, replacement], each anchor exactly once */
const ENGINE_SWAPS = {
  allbench: [[
    '  if (team.rosterDepth !== 2) return team.players.filter(p => p.out === 0 && groups.includes(p.pos));',
    '  return team.players.filter(p => p.out === 0 && groups.includes(p.pos));',
  ]],
  inventfirst: [[
    '      const up = (t.practice ?? []).filter(p => p.pos === g).sort((a, b) => b.ovr - a.ovr)[0];',
    '      const up = undefined as GmPlayer | undefined;',
  ]],
  nocutdown: [[
    '  while (t.players.length > DEEP_ROSTER_MAX) {',
    '  while (false) {',
  ]],
  autocut: [[
    '    if (t.rosterDepth === 2 && t.abbr !== userTeam) out.push(...cutDownToMax(t, league.freeAgents));',
    '    if (t.rosterDepth === 2) out.push(...cutDownToMax(t, league.freeAgents));',
  ]],
  promoteover: [[
    '  if (idx < 0 || deepRosterRefusal(team)) return false;',
    '  if (idx < 0) return false;',
  ]],
  declinefloor: [[
    'const declined = (ovr: number, by: number): number => Math.max(Math.min(62, ovr), ovr - by);',
    'const declined = (ovr: number, by: number): number => Math.max(62, ovr - by);',
  ]],
  sharedcopy: [[
    '  return { ...t, players: [...t.players], picks: [...t.picks] };',
    '  return t;',
  ]],
  deepold: [[
    '  if (team.rosterDepth !== 2) return team.players.filter(p => p.out === 0 && groups.includes(p.pos));',
    '  if (false) return team.players.filter(p => p.out === 0 && groups.includes(p.pos));',
  ]],
};
const NOTE = {
  allbench: 'the engine copy lets a full club\'s units read every healthy man, the fifteen man rule',
  benchabove: 'the depth data copy rates every bench and practice squad man 10 higher',
  inventfirst: 'the engine copy never calls a practice squad man up; it invents',
  nocutdown: 'the engine copy never cuts a full club down to 53',
  deepold: 'the engine copy reads every club the full roster way, old saves included',
  sharedcopy: 'the engine copy hands the Trade Finder the clubs themselves instead of a copy',
  promoteover: 'the engine copy lets a call up through at 53',
  autocut: 'the engine copy cuts the GM\'s own club down to 53 behind his back, as the round first shipped',
  declinefloor: 'the engine copy lifts any man under 62 back to 62 when he declines',
  bigbench: 'the depth data copy pays every bench man six times his salary',
  recordedit: 'the record moves one KC bench man to DEN, in memory',
  noheld: 'the bake ignores the spot check\'s held out list',
  spotstale: 'the spot check is dated a month before the record, in memory',
};
const SECTION_NAMES = {
  1: 'the data: real, current, second sourced, and agreeing with the engine',
  2: 'the bench sits under the starters',
  3: 'every group can field its starters',
  4: 'the bench moves no result',
  5: 'what does move, measured',
  6: 'ten franchises, five seasons each',
  7: 'an old save loads and plays as it did',
  8: 'the board on a full roster, under vitest',
};

let checks = 0;
const fails = [];
const bySection = new Map();
const ok = (section, label, pass, detail) => {
  checks += 1;
  const s = bySection.get(section) ?? { n: 0, bad: 0 };
  s.n += 1;
  if (!pass) { s.bad += 1; fails.push(`[${section}] ${label}${detail ? ': ' + detail : ''}`); }
  bySection.set(section, s);
};
const clone = v => JSON.parse(JSON.stringify(v));
const lcg = start => { let seed = start >>> 0; return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; };
const normaliseEol = t => t.split('\r\n').join('\n');
const fwd = p => p.split('\\').join('/');

/* esbuild by walk-up from the repo root, so a worktree inside the repo finds it */
function findUp(rel) {
  let dir = ROOT;
  for (let i = 0; i < 6; i += 1) {
    const c = path.join(dir, rel);
    if (fs.existsSync(c)) return c;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
const ESBUILD = findUp(path.join('node_modules', '.bin', process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild'));

const BUNDLE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nflfull-'));
function bundle(entryText, name) {
  const entry = path.join(BUNDLE_DIR, `${name}.entry.mjs`);
  fs.writeFileSync(entry, entryText);
  const out = path.join(BUNDLE_DIR, `${name}.mjs`);
  execSync(`"${ESBUILD}" "${entry}" --bundle --format=esm --platform=node --alias:@="${path.join(ROOT, 'src')}" --outfile="${out}" --log-level=error`);
  return import(pathToFileURL(out).href);
}

let engine, cuts, data, base = null;
try {
  if (!ESBUILD) throw new Error('esbuild not found by walk-up from the repo root');
  const libDir = fwd(path.join(ROOT, 'src', 'lib'));
  let enginePath = ENGINE;
  let depthPath = DEPTH_FILE;
  if (CONTROL && ENGINE_SWAPS[CONTROL]) {
    const src = normaliseEol(fs.readFileSync(ENGINE, 'utf8'));
    for (const [now] of ENGINE_SWAPS[CONTROL]) {
      const n = src.split(now).length - 1;
      if (n !== 1) throw new Error(`control ${CONTROL}: ${JSON.stringify(now.slice(0, 70))} appears ${n} times in frontOffice.ts, not once. Refusing to run.`);
    }
    let text = src;
    for (const [now, was] of ENGINE_SWAPS[CONTROL]) text = text.split(now).join(was);
    if (text === src) throw new Error(`control ${CONTROL}: the rewrite changed nothing. Refusing to run.`);
    text = text.replace(/from '\.\/([A-Za-z0-9_-]+)'/g, `from '${libDir}/$1'`);
    enginePath = path.join(BUNDLE_DIR, 'frontOfficeControl.ts');
    fs.writeFileSync(enginePath, text);
    console.log(`   control ${CONTROL}: ${NOTE[CONTROL]}`);
  }
  if (CONTROL === 'benchabove' || CONTROL === 'bigbench') {
    const src = normaliseEol(fs.readFileSync(DEPTH_FILE, 'utf8'));
    const ROWX = /\{ name: '((?:[^'\\]|\\.)*)', pos: '(\w+)', age: (\d+), ovr: (\d+), salary: ([\d.]+), years: (\d+) \}/g;
    let n = 0;
    const text = src.replace(ROWX, (m, name, pos, age, ovr, salary, years) => {
      n += 1;
      return CONTROL === 'benchabove'
        ? `{ name: '${name}', pos: '${pos}', age: ${age}, ovr: ${Number(ovr) + 10}, salary: ${salary}, years: ${years} }`
        : `{ name: '${name}', pos: '${pos}', age: ${age}, ovr: ${ovr}, salary: ${Math.round(Number(salary) * 60) / 10}, years: ${years} }`;
    });
    if (n < 1000 || text === src) throw new Error(`control ${CONTROL}: rewrote ${n} depth rows, too few to mean anything. Refusing to run.`);
    depthPath = path.join(BUNDLE_DIR, 'frontOfficeDepthControl.ts');
    fs.writeFileSync(depthPath, text.replace("from './frontOfficePlayers'", `from '${fwd(path.join(ROOT, 'src', 'data', 'frontOfficePlayers'))}'`));
    console.log(`   control ${CONTROL}: ${NOTE[CONTROL]} (${n} rows)`);
  }
  const mod = await bundle([
    `export * as engine from ${JSON.stringify(fwd(enginePath))};`,
    `export * as cuts from ${JSON.stringify(fwd(path.join(ROOT, 'src', 'lib', 'frontOfficeCuts.ts')))};`,
    `export { FO_DEPTH, FO_DEPTH_WEEK } from ${JSON.stringify(fwd(depthPath))};`,
    `export { FO_TEAMS } from ${JSON.stringify(fwd(path.join(ROOT, 'src', 'data', 'frontOfficePlayers.ts')))};`,
    `export { findTrades } from ${JSON.stringify(fwd(path.join(ROOT, 'src', 'lib', 'tradeFinder.ts')))};`,
  ].join('\n'), 'current');
  engine = mod.engine;
  cuts = mod.cuts;
  data = { FO_DEPTH: mod.FO_DEPTH, FO_TEAMS: mod.FO_TEAMS, week: mod.FO_DEPTH_WEEK, findTrades: mod.findTrades };
} catch (e) {
  console.error(`FAIL: the engine could not be bundled and run: ${String(e && e.message ? e.message : e).slice(0, 300)}`);
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
  process.exit(1);
}
for (const fn of ['initLeague', 'runOffseason', 'teamStrength', 'unitStarters', 'starterIds', 'depthOrder', 'simGame', 'injuryPass',
  'aiWeeklyMoves', 'releasePlayer', 'signPlayer', 'capUsed', 'capRoom', 'generateDraftClass', 'draftOrder', 'prospectToPlayer',
  'applyFranchiseTag', 'tagRefusal', 'expiringPlayers', 'promoteFromPractice', 'deepRosterRefusal', 'refillDeepRoster', 'cutDownToMax', 'ensureFoLeagueIds', 'tradeProbeCopy', 'proposeTrade', 'tradeValue']) {
  if (typeof engine[fn] !== 'function') { console.error(`FAIL: frontOffice.ts does not export ${fn}`); process.exit(1); }
}

const SEEDS = [828, 20261001, 53, 4242, 9, 1337];
/* NFL_FULL_SEED_BASE re-measures section 5 on another forty seasons on purpose */
const SECTION5_BASE = Number(process.env.NFL_FULL_SEED_BASE || 5000);
const GROUPS = engine.DEPTH_GROUPS;
const deepLeague = seed => engine.initLeague(lcg(seed), { depth: data.FO_DEPTH });
const plainLeague = seed => engine.initLeague(lcg(seed));
/* the fifteen man club a full club starts: the first STARTER_SLOTS men of each group's chart */
const cutBack = team => {
  const keep = new Set(GROUPS.flatMap(g => engine.depthOrder(team, g).slice(0, engine.STARTER_SLOTS[g]).map(p => p.id)));
  const t = clone(team);
  t.players = t.players.filter(p => keep.has(p.id));
  delete t.rosterDepth;
  delete t.practice;
  return t;
};

/* ======================================================================= 1 */
console.log('1) the data: real, current, second sourced, and agreeing with the engine');
{
  const gen = await import(pathToFileURL(path.join(ROOT, 'scripts', 'genFrontOfficeRoster.mjs')).href);
  const teams = data.FO_TEAMS;
  ok(1, 'the depth file covers every club', teams.every(t => data.FO_DEPTH[t.abbr]) && Object.keys(data.FO_DEPTH).length === 32,
    `${Object.keys(data.FO_DEPTH).length} clubs`);
  const active = teams.map(t => t.players.length + (data.FO_DEPTH[t.abbr]?.bench.length ?? 0));
  const ps = teams.map(t => data.FO_DEPTH[t.abbr]?.practice.length ?? 0);
  console.log(`   active roster per club ${Math.min(...active)} to ${Math.max(...active)}, ${active.reduce((a, b) => a + b, 0)} in all; practice squad ${Math.min(...ps)} to ${Math.max(...ps)}, ${ps.reduce((a, b) => a + b, 0)} in all`);
  /* 53 less the three specialists the game has no position for is 50; a
     club a man or two short of 53 on the day, and up to four starters back
     from a reserve list, set the band. Measured 50 to 54. */
  ok(1, 'every club carries its whole active roster (46 to 54 men)', active.every(n => n >= 46 && n <= 54), active.join(' '));
  ok(1, 'every club carries a practice squad (10 to 20 men)', ps.every(n => n >= 10 && n <= 20), ps.join(' '));
  /* no man twice on one club. The league has real namesakes (two Justin
     Jeffersons, two Byron Youngs, two Marcus Harrises on 2026-10-01), so the
     test is per club, where a repeat could only be a bake fault. */
  const dup = [];
  for (const t of teams) {
    const names = [...t.players, ...data.FO_DEPTH[t.abbr].bench, ...data.FO_DEPTH[t.abbr].practice].map(p => p.name);
    dup.push(...names.filter((n, i) => names.indexOf(n) !== i).map(n => `${t.abbr} ${n}`));
  }
  ok(1, 'no man appears twice on one club', dup.length === 0, dup.slice(0, 4).join(', '));
  /* the constants agree */
  ok(1, 'the starter shape is the bake\'s SLOTS', GROUPS.every(g => engine.STARTER_SLOTS[g] === gen.SLOTS[g]),
    JSON.stringify(engine.STARTER_SLOTS));
  ok(1, 'the backup band is the bake\'s DEPTH_SCALE',
    engine.DEPTH_BAND.OL.join() === gen.DEPTH_SCALE.OL.join() && engine.DEPTH_BAND.other.join() === gen.DEPTH_SCALE.skill.join()
    && gen.DEPTH_SCALE.skill.join() === gen.DEPTH_SCALE.def.join(), `${JSON.stringify(engine.DEPTH_BAND)} vs ${JSON.stringify(gen.DEPTH_SCALE)}`);
  const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const medians = Object.fromEntries(GROUPS.map(g => [g, med(teams.map(t => [...t.players, ...data.FO_DEPTH[t.abbr].bench].filter(p => p.pos === g).length))]));
  ok(1, 'the refill targets are the medians of the real active rosters', GROUPS.every(g => engine.DEEP_GROUP_TARGET[g] === medians[g]),
    `engine ${JSON.stringify(engine.DEEP_GROUP_TARGET)}, data ${JSON.stringify(medians)}`);
  ok(1, 'a full roster fits under the real limit', Object.values(engine.DEEP_GROUP_TARGET).reduce((a, b) => a + b, 0) <= engine.DEEP_ROSTER_MAX);

  /* MEMBERSHIP AGAINST THE COMMITTED RECORD, every run (Round 828 review).
     This used to read the gitignored nflverse cache and skip itself when the
     cache was missing, which is every machine but the one that baked. The
     record (scripts/data/nflRosters2026.json) is committed, so the match
     always runs, and the bake is redone from it here and compared with the
     three committed files: a hand edited club, age or rating, or a record
     refreshed without a rebake, goes red. Control recordedit moves one bench
     man to another club in the record, in memory only. */
  const record = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'nflRosters2026.json'), 'utf8'));
  const spotCheck = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'nflRosterSpotCheck.json'), 'utf8'));
  let bakedLeftOut = [];
  let bakedDepth = [];
  if (CONTROL === 'recordedit') {
    const iTeam = record.rosterColumns.indexOf('team');
    const iName = record.rosterColumns.indexOf('full_name');
    const victim = data.FO_DEPTH.KC.bench[0].name;
    const row = record.roster.find(r => r[iTeam] === 'KC' && r[iName] === victim);
    if (!row) throw new Error(`control recordedit: ${victim} is not a KC row of the record, so it would change nothing. Refusing to run.`);
    row[iTeam] = 'DEN';
    console.log(`   control recordedit: the record moves ${victim} from KC to DEN`);
  }
  const { roster: recRows } = gen.recordRows(record);
  ok(1, 'the record is the week the depth file was baked from', record.week === data.week, `record week ${record.week}, file week ${data.week}`);
  {
    const key = (team, name, status) => `${team}|${name}|${status}`;
    const have = new Set(recRows.map(r => key(String(r.team).toUpperCase(), String(r.full_name).trim(), r.status)));
    let matched = 0;
    const missing = [];
    for (const t of teams) {
      for (const [tier, status] of [['bench', 'ACT'], ['practice', 'DEV']]) {
        for (const p of data.FO_DEPTH[t.abbr][tier]) {
          if (have.has(key(t.abbr, p.name, status))) matched += 1;
          else missing.push(`${t.abbr} ${p.name} (${tier})`);
        }
      }
    }
    console.log(`   the record (read ${record.read}, week ${record.week}): ${matched} of ${matched + missing.length} bench and practice squad men found on their club with their status`);
    ok(1, 'every bench and practice squad man is a real row of his club, his status, the latest week', missing.length === 0, missing.slice(0, 4).join(', '));
  }
  {
    const norm = t => t.split('\r\n').join('\n');
    const starterSrc = norm(fs.readFileSync(path.join(ROOT, 'src', 'data', 'frontOfficePlayers.ts'), 'utf8'));
    const spotHeld = CONTROL === 'noheld' ? [] : spotCheck.heldOut;
    if (CONTROL === 'noheld') {
      if (!spotCheck.heldOut.length) throw new Error('control noheld: the spot check holds nobody out, so it would change nothing. Refusing to run.');
      console.log(`   control noheld: the bake ignores the spot check's held out list (${spotCheck.heldOut.map(h => h.name).join(', ')})`);
    }
    const baked = gen.bakeFromRecord(record, gen.readTeamMeta(starterSrc), spotHeld);
    bakedLeftOut = baked.leftOut;
    bakedDepth = baked.depth;
    const files = [
      ['src/data/frontOfficePlayers.ts', baked.text],
      ['src/data/frontOfficeDepth.ts', baked.depthText],
      ['scripts/data/nflRosters2026LeftOut.json', baked.leftJson],
    ];
    const stale = files.filter(([f, want]) => norm(fs.readFileSync(path.join(ROOT, f), 'utf8')) !== want).map(([f]) => f);
    console.log(`   a fresh bake of the record: ${files.length - stale.length} of ${files.length} committed files match it byte for byte; ${baked.leftOut.length} men left out with a reason`);
    ok(1, 'the committed data files are the bake of the committed record', stale.length === 0, stale.join(', '));
    /* every man on a club's active, reserve or practice squad list is either in the game or in the left out list */
    const inGame = teams.reduce((n, t) => n + t.players.length + data.FO_DEPTH[t.abbr].bench.length + data.FO_DEPTH[t.abbr].practice.length, 0);
    ok(1, 'every man on the record is in the game or left out with a reason', inGame + baked.leftOut.length === recRows.length,
      `${inGame} in the game + ${baked.leftOut.length} left out against ${recRows.length} rows`);
  }

  /* the second source record */
  const second = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'nflRosterSecondSource.json'), 'utf8'));
  /* Where the two sources agree with each other they settle the fact, and
     the bake must say the same. Where they disagree (an elevated practice
     squad man, a signing one site has not caught) the man is reported and
     not counted. Measured 2026-10-01: 28 settled, 28 agreeing, 2 split. */
  let settled = 0, total = 0;
  const off = [], split = [];
  for (const club of second.clubs) {
    const roster = new Set([...teams.find(t => t.abbr === club.abbr).players, ...data.FO_DEPTH[club.abbr].bench].map(p => p.name));
    const squad = new Set(data.FO_DEPTH[club.abbr].practice.map(p => p.name));
    for (const m of club.men) {
      total += 1;
      const where = roster.has(m.name) ? 'roster' : squad.has(m.name) ? 'practice' : 'absent';
      if (where !== m.tier) off.push(`${club.abbr} ${m.name}: the bake has him ${where}, the record says ${m.tier}`);
      if (m.clubSite !== m.espn) { split.push(`${club.abbr} ${m.name} (club ${m.clubSite}, ESPN ${m.espn})`); continue; }
      settled += 1;
      if (m.clubSite !== where) off.push(`${club.abbr} ${m.name}: both sources say ${m.clubSite}, the bake says ${where}`);
    }
  }
  console.log(`   second source (${second.checked}): ${settled} of ${total} men settled by both sources, ${split.length} split: ${split.join('; ')}`);
  ok(1, 'the second source record covers three clubs and thirty men', second.clubs.length === 3 && total === 30, `${second.clubs.length} clubs, ${total} men`);
  ok(1, 'at least 25 of the 30 are settled by both sources', settled >= 25, `${settled} settled`);
  ok(1, 'where both sources agree, the bake agrees with them', off.length === 0, off.slice(0, 3).join(' | '));

  /* THE REVIEW'S SPOT CHECK (scripts/data/nflRosterSpotCheck.json): six more
     clubs, ten men each, chosen by a fixed rule, with list, position and age
     off each club's own page and ESPN's on 2026-10-01. Read against what the
     bake actually shipped (bakedDepth, which a control can change), not
     against the record's own tier labels. Measured 2026-10-01: 60 men, 59
     settled on the list by both sources, 1 split (Jaleel McLaughlin, whom a
     news report puts on the 53 as the release does), 1 position both sources
     contradict (James Ester, held out); every age agrees with at least one
     source once the game's 1 September reference is allowed for. */
  {
    const POS_GROUP = { QB: 'QB', RB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE', OL: 'OL', OT: 'OL', T: 'OL', G: 'OL', C: 'OL', DL: 'DL', DE: 'DL', DT: 'DL', NT: 'DL', EDGE: 'DL', LB: 'LB', ILB: 'LB', OLB: 'LB', DB: 'DB', CB: 'DB', S: 'DB', K: 'ST', PK: 'ST', P: 'ST', LS: 'ST' };
    const ageOn = (born, y, m, d) => { const b = new Date(`${born}T00:00:00Z`); let a = y - b.getUTCFullYear(); if (m < b.getUTCMonth() + 1 || (m === b.getUTCMonth() + 1 && d < b.getUTCDate())) a -= 1; return a; };
    let men = 0, settledList = 0;
    const bad = [], splitList = [], ages = [], heldBad = [];
    for (const club of spotCheck.clubs) {
      const core = teams.find(t => t.abbr === club.abbr).players;
      const dep = bakedDepth.find(d => d.abbr === club.abbr) ?? { bench: [], practice: [] };
      const inGame = [...core.map(p => ({ ...p, tier: 'roster' })), ...dep.bench.map(p => ({ ...p, tier: 'roster' })), ...dep.practice.map(p => ({ ...p, tier: 'practice' }))];
      for (const m of club.men) {
        men += 1;
        const g = inGame.find(p => p.name === m.name);
        const where = g ? g.tier : 'absent';
        /* the list: a starter off a reserve list is on the roster by the starters rule */
        const want = s => (s === 'reserve' && g && core.some(p => p.name === m.name) ? 'roster' : s);
        if (m.clubSite !== m.espn) splitList.push(`${club.abbr} ${m.name}`);
        else {
          settledList += 1;
          const agreed = want(m.clubSite);
          const specialist = POS_GROUP[m.clubPos] === 'ST' && POS_GROUP[m.espnPos] === 'ST';
          if (specialist) {
            if (where !== 'absent' || !bakedLeftOut.some(x => x.team === club.abbr && x.name === m.name && /kicker, punter/.test(x.reason))) bad.push(`${club.abbr} ${m.name}: a specialist, but the bake has him ${where}`);
          } else if (where === 'absent') {
            if (!bakedLeftOut.some(x => x.team === club.abbr && x.name === m.name && /second source/.test(x.reason))) bad.push(`${club.abbr} ${m.name}: both sources say ${m.clubSite}, the bake drops him with no second source reason`);
          } else if (where !== agreed) bad.push(`${club.abbr} ${m.name}: both sources say ${m.clubSite}, the bake says ${where}`);
        }
        /* the position: where both sources agree on a group the bake does not use for him, he must be held out */
        const cg = POS_GROUP[m.clubPos], eg = POS_GROUP[m.espnPos];
        if (cg && cg === eg && cg !== 'ST') {
          const shipped = g ? g.pos : null;
          if (shipped && shipped !== cg) heldBad.push(`${club.abbr} ${m.name}: both sources say ${cg}, the game ships him at ${shipped}`);
          if (!shipped && !bakedLeftOut.some(x => x.team === club.abbr && x.name === m.name)) heldBad.push(`${club.abbr} ${m.name}: missing from the game and from the left out list`);
        }
        /* the age: the game's age is on 1 September; the sources printed theirs on 2026-10-01 */
        if (g) {
          const sep = ageOn(m.born, 2026, 9, 1), oct = ageOn(m.born, 2026, 10, 1);
          if (g.age !== sep) ages.push(`${club.abbr} ${m.name}: the game says ${g.age}, his birth date says ${sep}`);
          else if (m.ages.clubSite !== oct && m.ages.espn !== oct) ages.push(`${club.abbr} ${m.name}: born ${m.born} (${oct} on the day read), club page ${m.ages.clubSite}, ESPN ${m.ages.espn}`);
        }
      }
    }
    console.log(`   spot check (${spotCheck.read}): ${men} men over ${spotCheck.clubs.length} clubs, ${settledList} settled on the list by both sources, ${splitList.length} split (${splitList.join(', ')}); held out by the second source: ${spotCheck.heldOut.map(h => `${h.team} ${h.name}`).join(', ') || 'nobody'}`);
    ok(1, 'the spot check covers six clubs and sixty men', spotCheck.clubs.length === 6 && men === 60, `${spotCheck.clubs.length} clubs, ${men} men`);
    ok(1, 'at least 55 of the 60 are settled on the list by both sources', settledList >= 55, `${settledList} settled`);
    ok(1, 'where both sources agree on the list, the bake agrees (specialists left out with the reason)', bad.length === 0, bad.slice(0, 3).join(' | '));
    ok(1, 'where both sources agree on a position the release contradicts, the man is held out with the reason', heldBad.length === 0, heldBad.slice(0, 3).join(' | '));
    ok(1, 'every age is the birth date\'s, and at least one source prints the same', ages.length === 0, ages.slice(0, 3).join(' | '));
    /* the generator's own refusal: the spot check must be the record's day,
       with no more than two men the release gets wrong (the NHL bake's bar) */
    const vouch = gen.spotCheckRefusal(CONTROL === 'spotstale' ? { ...spotCheck, read: '2026-09-01' } : spotCheck, record);
    if (CONTROL === 'spotstale') console.log('   control spotstale: the spot check claims to have been read a month before the record');
    ok(1, 'the spot check vouches for the record (same day, at most two men wrong)', vouch === null, vouch ?? '');
  }
}

/* ======================================================================= 2 */
console.log('2) the bench sits under the starters');
{
  const teams = data.FO_TEAMS;
  const startersFloor = { OL: 80, other: 66 };
  let checked = 0;
  const outBand = [], overStarter = [];
  for (const t of teams) {
    for (const tier of ['bench', 'practice']) {
      for (const p of data.FO_DEPTH[t.abbr][tier]) {
        checked += 1;
        const [lo, hi] = p.pos === 'OL' ? engine.DEPTH_BAND.OL : engine.DEPTH_BAND.other;
        if (p.ovr < lo || p.ovr > hi) outBand.push(`${t.abbr} ${p.name} ${p.pos} ${p.ovr}`);
        const own = t.players.filter(s => s.pos === p.pos);
        if (own.some(s => s.ovr <= p.ovr)) overStarter.push(`${t.abbr} ${p.name} ${p.pos} ${p.ovr}`);
      }
    }
    for (const s of t.players) {
      const floor = s.pos === 'OL' ? startersFloor.OL : startersFloor.other;
      if (s.ovr < floor) overStarter.push(`starter ${t.abbr} ${s.name} ${s.ovr} under ${floor}`);
    }
  }
  ok(2, 'every bench and practice squad man is on the backup band', outBand.length === 0, `${outBand.length} of ${checked}: ${outBand.slice(0, 3).join(', ')}`);
  ok(2, 'every bench and practice squad man rates under every starter at his position on his club', overStarter.length === 0,
    `${overStarter.length}: ${overStarter.slice(0, 3).join(', ')}`);
  ok(2, 'the band clears the replacement level, so a real man always beats an empty slot',
    engine.DEPTH_BAND.other[0] > engine.REPLACEMENT_OVR && engine.DEPTH_BAND.OL[0] > engine.REPLACEMENT_OVR);
  /* a new league's chart by rating puts every starter first */
  let charts = 0;
  const chartBad = [];
  for (const seed of SEEDS.slice(0, 2)) {
    const lg = deepLeague(seed);
    for (const t of Object.values(lg.teams)) {
      const startersByName = new Set(data.FO_TEAMS.find(x => x.abbr === t.abbr).players.map(p => p.name));
      for (const g of GROUPS) {
        charts += 1;
        const head = engine.depthOrder(t, g).slice(0, engine.STARTER_SLOTS[g]).map(p => p.name);
        if (!head.every(n => startersByName.has(n))) chartBad.push(`${t.abbr} ${g}: ${head.join(', ')}`);
      }
    }
  }
  ok(2, 'every new chart starts the bake\'s starters', chartBad.length === 0, `${chartBad.length} of ${charts}: ${chartBad.slice(0, 3).join(' | ')}`);
}

/* ======================================================================= 3 */
console.log('3) every group can field its starters');
const fieldsStarters = (lg, where) => {
  const short = [];
  for (const t of Object.values(lg.teams)) {
    for (const g of GROUPS) {
      const n = t.players.filter(p => p.pos === g).length;
      if (n < engine.STARTER_SLOTS[g]) short.push(`${where} ${t.abbr} ${g} ${n}`);
    }
  }
  return short;
};
{
  for (const seed of SEEDS.slice(0, 2)) {
    const lg = deepLeague(seed);
    const short = fieldsStarters(lg, `seed ${seed}`);
    ok(3, `seed ${seed}: every club fields every group's starters at the start`, short.length === 0, short.slice(0, 3).join(', '));
    const invented = Object.values(lg.teams).flatMap(t => [...t.players, ...(t.practice ?? [])])
      .filter(p => !data.FO_TEAMS.some(x => x.players.some(q => q.name === p.name))
        && !Object.values(data.FO_DEPTH).some(d => [...d.bench, ...d.practice].some(q => q.name === p.name)));
    ok(3, `seed ${seed}: nobody on a roster or a practice squad at the start is invented`, invented.length === 0, invented.slice(0, 3).map(p => p.name).join(', '));
  }
}

/* ======================================================================= 4 */
console.log('4) the bench moves no result');
{
  let clubs = 0, strengthBad = [], hurtBench = 0, cutBackBad = [];
  let games = 0, gameBad = [];
  for (const seed of SEEDS) {
    const deep = deepLeague(seed);
    const plain = plainLeague(seed);
    /* the same market and the same fixtures */
    const fa = l => l.freeAgents.map(p => `${p.name}|${p.pos}|${p.ovr}|${p.salary}|${p.pot}`).join(',');
    const fx = l => l.schedule.map(w => w.map(g => `${g.home}-${g.away}`).join(',')).join(';');
    ok(4, `seed ${seed}: the full league opens on the fifteen man league's market`, fa(deep) === fa(plain));
    ok(4, `seed ${seed}: the full league opens on the fifteen man league's fixtures`, fx(deep) === fx(plain));
    const starters = l => Object.values(l.teams).map(t => t.players.filter(p => data.FO_TEAMS.find(x => x.abbr === t.abbr).players.some(q => q.name === p.name))
      .map(p => `${p.name}|${p.ovr}|${p.pot}|${p.age}`).sort().join(',')).join(';');
    ok(4, `seed ${seed}: the full league opens on the same starters, ratings and ceilings`, starters(deep) === starters(plain));
    for (const abbr of Object.keys(deep.teams)) {
      clubs += 1;
      const a = engine.teamStrength(deep.teams[abbr]);
      const b = engine.teamStrength(plain.teams[abbr]);
      if (Math.abs(a - b) > 1e-9) strengthBad.push(`${abbr} ${a.toFixed(3)} vs ${b.toFixed(3)}`);
      const c = engine.teamStrength(cutBack(deep.teams[abbr]));
      if (Math.abs(a - c) > 1e-9) cutBackBad.push(`${abbr} ${a.toFixed(3)} vs cut back ${c.toFixed(3)}`);
      /* the bench hurt changes nothing either */
      const hurt = clone(deep.teams[abbr]);
      const rng = lcg(seed + abbr.length);
      const startersNow = engine.starterIds(hurt);
      for (const p of hurt.players) if (!startersNow.has(p.id) && rng() < 0.5) { p.out = 2; hurtBench += 1; }
      const h = engine.teamStrength(hurt);
      if (Math.abs(a - h) > 1e-9) strengthBad.push(`${abbr} with the bench hurt ${h.toFixed(3)} vs ${a.toFixed(3)}`);
    }
    /* a season on those fixtures, game by game, one rng each */
    const rd = lcg(seed * 7 + 1), rp = lcg(seed * 7 + 1);
    for (let w = 0; w < deep.schedule.length; w += 1) {
      for (let i = 0; i < deep.schedule[w].length; i += 1) {
        const gd = engine.simGame(deep.schedule[w][i], deep.teams, rd);
        const gp = engine.simGame(plain.schedule[w][i], plain.teams, rp);
        games += 1;
        if (gd.winner !== gp.winner || gd.homeScore !== gp.homeScore || gd.awayScore !== gp.awayScore) {
          gameBad.push(`seed ${seed} week ${w + 1} ${gd.home}-${gd.away}: ${gd.homeScore}-${gd.awayScore} vs ${gp.homeScore}-${gp.awayScore}`);
        }
      }
    }
  }
  console.log(`   ${clubs} clubs compared fit and with ${hurtBench} bench men hurt; ${games} games replayed`);
  ok(4, 'every club is as strong as its fifteen man self, bench fit or hurt', strengthBad.length === 0, `${strengthBad.length}: ${strengthBad.slice(0, 3).join(' | ')}`);
  ok(4, 'a full club is exactly as strong as itself cut back to the men the chart starts', cutBackBad.length === 0, cutBackBad.slice(0, 3).join(' | '));
  ok(4, 'every game of a season scores the same with the bench as without it', gameBad.length === 0, `${gameBad.length} of ${games}: ${gameBad.slice(0, 2).join(' | ')}`);
}

/* The board's week: injuries, the CPU's signings, then the games. */
const playWeek = (lg, myTeam, rng) => {
  engine.injuryPass(lg.teams, rng);
  engine.aiWeeklyMoves(lg, myTeam, rng);
  for (const g of lg.schedule[lg.week - 1]) engine.simGame(g, lg.teams, rng);
  lg.week += 1;
};

/* ======================================================================= 5 */
console.log('5) what does move, measured');
{
  const N = 40;
  let clubWeeks = 0, benchStarting = 0;
  const winsDeep = {}, winsPlain = {};
  const sd = a => { const m = a.reduce((s, x) => s + x, 0) / a.length; return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length); };
  const spreadDeep = [], spreadPlain = [];
  for (let i = 0; i < N; i += 1) {
    const seed = SECTION5_BASE + i;
    const deep = deepLeague(seed), plain = plainLeague(seed);
    const benchIds = new Set(Object.values(deep.teams).flatMap(t => {
      const starters = new Set(data.FO_TEAMS.find(x => x.abbr === t.abbr).players.map(p => p.name));
      return t.players.filter(p => !starters.has(p.name)).map(p => p.id);
    }));
    const rd = lcg(seed * 3 + 1), rp = lcg(seed * 3 + 1);
    for (let w = 0; w < engine.REGULAR_WEEKS; w += 1) {
      playWeek(deep, 'KC', rd);
      playWeek(plain, 'KC', rp);
      for (const t of Object.values(deep.teams)) {
        clubWeeks += 1;
        if ([...engine.starterIds(t)].some(id => benchIds.has(id))) benchStarting += 1;
      }
    }
    for (const t of Object.values(deep.teams)) (winsDeep[t.abbr] ||= []).push(t.wins);
    for (const t of Object.values(plain.teams)) (winsPlain[t.abbr] ||= []).push(t.wins);
    spreadDeep.push(sd(Object.values(deep.teams).map(t => t.wins)));
    spreadPlain.push(sd(Object.values(plain.teams).map(t => t.wins)));
  }
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  const clubs = Object.keys(winsDeep);
  const md = clubs.map(c => mean(winsDeep[c])), mp = clubs.map(c => mean(winsPlain[c]));
  const rank = a => { const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]); const r = new Array(a.length); idx.forEach(([, i], k) => { r[i] = k; }); return r; };
  const ra = rank(md), rb = rank(mp);
  const n = clubs.length;
  const rho = 1 - (6 * ra.reduce((s, v, i) => s + (v - rb[i]) ** 2, 0)) / (n * (n * n - 1));
  const gap = mean(clubs.map((c, i) => Math.abs(md[i] - mp[i])));
  const share = benchStarting / clubWeeks;
  console.log(`   over ${N} seeded seasons: a backup started in ${benchStarting} of ${clubWeeks} club weeks (${(share * 100).toFixed(1)} percent)`);
  console.log(`   mean wins per club, full league against fifteen man league: rank correlation ${rho.toFixed(3)}, mean gap ${gap.toFixed(2)} wins`);
  console.log(`   spread of wins inside a season (sd): full ${mean(spreadDeep).toFixed(2)}, fifteen man ${mean(spreadPlain).toFixed(2)}`);
  ok(5, 'a backup steps in for a hurt starter, so the bench does play some weeks', share > 0.05, `${(share * 100).toFixed(1)} percent`);
  ok(5, 'the clubs finish in the same order in both leagues, near enough', rho >= 0.9, `rank correlation ${rho.toFixed(3)}`);
  ok(5, 'no club\'s expected season moves by much', gap <= 0.6, `mean gap ${gap.toFixed(2)} wins`);
}

/* ======================================================================= 6 */
console.log('6) ten franchises, five seasons each');
const CLUBS = data.FO_TEAMS.map(t => t.abbr);
{
  /* the cut down, directly: three men too many, none of them starters */
  {
    const lg = deepLeague(SEEDS[0]);
    const t = lg.teams.KC;
    const rng = lcg(91);
    for (let i = 0; i < 6; i += 1) {
      t.players.push({ id: `extra-${i}`, name: `Extra Man ${i}`, pos: engine.DEPTH_GROUPS[i % 8], age: 22, ovr: 61 + Math.floor(rng() * 3), salary: 1, years: 4, out: 0, pot: 70 });
    }
    const before = t.players.length;
    const startersBefore = engine.starterIds(t);
    const psBefore = t.practice.length;
    const poolBefore = lg.freeAgents.length;
    const deadBefore = cuts.deadCapUsed(t);
    const owed = new Map(t.players.map(p => [p.id, cuts.deadMoneyFor(p).now]));
    const countsBefore = Object.fromEntries(GROUPS.map(g => [g, t.players.filter(p => p.pos === g).length]));
    const down = engine.cutDownToMax(t, lg.freeAgents);
    const gone = lg.freeAgents.slice(poolBefore);
    ok(6, 'the cut down leaves a full club at 53', t.players.length === engine.DEEP_ROSTER_MAX, `${before} to ${t.players.length}`);
    ok(6, 'the cut down releases the extra men to the pool, the practice squad untouched',
      down.length === before - engine.DEEP_ROSTER_MAX && gone.length === down.length && t.practice.length === psBefore,
      `${down.length} released, pool +${gone.length}, practice ${psBefore} to ${t.practice.length}`);
    const charged = Math.round((cuts.deadCapUsed(t) - deadBefore) * 10) / 10;
    const want = Math.round(gone.reduce((s, p) => s + owed.get(p.id), 0) * 10) / 10;
    ok(6, 'every man released in the cut down costs the dead money the cuts module says', charged === want && want > 0, `${charged} charged, ${want} owed`);
    ok(6, 'a man released in the cut down cannot be signed back this season', gone.every(p => cuts.signRefusal(t, p.id)));
    ok(6, 'the cut down never releases a starter', gone.every(p => !startersBefore.has(p.id)));
    /* a crowded group gives men up before a thin one loses any */
    const thinned = GROUPS.filter(g => countsBefore[g] <= engine.DEEP_GROUP_TARGET[g] && t.players.filter(p => p.pos === g).length < countsBefore[g]);
    ok(6, 'the cut down takes from crowded groups and leaves thin ones alone', thinned.length === 0, thinned.join(', '));
  }
  /* the refill, directly: a short group calls up its practice squad man first */
  {
    const lg = deepLeague(SEEDS[1]);
    /* a club with a quarterback on its practice squad, so the call up has somebody to call */
    const t = Object.values(lg.teams).find(x => x.practice.some(p => p.pos === 'QB'));
    ok(6, 'the fixture has a club with a quarterback on its practice squad', !!t);
    if (t) {
      const qbs = t.players.filter(p => p.pos === 'QB');
      t.players = t.players.filter(p => p.pos !== 'QB' || p === qbs[0]);
      const psQb = t.practice.filter(p => p.pos === 'QB').length;
      const promoted = engine.refillDeepRoster(t, new Set(), lcg(5));
      const qbNow = t.players.filter(p => p.pos === 'QB').length;
      const called = promoted.filter(p => p.pos === 'QB').length;
      ok(6, 'a short group is refilled to its target', qbNow === engine.DEEP_GROUP_TARGET.QB, `${t.abbr}: ${qbNow} quarterbacks`);
      ok(6, 'the refill calls up the practice squad before inventing anybody',
        called >= 1 && called === Math.min(psQb, engine.DEEP_GROUP_TARGET.QB - 1), `${t.abbr}: ${psQb} on the squad, ${called} called up`);
    }
  }

  /* Round 828 review: two engine rules nothing else here would notice break.
     The call up holds the 53 (the franchise loop below only calls men up
     under it), and a decline never raises a man (a real backup can sit at 61,
     under the old floor of 62, and getting older must not lift him). Controls
     promoteover and declinefloor break each one. */
  {
    const lg = deepLeague(SEEDS[2]);
    const t = lg.teams.KC;
    while (t.players.length < engine.DEEP_ROSTER_MAX && t.practice.length) engine.promoteFromPractice(t, t.practice[0].id);
    const psBefore = t.practice.length;
    const called = t.practice.length ? engine.promoteFromPractice(t, t.practice[0].id) : null;
    ok(6, 'a call up is refused at 53, and the roster and the squad stay as they were',
      called === false && t.players.length === engine.DEEP_ROSTER_MAX && t.practice.length === psBefore,
      `call up ${called}, roster ${t.players.length}, squad ${psBefore} to ${t.practice.length}`);
    const lg2 = deepLeague(SEEDS[3]);
    const vets = [];
    for (const abbr of ['KC', 'PHI', 'SF', 'DET']) {
      const club = lg2.teams[abbr];
      const bench = [...club.players].filter(p => !engine.starterIds(club).has(p.id)).sort((a, b) => a.ovr - b.ovr)[0];
      const squad = club.practice[0];
      for (const p of [bench, squad]) { if (p) { p.age = 32; p.ovr = 61; p.pot = 61; vets.push(p.id); } }
    }
    const fa = lg2.freeAgents[0];
    fa.age = 32; fa.ovr = 61; fa.pot = 61; vets.push(fa.id);
    engine.runOffseason(lg2, lcg(77), 'KC');
    const everyone = [...Object.values(lg2.teams).flatMap(c => [...c.players, ...c.practice]), ...lg2.freeAgents];
    const raised = vets.map(id => everyone.find(p => p.id === id)).filter(p => p && p.ovr > 61);
    ok(6, 'a decline never lifts a man under the old floor of 62 (bench, practice squad and pool)', vets.length === 9 && raised.length === 0,
      `${vets.length} men set to 61 at 32; raised: ${raised.map(p => `${p.name} ${p.ovr}`).join(', ')}`);
  }

  /* the Trade Finder's cheap probe copy finds the deep copy's offers and leaves the league alone */
  {
    let probes = 0, same = 0;
    const leak = [], differ = [];
    for (const seed of SEEDS.slice(0, 3)) {
      const lg = deepLeague(seed);
      for (const abbr of ['KC', 'PHI', 'SF', 'DET']) {
        const mine = [...lg.teams[abbr].players].sort((a, b) => b.ovr - a.ovr);
        for (const piece of [mine[0], mine[4], mine[20]]) {
          probes += 1;
          const before = JSON.stringify(lg);
          const deep = data.findTrades(lg.teams, abbr, piece.id, lg.cap, engine.proposeTrade, engine.tradeValue);
          const cheap = data.findTrades(lg.teams, abbr, piece.id, lg.cap, engine.proposeTrade, engine.tradeValue, { cloneTeam: engine.tradeProbeCopy });
          if (JSON.stringify(lg) !== before) { leak.push(`${seed} ${abbr} ${piece.name}`); break; }
          if (JSON.stringify(deep) === JSON.stringify(cheap)) same += 1;
          else differ.push(`${seed} ${abbr} ${piece.name}`);
        }
      }
    }
    console.log(`   trade finder: ${same} of ${probes} probes found the same offers with the cheap copy`);
    ok(6, 'the Trade Finder probe leaves the league exactly as it found it', leak.length === 0, leak.slice(0, 3).join(', '));
    ok(6, 'the cheap probe copy finds exactly the deep copy\'s offers', differ.length === 0 && probes > 0, differ.slice(0, 3).join(', '));
  }

  const stats = { seasons: 0, cuts: 0, deadOk: 0, signs: 0, fullRefused: 0, tags: 0, drafted: 0, cutDowns: 0, promoted: 0, invented: 0, maxSave: 0, maxPs: 0, maxCapShare: 0, realLeft: [], draftCut: 0, owedSeasons: 0, userCutDown: 0, lockedWeeks: 0 };
  const bad = { size: [], groups: [], dead: [], tagPool: [], drafted: [], invent: [], ids: [], cap: [], full: [], enter: [], autocut: [] };
  for (let f = 0; f < 10; f += 1) {
    const seed = 8280 + f;
    const rng = lcg(seed);
    /* the first franchise is the Giants, who open at 54 (a starter on injured
       reserve counts), so the opening cut a GM owes is exercised every run */
    const my = f === 0 ? 'NYG' : CLUBS[(f * 7) % CLUBS.length];
    /* Round 828 follow up: a league started the board's way, with the GM's club
       named, so every other club cuts itself down before Week 1 and his never is */
    const lg = engine.initLeague(lcg(seed), { depth: data.FO_DEPTH, userTeam: my });
    for (const t of Object.values(lg.teams)) {
      if (t.abbr !== my && t.players.length > engine.DEEP_ROSTER_MAX) bad.size.push(`${seed} opening ${t.abbr} ${t.players.length}`);
    }
    if ((lg.teams[my].releasedThisSeason ?? []).length) bad.autocut.push(`${seed} opening: ${lg.teams[my].releasedThisSeason.length} of the GM's men released`);
    for (const t of Object.values(lg.teams)) {
      if (engine.capUsed(t) > lg.cap) bad.cap.push(`${seed} ${t.abbr} opens at ${engine.capUsed(t)} of ${lg.cap}`);
    }
    for (let s = 0; s < 5; s += 1) {
      stats.seasons += 1;
      const me = () => lg.teams[my];
      /* the GM owes his cut before he can play, as the board's lock says: the
         week cannot be played (the board returns), so he cuts his lowest rated
         men who do not start through the shared release until he is at 53 */
      const owed = engine.deepOverLimit(me());
      if (owed > 0) {
        stats.owedSeasons += 1;
        stats.lockedWeeks += 1;
        for (let k = 0; k < owed; k += 1) {
          const st = engine.starterIds(me());
          const man = [...me().players].filter(p => !st.has(p.id) && !p.guaranteed).sort((a, b) => a.ovr - b.ovr || a.name.localeCompare(b.name))[0];
          if (!man || !engine.releasePlayer(me(), lg.freeAgents, man.id)) break;
          stats.userCutDown += 1;
        }
      }
      for (const t of Object.values(lg.teams)) {
        if (t.players.length > engine.DEEP_ROSTER_MAX) bad.enter.push(`${seed} season ${s} ${t.abbr} enters at ${t.players.length}`);
      }
      for (let w = 0; w < engine.REGULAR_WEEKS; w += 1) {
        playWeek(lg, my, rng);
        if (w === 4) {
          /* a cut: his lowest rated bench man */
          const starting = engine.starterIds(me());
          const man = [...me().players].filter(p => !starting.has(p.id)).sort((a, b) => a.ovr - b.ovr)[0];
          if (man) {
            const want = cuts.deadMoneyFor(man);
            const deadBefore = cuts.deadCapUsed(me());
            if (engine.releasePlayer(me(), lg.freeAgents, man.id)) {
              stats.cuts += 1;
              const got = Math.round((cuts.deadCapUsed(me()) - deadBefore) * 10) / 10;
              if (Math.abs(got - want.now) < 1e-9) stats.deadOk += 1;
              else bad.dead.push(`${seed} ${man.name}: ${got} on the cap, the rule says ${want.now}`);
            }
          }
          /* fill to 53 off the practice squad, then a signing must be refused */
          while (me().players.length < engine.DEEP_ROSTER_MAX && me().practice.length) engine.promoteFromPractice(me(), me().practice[0].id);
          const fa = [...lg.freeAgents].filter(p => !cuts.signRefusal(me(), p.id)).sort((a, b) => b.ovr - a.ovr)[0];
          if (me().players.length >= engine.DEEP_ROSTER_MAX && fa) {
            if (!engine.signPlayer(me(), lg.freeAgents, fa.id, lg.cap) && engine.deepRosterRefusal(me())) stats.fullRefused += 1;
            else bad.full.push(`${seed} signed a man at ${me().players.length}`);
          }
          /* then make room the honest way and sign him */
          const starting2 = engine.starterIds(me());
          const spare = [...me().players].filter(p => !starting2.has(p.id)).sort((a, b) => a.ovr - b.ovr)[0];
          if (fa && spare && engine.releasePlayer(me(), lg.freeAgents, spare.id) && engine.signPlayer(me(), lg.freeAgents, fa.id, lg.cap)) stats.signs += 1;
        }
      }
      engine.runPlayoffs(lg.teams, rng);
      /* the draft, the board's way: three picks for the GM, six for the league between each */
      const cls = engine.generateDraftClass(rng, 40, new Set(Object.values(lg.teams).flatMap(t => [...t.players, ...t.practice].map(p => p.name))));
      const order = engine.draftOrder(lg.teams).filter(a => a !== my);
      const draftedIds = [];
      let pool = cls;
      for (let pick = 0; pick < 3; pick += 1) {
        const pr = pool[0];
        const pl = engine.prospectToPlayer(pr, rng);
        me().players.push(pl);
        draftedIds.push([my, pl.id]);
        const rest = pool.slice(1);
        const ai = rest.slice(0, 6);
        ai.forEach((x, i) => { const p = engine.prospectToPlayer(x, rng); lg.teams[order[i % order.length]].players.push(p); draftedIds.push([order[i % order.length], p.id]); });
        pool = rest.slice(6);
        if (pick === 1) {
          const tagMe = engine.expiringPlayers(me()).find(p => !engine.tagRefusal(lg, me(), p.id));
          if (tagMe && engine.applyFranchiseTag(lg, me(), tagMe.id).ok) stats.tags += 1;
        }
      }
      stats.drafted += draftedIds.length;
      const idsBefore = new Set([...Object.values(lg.teams).flatMap(t => [...t.players, ...t.practice]), ...lg.freeAgents].map(p => p.id));
      const tagged = me().players.find(p => p.tagSeason === lg.season + 1);
      const news = engine.runOffseason(lg, rng, my);
      stats.cutDowns += news.cutDown.length;
      stats.promoted += news.promoted.length;
      /* every club at or under 53, every group able to start */
      /* the GM's club is never cut behind his back: nobody on his release list
         after the offseason (it was emptied at its start) and no cut news names him */
      if ((me().releasedThisSeason ?? []).length || news.cutDown.some(d => d.team === my)) {
        bad.autocut.push(`${seed} season ${s}: ${(me().releasedThisSeason ?? []).length} of the GM's men released by the offseason`);
      }
      for (const t of Object.values(lg.teams)) {
        if (t.abbr !== my && t.players.length > engine.DEEP_ROSTER_MAX) bad.size.push(`${seed} season ${s} ${t.abbr} ${t.players.length}`);
        stats.maxPs = Math.max(stats.maxPs, t.practice.length);
        stats.maxCapShare = Math.max(stats.maxCapShare, engine.capUsed(t) / lg.cap);
        if (engine.capUsed(t) > lg.cap) bad.cap.push(`${seed} season ${s} ${t.abbr} ${engine.capUsed(t)} of ${lg.cap}`);
        /* a man the refill invented is new this offseason; his club had nobody at his position left on the squad */
        for (const p of t.players) {
          if (idsBefore.has(p.id)) continue;
          stats.invented += 1;
          const waiting = t.practice.filter(q => q.pos === p.pos);
          if (waiting.length) bad.invent.push(`${seed} ${t.abbr} invented a ${p.pos} with ${waiting.length} on the squad`);
        }
      }
      bad.groups.push(...fieldsStarters(lg, `${seed} season ${s}`));
      if (tagged && lg.freeAgents.some(p => p.id === tagged.id)) bad.tagPool.push(`${seed} ${tagged.name}`);
      for (const [abbr, id] of draftedIds) {
        const t = lg.teams[abbr];
        if (t.players.some(p => p.id === id) || t.practice.some(p => p.id === id)) continue;
        /* or the cut to 53 released him, which the offseason news names */
        const pl = lg.freeAgents.find(p => p.id === id);
        if (pl && news.cutDown.some(d => d.team === abbr && d.player === pl.name)) stats.draftCut += 1;
        else bad.drafted.push(`${seed} ${abbr} ${id}`);
      }
      const ids = [...Object.values(lg.teams).flatMap(t => [...t.players, ...t.practice]), ...lg.freeAgents].map(p => p.id);
      if (new Set(ids).size !== ids.length) bad.ids.push(`${seed} season ${s}: ${ids.length - new Set(ids).size} repeated ids`);
      stats.maxSave = Math.max(stats.maxSave, JSON.stringify({ league: lg, myTeam: my }).length);
    }
    const realNames = new Set([...data.FO_TEAMS.flatMap(t => t.players), ...Object.values(data.FO_DEPTH).flatMap(d => [...d.bench, ...d.practice])].map(p => p.name));
    const onRosters = Object.values(lg.teams).flatMap(t => t.players);
    stats.realLeft.push(onRosters.filter(p => realNames.has(p.name)).length / onRosters.length);
  }
  console.log(`   ${stats.seasons} seasons: ${stats.cuts} cuts (${stats.deadOk} with the rule's dead money), ${stats.fullRefused} signings refused at 53, ${stats.signs} signings after making room, ${stats.tags} tags, ${stats.drafted} draftees`);
  console.log(`   offseasons: ${stats.promoted} called up off the practice squad, ${stats.invented} depth men invented, ${stats.cutDowns} released in the cut to 53 (${stats.draftCut} of them draftees); biggest practice squad ${stats.maxPs}; biggest save ${(stats.maxSave / 1024).toFixed(0)}K; highest payroll ${(stats.maxCapShare * 100).toFixed(1)} percent of the cap`);
  console.log(`   real men still on the active rosters after five seasons: ${stats.realLeft.map(x => (x * 100).toFixed(0)).join(", ")} percent by franchise`);
  console.log(`   the GM owed a cut before ${stats.owedSeasons} of ${stats.seasons} seasons and made ${stats.userCutDown} cuts himself to get to 53`);
  ok(6, 'every computer club is at or under 53 at the opening and after every offseason', bad.size.length === 0, bad.size.slice(0, 3).join(', '));
  ok(6, 'the GM\'s club is never cut without his action (the opening and every offseason)', bad.autocut.length === 0, bad.autocut.slice(0, 3).join(' | '));
  ok(6, 'every club enters every season at or under 53, the GM after his own cut', bad.enter.length === 0, bad.enter.slice(0, 3).join(', '));
  ok(6, 'a GM over the limit happened and cut down himself (the Giants open at 54)', stats.owedSeasons >= 1 && stats.userCutDown >= 1, `${stats.owedSeasons} seasons owed, ${stats.userCutDown} cuts`);
  ok(6, 'every club fields every group\'s starters after every offseason', bad.groups.length === 0, bad.groups.slice(0, 3).join(', '));
  ok(6, 'every cut costs the dead money the cuts module says', bad.dead.length === 0 && stats.cuts >= 40, `${stats.cuts} cuts; ${bad.dead.slice(0, 2).join(' | ')}`);
  ok(6, 'a full roster refuses a signing at 53', bad.full.length === 0 && stats.fullRefused >= 40, `${stats.fullRefused} refusals; ${bad.full.slice(0, 2).join(' | ')}`);
  ok(6, 'a tagged man never reaches the pool', bad.tagPool.length === 0 && stats.tags >= 10, `${stats.tags} tags; ${bad.tagPool.slice(0, 2).join(', ')}`);
  ok(6, 'every drafted man is on his club after the offseason, or was released in the cut to 53', bad.drafted.length === 0, `${bad.drafted.length} of ${stats.drafted}: ${bad.drafted.slice(0, 2).join(', ')}`);
  ok(6, 'the refill calls up the practice squad before it invents anybody', bad.invent.length === 0, bad.invent.slice(0, 3).join(' | '));
  ok(6, 'ids stay unique across rosters, squads and the pool', bad.ids.length === 0, bad.ids.slice(0, 2).join(' | '));
  ok(6, 'every club fits under the cap, at the start and after every offseason', bad.cap.length === 0, bad.cap.slice(0, 3).join(' | '));
  ok(6, 'the save stays inside its budget', stats.maxSave <= 700 * 1024, `${(stats.maxSave / 1024).toFixed(0)}K`);
}

/* ======================================================================= 7 */
console.log('7) an old save loads and plays as it did');
{
  /* the engine as it stood before this round, from git */
  let ready = false;
  try {
    const dir = path.join(BUNDLE_DIR, 'base');
    fs.mkdirSync(dir, { recursive: true });
    for (const f of ['frontOffice.ts', 'foNames.ts', 'leagueCaps.ts', 'entityIds.ts', 'frontOfficeCuts.ts']) {
      const text = execSync(`git show ${BASE}:src/lib/${f}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      fs.writeFileSync(path.join(dir, f), text);
    }
    base = await bundle(`export * from ${JSON.stringify(fwd(path.join(dir, 'frontOffice.ts')))};`, 'base');
    ready = typeof base.initLeague === 'function';
  } catch (e) {
    console.log(`   the engine at ${BASE} could not be read from git: ${String(e && e.message ? e.message : e).slice(0, 160)}`);
  }
  ok(7, `the engine as it stood before this round (${BASE}) can be read from git`, ready);
  if (ready) {
    /* ids carry a per page load stamp, so two bundles mint different strings
       for the same man; each id is renamed by its first appearance */
    const canon = lg => {
      const ids = new Map();
      const walk = o => {
        if (Array.isArray(o)) o.forEach(walk);
        else if (o && typeof o === 'object') {
          if (typeof o.id === 'string' && !ids.has(o.id)) ids.set(o.id, `#${ids.size}`);
          /* a dead money line outlives the man it names (he retires, the pool
             is trimmed), and then its playerId is the only place his id is left */
          if (typeof o.playerId === 'string' && !ids.has(o.playerId)) ids.set(o.playerId, `#${ids.size}`);
          Object.values(o).forEach(walk);
        }
      };
      walk(lg);
      return JSON.stringify(lg, (k, v) => (typeof v === 'string' && ids.has(v) ? ids.get(v) : v));
    };
    let states = 0;
    const diverged = [];
    for (const seed of SEEDS.slice(0, 3)) {
      const play = (eng) => {
        const lg = eng.initLeague(lcg(seed));
        const rng = lcg(seed + 17);
        const snaps = [];
        for (let s = 0; s < 3; s += 1) {
          for (let w = 0; w < eng.REGULAR_WEEKS; w += 1) {
            eng.injuryPass(lg.teams, rng);
            eng.aiWeeklyMoves(lg, 'DAL', rng);
            for (const g of lg.schedule[lg.week - 1]) eng.simGame(g, lg.teams, rng);
            lg.week += 1;
            snaps.push(canon(lg));
          }
          eng.runPlayoffs(lg.teams, rng);
          const cls = eng.generateDraftClass(rng, 40, new Set());
          let i = 0;
          for (const abbr of eng.draftOrder(lg.teams)) lg.teams[abbr].players.push(eng.prospectToPlayer(cls[i++ % cls.length], rng));
          eng.runOffseason(lg, rng, 'DAL');
          snaps.push(canon(lg));
        }
        return { lg, snaps };
      };
      const now = play(engine), then = play(base);
      for (let i = 0; i < Math.max(now.snaps.length, then.snaps.length); i += 1) {
        states += 1;
        if (now.snaps[i] !== then.snaps[i]) { diverged.push(`seed ${seed} state ${i}`); break; }
      }
      /* the old save loads: a JSON round trip and the id repair change nothing */
      const saved = JSON.parse(JSON.stringify(now.lg));
      const repaired = engine.ensureFoLeagueIds(saved);
      ok(7, `seed ${seed}: a fifteen man save reloads with nothing to repair`, repaired === 0 && JSON.stringify(saved) === JSON.stringify(now.lg), `${repaired} ids repaired`);
      const grew = Object.values(now.lg.teams).filter(t => t.rosterDepth || t.practice || t.players.length > 25);
      ok(7, `seed ${seed}: the old save is never topped up to a full roster`, grew.length === 0 && !now.lg.rosterDepth,
        grew.slice(0, 3).map(t => `${t.abbr} ${t.players.length}`).join(', '));
    }
    console.log(`   ${states} league states compared over three seeds and three seasons each`);
    ok(7, 'a fifteen man league plays exactly as it did before this round', diverged.length === 0, diverged.join(', '));
  }
}

/* ======================================================================= 8 */
if (CONTROL) {
  console.log('8) skipped under a control: vitest reads src, and every control here edits a copy in temp');
} else {
  console.log('8) the board on a full roster, under vitest');
  const vitest = findUp(path.join('node_modules', 'vitest', 'vitest.mjs'));
  const TEST = 'src/components/front-office/FrontOfficeFullRoster.test.tsx';
  ok(8, 'vitest can be found by walking up from the repo root', !!vitest);
  if (vitest) {
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync(process.execPath, [vitest, 'run', TEST, '--reporter=verbose'],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 });
    const out = (r.stdout || '') + (r.stderr || '');
    const summary = out.match(/Tests\s+(.+)/);
    const line = summary ? summary[1].trim() : 'no summary line';
    console.log(`   vitest exit ${r.status}, ${line}`);
    ok(8, 'vitest exited zero', r.status === 0, out.split('\n').filter(l => /×|FAIL|AssertionError|Unable to find/.test(l)).slice(0, 8).join(' | '));
    ok(8, 'all six board tests ran and passed', /\b6 passed\b/.test(line) && !/failed/.test(line), line);
  }
}

/* ------------------------------------------------------------------ verdict */
fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
for (const [n, name] of Object.entries(SECTION_NAMES)) {
  const s = bySection.get(Number(n));
  if (!s) { console.log(`   ${n}. ${name}: NOT RUN`); continue; }
  console.log(`   ${n}. ${name}: ${s.n} checks${s.bad ? `, ${s.bad} FAILED` : ''}`);
}
for (const f of fails) console.error('FAIL ' + f);
if (CONTROL) {
  const red = [...bySection.entries()].filter(([, s]) => s.bad > 0).map(([n]) => n).sort((a, b) => a - b);
  const want = EXPECT[CONTROL];
  const hit = want.every(n => red.includes(n));
  console.log(hit
    ? `control ${CONTROL}: sections ${want.join(', ')} went red as they must (red: ${red.join(', ')}). Exiting non zero because a control run is never a pass.`
    : `control ${CONTROL}: expected sections ${want.join(', ')} red, got ${red.length ? red.join(', ') : 'none'}. The check this control guards is not working.`);
  process.exit(1);
}
const ranSections = [...bySection.keys()].length;
if (fails.length) {
  console.log(`simNflFullRosters: ${fails.length} of ${checks} checks FAILED over ${ranSections} sections`);
  process.exit(1);
}
console.log(`simNflFullRosters: ${checks} checks passed over ${ranSections} sections`);
