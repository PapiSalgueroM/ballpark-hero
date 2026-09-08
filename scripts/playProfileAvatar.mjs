/** Round 523: actual built Profile identity, with local synthetic avatar marks.
 * PROFILE_AVATAR_BASE defaults to loopback port 4198; baseline 522 uses 4196.
 * PROFILE_AVATAR_WIDTHS=390,1440. PROFILE_AVATAR_CONTROL selects one exact
 * identity control: leaked-avatar, leaked-initial, saved-precedence,
 * metadata-fallback, email-fallback, stale-back. Controls must change the
 * relevant DOM node and fail only their named identity assertion, then restore.
 * A height-only clipping control also runs in each normal saved-avatar flow.
 * No forms, account actions, real sharing, remote images or backend writes.
 */
import assert, { AssertionError } from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from './lib/playwrightLoader.mjs';

const BASE = new URL(process.env.PROFILE_AVATAR_BASE || 'http://127.0.0.1:4198');
assert.ok(['http:', 'https:'].includes(BASE.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(BASE.hostname)
  && !BASE.username && !BASE.password && BASE.pathname === '/' && !BASE.search && !BASE.hash, 'Expected a loopback HTTP(S) origin');
const WIDTHS = (process.env.PROFILE_AVATAR_WIDTHS || '390,1440').split(',').map(Number);
assert.ok(WIDTHS.length && new Set(WIDTHS).size === WIDTHS.length && WIDTHS.every(w => [390, 1440].includes(w)), 'Unknown or repeated viewport');
const CONTROLS = { 'leaked-avatar': ['saved', 'other'], 'leaked-initial': ['initials', 'other'],
  'saved-precedence': ['saved', 'own'], 'metadata-fallback': ['metadata', 'own'],
  'email-fallback': ['initials', 'own'], 'stale-back': ['saved', 'back'] };
const CONTROL = process.env.PROFILE_AVATAR_CONTROL || '';
assert.ok(!CONTROL || Object.hasOwn(CONTROLS, CONTROL), 'Unknown avatar control');
const BACKEND = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const NOW = '2026-09-08T16:00:00.000Z';
const B = '00000000-0000-4000-8000-00000000523b';
const A = '00000000-0000-4000-8000-00000000523a';
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const mark = (letter, color) => `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="72" height="72" fill="${color}"/><text x="36" y="50" text-anchor="middle" font-family="Arial" font-size="44" fill="white">${letter}</text></svg>`).toString('base64')}`;
const MARKS = { saved: mark('S', '#006b4c'), metadata: mark('M', '#5930a8') };
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-profile-avatar-'));
const failures = [], results = [];
let controlFired = 0;
const check = (id, condition, detail = '') => {
  try { assert.ok(condition, id); console.log(`  PASS ${id}`); }
  catch (error) { failures.push({ id, assertion: error instanceof AssertionError, message: error.message, detail }); console.error(`  FAIL ${id}: ${detail}`); }
};
const signature = params => JSON.stringify([...params].sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv)));
const matches = (url, params) => signature(url.searchParams) === signature(new URLSearchParams(params));
const main = page => page.locator('#root #dukb-main');

async function fixture(browser, flow, width) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 },
    isMobile: width === 390, hasTouch: width === 390, serviceWorkers: 'block', locale: 'en-US' });
  const nameless = flow === 'initials', display = nameless ? null : 'Owner Fixture';
  const handle = nameless ? null : 'owner-fixture', otherHandle = nameless ? 'zed-fixture' : 'another-fixture';
  const profiles = {
    [B]: { id: 'profile-b', user_id: B, display_name: display, username: handle,
      avatar_url: flow === 'saved' ? MARKS.saved : null, streak_state: null, created_at: NOW, updated_at: NOW },
    [A]: { id: 'profile-a', user_id: A, display_name: nameless ? null : 'Another Fixture', username: otherHandle,
      avatar_url: null, streak_state: null, created_at: NOW, updated_at: NOW },
  };
  const user = { id: B, aud: 'authenticated', role: 'authenticated', email: 'viewer@example.invalid',
    email_confirmed_at: NOW, confirmed_at: NOW, created_at: NOW, updated_at: NOW,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: nameless ? {} : { avatar_url: MARKS.metadata }, identities: [] };
  const expires = Date.parse(NOW) / 1000 + 86400;
  const session = { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: B, aud: 'authenticated', role: 'authenticated', exp: expires })}.synthetic-signature`,
    refresh_token: 'synthetic-profile-refresh', token_type: 'bearer', expires_in: 86400, expires_at: expires, user };
  const playerName = display || 'Reader Fixture';
  const state = { flow, width, requests: [], violations: [], runtime: [], blocked: [], documents: [], observations: [], screenshots: [] };
  await context.routeWebSocket('**/*', socket => { state.violations.push(`Unexpected WebSocket ${socket.url()}`); socket.close(); });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const deny = reason => { state.violations.push(reason); return route.abort('blockedbyclient'); };
    if (!['GET', 'HEAD'].includes(method)) return deny(`Blocked ${method} ${url.origin}${url.pathname}`);
    if (url.origin === BASE.origin) {
      if (request.resourceType() === 'document') state.documents.push(url.href);
      return route.continue();
    }
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
    if (is('profiles', 'GET', { select: '*', username: `eq.${otherHandle}` })) return json([profiles[A]]);
    for (const id of [A, B]) {
      const byUser = { user_id: `eq.${id}` };
      if (is('user_scores', 'GET', { select: 'current_streak,longest_streak,total_points', ...byUser })) return json([]);
      if (is('user_game_scores', 'HEAD', { select: '*', ...byUser }) && request.headers().prefer?.includes('count=exact')) return json(null, 0);
      if (is('user_game_scores', 'GET', { select: 'game_type,score,created_at', ...byUser, order: 'created_at.desc', limit: '5' })) return json([]);
      if (is('user_game_scores', 'GET', { select: 'game_type', ...byUser })) return json([]);
      if (is('user_best_scores', 'GET', { select: '*', ...byUser, order: 'best_score.desc' })) return json([]);
      if (is('saved_brackets', 'GET', { select: 'id,bracket_data', ...byUser, limit: '1' })) return json([]);
      if (is('daily_completions', 'GET', { select: 'game_slug', ...byUser, date: 'eq.2026-09-08' })) return json([]);
      if (is('user_preferences', 'GET', { select: '*', ...byUser })) return json([]);
    }
    if (is('game_completions', 'GET', { select: 'game,completed_on', player_name: `eq.${playerName}`, order: 'completed_on.desc', limit: '500' })) return json([]);
    const live = new URLSearchParams({ select: '*', order: 'start_at.asc,id.asc', limit: '200', offset: '0' });
    live.append('start_at', 'gte.2026-09-08T04:00:00.000Z'); live.append('start_at', 'lte.2026-09-09T12:00:00.000Z');
    if (is('live_scores', 'GET', live)) return json([]);
    return deny(`Unexpected backend ${method} ${url.href}`);
  });
  await context.addInitScript(({ origin, session, name, now }) => {
    if (location.origin !== origin) return;
    const NativeDate = Date;
    window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return NativeDate.parse(now); } };
    window.__profileAvatarDocument = crypto.randomUUID();
    localStorage.setItem('sb-flawuiqbvjobmkfkauhw-auth-token', JSON.stringify(session));
    localStorage.setItem('cookie-consent', 'essential');
    localStorage.setItem('dukb-guest-handle', name);
    localStorage.setItem('dukb-streaks-v1', JSON.stringify({ version: 1, global: { current: 0, longest: 0, lastDate: null },
      perGame: {}, loginDates: ['2026-09-08'], totalPlays: 0, totalPoints: 0 }));
  }, { origin: BASE.origin, session, name: playerName, now: NOW });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => state.runtime.push(error.message));
  page.on('requestfailed', request => { if (new URL(request.url()).origin === BASE.origin) state.runtime.push(`${request.failure()?.errorText} ${request.url()}`); });
  page.on('response', response => { if (new URL(response.url()).origin === BASE.origin && response.status() >= 400) state.runtime.push(`HTTP ${response.status()} ${response.url()}`); });
  return { context, page, state, profiles, otherHandle };
}

