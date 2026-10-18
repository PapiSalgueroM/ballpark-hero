import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { webkit } from '../lib/playwrightLoader.mjs';

const base = 'http://127.0.0.1:4173', routePath = '/tennis-chain';
const api = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const mode = process.env.TENNIS_SCORE_MODE, evidenceRoot = process.env.TENNIS_SCORE_OUT;
assert(['baseline', 'fixed'].includes(mode), 'Explicit source arm');
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs'), 'Ordinary offline preload inherited');
assert(evidenceRoot && path.isAbsolute(evidenceRoot) && path.relative(process.cwd(), evidenceRoot).split(path.sep).includes('..'), 'External evidence root');
const out = path.join(evidenceRoot, 'browser'); assert(!fs.existsSync(out), 'Fresh browser evidence'); fs.mkdirSync(out, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
const originalHead = '775564305e9da84dab59f2b9fe246d044a3cc8e9';
const sourceFiles = ['src/components/tennis-chain/TennisChainBoard.tsx', 'src/hooks/useTennisChain.ts',
  'src/components/tennis-chain/TennisChainSearch.tsx', 'src/components/game/PlayerAutocomplete.tsx',
  'src/lib/playerSearch.ts', 'src/types/tennisChain.ts', 'src/pages/TennisChain.tsx', 'src/hooks/useGameCompletion.ts', 'src/lib/completions.ts'];
const source = sourceFiles.map((file, index) => {
  const actual = fs.readFileSync(file), original = git(['show', originalHead + ':' + file]);
  assert.equal(actual.equals(original), index === 0 ? mode === 'baseline' : true, file + ' declared source arm');
  return { file, originalSha256: hash(original), actualSha256: hash(actual) };
});
const sourceStatus = git(['status', '--porcelain=v1', '--untracked-files=all']);
const fontRoot = process.env.FREE_KICK_FONT_CACHE; assert(fontRoot && path.isAbsolute(fontRoot), 'Verified font cache');
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(fontRoot, 'manifest.json'))).map(row => {
  const body = fs.readFileSync(path.join(fontRoot, row.file)); assert.equal(hash(body), row.sha256, row.url); return [row.url, { body, contentType: row.contentType }];
}));
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info', 'access-control-allow-methods': 'GET,HEAD,POST,OPTIONS', 'access-control-expose-headers': 'content-range' };
const emptyImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV0sAAAAASUVORK5CYII=', 'base64');
const oldRow = { nickname: 'Fixture Alpha', score: 100, chain_length: 1, mode: 'unlimited' };
const newRow = { nickname: 'Fixture Beta', score: 0, chain_length: 0, mode: 'unlimited' };
const scenarios = ['late-insert', 'late-rank', 'overlap-insert', 'overlap-rank', 'normal-success', 'normal-error-retry'];
const specs = [390, 1280].flatMap(width => scenarios.map(scenario => ({ width, scenario, id: width + '-' + scenario })));
const report = { version: 1, mode, originalHead, source, productQualified: false, status: 'failed',
  scope: 'Actual production Tennis Chain board, actual hook and actual autocomplete. Fictional search and validator responses, all score and completion POSTs locally fulfilled. Native return-to-control scrolling is explicit; no no-scroll qualification. No live writes.',
  clock: 'Real browser clock, no application state injection. Math.random pinned only to choose a deterministic existing starter and guest handle.',
  census: specs.map(spec => ({ ...spec, route: routePath, input: spec.width === 390 ? 'native touch and text input' : 'keyboard', originalFaultExpected: !spec.scenario.startsWith('normal-') })),
  expected: { contexts: 12, originalFaults: mode === 'baseline' ? 8 : 0, healthyContexts: 4 }, cases: [] };
