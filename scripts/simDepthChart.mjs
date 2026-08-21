/**
 * Rounds 182 and 183 harness: the depth chart in all four US career games.
 *
 * What shipped (S-5 roles half): nobody is handed a job any more. Draft
 * day assigns starter or backup from draft capital and an incumbent
 * modeled off the team's quality, every offseason runs a camp battle with
 * hysteresis both ways, backup seasons are spot duty (QBs hold clipboards,
 * NBA bench units get 60 percent minutes, backup goalies get twenty-odd
 * starts, NHL fourth lines get half the ice time, MLB bench bats get half
 * the games and long-relief arms get spot starts), free agency
 * re-evaluates your spot in the NEW locker room (a mid player chasing a
 * ring can lose the job, closing the money-role-rings triangle Round 179
 * opened), and the NBA Sixth Man award finally goes to actual bench
 * players. Sport truths are respected: kickers never sit, NO rookie
 * goalie starts on draft capital alone, and MLB relievers are exempt
 * because the bullpen hierarchy already lives in the closer archetype.
 * An absent role means starter, byte for byte, so every pre-182 save and
 * every existing harness path is untouched, and section 4 proves that
 * equivalence rather than trusting it.
 *
 * Margins come from measured runs (2026-08-19, seeded): rookie starter
 * rates at quality 78 were 0.166 (NFL), 0.126 (NBA), 0.064 (NHL goalies,
 * the apprentice rule); an 80-rated backup won a camp within three tries
 * 100 percent of the time; a 74-rated starter on a 78-quality roster was
 * benched exactly never (the hysteresis bound makes it arithmetically
 * impossible); workload ratios measured: NFL QB 0.253, NBA ppg 0.631,
 * NHL skater points 0.592, NHL goalie wins 0.395, MLB batter homers
 * 0.575, MLB starter strikeouts 0.459.
 *
 * Run: node scripts/simDepthChart.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/depthChartEntry.mjs';
const BUNDLE = '/tmp/depthChart.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const nfl = await import('${ROOT}/src/lib/nflMyCareer.ts');
const nba = await import('${ROOT}/src/lib/nbaMyCareer.ts');
const nhl = await import('${ROOT}/src/lib/nhlMyCareer.ts');
const mlb = await import('${ROOT}/src/lib/mlbMyCareer.ts');
const fa = await import('${ROOT}/src/lib/usCareerFreeAgency.ts');
export { nfl, nba, nhl, mlb, fa };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { nfl, nba, nhl, mlb, fa } = await import(BUNDLE);

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

/* ---------- 1. Draft day puts the right names on top ---------- */
console.log('1) Draft assignment: capital counts, kickers never sit, weak teams start you');
{
  const r = seeded(11);
  for (let i = 0; i < 500; i++) {
    const c = nfl.startCareer('X', 'K', nfl.ARCHETYPES.K[0], r, null, undefined);
    c.ovr = 62; /* even a bad kicker is THE kicker */
    nfl.nflAssignRole(c, 94, r);
    if (c.role !== 'starter') { fail('a kicker opened as a backup'); break; }
  }
  const rate = (sport, tq, seed) => {
    const rr = seeded(seed);
    let st = 0;
    const N = 1500;
    for (let i = 0; i < N; i++) {
      if (sport === 'nfl') {
        const c = nfl.startCareer('X', 'QB', nfl.ARCHETYPES.QB[0], rr, null, undefined);
        nfl.nflAssignRole(c, tq, rr);
        if (c.draftPick <= 12 && c.role !== 'starter') fail('an NFL top-12 pick opened on the bench');
        if (c.role === 'starter') st++;
      } else {
        const c = nba.startNbaCareer('X', 'PG', nba.NBA_ARCHETYPES.PG[0], rr, null, undefined);
        nba.nbaAssignRole(c, tq, rr);
        if (c.draftPick <= 5 && c.role !== 'starter') fail('an NBA top-5 pick opened on the bench');
        if (c.role === 'starter') st++;
      }
    }
    return st / N;
  };
  const nfl78 = rate('nfl', 78, 12), nba78 = rate('nba', 78, 13);
  if (nfl78 < 0.05 || nfl78 > 0.45) fail(`NFL rookie starter rate at quality 78 is ${nfl78.toFixed(2)}, outside [0.05, 0.45] (measured 0.17)`);
  if (nba78 < 0.05 || nba78 > 0.45) fail(`NBA rookie starter rate at quality 78 is ${nba78.toFixed(2)}, outside [0.05, 0.45] (measured 0.13)`);
  const nflWeak = rate('nfl', 64, 14), nflStrong = rate('nfl', 90, 15);
  if (nflWeak < nflStrong + 0.15) fail(`a 64-quality roster (${nflWeak.toFixed(2)}) should start rookies far more than a 90 (${nflStrong.toFixed(2)})`);

  /* Round 183: the NHL and MLB truths. */
  const r2 = seeded(16);
  let gStart = 0;
  for (let i = 0; i < 1000; i++) {
    const c = nhl.startNhlCareer('X', 'G', nhl.NHL_ARCHETYPES.G[0], r2, null, undefined);
    nhl.nhlAssignRole(c, 78, r2);
    if (c.role === 'starter') gStart++;
  }
  if (gStart / 1000 > 0.2) fail(`rookie goalies open as the number one ${(gStart / 1000 * 100).toFixed(0)}% of the time, the apprentice rule is broken (measured 6%)`);
  for (let i = 0; i < 800; i++) {
    const c = nhl.startNhlCareer('X', 'C', nhl.NHL_ARCHETYPES.C[0], r2, null, undefined);
    nhl.nhlAssignRole(c, 88, r2);
    if (c.draftPick <= 10 && c.role !== 'starter') { fail('an NHL top-10 skater opened down the lineup'); break; }
  }
  for (let i = 0; i < 800; i++) {
    const c = mlb.startMlbCareer('X', 'RP', mlb.MLB_ARCHETYPES.RP[0], r2, null, undefined);
    mlb.mlbAssignRole(c, 92, r2);
    if (c.role !== 'starter') { fail('a reliever was benched, the bullpen exemption is broken'); break; }
    const note = mlb.mlbCampBattle(c, 92, r2);
    if (c.role !== 'starter' || note !== null) { fail('a reliever camp battle did something, it must be a no-op'); break; }
  }
  for (let i = 0; i < 800; i++) {
    const c = mlb.startMlbCareer('X', 'SS', mlb.MLB_ARCHETYPES.SS[0], r2, null, undefined);
    mlb.mlbAssignRole(c, 90, r2);
    if (c.draftPick <= 10 && c.role !== 'starter') { fail('an MLB top-10 pick opened on the bench'); break; }
  }
}

