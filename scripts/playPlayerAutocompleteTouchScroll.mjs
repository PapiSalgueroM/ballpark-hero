/* Actual shared autocomplete touch scrolling on built routes, remote offline CI only.
 * Fictional transport rows isolate gestures, not real football facts or validator accuracy.
 * Native CDP touch inputs, browser event receipts and actual route outcomes are separate.
 * Baseline credits three premature native starts only; fixed must scroll then tap once.
 * The copied source control removes only the touch/pen pointerdown guard and builds a side app.
 */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Touch proof execution requires remote offline CI.');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHASE = process.env.AUTOCOMPLETE_TOUCH_PHASE;
const CONTROL = process.env.AUTOCOMPLETE_TOUCH_CONTROL || '';
assert(['baseline', 'fixed'].includes(PHASE), 'AUTOCOMPLETE_TOUCH_PHASE must be baseline or fixed.');
assert(!CONTROL || (PHASE === 'fixed' && CONTROL === 'premature-pointerdown'), 'Unknown or misplaced touch control.');
assert(process.env.AUTOCOMPLETE_TOUCH_OUT && path.isAbsolute(process.env.AUTOCOMPLETE_TOUCH_OUT), 'AUTOCOMPLETE_TOUCH_OUT must be absolute.');
const OUT = path.join(process.env.AUTOCOMPLETE_TOUCH_OUT, CONTROL || PHASE);
const REPORT = path.join(OUT, 'report.json');
const require = createRequire(import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = file => { const bytes = fs.readFileSync(file); return sha(bytes); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const slash = name => name.replaceAll('\\', '/');
fs.mkdirSync(OUT, { recursive: true });
assert(!fs.existsSync(REPORT), 'Refuse to overwrite a prior touch report.');
const report = { status: 'running', phase: PHASE, control: CONTROL || null,
  sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  checks: 0, failures: 0, setupFailures: 0, prematureSelections: 0, cases: [], controls: [], inventory: [], issues: [],
  sourceHeld: false, installedHeld: false, toolsHeld: false, fontsHeld: false, fixturesHeld: false, distHeld: false,
  limits: ['Chromium touch emulation uses native CDP contacts at 320/384/390, not a physical Android device or soft keyboard.',
    'Search and validator replies are explicitly fictional fixtures. No real-person metadata or backend verdict is credited.',
    'The actual XI page has no lineup save. Its visible slot and actual validator-client input are the outcome.',
    'Missing XI uses its original committed puzzle and daily writer; a fictional wrong guess tests the separate Lock action.',
    'Mouse, ArrowEnter, query identity and focus are selected paths. Shared use across 22 routes is source audit, not 22 played routes.',
    'Only a control copy is changed. The original source, normal build and package inputs must stay byte-identical.',
    'Selected settled original captures are not a blanket visual or live-site acceptance claim.'] };
const write = () => fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
function check(ok, message, row) {
  report.checks++; if (row) row.checks++;
  if (!ok) { report.failures++; report.issues.push(message); if (row) row.issues.push(message); }
  return !!ok;
}
function setup(ok, message) { report.checks++; if (!ok) { report.setupFailures++; throw new Error(message); } }
function files(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full, base) : [{ file: slash(path.relative(base, full)), bytes: fs.statSync(full).size, sha256: hash(full) }];
  }).sort((a, b) => a.file.localeCompare(b.file));
}
const PHONES = [{ width: 320, height: 568 }, { width: 384, height: 755 }, { width: 390, height: 844 }];
const DESKTOP = { width: 1280, height: 800 };
const QUERY = 'qzxlucas';
const ROWS = Array.from({ length: 12 }, (_, index) => ({ player_name: `Qzxlucas Fixture ${String.fromCharCode(65 + index)}`,
  name_folded: `qzxlucas fixture ${String.fromCharCode(97 + index)}`, market_value_usd: 12000000 - index * 100000,
  year: 2026, club: 'Gesture Fixture Rovers', nationality: 'Fixtureland', position: 'Centre-Back', age: 27 }));
const FIXTURE = path.join(OUT, 'network-fixtures.json');
const COMPONENT = 'src/components/game/PlayerAutocomplete.tsx';
const GUARD = "                  if (e.pointerType === 'touch' || e.pointerType === 'pen') return;\n";
const SOURCE_FILES = [COMPONENT, 'src/lib/playerSearch.ts', 'src/lib/nameFold.ts', 'src/lib/validatorClient.ts',
  'src/lib/missingXi.ts', 'src/hooks/useDailyPuzzle.ts', 'src/hooks/useLineupBuilder.ts', 'src/types/lineupBuilder.ts',
  'src/pages/LineupBuilder.tsx', 'src/pages/MissingXi.tsx', 'src/components/lineup/FormationPitch.tsx',
  'src/data/lineupTeams.ts', 'src/lib/dateUtils.ts', 'src/lib/safeStorage.ts', 'src/integrations/supabase/client.ts',
  'src/test/playerAutocompleteInteraction.test.tsx', 'src/test/playerAutocompleteStale.test.tsx',
  'scripts/simPlayerAutocompleteInteraction.mjs', 'scripts/playAutocompleteRace.mjs', 'scripts/playLineupValidator.mjs',
  'src/test/playerAutocompleteTouchScroll.test.tsx', 'scripts/simPlayerAutocompleteTouchScroll.mjs',
  'scripts/playPlayerAutocompleteTouchScroll.mjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs',
  'scripts/lib/offlineTransport.cjs', 'vite.config.ts', 'package.json', 'package-lock.json', 'bun.lock', 'index.html',
  '.github/workflows/player-autocomplete-touch-scroll.yml'];
