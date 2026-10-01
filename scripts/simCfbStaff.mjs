/* Round 728: CFB Dynasty's program layer. Coordinators, rivalry week and
   strength of schedule, held to what the rules text promises.

   The shared module is src/lib/collegeProgram.ts; CFB binds it in
   src/lib/cfbDynasty.ts. What this harness proves, section by section:

     1) the bound: a coordinator moves his unit by at most 3 rating points
        either way for ANY rating (0 to 150 probed, not just the 45 to 95 the
        generator makes), the edge never falls as the rating rises, and every
        unit in a live league sits inside it (hard). And where the sim reads
        it: cfbWinProb reads cfbStrength, and for every team and every rating
        pair (plus both chairs vacant) the staff moves cfbStrength by exactly
        half the two unit edges the Roster tab shows, never past the bound
        (hard). Before the review of this round only cfbUnits (display) was
        checked, and the harness stayed green with coordinators taken out of
        the win model or doubled in it;
     2) offense: over SEEDS seeds a better offensive coordinator scores more.
        Common random numbers: the same seed, the same draws, only his rating
        moves, so points per game may never fall as the rating rises on ANY
        seed (hard), each step of the mean must rise by at least STEP_FLOOR,
        the 45-to-95 uplift must sit inside its measured band, and in a game
        whose result did not flip he never moved the score by more than the
        cap of CFB_POINTS_PER_EDGE per point of edge (hard). The same draws
        mean a better coordinator can only turn a loss into a win, so wins
        may never fall as the rating rises on any seed (hard), and the wins a
        season a 95 adds over a 45 must sit in WIN_BAND. That band, not the
        points band, is what fences the win model: about 9 of the 10.8
        points are the pure score shift, so the points band cannot tell a
        coordinator who decides games from one who only pads the score;
     3) defense: the same for the defensive coordinator and points allowed;
     4) a ten season dynasty over DYN_SEEDS seeds, with a greedy player who
        signs recruits first and then hires the best coordinator he can,
        completes: twelve games each, a twelve team field, a Heisman, rosters
        with their skill positions, every AI chair filled; and the budget is
        never negative after any step (hard), and a hire the pot cannot cover
        is refused with nothing changed (hard). The dynasties never walk
        anybody on payroll, so the walk is provoked twice: the thinnest
        budget on the board (UNLV, no wins, a heavy rivalry loss) against two
        95s through the real offseason, and chargePayroll over every budget
        from -5 to 40 and every pair of chairs (all hard);
     5) rivalry week: every school has exactly one rival; an in-state pair
        shares a state in src/data/colleges.ts, the audited college table;
        every other pair is marked generated; every swing sits inside its
        stated range with the right sign, the morale reaches the team's
        strength, and the next budget carries the recruiting swing exactly
        (all hard). Rivalry week takes a league game off anyone whose rival is
        in another conference, so the conference table goes by winning
        percentage: nobody left out of a title game may hold a better
        conference percentage than one let in (hard);
     6) strength of schedule: the engine's number equals the average strength
        of the opponents in the game log for every team after every season, so
        a team that played stronger opponents shows the higher number (hard);
        a constructed pair with the same record ranks the tougher schedule
        first (hard); and how often it changed a Playoff field is printed;
     7) old saves: a pre-728 save plays exactly as it did. scripts/lib/
        cfbLegacyDigest.mjs walks five seeds through ten seasons on legacy
        states and must reproduce the digest the pre-728 engine produced
        (GOLDEN below, computed from origin/main at b04c7897 before any of this
        round's changes), and a legacy save upgraded at its offseason then
        completes nine more seasons with the layer on;
     8) the board, under vitest: src/components/cfb-dynasty/
        CfbDynastyDepth.test.tsx (an old save loads and plays, a new dynasty
        has its staff, the hiring window refuses what it cannot afford);
     9) league balance: AI staff are hired at each program's level, so the
        layer leans a little toward the strong. BAL_SEASONS seasons run on the
        legacy engine and with the layer on, same seeds, and the drift in the
        upset rate and in the weakest program's wins must sit in its band.

   MEASURED HEADROOM, written down before the bands were set (Round 728,
   2026-10-01, 300 seeds a batch, five batches at CFB_STAFF_SEED_BASE 0, 1000,
   2000, 3000 and 4000):
     offense, mean points scored per game at OC 45 / 70 / 95: 28.1 to 28.7 /
       33.6 to 34.0 / 39.0 to 39.5; the 45 to 95 uplift 10.70, 10.71, 10.88,
       10.91, 10.84; smallest step of the mean 1.06 to 1.09;
     defense, mean points allowed at DC 45 / 70 / 95: 25.7 to 26.4 / 20.1 to
       21.0 / 14.9 to 15.7; the drop 10.66, 10.64, 10.71, 10.77, 10.80;
       smallest step 1.06 to 1.16;
     seeds where a better coordinator made his unit worse: 0 in all ten runs;
     cap breaks: 0 in all ten runs (17 before the scoring fix in this round);
     the schedule changed the Playoff field in 23 of the 200 dynasty seasons
       (those seeds do not move with the seed base).
   Bands: uplift and drop inside [8.5, 13.5] (about 2.1 below and 2.6 above
   the measured spread of 0.27), every step at least STEP_FLOOR 0.5, and the
   schedule must decide at least FIELDS_FLOOR 5 fields in 200 seasons. The
   bound itself is the hard cap in sections 1 and 2, not these bands: about
   9 of the 10.8 points is the coordinator's shift (1.5 a point of edge times
   6 points of edge), the rest is games his edge turned from losses to wins.

   Added after the review (2026-10-01, the same five seed bases, with the
   conference table on winning percentage):
     wins a season a 95 adds over a 45, offense 0.887, 0.893, 0.987, 0.987,
       0.967; defense 0.930, 0.923, 0.957, 0.980, 1.010 (spread 0.12). With
       coordinators out of the win model it is exactly 0 (same draws), and
       with their effect doubled 1.63 and 1.65. WIN_BAND [0.6, 1.3], about
       0.29 either side of the measured range, so a half or a double
       strength effect fails;
     league balance, 600 seasons a base, layer minus legacy: upset rate
       -1.93, -1.90, -2.03, -1.53, -2.01 points (spread 0.50), UNLV regular
       season wins -0.41, -0.37, -0.35, -0.24, -0.35 (spread 0.17); top six
       prestige programs' title share 91.5 to 93.2% legacy and 91.8 to 94.7%
       with the layer (printed, too few titles to band). UPSET_DRIFT_BAND
       [-3.5, -0.5] and WEAK_DRIFT_BAND [-0.8, 0.1];
     provoked payroll walk: someone walked in 4 of 10 seeds (a 95 is
       sometimes poached first); conference seasons with uneven league game
       counts 990 of 1000, title games the percentage rule picked differently
       from raw wins 13 of 1000, playoff fields the schedule changed 22 of
       200.

   Negative controls (house rule: prove each check can fail). Each patches the
   BUNDLE, never the source, and refuses to run unless its target string is
   in the bundle exactly once:
     CFB_STAFF_CONTROL=unbounded  the edge loses its clamp       -> 1 red
     CFB_STAFF_CONTROL=inverted   a better rating is worse        -> 1, 2, 3 red
     CFB_STAFF_CONTROL=overspend  hiring stops checking the pot   -> 4 red
     CFB_STAFF_CONTROL=swing      a blowout swings past the cap   -> 5 red
     CFB_STAFF_CONTROL=sos        the log records the wrong team  -> 6 red
     CFB_STAFF_CONTROL=rank       the ranking ignores the schedule-> 6 red
     CFB_STAFF_CONTROL=legacy     rivalry week leaks into old saves -> 7 red
     CFB_STAFF_CONTROL=nostaff    coordinators leave the win model -> 1, 2, 3 red
     CFB_STAFF_CONTROL=doubled    their effect on it doubles       -> 1, 2, 3 red
     CFB_STAFF_CONTROL=nowalk     payroll never makes anyone walk  -> 4 red
     CFB_STAFF_CONTROL=confraw    the table goes back to raw wins  -> 5 red

   Run: node scripts/simCfbStaff.mjs
*/
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { legacyScenario } from './lib/cfbLegacyDigest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.CFB_STAFF_CONTROL || '';
const SEED_BASE = Number(process.env.CFB_STAFF_SEED_BASE || 0);
const GOLDEN = '58ee7ea0fd820e94c655378833b5590eb539cb235856f6ff10456c410c657569';

