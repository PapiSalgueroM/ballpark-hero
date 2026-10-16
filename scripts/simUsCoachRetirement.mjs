/**
 * Round 1346 harness: a US coaching career the player can end, in all four sports.
 *
 * Player report (/nba-my-career, 2026-10-16): "No option to retire or autoretirement in Manager Mode". The coach
 * panel now has Retire from coaching; retireCoachCareer sets `done` and a done career hands its input back from
 * every season, offer and market call. No age rule (cut by the lead): nothing ends a coaching career but the player.
 *
 * Fleet: US_COACH_RETIRE_CAREERS playing careers per sport (default 300) through the real engines on the seeded
 * stream, retired, then coached on a fixed policy (unemployed: take the first offer, else sit out) for a number of
 * steps drawn per career (0 to 40), on two engines fed the same per career stream: the HEAD engine and BASE, which
 * is the head with this round's five hunks stripped (scripts/lib/usCoachRetireHunks.mjs, the simUsCoachPoaching way:
 * no commit sha, so it stays true until somebody edits those hunks). Then the head retires the career.
 *
 *   2. Byte identity: after every step before the retirement the head state, its notes and its draws equal BASE's,
 *      and the retired state equals BASE's state with `done: true`, key for key, with no draw.
 *   3. The guards: on every retired state playCoachSeason, sitOutCoachSeason, acceptCoachOffer and
 *      refreshCoachOffers hand their input back and the counting stream records no draw. The fleet must hold
 *      retired careers that were employed and retired careers holding offers, or the guards were never bitten.
 *   4. The vitest files that hold the coach (PR281's src/test/usCoachRetirement.test.tsx and the board test
 *      src/test/usCareerReports1346.test.tsx) pass as they are, and with retireCoachCareer swapped for one that
 *      returns its input they fail exactly the named cases; with the panel's settle (useTapSettle, review F3) always
 *      settled exactly the four "second click right after the retirement" cases fail.
 * (Sections 1 and 5 of the brief were the age rule and its spread; the lead cut the rule, so they are not here.)
 *
 * Controls (US_COACH_RETIRE_CONTROL), each a one anchor edit of an isolated copy of the head engine, asserted present
 * once first. A control that fires exits 1 with its last line "CONTROL <name> FIRED"; one that does not exits 2.
 *   drift     retireCoachCareer also moves the year on         -> section 2
 *   early     playCoachSeason's guard also bites at 3 seasons  -> section 2 (the steps before the retirement)
 *   noretire  retireCoachCareer returns its input              -> section 2
 *   noguard   playCoachSeason's guard removed                  -> section 3 (employed retired careers)
 *   nosit     sitOutCoachSeason's guard removed                -> section 3
 *   noaccept  acceptCoachOffer's guard removed                 -> section 3 (retired careers holding offers)
 *   norefresh refreshCoachOffers's guard removed               -> section 3
 *
 * Measured on a GitHub runner (rc r1346-s4, head 7448fefd, 300 careers a sport): 5,989, 5,940, 5,784 and 6,056
 * coaching steps before the retirement (NFL, NBA, MLB, NHL); 902 careers retired while employed and 298 out of
 * work, 146 of those holding offers, 54 before a first season; 12 seconds. Every control fired: early 940 careers
 * red, drift, noretire, noguard, nosit and norefresh all 1,200, noaccept 146 (exactly the retired careers that held
 * an offer). Exact rules, not statistics: no band here can move with the seed.
 * Nothing here reaches the network. Run: node scripts/simUsCoachRetirement.mjs
 */
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { stripRetireHunks } from './lib/usCoachRetireHunks.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'src/lib/usCoachCareer.ts';
const PER_SPORT = Number(process.env.US_COACH_RETIRE_CAREERS || 300);
const SPORTS = ['nfl', 'nba', 'mlb', 'nhl'];
const control = process.env.US_COACH_RETIRE_CONTROL || '';

