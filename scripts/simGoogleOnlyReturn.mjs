/**
 * Round 610 harness: players who joined with Google can get back in while
 * Google sign in is paused.
 *
 * Round 509 hid the Google button until its Cloud Branding stops showing a
 * personal support email. An account made with Google has no password, so once
 * its session ends the only door left is Forgot password, and nothing on the
 * site said so. Measured on the live auth tables on 2026-09-15: 244 accounts
 * with a Google identity and no password, 0 had ever asked for a reset link, 0
 * had signed in fresh since 2026-09-08, and 63 were still riding sessions that
 * had not ended yet. No auth email of any kind had gone out since 2026-08-12, so
 * a signed in player is sent to the change password page, which needs none.
 *
 * WHAT THIS HOLDS, through src/components/auth/googlePaused.test.tsx over the
 * real modal, header and reset page:
 *   1 the sign in modal tells a Google player how to get back in (Log In only)
 *   2 a wrong password, or signing up again, points at Forgot password
 *   3 Forgot password sends the typed email's link to /reset-password
 *   4 only a Google identity with no email identity and no saved password counts,
 *     read from the identities list or, without one, app_metadata.providers
 *   5 the account menu offers that player the change password page, nobody else
 *   6 saving a password marks the account so the menu stops asking
 *   7 the day Google comes back, all of it goes quiet
 *   8 when the server wants a fresh sign in, the reset page offers the email link
 * plus A, a source check that none of the round's files carries an em or en dash.
 *
 * NEGATIVE CONTROLS, all run on every invocation. The test controls point the
 * GOOGLE_PAUSED_* variables at broken copies written to
 * src/.google-paused-control-<name>/ (removed afterwards), and each must turn
 * exactly its own tests red and leave the rest green:
 *   hint        the modal hint is never rendered                   -> 1
 *   message     the wrong password message loses its pointer        -> 2
 *   registered  the already registered message loses its pointer    -> 2
 *   forgot      Forgot password sends somebody else's address       -> 3
 *   flag        a saved password never hides the menu item          -> 4
 *   providers   the app_metadata fallback is dropped                -> 4
 *   menu        the menu item shows for any signed in player        -> 5
 *   reset       the reset page stops marking the account            -> 6
 *   gate        the menu item ignores the Google flag               -> 7
 *   reauth      the reset page never offers the email link          -> 8
 * and dashes, in process: a dash planted in a copy of the modal turns A red.
 *
 * Run: node scripts/simGoogleOnlyReturn.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/components/auth/googlePaused.test.tsx';
const FILES = {
  modal: { rel: 'src/components/auth/AuthModal.tsx', env: 'GOOGLE_PAUSED_MODAL' },
  header: { rel: 'src/components/layout/Header.tsx', env: 'GOOGLE_PAUSED_HEADER' },
  reset: { rel: 'src/pages/ResetPassword.tsx', env: 'GOOGLE_PAUSED_RESET' },
  lib: { rel: 'src/lib/googlePaused.ts', env: 'GOOGLE_PAUSED_LIB' },
};
const ROUND_FILES = [...Object.values(FILES).map(f => f.rel), TEST, 'scripts/simGoogleOnlyReturn.mjs'];
const TEST_COUNT = 8;
const DASH = new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']');

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\r\n').join('\n');
function mustReplace(text, from, to, what) {
  const n = text.split(from).length - 1;
  if (n !== 1) abort(`control cannot run: ${what} carries ${n} copies of ${JSON.stringify(from.slice(0, 70))}, not one, so it would prove nothing`);
  return text.replace(from, to);
}

/* A run killed mid-control never reaches its finally, so clear any copy an
   interrupted run left under src before this one writes its own. */
for (const e of fs.readdirSync(path.join(ROOT, 'src'))) {
  if (e.startsWith('.google-paused-control-')) fs.rmSync(path.join(ROOT, 'src', e), { recursive: true, force: true });
}

function dashFindings(sources) {
  const out = [];
  for (const [rel, text] of sources) {
    text.split('\n').forEach((line, i) => { if (DASH.test(line)) out.push(`${rel}:${i + 1}`); });
  }
  return out;
}

