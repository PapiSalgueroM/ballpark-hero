/* Remote actual built-page diagnosis. Fictional search rows, no live database.
 * WebKit uses public native taps. Only Chromium receives a native CDP cancel.
 */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.XI_SELECTION_OUT && path.isAbsolute(process.env.XI_SELECTION_OUT), 'Absolute XI_SELECTION_OUT required');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.XI_SELECTION_OUT, BASE = process.env.XI_SELECTION_BASE;
assert(BASE && /^http:\/\/127\.0\.0\.1:\d+$/.test(BASE), 'Explicit loopback XI_SELECTION_BASE required');
const DIST = path.resolve(process.env.XI_SELECTION_DIST || path.join(ROOT, 'dist'));
const PUBLISHED = 'ae14cf973b9053a7f1cd4f520b416aee804f65c9';
const HOOK = 'src/hooks/useLineupBuilder.ts', HOOK_REF = process.env.XI_SELECTION_HOOK_SOURCE_REF;
assert(HOOK_REF && /^[a-f0-9]{40}$/.test(HOOK_REF), 'Explicit full committed XI_SELECTION_HOOK_SOURCE_REF required');
const QUERY = 'Fixture Harbor', PICK = 'Fixture Harbor Keeper 01';
const ROWS = Array.from({ length: 24 }, (_, index) => ({
  player_name: 'Fixture Harbor Keeper ' + String(index + 1).padStart(2, '0'),
  name_folded: 'fixture harbor keeper ' + String(index + 1).padStart(2, '0'),
  club: 'Real Madrid', nationality: 'Fixture Nation', position: 'Goalkeeper',
  market_value_usd: 2400000 - index * 10000, year: 2026, age: 27,
}));
const SOURCE = ['src/pages/LineupBuilder.tsx', 'src/hooks/useLineupBuilder.ts',
  'src/components/lineup/FormationPitch.tsx', 'src/components/lineup/TeamSpinner.tsx',
  'src/components/game/PlayerAutocomplete.tsx', 'src/lib/playerSearch.ts',
  'src/data/lineupTeams.ts', 'src/types/lineupBuilder.ts', 'src/lib/positionFit.ts'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 30000, maxBuffer: 32 * 1024 * 1024 });
const normalized = text => text.replaceAll('\r\n', '\n');
const write = (name, value) => {
  const file = path.join(OUT, name); fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n');
};
function inventory(dir, root = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? inventory(full, root) : [{ file: path.relative(root, full).replaceAll('\\', '/'), bytes: fs.statSync(full).size, sha256: sha(fs.readFileSync(full)) }];
  }).sort((a, b) => a.file.localeCompare(b.file));
}
async function bounded(promise, label, ms = 15000) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' exceeded ' + ms + 'ms')), ms); })]); }
  finally { clearTimeout(timer); }
}
fs.mkdirSync(OUT, { recursive: true }); assert(!fs.existsSync(path.join(OUT, 'report.json')), 'Never replace prior evidence');
assert.equal(git(['rev-parse', '--verify', HOOK_REF + '^{commit}']).trim(), HOOK_REF, 'Actual committed hook reference');
git(['merge-base', '--is-ancestor', HOOK_REF, 'HEAD']);
const report = { status: 'running', head: git(['rev-parse', 'HEAD']).trim(), publishedApp: PUBLISHED, actualHookSourceRef: HOOK_REF,
  base: BASE, cases: [], sources: [], fonts: [], sourceHeld: false, distHeld: false, qualified: false,
  limits: [
    'Actual built route and real hook/search code, with explicitly fictional keeper transport rows. No database or validator accuracy claim.',
    'The hook has no lineup save. Full DOM, observed events, requests, storage and pitch projection are retained, not private React hook state.',
    'Math.random returns 0.5 in these fresh contexts only to prepare the actual constructor assignment; painted Real Madrid is required. No natural assignment or RNG distribution claim.',
    'Existing cookie/rules acknowledgements are prepared through their actual localStorage keys. No game state is injected.',
    'Headless WebKit is not physical Safari26.6.1, CriOS156, an iPad or an operating-system soft keyboard.',
    'WebKit drag/cancel is untested: the supported public Touchscreen API provides tap. Chromium CDP cancellation is reported separately.',
    'All native selection inputs use Playwright touch/mouse/keyboard or Chromium CDP. No DOM click, dispatched click, handler call or forced click.',
    'Fonts come only from the declared retained cache. Other external assets/analytics are blocked and earn no appearance credit.',
    'No season, rating, complete XI, AI judgement, player database, live-site or whole-suite qualification.',
  ] };