const SEEDS = 300;
const DYN_SEEDS = 20;
const DYN_SEASONS = 10;
const LEVELS = [45, 55, 65, 70, 75, 85, 95];
const STEP_FLOOR = 0.5;
const UPLIFT_BAND = [8.5, 13.5];
const WIN_BAND = [0.6, 1.3];
const FIELDS_FLOOR = 5;
const BAL_SEASONS = 600;
const UPSET_DRIFT_BAND = [-3.5, -0.5];
const WEAK_DRIFT_BAND = [-0.8, 0.1];

/* Each control: the exact bundled text it rewrites and what it becomes. */
const CONTROLS = {
  unbounded: ['return Math.max(-STAFF_UNIT_EDGE_MAX, Math.min(STAFF_UNIT_EDGE_MAX, raw));', 'return raw;'],
  inverted: ['const raw = (rating - STAFF_NEUTRAL) * STAFF_EDGE_PER_POINT;', 'const raw = (STAFF_NEUTRAL - rating) * STAFF_EDGE_PER_POINT;'],
  overspend: ['if (net > holder.nil) return false;', ''],
  swing: ['const share = Math.min(1, Math.max(0, margin) / fullMargin);', 'const share = Math.max(0, margin) / fullMargin;'],
  sos: ['(home.opps ??= []).push(g.away);', '(home.opps ??= []).push(g.home);'],
  rank: ['(strengthOfSchedule(t.opps, (oid) => str.get(oid) ?? 60) ?? str.get(t.id)) + str.get(t.id)', 'str.get(t.id) + str.get(t.id)'],
  legacy: ['if (st.depth && st.round === CFB_RIVALRY_ROUND) {', 'if (st.round === CFB_RIVALRY_ROUND) {'],
  nostaff: ['const staffPart = staff ? (staff.off + staff.def) / 2 : 0;', 'const staffPart = 0;'],
  doubled: ['const staffPart = staff ? (staff.off + staff.def) / 2 : 0;', 'const staffPart = staff ? staff.off + staff.def : 0;'],
  nowalk: ['while (staffPayroll(staff) > pot) {', 'while (false) {'],
  confraw: ['pct(b) - pct(a) || b.confWins - a.confWins', 'b.confWins - a.confWins'],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`CFB_STAFF_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ---- bundle the engine, the shared module and the college table ---- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `cfbStaff-${process.pid}-`));
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(ENTRY, `
export * as cfb from '${ROOT_URL}/src/lib/cfbDynasty.ts';
export * as prog from '${ROOT_URL}/src/lib/collegeProgram.ts';
export { colleges } from '${ROOT_URL}/src/data/colleges.ts';
`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error', alias: { '@': `${ROOT_URL}/src` } });
if (CONTROL) {
  const [from, to] = CONTROLS[CONTROL];
  const text = fs.readFileSync(BUNDLE, 'utf8');
  const hits = text.split(from).length - 1;
  if (hits !== 1) { console.error(`control cannot run: "${from}" is in the bundle ${hits} times, not once`); process.exit(1); }
  fs.writeFileSync(BUNDLE, text.replace(from, to));
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}`);
}
const { cfb, prog, colleges } = await import(pathToFileURL(BUNDLE).href);
const { CFB_SCHOOLS, CFB_SCHOOL_MAP, CFB_ROUNDS, CFB_RIVALRY_ROUND, CFB_POINTS_PER_EDGE } = cfb;
const { STAFF_UNIT_EDGE_MAX, RIVAL_MORALE_MIN, RIVAL_MORALE_MAX, RIVAL_RECRUIT_MIN, RIVAL_RECRUIT_MAX } = prog;