const retireLine = '  return prev.done ? prev : { ...prev, done: true };';
const playGuard = '  if (prev.done) return { state: prev, notes: [] };\n  const s: CoachCareerState = { ...prev, results: [...prev.results], profile:';
const sitGuard = '  if (prev.done) return { state: prev, notes: [] };\n  const s: CoachCareerState = { ...prev, results: [...prev.results] };';
const acceptGuard = '  if (prev.done) return prev;\n  const offer = prev.offers[index];';
const refreshGuard = "): void {\n  if (s.done) return;\n";
const CONTROLS = {
  drift: [retireLine, '  return prev.done ? prev : { ...prev, done: true, year: prev.year + 1 };', 2],
  early: [playGuard, playGuard.replace('if (prev.done)', 'if (prev.done || prev.results.length === 3)'), 2],
  noretire: [retireLine, '  return prev;', 2],
  noguard: [playGuard, playGuard.replace('  if (prev.done) return { state: prev, notes: [] };\n', ''), 3],
  nosit: [sitGuard, sitGuard.replace('  if (prev.done) return { state: prev, notes: [] };\n', ''), 3],
  noaccept: [acceptGuard, acceptGuard.replace('  if (prev.done) return prev;\n', ''), 3],
  norefresh: [refreshGuard, '): void {\n', 3],
};
assert.ok(!control || control in CONTROLS, `Known control (${Object.keys(CONTROLS).join(', ')})`);

const source = (await readFile(path.join(ROOT, ENGINE), 'utf8')).replaceAll('\r\n', '\n');
for (const [anchor, replacement] of Object.values(CONTROLS)) {
  assert.equal(source.split(anchor).length - 1, 1, 'Control anchor held once');
  assert.notEqual(source.replace(anchor, () => replacement), source, 'Control changes the engine');
}
const base = stripRetireHunks(source);
const head = control ? source.replace(CONTROLS[control][0], () => CONTROLS[control][1]) : source;

let failures = 0;
const red = { 2: new Set(), 3: new Set(), 4: new Set() };
const fail = (section, who, m) => {
  failures += 1;
  if (!red[section].has(who) && red[section].size < 5) console.error(`  FAIL [section ${section}] ${who}: ${m}`);
  red[section].add(who);
};

