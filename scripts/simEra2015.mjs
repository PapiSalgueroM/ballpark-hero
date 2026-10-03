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
 * ROUND 899: the era is a full big five (the Bundesliga and Ligue 1 joined,
 * 98 clubs, 1,659 real players). What grew:
 *   1. Bayern and PSG get their real squads name for name, both directions.
 *   3. The ladder runs over all 98 clubs of five leagues; Bayern and PSG are
 *      told to win it; the four promoted thin squads are told no such thing;
 *      each new nation's cup is named in the cup demand.
 *   4. Measured 2026-10-02 over six seeds each (the streams in the code), on
 *      the world after the second review fix: Bayern finish 1,1,1,1,1,1
 *      (mean 1.00), PSG 1,1,1,1,1,1 (mean 1.00), GFC Ajaccio, the thinnest
 *      squad of the era with two real players (Issiaga Sylla came, Yoann
 *      Andreu left for Angers), 16,15,18,19,13,19 (mean 16.67). Barcelona
 *      1,1,1,2,2,2 (mean 1.50) and Las Palmas 20 six times; a different
 *      world draws the random stream differently. (Earlier trees: Bayern
 *      1.17, PSG 1.00 to 1.17, GFC Ajaccio 18.33 to 19.17.) The bands are on
 *      the MEANS: a giant must average 3.5 or better (2.3 places of headroom
 *      over the worst giant mean measured on any tree) and the thin club 11
 *      or worse (5.7 places of headroom over 16.67, and its single best seed
 *      of 13 is still above the band). No band reads a single worst seed.
 *   5. The extension's accounting: 98 clubs, 1,659 players, 360 corrections,
 *      292 Bundesliga and 253 Ligue 1 players, the seven thin clubs by name,
 *      one man at one club in the whole world, the eight men earlier rounds
 *      removed who are home now, the thirteen folds, a sample of the window.
 * Four negative controls, SIM_ERA2015_CONTROL=dupe|stale|threeleagues|longname,
 * each of which must end the run red (see the block where they are defined).
 *
 * Run: node scripts/simEra2015.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'era2015Entry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'era2015.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