function lehmer(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const MY = 'PSU'; // a top-twelve program, so its games carry both outcomes

console.log('1) the bound: a coordinator moves his unit at most 3 points, for any rating');
{
  let over = 0; let falls = 0; let prev = -Infinity;
  for (let r = 0; r <= 150; r += 1) {
    const e = prog.coordinatorEdge(r);
    if (Math.abs(e) > STAFF_UNIT_EDGE_MAX + 1e-9) over += 1;
    if (e < prev - 1e-12) falls += 1;
    prev = e;
  }
  if (over) fail(`${over} ratings between 0 and 150 move a unit by more than ${STAFF_UNIT_EDGE_MAX}`);
  if (falls) fail(`the edge falls ${falls} times as the rating rises`);
  const e0 = prog.staffEdges(undefined);
  if (e0.off !== 0 || e0.def !== 0) fail('a program with no staff object (an old save) gets a staff effect');
  const st = cfb.initCfb(MY, lehmer(5), { depth: true });
  let unitsOver = 0;
  for (const t of Object.values(st.teams)) {
    const u = cfb.cfbUnits(t);
    if (Math.abs(u.offEdge) > STAFF_UNIT_EDGE_MAX + 1e-9 || Math.abs(u.defEdge) > STAFF_UNIT_EDGE_MAX + 1e-9) unitsOver += 1;
    if (!t.staff?.OC || !t.staff?.DC) fail(`${t.id} starts a new dynasty without both coordinators`);
  }
  if (unitsOver) fail(`${unitsOver} units in a live league sit past the bound`);
  /* The bound where the sim reads it. cfbWinProb reads cfbStrength, not
     cfbUnits (that one only feeds the Roster tab), so this is the check that
     says coordinators really decide games and by how much: each unit is about
     half the team, so a pair moves the team by (offEdge + defEdge) / 2 of
     the edges the Roster tab shows, and never by more than
     STAFF_UNIT_EDGE_MAX. Every team in a live league, every rating pair from
     0 to 150 in steps of 5, both vacant chairs, morale held at 0, against the
     same team with no staff and no morale at all (an old save). */
  let strMiss = 0; let strOver = 0; let firstStr = null; let probes = 0;
  for (const t of Object.values(st.teams)) {
    const bare = cfb.cfbStrength({ ...t, staff: undefined, morale: undefined });
    const pairs = [{ OC: null, DC: null }];
    for (let oc = 0; oc <= 150; oc += 5) for (let dc = 0; dc <= 150; dc += 5) {
      pairs.push({ OC: { ...t.staff.OC, rating: oc }, DC: { ...t.staff.DC, rating: dc } });
    }
    for (const staff of pairs) {
      const withStaff = { ...t, staff, morale: 0 };
      const u = cfb.cfbUnits(withStaff);
      const d = cfb.cfbStrength(withStaff) - bare;
      const want = (u.offEdge + u.defEdge) / 2;
      probes += 1;
      if (Math.abs(d - want) > 1e-9) {
        strMiss += 1;
        if (!firstStr) firstStr = `${t.id} OC ${staff.OC?.rating ?? 'vacant'} DC ${staff.DC?.rating ?? 'vacant'}: strength moved ${d.toFixed(3)}, unit edges say ${want.toFixed(3)}`;
      }
      if (Math.abs(d) > STAFF_UNIT_EDGE_MAX + 1e-9) strOver += 1;
    }
  }
  console.log(`   team strength, what the win model reads: ${probes} staff pairs probed, off the unit edges ${strMiss}, past the bound ${strOver}; a 95 pair moves it ${(cfb.cfbStrength({ ...st.teams[MY], staff: { OC: { ...st.teams[MY].staff.OC, rating: 95 }, DC: { ...st.teams[MY].staff.DC, rating: 95 } }, morale: 0 }) - cfb.cfbStrength({ ...st.teams[MY], staff: undefined, morale: undefined })).toFixed(2)}`);
  if (strMiss) fail(`${strMiss} staff pairs move team strength (what cfbWinProb reads) by something other than half the two unit edges, first: ${firstStr}`);
  if (strOver) fail(`${strOver} staff pairs move team strength past ${STAFF_UNIT_EDGE_MAX}`);
  const sal = [45, 70, 95].map(prog.coordinatorSalary);
  console.log(`   edge at 0/45/70/95/150: ${[0, 45, 70, 95, 150].map(r => prog.coordinatorEdge(r).toFixed(2)).join(' / ')}; salary at 45/70/95: ${sal.join(' / ')}`);
}

/* One regular season with my coordinator in `role` set to `rating`, the rest
   of the league untouched. Returns my per game record. */
function seasonWith(seed, role, rating) {
  const rng = lehmer(SEED_BASE + seed * 7919 + 13);
  const st = cfb.initCfb(MY, rng, { depth: true });
  st.teams[MY].staff[role] = { ...st.teams[MY].staff[role], rating };
  const games = [];
  for (let r = 1; r <= CFB_ROUNDS; r += 1) {
    const { myGame } = cfb.simCfbRound(st, rng);
    const home = myGame.home === MY;
    games.push({ us: home ? myGame.hs : myGame.as, them: home ? myGame.as : myGame.hs, won: myGame.winner === MY });
    if (r < CFB_ROUNDS) st.round += 1;
  }
  return games;
}

function unitSection(role, label, pick, better) {
  const perLevel = LEVELS.map(() => []);
  const winsLevel = LEVELS.map(() => []);
  let seedViolations = 0; let winViolations = 0; let capBreaks = 0; let firstCap = null; let flips = 0; let same = 0;
  const neutralIdx = LEVELS.indexOf(70);
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    const runs = LEVELS.map(L => seasonWith(seed, role, L));
    const per = runs.map(g => mean(g.map(pick)));
    per.forEach((v, i) => perLevel[i].push(v));
    for (let i = 1; i < per.length; i += 1) if (better(per[i - 1], per[i]) < -1e-9) seedViolations += 1;
    /* Wins, the thing the win model decides. Same seed, same draws, so a
       better coordinator can only turn a loss into a win, never the reverse. */
    const wins = runs.map(g => g.filter(x => x.won).length);
    wins.forEach((v, i) => winsLevel[i].push(v));
    for (let i = 1; i < wins.length; i += 1) if (wins[i] < wins[i - 1]) winViolations += 1;
    for (let i = 0; i < LEVELS.length; i += 1) {
      if (i === neutralIdx) continue;
      const cap = Math.ceil(CFB_POINTS_PER_EDGE * Math.abs(prog.coordinatorEdge(LEVELS[i]) - prog.coordinatorEdge(70)) - 1e-9);
      runs[i].forEach((g, k) => {
        const n = runs[neutralIdx][k];
        if (g.won !== n.won) { flips += 1; return; }
        same += 1;
        const d = Math.abs(pick(g) - pick(n));
        if (d > cap) { capBreaks += 1; if (!firstCap) firstCap = `seed ${seed} rating ${LEVELS[i]} game ${k + 1}: moved ${d}, cap ${cap}`; }
      });
    }
  }
  const means = perLevel.map(mean);
  const steps = means.slice(1).map((m, i) => better(means[i], m));
  const uplift = better(means[0], means[means.length - 1]);
  const winGain = mean(winsLevel[winsLevel.length - 1]) - mean(winsLevel[0]);
  console.log(`   ${label} per game at ${LEVELS.join('/')}: ${means.map(m => m.toFixed(2)).join(' / ')}`);
  console.log(`   45 to 95 ${role === 'OC' ? 'uplift' : 'drop'} ${uplift.toFixed(2)}, smallest step ${Math.min(...steps).toFixed(2)}, seeds that went the wrong way ${seedViolations}, games compared ${same} (+${flips} that flipped), cap breaks ${capBreaks}`);
  console.log(`   wins a season at 45/95: ${mean(winsLevel[0]).toFixed(3)} / ${mean(winsLevel[winsLevel.length - 1]).toFixed(3)}, gain ${winGain.toFixed(3)} (band ${WIN_BAND.join(' to ')}), seed steps that lost wins ${winViolations}`);
  if (seedViolations) fail(`${seedViolations} seed steps where a better ${role} made ${label} worse; with common random numbers that is never allowed`);
  if (winViolations) fail(`${winViolations} seed steps where a better ${role} won fewer games; with common random numbers that is never allowed`);
  if (winGain < WIN_BAND[0] || winGain > WIN_BAND[1]) fail(`a 95 ${role} instead of a 45 won ${winGain.toFixed(3)} more games a season, band ${WIN_BAND.join(' to ')}: the coordinator is not moving the win model by the stated amount`);
  if (Math.min(...steps) < STEP_FLOOR) fail(`a step of the ${role} ladder moved ${label} by only ${Math.min(...steps).toFixed(2)}, floor ${STEP_FLOOR}`);
  if (uplift < UPLIFT_BAND[0] || uplift > UPLIFT_BAND[1]) fail(`45 to 95 moved ${label} by ${uplift.toFixed(2)}, band ${UPLIFT_BAND.join(' to ')}`);
  if (capBreaks) fail(`${capBreaks} games where the ${role} moved the score past his cap, first: ${firstCap}`);
}

