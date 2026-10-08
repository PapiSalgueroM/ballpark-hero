/* simNbaAwardsSense.mjs (Round 1103). Do NBA My Career's numbers and awards make sense to a fan?

   It plays the real engine: one bundle of the four career engines, the awards file, NBA Front Office's season
   stats and the Hall of Fame ballot, on a seeded mulberry32 that is both Math.random and the rng handed to
   the engine. The fleet is the board's own order (a role on draft night, a camp every season, one summer card
   with a random option, one career in four in the 2003-04 era), the loop scripts/simNbaCareer.mjs walks.

   Size. Full size is 6,000 careers a seed, seeds 1 to 5. SENSE_SEEDS=1,2 and SENSE_CAREERS=800 shrink it
   while iterating: a shrunk run prints every number, judges only the exact checks and says so.

   The baseline is main. scripts/data/nbaAwardsSenseBaseline.json has two top level keys with two lifetimes:
     nba     the NBA rates of the engine before Round 1103 touched it, per seed. Written ONCE by
             --record-nba-baseline, which refuses when the key exists. A later round that moves these on purpose
             uses --rebase-nba "<reason>", which writes the reason and the commit beside the new numbers.
     others  a sha256 of every NFL, MLB and NHL career this harness plays (500 a sport a seed). A proof for one
             round (did my edit to a shared file move another sport), not a standing rule: it is judged only
             under SENSE_PROVE_OTHERS=1 and rewritten by --record-others.
   Both record commands refuse a dirty tree (git status of src and scripts, this file and the baseline aside).

   Run:  node scripts/simNbaAwardsSense.mjs            (detached at full size: it takes minutes)
   It ends with one line, "simNbaAwardsSense: N checks, F failed (full size)", and exits by F. */
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { build } from 'esbuild';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const ARGS = process.argv.slice(2);
const CONTROL = process.env.SIM_NBA_SENSE_CONTROL || '';
const SEEDS = (process.env.SENSE_SEEDS || '1,2,3,4,5').split(',').map(Number);
const CAREERS = Number(process.env.SENSE_CAREERS || 6000);
const OTHERS_PER = Number(process.env.SENSE_OTHERS || 500);
const FULL = CAREERS >= 6000 && SEEDS.length >= 5;
const PROVE_OTHERS = process.env.SENSE_PROVE_OTHERS === '1';
const BASELINE_FILE = path.join(ROOT, 'scripts', 'data', 'nbaAwardsSenseBaseline.json');
const norm = s => s.replace(/\r\n/g, '\n');

/* ------------------------------------------------------------------ */
/* Controls: one line of SOURCE swapped in memory, never a file        */
/* ------------------------------------------------------------------ */
/* name -> { file, find, put }. Each anchor must sit in its file exactly once and the swap must change the
   text, or the run refuses (exit 2): a control that changed nothing proves nothing. */
const CONTROLS = {
  /* C: one NFL All-Pro grade moved by a hundredth. Judged under SENSE_PROVE_OTHERS=1. */
  othersport: { file: 'src/lib/careerAwards.ts', find: "  QB: { pool: 32, slots: 1, grade: 0.25 },\n  RB:", put: "  QB: { pool: 32, slots: 1, grade: 0.26 },\n  RB:", needs: 'C' },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`unknown SIM_NBA_SENSE_CONTROL "${CONTROL}", expected one of: ${Object.keys(CONTROLS).join(', ') || '(none yet)'}`);
  process.exit(2);
}
let swapped = false;
const swapPlugin = {
  name: 'sense-control',
  setup(b) {
    if (!CONTROL) return;
    const c = CONTROLS[CONTROL];
    b.onLoad({ filter: new RegExp(c.file.split('/').pop().replace(/[.]/g, '[.]') + '$') }, args => {
      if (!args.path.replace(/\\/g, '/').endsWith(c.file)) return undefined;
      const src = norm(readFileSync(args.path, 'utf8'));
      const hits = src.split(c.find).length - 1;
      if (hits !== 1) { console.error(`control ${CONTROL}: anchor found ${hits} times in ${c.file}, expected exactly 1. Refusing to run.`); process.exit(2); }
      const out = src.replace(c.find, c.put);
      if (out === src) { console.error(`control ${CONTROL}: the swap changed nothing. Refusing to run.`); process.exit(2); }
      swapped = true;
      return { contents: out, loader: 'ts' };
    });
  },
};

