/** Run from the repository root. Pass --help for build and replay commands. */
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from './lib/playwrightLoader.mjs';

const usage = `Usage: node scripts/playGa4OptIn.mjs [--review] [build-directory]
  npm run build
  node scripts/playGa4OptIn.mjs dist

Set CHROME_PATH to an installed Chrome executable if the repo browser is missing.
Only Node downloads Google's public tag. Chromium serves the local build at the
production origin and captures collection requests without forwarding them.
Run again after changing the stream's automatic measurement settings.`;
const args = process.argv.slice(2);
if (args.includes('--help')) { console.log(usage); process.exit(0); }
const review = args.includes('--review');
const dirs = args.filter(arg => arg !== '--review');
assert.ok(dirs.length <= 1 && !dirs[0]?.startsWith('-'), usage);
const dir = path.resolve(dirs[0] ?? (review ? 'tmp/review-dist' : 'dist'));
const origin = 'https://douknowball.com';
const id = 'G-KZQK2G68YC';
const tagUrl = 'https://www.googletagmanager.com/gtag/js?id=' + id + '&l=dukbGaLayer';
const marker = 'dukbSynthetic';
const home = origin + '/';
const career = origin + '/soccer-career';
const aussieRules = origin + '/aussie-rules-manager';
const queryHome = home + '?campaign=' + marker + 'Query&q=' + marker + 'Search#' + marker + 'Hash';
const enhancedEvents = new Set(['view_search_results', 'scroll', 'click', 'file_download',
  'form_start', 'form_submit', 'video_start', 'video_progress', 'video_complete']);
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
await stat(path.join(dir, 'index.html'));

const response = await fetch(tagUrl, { redirect: 'error', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(20000) });
assert.ok(response.ok && /javascript/.test(response.headers.get('content-type') ?? ''), 'Could not retrieve the public Google tag');
const vendor = await response.text();
assert.ok(vendor.includes(id), 'The downloaded tag does not identify the expected web stream');

async function serveBuild(route, url) {
  if (url.pathname.startsWith('/__l5e/')) return route.fulfill({ status: 204 });
  let file = path.resolve(dir, '.' + decodeURIComponent(url.pathname));
  assert.ok(file === dir || file.startsWith(dir + path.sep), 'Unexpected build path');
  const entry = await stat(file).catch(() => null);
  if (entry?.isDirectory()) file = path.join(file, 'index.html');
  else if (!entry?.isFile()) {
    if (!route.request().isNavigationRequest()) return route.fulfill({ status: 404 });
    file = path.join(dir, 'index.html');
  }
  return route.fulfill({ contentType: mime[path.extname(file)] ?? 'application/octet-stream', body: await readFile(file) });
}

// A deny-only loopback proxy also catches browser traffic outside Playwright routing.
const proxy = createServer(socket => socket.destroy());
await new Promise((resolve, reject) => proxy.once('error', reject).listen(0, '127.0.0.1', resolve));
let browser;
const failures = [];
try {
  browser = await chromium.launch({ proxy: { server: 'http://127.0.0.1:' + proxy.address().port }, args: ['--disable-quic'] });
  for (const choice of ['Reject all', 'Advertising', 'Google Analytics', 'Accept all', 'game form', 'game links']) {
    try { await run(choice); }
    catch (error) { failures.push(choice + ': ' + error.message); }
  }
} finally {
  try { await browser?.close(); } finally { proxy.close(); }
}
if (failures.length) {
  console.error(failures.join('\n'));
  console.error('For extra pageviews or automatic events, check Enhanced measurement in this GA4 stream. Keep only pageviews enabled and turn off history-based page changes.');
  process.exitCode = 1;
} else {
  console.log('Passed. All browser collection requests were intercepted locally.');
}

