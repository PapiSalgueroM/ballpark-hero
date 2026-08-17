/**
 * Round 132 harness: the Club Manager world clock.
 *
 * The owner reported this as "Salah shouldn't be doing that well like in the
 * 2030s", plus "u gave an era thing for my career, u should also gave it for
 * the manger game". Both are one problem: the game had no clock. This guards
 * the fix, and it guards the honesty of the fix, which matters just as much.
 *
 * What it asserts:
 *  1  Year zero is the IDENTITY. The projection at yearsOn 0 is byte for byte
 *     the real August 2026 bake, so a normal new career is untouched and the
 *     eleven rounds of scoreline calibration cannot have moved.
 *  2  The decline curve is a curve. A real thirty three year old loses ground
 *     every season and it gets worse every year, a twenty two year old still
 *     improves, and keepers age far more slowly than wingers.
 *  3  Players retire, at ages football would recognise, and never come back.
 *  4  Twenty seasons out the league is still a league: strong clubs still win
 *     things, squads are still the right size and the right age, nobody has a
 *     side full of forty year olds and no club runs out of players.
 *  5  Balance did not move. Paired seeds, a ticking clock against a frozen
 *     one, twenty seasons each: goals per game and champion points have to
 *     land on top of each other.
 *  6  The real to made up transition is graceful AND labelled. Every made up
 *     player carries a flag through the engine, and the screens that show
 *     names show it.
 *  7  Every era on the menu is one the data can support, the picker says what
 *     is real and what is not, and the numbers it prints are measured off the
 *     projection rather than written by hand.
 *
 * Run: node scripts/simEras.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/cmEraSimEntry.mjs';
const BUNDLE = '/tmp/cmEraSim.bundle.mjs';

// Two-stage entry: ES module imports evaluate before the entry's own
// statements, so the localStorage stub goes in a wrapper that dynamically
// imports the engine (the house pattern, same as every other sim harness).
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT}/src/lib/clubManager.ts');
const eras = await import('${ROOT}/src/lib/clubManagerEras.ts');
const rosters = await import('${ROOT}/src/data/clubManagerRosters.ts');
export { engine, eras, rosters };
`);
execSync(
  `${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`,
  { stdio: 'inherit' },
);

const { engine: cm, eras: E, rosters: DATA } = await import(BUNDLE);
const {
  startCareer, playNextEntry, finishSeason, startNextSeason, sortedTable,
  renewContract, expiringPlayers, buildMarket, loadCareer, saveCareer,
  ensureClock, worldYear, yearsOn, worldSeasonLabel, xiAverageRating,
} = cm;
const {
  CM_BASE_YEAR, CM_ERAS, DEFAULT_ERA_ID, eraById, projectedWorld, projectedRoster,
  projectedXIAvg, realNameShare, realStarterShare, ageDriftBand, declineScale,
  retireChance, rawCurveValue, eraRealShareLabel, eraHonestyLine, makeGeneratedName,
  seasonLabel, CM_CLOCK_META,
} = E;

let failures = 0;
const fail = msg => { failures += 1; console.error('  FAIL: ' + msg); };
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const fx = (v, n = 2) => Number(v).toFixed(n);

/* Paired seeds. Every arm of the balance test runs the same stream of random
   numbers, so a difference between the arms is the change and not the dice. */
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const REAL_RANDOM = Math.random;
const setSeed = s => { Math.random = seeded(s); };
const clearSeed = () => { Math.random = REAL_RANDOM; };

