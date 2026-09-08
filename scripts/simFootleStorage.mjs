/**
 * Round 516 Footle first-visit storage fence.
 *
 * Runs the five focused tests against the real page, then writes an isolated
 * temporary copy carrying the original unguarded effect and requires exactly
 * the getter, read and write denial tests to fail. The production source is
 * never rewritten. runAllSims discovers this file by its sim* name.
 *
 * Run: node scripts/simFootleStorage.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const TEST = 'src/pages/Footle.storage.test.tsx';
const EXPECTED_TESTS = 5;
const expectedControlFailures = [
  'shows the guide without a page error when the storage getter is denied',
  'shows the guide without a page error when the storage read is denied',
  'shows the guide without a page error when the storage write is denied',
];
const temp = fs.mkdtempSync(path.join(SCRIPTS, '.footle-storage-control-'));
const controlSource = path.join(temp, 'Footle.tsx');
const config = path.join(temp, 'vitest.config.mjs');
const reporter = path.join(temp, 'runtime-reporter.mjs');

function assertChild(parent, candidate, label) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label} is outside its intended temporary directory`);
  }
}

function cleanup() {
  assertChild(SCRIPTS, temp, 'Footle storage temporary directory');
  if (!path.basename(temp).startsWith('.footle-storage-control-')) {
    throw new Error('Footle storage temporary directory has an unexpected name');
  }
  fs.rmSync(temp, { recursive: true, force: true });
}

function slash(value) {
  return value.replaceAll('\\', '/');
}

function writeConfig(component) {
  const exactPage = component ? path.resolve(component) : path.join(ROOT, 'src/pages/Footle.tsx');
  const source = `
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  root: ${JSON.stringify(slash(ROOT))},
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [${JSON.stringify(slash(path.join(ROOT, 'src/test/setup.ts')))}],
    include: [${JSON.stringify(TEST)}],
  },
  resolve: {
    alias: [
      { find: '@/pages/Footle', replacement: ${JSON.stringify(slash(exactPage))} },
      { find: '@', replacement: ${JSON.stringify(slash(path.join(ROOT, 'src')))} },
    ],
  },
});
`;
  assertChild(temp, config, 'Footle storage temporary config');
  fs.writeFileSync(config, source);
}

function writeReporter() {
  const source = `import fs from 'node:fs';
export default class {
  onFinished(_files, errors) {
    fs.writeFileSync(process.env.FOOTLE_STORAGE_ERROR_REPORT, JSON.stringify((errors || []).map(error => String(error?.stack || error?.message || error))));
  }
}
`;
  assertChild(temp, reporter, 'Footle storage temporary reporter');
  fs.writeFileSync(reporter, source);
}

function writeOriginalEffectControl() {
  const production = fs.readFileSync(path.join(ROOT, 'src/pages/Footle.tsx'), 'utf8').replaceAll('\r\n', '\n');
  const guarded = `  useEffect(() => {
    try {
      const seen = localStorage.getItem('footle-rules-seen');
      if (!seen) {
        setShowRules(true);
        localStorage.setItem('footle-rules-seen', '1');
      }
    } catch {
      setShowRules(true);
    }
  }, []);`;
  const original = `  useEffect(() => {
    const seen = localStorage.getItem('footle-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('footle-rules-seen', '1');
    }
  }, []);`;
  const matches = production.split(guarded).length - 1;
  if (matches !== 1) throw new Error(`original-effect control expected one guarded effect, found ${matches}`);
  const controlled = production.replace(guarded, original);
  if (controlled === production) throw new Error('original-effect control changed nothing');
  assertChild(temp, controlSource, 'Footle storage control source');
  fs.writeFileSync(controlSource, controlled);
}

function run(label, component = '') {
  writeConfig(component);
  const reportPath = path.join(temp, `${label}.json`);
  const errorReportPath = path.join(temp, `${label}-runtime-errors.json`);
  assertChild(temp, reportPath, `${label} JSON report`);
  assertChild(temp, errorReportPath, `${label} runtime-error report`);
  const result = spawnSync(
    process.execPath,
    ['node_modules/vitest/vitest.mjs', 'run', TEST, '--config', config,
      '--maxWorkers=1', `--reporter=${slash(reporter)}`, '--reporter=json', `--outputFile.json=${reportPath}`],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        FOOTLE_STORAGE_ERROR_REPORT: errorReportPath,
        CI: '1',
        NO_COLOR: '1',
      },
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.error) throw new Error(`${label} runner error: ${result.error.message}`);
  if (result.signal) throw new Error(`${label} runner ended on signal ${result.signal}`);
  if (!fs.existsSync(reportPath)) throw new Error(`${label} produced no JSON report: ${output.slice(0, 2000)}`);
  if (!fs.existsSync(errorReportPath)) throw new Error(`${label} produced no runtime-error report: ${output.slice(0, 2000)}`);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const runtimeErrors = JSON.parse(fs.readFileSync(errorReportPath, 'utf8'));
  if (!Array.isArray(runtimeErrors) || runtimeErrors.some(error => typeof error !== 'string')) {
    throw new Error(`${label} runtime-error report is not a valid string array`);
  }
  if ((report.testResults || []).length !== 1) {
    throw new Error(`${label} reported ${(report.testResults || []).length}/1 test files`);
  }
  const rows = (report.testResults[0].assertionResults || []).map(assertion => ({
    title: (assertion.title || '').trim(),
    fullName: (assertion.fullName || '').trim(),
    status: assertion.status,
    messages: (assertion.failureMessages || []).join('\n'),
  }));
  if (rows.length !== EXPECTED_TESTS) throw new Error(`${label} reported ${rows.length}/${EXPECTED_TESTS} tests`);
  if (new Set(rows.map(row => row.fullName)).size !== rows.length) throw new Error(`${label} reported duplicate test names`);
  return { rows, exitCode: result.status, runtimeErrors };
}

let failed = false;
try {
  writeReporter();
  console.log(`Footle storage: ${EXPECTED_TESTS} focused tests against the real page`);
  const live = run('live');
  for (const row of live.rows) console.log(`  ${row.status === 'passed' ? 'PASS' : 'FAIL'}  ${row.fullName}`);
  if (live.exitCode !== 0 || live.rows.some(row => row.status !== 'passed') || live.runtimeErrors.length !== 0) {
    throw new Error(`live page was not ${EXPECTED_TESTS}/${EXPECTED_TESTS} green with zero runtime errors (exit ${live.exitCode}, runtime errors ${live.runtimeErrors.length})`);
  }

  writeOriginalEffectControl();
  console.log('\nOriginal-effect negative control: isolated temporary page copy');
  const controlled = run('original-effect', controlSource);
  const red = controlled.rows.filter(row => row.status === 'failed');
  const redTitles = red.map(row => row.title);
  for (const row of red) console.log(`  RED as designed  ${row.fullName}`);
  const exactFailures = redTitles.length === expectedControlFailures.length
    && expectedControlFailures.every(title => redTitles.includes(title))
    && redTitles.every(title => expectedControlFailures.includes(title));
  const healthyStayedGreen = controlled.rows
    .filter(row => !expectedControlFailures.includes(row.title))
    .every(row => row.status === 'passed');
  const denialEvidence = red.every(row => /Storage denied/.test(row.messages));
  if (controlled.exitCode !== 1 || !exactFailures || !healthyStayedGreen || !denialEvidence || controlled.runtimeErrors.length !== 0) {
    throw new Error(`control expected only the three denial tests RED with Storage denied evidence and zero runtime errors, got exit ${controlled.exitCode}, runtime errors ${controlled.runtimeErrors.length}: ${redTitles.join(' | ') || 'no failures'}`);
  }
  console.log('\nPASS: live page is 5/5 green and the isolated original effect fails only all three denial guards');
} catch (error) {
  failed = true;
  console.error(`\nFAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  try {
    cleanup();
    console.log('PASS: temporary control files cleaned');
  } catch (error) {
    failed = true;
    console.error(`FAIL: cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) process.exit(1);
