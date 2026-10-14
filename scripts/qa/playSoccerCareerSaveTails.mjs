/* Unexecuted proposal. Promote only after actual tail baseline and fallback review. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(process.env.CI, 'Remote CI only');
for (const name of ['SC_TAIL_BROWSER_ROOT', 'SC_TAIL_OUT', 'FREE_KICK_FONT_CACHE']) assert(process.env[name], name + ' is required');
const ROOT = path.resolve(process.env.SC_TAIL_BROWSER_ROOT);
const FIXTURES = path.resolve(process.env.SC_TAIL_OUT), INPUT = path.join(FIXTURES, 'inputs');
const OUT = path.resolve(process.env.SC_TAIL_BROWSER_OUT || path.join(FIXTURES, 'browser')), CACHE = path.resolve(process.env.FREE_KICK_FONT_CACHE);
const requireFromRepo = createRequire(path.join(ROOT, 'package.json'));
requireFromRepo('./scripts/lib/offlineTransport.cjs');
const { build } = requireFromRepo('esbuild');
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const KEY = 'soccerCareerSave', LIMIT = 60000, FORMAT = 'lz-string-utf16-career', NOW = 1791952200000;
const sha = value => createHash('sha256').update(value).digest('hex');
const SELF = fileURLToPath(import.meta.url);
const heldPaths = ['src/lib/soccerCareerSave.ts', 'src/lib/soccerCareerEngine.ts', 'src/pages/SoccerCareer.tsx',
  'src/components/soccer-career/CareerStory.tsx', 'src/components/soccer-career/CareerRecordsSheet.tsx',
  'src/components/soccer-career/careerMoments.ts', 'src/components/career-moments/useCareerMoment.ts',
  'src/lib/soccerCareerRecords.ts', 'src/lib/careerChanceWheel.ts', 'src/data/continueSaves.ts', 'src/hooks/useGameCompletion.ts'];
const sourceHashes = () => ({ ...Object.fromEntries(heldPaths.map(name => [name, sha(fs.readFileSync(path.join(ROOT, name)))])), driver: sha(fs.readFileSync(SELF)) });
const fleet = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'report.json'), 'utf8'));
assert(fleet.phase === 'fixed' && fleet.control === null, 'Use freshly measured fixed tails, not a baseline or control packet');
assert.equal(fleet.states, 3636); assert.equal(fleet.failures.length, 0);
assert.equal(fleet.inputs.length, 12);
for (const input of fleet.inputs) {
  const body = fs.readFileSync(path.join(INPUT, input.name));
  assert.equal(body.length, input.bytes); assert.equal(sha(body), input.sha256);
}
const candidates = Object.fromEntries(['manager', 'pundit', 'owner'].map(tail => {
  const eligible = fleet.rows.filter(row => row.year === 100 && row.id.endsWith('-' + tail)).map(row => {
    const originalFile = path.join(FIXTURES, row.id + '-100-original.json'), packedFile = path.join(FIXTURES, row.id + '-100-stored.json');
    const original = fs.readFileSync(originalFile, 'utf8'), packed = fs.readFileSync(packedFile, 'utf8');
    const value = JSON.parse(original), envelope = JSON.parse(packed);
    assert.equal(original.length, row.original); assert.equal(packed.length, row.stored);
    assert(value.retired && value.phase === tail + '_season' && value[tail + 'State'].season === 100);
    return { tail, row, value, original, packed, originalFile, packedFile, envelope };
  }).filter(candidate => candidate.envelope.seasons?.format === FORMAT).sort((a, b) => b.original.length - a.original.length);
  assert(eligible.length, tail + ': actual year-100 state uses the proposed whole-career fallback');
  const candidate = eligible[0];
  assert(candidate.original.length > LIMIT && candidate.packed.length <= LIMIT);
  assert.deepEqual(Object.keys(candidate.envelope).sort(), ['age', 'currentClub', 'retired', 'seasons']);
  for (const field of ['age', 'currentClub', 'retired']) assert.equal(candidate.envelope[field], candidate.value[field]);
  return [tail, candidate];
}));
const invalidBase = candidates.manager.envelope;
const invalid = {
  corrupt: JSON.stringify({ ...invalidBase, seasons: { ...invalidBase.seasons, data: 'invalid compressed career' } }),
  future: JSON.stringify({ ...invalidBase, seasons: { ...invalidBase.seasons, format: 'future-career-format' } }),
};
for (const value of Object.values(invalid)) assert.notEqual(value, candidates.manager.packed);
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file)); const body = fs.readFileSync(path.join(CACHE, entry.file));
  assert.equal(sha(body), entry.sha256); return [entry.url, { body, contentType: entry.contentType }];
}));
const sheets = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(match => new URL(match[1]).href);
assert.equal(sheets.length, 1); assert(fonts.has(sheets[0]));
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Complete the actual app build before this driver');
fs.mkdirSync(OUT, { recursive: true });
const write = (name, value) => fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(value, null, 2));
const report = { sourceBefore: sourceHashes(), inputRun: fleet.inputRun, inputSource: fleet.inputSource,
  candidates: Object.fromEntries(Object.entries(candidates).map(([tail, candidate]) => [tail, { id: candidate.row.id, year: 100,
    originalChars: candidate.original.length, packedChars: candidate.packed.length, originalSha256: sha(candidate.original), packedSha256: sha(candidate.packed) }])),
  cases: [], checks: 0, failed: 0, forwardedExternalRequests: 0,
  limitations: ['Three actual year-100 tail checkpoints, not unavailable user saves.', 'Visible tail panels show only the existing latest four/five rows; full save comparisons retain every row.',
    'External flags are inert fixtures; fonts use retained original bytes.', 'Model proof owns actual advancement and RNG. This browser measures the synchronous tail-end click and complete saved output.'] };
const oracleBuild = await build({ absWorkingDir: ROOT,
  stdin: { contents: "export * as engine from './src/lib/soccerCareerEngine'; export * as save from './src/lib/soccerCareerSave'; export * as records from './src/lib/soccerCareerRecords'; export * as story from './src/components/soccer-career/CareerStory'; export * as reveal from './src/lib/soccerAwardReveal'; export * as flags from './src/lib/flagUtils'; export * as currency from './src/lib/soccerCurrency'; export * as moments from './src/components/soccer-career/careerMoments'; export * as chance from './src/lib/careerChanceWheel'; export * as home from './src/data/continueSaves';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, platform: 'browser', format: 'iife', globalName: '__tailSaveOracle', write: false, jsx: 'automatic',
  alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' }, logLevel: 'error' });
fs.writeFileSync(path.join(OUT, 'compiled-oracle.js'), oracleBuild.outputFiles[0].text);
report.oracleSha256 = sha(fs.readFileSync(path.join(OUT, 'compiled-oracle.js')));
const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const number = probe.address().port; probe.close(error => error ? reject(error) : resolve(number)); }); });
const BASE = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '', browser, oracleContext, oracle;
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned server did not start')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error('Owned server exited ' + code)); });
  server.stdout.on('data', bytes => { serverLog += bytes; if (serverLog.includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  server.stderr.on('data', bytes => { serverLog += bytes; });
});
const clock = now => { const OldDate = Date; window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }; };
const decoded = raw => oracle.evaluate(bytes => window.__tailSaveOracle.save.parseSoccerCareerSave(bytes), raw);
const serialized = value => oracle.evaluate(career => window.__tailSaveOracle.save.serializeSoccerCareerSave(career), value);
const label = raw => oracle.evaluate(bytes => { const O = window.__tailSaveOracle; return O.home.describeSave(O.home.CONTINUE_SAVES.find(row => row.path === '/soccer-career'), bytes); }, raw);
const normalize = raw => oracle.evaluate(bytes => {
  const O = window.__tailSaveOracle, random = Math.random; Math.random = () => { throw new Error('Restoration consumed RNG'); };
  try { const value = O.save.parseSoccerCareerSave(bytes); if (!O.save.isSoccerCareerSave(value)) throw new Error('Invalid source state'); const career = O.engine.repairCareer(value); try { O.moments.settleLoadedMoments(career); } catch { /* same page boundary */ } return JSON.parse(JSON.stringify(career)); }
  finally { Math.random = random; }
}, raw);
const loadedFonts = page => page.evaluate(async () => {
  const rows = []; for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
    const faces = await document.fonts.load(weight + ' 16px "' + family + '"', 'Career save'); rows.push({ family, weight, loaded: faces.length > 0 && faces.every(face => face.status === 'loaded') }); }
  await document.fonts.ready; return rows;
});
async function journey(width, height, kind) {
  const candidate = candidates[kind], raw = candidate ? candidate.packed : invalid[kind];
  const row = { id: width + '-' + kind, width, height, kind, checks: [], errors: [], assetErrors: [], intercepted: [], layout: [], screenshots: [] }; report.cases.push(row);
  const check = (ok, message) => { report.checks++; row.checks.push({ ok: !!ok, message }); assert(ok, row.id + ': ' + message); };
  const context = await browser.newContext({ viewport: { width, height }, isMobile: width === 390, hasTouch: width === 390,
    reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
      { name: KEY, value: raw }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-guest-handle', value: 'SteadyVolley-18' }, { name: 'unrelated-career-save', value: '{"keep":"exact"}' } ] }] } });
  let page;
  try {
    await context.addInitScript(clock, NOW);
    await context.addInitScript(key => { window.__tailOwnWrites = []; const set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
      Storage.prototype.setItem = function(name, value) { if (this === localStorage && name === key) window.__tailOwnWrites.push({ operation: 'set', chars: String(value).length }); return set.call(this, name, value); };
      Storage.prototype.removeItem = function(name) { if (this === localStorage && name === key) window.__tailOwnWrites.push({ operation: 'remove' }); return remove.call(this, name); };
    }, KEY);
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) { assert(['GET', 'HEAD'].includes(request.method())); return route.continue(); }
      row.intercepted.push({ method: request.method(), origin: url.origin, path: url.pathname, blocked: true });
      if (request.method() === 'GET' && fonts.has(url.href)) return route.fulfill({ status: 200, ...fonts.get(url.href) });
      if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) { row.assetErrors.push('Uncached actual font ' + url.href); return route.abort(); }
      if (request.resourceType() === 'image') return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12"/>' });
      return route.fulfill({ status: 200, contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'application/json', body: request.resourceType() === 'stylesheet' ? '' : '[]' });
    });
    await context.routeWebSocket('**/*', socket => socket.close());
    page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => row.errors.push(String(error)));
    page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.assetErrors.push(request.url() + ': ' + request.failure()?.errorText); });
    page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assetErrors.push(response.url() + ': ' + response.status()); });
    const bytes = () => page.evaluate(key => localStorage.getItem(key), KEY);
    const waitWrite = after => page.waitForFunction(count => window.__tailOwnWrites.length > count, after);
    const pair = (stage, actual, expected) => { write(row.id + '-' + stage + '-actual', actual); write(row.id + '-' + stage + '-expected', expected); check(JSON.stringify(actual) === JSON.stringify(expected), stage + ': every logical field matches the actual reducer or restoration'); };
    const capture = async (target, stage, button = false) => {
      await target.waitFor(); await target.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
      await target.evaluate(async node => { await Promise.all(node.getAnimations({ subtree: true }).filter(animation => Number.isFinite(animation.effect?.getComputedTiming().iterations)).map(animation => animation.finished.catch(() => {}))); });
      const frames = await target.evaluate(async node => { const result = []; for (let index = 0; index < 4; index++) { await new Promise(requestAnimationFrame); const b = node.getBoundingClientRect(), css = getComputedStyle(node); result.push({ x: b.x, y: b.y, width: b.width, height: b.height, viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, opacity: Number(css.opacity), visibility: css.visibility, disabled: node.disabled === true, hit: node.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)), text: node.innerText }); } return result; });
      row.layout.push({ stage, frames });
      check(frames.every(frame => frame.width > 0 && frame.height > 0 && frame.opacity > 0 && frame.visibility === 'visible' && frame.documentWidth <= frame.viewport + 1), stage + ': visible content without horizontal page overflow');
      check(frames.every(frame => ['x', 'y', 'width', 'height'].every(field => Math.abs(frame[field] - frames[0][field]) <= 0.5)), stage + ': stable actual rectangles');
      if (button) check(frames.every(frame => frame.hit && !frame.disabled), stage + ': actual enabled center hit target');
    };
    const shot = async name => { const filename = row.id + '-' + name + '.png'; await page.screenshot({ path: path.join(OUT, filename), fullPage: false }); row.screenshots.push(filename); };
    if (!candidate) {
      await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded' });
      const warning = page.getByRole('alert').filter({ hasText: "We couldn't open this save" }); await warning.waitFor({ timeout: 45000 });
      row.fonts = await loadedFonts(page);
      const remove = page.getByRole('button', { name: 'Delete unusable save', exact: true }); await capture(remove, 'refusal-control', true);
      check(await page.locator('[data-career-utilities]').count() === 0, 'No partial career opens');
      check(await bytes() === raw, 'Refusal holds every original unusable byte');
      check((await page.evaluate(() => window.__tailOwnWrites)).length === 0, 'Refusal makes no owned save write or removal');
      row.fonts = await loadedFonts(page); await shot('refused');
      await page.reload({ waitUntil: 'domcontentloaded' }); await warning.waitFor({ timeout: 45000 });
      check(await bytes() === raw && (await page.evaluate(() => window.__tailOwnWrites)).length === 0, 'Cold refusal reload again holds original bytes without a write');
    } else {
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      const resume = page.locator('[data-continue-card="/soccer-career"]'); await resume.waitFor({ timeout: 45000 });
      row.fonts = await loadedFonts(page);
      const expectedLabel = await label(raw); check(await resume.locator('[data-continue-line]').innerText() === expectedLabel, 'Actual home Continue reads the exposed original metadata');
      await capture(resume, 'home-continue', true); await resume.click();
      const headingName = kind === 'manager' ? /Manager Career/ : kind === 'pundit' ? /TV Pundit Career/ : /Club Owner/;
      const heading = page.getByRole('heading', { name: headingName, exact: false });
      await page.getByRole('heading', { name: headingName, exact: false, includeHidden: true }).waitFor({ timeout: 45000 });
      let current = await normalize(candidate.original), stored = await serialized(current); await waitWrite(0);
      pair('restored', await decoded(await bytes()), current);
      check(await bytes() === stored, 'Actual page writer bytes match the complete normalized oracle encoding');
      check(stored.length <= LIMIT && JSON.parse(stored).seasons?.format === FORMAT, 'Actual restored tail writes the whole-career fallback inside 60000');
      check(await label(stored) === expectedLabel, 'Restored writer preserves original Continue metadata');
      if (await oracle.evaluate(career => window.__tailSaveOracle.chance.validChanceWheel(career.chanceWheel) && !career.chanceWheel.seen, current)) {
        const expected = await oracle.evaluate(career => window.__tailSaveOracle.chance.acknowledgeChanceWheel(career), current);
        const wheel = page.locator('[data-career-chance-wheel]'); await wheel.waitFor();
        await capture(wheel.locator('[data-wheel-skip]'), 'show-receipt', true); await wheel.locator('[data-wheel-skip]').click();
        await capture(wheel.locator('[data-wheel-continue]'), 'continue-receipt', true); const ackWrites = (await page.evaluate(() => window.__tailOwnWrites)).length;
        await wheel.locator('[data-wheel-continue]').click(); await wheel.waitFor({ state: 'hidden' });
        stored = await serialized(expected); await waitWrite(ackWrites); pair('acknowledged', await decoded(await bytes()), expected);
        check(await bytes() === stored && stored.length <= LIMIT, 'Actual acknowledged writer bytes match the whole reducer output and cap'); current = expected; row.receiptAcknowledged = true;
      }
      await heading.waitFor({ timeout: 45000 });
      const panel = heading.locator('xpath=..').locator('xpath=..');
      const visibleRows = panel.locator(':scope > div.space-y-1:not(.text-center)').locator(':scope > div');
      if (kind === 'pundit') {
        const expected = await oracle.evaluate(career => career.punditEvents.slice(-4).map(line => { const O = window.__tailSaveOracle; return O.flags.splitFlagSegments(O.currency.localizeMoney(line)).filter(segment => 'text' in segment).map(segment => segment.text).join(''); }), current);
        const actual = await visibleRows.allTextContents(); write(row.id + '-visible-rows', { actual, expected });
        check(JSON.stringify(actual) === JSON.stringify(expected), 'Actual latest pundit lines match the saved events');
      } else {
        const expected = current[kind + 'State'].seasonResults.slice(-5).map(record => ['S' + record.year, record.club, record.result]);
        const actual = await visibleRows.evaluateAll(nodes => nodes.map(node => [...node.querySelectorAll(':scope > span')].map(span => span.textContent)));
        write(row.id + '-visible-rows', { actual, expected });
        check(JSON.stringify(actual) === JSON.stringify(expected), 'Actual latest tail rows match their saved year, club and result');
      }
      await capture(heading, 'actual-tail'); row.fonts = await loadedFonts(page); await shot('tail');
      await page.reload({ waitUntil: 'domcontentloaded' }); await heading.waitFor({ timeout: 45000 });
      row.fonts = await loadedFonts(page);
      const secondNormalization = await normalize(stored); pair('reload-model', secondNormalization, current); await waitWrite(0);
      pair('reloaded', await decoded(await bytes()), current); check(await bytes() === stored, 'Literal writer bytes stay stable on cold tail reload');
      const end = kind === 'manager' ? page.getByRole('button', { name: current.managerState.unemployed ? 'Walk Away' : 'Retire', exact: true })
        : kind === 'pundit' ? page.getByRole('button', { name: /Retire from Punditry$/ }) : page.getByRole('button', { name: 'Sell Club', exact: true });
      const expectedEnd = await oracle.evaluate(({ career, kind }) => { const O = window.__tailSaveOracle, random = Math.random; Math.random = () => { throw new Error('End reducer consumed RNG'); }; try { const value = JSON.parse(JSON.stringify(career)); return kind === 'manager' ? O.engine.endManagerCareer(value) : kind === 'pundit' ? O.engine.endPunditCareer(value) : O.engine.endOwnerCareer(value); } finally { Math.random = random; } }, { career: current, kind });
      await capture(end, 'actual-end-control', true); const endWrites = (await page.evaluate(() => window.__tailOwnWrites)).length;
      await end.evaluate(node => { const original = Math.random; const receipt = { values: [], restored: false }; window.__tailEndRandom = receipt;
        node.addEventListener('click', () => { Math.random = () => { const value = original(); receipt.values.push(value); return value; }; document.addEventListener('click', () => { Math.random = original; receipt.restored = true; }, { once: true }); }, { capture: true, once: true }); });
      await end.click(); stored = await serialized(expectedEnd); await waitWrite(endWrites); pair('ended', await decoded(await bytes()), expectedEnd);
      check(await bytes() === stored, 'Actual ended writer bytes equal the exact complete reducer output'); current = expectedEnd;
      row.endRandom = await page.evaluate(() => window.__tailEndRandom); check(row.endRandom.restored && row.endRandom.values.length === 0, 'Actual synchronous end click consumes no RNG and restores the original function');
      check(current.phase === 'retired' && current[kind + 'State'].season === 100 && stored.length <= LIMIT, 'Actual retirement retains every tail row and the cap');
      await page.locator('[data-career-story="inline"]').waitFor({ timeout: 45000 });
      const projected = await oracle.evaluate(career => { const O = window.__tailSaveOracle; return { book: O.records.careerRecordBook(career), tiles: O.story.storyTiles(O.reveal.careerBeforeBallonDorReveal(career)).map(tile => ({ ...tile, textLines: tile.lines.map(line => O.flags.splitFlagSegments(O.currency.localizeMoney(line)).filter(segment => 'text' in segment).map(segment => segment.text).join('')) })) }; }, current);
      const readOnlyBytes = await bytes(), readOnlyWrites = (await page.evaluate(() => window.__tailOwnWrites)).length;
      const records = page.locator('[data-career-records-tile]'); await records.waitFor({ timeout: 45000 }); await capture(records, 'records-control', true); await records.click();
      const book = page.getByRole('dialog', { name: 'Your career record book', exact: true }); await book.waitFor();
      const totals = await book.locator('[data-record-totals] > div > p:first-child').allTextContents();
      const keys = ['apps', current.position === 'GK' ? 'cleanSheets' : 'goals', 'assists'];
      check(JSON.stringify(totals.map(text => Number(text.replaceAll(',', '')))) === JSON.stringify(keys.map(key => projected.book.totals[key])), 'Actual totals read every senior season');
      await book.getByRole('button', { name: 'Club history', exact: true }).click(); check(await book.locator('[data-record-stint]').count() === projected.book.stints.length, 'All saved club spells appear');
      await capture(book.getByRole('button', { name: 'Close', exact: true }), 'history-close-control', true); await shot('club-history');
      for (let index = 0; index < projected.book.stints.length; index++) {
        await book.locator('[data-record-stint="' + index + '"]').click();
        const years = await book.locator('[data-record-season]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-record-season')));
        check(JSON.stringify(years) === JSON.stringify(projected.book.stints[index].rows.map(entry => String(entry.season.year))), 'Club spell ' + index + ': every senior row is retained');
        await book.getByRole('button', { name: /Back/ }).click();
      }
      await book.getByRole('button', { name: 'Close', exact: true }).click(); await book.waitFor({ state: 'hidden' });
      await page.locator('[data-open-career-story]').click(); const story = page.locator('[data-career-story="dialog"]'); await story.waitFor();
      check(await story.locator('[data-story-tile]').count() === projected.tiles.length, 'Actual Career Story lists all saved chapters and the complete tail log');
      for (const index of [0, projected.tiles.length - 1]) {
        const tile = projected.tiles[index]; await story.locator('[data-story-tile="' + tile.key + '"]').click();
        check(JSON.stringify(await story.locator('[data-story-line] > span:last-child').allTextContents()) === JSON.stringify(tile.textLines), 'Chapter ' + tile.key + ': every saved line displays');
        check(await story.locator('[data-story-identity]').innerText() === 'Age ' + tile.age + ' at ' + tile.club, 'Chapter retains recorded age and club');
        await capture(story.locator('[data-story-back]'), 'story-back-' + tile.key, true); await story.locator('[data-story-back]').click();
      }
      await story.locator('[data-story-close]').click(); await story.waitFor({ state: 'hidden' });
      check(await bytes() === readOnlyBytes && (await page.evaluate(() => window.__tailOwnWrites)).length === readOnlyWrites, 'Read-only history/story preserves every owned byte without another save write');
      await page.reload({ waitUntil: 'domcontentloaded' }); await records.waitFor({ timeout: 45000 }); await page.locator('[data-career-story="inline"]').waitFor({ timeout: 45000 }); await waitWrite(0); pair('retired-reloaded', await decoded(await bytes()), current);
      check(await bytes() === stored && stored.length <= LIMIT, 'Final literal retired bytes and every tail field survive reload');
      check(await page.locator('[data-soccer-save-status="failed"]').count() === 0, 'No save-failure notice appears');
    }
    row.fonts = await loadedFonts(page); check(row.fonts.length === 8 && row.fonts.every(face => face.loaded), 'Eight actual cached site font faces are loaded');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal page overflow');
    check(await page.evaluate(() => localStorage.getItem('unrelated-career-save')) === '{"keep":"exact"}', 'Unrelated save bytes stay untouched');
    check(row.errors.length === 0 && row.assetErrors.length === 0, 'No page errors or failed built assets');
    row.ownWrites = await page.evaluate(() => window.__tailOwnWrites);
  } catch (error) {
    report.failed++; row.error = String(error.stack || error); console.error(row.error);
    if (page) try {
      row.failureText = await page.locator('body').innerText(); row.ownWrites = await page.evaluate(() => window.__tailOwnWrites);
      const raw = await page.evaluate(key => localStorage.getItem(key), KEY);
      fs.writeFileSync(path.join(OUT, row.id + '-failure-stored.txt'), raw ?? '');
      try { write(row.id + '-failure-logical', await decoded(raw)); } catch { /* retained raw bytes diagnose refused decoding */ }
    } catch { /* keep the original failure if the page itself is unavailable */ }
  }
  finally { await context.close(); write(row.id, row); }
}
try {
  await ready; browser = await pw.chromium.launch({ headless: true });
  oracleContext = await browser.newContext({ serviceWorkers: 'block' }); await oracleContext.addInitScript(clock, NOW);
  await oracleContext.route('**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
  await oracleContext.routeWebSocket('**/*', socket => socket.close()); oracle = await oracleContext.newPage(); await oracle.goto(BASE + '/tail-oracle'); await oracle.addScriptTag({ content: oracleBuild.outputFiles[0].text });
  for (const candidate of Object.values(candidates)) {
    assert.equal(JSON.stringify(await decoded(candidate.packed)), candidate.original, 'Actual fixed checkpoint is complete and lossless');
    assert.equal(await serialized(await decoded(candidate.packed)), candidate.packed, 'Actual fixed checkpoint encoding is stable');
    assert.equal(await label(candidate.packed), await label(candidate.original), 'Old and fallback metadata readers agree');
  }
  for (const raw of Object.values(invalid)) {
    const accepted = await oracle.evaluate(bytes => { try { const O = window.__tailSaveOracle; return O.save.isSoccerCareerSave(O.save.parseSoccerCareerSave(bytes)); } catch { return false; } }, raw);
    assert.equal(accepted, false, 'Malformed whole-career control is actually rejected');
  }
  for (const [width, height] of [[390, 844], [1280, 900]]) for (const kind of ['manager', 'pundit', 'owner', 'corrupt', 'future']) await journey(width, height, kind);
  assert.equal(report.cases.length, 10);
  const pngs = report.cases.flatMap(row => {
    assert(!row.error, row.id + ': completed the declared journey');
    assert.equal(row.screenshots.length, candidates[row.kind] ? 2 : 1, row.id + ': complete actual original screenshot inventory');
    return row.screenshots;
  });
  assert.equal(pngs.length, 16); assert.equal(new Set(pngs).size, 16);
  assert.deepEqual(fs.readdirSync(OUT).filter(name => name.endsWith('.png')).sort(), [...pngs].sort(), 'Declared inventory equals actual original PNG files');
  report.imageInventory = pngs.map(name => { const body = fs.readFileSync(path.join(OUT, name)); assert(body.length > 0); return { name, bytes: body.length, sha256: sha(body) }; });
  for (const candidate of Object.values(candidates)) { assert.equal(sha(fs.readFileSync(candidate.originalFile)), sha(candidate.original)); assert.equal(sha(fs.readFileSync(candidate.packedFile)), sha(candidate.packed)); }
  for (const input of fleet.inputs) assert.equal(sha(fs.readFileSync(path.join(INPUT, input.name))), input.sha256);
  report.sourceAfter = sourceHashes(); assert.deepEqual(report.sourceAfter, report.sourceBefore);
} catch (error) { report.failed++; report.error = String(error.stack || error); console.error(report.error); }
finally { await oracleContext?.close(); await browser?.close(); server.kill(); write('report', report); }
console.log('Tail browser: ' + report.cases.length + ' journeys, ' + report.checks + ' checks, ' + report.failed + ' failed, no external requests forwarded.');
process.exit(report.failed ? 1 : 0);
