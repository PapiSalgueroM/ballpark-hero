/** Remote-only retained diagnosis of the unchanged historical board replay. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

assert(['1', 'true'].includes(process.env.CI), 'Historical replay runs in remote CI only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'number-formatting-artifacts', 'parity');
const TEST = 'src/test/usBoardFixture.test.tsx', FIXTURE = 'scripts/data/usBoardFixture.json';
const BOARD = 'src/components/us-career/UsCareerBoard.tsx', LINE = 'src/lib/usCareerStatLine.ts';
const BASE = 'bde6b1c3797fd728dbd583a28623c34fe8452917';
const SPORTS = ['nfl', 'nba', 'mlb', 'nhl'];
const sha = value => createHash('sha256').update(value).digest('hex');
const unix = value => value.replaceAll('\\', '/');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const save = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2)); };
const manifest = list => Object.fromEntries(list.sort().map(file => [unix(path.relative(ROOT, file)), sha(fs.readFileSync(file))]));
const protectedFiles = ['src', 'scripts'].flatMap(dir => files(path.join(ROOT, dir))).concat(['package.json', 'package-lock.json', 'vitest.config.ts', 'vite.config.ts', 'tsconfig.app.json', 'tsconfig.json', 'index.html'].map(file => path.join(ROOT, file)));
const before = manifest(protectedFiles);
fs.mkdirSync(OUT, { recursive: true }); save(path.join(OUT, 'source-before.json'), before);
const report = { status: 'running', base: BASE, sourceBefore: before, runs: [], limitations: [
  'The original default historical replay stays red. This recorder does not replace or re-record its fixture.',
  'The old presentation reference replaces exactly two declared presentation modules. Actual engines, hooks, data, inputs and original assertions remain current.',
  'DOM differences are retained as text/attribute leaves, not an optical or native accessibility proof. Current formatting has separate component and native gates.',
] };
const persist = () => save(path.join(OUT, 'summary.json'), report);
const equal = (a, b) => { try { assert.deepEqual(a, b); return true; } catch { return false; } };

function replaceOnce(source, from, to) {
  assert.equal(source.split(from).length - 1, 1, 'Observation anchor is unique');
  return source.replace(from, to);
}
function execute(dir, args, env = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const child = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024,
    env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1', ...env } });
  save(path.join(dir, 'stdout.log'), child.stdout || ''); save(path.join(dir, 'stderr.log'), child.stderr || '');
  save(path.join(dir, 'process.json'), { args, status: child.status, signal: child.signal, error: child.error?.message ?? null, env });
  assert.equal(child.signal, null); assert(!child.error, 'Replay process started normally');
  assert(!/Unhandled Errors|Unhandled Rejection|Cannot find module|Failed to resolve import|SyntaxError|Transform failed/.test((child.stdout || '') + (child.stderr || '')), 'Replay has no setup/runtime failure');
  return child;
}
const observationCode = `
const __qaIds = new WeakMap<object, number>();
let __qaNext = 0;
function __qaRecord(walker: object, row: unknown) {
  if (!__qaIds.has(walker)) __qaIds.set(walker, ++__qaNext);
  fs.appendFileSync(path.join(process.env.NUMBER_PARITY_DIR!, 'steps.jsonl'), JSON.stringify({ walker: __qaIds.get(walker), ...(row as object) }) + '\\n');
}
function __qaBuild(slug: string, want: unknown, got: unknown) {
  fs.writeFileSync(path.join(process.env.NUMBER_PARITY_DIR!, slug + '.json'), JSON.stringify({ want, got }, null, 2));
}
`;
const replacements = [
  ['const built: Record<string, SportFixture> = {};', observationCode + '\nconst built: Record<string, SportFixture> = {};'],
  ['    this.onStep?.(this);', "    __qaRecord(this, { step: this.steps.at(-1), index: this.steps.length - 1, key: this.saveKey, raw, markup: markupNow(), text: textNow(), now: Date.now(), rngCalls: vi.mocked(Math.random).mock.calls.length, storage: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])) });\n    this.onStep?.(this);"],
  ['    built[slug] = got;', '    built[slug] = got;\n    __qaBuild(slug, want, got);'],
];

function configuration(dir, copy, reference, referenceFiles) {
  const aliases = reference ? {
    '@/components/us-career/UsCareerBoard': referenceFiles[BOARD],
    '@/lib/usCareerStatLine': referenceFiles[LINE], './usCareerStatLine': referenceFiles[LINE],
    [unix(path.join(ROOT, LINE))]: referenceFiles[LINE],
  } : {};
  const sourceRoot = unix(path.join(ROOT, 'src')) + '/';
  return `import { defineConfig } from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('vitest/config'))))};
import react from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('@vitejs/plugin-react-swc'))))};
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const dir = ${JSON.stringify(unix(dir))}, extra = ${JSON.stringify([unix(copy), ...Object.values(referenceFiles)])}, seen = new Map();
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
export default defineConfig({ root: ${JSON.stringify(unix(ROOT))}, plugins: [react(), {
  name: 'retain-historical-replay', enforce: 'post', transform(code, id) {
    const file = id.split('?')[0].replaceAll('\\\\', '/');
    if (!file.startsWith(${JSON.stringify(sourceRoot)}) && !extra.includes(file)) return null;
    const output = 'transforms/' + hash(file).slice(0, 16) + '.js';
    fs.mkdirSync(path.join(dir, 'transforms'), { recursive: true }); fs.writeFileSync(path.join(dir, output), code);
    seen.set(file, { file, inputSha256: hash(fs.readFileSync(file)), transformedSha256: hash(code), output });
    fs.writeFileSync(path.join(dir, 'transforms.json'), JSON.stringify([...seen.values()], null, 2)); return null;
  }
}], test: { environment: 'jsdom', globals: true, setupFiles: [${JSON.stringify(unix(path.join(ROOT, 'src/test/setup.ts')))}], include: [${JSON.stringify(unix(copy))}], maxWorkers: 1, fileParallelism: false },
resolve: { alias: ${JSON.stringify({ ...aliases, '@': unix(path.join(ROOT, 'src')) })} } });
`;
}
function run(name, reference, referenceFiles, fixturePath) {
  const dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true });
  let source = read(TEST);
  for (const [from, to] of replacements) source = replaceOnce(source, from, to);
  const copy = path.join(dir, 'historical-observed.test.tsx'); save(copy, source);
  save(path.join(dir, 'copy.json'), { original: TEST, originalSha256: before[TEST], normalizedSha256: sha(read(TEST)), copiedSha256: sha(source), replacements });
  save(path.join(dir, 'steps.jsonl'), '');
  const config = path.join(dir, 'vitest.config.mjs'); save(config, configuration(dir, copy, reference, referenceFiles));
  const child = execute(dir, ['node_modules/vitest/vitest.mjs', 'run', '--config', config, '--reporter=json', `--outputFile.json=${path.join(dir, 'vitest-report.json')}`, '--reporter=default'], {
    US_BOARD_FIXTURE: 'replay', US_BOARD_FIXTURE_IN: fixturePath, US_BOARD_FIXTURE_REPORT: path.join(dir, 'problems.txt'), NUMBER_PARITY_DIR: dir,
  });
  const raw = JSON.parse(fs.readFileSync(path.join(dir, 'vitest-report.json'), 'utf8'));
  assert.equal(raw.unhandledErrors?.length ?? 0, 0); assert(raw.testResults.every(row => !row.testExecError));
  const tests = raw.testResults.flatMap(row => row.assertionResults);
  assert.deepEqual(tests.map(row => row.title).sort(), [...SPORTS].sort());
  const transforms = JSON.parse(fs.readFileSync(path.join(dir, 'transforms.json'), 'utf8'));
  assert(transforms.some(row => row.file === unix(copy) && row.inputSha256 === sha(source)), 'Observed test copy actually transformed');
  for (const row of transforms) {
    assert.equal(sha(fs.readFileSync(path.join(dir, row.output))), row.transformedSha256, 'Retained transform bytes match');
    if (row.file.startsWith(unix(path.join(ROOT, 'src')) + '/')) assert.equal(row.inputSha256, before[unix(path.relative(ROOT, row.file))], 'Original transformed input stays held');
  }
  assert(!transforms.some(row => row.file === unix(path.join(ROOT, TEST))), 'Only the observation copy supplies the historical test');
  for (const file of [BOARD, LINE]) {
    const wanted = reference ? referenceFiles[file] : unix(path.join(ROOT, file));
    assert(transforms.some(row => row.file === wanted && row.inputSha256 === sha(fs.readFileSync(wanted))), 'Actual requested presentation input transformed');
    if (reference) assert(!transforms.some(row => row.file === unix(path.join(ROOT, file))), 'Replaced current presentation module was not loaded');
  }
  const builds = Object.fromEntries(SPORTS.map(slug => [slug, JSON.parse(fs.readFileSync(path.join(dir, slug + '.json'), 'utf8'))]));
  const observations = fs.readFileSync(path.join(dir, 'steps.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  const result = { name, exit: child.status, passed: tests.filter(row => row.status === 'passed').map(row => row.title), failed: tests.filter(row => row.status === 'failed').map(row => row.title), observations: observations.length, tests, transforms: transforms.length };
  report.runs.push(result); persist();
  return { result, builds, observations, transforms };
}
function differences(builds) {
  const nonpresentation = [], presentation = [];
  for (const [sport, { want, got }] of Object.entries(builds)) {
    for (const field of ['coverage', 'ssrCreate', 'saves']) if (!equal(want[field], got[field])) nonpresentation.push({ sport, field, expected: want[field], actual: got[field] });
    assert.deepEqual(Object.keys(got.screens), Object.keys(want.screens), 'Every fixed save is replayed');
    const paths = [['path', want.path, got.path], ...Object.keys(want.screens).map(name => ['screens.' + name, want.screens[name], got.screens[name]])];
    for (const [sequence, expected, actual] of paths) {
      if (expected.length !== actual.length) nonpresentation.push({ sport, sequence, field: 'length', expected: expected.length, actual: actual.length });
      for (let index = 0; index < Math.min(expected.length, actual.length); index++) {
        for (const step of [expected[index], actual[index]]) assert.deepEqual(Object.keys(step).sort(), ['a', 'p', 'n', 's', 'd', 'm', 't'].sort(), 'All recorded step fields are classified');
        for (const field of ['a', 'p', 'n', 's', 'd', 'm', 't']) if (!equal(expected[index][field], actual[index][field])) (['m', 't'].includes(field) ? presentation : nonpresentation).push({ sport, sequence, index, field, expected: expected[index][field], actual: actual[index][field] });
      }
    }
  }
  return { nonpresentation, presentation };
}
function requireHeld(comparison) { assert.deepEqual(comparison.nonpresentation, [], 'Historical replay changed nonpresentation fields'); }
function groupedOnly(beforeText, afterText) {
  const tokens = /\d[\d,]*(?:\.\d+)?/g;
  const a = beforeText.match(tokens) || [], b = afterText.match(tokens) || [];
  const group = token => { const [integer, fraction] = token.split('.'); return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : '.' + fraction); };
  return beforeText.replace(tokens, '#') === afterText.replace(tokens, '#') && a.length === b.length && a.every((token, i) => token === b[i] || group(token) === b[i]);
}
function leafChanges(beforeMarkup, afterMarkup) {
  const changes = [];
  const walk = (a, b, location) => {
    assert.equal(a.nodeType, b.nodeType, 'Presentation node types remain equal');
    assert.equal(a.nodeName, b.nodeName, 'Presentation element names remain equal');
    if (a.nodeType === 3 && a.nodeValue !== b.nodeValue) {
      assert(groupedOnly(a.nodeValue, b.nodeValue), 'Changed text only inserts numeric grouping');
      changes.push({ location, kind: 'numeric text', before: a.nodeValue, after: b.nodeValue, parent: b.parentElement?.outerHTML });
    } else if (a.nodeType === 8) assert.equal(a.nodeValue, b.nodeValue, 'React boundary comments remain equal');
    if (a.nodeType === 1) {
      const attrs = el => Object.fromEntries([...el.attributes].map(attr => [attr.name, attr.value]).sort(([x], [y]) => x.localeCompare(y)));
      const aa = attrs(a), bb = attrs(b);
      if (!equal(aa, bb)) {
        assert(a.tagName === 'P' && a.textContent.trim().startsWith('Career so far:') && aa.class === 'mt-2 text-[10px] text-muted-foreground' && bb.class === 'mt-2 text-xs text-muted-foreground', 'Only the declared career count readability class changes');
        assert.deepEqual({ ...aa, class: bb.class }, bb);
        changes.push({ location, kind: 'career count class', before: aa, after: bb });
      }
    }
    assert.equal(a.childNodes.length, b.childNodes.length, 'Presentation child structure remains equal');
    [...a.childNodes].forEach((child, i) => walk(child, b.childNodes[i], `${location}/${i}:${child.nodeName}`));
  };
  walk(JSDOM.fragment(beforeMarkup), JSDOM.fragment(afterMarkup), 'root');
  assert(changes.length, 'Changed markup has a retained specific leaf difference'); return changes;
}

try {
  assert.equal(sha(read(TEST)), 'f86d416b73e5cae13242f4ab1ad3dbdb379b6f4a24fbd8c37843ed969ab151c8', 'Exact unchanged historical test');
  assert.equal(sha(read(FIXTURE)), '1f3180c9dd6dbc71711891980e77ce5f92eaff8fb66011082ff2b2f03199701c', 'Exact unchanged recorded fixture');
  assert.equal(sha(read(LINE)), '397407de5429e2e34f26f0441bccec5ad1ae368a8638389dda05b36754e654d2', 'Exact reviewed current stat presentation');
  for (const key of ['US_BOARD_FIXTURE', 'US_BOARD_FIXTURE_IN', 'US_BOARD_FIXTURE_OUT', 'US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'US_BOARD_PARITY_CONTROL']) assert(!process.env[key], `Unexpected inherited replay override: ${key}`);
  const original = execute(path.join(OUT, 'original'), ['scripts/simUsBoardParity.mjs']);
  report.original = { exit: original.status, classification: 'original default replay remains red' }; persist();
  assert.equal(original.status, 1, 'Retain the observed original historical red');
  assert(/Vitest exit 1, passed \[\], failed \[nfl, nba, mlb, nhl\]/.test(original.stdout), 'Original unchanged replay fails its four sports');
  const refs = {}, refManifest = {};
  for (const [file, expected] of [[BOARD, 'e82002139e90e122f51f2e0f256785152936cdaf2a524d2df80a698521f976ca'], [LINE, '7fc3afdb29cdf4f147aafe47593b0d64fdbc8e21c81cbc78e0c7ce1ffa214c21']]) {
    const child = spawnSync('git', ['show', `${BASE}:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    assert.equal(child.status, 0); assert.equal(sha(child.stdout), expected, 'Exact old presentation source');
    const dest = path.join(OUT, 'reference-sources', path.basename(file)); save(dest, child.stdout); refs[file] = unix(dest);
    refManifest[file] = { baseSha256: expected, currentSha256: sha(read(file)), copy: unix(path.relative(OUT, dest)) };
    if (file === BOARD) assert.equal(replaceOnce(child.stdout, 'className="mt-2 text-[10px] text-muted-foreground">\n            Career so far:', 'className="mt-2 text-xs text-muted-foreground">\n            Career so far:'), read(BOARD), 'Board differs only in the declared readability class');
  }
  save(path.join(OUT, 'reference-sources.json'), refManifest);
  const fixturePath = path.join(ROOT, FIXTURE);
  const current = run('current-raw', false, refs, fixturePath);
  const reference = run('old-presentation-reference', true, refs, fixturePath);
  const comparison = differences(current.builds), oldComparison = differences(reference.builds);
  save(path.join(OUT, 'current-comparison.json'), comparison); save(path.join(OUT, 'reference-comparison.json'), oldComparison);
  requireHeld(comparison); assert.deepEqual(oldComparison, { nonpresentation: [], presentation: [] });
  assert.equal(reference.result.exit, 0); assert.deepEqual(reference.result.passed.sort(), [...SPORTS].sort()); assert.deepEqual(reference.result.failed, []);
  assert.equal(current.result.exit, 1); assert.deepEqual(current.result.failed.sort(), [...SPORTS].sort()); assert.deepEqual(current.result.passed, []);
  assert(current.result.tests.every(test => test.failureMessages.some(message => message.startsWith('AssertionError:'))), 'Every current raw failure is the unchanged fixture assertion');
  assert(SPORTS.every(sport => comparison.presentation.some(row => row.sport === sport)), 'Every raw red has observed presentation differences');
  assert.equal(current.observations.length, reference.observations.length);
  const leaves = [];
  for (let index = 0; index < current.observations.length; index++) {
    const a = reference.observations[index], b = current.observations[index];
    const keep = row => ({ walker: row.walker, index: row.index, key: row.key, raw: row.raw, now: row.now, rngCalls: row.rngCalls, storage: row.storage, step: Object.fromEntries(['a', 'p', 'n', 's', 'd'].map(key => [key, row.step[key]])) });
    assert.deepEqual(keep(b), keep(a), 'Every actual raw save, RNG count, clock and nonpresentation step equals the old presentation reference');
    if (a.markup !== b.markup) leaves.push({ index, walker: b.walker, action: b.step.a, changes: leafChanges(a.markup, b.markup) });
  }
  save(path.join(OUT, 'presentation-leaves.json'), leaves); assert(leaves.length);
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')), changed = structuredClone(fixture);
  assert(/^[a-f0-9]{12}$/.test(changed.sports.mlb.path[40].s) && changed.sports.mlb.path[40].s !== '000000000000');
  changed.sports.mlb.path[40].s = '000000000000';
  const controlFixture = path.join(OUT, 'fixture-save-hash-control.json'); save(controlFixture, changed);
  save(path.join(OUT, 'fixture-control-mutation.json'), { field: 'sports.mlb.path[40].s', before: fixture.sports.mlb.path[40].s, after: changed.sports.mlb.path[40].s, originalSha256: before[FIXTURE], copySha256: sha(fs.readFileSync(controlFixture)) });
  const control = run('fixture-save-control', true, refs, controlFixture), controlled = differences(control.builds);
  save(path.join(OUT, 'control-comparison.json'), controlled);
  assert.equal(control.result.exit, 1); assert.deepEqual(control.result.failed, ['mlb']); assert.deepEqual(control.result.passed.sort(), ['nba', 'nfl', 'nhl'].sort());
  assert(control.result.tests.find(row => row.title === 'mlb').failureMessages.some(message => message.startsWith('AssertionError:')));
  assert.deepEqual(controlled.presentation, []); assert.equal(controlled.nonpresentation.length, 1);
  assert.deepEqual(controlled.nonpresentation[0], { sport: 'mlb', sequence: 'path', index: 40, field: 's', expected: '000000000000', actual: fixture.sports.mlb.path[40].s });
  for (const sport of SPORTS) assert.deepEqual(control.builds[sport].got, reference.builds[sport].got, 'Control keeps complete actual healthy reference unchanged');
  assert.deepEqual(control.observations, reference.observations, 'Fixture corruption does not change any actual replay observations');
  let rejected; try { requireHeld(controlled); } catch (error) { rejected = { name: error.name, message: error.message, actual: error.actual, expected: error.expected }; }
  assert.equal(rejected?.name, 'AssertionError'); assert(rejected.message.startsWith('Historical replay changed nonpresentation fields'));
  requireHeld(oldComparison); save(path.join(OUT, 'control-rejection.json'), rejected);
  report.status = 'raw replay red; nonpresentation held; exact old presentation reference passed';
  report.presentationSteps = leaves.length; report.presentationFieldDifferences = comparison.presentation.length; report.control = 'one effective saved-hash corruption rejected, unchanged reference passed';
} catch (error) {
  report.status = 'failed'; report.error = { name: error.name, message: error.message, stack: error.stack }; throw error;
} finally {
  report.sourceAfter = manifest(protectedFiles); save(path.join(OUT, 'source-after.json'), report.sourceAfter);
  try { assert.deepEqual(report.sourceAfter, before, 'All original source, fixtures and dependency manifests stay unchanged'); }
  catch (error) { report.status = 'failed'; report.sourceHoldError = { name: error.name, message: error.message }; throw error; }
  finally { persist(); save(path.join(OUT, 'artifact-hashes.json'), manifest(files(OUT).filter(file => !file.endsWith('artifact-hashes.json')))); }
}
console.log('Historical default remains red. Four exact old-presentation replays passed.');
console.log('Complete current saves, RNG, clocks and nonpresentation steps held; precise presentation leaves retained.');
console.log('One saved-hash control was rejected by its mapped nonpresentation assertion with the unchanged reference held.');