console.log(`2) offense: over ${SEEDS} seeds a better offensive coordinator scores more, never past his cap`);
unitSection('OC', 'points scored', g => g.us, (a, b) => b - a);

console.log(`3) defense: over ${SEEDS} seeds a better defensive coordinator allows less, never past his cap`);
unitSection('DC', 'points allowed', g => g.them, (a, b) => a - b);

/* ---- sections 4 to 6 share one set of ten season dynasties ---- */
const dyn = {
  seasons: 0, negatives: 0, firstNeg: null, refusals: 0, refusalBroke: 0, hires: 0, walked: 0,
  emptyHeisman: 0, badField: 0, badGames: 0, holes: 0, aiEmpty: 0,
  rivalryGames: 0, swingOut: 0, firstSwing: null, moraleMiss: 0, budgetMiss: 0, myRivalry: 0,
  sosChecked: 0, sosMiss: 0, firstSos: null, sosOrder: 0, fieldsChanged: 0,
  confSeasons: 0, confUneven: 0, confShut: 0, firstShut: null, confPctDecided: 0,
};

/* Rivalry week takes a league game off anyone whose rival is in another
   conference, so the title game race goes by conference winning percentage.
   Checked on the table the engine hands the postseason: nobody left out of
   the title game may have a strictly better conference percentage than one
   of the two let in. Also counted: how often the table had uneven game
   counts, and how often the percentage picked a different title game from
   raw conference wins (the case the rule exists for). */
const confPct = t => (t.confWins + t.confLosses ? t.confWins / (t.confWins + t.confLosses) : 0);
function checkConfRace(st) {
  for (const conf of cfb.CFB_CONFS) {
    const table = cfb.confStandings(st, conf);
    dyn.confSeasons += 1;
    if (new Set(table.map(t => t.confWins + t.confLosses)).size > 1) dyn.confUneven += 1;
    const worstIn = Math.min(confPct(table[0]), confPct(table[1]));
    const shut = table.slice(2).filter(t => confPct(t) > worstIn + 1e-9);
    if (shut.length) {
      dyn.confShut += 1;
      if (!dyn.firstShut) {
        const f = t => `${t.id} ${t.confWins}-${t.confLosses}`;
        dyn.firstShut = `season ${st.season} ${conf}: title game ${f(table[0])} vs ${f(table[1])}, left out ${shut.map(f).join(', ')}`;
      }
    }
    const raw = [...table].sort((a, b) => b.confWins - a.confWins || a.confLosses - b.confLosses || b.wins - a.wins || cfb.cfbStrength(b) - cfb.cfbStrength(a));
    if ([table[0].id, table[1].id].sort().join() !== [raw[0].id, raw[1].id].sort().join()) dyn.confPctDecided += 1;
  }
}
const checkNil = (st, where) => {
  if (!(st.nil >= 0)) { dyn.negatives += 1; if (!dyn.firstNeg) dyn.firstNeg = `${where}: nil ${st.nil}`; }
};

function playSeason(st, rng, gameLog) {
  for (let r = 1; r <= CFB_ROUNDS; r += 1) {
    const before = r === CFB_RIVALRY_ROUND ? new Map(Object.values(st.teams).map(t => [t.id, cfb.cfbStrength(t)])) : null;
    const { games } = cfb.simCfbRound(st, rng);
    for (const g of games) gameLog.push(g);
    if (before && st.depth) {
      for (const g of games.filter(x => x.rivalry)) {
        dyn.rivalryGames += 1;
        const w = st.teams[g.winner];
        const l = st.teams[g.winner === g.home ? g.away : g.home];
        const sw = prog.rivalrySwing(Math.abs(g.hs - g.as), cfb.CFB_RIVAL_FULL_MARGIN);
        const inRange = v => v >= RIVAL_MORALE_MIN - 1e-9 && v <= RIVAL_MORALE_MAX + 1e-9;
        if (!inRange(w.morale) || !inRange(-l.morale) || !(w.morale > 0) || !(l.morale < 0) || sw.recruit < RIVAL_RECRUIT_MIN || sw.recruit > RIVAL_RECRUIT_MAX) {
          dyn.swingOut += 1;
          if (!dyn.firstSwing) dyn.firstSwing = `${g.home} ${g.hs}-${g.as} ${g.away}: winner morale ${w.morale}, loser ${l.morale}, recruit ${sw.recruit}`;
        }
        for (const t of [w, l]) {
          if (Math.abs(cfb.cfbStrength(t) - before.get(t.id) - t.morale) > 1e-9) dyn.moraleMiss += 1;
        }
      }
    }
    if (r < CFB_ROUNDS) st.round += 1;
  }
  for (const t of Object.values(st.teams)) if (t.wins + t.losses !== CFB_ROUNDS) dyn.badGames += 1;
}

/* Strength of schedule against the game log, team by team. */
function checkSos(st, gameLog) {
  const str = id => cfb.cfbStrength(st.teams[id]);
  const fromLog = new Map();
  for (const g of gameLog) {
    for (const [me, opp] of [[g.home, g.away], [g.away, g.home]]) {
      if (!fromLog.has(me)) fromLog.set(me, []);
      fromLog.get(me).push(str(opp));
    }
  }
  const ids = Object.keys(st.teams);
  for (const id of ids) {
    dyn.sosChecked += 1;
    const want = mean(fromLog.get(id));
    const got = cfb.cfbSos(st, id);
    if (got === null || Math.abs(got - want) > 1e-9) { dyn.sosMiss += 1; if (!dyn.firstSos) dyn.firstSos = `${id}: engine ${got}, game log ${want}`; }
  }
  for (const a of ids) for (const b of ids) {
    if (mean(fromLog.get(a)) > mean(fromLog.get(b)) + 0.01 && !(cfb.cfbSos(st, a) > cfb.cfbSos(st, b))) dyn.sosOrder += 1;
  }
}