const OUT = path.join(os.tmpdir(), `nba-sense-${process.pid}.mjs`);
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
await build({
  stdin: {
    contents: [
      "export * as nba from './src/lib/nbaMyCareer.ts';",
      "export * as nfl from './src/lib/nflMyCareer.ts';",
      "export * as mlb from './src/lib/mlbMyCareer.ts';",
      "export * as nhl from './src/lib/nhlMyCareer.ts';",
      "export * as awards from './src/lib/careerAwards.ts';",
      "export * as fo from './src/lib/nbaSeasonStats.ts';",
      "export { NBA_CAREER_HALL } from './src/lib/nbaCareerHall.ts';",
      "export { hallRecordFor } from './src/lib/careerHallOfFame.ts';",
      "export * as loop from './src/lib/nbaCareerLoop.ts';",
    ].join('\n'),
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') }, plugins: [swapPlugin],
});
if (CONTROL && !swapped) { console.error(`control ${CONTROL}: ${CONTROLS[CONTROL].file} was never bundled, so nothing was swapped. Refusing to run.`); process.exit(2); }
const E = await import(pathToFileURL(OUT).href);
try { unlinkSync(OUT); } catch { /* another run may have cleaned it */ }
const { nba, nfl, mlb, nhl } = E;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const sdOf = a => { const m = mean(a); return a.length ? Math.sqrt(mean(a.map(x => (x - m) ** 2))) : 0; };
const pctl = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const r1 = x => Math.round(x * 10) / 10;
const r2 = x => Math.round(x * 100) / 100;
const r3 = x => Math.round(x * 1000) / 1000;
const share = (n, d) => (d ? (100 * n) / d : 0);
const has = (s, a) => s.awards.includes(a);
const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
const ARCH_IDS = POS.flatMap(p => nba.NBA_ARCHETYPES[p].map(a => a.id));

/* ------------------------------------------------------------------ */
/* The fleet                                                           */
/* ------------------------------------------------------------------ */
/** Plays `careers` NBA careers on one seed, the board's own order. Every season is kept with what the engine
 *  knew going in (rating, morale, club, role, seasons played), so a section can replay it through a function. */
function playFleet(seed, careers) {
  const rnd = mulberry32(seed);
  Math.random = rnd;
  const seasons = [];
  const out = [];
  for (let i = 0; i < careers; i++) {
    const pos = POS[i % 5];
    const arch = nba.NBA_ARCHETYPES[pos][i % 3];
    const era = i % 4 === 3 ? 'y2004' : 'now';
    const c = nba.startNbaCareer(`Sim ${i}`, pos, arch, rnd, null, era === 'y2004' ? 'y2004' : undefined);
    let tq = nba.nbaRollTeamQuality(null, rnd);
    nba.nbaAssignRole(c, tq, rnd);
    let guard = 0;
    let done = false;
    while (!done && guard++ < 30) {
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, ppg: 0, rpg: 0, apg: 0, awards: [], teamResult: 'SUSPENDED', salary: 0 });
      } else {
        nba.nbaCampBattle(c, tq, rnd);
        const prev = c.seasons[c.seasons.length - 1];
        const pre = { ovr: c.ovr, morale: c.morale, age: c.age, role: c.role ?? 'starter', n: c.seasons.length, fan: c.fanbase, everAllNba: c.allNbas > 0, my: c.rival?.myYears ?? 0, his: c.rival?.hisYears ?? 0 };
        const { line } = nba.simNbaSeason(c, tq, rnd);
        seasons.push({ i, pos, arch: arch.id, era, tq, ...pre, prev, line, won: (c.rival?.myYears ?? 0) - pre.my, lost: (c.rival?.hisYears ?? 0) - pre.his, rivalScore: c.rival?.lastScore ?? null });
      }
      nba.nbaProgress(c, rnd);
      const ev = nba.drawNbaEvent(c, rnd);
      if (ev) { const pick = ev.options[Math.floor(rnd() * ev.options.length)]; pick.apply(c, rnd); }
      tq = nba.nbaRollTeamQuality(tq, rnd);
      if (nba.nbaShouldRetire(c)) done = true;
    }
    /* Read while the career is still open: a career retiring today is told on today's calibration (Round 1051). */
    const leg = nba.nbaLegacyOf(c);
    const hall = E.hallRecordFor(E.NBA_CAREER_HALL, c);
    const tot = nba.nbaCareerTotals(c);
    out.push({ i, pos, arch: arch.id, era, seasons: c.seasons.length, mvps: c.mvps, allNbas: c.allNbas, allStars: c.allStars ?? 0, rings: c.rings, finalsMvps: c.finalsMvps,
      score: leg.score, inducted: hall.outcome === 'inducted', firstBallot: !!hall.firstBallot, my: c.rival?.myYears ?? 0, his: c.rival?.hisYears ?? 0, pts: tot.pts });
  }
  return { seasons, careers: out };
}

