/**
 * Round 176 harness: the 2005-06 era is real, isolated, and plays like 2005.
 *
 * The last slice of the past eras program the data can honestly reach (the
 * table bottoms out at 2004, and a season needs the year after it for the
 * two-way move verification). Same promises as the 2010 and 2015 harnesses,
 * plus the checks only THIS era needs:
 *
 *   1. YEAR ZERO IDENTITY. A fresh 2005 save is the real 2005 squad through
 *      the documented uplift. Barcelona get Ronaldinho, Eto'o and a 17 year
 *      old Messi; Chelsea get Lampard, Terry, Drogba and the arriving
 *      Essien.
 *   2. ERA ISOLATION across all FOUR worlds now: no 2026-only player in a
 *      2005 market, no 2005-only player in the 2026 market, and shared
 *      names age correctly across every era pair (21 years to 2026, 10 to
 *      2015, 5 to 2010).
 *   3. THE LADDER over all 40 clubs, and the era's own vocabulary: no board
 *      promises the Conference League (2021) OR the Europa League (2009),
 *      because in 2005 the second prize was the UEFA CUP, and the boards
 *      say exactly that.
 *   4. SEASONS COMPLETE and land plausibly. Measured 2026-08-19 over six
 *      seeds each on this stream: Chelsea finishes 1,1,1,1,1,1 (Mourinho
 *      would approve), Cadiz 20,15,20,19,20,20 (the one real player plus
 *      youth padding). Margins below sit far inside that.
 *   5. The bake's own accounting, including the verified summer 2005 window
 *      corrections (Owen to Newcastle, Ramos to Madrid, Essien arriving,
 *      Vieira gone to a league outside this world).
 *   6. The era uplift at its steepest (gain 1.67, measured): Ronaldinho and
 *      Henry above the modern best, the 17 year old Messi honest at 73.
 *
 * Run: node scripts/simEra2005.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/era2005Entry.mjs';
const BUNDLE = '/tmp/era2005.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT}/src/lib/clubManager.ts');
const eras = await import('${ROOT}/src/lib/clubManagerEras.ts');
const era2005 = await import('${ROOT}/src/data/clubManagerEra2005.ts');
const era2010 = await import('${ROOT}/src/data/clubManagerEra2010.ts');
const era2015 = await import('${ROOT}/src/data/clubManagerEra2015.ts');
const modern = await import('${ROOT}/src/data/clubManagerRosters.ts');
export { engine, eras, era2005, era2010, era2015, modern };
`);
execSync(
  `${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`,
  { stdio: 'inherit' },
);

const { engine: cm, eras: ER, era2005: E05, era2010: E10, era2015: E15, modern: MOD } = await import(BUNDLE);
const { eraUpliftRating, eraRosters, projectedRoster } = ER;
const {
  startCareer, playNextEntry, startNextSeason, sortedTable, buildMarket,
  buildBoardObjectives, ERA_LEAGUES, eraPlayableClubs, worldSeasonLabel,
} = cm;
const { ERA2005_ROSTERS, ERA2005_META, ERA2005_PARTIAL } = E05;
const { ERA2010_ROSTERS } = E10;
const { ERA2015_ROSTERS } = E15;
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
console.log('1) A fresh 2005 save is the real 2005 squad, untouched');
{
  Math.random = seeded(11);
  const s = startCareer('Barcelona', 'era2005');
  const bake = new Map(ERA2005_ROSTERS['Barcelona'].map(p => [p.n, p]));
  let mismatches = 0;
  for (const p of s.squad.filter(p => !p.isYouth)) {
    const b = bake.get(p.name);
    if (!b) { mismatches += 1; fail(`${p.name} is in the 2005 Barcelona squad but not in the bake`); continue; }
    if (b.a !== p.age || eraUpliftRating('era2005', b.r) !== p.rating) {
      mismatches += 1;
      fail(`${p.name}: bake says age ${b.a} rating ${b.r} (uplift ${eraUpliftRating('era2005', b.r)}), squad says ${p.age}/${p.rating}`);
    }
  }
  const gen = s.squad.filter(p => p.generated).length;
  console.log(`   ${s.squad.length} in squad, ${mismatches} mismatches, ${gen} generated`);
  if (gen !== 0) fail(`a dense 2005 club got ${gen} generated players on day one`);
  if (s.startYear !== 2005) fail(`the save started in ${s.startYear}`);
  if (!/2005-06/.test(worldSeasonLabel(s))) fail(`season label reads ${worldSeasonLabel(s)}`);
  for (const name of ['Ronaldinho', "Samuel Eto'o", 'Deco', 'Lionel Messi', 'Mark van Bommel']) {
    if (!s.squad.some(p => p.name === name)) fail(`2005 Barcelona is missing ${name}`);
  }
  const messi = s.squad.find(p => p.name === 'Lionel Messi');
  if (messi && messi.age !== 17) fail(`2005 Messi is ${messi.age}, the bake says 17`);

  // The champions: Mourinho's back to back side, with the record signing.
  Math.random = seeded(13);
  const che = startCareer('Chelsea', 'era2005');
  for (const name of ['Frank Lampard', 'John Terry', 'Didier Drogba', 'Petr Cech', 'Michael Essien', 'Shaun Wright-Phillips']) {
    if (!che.squad.some(p => p.name === name)) fail(`2005 Chelsea are missing ${name}`);
  }
}

/* ---------- 2. Era isolation, four worlds now ---------- */
console.log('2) Four worlds, and none of them leak');
{
  Math.random = seeded(23);
  const old = startCareer('Real Madrid', 'era2005');
  const oldMarket = buildMarket(old);
  const oldNames = new Set(oldMarket.map(p => p.name));
  for (const name of ['Jude Bellingham', 'Erling Haaland', 'Lamine Yamal', 'Kylian Mbappé']) {
    if (oldNames.has(name)) fail(`${name} is on the 2005 market`);
  }
  // The 2005 market is really the 2005 world (not my own Madrid squad).
  const henry = oldMarket.find(p => p.name === 'Thierry Henry');
  if (!henry) fail('2005 Henry is not on the 2005 market');
  else if (henry.age !== 27) fail(`market Henry is ${henry.age}, 2005 says 27`);

  Math.random = seeded(29);
  const now = startCareer('Arsenal');
  const nowNames = new Set(buildMarket(now).map(p => p.name));
  const modernNames = new Set(Object.values(CM_ROSTERS).flat().map(p => p.n));
  let checked = 0, leaked = 0;
  for (const roster of Object.values(ERA2005_ROSTERS)) {
    for (const p of roster) {
      if (modernNames.has(p.n)) continue;
      checked += 1;
      if (nowNames.has(p.n)) { leaked += 1; if (leaked <= 3) fail(`2005-only ${p.n} is on the 2026 market`); }
    }
  }
  console.log(`   ${checked} era-exclusive names checked against the 2026 market, ${leaked} leaks`);
  if (checked < 500) fail(`only ${checked} era-exclusive names? the eras are suspiciously similar`);

  /* Shared names across every pair of worlds age by the calendar gap, with
     a year of snapshot wobble each side. Genuine namesakes, two different
     real people wearing one name, are allowlisted after verification. Each
     entry was verified on 2026-08-19 as two distinct real footballers:
     Atletico's 2005 Pablo Ibanez (b. 1981) vs the modern one; Deportivo's
     2005 Manu Sanchez (b. 1979 vintage) vs the modern left back (b. 2000);
     Uruguay's Pablo Garcia (b. 1977) vs the modern teenager; Victor Sanchez
     del Amo (b. 1976) vs Espanyol's 2015 Victor Sanchez (b. 1987); the
     1970s-born Dani Garcia vs Eibar's 2015 one (b. 1990); Liverpool's Luis
     Garcia (b. 1978, the byPlayer merge keeps him over Mallorca's cheaper
     namesake) vs the 2010 bake's Luis Garcia (b. 1981); West Brom's Andy
     Johnson (b. 1974) vs the striker (b. 1981). Fernando carries over from
     the 2015 harness's verified pair. A NEW name failing here stays failed
     until somebody verifies it is a genuine namesake. */
  const pairs = [
    { label: '2005 vs 2026', other: null, lo: 19, hi: 23, minShared: 2, namesakes: new Set(['Pablo Ibáñez', 'Manu Sánchez', 'Pablo García']) },
    { label: '2005 vs 2015', other: ERA2015_ROSTERS, lo: 8, hi: 12, minShared: 25, namesakes: new Set(['Fernando', 'Víctor Sánchez', 'Dani García']) },
    { label: '2005 vs 2010', other: ERA2010_ROSTERS, lo: 3, hi: 7, minShared: 60, namesakes: new Set(['Luis García', 'Andy Johnson']) },
  ];
  const e05ByName = new Map();
  for (const roster of Object.values(ERA2005_ROSTERS)) for (const p of roster) e05ByName.set(p.n, p);
  for (const pair of pairs) {
    const otherByName = new Map();
    const source = pair.other ?? CM_ROSTERS;
    for (const roster of Object.values(source)) for (const p of roster) otherByName.set(p.n, p);
    let shared = 0, weird = 0, allowed = 0;
    const weirdList = [];
    for (const [name, p05] of e05ByName) {
      const pOther = otherByName.get(name);
      if (!pOther) continue;
      shared += 1;
      if (pair.namesakes.has(name)) { allowed += 1; continue; }
      const gap = pOther.a - p05.a;
      if (gap < pair.lo || gap > pair.hi) {
        weird += 1;
        weirdList.push(`${name} (${p05.a} -> ${pOther.a})`);
      }
    }
    if (weird > 0) fail(`${pair.label}: ${weird} shared names age impossibly: ${weirdList.slice(0, 6).join(', ')}`);
    console.log(`   ${pair.label}: ${shared} shared names, ${allowed} allowlisted, ${weird} unexplained`);
    if (shared - allowed < pair.minShared) fail(`${pair.label}: almost no true survivors (${shared - allowed}), the window itself may be wrong`);
  }
}

