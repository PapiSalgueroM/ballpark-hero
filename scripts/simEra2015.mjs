/**
 * Round 175 harness: the 2015-16 era is real, isolated, and plays like 2015.
 *
 * Phase two of the past eras program (CM-5's second half). Same promise the
 * 2010 era made, measured the same way, plus the checks only a second past
 * era makes possible (the same human aging correctly BETWEEN the two pasts):
 *
 *   1. YEAR ZERO IDENTITY. A fresh 2015 save is handed the real 2015 squad,
 *      name for name, age for age, rating through the documented uplift.
 *      Leicester get the real title squad: Vardy, Mahrez, Kante.
 *   2. ERA ISOLATION. No 2026-only player reachable in a 2015 market, no
 *      2015-only player in the 2026 market, shared names age by roughly the
 *      eleven year gap, and 2015-vs-2010 shared names by roughly five.
 *   3. THE LADDER over all 40 era clubs: Barcelona told to win it, August
 *      2015 Leicester told nothing of the sort (that is the whole story),
 *      and NOBODY promised the Conference League, which did not exist.
 *   4. SEASONS COMPLETE and land plausibly. Measured 2026-08-18 over six
 *      seeds each on this stream: Barcelona finishes 2,1,1,2,1,1 (mean 1.3,
 *      worst 2), Las Palmas 20,20,20,20,20,20 (the five real players plus
 *      youth padding finish bottom every time). Margins below sit far
 *      inside that.
 *   5. The bake's own accounting, including the verified summer 2015 window
 *      corrections (Sterling to City, Pedro to Chelsea, De Bruyne arriving,
 *      Di Maria gone to a league outside this world).
 *   6. The era uplift: giants above the modern best, order preserved, the
 *      pre-title Leicester squad untouched below the pivot.
 *
 * Run: node scripts/simEra2015.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/era2015Entry.mjs';
const BUNDLE = '/tmp/era2015.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT}/src/lib/clubManager.ts');
const eras = await import('${ROOT}/src/lib/clubManagerEras.ts');
const era2015 = await import('${ROOT}/src/data/clubManagerEra2015.ts');
const era2010 = await import('${ROOT}/src/data/clubManagerEra2010.ts');
const modern = await import('${ROOT}/src/data/clubManagerRosters.ts');
export { engine, eras, era2015, era2010, modern };
`);
execSync(
  `${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`,
  { stdio: 'inherit' },
);

const { engine: cm, eras: ER, era2015: E15, era2010: E10, modern: MOD } = await import(BUNDLE);
const { eraUpliftRating, eraRosters, projectedRoster } = ER;
const {
  startCareer, playNextEntry, startNextSeason, sortedTable, buildMarket,
  buildBoardObjectives, ERA_LEAGUES, eraPlayableClubs, worldSeasonLabel,
} = cm;
const { ERA2015_ROSTERS, ERA2015_META, ERA2015_PARTIAL } = E15;
const { ERA2010_ROSTERS } = E10;
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
console.log('1) A fresh 2015 save is the real 2015 squad, untouched');
{
  Math.random = seeded(11);
  const s = startCareer('Barcelona', 'era2015');
  const bake = new Map(ERA2015_ROSTERS['Barcelona'].map(p => [p.n, p]));
  let mismatches = 0;
  for (const p of s.squad.filter(p => !p.isYouth)) {
    const b = bake.get(p.name);
    if (!b) { mismatches += 1; fail(`${p.name} is in the 2015 Barcelona squad but not in the bake`); continue; }
    if (b.a !== p.age || eraUpliftRating('era2015', b.r) !== p.rating) {
      mismatches += 1;
      fail(`${p.name}: bake says age ${b.a} rating ${b.r} (uplift ${eraUpliftRating('era2015', b.r)}), squad says ${p.age}/${p.rating}`);
    }
  }
  const gen = s.squad.filter(p => p.generated).length;
  console.log(`   ${s.squad.length} in squad, ${mismatches} mismatches, ${gen} generated`);
  if (gen !== 0) fail(`a dense 2015 club got ${gen} generated players on day one`);
  if (s.startYear !== 2015) fail(`the save started in ${s.startYear}`);
  if (!/2015-16/.test(worldSeasonLabel(s))) fail(`season label reads ${worldSeasonLabel(s)}`);
  // The marquee names, by name. MSN plus the summer arrival.
  for (const name of ['Lionel Messi', 'Neymar', 'Luis Suárez', 'Andrés Iniesta', 'Arda Turan']) {
    if (!s.squad.some(p => p.name === name)) fail(`2015 Barcelona is missing ${name}`);
  }
  const messi = s.squad.find(p => p.name === 'Lionel Messi');
  if (messi && messi.age !== 27) fail(`2015 Messi is ${messi.age}, the bake says 27`);

  // The champions. A 2015-16 world without the real Leicester squad would be
  // missing its own headline, so this is by name and it fails loud. Wes
  // Morgan is deliberately NOT here: the captain has no year-2015 row in the
  // table at all (2014 and 2016 only), and the data rule says thin is honest,
  // so he is absent rather than invented. The bake header documents it.
  Math.random = seeded(13);
  const lei = startCareer('Leicester City', 'era2015');
  for (const name of ['Jamie Vardy', 'Riyad Mahrez', "N'Golo Kanté", 'Shinji Okazaki', 'Robert Huth', 'Kasper Schmeichel']) {
    if (!lei.squad.some(p => p.name === name)) fail(`2015 Leicester are missing ${name}`);
  }
}

/* ---------- 2. Era isolation, in every direction ---------- */
console.log('2) Three worlds now, and none of them leak');
{
  Math.random = seeded(23);
  const old = startCareer('Real Madrid', 'era2015');
  const oldMarket = buildMarket(old);
  const oldNames = new Set(oldMarket.map(p => p.name));
  // 2026-only stars must not exist in 2015. All four post-date 2015 as top
  // flight players (Yamal was 8 years old that summer).
  for (const name of ['Jude Bellingham', 'Erling Haaland', 'Lamine Yamal', 'Désiré Doué']) {
    if (oldNames.has(name)) fail(`${name} is on the 2015 market`);
  }
  // And the 2015 market is really the 2015 world: era players at era ages.
  // (Not a Madrid player: this save manages Madrid, so its own squad is off
  // the market by definition. The first draft asked for Kroos and learned.)
  const aguero = oldMarket.find(p => p.name === 'Sergio Agüero');
  if (!aguero) fail('2015 Aguero is not on the 2015 market');
  else if (aguero.age !== 26) fail(`market Aguero is ${aguero.age}, 2015 says 26`);

  Math.random = seeded(29);
  const now = startCareer('Arsenal');
  const nowNames = new Set(buildMarket(now).map(p => p.name));
  const modernNames = new Set(Object.values(CM_ROSTERS).flat().map(p => p.n));
  let checked = 0, leaked = 0;
  for (const roster of Object.values(ERA2015_ROSTERS)) {
    for (const p of roster) {
      if (modernNames.has(p.n)) continue;
      checked += 1;
      if (nowNames.has(p.n)) { leaked += 1; if (leaked <= 3) fail(`2015-only ${p.n} is on the 2026 market`); }
    }
  }
  console.log(`   ${checked} era-exclusive names checked against the 2026 market, ${leaked} leaks`);
  if (checked < 300) fail(`only ${checked} era-exclusive names? the eras are suspiciously similar`);

  /* Shared names are the same human eleven years apart (2026 vs 2015), or
     five years apart (2015 vs 2010). Transfermarkt snapshots wobble a year
     either side, so the windows are 9-13 and 3-7. Genuine namesakes, two
     different real people wearing one name, are allowlisted after being
     verified as such. Each entry below was verified on 2026-08-18 as two
     distinct real footballers: the 2015 Welsh Aaron Ramsey (b. 1990) vs the
     English one (b. 2003); the 2015 Uruguayan Luis Suarez (b. 1987) vs the
     Colombian striker (b. 1997); Espanyol's 2015 Javi Lopez (b. 1986) vs
     Alaves' (b. 2002); Malaga's 2015 striker Javi Guerra (b. 1982) vs
     Valencia's midfielder (b. 2003); Sevilla's 2015 keeper Beto (b. 1982)
     vs the modern striker (b. 1998). A NEW name failing here after a
     re-bake stays failed until somebody verifies it is a genuine namesake
     and adds it deliberately. Verified 2026-08-19 after the Round 185
     Swiss bake: Real Madrid's 2015 Brazilian CDM Lucas Silva (b. 1993,
     the Cruzeiro one) vs Luzern's Portuguese academy midfielder Lucas
     Manuel Silva Ferreira (b. 2006), confirmed distinct on his Soccerway
     profile and Luzern's July 2026 contract-extension news. */
  /* Round 191 additions, verified 2026-08-20 with the Serie A bake: every
     pair below is two independently sourced real rows whose ages cannot be
     one human. Diego Lopez the Milan keeper (b. 1981) vs Valencia's winger
     (b. 2002); Carpi's keeper Gabriel (b. 1992) vs Arsenal's centre-back
     (b. 1997); Inter's left-back Dodo (b. 1992) vs Fiorentina's right-back
     (b. 1998); Juventus' midfielder Romulo (b. 1987) vs the young Leipzig
     forward; Lazio's Brazilian playmaker Ederson (b. 1986) vs the modern
     goalkeeper (b. 1993); Udinese's centre-back Danilo (b. 1984) vs the
     Forest midfielder; Udinese's Brazilian left-back Gabriel Silva
     (b. 1991) vs Santa Clara's; and one of Brazil's many Guilhermes
     against another. */
  const NAMESAKES_2026 = new Set(['Aaron Ramsey', 'Luis Suárez', 'Javi López', 'Javi Guerra', 'Beto', 'Lucas Silva',
    'Diego López', 'Gabriel', 'Dodô', 'Rômulo', 'Ederson', 'Danilo', 'Gabriel Silva', 'Guilherme']);
  const eraByName = new Map();
  for (const roster of Object.values(ERA2015_ROSTERS)) for (const p of roster) eraByName.set(p.n, p);
  const modByName = new Map();
  for (const roster of Object.values(CM_ROSTERS)) for (const p of roster) modByName.set(p.n, p);
  let shared = 0, weird = 0, namesakes = 0;
  const weirdList = [];
  for (const [name, p15] of eraByName) {
    const pNow = modByName.get(name);
    if (!pNow) continue;
    shared += 1;
    if (NAMESAKES_2026.has(name)) { namesakes += 1; continue; }
    const gap = pNow.a - p15.a;
    if (gap < 9 || gap > 13) {
      weird += 1;
      weirdList.push(`${name} (${p15.a} -> ${pNow.a})`);
    }
  }
  if (weird > 0) fail(`${weird} shared 2015/2026 names age impossibly: ${weirdList.slice(0, 6).join(', ')} ... verify and allowlist genuine namesakes`);
  console.log(`   ${shared} names exist in 2015 and 2026: ${namesakes} verified namesakes, ${weird} unexplained`);
  if (shared - namesakes < 30) fail('almost no true 2015-to-2026 survivors? the age window itself may be wrong');

  /* And between the two pasts: five years apart, same rules. Verified
     2026-08-18: the 2010 Atletico winger Simao (b. 1979) vs Levante's 2015
     Simao Mate Junior (b. 1988); the 2010 Fernando (b. 1980 vintage row) vs
     Manchester City's 2015 Brazilian Fernando (b. 1987). */
  const NAMESAKES_2010 = new Set(['Simão', 'Fernando', 'David López']); // Round 191: Athletic's 2010 winger (b. 1982) vs Napoli's 2015 defender (b. 1989)
  const oldByName = new Map();
  for (const roster of Object.values(ERA2010_ROSTERS)) for (const p of roster) oldByName.set(p.n, p);
  let shared10 = 0, weird10 = 0, namesakes10 = 0;
  const weird10List = [];
  for (const [name, p15] of eraByName) {
    const p10 = oldByName.get(name);
    if (!p10) continue;
    shared10 += 1;
    if (NAMESAKES_2010.has(name)) { namesakes10 += 1; continue; }
    const gap = p15.a - p10.a;
    if (gap < 3 || gap > 7) {
      weird10 += 1;
      weird10List.push(`${name} (${p10.a} -> ${p15.a})`);
    }
  }
  if (weird10 > 0) fail(`${weird10} shared 2010/2015 names age impossibly: ${weird10List.slice(0, 6).join(', ')}`);
  console.log(`   ${shared10} names exist in 2010 and 2015: ${namesakes10} allowlisted, ${weird10} unexplained`);
  if (shared10 - namesakes10 < 30) fail('almost nobody survived from 2010 to 2015? the window itself may be wrong');
}

