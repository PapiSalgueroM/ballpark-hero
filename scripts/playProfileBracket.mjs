/** Round 524: built Profile saved-bracket summaries with synthetic HTTP fixtures.
 * PROFILE_BRACKET_BASE defaults to loopback 4200; baseline 523 uses 4198.
 * PROFILE_BRACKET_WIDTHS defaults to 390,1440. PROFILE_BRACKET_CONTROL accepts
 * current, legacy, fallback or link. Each changes one DOM target, requires one
 * exact assertion failure, then restores it. Normal runs prove real clipping.
 * No real accounts, forms, share actions, bracket navigation or backend writes.
 */
import assert, { AssertionError } from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from './lib/playwrightLoader.mjs';

const BASE = new URL(process.env.PROFILE_BRACKET_BASE || 'http://127.0.0.1:4200');
assert.ok(['http:', 'https:'].includes(BASE.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(BASE.hostname)
  && !BASE.username && !BASE.password && BASE.pathname === '/' && !BASE.search && !BASE.hash, 'Expected a loopback HTTP(S) origin');
const WIDTHS = (process.env.PROFILE_BRACKET_WIDTHS || '390,1440').split(',').map(Number);
assert.ok(WIDTHS.length && new Set(WIDTHS).size === WIDTHS.length && WIDTHS.every(w => [390, 1440].includes(w)), 'Unknown or repeated viewport');
const CONTROLS = { current: ['writer', 'summary'], legacy: ['legacy-awards', 'summary'], fallback: ['malformed-json', 'summary'], link: ['writer', 'link'] };
const CONTROL = process.env.PROFILE_BRACKET_CONTROL || '';
assert.ok(!CONTROL || Object.hasOwn(CONTROLS, CONTROL), 'Unknown bracket control');
const BACKEND = 'https://flawuiqbvjobmkfkauhw.supabase.co', NOW = '2026-09-08T16:00:00.000Z';
const A = '00000000-0000-4000-8000-00000000524a', B = '00000000-0000-4000-8000-00000000524b';
const writer = { predictions: {}, playoffPicks: {}, selectedThirds: [], knockoutPicks: {}, awards: {}, champion: 'Fixture Champion' };
const CASES = [
  { name: 'writer', data: writer, expected: 'Champion: Fixture Champion' },
  { name: 'serialized', data: JSON.stringify(writer), expected: 'Champion: Fixture Champion' },
  { name: 'legacy-awards', data: { awards: { champion: 'Legacy Award' }, knockoutWinners: { final: 'Legacy Final' } }, expected: 'Champion: Legacy Award' },
  { name: 'legacy-final', data: { knockoutWinners: { final: 'Legacy Final' } }, expected: 'Champion: Legacy Final' },
  { name: 'malformed-json', data: '{broken', expected: 'Bracket saved' },
  { name: 'parsed-null', data: 'null', expected: 'Bracket saved' },
  { name: 'object-champion', data: { awards: { champion: { label: 'Invalid Object' } } }, expected: 'Bracket saved' },
];
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-profile-bracket-'));
const failures = [], results = [];
let controlFired = 0;
const check = (id, condition, detail = '') => {
  try { assert.ok(condition, id); console.log(`  PASS ${id}`); }
  catch (error) { failures.push({ id, assertion: error instanceof AssertionError, message: error.message, detail }); console.error(`  FAIL ${id}: ${detail}`); }
};
const signature = params => JSON.stringify([...params].sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv)));
const matches = (url, params) => signature(url.searchParams) === signature(new URLSearchParams(params));

