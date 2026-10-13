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
 * Round 1304: "the real data" is the JOINED modern world. Until this round
 * sections 1, 4 and 6 compared with src/data/clubManagerRosters.ts, the value
 * table's bake, and the game has read src/data/clubManagerWorldRosters.ts
 * since Round 1035: the bake, less any man a newer squad list moved, plus
 * the generated leagues (the A-League Men of Round 1035, the Russian Premier
 * League of Round 1052). Read against the bake alone, three checks were red
 * from Round 1035's commit b777801d, and every man they named was real:
 * Southampton one row short (Ryan Fraser, moved to Macarthur FC by the
 * A-League ledgers), and 189 men "not in the real data" who are the two
 * generated leagues' own players. MEASURED on runners 2026-10-11
 * (docs/audits/ROUND-1304-NOTES.md has the table): 454 clubs and 5,113 men
 * at year zero, 0 differences from the joined world; the 189 were 168 men of
 * the 2031 world (77 A-League, 91 Russia) and 21 of the 2036 one. Section 1
 * now also proves the join's own accounting from the files, so a man the
 * join drops, or a club no real source accounts for, is red here.
 * Fix pass of the same round: and a man the join FAILS to move. The running
 * reviewer kept Ryan Fraser at Southampton as well as at Macarthur FC and
 * this harness passed, printing "less 0 moved by a newer squad list
 * (nobody)"; only simClubManagerALeague, which is in no gate list, saw him
 * twice. Section 1 now fails on any name that is at a club of the bake and
 * at a club outside it at once (0 today; control twoclubs).
 *
 * Four negative controls, SIM_ERAS_CONTROL=dropman|unflag|twoclubs|champgap (see
 * the block where they are defined). A control run plays no seasons, except
 * champgap, which plays section 5 alone.
 *
 * Run: node scripts/simEras.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* Round 1304: a name of its own for each run, so the harness and one of its
   controls can run side by side without reading each other's bundle. */
const TAG = `${process.pid}-${Date.now()}`;
const ENTRY = path.join(os.tmpdir(), `cmEraSimEntry-${TAG}.mjs`);
const BUNDLE = path.join(os.tmpdir(), `cmEraSim-${TAG}.bundle.mjs`);