/* ---------- 3. The 2005 ladder speaks 2005 ---------- */
console.log('3) Boards talk 2005: the UEFA Cup is the UEFA Cup');
{
  const leagues = ERA_LEAGUES['era2005'] ?? [];
  if (leagues.length !== 2) fail(`era2005 has ${leagues.length} leagues`);
  let labels = 0, uefaCupSeen = 0;
  for (const lg of leagues) {
    const targets = [];
    for (const c of eraPlayableClubs('era2005', lg.id)) {
      const objs = buildBoardObjectives(c.name, false, lg.clubs.length, 'era2005');
      const league = objs.find(o => o.id === 'league');
      if (!league) { fail(`${c.name} got no league demand`); continue; }
      labels += 1;
      if (/Conference League/i.test(league.label)) fail(`${c.name} promised the Conference League in 2005`);
      if (/Europa League/i.test(league.label)) fail(`${c.name} promised the Europa League, which was the UEFA Cup until 2009`);
      if (/UEFA Cup/.test(league.label)) uefaCupSeen += 1;
      if (/top \d+/i.test(league.label)) fail(`${c.name}: positional phrase "${league.label}"`);
      targets.push({ rank: c.expectation, target: league.target, name: c.name });
    }
    targets.sort((a, b) => a.rank - b.rank);
    for (let i = 1; i < targets.length; i++) {
      if (targets[i].target < targets[i - 1].target) {
        fail(`${lg.name} 2005: ${targets[i].name} asked for more than stronger ${targets[i - 1].name}`);
      }
    }
  }
  console.log(`   ${labels} club demands checked, ${uefaCupSeen} boards name the UEFA Cup`);
  if (uefaCupSeen === 0) fail('no 2005 board names the UEFA Cup, the era vocabulary is missing');
  const leagueTargetOf = name => {
    const lg = leagues.find(l => l.clubs.includes(name));
    return buildBoardObjectives(name, false, lg.clubs.length, 'era2005').find(o => o.id === 'league')?.target ?? 99;
  };
  for (const giant of ['Chelsea', 'Barcelona', 'Real Madrid', 'Manchester United']) {
    if (leagueTargetOf(giant) !== 1) fail(`2005 ${giant} is not told to win the league`);
  }
  for (const modest of ['Cádiz', 'Alavés', 'Wigan Athletic', 'Getafe']) {
    if (leagueTargetOf(modest) <= 8) fail(`2005 ${modest} is asked for a top-${leagueTargetOf(modest)} finish`);
  }
  const copaClub = buildBoardObjectives('Sevilla', false, 20, 'era2005').find(o => o.id === 'cup');
  if (copaClub && !/Copa del Rey/.test(copaClub.label)) fail(`2005 Sevilla's cup objective says "${copaClub.label}"`);
}

