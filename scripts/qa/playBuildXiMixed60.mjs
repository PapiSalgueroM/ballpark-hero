import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const BASE = process.env.XI_MIXED_BASE, OUT = process.env.XI_MIXED_BROWSER_OUT;
const SPEC = 'qa/build-xi-mixed60/SOURCE.json', SELF = 'scripts/qa/playBuildXiMixed60.mjs';
const CLUB = 'Borussia Mönchengladbach', KEEPER = 'QA Fixture Keeper', MIDFIELDER = 'QA Fixture Midfielder';
const sha = body => createHash('sha256').update(body).digest('hex');
const check = (value, marker) => assert.ok(value, marker);
function regular(file) { const s = fs.lstatSync(file); check(s.isFile() && !s.isSymbolicLink(), 'MIXED_BROWSER_REGULAR'); return fs.readFileSync(file); }
function pin(file) { const b = regular(file); return { bytes: b.length, sha256: sha(b), git: createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + b.length + '\0'), b])).digest('hex') }; }
check(process.argv.length === 2 && fs.realpathSync(process.cwd()) === ROOT, 'MIXED_BROWSER_INVOCATION');
check(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'MIXED_BROWSER_OFFLINE_CI');
check((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'MIXED_BROWSER_OFFLINE_PRELOAD');
check(BASE === 'http://127.0.0.1:4173', 'MIXED_BROWSER_LOCAL_BASE');
check(OUT && path.isAbsolute(OUT) && !fs.existsSync(OUT), 'MIXED_BROWSER_FRESH_OUT');
const relative = path.relative(ROOT, OUT);
check(relative && (relative.startsWith('..' + path.sep) || path.isAbsolute(relative)), 'MIXED_BROWSER_OUTSIDE_SOURCE');
check(!process.env.SIM_SEED && !process.env.BYXI_CONTROL && !process.env.BYXI_SEED, 'MIXED_BROWSER_NO_INHERITED_CONTROL');
const transport = process.env.SIM_OFFLINE_RECEIPT;
const emptyTransport = () => check(transport && path.isAbsolute(transport) && regular(transport).length === 0, 'MIXED_BROWSER_EMPTY_TRANSPORT');
emptyTransport();
const specBytes = regular(SPEC), spec = JSON.parse(specBytes);
check(spec.bound === true && spec.phase === 'all-pass' && spec.browser?.bound === true, 'MIXED_BROWSER_UNBOUND');
check(spec.browser.profiles === 3 && spec.browser.screenshots === 6 && spec.browser.copiedControls === 3, 'MIXED_BROWSER_COUNTS');
const prerequisite = spec.browser.baselinePrerequisite;
check(prerequisite && /^\d+$/.test(String(prerequisite.run)) && /^[a-f0-9]{40}$/.test(prerequisite.head)
  && /^[a-f0-9]{64}$/.test(prerequisite.rootAdmissionSHA256) && /^[a-f0-9]{64}$/.test(prerequisite.custodianAdmissionSHA256), 'MIXED_BROWSER_BASELINE_PREREQUISITE');
const source = () => {
  const rows = spec.pins.map(p => {
    const actual = pin(path.join(ROOT, p.path)); assert.equal(actual.git, p.git || p.gitBlob, 'MIXED_BROWSER_SOURCE:' + p.path); assert.equal(actual.bytes, p.bytes);
    if (p.sha256) assert.equal(actual.sha256, p.sha256);
    return { path: p.path, ...actual };
  });
  rows.push({ path: SPEC, ...pin(SPEC) }, { path: SELF, ...pin(SELF) }); return rows;
};
const sourceBefore = source();
const CACHE = process.env.FREE_KICK_FONT_CACHE;
check(CACHE && path.isAbsolute(CACHE), 'MIXED_BROWSER_FONT_CACHE');
const fontManifest = regular(path.join(CACHE, 'manifest.json')), fonts = JSON.parse(fontManifest), fontByURL = new Map();
check(Array.isArray(fonts) && fonts.length > 0, 'MIXED_BROWSER_FONT_MANIFEST');
for (const f of fonts) {
  check(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(f.url).origin) && /^[a-f0-9]{64}$/.test(f.file), 'MIXED_BROWSER_FONT_PATH');
  const body = regular(path.join(CACHE, f.file)); check(sha(body) === f.sha256 && !fontByURL.has(f.url), 'MIXED_BROWSER_FONT_PIN');
  fontByURL.set(f.url, { ...f, body });
}
fs.mkdirSync(OUT);
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const fixture = [
  { player_name: KEEPER, name_folded: 'qa fixture keeper', club: CLUB, nationality: 'QA', position: 'Goalkeeper', year: 2026, age: 24, market_value_usd: 100000 },
  { player_name: MIDFIELDER, name_folded: 'qa fixture midfielder', club: CLUB, nationality: 'QA', position: 'Central Midfield', year: 2026, age: 24, market_value_usd: 100000 },
];
const report = { schema: 1, status: 'running', source: process.env.GITHUB_SHA, selectorSHA256: sha(specBytes), prerequisite, sourceBefore,
  fixture: { scope: 'Explicit fictional transport rows only. Real autocomplete, Page, Hook, local record and position authority. No real roster, DB or deployed Edge proof.', rows: fixture },
  scope: 'Three fresh UI rounds, one refused outfield pick in GK and one accepted GK per round. No saved-round/reload, complete-XI, all-club gameplay, all-fold, all-touch-target or global qualification claim.',
  callerHoldsRequired: 'Outer workflow must inventory and hold complete built dist and complete font cache including extra files before and after. This helper holds selected source, font manifest and listed font bodies only.',
  cases: [], copiedControls: [], screenshots: [], errors: [] };
