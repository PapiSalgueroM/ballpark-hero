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
 * Round 901: the era is a full big five (the Serie A, the Bundesliga and
 * Ligue 1 joined through scripts/lib/eraBakeExtend.mjs, 98 clubs, 1,769
 * players at the first cut, 1,751 after the review fix finished the summer
 * 2010 window pass). The harness grew with it: Milan, Dortmund and Lille name for
 * name (1), five leagues and 98 board demands with the new giants told to
 * win and the new minnows not, and each nation's own cup (3), six seed bands
 * for a giant of each new league and the thinnest squad (4, measured
 * 2026-10-03: AC Milan 1,2,2,1,6,2 mean 2.33; Bayern 1,1,2,4,1,1 mean 1.67;
 * Marseille 6,2,2,9,2,1 mean 3.67; Cesena 19,20,20,20,20,17 mean 19.33; on
 * the review fix's corrected tree AC Milan 1,2,2,3,3,1 mean 2.00, Bayern
 * 3,1,1,2,6,2 mean 2.50, Marseille 3,8,2,5,2,1 mean 3.50, Cesena
 * 20,20,20,20,19,18 mean 19.50; the bands' seed families are at BAND),
 * the bake's accounting pinned with the re-audit (Ibrahimovic and Robinho at
 * Milan), a sample of the summer 2010 window, the men who left the five
 * leagues and the men who moved only in January 2011 (5), and an old two
 * league save that plays on and gets all five leagues in its second summer
 * (7). The review fix (Round 901) added the tiebreak each league really used
 * (3), every league club against its bake key and the Marco Rossi split (5),
 * and widened the section 4 bands to measured headroom (see BAND).
 *
 * Five negative controls, SIM_ERA2010_CONTROL=dupe|stale|twoleagues|noh2h|
 * misskey, each described where it is defined; each must end the run red.
 *
 * Run: node scripts/simEra2010.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'era2010Entry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'era2010.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