async function fixture(browser, test, width) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 },
    isMobile: width === 390, hasTouch: width === 390, serviceWorkers: 'block', locale: 'en-US' });
  const profile = (id, display_name, username) => ({ id: `profile-${id}`, user_id: id, display_name, username,
    avatar_url: null, streak_state: null, created_at: NOW, updated_at: NOW });
  const profiles = { [A]: profile(A, 'Bracket Fixture', 'bracket-fixture'), [B]: profile(B, 'Viewer Fixture', 'viewer-fixture') };
  const user = { id: B, aud: 'authenticated', role: 'authenticated', email: 'viewer@example.invalid',
    email_confirmed_at: NOW, confirmed_at: NOW, created_at: NOW, updated_at: NOW,
    app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, identities: [] };
  const expires = Date.parse(NOW) / 1000 + 86400;
  const session = { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: B, aud: 'authenticated', role: 'authenticated', exp: expires })}.synthetic-signature`,
    refresh_token: 'synthetic-profile-refresh', token_type: 'bearer', expires_in: 86400, expires_at: expires, user };
  const state = { name: test.name, width, requests: [], violations: [], runtime: [], transport: [], blocked: [], screenshots: [] };
  await context.routeWebSocket('**/*', socket => { state.violations.push(`Unexpected WebSocket ${socket.url()}`); socket.close(); });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const deny = reason => { state.violations.push(reason); return route.abort('blockedbyclient'); };
    if (!['GET', 'HEAD'].includes(method)) return deny(`Blocked ${method} ${url.origin}${url.pathname}`);
    if (url.origin === BASE.origin) return route.continue();
    if (url.origin !== BACKEND) {
      state.blocked.push(url.href);
      if (url.hostname.endsWith('.supabase.co')) return deny(`Unexpected backend ${url.href}`);
      return route.abort('blockedbyclient');
    }
    state.requests.push(`${method} ${url.pathname}?${url.searchParams}`);
    const json = (data, count) => route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': BASE.origin, 'access-control-expose-headers': 'content-range',
        ...(count === undefined ? {} : { 'content-range': '*/0' }) }, body: method === 'HEAD' ? '' : JSON.stringify(data) });
    const is = (table, verb, params) => url.pathname === `/rest/v1/${table}` && method === verb && matches(url, params);
    if (url.pathname === '/auth/v1/user' && method === 'GET' && !url.search) return json(user);
    if (is('profiles', 'GET', { select: '*', user_id: `eq.${B}` })) return json([profiles[B]]);
    if (is('profiles', 'GET', { select: '*', username: 'eq.bracket-fixture' })) return json([profiles[A]]);
    const byUser = { user_id: `eq.${A}` };
    if (is('user_scores', 'GET', { select: 'current_streak,longest_streak,total_points', ...byUser })) return json([]);
    if (is('user_game_scores', 'HEAD', { select: '*', ...byUser }) && request.headers().prefer?.includes('count=exact')) return json(null, 0);
    if (is('user_game_scores', 'GET', { select: 'game_type,score,created_at', ...byUser, order: 'created_at.desc', limit: '5' })) return json([]);
    if (is('user_game_scores', 'GET', { select: 'game_type', ...byUser })) return json([]);
    if (is('user_best_scores', 'GET', { select: '*', ...byUser, order: 'best_score.desc' })) return json([]);
    if (is('saved_brackets', 'GET', { select: 'id,bracket_data', ...byUser, limit: '1' })) return json([{ id: `fixture-524-${test.name}`, bracket_data: test.data }]);
    if (is('daily_completions', 'GET', { select: 'game_slug', ...byUser, date: 'eq.2026-09-08' })) return json([]);
    if (is('user_preferences', 'GET', { select: '*', ...byUser })) return json([]);
    const live = new URLSearchParams({ select: '*', order: 'start_at.asc,id.asc', limit: '200', offset: '0' });
    live.append('start_at', 'gte.2026-09-08T04:00:00.000Z'); live.append('start_at', 'lte.2026-09-09T12:00:00.000Z');
    if (is('live_scores', 'GET', live)) return json([]);
    return deny(`Unexpected backend ${method} ${url.href}`);
  });
  await context.addInitScript(({ origin, session, now }) => {
    if (location.origin !== origin) return;
    const NativeDate = Date;
    window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return NativeDate.parse(now); } };
    window.__profileBracketErrors = [];
    window.addEventListener('error', event => window.__profileBracketErrors.push(event.message));
    localStorage.setItem('sb-flawuiqbvjobmkfkauhw-auth-token', JSON.stringify(session));
    localStorage.setItem('cookie-consent', 'essential');
    localStorage.setItem('dukb-guest-handle', 'Viewer Fixture');
    const protectedStorage = { 'wc2026-knockout': '{"fixture":"preserve picks"}', 'wc2026-awards': '{"fixture":"preserve awards"}',
      'dukb-streaks-v1': JSON.stringify({ version: 1, global: { current: 0, longest: 0, lastDate: null }, perGame: {}, loginDates: ['2026-09-08'], totalPlays: 0, totalPoints: 0 }) };
    for (const [key, value] of Object.entries(protectedStorage)) localStorage.setItem(key, value);
    window.__profileBracketStorage = protectedStorage;
  }, { origin: BASE.origin, session, now: NOW });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => state.runtime.push(error.message));
  page.on('requestfailed', request => { if (new URL(request.url()).origin === BASE.origin) state.transport.push(`${request.failure()?.errorText} ${request.url()}`); });
  page.on('response', response => { if (new URL(response.url()).origin === BASE.origin && response.status() >= 400) state.transport.push(`HTTP ${response.status()} ${response.url()}`); });
  return { context, page, state };
}

async function geometry(card) {
  return card.evaluate(node => {
    const box = node.getBoundingClientRect(), sticky = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    const elements = [...node.querySelectorAll('h3,p,a')], ink = [];
    for (const element of elements) {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      for (let text = walker.nextNode(); text; text = walker.nextNode()) {
        if (!text.textContent.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(text);
        for (const rect of range.getClientRects()) ink.push({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, owner: element.tagName });
      }
    }
    const clip = { left: Math.max(box.left + node.clientLeft, 0), right: Math.min(box.left + node.clientLeft + node.clientWidth, innerWidth),
      top: Math.max(box.top + node.clientTop, sticky), bottom: Math.min(box.top + node.clientTop + node.clientHeight, innerHeight) };
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent), r = parent.getBoundingClientRect();
      if (style.overflowX !== 'visible') { clip.left = Math.max(clip.left, r.left + parent.clientLeft); clip.right = Math.min(clip.right, r.left + parent.clientLeft + parent.clientWidth); }
      if (style.overflowY !== 'visible') { clip.top = Math.max(clip.top, r.top + parent.clientTop); clip.bottom = Math.min(clip.bottom, r.top + parent.clientTop + parent.clientHeight); }
    }
    const link = node.querySelector('a').getBoundingClientRect();
    const linkBox = { left: link.left, right: link.right, top: link.top, bottom: link.bottom };
    const fits = ink.length > 0 && [...ink, linkBox].every(r => r.left >= clip.left - .5 && r.right <= clip.right + .5 && r.top >= clip.top - .5 && r.bottom <= clip.bottom + .5);
    const overlap = ink.some((a, i) => ink.slice(i + 1).some(b => a.owner !== b.owner && Math.min(a.right, b.right) - Math.max(a.left, b.left) > .5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > .5));
    return { ink, linkBox, clip, fits, otherHealthy: !overlap && box.left >= -.5 && box.right <= innerWidth + .5
      && document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2 };
  });
}

async function inspect(f, test) {
  const { page, state } = f, id = `${test.name}-${state.width}`;
  await page.goto(new URL('/profile/bracket-fixture', BASE).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__profileBracketErrors?.length || [...document.querySelectorAll('#root #dukb-main h3')].some(n => n.textContent === 'World Cup 2026 Prediction'));
  const main = page.locator('#root #dukb-main');
  const usable = state.runtime.length === 0 && await main.getByRole('heading', { name: 'Bracket Fixture', exact: true, level: 1 }).isVisible()
    && await main.getByRole('heading', { name: '🕹️ Recently Played', exact: true }).isVisible()
    && await main.getByRole('heading', { name: '🏆 Best Scores', exact: true }).isVisible()
    && await page.getByRole('button', { name: 'Account menu', exact: true }).isVisible();
  check(`${id}-profile-usable`, usable, JSON.stringify({ runtime: state.runtime, body: (await page.locator('body').innerText()).slice(0, 500) }));
  check(`${id}-storage`, await page.evaluate(() => Object.entries(window.__profileBracketStorage).every(([key, value]) => localStorage.getItem(key) === value)));
  if (!usable) {
    const shot = path.join(output, `${id}-unusable.png`); await page.screenshot({ path: shot }); state.screenshots.push(shot);
    return;
  }
  const heading = main.getByRole('heading', { name: 'World Cup 2026 Prediction', exact: true });
  const card = heading.locator('../../../..'), summary = heading.locator('../p'), link = card.getByRole('link', { name: 'View Bracket', exact: true });
  await card.scrollIntoViewIfNeeded();
  const expectedLink = `/world-cup-bracket?bracket=fixture-524-${test.name}`;
  let restore;
  if (CONTROL && !controlFired && state.width === WIDTHS[0] && CONTROLS[CONTROL][0] === test.name) {
    const target = CONTROL === 'link' ? link : summary;
    const before = CONTROL === 'link' ? await target.getAttribute('href') : await target.innerHTML();
    const changed = CONTROL === 'link' ? '/world-cup-bracket?bracket=wrong-fixture' : CONTROL === 'current' ? 'Bracket saved' : CONTROL === 'legacy' ? 'Champion: Legacy Final' : 'Champion: Invalid Fixture';
    assert.notEqual(before, changed, 'Control must change its target');
    await target.evaluate((node, { changed, link }) => { if (link) node.setAttribute('href', changed); else node.innerHTML = changed; }, { changed, link: CONTROL === 'link' });
    restore = () => target.evaluate((node, { before, link }) => { if (link) node.setAttribute('href', before); else node.innerHTML = before; }, { before, link: CONTROL === 'link' });
    controlFired++;
  }
  state.actual = (await summary.innerText()).trim();
  state.href = await link.getAttribute('href');
  check(`${id}-summary`, state.actual === test.expected, JSON.stringify({ actual: state.actual, expected: test.expected }));
  check(`${id}-link`, state.href === expectedLink, state.href);
  if (restore) await restore();
  state.geometry = await geometry(card);
  check(`${id}-geometry`, state.geometry.otherHealthy && state.geometry.fits, JSON.stringify(state.geometry));
  const shot = path.join(output, `${id}.png`); await page.screenshot({ path: shot }); state.screenshots.push(shot);
  if (!CONTROL && test.name === 'writer') {
    const before = await card.getAttribute('style'), original = await card.boundingBox();
    try {
      await card.evaluate(node => { node.style.height = '40px'; node.style.overflow = 'hidden'; });
      const altered = await card.boundingBox();
      assert.notEqual(altered.height, original.height, 'Clipping control must change height');
      assert.equal(altered.width, original.width, 'Clipping control must preserve width');
      const clipped = await geometry(card);
      assert.ok(clipped.otherHealthy, 'Clipping control must keep non-clipping checks healthy');
      assert.ok(!clipped.fits, 'Clipping control must clip actual text');
      assert.throws(() => assert.ok(clipped.otherHealthy && clipped.fits, 'Bracket glyphs must fit'), { name: 'AssertionError', message: 'Bracket glyphs must fit' });
      state.clippingControl = clipped;
      const controlShot = path.join(output, `${id}-clipping-control.png`);
      await page.screenshot({ path: controlShot }); state.screenshots.push(controlShot);
      console.log(`  PASS ${id}-clipping-control`);
    } finally { await card.evaluate((node, style) => { if (style === null) node.removeAttribute('style'); else node.setAttribute('style', style); }, before); }
    const restored = await geometry(card); assert.ok(restored.otherHealthy && restored.fits, 'Restored bracket must fit');
  }
}

console.log(`playProfileBracket: ${BASE.origin}; widths=${WIDTHS}; control=${CONTROL || 'none'}; artifacts=${output}`);
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) });
try {
  for (const width of WIDTHS) for (const test of CASES) {
    const f = await fixture(browser, test, width);
    try { await inspect(f, test); }
    catch (error) { failures.push({ id: `${test.name}-${width}-harness`, assertion: error instanceof AssertionError, message: error.message }); console.error(`  FAIL ${test.name}-${width}: ${error.stack}`); }
    finally {
      await f.context.close();
      check(`${test.name}-${width}-boundary`, f.state.violations.length === 0 && f.state.transport.length === 0, JSON.stringify({ violations: f.state.violations, transport: f.state.transport }));
      results.push(f.state);
    }
  }
} finally { await browser.close(); }
const unsafe = results.flatMap(r => [...r.violations, ...r.transport, ...r.runtime]);
const expectedFailure = CONTROL ? `${CONTROLS[CONTROL][0]}-${WIDTHS[0]}-${CONTROLS[CONTROL][1]}` : '';
const exactControl = CONTROL && controlFired === 1 && failures.length === 1 && failures[0].id === expectedFailure
  && failures[0].assertion && failures[0].message === expectedFailure;
const ok = unsafe.length === 0 && (CONTROL ? exactControl : failures.length === 0);
fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ ok, control: CONTROL, controlFired, failures, results }, null, 2));
console.log(`playProfileBracket: ${ok ? 'PASS' : 'FAIL'}; ${results.length} payload states; ${unsafe.length} boundary/runtime errors; ${CONTROL ? `exact control=${!!exactControl}` : `${failures.length} failed checks`}`);
if (!ok) process.exitCode = 1;
