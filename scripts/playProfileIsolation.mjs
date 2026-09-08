/** Round 522: real built Profile navigation and timer isolation.
 * PROFILE_ISOLATION_BASE defaults to the loopback preview on port 4196.
 * PROFILE_ISOLATION_WIDTHS=390,1440; unit tests own the full race/control matrix.
 * All backend requests are exact local fixtures. Only one expected B minute
 * upsert per timer case is locally fulfilled; every other write fails closed.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from './lib/playwrightLoader.mjs';

const BASE = new URL(process.env.PROFILE_ISOLATION_BASE || 'http://127.0.0.1:4196');
assert.ok(['http:', 'https:'].includes(BASE.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(BASE.hostname)
  && !BASE.username && !BASE.password && BASE.pathname === '/' && !BASE.search && !BASE.hash, 'Expected a loopback HTTP(S) origin');
const WIDTHS = (process.env.PROFILE_ISOLATION_WIDTHS || '390,1440').split(',').map(Number);
assert.ok(WIDTHS.length && new Set(WIDTHS).size === WIDTHS.length && WIDTHS.every(w => [390, 1440].includes(w)), 'Unknown or repeated viewport');
const BACKEND = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const NOW = '2026-09-08T16:00:00.000Z';
const A = '00000000-0000-4000-8000-00000000522a';
const B = '00000000-0000-4000-8000-00000000522b';
const AUTH_KEY = 'sb-flawuiqbvjobmkfkauhw-auth-token';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-profile-isolation-'));
const results = [];
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const user = { id: B, aud: 'authenticated', role: 'authenticated', email: 'profile-b@example.invalid',
  email_confirmed_at: NOW, confirmed_at: NOW, created_at: NOW, updated_at: NOW,
  app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, identities: [] };
const expires = Date.parse(NOW) / 1000 + 86400;
const session = { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: B, aud: 'authenticated', role: 'authenticated', exp: expires })}.synthetic-signature`,
  refresh_token: 'synthetic-profile-refresh', token_type: 'bearer', expires_in: 86400, expires_at: expires, user };
const profile = id => ({ id: `profile-${id}`, user_id: id, username: id === A ? 'fixture-a' : 'fixture-b',
  display_name: id === A ? 'Fixture A' : 'Fixture B', avatar_url: null, streak_state: null, created_at: NOW, updated_at: NOW });
const signature = params => JSON.stringify([...params].sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv)));
const matches = (url, params) => signature(url.searchParams) === signature(new URLSearchParams(params));
const main = page => page.locator('#root #dukb-main');
const stat = (page, label) => main(page).getByText(label, { exact: true }).locator('..').locator('p').first();
function gate() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
}
async function until(predicate, message) {
  const deadline = Date.now() + 10000;
  while (!predicate() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
  assert.ok(predicate(), message);
}
function healthy(state) {
  assert.deepEqual(state.violations, [], 'Unexpected backend request or write');
  assert.deepEqual(state.runtime, [], 'Browser runtime or local asset failure');
}

async function isolated(browser, kind, width) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 },
    isMobile: width === 390, hasTouch: width === 390, locale: 'en-US', serviceWorkers: 'block' });
  const state = { kind, width, requests: [], violations: [], runtime: [], blocked: [], writes: [], screenshots: [],
    liveWindows: [], allowMinute: false, lookupHeld: 0, lookupReleased: 0, prefsHeld: 0, prefsReleased: 0 };
  const lookup = gate(), prefs = gate();
  let page;
  await context.routeWebSocket('**/*', socket => {
    state.violations.push(`Unexpected WebSocket ${socket.url()}`);
    socket.close();
  });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const fail = reason => { state.violations.push(reason); return route.abort('blockedbyclient'); };
    const json = (data, count, status = 200) => route.fulfill({ status, contentType: 'application/json',
      headers: { 'access-control-allow-origin': BASE.origin, 'access-control-expose-headers': 'content-range',
        ...(count === undefined ? {} : { 'content-range': count ? `0-${count - 1}/${count}` : '*/0' }) },
      body: method === 'HEAD' ? '' : JSON.stringify(data) });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      let body;
      try { body = request.postDataJSON(); } catch { /* Invalid bodies stay blocked. */ }
      const allowed = url.origin === BACKEND && url.pathname === '/rest/v1/user_preferences' && method === 'POST'
        && matches(url, { on_conflict: 'user_id' }) && state.allowMinute && state.writes.length === 0
        && body && !Array.isArray(body) && Object.keys(body).sort().join(',') === 'time_spent_minutes,updated_at,user_id'
        && body.user_id === B && body.time_spent_minutes === 1 && Number.isFinite(Date.parse(body.updated_at));
      if (!allowed) return fail(`Blocked unexpected write ${method} ${url.origin}${url.pathname} ${JSON.stringify(body)}`);
      state.writes.push(body);
      return json([]);
    }
    if (url.origin === BASE.origin && method !== 'OPTIONS') return route.continue();
    if (url.origin !== BACKEND) {
      state.blocked.push(url.href);
      if (url.hostname.endsWith('.supabase.co')) return fail(`Unexpected backend ${url.href}`);
      return route.abort('blockedbyclient');
    }
    state.requests.push(`${method} ${url.pathname}?${url.searchParams}`);
    const is = (table, verb, params) => url.pathname === `/rest/v1/${table}` && method === verb && matches(url, params);
    if (url.pathname === '/auth/v1/user' && method === 'GET' && !url.search) return json(user);
    if (is('profiles', 'GET', { select: '*', user_id: `eq.${B}` })) return json([profile(B)]);
    if (is('profiles', 'GET', { select: '*', username: 'eq.fixture-a' })) {
      if (kind === 'late-lookup') {
        state.lookupHeld++;
        await lookup.promise;
        await json([]);
        state.lookupReleased++;
        return;
      }
      return json([profile(A)]);
    }
    for (const id of [A, B]) {
      const byUser = { user_id: `eq.${id}` }, populated = id === A;
      if (is('user_scores', 'GET', { select: 'current_streak,longest_streak,total_points', ...byUser })) {
        return json(populated ? [{ current_streak: 7, longest_streak: 9, total_points: 7770 }] : []);
      }
      if (is('user_game_scores', 'HEAD', { select: '*', ...byUser }) && request.headers().prefer?.includes('count=exact')) return json(null, populated ? 10 : 0);
      if (is('user_game_scores', 'GET', { select: 'game_type,score,created_at', ...byUser, order: 'created_at.desc', limit: '5' })) {
        return json(populated ? [{ game_type: 'soccer-grid', score: 123, created_at: NOW }] : []);
      }
      if (is('user_game_scores', 'GET', { select: 'game_type', ...byUser })) return json(populated ? [{ game_type: 'soccer-grid' }] : []);
      if (is('user_best_scores', 'GET', { select: '*', ...byUser, order: 'best_score.desc' })) return json(populated ? [{ game_type: 'soccer-grid', best_score: 456, achieved_at: NOW }] : []);
      if (is('saved_brackets', 'GET', { select: 'id,bracket_data', ...byUser, limit: '1' })) {
        return json(populated ? [{ id: 'synthetic-a-bracket', bracket_data: { awards: { champion: 'Synthetic A Champion' } } }] : []);
      }
      if (is('daily_completions', 'GET', { select: 'game_slug', ...byUser, date: 'eq.2026-09-08' })) return json(populated ? [{ game_slug: 'soccer-grid' }] : []);
      if (is('user_preferences', 'GET', { select: '*', ...byUser })) {
        if (!populated && kind === 'prefs-error') return json({ code: 'FIXTURE_UNAVAILABLE',
          message: 'Synthetic preferences failure', details: null, hint: null }, undefined, 503);
        if (!populated && kind === 'slow-prefs') {
          state.prefsHeld++;
          await prefs.promise;
          await json([]);
          state.prefsReleased++;
          return;
        }
        return json(populated ? [{ user_id: A, favourite_game: 'soccer-grid', favourite_team: 'Synthetic A Club',
          favourite_player: 'Synthetic A Player', time_spent_minutes: 777, updated_at: NOW }] : []);
      }
    }
    if (is('user_scores', 'HEAD', { select: '*', total_points: 'gt.7770' }) && request.headers().prefer?.includes('count=exact')) return json(null, 0);
    if (is('game_completions', 'GET', { select: 'game,completed_on', player_name: 'eq.Fixture B', order: 'completed_on.desc', limit: '500' })) return json([]);
    if (url.pathname === '/rest/v1/live_scores' && method === 'GET') {
      const bounds = url.searchParams.getAll('start_at');
      const from = bounds.find(value => value.startsWith('gte.'))?.slice(4);
      const to = bounds.find(value => value.startsWith('lte.'))?.slice(4);
      const requestedNow = Date.parse(from) + 12 * 3600000;
      const actualNow = await page.evaluate(() => Date.now());
      const live = new URLSearchParams({ select: '*', order: 'start_at.asc,id.asc', limit: '200', offset: '0' });
      live.append('start_at', `gte.${from}`); live.append('start_at', `lte.${to}`);
      // Clock install runs during startup. Only its bounded millisecond drift
      // is flexible; both window ends, all query fields and their pairing are exact.
      if (bounds.length === 2 && matches(url, live) && Number.isFinite(requestedNow)
        && new Date(requestedNow - 12 * 3600000).toISOString() === from
        && new Date(requestedNow + 20 * 3600000).toISOString() === to
        && requestedNow >= Date.parse(NOW) && requestedNow <= Date.parse(NOW) + 180000
        && actualNow - requestedNow >= 0 && actualNow - requestedNow <= 2000) {
        state.liveWindows.push({ requestedNow, actualNow });
        return json([]);
      }
    }
    return fail(`Unexpected backend ${method} ${url.href}`);
  });
  await context.addInitScript(({ origin, key, auth }) => {
    if (location.origin !== origin) return;
    localStorage.setItem(key, JSON.stringify(auth));
    localStorage.setItem('cookie-consent', 'essential');
    localStorage.setItem('dukb-guest-handle', 'Fixture B');
    localStorage.setItem('dukb-streaks-v1', JSON.stringify({ version: 1, global: { current: 0, longest: 0, lastDate: null },
      perGame: {}, loginDates: ['2026-09-08'], totalPlays: 0, totalPoints: 0 }));
  }, { origin: BASE.origin, key: AUTH_KEY, auth: session });
  page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => state.runtime.push(error.message));
  page.on('requestfailed', request => {
    if (new URL(request.url()).origin === BASE.origin) state.runtime.push(`${request.failure()?.errorText} ${request.url()}`);
  });
  page.on('response', response => {
    if (new URL(response.url()).origin === BASE.origin && response.status() >= 400) state.runtime.push(`HTTP ${response.status()} ${response.url()}`);
  });
  await page.clock.install({ time: new Date(NOW) });
  return { context, page, state, lookup, prefs };
}

