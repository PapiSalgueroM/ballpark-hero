/** Round 1084: real four-sport saves, retained refusals and copied source faults. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

assert(['1', 'true'].includes(process.env.CI), 'Run US career save verification in remote CI only');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.env.US_CAREER_SAVE_RETRY_ARTIFACTS || path.join(root, 'us-career-save-recovery-artifacts', 'outcomes'));
const TEST = 'src/test/usCareerSaveRetry.test.tsx';
const BOARD = 'src/components/us-career/UsCareerBoard.tsx';
const NOTICE = 'src/components/us-career/UsCareerSaveNotice.tsx';
const BASELINE = 'unchanged training rule preserves complete engine-created careers';
const PRACTICE = 'refused played practice banks once and Retry saves exact gain without replay';
const SUMMER = 'two actual summer answers replace the pending payload and Retry does not answer again';
const PROSPECT = 'real prospect route and season replace refused progress and restore the latest choice';
const REMOVE = 'refused occupied reset queues removal and Retry really deletes only this sport';
const REPLACE = 'a new actual draft supersedes queued deletion with the latest career';
const BACK = 'Back from an unsaved prospect queues an honest empty-key removal';
const ORDINARY = 'a later ordinary prospect save clears refusal using the newest progress';
const COUNT = 33;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n');
const unix = value => value.replaceAll('\\', '/');
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const save = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2)); };
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const sourceFiles = ['src', 'scripts'].flatMap(dir => files(path.join(root, dir))).concat(['package.json', 'package-lock.json', 'vitest.config.ts', 'vite.config.ts', 'tsconfig.app.json', 'tsconfig.json', 'index.html'].map(file => path.join(root, file)));
const holds = () => Object.fromEntries(sourceFiles.sort().map(file => [unix(path.relative(root, file)), sha(fs.readFileSync(file))]));
fs.mkdirSync(out, { recursive: true }); const before = holds();
save(path.join(out, 'source-before.json'), before);
process.on('exit', () => save(path.join(out, 'source-after.json'), holds()));

const controls = [
  ['retry', BOARD, 'const pending = pendingSave.current;', 'const pending = null;', PRACTICE],
  ['latest', BOARD, 'pendingSave.current = { key: sport.saveKey, value };', 'pendingSave.current ||= { key: sport.saveKey, value };', SUMMER],
  ['payload', BOARD, 'else localStorage.setItem(pending.key, pending.value);', "else localStorage.setItem(pending.key, '{}');", PRACTICE],
  ['key', BOARD, 'else localStorage.setItem(pending.key, pending.value);', "else localStorage.setItem('wrong-career-key', pending.value);", PRACTICE],
  ['lost', BOARD, "setSaveFailure(pending.value === null ? 'remove' : 'write');", "pendingSave.current = null; setSaveFailure(pending.value === null ? 'remove' : 'write');", PRACTICE],
  ['duplicate', BOARD, 'pendingSave.current = null;\n      setSaveFailure(null);', 'setSaveFailure(null);', PRACTICE],
  ['clear', BOARD, 'pendingSave.current = null;\n      setSaveFailure(null);', 'pendingSave.current = null;', PRACTICE],
  ['failure', BOARD, "setSaveFailure(pending.value === null ? 'remove' : 'write');", 'setSaveFailure(null);', PRACTICE],
  ['operation', BOARD, "setSaveFailure(pending.value === null ? 'remove' : 'write');", "setSaveFailure('remove');", PRACTICE],
  ['notice', BOARD, '{saveFailure && <UsCareerSaveNotice', '{false && saveFailure && <UsCareerSaveNotice', PRACTICE],
  ['writeCopy', NOTICE, 'Your latest progress has not been saved. Keep this tab open and try again.', 'Your latest progress has been saved.', PRACTICE],
  ['removeCopy', NOTICE, 'This device may still load the previous career.', 'Your previous career has been deleted.', REMOVE],
  ['button', NOTICE, '<button onClick={onRetry}', '<button onClick={() => undefined}', PRACTICE],
  ['career', BOARD, "saveValue(JSON.stringify({ c, phase: ph, teamQuality: tq, coach: coachRef.current } satisfies SaveShape));", 'void c; void ph; void tq;', PRACTICE],
  ['prospect', BOARD, "saveValue(JSON.stringify({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: next } satisfies SaveShape));", 'void next;', PROSPECT],
  ['remove', BOARD, 'if (pending.value === null) localStorage.removeItem(pending.key);', "if (pending.value === null) localStorage.setItem(pending.key, 'null');", REMOVE],
  ['reset', BOARD, 'const reset = () => {\n    saveValue(null);', 'const reset = () => {\n    void sport.saveKey;', REMOVE],
  ['back', BOARD, "prospectRef.current = null; setProspect(null); setPhase('create');\n      saveValue(null);", "prospectRef.current = null; setProspect(null); setPhase('create');", BACK],
  ['replacement', BOARD, 'pendingSave.current = { key: sport.saveKey, value };', 'if (pendingSave.current?.value === null && value !== null) return;\n    pendingSave.current = { key: sport.saveKey, value };', REPLACE],
  ['ordinary', BOARD, 'pendingSave.current = { key: sport.saveKey, value };', 'if (pendingSave.current) { retrySave(); return; }\n    pendingSave.current = { key: sport.saveKey, value };', ORDINARY],
  ['protected', BOARD, 'else localStorage.setItem(pending.key, pending.value);', "else { localStorage.setItem(pending.key, pending.value); localStorage.removeItem('nba-my-career-save-v1'); }", PRACTICE],
  ['rng', BOARD, 'const pending = pendingSave.current;', 'Math.random(); const pending = pendingSave.current;', PRACTICE],
  ['replay', BOARD, 'pendingSave.current = null;\n      setSaveFailure(null);', "pendingSave.current = null;\n      setSaveFailure(null); setPhase('create');", PRACTICE],
];

function run(name, aliases = {}, intended = null) {
  const dir = path.join(out, name); fs.mkdirSync(dir, { recursive: true });
  const reportPath = path.join(dir, 'vitest-report.json'), configPath = path.join(dir, 'vitest.config.mjs');
  const interesting = [TEST, BOARD, NOTICE, 'src/lib/careerTraining.ts', ...['nfl', 'nba', 'mlb', 'nhl'].map(s => `src/lib/${s}CareerSport.ts`)].map(file => unix(path.join(root, file))).concat(Object.values(aliases));
  const config = `import { defineConfig } from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('vitest/config'))))};
import react from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('@vitejs/plugin-react-swc'))))};
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const seen = new Map(), dir = ${JSON.stringify(unix(dir))}, wanted = ${JSON.stringify(interesting)};
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
export default defineConfig({ root: ${JSON.stringify(unix(root))}, plugins: [react(), {
  name: 'retain-us-save-transform', enforce: 'post', transform(code, id) {
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
  // Object-table string interpolation can quote the label in Vitest's suite name.
  const faultPattern = intended ? `(?:'NFL'|NFL) save recovery on the actual board ${escape(intended)}$` : null;
  if (intended) args.push('-t', `(${escape(BASELINE)}$|${faultPattern})`);
  const child = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 300000,
    env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' } });
  save(path.join(dir, 'stdout.log'), child.stdout || ''); save(path.join(dir, 'stderr.log'), child.stderr || '');
  save(path.join(dir, 'process.json'), { args, status: child.status, signal: child.signal, error: child.error?.message ?? null });
  assert(!child.error && child.signal === null, `${name}: subprocess setup failure`);
  const output = `${child.stdout || ''}\n${child.stderr || ''}`;
  assert(!/Unhandled Errors|Unhandled Rejection|Cannot find module|Failed to resolve import|SyntaxError|Transform failed|Startup Error|Dynamic require/.test(output), `${name}: runtime/setup failure`);
  assert(fs.existsSync(reportPath), `${name}: missing actual Vitest report`);
  const raw = JSON.parse(fs.readFileSync(reportPath, 'utf8')), tests = raw.testResults.flatMap(file => file.assertionResults);
  assert.equal(raw.numUnhandledErrors ?? 0, 0, `${name}: unhandled errors`);
  assert.equal(raw.numRuntimeErrorTestSuites ?? 0, 0, `${name}: runtime error suites`);
  assert.equal(raw.unhandledErrors?.length ?? 0, 0, `${name}: retained unhandled errors`);
  assert(raw.testResults.every(file => !file.testExecError), `${name}: suite execution error`);
  const records = (child.stdout || '').split(/\r?\n/).filter(line => line.includes('US_SAVE_RECORD|')).map(line => JSON.parse(line.slice(line.indexOf('US_SAVE_RECORD|') + 15)));
  save(path.join(dir, 'records.json'), records);
  assert.equal(tests.length, COUNT, `${name}: test inventory changed`);
  const baseline = records.find(record => record.id === BASELINE);
  assert(baseline, `${name}: complete independent baseline missing`);
  assert.deepEqual(baseline.actual, baseline.expected, `${name}: baseline outcome changed`);
  assert.equal(tests.find(test => test.title === BASELINE)?.status, 'passed', `${name}: baseline failed`);
  const transforms = JSON.parse(fs.readFileSync(path.join(dir, 'transforms.json'), 'utf8'));
  for (const [alias, file] of Object.entries(aliases)) {
    assert(transforms.some(row => row.file === file && row.inputSha256 === sha(fs.readFileSync(file))), `${name}: copied source not executed`);
    const original = unix(path.join(root, 'src', alias.slice(2))) + path.extname(file);
    assert(!transforms.some(row => row.file === original), `${name}: original replaced module loaded`);
  }
  let failure = null;
  if (!intended) {
    assert.equal(child.status, 0, 'healthy mounted suite failed');
    assert(tests.every(test => test.status === 'passed'), 'healthy case did not pass');
    for (const record of records) assert.deepEqual(record.actual, record.expected, `healthy retained mismatch: ${record.id}`);
  } else {
    assert.equal(child.status, 1, `${name}: expected assertion did not fail normally`);
    assert.equal(tests.filter(test => test.status === 'failed').length, 1, `${name}: unexpected failing inventory`);
    assert.equal(tests.filter(test => test.status === 'passed').length, 1, `${name}: unexpected baseline inventory`);
    failure = tests.find(test => test.title === intended && new RegExp(faultPattern).test(test.fullName));
    assert.equal(failure?.status, 'failed', `${name}: mapped case did not fail`);
    assert(/AssertionError/.test(failure.failureMessages.join('\n')), `${name}: mapped failure is not an AssertionError`);
    assert(records.some(row => { try { assert.deepEqual(row.actual, row.expected); return false; } catch { return true; } }), `${name}: no complete actual mismatch retained`);
  }
  return { name, intended, status: intended ? 'assertion-failed' : 'passed', passed: tests.filter(test => test.status === 'passed').length, failed: tests.filter(test => test.status === 'failed').length,
    records: records.length, baseline, failure, hashes: Object.fromEntries(files(dir).map(file => [unix(path.relative(dir, file)), sha(fs.readFileSync(file))])) };
}

const summary = { status: 'running', normal: null, controls: [], sourceBefore: before, sourceAfter: null };
try {
  summary.normal = run('normal');
  const mode = process.env.US_CAREER_SAVE_RETRY_CONTROL || 'all', selected = mode === 'all' ? controls : controls.filter(row => row[0] === mode);
  assert(selected.length, `unknown control ${mode}`);
  for (const [name, file, from, to, intended] of selected) {
    const source = read(file); assert.equal(source.split(from).length - 1, 1, `${name}: executable anchor not unique`);
    const changed = source.replace(from, to), copy = path.join(out, 'copies', name + path.extname(file));
    assert.notEqual(changed, source, `${name}: mutation did not fire`); save(copy, changed);
    const mutation = { name, file, from, to, intended, baseline: BASELINE, originalSha256: before[file], normalizedSha256: sha(source), copiedSha256: sha(changed), copy: unix(path.relative(out, copy)) };
    save(path.join(out, 'copies', name + '.json'), mutation);
    const result = run(name, { [`@/${file.slice(4).replace(/\.tsx?$/, '')}`]: unix(copy) }, intended);
    assert.deepEqual(result.baseline, summary.normal.baseline, `${name}: complete baseline differs from normal`);
    summary.controls.push({ ...result, mutation });
  }
  summary.status = 'passed';
} finally {
  summary.sourceAfter = holds(); save(path.join(out, 'source-after.json'), summary.sourceAfter); save(path.join(out, 'summary.json'), summary);
  assert.deepEqual(summary.sourceAfter, before, 'verification changed original source or fixtures');
}
console.log(`US career save recovery: ${summary.normal.passed}/${COUNT} actual mounted and baseline cases passed.`);
console.log(`Retained complete comparisons: ${summary.normal.records}, across all four actual save keys.`);
console.log(`Copied controls: ${summary.controls.length}/${controls.length} mapped AssertionErrors with unchanged independent baseline.`);
console.log(`Source and fixture holds: ${Object.keys(before).length}; complete reports, transforms, source copies and hashes retained.`);
console.log(`US career save retry: passed. Evidence at ${out}`);