async function run(choice) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const tags = [], hits = [], errors = [];
  const views = () => hits.filter(hit => hit.name === 'page_view');
  const granted = ['Google Analytics', 'Accept all', 'game form', 'game links'].includes(choice);
  try {
    await context.routeWebSocket('**/*', ws => ws.close());
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin === origin) return serveBuild(route, url);
      if (url.href === tagUrl) {
        tags.push(req.headers().referer ?? '');
        return route.fulfill({ contentType: 'application/javascript', body: vendor });
      }
      if (!/\/(?:g\/|j\/)?collect(?:\/|$)/.test(url.pathname)) return route.abort();
      if (req.method() !== 'OPTIONS') {
        const headers = await req.allHeaders();
        for (const line of (req.postData() ?? '').split('\n')) {
          const p = Object.fromEntries([...url.searchParams, ...new URLSearchParams(line)]);
          hits.push({ name: p.en, stream: p.tid, url: p.dl, title: p.dt, referrer: p.dr ?? '',
            leaked: JSON.stringify([p, headers]).includes(marker) });
        }
      }
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': origin,
        'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': req.headers()['access-control-request-headers'] ?? 'content-type' } });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(12000);
    const isForm = choice === 'game form';
    await page.goto(isForm ? home : queryHome, {
      referer: 'https://example.org/' + marker + 'Referrer', waitUntil: 'domcontentloaded',
    });
    const region = page.getByRole('region', { name: 'Cookie choices' });
    await region.waitFor();
    await page.waitForTimeout(500);
    assert.equal(tags.length + hits.length, 0, 'Google Analytics ran before a choice');
    if (choice.endsWith('all')) await region.getByRole('button', { name: choice }).click();
    else {
      await region.getByRole('button', { name: 'Manage choices' }).click();
      await region.getByRole('checkbox', { name: granted ? 'Google Analytics' : choice }).check();
      await region.getByRole('button', { name: 'Save choices' }).click();
    }
    async function settle(minimum) {
      const end = Date.now() + 8000;
      while (granted && views().length < minimum && Date.now() < end) await page.waitForTimeout(100);
      await page.waitForTimeout(1500);
    }
    await settle(1);
    let expected;
    if (isForm) {
      await page.getByRole('textbox', { name: 'Search games' }).fill('Missing XI');
      await page.locator('a[href="/missing-xi"]:visible').first().click();
      await page.waitForURL(origin + '/missing-xi');
      await page.locator('button').filter({ hasText: /^Full XI$/ }).waitFor({ state: 'attached' });
      const dialog = page.getByRole('dialog').last();
      if (await dialog.isVisible()) await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Full XI', exact: true }).click();
      await page.getByRole('button', { name: 'Open team sheet' }).click();
      await page.getByLabel('Name a starter').fill(marker + 'Form');
      await page.getByRole('button', { name: 'Guess', exact: true }).click();
      await page.getByText('No match in this starting XI. Try another name.').waitFor();
      await settle(2);
      expected = [home, origin + '/missing-xi'];
    } else if (choice === 'game links') {
      await page.goto(aussieRules + '?q=' + marker + 'SearchTerm#' + marker + 'Landing', { waitUntil: 'domcontentloaded' });
      await settle(2);
      const pdf = page.locator('a[href^="https://resources.afl.com.au"]').first();
      await pdf.waitFor({ state: 'visible' });
      assert.match(await pdf.getAttribute('href'), /\.pdf$/i, 'Expected a linked rules PDF');
      for (const tagged of [false, true]) {
        if (tagged) await pdf.evaluate((link, value) => {
          const url = new URL(link.href);
          url.searchParams.set('source', value);
          link.href = url.href;
        }, marker + 'OutboundValue');
        const [popup] = await Promise.all([page.waitForEvent('popup'), pdf.click()]);
        await popup.close();
      }
      await page.keyboard.press('Escape');
      await page.locator('footer').last().scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const root = document.scrollingElement;
        return root.scrollHeight > root.clientHeight && root.scrollTop + root.clientHeight >= 0.9 * root.scrollHeight;
      });
      await page.waitForTimeout(6000);
      expected = [home, aussieRules];
    } else {
      const search = page.getByRole('textbox', { name: 'Search games' });
      await search.fill('Soccer Career');
      await page.locator('a[href="/soccer-career"]:visible').first().click();
      await page.waitForURL(career);
      await settle(2);
      await page.goBack();
      await page.waitForURL(url => url.pathname === '/');
      await settle(3);
      expected = granted ? [home, career, home] : [];
    }
    if (choice === 'Accept all') {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await settle(4);
      expected.push(home);
    }
    const checkedViews = views().map(hit => hit.url);
    const hostGranted = await page.evaluate(() => (window.dataLayer ?? []).some(command =>
      command?.[0] === 'consent' && command[2]?.analytics_storage === 'granted'));
    assert.equal(hostGranted, false, 'The GA4 opt-in also granted the hosting SDK permission to track clicks');
    if (choice === 'Google Analytics' || choice === 'Accept all') {
      await page.getByRole('button', { name: 'Cookie choices', exact: true }).last().click();
      const before = hits.length;
      await region.getByRole('button', { name: 'Reject all' }).click();
      await page.locator('a[href="/soccer-career"]:visible').first().click();
      await page.waitForURL(career);
      await page.waitForTimeout(1800);
      if (hits.length !== before) errors.push('A collection request followed withdrawal');
    }
    console.log(choice + ': ' + JSON.stringify({ tags: tags.length, hits }));
    assert.deepEqual(errors, [], 'Browser errors or withdrawal failure: ' + errors.join(', '));
    const reloaded = choice === 'Accept all' || choice === 'game links';
    assert.deepEqual(tags, reloaded ? ['', ''] : granted ? [''] : [], 'Unexpected tag loads or source referrer');
    if (!granted) assert.equal(hits.length, 0, 'Collection without analytics consent');
    assert.ok(!hits.some(hit => hit.leaked), 'Synthetic URL, form or referrer value in intercepted collection');
    assert.ok(!hits.some(hit => hit.stream !== id), 'Unexpected measurement stream');
    assert.deepEqual(hits.filter(hit => enhancedEvents.has(hit.name)).map(hit => hit.name), [], 'Unexpected Enhanced measurement events');
    assert.deepEqual(checkedViews, expected, 'Unexpected pageview count or order');
    const titles = new Map([[home, 'DoUKnowBall'], [career, 'Soccer Career'], [origin + '/missing-xi', 'Missing XI'], [aussieRules, 'Aussie Rules Manager']]);
    for (const view of views()) {
      assert.equal(view.referrer, '', 'Unexpected pageview referrer');
      assert.equal(view.title, titles.get(view.url), 'Unexpected public page title');
    }
  } finally { await context.close(); }
}
