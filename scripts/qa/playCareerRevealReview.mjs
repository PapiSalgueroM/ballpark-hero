// Actual-day Career Quiz early-club proof through the unchanged built App and baked fallback data.
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
const OUT = path.resolve(ROOT, process.env.CAREER_REVIEW_BROWSER_OUT || 'reveal-review-artifacts/browser');
assert(!fs.existsSync(OUT), 'Fresh evidence directory required'); fs.mkdirSync(OUT, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const put = (name, value) => { const file = name + '.json', bytes = Buffer.from(JSON.stringify(value, null, 2)); fs.mkdirSync(path.dirname(path.join(OUT, file)), { recursive: true }); fs.writeFileSync(path.join(OUT, file), bytes); return { file, bytes: bytes.length, sha256: sha(bytes) }; };
const receipt = file => { const bytes = fs.readFileSync(path.join(ROOT, file)); return { file, bytes: bytes.length, sha256: sha(bytes) }; };
const inventory = folder => fs.readdirSync(path.join(ROOT, folder), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(item => item.isDirectory() ? inventory(folder + '/' + item.name) : item.isFile() ? [receipt(folder + '/' + item.name)] : []);
const entry = "export {careerPlayers} from './src/data/careerPlayers';export {dateSeed,getTodayET} from './src/lib/dateUtils';export {careerCellValue,CAREER_COLUMN_KEYS} from './src/lib/careerBoardCells';";
const compiled = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'career-early-selector.ts', loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false, metafile: true, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
const selectorFile = path.join(OUT, 'selector.cjs'); fs.writeFileSync(selectorFile, compiled.outputFiles[0].contents);
const B = createRequire(import.meta.url)(selectorFile), day = B.getTodayET(), puzzleIndex = B.dateSeed(day) % B.careerPlayers.length, player = B.careerPlayers[puzzleIndex];
assert(player?.career.length >= 2 && player.career.every(row => typeof row.club === 'string' && row.club.trim()), 'Bounded observed daily needs two or more rows and no blank club records');
const KEY = 'career-path-daily-' + day, COMPLETIONS = 'dukb-local-completions', EARLY = 'Reveal an early club';
const POLICY = 'Reveals the earliest club box still hidden on this board.', COST = 'Early club: 1 box. Give Hint: up to 4 random boxes.';
const dataSHA = sha(JSON.stringify(B.careerPlayers)), puzzleSHA = sha(JSON.stringify(player));
const held = ['src/pages/CareerGame.tsx', 'src/hooks/useCareerGame.ts', 'src/lib/ensureAnswerInOptions.ts', 'src/components/career/CareerBoard.tsx', 'src/components/career/CareerRevealReview.tsx', 'src/lib/fetchCareerPlayers.ts', 'src/hooks/useDailyPuzzle.ts', 'src/hooks/useGameCompletion.ts', 'src/lib/completions.ts', 'src/lib/restoredFinish.ts', 'src/components/game/RulesGate.tsx', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/answerConsent.mjs', 'scripts/qa/playCareerRevealReview.mjs'];
const sources = [...new Set([...held, ...Object.keys(compiled.metafile.inputs).filter(file => file.startsWith('src/'))])].sort();
const report = { status: 'running', scope: 'CRQ-08 review extension: three unchanged core gameplay journeys and two bounded native win journeys. Actual observed ET day; real baked fallback pool after all external fetches are aborted; actual built /career page and native reveal/guess actions. No fictional data, injected save, source replacement or clock/RNG override.',
  rngScope: 'Native browser draws are not intercepted or measured. Unit proof owns zero-RNG early-hint semantics.',
  autocompleteScope: 'Ordinary actual baked fallback cohorts only. Native normal/easy/hard suggestions are checked after each completed daily review flow; fictional-cohort unit tests own delayed-fetch missing/displaced targets.',
  fontScope: 'External web fonts aborted; settled local/fallback fonts only.', completionScope: 'Completion request attempts are aborted; no successful backend write is claimed.',
  day, key: KEY, puzzleIndex, player: put('daily-player', player), puzzleSHA, dataSHA, selector: { entry, sha256: sha(compiled.outputFiles[0].contents) }, sourceBefore: sources.map(receipt), distBefore: inventory('dist'), journeys: [], screenshots: [], viewportScreenshots: [], reviewScreenshots: [], revealReviews: [], autocompleteReviews: [], checks: 0, externalForwarded: 0 };
const check = (ok, name) => { assert(ok, name); report.checks++; };
const equal = (a, b, name) => { assert.deepEqual(a, b, name); report.checks++; };
const sameDay = () => check(B.getTodayET() === day, 'Refuse an ET day rollover');
let browser, host;
try {
  const port = await new Promise((resolve, reject) => { const server = createServer(); server.once('error', reject); server.listen(0, '127.0.0.1', () => { const selected = server.address().port; server.close(() => resolve(selected)); }); });
  const BASE = 'http://127.0.0.1:' + port; report.base = BASE;
  host = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('Host startup timeout')), 15000); host.stdout.on('data', bytes => { if (String(bytes).includes('host-like server:')) { clearTimeout(timer); resolve(); } }); host.once('error', reject); host.once('exit', code => { clearTimeout(timer); reject(Error('Host exited ' + code)); }); });
  browser = await pw.chromium.launch({ headless: true });
  for (const width of [320, 390, 1280, 430, 1440]) {
    const core = [320, 390, 1280].includes(width);
    sameDay(); const id = String(width), row = { width, height: width === 320 ? 568 : width === 390 ? 844 : width === 430 ? 932 : 900, profile: core ? 'existing-core' : 'bounded-reveal-review', mode: width >= 1000 ? 'keyboard' : 'touch', status: 'running', frames: [], actions: [], layouts: [], external: [], errors: [], assetErrors: [] }; report.journeys.push(row);
    const context = await browser.newContext({ viewport: { width, height: row.height }, hasTouch: width < 1000, isMobile: width < 1000, serviceWorkers: 'block' }), page = await context.newPage();
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
    const early = page.getByRole('button', { name: EARLY, exact: true }), random = page.getByRole('button', { name: 'Give Hint', exact: true }), help = page.getByRole('button', { name: 'How to play', exact: true });
    const dialog = page.getByRole('dialog', { name: 'How to Play: Career Quiz', exact: true }), letsPlay = dialog.getByRole('button', { name: "Let's Play!", exact: true });
    const board = page.locator('div[style*="min-width: 650px"]');
    const press = async (target, key = 'Enter') => { await target.scrollIntoViewIfNeeded(); if (width >= 1000) { await target.focus(); await target.press(key); } else await target.tap(); };
    const settle = () => page.evaluate(async () => { await document.fonts.ready; const start = performance.now(); let previous = '', stable = 0, frames = 0; do { await new Promise(requestAnimationFrame); frames++; const signature = JSON.stringify([...document.querySelectorAll('button,input,[role="dialog"]')].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })); stable = signature === previous ? stable + 1 : 1; previous = signature; if (frames >= 4 && stable >= 4 && !document.getAnimations().some(a => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime))) return; } while (performance.now() - start < 10000); throw Error('Page did not settle'); });
    const attempts = () => row.external.filter(x => x.completion?.game === 'career');
    const frame = async name => { await settle(); sameDay(); const value = await page.evaluate(({ key, completionKey }) => ({ day: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()), dailyRaw: localStorage.getItem(key), completionRaw: localStorage.getItem(completionKey), storage: Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])), scroll: { x: scrollX, y: scrollY }, width: innerWidth, documentWidth: document.documentElement.scrollWidth, focus: { tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label'), text: document.activeElement?.textContent?.trim() }, inputs: [...document.querySelectorAll('input')].map(input => ({ label: input.getAttribute('aria-label'), value: input.value, type: input.type })), bodyText: document.body.innerText }), { key: KEY, completionKey: COMPLETIONS });
      value.state = value.dailyRaw ? JSON.parse(value.dailyRaw) : null; check(value.day === day && value.width === width && value.documentWidth <= width, id + ': day/width held and no document horizontal overflow');
      if (value.state) { check(value.state.v === 1 && value.state.date === day && value.state.puzzleIndex === puzzleIndex && value.state.puzzleId === player.name, id + ': actual fallback daily identity'); }
      const reference = put(id + '/frames/' + String(row.frames.length).padStart(3, '0') + '-' + name, value); row.frames.push(reference); return value; };
    const action = async (name, target, work, scrollHeld = true) => { if (target) await target.scrollIntoViewIfNeeded(); const before = await frame(name + '-before'); await work(); const after = await frame(name + '-after'); if (scrollHeld) equal(after.scroll, before.scroll, id + ': ' + name + ' does not jump document after target viewport preparation'); row.actions.push(put(id + '/actions/' + String(row.actions.length).padStart(3, '0') + '-' + name, { name, targetViewportPrepared: !!target, scrollHeld, before, after })); return { before, after }; };
    const heldBytes = (a, b, name) => { equal(b.dailyRaw, a.dailyRaw, id + ': ' + name + ' daily bytes'); equal(b.completionRaw, a.completionRaw, id + ': ' + name + ' completion bytes'); };
    const inspectBoard = async saved => { const cells = await board.locator(':scope > div').evaluateAll(rows => rows.map(row => [...row.children].map(cell => ({ text: cell.textContent.trim(), hidden: cell.tagName === 'BUTTON', label: cell.getAttribute('aria-label') })))); equal(cells.length, player.career.length + 1, id + ': all actual season rows');
      const revealed = new Set((saved.state?.guesses || []).filter(a => a.t === 'cell').map(a => a.key)), finished = saved.state?.gameStatus !== undefined && saved.state.gameStatus !== 'playing';
      for (let r = 0; r < player.career.length; r++) for (let col = 0; col < B.CAREER_COLUMN_KEYS.length; col++) { const key = B.CAREER_COLUMN_KEYS[col], cell = cells[r + 1][col], visible = col === 0 || finished || revealed.has(r + '-' + key); check(cell.hidden === !visible, id + ': actual cell visibility ' + r + '-' + key); if (visible) equal(cell.text, B.careerCellValue(player.career[r], key), id + ': real cell value ' + r + '-' + key); }
      row.layouts.push(put(id + '/layouts/' + row.layouts.length + '-board', { cells, actionKeys: [...revealed], finished })); };
    const photo = async name => { await frame(name + '-screenshot'); const file = id + '-' + name + '.png'; await page.screenshot({ path: path.join(OUT, file), fullPage: true }); const bytes = fs.readFileSync(path.join(OUT, file)); report.screenshots.push({ file, bytes: bytes.length, sha256: sha(bytes), frame: row.frames[row.frames.length - 1] }); const viewFile = id + '-' + name + '-viewport.png'; await page.screenshot({ path: path.join(OUT, viewFile), fullPage: false }); const viewBytes = fs.readFileSync(path.join(OUT, viewFile)); report.viewportScreenshots.push({ file: viewFile, bytes: viewBytes.length, sha256: sha(viewBytes), frame: row.frames[row.frames.length - 1] }); };
    const reveal = async (name, target, key, keyboard = 'Enter') => { const pair = await action(name, target, () => press(target, keyboard)); const actions = pair.before.state?.guesses || []; const expected = { v: 1, date: day, puzzleIndex, puzzleId: player.name, guesses: [...actions, { t: 'cell', key }], gameStatus: 'playing' }; equal(pair.after.dailyRaw, JSON.stringify(expected), id + ': ' + name + ' has exact manual-equivalent save codec bytes'); check(pair.after.state.gameStatus === 'playing', id + ': hint never completes game'); equal(pair.after.completionRaw, pair.before.completionRaw, id + ': hint holds completion bytes'); const shown = new Set(pair.after.state.guesses.filter(a => a.t === 'cell').map(a => a.key)); check(new RegExp('Boxes:\\s*' + shown.size + '(?:\\D|$)').test(pair.after.bodyText), id + ': exact visible unique box cost'); await inspectBoard(pair.after); return pair.after; };
    const review = page.getByRole('region', { name: 'Your reveal review', exact: true });
    const inspectReview = async (saved, phase, screenshot = false) => {
      const keys = [...new Set(saved.state.guesses.filter(item => item.t === 'cell').map(item => item.key))], columns = ['club', 'appearances', 'goals', 'assists', 'marketValue'];
      const labels = { club: 'Club', appearances: 'Apps', goals: 'Goals', assists: 'Assists', marketValue: 'Value' };
      check(keys.length > 1, id + ': bounded review has actual opened cells');
      const guesses = saved.state.guesses.filter(item => item.t === 'wrong').length + (saved.state.guesses.some(item => item.t === 'won') ? 1 : 0);
      const expectedMap = ['Career Quiz reveal map', saved.state.gameStatus === 'won' ? 'Won' : 'Not solved', 'Guesses: ' + guesses, 'Boxes: ' + keys.length, 'Columns: Club | Apps | Goals | Assists | Value',
        ...player.career.map((_, rowIndex) => 'Row ' + (rowIndex + 1) + ': ' + columns.map(column => { const index = keys.indexOf(rowIndex + '-' + column); return index < 0 ? '.' : String(index + 1); }).join(' | '))].join('\n');
      const oracle = put(id + '/review/' + phase + '-oracle', { keys, expectedMap, guesses, boxes: keys.length, scope: 'First-opening order only; no guess interleaving, hint grouping or decisive-clue inference.' });
      const toggle = review.getByRole('button', { name: 'Review your reveals', exact: true }), previous = review.getByRole('button', { name: 'Previous reveal', exact: true }), next = review.getByRole('button', { name: 'Next reveal', exact: true });
      const map = review.getByLabel('Spoiler-free reveal map', { exact: true }), copyButton = review.getByRole('button', { name: 'Copy reveal map', exact: true });
      const unchanged = async (name, target, work) => { const pair = await action('review-' + phase + '-' + name, target, work); heldBytes(saved, pair.after, 'review ' + phase + ' ' + name); check(attempts().length === 1, id + ': review does not record another completion'); return pair.after; };
      await review.waitFor(); check(await toggle.getAttribute('aria-expanded') === 'false' && await map.count() === 0 && await previous.count() === 0 && await next.count() === 0, id + ': review initially collapsed after ' + phase);
      await unchanged('open', toggle, () => press(toggle)); check(await toggle.getAttribute('aria-expanded') === 'true', id + ': review expands through native button');
      const seen = [];
      const current = async index => {
        const counter = review.getByText('Reveal ' + (index + 1) + ' of ' + keys.length, { exact: true }); check(await counter.count() === 1 && await counter.isVisible(), id + ': exact visible review ordinal');
        const matched = /^(\d+)-(club|appearances|goals|assists|marketValue)$/.exec(keys[index]); check(!!matched, id + ': saved review key is a real cell');
        const rowIndex = Number(matched[1]), column = matched[2], season = player.career[rowIndex]; check(!!season, id + ': saved review row exists');
        const expectedLine = 'Row ' + (rowIndex + 1) + ' · ' + season.season + ' · ' + labels[column] + ': ' + B.careerCellValue(season, column);
        const entry = review.getByText(expectedLine, { exact: true }); check(await entry.count() === 1 && await entry.isVisible(), id + ': visible actual saved cell, season and value at reveal ' + (index + 1));
        equal(await map.textContent(), expectedMap, id + ': exact spoiler-free map with ordinals only');
        check(await previous.isDisabled() === (index === 0) && await next.isDisabled() === (index === keys.length - 1), id + ': review boundaries');
        seen.push({ index, key: keys[index], expectedLine });
      };
      const navigation = [];
      for (const target of [previous, next]) { const geometry = await target.evaluate(button => { const r = button.getBoundingClientRect(); return { text: button.textContent.trim(), x: r.x, right: r.right, width: r.width, height: r.height, scrollWidth: button.scrollWidth, clientWidth: button.clientWidth, textOverflow: getComputedStyle(button).textOverflow }; });
        check(geometry.width >= 44 && geometry.height >= 44 && geometry.x >= 0 && geometry.right <= width && geometry.scrollWidth <= geometry.clientWidth && geometry.textOverflow !== 'ellipsis', id + ': review navigation44px and no text clipping'); navigation.push(geometry); }
      await current(0);
      if (screenshot) { await review.scrollIntoViewIfNeeded(); await frame('review-' + phase + '-screenshot'); const file = id + '-review-' + phase + '-viewport.png'; await page.screenshot({ path: path.join(OUT, file), fullPage: false }); const bytes = fs.readFileSync(path.join(OUT, file)); report.reviewScreenshots.push({ file, bytes: bytes.length, sha256: sha(bytes), frame: row.frames[row.frames.length - 1] }); }
      const disabledPointer = async (name, target, index) => { await unchanged(name, target, async () => { const box = await target.boundingBox(); check(!!box, id + ': disabled review control is rendered'); if (width >= 1000) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); else await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); }); await current(index); };
      await disabledPointer('previous-boundary', previous, 0);
      for (let index = 1; index < keys.length; index++) { await unchanged('next-' + index, next, () => press(next, index % 2 ? ' ' : 'Enter')); await current(index); }
      await disabledPointer('next-boundary', next, keys.length - 1);
      await unchanged('previous-from-last', previous, () => press(previous)); await current(keys.length - 2);
      await unchanged('next-to-last', next, () => press(next, ' ')); await current(keys.length - 1);
      const sentinel = 'CRQ-08 real clipboard precondition ' + id + ' ' + phase;
      await page.evaluate(value => navigator.clipboard.writeText(value), sentinel);
      equal(await page.evaluate(() => navigator.clipboard.readText()), sentinel, id + ': real clipboard sentinel established');
      let clipboardText;
      await unchanged('copy-map', copyButton, async () => { await press(copyButton); await review.getByRole('status').filter({ hasText: 'Reveal map copied.' }).waitFor(); clipboardText = await page.evaluate(() => navigator.clipboard.readText()); });
      check(clipboardText !== sentinel, id + ': native UI copy replaces clipboard sentinel'); equal(clipboardText, expectedMap, id + ': native clipboard contains only exact reveal map');
      const clipboard = put(id + '/review/' + phase + '-clipboard', { sentinel, readback: clipboardText, status: 'Reveal map copied.', nativeClipboard: true });
      await unchanged('close', toggle, () => press(toggle)); check(await toggle.getAttribute('aria-expanded') === 'false' && await map.count() === 0, id + ': review closes without saving UI state');
      report.revealReviews.push({ width, profile: row.profile, phase, oracle, clipboard, seen, navigation });
    };
    const inspectAutocomplete = async daily => {
      const prefix = 'an', search = page.getByRole('textbox', { name: 'Guess the player by name', exact: true });
      const peak = candidate => candidate.career.reduce((value, season) => Math.max(value, season.marketValue ?? 0), 0);
      const sorted = [...B.careerPlayers].sort((a, b) => peak(b) - peak(a)), third = Math.ceil(B.careerPlayers.length / 3);
      const cohorts = [
        { tier: 'normal', players: B.careerPlayers },
        { tier: 'easy', players: B.careerPlayers.length < 9 ? B.careerPlayers : sorted.slice(0, third) },
        { tier: 'hard', players: B.careerPlayers.length < 9 ? B.careerPlayers : sorted.slice(sorted.length - third) },
      ];
      const entering = await action('autocomplete-enter-unlimited', page.getByRole('button', { name: '∞ Unlimited', exact: true }), () => press(page.getByRole('button', { name: '∞ Unlimited', exact: true })), false);
      heldBytes(daily, entering.after, 'autocomplete mode change'); check(attempts().length === 1 && await review.count() === 0, id + ': native unlimited mode has no postgame review or extra completion');
      const searchContainer = search.locator('xpath=../..'), suggestions = searchContainer.locator('button');
      const boardState = async () => ({
        board: await board.evaluate(element => ({ text: element.textContent, hiddenButtons: [...element.querySelectorAll('button')].map(button => ({ label: button.getAttribute('aria-label'), text: button.textContent, disabled: button.disabled })) })),
        boxes: await page.getByText(/^Boxes:\s*\d+$/).textContent(),
        guesses: await page.getByText(/^Guesses:\s*\d+\/8$/).textContent(),
      });
      for (const { tier, players } of cohorts) {
        const tierButton = page.getByRole('button', { name: tier, exact: true });
        const changed = await action('autocomplete-select-' + tier, tierButton, () => press(tierButton), false);
        heldBytes(daily, changed.after, 'autocomplete ' + tier + ' selection'); check(attempts().length === 1, id + ': difficulty selection preserves completion count');
        equal(await search.inputValue(), '', id + ': ' + tier + ' begins with an empty input');
        equal(await suggestions.allTextContents(), [], id + ': ' + tier + ' begins without suggestions');
        const publicRows = players.map(candidate => ({ name: candidate.name, peakMarketValue: peak(candidate) }));
        const expected = publicRows.map(candidate => candidate.name).filter(name => name.toLowerCase().includes(prefix));
        check(expected.length > 0, id + ': ' + tier + ' prefix exercises actual suggestions');
        const oracle = put(id + '/autocomplete/' + tier + '-oracle', { tier, prefix, publicRows, expectedSuggestions: expected, poolSHA256: dataSHA, scope: 'Actual baked fallback pool only. Missing/displaced fetched targets and zero-draw option construction are owned by the fictional-cohort unit tests.' });
        const beforeBoard = await boardState();
        equal(beforeBoard.boxes.trim(), 'Boxes: 0', id + ': ' + tier + ' native round has no reveals');
        equal(beforeBoard.guesses.trim(), 'Guesses: 0/8', id + ': ' + tier + ' native round has no guesses');
        const fillStart = row.frames.length;
        const filled = await action('autocomplete-fill-' + tier, search, () => search.fill(prefix));
        const fillFrames = row.frames.slice(fillStart), observed = await suggestions.allTextContents(), filledBoard = await boardState();
        equal(observed, expected, id + ': ' + tier + ' exact public suggestion order');
        equal(await search.inputValue(), prefix, id + ': ' + tier + ' native input holds typed prefix');
        equal(filledBoard, beforeBoard, id + ': ' + tier + ' typing holds board text hidden cells and counters');
        heldBytes(daily, filled.after, 'autocomplete ' + tier + ' fill'); equal(filled.after.storage, filled.before.storage, id + ': ' + tier + ' typing writes no storage'); check(attempts().length === 1, id + ': ' + tier + ' typing records no completion');
        const clearStart = row.frames.length;
        const cleared = await action('autocomplete-clear-' + tier, search, () => search.fill(''));
        const clearFrames = row.frames.slice(clearStart), clearedBoard = await boardState();
        equal(await suggestions.allTextContents(), [], id + ': ' + tier + ' clearing removes suggestions');
        equal(await search.inputValue(), '', id + ': ' + tier + ' input cleared natively');
        equal(clearedBoard, beforeBoard, id + ': ' + tier + ' clearing holds board text hidden cells and counters');
        heldBytes(daily, cleared.after, 'autocomplete ' + tier + ' clear'); equal(cleared.after.storage, cleared.before.storage, id + ': ' + tier + ' clearing writes no storage'); check(attempts().length === 1, id + ': ' + tier + ' clearing records no completion');
        const states = put(id + '/autocomplete/' + tier + '-states', { beforeBoard, filledBoard, clearedBoard, observedSuggestions: observed, fillFrames, clearFrames, selectedFrame: row.frames[fillStart - 1] });
        report.autocompleteReviews.push({ width, profile: row.profile, tier, prefix, oracle, states, fillFrames, clearFrames });
      }
      check(attempts().length === 1 && row.errors.length === 0 && row.assetErrors.length === 0, id + ': native autocomplete leaves completion and App/asset errors held');
    };
    try {
      await context.route('**/*', route => { const request = route.request(); if (new URL(request.url()).origin === BASE) return route.continue(); const value = { url: request.url(), method: request.method(), outcome: 'aborted' }; if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/game_completions')) { const body = request.postDataJSON(); value.completion = Array.isArray(body) ? body[0] : body; } row.external.push(value); return route.abort('blockedbyclient'); });
      page.on('pageerror', error => row.errors.push(String(error))); page.on('response', response => { if (new URL(response.url()).origin === BASE && response.status() >= 400) row.assetErrors.push({ url: response.url(), status: response.status() }); }); page.on('requestfailed', request => { if (new URL(request.url()).origin === BASE) row.assetErrors.push({ url: request.url(), failure: request.failure() }); });
      await page.goto(BASE + '/career', { waitUntil: 'networkidle' }); await answerConsent(page, { press: async (target, key) => { await action('consent-choice', target, () => press(target, key), false); } }); check(await storedConsent(page) === 'rejected', id + ': optional consent rejected through real UI');
      await dialog.waitFor(); const rules = (await dialog.innerText()).replace(/\s+/g, ' '); check(rules.includes('Reveal an early club opens the earliest club box still hidden on this board for 1 box.') && rules.includes('Example: if the first club is already open, Reveal an early club opens the next hidden club for 1 box.') && /Give Hint.*4 random boxes/.test(rules), id + ': actual new rule/example and old four-box rule');
      await action('initial-rules-close', letsPlay, () => press(letsPlay), false); await early.waitFor(); await board.waitFor(); check(await early.isEnabled(), id + ': native early-club action enabled'); await page.getByText(POLICY, { exact: true }).waitFor(); await page.getByText(COST, { exact: true }).waitFor();
      await early.scrollIntoViewIfNeeded(); const geometry = await early.evaluate(button => { const r = button.getBoundingClientRect(), style = getComputedStyle(button), ranges = []; const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT); let node; while ((node = walker.nextNode())) if (node.textContent.trim()) { const range = document.createRange(); range.selectNodeContents(node); ranges.push(...[...range.getClientRects()].map(x => ({ x: x.x, right: x.right, y: x.y, bottom: x.bottom }))); } return { x: r.x, right: r.right, y: r.y, bottom: r.bottom, width: r.width, height: r.height, viewport: innerWidth, scrollWidth: button.scrollWidth, clientWidth: button.clientWidth, textOverflow: style.textOverflow, centerHit: button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)), ranges }; });
      row.layouts.push(put(id + '/layouts/early-control', geometry)); check(geometry.height >= 44 && geometry.width >= 44 && geometry.x >= 0 && geometry.right <= width && geometry.scrollWidth <= geometry.clientWidth && geometry.textOverflow !== 'ellipsis', id + ': 44px early-club control fits and wraps without ellipsis'); check(geometry.centerHit, id + ': early-club control is not covered by another element'); check(geometry.ranges.every(r => r.x >= geometry.x - 1 && r.right <= geometry.right + 1 && r.y >= geometry.y - 1 && r.bottom <= geometry.bottom + 1), id + ': full early-club label stays in its control');
      const copyLayout = []; for (const label of [POLICY, COST]) { const item = await page.getByText(label, { exact: true }).evaluate(element => { const r = element.getBoundingClientRect(), style = getComputedStyle(element); return { text: element.textContent, x: r.x, right: r.right, height: r.height, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, textOverflow: style.textOverflow }; }); copyLayout.push(item); check(item.height > 0 && item.x >= 0 && item.right <= width && item.scrollHeight <= item.clientHeight && item.scrollWidth <= item.clientWidth && item.textOverflow !== 'ellipsis', id + ': full policy/cost copy fits its wrapping block'); } row.layouts.push(put(id + '/layouts/policy-copy', copyLayout));
      const fresh = await frame('fresh'); equal(fresh.state?.guesses || [], [], id + ': fresh real daily has no injected actions'); check(fresh.completionRaw === null && attempts().length === 0, id + ': no pre-play completion'); await inspectBoard(fresh); check(await review.count() === 0, id + ': no review before finish'); if (core) await photo('before');
      await reveal('manual-first-club', page.getByRole('button', { name: 'Reveal club for career row 1', exact: true }), '0-club');
      const firstEarly = await reveal('early-skips-open-first', early, '1-club', ' '); if (core) await photo('after');
      const reloaded = await action('partial-literal-reload', null, async () => { await page.reload({ waitUntil: 'networkidle' }); await early.waitFor(); }, false); heldBytes(firstEarly, reloaded.after, 'partial reload'); await inspectBoard(reloaded.after);
      const helpBefore = await action('help-open', help, () => press(help)); equal(helpBefore.after.dailyRaw, helpBefore.before.dailyRaw, id + ': opening help holds save'); const close = await action('help-close', null, async () => { if (width >= 1000) await page.keyboard.press('Escape'); else await press(letsPlay); }); heldBytes(helpBefore.before, close.after, 'help roundtrip'); equal(close.after.scroll, helpBefore.before.scroll, id + ': help restores document offset'); check(close.after.focus.label === 'How to play', id + ': help returns focus to real trigger');
      let four;
      if (core) {
      let last = close.after;
      for (let r = 2; r < player.career.length; r++) last = await reveal('early-row-' + (r + 1), early, r + '-club', r % 2 ? ' ' : 'Enter');
      check(await early.isDisabled() && await random.isEnabled(), id + ': early action exhausted while stat hints remain');
      const exhausted = await action('exhausted-native-pointer', early, async () => { const box = await early.boundingBox(); check(!!box, id + ': disabled action still visible'); if (width >= 1000) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); else await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); }); heldBytes(last, exhausted.after, 'exhausted early action'); equal(attempts().length, 0, id + ': hints do not complete');
      four = await action('existing-four-random-hint', random, () => press(random)); const oldActions = four.before.state.guesses, additions = four.after.state.guesses.slice(oldActions.length); equal(four.after.state.guesses.slice(0, oldActions.length), oldActions, id + ': random hint preserves full prefix'); check(additions.length === 4 && additions.every(a => a.t === 'cell' && !a.key.endsWith('-club')) && new Set(additions.map(a => a.key)).size === 4 && additions.every(a => !oldActions.some(old => old.t === 'cell' && old.key === a.key)), id + ': existing random hint spends four distinct remaining stats'); equal(four.after.dailyRaw, JSON.stringify({ ...four.before.state, guesses: [...oldActions, ...additions] }), id + ': random hint exact full save codec bytes'); equal(four.after.completionRaw, four.before.completionRaw, id + ': random hint does not complete'); await inspectBoard(four.after);
      } else { four = { after: await reveal('bounded-manual-first-goals', page.getByRole('button', { name: 'Reveal goals for career row 1', exact: true }), '0-goals') }; }
      check(await review.count() === 0, id + ': review remains absent while playing');
      const search = page.getByRole('textbox', { name: 'Guess the player by name', exact: true }); await action('type-real-answer', search, () => search.fill(player.name)); const answer = page.getByRole('button', { name: player.name, exact: true }); await answer.waitFor();
      const completionRequest = page.waitForRequest(request => { if (request.method() !== 'POST' || !new URL(request.url()).pathname.endsWith('/game_completions')) return false; const body = request.postDataJSON(), item = Array.isArray(body) ? body[0] : body; return item.game === 'career'; });
      const won = await action('actual-correct-autocomplete', answer, async () => { await press(answer); await completionRequest; await page.getByText('Correct!', { exact: true }).waitFor(); }, false);
      equal(won.after.dailyRaw, JSON.stringify({ ...four.after.state, guesses: [...four.after.state.guesses, { t: 'won' }], gameStatus: 'won' }), id + ': one real winning guess with exact full save codec bytes'); check(won.after.state.gameStatus === 'won' && /in 1 guess/.test(won.after.bodyText), id + ': real first-guess victory'); const completion = JSON.parse(won.after.completionRaw); equal(completion, { date: day, slugs: ['career'] }, id + ': complete fresh local completion record'); check(completion.date === day && completion.slugs.filter(slug => slug === 'career').length === 1 && attempts().length === 1 && attempts()[0].completion.score === 700, id + ': completion exactly once locally and one aborted score700 request'); await inspectBoard(won.after); await inspectReview(won.after, 'won', true);
      const restored = await action('won-literal-reload', null, async () => { await page.reload({ waitUntil: 'networkidle' }); await page.getByText('Correct!', { exact: true }).waitFor(); }, false); heldBytes(won.after, restored.after, 'won reload'); await inspectBoard(restored.after); await inspectReview(restored.after, 'reloaded'); check(attempts().length === 1 && row.errors.length === 0 && row.assetErrors.length === 0, id + ': no repeat completion or App/owned-asset error');
      await inspectAutocomplete(restored.after);
      row.status = 'passed'; console.log('PASS Career early club ' + width);
    } catch (error) { row.status = 'failed'; row.error = String(error.stack || error); put(id + '/failure', { error: row.error, text: await page.locator('body').innerText().catch(() => ''), storage: await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))).catch(() => null) }); throw error; }
    finally { await context.close(); put('report', report); }
  }
  sameDay(); check(report.screenshots.length === 6, 'Exactly six before/after screenshots'); check(report.viewportScreenshots.length === 6 && report.reviewScreenshots.length === 5, 'Six existing viewport and five open-review viewport captures'); check(report.revealReviews.length === 10, 'Five native wins with review checks before and after literal reload'); equal(report.autocompleteReviews.map(item => item.width + '/' + item.tier), [320, 390, 1280, 430, 1440].flatMap(width => ['normal', 'easy', 'hard'].map(tier => width + '/' + tier)), 'All fifteen width/tier public autocomplete reviews'); report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = String(error.stack || error); throw error; }
finally {
  if (browser) await browser.close(); if (host) host.kill();
  report.sourceAfter = sources.map(receipt); report.distAfter = inventory('dist'); report.dataAfterSHA = sha(JSON.stringify(B.careerPlayers)); report.puzzleAfterSHA = sha(JSON.stringify(B.careerPlayers[B.dateSeed(B.getTodayET()) % B.careerPlayers.length]));
  report.sourceHeld = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter); report.distHeld = JSON.stringify(report.distBefore) === JSON.stringify(report.distAfter);
  if (!report.sourceHeld || !report.distHeld || report.dataAfterSHA !== dataSHA || report.puzzleAfterSHA !== puzzleSHA) { report.status = 'failed'; report.holdError = 'Source, dist, data or day identity changed'; process.exitCode = 1; }
  put('report', report);
}