const band = o => (o < 72 ? '<72' : o < 76 ? '72-75' : o < 80 ? '76-79' : o < 84 ? '80-83' : o < 88 ? '84-87' : o < 92 ? '88-91' : o < 96 ? '92-95' : '96+');
const AWARDS = ['All-Star', 'Rookie of the Year', 'All-NBA', 'MVP', 'Finals MVP', 'Defensive Player of the Year', 'All-Defensive Team', 'Scoring Champion', 'Assists Leader', 'Rebounding Champion', 'Most Improved Player', 'Sixth Man of the Year', 'All-Rookie Team'];
const healthy = s => s.line.games >= 58;

/** Every rate the bands hang off, for one seed's fleet. Plain numbers only: this is what the baseline stores. */
function measure(f) {
  const n = f.careers.length;
  const S = f.seasons;
  const per = a => r3(S.filter(s => has(s.line, a)).length / n);
  const m = {};
  m.careers = n; m.seasons = S.length;
  m.inducted = r2(share(f.careers.filter(c => c.inducted).length, n));
  m.firstBallot = r2(share(f.careers.filter(c => c.firstBallot).length, n));
  for (const era of ['now', 'y2004']) {
    const cs = f.careers.filter(c => c.era === era);
    m[`inducted_${era}`] = r2(share(cs.filter(c => c.inducted).length, cs.length));
  }
  m.scoreP50 = r1(pctl(f.careers.map(c => c.score), 0.5)); m.scoreP90 = r1(pctl(f.careers.map(c => c.score), 0.9));
  m.perCareer = Object.fromEntries(AWARDS.map(a => [a, per(a)]));
  m.everMvp = r2(share(f.careers.filter(c => c.mvps > 0).length, n));
  m.everAllNba = r2(share(f.careers.filter(c => c.allNbas > 0).length, n));
  const mvp = S.filter(s => has(s.line, 'MVP'));
  m.mvpSeasons = mvp.length;
  m.mvpMissedPlayoffs = r2(share(mvp.filter(s => s.line.teamResult === nba.NBA_MISSED_PLAYOFFS).length, mvp.length));
  m.mvpNotAllNba = r2(share(mvp.filter(s => !has(s.line, 'All-NBA')).length, mvp.length));
  m.mvpAlsoMip = r2(share(mvp.filter(s => has(s.line, 'Most Improved Player')).length, mvp.length));
  const roy = S.filter(s => has(s.line, 'Rookie of the Year'));
  m.roySeasons = roy.length; m.royOnAllRookie = roy.filter(s => has(s.line, 'All-Rookie Team')).length;
  m.allRookieInFirstSeason = S.filter(s => s.n === 0 && has(s.line, 'All-Rookie Team')).length;
  m.allDefByArch = Object.fromEntries(ARCH_IDS.map(a => [a, r3(S.filter(s => s.arch === a && has(s.line, 'All-Defensive Team')).length / Math.max(1, f.careers.filter(c => c.arch === a).length))]));
  const my = f.careers.reduce((x, c) => x + c.my, 0); const his = f.careers.reduce((x, c) => x + c.his, 0);
  m.myShare = r2(share(my, my + his));
  m.myShareByArch = Object.fromEntries(ARCH_IDS.map(a => { const cs = f.careers.filter(c => c.arch === a); const x = cs.reduce((t, c) => t + c.my, 0); const y = cs.reduce((t, c) => t + c.his, 0); return [a, r1(share(x, x + y))]; }));
  /* How often the verdict disagrees with the two printed lines scored the same way (printed, never judged). */
  const judged = S.filter(s => s.won + s.lost === 1 && s.rivalScore != null);
  m.rivalDisagree = r2(share(judged.filter(s => (E.awards.nbaSeasonScore(s.line) > s.rivalScore) !== (s.won === 1)).length, judged.length));
  m.starters = {};
  for (const b of ['80-83', '88-91']) {
    m.starters[b] = Object.fromEntries(POS.map(p => { const v = S.filter(s => s.role !== 'backup' && healthy(s) && s.pos === p && band(s.ovr) === b).map(s => s.line); return [p, [r1(mean(v.map(l => l.ppg))), r1(mean(v.map(l => l.rpg))), r1(mean(v.map(l => l.apg))), v.length]]; }));
  }
  const rook = S.filter(s => s.n === 0 && healthy(s));
  m.rookieStarterPpg = r1(mean(rook.filter(s => s.role !== 'backup').map(s => s.line.ppg)));
  m.benchPpg = r1(mean(S.filter(s => s.role === 'backup' && healthy(s)).map(s => s.line.ppg)));
  m.starterPpg = r1(mean(S.filter(s => s.role !== 'backup' && healthy(s)).map(s => s.line.ppg)));
  /* The typed gates of the old awards block: what share of qualified seasons (62 games) pass each. */
  const q = S.filter(s => s.line.games >= 62);
  const bigs = q.filter(s => s.pos === 'PF' || s.pos === 'C');
  const withPrev = q.filter(s => s.prev && s.prev.games >= 40);
  m.gates = {
    ppg28: r3(share(q.filter(s => s.line.ppg >= 28).length, q.length)),
    apg10: r3(share(q.filter(s => s.line.apg >= 10).length, q.length)),
    rpg11: r3(share(q.filter(s => s.line.rpg >= 11).length, q.length)),
    rpg125big: r3(share(bigs.filter(s => s.line.rpg >= 12.5).length, bigs.length)),
    jump6: r3(share(withPrev.filter(s => s.line.ppg - s.prev.ppg >= 6).length, withPrev.length)),
    ppg14: r3(share(q.filter(s => s.line.ppg >= 14).length, q.length)),
  };
  /* Readers this round does not own (the lead's list): how often each passes. */
  m.tripleDouble = S.filter(s => s.line.ppg >= 10 && s.line.rpg >= 10 && s.line.apg >= 10).length;
  m.ppg16share = r2(share(S.filter(s => s.line.games > 0 && s.line.ppg >= 16).length, S.length));
  m.career12k = r2(share(f.careers.filter(c => c.pts >= 12000).length, n));
  m.career25k = r2(share(f.careers.filter(c => c.pts >= 25000).length, n));
  m.bothTitles = S.filter(s => has(s.line, 'Scoring Champion') && has(s.line, 'Assists Leader')).length;
  const wings = S.filter(s => (s.pos === 'SG' || s.pos === 'SF') && s.role !== 'backup');
  m.wing8ast = r3(share(wings.filter(s => s.line.apg >= 8).length, wings.length));
  /* The field as the fleet lives it: mean and sd of the season score by position, half a schedule or more. */
  m.field = Object.fromEntries(POS.map(p => { const v = S.filter(s => s.pos === p && s.line.games >= 41).map(s => E.awards.nbaSeasonScore(s.line)); return [p, [r2(mean(v)), r2(sdOf(v))]]; }));
  return m;
}