/* The greedy player: sign the class first, then try for the best coordinator in each chair. */
function offseason(st, rng) {
  const base = cfb.nilBudgetFor(CFB_SCHOOL_MAP.get(st.myTeam).prestige, st.teams[st.myTeam].wins);
  const rv = st.lastRivalry && st.lastRivalry.season === st.season ? st.lastRivalry : null;
  const notes = cfb.cfbOpenOffseason(st, rng);
  dyn.walked += notes.filter(n => n.includes('walked')).length;
  checkNil(st, `season ${st.season} window open`);
  if (st.depth) {
    if (rv) dyn.myRivalry += 1;
    const want = Math.max(0, base + (rv?.recruit ?? 0));
    if (st.staffWindow.budget !== want) { dyn.budgetMiss += 1; }
    if (st.nil !== Math.max(0, want - cfb.cfbPayroll(st)) && !notes.some(n => n.includes('walked'))) dyn.budgetMiss += 1;
    if (cfb.cfbOpenOffseason(st, rng).length !== 0) fail('the offseason opened twice for one season');
  }
  const cls = cfb.cfbRecruitClass(rng);
  const por = cfb.cfbPortalPool(rng);
  for (const r of [...por.slice(0, 3), ...cls]) { cfb.signRecruit(st, r, por.includes(r) ? 'SO' : 'FR', rng); checkNil(st, `season ${st.season} signing`); }
  if (st.depth) {
    for (const role of ['OC', 'DC']) {
      const best = st.staffWindow.market.filter(c => c.role === role).sort((a, b) => b.rating - a.rating)[0];
      const cur = st.teams[st.myTeam].staff[role];
      if (!best || (cur && cur.rating >= best.rating)) continue;
      const nilBefore = st.nil;
      const net = best.salary - (cur?.salary ?? 0);
      const ok = cfb.cfbHireCoordinator(st, best.id);
      if (ok) dyn.hires += 1;
      else { dyn.refusals += 1; if (st.nil !== nilBefore || net <= nilBefore) dyn.refusalBroke += 1; }
      checkNil(st, `season ${st.season} hiring ${role}`);
    }
  }
  cfb.cfbOffseason(st, rng);
  checkNil(st, `season ${st.season} offseason`);
}

function runDynasty(st, rng, seasons, tag) {
  for (let s = 1; s <= seasons; s += 1) {
    const gameLog = [];
    playSeason(st, rng, gameLog);
    if (st.depth) { checkSos(st, gameLog); checkConfRace(st); }
    const post = cfb.runCfbPostseason(st, rng);
    if (st.depth) {
      /* The field picked again off the same post title game table, once as
         the engine does it and once with the schedule taken out of the
         tiebreak. The first must reproduce the real field (or this
         measurement is measuring something else); the second says how often
         the schedule decided who got in. Playoff games do not touch the
         records, so the table after the postseason is the one it picked from. */
      const champs = new Set(post.ccgs.map(g => g.winner));
      const pick = state => {
        const ranked = cfb.cfbRankings(state).map(t => t.id);
        const atLarge = ranked.filter(id => !champs.has(id)).slice(0, 7);
        return ranked.filter(id => champs.has(id) || atLarge.includes(id)).slice(0, 12);
      };
      const again = pick(st);
      if (again.join() !== post.field.join()) fail(`season ${st.season}: picking the field again off the same table gave a different field`);
      const shadow = JSON.parse(JSON.stringify(st));
      for (const t of Object.values(shadow.teams)) t.opps = [];
      if ([...pick(shadow)].sort().join() !== [...post.field].sort().join()) dyn.fieldsChanged += 1;
    }
    if (post.field.length !== 12 || new Set(post.field).size !== 12) dyn.badField += 1;
    const race = cfb.heismanRace(st, rng);
    if (race.length === 0) dyn.emptyHeisman += 1;
    else st.heismanWinners = [...st.heismanWinners, race[0].name];
    st.natties.push({ season: st.season, team: post.champion });
    st.seasonsPlayed += 1;
    dyn.seasons += 1;
    offseason(st, rng);
    for (const t of Object.values(st.teams)) {
      if (t.id !== st.myTeam && ['QB', 'RB', 'WR'].some(p => !t.players.some(x => x.pos === p))) dyn.holes += 1;
      if (st.depth && t.id !== st.myTeam && (!t.staff?.OC || !t.staff?.DC)) dyn.aiEmpty += 1;
    }
  }
  if (st.seasonsPlayed < seasons) fail(`${tag}: only ${st.seasonsPlayed} seasons played`);
}

