/* Round1439: compiled actual Board local state with fictional external boundaries. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { BOARD_FILE, TITLES, NATIONAL_INSTRUCTION, hash, readPlan, sourceForArm } from './transferPathReportContext1439.mjs';
import { validateNativeLog, assertNativeLogRefusals } from './reportSubmitPendingNamesNative1433.mjs';

const args = process.argv.slice(2), options = {};
assert.equal(args.length, 6, 'Exactly --root --mode --out');
for (let i = 0; i < args.length; i += 2) {
  assert(['--root', '--mode', '--out'].includes(args[i]) && !Object.hasOwn(options, args[i]));
  assert(args[i + 1] && !args[i + 1].startsWith('--')); options[args[i]] = args[i + 1];
}
const root = path.resolve(options['--root']), mode = options['--mode'], out = path.resolve(options['--out']);
assert(path.isAbsolute(options['--root']) && path.isAbsolute(options['--out']));
assert(['baseline', 'fixed'].includes(mode) && path.relative(root, out).split(path.sep).includes('..'));
assert.equal(fs.realpathSync(new URL(import.meta.url)), fs.realpathSync(path.join(root, 'scripts/qa/playTransferPathReportContext.mjs')));
if (process.env.TRANSFER_PATH_CONTEXT_MODE) assert.equal(process.env.TRANSFER_PATH_CONTEXT_MODE, mode);
if (process.env.TRANSFER_PATH_CONTEXT_OUT) assert.equal(path.resolve(process.env.TRANSFER_PATH_CONTEXT_OUT), out);
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline');
assert.equal(process.env.DEBUG, 'pw:browser'); assert.equal(process.env.DEBUG_COLORS, '0');
const require = createRequire(path.join(root, 'package.json'));
assert(require.cache[require.resolve('./scripts/lib/offlineTransport.cjs')], 'Ordinary offline preload required');
assert(process.env.SIM_OFFLINE_RECEIPT && fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size === 0);
assert(!fs.existsSync(out), 'Fresh browser evidence root'); fs.mkdirSync(out, { recursive: true });
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const pin = file => { const body = fs.readFileSync(file); return { file, bytes: body.length, sha256: hash(body) }; };
const canonical = text => text.replace(/\r\n/g, '\n'), boardBody = fs.readFileSync(path.join(root, BOARD_FILE));
const fixtureRoot = path.join(root, 'scripts/qa/transfer-path-report-context-fixture');
const fixtureNames = ['entry.tsx', 'boundaries.tsx', 'fixture.css'];
const fixtureBefore = fixtureNames.map(name => ({ ...pin(path.join(fixtureRoot, name)), name }));
const producerFiles = ['scripts/qa/playTransferPathReportContext.mjs', 'scripts/qa/transferPathReportContext1439.mjs', 'scripts/qa/reportSubmitPendingNamesNative1433.mjs', 'scripts/lib/playwrightLoader.mjs'];
const producerBefore = producerFiles.map(file => pin(path.join(root, file)));
const plan = readPlan(root, mode), arms = mode === 'baseline' ? ['normal'] : ['normal', 'whole-original', 'reset-omission', 'copy-omission', 'restored'];
const faultTitles = arm => new Set(mode === 'baseline' || arm === 'whole-original' ? [...TITLES.slice(0, 9), ...TITLES.slice(12)] : arm === 'reset-omission' ? TITLES.slice(0, 9) : arm === 'copy-omission' ? TITLES.slice(12) : []);
const expectedFaults = arm => faultTitles(arm).size;
const report = { version: 1, status: 'failed', mode, productQualified: false, startedAtUtc: new Date().toISOString(),
  scope: 'Compiled exact TransferPathBoard local React state and ReportQuestion props only. Hook, search, report, UI and static imports are fictional boundaries, with fixture CSS. No actual hook/graph/data/SDK/full-route validation.',
  sourceSha256: hash(canonical(boardBody.toString('utf8'))), physicalSourceSha256: hash(boardBody), fixtureBefore, producerBefore,
  sourcePlan: { originalSha256: plan.originalSha256, fixedSha256: plan.fixedSha256, wholeInverse: plan.wholeInverse },
  arms: [], summary: null, holds: {}, cleanupPassed: false, nativeLogsPassed: false };
const saveAggregate = () => write(path.join(out, 'report.json'), report);
saveAggregate();
const wall = ms => new Promise(resolve => setTimeout(resolve, ms));
const relative = file => path.relative(out, file).split(path.sep).join('/');
const artifact = file => ({ ...pin(file), file: relative(file) });
function inventory(directory) {
  const rows = [];
  function visit(part) {
    for (const entry of fs.readdirSync(path.join(directory, part), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      assert(!entry.isSymbolicLink()); const name = path.join(part, entry.name);
      if (entry.isDirectory()) visit(name); else { assert(entry.isFile()); const body = fs.readFileSync(path.join(directory, name)); rows.push({ file: name.split(path.sep).join('/'), bytes: body.length, sha256: hash(body) }); }
    }
  }
  visit(''); assert(rows.length); return rows;
}
let build, chromium, nativeMethod, toolBodies;
async function toolsReady() {
  ({ build } = await import('vite')); ({ chromium } = await import('../lib/playwrightLoader.mjs'));
  const packageBody = fs.readFileSync(path.join(path.dirname(require.resolve('playwright')), 'package.json'));
  const coreRoot = path.dirname(require.resolve('playwright-core')), corePackage = fs.readFileSync(path.join(coreRoot, 'package.json'));
  const browsersBody = fs.readFileSync(path.join(coreRoot, 'browsers.json')), packageVersion = JSON.parse(packageBody).version;
  assert.equal(packageVersion, '1.64.0'); assert.equal(JSON.parse(corePackage).version, packageVersion);
  const installedChromium = JSON.parse(browsersBody).browsers.filter(row => ['chromium', 'chromium-headless-shell'].includes(row.name));
  const binaryRoot = process.env.PLAYWRIGHT_BROWSERS_PATH, publicExecutablePath = chromium.executablePath();
  assert.equal(installedChromium.length, 2); assert(binaryRoot && path.isAbsolute(binaryRoot) && fs.existsSync(publicExecutablePath));
  assert(fs.realpathSync(publicExecutablePath).startsWith(fs.realpathSync(binaryRoot) + path.sep));
  nativeMethod = { engine: 'chromium', packageVersion, binaryRoot, publicExecutablePath, installedChromium,
    packageSha256: hash(packageBody), corePackageSha256: hash(corePackage), browsersJsonSha256: hash(browsersBody),
    coreSha256: hash(fs.readFileSync(path.join(coreRoot, 'lib/coreBundle.js'))) };
  toolBodies = { 'playwright-package.json': packageBody, 'playwright-core-package.json': corePackage, 'actual-browsers.json': browsersBody };
}
const importBoundaries = new Set(['@/components/FlagImg', '@/hooks/useTransferPath', '@/components/game/GameShell', '@/components/game/ResultScreen', '@/components/game/ReportQuestion', '@/components/game/PlayerAutocomplete', '@/lib/playerSearch', '@/components/game/GiveUpButton', '@/components/game/HowToPlayPopover', '@/lib/transferPathModes', '@/lib/transferPathEmptyList', '@/lib/utils', 'lucide-react']);
const specs = [{ id: 'phone-390x844', width: 390, height: 844, touch: true }, { id: 'reported-desktop-1194x642', width: 1194, height: 642, touch: false }];

async function runArm(arm) {
  const directory = path.join(out, arm); fs.mkdirSync(directory);
  const source = sourceForArm(plan, arm), sourcePath = path.join(directory, 'source.arm.tsx');
  assert.equal(typeof source, 'string'); fs.writeFileSync(sourcePath, source, { flag: 'wx' });
  fs.writeFileSync(path.join(directory, 'source.before.tsx'), canonical(boardBody.toString('utf8')), { flag: 'wx' });
  const armReport = { version: 1, status: 'failed', mode, arm, productQualified: false, scope: report.scope, sourceSha256: hash(source), sourceFile: 'source.arm.tsx', currentBoardSha256: report.sourceSha256,
    effectiveSourceControl: !['normal', 'restored'].includes(arm), sourceChangedFromNormal: source !== sourceForArm(plan, 'normal'), nativeMethod,
    cases: [], contextCount: 0, faultCount: 0, purposeCheckCount: 0, healthyPreservationCount: 0,
    fixtureSources: [], compiler: null, distBefore: null, distAfter: null, serverRequests: [], serverErrors: [],
    cleanup: { serverClosed: false, scratchRemoved: false }, cleanupErrors: [] };
  const save = () => write(path.join(directory, 'report.json'), armReport); save();
  let scratch, server, base, nativeChunks = [], stderrRestored = false;
  const oldStderrWrite = process.stderr.write;
  process.stderr.write = function(chunk, encoding, callback) {
    nativeChunks.push(Buffer.isBuffer(chunk) ? Buffer.from(chunk) : Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8'));
    return Reflect.apply(oldStderrWrite, process.stderr, [chunk, encoding, callback]);
  };
  try {
    for (const [name, body] of Object.entries(toolBodies)) fs.writeFileSync(path.join(directory, name), body, { flag: 'wx' });
    scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'transfer-path-context-fixture-'));
    for (const name of fixtureNames) {
      const body = fs.readFileSync(path.join(fixtureRoot, name)); fs.writeFileSync(path.join(scratch, name), body, { flag: 'wx' });
      const retained = path.join(directory, 'fixture-sources', name); fs.mkdirSync(path.dirname(retained), { recursive: true }); fs.writeFileSync(retained, body, { flag: 'wx' });
      armReport.fixtureSources.push({ name, ...artifact(retained) });
    }
    fs.writeFileSync(path.join(scratch, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>Fictional Board context fixture</title></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>\n', { flag: 'wx' });
    const dist = path.join(directory, 'compiled-dist');
    const aliases = ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'].map(find => ({ find: new RegExp('^' + find + '$'), replacement: require.resolve(find) }));
    await build({ configFile: false, root: scratch, publicDir: false, clearScreen: false, logLevel: 'silent', resolve: { alias: aliases }, esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
      plugins: [{ name: 'explicit-fictional-board-boundaries', resolveId(id) {
        if (id === '@actual-board') return sourcePath;
        if (importBoundaries.has(id)) return path.join(scratch, 'boundaries.tsx');
        assert(!id.startsWith('@/'), 'Unknown actual Board import: ' + id); return null;
      } }],
      build: { outDir: dist, emptyOutDir: true, minify: false, sourcemap: true, manifest: true, assetsInlineLimit: 0, rollupOptions: { input: path.join(scratch, 'index.html') } } });
    armReport.distBefore = inventory(dist);
    const matches = [];
    for (const map of armReport.distBefore.filter(row => row.file.endsWith('.map'))) {
      const parsed = JSON.parse(fs.readFileSync(path.join(dist, map.file), 'utf8'));
      for (let i = 0; i < (parsed.sourcesContent || []).length; i++) if (parsed.sourcesContent[i] === source) matches.push({ file: map.file, source: parsed.sources[i], sourceIndex: i, sourceSha256: hash(parsed.sourcesContent[i]) });
    }
    assert.equal(matches.length, 1, 'One complete exact Board source in the actual compiled sourcemap');
    const vitePackage = fs.readFileSync(require.resolve('vite/package.json'));
    armReport.compiler = { kind: 'Vite production fictional fixture build', viteVersion: JSON.parse(vitePackage).version, vitePackageSha256: hash(vitePackage), nodeVersion: process.version,
      completeBoardSourceMaps: matches, externalBoundaries: [...importBoundaries].sort(), actualHookOrDataOrReportSdkIncluded: false };
    write(path.join(directory, 'dist-manifest.json'), armReport.distBefore);
    const distMap = new Map(armReport.distBefore.map(row => [row.file, row]));
    server = http.createServer((request, response) => {
      try {
        assert.equal(request.method, 'GET');
        const url = new URL(request.url, base || 'http://127.0.0.1'), name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).slice(1);
        assert(name && !name.split('/').some(part => part === '..' || part === '.') && !name.includes('\\') && distMap.has(name), 'Only compiled members served');
        const body = fs.readFileSync(path.join(dist, name)), held = distMap.get(name); assert.equal(hash(body), held.sha256); assert.equal(body.length, held.bytes);
        const contentType = name.endsWith('.html') ? 'text/html' : name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'application/json';
        armReport.serverRequests.push({ id: armReport.serverRequests.length + 1, method: request.method, url: request.url, file: name, requestBody: null, status: 200, contentType,
          responseBytes: body.length, responseSha256: hash(body), at: new Date().toISOString() });
        response.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store' }); response.end(body);
      } catch (error) { armReport.serverErrors.push(String(error.stack || error)); response.writeHead(404); response.end('Refused fixture request'); }
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const address = server.address(); assert(address && typeof address === 'object'); base = 'http://127.0.0.1:' + address.port; armReport.server = { base, localOnly: true }; save();
    for (const [index, spec] of specs.entries()) await runCase({ arm, directory, source, spec, index, base, armReport, save, distMap });
    armReport.distAfter = inventory(dist); assert.deepEqual(armReport.distAfter, armReport.distBefore);
    assert.deepEqual(fixtureNames.map(name => pin(path.join(scratch, name)).sha256), fixtureBefore.map(row => row.sha256));
    assert.equal(armReport.serverErrors.length, 0, 'Unknown local requests fatal');
    armReport.contextCount = armReport.cases.length; armReport.faultCount = armReport.cases.reduce((sum, row) => sum + row.checks.filter(value => !value.passed).length, 0);
    armReport.purposeCheckCount = armReport.cases.reduce((sum, row) => sum + row.checks.length, 0); armReport.healthyPreservationCount = armReport.cases.reduce((sum, row) => sum + row.preservation.length, 0);
    assert.equal(armReport.contextCount, 2); assert.equal(armReport.faultCount, expectedFaults(arm) * 2); assert.equal(armReport.purposeCheckCount, 22); assert.equal(armReport.healthyPreservationCount, 6);
    armReport.status = 'passed';
  } catch (error) { armReport.error = String(error.stack || error); throw error; }
  finally {
    try { if (server) { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); armReport.cleanup.serverClosed = true; } } catch (error) { armReport.cleanupErrors.push(String(error.stack || error)); }
    try { if (scratch) { assert.equal(path.dirname(scratch), path.resolve(os.tmpdir())); assert(path.basename(scratch).startsWith('transfer-path-context-fixture-')); fs.rmSync(scratch, { recursive: true, force: true }); armReport.cleanup.scratchRemoved = !fs.existsSync(scratch); } } catch (error) { armReport.cleanupErrors.push(String(error.stack || error)); }
    process.stderr.write = oldStderrWrite; stderrRestored = process.stderr.write === oldStderrWrite;
    const stderrBody = Buffer.concat(nativeChunks); fs.writeFileSync(path.join(directory, 'native-browser.stderr.log'), stderrBody, { flag: 'wx' });
    armReport.stderrCaptureRestored = stderrRestored; armReport.stderr = artifact(path.join(directory, 'native-browser.stderr.log'));
    if (armReport.cleanupErrors.length) armReport.status = 'failed'; save();
  }
  assert(stderrRestored && armReport.cleanup.serverClosed && armReport.cleanup.scratchRemoved && !armReport.cleanupErrors.length);
  const stderrText = fs.readFileSync(path.join(directory, 'native-browser.stderr.log'), 'utf8');
  const validation = validateNativeLog(armReport, stderrText), refusalControls = assertNativeLogRefusals(armReport, stderrText);
  const first = validation.processes[0], diagnostic = first.diagnostics[0], cleanup = first.lifetime.find(row => row.stage === 'finished temporary directories cleanup');
  const once = (before, after) => { assert.equal(stderrText.split(before).length, 2); return stderrText.replace(before, after); };
  const unknownPid = Math.max(...validation.processes.map(row => row.pid)) + 1;
  const changedBodies = [stderrText + 'ROUND1433_UNKNOWN_NATIVE_OUTPUT\n', once(diagnostic.rawLine, diagnostic.rawLine + ' altered'),
    stderrText + first.launched.rawLine + '\n', once(cleanup.rawLine, ''), once(diagnostic.rawLine, diagnostic.rawLine.replace('[pid=' + first.pid + '][err]', '[pid=' + unknownPid + '][err]'))];
  fs.mkdirSync(path.join(directory, 'native-log-controls'));
  for (const [index, refusal] of refusalControls.refusals.entries()) {
    const file = path.join(directory, 'native-log-controls', refusal.id + '.log'), body = Buffer.from(changedBodies[index]);
    assert.notEqual(hash(body), hash(Buffer.from(stderrText))); assert.equal(hash(body), refusal.changedSha256); assert.equal(body.length, refusal.changedBytes);
    fs.writeFileSync(file, body, { flag: 'wx' }); refusal.file = relative(file);
  }
  const validationPath = path.join(directory, 'native-log-validation.json');
  write(validationPath, { status: 'passed', actualReport: artifact(path.join(directory, 'report.json')), stderr: armReport.stderr, validation, refusalControls });
  return { arm, status: 'passed', sourceSha256: hash(source), contextCount: armReport.contextCount, faultCount: armReport.faultCount, purposeCheckCount: armReport.purposeCheckCount,
    healthyPreservationCount: armReport.healthyPreservationCount, report: artifact(path.join(directory, 'report.json')), nativeLogValidation: artifact(validationPath), cleanup: armReport.cleanup };
}

async function runCase({ arm, directory, source, spec, index, base, armReport, save, distMap }) {
  const row = { id: spec.id, width: spec.width, height: spec.height, touch: spec.touch, status: 'failed', nativeLaunchOrdinal: index + 1,
    publicExecutablePath: nativeMethod.publicExecutablePath, browserVersion: null,
    lifecycle: { launched: false, contextCreated: false, pageCreated: false, cdpDetached: false, contextClosed: false, browserClosed: false, browserConnectedAfterClose: null },
    checks: [], preservation: [], observations: [], actions: [], waits: [], requests: [], responses: [], responseErrors: [], routeRefusals: [], pageErrors: [], console: [], requestFailures: [],
    images: [], axJoins: [], cleanupErrors: [], sourceSha256: hash(source) };
  armReport.cases.push(row); save();
  const caseDirectory = path.join(directory, spec.id); fs.mkdirSync(caseDirectory);
  let browser, context, page, cdp; const pendingResponses = [];
  const bounded = async (label, action, timeout = 20000) => {
    const wait = { label, timeout, startedMs: Date.now(), status: 'pending' }; row.waits.push(wait); save(); let timer;
    try { const result = await Promise.race([action(), new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error('Bounded setup/runtime wait: ' + label)), timeout); })]); wait.status = 'passed'; return result; }
    catch (error) { wait.status = 'failed'; wait.error = String(error.stack || error); throw error; }
    finally { clearTimeout(timer); wait.finishedMs = Date.now(); save(); }
  };
  const stableRead = async () => {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    return page.evaluate(() => {
      const pre = document.querySelector('[data-fixture-report-props]'), hook = document.querySelector('[data-fixture-hook-state]');
      if (!pre || !hook || !window.__tp1439.latestReport) throw new Error('Actual Board/committed report props absent');
      const props = JSON.parse(pre.textContent), latest = window.__tp1439.latestReport.props;
      if (JSON.stringify(props) !== JSON.stringify(latest)) throw new Error('Actual props DOM and committed capture differ');
      const error = document.querySelector('[data-actual-board] p.text-destructive');
      return { props, hook: JSON.parse(hook.textContent), error: error?.textContent || '', errorVisible: !!error && !!(error.getBoundingClientRect().width && error.getBoundingClientRect().height),
        nativeDate: Date.now(), nativePerformance: performance.now(), trustedEvents: window.__tp1439.events.length, hookEvents: window.__tp1439.hookEvents.length, addCalls: window.__tp1439.addCalls.length };
    });
  };
  const observe = async phase => {
    const value = await bounded('actual committed Board observation ' + phase, stableRead);
    assert.equal(value.props.gameType, 'transfer-path'); assert.equal(value.props.gameContext.puzzleId, value.hook.puzzle.id);
    assert.equal(value.props.gameContext.playerA, value.hook.puzzle.playerA); assert.equal(value.props.gameContext.playerB, value.hook.puzzle.playerB);
    assert.equal(value.props.gameContext.rule, value.hook.activeRule); assert.deepEqual(value.props.gameContext.chain, value.hook.chain); assert.equal(value.props.gameContext.poolSize, 8);
    row.observations.push({ phase, ...value }); save(); return value;
  };
  const activate = async (locator, label) => {
    await bounded('visible native target ' + label, () => locator.waitFor({ state: 'visible' }));
    await locator.scrollIntoViewIfNeeded(); assert(await locator.isEnabled(), 'Actual target enabled: ' + label);
    const begin = await page.evaluate(() => window.__tp1439.events.length);
    if (spec.touch) await bounded('trusted touch ' + label, () => locator.tap());
    else { await locator.focus(); await bounded('trusted keyboard ' + label, () => page.keyboard.press('Enter')); }
    const events = await page.evaluate(offset => window.__tp1439.events.slice(offset), begin);
    assert(events.some(event => event.type === 'click' && event.trusted), 'Actual trusted native click: ' + label);
    if (spec.touch) assert(events.some(event => event.type === 'pointerdown' && event.trusted));
    else assert(events.some(event => event.type === 'keydown' && event.key === 'Enter' && event.trusted));
    row.actions.push({ label, input: spec.touch ? 'native touch' : 'native keyboard Enter', events }); save();
  };
  const type = async value => {
    const input = page.getByRole('textbox', { name: 'Fictional player search', exact: true }); await input.scrollIntoViewIfNeeded(); await input.focus();
    const begin = await page.evaluate(() => window.__tp1439.events.length);
    await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Backspace'); if (value) await page.keyboard.type(value);
    const events = await page.evaluate(offset => window.__tp1439.events.slice(offset), begin);
    assert(events.some(event => event.type === 'input' && event.trusted), 'Native trusted typing');
    assert.equal(await input.inputValue(), value); row.actions.push({ label: 'type fictional search', value, events }); save();
  };
  const select = async name => { await type(name); await activate(page.locator('[data-fixture-pick="' + name + '"]'), 'select fictional ' + name); };
  const fixture = async action => activate(page.locator('[data-fixture-action="' + action + '"]'), 'fixture boundary ' + action);
  const makeFailure = async (tag = 'One', name = 'Rejected Cedar') => {
    await type('Zzz Fixture ' + tag);
    await bounded('fictional no-result callback', async () => {
      for (let i = 0; i < 80; i++) { const current = await stableRead(); if (current.props.gameContext.lastNoMatch === 'Zzz Fixture ' + tag) return; await wall(25); }
      assert.fail('Fictional no-result callback never committed');
    });
    await select(name);
    const current = await observe('current-failure-' + tag);
    assert.deepEqual(current.props.gameContext.lastRejected, { name, after: current.hook.chain.at(-1) });
    assert.equal(current.props.gameContext.lastNoMatch, 'Zzz Fixture ' + tag); assert(current.error && current.errorVisible, 'Actual visible failure before purpose checks'); return current;
  };
  const purpose = (title, passed, evidence) => {
    const expectedFailure = faultTitles(arm).has(title); let captured = null;
    try { assert(passed, 'TP1439_PURPOSE: ' + title); }
    catch (error) {
      assert(error instanceof assert.AssertionError && String(error.message).startsWith('TP1439_PURPOSE: '), 'Only the exact purpose assertion can count as a fault');
      assert(expectedFailure, 'Unexpected actual Board purpose failure'); captured = String(error.message);
    }
    assert.equal(passed, !expectedFailure, 'Only declared effective source controls fail the purpose');
    row.checks.push({ title, passed, expectedFailure, assertion: captured, evidence }); save();
  };
  const screenshot = async (phase, locator) => {
    if (locator) await locator.scrollIntoViewIfNeeded();
    const before = await stableRead(), file = path.join(caseDirectory, phase + '.png'); await page.screenshot({ path: file, fullPage: false });
    const after = await stableRead(), body = fs.readFileSync(file);
    assert.deepEqual(after.props, before.props); assert.deepEqual(after.hook, before.hook); assert.equal(after.error, before.error);
    assert.equal(body.subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); assert.equal(body.readUInt32BE(16), spec.width); assert.equal(body.readUInt32BE(20), spec.height);
    row.images.push({ phase, file: relative(file), bytes: body.length, sha256: hash(body), width: spec.width, height: spec.height, fullPage: false,
      observedProps: before.props, error: before.error, scope: 'Positioned fictional fixture viewport only; no full-route layout/no-scroll credit' }); save();
  };
  try {
    browser = await bounded('launch actual native Chromium', () => chromium.launch({ headless: true }), 45000); row.lifecycle.launched = true; row.browserVersion = browser.version();
    context = await bounded('create isolated actual context', () => browser.newContext({ viewport: { width: spec.width, height: spec.height }, hasTouch: spec.touch, isMobile: spec.touch, serviceWorkers: 'block' })); row.lifecycle.contextCreated = true;
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== base || request.method() !== 'GET') { row.routeRefusals.push({ url: request.url(), method: request.method(), body: request.postData(), reason: 'Any nonlocal/non-GET request fatal' }); await route.abort('blockedbyclient'); return; }
      await route.continue();
    });
    page = await context.newPage(); row.lifecycle.pageCreated = true;
    page.on('pageerror', error => { row.pageErrors.push(String(error.stack || error)); save(); });
    page.on('console', message => { row.console.push({ type: message.type(), text: message.text() }); save(); });
    page.on('request', request => { row.requests.push({ id: row.requests.length + 1, url: request.url(), method: request.method(), postData: request.postData(), resourceType: request.resourceType() }); });
    page.on('requestfailed', request => { row.requestFailures.push({ url: request.url(), error: request.failure() }); });
    page.on('response', response => {
      const operation = (async () => {
        const body = await response.body(), url = new URL(response.url()), name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).slice(1);
        assert.equal(url.origin, base); assert.equal(response.status(), 200); assert(distMap.has(name));
        assert.equal(body.length, distMap.get(name).bytes); assert.equal(hash(body), distMap.get(name).sha256, 'Consumed body equals actual compiled member');
        const bodyDirectory = path.join(directory, 'response-bodies'); fs.mkdirSync(bodyDirectory, { recursive: true }); const bodyFile = path.join(bodyDirectory, hash(body) + '.body');
        if (fs.existsSync(bodyFile)) assert(fs.readFileSync(bodyFile).equals(body)); else fs.writeFileSync(bodyFile, body, { flag: 'wx' });
        row.responses.push({ url: response.url(), file: name, status: response.status(), contentType: response.headers()['content-type'], body: artifact(bodyFile) });
      })().catch(error => { row.responseErrors.push(String(error.stack || error)); });
      pendingResponses.push(operation);
    });
    await bounded('load only actual compiled fictional fixture', () => page.goto(base + '/', { waitUntil: 'networkidle' }));
    cdp = await context.newCDPSession(page); await cdp.send('Accessibility.enable'); await page.locator('[data-fixture-report-props]').waitFor();
    const clock = await page.evaluate(async () => {
      const first = { date: Date.now(), performance: performance.now() }, frames = await new Promise(resolve => requestAnimationFrame(a => requestAnimationFrame(b => resolve([a, b]))));
      return { first, last: { date: Date.now(), performance: performance.now() }, frames, dateNative: Date.now.toString().includes('[native code]'),
        performanceNative: performance.now.toString().includes('[native code]'), timeoutNative: setTimeout.toString().includes('[native code]'), rafNative: requestAnimationFrame.toString().includes('[native code]') };
    });
    assert(clock.dateNative && clock.performanceNative && clock.timeoutNative && clock.rafNative); assert(clock.last.performance > clock.first.performance && clock.frames[1] > clock.frames[0]); row.clock = clock;
    const reset = async () => { await fixture('reset'); const current = await observe('fictional-boundary-reset'); assert.equal(current.hook.status, 'playing'); };

    for (const [dependencyIndex, identity] of ['id', 'playerA', 'playerB', 'mode', 'index', 'activeRule'].entries()) {
      await reset(); const before = await makeFailure('Dependency-' + identity);
      if (dependencyIndex === 0) await screenshot('first-current-failure', page.locator('[data-actual-board] p.text-destructive'));
      await fixture('identity-' + identity); const after = await observe('identity-' + identity + '-after');
      const field = identity === 'id' ? 'puzzleId' : identity;
      const identityValue = value => identity === 'index' ? value.hook.unlimitedIndex : identity === 'mode' ? value.hook.mode : identity === 'activeRule' ? value.hook.activeRule : value.props.gameContext[field];
      assert.notEqual(identityValue(after), identityValue(before), 'Declared identity changed independently');
      purpose(TITLES[dependencyIndex], after.props.gameContext.lastRejected === null && after.props.gameContext.lastNoMatch === null && after.error === '', { before, after });
    }
    await reset(); await fixture('prepare-next'); const nextFailure = await makeFailure('Next');
    await activate(page.locator('[data-actual-board]').getByRole('button', { name: 'Give up and see a path', exact: true }), 'actual Board give-up callback to expose Next Puzzle');
    const preparedNext = await observe('prepared-actual-next'); assert.equal(preparedNext.hook.status, 'gaveup');
    assert.deepEqual(preparedNext.props.gameContext.lastRejected, nextFailure.props.gameContext.lastRejected);
    await activate(page.locator('[data-actual-board]').getByRole('button', { name: 'Next Puzzle', exact: true }), 'actual Board Next Puzzle callback');
    const afterNext = await observe('same-id-index-wrap-after');
    assert.equal(afterNext.props.gameContext.puzzleId, preparedNext.props.gameContext.puzzleId); assert.equal(preparedNext.hook.unlimitedIndex, 999); assert.equal(afterNext.hook.unlimitedIndex, 0);
    purpose(TITLES[6], afterNext.props.gameContext.lastRejected === null && afterNext.props.gameContext.lastNoMatch === null && afterNext.error === '', { before: preparedNext, after: afterNext });
    await screenshot('same-id-next-after', page.locator('[data-fixture-report]'));
    await reset(); await fixture('identity-mode'); const dailyFailure = await makeFailure('Daily');
    await fixture('prepare-daily-win'); const dailyBefore = await observe('daily-completed-before'); assert.equal(dailyBefore.hook.mode, 'daily'); assert.equal(dailyBefore.hook.status, 'won');
    assert.deepEqual(dailyBefore.props.gameContext.lastRejected, dailyFailure.props.gameContext.lastRejected);
    await activate(page.locator('[data-actual-board]').getByRole('button', { name: 'Play Unlimited', exact: true }), 'actual completed daily Play Unlimited callback');
    const afterDaily = await observe('daily-play-unlimited-after'); assert.equal(afterDaily.hook.mode, 'unlimited');
    purpose(TITLES[7], afterDaily.props.gameContext.lastRejected === null && afterDaily.props.gameContext.lastNoMatch === null && afterDaily.error === '', { before: dailyBefore, after: afterDaily });
    await reset(); const ruleBefore = await makeFailure('Rule');
    await activate(page.locator('[data-actual-board]').getByRole('button', { name: 'Europe only', exact: true }), 'actual accepted special-rule callback');
    const ruleAfter = await observe('accepted-rule-after'); assert.equal(ruleAfter.hook.activeRule, 'europe');
    purpose(TITLES[8], ruleAfter.props.gameContext.lastRejected === null && ruleAfter.props.gameContext.lastNoMatch === null && ruleAfter.error === '', { before: ruleBefore, after: ruleAfter });

    await reset(); const held = await makeFailure('History'); await type('Bridge Vale');
    await activate(page.locator('[data-actual-board]').getByRole('button', { name: 'Show hint', exact: false }), 'actual Board show hint');
    await activate(page.locator('[data-actual-board]').getByRole('button', { name: 'More help', exact: false }), 'actual Board more help');
    await activate(page.locator('[data-fixture-pick="Bridge Vale"]'), 'actual valid fictional advancement');
    const advanced = await observe('same-puzzle-history-after');
    assert.deepEqual(advanced.props.gameContext.lastRejected, held.props.gameContext.lastRejected); assert.equal(advanced.props.gameContext.lastNoMatch, held.props.gameContext.lastNoMatch);
    assert.equal(advanced.error, ''); assert.equal(advanced.hook.chain.at(-1), 'Bridge Vale'); assert.equal(advanced.props.gameContext.puzzleId, held.props.gameContext.puzzleId);
    row.preservation.push({ title: TITLES[9], passed: true, before: held, after: advanced });
    await reset(); const ignored = await makeFailure('Ignored'); await fixture('ignore-rule');
    await activate(page.locator('[data-actual-board]').getByRole('button', { name: 'Europe only', exact: true }), 'actual guarded false special-rule callback');
    const ignoredAfter = await observe('ignored-rule-after'); assert.deepEqual(ignoredAfter.props, ignored.props); assert.equal(ignoredAfter.error, ignored.error); assert.equal(ignoredAfter.hook.activeRule, 'classic');
    assert(await page.evaluate(() => window.__tp1439.hookEvents.some(row => row.kind === 'ignored-rule-callback')));
    row.preservation.push({ title: TITLES[10], passed: true, before: ignored, after: ignoredAfter });
    await reset(); await makeFailure('Old'); await select('Bridge Vale'); const newest = await makeFailure('Newest', 'Rejected Juniper');
    assert.deepEqual(newest.props.gameContext.lastRejected, { name: 'Rejected Juniper', after: 'Bridge Vale' });
    const specialized = [];
    for (const [name, expected] of [
      ['Duplicate Elm', 'Duplicate Elm is already in the path'],
      ['Inactive Ash', "Inactive Ash isn't in our verified 2026 active-player records, so Active players only leaves them out"],
      ['Outside Fir', 'Outside Fir only links to Bridge Vale through a club outside Europe'],
    ]) {
      await select(name); const current = await observe('specialized-' + name); assert.equal(current.error, expected);
      assert.deepEqual(current.props.gameContext.lastRejected, { name, after: 'Bridge Vale' }); assert.equal(current.props.gameContext.lastNoMatch, newest.props.gameContext.lastNoMatch); specialized.push(current);
    }
    row.preservation.push({ title: TITLES[11], passed: true, newest, specialized }); save();
    await reset(); const copy = await makeFailure('Copy'), wanted = "Rejected Cedar and Start Alder don't share a club season in our records";
    purpose(TITLES[12], copy.error === wanted, { observed: copy.error, expected: wanted, props: copy.props });
    const documentNode = await cdp.send('DOM.getDocument', { depth: 1 });
    const selected = await cdp.send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: '[data-actual-board] p.text-destructive' }); assert(selected.nodeId);
    const description = await cdp.send('DOM.describeNode', { nodeId: selected.nodeId }), backendNodeId = description.node.backendNodeId;
    const partial = await cdp.send('Accessibility.getPartialAXTree', { backendNodeId, fetchRelatives: true }), full = await cdp.send('Accessibility.getFullAXTree');
    assert(full.nodes.some(node => !node.ignored && node.role?.value === 'StaticText' && node.name?.value === copy.error));
    assert(partial.nodes.some(node => !node.ignored && node.role?.value === 'StaticText' && node.name?.value === copy.error));
    const axFile = path.join(caseDirectory, 'generic-refusal-native-join.json');
    write(axFile, { scope: 'Shallow document/query/describe plus native partial/full AX, not recursive whole DOM', copy, nodeId: selected.nodeId, backendNodeId, description, partial, full });
    row.axJoins.push(artifact(axFile)); await screenshot('generic-refusal', page.locator('[data-actual-board] p.text-destructive'));
    await activate(page.locator('[data-fixture-help]'), 'open actual Board-provided instructions');
    const instruction = page.locator('[data-fixture-instructions]'), instructionText = await instruction.innerText();
    assert(instructionText.includes('same club as the LAST player in your chain, in the same season.'));
    purpose(TITLES[13], instructionText.includes(NATIONAL_INSTRUCTION), { expected: NATIONAL_INSTRUCTION, actual: instructionText });
    await screenshot('club-only-instructions', instruction); await Promise.all(pendingResponses);
    for (const key of ['routeRefusals', 'requestFailures', 'responseErrors', 'pageErrors', 'console']) assert.equal(row[key].length, 0, 'Any unexpected IO/runtime/console output is fatal: ' + key);
    assert.equal(row.requests.length, row.responses.length); assert(row.requests.length > 0);
    assert(row.requests.every(request => request.method === 'GET' && request.postData === null && new URL(request.url).origin === base));
    const telemetry = await page.evaluate(() => window.__tp1439); assert(telemetry.events.length && telemetry.events.every(event => event.trusted), 'All captured interaction events are native and trusted');
    const telemetryFile = path.join(caseDirectory, 'raw-telemetry.json'); write(telemetryFile, telemetry); row.rawTelemetry = artifact(telemetryFile);
    assert.equal(row.checks.length, 11); assert.equal(row.checks.filter(value => !value.passed).length, expectedFaults(arm));
    assert.equal(row.preservation.length, 3); assert.equal(row.images.length, 4); assert.equal(row.axJoins.length, 1); row.status = 'passed';
  } catch (error) { row.error = String(error.stack || error); throw error; }
  finally {
    try { if (cdp) { await bounded('detach native CDP', () => cdp.detach()); row.lifecycle.cdpDetached = true; } } catch (error) { row.cleanupErrors.push(String(error.stack || error)); }
    try { if (context) { await bounded('close isolated context', () => context.close()); row.lifecycle.contextClosed = true; } } catch (error) { row.cleanupErrors.push(String(error.stack || error)); }
    try { if (browser) { await bounded('close actual native Chromium', () => browser.close()); row.lifecycle.browserClosed = true; row.lifecycle.browserConnectedAfterClose = browser.isConnected(); } } catch (error) { row.cleanupErrors.push(String(error.stack || error)); }
    if (row.cleanupErrors.length) row.status = 'failed'; save();
  }
  assert.equal(row.cleanupErrors.length, 0); assert.equal(row.lifecycle.browserConnectedAfterClose, false);
}

let failure;
try {
  await toolsReady(); for (const arm of arms) { report.arms.push(await runArm(arm)); saveAggregate(); }
  if (mode === 'fixed') assert.equal(report.arms[0].sourceSha256, report.arms.at(-1).sourceSha256, 'Restoration compiles the same complete normal Board');
  report.summary = { arms: report.arms.length, contexts: report.arms.reduce((sum, arm) => sum + arm.contextCount, 0),
    purposeChecks: report.arms.reduce((sum, arm) => sum + arm.purposeCheckCount, 0), purposeFaults: report.arms.reduce((sum, arm) => sum + arm.faultCount, 0),
    healthyPreservationGroups: report.arms.reduce((sum, arm) => sum + arm.healthyPreservationCount, 0), images: report.arms.length * 8, axJoins: report.arms.length * 2 };
  assert.equal(report.summary.purposeFaults, mode === 'baseline' ? 22 : 44);
  report.cleanupPassed = report.arms.every(arm => arm.cleanup.serverClosed && arm.cleanup.scratchRemoved); report.nativeLogsPassed = report.arms.every(arm => arm.nativeLogValidation.sha256);
  assert(report.cleanupPassed && report.nativeLogsPassed); report.status = 'passed';
} catch (error) { report.error = String(error.stack || error); failure = error; }
finally {
  try {
    assert(fs.readFileSync(path.join(root, BOARD_FILE)).equals(boardBody));
    assert.deepEqual(fixtureNames.map(name => pin(path.join(fixtureRoot, name))), fixtureBefore.map(({ name, ...row }) => row));
    assert.deepEqual(producerFiles.map(file => pin(path.join(root, file))), producerBefore);
    assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size, 0);
    report.holds = { sourceBoardHeld: true, fixtureSourcesHeld: true, producerInputBodiesHeld: true, ordinaryOfflineReceiptEmpty: true };
  } catch (error) { report.status = 'failed'; report.afterGuardError = String(error.stack || error); failure ||= error; }
  report.completedAtUtc = new Date().toISOString(); saveAggregate();
}
if (failure) throw failure;
const finalReceipt = pin(path.join(out, 'report.json'));
console.log('TRANSFER_PATH_REPORT_CONTEXT_BROWSER_COMPLETE ' + JSON.stringify({ mode, productQualified: false, ...report.summary, cleanupPassed: report.cleanupPassed, nativeLogsPassed: report.nativeLogsPassed, reportSha256: finalReceipt.sha256 }));
