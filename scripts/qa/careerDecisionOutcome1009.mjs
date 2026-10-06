/* Native ordinary choices, using real engine draw tapes and offline transport. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fontLinks = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(match => new URL(match[1]).href);
assert.equal(fontLinks.length, 1, 'Native fonts bind the actual template stylesheet');
const isFontStylesheet = request => request.method() === 'GET' && fontLinks.includes(new URL(request.url()).href);
const isFontRead = (request, assets) => {
  const url = new URL(request.url());
  return isFontStylesheet(request) || (request.method() === 'GET' && request.resourceType() === 'font' && assets.has(url.href));
};
const OUT = path.resolve(process.env.CAREER_DECISION_OUTCOME_NATIVE_ARTIFACTS || path.join(ROOT, 'career-decision-outcome-artifacts/native'));
fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build dist before the native decision walk');
const bundle = path.join(OUT, 'fixtures.cjs');
await build({
  entryPoints: [path.join(ROOT, 'src/test/fixtures/careerDecisionOutcome1009.ts')], outfile: bundle,
  bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
  plugins: [{ name: 'inert-browser-client', setup(b) {
    b.onResolve({ filter: /integrations\/supabase\/client(?:\.ts)?$/ }, () => ({ path: 'supabase-client', namespace: 'offline' }));
    b.onLoad({ filter: /.*/, namespace: 'offline' }, () => ({ loader: 'js', contents:
      "export const SUPABASE_URL='http://offline.invalid'; export const SUPABASE_PUBLISHABLE_KEY='offline'; export const supabase=new Proxy({}, {get(){throw new Error('Native decision fixture cannot use transport');}});" }));
  } }],
});
const { decisionSports, nativeDecisionFixture, nativeTradeDecisionFixture, decisionSave } = createRequire(import.meta.url)(bundle);
const fixtures = [...['nba', 'nfl', 'mlb', 'nhl'].map(slug => nativeDecisionFixture(slug)), nativeDecisionFixture('nba', true), nativeTradeDecisionFixture()];
const profiles = [
  { width: 320, height: 780, input: 'touch', theme: 'dark', reduced: true },
  { width: 390, height: 844, input: 'touch', theme: 'light', reduced: false },
  { width: 1280, height: 720, input: 'mouse', theme: 'dark', reduced: false },
  { width: 1280, height: 720, input: 'keyboard', theme: 'light', reduced: true },
];
const report = { started: new Date().toISOString(), cases: [], controls: [] };
const saveReport = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const chosen = probe.address().port; probe.close(error => error ? reject(error) : resolve(chosen)); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '', browser;
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned server did not start within 15 seconds')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
});
async function settle(page, selector) {
  if (selector) await page.locator(selector).evaluate(async el => {
    const animations = el.getAnimations({ subtree: true }).filter(a => a.effect?.getComputedTiming().iterations !== Infinity);
    await Promise.all(animations.map(a => a.finished.catch(() => {})));
  });
  await page.evaluate(() => new Promise(resolve => {
    let last = scrollY, stable = 0, frames = 0;
    const next = () => { stable = Math.abs(scrollY - last) < .1 ? stable + 1 : 0; last = scrollY;
      if (++frames >= 100 || stable >= 10) resolve(); else requestAnimationFrame(next); };
    requestAnimationFrame(next);
  }));
}
async function activate(locator, input, measureTarget = true) {
  if (measureTarget) { const r = await locator.boundingBox(); assert(r && r.width >= 44 && r.height >= 44, `Small decision target: ${JSON.stringify(r)}`); }
  if (input === 'touch') await locator.tap(); else if (input === 'mouse') await locator.click(); else { await locator.focus(); await locator.press('Enter'); }
}
async function geometry(page) {
  return page.evaluate(() => {
    const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height, text: el.textContent }; };
    const area = document.querySelector('[data-career-decision-outcome]');
    return { scrollY, innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth,
      area: rect(area), title: rect(area?.querySelector('[data-decision-title]')), choice: rect(area?.querySelector('[data-decision-choice]')),
      next: rect(area?.querySelector('[data-decision-continue]')),
      body: rect(area?.querySelector('[data-decision-body]')), more: rect(area?.querySelector('[data-decision-more]')),
      changes: [...(area?.querySelectorAll('[data-decision-change]') || [])].map(rect),
      controls: [...(area?.querySelectorAll('button') || [])].map(rect),
      focus: document.activeElement?.getAttribute('data-decision-title') !== null ? 'title' : document.activeElement?.textContent,
    };
  });
}
function checkGeometry(m, viewport, stage, expanded = false) {
  assert(m.scrollWidth <= viewport.width + 2, `${stage}: horizontal overflow against configured viewport ${m.scrollWidth}/${viewport.width}`);
  const visible = r => r && r.height > 0 && r.top >= -2 && r.bottom <= viewport.height + 2 && r.left >= -2 && r.right <= viewport.width + 2;
  assert(visible(m.next), `${stage}: Continue action clipped: ${JSON.stringify(m.next)}`);
  for (const r of [m.title, m.choice]) assert(visible(r), `${stage}: outcome context clipped: ${JSON.stringify(r)}`);
  const insideBody = r => r && r.top >= m.body.top - 2 && r.bottom <= m.body.bottom + 2;
  if (!expanded) for (const r of m.changes) assert(visible(r) && insideBody(r), `${stage}: outcome context clipped: ${JSON.stringify(r)}`);
  else assert(visible(m.changes.at(-1)) && insideBody(m.changes.at(-1)), `${stage}: Expanded detail clipped: ${JSON.stringify(m.changes.at(-1))}`);
  if (m.more) assert(visible(m.more) && insideBody(m.more), `${stage}: More action clipped: ${JSON.stringify(m.more)}`);
  for (const r of m.controls) assert(r.width >= 44 && r.height >= 44, `${stage}: undersized decision action ${JSON.stringify(r)}`);
}
const state = page => page.evaluate(() => ({ storage: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])), draws: window.__decisionDraws, writes: [...window.__decisionWrites], tapeRemaining: window.__decisionTape.length }));
const rows = page => page.locator('[data-decision-change]').evaluateAll(elements => elements.map(el => ({
  key: el.getAttribute('data-decision-change'), label: el.querySelector('dt')?.textContent,
  before: el.querySelector('[data-change-before]')?.textContent, after: el.querySelector('[data-change-after]')?.textContent,
  delta: el.querySelector('[data-change-delta]')?.textContent ?? null,
})));

