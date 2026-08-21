/**
 * Round 146 harness: the 2010-11 era is real, isolated, and plays like 2010.
 *
 * The owner's ask (2026-08-17): "u can be the manager for clubs in 2010 and
 * 2000 and so on with all correct lineups and everything like that and values
 * and just everything." This measures that promise against the shipped bake:
 *
 *   1. YEAR ZERO IDENTITY. A fresh 2010 save is handed the real 2010 squad,
 *      name for name, age for age, rating for rating, zero invention at
 *      dense clubs.
 *   2. ERA ISOLATION, both directions. No 2026-only player reachable in a
 *      2010 market, no 2010-only player in the 2026 market, and every name
 *      the two worlds share ages by roughly the sixteen year gap.
 *   3. THE LADDER over all 40 era clubs: 2010 Barcelona is told to win it,
 *      Blackpool is not, and NOBODY is promised the Conference League,
 *      which did not exist until 2021.
 *   4. SEASONS COMPLETE and land plausibly. Measured 2026-08-17 over six
 *      seeds each: Barcelona positions all 1 (mean 1.0), Blackpool mean
 *      19.8, Hercules mean 19.5. Margins below sit far inside that.
 *
 * Run: node scripts/simEra2010.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/era2010Entry.mjs';
const BUNDLE = '/tmp/era2010.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT}/src/lib/clubManager.ts');
const eras = await import('${ROOT}/src/lib/clubManagerEras.ts');
const era2010 = await import('${ROOT}/src/data/clubManagerEra2010.ts');
const modern = await import('${ROOT}/src/data/clubManagerRosters.ts');
export { engine, eras, era2010, modern };
`);
execSync(
  `${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`,
  { stdio: 'inherit' },
);

const { engine: cm, era2010: E10, modern: MOD } = await import(BUNDLE);
const {
  startCareer, playNextEntry, startNextSeason, sortedTable, buildMarket,
  buildBoardObjectives, ERA_LEAGUES, eraPlayableClubs, worldSeasonLabel,
} = cm;
const { ERA2010_ROSTERS, ERA2010_META, ERA2010_PARTIAL } = E10;
const { CM_ROSTERS } = MOD;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const REAL_RANDOM = Math.random;

const playSeason = (state) => {
  let s = state;
  for (let i = 0; i < 80; i++) {
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
};

/* ---------- 1. Year zero identity ---------- */
console.log('1) A fresh 2010 save is the real 2010 squad, untouched');
{
  Math.random = seeded(11);
  const s = startCareer('Barcelona', 'era2010');
  const bake = new Map(ERA2010_ROSTERS['Barcelona'].map(p => [p.n, p]));
  let mismatches = 0;
  for (const p of s.squad.filter(p => !p.isYouth)) {
    const b = bake.get(p.name);
    if (!b) { mismatches += 1; fail(`${p.name} is in the 2010 Barcelona squad but not in the bake`); continue; }
    if (b.a !== p.age || b.r !== p.rating) {
      mismatches += 1;
      fail(`${p.name}: bake says age ${b.a} rating ${b.r}, squad says ${p.age}/${p.rating}`);
    }
  }
  const gen = s.squad.filter(p => p.generated).length;
  console.log(`   ${s.squad.length} in squad, ${mismatches} mismatches, ${gen} generated`);
  if (gen !== 0) fail(`a dense 2010 club got ${gen} generated players on day one`);
  if (s.startYear !== 2010) fail(`the save started in ${s.startYear}`);
  if (!/2010-11/.test(worldSeasonLabel(s))) fail(`season label reads ${worldSeasonLabel(s)}`);
  // The marquee names, by name, because these are the whole sales pitch.
  for (const name of ['Lionel Messi', 'Xavi', 'Andrés Iniesta', 'David Villa']) {
    if (!s.squad.some(p => p.name === name)) fail(`2010 Barcelona is missing ${name}`);
  }
  const messi = s.squad.find(p => p.name === 'Lionel Messi');
  if (messi && messi.age !== 22) fail(`2010 Messi is ${messi.age}, the bake says 22`);
}