/* ------------------------------------------------------------------ */
/* The other three sports: a hash of every career, and two printed rates */
/* ------------------------------------------------------------------ */
const OTHER = {
  nfl: { pos: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'], arch: () => nfl.ARCHETYPES, start: (...a) => nfl.startCareer(...a), tq: (...a) => nfl.rollTeamQuality(...a), sim: (...a) => nfl.simSeason(...a), prog: (...a) => nfl.progress(...a), stop: c => nfl.shouldRetire(c) },
  mlb: { pos: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'], arch: () => mlb.MLB_ARCHETYPES, start: (...a) => mlb.startMlbCareer(...a), tq: (...a) => mlb.mlbRollTeamQuality(...a), sim: (...a) => mlb.simMlbSeason(...a), prog: (...a) => mlb.mlbProgress(...a), stop: c => mlb.mlbShouldRetire(c) },
  nhl: { pos: ['C', 'LW', 'RW', 'D', 'G'], arch: () => nhl.NHL_ARCHETYPES, start: (...a) => nhl.startNhlCareer(...a), tq: (...a) => nhl.nhlRollTeamQuality(...a), sim: (...a) => nhl.simNhlSeason(...a), prog: (...a) => nhl.nhlProgress(...a), stop: c => nhl.nhlShouldRetire(c) },
};
/** Each engine's own loop (the one scripts/simAwards.mjs walks), `per` careers on one seed. Returns the sha256
 *  of every season line and every numeric counter on the final save, and the season lines for the prints. */
function playOther(sport, seed, per) {
  const d = OTHER[sport];
  const rnd = mulberry32(seed * 7919 + sport.charCodeAt(1) * 104729);
  Math.random = rnd;
  const h = crypto.createHash('sha256');
  const lines = [];
  for (let i = 0; i < per; i++) {
    const pos = d.pos[i % d.pos.length];
    const archs = d.arch()[pos];
    const c = d.start('Sim', pos, archs[i % archs.length], rnd, null);
    let tq = null; let guard = 0; let done = false;
    while (!done && guard++ < 30) {
      tq = d.tq(tq, rnd); d.sim(c, tq, rnd); d.prog(c, rnd);
      if (d.stop(c)) done = true;
    }
    const counters = Object.fromEntries(Object.entries(c).filter(([, v]) => typeof v === 'number').sort(([a], [b]) => (a < b ? -1 : 1)));
    h.update(JSON.stringify({ seasons: c.seasons, counters }));
    for (const s of c.seasons) lines.push(s);
  }
  return { hash: h.digest('hex'), lines };
}

/* ------------------------------------------------------------------ */
/* The baseline file                                                   */
/* ------------------------------------------------------------------ */
const readBaseline = () => (existsSync(BASELINE_FILE) ? JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) : {});
const gitHead = () => execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
function refuseDirty(what) {
  const dirty = execSync('git status --porcelain -- src scripts', { cwd: ROOT }).toString().split('\n').map(l => l.trim()).filter(Boolean)
    .filter(l => !/scripts\/simNbaAwardsSense[.]mjs$/.test(l) && !/scripts\/data\/nbaAwardsSenseBaseline[.]json$/.test(l));
  if (dirty.length) { console.error(`${what}: refusing on a dirty tree:\n  ${dirty.join('\n  ')}`); process.exit(2); }
}
function writeBaseline(b) { writeFileSync(BASELINE_FILE, JSON.stringify(b, null, 1) + '\n'); }

const RECORD_NBA = ARGS.includes('--record-nba-baseline');
const REBASE_AT = ARGS.indexOf('--rebase-nba');
const RECORD_OTHERS = ARGS.includes('--record-others');
if ((RECORD_NBA || REBASE_AT >= 0 || RECORD_OTHERS) && CONTROL) { console.error('a control run never records'); process.exit(2); }
if ((RECORD_NBA || REBASE_AT >= 0) && !FULL) { console.error('the NBA baseline is recorded at full size only (6,000 careers a seed, five seeds)'); process.exit(2); }
if (RECORD_NBA && readBaseline().nba) { console.error('--record-nba-baseline: the nba key exists. It is written once. A round that moves it on purpose uses --rebase-nba "<reason>".'); process.exit(2); }
if (REBASE_AT >= 0 && !(ARGS[REBASE_AT + 1] || '').trim()) { console.error('--rebase-nba needs a reason in quotes'); process.exit(2); }
if (RECORD_NBA || REBASE_AT >= 0 || RECORD_OTHERS) refuseDirty('record');

/* ------------------------------------------------------------------ */
/* Checks                                                              */
/* ------------------------------------------------------------------ */
let checks = 0;
let failed = 0;
const failedSections = new Set();
/** An exact check: judged at every size. */
function exact(section, cond, msg) {
  checks++;
  if (cond) console.log(`  ok   [${section}] ${msg}`);
  else { failed++; failedSections.add(section); console.log(`  FAIL [${section}] ${msg}`); }
}
/** A band: judged at full size only. A shrunk run prints it. */
function banded(section, cond, msg) {
  if (!FULL) { console.log(`  note [${section}] ${msg} (quick run, bands not judged)`); return; }
  exact(section, cond, msg);
}
const get = (o, key) => key.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
/** Main's band for one number: its lowest seed minus its own seed spread, to its highest plus it. */
function mainBand(base, key) {
  const v = base.seeds.map(s => get(s.m, key));
  const lo = Math.min(...v); const hi = Math.max(...v); const spread = hi - lo;
  return { lo: lo - spread, hi: hi + spread, v };
}
function heldAtMain(section, base, per, key, label) {
  const b = mainBand(base, key);
  const now = per.map(m => get(m, key));
  const out = now.filter(x => x < b.lo || x > b.hi).length;
  banded(section, out === 0, `${label}: ${now.join(', ')} against main ${b.v.join(', ')} (band ${r3(b.lo)} to ${r3(b.hi)})`);
}

/* ------------------------------------------------------------------ */
/* Play                                                                */
/* ------------------------------------------------------------------ */
const t0 = Date.now();
console.log(`simNbaAwardsSense: ${CAREERS} careers a seed, seeds ${SEEDS.join(', ')}${CONTROL ? `, control ${CONTROL}` : ''}${FULL ? '' : ' (quick run, bands not judged)'}`);
const per = [];
for (const seed of SEEDS) {
  const f = playFleet(seed, CAREERS);
  const m = measure(f);
  per.push(m);
  console.log(`  seed ${seed}: ${m.seasons} seasons, Hall ${m.inducted}% (first ballot ${m.firstBallot}%), MVPs ${m.perCareer.MVP} a career, All-NBA ${m.perCareer['All-NBA']}, my share ${m.myShare}%, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
const others = {};
for (const sport of Object.keys(OTHER)) others[sport] = SEEDS.map(seed => playOther(sport, seed, OTHERS_PER));

/* ------------------------------------------------------------------ */
/* Record                                                              */
/* ------------------------------------------------------------------ */
if (RECORD_NBA || REBASE_AT >= 0) {
  const b = readBaseline();
  b.nba = { recordedOn: gitHead(), careers: CAREERS, seeds: SEEDS.map((seed, k) => ({ seed, m: per[k] })) };
  if (REBASE_AT >= 0) b.nba.rebased = { reason: ARGS[REBASE_AT + 1], commit: gitHead() };
  writeBaseline(b);
  console.log(`recorded the nba baseline on ${b.nba.recordedOn}`);
}
if (RECORD_OTHERS || (RECORD_NBA && !readBaseline().others)) {
  const b = readBaseline();
  b.others = { recordedOn: gitHead(), per: OTHERS_PER, seeds: SEEDS, hashes: Object.fromEntries(Object.keys(OTHER).map(s => [s, others[s].map(o => o.hash)])) };
  writeBaseline(b);
  console.log(`recorded the other sports' hashes on ${b.others.recordedOn}`);
}
const base = readBaseline();

/* ------------------------------------------------------------------ */
/* The table every run prints                                          */
/* ------------------------------------------------------------------ */
const row = (label, key) => console.log(`  ${label.padEnd(44)} ${per.map(m => String(get(m, key))).join(', ')}${base.nba ? `   | main ${base.nba.seeds.map(s => String(get(s.m, key))).join(', ')}` : ''}`);
console.log('\nThe numbers (this tree, seed by seed, then main):');
row('Hall of Fame inducted, percent', 'inducted'); row('first ballot, percent', 'firstBallot');
row('inducted, modern careers', 'inducted_now'); row('inducted, 2003-04 careers', 'inducted_y2004');
row('legacy score p50', 'scoreP50'); row('legacy score p90', 'scoreP90');
for (const a of AWARDS) row(`${a} a career`, `perCareer.${a}`);
row('careers with an MVP, percent', 'everMvp'); row('careers with an All-NBA, percent', 'everAllNba');
row('MVP seasons that missed the playoffs, percent', 'mvpMissedPlayoffs'); row('MVP seasons not All-NBA, percent', 'mvpNotAllNba'); row('MVP and Most Improved together, percent', 'mvpAlsoMip');
row('Rookie of the Year seasons', 'roySeasons'); row('of them on All-Rookie', 'royOnAllRookie'); row('All-Rookie in a first season', 'allRookieInFirstSeason');
row('my share of the head to head years', 'myShare'); row('verdict disagrees with the printed lines', 'rivalDisagree');
row('starter points / bench points / rookie starters', 'starterPpg'); row('  bench', 'benchPpg'); row('  rookie starters', 'rookieStarterPpg');
row('triple double seasons', 'tripleDouble'); row('seasons at 16 points or more, percent', 'ppg16share');
row('careers past 12,000 points, percent', 'career12k'); row('careers past 25,000 points, percent', 'career25k');
row('scoring and assists title together', 'bothTitles'); row('SG and SF starter seasons at 8 assists, percent', 'wing8ast');
for (const g of ['ppg28', 'apg10', 'rpg11', 'rpg125big', 'jump6', 'ppg14']) row(`gate ${g}, percent of qualified seasons`, `gates.${g}`);
for (const b of ['80-83', '88-91']) console.log(`  healthy starters rated ${b}: ${POS.map(p => `${p} ${per.map(m => m.starters[b][p].slice(0, 3).join('/')).join(' | ')}`).join('   ')}`);
console.log(`  All-Defensive a career by archetype (seed ${SEEDS[0]}): ${ARCH_IDS.map(a => `${a} ${per[0].allDefByArch[a]}`).join(', ')}`);
console.log(`  my share by archetype (seed ${SEEDS[0]}): ${ARCH_IDS.map(a => `${a} ${per[0].myShareByArch[a]}`).join(', ')}`);
console.log(`  the field as the fleet lives it (mean, sd): ${POS.map(p => `${p} ${per.map(m => m.field[p].join('/')).join(' | ')}`).join('   ')}`);

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */
console.log('\nSections:');
if (!base.nba) exact('baseline', false, 'scripts/data/nbaAwardsSenseBaseline.json has no nba key: record it once with --record-nba-baseline');
else {
  /* R, the rival: my share of the head to head years stays where main had it. */
  heldAtMain('R', base.nba, per, 'myShare', 'my share of the head to head years, percent');
  /* H, the Hall: inducted and first ballot stay inside main's bands. */
  heldAtMain('H', base.nba, per, 'inducted', 'Hall of Fame inducted, percent');
  heldAtMain('H', base.nba, per, 'firstBallot', 'first ballot, percent');
  /* B6a, the award rates the old grades were set for, held where main had them. */
  for (const [key, label] of [['perCareer.MVP', 'MVPs a career'], ['perCareer.All-NBA', 'All-NBA a career'], ['perCareer.All-Defensive Team', 'All-Defensive a career'], ['perCareer.Finals MVP', 'Finals MVPs a career'], ['everMvp', 'careers with an MVP, percent'], ['everAllNba', 'careers with an All-NBA, percent']]) {
    heldAtMain('B6a', base.nba, per, key, label);
  }
}

/* C, the other sports did not move. A proof for one round, judged only when asked. */
if (!base.others) exact('C', false, 'the baseline has no others key: record it with --record-others');
else if (!PROVE_OTHERS) console.log('  note [C] other sports: not judged in a plain run (SENSE_PROVE_OTHERS=1 judges the hashes)');
else if (base.others.per !== OTHERS_PER || base.others.seeds.join() !== SEEDS.join()) exact('C', false, `the others baseline was recorded at ${base.others.per} careers on seeds ${base.others.seeds.join()}, this run is ${OTHERS_PER} on ${SEEDS.join()}`);
else for (const sport of Object.keys(OTHER)) {
  const same = others[sport].every((o, k) => o.hash === base.others.hashes[sport][k]);
  exact('C', same, `${sport.toUpperCase()} careers hash equal to the baseline on every seed (${others[sport].map(o => o.hash.slice(0, 8)).join(', ')})`);
}

const size = FULL ? 'full size' : 'quick run, bands not judged';
if (CONTROL) {
  /* A control must turn its own section red and no other. Exit 1 when it did (red by design), 3 when it did not. */
  const want = CONTROLS[CONTROL].needs.split(',');
  const red = [...failedSections];
  const fired = want.every(s => red.includes(s)) && red.every(s => want.includes(s));
  console.log(`\ncontrol ${CONTROL}: ${fired ? `FIRED, red in ${red.join(', ')} and nowhere else` : `DID NOT FIRE AS DESIGNED, wanted red in ${want.join(', ')} only, got ${red.join(', ') || 'nothing'}`}`);
  console.log(`simNbaAwardsSense: ${checks} checks, ${failed} failed (${size}, control ${CONTROL}), ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  process.exit(fired ? 1 : 3);
}
console.log(`\n${failed ? `red sections: ${[...failedSections].join(', ')}\n` : ''}simNbaAwardsSense: ${checks} checks, ${failed} failed (${size}), ${((Date.now() - t0) / 1000).toFixed(0)}s`);
process.exit(failed ? 1 : 0);