/* ---------- 4. Seasons complete and land where 2005 says ---------- */
console.log('4) Full seasons play out plausibly in both leagues');
{
  const posOf = (club, era, seed) => {
    Math.random = seeded(seed);
    const s = playSeason(startCareer(club, era));
    const table = sortedTable(s.table);
    if (table.length !== 20) fail(`${club}: a 2005 table with ${table.length} rows`);
    return table.findIndex(r => r.club === club) + 1;
  };
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const che = [1, 2, 3, 4, 5, 6].map(i => posOf('Chelsea', 'era2005', i * 7919));
  const cad = [1, 2, 3, 4, 5, 6].map(i => posOf('Cádiz', 'era2005', i * 104729));
  console.log(`   Chelsea finishes: ${che.join(',')} · Cadiz finishes: ${cad.join(',')}`);
  if (mean(che) > 3.5) fail(`Mourinho's Chelsea averaged position ${mean(che).toFixed(1)}`);
  if (Math.max(...che) > 10) fail(`Mourinho's Chelsea finished ${Math.max(...che)} in one seed, a broken model, not variance`);
  if (mean(cad) < 11) fail(`Cadiz averaged position ${mean(cad).toFixed(1)}, the thinnest squad in the game is overperforming wildly`);

  // Season two exists, is 2006-07, and the world aged with it.
  Math.random = seeded(31337);
  const s1 = playSeason(startCareer('Barcelona', 'era2005'));
  const s2 = startNextSeason(s1);
  if (!/2006-07/.test(worldSeasonLabel(s2))) fail(`season two reads ${worldSeasonLabel(s2)}`);
  if (s2.squad.length < 16) fail(`season two came out of the summer with ${s2.squad.length} players`);
  const world1 = cm.projectedRoster('Barcelona', 1, 'era2005');
  const messiW = world1.find(p => p.n === 'Lionel Messi');
  if (!messiW) fail('Messi is not in the year-one 2005 world projection');
  else if (messiW.a !== 18) fail(`year-one world Messi is ${messiW.a}, expected 18`);
  const world0 = cm.projectedRoster('Barcelona', 0, 'era2005');
  if (world0.some(p => p.g)) fail('the year-zero 2005 world contains generated players at Barcelona');
}