const flush = () => write('report.json', report);
const sourcesBefore = new Map(SOURCE.map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
for (const [file, bytes] of sourcesBefore) {
  const ref = file === HOOK ? HOOK_REF : PUBLISHED;
  const original = git(['show', ref + ':' + file]);
  assert.equal(normalized(bytes.toString('utf8')), normalized(original), 'Exact committed picker source differs: ' + file);
  write('source/' + file, bytes); report.sources.push({ file, ref, bytes: bytes.length, sha256: sha(bytes), gitBlob: git(['rev-parse', ref + ':' + file]).trim() });
}
write('fictional-search-rows.json', { declaration: 'Test-only invented keepers at the requested club. No product-data write or real football assertion.', rows: ROWS });
const beforeDist = inventory(DIST); write('dist.before.json', beforeDist);
const cache = process.env.SAFARI_REPORT_FONT_CACHE; assert(cache && path.isAbsolute(cache), 'Absolute retained SAFARI_REPORT_FONT_CACHE required');
const fontManifest = fs.readFileSync(path.join(cache, 'manifest.json'));
const fonts = new Map(JSON.parse(fontManifest).map(row => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(row.url).origin));
  assert(/^[a-f0-9]{64}$/.test(row.file), 'Cached font filename must be an owned hash');
  const body = fs.readFileSync(path.join(cache, row.file)); assert.equal(sha(body), row.sha256, 'Cached font bytes');
  report.fonts.push({ ...row, bytes: body.length }); return [row.url, { body, contentType: row.contentType }];
}));
write('font-manifest.json', fontManifest); flush();
const documentPath = fs.existsSync(path.join(DIST, 'build-your-xi/index.html')) ? path.join(DIST, 'build-your-xi/index.html') : path.join(DIST, 'index.html');
const servedDocument = await bounded(fetch(BASE + '/build-your-xi'), 'served document headers');
assert.equal(servedDocument.status, 200);
const documentBytes = Buffer.from(await bounded(servedDocument.arrayBuffer(), 'served document body'));
assert.deepEqual(documentBytes, fs.readFileSync(documentPath), 'Actual server must serve the declared emitted dist document');
write('served-document.html', documentBytes); report.document = { file: path.relative(DIST, documentPath), sha256: sha(documentBytes) }; flush();

