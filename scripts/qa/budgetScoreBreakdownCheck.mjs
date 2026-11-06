/* Remote-only actual Board/hook controls for BB-09. No pool or simulation edits. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

assert(process.env.CI, 'Remote qualification only');
const FILES = { hook: 'src/hooks/useBudgetBuilder.ts', board: 'src/components/budget-builder/BudgetBuilderBoard.tsx' };
const TEST = 'src/test/budgetScoreBreakdown.test.tsx';
const PINS = {
  "src/hooks/useBudgetBuilder.ts": "0220c215cb2530a632abc477810ec38b095982c7",
  "src/components/budget-builder/BudgetBuilderBoard.tsx": "f9111c2782f61ec9b976aee52baed4ae095f0d6b",
  "src/data/gameContent/soccer1.ts": "df18ce05e16f8fd8cefea188ca0fde7404303dfb",
  "src/test/budgetScoreBreakdown.test.tsx": "86de81375d764be5bf7a13642081495fe5c09927",
  "src/test/budgetSigning.test.tsx": "97cb3fa452184995a52a77381c7ecc45d25d2c03",
  "src/lib/squadDeal.ts": "726c554d99de4c285604e23cbe1d6def78477bcb",
  "src/lib/squadShape.ts": "b116f1dfb7cde01be9904c98e263c514bfc114aa",
  "src/lib/dartDraft.ts": "1dd73605180c08731cfe31335ea67aadfb259ac9",
  "src/lib/dateUtils.ts": "12c9de0ed37b0797492f3e936bcba70bdc03d585",
  "src/types/game.ts": "3a894340e0434cd3e5c7ebfce7d436eef131a3d6"
};
const TITLES = {
  "before": "BB_SCORE_BEFORE_FINAL itemizes earned points and an explicitly pending Final",
  "boundary": "BB_SCORE_SAVINGS keeps the exact floor at 199 200 and 201 million remaining",
  "demand": "BB_SCORE_DEMAND awards ten only when the completed XI meets its real daily demand",
  "win": "BB_SCORE_WIN displays the actual three-leg win bonus and exact total",
  "draw": "BB_SCORE_DRAW displays five for an actual drawn Final",
  "loss": "BB_SCORE_LOSS displays zero for an actual lost Final",
  "replacement": "BB_SCORE_REPLACEMENT previews a quality gain offset by losing a savings point",
  "refund": "BB_SCORE_REFUND uses the original signing refund and reconciles the committed total",
  "reset": "BB_SCORE_SERIES_RESET removes an old Final bonus from a replacement projection",
  "quiet": "BB_SCORE_PRESERVE keeps incomplete and complete preview inspection unscored and read only"
};
const FAULTS = [
  {
    "name": "omit-overview",
    "failed": [
      "before",
      "boundary",
      "demand",
      "win",
      "draw",
      "loss",
      "refund",
      "reset"
    ],
    "file": "board",
    "anchor": "            <ScoreBreakdown label=\"Score breakdown\" points={scoreParts} outcome={series?.outcome ?? null} />",
    "replacement": "            {null}"
  },
  {
    "name": "omit-preview",
    "failed": [
      "replacement",
      "refund",
      "reset"
    ],
    "file": "board",
    "anchor": "              <ScoreBreakdown label=\"Score impact after signing\" points={afterScoreParts} outcome={null} change={afterScoreParts.total - finalScore} />",
    "replacement": "              {null}"
  },
  {
    "name": "round-savings",
    "failed": [
      "boundary",
      "replacement",
      "refund"
    ],
    "file": "hook",
    "anchor": "  const savings = Math.floor(Math.max(0, remaining) / 200);",
    "replacement": "  const savings = Math.round(Math.max(0, remaining) / 200);"
  },
  {
    "name": "always-demand",
    "failed": [
      "demand"
    ],
    "file": "hook",
    "anchor": "  const demand = criterionMet ? 10 : 0;",
    "replacement": "  const demand = 10;"
  },
  {
    "name": "draw-win-bonus",
    "failed": [
      "draw"
    ],
    "file": "hook",
    "anchor": "  const series = seriesOutcome === 'win' ? 15 : seriesOutcome === 'draw' ? 5 : 0;",
    "replacement": "  const series = seriesOutcome === 'win' ? 15 : seriesOutcome === 'draw' ? 15 : 0;"
  },
  {
    "name": "ignore-refund",
    "failed": [
      "refund",
      "reset"
    ],
    "file": "board",
    "anchor": "    remaining: afterRemaining, criterionMet: afterCondition, seriesOutcome: null,",
    "replacement": "    remaining: remaining - (choice?.marketValue ?? 0), criterionMet: afterCondition, seriesOutcome: null,"
  },
  {
    "name": "carry-old-series",
    "failed": [
      "reset"
    ],
    "file": "board",
    "anchor": "    remaining: afterRemaining, criterionMet: afterCondition, seriesOutcome: null,",
    "replacement": "    remaining: afterRemaining, criterionMet: afterCondition, seriesOutcome: series?.outcome ?? null,"
  },
  {
    "name": "cancel-releases",
    "failed": [
      "quiet"
    ],
    "file": "board",
    "anchor": "  const cancelPreview = () => {\n    setChoice(null);",
    "replacement": "  const cancelPreview = () => {\n    if (activeSlot !== null) release(activeSlot);\n    setChoice(null);"
  }
];
const INVERSE = {
  "insert": "export function budgetScoreBreakdown({\n  complete, teamRating, remaining, criterionMet, seriesOutcome,\n}: {\n  complete: boolean; teamRating: number; remaining: number; criterionMet: boolean;\n  seriesOutcome: SeriesResult['outcome'] | null;\n}) {\n  if (!complete) return { quality: 0, savings: 0, demand: 0, series: 0, total: 0 };\n  const quality = teamRating;\n  const savings = Math.floor(Math.max(0, remaining) / 200);\n  const demand = criterionMet ? 10 : 0;\n  const series = seriesOutcome === 'win' ? 15 : seriesOutcome === 'draw' ? 5 : 0;\n  return { quality, savings, demand, series, total: quality + savings + demand + series };\n}\n\n",
  "functionAnchor": "export function useBudgetBuilder(): BudgetBuilderState {",
  "guard": "    if (!complete) return 0;\n",
  "oldCalc": "    let s = teamRating + Math.floor(Math.max(0, remaining) / 200);\n    if (criterionMet) s += 10;\n    if (series) s += series.outcome === 'win' ? 15 : series.outcome === 'draw' ? 5 : 0;\n    return s;",
  "newCalc": "    return budgetScoreBreakdown({\n      complete, teamRating, remaining, criterionMet, seriesOutcome: series?.outcome ?? null,\n    }).total;",
  "inverseExact": true
};
const keys = Object.keys(TITLES);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = value => { const body = Buffer.from(value); return createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + body.length + '\0'), body])).digest('hex'); };
const capturePins = () => Object.fromEntries(Object.keys(PINS).map(file => {
  const body = fs.readFileSync(file); return [file, { blob: blob(body), sha256: sha(body), bytes: body.length }];
}));
const requirePins = pins => { for (const [file, expected] of Object.entries(PINS)) assert.equal(pins[file].blob, expected, 'Exact held input: ' + file); };
const absolute = name => { const value = process.env[name]; assert(value && path.isAbsolute(value), name + ' must be absolute'); return value; };
const before = capturePins(); requirePins(before);
const fixed = Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]));
const original = {
  hook: fs.readFileSync(absolute('BB_SCORE_ORIGINAL_HOOK'), 'utf8'),
  board: fs.readFileSync(absolute('BB_SCORE_ORIGINAL_BOARD'), 'utf8'),
};
assert.equal(blob(original.hook), '02ec7d7971bbcf96723e4a15fe285c5c0edf2ad2', 'Immutable original hook');
assert.equal(blob(original.board), '526213213e4a5e1b625e1b6505227b623f76ad26', 'Immutable original Board');
for (const anchor of [INVERSE.insert, INVERSE.newCalc, '  const finalScore = useMemo(() => {\n'])
  assert.equal(fixed.hook.split(anchor).length - 1, 1, 'Unique actual hook inverse anchor');
const invertedHook = fixed.hook.replace(INVERSE.insert, '').replace('  const finalScore = useMemo(() => {\n', '  const finalScore = useMemo(() => {\n' + INVERSE.guard).replace(INVERSE.newCalc, INVERSE.oldCalc);
assert.equal(invertedHook, original.hook, 'Exact inverse preserves every original hook byte and formula');
const OUT = absolute('BB_SCORE_CONTROL_OUT');
assert(!fs.existsSync(OUT), 'Fresh controller output directory required'); fs.mkdirSync(OUT, { recursive: true });
const save = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n');
save('pins-before.json', before);
const receipt = { version: 1, scope: 'Actual Board/hook and fictional fetched pool, real rating/daily demand/series. No real-data or live-backend claim.',
  pins: PINS, originalPins: Object.fromEntries(Object.entries(original).map(([key, body]) => [key, blob(body)])),
  originalHookInverseExact: true, expectedCasesPerArm: 10, arms: [] };
const sorted = values => [...values].sort();
const stripAnsi = value => value.replace(/\u001b\[[0-9;]*m/g, '');
const semantic = raw => Object.fromEntries(keys.map(key => [key, {
  title: raw.cases[key].title,
  frames: raw.cases[key].frames.map(({ html: _html, text: _text, ...frame }) => frame),
}]));
function run(name, source, expected) {
  const dir = path.join(OUT, name); fs.mkdirSync(dir);
  for (const [key, file] of Object.entries(FILES)) fs.writeFileSync(file, source[key]);
  for (const [key, file] of Object.entries(FILES)) assert.equal(fs.readFileSync(file, 'utf8'), source[key], name + ': actual physical source ' + key);
  for (const [file, pin] of Object.entries(PINS)) if (!Object.values(FILES).includes(file)) assert.equal(blob(fs.readFileSync(file)), pin, name + ': held input ' + file);
  const physical = Object.fromEntries(Object.entries(source).map(([key, body]) => [key, { blob: blob(body), sha256: sha(body) }]));
  if (name !== 'fixed' && name !== 'restored') assert(Object.keys(FILES).some(key => physical[key].blob !== PINS[FILES[key]]), name + ': effective source change');
  const output = path.join(dir, 'units.json'), rawPath = path.join(dir, 'raw.json');
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', BB_SCORE_BREAKDOWN_RAW: rawPath };
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1', '--minWorkers=1',
    '--reporter=default', '--reporter=json', '--outputFile=' + output], { env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  fs.writeFileSync(path.join(dir, 'stdout.log'), child.stdout || ''); fs.writeFileSync(path.join(dir, 'stderr.log'), child.stderr || '');
  for (const [key, file] of Object.entries(FILES)) assert.equal(blob(fs.readFileSync(file)), physical[key].blob, name + ': physical source held after child ' + key);
  for (const [file, pin] of Object.entries(PINS)) if (!Object.values(FILES).includes(file)) assert.equal(blob(fs.readFileSync(file)), pin, name + ': held input after child ' + file);
  assert(fs.existsSync(output), name + ': actual reporter retained');
  const report = JSON.parse(fs.readFileSync(output, 'utf8')), cases = report.testResults.flatMap(suite => suite.assertionResults);
  const failed = cases.filter(row => row.status === 'failed');
  const fault = FAULTS.find(item => item.name === name);
  const arm = { name, source: physical, mutation: fault || null, expectedFailures: expected.map(key => TITLES[key]), status: child.status, signal: child.signal, error: child.error?.message, cases };
  receipt.arms.push(arm); save('receipt.json', receipt);
  assert.equal(child.signal, null, name + ': no termination signal'); assert.equal(child.error, undefined, name + ': no launcher error');
  assert.equal(report.numTotalTests, 10, name + ': reporter census'); assert.equal(cases.length, 10, name + ': actual row census');
  assert.deepEqual(sorted(cases.map(row => row.title)), sorted(Object.values(TITLES)), name + ': all exact case titles');
  assert(cases.every(row => row.status === 'passed' || row.status === 'failed'), name + ': no skipped or incomplete rows');
  assert.equal(report.numPassedTests, 10 - expected.length, name + ': actual passed count'); assert.equal(report.numFailedTests, expected.length, name + ': actual failed count');
  assert.equal(report.numPendingTests ?? 0, 0, name + ': no pending'); assert.equal(report.numTodoTests ?? 0, 0, name + ': no todo');
  assert.equal(report.numRuntimeErrorTestSuites ?? 0, 0, name + ': no runtime error suites');
  assert.deepEqual(sorted(failed.map(row => row.title)), sorted(expected.map(key => TITLES[key])), name + ': exact failed-title set');
  assert.equal(child.status, expected.length ? 1 : 0, name + ': actual child exit');
  assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to resolve import|Cannot find module|Transform failed with|SyntaxError:|ReferenceError:|TypeError:/.test(stripAnsi((child.stdout || '') + (child.stderr || ''))), name + ': no runtime/setup banners');
  for (const row of cases) {
    if (row.status === 'passed') assert.equal(row.failureMessages.length, 0, name + ': clean passed row');
    else { assert.equal(row.failureMessages.length, 1, name + ': one business assertion'); assert(stripAnsi(row.failureMessages[0]).startsWith('AssertionError: ' + row.title.split(' ')[0]), name + ': exact owned AssertionError marker'); }
  }
  assert(fs.existsSync(rawPath), name + ': actual full RAW retained');
  const rawBytes = fs.readFileSync(rawPath), raw = JSON.parse(rawBytes);
  assert.equal(raw.version, 1, name + ': RAW version');
  assert.deepEqual(raw.caseTitles, Object.values(TITLES), name + ': RAW declared titles');
  assert.deepEqual(sorted(Object.keys(raw.cases)), sorted(keys), name + ': RAW all ten cases');
  let frames = 0;
  for (const key of keys) {
    const item = raw.cases[key]; assert.equal(item.title, TITLES[key], name + ': RAW exact title');
    assert(item.frames.length > 0, name + ': actual frames for every case');
    for (const frame of item.frames) {
      for (const field of ['label', 'inputPool', 'state', 'draws', 'fetches', 'other', 'completion', 'clipboard', 'storage', 'html', 'text']) assert(Object.hasOwn(frame, field), name + ': full RAW ' + field);
      assert.equal(frame.inputPool.length, 15, name + ': complete fictional input pool');
      assert.equal(frame.state.pool.length, 15, name + ': complete actual hook pool');
      assert.equal(frame.other.length, 0, name + ': no undeclared transport');
      assert.equal(frame.storage['budget-unrelated'], 'held', name + ': unrelated storage held');
      frames++;
    }
  }
  assert.equal(frames, 19, name + ': all nineteen actual frames retained');
  for (const [key, count] of [['win', 42], ['draw', 33], ['loss', 42]]) assert.equal(raw.cases[key].frames[0].draws.length, count, name + ': exact complete unfiltered simulation tape ' + key);
  arm.raw = { sha256: sha(rawBytes), bytes: rawBytes.length, cases: 10, frames };
  save('receipt.json', receipt);
  console.log('BB_SCORE_ARM ' + JSON.stringify({ name, passed: report.numPassedTests, failed: failed.length, failures: failed.map(row => row.title), raw: arm.raw }));
  return { raw, bytes: rawBytes };
}
try {
  const first = run('fixed', fixed, []);
  const old = run('original-board-hook', original, keys.filter(key => key !== 'quiet'));
  assert.equal(sha(old.bytes), '9d35bdde2b62786e47e898cb714b5fab79657f68e6ff776643de6f411f1db3d0', 'Entire original RAW matches admitted original packet');
  assert.deepEqual(semantic(first.raw), semantic(old.raw), 'Every full original/fixed state, pool, call, storage and random draw held; only html/text differ');
  receipt.originalFixedSemanticExact = true; save('receipt.json', receipt);
  for (const fault of FAULTS) {
    const source = { ...fixed };
    assert.equal(source[fault.file].split(fault.anchor).length - 1, 1, fault.name + ': unique actual code anchor');
    assert.notEqual(fault.anchor, fault.replacement, fault.name + ': distinct replacement');
    source[fault.file] = source[fault.file].replace(fault.anchor, fault.replacement);
    assert.notEqual(blob(source[fault.file]), PINS[FILES[fault.file]], fault.name + ': actual changed source');
    run(fault.name, source, fault.failed);
  }
  const last = run('restored', fixed, []);
  assert.deepEqual(last.bytes, first.bytes, 'Fixed/restored complete RAW byte equality');
  assert.deepEqual(semantic(last.raw), semantic(old.raw), 'Restored/original full semantic equality');
  assert.equal(receipt.arms.length, 11, 'All eleven arms ran');
  assert.equal(receipt.arms.reduce((total, arm) => total + arm.cases.length, 0), 110, 'All110 actual rows');
  receipt.fixedRestoredWholeRawExact = true; receipt.complete = true; save('receipt.json', receipt);
} catch (error) { fs.writeFileSync(path.join(OUT, 'controller-error.txt'), String(error.stack || error) + '\n'); throw error; }
finally {
  for (const [key, file] of Object.entries(FILES)) fs.writeFileSync(file, fixed[key]);
  const after = capturePins(); save('pins-after.json', after); requirePins(after);
  assert.deepEqual(after, before, 'Exact hook/Board and all held input restoration');
  console.log('BB_SCORE_SOURCE_RESTORED ' + JSON.stringify(after));
}