const scroll = page => page.evaluate(() => ({ x: scrollX, y: scrollY, rootTop: document.documentElement.scrollTop, bodyTop: document.body.scrollTop }));
const layout = page => page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), fontStatus: document.fonts.status,
  failedFonts: [...document.fonts].filter(f => f.status === 'error').map(f => f.family), bodyFont: getComputedStyle(document.body).fontFamily }));
async function stable(locator) {
  await locator.waitFor({ state: 'visible' });
  return locator.evaluate(el => new Promise((resolve, reject) => {
    const start = performance.now(); let previous = '', frames = 0;
    const frame = () => {
      const r = el.getBoundingClientRect(), text = JSON.stringify([r.x, r.y, r.width, r.height, scrollX, scrollY, innerWidth, innerHeight]);
      const finite = document.getAnimations().filter(a => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime));
      frames = text === previous && document.fonts.status === 'loaded' && finite.length === 0 ? frames + 1 : 0; previous = text;
      if (frames >= 4) return resolve(true);
      if (performance.now() - start > 8000) return reject(new Error('MIXED_BROWSER_GEOMETRY_UNSETTLED'));
      requestAnimationFrame(frame);
    }; requestAnimationFrame(frame);
  }));
}
async function measure(locator) {
  return locator.evaluate(el => {
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, hit = document.elementFromPoint(x, y), style = getComputedStyle(el);
    return { connected: el.isConnected, enabled: !el.disabled, painted: hit === el || el.contains(hit), display: style.display, visibility: style.visibility,
      rect: { x: r.x, y: r.y, width: r.width, height: r.height, left: r.left, right: r.right, top: r.top, bottom: r.bottom }, viewport: { width: innerWidth, height: innerHeight },
      scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, text: (el.innerText || el.getAttribute('aria-label') || '').trim() };
  });
}
function judgeTarget(o) {
  check(o.connected && o.enabled && o.rect.width > 0 && o.rect.height > 0 && o.visibility === 'visible' && o.display !== 'none', 'MIXED_BROWSER_ACTION_VISIBLE');
  check(o.rect.left >= -0.5 && o.rect.right <= o.viewport.width + 0.5 && o.rect.top >= -0.5 && o.rect.bottom <= o.viewport.height + 0.5, 'MIXED_BROWSER_ACTION_VIEW');
  check(o.painted, 'MIXED_BROWSER_ACTION_OCCLUDED');
}
async function prepare(page, locator, row, name) {
  const before = await scroll(page); await locator.scrollIntoViewIfNeeded(); await stable(locator);
  row.preparations.push({ name, scope: 'Driver scroll preparation before actual activation, not app no-jump evidence', before, after: await scroll(page) });
}
async function pointer(page, locator, row, name) {
  await prepare(page, locator, row, name); const observed = await measure(locator); judgeTarget(observed);
  row.actions.push({ name, observed, existingBelow30: observed.rect.width < 30 || observed.rect.height < 30, before: await scroll(page) });
  const x = observed.rect.x + observed.rect.width / 2, y = observed.rect.y + observed.rect.height / 2;
  if (row.mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
  row.actions.at(-1).after = await scroll(page); return observed;
}
async function capture(page, row, name) {
  const file = row.width + '-' + name + '.png'; const state = { layout: await layout(page), scroll: await scroll(page), text: (await page.locator('body').innerText()).slice(0, 16000) };
  check(state.layout.scrollWidth <= state.layout.width + 1, 'MIXED_BROWSER_HORIZONTAL_OVERFLOW');
  check(state.layout.fontStatus === 'loaded' && state.layout.failedFonts.length === 0, 'MIXED_BROWSER_FONTS');
  await page.screenshot({ path: path.join(OUT, file), fullPage: false }); const binding = { file, ...pin(path.join(OUT, file)), state };
  row.screenshots.push(binding); report.screenshots.push({ profile: row.width, ...binding });
}
function judgeResult(value) {
  check(value.filled === 1 && value.wrongFilled === 0 && value.keeperText.includes(KEEPER) && value.club === CLUB, 'MIXED_BROWSER_ONE_ACCEPTED_GK');
  check(value.layout.scrollWidth <= value.layout.width + 1, 'MIXED_BROWSER_HORIZONTAL_OVERFLOW'); judgeTarget(value.action);
}
function copied(id, seed, mutate, marker) {
  const file = path.join(OUT, 'copied-' + id + '.json'), bytes = Buffer.from(JSON.stringify(seed)); fs.writeFileSync(file, bytes, { flag: 'wx' });
  judgeResult(JSON.parse(regular(file))); const value = JSON.parse(regular(file)); mutate(value); const changed = Buffer.from(JSON.stringify(value)); check(sha(changed) !== sha(bytes), 'MIXED_BROWSER_COPY_CHANGED'); fs.writeFileSync(file, changed);
  let error; try { judgeResult(JSON.parse(regular(file))); } catch (caught) { error = caught; }
  check(error?.name === 'AssertionError' && error.message.includes(marker), 'MIXED_BROWSER_COPY_SPECIFIC');
  fs.writeFileSync(file, bytes); check(sha(regular(file)) === sha(bytes), 'MIXED_BROWSER_COPY_RESTORED'); judgeResult(JSON.parse(regular(file)));
  return { id, scope: 'DERIVED COPIED observation only, not a physical app fault or screenshot', marker, changed: true, sameCopy: true, beforeSHA256: sha(bytes), changedSHA256: sha(changed), restoredSHA256: sha(regular(file)), error: { name: error.name, message: error.message } };
}
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] }); report.browser = { name: browser.browserType().name(), version: browser.version() };
let primary;
try {
  for (const profile of [{ width: 320, height: 760, mobile: true }, { width: 390, height: 844, mobile: true }, { width: 1440, height: 900, mobile: false }]) {
    const row = { ...profile, status: 'running', preparations: [], actions: [], requests: [], routeErrors: [], consoleErrors: [], pageErrors: [], failedRequests: [], screenshots: [] }; report.cases.push(row);
    let context, page;
    try {
      context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.mobile, hasTouch: profile.mobile, deviceScaleFactor: 1, colorScheme: 'dark', reducedMotion: 'no-preference', serviceWorkers: 'block' });
      await context.routeWebSocket('**/*', route => { row.routeErrors.push({ websocket: route.url(), action: 'closed_without_connection' }); route.close({ code: 1008, reason: 'Offline fixture' }); });
      await context.addInitScript(() => { Math.random = () => 0.5; localStorage.setItem('lineup-rules-seen', '1'); localStorage.setItem('cookie-consent', 'essential'); });
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url()), observed = { method: request.method(), url: url.href, action: null }; row.requests.push(observed);
        try {
          if (url.origin === BASE) { observed.action = 'local'; return route.continue(); }
          const font = fontByURL.get(url.href);
          if (font && request.method() === 'GET') { observed.action = 'pinned-font'; observed.sha256 = font.sha256; return route.fulfill({ status: 200, body: font.body, contentType: font.contentType, headers: { 'access-control-allow-origin': '*' } }); }
          const tables = ['/rest/v1/player_market_values', '/rest/v1/player_verified_positions', '/rest/v1/national_team_squads', '/rest/v1/live_scores'];
          check(url.origin === 'https://flawuiqbvjobmkfkauhw.supabase.co' && tables.includes(url.pathname), 'MIXED_BROWSER_UNKNOWN_NETWORK');
          const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,OPTIONS', 'access-control-allow-headers': request.headers()['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info,accept-profile,prefer' };
          if (request.method() === 'OPTIONS') { check(request.headers()['access-control-request-method'] === 'GET', 'MIXED_BROWSER_READ_ONLY_PREFLIGHT'); observed.action = 'fixture-preflight'; return route.fulfill({ status: 204, body: '', headers }); }
          check(request.method() === 'GET', 'MIXED_BROWSER_READ_ONLY'); let data = [];
          if (url.pathname === '/rest/v1/player_market_values') {
            check(url.searchParams.get('club') === 'in.("' + CLUB + '")' || url.searchParams.get('club') === 'in.(' + CLUB + ')', 'MIXED_BROWSER_EXACT_NEW_CLUB_FILTER');
            check(!url.searchParams.has('nationality') && !url.searchParams.has('year'), 'MIXED_BROWSER_MIXED_ONLY_QUERY');
            data = fixture.slice(); const search = url.searchParams.get('name_folded');
            if (search !== null) { check(/^ilike\.%.*%$/.test(search), 'MIXED_BROWSER_SEARCH_QUERY'); const term = search.slice(7, -1).toLowerCase(); data = data.filter(p => p.name_folded.includes(term)); }
            const limit = Number(url.searchParams.get('limit')); check(Number.isInteger(limit) && limit > 0 && limit <= 1000, 'MIXED_BROWSER_BOUNDED_QUERY'); data = data.slice(0, limit); observed.club = CLUB; observed.names = data.map(p => p.player_name);
          } else if (url.pathname === '/rest/v1/player_verified_positions') check(url.searchParams.get('player_name') === 'ilike.' + MIDFIELDER, 'MIXED_BROWSER_HISTORY_NAME');
          else if (url.pathname === '/rest/v1/national_team_squads') check(url.searchParams.get('country') === 'eq.Brazil', 'MIXED_BROWSER_KNOWN_RANKING_ONLY');
          observed.action = 'explicit-fictional-read-only'; observed.bodySHA256 = sha(JSON.stringify(data));
          return route.fulfill({ status: 200, body: JSON.stringify(data), contentType: 'application/json', headers });
        } catch (error) { observed.action = 'aborted-unexpected'; row.routeErrors.push({ url: url.href, name: error.name, message: error.message }); await route.abort('blockedbyclient'); }
      });
      page = await context.newPage(); page.setDefaultTimeout(12000);
      page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
      page.on('pageerror', error => row.pageErrors.push({ name: error.name, message: error.message, stack: error.stack }));
      page.on('requestfailed', request => row.failedRequests.push({ url: request.url(), failure: request.failure() }));
      await page.goto(BASE + '/build-your-xi', { waitUntil: 'domcontentloaded' }); await page.evaluate(() => document.fonts.ready);
      await pointer(page, page.getByRole('button', { name: /^4-3-3\b/ }), row, 'choose actual4-3-3');
      const reroll = page.getByTitle('Reroll: get a different team'); await pointer(page, reroll, row, 'reroll actualMixed');
      const club = page.getByText(CLUB, { exact: true }); await club.waitFor({ state: 'visible' }); await reroll.waitFor({ state: 'visible' }); await stable(club);
      const hint = page.getByText('Name a player who has played for ' + CLUB, { exact: true }); row.clubLabel = await measure(club); row.clubHint = await measure(hint);
      await prepare(page, hint, row, 'newclub screenshot stop'); await capture(page, row, 'new-club');
      await pointer(page, page.getByRole('button', { name: 'GK', exact: true }), row, 'select actualGK');
      const input = page.getByRole('combobox', { name: 'Search a ' + CLUB + ' player...' });
      await input.fill(MIDFIELDER); const wrong = page.getByRole('option', { name: new RegExp('^' + MIDFIELDER) }); await pointer(page, wrong, row, 'select fictionaloutfield row atGK');
      await page.getByText(MIDFIELDER + ' plays CM, not in goal. Pick a keeper for this slot.', { exact: true }).waitFor({ state: 'visible' });
      const refusedProgress = page.getByText('0/11', { exact: true }); check(await refusedProgress.isVisible(), 'MIXED_BROWSER_WRONG_PICK_REFUSED'); row.wrongFilled = Number((await refusedProgress.innerText()).split('/')[0]);
      await input.fill(KEEPER); const option = page.getByRole('option', { name: new RegExp('^' + KEEPER) }); const acceptedAction = await pointer(page, option, row, 'select fictionalkeeper row atGK');
      await page.getByText('1/11', { exact: true }).waitFor({ state: 'visible' }); await reroll.waitFor({ state: 'visible' });
      const filled = page.getByRole('button', { name: /^GK\s+QA Fixture Keeper$/ }); check(await filled.isDisabled(), 'MIXED_BROWSER_GK_SLOT_LOCKED');
      row.result = { filled: Number((await page.getByText('1/11', { exact: true }).innerText()).split('/')[0]), wrongFilled: row.wrongFilled, keeperText: await filled.innerText(), club: row.clubLabel.text, layout: await layout(page), action: acceptedAction };
      judgeResult(row.result); check(row.requests.filter(r => r.url.includes('/functions/v1/validate-player')).length === 0, 'MIXED_BROWSER_LOCAL_RECORD_NO_VALIDATOR');
      check(row.requests.some(r => r.club === CLUB && r.names?.includes(KEEPER)) && row.requests.some(r => r.club === CLUB && r.names?.includes(MIDFIELDER)), 'MIXED_BROWSER_REAL_SEARCH_TRANSPORT');
      await prepare(page, filled, row, 'filledGK screenshot stop'); await capture(page, row, 'filled-gk'); row.result.finalLayout = await layout(page);
      check(row.routeErrors.length === 0 && row.pageErrors.length === 0 && row.consoleErrors.length === 0 && row.failedRequests.length === 0, 'MIXED_BROWSER_ERRORS_OR_UNKNOWN');
      row.status = 'passed'; write(row.width + '-case.json', row);
    } catch (error) {
      row.status = 'failed'; row.error = { name: error.name, message: error.message, stack: error.stack };
      if (page) { try { fs.writeFileSync(path.join(OUT, row.width + '-failure.html'), await page.content()); await page.screenshot({ path: path.join(OUT, row.width + '-failure.png'), fullPage: false }); row.failureState = { layout: await layout(page), scroll: await scroll(page) }; } catch (captureError) { row.captureError = { name: captureError.name, message: captureError.message }; } }
      write(row.width + '-case.json', row); throw error;
    } finally { if (context) await context.close(); }
  }
  const seed = report.cases[0].result;
  report.copiedControls = [copied('filled-count', seed, o => { o.filled = 0; }, 'MIXED_BROWSER_ONE_ACCEPTED_GK'), copied('horizontal-overflow', seed, o => { o.layout.scrollWidth = o.layout.width + 64; }, 'MIXED_BROWSER_HORIZONTAL_OVERFLOW'), copied('occluded-action', seed, o => { o.action.painted = false; }, 'MIXED_BROWSER_ACTION_OCCLUDED')];
  assert.deepEqual(source(), sourceBefore, 'MIXED_BROWSER_SOURCE_HELD'); check(sha(regular(SPEC)) === sha(specBytes), 'MIXED_BROWSER_SELECTOR_HELD');
  check(sha(regular(path.join(CACHE, 'manifest.json'))) === sha(fontManifest), 'MIXED_BROWSER_FONT_MANIFEST_HELD'); for (const f of fonts) check(sha(regular(path.join(CACHE, f.file))) === f.sha256, 'MIXED_BROWSER_FONT_HELD');
  emptyTransport(); check(report.cases.length === 3 && report.cases.every(r => r.status === 'passed') && report.screenshots.length === 6 && report.copiedControls.length === 3, 'MIXED_BROWSER_COMPLETE_COUNTS'); report.status = 'passed';
} catch (error) { primary = error; report.status = 'failed'; report.errors.push({ name: error.name, message: error.message, stack: error.stack }); }
finally { await browser.close(); write('report.json', report); }
if (primary) throw primary;
console.log('Mixed60 browser:3profiles/3wrongpositionrefusals/3acceptedGK/6normalPNGs/3COPIEDguards/sourceheld');