/* ---------- 2. Era isolation, both directions ---------- */
console.log('2) The two worlds cannot leak into each other');
{
  Math.random = seeded(23);
  const old = startCareer('Real Madrid', 'era2010');
  const oldMarket = buildMarket(old);
  const oldNames = new Set(oldMarket.map(p => p.name));
  // 2026-only stars must not exist in 2010. These four are all in the 2026
  // bake and all post-date 2010 as top flight players.
  for (const name of ['Jude Bellingham', 'Erling Haaland', 'Lamine Yamal', 'Désiré Doué']) {
    if (oldNames.has(name)) fail(`${name} is on the 2010 market`);
  }
  // And the 2010 market is really the 2010 world: era players at era values.
  const iniesta = oldMarket.find(p => p.name === 'Andrés Iniesta');
  if (!iniesta) fail('2010 Iniesta is not on the 2010 market');
  else if (iniesta.age !== 25) fail(`market Iniesta is ${iniesta.age}, 2010 says 25`);

  Math.random = seeded(29);
  const now = startCareer('Arsenal');
  const nowNames = new Set(buildMarket(now).map(p => p.name));
  // 2010-only players must not exist in 2026. Take them from the bake itself
  // so the check survives data refreshes: every 2010 player NOT in the 2026
  // bake must be absent from the 2026 market.
  const modernNames = new Set(Object.values(CM_ROSTERS).flat().map(p => p.n));
  let checked = 0, leaked = 0;
  for (const roster of Object.values(ERA2010_ROSTERS)) {
    for (const p of roster) {
      if (modernNames.has(p.n)) continue;
      checked += 1;
      if (nowNames.has(p.n)) { leaked += 1; if (leaked <= 3) fail(`2010-only ${p.n} is on the 2026 market`); }
    }
  }
  console.log(`   ${checked} era-exclusive names checked against the 2026 market, ${leaked} leaks`);
  if (checked < 400) fail(`only ${checked} era-exclusive names? the eras are suspiciously similar`);

  // Shared names are the same human sixteen years apart, and their ages have
  // to say so. Transfermarkt snapshots wobble a year either side, so the
  // window is 14 to 18. EXCEPT: football genuinely has two different real
  // people wearing one name across eras, and the two files being separate
  // worlds is exactly what makes that fine (the engine never joins them).
  // Each entry below was verified as two distinct real footballers on
  // 2026-08-17: 2010's Welsh Aaron Ramsey (b. 1990) vs the English one
  // (b. 2003), keeper Diego Lopez (b. 1981) vs the 2026 Valencia player,
  // Espanyol's Javi Lopez (b. 1986) vs Alaves', and so on. A NEW name
  // showing up here after a re-bake still fails until somebody verifies it
  // is a genuine namesake and adds it deliberately.
  const NAMESAKES = new Set(['Aaron Ramsey', 'Juan Rodríguez', 'Javi López', 'Diego López', 'Pablo Ibáñez']);
  const eraByName = new Map();
  for (const roster of Object.values(ERA2010_ROSTERS)) for (const p of roster) eraByName.set(p.n, p);
  const modByName = new Map();
  for (const roster of Object.values(CM_ROSTERS)) for (const p of roster) modByName.set(p.n, p);
  let shared = 0, weird = 0, namesakes = 0;
  for (const [name, p10] of eraByName) {
    const pNow = modByName.get(name);
    if (!pNow) continue;
    shared += 1;
    if (NAMESAKES.has(name)) { namesakes += 1; continue; }
    const gap = pNow.a - p10.a;
    if (gap < 14 || gap > 18) {
      weird += 1;
      fail(`${name}: aged ${gap} years between 2010 (${p10.a}) and 2026 (${pNow.a}), same name, different person? verify and allowlist if so`);
    }
  }
  console.log(`   ${shared} names exist in both worlds: ${namesakes} verified namesakes, ${weird} unexplained`);
  if (shared - namesakes < 5) fail('almost no true cross-era survivors? the age window itself may be wrong');
}

