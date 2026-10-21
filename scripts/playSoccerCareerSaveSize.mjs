/* Actual saved-career continuation, record book and story, remote Chromium only.
   SC_SAVE_OUT points at the genuine careers retained by simSoccerCareerSaveSize.
   Fonts are fulfilled from the separately prepared FREE_KICK_FONT_CACHE.
   The UI resumes on load; Soccer Career has no Resume Career button. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

assert(process.env.CI, 'Run Soccer Career browser verification remotely in CI');
assert(process.env.SC_SAVE_OUT, 'SC_SAVE_OUT must contain retained genuine careers');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = path.resolve(process.env.SC_SAVE_OUT);
const OUT = path.resolve(ROOT, process.env.SHOTS || path.join(FIXTURES, 'browser'));
const CACHE = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(FIXTURES, 'font-cache'));
const KEY = 'soccerCareerSave', LIMIT = 60000, NOW = 1791952200000;
const sha = value => createHash('sha256').update(value).digest('hex');
const fleet = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'report.json'), 'utf8'));
const held = fleet.rows.filter(row => row.original > LIMIT && row.phase === 'playing').sort((a, b) => b.original - a.original)[0];
assert(held, 'Retained fleet contains a genuinely over-budget playing career');
const original = fs.readFileSync(path.join(FIXTURES, `${held.id}-original.json`), 'utf8');
const originalState = JSON.parse(original);
const packed = fs.readFileSync(path.join(FIXTURES, `${held.id}-stored.json`), 'utf8');
assert(original.length > LIMIT && packed.length <= LIMIT && original !== packed, 'Selected original exceeds the cap and its actual stored representation fits');
const envelope = JSON.parse(packed);
const fixtureFormat = envelope.seasons?.format;
assert(['lz-string-utf16', 'lz-string-utf16-career'].includes(fixtureFormat) && typeof envelope.seasons.data === 'string', 'Selected fixture uses a known actual codec envelope');
if (fixtureFormat === 'lz-string-utf16') {
  assert(envelope.story?.format === 'lz-string-utf16' && typeof envelope.story.data === 'string', 'Selected fixture actually uses packed story');
} else {
  assert.deepEqual(Object.keys(envelope).sort(), ['age', 'currentClub', 'retired', 'seasons'], 'Whole-career envelope has only the actual exposed metadata and payload');
  assert.deepEqual([envelope.currentClub, envelope.age, envelope.retired], [originalState.currentClub, originalState.age, originalState.retired], 'Whole-career envelope retains exact original Continue metadata');
}
const invalid = {
  corrupt: JSON.stringify({ ...envelope, seasons: { ...envelope.seasons, data: 'invalid compressed history' } }),
  future: JSON.stringify({ ...envelope, seasons: { ...envelope.seasons, format: 'future-history-format' } }),
  'corrupt-story': JSON.stringify({ ...originalState, story: { format: 'lz-string-utf16', data: 'invalid compressed story' } }),
  'future-story': JSON.stringify({ ...originalState, story: { format: 'future-story-format', data: envelope.story?.data ?? envelope.seasons.data } }),
};
for (const raw of Object.values(invalid)) assert.notEqual(raw, packed, 'Invalid fixture changed the valid history envelope');
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file));
  const body = fs.readFileSync(path.join(CACHE, entry.file));
  assert.equal(sha(body), entry.sha256, 'Retained font bytes match their manifest');
  return [entry.url, { body, contentType: entry.contentType }];
}));
const template = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sheet = [...template.matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(row => new URL(row[1]).href);
assert.equal(sheet.length, 1); assert(fonts.has(sheet[0]), 'Actual template stylesheet is cached');
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Complete the real app build before browser verification');
fs.mkdirSync(OUT, { recursive: true });
const report = { fixture: held, fixtureFormat, originalHash: sha(original), packedHash: sha(packed), cases: [], checks: 0, failed: 0,
  forwardedExternalRequests: 0, limitations: ['Fictional career produced by the actual engine, not real historical sports results.', 'External flag images use inert offline fixtures.', 'No career advancement is clicked; the simulation proof checks following-step state and RNG parity.'] };
const write = (name, value) => fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(value, null, 2));
const oracleBuild = await build({
  absWorkingDir: ROOT, stdin: { contents: "export * as engine from './src/lib/soccerCareerEngine'; export * as save from './src/lib/soccerCareerSave'; export * as records from './src/lib/soccerCareerRecords'; export * as story from './src/components/soccer-career/CareerStory'; export * as reveal from './src/lib/soccerAwardReveal'; export * as flags from './src/lib/flagUtils'; export * as currency from './src/lib/soccerCurrency'; export * as moments from './src/components/soccer-career/careerMoments'; export * as chance from './src/lib/careerChanceWheel'; export * as home from './src/data/continueSaves';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, platform: 'browser', format: 'iife', globalName: '__saveSizeOracle', write: false, jsx: 'automatic',
  alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' }, logLevel: 'error',
});
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '', browser, oracleContext;
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned host-like server did not start in 15 seconds')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { serverLog += data; if (serverLog.includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  server.stderr.on('data', data => { serverLog += data; });
});
let oracle;
const decoded = raw => oracle.evaluate(bytes => window.__saveSizeOracle.save.parseSoccerCareerSave(bytes), raw);
const label = raw => oracle.evaluate(bytes => { const O = window.__saveSizeOracle; return O.home.describeSave(O.home.CONTINUE_SAVES.find(row => row.path === '/soccer-career'), bytes); }, raw);
const fixedClock = now => { const OldDate = Date; window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }; };
const loadedFonts = page => page.evaluate(async () => { const result = []; for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) { const faces = await document.fonts.load(`${weight} 16px "${family}"`, 'Career save'); result.push({ family, weight, loaded: faces.length > 0 && faces.every(face => face.status === 'loaded') }); } await document.fonts.ready; return result; });

async function journey(width, height, kind) {
  const raw = kind === 'raw' ? original : kind === 'packed' ? packed : invalid[kind];
  const row = { id: `${width}-${kind}`, width, height, kind, checks: [], errors: [], assetErrors: [], intercepted: [], saves: [] };
  report.cases.push(row);
  const check = (ok, message) => { report.checks++; if (!ok) report.failed++; row.checks.push({ ok: !!ok, message }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${row.id}: ${message}`); assert(ok, `${row.id}: ${message}`); };
  const context = await browser.newContext({ viewport: { width, height }, isMobile: width === 390, hasTouch: width === 390,
    reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
      { name: KEY, value: raw }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-guest-handle', value: 'SteadyVolley-18' }, { name: 'unrelated-career-save', value: '{"keep":"exact"}' },
    ] }] } });
  try {
    await context.addInitScript(fixedClock, NOW);
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) { assert(['GET', 'HEAD'].includes(request.method()), 'Local host only receives reads'); return route.continue(); }
      row.intercepted.push({ method: request.method(), origin: url.origin, path: url.pathname, blocked: true });
      if (request.method() === 'GET' && fonts.has(url.href)) return route.fulfill({ status: 200, ...fonts.get(url.href) });
      if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) { row.assetErrors.push(`Uncached font ${url.href}`); return route.abort(); }
      if (request.resourceType() === 'image') return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12"/>' });
      return route.fulfill({ status: 200, contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'application/json', body: request.resourceType() === 'stylesheet' ? '' : '[]' });
    });
    await context.routeWebSocket('**/*', socket => socket.close());
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => row.errors.push(String(error)));
    page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.assetErrors.push(`${request.url()}: ${request.failure()?.errorText}`); });
    page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assetErrors.push(`${response.url()}: ${response.status()}`); });
    const bytes = () => page.evaluate(key => localStorage.getItem(key), KEY);
    if (invalid[kind]) {
      await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded' });
      const warning = page.getByRole('alert').filter({ hasText: "We couldn't open this save" }); await warning.waitFor({ timeout: 45000 });
      check(await page.getByRole('button', { name: 'Delete unusable save', exact: true }).isVisible(), 'Invalid packed history is refused by the actual loader');
      check(await bytes() === raw, 'Refusal preserves the complete original invalid bytes');
      check(await page.locator('[data-career-utilities]').count() === 0, 'No partial career is opened');
      row.fonts = await loadedFonts(page);
      await page.screenshot({ path: path.join(OUT, `${row.id}-refused.png`), fullPage: false });
      await page.reload({ waitUntil: 'domcontentloaded' }); await warning.waitFor({ timeout: 45000 });
      check(await bytes() === raw, 'Reload refuses again and leaves the invalid bytes untouched');
    } else {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      const resume = page.locator('[data-continue-card="/soccer-career"]'); await resume.waitFor({ timeout: 45000 });
      const expectedLabel = await label(raw);
      check(await resume.locator('[data-continue-line]').innerText() === expectedLabel, 'Actual home continue card preserves the saved club and age');
      await resume.click();
      await page.locator('[data-career-recorded-stats]').waitFor({ timeout: 45000 });
      await page.locator('[data-career-records-tile]').waitFor({ timeout: 45000 });
      await page.waitForFunction(key => { const raw = localStorage.getItem(key); if (!raw || raw.length > 60000) return false; try { return ['lz-string-utf16', 'lz-string-utf16-career'].includes(JSON.parse(raw).seasons?.format); } catch { return false; } }, KEY, { timeout: 15000 });
      let loaded = await bytes(), actual = await decoded(loaded);
      const normalized = await oracle.evaluate(input => { const O = window.__saveSizeOracle, random = Math.random; Math.random = () => { throw new Error('Save normalization consumed randomness'); }; try { const career = O.engine.repairCareer(O.save.parseSoccerCareerSave(input)); O.moments.settleLoadedMoments(career); return JSON.parse(JSON.stringify(career)); } finally { Math.random = random; } }, original);
      write(`${row.id}-expected`, normalized); write(`${row.id}-actual`, actual);
      row.saves.push({ originalChars: raw.length, loadedChars: loaded.length, expectedHash: sha(JSON.stringify(normalized)), actualHash: sha(JSON.stringify(actual)) });
      check(JSON.stringify(actual) === JSON.stringify(normalized), 'Complete loaded logical state equals the actual existing normalization, including every history and optional field');
      check(loaded.length <= LIMIT && !Array.isArray(JSON.parse(loaded).seasons), 'Actual UI writes packed JSON under the unchanged 60000-character cap');
      check(await label(loaded) === expectedLabel, 'Saved continue metadata is unchanged after the UI write');
      check(JSON.stringify(actual.seasons) === JSON.stringify(originalState.seasons) && JSON.stringify(actual.story) === JSON.stringify(originalState.story), 'Every original season and story chapter survives migration');
      if (await oracle.evaluate(career => window.__saveSizeOracle.chance.validChanceWheel(career.chanceWheel) && !career.chanceWheel.seen, actual)) {
        const expected = await oracle.evaluate(career => { const O = window.__saveSizeOracle, random = Math.random; Math.random = () => { throw new Error('Receipt acknowledgement consumed randomness'); }; try { return O.chance.acknowledgeChanceWheel(career); } finally { Math.random = random; } }, actual);
        const wheel = page.locator('[data-career-chance-wheel]'); await wheel.waitFor();
        await wheel.locator('[data-wheel-skip]').click(); const beforeReceipt = await bytes(); await wheel.locator('[data-wheel-continue]').click(); await wheel.waitFor({ state: 'hidden' });
        await page.waitForFunction(({ key, before }) => { const raw = localStorage.getItem(key); return raw !== null && raw !== before; }, { key: KEY, before: beforeReceipt });
        loaded = await bytes(); actual = await decoded(loaded);
        row.receiptAction = { action: 'Actual Show result, then Continue', expectedHash: sha(JSON.stringify(expected)), actualHash: sha(JSON.stringify(actual)), storedChars: loaded.length };
        write(`${row.id}-receipt-expected`, expected); write(`${row.id}-receipt-actual`, actual);
        check(JSON.stringify(actual) === JSON.stringify(expected), 'Actual receipt acknowledgement changes only the exact reducer output, preserving its original roll and the whole career');
        check(loaded.length <= LIMIT, 'Acknowledged actual UI save remains within the existing cap');
      }
      row.fonts = await loadedFonts(page);
      await page.locator('[data-career-recorded-stats]').screenshot({ path: path.join(OUT, `${row.id}-stats.png`) });
      const projected = await oracle.evaluate(career => { const O = window.__saveSizeOracle, visible = O.reveal.careerBeforeBallonDorReveal(career); return { book: O.records.careerRecordBook(career), tiles: O.story.storyTiles(visible).map(tile => ({ ...tile, textLines: tile.lines.map(line => O.flags.splitFlagSegments(O.currency.localizeMoney(line)).filter(segment => 'text' in segment).map(segment => segment.text).join('')) })) }; }, actual);
      await page.locator('[data-career-records-tile]').click();
      const book = page.getByRole('dialog', { name: 'Your career record book', exact: true }); await book.waitFor();
      const totals = await book.locator('[data-record-totals] > div > p:first-child').allTextContents();
      const statKeys = ['apps', actual.position === 'GK' ? 'cleanSheets' : 'goals', 'assists'];
      check(JSON.stringify(totals.map(value => Number(value.replaceAll(',', '')))) === JSON.stringify(statKeys.map(key => projected.book.totals[key])), 'Record-book totals equal all retained senior rows');
      await book.getByRole('button', { name: 'Club history', exact: true }).click();
      check(await book.locator('[data-record-stint]').count() === projected.book.stints.length, 'Every saved club spell appears in the actual history');
      await book.screenshot({ path: path.join(OUT, `${row.id}-club-history.png`) });
      for (let index = 0; index < projected.book.stints.length; index++) {
        await book.locator(`[data-record-stint="${index}"]`).click();
        const expected = projected.book.stints[index].rows.map(entry => String(entry.season.year));
        const years = await book.locator('[data-record-season]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-record-season')));
        check(JSON.stringify(years) === JSON.stringify(expected), `Club spell ${index + 1} contains every original saved senior season`);
        await book.getByRole('button', { name: 'Back', exact: false }).click();
      }
      await book.getByRole('button', { name: 'Close', exact: true }).click(); await book.waitFor({ state: 'hidden' });
      const tiles = projected.tiles; assert(tiles.length > 1, 'Genuine long career has recorded story chapters');
      await page.locator('[data-open-career-story]').click();
      const story = page.locator('[data-career-story="dialog"]'); await story.waitFor();
      check(await story.locator('[data-story-tile]').count() === tiles.length, 'Actual Career Story lists every saved chapter and the current log');
      for (const index of [0, tiles.length - 1]) {
        const tile = tiles[index]; await story.locator(`[data-story-tile="${tile.key}"]`).click();
        const lines = await story.locator('[data-story-line] > span:last-child').allTextContents();
        check(JSON.stringify(lines) === JSON.stringify(tile.textLines), `${index === 0 ? 'Earliest' : 'Latest'} chapter displays every saved line`);
        check(await story.locator('[data-story-identity]').innerText() === `Age ${tile.age} at ${tile.club}`, 'Chapter preserves the recorded age and club');
        await story.screenshot({ path: path.join(OUT, `${row.id}-story-${tile.key}.png`) });
        await story.locator('[data-story-back]').click();
      }
      await story.locator('[data-story-close]').click(); await story.waitFor({ state: 'hidden' });
      check(await bytes() === loaded, 'Reading Stats, every club spell and story leaves packed save bytes untouched');
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-career-recorded-stats]').waitFor({ timeout: 45000 });
      check(await bytes() === loaded && JSON.stringify(await decoded(await bytes())) === JSON.stringify(actual), 'Reload restores the identical complete career and packed bytes');
      check(await page.locator('[data-soccer-save-status="failed"]').count() === 0, 'No save failure notice appears');
    }
    row.fonts = await loadedFonts(page);
    check(row.fonts.length === 8 && row.fonts.every(face => face.loaded), 'Actual site font faces load from retained offline bytes');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
    check(await page.evaluate(() => localStorage.getItem('unrelated-career-save')) === '{"keep":"exact"}', 'Unrelated save bytes are untouched');
    check(row.errors.length === 0 && row.assetErrors.length === 0, 'No page errors or failed built assets');
  } catch (error) {
    report.failed++; row.error = String(error.stack || error); console.error(row.error);
  } finally { await context.close(); write(row.id, row); }
}

