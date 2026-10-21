/* Rounds 1517 and 1518. Remote-only browser proof on completed builds.
   Fixtures use the unchanged career engines. Every external request is
   fulfilled locally. Baseline pictures are evidence, never a passing court. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASELINE = path.resolve(process.env.CAREER_VISUALS_BASELINE_DIR || 'dist-career-baseline');
const CURRENT = path.resolve(ROOT, process.env.DIST || 'dist');
const OUT = path.resolve(ROOT, process.env.CAREER_VISUALS_OUT || 'career-match-visuals-artifacts/browser');
const SOURCE = process.env.SOURCE_SHA || process.env.GITHUB_SHA;
const digest = value => createHash('sha256').update(value).digest('hex');
assert(/^[a-f0-9]{40}$/.test(SOURCE || ''), 'An exact remote source SHA is required');
assert(fs.existsSync(path.join(BASELINE, 'index.html')), 'A completed 076091ac baseline build is required');
assert(fs.existsSync(path.join(CURRENT, 'index.html')), 'A completed current build is required');
assert.notEqual(BASELINE, CURRENT, 'Before and after must be separate completed builds');
fs.mkdirSync(OUT, { recursive: true });
const report = { source: SOURCE, baseline: '076091ac870db38b953ddf71d3252cf1ac556782', run: process.env.GITHUB_RUN_ID || null,
  started: new Date().toISOString(), status: 'running', holds: [], cases: [], actualOutbound: 0 };
const writeReport = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
const enginePins = {
  'src/lib/nbaMyCareer.ts': '026be724a8ea188fd8d6394395fa1db5f58fdd71787cc80a13f84a09789230f5',
  'src/lib/nbaCareerSport.ts': '17c511ff6cd160975a245e1e85dc3b685e35a0d36dfec82958b218c37fe34ae1',
  'src/lib/fightCareer.ts': 'ccdd83dfbbf41597a5d1890a45c9013ca82a234c7fa9786c00161c949063f5c3',
  'src/lib/fightCareerLifeFlow.ts': '0670e2903f91c4761fa3bc6b035748a391d53260179099d82a3f4b0577037dab',
  'src/lib/fightCareerLife.ts': '8399ce6287eeeae0e18e84aaee7e1af64f6bb89a8fca724aef87c5be8ab48809',
  'src/lib/season/core.ts': '450693bf1c6449105990e09c7799ee276a0a2389b42f04a156ac82ead05e90a0',
  'src/lib/season/us.ts': 'cab896cd16c664151d0d3e3af0b84402cbab68547da819fac0a432cc6c858e43',
  'package.json': 'acfe14626dea53cf5f9c5e0286b766a22237656b52aac4c888b080873ac90e31',
  'package-lock.json': 'c7e3867eabf0bfa03a8aa6a5e601b0050b937ed210d48c6bbd241019e3c9ea76',
};
for (const [file, expected] of Object.entries(enginePins)) {
  const actual = digest(fs.readFileSync(path.join(ROOT, file)));
  assert.equal(actual, expected, file + ': engine/dependency bytes remain unchanged');
  report.holds.push({ file, sha256: actual });
}
assert(process.env.FREE_KICK_FONT_CACHE, 'The existing local font-response cache is required for geometry proof');
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, 'manifest.json'), 'utf8')).map(row => {
  const body = fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, row.file));
  assert.equal(digest(body), row.sha256, 'Cached font response matches its recorded bytes');
  return [row.url, { body, contentType: row.contentType }];
}));
function seeded(seed) {
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let n = Math.imul(seed ^ seed >>> 15, 1 | seed); n = (n + Math.imul(n ^ n >>> 7, 61 | n)) ^ n; return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}
const fixtureFile = path.join(os.tmpdir(), `career-visuals-${process.pid}.mjs`);
await build({ stdin: { contents: "export { NBA_CAREER_SPORT } from './src/lib/nbaCareerSport'; export { NBA_SEASON } from './src/lib/season/nba'; export { buildUsSeason } from './src/lib/season/us'; export { deriveSeason } from './src/lib/season/core'; export { lifeNewCareer, lifeRunCamp, lifeTakeFight } from './src/lib/fightCareerLifeFlow';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: fixtureFile, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic',
  banner: { js: "import { createRequire as __fixtureRequire } from 'node:module'; const require = __fixtureRequire(import.meta.url);" } });
const memory = new Map();
globalThis.localStorage ??= { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
const M = await import(pathToFileURL(fixtureFile).href);
fs.unlinkSync(fixtureFile);
function fixtures() {
  const original = Math.random, rng = seeded(1517);
  Math.random = rng;
  try {
    const sport = M.NBA_CAREER_SPORT;
    const career = sport.startCareer('Court Watcher', 'SG', sport.create.archetypes.SG[0], rng, null, 'now');
    const quality = sport.rollTeamQuality(null, rng);
    sport.assignRole(career, quality, rng); sport.campBattle(career, quality, rng); sport.simSeason(career, quality, rng); sport.progress(career, rng);
    career.contractYears = Math.max(3, career.contractYears);
    const row = career.seasons.at(-1), built = M.buildUsSeason(M.NBA_SEASON, career, row, sport.teamLabelOf);
    assert(built.ok, 'Actual NBA fixture can derive a readable season');
    const season = M.deriveSeason(built.sport, row, built.ctx);
    assert(season?.games.length === 82, 'The fixture owns 82 derived games');
    const fight = M.lifeRunCamp(M.lifeNewCareer('Ring Watcher', 'welter', 'outboxer', 'allround', 'family', 'round-1518-ring'), { conditioning: 2, power: 2, defence: 1, speed: 1 });
    const offer = fight.offers[0]; offer.opponent.name = 'Recap Opponent';
    const outcome = M.lifeTakeFight(fight, offer.id, ['box', 'press', 'counter']);
    assert(outcome && outcome.result.rounds.length > 2, 'Actual saved Fight plan owns enough rounds to pause, step, play and skip');
    return {
      nba: { key: sport.saveKey, value: JSON.stringify({ c: career, phase: 'season', teamQuality: quality }), game: season.games[0], usName: built.ctx.teamLabel, themName: season.labels[season.games[0].opp].name },
      fight: { key: 'fight-career-save-v1', value: JSON.stringify({ st: fight, phase: 'plan', offerId: offer.id }), expected: outcome },
    };
  } finally { Math.random = original; }
}
const fixture = fixtures();
report.fixtures = Object.fromEntries(Object.entries(fixture).map(([name, value]) => [name, { key: value.key, bytes: Buffer.byteLength(value.value), sha256: digest(value.value) }]));
const courtChunks = fs.readdirSync(path.join(CURRENT, 'assets')).filter(file => file.endsWith('.js') && fs.readFileSync(path.join(CURRENT, 'assets', file), 'utf8').includes('data-nba-court'));
assert.equal(courtChunks.length, 1, 'One completed-build chunk owns the court marker');
report.courtChunk = { file: courtChunks[0], sha256: digest(fs.readFileSync(path.join(CURRENT, 'assets', courtChunks[0]))) };
const profiles = [ { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 432, height: 813 }, { width: 1440, height: 1000 }, { width: 390, height: 844, reduced: true } ];
const twoFrames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function activate(locator, profile) {
  const box = await locator.boundingBox();
  assert(box && box.width >= 43.5 && box.height >= 43.5, 'New playback action retains a 44px target');
  if (profile.width < 600) await locator.tap(); else { await locator.focus(); await locator.press('Enter'); }
}
async function geometry(page, art, actions, stage) {
  const value = await art.evaluate((el, selectors) => {
    const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const svg = el.matches('svg') ? el : el.querySelector('svg');
    return { viewport: innerWidth, height: innerHeight, document: document.documentElement.scrollWidth, art: box(svg), wrapper: box(el),
      text: (el.textContent || '').trim(), actions: selectors.flatMap(selector => [...document.querySelectorAll(selector)]).map(node => ({ text: node.textContent, box: box(node), scroll: node.scrollWidth, client: node.clientWidth })) };
  }, actions);
  assert(value.document <= value.viewport + 2, stage + ': no horizontal document overflow');
  assert(value.art.width > 100 && value.art.height > 70 && value.art.x >= -0.5 && value.art.right <= value.viewport + 0.5, stage + ': visible sport surface stays inside the phone');
  for (const action of value.actions.filter(row => row.box.height > 0)) {
    assert(action.box.x >= -0.5 && action.box.right <= value.viewport + 0.5 && action.scroll <= action.client + 2, stage + ': playback labels fit');
    assert(action.box.y >= -0.5 && action.box.bottom <= value.height + 0.5, stage + ': playback controls remain visible in the viewport');
    assert(action.box.width >= 43.5 && action.box.height >= 43.5, stage + ': playback controls retain 44px targets');
    const horizontal = Math.min(action.box.right, value.art.right) - Math.max(action.box.x, value.art.x);
    const vertical = Math.min(action.box.bottom, value.art.bottom) - Math.max(action.box.y, value.art.y);
    assert(horizontal <= 0.5 || vertical <= 0.5, stage + ': artwork never covers a control');
  }
  return { stage, ...value };
}
async function screenshot(page, row, stage) {
  const file = row.id + '-' + stage + '.png';
  await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' }); row.screenshots.push(file);
}
async function serve(dir) {
  const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const port = probe.address().port; probe.close(error => error ? reject(error) : resolve(port)); }); });
  const child = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', dir, String(port)], { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', data => { log += data; }); child.stderr.on('data', data => { log += data; });
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Owned host-like server did not start')), 15000); child.once('error', reject); child.once('exit', code => reject(new Error('Owned server exited ' + code))); child.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } }); });
  const expected = fs.readFileSync(path.join(dir, 'index.html'));
  assert.equal(digest(Buffer.from(await (await fetch(`http://127.0.0.1:${port}`)).arrayBuffer())), digest(expected), 'Owned server serves exactly the requested completed build');
  return { base: `http://127.0.0.1:${port}`, close: () => { child.kill(); fs.writeFileSync(path.join(OUT, path.basename(dir) + '-server.log'), log); } };
}
async function open(browser, server, profile, sport, row) {
  const save = fixture[sport], context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.width < 600, hasTouch: profile.width < 600, reducedMotion: profile.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block', deviceScaleFactor: 1 });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === server.base) { assert(['GET', 'HEAD'].includes(request.method()), 'Local build receives read requests only'); return route.continue(); }
    row.external.push({ method: request.method(), origin: url.origin, path: url.pathname });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) row.writes.push({ method: request.method(), origin: url.origin, path: url.pathname });
    if (fonts.has(url.href)) { row.fonts.push(url.href); return route.fulfill({ status: 200, ...fonts.get(url.href) }); }
    assert(!/fonts\.(googleapis|gstatic)\.com/.test(url.hostname), 'Font request must have an exact local fixture');
    const kind = request.resourceType();
    return route.fulfill({ status: 200, contentType: kind === 'stylesheet' ? 'text/css' : kind === 'script' ? 'application/javascript' : 'application/json', body: ['stylesheet', 'script'].includes(kind) ? '' : '[]' });
  });
  await context.addInitScript(({ key, value }) => {
    if (!sessionStorage.getItem('career-visual-fixture')) {
      sessionStorage.setItem('career-visual-fixture', '1'); localStorage.setItem(key, value);
      localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() }));
    }
    let seed = 1517; window.__careerVisualDraws = 0;
    Math.random = () => { window.__careerVisualDraws += 1; seed = (seed + 0x6D2B79F5) >>> 0; let n = Math.imul(seed ^ seed >>> 15, 1 | seed); n = (n + Math.imul(n ^ n >>> 7, 61 | n)) ^ n; return ((n ^ n >>> 14) >>> 0) / 4294967296; };
  }, { key: save.key, value: save.value });
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  await page.clock.install({ time: new Date('2026-10-21T16:00:00Z') });
  row.requestedAssets = [];
  page.on('request', request => { const url = new URL(request.url()); if (url.origin === server.base && url.pathname.startsWith('/assets/')) row.requestedAssets.push(path.basename(url.pathname)); });
  page.on('pageerror', error => row.errors.push(String(error)));
  page.on('requestfailed', request => { if (request.url().startsWith(server.base)) row.assets.push(request.url() + ': ' + request.failure()?.errorText); });
  page.on('response', response => { if (response.url().startsWith(server.base) && response.status() >= 400) row.assets.push(response.url() + ': ' + response.status()); });
  await page.goto(server.base + (sport === 'nba' ? '/nba-my-career' : '/fight-career'), { waitUntil: 'domcontentloaded' });
  const entry = sport === 'nba' ? page.locator('[data-watch-last]') : page.getByRole('button', { name: 'Fight', exact: true });
  await entry.waitFor(); await page.evaluate(() => document.fonts.ready); await twoFrames(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  return { page, context, entry, stored: () => page.evaluate(key => localStorage.getItem(key), save.key), draws: () => page.evaluate(() => window.__careerVisualDraws) };
}
async function close(context) {
  for (const page of context.pages()) await page.close();
  await context.unrouteAll({ behavior: 'ignoreErrors' }); await context.close();
}

let browser;
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--no-proxy-server'] });
  for (const variant of ['before', 'after']) {
    const server = await serve(variant === 'before' ? BASELINE : CURRENT);
    try {
      for (const profile of variant === 'before' ? [profiles[1]] : profiles) for (const sport of ['nba', 'fight']) {
        const row = { id: `${variant}-${sport}-${profile.width}${profile.reduced ? '-reduced' : ''}`, variant, sport, ...profile, screenshots: [], geometry: [], external: [], writes: [], fonts: [], errors: [], assets: [] };
        report.cases.push(row); writeReport();
        let view;
        try {
          view = await open(browser, server, profile, sport, row);
          await screenshot(view.page, row, 'before-watch');
          if (sport === 'nba') await nba(view, profile, row); else await fight(view, profile, row);
          assert.deepEqual(row.errors, [], row.id + ': no page errors'); assert.deepEqual(row.assets, [], row.id + ': no failed build assets');
          assert.deepEqual(row.writes, [], row.id + ': no backend write attempts');
          row.passed = true; console.log('CAREER VISUALS PASS ' + row.id);
        } catch (error) {
          row.passed = false; row.error = String(error.stack || error);
          if (view) await screenshot(view.page, row, 'failure').catch(() => {});
          console.error('CAREER VISUALS FAIL ' + row.id + ': ' + row.error);
        } finally { if (view) await close(view.context); writeReport(); }
      }
    } finally { server.close(); }
  }
  assert.equal(report.cases.length, 12, 'Both games run at all five profiles plus two baseline cases');
  assert(report.cases.every(row => row.passed), 'All browser cases pass');
  for (const sport of ['nba', 'fight']) {
    const before = report.cases.find(row => row.variant === 'before' && row.sport === sport);
    for (const after of report.cases.filter(row => row.variant === 'after' && row.sport === sport)) assert.equal(after.savedSha256, before.savedSha256, after.id + ': exact baseline saved career bytes retained');
  }
  const controls = report.cases.map(row => row.geometryControl).filter(Boolean);
  assert.equal(controls.length, 2, 'Both actual art surfaces receive an effective geometry fault');
  assert(controls.every(control => control.changed && control.rejection && control.restored), 'Both geometry faults reject and restore');
  report.geometryControls = { expected: 2, rejected: controls.length, restored: controls.length };
  report.status = 'passed'; console.log('CAREER MATCH VISUALS COMPLETE: 12 cases, exact baseline saves, local fixtures only');
} catch (error) { report.status = 'failed'; report.error = String(error.stack || error); throw error; }
finally { report.finished = new Date().toISOString(); writeReport(); await browser?.close(); }

async function nba(view, profile, row) {
  const { page, entry, stored, draws } = view;
  await entry.scrollIntoViewIfNeeded();
  const saved = await stored(), random = await draws(), scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  row.initialSavedSha256 = digest(saved); row.initialDraws = random;
  if (row.variant === 'after') {
    assert.match(await page.locator('[data-week-by-week]').innerText(), /Watch games/, 'NBA offers its actual Watch games action');
    assert(!row.requestedAssets.includes(courtChunks[0]), 'NBA hub does not download court artwork before Watch');
  }
  await activate(entry, profile);
  const centre = page.locator('[data-season-centre]'); await centre.waitFor();
  const help = page.locator('[data-season-help]'); await help.waitFor();
  assert((await help.innerText()).includes('Worked examples'), 'The viewer opens real worked examples before playback');
  if (row.variant === 'after') assert.match(await help.innerText(), /quarter|court/i, 'The NBA guide explains its new quarter court recap');
  await screenshot(page, row, 'instructions');
  await activate(help.getByRole('button', { name: 'Got it', exact: true }), profile);
  assert(await centre.evaluate(el => el.contains(document.activeElement)), 'Closing help restores focus inside the viewer');
  await activate(centre.getByRole('button', { name: /Tip off/ }), profile);
  const clock = page.locator('[data-match-clock]'); await clock.waitFor();
  const court = page.locator('[data-nba-court]');
  if (row.variant === 'before') {
    assert.equal(await court.count(), 0, 'Original build has no NBA court stage');
    assert.equal(await page.getByRole('img', { name: /Basketball court recap/i }).count(), 0, 'Original markup has no court artwork');
    await screenshot(page, row, 'original-match');
  } else {
    await court.waitFor();
    assert(row.requestedAssets.includes(courtChunks[0]), 'Watch loads the actual lazy court chunk');
    assert.equal(await page.getByRole('img', { name: /Basketball court recap/i }).count(), 1, 'Actual lazy NBA viewer draws one accessible court');
    row.geometry.push(await geometry(page, court, ['[data-centre-bar] button'], 'court-start'));
  }
  const sample = async stage => {
    const minute = Number(await clock.getAttribute('data-minute'));
    const expected = fixture.nba.game.events.filter(event => event.min <= minute && event.pts).reduce((value, event) => { value[event.side === 'us' ? 0 : 1] += event.pts; return value; }, [0, 0]);
    assert.equal(await clock.getAttribute('data-score'), expected.join('-'), stage + ': actual clock reconciles with supplied quarter events');
    if (row.variant === 'after') {
      assert.equal(await court.getAttribute('data-score'), expected.join('-'), stage + ': court agrees with actual clock');
      assert.equal(await court.getAttribute('data-quarter'), String(Math.max(1, Math.min(4, Math.ceil(minute / 12)))), stage + ': court and clock agree on current quarter');
      assert((await court.locator('[data-court-home]').innerText()).includes(fixture.nba.game.home ? fixture.nba.usName : fixture.nba.themName), stage + ': home label stays on the home side');
      assert((await court.locator('[data-court-away]').innerText()).includes(fixture.nba.game.home ? fixture.nba.themName : fixture.nba.usName), stage + ': away label stays on the away side');
      const quarters = await court.locator('[data-court-quarter]').evaluateAll(nodes => nodes.map(node => ({ q: Number(node.getAttribute('data-court-quarter')), revealed: node.getAttribute('data-revealed') === 'true', text: node.innerText })));
      assert.equal(quarters.length, 4, stage + ': all four quarter places stay visible');
      for (const quarter of quarters) {
        assert.equal(quarter.revealed, quarter.q * 12 <= minute, stage + ': later quarter values stay hidden');
        if (quarter.revealed) for (const event of fixture.nba.game.events.filter(event => event.kind === 'quarter' && event.min === quarter.q * 12)) assert(new RegExp('\\b' + event.pts + '\\b').test(quarter.text), stage + ': revealed quarter contains both supplied scores');
        else assert(quarter.text.includes('?'), stage + ': unrevealed quarter shows a placeholder');
      }
    }
    if (minute < 48 && fixture.nba.game.played) assert.equal(await page.locator('[data-his-line]').count(), 0, stage + ': final player line stays hidden');
    return { stage, minute, score: expected };
  };
  row.samples = [await sample('start')];
  if (!profile.reduced) {
    await activate(centre.getByRole('button', { name: /Pause$/ }), profile);
    const paused = await clock.getAttribute('data-minute');
    await page.clock.runFor(20_000);
    assert.equal(await clock.getAttribute('data-minute'), paused, 'Pause holds the actual NBA clock');
    if (row.variant === 'after') {
      await screenshot(page, row, 'paused-court');
      if (profile.width === 390) row.geometryControl = await artControl(page, court, ['[data-centre-bar] button']);
    }
    await activate(centre.getByRole('button', { name: /Resume$/ }), profile);
    for (let quarter = 1; quarter <= 4; quarter += 1) { await page.clock.runFor(4000); row.samples.push(await sample('quarter-' + quarter)); }
  }
  await activate(centre.getByRole('button', { name: 'Results', exact: true }), profile);
  await page.clock.runFor(100);
  row.samples.push(await sample('results'));
  assert.equal(Number(await clock.getAttribute('data-minute')), 48, 'Results presents the final NBA frame');
  if (fixture.nba.game.played) {
    const text = await page.locator('[data-his-line]').innerText(), line = fixture.nba.game.line;
    for (const field of ['pts', 'reb', 'ast']) assert(text.includes(`${line[field] ?? 0} ${field.toUpperCase()}`), 'Actual final player line keeps ' + field);
  }
  if (row.variant === 'after') {
    row.geometry.push(await geometry(page, court, ['[data-centre-bar] button'], 'court-final'));
    if (profile.reduced) assert.equal(await court.evaluate(el => el.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length), 0, 'Reduced-motion court is settled');
    await screenshot(page, row, 'final-court');
  }
  // Use the existing visible question control, whose accessible title belongs to the sport.
  const question = centre.locator('button').filter({ hasText: /^\?$/ });
  assert.equal(await question.count(), 1, 'Viewer retains one question control');
  await activate(question, profile); await help.waitFor();
  await help.press('Escape'); await help.waitFor({ state: 'detached' });
  assert(await centre.evaluate(el => el.contains(document.activeElement)), 'Escape closes help and keeps viewer focus');
  await activate(centre.locator('[data-centre-exit]'), profile); await centre.waitFor({ state: 'detached' });
  assert(await entry.evaluate(el => document.activeElement === el), 'Closing replay returns focus to its actual entry');
  assert.deepEqual(await page.evaluate(() => ({ x: scrollX, y: scrollY })), scroll, 'Closing replay preserves the page scroll');
  assert.equal(await stored(), saved, 'Watching the existing season preserves exact saved career bytes');
  assert.equal(await draws(), random, 'Watching NBA consumes no global career random draws');
  row.savedSha256 = digest(await stored()); row.finalDraws = await draws();
}

async function fight(view, profile, row) {
  const { page, entry, stored, draws } = view;
  const rules = page.getByRole('dialog', { name: 'How to play', exact: true });
  if (!await rules.isVisible()) await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await rules.waitFor();
  assert((await rules.innerText()).includes('A worked example'), 'Fight keeps its actual worked example before watching');
  if (row.variant === 'after') assert.match(await rules.innerText(), /Round recap|Next round/i, 'Fight guide explains the ring playback controls');
  await screenshot(page, row, 'instructions');
  await activate(rules.getByRole('button', { name: "Let's Play!", exact: true }), profile);
  await entry.scrollIntoViewIfNeeded();
  const random = await draws(); await activate(entry, profile);
  const saved = await stored(), actual = JSON.parse(saved), expected = fixture.fight.expected;
  assert.equal(actual.phase, 'hub', 'The real Fight action stores a completed hub outcome first');
  assert.equal(actual.st.rngTick, expected.state.rngTick, 'Fight stores the exact engine random position');
  assert.deepEqual(actual.st.history, expected.state.history, 'Fight stores the exact engine bout history');
  assert.equal(actual.st.life.bank, expected.state.life.bank, 'Fight keeps the original take-home purse');
  row.initialSavedSha256 = digest(saved); row.initialDraws = random;
  const ring = page.locator('[data-fight-ring]');
  if (row.variant === 'before') {
    assert.equal(await ring.count(), 0, 'Original Fight build has no ring stage');
    assert.equal(await page.getByRole('img', { name: /Boxing ring/i }).count(), 0, 'Original markup has no boxing ring');
    await screenshot(page, row, 'original-fight');
  } else {
    await ring.waitFor(); assert.equal(await page.getByRole('img', { name: /Boxing ring/i }).count(), 1, 'Actual Fight route draws an accessible ring');
    assert.equal(await ring.getAttribute('data-round'), '0', 'Ring starts before its first revealed round');
    assert.equal(await page.locator('[data-current-round]').getAttribute('data-current-round'), '0');
    const recap = page.locator('[data-fight-recap]'), controls = page.locator('[data-fight-playback]');
    assert.match(await recap.innerText(), /Round recap/, 'Illustrative scene is honestly labeled a round recap');
    row.geometry.push(await geometry(page, ring, ['[data-fight-playback] button'], 'ring-start'));
    const firstBox = await ring.boundingBox();
    await activate(controls.getByRole('button', { name: 'Pause', exact: true }), profile);
    await page.clock.runFor(20_000);
    assert.equal(await ring.getAttribute('data-round'), '0', 'Pause prevents an unrevealed round from appearing');
    await activate(controls.getByRole('button', { name: 'Next round', exact: true }), profile);
    await page.clock.runFor(20_000);
    assert.equal(await ring.getAttribute('data-round'), '1', 'Next round reveals exactly one and then holds');
    const first = expected.result.rounds[0], panel = page.locator('[data-current-round="1"]');
    const tacticWords = { box: 'Box', press: 'Pressure', counter: 'Counter', brawl: 'Brawl' };
    assert.equal(await panel.locator('[data-round-landed]').innerText(), `You landed ${first.playerLanded}. Opponent landed ${first.oppLanded}.`, 'Current panel keeps both actual landed counts');
    assert.equal(await panel.locator('[data-round-tactics]').innerText(), `You: ${tacticWords[first.tactic]}. Opponent: ${tacticWords[first.oppTactic]}.`, 'Current panel keeps both actual tactics');
    const victim = first.knockdown === 'player' ? 'opp' : first.knockdown === 'opp' ? 'player' : null;
    for (const fighter of ['player', 'opp']) assert.equal(await ring.locator(`[data-fighter="${fighter}"]`).getAttribute('data-pose') === 'down', fighter === victim, 'The recorded scorer knocks down the correct victim');
    assert.equal(await controls.getByRole('button', { name: 'Play', exact: true }).count(), 1, 'Manual step leaves playback paused');
    assert.equal(await stored(), saved, 'Pause and manual stepping never rewrite the saved fight');
    assert.equal(await draws(), random, 'Ring presentation consumes no new global random draws before completion');
    row.geometry.push(await geometry(page, ring, ['[data-fight-playback] button'], 'ring-round-one'));
    const nextBox = await ring.boundingBox(); assert(Math.abs(nextBox.width - firstBox.width) <= 0.5 && Math.abs(nextBox.height - firstBox.height) <= 0.5, 'Ring retains its fixed surface size across round reveals');
    await screenshot(page, row, 'paused-round-one');
    if (profile.width === 390 && !profile.reduced) row.geometryControl = await artControl(page, ring, ['[data-fight-playback] button']);
    await activate(controls.getByRole('button', { name: 'Play', exact: true }), profile);
    await page.clock.runFor(3100);
    assert.equal(await ring.getAttribute('data-round'), '2', 'Play reveals the next actual round at the documented three-second pace');
    await activate(controls.getByRole('button', { name: 'Pause', exact: true }), profile);
    const second = await ring.getAttribute('data-round'); await page.clock.runFor(20_000);
    assert.equal(await ring.getAttribute('data-round'), second, 'Pause holds after playback has already advanced');
    const scorecards = page.locator('[data-round-scorecards]');
    assert.equal(await scorecards.getAttribute('open'), null, 'Earlier scorecards start collapsed');
    await activate(scorecards.locator('summary'), profile); assert.equal(await scorecards.getAttribute('open'), '', 'Earlier scorecards reopen without adding a default round wall');
    await activate(scorecards.locator('summary'), profile); assert.equal(await scorecards.getAttribute('open'), null, 'Earlier scorecards close again');
  }
  await activate(page.getByRole('button', { name: 'Skip to the decision', exact: true }), profile);
  await page.clock.runFor(100);
  const continuation = page.getByRole('button', { name: 'Next', exact: true }); await continuation.waitFor();
  if (row.variant === 'after') {
    assert.equal(await ring.getAttribute('data-round'), String(expected.result.rounds.length), 'Skip reveals the actual finishing round');
    const loser = expected.result.winner === 'player' ? 'opp' : expected.result.winner === 'opp' ? 'player' : null;
    if (!['KO', 'TKO'].includes(expected.result.method)) for (const fighter of ['player', 'opp']) assert.notEqual(await ring.locator(`[data-fighter="${fighter}"]`).getAttribute('data-pose'), 'down', 'A completed decision leaves both figures upright');
    if (expected.result.method === 'TKO' && !expected.result.rounds.at(-1).knockdown) assert.equal(await ring.locator(`[data-fighter="${loser}"]`).getAttribute('data-pose'), 'stopped', 'A TKO without a current knockdown is shown as stopped');
    if (profile.reduced) assert.equal(await ring.evaluate(el => el.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length), 0, 'Reduced-motion ring is settled');
    row.geometry.push(await geometry(page, ring, [], 'ring-result'));
    await screenshot(page, row, 'final-ring');
  }
  assert.equal(await stored(), saved, 'The final decision preserves the exact saved engine outcome');
  await activate(continuation, profile);
  assert.equal(await ring.count(), 0, 'Continue leaves the ring without replaying the bout');
  assert.equal(await stored(), saved, 'Continue preserves the completed saved career bytes');
  row.savedSha256 = digest(await stored()); row.finalDraws = await draws();
}

async function artControl(page, art, actions) {
  const original = await art.getAttribute('style'), before = await geometry(page, art, actions, 'control-before');
  let rejection;
  try {
    await art.evaluate(el => { el.style.transform = 'translateX(-200vw)'; });
    assert.notEqual(await art.getAttribute('style'), original, 'Art negative control changes the actual rendered element');
    assert((await art.boundingBox()).x < -100, 'Art negative control actually moves the surface outside the viewport');
    try { await geometry(page, art, actions, 'control-broken'); }
    catch (error) { assert(error instanceof assert.AssertionError && error.message.startsWith('control-broken: visible sport surface'), 'Only the intended sport-surface assertion earns negative-control credit'); rejection = error.message; }
    assert(rejection, 'Displaced court/ring must fail the real geometry assertion');
  } finally { await art.evaluate((el, style) => style === null ? el.removeAttribute('style') : el.setAttribute('style', style), original); }
  const restored = await geometry(page, art, actions, 'control-restored');
  assert.deepEqual(restored.art, before.art, 'Negative control restores the exact original art rectangle');
  assert.equal(await art.getAttribute('style'), original, 'Negative control restores the exact original style bytes');
  return { changed: true, rejection, restored: true };
}