async function identity(slot) {
  return slot.evaluate(node => node.tagName === 'IMG'
    ? { kind: 'image', src: node.getAttribute('src') }
    : { kind: 'initial', text: node.textContent.trim() });
}
async function geometry(slot) {
  return slot.evaluate(node => {
    const r = node.getBoundingClientRect(), sticky = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    const clip = { left: 0, right: innerWidth, top: sticky, bottom: innerHeight };
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent), box = parent.getBoundingClientRect();
      if (style.overflowX !== 'visible') { clip.left = Math.max(clip.left, box.left + parent.clientLeft); clip.right = Math.min(clip.right, box.left + parent.clientLeft + parent.clientWidth); }
      if (style.overflowY !== 'visible') { clip.top = Math.max(clip.top, box.top + parent.clientTop); clip.bottom = Math.min(clip.bottom, box.top + parent.clientTop + parent.clientHeight); }
    }
    const text = node.nextElementSibling.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, clip,
      otherHealthy: Math.abs(r.width - 72) <= .5 && Math.abs(r.height - 72) <= .5 && r.left >= -.5 && r.right <= innerWidth + .5
        && r.top >= sticky - .5 && r.bottom <= innerHeight + .5 && r.right <= text.left + .5
        && document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2,
      fits: r.left >= clip.left - .5 && r.right <= clip.right + .5 && r.top >= clip.top - .5 && r.bottom <= clip.bottom + .5 };
  });
}
async function inspect(f, phase) {
  const { page, state, profiles, otherHandle } = f, own = phase === 'own';
  const id = `${state.flow}-${state.width}-${phase}`;
  const row = profiles[own ? B : A];
  const handleNode = name => main(page).locator('p').filter({ hasText: new RegExp(`^@${name}$`) });
  if (row.username) await handleNode(row.username).waitFor({ state: 'visible' });
  else await handleNode(otherHandle).waitFor({ state: 'detached' });
  const heading = main(page).getByRole('heading', { name: row.display_name || 'Anonymous Player', exact: true, level: 1 });
  await heading.waitFor({ state: 'visible' });
  const header = heading.locator('../..'), slot = header.locator(':scope > :first-child');
  await header.scrollIntoViewIfNeeded();
  const expected = own && state.flow !== 'initials'
    ? { kind: 'image', src: MARKS[state.flow === 'saved' ? 'saved' : 'metadata'] }
    : { kind: 'initial', text: own ? 'V' : state.flow === 'initials' ? 'Z' : 'A' };
  let restore;
  if (CONTROL && !controlFired && state.width === WIDTHS[0] && CONTROLS[CONTROL][0] === state.flow && CONTROLS[CONTROL][1] === phase) {
    const before = await identity(slot), original = await slot.elementHandle();
    const injected = ['leaked-avatar', 'saved-precedence', 'stale-back'].includes(CONTROL)
      ? { kind: 'image', src: CONTROL === 'stale-back' ? MARKS.saved : MARKS.metadata }
      : { kind: 'initial', text: CONTROL === 'leaked-initial' ? 'V' : CONTROL === 'email-fallback' ? 'U' : 'O' };
    assert.notDeepEqual(before, injected, 'Identity control must change its target');
    const replacement = await original.evaluateHandle((node, value) => {
      const changed = document.createElement(value.kind === 'image' ? 'img' : 'div');
      changed.className = node.className;
      changed.setAttribute('style', node.getAttribute('style') || '');
      if (value.kind === 'image') { changed.src = value.src; changed.alt = 'Avatar'; } else changed.textContent = value.text;
      node.replaceWith(changed);
      return changed;
    }, injected);
    controlFired++;
    restore = () => replacement.evaluate((node, original) => { node.replaceWith(original); }, original);
  }
  const actual = await identity(slot);
  check(`${id}-identity`, JSON.stringify(actual) === JSON.stringify(expected), JSON.stringify({ actual, expected }));
  if (restore) await restore();
  const restored = await identity(slot);
  if (restored.kind === 'image') {
    await slot.evaluate(node => node.decode());
    check(`${id}-decoded`, await slot.evaluate(node => node.complete && node.naturalWidth > 0));
  }
  const measured = await geometry(slot);
  check(`${id}-geometry`, measured.otherHealthy && measured.fits, JSON.stringify(measured));
  check(`${id}-same-document`, state.documents.length === 1 && await page.evaluate(() => window.__profileAvatarDocument) === state.documentToken);
  check(`${id}-runtime`, state.runtime.length === 0, state.runtime.join('; '));
  check(`${id}-boundary`, state.violations.length === 0, state.violations.join('; '));
  state.observations.push({ phase, actual, expected, geometry: measured });
  const destination = path.join(output, `${id}.png`);
  await page.screenshot({ path: destination });
  state.screenshots.push(destination);
  if (!CONTROL && state.flow === 'saved' && phase === 'own') {
    const before = await header.getAttribute('style');
    const oldHeight = await header.evaluate(node => node.getBoundingClientRect().height);
    try {
      await header.evaluate(node => { node.style.height = '40px'; node.style.overflow = 'hidden'; });
      assert.notEqual(await header.evaluate(node => node.getBoundingClientRect().height), oldHeight, 'Geometry control must change header height');
      assert.equal(await header.evaluate(node => getComputedStyle(node).overflow), 'hidden', 'Geometry control must create a real clip');
      const clipped = await geometry(slot);
      assert.deepEqual([clipped.width, clipped.height], [measured.width, measured.height], 'Geometry control must preserve avatar dimensions');
      assert.ok(clipped.otherHealthy, 'All non-clipping geometry conjuncts must stay healthy');
      assert.ok(!clipped.fits, 'Geometry control must clip the avatar');
      assert.throws(() => assert.ok(clipped.otherHealthy && clipped.fits, 'Avatar must fit actual clips'),
        { name: 'AssertionError', message: 'Avatar must fit actual clips' });
      state.clippingControl = clipped;
      const controlShot = path.join(output, `${id}-clipping-control.png`);
      await page.screenshot({ path: controlShot });
      state.screenshots.push(controlShot);
      console.log(`  PASS ${id}-clipping-control`);
    } finally {
      await header.evaluate((node, style) => { if (style === null) node.removeAttribute('style'); else node.setAttribute('style', style); }, before);
    }
    const after = await geometry(slot);
    assert.ok(after.otherHealthy && after.fits, 'Restored avatar must fit actual clips');
  }
}

