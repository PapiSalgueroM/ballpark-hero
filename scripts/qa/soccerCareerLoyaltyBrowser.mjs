import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = process.cwd(), OUT = path.resolve(process.env.SC_LOYALTY_BROWSER_OUT || 'loyalty-browser-artifacts');
const WEB = path.join(OUT, 'web');
fs.mkdirSync(WEB, { recursive: true });
const sha = body => createHash('sha256').update(body).digest('hex');
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find(row => row.id === 'ere')?.state;
assert(fixture);
const entry = path.join(WEB, 'entry.tsx');
fs.writeFileSync(entry, fs.readFileSync(path.join(ROOT, 'scripts/qa/soccerCareerLoyaltyBrowser.entry.txt'), 'utf8'));
const compile = reviewCopy => build({ entryPoints: [entry], outfile: path.join(WEB, 'app.js'), bundle: true, platform: 'browser', format: 'esm',
  target: 'es2022', jsx: 'automatic', nodePaths: [path.join(ROOT, 'node_modules')], alias: { ...(reviewCopy ? { '@/components/soccer-career/SoccerOfferReview': reviewCopy } : {}), '@': path.join(ROOT, 'src') },
  define: { 'import.meta.env': '{}' }, metafile: true, logLevel: 'silent' });
const bundle = await compile();
fs.writeFileSync(path.join(OUT, 'bundle-inputs.json'), JSON.stringify(bundle.metafile, null, 2));
const assets = path.join(ROOT, 'dist/assets'), css = fs.readdirSync(assets).filter(file => file.endsWith('.css'));
assert(css.length > 0);
const fonts = JSON.parse(fs.readFileSync(process.env.SC_LOYALTY_FONT_MANIFEST, 'utf8'));
const fontMap = new Map(fonts.map(row => {
  const body = fs.readFileSync(path.join(path.dirname(process.env.SC_LOYALTY_FONT_MANIFEST), row.file));
  assert.equal(sha(body), row.sha256); return [row.url, { body, contentType: row.contentType, headers: { 'access-control-allow-origin': '*' } }];
}));
const template = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const fontTags = [...template.matchAll(/<link\s+href="https:\/\/fonts\.googleapis\.com\/[^"]+"\s+rel="stylesheet"[^>]*>/g)].map(row => row[0]).join('');
const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">' + fontTags
  + css.map(file => '<link rel="stylesheet" href="/assets/' + file + '">').join('') + '</head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>';
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/') { response.setHeader('Content-Type', 'text/html'); response.end(html); return; }
  const file = url.pathname === '/app.js' ? path.join(WEB, 'app.js') : url.pathname.startsWith('/assets/') ? path.resolve(assets, path.basename(url.pathname)) : null;
  if (!file || !fs.existsSync(file)) { response.writeHead(404); response.end(); return; }
  response.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : 'text/javascript'); response.end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true });