/** One season played out, optionally sitting down with the expiring players. */
function playSeason(state, { renew }) {
  let s = state;
  if (renew) {
    // A manager who actually opens the contracts screen. The budget top up is
    // the harness paying the signing on fees, not a game rule.
    s = { ...s, budget: s.budget + 300 };
    for (const p of expiringPlayers(s)) { const n = renewContract(s, p.id); if (n) s = n; }
  }
  let guard = 0;
  /* ⚠ skipHalftime. playNextEntry stops at the interval and waits for a
     decision unless you ask it not to. Round 119 introduced that and seven
     harnesses stalled forever on the first match of the first season without
     anybody noticing for six rounds. */
  while (guard++ < 500) {
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  if (guard >= 500) fail('a season never reached seasonOver, the calendar stalled');
  return finishSeason(s);
}

/* ================================================================== */
console.log('1) Year zero is the identity');
/* ================================================================== */
{
  if (CM_BASE_YEAR !== 2026) fail(`the clock is anchored on ${CM_BASE_YEAR}`);
  // The clock and the data have to agree about what year the data is from. If
  // somebody re-bakes the rosters for a different summer and forgets this, the
  // whole projection silently shifts by a year.
  if (!String(CM_CLOCK_META.rosterAsOf).includes(String(CM_BASE_YEAR))) {
    fail(`the roster data says "${CM_CLOCK_META.rosterAsOf}" but the clock is set to ${CM_BASE_YEAR}`);
  }
  const world0 = projectedWorld(0);
  const clubs = Object.keys(DATA.CM_ROSTERS);
  let players = 0;
  let mismatch = 0;
  for (const club of clubs) {
    const baked = DATA.CM_ROSTERS[club];
    const proj = world0[club];
    if (!proj || proj.length !== baked.length) { mismatch += 1; continue; }
    for (let i = 0; i < baked.length; i++) {
      players += 1;
      const b = baked[i];
      const p = proj[i];
      if (p.n !== b.n || p.p !== b.p || p.a !== b.a || p.r !== b.r || p.v !== b.v || p.g) mismatch += 1;
    }
  }
  console.log(`   ${clubs.length} clubs, ${players} players compared field by field against the bake`);
  if (mismatch) fail(`${mismatch} projected players at year zero differ from the real data`);
  if (players !== DATA.CM_ROSTER_META.players) {
    fail(`projected ${players} players at year zero, the bake says ${DATA.CM_ROSTER_META.players}`);
  }
  if (Math.round(realNameShare(0) * 100) !== 100) fail('year zero is not 100 percent real players');
  // And the value curve this file duplicates has to be the engine's curve.
  const probe = cm.sellValue({ name: 'x', id: 'x', position: 'ST', rating: 80, age: 25, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0, isYouth: false, seasonGoals: 0, seasonAssists: 0, contractYears: 9 });
  const mine = Math.max(1, Math.round(rawCurveValue(80, 25) * 0.9));
  if (Math.abs(probe - mine) > 1) fail(`the era file's value curve (${mine}) drifted from the engine's (${probe})`);
  // A career started in the default era is a 2026-27 career.
  const s = startCareer('Liverpool');
  if (s.startYear !== CM_BASE_YEAR) fail(`a default career starts in ${s.startYear}`);
  if (worldYear(s) !== CM_BASE_YEAR || yearsOn(s) !== 0) fail('a default career is not at year zero');
  if (worldSeasonLabel(s) !== '2026-27') fail(`the season label reads ${worldSeasonLabel(s)}`);
  if (seasonLabel(2029) !== '2029-30') fail('the season label does not roll the century right');
  if (s.squad.some(p => p.generated)) fail('a 2026-27 squad contains a made up player');
}

/* ================================================================== */
console.log('2) A thirty three year old declines, a twenty two year old does not');
/* ================================================================== */
{
  // Contracts are pinned open so nothing but AGE can remove anybody. Without
  // this the measurement is really measuring the contract system, which is
  // exactly the trap the shipped engine hid behind: a veteran walked for free
  // long before he ever got old enough to slow down.
  const CLUBS = [
    'Liverpool', 'Real Madrid', 'Arsenal', 'AC Milan', 'Bayern Munich',
    'PSG', 'Chelsea', 'Barcelona', 'Inter Milan', 'Atletico Madrid',
  ];
  const SEASONS = 24;
  const drift = {};
  const driftGK = {};
  const retireAges = [];
  clearSeed();
  for (const club of CLUBS) {
    let s = startCareer(club);
    s = { ...s, squad: s.squad.map(p => ({ ...p, contractYears: 40 })) };
    const seen = new Map(s.squad.map(p => [p.name, { r: p.rating, pos: p.position }]));
    for (let y = 0; y < SEASONS; y++) {
      s = startNextSeason(playSeason(s, { renew: false }).state);
      s = { ...s, squad: s.squad.map(p => ({ ...p, contractYears: 40 })) };
      for (const [name, was] of seen) {
        const now = s.squad.find(x => x.name === name);
        if (!now) continue;
        const table = was.pos === 'GK' ? driftGK : drift;
        (table[now.age] ||= []).push(now.rating - was.r);
        seen.set(name, { r: now.rating, pos: was.pos });
      }
      for (const r of (s.retiredLastSummer ?? [])) retireAges.push(r.age);
      for (const p of s.squad) if (!seen.has(p.name)) seen.set(p.name, { r: p.rating, pos: p.position });
    }
  }
  const at = (t, a) => (t[a] && t[a].length >= 20 ? mean(t[a]) : null);
  const show = t => Object.keys(t).map(Number).sort((a, b) => a - b)
    .filter(a => t[a].length >= 20)
    .map(a => `${a}:${fx(mean(t[a]))}`).join(' ');
  console.log(`   ${CLUBS.length} clubs x ${SEASONS} seasons, mean rating change per season by the age he turned`);
  console.log(`   outfield  ${show(drift)}`);
  console.log(`   keepers   ${show(driftGK)}`);

  // A young player still gets better.
  for (const age of [21, 22, 23]) {
    const v = at(drift, age);
    if (v === null) { fail(`no sample at age ${age}`); continue; }
    if (v <= 0.2) fail(`a ${age} year old gains only ${fx(v)} a season, that is not development`);
  }
  // A thirty three year old measurably declines.
  const d33 = at(drift, 33);
  if (d33 === null) fail('no sample at age 33');
  else if (d33 > -1.2) fail(`a 33 year old only loses ${fx(d33)} a season, that is not a decline`);
  // And it is a CURVE, not the flat minus two the old engine ran. Each of
  // these steps has 130 plus samples and about 0.5 of headroom, so the
  // margins here are a third of the measured gap and cannot flap on noise.
  const steps = [[32, 33], [33, 34], [34, 35], [35, 36], [36, 37]];
  for (const [a, b] of steps) {
    const va = at(drift, a);
    const vb = at(drift, b);
    if (va === null || vb === null) { fail(`no sample for the ${a} to ${b} step`); continue; }
    if (vb >= va - 0.15) fail(`decline does not steepen from ${a} (${fx(va)}) to ${b} (${fx(vb)})`);
  }
  if (at(drift, 37) === null || at(drift, 37) > -3.5) fail('a 37 year old is not falling off a cliff');
  // Keepers age far more slowly than everybody else, which is the thing that
  // makes the curve look like football rather than a spreadsheet.
  for (const age of [33, 35]) {
    const out = at(drift, age);
    const gk = at(driftGK, age);
    if (out === null || gk === null) { fail(`no keeper sample at ${age}`); continue; }
    if (gk <= out + 0.4) fail(`keepers at ${age} decline ${fx(gk)} against outfielders ${fx(out)}, no difference`);
  }
  if (declineScale('GK') >= declineScale('ST')) fail('the keeper decline scale is not gentler than a striker');
  if (declineScale('CB') >= declineScale('RW')) fail('a centre half does not age better than a winger');
  if (ageDriftBand(22)[0] < 0) fail('a 22 year old can lose rating on the curve');
  if (ageDriftBand(38)[1] >= 0) fail('a 38 year old can gain rating on the curve');

  // Retirement: it happens, at ages football would recognise.
  retireAges.sort((a, b) => a - b);
  const med = retireAges[Math.floor(retireAges.length / 2)];
  console.log(`   ${retireAges.length} retirements: youngest ${retireAges[0]}, median ${med}, oldest ${retireAges[retireAges.length - 1]}`);
  if (retireAges.length < 120) fail(`only ${retireAges.length} retirements in ${CLUBS.length * SEASONS} club seasons`);
  if (retireAges[0] < 32) fail(`somebody retired at ${retireAges[0]}`);
  if (med < 34 || med > 39) fail(`the median retirement age is ${med}`);
  if (retireAges[retireAges.length - 1] > 42) fail(`somebody played on to ${retireAges[retireAges.length - 1]}`);
  if (retireChance(28, 70, 'ST') !== 0) fail('a 28 year old can retire');
  if (retireChance(42, 90, 'GK') !== 1) fail('a 42 year old can carry on');
  if (retireChance(36, 88, 'ST') >= retireChance(36, 60, 'ST')) fail('a good 36 year old retires as readily as a bad one');
  if (retireChance(36, 75, 'GK') >= retireChance(36, 75, 'ST')) fail('keepers retire as readily as strikers');
}

/* ================================================================== */
console.log('3) A retired player never comes back');
/* ================================================================== */
{
  clearSeed();
  let s = startCareer('Liverpool');
  let checked = 0;
  for (let y = 0; y < 14; y++) {
    s = startNextSeason(playSeason(s, { renew: true }).state);
    const market = new Set(buildMarket(s).map(p => p.name));
    for (const name of (s.retiredNames ?? [])) {
      checked += 1;
      if (market.has(name)) fail(`${name} retired and is back on the transfer list`);
      if (s.squad.some(p => p.name === name)) fail(`${name} retired and is back in the squad`);
    }
  }
  console.log(`   ${(s.retiredNames ?? []).length} retired names, ${checked} market checks, none reappeared`);
  if ((s.retiredNames ?? []).length < 3) fail('fourteen seasons produced almost no retirements');
  // Salah is the name he actually complained about, so it gets its own check.
  const salahYears = [];
  for (let y = 0; y <= 12; y++) {
    const row = projectedRoster('Liverpool', y).find(p => p.n === 'Mohamed Salah');
    salahYears.push(row ? `${CM_BASE_YEAR + y}:${row.a}y/${row.r}` : `${CM_BASE_YEAR + y}:gone`);
  }
  console.log(`   ${salahYears.join(' ')}`);
  const stillThere = projectedRoster('Liverpool', 10).some(p => p.n === 'Mohamed Salah');
  if (stillThere) fail('Mohamed Salah is still at Liverpool in 2036, which is the bug this round is about');
  const y10 = new Set(Object.values(projectedWorld(10)).flat().map(p => p.n));
  if (y10.has('Mohamed Salah')) fail('Mohamed Salah is still somewhere in the 2036 world');
}

/* ================================================================== */
console.log('4) Twenty seasons out, the league is still a league');
/* ================================================================== */
{
  const RUNS = 10;
  const SEASONS = 20;
  const BIG = new Set([
    'Real Madrid', 'Barcelona', 'Manchester City', 'Liverpool', 'Bayern Munich',
    'PSG', 'Arsenal', 'Inter Milan', 'Chelsea', 'Manchester United', 'Juventus',
    'Atletico Madrid', 'Tottenham', 'Napoli', 'AC Milan', 'Newcastle',
  ]);
  const champs = {};
  const squadSizes = [];
  const oldests = [];
  const avgAges = [];
  const xiAvgs = [];
  let titles = 0;
  let bigTitles = 0;
  for (let run = 0; run < RUNS; run++) {
    setSeed(4000 + run);
    let s = startCareer('Everton');
    for (let y = 0; y < SEASONS; y++) {
      const { state } = playSeason(s, { renew: true });
      const table = sortedTable(state.table);
      champs[table[0].club] = (champs[table[0].club] ?? 0) + 1;
      titles += 1;
      if (BIG.has(table[0].club)) bigTitles += 1;
      s = startNextSeason(state);
      squadSizes.push(s.squad.length);
      oldests.push(Math.max(...s.squad.map(p => p.age)));
      avgAges.push(mean(s.squad.map(p => p.age)));
      xiAvgs.push(xiAverageRating(s));
    }
  }
  clearSeed();
  const order = Object.entries(champs).sort((a, b) => b[1] - a[1]);
  console.log(`   ${RUNS} careers x ${SEASONS} seasons, champions: ${order.slice(0, 6).map(([c, n]) => `${c} ${n}`).join(', ')}`);
  console.log(`   established clubs took ${fx(bigTitles / titles * 100, 0)}% of the titles`);
  console.log(`   my squad: size ${fx(mean(squadSizes), 1)} (min ${Math.min(...squadSizes)}), average age ${fx(mean(avgAges), 1)}, oldest ${fx(mean(oldests), 1)} (max ${Math.max(...oldests)}), XI ${fx(mean(xiAvgs), 1)}`);
  // Measured headroom: established clubs take about half the titles, and the
  // floor is set well under that rather than at a number that sounds strict.
  if (bigTitles / titles < 0.3) fail(`established clubs won only ${fx(bigTitles / titles * 100, 0)}% of titles, the pecking order dissolved`);
  if (Math.min(...squadSizes) < 16) fail(`a squad fell to ${Math.min(...squadSizes)} players`);
  if (mean(squadSizes) < 18) fail(`squads average only ${fx(mean(squadSizes), 1)} players twenty seasons out`);
  if (mean(avgAges) > 29) fail(`squads average ${fx(mean(avgAges), 1)} years old`);
  if (mean(oldests) > 39) fail(`the oldest player in a squad averages ${fx(mean(oldests), 1)}`);
  if (Math.max(...oldests) > 42) fail(`a squad carried a ${Math.max(...oldests)} year old`);
  if (mean(xiAvgs) < 60) fail(`the XI averages ${fx(mean(xiAvgs), 1)} twenty seasons out, the squad rotted away`);

  // And the rest of the world, straight off the projection, out to thirty
  // years which is further than anybody will ever play.
  for (const y of [0, 5, 10, 20, 30]) {
    const world = projectedWorld(y);
    const sizes = Object.values(world).map(r => r.length);
    const all = Object.values(world).flat();
    const empty = sizes.filter(n => n === 0).length;
    const xis = Object.keys(world).map(c => projectedXIAvg(c, y)).filter(v => v !== null);
    const oldPerClub = Object.values(world).filter(r => r.length).map(r => Math.max(...r.map(p => p.a)));
    console.log(`   world +${String(y).padStart(2)}y: ${all.length} players, mean age ${fx(mean(all.map(p => p.a)), 1)}, club XI mean ${fx(mean(xis), 1)} (min ${Math.min(...xis)}, max ${Math.max(...xis)}), oldest club man median ${oldPerClub.sort((a, b) => a - b)[Math.floor(oldPerClub.length / 2)]}`);
    /* Some clubs are empty in the bake itself (the dataset ranks players by
       value worldwide and the smallest squads sit under its floor) and the
       engine youth-pads them. The honest bound is the bake's own truth, not
       a number pinned in a harness: every empty club must be one that baked
       empty AND is disclosed in CM_PARTIAL. Round 140 grew that set from 3
       to 10 when Portugal, Scotland and Turkey arrived. */
    const bakedEmpty = Object.entries(DATA.CM_ROSTERS).filter(([, r]) => r.length === 0).map(([c]) => c);
    const undisclosed = bakedEmpty.filter(c => !DATA.CM_PARTIAL.includes(c));
    if (undisclosed.length) fail(`empty clubs not disclosed in CM_PARTIAL: ${undisclosed.join(', ')}`);
    if (empty > bakedEmpty.length) fail(`${empty} clubs have no players at all at +${y} years, but only ${bakedEmpty.length} baked empty: somebody new ran dry`);
    if (all.length < DATA.CM_ROSTER_META.players * 0.98) fail(`the world lost players by +${y} years (${all.length})`);
    if (mean(all.map(p => p.a)) > 27.5) fail(`the whole world averages ${fx(mean(all.map(p => p.a)), 1)} years old at +${y}`);
    if (Math.abs(mean(xis) - 74.1) > 2.5) fail(`club strength drifted to ${fx(mean(xis), 1)} at +${y} years, it starts at 74.1`);
    // The pecking order itself, not just the average.
    const strong = projectedXIAvg('Real Madrid', y);
    const weak = projectedXIAvg('Lincoln City', y);
    if (!(strong > weak + 15)) fail(`Real Madrid (${strong}) is no longer far stronger than Lincoln City (${weak}) at +${y}`);
  }
}

/* ================================================================== */
console.log('5) Balance did not move: ticking clock against a frozen one');
/* ================================================================== */
{
  /* The do nothing arm pins the world year back to the roster year at every
     rollover, so yearsOn stays zero and every AI club, the whole transfer
     market and every opponent squad behave exactly as they did before this
     round. Same seeds, same club, same number of seasons, so anything that
     moves between the arms is the clock and not the dice. */
  const RUNS = 40;
  const SEASONS = 12;
  const arms = {};
  for (const frozen of [true, false]) {
    const gpg = [];
    const champPts = [];
    const myPts = [];
    const myPos = [];
    for (let run = 0; run < RUNS; run++) {
      setSeed(9000 + run);
      let s = startCareer('Everton');
      for (let y = 0; y < SEASONS; y++) {
        const { state, summary } = playSeason(s, { renew: true });
        const table = sortedTable(state.table);
        const games = table.reduce((a, r) => a + r.w + r.d + r.l, 0) / 2;
        gpg.push(table.reduce((a, r) => a + r.gf, 0) / Math.max(1, games));
        champPts.push(table[0].pts);
        myPts.push(summary.points);
        myPos.push(summary.position);
        /* Pinning has to happen BEFORE the rollover, not after it, because
           startNextSeason reads the OLD state's start year to work out what
           year the new season is in. Pinning afterwards left the control arm
           generating its opponents one year ahead of itself every summer,
           which is a quiet way to compare against the wrong thing. */
        s = startNextSeason(frozen ? { ...state, startYear: CM_BASE_YEAR - state.season } : state);
        if (frozen && yearsOn(s) !== 0) fail(`the frozen arm drifted to +${yearsOn(s)} years`);
      }
    }
    arms[frozen ? 'frozen' : 'ticking'] = {
      gpg: mean(gpg), champPts: mean(champPts), myPts: mean(myPts), myPos: mean(myPos), n: gpg.length,
    };
  }
  clearSeed();
  const f = arms.frozen;
  const t = arms.ticking;
  console.log(`   ${RUNS} careers x ${SEASONS} seasons per arm (${f.n} league seasons each)`);
  console.log(`   frozen clock : ${fx(f.gpg)} goals a game, champion on ${fx(f.champPts, 1)} pts, me on ${fx(f.myPts, 1)} pts finishing ${fx(f.myPos, 1)}`);
  console.log(`   ticking clock: ${fx(t.gpg)} goals a game, champion on ${fx(t.champPts, 1)} pts, me on ${fx(t.myPts, 1)} pts finishing ${fx(t.myPos, 1)}`);
  console.log(`   gap: ${fx(Math.abs(t.gpg - f.gpg))} goals a game, ${fx(Math.abs(t.champPts - f.champPts), 1)} champion points, ${fx(Math.abs(t.myPts - f.myPts), 1)} of my points`);
  /* MEASURED at 480 league seasons an arm, and both arms are fully seeded so
     these numbers repeat exactly: 0.00 goals a game, 0.5 of the champion's
     points, 3.5 of my own points and 1.1 of my finishing position. The
     scoreline calibration did not move at all. My own points slipping about
     three and a half is the change doing its job rather than a regression:
     this arm renews contracts but never signs anybody, so it is a manager
     whose squad only ages while the rest of the world keeps restocking, and
     finishing a place lower over twelve seasons for that is the point.

     Margins below are set off those measured gaps with room, which is the
     Round 125 lesson: pick them off measured headroom, not off a number that
     sounds strict enough to be impressive. */
  if (Math.abs(t.gpg - f.gpg) > 0.12) fail(`goals a game moved by ${fx(Math.abs(t.gpg - f.gpg))}`);
  if (Math.abs(t.champPts - f.champPts) > 4) fail(`the champion's points moved by ${fx(Math.abs(t.champPts - f.champPts), 1)}`);
  if (Math.abs(t.myPts - f.myPts) > 7) fail(`my points moved by ${fx(Math.abs(t.myPts - f.myPts), 1)}`);
  if (Math.abs(t.myPos - f.myPos) > 2.5) fail(`my finishing position moved by ${fx(Math.abs(t.myPos - f.myPos), 1)}`);
  // And the absolute numbers still have to look like football, because two
  // arms agreeing on nonsense is still nonsense.
  for (const [name, a] of Object.entries(arms)) {
    if (a.gpg < 2 || a.gpg > 3.6) fail(`${name}: ${fx(a.gpg)} goals a game is not football`);
    if (a.champPts < 60 || a.champPts > 105) fail(`${name}: a champion on ${fx(a.champPts, 1)} points is not football`);
  }
}

/* ================================================================== */
console.log('6) Real names become made up ones gracefully, and it is labelled');
/* ================================================================== */
{
  const rows = [];
  for (const y of [0, 1, 3, 5, 10, 15, 20]) {
    rows.push({ y, all: realNameShare(y) * 100, xi: realStarterShare(y) * 100 });
  }
  console.log('   share of players who are real footballers:');
  for (const r of rows) console.log(`     +${String(r.y).padStart(2)}y  first teams ${fx(r.xi, 1)}%  whole squads ${fx(r.all, 1)}%`);
  // Monotone: the real world can only ever thin out as the clock runs.
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].all > rows[i - 1].all + 0.001) fail(`real names went UP between +${rows[i - 1].y} and +${rows[i].y} years`);
    if (rows[i].xi > rows[i - 1].xi + 0.001) fail(`real starters went UP between +${rows[i - 1].y} and +${rows[i].y} years`);
  }
  // Graceful means no cliff. One year in must still be nearly all real, and
  // five years in most of a first team is still people who exist.
  /* Margins off the measured curve, which is a PURE function of the year and
     therefore cannot flap at all: +1y is 91.8% of first teams and 86.5% of all
     squad players, +5y is 57.1% and 47.9%, +10y is 20.7%, +20y is zero. These
     floors sit well under those, so they catch somebody breaking the curve
     rather than somebody nudging it.

     Worth writing down what this decay IS, because it looks aggressive until
     you check it: a departure here means gone from these nine leagues, and the
     model does not move real players BETWEEN clubs, so every transfer inside
     the modelled world reads as an exit. It is fitted so the age profile stays
     right, and where it can be checked against reality it holds up: of the
     2021 Real Madrid squad about seventeen of twenty three were still in one
     of these leagues five years later, and this projection leaves eighteen of
     Real Madrid's twenty six in place after five. The 57% average is lower
     only because it includes Lincoln City and Telstar, who churn harder in
     real life too. */
  if (rows.find(r => r.y === 1).all < 80) fail('one year on has already lost a fifth of the real players');
  if (rows.find(r => r.y === 1).xi < 85) fail('one year on, first teams have already lost their real players');
  if (rows.find(r => r.y === 5).xi < 45) fail('five years on, most of a first team is already invented');
  if (rows.find(r => r.y === 10).xi < 12) fail('ten years on there is nothing recognisable left at all');
  if (rows.find(r => r.y === 20).all > 5) fail('twenty years on the world is still full of 2026 players, nobody is ageing out');
  // The elite end has to hold up better than the average, because that is
  // where it can actually be checked against real transfer history.
  const rmReal = projectedRoster('Real Madrid', 5).filter(p => !p.g).length;
  const rmAll = projectedRoster('Real Madrid', 5).length;
  console.log(`   Real Madrid five years on: ${rmReal}/${rmAll} of the squad are still real players`);
  if (rmReal / rmAll < 0.5) fail('half of Real Madrid is invented after only five years');
  // Every made up player is flagged, everywhere, forever.
  let gen = 0;
  let unflaggedReal = 0;
  const realNames = new Set(Object.values(DATA.CM_ROSTERS).flat().map(p => p.n));
  for (const y of [5, 10, 20]) {
    for (const p of Object.values(projectedWorld(y)).flat()) {
      if (p.g) {
        gen += 1;
        if (realNames.has(p.n)) fail(`a made up player is called ${p.n}, which is a real footballer's name`);
      } else if (!realNames.has(p.n)) {
        unflaggedReal += 1;
      }
    }
  }
  console.log(`   ${gen} made up players checked across three projections, none wearing a real name`);
  if (gen < 3000) fail(`only ${gen} made up players, the projection is not generating`);
  if (unflaggedReal) fail(`${unflaggedReal} players are not in the real data and are not flagged as made up`);
  // Enough distinct names that a squad does not read like a photocopy.
  const names5 = new Set(Object.values(projectedWorld(10)).flat().filter(p => p.g).map(p => p.n));
  console.log(`   ${names5.size} distinct made up names in the 2036 world`);
  if (names5.size < 1200) fail(`only ${names5.size} distinct made up names, they will repeat constantly`);
  if (makeGeneratedName('a') === makeGeneratedName('b')) fail('the name generator ignores its seed');
  if (makeGeneratedName('a') !== makeGeneratedName('a')) fail('the name generator is not deterministic');

  // The flag survives into the engine and into the market. Round 139 removed
  // the future START dates, but a save that starts today still reaches 2036 by
  // playing ten seasons, so the 2036 world must still exist and still be
  // honestly flagged. A career ten seasons in is the shape that reaches it.
  const deep = { ...startCareer('Liverpool'), season: 11 };
  const roster10 = projectedRoster('Liverpool', 10);
  const squadGen = roster10.filter(p => p.g).length;
  const market = buildMarket(deep);
  const marketGen = market.filter(p => p.generated).length;
  console.log(`   season 11 of a Liverpool save (2036-37 world): ${squadGen}/${roster10.length} made up in the projected squad, ${marketGen}/${market.length} on the market`);
  if (squadGen < 3) fail('a 2036 projected squad has almost nobody made up in it, the flag is not surviving');
  if (marketGen < 500) fail('the 2036 market is barely flagged');
  if (market.some(p => p.generated && realNames.has(p.name))) fail('a flagged market player has a real name');
  // The default era must never carry the flag at all.
  const now = startCareer('Liverpool');
  if (now.squad.some(p => p.generated) || buildMarket(now).some(p => p.generated)) {
    fail('a 2026-27 career contains made up players');
  }

  // And the screens have to actually print it. A flag nobody renders is not
  // honesty, it is a field.
  const files = {
    'src/components/club-manager/SquadScreen.tsx': ['MADE UP', 'p.generated'],
    'src/components/club-manager/TransferScreen.tsx': ['MadeUpTag', 'm.generated', 'p.generated'],
    'src/components/club-manager/ClubDetailScreen.tsx': ['MadeUpTag', 'p.g &&'],
    'src/pages/ClubManager.tsx': ['REAL DATA', 'PROJECTION', 'No past eras'],
  };
  for (const [file, needles] of Object.entries(files)) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const needle of needles) {
      if (!src.includes(needle)) fail(`${file} does not show "${needle}", the labelling is missing`);
    }
  }
  console.log(`   ${Object.keys(files).length} screens carry the labelling`);
}

