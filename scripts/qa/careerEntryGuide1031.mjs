/* First-visit career guides and main controls on the real built app. */
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
const OUT = path.join(ROOT, 'career-entry-guide-artifacts/native');
const fontLinks = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(match => new URL(match[1]).href);
assert.equal(fontLinks.length, 1, 'Native fonts bind the actual template stylesheet');
const isFontStylesheet = request => request.method() === 'GET' && fontLinks.includes(new URL(request.url()).href);
const isFontRead = (request, assets) => {
  const url = new URL(request.url());
  return isFontStylesheet(request) || (request.method() === 'GET' && request.resourceType() === 'font' && assets.has(url.href));
};
fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build dist before native verification');
const bundle = path.join(OUT, 'fixtures.cjs');
await build({ entryPoints: [path.join(ROOT, 'src/test/fixtures/careerDecisionOutcome1009.ts')], outfile: bundle,
  bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
  plugins: [{ name: 'inert-browser-client', setup(b) {
    b.onResolve({ filter: /integrations\/supabase\/client(?:\.ts)?$/ }, () => ({ path: 'supabase-client', namespace: 'offline' }));
    b.onLoad({ filter: /.*/, namespace: 'offline' }, () => ({ loader: 'js', contents:
      "export const SUPABASE_URL='http://offline.invalid'; export const SUPABASE_PUBLISHABLE_KEY='offline'; export const supabase=new Proxy({}, {get(){throw new Error('Guide fixture cannot use transport');}});" }));
  } }],
});
const { decisionSports, nativeDecisionFixture, decisionSave } = createRequire(import.meta.url)(bundle);
const fixtures = ['nba', 'nfl', 'mlb', 'nhl'].map(slug => nativeDecisionFixture(slug));
const protectedKeys = [...Object.values(decisionSports).map(sport => sport.saveKey), 'dukb-local-completions', 'dukb-streaks-v1', 'dukb-play-diary-v1'];
const profiles = [
  { width: 320, height: 780, input: 'touch', theme: 'dark', reduced: true },
  { width: 390, height: 844, input: 'touch', theme: 'light', reduced: false },
  { width: 1280, height: 720, input: 'mouse', theme: 'dark', reduced: false },
  { width: 1280, height: 720, input: 'keyboard', theme: 'light', reduced: true },
];
const report = { started: new Date().toISOString(), cases: [], controls: [] };
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '', browser;
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned server did not start in 15 seconds')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
});
async function settle(page) {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
    await new Promise(resolve => { let frames = 0, stable = 0, last = scrollY;
      const frame = () => { stable = Math.abs(last - scrollY) < .1 ? stable + 1 : 0; last = scrollY;
        if (++frames > 100 || stable >= 10) resolve(); else requestAnimationFrame(frame); }; requestAnimationFrame(frame); });
  });
}
async function loadedFonts(page) {
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready; const faces = [];
    for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
      const matches = await document.fonts.load(`${weight} 16px "${family}"`, 'Career guide');
      faces.push({ family, weight, faces: matches.length, loaded: matches.length > 0 && matches.every(face => face.status === 'loaded') });
    }
    return faces;
  });
  assert(fonts.every(face => face.loaded), `All eight real career font faces are loaded: ${JSON.stringify(fonts)}`); return fonts;
}
async function measure(page, locator) {
  return locator.evaluate(el => {
    const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height,
      clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, documentWidth: document.documentElement.scrollWidth,
      hit: !!hit && (hit === el || el.contains(hit)), text: el.textContent, scrollY };
  });
}
function checkTarget(m, profile, stage) {
  assert(m.documentWidth <= profile.width + 2, `${stage}: document fits configured width`);
  assert(m.width >= 44 && m.height >= 44, `${stage}: action has a 44px target`);
  assert(m.top >= -1 && m.bottom <= profile.height + 1 && m.left >= -1 && m.right <= profile.width + 1, `${stage}: action is fully visible`);
  assert(m.scrollWidth <= m.clientWidth + 2, `${stage}: action text fits`);
  assert(m.hit, `${stage}: action owns its hit target`);
}
async function activate(locator, input) {
  if (input === 'touch') await locator.tap(); else if (input === 'mouse') await locator.click();
  else { await locator.focus(); await locator.press('Enter'); }
}
const state = page => page.evaluate(keys => ({ storage: keys.map(key => [key, localStorage.getItem(key)]), draws: window.__entryDraws,
  writes: window.__entryWrites.filter(write => write.key === '*' || keys.includes(write.key)) }), protectedKeys);

