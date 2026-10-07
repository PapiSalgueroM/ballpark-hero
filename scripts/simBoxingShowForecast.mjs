/** Actual boxing Board cash outcomes with retained executable copies and unchanged engine baselines. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

assert(['1', 'true'].includes(process.env.CI), 'Run boxing cash verification in remote CI only');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.env.BOXING_SHOW_FORECAST_ARTIFACTS || path.join(root, 'boxing-show-forecast-artifacts/outcomes'));
const TEST = 'src/test/boxingShowForecast.test.tsx';
const BOARD = 'src/components/fight-promoter/FightPromoterBoard.tsx';
const FORECAST = 'src/components/fight-promoter/BoxingShowForecast.tsx';
const BASELINE = 'unchanged handover engine keeps its complete outcome and input';
const EMPTY = 'empty card offers no cash forecast and cannot run a show';
const GUARANTEE = 'guaranteed purses match the full actual show and reload';
const SHARE = 'the 58 percent share matches the full actual show and reload';
const NEGATIVE = 'negative cash predicts the actual closed result exactly once';
const ZERO = 'exactly zero cash predicts the actual open result';
const TICKET = 'ticket changes use current real economics without writing or advancing';
const VENUE = 'venue changes use current capacity rent and gate without writing';
const CARD = 'adding and removing actual bouts updates the complete cash forecast';
const BACK = 'cash help Back returns focus and preserves the live card';
const ESCAPE = 'cash help Escape returns focus and preserves the live card';
const PRECISION = 'money display keeps three digits grouping signs and rounded guarantees';
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
fs.mkdirSync(out, { recursive: true }); const before = holds(); save(path.join(out, 'source-before.json'), before);
process.on('exit', () => save(path.join(out, 'source-after.json'), holds()));

const controls = [
  ['guaranteeRound', FORECAST, 'Math.round(guaranteedPurses * 1000) / 1000', 'Math.floor(guaranteedPurses * 1000) / 1000', PRECISION],
  ['shareRate', FORECAST, 'Math.round(gate * 0.58 * 1000) / 1000', 'Math.round(gate * 0.50 * 1000) / 1000', SHARE],
  ['largerPay', FORECAST, 'Math.max(guarantees, share)', 'Math.min(guarantees, share)', GUARANTEE],
  ['roomCost', FORECAST, 'Math.round((gate - purses - rent) * 1000) / 1000', 'Math.round((gate - purses) * 1000) / 1000', SHARE],
  ['bankProfit', FORECAST, 'Math.round((money + profit) * 1000) / 1000', 'Math.round((money + profit * 2) * 1000) / 1000', NEGATIVE],
  ['lossLabel', FORECAST, "profit < 0 ? 'Loss' : 'Profit'", "profit < 0 ? 'Profit' : 'Loss'", GUARANTEE],
  ['negativeCash', FORECAST, '{cashAfter < 0 && <p role="status"', '{cashAfter <= 0 && <p role="status"', ZERO],
  ['zeroCash', FORECAST, '{cashAfter === 0 && <p role="status"', '{false && <p role="status"', ZERO],
  ['grouping', FORECAST, "value.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })", 'value.toFixed(3)', PRECISION],
  ['digits', FORECAST, 'minimumFractionDigits: 3, maximumFractionDigits: 3', 'minimumFractionDigits: 2, maximumFractionDigits: 2', PRECISION],
  ['examplePay', FORECAST, 'less {cash(purses)} fighter pay', 'less {cash(gate)} fighter pay', BACK],
  ['open', FORECAST, 'onOpenChange={setHelpOpen}', 'onOpenChange={() => undefined}', BACK],
  ['back', FORECAST, 'onClick={() => setHelpOpen(false)}', 'onClick={() => setHelpOpen(true)}', BACK],
  ['escape', FORECAST, 'onOpenChange={setHelpOpen}', 'onOpenChange={open => { if (open) setHelpOpen(true); }}', ESCAPE],
  ['closeFocus', FORECAST, 'helpTrigger.current?.focus({ preventScroll: true });', 'void helpTrigger.current;', BACK],
  ['openFocus', FORECAST, 'helpHeading.current?.focus({ preventScroll: true });', 'void helpHeading.current;', BACK],
  ['attendanceInput', BOARD, 'attendance={projected}', 'attendance={projected + 1}', TICKET],
  ['capacityInput', BOARD, 'capacity={venue.capacity}', 'capacity={venue.capacity + 1}', VENUE],
  ['gateInput', BOARD, 'gate={projectedGate}', 'gate={projectedGate + 1}', SHARE],
  ['guaranteeInput', BOARD, 'guaranteedPurses={projectedPurses}', 'guaranteedPurses={projectedPurses + 1}', GUARANTEE],
  ['rentInput', BOARD, 'rent={venue.rent}', 'rent={0}', VENUE],
  ['moneyInput', BOARD, 'money={st.money}', 'money={st.money + 1}', NEGATIVE],
  ['empty', BOARD, '{card.length > 0 && (', '{card.length >= 0 && (', EMPTY],
  ['remove', BOARD, 'onClick={() => setCard(card.filter((_, j) => j !== i))}', 'onClick={() => undefined}', CARD],
  ['previewDraw', FORECAST, 'const guarantees = Math.round(guaranteedPurses * 1000) / 1000;', 'Math.random(); const guarantees = Math.round(guaranteedPurses * 1000) / 1000;', TICKET],
  ['previewWrite', FORECAST, 'const guarantees = Math.round(guaranteedPurses * 1000) / 1000;', "localStorage.setItem('boxing-preview-control', 'spent'); const guarantees = Math.round(guaranteedPurses * 1000) / 1000;", TICKET],
  ['ticketUnits', BOARD, 'const price = priceK / 1e6;', 'const price = priceK / 1e5;', TICKET],
];
const observedFiles = [TEST, BOARD, FORECAST, 'src/lib/fightPromoter.ts', 'src/lib/fightCareer.ts', 'src/lib/careerEngine.ts', 'src/hooks/useGameCompletion.ts', 'src/lib/restoredFinish.ts', 'src/components/ui/dialog.tsx'];
for (const file of observedFiles) { const target = path.join(out, 'originals', file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(root, file), target); }

function run(name, replacement = null, intended = null) {
  const dir = path.join(out, name); fs.mkdirSync(dir, { recursive: true });
  const reportPath = path.join(dir, 'vitest-report.json'), configPath = path.join(dir, 'vitest.config.mjs');
  const aliases = replacement ? { [`@/${replacement.file.slice(4).replace(/\.tsx?$/, '')}`]: replacement.copy } : {};
  const interesting = observedFiles.map(file => unix(path.join(root, file))).concat(replacement ? [replacement.copy] : []);
  const config = `import { defineConfig } from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('vitest/config'))))};
import react from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('@vitejs/plugin-react-swc'))))};
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const seen = new Map(), dir = ${JSON.stringify(unix(dir))}, wanted = ${JSON.stringify(interesting)};
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
export default defineConfig({ root: ${JSON.stringify(unix(root))}, plugins: [react(), {
  name: 'retain-boxing-transform', enforce: 'post', transform(code, id) {
    const file = id.split('?')[0].replaceAll('\\\\', '/'); if (!wanted.includes(file)) return null;
    const input = fs.readFileSync(file), output = 'transforms/' + hash(file).slice(0, 16) + '.js';
    fs.mkdirSync(path.join(dir, 'transforms'), { recursive: true }); fs.writeFileSync(path.join(dir, output), code);
    seen.set(file, { file, inputSha256: hash(input), transformedSha256: hash(code), output });
    fs.writeFileSync(path.join(dir, 'transforms.json'), JSON.stringify([...seen.values()], null, 2)); return null;
  }
}], test: { environment: 'jsdom', globals: true, setupFiles: [${JSON.stringify(unix(path.join(root, 'src/test/setup.ts')))}], include: [${JSON.stringify(TEST)}], maxWorkers: 1, fileParallelism: false },
resolve: { alias: { ...JSON.parse(process.env.NO_DOUBLE_SWAP || '{}'), '@': ${JSON.stringify(unix(path.join(root, 'src')))} } } });
`;
  save(configPath, config);
  const args = ['node_modules/vitest/vitest.mjs', 'run', '--config', configPath, '--reporter=json', `--outputFile.json=${reportPath}`, '--reporter=default'];
  if (intended) args.push('-t', `^(${escape(BASELINE)}|${escape(intended)})$`);
  const child = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 180000,
    env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1', NO_DOUBLE_SWAP: JSON.stringify(aliases) } });
  save(path.join(dir, 'stdout.log'), child.stdout || ''); save(path.join(dir, 'stderr.log'), child.stderr || '');
  save(path.join(dir, 'process.json'), { args, aliases, status: child.status, signal: child.signal, error: child.error?.message ?? null });
  assert(!child.error && child.signal === null, `${name}: subprocess setup failure`);
  const output = `${child.stdout || ''}\n${child.stderr || ''}`;
  assert(!/Unhandled Errors|Unhandled Rejection|Cannot find module|Failed to resolve import|SyntaxError|Transform failed|Startup Error|Dynamic require/.test(output), `${name}: runtime/setup failure`);
  assert(fs.existsSync(reportPath), `${name}: missing actual Vitest report`);
  const raw = JSON.parse(fs.readFileSync(reportPath, 'utf8')), tests = raw.testResults.flatMap(file => file.assertionResults);
  assert.equal(raw.numUnhandledErrors ?? 0, 0, `${name}: unhandled errors`); assert.equal(raw.numRuntimeErrorTestSuites ?? 0, 0, `${name}: runtime suites`);
  assert.equal(raw.unhandledErrors?.length ?? 0, 0, `${name}: retained unhandled errors`); assert(raw.testResults.every(file => !file.testExecError), `${name}: suite execution error`);
  const marker = 'BOXING_FORECAST_RECORD|';
  const records = (child.stdout || '').split(/\r?\n/).filter(line => line.includes(marker)).map(line => JSON.parse(line.slice(line.indexOf(marker) + marker.length)));
  save(path.join(dir, 'records.json'), records);
  assert.equal(tests.length, COUNT, `${name}: test inventory changed`);
  const baseline = records.find(record => record.id === BASELINE);
  assert(baseline, `${name}: complete independent baseline missing`); assert.deepEqual(baseline.actual, baseline.expected, `${name}: baseline outcome changed`);
  assert.equal(tests.find(test => test.title === BASELINE)?.status, 'passed', `${name}: baseline failed`);
  const transforms = JSON.parse(fs.readFileSync(path.join(dir, 'transforms.json'), 'utf8'));
  for (const row of transforms) {
    const inputBytes = fs.readFileSync(row.file); assert.equal(sha(inputBytes), row.inputSha256, `${name}: transformed input bytes held`);
    const outputBytes = fs.readFileSync(path.join(dir, row.output)); assert.equal(sha(outputBytes), row.transformedSha256, `${name}: executable output bytes held`);
  }
  assert(transforms.some(row => row.file === unix(path.join(root, 'src/lib/fightPromoter.ts')) && row.inputSha256 === before['src/lib/fightPromoter.ts']), `${name}: actual unchanged engine was transformed`);
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
  for (const [name, file, from, to, intended] of controls) {
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
} catch (error) {
  summary.status = 'failed'; summary.error = String(error?.stack || error); throw error;
} finally {
  summary.sourceAfter = holds(); let sourceHoldError;
  try { assert.deepEqual(summary.sourceAfter, before, 'verification changed original source or fixtures'); }
  catch (error) { summary.status = 'failed'; summary.sourceHoldError = String(error?.stack || error); sourceHoldError = error; }
  save(path.join(out, 'source-after.json'), summary.sourceAfter); save(path.join(out, 'summary.json'), summary);
  if (sourceHoldError) throw sourceHoldError;
}
console.log(`Boxing cash: ${summary.normal.passed}/${COUNT} actual Board/component and unchanged baseline cases passed.`);
console.log(`Retained complete comparisons: ${summary.normal.records}, including full engine show/save and preview input holds.`);
console.log(`Copied controls: ${summary.controls.length}/${controls.length} actual mapped AssertionErrors with unchanged independent baseline.`);
console.log(`Source and fixture holds: ${Object.keys(before).length}; raw reports, copied sources and actual executable transforms retained.`);
console.log(`Boxing show forecast: passed. Evidence at ${out}`);
