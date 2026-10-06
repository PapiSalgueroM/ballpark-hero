/* Native review and retry on the built app. Accepted fixtures isolate game data; exact read-only font requests may load. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fontLinks = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(match => new URL(match[1]).href);
assert.equal(fontLinks.length, 1, 'Native fonts bind the actual template stylesheet');
const isFontStylesheet = request => request.method() === 'GET' && fontLinks.includes(new URL(request.url()).href);
const isFontRead = (request, assets) => {
  const url = new URL(request.url());
  return isFontStylesheet(request) || (request.method() === 'GET' && request.resourceType() === 'font' && assets.has(url.href));
};
const OUT = path.join(ROOT, 'rugby-league-review-artifacts/native');
const records = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/test/fixtures/rugbyLeagueRecords.json'), 'utf8'));
const DATE = '2026-10-03', DAILY = `champ-or-not-daily-${DATE}`;
const protectedKeys = [DAILY, 'dukb-local-completions', 'dukb-streaks-v1', 'dukb-play-diary-v1'];
const dailyBytes = JSON.stringify({ answers: [true, false, true] });
const tables = {
  nrl_premiers: records.nrl.map((row, index) => ({ id: index + 1, year: row.year, premier: row.team })),
  nrl_dally_m: records.dallym.map((row, index) => ({ id: index + 1, year: row.year, winner: row.team })),
};
const profiles = [
  { width: 320, height: 780, input: 'touch', theme: 'dark', reduced: true },
  { width: 390, height: 844, input: 'touch', theme: 'light', reduced: false },
  { width: 1280, height: 720, input: 'mouse', theme: 'dark', reduced: false },
  { width: 1280, height: 720, input: 'keyboard', theme: 'light', reduced: true },
];
fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build before native verification');
const report = { started: new Date().toISOString(), cases: [] };
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
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(400);
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
async function activate(locator, input) {
  const box = await locator.boundingBox();
  assert(box && box.width >= 43 && box.height >= 43, 'Action has a 44px target: ' + await locator.innerText());
  if (input === 'touch') await locator.tap();
  else if (input === 'mouse') await locator.click();
  else { await locator.focus(); await locator.press('Enter'); }
}
async function layout(page, panel, stage) {
  const width = page.viewportSize().width;
  const data = await panel.evaluate(el => ({
    document: document.documentElement.scrollWidth, innerWidth,
    boxes: [el, ...el.querySelectorAll('button, [data-rugby-review-statement], [data-rugby-review-winners], [data-rugby-retry-statement], [data-rugby-retry-feedback]')].map(node => {
      const box = node.getBoundingClientRect();
      return { text: node.textContent?.slice(0, 80), left: box.left, right: box.right, width: box.width, client: node.clientWidth, scroll: node.scrollWidth };
    }).filter(box => box.width > 0),
  }));
  assert(data.document <= width + 2, `${stage}: document fits configured viewport`);
  for (const box of data.boxes) assert(box.left >= -1 && box.right <= width + 1 && box.scroll <= box.client + 2, `${stage}: full text fits its card ${JSON.stringify(box)}`);
  return { stage, width, ...data };
}
async function coVisible(page, context, action, stage) {
  await settle(page);
  const height = page.viewportSize().height;
  const boxes = [];
  for (const locator of [...context, action]) {
    const box = await locator.boundingBox();
    assert(box && box.height > 0 && box.y >= -1 && box.y + box.height <= height + 1, `${stage}: context and action are visible together without driver scrolling`);
    boxes.push(box);
  }
  return { stage, height, boxes };
}
function truthFor(statement, category) {
  assert(['nrl', 'dallym'].includes(category));
  const match = statement.match(category === 'nrl' ? /^(.+) won the top grade rugby league premiership in (\d{4})\.$/ : /^(.+) won the (\d{4}) Dally M Medal\.$/);
  assert(match, 'Actual claim uses the accepted competition wording');
  const [, team, yearText] = match, year = Number(yearText);
  assert(records[category].some(row => row.team === team));
  const winners = records[category].filter(row => row.year === year).map(row => row.team);
  assert(winners.length > 0); return { team, year, winners, truth: winners.includes(team) };
}
const protectedState = page => page.evaluate(keys => keys.map(key => [key, localStorage.getItem(key)]), protectedKeys);

try {
  await ready; browser = await chromium.launch({ headless: true });
  for (const profile of profiles) {
    const { width, height, input, theme, reduced } = profile;
    const id = `${width}-${input}-${theme}${reduced ? '-reduced' : ''}`;
    const result = { id, ...profile, screenshots: [], layouts: [], visibility: [], guardControls: [], claims: [], retries: [], pageErrors: [], consoleErrors: [], assetFailures: [], fontFailures: [], fontRequests: [], fontAssets: [], interceptedRequests: [], scoreWrites: [], storageWrites: [] };
    const fontAssets = new Set();
    report.cases.push(result);
    const context = await browser.newContext({ viewport: { width, height }, isMobile: input === 'touch', hasTouch: input === 'touch', deviceScaleFactor: 1,
      reducedMotion: reduced ? 'reduce' : 'no-preference', colorScheme: theme, serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
        { name: 'cookie-consent', value: 'essential' }, { name: DAILY, value: dailyBytes },
        { name: 'rules-gate-seen:/champ-or-not', value: '1' }, { name: 'dukb-theme', value: theme },
      ] }] },
    });
    await context.routeWebSocket('**/*', socket => socket.close());
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) return route.continue();
      result.interceptedRequests.push({ method: request.method(), path: url.pathname });
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && /\/(game_completions|user_game_scores|daily_completions|user_best_scores|user_scores|record_auth_completion)$/.test(url.pathname)) result.scoreWrites.push(`${request.method()} ${url.pathname}`);
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
      const table = url.pathname.match(/^\/rest\/v1\/([^/]+)$/)?.[1];
      if (table && Object.hasOwn(tables, table)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tables[table]) });
      const type = request.resourceType();
      if (type === 'font') {
        result.fontFailures.push(`Font URL is not declared by the actual template stylesheet: ${request.url()}`);
        return route.abort('blockedbyclient');
      }
      return route.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : type === 'script' ? 'application/javascript' : 'application/json', body: ['stylesheet', 'script'].includes(type) ? '' : '[]' });
    });
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    await page.addInitScript(({ keys, date }) => {
      const OriginalDate = Date, now = new OriginalDate(`${date}T16:00:00Z`).getTime();
      window.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
      window.__rugbyReviewWrites = [];
      for (const method of ['setItem', 'removeItem']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function(key, ...args) {
          if (this === localStorage && (keys.includes(key) || key.startsWith('champ-or-not'))) window.__rugbyReviewWrites.push({ method, key });
          return original.call(this, key, ...args);
        };
      }
    }, { keys: protectedKeys, date: DATE });
    page.on('pageerror', error => result.pageErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
    page.on('requestfailed', request => {
      if (request.url().startsWith(BASE)) result.assetFailures.push(`${request.url()}: ${request.failure()?.errorText}`);
      if (request.resourceType() === 'font' || isFontStylesheet(request)) result.fontFailures.push(`${request.url()}: ${request.failure()?.errorText}`);
    });
    page.on('response', response => {
      if (response.url().startsWith(BASE) && response.status() >= 400) result.assetFailures.push(`${response.url()}: ${response.status()}`);
      if ((response.request().resourceType() === 'font' || isFontStylesheet(response.request())) && response.status() >= 400) result.fontFailures.push(`${response.status()} ${response.url()}`);
    });
    const panel = page.locator('[data-rugby-challenge]');
    const button = name => panel.getByRole('button', { name, exact: true });
    const click = name => activate(button(name), input);
    const phase = value => page.waitForFunction(expected => document.querySelector('[data-rugby-challenge]')?.getAttribute('data-rugby-phase') === expected, value);
    const shot = async stage => { await settle(page); const name = `${id}-${stage}.png`; await page.screenshot({ path: path.join(OUT, name), animations: 'disabled' }); result.screenshots.push(name); };
    const visible = async (selectors, action, stage) => { const fonts = await loadedFonts(page); result.visibility.push(await coVisible(page, selectors.map(selector => panel.locator(selector)), button(action), stage)); result.layouts.push({ ...await layout(page, panel, stage), fonts }); };
    const originalScore = async () => {
      assert.equal(await panel.locator('[data-rugby-score="total"]').innerText(), '7 / 10');
      assert.equal(await panel.locator('[data-rugby-score="nrl"]').innerText(), '4 / 5');
      assert.equal(await panel.locator('[data-rugby-score="dallym"]').innerText(), '3 / 5');
    };
    const isolate = async held => {
      assert.deepEqual(await protectedState(page), held, 'Review/retry holds Daily, completion, streak and diary bytes');
      result.storageWrites = await page.evaluate(() => window.__rugbyReviewWrites);
      assert.deepEqual(result.storageWrites, [], 'Review/retry never transiently writes protected records');
      assert.deepEqual(result.scoreWrites, [], 'Review/retry never attempts a score write');
    };
    const clippingControl = async () => {
      const action = button('Back to original results'), contexts = [panel.locator('[data-rugby-review-statement]'), panel.locator('[data-rugby-review-winners]')];
      const style = await action.getAttribute('style'), before = await action.boundingBox();
      const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
      let changed;
      try {
        await action.evaluate((el, viewportHeight) => { const height = el.getBoundingClientRect().height; el.style.cssText = `position:fixed;left:8px;width:200px;top:${viewportHeight - height + 22}px;margin:0;transform:none;z-index:9999`; }, height);
        changed = await action.boundingBox();
        assert(before && changed && changed.y !== before.y && Math.abs(changed.y + changed.height - height - 22) <= 2, 'Clipping control changes the real action to 22px beyond the viewport');
        const message = 'clipped-action: context and action are visible together without driver scrolling';
        await assert.rejects(() => coVisible(page, contexts, action, 'clipped-action'), error => error.code === 'ERR_ASSERTION' && error.message === message);
      } finally {
        await action.evaluate((el, value) => { if (value === null) el.removeAttribute('style'); else el.setAttribute('style', value); }, style);
        await page.evaluate(position => window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' }), scroll);
      }
      const restored = await coVisible(page, contexts, action, 'clipped-action-restored');
      assert.equal(await action.getAttribute('style'), style);
      result.guardControls.push({ kind: 'visibility guard effectiveness', before, changed, restored, rejected: true });
    };
    const overflowControl = async () => {
      const style = await page.locator('body').getAttribute('style');
      const before = await page.evaluate(() => document.documentElement.scrollWidth);
      const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
      let changed;
      try {
        await page.locator('body').evaluate((el, value) => { el.style.minWidth = `${value + 80}px`; }, width);
        changed = await page.evaluate(() => document.documentElement.scrollWidth);
        assert(changed > width + 2 && changed > before, 'Overflow control changes actual document width');
        await assert.rejects(() => layout(page, panel, 'forced-overflow'), error => error.code === 'ERR_ASSERTION' && error.message === 'forced-overflow: document fits configured viewport');
      } finally {
        await page.locator('body').evaluate((el, value) => { if (value === null) el.removeAttribute('style'); else el.setAttribute('style', value); }, style);
        await page.evaluate(position => window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' }), scroll);
      }
      const restored = await layout(page, panel, 'overflow-restored');
      assert.equal(await page.locator('body').getAttribute('style'), style);
      const after = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
      assert(Math.abs(after.x - scroll.x) <= 1 && Math.abs(after.y - scroll.y) <= 1, 'Overflow control restores the original viewport');
      result.guardControls.push({ kind: 'configured viewport width guard effectiveness', before, changed, restored, rejected: true });
    };
    try {
      await page.goto(`${BASE}/champ-or-not`, { waitUntil: 'domcontentloaded' });
      await page.getByText(/Claim:/).first().waitFor(); result.fonts = await loadedFonts(page); await settle(page);
      assert.deepEqual(result.fontFailures, []);
      assert.equal(await page.locator('html').evaluate(el => el.classList.contains('light')), theme === 'light', 'The saved theme is active');
      assert.equal(await page.evaluate(key => localStorage.getItem(key), DAILY), dailyBytes);
      const held = await protectedState(page); await page.evaluate(() => { window.__rugbyReviewWrites = []; });
      await activate(page.getByRole('button', { name: 'Rugby League', exact: true }), input); await phase('intro');
      await click('Start ten questions'); await phase('question');
      for (let index = 0; index < 10; index++) {
        const category = await panel.locator('[data-rugby-question]').getAttribute('data-rugby-category');
        const statement = (await panel.locator('[data-rugby-statement]').innerText()).trim(), truth = truthFor(statement, category);
        const correct = index % 3 !== 1, pick = correct ? truth.truth : !truth.truth;
        result.claims.push({ index, category, statement, correct, pick, ...truth });
        assert.equal(await panel.locator('[data-rugby-open-review]').count(), 0, 'No future review before ten completed calls');
        await click(pick ? 'CHAMP' : 'NOT'); await phase('reveal');
        await click(index === 9 ? 'View results' : 'Next claim'); await phase(index === 9 ? 'done' : 'question');
      }
      await originalScore(); await visible(['[data-rugby-score="total"]', '[data-rugby-score="nrl"]', '[data-rugby-score="dallym"]'], 'Play another ten', 'original-results'); await shot('original-results');
      await click('Review ten calls'); await phase('review');
      assert.equal(await panel.getByRole('button', { name: /^Review claim / }).count(), 10);
      const firstTile = button('Review claim 1: correct');
      assert(await firstTile.evaluate(el => document.activeElement === el), 'Review opens with the selected tile focused');
      const reviewContext = ['[data-rugby-review-statement]', '[data-rugby-review-pick]', '[data-rugby-review-truth]', '[data-rugby-review-winners]'];
      for (const claim of result.claims) {
        const tile = button(`Review claim ${claim.index + 1}: ${claim.correct ? 'correct' : 'incorrect'}`);
        await activate(tile, input); await settle(page);
        assert.equal(await panel.locator('[data-rugby-review]').getAttribute('data-rugby-review-index'), String(claim.index + 1));
        assert.equal(await tile.getAttribute('aria-pressed'), 'true');
        if (input !== 'touch') assert(await tile.evaluate(el => document.activeElement === el), 'Review navigation keeps tile focus');
        assert.equal((await panel.locator('[data-rugby-review-statement]').innerText()).trim(), claim.statement);
        assert((await panel.locator('[data-rugby-review-pick]').innerText()).includes(`Your original call: ${claim.pick ? 'CHAMP' : 'NOT'}`));
        assert.equal((await panel.locator('[data-rugby-review-truth]').innerText()).trim(), `The claim is ${claim.truth ? 'true' : 'false'}.`);
        assert((await panel.locator('[data-rugby-review-winners]').innerText()).includes(claim.winners.join(' and ')), 'Every shared winner survives review');
        await visible(reviewContext, 'Back to original results', `review-${claim.index + 1}`);
        if (claim.index === 0 || claim.index === 9 || claim.winners.length > 1) await shot(`review-${claim.index + 1}`);
      }
      if (width === 320) { await clippingControl(); await overflowControl(); }
      await click('Back to original results'); await phase('done'); await originalScore();
      assert(await button('Review ten calls').evaluate(el => document.activeElement === el), 'Review Back restores its opener');
      await click('Retry 3 missed calls'); await phase('retry-question');
      const missed = result.claims.filter(claim => !claim.correct);
      for (const [at, claim] of missed.entries()) {
        assert.equal(await panel.locator('[data-rugby-retry]').getAttribute('data-rugby-retry-original'), String(claim.index + 1));
        assert.equal((await panel.locator('[data-rugby-retry-statement]').innerText()).trim(), claim.statement);
        assert.equal(await panel.locator('[data-rugby-retry-feedback]').count(), 0);
        await visible(['[data-rugby-retry-statement]', '[data-rugby-original-score]'], 'CHAMP', `retry-${at + 1}-question`);
        const correct = at !== 1, pick = correct ? claim.truth : !claim.truth;
        await click(pick ? 'CHAMP' : 'NOT'); await phase('retry-reveal');
        const next = at === missed.length - 1 ? 'View retry result' : 'Next missed call';
        assert((await panel.locator('[data-rugby-retry-feedback]').innerText()).includes(correct ? 'Corrected!' : 'Still one to learn.'));
        assert((await panel.locator('[data-rugby-retry-winners]').innerText()).includes(claim.winners.join(' and ')));
        assert((await panel.locator('[data-rugby-original-score]').innerText()).includes('Original: 7 / 10'));
        await visible(['[data-rugby-retry-statement]', '[data-rugby-retry-feedback]'], next, `retry-${at + 1}-reveal`);
        result.retries.push({ originalIndex: claim.index, pick, correct });
        if (at === 0) {
          await shot('retry-first-reveal'); const text = await panel.locator('[data-rugby-retry-feedback]').innerText();
          await click('Rugby League rules'); const dialog = page.getByRole('dialog', { name: 'Rugby League rules', exact: true }); await dialog.waitFor(); await settle(page);
          assert((await dialog.innerText()).includes('7/10 original run stays 7/10')); await dialog.press('Space'); assert(await dialog.isVisible());
          await activate(dialog.getByRole('button', { name: "Let's Play!", exact: true }), input); await dialog.waitFor({ state: 'hidden' });
          assert(await button('Rugby League rules').evaluate(el => document.activeElement === el));
          await click('Back to original results'); await phase('done'); await originalScore();
          assert(await button('Resume missed calls').evaluate(el => document.activeElement === el));
          await click('Resume missed calls'); await phase('retry-reveal');
          await activate(page.getByRole('button', { name: 'Daily', exact: true }), input); assert(!await panel.isVisible());
          await activate(page.getByRole('button', { name: 'Rugby League', exact: true }), input); await phase('retry-reveal');
          assert.equal(await panel.locator('[data-rugby-retry-feedback]').innerText(), text);
          await visible(['[data-rugby-retry-statement]', '[data-rugby-retry-feedback]'], next, 'resumed-reveal'); await shot('resumed-reveal');
        }
        await click(next); await phase(at === missed.length - 1 ? 'retry-done' : 'retry-question');
      }
      assert.equal(await panel.locator('[data-rugby-retry-score]').innerText(), '2 / 3 corrected');
      assert.equal(await panel.locator('[data-rugby-original-score]').innerText(), 'Original: 7 / 10, unchanged.');
      await visible(['[data-rugby-retry-score]', '[data-rugby-original-score]'], 'Back to original results', 'retry-result'); await shot('retry-result');
      await click('Back to original results'); await phase('done'); await originalScore();
      await click('View retry result'); await phase('retry-done'); assert.equal(await panel.locator('[data-rugby-retry-score]').innerText(), '2 / 3 corrected');
      await click('Try missed calls again'); await phase('retry-question'); assert.equal(await panel.locator('[data-rugby-retry-feedback]').count(), 0);
      await click('Back to original results'); await phase('done'); await click('Play another ten'); await phase('question');
      assert.equal(await panel.locator('[data-rugby-question]').getAttribute('data-rugby-question'), '1');
      assert.equal(await panel.locator('[data-rugby-review], [data-rugby-retry], [data-rugby-result]').count(), 0);
      await isolate(held);
      assert.deepEqual(result.pageErrors, []); assert.deepEqual(result.consoleErrors, []); assert.deepEqual(result.assetFailures, []); assert.deepEqual(result.fontFailures, []);
      result.passed = true; console.log(`${id}: original score, all ten reviews, exact missed queue, retained retry and native geometry passed.`);
    } catch (error) { result.passed = false; result.error = String(error.stack || error); await shot('failure').catch(() => {}); console.error(`${id}: ${result.error}`); }
    finally { await context.close(); save(); }
  }
  assert.equal(report.cases.length, profiles.length); assert(report.cases.every(result => result.passed), 'Every native review profile passes');
} finally { report.finished = new Date().toISOString(); save(); await browser?.close(); server.kill(); fs.writeFileSync(path.join(OUT, 'server.log'), serverLog); }
