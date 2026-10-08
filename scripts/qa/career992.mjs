/* Round 992 native acceptance: the built app, real generated career saves,
   real five-second drills and native touch/keyboard input. This owns its
   server and fresh browser contexts. It never opens a personal profile.
   Run after npm run build. Evidence: career-practice-artifacts/native. */
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
const OUT = path.resolve(process.env.CAREER992_ARTIFACTS || path.join(ROOT, 'career-practice-artifacts/native'));
fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build dist before the native practice walk');

// Generate through the current engines. Only the fictional player's starting
// rating/headroom are fixed, so every sport must visibly bank the same +2.
const bundle = path.join(OUT, 'fixtures.cjs');
await build({
  stdin: {
    contents: `
      import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
      import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
      import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
      import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
      import { defaultAppearance } from '@/lib/soccerCareerAppearance';
      function rng(seed) { let a = seed >>> 0; return () => {
        a = (a + 0x6D2B79F5) >>> 0; let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      }; }
      export const fixtures = [NFL_CAREER_SPORT, NBA_CAREER_SPORT, MLB_CAREER_SPORT, NHL_CAREER_SPORT].map((sport, i) => {
        const random = rng(99200 + i), pos = sport.create.defaultPos;
        const c = sport.startCareer('Simulated Practice Player', pos, sport.create.archetypes[pos][0], random, defaultAppearance(), 'now');
        c.ovr = 70; c.pot = 90; c.health = 100; c.contractYears = 3;
        sport.assignRole(c, 75, random);
        sport.draftNightInbox(c);
        return { slug: sport.slug, label: sport.label, key: sport.saveKey, practiceLabel: sport.practiceLabel,
          save: { c, phase: 'season', teamQuality: 75, coach: null } };
      });`,
    resolveDir: ROOT, sourcefile: 'career992-fixtures.ts', loader: 'ts',
  },
  outfile: bundle, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent',
  alias: { '@': path.join(ROOT, 'src') },
});
const { fixtures } = createRequire(import.meta.url)(bundle);
assert.equal(fixtures.length, 4);
fs.writeFileSync(path.join(OUT, 'fixtures.json'), JSON.stringify(fixtures, null, 2));
const burst = {
  nfl: { name: 'The 40', drill: 'forty' }, nba: { name: 'Lane Agility', drill: 'lane' },
  mlb: { name: 'Home to First', drill: 'first' }, nhl: { name: 'Blue Line Sprint', drill: 'sprint' },
};
const profiles = [
  ...fixtures.map(game => ({ game, width: 390, height: 844, touch: true, reduced: false })),
  { game: fixtures[1], width: 320, height: 740, touch: true, reduced: true },
  { game: fixtures[1], width: 1440, height: 1000, touch: false, reduced: false },
];
const report = { started: new Date().toISOString(), cases: [] };
const saveReport = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const port = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const chosen = probe.address().port; probe.close(error => error ? reject(error) : resolve(chosen)); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], {
  cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
let serverLog = '', browser;
server.stdout.on('data', data => { serverLog += data; });
server.stderr.on('data', data => { serverLog += data; });

async function ready() {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Owned host-like server did not start within 15 seconds')), 15000);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
    server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  });
}
async function layout(page, dialog) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 2, `Page overflows horizontally by ${overflow}px`);
  if (dialog) {
    const box = await dialog.boundingBox();
    const viewport = page.viewportSize();
    assert(box && box.x >= -1 && box.y >= -1 && box.x + box.width <= viewport.width + 1
      && box.y + box.height <= viewport.height + 1, `Practice dialog escaped the viewport: ${JSON.stringify(box)}`);
    const internal = await dialog.evaluate(el => el.scrollWidth - el.clientWidth);
    assert(internal <= 2, `Practice content overflows by ${internal}px`);
  }
}
async function tapSize(button) {
  const box = await button.boundingBox();
  assert(box && box.width >= 44 && box.height >= 44, `Small practice target: ${JSON.stringify(box)}`);
}
async function activate(button, touch) {
  if (touch) await button.tap();
  else { await button.focus(); await button.press('Enter'); }
}
async function nextFrames(page) {
  return page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(window.scrollY)))));
}
async function readSave(page, key) { return page.evaluate(k => localStorage.getItem(k), key); }
async function closeAndCheck(page, dialog, opener, touch) {
  const y = await nextFrames(page);
  if (touch) await dialog.getByRole('button', { name: 'Close', exact: true }).tap();
  else await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  assert(await opener.evaluate(el => document.activeElement === el), 'Closing practice did not return focus to its opener');
  const after = await nextFrames(page);
  assert(Math.abs(after - y) <= 1, `Closing practice moved the page from ${y} to ${after}`);
  return { before: y, after };
}

