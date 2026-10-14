import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

assert(process.env.CI, 'Manager promotion browser journeys run only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPUT = path.resolve(process.env.MANAGER_REPORT_ARTIFACTS || 'manager-report-artifacts/natural');
const OUT = path.join(INPUT, 'browser');
const CACHE = path.resolve(process.env.FREE_KICK_FONT_CACHE || 'manager-report-artifacts/font-cache');
const sha = value => createHash('sha256').update(value).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(INPUT, 'manifest.json'), 'utf8'));
const KEY = manifest.saveKey;
assert.equal(KEY, 'dukb-club-manager-save');
assert.equal(manifest.cases.length, 5, 'Retain the five genuine configured-pyramid campaigns');
assert(manifest.cases.every(row => row.outcome === 'promotion'), 'These browser inputs are genuinely earned promotions');
const held = (name, digest) => {
  assert(name && /^[a-f0-9]{64}$/.test(digest), 'The actual helper must bind every input to its bytes');
  const file = path.resolve(INPUT, name); assert.equal(path.dirname(file), INPUT);
  const bytes = fs.readFileSync(file, 'utf8'); assert.equal(sha(bytes), digest, `${name}: retained bytes match their manifest`); return bytes;
};
const cases = manifest.cases.map(row => ({ ...row,
  raw: held(row.rawFile, row.rawSha256), input: JSON.parse(held(row.inputFile, row.inputSha256)),
  engineExpected: JSON.parse(held(row.expectedFile, row.expectedSha256)),
  saveExpected: JSON.parse(held(row.expectedSaveFile, row.expectedSaveSha256)),
  draws: JSON.parse(held(`${row.id}-draws.json`, row.drawsSha256)).summer,
}));
for (const row of cases) {
  assert(row.input.pendingSummary && !row.input.sacked && !row.input.jobHunt?.summerMove);
  assert.equal(row.input.clubName, row.clubName); assert.equal(row.input.customClub.replacedClub, row.proxy);
  assert.equal(row.engineExpected.customClub.leagueId, row.toLeague); assert.equal(row.draws.length, row.summerDraws);
}
const sources = ['src/lib/clubManager.ts', 'src/lib/clubManagerCalendar.ts', 'src/hooks/useClubManager.ts',
  'src/pages/ClubManager.tsx', 'src/components/club-manager/ClubManagerSeasonSummary.tsx',
  'src/components/club-manager/WorldTablesCard.tsx', 'src/components/club-manager/LeagueTableCard.tsx',
  'src/components/club-manager/CalendarScreen.tsx', 'scripts/simManagerCustomPromotion.mjs', 'scripts/playManagerCustomPromotion.mjs'];
const sourceHashes = () => Object.fromEntries(sources.map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]));
assert.equal(manifest.source.after, sha(fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'))));
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file)); const body = fs.readFileSync(path.join(CACHE, entry.file));
  assert.equal(sha(body), entry.sha256); return [entry.url, { body, contentType: entry.contentType }];
}));
fs.mkdirSync(OUT, { recursive: true });
const report = { sourceBefore: sourceHashes(), cases: [], controls: [], failed: 0, forwardedExternalRequests: 0,
  limitations: ['Five fictional campaigns played by the actual engine, not replays of the unavailable user saves.',
    'Relegation and malformed or old incomplete worlds are covered by separate crafted unit cases, not these genuine promotion journeys.',
    'External flags use inert offline fixtures. The real site fonts use retained original bytes.',
    'The actual Continue click arms the recorded summer RNG, restored by its final document bubble listener after the synchronous React handler.'] };
