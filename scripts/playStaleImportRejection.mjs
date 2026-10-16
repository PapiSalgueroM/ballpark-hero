/* Controlled pre-unload proof using the emitted Vite export and actual React initializer.
 * The automatic reload's document response is held, not simulated or fulfilled.
 * This is not a natural production race, a ReactDOM flow or a visual acceptance claim.
 */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import pw from './lib/playwrightLoader.mjs';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHASE = process.env.STALE_IMPORT_PHASE;
assert(['baseline', 'fixed'].includes(PHASE), 'STALE_IMPORT_PHASE must be baseline or fixed');
assert(process.env.STALE_IMPORT_OUT && path.isAbsolute(process.env.STALE_IMPORT_OUT), 'Absolute STALE_IMPORT_OUT required');
const OUT = path.resolve(process.env.STALE_IMPORT_OUT), DIST = path.join(ROOT, 'dist');
fs.mkdirSync(OUT, { recursive: true });
const REPORT = path.join(OUT, 'report.json');
assert(!fs.existsSync(REPORT), 'Do not overwrite a physical proof report');
const STALE_KEY = 'dukb-reloaded-stale-chunk';
const IDS = ['automatic-held-document', 'marker-already-spent', 'optional-sound-kit', 'offline-after-boot'];
const CAUSE = 'STALE_IMPORT_ORIGINAL_REJECTION: actual emitted preload must reject the original native payload and actual React lazy initializer must throw that same payload';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const list = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => item.isDirectory()
  ? list(path.join(directory, item.name)) : [path.join(directory, item.name)]).sort();
const relative = file => path.relative(ROOT, file).replaceAll('\\', '/');
const receipt = file => ({ file: relative(file), bytes: fs.statSync(file).size, sha256: hash(fs.readFileSync(file)) });
const sources = ['src/main.tsx', 'src/lib/freshBuild.ts', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs',
  'scripts/playStaleImportRejection.mjs', 'package.json', 'package-lock.json', 'bun.lock'].map(file => ({ file, bytes: fs.readFileSync(path.join(ROOT, file)) }));
const sourceHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const appCommit = PHASE === 'baseline' ? 'e7f111b7de73153efdc7e343282d65eeae9289fc' : sourceHead;
const expectedApp = execFileSync('git', ['show', appCommit + ':src/lib/freshBuild.ts'], { cwd: ROOT });
const appReference = { file: 'src/lib/freshBuild.ts', ref: PHASE === 'baseline' ? appCommit : 'HEAD', commit: appCommit,
  bytes: expectedApp.length, sha256: hash(expectedApp), held: false };
const distBefore = list(DIST).map(receipt);
const report = { phase: PHASE, status: 'running', sourceHead, appReference,
  completed: 0, passed: 0, failed: 0, expectedBooleanFaults: PHASE === 'baseline' ? 1 : 0, setupFailures: 0, cases: [],
  limits: ['Only the additional automatic reload DOCUMENT response is held before headers are committed.',
    'Controlled old-document microtask settlement, not the frequency or timing of a natural production race.',
    'Actual React 18.3.1 private lazy initializer, not a ReactDOM render or boundary/Close/Retry journey.',
    'Fresh signed-out Soccer Career creator; no career begins, saved fixture, external response or database credit.',
    'All external requests and WebSockets are blocked; no clock, RNG, app listener or error implementation is changed.',
    'Stores, timeOrigin and URL are captured synchronously at helper/React settlement, before the separate 500ms network observation.',
    'No absence-of-reload claim beyond the settled import and 500ms observation window.'], sources: [], dist: distBefore };