const eras = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManagerEras.ts');
const era2015 = await import('${ROOT.replaceAll('\\', '/')}/src/data/clubManagerEra2015.ts');
const era2010 = await import('${ROOT.replaceAll('\\', '/')}/src/data/clubManagerEra2010.ts');
const modern = await import('${ROOT.replaceAll('\\', '/')}/src/data/clubManagerRosters.ts');
export { engine, eras, era2015, era2010, modern };
`);
execSync(
  `${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`,
  { stdio: 'inherit' },
);

const { engine: cm, eras: ER, era2015: E15, era2010: E10, modern: MOD } = await import(pathToFileURL(BUNDLE).href);
/* Round 832: an era's squads load with the era, so the harness fetches all three first. */
await ER.ensureAllEraRosters();
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

/* NEGATIVE CONTROLS (Round 899). SIM_ERA2015_CONTROL=<name> breaks one thing
   IN MEMORY (nothing on disk is touched) and the run must then end red, exit
   1. Each control first proves the thing it breaks is there, and refuses with
   exit 2 when it is not, so a control that changed nothing can never read as
   a control that fired. A control run skips the played seasons of section 4,
   which no control touches.
     dupe          Di Maria at PSG AND back at Manchester United: the one man,
                   one club check and the re-audit check must both fail.
     stale         Draxler sent back to Schalke: the window check must fail.
     threeleagues  the era cut back to its first three leagues for section 3:
                   the league count, the sizes and the 98 demands must fail.
     longname      section 7b's old save holds names the engine never had
                   in place of the two old long names: its strength and
                   association checks must fail. */
const CONTROL = process.env.SIM_ERA2015_CONTROL ?? '';
if (CONTROL && !['dupe', 'stale', 'threeleagues', 'longname'].includes(CONTROL)) { console.error(`unknown control ${CONTROL}`); process.exit(2); }
const controlRefuse = why => { console.error(`CONTROL ${CONTROL} did not apply: ${why}`); process.exit(2); };
function controlDupe(rosters) {
  const row = (rosters['PSG'] ?? []).find(p => p.n === 'Ángel Di María');
  if (!row) controlRefuse('there is no Di Maria at PSG to duplicate');
  if ((rosters['Manchester United'] ?? []).some(p => p.n === 'Ángel Di María')) controlRefuse('he is already at Manchester United');
  console.log('   CONTROL dupe applied: Di Maria is at PSG and at Manchester United');
  return { ...rosters, 'Manchester United': [...rosters['Manchester United'], row] };
}
function controlStale(rosters) {
  const row = (rosters['Wolfsburg'] ?? []).find(p => p.n === 'Julian Draxler');
  if (!row) controlRefuse('there is no Draxler at Wolfsburg to send back');
  console.log('   CONTROL stale applied: Draxler is back at Schalke');
  return { ...rosters, 'Wolfsburg': rosters['Wolfsburg'].filter(p => p !== row), 'Schalke 04': [...rosters['Schalke 04'], row] };
}

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

  /* Round 899: the two leagues that made the era a full big five. Bayern
     and PSG get their real squads NAME FOR NAME, both directions: every real
     player handed to the save is a bake row at his bake age and uplifted
     rating, and every bake row is in the squad. */
  const identity = (club, seed, marquee) => {
    Math.random = seeded(seed);
    const save = startCareer(club, 'era2015');
    const rows = new Map(ERA2015_ROSTERS[club].map(p => [p.n, p]));
    let off = 0;
    for (const p of save.squad.filter(p => !p.isYouth && !p.generated)) {
      const b = rows.get(p.name);
      if (!b) { off += 1; fail(`${p.name} is in the 2015 ${club} squad but not in the bake`); continue; }
      if (b.a !== p.age || eraUpliftRating('era2015', b.r) !== p.rating) {
        off += 1;
        fail(`${club}'s ${p.name}: bake says age ${b.a} rating ${b.r}, squad says ${p.age}/${p.rating}`);
      }
    }
    for (const name of rows.keys()) {
      if (!save.squad.some(p => p.name === name)) { off += 1; fail(`${club}: bake row ${name} never reached the squad`); }
    }
    for (const name of marquee) {
      if (!save.squad.some(p => p.name === name)) fail(`2015 ${club} are missing ${name}`);
    }
    console.log(`   ${club}: ${save.squad.length} in squad, ${rows.size} bake rows, ${off} mismatches`);
    return save;
  };
  // The summer arrivals are on purpose: Vidal, Douglas Costa and Coman at
  // Bayern, Di Maria, Trapp and Kurzawa at PSG.
  identity('Bayern Munich', 17, ['Robert Lewandowski', 'Thomas Müller', 'Manuel Neuer', 'Arturo Vidal', 'Douglas Costa', 'Kingsley Coman']);
  identity('PSG', 19, ['Zlatan Ibrahimović', 'Ángel Di María', 'Edinson Cavani', 'Thiago Silva', 'Kevin Trapp', 'Layvin Kurzawa']);
}