const results = [], controls = [];
const flush = complete => fs.writeFileSync(path.join(OUT, 'outcomes.json'), JSON.stringify({ complete, results, controls }, null, 2));
async function retainFailure(row, page, label, error) {
  row.status = 'FAILED'; row.failure = { name: error.name, message: error.message, stack: error.stack };
  row.captureErrors = [];
  if (page) {
    row.url = page.url();
    try { row.lastState = await page.evaluate(() => typeof window.__LOYALTY_SNAPSHOT__ === 'function' ? window.__LOYALTY_SNAPSHOT__() : null); }
    catch (failure) { row.captureErrors.push('state: ' + failure.message); }
    try { row.html = label + '.failure.html'; fs.writeFileSync(path.join(OUT, row.html), await page.content()); }
    catch (failure) { row.captureErrors.push('html: ' + failure.message); }
    try { row.image = label + '.failure.png'; await page.screenshot({ path: path.join(OUT, row.image), fullPage: false }); }
    catch (failure) { row.captureErrors.push('png: ' + failure.message); }
  } else row.captureErrors.push('Page was not created');
  flush(false);
}
async function snapshot(page, label) {
  const loadedFonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return Promise.all(['Inter', 'Space Grotesk'].map(async family => {
      const faces = await document.fonts.load('700 16px "' + family + '"', 'Loyalty contract');
      return { family, count: faces.length, loaded: faces.every(face => face.status === 'loaded') };
    }));
  });
  fs.writeFileSync(path.join(OUT, label + '.fonts.json'), JSON.stringify(loadedFonts, null, 2));
  assert(loadedFonts.every(font => font.count > 0 && font.loaded), label + ': actual declared fonts loaded');
  const observation = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const box = dialog?.getBoundingClientRect();
    const targets = [...(dialog?.querySelectorAll('button') || [])].map(element => {
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
      return { label: element.getAttribute('aria-label') || element.textContent, width: rect.width, height: rect.height,
        visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' };
    }).filter(target => target.visible);
    return { viewport: { width: innerWidth, height: innerHeight }, scrollY, scrollWidth: document.documentElement.scrollWidth,
      dialog: box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom } : null, targets,
      focus: { tag: document.activeElement?.tagName, text: document.activeElement?.textContent },
      bodyScroll: document.querySelector('[data-programme-body]')?.scrollTop,
      text: dialog?.textContent, state: window.__LOYALTY_SNAPSHOT__() };
  });
  fs.writeFileSync(path.join(OUT, label + '.observation.json'), JSON.stringify({ label, loadedFonts, ...observation }, null, 2));
  assert(observation.dialog, label + ': actual dialog mounted');
  assert(observation.scrollWidth <= observation.viewport.width + 1, label + ': no horizontal overflow');
  assert(observation.dialog.left >= -1 && observation.dialog.right <= observation.viewport.width + 1);
  assert(observation.dialog.top >= -1 && observation.dialog.bottom <= observation.viewport.height + 1);
  assert(observation.targets.length > 0);
  assert(observation.targets.every(target => target.width >= 43.5 && target.height >= 43.5), label + ':44px targets');
  const image = label + '.png';
  await page.screenshot({ path: path.join(OUT, image), fullPage: false });
  return { label, image, loadedFonts, ...observation };
}
async function plans(page, select) {
  await page.locator('[data-open-plans]').click();
  await page.locator('[data-programme-rules]').waitFor();
  await page.locator('[data-programme-start]').click();
  const tile = page.locator('[data-programme-tile="loyalty"]');
  await tile.scrollIntoViewIfNeeded();
  const listTop = await page.locator('[data-programme-body]').evaluate(element => element.scrollTop);
  await tile.click();
  if (select) await page.locator('[data-programme-choice="loyalty"]').click();
  return listTop;
}
const state = async page => {
  await page.waitForFunction(() => typeof window.__LOYALTY_SNAPSHOT__ === 'function');
  return page.evaluate(() => window.__LOYALTY_SNAPSHOT__());
};
try {
  for (const width of [320, 390, 1280]) for (const mode of ['payment', 'forfeit', 'counteroffer']) {
    const prefix = width + '-' + mode;
    const row = { width, mode, status: 'STARTED', blocked: [], errors: [], observations: [] };
    results.push(row); flush(false);
    let context, page;
    try {
    context = await browser.newContext({ viewport: { width, height: width === 320 ? 740 : width === 390 ? 844 : 900 }, serviceWorkers: 'block' });
    const blocked = row.blocked, errors = row.errors;
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(base + '/')) return route.continue();
      const cached = fontMap.get(url);
      if (cached) return route.fulfill(cached);
      blocked.push(new URL(url).origin); return route.abort();
    });
    await context.addInitScript(value => {
      window.__LOYALTY_FIXTURE__ = value;
      let seed = 782611;
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    }, fixture);
    page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(base); await page.locator('[data-open-plans]').waitFor();
    await page.evaluate(() => scrollTo(0, 180));
    const observations = row.observations;
    const windowTop = await page.evaluate(() => scrollY);
    const top = await plans(page, true);
    observations.push(await snapshot(page, prefix + '-choice'));
    assert.equal((await state(page)).ledger.pending.weeklyWage, 9000);
    await page.locator('[data-programme-back]').click();
    assert.equal(await page.locator('[data-programme-body]').evaluate(element => element.scrollTop), top);
    assert(await page.locator('[data-programme-tile="loyalty"]').evaluate(element => document.activeElement === element));
    await page.locator('[data-programme-close]').click();
    assert(await page.locator('[data-open-plans]').evaluate(element => document.activeElement === element));
    assert.equal(await page.evaluate(() => scrollY), windowTop);
    const saved = await state(page);
    await page.reload(); await page.locator('[data-open-plans]').waitFor();
    assert.deepEqual((await state(page)).ledger, saved.ledger);
    if (mode === 'counteroffer') {
      await page.locator('[data-counteroffer]').click();
      await page.getByRole('button', { name: 'Review contract with Generated Contract Club' }).click();
      await page.locator('[data-loyalty-stale]').waitFor();
      assert(await page.getByRole('button', { name: 'Sign contract', exact: true }).isDisabled());
      observations.push(await snapshot(page, prefix + '-stale'));
      await page.getByRole('button', { name: 'Back', exact: true }).click();
      await plans(page, true); await page.locator('[data-programme-close]').click();
    }
    await page.getByRole('button', { name: 'Review contract with Generated Contract Club' }).click();
    await page.locator('[data-loyalty-offer]').waitFor();
    const expected = mode === 'counteroffer' ? 9900 : 9000;
    assert.equal(Number(await page.locator('[data-offer-signed-wage]').getAttribute('data-offer-signed-wage')), expected);
    observations.push(await snapshot(page, prefix + '-review'));
    await page.getByRole('button', { name: 'Sign contract', exact: true }).click();
    await page.waitForFunction(() => window.__LOYALTY_SNAPSHOT__().ledger?.deals[0]?.status === 'active');
    assert.equal((await state(page)).weeklyWage, expected);
    if (mode === 'forfeit') {
      await page.locator('[data-play-year]').click();
      assert.equal((await state(page)).ledger.deals[0].completed, 1);
      const beforeMove = await state(page);
      await page.locator('[data-stage-move]').click();
      await page.getByRole('button', { name: 'Review contract with Generated Move Club' }).click();
      assert((await page.locator('[data-loyalty-forfeit]').textContent()).includes('156,000'));
      observations.push(await snapshot(page, prefix + '-forfeit-warning'));
      await page.getByRole('button', { name: 'Sign contract', exact: true }).click();
      const moved = await state(page);
      assert.equal(moved.ledger.deals[0].status, 'forfeited'); assert.equal(moved.ledger.deals[0].paidEuros, 0);
      assert.equal(moved.netWorth, beforeMove.netWorth);
    } else {
      await page.locator('[data-play-year]').click(); await page.locator('[data-play-year]').click();
      const paid = await state(page);
      assert.equal(paid.ledger.deals[0].status, 'paid');
      assert.equal(paid.ledger.deals[0].paidEuros, mode === 'counteroffer' ? 171600 : 156000);
      await page.reload(); await page.locator('[data-open-plans]').waitFor();
      assert.deepEqual(await state(page), paid);
    }
    await plans(page, false);
    observations.push(await snapshot(page, prefix + '-recorded-outcome'));
    assert((await page.locator('[data-programme-outcome]').textContent()).includes(mode === 'forfeit' ? 'forfeited' : 'paid'));
    assert.deepEqual(blocked, []); assert.deepEqual(errors, []);
    row.final = await state(page); row.status = 'PASSED'; flush(false);
    } catch (error) { await retainFailure(row, page, prefix, error); throw error; }
    finally { await context?.close(); }
  }
  assert.equal(results.length, 9);
  assert(results.every(row => row.status === 'PASSED'));
  const fontRow = { variant: 'owned-font-denial-fault', status: 'STARTED', expectedOwnedFault: true, blocked: [], errors: [], deniedFonts: [] };
  controls.push(fontRow); flush(false);
  let fontContext, fontPage;
  try {
    fontContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await fontContext.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(base + '/')) return route.continue();
      if (fontMap.has(url)) {
        fontRow.deniedFonts.push(url);
        return route.fulfill({ body: '', contentType: url.startsWith('https://fonts.googleapis.com/') ? 'text/css' : 'font/woff2', headers: { 'access-control-allow-origin': '*' } });
      }
      fontRow.blocked.push(new URL(url).origin); return route.abort();
    });
    await fontContext.addInitScript(value => { window.__LOYALTY_FIXTURE__ = value; Math.random = () => 0.1; }, fixture);
    fontPage = await fontContext.newPage(); fontPage.on('pageerror', error => fontRow.errors.push(error.message));
    await fontPage.goto(base); await fontPage.locator('[data-open-plans]').waitFor();
    await plans(fontPage, true);
    assert.equal((await state(fontPage)).ledger.pending.weeklyWage, 9000);
    fontRow.independentSelectedQuotePassed = true;
    let rejection;
    try { await snapshot(fontPage, fontRow.variant); }
    catch (error) { rejection = error; }
    assert(rejection && rejection.name === 'AssertionError' && rejection.message.includes('actual declared fonts loaded'), 'Font denial specifically rejects loaded-font guard');
    assert(fontRow.deniedFonts.length > 0);
    await retainFailure(fontRow, fontPage, fontRow.variant, rejection);
    fontRow.status = 'EXPECTED_REJECTION'; fontRow.restoredBy = 'restored-warning'; flush(false);
    assert.deepEqual(fontRow.blocked, []); assert.deepEqual(fontRow.errors, []);
  } catch (error) { await retainFailure(fontRow, fontPage, fontRow.variant, error); throw error; }
  finally { await fontContext?.close(); }
  const fault = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa/soccer-career-loyalty-v2.1/SOURCE-FAULTS.json'), 'utf8')).controls.find(row => row.name === 'no_warning');
  const originalReview = fs.readFileSync(path.join(ROOT, fault.file), 'utf8');
  assert.equal(originalReview.split(fault.from).length - 1, 1);
  const badReview = originalReview.replace(fault.from, fault.to), copied = path.join(OUT, 'control-review.tsx');
  assert.notEqual(sha(badReview), sha(originalReview));
  fs.writeFileSync(copied, badReview);
  fs.writeFileSync(path.join(OUT, 'browser-control-source.json'), JSON.stringify({ fault, originalSha256: sha(originalReview), changedSha256: sha(badReview) }, null, 2));
  const originalBundle = fs.readFileSync(path.join(WEB, 'app.js'));
  await compile(copied);
  for (const variant of ['owned-missing-warning-fault', 'restored-warning']) {
    const row = { variant, status: 'STARTED', expectedOwnedFault: variant === 'owned-missing-warning-fault', blocked: [], errors: [] };
    controls.push(row); flush(false);
    if (variant === 'restored-warning') fs.writeFileSync(path.join(WEB, 'app.js'), originalBundle);
    let context, page;
    try {
    context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const blocked = row.blocked, errors = row.errors;
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(base + '/')) return route.continue();
      const cached = fontMap.get(url);
      if (cached) return route.fulfill(cached);
      blocked.push(new URL(url).origin); return route.abort();
    });
    await context.addInitScript(value => { window.__LOYALTY_FIXTURE__ = value; Math.random = () => 0.1; }, fixture);
    page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(base); await page.locator('[data-open-plans]').waitFor();
    await plans(page, true); await page.locator('[data-programme-close]').click();
    await page.getByRole('button', { name: 'Review contract with Generated Contract Club' }).click();
    await page.locator('[data-loyalty-offer]').waitFor();
    assert.equal((await state(page)).ledger.pending.bonusEuros, 156000);
    await page.getByRole('button', { name: 'Sign contract', exact: true }).click();
    await page.waitForFunction(() => window.__LOYALTY_SNAPSHOT__().ledger?.deals[0]?.status === 'active');
    await page.locator('[data-stage-move]').click();
    await page.getByRole('button', { name: 'Review contract with Generated Move Club' }).click();
    const actual = await snapshot(page, variant);
    assert.equal(actual.state.ledger.deals[0].status, 'active');
    assert.equal(actual.state.ledger.deals[0].paidEuros, 0);
    let failure;
    try { assert.equal(await page.locator('[data-loyalty-forfeit]').count(), 1, 'Actual permanent move preview includes unpaid loyalty amount'); }
    catch (error) { failure = { name: error.name, message: error.message, stack: error.stack }; }
    if (variant === 'owned-missing-warning-fault') { assert(failure); assert.equal(failure.name, 'AssertionError'); }
    else assert.equal(failure, undefined);
    assert.deepEqual(blocked, []); assert.deepEqual(errors, []);
    Object.assign(row, { actual, failure, independentSelectedQuotePassed: true, status: row.expectedOwnedFault ? 'EXPECTED_REJECTION' : 'PASSED' });
    flush(false);
    } catch (error) { await retainFailure(row, page, variant, error); throw error; }
    finally { await context?.close(); }
  }
  assert.equal(controls.length, 3);
  fs.writeFileSync(path.join(OUT, 'outcomes.json'), JSON.stringify({ complete: true, scope: 'Actual mounted Programme and OfferReview components plus actual engine callbacks. Full main-page navigation is outside this component qualification.', results, controls }, null, 2));
  console.log('Loyalty mounted UI:9normal contexts across320,390,1280, plus owned font denial, warning fault and restoration.');
  console.log('Actual choice, counteroffer refusal/refresh, pay/forfeit outcomes and official reloads observed.');
  console.log('Actual dialog bounds,44px targets and programme focus/list/window scroll restoration checked.');
  console.log('No external transport attempts or page errors; raw observations and PNGs retained.');
} finally {
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
