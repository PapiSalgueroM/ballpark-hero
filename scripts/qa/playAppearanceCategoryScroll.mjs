/* Actual built creator routes, native panel wheel and category activation. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from '../lib/playwrightLoader.mjs';

const base = 'http://127.0.0.1:4173', mode = process.env.APPEARANCE_SCROLL_MODE;
const evidenceRoot = process.env.APPEARANCE_SCROLL_OUT, originalHead = '8fc62292db90a7a973389336bbe8cff6de184fae';
assert(['baseline', 'fixed'].includes(mode), 'Explicit source arm');
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs'), 'Ordinary offline preload inherited');
assert(evidenceRoot && path.isAbsolute(evidenceRoot) && path.relative(process.cwd(), evidenceRoot).split(path.sep).includes('..'), 'External evidence root');
const out = path.join(evidenceRoot, 'browser'); assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const hash = body => createHash('sha256').update(body).digest('hex');
const git = args => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
const files = ['src/components/soccer-career/AppearanceBuilder.tsx', 'src/components/soccer-career/PlayerAvatar.tsx',
  'src/lib/soccerCareerAppearance.ts', 'src/lib/careerAppearanceCopy.ts', 'src/lib/soccerBoots.ts',
  'src/pages/SoccerCareer.tsx', 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerSave.ts', 'src/components/us-career/UsCareerBoard.tsx'];
const source = files.map((file, index) => {
  const original = git(['show', originalHead + ':' + file]), actual = fs.readFileSync(file);
  assert.equal(original.equals(actual), index === 0 ? mode === 'baseline' : true, file + ' has its declared source arm');
  return { file, originalSha256: hash(original), actualSha256: hash(actual) };
});
const sourceStatus = git(['status', '--porcelain=v1', '--untracked-files=all']);
const cacheRoot = process.env.FREE_KICK_FONT_CACHE;
assert(cacheRoot && path.isAbsolute(cacheRoot), 'Verified font cache required');
const cache = new Map(JSON.parse(fs.readFileSync(path.join(cacheRoot, 'manifest.json'))).map(row => {
  const body = fs.readFileSync(path.join(cacheRoot, row.file)); assert.equal(hash(body), row.sha256, row.url);
  return [row.url, { body, contentType: row.contentType }];
}));
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
const emptyImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV0sAAAAASUVORK5CYII=', 'base64');
const sports = [{ sport: 'soccer', route: '/soccer-career', gear: 'Boots', first: 'Knee Slide' },
  { sport: 'nfl', route: '/nfl-my-career', gear: 'Cleats', first: 'Sideline Salute' },
  { sport: 'nba', route: '/nba-my-career', gear: 'Sneakers', first: 'Crowd Point' },
  { sport: 'mlb', route: '/mlb-my-career', gear: 'Cleats', first: 'Dugout Point' },
  { sport: 'nhl', route: '/nhl-my-career', gear: 'Skates', first: 'Stick Raise' }];
const specs = sports.flatMap(spec => [390, 1280].map(width => ({ ...spec, width, id: spec.sport + '-' + width })));
const report = { version: 1, mode, originalHead, source, status: 'failed', productQualified: false,
  scope: 'Actual built five-sport creation screens. Native wheel at both viewport sizes, touch category and option activation at390, keyboard Enter at1280. No career creation or fake save callback.',
  scrollScope: 'Explicit centering preparation before measurement. Category-switch outer page position is held with both overflowing panels and tabs visible. Option selection records preview/page geometry separately; no global no-scroll claim.',
  census: specs.map(({ id, sport, route, width }) => ({ id, sport, route, width })),
  expected: { contexts: 10, originalFaults: mode === 'baseline' ? 10 : 0, healthyCurrentCategory: 10, healthyOptionSelection: 10 }, cases: [] };
const save = () => fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
const wall = ms => new Promise(resolve => setTimeout(resolve, ms));
const poll = async (label, read, predicate) => {
  for (let attempt = 0; attempt < 150; attempt++) { const value = await read(); if (predicate(value)) return value; await wall(20); }
  assert.fail('Setup or completion did not reach ' + label + '; no original-fault credit');
};
const browser = await chromium.launch({ headless: true });
try {
  for (const spec of specs) {
    const { width } = spec;
    const row = { id: spec.id, sport: spec.sport, route: spec.route, width, status: 'failed', originalFault: false,
      currentCategoryHealthy: false, selectionHealthy: false, actions: [], observations: [], requests: [], readFixtures: [], externalFulfilled: [], unexpectedWrites: [], errors: [], assets: [], screenshots: [] };
    report.cases.push(row); save();
    const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, isMobile: width === 390, hasTouch: width === 390,
      locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: base, localStorage: [
        { name: 'cookie-consent', value: 'essential' }, { name: 'rules-gate-seen:' + spec.route, value: '1' }, { name: 'appearance-scroll-held-save', value: '{"held":true}' },
      ] }] } });
    const responses = [];
    let page;
    try {
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        row.requests.push({ url: url.href, method: request.method(), resourceType: request.resourceType() });
        try {
          if (url.origin === base) { assert.equal(request.method(), 'GET', 'No local write'); return await route.continue(); }
          row.externalFulfilled.push(url.href);
          if (request.method() === 'OPTIONS') return await route.fulfill({ status: 204, headers: cors, body: '' });
          if (url.href === 'https://flawuiqbvjobmkfkauhw.supabase.co/rest/v1/rpc/most_played_today' && request.method() === 'POST') {
            assert.equal(request.postData(), '{"p_min":3,"p_limit":3}', 'Exact existing read-only most-played arguments');
            const fixture = { url: url.href, method: request.method(), rawBody: request.postData(), intercepted: true, fulfilled: false };
            row.readFixtures.push(fixture); await route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: '[]' }); fixture.fulfilled = true; return;
          }
          if (cache.has(url.href)) return await route.fulfill({ status: 200, headers: cors, ...cache.get(url.href) });
          assert.notEqual(request.resourceType(), 'font', 'Every requested font has its checked cached body');
          if (request.method() !== 'GET') row.unexpectedWrites.push({ url: url.href, method: request.method(), body: request.postData() });
          assert.equal(request.method(), 'GET', 'No external application writes');
          if (request.resourceType() === 'image') return await route.fulfill({ status: 200, headers: cors, contentType: 'image/png', body: emptyImage });
          if (request.resourceType() === 'script') return await route.fulfill({ status: 200, headers: cors, contentType: 'application/javascript', body: '' });
          if (request.resourceType() === 'stylesheet') return await route.fulfill({ status: 200, headers: cors, contentType: 'text/css', body: '' });
          return await route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: url.pathname.startsWith('/auth/') ? '{}' : '[]' });
        } catch (error) { row.errors.push('Route: ' + String(error?.stack ?? error)); try { await route.abort('failed'); } catch {} }
      });
      await context.routeWebSocket('**/*', socket => socket.close());
      await context.addInitScript(() => {
        window.__appearanceScrollEvents = []; window.__appearanceRandomCalls = 0;
        const random = Math.random; Math.random = (...args) => { window.__appearanceRandomCalls++; return random.apply(Math, args); };
        window.addEventListener('unhandledrejection', event => window.__appearanceScrollEvents.push({ type: 'unhandledrejection', message: String(event.reason?.stack ?? event.reason) }));
        for (const type of ['click', 'wheel']) window.addEventListener(type, event => {
          const element = event.target instanceof Element ? event.target.closest('button, .overflow-y-auto') : null;
          if (element) window.__appearanceScrollEvents.push({ type, trusted: event.isTrusted, label: element.textContent?.trim().slice(0, 180) });
        }, { capture: true, passive: true });
      });
      page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on('pageerror', error => row.errors.push('Page: ' + error.message));
      page.on('console', message => { if (message.type() === 'error') row.errors.push('Console: ' + message.text()); });
      page.on('requestfailed', request => row.errors.push('Request: ' + request.url() + ' ' + JSON.stringify(request.failure())));
      page.on('response', response => {
        if (new URL(response.url()).origin !== base) return;
        responses.push((async () => {
          assert.equal(response.status(), 200, response.url());
          const body = await response.body(), pathname = new URL(response.url()).pathname;
          const relative = pathname.endsWith('/') ? pathname + 'index.html' : path.extname(pathname) ? pathname : pathname + '/index.html';
          const physical = path.resolve('dist', '.' + decodeURIComponent(relative));
          assert(physical.startsWith(path.resolve('dist') + path.sep), 'Actual response stays inside dist');
          assert.equal(hash(body), hash(fs.readFileSync(physical)), 'Every local response matches completed physical dist');
          row.assets.push({ path: pathname, bytes: body.length, sha256: hash(body) });
        })().catch(error => row.errors.push('Response: ' + String(error?.stack ?? error))));
      });
      const editor = page.getByRole('heading', { name: 'Create Your Look', exact: true }).locator('xpath=../..');
      const options = editor.locator('.overflow-y-auto');
      const gear = editor.getByRole('button', { name: new RegExp(spec.gear + '$') });
      const celebration = editor.getByRole('button', { name: /Celebration$/ });
      const activate = async (locator, label) => {
        assert.equal(await locator.count(), 1, label + ' is one actual control');
        const box = await locator.boundingBox(); assert(box && box.x >= -1 && box.y >= 64 && box.x + box.width <= width + 1 && box.y + box.height <= 844, label + ' is already inside the readable viewport');
        if (width === 390) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        else { await locator.focus(); assert(await locator.evaluate(element => document.activeElement === element)); await page.keyboard.press('Enter'); }
        row.actions.push({ action: label, input: width === 390 ? 'native touch' : 'keyboard Enter', bounds: box });
      };
      const settle = async () => { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await wall(80); };
      const read = () => editor.evaluate(element => {
        const panel = element.querySelector('.overflow-y-auto'), buttons = [...panel.querySelectorAll('button')];
        const rect = node => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; };
        return { pageX: scrollX, pageY: scrollY, documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth,
          editor: rect(element), panel: rect(panel), scrollTop: panel.scrollTop, clientHeight: panel.clientHeight, scrollHeight: panel.scrollHeight,
          preview: { bounds: rect(element.children[1]), text: element.children[1].textContent, svg: element.querySelector('[role="img"]').outerHTML },
          buttons: buttons.map(button => ({ label: button.lastElementChild.textContent.trim(), bounds: rect(button), active: button.classList.contains('border-emerald-500') })), randomCalls: window.__appearanceRandomCalls };
      });
      const observe = async label => { const value = await read(); row.observations.push({ label, ...value }); return value; };
      const fullInside = (button, panel) => button.bounds.top >= panel.top - 0.5 && button.bounds.bottom <= panel.bottom + 0.5;
      const assertViewport = value => {
        assert(value.documentWidth <= width + 2 && value.editor.left >= -1 && value.editor.right <= width + 1, 'Actual creator has no horizontal overflow');
        assert(value.panel.top >= 64 && value.panel.bottom <= 844, 'Actual options window is visible before measured action');
        assert(value.scrollHeight > value.clientHeight + 60, 'Both actual catalogues physically overflow');
      };
      const wheel = async label => {
        const before = await read(); assertViewport(before);
        const remaining = before.scrollHeight - before.clientHeight - before.scrollTop;
        assert(remaining > 25, 'Actual panel has room for a native wheel without chaining to the page');
        const delta = Math.min(80, remaining / 2);
        await page.mouse.move((before.panel.left + before.panel.right) / 2, (before.panel.top + before.panel.bottom) / 2);
        await page.mouse.wheel(0, delta);
        await poll('native internal panel wheel', read, value => value.scrollTop > before.scrollTop + 10); await settle();
        const after = await observe(label); assert.equal(after.pageY, before.pageY, 'Native panel wheel stays inside its scroll window');
        row.actions.push({ action: label, input: 'native mouse wheel at actual panel, including phone viewport', delta, before: before.scrollTop, after: after.scrollTop });
        return after;
      };
      const screenshot = async label => { const file = spec.id + '-' + label + '.png'; await page.screenshot({ path: path.join(out, file), animations: 'disabled' }); row.screenshots.push(file); };
      const stores = () => page.evaluate(() => ({ local: Object.fromEntries(Object.entries(localStorage).sort()), session: Object.fromEntries(Object.entries(sessionStorage).sort()) }));

      await page.goto(base + spec.route, { waitUntil: 'networkidle' }); await editor.waitFor();
      assert.equal(await editor.count(), 1, 'One actual built creator editor');
      await page.evaluate(() => document.fonts.ready);
      const prepBefore = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
      await editor.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })); await settle();
      // Initial category activation and any centering are preparation, outside the measured segment.
      await gear.scrollIntoViewIfNeeded(); await activate(gear, 'open actual gear category for preparation'); await settle();
      await editor.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })); await settle();
      row.preparation = { action: 'center actual editor and activate gear before measurement', before: prepBefore, after: await page.evaluate(() => ({ x: scrollX, y: scrollY })), gearBounds: await gear.boundingBox(), celebrationBounds: await celebration.boundingBox() };
      let initial = await observe('hydrated-gear-at-top'); assertViewport(initial); assert.equal(initial.scrollTop, 0); assert.equal(initial.buttons.length, 18);
      assert(initial.buttons[0].active && fullInside(initial.buttons[0], initial.panel), 'Default gear starts visible and selected');
      row.storesBefore = await stores(); row.randomBefore = initial.randomCalls;
      const beforeChange = await wheel('gear-scrolled-natively');
      assert(beforeChange.scrollTop > 40 && beforeChange.buttons[0].bounds.bottom < beforeChange.panel.top, 'Native gear scroll actually hides its first choice');
      await screenshot('before-category-change');
      await activate(celebration, 'change to Celebration'); await settle();
      const changed = await observe('after-category-change'); assertViewport(changed); assert.equal(changed.buttons.length, 19);
      assert.equal(changed.pageX, beforeChange.pageX); assert.equal(changed.pageY, beforeChange.pageY, 'Category change holds outer page position with both fixed-height lists');
      assert.deepEqual(changed.preview, beforeChange.preview, 'Category navigation preserves the actual chosen look and preview geometry');
      assert(changed.buttons[0].label.endsWith(spec.first) && changed.buttons[0].active, 'The real first/default celebration is still selected');
      if (mode === 'baseline') {
        assert.equal(changed.scrollTop, beforeChange.scrollTop, 'Original reused window retains the actual native offset');
        assert(changed.buttons[0].bounds.bottom < changed.panel.top, 'Original default first celebration is physically hidden above its panel');
        row.originalFault = true; row.fault = 'Native gear offset carries into a new category and hides its first/default celebration';
      } else {
        assert.equal(changed.scrollTop, 0, 'Changed category starts at top'); assert(fullInside(changed.buttons[0], changed.panel), 'Its first/default celebration is physically visible');
      }
      await screenshot('after-category-change');

      const beforeCurrent = changed.scrollTop > 40 ? changed : await wheel('celebration-scrolled-natively');
      await activate(celebration, 'click the current Celebration category'); await settle();
      const same = await observe('after-current-category-click');
      assert.equal(same.scrollTop, beforeCurrent.scrollTop, 'Current-category click preserves internal offset'); assert.deepEqual(same.preview, beforeCurrent.preview);
      assert.equal(same.pageY, beforeCurrent.pageY); row.currentCategoryHealthy = true;

      const candidateIndex = same.buttons.findIndex(button => !button.active && fullInside(button, same.panel));
      assert(candidateIndex >= 0, 'A different real option is fully visible without scrolling it into view');
      const candidate = same.buttons[candidateIndex]; row.selectedOption = { index: candidateIndex, label: candidate.label, beforeBounds: candidate.bounds };
      await activate(options.getByRole('button').nth(candidateIndex), 'select visible ' + candidate.label); await settle();
      const selected = await observe('after-visible-option-selection');
      assert.equal(selected.scrollTop, same.scrollTop, 'Option selection retains the current options offset');
      assert(selected.buttons[candidateIndex].active && !selected.buttons[0].active, 'Native selection changed the actual active option');
      assert(selected.preview.text.includes(candidate.label), 'Actual parent-controlled preview reflects the chosen option');
      assert.equal(selected.preview.svg, same.preview.svg, 'Celebration selection preserves the entire actual avatar SVG');
      row.selectionGeometry = { beforePreview: same.preview.bounds, afterPreview: selected.preview.bounds, beforePageY: same.pageY, afterPageY: selected.pageY, beforePanel: same.panel, afterPanel: selected.panel };
      row.selectionHealthy = true; await screenshot('selected-visible-option');
      row.storesAfter = await stores(); assert.deepEqual(row.storesAfter, row.storesBefore, 'All local and session stores remain unchanged');
      row.randomAfter = await page.evaluate(() => window.__appearanceRandomCalls); assert.equal(row.randomAfter, row.randomBefore, 'Manual category/option actions use no random draws after hydration');
      row.events = await page.evaluate(() => window.__appearanceScrollEvents);
      assert(row.events.some(event => event.type === 'wheel' && event.trusted), 'An actual trusted wheel reached the actual panel');
      for (const label of ['Celebration', candidate.label]) assert(row.events.some(event => event.type === 'click' && event.trusted && event.label.includes(label)), 'Trusted actual native ' + label + ' activation');
      assert(!row.events.some(event => event.type === 'unhandledrejection'), 'No unhandled browser rejection');
      await Promise.all(responses); assert.deepEqual(row.errors, []); assert.deepEqual(row.unexpectedWrites, []); assert(row.readFixtures.every(fixture => fixture.intercepted && fixture.fulfilled));
      row.status = 'passed'; console.log(spec.id + ': native category outcome and both retained-scroll cases passed');
    } catch (error) {
      row.error = String(error?.stack ?? error);
      if (page) { const file = spec.id + '-failure.png'; try { await page.screenshot({ path: path.join(out, file), animations: 'disabled' }); row.screenshots.push(file); } catch (captureError) { row.errors.push('Screenshot: ' + String(captureError)); } }
    } finally {
      await context.close(); await Promise.all(responses);
      if (row.status === 'passed' && row.errors.length) { row.status = 'failed'; row.error = 'Late browser or response errors: ' + row.errors.join('\n'); }
      save();
    }
  }
} finally {
  await browser.close(); report.sourceAfter = Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(file))]));
  for (const row of source) assert.equal(report.sourceAfter[row.file], row.actualSha256, row.file + ' remains held');
  assert.deepEqual(git(['status', '--porcelain=v1', '--untracked-files=all']), sourceStatus, 'Tracked and untracked source status held'); save();
}
assert.equal(report.cases.length, 10); assert(report.cases.every(row => row.status === 'passed'), 'All ten actual route contexts reached their precise observations');
assert.equal(report.cases.filter(row => row.originalFault).length, report.expected.originalFaults);
assert.equal(report.cases.filter(row => row.currentCategoryHealthy).length, 10); assert.equal(report.cases.filter(row => row.selectionHealthy).length, 10);
report.status = 'passed'; report.productQualified = mode === 'fixed'; save();
console.log(mode === 'baseline' ? '10 actual original category-offset faults observed, with10 healthy current-category and10 healthy selection outcomes; no fixed claim.'
  : '10 actual fixed category resets and20 retained-scroll healthy outcomes passed.');