/* ---------- 2. Era isolation, in every direction ---------- */
console.log('2) Three worlds (2026, 2015, 2010), and none of them leak');
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
    'Diego López', 'Gabriel', 'Dodô', 'Rômulo', 'Ederson', 'Danilo', 'Gabriel Silva', 'Guilherme',
    /* Round 876, Brazil's Serie A: Flamengo's Pedro (b. 1997) against Chelsea's Pedro Rodriguez (b. 1987);
       Corinthians' Allan (Allan Rodrigues de Souza, b. 1997, on loan from Flamengo) against Napoli's Allan
       Marques Loureiro (b. 1991); Palmeiras' Paulinho (b. 2000) against Tottenham's Paulinho (b. 1988). */
    'Pedro', 'Allan', 'Paulinho',
    /* Round 883, Liga MX, verified 2026-10-02 (birth dates, two sources each): Pachuca's right back Carlos
       Sanchez (b. 2002-04-13, Soccerway and ESPN's Pachuca squad) against Aston Villa's Carlos Alberto Sanchez
       Moreno (b. 1986); Leon's Juan Pablo Dominguez (b. 1998-10-30, ESPN's profile and Fox Sports Mexico on his
       move from Toluca) against Deportivo's Juan Dominguez Lamas (b. 1990). Toluca's striker Paulinho, Joao Paulo
       Dias Fernandes (b. 1992-11-09, ESPN's Toluca squad), is a third Paulinho, already allowed above. Manchester
       City's Allan (Allan Andrade Elias, b. 2004) is a third Allan, already allowed above. */
    'Carlos Sánchez', 'Juan Domínguez',
    /* Round 899, the Bundesliga and Ligue 1 of 2015-16, verified 2026-10-02: Lille's 2015 midfielder Idrissa
       Gana Gueye (b. 1989-09-26, Sky Sports' and FBref's profiles) against Udinese's striker Idrissa Gueye
       (b. 2006-09-16, the league's own player sheet on ligue1.com from his Metz season and FBref). */
    'Idrissa Gueye']);
  /* Round 899 also resolved four namesake pairs INSIDE the 2015 world, where the engine can hold one man per
     name and the higher value stays (scripts/bakeEra2015.mjs, B5_NAMESAKES). Each pair is two men, birth dates
     from two publishers each (BDFutbol's and BDFA's player files, checked against the reference pages that
     split them by birth year), read 2026-10-02: Naldo of Wolfsburg (Ronaldo Aparecido Rodrigues, b. 1982-09-10)
     and Naldo of Getafe (Edinaldo Gomes Pereira, b. 1988-08-28); Rafinha of Bayern (Marcio Rafael Ferreira de
     Souza, b. 1985-09-07) and Rafinha of Barcelona (Rafael Alcantara, b. 1993-02-12); Marcelo of Hannover
     (Marcelo Antonio Guedes Filho, b. 1987-05-20) and Marcelo of Real Madrid (b. 1988-05-12); Adama Traore of
     Lille and Monaco (the Malian, b. 1995-06-28) and Adama Traore of Barcelona and Aston Villa (b. 1996-01-25).
     The table itself carries both men of every pair in both years, at different clubs and ages. */
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
  /* Round 899 first allowlisted 'Eduardo' here (Arsenal's 2010 striker
     against Nice's 2015 Carlos Eduardo), but its review found that Carlos
     Eduardo had gone back to Porto on 1 Jun 2015, so the bake takes him out
     of the 2015 world and the entry is gone with him. */
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
  let leagues = ERA_LEAGUES['era2015'] ?? [];
  if (CONTROL === 'threeleagues') {
    if (leagues.length !== 5) controlRefuse(`the era holds ${leagues.length} leagues, there are not five to cut back`);
    leagues = leagues.slice(0, 3);
    console.log('   CONTROL threeleagues applied: section 3 sees only the first three leagues');
  }
  /* Round 191: the Serie A joined. Round 899: the Bundesliga and Ligue 1
     joined, so the era is a full big five, 98 clubs. */
  if (leagues.length !== 5) fail(`era2015 has ${leagues.length} leagues`);
  if (leagues.map(l => l.id).join(',') !== 'premier2015,laliga2015,seriea2015,bundesliga2015,ligue12015') fail(`era2015 leagues read ${leagues.map(l => l.id).join(',')}`);
  const sizes = leagues.map(l => l.clubs.length).join(',');
  if (sizes !== '20,20,20,18,20') fail(`era2015 league sizes read ${sizes}`);
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
  console.log(`   ${labels} club demands checked across the five 2015 leagues`);
  if (labels !== 98) fail(`${labels} board demands, the era holds 98 clubs`);
  const leagueTargetOf = name => {
    const lg = leagues.find(l => l.clubs.includes(name));
    if (!lg) return 99;
    return buildBoardObjectives(name, false, lg.clubs.length, 'era2015').find(o => o.id === 'league')?.target ?? 99;
  };
  for (const giant of ['Barcelona', 'Real Madrid', 'Juventus', 'Bayern Munich', 'PSG']) {
    if (leagueTargetOf(giant) !== 1) fail(`2015 ${giant} is not told to win the league`);
  }
  /* The whole point of this season: in August 2015 NOBODY told Leicester to
     win anything. Their board demand must sit in the bottom half of the
     table, like Norwich's and Las Palmas', or the era's stature model has
     failed at its one famous test. */
  for (const modest of ['Leicester City', 'Norwich City', 'Bournemouth', 'Las Palmas', 'Eibar', 'Darmstadt', 'Ingolstadt', 'Angers', 'GFC Ajaccio']) {
    if (leagueTargetOf(modest) <= 8) fail(`2015 ${modest} is asked for a top-${leagueTargetOf(modest)} finish, August 2015 boards asked no such thing`);
  }
  const copaClub = buildBoardObjectives('Sevilla', false, 20, 'era2015').find(o => o.id === 'cup');
  if (copaClub && !/Copa del Rey/.test(copaClub.label)) fail(`2015 Sevilla's cup objective says "${copaClub.label}"`);
  /* Round 899: each new nation has its own cup, and the cup words follow. */
  for (const [club, n, cup] of [['Borussia Dortmund', 18, /DFB-Pokal/], ['Lyon', 20, /Coupe de France/]]) {
    const o = buildBoardObjectives(club, false, n, 'era2015').find(x => x.id === 'cup');
    /* Review fix: a missing cup objective is a failure too, or the check
       would pass on a change that dropped the cup for these leagues. */
    if (!o) fail(`2015 ${club} has no cup objective at all`);
    else if (!cup.test(o.label)) fail(`2015 ${club}'s cup objective says "${o.label}"`);
  }
}