console.log(`4) ten season dynasties over ${DYN_SEEDS} seeds complete, and the budget never goes negative`);
{
  for (let seed = 1; seed <= DYN_SEEDS; seed += 1) {
    const rng = lehmer(seed * 104729 + 7);
    const myTeam = CFB_SCHOOLS[(seed * 7) % CFB_SCHOOLS.length].id;
    const st = cfb.initCfb(myTeam, rng, { depth: true });
    runDynasty(st, rng, DYN_SEASONS, `seed ${seed}`);
  }
  /* The refusal, provoked on purpose: a pot one point short of the cost. */
  const st = cfb.initCfb('UNLV', lehmer(99), { depth: true });
  for (let r = 1; r <= CFB_ROUNDS; r += 1) { cfb.simCfbRound(st, lehmer(r)); if (r < CFB_ROUNDS) st.round += 1; }
  cfb.cfbOpenOffseason(st, lehmer(3));
  /* An empty chair, so the hire costs his whole salary (at least 3). */
  st.teams.UNLV.staff.OC = null;
  const cand = [...st.staffWindow.market].filter(c => c.role === 'OC').sort((a, b) => b.salary - a.salary)[0];
  const net = cand.salary;
  st.nil = net - 1;
  const before = JSON.stringify(st.teams.UNLV.staff);
  const ok = cfb.cfbHireCoordinator(st, cand.id);
  console.log(`   provoked: a ${net} point hire on a ${net - 1} point pot was ${ok ? 'ALLOWED' : 'refused'}`);
  if (!(net >= 3)) fail(`the provoked refusal was not provoked: the hire cost ${net}`);
  if (ok || st.nil !== net - 1 || JSON.stringify(st.teams.UNLV.staff) !== before) fail(`a hire costing ${net} went through on a pot of ${net - 1}, or a refusal changed something`);
  if (ok) checkNil(st, 'provoked refusal');

  /* The payroll walk, provoked. The dynasties above never walk anyone (a
     budget clears its own program's payroll unless it is tiny), so without
     this the "never negative" check above says nothing about chargePayroll.
     The smallest budget on the board: UNLV with no wins, after a rivalry
     loss by 21 or more (the full 8 off), carrying two 95s. Ten seeds, since a
     95 can also be poached before payday; a poached chair is fine, the pot
     must still never go negative and must still cover whoever is left. */
  const unlv = CFB_SCHOOL_MAP.get('UNLV').prestige;
  const thin = Math.max(0, cfb.nilBudgetFor(unlv, 0) - RIVAL_RECRUIT_MAX);
  const pay95 = prog.coordinatorSalary(95);
  if (!(thin < 2 * pay95)) fail(`the provoked walk is not provoked: a budget of ${thin} covers two 95s at ${pay95}`);
  let walkCases = 0; let walkBroke = 0; let firstWalkBroke = null;
  for (let seed = 1; seed <= 10; seed += 1) {
    const s2 = cfb.initCfb('UNLV', lehmer(500 + seed), { depth: true });
    s2.teams.UNLV.wins = 0; s2.teams.UNLV.losses = CFB_ROUNDS;
    const rival = cfb.cfbRivalOf('UNLV').rival;
    s2.lastRivalry = { season: s2.season, opp: rival, us: 0, them: 28, won: false, kind: 'generated', morale: -RIVAL_MORALE_MAX, recruit: -RIVAL_RECRUIT_MAX };
    for (const role of prog.STAFF_ROLES) s2.teams.UNLV.staff[role] = { ...s2.teams.UNLV.staff[role], rating: 95, salary: pay95 };
    const notes = cfb.cfbOpenOffseason(s2, lehmer(900 + seed));
    const left = cfb.cfbPayroll(s2);
    if (notes.some(n => n.includes('walked'))) walkCases += 1;
    if (!(s2.nil >= 0) || s2.staffWindow.budget !== thin || left > thin || s2.nil !== thin - left) {
      walkBroke += 1;
      if (!firstWalkBroke) firstWalkBroke = `seed ${seed}: budget ${s2.staffWindow.budget} (want ${thin}), payroll left ${left}, pot ${s2.nil}`;
    }
  }
  /* And chargePayroll itself over every budget from -5 to 40 and every pair
     of chairs: the pot left is never negative, it is the budget less who is
     left, nobody walks when the budget covers them, the dearest goes first,
     and the second only goes when the first was not enough. */
  let gridCases = 0; let gridBroke = 0; let firstGrid = null;
  const mk = (role, r) => (r === null ? null : { id: `g-${role}-${r}`, name: 'Grid Probe', role, rating: r, salary: prog.coordinatorSalary(r), since: 0 });
  for (let b = -5; b <= 40; b += 1) for (const ro of [null, 45, 70, 85, 95]) for (const rd of [null, 45, 70, 85, 95]) {
    const staff = { OC: mk('OC', ro), DC: mk('DC', rd) };
    const before = prog.staffPayroll(staff);
    const pot = Math.max(0, b);
    const { left, walked } = prog.chargePayroll(b, staff);
    const after = prog.staffPayroll(staff);
    gridCases += 1;
    const ok = left >= 0 && left === pot - after && after <= pot
      && (before <= pot ? walked.length === 0 : walked.length > 0)
      && walked.every(w => prog.STAFF_ROLES.every(r => !staff[r] || staff[r].salary <= w.salary))
      && (walked.length < 2 || Math.min(...walked.map(w => w.salary)) > pot);
    if (!ok) { gridBroke += 1; if (!firstGrid) firstGrid = `budget ${b}, OC ${ro}, DC ${rd}: left ${left}, payroll ${before} to ${after}, walked ${walked.length}`; }
  }
  console.log(`   provoked payroll walk: a ${thin} point budget against two ${pay95} point 95s walked someone in ${walkCases} of 10 seeds, broken ${walkBroke}; chargePayroll grid ${gridCases} cases, broken ${gridBroke}`);
  if (walkCases === 0) fail('the provoked payroll walk never walked anybody, so the walk path was not exercised');
  if (walkBroke) fail(`${walkBroke} provoked offseasons left the pot negative or off the budget, first: ${firstWalkBroke}`);
  if (gridBroke) fail(`${gridBroke} chargePayroll cases broke the walk rule, first: ${firstGrid}`);
  console.log(`   ${dyn.seasons} seasons: budget negative ${dyn.negatives} time(s), hires ${dyn.hires}, refused ${dyn.refusals} (broken refusals ${dyn.refusalBroke}), walked on payroll ${dyn.walked}`);
  console.log(`   empty Heisman races ${dyn.emptyHeisman}, bad fields ${dyn.badField}, teams off twelve games ${dyn.badGames}, skill holes ${dyn.holes}, empty AI chairs ${dyn.aiEmpty}`);
  if (dyn.negatives) fail(`the budget went negative ${dyn.negatives} time(s), first: ${dyn.firstNeg}`);
  if (dyn.refusalBroke) fail(`${dyn.refusalBroke} refusals changed the pot or refused an affordable hire`);
  if (dyn.hires === 0) fail('nobody was ever hired, so the hiring path was never exercised');
  if (dyn.refusals === 0) fail('nothing was ever refused, so the refusal path was never exercised by the dynasties');
  if (dyn.emptyHeisman || dyn.badField || dyn.badGames || dyn.holes || dyn.aiEmpty) fail('a ten season dynasty did not complete cleanly (counts above)');
}

