/** Round 528: explicit runner selection, using the actual runner in fake repos.
 * All children only write OS-temp markers. Fetch is intercepted before runner
 * import; the fake browser server writes a marker and never opens a socket.
 * RUNNER_SELECTION_BASELINE=1 runs only the original unset-input case. It is
 * red against pre-guard runner source and green when the gate is present.
 * SIM_RUNNER_SELECTION_CONTROL removes one exact source anchor in the copy.
 * Controls require their named behavioral failures and actual fixture activity;
 * runtime/load errors are rejected and cannot earn passing-control credit.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const original = fs.readFileSync(path.join(ROOT, 'scripts/runAllSims.mjs'), 'utf8').replaceAll('\r\n', '\n');
const CONTROL = process.env.SIM_RUNNER_SELECTION_CONTROL || '';
const BASELINE = process.env.RUNNER_SELECTION_BASELINE === '1';
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-runner-selection-'));
const failures = [], results = [];
let runner = original, success = false;
const noSelection = ['unset', 'empty', 'spaces', 'commas', 'browserflag', 'browserenv', 'forcedreachable', 'forcedunreachable'];
function replaceExact(from, to) {
  const matches = runner.split(from).length - 1;
  if (matches !== 1 || from === to) throw new Error(`${CONTROL}: expected one effective source anchor, found ${matches}`);
  runner = runner.replace(from, to);
  if (runner === original) throw new Error(`${CONTROL}: source control changed nothing`);
  console.log(`CONTROL ${CONTROL}: one exact runner source anchor changed in the OS-temp copy`);
}
function check(id, condition, evidence) {
  if (!condition) failures.push(id);
  console.log(`${condition ? 'PASS' : 'FAIL'} ${id}: ${evidence}`);
}
function runFixture(id, options = {}) {
  const root = path.join(temp, id), scripts = path.join(root, 'scripts'), markerPath = path.join(root, 'markers.jsonl');
  fs.mkdirSync(path.join(scripts, 'lib'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src/integrations/supabase'), { recursive: true });
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(scripts, 'runAllSims.mjs'), runner);
  fs.writeFileSync(path.join(root, 'src/integrations/supabase/client.ts'), "export const SUPABASE_URL = 'https://runner-fixture.invalid';\nexport const SUPABASE_PUBLISHABLE_KEY = 'synthetic-public-key';\n");
  fs.writeFileSync(path.join(root, 'dist/index.html'), '<!doctype html><title>Synthetic fixture</title>');
  const record = `import fs from 'node:fs';\nconst marker = item => fs.appendFileSync(${JSON.stringify(markerPath)}, JSON.stringify(item) + '\\n');\n`;
  const child = name => `${record}
marker({ type: 'child', name: ${JSON.stringify(name)}, only: process.env.ONLY ?? null, browser: process.env.BROWSER ?? null });
const mode = process.env.RUNNER_FIXTURE_MODE;
if (mode === 'quiet') { console.log('Synthetic quiet fixture'); process.exit(0); }
console.log('Synthetic fixture started');
console.log('Synthetic fixture ran');
console.log('Synthetic fixture checked');
console.log(mode === 'nothing' ? 'DATABASE UNREACHABLE. NOTHING WAS CHECKED.' : 'Synthetic fixture completed');
if (mode === 'badexit' || mode === 'nothing') process.exit(7);
`;
  fs.writeFileSync(path.join(scripts, 'simAlpha.mjs'), child('alpha'));
  fs.writeFileSync(path.join(scripts, 'simBeta.mjs'), child('beta'));
  fs.writeFileSync(path.join(scripts, 'lib/playwrightFixture.mjs'), 'export {};\n');
  const browserImport = ['im', 'port'].join('') + " './lib/playwrightFixture.mjs';\n";
  fs.writeFileSync(path.join(scripts, 'simBrowser.mjs'), browserImport + child('browser'));
  fs.writeFileSync(path.join(scripts, 'lib/hostLikeServer.mjs'), `${record}marker({ type: 'server' });\nsetTimeout(() => process.exit(0), 2000);\n`);
  const preload = path.join(root, 'preload.mjs');
  fs.writeFileSync(preload, `${record}
globalThis.fetch = async url => {
  if (String(url) === 'https://runner-fixture.invalid/rest/v1/') marker({ type: 'probe' });
  else if (String(url) === 'http://127.0.0.1:4173/') {
    marker({ type: 'poll' });
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (fs.existsSync(${JSON.stringify(markerPath)}) && fs.readFileSync(${JSON.stringify(markerPath)}, 'utf8').includes('"type":"server"')) break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  } else { marker({ type: 'unexpected-fetch', url: String(url) }); throw new Error('Unexpected synthetic fixture fetch'); }
  return { ok: true, status: 200, text: async () => 'Synthetic response' };
};
`);
  const env = { ...process.env, NODE_OPTIONS: '', NO_COLOR: '1' };
  for (const name of ['ONLY', 'BROWSER', 'DB_PROBE', 'PORT', 'RUNNER_FIXTURE_MODE']) delete env[name];
  Object.assign(env, options.env || {});
  const run = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, path.join(scripts, 'runAllSims.mjs'), ...(options.args || [])], {
    cwd: root, env, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024, windowsHide: true,
  });
  const output = `${run.stdout || ''}${run.stderr || ''}`;
  const markers = fs.existsSync(markerPath) ? fs.readFileSync(markerPath, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
  fs.writeFileSync(path.join(root, 'output.log'), output);
  if (run.error || run.signal || ![0, 1].includes(run.status)
    || /(?:^|\n)(?:[A-Za-z]*Error:|Error \[)|ERR_MODULE_NOT_FOUND|Cannot find module|Unexpected synthetic fixture fetch/.test(output)
    || markers.some(marker => marker.type === 'unexpected-fetch')) throw new Error(`Unexpected fixture runtime/load result for ${id}: ${run.error || run.signal || output}`);
  const result = { id, exit: run.status, output, markers, children: markers.filter(item => item.type === 'child'), probes: markers.filter(item => item.type === 'probe').length, servers: markers.filter(item => item.type === 'server').length };
  results.push(result);
  return result;
}
const names = result => result.children.map(child => child.name).sort().join(',');
const controls = {
  guard: noSelection.map(id => `NO_SELECTION:${id}`),
  names: ['NAMES:unknown', 'NAMES:mixed', 'NAMES:wildcard'],
  environment: ['ENVIRONMENT'],
  childexit: ['CHILD_EXIT', 'UNREACHABLE', 'REACHABLE'],
  quiet: ['QUIET'],
  skip: ['UNREACHABLE', 'REACHABLE'],
  runtime: [],
};
try {
  if (CONTROL && !Object.hasOwn(controls, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
  if (CONTROL === 'guard') {
    const matches = [...runner.matchAll(/^if \(!ONLY\.length\) \{[\s\S]*?^\}/gm)];
    if (matches.length !== 1) throw new Error(`guard: expected one explicit-selection gate, found ${matches.length}`);
    replaceExact(matches[0][0], '');
  }
  if (CONTROL === 'names') replaceExact('  if (missing.length) {', '  if (false && missing.length) {');
  if (CONTROL === 'environment') replaceExact("const OWN_CONTROLS = ['ONLY', 'BROWSER'];", 'const OWN_CONTROLS = [];');
  if (CONTROL === 'childexit') replaceExact("let verdict = code === 0 ? 'PASS' : 'FAIL';", "let verdict = 'PASS';");
  if (CONTROL === 'quiet') replaceExact('const MIN_LINES = 4;', 'const MIN_LINES = 0;');
  if (CONTROL === 'skip') replaceExact("r.verdict === 'FAIL' && !db.ok && NOTHING_CHECKED.test(r.out)", "r.verdict === 'FAIL' && db.ok && NOTHING_CHECKED.test(r.out)");
  if (CONTROL === 'runtime') replaceExact("const ROOT = path.resolve(HERE, '..');", "const ROOT = path.resolve(HERE, '..');\nthrow new Error('Synthetic unexpected runner runtime');");
  const absent = {
    unset: {}, empty: { env: { ONLY: '' } }, spaces: { env: { ONLY: '   ' } }, commas: { env: { ONLY: ', ,  ,' } },
    browserflag: { args: ['--browser'] }, browserenv: { env: { BROWSER: '1' } },
    forcedreachable: { env: { DB_PROBE: 'reachable' } }, forcedunreachable: { env: { DB_PROBE: 'unreachable' } },
  };
  for (const id of BASELINE ? ['unset'] : noSelection) {
    const result = runFixture(id, absent[id]);
    check(`NO_SELECTION:${id}`, result.exit === 1 && result.markers.length === 0 && /ONLY/.test(result.output),
      `exit ${result.exit}; probes ${result.probes}; children ${names(result) || 'none'}; servers ${result.servers}`);
    if (CONTROL === 'guard' && (result.markers.length === 0 || !result.children.some(child => child.name === 'alpha') || !result.children.some(child => child.name === 'beta')))
      throw new Error('Guard control did not actually execute both forbidden marker fixtures');
    if (CONTROL === 'guard' && !id.startsWith('forced') && result.probes !== 1) throw new Error('Guard control did not reach its intercepted database probe');
    if (CONTROL === 'guard' && id.startsWith('browser') && (result.servers !== 1 || !result.children.some(child => child.name === 'browser'))) throw new Error('Guard control did not actually execute the marker server and browser fixture');
  }
  if (!BASELINE) {
    const selected = runFixture('selected', { env: { ONLY: 'simAlpha', BROWSER: '1' } });
    check('SELECTED', selected.exit === 0 && names(selected) === 'alpha' && selected.probes === 1 && selected.servers === 0 && /All 1 harnesses green/.test(selected.output), 'exactly the requested stem ran');
    check('ENVIRONMENT', selected.children.length === 1 && selected.children[0].only === null && selected.children[0].browser === null, 'ONLY and BROWSER removed from child environment');
    for (const [id, only] of [['aliases', 'simBeta.mjs'], ['trimmed', ' simBeta.mjs, simAlpha '], ['duplicates', 'simAlpha,simAlpha.mjs,simBeta,simBeta.mjs']]) {
      const result = runFixture(id, { env: { ONLY: only } });
      check(`SELECTED:${id}`, result.exit === 0 && names(result) === (id === 'aliases' ? 'beta' : 'alpha,beta') && result.probes === 1 && result.servers === 0,
        'named aliases, trimming and deduplication preserve exact child selection');
    }
    for (const [id, only] of [['unknown', 'simMissing'], ['mixed', 'simAlpha,simMissing'], ['wildcard', '*']]) {
      const result = runFixture(id, { env: { ONLY: only } });
      check(`NAMES:${id}`, result.exit === 1 && result.markers.length === 0 && /there is no such harness/.test(result.output),
        `exit ${result.exit}; marker count ${result.markers.length}`);
      if (CONTROL === 'names' && result.markers.length === 0) throw new Error('Name control did not actually reach probe or child execution');
    }
    const browserSkip = runFixture('browser-skip', { env: { ONLY: 'simBrowser' } });
    check('BROWSER_SKIP', browserSkip.exit === 0 && browserSkip.children.length === 0 && browserSkip.servers === 0 && /Skipping 1 browser harness/.test(browserSkip.output), 'selected browser work remains an explicit loud skip without opt-in');
    const browser = runFixture('browser-run', { env: { ONLY: 'simBrowser' }, args: ['--browser'] });
    check('BROWSER_RUN', browser.exit === 0 && names(browser) === 'browser' && browser.servers === 1 && browser.markers.some(marker => marker.type === 'poll'), 'explicit browser selection used only the marker server and child');
    const bad = runFixture('badexit', { env: { ONLY: 'simAlpha', RUNNER_FIXTURE_MODE: 'badexit' } });
    check('CHILD_EXIT', bad.exit === 1 && names(bad) === 'alpha' && /FAIL\s+simAlpha\.mjs/.test(bad.output), 'nonzero fixture child stays a failure');
    const quiet = runFixture('quiet', { env: { ONLY: 'simAlpha', RUNNER_FIXTURE_MODE: 'quiet' } });
    check('QUIET', quiet.exit === 1 && names(quiet) === 'alpha' && /EMPTY\s+simAlpha\.mjs/.test(quiet.output), 'quiet fixture output cannot count as success');
    const unreachable = runFixture('unreachable', { env: { ONLY: 'simAlpha', RUNNER_FIXTURE_MODE: 'nothing', DB_PROBE: 'unreachable' } });
    check('UNREACHABLE', unreachable.exit === 0 && names(unreachable) === 'alpha' && /SKIPPED, not run and not counted/.test(unreachable.output) && /All 0 harnesses green, 1 skipped above/.test(unreachable.output), 'an unreachable no-work fixture is reported as skipped, never as a pass');
    const reachable = runFixture('reachable', { env: { ONLY: 'simAlpha', RUNNER_FIXTURE_MODE: 'nothing', DB_PROBE: 'reachable' } });
    check('REACHABLE', reachable.exit === 1 && names(reachable) === 'alpha' && /FAIL\s+simAlpha\.mjs/.test(reachable.output), 'the same no-work fixture fails when the database is declared reachable');
  }
  if (CONTROL) {
    if (JSON.stringify([...failures].sort()) !== JSON.stringify([...controls[CONTROL]].sort())) throw new Error(`Wrong control failure map: expected ${controls[CONTROL].join(', ')}, got ${failures.join(', ') || 'none'}`);
    console.log(`PASS: ${failures.length} exact controlled behavioral failures; all other checks green`);
  } else {
    if (failures.length) throw new Error(`${failures.length} behavioral check(s) failed: ${failures.join(', ')}`);
    console.log(`PASS: ${results.length} actual-runner fixture cases; no production harness or network execution`);
  }
  success = true;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  const resolved = fs.realpathSync(temp);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('dukb-runner-selection-')) throw new Error('Refusing cleanup outside the unique runner-selection temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
  console.log('Temporary runner fixture files cleaned');
}
if (!success) process.exitCode = 1;
