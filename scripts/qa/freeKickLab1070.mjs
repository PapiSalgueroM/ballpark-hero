/* Actual built-app inputs only. Font preparation is a separate dependency download. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'free-kick-lab-artifacts/native');
const CACHE = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(ROOT, 'free-kick-lab-artifacts/font-cache'));
const sheetURL = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(match => new URL(match[1]).href);
assert.equal(sheetURL.length, 1, 'Read the actual template font stylesheet');
if (process.argv.includes('--prefetch-fonts-only')) {
  assert(process.env.CI, 'Font dependency downloads are remote CI only');
  fs.mkdirSync(CACHE, { recursive: true });
  const manifest = [];
  const download = async url => {
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(url).origin));
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36' } });
    assert(response.ok, 'Font dependency response succeeds');
    const body = Buffer.from(await response.arrayBuffer()), file = createHash('sha256').update(url).digest('hex');
    fs.writeFileSync(path.join(CACHE, file), body);
    manifest.push({ url, file, contentType: response.headers.get('content-type'), sha256: createHash('sha256').update(body).digest('hex') });
    return body.toString('utf8');
  };
  const css = await download(sheetURL[0]);
  const urls = [...new Set([...css.matchAll(/url\(\s*['"]?(https:\/\/[^)'"\s]+)/g)].map(match => match[1]))];
  assert(urls.length > 0);
  for (const url of urls) { assert.equal(new URL(url).origin, 'https://fonts.gstatic.com'); await download(url); }
  fs.writeFileSync(path.join(CACHE, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Prepared ${manifest.length} declared font dependencies for local fulfillment.`);
  process.exit(0);
}
const fontCache = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file));
  const body = fs.readFileSync(path.join(CACHE, entry.file));
  assert.equal(createHash('sha256').update(body).digest('hex'), entry.sha256);
  return [entry.url, { body, contentType: entry.contentType }];
}));
assert(fontCache.has(sheetURL[0]), 'Prepare current template fonts before guarded native run');
const { chromium } = await import('../lib/playwrightLoader.mjs');
const DATE = '2026-10-06', DAILY = `free-kick-daily-${DATE}`;
const dailyBytes = JSON.stringify({ score: 173, goals: 4, v: 1, date: DATE });
const protectedKeys = [DAILY, 'dukb-local-completions', 'dukb-streaks-v1', 'dukb-play-diary-v1'];
const sourceFiles = ['src/components/free-kick', 'src/lib/freeKick.ts', 'scripts/qa/freeKickLab1070.mjs'];
const sourceDigest = () => {
  const hash = createHash('sha256');
  for (const file of sourceFiles) {
    const full = path.join(ROOT, file);
    const files = fs.statSync(full).isDirectory() ? fs.readdirSync(full).sort().map(name => path.join(full, name)) : [full];
    for (const source of files) hash.update(source).update(fs.readFileSync(source));
  }
  return hash.digest('hex');
};
const originalSource = sourceDigest();
fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build dist before native verification');
const report = { cases: [], controls: [], controlEvidence: [], forwardedRequests: 0, sourceBefore: originalSource };
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let browser, serverLog = '';
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned server did not start')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
});
const protectedState = page => page.evaluate(keys => keys.map(key => [key, localStorage.getItem(key)]), protectedKeys);
const POWER = 'Power', BEND = 'How much bend to put on the ball';
async function measure(page) {
  return page.evaluate(() => {
    const area = document.querySelector('[role="dialog"]') || document.querySelector('[data-free-kick-lab]');
    const box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
      targets: [...area.querySelectorAll('button,input[type="range"]')].filter(el => el.getClientRects().length).map(el => ({ ...box(el), label: el.getAttribute('aria-label') || el.textContent })),
      cards: [...area.querySelectorAll('[data-lab-shot],[data-lab-comparison],[data-lab-result]')].map(el => ({ ...box(el), scroll: el.scrollWidth, client: el.clientWidth })),
      text: [...area.querySelectorAll('p,dt,dd,label')].filter(el => el.getClientRects().length).map(el => ({ text: el.textContent, font: parseFloat(getComputedStyle(el).fontSize) })),
      fonts: ['Inter', 'Space Grotesk'].flatMap(family => [400, 500, 600, 700].map(weight => document.fonts.check(`${weight} 16px "${family}"`, 'Free Kick'))),
    };
  });
}
function geometry(value) {
  assert(value.scrollWidth <= value.width + 2, 'Horizontal page overflow');
  assert(value.fonts.length === 8 && value.fonts.every(Boolean), 'Actual site fonts loaded');
  for (const box of value.targets) assert(box.width >= 43.5 && box.height >= 43.5, `Target below 44px: ${box.label}`);
  for (const box of value.cards) assert(box.x >= -1 && box.right <= value.width + 1 && box.scroll <= box.client + 2, 'Comparison card overflow');
  for (const text of value.text) assert(text.font >= 10, `Text below 10px: ${text.text}`);
}
async function focused(control) {
  const state = await control.evaluate(el => ({ active: document.activeElement === el, outline: parseFloat(getComputedStyle(el).outlineWidth), style: getComputedStyle(el).outlineStyle }));
  assert(state.active && state.outline >= 2 && state.style !== 'none', 'Visible keyboard focus');
}
async function shape(board, which = 'current') {
  return board.evaluate((el, name) => {
    const card = el.querySelector(`[data-lab-shot="${name}"]`), line = el.querySelector(`[data-lab-path="${name}"]`);
    const ball = el.querySelector('svg[role="img"] > circle:last-child');
    return { path: line?.getAttribute('points'), dash: line?.getAttribute('stroke-dasharray'), samples: Number(line?.getAttribute('data-lab-samples')),
      ball: ball ? [Number(ball.getAttribute('cx')), Number(ball.getAttribute('cy'))] : null,
      data: card ? { ...card.dataset } : null, fields: [...(card?.querySelectorAll('dl') || [])].map(dl => dl.textContent), text: card?.textContent,
      arrivals: card?.querySelectorAll('[data-lab-arrival-reading]').length || 0 };
  }, which);
}
try {
  await ready; browser = await chromium.launch({ headless: true });
  for (const profile of [
    { width: 320, height: 780, touch: true, reduced: true, restored: false, theme: 'dark' },
    { width: 390, height: 844, touch: true, reduced: false, restored: true, theme: 'light' },
    { width: 1280, height: 720, touch: false, reduced: false, restored: true, theme: 'dark' },
  ]) {
    const id = `${profile.width}-${profile.touch ? 'touch' : 'keyboard'}-${profile.reduced ? 'reduced' : 'full'}`;
    const row = { id, ...profile, screenshots: [], layouts: [], inputs: 0, shots: [], errors: [], assetErrors: [], intercepted: [], writes: [], storageWrites: [] };
    report.cases.push(row);
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.touch, hasTouch: profile.touch,
      reducedMotion: profile.reduced ? 'reduce' : 'no-preference', colorScheme: profile.theme, serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: profile.theme },
        ...(profile.restored ? [{ name: DAILY, value: dailyBytes }] : [])] }] } });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) { assert(['GET', 'HEAD'].includes(request.method()), 'No loopback writes'); return route.continue(); }
      row.intercepted.push({ method: request.method(), origin: url.origin, path: url.pathname });
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) row.writes.push({ method: request.method(), path: url.pathname });
      if (request.method() === 'GET' && fontCache.has(url.href)) return route.fulfill({ status: 200, ...fontCache.get(url.href) });
      if (request.resourceType() === 'font') { row.assetErrors.push(`Uncached font: ${url.href}`); return route.abort(); }
      return route.fulfill({ status: 200, contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'application/json', body: request.resourceType() === 'stylesheet' ? '' : '[]' });
    });
    await context.routeWebSocket('**/*', socket => socket.close());
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    await page.addInitScript(({ keys, date }) => {
      const OriginalDate = Date, now = new OriginalDate(date + 'T16:00:00Z').getTime();
      window.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
      window.__labWrites = [];
      for (const method of ['setItem', 'removeItem', 'clear']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function(key, ...args) {
          if (this === localStorage && (method === 'clear' || keys.includes(key) || key?.startsWith('free-kick'))) window.__labWrites.push({ method, key });
          return original.call(this, key, ...args);
        };
      }
    }, { keys: protectedKeys, date: DATE });
    page.on('pageerror', error => row.errors.push(String(error)));
    page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.assetErrors.push(request.url() + ': ' + request.failure()?.errorText); });
    page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assetErrors.push(response.url() + ': ' + response.status()); });
    const board = page.locator('[data-free-kick-lab]'), button = name => board.getByRole('button', { name, exact: true });
    const pitch = () => board.locator('svg[role="img"]');
    const dialogReady = async dialog => {
      await dialog.waitFor({ state: 'visible' });
      await page.waitForFunction(el => el.getAnimations({ subtree: true }).every(animation => !animation.pending && animation.playState !== 'running'), await dialog.elementHandle(), { timeout: 2000 });
    };
    const focusReady = async control => {
      await page.waitForFunction(el => document.activeElement === el, await control.elementHandle(), { timeout: 2000 });
    };
    const activate = async control => {
      const box = await control.boundingBox(); assert(box && box.width >= 43.5 && box.height >= 43.5, 'Action target at least 44px'); row.inputs++;
      if (profile.touch) await control.tap(); else { await control.focus(); await control.press('Enter'); }
    };
    const range = async (name, value) => {
      const control = board.getByRole('slider', { name, exact: true }), min = Number(await control.getAttribute('min')), step = Number(await control.getAttribute('step'));
      await control.focus(); await control.press('Home'); row.inputs++;
      for (let index = 0; index < Math.round((value - min) / step); index++) { await control.press('ArrowRight'); row.inputs++; }
      assert(Math.abs(Number(await control.inputValue()) - value) < 0.0001, 'Real slider input reached value');
    };
    const aim = async (x, y) => {
      const field = pitch(), box = await field.boundingBox(); assert(box);
      const position = { x: (60 + (x + 1) * 120) / 360 * box.width, y: (150 - y * 116) / 210 * box.height };
      if (profile.touch) await field.tap({ position }); else await field.click({ position }); row.inputs++;
      assert.equal(await board.getAttribute('data-arcade-phase'), 'aiming', 'Pitch input only aims');
    };
    const inspect = async stage => { const value = await measure(page); row.layouts.push({ stage, ...value }); geometry(value); };
    const screenshot = async stage => { const file = `${id}-${stage}.png`; await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' }); row.screenshots.push(file); };
    const settings = () => Promise.all([POWER, BEND].map(name => board.getByRole('slider', { name, exact: true }).inputValue()));
    const settled = async attempt => {
      await board.locator('[data-lab-result]').waitFor();
      assert.equal(await board.getAttribute('data-lab-attempt'), String(attempt));
      // Observe product reveal before any test-driven focus or scroll.
      await page.waitForFunction(() => [...document.querySelectorAll('[data-lab-result] button')].length > 0 && [...document.querySelectorAll('[data-lab-result] button')].every(el => { const box = el.getBoundingClientRect(); return box.top >= 0 && box.bottom <= innerHeight; }));
      assert(await button('Retry this kick').evaluate(el => document.activeElement === el), 'Result focuses Retry');
      await inspect('result-' + attempt); const value = await shape(board); row.shots.push(value); return value;
    };
    try {
      await page.goto(BASE + '/free-kick', { waitUntil: 'domcontentloaded' });
      const entry = page.getByRole('button', { name: 'Shot lab', exact: true }); await entry.waitFor();
      row.fonts = await page.evaluate(async () => {
        const result = []; for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
          const faces = await document.fonts.load(`${weight} 16px "${family}"`, 'Free Kick'); result.push({ family, weight, loaded: faces.length > 0 && faces.every(face => face.status === 'loaded') });
        } await document.fonts.ready; return result;
      });
      assert(row.fonts.length === 8 && row.fonts.every(face => face.loaded), 'Eight actual font faces loaded');
      const before = await protectedState(page);
      await activate(entry); const dialog = page.getByRole('dialog', { name: 'Shot lab rules', exact: true }); await dialogReady(dialog);
      assert(/example/i.test(await dialog.innerText()), 'Worked example appears before play');
      await inspect('preplay'); await screenshot('preplay');
      await activate(dialog.getByRole('button', { name: 'Start Shot lab', exact: true })); await dialog.waitFor({ state: 'hidden' }); await board.waitFor();
      assert.equal(await board.getAttribute('data-lab-setup'), '1');
      const power = board.getByRole('slider', { name: POWER, exact: true });
      await focusReady(button('Kick'));
      assert(await button('Kick').evaluate(el => document.activeElement === el), 'Entry focuses Kick');
      await aim(-0.7, 0.7); await range(POWER, 0.6); await range(BEND, 0);
      const originalSettings = await settings();
      await power.press('Space'); row.inputs++;
      assert.equal(await board.getAttribute('data-arcade-phase'), 'aiming', 'Slider Space never kicks');
      await activate(button('Shot lab rules')); await dialogReady(dialog);
      assert.equal(await board.getAttribute('data-arcade-paused'), 'true');
      await dialog.press('Space'); row.inputs++;
      assert.equal(await board.getAttribute('data-arcade-phase'), 'aiming', 'Modal Space never kicks');
      await inspect('reopened-rules'); await screenshot('rules');
      await dialog.press('Escape'); row.inputs++; await dialog.waitFor({ state: 'hidden' });
      await focusReady(button('Shot lab rules'));
      assert(await button('Shot lab rules').evaluate(el => document.activeElement === el), 'Rules return focus to opener');
      await activate(button('Resume')); assert.deepEqual(await settings(), originalSettings);
      await inspect('aiming'); await screenshot('aiming');
      await activate(button('Kick')); const first = await settled(1);
      assert(first.path?.split(' ').length === 25 && first.samples === 25, 'First real full trajectory is visible');
      assert.equal(first.data.labArrival, 'true'); assert.equal(first.arrivals, 1, 'Actual goal arrival reading is visible');
      assert.equal(await board.locator('[data-lab-path]').count(), 1);
      await screenshot('first');
      await activate(button('Retry this kick')); assert.deepEqual(await settings(), originalSettings, 'Retry retains chosen settings');
      assert(await button('Kick').evaluate(el => document.activeElement === el), 'Retry focuses Kick');
      await activate(button('Kick')); const repeated = await settled(2), previous = await shape(board, 'previous');
      assert.equal(repeated.path, first.path, 'Identical input repeats exact trajectory'); assert.deepEqual(repeated.fields, first.fields, 'Identical input repeats measured result');
      assert.equal(repeated.data.labVerdict, first.data.labVerdict); assert.equal(repeated.data.labScored, first.data.labScored);
      assert.equal(previous.path, first.path); assert(previous.dash && !repeated.dash, 'Previous is dashed, current is solid');
      await screenshot('identical');
      await activate(button('Retry this kick')); await range(BEND, 0.4);
      assert.equal((await settings())[0], originalSettings[0], 'Changing Bend retains Power');
      await activate(button('Kick')); const changed = await settled(3);
      assert.notEqual(changed.path, repeated.path, 'Changed Bend visibly changes actual path');
      assert.equal((await shape(board, 'previous')).path, repeated.path); assert.equal(await board.locator('[data-lab-shot]').count(), 2, 'Only latest two attempts retained');
      await screenshot('bend-comparison');
      await pitch().scrollIntoViewIfNeeded();
      const visiblePaths = await board.locator('[data-lab-path]').evaluateAll(lines => lines.map(line => {
        const box = line.getBoundingClientRect(), css = getComputedStyle(line);
        return { width: box.width, height: box.height, top: box.top, bottom: box.bottom, viewport: innerHeight, stroke: css.stroke, opacity: css.opacity };
      }));
      assert.equal(visiblePaths.length, 2);
      assert(visiblePaths.every(line => line.width > 0 && line.height > 0 && line.bottom > 0 && line.top < line.viewport && line.stroke !== 'none' && Number(line.opacity) > 0), 'Both actual trajectories visibly render, including reduced motion');
      row.visiblePaths = visiblePaths; await screenshot('compared-pitch');
      if (!report.controls.length) {
        const retry = button('Retry this kick'), card = board.locator('[data-lab-shot="current"]');
        for (const [name, target, style, failure] of [
          ['target', retry, 'min-height:20px;height:20px;max-height:20px;padding:0', /Target below 44px/],
          ['overflow', card, 'position:relative;left:1000px', /overflow/i],
        ]) {
          const saved = await target.getAttribute('style'); await target.evaluate((el, value) => { el.setAttribute('style', value); }, style);
          assert.equal(await target.getAttribute('style'), style, 'Control changed actual DOM');
          const value = await measure(page); assert.throws(() => geometry(value), failure);
          await target.evaluate((el, value) => { if (value === null) el.removeAttribute('style'); else el.setAttribute('style', value); }, saved);
          const restored = await measure(page); geometry(restored); report.controls.push(name);
          report.controlEvidence.push({ name, applied: style, fault: value, restored });
        }
      }
      await activate(button('Retry this kick'));
      if (!report.controls.includes('focus')) {
        await power.focus(); await power.press('ArrowRight'); row.inputs++; await focused(power);
        const saved = await power.getAttribute('style'); await power.evaluate(el => { el.style.outline = 'none'; });
        assert.equal(await power.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
        await assert.rejects(() => focused(power), /Visible keyboard focus/);
        await power.evaluate((el, value) => { if (value === null) el.removeAttribute('style'); else el.setAttribute('style', value); }, saved);
        await focused(power); report.controls.push('focus'); await range(POWER, 0.6);
        report.controlEvidence.push({ name: 'focus', faultOutline: 'none', restoredVisibleFocus: true });
      }
      await activate(button('Kick')); await settled(4);
      await activate(button('Change setup'));
      assert.equal(await board.getAttribute('data-lab-setup'), '2'); assert.equal(await board.getAttribute('data-lab-attempt'), '0');
      assert.equal(await board.locator('[data-lab-path],[data-lab-comparison]').count(), 0, 'Change setup clears comparison');
      assert.deepEqual(await settings(), ['0.6', '0.4'], 'Change setup retains controls');
      const wall = [Number(await board.getAttribute('data-lab-wall-lo')), Number(await board.getAttribute('data-lab-wall-hi'))];
      assert(wall.every(Number.isFinite) && wall[1] > wall[0], 'Actual second setup exposes wall span');
      await aim((wall[0] + wall[1]) / 2, 0.1); await range(BEND, 0);
      await activate(button('Kick'));
      if (!profile.reduced) {
        await activate(button('Pause')); assert.equal(await board.getAttribute('data-arcade-paused'), 'true');
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const frozen = await pitch().innerHTML(); await page.waitForTimeout(850);
        assert.equal(await board.getAttribute('data-arcade-phase'), 'flying'); assert.equal(await board.getAttribute('data-lab-attempt'), '0');
        assert.equal(await pitch().innerHTML(), frozen, 'Paused flight is visibly frozen'); await screenshot('paused');
        await activate(button('Resume'));
      }
      const blocked = await settled(1);
      assert.equal(blocked.data.labHitWall, 'true'); assert.equal(blocked.samples, 12, 'Wall trajectory ends at actual collision sample');
      assert.equal(blocked.data.labArrival, 'false'); assert.equal(blocked.arrivals, 0, 'Wall stop has no invented goal arrival');
      assert.deepEqual(blocked.ball, blocked.path.split(' ').at(-1).split(',').map(Number), 'Actual ball stops on the visible wall sample');
      await screenshot('wall-stop');
      await activate(button('Retry this kick')); await aim(wall[0] < 0 ? 0.8 : -0.8, 0.7); await range(POWER, 0.25);
      // Repeated native keydowns stay one activation even while held across settlement.
      await pitch().focus(); await page.keyboard.down('Space'); row.inputs++;
      for (let index = 0; index < 3; index++) { await page.keyboard.down('Space'); row.inputs++; }
      const weak = await settled(2); await page.keyboard.up('Space'); row.inputs++;
      assert.equal(await board.getAttribute('data-lab-attempt'), '2', 'Held/repeated Space produces one attempt');
      assert.equal(weak.data.labTooWeak, 'true'); assert.equal(weak.data.labArrival, 'false'); assert.equal(weak.arrivals, 0);
      await screenshot('weak-stop');
      await activate(button('Back to modes'));
      assert.equal(await page.locator('[data-free-kick-lab],[data-lab-comparison],[data-lab-path]').count(), 0, 'Exit clears lab state');
      if (profile.restored) {
        const destination = page.locator('[data-arcade-mode="daily"]'); assert.equal(await destination.getAttribute('data-arcade-phase'), 'done');
        assert((await destination.innerText()).includes('4 of 10 scored')); assert((await destination.innerText()).includes('173 points'));
      } else await page.getByRole('button', { name: "Today's ten", exact: true }).waitFor();
      assert.deepEqual(await protectedState(page), before, 'Daily, completion, streak and diary bytes unchanged');
      row.storageWrites = await page.evaluate(() => window.__labWrites); assert.deepEqual(row.storageWrites, [], 'No transient lab save writes');
      assert.deepEqual(row.writes, [], 'No external write attempts');
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'Shot lab', exact: true }).waitFor();
      assert.deepEqual(await protectedState(page), before, 'Original daily survives reload');
      assert.deepEqual(await page.evaluate(() => window.__labWrites), [], 'Reload does not write protected progress');
      await screenshot('daily-restored'); assert.deepEqual(row.errors, []); assert.deepEqual(row.assetErrors, []);
      row.passed = true; console.log(`${id}: repeat, Bend, wall, weak, pause, rules, held input, geometry and daily isolation passed.`);
    } catch (error) { row.passed = false; row.error = String(error.stack || error);
      row.failureFocus = await page.evaluate(() => ({ tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label'), text: document.activeElement?.textContent, dialogs: [...document.querySelectorAll('[role="dialog"]')].map(el => el.getAttribute('data-state')) })).catch(() => null);
      await screenshot('failure').catch(() => {}); console.error(`${id}: ${row.error}`); }
    finally { await context.close(); save(); }
  }
  assert.equal(report.controls.length, 3, 'Three effective restored DOM controls');
  assert.equal(report.cases.length, 3); assert(report.cases.every(row => row.passed), 'Every real input profile passes');
} finally {
  report.sourceAfter = sourceDigest(); report.sourceUnchanged = report.sourceAfter === originalSource;
  save(); await browser?.close(); server.kill(); fs.writeFileSync(path.join(OUT, 'server.log'), serverLog);
  assert(report.sourceUnchanged, 'Native QA leaves product and harness source immutable');
}