/* ---------- 4. Seasons complete and land where 2015 says ---------- */
console.log('4) Full seasons play out plausibly in all five leagues');
if (CONTROL) console.log('   skipped: a control run plays no seasons');
else {
  const posOf = (club, era, seed) => {
    Math.random = seeded(seed);
    const s = playSeason(startCareer(club, era));
    const table = sortedTable(s.table);
    const want = (ERA_LEAGUES[era] ?? []).find(l => l.clubs.includes(club))?.clubs.length;
    if (table.length !== want) fail(`${club}: a 2015 table with ${table.length} rows, the league has ${want} clubs`);
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

  /* Round 899: the two new leagues, six seeds each, the giants and the
     thinnest squad of the whole era (GFC Ajaccio, two real players). The
     measured finishes are in the header; the bands are means, never a max. */
  const bayern = [1, 2, 3, 4, 5, 6].map(i => posOf('Bayern Munich', 'era2015', i * 7919));
  const psg = [1, 2, 3, 4, 5, 6].map(i => posOf('PSG', 'era2015', i * 7919));
  const gfc = [1, 2, 3, 4, 5, 6].map(i => posOf('GFC Ajaccio', 'era2015', i * 104729));
  console.log(`   Bayern finishes: ${bayern.join(',')} · PSG finishes: ${psg.join(',')} · GFC Ajaccio finishes: ${gfc.join(',')}`);
  console.log(`   means: Bayern ${mean(bayern).toFixed(2)}, PSG ${mean(psg).toFixed(2)}, GFC Ajaccio ${mean(gfc).toFixed(2)}`);
  if (mean(bayern) > 3.5) fail(`2015 Bayern averaged position ${mean(bayern).toFixed(2)} over six seeds, measured 1.00`);
  if (mean(psg) > 3.5) fail(`2015 PSG averaged position ${mean(psg).toFixed(2)} over six seeds, measured 1.00`);
  if (mean(gfc) < 11) fail(`GFC Ajaccio averaged position ${mean(gfc).toFixed(2)} over six seeds, measured 16.67; two real players and youth padding are overperforming wildly`);

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
    if (roster.some(p => p.n === 'Steven Gerrard')) fail('Gerrard is still in this world, he left for LA');
  }

  /* Round 899: the accounting of the big five extension (the numbers are the
     bake's own log of 2026-10-02, see scripts/bakeEra2015.mjs). */
  const R = CONTROL === 'dupe' ? controlDupe(ERA2015_ROSTERS) : CONTROL === 'stale' ? controlStale(ERA2015_ROSTERS) : ERA2015_ROSTERS;
  const at = (club, name) => (R[club] ?? []).some(p => p.n === name);
  const clubsOf = name => Object.entries(R).filter(([, list]) => list.some(p => p.n === name)).map(([c]) => c);
  if (ERA2015_META.clubs !== 98) fail(`meta clubs ${ERA2015_META.clubs}, the big five of 2015-16 are 98`);
  if (ERA2015_META.players !== 1659) fail(`meta players ${ERA2015_META.players}, the Round 899 bake wrote 1659`);
  if (ERA2015_META.moves !== 360) fail(`meta moves ${ERA2015_META.moves}: 134 before Round 899 plus 102 moved, 76 removed, 35 arrived and 13 folded is 360`);
  const leagueTotal = id => (ERA_LEAGUES['era2015'].find(l => l.id === id)?.clubs ?? []).reduce((s, c) => s + (R[c]?.length ?? 0), 0);
  if (leagueTotal('bundesliga2015') !== 292) fail(`the 2015-16 Bundesliga holds ${leagueTotal('bundesliga2015')} players, the bake wrote 292`);
  if (leagueTotal('ligue12015') !== 253) fail(`the 2015-16 Ligue 1 holds ${leagueTotal('ligue12015')} players, the bake wrote 253`);
  const worldClubs = new Set(ERA_LEAGUES['era2015'].flatMap(l => l.clubs));
  for (const c of Object.keys(R)) if (!worldClubs.has(c)) fail(`the bake holds ${c}, which no 2015 league lists`);
  for (const c of worldClubs) if (!R[c]) fail(`${c} is in a 2015 league and has no bake entry`);
  const partial = [...ERA2015_PARTIAL].sort().join(',');
  if (partial !== 'Angers,Darmstadt,Frosinone,GFC Ajaccio,Ingolstadt,Las Palmas,Nantes') fail(`the thin list reads ${partial}`);
  // One man, one club, in the whole world.
  const seenAt = new Map();
  let dupes = 0;
  for (const [club, list] of Object.entries(R)) for (const p of list) {
    if (seenAt.has(p.n)) { dupes += 1; if (dupes <= 5) fail(`${p.n} is at ${seenAt.get(p.n)} and at ${club}`); }
    seenAt.set(p.n, club);
  }
  // The re-audit: removed while his new club was outside the world, home now.
  for (const [name, club] of [['Ángel Di María', 'PSG'], ['Arturo Vidal', 'Bayern Munich'], ['Kingsley Coman', 'Bayern Munich'],
    ['Chicharito', 'Bayer Leverkusen'], ['Fábio Coentrão', 'Monaco'], ['Ivan Cavaleiro', 'Monaco'], ['Sergi Darder', 'Lyon'], ['Mapou Yanga-Mbiwa', 'Lyon']]) {
    if (clubsOf(name).join(',') !== club) fail(`${name} should be at ${club} and nowhere else, he is at: ${clubsOf(name).join(',') || 'nowhere'}`);
  }
  // The folds: an earlier round's arrival keeps his shipped club, and the row at the club he left is gone.
  for (const [name, club] of [['Kevin De Bruyne', 'Manchester City'], ['Heung-min Son', 'Tottenham'], ['Bastian Schweinsteiger', 'Manchester United'],
    ['Roberto Firmino', 'Liverpool'], ['Shinji Okazaki', 'Leicester City'], ['Dimitri Payet', 'West Ham'], ['Yohan Cabaye', 'Crystal Palace'],
    ['Anthony Martial', 'Manchester United'], ['André Ayew', 'Swansea City'], ["N'Golo Kanté", 'Leicester City'], ['Ivan Perišić', 'Inter Milan'],
    ['Geoffrey Kondogbia', 'Inter Milan'], ['Pepe Reina', 'Napoli']]) {
    if (clubsOf(name).join(',') !== club) fail(`${name} should be at ${club} and nowhere else, he is at: ${clubsOf(name).join(',') || 'nowhere'}`);
  }
  // The window inside the two new leagues, and across them.
  for (const [name, club, old] of [['Julian Draxler', 'Wolfsburg', 'Schalke 04'], ['Dante', 'Wolfsburg', 'Bayern Munich'],
    ['Gonzalo Castro', 'Borussia Dortmund', 'Bayer Leverkusen'], ['Layvin Kurzawa', 'PSG', 'Monaco'], ['Kevin Trapp', 'PSG', 'Eintracht Frankfurt'],
    ['Lucas Ocampos', 'Marseille', 'Monaco'], ['Abdul Rahman Baba', 'Chelsea', 'Augsburg'], ['Florian Thauvin', 'Newcastle', 'Marseille'],
    ['Rafael', 'Lyon', 'Manchester United'], ['Benjamin Stambouli', 'PSG', 'Tottenham'],
    // The review fix: movers the first pass left behind.
    ['Divock Origi', 'Liverpool', 'Lille'], ['Ricky van Wolfswinkel', 'Real Betis', 'Saint-Étienne'],
    ['Oriol Romeu', 'Southampton', 'Stuttgart'], ['Moritz Leitner', 'Borussia Dortmund', 'Stuttgart'],
    ['Tiago Ilori', 'Liverpool', 'Bordeaux'], ['Issiaga Sylla', 'GFC Ajaccio', 'Toulouse'], ['Jérémy Pied', 'Nice', 'Guingamp'],
    ['Yassine Benzia', 'Lille', 'Lyon'], ['Mario Lemina', 'Juventus', 'Marseille'],
    // The second review fix: the club by club pass through the whole window.
    ['Nico Schulz', 'Gladbach', 'Hertha BSC'], ['Izet Hajrovic', 'Eibar', 'Werder Bremen'], ['Deyverson', 'Levante', 'Köln'],
    ['Koen Casteels', 'Wolfsburg', 'Werder Bremen'], ['Jhon Córdoba', 'Mainz', 'Granada'], ['Giovanni Sio', 'Rennes', 'Bastia'],
    ['Sadio Diallo', 'Bastia', 'Lorient'], ['Yoann Andreu', 'Angers', 'GFC Ajaccio'], ['Jonathan Delaplace', 'Caen', 'Lille'],
    ['Serge Gakpé', 'Genoa', 'Nantes'], ['Hélder Costa', 'Monaco', 'Deportivo La Coruña']]) {
    if (!at(club, name)) fail(`${name} is not at 2015-16 ${club}`);
    if (at(old, name)) fail(`${name} is still at ${old}`);
  }
  /* The review fixes also left men where the snapshot has them on purpose,
     because the club their year-2016 row names is one they reached later
     (dated in the bake header): they must still be at their year-2015 club.
     (Nico Schulz stood here until the second review dated his move to
     Gladbach inside the window, 18 Aug 2015.) */
  for (const [name, club] of [['Ádám Szalai', 'Hoffenheim'], ['Kaan Ayhan', 'Schalke 04'],
    ['Henri Bedimo', 'Lyon'], ['Kevin-Prince Boateng', 'Schalke 04'], ['Lindsay Rose', 'Lyon'], ['Zoltán Stieber', 'Hamburg'],
    ['Denis Petric', 'Troyes'], ['Corentin Jean', 'Troyes']]) {
    if (clubsOf(name).join(',') !== club) fail(`${name} should still be at ${club}, he is at: ${clubsOf(name).join(',') || 'nowhere'}`);
  }
  // Left the world, or left his club with no provable season start club.
  for (const name of ['André-Pierre Gignac', 'Jefferson Farfán', 'Christian Fuchs', 'Giannelli Imbula', 'Ciro Immobile', 'Stephan El Shaarawy',
    'Eduardo', 'Davie Selke', 'Andreas Beck', 'Lucas Barrios', 'Christopher Glombard', 'Jonathan Kodjia', 'Jonas Hofmann', 'Kevin Großkreutz',
    'Nicolás Castillo', 'Maximilian Beister', 'João Pereira', 'Jan Kirchhoff', 'Simon Rolfes', 'György Garics', 'Guillaume Gillet',
    'Mouhamadou Dabo', 'Sambou Yatabaré', 'Lorik Cana', 'Brayan Perea', 'Mounir Obbadi', 'Takashi Inui', 'Kian Hansen']) {
    if (clubsOf(name).length) fail(`${name} is still in this world at ${clubsOf(name).join(',')}`);
  }
  console.log(`   big five accounting: Bundesliga ${leagueTotal('bundesliga2015')}, Ligue 1 ${leagueTotal('ligue12015')}, ${dupes} names at two clubs`);
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

/* ---------- 7. A save from before the big five plays on ---------- */
/* Round 899. A 2015-16 save made before this round carries a world of the
   first three leagues only (its own league lives in `table`, the other two
   in `world`). The proof with a save built by the previous engine itself is
   in the round's record; this section keeps the same path under test from
   here on: a fresh save cut back to that exact shape, sent through JSON the
   way storage sends it, must finish its season on the three leagues it
   knows, and the summer must hand it all five. */
console.log('7) A three league save from before Round 899 plays on and grows in the summer');
if (CONTROL) console.log('   skipped: a control run plays no seasons');
else {
  Math.random = seeded(4801);
  let s = startCareer('Juventus', 'era2015');
  for (let i = 0; i < 16; i++) s = playNextEntry(s, { skipHalftime: true }).state;
  const before = Object.keys(s.world ?? {}).sort().join(',');
  if (before !== 'bundesliga2015,laliga2015,ligue12015,premier2015') fail(`a fresh Juventus save carries the world ${before}`);
  const old = JSON.parse(JSON.stringify(s));
  delete old.world.bundesliga2015;
  delete old.world.ligue12015;
  const done = playSeason(old);
  if (done.week < done.calendar.length) fail(`the three league save stopped at week ${done.week} of ${done.calendar.length}`);
  const kept = Object.entries(done.world ?? {}).map(([id, w]) => `${id} ${w.round}`).sort().join(',');
  if (kept !== 'laliga2015 38,premier2015 38') fail(`the three league save finished its season with the world ${kept}`);
  const next = playSeason(startNextSeason(done));
  const grown = Object.entries(next.world ?? {}).map(([id, w]) => `${id} ${w.round}/${w.table.length}`).sort().join(',');
  console.log(`   season one world: ${kept} · season two world: ${grown}`);
  if (grown !== 'bundesliga2015 34/18,laliga2015 38/20,ligue12015 38/20,premier2015 38/20') fail(`season two of the old save has the world ${grown}`);
}

/* 7b (review fix). The save above was cut from a fresh branch save, so its
   Champions League already says PSG and Gladbach. A save the previous engine
   made says 'Paris Saint-Germain' and 'Borussia Mönchengladbach' in its
   groups (measured on a save built by origin/main's own engine), and it has
   no club strength for either, because they were foreign then. Before the
   fix both read a modern preview rating in every match and no association
   in the round of 16 draw. Here the long names must read exactly what the
   short names read in the same save, and the save must play its season out.
   Control longname renames to a name the engine has never had instead, and
   the same checks must then fail. */
console.log('7b) A save holding the old long Champions League names rates them as 2015-16');
if (CONTROL && CONTROL !== 'longname') console.log('   skipped: another control is running');
else {
  const LONG = CONTROL === 'longname'
    ? { PSG: 'Paris Saint Germain FC', Gladbach: 'Borussia Gladbach VfL' }
    : { PSG: 'Paris Saint-Germain', Gladbach: 'Borussia Mönchengladbach' };
  if (CONTROL === 'longname') console.log('   CONTROL longname applied: the groups hold names the engine never had');
  Math.random = seeded(4802);
  let s = startCareer('Chelsea', 'era2015');
  for (let i = 0; i < 16 && !(s.uclWorld && s.uclWorld.length); i++) s = playNextEntry(s, { skipHalftime: true }).state;
  const old = JSON.parse(JSON.stringify(s));
  delete old.world.bundesliga2015;
  delete old.world.ligue12015;
  for (const lg of ERA_LEAGUES.era2015) {
    if (lg.id !== 'bundesliga2015' && lg.id !== 'ligue12015') continue;
    for (const c of lg.clubs) delete old.clubStrengths[c];
  }
  const ren = c => LONG[c] ?? c;
  let found = 0;
  const groups = [...(old.uclWorld ?? []), ...(old.uclGroup ? [{ clubs: old.uclGroup.opponents, table: old.uclGroup.table }] : [])];
  for (const g of groups) {
    for (const c of g.clubs) if (LONG[c]) found += 1;
    g.clubs.splice(0, g.clubs.length, ...g.clubs.map(ren));
    for (const r of g.table) r.club = ren(r.club);
  }
  if (found !== 2) {
    if (CONTROL) controlRefuse(`the save's groups hold ${found} of PSG and Gladbach`);
    fail(`the Chelsea save's Champions League holds ${found} of PSG and Gladbach, the check needs both`);
  }
  for (const [short, long] of Object.entries(LONG)) {
    const want = cm.strengthOf(old, short);
    const got = cm.strengthOf(old, long);
    console.log(`   ${long}: strength ${got} (${short} reads ${want}), association ${cm.uclClubCountry(old, long)}`);
    if (got !== want) fail(`${long} plays at ${got} in an old save where ${short} reads ${want}`);
    const country = short === 'PSG' ? 'France' : 'Germany';
    if (cm.uclClubCountry(old, long) !== country) fail(`${long} has the association ${cm.uclClubCountry(old, long)}, not ${country}`);
  }
  if (!CONTROL) {
    const done = playSeason(old);
    if (done.week < done.calendar.length) fail(`the long name save stopped at week ${done.week} of ${done.calendar.length}`);
  }
}

Math.random = REAL_RANDOM;
console.log('');
if (failures > 0) {
  console.error(`simEra2015: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simEra2015: green. 2015 is real, sealed, and plays like 2015.');