try {
  await ready; browser = await chromium.launch({ headless: true });
  for (const profile of profiles) for (const fixture of fixtures) {
    const { slug } = fixture, sport = decisionSports[slug];
    const id = `${slug}-${fixture.caseId || (fixture.expanded ? 'expanded' : 'capped')}-${profile.width}-${profile.input}-${profile.theme}${profile.reduced ? '-reduced' : ''}`;
    const result = { id, route: `/${sport.gameSlug}`, viewport: { width: profile.width, height: profile.height }, steps: [], screenshots: [], pageErrors: [], consoleErrors: [], localFailures: [], fontFailures: [], fontRequests: [], fontAssets: [], scoreWrites: [], eventSetupWrites: [], outbound: [] };
    const fontAssets = new Set();
    let playingSetupSeason = false;
    report.cases.push(result);
    const context = await browser.newContext({ viewport: result.viewport, isMobile: profile.input === 'touch', hasTouch: profile.input === 'touch', deviceScaleFactor: 1,
      reducedMotion: profile.reduced ? 'reduce' : 'no-preference', colorScheme: profile.theme, serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
        { name: sport.saveKey, value: decisionSave(fixture.initial, fixture.quality) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: profile.theme },
        { name: `rules-gate-seen:${result.route}`, value: '1' },
        { name: 'decision-unrelated-save', value: '{"keep":"exact bytes"}' },
      ] }] },
    });
    await context.addInitScript(() => {
      window.__decisionDraws = 0; window.__decisionWrites = []; window.__decisionTape = [];
      Math.random = () => { window.__decisionDraws++; return window.__decisionTape.length ? window.__decisionTape.shift() : .5; };
      for (const method of ['setItem', 'removeItem', 'clear']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function (...args) { if (this === localStorage) window.__decisionWrites.push({ method, args }); return original.apply(this, args); };
      }
    });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) return route.continue();
      result.outbound.push({ method: request.method(), path: url.pathname });
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && /completions|user_game_scores|user_best_scores|record_auth_completion/.test(url.pathname)) {
        const write = { method: request.method(), path: url.pathname };
        if (playingSetupSeason) result.eventSetupWrites.push({ ...write, body: request.postDataJSON() });
        else result.scoreWrites.push(write);
      }
      if (isFontRead(request, fontAssets)) {
        result.fontRequests.push(request.url());
        try {
          const response = await route.fetch({ maxRedirects: 0 });
          assert(response.status() >= 200 && response.status() < 300, 'Actual font requests must succeed without redirects');
          if (isFontStylesheet(request)) {
            const css = await response.text();
            const declared = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/url\(\s*(['"]?)(https:\/\/[^)'"\s]+)\1\s*\)/g)].map(match => new URL(match[2]));
            assert(declared.length > 0, 'The actual template stylesheet declares font assets');
            for (const asset of declared) {
              assert.equal(asset.origin, 'https://fonts.gstatic.com', 'Only the actual stylesheet font host is allowed');
              fontAssets.add(asset.href);
            }
            result.fontAssets = [...fontAssets];
            return route.fulfill({ response, body: css });
          }
          return route.fulfill({ response });
        } catch (error) {
          result.fontFailures.push(`${request.url()}: ${error.message}`);
          return route.abort('blockedbyclient');
        }
      }
      const type = request.resourceType();
      if (type === 'font') {
        result.fontFailures.push(`Font URL is not declared by the actual template stylesheet: ${request.url()}`);
        return route.abort('blockedbyclient');
      }
      return route.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : 'application/json', body: type === 'stylesheet' ? '' : '[]' });
    });
    await context.routeWebSocket('**/*', socket => socket.close());
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    page.on('pageerror', error => result.pageErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
    page.on('requestfailed', request => {
      if (request.url().startsWith(BASE)) result.localFailures.push(`${request.url()}: ${request.failure()?.errorText}`);
      if (request.resourceType() === 'font' || isFontStylesheet(request)) result.fontFailures.push(`${request.url()}: ${request.failure()?.errorText}`);
    });
    page.on('response', response => {
      if (response.url().startsWith(BASE) && response.status() >= 400) result.localFailures.push(`${response.status()} ${response.url()}`);
      if ((response.request().resourceType() === 'font' || isFontStylesheet(response.request())) && response.status() >= 400) result.fontFailures.push(`${response.status()} ${response.url()}`);
    });
    const inspect = async (stage, expanded = false) => {
      await settle(page, '[data-career-decision-outcome]');
      const m = await geometry(page); result.steps.push({ stage, ...m });
      const file = `${id}-${stage}.png`; await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' }); result.screenshots.push(file);
      fs.writeFileSync(path.join(OUT, `${id}-${stage}-layout.json`), JSON.stringify(m, null, 2));
      checkGeometry(m, result.viewport, stage, expanded); return m;
    };
    try {
      await page.goto(`${BASE}${result.route}`, { waitUntil: 'domcontentloaded' });
      const play = page.getByRole('button', { name: /^Play the \d+ season$/ }); await play.waitFor();
      result.fonts = await page.evaluate(async () => {
        await document.fonts.ready;
        const loaded = [];
        for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
          const faces = await document.fonts.load(`${weight} 16px "${family}"`, 'Career decision');
          loaded.push({ family, weight, faces: faces.length, loaded: faces.length > 0 && faces.every(face => face.status === 'loaded') });
        }
        return loaded;
      });
      assert(result.fonts.every(font => font.loaded), 'Actual Inter and Space Grotesk faces load before native geometry');
      assert.deepEqual(result.fontFailures, []);
      await settle(page);
      assert.equal(await page.locator('html').evaluate(el => el.classList.contains('light')), profile.theme === 'light', 'The saved theme is applied by the real app');
      assert.deepEqual(result.scoreWrites, [], 'Restoring the starting career attempts no completion write');
      await page.evaluate(tape => { window.__decisionTape = [...tape]; window.__decisionDraws = 0; window.__decisionWrites = []; }, fixture.tape);
      const isActivity = request => request.method() === 'POST' && new URL(request.url()).pathname === '/rest/v1/game_completions';
      playingSetupSeason = true;
      const [, activityResponse] = await Promise.all([
        page.waitForRequest(isActivity),
        page.waitForResponse(response => isActivity(response.request())),
        activate(play, profile.input, false),
      ]);
      await activityResponse.finished();
      assert.equal(activityResponse.status(), 200, 'The isolated setup activity was fulfilled');
      await page.locator('[data-season-reveal]').waitFor(); await settle(page, '[data-season-reveal]');
      assert.equal((await state(page)).storage[sport.saveKey], fixture.pendingBytes, 'The real pre-choice season matches the reference engine exactly');
      assert.equal((await state(page)).tapeRemaining, 0, 'Every intended engine draw was consumed');
      await activate(page.locator('[data-season-reveal]').getByRole('button', { name: 'Continue', exact: true }), profile.input, false);
      await page.locator(`[data-career-decision-event="${fixture.eventId}"]`).waitFor(); await settle(page, '[data-career-decision-event]');
      playingSetupSeason = false;
      assert.equal(result.eventSetupWrites.length, 1, 'Playing one setup season records exactly one existing activity');
      const setupWrite = result.eventSetupWrites[0];
      assert.equal(setupWrite.method, 'POST');
      assert.equal(setupWrite.path, '/rest/v1/game_completions');
      const activityRows = Array.isArray(setupWrite.body) ? setupWrite.body : [setupWrite.body];
      assert.equal(activityRows.length, 1, 'The setup activity contains exactly one row');
      assert.equal(activityRows[0].game, sport.gameSlug);
      assert.equal(activityRows[0].score, undefined, 'The setup season activity is unscored');
      assert.deepEqual(result.scoreWrites, [], 'The receipt interval starts with no completion writes');
      const choice = page.locator(`[data-career-decision-option="${fixture.optionIndex}"]`);
      assert.equal(await choice.locator('span').first().textContent(), fixture.choice);
      if (fixture.choiceTape) await page.evaluate(tape => { window.__decisionTape = [...tape]; }, fixture.choiceTape);
      const beforeChoice = await state(page);
      await activate(choice, profile.input);
      await page.locator('[data-career-decision-outcome]').waitFor(); await inspect('outcome');
      assert.equal(await page.locator('[data-decision-title]').textContent(), fixture.eventTitle);
      assert.equal(await page.locator('[data-decision-choice]').textContent(), `You chose: ${fixture.choice}`);
      assert.deepEqual(await rows(page), fixture.expectedRows.slice(0, 4));
      assert.equal(await page.locator('[data-decision-title]').evaluate(el => el === document.activeElement), true);
      const applied = await state(page);
      assert.equal(applied.draws - beforeChoice.draws, fixture.choiceTape?.length ?? 1, 'The choice and quality roll consume exactly their additional draws');
      assert.equal(applied.tapeRemaining, 0, 'The separate choice tape is exhausted');
      assert.equal(applied.storage[sport.saveKey], fixture.appliedBytes, 'Choice writes the exact real applied save before Continue');
      assert.equal(applied.writes.filter(row => row.method === 'setItem' && row.args[0] === sport.saveKey).length - beforeChoice.writes.filter(row => row.method === 'setItem' && row.args[0] === sport.saveKey).length, 1, 'The choice persists exactly once');
      assert.equal(JSON.parse(applied.storage[sport.saveKey]).c.seasons.length, fixture.before.seasons.length);
      const next = page.locator('[data-decision-continue]');
      if (report.controls.length === 0) {
        const old = await geometry(page), style = await next.getAttribute('style');
        await next.evaluate(el => { const r = el.getBoundingClientRect(); el.style.transform = `translateY(${innerHeight - r.bottom + 22}px)`; });
        const changed = await geometry(page);
        assert(changed.next.bottom > result.viewport.height + 20 && changed.next.bottom > old.next.bottom, 'Clipping control changes actual Continue geometry');
        assert.throws(() => checkGeometry(changed, result.viewport, 'clipping-control'), /Continue action clipped/);
        await next.evaluate((el, value) => value === null ? el.removeAttribute('style') : el.setAttribute('style', value), style);
        checkGeometry(await geometry(page), result.viewport, 'clipping-restored');
        report.controls.push({ name: 'continue-clipping', changed: changed.next, restored: (await geometry(page)).next });
        const bodyStyle = await page.locator('body').getAttribute('style');
        await page.locator('body').evaluate((el, width) => { el.style.minWidth = `${width + 80}px`; }, result.viewport.width);
        const overflow = await geometry(page);
        assert(overflow.scrollWidth > result.viewport.width + 60, 'Overflow control changes actual layout');
        assert.throws(() => checkGeometry(overflow, result.viewport, 'overflow-control'), /horizontal overflow/);
        await page.locator('body').evaluate((el, value) => value === null ? el.removeAttribute('style') : el.setAttribute('style', value), bodyStyle);
        await page.evaluate(y => scrollTo(0, y), old.scrollY); await settle(page);
        checkGeometry(await geometry(page), result.viewport, 'overflow-restored');
        report.controls.push({ name: 'horizontal-overflow', changed: overflow.scrollWidth, restored: (await geometry(page)).scrollWidth });
      }
      if (fixture.expanded) {
        const more = page.locator('[data-decision-more]');
        assert.equal(await more.textContent(), 'Show all 5 changes');
        if (profile.input === 'keyboard') {
          await page.keyboard.press('Tab'); assert.equal(await more.evaluate(el => el === document.activeElement), true);
          await page.keyboard.press('Enter');
        } else await activate(more, profile.input);
        await inspect('expanded', true);
        assert.deepEqual(await rows(page), fixture.expectedRows);
        assert.equal(await more.getAttribute('aria-expanded'), 'true');
        if (profile.input === 'keyboard') assert.equal(await more.evaluate(el => el === document.activeElement), true, 'Expanding keeps keyboard focus on the reachable control');
        assert.deepEqual(await state(page), applied, 'Expansion changes no draws, writes, or career fields');
        if (!report.controls.some(row => row.name === 'expanded-control-clipping')) {
          const detail = page.locator('[data-decision-change]').last(), detailStyle = await detail.getAttribute('style');
          const priorDetail = await geometry(page);
          await detail.evaluate(el => { const body = document.querySelector('[data-decision-body]').getBoundingClientRect(), r = el.getBoundingClientRect(); el.style.transform = `translateY(${body.bottom - r.bottom + 22}px)`; });
          const hiddenDetail = await geometry(page);
          assert(hiddenDetail.changes.at(-1).bottom > hiddenDetail.body.bottom + 20 && hiddenDetail.changes.at(-1).bottom > priorDetail.changes.at(-1).bottom, 'Detail control clips the newly revealed real change');
          assert.throws(() => checkGeometry(hiddenDetail, result.viewport, 'expanded-detail-control', true), /Expanded detail clipped/);
          await detail.evaluate((el, value) => value === null ? el.removeAttribute('style') : el.setAttribute('style', value), detailStyle);
          checkGeometry(await geometry(page), result.viewport, 'expanded-detail-restored', true);
          report.controls.push({ name: 'expanded-detail-clipping', changed: hiddenDetail.changes.at(-1), restored: (await geometry(page)).changes.at(-1) });
          const old = await geometry(page), style = await more.getAttribute('style');
          await more.evaluate(el => { const body = document.querySelector('[data-decision-body]').getBoundingClientRect(), r = el.getBoundingClientRect(); el.style.transform = `translateY(${body.bottom - r.bottom + 22}px)`; });
          const changed = await geometry(page);
          assert(changed.more.bottom > changed.body.bottom + 20 && changed.more.bottom > old.more.bottom, 'Expanded control changes actual body clipping');
          assert.throws(() => checkGeometry(changed, result.viewport, 'expanded-control', true), /More action clipped/);
          await more.evaluate((el, value) => value === null ? el.removeAttribute('style') : el.setAttribute('style', value), style);
          checkGeometry(await geometry(page), result.viewport, 'expanded-control-restored', true);
          report.controls.push({ name: 'expanded-control-clipping', changed: changed.more, restored: (await geometry(page)).more });
        }
        if (profile.input === 'keyboard') await page.keyboard.press('Enter'); else await activate(more, profile.input);
        await inspect('collapsed-again');
        assert.deepEqual(await rows(page), fixture.expectedRows.slice(0, 4));
        assert.equal(await more.getAttribute('aria-expanded'), 'false');
        assert.deepEqual(await state(page), applied, 'Collapsing changes no draws, writes, or career fields');
      }
      if (profile.input === 'keyboard') {
        await page.keyboard.press('Tab'); assert.equal(await next.evaluate(el => el === document.activeElement), true);
        await page.keyboard.press('Enter');
      } else await activate(next, profile.input);
      await play.waitFor(); await settle(page);
      assert.equal(await page.locator('[data-career-decision-outcome]').count(), 0);
      assert.equal(await play.evaluate(el => el === document.activeElement), true);
      const playRect = await play.boundingBox();
      assert(playRect && playRect.y >= -2 && playRect.y + playRect.height <= result.viewport.height + 2 && playRect.x >= -2 && playRect.x + playRect.width <= result.viewport.width + 2, 'Returned Play action is visible before driver scrolling');
      assert.deepEqual(await state(page), applied, 'Continue consumes no RNG, saves, or extra season');
      assert.deepEqual(result.scoreWrites, []);
      await page.reload({ waitUntil: 'domcontentloaded' }); await play.waitFor(); await settle(page);
      const restored = await state(page);
      assert.equal(restored.storage[sport.saveKey], fixture.appliedBytes, 'Reload keeps exact applied save bytes');
      assert.equal(restored.storage['decision-unrelated-save'], '{"keep":"exact bytes"}');
      assert.equal(await page.locator('[data-career-decision-outcome], [data-career-decision-event]').count(), 0, 'Reload never replays the applied choice');
      assert.deepEqual(restored.writes.filter(row => row.args[0] === sport.saveKey), [], 'Reload writes no career state');
      assert.deepEqual(result.scoreWrites, []); assert.deepEqual(result.pageErrors, []); assert.deepEqual(result.consoleErrors, []); assert.deepEqual(result.localFailures, []); assert.deepEqual(result.fontFailures, []);
      result.passed = true;
    } catch (error) { result.error = String(error?.stack || error); await page.screenshot({ path: path.join(OUT, `${id}-failure.png`), animations: 'disabled' }).catch(() => {}); }
    finally { await context.close(); saveReport(); }
  }
  assert.equal(report.cases.length, profiles.length * fixtures.length); assert.equal(report.controls.length, 4);
  assert(report.cases.every(row => row.passed), 'Every native sport/profile outcome must pass; see report.json');
  console.log(`careerDecisionOutcome1009: ${report.cases.length} native walks and four effective geometry controls passed.`);
} finally {
  if (browser) await browser.close(); server.kill();
  fs.writeFileSync(path.join(OUT, 'server.log'), serverLog); saveReport();
}
