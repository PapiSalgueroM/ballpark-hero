/* Actual hub component outcomes. Copied-source controls must reject exact cases. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const component = path.join(root, 'src/components/hub/HubExperience.tsx');
const bytes = await readFile(component), source = bytes.toString('utf8').replaceAll('\r\n', '\n');
const controls = {
  catalog: ['to={game.path}', 'to="/fixture-missing-game"', [0]],
  daily: ["filter === 'daily' ? game.daily : game.featured", "filter === 'daily' ? !game.daily : game.featured", [1]],
  sim: ["filter === 'daily' ? game.daily : game.featured", "filter === 'daily' ? game.daily : !game.featured", [2]],
  search: ['const needle = query.trim().toLocaleLowerCase();', "const needle = '';", [3, 4, 5]],
  reset: ["setQuery(''); setFilter('all');", "setQuery(''); setFilter('daily');", [4]],
  random: ['visible[Math.floor(Math.random() * visible.length)]', 'games[0]', [5]],
  saves: ['const saved = games.filter(game => continuations[game.path]);', 'const saved = savedGames(window.localStorage).map(({ game }) => game);', [6]],
};
const mode = process.env.HUB_EXPERIENCE_CONTROL || '';
assert.ok(!mode || mode === 'all' || Object.hasOwn(controls, mode), 'Known hub control');
const parent = path.join(root, '.sim-control'); await mkdir(parent, { recursive: true });
const folder = await mkdtemp(path.join(parent, 'hubs994-'));
const output = path.join(root, 'sport-hubs-artifacts/behavior'); await mkdir(output, { recursive: true });
const outcomes = [];
try {
  for (const current of mode === 'all' ? ['', ...Object.keys(controls)] : [mode]) {
    let actual = source;
    if (current) {
      const [anchor, replacement] = controls[current];
      assert.ok(source.includes(anchor), `Executable source contains the ${current} control anchor`);
      actual = source.replace(anchor, replacement);
      assert.notEqual(actual, source, 'The source control changed actual code');
    }
    const built = await build({
      stdin: { contents: "export { run } from './scripts/qa/hubs994.outcomes';", resolveDir: root, loader: 'ts' },
      outfile: path.join(folder, 'product.mjs'), bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', logLevel: 'silent', metafile: true,
      alias: { '@': path.join(root, 'src') },
      plugins: [{ name: 'copied-hub-source', setup(builder) {
        builder.onLoad({ filter: /[\\/]components[\\/]hub[\\/]HubExperience\.tsx$/ }, args => ({ contents: actual, loader: 'tsx', resolveDir: path.dirname(args.path) }));
        builder.onResolve({ filter: /\.css$/ }, args => ({ path: args.path, namespace: 'css' }));
        builder.onLoad({ filter: /.*/, namespace: 'css' }, () => ({ contents: 'export default new Proxy({}, { get: (_, key) => String(key) });', loader: 'js' }));
      } }],
    });
    assert.ok(!Object.keys(built.metafile.inputs).some(file => /integrations\/supabase|fetchPlayers/.test(file)), 'No database transport enters the component fixture');
    const name = current || 'normal', reportPath = path.join(output, `${name}.json`);
    await writeFile(path.join(folder, 'runner.mjs'), `import fs from 'node:fs';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost', pretendToBeVisual: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
for (const key of ['window','document','HTMLElement','HTMLButtonElement','HTMLInputElement','Element','Node','localStorage','Event','MouseEvent','MutationObserver']) globalThis[key] = dom.window[key];
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
try { const { run } = await import('./product.mjs'); const report = await run(); fs.writeFileSync(process.env.HUB_REPORT, JSON.stringify(report, null, 2)); process.exitCode = report.failed ? 1 : 0; } finally { dom.window.close(); }
`);
    const child = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(folder, 'runner.mjs')], {
      cwd: root, env: { ...process.env, NODE_ENV: 'test', HUB_REPORT: reportPath }, encoding: 'utf8', timeout: 120000, maxBuffer: 2 * 1024 * 1024, windowsHide: true,
    });
    const log = `${child.stdout || ''}\n${child.stderr || ''}`;
    await writeFile(path.join(output, `${name}.log`), log);
    assert.ok(!child.error && !child.signal, 'Bounded actual component process finishes');
    assert.doesNotMatch(log, /SIM_OFFLINE_BLOCK|Unhandled (?:Error|Rejection)|SyntaxError|TypeError|ReferenceError|Cannot find module|not wrapped in act/);
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    const targets = controls[current]?.[2] ?? [], rejected = report.rows.flatMap((row, i) => row.status === 'FAIL' ? [i] : []);
    assert.equal(report.total, 7); assert.equal(report.rows.length, 7);
    assert.ok(report.rows.every(row => ['PASS', 'FAIL'].includes(row.status)), 'All seven outcomes execute without skips');
    assert.deepEqual(rejected, targets, `Exact ${name} meaningful control failures`);
    assert.equal(child.status, targets.length ? 1 : 0);
    for (const row of report.rows.filter(row => row.status === 'FAIL')) assert.equal(row.error.name, 'AssertionError', 'Only assertion failures count as a control');
    assert.deepEqual(await readFile(component), bytes, 'Actual product bytes remain unchanged');
    for (const row of report.rows) console.log(`${name} ${row.status}: ${row.title}`);
    outcomes.push({ mode: name, total: report.total, passed: report.passed, rejected, expected: targets });
  }
  await writeFile(path.join(output, 'verified-summary.json'), JSON.stringify({ outcomes, sourceSha256: createHash('sha256').update(bytes).digest('hex'), limits: 'Actual component and engine-created discovery fixtures. DOM-dispatched controls, not native input or full career playback. Native built-site verification is separate.' }, null, 2));
  console.log(`Hub experience: ${outcomes.length} modes completed, all exact outcome targets verified.`);
} finally {
  assert.equal(path.dirname(folder), parent); assert.ok(path.basename(folder).startsWith('hubs994-'));
  await rm(folder, { recursive: true, force: true });
  assert.deepEqual(await readFile(component), bytes, 'Product source held after owned cleanup');
}
