import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from '../lib/playwrightLoader.mjs';

const base = 'http://127.0.0.1:4173';
const mode = process.env.REPORT_DRAFT_MODE;
const artifactRoot = process.env.REPORT_DRAFT_OUT;
const originalHead = '775564305e9da84dab59f2b9fe246d044a3cc8e9';
assert(['baseline', 'fixed'].includes(mode), 'Explicit source arm');
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs'), 'Ordinary offline transport inherited');
assert(artifactRoot && path.isAbsolute(artifactRoot), 'External evidence root');
assert(path.relative(process.cwd(), artifactRoot).split(path.sep).includes('..'), 'Evidence outside source');
const out = path.join(artifactRoot, 'browser');
assert(!fs.existsSync(out), 'Fresh browser evidence directory'); fs.mkdirSync(out, { recursive: true });
const hash = body => createHash('sha256').update(body).digest('hex');
const git = args => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
const sourceFiles = [
  'src/components/game/ReportSiteIssue.tsx', 'src/components/game/ReportQuestion.tsx',
  'src/lib/reportContext.ts', 'src/components/game/reportKinds.ts',
  'src/components/game/Footer.tsx', 'src/components/seo/GameSeoContent.tsx',
  'src/pages/PerfectSeasonNba.tsx', 'src/components/ui/dialog.tsx',
];
const source = sourceFiles.map((file, index) => {
  const original = git(['show', originalHead + ':' + file]), actual = fs.readFileSync(file);
  assert.equal(original.equals(actual), index < 2 ? mode === 'baseline' : true, file + ' has its declared source arm');
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
const forms = [
  { id: 'footer', route: '/', source: 'footer-report-button', gameType: 'site', submit: 'Send report', success: 'Got it, thank you!', selector: '#root footer' },
  { id: 'game', route: '/perfect-season-nba', source: 'game-report-button', gameType: 'perfect-season-nba', submit: 'Submit Report', success: 'Thanks for reporting!', selector: '#root [data-seo-content] > [data-no-prerender]' },
];
const scenarios = ['pending-relay', 'old-success-timer', 'normal-held-fallback'];
const specs = forms.flatMap(form => [390, 1280].flatMap(width => scenarios.map(scenario => ({ form, width, scenario, id: form.id + '-' + width + '-' + scenario }))));
const report = {
  version: 1, mode, originalHead, source, productQualified: false, status: 'failed',
  scope: 'Two actual built production report forms, fully intercepted report delivery, no real report or email.',
  clock: 'Finite Playwright page clock installed only after route hydration. Paused before form interaction; explicit 250ms dialog transitions, a separate 1ms focus cleanup turn after DOM removal, and 1499/1500/1501ms success deadlines. No app state injection.',
  census: specs.map(spec => ({ id: spec.id, form: spec.form.id, route: spec.form.route, width: spec.width, input: spec.width === 390 ? 'touch and native text input' : 'keyboard', scenario: spec.scenario, originalFaultExpected: spec.scenario !== 'normal-held-fallback' })),
  expected: { contexts: 12, originalFaults: mode === 'baseline' ? 8 : 0, healthyDeliveryContexts: 4 }, cases: [],
};
const wall = ms => new Promise(resolve => setTimeout(resolve, ms));
const poll = async (label, read, predicate) => {
  for (let attempt = 0; attempt < 150; attempt++) {
    const value = await read(); if (predicate(value)) return value;
    await wall(20);
  }
  assert.fail('Setup or completion did not reach ' + label + '; this is not an original-fault observation');
};
const browser = await chromium.launch({ headless: true });
try {
  for (const spec of specs) {
    const { form, width, scenario } = spec;
    const row = { id: spec.id, form: form.id, route: form.route, width, scenario, status: 'failed', originalFault: false, actions: [], requests: [], reportRequests: [], readFixtures: [], externalFulfilled: [], unexpectedWrites: [], errors: [], assets: [], screenshots: [], observations: [] };
    report.cases.push(row);
    const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, isMobile: width === 390, hasTouch: width === 390, locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: base, localStorage: [{ name: 'cookie-consent', value: 'essential' }, { name: 'rules-gate-seen:' + form.route, value: '1' }] }] } });
    const held = new Map(), responses = [];
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
            assert.equal(request.postData(), '{"p_min":3,"p_limit":3}', 'Exact existing read-only most-played RPC arguments');
            row.readFixtures.push({ url: url.href, method: request.method(), rawBody: request.postData(), body: request.postDataJSON(), reply: [], intercepted: true, fulfilled: true });
            return await route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: '[]' });
          }
          const channel = url.pathname === '/functions/v1/report-relay' ? 'relay' : url.pathname === '/rest/v1/question_reports' ? 'fallback' : null;
          if (channel) {
            assert.equal(url.origin, 'https://flawuiqbvjobmkfkauhw.supabase.co', 'Only the existing production report transport shape');
            assert.equal(request.method(), 'POST', 'Report delivery uses POST');
            assert(!held.has(channel), 'At most one outstanding request per delivery channel');
            const captured = { channel, url: url.href, method: request.method(), rawBody: request.postData(), body: request.postDataJSON(), intercepted: true, fulfilled: false };
            row.reportRequests.push(captured);
            return await new Promise(resolve => {
              held.set(channel, { finish: async body => {
                await route.fulfill({ status: channel === 'fallback' ? 201 : 200, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
                captured.fulfilled = true; captured.reply = body; held.delete(channel); resolve();
              } });
            });
          }
          if (cache.has(url.href)) return await route.fulfill({ status: 200, headers: cors, ...cache.get(url.href) });
          assert.notEqual(request.resourceType(), 'font', 'Every requested font has its verified cached body');
          if (request.method() !== 'GET') row.unexpectedWrites.push({ url: url.href, method: request.method(), body: request.postData() });
          assert.equal(request.method(), 'GET', 'No external application write beyond the fully intercepted reports');
          if (request.resourceType() === 'image') return await route.fulfill({ status: 200, headers: cors, contentType: 'image/png', body: emptyImage });
          if (request.resourceType() === 'script') return await route.fulfill({ status: 200, headers: cors, contentType: 'application/javascript', body: '' });
          if (request.resourceType() === 'stylesheet') return await route.fulfill({ status: 200, headers: cors, contentType: 'text/css', body: '' });
          return await route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: url.pathname.startsWith('/auth/') ? '{}' : '[]' });
        } catch (error) { row.errors.push('Route: ' + String(error?.stack ?? error)); try { await route.abort('failed'); } catch {} }
      });
      await context.routeWebSocket('**/*', socket => socket.close());
      page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on('pageerror', error => row.errors.push('Page: ' + error.message));
      page.on('console', message => { if (message.type() === 'error') row.errors.push('Console: ' + message.text()); });
      page.on('response', response => {
        if (new URL(response.url()).origin !== base) return;
        responses.push((async () => {
          assert.equal(response.status(), 200, response.url());
          const body = await response.body(), pathname = new URL(response.url()).pathname;
          const relative = pathname.endsWith('/') ? pathname + 'index.html' : path.extname(pathname) ? pathname : pathname + '/index.html';
          const physical = path.resolve('dist', '.' + decodeURIComponent(relative));
          assert(physical.startsWith(path.resolve('dist') + path.sep), 'Actual response stays within dist');
          assert.equal(hash(body), hash(fs.readFileSync(physical)), 'Every local response matches completed physical dist');
          row.assets.push({ path: pathname, bytes: body.length, sha256: hash(body) });
        })().catch(error => row.errors.push('Response: ' + String(error?.stack ?? error))));
      });
      const trigger = page.locator(form.selector).getByRole('button', { name: 'Report a problem', exact: true });
      const dialog = page.getByRole('dialog', { name: 'Report a problem', exact: true });
      const textbox = dialog.getByRole('textbox', { name: 'Describe the problem', exact: true });
      const send = dialog.locator('button.w-full');
      const activate = async (locator, label) => {
        assert.equal(await locator.count(), 1, label + ' is one actual control');
        assert(await locator.isVisible(), label + ' is visible');
        if (width === 390) {
          const box = await locator.boundingBox(); assert(box && box.x >= -1 && box.y >= -1 && box.x + box.width <= width + 1 && box.y + box.height <= 845, label + ' fits the touch viewport');
          await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        } else { await locator.focus(); assert(await locator.evaluate(element => document.activeElement === element), label + ' receives keyboard focus'); await page.keyboard.press('Enter'); }
        row.actions.push({ action: label, input: width === 390 ? 'native touch' : 'keyboard Enter', at: await page.evaluate(() => Date.now()) });
      };
      const read = () => page.evaluate(success => {
        const element = document.querySelector('[role="dialog"][data-state="open"]');
        if (!element) return { open: false, success: false, details: null, category: null, disabled: null, error: false };
        const textarea = element.querySelector('textarea'), send = element.querySelector('button.w-full');
        return { open: true, success: element.textContent.includes(success), details: textarea?.value ?? null, category: [...element.querySelectorAll('button')].find(button => button.classList.contains('bg-primary'))?.textContent ?? '', disabled: send?.disabled ?? null, error: element.textContent.includes('Something went wrong. Try again.') };
      }, form.success);
      const observe = async label => { const value = await read(); row.observations.push({ label, clock: await page.evaluate(() => Date.now()), ...value }); return value; };
      const stores = () => page.evaluate(() => ({ local: Object.fromEntries(Object.entries(localStorage).sort()), session: Object.fromEntries(Object.entries(sessionStorage).sort()) }));
      const screenshot = async (label, fullPage = false) => {
        const state = await observe(label);
        if (state.open) {
          const box = await dialog.boundingBox(); assert(box && box.x >= -1 && box.y >= -1 && box.x + box.width <= width + 1 && box.y + box.height <= 845, 'Current form fits its readable viewport');
          row.observations.at(-1).dialogBounds = box;
        }
        const name = spec.id + '-' + label;
        await page.screenshot({ path: path.join(out, name + '-viewport.png'), fullPage: false, animations: 'disabled' }); row.screenshots.push(name + '-viewport.png');
        if (fullPage) { await page.screenshot({ path: path.join(out, name + '-full.png'), fullPage: true, animations: 'disabled' }); row.screenshots.push(name + '-full.png'); }
      };
      const open = async () => { await activate(trigger, 'open actual ' + form.id + ' report'); await poll('open report dialog', read, value => value.open); };
      const settleClosedDialog = async () => {
        await poll('closed report DOM commit', read, value => !value.open);
        await page.clock.runFor(250);
        await poll('removed report dialog', async () => page.locator('[role="dialog"]').count(), count => count === 0);
        await page.clock.runFor(1);
      };
      const close = async () => {
        await activate(dialog.getByRole('button', { name: 'Close', exact: true }), 'close report');
        await settleClosedDialog();
        assert(await trigger.evaluate(element => document.activeElement === element), 'Manual close returns focus to the actual trigger');
      };
      const edit = async (details, category) => {
        assert.equal(await textbox.count(), 1, 'The current form has an editable textbox');
        if (width === 390) {
          const box = await textbox.boundingBox(); assert(box); await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        } else await textbox.focus();
        await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.insertText(details);
        await activate(dialog.getByRole('button', { name: category, exact: true }), 'select ' + category);
        assert.equal(await textbox.inputValue(), details, 'Native input edits the current draft');
        row.actions.push({ action: 'native text input', text: details, at: await page.evaluate(() => Date.now()) });
      };
      const release = async (channel, reply) => { await poll('held ' + channel + ' request', async () => held.has(channel), Boolean); await held.get(channel).finish(reply); };
      const assertDraft = async text => {
        const value = await read(); assert(value.open && !value.success && !value.error, 'The current draft remains an editable dialog');
        assert.equal(value.details, text); assert.equal(value.category, 'Idea'); assert.equal(value.disabled, false); return value;
      };

      await page.goto(base + form.route);
      await trigger.waitFor(); assert.equal(await trigger.count(), 1, 'The production placement supplies exactly one selected report trigger');
      if (form.id === 'game') {
        await page.locator('#root [data-seo-content="ready"]').waitFor();
        assert(await trigger.evaluate(element => !!element.closest('[data-seo-content]')?.querySelector('article') && element.closest('[data-no-prerender]').parentElement.firstElementChild === element.closest('[data-no-prerender]')), 'Actual game report sits above its loaded guide');
      }
      await trigger.scrollIntoViewIfNeeded();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      if (form.route === '/') {
        assert(await page.evaluate(() => scrollY > 0), 'The native footer scroll reached a positive home offset');
        row.initialNativeScroll = await poll('native home scroll memory settled', () => page.evaluate(() => ({ y: scrollY, saved: sessionStorage.getItem('home-scroll-y') })), value => value.y > 0 && value.saved === String(value.y));
      }
      row.storesBefore = await stores();
      row.hydratedDateET = await page.evaluate(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()));
      await page.clock.install({ time: new Date('2026-10-18T16:00:00.000Z') });
      await page.clock.pauseAt(new Date('2026-10-18T16:00:01.000Z'));
      await open();
      const initial = await read(); assert.deepEqual(initial, { open: true, success: false, details: '', category: '', disabled: true, error: false });
      assert.equal(await dialog.getByRole('button', { name: 'Duplicate question', exact: true }).count(), 0, 'Neither chosen production form asks a question');
      const oldText = 'QA fictional draft ' + spec.id + ' before sending';
      const newText = 'QA fictional newer draft ' + spec.id + ' must stay editable';
      await edit(oldText, 'Bug'); assert.equal(await send.innerText(), form.submit); assert.equal(await send.isEnabled(), true);
      const expectedContext = await page.evaluate(({ source, game, puzzleDate }) => {
        const entry = document.querySelector('script[type="module"][src]');
        const result = { path: location.pathname, date: '2026-10-18', submittedAt: new Date().toISOString(), source, contextTruncated: false };
        if (game) Object.assign(result, { phase: 'mode-select', mode: 'classic', puzzleDate, decade: null, theme: null, spins: 0, rerolls: 2, squad: null, selected: null, picks: ['PG', 'SG', 'SF', 'PF', 'C', 'SIXTH'].map(slot => [slot, null]), openSlots: ['PG', 'SG', 'SF', 'PF', 'C', 'SIXTH'], result: null, lockedResult: null });
        result.diagnostics = { build: new URL(entry.src).pathname.split('/').pop(), viewport: { width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio }, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, browser: navigator.userAgent.slice(0, 200), language: navigator.language };
        return result;
      }, { source: form.source, game: form.id === 'game', puzzleDate: row.hydratedDateET });
      const expectedPayload = { game_type: form.gameType, game_context: expectedContext, description: 'Bug: ' + oldText }; row.expectedPayload = expectedPayload;
      await activate(send, 'submit captured draft');
      await poll('held relay request', async () => held.has('relay'), Boolean);
      assert.equal((await read()).disabled, true, 'Send is disabled while delivery is pending');
      if (width === 390) { const box = await send.boundingBox(); assert(box); await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); }
      else await page.keyboard.press('Enter');
      row.actions.push({ action: 'second native submission attempt while disabled', input: width === 390 ? 'native touch' : 'keyboard Enter', at: await page.evaluate(() => Date.now()) });
      await wall(60); assert.equal(row.reportRequests.length, 1, 'A second native submission action cannot duplicate the pending report');
      assert.deepEqual(row.reportRequests[0].body, expectedPayload, 'Relay captured the complete original payload and bounded actual route context');
      await screenshot('held-relay', true);

      if (scenario === 'pending-relay') {
        await close(); await open(); await edit(newText, 'Idea'); assert.equal((await read()).disabled, true, 'A reopened pending form keeps duplicate prevention');
        await screenshot('new-draft-before-old-completion'); await release('relay', { ok: true });
        await poll('old completion UI', read, value => value.success || value.disabled === false);
        const settled = await observe('old-relay-completed');
        if (mode === 'baseline') {
          assert.deepEqual(settled, { open: true, success: true, details: null, category: '', disabled: null, error: false }, 'Original late completion visibly replaced the newer draft');
          row.originalFault = true; row.fault = 'Old relay completion replaces the reopened, edited draft with its success panel';
          await screenshot('observed-original-completion-fault', true); await page.clock.runFor(1501); await poll('original forced close', read, value => !value.open);
          await settleClosedDialog(); await open(); assert.equal((await read()).details, '', 'Original older reset erased the newer draft'); assert.equal((await read()).category, '');
          await screenshot('original-erased-draft');
        } else { await assertDraft(newText); await page.clock.runFor(1501); await assertDraft(newText); await screenshot('preserved-after-old-completion', true); }
      } else if (scenario === 'old-success-timer') {
        await release('relay', { ok: true }); await poll('successful original delivery', read, value => value.success);
        const successAt = await page.evaluate(() => Date.now()); await screenshot('success-before-close');
        await close(); await open();
        const reopened = await observe('reopened-before-old-timer');
        if (mode === 'baseline') {
          assert(reopened.open && reopened.success && reopened.details === null, 'Original reopening visibly retains the old success panel, with no textbox to edit');
          row.originalFault = true; row.fault = 'Reopening retains the old success panel and its timer forces close and reset';
          await screenshot('observed-original-stale-success', true);
        } else { assert(reopened.open && !reopened.success && reopened.details !== null, 'Reopening exposes an editable current draft'); await edit(newText, 'Idea'); await screenshot('new-draft-before-old-timer'); }
        const remaining = 1501 - (await page.evaluate(() => Date.now()) - successAt); assert(remaining > 0 && remaining <= 1501, 'The old deadline has not yet elapsed');
        row.oldTimer = { successAt, remainingMs: remaining, targetMs: 1501 };
        await page.clock.runFor(remaining);
        if (mode === 'baseline') {
          await poll('original old-timer forced close', read, value => !value.open); await settleClosedDialog(); await screenshot('original-forced-close');
          await open(); assert.equal((await read()).details, ''); assert.equal((await read()).category, ''); await screenshot('original-reset-on-reopen');
        } else { await assertDraft(newText); await screenshot('preserved-past-old-timer', true); }
      } else {
        await release('relay', { ok: false }); await poll('held direct fallback', async () => held.has('fallback'), Boolean);
        assert.equal((await read()).disabled, true, 'Send remains disabled while fallback is pending');
        assert.equal(row.reportRequests.length, 2); assert.deepEqual(row.reportRequests[1].body, expectedPayload, 'Direct fallback delivers exactly the already captured report');
        await screenshot('held-fallback'); await release('fallback', {}); await poll('normal success panel', read, value => value.success);
        await screenshot('normal-success'); await page.clock.runFor(1499); assert((await observe('normal-success-at1499ms')).success, 'Normal success remains visible at1499ms');
        await page.clock.runFor(1); await poll('normal1500ms auto close', read, value => !value.open); await observe('normal-closed-at1500ms'); await settleClosedDialog();
        assert(await trigger.evaluate(element => document.activeElement === element), 'Normal success returns focus to its actual trigger');
        await open(); assert.deepEqual(await read(), initial, 'A normally completed report reopens blank with no stale category or success');
        await screenshot('normal-blank-reopen', true); row.healthyDelivery = true;
      }
      assert.equal(row.reportRequests.length, scenario === 'normal-held-fallback' ? 2 : 1, 'No draft inspection or old completion sends another report');
      assert(row.reportRequests.every(request => request.intercepted && request.fulfilled), 'Every report POST was fully intercepted and locally fulfilled');
      assert.equal(held.size, 0, 'No delivery remains held');
      row.storesAfter = await stores(); assert.deepEqual(row.storesAfter, row.storesBefore, 'Report lifecycle changes no local or session saved game field');
      await Promise.all(responses); assert(row.assets.length > 5 && row.assets.some(asset => asset.path === form.route || asset.path === form.route + '/'), 'Actual document and application assets loaded');
      assert.deepEqual(row.errors, []); assert.deepEqual(row.unexpectedWrites, []);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Actual route fits the declared viewport');
      row.status = 'passed';
    } catch (error) { row.failure = String(error?.stack ?? error); if (page) { try { await page.screenshot({ path: path.join(out, spec.id + '-failed-viewport.png'), fullPage: false, animations: 'disabled' }); row.screenshots.push(spec.id + '-failed-viewport.png'); } catch {} } throw error; }
    finally { await context.close(); }
  }
  report.observedOriginalFaults = report.cases.filter(row => row.originalFault).length;
  report.healthyDeliveryContexts = report.cases.filter(row => row.healthyDelivery).length;
  assert.deepEqual(report.cases.map(row => row.id), report.census.map(row => row.id), 'Exact twelve-context census');
  assert.equal(report.observedOriginalFaults, report.expected.originalFaults); assert.equal(report.healthyDeliveryContexts, 4);
  for (const row of source) assert.equal(hash(fs.readFileSync(row.file)), row.actualSha256, 'Browser proof holds every bound source byte');
  assert(sourceStatus.equals(git(['status', '--porcelain=v1', '--untracked-files=all'])), 'Browser proof holds checkout membership and status');
  assert(process.env.SIM_OFFLINE_RECEIPT, 'Browser transport receipt declared');
  assert.equal(fs.existsSync(process.env.SIM_OFFLINE_RECEIPT) ? fs.readFileSync(process.env.SIM_OFFLINE_RECEIPT, 'utf8') : '', '', 'Ordinary browser transport receipt is empty');
  report.status = 'passed';
  console.log('Report draft lifecycle browser: ' + mode + ',12 actual form contexts,' + report.observedOriginalFaults + ' observed original session faults,4 healthy held fallback deliveries.');
} finally {
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