/* ================================================================== */
console.log('7) The era menu is exactly what the owner asked for and the data supports');
/* ================================================================== */
{
  console.log(`   ${CM_ERAS.length} era(s): ${CM_ERAS.map(e => e.label).join(', ')}`);

  /* ⚠ THE TWO RULES, both dated so nobody relitigates them blind.

     No FUTURE eras. Owner, 2026-08-16: "Not the future since we dont know
     the future. So please remove that." Round 132 offered plus5/plus10/plus15
     and Round 139 removed them. This is the guard that keeps a later round
     from quietly adding one back.

     No PAST eras UNTIL a real historical bake exists. player_market_values
     in Supabase holds real rosters back to 2004, so past eras are buildable,
     but they arrive as baked real data with their own harness, not as
     invented squads wearing real badges. When that lands, this section gets
     rewritten on purpose, with eyes open, and startYear < CM_BASE_YEAR stops
     being a failure. */
  for (const e of CM_ERAS) {
    if (e.startYear > CM_BASE_YEAR) fail(`era ${e.label} starts in the FUTURE, which the owner removed on 2026-08-16`);
    if (e.startYear < CM_BASE_YEAR) fail(`era ${e.label} is BEFORE the roster year, and no historical bake exists yet`);
  }

  if (CM_ERAS.length !== 1) fail(`${CM_ERAS.length} eras on the menu; with no past bake and no future allowed there is exactly one honest start`);
  if (eraById(DEFAULT_ERA_ID).startYear !== CM_BASE_YEAR) fail('the default era is not the real data');
  if (eraById('nonsense-id').id !== CM_ERAS[0].id) fail('an unknown era id does not fall back to the real one');
  // Round 132 saves may still carry the removed era ids. They must not crash,
  // they must land on the real era.
  for (const legacy of ['plus5', 'plus10', 'plus15']) {
    if (eraById(legacy).id !== CM_ERAS[0].id) fail(`removed era id ${legacy} does not fall back to the real one, old saves would break`);
  }

  const e = CM_ERAS[0];
  const label = eraRealShareLabel(e);
  const line = eraHonestyLine(e);
  console.log(`   ${e.label}  ${label}  |  ${line}`);
  if (!label || !line) fail(`era ${e.label} has no honesty copy`);
  if (!/real/i.test(line)) fail(`era ${e.label} does not say it is real data`);

  clearSeed();
  const s = startCareer('Real Madrid', e.id);
  const xi = xiAverageRating(s);
  const gen = s.squad.filter(p => p.generated).length;
  console.log(`   ${worldSeasonLabel(s)}: XI ${xi}, ${gen} made up players in the squad`);
  if (s.startYear !== e.startYear) fail(`${e.label} started in ${s.startYear}`);
  if (xi < 70) fail(`${e.label} handed Real Madrid an XI of ${xi}`);
  if (gen !== 0) fail(`the real-data era contains ${gen} made up players on day one`);
}