const wall = ms => new Promise(resolve => setTimeout(resolve, ms));
const poll = async (label, read, accept) => {
  for (let attempt = 0; attempt < 200; attempt++) { const value = await read(); if (accept(value)) return value; await wall(20); }
  assert.fail('Setup or completion did not reach ' + label + '; no timeout or setup fault credit');
};
const browser = await webkit.launch({ headless: true });
assert.equal(browser.version(), '27.2', 'Pinned WebKit fixture engine');
report.browserEngine = 'webkit'; report.browserVersion = browser.version();
try {
  for (const spec of specs) {
    const { width, scenario } = spec;
    const row = { ...spec, status: 'failed', originalFault: false, healthy: false, actions: [], requests: [], scoreRequests: [], rankRequests: [], completions: [], validators: [], searchFixtures: [], readFixtures: [], externalFulfilled: [], unexpectedWrites: [], errors: [], expectedHttpErrors: [], assets: [], observations: [], storeHolds: [], screenshots: [] };
    report.cases.push(row);
    const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, isMobile: width === 390, hasTouch: width === 390, locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: base, localStorage: [{ name: 'cookie-consent', value: 'essential' }, { name: 'rules-gate-seen:' + routePath, value: '1' }, { name: 'dukb-guest-handle', value: 'FixtureChainGuest' }, { name: 'tennis-score-held-save', value: '{"held":true}' }] }] } });
    const held = new Map(), responses = [], rankByRequest = new Map();
    let page;
    try {
      await context.addInitScript(() => { Math.random = () => 0; });
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url()), method = request.method();
        row.requests.push({ url: url.href, method, resourceType: request.resourceType() });
        const json = (body, status = 200, headers = {}) => route.fulfill({ status, headers: { ...cors, ...headers }, contentType: 'application/json', body: JSON.stringify(body) });
        const hold = (key, captured, finish) => new Promise(resolve => {
          assert(!held.has(key), 'Unique held transport boundary'); held.set(key, { finish: async () => { await finish(); captured.fulfilled = true; held.delete(key); resolve(); } });
        });
        try {
          if (url.origin === base) { assert.equal(method, 'GET', 'No local write'); return await route.continue(); }
          row.externalFulfilled.push(url.href);
          if (method === 'OPTIONS') return await route.fulfill({ status: 204, headers: { ...cors, 'access-control-allow-headers': request.headers()['access-control-request-headers'] || cors['access-control-allow-headers'] }, body: '' });
          if (url.origin === api && url.pathname === '/rest/v1/tennis_players') {
            assert.equal(method, 'GET'); assert.equal(url.searchParams.get('select'), 'player_name');
            row.searchFixtures.push({ url: url.href, method, reply: [{ player_name: 'Fixture Tennis Link' }] });
            return await json([{ player_name: 'Fixture Tennis Link' }]);
          }
          if (url.origin === api && url.pathname === '/functions/v1/tennis-chain-validate') {
            assert.equal(method, 'POST'); const body = request.postDataJSON();
            assert.deepEqual(Object.keys(body).sort(), ['currentPlayer', 'guessedPlayer']); assert.equal(body.guessedPlayer, 'Fixture Tennis Link'); assert.equal(typeof body.currentPlayer, 'string'); assert(body.currentPlayer.length > 0 && body.currentPlayer !== body.guessedPlayer);
            row.validators.push({ body, intercepted: true, fulfilled: true }); return await json({ valid: true, fullName: 'Fixture Tennis Link', connection: 'Synthetic fixture connection' });
          }
          if (url.origin === api && url.pathname === '/rest/v1/tennis_chain_scores') {
            if (method === 'POST') {
              const captured = { method, url: url.href, rawBody: request.postData(), body: request.postDataJSON(), intercepted: true, fulfilled: false };
              row.scoreRequests.push(captured); const index = row.scoreRequests.length;
              const fail = scenario === 'normal-error-retry' && index === 1;
              const finish = () => json(fail ? { code: 'FIXTURE_INSERT', message: 'Fixture insert unavailable', details: null, hint: null } : null, fail ? 400 : 201);
              if ((!scenario.startsWith('normal-') && scenario.endsWith('insert') && index === 1) || (!scenario.startsWith('normal-') && index === 2)) return await hold(index === 1 ? 'old-insert' : 'new-insert', captured, finish);
              await finish(); captured.fulfilled = true; return;
            }
            if (method === 'HEAD') {
              const length = url.searchParams.get('chain_length'); assert(['gt.1', 'gt.0'].includes(length));
              const count = scenario === 'normal-error-retry' && row.rankRequests.length === 0 ? null : 6;
              const captured = { method, url: url.href, chainLength: Number(length.slice(3)), count, intercepted: true, fulfilled: false, responses: [], terminals: [] }; row.rankRequests.push(captured); rankByRequest.set(request, captured);
              const finish = () => route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json', 'content-length': '0', ...(count === null ? {} : { 'content-range': '0-0/' + count }) }, body: '' });
              if (!scenario.startsWith('normal-') && scenario.endsWith('rank') && row.rankRequests.length === 1) return await hold('old-rank', captured, finish);
              await finish(); captured.fulfilled = true; return;
            }
            assert.equal(method, 'GET'); assert.equal(url.searchParams.get('select'), 'nickname,chain_length,score'); assert.equal(url.searchParams.get('limit'), '10'); return await json([]);
          }
          if (url.origin === api && url.pathname === '/rest/v1/game_completions' && method === 'POST') {
            const body = request.postDataJSON(); assert.equal(body.game, routePath.slice(1)); assert([100, 0].includes(body.score)); assert.equal(body.player_name, 'FixtureChainGuest');
            row.completions.push({ body, intercepted: true, fulfilled: true }); return await json(null, 201);
          }
          if (url.origin === api && url.pathname === '/rest/v1/rpc/most_played_today' && method === 'POST') {
            assert.equal(request.postData(), '{"p_min":3,"p_limit":3}'); row.readFixtures.push({ url: url.href, method, body: request.postDataJSON(), reply: [] }); return await json([]);
          }
          if (fonts.has(url.href)) return await route.fulfill({ status: 200, headers: cors, ...fonts.get(url.href) });
          assert.notEqual(request.resourceType(), 'font', 'Every font has verified cached bytes');
          if (method !== 'GET') row.unexpectedWrites.push({ url: url.href, method, body: request.postData() });
          assert.equal(method, 'GET', 'No unclassified external write');
          if (request.resourceType() === 'image') return await route.fulfill({ status: 200, headers: cors, contentType: 'image/png', body: emptyImage });
          if (request.resourceType() === 'script') return await route.fulfill({ status: 200, headers: cors, contentType: 'application/javascript', body: '' });
          if (request.resourceType() === 'stylesheet') return await route.fulfill({ status: 200, headers: cors, contentType: 'text/css', body: '' });
          return await json(url.pathname.startsWith('/auth/') ? {} : []);
        } catch (error) { row.errors.push('Route: ' + String(error?.stack ?? error)); try { await route.abort('failed'); } catch {} }
      });
      await context.routeWebSocket('**/*', socket => socket.close());
      page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on('pageerror', error => row.errors.push('Page: ' + error.message));
      page.on('requestfinished', request => { const rank = rankByRequest.get(request); if (rank) rank.terminals.push({ event: 'requestfinished', failure: request.failure() }); });
      page.on('requestfailed', request => { const rank = rankByRequest.get(request); if (rank) rank.terminals.push({ event: 'requestfailed', failure: request.failure() }); row.errors.push('Request: ' + request.url() + ' ' + JSON.stringify(request.failure())); });
      page.on('console', message => {
        if (message.type() !== 'error') return;
        if (scenario === 'normal-error-retry' && message.location().url.startsWith(api + '/rest/v1/tennis_chain_scores') && /^Failed to load resource: the server responded with a status of 400/.test(message.text())) row.expectedHttpErrors.push({ text: message.text(), url: message.location().url });
        else row.errors.push('Console: ' + message.text());
      });
      page.on('response', response => {
        const rank = rankByRequest.get(response.request());
        if (rank) { rank.responses.push({ status: response.status(), headers: response.headers() }); return; }
        if (new URL(response.url()).origin !== base) return;
        responses.push((async () => {
          assert.equal(response.status(), 200, response.url()); const body = await response.body(), pathname = new URL(response.url()).pathname;
          const relative = pathname.endsWith('/') ? pathname + 'index.html' : path.extname(pathname) ? pathname : pathname + '/index.html';
          const physical = path.resolve('dist', '.' + decodeURIComponent(relative)); assert(physical.startsWith(path.resolve('dist') + path.sep));
          assert.equal(hash(body), hash(fs.readFileSync(physical)), 'Local response matches physical completed dist'); row.assets.push({ path: pathname, bytes: body.length, sha256: hash(body) });
        })().catch(error => row.errors.push('Response: ' + String(error?.stack ?? error))));
      });
      const nickname = page.getByRole('textbox', { name: 'Your nickname', exact: true });
      const save = () => nickname.locator('..').getByRole('button');
      const read = () => page.evaluate(() => {
        const input = document.querySelector('[aria-label="Your nickname"]'), button = input?.parentElement?.querySelector('button');
        const root = document.querySelector('#root');
        return { nickname: input?.value ?? null, disabled: button?.disabled ?? null, saveText: button?.textContent ?? null, rank: root?.textContent.match(/You ranked #\d+ today!/)?.[0] ?? null, finalScore: root?.textContent.match(/Final Score: \d+/)?.[0] ?? null };
      });
      const observe = async label => { const value = await read(); row.observations.push({ label, ...value }); return value; };
      const stores = () => page.evaluate(() => ({ local: Object.fromEntries(Object.entries(localStorage).sort()), session: Object.fromEntries(Object.entries(sessionStorage).sort()) }));
      const scroll = async (locator, label) => {
        const before = await page.evaluate(() => ({ x: scrollX, y: scrollY })), boundsBefore = await locator.boundingBox();
        await locator.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
        row.actions.push({ action: 'return to ' + label, input: 'native DOM scrollIntoView', before, after: await page.evaluate(() => ({ x: scrollX, y: scrollY })), boundsBefore, boundsAfter: await locator.boundingBox() });
      };
      const activate = async (locator, label, disabledAttempt = false) => {
        assert.equal(await locator.count(), 1, label + ' selects one actual control'); assert(await locator.isVisible(), label + ' is visible'); await scroll(locator, label);
        if (!disabledAttempt) assert(await locator.isEnabled(), label + ' is enabled');
        if (width === 390) { const box = await locator.boundingBox(); assert(box && box.x >= -1 && box.y >= -1 && box.x + box.width <= width + 1 && box.y + box.height <= 845, label + ' fits touch viewport'); await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); }
        else if (disabledAttempt) await page.keyboard.press('Enter');
        else { await locator.focus(); assert(await locator.evaluate(element => document.activeElement === element), label + ' receives native keyboard focus'); await page.keyboard.press('Enter'); }
        row.actions.push({ action: label, input: width === 390 ? 'native touch' : 'keyboard Enter', disabledAttempt });
      };
      const type = async (locator, text, label) => {
        await scroll(locator, label);
        if (width === 390) { const box = await locator.boundingBox(); assert(box); await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); } else await locator.focus();
        await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.insertText(text); assert.equal(await locator.inputValue(), text); row.actions.push({ action: label, input: 'native text input', text });
      };
      const shot = async (label, fullPage = false) => {
        await scroll(page.getByText(/^Final Score:/), 'current result screenshot'); await observe(label);
        const target = (await nickname.count()) ? nickname : page.getByText(/^You ranked #/);
        const bounds = await target.boundingBox(); assert(bounds && bounds.x >= -1 && bounds.y >= -1 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= 845, 'Current result target fits readable viewport');
        const name = spec.id + '-' + label; await page.screenshot({ path: path.join(out, name + '-viewport.png'), fullPage: false, animations: 'disabled' }); row.screenshots.push(name + '-viewport.png');
        if (fullPage) { await page.screenshot({ path: path.join(out, name + '-full.png'), fullPage: true, animations: 'disabled' }); row.screenshots.push(name + '-full.png'); }
      };
      const release = async key => { await poll('held ' + key, async () => held.has(key), Boolean); await held.get(key).finish(); };
      const assertUnsaved = async (pending = false) => { const value = await read(); assert.equal(value.nickname, 'Fixture Beta', 'Current round keeps its nickname form'); assert.equal(value.rank, null); assert.equal(value.finalScore, 'Final Score: 0'); assert.equal(value.disabled, pending); assert.equal(value.saveText, pending ? '...' : 'Save'); };
      const start = async links => {
        await activate(page.getByRole('button', { name: /🔄 Unlimited/ }), 'start actual Unlimited mode');
        await page.getByRole('button', { name: 'Give Up', exact: true }).waitFor();
        if (links) {
          const search = page.getByRole('combobox', { name: 'Type a player who beat them at a Grand Slam...', exact: true });
          await type(search, 'Fixture Tennis Link', 'search fictional tennis link');
          const option = page.getByRole('option', { name: 'Fixture Tennis Link', exact: true }); await option.waitFor();
          await activate(option, 'pick actual autocomplete suggestion');
          await poll('actual accepted link score100', () => page.getByText('Score: 100', { exact: true }).count(), count => count === 1);
        }
        await activate(page.getByRole('button', { name: 'Give Up', exact: true }), 'finish actual chain');
        await poll('actual finished score', read, value => value.finalScore === 'Final Score: ' + links * 100 && value.nickname === '');
      };
      const settledBookkeeping = async () => {
        await poll('actual guest badge initialization after completion', () => page.evaluate(() => localStorage.getItem('dukb-earned-badges-v1')), value => value === '[]');
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      };
      const next = async () => { await activate(page.getByRole('button', { name: 'Play Again', exact: true }), 'reset actual finished round'); await start(0); await type(nickname, 'Fixture Beta', 'enter current nickname'); await poll('two actual completion rows', async () => row.completions.length, count => count === 2); await settledBookkeeping(); };
      const storeHold = async (label, before) => { const after = await stores(); assert.deepEqual(after, before, 'Score save preserves every local and session storage field'); row.storeHolds.push({ label, before, after }); };

      await page.goto(base + routePath); await page.getByRole('button', { name: /🔄 Unlimited/ }).waitFor();
      await start(1); await type(nickname, 'Fixture Alpha', 'enter captured original nickname');
      await poll('first actual completion row', async () => row.completions.length, count => count === 1);
      await settledBookkeeping();
      assert.equal(row.validators.length, 1); assert(row.searchFixtures.length >= 2, 'Actual autocomplete used its two real database query legs');
      const normalStores = await stores(); await activate(save(), 'submit captured original score');
      await poll('first captured score insert', async () => row.scoreRequests.length, count => count === 1); assert.deepEqual(row.scoreRequests[0].body, oldRow);
      if (!scenario.startsWith('normal-')) {
        const boundary = scenario.endsWith('insert') ? 'old-insert' : 'old-rank'; await poll('original held boundary', async () => held.has(boundary), Boolean);
        assert.equal((await read()).disabled, true, 'Original pending score prevents duplicates');
        await activate(save(), 'second native pending score attempt', true); await wall(60); assert.equal(row.scoreRequests.length, 1, 'Pending score has no duplicate insert');
        await shot('original-save-held', true); await next(); const before = await stores(); const current = await observe('new-round-before-old-completion');
        assert.equal(current.nickname, 'Fixture Beta'); assert.equal(current.finalScore, 'Final Score: 0'); assert.equal(current.rank, null);
        if (scenario.startsWith('overlap-')) {
          row.currentCanSubmit = current.disabled === false;
          if (mode === 'baseline') { assert.equal(current.disabled, true, 'Original older pending save visibly blocks current round Save'); assert.equal(current.saveText, '...'); row.originalFault = true; row.fault = 'Reset retains the older save busy state, blocking the current round score'; await shot('observed-original-current-busy', true); }
          else { await assertUnsaved(); await activate(save(), 'submit current score while original transport remains held'); await poll('current held insert', async () => held.has('new-insert'), Boolean); assert.deepEqual(row.scoreRequests.map(request => request.body), [oldRow, newRow]); await assertUnsaved(true); }
        }
        await release(boundary); await poll('old rank request finished', async () => row.rankRequests.some(request => request.chainLength === 1 && request.fulfilled), Boolean);
        if (mode === 'baseline') {
          await poll('actual stale old score UI', read, value => value.nickname === null && value.rank === 'You ranked #7 today!');
          const stale = await observe('observed-original-stale-rank'); assert.equal(stale.finalScore, 'Final Score: 0'); row.originalFault = true; row.fault ??= 'Older captured score completion marks the newer unsaved round submitted and displays its old rank'; await shot('observed-original-stale-rank', true);
          assert.deepEqual(row.scoreRequests.map(request => request.body), [oldRow], 'No current score was submitted by inspection');
        } else {
          await poll('old UI settlement', read, value => value.nickname === 'Fixture Beta' && value.disabled === scenario.startsWith('overlap-'));
          await assertUnsaved(scenario.startsWith('overlap-')); await shot('current-owned-after-old-completion', true);
          if (scenario.startsWith('overlap-')) { await release('new-insert'); await poll('current own rank', read, value => value.rank === 'You ranked #7 today!'); }
        }
        await storeHold('old completion and optional current score settlement', before);
      } else {
        if (scenario === 'normal-error-retry') {
          await poll('current failed insert retry state', read, value => value.nickname === 'Fixture Alpha' && value.disabled === false); assert.equal(row.rankRequests.length, 0); await shot('current-insert-failed-retryable', true);
          await activate(save(), 'retry same current score'); await poll('existing count-null rank fallback', read, value => value.rank === 'You ranked #1 today!'); assert.deepEqual(row.scoreRequests.map(request => request.body), [oldRow, oldRow]); assert.equal(row.rankRequests[0].count, null);
        } else await poll('ordinary original current rank', read, value => value.rank === 'You ranked #7 today!');
        await storeHold('ordinary original save and retry', normalStores); await shot('ordinary-current-saved', true); await next(); await assertUnsaved(); const before = await stores();
        await activate(save(), 'save ordinary new round'); await poll('new round own rank', read, value => value.rank === 'You ranked #7 today!' && value.finalScore === 'Final Score: 0');
        assert.deepEqual(row.scoreRequests.map(request => request.body), scenario === 'normal-error-retry' ? [oldRow, oldRow, newRow] : [oldRow, newRow]); assert.deepEqual(row.rankRequests.map(request => request.chainLength), [1, 0]);
        await storeHold('ordinary new round save', before); await shot('ordinary-new-round-saved', true); row.healthy = true;
      }
      assert.equal(held.size, 0, 'No score IO remains held'); assert(row.scoreRequests.every(request => request.intercepted && request.fulfilled)); assert(row.rankRequests.every(request => request.intercepted && request.fulfilled));
      assert.deepEqual(row.completions.map(request => request.body.score), [100, 0], 'Actual completions retain both distinct round scores');
      if (!scenario.startsWith('normal-')) assert.deepEqual(row.rankRequests.map(request => request.chainLength), mode === 'fixed' && scenario.startsWith('overlap-') ? [1, 0] : [1]);
      await poll('every rank request terminal event', async () => row.rankRequests.every(request => request.terminals.length > 0), Boolean);
      for (const request of row.rankRequests) {
        assert.deepEqual(request.responses, [{ status: 200, headers: { ...cors, 'content-type': 'application/json', 'content-length': '0', ...(request.count === null ? {} : { 'content-range': '0-0/' + request.count }) } }], 'Exact locally fulfilled HEAD status and response headers');
        assert.deepEqual(request.terminals, [{ event: 'requestfinished', failure: null }], 'Rank HEAD finishes without failure before context close');
      }
      await Promise.all(responses); assert(row.assets.length > 5 && row.assets.some(asset => [routePath, routePath + '/'].includes(asset.path)), 'Actual route document and application loaded');
      assert.deepEqual(row.errors, []); assert.deepEqual(row.unexpectedWrites, []);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Route fits declared viewport'); row.status = 'passed';
    } catch (error) { row.failure = String(error?.stack ?? error); if (page) { try { await page.screenshot({ path: path.join(out, spec.id + '-failed-viewport.png'), fullPage: false, animations: 'disabled' }); row.screenshots.push(spec.id + '-failed-viewport.png'); } catch {} } throw error; }
    finally {
      row.pendingBeforeCleanup = held.size;
      for (const pending of [...held.values()]) { try { await pending.finish(); } catch (error) { row.errors.push('Cleanup: ' + String(error)); } }
      row.pendingAfterCleanup = held.size;
      await context.close();
      await Promise.all(responses);
    }
  }
  assert.deepEqual(report.cases.map(row => row.id), report.census.map(row => row.id), 'Exact twelve contexts');
  report.observedOriginalFaults = report.cases.filter(row => row.originalFault).length; report.healthyContexts = report.cases.filter(row => row.healthy).length;
  assert.equal(report.observedOriginalFaults, report.expected.originalFaults); assert.equal(report.healthyContexts, 4);
  for (const row of report.cases) { assert.equal(row.pendingBeforeCleanup, 0); assert.equal(row.pendingAfterCleanup, 0); assert.deepEqual(row.errors, [], row.id + ': no late page, response or cleanup error'); assert.deepEqual(row.unexpectedWrites, []); }
  for (const row of source) assert.equal(hash(fs.readFileSync(row.file)), row.actualSha256, 'Bound source held');
  assert(sourceStatus.equals(git(['status', '--porcelain=v1', '--untracked-files=all'])), 'Checkout membership and status held');
  assert(process.env.SIM_OFFLINE_RECEIPT); assert.equal(fs.existsSync(process.env.SIM_OFFLINE_RECEIPT) ? fs.readFileSync(process.env.SIM_OFFLINE_RECEIPT, 'utf8') : '', '', 'Empty ordinary browser transport receipt');
  report.status = 'passed'; console.log('Tennis Chain score ownership: ' + mode + ',12 actual route contexts,' + report.observedOriginalFaults + ' observed original faults,4 healthy contexts.');
} finally { fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close(); }