const write = (name, value) => fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(value, null, 2));
const built = await build({ stdin: { contents: "export * as cm from './src/lib/clubManager'; export * as calendar from './src/lib/clubManagerCalendar';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, platform: 'browser', format: 'iife', globalName: '__managerPromotionOracle', write: false,
  alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
  loader: { '.css': 'empty' }, logLevel: 'error' });
const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => {
  const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); }); });
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let browser, oracleContext, oracle, serverLog = '';
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned app server did not start')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { serverLog += data; if (serverLog.includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  server.stderr.on('data', data => { serverLog += data; });
});
const fixedClock = now => { const OldDate = Date; window.Date = class extends OldDate {
  constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; }
}; };
async function oracleState(fixture, rollover) {
  await oracle.reload({ waitUntil: 'domcontentloaded' }); await oracle.addScriptTag({ content: built.outputFiles[0].text });
  return oracle.evaluate(({ raw, key, now, seed, rollover }) => {
    const { cm, calendar } = window.__managerPromotionOracle, OldDate = Date, oldRandom = Math.random;
    window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    try {
      localStorage.clear(); localStorage.setItem(key, raw); const loaded = cm.loadCareer();
      if (!loaded) throw new Error('The actual engine refused the genuine input');
      let value = seed | 0; const draws = [];
      Math.random = () => { value = (value + 0x6d2b79f5) | 0; let n = Math.imul(value ^ (value >>> 15), 1 | value);
        n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n; const draw = ((n ^ (n >>> 14)) >>> 0) / 4294967296; draws.push(draw); return draw; };
      const logical = rollover ? cm.startNextSeason(loaded) : loaded;
      Math.random = () => { throw new Error('Saving or querying the restored career consumed randomness'); };
      if (!cm.saveCareer(logical)) throw new Error('The actual save writer refused the oracle');
      const bytes = localStorage.getItem(key), state = JSON.parse(bytes), league = cm.careerLeagueOf(logical), days = calendar.seasonDays(logical);
      const firstLeague = [...days.entryDays.values()].find(day => day.competition === 'league' && !day.potential && day.opponent);
      return JSON.parse(JSON.stringify({ state, bytes, draws, league, rows: cm.sortedLeagueTable(logical),
        seasonLabel: cm.worldSeasonLabel(logical), firstLeague, dateLabel: firstLeague && calendar.shortDate(firstLeague.date),
        realClubs: cm.REAL_LEAGUES.flatMap(row => row.clubs).sort(),
        effectiveClubs: cm.REAL_LEAGUES.flatMap(row => logical.leagueOverrides?.[row.id] ?? row.clubs).sort() }));
    } finally { window.Date = OldDate; Math.random = oldRandom; }
  }, { raw: fixture.raw, key: KEY, now: fixture.now, seed: fixture.seed, rollover });
}
function sameState(actual, expected, id, stage) {
  write(`${id}-${stage}-actual`, actual); write(`${id}-${stage}-expected`, expected);
  assert.deepEqual(actual, expected, `${id}: ${stage} preserves every actual logical save field`);
}
async function journey(fixture, width, height) {
  const id = `${width}-${fixture.id}`, row = { id, inputSha256: fixture.rawSha256, expectedSaveSha256: fixture.expectedSaveSha256,
    checks: [], errors: [], assetErrors: [], intercepted: [], screenshots: [], layout: {} }; report.cases.push(row);
  const check = (condition, message) => { row.checks.push({ ok: !!condition, message }); assert(condition, `${id}: ${message}`); console.log(`PASS ${id}: ${message}`); };
  const context = await browser.newContext({ viewport: { width, height }, isMobile: width === 390, hasTouch: width === 390, reducedMotion: 'reduce', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: KEY, value: fixture.raw },
      { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-guest-handle', value: 'SteadyVolley-18' }, { name: 'unrelated-career-save', value: '{"keep":"exact"}' }] }] } });
  try {
    await context.addInitScript(fixedClock, fixture.now);
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) { assert(['GET', 'HEAD'].includes(request.method())); return route.continue(); }
      row.intercepted.push({ method: request.method(), origin: url.origin, path: url.pathname, blocked: true });
      if (request.method() === 'GET' && fonts.has(url.href)) return route.fulfill({ status: 200, ...fonts.get(url.href) });
      if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) { row.assetErrors.push(`Uncached font ${url.href}`); return route.abort(); }
      if (request.resourceType() === 'image') return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12"/>' });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await context.routeWebSocket('**/*', socket => socket.close());
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    page.on('pageerror', error => row.errors.push(String(error)));
    page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.assetErrors.push(`${request.url()}: ${request.failure()?.errorText}`); });
    page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assetErrors.push(`${response.url()}: ${response.status()}`); });
    const bytes = () => page.evaluate(key => localStorage.getItem(key), KEY);
    const read = async () => JSON.parse(await bytes());
    const capture = async (target, name, photograph = true, control = false) => {
      await target.scrollIntoViewIfNeeded();
      const diagnostics = await target.evaluate(element => new Promise(resolve => {
        const frames = []; let previous = '', stable = 0, frame, finished = false;
        const finish = passed => { if (finished) return; finished = true; clearTimeout(timer); cancelAnimationFrame(frame); resolve({ passed, frames }); };
        const timer = setTimeout(() => finish(false), 2500);
        const sample = () => {
          const rect = element.getBoundingClientRect(), style = getComputedStyle(element), ancestors = [];
          for (let node = element.parentElement; node; node = node.parentElement) { const css = getComputedStyle(node);
            ancestors.push({ tag: node.tagName, display: css.display, visibility: css.visibility, opacity: css.opacity, overflow: css.overflow }); }
          const box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
          const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
          const visible = element.isConnected && rect.width > 0 && rect.height > 0 && rect.x >= -1 && rect.y >= -1 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1
            && style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0
            && ancestors.every(css => css.display !== 'none' && css.visibility === 'visible' && Number(css.opacity) > 0) && element.contains(hit);
          const animations = document.getAnimations().filter(a => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime)).length;
          const data = { box, visible, animations, ancestors, documentWidth: document.documentElement.scrollWidth, viewport: { width: innerWidth, height: innerHeight },
            label: element.innerText || element.getAttribute('aria-label'), fontFamily: style.fontFamily, fontSize: style.fontSize, opacity: style.opacity };
          const signature = JSON.stringify(data); stable = visible && animations === 0 && signature === previous ? stable + 1 : 0; previous = signature;
          frames.push({ ...data, stable }); if (stable >= 3) finish(true); else frame = requestAnimationFrame(sample);
        }; frame = requestAnimationFrame(sample);
      }));
      row.layout[name] = diagnostics; write(`${id}-${name}-layout`, diagnostics);
      check(diagnostics.passed && diagnostics.frames.at(-1).documentWidth <= width + 1, `${name}: visible stable content with no horizontal overflow`);
      if (control) check(diagnostics.frames.at(-1).box.height >= 30 && diagnostics.frames.at(-1).box.width >= 30, `${name}: measured control is at least 30px in both dimensions`);
      if (photograph) { const filename = `${id}-${name}.png`; await page.screenshot({ path: path.join(OUT, filename), fullPage: false }); row.screenshots.push(filename); }
    };
    const activate = async (target, name) => { await capture(target, name, false, true); if (width === 390) await target.tap(); else { await target.focus(); await target.press('Enter'); } };
    const tile = name => page.getByRole('button').filter({ has: page.getByText(name, { exact: true }) });
    await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
    const resume = page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }); await resume.waitFor();
    row.fonts = await page.evaluate(async () => { const loaded = []; for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
      const faces = await document.fonts.load(`${weight} 16px "${family}"`, 'Promotion season'); loaded.push({ family, weight, loaded: faces.length > 0 && faces.every(face => face.status === 'loaded') });
    } await document.fonts.ready; return loaded; });
    check(row.fonts.length === 8 && row.fonts.every(face => face.loaded), 'Actual site font faces load from retained original bytes');
    await activate(resume, 'resume-control');
    const finish = page.getByRole('heading', { name: `SEASON ${fixture.input.season} COMPLETE`, exact: true }); await finish.waitFor();
    const initialized = await oracleState(fixture, false), before = await read();
    sameState(before, initialized.state, id, 'restored'); row.checks.push({ ok: true, message: 'Whole initial state equals the actual existing save/load normalization' });
    check(before.pendingSummary.position === fixture.position && before.pendingSummary.club === fixture.clubName, 'Actual season review retains the genuinely earned finish and identity');
    await capture(finish, 'season-review', fixture.id === cases[0].id);
    const expected = await oracleState(fixture, true);
    write(`${id}-browser-oracle`, expected);
    assert.deepEqual(expected.state, fixture.saveExpected, 'Browser engine matches the entire retained Node save-writer expectation');
    assert.deepEqual(expected.draws, fixture.draws, 'Browser engine consumes every recorded summer RNG draw in order');
    const next = page.getByRole('button', { name: `Continue to Season ${before.season + 1}`, exact: true });
    await capture(next, 'continue-control', false, true);
    /* The actual hook invokes startNextSeason synchronously in this button's handler. */
    await next.evaluate((button, seed) => {
      button.addEventListener('click', () => {
        const oldRandom = Math.random; let value = seed | 0; window.__managerSummerDraws = []; window.__managerSummerRestored = false;
        Math.random = () => { value = (value + 0x6d2b79f5) | 0; let n = Math.imul(value ^ (value >>> 15), 1 | value);
          n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n; const draw = ((n ^ (n >>> 14)) >>> 0) / 4294967296; window.__managerSummerDraws.push(draw); return draw; };
        document.addEventListener('click', () => { Math.random = oldRandom; window.__managerSummerRestored = true; }, { once: true });
      }, { capture: true, once: true });
    }, fixture.seed);
    if (width === 390) await next.tap(); else { await next.focus(); await next.press('Enter'); }
    await page.locator('[data-cm-hub]').waitFor();
    await page.waitForFunction(({ key, season }) => JSON.parse(localStorage.getItem(key))?.season === season, { key: KEY, season: before.season + 1 });
    const after = await read(), saved = await bytes();
    const actualDraws = await page.evaluate(() => ({ draws: window.__managerSummerDraws, restored: window.__managerSummerRestored }));
    write(`${id}-actual-summer-draws`, actualDraws);
    sameState(after, fixture.saveExpected, id, 'rollover'); row.checks.push({ ok: true, message: 'Actual real-button rollover matches every saved field, history, player, world, calendar and European field' });
    assert.deepEqual(actualDraws.draws, fixture.draws);
    check(actualDraws.restored, 'The actual synchronous rollover uses exactly the recorded RNG and releases the stream');
    check(after.customClub.leagueId === fixture.toLeague && after.customClub.replacedClub === fixture.proxy && after.clubName === fixture.clubName, 'Created identity reaches its earned division while preserving the original pinned real slot');
    check(JSON.stringify(expected.effectiveClubs) === JSON.stringify(expected.realClubs) && new Set(expected.effectiveClubs).size === expected.realClubs.length, 'Every real club remains in exactly one configured world slot');
    const header = page.locator('[data-cm-hub] header');
    check((await header.innerText()).includes(`${expected.seasonLabel} · Season ${after.season}`) && (await header.innerText()).includes(after.customClub.stadium), 'Actual hub preserves the season and created stadium identity');
    await capture(header.getByRole('heading', { name: fixture.clubName, exact: true }), 'promoted-hub', false);
    check((await tile('League').innerText()).includes(expected.league.name), 'Actual League tile names the newly earned division');
    await activate(tile('League'), 'league-control'); await page.locator('[data-world-tables]').waitFor();
    const table = page.locator('[data-world-tables]');
    check(await table.getByRole('heading', { name: expected.league.name, exact: true }).isVisible(), 'Actual own-league table uses the promoted division');
    const tableRows = async () => table.locator('[data-club]').evaluateAll(nodes => nodes.map(node => {
      const spans = [...node.children].map(child => child.textContent.trim()), [gf, ga] = node.querySelector('[data-goals]').getAttribute('data-goals').split('-').map(Number);
      if (spans[1] !== node.getAttribute('data-club')) throw new Error('The visible club name disagrees with the actual membership');
      if (spans[5] !== `${gf}-${ga}` || Number(spans[6]) !== gf - ga) throw new Error('The visible goal columns disagree with the actual goals');
      return { club: spans[1], w: Number(spans[2]), d: Number(spans[3]), l: Number(spans[4]), gf, ga, pts: Number(spans[7]) };
    }));
    assert.deepEqual(await tableRows(), expected.rows); row.checks.push({ ok: true, message: 'All actual table names, order and numeric columns match the complete new-division table' });
    if (!report.controls.includes('table-membership')) {
      const first = table.locator('[data-club]').first(), name = await first.getAttribute('data-club');
      await first.evaluate(node => node.setAttribute('data-club', 'unknown-membership-control'));
      await assert.rejects(tableRows, /visible club name disagrees/, 'Changing an actual table membership is detected');
      await first.evaluate((node, value) => node.setAttribute('data-club', value), name); assert.deepEqual(await tableRows(), expected.rows);
      report.controls.push('table-membership');
    }
    const ownRow = table.locator('[data-club]').filter({ has: page.getByText(fixture.clubName, { exact: true }) });
    await capture(ownRow, 'promoted-table');
    await activate(page.getByRole('tab', { name: 'Home', exact: true }), 'home-control');
    await activate(tile('Calendar'), 'calendar-control'); await page.locator('[data-testid="cm-calendar-grid"]').waitFor();
    const day = expected.firstLeague; assert(day && after.leagueClubs.includes(day.opponent) && day.opponent !== fixture.proxy && day.opponent !== fixture.clubName);
    row.calendarFixture = day;
    const dateButton = page.getByRole('button', { name: `${expected.dateLabel}: ${day.home ? 'vs' : 'at'} ${day.opponent} · ${day.compLabel}`, exact: true });
    for (let tries = 0; await dateButton.count() === 0 && tries < 12; tries++) await activate(page.getByRole('button', { name: 'Next month', exact: true }), `calendar-month-${tries}`);
    await activate(dateButton, 'first-league-fixture-control');
    const strip = page.locator('[data-testid="cm-calendar-day"]');
    check((await strip.innerText()).includes(`${day.home ? 'vs' : 'at'} ${day.opponent} · ${day.compLabel}`), 'Actual new-season calendar opens the correct new-division opponent, venue and competition');
    await capture(strip, 'promoted-calendar');
    await activate(page.getByRole('button', { name: 'Club home', exact: true }), 'calendar-back-control');
    await activate(tile('Cups'), 'cups-control');
    const panel = page.getByRole('button', { name: 'Club home', exact: true }).locator('..');
    await panel.getByText('Champions League', { exact: false }).first().waitFor();
    check((await panel.innerText()).includes(expected.league.cupName), 'Actual domestic cup panel uses the promoted division cup');
    check(after.uclGroup === null && (await panel.innerText()).includes('No European football this season'), 'An earned second-tier promotion does not award immediate Champions League qualification');
    await capture(panel.getByText('No European football this season', { exact: false }), 'promoted-cups', false);
    check(await bytes() === saved, 'Read-only table, calendar and cup inspections preserve every saved byte');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await activate(page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }), 'reload-resume-control');
    await page.locator('[data-cm-hub]').waitFor();
    sameState(await read(), after, id, 'reloaded');
    check(await bytes() === saved, 'Reload restores the identical complete promoted career and serialized bytes');
    await capture(page.locator('[data-cm-hub] header').getByRole('heading', { name: fixture.clubName, exact: true }), 'reloaded-hub', false);
    check(await page.locator('[data-testid="cm-save-failed"]').count() === 0, 'No save failure notice appears');
    check(await page.evaluate(() => localStorage.getItem('unrelated-career-save')) === '{"keep":"exact"}', 'Unrelated career bytes are untouched');
    check(row.errors.length === 0 && row.assetErrors.length === 0, 'No page errors or failed built assets');
  } catch (error) { report.failed++; row.error = String(error.stack || error); console.error(`${id}: ${error.message?.split('\n')[0] || error}`); }
  finally { await context.close(); write(id, row); }
}
try {
  await ready; browser = await pw.chromium.launch({ headless: true });
  oracleContext = await browser.newContext({ serviceWorkers: 'block' });
  await oracleContext.route('**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' }));
  await oracleContext.routeWebSocket('**/*', socket => socket.close());
  oracle = await oracleContext.newPage(); await oracle.goto(`${BASE}/manager-promotion-oracle`);
  for (const [width, height] of [[390, 844], [1280, 900]]) for (const fixture of cases) await journey(fixture, width, height);
  assert.equal(report.cases.length, 10);
} catch (error) { report.failed++; report.error = String(error.stack || error); console.error(report.error); }
finally {
  await oracleContext?.close(); await browser?.close(); server.kill();
  report.sourceAfter = sourceHashes();
  try { assert.deepEqual(report.sourceAfter, report.sourceBefore, 'The app and proof source bytes remain unchanged throughout the browser run'); }
  catch (error) { report.failed++; report.sourceError = String(error); }
  write('report', report);
}
console.log(`playManagerCustomPromotion: ${report.cases.length} genuine promotion journeys, ${report.cases.reduce((sum, row) => sum + row.checks.length, 0)} checks, ${report.failed} failed, ${report.forwardedExternalRequests} external requests forwarded`);
process.exit(report.failed ? 1 : 0);
