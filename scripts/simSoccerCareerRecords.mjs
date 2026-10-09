// Actual saved-record outcomes, with copied defects required to fail named checks.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(ROOT, 'src/lib/soccerCareerRecords.ts');
const copy = path.join(ROOT, 'src/lib/__control_soccerCareerRecords.ts');
const report = path.join(ROOT, '.tmp-fx/career-records-tests.json');
function run(file) {
  fs.mkdirSync(path.dirname(report), { recursive: true });
  if (fs.existsSync(report)) fs.unlinkSync(report);
  const env = { ...process.env };
  if (file) { env.US_BOARD_CONTROL_ALIAS = '@/lib/soccerCareerRecords'; env.US_BOARD_CONTROL_FILE = file; }
  const r = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/test/soccerCareerRecords.test.tsx', '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', `--outputFile.json=${report}`], { cwd: ROOT, env, encoding: 'utf8', timeout: 180000 });
  process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
  if (r.error || r.signal) throw r.error || new Error(`test stopped ${r.signal}`);
  if (!fs.existsSync(report)) throw new Error('test assertion report missing');
  const suites = JSON.parse(fs.readFileSync(report, 'utf8')).testResults;
  if (!suites?.length || suites.some(s => !s.assertionResults?.length)) throw new Error('import error is not a regression proof');
  return { status: r.status, assertions: suites.flatMap(s => s.assertionResults) };
}
try {
  const healthy = run();
  if (healthy.status !== 0 || healthy.assertions.length !== 12 || healthy.assertions.some(a => a.status !== 'passed')) throw new Error('record-book outcomes failed or were skipped');
  const original = fs.readFileSync(source, 'utf8');
  const controls = [
    { name: 'academy counted', from: ".filter(r => r.season.type === 'playing')", to: '.filter(() => true)', test: 'counts only saved senior club stats' },
    { name: 'loan merged', from: ' || stint.parent !== parent', to: '', test: 'separates a loan from a permanent spell' },
    { name: 'short rating season', from: 'r.season.apps >= minApps', to: 'r.season.apps >= 1', test: 'uses actual records, keeps ties earliest' },
  ];
  for (const c of controls) {
    if (original.split(c.from).length !== 2) throw new Error(`${c.name} anchor not unique`);
    const changed = original.replace(c.from, c.to);
    if (changed === original) throw new Error(`${c.name} changed nothing`);
    fs.writeFileSync(copy, changed);
    const result = run(copy);
    if (result.status !== 1 || !result.assertions.some(a => a.status === 'failed' && a.fullName.includes(c.test))) throw new Error(`${c.name} escaped its outcome check`);
    console.log(`ok copied ${c.name} defect fired in its required outcome check`);
  }
  console.log('simSoccerCareerRecords: 12 outcome checks green, three effective controls caught');
} finally { if (fs.existsSync(copy)) fs.unlinkSync(copy); }