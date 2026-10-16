/* Remote A/B/C size assistance only. No competition, UI or weight-unit ruling. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { execFileSync, spawnSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Remote offline proof only');
const ROOT = process.cwd(), SOURCE = '27de596241d8b32fc62cc99552a47cbb43a44410';
const OUT = path.resolve(process.env.UCL_SHARED_WEIGHT_OUT || 'ucl-shared-weight-artifacts');
const TOOL = path.resolve(process.env.PW_TOOL_ROOT || ''); assert(process.env.PW_TOOL_ROOT && fs.existsSync(path.join(TOOL, 'node_modules/playwright')));
const FIX = path.join(ROOT, 'scripts/fixtures/uclSharedWeight1383'), ENGINE = 'src/lib/clubManager.ts';
const sha = value => createHash('sha256').update(value).digest('hex');
const lf = value => value.replaceAll('\r\n', '\n');
const git = (args, cwd = ROOT) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
const source = file => lf(git(['show', SOURCE + ':' + file]));
await import(pathToFileURL(path.join(ROOT, 'scripts/lib/offlineTransport.cjs')).href);
git(['diff', '--exit-code', SOURCE, '--', 'src', 'public', 'package.json', 'package-lock.json', 'index.html']);
assert(!fs.existsSync(path.join(OUT, 'report.json')), 'Never overwrite a previous proof'); fs.mkdirSync(OUT, { recursive: true });
const report = { sourceRef: SOURCE, head: git(['rev-parse', 'HEAD']).trim(), scope: 'Tie golden and measured bytes only; no RAW/GZIP cap ruling or UI qualification',
  arms: [], children: [], originalMeters: [], secondary: [], completed: false };
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
function receipt(file) { const bytes = fs.readFileSync(file); return { file: path.relative(OUT, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }; }
function write(file, bytes) { const target = path.join(OUT, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes); return receipt(target); }
const fixtures = {
  'caller1347.mjs': 'a903edf160e91d71145e4e5826d74d58fd959e0cb7d5210a978fa54d1d8b7c8b',
  'weigh1347.mjs': '1d4cee1c5892461c41de9fa26abf3847b5b5773e87a161c19bca3b05dd8a4713',
  'weighRoutes1347.mjs': '9c2b3811e3181f225ba4c977c9fa21ffe1fee6fcd3ab05446f3ed3febc339ba1',
  'shared-body.patch': 'fc5cdf1af05662d797086abe7de72cdeb9c2475988aabb2b25385b4f16113ce1',
};
for (const [file, hash] of Object.entries(fixtures)) { const bytes = fs.readFileSync(path.join(FIX, file)); assert.equal(sha(bytes), hash); write('fixtures/' + file, bytes); }
function held(root, folders = ['src', 'public']) {
  const out = {};
  function walk(rel) { for (const entry of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const file = rel + '/' + entry.name; if (entry.isDirectory()) walk(file); else if (entry.isFile()) out[file] = sha(fs.readFileSync(path.join(root, file)));
  } }
  for (const folder of folders) walk(folder);
  for (const file of ['package.json', 'package-lock.json', 'index.html']) out[file] = sha(fs.readFileSync(path.join(root, file)));
  return out;
}
report.primaryBefore = held(ROOT); save();
function child(label, args, cwd, extra = {}, strict = true, timeout = 600000) {
  const dir = path.join(OUT, 'children', label); fs.mkdirSync(dir, { recursive: true });
  const env = { ...process.env, SIM_NETWORK: 'offline', NODE_OPTIONS: '--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs'), ...extra };
  const result = spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout,
    detached: process.platform !== 'win32' });
  const stdout = write('children/' + label + '/stdout.log', result.stdout || ''), stderr = write('children/' + label + '/stderr.log', result.stderr || '');
  const row = { label, args, cwd, exit: result.status, signal: result.signal, error: result.error?.message || null, stdout, stderr };
  report.children.push(row); save();
  if (result.error && result.pid && process.platform !== 'win32') {
    try { process.kill(-result.pid, 'SIGTERM'); row.timeoutGroupStopped = true; }
    catch (error) { row.timeoutGroupStop = error.code; }
  }
  assert(!result.error && !result.signal && Number.isInteger(result.status), 'Child completed: ' + label);
  if (strict) assert.equal(result.status, 0, 'Strict child succeeds: ' + label); return row;
}
const readers = ['simAdsense', 'simBrand', 'simHeadTags', 'simHiddenPages', 'simHubs', 'simIndexNow', 'simIndexing',
  'simInternalLinks', 'simNoRivalNames', 'simPrerender', 'simPrerenderBoot', 'simRetiredRoutes', 'simSchema', 'simSitemap', 'simSnapshotAssets'];
const temporaryRoot = path.join(ROOT, '.sim-control'); fs.mkdirSync(temporaryRoot, { recursive: true });
const temporary = fs.mkdtempSync(path.join(temporaryRoot, 'ucl-shared-weight-'));
const toolTemporary = fs.mkdtempSync(path.join(TOOL, 'ucl-shared-weight-'));
const worktrees = [], arms = new Map();
let pw, browser, sink;
async function waitServer(server, base) {
  for (let attempt = 0; attempt < 100; attempt++) {
    assert(server.exitCode === null, 'Owned server remains alive');
    try { const response = await fetch(base, { signal: AbortSignal.timeout(1000) }); if (response.status === 200) return; }
    catch (error) { if (attempt === 99) throw error; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Owned server failed to become ready');
}
function instrumentOriginalMeters() {
  for (const file of ['weigh1347.mjs', 'weighRoutes1347.mjs']) fs.copyFileSync(path.join(FIX, file), path.join(toolTemporary, file));
  const runner = `import pw from 'playwright';
const launch = pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch = async (...args) => {
  const browser = await launch(...args), create = browser.newContext.bind(browser);
  browser.newContext = async (...options) => {
    const context = await create(...options);
    await context.route('**/*', route => { const u = new URL(route.request().url());
      return ['http://localhost:4501','http://localhost:4502','http://127.0.0.1:4531','http://127.0.0.1:4532','http://127.0.0.1:4533'].includes(u.origin) ? route.continue() : route.abort(); });
    await context.routeWebSocket('**/*', socket => socket.close()); return context;
  }; return browser;
};
await import(process.env.UCL_ORIGINAL_METER);
`;
  fs.writeFileSync(path.join(toolTemporary, 'original-meter-runner.mjs'), runner);
  write('original-meter-transport-runner.mjs', runner);
}
async function strictRoute(arm, base, route) {
  const row = { arm: arm.name, route, requests: [], responses: [], blocked: [], pageErrors: [], assetErrors: [], drawn: false };
  const jobs = [], known = new WeakMap(); let context;
  const rowFile = `secondary/${arm.name}/${route.slice(1)}.json`;
  try {
    context = await browser.newContext({ ...pw.devices['iPhone 13'] });
    await context.route('**/*', request => {
      const url = new URL(request.request().url());
      if (url.origin === base) return request.continue();
      row.blocked.push({ url: url.origin, type: request.request().resourceType() }); return request.abort();
    });
    await context.routeWebSocket('**/*', socket => { row.blocked.push({ websocket: socket.url() }); socket.close(); });
    const page = await context.newPage(); page.on('pageerror', error => row.pageErrors.push(error.message));
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.origin !== base || !/^\/assets\/.+\.js$/.test(url.pathname)) return;
      const record = { id: row.requests.length, url: request.url(), file: decodeURIComponent(url.pathname.slice(1)), method: request.method() };
      row.requests.push(record); known.set(request, record);
    });
    page.on('requestfailed', request => { const record = known.get(request); if (record) record.failure = request.failure()?.errorText || 'request failed'; });
    page.on('response', response => {
      const record = known.get(response.request()); if (!record) return;
      jobs.push((async () => {
        record.status = response.status(); assert.equal(record.status, 200, 'Every requested JS responds200');
        const file = path.resolve(arm.path, 'dist', record.file), dist = path.resolve(arm.path, 'dist');
        assert(file.startsWith(dist + path.sep) && fs.statSync(file).isFile());
        const bytes = fs.readFileSync(file); assert(bytes.length > 0, 'Every requested JS exists and is nonzero');
        let timer;
        const body = await Promise.race([response.body(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('JS body timeout')), 15000); })]).finally(() => clearTimeout(timer));
        assert.deepEqual(body, bytes, 'Actual JS response equals this arm local asset');
        record.raw = write(`secondary/${arm.name}/${record.file}`, bytes);
        record.gzip = write(`secondary/${arm.name}/${record.file}.gz`, gzipSync(bytes));
        record.responseBytes = body.length; record.responseSha256 = sha(body); row.responses.push({ requestId: record.id, status: record.status, bodySha256: sha(body) });
      })().catch(error => { row.assetErrors.push({ requestId: record.id, error: error.stack || String(error) }); }));
    });
    await page.goto(base + route, { waitUntil: 'load', timeout: 45000 }); await page.waitForTimeout(1500);
    row.loadPlus1500 = row.requests.map(request => request.id);
    try { await page.waitForFunction(() => (document.getElementById('root')?.innerText ?? '').length > 200, null, { timeout: 45000 }); row.drawn = true; }
    catch (error) { row.drawError = error.message; }
    if (row.drawn) { await page.waitForTimeout(2500); row.drawnPlus2500 = row.requests.map(request => request.id); }
    row.loadedSink = await page.evaluate(() => ({ own: Object.hasOwn(globalThis, '__world1347'),
      types: Array.isArray(globalThis.__world1347) ? globalThis.__world1347.map(value => typeof value) : null }));
    row.sinkValid = arm.name === 'A' ? !row.loadedSink.own
      : row.loadedSink.own && row.loadedSink.types?.length === 5 && row.loadedSink.types.every(type => type === 'function');
    row.rootTextLength = await page.evaluate(() => document.getElementById('root')?.innerText.length ?? 0);
    await Promise.all(jobs);
  } catch (error) { row.error = error.stack || String(error); }
  finally {
    if (context) { try { await context.close(); } catch (error) { row.closeError = error.message; } }
    await Promise.all(jobs);
  }
  const valid = row.drawn && row.sinkValid && !row.error && !row.closeError && row.pageErrors.length === 0 && row.assetErrors.length === 0 && row.requests.length > 0
    && row.requests.every(request => request.status === 200 && request.raw && request.gzip && !request.failure);
  row.measurementValid = valid;
  if (valid) {
    const sum = ids => { const files = [...new Set(ids.map(id => row.requests[id].file))];
      return { files, rawBytes: files.reduce((n, file) => n + row.requests.find(request => request.file === file).raw.bytes, 0),
        gzipBytes: files.reduce((n, file) => n + row.requests.find(request => request.file === file).gzip.bytes, 0) }; };
    row.weights = { loadPlus1500: sum(row.loadPlus1500), drawnPlus2500: sum(row.drawnPlus2500) };
  }
  row.raw = write(rowFile, JSON.stringify(row, null, 2)); report.secondary.push(row); save();
}
try {
  for (const name of ['A', 'B', 'C']) {
    const armPath = path.join(temporary, name); git(['worktree', 'add', '--detach', armPath, SOURCE]); worktrees.push(armPath);
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(armPath, 'node_modules'), 'dir');
    const arm = { name, path: armPath, base: SOURCE }; arms.set(name, arm); report.arms.push(arm);
    const original = lf(fs.readFileSync(path.join(armPath, ENGINE), 'utf8')); assert.equal(sha(original), '7a89018d61b149a7cccb24b9392a92b5fbce610b942611c592722cde5e4b11b7');
    if (name === 'C') {
      git(['apply', '--check', path.join(FIX, 'shared-body.patch')], armPath); git(['apply', path.join(FIX, 'shared-body.patch')], armPath);
      assert.equal(sha(lf(fs.readFileSync(path.join(armPath, ENGINE), 'utf8'))), '629bfd8afb7e40543624c0777757d278c226133212eb89b3e6502c5c3f20be8d');
      git(['add', '--', ENGINE], armPath);
      git(['-c', 'user.name=UCL shared proof', '-c', 'user.email=ucl-shared-proof@example.invalid', 'commit', '--no-verify', '-m', 'Test-only shared UCL body candidate'], armPath);
      arm.candidateRef = git(['rev-parse', 'HEAD'], armPath).trim(); arm.candidateTree = git(['rev-parse', 'HEAD^{tree}'], armPath).trim();
      write('C/candidate-commit.txt', git(['show', '--format=fuller', '--stat', 'HEAD'], armPath));
      git(['archive', '--format=zip', '--output=' + path.join(OUT, 'C/candidate-source.zip'), 'HEAD'], armPath);
      arm.candidateArchive = receipt(path.join(OUT, 'C/candidate-source.zip'));
    }
    if (name !== 'A') {
      const before = fs.readFileSync(path.join(armPath, ENGINE), 'utf8');
      child('caller-' + name, [path.join(FIX, 'caller1347.mjs')], armPath);
      const actual = fs.readFileSync(path.join(armPath, ENGINE), 'utf8').slice(before.length);
      assert.equal(actual.length, 291, 'Exact original weigh2 caller length');
      assert(actual.includes('[__wc1, __wc2, __wc3, __wc4, __wc5]'));
      if (sink) assert.equal(actual, sink, 'Same five-export sink in B/C'); else sink = actual;
      arm.sink = write(name + '/caller-sink.txt', actual);
    }
    arm.engine = write(name + '/clubManager.actual.ts', fs.readFileSync(path.join(armPath, ENGINE)));
    arm.patch = write(name + '/actual.patch', git(['diff', '--binary', SOURCE, '--', ENGINE], armPath)); arm.sourceBefore = held(armPath); save();
    child('types-' + name, [path.join(ROOT, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', 'tsconfig.app.json'], armPath);
    child('vite-' + name, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'build'], armPath);
    arm.readers = []; for (const reader of readers) arm.readers.push(child(name + '-' + reader, [path.join(armPath, 'scripts', reader + '.mjs')], armPath, {}, false));
    fs.cpSync(path.join(armPath, 'dist'), path.join(OUT, name, 'dist'), { recursive: true });
    arm.distBefore = held(armPath, ['dist']);
    assert.deepEqual(held(armPath), arm.sourceBefore, 'Arm source held through build/readers'); save();
  }
  const C = arms.get('C');
  child('golden-C', [path.join(C.path, 'scripts/recordWorldTieGolden1347.mjs'), '--ref', C.candidateRef, '--check'], C.path);
  instrumentOriginalMeters();
  for (const name of ['B', 'C']) {
    const A = path.join(arms.get('A').path, 'dist'), other = path.join(arms.get(name).path, 'dist');
    const meterOut = path.join(OUT, 'original-meters', 'A-' + name); fs.mkdirSync(meterOut, { recursive: true });
    const chunks = child('original-chunks-A-' + name, [path.join(toolTemporary, 'weigh1347.mjs'), A, other], ROOT, { RC_OUT: meterOut });
    const routes = child('original-routes-A-' + name, [path.join(toolTemporary, 'original-meter-runner.mjs'), A, other], ROOT,
      { RC_OUT: meterOut, UCL_ORIGINAL_METER: pathToFileURL(path.join(toolTemporary, 'weighRoutes1347.mjs')).href }, true, 900000);
    report.originalMeters.push({ pair: 'A-' + name, chunks, routes, limitation: 'Original route helper retains its silent body/root catches; strict secondary decides measurement validity' }); save();
  }
  pw = (await import(pathToFileURL(path.join(TOOL, 'node_modules/playwright/index.mjs')).href)).default;
  assert(pw.devices['iPhone 13']); browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  for (const [index, arm] of [...arms.values()].entries()) {
    const port = 4531 + index, base = 'http://127.0.0.1:' + port;
    const log = fs.openSync(path.join(OUT, arm.name, 'server.log'), 'w');
    const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), path.join(arm.path, 'dist'), String(port)], { cwd: ROOT, stdio: ['ignore', log, log] });
    try {
      await waitServer(server, base);
      for (const route of ['/club-manager', '/manager-hot-seat', '/deadline-day']) await strictRoute(arm, base, route);
      arm.budget = child(arm.name + '-sweepWeight', [path.join(toolTemporary, 'original-meter-runner.mjs')], arm.path,
        { BASE: base, SWEEP_OFFLINE: '1', UCL_ORIGINAL_METER: pathToFileURL(path.join(arm.path, 'scripts/sweepWeight.mjs')).href }, false, 900000);
    }
    finally { server.kill('SIGTERM'); fs.closeSync(log); }
  }
  await browser.close(); browser = null;
  assert.equal(report.secondary.length, 9); assert(report.secondary.every(row => row.measurementValid), 'All strict asset/root measurements must qualify before size totals');
  report.secondaryComparisons = ['B', 'C'].flatMap(name => ['/club-manager', '/manager-hot-seat', '/deadline-day'].map(route => {
    const a = report.secondary.find(row => row.arm === 'A' && row.route === route), b = report.secondary.find(row => row.arm === name && row.route === route);
    return { pair: 'A-' + name, route, rawGrowth: b.weights.drawnPlus2500.rawBytes - a.weights.drawnPlus2500.rawBytes,
      gzipGrowth: b.weights.drawnPlus2500.gzipBytes - a.weights.drawnPlus2500.gzipBytes };
  }));
  report.completed = true; save();
  console.log('UCL shared A/B/C: actual types, builds, candidate-ref tie golden and strict route bytes closed. Reader/budget exits remain recorded individually. No size-unit ruling or full E2/UI qualification.');
} catch (error) { report.error = error?.stack || String(error); save(); throw error; }
finally {
  try {
    if (browser) await browser.close();
    for (const arm of arms.values()) {
      arm.sourceAfter = held(arm.path); if (arm.sourceBefore) assert.deepEqual(arm.sourceAfter, arm.sourceBefore, 'Final actual arm source held');
      if (arm.distBefore) { arm.distAfter = held(arm.path, ['dist']); assert.deepEqual(arm.distAfter, arm.distBefore, 'Final actual arm dist held'); }
    }
    report.primaryAfter = held(ROOT); assert.deepEqual(report.primaryAfter, report.primaryBefore);
    assert.equal(git(['rev-parse', 'HEAD']).trim(), report.head, 'Primary head held');
    git(['diff', '--exit-code', SOURCE, '--', 'src', 'public', 'package.json', 'package-lock.json', 'index.html']); report.finalHoldsPassed = true;
  } catch (error) { report.completed = false; report.holdError = error.stack || String(error); throw error; }
  finally {
    for (const tree of [...worktrees].reverse()) git(['worktree', 'remove', '--force', tree]);
    assert(temporary.startsWith(temporaryRoot + path.sep) && toolTemporary.startsWith(TOOL + path.sep));
    fs.rmSync(temporary, { recursive: true, force: true }); fs.rmSync(toolTemporary, { recursive: true, force: true }); save();
  }
}