/* ---------- 2. The camp arc: fights are winnable, jobs are sticky ---------- */
console.log('2) Camps: the good rise, the raw wait, incumbents get hysteresis');
{
  const r = seeded(21);
  let up = 0;
  for (let i = 0; i < 1500; i++) {
    const c = nfl.startCareer('X', 'WR', nfl.ARCHETYPES.WR[0], r, null, undefined);
    c.role = 'backup'; c.ovr = 80;
    for (let k = 0; k < 3 && c.role === 'backup'; k++) nfl.nflCampBattle(c, 78, r);
    if (c.role === 'starter') up++;
  }
  if (up / 1500 < 0.95) fail(`an 80-rated backup won a job within 3 camps only ${(up / 1500 * 100).toFixed(0)}% of the time (measured 100%)`);

  let stuck = 0;
  for (let i = 0; i < 1500; i++) {
    const c = nfl.startCareer('X', 'WR', nfl.ARCHETYPES.WR[0], r, null, undefined);
    c.role = 'backup'; c.ovr = 66;
    nfl.nflCampBattle(c, 88, r);
    if (c.role === 'backup') stuck++;
  }
  if (stuck / 1500 < 0.85) fail(`a raw 66 behind an 88-quality roster jumped the queue too often (stayed down ${(stuck / 1500 * 100).toFixed(0)}%)`);

  /* Hysteresis: at quality 78 the incumbent tops out at 79, and benching
     needs ovr < incumbent - 5, so a 74-rated starter can NEVER be benched
     there. Zero, not rarely. */
  let benched = 0;
  for (let i = 0; i < 2000; i++) {
    const c = nfl.startCareer('X', 'WR', nfl.ARCHETYPES.WR[0], r, null, undefined);
    c.role = 'starter'; c.ovr = 74;
    nfl.nflCampBattle(c, 78, r);
    if (c.role === 'backup') benched++;
  }
  if (benched !== 0) fail(`hysteresis broke: a 74 starter at quality 78 was benched ${benched} times (arithmetically impossible)`);

  /* And a 70 on a 92-quality roster always loses the job: incumbent floor
     85, and 70 < 80 every time. */
  let kept = 0;
  for (let i = 0; i < 1000; i++) {
    const c = nba.startNbaCareer('X', 'SF', nba.NBA_ARCHETYPES.SF[0], r, null, undefined);
    c.role = 'starter'; c.ovr = 70;
    nba.nbaCampBattle(c, 92, r);
    if (c.role === 'starter') kept++;
  }
  if (kept !== 0) fail(`a 70 held a starting spot on a 92-quality roster ${kept} times (impossible by the bound)`);
}

