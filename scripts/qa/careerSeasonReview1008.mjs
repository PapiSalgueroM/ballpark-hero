/* Built-route season review with offline saved fixtures and real input. */
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
const OUT = path.resolve(process.env.CAREER_SEASON_REVIEW_NATIVE_ARTIFACTS || path.join(ROOT, 'career-season-review-artifacts/native'));
fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build dist before the native review walk');
const bundle = path.join(OUT, 'fixtures.cjs');
await build({
  entryPoints: [path.join(ROOT, 'src/test/fixtures/careerSeasonReview1008.ts')], outfile: bundle,
  bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
  plugins: [{ name: 'inert-browser-client', setup(b) {
    b.onResolve({ filter: /integrations\/supabase\/client(?:\.ts)?$/ }, () => ({ path: 'supabase-client', namespace: 'offline' }));
    b.onLoad({ filter: /.*/, namespace: 'offline' }, () => ({ loader: 'js', contents:
      "export const SUPABASE_URL='http://offline.invalid'; export const SUPABASE_PUBLISHABLE_KEY='offline'; export const supabase=new Proxy({}, {get(){throw new Error('Native fixture cannot use transport');}});" }));
  } }],
});
const { reviewFixtures, reviewSports, makeReviewCareer, reviewSave } = createRequire(import.meta.url)(bundle);
const profiles = [
  { width: 320, height: 780, input: 'touch', theme: 'dark', reduced: true, positions: ['PG', 'QB', 'SP', 'G'] },
  { width: 390, height: 844, input: 'touch', theme: 'light', reduced: false, positions: ['PG', 'EDGE', 'CF', 'D'] },
  { width: 1280, height: 720, input: 'mouse', theme: 'dark', reduced: false, positions: ['PG', 'QB', 'RP', 'C'] },
  { width: 1280, height: 720, input: 'keyboard', theme: 'light', reduced: true, positions: ['PG', 'EDGE', 'SP', 'G'] },
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
server.stdout.on('data', data => { serverLog += data; });
server.stderr.on('data', data => { serverLog += data; });
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned server did not start within 15 seconds')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
});
async function settle(page) {
  await page.evaluate(() => new Promise(resolve => {
    let last = scrollY, stable = 0, frames = 0;
    const next = () => { stable = Math.abs(scrollY - last) < .1 ? stable + 1 : 0; last = scrollY;
      if (++frames >= 100 || stable >= 10) resolve(); else requestAnimationFrame(next); };
    requestAnimationFrame(next);
  }));
}
async function loadedFonts(page) {
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    const faces = [];
    for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
      const matches = await document.fonts.load(`${weight} 16px "${family}"`, 'Career season');
      faces.push({ family, weight, faces: matches.length, loaded: matches.length > 0 && matches.every(face => face.status === 'loaded') });
    }
    return faces;
  });
  assert(loaded.every(font => font.loaded), 'Actual Inter and Space Grotesk faces load before native geometry');
  return loaded;
}
async function activate(locator, input, minimum = 44) {
  await locator.waitFor({ state: 'visible' });
  const box = await locator.boundingBox();
  assert(box && box.width >= minimum && box.height >= minimum, `Small review control: ${JSON.stringify(box)}`);
  if (input === 'touch') await locator.tap();
  else if (input === 'mouse') await locator.click();
  else { await locator.focus(); await locator.press('Enter'); }
}
async function measure(page) {
  return page.evaluate(() => {
    const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height, text: el.textContent }; };
    const area = document.querySelector('[data-career-season-review]');
    return { scrollY, innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth,
      back: rect(area?.querySelector('button')), heading: rect(area?.querySelector('h2')),
      detail: rect(area?.querySelector('[data-season-review]')),
      stats: [...(area?.querySelectorAll('[data-season-stat]') || [])].map(rect),
      overview: [...(area?.querySelectorAll('[data-season-ovr], [data-season-games], [data-season-age], [data-season-pay], [data-season-result], [data-season-awards]') || [])].map(rect),
      controls: [...(area?.querySelectorAll('button') || [])].map(rect),
      focus: document.activeElement?.getAttribute('data-season-tile') ?? document.activeElement?.getAttribute('data-season-tab') ?? document.activeElement?.textContent,
    };
  });
}
function checkGeometry(m, viewport, stage) {
  assert(m.scrollWidth <= viewport.width + 2, `${stage}: horizontal overflow against configured viewport ${m.scrollWidth}/${viewport.width}`);
  const visible = r => r && r.height > 0 && r.top >= -2 && r.bottom <= viewport.height + 2 && r.left >= -2 && r.right <= viewport.width + 2;
  assert(visible(m.back), `${stage}: Back action clipped: ${JSON.stringify(m.back)}`);
  assert(visible(m.heading), `${stage}: season context clipped: ${JSON.stringify(m.heading)}`);
  for (const r of [...m.overview, ...m.stats]) assert(visible(r), `${stage}: saved value clipped: ${JSON.stringify(r)}`);
  for (const r of m.controls) assert(r.width >= 44 && r.height >= 44, `${stage}: undersized review action ${JSON.stringify(r)}`);
}
async function stats(page) {
  return page.locator('[data-season-stat]').evaluateAll(elements => Object.fromEntries(elements.map(el => [el.getAttribute('data-season-stat'), el.querySelector('dd')?.textContent])));
}
const protectedState = page => page.evaluate(() => ({ storage: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])), draws: window.__reviewDraws, writes: [...window.__reviewWrites] }));