const write = () => fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
for (const row of sources) {
  const destination = path.join(OUT, 'source', row.file); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, row.bytes);
  report.sources.push({ file: row.file, bytes: row.bytes.length, sha256: hash(row.bytes) });
}
write();
const within = async (promise, milliseconds, label) => {
  let timeout;
  try { return await Promise.race([promise, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error(label)), milliseconds); })]); }
  finally { clearTimeout(timeout); }
};
function contains(node, predicate) {
  if (predicate(node)) return true;
  let found = false; ts.forEachChild(node, child => { if (contains(child, predicate)) found = true; }); return found;
}
function emittedOwner() {
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map(match => match[0]).filter(tag => /\btype=["']module["']/.test(tag))
    .map(tag => /\bsrc=["']([^"']+)["']/.exec(tag)?.[1]).filter(Boolean);
  assert.equal(scripts.length, 1, 'One actual emitted module entry');
  const url = new URL(scripts[0], 'http://owned.invalid');
  assert.equal(url.origin, 'http://owned.invalid'); assert(!url.search && !url.hash && /^\/assets\/index-[\w-]+\.js$/.test(url.pathname));
  const file = path.resolve(DIST, '.' + url.pathname); assert(file.startsWith(DIST + path.sep));
  const source = fs.readFileSync(file, 'utf8'), syntax = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(syntax.parseDiagnostics.length, 0, 'Actual installed TypeScript must parse emitted source');
  const exported = new Map();
  for (const statement of syntax.statements) {
    if (ts.isExportDeclaration(statement) && !statement.moduleSpecifier && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const item of statement.exportClause.elements) {
        const local = (item.propertyName || item.name).text, aliases = exported.get(local) || [];
        aliases.push(item.name.text); exported.set(local, aliases);
      }
    }
  }
  const candidates = [];
  const add = (name, node) => {
    if (!exported.has(name) || !contains(node, child => ts.isStringLiteralLike(child) && child.text === 'vite:preloadError')) return;
    candidates.push({ name, node, aliases: exported.get(name) });
  };
  for (const statement of syntax.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) add(statement.name.text, statement);
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) add(declaration.name.text, declaration);
    }
  }
  assert.equal(candidates.length, 1, 'Exactly one exported actual preload owner containing the real event literal');
  const owner = candidates[0]; assert.equal(owner.aliases.length, 1, 'Unique emitted preload export alias');
  const text = owner.node.getText(syntax);
  fs.writeFileSync(path.join(OUT, 'emitted-entry.js'), source); fs.writeFileSync(path.join(OUT, 'emitted-preload-owner.js'), text);
  const main = ts.createSourceFile('src/main.tsx', sources.find(row => row.file === 'src/main.tsx').bytes.toString('utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const watch = main.statements.findIndex(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)
    && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'watchForNewBuild');
  const mount = main.statements.findIndex(node => ts.isExpressionStatement(node)
    && contains(node, child => ts.isCallExpression(child) && ts.isIdentifier(child.expression) && child.expression.text === 'createRoot'));
  assert(watch >= 0 && mount > watch, 'Real main registers the build watcher before root mount');
  const reactPackage = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/react/package.json'), 'utf8'));
  assert.equal(reactPackage.version, '18.3.1');
  return { entryPath: url.pathname, file: relative(file), bytes: Buffer.byteLength(source), sha256: hash(source),
    parser: { version: ts.version, package: receipt(path.join(ROOT, 'node_modules/typescript/package.json')) },
    local: owner.name, alias: owner.aliases[0], start: owner.node.getStart(syntax), end: owner.node.end,
    ownerBytes: Buffer.byteLength(text), ownerSha256: hash(text), watcherBeforeMount: true,
    reactPackage: receipt(path.join(ROOT, 'node_modules/react/package.json')) };
}
let browser, server;
async function serve() {
  const port = await within(new Promise((resolve, reject) => {
    const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port; probe.close(error => error ? reject(error) : resolve(port));
    });
  }), 5000, 'Owned port probe did not finish');
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  await within(new Promise((resolve, reject) => {
    let log = ''; server.once('error', reject); server.once('exit', code => reject(new Error('Owned host exited ' + code + ': ' + log)));
    server.stdout.on('data', bytes => { log += bytes; if (log.includes('host-like server:')) resolve(); });
    server.stderr.on('data', bytes => { log += bytes; });
  }), 15000, 'Owned host did not start');
  return `http://127.0.0.1:${port}`;
}
async function runCase(base, owner, id) {
  const row = { id, stage: 'boot', transport: [], requests: [], responses: [], documents: [], console: [], pageErrors: [], lifecycle: [],
    progress: [], budget: { workMs: 90000, cleanupMs: 15000 }, setupFault: null, outcome: null,
    provenance: { sourceHead: report.sourceHead, appReference: report.appReference, entryPath: owner.entryPath, entrySha256: owner.sha256,
      preloadExportAlias: owner.alias, preloadOwnerSha256: owner.ownerSha256, reactPackageSha256: owner.reactPackage.sha256,
      sourceReceipts: report.sources, mode: 'Actual emitted helper, native import and React private initializer; controlled document hold only' } };
  report.cases.push(row); let context, page, runtime;
  const held = [], pendingBodies = []; let armed = false, heldResolve;
  const heldDocument = new Promise(resolve => { heldResolve = resolve; });
  const rawPath = path.join(OUT, id + '.raw.json');
  const retain = () => { fs.writeFileSync(rawPath, JSON.stringify(row, null, 2) + '\n'); write(); };
  const started = Date.now(), deadline = started + row.budget.workMs;
  const checkpoint = (label, state = 'complete') => {
    row.progress.push({ label, state, elapsedMs: Date.now() - started }); retain();
    console.log(`Stale import ${id}: ${label} ${state}`);
  };
  const step = async (label, action, milliseconds = 20000) => {
    checkpoint(label, 'started');
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error(id + ': case work deadline exhausted before ' + label);
    try {
      const result = await within(Promise.resolve().then(action), Math.min(milliseconds, remaining), id + ': ' + label + ' timed out');
      checkpoint(label); return result;
    } catch (error) { checkpoint(label, 'failed'); throw error; }
  };
  try {
    context = await step('create-context', () => browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: base, localStorage: [
        { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }, { name: 'dukb-guest-handle', value: 'SteadyVolley-18' }] }] } }));
    page = await step('create-page', () => context.newPage()); page.setDefaultTimeout(20000);
    if (id === 'marker-already-spent') await step('seed-spent-marker', () => page.addInitScript(key => sessionStorage.setItem(key, '1'), STALE_KEY));
    const missing = id === 'optional-sound-kit' ? '/assets/soundKit-CausalProof.js' : '/assets/causal-missing.js';
    assert(!fs.existsSync(path.join(DIST, missing.slice(1))), 'Declared native-import fault asset must actually be absent');
    row.missingUrl = base + missing;
    await step('install-owned-routes', () => context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== base || url.pathname === missing) {
        row.transport.push({ stage: row.stage, url: request.url(), method: request.method(),
          action: url.origin === base ? 'owned-native-import-abort' : 'external-abort' });
        return within(route.abort('blockedbyclient'), 5000, id + ': declared abort timed out');
      }
      if (armed && request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        const lifecycle = { url: request.url(), method: request.method(), stage: row.stage, operation: 'held-before-response', released: false };
        row.lifecycle.push(lifecycle); row.transport.push({ url: request.url(), method: request.method(), action: 'held-reload-document' });
        checkpoint('reload-document-held');
        return new Promise(resolve => { held.push({ route, resolve, lifecycle }); heldResolve(); });
      }
      return within(route.continue(), 5000, id + ': owned route continuation timed out');
    }));
    await step('block-websockets', () => context.routeWebSocket('**/*', socket => { row.transport.push({ url: socket.url(), action: 'websocket-close' }); socket.close(); }));
    page.on('request', request => row.requests.push({ stage: row.stage, url: request.url(), method: request.method(), type: request.resourceType(),
      mainDocument: request.isNavigationRequest() && request.frame() === page.mainFrame() }));
    page.on('response', response => {
      const request = response.request(), item = { stage: row.stage, url: response.url(), status: response.status(),
        mainDocument: request.isNavigationRequest() && request.frame() === page.mainFrame() };
      row.responses.push(item);
      if (response.url() === base + owner.entryPath) pendingBodies.push(within(response.body(), 15000, id + ': served entry body timed out')
        .then(bytes => { item.bytes = bytes.length; item.sha256 = hash(bytes); }).catch(error => { item.bodyError = String(error); }));
    });
    page.on('requestfailed', request => row.transport.push({ stage: row.stage, action: 'request-failed', url: request.url(),
      error: request.failure()?.errorText || null, type: request.resourceType() }));
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) row.documents.push({ stage: row.stage, url: frame.url() }); });
    page.on('pageerror', error => row.pageErrors.push({ stage: row.stage, name: error.name, message: error.message, stack: error.stack }));
    page.on('console', message => { if (message.type() === 'error') row.console.push({ stage: row.stage, text: message.text(), location: message.location() }); });
    await step('load-document', () => page.goto(base + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 45000 }), 45000);
    await step('creator-ready', () => page.getByRole('heading', { name: 'Create Your Player', exact: true }).waitFor({ timeout: 45000 }), 45000);
    await step('boot-network-settled', () => page.waitForLoadState('networkidle', { timeout: 20000 }));
    checkpoint('booted');
    runtime = await step('import-actual-namespace', () => page.evaluateHandle(async ({ entryUrl, alias }) => {
      const entry = await import(entryUrl), preload = entry[alias];
      if (typeof preload !== 'function') throw new Error('Actual emitted preload export is not a function');
      const identities = [...new Set(Object.values(entry).filter(value => value && typeof value === 'object'
        && typeof value.lazy === 'function' && typeof value.createElement === 'function' && value.version === '18.3.1'))];
      if (identities.length !== 1) throw new Error('Actual entry must export exactly one React 18.3.1 lazy/createElement object identity');
      const React = identities[0], aliases = Object.entries(entry).filter(([, value]) => value === React).map(([name]) => name);
      const readStores = () => {
        const read = store => Object.fromEntries(Object.keys(store).sort().map(key => [key, store.getItem(key)]));
        return { local: read(localStorage), session: read(sessionStorage), timeOrigin: performance.timeOrigin, href: location.href,
          online: navigator.onLine, career: localStorage.getItem('soccerCareerSave') };
      };
      return { preload, React, aliases, version: React.version, readStores };
    }, { entryUrl: base + owner.entryPath, alias: owner.alias }));
    row.actualNamespace = await step('read-actual-namespace', () => runtime.evaluate(value => ({ reactAliases: value.aliases, reactVersion: value.version, preloadType: typeof value.preload })));
    checkpoint('namespace-imported');
    await step('read-served-entry-bodies', () => Promise.all(pendingBodies));
    const stores = label => step(label, () => runtime.evaluate(value => value.readStores()));
    row.before = await stores('read-before-store'); checkpoint('before-store-retained');
    assert.equal(row.before.career, null, 'No saved career at actual boot');
    assert.equal(row.before.online, true, 'Actual creator must boot online before the declared offline case');
    if (id === 'offline-after-boot') await step('set-offline-after-boot', () => context.setOffline(true));
    row.stage = 'probe'; armed = id === 'automatic-held-document';
    row.observation = await step('settle-actual-helper-and-react', () => runtime.evaluate(async (runtime, missingUrl) => {
      let nativeError, nativeFulfilled = false, callbackCalls = 0, helperPromise, firstThrown, firstReturned = false;
      const events = [], describeError = error => error && ({ name: error.name, message: error.message, stack: error.stack });
      const observe = event => events.push({ event, payload: event.payload, atListener: event.defaultPrevented, cancelable: event.cancelable });
      window.addEventListener('vite:preloadError', observe);
      try {
        const lazy = runtime.React.lazy(() => {
          helperPromise = runtime.preload(() => {
            callbackCalls++;
            const actualImport = import(missingUrl);
            actualImport.then(() => { nativeFulfilled = true; }, error => { nativeError = error; });
            return actualImport;
          }, []);
          return helperPromise;
        });
        if (typeof lazy._init !== 'function' || !lazy._payload) throw new Error('Actual React lazy initializer shape is unavailable');
        try { lazy._init(lazy._payload); firstReturned = true; } catch (thrown) { firstThrown = thrown; }
        if (!firstThrown || typeof firstThrown.then !== 'function' || firstThrown !== helperPromise) throw new Error('Actual first lazy initializer must throw its real preload thenable');
        let settlement;
        await firstThrown.then(value => { settlement = { kind: 'fulfilled', valueUndefined: value === undefined, valueType: typeof value }; },
          error => { settlement = { kind: 'rejected', error: describeError(error), sameNativeError: error === nativeError }; });
        let secondReturned = false, secondThrown;
        try { lazy._init(lazy._payload); secondReturned = true; } catch (error) { secondThrown = error; }
        const storesAfterSettlement = runtime.readStores();
        const event = events[0];
        return { callbackCalls, firstReturned, firstThrownIsActualThenable: firstThrown === helperPromise,
          nativeFulfilled, nativeError: describeError(nativeError), nativeErrorIsError: nativeError instanceof Error, storesAfterSettlement,
          settlement, second: { returned: secondReturned, error: describeError(secondThrown), sameNativeError: secondThrown === nativeError,
            sameEventPayload: !!event && secondThrown === event.payload }, online: navigator.onLine,
          events: events.map(item => ({ cancelable: item.cancelable, defaultPreventedAtListener: item.atListener,
            defaultPreventedAfterSettlement: item.event.defaultPrevented, payload: describeError(item.payload),
            payloadIsError: item.payload instanceof Error, sameNativeError: item.payload === nativeError })) };
      } finally { window.removeEventListener('vite:preloadError', observe); }
    }, row.missingUrl));
    row.after = row.observation.storesAfterSettlement;
    checkpoint('probe-settlement-retained');
    if (id === 'automatic-held-document') await step('observe-held-document', () => heldDocument, 5000);
    await step('post-settlement-window', () => new Promise(resolve => setTimeout(resolve, 500)), 1000);
    row.heldAtObservation = held.map(item => ({ ...item.lifecycle }));
    row.outcome = { passed: row.observation.settlement.kind === 'rejected' && row.observation.settlement.sameNativeError === true
      && row.observation.second.sameNativeError === true && row.observation.second.sameEventPayload === true,
      cause: null };
    if (!row.outcome.passed) row.outcome.cause = CAUSE;
    retain();
  } catch (error) { row.setupFault = error?.stack || String(error); retain(); }
  finally {
    row.stage = 'cleanup';
    const cleanupDeadline = Date.now() + row.budget.cleanupMs;
    const cleanup = async (label, action) => {
      checkpoint(label, 'started');
      try {
        await within(Promise.resolve().then(action), Math.max(1, Math.min(5000, cleanupDeadline - Date.now())), id + ': ' + label + ' timed out');
        checkpoint(label); return true;
      } catch (error) { row.setupFault ||= label + ': ' + String(error); checkpoint(label, 'failed'); return false; }
    };
    for (const item of held) {
      try {
        const released = await cleanup('abort-held-document', () => item.route.abort('aborted'));
        item.lifecycle.released = released; item.lifecycle.releaseOperation = 'abort-after-raw';
      }
      finally { item.resolve(); }
    }
    if (runtime) await cleanup('dispose-old-runtime', () => runtime.dispose());
    if (context) await cleanup('close-context', () => context.close());
    retain();
  }
  return row;
}
function qualify(row, owner, base) {
  assert.equal(row.setupFault, null, row.id + ': no setup, navigation or context fault credit');
  const automatic = row.id === 'automatic-held-document', observed = row.observation, event = observed.events[0];
  assert.equal(observed.callbackCalls, 1); assert.equal(observed.firstReturned, false); assert.equal(observed.firstThrownIsActualThenable, true);
  assert.equal(observed.nativeFulfilled, false); assert.equal(observed.nativeErrorIsError, true);
  assert(observed.nativeError.message.includes(row.missingUrl), 'Native error names the exact declared owned module');
  assert.equal(observed.events.length, 1); assert.equal(event.cancelable, true); assert.equal(event.payloadIsError, true); assert.equal(event.sameNativeError, true);
  assert.deepEqual(event.payload, observed.nativeError, 'Exact native error and event payload receipt');
  const canceled = automatic && PHASE === 'baseline';
  assert.equal(event.defaultPreventedAtListener, canceled); assert.equal(event.defaultPreventedAfterSettlement, canceled);
  assert.equal(observed.online, row.id !== 'offline-after-boot'); assert.equal(observed.second.returned, false);
  assert.deepEqual(row.before.local, row.after.local, 'All local saved store bytes held');
  const expectedSession = { ...row.before.session }; if (automatic) expectedSession[STALE_KEY] = '1';
  assert.deepEqual(row.after.session, expectedSession, 'All session bytes held except the declared automatic stale marker');
  assert.equal(row.before.session[STALE_KEY], row.id === 'marker-already-spent' ? '1' : undefined);
  assert.equal(row.after.career, null); assert.equal(row.before.timeOrigin, row.after.timeOrigin); assert.equal(row.before.href, row.after.href);
  const initialRequests = row.requests.filter(request => request.stage === 'boot' && request.mainDocument);
  const initialResponses = row.responses.filter(response => response.stage === 'boot' && response.mainDocument);
  assert.equal(initialRequests.length, 1); assert.equal(initialResponses.length, 1);
  assert.equal(initialRequests[0].url, base + '/soccer-career'); assert.equal(initialRequests[0].method, 'GET');
  assert.equal(initialResponses[0].url, base + '/soccer-career'); assert.equal(initialResponses[0].status, 200);
  const reloads = row.requests.filter(request => request.stage === 'probe' && request.mainDocument);
  assert.equal(reloads.length, automatic ? 1 : 0); assert(reloads.every(request => request.url === base + '/soccer-career' && request.method === 'GET'));
  assert.equal(row.responses.filter(response => response.stage === 'probe' && response.mainDocument).length, 0, 'Held reload commits no response headers');
  assert.equal(row.heldAtObservation.length, automatic ? 1 : 0);
  assert(row.heldAtObservation.every(item => item.operation === 'held-before-response' && item.released === false));
  assert(row.lifecycle.every(item => item.released === true && item.releaseOperation === 'abort-after-raw'), 'Every held route released after physical raw retention');
  const entryLoads = row.responses.filter(response => response.url === base + owner.entryPath);
  assert.equal(entryLoads.length, 1, 'Reimport uses the already loaded real entry module');
  assert.equal(entryLoads[0].bodyError, undefined, 'Actual emitted entry body read must finish');
  assert.equal(entryLoads[0].sha256, owner.sha256); assert.equal(entryLoads[0].bytes, owner.bytes);
  assert(row.responses.every(response => new URL(response.url).origin === base && response.status < 400), 'No external response or failed owned response');
  assert.equal(row.pageErrors.length, 0, 'No uncaught app/React error allowance');
  for (const item of row.console) assert(/Failed to load resource/.test(item.text)
    && row.transport.some(transport => ['external-abort', 'owned-native-import-abort'].includes(transport.action) && transport.url === item.location.url), 'Only exact blocked-resource diagnostics');
  assert(row.requests.every(request => request.method === 'GET'), 'No write request');
  assert(row.transport.filter(item => item.action === 'request-failed' && item.stage !== 'cleanup')
    .every(item => row.transport.some(transport => ['external-abort', 'owned-native-import-abort'].includes(transport.action) && transport.url === item.url)), 'Every failed request has its exact declared block');
  if (canceled) {
    assert.equal(observed.settlement.kind, 'fulfilled'); assert.equal(observed.settlement.valueUndefined, true);
    assert.equal(observed.second.error?.name, 'TypeError'); assert(/Cannot read properties of undefined \(reading 'default'\)/.test(observed.second.error?.message || ''));
    assert.equal(row.outcome.passed, false); assert.equal(row.outcome.cause, CAUSE);
  } else {
    assert.equal(observed.settlement.kind, 'rejected'); assert.equal(observed.settlement.sameNativeError, true);
    assert.equal(observed.second.sameEventPayload, true); assert.equal(row.outcome.passed, true); assert.equal(row.outcome.cause, null);
  }
}
try {
  assert.deepEqual(sources.find(row => row.file === appReference.file).bytes, expectedApp, 'Actual phase freshBuild source must match its exact Git reference');
  appReference.held = true; write();
  const owner = emittedOwner(); report.emitted = owner; write();
  const base = await serve(); report.ownedOrigin = base;
  browser = await within(pw.chromium.launch({ headless: true }), 30000, 'Actual browser launch timed out'); report.browserVersion = browser.version();
  for (const id of IDS) await runCase(base, owner, id);
  // All four raw files exist before any phase-dependent outcome classification.
  for (const id of IDS) assert(fs.existsSync(path.join(OUT, id + '.raw.json')));
  report.raw = IDS.map(id => receipt(path.join(OUT, id + '.raw.json'))); write();
  assert.deepEqual(report.cases.map(row => row.id), IDS);
  report.setupFailures = report.cases.filter(row => row.setupFault).length;
  for (const row of report.cases) qualify(row, owner, base);
  for (const row of sources) assert.deepEqual(fs.readFileSync(path.join(ROOT, row.file)), row.bytes, 'Full source bytes held: ' + row.file);
  assert.deepEqual(list(DIST).map(receipt), distBefore, 'Every distribution file held');
  report.completed = 4; report.passed = report.cases.filter(row => row.outcome.passed).length; report.failed = 4 - report.passed;
  assert.equal(report.failed, report.expectedBooleanFaults); assert.equal(report.passed, PHASE === 'baseline' ? 3 : 4);
  report.status = 'qualified-' + PHASE; write();
} catch (error) { report.status = 'failed'; report.qualificationError = error?.stack || String(error); write(); throw error; }
finally {
  const cleanupErrors = [];
  if (browser) {
    try { await within(browser.close(), 10000, 'Final browser shutdown timed out'); }
    catch (error) { cleanupErrors.push(String(error)); }
  }
  if (server) {
    server.kill();
    try { await within(new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); }), 5000, 'Owned host did not stop'); }
    catch (error) { cleanupErrors.push(String(error)); }
  }
  if (cleanupErrors.length) {
    report.status = 'failed'; report.finalCleanupErrors = cleanupErrors; write();
    console.error(cleanupErrors.join('\n')); process.exit(1);
  }
}
console.log(`Stale import ${PHASE}: 4 actual exported-helper/React cases completed; ${report.passed} passed; ${report.failed} exact original-rejection Boolean faults; setup faults 0.`);
console.log('Controlled held-document evidence only. No natural-race, ReactDOM, visual or database completion claim.');