/* ---------- 3. The 2010 ladder ---------- */
console.log('3) Boards talk 2010: title for Barcelona, survival for Blackpool, no Conference League');
{
  const leagues = ERA_LEAGUES['era2010'] ?? [];
  if (leagues.length !== 2) fail(`era2010 has ${leagues.length} leagues`);
  let labels = 0;
  for (const lg of leagues) {
    const targets = [];
    for (const c of eraPlayableClubs('era2010', lg.id)) {
      const objs = buildBoardObjectives(c.name, false, lg.clubs.length, 'era2010');
      const league = objs.find(o => o.id === 'league');
      if (!league) { fail(`${c.name} got no league demand`); continue; }
      labels += 1;
      if (/Conference League/i.test(league.label)) fail(`${c.name} promised the Conference League in 2010`);
      if (/top \d+/i.test(league.label)) fail(`${c.name}: positional phrase "${league.label}"`);
      targets.push({ rank: c.expectation, target: league.target, name: c.name });
    }
    targets.sort((a, b) => a.rank - b.rank);
    for (let i = 1; i < targets.length; i++) {
      if (targets[i].target < targets[i - 1].target) {
        fail(`${lg.name} 2010: ${targets[i].name} asked for more than stronger ${targets[i - 1].name}`);
      }
    }
  }
  console.log(`   ${labels} club demands checked across both 2010 leagues`);
  const want1 = name => {
    const lg = leagues.find(l => l.clubs.includes(name));
    const league = buildBoardObjectives(name, false, lg.clubs.length, 'era2010').find(o => o.id === 'league');
    return league && league.target === 1;
  };
  for (const giant of ['Barcelona', 'Real Madrid', 'Manchester United', 'Chelsea']) {
    if (!want1(giant)) fail(`2010 ${giant} is not told to win the league`);
  }
  for (const minnow of ['Blackpool', 'Hércules', 'Wigan Athletic']) {
    if (want1(minnow)) fail(`2010 ${minnow} is told to WIN the league`);
  }
  // Cup names are the era's real cups.
  const copaClub = buildBoardObjectives('Sevilla', false, 20, 'era2010').find(o => o.id === 'cup');
  if (copaClub && !/Copa del Rey/.test(copaClub.label)) fail(`2010 Sevilla's cup objective says "${copaClub.label}"`);
}

