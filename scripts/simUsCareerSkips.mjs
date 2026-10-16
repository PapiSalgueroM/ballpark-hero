/**
 * Round 1346 harness: the two Skips of the four US road to the draft journeys that a player could regret.
 *
 * Player report (/nba-my-career, 2026-10-16): "i accidentl ckilicke3d skipp". The showcase "Skip it" is the one Skip
 * on these pages that costs the career something (draft stock -2, saved at once). It draws nothing and reveals
 * nothing (no drill, no grade), so its undo can be exact: preDraftUndoSkip gives back the state before the skip,
 * key for key. A graded approach ("Go all out", "Play it safe") reads one keyed grade, so undoing one would be a
 * free second look at it: preDraftCanUndoSkip never offers that. Draft night's "Skip to the end" costs nothing but
 * the night, which cannot be played again after a reload, so the mount that played it offers "Watch it again"
 * (never saved, and not offered under reduced motion, where the night starts on its last frame).
 *
 *   1. Engine, every sport and era descriptor (8), the 2,000 roads of simCareerPreDraft's seed set a (the same road
 *      builder and seeds, up to the showcase), plus each descriptor's first road at the edge stocks 0, 1, 2, 99 and
 *      100 (a skip from 0 or 1 is clamped, so its move is not -2): the skip and its undo give the pre skip state to
 *      the byte; nothing is offered before the skip, after a graded approach or after Draft day, and the undo hands
 *      those states back untouched; Math.random throws the whole time. The clamped skips are counted and must exist.
 *   2. Board, src/test/usCareerReports1346.test.tsx: all of it passes as it is, and with preDraftUndoSkip swapped for
 *      one that returns its input exactly the four "Undo skip puts the save back" cases fail (one per sport).
 *   3. The night, the same file: with DraftNightSequence swapped for one without "Watch it again" exactly the four
 *      replay cases fail; with ProspectJourney swapped for one that offers it under reduced motion exactly the four
 *      reduced motion cases fail.
 *
 * Controls (US_CAREER_SKIPS_CONTROL), one anchor edit of src/lib/careerPreDraft.ts in the bundle only, asserted
 * present once first. A control that fires exits 1 with its last line "CONTROL <name> FIRED"; one that does not
 * exits 2.
 *   noundo   the undo hands back its input        -> section 1
 *   leak     the undo keeps the skipped stock      -> section 1
 *   graded   the undo is offered after any approach -> section 1 (graded showcases)
 *   clamp    the undo adds back the table's 2, not the clamped move -> section 1 (the edge stocks only)
 *
 * Measured on a GitHub runner (rc r1346-s5, head fd0565ad): 16,040 showcase states, 1,099 of them clamped skips
 * (the roads reach a stock of 0 or 1 on their own, not only the edge states); the board file 16 of 16 green and
 * exactly the 4 undo cases red under the swap; 18 seconds. Controls: noundo and graded 16,040 states red, leak
 * 15,233 (a skip clamped to 0 leaves nothing to keep), clamp 1,099 (exactly the clamped skips).
 * Nothing here reaches the network. Run: node scripts/simUsCareerSkips.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'src/lib/careerPreDraft.ts';
const BOARD_TEST = 'src/test/usCareerReports1346.test.tsx';
const N = 2000;
const SEEDSET = 'a';
const control = process.env.US_CAREER_SKIPS_CONTROL || '';
const NIGHT = 'src/components/career/DraftNightSequence.tsx', JOURNEY = 'src/components/us-career/ProspectJourney.tsx';
const replayButton = '        {over && onReplay && <Button variant="outline" className="min-h-11 w-full whitespace-normal" onClick={onReplay} data-night-replay>Watch it again</Button>}\n';
const motionGuard = 'onReplay={lessMotion() ? undefined : () => {';
const CONTROLS = {
  noundo: ['  if (!preDraftCanUndoSkip(prev) || !prev.showcase) return prev;', '  if (prev) return prev;'],
  leak: ['  return { ...prev, stock: prev.stock - prev.showcase.stockDelta, showcase: null', '  return { ...prev, stock: prev.stock, showcase: null'],
  graded: ["return s.phase === 'draft' && s.showcase?.approach === 'skip' && s.draft === null && !s.combine;", "return s.phase === 'draft' && !!s.showcase && s.draft === null && !s.combine;"],
  clamp: ['stock: prev.stock - prev.showcase.stockDelta,', 'stock: prev.stock - SKIP_DELTA,'],
};
assert.ok(!control || control in CONTROLS, `Known control (${Object.keys(CONTROLS).join(', ')})`);
const engineAbs = path.join(ROOT, ENGINE).replace(/\\/g, '/');
const engineSrc = fs.readFileSync(engineAbs, 'utf8').replaceAll('\r\n', '\n');
for (const [anchor, replacement] of Object.values(CONTROLS)) {
  assert.equal(engineSrc.split(anchor).length - 1, 1, 'Control anchor held once');
  assert.notEqual(engineSrc.replace(anchor, () => replacement), engineSrc, 'Control changes the engine');
}

let failures = 0;
const red = { 1: new Set(), 2: new Set(), 3: new Set() };
const fail = (section, who, m) => {
  failures += 1;
  if (!red[section].has(who) && red[section].size < 5) console.error(`  FAIL [section ${section}] ${who}: ${m}`);
  red[section].add(who);
};

/* ---------- the engine and the four descriptors, the simCareerPreDraft way ---------- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-undo-'));
const lib = f => path.join(ROOT, 'src/lib', f).replace(/\\/g, '/');
fs.writeFileSync(path.join(TMP, 'entry.ts'), [
  `export * from '${lib('careerPreDraft.ts')}';`,
  `export { keyedRng } from '${lib('keyedRng.ts')}';`,
  `export { nflPreDraftDescriptor } from '${lib('nflCareerPreDraft.ts')}';`,
  `export { nbaPreDraftDescriptor } from '${lib('nbaCareerPreDraft.ts')}';`,
  `export { mlbPreDraftDescriptor } from '${lib('mlbCareerPreDraft.ts')}';`,
  `export { nhlPreDraftDescriptor } from '${lib('nhlCareerPreDraft.ts')}';`,
].join('\n'));
const controlPlugin = {
  name: 'showcase-undo-control',
  setup(b) {
    if (!control) return;
    b.onLoad({ filter: /careerPreDraft\.ts$/ }, args => {
      if (args.path.replace(/\\/g, '/') !== engineAbs) return undefined;
      return { contents: engineSrc.replace(CONTROLS[control][0], () => CONTROLS[control][1]), loader: 'ts' };
    });
  },
};
await esbuild.build({
  entryPoints: [path.join(TMP, 'entry.ts')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'bundle.mjs'),
  logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins: [controlPlugin],
});
if (/supabase\.co/.test(fs.readFileSync(path.join(TMP, 'bundle.mjs'), 'utf8'))) { console.error('The bundle reaches the live database host. Refusing to run.'); process.exit(2); }
const M = await import(pathToFileURL(path.join(TMP, 'bundle.mjs')).href);
fs.rmSync(TMP, { recursive: true, force: true });
assert.equal(typeof M.preDraftUndoSkip, 'function', 'The engine exports preDraftUndoSkip');

const DESCS = [
  M.nflPreDraftDescriptor('now'), M.nflPreDraftDescriptor('y2005'),
  M.nbaPreDraftDescriptor('now'), M.nbaPreDraftDescriptor('y2004'),
  M.mlbPreDraftDescriptor('now'), M.mlbPreDraftDescriptor('y2004'),
  M.nhlPreDraftDescriptor('now'), M.nhlPreDraftDescriptor('y2006'),
];
const tag = d => `${d.sport}:${d.eraId}`;
const POS = { nfl: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'], nba: ['PG', 'SG', 'SF', 'PF', 'C'], mlb: ['SP', 'RP', 'C', 'SS', 'CF'], nhl: ['C', 'LW', 'D', 'G'] };
/** simCareerPreDraft's road, the same keyed inputs and seeds, stopped at the showcase. */
function preShowcase(desc, i) {
  const pick = M.keyedRng(`sim|${SEEDSET}|${tag(desc)}|${i}`);
  const route = desc.routes[Math.floor(pick() * desc.routes.length)];
  const rating = 58 + Math.floor(pick() * 21);
  const pos = POS[desc.sport][Math.floor(pick() * POS[desc.sport].length)];
  let s = M.preDraftStart(desc, { seed: `${SEEDSET}-${i}`, routeId: route.id, rating, pot: rating + 4 + Math.floor(pick() * 16), pos });
  for (let g = 0; g < 20 && s.phase !== 'showcase'; g += 1) {
    if (s.phase === 'season') s = M.preDraftPlaySeason(desc, s);
    else { const card = M.preDraftChoicePool(desc).find(c => c.id === s.pendingChoice); s = M.preDraftChoose(desc, s, Math.floor(pick() * card.options.length)); }
  }
  return s;
}
const J = v => JSON.stringify(v);

