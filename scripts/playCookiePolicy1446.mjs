/* Round1446 remote-only browser proof. Original records three real missing
   outcomes and exits1. Green has four profiles, three copied-response faults
   and three exact restores. Application source/dist never changes here. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const PHASE = process.env.COOKIE_POLICY_PHASE || 'green';
const OUT = path.resolve(process.env.COOKIE_POLICY_BROWSER_OUT || path.join(ROOT, 'cookie-policy-browser-artifacts'));
const SOURCE = process.env.SOURCE_SHA || process.env.GITHUB_SHA;
const KEY = 'cookie-consent-v2', INIT = '__cookie1446_initialized', SAVE = '__cookie1446_essential_save';
const SAVE_BYTES = 'cookie-policy1446 essential fixture, keep exactly';
const BACKEND = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const sha = value => createHash('sha256').update(value).digest('hex');
const failure = error => ({ name: error.name, message: error.message, stack: error.stack });
const profiles = [
  { id: 'phone328', width: 328, height: 515 },
  { id: 'phone390', width: 390, height: 844 },
  { id: 'desktop1194', width: 1194, height: 642 },
  { id: 'phone390-reduced-gpc', width: 390, height: 844, reduced: true, gpc: true },
];
const markers = { route: 'COOKIE_BROWSER_ROUTE', footer: 'COOKIE_BROWSER_FOOTER_NAV',
  privacy: 'COOKIE_BROWSER_PRIVACY_LINK', copy: 'COOKIE_BROWSER_COPY', choices: 'COOKIE_BROWSER_CHOICES' };
const pausedCopy = 'Analytics is paused while we check its collection settings, so Accept all does not turn it on.';
const claims = [pausedCopy,
  'That period applies to your cookie choice, not a promise to delete game saves or provider records after 180 days.',
  'Pausing Google Analytics does not turn off ordinary hosting logs or hosting-provider usage information.',
  'Withdrawal does not erase information already received by a provider or remove cookies on another site or outside our code\'s access.',
];
const sourceFiles = ['src/App.tsx', 'src/pages/CookiePolicy.tsx', 'src/pages/PrivacyPolicy.tsx',
  'src/components/game/Footer.tsx', 'src/components/CookieConsent.tsx', 'src/lib/consentPreferences.ts',
  'src/lib/consentedScripts.ts', 'src/components/ads/AdBanner.tsx', 'src/lib/pageSchema.ts',
  'src/lib/liveScores.ts', 'src/hooks/useMostPlayed.ts', 'scripts/genSitemap.mjs', 'scripts/simIndexNow.mjs',
  'public/llms.txt', 'package.json', 'package-lock.json', 'scripts/lib/offlineTransport.cjs', 'scripts/playCookiePolicy1446.mjs'];
const report = { v: 1, phase: PHASE, source: SOURCE, status: 'RUNNING', complete: false,
  original: [], positives: [], faults: [], restorations: [], errors: [], transportPredicateControls: [],
  actualOutbound: 0, holds: {}, fixtureScope: 'Exact cached fonts and two source-bound shell lookups fulfilled locally. No provider/backend transport.' };
let browser, fonts, fontManifest, staticFiles;
fs.mkdirSync(OUT, { recursive: true });
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), value);
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const region = page => page.getByRole('region', { name: 'Cookie choices', exact: true });
const footer = page => page.locator('footer').getByRole('link', { name: 'Cookie Policy', exact: true });
const opener = page => page.locator('footer').getByRole('button', { name: 'Cookie choices', exact: true });
const privacyLink = page => page.getByRole('heading', { name: /^2\. Cookies/ }).locator('..').getByRole('link', { name: 'Cookie Policy', exact: true });
const sourceHold = () => sourceFiles.map(file => {
  const full = path.join(ROOT, file);
  return fs.existsSync(full) ? { file, bytes: fs.statSync(full).size, sha256: sha(fs.readFileSync(full)) } : { file, absent: true };
});
function inventory(directory, relative = '') {
  const rows = [];
  for (const name of fs.readdirSync(path.join(directory, relative)).sort()) {
    const child = relative ? relative + '/' + name : name;
    const stat = fs.lstatSync(path.join(directory, child));
    assert(!stat.isSymbolicLink(), 'COOKIE_SETUP: no symbolic node in completed dist');
    if (stat.isDirectory()) rows.push(...inventory(directory, child));
    else { assert(stat.isFile(), 'COOKIE_SETUP: regular completed dist files only'); rows.push({ file: child, bytes: stat.size, sha256: sha(fs.readFileSync(path.join(directory, child))) }); }
  }
  return rows;
}
function staticRequest(url, method) {
  assert.equal(url.origin, BASE, 'COOKIE_TRANSPORT: exact loopback origin');
  assert(!url.username && !url.password && !url.search && !url.hash, 'COOKIE_TRANSPORT: no credentials/query/fragment');
  assert(['GET', 'HEAD'].includes(method), 'COOKIE_TRANSPORT: static GET/HEAD only');
  assert(!/^\/(?:rest|auth|functions|storage)\//.test(url.pathname), 'COOKIE_TRANSPORT: no backend path');
  assert(['/', '/privacy', '/cookie-policy'].includes(url.pathname) || staticFiles.has(url.pathname), 'COOKIE_TRANSPORT: fixed page or exact completed-dist file');
}
function predicateControls() {
  staticRequest(new URL(BASE + '/'), 'GET');
  for (const [name, href, method] of [
    ['foreign-origin', 'https://example.com/', 'GET'], ['credential', BASE.replace('://', '://fixture:fixture@') + '/', 'GET'],
    ['query', BASE + '/?private=fixture', 'GET'], ['write-method', BASE + '/', 'POST'],
    ['backend-path', BASE + '/rest/v1/profiles', 'GET'], ['unknown-file', BASE + '/assets/nonexistent-cookie1446.js', 'GET'],
  ]) {
    const before = JSON.stringify({ href: BASE + '/', method: 'GET' }), after = JSON.stringify({ href, method });
    assert.notEqual(before, after);
    let caught;
    try { staticRequest(new URL(href), method); } catch (error) { caught = error; }
    assert(caught?.name === 'AssertionError' && caught.message.startsWith('COOKIE_TRANSPORT:'), 'COOKIE_SETUP: ineffective/wrong transport predicate control');
    report.transportPredicateControls.push({ name, beforeSha256: sha(before), afterSha256: sha(after), error: failure(caught), networkAttempted: false });
  }
}
function shellFixture(request, url) {
  if (url.origin !== BACKEND || url.username || url.password || url.hash) return null;
  if (request.method() === 'POST' && url.pathname === '/rest/v1/rpc/most_played_today' && !url.search) {
    const body = request.postData(), parsed = JSON.parse(body || 'null');
    if (parsed && Object.keys(parsed).sort().join('|') === 'p_limit|p_min' && parsed.p_min === 3 && parsed.p_limit === 3)
      return { id: 'source-most-played-today-3-3', body: '[]', requestBodySha256: sha(body) };
  }
  if (request.method() === 'GET' && url.pathname === '/rest/v1/live_scores') {
    const q = url.searchParams, times = q.getAll('start_at');
    if ([...q.keys()].sort().join('|') === 'limit|order|select|start_at|start_at' && q.get('select') === '*'
      && q.get('order') === 'start_at.asc' && q.get('limit') === '150' && times.length === 2
      && /^gte\.\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(times[0])
      && /^lte\.\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(times[1])
      && Date.parse(times[1].slice(4)) - Date.parse(times[0].slice(4)) === 32 * 3600 * 1000)
      return { id: 'source-live-scores-12h-20h-limit150', body: '[]', date: new Date(Date.parse(times[0].slice(4)) + 12 * 3600 * 1000).toUTCString() };
  }
  return null;
}
async function open(profile, id, control) {
  const row = { id, width: profile.width, height: profile.height, reduced: !!profile.reduced, gpc: !!profile.gpc,
    checks: [], allowedRequests: [], knownFixtures: [], cachedFonts: [], blocked: [], pageErrors: [], consoleErrors: [], http: [], servedCopies: [], attemptedRequests: 0, responseCount: 0, requestBudget: 2048 };
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height },
    deviceScaleFactor: 1, isMobile: profile.width < 600, hasTouch: profile.width < 600,
    reducedMotion: profile.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  try {
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      row.attemptedRequests += 1;
      if (row.attemptedRequests > row.requestBudget) {
        row.requestBudgetExceeded = true;
        if (row.blocked.length < 16) row.blocked.push({ method: request.method(), origin: url.origin, path: url.pathname, reason: 'bounded request budget exceeded' });
        await route.abort('blockedbyclient'); return;
      }
      try {
        if (url.origin === BASE) {
          staticRequest(url, request.method());
          row.allowedRequests.push({ method: request.method(), path: url.pathname, resourceType: request.resourceType() });
          if (control && request.method() === 'GET' && url.pathname === control.asset) {
            assert.equal(sha(fs.readFileSync(path.join(DIST, control.asset.slice(1)))), control.beforeSha256, 'COOKIE_SETUP: held dist control source changed');
            row.servedCopies.push({ asset: control.asset, originalSha256: control.beforeSha256, servedSha256: control.afterSha256, bytes: Buffer.byteLength(control.changed) });
            return await route.fulfill({ status: 200, contentType: 'application/javascript', headers: { 'cache-control': 'no-store' }, body: control.changed });
          }
          return await route.continue();
        }
        if (request.method() === 'GET' && fonts.has(url.href)) {
          const font = fonts.get(url.href);
          row.cachedFonts.push({ url: url.href, resourceType: request.resourceType(), sha256: font.sha256, manifestSha256: sha(fontManifest) });
          return await route.fulfill({ status: 200, contentType: font.contentType, body: font.body });
        }
        const fixture = shellFixture(request, url);
        if (fixture) {
          row.knownFixtures.push({ id: fixture.id, method: request.method(), origin: url.origin, path: url.pathname,
            query: url.search, requestBodySha256: fixture.requestBodySha256, responseSha256: sha(fixture.body), forwarded: false });
          return await route.fulfill({ status: 200, contentType: 'application/json', body: fixture.body,
            headers: { 'access-control-allow-origin': '*', ...(fixture.date ? { date: fixture.date } : {}) } });
        }
        row.blocked.push({ method: request.method(), origin: url.origin, path: url.pathname, reason: 'not an exact cached font or approved shell fixture' });
        await route.abort('blockedbyclient');
      } catch (error) {
        row.blocked.push({ method: request.method(), origin: url.origin, path: url.pathname, error: failure(error) });
        await route.abort('blockedbyclient');
      }
    });
    await context.addInitScript(({ key, init, save, bytes, gpc }) => {
      if (!localStorage.getItem(init)) {
        localStorage.setItem(key, JSON.stringify({ version: 2, advertising: !!gpc, analytics: !!gpc, updatedAt: Date.now() }));
        localStorage.setItem(save, bytes); localStorage.setItem(init, '1');
      }
      if (gpc) Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: true });
    }, { key: KEY, init: INIT, save: SAVE, bytes: SAVE_BYTES, gpc: !!profile.gpc });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', error => row.pageErrors.push(failure(error)));
    page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
    page.on('response', response => { const url = new URL(response.url()); if (url.origin === BASE) { row.responseCount += 1; if (row.http.length < row.requestBudget) row.http.push({ method: response.request().method(), path: url.pathname, status: response.status() }); } });
    return { row, page, context, control };
  } catch (error) { await context.close(); throw error; }
}
async function settled(page) {
  await page.locator('footer').getByRole('button', { name: 'Cookie choices', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready); await frames(page);
}
async function go(page, route) { await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 }); await settled(page); }
async function checked(view, marker, action) {
  try { const detail = await action(); view.row.checks.push({ marker, status: 'PASS', detail }); return detail; }
  catch (error) { view.row.checks.push({ marker, status: 'FAIL', error: failure(error) }); throw error; }
}
async function foundation(view) {
  const { page, row } = view;
  await go(page, '/privacy'); await page.getByRole('heading', { name: 'Privacy Policy', exact: true }).waitFor();
  await checked(view, 'COOKIE_FOUNDATION', async () => {
    assert.equal(await opener(page).count(), 1, 'COOKIE_FOUNDATION: existing footer opener');
    assert.equal(await page.getByRole('heading', { name: /^2\. Cookies/ }).count(), 1, 'COOKIE_FOUNDATION: existing privacy section');
    assert.equal(await region(page).count(), 0, 'COOKIE_FOUNDATION: saved choice starts closed');
    assert(row.cachedFonts.some(x => x.resourceType === 'stylesheet') && row.cachedFonts.some(x => x.resourceType === 'font'), 'COOKIE_FOUNDATION: actual font fixtures used');
    await clean(view);
    return { privacyH1: true, existingChoicesOpener: true, fontsUsed: row.cachedFonts.length };
  });
}
async function geometry(view) {
  const { page } = view;
  return await checked(view, 'COOKIE_BROWSER_GEOMETRY', async () => {
    const value = { configuredWidth: page.viewportSize().width,
      ...await page.evaluate(() => ({ innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth })) };
    assert(Math.abs(value.innerWidth - value.configuredWidth) <= 2 && value.document <= value.configuredWidth + 2 && value.body <= value.configuredWidth + 2,
      'COOKIE_BROWSER_GEOMETRY: actual widths fit fixed configured viewport ' + JSON.stringify(value));
    return value;
  });
}
async function policy(view) {
  const { page } = view;
  await page.getByRole('heading', { name: 'Cookie Policy', exact: true }).waitFor(); await frames(page);
  await checked(view, markers.route, async () => {
    assert.equal(new URL(page.url()).pathname, '/cookie-policy', markers.route + ': actual route');
    const headings = page.locator('#dukb-main h1');
    assert.equal(await headings.count(), 1, markers.route + ': one actual main H1');
    assert.equal((await headings.innerText()).trim(), 'Cookie Policy', markers.route + ': real policy instead of fallback');
    assert(await headings.isVisible(), markers.route + ': heading visible');
    assert.equal(await page.locator('link[rel="canonical"]').count(), 1, markers.route + ': one canonical');
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://douknowball.com/cookie-policy', markers.route + ': own canonical');
    assert.equal(await page.locator('meta[name="robots"][content*="noindex"]').count(), 0, markers.route + ': public policy indexable');
    return { path: '/cookie-policy', h1: 'Cookie Policy' };
  });
  await checked(view, markers.copy, async () => {
    const main = page.locator('#dukb-main');
    for (const line of claims) {
      const paragraph = main.locator('p').filter({ hasText: line });
      assert.equal(await paragraph.count(), 1, markers.copy + ': one actual statement: ' + line);
      assert(await paragraph.isVisible(), markers.copy + ': statement visible: ' + line);
    }
    const back = main.getByRole('link', { name: 'Back to games', exact: true });
    assert.equal(await back.getAttribute('href'), '/', markers.copy + ': back path');
    const box = await back.boundingBox();
    assert(box && box.width >= 43.5 && box.height >= 43.5, markers.copy + ': new back action44px');
    return { statements: claims.length, back: box };
  });
  await geometry(view);
}
async function follow(view, link, marker) {
  const { page } = view;
  await checked(view, marker, async () => {
    assert.equal(await link.count(), 1, marker + ': one actual link');
    const href = await link.getAttribute('href');
    assert(href === '/cookie-policy' || href === '/privacy', marker + ': bounded link target');
    await link.click(); await frames(page);
    assert.equal(new URL(page.url()).pathname, '/cookie-policy', marker + ': trusted click reaches policy');
    await page.getByRole('heading', { name: 'Cookie Policy', exact: true }).waitFor();
    return { href, actualPath: new URL(page.url()).pathname };
  });
}
async function assertChoices(view) {
  const { page, row } = view;
  await checked(view, markers.choices, async () => {
    await opener(page).click(); await frames(page);
    assert.equal(await region(page).count(), 1, markers.choices + ': trusted footer click opens choices');
    assert(await region(page).isVisible(), markers.choices + ': region visible');
    const status = region(page).locator('[data-analytics-paused-status]');
    assert.equal(await status.count(), 1, markers.choices + ': actual paused status');
    assert.match(await status.innerText(), /Analytics is paused\.\s+Google Analytics is off while we check its privacy settings\./, markers.choices + ': GA stays paused');
    assert.equal(await region(page).getByRole('checkbox', { name: /Analytics/i }).count(), 0, markers.choices + ': no Analytics control');
    for (const name of ['Reject all', 'Accept all', 'Save choices']) {
      const button = region(page).getByRole('button', { name, exact: true });
      assert.equal(await button.count(), 1, markers.choices + ': existing ' + name);
      const box = await button.boundingBox();
      assert(box && box.width >= 43.5 && box.height >= 43.5, markers.choices + ': existing target44px ' + name);
    }
    const advertising = region(page).getByRole('checkbox', { name: 'Advertising', exact: true });
    assert.equal(await advertising.isDisabled(), row.gpc, markers.choices + ': GPC state');
    if (row.gpc) assert.equal(await advertising.isChecked(), false, markers.choices + ': GPC keeps advertising off');
    return { paused: true, gpc: row.gpc, advertisingDisabled: await advertising.isDisabled() };
  });
}
async function choiceRecord(view, expectedAdvertising) {
  const value = await view.page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  assert.equal(value.version, 2, markers.choices + ': saved choice version');
  assert.equal(value.advertising, expectedAdvertising, markers.choices + ': saved advertising');
  assert.equal(value.analytics, false, markers.choices + ': saved Analytics off');
  view.row.choiceRecords ??= []; view.row.choiceRecords.push(value);
}
async function consentWalk(view) {
  const { page, row } = view;
  await assertChoices(view);
  await region(page).getByRole('button', { name: 'Reject all', exact: true }).click();
  await region(page).waitFor({ state: 'hidden' }); await choiceRecord(view, false);
  await assertChoices(view);
  await region(page).getByRole('button', { name: 'Accept all', exact: true }).click();
  await region(page).waitFor({ state: 'hidden' }); await choiceRecord(view, !row.gpc); await clean(view);
  await assertChoices(view);
  if (!row.gpc) await region(page).getByRole('checkbox', { name: 'Advertising', exact: true }).uncheck();
  const reloaded = row.gpc ? null : page.waitForEvent('framenavigated', { predicate: frame => frame === page.mainFrame(), timeout: 15000 });
  await region(page).getByRole('button', { name: 'Save choices', exact: true }).click();
  if (reloaded) { await reloaded; await settled(page); await page.getByRole('heading', { name: 'Cookie Policy', exact: true }).waitFor(); }
  else await region(page).waitFor({ state: 'hidden' });
  await choiceRecord(view, false); await clean(view);
  await assertChoices(view);
  const before = await page.evaluate(key => localStorage.getItem(key), KEY);
  await region(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await region(page).waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Cookie choices');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), before, markers.choices + ': cancel preserves exact choices');
}
async function clean(view) {
  const { page, row } = view;
  assert(!row.requestBudgetExceeded, 'COOKIE_TRANSPORT: bounded request budget');
  assert.equal(row.blocked.length, 0, 'COOKIE_TRANSPORT: no unexpected attempted request');
  assert.equal(row.pageErrors.length, 0, 'COOKIE_SETUP: no page exception');
  assert.equal(await page.locator('script[src*="googletagmanager.com"],script[src*="google-analytics.com"],script[src*="googlesyndication.com"]').count(), 0, 'COOKIE_TRANSPORT: no vendor tag');
  assert.equal(await page.evaluate(() => !!window.gtag || !!window.dataLayer), false, 'COOKIE_TRANSPORT: no Analytics bootstrap');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), SAVE), SAVE_BYTES, 'COOKIE_BROWSER_STATE: essential bytes held');
}
async function walk(profile, id, control) {
  let view;
  try {
    view = await open(profile, id, control); await foundation(view);
    await follow(view, footer(view.page), markers.footer); await policy(view);
    await view.page.getByRole('link', { name: 'Back to games', exact: true }).click();
    await view.page.getByRole('textbox', { name: 'Search games', exact: true }).waitFor();
    assert.equal(new URL(view.page.url()).pathname, '/', markers.route + ': home back action');
    await go(view.page, '/cookie-policy'); await policy(view);
    await go(view.page, '/privacy'); await follow(view, privacyLink(view.page), markers.privacy); await policy(view);
    await consentWalk(view); await policy(view); await clean(view);
    assert.equal(view.row.consoleErrors.length, 0, 'COOKIE_SETUP: no console error'); view.row.status = 'PASS';
  } catch (error) {
    if (!view) return { id, status: 'FAIL', setupError: failure(error) };
    view.row.status = 'FAIL'; view.row.error = failure(error);
  } finally {
    if (view) {
      try {
        view.row.screenshot = id + '.png';
        await view.page.screenshot({ path: path.join(OUT, view.row.screenshot), fullPage: true, animations: 'disabled' });
        if (view.row.status !== 'PASS') write(id + '.html', await view.page.content());
        await clean(view);
      } catch (error) { view.row.finalError = failure(error); view.row.status = 'FAIL'; }
      await view.context.close();
    }
  }
  return view.row;
}
async function original() {
  const view = await open(profiles[0], 'original328');
  report.originalFoundation = view.row; view.row.status = 'RUNNING';
  try {
    await foundation(view); await assertChoices(view);
    await region(view.page).getByRole('button', { name: 'Cancel', exact: true }).click(); await region(view.page).waitFor({ state: 'hidden' });
    const capture = async (marker, action) => {
      try { await action(); report.original.push({ marker, status: 'UNEXPECTED_PASS' }); }
      catch (error) { report.original.push({ marker, status: 'OBSERVED_FAILURE', error: failure(error) }); }
    };
    await go(view.page, '/cookie-policy');
    await view.page.getByRole('heading', { name: '404: Shot went wide', exact: true }).waitFor();
    report.originalRoute = { heading: await view.page.locator('#dukb-main h1').innerText(), url: view.page.url(),
      robots: await view.page.locator('meta[name="robots"]').getAttribute('content') };
    assert.match(report.originalRoute.heading, /^404: Shot went wide$/, 'COOKIE_SETUP: actual original404, not incomplete loading');
    assert.match(report.originalRoute.robots, /noindex/, 'COOKIE_SETUP: original404 noindexed');
    await view.page.screenshot({ path: path.join(OUT, 'original-missing-route.png'), animations: 'disabled' });
    write('original-missing-route.html', await view.page.content());
    await capture(markers.route, async () => {
      assert.equal((await view.page.locator('#dukb-main h1').innerText()).trim(), 'Cookie Policy', markers.route + ': missing original policy page');
    });
    await go(view.page, '/privacy'); await view.page.getByRole('heading', { name: 'Privacy Policy', exact: true }).waitFor();
    await capture(markers.footer, async () => { assert.equal(await footer(view.page).count(), 1, markers.footer + ': missing original footer policy link'); });
    await capture(markers.privacy, async () => { assert.equal(await privacyLink(view.page).count(), 1, markers.privacy + ': missing original Privacy cross-link'); });
    await clean(view);
    assert(view.row.consoleErrors.every(line => line === '404 Error: User attempted to access non-existent route: /cookie-policy'), 'COOKIE_SETUP: only actual original404 console observation expected');
    assert.equal(report.original.length, 3);
    for (const result of report.original) assert(result.status === 'OBSERVED_FAILURE' && result.error.name === 'AssertionError'
      && result.error.message.startsWith(result.marker + ':'), 'COOKIE_SETUP: three owned outcome failures, not setup');
    view.row.status = 'PASS'; report.originalFoundation = view.row; report.originalAdmitted = true;
    await view.page.screenshot({ path: path.join(OUT, 'original-foundation.png'), animations: 'disabled' });
  } finally { await view.context.close(); }
}
function changedCopy(id, asset, original, before, after, marker) {
  assert.equal(original.split(before).length - 1, 1, 'COOKIE_SETUP: unique actual compiled control anchor ' + id);
  const changed = original.replace(before, after);
  assert.notEqual(changed, original, 'COOKIE_SETUP: actual compiled byte change');
  assert.equal(changed.split(after).length - 1, 1, 'COOKIE_SETUP: unique copied inverse anchor ' + id);
  assert.equal(changed.replace(after, before), original, 'COOKIE_SETUP: whole compiled inverse ' + id);
  write(id + '-original.js', original); write(id + '-changed.js', changed);
  return { id, asset, beforeSha256: sha(original), afterSha256: sha(changed), original, changed, expectedMarker: marker,
    originalArtifact: id + '-original.js', changedArtifact: id + '-changed.js', wholeInverseExact: true };
}
function controls() {
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const tags = [...html.matchAll(/<script\b[^>]*>/g)].map(x => x[0]).filter(tag => /\btype=["']module["']/.test(tag));
  assert.equal(tags.length, 1, 'COOKIE_SETUP: one real compiled entry tag');
  const entry = tags[0].match(/\bsrc=(["'])(\/assets\/[^"'?\s]+\.js)\1/)?.[2];
  assert(entry && staticFiles.has(entry), 'COOKIE_SETUP: exact completed entry file');
  const text = fs.readFileSync(path.join(DIST, entry.slice(1)), 'utf8');
  const footerAnchor = 'to:"/cookie-policy",className:"underline hover:text-foreground transition-colors",children:"Cookie Policy"';
  const copies = [changedCopy('wrong-footer-destination', entry, text, footerAnchor,
    footerAnchor.replace('to:"/cookie-policy"', 'to:"/privacy"'), markers.footer)];
  const cookieChunks = [...staticFiles.keys()].filter(file => file.endsWith('.js') && fs.readFileSync(path.join(DIST, file.slice(1)), 'utf8').includes(pausedCopy));
  assert.equal(cookieChunks.length, 1, 'COOKIE_SETUP: unique actual compiled policy disclosure chunk');
  const cookieText = fs.readFileSync(path.join(DIST, cookieChunks[0].slice(1)), 'utf8');
  copies.push(changedCopy('missing-paused-disclosure', cookieChunks[0], cookieText, pausedCopy,
    'Analytics details are unavailable in this copied control.', markers.copy));
  const openerPattern = /onClick:([A-Za-z_$][\w$]*)=>([A-Za-z_$][\w$]*)\(\1\.currentTarget\),className:"underline hover:text-foreground transition-colors",children:"Cookie choices"/g;
  const opening = [...text.matchAll(openerPattern)];
  assert.equal(opening.length, 1, 'COOKIE_SETUP: unique actual compiled footer choices callback');
  copies.push(changedCopy('noop-cookie-choices', entry, text, opening[0][0],
    'onClick:()=>{},className:"underline hover:text-foreground transition-colors",children:"Cookie choices"', markers.choices));
  return copies;
}
try {
  assert.equal(fs.readdirSync(OUT).length, 0, 'COOKIE_SETUP: fresh artifact directory');
  assert(['original', 'green'].includes(PHASE), 'COOKIE_SETUP: recognized phase');
  assert.match(SOURCE || '', /^[a-f0-9]{40}$/, 'COOKIE_SETUP: exact remote source SHA');
  assert.equal(new URL(BASE).origin, BASE, 'COOKIE_SETUP: bare origin');
  assert.equal(new URL(BASE).hostname, '127.0.0.1', 'COOKIE_SETUP: literal127 loopback only');
  assert.equal(new URL(BASE).protocol, 'http:', 'COOKIE_SETUP: local completed HTTP build');
  assert(OUT !== DIST && !OUT.startsWith(DIST + path.sep), 'COOKIE_SETUP: artifacts outside held dist');
  const preload = path.join(ROOT, 'scripts/lib/offlineTransport.cjs');
  assert.equal((process.env.NODE_OPTIONS || '').trim().split(/\s+/)[0], '--require=' + preload, 'COOKIE_SETUP: offline preload must be first');
  assert(process.env.SIM_OFFLINE_RECEIPT && fs.existsSync(process.env.SIM_OFFLINE_RECEIPT), 'COOKIE_SETUP: existing offline receipt');
  assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size, 0, 'COOKIE_SETUP: no previous transport refusal');
  report.holds.before = sourceHold();
  const distBefore = inventory(DIST);
  assert(distBefore.length > 100, 'COOKIE_SETUP: completed production dist');
  staticFiles = new Map(distBefore.map(row => ['/' + row.file, row]));
  report.holds.distBefore = { files: distBefore.length, sha256: sha(JSON.stringify(distBefore)) };
  write('dist-before.sha256', distBefore.map(row => row.sha256 + '  ' + row.file).join('\n') + '\n');
  assert(process.env.FREE_KICK_FONT_CACHE, 'COOKIE_SETUP: exact prefetched font cache');
  fontManifest = fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, 'manifest.json'));
  if (process.env.FONT_CACHE_MANIFEST_SHA256) assert.equal(sha(fontManifest), process.env.FONT_CACHE_MANIFEST_SHA256, 'COOKIE_SETUP: expected font manifest');
  fonts = new Map(JSON.parse(fontManifest).map(row => {
    const url = new URL(row.url);
    assert(url.protocol === 'https:' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname) && !url.username && !url.password, 'COOKIE_SETUP: exact font provider fixture');
    const file = path.resolve(process.env.FREE_KICK_FONT_CACHE, row.file);
    assert(file.startsWith(path.resolve(process.env.FREE_KICK_FONT_CACHE) + path.sep), 'COOKIE_SETUP: body stays in font cache');
    const body = fs.readFileSync(file); assert.equal(sha(body), row.sha256, 'COOKIE_SETUP: cached font body SHA');
    return [row.url, { ...row, file, body }];
  }));
  predicateControls(); browser = await chromium.launch({ headless: true });
  if (PHASE === 'original') await original();
  else {
    for (const profile of profiles) report.positives.push(await walk(profile, profile.id));
    assert(report.positives.every(row => row.status === 'PASS' && !row.finalError), 'COOKIE_SETUP: all four actual profiles pass before copied controls');
    let healthy = report.positives[0];
    for (const control of controls()) {
      assert.equal(healthy.status, 'PASS', 'COOKIE_SETUP: actual healthy same-profile precondition');
      const row = await walk(profiles[0], 'fault-' + control.id, control);
      const detected = row.status === 'FAIL' && !row.setupError && !row.finalError && row.error?.name === 'AssertionError'
        && row.error.message.startsWith(control.expectedMarker + ':') && row.servedCopies.length > 0
        && row.checks.filter(item => item.status === 'FAIL').length === 1
        && row.checks.find(item => item.status === 'FAIL').marker === control.expectedMarker;
      report.faults.push({ ...row, expectedMarker: control.expectedMarker, detected, preconditionCase: healthy.id,
        asset: control.asset, beforeSha256: control.beforeSha256, afterSha256: control.afterSha256,
        originalArtifact: control.originalArtifact, changedArtifact: control.changedArtifact, wholeInverseExact: control.wholeInverseExact });
      const originalResponse = { ...control, changed: control.original, afterSha256: control.beforeSha256 };
      const restored = await walk(profiles[0], 'restored-' + control.id, originalResponse);
      restored.asset = control.asset; restored.restoredSha256 = sha(fs.readFileSync(path.join(DIST, control.asset.slice(1))));
      restored.wholeByteRestoration = restored.restoredSha256 === control.beforeSha256 && restored.servedCopies?.length > 0
        && restored.servedCopies.every(item => item.servedSha256 === control.beforeSha256);
      report.restorations.push(restored); healthy = restored;
      assert(detected, 'COOKIE_SETUP: copied control must serve changed bytes and fail its own outcome ' + control.id);
      assert(restored.status === 'PASS' && !restored.finalError && restored.wholeByteRestoration, 'COOKIE_SETUP: exact original response and actual restored walk ' + control.id);
    }
  }
} catch (error) { report.errors.push(failure(error)); }
finally {
  try { if (browser) await browser.close(); }
  catch (error) { report.errors.push(failure(error)); }
  try {
    report.holds.after = sourceHold(); assert.deepEqual(report.holds.after, report.holds.before, 'COOKIE_HOLD: source bytes/presence unchanged');
    const after = inventory(DIST); write('dist-after.sha256', after.map(row => row.sha256 + '  ' + row.file).join('\n') + '\n');
    report.holds.distAfter = { files: after.length, sha256: sha(JSON.stringify(after)) };
    assert.deepEqual(report.holds.distAfter, report.holds.distBefore, 'COOKIE_HOLD: complete dist path/byte inventory unchanged');
    for (const font of fonts?.values() || []) assert.equal(sha(fs.readFileSync(font.file)), font.sha256, 'COOKIE_HOLD: cached font bytes unchanged');
    assert.equal(sha(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, 'manifest.json'))), sha(fontManifest), 'COOKIE_HOLD: exact font manifest unchanged');
    assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size, 0, 'COOKIE_HOLD: zero offline transport attempts');
    report.holds.unchanged = true;
  } catch (error) { report.errors.push(failure(error)); }
  report.complete = report.errors.length === 0 && report.holds.unchanged === true
    && (PHASE === 'original' ? report.originalAdmitted === true : report.positives.length === 4 && report.faults.length === 3 && report.restorations.length === 3
      && report.positives.every(row => row.status === 'PASS') && report.faults.every(row => row.detected) && report.restorations.every(row => row.status === 'PASS' && row.wholeByteRestoration));
  report.status = report.complete ? (PHASE === 'original' ? 'ORIGINAL_GAPS_OBSERVED' : 'PASS') : 'FAIL';
  write('report.json', JSON.stringify(report, null, 2) + '\n');
  const files = fs.readdirSync(OUT).filter(name => name !== 'evidence.sha256').sort();
  assert(files.every(name => fs.lstatSync(path.join(OUT, name)).isFile() && !fs.lstatSync(path.join(OUT, name)).isSymbolicLink()), 'COOKIE_EVIDENCE: flat regular files only');
  write('evidence.sha256', files.map(name => sha(fs.readFileSync(path.join(OUT, name))) + '  ' + name).join('\n') + '\n');
}
console.log('COOKIE_POLICY_BROWSER_RESULT ' + JSON.stringify({ status: report.status, phase: PHASE, originalOutcomes: report.original.length,
  profiles: report.positives.length, faults: report.faults.length, restorations: report.restorations.length,
  setupErrors: report.errors.length, sourceAndDistHeld: report.holds.unchanged, actualOutbound: report.actualOutbound }));
process.exitCode = PHASE === 'green' && report.status === 'PASS' ? 0 : 1;
