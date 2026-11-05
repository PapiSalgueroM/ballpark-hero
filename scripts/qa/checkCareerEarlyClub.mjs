import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const PAGE = 'src/pages/CareerGame.tsx';
const TEST = 'src/test/careerEarlyClubHint.test.tsx';
const OUT = path.resolve('early-club-artifacts/arms');
fs.mkdirSync(OUT, { recursive: true });
const source = fs.readFileSync(PAGE, 'utf8');
const sha = value => createHash('sha256').update(value).digest('hex');
const original = execFileSync('git', ['show', 'f0f6e773ad71a7444dc67998dad070098ff5fe28:' + PAGE], { encoding: 'utf8' });
assert.notEqual(sha(original), sha(source), 'EARLY_CLUB_SOURCE_CHANGED');
const rows = [];
function replaceOnce(from, to) {
  assert.equal(source.split(from).length, 2, 'Effective unique page fault: ' + from);
  const output = source.replace(from, to);
  assert.notEqual(sha(output), sha(source), 'Fault changed source');
  return output;
}
function run(name, text, expected) {
  const dir = path.join(OUT, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'CareerGame.tsx'), text);
  fs.writeFileSync(PAGE, text);
  const outfile = path.join(dir, 'tests.json');
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST,
    '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', '--outputFile=' + outfile],
    { encoding: 'utf8', maxBuffer: 24 * 1024 * 1024, timeout: 150000, env: process.env });
  fs.writeFileSync(path.join(dir, 'stdout.log'), child.stdout ?? '');
  fs.writeFileSync(path.join(dir, 'stderr.log'), child.stderr ?? '');
  assert(fs.existsSync(outfile), name + ': actual test report exists');
  const report = JSON.parse(fs.readFileSync(outfile, 'utf8'));
  const cases = report.testResults.flatMap(suite => suite.assertionResults);
  const failures = cases.filter(row => row.status === 'failed');
  const frame = { name, sourceSHA256: sha(text), childStatus: child.status, cases, failures: failures.map(row => row.title) };
  rows.push(frame);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rows, null, 2));
  assert.equal(cases.length, 11, name + ': complete case census');
  assert.equal(cases.filter(row => row.status === 'pending' || row.status === 'skipped').length, 0);
  assert.equal(cases.find(row => row.title.startsWith('keeps the original four-random-cell'))?.status, 'passed', name + ': classic hint holds');
  if (expected.length === 0) {
    assert.equal(child.status, 0, name + ': green child exit');
    assert.equal(failures.length, 0, name + ': every case passes');
  } else {
    assert.equal(child.status, 1, name + ': business failure exit');
    assert.deepEqual(failures.map(row => row.title.split(' ')[0]), expected, name + ': exact failed business case set');
    assert(failures.every(row => /^(?:AssertionError: EARLY_CLUB_|Error: expect\(element\)\.(?:toBeDisabled|toHaveClass|toHaveTextContent)\()/m.test(row.failureMessages.join('\n').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, ''))), name + ': named assertion or actual expected DOM matcher failures only');
  }
  console.log(name + ': ' + (cases.length - failures.length) + ' passed, ' + failures.length + ' exact named failures');
}
try {
  run('original', original, ["EARLY_CLUB_NATIVE","EARLY_CLUB_ORDER","EARLY_CLUB_SKIP","EARLY_CLUB_EXHAUST","EARLY_CLUB_EMPTY","EARLY_CLUB_RELOAD","EARLY_CLUB_UNLIMITED","EARLY_CLUB_MANUAL","EARLY_CLUB_FINISHED","EARLY_CLUB_STALE"]);
  assert.equal(rows[0].failures.length, 10, 'Original ten missing-feature failures');
  run('fixed', source, []);
  const controls = [
  [
    "repeat-revealed",
    " && !revealedCells.has(`${rowIdx}-club`)",
    "",
    [
      "EARLY_CLUB_SKIP",
      "EARLY_CLUB_EXHAUST",
      "EARLY_CLUB_RELOAD",
      "EARLY_CLUB_UNLIMITED",
      "EARLY_CLUB_STALE"
    ]
  ],
  [
    "allow-empty",
    "row.club.trim().length > 0 && ",
    "",
    [
      "EARLY_CLUB_ORDER",
      "EARLY_CLUB_SKIP",
      "EARLY_CLUB_EXHAUST",
      "EARLY_CLUB_EMPTY",
      "EARLY_CLUB_RELOAD",
      "EARLY_CLUB_UNLIMITED",
      "EARLY_CLUB_FINISHED",
      "EARLY_CLUB_STALE"
    ]
  ],
  [
    "random-instead",
    "onClick={() => { if (earlyClubIndex >= 0) revealCell(`${earlyClubIndex}-club`); }}",
    "onClick={giveHint}",
    [
      "EARLY_CLUB_ORDER",
      "EARLY_CLUB_SKIP",
      "EARLY_CLUB_EXHAUST",
      "EARLY_CLUB_RELOAD",
      "EARLY_CLUB_UNLIMITED",
      "EARLY_CLUB_MANUAL",
      "EARLY_CLUB_FINISHED",
      "EARLY_CLUB_STALE"
    ]
  ],
  [
    "enabled-exhausted",
    "disabled={earlyClubIndex < 0}",
    "disabled={false}",
    [
      "EARLY_CLUB_EXHAUST",
      "EARLY_CLUB_EMPTY"
    ]
  ],
  [
    "omit-visible-cost",
    "Early club: 1 box. Give Hint: up to 4 random boxes.",
    "",
    [
      "EARLY_CLUB_NATIVE"
    ]
  ],
  [
    "omit-touch-target",
    "min-h-[44px] px-4 py-2 text-sm rounded-full bg-secondary",
    "px-4 py-2 text-sm rounded-full bg-secondary",
    [
      "EARLY_CLUB_NATIVE"
    ]
  ],
  [
    "omit-rule-cost",
    "                  <li>\n                    <span className=\"text-foreground font-semibold\">Reveal an early club</span> opens the earliest club box still hidden on this board for 1 box.\n                  </li>\n                  <li>Example: if the first club is already open, Reveal an early club opens the next hidden club for 1 box.</li>\n",
    "",
    [
      "EARLY_CLUB_NATIVE"
    ]
  ]
];
  for (const [name, from, to, expected] of controls) run(name, replaceOnce(from, to), expected);
  run('restored', source, []);
} finally {
  fs.writeFileSync(PAGE, source);
  assert.equal(sha(fs.readFileSync(PAGE)), sha(source), 'Actual page restored exactly');
}
