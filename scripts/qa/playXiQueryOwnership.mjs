/* Remote production-route query ownership with declared fictional I/O only. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MODE = process.argv[2], OUT = process.env.XI_QUERY_OUT, BASE = process.env.XI_QUERY_BASE;
assert(['baseline', 'fixed'].includes(MODE));
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs'), 'Inherited offline preload');
assert(OUT && path.isAbsolute(OUT) && BASE && /^http:\/\/127\.0\.0\.1:\d+$/.test(BASE));
const DIST = path.resolve(process.env.XI_QUERY_DIST || path.join(ROOT, 'dist'));
const BOUT = path.join(OUT, 'browser'); assert(!fs.existsSync(BOUT)); fs.mkdirSync(BOUT);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hash = file => sha(fs.readFileSync(file));
const receipt = file => ({ file: path.relative(BOUT, file).replaceAll(path.sep, '/'), bytes: fs.statSync(file).size, sha256: hash(file) });
const save = (file, value) => { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); return receipt(file); };
const git = args => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
const inventory = root => {
  const rows = {}; const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else { assert(entry.isFile()); rows[path.relative(root, full).replaceAll(path.sep, '/')] = { bytes: fs.statSync(full).size, sha256: hash(full) }; }
  } }; walk(root); return rows;
};
const sources = () => Object.fromEntries(git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort().map(file => [file, { bytes: fs.statSync(path.join(ROOT, file)).size, sha256: hash(path.join(ROOT, file)) }]));
const BASE_REF = '775564305e9da84dab59f2b9fe246d044a3cc8e9';
const PAGE = 'src/pages/LineupBuilder.tsx', HOOK = 'src/hooks/useLineupBuilder.ts';
const proofFile = path.join(OUT, 'proof.json'), proof = JSON.parse(fs.readFileSync(proofFile, 'utf8'));
assert.equal(proof.version, 1); assert.equal(proof.mode, MODE); assert.equal(proof.status, MODE === 'baseline' ? 'diagnosed-original-only' : 'passed'); assert.equal(proof.temporaryControlsRemoved, true);
const originalPage = sha(git(['show', BASE_REF + ':' + PAGE]));
assert.equal(proof.original, originalPage); assert.equal(proof.source, hash(path.join(ROOT, PAGE)));
assert.equal(proof.source, MODE === 'baseline' ? originalPage : proof.fixed); if (MODE === 'fixed') { assert(/^[a-f0-9]{64}$/.test(proof.fixed)); assert.notEqual(proof.fixed, originalPage); }
for (const file of [HOOK, 'src/components/game/PlayerAutocomplete.tsx', 'src/components/lineup/TeamSpinner.tsx', 'src/components/lineup/FormationPitch.tsx', 'src/lib/playerSearch.ts', 'src/data/lineupTeams.ts'])
  assert.equal(hash(path.join(ROOT, file)), sha(git(['show', BASE_REF + ':' + file])), 'Held actual ' + file);
const sourceBefore = sources(), distBefore = inventory(DIST);
save(path.join(BOUT, 'source-before.json'), sourceBefore); save(path.join(BOUT, 'dist-before.json'), distBefore);
const fonts = new Map(), fontCache = process.env.FREE_KICK_FONT_CACHE;
assert(fontCache && path.isAbsolute(fontCache));
const fontManifest = fs.readFileSync(path.join(fontCache, 'manifest.json')), fontRows = JSON.parse(fontManifest);
assert.equal(fontRows.length, 9); fs.mkdirSync(path.join(BOUT, 'fonts'));
for (const row of fontRows) {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(row.url).origin));
  assert(/^[a-f0-9]{64}$/.test(row.file)); const body = fs.readFileSync(path.join(fontCache, row.file)); assert.equal(sha(body), row.sha256);
  const file = path.join(BOUT, 'fonts', row.file); fs.writeFileSync(file, body, { flag: 'wx' });
  fonts.set(row.url, { body, contentType: row.contentType, receipt: receipt(file) });
}
fs.writeFileSync(path.join(BOUT, 'fonts', 'manifest.json'), fontManifest, { flag: 'wx' });
const FIRST = 'Fixture Harbor Defender', QUERY = 'Fixture Harbor', NEW_QUERY = 'Fixture Meadow';
const PLAYERS = [
  { player_name: FIRST, name_folded: FIRST.toLowerCase(), club: 'Real Madrid', nationality: 'Brazil', position: 'Centre-Back', market_value_usd: 1400000, age: 27, year: 2026 },
  { player_name: 'Fixture Harbor Striker', name_folded: 'fixture harbor striker', club: 'Real Madrid', nationality: 'Brazil', position: 'Centre-Forward', market_value_usd: 1300000, age: 27, year: 2026 },
  { player_name: 'Fixture Meadow Striker', name_folded: 'fixture meadow striker', club: 'Real Madrid', nationality: 'Brazil', position: 'Centre-Forward', market_value_usd: 1200000, age: 27, year: 2026 },
];
const VALID = [{ primary_position: 'Centre-Back', secondary_positions: ['ST'] }];
save(path.join(BOUT, 'fictional-io.json'), { scope: 'Invented test-only players and position history; no real data read or write.', players: PLAYERS, validHistory: VALID, refusedHistory: [], cappedNames: [] });
const specs = [];
for (const outcome of ['valid', 'refused', 'timeout']) for (const text of ['changed', 'same']) specs.push({ id: 'reroll-' + outcome + '-' + text, stale: true, outcome, text });
for (const outcome of ['valid', 'refused']) specs.push({ id: 'current-' + outcome, stale: false, outcome, text: 'current' });
const report = { version: 1, mode: MODE, status: 'running', qualified: false, productQualified: false,
  head: git(['rev-parse', 'HEAD']).toString().trim(), base: BASE, sourceBase: BASE_REF, expectedFaults: MODE === 'baseline' ? 6 : 0,
  observedFaults: 0, healthy: 0, cases: [], errors: [], proof: { bytes: fs.statSync(proofFile).size, sha256: hash(proofFile) },
  fonts: fontRows.map(row => ({ ...row, bytes: fonts.get(row.url).body.length, receipt: fonts.get(row.url).receipt })),
  scope: 'Eight fresh actual built /build-your-xi Chromium journeys with declared paused Clock and fictional external I/O.',
  limits: ['Prepared Math.random=.5 is recorded and actual Real Madrid then Brazil are required, without a natural assignment claim.', 'Clock is installed before navigation and paused. Only declared runFor steps advance actual app timers. The history timeout remains4000ms.', 'Native mouse hit-tested clicks and native keyboard typing only. No synthetic UI event, React state access, game-hook mock, forced click or production handler injection.', 'Timeout requires actual AbortSignal and fetch AbortError before held-route cleanup. No outbound database call.', 'No physical phone, Safari, whole XI, scoring, live data, release or publication claim.'],
};
const flush = () => saveReport();
function saveReport() { fs.writeFileSync(path.join(BOUT, 'report.json'), JSON.stringify(report, null, 2) + '\n'); }
async function poll(read, check, label, attempts = 160) {
  for (let i = 0; i < attempts; i++) { const value = await read(); if (check(value)) return value; await new Promise(resolve => setTimeout(resolve, 25)); }
  throw new Error('Method observation deadline: ' + label);
}
function observer(origin) {
  if (location.origin !== origin) return;
  const rows = [], refs = new WeakMap(), draws = [], fetches = [];
  localStorage.setItem('lineup-rules-seen', '1'); localStorage.setItem('cookie-consent', 'essential');
  localStorage.setItem('xi-query-local', 'unchanged'); sessionStorage.setItem('xi-query-session', 'unchanged');
  Math.random = () => { draws.push({ at: performance.now(), value: .5 }); return .5; };
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const signal = init?.signal ?? (input instanceof Request ? input.signal : null);
    const row = { url: input instanceof Request ? input.url : String(input), method: init?.method ?? 'GET', started: performance.now(), status: 'pending', aborts: [] };
    fetches.push(row); signal?.addEventListener('abort', () => row.aborts.push({ at: performance.now(), aborted: signal.aborted }), { once: true });
    return nativeFetch(input, init).then(response => {
      row.status = 'response'; row.httpStatus = response.status; row.settled = performance.now();
      const nativeJSON = response.json.bind(response);
      response.json = (...args) => {
        const read = { started: performance.now(), status: 'pending' }; (row.jsonReads ??= []).push(read);
        return nativeJSON(...args).then(value => { read.status = 'fulfilled'; read.settled = performance.now(); read.value = value; return value; }, error => {
          read.status = 'rejected'; read.settled = performance.now(); read.error = { name: error.name, message: error.message }; throw error;
        });
      };
      return response;
    }, error => { row.status = 'rejected'; row.error = { name: error.name, message: error.message }; row.settled = performance.now(); throw error; });
  };
  for (const type of ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup', 'input', 'focus', 'blur']) window.addEventListener(type, event => {
    const element = event.target instanceof Element ? event.target : null;
    const row = { type, trusted: event.isTrusted, key: event.key ?? null, at: performance.now(), target: element && { tag: element.tagName, role: element.getAttribute('role'), text: element.textContent?.trim().slice(0, 160), value: element instanceof HTMLInputElement ? element.value : null } };
    refs.set(row, event); rows.push(row);
  }, true);
  Object.defineProperty(window, '__XI_QUERY_OBSERVER__', { value: { read: () => ({ events: rows.map(row => ({ ...row, defaultPrevented: refs.get(row).defaultPrevented })), draws, fetches }) } });
}
const snapshot = page => page.evaluate(() => {
  const input = document.querySelector('input[role="combobox"]');
  const keeper = [...document.querySelectorAll('button')].find(button => button.firstElementChild?.textContent.trim() === 'GK');
  const pitch = keeper?.parentElement;
  const stores = storage => Object.fromEntries(Array.from({ length: storage.length }, (_, i) => storage.key(i)).sort().map(key => [key, storage.getItem(key)]));
  return { at: performance.now(), date: Date.now(), url: location.href, scroll: [scrollX, scrollY], active: document.activeElement?.outerHTML,
    input: input && { value: input.value, disabled: input.disabled, html: input.outerHTML },
    options: [...document.querySelectorAll('[role="option"]')].map(element => element.textContent.trim()),
    filling: [...document.querySelectorAll('p')].map(element => element.textContent.trim()).find(text => text.startsWith('Filling:')) ?? null,
    spinning: [...document.querySelectorAll('p')].some(element => element.textContent.trim() === 'Spinning...'),
    rerollAvailable: [...document.querySelectorAll('button')].filter(button => button.title === 'Reroll: get a different team').length === 1,
    teamPrompt: [...document.querySelectorAll('p')].map(element => element.textContent.trim()).find(text => text.startsWith('Name a player who has played for ')) ?? null,
    errors: [...document.querySelectorAll('.text-destructive')].map(element => element.textContent.trim()).filter(Boolean),
    progress: [...document.querySelectorAll('span')].map(element => element.textContent.trim()).filter(text => /^\d+\/11$/.test(text)),
    pitch: pitch && { html: pitch.outerHTML, slots: [...pitch.querySelectorAll('button')].map(button => ({ label: button.firstElementChild?.textContent.trim(), player: button.children[1]?.textContent.trim() ?? null, disabled: button.disabled })) },
    stores: { local: stores(localStorage), session: stores(sessionStorage) }, observed: window.__XI_QUERY_OBSERVER__.read(), html: document.body.innerHTML };
});
async function pointer(page, locator, row, label) {
  assert.equal(await locator.count(), 1, 'Unique native target ' + label); await locator.scrollIntoViewIfNeeded();
  const target = await locator.evaluate(element => { const r = element.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2, hit = document.elementFromPoint(x, y); return { x, y, width: r.width, height: r.height, hit: !!hit && (hit === element || element.contains(hit)), text: element.textContent.trim() }; });
  assert(target.hit && target.width > 0 && target.height > 0, 'Actual native hit target'); row.inputs.push({ label, ...target }); await page.mouse.click(target.x, target.y);
}
async function advance(page, row, ms, label) { row.clockSteps.push({ label, ms, before: await page.evaluate(() => performance.now()) }); await page.clock.runFor(ms); row.clockSteps.at(-1).after = await page.evaluate(() => performance.now()); }
async function spinDone(page, row, expected) {
  for (let i = 0; i <= 36; i++) { const state = await snapshot(page); if (!state.spinning && state.rerollAvailable && state.teamPrompt === 'Name a player who has played for ' + expected) return state; await advance(page, row, 100, 'actual-spinner-step'); }
  throw new Error('Method spinner did not settle before history deadline');
}
const emptyPitch = state => { assert.equal(state.pitch.slots.length, 11); assert(state.pitch.slots.every(slot => !slot.player)); assert.deepEqual(state.progress, ['0/11']); };
let browser;
try {
  browser = await pw.chromium.launch({ headless: true, args: ['--no-sandbox'] }); report.chromium = browser.version();
  for (const spec of specs) {
    const dir = path.join(BOUT, spec.id); fs.mkdirSync(dir);
    const row = { ...spec, status: 'running', qualified: false, faultObserved: false, healthy: false, setupComplete: false, inputs: [], clockSteps: [], requests: [], routes: [], responses: [], failures: [], console: [], errors: [], observations: [] };
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const requestRefs = new WeakMap(), pending = []; let page, gate, release, historyReceipt, historyDone;
    const historyFinished = new Promise(resolve => { historyDone = resolve; });
    const ensureRequest = request => { if (!requestRefs.has(request)) { const index = row.requests.length; requestRefs.set(request, index); row.requests.push({ index, url: request.url(), method: request.method(), resourceType: request.resourceType(), body: request.postData() }); } return requestRefs.get(request); };
    try {
      await context.addInitScript(observer, BASE);
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url()), entry = { requestIndex: ensureRequest(request), url: request.url(), method: request.method(), action: null }; row.routes.push(entry);
        const fulfill = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: status === 204 ? '' : JSON.stringify(body), headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': request.headers()['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info,accept-profile,prefer', 'access-control-allow-methods': 'GET,OPTIONS' } });
        try {
          if (url.origin === BASE) { entry.action = 'actual-dist'; return await route.continue(); }
          if (fonts.has(url.href)) { entry.action = 'cached-font'; const font = fonts.get(url.href); return await route.fulfill({ status: 200, contentType: font.contentType, body: font.body, headers: { 'access-control-allow-origin': '*' } }); }
          if (url.hostname === 'flawuiqbvjobmkfkauhw.supabase.co' && url.pathname === '/rest/v1/player_market_values') {
            entry.action = 'fictional-search'; if (request.method() === 'OPTIONS') return await fulfill(null, 204);
            assert.equal(request.method(), 'GET'); const club = url.searchParams.get('club'), nation = url.searchParams.get('nationality');
            assert((club ?? '').includes('Real Madrid') || nation === 'eq.Brazil', 'Actual scoped club/nation search'); entry.scope = { club, nation }; entry.query = url.searchParams.get('name_folded');
            entry.fixture = PLAYERS; return await fulfill(PLAYERS);
          }
          if (url.hostname === 'flawuiqbvjobmkfkauhw.supabase.co' && url.pathname === '/rest/v1/national_team_squads') {
            entry.action = 'fictional-capped-names'; if (request.method() === 'OPTIONS') return await fulfill(null, 204);
            assert.equal(request.method(), 'GET'); assert.equal(url.searchParams.get('country'), 'eq.Brazil'); return await fulfill([]);
          }
          if (url.hostname === 'flawuiqbvjobmkfkauhw.supabase.co' && url.pathname === '/rest/v1/player_verified_positions') {
            entry.action = 'held-fictional-history'; if (request.method() === 'OPTIONS') return await fulfill(null, 204);
            assert.equal(request.method(), 'GET'); assert.equal(url.searchParams.get('player_name'), 'ilike.' + FIRST); assert.equal(url.searchParams.get('select'), 'primary_position,secondary_positions'); assert.equal(url.searchParams.get('limit'), '1'); assert(!historyReceipt, 'One history owner');
            historyReceipt = entry; entry.started = await page.evaluate(() => performance.now());
            gate = new Promise(resolve => { release = resolve; }); const action = await gate; entry.releaseAction = action; entry.released = await page.evaluate(() => performance.now());
            if (action === 'actual-abort-cleanup') { entry.action = 'actual-timeout-cleanup'; await route.abort('aborted'); }
            else { entry.fixture = spec.outcome === 'valid' ? VALID : []; await fulfill(entry.fixture); entry.fulfilled = await page.evaluate(() => performance.now()); }
            historyDone(); return;
          }
          if (url.hostname.endsWith('.supabase.co') && url.pathname !== '/rest/v1/live_scores') throw new Error('Unexpected actual API ' + url.pathname);
          entry.action = 'blocked-unrelated'; return await route.abort('blockedbyclient');
        } catch (error) { row.errors.push('Route: ' + String(error?.stack ?? error)); historyDone(); try { await route.abort('failed'); } catch {} }
      });
      await context.routeWebSocket('**/*', socket => socket.close()); page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on('request', ensureRequest); page.on('requestfailed', request => row.failures.push({ requestIndex: ensureRequest(request), url: request.url(), error: request.failure()?.errorText ?? null }));
      page.on('pageerror', error => row.errors.push('Page: ' + String(error?.stack ?? error)));
      page.on('console', message => row.console.push({ type: message.type(), text: message.text(), location: message.location() }));
      page.on('response', response => { const entry = { requestIndex: ensureRequest(response.request()), url: response.url(), status: response.status() }; const index = row.responses.length; row.responses.push(entry);
        pending.push((async () => { const body = await response.body(), gzip = zlib.gzipSync(body, { level: 9 }); const url = new URL(response.url());
          if (url.origin === BASE) { let rel = decodeURIComponent(url.pathname).replace(/^\/+/, ''); if (!distBefore[rel]) rel = distBefore[rel + '/index.html'] ? rel + '/index.html' : 'index.html'; assert(distBefore[rel] && sha(body) === distBefore[rel].sha256, 'Served emitted body'); assert.equal(response.status(), 200); entry.distFile = rel; }
          else if (fonts.has(url.href)) assert.equal(sha(body), sha(fonts.get(url.href).body), 'Actual cached font body');
          else assert(url.hostname === 'flawuiqbvjobmkfkauhw.supabase.co', 'Only declared fulfilled external API responses');
          const bodyFile = path.join(dir, 'response-' + index + '.body'), gzipFile = path.join(dir, 'response-' + index + '.gz'); fs.writeFileSync(bodyFile, body, { flag: 'wx' }); fs.writeFileSync(gzipFile, gzip, { flag: 'wx' });
          Object.assign(entry, { bodySha256: sha(body), rawBytes: body.length, gzipBytes: gzip.length, body: receipt(bodyFile), gzip: receipt(gzipFile) });
        })().catch(error => row.errors.push('Response retention: ' + String(error?.stack ?? error))));
      });
      const NOW = Date.parse('2026-10-18T16:00:00Z'); await page.clock.install({ time: new Date(NOW - 1000) }); await page.clock.pauseAt(new Date(NOW));
      await page.goto(BASE + '/build-your-xi', { waitUntil: 'domcontentloaded' });
      await pointer(page, page.getByRole('button', { name: /^4-4-2\s*11 players$/ }), row, 'actual4-4-2');
      await poll(() => snapshot(page), state => state.teamPrompt === 'Name a player who has played for Real Madrid', 'initial actual team');
      await pointer(page, page.getByRole('button', { name: 'ST', exact: true }).first(), row, 'actual first ST');
      const input = page.getByRole('combobox'); await pointer(page, input, row, 'actual input'); await page.keyboard.type(QUERY); await advance(page, row, 220, 'initial-search-debounce');
      await poll(() => page.getByRole('option').filter({ hasText: FIRST }).count(), count => count === 1, 'actual fictional first option');
      await page.evaluate(() => document.fonts.ready.then(() => null)); row.observations.push({ label: 'before-selection', state: await snapshot(page) });
      await pointer(page, page.getByRole('option').filter({ hasText: FIRST }), row, 'actual selected defender');
      await poll(() => Promise.resolve(historyReceipt), value => !!value, 'actual history request');
      const held = await poll(() => snapshot(page), state => state.input?.disabled === true, 'actual pending history UI');
      assert.equal(held.input.value, FIRST); emptyPitch(held); row.observations.push({ label: 'old-held', state: held });
      if (spec.stale) {
        await pointer(page, page.getByRole('button', { name: 'Reroll: get a different team' }), row, 'actual reroll');
        const rerolled = await spinDone(page, row, 'Brazil'); emptyPitch(rerolled); assert(historyReceipt.started + 4000 > rerolled.at, 'History still pending after actual spinner');
        await pointer(page, page.getByRole('button', { name: 'ST', exact: true }).first(), row, 'actual new ST');
        await pointer(page, input, row, 'actual replacement query'); await page.keyboard.type(spec.text === 'same' ? FIRST : NEW_QUERY); await advance(page, row, 220, 'replacement-search-debounce');
        const fresh = await poll(() => snapshot(page), state => state.input?.value === (spec.text === 'same' ? FIRST : NEW_QUERY) && !state.input.disabled && state.options.length > 0, 'actual new query and suggestions');
        const history = fresh.observed.fetches.find(item => item.url.includes('/player_verified_positions?'));
        assert(history && history.status === 'pending' && history.aborts.length === 0, 'Old request remains uncompleted before new query observation'); emptyPitch(fresh);
        row.observations.push({ label: 'new-query-before-old-result', state: fresh }); row.setupComplete = true;
        if (spec.outcome === 'timeout') {
          await advance(page, row, historyReceipt.started + 4000 - fresh.at, 'actual4000ms-history-timeout');
          const aborted = await poll(() => snapshot(page), state => state.observed.fetches.some(item => item.url.includes('/player_verified_positions?') && item.status === 'rejected' && item.error?.name === 'AbortError' && item.aborts.length === 1), 'actual fetch abort');
          const actual = aborted.observed.fetches.find(item => item.url.includes('/player_verified_positions?'));
          assert.equal(actual.aborts[0].at - actual.started, 4000); row.actualTimeout = actual;
          release('actual-abort-cleanup');
        } else release('declared-' + spec.outcome);
        await historyFinished;
        await poll(() => snapshot(page), state => {
          const actual = state.observed.fetches.find(item => item.url.includes('/player_verified_positions?'));
          return spec.outcome === 'timeout' ? actual?.status === 'rejected' && actual.error?.name === 'AbortError' : actual?.jsonReads?.length === 1 && actual.jsonReads[0].status === 'fulfilled';
        }, 'actual history JSON consumption or genuine fetch abort');
        await Promise.all(pending);
        if (spec.outcome !== 'timeout') {
          const response = row.responses.find(entry => entry.requestIndex === historyReceipt.requestIndex);
          assert(response?.body && response.status === 200, 'Retained complete actual history response body');
        }
        await advance(page, row, 32, 'post-history-render-frames');
        const after = await snapshot(page); assert(after.input && !after.input.disabled);
        emptyPitch(after); assert.deepEqual(after.pitch, fresh.pitch); assert.deepEqual(after.errors, []); assert.deepEqual(after.stores, held.stores);
        assert.equal(after.observed.fetches.filter(item => item.url.includes('/player_verified_positions?')).length, 1);
        row.observations.push({ label: 'old-settled', state: after });
        row.faultObserved = after.input.value === ''; row.healthy = after.input.value === fresh.input.value;
        assert(MODE === 'baseline' ? row.faultObserved && !row.healthy : row.healthy && !row.faultObserved, 'XI_QUERY_OWNER: stale completion must leave the new query');
        row.behavior = { before: { query: fresh.input.value, pitch: fresh.pitch, stores: fresh.stores }, after: { query: after.input.value, pitch: after.pitch, stores: after.stores } };
      } else {
        row.setupComplete = true; release('current-' + spec.outcome); await historyFinished;
        let after;
        if (spec.outcome === 'valid') {
          await poll(() => snapshot(page), state => state.pitch.slots.filter(slot => slot.player === FIRST).length === 1, 'actual current acceptance');
          await spinDone(page, row, 'Barcelona'); await pointer(page, page.getByRole('button', { name: 'ST', exact: true }).first(), row, 'actual next empty ST');
          after = await poll(() => snapshot(page), state => state.input?.value === '' && !state.input.disabled, 'fresh empty search after current acceptance');
          assert.deepEqual(after.progress, ['1/11']); assert.equal(after.pitch.slots[9].player, FIRST); assert(after.pitch.slots.every((slot, index) => index === 9 || !slot.player));
        } else {
          after = await poll(() => snapshot(page), state => state.input?.value === '' && !state.input.disabled && state.errors.length > 0, 'current refusal clears its own query'); emptyPitch(after);
        }
        assert.deepEqual(after.stores, held.stores); row.observations.push({ label: 'current-settled', state: after }); row.healthy = true;
        row.behavior = { outcome: spec.outcome, query: after.input.value, filling: after.filling, progress: after.progress, pitch: after.pitch, errors: after.errors, stores: after.stores };
      }
      assert(row.observations.at(-1).state.observed.draws.every(draw => draw.value === .5));
      assert(!row.routes.some(entry => entry.url.includes('/functions/v1/')), 'No model/evaluation/completion request');
      const imageFile = path.join(dir, 'settled.png'); await input.scrollIntoViewIfNeeded(); await page.screenshot({ path: imageFile, fullPage: false }); row.screenshot = receipt(imageFile);
      await Promise.all(pending); assert.deepEqual(row.errors, []);
      for (const failure of row.failures) { const route = row.routes.find(entry => entry.requestIndex === failure.requestIndex); assert(route && (route.action === 'blocked-unrelated' || spec.outcome === 'timeout' && route === historyReceipt && row.actualTimeout), 'Only declared failed request'); }
      for (const message of row.console.filter(item => item.type === 'error')) assert(row.failures.some(failure => failure.url === message.location.url) && /^Failed to load resource:/.test(message.text), 'Only declared resource failure console');
      row.status = 'passed'; row.qualified = true;
    } catch (error) { row.status = 'failed'; row.errors.push(String(error?.stack ?? error)); if (page && !page.isClosed()) try { row.failureObservation = await snapshot(page); } catch (captureError) { row.errors.push('Failure observation: ' + captureError); } }
    finally {
      if (release && !historyReceipt?.releaseAction) release('failure-cleanup');
      if (context) try { await context.close(); } catch (error) { row.status = 'failed'; row.qualified = false; row.errors.push('Context cleanup: ' + error); }
      await Promise.allSettled(pending); if (row.errors.length) { row.status = 'failed'; row.qualified = false; }
      const file = path.join(dir, 'raw.json'); row.fictionalIO = receipt(path.join(BOUT, 'fictional-io.json')); fs.writeFileSync(file, JSON.stringify(row, null, 2) + '\n', { flag: 'wx' });
      report.cases.push({ ...spec, status: row.status, qualified: row.qualified, setupComplete: row.setupComplete, faultObserved: row.faultObserved, healthy: row.healthy, raw: receipt(file) }); flush();
    }
  }
  report.observedFaults = report.cases.filter(row => row.faultObserved).length; report.healthy = report.cases.filter(row => row.healthy).length;
  assert.equal(report.cases.length, 8); assert(report.cases.every(row => row.status === 'passed' && row.qualified));
  assert.equal(report.observedFaults, MODE === 'baseline' ? 6 : 0); assert.equal(report.healthy, MODE === 'baseline' ? 2 : 8); report.status = 'passed'; report.qualified = true;
} catch (error) { report.status = 'failed'; report.errors.push(String(error?.stack ?? error)); }
finally {
  if (browser) try { await browser.close(); } catch (error) { report.status = 'failed'; report.qualified = false; report.errors.push('Browser cleanup: ' + error); }
  const sourceAfter = sources(), distAfter = inventory(DIST); save(path.join(BOUT, 'source-after.json'), sourceAfter); save(path.join(BOUT, 'dist-after.json'), distAfter);
  report.sourceHeld = JSON.stringify(sourceBefore) === JSON.stringify(sourceAfter); report.distHeld = JSON.stringify(distBefore) === JSON.stringify(distAfter);
  report.fontsHeld = fontManifest.equals(fs.readFileSync(path.join(fontCache, 'manifest.json'))) && fontRows.every(row => hash(path.join(fontCache, row.file)) === row.sha256);
  if (!report.sourceHeld || !report.distHeld || !report.fontsHeld || report.status !== 'passed') { report.status = 'failed'; report.qualified = false; } flush();
}
console.log('XI query ownership: ' + report.status + ', ' + report.observedFaults + ' original faults and ' + report.healthy + ' healthy in8 native production-route cases.');
if (!report.qualified) process.exitCode = 1;