/* ---------- 5. The bake's own accounting ---------- */
console.log('5) The bake file tells the truth about itself');
{
  const clubs = Object.keys(ERA2005_ROSTERS).length;
  const players = Object.values(ERA2005_ROSTERS).reduce((s, r) => s + r.length, 0);
  console.log(`   meta says ${ERA2005_META.players} players / ${ERA2005_META.clubs} clubs; file holds ${players} / ${clubs}`);
  if (clubs !== ERA2005_META.clubs) fail(`meta clubs ${ERA2005_META.clubs} != actual ${clubs}`);
  if (players !== ERA2005_META.players) fail(`meta players ${ERA2005_META.players} != actual ${players}`);
  for (const club of Object.keys(ERA2005_ROSTERS)) {
    const n = ERA2005_ROSTERS[club].length;
    if (n < 8 && !ERA2005_PARTIAL.includes(club)) fail(`${club} has ${n} players and is not declared partial`);
    if (n >= 8 && ERA2005_PARTIAL.includes(club)) fail(`${club} has ${n} players but is declared partial`);
  }
  if (!ERA2005_PARTIAL.includes('Cádiz') || !ERA2005_PARTIAL.includes('Alavés')) fail('the two known-thin 2005 squads are not declared partial');
  // The window corrections landed, both ways.
  if (!ERA2005_ROSTERS['Newcastle'].some(p => p.n === 'Michael Owen')) fail('Owen is not at 2005-06 Newcastle');
  if (ERA2005_ROSTERS['Real Madrid'].some(p => p.n === 'Michael Owen')) fail('Owen is still at Real Madrid');
  if (!ERA2005_ROSTERS['Real Madrid'].some(p => p.n === 'Sergio Ramos')) fail('Ramos did not arrive at Madrid');
  if (ERA2005_ROSTERS['Sevilla'].some(p => p.n === 'Sergio Ramos')) fail('Ramos is still at Sevilla');
  if (!ERA2005_ROSTERS['Valencia'].some(p => p.n === 'David Villa')) fail('Villa did not arrive at Valencia');
  if (!ERA2005_ROSTERS['Liverpool'].some(p => p.n === 'Pepe Reina')) fail('Reina did not arrive at Liverpool');
  for (const roster of Object.values(ERA2005_ROSTERS)) {
    if (roster.some(p => p.n === 'Patrick Vieira')) fail('Vieira is still in this world, he left for Juventus');
    if (roster.some(p => p.n === 'Luís Figo')) fail('Figo is still in this world, he left for Inter');
  }
}

