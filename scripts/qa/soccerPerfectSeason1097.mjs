/** Finite remote proof of the built Soccer Perfect Season page and copied lifecycle faults. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'This worker runs only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, process.env.QA_OUT || 'qa-artifacts', 'soccer-perfect-season-ui');
const ROUTE = '/soccer-perfect-season';
const DAILY = 'dukb-soccer-perfect-season-soccer-ps-v1-daily';
const UNLIMITED = 'dukb-soccer-perfect-season-soccer-ps-v1-unlimited';
const PAGE = 'src/pages/SoccerPerfectSeason.tsx';
const HOOK = 'src/hooks/useSoccerPerfectSeason.ts';
const CLOCK = '2026-01-01T17:00:00.000Z';
const WIDTHS = [320, 390, 1280];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); };
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const errorData = e => ({ name: e?.name, message: e?.message, stack: e?.stack });
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT }).toString().split('\0').filter(Boolean);
const sourceMap = root => Object.fromEntries(tracked.map(file => [file, sha(fs.readFileSync(path.join(root, file)))]));
const before = sourceMap(ROOT);
fs.mkdirSync(OUT, { recursive: true });
json(path.join(OUT, 'source-before.json'), before);
const measurementFile = path.resolve(ROOT, process.env.QA_OUT || 'qa-artifacts', 'soccer-perfect-season/baseline/measurement.json');
const measurement = read(measurementFile);
assert.equal(measurement.seedCount, 128);
assert.equal(measurement.requiredMeanPointsGap, 40);
assert(measurement.meanPointsGap > 40);
const fixture = measurement.pairs.find(pair => pair.date === '2026-01-01');
assert(fixture && fixture.deal.length === 11 && fixture.witness.choices.length === 11);
assert.equal(DAILY, `dukb-soccer-perfect-season-${fixture.version}-daily`);
assert.equal(UNLIMITED, `dukb-soccer-perfect-season-${fixture.version}-unlimited`);
assert.deepEqual(fixture.strongest.games, Array(38).fill('W'));
assert(fixture.cheapest.draws > 0 && fixture.cheapest.losses > 0 && fixture.cheapest.wins > 0);
json(path.join(OUT, 'fixture.json'), { measurementSha256: sha(fs.readFileSync(measurementFile)), fixture });

function walk(root, prefix = '') {
  return fs.readdirSync(path.join(root, prefix), { withFileTypes: true }).flatMap(entry => {
    const file = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? walk(root, file) : [{ file, bytes: fs.statSync(path.join(root, file)).size, sha256: sha(fs.readFileSync(path.join(root, file))) }];
  });
}
async function child(command, args, cwd, dir, limit = 180000) {
  fs.mkdirSync(dir, { recursive: true });
  const started = Date.now();
  const proc = spawn(command, args, { cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  const stdout = fs.createWriteStream(path.join(dir, 'stdout.log'));
  const stderr = fs.createWriteStream(path.join(dir, 'stderr.log'));
  proc.stdout.pipe(stdout); proc.stderr.pipe(stderr);
  let timedOut = false;
  let killTimer;
  const timer = setTimeout(() => {
    timedOut = true; proc.kill('SIGTERM');
    killTimer = setTimeout(() => proc.kill('SIGKILL'), 10000);
  }, limit);
  const result = await new Promise(resolve => {
    proc.on('error', error => resolve({ error: errorData(error), status: null, signal: null }));
    proc.on('close', (status, signal) => resolve({ error: null, status, signal }));
  });
  clearTimeout(timer);
  clearTimeout(killTimer);
  await Promise.all([new Promise(resolve => stdout.end(resolve)), new Promise(resolve => stderr.end(resolve))]);
  json(path.join(dir, 'process.json'), { command, args, elapsedMs: Date.now() - started, timedOut, ...result });
  assert.equal(result.error, null, 'Child launch failed');
  assert.equal(timedOut, false, 'Child exceeded its finite deadline');
  assert.equal(result.signal, null, 'Child received a signal');
  assert.equal(result.status, 0, 'Child did not finish successfully');
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json' };
async function serve(dist, name, sourceRoot = ROOT) {
  const manifest = walk(dist);
  json(path.join(OUT, name, 'build-files.json'), manifest);
  const coreFiles = [PAGE, HOOK, 'src/lib/soccerPerfectSeason.ts', 'src/lib/completions.ts', 'src/main.tsx'];
  const bindings = [];
  for (const entry of manifest.filter(row => row.file.endsWith('.map'))) {
    const map = read(path.join(dist, entry.file));
    assert.equal(map.sources.length, map.sourcesContent.length, 'Every map source retains its content');
    map.sources.forEach((source, index) => {
      const file = coreFiles.find(core => source.replace(/\\/g, '/').endsWith('/' + core) || source === core);
      if (!file) return;
      assert.equal(typeof map.sourcesContent[index], 'string');
      const raw = fs.readFileSync(path.join(sourceRoot, file));
      assert.equal(sha(map.sourcesContent[index]), sha(raw), 'Built source content equals the actual source bytes');
      bindings.push({ file, source, map: entry.file, mapSha256: entry.sha256, sourceSha256: sha(raw), contentSha256: sha(map.sourcesContent[index]) });
    });
  }
  json(path.join(OUT, name, 'built-source-bindings.json'), bindings);
  assert.deepEqual([...new Set(bindings.map(row => row.file))].sort(), coreFiles.sort(), 'Actual build maps contain all five core sources');
  const receipts = [];
  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const direct = path.resolve(dist, relative), directory = path.resolve(dist, relative, 'index.html');
      assert(direct === dist || direct.startsWith(dist + path.sep));
      const isFile = file => fs.existsSync(file) && fs.statSync(file).isFile();
      const file = isFile(direct) ? direct : isFile(directory) ? directory : path.join(dist, 'index.html');
      const body = fs.readFileSync(file), hash = sha(body), contentType = MIME[path.extname(file)] || 'application/octet-stream';
      const raw = path.join(OUT, 'served', hash + '.bin');
      fs.mkdirSync(path.dirname(raw), { recursive: true });
      if (!fs.existsSync(raw)) fs.writeFileSync(raw, body);
      receipts.push({ method: req.method, url: req.url, file: path.relative(dist, file).split(path.sep).join('/'), sha256: hash, bytes: body.length, contentType, status: 200 });
      res.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store' }); res.end(body);
    } catch (error) {
      receipts.push({ url: req.url, error: errorData(error), status: 500 }); res.writeHead(500); res.end('fixture server error');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { base: `http://127.0.0.1:${server.address().port}`, manifest, receipts,
    async close() { json(path.join(OUT, name, 'served.json'), receipts); await new Promise(resolve => server.close(resolve)); } };
}

const report = { fixtureSha256: sha(fs.readFileSync(path.join(OUT, 'fixture.json'))), cases: [], controls: [], limits: [
  'Finite Jan 1 Daily fixture at three viewports, local guest storage and intercepted completion transport.',
  'Copied controls use separately built full application sources and do not alter the candidate checkout.',
  'No production backend, authenticated persistence, public snapshot refresh or release acceptance is exercised.',
] };
let browser;
async function openCase(server, name, width, initial = {}, firstHelp = false) {
  const dir = path.join(OUT, 'cases', name); fs.mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({ viewport: { width, height: width < 1000 ? 844 : 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const transport = [], pageErrors = [], consoleErrors = [], failedRequests = [], states = [];
  await context.routeWebSocket('**/*', socket => {
    transport.push({ url: socket.url(), method: 'WEBSOCKET', action: 'blocked' }); socket.close();
  });
  await context.addInitScript(({ initial, firstHelp, clock, route }) => {
    const NativeDate = Date;
    window.__qaSoccerClock = NativeDate.parse(sessionStorage.getItem('qa-soccer-clock') || clock);
    class FixedDate extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [window.__qaSoccerClock])); }
      static now() { return window.__qaSoccerClock; }
    }
    window.Date = FixedDate;
    if (!sessionStorage.getItem('qa-soccer-initialized')) {
      localStorage.setItem('cookie-consent', 'declined');
      localStorage.setItem('dukb-guest-handle', 'QASeason-17');
      if (!firstHelp) localStorage.setItem('rules-gate-seen:' + route, '1');
      for (const [key, value] of Object.entries(initial)) localStorage.setItem(key, value);
      sessionStorage.setItem('qa-soccer-initialized', '1');
    }
  }, { initial, firstHelp, clock: CLOCK, route: ROUTE });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === server.base) {
      transport.push({ url: request.url(), method: request.method(), resourceType: request.resourceType(), action: 'served-local' });
      await route.continue(); return;
    }
    const entry = { url: request.url(), method: request.method(), resourceType: request.resourceType(), postData: request.postData(), action: 'blocked' };
    transport.push(entry);
    if (url.hostname.endsWith('.supabase.co')) {
      const completion = url.pathname === '/rest/v1/game_completions' && request.method() === 'POST';
      entry.action = 'mocked'; entry.status = completion ? 201 : 200;
      entry.body = completion ? '' : '[]';
      if (request.postData()) { try { entry.payload = JSON.parse(request.postData()); } catch { entry.payload = request.postData(); } }
      await route.fulfill({ status: entry.status, contentType: 'application/json', body: entry.body,
        headers: { 'access-control-allow-origin': '*', 'content-range': '0-0/0' } }); return;
    }
    await route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.on('pageerror', e => pageErrors.push(errorData(e)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', req => failedRequests.push({ url: req.url(), failure: req.failure(), resourceType: req.resourceType() }));
  page.setDefaultTimeout(12000);
  const caseData = { name, width, dir, context, page, transport, pageErrors, consoleErrors, failedRequests, states,
    posts: () => transport.filter(row => row.method === 'POST' && new URL(row.url).pathname === '/rest/v1/game_completions'),
    async close() {
      try { await context.close(); }
      finally {
        json(path.join(dir, 'transport.json'), transport); json(path.join(dir, 'page-errors.json'), pageErrors);
        json(path.join(dir, 'console-errors.json'), consoleErrors); json(path.join(dir, 'failed-requests.json'), failedRequests);
        json(path.join(dir, 'states.json'), states);
      }
    } };
  try {
    await page.goto(server.base + ROUTE, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-soccer-ps="menu"]').waitFor();
  } catch (error) {
    await caseData.close(); throw error;
  }
  return caseData;
}
async function settle(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function closeCase(c, receipt, server) {
  try {
    await c.close();
    assert.deepEqual(c.pageErrors, [], 'Final browser errors cannot be accepted');
    assert.deepEqual(c.failedRequests.filter(row => new URL(row.url).origin === server.base), [], 'Final built request errors cannot be accepted');
  } catch (error) { receipt.status = 'failed'; receipt.finalizationError = errorData(error); }
}
const action = (page, value) => page.locator(`[data-soccer-ps-action="${value}"]`);
async function state(c, label, screenshot = false) {
  await settle(c.page);
  const value = await c.page.evaluate(({ daily, unlimited }) => {
    const panel = document.querySelector('[data-soccer-ps]');
    const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
    return { phase: panel?.getAttribute('data-soccer-ps'), text: panel?.textContent, scrollY,
      viewport: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth,
      panel: panel ? rect(panel) : null, offers: [...document.querySelectorAll('[data-soccer-ps-offer]')].map(el => ({
        index: Number(el.getAttribute('data-soccer-ps-offer')), disabled: el.disabled, label: el.getAttribute('aria-label'), text: el.textContent, rect: rect(el) })),
      buttons: panel ? [...panel.querySelectorAll('button')].map(el => ({ text: el.textContent, action: el.dataset.soccerPsAction, disabled: el.disabled, rect: rect(el) })) : [],
      budget: document.querySelector('[data-soccer-ps-budget]')?.textContent,
      remaining: document.querySelector('[data-soccer-ps-remaining]')?.textContent,
      odds: document.querySelector('[data-soccer-ps-odds]') ? { ...document.querySelector('[data-soccer-ps-odds]').dataset } : null,
      record: document.querySelector('[data-soccer-ps-record]') ? { ...document.querySelector('[data-soccer-ps-record]').dataset } : null,
      focus: { tag: document.activeElement?.tagName, offer: document.activeElement?.getAttribute('data-soccer-ps-offer'), action: document.activeElement?.getAttribute('data-soccer-ps-action'), inPanel: panel?.contains(document.activeElement) },
      pitch: { label: document.querySelector('[data-soccer-ps-pitch] [role="list"]')?.getAttribute('aria-label'), items: document.querySelectorAll('[data-soccer-ps-pitch] [role="listitem"]').length },
      results: [...document.querySelectorAll('[data-soccer-ps-results] li')].map(el => ({ text: el.textContent, label: el.getAttribute('aria-label'), rect: rect(el) })),
      storage: { daily: localStorage.getItem(daily), unlimited: localStorage.getItem(unlimited),
        namespaces: Object.fromEntries(Object.keys(localStorage).filter(key => key.startsWith('dukb-soccer-perfect-season-')).sort().map(key => [key, localStorage.getItem(key)])) },
    };
  }, { daily: DAILY, unlimited: UNLIMITED });
  value.label = label; value.completionPosts = c.posts().length; c.states.push(value);
  if (screenshot) await c.page.screenshot({ path: path.join(c.dir, `${String(c.states.length).padStart(2, '0')}-${label}.png`), fullPage: false });
  return value;
}
function geometry(value, offers = false) {
  assert(value.panel && value.panel.width > 0);
  assert(value.documentWidth <= value.viewport.width + 1, 'No horizontal overflow');
  assert(value.panel.x >= -1 && value.panel.right <= value.viewport.width + 1, 'Panel fits viewport width');
  for (const button of value.buttons) assert(button.rect.height >= 43.5 && button.rect.width >= 43.5, 'Actions have a 44px target');
  if (offers) for (const offer of value.offers) assert(offer.rect.y >= -1 && offer.rect.bottom <= value.viewport.height + 1, 'All current offers are visible');
}
function saved(choices, revealed = 0, completionRecorded = false) {
  return { version: fixture.version, mode: 'daily', date: fixture.date, seed: fixture.seed, choices, revealed, completionRecorded };
}
function prefixRecord(games, played) {
  const prefix = games.slice(0, played), wins = prefix.filter(x => x === 'W').length, draws = prefix.filter(x => x === 'D').length, losses = prefix.filter(x => x === 'L').length;
  const points = wins * 3 + draws;
  return { played, wins, draws, losses, points, score: Math.round(points * 100 / 114) };
}
function assertRecord(value, games, played) {
  assert(value.record);
  for (const [key, expected] of Object.entries(prefixRecord(games, played))) assert.equal(Number(value.record[key]), expected, `Actual ${key} matches retained pure outcomes`);
  assert.equal(value.results.length, 38, 'Exactly 38 result cells');
  value.results.forEach((row, i) => {
    const label = i < played ? { W: 'Win', D: 'Draw', L: 'Loss' }[games[i]] : 'not played yet';
    assert.equal(row.label, `Match ${i + 1}: ${label}`);
    assert.equal(row.text, i < played ? games[i] : String(i + 1));
  });
}
async function assertNoPost(c) { await settle(c.page); assert.equal(c.posts().length, 0, 'No completion before all 38 results'); }
async function finalPost(c, expectedScore, key = DAILY) {
  await c.page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).completionRecorded === true, key);
  const until = Date.now() + 5000;
  while (c.posts().length === 0 && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(c.posts().length, 1, 'One actual intercepted completion POST');
  const payload = c.posts()[0].payload, row = Array.isArray(payload) ? payload[0] : payload;
  assert.deepEqual(row, { game: 'soccer-perfect-season', score: expectedScore, player_name: 'QASeason-17' });
}
async function help(c, first = false) {
  if (!first) await c.page.getByRole('button', { name: 'How to play', exact: true }).click();
  const dialog = c.page.getByRole('dialog'); await dialog.waitFor();
  const text = await dialog.innerText();
  assert(text.includes('The steps') && text.includes('The rules') && text.includes('A worked example'));
  assert(text.includes('112') && text.includes('98'), 'Worked score example is available before play');
  await c.page.screenshot({ path: path.join(c.dir, first ? 'first-help.png' : 'reopened-help.png') });
  await dialog.getByRole('button', { name: "Let's Play!", exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(await c.page.getByRole('button', { name: 'How to play', exact: true }).evaluate(el => el === document.activeElement), true, 'Help returns keyboard focus');
}
async function draft(c, choices, reload = false) {
  let spent = 0, disabledCount = 0;
  for (let slot = 0; slot < choices.length; slot += 1) {
    const value = await state(c, 'offer-' + slot, slot === 0 || slot === 10);
    assert.equal(value.phase, 'draft'); assert.equal(Number(value.budget), spent); assert.equal(Number(value.remaining), 55 - spent);
    assert.equal(value.offers.length, 3);
    fixture.deal[slot].forEach((card, index) => {
      const disabled = spent + card.cost + 3 * (10 - slot) > 55;
      assert.equal(value.offers[index].disabled, disabled, 'Reserve affordability is rendered');
      assert.equal(value.offers[index].label, `${card.name}, strength ${card.rating}, ${card.cost} tokens${disabled ? ', cannot leave enough for the remaining slots' : ''}`);
      disabledCount += Number(disabled);
    });
    geometry(value, true);
    const button = c.page.locator(`[data-soccer-ps-offer="${choices[slot]}"]`);
    assert.equal(await button.isEnabled(), true);
    const keyboard = slot === 0 || reload;
    if (keyboard) { await button.focus(); await c.page.keyboard.press('Enter'); }
    else await button.click();
    spent += fixture.deal[slot][choices[slot]].cost;
    const after = await state(c, 'picked-' + slot);
    const actual = JSON.parse(after.storage.daily);
    assert.deepEqual(actual.choices, choices.slice(0, slot + 1)); assert.equal(actual.seed, fixture.seed); assert.equal(actual.date, fixture.date);
    assert.equal(actual.version, fixture.version);
    assert.equal(after.pitch.label, 'Your fictional XI'); assert.equal(after.pitch.items, 11);
    if (keyboard) {
      assert.equal(after.focus.inPanel, true, 'Keyboard focus follows the remounted actual panel');
      if (slot < 10) assert.equal(after.focus.offer, String(after.offers.find(offer => !offer.disabled).index), 'Keyboard focus reaches the next enabled offer');
      else assert.equal(after.focus.action, 'next-match', 'Final keyboard pick focuses Next match');
    }
    if (value.panel.y >= 0 && Math.min(value.panel.bottom, value.viewport.height) - value.panel.y >= 160) {
      assert(Math.abs(after.scrollY - value.scrollY) <= 2, 'A readable choice does not jump the page');
    }
    assert(after.panel.y >= -2, 'The new step keeps its top visible');
    await assertNoPost(c);
    if (reload && slot === 3) {
      const raw = after.storage.daily; await c.page.reload({ waitUntil: 'domcontentloaded' });
      await action(c.page, 'resume-daily').waitFor(); await action(c.page, 'resume-daily').click();
      const resumed = await state(c, 'partial-draft-reload', true);
      assert.equal(resumed.storage.daily, raw); assert.equal(resumed.phase, 'draft');
      assert.equal(Number(resumed.budget), spent); assert.equal(Number(resumed.remaining), 55 - spent);
    }
  }
  return { spent, disabledCount };
}
async function play(c, kind, mode) {
  const strong = kind === 'strongest', choices = strong ? fixture.witness.choices : fixture.cheapestChoices;
  const expected = strong ? fixture.strongest : fixture.cheapest, odds = strong ? fixture.strongOdds : fixture.cheapOdds;
  await action(c.page, 'daily').click();
  const measured = await draft(c, choices, strong);
  assert.equal(measured.spent, strong ? fixture.witness.spent : fixture.cheapestSpent);
  if (strong) assert(measured.disabledCount > 0, 'Witness path actually reaches disabled offers');
  const ready = await state(c, 'ready', true); geometry(ready); assertRecord(ready, expected.games, 0);
  for (const key of ['win', 'draw', 'loss', 'perfect']) assert.equal(Number(ready.odds[key]), odds[key]);
  const beforeHelp = ready.storage.daily; await help(c); assert.equal((await state(c, 'after-help')).storage.daily, beforeHelp);
  if (mode === 'next') {
    for (let played = 1; played <= 38; played += 1) {
      await action(c.page, 'next-match').click();
      const value = await state(c, 'match-' + played, played === 1 || played === 38); assertRecord(value, expected.games, played); geometry(value);
      if (played < 38) await assertNoPost(c);
      if (played === 17) {
        const raw = value.storage.daily;
        await c.page.reload({ waitUntil: 'domcontentloaded' }); await action(c.page, 'resume-daily').waitFor(); await action(c.page, 'resume-daily').click();
        const resumed = await state(c, 'partial-match-reload', true); assert.equal(resumed.storage.daily, raw); assertRecord(resumed, expected.games, 17);
      }
    }
  } else {
    await action(c.page, 'next-match').click(); assertRecord(await state(c, 'one-match'), expected.games, 1); await assertNoPost(c);
    await action(c.page, 'finish-season').click(); assertRecord(await state(c, 'finished', true), expected.games, 38);
  }
  await finalPost(c, expected.score);
  const finished = await state(c, 'done'); assert.equal(finished.phase, 'done'); geometry(finished);
  assert.equal(await action(c.page, 'next-match').count(), 0); assert.equal(await action(c.page, 'finish-season').count(), 0);
  const raw = finished.storage.daily;
  await action(c.page, 'back-menu').click();
  assert.equal(await action(c.page, 'daily').count(), 0, 'Same-day fresh attempt is absent');
  await action(c.page, 'unlimited').click();
  const unlimited = await state(c, 'unlimited-separate', true);
  assert.equal(unlimited.storage.daily, raw); assert.equal(JSON.parse(unlimited.storage.unlimited).mode, 'unlimited');
  assert.equal(JSON.parse(unlimited.storage.unlimited).version, fixture.version);
  assert.deepEqual(Object.keys(unlimited.storage.namespaces).sort(), [DAILY, UNLIMITED].sort());
  await action(c.page, 'back-menu').click(); await c.page.reload({ waitUntil: 'domcontentloaded' });
  await action(c.page, 'resume-daily').waitFor(); assert.equal(await action(c.page, 'daily').count(), 0);
  await action(c.page, 'resume-daily').click();
  const recap = await state(c, 'daily-recap-after-unlimited-reload', true); assertRecord(recap, expected.games, 38);
  assert.equal(recap.storage.daily, raw); assert.equal(c.posts().length, 1, 'Reload, Back and recap never repay completion');
}
function observedRecord(value, played) {
  assert.equal(value.results.length, 38);
  const games = value.results.slice(0, played).map(row => row.text);
  assert(games.every(outcome => ['W', 'D', 'L'].includes(outcome)), 'Actual revealed cells are W, D or L');
  value.results.forEach((row, index) => {
    const label = index < played ? { W: 'Win', D: 'Draw', L: 'Loss' }[row.text] : 'not played yet';
    assert.equal(row.label, `Match ${index + 1}: ${label}`);
    if (index >= played) assert.equal(row.text, String(index + 1));
  });
  const expected = prefixRecord(games, played);
  for (const [key, count] of Object.entries(expected)) assert.equal(Number(value.record[key]), count, `Unlimited ${key} follows actual revealed cells`);
  return { games, record: expected };
}
async function unlimitedJourney(c) {
  const dailyRaw = JSON.stringify(saved(fixture.witness.choices, 38, true));
  await action(c.page, 'unlimited').click();
  const opened = await state(c, 'unlimited-open', true), initial = JSON.parse(opened.storage.unlimited);
  assert.equal(initial.mode, 'unlimited'); assert.equal(initial.date, null); assert.equal(initial.version, fixture.version);
  assert(Number.isInteger(initial.seed) && initial.seed >= 0 && initial.seed <= 0xffffffff);
  for (let slot = 0; slot < 11; slot += 1) {
    const value = await state(c, 'unlimited-offer-' + slot); geometry(value, true);
    assert.equal(Number(value.budget), slot * 3); assert.equal(Number(value.remaining), 55 - slot * 3);
    assert.equal(value.offers.length, 3); assert.equal(value.offers[0].disabled, false);
    assert(value.offers[0].label.includes(', 3 tokens'), 'Actual cheapest Unlimited offer costs 3');
    await c.page.locator('[data-soccer-ps-offer="0"]').click();
    const after = await state(c, 'unlimited-pick-' + slot), run = JSON.parse(after.storage.unlimited);
    assert.deepEqual(run.choices, Array(slot + 1).fill(0)); assert.equal(run.seed, initial.seed); assert.equal(run.version, fixture.version);
    assert.equal(after.storage.daily, dailyRaw); await assertNoPost(c);
  }
  for (let played = 1; played <= 3; played += 1) {
    await action(c.page, 'next-match').click(); observedRecord(await state(c, 'unlimited-match-' + played), played); await assertNoPost(c);
  }
  const partial = await state(c, 'unlimited-partial', true), observed = observedRecord(partial, 3), raw = partial.storage.unlimited;
  assert.equal(JSON.parse(raw).completionRecorded, false);
  await action(c.page, 'back-menu').click(); await c.page.reload({ waitUntil: 'domcontentloaded' });
  await action(c.page, 'resume-unlimited').waitFor(); await action(c.page, 'resume-unlimited').click();
  const resumed = await state(c, 'unlimited-partial-reload', true);
  assert.equal(resumed.storage.unlimited, raw); assert.equal(resumed.storage.daily, dailyRaw);
  assert.deepEqual(observedRecord(resumed, 3), observed); await assertNoPost(c);
  await action(c.page, 'finish-season').click();
  const done = await state(c, 'unlimited-finished', true), final = observedRecord(done, 38), finishedRaw = done.storage.unlimited;
  const run = JSON.parse(finishedRaw);
  assert.equal(done.phase, 'done'); assert.equal(run.seed, initial.seed); assert.deepEqual(run.choices, Array(11).fill(0));
  assert.equal(run.revealed, 38); assert.equal(run.completionRecorded, true); assert.equal(done.storage.daily, dailyRaw); geometry(done);
  await finalPost(c, final.record.score, UNLIMITED);
  await action(c.page, 'back-menu').click(); await c.page.reload({ waitUntil: 'domcontentloaded' });
  await action(c.page, 'resume-unlimited').waitFor(); await action(c.page, 'resume-unlimited').click();
  const recap = await state(c, 'unlimited-finished-recap', true);
  assert.equal(recap.storage.unlimited, finishedRaw); assert.equal(recap.storage.daily, dailyRaw);
  assert.deepEqual(observedRecord(recap, 38), final); assert.equal(c.posts().length, 1, 'Finished Unlimited reload and recap do not resubmit');
  json(path.join(c.dir, 'observed-unlimited-ledger.json'), { seed: initial.seed, partial: observed, final, dailyRaw, partialRaw: raw, finishedRaw, completion: c.posts()[0] });
}
async function runCase(server, name, width, body, initial = {}, firstHelp = false) {
  let c; const receipt = { name, width, status: 'failed' };
  try {
    c = await openCase(server, name, width, initial, firstHelp);
    if (firstHelp) await help(c, true);
    await body(c);
    assert.deepEqual(c.pageErrors, [], 'No browser page errors');
    const localFailures = c.failedRequests.filter(r => new URL(r.url).origin === server.base);
    assert.deepEqual(localFailures, [], 'No failed built resources');
    receipt.status = 'passed';
  } catch (e) {
    receipt.error = errorData(e);
    if (c) { try { await state(c, 'failure', true); } catch (capture) { receipt.captureError = errorData(capture); } }
  } finally {
    if (c) await closeCase(c, receipt, server);
    json(path.join(OUT, 'cases', name, 'receipt.json'), receipt); report.cases.push(receipt);
    console.log(`Soccer Perfect Season native ${name}: ${receipt.status.toUpperCase()}`);
  }
}

const controls = [
  { name: 'daily-restart', intended: 'Finished same-day Daily resumes the exact locked result', mutations: [
    { file: PAGE, from: 'const dailyIsToday = savedDaily.run?.date === today;', to: 'const dailyIsToday = false;' },
    { file: HOOK, from: 'if (saved?.date === date) activate(saved);', to: 'if (false) activate(saved);' },
  ] },
  { name: 'mode', intended: 'Wrong-mode save stays raw and has no Daily resume', mutations: [
    { file: HOOK, from: 'run?.mode === mode', to: 'Boolean(run)' },
  ] },
  { name: 'raw-preserve', intended: 'Corrupt raw save is preserved during boot', mutations: [
    { file: HOOK, from: 'const raw = localStorage.getItem(saveKey(mode));', to: 'const raw = localStorage.getItem(saveKey(mode));\n    localStorage.removeItem(saveKey(mode));' },
  ] },
  { name: 'completion-boundary', intended: 'Partial result reveals submit zero completions', mutations: [
    { file: HOOK, from: "if (completed) recordCompletion('/soccer-perfect-season', deriveSoccerRun(next).record.score);", to: "if (true) recordCompletion('/soccer-perfect-season', deriveSoccerRun(next).record.score);" },
  ] },
  { name: 'version-key', intended: 'Current version Daily resumes from its exact versioned key', mutations: [
    { file: HOOK, from: "export const SOCCER_PS_DAILY_SAVE_KEY = 'dukb-soccer-perfect-season-soccer-ps-v1-daily';", to: "export const SOCCER_PS_DAILY_SAVE_KEY = 'dukb-soccer-perfect-season-soccer-ps-v0-daily';" },
  ] },
  { name: 'keyboard-focus', intended: 'Keyboard Enter focuses the next real draft offer', mutations: [
    { file: PAGE, from: '?.focus({ preventScroll: true })', to: '?.blur()' },
  ] },
];
function probeInitial(name) {
  if (name === 'keyboard-focus') return {};
  if (name === 'daily-restart') return { [DAILY]: JSON.stringify(saved(fixture.witness.choices, 38, true)) };
  if (name === 'mode') return { [DAILY]: JSON.stringify({ version: fixture.version, mode: 'unlimited', date: null, seed: 17, choices: [], revealed: 0, completionRecorded: false }) };
  if (name === 'raw-preserve') return { [DAILY]: '{broken' };
  return { [DAILY]: JSON.stringify(saved(fixture.cheapestChoices)) };
}
async function probe(server, control, mutated) {
  const name = (mutated ? 'control-' : 'baseline-') + control.name;
  const initial = probeInitial(control.name), receipt = { name, intended: control.intended, status: 'failed', assertions: [] };
  let c;
  const check = (title, accepted, actual) => receipt.assertions.push({ title, passed: !!accepted, actual });
  try {
    c = await openCase(server, name, 390, initial);
    check('Built page opens the correct game without a page error', await c.page.getByRole('heading', { name: 'Soccer Perfect Season', exact: true }).count() === 1 && c.pageErrors.length === 0, { heading: await c.page.title(), pageErrors: c.pageErrors });
    const boot = await state(c, 'boot', true);
    if (control.name === 'daily-restart') {
      const startExposed = await action(c.page, 'daily').count() > 0;
      await action(c.page, startExposed ? 'daily' : 'resume-daily').click();
      const value = await state(c, 'repeat-attempt', true);
      check(control.intended, value.phase === 'done' && value.storage.daily === initial[DAILY] && c.posts().length === 0, value);
      receipt.effect = { startExposed, phase: value.phase, run: JSON.parse(value.storage.daily), posts: c.posts().length };
      if (mutated) assert(startExposed && value.phase === 'draft' && JSON.parse(value.storage.daily).choices.length === 0, 'Restart control actually erased the finished attempt');
    } else if (control.name === 'mode') {
      const resumable = await action(c.page, 'resume-daily').count() > 0;
      check(control.intended, !resumable && boot.storage.daily === initial[DAILY] && boot.text.includes('could not be read'), { resumable, boot });
      if (resumable) await action(c.page, 'resume-daily').click();
      const value = await state(c, 'wrong-mode-recovery', true); receipt.effect = { resumable, phase: value.phase, text: value.text, raw: value.storage.daily };
      if (mutated) assert(resumable && value.phase === 'draft' && value.text.includes('Unlimited'), 'Wrong-mode control actually resumes Unlimited through Daily');
    } else if (control.name === 'raw-preserve') {
      check(control.intended, boot.storage.daily === initial[DAILY] && boot.text.includes('could not be read'), boot);
      receipt.effect = { rawBefore: initial[DAILY], rawAfter: boot.storage.daily };
      if (mutated) assert.equal(boot.storage.daily, null, 'Boot deletion control actually removes the raw bytes');
    } else if (control.name === 'keyboard-focus') {
      await action(c.page, 'daily').click();
      const before = await state(c, 'keyboard-before', true);
      const button = c.page.locator('[data-soccer-ps-offer="0"]'); await button.focus(); await c.page.keyboard.press('Enter');
      const value = await state(c, 'keyboard-after', true), run = JSON.parse(value.storage.daily);
      assert.deepEqual(run.choices, [0]); assert.equal(run.seed, fixture.seed); assert.equal(Number(value.budget), 3);
      check(control.intended, value.focus.inPanel && value.focus.offer === '0', { before, value });
      receipt.effect = { focus: value.focus, run, scrollBefore: before.scrollY, scrollAfter: value.scrollY };
      if (mutated) assert.equal(value.focus.inPanel, false, 'Blur control actually loses focus after the panel remount');
    } else if (control.name === 'version-key') {
      const resumable = await action(c.page, 'resume-daily').count() > 0;
      if (resumable) await action(c.page, 'resume-daily').click();
      else await action(c.page, 'daily').click();
      const value = await state(c, 'versioned-recovery', true);
      check(control.intended, resumable && value.phase === 'season' && value.storage.daily === initial[DAILY]
        && JSON.parse(value.storage.daily).version === fixture.version && Object.keys(value.storage.namespaces).length === 1, { resumable, value });
      receipt.effect = { resumable, phase: value.phase, namespaces: value.storage.namespaces };
      if (mutated) assert(!resumable && value.phase === 'draft' && value.storage.namespaces['dukb-soccer-perfect-season-soccer-ps-v0-daily'], 'Wrong key control actually writes a separate obsolete namespace');
    } else {
      await action(c.page, 'resume-daily').click(); await action(c.page, 'next-match').click();
      await settle(c.page); await new Promise(resolve => setTimeout(resolve, 150));
      if (mutated) {
        const until = Date.now() + 5000;
        while (c.posts().length === 0 && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 50));
      }
      const value = await state(c, 'partial-completion', true); assertRecord(value, fixture.cheapest.games, 1);
      check(control.intended, c.posts().length === 0, { posts: c.posts(), value });
      receipt.effect = { posts: c.posts(), record: value.record, run: JSON.parse(value.storage.daily) };
      if (mutated) {
        assert.equal(c.posts().length, 1, 'Completion control actually submits the partial result');
        const payload = c.posts()[0].payload, row = Array.isArray(payload) ? payload[0] : payload;
        assert.equal(row.score, prefixRecord(fixture.cheapest.games, 1).score);
        assert.equal(receipt.effect.run.completionRecorded, false);
      }
    }
    assert.deepEqual(c.pageErrors, [], 'Page errors are infrastructure failures');
    assert.deepEqual(c.failedRequests.filter(row => new URL(row.url).origin === server.base), [], 'Built request failures are infrastructure failures');
    const failed = receipt.assertions.filter(row => !row.passed);
    assert.equal(receipt.assertions.length, 2);
    assert.equal(receipt.assertions[0].passed, true, 'Unaffected page baseline must pass');
    if (mutated) { assert.equal(failed.length, 1); assert.equal(failed[0].title, control.intended); }
    else assert.equal(failed.length, 0);
    receipt.status = 'passed';
  } catch (e) { receipt.error = errorData(e); if (c) { try { await state(c, 'failure', true); } catch (capture) { receipt.captureError = errorData(capture); } } }
  finally {
    if (c) await closeCase(c, receipt, server);
    json(path.join(OUT, 'cases', name, 'receipt.json'), receipt);
    (mutated ? report.controls : report.cases).push(receipt);
    console.log(`Soccer Perfect Season ${name}: ${receipt.status.toUpperCase()}`);
  }
}
async function controlBuild(control) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-ps-1097-'));
  const dir = path.join(OUT, 'controls', control.name);
  fs.mkdirSync(dir, { recursive: true });
  for (const file of tracked) { fs.mkdirSync(path.dirname(path.join(scratch, file)), { recursive: true }); fs.copyFileSync(path.join(ROOT, file), path.join(scratch, file)); }
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(scratch, 'node_modules'), 'dir');
  const mutations = control.mutations.map((mutation, index) => {
    const target = path.join(scratch, mutation.file), original = fs.readFileSync(target, 'utf8');
    assert.equal(original.split(mutation.from).length - 1, 1, 'Mutation anchor occurs once');
    assert.equal(original.split(mutation.to).length - 1, 0, 'Mutation replacement is absent');
    const changed = original.replace(mutation.from, mutation.to);
    assert.notEqual(changed, original); assert.equal(changed.replace(mutation.to, mutation.from), original);
    fs.writeFileSync(target, changed); fs.writeFileSync(path.join(dir, `source-${index}-${path.basename(mutation.file)}`), changed);
    return { ...mutation, originalSha256: sha(original), changedSha256: sha(changed), inverseSha256: sha(changed.replace(mutation.to, mutation.from)) };
  });
  const copied = sourceMap(scratch);
  const changedFiles = tracked.filter(file => before[file] !== copied[file]);
  assert.deepEqual(changedFiles.sort(), control.mutations.map(row => row.file).sort());
  json(path.join(dir, 'mutation.json'), { name: control.name, intended: control.intended, mutations, sourceMap: copied });
  await child(process.execPath, [path.join(scratch, 'node_modules/vite/bin/vite.js'), 'build', '--sourcemap'], scratch, path.join(dir, 'build'));
  assert.deepEqual(sourceMap(scratch), copied, 'Control build leaves its copied source held');
  await child('tar', ['-czf', path.join(dir, 'build.tar.gz'), '-C', scratch, 'dist'], scratch, path.join(dir, 'archive'));
  const server = await serve(path.join(scratch, 'dist'), 'controls/' + control.name, scratch);
  try { await probe(server, control, true); }
  finally { await server.close(); fs.rmSync(scratch, { recursive: true, force: true }); }
}

