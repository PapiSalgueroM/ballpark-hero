/* Round 823: CBB Dynasty's program layer. Two assistants, rivalry night and
   strength of schedule, held to everything simCfbStaff holds football to.

   The shared module is src/lib/collegeProgram.ts (Round 823 lifted the glue
   both dynasties run into it); CBB binds it in src/lib/cbbDynasty.ts with a
   basketball descriptor. What this harness proves, section by section:

     1) the bound: an assistant moves his end of the floor by at most 3
        rating points either way for ANY rating (0 to 150 probed), the edge
        never falls as the rating rises, and every end in a live league sits
        inside it (hard). And where the sim reads it: cbbWinProb reads
        cbbStrength, and for every team and every rating pair (plus both
        chairs vacant) the staff moves cbbStrength by exactly half the two
        end edges the Roster tab shows, never past the bound (hard);
     2) offense: over SEEDS seeds a better offensive assistant scores more.
        Common random numbers: the same seed, the same draws, only his rating
        moves, so points per game may never fall as the rating rises on ANY
        seed (hard), each step of the mean must rise by at least STEP_FLOOR,
        the 45 to 95 uplift must sit in its measured band, and in a game whose
        result did not flip he never moved the score by more than the cap of
        CBB_POINTS_PER_EDGE per point of edge (hard). Wins may never fall as
        the rating rises on any seed (hard), and the wins a season a 95 adds
        over a 45 must sit in WIN_BAND, the band that fences the win model;
     3) defense: the same for the defensive assistant and points allowed;
     4) a ten season dynasty over DYN_SEEDS seeds, with a greedy player who
        signs recruits first and then hires the best assistant he can,
        completes: twenty games each, a 32 team field, a Player of the Year,
        rosters with a point guard and a center, every AI chair filled, the
        season log and the morale reset by the offseason; the budget is never
        negative after any step (hard), and a hire the pot cannot cover is
        refused with nothing changed (hard). No real CBB budget fails to
        cover two 95s (printed below), so the payroll walk is provoked through
        the real offseason with salaries a corrupt save could carry, and
        chargePayroll is walked over every budget from -5 to 40 and every
        pair of chairs (all hard);
     5) rivalry night: every school has exactly one rival; an in-state pair
        shares a state in src/data/colleges.ts, the audited college table;
        every other pair is marked generated; nobody meets his rival twice in
        that round; every swing sits inside its stated range with the right
        sign, the morale reaches the team's strength, and the next budget
        carries the recruiting swing exactly (all hard);
     6) strength of schedule: the engine's number equals the average strength
        of the opponents in the game log for every team after every season
        (hard); a constructed pair with the same record and roster ranks the
        tougher schedule first (hard); and the schedule must decide at least
        FIELDS_FLOOR March fields;
     7) old saves: a pre-823 save plays exactly as it did. scripts/lib/
        cbbLegacyDigest.mjs walks five seeds through ten seasons on legacy
        states and must reproduce the digest the pre-823 engine produced
        (GOLDEN below, computed from origin/main at 29fea025 before any of this
        round's changes, twice), and a legacy save upgraded at its offseason
        then completes nine more seasons with the layer on;
     8) the board, under vitest: src/components/cbb-dynasty/
        CbbDynastyDepth.test.tsx (an old save loads and plays, a new dynasty
        has its staff and a schedule, the hiring window refuses what it cannot
        afford, a reload on the recap does not replay the season);
     9) league balance: AI staff are hired at each program's level, so the
        layer leans a little toward the strong. BAL_SEASONS seasons on the
        legacy engine and with the layer on, same seeds; the drift in the
        upset rate and in the weakest program's wins must sit in its band.

   MEASURED HEADROOM, written down before the bands were set (Round 823,
   2026-10-01, 300 seeds a batch, five batches at CBB_STAFF_SEED_BASE 0, 1000,
   2000, 3000 and 4000):
     offense, mean points scored per game at assistant 45 / 70 / 95: 69.4 to
       69.9 / 75.0 to 75.5 / 80.6 to 81.1; the 45 to 95 uplift 11.06, 11.15,
       11.21, 11.32, 11.11; smallest step of the mean 1.07 to 1.16;
     defense, mean points allowed at 45 / 70 / 95: 73.7 to 74.0 / 68.3 to
       68.5 / 62.9 to 63.2; the drop 10.80, 10.84, 10.85, 10.99, 10.80;
       smallest step 1.06 to 1.10;
     wins a season (of twenty) a 95 adds over a 45: offense 2.557, 2.683,
       2.743, 2.850, 2.643; defense 2.583, 2.673, 2.683, 2.797, 2.583 (spread
       0.29). With the assistants' effect on the win model doubled it is 4.94
       and 4.92, halved 1.31 and 1.34 (controls doubled and halved, base 0);
     seeds where a better assistant made his end worse: 0 in all ten runs;
       cap breaks: 0 in all ten runs;
     league balance, 600 seasons a base, layer minus legacy: upset rate
       -1.56, -1.77, -1.66, -1.57, -1.70 points (spread 0.21), Butler (the
       lowest prestige) regular season wins -0.00, -0.08, 0.02, -0.04, 0.06
       (spread 0.14); top six prestige programs' title share 96.7 to 98.7%
       legacy and 97.7 to 98.8% with the layer (printed, too few titles to band);
     the schedule changed the March field in 109 of 209 dynasty seasons
       (those seeds do not move with the seed base);
     the first run found 34 schools meeting their rival a second time on
       rivalry night, fixed in this round, 0 in every run since.
   Bands: uplift and drop inside [9, 13] (about 1.8 below and 1.7 above the
   measured range), every step at least STEP_FLOOR 0.5, WIN_BAND [1.9, 3.5]
   (about 0.65 either side of the measured range, so a halved or a doubled
   effect fails, measured), FIELDS_FLOOR 50 of 209, UPSET_DRIFT_BAND
   [-3, -0.5] and WEAK_DRIFT_BAND [-0.6, 0.5] (about 1.2 and 0.5 beyond the
   measured ranges). The bound itself is the hard cap in sections 1 and 2,
   not these bands: about 9 of the 11 points is the assistant's shift (1.5 a
   point of edge times 6 points of edge), the rest is games his edge turned
   from losses into wins.

   Negative controls (house rule: prove each check can fail). Each patches the
   BUNDLE, never the source, and refuses to run unless its target string is
   in the bundle exactly once:
     CBB_STAFF_CONTROL=unbounded  the edge loses its clamp             -> 1 red
     CBB_STAFF_CONTROL=inverted   a better rating is worse              -> 1, 2, 3 red
     CBB_STAFF_CONTROL=nostaff    assistants leave the win model        -> 1, 2, 3 red
     CBB_STAFF_CONTROL=doubled    their effect on it doubles            -> 1, 2, 3 red
     CBB_STAFF_CONTROL=halved     their effect on it halves             -> 1, 2, 3 red
     CBB_STAFF_CONTROL=raise      the winner is raised, not the loser   -> 2, 3 red
     CBB_STAFF_CONTROL=overspend  hiring stops checking the pot         -> 4 red
     CBB_STAFF_CONTROL=nowalk     payroll never makes anyone walk       -> 4 red
     CBB_STAFF_CONTROL=swing      a blowout swings past the cap         -> 5 red
     CBB_STAFF_CONTROL=rematch    rivals can meet twice on rivalry night -> 5 red
     CBB_STAFF_CONTROL=sos        the log records the wrong team        -> 6 red
     CBB_STAFF_CONTROL=rank       the committee ignores the schedule    -> 6 red
     CBB_STAFF_CONTROL=legacy     rivalry night leaks into old saves    -> 7 red

   Run: node scripts/simCbbStaff.mjs
*/
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { legacyScenario } from './lib/cbbLegacyDigest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.CBB_STAFF_CONTROL || '';
const SEED_BASE = Number(process.env.CBB_STAFF_SEED_BASE || 0);
const GOLDEN = '7a9b8921588a21be2272d02f5289aa9e8b755332eaf7bda053f22e4695484d4e';