console.log('5) rivalry week: one rival each, in-state pairs are real geography, swings stay in range');
{
  const rivalries = cfb.cfbRivalries();
  const seen = new Map();
  for (const r of rivalries) for (const id of [r.a, r.b]) seen.set(id, (seen.get(id) ?? 0) + 1);
  for (const s of CFB_SCHOOLS) if (seen.get(s.id) !== 1) fail(`${s.id} is in ${seen.get(s.id) ?? 0} rivalries, not one`);
  /* The join to the audited table lives here, not in the engine. */
  const NAME = {
    ALA: 'University of Alabama', AUB: 'Auburn University', UGA: 'University of Georgia', TEX: 'University of Texas at Austin',
    'A&M': 'Texas A&M University', OU: 'University of Oklahoma', LSU: 'Louisiana State University', TENN: 'University of Tennessee',
    FLA: 'University of Florida', MISS: 'University of Mississippi', MIZZ: 'University of Missouri', SCAR: 'University of South Carolina',
    OSU: 'Ohio State University', MICH: 'University of Michigan', ORE: 'University of Oregon', PSU: 'Penn State University',
    USC: 'University of Southern California', WASH: 'University of Washington', UCLA: 'University of California, Los Angeles',
    WISC: 'University of Wisconsin-Madison', IOWA: 'University of Iowa', NEB: 'University of Nebraska-Lincoln',
    IND: 'Indiana University Bloomington', MSU: 'Michigan State University', CLEM: 'Clemson University', FSU: 'Florida State University',
    MIA: 'University of Miami', ND: 'University of Notre Dame', UNC: 'University of North Carolina at Chapel Hill',
    LOU: 'University of Louisville', VT: 'Virginia Tech', UTAH: 'University of Utah', KSU: 'Kansas State University',
    OKST: 'Oklahoma State University', TCU: 'Texas Christian University', BAY: 'Baylor University', ASU: 'Arizona State University',
    COL: 'University of Colorado Boulder', ISU: 'Iowa State University', BSU: 'Boise State University', MEM: 'University of Memphis',
    UNLV: 'University of Nevada, Las Vegas',
  };
  const stateOf = new Map(colleges.map(c => [c.name, c.state]));
  for (const [id, st] of Object.entries(cfb.CFB_SCHOOL_STATES)) {
    if (!NAME[id]) { fail(`${id} has a state in the engine but no row in the college table join`); continue; }
    if (stateOf.get(NAME[id]) !== st) fail(`${id}: engine says ${st}, src/data/colleges.ts says ${stateOf.get(NAME[id])}`);
  }
  for (const id of ['SMU', 'TUL']) if (cfb.CFB_SCHOOL_STATES[id]) fail(`${id} has a state the college table never gave it`);
  let inState = 0; let generated = 0;
  for (const r of rivalries) {
    if (r.kind === 'in-state') {
      inState += 1;
      const sa = stateOf.get(NAME[r.a]); const sb = stateOf.get(NAME[r.b]);
      if (!sa || sa !== sb || r.state !== sa) fail(`${r.a} and ${r.b} are called an in-state game, the college table says ${sa} and ${sb}`);
    } else {
      generated += 1;
      if (r.kind !== 'generated' || r.state) fail(`${r.a} and ${r.b} carry no shared state but are not marked generated`);
    }
  }
  console.log(`   ${rivalries.length} pairs: ${inState} in-state, ${generated} generated; e.g. ${rivalries.slice(0, 4).map(r => `${r.a}-${r.b}`).join(', ')}`);
  console.log(`   ${dyn.rivalryGames} rivalry games played: swings out of range ${dyn.swingOut}, morale not reaching strength ${dyn.moraleMiss}, budgets off the swing ${dyn.budgetMiss} (over ${dyn.myRivalry} of my own)`);
  if (dyn.rivalryGames === 0) fail('no rivalry game was ever played');
  if (dyn.swingOut) fail(`${dyn.swingOut} rivalry swings out of range, first: ${dyn.firstSwing}`);
  if (dyn.moraleMiss) fail(`${dyn.moraleMiss} times rivalry morale did not reach the team's strength exactly`);
  if (dyn.budgetMiss) fail(`${dyn.budgetMiss} offseason budgets did not carry the rivalry swing exactly`);
  console.log(`   conference race: ${dyn.confSeasons} conference seasons, ${dyn.confUneven} with uneven league game counts; a better conference record left out of the title game ${dyn.confShut} time(s); percentage picked a different title game from raw wins ${dyn.confPctDecided} time(s)`);
  if (dyn.confUneven === 0) fail('no conference season ever had uneven game counts, so the conference race check was never exercised');
  if (dyn.confShut) fail(`${dyn.confShut} title games left out a team with the better conference record, first: ${dyn.firstShut}`);
  /* The swing function itself, across every margin a game can produce and beyond. */
  for (let m = 0; m <= 120; m += 1) {
    const s = prog.rivalrySwing(m, cfb.CFB_RIVAL_FULL_MARGIN);
    if (s.morale < RIVAL_MORALE_MIN || s.morale > RIVAL_MORALE_MAX || s.recruit < RIVAL_RECRUIT_MIN || s.recruit > RIVAL_RECRUIT_MAX) { fail(`a ${m} point margin swings ${s.morale} morale and ${s.recruit} budget, range ${RIVAL_MORALE_MIN}-${RIVAL_MORALE_MAX} and ${RIVAL_RECRUIT_MIN}-${RIVAL_RECRUIT_MAX}`); break; }
  }
}

