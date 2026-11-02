/* Compiled real component fixture with the ordinary build's CSS and held fonts.
   This does not operate the route, header, consent or career save admission. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = path.resolve(process.env.MLB_PLAYOFF_BROWSER_OUT || os.tmpdir());
fs.mkdirSync(base, { recursive: true });
const output = fs.mkdtempSync(path.join(base, 'mlb-playoff-browser-'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['src/components/us-career/season/UsSeasonCentre.tsx', 'src/components/us-career/season/MlbPlayoffReplay.tsx', 'src/lib/season/mlbPlayoffReplay.ts', 'scripts/qa/fixtures/mlbPlayoffReplay.entry.tsx'];
const held = new Map(files.map(file => [file, fs.readFileSync(path.join(root, file))]));
const links = html => [...html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').matchAll(/<link\b[^>]*>/gi)].map(match => match[0]);
const href = tag => tag.match(/href=["']([^"']+)["']/i)?.[1];
const styles = links(fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8')).filter(tag => /rel=["']stylesheet["']/i.test(tag) && href(tag)?.startsWith('/assets/'));
assert.equal(styles.length, 1, 'One actual production stylesheet');
const css = fs.readFileSync(path.join(root, 'dist', href(styles[0]).slice(1)));
const fontTags = links(fs.readFileSync(path.join(root, 'index.html'), 'utf8')).filter(tag => /rel=["']stylesheet["']/i.test(tag) && href(tag)?.startsWith('https://fonts.googleapis.com/'));
assert.equal(fontTags.length, 1, 'One declared font stylesheet');
const cache = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(root, 'free-kick-lab-artifacts/font-cache'));
const fontRows = JSON.parse(fs.readFileSync(path.join(cache, 'manifest.json'), 'utf8'));
const fonts = new Map(fontRows.map(row => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(row.url).origin));
  assert(/^[a-f0-9]{64}$/.test(row.file));
  const body = fs.readFileSync(path.join(cache, row.file));
  assert.equal(hash(body), row.sha256, 'Held font bytes');
  return [row.url, { body, contentType: row.contentType }];
}));
assert(fonts.has(href(fontTags[0])), 'Actual stylesheet is held');
const bundle = await build({ absWorkingDir: root, entryPoints: [path.join(root, files[3])], bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', alias: { '@': path.join(root, 'src') }, define: { 'process.env.NODE_ENV': '"production"' }, metafile: true, logLevel: 'silent' });
for (const file of files) assert(Object.keys(bundle.metafile.inputs).some(input => input.replaceAll('\\', '/').endsWith(file)), `Actual compiled input: ${file}`);
const html = `<!doctype html><html class="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1">${fontTags[0]}<link rel="stylesheet" href="/fixture.css"><title>MLB playoff component proof</title></head><body class="bg-background text-foreground"><div id="root"></div><script src="/fixture.js"></script></body></html>`;
const assets = new Map([['/', [Buffer.from(html), 'text/html']], ['/fixture.js', [bundle.outputFiles[0].contents, 'text/javascript']], ['/fixture.css', [css, 'text/css']]]);
fs.writeFileSync(path.join(output, 'fixture.html'), html);
fs.writeFileSync(path.join(output, 'fixture.js'), bundle.outputFiles[0].contents);
fs.writeFileSync(path.join(output, 'fixture.css'), css);
fs.writeFileSync(path.join(output, 'metafile.json'), JSON.stringify(bundle.metafile, null, 2));
const server = http.createServer((request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname;
  const asset = assets.get(name);
  response.writeHead(asset ? 200 : name === '/favicon.ico' ? 204 : 404, { 'Content-Type': asset?.[1] || 'text/plain' });
  response.end(asset?.[0] || '');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

function validate(row) {
  assert.equal(row.initial.games, 7, 'seven saved team games');
  assert(row.initial.constructorDraws > 0, 'actual construction stream ran');
  assert.equal(row.helpFirst, true, 'first help');
  assert.match(row.helpText, /not saved/, 'help discloses limits');
  assert.match(row.helpText, /First to two/, 'worked help example');
  assert.equal(row.helpEscapeKeptReplay, true, 'help Escape stays in replay');
  let at = 0;
  for (const series of row.initial.series) {
    let mine = 0; let theirs = 0;
    for (let no = 1; no <= series.games; no += 1) {
      const game = row.trace[at++];
      assert(mine < series.need && theirs < series.need, 'no early clinch');
      assert.equal(game.round, series.round, 'round order');
      assert.equal(game.no, no, 'game order');
      if (game.won) mine += 1; else theirs += 1;
      assert.deepEqual([game.mine, game.theirs], [mine, theirs], 'series count');
      assert.equal(game.inventedFields, 0, 'no invented game stats');
    }
    assert.equal(series.won ? mine : theirs, series.need, 'saved series winner');
  }
  assert.equal(at, 7, 'exact game coverage');
  assert.equal(row.trace.length, 7, 'no extra game');
  assert.deepEqual(row.repeated, row.trace, 'same replay after reopen');
  assert.equal(row.finish, row.initial.finish, 'saved finish');
  assert.equal(row.line, row.initial.line, 'saved aggregate');
  assert.equal(row.backVisible, true, 'regular review visible');
  assert.equal(row.reviewAfter, row.reviewBefore, 'regular review preserved');
  assert.equal(row.backFocused, true, 'Back restores opener focus');
  for (const state of row.states) {
    assert.equal(state.saveBytes, row.initial.saveBytes, 'save bytes');
    assert.equal(state.careerBytes, row.initial.careerBytes, 'career bytes');
    assert.equal(state.constructorDraws, row.initial.constructorDraws, 'construction stream held');
    assert.equal(state.randomCalls, 0, 'Math.random calls');
  }
  assert.equal(row.closed, 1, 'native Escape closes once');
  for (const size of row.widths) assert(size.scroll <= size.width, 'no horizontal overflow');
  for (const action of row.actions) assert.equal(action.after, action.before, 'page scroll held');
  assert.deepEqual(row.errors, [], 'browser errors');
  assert.deepEqual(row.blocked, [], 'unexpected external transport');
  assert.deepEqual(row.failed, [], 'failed requests');
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const results = [];
let pending = null;
try {
  for (const size of [{ id: 'mini', width: 320, height: 664, mobile: true }, { id: 'phone', width: 392, height: 731, mobile: true }, { id: 'desktop', width: 1440, height: 900, mobile: false }]) {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.mobile ? 2 : 1, isMobile: size.mobile, hasTouch: size.mobile, locale: 'en-US', timezoneId: 'America/New_York' });
    const row = { size, actions: [], states: [], widths: [], errors: [], blocked: [], failed: [], fonts: [], screenshots: [] };
    pending = row;
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(`${origin}/`)) return route.continue();
      const font = fonts.get(url);
      if (font) { row.fonts.push(url); return route.fulfill({ status: 200, body: font.body, contentType: font.contentType }); }
      row.blocked.push(url); return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => row.errors.push(error.message));
    page.on('requestfailed', request => row.failed.push({ url: request.url(), error: request.failure()?.errorText ?? null }));
    const state = async () => row.states.push(await page.evaluate(() => window.mlbReplayFixture.state()));
    const width = async () => row.widths.push(await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth })));
    const shot = async name => { const file = `${size.id}-${name}.png`; await page.screenshot({ path: path.join(output, file) }); row.screenshots.push(file); };
    const click = async (locator, name) => {
      assert.equal(await locator.count(), 1, `${name}: one visible control`);
      await locator.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => window.scrollY);
      await locator.click({ timeout: 5000 });
      row.actions.push({ name, before, after: await page.evaluate(() => window.scrollY) });
    };
    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    row.initial = await page.evaluate(() => window.mlbReplayFixture.initial);
    await state(); await width();
    const regular = page.locator('[data-season-centre]');
    await regular.locator('[data-season-help]').waitFor();
    await click(regular.getByRole('button', { name: 'Got it', exact: true }), 'regular rules');
    await click(regular.getByRole('button', { name: /Straight to the season review/ }), 'real regular review');
    row.reviewBefore = await regular.locator('[data-review]').innerHTML();
    await click(regular.getByRole('button', { name: 'Replay playoffs', exact: true }), 'open playoffs');
    let replay = page.locator('[data-mlb-playoff-replay]');
    await replay.locator('[data-season-help]').waitFor();
    row.helpFirst = await replay.locator('[data-season-help]').isVisible();
    row.helpText = (await replay.locator('[data-season-help]').innerText()).replace(/\s+/g, ' ').trim();
    await shot('help');
    await page.keyboard.press('Escape');
    row.helpEscapeKeptReplay = await replay.isVisible() && await replay.locator('[data-season-help]').count() === 0 && (await page.evaluate(() => window.mlbReplayFixture.state())).closed === 0;
    await click(replay.getByRole('button', { name: 'How the playoff replay works', exact: true }), 'reopen rules');
    await click(replay.getByRole('button', { name: 'Got it', exact: true }), 'playoff rules');
    await shot('first-game');
    const trace = async capture => {
      const games = [];
      for (let game = 0; game < 7; game += 1) {
        assert.equal(await replay.locator('[data-mlb-playoff-result]').count(), 0, 'future result is hidden');
        const heading = (await replay.locator('[data-mlb-playoff-game] h3').innerText()).replace(/\s+/g, ' ').trim();
        const place = /^(.*) · Game (\d+)$/.exec(heading);
        assert(place, 'actual game label');
        await click(replay.getByRole('button', { name: 'Show game result', exact: true }), `reveal ${game + 1}`);
        const verdict = await replay.locator('[data-mlb-playoff-result]').innerText();
        assert(['Win', 'Loss'].includes(verdict), 'actual W/L result');
        const count = /^Series wins: (\d+)-(\d+)$/.exec(await replay.getByText(/^Series wins:/).innerText());
        assert(count, 'actual series count');
        games.push({ round: place[1], no: Number(place[2]), won: verdict === 'Win', mine: Number(count[1]), theirs: Number(count[2]), inventedFields: await replay.locator('[data-score-bug], [data-his-line]').count() });
        await state(); await width();
        const firstSeries = row.initial.series[0];
        if (capture && game + 1 === firstSeries.games) await shot('first-clincher');
        if (game < 6) await click(replay.getByRole('button', { name: 'Next playoff game', exact: true }), `next ${game + 2}`);
      }
      assert.equal(await replay.getByRole('button', { name: 'Next playoff game', exact: true }).count(), 0, 'no game after elimination');
      return games;
    };
    row.trace = await trace(true);
    const finish = replay.locator('[data-mlb-playoff-finish]');
    row.finish = await finish.locator('h3').innerText();
    row.line = await finish.locator('p').last().innerText();
    await shot('final');
    await click(replay.getByRole('button', { name: 'Back to regular season', exact: true }), 'Back to regular');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    row.backVisible = await regular.isVisible() && await replay.count() === 0;
    row.reviewAfter = await regular.locator('[data-review]').innerHTML();
    row.backFocused = await regular.getByRole('button', { name: 'Replay playoffs', exact: true }).evaluate(element => element === document.activeElement);
    await state(); await width(); await shot('regular-back');
    await click(regular.getByRole('button', { name: 'Replay playoffs', exact: true }), 'reopen playoffs');
    replay = page.locator('[data-mlb-playoff-replay]');
    row.repeated = await trace(false);
    await page.keyboard.press('Escape');
    await page.locator('[data-fixture-closed]').waitFor();
    const closed = await page.evaluate(() => window.mlbReplayFixture.state());
    row.closed = closed.closed; row.states.push(closed);
    await context.close();
    validate(row);
    const faults = [
      ['duplicate', 'game order', value => { value.trace[1].no = value.trace[0].no; }],
      ['series', 'series count', value => { value.trace[0].mine += 1; }],
      ['finish', 'saved finish', value => { value.finish += ' changed'; }],
      ['help', 'first help', value => { value.helpFirst = false; }],
      ['back', 'regular review visible', value => { value.backVisible = false; }],
      ['save', 'save bytes', value => { value.states[0].saveBytes += ' changed'; }],
      ['rng', 'Math.random calls', value => { value.states[0].randomCalls += 1; }],
      ['stats', 'no invented game stats', value => { value.trace[0].inventedFields = 1; }],
      ['width', 'no horizontal overflow', value => { value.widths[0].scroll = value.widths[0].width + 1; }],
      ['scroll', 'page scroll held', value => { value.actions[0].after += 1; }],
      ['errors', 'browser errors', value => { value.errors.push('copied error'); }],
    ];
    row.controls = [];
    for (const [name, message, change] of faults) {
      const copy = JSON.parse(JSON.stringify(row)); change(copy);
      assert.notEqual(JSON.stringify(copy), JSON.stringify(row), `${name}: copied control changes data`);
      assert.throws(() => validate(copy), error => error.code === 'ERR_ASSERTION' && error.message.includes(message), `${name}: owned assertion`);
      validate(row); row.controls.push(name);
    }
    assert(row.fonts.length > 0, 'held fonts were actually requested');
    fs.writeFileSync(path.join(output, `${size.id}.json`), JSON.stringify(row, null, 2));
    results.push({ size, games: row.trace.length, repeated: row.repeated.length, controls: row.controls.length, screenshots: row.screenshots });
    console.log(`MLB_BROWSER| ${size.id}: 7 games twice, 11 effective report controls, 5 original screenshots, saved bytes and RNG held`);
    pending = null;
  }
  for (const [file, bytes] of held) assert.deepEqual(fs.readFileSync(path.join(root, file)), bytes, `Source held: ${file}`);
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ scope: 'compiled component fixture, ordinary production CSS and held fonts', source: [...held].map(([file, bytes]) => ({ file, sha256: hash(bytes) })), cssSha256: hash(css), results }, null, 2));
  console.log(`playMlbPlayoffReplay: PASS. Evidence: ${output}`);
} finally {
  await browser.close();
  if (pending) fs.writeFileSync(path.join(output, `${pending.size.id}-partial.json`), JSON.stringify(pending, null, 2));
  await new Promise(resolve => server.close(resolve));
}
