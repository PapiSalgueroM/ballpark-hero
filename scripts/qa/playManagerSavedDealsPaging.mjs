/* Remote served UI check over a declared synthetic 80-row saved log. This does not
 * establish naturally accumulated history, physical Apple behavior or browser RNG. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';

const ROOT = process.cwd(), BASE = process.env.BASE;
assert.equal(BASE, 'http://127.0.0.1:4173');
const OUT = path.join(process.env.MSDL_OUT, 'browser');
fs.mkdirSync(OUT, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n');
const report = { head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), cases: [], status: 'running', browserRngMeasured: false };
const flush = () => json('report.json', report);
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'saved-deals-'));
let browser;
flush();
try {
  const entry = path.join(work, 'entry.ts'), outfile = path.join(work, 'engine.cjs');
  fs.writeFileSync(entry, "export * from '@/lib/clubManager';\n");
  await build({ entryPoints: [entry], outfile, bundle: true, platform: 'node', format: 'cjs', alias: { '@': path.join(ROOT, 'src') }, logLevel: 'silent' });
  const memory = new Map();
  globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
  const cm = createRequire(import.meta.url)(outfile);
  await cm.ensureAllEraRosters();
  const random = Math.random, now = Date.now;
  let seed = 1393, draws = 0, state, saved;
  try {
    Math.random = () => { draws += 1; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    Date.now = () => Date.UTC(2026, 9, 16, 12);
    state = cm.startCareer('Everton');
    state.transferLog = Array.from({ length: 80 }, (_, index) => index < 61
      ? { name: `Paging fixture ${String(index).padStart(2, '0')}`, from: index % 2 ? state.clubName : 'Fixture seller', to: index % 2 ? 'Fixture buyer' : state.clubName, fee: (index * 17) % 61 + 0.25, loan: index % 5 === 0, season: state.season, week: index + 1 }
      : { name: `Other fixture ${index}`, from: 'Fixture seller', to: 'Fixture buyer', fee: index, season: state.season, week: index + 1 });
    state.seasonSignings = [{ dir: 'out', name: 'Paging net ledger fixture', fee: 7 }];
    assert.equal(cm.saveCareer(state), true);
    const loaded = cm.loadCareer(); assert(loaded);
    assert.deepEqual(loaded.transferLog, state.transferLog);
    assert.equal(cm.saveCareer(loaded), true);
    saved = memory.get('dukb-club-manager-save'); assert(saved);
  } finally { Math.random = random; Date.now = now; }
  json('preparation.json', { declaration: 'Actual constructor and save/load, explicit synthetic 61 current-club plus19 other saved rows. No naturally played accumulation.', draws, initialSeed: 1393, finalSeed: seed, fixedNow: Date.UTC(2026, 9, 16, 12), saved, sha256: sha(saved), log: state.transferLog });
  const expected = state.transferLog.slice(0, 61).reverse();
  const checkRows = (actualRows, expectedRows) => {
    assert.deepEqual(actualRows.map(item => item.name), expectedRows.map(item => item.name));
    for (const item of expectedRows) {
      const actual = actualRows.find(candidate => candidate.name === item.name); assert(actual);
      assert(actual.text.includes(`${item.from} to ${item.to}`)); assert(actual.text.includes(cm.moneyIn(state)(item.fee)));
      assert.equal(actual.text.includes('(loan)'), !!item.loan);
    }
  };
  const fontDir = process.env.FREE_KICK_FONT_CACHE;
  assert(fontDir);
  const fonts = new Map(JSON.parse(fs.readFileSync(path.join(fontDir, 'manifest.json'))).map(row => {
    const body = fs.readFileSync(path.join(fontDir, row.file)); assert.equal(sha(body), row.sha256);
    return [row.url, { body, contentType: row.contentType, headers: { 'access-control-allow-origin': '*' } }];
  }));
  browser = await pw.chromium.launch({ headless: true });
  for (const [width, height] of [[320, 640], [390, 844], [430, 932], [1440, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: 'dukb-club-manager-save', value: saved }, { name: 'cookie-consent', value: 'essential' }] }] } });
    const row = { width, height, network: [], errors: [], observations: [], screenshots: [], status: 'running' };
    report.cases.push(row); flush();
    try {
      await context.route('**/*', route => {
        const request = route.request(), url = request.url();
        if (new URL(url).origin === BASE) return route.continue();
        if (fonts.has(url)) return route.fulfill(fonts.get(url));
        row.network.push({ url, method: request.method(), type: request.resourceType() }); return route.abort();
      });
      await context.routeWebSocket('**/*', socket => socket.close());
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on('pageerror', error => row.errors.push(String(error)));
      for (let boot = 0; boot < 2; boot += 1) {
        await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: 'Resume Career', exact: true }).click();
        await page.getByRole('tab', { name: 'Market', exact: true }).waitFor();
      }
      await page.getByRole('tab', { name: 'Market', exact: true }).click();
      await page.getByRole('button', { name: 'Latest', exact: true }).click();
      await page.getByRole('button', { name: 'Your club', exact: true }).click();
      await page.evaluate(async () => { await document.fonts.ready; });
      const pane = page.getByTestId('cm-transfer-news');
      const next = page.getByRole('button', { name: 'Next deals', exact: true });
      const previous = page.getByRole('button', { name: 'Previous deals', exact: true });
      const snapshot = () => page.evaluate(() => {
        const pane = document.querySelector('[data-testid="cm-transfer-news"]');
        const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
        const stores = storage => Object.fromEntries(Object.keys(storage).sort().map(key => [key, storage.getItem(key)]));
        return { local: stores(localStorage), session: stores(sessionStorage), window: { x: scrollX, y: scrollY }, pane: { ...rect(pane), top: pane.scrollTop }, rows: [...pane.children].map(element => ({ name: element.querySelector('span.font-bold')?.textContent, text: element.textContent })), pageWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth };
      });
      const shot = async name => { const file = `${width}-${name}.png`; await page.screenshot({ path: path.join(OUT, file) }); const bytes = fs.readFileSync(path.join(OUT, file)); row.screenshots.push({ file, bytes: bytes.length, sha256: sha(bytes) }); };
      const click = async button => {
        const box = await button.boundingBox(); assert(box && box.height >= 44 && box.width >= 44);
        const point = [box.x + box.width / 2, box.y + box.height / 2];
        assert.equal(await button.evaluate((element, [x, y]) => element.contains(document.elementFromPoint(x, y)), point), true, 'Real pointer reaches the pager without automatic scroll.');
        if (width < 500) await page.touchscreen.tap(...point); else await page.mouse.click(...point);
        await page.waitForTimeout(100);
      };
      await next.scrollIntoViewIfNeeded();
      await pane.evaluate(element => { element.scrollTop = element.scrollHeight; });
      const first = await snapshot(); row.observations.push({ stage: 'first', ...first });
      checkRows(first.rows, expected.slice(0, 50));
      assert.equal(await previous.isDisabled(), true); assert.equal(await next.isEnabled(), true);
      assert(first.pane.top > 0); await shot('first');
      await click(next);
      const second = await snapshot(); row.observations.push({ stage: 'second', ...second });
      checkRows(second.rows, expected.slice(50));
      assert.equal(await next.isDisabled(), true); assert.equal(await previous.isEnabled(), true);
      assert.equal(second.pane.top, 0); assert.deepEqual(second.window, first.window);
      assert.equal(second.pane.height, first.pane.height); assert.equal(second.pane.y, first.pane.y);
      assert.deepEqual(second.local, first.local); assert.deepEqual(second.session, first.session);
      await shot('second');
      await click(previous);
      const restored = await snapshot(); row.observations.push({ stage: 'restored', ...restored });
      assert.deepEqual(restored.rows, first.rows); assert.deepEqual(restored.window, first.window); assert.equal(restored.pane.top, 0);
      assert.deepEqual(restored.local, first.local); assert.deepEqual(restored.session, first.session);
      for (const item of row.observations) assert(item.pageWidth <= item.clientWidth + 1);
      assert.deepEqual(row.errors, []); row.status = 'passed';
    } catch (error) { row.error = String(error.stack || error); row.status = 'failed'; }
    finally { await context.close(); flush(); }
  }
  assert.equal(report.cases.length, 4); assert(report.cases.every(row => row.status === 'passed'));
  report.status = 'passed';
} catch (error) { report.error = String(error.stack || error); report.status = 'failed'; }
finally { if (browser) await browser.close(); flush(); fs.rmSync(work, { recursive: true, force: true }); }
console.log(`Saved deals pager: ${report.status}; ${report.cases.filter(row => row.status === 'passed').length}/4 served journeys.`);
if (report.status !== 'passed') process.exitCode = 1;