/* ================================================================== */
console.log('8) A save from before the clock existed still opens and still works');
/* ================================================================== */
{
  clearSeed();
  const legacy = JSON.parse(JSON.stringify(startCareer('Arsenal')));
  // Strip everything this round added, exactly as a save committed before it
  // would look, and push it a few seasons in so it is a real half played save.
  delete legacy.startYear;
  delete legacy.eraId;
  delete legacy.retiredNames;
  delete legacy.retiredLastSummer;
  legacy.season = 4;
  legacy.week = 9;
  for (const p of legacy.squad) delete p.generated;

  // The screens open it first. Round 127's lesson: repairing only inside
  // playNextEntry is not enough, because a screen can be opened before a ball
  // is kicked and the screens read the world year now.
  const store = {};
  globalThis.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  };
  saveCareer(legacy);
  const loaded = loadCareer();
  if (!loaded) { fail('a pre Round 132 save no longer opens at all'); }
  else {
    if (loaded.startYear !== CM_BASE_YEAR) fail(`the repaired save starts in ${loaded.startYear}`);
    if (!loaded.eraId) fail('the repaired save has no era');
    if (!Array.isArray(loaded.retiredNames)) fail('the repaired save has no retired list');
    if (worldYear(loaded) !== CM_BASE_YEAR + 3) fail(`a season 4 save reads ${worldYear(loaded)}`);
    if (yearsOn(loaded) !== 3) fail(`a season 4 save is ${yearsOn(loaded)} years on`);
    // Idempotent: the second repair must change nothing at all.
    const once = JSON.stringify(loaded);
    ensureClock(loaded);
    ensureClock(loaded);
    if (JSON.stringify(loaded) !== once) fail('ensureClock is not a no-op the second time');
    // And it still plays.
    let s = loaded;
    let entries = 0;
    for (let i = 0; i < 40; i++) {
      const r = playNextEntry(s, { skipHalftime: true });
      s = r.state;
      entries += 1;
      if (r.kind === 'seasonOver') break;
    }
    const finished = startNextSeason(playSeason(s, { renew: false }).state);
    console.log(`   repaired to ${worldSeasonLabel(loaded)}, played ${entries} entries, rolled on to ${worldSeasonLabel(finished)}`);
    if (finished.season !== 5) fail(`the repaired save rolled to season ${finished.season}`);
    if (worldYear(finished) !== CM_BASE_YEAR + 4) fail(`the repaired save rolled to ${worldYear(finished)}`);
    if (finished.squad.length < 16) fail('the repaired save came out of the summer with no squad');
  }
  /* Round 139 removed the future starts, but Round 132 shipped for a day, so
     a save that STARTED in 2036 can exist on somebody's device. Opening it
     must not crash and must not lie about its own year: the stored startYear
     is honoured even though the era is off the menu. */
  const orphan = { ...startCareer('Arsenal'), startYear: CM_BASE_YEAR + 10, eraId: 'plus10' };
  if (worldYear(orphan) !== CM_BASE_YEAR + 10) fail('an orphaned future save does not know what year it is');
  const rolled = startNextSeason(playSeason(orphan, { renew: false }).state);
  if (worldYear(rolled) !== CM_BASE_YEAR + 11) fail('an orphaned future save does not advance its year');
  if (yearsOn(rolled) !== 11) fail('an orphaned future save does not age its world');
}