/* ---------- section 1: the engine ---------- */
console.log(`1) The engine: ${DESCS.length} descriptors, ${N} roads each (seed set ${SEEDSET}) plus five edge stocks${control ? `, control ${control}` : ''}`);
const realRandom = Math.random;
Math.random = () => { throw new Error('the showcase undo drew from Math.random'); };
let states = 0, clamped = 0;
try {
  for (const d of DESCS) {
    const pres = [];
    for (let i = 0; i < N; i++) pres.push(preShowcase(d, i));
    for (const stock of [0, 1, 2, 99, 100]) pres.push({ ...pres[0], stock });
    pres.forEach((pre, i) => {
      const who = `${tag(d)} #${i}`;
      if (pre.phase !== 'showcase') { fail(1, who, `the road stopped at ${pre.phase}`); return; }
      states += 1;
      const preJson = J(pre);
      if (M.preDraftCanUndoSkip(pre) || M.preDraftUndoSkip(pre) !== pre) fail(1, who, 'an undo is offered before the showcase');
      const skipped = M.preDraftShowcase(d, pre, 'skip');
      if (skipped.showcase.stockDelta !== M.SKIP_DELTA) clamped += 1;
      if (!M.preDraftCanUndoSkip(skipped)) fail(1, who, 'a skipped showcase is not offered its undo');
      if (J(M.preDraftUndoSkip(skipped)) !== preJson) fail(1, who, 'the undo is not the state before the skip, to the byte');
      for (const approach of ['allout', 'steady']) {
        const graded = M.preDraftShowcase(d, pre, approach);
        if (M.preDraftCanUndoSkip(graded) || M.preDraftUndoSkip(graded) !== graded) fail(1, who, `an undo is offered after ${approach}`);
      }
      const drafted = M.preDraftRunDraft(d, skipped);
      if (M.preDraftCanUndoSkip(drafted) || M.preDraftUndoSkip(drafted) !== drafted) fail(1, who, 'an undo is offered after Draft day');
      if (J(pre) !== preJson) fail(1, who, 'a call mutated the state it was handed');
    });
  }
} finally {
  Math.random = realRandom;
}
if (clamped === 0) fail(1, 'fleet', 'no skip was clamped, so the clamped move was never undone');
const section1Line = `   ${states} showcase states, ${clamped} of them clamped skips: ${red[1].size === 0 ? 'every skip undone to the byte, nothing offered elsewhere' : `${red[1].size} states red`}`;