try {
  await ready;
  browser = await chromium.launch({ headless: true });
  for (const profile of profiles) for (const [sportIndex, slug] of ['nba', 'nfl', 'mlb', 'nhl'].entries()) {
    const fixture = reviewFixtures.find(f => f.slug === slug && f.pos === profile.positions[sportIndex]);
    const sport = reviewSports[slug], career = makeReviewCareer(fixture), bytes = reviewSave(career);
    const id = `${slug}-${fixture.pos}-${profile.width}-${profile.input}-${profile.theme}${profile.reduced ? '-reduced' : ''}`;
    const result = { id, route: `/${sport.gameSlug}`, viewport: { width: profile.width, height: profile.height }, steps: [], screenshots: [], pageErrors: [], consoleErrors: [], localFailures: [], fontFailures: [], fontRequests: [], scoreWrites: [], eventSetupWrites: [], outbound: [] };
    let playingEventSeason = false;
    const fontAssets = new Set();
    report.cases.push(result);
    const context = await browser.newContext({ viewport: result.viewport, isMobile: profile.input === 'touch', hasTouch: profile.input === 'touch', deviceScaleFactor: 1,
      reducedMotion: profile.reduced ? 'reduce' : 'no-preference', colorScheme: profile.theme, serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
        { name: sport.saveKey, value: bytes }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: profile.theme },
        { name: 'review-unrelated-save', value: '{"keep":"exact bytes"}' },
      ] }] },
    });
    await context.addInitScript(() => {
      window.__reviewDraws = 0; window.__reviewWrites = [];
      const random = Math.random; Math.random = () => { window.__reviewDraws++; return random(); };
      for (const method of ['setItem', 'removeItem', 'clear']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function (...args) { if (this === localStorage) window.__reviewWrites.push({ method, args }); return original.apply(this, args); };
      }
    });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) return route.continue();
      result.outbound.push({ method: request.method(), path: url.pathname });
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && /completions|user_game_scores|user_best_scores|record_auth_completion/.test(url.pathname)) {
        const write = { method: request.method(), path: url.pathname };
        if (playingEventSeason) result.eventSetupWrites.push({ ...write, body: request.postDataJSON() });
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
    const page = await context.newPage(); page.setDefaultTimeout(15000);
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
    const inspect = async stage => {
      const fonts = await loadedFonts(page);
      await settle(page);
      const m = await measure(page); result.steps.push({ stage, ...m, fonts });
      const file = `${id}-${stage}.png`; await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' }); result.screenshots.push(file);
      fs.writeFileSync(path.join(OUT, `${id}-${stage}-layout.json`), JSON.stringify(m, null, 2));
      checkGeometry(m, result.viewport, stage);
      return m;
    };
    const button = name => page.getByRole('button', { name, exact: true });
    const unchanged = async (before, stage) => {
      const after = await protectedState(page);
      assert.deepEqual(after, before, `${stage}: review changed storage, RNG consumption, or write calls`);
      assert.equal(after.storage[sport.saveKey], bytes, `${stage}: career bytes changed`);
      assert.deepEqual(result.scoreWrites, [], `${stage}: completion transport attempted`);
    };
    try {
      await page.goto(`${BASE}${result.route}`, { waitUntil: 'domcontentloaded' });
      const opener = page.getByRole('button', { name: /Career Log/ }); await opener.waitFor();
      result.fonts = await loadedFonts(page); await settle(page);
      assert.deepEqual(result.fontFailures, []);
      assert(await page.evaluate(() => Array.isArray(window.__reviewWrites) && Number.isInteger(window.__reviewDraws)), 'Storage and RNG instrumentation installed before app boot');
      assert.equal(await page.locator('html').evaluate(el => el.classList.contains('light')), profile.theme === 'light', 'The saved theme is active');
      const before = await protectedState(page);
      await activate(opener, profile.input);
      await page.locator('[data-season-tile="2"]').waitFor();
      await inspect('picker');
      assert.equal(await page.locator('[data-season-tile]').count(), 3);
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-season-tile')), '2');
      await activate(page.locator('[data-season-tile="1"]'), profile.input);
      await inspect('overview');
      assert.equal(await page.locator('[data-season-ovr]').textContent(), '84');
      assert.equal(await page.locator('[data-season-ovr-change]').textContent(), '13 higher');
      assert.equal(await page.locator('[data-season-games]').textContent(), String(fixture.games));
      assert.equal(await page.locator('[data-season-games-change]').textContent(), '4 higher');
      assert.equal(await page.locator('[data-season-age]').textContent(), '25');
      assert.equal(await page.locator('[data-season-pay]').textContent(), '$12.75M');
      assert.equal(await page.locator('[data-season-result]').textContent(), 'Fixture conference final');
      assert.equal(await page.locator('[data-season-awards]').textContent(), 'Fixture All-Star, Fixture Sportsmanship');
      assert.equal(await page.locator('[data-season-games]').evaluate(el => el.parentElement.querySelector('dt').textContent), fixture.gamesLabel);
      if (profile.input === 'keyboard') {
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-season-tab')), 'Overview');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-season-tab')), 'Regular season');
        await page.keyboard.press('Enter'); await inspect('keyboard-regular');
        assert.deepEqual(await stats(page), fixture.regular);
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-season-tab')), 'Postseason');
        await page.keyboard.press('Shift+Tab');
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-season-tab')), 'Regular season');
      }
      if (report.controls.length === 0) {
        const back = button('Back to seasons'), heldStyle = await back.getAttribute('style');
        const old = await measure(page);
        await back.evaluate(el => { const r = el.getBoundingClientRect(); el.style.transform = `translateY(${innerHeight - r.bottom + 22}px)`; });
        const changed = await measure(page);
        assert(changed.back.bottom > result.viewport.height + 20 && changed.back.bottom > old.back.bottom, 'Clipping control changed the real Back action');
        assert.throws(() => checkGeometry(changed, result.viewport, 'clipping-control'), /Back action clipped/);
        await back.evaluate((el, style) => style === null ? el.removeAttribute('style') : el.setAttribute('style', style), heldStyle);
        checkGeometry(await measure(page), result.viewport, 'clipping-restored');
        report.controls.push({ name: 'back-clipping', changed: changed.back, restored: (await measure(page)).back });
        const bodyStyle = await page.locator('body').getAttribute('style');
        await page.locator('body').evaluate((el, width) => { el.style.minWidth = `${width + 80}px`; }, result.viewport.width);
        const overflow = await measure(page);
        assert(overflow.scrollWidth > result.viewport.width + 60, 'Overflow control changes actual layout');
        assert.throws(() => checkGeometry(overflow, result.viewport, 'overflow-control'), /horizontal overflow/);
        await page.locator('body').evaluate((el, style) => style === null ? el.removeAttribute('style') : el.setAttribute('style', style), bodyStyle);
        await page.evaluate(y => scrollTo(0, y), old.scrollY); await settle(page);
        checkGeometry(await measure(page), result.viewport, 'overflow-restored');
        report.controls.push({ name: 'horizontal-overflow', changed: overflow.scrollWidth, restored: (await measure(page)).scrollWidth });
      }
      for (const [tab, expected] of [['Regular season', fixture.regular], ['Postseason', fixture.postseason]]) {
        await activate(button(tab), profile.input); await inspect(tab === 'Postseason' ? 'postseason' : 'regular');
        assert.deepEqual(await stats(page), expected);
        assert.equal(await button(tab).getAttribute('aria-pressed'), 'true');
        if (profile.input !== 'touch') assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-season-tab')), tab);
      }
      await activate(button('Back to seasons'), profile.input); await inspect('returned-picker');
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-season-tile')), '1');
      await activate(button('Back to career'), profile.input); await settle(page);
      assert.equal(await opener.evaluate(el => el === document.activeElement), true);
      await unchanged(before, 'live return');
      await page.reload({ waitUntil: 'domcontentloaded' }); await opener.waitFor(); await settle(page);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), sport.saveKey), bytes, 'Reload keeps exact career bytes');
      const reloaded = await protectedState(page);
      await activate(opener, profile.input); await page.locator('[data-season-tile="1"]').waitFor();
      await activate(page.locator('[data-season-tile="1"]'), profile.input); await inspect('restored-overview');
      assert.equal(await page.locator('[data-season-ovr]').textContent(), '84');
      await unchanged(reloaded, 'reloaded review');
      const retiredBytes = reviewSave({ ...career, retired: true });
      await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: sport.saveKey, value: retiredBytes });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await button('Review seasons').waitFor(); await settle(page);
      const retiredBefore = await protectedState(page);
      await activate(button('Review seasons'), profile.input); await page.locator('[data-season-tile="1"]').waitFor();
      await activate(page.locator('[data-season-tile="1"]'), profile.input); await inspect('retired-overview');
      await activate(button('Postseason'), profile.input); await inspect('retired-postseason');
      assert.deepEqual(await stats(page), fixture.postseason);
      await activate(button('Back to seasons'), profile.input); await inspect('retired-picker');
      await activate(button('Back to retirement'), profile.input); await settle(page);
      assert.equal(await button('Review seasons').evaluate(el => el === document.activeElement), true);
      assert.deepEqual(await protectedState(page), retiredBefore, 'Retired review preserves all storage bytes, draws, and writes');
      if (slug === 'nba') {
        const eventCareer = JSON.parse(JSON.stringify(career));
        eventCareer.age = 27;
        delete eventCareer.rival;
        await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: sport.saveKey, value: reviewSave(eventCareer) });
        await page.reload({ waitUntil: 'domcontentloaded' }); await opener.waitFor(); await settle(page);
        const activity = page.waitForRequest(request => new URL(request.url()).pathname === '/rest/v1/game_completions' && request.method() === 'POST');
        playingEventSeason = true;
        await activate(page.getByRole('button', { name: /Play the 2034 season/ }), profile.input, 30);
        await activate(page.locator('[data-season-reveal]').getByRole('button', { name: 'Continue', exact: true }), profile.input, 30);
        const pending = page.locator('[data-career-event]'); await pending.waitFor(); await activity; await settle(page);
        playingEventSeason = false;
        assert.equal(result.eventSetupWrites.length, 1, 'Playing one real season records one existing activity');
        const activityBody = result.eventSetupWrites[0].body;
        const activityRow = Array.isArray(activityBody) ? activityBody[0] : activityBody;
        assert.equal(activityRow.game, sport.gameSlug); assert.equal(activityRow.score, undefined, 'The existing season activity is unscored');
        const eventBefore = await protectedState(page);
        const pendingId = await pending.getAttribute('data-career-event'), pendingText = await pending.innerText();
        const savedEvent = JSON.parse(eventBefore.storage[sport.saveKey]);
        assert.equal(savedEvent.phase, 'event'); assert.equal(savedEvent.c.seasons.length, 4);
        await activate(opener, profile.input); await page.locator('[data-season-tile="1"]').waitFor(); await inspect('pending-event-picker');
        await activate(page.locator('[data-season-tile="1"]'), profile.input); await inspect('pending-event-overview');
        assert.equal(await page.locator('[data-season-ovr]').textContent(), '84');
        await activate(button('Back to seasons'), profile.input);
        await activate(button('Back to career'), profile.input); await pending.waitFor(); await settle(page);
        assert.equal(await pending.getAttribute('data-career-event'), pendingId);
        assert.equal(await pending.innerText(), pendingText);
        assert.equal(await opener.evaluate(el => el === document.activeElement), true);
        assert.deepEqual(await protectedState(page), eventBefore, 'Review preserves the exact pending choice, all save bytes, draws, and writes');
        const file = `${id}-pending-event-return.png`; await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' }); result.screenshots.push(file);
        await activate(pending.getByRole('button').first(), profile.input, 30); await pending.waitFor({ state: 'hidden' });
        const resolved = JSON.parse(await page.evaluate(key => localStorage.getItem(key), sport.saveKey));
        assert.equal(resolved.phase, 'season'); assert.equal(resolved.c.seasons.length, 4, 'The retained choice resolves without playing another season');
        result.pendingEvent = { id: pendingId, retained: true, resolved: true, originalSeasons: 4 };
      }
      assert.deepEqual(result.scoreWrites, []);
      assert.deepEqual(result.pageErrors, []); assert.deepEqual(result.consoleErrors, []); assert.deepEqual(result.localFailures, []); assert.deepEqual(result.fontFailures, []);
      result.passed = true;
    } catch (error) { result.error = String(error?.stack || error); await page.screenshot({ path: path.join(OUT, `${id}-failure.png`), animations: 'disabled' }).catch(() => {}); }
    finally { await context.close(); saveReport(); }
  }
  assert.equal(report.cases.length, profiles.length * 4);
  assert.equal(report.controls.length, 2);
  assert(report.cases.every(row => row.passed), 'Every native profile and sport must pass; see report.json');
  console.log(`careerSeasonReview1008: ${report.cases.length} native sport/profile walks and two effective geometry controls passed.`);
} finally {
  if (browser) await browser.close();
  server.kill();
  fs.writeFileSync(path.join(OUT, 'server.log'), serverLog); saveReport();
}