try {
  await ready; browser = await chromium.launch({ headless: true });
  for (const profile of profiles) for (const fixture of fixtures) {
    const { slug } = fixture, sport = decisionSports[slug], routePath = `/${sport.gameSlug}`, seen = `rules-gate-seen:${routePath}`;
    const id = `${slug}-${profile.width}-${profile.input}-${profile.theme}${profile.reduced ? '-reduced' : ''}`;
    const initialBytes = decisionSave(fixture.initial, fixture.quality);
    const result = { id, route: routePath, ...profile, steps: [], screenshots: [], pageErrors: [], consoleErrors: [], localFailures: [], fontFailures: [], fontRequests: [], fontAssets: [], scoreWrites: [], eventSetupWrites: [], webSockets: [], outbound: [] };
    const fontAssets = new Set();
    let playingSetupSeason = false;
    report.cases.push(result);
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.input === 'touch', hasTouch: profile.input === 'touch', deviceScaleFactor: 1,
      reducedMotion: profile.reduced ? 'reduce' : 'no-preference', colorScheme: profile.theme, serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
        { name: sport.saveKey, value: initialBytes }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: profile.theme },
      ] }] },
    });
    await context.addInitScript(() => {
      window.__entryDraws = 0; window.__entryWrites = []; window.__entryTape = [];
      Math.random = () => { window.__entryDraws++; return window.__entryTape.length ? window.__entryTape.shift() : .5; };
      for (const method of ['setItem', 'removeItem', 'clear']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function(...args) { if (this === localStorage) window.__entryWrites.push({ method, key: method === 'clear' ? '*' : args[0], args }); return original.apply(this, args); };
      }
    });
    await context.routeWebSocket('**/*', socket => { result.webSockets.push(socket.url()); socket.close(); });
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
    const dialog = page.getByRole('dialog', { name: 'How to play', exact: true });
    const help = page.getByRole('button', { name: 'How to play', exact: true });
    const inspect = async (locator, stage) => {
      const fonts = await loadedFonts(page); await settle(page); const geometry = await measure(page, locator);
      result.steps.push({ stage, geometry, fonts }); checkTarget(geometry, profile, stage);
      const file = `${id}-${stage}.png`; await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' }); result.screenshots.push(file);
    };
    const hold = async (before, stage) => {
      assert.deepEqual(await state(page), before, `${stage}: guide holds career bytes RNG and completion writes`);
      assert.deepEqual(result.scoreWrites, [], `${stage}: guide attempts no score transport`);
    };
    try {
      await page.goto(`${BASE}${routePath}`, { waitUntil: 'domcontentloaded' }); await dialog.waitFor();
      result.fonts = await loadedFonts(page); await settle(page);
      assert.equal(await page.locator('html').evaluate(el => el.classList.contains('light')), profile.theme === 'light', 'Saved theme is active');
      assert.equal(await page.evaluate(key => localStorage.getItem(key), seen), null, 'First opening does not mark instructions dismissed');
      assert.equal(await page.evaluate(key => localStorage.getItem(key), sport.saveKey), initialBytes, 'Entry preserves the full saved career');
      const text = await dialog.innerText();
      for (const value of ['The steps', 'The rules', 'A worked example', 'Career Log', 'actual changes']) assert(text.includes(value), `Real guide contains ${value}`);
      const before = await state(page), start = dialog.getByRole('button', { name: "Let's Play!", exact: true });
      await start.scrollIntoViewIfNeeded(); await inspect(start, 'first-guide-dismiss'); await activate(start, profile.input); await dialog.waitFor({ state: 'hidden' }); await settle(page);
      await hold(before, 'first dismissal');
      assert.equal(await page.evaluate(key => localStorage.getItem(key), seen), '1');
      assert(await help.evaluate(el => document.activeElement === el), 'Dismissal restores the real help trigger'); await inspect(help, 'help-trigger');
      const reopened = await state(page); await activate(help, profile.input); await dialog.waitFor();
      await start.scrollIntoViewIfNeeded(); await inspect(start, 'reopened-guide-dismiss'); await activate(start, profile.input); await dialog.waitFor({ state: 'hidden' }); await settle(page);
      await hold(reopened, 'manual reopen and dismissal');
      await page.reload({ waitUntil: 'domcontentloaded' }); await help.waitFor(); await loadedFonts(page); await settle(page);
      assert.equal(await dialog.count(), 0, 'Returning visitor enters quietly');
      assert.equal(await page.evaluate(key => localStorage.getItem(key), sport.saveKey), initialBytes);
      const play = page.getByRole('button', { name: /^Play the \d+ season$/ });
      await play.scrollIntoViewIfNeeded(); await inspect(play, 'main-play');
      if (slug === 'nba' && profile.width === 320) {
        for (const kind of ['size', 'clip', 'overflow']) {
          const node = kind === 'overflow' ? page.locator('body') : play;
          const style = await node.getAttribute('style'), scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
          const beforeGeometry = await measure(page, play); let changed;
          const expected = kind === 'size' ? 'control-size: action has a 44px target' : kind === 'clip' ? 'control-clip: action is fully visible' : 'control-overflow: document fits configured width';
          try {
            await node.evaluate((el, { kind, width, height }) => {
              if (kind === 'overflow') el.style.minWidth = `${width + 80}px`;
              else if (kind === 'size') el.style.cssText = 'width:20px;min-width:20px;height:20px;min-height:20px;padding:0;font-size:0;line-height:0';
              else el.style.cssText = `position:fixed;left:8px;top:${height - 22}px;height:44px;min-height:44px;margin:0;transform:none;z-index:9999`;
            }, { kind, width: profile.width, height: profile.height });
            changed = await measure(page, play); result.steps.push({ stage: `control-${kind}`, geometry: changed });
            assert.notDeepEqual(changed, beforeGeometry, 'Geometry mutation changes the measured page');
            assert.throws(() => checkTarget(changed, profile, `control-${kind}`), error => error.code === 'ERR_ASSERTION' && error.message === expected);
          } finally {
            await node.evaluate((el, old) => old === null ? el.removeAttribute('style') : el.setAttribute('style', old), style);
            await page.evaluate(position => scrollTo({ left: position.x, top: position.y, behavior: 'instant' }), scroll);
          }
          await settle(page); const restored = await measure(page, play); checkTarget(restored, profile, `restored-${kind}`);
          report.controls.push({ id, kind, before: beforeGeometry, changed, restored, rejected: true });
        }
      }
      await page.evaluate(tape => { window.__entryTape = [...tape]; }, fixture.tape);
      const isActivity = request => request.method() === 'POST' && new URL(request.url()).pathname === '/rest/v1/game_completions';
      playingSetupSeason = true;
      const [, activityResponse] = await Promise.all([
        page.waitForRequest(isActivity), page.waitForResponse(response => isActivity(response.request())), activate(play, profile.input),
      ]);
      await activityResponse.finished(); assert.equal(activityResponse.status(), 200, 'The isolated season activity was fulfilled');
      const reveal = page.locator('[data-season-reveal]'); await reveal.waitFor(); await settle(page); playingSetupSeason = false;
      assert.equal(result.eventSetupWrites.length, 1, 'Only the single deliberate season activity belongs to setup');
      assert.equal(result.eventSetupWrites[0].method, 'POST'); assert.equal(result.eventSetupWrites[0].path, '/rest/v1/game_completions');
      const setupBody = result.eventSetupWrites[0].body, setupRows = Array.isArray(setupBody) ? setupBody : [setupBody];
      assert.equal(setupRows.length, 1, 'Setup records exactly one activity row');
      assert(setupRows[0] && typeof setupRows[0] === 'object', 'Setup activity has a row body');
      assert.equal(setupRows[0].game, sport.gameSlug, 'Setup activity belongs to the selected career');
      assert.equal(setupRows[0].score, undefined, 'Setup activity is unscored');
      const next = reveal.getByRole('button', { name: 'Continue', exact: true }); await inspect(next, 'season-continue');
      const afterSeason = await state(page); await activate(next, profile.input); await reveal.waitFor({ state: 'hidden' }); await settle(page);
      assert.deepEqual(await state(page), afterSeason, 'Season reveal Continue adds no draw or save');
      assert.equal(await page.locator('[data-career-decision-event]').count(), 1, 'The real pending choice follows the reveal');
      assert.deepEqual(result.scoreWrites, [], 'Help and reveal Continue attempt no completion transport');
      assert.deepEqual(result.pageErrors, []); assert.deepEqual(result.consoleErrors, []); assert.deepEqual(result.localFailures, []); assert.deepEqual(result.fontFailures, []);
      result.passed = true;
    } catch (error) { result.error = String(error.stack || error); await page.screenshot({ path: path.join(OUT, `${id}-failure.png`), animations: 'disabled' }).catch(() => {}); }
    finally { await context.close(); save(); }
  }
  assert.equal(report.cases.length, 16); assert.equal(report.controls.length, 3);
  assert(report.cases.every(result => result.passed), 'Every real career entry profile passes');
} finally { report.finished = new Date().toISOString(); save(); await browser?.close(); server.kill(); fs.writeFileSync(path.join(OUT, 'server.log'), serverLog); }