/* ---------- the two engines, built from isolated copies ---------- */
await mkdir(path.join(ROOT, '.sim-control'), { recursive: true });
const folder = await mkdtemp(path.join(ROOT, '.sim-control/us-coach1346-'));
const resolveCopies = text => text.replace(/(from\s+['"])\.\//g, '$1@/lib/');
let E;
try {
  await writeFile(path.join(folder, 'head.ts'), resolveCopies(head));
  await writeFile(path.join(folder, 'base.ts'), resolveCopies(base));
  const lib = rel => `${ROOT.replaceAll('\\', '/')}/src/lib/${rel}`;
  await writeFile(path.join(folder, 'entry.mjs'), [
    'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
    "export * as head from './head.ts';",
    "export * as base from './base.ts';",
    `export * as nfl from '${lib('nflMyCareer.ts')}';`,
    `export * as nba from '${lib('nbaMyCareer.ts')}';`,
    `export * as mlb from '${lib('mlbMyCareer.ts')}';`,
    `export * as nhl from '${lib('nhlMyCareer.ts')}';`,
  ].join('\n'));
  const built = await build({
    entryPoints: [path.join(folder, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node',
    outfile: path.join(folder, 'bundle.mjs'), logLevel: 'error', absWorkingDir: ROOT,
    alias: { '@': path.join(ROOT, 'src') }, metafile: true,
  });
  assert.ok(!Object.keys(built.metafile.inputs).some(f => f.includes('supabase')), 'No database client in the bundle');
  E = await import(pathToFileURL(path.join(folder, 'bundle.mjs')).href);
} finally {
  await rm(folder, { recursive: true, force: true });
}
assert.equal(typeof E.head.retireCoachCareer, 'function', 'The head engine exports retireCoachCareer');
assert.equal(E.base.retireCoachCareer, undefined, 'BASE is the engine before the round');

/* ---------- a real playing career, the simUsCoachCareer way ---------- */
const PLAYERS = {
  nfl: { pos: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'], arch: e => e.ARCHETYPES, start: e => e.startCareer, roll: e => e.rollTeamQuality, season: e => e.simSeason, progress: e => e.progress, done: e => e.shouldRetire },
  nba: { pos: ['PG', 'SG', 'SF', 'PF', 'C'], arch: e => e.NBA_ARCHETYPES, start: e => e.startNbaCareer, roll: e => e.nbaRollTeamQuality, season: e => e.simNbaSeason, progress: e => e.nbaProgress, done: e => e.nbaShouldRetire },
  mlb: { pos: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'], arch: e => e.MLB_ARCHETYPES, start: e => e.startMlbCareer, roll: e => e.mlbRollTeamQuality, season: e => e.simMlbSeason, progress: e => e.mlbProgress, done: e => e.mlbShouldRetire },
  nhl: { pos: ['C', 'LW', 'RW', 'D', 'G'], arch: e => e.NHL_ARCHETYPES, start: e => e.startNhlCareer, roll: e => e.nhlRollTeamQuality, season: e => e.simNhlSeason, progress: e => e.nhlProgress, done: e => e.nhlShouldRetire },
};
function playCareer(sport) {
  const e = E[sport], P = PLAYERS[sport];
  const pos = P.pos[Math.floor(Math.random() * P.pos.length)];
  const list = P.arch(e)[pos];
  const c = P.start(e)('Sim', pos, list[Math.floor(Math.random() * list.length)], Math.random, null);
  let tq = null, guard = 0;
  while (!c.retired && guard++ < 30) {
    tq = P.roll(e)(tq, Math.random);
    P.season(e)(c, tq, Math.random);
    P.progress(e)(c, Math.random);
    if (P.done(e)(c)) c.retired = true;
  }
  c.retired = true;
  return c;
}

/* One stream per career, two identical copies (head and BASE), each counting its draws. */
function stream(seed) {
  let s = seed >>> 0, draws = 0;
  const draw = () => { draws += 1; s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { draw, count: () => draws };
}
const J = v => JSON.stringify(v);
const noDraw = fn => {
  const real = Math.random;
  Math.random = () => { throw new Error('a retired coaching career drew from Math.random'); };
  try { return fn(); } finally { Math.random = real; }
};

/* ---------- sections 2 and 3, over the fleet ---------- */
console.log(`Fleet: ${PER_SPORT} careers per sport, head engine${control ? ` with control ${control}` : ''} against BASE (hunks stripped)`);
const tally = { careers: 0, steps: 0, beforeFirstSeason: 0, employedDone: 0, offersDone: 0, unemployedDone: 0 };
for (const sport of SPORTS) {
  const H = E.head, B = E.base;
  let sportSteps = 0;
  for (let i = 0; i < PER_SPORT; i++) {
    const who = `${sport} #${i}`;
    const career = playCareer(sport);
    const seed = Math.floor(Math.random() * 2 ** 32), stop = Math.floor(Math.random() * 41);
    const hr = stream(seed), br = stream(seed);
    let h = H.startCoachCareer(sport, JSON.parse(J(career)), career.year, hr.draw);
    let b = B.startCoachCareer(sport, JSON.parse(J(career)), career.year, br.draw);
    if (J(h) !== J(b)) fail(2, who, 'the coaching career starts differently from BASE');
    for (let step = 0; step < stop && J(h) === J(b); step++) {
      let hn = [], bn = [];
      if (b.unemployed && b.offers.length) {
        h = H.acceptCoachOffer(h, 0); b = B.acceptCoachOffer(b, 0);
      } else {
        const fn = b.unemployed ? 'sitOutCoachSeason' : 'playCoachSeason';
        const ho = H[fn](h, hr.draw), bo = B[fn](b, br.draw);
        h = ho.state; hn = ho.notes; b = bo.state; bn = bo.notes;
      }
      sportSteps += 1;
      if (J(h) !== J(b)) fail(2, who, `step ${step + 1}: the head state differs from BASE before any retirement`);
      else if (J(hn) !== J(bn)) fail(2, who, `step ${step + 1}: the head notes differ from BASE`);
      else if (hr.count() !== br.count()) fail(2, who, `step ${step + 1}: ${hr.count()} draws on the head, ${br.count()} on BASE`);
    }
    if (J(h) !== J(b)) continue;
    if (h.results.length === 0) tally.beforeFirstSeason += 1;
    const held = J(h), drawsBefore = hr.count();
    let done;
    try { done = noDraw(() => H.retireCoachCareer(h)); } catch (err) { fail(2, who, `retiring drew: ${err.message}`); continue; }
    if (J(h) !== held) fail(2, who, 'retiring changed the state it was handed');
    if (J(done) !== J({ ...b, done: true })) fail(2, who, 'the retired state is not BASE with done set');
    if (J(noDraw(() => H.retireCoachCareer(done))) !== J(done)) fail(2, who, 'retiring twice is not retiring once');
    if (!done.done) continue;

    /* Section 3: every call on a retired career hands its input back without a draw. */
    if (done.job && !done.unemployed) tally.employedDone += 1; else tally.unemployedDone += 1;
    if (done.offers.length) tally.offersDone += 1;
    const doneJson = J(done);
    const played = H.playCoachSeason(done, hr.draw);
    if (played.state !== done || played.notes.length !== 0) fail(3, who, 'playCoachSeason moved a retired career');
    const sat = H.sitOutCoachSeason(done, hr.draw);
    if (sat.state !== done || sat.notes.length !== 0) fail(3, who, 'sitOutCoachSeason moved a retired career');
    if (H.acceptCoachOffer(done, 0) !== done) fail(3, who, 'acceptCoachOffer moved a retired career');
    const copy = JSON.parse(doneJson);
    H.refreshCoachOffers(copy, hr.draw);
    if (J(copy) !== doneJson) fail(3, who, 'refreshCoachOffers moved a retired career');
    if (hr.count() !== drawsBefore) fail(3, who, `${hr.count() - drawsBefore} draws on a retired career`);
    if (J(done) !== doneJson) fail(3, who, 'a call mutated the retired state');
  }
  tally.careers += PER_SPORT; tally.steps += sportSteps;
  console.log(`  ${sport}: ${PER_SPORT} careers, ${sportSteps} coaching steps before the retirement`);
}
console.log(`  retired: ${tally.employedDone} while employed, ${tally.unemployedDone} out of work (${tally.offersDone} holding offers), ${tally.beforeFirstSeason} before a first season`);
/* The guards have to have been bitten for section 3 to mean anything. */
if (tally.employedDone === 0) fail(3, 'fleet', 'no career retired while employed, so the play guard was never tried');
if (tally.offersDone === 0) fail(3, 'fleet', 'no retired career held an offer, so the accept guard was never tried');
console.log(`2) Byte identity with BASE: ${red[2].size === 0 ? 'held' : `${red[2].size} careers red`}`);
console.log(`3) Retired careers hand their input back: ${red[3].size === 0 ? 'held' : `${red[3].size} careers red`}`);

/* ---------- section 4: the unit and board files, as they are and with retirement taken out ---------- */
const PR281 = 'src/test/usCoachRetirement.test.tsx', BOARD = 'src/test/usCareerReports1346.test.tsx';
const NORETIRE_FAILS = [
  'retiring changes only done and is pure and idempotent',
  'retirement requires confirmation and accepts once after cancel and escape',
  ...SPORTS.map(s => `${s}: Keep coaching and Escape save nothing, Retire saves only done, and a reload stays retired`),
  ...SPORTS.map(s => `${s}: a second click right after the retirement opens nothing on the done hub`),
];
/* The review's double click on the confirm (finding F3): with the panel's settle always settled, exactly these fail. */
const SETTLE_FAILS = SPORTS.map(s => `${s}: a second click right after the retirement opens nothing on the done hub`);
const PANEL = 'src/components/us-career/CoachCareerPanel.tsx';
const panelSource = (await readFile(path.join(ROOT, PANEL), 'utf8')).replaceAll('\r\n', '\n');
const settleLine = '  const retireSettle = useTapSettle();\n';
assert.equal(panelSource.split(settleLine).length - 1, 1, 'The panel settle anchor is held once');
/* PR281's 14, and the board file's ten cases per sport (three for the coach, three for the showcase undo, four for
   the draft night replay). */
const CASES = 14 + 10 * SPORTS.length;
async function vitest(swap) {
  await mkdir(path.join(ROOT, '.sim-control'), { recursive: true });
  const dir = await mkdtemp(path.join(ROOT, '.sim-control/us-coach1346-vitest-'));
  try {
    const env = { ...process.env, VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
    delete env.NO_DOUBLE_SWAP;
    if (swap === 'noretire') {
      const copy = path.join(dir, 'usCoachCareer.ts');
      await writeFile(copy, resolveCopies(source.replace(retireLine, () => '  return prev;')));
      env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/usCoachCareer': copy });
    } else if (swap === 'tilesettle') {
      const copy = path.join(dir, 'CoachCareerPanel.tsx'), changed = panelSource.replace(settleLine, () => '  const retireSettle = { mark: () => undefined, settled: () => true };\n');
      assert.notEqual(changed, panelSource, 'The tilesettle swap changes the panel');
      await writeFile(copy, changed);
      env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/us-career/CoachCareerPanel': copy });
    }
    const report = path.join(dir, 'report.json');
    const run = spawnSync(process.execPath, ['--require', path.join(ROOT, 'scripts/lib/offlineTransport.cjs'),
      path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', PR281, BOARD, '--reporter=json', `--outputFile.json=${report}`,
      '--maxWorkers=1', '--no-file-parallelism', '--testTimeout=120000'], { cwd: ROOT, env, encoding: 'utf8', timeout: 240000, maxBuffer: 16 * 1024 * 1024 });
    assert.ok(!run.error && !run.signal, 'vitest finished normally');
    const json = JSON.parse(await readFile(report, 'utf8'));
    return { status: run.status, rows: json.testResults.flatMap(f => f.assertionResults), unhandled: Number(json.numUnhandledErrors ?? 0) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
if (control) {
  console.log('4) skipped under a control (the controls aim at sections 2 and 3)');
} else {
  const plain = await vitest(null);
  if (plain.status !== 0 || plain.unhandled || plain.rows.length !== CASES || plain.rows.some(r => r.status !== 'passed')) {
    fail(4, 'plain', `${plain.rows.filter(r => r.status === 'passed').length} of ${plain.rows.length} passed (want ${CASES} of ${CASES}), exit ${plain.status}`);
  }
  const swapped = await vitest('noretire');
  const failed = swapped.rows.filter(r => r.status === 'failed').map(r => r.title).sort();
  if (swapped.status !== 1 || swapped.rows.length !== CASES || J(failed) !== J([...NORETIRE_FAILS].sort())) {
    fail(4, 'noretire', `failed ${J(failed)}, want ${J([...NORETIRE_FAILS].sort())}`);
  }
  console.log(`4) ${PR281} and ${BOARD}: ${plain.rows.filter(r => r.status === 'passed').length}/${CASES} pass as they are; with retireCoachCareer returning its input ${failed.length} fail, exactly the ${NORETIRE_FAILS.length} named`);
  const settled = await vitest('tilesettle');
  const settleFailed = settled.rows.filter(r => r.status === 'failed').map(r => r.title).sort();
  if (settled.status !== 1 || settled.rows.length !== CASES || J(settleFailed) !== J([...SETTLE_FAILS].sort())) {
    fail(4, 'tilesettle', `failed ${J(settleFailed)}, want ${J([...SETTLE_FAILS].sort())}`);
  }
  console.log(`4) with the panel's settle always settled ${settleFailed.length} fail, ${J(settleFailed) === J([...SETTLE_FAILS].sort()) ? `exactly the ${SETTLE_FAILS.length} named` : 'NOT the named cases'}`);
}

if (control) {
  const target = CONTROLS[control][2];
  const fired = red[target].size > 0;
  console.log(fired
    ? `CONTROL ${control} FIRED: section ${target} red on ${red[target].size} careers`
    : `CONTROL ${control} DID NOT FIRE: section ${target} stayed green`);
  process.exit(fired ? 1 : 2);
}
console.log(failures === 0 ? 'PASS: ALL US COACHING RETIREMENT CHECKS PASSED' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