/* ---------- 3. A backup season is spot duty, and kickers are exempt ---------- */
console.log('3) The stat lines respect the role');
{
  const meanOf = (make, seed, n = 500) => {
    const r = seeded(seed);
    let tot = 0;
    for (let i = 0; i < n; i++) tot += make(r);
    return tot / n;
  };
  const qb = role => r => {
    const c = nfl.startCareer('X', 'QB', nfl.ARCHETYPES.QB[0], r, null, undefined);
    c.ovr = 78; c.role = role;
    return nfl.simSeason(c, 78, r).line.passYds ?? 0;
  };
  const qbRatio = meanOf(qb('backup'), 31) / meanOf(qb('starter'), 32);
  if (qbRatio > 0.45) fail(`a backup QB throws ${(qbRatio * 100).toFixed(0)}% of a starter's yards, clipboard duty should be under 45% (measured 25%)`);
  if (qbRatio < 0.05) fail('a backup QB threw almost nothing at all, spot starts should exist');

  const wr = role => r => {
    const c = nfl.startCareer('X', 'WR', nfl.ARCHETYPES.WR[0], r, null, undefined);
    c.ovr = 78; c.role = role;
    return nfl.simSeason(c, 78, r).line.recYds ?? 0;
  };
  const wrRatio = meanOf(wr('backup'), 33) / meanOf(wr('starter'), 34);
  if (wrRatio < 0.3 || wrRatio > 0.75) fail(`a rotational receiver runs at ${(wrRatio * 100).toFixed(0)}% of a starter, expected 30-75%`);

  const k = role => r => {
    const c = nfl.startCareer('X', 'K', nfl.ARCHETYPES.K[0], r, null, undefined);
    c.ovr = 78; c.role = role;
    return nfl.simSeason(c, 78, r).line.fgAtt ?? 0;
  };
  const kRatio = meanOf(k('backup'), 35) / meanOf(k('starter'), 36);
  if (Math.abs(kRatio - 1) > 0.05) fail(`the role scaled a kicker's attempts (ratio ${kRatio.toFixed(2)}), kickers are exempt`);

  const sg = role => r => {
    const c = nba.startNbaCareer('X', 'SG', nba.NBA_ARCHETYPES.SG[0], r, null, undefined);
    c.ovr = 80; c.role = role;
    return nba.simNbaSeason(c, 78, r).line.ppg;
  };
  const ppgRatio = meanOf(sg('backup'), 37) / meanOf(sg('starter'), 38);
  if (ppgRatio < 0.45 || ppgRatio > 0.8) fail(`bench scoring runs at ${(ppgRatio * 100).toFixed(0)}% of a starter, expected 45-80% (measured 63%)`);

  /* Backup awards: a clipboard QB can never hit the 15-game MVP gate. */
  const r2 = seeded(39);
  for (let i = 0; i < 1500; i++) {
    const c = nfl.startCareer('X', 'QB', nfl.ARCHETYPES.QB[0], r2, null, undefined);
    c.ovr = 92; c.role = 'backup';
    const { line } = nfl.simSeason(c, 90, r2);
    if (line.awards.includes('MVP') || line.awards.includes('All-Pro')) {
      fail('a clipboard season won a full-season award'); break;
    }
  }

  /* Round 183: the NHL and MLB workloads, same measured discipline. */
  const cw = role => r => {
    const c = nhl.startNhlCareer('X', 'C', nhl.NHL_ARCHETYPES.C[0], r, null, undefined);
    c.ovr = 80; c.role = role;
    return nhl.simNhlSeason(c, 78, r).line.points ?? 0;
  };
  const nhlRatio = meanOf(cw('backup'), 311) / meanOf(cw('starter'), 312);
  if (nhlRatio < 0.4 || nhlRatio > 0.75) fail(`fourth-line production runs at ${(nhlRatio * 100).toFixed(0)}% of a top-liner, expected 40-75% (measured 59%)`);
  const gw = role => r => {
    const c = nhl.startNhlCareer('X', 'G', nhl.NHL_ARCHETYPES.G[0], r, null, undefined);
    c.ovr = 80; c.role = role;
    return nhl.simNhlSeason(c, 78, r).line.wins ?? 0;
  };
  const gRatio = meanOf(gw('backup'), 313) / meanOf(gw('starter'), 314);
  if (gRatio < 0.25 || gRatio > 0.55) fail(`a backup goalie wins ${(gRatio * 100).toFixed(0)}% of a number one's games, expected 25-55% (measured 40%)`);
  const bat = role => r => {
    const c = mlb.startMlbCareer('X', 'CF', mlb.MLB_ARCHETYPES.CF[0], r, null, undefined);
    c.ovr = 80; c.role = role;
    return mlb.simMlbSeason(c, 78, r).line.hr ?? 0;
  };
  const batRatio = meanOf(bat('backup'), 315) / meanOf(bat('starter'), 316);
  if (batRatio < 0.4 || batRatio > 0.75) fail(`a bench bat hits ${(batRatio * 100).toFixed(0)}% of an everyday man's homers, expected 40-75% (measured 58%)`);
  const spF = role => r => {
    const c = mlb.startMlbCareer('X', 'SP', mlb.MLB_ARCHETYPES.SP[0], r, null, undefined);
    c.ovr = 80; c.role = role;
    return mlb.simMlbSeason(c, 78, r).line.so ?? 0;
  };
  const spRatio = meanOf(spF('backup'), 317) / meanOf(spF('starter'), 318);
  if (spRatio < 0.3 || spRatio > 0.65) fail(`a spot starter strikes out ${(spRatio * 100).toFixed(0)}% of a rotation arm, expected 30-65% (measured 46%)`);
  /* Relievers are exempt even under a forced backup flag. */
  for (let seed = 320; seed < 335; seed++) {
    const mk = role => {
      const r = seeded(seed);
      const c = mlb.startMlbCareer('X', 'RP', mlb.MLB_ARCHETYPES.RP[0], r, null, undefined);
      c.role = role;
      return JSON.stringify(mlb.simMlbSeason(c, 78, seeded(seed + 900)).line);
    };
    if (mk('backup') !== mk('starter')) { fail('a forced backup flag changed a reliever season, the exemption leaks'); break; }
  }
}

