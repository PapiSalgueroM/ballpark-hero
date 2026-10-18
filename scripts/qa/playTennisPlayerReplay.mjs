/* Actual built route with fictional HTTP rows. No production data or writes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from '../lib/playwrightLoader.mjs';

const base = 'http://127.0.0.1:4173';
const mode = process.argv[2];
assert(['baseline', 'fixed'].includes(mode));
const out = path.join(process.env.TENNIS_REPLAY_OUT, 'browser');
assert(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
const hash = body => createHash('sha256').update(body).digest('hex');
const fixture = {
  id: 'fictional-replay-player', player_name: 'Fictional Replay Player', common_names: [],
  vibe_word: 'Fictional clue one', nationality_era_hint: 'Fictional clue two',
  tour_hint: 'Fictional clue three', slam_count_hint: 'Fictional clue four',
  slam_detail_hint: 'Fictional clue five', famous_moment_hint: 'Fictional clue six',
};
const cache = new Map(JSON.parse(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, 'manifest.json'))).map(row => {
  const body = fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, row.file));
  assert.equal(hash(body), row.sha256);
  return [row.url, { body, contentType: row.contentType }];
}));
const report = { mode, fixture, scope: 'Chromium mouse and keyboard, fictional HTTP data, actual production route only', cases: [] };
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1280]) {
    const row = { width, writes: [], requests: [], errors: [], assets: [], screenshots: [] };
    report.cases.push(row);
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block', storageState: {
      cookies: [], origins: [{ origin: base, localStorage: [{ name: 'cookie-consent', value: 'essential' }] }],
    } });
    await context.route('**/*', route => {
      const req = route.request(), url = new URL(req.url());
      row.requests.push({ url: url.href, method: req.method() });
      if (url.origin === base) {
        assert.equal(req.method(), 'GET');
        return route.continue();
      }
      if (cache.has(url.href)) return route.fulfill({ status: 200, ...cache.get(url.href) });
      assert.notEqual(req.resourceType(), 'font', 'All actual font dependencies are cached');
      if (req.method() === 'POST') row.writes.push({ url: url.href, body: req.postData() });
      const data = req.method() === 'GET' && url.pathname === '/rest/v1/tennis_players' ? [fixture] : [];
      return route.fulfill({ status: 200, contentType: req.resourceType() === 'stylesheet' ? 'text/css' : 'application/json', body: req.resourceType() === 'stylesheet' ? '' : JSON.stringify(data) });
    });
    await context.routeWebSocket('**/*', socket => socket.close());
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => row.errors.push(error.message));
    const pending = [];
    page.on('response', response => {
      if (!response.url().startsWith(base + '/')) return;
      pending.push((async () => {
        assert.equal(response.status(), 200, response.url());
        const body = await response.body(), pathname = new URL(response.url()).pathname;
        const relative = pathname.endsWith('/') ? pathname + 'index.html' : path.extname(pathname) ? pathname : pathname + '/index.html';
        const physical = path.join(process.cwd(), 'dist', decodeURIComponent(relative));
        assert.equal(hash(body), hash(fs.readFileSync(physical)), 'Actual response matches completed dist');
        row.assets.push({ path: pathname, bytes: body.length, sha256: hash(body) });
      })());
    });
    const shot = async name => { const file = `${width}-${name}.png`; await page.screenshot({ path: path.join(out, file), fullPage: true }); row.screenshots.push(file); };
    const button = name => page.getByRole('button', { name });
    const input = () => page.getByRole('textbox', { name: 'Search tennis players' });
    const guess = async name => { await input().fill(name); await input().press('Enter'); };
    await page.goto(base + '/guess-tennis-player');
    await button(/Unlimited Mode/).waitFor({ state: 'visible' });
    await button(/Unlimited Mode/).click();
    await input().waitFor();
    await guess('Fictional Wrong Guess');
    await button(/^🏳️ Give Up$/).click();
    await button('Yes, Give Up').waitFor();
    await button(/Hint/).click();
    assert(await button('Yes, Give Up').isVisible(), 'Hint keeps the active confirmation');
    await button('Cancel').click();
    assert.equal(await button('Yes, Give Up').count(), 0);
    await button(/^🏳️ Give Up$/).click();
    await guess(fixture.player_name);
    await button('Play Again').waitFor();
    assert(await page.getByText('600 pts', { exact: false }).isVisible(), 'Wrong guess and hint retain third-clue payout');
    await shot('won-with-pending-confirmation');
    const beforeReplayWrites = row.writes.length;
    await button('Play Again').click();
    await button(/Unlimited Mode/).click();
    await input().waitFor();
    row.inheritedConfirmation = await button('Yes, Give Up').isVisible();
    row.newRound = await page.locator('body').innerText();
    assert.match(row.newRound, /Clue 1\/6/);
    assert.doesNotMatch(row.newRound, /Fictional Wrong Guess|1 hint used/);
    assert.equal(row.inheritedConfirmation, mode === 'baseline', 'Replay confirmation regression matches the source arm');
    await shot('fresh-round');
    if (mode === 'baseline') await button('Cancel').click();
    assert.equal(await button(/^🏳️ Give Up$/).count(), 0, 'A fresh round has no surrender opener before a guess');
    assert.equal(row.writes.length, beforeReplayWrites, 'Replay does not record an extra finish');
    await guess('Fictional Another Miss');
    await button(/^🏳️ Give Up$/).click();
    await button('Cancel').click();
    await input().waitFor();
    await button(/^🏳️ Give Up$/).click();
    await button('Yes, Give Up').click();
    await button('Play Again').waitFor();
    assert(await page.getByText('It was ' + fixture.player_name, { exact: true }).isVisible());
    await shot('ordinary-surrender');
    const unlimitedKeys = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('guess-tennis-player-daily-')));
    assert.deepEqual(unlimitedKeys, [], 'Unlimited never writes a daily record');
    const scoreWrites = row.writes.filter(item => new URL(item.url).pathname === '/rest/v1/tennis_scores');
    assert.equal(scoreWrites.length, 1, 'Only the actual win inserts a tennis score');
    const score = JSON.parse(scoreWrites[0].body);
    assert.equal(score.score, 600); assert.equal(score.clues_used, 3); assert.equal(score.guessed, true); assert.equal(score.mode, 'unlimited');
    await Promise.all(pending);
    assert(row.assets.length > 5, 'Actual application assets loaded');
    assert.deepEqual(row.errors, []);
    row.status = 'passed';
    await context.close();
  }
  report.observedFaults = report.cases.filter(row => row.inheritedConfirmation).length;
  assert.equal(report.observedFaults, mode === 'baseline' ? 2 : 0);
  report.status = 'passed';
  console.log(`Tennis replay browser: ${mode}, ${report.cases.length} completed journeys, ${report.observedFaults} inherited prompts.`);
} finally {
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