const eras = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManagerEras.ts');
const era2010 = await import('${ROOT.replaceAll('\\', '/')}/src/data/clubManagerEra2010.ts');
const modern = await import('${ROOT.replaceAll('\\', '/')}/src/data/clubManagerRosters.ts');
export { engine, eras, era2010, modern };
`);
execSync(
  `${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`,
  { stdio: 'inherit' },
);

const { engine: cm, eras: ER, era2010: E10, modern: MOD } = await import(pathToFileURL(BUNDLE).href);
/* Round 832: an era's squads load with the era, so the harness fetches all three first. */
await ER.ensureAllEraRosters();
const { eraUpliftRating, eraRosters, projectedRoster } = ER;
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

/* NEGATIVE CONTROLS (Round 901). SIM_ERA2010_CONTROL=<name> breaks one thing
   IN MEMORY (nothing on disk is touched) and the run must then end red, exit
   1. Each control first proves the thing it breaks is there, and refuses with
   exit 2 when it is not, so a control that changed nothing can never read as
   a control that fired. A control run skips the played seasons of sections 4
   and 7, which no control touches.
     dupe        Ibrahimovic at Milan AND back at Barcelona: the one man, one
                 club check and the re-audit check must both fail.
     stale       Gourcuff sent back to Bordeaux: the window check must fail.
     twoleagues  the era cut back to its first two leagues for section 3: the
                 league count, the sizes and the 98 demands must fail.
     noh2h       (review fix) the Serie A table sorted without its head to head
                 rule: section 3's tiebreak check must fail.
     misskey     (review fix) Saint-Etienne's bake key misspelled the way a
                 careless edit would: section 5's membership check must fail. */
/* Section 4's bands for the new leagues, on six seed MEANS. The first cut
   set the giant band at 3.5 from one sample of six (AC Milan 2.33), and the
   review showed that was a coin toss: the six seed mean of a healthy Milan
   moves with the random stream, so an unrelated engine or data change could
   turn it red. Measured 2026-10-03 under ten seed families each (family f
   uses seeds i * 7919 + f * 1000003, family 0 is this harness's own), on the
   review's tree AC Milan 2.33, 2.67, 2.83, 1.50, 2.00, 2.33, 2.67, 2.17,
   4.33, 1.83 and on the corrected tree 2.00, 3.83, 3.17, 2.33, 3.33, 1.83,
   2.33, 1.50, 2.33, 3.50: centre about 2.6, spread about 0.8. The giant band
   is 5.0, about three spreads out, and still far below the mid table a
   broken strength model gives. Bayern sits under the same band (corrected
   tree, families 0 to 4: 2.50, 1.00, 1.33, 2.00, 1.83). Marseille, a
   contender in a tighter league (the real 2010-11 runners up), swings
   harder: one season in the families finished 18th, another 15th, and on
   the corrected tree its ten family means read 3.50, 3.83, 4.33, 4.17, 3.33,
   3.50, 1.50, 6.50, 2.83, 5.00 (centre about 3.9, spread about 1.3), so the
   first cut's 6.0 band was a coin toss too, red in family 7. Its band is
   8.0, about three spreads out, still under the 10.5 a coin flip of a
   strength model averages. Cesena, three real players and youth padding,
   keeps its 11 floor (19.33 at the first cut). */
const BAND = { giant: 5, contender: 8, thin: 11 };
const CONTROL = process.env.SIM_ERA2010_CONTROL ?? '';
if (CONTROL && !['dupe', 'stale', 'twoleagues', 'noh2h', 'misskey'].includes(CONTROL)) { console.error(`unknown control ${CONTROL}`); process.exit(2); }
const controlRefuse = why => { console.error(`CONTROL ${CONTROL} did not apply: ${why}`); process.exit(2); };
function controlDupe(rosters) {
  const row = (rosters['AC Milan'] ?? []).find(p => p.n === 'Zlatan Ibrahimović');
  if (!row) controlRefuse('there is no Ibrahimovic at Milan to duplicate');
  if ((rosters['Barcelona'] ?? []).some(p => p.n === 'Zlatan Ibrahimović')) controlRefuse('he is already at Barcelona');
  console.log('   CONTROL dupe applied: Ibrahimovic is at Milan and at Barcelona');
  return { ...rosters, 'Barcelona': [...rosters['Barcelona'], row] };
}
function controlStale(rosters) {
  const row = (rosters['Lyon'] ?? []).find(p => p.n === 'Yoann Gourcuff');
  if (!row) controlRefuse('there is no Gourcuff at Lyon to send back');
  console.log('   CONTROL stale applied: Gourcuff is back at Bordeaux');
  return { ...rosters, 'Lyon': rosters['Lyon'].filter(p => p !== row), 'Bordeaux': [...rosters['Bordeaux'], row] };
}
function controlMissKey(rosters) {
  if (!rosters['Saint-Étienne']) controlRefuse('there is no Saint-Étienne key to misspell');
  console.log('   CONTROL misskey applied: the bake key reads Saint-Etienne');
  const out = { ...rosters, 'Saint-Etienne': rosters['Saint-Étienne'] };
  delete out['Saint-Étienne'];
  return out;
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
console.log('1) A fresh 2010 save is the real 2010 squad, untouched');
{
  Math.random = seeded(11);
  const s = startCareer('Barcelona', 'era2010');
  const bake = new Map(ERA2010_ROSTERS['Barcelona'].map(p => [p.n, p]));
  let mismatches = 0;
  for (const p of s.squad.filter(p => !p.isYouth)) {
    const b = bake.get(p.name);
    if (!b) { mismatches += 1; fail(`${p.name} is in the 2010 Barcelona squad but not in the bake`); continue; }
    /* Round 166: names, ages and values are the bake untouched. Ratings go
       through the documented era uplift (legends rate like legends), which
       is deterministic, so the identity check asserts THROUGH it. */
    if (b.a !== p.age || eraUpliftRating('era2010', b.r) !== p.rating) {
      mismatches += 1;
      fail(`${p.name}: bake says age ${b.a} rating ${b.r} (uplift ${eraUpliftRating('era2010', b.r)}), squad says ${p.age}/${p.rating}`);
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

  /* Round 901: the new leagues' giants get their real squads, name for name,
     age for age, rating through the uplift, with the summer's arrivals. */
  for (const [club, seed, stars] of [
    ['AC Milan', 41, ['Zlatan Ibrahimović', 'Robinho', 'Alexandre Pato', 'Thiago Silva']],
    ['Borussia Dortmund', 43, ['Nuri Şahin', 'Mats Hummels', 'Shinji Kagawa', 'Robert Lewandowski']],
    ['Lille', 47, ['Eden Hazard', 'Gervinho', 'Moussa Sow']],
  ]) {
    Math.random = seeded(seed);
    const t = startCareer(club, 'era2010');
    const b = new Map(ERA2010_ROSTERS[club].map(p => [p.n, p]));
    let bad = 0;
    for (const p of t.squad.filter(p => !p.isYouth)) {
      const r = b.get(p.name);
      if (!r || r.a !== p.age || eraUpliftRating('era2010', r.r) !== p.rating) { bad += 1; fail(`2010 ${club}: ${p.name} is not the bake's line (${r ? `${r.a}/${r.r}` : 'no line'} vs ${p.age}/${p.rating})`); }
    }
    const gen = t.squad.filter(p => p.generated).length;
    console.log(`   ${club}: ${t.squad.length} in squad, ${bad} mismatches, ${gen} generated`);
    if (gen !== 0) fail(`a dense 2010 club (${club}) got ${gen} generated players on day one`);
    for (const name of stars) if (!t.squad.some(p => p.name === name)) fail(`2010 ${club} is missing ${name}`);
  }
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
  /* Round 876: Brazil's Serie A brought Flamengo's Pedro (Pedro Guilherme, b. 1997) into the 2026 rosters.
     Barcelona's 2010 Pedro is Pedro Rodriguez (b. 1987): two men, one shirt name. */
  /* Round 901: the three new leagues brought five more shirt names the 2026
     world also wears, each two different men, verified 2026-10-03 from
     kicker's player profiles against the ages the two tables give: 2010
     Lyon's Ederson, a midfielder born 13 Jan 1986, and 2026 Fenerbahce's
     Ederson, a goalkeeper born 17 Aug 1993 (both kicker); 2010 Nancy's Andre
     Luiz, a centre-back born 27 Jan 1980 (kicker), and 2026 Rio Ave's, a winger
     of 23 in the 2026 table; 2010 Roma's Juan, a centre-back born 1 Feb 1979
     (kicker), and 2026 Goztepe's, a striker of 23; 2010 Valenciennes' Carlos
     Sanchez, a midfielder of 23 in the 2010 table, and 2026 Pachuca's, a
     right-back born 13 Apr 2002 (kicker); 2010 Bremen's Wesley, a midfielder
     born 24 Jun 1987 (kicker), and 2026 Roma's, a right-back of 22. */
  const NAMESAKES = new Set(['Aaron Ramsey', 'Juan Rodríguez', 'Javi López', 'Diego López', 'Pablo Ibáñez', 'Pedro', 'Ederson', 'André Luiz', 'Juan', 'Carlos Sánchez', 'Wesley']);
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
  let leagues = ERA_LEAGUES['era2010'] ?? [];
  if (CONTROL === 'twoleagues') {
    if (leagues.length !== 5) controlRefuse(`the era holds ${leagues.length} leagues, there are not five to cut back`);
    leagues = leagues.slice(0, 2);
    console.log('   CONTROL twoleagues applied: section 3 sees only the first two leagues');
  }
  /* Round 901: the Serie A, the Bundesliga and Ligue 1 joined, so the era is
     a full big five, 98 clubs. */
  if (leagues.length !== 5) fail(`era2010 has ${leagues.length} leagues`);
  if (leagues.map(l => l.id).join(',') !== 'premier2010,laliga2010,seriea2010,bundesliga2010,ligue12010') fail(`era2010 leagues read ${leagues.map(l => l.id).join(',')}`);
  const sizes = leagues.map(l => l.clubs.length).join(',');
  if (sizes !== '20,20,20,18,20') fail(`era2010 league sizes read ${sizes}`);
  let labels = 0;
  const titleAsked = [];
  for (const lg of leagues) {
    const targets = [];
    for (const c of eraPlayableClubs('era2010', lg.id)) {
      const objs = buildBoardObjectives(c.name, false, lg.clubs.length, 'era2010');
      const league = objs.find(o => o.id === 'league');
      if (!league) { fail(`${c.name} got no league demand`); continue; }
      labels += 1;
      if (league.target === 1) titleAsked.push(c.name);
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
  console.log(`   ${labels} club demands checked across the 2010 leagues; told to win the title: ${titleAsked.join(', ')}`);
  if (labels !== 98) fail(`${labels} board demands, the era holds 98 clubs`);
  const want1 = name => {
    const lg = leagues.find(l => l.clubs.includes(name));
    if (!lg) return false;
    const league = buildBoardObjectives(name, false, lg.clubs.length, 'era2010').find(o => o.id === 'league');
    return league && league.target === 1;
  };
  for (const giant of ['Barcelona', 'Real Madrid', 'Manchester United', 'Chelsea', 'Inter Milan', 'AC Milan', 'Bayern Munich']) {
    if (!want1(giant)) fail(`2010 ${giant} is not told to win the league`);
  }
  for (const minnow of ['Blackpool', 'Hércules', 'Wigan Athletic', 'Cesena', 'Brescia', 'St. Pauli', 'Kaiserslautern', 'Arles-Avignon', 'Brest']) {
    if (want1(minnow)) fail(`2010 ${minnow} is told to WIN the league`);
  }
  // Cup names are the era's real cups.
  const copaClub = buildBoardObjectives('Sevilla', false, 20, 'era2010').find(o => o.id === 'cup');
  if (copaClub && !/Copa del Rey/.test(copaClub.label)) fail(`2010 Sevilla's cup objective says "${copaClub.label}"`);
  /* Round 901: each new nation has its own cup, and the cup words follow. A
     missing cup objective is a failure too. */
  for (const [club, n, cup] of [['Napoli', 20, /Coppa Italia/], ['Borussia Dortmund', 18, /DFB-Pokal/], ['Lyon', 20, /Coupe de France/]]) {
    const o = buildBoardObjectives(club, false, n, 'era2010').find(x => x.id === 'cup');
    if (!o) fail(`2010 ${club} has no cup objective at all`);
    else if (!cup.test(o.label)) fail(`2010 ${club}'s cup objective says "${o.label}"`);
  }
  /* Round 901 review fix: each league's tiebreak, read through the real sort
     path rather than by asking the rules table what it holds. Two clubs level
     on points: Alpha has the better goal difference, Beta won both meetings.
     Serie A 2010-11 and La Liga split them on head to head (Beta first), the
     Premier League, the Bundesliga and Ligue 1 on goal difference (Alpha
     first). Sources for the Serie A rule are in the scripts/bakeEra2010.mjs
     notes and the clubManager.ts rules row. */
  const WANT_FIRST = { premier2010: 'Alpha', laliga2010: 'Beta', seriea2010: 'Beta', bundesliga2010: 'Alpha', ligue12010: 'Alpha' };
  const level = [
    { club: 'Alpha', w: 18, d: 6, l: 14, gf: 60, ga: 40, pts: 60 },
    { club: 'Beta', w: 18, d: 6, l: 14, gf: 45, ga: 40, pts: 60 },
  ];
  for (const [id, first] of Object.entries(WANT_FIRST)) {
    const ctx = cm.tableSortContext({ pairResults: { [id]: { 'Alpha|Beta': [0, 1], 'Beta|Alpha': [2, 0] } } }, id);
    if (CONTROL === 'noh2h' && id === 'seriea2010') {
      if (ctx.rule !== 'h2h') controlRefuse(`the Serie A rule reads ${ctx.rule}, there is no head to head to take away`);
      ctx.rule = 'gdGfOnly';
      console.log('   CONTROL noh2h applied: the Serie A table sorts without head to head');
    }
    const top = cm.sortedTable(level, ctx)[0].club;
    if (top !== first) fail(`${id}: two clubs level on points sort ${top} first (rule ${ctx.rule}), the 2010-11 rule puts ${first} first`);
  }
}

/* ---------- 4. Seasons complete and land where 2010 says ---------- */
console.log('4) Full seasons play out plausibly in all five leagues');
if (CONTROL) console.log('   skipped: a control run plays no seasons');
else {
  const posOf = (club, era, seed) => {
    Math.random = seeded(seed);
    const s = playSeason(startCareer(club, era));
    const table = sortedTable(s.table);
    const want = (ERA_LEAGUES[era] ?? []).find(l => l.clubs.includes(club))?.clubs.length;
    if (table.length !== want) fail(`${club}: a 2010 table with ${table.length} rows, the league has ${want} clubs`);
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

  /* Round 901: the three new leagues, six seeds each, a giant of each and
     the thinnest squad of the whole era (Cesena, three real players). The
     measured finishes are in the header; the bands are means, never a max. */
  const milan = [1, 2, 3, 4, 5, 6].map(i => posOf('AC Milan', 'era2010', i * 7919));
  const bayern = [1, 2, 3, 4, 5, 6].map(i => posOf('Bayern Munich', 'era2010', i * 7919));
  const om = [1, 2, 3, 4, 5, 6].map(i => posOf('Marseille', 'era2010', i * 7919));
  const cesena = [1, 2, 3, 4, 5, 6].map(i => posOf('Cesena', 'era2010', i * 104729));
  console.log(`   AC Milan finishes: ${milan.join(',')} · Bayern finishes: ${bayern.join(',')} · Marseille finishes: ${om.join(',')} · Cesena finishes: ${cesena.join(',')}`);
  console.log(`   means: AC Milan ${mean(milan).toFixed(2)}, Bayern ${mean(bayern).toFixed(2)}, Marseille ${mean(om).toFixed(2)}, Cesena ${mean(cesena).toFixed(2)}`);
  if (mean(milan) > BAND.giant) fail(`2010 AC Milan averaged position ${mean(milan).toFixed(2)} over six seeds (band ${BAND.giant})`);
  if (mean(bayern) > BAND.giant) fail(`2010 Bayern averaged position ${mean(bayern).toFixed(2)} over six seeds (band ${BAND.giant})`);
  if (mean(om) > BAND.contender) fail(`2010 Marseille averaged position ${mean(om).toFixed(2)} over six seeds (band ${BAND.contender})`);
  if (mean(cesena) < BAND.thin) fail(`Cesena averaged position ${mean(cesena).toFixed(2)} over six seeds (band ${BAND.thin}); three real players and youth padding are overperforming wildly`);

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
  /* Round 901: the five league world, pinned (the numbers move only with a
     re-bake, and then on purpose): 1,751 players, 98 clubs, the 11 Round 146
     corrections plus 130 moved, 140 removed, 95 arrived and 2 folded (the
     review fix added 4 moves and 18 removals to the first pass). */
  if (players !== 1751 || clubs !== 98) fail(`the 2010-11 world holds ${players} players in ${clubs} clubs, the bake made 1751 in 98`);
  if (ERA2010_META.moves !== 378) fail(`META.moves reads ${ERA2010_META.moves}, the bake counted 378`);
  if (ERA2010_PARTIAL.join(',') !== 'Blackpool,Cesena') fail(`the thin list reads ${ERA2010_PARTIAL.join(',')}`);
  const R = CONTROL === 'dupe' ? controlDupe(ERA2010_ROSTERS) : CONTROL === 'stale' ? controlStale(ERA2010_ROSTERS)
    : CONTROL === 'misskey' ? controlMissKey(ERA2010_ROSTERS) : ERA2010_ROSTERS;
  /* Round 901 review fix: every club of every 2010-11 league has its bake
     key, and every key is a league club. A misspelled key would leave a real
     club on an all made up squad while the counts above still add up. */
  const members = new Set((ERA_LEAGUES['era2010'] ?? []).flatMap(l => l.clubs));
  const keys = new Set(Object.keys(R));
  const unbaked = [...members].filter(c => !keys.has(c));
  const stray = [...keys].filter(c => !members.has(c));
  if (unbaked.length) fail(`${unbaked.length} league clubs have no bake key: ${unbaked.join(', ')}`);
  if (stray.length) fail(`${stray.length} bake keys are no league club: ${stray.join(', ')}`);
  if (members.size !== 98) fail(`the 2010-11 leagues hold ${members.size} distinct clubs, expected 98`);
  // One man, one club, in the whole world.
  const seen = new Map();
  let dupes = 0;
  for (const [club, roster] of Object.entries(R)) for (const p of roster) {
    if (seen.has(p.n)) { dupes += 1; if (dupes <= 3) fail(`${p.n} is at ${seen.get(p.n)} and at ${club}`); }
    seen.set(p.n, club);
  }
  const at = (club, name) => (R[club] ?? []).some(p => p.n === name);
  const where = name => seen.get(name) ?? null;
  // The window corrections landed: the two most famous 2010 moves.
  if (!at('Barcelona', 'David Villa')) fail('Villa is not at 2010-11 Barcelona');
  if (at('Valencia', 'David Villa')) fail('Villa is still at Valencia');
  if (!at('Real Madrid', 'Mesut Özil')) fail('Ozil is not at 2010-11 Real Madrid');
  if (at('Barcelona', 'Zlatan Ibrahimović')) fail('Ibrahimovic is still at Barcelona, he left for Milan');
  /* The re-audit: Round 146 removed Ibrahimovic and Robinho because Milan
     was outside its world; both are home now. Its arrivals from Bremen and
     Inter (Ozil, Balotelli) must not appear twice. */
  for (const [name, club] of [['Zlatan Ibrahimović', 'AC Milan'], ['Robinho', 'AC Milan'], ['Mesut Özil', 'Real Madrid'], ['Mario Balotelli', 'Manchester City']]) {
    if (where(name) !== club) fail(`${name} sits at ${where(name)}, the re-audit puts him at ${club}`);
  }
  /* A sample of the summer 2010 window, each on its dated record in the bake. */
  const WINDOW = [
    ['Yoann Gourcuff', 'Lyon'], ['Simon Kjaer', 'Wolfsburg'], ['Raúl', 'Schalke 04'], ['Michael Ballack', 'Bayer Leverkusen'],
    ['Klaas-Jan Huntelaar', 'Schalke 04'], ['Aleksandar Kolarov', 'Manchester City'], ['Diego', 'Wolfsburg'], ['Sami Khedira', 'Real Madrid'],
    ['Edinson Cavani', 'Napoli'], ['André-Pierre Gignac', 'Marseille'], ['Loïc Rémy', 'Marseille'], ['Nenê', 'PSG'], ['André Ayew', 'Marseille'],
    ['Laurent Koscielny', 'Arsenal'], ['Marouane Chamakh', 'Arsenal'], ['Asamoah Gyan', 'Sunderland'], ['Alberto Aquilani', 'Juventus'],
    ['Hernanes', 'Lazio'], ['Milos Krasic', 'Juventus'], ['Robert Lewandowski', 'Borussia Dortmund'], ['Shinji Kagawa', 'Borussia Dortmund'],
    ['Mario Mandžukić', 'Wolfsburg'], ['Kevin-Prince Boateng', 'AC Milan'], ['Moussa Sow', 'Lille'], ['Kamel Ghilas', 'Arles-Avignon'],
    /* the review fix pass, and four Round 146 lines the bigger world proves */
    ['Angelo', 'Parma'], ['Sébastien Squillaci', 'Arsenal'], ['Victor Obinna', 'West Ham'], ['Royston Drenthe', 'Hércules'],
  ];
  let landed = 0;
  for (const [name, club] of WINDOW) { if (where(name) === club) landed += 1; else fail(`${name} sits at ${where(name)}, the summer 2010 window put him at ${club}`); }
  /* Men who left the five leagues that summer are gone. */
  for (const name of ['Mamadou Niang', 'Kevin Kuranyi', 'Ricardo Quaresma', 'Sidney Govou', 'Jean-Alain Boumsong', 'Issiar Dia', 'David Beckham', 'Fabio Cannavaro',
    'Carlos Eduardo', 'Juan Pablo Pino', 'Mickaël Pagis', 'Ivan Juric', 'Cédric Varrault', 'Stefano Okaka']) {
    if (where(name)) fail(`${name} is still at ${where(name)}; he was not at a club of the five leagues when 2010-11 began`);
  }
  /* One string, two men: Genoa's captain (31, a right midfielder) stays,
     Sampdoria's young centre-back spent the season on loan at Bari. */
  const rossi = (R['Genoa'] ?? []).find(p => p.n === 'Marco Rossi');
  if (!rossi || rossi.a !== 31 || rossi.p !== 'RM') fail(`Marco Rossi reads ${where('Marco Rossi')} ${rossi ? `${rossi.p} ${rossi.a}` : ''}; the 2010-11 Marco Rossi of the world is Genoa's captain, 31, RM`);
  /* And men who moved only in January 2011 stay where the season began. */
  for (const [name, club] of [['Edin Dzeko', 'Wolfsburg'], ['Giampaolo Pazzini', 'Sampdoria'], ['Antonio Cassano', 'Sampdoria'], ['Ronaldinho', 'AC Milan'], ['Andrea Barzagli', 'Wolfsburg'], ['Martín Demichelis', 'Bayern Munich']]) {
    if (where(name) !== club) fail(`${name} sits at ${where(name)}; he moved only in January 2011, so 2010-11 began with him at ${club}`);
  }
  console.log(`   one man one club: ${dupes} names twice · window sample: ${landed} of ${WINDOW.length} landed · ${members.size} league clubs, ${unbaked.length} without a bake key`);
}

/* ---------- 6. Round 166: legends rate like legends ---------- */
console.log('6) The era uplift: giants above the modern best, order preserved');
{
  const lifted = eraRosters('era2010');
  const messi = lifted['Barcelona'].find(p => p.n === 'Lionel Messi');
  const ronaldo = lifted['Real Madrid'].find(p => p.n === 'Cristiano Ronaldo');
  const modernBest = Math.max(...Object.values(CM_ROSTERS).flat().map(p => p.r));
  console.log(`   prime Messi ${messi?.r}, prime Ronaldo ${ronaldo?.r}, modern best ${modernBest}`);
  if (!messi || messi.r < 95) fail(`prime Messi rates ${messi?.r}, a legend sits 95 plus`);
  if (!ronaldo || ronaldo.r < 95) fail(`prime Ronaldo rates ${ronaldo?.r}`);
  if (messi && messi.r <= modernBest) fail(`prime Messi (${messi.r}) does not outrate the modern best (${modernBest}), which is the owner's exact complaint`);
  // The uplift is monotone: sort order inside every club is untouched.
  for (const [club, raw] of Object.entries(ERA2010_ROSTERS)) {
    const before = [...raw].sort((a, b) => b.r - a.r).map(p => p.n).join('|');
    const after = [...lifted[club]].sort((a, b) => b.r - a.r).map(p => p.n).join('|');
    if (before !== after) fail(`${club}: the uplift reordered the squad`);
  }
  // The rank and file below the pivot are byte for byte the bake.
  let below = 0;
  for (const [club, raw] of Object.entries(ERA2010_ROSTERS)) {
    for (let i = 0; i < raw.length; i++) {
      if (raw[i].r <= 80) {
        below++;
        if (lifted[club][i].r !== raw[i].r) fail(`${raw[i].n} rates ${raw[i].r} in the bake but ${lifted[club][i].r} lifted, below the pivot`);
      }
      if (lifted[club][i].v !== raw[i].v) fail(`${raw[i].n}: the uplift touched his VALUE, it must only touch ratings`);
      if (lifted[club][i].r > 99) fail(`${raw[i].n} lifted past 99`);
    }
  }
  console.log(`   ${below} sub-pivot players verified untouched, values identical throughout`);
  // The modern world does not wear the uplift.
  if (eraUpliftRating('now', 94) !== 94 || eraUpliftRating(undefined, 90) !== 90) fail('the uplift leaked outside its era');
  // Ageing headroom: the projection must not snap a 97 legend to the old 94
  // ceiling at the first summer.
  const y1 = projectedRoster('Barcelona', 1, 'era2010');
  const messiY1 = y1.find(p => p.n === 'Lionel Messi');
  if (messiY1 && messiY1.r < 95) fail(`year-one Messi snapped to ${messiY1.r}, the ceiling did not follow the anchor`);
  // Stature stayed calibrated: era tiers and expectations read the raw bake.
  const barcaDef = cm.eraClubDefFor('Barcelona', 'era2010');
  if (barcaDef.tier !== 1 || barcaDef.expectation !== 1) fail(`2010 Barcelona reads tier ${barcaDef.tier} expectation ${barcaDef.expectation}`);
}

/* ---------- 7. A save from before the big five plays on ---------- */
/* Round 901. A 2010-11 save made before this round carries a world of the
   first two leagues only (its own league lives in `table`, the other in
   `world`). The proof with a save built by the previous engine itself is in
   the round's record; this section keeps the same path under test: a fresh
   save cut back to that exact shape, sent through JSON the way storage sends
   it, must finish its season on the two leagues it knows, and the summer must
   hand it all five. The same shape Round 899's section 7 holds for 2015-16. */
console.log('7) A two league save from before Round 901 plays on and grows in the summer');
if (CONTROL) console.log('   skipped: a control run plays no seasons');
else {
  Math.random = seeded(4901);
  let s = startCareer('Real Madrid', 'era2010');
  for (let i = 0; i < 16; i++) s = playNextEntry(s, { skipHalftime: true }).state;
  const before = Object.keys(s.world ?? {}).sort().join(',');
  if (before !== 'bundesliga2010,ligue12010,premier2010,seriea2010') fail(`a fresh Real Madrid save carries the world ${before}`);
  const old = JSON.parse(JSON.stringify(s));
  delete old.world.seriea2010;
  delete old.world.bundesliga2010;
  delete old.world.ligue12010;
  const done = playSeason(old);
  if (done.week < done.calendar.length) fail(`the two league save stopped at week ${done.week} of ${done.calendar.length}`);
  const kept = Object.entries(done.world ?? {}).map(([id, w]) => `${id} ${w.round}`).sort().join(',');
  if (kept !== 'premier2010 38') fail(`the two league save finished its season with the world ${kept}`);
  const next = playSeason(startNextSeason(done));
  const grown = Object.entries(next.world ?? {}).map(([id, w]) => `${id} ${w.round}/${w.table.length}`).sort().join(',');
  console.log(`   season one world: ${kept} · season two world: ${grown}`);
  if (grown !== 'bundesliga2010 34/18,ligue12010 38/20,premier2010 38/20,seriea2010 38/20') fail(`season two of the old save has the world ${grown}`);
}

Math.random = REAL_RANDOM;
console.log('');
if (failures > 0) {
  console.error(`simEra2010: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simEra2010: green. 2010 is real, sealed, and plays like 2010.');