async function snapshot(page) {
  return bounded(page.evaluate(() => {
    const box = element => { if (!element) return null; const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const buttons = [...document.querySelectorAll('button')];
    const keeper = buttons.find(button => button.firstElementChild?.tagName === 'SPAN' && button.firstElementChild.textContent.trim() === 'GK');
    const pitch = keeper?.parentElement, input = document.querySelector('input[role="combobox"]'), list = document.querySelector('[role="listbox"]');
    const store = storage => Object.fromEntries(Array.from({ length: storage.length }, (_, i) => { const key = storage.key(i); return [key, storage.getItem(key)]; }).sort((a, b) => a[0].localeCompare(b[0])));
    return { url: location.href, title: document.title, inner: [innerWidth, innerHeight], dpr: devicePixelRatio,
      viewport: visualViewport && { width: visualViewport.width, height: visualViewport.height, offsetLeft: visualViewport.offsetLeft, offsetTop: visualViewport.offsetTop, scale: visualViewport.scale },
      scroll: [scrollX, scrollY], active: document.activeElement?.outerHTML,
      input: input && { value: input.value, disabled: input.disabled, box: box(input) },
      list: list && { text: list.innerText, scrollTop: list.scrollTop, scrollHeight: list.scrollHeight, clientHeight: list.clientHeight, box: box(list) },
      pitch: pitch && { html: pitch.outerHTML, box: box(pitch), slots: [...pitch.querySelectorAll('button')].map(button => ({ text: button.textContent.trim(), disabled: button.disabled, className: button.className, box: box(button) })) },
      progress: [...document.querySelectorAll('span')].map(element => element.textContent.trim()).filter(text => /^\d+\/11$/.test(text)),
      errors: [...document.querySelectorAll('.text-destructive')].map(element => element.textContent.trim()).filter(Boolean),
      stores: { local: store(localStorage), session: store(sessionStorage) }, events: window.__xi1388.events, randomCalls: window.__xi1388.randomCalls,
    };
  }), 'actual DOM snapshot');
}
async function nativeTap(page, locator, touch, row, label) {
  await locator.waitFor({ state: 'visible' }); await locator.scrollIntoViewIfNeeded(); await page.waitForTimeout(100);
  const target = await locator.evaluate(element => {
    const r = element.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2, hit = document.elementFromPoint(x, y);
    return { x, y, rect: { x: r.x, y: r.y, width: r.width, height: r.height }, hit: !!hit && (element === hit || element.contains(hit)), text: element.textContent.trim() };
  });
  row.inputs.push({ label, method: touch ? 'Playwright Touchscreen.tap' : 'Playwright Mouse.click', ...target }); write(row.id + '.json', row);
  assert(target.hit, 'Native target must be hit-test reachable: ' + label);
  if (touch) await page.touchscreen.tap(target.x, target.y); else await page.mouse.click(target.x, target.y);
}
async function capture(page, row, label) {
  const before = await snapshot(page), file = row.id + '-' + label + '.png';
  await page.screenshot({ path: path.join(OUT, file), fullPage: false, timeout: 15000 });
  const bytes = fs.readFileSync(path.join(OUT, file)), after = await snapshot(page);
  assert.equal(bytes.readUInt32BE(16), row.profile.width * 2); assert.equal(bytes.readUInt32BE(20), row.profile.height * 2);
  row.captures.push({ file, sha256: sha(bytes), pixels: [bytes.readUInt32BE(16), bytes.readUInt32BE(20)], before, after }); write(row.id + '.json', row);
}
function observer() {
  const events = [], realRandom = Math.random;
  window.__xi1388 = { events, randomCalls: 0 };
  Math.random = () => { window.__xi1388.randomCalls++; return 0.5; };
  window.__xi1388.originalRandomName = realRandom.name;
  localStorage.setItem('lineup-rules-seen', '1'); localStorage.setItem('cookie-consent', 'essential');
  const types = ['pointerdown', 'pointerup', 'pointercancel', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'focus', 'blur', 'input', 'keydown', 'scroll', 'resize'];
  for (const type of types) document.addEventListener(type, event => {
    if (events.length >= 1500) return;
    const element = event.target instanceof Element ? event.target : null, r = element?.getBoundingClientRect(), control = element?.closest('button,input,[role="option"]');
    const row = { type, at: performance.now(), trusted: event.isTrusted, pointerType: event.pointerType, pointerId: event.pointerId, key: event.key,
      target: element && { tag: element.tagName, role: element.getAttribute('role'), text: element.textContent?.trim().slice(0, 130), value: element instanceof HTMLInputElement ? element.value : undefined },
      control: control && { tag: control.tagName, role: control.getAttribute('role'), text: control.textContent?.trim().slice(0, 130) },
      box: r && { x: r.x, y: r.y, width: r.width, height: r.height }, scroll: [scrollX, scrollY],
      viewport: visualViewport && { width: visualViewport.width, height: visualViewport.height, offsetTop: visualViewport.offsetTop, scale: visualViewport.scale }, prevented: event.defaultPrevented };
    events.push(row); queueMicrotask(() => { row.preventedAfterDispatch = event.defaultPrevented; });
  }, { capture: true, passive: true });
}
const profiles = [
  { id: 'webkit-ipad-tap', engine: 'webkit', width: 1180, height: 768, touch: true },
  { id: 'webkit-phone-tap', engine: 'webkit', width: 390, height: 844, touch: true },
  { id: 'chromium-ipad-tap', engine: 'chromium', width: 1180, height: 768, touch: true },
  { id: 'chromium-ipad-mouse', engine: 'chromium', width: 1180, height: 768, touch: false },
  { id: 'chromium-native-cancel', engine: 'chromium', width: 1180, height: 768, touch: true, cancel: true },
];
const browsers = new Map();
try {
  for (const profile of profiles) {
    const row = { id: profile.id, profile, stage: 'opening', setupComplete: false, qualified: false, inputs: [], transport: [], responses: [], errors: [], routeErrors: [], console: [], captures: [] };
    let context, page;
    report.cases.push({ id: row.id, file: row.id + '.json', qualified: false }); flush();
    try {
      if (!browsers.has(profile.engine)) browsers.set(profile.engine, await bounded(pw[profile.engine].launch({ headless: true }), profile.engine + ' launch', 30000));
      context = await bounded(browsers.get(profile.engine).newContext({ viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: 2, hasTouch: profile.touch, isMobile: profile.touch, serviceWorkers: 'block', reducedMotion: 'reduce' }), 'new context');
      const work = async () => {
        await context.addInitScript(observer);
        await context.route('**/*', async route => {
          try {
          const request = route.request(), url = new URL(request.url()), receipt = { url: url.href, method: request.method(), resource: request.resourceType() };
          row.transport.push(receipt);
          if (url.origin === BASE) { receipt.action = 'actual-dist'; return await route.continue(); }
          if (fonts.has(url.href)) { receipt.action = 'retained-font'; return await route.fulfill({ status: 200, ...fonts.get(url.href), headers: { 'access-control-allow-origin': '*' } }); }
          if (url.hostname === 'flawuiqbvjobmkfkauhw.supabase.co' && url.pathname === '/rest/v1/player_market_values') {
            receipt.action = 'fictional-search'; receipt.leg = url.searchParams.has('name_folded') ? 'name' : 'prominence';
            if (request.method() !== 'OPTIONS') {
              receipt.query = receipt.leg === 'name' ? (url.searchParams.get('name_folded') || '').replace(/^ilike\.%/, '').replace(/%$/, '') : null;
              receipt.validQuery = request.method() === 'GET' && (url.searchParams.get('club') || '').includes('Real Madrid') && (receipt.leg !== 'name' || (receipt.query.length >= 3 && QUERY.toLowerCase().startsWith(receipt.query)));
              assert(receipt.validQuery, 'Actual query must retain the requested club and query');
            }
            return await route.fulfill({ status: request.method() === 'OPTIONS' ? 204 : 200, contentType: 'application/json', body: request.method() === 'OPTIONS' ? '' : JSON.stringify(ROWS), headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': request.headers()['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info,accept-profile,prefer', 'access-control-allow-methods': 'GET,OPTIONS' } });
          }
          receipt.action = 'blocked-external'; return await route.abort();
          } catch (error) {
            row.routeErrors.push({ url: route.request().url(), error: String(error) });
            write(row.id + '.json', row);
            try { await route.abort(); } catch (cleanupError) { row.routeErrors.push({ cleanupError: String(cleanupError) }); }
          }
        });
        await context.routeWebSocket('**/*', socket => socket.close());
        page = await context.newPage(); page.setDefaultTimeout(12000); page.setDefaultNavigationTimeout(30000);
        page.on('pageerror', error => row.errors.push({ message: error.message, stack: error.stack }));
        page.on('console', message => row.console.push({ type: message.type(), text: message.text() }));
        page.on('response', response => row.responses.push({ url: response.url(), status: response.status(), resource: response.request().resourceType() }));
        await page.goto(BASE + '/build-your-xi', { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: /^4-4-2\s*11 players$/ }).waitFor({ state: 'visible' });
        row.browser = { version: browsers.get(profile.engine).version(), userAgent: await page.evaluate(() => navigator.userAgent) };
        await nativeTap(page, page.getByRole('button', { name: /^4-4-2\s*11 players$/ }), profile.touch, row, 'actual formation');
        await page.getByText('Real Madrid', { exact: true }).waitFor({ state: 'visible' });
        await page.getByText('0/11', { exact: true }).waitFor({ state: 'visible' });
        row.assigned = await snapshot(page); assert.equal(row.assigned.pitch.slots.length, 11);
        await nativeTap(page, page.getByRole('button', { name: 'GK', exact: true }), profile.touch, row, 'actual GK slot');
        const input = page.getByRole('combobox');
        await nativeTap(page, input, profile.touch, row, 'actual player input');
        await page.keyboard.type(QUERY, { delay: 15 });
        const option = page.getByRole('option').filter({ hasText: PICK });
        await option.waitFor({ state: 'visible' }); await bounded(page.evaluate(() => document.fonts.ready.then(() => null)), 'cached fonts');
        assert(row.transport.some(item => item.action === 'fictional-search' && item.method === 'GET' && item.leg === 'name' && item.query === QUERY.toLowerCase()));
        assert(row.transport.some(item => item.action === 'fictional-search' && item.method === 'GET' && item.leg === 'prominence'));
        row.setupComplete = true; row.stage = profile.cancel ? 'native-cancel' : 'native-selection'; row.before = await snapshot(page);
        await capture(page, row, 'options');
        if (profile.cancel) {
          await option.scrollIntoViewIfNeeded();
          const box = await option.boundingBox(); assert(box);
          const x = box.x + box.width / 2, y = box.y + box.height / 2, cdp = await context.newCDPSession(page);
          try {
            row.inputs.push({ method: 'Chromium CDP Input.dispatchTouchEvent', type: 'touchStart', x, y });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
            await page.waitForTimeout(100); row.contactDown = await snapshot(page);
            assert.deepEqual(row.contactDown.progress, ['0/11'], 'Native contact down must remain uncommitted');
            assert(row.contactDown.events.some(event => event.trusted && event.type === 'pointerdown' && event.pointerType === 'touch' && event.control?.role === 'option'), 'Cancelled contact must actually start on the option');
            row.inputs.push({ method: 'Chromium CDP Input.dispatchTouchEvent', type: 'touchCancel' });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
          } finally { await cdp.detach(); }
          await page.waitForTimeout(200); row.after = await snapshot(page);
          assert.deepEqual(row.after.progress, ['0/11']); assert.equal(row.after.input.value, QUERY);
          assert(row.after.pitch.slots.every(slot => !slot.disabled));
          assert(row.after.events.some(event => event.trusted && ['touchcancel', 'pointercancel'].includes(event.type)), 'Actual native cancellation must be observed');
          assert(!row.after.events.some(event => event.trusted && event.type === 'click' && event.control?.role === 'option'), 'Cancelled contact must not become an option click');
        } else {
          await nativeTap(page, option, profile.touch, row, 'actual fictional keeper option');
          await page.getByText('1/11', { exact: true }).waitFor({ state: 'visible' });
          row.after = await snapshot(page);
          assert.deepEqual(row.after.progress, ['1/11']);
          assert.equal(row.after.pitch.slots.filter(slot => slot.disabled).length, 1);
          assert(row.after.pitch.slots.some(slot => slot.disabled && slot.text.includes('GK') && slot.text.includes(PICK)));
          assert(row.after.events.some(event => event.trusted && event.type === (profile.touch ? 'click' : 'pointerdown') && event.control?.role === 'option'), 'Actual native option event must be observed');
        }
        assert(!row.transport.some(item => item.url.includes('/functions/v1/validate-player')), 'Matching primary club pick must not require the AI validator');
        assert.equal(row.errors.length, 0, 'No actual page errors');
        assert.equal(row.routeErrors.length, 0, 'No intercepted-route setup errors');
        assert(!row.transport.some(item => item.action === 'blocked-external' && /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(item.url)), 'No undeclared font fetch');
        await capture(page, row, 'after');
        write(row.id + '-actual-body.html', await page.content()); row.stage = 'complete'; row.qualified = true;
      };
      await bounded(work(), row.id + ' complete case', 90000); row.completeInBudget = true;
    } catch (error) {
      row.failureKind = row.setupComplete ? 'observed-interaction-or-method-failure' : 'setup-failure'; row.error = error.stack || String(error);
      if (page && !page.isClosed()) try {
        row.failureObservation = await snapshot(page); write(row.id + '-failed-body.html', await bounded(page.content(), 'failed page HTML'));
        await capture(page, row, 'failure');
      } catch (captureError) { row.failureCaptureError = String(captureError); }
    }
    finally {
      if (context) try { await bounded(context.close(), row.id + ' context cleanup', 10000); } catch (error) { row.cleanupError = String(error); row.qualified = false; }
      row.qualified = !!row.completeInBudget && row.qualified && !row.error && !row.cleanupError && row.routeErrors.length === 0;
      write(row.id + '.json', row); Object.assign(report.cases.find(item => item.id === row.id), { qualified: row.qualified, setupComplete: row.setupComplete, stage: row.stage, failureKind: row.failureKind || null, sha256: sha(fs.readFileSync(path.join(OUT, row.id + '.json'))) }); flush();
    }
  }
} finally {
  for (const [name, browser] of browsers) try { await bounded(browser.close(), name + ' cleanup', 10000); } catch (error) { report.cleanupError = String(error); }
  const afterDist = inventory(DIST); write('dist.after.json', afterDist); report.distHeld = JSON.stringify(afterDist) === JSON.stringify(beforeDist);
  report.sourceHeld = [...sourcesBefore].every(([file, bytes]) => bytes.equals(fs.readFileSync(path.join(ROOT, file))));
  report.fontsHeld = fontManifest.equals(fs.readFileSync(path.join(cache, 'manifest.json'))) && report.fonts.every(row => sha(fs.readFileSync(path.join(cache, row.file))) === row.sha256);
  report.status = 'complete'; report.qualified = report.cases.length === profiles.length && report.cases.every(row => row.qualified) && report.sourceHeld && report.distHeld && report.fontsHeld && !report.cleanupError; flush();
}
assert(report.qualified, 'Actual native selection diagnostic did not complete every declared case; inspect physical report');
console.log('Build Your XI1388: four actual native selection journeys and one Chromium-only cancellation preserved; WebKit drag/cancel untested.');
console.log('Fictional query transport and prepared constructor RNG. No live/Safari-device/complete-game qualification.');