/* ---------- 6. The era uplift at its steepest ---------- */
console.log('6) Ronaldinho and Henry above the modern best; teenage Messi honest');
{
  const lifted = eraRosters('era2005');
  const dinho = lifted['Barcelona'].find(p => p.n === 'Ronaldinho');
  const henry = lifted['Arsenal'].find(p => p.n === 'Thierry Henry');
  const messi = lifted['Barcelona'].find(p => p.n === 'Lionel Messi');
  const modernBest = Math.max(...Object.values(CM_ROSTERS).flat().map(p => p.r));
  console.log(`   2005 Ronaldinho ${dinho?.r}, 2005 Henry ${henry?.r}, 17yo Messi ${messi?.r}, modern best ${modernBest}`);
  if (!dinho || dinho.r < 95) fail(`2005 Ronaldinho rates ${dinho?.r}, the Ballon d'Or holder sits 95 plus`);
  if (!henry || henry.r < 95) fail(`2005 Henry rates ${henry?.r}`);
  if (dinho && dinho.r <= modernBest) fail(`2005 Ronaldinho (${dinho.r}) does not outrate the modern best (${modernBest})`);
  // The 17 year old is a prospect, not a legend yet, and must stay one.
  const rawMessi = ERA2005_ROSTERS['Barcelona'].find(p => p.n === 'Lionel Messi');
  if (messi && rawMessi && messi.r !== rawMessi.r) fail(`teenage Messi lifted from ${rawMessi.r} to ${messi.r}, he sits below the pivot and must stay honest`);
  // Monotone, values untouched, capped, sealed to its era.
  for (const [club, raw] of Object.entries(ERA2005_ROSTERS)) {
    const before = [...raw].sort((a, b) => b.r - a.r).map(p => p.n).join('|');
    const after = [...lifted[club]].sort((a, b) => b.r - a.r).map(p => p.n).join('|');
    if (before !== after) fail(`${club}: the uplift reordered the squad`);
    for (let i = 0; i < raw.length; i++) {
      if (lifted[club][i].v !== raw[i].v) fail(`${raw[i].n}: the uplift touched his VALUE`);
      if (lifted[club][i].r > 99) fail(`${raw[i].n} lifted past 99`);
    }
  }
  if (eraUpliftRating('now', 94) !== 94 || eraUpliftRating(undefined, 90) !== 90) fail('the uplift leaked outside its era');
  const y1 = projectedRoster('Barcelona', 1, 'era2005');
  const dinhoY1 = y1.find(p => p.n === 'Ronaldinho');
  if (dinhoY1 && dinhoY1.r < 93) fail(`year-one Ronaldinho snapped to ${dinhoY1.r}, the ceiling did not follow the anchor`);
  const cheDef = cm.eraClubDefFor('Chelsea', 'era2005');
  if (cheDef.tier !== 1 || cheDef.expectation > 2) fail(`2005 Chelsea reads tier ${cheDef.tier} expectation ${cheDef.expectation}`);
}

Math.random = REAL_RANDOM;
console.log('');
if (failures > 0) {
  console.error(`simEra2005: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simEra2005: green. 2005 is real, sealed, and plays like 2005.');
