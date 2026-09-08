/** Round 522: real Profile, useStreaks and badges with synthetic backend reads.
 * Initial baseline: 12 named failures, one positive minute test passing.
 * Two editor cases were separately proven red before their production fixes.
 * SIM_PROFILE_ISOLATION_CONTROL selects a source mutation in unique OS-temp files.
 * No production client, source rewrite, dist access or actual network is needed.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/pages/Profile.isolation.test.tsx';
const PROFILE = path.join(ROOT, 'src/pages/Profile.tsx');
const CONTROL = process.env.SIM_PROFILE_ISOLATION_CONTROL || '';
const CASES = [
  ['clears populated A data when My Profile opens empty B without remounting', 'RESET: empty B cannot retain A scores, bracket, preferences or minutes'],
  ['writes B minute one rather than retained A minute 778', 'MINUTES: B first minute is one, never A 778'],
  ['waits for own preferences before starting the minute writer', 'READY: no minute write before own preferences settle'],
  ['ignores a late A username lookup after B settles', 'LOOKUP: obsolete A identity cannot replace settled B'],
  ['ignores an obsolete missing-profile redirect and toast', 'MISSING: obsolete lookup cannot redirect or toast over B'],
  ['ignores late A detail results after B settles', 'DETAILS: obsolete A batch cannot populate B'],
  ['ignores a late A leaderboard rank after B settles', 'RANK: obsolete A rank cannot appear on B'],
  ['ignores obsolete own fallback lookup returning a row', 'FALLBACK: obsolete own lookup cannot replace viewed A'],
  ['ignores obsolete own fallback lookup returning no row', 'FALLBACK: obsolete own lookup cannot replace viewed A'],
  ['closes the own-profile editor when navigating to A', 'EDITOR: B draft cannot remain on A profile'],
  ['increments the settled current account stored minutes', 'CURRENT: settled B minute seventeen advances to eighteen'],
  ['loads B identity and badges when auth temporarily retains cached profile A', 'AUTH IDENTITY: B cannot reuse cached A profile or A badge handle'],
  ['does not treat cached A username as owned by signed-in B', 'AUTH OWNERSHIP: signed-in B must view cached A as another account'],
  ['seeds the own username-route editor from its loaded identity', 'EDIT IDENTITY: own named editor starts with loaded B fields'],
  ['clears A editor fields when own B falls back to account metadata', 'EDIT FALLBACK: metadata B cannot inherit A editor fields'],
  ['does not turn a failed same-account preferences refresh into minute one', 'PREFS ERROR: failed B refresh must not write invented minute one'],
];
const expected = (...indices) => Object.fromEntries(indices.map(index => [index, CASES[index][1]]));
const allErrors = message => Object.fromEntries(CASES.map((_, index) => [index, message]));
const preferences = "      setFavouriteGame(p?.favourite_game || '');\n      setFavouriteTeam(p?.favourite_team || '');\n      setFavouritePlayer(p?.favourite_player || '');\n      setTimeSpent(p?.time_spent_minutes || 0);";
const rendered = '  return (\n    <>\n      <PageSeo';
const lookup = ".eq('username', username).maybeSingle();\n        if (cancelled) return;";
const fallback = "const { data: fp } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();\n          if (cancelled) return;";
const details = '      ]);\n      if (cancelled) return;\n\n      setBestScores';
const rank = ".gt('total_points', myPoints);\n        if (cancelled) return;";
const readiness = 'if (authLoading || loading || !user || !isOwnProfile || viewingProfile?.user_id !== user.id || !prefsReadReady) return;';
const unavailable = 'PREFS UNAVAILABLE: failed preferences are visibly unavailable and not editable';
const CONTROLS = {
  lookup: { from: lookup, to: lookup.replace('\n        if (cancelled) return;', ''), errors: expected(3, 4) },
  fallback: { from: fallback, to: fallback.replace('\n          if (cancelled) return;', ''), errors: expected(7, 8) },
  details: { from: details, to: details.replace('\n      if (cancelled) return;', ''), errors: expected(5) },
  rank: { from: rank, to: rank.replace('\n        if (cancelled) return;', ''), errors: expected(6) },
  cancel: { from: '    loadProfile();\n    return () => { cancelled = true; };', to: '    loadProfile();\n    return () => { cancelled = false; };', errors: expected(3, 4, 5, 6, 7, 8) },
  points: { from: 'setUserScoreData((userScoreRes.data as any) ?? null);', to: 'if (userScoreRes.data) setUserScoreData(userScoreRes.data as any);', errors: expected(0) },
  bracket: { from: 'setSavedBracket(bracketRes.data?.[0] ?? null);', to: 'if (bracketRes.data?.[0]) setSavedBracket(bracketRes.data[0]);', errors: expected(0) },
  preferences: { from: preferences, to: `      if (p) {\n${preferences}\n      }`, errors: expected(0, 1) },
  timer: { from: `${readiness}\n    const interval`, to: 'if (!user || !isOwnProfile) return;\n    const interval', errors: expected(2, 15) },
  tick: { from: 'const next = prev + 1;', to: 'const next = prev + 2;', errors: { ...expected(1, 2, 10), 15: 'PREFS RETRY: successful B retry restores editable data and advances seventeen to eighteen' } },
  cached: { from: 'if (profile?.user_id === user.id)', to: 'if (profile)', errors: expected(11) },
  ownership: { from: '(profile?.user_id === user?.id && profile?.username === username)', to: '(profile?.username === username)', errors: expected(12) },
  badges: { from: 'getBadgeState(viewingProfile)', to: 'getBadgeState(profile)', errors: expected(11) },
  editor: { from: '      setLoading(true);\n      setEditing(false);', to: '      setLoading(true);', errors: expected(9) },
  namededitor: { from: "          setEditForm({ display_name: profileData.display_name || '', username: profileData.username || '' });", to: '', errors: expected(13) },
  fallbackeditor: { from: "            setEditForm({ display_name: displayName || '', username: '' });", to: '', errors: expected(14) },
  prefserror: { from: 'setPrefsReadReady(!prefsRes.error);', to: 'setPrefsReadReady(true);', errors: expected(15) },
  prefstimer: { from: `${readiness}\n    const interval`, to: `${readiness.replace(' || !prefsReadReady', '')}\n    const interval`, errors: expected(15) },
  prefssave: { from: `${readiness}\n    setPrefsSaving(true);`, to: `${readiness.replace(' || !prefsReadReady', '')}\n    setPrefsSaving(true);`, errors: { 15: 'PREFS SAVE: failed preferences reject even a programmatic blur' } },
  prefstime: { from: "value: !prefsReadReady ? 'Unavailable' : timeSpent", to: 'value: timeSpent', errors: { 15: unavailable } },
  prefsmessage: { from: "Couldn't load your info. Refresh to try again.", to: 'Synthetic hidden-error control', errors: { 15: unavailable } },
  prefsgame: { from: 'value={favouriteGame}\n                      disabled={!prefsReadReady}', to: 'value={favouriteGame}\n                      disabled={false}', errors: { 15: unavailable } },
  prefsteam: { from: 'value={favouriteTeam}\n                      disabled={!prefsReadReady}', to: 'value={favouriteTeam}\n                      disabled={false}', errors: { 15: unavailable } },
  prefsplayer: { from: 'value={favouritePlayer}\n                      disabled={!prefsReadReady}', to: 'value={favouritePlayer}\n                      disabled={false}', errors: { 15: unavailable } },
  storage: { from: rendered, to: `  localStorage.setItem('dukb-streaks-v1', JSON.stringify({ ...JSON.parse(localStorage.getItem('dukb-streaks-v1')!), totalPoints: 123456 }));\n${rendered}`,
    errors: allErrors('STORAGE: profile navigation preserves seeded browser totals') },
  backend: { from: rendered, to: `  try { supabase.from('user_preferences').delete(); } catch { /* deliberately swallowed */ }\n${rendered}`,
    errors: allErrors('BOUNDARY: only exact fixture queries and allowed local minute captures occur') },
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-profile-isolation-'));
const slash = value => value.replaceAll('\\', '/');
let success = false;

try {
  const copy = path.join(temp, 'Profile.control.tsx');
  if (CONTROL) {
    const original = fs.readFileSync(PROFILE, 'utf8').replaceAll('\r\n', '\n');
    const { from, to } = CONTROLS[CONTROL];
    const matches = original.split(from).length - 1;
    if (matches !== 1) throw new Error(`${CONTROL}: expected one source anchor, found ${matches}`);
    const changed = original.replace(from, to);
    if (changed === original) throw new Error(`${CONTROL}: source control changed nothing`);
    fs.writeFileSync(copy, changed);
    console.log(`CONTROL ${CONTROL}: one exact source anchor changed in a unique OS-temp copy`);
  }
  const reporter = path.join(temp, 'reporter.mjs');
  const reportPath = path.join(temp, 'report.json');
  fs.writeFileSync(reporter, `import fs from 'node:fs';