async function ownMenu(page) {
  await page.getByRole('button', { name: 'Account menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'My Profile', exact: true }).click();
  await page.waitForURL(new URL('/profile', BASE).href);
}
async function pause(page) {
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
}
async function ownerClean(page, state, phase) {
  assert.equal(new URL(page.url()).pathname, '/profile', 'Old lookup must not redirect B');
  await main(page).getByRole('heading', { name: 'Fixture B', exact: true }).waitFor({ state: 'visible' });
  for (const [label, expected] of [['Total Points', '0'], ['Games Today', '0'], ['Time on profile', '0m'], ['Avg Score', 'Not yet']]) {
    assert.equal((await stat(page, label).textContent()).trim(), expected, `${phase}: B ${label} must not inherit A`);
  }
  assert.equal(await main(page).getByPlaceholder('e.g. Real Madrid').inputValue(), '', 'B team must be empty');
  assert.equal(await main(page).getByPlaceholder('e.g. Messi').inputValue(), '', 'B player must be empty');
  assert.equal((await main(page).getByRole('combobox').textContent()).trim(), 'Pick a game...', 'B favourite game must be empty');
  assert.equal(await main(page).getByRole('link', { name: 'View Bracket', exact: true }).count(), 0, 'B must not inherit A bracket');
  assert.equal(await main(page).getByText('No games played yet. Start playing to see your history!', { exact: true }).count(), 1, 'B recent games must be empty');
  assert.equal(await main(page).getByText('No scores yet. Start playing to track your best!', { exact: true }).count(), 1, 'B best scores must be empty');
  assert.equal(await main(page).getByText(/All-time rank #/).count(), 0, 'B must not inherit A rank');
  assert.equal(await main(page).getByText('Fav Sport', { exact: true }).count(), 0, 'B must not inherit A sport');
  const size = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(size.scroll <= size.client + 2, 'Profile must not create horizontal page overflow');
  healthy(state);
  console.log(`  PASS ${state.kind}-${state.width}-${phase}: B has only empty B data`);
}
async function minute(page, state) {
  state.allowMinute = true;
  await page.clock.runFor(60000);
  await until(() => state.writes.length === 1 || state.violations.length > 0, 'Expected one locally captured B minute write');
  healthy(state);
  assert.equal(state.writes.length, 1, 'Exactly one minute write');
  assert.equal(state.writes[0].user_id, B);
  assert.equal(state.writes[0].time_spent_minutes, 1);
  assert.equal((await stat(page, 'Time on profile').textContent()).trim(), '1m', 'B timer must start from B zero');
  console.log(`  PASS ${state.kind}-${state.width}-minute: locally captured B=1`);
}
async function unavailable(page, state) {
  await main(page).getByRole('heading', { name: 'Fixture B', exact: true }).waitFor({ state: 'visible' });
  const value = stat(page, 'Time on profile');
  assert.equal((await value.textContent()).trim(), 'Unavailable', 'Failed preferences must not display invented zero minutes');
  assert.ok(await main(page).getByText("Couldn't load your info. Refresh to try again.", { exact: true }).isVisible(), 'Preferences failure must explain retry');
  for (const field of [main(page).getByRole('combobox'), main(page).getByPlaceholder('e.g. Real Madrid'), main(page).getByPlaceholder('e.g. Messi')]) {
    assert.ok(await field.isDisabled(), 'Every preference control must be disabled after a failed read');
  }
  await value.scrollIntoViewIfNeeded();
  const measure = () => value.evaluate(element => {
    const card = element.parentElement.getBoundingClientRect();
    const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    const paragraphs = [...element.parentElement.querySelectorAll('p')].map(paragraph => {
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      const ink = range.getBoundingClientRect();
      const clip = { left: Math.max(0, card.left), right: Math.min(innerWidth, card.right),
        top: Math.max(headerBottom, card.top), bottom: Math.min(innerHeight, card.bottom) };
      for (let node = paragraph; node; node = node.parentElement) {
        const style = getComputedStyle(node), r = node.getBoundingClientRect();
        if (style.overflowX !== 'visible') { clip.left = Math.max(clip.left, r.left + node.clientLeft); clip.right = Math.min(clip.right, r.left + node.clientLeft + node.clientWidth); }
        if (style.overflowY !== 'visible') { clip.top = Math.max(clip.top, r.top + node.clientTop); clip.bottom = Math.min(clip.bottom, r.top + node.clientTop + node.clientHeight); }
      }
      return { text: paragraph.textContent, client: paragraph.clientWidth, scroll: paragraph.scrollWidth, clip,
        ink: { left: ink.left, right: ink.right, top: ink.top, bottom: ink.bottom },
        fits: ink.left >= clip.left - .5 && ink.right <= clip.right + .5 && ink.top >= clip.top - .5 && ink.bottom <= clip.bottom + .5 };
    });
    return { pageClient: document.documentElement.clientWidth, pageScroll: document.documentElement.scrollWidth,
      card: { left: card.left, right: card.right, top: card.top, bottom: card.bottom, width: card.width, height: card.height },
      headerBottom, viewportHeight: innerHeight, paragraphs };
  });
  const otherGeometryHealthy = g => g.pageScroll <= g.pageClient + 2 && g.card.left >= -.5 && g.card.right <= g.pageClient + .5
    && g.card.top >= g.headerBottom - .5 && g.card.bottom <= g.viewportHeight + .5
    && g.paragraphs.every((p, i, rows) => !i || rows[i - 1].ink.bottom <= p.ink.top + .5);
  const readable = g => otherGeometryHealthy(g) && g.paragraphs.every(p => p.fits);
  const geometry = await measure();
  state.unavailableGeometry = geometry;
  assert.ok(readable(geometry), `Unavailable must remain readable: ${JSON.stringify(geometry)}`);
  // Height-only control: unchanged widths, ink spacing and viewport bounds.
  // The exact failure must come from glyph clipping, never a content-box proxy.
  const card = value.locator('..'), previous = await card.getAttribute('style');
  try {
    await card.evaluate(element => { element.style.height = '40px'; element.style.overflow = 'hidden'; });
    assert.equal(await card.evaluate(element => getComputedStyle(element).overflow), 'hidden', 'Control must apply a real overflow clip');
    const clipped = await measure();
    state.clippingControl = clipped;
    assert.notEqual(clipped.card.height, geometry.card.height, 'Clipping control must change height');
    assert.equal(clipped.card.width, geometry.card.width, 'Clipping control must preserve width');
    assert.deepEqual(clipped.paragraphs.map(p => [p.client, p.scroll]), geometry.paragraphs.map(p => [p.client, p.scroll]), 'Clipping control must preserve horizontal layout');
    assert.ok(otherGeometryHealthy(clipped), 'Every non-clipping geometry conjunct must stay healthy');
    assert.ok(clipped.paragraphs.some(p => !p.fits), 'Control must actually clip glyphs');
    assert.throws(() => assert.ok(readable(clipped), 'Unavailable glyphs must fit actual clips'),
      { name: 'AssertionError', message: 'Unavailable glyphs must fit actual clips' });
    const screenshot = path.join(output, `${state.kind}-${state.width}-clipping-control.png`);
    await page.screenshot({ path: screenshot });
    state.screenshots.push(screenshot);
  } finally {
    await card.evaluate((element, style) => {
      if (style === null) element.removeAttribute('style'); else element.setAttribute('style', style);
    }, previous);
  }
  assert.ok(readable(await measure()), 'Restored failure value must be readable');
  console.log(`  PASS ${state.kind}-${state.width}-clipping-control: exact glyph-clipping assertion`);
  await pause(page);
  await page.clock.runFor(60000);
  healthy(state);
  assert.equal(state.writes.length, 0, 'Failed preferences must not enable minute writes');
  console.log(`  PASS ${state.kind}-${state.width}: disabled fields, readable failure and no minute write`);
}

console.log(`playProfileIsolation: ${BASE.origin}; widths=${WIDTHS}; artifacts=${output}`);
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) });
try {
  for (const width of WIDTHS) for (const kind of ['transition', 'late-lookup', 'slow-prefs', 'prefs-error']) {
    const fixture = await isolated(browser, kind, width);
    const { context, page, state, lookup, prefs } = fixture;
    try {
      await page.goto(new URL(['slow-prefs', 'prefs-error'].includes(kind) ? '/profile' : '/profile/fixture-a', BASE).href, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Account menu', exact: true }).waitFor({ state: 'visible' });
      if (kind === 'transition') {
        await main(page).getByRole('heading', { name: 'Fixture A', exact: true }).waitFor({ state: 'visible' });
        assert.equal((await stat(page, 'Total Points').textContent()).trim(), '7,770', 'A fixture must populate real UI');
        assert.equal((await stat(page, 'Time on profile').textContent()).trim(), '12h 57m', 'A time baseline must be present');
        assert.equal(await main(page).getByRole('link', { name: 'View Bracket', exact: true }).count(), 1, 'A bracket baseline must be present');
        await ownMenu(page);
        await ownerClean(page, state, 'after-menu');
        await pause(page);
        await minute(page, state);
      } else if (kind === 'late-lookup') {
        await until(() => state.lookupHeld > 0, 'A lookup must be deferred');
        await ownMenu(page);
        await ownerClean(page, state, 'before-old-result');
        await pause(page);
        lookup.release();
        await until(() => state.lookupReleased === state.lookupHeld, 'Every old lookup must be delivered');
        await page.clock.runFor(100);
        await ownerClean(page, state, 'after-old-not-found');
        assert.equal(state.writes.length, 0, 'No minute elapsed in the lookup case');
      } else if (kind === 'slow-prefs') {
        await until(() => state.prefsHeld > 0, 'B preferences must be deferred');
        await pause(page);
        await page.clock.runFor(60000);
        healthy(state);
        assert.equal(state.writes.length, 0, 'B must not track minutes before preferences settle');
        console.log(`  PASS ${kind}-${width}-pending: no minute write during slow preferences`);
        prefs.release();
        await until(() => state.prefsReleased === state.prefsHeld, 'Every deferred preferences read must settle');
        await ownerClean(page, state, 'after-preferences');
        await minute(page, state);
      } else {
        await unavailable(page, state);
      }
      healthy(state);
      const screenshot = path.join(output, `${kind}-${width}.png`);
      await stat(page, 'Time on profile').scrollIntoViewIfNeeded();
      await page.screenshot({ path: screenshot });
      state.screenshots.push(screenshot);
      state.ok = true;
    } catch (error) {
      state.ok = false;
      state.failure = error.stack;
      console.error(`  FAIL ${kind}-${width}: ${error.stack}`);
      await page.screenshot({ path: path.join(output, `${kind}-${width}-failure.png`) }).catch(() => {});
    } finally {
      lookup.release(); prefs.release();
      await until(() => state.lookupReleased === state.lookupHeld && state.prefsReleased === state.prefsHeld,
        'Deferred fixture replies must settle before context close').catch(error => state.runtime.push(error.message));
      await context.close();
      results.push(state);
    }
  }
} finally { await browser.close(); }
const ok = results.every(state => state.ok && !state.violations.length && !state.runtime.length);
fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ ok, results }, null, 2));
console.log(`playProfileIsolation: ${ok ? 'PASS' : 'FAIL'}; ${results.filter(r => r.ok).length}/${results.length} cases; ${results.flatMap(r => [...r.violations, ...r.runtime]).length} boundary/runtime errors`);
if (!ok) process.exitCode = 1;