// Two-stage entry: ES module imports evaluate before the entry's own
// statements, so the localStorage stub goes in a wrapper that dynamically
// imports the engine (the house pattern, same as every other sim harness).
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
const eras = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManagerEras.ts');
const rosters = await import('${ROOT.replaceAll('\\', '/')}/src/data/clubManagerRosters.ts');
const world = await import('${ROOT.replaceAll('\\', '/')}/src/data/clubManagerWorldRosters.ts');
export { engine, eras, rosters, world };
`);
execSync(
  `${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`,
  { stdio: 'inherit' },
);

const { engine: cm, eras: E, rosters: DATA, world: WORLD } = await import(pathToFileURL(BUNDLE).href);
fs.rmSync(ENTRY, { force: true });
fs.rmSync(BUNDLE, { force: true });
/* Round 1304: REAL is the modern world the game reads (the joined one);
   BAKED is the value table's bake, one of its sources, kept for the join's
   accounting in section 1. */
const BAKED = DATA.CM_ROSTERS;
const REAL = WORLD.CM_WORLD_ROSTERS;
/* Round 832: an era's squads load with the era, so the harness fetches all three first. */
await E.ensureAllEraRosters();
const {
  startCareer, playNextEntry, finishSeason, startNextSeason, sortedTable,
  renewContract, expiringPlayers, buildMarket, loadCareer, saveCareer,
  ensureClock, worldYear, yearsOn, worldSeasonLabel, xiAverageRating,
} = cm;
const {
  CM_BASE_YEAR, CM_ERAS, DEFAULT_ERA_ID, eraById, projectedWorld, projectedRoster,
  projectedXIAvg, realNameShare, realStarterShare, ageDriftBand, declineScale,
  retireChance, rawCurveValue, eraRealShareLabel, eraHonestyLine, makeGeneratedName,
  seasonLabel, CM_CLOCK_META, isHistoricEra, HISTORIC_ROSTERS,
} = E;

let failures = 0;
const fail = msg => { failures += 1; console.error('  FAIL: ' + msg); };
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const fx = (v, n = 2) => Number(v).toFixed(n);

/* NEGATIVE CONTROLS (Round 1304). SIM_ERAS_CONTROL=<name> breaks one thing
   IN MEMORY (nothing on disk is touched) and the run must then end red, exit
   1. Each control first proves the thing it breaks is there and refuses with
   exit 2 when it is not, so a control that changed nothing can never read as
   one that fired. A control run plays no seasons (sections 2 to 5 and 8),
   so it takes seconds, not the eight minutes of a full run.
     dropman   one real man is missing from the year zero world this harness
               is handed: section 1's "differ from the real data" and its
               count against the real data must both fail.
     unflag    one made up man of the 2031 world loses his MADE UP flag:
               section 6's "not in the real data and are not flagged as made
               up" must fail, on exactly one man.
     twoclubs  (fix pass) the join fails to move one man: the first man a
               newer squad list took out of a club of the bake is back at
               that club as well, in the one world object the engine and
               this harness both read, before anything reads it. Section
               1's "at a club of the bake and at a club outside it at once"
               must fail, and it is the only line of section 1 that can:
               the world still matches itself and the count still adds up,
               which is how the reviewer's mutation passed.
     champgap  (Release BC's join, the lead's AZ ruling 1) a gross gap in section
               5: in the ticking arm only, the strongest club of the league other
               than mine gets 10 more strength at the start of every season (the
               living world handing one rival a far better squad every summer).
               This control plays section 5 and nothing else of sections 2 to 5
               and 8, and must end with "CONTROL champgap FIRED", section 5's
               champion band red and no other section 5 line. */
const CONTROL = process.env.SIM_ERAS_CONTROL ?? '';
if (CONTROL && !['dropman', 'unflag', 'twoclubs', 'champgap'].includes(CONTROL)) { console.error(`unknown control ${CONTROL}`); process.exit(2); }
const controlRefuse = why => { console.error(`CONTROL ${CONTROL} did not apply: ${why}`); process.exit(2); };
const SKIPPED = '   (a control run plays no seasons: section skipped)';
let controlSaid = false;
let champGapFired = false;
let champGapVerdict = '';
if (CONTROL === 'twoclubs') {
  const outsideClubs = Object.keys(REAL).filter(c => !(c in BAKED));
  let hit = null;
  for (const club of Object.keys(BAKED)) {
    const here = new Set((REAL[club] ?? []).map(p => p.n));
    const gone = BAKED[club].find(p => !here.has(p.n) && outsideClubs.some(c => REAL[c].some(q => q.n === p.n)));
    if (gone) { hit = { club, n: gone.n, now: outsideClubs.find(c => REAL[c].some(q => q.n === gone.n)) }; break; }
  }
  if (!hit) controlRefuse('no man of the bake was moved to a club outside it, so there is nobody to keep twice');
  REAL[hit.club] = BAKED[hit.club];
  console.log(`   CONTROL twoclubs applied: ${hit.n} is at ${hit.club} again as well as at ${hit.now}, in the world the engine reads`);
}
const REAL_COUNT = Object.values(REAL).reduce((s, r) => s + r.length, 0);
/** The projected world of a year, as the sections that judge it read it:
 *  the engine's own, except for the one thing a control breaks. */
const worldAt = y => {
  const w = projectedWorld(y);
  if (CONTROL === 'dropman' && y === 0) {
    const club = Object.keys(w).find(c => w[c].length > 1);
    if (!club) controlRefuse('no club at year zero holds two men');
    if (!controlSaid) console.log(`   CONTROL dropman applied: ${w[club][0].n} is missing from ${club} at year zero`);
    controlSaid = true;
    return { ...w, [club]: w[club].slice(1) };
  }
  if (CONTROL === 'unflag' && y === 5) {
    const club = Object.keys(w).find(c => w[c].some(p => p.g));
    if (!club) controlRefuse('the 2031 world holds no made up player to take the flag from');
    const i = w[club].findIndex(p => p.g);
    if (!controlSaid) console.log(`   CONTROL unflag applied: ${w[club][i].n} of ${club}, made up, carries no flag in the 2031 world`);
    controlSaid = true;
    return { ...w, [club]: w[club].map((p, j) => (j === i ? { ...p, g: undefined } : p)) };
  }
  return w;
};

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
  /* Round 1304: compared with REAL, the joined world the game reads, club by
     club and row by row. A club of another length counts once and its rows
     are not counted, so one missing man fails this line and the count
     below, as it always did. */
  const world0 = worldAt(0);
  const clubs = Object.keys(REAL);
  let players = 0;
  let mismatch = 0;
  for (const club of clubs) {
    const real = REAL[club];
    const proj = world0[club];
    if (!proj || proj.length !== real.length) { mismatch += 1; continue; }
    for (let i = 0; i < real.length; i++) {
      players += 1;
      const b = real[i];
      const p = proj[i];
      if (p.n !== b.n || p.p !== b.p || p.a !== b.a || p.r !== b.r || p.v !== b.v || p.g) mismatch += 1;
    }
  }
  const stray = Object.keys(world0).filter(c => !(c in REAL));
  if (stray.length) fail(`year zero holds ${stray.length} clubs the real data does not: ${stray.slice(0, 4).join(', ')}`);
  console.log(`   ${clubs.length} clubs, ${players} players compared field by field against the real data`);
  if (mismatch) fail(`${mismatch} projected players at year zero differ from the real data`);

  /* THE JOIN'S OWN ACCOUNTING, read from the files and never off the join,
     so "the real data" cannot quietly become whatever the join says it is.
     Every club of the bake is in the world with its rows in the bake's
     order, less only the men a newer squad list moved; a moved man is at
     exactly one club the bake does not hold (moved, never deleted); and the
     clubs the bake does not hold carry as many men as the generated leagues
     say they ship (CM_GENERATED_LEAGUES, each file's own count). A league
     that joins later is counted through that list with no edit here. */
  const same = (a, b) => a.n === b.n && a.p === b.p && a.a === b.a && a.r === b.r && a.v === b.v;
  const moved = [];
  for (const club of Object.keys(BAKED)) {
    const inWorld = REAL[club];
    if (!inWorld) { fail(`${club} is in the bake and not in the world`); continue; }
    const names = new Set(inWorld.map(p => p.n));
    const kept = BAKED[club].filter(p => names.has(p.n));
    for (const p of BAKED[club]) if (!names.has(p.n)) moved.push({ club, n: p.n });
    if (kept.length !== inWorld.length || kept.some((p, i) => !same(p, inWorld[i]))) fail(`${club} in the world is not the bake's ${club} less the men who moved`);
  }
  const outside = Object.keys(REAL).filter(c => !(c in BAKED));
  for (const m of moved) {
    const at = outside.filter(c => REAL[c].some(p => p.n === m.n));
    if (at.length !== 1) fail(`${m.n} left the bake's ${m.club} and is at ${at.length} clubs outside the bake; a man the join moves is at exactly one`);
  }
  /* Fix pass: and nobody is at a club of the bake AND at a club outside it.
     A man the join failed to move passes every line above (he is not
     "moved", his club is the bake's club whole, and one man too many is in
     both sides of every count), so this is asked by name. Two different men
     who share a name across the two halves would need a pin here, with two
     sources, in the round that brings the second; there is none today. */
  const outsideAt = new Map(outside.flatMap(c => REAL[c].map(p => [p.n, c])));
  const twice = Object.keys(BAKED).flatMap(club => (REAL[club] ?? []).filter(p => outsideAt.has(p.n)).map(p => `${p.n} (${club} and ${outsideAt.get(p.n)})`));
  if (twice.length) fail(`${twice.length} men are at a club of the bake and at a club outside it at once: ${twice.slice(0, 4).join('; ')}; a man a newer squad list holds is moved, never kept twice`);
  const outsideMen = outside.reduce((s, c) => s + REAL[c].length, 0);
  const leagues = WORLD.CM_GENERATED_LEAGUES;
  const shipped = leagues.reduce((s, g) => s + g.players, 0);
  if (outsideMen !== shipped) fail(`the ${outside.length} clubs the bake does not hold carry ${outsideMen} men, the generated leagues say they ship ${shipped}`);
  const bakeCount = Object.values(BAKED).reduce((s, r) => s + r.length, 0);
  if (bakeCount !== DATA.CM_ROSTER_META.players) fail(`the bake holds ${bakeCount} men and says ${DATA.CM_ROSTER_META.players}`);
  const realPlayers = DATA.CM_ROSTER_META.players - moved.length + shipped;
  console.log(`   the real data: the bake's ${DATA.CM_ROSTER_META.players}, less ${moved.length} moved by a newer squad list (${moved.map(m => `${m.n} from ${m.club}`).join(', ') || 'nobody'}), plus ${shipped} in ${leagues.length} generated leagues (${leagues.map(g => `${g.label} ${g.players}`).join(', ')}) = ${realPlayers}`);
  if (REAL_COUNT !== realPlayers) fail(`the joined world holds ${REAL_COUNT} men, its sources add up to ${realPlayers}`);
  if (players !== realPlayers) {
    fail(`projected ${players} players at year zero, the real data says ${realPlayers}`);
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
if (CONTROL) console.log(SKIPPED); else {
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
if (CONTROL) console.log(SKIPPED); else {
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
if (CONTROL) console.log(SKIPPED); else {
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
    /* Round 1304: read off the joined world and its joined partial list (the
       world, not the bake, is what a projection starts from). The bake is
       712 men short of the world, so 98 percent of the bake let the world
       lose about 800 men unnoticed; it is 98 percent of the world now. */
    const bakedEmpty = Object.entries(REAL).filter(([, r]) => r.length === 0).map(([c]) => c);
    const undisclosed = bakedEmpty.filter(c => !WORLD.CM_WORLD_PARTIAL.includes(c));
    if (undisclosed.length) fail(`empty clubs not disclosed in CM_PARTIAL: ${undisclosed.join(', ')}`);
    if (empty > bakedEmpty.length) fail(`${empty} clubs have no players at all at +${y} years, but only ${bakedEmpty.length} baked empty: somebody new ran dry`);
    if (all.length < REAL_COUNT * 0.98) fail(`the world lost players by +${y} years (${all.length})`);
    if (mean(all.map(p => p.a)) > 27.5) fail(`the whole world averages ${fx(mean(all.map(p => p.a)), 1)} years old at +${y}`);
    /* The anchor is the measured year-zero mean club XI of the CURRENT
       world and moves when the world's composition does. 74.1 was the
       272-club world; Round 177 added Austria and Greece, 24 clubs whose
       thin tails run youth-padded, and the measured mean settled at 71.6.
       The check still catches what it exists to catch: the PROJECTION
       drifting away from year zero across the three horizons. */
    if (Math.abs(mean(xis) - 71.6) > 2.5) fail(`club strength drifted to ${fx(mean(xis), 1)} at +${y} years, it starts at 71.6`);
    // The pecking order itself, not just the average.
    const strong = projectedXIAvg('Real Madrid', y);
    const weak = projectedXIAvg('Lincoln City', y);
    if (!(strong > weak + 15)) fail(`Real Madrid (${strong}) is no longer far stronger than Lincoln City (${weak}) at +${y}`);
  }
}

/* ================================================================== */
console.log('5) Balance did not move: ticking clock against a frozen one');
/* ================================================================== */
if (CONTROL && CONTROL !== 'champgap') console.log(SKIPPED); else {
  /* The do nothing arm pins the world year back to the roster year at every
     rollover, so yearsOn stays zero and every AI club, the whole transfer
     market and every opponent squad behave exactly as they did before this
     round. Same seeds, same club, same number of seasons, so anything that
     moves between the arms is the clock and not the dice. */
  const RUNS = 40;
  const SEASONS = 12;
  /* The champion's band, set by Release BC's join under the lead's AZ ruling 1 (never by feel). Release AZ's world
     seed (Round 1250) makes the ticking arm's champion about 1.3 points stronger on every seed base (fix2-AZ.md
     section 3), so the old band of 4 sat about one standard error over the expected seeded gap and was a coin toss.
     Measured on the merged tree (AZ with Round 1311 and the rest of main, d84d8328), runner result rBCg-m1e,
     section 5's own loop (.tmp-fx eras5probe, 40 careers x 12 seasons an arm, Everton) at ten seed bases:
       9000 3.95 | 19000 3.35 | 29000 3.98 | 39000 2.81 | 49000 3.67 | 59000 2.82 | 69000 2.52 | 79000 2.83 |
       89000 3.46 | 99000 2.42 (the frozen arm 81.16 to 82.24 at every base).
     Mean 3.18, per seed standard deviation 0.58 (n minus 1), so mean plus three sd is 4.91, rounded up to 5.0.
     The base this file plays (9000) reads 3.95. Control champgap must land clearly outside it. */
  const CHAMP_BAND = 5.0;
  const arms = {};
  /* Control champgap (see the controls block): the ticking arm's strongest rival gets 10 more strength at the
     start of every season. It refuses (exit 2) on a save with no rival strength to raise. */
  let champGapRaised = 0;
  const champGap = st => {
    const inLeague = new Set((st.table ?? []).map(r => r.club));
    const rivals = Object.entries(st.clubStrengths ?? {}).filter(([club]) => club !== st.clubName && (!inLeague.size || inLeague.has(club)));
    if (!rivals.length) controlRefuse('the save has no rival club strength in its league to raise');
    const [top, value] = rivals.reduce((a, b) => (b[1] > a[1] ? b : a));
    champGapRaised += 1;
    return { ...st, clubStrengths: { ...st.clubStrengths, [top]: value + 10 } };
  };
  for (const frozen of [true, false]) {
    const gpg = [];
    const champPts = [];
    const myPts = [];
    const myPos = [];
    for (let run = 0; run < RUNS; run++) {
      setSeed(9000 + run);
      let s = startCareer('Everton');
      for (let y = 0; y < SEASONS; y++) {
        if (CONTROL === 'champgap' && !frozen) s = champGap(s);
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
  const champGapNow = Math.abs(t.champPts - f.champPts);
  const champBandRed = champGapNow > CHAMP_BAND;
  if (champBandRed) fail(`the champion's points moved by ${fx(champGapNow, 1)} (band ${fx(CHAMP_BAND, 1)})`);
  if (Math.abs(t.myPts - f.myPts) > 7) fail(`my points moved by ${fx(Math.abs(t.myPts - f.myPts), 1)}`);
  if (Math.abs(t.myPos - f.myPos) > 2.5) fail(`my finishing position moved by ${fx(Math.abs(t.myPos - f.myPos), 1)}`);
  // And the absolute numbers still have to look like football, because two
  // arms agreeing on nonsense is still nonsense.
  let notFootball = 0;
  for (const [name, a] of Object.entries(arms)) {
    if (a.gpg < 2 || a.gpg > 3.6) { notFootball += 1; fail(`${name}: ${fx(a.gpg)} goals a game is not football`); }
    if (a.champPts < 60 || a.champPts > 105) { notFootball += 1; fail(`${name}: a champion on ${fx(a.champPts, 1)} points is not football`); }
  }
  if (CONTROL === 'champgap') {
    champGapFired = champBandRed && notFootball === 0 && champGapRaised === RUNS * SEASONS;
    champGapVerdict = champGapFired
      ? `CONTROL champgap FIRED: ${champGapRaised} seasons raised, the champion's gap ${fx(champGapNow, 1)} against the band of ${fx(CHAMP_BAND, 1)}, still football`
      : `CONTROL champgap DID NOT FIRE: band red ${champBandRed}, not football ${notFootball}, seasons raised ${champGapRaised} of ${RUNS * SEASONS}`;
    console.log(`   ${champGapVerdict}`);
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
  /* Round 1304: the real names are the joined world's. Read off the bake
     alone, every surviving man of the generated leagues counted as "not in
     the real data" (189 of them on 2026-10-11, all real). */
  const realNames = new Set(Object.values(REAL).flat().map(p => p.n));
  for (const y of [5, 10, 20]) {
    for (const p of Object.values(worldAt(y)).flat()) {
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
    'src/pages/ClubManager.tsx': ['REAL DATA', 'PROJECTION', 'No future eras'],
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
     from quietly adding one back. It is ABSOLUTE.

     A PAST era exists ONLY with a real historical bake behind it. Round 146
     landed the first one (era2010, from clubManagerEra2010.ts), exactly the
     way this comment always said it would arrive: baked real data with its
     own harness (simEra2010.mjs). startYear < CM_BASE_YEAR is now a failure
     ONLY for an era with no bake in HISTORIC_ROSTERS, because that era would
     be invented squads wearing real badges. */
  for (const e of CM_ERAS) {
    if (e.startYear > CM_BASE_YEAR) fail(`era ${e.label} starts in the FUTURE, which the owner removed on 2026-08-16`);
    if (e.startYear < CM_BASE_YEAR && !isHistoricEra(e.id)) {
      fail(`era ${e.label} is BEFORE the roster year with NO historical bake behind it`);
    }
    if (isHistoricEra(e.id)) {
      const world = HISTORIC_ROSTERS[e.id] ?? {};
      const clubs = Object.keys(world).length;
      const players = Object.values(world).reduce((s, r) => s + r.length, 0);
      console.log(`   ${e.label}: historical bake, ${players} real players across ${clubs} clubs`);
      if (clubs < 30) fail(`historic era ${e.label} bake holds only ${clubs} clubs`);
      if (players < 500) fail(`historic era ${e.label} bake holds only ${players} players`);
    }
  }

  const historicCount = CM_ERAS.filter(e => isHistoricEra(e.id)).length;
  if (CM_ERAS.length !== 1 + historicCount) {
    fail(`${CM_ERAS.length} eras on the menu but only ${historicCount} historical bakes plus today; something is offered without data`);
  }
  /* Round 971: the fourth past season, 2020-21, the five year step. The menu
     is today then the pasts newest first, and the newest is a whole big five. */
  const menu = CM_ERAS.map(e => e.id).join(',');
  if (menu !== 'now,era2020,era2015,era2010,era2005') fail(`the era menu reads ${menu}`);
  const w20 = HISTORIC_ROSTERS.era2020 ?? {};
  if (Object.keys(w20).length !== 98) fail(`the 2020-21 bake holds ${Object.keys(w20).length} clubs, the big five of that season is 98`);
  if (!/Premier League, La Liga, Serie A, Bundesliga and Ligue 1/.test(eraById('era2020').honesty)) fail('the 2020-21 honesty line does not name the five leagues');
  if (eraById(DEFAULT_ERA_ID).startYear !== CM_BASE_YEAR) fail('the default era is not the real data');
  if (eraById('nonsense-id').id !== CM_ERAS[0].id) fail('an unknown era id does not fall back to the real one');
  // Round 132 saves may still carry the removed era ids. They must not crash,
  // they must land on the real era.
  for (const legacy of ['plus5', 'plus10', 'plus15']) {
    if (eraById(legacy).id !== CM_ERAS[0].id) fail(`removed era id ${legacy} does not fall back to the real one, old saves would break`);
  }

  for (const e of CM_ERAS) {
    const label = eraRealShareLabel(e);
    const line = eraHonestyLine(e);
    console.log(`   ${e.label}  ${label}  |  ${line.slice(0, 90)}...`);
    if (!label || !line) fail(`era ${e.label} has no honesty copy`);
    if (!/real/i.test(line)) fail(`era ${e.label} does not say it is real data`);
  }

  clearSeed();
  const e = CM_ERAS[0];
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
if (CONTROL) console.log(SKIPPED); else {
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
    'src/components/club-manager/ClubManagerHelp.tsx',
    'src/components/club-manager/ClubManagerSeasonSummary.tsx', 'src/components/club-manager/ClubManagerCareerPanel.tsx', 'src/components/club-manager/ClubManagerBoardPanel.tsx', 'src/components/club-manager/ClubManagerTreatmentPanel.tsx',
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
if (CONTROL === 'champgap') { console.log(champGapVerdict || 'CONTROL champgap DID NOT FIRE: section 5 never judged it'); process.exit(champGapFired ? 1 : 3); }
process.exit(failures === 0 ? 0 : 1);
