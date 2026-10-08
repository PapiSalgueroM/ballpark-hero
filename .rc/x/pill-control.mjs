/* Scratch control for simResultPillComparison's text check, run on the runner from the repo root:
     node .rc/x/pill-control.mjs
   It makes ONE hook report a wrong value (Hall of Fame or Bust scores 1001 where the case expects
   the pill to read "1,000"), runs the real harness, puts the fixture file back byte for byte, and
   exits 0 only when the harness went red on exactly that one text finding. Not part of the branch. */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const file = 'scripts/lib/resultPillFixtures.ts';
const before = "hof('hof', 0, 1000)";
const after = "hof('hof', 0, 1001)";
const original = readFileSync(file);
const text = original.toString('utf8');
const count = text.split(before).length - 1;
if (count !== 1) { console.error('CONTROL REFUSED: anchor found ' + count + ' times, so it would prove nothing'); process.exit(2); }
let run;
try {
  writeFileSync(file, text.replace(before, after));
  run = spawnSync(process.execPath, ['scripts/simResultPillComparison.mjs'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} finally {
  writeFileSync(file, original);
}
const restored = readFileSync(file).equals(original);
const out = (run.stdout || '') + (run.stderr || '');
const fails = out.split('\n').filter(line => line.includes('FAIL ['));
const summary = out.split('\n').filter(line => line.startsWith('simResultPillComparison:'));
console.log('CONTROL wrong value: the hof hook reports 1001, the case expects the pill to read "1,000"');
for (const line of fails) console.log('  harness said:' + line);
for (const line of summary) console.log('  harness said: ' + line);
console.log('  harness exit ' + run.status + ', findings ' + fails.length + ', fixture file restored ' + restored);
const asExpected = run.status === 1 && fails.length === 1 && fails[0].includes('[text]') && fails[0].includes('/hof-or-bust') && fails[0].includes('1,001') && restored;
console.log(asExpected ? 'CONTROL OK: the wrong value turned the text check red, on that case only' : 'CONTROL FAILED: the harness did not go red the way a wrong value must make it');
process.exit(asExpected ? 0 : 1);
