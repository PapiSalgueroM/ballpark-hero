/* Poll of the Day character harness (Round 521, replacing simPollHeadToHead).
 *
 * The owner, 2026-09-10: "your polls are extremely dull u should add more
 * character like u used to make them". The dullness had a mechanism: Round
 * 509's component rewrote every database question to one of two strings and
 * dropped the third and fourth choices, so a topical row written by the polls
 * routine reached the screen as "Who ranks higher all time?" over 49ers and
 * Rams. This harness holds the replacement contract through the rendered
 * tests:
 *
 *   1. The database question renders AS WRITTEN, and a row's two, three or
 *      four choices all render.
 *   2. The fallback pool keeps its prompts varied (the two canned strings are
 *      at most a fifth of it, no prompt is reused more than three times), asks
 *      a real question every time, and keeps every choice inside the owner's
 *      2026-08-16 rule (three words, never a sentence).
 *   3. Public marketing copy uses the rounded N+ count, including the 404.
 *
 * Negative controls run the real tests against changed copies. They refuse to
 * count load errors as proof and require the intended assertion to fail while
 * a sibling assertion still passes.
 *
 * Run: node scripts/simPollCharacter.mjs
 * Controls: SIM_POLL_CONTROL=canned, twoway, dull, corny or exactcount
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

/* A control that rewrites a string the file does not contain changes nothing
   and the harness stays green for the wrong reason, so every swap asserts its
   target is present exactly once (or, for the sweep, many times). */
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

function sweptCopy(relativePath, pattern, replacement, atLeast, tempDir) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  const matches = (source.match(pattern) ?? []).length;
  if (matches < atLeast) abort(`control cannot run: expected at least ${atLeast} targets in ${relativePath}, found ${matches}`);
  const changed = source.replace(pattern, replacement);
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

if (CONTROL === 'canned') {
  const needle = "          const question = typeof r.question === 'string' ? r.question.trim() : '';";
  env.POLL_COMPONENT = changedCopy(
    'src/components/home/PollOfTheDay.tsx',
    needle,
    "          const question = 'Who ranks higher all time?';",
    tempDir,
  );
  tests = [TESTS[0]];
  expectedFailure = 'renders the database question as written';
  expectedPass = 'renders every choice a row carries';
  expectedSignal = 'Unable to find an element with the text: Niners vs Rams';
  console.log('NEGATIVE CONTROL ON: the component flattens the question again');
} else if (CONTROL === 'twoway') {
  const needle = "          push('c', r.option_c, r.option_c_emoji, r.option_c_flag);\n          push('d', r.option_d, r.option_d_emoji, r.option_d_flag);";
  env.POLL_COMPONENT = changedCopy('src/components/home/PollOfTheDay.tsx', needle, '', tempDir);
  tests = [TESTS[0]];
  expectedFailure = 'renders every choice a row carries';
  expectedPass = 'renders the database question as written';
  expectedSignal = 'to have a length of 4 but got 2';
  console.log('NEGATIVE CONTROL ON: the third and fourth choices are dropped again');
} else if (CONTROL === 'dull') {
  env.POLL_FIXTURES = sweptCopy('src/data/pollFixtures.ts', /prompt: '[^']*'/g, "prompt: 'Who you got?'", 20, tempDir);
  tests = [TESTS[1]];
  expectedFailure = 'keeps the prompts varied';
  expectedPass = 'keeps every choice short';
  expectedSignal = 'prompts are the canned strings';
  console.log('NEGATIVE CONTROL ON: every fallback prompt is the same string');
} else if (CONTROL === 'corny') {
  const needle = "a: '🐐 Brady', b: '⚡ Mahomes'";
  env.POLL_FIXTURES = changedCopy(
    'src/data/pollFixtures.ts',
    needle,
    "a: '🐐 Brady, obviously the pick here', b: '⚡ Mahomes'",
    tempDir,
  );
  tests = [TESTS[1]];
  expectedFailure = 'keeps every choice short';
  expectedPass = 'keeps the prompts varied';
  expectedSignal = 'runs past three words';
  console.log('NEGATIVE CONTROL ON: a choice becomes a sentence again');
} else if (CONTROL === 'exactcount') {
  env.NOT_FOUND_COUNT_CONTROL = 'exact';
  tests = [TESTS[3]];
  expectedFailure = 'offers the rounded game count instead of a brittle exact total';
  expectedSignal = 'expect(element).not.toBeInTheDocument()';
  console.log('NEGATIVE CONTROL ON: the 404 markets the exact game total again');
} else if (CONTROL) {
  fs.rmSync(tempDir, { recursive: true, force: true });
  abort(`unknown control "${CONTROL}" (canned, twoway, dull, corny, exactcount)`);
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
  const passed = Number((out.match(/Tests\s+(\d+) passed/) ?? [])[1] ?? 0);
  /* eight of the tests are the poll contract (four rendered, four on the
     pool); the registry and 404 files ride along as before */
  if (code !== 0 || passed < 8) abort(`poll character regression is red (${passed} passed):\n` + out.slice(-2400));
  console.log('Poll of the Day character regression');
  console.log('  database questions render as written, with two to four choices');
  console.log('  the fallback pool stays varied, asks real questions, keeps choices short');
  console.log('  public copy uses the rounded game count');
  console.log(`Poll of the Day: ${passed} tests green across ${tests.length} files`);
  process.exit(0);
}

if (code === 0 || !out.includes(expectedSignal) || !/AssertionError|expected|Unable to find/.test(out)) {
  abort(`control "${CONTROL}" did not fail its own assertion:\n` + out.slice(-2400));
}
if (expectedPass && !new RegExp(`✓.*${expectedPass}`).test(out)) {
  abort(`control "${CONTROL}" also broke an unrelated assertion:\n` + out.slice(-2400));
}
console.log(`control "${CONTROL}": "${expectedFailure}" failed, the check works`);
