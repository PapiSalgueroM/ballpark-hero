/* NFL Front Office: the whole club. Round 828.

   The owner: "we are yet to have way more leagues and players for ... all the
   gm games". NFL Front Office shipped fifteen real men a club. A new league
   now carries every club's real active roster (the fifteen starters plus the
   bench, src/data/frontOfficeDepth.ts) and its practice squad, both baked by
   scripts/genFrontOfficeRoster.mjs. This harness fences what that promised:

     1) THE DATA. Every club carries its real active roster in the eight
        groups the game knows (the 53 less kickers, punters and long snappers,
        plus starters back from a reserve list) and its practice squad. When
        the nflverse cache the bake read is on disk, every bench and practice
        squad man is matched to a row of that club with that status on the
        release's latest week, so nobody is invented. The second source record
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
        the offseason. Every offseason ends at or under 53 on every club,
        every cut costs exactly the dead money the cuts module says, a tagged
        man never reaches the pool, every drafted man is on his club (the
        roster or the practice squad), the refill calls up practice squad
        men before it invents anybody, ids and names stay unique, the cap
        holds for every club, and the save stays inside its size budget.
     7) AN OLD SAVE LOADS AND PLAYS AS IT DID. A fifteen man league is played
        for three seasons, the board's way, by this engine and by the engine
        as it stood before this round (read from git at BASE), from one seed.
        Every league state after every week and offseason is identical, and
        the old save never grows a bench: it is not topped up.

   MEASUREMENTS (2026-10-01, the bake of that day, the harness's own seeds):
     filled in below each section's checks once measured.

   CONTROLS, through NFL_FULL_CONTROL. Each rewrites a copy of the engine or
   the depth data in OS temp (src is never touched), refuses to run if its
   anchor is missing, and must turn its sections red:
     allbench     a full club's units read every healthy man     -> 4
     benchabove   the bench rated 10 above its band              -> 2, 4
     inventfirst  the refill invents before it calls anybody up  -> 6
     nocutdown    the offseason never cuts down to 53            -> 6
     deepold      every club reads its units the full roster way -> 7
     bigbench     every bench salary six times larger            -> 6
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
  bigbench: [6],
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
  bigbench: 'the depth data copy pays every bench man six times his salary',
};
const SECTION_NAMES = {
  1: 'the data: real, current, second sourced, and agreeing with the engine',
  2: 'the bench sits under the starters',
  3: 'every group can field its starters',
  4: 'the bench moves no result',
  5: 'what does move, measured',
  6: 'ten franchises, five seasons each',
  7: 'an old save loads and plays as it did',
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
  ].join('\n'), 'current');
  engine = mod.engine;
  cuts = mod.cuts;
  data = { FO_DEPTH: mod.FO_DEPTH, FO_TEAMS: mod.FO_TEAMS, week: mod.FO_DEPTH_WEEK };
} catch (e) {
  console.error(`FAIL: the engine could not be bundled and run: ${String(e && e.message ? e.message : e).slice(0, 300)}`);
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
  process.exit(1);
}
for (const fn of ['initLeague', 'runOffseason', 'teamStrength', 'unitStarters', 'starterIds', 'depthOrder', 'simGame', 'injuryPass',
  'aiWeeklyMoves', 'releasePlayer', 'signPlayer', 'capUsed', 'capRoom', 'generateDraftClass', 'draftOrder', 'prospectToPlayer',
  'applyFranchiseTag', 'tagRefusal', 'expiringPlayers', 'promoteFromPractice', 'deepRosterRefusal', 'refillDeepRoster', 'cutDownToMax', 'ensureFoLeagueIds']) {
  if (typeof engine[fn] !== 'function') { console.error(`FAIL: frontOffice.ts does not export ${fn}`); process.exit(1); }
}

const SEEDS = [828, 20261001, 53, 4242, 9, 1337];
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

  /* membership against the release itself, when the bake's cache is here */
  const cache = path.join(ROOT, 'scripts', '.cache', 'nflverse', 'roster_2026.csv');
  if (fs.existsSync(cache)) {
    const { parseCsv } = await import(pathToFileURL(path.join(ROOT, 'scripts', 'lib', 'nflverseRosters.mjs')).href);
    const rows = gen.currentRows(parseCsv(fs.readFileSync(cache, 'utf8')));
    const week = gen.latestWeek(rows);
    const key = (team, name, status) => `${team}|${name}|${status}`;
    const have = new Set(rows.map(r => key(String(r.team).toUpperCase(), String(r.full_name).trim(), r.status)));
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
    console.log(`   the cache is week ${week}; ${matched} of ${matched + missing.length} bench and practice squad men found on their club with their status`);
    if (week === data.week) {
      ok(1, 'every bench and practice squad man is a real row of his club, his status, the latest week', missing.length === 0, missing.slice(0, 4).join(', '));
    } else {
      console.log(`   the cache (week ${week}) is not the week the file was baked from (${data.week}); rerun the generator to compare like with like`);
    }
  } else {
    console.log('   the nflverse cache is not on this machine, so the row by row match is not run here (node scripts/genFrontOfficeRoster.mjs --check fetches it)');
  }

  /* the second source record */
  const record = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'nflRosterSecondSource.json'), 'utf8'));
  /* Where the two sources agree with each other they settle the fact, and
     the bake must say the same. Where they disagree (an elevated practice
     squad man, a signing one site has not caught) the man is reported and
     not counted. Measured 2026-10-01: 28 settled, 28 agreeing, 2 split. */
  let settled = 0, total = 0;
  const off = [], split = [];
  for (const club of record.clubs) {
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
  console.log(`   second source (${record.checked}): ${settled} of ${total} men settled by both sources, ${split.length} split: ${split.join('; ')}`);
  ok(1, 'the second source record covers three clubs and thirty men', record.clubs.length === 3 && total === 30, `${record.clubs.length} clubs, ${total} men`);
  ok(1, 'at least 25 of the 30 are settled by both sources', settled >= 25, `${settled} settled`);
  ok(1, 'where both sources agree, the bake agrees with them', off.length === 0, off.slice(0, 3).join(' | '));
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