/* ---------- 4. An absent role IS a starter, byte for byte ---------- */
console.log('4) Pre-182 saves and harness careers are untouched');
{
  for (let seed = 41; seed < 71; seed++) {
    const mk = (lib, start, sim, arch, pos, role) => {
      const r = seeded(seed);
      const c = start('X', pos, arch, r, null, undefined);
      if (role) c.role = role;
      return JSON.stringify(sim(c, 80, seeded(seed + 500)).line);
    };
    const a1 = mk(nfl, nfl.startCareer, nfl.simSeason, nfl.ARCHETYPES.RB[0], 'RB', undefined);
    const b1 = mk(nfl, nfl.startCareer, nfl.simSeason, nfl.ARCHETYPES.RB[0], 'RB', 'starter');
    if (a1 !== b1) { fail('an NFL career with no role diverged from an explicit starter'); break; }
    const a2 = mk(nba, nba.startNbaCareer, nba.simNbaSeason, nba.NBA_ARCHETYPES.C[0], 'C', undefined);
    const b2 = mk(nba, nba.startNbaCareer, nba.simNbaSeason, nba.NBA_ARCHETYPES.C[0], 'C', 'starter');
    if (a2 !== b2) { fail('an NBA career with no role diverged from an explicit starter'); break; }
    const a3 = mk(nhl, nhl.startNhlCareer, nhl.simNhlSeason, nhl.NHL_ARCHETYPES.D[0], 'D', undefined);
    const b3 = mk(nhl, nhl.startNhlCareer, nhl.simNhlSeason, nhl.NHL_ARCHETYPES.D[0], 'D', 'starter');
    if (a3 !== b3) { fail('an NHL career with no role diverged from an explicit starter'); break; }
    const a4 = mk(mlb, mlb.startMlbCareer, mlb.simMlbSeason, mlb.MLB_ARCHETYPES['1B'][0], '1B', undefined);
    const b4 = mk(mlb, mlb.startMlbCareer, mlb.simMlbSeason, mlb.MLB_ARCHETYPES['1B'][0], '1B', 'starter');
    if (a4 !== b4) { fail('an MLB career with no role diverged from an explicit starter'); break; }
  }
}