export default class {
  onFinished(files, errors) {
    const tests = [];
    const shape = error => ({ name: error.name, message: error.message });
    const visit = task => {
      if (task.type === 'test') tests.push({ name: task.name, state: task.result?.state, errors: (task.result?.errors || []).map(shape) });
      for (const child of task.tasks || []) visit(child);
    };
    for (const file of files || []) visit(file);
    fs.writeFileSync(${JSON.stringify(reportPath)}, JSON.stringify({ files: (files || []).length, tests, unhandled: (errors || []).map(shape) }));
  }
}
`);
  const config = path.join(temp, 'vitest.config.mjs');
  fs.writeFileSync(config, `import fs from 'node:fs';
export default {
  root: ${JSON.stringify(slash(ROOT))}, cacheDir: ${JSON.stringify(slash(path.join(temp, 'cache')))},
  esbuild: { jsx: 'automatic' },
  plugins: [{ name: 'isolated-profile-control', enforce: 'pre', transform(code, id) {
    if (${!!CONTROL} && id.split('?')[0].replaceAll('\\\\', '/') === ${JSON.stringify(slash(PROFILE))}) {
      return { code: fs.readFileSync(${JSON.stringify(copy)}, 'utf8'), map: null };
    }
  } }],
  test: { environment: 'jsdom', globals: true, setupFiles: [${JSON.stringify(slash(path.join(ROOT, 'src/test/setup.ts')))}], include: [${JSON.stringify(TEST)}] },
  resolve: { alias: { '@': ${JSON.stringify(slash(path.join(ROOT, 'src')))} } },
};
`);
  const run = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--config', config, '--maxWorkers=1', `--reporter=${slash(reporter)}`], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1', NO_COLOR: '1' }, timeout: 120000, maxBuffer: 8 * 1024 * 1024,
  });
  const output = `${run.stdout || ''}${run.stderr || ''}`;
  if (run.error || run.signal || !fs.existsSync(reportPath)) throw new Error(`Runner did not complete: ${run.error || run.signal || output}`);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const names = CASES.map(([name]) => name);
  if (report.files !== 1 || report.tests.length !== names.length || new Set(report.tests.map(test => test.name)).size !== names.length
    || report.tests.some(test => !names.includes(test.name))) throw new Error('The exact sixteen named component tests were not reported');
  if (report.unhandled.length) throw new Error(`Unexpected runtime errors: ${JSON.stringify(report.unhandled)}`);
  const errors = CONTROL ? CONTROLS[CONTROL].errors : {};
  let exact = true;
  for (const [index, name] of names.entries()) {
    const test = report.tests.find(item => item.name === name);
    const message = errors[index];
    const matches = message
      ? test.state === 'fail' && test.errors.length === 1 && test.errors[0].name === 'AssertionError' && test.errors[0].message === message
      : test.state === 'pass' && test.errors.length === 0;
    exact &&= matches;
    console.log(`  ${matches ? (message ? 'EXPECTED RED' : 'PASS') : 'FAIL'} ${name}`);
    if (!matches) console.error(JSON.stringify(test));
  }
  if (!exact || run.status !== (CONTROL ? 1 : 0)) throw new Error(`Unexpected result or extra failure (Vitest exit ${run.status}):\n${output.slice(-4000)}`);
  console.log(`PASS: ${CONTROL ? `${Object.keys(errors).length} exact controlled failures, all other cases green` : '16/16 real Profile cases green'}; zero unhandled errors`);
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-profile-isolation-')) {
    throw new Error('Refusing cleanup outside the unique Profile-isolation temporary directory');
  }
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary Profile control files cleaned');
}
if (!success) process.exitCode = 1;