/* ---------- 4. Seasons complete and land where 2010 says ---------- */
console.log('4) Full seasons play out plausibly in both leagues');
{
  const posOf = (club, era, seed) => {
    Math.random = seeded(seed);
    const s = playSeason(startCareer(club, era));
    const table = sortedTable(s.table);
    if (table.length !== 20) fail(`${club}: a 2010 table with ${table.length} rows`);
    return table.findIndex(r => r.club === club) + 1;
  };
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  /* Six seeds, not three. Round 157 taught this check the lesson simContracts
     already learned: the engine draws extra randoms per match now (card and
     injury minutes for the report detail), which shifts every seeded stream,
     and a three seed sample of a no-tactics autopilot season carries real
     variance (one unlucky 6th place run swings a three seed mean by 1.7 on
     its own). The check exists to catch a BROKEN strength model, prime
     Barcelona sitting mid table, so it samples wider and adds a hard floor
     instead of leaning on three lucky draws. Measured 2026-08-18 on the
     Round 157 stream: Barcelona 3,3,6,1,1,1 (mean 2.5, worst 6), Blackpool
     20,20,20,20,20,20. */
  const barca = [1, 2, 3, 4, 5, 6].map(i => posOf('Barcelona', 'era2010', i * 7919));
  const pool = [1, 2, 3, 4, 5, 6].map(i => posOf('Blackpool', 'era2010', i * 104729));
  console.log(`   Barcelona finishes: ${barca.join(',')} · Blackpool finishes: ${pool.join(',')}`);
  if (mean(barca) > 3.5) fail(`prime Barcelona averaged position ${mean(barca).toFixed(1)}`);
  if (Math.max(...barca) > 10) fail(`prime Barcelona finished ${Math.max(...barca)} in one seed, which is a broken model, not variance`);
  if (mean(pool) < 14) fail(`Blackpool averaged position ${mean(pool).toFixed(1)}, the weakest squad is overperforming wildly`);

  // Season two exists, is 2011-12, and the WORLD aged with it. The world,
  // not the human squad: a squad player whose contract ran out walks (that
  // is the Round 105 mechanic working, the first draft of this check read a
  // walked-out Messi as a bug), so the ageing assertion reads the projected
  // world, which is what every AI club and the market are built from.
  Math.random = seeded(31337);
  const s1 = playSeason(startCareer('Barcelona', 'era2010'));
  const s2 = startNextSeason(s1);
  if (!/2011-12/.test(worldSeasonLabel(s2))) fail(`season two reads ${worldSeasonLabel(s2)}`);
  if (s2.squad.length < 16) fail(`season two came out of the summer with ${s2.squad.length} players`);
  const world1 = cm.projectedRoster('Barcelona', 1, 'era2010');
  const messiW = world1.find(p => p.n === 'Lionel Messi');
  if (!messiW) fail('Messi is not in the year-one 2010 world projection');
  else if (messiW.a !== 23) fail(`year-one world Messi is ${messiW.a}, expected 23`);
  const world0 = cm.projectedRoster('Barcelona', 0, 'era2010');
  if (world0.some(p => p.g)) fail('the year-zero 2010 world contains generated players at Barcelona');
}

/* ---------- 5. The bake's own accounting ---------- */
console.log('5) The bake file tells the truth about itself');
{
  const clubs = Object.keys(ERA2010_ROSTERS).length;
  const players = Object.values(ERA2010_ROSTERS).reduce((s, r) => s + r.length, 0);
  console.log(`   meta says ${ERA2010_META.players} players / ${ERA2010_META.clubs} clubs; file holds ${players} / ${clubs}`);
  if (clubs !== ERA2010_META.clubs) fail(`meta clubs ${ERA2010_META.clubs} != actual ${clubs}`);
  if (players !== ERA2010_META.players) fail(`meta players ${ERA2010_META.players} != actual ${players}`);
  for (const club of Object.keys(ERA2010_ROSTERS)) {
    const n = ERA2010_ROSTERS[club].length;
    if (n < 8 && !ERA2010_PARTIAL.includes(club)) fail(`${club} has ${n} players and is not declared partial`);
    if (n >= 8 && ERA2010_PARTIAL.includes(club)) fail(`${club} has ${n} players but is declared partial`);
  }
  // The window corrections landed: the two most famous 2010 moves.
  if (!ERA2010_ROSTERS['Barcelona'].some(p => p.n === 'David Villa')) fail('Villa is not at 2010-11 Barcelona');
  if (ERA2010_ROSTERS['Valencia'].some(p => p.n === 'David Villa')) fail('Villa is still at Valencia');
  if (!ERA2010_ROSTERS['Real Madrid'].some(p => p.n === 'Mesut Özil')) fail('Ozil is not at 2010-11 Real Madrid');
  if (ERA2010_ROSTERS['Barcelona'].some(p => p.n === 'Zlatan Ibrahimović')) fail('Ibrahimovic is still at Barcelona, he left for Milan');
}

Math.random = REAL_RANDOM;
console.log('');
if (failures > 0) {
  console.error(`simEra2010: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simEra2010: green. 2010 is real, sealed, and plays like 2010.');
