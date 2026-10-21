/* Round1444 remote browser proof: seven real page cases, three changed DOM
   faults and three exact target restorations. External requests are fulfilled
   locally. A blocked/missing setup is never an intended assertion failure. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const OUT = path.resolve(process.env.SEO_DISCOVERY_BROWSER_OUT || path.join(ROOT, 'seo-browser-artifacts'));
const DIST = path.join(ROOT, 'dist');
const digest = x => createHash('sha256').update(x).digest('hex');
const source = process.env.GITHUB_SHA;
const checkedFiles = ['src/pages/Index.tsx', 'src/data/gameContent/football.ts', 'public/llms.txt',
  'src/hooks/useFootballGrid.ts', 'src/lib/nflGrid.ts', 'src/lib/gridRarity.ts', 'src/data/gameRegistry.ts',
  'package.json', 'package-lock.json', 'scripts/sweepWeight.mjs', 'scripts/simSeoDiscovery1444.mjs',
  'scripts/qa/playSeoDiscovery1444.mjs', '.github/workflows/seo-discovery-1444.yml',
  'dist/index.html', 'dist/football-grid/index.html'];
const hold = () => checkedFiles.map(file => ({ file, sha256: digest(fs.readFileSync(path.join(ROOT, file))) }));
const report = { v: 1, source, positives: [], faults: [], restorations: [], errors: [],
  holds: { before: [], after: [], unchanged: false }, externalFulfilled: 0, staticReadRequests: 0,
  remoteTransport: 0 };
let browser, temp, actual, fonts;
fs.mkdirSync(OUT, { recursive: true });
const twoFrames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function checks(page, kind) {
  const rows = [];
  const specs = [
    ['SEO_BROWSER_BRAND', async () => {
      const headings = page.locator('h1');
      assert.equal(await headings.count(), 1, 'SEO_BROWSER_BRAND: one actual H1');
      assert.equal((await headings.innerText()).trim(), kind === 'home' ? 'DoUKnowBall' : 'NFL GRID', 'SEO_BROWSER_BRAND: owner/game label');
      assert(await headings.isVisible(), 'SEO_BROWSER_BRAND: H1 visible');
    }],
    ['SEO_BROWSER_OVERFLOW', async () => {
      const geometry = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
      assert(geometry.document <= geometry.viewport + 2 && geometry.body <= geometry.viewport + 2,
        'SEO_BROWSER_OVERFLOW: actual document stays inside viewport ' + JSON.stringify(geometry));
    }],
    ['SEO_BROWSER_IMAGES', async () => {
      const images = await page.locator('img').evaluateAll(nodes => nodes.map(node => ({
        hidden: !!node.closest('[aria-hidden="true"]'), decorative: node.getAttribute('alt') === '',
        alt: node.getAttribute('alt'), label: node.getAttribute('aria-label'),
      })));
      assert(images.every(row => row.hidden || row.decorative || String(row.alt || row.label || '').trim()),
        'SEO_BROWSER_IMAGES: informative images need names, decoration stays decorative');
      return { observed: images.length, images };
    }],
    [kind === 'home' ? 'SEO_BROWSER_DESCRIPTION' : 'SEO_BROWSER_GUIDE', async () => {
      if (kind === 'home') {
        const descriptor = page.getByText(actual.descriptor, { exact: true });
        assert.equal(await descriptor.count(), 1, 'SEO_BROWSER_DESCRIPTION: exact real descriptor appears once');
        assert(await descriptor.isVisible(), 'SEO_BROWSER_DESCRIPTION: descriptor is visible');
      } else {
        const guide = page.locator('section[data-seo-content="ready"]');
        assert.equal(await guide.count(), 1, 'SEO_BROWSER_GUIDE: actual ready guide');
        assert(await guide.isVisible(), 'SEO_BROWSER_GUIDE: actual guide is visible');
        for (const line of actual.guideLines) {
          const visible = guide.getByText(line, { exact: true });
          assert(await visible.count() >= 1 && await visible.first().isVisible(), 'SEO_BROWSER_GUIDE: actual exported guide line visible: ' + line);
        }
        assert(actual.guideLines.some(x => /hypothetical scoring example/i.test(x)), 'SEO_BROWSER_GUIDE: worked arithmetic labeled hypothetical');
        assert(actual.guideLines.some(x => /Rarity depends on actual picks/i.test(x)), 'SEO_BROWSER_GUIDE: actual crowd uncertainty explained');
      }
    }],
  ];
  for (const [marker, fn] of specs) {
    try { const details = await fn(); rows.push({ marker, status: 'passed', details }); }
    catch (error) { rows.push({ marker, status: 'failed', errorType: error.name, error: error.message, stack: error.stack }); }
  }
  return rows;
}
async function open(profile, row) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height },
    isMobile: profile.width < 600, hasTouch: profile.width < 600, deviceScaleFactor: 1,
    reducedMotion: profile.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  row.locallyFulfilled = []; row.errors = []; row.transportErrors = []; row.fonts = [];
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    try {
      if (url.origin === BASE) {
        assert(['GET', 'HEAD'].includes(request.method()), 'only loopback static GET/HEAD may continue');
        assert(!/^\/(?:rest|auth|functions|storage)\/v1\//.test(url.pathname), 'loopback backend path rejected');
        report.staticReadRequests += 1;
        return await route.continue();
      }
      report.externalFulfilled += 1;
      row.locallyFulfilled.push({ method: request.method(), origin: url.origin, path: url.pathname });
      if (fonts.has(url.href)) { row.fonts.push(url.href); return await route.fulfill({ status: 200, ...fonts.get(url.href) }); }
      assert(!/fonts\.(googleapis|gstatic)\.com/.test(url.hostname), 'font request must match exact prefetched response');
      const kind = request.resourceType();
      return await route.fulfill({ status: 200, contentType: kind === 'stylesheet' ? 'text/css' : kind === 'script' ? 'application/javascript' : 'application/json',
        body: ['stylesheet', 'script'].includes(kind) ? '' : '[]' });
    } catch (error) { row.transportErrors.push(error.stack || String(error)); await route.abort(); }
  });
  await context.addInitScript(() => {
    localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() }));
    localStorage.setItem('fg-rules-seen', '1');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => row.errors.push(String(error)));
  await page.goto(BASE + (profile.kind === 'home' ? '/' : '/football-grid'), { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (profile.kind === 'home') await page.getByRole('textbox', { name: 'Search games', exact: true }).waitFor();
  else {
    await page.getByRole('button', { name: 'How to play', exact: true }).waitFor();
    await page.locator('section[data-seo-content="ready"]').waitFor();
    await page.locator('section[data-seo-content="ready"]').scrollIntoViewIfNeeded();
  }
  await page.evaluate(() => document.fonts.ready);
  await twoFrames(page);
  assert.equal(row.transportErrors.length, 0, 'no request policy/fixture errors');
  assert.equal(row.errors.length, 0, 'no actual page exceptions');
  assert(row.fonts.length > 0, 'accurate font fixture was actually used');
  const y = await page.evaluate(() => scrollY);
  await twoFrames(page);
  assert(Math.abs((await page.evaluate(() => scrollY)) - y) <= 1, 'settled page does not jump');
  row.stableScrollY = y;
  return { page, context };
}
async function close(view) {
  if (!view) return;
  await view.context.close();
}
async function positive(profile) {
  const row = { id: profile.id, width: profile.width, height: profile.height, reduced: !!profile.reduced, kind: profile.kind };
  let view;
  try {
    view = await open(profile, row);
    row.checks = await checks(view.page, profile.kind);
    assert(row.checks.every(x => x.status === 'passed'), 'positive page checks failed');
    row.screenshot = profile.id + '.png';
    await view.page.screenshot({ path: path.join(OUT, row.screenshot), animations: 'disabled' });
    if (profile.id === 'football-grid432') {
      row.fullScreenshot = profile.id + '-full.png';
      await view.page.screenshot({ path: path.join(OUT, row.fullScreenshot), fullPage: true, animations: 'disabled' });
    }
    row.status = 'passed';
  } catch (error) { row.status = 'failed'; row.error = error.stack || String(error); }
  finally { await close(view); report.positives.push(row); }
}
async function fault(id, profile, marker, targetKind) {
  const row = { id, expectedMarker: marker };
  let view, locator, original;
  try {
    view = await open(profile, row);
    const normal = await checks(view.page, profile.kind);
    assert(normal.every(x => x.status === 'passed'), 'fault precondition was already unhealthy');
    locator = targetKind === 'descriptor' ? view.page.getByText(actual.descriptor, { exact: true })
      : targetKind === 'guide' ? view.page.locator('section[data-seo-content="ready"]') : view.page.locator('html');
    original = await locator.getAttribute('style');
    row.beforeSha256 = digest(JSON.stringify(original));
    if (targetKind === 'overflow') await locator.evaluate(el => el.style.setProperty('width', (innerWidth + 260) + 'px', 'important'));
    else await locator.evaluate(el => el.style.setProperty('visibility', 'hidden', 'important'));
    const changed = await locator.getAttribute('style');
    row.afterSha256 = digest(JSON.stringify(changed));
    assert.notEqual(row.beforeSha256, row.afterSha256, 'fault changed no actual style bytes');
    await twoFrames(view.page);
    row.checks = await checks(view.page, profile.kind);
    const failed = row.checks.filter(x => x.status === 'failed');
    assert.equal(failed.length, 1, 'fault must fail exactly one actual check');
    assert.equal(failed[0].marker, marker, 'fault must fail its own actual check');
    assert.equal(failed[0].errorType, 'AssertionError');
    assert(failed[0].error.includes(marker), 'actual assertion error must contain target marker');
    row.detected = true; row.status = 'passed';
  } catch (error) { row.status = 'failed'; row.error = error.stack || String(error); }
  finally {
    if (view && locator && original !== undefined) {
      const restored = { id, status: 'failed' };
      try {
        await locator.evaluate((el, value) => value === null ? el.removeAttribute('style') : el.setAttribute('style', value), original);
        const final = await locator.getAttribute('style');
        assert.equal(final, original, 'target style bytes restored exactly');
        restored.sha256 = digest(JSON.stringify(final));
        assert.equal(restored.sha256, row.beforeSha256);
        await twoFrames(view.page);
        restored.checks = await checks(view.page, profile.kind);
        assert(restored.checks.every(x => x.status === 'passed'), 'restored page checks pass');
        restored.status = 'passed';
      } catch (error) { restored.error = error.stack || String(error); }
      report.restorations.push(restored);
    }
    await close(view); report.faults.push(row);
  }
}
try {
  assert(/^[a-f0-9]{40}$/.test(source || ''), 'exact remote source SHA required');
  const url = new URL(BASE);
  assert.equal(url.origin, BASE, 'base must be a bare origin');
  assert.equal(url.protocol, 'http:');
  assert(['127.0.0.1', 'localhost'].includes(url.hostname), 'only literal loopback build allowed');
  report.holds.before = hold();
  assert(process.env.FREE_KICK_FONT_CACHE, 'exact font-response cache required');
  fonts = new Map(JSON.parse(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, 'manifest.json'), 'utf8')).map(row => {
    const body = fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, row.file));
    assert.equal(digest(body), row.sha256, 'font fixture byte hash');
    return [row.url, { body, contentType: row.contentType }];
  }));
  temp = fs.mkdtempSync(path.join(os.tmpdir(), 'seo1444-browser-exports-'));
  const bundle = path.join(temp, 'actual.cjs');
  await build({ stdin: { contents: "export { GAME_COUNT_LABEL } from './src/data/gameRegistry'; export { FOOTBALL_CONTENT } from './src/data/gameContent/football'; export { flatGuide } from './src/data/gameContent/guideShape';",
    resolveDir: ROOT, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs',
    outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
  const exported = createRequire(import.meta.url)(bundle);
  const guide = exported.flatGuide(exported.FOOTBALL_CONTENT['/football-grid']);
  actual = { descriptor: 'Sports trivia, daily puzzles and career sims. ' + exported.GAME_COUNT_LABEL + ' free games, no account needed.',
    guideLines: [...guide.howToPlay, ...guide.rules, ...guide.example, ...guide.tips] };
  const raw = fs.readFileSync(path.join(DIST, 'football-grid/index.html'), 'utf8');
  assert(raw.includes('hypothetical scoring example') && raw.includes('Rarity depends on actual picks'), 'completed raw guide contains the new explanation');
  report.rawGuide = { sha256: digest(raw), hypothetical: true, variableCrowd: true };
  browser = await chromium.launch();
  const profiles = [
    { id: 'home360', kind: 'home', width: 360, height: 800 },
    { id: 'home390', kind: 'home', width: 390, height: 844 },
    { id: 'home432', kind: 'home', width: 432, height: 813 },
    { id: 'home1440', kind: 'home', width: 1440, height: 900 },
    { id: 'home390-reduced', kind: 'home', width: 390, height: 844, reduced: true },
    { id: 'football-grid390', kind: 'guide', width: 390, height: 844 },
    { id: 'football-grid432', kind: 'guide', width: 432, height: 813 },
  ];
  for (const profile of profiles) await positive(profile);
  await fault('hidden-description', profiles[1], 'SEO_BROWSER_DESCRIPTION', 'descriptor');
  await fault('phone-overflow', profiles[1], 'SEO_BROWSER_OVERFLOW', 'overflow');
  await fault('hidden-guide', profiles[5], 'SEO_BROWSER_GUIDE', 'guide');
} catch (error) { report.errors.push(error.stack || String(error)); }
finally {
  if (browser) await browser.close();
  if (temp) fs.rmSync(temp, { recursive: true, force: true });
  try { report.holds.after = hold(); report.holds.unchanged = JSON.stringify(report.holds.before) === JSON.stringify(report.holds.after); assert(report.holds.unchanged, 'source/build bytes changed'); }
  catch (error) { report.errors.push(error.stack || String(error)); }
  report.status = report.errors.length === 0 && report.positives.length === 7 && report.positives.every(x => x.status === 'passed' && x.errors.length === 0 && x.transportErrors.length === 0)
    && report.faults.length === 3 && report.faults.every(x => x.status === 'passed' && x.detected && x.errors.length === 0 && x.transportErrors.length === 0)
    && report.restorations.length === 3 && report.restorations.every(x => x.status === 'passed') ? 'passed' : 'failed';
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  const files = fs.readdirSync(OUT).filter(file => file !== 'evidence.sha256').sort();
  assert(files.every(file => fs.statSync(path.join(OUT, file)).isFile()), 'unexpected nested browser artifact');
  fs.writeFileSync(path.join(OUT, 'evidence.sha256'), files.map(file => digest(fs.readFileSync(path.join(OUT, file))) + '  ' + file).join('\n') + '\n');
}
console.log('SEO_BROWSER_RESULT ' + JSON.stringify({ status: report.status, positives: report.positives.length, faults: report.faults.length,
  restorations: report.restorations.length, errors: report.errors.length, sourceUnchanged: report.holds.unchanged, remoteTransport: report.remoteTransport }));
process.exitCode = report.status === 'passed' ? 0 : 1;