/* ---------- 3. The 2015 ladder ---------- */
console.log('3) Boards talk 2015: title for Barcelona, survival talk for August Leicester');
{
  const leagues = ERA_LEAGUES['era2015'] ?? [];
  /* Round 191: the Serie A joined, so the era holds three leagues now. */
  if (leagues.length !== 3) fail(`era2015 has ${leagues.length} leagues`);
  let labels = 0;
  for (const lg of leagues) {
    const targets = [];
    for (const c of eraPlayableClubs('era2015', lg.id)) {
      const objs = buildBoardObjectives(c.name, false, lg.clubs.length, 'era2015');
      const league = objs.find(o => o.id === 'league');
      if (!league) { fail(`${c.name} got no league demand`); continue; }
      labels += 1;
      if (/Conference League/i.test(league.label)) fail(`${c.name} promised the Conference League in 2015`);
      if (/top \d+/i.test(league.label)) fail(`${c.name}: positional phrase "${league.label}"`);
      targets.push({ rank: c.expectation, target: league.target, name: c.name });
    }
    targets.sort((a, b) => a.rank - b.rank);
    for (let i = 1; i < targets.length; i++) {
      if (targets[i].target < targets[i - 1].target) {
        fail(`${lg.name} 2015: ${targets[i].name} asked for more than stronger ${targets[i - 1].name}`);
      }
    }
  }
  console.log(`   ${labels} club demands checked across the three 2015 leagues`);
  const leagueTargetOf = name => {
    const lg = leagues.find(l => l.clubs.includes(name));
    return buildBoardObjectives(name, false, lg.clubs.length, 'era2015').find(o => o.id === 'league')?.target ?? 99;
  };
  for (const giant of ['Barcelona', 'Real Madrid', 'Juventus']) {
    if (leagueTargetOf(giant) !== 1) fail(`2015 ${giant} is not told to win the league`);
  }
  /* The whole point of this season: in August 2015 NOBODY told Leicester to
     win anything. Their board demand must sit in the bottom half of the
     table, like Norwich's and Las Palmas', or the era's stature model has
     failed at its one famous test. */
  for (const modest of ['Leicester City', 'Norwich City', 'Bournemouth', 'Las Palmas', 'Eibar']) {
    if (leagueTargetOf(modest) <= 8) fail(`2015 ${modest} is asked for a top-${leagueTargetOf(modest)} finish, August 2015 boards asked no such thing`);
  }
  const copaClub = buildBoardObjectives('Sevilla', false, 20, 'era2015').find(o => o.id === 'cup');
  if (copaClub && !/Copa del Rey/.test(copaClub.label)) fail(`2015 Sevilla's cup objective says "${copaClub.label}"`);
}

