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
 * ROUND 902: the era is a full big five (Serie A, the Bundesliga and Ligue 1
 * joined, 98 clubs, 1,727 real players after the review fix). What grew:
 *   1. Juventus, Bayern and Lyon get their real squads name for name, both
 *      directions, summer arrivals included (Vieira, Lahm, Ismael, Tiago).
 *   2. Every new shared name across the four worlds is a verified namesake
 *      pair, birth years in the block where they are allowlisted.
 *   3. The ladder runs over all 98 clubs of five leagues, in the era's own
 *      words: every board that names a second European prize names the UEFA
 *      Cup; Juventus, Bayern and Lyon are told to win it; the three promoted
 *      thin squads and Duisburg are told no such thing; each new nation's cup
 *      is named in the cup demand.
 *   4. Measured 2026-10-03 over six seeds each (the streams in the code), on
 *      the world as the review fix left it: Juventus 1,2,1,1,1,1 (mean 1.17),
 *      Bayern 3,1,2,1,1,1 (1.50), Lyon 2,1,1,1,1,6 (2.00), Troyes, a promoted
 *      squad of four real players (Nancy, with three, is the thinnest of the
 *      three new leagues), 20,20,19,16,20,12 (17.83); Chelsea 1 six times and
 *      Cadiz 19,20,18,17,19,17. Two earlier worlds of the same day measured
 *      1.00/1.00/1.17/18.00 (the first pass) and 1.33/1.50/1.83/17.33 (the
 *      fix before its last two men), so the means move by about half a place
 *      with the data. The bands are on the MEANS: a giant must average 3.5
 *      or better (1.50 places of headroom over the worst giant mean of all
 *      three measurements) and the thin club 11 or worse (6.33 places of
 *      headroom over its best mean, and its best single seed of 12 is still
 *      above the band). No band reads a single worst seed.
 *   5. The extension's accounting: 98 clubs, 1,727 players, 385
 *      corrections, 294 Serie A, 332 Bundesliga and 341 Ligue 1 players, the
 *      five thin clubs by name, one man at one club in the whole world, the
 *      three men Round 176 removed who are home now, the two folds, a sample
 *      of the window, the men kept on their snapshot club because their move
 *      was dated January 2006, and men gone from the world. The review fix
 *      added the men the first pass had left at clubs they did not start
 *      2005-06 at: four moved, twenty gone, two checked and kept; and
 *      the era2005 nationality block held to the world, one line per man.
 *   7. A save from before the round (a two league world, no strength for the
 *      new leagues' Champions League clubs) reads them at the era's finish
 *      based rating until its first summer, exactly as it read them while
 *      they were foreign, plays its season out, and gets all five leagues in
 *      the summer, where they are rated from their real squads.
 * Seven negative controls, SIM_ERA2005_CONTROL=dupe|stale|twoleagues|euro|
 * thinswap|nocut|nonat, each of which must end the run red (see the block
 * where they are defined).
 *
 * Run: node scripts/simEra2005.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'era2005Entry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'era2005.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
const eras = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManagerEras.ts');
const era2005 = await import('${ROOT.replaceAll('\\', '/')}/src/data/clubManagerEra2005.ts');
const era2010 = await import('${ROOT.replaceAll('\\', '/')}/src/data/clubManagerEra2010.ts');
const era2015 = await import('${ROOT.replaceAll('\\', '/')}/src/data/clubManagerEra2015.ts');
const modern = await import('${ROOT.replaceAll('\\', '/')}/src/data/clubManagerRosters.ts');
const nat = await import('${ROOT.replaceAll('\\', '/')}/src/data/playerNationalities.ts');
export { engine, eras, era2005, era2010, era2015, modern, nat };
`);
execSync(
  `${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`,
  { stdio: 'inherit' },
);

const { engine: cm, eras: ER, era2005: E05, era2010: E10, era2015: E15, modern: MOD, nat: NAT } = await import(pathToFileURL(BUNDLE).href);
/* Round 832: an era's squads load with the era, so the harness fetches all three first. */
await ER.ensureAllEraRosters();
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

/* NEGATIVE CONTROLS (Round 902). SIM_ERA2005_CONTROL=<name> breaks one thing
   IN MEMORY (nothing on disk is touched) and the run must then end red, exit
   1. Each control first proves the thing it breaks is there, and refuses with
   exit 2 when it is not, so a control that changed nothing can never read as
   a control that fired. A control run skips the played seasons of sections 4
   and 7, except the control aimed at that section.
     dupe        Vieira at Juventus AND back at Arsenal: the one man, one club
                 check and the re-audit check must both fail.
     stale       Toni sent back to Palermo: the window check must fail.
     twoleagues  the era cut back to its first two leagues for section 3:
                 the league count, the sizes and the 98 demands must fail.
     euro        (review fix) the Bundesliga's UEFA Cup line moved from fifth
                 to sixth in memory: the European places pin must fail.
     thinswap    (review fix) section 4 plays Troyes where it plays Juventus
                 and Juventus where it plays Troyes: the giant band and the
                 thin band must both fail, so both read real finishes.
     nocut       (review fix) section 7 skips the cut, so the "old" save is a
                 fresh five league save: the strength match with Ajax and the
                 two league world at the season's end must both fail.
     nonat       (review fix) Vieira's era2005 nationality line dropped and a
                 line for a man not in the world added, in memory: the
                 nationality fence of section 5 must fail both ways. */
const CONTROL = process.env.SIM_ERA2005_CONTROL ?? '';
if (CONTROL && !['dupe', 'stale', 'twoleagues', 'euro', 'thinswap', 'nocut', 'nonat'].includes(CONTROL)) { console.error(`unknown control ${CONTROL}`); process.exit(2); }
const controlRefuse = why => { console.error(`CONTROL ${CONTROL} did not apply: ${why}`); process.exit(2); };
function controlDupe(rosters) {
  const row = (rosters['Juventus'] ?? []).find(p => p.n === 'Patrick Vieira');
  if (!row) controlRefuse('there is no Vieira at Juventus to duplicate');
  if ((rosters['Arsenal'] ?? []).some(p => p.n === 'Patrick Vieira')) controlRefuse('he is already at Arsenal');
  console.log('   CONTROL dupe applied: Vieira is at Juventus and at Arsenal');
  return { ...rosters, Arsenal: [...rosters['Arsenal'], row] };
}
function controlStale(rosters) {
  const row = (rosters['Fiorentina'] ?? []).find(p => p.n === 'Luca Toni');
  if (!row) controlRefuse('there is no Toni at Fiorentina to send back');
  console.log('   CONTROL stale applied: Toni is back at Palermo');
  return { ...rosters, Fiorentina: rosters['Fiorentina'].filter(p => p !== row), Palermo: [...rosters['Palermo'], row] };
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

  /* Round 902: the three leagues that made the era a full big five.
     Juventus, Bayern and Lyon get their real squads NAME FOR NAME, both
     directions: every real player handed to the save is a bake row at his
     bake age and uplifted rating, and every bake row is in the squad. */
  const identity = (club, seed, marquee) => {
    Math.random = seeded(seed);
    const save = startCareer(club, 'era2005');
    const rows = new Map(ERA2005_ROSTERS[club].map(p => [p.n, p]));
    let off = 0;
    for (const p of save.squad.filter(p => !p.isYouth && !p.generated)) {
      const b = rows.get(p.name);
      if (!b) { off += 1; fail(`${p.name} is in the 2005 ${club} squad but not in the bake`); continue; }
      if (b.a !== p.age || eraUpliftRating('era2005', b.r) !== p.rating) {
        off += 1;
        fail(`${club}'s ${p.name}: bake says age ${b.a} rating ${b.r}, squad says ${p.age}/${p.rating}`);
      }
    }
    for (const name of rows.keys()) {
      if (!save.squad.some(p => p.name === name)) { off += 1; fail(`${club}: bake row ${name} never reached the squad`); }
    }
    for (const name of marquee) {
      if (!save.squad.some(p => p.name === name)) fail(`2005 ${club} are missing ${name}`);
    }
    console.log(`   ${club}: ${save.squad.length} in squad, ${rows.size} bake rows, ${off} mismatches`);
  };
  // The summer arrivals are on purpose: Vieira at Juventus, Lahm back at
  // Bayern and Ismael from Bremen, Tiago and Carew at Lyon.
  identity('Juventus', 17, ['Gianluigi Buffon', 'Fabio Cannavaro', 'Pavel Nedved', 'Zlatan Ibrahimović', 'Patrick Vieira']);
  identity('Bayern Munich', 19, ['Michael Ballack', 'Oliver Kahn', 'Roy Makaay', 'Philipp Lahm', 'Valérien Ismaël']);
  identity('Lyon', 21, ['Juninho Pernambucano', 'Grégory Coupet', 'Florent Malouda', 'Tiago Mendes', 'John Carew']);
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
  /* Round 902 additions, the Serie A, Bundesliga and Ligue 1 of 2005-06,
     read 2026-10-03. Each 2005 man's birth year is FBref's (its 2005-06 big
     five season record) and the table's own year 2005 row agrees with it on
     age and position; each other man is the row of his own world, whose
     age the table gives in two consecutive years. One human cannot be both.
     Against 2026: Ajaccio's Brazilian midfielder Andre Luiz Moreira (b. 1974)
     and Rio Ave's winger Andre Luiz (22 in 2025, 23 in 2026); Milan's
     left-back Serginho (b. 1971) and Viborg's winger (23 in 2025); Arminia's
     Spanish midfielder Diego Leon (b. 1984) and Manchester United's
     Paraguayan left-back (17 in 2025, 18 in 2026); Leverkusen's centre-back
     Juan (b. 1979) and Goztepe's striker (22, 23); Hertha's left-back
     Gilberto (b. 1976) and Bahia's right-back (31, 32); Juventus's
     midfielder Emerson (b. 1976) and Marseille's left-back Emerson Palmieri
     (30, 31); Lyon's striker Fred (b. 1983) and Fenerbahce's midfielder
     (31, 32); Marseille's Spanish striker Koke (b. 1983) and Atletico's
     midfielder (32, 33); Nice's midfielder Ederson (b. 1986) and
     Fenerbahce's goalkeeper (31, 32); Schalke's playmaker Lincoln (b. 1979)
     and Alverca's (26, 27). Against 2015: Lille's Rafael Schmitz (b. 1980)
     and Lyon's right-back Rafael da Silva (24 in the 2015 world, 19 in the
     2010 one); Koke as above, Atletico's at 22; Schalke's right-back Rafinha
     (b. 1985) and Barcelona's Rafinha (b. 1993, the pair simEra2015 already
     names). Against 2010: Rafael as above; Bordeaux's centre-back Henrique
     (b. 1983) and Racing Santander's (23 in the 2010 world); and, since
     Round 901 brought the 2010-11 Ligue 1 (met at the merge), Ajaccio's
     Andre Luiz Moreira as above (30 in the year 2005 row, 31 in the 2006
     one) and Nancy's centre-back Andre Luiz (b. 1980: FBref has him at
     Nancy in 2005-06 too, the table's year 2006 row has him there at 25,
     and the 2010 world at 29). */
  const pairs = [
    { label: '2005 vs 2026', other: null, lo: 19, hi: 23, minShared: 2, namesakes: new Set(['Pablo Ibáñez', 'Manu Sánchez', 'Pablo García',
      'André Luiz', 'Serginho', 'Diego León', 'Juan', 'Gilberto', 'Emerson', 'Fred', 'Koke', 'Ederson', 'Lincoln']) },
    { label: '2005 vs 2015', other: ERA2015_ROSTERS, lo: 8, hi: 12, minShared: 25, namesakes: new Set(['Fernando', 'Víctor Sánchez', 'Dani García',
      'Rafael', 'Koke', 'Rafinha']) },
    { label: '2005 vs 2010', other: ERA2010_ROSTERS, lo: 3, hi: 7, minShared: 60, namesakes: new Set(['Luis García', 'Andy Johnson',
      'Rafael', 'Henrique', 'André Luiz']) },
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
  let leagues = ERA_LEAGUES['era2005'] ?? [];
  if (CONTROL === 'twoleagues') {
    if (leagues.length !== 5) controlRefuse(`the era holds ${leagues.length} leagues, there are not five to cut back`);
    leagues = leagues.slice(0, 2);
    console.log('   CONTROL twoleagues applied: section 3 sees only the first two leagues');
  }
  /* Round 902: the Serie A, the Bundesliga and Ligue 1 joined, so the era is
     a full big five, 98 clubs. */
  if (leagues.length !== 5) fail(`era2005 has ${leagues.length} leagues`);
  if (leagues.map(l => l.id).join(',') !== 'premier2005,laliga2005,seriea2005,bundesliga2005,ligue12005') fail(`era2005 leagues read ${leagues.map(l => l.id).join(',')}`);
  const sizes = leagues.map(l => l.clubs.length).join(',');
  if (sizes !== '20,20,20,18,20') fail(`era2005 league sizes read ${sizes}`);
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
  if (labels !== 98) fail(`${labels} board demands, the era holds 98 clubs`);
  const leagueTargetOf = name => {
    const lg = leagues.find(l => l.clubs.includes(name));
    if (!lg) return 99;
    return buildBoardObjectives(name, false, lg.clubs.length, 'era2005').find(o => o.id === 'league')?.target ?? 99;
  };
  for (const giant of ['Chelsea', 'Barcelona', 'Real Madrid', 'Manchester United', 'Juventus', 'Bayern Munich', 'Lyon']) {
    if (leagueTargetOf(giant) !== 1) fail(`2005 ${giant} is not told to win the league`);
  }
  for (const modest of ['Cádiz', 'Alavés', 'Wigan Athletic', 'Getafe', 'Treviso', 'Nancy', 'Troyes', 'Duisburg']) {
    if (leagueTargetOf(modest) <= 8) fail(`2005 ${modest} is asked for a top-${leagueTargetOf(modest)} finish`);
  }
  const copaClub = buildBoardObjectives('Sevilla', false, 20, 'era2005').find(o => o.id === 'cup');
  if (copaClub && !/Copa del Rey/.test(copaClub.label)) fail(`2005 Sevilla's cup objective says "${copaClub.label}"`);
  /* Round 902: each new nation has its own cup, and the cup words follow. A
     missing cup objective is a failure too. */
  for (const [club, n, cup] of [['Roma', 20, /Coppa Italia/], ['Werder Bremen', 18, /DFB-Pokal/], ['Marseille', 20, /Coupe de France/]]) {
    const o = buildBoardObjectives(club, false, n, 'era2005').find(x => x.id === 'cup');
    if (!o) fail(`2005 ${club} has no cup objective at all`);
    else if (!cup.test(o.label)) fail(`2005 ${club}'s cup objective says "${o.label}"`);
  }
  /* Review fix: the European places of the three new rules rows, pinned here
     and not only in simCmLeagueRules' digest (whose baseline --write retakes).
     Two sources each, see the rules rows in src/lib/clubManager.ts: Italy
     four in the Champions League, fifth and sixth the UEFA Cup; Germany
     three, fourth and fifth; France three, fourth; three down everywhere,
     no Conference League in 2005. */
  const rulesOf = id => {
    const r = cm.LEAGUE_RULES?.[id];
    if (CONTROL !== 'euro' || id !== 'bundesliga2005' || !r) return r;
    if (r.europe?.uel !== 5) controlRefuse(`the Bundesliga row has uel ${r.europe?.uel}, not the 5 the control moves`);
    console.log('   CONTROL euro applied: the Bundesliga UEFA Cup line reads sixth');
    return { ...r, europe: { ...r.europe, uel: 6 } };
  };
  const EURO_2005 = {
    seriea2005: 'ucl 4, uel 6, uecl 0, UEFA Cup, drop 3, Coppa Italia',
    bundesliga2005: 'ucl 3, uel 5, uecl 0, UEFA Cup, drop 3, DFB-Pokal',
    ligue12005: 'ucl 3, uel 4, uecl 0, UEFA Cup, drop 3, Coupe de France',
  };
  for (const [id, want] of Object.entries(EURO_2005)) {
    const r = rulesOf(id);
    const got = r ? `ucl ${r.europe?.ucl}, uel ${r.europe?.uel}, uecl ${r.europe?.uecl}, ${r.europe?.uelName}, drop ${r.drop}, ${r.cup}` : 'no rules row';
    if (got !== want) fail(`${id} rules read "${got}", the 2005-06 season was "${want}"`);
  }
  console.log(`   European places pinned for ${Object.keys(EURO_2005).length} new rules rows`);
}

