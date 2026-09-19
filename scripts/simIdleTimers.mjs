/**
 * Round 657 harness: an idle game's floater timers die with the page.
 *
 * The four idle games pushed a floating "+$1.2K" and a bare setTimeout to take
 * it down, and never cleared it, so leaving the page inside the window set
 * state on an unmounted hook. In the test suite the timer fired after jsdom was
 * torn down, which is the "window is not defined" error that made full Vitest
 * runs exit 1 and turned simTycoonPitch red in the 2026-09-19 suite. The fix is
 * one helper, src/hooks/useOwnedTimeouts.ts, used by all four.
 *
 * A) Behaviour: src/test/idleFloaterTimers.test.tsx taps Stadium Tycoon and Idle
 *    Arena three times each, unmounts, and requires every floater timer to have
 *    been cleared. Green needs Vitest's real exit code 0, both tests passed, and
 *    no unhandled error.
 * B) Source: no hook, page or component in src may start a timer whose callback
 *    calls setFloaters without the helper. Read as code, comments stripped.
 *
 * Controls, each must turn only its own section red:
 *   IDLE_TIMERS_CONTROL=noclear   points the suite at a copy of the helper that
 *                                 never clears (section A must go red, both tests)
 *   IDLE_TIMERS_CONTROL=rawtimer  plants a raw floater timer in a copy of one
 *                                 hook's source (section B must flag it)
 *   IDLE_TIMERS_CONTROL=all       runs both and checks each fired
 *
 * Run: node scripts/simIdleTimers.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/idleFloaterTimers.test.tsx';
const HELPER = path.join(ROOT, 'src/hooks/useOwnedTimeouts.ts');
const EXPECTED_TESTS = 2;
const CONTROL = process.env.IDLE_TIMERS_CONTROL || '';
/* Resolved the way node resolves it, so a worktree that borrows the main tree's node_modules works too. */
const VITEST = path.join(path.dirname(createRequire(path.join(ROOT, 'package.json')).resolve('vitest/package.json')), 'vitest.mjs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'idletimers-'));
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ } });
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');

/* A) the suite */
function runSuite(env) {
  const out = path.join(tmp, `report-${Object.keys(env).join('-') || 'plain'}.json`);
  const r = spawnSync(
    process.execPath,
    [VITEST, 'run', TEST, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 },
  );
  const text = (r.stdout || '') + (r.stderr || '');
  if (!fs.existsSync(out)) return { ok: false, why: 'Vitest wrote no report: ' + text.slice(-800) };
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  const rows = (report.testResults || []).flatMap(f => f.assertionResults || []);
  const passed = rows.filter(a => a.status === 'passed').length;
  const failed = rows.filter(a => a.status === 'failed');
  const unhandled = Number(report.numUnhandledErrors ?? 0) > 0 || /Unhandled (?:Errors?|Rejection)|Vitest caught \d+ unhandled/.test(text);
  return {
    ok: r.status === 0 && passed === EXPECTED_TESTS && failed.length === 0 && !unhandled,
    exit: r.status, passed, failed: failed.map(a => a.title), unhandled,
    why: failed.map(a => (a.failureMessages || [''])[0].split('\n')[0]).join(' | '),
  };
}

/* B) the source scan */
const RAW_FLOATER_TIMER = /\bsetTimeout\s*\(\s*\(\s*\)\s*=>\s*\{?\s*setFloaters\s*\(/;
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:"'`])\/\/[^\n]*/g, '$1');
}
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'test') out.push(...walk(p)); }
    else if (/\.(ts|tsx)$/.test(e.name) && !/^__control_/.test(e.name)) out.push(p);
  }
  return out;
}
function scan(files, override = {}) {
  const hits = [];
  for (const f of files) {
    const src = override[f] ?? read(f);
    if (RAW_FLOATER_TIMER.test(stripComments(src))) hits.push(path.relative(ROOT, f));
  }
  return hits;
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const files = walk(path.join(ROOT, 'src'));
if (CONTROL === 'noclear' || CONTROL === 'all') {
  const helper = read(HELPER);
  const from = '      owned.forEach(clearTimeout);\n';
  if (helper.split(from).length !== 2) { console.error('control noclear: the helper does not carry exactly one clearing line, so this control would prove nothing'); process.exit(1); }
  const broken = path.join(tmp, 'useOwnedTimeouts.noclear.ts');
  fs.writeFileSync(broken, helper.replace(from, '      /* control: never cleared */\n'));
  const r = runSuite({ OWNED_TIMEOUTS_HOOK: broken });
  console.log(`control noclear: exit ${r.exit}, ${r.passed} passed, failed [${r.failed.join('; ')}]`);
  if (r.ok || r.failed.length !== EXPECTED_TESTS) fail('control noclear did not turn both behaviour tests red');
  else console.log('  CONTROL FIRED: both games red on a helper that never clears');
}
if (CONTROL === 'rawtimer' || CONTROL === 'all') {
  const victim = path.join(ROOT, 'src/hooks/useIdleArena.ts');
  const src = read(victim);
  const from = 'later(() => setFloaters(';
  if (src.split(from).length !== 2) { console.error('control rawtimer: useIdleArena.ts does not carry exactly one owned floater timer, so this control would prove nothing'); process.exit(1); }
  const hits = scan(files, { [victim]: src.replace(from, 'window.setTimeout(() => setFloaters(') });
  const commentOnly = scan(files, { [victim]: src + '\n/* window.setTimeout(() => setFloaters(f => f), 1) */\n' });
  console.log(`control rawtimer: flagged [${hits.join(', ')}]; the same text in a comment flagged [${commentOnly.join(', ')}]`);
  if (hits.length !== 1 || !hits[0].endsWith('useIdleArena.ts')) fail('control rawtimer did not flag exactly the planted file');
  else if (commentOnly.length) fail('the scan read a comment as code');
  else console.log('  CONTROL FIRED: the planted raw timer was flagged and the comment was not');
}
if (CONTROL) {
  if (failures) { console.error(`simIdleTimers controls: ${failures} failed`); process.exit(1); }
  console.log('simIdleTimers controls: green. Each control turned its own check red and only that one.');
  process.exit(0);
}

console.log('A) behaviour: tap three times, unmount, every floater timer cleared');
const a = runSuite({});
console.log(`   Vitest exit ${a.exit}, ${a.passed} of ${EXPECTED_TESTS} passed, unhandled errors ${a.unhandled ? 'yes' : 'none'}`);
if (!a.ok) fail(`section A red: ${a.why || 'see above'}`);

console.log('B) source: no floater timer started without useOwnedTimeouts');
const hits = scan(files);
console.log(`   ${files.length} source files read, ${hits.length} raw floater timers`);
for (const h of hits) fail(`${h} starts a floater timer that nothing clears on unmount; use useOwnedTimeouts`);

console.log('');
if (failures) { console.error(`simIdleTimers: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simIdleTimers: green. Every idle game floater timer is owned by its page and dies with it.');