let sourceBefore = [], installedBefore = [], toolsBefore = [], normalDistBefore = [], walkedDistBefore = [];
let fontBefore, fixtureBefore, cache, fonts, server, browser, normalDist, walkedDist;
const pendingAssets = [], loadedAssets = new Map();
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': '*' };
const SUPA_HOST = new URL(fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8').match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/)[1]).host;

function sideBuild() {
  const original = fs.readFileSync(path.join(ROOT, COMPONENT), 'utf8').replaceAll('\r\n', '\n');
  setup(original.split(GUARD).length === 2, 'The copied pointerdown control must remove one actual early-return guard.');
  const changed = original.replace(GUARD, '');
  setup(changed !== original, 'The actual copied pointerdown control must change source bytes.');
  const folder = path.join(OUT, 'source-control'); fs.mkdirSync(folder, { recursive: true });
  const copy = path.join(folder, 'PlayerAutocomplete.tsx'); fs.writeFileSync(copy, changed);
  fs.writeFileSync(path.join(folder, 'PlayerAutocomplete.before.tsx'), original);
  const outDir = path.join(folder, 'dist'), configFile = path.join(folder, 'touch.vite.config.ts');
  const config = `import base from ${JSON.stringify(slash(path.join(ROOT, 'vite.config.ts')))};
export default env => {
  const cfg = typeof base === 'function' ? base({ ...env, mode: 'production', command: 'build' }) : base;
  return { ...cfg, root: ${JSON.stringify(slash(ROOT))},
    resolve: { ...cfg.resolve, alias: [
      { find: '@/components/game/PlayerAutocomplete', replacement: ${JSON.stringify(slash(copy))} },
      { find: '@', replacement: ${JSON.stringify(slash(path.join(ROOT, 'src')))} } ] },
    build: { ...(cfg.build || {}), outDir: ${JSON.stringify(slash(outDir))}, emptyOutDir: true } };
};
`;
  fs.writeFileSync(configFile, config);
  report.sourceControl = { kind: CONTROL, original: { file: 'source-control/PlayerAutocomplete.before.tsx', sha256: hash(path.join(folder, 'PlayerAutocomplete.before.tsx')) },
    changed: { file: 'source-control/PlayerAutocomplete.tsx', sha256: hash(copy) }, anchor: GUARD, replacement: '', occurrences: 1,
    config: { file: 'source-control/touch.vite.config.ts', sha256: hash(configFile) }, build: null };
  write();
  const run = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'build', '--config', configFile],
    { cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: 300000, maxBuffer: 32 * 1024 * 1024 });
  fs.writeFileSync(path.join(folder, 'build.stdout.log'), run.stdout || ''); fs.writeFileSync(path.join(folder, 'build.stderr.log'), run.stderr || '');
  report.sourceControl.build = { exitCode: run.status, signal: run.signal, error: run.error ? String(run.error) : null, dist: 'source-control/dist' }; write();
  setup(run.status === 0 && !run.signal && !run.error && fs.existsSync(path.join(outDir, 'index.html')), 'Copied source-control build failed; it receives no gesture credit.');
  return outDir;
}
async function serve(directory) {
  const port = await new Promise((resolve, reject) => {
    const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port; probe.close(error => error ? reject(error) : resolve(port)); });
  });
  server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), directory, String(port)],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  await new Promise((resolve, reject) => {
    let output = ''; const timer = setTimeout(() => reject(new Error(`Host startup failed: ${output}`)), 15000);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Host exited ${code}: ${output}`)); });
    server.stdout.on('data', bytes => { output += bytes; if (output.includes('host-like server:')) { clearTimeout(timer); resolve(); } });
    server.stderr.on('data', bytes => { output += bytes; });
  });
  return `http://127.0.0.1:${port}`;
}
async function poll(fn, predicate, label) {
  const until = Date.now() + 20000; let result;
  do { result = await fn(); if (predicate(result)) return result; await new Promise(resolve => setTimeout(resolve, 40)); } while (Date.now() < until);
  throw new Error(`${label}: ${JSON.stringify(result)}`);
}
function newRow(id, route, profile) {
  return { id, route, viewport: profile, checks: 0, issues: [], errors: [], assetErrors: [], transport: [], diagnostics: [],
    inputs: [], stages: [], layouts: [], shots: [], validatorRequests: [], premature: false };
}
async function open(base, profile, row) {
  const context = await browser.newContext({ viewport: profile, isMobile: profile.width < 1000, hasTouch: profile.width < 1000,
    colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  const aborted = new Set(), stub = { hold: false, waiting: [], searches: [] };
  const release = () => { stub.hold = false; for (const resolve of stub.waiting.splice(0)) resolve(); };
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    if (url.origin === base) {
      if (!['GET', 'HEAD'].includes(method)) { row.assetErrors.push(`Owned write ${method} ${request.url()}`); return route.abort('blockedbyclient'); }
      return route.continue();
    }
    if (method === 'GET' && fonts.has(url.href)) {
      row.transport.push({ url: request.url(), method, action: 'retained-font' }); return route.fulfill({ status: 200, ...fonts.get(url.href) });
    }
    if (url.host === SUPA_HOST && url.pathname === '/functions/v1/validate-player' && method === 'OPTIONS') {
      row.transport.push({ url: request.url(), method, action: 'fixture-preflight' }); return route.fulfill({ status: 204, headers: CORS, body: '' });
    }
    if (url.host === SUPA_HOST && url.pathname === '/functions/v1/validate-player' && method === 'POST') {
      const body = request.postDataJSON(); row.validatorRequests.push({ url: request.url(), method, body, ordinal: row.validatorRequests.length + 1 });
      row.transport.push({ url: request.url(), method, action: 'fictional-validator-fixture', body });
      if (stub.hold) await new Promise(resolve => stub.waiting.push(resolve));
      return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: '{"valid":true}' });
    }
    const tables = ['/rest/v1/player_market_values', '/rest/v1/national_team_squads', '/rest/v1/player_verified_positions'];
    if (url.host === SUPA_HOST && tables.includes(url.pathname) && ['GET', 'OPTIONS'].includes(method)) {
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });
      const rows = url.pathname.endsWith('/player_market_values') ? ROWS : [];
      const receipt = { url: request.url(), method, action: 'fictional-read-fixture', rows: rows.length, bodySha256: sha(JSON.stringify(rows)) };
      row.transport.push(receipt); if (rows.length) stub.searches.push(receipt);
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { ...CORS, 'content-range': rows.length ? '0-11/12' : '*/0' }, body: JSON.stringify(rows) });
    }
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) row.assetErrors.push(`Uncached declared font ${request.url()}`);
    aborted.add(request.url()); row.transport.push({ url: request.url(), method, action: 'abort' }); return route.abort('blockedbyclient');
  });
  await context.routeWebSocket('**/*', socket => { row.transport.push({ url: socket.url(), action: 'websocket-close' }); socket.close(); });
  page.on('pageerror', error => row.errors.push(String(error)));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const url = message.location().url, text = message.text();
    if (/Failed to load resource.*(?:ERR_FAILED|ERR_BLOCKED_BY_CLIENT)/.test(text) && aborted.has(url)) row.diagnostics.push({ url, text, action: 'owned-abort' });
    else row.errors.push(`${url}: ${text}`);
  });
  page.on('requestfailed', request => { if (new URL(request.url()).origin === base) row.assetErrors.push(`Owned request failed ${request.url()}: ${request.failure()?.errorText}`); });
  page.on('response', response => {
    if (new URL(response.url()).origin !== base) return;
    if (response.status() >= 400) row.assetErrors.push(`Owned response ${response.status()} ${response.url()}`);
    if (!/javascript|text\/css|text\/html/.test(response.headers()['content-type'] || '')) return;
    pendingAssets.push((async () => {
      const bytes = await response.body(), pathname = new URL(response.url()).pathname;
      const file = 'loaded-assets/' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname).replace(/^\//, '');
      const existing = loadedAssets.get(file); setup(!existing || existing.sha256 === sha(bytes), 'Owned compiled asset body changed: ' + pathname);
      if (!existing) { const target = path.join(OUT, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes);
        loadedAssets.set(file, { file, urlPath: pathname, bytes: bytes.length, sha256: sha(bytes) }); }
    })().catch(error => row.assetErrors.push(String(error))));
  });
  await page.addInitScript(() => {
    const OldDate = Date, now = Date.parse('2026-10-13T16:00:00Z');
    window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('dukb-theme', 'dark');
    localStorage.setItem('lineup-rules-seen', '1'); localStorage.setItem(`rules-gate-seen:${location.pathname}`, '1');
    window.__AUTOCOMPLETE_TOUCH_EVENTS__ = [];
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'click', 'scroll']) {
      document.addEventListener(type, event => {
        const option = event.target instanceof Element ? event.target.closest('[role="option"]') : null;
        window.__AUTOCOMPLETE_TOUCH_EVENTS__.push({ ordinal: window.__AUTOCOMPLETE_TOUCH_EVENTS__.length + 1, type,
          trusted: event.isTrusted, pointerType: event.pointerType ?? null, pointerId: event.pointerId ?? null,
          x: event.clientX ?? event.touches?.[0]?.clientX ?? null, y: event.clientY ?? event.touches?.[0]?.clientY ?? null,
          option: option?.querySelector('span.text-sm.font-medium')?.textContent ?? null,
          target: event.target instanceof Element ? event.target.tagName : null,
          scrollTop: document.querySelector('[role="listbox"]')?.scrollTop ?? null });
      }, { capture: true, passive: true });
    }
  });
  await page.goto(base + row.route, { waitUntil: 'domcontentloaded' });
  if (row.route === '/build-your-xi') {
    await page.getByRole('button', { name: /^4-3-3/ }).first().click();
    await page.getByText('Select a position on the pitch').waitFor();
    await page.locator('button:not([disabled])').filter({ hasText: /^CB$/ }).first().click();
  }
  await page.getByRole('combobox').waitFor(); await page.evaluate(() => document.fonts.ready);
  return { context, page, stub, release, cdp: await context.newCDPSession(page), row };
}
async function snapshot(walk) {
  const dom = await walk.page.evaluate(() => {
    const input = document.querySelector('[role="combobox"]'), list = document.querySelector('[role="listbox"]');
    const options = [...document.querySelectorAll('[role="option"]')].map(option => {
      const rect = option.getBoundingClientRect(); return { name: option.querySelector('span.text-sm.font-medium')?.textContent ?? null,
        text: option.textContent, disabled: option.disabled, selected: option.getAttribute('aria-selected'), rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
    });
    const rect = list?.getBoundingClientRect();
    const key = [...Array(localStorage.length)].map((_, index) => localStorage.key(index)).find(key => key.startsWith('missing-xi-daily-'));
    return { input: input ? { value: input.value, disabled: input.disabled, expanded: input.getAttribute('aria-expanded') } : null,
      focus: { role: document.activeElement?.getAttribute('role'), tag: document.activeElement?.tagName }, options,
      list: list ? { scrollTop: list.scrollTop, scrollHeight: list.scrollHeight, clientHeight: list.clientHeight,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } } : null,
      filled: [...document.querySelectorAll('button:disabled span')].map(span => span.textContent).filter(text => text?.startsWith('Qzxlucas Fixture ')),
      progress: [...document.querySelectorAll('span')].find(span => /^(?:0|1)\/11$/.test(span.textContent?.trim() || ''))?.textContent?.trim() ?? null,
      missing: { key: key ?? null, raw: key ? localStorage.getItem(key) : null, guessLabel: [...document.querySelectorAll('p,span')].find(e => /^Guess [1-3] of 3$/.test(e.textContent?.trim() || ''))?.textContent?.trim() ?? null },
      events: window.__AUTOCOMPLETE_TOUCH_EVENTS__, pageText: document.body.innerText };
  });
  return { ...dom, validatorRequests: structuredClone(walk.row.validatorRequests) };
}
async function stage(walk, row, name) { const value = await snapshot(walk); row.stages.push({ stage: name, ...value }); return value; }
async function settle(page) { await page.evaluate(async () => { await document.fonts.ready; for (let n = 0; n < 4; n++) await new Promise(resolve => requestAnimationFrame(resolve)); }); }
async function search(walk, row, priorInputs = 0) {
  const input = walk.page.getByRole('combobox'); await input.fill(QUERY);
  await walk.page.getByRole('option').nth(7).waitFor(); await settle(walk.page);
  await input.evaluate(element => window.scrollTo({ top: scrollY + element.getBoundingClientRect().top - 80, behavior: 'instant' }));
  const before = await stage(walk, row, 'settled-tall-query');
  setup(before.input?.value === QUERY && before.options.length === 8 && before.options.every((option, index) => option.name === ROWS[index].player_name), row.id + ': canonical queried fixture options did not settle.');
  setup(before.list.scrollHeight > before.list.clientHeight + 80 && before.list.clientHeight >= 200, row.id + ': the dropdown is not genuinely scrollable.');
  setup(walk.stub.searches.length >= 2 && before.validatorRequests.length === priorInputs && before.progress === '0/11', row.id + ': both real search legs must settle before any new submission.');
  return before;
}
async function option(walk, name) {
  const target = walk.page.getByRole('option').filter({ has: walk.page.getByText(name, { exact: true }) });
  setup(await target.count() === 1 && (await target.locator('span.text-sm.font-medium').innerText()) === name, 'Exact full-name option identity is not unique: ' + name);
  return target;
}
async function contact(walk, row, type, point) {
  const input = { type, touchPoints: point ? [{ x: point.x, y: point.y, id: 7, radiusX: 3, radiusY: 3, force: 0.7 }] : [] };
  row.inputs.push(structuredClone(input)); await walk.cdp.send('Input.dispatchTouchEvent', input);
}
async function begin(walk, row) {
  const point = await walk.page.getByRole('listbox').evaluate(element => {
    const rect = element.getBoundingClientRect(), x = rect.x + rect.width / 2, y = rect.bottom - 26;
    const hit = document.elementFromPoint(x, y)?.closest('[role="option"]');
    return { x, y, endY: rect.top + 16, name: hit?.querySelector('span.text-sm.font-medium')?.textContent ?? null };
  });
  setup(point.name && point.y < row.viewport.height && point.endY >= 0, row.id + ': native contact does not hit an owned visible option.');
  await contact(walk, row, 'touchStart', point); await settle(walk.page); return point;
}
async function dragEnd(walk, row, point) {
  for (let step = 1; step <= 16; step++) {
    await contact(walk, row, 'touchMove', { x: point.x, y: point.y + (point.endY - point.y) * step / 16 });
    await walk.page.waitForTimeout(16);
  }
  await contact(walk, row, 'touchEnd'); await settle(walk.page);
}
async function capture(walk, row, label, target) {
  await settle(walk.page); await target.scrollIntoViewIfNeeded();
  const geometry = await target.evaluate(async element => {
    let previous = '', stable = 0, observation;
    for (let frame = 0; frame < 120; frame++) {
      await new Promise(resolve => requestAnimationFrame(resolve)); const r = element.getBoundingClientRect(), style = getComputedStyle(element);
      const top = Math.max(0, r.top), bottom = Math.min(innerHeight, r.bottom);
      const hit = document.elementFromPoint(Math.max(1, Math.min(innerWidth - 1, r.x + r.width / 2)), (top + bottom) / 2);
      observation = { x: r.x, y: r.y, width: r.width, height: r.height, opacity: Number(style.opacity),
        finite: element.getAnimations({ subtree: true }).filter(a => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity).length,
        painted: r.width > 0 && bottom > top && !!hit && element.contains(hit), overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      const current = JSON.stringify(observation); stable = current === previous ? stable + 1 : 1; previous = current;
      if (stable >= 4 && observation.opacity >= 0.99 && observation.finite === 0 && observation.painted && !observation.overflow) return { ...observation, stable };
    }
    return { ...observation, stable };
  });
  check(geometry.stable >= 4 && geometry.opacity >= 0.99 && geometry.finite === 0 && geometry.painted && !geometry.overflow, row.id + ': capture did not settle: ' + label, row);
  row.layouts.push({ stage: label, ...geometry }); const file = `${row.id}-${label}.png`, full = path.join(OUT, file);
  setup(!fs.existsSync(full), 'Refuse to overwrite original ' + file); await walk.page.screenshot({ path: full });
  report.inventory.push({ file, bytes: fs.statSync(full).size, sha256: hash(full), original: true }); row.shots.push(file);
}
async function accepted(walk, row, name, label, priorInputs = 0) {
  const result = await poll(() => snapshot(walk), value => value.progress === '1/11' && value.filled.length === 1, row.id + ': actual XI selection did not fill its one slot.');
  row.stages.push({ stage: label, ...result });
  check(same(result.filled, [name]) && row.validatorRequests.length === priorInputs + 1 && row.validatorRequests.at(-1).body.playerName === name,
    row.id + ': one exact player must reach the actual validator-client and slot once.', row);
  check(!result.list && (!result.input || result.input.value === ''), row.id + ': selected list/input were not consumed.', row);
  return result;
}
async function phone(base, profile) {
  const row = newRow(`${profile.width}-xi-${CONTROL || PHASE}`, '/build-your-xi', profile);
  (CONTROL ? report.controls : report.cases).push(row); let walk;
  try {
    walk = await open(base, profile, row); const before = await search(walk, row);
    if (!CONTROL) await capture(walk, row, 'ready-tall-dropdown', walk.page.getByRole('listbox'));
    walk.stub.hold = true; const point = await begin(walk, row);
    if (PHASE === 'baseline' || CONTROL) await poll(() => row.validatorRequests.length, value => value === 1, row.id + ': native down did not reproduce the owned submission.');
    const down = await stage(walk, row, 'finger-down-before-move-or-end');
    check(down.events.some(e => e.type === 'pointerdown' && e.pointerType === 'touch' && e.trusted && e.option === point.name)
      && !row.inputs.some(input => ['touchMove', 'touchEnd'].includes(input.type)), row.id + ': down observation needs a trusted native option contact before movement or release.', row);
    if (PHASE === 'baseline' || CONTROL) {
      row.premature = down.validatorRequests.length === 1 && down.validatorRequests[0].body.playerName === point.name && down.input?.value === point.name && down.input.disabled && !down.list;
      check(row.premature, row.id + ': expected owned premature submission was not observed.', row); if (row.premature) report.prematureSelections++;
      await capture(walk, row, 'premature-submission-before-release', walk.page.getByRole('combobox').locator('..'));
      await dragEnd(walk, row, point); walk.release(); await accepted(walk, row, point.name, 'premature-outcome-after-release');
      if (!CONTROL) {
        await walk.context.close(); walk = await open(base, profile, row);
        await search(walk, row, 1); const name = ROWS[0].player_name; await (await option(walk, name)).tap();
        await accepted(walk, row, name, 'fresh-native-tap-healthy', 1);
        await capture(walk, row, 'fresh-deliberate-selection', walk.page.getByText(name, { exact: true }));
      }
    } else {
      check(down.validatorRequests.length === 0 && down.input.value === before.input.value && down.progress === '0/11' && down.filled.length === 0,
        row.id + ': touchStart must preserve query/slot and send no validator input.', row);
      await dragEnd(walk, row, point); walk.release();
      let scrolled = await poll(() => snapshot(walk), value => value.list?.scrollTop > before.list.scrollTop + 20, row.id + ': actual native drag did not scroll.');
      const bottom = () => scrolled.options[7].rect.y + scrolled.options[7].rect.height <= scrolled.list.rect.y + scrolled.list.rect.height + 1;
      if (!bottom()) { const next = await begin(walk, row); await dragEnd(walk, row, next); scrolled = await snapshot(walk); }
      row.stages.push({ stage: 'native-scrolled-without-selection', ...scrolled });
      check(scrolled.input.value === QUERY && scrolled.progress === '0/11' && scrolled.filled.length === 0 && row.validatorRequests.length === 0,
        row.id + ': dragging changed a query, slot or validator intent.', row);
      check(bottom() && scrolled.events.some(e => e.type === 'pointercancel' && e.trusted), row.id + ': browser pan cancellation and bottom-row reach must be real.', row);
      await capture(walk, row, 'native-scrolled-dropdown', walk.page.getByRole('listbox'));
      const name = ROWS[7].player_name; check(name !== point.name, row.id + ': intentional bottom selection must differ from first touched row.', row);
      const target = await option(walk, name); await target.tap(); const selected = await accepted(walk, row, name, 'bottom-native-tap-selected-once');
      check(selected.events.some(e => e.type === 'click' && e.trusted && e.option === name), row.id + ': fixed selection needs a real native completed tap click.', row);
      await capture(walk, row, 'deliberate-bottom-selection', walk.page.getByText(name, { exact: true }));
    }
  } catch (error) { report.setupFailures++; row.errors.push(String(error)); row.stages.push({ stage: 'failure-observation', ...(walk ? await snapshot(walk).catch(() => ({})) : {}) }); }
  finally { if (walk) { walk.release(); await Promise.all(pendingAssets); await walk.context.close(); } write(); }
}
async function other(base, kind) {
  const mobile = kind === 'missing', profile = mobile ? PHONES[1] : DESKTOP;
  const row = newRow(`${profile.width}-missing-${kind}-${PHASE}`, '/missing-xi', profile); report.cases.push(row); let walk;
  try {
    walk = await open(base, profile, row); const input = walk.page.getByRole('combobox'); await input.fill(QUERY);
    await walk.page.getByRole('option').nth(7).waitFor(); await settle(walk.page); const before = await stage(walk, row, 'ready-canonical-options');
    setup(before.input.value === QUERY && before.options.length === 8 && before.options.every((item, index) => item.name === ROWS[index].player_name)
      && walk.stub.searches.length >= 2 && row.validatorRequests.length === 0 && before.missing.guessLabel === 'Guess 1 of 3', row.id + ': actual Missing XI query/puzzle must be ready without any played guess.');
    const name = ROWS[0].player_name, target = await option(walk, name);
    const lock = walk.page.getByRole('button', { name: 'Lock in guess', exact: true }); check(await lock.isDisabled(), row.id + ': Lock must start disabled.', row);
    await input.focus();
    if (mobile) await target.tap(); else if (kind === 'mouse') await target.click();
    else { await input.press('ArrowDown'); check(await target.getAttribute('aria-selected') === 'true', row.id + ': ArrowDown must highlight exact canonical identity.', row); await input.press('Enter'); }
    await poll(() => input.inputValue(), value => value === name, row.id + ': actual activation did not choose the exact name.');
    await settle(walk.page); const chosen = await stage(walk, row, 'actual-selection-without-lock');
    check(chosen.missing.raw === before.missing.raw && chosen.missing.key === before.missing.key && !chosen.list && await lock.isEnabled()
      && row.validatorRequests.length === 0 && chosen.missing.guessLabel === 'Guess 1 of 3', row.id + ': selecting a name also spent a guess or called a validator.', row);
    if (!mobile) check(await input.evaluate(element => document.activeElement === element), row.id + ': desktop selection lost persistent input focus.', row);
    if (mobile) {
      check(chosen.events.some(e => e.type === 'pointerdown' && e.trusted && e.pointerType === 'touch' && e.option === name), row.id + ': Missing XI selection needs a real native finger contact.', row);
      await capture(walk, row, 'selected-without-auto-lock', lock);
      await lock.tap(); const locked = await poll(() => snapshot(walk), value => value.missing.raw !== chosen.missing.raw, row.id + ': next explicit Lock did not save its one guess.');
      row.stages.push({ stage: 'explicit-next-lock-saved-one-wrong-guess', ...locked });
      const payload = JSON.parse(locked.missing.raw); const expected = { v: 1, date: '2026-10-13', puzzleIndex: 0, guesses: [{ t: 'miss', name }], gameStatus: 'playing' };
      check(locked.missing.raw === JSON.stringify(expected) && same(payload, expected) && row.validatorRequests.length === 0
        && locked.missing.guessLabel === 'Guess 2 of 3', row.id + ': explicit Lock must write exactly one actual wrong action and no other saved fields.', row);
      await capture(walk, row, 'explicit-lock-one-guess', walk.page.getByText('Already tried: ' + name, { exact: true }));
    } else await capture(walk, row, 'desktop-exact-selection-focus-held', input);
  } catch (error) { report.setupFailures++; row.errors.push(String(error)); row.stages.push({ stage: 'failure-observation', ...(walk ? await snapshot(walk).catch(() => ({})) : {}) }); }
  finally { if (walk) { walk.release(); await Promise.all(pendingAssets); await walk.context.close(); } write(); }
}
try {
  sourceBefore = SOURCE_FILES.map(file => {
    const full = path.join(ROOT, file), copy = path.join(OUT, 'source-before', file); setup(fs.existsSync(full), 'Missing source receipt ' + file);
    fs.mkdirSync(path.dirname(copy), { recursive: true }); fs.copyFileSync(full, copy); return { file, bytes: fs.statSync(full).size, sha256: hash(full), retained: slash(path.relative(OUT, copy)) };
  }); report.source = sourceBefore;
  const installedFile = path.join(process.env.AUTOCOMPLETE_TOUCH_OUT, 'installed.json');
  const installedRows = JSON.parse(fs.readFileSync(installedFile, 'utf8'));
  setup(installedRows.length === 521, 'The actual installed dependency census must remain 521.');
  installedBefore = installedRows.map(row => {
    setup(row.path.startsWith('node_modules/') && !row.path.split('/').includes('..'), 'Installed dependency path escapes the checkout.');
    const full = path.join(ROOT, row.path, 'package.json'); setup(fs.existsSync(full), 'Missing installed dependency ' + row.path);
    const actual = JSON.parse(fs.readFileSync(full, 'utf8')); setup(actual.version === row.version, 'Installed dependency version differs: ' + row.path);
    return { path: row.path, version: actual.version, sha256: hash(full) };
  }); report.installed = installedBefore;
  toolsBefore = ['esbuild', 'playwright', 'playwright-core'].map(name => { const file = require.resolve(name + '/package.json');
    const retained = 'tools/' + name + '.package.json', copy = path.join(OUT, retained); fs.mkdirSync(path.dirname(copy), { recursive: true }); fs.copyFileSync(file, copy);
    return { name, file, retained, version: JSON.parse(fs.readFileSync(file, 'utf8')).version, sha256: hash(file) }; }); report.tools = toolsBefore;
  cache = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(ROOT, 'free-kick-lab-artifacts/font-cache'));
  fontBefore = hash(path.join(cache, 'manifest.json')); report.fonts = JSON.parse(fs.readFileSync(path.join(cache, 'manifest.json'), 'utf8'));
  fonts = new Map(report.fonts.map(entry => {
    setup(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin) && /^[a-f0-9]{64}$/.test(entry.file), 'Unknown retained font dependency.');
    const file = path.join(cache, entry.file); setup(hash(file) === entry.sha256, 'Retained font bytes differ.');
    return [entry.url, { contentType: entry.contentType, body: fs.readFileSync(file) }];
  })); setup(fonts.size > 0, 'No retained declared fonts.');
  const fixtures = { kind: 'explicitly-fictional-transport-fixtures', query: QUERY, rows: ROWS, validator: { valid: true },
    otherReadTables: { national_team_squads: [], player_verified_positions: [] }, sourceHead: report.sourceHead };
  fs.writeFileSync(FIXTURE, JSON.stringify(fixtures, null, 2) + '\n'); fixtureBefore = hash(FIXTURE); report.fixtures = { file: 'network-fixtures.json', sha256: fixtureBefore, ...fixtures };
  normalDist = path.resolve(ROOT, process.env.AUTOCOMPLETE_TOUCH_DIST || 'dist'); setup(fs.existsSync(path.join(normalDist, 'index.html')), 'Actual normal built route is missing.');
  normalDistBefore = files(normalDist); walkedDist = CONTROL ? sideBuild() : normalDist; walkedDistBefore = files(walkedDist);
  report.build = { normalDist, normal: normalDistBefore, walkedDist, walked: walkedDistBefore };
  write(); const base = await serve(walkedDist); browser = await pw.chromium.launch();
  for (const profile of PHONES) await phone(base, profile);
  if (!CONTROL) for (const kind of ['missing', 'mouse', 'keyboard']) await other(base, kind);
  await Promise.all(pendingAssets); report.loadedAssets = [...loadedAssets.values()].sort((a, b) => a.file.localeCompare(b.file));
  const rows = [...report.cases, ...report.controls];
  for (const row of rows) {
    check(row.errors.length === 0 && row.assetErrors.length === 0, row.id + ': actual app, owned asset or setup errors: ' + [...row.errors, ...row.assetErrors].join(' | '), row);
    check(row.diagnostics.every(diagnostic => row.transport.some(request => request.action === 'abort' && request.url === diagnostic.url)), row.id + ': a resource diagnostic lacks an exact actual aborted URL.', row);
    check(row.transport.every(request => request.action !== 'abort' || new URL(request.url).origin !== base), row.id + ': the local owned route was aborted.', row);
  }
  check(CONTROL ? report.cases.length === 0 && report.controls.length === 3 : report.cases.length === 6 && report.controls.length === 0, 'Exact journey count changed.');
  check(report.inventory.length === (CONTROL ? 3 : 13) && new Set(report.inventory.map(image => image.file)).size === report.inventory.length, 'Exact distinct original capture count changed.');
  check(report.prematureSelections === ((PHASE === 'baseline' || CONTROL) ? 3 : 0), 'Exact owned premature gesture outcome count changed.');
  for (const image of report.inventory) check(image.original && hash(path.join(OUT, image.file)) === image.sha256 && fs.statSync(path.join(OUT, image.file)).size === image.bytes, 'Original PNG changed: ' + image.file);
} catch (error) { report.setupFailures++; report.issues.push(String(error.stack || error)); }
finally {
  if (browser) await browser.close(); if (server) server.kill();
  report.sourceHeld = sourceBefore.length === SOURCE_FILES.length && sourceBefore.every(row => hash(path.join(ROOT, row.file)) === row.sha256 && hash(path.join(OUT, row.retained)) === row.sha256);
  report.installedHeld = installedBefore.length === 521 && installedBefore.every(row => hash(path.join(ROOT, row.path, 'package.json')) === row.sha256);
  report.toolsHeld = toolsBefore.length === 3 && toolsBefore.every(tool => hash(tool.file) === tool.sha256 && hash(path.join(OUT, tool.retained)) === tool.sha256);
  report.fixturesHeld = !!fixtureBefore && hash(FIXTURE) === fixtureBefore;
  report.fontsHeld = !!fontBefore && hash(path.join(cache, 'manifest.json')) === fontBefore && report.fonts.every(entry => hash(path.join(cache, entry.file)) === entry.sha256);
  report.distHeld = normalDistBefore.length > 0 && !!walkedDist && walkedDistBefore.length > 0
    && same(files(normalDist), normalDistBefore) && same(files(walkedDist), walkedDistBefore);
  for (const name of ['sourceHeld', 'installedHeld', 'toolsHeld', 'fixturesHeld', 'fontsHeld', 'distHeld']) check(report[name], name + ': the actual held inputs changed or were never qualified.');
  const rows = [...report.cases, ...report.controls];
  report.summary = { checks: report.checks, cases: report.cases.length, controls: report.controls.length, originals: report.inventory.length,
    prematureSelections: report.prematureSelections, nativeContacts: rows.reduce((sum, row) => sum + row.inputs.filter(input => input.type === 'touchStart').length, 0),
    validatorClientInputs: rows.reduce((sum, row) => sum + row.validatorRequests.length, 0),
    fixtureReads: rows.reduce((sum, row) => sum + row.transport.filter(request => request.action === 'fictional-read-fixture').length, 0),
    externalAborts: rows.reduce((sum, row) => sum + row.transport.filter(request => request.action === 'abort').length, 0),
    expectedDiagnostics: rows.reduce((sum, row) => sum + row.diagnostics.length, 0), installedVersions: installedBefore.length,
    failures: report.failures, setupFailures: report.setupFailures };
  const healthy = report.failures === 0 && report.setupFailures === 0;
  report.status = healthy ? CONTROL ? 'control-reproduced' : PHASE === 'baseline' ? 'baseline-reproduced' : 'passed' : 'failed'; write();
  console.log(`playPlayerAutocompleteTouchScroll ${report.status}: ${report.checks} checks, ${report.cases.length} journeys, ${report.controls.length} controls, ${report.prematureSelections} premature selections, ${report.inventory.length} originals, ${report.failures} failures, ${report.setupFailures} setup failures.`);
  process.exitCode = healthy && (PHASE === 'fixed' || CONTROL) ? 0 : 1;
}
