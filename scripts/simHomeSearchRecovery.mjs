/* Actual Home recovery with a retained import boundary and unchanged search engine. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/* Release AM: this harness refused to start outside remote CI, so every local
   run of the suite was red by construction. Nothing here reaches the network
   (it mounts the home page in jsdom from local source), so it runs wherever the
   suite runs. The Vitest child was always handed CI=1 and still is. */
process.env.CI ||= '1';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.env.HOME_SEARCH_RECOVERY_ARTIFACTS || path.join(root, 'home-search-recovery-artifacts/outcomes'));
const PAGE = 'src/pages/Index.tsx', NOTICE = 'src/components/home/HomeSearchUnavailable.tsx';
const TEST = 'src/test/homeSearchRecovery.test.tsx', COUNT = 10;
const BASELINE = 'unchanged search engine retains complete catalog and exact ranked results';
const PENDING = 'pending import keeps honest busy state without false empty results or writes';
const SUCCESS = 'resolved import renders the latest query in unchanged engine rank order';
const FAILURE = 'rejected import clears busy and offers recovery without pretending no games exist';
const BACK = 'Back clears the query and restores browse and input focus without scrolling';
const TERMINAL = 'failed search remains terminal through Back reentry focus and hover';
const RELOAD = 'only explicit Reload invokes the existing reload boundary once';
const CLEAR = 'clearing a pending query keeps browse after late resolution and reuses the engine';
const EMPTY = 'a real zero-result query shows existing fallback games only after resolution';
const PREFETCH = 'a failed focus prewarm keeps browsing until a query asks for recovery';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const unix = value => value.replaceAll('\\', '/');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n');
const save = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2)); };
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const sources = ['src', 'scripts'].flatMap(dir => files(path.join(root, dir))).concat(['package.json', 'package-lock.json', 'vitest.config.ts', 'vite.config.ts', 'tsconfig.app.json', 'tsconfig.json', 'index.html'].map(file => path.join(root, file)));
const holds = () => {
  const result = {};
  for (const file of sources.sort()) { const bytes = fs.readFileSync(file); result[unix(path.relative(root, file))] = hash(bytes); }
  return result;
};
const before = holds(); save(path.join(out, 'source-before.json'), before);
const boundary = {
  from: "const loadSearchEngine = () => (enginePromise ??= import('@/lib/siteSearch'));",
  to: 'const loadSearchEngine = () => ((globalThis as any).__HOME_SEARCH_LOAD__(), enginePromise ??= (globalThis as any).__HOME_SEARCH_IMPORT__());',
  purpose: 'Only the asynchronous import boundary is controlled. It resolves to the actual unchanged siteSearch module; load calls and import calls are separately recorded. No product test hook.',
};
const controls = [
  ['busy', PAGE, '<div aria-busy="true" className="min-h-[120px]" />', '<div aria-busy="false" className="min-h-[120px]" />', PENDING],
  ['prematureEmpty', PAGE, ') : !engine ? (', ') : false ? (', PENDING],
  ['failureState', PAGE, 'setSearchFailed(true);', 'setSearchFailed(false);', FAILURE],
  ['failureBranch', PAGE, 'searchFailed ? (', 'false ? (', FAILURE],
  ['terminal', PAGE, 'if (engine || searchFailed) return;', 'if (engine) return;', TERMINAL],
  ['resolvedEngine', PAGE, '.then(setEngine)', '.then(() => undefined)', SUCCESS],
  ['currentQuery', PAGE, 'engine.searchSite(searchQuery)', "engine.searchSite('soccer')", SUCCESS],
  ['backQuery', PAGE, "setSearchQuery(''); searchInputRef.current", "setSearchQuery(searchQuery); searchInputRef.current", BACK],
  ['backFocus', PAGE, 'searchInputRef.current?.focus({ preventScroll: true });', 'void searchInputRef.current;', BACK],
  ['preventScroll', PAGE, 'searchInputRef.current?.focus({ preventScroll: true });', 'searchInputRef.current?.focus({ preventScroll: false });', BACK],
  ['backAction', NOTICE, 'onClick={onBack}', 'onClick={() => undefined}', BACK],
  ['reloadAction', NOTICE, 'onClick={() => reloadToRetryChunk()}', 'onClick={() => undefined}', RELOAD],
  ['automaticReload', NOTICE, '  return (', '  reloadToRetryChunk();\n  return (', FAILURE],
  ['noticeWrite', NOTICE, '  return (', "  localStorage.setItem('home-search-control', 'changed');\n  return (", FAILURE],
  ['noticeDraw', NOTICE, '  return (', '  Math.random();\n  return (', FAILURE],
  ['failureRole', NOTICE, '<section role="alert"', '<section role="status"', FAILURE],
  ['clearQuery', PAGE, "onClick={() => setSearchQuery('')}", 'onClick={() => undefined}', CLEAR],
  ['fallback', PAGE, "const POPULAR_FALLBACK_PATHS = ['/soccer-grid', '/footle', '/squad-deal'];", "const POPULAR_FALLBACK_PATHS = ['/soccer-grid', '/footle'];", EMPTY],
  ['prewarmTerminal', PAGE, 'setSearchFailed(true);', 'if (isSearching) setSearchFailed(true);', PREFETCH],
];
const requested = process.env.HOME_SEARCH_RECOVERY_CONTROL || 'all';
assert(requested === 'all' || requested === 'none' || controls.some(([name]) => name === requested), 'Known Home search control');
const chosen = requested === 'all' ? controls : requested === 'none' ? [] : controls.filter(([name]) => name === requested);
const observed = [PAGE, NOTICE, TEST, 'src/lib/siteSearch.ts', 'src/data/gameRegistry.ts', 'src/data/searchKeywords.json', 'src/lib/nameFold.ts', 'src/lib/freshBuild.ts'];
for (const file of observed) { const destination = path.join(out, 'originals', file); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.copyFileSync(path.join(root, file), destination); }
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const summary = { status: 'running', count: COUNT, boundary, normal: null, controls: [], sourceBefore: before, sourceAfter: null };