/* ================================================================== */
console.log('9) Copy check');
/* ================================================================== */
{
  // House rules: no dashes of any kind in anything a player reads, and no
  // other companies' product names anywhere (Round 129 stripped these
  // sitewide, this keeps them out of the new copy).
  const files = [
    'src/lib/clubManagerEras.ts',
    'src/lib/clubManager.ts',
    'src/pages/ClubManager.tsx',
    'src/components/club-manager/SquadScreen.tsx',
    'src/components/club-manager/ClubDetailScreen.tsx',
    'src/components/club-manager/TransferScreen.tsx',
    'scripts/simEras.mjs',
  ];
  // The dashes are written as escapes on purpose: a literal one in here would
  // trip the check on this very file, which is a funny way to spend an hour.
  const DASHES = /[\u2013\u2014]/;
  const banned = /\b(2K|BitLife|FIFA|EA Sports|Madden|Football Manager)\b/; // rival-names-allow: this line is itself a brand guard
  let clean = 0;
  for (const file of files) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    let ok = true;
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      if (DASHES.test(line)) { fail(`${file} has an em or en dash on line ${i + 1}`); ok = false; }
      // Only what a player can READ. Round 127's role ladder comments cite the
      // games this one is competing with by name, on purpose, and a comment is
      // not copy. So the check runs on single line quoted strings only.
      for (const str of line.match(/(['"`])(?:(?!\1)[^\\])*\1/g) ?? []) {
        if (banned.test(str)) { fail(`${file} names another company's product: ${str.slice(0, 60)}`); ok = false; }
      }
    });
    if (ok) clean += 1;
  }
  console.log(`   ${clean}/${files.length} files clean`);
}

console.log(failures === 0 ? '\nALL ERA AND AGEING CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
