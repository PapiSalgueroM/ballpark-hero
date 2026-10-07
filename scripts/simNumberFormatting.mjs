/** Round 1085: actual display leaves with retained copies and independent numeric baseline. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

assert(['1', 'true'].includes(process.env.CI), 'Run number display verification in remote CI only');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.env.NUMBER_FORMATTING_ARTIFACTS || path.join(root, 'number-formatting-artifacts', 'outcomes'));
const TEST = 'src/test/numberFormatting.test.tsx', HELPER = 'src/lib/formatNumber.ts';
const RESULT = 'src/components/game/ResultMoment.tsx', GUEST = 'src/components/game/GuestScoreBanner.tsx', STANDING = 'src/components/game/PostGameStats.tsx';
const LINE = 'src/lib/usCareerStatLine.ts', REVIEW_LIB = 'src/lib/usCareerSeasonReview.ts';
const REVIEW = 'src/components/us-career/CareerSeasonReview.tsx', COMPARE = 'src/components/us-career/CareerSeasonComparison.tsx', MANAGER = 'src/components/club-manager/ClubManagerCareerPanel.tsx';
const BASELINE = 'unchanged engine training and standing preserve numeric state';
const TOKENS = 'complete numeric tokens keep signs precision and trailing zeroes';
const OPAQUE = 'partial numeric text slash currency and nonfinite tokens pass through';
const RESULT_CASE = 'ResultMoment groups primitive scores and sizes the displayed token';
const NODE_CASE = 'ResultMoment preserves ReactNode markup and missing-score behavior';
const GUEST_CASE = 'GuestScoreBanner groups the actual score without changing guest eligibility';
const STANDING_CASE = 'PostGameStats groups counts and scores while retaining numeric RPC arguments';
const LINE_CASE = 'US stat lines group counts and retain exact existing rate precision and saved prose';
const OVERVIEW = 'US review groups counts and money but leaves year age and rating untouched';
const REGULAR = 'US review regular values highs and original saved text remain truthful';
const SIGNED = 'US comparison groups signed large deltas and keeps selector years exact';
const PRECISION = 'US comparison preserves two and three decimal places including zero deltas';
const MANAGER_CASE = 'manager count leaves group records and tournaments without changing season identifiers';
const COUNT = 13;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const unix = value => value.replaceAll('\\', '/');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n');
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const save = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2)); };
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const sourceFiles = ['src', 'scripts'].flatMap(dir => files(path.join(root, dir))).concat(['package.json', 'package-lock.json', 'vitest.config.ts', 'vite.config.ts', 'tsconfig.app.json', 'tsconfig.json', 'index.html'].map(file => path.join(root, file)));
const holds = () => {
  const hashes = {};
  for (const file of sourceFiles.sort()) { const bytes = fs.readFileSync(file); hashes[unix(path.relative(root, file))] = sha(bytes); }
  return hashes;
};
fs.mkdirSync(out, { recursive: true }); const before = holds();
save(path.join(out, 'source-before.json'), before);
process.on('exit', () => save(path.join(out, 'source-after.json'), holds()));

const controls = [
  ['group', HELPER, "return parts[1] + parts[2].replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',') + (parts[3] ?? '');", 'return text;', TOKENS],
  ['sign', HELPER, 'return parts[1] + parts[2].replace', "return '' + parts[2].replace", TOKENS],
  ['fraction', HELPER, "(parts[3] ?? '')", "''", TOKENS],
  ['coerce', HELPER, 'const text = String(value);', 'const text = String(Number(value));', TOKENS],
  ['partial', HELPER, 'if (!parts) return text;', "if (!parts) return text.replace(/\\d{4}/g, 'changed');", OPAQUE],
  ['rng', HELPER, 'const text = String(value);', 'Math.random(); const text = String(value);', TOKENS],
  ['storage', HELPER, 'const text = String(value);', "localStorage.setItem('formatting-save', 'changed'); const text = String(value);", TOKENS],
  ['result', RESULT, "const shownScore = typeof score === 'number' || typeof score === 'string' ? formatNumber(score) : score;", 'const shownScore = score;', RESULT_CASE],
  ['size', RESULT, 'scoreSize(shownScore)', 'scoreSize(score)', RESULT_CASE],
  ['node', RESULT, "const shownScore = typeof score === 'number' || typeof score === 'string' ? formatNumber(score) : score;", "const shownScore = typeof score === 'number' || typeof score === 'string' ? formatNumber(score) : String(score);", NODE_CASE],
  ['guest', GUEST, 'formatNumber(score)', 'String(score)', GUEST_CASE],
  ['count', STANDING, 'formatNumber(standing.counts[i])', 'String(standing.counts[i])', STANDING_CASE],
  ['you', STANDING, 'formatNumber(Math.round(userScore))', 'String(Math.round(userScore))', STANDING_CASE],
  ['median', STANDING, 'formatNumber(Math.round(standing.median))', 'String(Math.round(standing.median))', STANDING_CASE],
  ['top', STANDING, 'formatNumber(standing.top)', 'String(standing.top)', STANDING_CASE],
  ['yards', LINE, '[s.passYds, n => `${formatNumber(n)} yds`]', '[s.passYds, n => `${n} yds`]', LINE_CASE],
  ['savedProse', LINE, 'return `${n.toLocaleString()} ${n === 1 ? one : many}`;', 'return `${formatNumber(n)} ${n === 1 ? one : many}`;', LINE_CASE],
  ['review', REVIEW_LIB, 'formatNumber(digits === undefined ? value : value.toFixed(digits))', 'String(digits === undefined ? value : value.toFixed(digits))', REGULAR],
  ['reviewPrecision', REVIEW_LIB, 'value.toFixed(digits)', 'value.toFixed(1)', PRECISION],
  ['games', REVIEW, 'formatNumber(recorded(season.games))', 'recorded(season.games)', OVERVIEW],
  ['pay', REVIEW, 'formatNumber(season.salary)', 'String(season.salary)', OVERVIEW],
  ['difference', REVIEW, 'formatNumber(Math.abs(change))', 'String(Math.abs(change))', OVERVIEW],
  ['year', REVIEW, '{recorded(season.year)} season', '{formatNumber(recorded(season.year))} season', OVERVIEW],
  ['delta', COMPARE, 'formatNumber(amount)', 'amount', SIGNED],
  ['deltaPrecision', COMPARE, 'Math.abs(change).toFixed(digits)', 'Math.abs(change).toFixed(1)', PRECISION],
  ['record', MANAGER, 'formatNumber(c.careerStats.wins)', 'String(c.careerStats.wins)', MANAGER_CASE],
  ['tournaments', MANAGER, 'formatNumber(c.nationJob.played)', 'String(c.nationJob.played)', MANAGER_CASE],
  ['trophies', MANAGER, 'formatNumber(c.trophies.length)', 'String(c.trophies.length)', MANAGER_CASE],
];

function run(name, replacement = null, intended = null) {
  const dir = path.join(out, name); fs.mkdirSync(dir, { recursive: true });
  const reportPath = path.join(dir, 'vitest-report.json'), configPath = path.join(dir, 'vitest.config.mjs');
  const helper = replacement?.file === HELPER ? replacement.copy : unix(path.join(root, HELPER));
  const aliases = { '@/lib/formatNumber': helper, './formatNumber': helper };
  if (replacement) aliases[`@/${replacement.file.slice(4).replace(/\.tsx?$/, '')}`] = replacement.copy;
  if (replacement?.file === LINE) {
    aliases['./usCareerStatLine'] = replacement.copy;
    aliases[unix(path.join(root, LINE))] = replacement.copy;
  }
  const interesting = [TEST, HELPER, RESULT, GUEST, STANDING, LINE, REVIEW_LIB, REVIEW, COMPARE, MANAGER, 'src/lib/careerTraining.ts', 'src/lib/dailyStanding.ts', 'src/test/fixtures/careerSeasonReview1008.ts'].map(file => unix(path.join(root, file))).concat(replacement ? [replacement.copy] : []);
  const config = `import { defineConfig } from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('vitest/config'))))};
import react from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('@vitejs/plugin-react-swc'))))};
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const seen = new Map(), dir = ${JSON.stringify(unix(dir))}, wanted = ${JSON.stringify(interesting)};
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
export default defineConfig({ root: ${JSON.stringify(unix(root))}, plugins: [react(), {
  name: 'retain-number-transform', enforce: 'post', transform(code, id) {
    const file = id.split('?')[0].replaceAll('\\\\', '/'); if (!wanted.includes(file)) return null;
    const input = fs.readFileSync(file), output = 'transforms/' + hash(file).slice(0, 16) + '.js';
    fs.mkdirSync(path.join(dir, 'transforms'), { recursive: true }); fs.writeFileSync(path.join(dir, output), code);
    seen.set(file, { file, inputSha256: hash(input), transformedSha256: hash(code), output });
    fs.writeFileSync(path.join(dir, 'transforms.json'), JSON.stringify([...seen.values()], null, 2)); return null;
  }
}], test: { environment: 'jsdom', globals: true, setupFiles: [${JSON.stringify(unix(path.join(root, 'src/test/setup.ts')))}], include: [${JSON.stringify(TEST)}], maxWorkers: 1, fileParallelism: false },
resolve: { alias: ${JSON.stringify({ ...aliases, '@': unix(path.join(root, 'src')) })} } });
`;
  save(configPath, config);
  const args = ['node_modules/vitest/vitest.mjs', 'run', '--config', configPath, '--reporter=json', `--outputFile.json=${reportPath}`, '--reporter=default'];
  if (intended) args.push('-t', `^(${escape(BASELINE)}|${escape(intended)})$`);
  const child = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 180000,
    env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' } });
  save(path.join(dir, 'stdout.log'), child.stdout || ''); save(path.join(dir, 'stderr.log'), child.stderr || '');
  save(path.join(dir, 'process.json'), { args, status: child.status, signal: child.signal, error: child.error?.message ?? null });
  assert(!child.error && child.signal === null, `${name}: subprocess setup failure`);
  const output = `${child.stdout || ''}\n${child.stderr || ''}`;
  assert(!/Unhandled Errors|Unhandled Rejection|Cannot find module|Failed to resolve import|SyntaxError|Transform failed|Startup Error|Dynamic require/.test(output), `${name}: runtime/setup failure`);
  assert(fs.existsSync(reportPath), `${name}: missing actual Vitest report`);
  const raw = JSON.parse(fs.readFileSync(reportPath, 'utf8')), tests = raw.testResults.flatMap(file => file.assertionResults);
  assert.equal(raw.numUnhandledErrors ?? 0, 0, `${name}: unhandled errors`); assert.equal(raw.numRuntimeErrorTestSuites ?? 0, 0, `${name}: runtime suites`);
  assert.equal(raw.unhandledErrors?.length ?? 0, 0, `${name}: retained unhandled errors`); assert(raw.testResults.every(file => !file.testExecError), `${name}: suite execution error`);
  const marker = 'NUMBER_FORMAT_RECORD|';
  const records = (child.stdout || '').split(/\r?\n/).filter(line => line.includes(marker)).map(line => JSON.parse(line.slice(line.indexOf(marker) + marker.length)));
  save(path.join(dir, 'records.json'), records);
  assert.equal(tests.length, COUNT, `${name}: test inventory changed`);
  const baseline = records.find(record => record.id === BASELINE);
  assert(baseline, `${name}: complete independent baseline missing`); assert.deepEqual(baseline.actual, baseline.expected, `${name}: baseline outcome changed`);
  assert.equal(tests.find(test => test.title === BASELINE)?.status, 'passed', `${name}: baseline failed`);
  const transforms = JSON.parse(fs.readFileSync(path.join(dir, 'transforms.json'), 'utf8'));
  if (replacement) {
    const bytes = fs.readFileSync(replacement.copy); const digest = sha(bytes);
    assert(transforms.some(row => row.file === replacement.copy && row.inputSha256 === digest), `${name}: copy not actually transformed`);
    assert(!transforms.some(row => row.file === unix(path.join(root, replacement.file))), `${name}: original replaced module transformed`);
  }
  let failure = null;
  if (!intended) {
    assert.equal(child.status, 0, 'healthy mounted suite failed'); assert(tests.every(test => test.status === 'passed'), 'healthy case did not pass');
    for (const record of records) assert.deepEqual(record.actual, record.expected, `healthy retained mismatch: ${record.id}`);
  } else {
    assert.equal(child.status, 1, `${name}: expected assertion did not fail normally`);
    assert.equal(tests.filter(test => test.status === 'failed').length, 1, `${name}: unexpected failing inventory`);
    assert.equal(tests.filter(test => test.status === 'passed').length, 1, `${name}: unexpected baseline inventory`);
    failure = tests.find(test => test.title === intended && test.fullName === intended);
    assert.equal(failure?.status, 'failed', `${name}: mapped case did not fail`);
    assert(/AssertionError/.test(failure.failureMessages.join('\n')), `${name}: mapped failure is not an AssertionError`);
    assert(records.some(row => { try { assert.deepEqual(row.actual, row.expected); return false; } catch { return true; } }), `${name}: no complete actual mismatch retained`);
  }
  const hashes = {};
  for (const file of files(dir)) { const bytes = fs.readFileSync(file); hashes[unix(path.relative(dir, file))] = sha(bytes); }
  return { name, intended, status: intended ? 'assertion-failed' : 'passed', passed: tests.filter(test => test.status === 'passed').length,
    failed: tests.filter(test => test.status === 'failed').length, records: records.length, baseline, failure, hashes };
}

const summary = { status: 'running', normal: null, controls: [], sourceBefore: before, sourceAfter: null };
try {
  summary.normal = run('normal');
  const mode = process.env.NUMBER_FORMATTING_CONTROL || 'all', selected = mode === 'all' ? controls : controls.filter(row => row[0] === mode);
  assert(selected.length, `unknown control ${mode}`);
  for (const [name, file, from, to, intended] of selected) {
    const source = read(file); assert.equal(source.split(from).length - 1, 1, `${name}: executable anchor not unique`);
    const changed = source.replace(from, to), copy = path.join(out, 'copies', name + path.extname(file));
    assert.notEqual(changed, source, `${name}: mutation did not fire`); save(copy, changed);
    const mutation = { name, file, from, to, intended, baseline: BASELINE, originalSha256: before[file], normalizedSha256: sha(source), copiedSha256: sha(changed), copy: unix(path.relative(out, copy)) };
    save(path.join(out, 'copies', name + '.json'), mutation);
    const result = run(name, { file, copy: unix(copy) }, intended);
    assert.deepEqual(result.baseline, summary.normal.baseline, `${name}: complete baseline differs from normal`);
    summary.controls.push({ ...result, mutation });
  }
  summary.status = 'passed';
} finally {
  summary.sourceAfter = holds(); save(path.join(out, 'source-after.json'), summary.sourceAfter); save(path.join(out, 'summary.json'), summary);
  assert.deepEqual(summary.sourceAfter, before, 'verification changed original source or fixtures');
}
console.log(`Number display: ${summary.normal.passed}/${COUNT} actual helper/component and baseline cases passed.`);
console.log(`Retained complete comparisons: ${summary.normal.records}, including input and storage holds.`);
console.log(`Copied controls: ${summary.controls.length}/${controls.length} actual mapped AssertionErrors with unchanged independent baseline.`);
console.log(`Source and fixture holds: ${Object.keys(before).length}; complete reports, actual transforms, source copies and hashes retained.`);
console.log(`Number formatting: passed. Evidence at ${out}`);
