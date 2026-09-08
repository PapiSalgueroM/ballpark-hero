/** Round 521: real built Profile, synthetic auth and exact HTTP fixtures only.
 * PROFILE_AVERAGE_BASE=http://127.0.0.1:4194 must be a loopback origin.
 * PROFILE_AVERAGE_WIDTHS=390,1440 narrows the default 320,390,430,1440 matrix.
 * PROFILE_AVERAGE_CONTROL=value|scope|geometry must change one DOM node and fail only
 * its named assertion. Unit source controls live in simProfileAverage.
 * No account actions or forms. Every backend write is blocked and fails.
 * Screenshots and the closing report stay in a unique OS temp directory.
 */
import assert, { AssertionError } from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from './lib/playwrightLoader.mjs';

const BASE = new URL(process.env.PROFILE_AVERAGE_BASE || 'http://127.0.0.1:4194');
if (!['http:', 'https:'].includes(BASE.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(BASE.hostname)
  || BASE.username || BASE.password || BASE.pathname !== '/' || BASE.search || BASE.hash) {
  throw new Error('PROFILE_AVERAGE_BASE must be a loopback HTTP(S) origin without credentials, path, query or hash');
}
const WIDTHS = (process.env.PROFILE_AVERAGE_WIDTHS || '320,390,430,1440').split(',').map(Number);
assert.ok(WIDTHS.length > 0 && new Set(WIDTHS).size === WIDTHS.length && WIDTHS.every(width => [320, 390, 430, 1440].includes(width)), 'Unknown or repeated profile viewport');
const CONTROL = process.env.PROFILE_AVERAGE_CONTROL || '';
assert.ok(!CONTROL || ['value', 'scope', 'geometry'].includes(CONTROL), 'Unknown PROFILE_AVERAGE_CONTROL');
const BACKEND = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const AUTH_KEY = 'sb-flawuiqbvjobmkfkauhw-auth-token';
const STREAK_KEY = 'dukb-streaks-v1';
const NOW = '2026-09-08T16:00:00.000Z';
const EXPIRES = Date.parse(NOW) / 1000 + 86400;
const OWNER = '00000000-0000-4000-8000-000000000521';
const OTHER = '00000000-0000-4000-8000-000000000522';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-profile-average-'));
const failures = [], observations = [], boundaries = [], screenshots = [];
let controlFired = 0;
const controlFailure = `own-${WIDTHS[0]}-initial-${CONTROL === 'value' ? 'average' : CONTROL}`;
const user = { id: OWNER, aud: 'authenticated', role: 'authenticated', email: 'profile-fixture@example.invalid',
  email_confirmed_at: NOW, confirmed_at: NOW, created_at: NOW, updated_at: NOW,
  app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, identities: [] };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const session = {
  access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: OWNER, aud: 'authenticated', role: 'authenticated', exp: EXPIRES })}.synthetic-signature`,
  refresh_token: 'synthetic-profile-refresh', token_type: 'bearer', expires_in: 86400, expires_at: EXPIRES, user,
};
function profile(id) {
  return { id: `profile-${id}`, user_id: id, username: id === OWNER ? 'profile-fixture' : 'other-fixture',
    display_name: id === OWNER ? 'Profile Fixture' : 'Other Fixture', avatar_url: null, created_at: NOW, updated_at: NOW,
    streak_state: { version: 1, global: { current: 3, longest: 3, lastDate: '2026-09-08' },
      perGame: {}, loginDates: ['2026-09-08'], totalPlays: 11, totalPoints: 550 } };
}
function check(id, condition, detail = '') {
  try { assert.ok(condition, id); console.log(`  PASS ${id}${detail ? `: ${detail}` : ''}`); }
  catch (error) { failures.push({ id, assertion: error instanceof AssertionError, message: error.message }); console.error(`  FAIL ${id}${detail ? `: ${detail}` : ''}`); }
}
const signature = params => JSON.stringify([...params].sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv)));
const matches = (url, params) => signature(url.searchParams) === signature(new URLSearchParams(params));

async function isolated(browser, kind, width) {
  const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 },
    isMobile: width < 600, hasTouch: width < 600, locale: 'en-US', serviceWorkers: 'block' });
  const state = { kind, width, wide: false, requests: [], violations: [], runtime: [], blockedHttp: [], blockedWs: [] };
  const targetId = kind === 'other' ? OTHER : OWNER;
  await context.routeWebSocket('**/*', socket => {
    state.blockedWs.push(socket.url());
    state.violations.push(`Unexpected WebSocket ${socket.url()}`);
    socket.close();
  });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      state.violations.push(`Blocked write ${method} ${url.origin}${url.pathname}`);
      return route.abort('blockedbyclient');
    }
    if (url.origin === BASE.origin && method !== 'OPTIONS') return route.continue();
    if (url.origin !== BACKEND) {
      state.blockedHttp.push(url.href);
      if (url.hostname.endsWith('.supabase.co')) state.violations.push(`Unexpected backend ${method} ${url.href}`);
      return route.abort('blockedbyclient');
    }
    const json = (data, count) => route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': BASE.origin, 'access-control-expose-headers': 'content-range',
        ...(count === undefined ? {} : { 'content-range': count ? `0-${count - 1}/${count}` : '*/0' }) },
      body: method === 'HEAD' ? '' : JSON.stringify(data) });
    const is = (table, verb, params) => url.pathname === `/rest/v1/${table}` && method === verb && matches(url, params);
    const byUser = { user_id: `eq.${targetId}` };
    const points = state.wide ? 55000 : 550;
    state.requests.push(`${method} ${url.pathname}?${url.searchParams}`);
    if (url.pathname === '/auth/v1/user' && method === 'GET' && !url.search) return json(user);
    if (is('profiles', 'GET', { select: '*', user_id: `eq.${OWNER}` })) return json([profile(OWNER)]);
    if (is('profiles', 'GET', { select: '*', username: 'eq.other-fixture' })) return json([profile(OTHER)]);
    if (is('user_scores', 'GET', { select: 'current_streak,longest_streak,total_points', ...byUser })) {
      return json([{ current_streak: 3, longest_streak: 3, total_points: points }]);
    }
    if (is('user_scores', 'HEAD', { select: '*', total_points: `gt.${points}` }) && request.headers().prefer?.includes('count=exact')) return json(null, 0);
    if (is('user_game_scores', 'HEAD', { select: '*', ...byUser }) && request.headers().prefer?.includes('count=exact')) return json(null, state.wide ? 1100 : 11);
    if (is('user_game_scores', 'GET', { select: 'game_type,score,created_at', ...byUser, order: 'created_at.desc', limit: '5' })) {
      return json(Array.from({ length: 5 }, () => ({ game_type: 'soccer-grid', score: 50, created_at: NOW })));
    }
    if (is('user_game_scores', 'GET', { select: 'game_type', ...byUser })) return json(Array.from({ length: state.wide ? 1100 : 11 }, () => ({ game_type: 'soccer-grid' })));
    if (is('user_best_scores', 'GET', { select: '*', ...byUser, order: 'best_score.desc' })) return json([]);
    if (is('saved_brackets', 'GET', { select: 'id,bracket_data', ...byUser, limit: '1' })) return json([]);
    if (is('daily_completions', 'GET', { select: 'game_slug', ...byUser, date: 'eq.2026-09-08' })) return json([{ game_slug: 'soccer-grid' }]);
    if (is('user_preferences', 'GET', { select: '*', ...byUser })) return json([]);
    if (is('game_completions', 'GET', { select: 'game,completed_on', player_name: 'eq.Profile Fixture', order: 'completed_on.desc', limit: '500' })) return json([]);
    const live = new URLSearchParams({ select: '*', order: 'start_at.asc,id.asc', limit: '200', offset: '0' });
    live.append('start_at', 'gte.2026-09-08T04:00:00.000Z');
    live.append('start_at', 'lte.2026-09-09T12:00:00.000Z');
    if (is('live_scores', 'GET', live)) return json([]);
    state.violations.push(`Unexpected backend ${method} ${url.href}`);
    return route.abort('blockedbyclient');
  });
  await context.addInitScript(({ origin, now, authKey, auth, streakKey, completed }) => {
    if (location.origin !== origin) return;
    const NativeDate = Date;
    window.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [now])); }
      static now() { return NativeDate.parse(now); }
    };
    // Seed only once: reload must retain what production actually saved.
    if (sessionStorage.getItem('profile-average-seeded')) return;
    const empty = { current: 0, longest: 0, lastDate: null };
    localStorage.setItem(authKey, JSON.stringify(auth));
    localStorage.setItem('cookie-consent', 'essential');
    localStorage.setItem('dukb-guest-handle', 'Profile Fixture');
    localStorage.setItem(streakKey, JSON.stringify({ version: 1, global: empty, perGame: {}, loginDates: ['2026-09-08'],
      totalPlays: completed ? 1 : 0, totalPoints: completed ? 50 : 0 }));
    sessionStorage.setItem('profile-average-seeded', '1');
  }, { origin: BASE.origin, now: NOW, authKey: AUTH_KEY, auth: session, streakKey: STREAK_KEY, completed: kind === 'own' });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => state.runtime.push(error.message));
  page.on('requestfailed', request => {
    if (new URL(request.url()).origin === BASE.origin) state.runtime.push(`${request.failure()?.errorText} ${request.url()}`);
  });
  page.on('response', response => {
    if (new URL(response.url()).origin === BASE.origin && response.status() >= 400) state.runtime.push(`HTTP ${response.status()} ${response.url()}`);
  });
  return { context, page, state };
}

async function inspect(page, state, phase) {
  const id = `${state.kind}-${state.width}-${phase}`;
  const label = page.locator('#root #dukb-main').getByText('Avg Score', { exact: true });
  await label.waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Account menu', exact: true }).waitFor({ state: 'visible' });
  const card = label.locator('..');
  await card.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  const value = card.locator('p').first();
  const scope = card.getByText('This browser', { exact: true });
  const expected = state.kind === 'fresh' ? 'Not yet' : '50';
  let restore;
  if (['value', 'scope'].includes(CONTROL) && !controlFired && state.kind === 'own' && phase === 'initial') {
    const node = CONTROL === 'scope' ? scope : value;
    assert.equal(await node.count(), 1, 'DOM control must target exactly one existing node');
    const previous = await node.textContent();
    const replacement = CONTROL === 'scope' ? '' : '550';
    assert.notEqual(previous, replacement, 'DOM control must change its target');
    const target = await node.elementHandle();
    await target.evaluate((element, text) => { element.textContent = text; }, replacement);
    controlFired++;
    restore = () => target.evaluate((element, text) => { element.textContent = text; }, previous);
  }
  const actual = (await value.textContent())?.trim();
  check(`${id}-average`, actual === expected, `${actual} expected ${expected}`);
  const scoped = await scope.count() === 1 && await scope.isVisible();
  check(`${id}-scope`, state.kind === 'other' ? await scope.count() === 0 : scoped);
  if (restore) await restore();
  const total = page.locator('#root #dukb-main').getByText('Total Points', { exact: true }).locator('..').locator('p').first();
  const totalText = (await total.textContent())?.trim();
  check(`${id}-points`, totalText === (state.wide ? '55,000' : '550'), totalText);
  const saved = await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key));
    return [state.totalPoints, state.totalPlays];
  }, STREAK_KEY);
  check(`${id}-stored-pair`, saved[0] === (state.kind === 'own' ? 50 : 0) && saved[1] === (state.kind === 'own' ? 1 : 0), JSON.stringify(saved));
  let restoreGeometry;
  if (CONTROL === 'geometry' && !controlFired && state.kind === 'own' && phase === 'initial') {
    assert.equal(await card.count(), 1, 'Geometry control must target exactly one card');
    const previous = await card.getAttribute('style');
    const changed = await card.evaluate(element => {
      const before = element.getBoundingClientRect();
      element.style.height = '40px';
      element.style.overflow = 'hidden';
      const after = element.getBoundingClientRect();
      return before.height !== after.height && before.width === after.width && getComputedStyle(element).overflow === 'hidden';
    });
    assert.ok(changed, 'Geometry control must change only card height and apply a real overflow clip');
    controlFired++;
    restoreGeometry = () => card.evaluate((element, style) => {
      if (style === null) element.removeAttribute('style'); else element.setAttribute('style', style);
    }, previous);
  }
  const geometry = await card.evaluate(element => {
    const box = element.getBoundingClientRect();
    const header = document.querySelector('header')?.getBoundingClientRect();
    const paragraphs = [...element.querySelectorAll('p')].map(node => {
      const r = node.getBoundingClientRect(), range = document.createRange();
      range.selectNodeContents(node);
      const text = range.getBoundingClientRect();
      // A tight line-height is not a clip. Intersect actual overflow clips,
      // the card bounds and the unobscured viewport before judging the ink.
      const clip = { left: Math.max(0, box.left), right: Math.min(innerWidth, box.right),
        top: Math.max(header?.bottom ?? 0, box.top), bottom: Math.min(innerHeight, box.bottom) };
      for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor), rect = ancestor.getBoundingClientRect();
        if (style.overflowX !== 'visible') {
          clip.left = Math.max(clip.left, rect.left + ancestor.clientLeft);
          clip.right = Math.min(clip.right, rect.left + ancestor.clientLeft + ancestor.clientWidth);
        }
        if (style.overflowY !== 'visible') {
          clip.top = Math.max(clip.top, rect.top + ancestor.clientTop);
          clip.bottom = Math.min(clip.bottom, rect.top + ancestor.clientTop + ancestor.clientHeight);
        }
      }
      return { text: node.textContent, client: node.clientWidth, scroll: node.scrollWidth,
        line: { top: r.top, bottom: r.bottom }, ink: { left: text.left, right: text.right, top: text.top, bottom: text.bottom }, clip,
        fits: text.left >= clip.left - .5 && text.right <= clip.right + .5 && text.top >= clip.top - .5 && text.bottom <= clip.bottom + .5 };
    });
    return { viewport: innerWidth, client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
      left: box.left, right: box.right, top: box.top, bottom: box.bottom, headerBottom: header?.bottom ?? 0, paragraphs };
  });
  const otherGeometryHealthy = geometry.scroll <= geometry.client + 2 && geometry.left >= -.5 && geometry.right <= geometry.client + .5
    && geometry.top >= geometry.headerBottom - .5 && geometry.bottom <= (state.width === 1440 ? 1000 : 844) + .5
    && geometry.paragraphs.every((p, i, rows) => p.scroll <= p.client + 1 && (!i || rows[i - 1].ink.bottom <= p.ink.top + .5));
  if (restoreGeometry) {
    assert.ok(otherGeometryHealthy, 'Clipping control must preserve every geometry check except text clipping');
    assert.ok(geometry.paragraphs.some(p => !p.fits), 'Clipping control must actually clip text');
  }
  check(`${id}-geometry`, otherGeometryHealthy && geometry.paragraphs.every(p => p.fits), JSON.stringify(geometry));
  if (restoreGeometry) {
    const destination = path.join(output, `${id}-clipping-control.png`);
    await page.screenshot({ path: destination });
    screenshots.push(destination);
    await restoreGeometry();
  }
  if (state.wide) {
    const wide = await page.evaluate(() => {
      const mark = document.querySelector('header a[href="/"] span');
      const pointsLabel = [...document.querySelectorAll('#root #dukb-main p')].find(node => node.textContent === 'Total Points');
      const points = pointsLabel?.parentElement?.querySelector('p');
      const fits = node => !!node && node.scrollWidth <= node.clientWidth + 1;
      return { wordmarkFits: fits(mark), pointsFit: fits(points), streak: document.querySelector('header [title="123 day streak"]')?.textContent?.trim() };
    });
    check(`${id}-wide-content`, wide.wordmarkFits && wide.pointsFit && wide.streak === '123', JSON.stringify(wide));
  }
  check(`${id}-runtime`, state.runtime.length === 0, state.runtime.join('; '));
  check(`${id}-boundary`, state.violations.length === 0, state.violations.join('; '));
  observations.push({ id, average: actual, totalPoints: totalText, stored: saved, geometry });
  if (state.kind === 'own' && [390, 1440].includes(state.width) && ['initial', 'wide'].includes(phase)) {
    const destination = path.join(output, `${id}.png`);
    await page.screenshot({ path: destination });
    screenshots.push(destination);
  }
}

console.log(`playProfileAverage: ${BASE.origin}; widths=${WIDTHS}; control=${CONTROL || 'none'}`);
console.log(`Artifacts: ${output}`);
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) });
try {
  for (const width of WIDTHS) for (const kind of ['own', 'fresh', 'other']) {
    const { context, page, state } = await isolated(browser, kind, width);
    try {
      const route = kind === 'other' ? '/profile/other-fixture' : '/profile';
      await page.goto(new URL(route, BASE).href, { waitUntil: 'domcontentloaded' });
      await inspect(page, state, 'initial');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await inspect(page, state, 'reload');
      if (kind === 'own') {
        state.wide = true;
        await page.evaluate(key => {
          const state = JSON.parse(localStorage.getItem(key));
          state.global = { current: 123, longest: 123, lastDate: '2026-09-08' };
          localStorage.setItem(key, JSON.stringify(state));
        }, STREAK_KEY);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await inspect(page, state, 'wide');
      }
    } catch (error) {
      failures.push({ id: `${kind}-${width}-execution`, assertion: error instanceof AssertionError, message: error.message });
      console.error(`  FAIL ${kind}-${width}: ${error.stack}`);
      await page.screenshot({ path: path.join(output, `${kind}-${width}-failure.png`) }).catch(() => {});
    } finally {
      await context.close();
      boundaries.push(state);
    }
  }
} finally { await browser.close(); }
const unsafe = boundaries.flatMap(state => [...state.violations, ...state.runtime]);
const exactControl = CONTROL && controlFired === 1 && failures.length === 1 && failures[0].id === controlFailure
  && failures[0].assertion && failures[0].message === controlFailure;
const ok = unsafe.length === 0 && (CONTROL ? exactControl : failures.length === 0);
fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ ok, control: CONTROL, controlFired, failures, observations, boundaries, screenshots }, null, 2));
console.log(`Screenshots: ${JSON.stringify(screenshots)}`);
console.log(`playProfileAverage: ${ok ? 'PASS' : 'FAIL'}; ${observations.length} rendered states; ${unsafe.length} boundary/runtime errors; ${CONTROL ? `exact control=${!!exactControl}` : `${failures.length} failed checks`}`);
if (!ok) process.exitCode = 1;
