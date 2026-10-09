/* Saved births and milestones drive the family summary. Copied defects must
   fail the newborn-year and yearly-variation outcome assertions. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(ROOT, 'src/lib/seasonFamilySummary.ts');
const copy = path.join(ROOT, 'src/lib/__control_seasonFamilySummary.ts');
const report = path.join(ROOT, '.tmp-fx/season-family-tests.json');
function run(file) {
  fs.mkdirSync(path.dirname(report), { recursive: true });
  if (fs.existsSync(report)) fs.unlinkSync(report);
  const env = { ...process.env };
  if (file) {
    env.US_BOARD_CONTROL_ALIAS = '@/lib/seasonFamilySummary';
    env.US_BOARD_CONTROL_FILE = file;
  }
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/test/seasonFamilySummary.test.ts', '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', `--outputFile.json=${report}`], { cwd: ROOT, env, encoding: 'utf8', timeout: 180000 });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error || result.signal) throw result.error || new Error(`test stopped: ${result.signal}`);
  if (!fs.existsSync(report)) throw new Error('test runner did not produce its assertion report');
  const suites = JSON.parse(fs.readFileSync(report, 'utf8')).testResults;
  if (!suites?.length || suites.some(suite => !suite.assertionResults?.length)) throw new Error('suite or import failure is not a regression proof');
  return { status: result.status, assertions: suites.flatMap(suite => suite.assertionResults) };
}

try {
  const current = run();
  if (current.status !== 0 || current.assertions.length !== 9 || current.assertions.some(assertion => assertion.status !== 'passed')) throw new Error('family summary outcome tests failed or were skipped');
  console.log('ok saved birth timing, child milestones, year variation and old saves');
  const original = fs.readFileSync(source, 'utf8');
  const controls = [
    { name: 'repeated newborn', anchor: 'if (birthYear === season.year) {', defect: 'if (birthYear !== null) {', assertion: 'gives a newborn dedication only in the actual saved birth season' },
    { name: 'repeated yearly copy', anchor: 'const variant = season.year % familyLines.length;', defect: 'const variant = 0;', assertion: 'varies later family copy by year without guessing an age for old saves' },
  ];
  for (const control of controls) {
    if (original.split(control.anchor).length !== 2) throw new Error(`${control.name} anchor must occur exactly once`);
    const changed = original.replace(control.anchor, control.defect);
    if (changed === original) throw new Error(`${control.name} control changed nothing`);
    fs.writeFileSync(copy, changed);
    const result = run(copy);
    if (result.status === 0 || !result.assertions.some(assertion => assertion.status === 'failed' && assertion.fullName.includes(control.assertion))) throw new Error(`${control.name} escaped its required outcome assertion`);
    console.log(`ok copied ${control.name} defect changed source and was caught`);
  }
  console.log('simSeasonFamilySummary: saved family progression green, both effective negative controls caught');
} finally {
  if (fs.existsSync(copy)) fs.unlinkSync(copy);
}
