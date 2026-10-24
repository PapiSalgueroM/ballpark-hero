import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import pw from '../lib/playwrightLoader.mjs';
import { seed, checkFonts, pollDay, pollFixture } from './siteMenuNavigationSupport.mjs';

const UID = '00000000-0000-4000-8000-000000000129';
const NAME = 'Chrome fixture account with a deliberately long display name';
const WORST = { points: 98765, rank: 12345, streak: 365, played: 106 };
const BACKEND = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const sha = value => createHash('sha256').update(value).digest('hex');
function ownedControl(id, actual, mutate, judge, marker) {
  const before = JSON.stringify(actual), changed = structuredClone(actual);
  mutate(changed);
  const after = JSON.stringify(changed);
  assert.notEqual(sha(after), sha(before), 'CHROME_CONTROL_ACTUAL_RECORD_CHANGED_' + id);
  let caught = null;
  try { judge(changed); } catch (error) { caught = error; }
  assert(caught instanceof assert.AssertionError && caught.message.includes(marker), 'CHROME_CONTROL_OWNED_ASSERTION_' + id);
  return { id, baselineSha256: sha(before), changedSha256: sha(after), ownedMarker: marker, actualNativeAssertion: caught.message };
}

const GUARD_DENIAL_LINE = '[SIM_OFFLINE_BLOCK] external browser WebSocket wss://flawuiqbvjobmkfkauhw.supabase.co';
function judgeGuardDenial(value, expectedContext, publicKey) {
  assert.equal(value.context, expectedContext, 'CHROME_GEOMETRY_GUARD_CONTEXT');
  assert.equal(value.kind, 'source-realtime-owning-guard-denial', 'CHROME_GEOMETRY_GUARD_KIND');
  const url = new URL(value.url);
  assert.equal(url.origin, 'wss://flawuiqbvjobmkfkauhw.supabase.co', 'CHROME_GEOMETRY_GUARD_ORIGIN');
  assert(!url.username && !url.password && !url.hash, 'CHROME_GEOMETRY_GUARD_AUTHORITY');
  assert.equal(url.pathname, '/realtime/v1/websocket', 'CHROME_GEOMETRY_GUARD_PATH');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['apikey', 'vsn'], 'CHROME_GEOMETRY_GUARD_QUERY');
  assert.equal(url.searchParams.get('apikey'), publicKey, 'CHROME_GEOMETRY_GUARD_PUBLIC_SOURCE_KEY');
  assert.equal(url.searchParams.get('vsn'), '2.0.0', 'CHROME_GEOMETRY_GUARD_SOURCE_VERSION');
  assert.equal(value.urlSha256, sha(value.url), 'CHROME_GEOMETRY_GUARD_URL_HASH');
  assert.equal(value.urlBytes, Buffer.byteLength(value.url), 'CHROME_GEOMETRY_GUARD_URL_BYTES');
  assert(['BrowserContext', 'Page'].includes(value.ownerKind), 'CHROME_GEOMETRY_GUARD_OWNER_KIND');
  assert.equal(value.ownerContextMatches, true, 'CHROME_GEOMETRY_GUARD_OWNER_CONTEXT');
  assert.equal(value.contextPages, 1, 'CHROME_GEOMETRY_GUARD_ONE_ACTUAL_PAGE');
  assert.equal(value.pageContextMatches, true, 'CHROME_GEOMETRY_GUARD_PAGE_CONTEXT');
  assert.equal(value.pageUrl, 'http://127.0.0.1:4173/free-kick', 'CHROME_GEOMETRY_GUARD_ACTUAL_PAGE');
  assert.equal(value.session?.uid, UID, 'CHROME_GEOMETRY_GUARD_ACTUAL_FIXTURE_UID');
  assert.equal(value.session?.accessToken, 'harness.not.a.real.token', 'CHROME_GEOMETRY_GUARD_ACTUAL_FAKE_TOKEN');
  assert.equal(value.action, 'original-offline-guard-block-and-close', 'CHROME_GEOMETRY_GUARD_REJECTION_ACTION');
}
function judgeGuardSet(value, publicKey) {
  const expected = [320, 390, 430, 1280].map(width => width + '-navbar-auth-fixture');
  assert.equal(value.records.length, 4, 'CHROME_GEOMETRY_GUARD_FOUR_RECORDS');
  assert.equal(value.lines.length, 4, 'CHROME_GEOMETRY_GUARD_FOUR_BLOCK_LINES');
  assert.deepEqual(value.records.map(row => row.context).sort(), [...expected].sort(), 'CHROME_GEOMETRY_GUARD_CONTEXT_SET');
  for (const line of value.lines) assert.equal(line, GUARD_DENIAL_LINE, 'CHROME_GEOMETRY_GUARD_EXACT_BLOCK_LINE');
  for (const context of expected) judgeGuardDenial(value.records.find(row => row.context === context), context, publicKey);
}