/* ---------- sections 2 and 3: the board file, as it is and with one piece taken out ---------- */
const SPORT_IDS = ['nfl', 'nba', 'mlb', 'nhl'];
const UNDO_FAILS = SPORT_IDS.map(s => `${s}: Undo skip puts the save back to the byte, survives a reload, and is gone after Draft day`);
const REPLAY_FAILS = SPORT_IDS.map(s => `${s}: Skip to the end, then Watch it again plays the night again and saves nothing`);
const MOTION_FAILS = SPORT_IDS.map(s => `${s}: under reduced motion the night ends on its last frame with nothing to watch again`);
const sourceOf = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
/* Each swap is [module specifier, file, anchor, replacement]; the anchor must be held once. */
const SWAPS = {
  noundo: ['@/lib/careerPreDraft', ENGINE, CONTROLS.noundo[0], CONTROLS.noundo[1]],
  noreplay: ['@/components/career/DraftNightSequence', NIGHT, replayButton, ''],
  motion: ['@/components/us-career/ProspectJourney', JOURNEY, motionGuard, 'onReplay={false ? undefined : () => {'],
};
for (const [, file, anchor] of Object.values(SWAPS)) assert.equal(sourceOf(file).split(anchor).length - 1, 1, `Swap anchor held once in ${file}`);
function boardRun(swapName) {
  fs.mkdirSync(path.join(ROOT, '.sim-control'), { recursive: true });
  const dir = fs.mkdtempSync(path.join(ROOT, '.sim-control/us-skips-vitest-'));
  try {
    const env = { ...process.env, VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
    delete env.NO_DOUBLE_SWAP;
    if (swapName) {
      const [specifier, file, anchor, replacement] = SWAPS[swapName];
      const folderAlias = specifier.slice(0, specifier.lastIndexOf('/') + 1);
      const original = sourceOf(file), changed = original.replace(anchor, () => replacement);
      assert.notEqual(changed, original, `Swap ${swapName} changes ${file}`);
      const copy = path.join(dir, path.basename(file));
      fs.writeFileSync(copy, changed.replace(/(from\s+['"])\.\//g, `$1${folderAlias}`));
      env.NO_DOUBLE_SWAP = JSON.stringify({ [specifier]: copy });
    }
    const report = path.join(dir, 'report.json');
    const run = spawnSync(process.execPath, ['--require', path.join(ROOT, 'scripts/lib/offlineTransport.cjs'),
      path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', BOARD_TEST, '--reporter=json', `--outputFile.json=${report}`,
      '--maxWorkers=1', '--no-file-parallelism', '--testTimeout=120000'], { cwd: ROOT, env, encoding: 'utf8', timeout: 300000, maxBuffer: 16 * 1024 * 1024 });
    assert.ok(!run.error && !run.signal, 'vitest finished normally');
    const json = JSON.parse(fs.readFileSync(report, 'utf8'));
    return { status: run.status, rows: json.testResults.flatMap(f => f.assertionResults), unhandled: Number(json.numUnhandledErrors ?? 0) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
console.log(section1Line);
if (control) {
  console.log('2) and 3) skipped under a control (the controls aim at section 1)');
} else {
  const plain = boardRun('');
  const passed = plain.rows.filter(r => r.status === 'passed').length;
  if (plain.status !== 0 || plain.unhandled || plain.rows.length === 0 || passed !== plain.rows.length) fail(2, 'plain', `${passed} of ${plain.rows.length} passed, exit ${plain.status}`);
  console.log(`   ${BOARD_TEST}: ${passed}/${plain.rows.length} pass as it is`);
  for (const [name, section, want, what] of [
    ['noundo', 2, UNDO_FAILS, 'the undo handing back its input'],
    ['noreplay', 3, REPLAY_FAILS, 'no Watch it again on the night'],
    ['motion', 3, MOTION_FAILS, 'Watch it again offered under reduced motion'],
  ]) {
    const run = boardRun(name);
    const failed = run.rows.filter(r => r.status === 'failed').map(r => r.title).sort();
    if (run.status !== 1 || run.rows.length !== plain.rows.length || J(failed) !== J([...want].sort())) fail(section, name, `failed ${J(failed)}`);
    console.log(`${section}) with ${what}: ${failed.length} fail, ${J(failed) === J([...want].sort()) ? `exactly the ${want.length} named` : 'NOT the named cases'}`);
  }
}

if (control) {
  const fired = red[1].size > 0;
  console.log(fired ? `CONTROL ${control} FIRED: section 1 red on ${red[1].size} states` : `CONTROL ${control} DID NOT FIRE: section 1 stayed green`);
  process.exit(fired ? 1 : 2);
}
console.log(failures === 0 ? 'PASS: ALL US CAREER SKIP CHECKS PASSED' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
