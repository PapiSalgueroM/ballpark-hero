/* Read-only tracing around the unchanged lazy-build browser method.
 * This arm adds listeners and a diagnostic binding, so its timing is perturbed.
 * The separate direct invocation is the unchanged-method observation.
 */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only.');
assert(process.env.SOCCER_BUILD_PHASE === 'fixed', 'Trace only the existing fixed arm.');
assert(process.env.SOCCER_ROUTINE_OUT && path.isAbsolute(process.env.SOCCER_ROUTINE_OUT), 'Require an absolute distinct traced output root.');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(process.env.SOCCER_ROUTINE_OUT, 'trace');
const BASE = 'e7f111b7de73153efdc7e343282d65eeae9289fc';
const METHOD = 'scripts/playSoccerCareerBuildLazy.mjs', methodFile = path.join(ROOT, METHOD);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const methodBefore = fs.readFileSync(methodFile);
assert(methodBefore.equals(execFileSync('git', ['show', BASE + ':' + METHOD], { cwd: ROOT })), 'The entire original method must equal the candidate source.');
fs.mkdirSync(OUT, { recursive: true });
const EVENTS = path.join(OUT, 'events.jsonl'), SUMMARY = path.join(OUT, 'summary.json');
assert(!fs.existsSync(EVENTS) && !fs.existsSync(SUMMARY), 'Refuse to replace trace evidence.');
fs.writeFileSync(EVENTS, '');
let ordinal = 0, contextCount = 0, pageCount = 0, launchCount = 0, requestCount = 0;
const counts = {}, pageIds = new WeakMap(), documents = new Map(), requests = new WeakMap();
const pageId = page => { if (!pageIds.has(page)) pageIds.set(page, ++pageCount); return pageIds.get(page); };
function emit(kind, data = {}) {
  counts[kind] = (counts[kind] ?? 0) + 1;
  fs.appendFileSync(EVENTS, JSON.stringify({ ordinal: ++ordinal, nodeTime: new Date().toISOString(), nodeTick: String(process.hrtime.bigint()), kind, ...data }) + '\n');
}
const owned = url => { try { const value = new URL(url); return value.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(value.hostname); } catch { return false; } };
const launch = pw.chromium.launch;
pw.chromium.launch = async function (...args) {
  launchCount++; const browser = await launch.apply(this, args);
  emit('browser', { version: await browser.version(), launchCount });
  const newContext = browser.newContext;
  browser.newContext = async function (...options) {
    const context = await newContext.apply(this, options), contextId = ++contextCount;
    emit('context', { context: contextId, options: options[0] ?? {} });
    await context.exposeBinding('__bhBuildLazyTrace', (source, event) => {
      const id = pageId(source.page), mainFrame = source.frame === source.page.mainFrame();
      if (mainFrame && event.kind === 'document-start') documents.set(id, event.timeOrigin);
      emit('page-observation', { context: contextId, page: id, document: event.timeOrigin, mainFrame, frameUrlAtDelivery: source.frame.url(), observation: event });
    });
    await context.addInitScript(() => {
      let preloadOrdinal = 0;
      const send = (kind, data = {}) => {
        void window.__bhBuildLazyTrace({ kind, url: location.href, timeOrigin: performance.timeOrigin, pageTime: performance.now(), ...data }).catch(() => undefined);
      };
      send('document-start');
      window.addEventListener('vite:preloadError', event => {
        const payload = event.payload, preload = ++preloadOrdinal;
        const error = { name: payload?.name ?? null, message: payload?.message ?? String(payload), stack: payload?.stack ?? null };
        send('preload-dispatch', { preload, defaultPrevented: event.defaultPrevented, error });
        queueMicrotask(() => send('preload-after-listeners', { preload, defaultPrevented: event.defaultPrevented, error }));
      }, true);
      document.addEventListener('click', event => {
        const label = event.target.closest?.('button')?.innerText?.trim() ?? '';
        if (/Customize your build|Generate Starting Potential|Close it|Retry/.test(label)) send('action', { label });
      }, true);
    });
    context.on('page', page => {
      const id = pageId(page), fields = () => ({ context: contextId, page: id, lastObservedMainDocument: documents.get(id) ?? null });
      page.on('request', request => { if (owned(request.url())) {
        const record = { ...fields(), request: ++requestCount, url: request.url(), method: request.method(), navigation: request.isNavigationRequest(),
          mainFrame: request.frame() === page.mainFrame(), resourceType: request.resourceType() };
        requests.set(request, record); emit('owned-request', record);
      } });
      const requestFields = request => { const record = requests.get(request); return { request: record?.request ?? null, requestObservedMainDocument: record?.lastObservedMainDocument ?? null }; };
      page.on('response', response => { if (owned(response.url())) emit('owned-response', { ...fields(), ...requestFields(response.request()), url: response.url(), status: response.status() }); });
      page.on('requestfailed', request => { if (owned(request.url())) emit('owned-request-failed', { ...fields(), ...requestFields(request), url: request.url(), failure: request.failure() }); });
      page.on('pageerror', error => emit('pageerror', { ...fields(), url: page.url(), name: error.name, message: error.message, stack: error.stack }));
      page.on('console', message => { if (['error', 'warning'].includes(message.type())) emit('console', { ...fields(), type: message.type(), text: message.text(), location: message.location() }); });
      page.on('domcontentloaded', () => emit('domcontentloaded', { ...fields(), url: page.url() }));
      page.on('framenavigated', frame => { if (frame === page.mainFrame()) emit('frame-navigation-diagnostic', { ...fields(), url: frame.url() }); });
      page.on('close', () => emit('page-close', fields()));
    });
    return context;
  };
  return browser;
};
let error = null;
try {
  emit('trace-start', { sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    baseApp: BASE, method: METHOD, methodSha256: sha(methodBefore), timingPerturbed: true });
  await import(pathToFileURL(methodFile).href);
} catch (caught) {
  error = String(caught?.stack ?? caught); process.exitCode = 1; emit('wrapper-error', { error });
} finally {
  pw.chromium.launch = launch;
  const sourceHeld = fs.readFileSync(methodFile).equals(methodBefore), methodExit = Number(process.exitCode ?? 0);
  const events = fs.readFileSync(EVENTS, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  const preloads = events.filter(row => row.kind === 'page-observation' && row.mainFrame && row.observation.kind.startsWith('preload-'));
  const preloadKey = row => [row.context, row.page, row.document, row.observation.preload].join(':');
  const dispatches = preloads.filter(row => row.observation.kind === 'preload-dispatch'), afterListeners = preloads.filter(row => row.observation.kind === 'preload-after-listeners');
  const completePairs = dispatches.length > 0 && dispatches.every(row => afterListeners.some(after => preloadKey(after) === preloadKey(row)));
  const observed = launchCount === 1 && contextCount === 5 && completePairs;
  const summary = { timingPerturbed: true, oldMethodExit: methodExit, wrapperError: error, sourceHeld, observed,
    launchCount, contextCount, pageCount, events: ordinal, counts, preloadObservations: preloads, completePreloadPairs: completePairs,
    eventFile: { file: 'events.jsonl', bytes: fs.statSync(EVENTS).size, sha256: sha(fs.readFileSync(EVENTS)) },
    limits: ['Listeners and a diagnostic binding can change timing; the separate direct run is the unchanged-method observation.',
      'This wrapper neither routes nor fulfills requests and changes no context options, app code, error oracle, clock, RNG, save, reload marker or callback.',
      'Frame events are diagnostic only. Page timeOrigin identifies document generations; owned navigation requests and DOMContentLoaded are retained separately.',
      'Node events label the last observed main document at callback time. A navigation request can precede the next document binding; responses retain request identity and its original observed association.',
      'Binding delivery can be lost during document unload. Missing observations do not establish that an event did not happen.'] };
  fs.writeFileSync(SUMMARY, JSON.stringify(summary, null, 2) + '\n');
  if (!sourceHeld || !observed || error) process.exitCode = 1;
  console.log('Lazy recovery trace: ' + JSON.stringify({ oldMethodExit: methodExit, sourceHeld, observed, contexts: contextCount, events: ordinal, preloadObservations: preloads.length, timingPerturbed: true }));
}