console.log(`playProfileAvatar: ${BASE.origin}; widths=${WIDTHS}; control=${CONTROL || 'none'}; artifacts=${output}`);
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) });
try {
  for (const width of WIDTHS) for (const flow of ['saved', 'metadata', 'initials']) {
    const f = await fixture(browser, flow, width);
    try {
      await f.page.goto(new URL(`/profile/${f.otherHandle}`, BASE).href, { waitUntil: 'domcontentloaded' });
      await f.page.getByRole('button', { name: 'Account menu', exact: true }).waitFor({ state: 'visible' });
      f.state.documentToken = await f.page.evaluate(() => window.__profileAvatarDocument);
      await inspect(f, 'other');
      await f.page.getByRole('button', { name: 'Account menu', exact: true }).click();
      await f.page.getByRole('menuitem', { name: 'My Profile', exact: true }).click();
      await f.page.waitForURL(new URL('/profile', BASE).href);
      await inspect(f, 'own');
      await f.page.goBack();
      await f.page.waitForURL(new URL(`/profile/${f.otherHandle}`, BASE).href);
      await inspect(f, 'back');
    } catch (error) {
      failures.push({ id: `${flow}-${width}-execution`, assertion: error instanceof AssertionError, message: error.message });
      console.error(`  FAIL ${flow}-${width}: ${error.stack}`);
      await f.page.screenshot({ path: path.join(output, `${flow}-${width}-failure.png`) }).catch(() => {});
    } finally { await f.context.close(); results.push(f.state); }
  }
} finally { await browser.close(); }
const unsafe = results.flatMap(r => [...r.violations, ...r.runtime]);
const expectedFailure = CONTROL ? `${CONTROLS[CONTROL][0]}-${WIDTHS[0]}-${CONTROLS[CONTROL][1]}-identity` : '';
const exactControl = CONTROL && controlFired === 1 && failures.length === 1 && failures[0].id === expectedFailure
  && failures[0].assertion && failures[0].message === expectedFailure;
const ok = unsafe.length === 0 && (CONTROL ? exactControl : failures.length === 0);
fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ ok, control: CONTROL, controlFired, failures, results }, null, 2));
console.log(`playProfileAvatar: ${ok ? 'PASS' : 'FAIL'}; ${results.reduce((n, r) => n + r.observations.length, 0)} profile states; ${unsafe.length} boundary/runtime errors; ${CONTROL ? `exact control=${!!exactControl}` : `${failures.length} failed checks`}`);
if (!ok) process.exitCode = 1;