try {
  await ready; browser = await pw.chromium.launch({ headless: true });
  oracleContext = await browser.newContext({ serviceWorkers: 'block' });
  await oracleContext.route('**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' }));
  await oracleContext.routeWebSocket('**/*', socket => socket.close());
  oracle = await oracleContext.newPage(); await oracle.goto(`${BASE}/save-size-oracle`); await oracle.addScriptTag({ content: oracleBuild.outputFiles[0].text });
  assert.equal(await label(original), await label(packed), 'Actual shallow metadata reader gives the same raw and packed label');
  await oracle.evaluate(({ original, packed, invalid }) => {
    const O = window.__saveSizeOracle, random = Math.random;
    Math.random = () => { throw new Error('Save codec consumed randomness'); };
    try {
      if (JSON.stringify(O.save.parseSoccerCareerSave(original)) !== JSON.stringify(O.save.parseSoccerCareerSave(packed))) throw new Error('Retained packed fixture is not lossless');
      if (O.save.serializeSoccerCareerSave(O.save.parseSoccerCareerSave(packed)) !== packed) throw new Error('Retained packed fixture is not stable');
      for (const bytes of Object.values(invalid)) { let accepted = false; try { accepted = O.save.isSoccerCareerSave(O.save.parseSoccerCareerSave(bytes)); } catch { /* malformed encoding is refused */ } if (accepted) throw new Error('Malformed packed-history fixture was accepted'); }
    } finally { Math.random = random; }
  }, { original, packed, invalid });
  for (const [width, height] of [[390, 844], [1280, 900]]) for (const kind of ['raw', 'packed', ...Object.keys(invalid)]) await journey(width, height, kind);
} catch (error) { report.failed++; report.error = String(error.stack || error); console.error(report.error); }
finally { await oracleContext?.close(); await browser?.close(); server.kill(); write('report', report); }
console.log(`playSoccerCareerSaveSize: ${report.checks} checks, ${report.failed} failed, ${report.forwardedExternalRequests} external requests forwarded`);
process.exit(report.failed ? 1 : 0);