/* ---------- 4. Seasons complete and land where 2005 says ---------- */
console.log('4) Full seasons play out plausibly in all five leagues');
if (CONTROL && CONTROL !== 'thinswap') console.log('   skipped: a control run plays no seasons');
else {
  const posOf = (club, era, seed) => {
    Math.random = seeded(seed);
    const s = playSeason(startCareer(club, era));
    const table = sortedTable(s.table);
    const want = (ERA_LEAGUES[era] ?? []).find(l => l.clubs.includes(club))?.clubs.length;
    if (table.length !== want) fail(`${club}: a 2005 table with ${table.length} rows, the league has ${want} clubs`);
    return table.findIndex(r => r.club === club) + 1;
  };
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const che = [1, 2, 3, 4, 5, 6].map(i => posOf('Chelsea', 'era2005', i * 7919));
  const cad = [1, 2, 3, 4, 5, 6].map(i => posOf('Cádiz', 'era2005', i * 104729));
  console.log(`   Chelsea finishes: ${che.join(',')} · Cadiz finishes: ${cad.join(',')}`);
  if (mean(che) > 3.5) fail(`Mourinho's Chelsea averaged position ${mean(che).toFixed(1)}`);
  if (Math.max(...che) > 10) fail(`Mourinho's Chelsea finished ${Math.max(...che)} in one seed, a broken model, not variance`);
  if (mean(cad) < 11) fail(`Cadiz averaged position ${mean(cad).toFixed(1)}, the thinnest squad in the game is overperforming wildly`);

  /* Round 902: the three new leagues, six seeds each, a giant of each and a
     thin promoted squad (Troyes, four real players; Nancy, with three, is the
     thinnest, and Troyes was kept as the band's club because its six seeds
     were measured first). The measured finishes are in the header; the bands
     are means, never a max. Under the thinswap control the giant band plays
     Troyes and the thin band plays Juventus, so both must go red. */
  const swap = CONTROL === 'thinswap';
  if (swap) {
    if (!ERA2005_PARTIAL.includes('Troyes') || ERA2005_PARTIAL.includes('Juventus')) controlRefuse('Troyes is not the thin club or Juventus is');
    console.log('   CONTROL thinswap applied: Juventus plays in the thin band, Troyes in the giant band');
  }
  const juve = [1, 2, 3, 4, 5, 6].map(i => posOf(swap ? 'Troyes' : 'Juventus', 'era2005', i * 7919));
  const bayern = [1, 2, 3, 4, 5, 6].map(i => posOf('Bayern Munich', 'era2005', i * 7919));
  const lyon = [1, 2, 3, 4, 5, 6].map(i => posOf('Lyon', 'era2005', i * 7919));
  const troyes = [1, 2, 3, 4, 5, 6].map(i => posOf(swap ? 'Juventus' : 'Troyes', 'era2005', i * 104729));
  console.log(`   Juventus finishes: ${juve.join(',')} · Bayern finishes: ${bayern.join(',')} · Lyon finishes: ${lyon.join(',')} · Troyes finishes: ${troyes.join(',')}`);
  console.log(`   means: Juventus ${mean(juve).toFixed(2)}, Bayern ${mean(bayern).toFixed(2)}, Lyon ${mean(lyon).toFixed(2)}, Troyes ${mean(troyes).toFixed(2)}`);
  if (mean(juve) > 3.5) fail(`2005 Juventus averaged position ${mean(juve).toFixed(2)} over six seeds`);
  if (mean(bayern) > 3.5) fail(`2005 Bayern averaged position ${mean(bayern).toFixed(2)} over six seeds`);
  if (mean(lyon) > 3.5) fail(`2005 Lyon averaged position ${mean(lyon).toFixed(2)} over six seeds`);
  if (mean(troyes) < 11) fail(`Troyes averaged position ${mean(troyes).toFixed(2)} over six seeds; four real players and youth padding are overperforming wildly`);

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
  /* Round 176 removed Vieira, Figo and Samuel for leaving its two league
     world; Round 902's re-audit (below) brings them home to Juventus and
     Inter. Anelka's Fenerbahce is still outside the world. */
  for (const roster of Object.values(ERA2005_ROSTERS)) {
    if (roster.some(p => p.n === 'Nicolas Anelka')) fail('Anelka is in this world, his Fenerbahce is not');
  }

  /* Round 902: the accounting of the big five extension (the numbers are the
     bake's own log of 2026-10-03, see scripts/bakeEra2005.mjs). */
  const R = CONTROL === 'dupe' ? controlDupe(ERA2005_ROSTERS) : CONTROL === 'stale' ? controlStale(ERA2005_ROSTERS) : ERA2005_ROSTERS;
  const at = (club, name) => (R[club] ?? []).some(p => p.n === name);
  const clubsOf = name => Object.entries(R).filter(([, list]) => list.some(p => p.n === name)).map(([c]) => c);
  if (ERA2005_META.clubs !== 98) fail(`meta clubs ${ERA2005_META.clubs}, the big five of 2005-06 are 98`);
  if (ERA2005_META.players !== 1727) fail(`meta players ${ERA2005_META.players}, the Round 902 bake wrote 1727`);
  if (ERA2005_META.moves !== 385) fail(`meta moves ${ERA2005_META.moves}: 26 before Round 902 plus 150 moved, 135 removed, 72 arrived and 2 folded is 385`);
  /* Serie A, Bundesliga and Ligue 1, as the bake wrote them. */
  const LEAGUE_TOTALS = '294,332,341';
  const leagueTotal = id => (ERA_LEAGUES['era2005'].find(l => l.id === id)?.clubs ?? []).reduce((s, c) => s + (R[c]?.length ?? 0), 0);
  const totals = `${leagueTotal('seriea2005')},${leagueTotal('bundesliga2005')},${leagueTotal('ligue12005')}`;
  if (totals !== LEAGUE_TOTALS) fail(`Serie A, Bundesliga and Ligue 1 hold ${totals} players, the bake wrote ${LEAGUE_TOTALS}`);
  const worldClubs = new Set(ERA_LEAGUES['era2005'].flatMap(l => l.clubs));
  for (const c of Object.keys(R)) if (!worldClubs.has(c)) fail(`the bake holds ${c}, which no 2005 league lists`);
  for (const c of worldClubs) if (!R[c]) fail(`${c} is in a 2005 league and has no bake entry`);
  const partial = [...ERA2005_PARTIAL].sort().join(',');
  if (partial !== 'Alavés,Cádiz,Nancy,Treviso,Troyes') fail(`the thin list reads ${partial}`);
  // One man, one club, in the whole world.
  const seenAt = new Map();
  let dupes = 0;
  for (const [club, list] of Object.entries(R)) for (const p of list) {
    if (seenAt.has(p.n)) { dupes += 1; if (dupes <= 5) fail(`${p.n} is at ${seenAt.get(p.n)} and at ${club}`); }
    seenAt.set(p.n, club);
  }
  // The re-audit: removed while his new club was outside the world, home now.
  for (const [name, club] of [['Patrick Vieira', 'Juventus'], ['Luís Figo', 'Inter Milan'], ['Walter Samuel', 'Inter Milan']]) {
    if (clubsOf(name).join(',') !== club) fail(`${name} should be at ${club} and nowhere else, he is at: ${clubsOf(name).join(',') || 'nowhere'}`);
  }
  // The folds: Round 176's arrivals keep their shipped club, the row at the club they left is gone.
  for (const [name, club] of [['Michael Essien', 'Chelsea'], ['Aleksandr Hleb', 'Arsenal']]) {
    if (clubsOf(name).join(',') !== club) fail(`${name} should be at ${club} and nowhere else, he is at: ${clubsOf(name).join(',') || 'nowhere'}`);
  }
  // The window inside the three new leagues, across them, and out of the first two.
  for (const [name, club, old] of [['Luca Toni', 'Fiorentina', 'Palermo'], ['Alberto Gilardino', 'AC Milan', 'Parma'],
    ['Franck Ribéry', 'Marseille', 'Metz'], ['Kevin Kuranyi', 'Schalke 04', 'Stuttgart'], ['Torsten Frings', 'Werder Bremen', 'Bayern Munich'],
    ['Valérien Ismaël', 'Bayern Munich', 'Werder Bremen'], ['Philipp Lahm', 'Bayern Munich', 'Stuttgart'], ['Giorgio Chiellini', 'Juventus', 'Fiorentina'],
    ['Benoît Pedretti', 'Lyon', 'Marseille'], ['Hernán Crespo', 'Chelsea', 'AC Milan'], ['Edgar Davids', 'Tottenham', 'Inter Milan'],
    ['Javier Saviola', 'Sevilla', 'Monaco'], ['Sébastien Frey', 'Fiorentina', 'Parma'],
    // Shipped lines of the first two leagues whose summer move went into the new three.
    ['Tiago Mendes', 'Lyon', 'Chelsea'], ['Thomas Hitzlsperger', 'Stuttgart', 'Aston Villa'], ['Santiago Solari', 'Inter Milan', 'Real Madrid'],
    ['Denilson', 'Bordeaux', 'Real Betis'], ['Stefano Fiore', 'Fiorentina', 'Valencia'], ['Thimothée Atouba', 'Hamburg', 'Tottenham']]) {
    if (!at(club, name)) fail(`${name} is not at 2005-06 ${club}`);
    if (at(old, name)) fail(`${name} is still at ${old}`);
  }
  // Arrivals from outside the five leagues, each on a dated record.
  for (const [name, club] of [['Johann Vogel', 'AC Milan'], ['John Carew', 'Lyon'], ['Pierre Womé', 'Inter Milan'], ['Rafael van der Vaart', 'Hamburg'], ['Samuel Kuffour', 'Roma']]) {
    if (clubsOf(name).join(',') !== club) fail(`${name} should be at ${club} and nowhere else, he is at: ${clubsOf(name).join(',') || 'nowhere'}`);
  }
  /* Left where the snapshot has them on purpose, because the dated record
     shows a January 2006 move (see the bake header): they must still be at
     their year 2005 club. */
  for (const [name, club] of [['Ivan Pelizzoli', 'Roma'], ['Christian Maggio', 'Fiorentina'], ['Gianni Guigou', 'Fiorentina'],
    ['Matteo Sereni', 'Lazio'], ['Roberto Nanni', 'Siena'], ['Luigi Sartor', 'Roma'], ['Boris Zivkovic', 'Stuttgart'], ['Pierre-Alain Frau', 'Lyon'],
    // Review fix: checked and kept, his loan to Crotone was January 2006; and Angbwa, on loan at Lille that season.
    ['Ilyas Zeytullaev', 'Reggina'], ['Benoît Angbwa', 'Lille']]) {
    if (clubsOf(name).join(',') !== club) fail(`${name} should still be at ${club}, he is at: ${clubsOf(name).join(',') || 'nowhere'}`);
  }
  /* Review fix: the men the first pass left at clubs they did not start
     2005-06 at. Four moved on dated records with a year 2006 row at the
     club; the rest are gone (see UNRESOLVED in the bake's header). */
  for (const [name, club, old] of [['Óscar López', 'Real Betis', 'Lazio'], ['Manuel Belleri', 'Lazio', 'Udinese'], ['Roberto Baronio', 'Lazio', 'Chievo Verona'], ['Olivier Sorlin', 'Monaco', 'Rennes']]) {
    if (clubsOf(name).join(',') !== club) fail(`${name} should be at ${club} and nowhere else, he is at: ${clubsOf(name).join(',') || 'nowhere'}`);
    if (at(old, name)) fail(`${name} is still at ${old}`);
  }
  for (const name of ['Tore André Flo', 'Alexander Manninger', 'Fabio Pecchia', 'Cristian Bucchi', 'Lamberto Zauli', 'Alessandro Doga',
    'Goran Rubil', 'Jean Carlos', 'Roberto Colacone', 'Roberto Cortellini', 'Toledo', 'Florin Bratu', 'Loris Del Nevo',
    'Alessandro Monticciolo', 'Manuel Caponi', 'Mattia Marchesetti', 'Mohamed Kallon', 'Valerio Virga', 'Filippo Antonelli Agomeri', 'Yacine Abdessadki']) {
    if (clubsOf(name).length) fail(`${name} should be gone (his snapshot club is not where he started 2005-06), he is at ${clubsOf(name).join(',')}`);
  }
  // Left the world, or left his club with no provable season start club.
  for (const name of ['Fabrizio Miccoli', 'Georgios Karagounis', 'Stephen Appiah', 'Shunsuke Nakamura', 'Gianfranco Zola', 'Traianos Dellas',
    'Mozart', 'Aílton', 'Christian Vieri', 'Per Kröldrup', 'Reto Ziegler', 'Albert Riera', 'Steve Marlet', 'Julien Rodriguez',
    'Carlos Gamarra', 'Nilmar', 'Kamil Kosowski', 'França', 'Javier Portillo']) {
    if (clubsOf(name).length) fail(`${name} is still in this world at ${clubsOf(name).join(',')}`);
  }
  /* Review fix: the era2005 nationality block, both ways. simNationalities
     covers it too, but that harness is red on main for the modern world, so
     a break here would land on a fence that is already red. Every man in the
     world has exactly one line, and no line names a man who is not here. */
  {
    let natBlock = NAT.NATIONALITY_BY_WORLD?.era2005 ?? {};
    if (CONTROL === 'nonat') {
      if (!natBlock['Patrick Vieira'] || natBlock['Tore André Flo']) controlRefuse('Vieira has no era2005 line, or Flo already has one');
      natBlock = { ...natBlock, 'Tore André Flo': 'Norway' };
      delete natBlock['Patrick Vieira'];
      console.log('   CONTROL nonat applied: Vieira has no nationality line and Flo has one');
    }
    const names = new Set(Object.values(ERA2005_ROSTERS).flat().map(p => p.n));
    const missing = [...names].filter(n => !natBlock[n]);
    const stray = Object.keys(natBlock).filter(n => !names.has(n));
    if (missing.length) fail(`${missing.length} men of the 2005 world have no era2005 nationality line: ${missing.slice(0, 5).join(', ')}`);
    if (stray.length) fail(`${stray.length} era2005 nationality lines name men not in the world: ${stray.slice(0, 5).join(', ')}`);
    console.log(`   nationalities: ${Object.keys(natBlock).length} era2005 lines for ${names.size} men`);
  }
  // One name, two men: the Real Betis Fernando keeps the name, Siena's is not in the world.
  if (clubsOf('Fernando').join(',') !== 'Real Betis') fail(`Fernando is at ${clubsOf('Fernando').join(',') || 'nowhere'}, the namesake rule keeps the Real Betis line`);
  console.log(`   big five accounting: Serie A, Bundesliga, Ligue 1 ${totals}, ${dupes} names at two clubs`);
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

/* ---------- 7. A save from before the big five plays on ---------- */
/* Round 902. A 2005-06 save made before this round carries a world of the
   first two leagues only (its own league lives in `table`, the other in
   `world`), and the clubs of the new leagues in its Champions League were
   foreign then, so it holds no strength for them. The proof with a save
   built by the previous engine itself is in the round's record; this section
   keeps the same path under test: a fresh save cut back to that exact shape,
   sent through JSON the way storage sends it, must rate a Champions League
   club of the new leagues exactly as it rated it while it was foreign (the
   era's finish based rating, the one Ajax still reads) until its first
   summer, never from the new squad files and never from a 2026 preview;
   finish its season on the two leagues it knows; and get all five in the
   summer, where the new clubs are rated from their real squads. */
console.log('7) A two league save from before Round 902 plays on and grows in the summer');
if (CONTROL && CONTROL !== 'nocut') console.log('   skipped: a control run plays no seasons');
else {
  Math.random = seeded(4801);
  let s = startCareer('Barcelona', 'era2005');
  for (let i = 0; i < 16 && !(s.uclWorld && s.uclWorld.length); i++) s = playNextEntry(s, { skipHalftime: true }).state;
  const before = Object.keys(s.world ?? {}).sort().join(',');
  if (before !== 'bundesliga2005,ligue12005,premier2005,seriea2005') fail(`a fresh Barcelona save carries the world ${before}`);
  const old = JSON.parse(JSON.stringify(s));
  if (CONTROL === 'nocut') {
    if (!old.world?.seriea2005 || old.clubStrengths?.['Werder Bremen'] === undefined) controlRefuse('the fresh save has no Serie A world or no Bremen strength to leave in place');
    console.log('   CONTROL nocut applied: the save keeps its five league world and its Bremen strength');
  } else {
    delete old.world.seriea2005;
    delete old.world.bundesliga2005;
    delete old.world.ligue12005;
    for (const lg of ERA_LEAGUES.era2005) {
      if (lg.id === 'premier2005' || lg.id === 'laliga2005') continue;
      for (const c of lg.clubs) delete old.clubStrengths?.[c];
    }
  }
  /* Werder Bremen went out in the last sixteen, like Ajax, who stay
     foreign. Until its first summer the old save holds no strength for
     Bremen, so Bremen must read the same finish derived era rating Ajax
     reads (the rating it always read while it was foreign), never a 2026
     preview; the summer then rates it from its real squad. */
  const cut = cm.strengthOf(old, 'Werder Bremen');
  const ajax = cm.strengthOf(old, 'Ajax');
  console.log(`   the cut save rates Werder Bremen ${cut} and Ajax ${ajax} (both out in the last sixteen)`);
  if (cut !== ajax) fail(`Werder Bremen plays at ${cut} in an old save where Ajax, out at the same stage, reads ${ajax}`);
  if (cut < 70) fail(`Werder Bremen reads ${cut} in an old save, below the era's last sixteen band`);
  const done = playSeason(old);
  if (done.week < done.calendar.length) fail(`the two league save stopped at week ${done.week} of ${done.calendar.length}`);
  const kept = Object.entries(done.world ?? {}).map(([id, w]) => `${id} ${w.round}`).sort().join(',');
  if (kept !== 'premier2005 38') fail(`the two league save finished its season with the world ${kept}`);
  const next = playSeason(startNextSeason(done));
  const grown = Object.entries(next.world ?? {}).map(([id, w]) => `${id} ${w.round}/${w.table.length}`).sort().join(',');
  console.log(`   season one world: ${kept} · season two world: ${grown}`);
  if (grown !== 'bundesliga2005 34/18,ligue12005 38/20,premier2005 38/20,seriea2005 38/20') fail(`season two of the old save has the world ${grown}`);
}

Math.random = REAL_RANDOM;
console.log('');
if (failures > 0) {
  console.error(`simEra2005: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simEra2005: green. 2005 is real, sealed, and plays like 2005.');