try {
  await ready();
  browser = await chromium.launch({ headless: true });
  for (const profile of profiles) {
    const { game, width, height, touch, reduced } = profile;
    const id = `${game.slug}-${width}-${touch ? 'touch' : 'keyboard'}${reduced ? '-reduced' : ''}`;
    const result = { id, route: `/${game.slug}-my-career`, viewport: { width, height }, input: touch ? 'touch' : 'keyboard', reduced, screenshots: [], pageErrors: [], consoleErrors: [], localFailures: [] };
    report.cases.push(result);
    const context = await browser.newContext({
      viewport: { width, height }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1,
      reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
        ...fixtures.map(f => ({ name: f.key, value: JSON.stringify(f.save) })),
        { name: `rules-gate-seen:${result.route}`, value: '1' },
        { name: 'cookie-consent', value: 'essential' },
      ] }] },
    });
    // Keep this career proof offline. No route is allowed to send fixture data
    // to analytics or a public service. The app's own assets remain untouched.
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === BASE) return route.continue();
      const type = route.request().resourceType();
      return route.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : 'application/json', body: type === 'stylesheet' ? '' : '[]' });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => result.pageErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
    page.on('requestfailed', request => { if (request.url().startsWith(BASE)) result.localFailures.push(`${request.url()}: ${request.failure()?.errorText}`); });
    const shot = async stage => {
      const file = `${id}-${stage}.png`;
      await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' });
      result.screenshots.push(file);
    };
    try {
      await page.goto(`${BASE}${result.route}`, { waitUntil: 'domcontentloaded' });
      const card = page.getByRole('region', { name: 'Season practice' });
      const start = card.getByRole('button', { name: 'Start practice', exact: true });
      await start.waitFor({ state: 'visible' });
      await card.scrollIntoViewIfNeeded();
      await tapSize(start); await layout(page); await shot('hub');
      const original = JSON.stringify(game.save);
      assert.equal(await readSave(page, game.key), original, 'Opening the career changed its old save');

      await activate(start, touch);
      let dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Practice rules', exact: true }).waitFor();
      assert.match(await dialog.locator('[data-practice-rules]').innerText(), /Example: an 80 score at 74 OVR with a 75 ceiling earns \+1/);
      await layout(page, dialog); await shot('menu');
      await tapSize(dialog.getByRole('button', { name: 'Close', exact: true }));
      if (!touch) {
        const first = dialog.getByRole('button', { name: 'Practice rules', exact: true });
        await first.focus(); await page.keyboard.press('Shift+Tab');
        assert(await dialog.getByRole('button').last().evaluate(el => document.activeElement === el), 'Reverse tab escaped the practice dialog');
        await page.keyboard.press('Tab');
        assert(await first.evaluate(el => document.activeElement === el), 'Forward tab escaped the practice dialog');
      }
      result.abortScroll = await closeAndCheck(page, dialog, start, touch);
      assert.equal(await readSave(page, game.key), original, 'Closing unbanked practice changed the save');

      await activate(start, touch);
      dialog = page.getByRole('dialog');
      const drill = dialog.getByRole('button', { name: new RegExp(burst[game.slug].name) });
      await drill.waitFor(); await tapSize(drill); await activate(drill, touch);
      const rules = dialog.getByRole('button', { name: 'Practice rules', exact: true });
      await activate(rules, touch);
      assert.match(await dialog.locator('[data-practice-rules]').innerText(), /Banking uses this season's session/);
      await activate(rules, touch);
      assert.equal(await dialog.getAttribute('data-practice-paused'), 'true', 'Closing rules resumed practice without an explicit action');
      const resume = dialog.getByRole('button', { name: 'Resume practice', exact: true });
      await tapSize(resume); await activate(resume, touch);
      assert.equal(await dialog.getAttribute('data-practice-paused'), 'false', 'Explicit resume did not release the practice pause');
      const startDrill = dialog.getByRole('button', { name: /Tap to start/ });
      await tapSize(startDrill); await layout(page, dialog); await shot('drill');
      await activate(startDrill, touch);
      const floor = dialog.getByRole('button', { name: /GO GO GO/ });
      const began = Date.now();
      if (!touch) await floor.focus();
      for (let i = 0; i < 25; i++) {
        if (touch) await floor.tap();
        else await floor.press('Space');
      }
      result.inputMs = Date.now() - began;
      const score = dialog.locator('[data-training-score]');
      await score.waitFor({ state: 'visible' });
      assert.equal(await score.innerText(), '80', 'The 25 native inputs did not produce an 80-point session');
      assert.equal(await readSave(page, game.key), original, 'The drill paid out before banking');
      if (reduced) {
        assert(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
        assert.equal(await dialog.locator('[data-training-summary]').evaluate(el => getComputedStyle(el).animationName), 'none', 'Reduced-motion result still animates');
      }
      await layout(page, dialog); await shot('result');
      const bank = dialog.getByRole('button', { name: 'Bank the session', exact: true });
      await tapSize(bank); await activate(bank, touch);
      await dialog.getByRole('button', { name: 'Back to your career', exact: true }).waitFor();
      assert.match(await dialog.getByRole('status').innerText(), /Rating \+2\. OVR 70 to 72\./);
      const expected = structuredClone(game.save);
      expected.c.ovr = 72;
      expected.c.practice = { ovr: 72, tier: 2, gain: 2, year: expected.c.year, drill: burst[game.slug].drill, score: 80, before: 70 };
      const banked = await readSave(page, game.key);
      assert.deepEqual(JSON.parse(banked), expected, 'Banking changed the wrong career data');
      result.practice = JSON.parse(banked).c.practice;
      await shot('banked');
      const view = card.getByRole('button', { name: 'View practice', exact: true });
      result.bankedScroll = await closeAndCheck(page, dialog, view, touch);
      assert.match(await card.innerText(), new RegExp(`Session banked for ${expected.c.year}`));

      await page.reload({ waitUntil: 'domcontentloaded' });
      await view.waitFor({ state: 'visible' });
      await card.scrollIntoViewIfNeeded();
      assert.equal(await readSave(page, game.key), banked, 'Reload changed the banked save');
      await layout(page); await shot('restored');
      await activate(view, touch);
      dialog = page.getByRole('dialog');
      await dialog.getByText('Already trained this season', { exact: true }).waitFor();
      assert.equal(await dialog.getByRole('button', { name: new RegExp(burst[game.slug].name) }).count(), 0, 'Reload reopened the spent session');
      assert.equal(await dialog.getByRole('button', { name: 'Bank the session', exact: true }).count(), 0);
      await layout(page, dialog); await shot('locked');
      await closeAndCheck(page, dialog, view, touch);
      assert.equal(await readSave(page, game.key), banked, 'Viewing a spent session paid again');
      for (const other of fixtures.filter(f => f.slug !== game.slug)) assert.equal(await readSave(page, other.key), JSON.stringify(other.save), `${other.label} save was changed by ${game.label} practice`);
      assert.deepEqual(result.pageErrors, [], 'Browser raised an uncaught app error');
      assert.deepEqual(result.localFailures, [], 'A local app asset failed to load');
      result.passed = true;
      console.log(`${id}: score 80, OVR 70 to 72, reload locked, layout and focus passed`);
    } catch (error) {
      result.passed = false; result.error = error.stack || String(error);
      console.error(`${id}: ${result.error}`);
      await shot('failure').catch(() => {});
      fs.writeFileSync(path.join(OUT, `${id}-failure.html`), await page.content().catch(() => 'Page unavailable'));
    } finally {
      saveReport();
      await context.close();
    }
  }
  assert.equal(report.cases.filter(row => row.passed).length, 6, 'Every native viewport and input case must pass');
} finally {
  await browser?.close();
  if (server.exitCode === null && !server.killed) server.kill();
  fs.writeFileSync(path.join(OUT, 'server.log'), serverLog);
  report.finished = new Date().toISOString();
  saveReport();
  console.log(`Native career practice evidence: ${OUT}`);
}