/* ---------- 4. Seasons complete and land where 2015 says ---------- */
console.log('4) Full seasons play out plausibly in both leagues');
{
  const posOf = (club, era, seed) => {
    Math.random = seeded(seed);
    const s = playSeason(startCareer(club, era));
    const table = sortedTable(s.table);
    if (table.length !== 20) fail(`${club}: a 2015 table with ${table.length} rows`);
    return table.findIndex(r => r.club === club) + 1;
  };
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  /* Six seeds, hard floors from measured headroom (see the header). The
     check exists to catch a BROKEN strength model, MSN Barcelona sitting
     mid table, not to pin an exact finishing position. */
  const barca = [1, 2, 3, 4, 5, 6].map(i => posOf('Barcelona', 'era2015', i * 7919));
  const lp = [1, 2, 3, 4, 5, 6].map(i => posOf('Las Palmas', 'era2015', i * 104729));
  console.log(`   Barcelona finishes: ${barca.join(',')} · Las Palmas finishes: ${lp.join(',')}`);
  if (mean(barca) > 3.5) fail(`MSN Barcelona averaged position ${mean(barca).toFixed(1)}`);
  if (Math.max(...barca) > 10) fail(`MSN Barcelona finished ${Math.max(...barca)} in one seed, which is a broken model, not variance`);
  if (mean(lp) < 11) fail(`Las Palmas averaged position ${mean(lp).toFixed(1)}, the thinnest squad is overperforming wildly`);

  // Season two exists, is 2016-17, and the WORLD aged with it.
  Math.random = seeded(31337);
  const s1 = playSeason(startCareer('Barcelona', 'era2015'));
  const s2 = startNextSeason(s1);
  if (!/2016-17/.test(worldSeasonLabel(s2))) fail(`season two reads ${worldSeasonLabel(s2)}`);
  if (s2.squad.length < 16) fail(`season two came out of the summer with ${s2.squad.length} players`);
  const world1 = cm.projectedRoster('Barcelona', 1, 'era2015');
  const messiW = world1.find(p => p.n === 'Lionel Messi');
  if (!messiW) fail('Messi is not in the year-one 2015 world projection');
  else if (messiW.a !== 28) fail(`year-one world Messi is ${messiW.a}, expected 28`);
  const world0 = cm.projectedRoster('Barcelona', 0, 'era2015');
  if (world0.some(p => p.g)) fail('the year-zero 2015 world contains generated players at Barcelona');
}