function run(name, fault = null) {
  const dir = path.join(out, name); fs.mkdirSync(dir, { recursive: true });
  let page = read(PAGE), notice = read(NOTICE), mutation = null;
  if (fault) {
    const [, file, from, to, target] = fault, source = read(file);
    assert.equal(source.split(from).length - 1, 1, `${name}: executable fault binds exactly once`);
    const changed = source.replace(from, to); assert.notEqual(changed, source);
    if (file === PAGE) page = changed; else notice = changed;
    mutation = { file, from, to, target, originalSha256: before[file], normalizedSha256: hash(source), changedBeforeBoundarySha256: hash(changed) };
  }
  assert.equal(page.split(boundary.from).length - 1, 1, `${name}: import boundary is unique`);
  const beforeBoundary = page; page = page.replace(boundary.from, boundary.to);
  assert.equal(page.replace(boundary.to, boundary.from), beforeBoundary, `${name}: exact boundary reverse`);
  const pageCopy = unix(path.join(dir, 'Index.tsx')), noticeCopy = unix(path.join(dir, 'HomeSearchUnavailable.tsx'));
  save(pageCopy, page); save(noticeCopy, notice);
  const copies = { page: { path: pageCopy, sha256: hash(page) }, notice: { path: noticeCopy, sha256: hash(notice) } };
  save(path.join(dir, 'copy-contract.json'), { boundary, mutation, copies });
  const aliases = { '@/pages/Index': pageCopy, '@/components/home/HomeSearchUnavailable': noticeCopy };
  const wanted = [...observed.map(file => unix(path.join(root, file))), pageCopy, noticeCopy];
  const configPath = path.join(dir, 'vitest.config.mjs'), reportPath = path.join(dir, 'vitest-report.json');
  save(configPath, `import { defineConfig } from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('vitest/config'))))};
import react from ${JSON.stringify(unix(fileURLToPath(import.meta.resolve('@vitejs/plugin-react-swc'))))};
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const dir=${JSON.stringify(unix(dir))}, wanted=${JSON.stringify(wanted)}, seen=new Map();
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
export default defineConfig({root:${JSON.stringify(unix(root))}, plugins:[react(),{
name:'retain-home-search-transforms',enforce:'post',transform(code,id){
const file=id.split('?')[0].replaceAll('\\\\','/'); if(!wanted.includes(file))return null;
const bytes=fs.readFileSync(file),output='transforms/'+hash(file).slice(0,16)+'.js';
fs.mkdirSync(path.join(dir,'transforms'),{recursive:true});fs.writeFileSync(path.join(dir,output),code);
seen.set(file,{file,inputSha256:hash(bytes),output,transformedSha256:hash(code)});
fs.writeFileSync(path.join(dir,'transforms.json'),JSON.stringify([...seen.values()],null,2));return null;
}}],resolve:{alias:{...${JSON.stringify(aliases)},'@':${JSON.stringify(unix(path.join(root, 'src')))}}},
test:{environment:'jsdom',globals:true,setupFiles:[${JSON.stringify(unix(path.join(root, 'src/test/setup.ts')))}],include:[${JSON.stringify(TEST)}],maxWorkers:1,fileParallelism:false}});`);
  const args = ['node_modules/vitest/vitest.mjs', 'run', '--config', configPath, '--reporter=json', `--outputFile.json=${reportPath}`, '--reporter=default'];
  if (fault) args.push('-t', `^(${escape(BASELINE)}|${escape(fault[4])})$`);
  const child = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1', HOME_SEARCH_RECOVERY_BOUNDARY: '1' } });
  save(path.join(dir, 'stdout.log'), child.stdout || ''); save(path.join(dir, 'stderr.log'), child.stderr || '');
  save(path.join(dir, 'process.json'), { args, aliases, status: child.status, signal: child.signal, error: child.error?.message ?? null });
  assert(!child.error && child.signal === null, `${name}: process must finish normally`);
  const output = `${child.stdout || ''}\n${child.stderr || ''}`;
  assert(!/Unhandled Errors|Unhandled Rejection|Cannot find module|Failed to resolve import|SyntaxError|Transform failed|Startup Error|Dynamic require|Test timed out/.test(output), `${name}: setup/runtime failure`);
  assert(fs.existsSync(reportPath), `${name}: missing raw test report`);
  const raw = JSON.parse(fs.readFileSync(reportPath)), tests = raw.testResults.flatMap(file => file.assertionResults);
  assert.equal(raw.numUnhandledErrors ?? 0, 0); assert.equal(raw.numRuntimeErrorTestSuites ?? 0, 0); assert.equal(raw.unhandledErrors?.length ?? 0, 0);
  assert(raw.testResults.every(file => !file.testExecError), `${name}: no suite execution error`); assert.equal(tests.length, COUNT);
  const marker = 'HOME_SEARCH_RECOVERY_RECORD|', records = (child.stdout || '').split(/\r?\n/).filter(line => line.includes(marker)).map(line => JSON.parse(line.slice(line.indexOf(marker) + marker.length)));
  save(path.join(dir, 'records.json'), records);
  const baseline = records.find(row => row.id === BASELINE); assert(baseline, `${name}: complete baseline retained`);
  assert.deepEqual(baseline.actual, baseline.expected); assert.equal(tests.find(test => test.title === BASELINE)?.status, 'passed');
  const transforms = JSON.parse(fs.readFileSync(path.join(dir, 'transforms.json')));
  for (const row of transforms) { assert.equal(hash(fs.readFileSync(row.file)), row.inputSha256); assert.equal(hash(fs.readFileSync(path.join(dir, row.output))), row.transformedSha256); }
  for (const copy of Object.values(copies)) assert(transforms.some(row => row.file === copy.path && row.inputSha256 === copy.sha256), `${name}: actual copied module executes`);
  for (const file of [PAGE, NOTICE]) assert(!transforms.some(row => row.file === unix(path.join(root, file))), `${name}: original replaced module never executes`);
  for (const file of ['src/lib/siteSearch.ts', 'src/data/gameRegistry.ts']) assert(transforms.some(row => row.file === unix(path.join(root, file)) && row.inputSha256 === before[file]), `${name}: actual unchanged engine/catalog executes`);
  let failure = null;
  if (fault) {
    assert.equal(child.status, 1); assert.equal(tests.filter(test => test.status === 'failed').length, 1); assert.equal(tests.filter(test => test.status === 'passed').length, 1);
    assert.equal(tests.filter(test => test.status === 'skipped').length, COUNT - 2);
    failure = tests.find(test => test.title === fault[4] && test.fullName === fault[4]); assert.equal(failure?.status, 'failed');
    assert(/AssertionError/.test(failure.failureMessages.join('\n')), `${name}: exact mapped assertion failure`);
    assert(records.some(row => { try { assert.deepEqual(row.actual, row.expected); return false; } catch { return true; } }), `${name}: actual mismatched observation retained`);
  } else {
    assert.equal(child.status, 0); assert(tests.every(test => test.status === 'passed'));
    for (const row of records) assert.deepEqual(row.actual, row.expected, `${name}: retained complete observation`);
  }
  const hashes = {}; for (const file of files(dir)) { const bytes = fs.readFileSync(file); hashes[unix(path.relative(dir, file))] = hash(bytes); }
  return { name, status: fault ? 'mapped-assertion-failed' : 'passed', passed: tests.filter(test => test.status === 'passed').length,
    failed: tests.filter(test => test.status === 'failed').length, records: records.length, copies, mutation, baseline, failure, hashes };
}
try {
  summary.normal = run('normal');
  for (const fault of chosen) { const result = run(fault[0], fault); assert.deepEqual(result.baseline, summary.normal.baseline, `${fault[0]}: complete independent baseline held`); summary.controls.push(result); }
  summary.status = 'passed';
} catch (error) { summary.status = 'failed'; summary.error = String(error?.stack || error); throw error; }
finally {
  summary.sourceAfter = holds(); let failed;
  try { assert.deepEqual(summary.sourceAfter, before, 'Source, engine, catalog, fixtures and dependencies held'); }
  catch (error) { summary.status = 'failed'; summary.sourceHoldError = String(error?.stack || error); failed = error; }
  save(path.join(out, 'source-after.json'), summary.sourceAfter); save(path.join(out, 'summary.json'), summary); if (failed) throw failed;
}
console.log(`Home search recovery: ${summary.normal.passed}/${COUNT} actual page/engine cases passed.`);
console.log(`Controlled import boundary: pending, unchanged engine resolution, rejection and terminal failure retained.`);
console.log(`Copied controls: ${summary.controls.length}/${chosen.length}, one mapped assertion and unchanged catalog/ranking baseline each.`);
console.log(`Source holds: ${Object.keys(before).length}; raw observations, transformed code and exact copies retained.`);
console.log(`Home search recovery: passed. Evidence at ${out}`);