console.log('6) strength of schedule: the number is the opponents actually played, and a tie goes to the tougher schedule');
{
  console.log(`   ${dyn.sosChecked} team seasons checked against the game log: mismatches ${dyn.sosMiss}, order disagreements ${dyn.sosOrder}`);
  if (dyn.sosChecked === 0) fail('no strength of schedule was ever checked');
  if (dyn.sosMiss) fail(`${dyn.sosMiss} strengths of schedule disagree with the game log, first: ${dyn.firstSos}`);
  if (dyn.sosOrder) fail(`${dyn.sosOrder} pairs where the team that played stronger opponents shows the lower number`);
  /* Constructed: the same team twice, one fed the twelve strongest opponents and one the twelve weakest. */
  const st = cfb.initCfb('ALA', lehmer(77), { depth: true });
  const byStr = Object.values(st.teams).map(t => [t.id, cfb.cfbStrength(t)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const hard = 'UNLV'; const soft = 'ALA';
  st.teams[hard].players = JSON.parse(JSON.stringify(st.teams[soft].players));
  st.teams[hard].staff = JSON.parse(JSON.stringify(st.teams[soft].staff));
  for (const id of [hard, soft]) { st.teams[id].wins = 10; st.teams[id].losses = 2; st.teams[id].morale = 0; }
  st.teams[hard].opps = byStr.filter(id => id !== hard && id !== soft).slice(0, 12);
  st.teams[soft].opps = byStr.filter(id => id !== hard && id !== soft).slice(-12);
  for (const t of Object.values(st.teams)) if (t.id !== hard && t.id !== soft) { t.wins = 0; t.losses = 12; }
  const sh = cfb.cfbSos(st, hard); const ss = cfb.cfbSos(st, soft);
  if (!(sh > ss)) fail(`the team that played the twelve strongest shows ${sh}, the one that played the twelve weakest ${ss}`);
  const order = cfb.cfbRankings(st).map(t => t.id);
  if (order.indexOf(hard) > order.indexOf(soft)) fail(`same record, same roster: the tougher schedule (SOS ${sh?.toFixed(1)}) ranked below the softer one (${ss?.toFixed(1)})`);
  console.log(`   constructed pair: SOS ${sh?.toFixed(1)} vs ${ss?.toFixed(1)}, ranked ${order.indexOf(hard) + 1} and ${order.indexOf(soft) + 1}`);
  console.log(`   the schedule changed the Playoff field in ${dyn.fieldsChanged} of ${dyn.seasons} seasons`);
  if (dyn.fieldsChanged < FIELDS_FLOOR) fail(`the schedule decided only ${dyn.fieldsChanged} Playoff fields in ${dyn.seasons} seasons, floor ${FIELDS_FLOOR}: the selection is not reading it`);
}

console.log('7) old saves: a pre-728 save plays exactly as it did, and upgrades at its offseason');
{
  const digest = legacyScenario(cfb);
  console.log(`   legacy digest ${digest.slice(0, 16)}..., golden ${GOLDEN.slice(0, 16)}...`);
  if (digest !== GOLDEN) fail('a legacy save no longer plays the way the pre-728 engine played it, same seed, same calls');
  const rng = lehmer(4242);
  const st = cfb.initCfb('TEX', rng);
  if (st.depth || st.teams.TEX.staff) fail('a legacy start came back with the program layer on');
  const gameLog = [];
  playSeason(st, rng, gameLog);
  cfb.runCfbPostseason(st, rng);
  st.seasonsPlayed += 1;
  const before = dyn.seasons;
  const shutBefore = dyn.confShut;
  cfb.cfbOpenOffseason(st, rng);
  if (st.nil !== cfb.nilBudgetFor(CFB_SCHOOL_MAP.get('TEX').prestige, st.teams.TEX.wins)) fail(`a legacy offseason opened with ${st.nil}, not the old NIL formula`);
  cfb.cfbOffseason(st, rng);
  cfb.cfbEnableDepth(st, rng);
  if (!st.depth || Object.values(st.teams).some(t => !t.staff?.OC || !t.staff?.DC)) fail('the upgrade did not give every program its staff');
  runDynasty(st, rng, 9, 'upgraded legacy save');
  if (dyn.seasons - before !== 9) fail(`the upgraded save played ${dyn.seasons - before} seasons, not nine`);
  if (dyn.confShut > shutBefore) fail(`the upgraded save left a better conference record out of a title game ${dyn.confShut - shutBefore} time(s)`);
  console.log(`   upgraded save: ${st.seasonsPlayed} seasons played, staff on every program, rivalry week ${st.lastRivalry ? 'played' : 'never played'}`);
  if (!st.lastRivalry) fail('the upgraded save never played a rivalry week');
}

console.log('8) the board: an old save loads, a new dynasty has its staff, the window refuses what it cannot afford');
{
  const TEST = 'src/components/cfb-dynasty/CfbDynastyDepth.test.tsx';
  const vitest = createRequire(import.meta.url).resolve('vitest/vitest.mjs');
  const r = spawnSync(process.execPath, [vitest, 'run', TEST],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  const summary = out.match(/Tests\s+(.+)/);
  console.log(`   vitest exit ${r.status}, ${summary ? summary[1].trim() : 'no summary line'}`);
  if (!out.includes('CfbDynastyDepth.test.tsx')) fail('vitest did not report on the board test at all:\n' + out.slice(-1500));
  else if (r.status !== 0 || !/4 passed/.test(out)) {
    const lines = out.split('\n').filter(l => /×|FAIL|AssertionError|expected|Error/.test(l)).slice(0, 10);
    fail('the board test is red:\n    ' + lines.join('\n    '));
  }
}

console.log(`9) league balance: over ${BAL_SEASONS} seasons the program layer tilts the league no further than measured`);
{
  /* AI staff are hired at each program's own level, so the layer leans a
     little toward the strong, and a new dynasty starts with it on. The same
     seeds run on the legacy engine (held to its digest in section 7) and with
     the layer on, and the drift between them is held to a band. Upsets (the
     lower prestige program wins a regular season game) are the strongest
     signal there is, every game counts; the weakest program's wins are the
     sharpest. Title shares are printed, too few titles to band. */
  const byPrestige = [...CFB_SCHOOLS].sort((a, b) => a.prestige - b.prestige || (a.id < b.id ? -1 : 1));
  const weakest = byPrestige[0].id;
  const top6 = new Set(byPrestige.slice(-6).map(s => s.id));
  const stats = {};
  for (const depth of [false, true]) {
    let titles = 0; let upsets = 0; let games = 0; let weakWins = 0;
    for (let seed = 1; seed <= BAL_SEASONS; seed += 1) {
      const rng = lehmer(SEED_BASE + seed * 3571 + 11);
      const st = cfb.initCfb(weakest, rng, { depth });
      for (let r = 1; r <= CFB_ROUNDS; r += 1) {
        for (const g of cfb.simCfbRound(st, rng).games) {
          games += 1;
          const ph = CFB_SCHOOL_MAP.get(g.home).prestige; const pa = CFB_SCHOOL_MAP.get(g.away).prestige;
          if (ph !== pa && g.winner === (ph < pa ? g.home : g.away)) upsets += 1;
        }
        if (r < CFB_ROUNDS) st.round += 1;
      }
      weakWins += st.teams[weakest].wins;
      if (top6.has(cfb.runCfbPostseason(st, rng).champion)) titles += 1;
    }
    stats[depth] = { upsets: 100 * upsets / games, weak: weakWins / BAL_SEASONS, top6: 100 * titles / BAL_SEASONS };
  }
  const L = stats[false]; const D = stats[true];
  const upDrift = D.upsets - L.upsets; const weakDrift = D.weak - L.weak;
  console.log(`   upsets ${L.upsets.toFixed(2)}% legacy, ${D.upsets.toFixed(2)}% with the layer, drift ${upDrift.toFixed(2)} (band ${UPSET_DRIFT_BAND.join(' to ')})`);
  console.log(`   ${weakest} regular season wins ${L.weak.toFixed(2)} legacy, ${D.weak.toFixed(2)} with the layer, drift ${weakDrift.toFixed(2)} (band ${WEAK_DRIFT_BAND.join(' to ')}); top six prestige titles ${L.top6.toFixed(1)}% and ${D.top6.toFixed(1)}%`);
  if (upDrift < UPSET_DRIFT_BAND[0] || upDrift > UPSET_DRIFT_BAND[1]) fail(`the program layer moved the upset rate by ${upDrift.toFixed(2)} points, band ${UPSET_DRIFT_BAND.join(' to ')}`);
  if (weakDrift < WEAK_DRIFT_BAND[0] || weakDrift > WEAK_DRIFT_BAND[1]) fail(`the program layer moved ${weakest}'s wins by ${weakDrift.toFixed(2)} a season, band ${WEAK_DRIFT_BAND.join(' to ')}`);
}

fs.rmSync(TMP, { recursive: true, force: true });
if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimCfbStaff: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimCfbStaff: all green');