/* ---------- 5. The bake's own accounting ---------- */
console.log('5) The bake file tells the truth about itself');
{
  const clubs = Object.keys(ERA2015_ROSTERS).length;
  const players = Object.values(ERA2015_ROSTERS).reduce((s, r) => s + r.length, 0);
  console.log(`   meta says ${ERA2015_META.players} players / ${ERA2015_META.clubs} clubs; file holds ${players} / ${clubs}`);
  if (clubs !== ERA2015_META.clubs) fail(`meta clubs ${ERA2015_META.clubs} != actual ${clubs}`);
  if (players !== ERA2015_META.players) fail(`meta players ${ERA2015_META.players} != actual ${players}`);
  for (const club of Object.keys(ERA2015_ROSTERS)) {
    const n = ERA2015_ROSTERS[club].length;
    if (n < 8 && !ERA2015_PARTIAL.includes(club)) fail(`${club} has ${n} players and is not declared partial`);
    if (n >= 8 && ERA2015_PARTIAL.includes(club)) fail(`${club} has ${n} players but is declared partial`);
  }
  // The window corrections landed: the famous summer of 2015, both ways.
  if (!ERA2015_ROSTERS['Manchester City'].some(p => p.n === 'Raheem Sterling')) fail('Sterling is not at 2015-16 City');
  if (ERA2015_ROSTERS['Liverpool'].some(p => p.n === 'Raheem Sterling')) fail('Sterling is still at Liverpool');
  if (!ERA2015_ROSTERS['Manchester City'].some(p => p.n === 'Kevin De Bruyne')) fail('De Bruyne did not arrive at City');
  if (!ERA2015_ROSTERS['Chelsea'].some(p => p.n === 'Pedro')) fail('Pedro is not at 2015-16 Chelsea');
  if (ERA2015_ROSTERS['Barcelona'].some(p => p.n === 'Pedro')) fail('Pedro is still at Barcelona');
  if (!ERA2015_ROSTERS['Leicester City'].some(p => p.n === "N'Golo Kanté")) fail('Kante did not arrive at Leicester');
  for (const roster of Object.values(ERA2015_ROSTERS)) {
    if (roster.some(p => p.n === 'Ángel Di María')) fail('Di Maria is still in this world, he left for a league outside it');
    if (roster.some(p => p.n === 'Steven Gerrard')) fail('Gerrard is still in this world, he left for LA');
  }
}