let healthy;
try {
  browser = await chromium.launch({ headless: true });
  json(path.join(OUT, 'browser.json'), { version: browser.version(), executable: chromium.executablePath(), executableSha256: sha(fs.readFileSync(chromium.executablePath())), node: process.version });
  healthy = await serve(path.join(ROOT, 'dist'), 'candidate');
  for (const width of WIDTHS) {
    await runCase(healthy, `strongest-${width}`, width, c => play(c, 'strongest', 'finish'), {}, width === 390);
    await runCase(healthy, `cheapest-next-${width}`, width, c => play(c, 'cheapest', 'next'));
    await runCase(healthy, `cheapest-finish-${width}`, width, c => play(c, 'cheapest', 'finish'));
  }
  await runCase(healthy, 'old-date-resume', 390, async c => {
    await c.page.evaluate(() => { window.__qaSoccerClock = Date.parse('2026-01-02T17:00:00Z'); sessionStorage.setItem('qa-soccer-clock', '2026-01-02T17:00:00Z'); });
    await c.page.reload({ waitUntil: 'domcontentloaded' }); await action(c.page, 'resume-daily').waitFor();
    assert.equal(await action(c.page, 'daily').count(), 1, 'New-day Start is explicit');
    await action(c.page, 'resume-daily').click(); const value = await state(c, 'pinned-old-date', true);
    assert.equal(value.storage.daily, JSON.stringify(saved(fixture.cheapestChoices, 17)));
    assert(value.text.includes(fixture.date)); assertRecord(value, fixture.cheapest.games, 17); await assertNoPost(c);
    await action(c.page, 'back-menu').click(); await action(c.page, 'daily').click();
    const fresh = await state(c, 'explicit-next-day', true), run = JSON.parse(fresh.storage.daily);
    assert.equal(run.date, '2026-01-02'); assert.notEqual(run.seed, fixture.seed); assert.equal(run.choices.length, 0);
  }, { [DAILY]: JSON.stringify(saved(fixture.cheapestChoices, 17)) });
  await runCase(healthy, 'invalid-raw-fresh-start', 320, async c => {
    const boot = await state(c, 'invalid-boot', true);
    assert.equal(boot.storage.daily, '{broken'); assert.equal(boot.storage.unlimited, 'not-json');
    assert.equal(await action(c.page, 'resume-daily').count(), 0); assert.equal(await action(c.page, 'resume-unlimited').count(), 0);
    await action(c.page, 'daily').click(); const fresh = await state(c, 'deliberate-fresh-daily');
    assert.equal(JSON.parse(fresh.storage.daily).date, fixture.date); assert.equal(fresh.storage.unlimited, 'not-json'); await assertNoPost(c);
  }, { [DAILY]: '{broken', [UNLIMITED]: 'not-json' });
  await runCase(healthy, 'storage-fails-after-mount', 390, async c => {
    await action(c.page, 'daily').click(); const raw = (await state(c, 'before-storage-failure')).storage.daily;
    await c.page.evaluate(({ daily, unlimited }) => {
      const actual = Storage.prototype.setItem;
      window.__qaSoccerWriteFailures = [];
      Storage.prototype.setItem = function(key, value) {
        if (key === daily || key === unlimited) { window.__qaSoccerWriteFailures.push({ key, value }); throw new DOMException('QA storage denied', 'QuotaExceededError'); }
        return actual.call(this, key, value);
      };
    }, { daily: DAILY, unlimited: UNLIMITED });
    await c.page.locator('[data-soccer-ps-offer="0"]').click(); await c.page.locator('[data-soccer-ps-offer="0"]').click();
    assert((await c.page.getByRole('status').innerText()).includes('could not save'));
    await action(c.page, 'back-menu').click(); await action(c.page, 'resume-daily').click();
    const resumed = await state(c, 'memory-resume', true); assert.equal(resumed.storage.daily, raw); assert.equal(Number(resumed.budget), 6);
    assert(resumed.text.includes('Pick 3 of 11')); assert.equal((await c.page.evaluate(() => window.__qaSoccerWriteFailures)).length, 2); await assertNoPost(c);
  });
  await runCase(healthy, 'unlimited-finish-reload-recap', 390, unlimitedJourney,
    { [DAILY]: JSON.stringify(saved(fixture.witness.choices, 38, true)) });
  for (const control of controls) await probe(healthy, control, false);
  for (const control of controls) {
    try { await controlBuild(control); }
    catch (e) { const receipt = { name: 'control-' + control.name, status: 'failed', infrastructureError: errorData(e) }; report.controls.push(receipt); json(path.join(OUT, 'controls', control.name, 'failure.json'), receipt); console.log(`Soccer Perfect Season control-${control.name}: FAILED`); }
  }
} catch (e) { report.infrastructureError = errorData(e); }
finally {
  if (healthy) await healthy.close();
  if (browser) await browser.close();
  const after = sourceMap(ROOT); json(path.join(OUT, 'source-after.json'), after);
  report.sourceHeld = JSON.stringify(before) === JSON.stringify(after);
  report.passed = report.cases.filter(row => row.status === 'passed').length;
  report.failed = report.cases.filter(row => row.status !== 'passed').length;
  report.controlsAccepted = report.controls.filter(row => row.status === 'passed').length;
  report.status = !report.infrastructureError && report.sourceHeld && report.cases.length === 19 && report.passed === 19 && report.controls.length === 6 && report.controlsAccepted === 6 ? 'passed' : 'failed';
  json(path.join(OUT, 'report.json'), report);
  console.log(`Soccer Perfect Season native: ${report.passed}/19 cases, ${report.controlsAccepted}/6 controls, source hold ${report.sourceHeld}, ${report.status.toUpperCase()}`);
}
if (report.status !== 'passed') process.exitCode = 1;