/* ---------- 5. The bench wears on you, by exactly the documented amount ---------- */
console.log('5) Backup years drain morale and fanbase, deterministically');
{
  const run = role => {
    const r = seeded(51);
    const c = nfl.startCareer('X', 'TE', nfl.ARCHETYPES.TE[0], r, null, undefined);
    c.morale = 70; c.fanbase = 50; c.role = role;
    nfl.progress(c, seeded(52));
    return c;
  };
  const s = run('starter'), b = run('backup');
  if (s.morale - b.morale !== 3) fail(`backup morale drain is ${s.morale - b.morale}, documented as 3`);
  if (s.fanbase - b.fanbase !== 2) fail(`backup fanbase drain is ${s.fanbase - b.fanbase}, documented as 2`);
  /* Round 183: same documented drains in the other two sports. */
  const runNhl = role => {
    const r = seeded(53);
    const c = nhl.startNhlCareer('X', 'LW', nhl.NHL_ARCHETYPES.LW[0], r, null, undefined);
    c.morale = 70; c.fanbase = 50; c.role = role;
    nhl.nhlProgress(c, seeded(54));
    return c;
  };
  const s2 = runNhl('starter'), b2 = runNhl('backup');
  if (s2.morale - b2.morale !== 3 || s2.fanbase - b2.fanbase !== 2) fail('the NHL bench drains differ from the documented 3 and 2');
  const runMlb = role => {
    const r = seeded(55);
    const c = mlb.startMlbCareer('X', 'C', mlb.MLB_ARCHETYPES.C[0], r, null, undefined);
    c.morale = 70; c.fanbase = 50; c.role = role;
    mlb.mlbProgress(c, seeded(56));
    return c;
  };
  const s3 = runMlb('starter'), b3 = runMlb('backup');
  if (s3.morale - b3.morale !== 3 || s3.fanbase - b3.fanbase !== 2) fail('the MLB bench drains differ from the documented 3 and 2');
}