const SEEDS = 300;
const DYN_SEEDS = 20;
const DYN_SEASONS = 10;
const LEVELS = [45, 55, 65, 70, 75, 85, 95];
const STEP_FLOOR = 0.5;
const UPLIFT_BAND = [9, 13];
const WIN_BAND = [1.9, 3.5];
const FIELDS_FLOOR = 50;
const BAL_SEASONS = 600;
const UPSET_DRIFT_BAND = [-3, -0.5];
const WEAK_DRIFT_BAND = [-0.6, 0.5];

/* Each control: the exact bundled text it rewrites and what it becomes. */
const CONTROLS = {
  unbounded: ['return Math.max(-STAFF_UNIT_EDGE_MAX, Math.min(STAFF_UNIT_EDGE_MAX, raw));', 'return raw;'],
  inverted: ['const raw = (rating - STAFF_NEUTRAL) * STAFF_EDGE_PER_POINT;', 'const raw = (STAFF_NEUTRAL - rating) * STAFF_EDGE_PER_POINT;'],
  nostaff: ['const staffPart = staff ? (staff.off + staff.def) / 2 : 0;', 'const staffPart = 0;'],
  doubled: ['const staffPart = staff ? (staff.off + staff.def) / 2 : 0;', 'const staffPart = staff ? staff.off + staff.def : 0;'],
  halved: ['const staffPart = staff ? (staff.off + staff.def) / 2 : 0;', 'const staffPart = staff ? (staff.off + staff.def) / 4 : 0;'],
  raise: ['return homeWins ? [hs, Math.max(0, Math.min(as, hs - finish))] : [Math.max(0, Math.min(hs, as - finish)), as];',
    'return homeWins ? [hs <= as ? as + finish : hs, as] : [hs, as <= hs ? hs + finish : as];'],
  overspend: ['if (net > holder.nil) return false;', ''],
  nowalk: ['while (staffPayroll(staff) > pot) {', 'while (false) {'],
  swing: ['const share = Math.min(1, Math.max(0, margin) / fullMargin);', 'const share = Math.max(0, margin) / fullMargin;'],
  rematch: ['if (cbbRivalOf(a)?.rival !== b) continue;', 'continue;'],
  sos: ['(home.opps ??= []).push(g.away);', '(home.opps ??= []).push(g.home);'],
  rank: ['const sos = strengthOfSchedule(t.opps, (oid) => str.get(oid) ?? 60) ?? own;', 'const sos = own;'],
  legacy: ['if (st.depth && st.round === CBB_RIVALRY_ROUND) {', 'if (st.round === CBB_RIVALRY_ROUND) {'],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`CBB_STAFF_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ---- bundle the engine, the shared module and the college table ---- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `cbbStaff-${process.pid}-`));
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(ENTRY, `
export * as cbb from '${ROOT_URL}/src/lib/cbbDynasty.ts';
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
const { cbb, prog, colleges } = await import(pathToFileURL(BUNDLE).href);
const { CBB_SCHOOLS, CBB_SCHOOL_MAP, CBB_ROUNDS, CBB_RIVALRY_ROUND, CBB_POINTS_PER_EDGE, CBB_RIVAL_FULL_MARGIN, DANCE_SIZE } = cbb;
const { STAFF_UNIT_EDGE_MAX, RIVAL_MORALE_MIN, RIVAL_MORALE_MAX, RIVAL_RECRUIT_MIN, RIVAL_RECRUIT_MAX } = prog;
const GAMES = CBB_ROUNDS * cbb.CBB_GAMES_PER_ROUND;

function lehmer(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const MY = 'PUR'; // a top fifteen program, so its games carry both outcomes

console.log('1) the bound: an assistant moves his end of the floor at most 3 points, for any rating');
{
  let over = 0; let falls = 0; let prev = -Infinity;
  for (let r = 0; r <= 150; r += 1) {
    const e = prog.coordinatorEdge(r);
    if (Math.abs(e) > STAFF_UNIT_EDGE_MAX + 1e-9) over += 1;
    if (e < prev - 1e-12) falls += 1;
    prev = e;
  }
  if (over) fail(`${over} ratings between 0 and 150 move an end by more than ${STAFF_UNIT_EDGE_MAX}`);
  if (falls) fail(`the edge falls ${falls} times as the rating rises`);
  const st = cbb.initCbb(MY, lehmer(5), { depth: true });
  let unitsOver = 0;
  for (const t of Object.values(st.teams)) {
    const u = cbb.cbbUnits(t);
    if (Math.abs(u.offEdge) > STAFF_UNIT_EDGE_MAX + 1e-9 || Math.abs(u.defEdge) > STAFF_UNIT_EDGE_MAX + 1e-9) unitsOver += 1;
    if (!t.staff?.OC || !t.staff?.DC) fail(`${t.id} starts a new dynasty without both assistants`);
  }
  if (unitsOver) fail(`${unitsOver} ends of the floor in a live league sit past the bound`);
  /* The bound where the sim reads it: cbbWinProb reads cbbStrength. Every
     team, every rating pair from 0 to 150 in steps of 5, both chairs vacant,
     morale held at 0, against the same team with no staff at all (an old save). */
  let strMiss = 0; let strOver = 0; let firstStr = null; let probes = 0;
  for (const t of Object.values(st.teams)) {
    const bare = cbb.cbbStrength({ ...t, staff: undefined, morale: undefined });
    const pairs = [{ OC: null, DC: null }];
    for (let oc = 0; oc <= 150; oc += 5) for (let dc = 0; dc <= 150; dc += 5) {
      pairs.push({ OC: { ...t.staff.OC, rating: oc }, DC: { ...t.staff.DC, rating: dc } });
    }
    for (const staff of pairs) {
      const withStaff = { ...t, staff, morale: 0 };
      const u = cbb.cbbUnits(withStaff);
      const d = cbb.cbbStrength(withStaff) - bare;
      const want = (u.offEdge + u.defEdge) / 2;
      probes += 1;
      if (Math.abs(d - want) > 1e-9) {
        strMiss += 1;
        if (!firstStr) firstStr = `${t.id} OC ${staff.OC?.rating ?? 'vacant'} DC ${staff.DC?.rating ?? 'vacant'}: strength moved ${d.toFixed(3)}, end edges say ${want.toFixed(3)}`;
      }
      if (Math.abs(d) > STAFF_UNIT_EDGE_MAX + 1e-9) strOver += 1;
    }
  }
  const my95 = { ...st.teams[MY], staff: { OC: { ...st.teams[MY].staff.OC, rating: 95 }, DC: { ...st.teams[MY].staff.DC, rating: 95 } }, morale: 0 };
  console.log(`   team strength, what the win model reads: ${probes} staff pairs probed, off the end edges ${strMiss}, past the bound ${strOver}; a 95 pair moves it ${(cbb.cbbStrength(my95) - cbb.cbbStrength({ ...st.teams[MY], staff: undefined, morale: undefined })).toFixed(2)}`);
  if (strMiss) fail(`${strMiss} staff pairs move team strength (what cbbWinProb reads) by something other than half the two end edges, first: ${firstStr}`);
  if (strOver) fail(`${strOver} staff pairs move team strength past ${STAFF_UNIT_EDGE_MAX}`);
  console.log(`   edge at 0/45/70/95/150: ${[0, 45, 70, 95, 150].map(r => prog.coordinatorEdge(r).toFixed(2)).join(' / ')}; salary at 45/70/95: ${[45, 70, 95].map(prog.coordinatorSalary).join(' / ')}`);
}

/* One regular season with my assistant in `role` set to `rating`, the rest
   of the league untouched. Returns my per game record. */
function seasonWith(seed, role, rating) {
  const rng = lehmer(SEED_BASE + seed * 7919 + 13);
  const st = cbb.initCbb(MY, rng, { depth: true });
  st.teams[MY].staff[role] = { ...st.teams[MY].staff[role], rating };
  const games = [];
  for (let r = 1; r <= CBB_ROUNDS; r += 1) {
    const { myGames } = cbb.simCbbRound(st, rng);
    for (const g of myGames) {
      const home = g.home === MY;
      games.push({ us: home ? g.hs : g.as, them: home ? g.as : g.hs, won: g.winner === MY });
    }
    if (r < CBB_ROUNDS) st.round += 1;
  }
  return games;
}

const measured = {};
function unitSection(role, label, pick, better) {
  const perLevel = LEVELS.map(() => []);
  const winsLevel = LEVELS.map(() => []);
  let seedViolations = 0; let winViolations = 0; let capBreaks = 0; let firstCap = null; let flips = 0; let same = 0; let shapeBreaks = 0;
  const neutralIdx = LEVELS.indexOf(70);
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    const runs = LEVELS.map(L => seasonWith(seed, role, L));
    if (runs.some(g => g.length !== GAMES)) shapeBreaks += 1;
    const per = runs.map(g => mean(g.map(pick)));
    per.forEach((v, i) => perLevel[i].push(v));
    for (let i = 1; i < per.length; i += 1) if (better(per[i - 1], per[i]) < -1e-9) seedViolations += 1;
    const wins = runs.map(g => g.filter(x => x.won).length);
    wins.forEach((v, i) => winsLevel[i].push(v));
    for (let i = 1; i < wins.length; i += 1) if (wins[i] < wins[i - 1]) winViolations += 1;
    for (let i = 0; i < LEVELS.length; i += 1) {
      if (i === neutralIdx) continue;
      const cap = Math.ceil(CBB_POINTS_PER_EDGE * Math.abs(prog.coordinatorEdge(LEVELS[i]) - prog.coordinatorEdge(70)) - 1e-9);
      runs[i].forEach((g, k) => {
        const n = runs[neutralIdx][k];
        if (!n || g.won !== n.won) { flips += 1; return; }
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
  measured[role] = { uplift, winGain, step: Math.min(...steps) };
  console.log(`   ${label} per game at ${LEVELS.join('/')}: ${means.map(m => m.toFixed(2)).join(' / ')}`);
  console.log(`   45 to 95 ${role === 'OC' ? 'uplift' : 'drop'} ${uplift.toFixed(2)} (band ${UPLIFT_BAND.join(' to ')}), smallest step ${Math.min(...steps).toFixed(2)}, seeds that went the wrong way ${seedViolations}, games compared ${same} (+${flips} that flipped), cap breaks ${capBreaks}`);
  console.log(`   wins a season at 45/95: ${mean(winsLevel[0]).toFixed(3)} / ${mean(winsLevel[winsLevel.length - 1]).toFixed(3)}, gain ${winGain.toFixed(3)} (band ${WIN_BAND.join(' to ')}), seed steps that lost wins ${winViolations}`);
  if (shapeBreaks) fail(`${shapeBreaks} seeds where my season was not ${GAMES} games`);
  if (seedViolations) fail(`${seedViolations} seed steps where a better ${role} made ${label} worse; with common random numbers that is never allowed`);
  if (winViolations) fail(`${winViolations} seed steps where a better ${role} won fewer games; with common random numbers that is never allowed`);
  if (winGain < WIN_BAND[0] || winGain > WIN_BAND[1]) fail(`a 95 ${role} instead of a 45 won ${winGain.toFixed(3)} more games a season, band ${WIN_BAND.join(' to ')}: the assistant is not moving the win model by the stated amount`);
  if (Math.min(...steps) < STEP_FLOOR) fail(`a step of the ${role} ladder moved ${label} by only ${Math.min(...steps).toFixed(2)}, floor ${STEP_FLOOR}`);
  if (uplift < UPLIFT_BAND[0] || uplift > UPLIFT_BAND[1]) fail(`45 to 95 moved ${label} by ${uplift.toFixed(2)}, band ${UPLIFT_BAND.join(' to ')}`);
  if (capBreaks) fail(`${capBreaks} games where the ${role} moved the score past his cap, first: ${firstCap}`);
}

console.log(`2) offense: over ${SEEDS} seeds a better offensive assistant scores more, never past his cap`);
unitSection('OC', 'points scored', g => g.us, (a, b) => b - a);

console.log(`3) defense: over ${SEEDS} seeds a better defensive assistant allows less, never past his cap`);
unitSection('DC', 'points allowed', g => g.them, (a, b) => a - b);

/* ---- sections 4 to 6 share one set of ten season dynasties ---- */
const dyn = {
  seasons: 0, negatives: 0, firstNeg: null, refusals: 0, refusalBroke: 0, hires: 0, walked: 0,
  emptyPoy: 0, badField: 0, badGames: 0, holes: 0, aiEmpty: 0, staleLog: 0,
  rivalryGames: 0, swingOut: 0, firstSwing: null, moraleMiss: 0, budgetMiss: 0, myRivalry: 0, rematches: 0, firstRematch: null, nightBroke: 0,
  sosChecked: 0, sosMiss: 0, firstSos: null, sosOrder: 0, fieldsChanged: 0,
};
const checkNil = (st, where) => {
  if (!(st.nil >= 0)) { dyn.negatives += 1; if (!dyn.firstNeg) dyn.firstNeg = `${where}: nil ${st.nil}`; }
};

function playSeason(st, rng, gameLog) {
  for (let r = 1; r <= CBB_ROUNDS; r += 1) {
    const night = st.depth && r === CBB_RIVALRY_ROUND;
    const before = night ? new Map(Object.values(st.teams).map(t => [t.id, cbb.cbbStrength(t)])) : null;
    const { games } = cbb.simCbbRound(st, rng);
    for (const g of games) gameLog.push(g);
    if (night) {
      /* Rivalry night: every program plays exactly twice, once against its
         rival, and never meets the rival a second time. */
      const count = new Map();
      for (const g of games) for (const id of [g.home, g.away]) count.set(id, (count.get(id) ?? 0) + 1);
      if ([...count.values()].some(n => n !== 2) || count.size !== CBB_SCHOOLS.length) dyn.nightBroke += 1;
      for (const s of CBB_SCHOOLS) {
        const rival = cbb.cbbRivalOf(s.id)?.rival;
        const vsRival = games.filter(g => (g.home === s.id && g.away === rival) || (g.away === s.id && g.home === rival));
        if (vsRival.length !== 1 || !vsRival[0].rivalry) {
          dyn.rematches += 1;
          if (!dyn.firstRematch) dyn.firstRematch = `season ${st.season}: ${s.id} met ${rival} ${vsRival.length} times on rivalry night`;
        }
      }
      for (const g of games.filter(x => x.rivalry)) {
        dyn.rivalryGames += 1;
        const w = st.teams[g.winner];
        const l = st.teams[g.winner === g.home ? g.away : g.home];
        const sw = prog.rivalrySwing(Math.abs(g.hs - g.as), CBB_RIVAL_FULL_MARGIN);
        const inRange = v => v >= RIVAL_MORALE_MIN - 1e-9 && v <= RIVAL_MORALE_MAX + 1e-9;
        if (!inRange(w.morale) || !inRange(-l.morale) || !(w.morale > 0) || !(l.morale < 0) || sw.recruit < RIVAL_RECRUIT_MIN || sw.recruit > RIVAL_RECRUIT_MAX) {
          dyn.swingOut += 1;
          if (!dyn.firstSwing) dyn.firstSwing = `${g.home} ${g.hs}-${g.as} ${g.away}: winner morale ${w.morale}, loser ${l.morale}, recruit ${sw.recruit}`;
        }
        for (const t of [w, l]) {
          if (Math.abs(cbb.cbbStrength(t) - before.get(t.id) - t.morale) > 1e-9) dyn.moraleMiss += 1;
        }
      }
    }
    if (r < CBB_ROUNDS) st.round += 1;
  }
  for (const t of Object.values(st.teams)) if (t.wins + t.losses !== GAMES) dyn.badGames += 1;
}

/* Strength of schedule against the game log, team by team. */
function checkSos(st, gameLog) {
  const str = id => cbb.cbbStrength(st.teams[id]);
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
    const got = cbb.cbbSos(st, id);
    if (got === null || Math.abs(got - want) > 1e-9) { dyn.sosMiss += 1; if (!dyn.firstSos) dyn.firstSos = `${id}: engine ${got}, game log ${want}`; }
  }
  for (const a of ids) for (const b of ids) {
    if (mean(fromLog.get(a)) > mean(fromLog.get(b)) + 0.01 && !(cbb.cbbSos(st, a) > cbb.cbbSos(st, b))) dyn.sosOrder += 1;
  }
}

/* The greedy player: sign the class first, then try for the best assistant in each chair. */
function offseason(st, rng) {
  const base = cbb.cbbNilFor(CBB_SCHOOL_MAP.get(st.myTeam).prestige, st.teams[st.myTeam].wins);
  const rv = st.lastRivalry && st.lastRivalry.season === st.season ? st.lastRivalry : null;
  const notes = cbb.cbbOpenOffseason(st, rng);
  dyn.walked += notes.filter(n => n.includes('walked')).length;
  checkNil(st, `season ${st.season} window open`);
  if (st.depth) {
    if (rv) dyn.myRivalry += 1;
    const want = Math.max(0, base + (rv?.recruit ?? 0));
    if (st.staffWindow.budget !== want) dyn.budgetMiss += 1;
    if (st.nil !== Math.max(0, want - cbb.cbbPayroll(st)) && !notes.some(n => n.includes('walked'))) dyn.budgetMiss += 1;
    if (cbb.cbbOpenOffseason(st, rng).length !== 0) fail('the offseason opened twice for one season');
  }
  const cls = cbb.cbbRecruitClass(rng);
  const por = cbb.cbbPortalPool(rng);
  for (const r of [...por.slice(0, 2), ...cls]) { cbb.cbbSignRecruit(st, r, por.includes(r) ? 'SO' : 'FR', rng); checkNil(st, `season ${st.season} signing`); }
  if (st.depth) {
    for (const role of ['OC', 'DC']) {
      const best = st.staffWindow.market.filter(c => c.role === role).sort((a, b) => b.rating - a.rating)[0];
      const cur = st.teams[st.myTeam].staff[role];
      if (!best || (cur && cur.rating >= best.rating)) continue;
      const nilBefore = st.nil;
      const net = best.salary - (cur?.salary ?? 0);
      const ok = cbb.cbbHireCoordinator(st, best.id);
      if (ok) dyn.hires += 1;
      else { dyn.refusals += 1; if (st.nil !== nilBefore || net <= nilBefore) dyn.refusalBroke += 1; }
      checkNil(st, `season ${st.season} hiring ${role}`);
    }
  }
  cbb.cbbOffseason(st, rng);
  checkNil(st, `season ${st.season} offseason`);
  if (st.depth && (Object.values(st.teams).some(t => (t.opps?.length ?? 0) !== 0 || t.morale !== 0) || (st.mySlate?.length ?? 0) !== 0)) dyn.staleLog += 1;
}

function runDynasty(st, rng, seasons, tag) {
  for (let s = 1; s <= seasons; s += 1) {
    const gameLog = [];
    playSeason(st, rng, gameLog);
    if (st.depth) checkSos(st, gameLog);
    const march = cbb.runMarch(st, rng);
    if (st.depth) {
      /* The field picked again off the same table, once as the engine does it
         and once with the schedule taken out. The first must reproduce the
         real field (or this measurement measures something else); the second
         says how often the schedule decided who got in. March games do not
         touch the records, so the table after March is the one it picked from. */
      const bids = new Set(march.autoBids);
      const pick = state => {
        const ranked = cbb.cbbRankings(state).map(t => t.id);
        const atLarge = ranked.filter(id => !bids.has(id)).slice(0, DANCE_SIZE - bids.size);
        return ranked.filter(id => bids.has(id) || atLarge.includes(id)).slice(0, DANCE_SIZE);
      };
      if (pick(st).join() !== march.field.join()) fail(`season ${st.season}: picking the field again off the same table gave a different field`);
      const shadow = JSON.parse(JSON.stringify(st));
      for (const t of Object.values(shadow.teams)) t.opps = [];
      if ([...pick(shadow)].sort().join() !== [...march.field].sort().join()) dyn.fieldsChanged += 1;
    }
    if (march.field.length !== DANCE_SIZE || new Set(march.field).size !== DANCE_SIZE) dyn.badField += 1;
    const race = cbb.poyRace(st, rng);
    if (race.length === 0) dyn.emptyPoy += 1;
    else st.poyWinners = [...st.poyWinners, race[0].name];
    st.titles.push({ season: st.season, team: march.champion });
    st.seasonsPlayed += 1;
    dyn.seasons += 1;
    offseason(st, rng);
    for (const t of Object.values(st.teams)) {
      if (t.id !== st.myTeam && ['PG', 'C'].some(p => !t.players.some(x => x.pos === p))) dyn.holes += 1;
      if (st.depth && t.id !== st.myTeam && (!t.staff?.OC || !t.staff?.DC)) dyn.aiEmpty += 1;
    }
  }
  if (st.seasonsPlayed < seasons) fail(`${tag}: only ${st.seasonsPlayed} seasons played`);
}

console.log(`4) ten season dynasties over ${DYN_SEEDS} seeds complete, and the budget never goes negative`);
{
  for (let seed = 1; seed <= DYN_SEEDS; seed += 1) {
    const rng = lehmer(seed * 104729 + 7);
    const myTeam = CBB_SCHOOLS[(seed * 7) % CBB_SCHOOLS.length].id;
    const st = cbb.initCbb(myTeam, rng, { depth: true });
    runDynasty(st, rng, DYN_SEASONS, `seed ${seed}`);
  }
  /* The refusal, provoked on purpose: a pot one point short of the cost. */
  const st = cbb.initCbb('BUT', lehmer(99), { depth: true });
  for (let r = 1; r <= CBB_ROUNDS; r += 1) { cbb.simCbbRound(st, lehmer(r)); if (r < CBB_ROUNDS) st.round += 1; }
  cbb.cbbOpenOffseason(st, lehmer(3));
  st.teams.BUT.staff.OC = null;
  const cand = [...st.staffWindow.market].filter(c => c.role === 'OC').sort((a, b) => b.salary - a.salary)[0];
  const net = cand.salary;
  st.nil = net - 1;
  const before = JSON.stringify(st.teams.BUT.staff);
  const ok = cbb.cbbHireCoordinator(st, cand.id);
  console.log(`   provoked: a ${net} point hire on a ${net - 1} point pot was ${ok ? 'ALLOWED' : 'refused'}`);
  if (!(net >= 3)) fail(`the provoked refusal was not provoked: the hire cost ${net}`);
  if (ok || st.nil !== net - 1 || JSON.stringify(st.teams.BUT.staff) !== before) fail(`a hire costing ${net} went through on a pot of ${net - 1}, or a refusal changed something`);

  /* The payroll walk. The thinnest real budget on the board (the lowest
     prestige, no wins, the full rivalry loss) still covers two 95s, so in
     play nobody walks; printed, not asserted, since it is a property of the
     numbers rather than a promise. The walk path is still the only thing
     between a corrupt or hand edited save and a negative pot, so it is
     provoked through the real offseason: two assistants rated 80 (below the
     poaching line, so nobody leaves first) carrying 30 a season each against
     that thinnest budget. Every seed must walk somebody, and the pot must
     cover whoever is left. */
  const weakest = [...CBB_SCHOOLS].sort((a, b) => a.prestige - b.prestige || (a.id < b.id ? -1 : 1))[0].id;
  const thin = Math.max(0, cbb.cbbNilFor(CBB_SCHOOL_MAP.get(weakest).prestige, 0) - RIVAL_RECRUIT_MAX);
  const pay95 = prog.coordinatorSalary(95);
  console.log(`   thinnest real budget ${thin} (${weakest}, no wins, rivalry lost by ${CBB_RIVAL_FULL_MARGIN}+), two 95s cost ${2 * pay95}: ${thin >= 2 * pay95 ? 'covered, nobody walks in play' : 'NOT covered'}`);
  const HEAVY = 30;
  if (!(thin < 2 * HEAVY && thin >= HEAVY)) fail(`the provoked walk is not provoked: a budget of ${thin} against two ${HEAVY}s`);
  let walkCases = 0; let walkBroke = 0; let firstWalkBroke = null;
  for (let seed = 1; seed <= 10; seed += 1) {
    const s2 = cbb.initCbb(weakest, lehmer(500 + seed), { depth: true });
    s2.teams[weakest].wins = 0; s2.teams[weakest].losses = GAMES;
    const rival = cbb.cbbRivalOf(weakest).rival;
    s2.lastRivalry = { season: s2.season, opp: rival, us: 50, them: 80, won: false, kind: 'generated', morale: -RIVAL_MORALE_MAX, recruit: -RIVAL_RECRUIT_MAX };
    for (const role of prog.STAFF_ROLES) s2.teams[weakest].staff[role] = { ...s2.teams[weakest].staff[role], rating: 80, salary: HEAVY };
    const notes = cbb.cbbOpenOffseason(s2, lehmer(900 + seed));
    const left = cbb.cbbPayroll(s2);
    if (notes.some(n => n.includes('walked'))) walkCases += 1;
    if (!(s2.nil >= 0) || s2.staffWindow.budget !== thin || left > thin || s2.nil !== thin - left) {
      walkBroke += 1;
      if (!firstWalkBroke) firstWalkBroke = `seed ${seed}: budget ${s2.staffWindow.budget} (want ${thin}), payroll left ${left}, pot ${s2.nil}`;
    }
  }
  let gridCases = 0; let gridBroke = 0; let firstGrid = null;
  const mk = (role, r) => (r === null ? null : { id: `g-${role}-${r}`, name: 'Grid Probe', role, rating: r, salary: prog.coordinatorSalary(r), since: 0 });
  for (let b = -5; b <= 40; b += 1) for (const ro of [null, 45, 70, 85, 95]) for (const rd of [null, 45, 70, 85, 95]) {
    const staff = { OC: mk('OC', ro), DC: mk('DC', rd) };
    const beforePay = prog.staffPayroll(staff);
    const pot = Math.max(0, b);
    const { left, walked } = prog.chargePayroll(b, staff);
    const after = prog.staffPayroll(staff);
    gridCases += 1;
    const good = left >= 0 && left === pot - after && after <= pot
      && (beforePay <= pot ? walked.length === 0 : walked.length > 0)
      && walked.every(w => prog.STAFF_ROLES.every(r => !staff[r] || staff[r].salary <= w.salary))
      && (walked.length < 2 || Math.min(...walked.map(w => w.salary)) > pot);
    if (!good) { gridBroke += 1; if (!firstGrid) firstGrid = `budget ${b}, OC ${ro}, DC ${rd}: left ${left}, payroll ${beforePay} to ${after}, walked ${walked.length}`; }
  }
  console.log(`   provoked payroll walk: a ${thin} point budget against two ${HEAVY} point salaries walked someone in ${walkCases} of 10 seeds, broken ${walkBroke}; chargePayroll grid ${gridCases} cases, broken ${gridBroke}`);
  if (walkCases !== 10) fail(`the provoked payroll walk walked somebody in only ${walkCases} of 10 seeds`);
  if (walkBroke) fail(`${walkBroke} provoked offseasons left the pot negative or off the budget, first: ${firstWalkBroke}`);
  if (gridBroke) fail(`${gridBroke} chargePayroll cases broke the walk rule, first: ${firstGrid}`);
  console.log(`   ${dyn.seasons} seasons: budget negative ${dyn.negatives} time(s), hires ${dyn.hires}, refused ${dyn.refusals} (broken refusals ${dyn.refusalBroke}), walked on payroll ${dyn.walked}`);
  console.log(`   empty Player of the Year races ${dyn.emptyPoy}, bad fields ${dyn.badField}, teams off ${GAMES} games ${dyn.badGames}, PG or C holes ${dyn.holes}, empty AI chairs ${dyn.aiEmpty}, logs not reset ${dyn.staleLog}`);
  if (dyn.negatives) fail(`the budget went negative ${dyn.negatives} time(s), first: ${dyn.firstNeg}`);
  if (dyn.refusalBroke) fail(`${dyn.refusalBroke} refusals changed the pot or refused an affordable hire`);
  if (dyn.hires === 0) fail('nobody was ever hired, so the hiring path was never exercised');
  if (dyn.refusals === 0) fail('nothing was ever refused, so the refusal path was never exercised by the dynasties');
  if (dyn.emptyPoy || dyn.badField || dyn.badGames || dyn.holes || dyn.aiEmpty || dyn.staleLog) fail('a ten season dynasty did not complete cleanly (counts above)');
}

console.log('5) rivalry night: one rival each, in-state pairs are real geography, no rematch, swings stay in range');
{
  const rivalries = cbb.cbbRivalries();
  const seen = new Map();
  for (const r of rivalries) for (const id of [r.a, r.b]) seen.set(id, (seen.get(id) ?? 0) + 1);
  for (const s of CBB_SCHOOLS) if (seen.get(s.id) !== 1) fail(`${s.id} is in ${seen.get(s.id) ?? 0} rivalries, not one`);
  /* The join to the audited table lives here, not in the engine. */
  const NAME = {
    DUKE: 'Duke University', UNC: 'University of North Carolina at Chapel Hill', LOU: 'University of Louisville', CUSE: 'Syracuse University',
    UK: 'University of Kentucky', AUB: 'Auburn University', FLA: 'University of Florida', BAMA: 'University of Alabama',
    TENN: 'University of Tennessee', ARK: 'University of Arkansas', 'A&M': 'Texas A&M University', PUR: 'Purdue University',
    MSU: 'Michigan State University', UCLA: 'University of California, Los Angeles', ILL: 'University of Illinois Urbana-Champaign',
    MICH: 'University of Michigan', IU: 'Indiana University Bloomington', WISC: 'University of Wisconsin-Madison', KU: 'University of Kansas',
    HOU: 'University of Houston', BAY: 'Baylor University', ISU: 'Iowa State University', ZONA: 'University of Arizona',
    BYU: 'Brigham Young University', ZAGA: 'Gonzaga University', SDSU: 'San Diego State University', MEM: 'University of Memphis',
  };
  /* The thirteen the table does not hold, by the name a row for them would carry. */
  const ABSENT = {
    UVA: 'University of Virginia', NCST: 'North Carolina State University', TTU: 'Texas Tech University', UCONN: 'University of Connecticut',
    NOVA: 'Villanova University', CREI: 'Creighton University', MARQ: 'Marquette University', SJU: "St. John's University",
    XAV: 'Xavier University', BUT: 'Butler University', SMC: "Saint Mary's College of California", DAY: 'University of Dayton',
    VCU: 'Virginia Commonwealth University',
  };
  const stateOf = new Map(colleges.map(c => [c.name, c.state]));
  for (const s of CBB_SCHOOLS) if (!NAME[s.id] && !ABSENT[s.id]) fail(`${s.id} is in neither the college table join nor the absent list`);
  for (const [id, st] of Object.entries(cbb.CBB_SCHOOL_STATES)) {
    if (!NAME[id]) { fail(`${id} has a state in the engine but no row in the college table join`); continue; }
    if (stateOf.get(NAME[id]) !== st) fail(`${id}: engine says ${st}, src/data/colleges.ts says ${stateOf.get(NAME[id])}`);
  }
  for (const id of Object.keys(NAME)) if (!cbb.CBB_SCHOOL_STATES[id]) fail(`${id} is in the college table but the engine gives it no state`);
  for (const [id, name] of Object.entries(ABSENT)) {
    if (cbb.CBB_SCHOOL_STATES[id]) fail(`${id} has a state the college table never gave it`);
    if (stateOf.has(name)) fail(`the college table now holds ${name}: give ${id} its state in CBB_SCHOOL_STATES and move it into the join`);
  }
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
  console.log(`   ${rivalries.length} pairs: ${inState} in-state, ${generated} generated; in-state ${rivalries.filter(r => r.kind === 'in-state').map(r => `${r.a}-${r.b}`).join(', ')}`);
  console.log(`   ${dyn.rivalryGames} rivalry games played: swings out of range ${dyn.swingOut}, morale not reaching strength ${dyn.moraleMiss}, budgets off the swing ${dyn.budgetMiss} (over ${dyn.myRivalry} of my own), rivals not meeting exactly once ${dyn.rematches}, rivalry nights not two games each ${dyn.nightBroke}`);
  if (dyn.rivalryGames === 0) fail('no rivalry game was ever played');
  if (dyn.swingOut) fail(`${dyn.swingOut} rivalry swings out of range, first: ${dyn.firstSwing}`);
  if (dyn.moraleMiss) fail(`${dyn.moraleMiss} times rivalry morale did not reach the team's strength exactly`);
  if (dyn.budgetMiss) fail(`${dyn.budgetMiss} offseason budgets did not carry the rivalry swing exactly`);
  if (dyn.rematches) fail(`${dyn.rematches} times a program did not meet its rival exactly once on rivalry night, first: ${dyn.firstRematch}`);
  if (dyn.nightBroke) fail(`${dyn.nightBroke} rivalry nights where somebody did not play exactly two games`);
  for (let m = 0; m <= 120; m += 1) {
    const s = prog.rivalrySwing(m, CBB_RIVAL_FULL_MARGIN);
    if (s.morale < RIVAL_MORALE_MIN || s.morale > RIVAL_MORALE_MAX || s.recruit < RIVAL_RECRUIT_MIN || s.recruit > RIVAL_RECRUIT_MAX) { fail(`a ${m} point margin swings ${s.morale} morale and ${s.recruit} budget, range ${RIVAL_MORALE_MIN}-${RIVAL_MORALE_MAX} and ${RIVAL_RECRUIT_MIN}-${RIVAL_RECRUIT_MAX}`); break; }
  }
}

console.log('6) strength of schedule: the number is the opponents actually played, and the committee reads it');
{
  console.log(`   ${dyn.sosChecked} team seasons checked against the game log: mismatches ${dyn.sosMiss}, order disagreements ${dyn.sosOrder}`);
  if (dyn.sosChecked === 0) fail('no strength of schedule was ever checked');
  if (dyn.sosMiss) fail(`${dyn.sosMiss} strengths of schedule disagree with the game log, first: ${dyn.firstSos}`);
  if (dyn.sosOrder) fail(`${dyn.sosOrder} pairs where the team that played stronger opponents shows the lower number`);
  /* Constructed: the same team twice, one fed the twenty strongest opponents
     and one the twenty weakest. The soft one comes first in the league's own
     order, so a committee that ignores the schedule keeps it first. */
  const st = cbb.initCbb('DUKE', lehmer(77), { depth: true });
  const hard = 'VCU'; const soft = 'DUKE';
  st.teams[hard].players = JSON.parse(JSON.stringify(st.teams[soft].players));
  st.teams[hard].staff = JSON.parse(JSON.stringify(st.teams[soft].staff));
  for (const id of [hard, soft]) { st.teams[id].wins = 16; st.teams[id].losses = 4; st.teams[id].morale = 0; }
  const byStr = Object.values(st.teams).filter(t => t.id !== hard && t.id !== soft).map(t => [t.id, cbb.cbbStrength(t)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  st.teams[hard].opps = byStr.slice(0, 20);
  st.teams[soft].opps = byStr.slice(-20);
  for (const t of Object.values(st.teams)) if (t.id !== hard && t.id !== soft) { t.wins = 0; t.losses = GAMES; }
  const sh = cbb.cbbSos(st, hard); const ss = cbb.cbbSos(st, soft);
  if (!(sh > ss)) fail(`the team that played the twenty strongest shows ${sh}, the one that played the twenty weakest ${ss}`);
  const order = cbb.cbbRankings(st).map(t => t.id);
  if (order.indexOf(hard) > order.indexOf(soft)) fail(`same record, same roster: the tougher schedule (SOS ${sh?.toFixed(1)}) ranked below the softer one (${ss?.toFixed(1)})`);
  console.log(`   constructed pair: SOS ${sh?.toFixed(1)} vs ${ss?.toFixed(1)}, ranked ${order.indexOf(hard) + 1} and ${order.indexOf(soft) + 1}`);
  console.log(`   the schedule changed the March field in ${dyn.fieldsChanged} of ${dyn.seasons} seasons (floor ${FIELDS_FLOOR})`);
  if (dyn.fieldsChanged < FIELDS_FLOOR) fail(`the schedule decided only ${dyn.fieldsChanged} March fields in ${dyn.seasons} seasons, floor ${FIELDS_FLOOR}: the committee is not reading it`);
}

console.log('7) old saves: a pre-823 save plays exactly as it did, and upgrades at its offseason');
{
  const digest = legacyScenario(cbb);
  console.log(`   legacy digest ${digest.slice(0, 16)}..., golden ${GOLDEN.slice(0, 16)}...`);
  if (digest !== GOLDEN) fail('a legacy save no longer plays the way the pre-823 engine played it, same seed, same calls');
  const rng = lehmer(4242);
  const st = cbb.initCbb('KU', rng);
  if (st.depth || st.teams.KU.staff) fail('a legacy start came back with the program layer on');
  const gameLog = [];
  playSeason(st, rng, gameLog);
  if (gameLog.some(g => g.rivalry)) fail('a legacy season played a rivalry night');
  cbb.runMarch(st, rng);
  st.seasonsPlayed += 1;
  const before = dyn.seasons;
  if (cbb.cbbOpenOffseason(st, rng).length !== 0 || st.staffWindow) fail('a legacy offseason opened a hiring window');
  if (st.nil !== cbb.cbbNilFor(CBB_SCHOOL_MAP.get('KU').prestige, st.teams.KU.wins)) fail(`a legacy offseason opened with ${st.nil}, not the old NIL formula`);
  cbb.cbbOffseason(st, rng);
  cbb.cbbEnableDepth(st, rng);
  if (!st.depth || Object.values(st.teams).some(t => !t.staff?.OC || !t.staff?.DC)) fail('the upgrade did not give every program its staff');
  runDynasty(st, rng, 9, 'upgraded legacy save');
  if (dyn.seasons - before !== 9) fail(`the upgraded save played ${dyn.seasons - before} seasons, not nine`);
  console.log(`   upgraded save: ${st.seasonsPlayed} seasons played, staff on every program, rivalry night ${st.lastRivalry ? 'played' : 'never played'}`);
  if (!st.lastRivalry) fail('the upgraded save never played a rivalry night');
}

console.log('8) the board: an old save loads, a new dynasty has its staff, the window refuses what it cannot afford');
{
  const TEST = 'src/components/cbb-dynasty/CbbDynastyDepth.test.tsx';
  const WANT = 5;
  const vitest = createRequire(import.meta.url).resolve('vitest/vitest.mjs');
  const r = spawnSync(process.execPath, [vitest, 'run', TEST],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  const summary = out.match(/Tests\s+(.+)/);
  console.log(`   vitest exit ${r.status}, ${summary ? summary[1].trim() : 'no summary line'}`);
  if (!out.includes('CbbDynastyDepth.test.tsx')) fail('vitest did not report on the board test at all:\n' + out.slice(-1500));
  else if (r.status !== 0 || !new RegExp(`\\b${WANT} passed`).test(out)) {
    const lines = out.split('\n').filter(l => /×|FAIL|AssertionError|expected|Error/.test(l)).slice(0, 10);
    fail(`the board test is red or did not run all ${WANT}:\n    ` + lines.join('\n    '));
  }
}

console.log(`9) league balance: over ${BAL_SEASONS} seasons the program layer tilts the league no further than measured`);
{
  const byPrestige = [...CBB_SCHOOLS].sort((a, b) => a.prestige - b.prestige || (a.id < b.id ? -1 : 1));
  const weakest = byPrestige[0].id;
  const top6 = new Set(byPrestige.slice(-6).map(s => s.id));
  const stats = {};
  for (const depth of [false, true]) {
    let titles = 0; let upsets = 0; let games = 0; let weakWins = 0;
    for (let seed = 1; seed <= BAL_SEASONS; seed += 1) {
      const rng = lehmer(SEED_BASE + seed * 3571 + 11);
      const st = cbb.initCbb(weakest, rng, { depth });
      for (let r = 1; r <= CBB_ROUNDS; r += 1) {
        for (const g of cbb.simCbbRound(st, rng).games) {
          games += 1;
          const ph = CBB_SCHOOL_MAP.get(g.home).prestige; const pa = CBB_SCHOOL_MAP.get(g.away).prestige;
          if (ph !== pa && g.winner === (ph < pa ? g.home : g.away)) upsets += 1;
        }
        if (r < CBB_ROUNDS) st.round += 1;
      }
      weakWins += st.teams[weakest].wins;
      if (top6.has(cbb.runMarch(st, rng).champion)) titles += 1;
    }
    stats[depth] = { upsets: 100 * upsets / games, weak: weakWins / BAL_SEASONS, top6: 100 * titles / BAL_SEASONS };
  }
  const L = stats[false]; const D = stats[true];
  const upDrift = D.upsets - L.upsets; const weakDrift = D.weak - L.weak;
  measured.upDrift = upDrift; measured.weakDrift = weakDrift;
  console.log(`   upsets ${L.upsets.toFixed(2)}% legacy, ${D.upsets.toFixed(2)}% with the layer, drift ${upDrift.toFixed(2)} (band ${UPSET_DRIFT_BAND.join(' to ')})`);
  console.log(`   ${weakest} regular season wins ${L.weak.toFixed(2)} legacy, ${D.weak.toFixed(2)} with the layer, drift ${weakDrift.toFixed(2)} (band ${WEAK_DRIFT_BAND.join(' to ')}); top six prestige titles ${L.top6.toFixed(1)}% and ${D.top6.toFixed(1)}%`);
  if (upDrift < UPSET_DRIFT_BAND[0] || upDrift > UPSET_DRIFT_BAND[1]) fail(`the program layer moved the upset rate by ${upDrift.toFixed(2)} points, band ${UPSET_DRIFT_BAND.join(' to ')}`);
  if (weakDrift < WEAK_DRIFT_BAND[0] || weakDrift > WEAK_DRIFT_BAND[1]) fail(`the program layer moved ${weakest}'s wins by ${weakDrift.toFixed(2)} a season, band ${WEAK_DRIFT_BAND.join(' to ')}`);
}

console.log(`   measured: OC uplift ${measured.OC.uplift.toFixed(2)} win gain ${measured.OC.winGain.toFixed(3)} step ${measured.OC.step.toFixed(2)}; DC drop ${measured.DC.uplift.toFixed(2)} win gain ${measured.DC.winGain.toFixed(3)} step ${measured.DC.step.toFixed(2)}; fields ${dyn.fieldsChanged}/${dyn.seasons}; upset drift ${measured.upDrift.toFixed(2)}; weak drift ${measured.weakDrift.toFixed(2)}`);
fs.rmSync(TMP, { recursive: true, force: true });
if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimCbbStaff: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimCbbStaff: all green');
