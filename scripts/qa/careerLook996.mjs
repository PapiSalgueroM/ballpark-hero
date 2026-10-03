/* Round 996: actual create screens with fresh browser storage. No career is
   started. Run on the remote built app; save screenshots and delivery sizes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'career-look-artifacts/native');
fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build dist before the native look check');
const sports = [
  { slug: 'nfl', gear: 'Cleats', pose: 'Sideline Salute' },
  { slug: 'nba', gear: 'Sneakers', pose: 'Crowd Point' },
  { slug: 'mlb', gear: 'Cleats', pose: 'Dugout Point' },
  { slug: 'nhl', gear: 'Skates', pose: 'Stick Raise' },
  { slug: 'soccer', gear: 'Boots', pose: 'Knee Slide' },
];
const saveKeys = ['soccerCareerSave', ...sports.filter(s => s.slug !== 'soccer').map(s => `${s.slug}-my-career-save-v1`)];
const report = { started: new Date().toISOString(), cases: [] };
const saveReport = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const port = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const chosen = probe.address().port;
    probe.close(error => error ? reject(error) : resolve(chosen));
  });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], {
  cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
let serverLog = '', browser;
server.stdout.on('data', data => { serverLog += data; });
server.stderr.on('data', data => { serverLog += data; });
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned server did not start in 15 seconds')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => {
    if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); }
  });
});

async function activate(button, touch) {
  if (touch) await button.tap();
  else { await button.focus(); await button.press('Enter'); }
}
async function layout(page, editor) {
  const result = await editor.evaluate(el => {
    const box = el.getBoundingClientRect();
    return { viewport: innerWidth, document: document.documentElement.scrollWidth,
      editor: { left: box.left, right: box.right, client: el.clientWidth, scroll: el.scrollWidth } };
  });
  assert(result.document <= result.viewport + 2, `Page overflow: ${JSON.stringify(result)}`);
  assert(result.editor.left >= -1 && result.editor.right <= result.viewport + 1,
    `Look editor leaves viewport: ${JSON.stringify(result)}`);
  assert(result.editor.scroll <= result.editor.client + 2, `Look editor overflow: ${JSON.stringify(result)}`);
  return result;
}

try {
  await ready;
  browser = await chromium.launch({ headless: true });
  for (const sport of sports) for (const width of [390, 1440]) {
    const touch = width === 390;
    const reduced = !touch;
    const id = `${sport.slug}-${width}-${touch ? 'touch' : 'keyboard-reduced'}`;
    const result = { id, route: sport.slug === 'soccer' ? '/soccer-career' : `/${sport.slug}-my-career`,
      width, reduced, screenshots: [], layouts: [], pageErrors: [], assetFailures: [], interceptedRequests: [], scoreWrites: [] };
    report.cases.push(result);
    const scripts = new Set();
    const context = await browser.newContext({ viewport: { width, height: touch ? 844 : 1000 },
      isMobile: touch, hasTouch: touch, deviceScaleFactor: 1,
      reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: 'cookie-consent', value: 'essential' }] }] },
    });
    await context.route('**/*', route => {
      const request = route.request();
      if (new URL(request.url()).origin === BASE) return route.continue();
      const url = new URL(request.url());
      result.interceptedRequests.push({ method: request.method(), origin: url.origin, path: url.pathname });
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())
        && /\/(game_completions|user_game_scores|daily_completions|user_best_scores|record_auth_completion)$/.test(url.pathname)) {
        result.scoreWrites.push(request.method() + ' ' + url.pathname);
      }
      const css = request.resourceType() === 'stylesheet';
      return route.fulfill({ status: 200, contentType: css ? 'text/css' : 'application/json', body: css ? '' : '[]' });
    });
    const page = await context.newPage();
    await page.addInitScript(keys => {
      window.__careerLookWrites = [];
      for (const method of ['setItem', 'removeItem']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function(key, ...args) {
          if (this === localStorage && keys.includes(key)) window.__careerLookWrites.push({ method, key });
          return original.call(this, key, ...args);
        };
      }
    }, saveKeys);
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => result.pageErrors.push(String(error)));
    page.on('requestfailed', request => {
      if (request.url().startsWith(BASE)) result.assetFailures.push(request.url() + ': ' + request.failure()?.errorText);
    });
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.origin !== BASE) return;
      if (response.status() >= 400) result.assetFailures.push(`${url.pathname}: ${response.status()}`);
      if (url.pathname.startsWith('/assets/') && url.pathname.endsWith('.js')) scripts.add(url.pathname);
    });
    const shot = async stage => {
      const file = `${id}-${stage}.png`;
      await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' });
      result.screenshots.push(file);
    };
    try {
      await page.goto(BASE + result.route, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1500 }).catch(() => {});
      const help = page.getByRole('dialog');
      if (await help.count()) await page.keyboard.press('Escape');
      const editor = sport.slug === 'soccer'
        ? page.getByRole('heading', { name: 'Create Your Look', exact: true }).locator('xpath=../..')
        : page.locator(`[data-career-appearance="${sport.slug}"]`);
      await editor.getByRole('heading', { name: 'Create Your Look', exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await editor.scrollIntoViewIfNeeded();
      await editor.getByText(sport.pose, { exact: false }).waitFor();
      const before = await editor.innerText();
      assert(before.includes(sport.slug === 'soccer' ? 'Every goal, you' : 'Signature pose:'), 'Own sport preview context');
      if (sport.slug !== 'soccer') {
        assert(!before.includes('Every goal, you'), 'US preview must not describe soccer goals');
        assert(before.includes('Fictional gear and signature poses, just for your look.'), 'Gear remains explicitly fictional');
      }
      result.layouts.push(await layout(page, editor)); await shot('create');
      const gearTab = editor.getByRole('button', { name: new RegExp(`${sport.gear}$`) });
      await activate(gearTab, touch);
      const ghost = editor.getByRole('button', { name: 'Vortex Ghost', exact: true });
      await activate(ghost, touch);
      // Hide the option list, so the remaining label must come from the actual preview.
      const celebrationTab = editor.getByRole('button', { name: /Celebration$/ });
      await activate(celebrationTab, touch);
      assert.equal(await editor.getByText('Vortex Ghost', { exact: true }).count(), 1, 'Selected footwear reaches the preview');
      assert((await editor.innerText()).includes(sport.slug === 'soccer' ? 'All white. You do NOT slide tackle in these.' : `${sport.gear} in clean white.`));
      await activate(editor.getByRole('button', { name: sport.slug === 'soccer' ? /^🤸\s*Backflip$/ : /^✊\s*Fist Pump$/ }), touch);
      await activate(gearTab, touch);
      assert.equal(await editor.getByText(sport.slug === 'soccer' ? /^🤸\s*Backflip$/ : /^✊\s*Fist Pump$/).count(), 1, 'Selected pose reaches the preview');
      assert((await editor.innerText()).includes(sport.slug === 'soccer' ? 'throw a full backflip that makes the physio cover their eyes' : 'punch one fist into the air'));
      result.layouts.push(await layout(page, editor)); await shot('selected');
      await activate(celebrationTab, touch);
      assert.equal(await editor.getByText('Vortex Ghost', { exact: true }).count(), 1, 'Footwear survives switching tabs');
      result.layouts.push(await layout(page, editor)); await shot('poses');
      if (reduced) {
        assert(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
        result.avatarAnimation = await editor.locator('svg').first().evaluate(el => {
          const css = getComputedStyle(el); return { name: css.animationName, duration: css.animationDuration, iterations: css.animationIterationCount };
        });
        assert(result.avatarAnimation.duration.split(',').every(value => parseFloat(value) <= 0.00001), 'Reduced-motion avatar must not keep bobbing');
        assert.equal(result.avatarAnimation.iterations, '1', 'Reduced-motion avatar must not loop');
      }
      const saves = await page.evaluate(keys => keys.map(key => [key, localStorage.getItem(key)]), saveKeys);
      assert(saves.every(([, value]) => value === null), 'Changing appearance must not create or replace a career save');
      result.saveWrites = await page.evaluate(() => window.__careerLookWrites);
      assert.deepEqual(result.saveWrites, [], 'Look choices must not write or remove any career save');
      assert.deepEqual(result.scoreWrites, [], 'Create-screen interactions must not attempt score writes');
      assert.deepEqual(result.pageErrors, [], 'No uncaught page errors');
      assert.deepEqual(result.assetFailures, [], 'All app assets loaded');
      result.delivery = { files: scripts.size, rawBytes: 0, gzipBytes: 0 };
      for (const asset of scripts) {
        const bytes = fs.readFileSync(path.join(ROOT, 'dist', asset.slice(1)));
        result.delivery.rawBytes += bytes.length;
        result.delivery.gzipBytes += gzipSync(bytes).length;
      }
      result.passed = true;
      console.log(`${id}: own sport copy, footwear and pose changes, tab retention, empty saves and layout passed; ${result.delivery.gzipBytes} gzip bytes.`);
    } catch (error) {
      result.passed = false; result.error = String(error.stack || error);
      await shot('failure').catch(() => {});
      console.error(`${id}: ${result.error}`);
    } finally { await context.close(); saveReport(); }
  }
  assert.equal(report.cases.length, 10, 'All five sports at both widths ran');
  assert(report.cases.every(row => row.passed), 'Every native look case must pass');
} finally {
  report.finished = new Date().toISOString(); saveReport();
  await browser?.close(); server.kill();
  fs.writeFileSync(path.join(OUT, 'server.log'), serverLog);
}