/* ---------- 6. Whole careers live the arc ---------- */
console.log('6) Full careers: bench years happen, jobs get won, roles never vanish');
for (const S of [
  {
    key: 'nfl', start: r => nfl.startCareer('X', 'WR', nfl.ARCHETYPES.WR[0], r, null, undefined),
    assign: (c, q, r) => nfl.nflAssignRole(c, q, r), camp: (c, q, r) => nfl.nflCampBattle(c, q, r),
    sim: (c, q, r) => nfl.simSeason(c, q, r), prog: (c, r) => nfl.progress(c, r),
    retire: c => nfl.shouldRetire(c), fa: (c, q, r) => nfl.buildNflFaWindow(c, q, r),
  },
  {
    key: 'nba', start: r => nba.startNbaCareer('X', 'SG', nba.NBA_ARCHETYPES.SG[0], r, null, undefined),
    assign: (c, q, r) => nba.nbaAssignRole(c, q, r), camp: (c, q, r) => nba.nbaCampBattle(c, q, r),
    sim: (c, q, r) => nba.simNbaSeason(c, q, r), prog: (c, r) => nba.nbaProgress(c, r),
    retire: c => nba.nbaShouldRetire(c), fa: (c, q, r) => nba.buildNbaFaWindow(c, q, r),
  },
  {
    key: 'nhl', start: r => nhl.startNhlCareer('X', 'RW', nhl.NHL_ARCHETYPES.RW[0], r, null, undefined),
    assign: (c, q, r) => nhl.nhlAssignRole(c, q, r), camp: (c, q, r) => nhl.nhlCampBattle(c, q, r),
    sim: (c, q, r) => nhl.simNhlSeason(c, q, r), prog: (c, r) => nhl.nhlProgress(c, r),
    retire: c => nhl.nhlShouldRetire(c), fa: (c, q, r) => nhl.buildNhlFaWindow(c, q, r),
  },
  {
    key: 'mlb', start: r => mlb.startMlbCareer('X', 'LF', mlb.MLB_ARCHETYPES.LF[0], r, null, undefined),
    assign: (c, q, r) => mlb.mlbAssignRole(c, q, r), camp: (c, q, r) => mlb.mlbCampBattle(c, q, r),
    sim: (c, q, r) => mlb.simMlbSeason(c, q, r), prog: (c, r) => mlb.mlbProgress(c, r),
    retire: c => mlb.mlbShouldRetire(c), fa: (c, q, r) => mlb.buildMlbFaWindow(c, q, r),
  },
]) {
  const r = seeded(61);
  let everBench = 0, benchToStarter = 0;
  for (let i = 0; i < 250; i++) {
    const c = S.start(r);
    let q = 70 + Math.floor(r() * 20);
    S.assign(c, q, r);
    const openedBench = c.role === 'backup';
    let sawBench = openedBench;
    let guard = 0;
    while (!c.retired && c.seasons.length < 20 && guard++ < 40) {
      if (c.contractYears <= 0) {
        const w = S.fa(c, q, r);
        const live = w.offers.filter(o => !o.gone);
        const pick = live[Math.floor(r() * live.length)];
        fa.applyFaSigning(c, pick);
        q = pick.quality;
        S.camp(c, q, r); /* the new locker room, same as the board */
      }
      S.camp(c, q, r);
      if (!c.role) { fail(`${S.key}: a career lost its role mid-arc`); break; }
      if (c.role === 'backup') sawBench = true;
      S.sim(c, q, r);
      S.prog(c, r);
      if (S.retire(c)) c.retired = true;
    }
    if (sawBench) everBench++;
    if (openedBench && c.role === 'starter') benchToStarter++;
  }
  if (everBench / 250 < 0.4) fail(`${S.key}: only ${(everBench / 250 * 100).toFixed(0)}% of careers ever saw the bench, the chart is decorative`);
  if (benchToStarter === 0) fail(`${S.key}: nobody who opened on the bench ever finished a starter, the arc is broken`);
}

/* ---------- verdict ---------- */
if (failures > 0) {
  console.error(`\n${failures} DEPTH CHART CHECK${failures === 1 ? '' : 'S'} FAILED`);
  process.exit(1);
}
console.log('\nALL DEPTH CHART CHECKS PASSED');