/* ---------- 6. The era uplift: giants above the modern best ---------- */
console.log('6) Legends rate like legends; pre-title Leicester stay honest');
{
  const lifted = eraRosters('era2015');
  const messi = lifted['Barcelona'].find(p => p.n === 'Lionel Messi');
  const ronaldo = lifted['Real Madrid'].find(p => p.n === 'Cristiano Ronaldo');
  const modernBest = Math.max(...Object.values(CM_ROSTERS).flat().map(p => p.r));
  console.log(`   2015 Messi ${messi?.r}, 2015 Ronaldo ${ronaldo?.r}, modern best ${modernBest}`);
  if (!messi || messi.r < 96) fail(`2015 Messi rates ${messi?.r}, peak MSN sits 96 plus`);
  if (!ronaldo || ronaldo.r < 96) fail(`2015 Ronaldo rates ${ronaldo?.r}`);
  if (messi && messi.r <= modernBest) fail(`2015 Messi (${messi.r}) does not outrate the modern best (${modernBest})`);
  // The pre-title champions sit below the pivot and must be untouched: their
  // honest August 2015 level IS the story this era tells.
  const rawLei = new Map(ERA2015_ROSTERS['Leicester City'].map(p => [p.n, p.r]));
  const liftedLei = lifted['Leicester City'];
  for (const p of liftedLei) {
    const raw = rawLei.get(p.n);
    if (raw !== undefined && raw <= 80 && p.r !== raw) fail(`${p.n} lifted from ${raw} to ${p.r}, pre-title Leicester must stay honest`);
  }
  // Monotone, values untouched, capped, sealed to its era.
  for (const [club, raw] of Object.entries(ERA2015_ROSTERS)) {
    const before = [...raw].sort((a, b) => b.r - a.r).map(p => p.n).join('|');
    const after = [...lifted[club]].sort((a, b) => b.r - a.r).map(p => p.n).join('|');
    if (before !== after) fail(`${club}: the uplift reordered the squad`);
    for (let i = 0; i < raw.length; i++) {
      if (lifted[club][i].v !== raw[i].v) fail(`${raw[i].n}: the uplift touched his VALUE`);
      if (lifted[club][i].r > 99) fail(`${raw[i].n} lifted past 99`);
    }
  }
  if (eraUpliftRating('now', 94) !== 94 || eraUpliftRating(undefined, 90) !== 90) fail('the uplift leaked outside its era');
  // Ageing headroom follows the anchor.
  const y1 = projectedRoster('Barcelona', 1, 'era2015');
  const messiY1 = y1.find(p => p.n === 'Lionel Messi');
  if (messiY1 && messiY1.r < 95) fail(`year-one Messi snapped to ${messiY1.r}, the ceiling did not follow the anchor`);
  // Stature stayed calibrated: era tiers and expectations read the raw bake.
  // By 2015 squad value, Madrid's XI edges Barcelona's (Bale, James, Kroos,
  // Modric behind Ronaldo), so Barcelona rank second in stature while still
  // being told to win it (section 3 checks that). Both must be tier 1.
  const barcaDef = cm.eraClubDefFor('Barcelona', 'era2015');
  const madridDef = cm.eraClubDefFor('Real Madrid', 'era2015');
  if (barcaDef.tier !== 1 || barcaDef.expectation > 2) fail(`2015 Barcelona reads tier ${barcaDef.tier} expectation ${barcaDef.expectation}`);
  if (madridDef.tier !== 1 || madridDef.expectation > 2) fail(`2015 Real Madrid reads tier ${madridDef.tier} expectation ${madridDef.expectation}`);
}

Math.random = REAL_RANDOM;
console.log('');
if (failures > 0) {
  console.error(`simEra2015: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simEra2015: green. 2015 is real, sealed, and plays like 2015.');
