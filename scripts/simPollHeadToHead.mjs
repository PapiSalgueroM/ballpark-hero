/* Poll of the Day head to head harness.

   The home page used to accept up to four database options and its fallback
   pool mixed players with ideas, yes or no answers and oddly specific
   questions. These rendered tests hold the two rules the visitor sees:

     1. A database row with four choices still renders exactly two sides.
     2. Every fallback is a named head to head with simple wording.
     3. Public marketing copy uses the rounded N+ count, including the 404.

   Negative controls run the real tests against changed copies. They refuse to
   count load errors as proof and require the intended assertion to fail.

   Run: node scripts/simPollHeadToHead.mjs
   Controls: SIM_POLL_CONTROL=multiway, databasewording, awkward or exactcount
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_POLL_CONTROL || '';
const TESTS = [
  'src/components/home/PollOfTheDay.test.tsx',
  'src/data/pollFixtures.test.ts',
  'src/data/gameRegistry.test.ts',
  'src/pages/NotFound.test.tsx',
];
const abort = message => { console.error(message); process.exit(1); };

function runVitest(env = {}, tests = TESTS) {
  const result = spawnSync(
    process.execPath,
    [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', ...tests],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  return { code: result.status, out: (result.stdout || '') + (result.stderr || '') };
}

function changedCopy(relativePath, needle, replacement, tempDir) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  const matches = source.split(needle).length - 1;
  if (matches !== 1) abort(`control cannot run: expected one target in ${relativePath}, found ${matches}`);
  const changed = source.replace(needle, replacement);
  if (changed === source) abort(`control cannot run: ${relativePath} bytes did not change`);
  const copy = path.join(tempDir, path.basename(relativePath));
  fs.writeFileSync(copy, changed);
  return copy.replaceAll('\\', '/');
}

let env = {};
let tests = TESTS;
let expectedFailure = '';
let expectedPass = '';
let expectedSignal = '';
const tempRoot = path.join(ROOT, 'dist', '.poll-control-');
let tempDir = null;

if (CONTROL) {
  fs.mkdirSync(path.dirname(tempRoot), { recursive: true });
  tempDir = fs.mkdtempSync(tempRoot);
}

if (CONTROL === 'multiway') {
  const needle = "          push('b', r.option_b, r.option_b_emoji, r.option_b_flag);";
  const replacement = `${needle}\n          push('c', r.option_c, r.option_c_emoji, r.option_c_flag);\n          push('d', r.option_d, r.option_d_emoji, r.option_d_flag);`;
  env.POLL_COMPONENT = changedCopy('src/components/home/PollOfTheDay.tsx', needle, replacement, tempDir);
  tests = [TESTS[0]];
  expectedFailure = 'shows exactly two sides';
  expectedPass = 'replaces an awkward database question';
  expectedSignal = 'to have a length of 2 but got 4';
  console.log('NEGATIVE CONTROL ON: four database choices render again');
} else if (CONTROL === 'databasewording') {
  const needle = `          const question = r.question === 'Who you got?'
            ? 'Who you got?'
            : 'Who ranks higher all time?';`;
  env.POLL_COMPONENT = changedCopy(
    'src/components/home/PollOfTheDay.tsx',
    needle,
    '          const question = r.question as string;',
    tempDir,
  );
  tests = [TESTS[0]];
  expectedFailure = 'replaces an awkward database question';
  expectedPass = 'shows exactly two sides';
  expectedSignal = 'Unable to find an element with the text: Who ranks higher all time?';
  console.log('NEGATIVE CONTROL ON: database wording reaches the page unchanged');
} else if (CONTROL === 'awkward') {
  const needle = "{ key: 'messi-ronaldo-prime', prompt: 'Who ranks higher all time?'";
  env.POLL_FIXTURES = changedCopy(
    'src/data/pollFixtures.ts',
    needle,
    "{ key: 'messi-ronaldo-prime', prompt: 'Messi or Ronaldo, who had the better peak?'",
    tempDir,
  );
  tests = [TESTS[1]];
  expectedFailure = 'keeps every fallback as a simple named head to head';
  expectedSignal = 'uses awkward wording';
  console.log('NEGATIVE CONTROL ON: awkward fallback wording returns');
} else if (CONTROL === 'exactcount') {
  env.NOT_FOUND_COUNT_CONTROL = 'exact';
  tests = [TESTS[3]];
  expectedFailure = 'offers the rounded game count instead of a brittle exact total';
  expectedSignal = 'expect(element).not.toBeInTheDocument()';
  console.log('NEGATIVE CONTROL ON: the 404 markets the exact game total again');
} else if (CONTROL) {
  fs.rmSync(tempDir, { recursive: true, force: true });
  abort(`unknown control "${CONTROL}" (multiway, databasewording, awkward, exactcount)`);
}

let code;
let out;
try {
  ({ code, out } = runVitest(env, tests));
} finally {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
}

if (!tests.every(test => out.includes(path.basename(test)))) {
  abort('vitest did not report every requested test file:\n' + out.slice(-1800));
}
if (/Failed to load|Cannot find module|SyntaxError|Failed to resolve import/.test(out)) {
  abort('the test or controlled copy did not load:\n' + out.slice(-1800));
}

if (!CONTROL) {
  if (code !== 0 || !/Tests\s+5 passed/.test(out)) abort('poll head to head regression is red:\n' + out.slice(-2400));
  console.log('Poll of the Day head-to-head regression');
  console.log('  database rows render exactly two named sides');
  console.log('  fallback and database questions use simple matchup wording');
  console.log('  public copy uses the rounded game count');
  console.log('Poll of the Day: 5 of 5 head to head and rounded count checks green');
  process.exit(0);
}

if (code === 0 || !out.includes(expectedSignal) || !/AssertionError|expected|Unable to find/.test(out)) {
  abort(`control "${CONTROL}" did not fail its own assertion:\n` + out.slice(-2400));
}
if (expectedPass && !new RegExp(`✓.*${expectedPass}`).test(out)) {
  abort(`control "${CONTROL}" also broke an unrelated assertion:\n` + out.slice(-2400));
}
console.log(`control "${CONTROL}": "${expectedFailure}" failed, the check works`);