function runTests(env) {
  const out = path.join(ROOT, 'dist', `.google-paused-report-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', TEST, '--reporter=json', `--outputFile.json=${out}`],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 });
  const text = (r.stdout || '') + (r.stderr || '');
  if (!fs.existsSync(out)) return { rows: null, text };
  const rep = JSON.parse(fs.readFileSync(out, 'utf8'));
  fs.rmSync(out, { force: true });
  const rows = [];
  for (const file of rep.testResults || []) for (const a of file.assertionResults || []) {
    const why = (a.failureMessages || []).join('\n').split('\n').map(s => s.trim()).find(s => s && !s.startsWith('at ')) || '';
    rows.push({ n: Number((a.title.match(/^(\d+)/) || [])[1] || 0), title: a.title, status: a.status, why: why.slice(0, 240) });
  }
  return { rows, text };
}

console.log('Round 610: Google players can get back in while Google sign in is paused');
console.log('');
console.log("A) none of the round's files carries an em or en dash");
{
  const found = dashFindings(ROUND_FILES.map(rel => [rel, read(rel)]));
  if (found.length) fail(`a dash in ${found.join(', ')}`);
  else console.log(`   ok, ${ROUND_FILES.length} files`);
  const planted = dashFindings([[FILES.modal.rel, mustReplace(read(FILES.modal.rel), "Joined with Google? It's paused", 'Joined with Google? It' + String.fromCharCode(0x2014) + 's paused', 'AuthModal.tsx (dashes control)')]]);
  if (planted.length !== 1) fail(`control dashes: a dash planted in the modal was found ${planted.length} times, not once, so check A is dead`);
  else console.log('   control dashes: the planted dash was found, check A works');
}

console.log('');
console.log('B) the real modal, header and reset page');
const live = runTests({});
if (!live.rows) abort('the Round 610 test produced no report:\n' + live.text.slice(-2500));
if (/Failed to load|Cannot find module|Failed to resolve import|SyntaxError/.test(live.text)) abort('the test did not load:\n' + live.text.slice(-2500));
for (const row of live.rows) {
  console.log(`   ${row.status === 'passed' ? 'pass' : 'FAIL'}  ${row.title}`);
  if (row.status !== 'passed') console.log(`         ${row.why}`);
  if (row.status !== 'passed') fail(row.title);
}
if (live.rows.length !== TEST_COUNT) fail(`${live.rows.length} tests ran, expected ${TEST_COUNT}`);

const CONTROLS = [
  { name: 'hint', why: 'the modal hint is never rendered', red: [1], file: 'modal',
    edit: t => mustReplace(t, "{tab === 'login' && !OAUTH_PROVIDERS.google && (", '{false && (', 'AuthModal.tsx') },
  { name: 'message', why: 'the wrong password message loses its pointer', red: [2], file: 'modal',
    edit: t => mustReplace(t, "'Incorrect email or password. If you joined with Google, tap Forgot password to set one.'", "'Incorrect email or password. Double-check and try again.'", 'AuthModal.tsx') },
  { name: 'registered', why: 'the already registered message loses its pointer', red: [2], file: 'modal',
    edit: t => mustReplace(t, "'An account with this email already exists. If you joined with Google, go to Log In and tap Forgot password.'", "'An account with this email already exists. Try logging in instead.'", 'AuthModal.tsx') },
  { name: 'forgot', why: "Forgot password sends somebody else's address", red: [3], file: 'modal',
    edit: t => mustReplace(t, '    await sendPasswordLink(email);', "    await sendPasswordLink('nobody@example.com');", 'AuthModal.tsx') },
  { name: 'flag', why: 'a saved password never hides the menu item', red: [4], file: 'lib',
    edit: t => mustReplace(t, '  return user.user_metadata?.[PASSWORD_SET_FLAG] !== true;', '  return true;', 'googlePaused.ts') },
  { name: 'providers', why: 'the app_metadata fallback is dropped', red: [4], file: 'lib',
    edit: t => mustReplace(t, '  const providers = user.identities && user.identities.length > 0 ? user.identities.map(i => i.provider) : fromToken;', '  const providers = (user.identities ?? []).map(i => i.provider);', 'googlePaused.ts') },
  { name: 'menu', why: 'the menu item shows for any signed in player', red: [5], file: 'header',
    edit: t => mustReplace(t, '!OAUTH_PROVIDERS.google && isGoogleOnlyAccount(user) && (', '!OAUTH_PROVIDERS.google && (', 'Header.tsx') },
  { name: 'reset', why: 'the reset page stops marking the account', red: [6], file: 'reset',
    edit: t => mustReplace(t, '{ password, data: { [PASSWORD_SET_FLAG]: true } }', '{ password }', 'ResetPassword.tsx') },
  { name: 'gate', why: 'the menu item ignores the Google flag', red: [7], file: 'header',
    edit: t => mustReplace(t, '!OAUTH_PROVIDERS.google && isGoogleOnlyAccount(user) && (', 'isGoogleOnlyAccount(user) && (', 'Header.tsx') },
  { name: 'reauth', why: 'the reset page never offers the email link', red: [8], file: 'reset',
    edit: t => mustReplace(t, '      setLinkInstead(reauth);', '      setLinkInstead(false);', 'ResetPassword.tsx') },
];

for (const control of CONTROLS) {
  console.log('');
  console.log(`C.${control.name}) negative control: ${control.why}`);
  const spec = FILES[control.file];
  const dir = fs.mkdtempSync(path.join(ROOT, 'src', `.google-paused-control-${control.name}-`));
  let result;
  try {
    const copy = path.join(dir, path.basename(spec.rel));
    fs.writeFileSync(copy, control.edit(read(spec.rel)));
    result = runTests({ [spec.env]: copy.split(path.sep).join('/') });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  if (!result.rows || /Failed to load|Cannot find module|Failed to resolve import|SyntaxError/.test(result.text)) {
    fail(`control ${control.name}: the controlled copy did not load:\n${result.text.slice(-1500)}`);
    continue;
  }
  for (const row of result.rows) {
    const want = control.red.includes(row.n) ? 'failed' : 'passed';
    console.log(`   ${row.status === want ? 'ok  ' : 'BAD '} ${row.status.padEnd(6)} ${row.title}`);
    if (row.status === 'failed') console.log(`         ${row.why}`);
    if (row.status !== want) fail(`control ${control.name}: "${row.title}" ${want === 'failed' ? 'stayed green, so that check is dead' : 'went red too'}`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`simGoogleOnlyReturn: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simGoogleOnlyReturn: green.');
console.log(`   ${TEST_COUNT} of ${TEST_COUNT} rendered checks pass, no dash in the round's files, and all ${CONTROLS.length + 1} controls turned exactly their own checks red.`);