function fixtureSeed(spec) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  localStorage.setItem('dukb-streaks-v1', JSON.stringify({ version: 1,
    global: { current: spec.worst.streak, longest: spec.worst.streak, lastDate: today }, perGame: {}, loginDates: [], totalPlays: 0, totalPoints: 0 }));
  localStorage.setItem('dukb-local-completions', JSON.stringify({ date: today, slugs: Array.from({ length: spec.worst.played }, (_, i) => 'g' + i) }));
  if (spec.signedIn) localStorage.setItem('sb-flawuiqbvjobmkfkauhw-auth-token', JSON.stringify({
    access_token: 'harness.not.a.real.token', token_type: 'bearer', expires_in: 999999,
    expires_at: Math.floor(Date.now() / 1000) + 999999, refresh_token: 'harness-refresh',
    user: { id: spec.uid, aud: 'authenticated', role: 'authenticated', email: 'harness@example.com',
      app_metadata: {}, user_metadata: {}, identities: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  }));
}
function measure() {
  const visible = node => node.isConnected && node.getClientRects().length > 0
    && getComputedStyle(node).display !== 'none' && !['hidden', 'collapse'].includes(getComputedStyle(node).visibility);
  const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  const describe = (node, role) => {
    const r = rect(node), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    const text = node.textContent.replace(/\s+/g, ' ').trim(), range = document.createRange();
    range.selectNodeContents(node);
    const textRects = [...range.getClientRects()].map(r => ({ x: r.x, right: r.right, y: r.y, bottom: r.bottom }));
    return { role, tag: node.tagName, label: node.getAttribute('aria-label'), text, rect: r,
      hit: !!hit && (hit === node || node.contains(hit)), hitTag: hit?.tagName ?? null,
      textClipped: node.scrollWidth > node.clientWidth + 1, textRects };
  };
  const header = document.querySelector('header[data-site-chrome]');
  const nav = document.querySelector('nav[data-site-menu-host]');
  const root = header || nav, row = root?.firstElementChild, items = [];
  if (row) {
    for (const node of row.querySelectorAll('button,a[href]')) if (visible(node))
      items.push(describe(node, node.getAttribute('aria-label') === 'Open site menu' ? 'menu' : node.getAttribute('aria-label') === 'Go back' ? 'back' : node.matches('a[href="/"]') ? 'logo' : 'control'));
    if (nav) for (const node of row.lastElementChild?.children || [])
      if (node.tagName === 'DIV' && visible(node)) items.push(describe(node, 'stat'));
    if (header) for (const node of row.lastElementChild?.children || [])
      if (node.tagName === 'DIV' && visible(node)) items.push(describe(node, 'streak'));
  }
  const triggers = [...document.querySelectorAll('button[aria-label="Open site menu"]')].filter(visible);
  const faces = [...document.fonts].map(face => ({ family: face.family, status: face.status }));
  return { href: location.href, y: scrollY, viewport: { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth },
    owner: header ? 'Header' : nav ? 'GameNavbar' : null, root: root ? rect(root) : null, row: row ? rect(row) : null,
    visibleTriggers: triggers.length, items, rowText: row?.textContent.replace(/\s+/g, ' ').trim() ?? '',
    fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces } };
}
function judge(sample, spec) {
  const { width, signedIn, route } = spec;
  assert.equal(sample.owner, route === '/' ? 'Header' : 'GameNavbar', 'CHROME_GEOMETRY_ACTUAL_HOST');
  assert.equal(sample.visibleTriggers, 1, 'CHROME_GEOMETRY_ONE_VISIBLE_MENU');
  assert(sample.row && sample.row.height > 0 && sample.row.height <= 120, 'CHROME_GEOMETRY_REAL_ROW');
  assert(sample.viewport.documentWidth <= width + 1, 'CHROME_GEOMETRY_DOCUMENT_WIDTH');
  assert.equal(sample.items.filter(row => row.role === 'menu').length, 1, 'CHROME_GEOMETRY_MENU_PRESENT');
  assert.equal(sample.items.filter(row => row.role === 'logo').length, 1, 'CHROME_GEOMETRY_LOGO_PRESENT');
  if (route === '/free-kick') assert.equal(sample.items.filter(row => row.role === 'back').length, 1, 'CHROME_GEOMETRY_BACK_PRESENT');
  for (const item of sample.items) {
    assert(item.rect.width > 0 && item.rect.height > 0 && item.rect.x >= -0.5 && item.rect.right <= width + 0.5
      && item.rect.y >= -0.5 && item.rect.bottom <= sample.viewport.height + 0.5, 'CHROME_GEOMETRY_CHILD_BOUNDS_' + item.role);
    assert.equal(item.hit, true, 'CHROME_GEOMETRY_ACTUAL_CHILD_HIT_' + item.role);
    if (item.role === 'menu' || item.role === 'back') assert(item.rect.width >= 44 && item.rect.height >= 44, 'CHROME_GEOMETRY_MENU_BACK_44');
  }
  for (let i = 0; i < sample.items.length; i++) for (let j = i + 1; j < sample.items.length; j++) {
    const a = sample.items[i], b = sample.items[j];
    const ox = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.x, b.rect.x);
    const oy = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.y, b.rect.y);
    assert(!(ox > 0.5 && oy > 0.5), 'CHROME_GEOMETRY_NESTED_CHILD_OVERLAP_' + a.role + '_' + b.role);
  }
  assert(sample.rowText.includes('365') || (route === '/free-kick' && !signedIn), 'CHROME_GEOMETRY_REAL_WORST_STREAK');
  if (route === '/free-kick' && signedIn) {
    assert.equal(sample.items.filter(row => row.role === 'stat').length, 4, 'CHROME_GEOMETRY_ALL_FOUR_STATS');
    for (const text of ['106', '98,765', '365', '#12345']) assert(sample.rowText.includes(text), 'CHROME_GEOMETRY_ACTUAL_WORST_VALUE_' + text);
  }
  if (route === '/' && !signedIn) for (const text of ['Log In', 'Sign Up']) assert(sample.rowText.includes(text), 'CHROME_GEOMETRY_GUEST_AUTH_' + text);
  if (route === '/' && signedIn) assert(sample.items.some(row => row.label === 'Account menu'), 'CHROME_GEOMETRY_REAL_ACCOUNT_LAYOUT');
  checkFonts(sample.fonts);
}
async function main() {
  const out = process.env.CHROME_RECIPE_OUT, base = 'http://127.0.0.1:4173';
  assert(process.env.CI && out && path.isAbsolute(out), 'CHROME_GEOMETRY_REMOTE_SETUP');
  assert.match(process.env.GITHUB_SHA || '', /^[a-f0-9]{40}$/, 'CHROME_GEOMETRY_ACTUAL_SOURCE');
  const client = fs.readFileSync('src/integrations/supabase/client.ts', 'utf8'), keyMatches = [...client.matchAll(/^export const SUPABASE_PUBLISHABLE_KEY = "([^"]+)";$/gm)];
  const clientBlob = createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + Buffer.byteLength(client) + '\0'), Buffer.from(client)])).digest('hex');
  assert.equal(clientBlob, 'd055e064f5c1c0c90230ca562966ee04dfdcd3ce', 'CHROME_GEOMETRY_SOURCE_CLIENT');
  assert.equal(keyMatches.length, 1, 'CHROME_GEOMETRY_ONE_ACTUAL_PUBLIC_KEY');
  const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
  assert.equal(lock.packages['node_modules/@supabase/realtime-js'].version, '2.95.3', 'CHROME_GEOMETRY_ACTUAL_LOCKED_REALTIME');
  assert.equal(lock.packages['node_modules/@supabase/supabase-js'].version, '2.95.3', 'CHROME_GEOMETRY_ACTUAL_LOCKED_CLIENT');

  const guardPath = process.env.CHROME_GEOMETRY_GUARD_COPY;
  assert(guardPath && path.isAbsolute(guardPath) && path.dirname(guardPath) === path.dirname(out), 'CHROME_GEOMETRY_BOUND_OBSERVATION_COPY');
  const guardBinding = JSON.parse(fs.readFileSync(path.join(path.dirname(out), 'geometry-guard-binding.json'), 'utf8'));
  assert.equal(guardBinding.sourceSha256, 'e60ff1534307e449ccef598e3b7470dcba58681b82cea4005cec7319f14f9221', 'CHROME_GEOMETRY_ORIGINAL_GUARD_PIN');
  assert.equal(guardBinding.copySha256, sha(fs.readFileSync(guardPath)), 'CHROME_GEOMETRY_OBSERVATION_COPY_PIN');
  assert.equal(guardBinding.copySha256, '9a5ed63e2ed4a4cdd62cc9d1bff8fe12f8f7589b1c02872c45ae92b8f9e8f915', 'CHROME_GEOMETRY_SELECTED_OBSERVATION_COPY');
  assert.equal(guardBinding.wholeInverseExact, true, 'CHROME_GEOMETRY_OBSERVATION_COPY_INVERSE');
  const guard = createRequire(import.meta.url)(guardPath);
  assert.equal(typeof guard.observeWebSocketDenials, 'function', 'CHROME_GEOMETRY_OBSERVATION_API');

  const publicKey = keyMatches[0][1], browser = await pw.chromium.launch({ args: ['--no-sandbox'] }), results = [], controls = [];
  const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  try {
    for (const width of [320, 390, 430, 1280]) for (const routePath of ['/', '/free-kick']) for (const signedIn of [false, true]) {
      const spec = { width, route: routePath, signedIn }, id = width + '-' + (routePath === '/' ? 'header' : 'navbar') + '-' + (signedIn ? 'auth-fixture' : 'guest-streak');
      const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
      const row = { id, spec, status: 'REFUSED', requests: [], sockets: [], console: [], errors: [], sample: null, failure: null };
      const pending = new Set(), day = new Date().toISOString().slice(0, 10);
      let page;
      const observe = promise => { pending.add(promise); promise.catch(error => row.errors.push(String(error.stack || error))).finally(() => pending.delete(promise)); };
      const emit = value => { row.requests.push(value); fs.appendFileSync(path.join(out, 'geometry-requests.jsonl'), JSON.stringify({ context: id, ...value }) + '\n'); };

      const stopObserving = guard.observeWebSocketDenials(context, (actualOwner, rawUrl) => observe((async () => {
        const pages = context.pages(), actualPage = pages.length === 1 ? pages[0] : null;
        const ownerContext = actualOwner === context ? context
          : typeof actualOwner.context === 'function' ? actualOwner.context() : null;
        const session = actualPage ? await actualPage.evaluate(() => {
          try {
            const value = JSON.parse(localStorage.getItem('sb-flawuiqbvjobmkfkauhw-auth-token') || 'null');
            return { uid: value?.user?.id ?? null, accessToken: value?.access_token ?? null };
          } catch { return null; }
        }) : null;
        const value = { context: id, kind: 'source-realtime-owning-guard-denial', url: rawUrl,
          urlSha256: sha(rawUrl), urlBytes: Buffer.byteLength(rawUrl),
          ownerKind: actualOwner === context ? 'BrowserContext' : ownerContext === context ? 'Page' : 'unknown',
          ownerContextMatches: ownerContext === context, contextPages: pages.length,
          pageContextMatches: actualPage?.context() === context, pageUrl: actualPage?.url() ?? null,
          session, action: 'original-offline-guard-block-and-close' };
        row.sockets.push(value);
        fs.appendFileSync(path.join(out, 'geometry-sockets.jsonl'), JSON.stringify(value) + '\n');
        assert(signedIn && routePath === '/free-kick', 'CHROME_GEOMETRY_GUARD_DECLARED_AUTH_CONTEXT');
        judgeGuardDenial(value, id, publicKey);
      })()));
      try {
        const initial = '(' + seed.toString() + ')(' + JSON.stringify({ theme: signedIn ? 'light' : 'dark', pending: false }) + ');(' + fixtureSeed.toString() + ')(' + JSON.stringify({ signedIn, uid: UID, worst: WORST }) + ');';
        await context.addInitScript({ content: initial });
        await context.routeWebSocket('**/*', socket => observe((async () => {
          const url = new URL(socket.url()), keys = [...url.searchParams.keys()].sort();
          const allowed = signedIn && routePath === '/free-kick' && url.origin === 'wss://flawuiqbvjobmkfkauhw.supabase.co'
            && !url.username && !url.password && !url.hash && url.pathname === '/realtime/v1/websocket'
            && keys.join('|') === 'apikey|vsn' && url.searchParams.get('apikey') === publicKey && url.searchParams.get('vsn') === '2.0.0';
          const value = { kind: allowed ? 'source-realtime-client-refusal' : 'unknown-websocket', origin: url.origin, path: url.pathname,
            queryKeys: keys, vsn: url.searchParams.get('vsn'), urlSha256: sha(socket.url()), urlBytes: Buffer.byteLength(socket.url()),
            fixtureUid: UID, source: 'useDailyLegend subscribe, locked supabase-js/realtime-js2.95.3', action: 'local-close1008-no-server-connection' };
          row.sockets.push(value);
          fs.appendFileSync(path.join(out, 'geometry-sockets.jsonl'), JSON.stringify({ context: id, ...value }) + '\n');
          if (!allowed) row.errors.push('Unknown websocket was locally refused');
          await socket.close({ code: 1008, reason: 'Offline layout fixture refuses realtime.' });
        })()));
        await context.route('**/*', async route => {
          const request = route.request(), url = new URL(request.url()), raw = request.postData();
          const poll = pollFixture(request, url, pollDay(Date.now()));
          if (poll && routePath === '/') {
            emit({ kind: 'source-home-poll-fixture', id: poll.id, method: request.method(), url: url.href, bodySha256: sha(poll.body) });
            return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: poll.body });
          }
          if (signedIn && url.origin === BACKEND && !url.username && !url.password && !url.hash && request.resourceType() === 'fetch') {
            let frame;
            try { frame = new URL(request.frame().url()); } catch { /* Unknown frame cannot acquire the fixture. */ }
            const sameFrame = frame?.origin === base && frame.pathname === routePath && !frame.search && !frame.hash;
            const headers = request.headers(), q = url.searchParams, entries = [...q.entries()];
            const keys = entries.map(([key]) => key).sort().join('|');
            const auth = headers.authorization === 'Bearer harness.not.a.real.token' && headers.apikey === publicKey;
            let fixture = null, response = '[]', requestBody = null;
            if (sameFrame && auth && request.method() === 'GET' && raw === null) {
              if (url.pathname === '/rest/v1/profiles' && keys === 'select|user_id' && q.get('select') === '*' && q.get('user_id') === 'eq.' + UID) {
                fixture = 'AuthContext.fetchProfile';
                response = JSON.stringify([{ id: '00000000-0000-4000-8000-000000000672', user_id: UID, username: 'harness', display_name: NAME,
                  avatar_url: null, streak_state: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }]);
              } else if (url.pathname === '/rest/v1/game_completions' && keys === 'completed_on|player_name|select'
                && q.get('select') === 'game' && q.get('player_name') === 'eq.' + NAME && q.get('completed_on') === 'eq.' + day) fixture = 'same-account-current-day-game-count';
              else if (routePath === '/' && url.pathname === '/rest/v1/user_best_scores' && keys === 'select|user_id'
                && q.get('select') === 'game_type,best_score' && q.get('user_id') === 'eq.' + UID) fixture = 'Index.current-account-best-scores';
              else if (routePath === '/free-kick' && ['/rest/v1/daily_badges', '/rest/v1/daily_completions'].includes(url.pathname)
                && keys === 'date|select|user_id' && q.get('user_id') === 'eq.' + UID && q.get('date') === 'eq.' + day
                && q.get('select') === (url.pathname.endsWith('/daily_badges') ? 'id,streak_days' : 'game_slug')) fixture = 'useDailyLegend.empty-read-no-badge-award';
            } else if (sameFrame && auth && request.method() === 'POST' && url.pathname === '/rest/v1/rpc/global_rank' && !url.search) {
              try {
                const body = JSON.parse(raw);
                if (body && !Array.isArray(body) && Object.keys(body).sort().join('|') === 'p_games|p_period|p_player'
                  && body.p_player === NAME && body.p_games === null && body.p_period === (routePath === '/' ? 'alltime' : 'today')) {
                  fixture = 'same-account-source-global-rank-read'; requestBody = body; response = JSON.stringify([{ total_points: WORST.points, rank: WORST.rank }]);
                }
              } catch { /* Malformed body remains unknown to the strict preload. */ }
            }
            if (fixture) {
              emit({ kind: 'source-auth-layout-read-fixture', source: fixture, fixtureUid: UID, method: request.method(), url: url.href,
                requestBody, requestBodySha256: raw === null ? null : sha(raw), requestBodyBytes: raw === null ? 0 : Buffer.byteLength(raw),
                responseSha256: sha(response), localOnly: true, writeSuccess: false });
              return route.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'cache-control': 'no-store' }, body: response });
            }
          }
          return route.fallback();
        });
        page = await context.newPage();
        page.on('pageerror', error => row.errors.push(String(error.stack || error)));
        page.on('console', message => { if (message.type() === 'error') { row.console.push({ text: message.text(), location: message.location() }); row.errors.push('Actual console error: ' + message.text()); } });
        page.setDefaultTimeout(15000);
        await page.goto(base + routePath, { waitUntil: 'domcontentloaded' });
        const owner = page.locator(routePath === '/' ? 'header[data-site-chrome]' : 'nav[data-site-menu-host]');
        await owner.waitFor({ state: 'visible' });
        if (signedIn) {
          if (routePath === '/') await page.waitForFunction(() => { const button = document.querySelector('header[data-site-chrome] button[aria-label="Account menu"]'); return !!button && !button.disabled; });
          else await page.waitForFunction(() => {
            const text = document.querySelector('nav[data-site-menu-host]')?.textContent || '';
            return text.includes('98,765') && text.includes('#12345') && text.includes('106') && text.includes('365');
          });
        } else if (routePath === '/') await page.waitForFunction(() => document.querySelector('header[data-site-chrome]')?.textContent.includes('365'));
        await page.evaluate(async () => { await document.fonts.ready; await document.fonts.load('16px Inter'); await document.fonts.load('16px "Space Grotesk"'); });
        row.sample = await page.evaluate(measure);
        write(id + '.raw.json', row.sample);
        await page.screenshot({ path: path.join(out, id + '.png') });
        judge(row.sample, spec);
        if (results.length === 0) {
          const menu = copy => copy.items.find(row => row.role === 'menu');
          controls.push(
            ownedControl('nested-overlap', row.sample, copy => { const first = menu(copy); Object.assign(copy.items.find(row => row.role === 'logo').rect, first.rect); }, copy => judge(copy, spec), 'CHROME_GEOMETRY_NESTED_CHILD_OVERLAP'),
            ownedControl('covered-menu-hit', row.sample, copy => { menu(copy).hit = false; }, copy => judge(copy, spec), 'CHROME_GEOMETRY_ACTUAL_CHILD_HIT_menu'),
            ownedControl('menu-under44', row.sample, copy => { const item = menu(copy); item.rect.width = 43; item.rect.right = item.rect.x + 43; }, copy => judge(copy, spec), 'CHROME_GEOMETRY_MENU_BACK_44'),
          );
        }
        if (signedIn) assert(row.requests.some(value => value.source === 'AuthContext.fetchProfile'), 'CHROME_GEOMETRY_REAL_PROFILE_READ_FOUNDATION');
        if (signedIn && routePath === '/free-kick') {
          assert(row.requests.some(value => value.source === 'same-account-source-global-rank-read'), 'CHROME_GEOMETRY_REAL_RANK_READ_FOUNDATION');
          while (pending.size) await Promise.allSettled([...pending]);
          assert.equal(row.sockets.length, 1, 'CHROME_GEOMETRY_ACTUAL_REALTIME_REFUSAL_FOUNDATION');
          judgeGuardDenial(row.sockets[0], id, publicKey);
        }
        row.status = 'PASS';
      } catch (error) {
        row.failure = String(error.stack || error);
        if (page && !page.isClosed()) {
          if (!row.sample) { row.sample = await page.evaluate(measure).catch(() => null); write(id + '.refusal.raw.json', row.sample); }
          await page.screenshot({ path: path.join(out, id + '.refusal.png') }).catch(error => row.errors.push(String(error)));
        }
      } finally {
        while (pending.size) await Promise.allSettled([...pending]);
        await context.close();
        while (pending.size) await Promise.allSettled([...pending]);
        stopObserving();
        if (row.errors.length) row.status = 'REFUSED';
        write(id + '.result.json', row); results.push(row);
      }
    }
  } finally { await browser.close(); }

  const guardRecordsPath = path.join(out, 'geometry-sockets.jsonl');
  const guardRecords = fs.existsSync(guardRecordsPath) ? fs.readFileSync(guardRecordsPath, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
  const guardLines = fs.readFileSync(process.env.SIM_OFFLINE_RECEIPT, 'utf8').split('\n').filter(Boolean);
  const guardActual = { records: guardRecords, lines: guardLines };
  let guardFailure = null;
  try { judgeGuardSet(guardActual, publicKey); } catch (error) { guardFailure = String(error.stack || error); }
  if (guardFailure === null) controls.push(
    ownedControl('guard-unknown-query', guardActual, copy => { copy.records[0].url += '&unknown=1'; }, copy => judgeGuardSet(copy, publicKey), 'CHROME_GEOMETRY_GUARD_QUERY'),
    ownedControl('guard-unknown-path', guardActual, copy => { copy.records[0].url = copy.records[0].url.replace('/realtime/v1/websocket', '/realtime/v1/unknown'); }, copy => judgeGuardSet(copy, publicKey), 'CHROME_GEOMETRY_GUARD_PATH'),
    ownedControl('guard-wrong-context', guardActual, copy => { copy.records[0].ownerContextMatches = false; }, copy => judgeGuardSet(copy, publicKey), 'CHROME_GEOMETRY_GUARD_OWNER_CONTEXT'),
    ownedControl('guard-extra-block', guardActual, copy => { copy.lines.push(GUARD_DENIAL_LINE); }, copy => judgeGuardSet(copy, publicKey), 'CHROME_GEOMETRY_GUARD_FOUR_BLOCK_LINES'),
  );

  const ioPath = path.join(out, 'browser-io.jsonl'), observed = fs.existsSync(ioPath) ? fs.readFileSync(ioPath, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line)) : null;
  const ioAllowed = new Set(['prepared-font', 'source-shell-fixture', 'source-conquest-completion-refusal', 'local-flag-abort']);
  const transportComplete = observed !== null && observed.every(row => row && ioAllowed.has(row.kind));
  const complete = results.length === 16 && results.every(row => row.status === 'PASS') && controls.length === 7 && transportComplete && guardFailure === null;
  write('geometry-report.json', { status: complete ? 'ACTUAL_SHARED_CHROME_NESTED_GEOMETRY_PASS' : 'SHARED_CHROME_GEOMETRY_REFUSED',
    source: process.env.GITHUB_SHA, base: process.env.BASE_SOURCE, complete, plannedContexts: 16, actualContexts: results.length, results, controls,
    strictPreloadTelemetry: { present: observed !== null, rows: observed?.length ?? null, allowed: transportComplete },
    owningGuardObservation: { copy: guardBinding, records: guardRecords, blockLines: guardLines, failure: guardFailure, rejectionLogicHeld: true, nativeProtocolsObserved: false },
    sourceBasis: { nativeFixturePattern: 'scripts/simMobileChrome.mjs Git76556f7b1ed64474dd792765f074d1b6cd574eab',
      actualComponents: ['Header', 'GameNavbar'], clientGit: clientBlob, supabaseLockVersion: '2.95.3',
      realtimeSource: 'supabase/supabase-js@v2.95.3 packages/core/realtime-js/src/RealtimeClient.ts and lib/constants.ts',
      socketApi: 'Actual Playwright BrowserContext/Page public identity and page.evaluate read only; owning offlineTransport original block and close retained.',
      protocolBasis: 'No WebSocket protocols argument observation. URL/public key/vsn basis is the pinned client and lock source.' },
    limits: ['Signed-in contexts are declared local fake-session layout fixtures, not real authentication, provider, badge or realtime integration.',
      'Only exact source-shaped local read fixtures are supplied. No provider request, server websocket connection, write success or badge award is supplied.',
      'Header wordmark clipping is recorded; deliberate Header truncation is not recast as a new full-word contract.',
      'Measurements are actual nested owner rectangles and centre hits at the initial document position, not all pages or every scroll position.'] });
  if (!complete) process.exitCode = 1;
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
