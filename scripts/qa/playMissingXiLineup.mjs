// Actual-day Missing XI play through the built App. External requests are aborted.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';
import { answerConsent, storedConsent } from '../lib/answerConsent.mjs';
assert(process.env.CI, 'Remote browser proof only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, process.env.MX_LINEUP_BROWSER_OUT || 'missing-xi-lineup-artifacts/browser');
assert(!fs.existsSync(OUT), 'Fresh evidence directory required'); fs.mkdirSync(OUT, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const put = (name, value) => { const file = name + '.json', bytes = Buffer.from(JSON.stringify(value, null, 2)); fs.mkdirSync(path.dirname(path.join(OUT, file)), { recursive: true }); fs.writeFileSync(path.join(OUT, file), bytes); return { file, bytes: bytes.length, sha256: sha(bytes) }; };
const receipt = file => { const bytes = fs.readFileSync(path.join(ROOT, file)); return { file, bytes: bytes.length, sha256: sha(bytes) }; };
const inventory = folder => fs.readdirSync(path.join(ROOT, folder), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(item => item.isDirectory() ? inventory(folder + '/' + item.name) : item.isFile() ? [receipt(folder + '/' + item.name)] : []);
const entry = "export {pickDailyPuzzle,LINEUPS,pitchLayout,PITCH_ASPECT,PITCH_TILE_HEIGHT_PX} from './src/lib/missingXi';export {getTodayET} from './src/lib/dateUtils';export {normalizeName} from './src/lib/playerSearch';";
const compiled = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'mx-selector.ts', loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs',
  write: false, metafile: true, alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' }, logLevel: 'error' });
const selectorFile = path.join(OUT, 'selector.cjs'); fs.writeFileSync(selectorFile, compiled.outputFiles[0].contents);
const oldStorage = globalThis.localStorage; let B;
try { globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }; B = createRequire(import.meta.url)(selectorFile); }
finally { globalThis.localStorage = oldStorage; }
const day = B.getTodayET(), puzzle = B.pickDailyPuzzle(), KEY = 'missing-xi-daily-' + day, COMPLETIONS = 'dukb-local-completions';
assert.equal(B.getTodayET(), day, 'Day rolled while selecting the real daily');
const puzzleBytes = JSON.stringify(puzzle), dataBytes = JSON.stringify(B.LINEUPS);
const held = ['src/pages/MissingXi.tsx', 'src/lib/missingXi.ts', 'src/lib/dateUtils.ts', 'src/lib/playerSearch.ts',
  'src/components/game/PlayerAutocomplete.tsx', 'src/components/game/ResultScreen.tsx', 'src/components/game/RulesGate.tsx',
  'src/hooks/useDailyPuzzle.ts', 'src/hooks/useGameCompletion.ts', 'src/lib/completions.ts', 'src/lib/restoredFinish.ts',
  'scripts/lib/hostLikeServer.mjs', 'scripts/lib/answerConsent.mjs', 'scripts/qa/playMissingXiLineup.mjs'];
const sources = [...new Set([...held, ...Object.keys(compiled.metafile.inputs).filter(file => file.startsWith('src/'))])].sort();
const sourceBefore = sources.map(receipt), distBefore = inventory('dist');
const report = { status: 'running', scope: 'Actual observed Eastern day, real curated daily and real built App guess pipeline. Touch and keyboard view controls, complete local daily and reload. No clock/RNG override, source replacement or injected finished state.',
  fontScope: 'External web fonts are aborted; measured settled local/fallback fonts only.', completionScope: 'One observed game_completions request attempt is aborted. No successful backend write is claimed.',
  day, key: KEY, puzzle: put('daily-puzzle', puzzle), puzzleSha256: sha(puzzleBytes), dataSha256: sha(dataBytes), selector: { entry, sha256: sha(compiled.outputFiles[0].contents) },
  sourceBefore, distBefore, journeys: [], screenshots: [], checks: 0, externalForwarded: 0 };
const check = (value, name) => { assert(value, name); report.checks++; };
const sameDay = () => check(B.getTodayET() === day, 'Observed ET day is unchanged; refuse a rollover');
let browser, host;
try {
  const port = await new Promise((resolve, reject) => { const server = createServer(); server.once('error', reject); server.listen(0, '127.0.0.1', () => { const selected = server.address().port; server.close(() => resolve(selected)); }); });
  const BASE = 'http://127.0.0.1:' + port; report.base = BASE;
  host = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('Host startup timeout')), 15000);
    host.stdout.on('data', bytes => { if (String(bytes).includes('host-like server:')) { clearTimeout(timer); resolve(); } }); host.once('error', reject); host.once('exit', code => { clearTimeout(timer); reject(Error('Host exited ' + code)); }); });
  browser = await pw.chromium.launch({ headless: true });
  for (const width of [320, 390, 1280]) {
    sameDay(); const id = String(width), row = { width, mode: width === 1280 ? 'keyboard' : 'touch', status: 'running', errors: [], assetErrors: [], external: [], frames: [], actions: [], layouts: [] }; report.journeys.push(row);
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : width === 390 ? 844 : 900 }, isMobile: width < 1000, hasTouch: width < 1000, serviceWorkers: 'block' });
    const page = await context.newPage(), group = page.getByRole('group', { name: 'Lineup view', exact: true }), list = page.getByRole('list', { name: 'Starting lineup', exact: true });
    const result = page.getByRole('status').filter({ hasText: 'First guess! Perfect recall.' });
    const press = async (target, key = 'Enter') => { await target.scrollIntoViewIfNeeded(); if (width === 1280) { await target.focus(); await target.press(key); } else await target.tap(); };
    const settle = () => page.evaluate(async () => { await document.fonts.ready; let n = 0, last = '', stable = 0; const start = performance.now();
      do { await new Promise(requestAnimationFrame); n++; const signature = JSON.stringify([...document.querySelectorAll('[aria-label="Lineup view"],ol[aria-label="Starting lineup"]')].map(e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
        stable = signature === last ? stable + 1 : 1; last = signature;
        if (n >= 4 && stable >= 4 && !document.getAnimations().some(a => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime))) return;
      } while (performance.now() - start < 10000); throw Error('App did not settle'); });
    const frame = async name => { await settle(); sameDay(); const saved = await page.evaluate(({ key, completionKey }) => ({ dailyRaw: localStorage.getItem(key), completionRaw: localStorage.getItem(completionKey),
      storage: Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])), scroll: { x: scrollX, y: scrollY }, width: innerWidth, scrollWidth: document.documentElement.scrollWidth }), { key: KEY, completionKey: COMPLETIONS });
      check(saved.width === width && saved.scrollWidth <= width + 1, id + ': no horizontal viewport overflow');
      const value = { ...saved, result: await result.count() ? await result.innerText() : null };
      row.frames.push({ name, ...put(id + '/' + name, value) }); return value; };
    const action = async (name, run, hold = true) => { const before = await frame(name + '-before'); await run(); const after = await frame(name + '-after');
      if (hold) check(after.dailyRaw === before.dailyRaw && after.completionRaw === before.completionRaw, id + ': ' + name + ' preserves exact daily and completion bytes');
      row.actions.push({ name, ...put(id + '/' + name + '-action', { before, after }) }); return after; };
    const chooseView = async (name, key = 'Enter') => { const button = group.getByRole('button', { name, exact: true }); await press(button, key);
      check(await button.getAttribute('aria-pressed') === 'true', id + ': selected ' + name + ' is exposed');
      check(await group.getByRole('button', { name: name === 'Pitch' ? 'Lineup' : 'Pitch', exact: true }).getAttribute('aria-pressed') === 'false', id + ': inactive view is exposed'); };
    const controls = async () => { for (const name of ['Pitch', 'Lineup']) { const button = group.getByRole('button', { name, exact: true }); await button.scrollIntoViewIfNeeded(); await settle();
      const value = await button.evaluate(e => { const r = e.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { width: r.width, height: r.height, x: r.x, right: r.right, top: r.top, bottom: r.bottom, painted: !!hit && (hit === e || e.contains(hit)) }; });
      row.layouts.push({ name, ...value }); check(value.width >= 43.5 && value.height >= 43.5 && value.x >= -0.5 && value.right <= width + 0.5 && value.top >= -0.5 && value.bottom <= page.viewportSize().height + 0.5 && value.painted, id + ': native ' + name + ' control is 44px and painted'); } };
    const inspectPitch = async revealed => { const pitch = page.locator('div[style*="aspect-ratio"]'); check(await pitch.count() === 1, id + ': actual pitch is unique');
      const value = await pitch.evaluate(e => ({ aspect: e.style.aspectRatio, text: e.textContent, tiles: [...e.children].filter(n => n instanceof HTMLElement && n.style.left && n.style.top && n.style.width).map(n => ({ left: parseFloat(n.style.left), top: parseFloat(n.style.top), width: parseFloat(n.style.width), height: [...n.children].find(c => c instanceof HTMLElement && c.style.height)?.style.height })) }));
      const tiles = B.pitchLayout(puzzle.lineup.slots); check(value.tiles.length === 11 && Math.abs(parseFloat(value.aspect) - B.PITCH_ASPECT) < 0.000001, id + ': original pitch geometry is retained');
      tiles.forEach((tile, i) => check(Math.abs(value.tiles[i].left - tile.x) < 0.000001 && Math.abs(value.tiles[i].top - tile.y) < 0.000001 && Math.abs(value.tiles[i].width - tile.widthPct) < 0.000001
        && parseFloat(value.tiles[i].height) === B.PITCH_TILE_HEIGHT_PX, id + ': exact pitch tile ' + i));
      if (!revealed) check(value.text.includes('Missing player') && value.text.includes(puzzle.lineup.slots[puzzle.candidate.slotIndex].position) && !value.text.includes(puzzle.candidate.name), id + ': pitch names the missing role without the answer');
      row.layouts.push({ name: revealed ? 'revealed-pitch' : 'hidden-pitch', ...value }); };
    const inspectList = async revealed => { const items = list.getByRole('listitem'); check(await items.count() === 11, id + ': ordered list contains eleven starters');
      const html = await list.evaluate(e => e.outerHTML);
      if (!revealed) for (const forbidden of new Set([puzzle.candidate.name, puzzle.lineup.slots[puzzle.candidate.slotIndex].name])) check(!html.includes(forbidden), id + ': lineup wrapper does not expose hidden answer ' + forbidden);
      for (let i = 0; i < 11; i++) {
        const slot = puzzle.lineup.slots[i], blank = i === puzzle.candidate.slotIndex, name = blank ? revealed ? puzzle.candidate.name : 'Missing player' : slot.name, item = items.nth(i);
        const text = await item.innerText(); check(text.includes(slot.position) && text.includes(name), id + ': list row ' + i + ' has the same role and full name');
        await item.scrollIntoViewIfNeeded(); await settle();
        const geometry = await item.evaluate((e, expected) => { const r = e.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2), walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT), texts = []; let node;
          while ((node = walker.nextNode())) if (node.textContent?.trim()) { const parent = node.parentElement, css = getComputedStyle(parent); if (css.display === 'none' || css.visibility === 'hidden') continue;
            const range = document.createRange(); range.selectNodeContents(node); texts.push({ text: node.textContent, fontSize: parseFloat(css.fontSize), ellipsis: css.textOverflow === 'ellipsis', clamp: css.webkitLineClamp,
              rects: [...range.getClientRects()].map(v => ({ x: v.x, right: v.right, y: v.y, bottom: v.bottom })) }); }
          return { rect: { x: r.x, right: r.right, y: r.y, bottom: r.bottom, width: r.width, height: r.height }, painted: !!hit && (hit === e || e.contains(hit)), clientWidth: e.clientWidth, scrollWidth: e.scrollWidth,
            clientHeight: e.clientHeight, scrollHeight: e.scrollHeight, expected, texts }; }, name);
        row.layouts.push({ name: (revealed ? 'revealed-' : 'hidden-') + i, ...geometry });
        const fits = geometry.texts.every(t => !t.ellipsis && (!t.clamp || t.clamp === 'none' || t.clamp === '0') && t.rects.every(r => r.x >= geometry.rect.x - 1 && r.right <= geometry.rect.right + 1 && r.y >= geometry.rect.y - 1 && r.bottom <= geometry.rect.bottom + 1));
        const fullName = geometry.texts.some(t => t.text.includes(name) && t.fontSize >= 13);
        check(fits && fullName && geometry.painted && geometry.rect.x >= -0.5 && geometry.rect.right <= width + 0.5 && geometry.rect.y >= -0.5 && geometry.rect.bottom <= page.viewportSize().height + 0.5
          && geometry.scrollWidth <= geometry.clientWidth + 1 && geometry.scrollHeight <= geometry.clientHeight + 1, id + ': full row ' + i + ' is legible, untruncated and unblocked');
      } };
    const photo = async name => { await list.getByRole('listitem').nth(puzzle.candidate.slotIndex).scrollIntoViewIfNeeded(); await settle(); const file = id + '-' + name + '.png'; await page.screenshot({ path: path.join(OUT, file), fullPage: false });
      const bytes = fs.readFileSync(path.join(OUT, file)); report.screenshots.push({ file, bytes: bytes.length, sha256: sha(bytes), scope: 'Actual viewport centered on the hidden/revealed row; list rows are also measured individually.' }); };
    const completionAttempts = () => row.external.filter(item => item.completion?.game === 'missing-xi');
    try {
      await context.route('**/*', route => { const request = route.request(); if (new URL(request.url()).origin === BASE) return route.continue();
        const value = { url: request.url(), method: request.method(), disposition: 'aborted' };
        if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/game_completions')) { const body = request.postDataJSON(); value.completion = Array.isArray(body) ? body[0] : body; }
        row.external.push(value); return route.abort('blockedbyclient'); });
      page.on('pageerror', error => row.errors.push(String(error)));
      page.on('requestfailed', request => { if (request.url().startsWith(BASE + '/assets/')) row.assetErrors.push({ url: request.url(), error: request.failure()?.errorText }); });
      page.on('response', response => { if (response.url().startsWith(BASE + '/assets/') && response.status() >= 400) row.assetErrors.push({ url: response.url(), status: response.status() }); });
      await page.goto(BASE + '/missing-xi', { waitUntil: 'networkidle' }); await answerConsent(page, { press });
      check(await storedConsent(page) === 'rejected', id + ': real optional consent rejected');
      const letsPlay = page.getByRole('button', { name: "Let's Play!", exact: true }); if (await letsPlay.isVisible()) await press(letsPlay);
      await group.waitFor(); await page.getByText(puzzle.lineup.dateLabel, { exact: true }).waitFor(); await controls();
      check(await group.getByRole('button', { name: 'Pitch', exact: true }).getAttribute('aria-pressed') === 'true', id + ': default view is Pitch');
      await inspectPitch(false); await frame('initial'); check(completionAttempts().length === 0, id + ': no completion attempt before play');
      await action('open-lineup', () => chooseView('Lineup', ' ')); await inspectList(false); await photo('before');
      await action('return-pitch', () => chooseView('Pitch')); await inspectPitch(false); await action('return-lineup', () => chooseView('Lineup', ' '));
      const input = page.getByRole('combobox'); await input.fill(puzzle.candidate.name);
      const options = page.getByRole('option'); await options.first().waitFor();
      const offered = await options.evaluateAll(items => items.map(e => e.textContent.trim()));
      const index = offered.findIndex(name => B.normalizeName(name) === B.normalizeName(puzzle.candidate.name)); check(index >= 0, id + ': real local roster offers exact answer while remote search is blocked');
      if (width === 1280) { for (let n = 0; n <= index; n++) await input.press('ArrowDown'); await input.press('Enter'); } else await options.nth(index).tap();
      const lock = page.getByRole('button', { name: 'Lock in guess', exact: true }); check(await lock.isEnabled(), id + ': actual autocomplete commits a selected player');
      await action('selected-pitch', () => chooseView('Pitch')); await action('selected-lineup', () => chooseView('Lineup', ' ')); check(await lock.isEnabled(), id + ': view changes retain actual selected guess');
      const finished = await action('correct-guess', async () => {
        await Promise.all([
          page.waitForRequest(request => {
            if (request.method() !== 'POST' || !new URL(request.url()).pathname.endsWith('/game_completions')) return false;
            const body = request.postDataJSON(), completion = Array.isArray(body) ? body[0] : body;
            return completion?.game === 'missing-xi' && completion.score === 100;
          }, { timeout: 10000 }),
          press(lock),
        ]);
        await result.waitFor();
      }, false);
      const saved = JSON.parse(finished.dailyRaw); check(saved.v === 1 && saved.date === day && saved.gameStatus === 'won' && JSON.stringify(saved.guesses) === JSON.stringify([{ t: 'won' }]), id + ': actual daily stores exactly one winning action');
      check(/Score\s+100/i.test(finished.result) && finished.result.includes(puzzle.candidate.name) && finished.result.includes('Solved in 1/3 guesses.'), id + ': real first-guess result is 100');
      const completed = JSON.parse(finished.completionRaw); check(completed.date === day && completed.slugs.filter(slug => slug === 'missing-xi').length === 1, id + ': local completion contains the daily once');
      check(completionAttempts().length === 1 && completionAttempts()[0].completion.score === 100, id + ': exactly one aborted completion request attempts the real score');
      await inspectList(true); await photo('after');
      await action('finished-pitch', () => chooseView('Pitch')); await inspectPitch(true); await action('finished-lineup', () => chooseView('Lineup', ' ')); await inspectList(true);
      const heldSave = await frame('before-reload'); check(heldSave.dailyRaw === finished.dailyRaw && heldSave.completionRaw === finished.completionRaw, id + ': finished view changes preserve complete save bytes');
      await page.reload({ waitUntil: 'networkidle' }); if (await letsPlay.isVisible()) await press(letsPlay); await result.waitFor(); await group.waitFor();
      const restored = await frame('reloaded'); check(restored.dailyRaw === finished.dailyRaw && restored.completionRaw === finished.completionRaw && restored.result === finished.result, id + ': literal reload restores exact saved daily, completion and result');
      check(await group.getByRole('button', { name: 'Pitch', exact: true }).getAttribute('aria-pressed') === 'true', id + ': view choice remains local and reload defaults to Pitch');
      await action('restored-lineup', () => chooseView('Lineup', ' ')); await inspectList(true);
      check(completionAttempts().length === 1, id + ': restored daily sends no second completion attempt');
      check(row.errors.length === 0 && row.assetErrors.length === 0, id + ': no App exception or owned asset failure');
      row.status = 'passed'; console.log('PASS Missing XI lineup ' + width);
    } catch (error) { row.status = 'failed'; row.error = String(error.stack || error); put(id + '/failure', { error: row.error, storage: await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))).catch(() => null), text: await page.locator('body').innerText().catch(() => '') }); throw error;
    } finally { await context.close(); put('report', report); }
  }
  sameDay(); check(report.screenshots.length === 6, 'Exactly six before/after viewport screenshots'); report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = String(error.stack || error); throw error;
} finally {
  if (browser) await browser.close(); if (host) host.kill();
  report.sourceAfter = sources.map(receipt); report.distAfter = inventory('dist'); report.puzzleAfterSha256 = sha(JSON.stringify(B.pickDailyPuzzle())); report.dataAfterSha256 = sha(JSON.stringify(B.LINEUPS));
  try { assert.deepEqual(report.sourceAfter, sourceBefore); assert.deepEqual(report.distAfter, distBefore); assert.equal(report.puzzleAfterSha256, report.puzzleSha256); assert.equal(report.dataAfterSha256, report.dataSha256);
  } catch (error) { report.status = 'failed'; report.holdError = String(error); }
  put('report', report);
}
assert.equal(report.status, 'passed'); console.log('Missing XI lineup: three actual daily wins, six screenshots, exact saves/reloads and one blocked completion attempt per width.');
