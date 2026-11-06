// Remote-only SG-11/PL-05 browser proof. Fictional validator verdicts do not verify sports eligibility.
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

assert(process.env.CI, 'Remote CI only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, process.env.SOCCER_GRID_BROWSER_OUT || 'grid-submission-artifacts/browser');
assert(!fs.existsSync(OUT), 'Fresh evidence directory required'); fs.mkdirSync(OUT, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const put = (name, value) => { const bytes = Buffer.from(JSON.stringify(value, null, 2)), file = name + '.json'; fs.mkdirSync(path.dirname(path.join(OUT, file)), { recursive: true }); fs.writeFileSync(path.join(OUT, file), bytes); return { file, bytes: bytes.length, sha256: sha(bytes) }; };
const receipt = file => { const bytes = fs.readFileSync(path.join(ROOT, file)); return { file, bytes: bytes.length, sha256: sha(bytes) }; };
const inventory = folder => fs.readdirSync(path.join(ROOT, folder), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(item => item.isDirectory() ? inventory(folder + '/' + item.name) : item.isFile() ? [receipt(folder + '/' + item.name)] : []);
const entry = "export {soccerGridPuzzles} from './src/data/soccerGridPuzzles';export {filterPoolByDifficulty,DEFAULT_SETTINGS} from './src/lib/soccerGridDifficulty';export {getTodayET,dateSeed} from './src/lib/dateUtils';";
const compiled = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'soccer-grid-selector.ts', loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false, metafile: true, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
const selector = path.join(OUT, 'selector.cjs'); fs.writeFileSync(selector, compiled.outputFiles[0].contents);
const B = createRequire(import.meta.url)(selector), day = B.getTodayET();
const pool = B.filterPoolByDifficulty(B.soccerGridPuzzles, B.DEFAULT_SETTINGS.difficulty);
const puzzle = pool[B.dateSeed(day) % pool.length], puzzleIndex = B.soccerGridPuzzles.findIndex(p => p.id === puzzle.id);
assert(puzzle && puzzleIndex >= 0 && puzzle.rows.length === 3 && puzzle.cols.length === 3, 'Actual baked daily board required');
const KEY = 'soccer-grid-daily-' + day, EPOCH = 'soccer-grid-timer-started-' + day, EXPIRED = 'soccer-grid-timer-expired-' + day;
const OT = 'soccer-grid-overtime-' + day, OTACTIVE = 'soccer-grid-overtime-active-' + day, COMPLETIONS = 'dukb-local-completions';
const POLICY = 'Timed rounds keep counting while answers are checked and while you are away. Reloading keeps the same deadline. A late answer does not count. Unlimited has no clock.';
const EXAMPLE = /checking finishes after.*0.*does not change.*ended main round/i;
const held = ['src/pages/SoccerGrid.tsx', 'src/hooks/useSoccerGrid.ts', 'src/hooks/useDailyPuzzle.ts', 'src/hooks/useGameCompletion.ts', 'src/lib/soccerGridDifficulty.ts', 'src/lib/fetchSoccerGridPuzzles.ts', 'src/lib/fetchCareerPlayers.ts', 'src/lib/gridRarity.ts', 'src/lib/restoredFinish.ts', 'src/lib/completions.ts', 'src/components/soccer-grid/SoccerGridBoard.tsx', 'src/components/soccer-grid/SoccerGridSearch.tsx', 'src/components/game/HowToPlayPopover.tsx', 'scripts/lib/answerConsent.mjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/qa/playSoccerGridSubmission.mjs'];
const sources = [...new Set([...held, ...Object.keys(compiled.metafile.inputs).filter(file => file.startsWith('src/'))])].sort();
const report = { status: 'running', scope: 'Actual built App, observed ET day and unchanged baked Soccer Grid board. Three widths each exercise two native tabs, held fictional validator response, eight adopted cells and a distinct ninth-cell finish; a separate fresh context runs a real 40-second timer, held response, deadline, reload and genuine Overtime.',
  fixtureScope: 'Only soccer-grid-validate POST and its CORS preflight are fulfilled locally. Every submitted identity is fictional. Valid replies are controlled settlement fixtures, not evidence that the player satisfies a real criterion. No production request is forwarded.',
  limits: ['No clock/RNG/source/DOM/save override or injected final state. Native RNG unobserved.', 'External fonts and every other nonlocal request are aborted. Selection and completion attempts are observed and blocked, never credited as backend writes.', 'Real-time browser deadline integration is measured; unit tests own the no-tick micro-boundaries and same-React-batch cases.', 'Background visibility is recorded, not assumed to model OS suspension.'],
  day, key: KEY, puzzleIndex, puzzle: put('actual-baked-puzzle', puzzle), dataSHA: sha(JSON.stringify(B.soccerGridPuzzles)), puzzleSHA: sha(JSON.stringify(puzzle)), selector: { entry, sha256: sha(compiled.outputFiles[0].contents) },
  sourceBefore: sources.map(receipt), distBefore: inventory('dist'), checks: 0, journeys: [], screenshots: [], externalForwarded: 0 };
const check = (ok, name) => { assert(ok, name); report.checks++; };
const equal = (a, b, name) => { assert.deepEqual(a, b, name); report.checks++; };
const sameDay = () => check(B.getTodayET() === day, 'Refuse ET day rollover');
const waitUntil = async (predicate, name, timeout = 8000) => { const end = Date.now() + timeout; while (!(await predicate())) { assert(Date.now() < end, name); await new Promise(resolve => setTimeout(resolve, 40)); } };
let browser, host;

try {
  const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const n = probe.address().port; probe.close(() => resolve(n)); }); });
  const BASE = 'http://127.0.0.1:' + port; report.base = BASE;
  host = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('Host startup timeout')), 15000); host.stdout.on('data', bytes => { if (String(bytes).includes('host-like server:')) { clearTimeout(timer); resolve(); } }); host.once('error', reject); host.once('exit', code => { clearTimeout(timer); reject(Error('Host exited ' + code)); }); });
  browser = await pw.chromium.launch({ headless: true });
  for (const width of [320, 390, 1280]) for (const scenario of ['ownership', 'deadline']) {
    sameDay();
    const id = width + '-' + scenario, height = width === 320 ? 568 : width === 390 ? 844 : 900;
    const row = { width, height, scenario, mode: width >= 1000 ? 'keyboard' : 'touch', status: 'running', frames: [], actions: [], layouts: [], external: [], storageEvents: [], visibility: [], errors: [], assetErrors: [], fixtures: [] };
    report.journeys.push(row);
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1000, isMobile: width < 1000, serviceWorkers: 'block' });
    const pages = new Map(), plans = new Map();
    const counts = label => row.external.filter(e => e.page === label && e.path.endsWith('/soccer_grid_selections') && e.method !== 'POST').length;
    const writes = label => row.external.filter(e => (!label || e.page === label) && e.path.endsWith('/soccer_grid_selections') && e.method === 'POST');
    const attempts = () => row.external.filter(e => e.completion?.game === 'soccer-grid');
    const cells = page => page.locator('button[data-grid-cell-status]');
    const press = async (target, key = 'Enter') => { await target.scrollIntoViewIfNeeded(); if (width >= 1000) { await target.focus(); await target.press(key); } else await target.tap(); };
    const settle = async page => { await page.evaluate(async () => { await document.fonts.ready; const start = performance.now(); let stable = 0, previous = ''; do { await new Promise(requestAnimationFrame); const signature = JSON.stringify([...document.querySelectorAll('button,input,[role="dialog"]')].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return [r.x,r.y,r.width,r.height]; })); stable = signature === previous ? stable + 1 : 1; previous = signature; if (stable >= 4 && !document.getAnimations().some(a => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime))) return; } while (performance.now() - start < 10000); throw Error('Page did not settle'); }); };
    const frame = async (page, name) => {
      await page.bringToFront(); await settle(page); sameDay();
      const value = await page.evaluate(({ key, completionKey, epoch, expired, ot, otactive }) => ({
        at: Date.now(), day: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()),
        dailyRaw: localStorage.getItem(key), completionRaw: localStorage.getItem(completionKey), epochRaw: localStorage.getItem(epoch), expiredRaw: localStorage.getItem(expired), overtimeRaw: localStorage.getItem(ot), overtimeActiveRaw: localStorage.getItem(otactive),
        storage: Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])), visibility: document.visibilityState,
        width: innerWidth, documentWidth: document.documentElement.scrollWidth, documentHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight), scroll: { x: scrollX, y: scrollY },
        focus: { tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label'), text: document.activeElement?.textContent?.trim() },
        bodyText: document.body.innerText, inputs: [...document.querySelectorAll('input')].map(e => ({ label: e.getAttribute('aria-label'), value: e.value, disabled: e.disabled })),
        cells: [...document.querySelectorAll('button[data-grid-cell-status]')].map((e, index) => { const r = e.getBoundingClientRect(); return { index, status: e.getAttribute('data-grid-cell-status'), text: e.innerText, disabled: e.disabled, rect: { x: r.x, y: r.y, width: r.width, height: r.height } }; })
      }), { key: KEY, completionKey: COMPLETIONS, epoch: EPOCH, expired: EXPIRED, ot: OT, otactive: OTACTIVE });
      value.state = value.dailyRaw ? JSON.parse(value.dailyRaw) : null;
      check(value.day === day && value.width === width && value.documentWidth <= width, id + ': actual day/width and no document overflow');
      if (value.state) { check(value.state.v === 1 && value.state.date === day && value.state.puzzleIndex === puzzleIndex && value.state.puzzleId === puzzle.id, id + ': actual baked daily save identity'); equal(value.dailyRaw, JSON.stringify({ v: 1, date: day, puzzleIndex, puzzleId: puzzle.id, guesses: value.state.guesses, gameStatus: value.state.gameStatus }), id + ': exact entire daily codec bytes'); }
      row.frames.push(put(id + '/frames/' + String(row.frames.length).padStart(3, '0') + '-' + name, { page: pages.get(page), ...value })); return value;
    };
    const action = async (page, name, target, work, scrollHeld = true) => {
      if (target) await target.scrollIntoViewIfNeeded();
      const before = await frame(page, name + '-before'); await work(); const after = await frame(page, name + '-after');
      if (scrollHeld) equal(after.scroll, before.scroll, id + ': no document jump after prepared ' + name);
      row.actions.push(put(id + '/actions/' + String(row.actions.length).padStart(3, '0') + '-' + name, { name, page: pages.get(page), prepared: !!target, scrollHeld, before, after })); return { before, after };
    };
    const heldBytes = (before, after, name) => { equal(after.dailyRaw, before.dailyRaw, id + ': exact daily bytes ' + name); equal(after.completionRaw, before.completionRaw, id + ': exact local completion bytes ' + name); };
    const addPlan = (name, cell, hold = false, valid = true) => {
      check(!plans.has(name.toLowerCase()), id + ': unique fictional verdict plan');
      let release; const promise = hold ? new Promise(resolve => { release = resolve; }) : Promise.resolve();
      const plan = { name, cell, valid, hold, consumed: false, released: !hold, promise, release: () => { plan.released = true; release?.(); } };
      plans.set(name.toLowerCase(), plan); row.fixtures.push({ name, cell, valid, held: hold, row: puzzle.rows[Math.floor(cell / 3)], column: puzzle.cols[cell % 3] }); return plan;
    };
    const inspectBoard = async (page, expectedCount, label) => {
      const value = await frame(page, label), filled = value.cells.filter(c => c.status === 'correct');
      check(value.cells.length === 9 && filled.length === expectedCount, id + ': nine cells with exact filled count ' + label);
      check(value.cells.every(c => c.rect.width >= 44 && c.rect.height >= 44 && c.rect.x >= -0.5 && c.rect.x + c.rect.width <= width + 0.5), id + ': grid targets fit narrow viewport');
      if (value.state) {
        const oks = value.state.guesses.filter(a => a.t === 'ok');
        equal(oks.length, new Set(oks.map(a => a.cellIndex)).size, id + ': no duplicate success cell in actual saved log');
        for (const a of oks) check(Number.isInteger(a.cellIndex) && a.cellIndex >= 0 && a.cellIndex < 9 && Number.isFinite(a.rarity) && value.cells[a.cellIndex].text.includes(a.playerName), id + ': full saved success matches visible cell');
      }
      return value;
    };
    const photo = async (page, name) => {
      const value = await frame(page, name + '-screenshot'), board = cells(page).first().locator('xpath=../../..');
      const bounds = await board.boundingBox(), result = page.getByRole('status').filter({ has: page.getByRole('heading', { name: scenario === 'ownership' ? 'Grid Complete!' : "Time's Up!", exact: true }) });
      const end = await result.boundingBox(); check(!!bounds && !!end, id + ': phase screenshot has actual board and result');
      const y = Math.max(0, Math.floor(bounds.y + value.scroll.y - 12)), clip = { x: 0, y, width, height: Math.min(value.documentHeight - y, Math.ceil(end.y + value.scroll.y + end.height + 12 - y)) };
      const file = id + '-' + name + '.png'; await page.screenshot({ path: path.join(OUT, file), fullPage: true, clip });
      const bytes = fs.readFileSync(path.join(OUT, file)); report.screenshots.push({ file, bytes: bytes.length, sha256: sha(bytes), clip, frame: row.frames.at(-1), page: pages.get(page) }); return value;
    };
    const mount = async label => {
      const page = await context.newPage(); pages.set(page, label);
      page.on('pageerror', error => row.errors.push({ page: label, error: String(error) }));
      page.on('response', response => { if (new URL(response.url()).origin === BASE && response.status() >= 400) row.assetErrors.push({ page: label, url: response.url(), status: response.status() }); });
      page.on('requestfailed', request => { if (new URL(request.url()).origin === BASE) row.assetErrors.push({ page: label, url: request.url(), failure: request.failure() }); });
      await page.goto(BASE + '/soccer-grid', { waitUntil: 'networkidle' });
      await page.exposeBinding('__observeGridEvidence', (_source, evidence) => { const target = evidence.kind === 'storage' ? row.storageEvents : row.visibility; target.push({ page: label, ...evidence }); });
      await page.evaluate(() => {
        window.addEventListener('storage', e => window.__observeGridEvidence({ kind: 'storage', at: Date.now(), key: e.key, oldValue: e.oldValue, newValue: e.newValue, url: e.url, isTrusted: e.isTrusted }));
        document.addEventListener('visibilitychange', e => window.__observeGridEvidence({ kind: 'visibility', at: Date.now(), state: document.visibilityState, isTrusted: e.isTrusted }));
      });
      await answerConsent(page, { press: async target => { await action(page, 'reject-optional-consent', target, () => press(target), false); } });
      check(await storedConsent(page) === 'rejected', id + ': actual optional-consent refusal');
      const dialog = page.getByRole('dialog', { name: 'How to Play Soccer Grid', exact: true });
      if (await dialog.isVisible()) {
        check((await dialog.innerText()).includes(POLICY) && EXAMPLE.test(await dialog.innerText()), id + ': automatic help policy and worked example');
        await action(page, 'initial-help-close', dialog.getByRole('button', { name: "Let's Play!", exact: true }), () => press(dialog.getByRole('button', { name: "Let's Play!", exact: true })), false);
      }
      await cells(page).first().waitFor(); check(await cells(page).count() === 9, id + ': actual App grid loaded');
      const settings = page.getByRole('button', { name: '40s', exact: true }).locator('xpath=../..');
      const note = settings.getByText(POLICY, { exact: true }); await note.waitFor();
      const box = await note.boundingBox(); check(!!box && box.x >= 0 && box.x + box.width <= width && box.height > 0, id + ': pre-play policy wraps within screen');
      await inspectBoard(page, 0, 'mounted-' + label); return page;
    };
    const policyHelp = async page => {
      const target = page.getByRole('button', { name: 'How to play', exact: true });
      const opened = await action(page, 'reopen-policy-help', target, () => press(target));
      const dialog = page.getByRole('dialog', { name: 'How to Play Soccer Grid', exact: true });
      check((await dialog.innerText()).includes(POLICY) && EXAMPLE.test(await dialog.innerText()), id + ': reopenable actual policy/example');
      const close = dialog.getByRole('button', { name: "Let's Play!", exact: true });
      const closed = await action(page, 'close-policy-help', close, () => press(close));
      heldBytes(opened.before, closed.after, 'help'); equal(closed.after.scroll, opened.before.scroll, id + ': help returns to prepared document position');
    };
    const submit = async (page, cell, name, held = false) => {
      const plan = addPlan(name, cell, held);
      await action(page, 'choose-cell-' + cell + '-' + name, cells(page).nth(cell), () => press(cells(page).nth(cell)), false);
      const input = page.getByRole('combobox', { name: 'Search for a player', exact: true });
      await input.waitFor();
      await action(page, 'type-' + name, input, () => input.fill(name));
      const button = page.getByRole('button', { name: 'Submit', exact: true });
      await action(page, 'submit-' + name, button, async () => { await press(button); await waitUntil(() => plan.consumed, id + ': expected validator fixture reached'); }, false);
      if (!held) await waitUntil(async () => !(await page.getByRole('combobox', { name: 'Search for a player', exact: true }).count()), id + ': settled request closes actual search');
      return plan;
    };
    const completionCheck = (value, score) => { equal(JSON.parse(value.completionRaw), { date: day, slugs: ['soccer-grid'] }, id + ': one actual local daily completion'); check(attempts().length === 1 && attempts()[0].completion.score === score && attempts()[0].outcome === 'aborted', id + ': one blocked completion attempt with actual score'); };
    const completionWait = page => page.waitForRequest(request => { if (request.method() !== 'POST' || !new URL(request.url()).pathname.endsWith('/game_completions')) return false; const body = request.postDataJSON(), entry = Array.isArray(body) ? body[0] : body; return entry.game === 'soccer-grid'; }, { timeout: 65000 });
    try {
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === BASE) return route.continue();
        const page = request.frame()?.page(), label = pages.get(page) || 'other', event = { page: label, at: Date.now(), url: request.url(), path: url.pathname, method: request.method(), outcome: 'aborted' };
        row.external.push(event);
        if (url.pathname.endsWith('/soccer-grid-validate') && request.method() === 'OPTIONS') {
          event.outcome = 'fixture-cors'; return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': '*' } });
        }
        if (url.pathname.endsWith('/soccer-grid-validate') && request.method() === 'POST') {
          const body = request.postDataJSON(), plan = plans.get(String(body.playerName).toLowerCase()); event.body = body;
          check(!!plan && !plan.consumed, id + ': validator has one explicit fictional fixture plan'); plan.consumed = true;
          equal([body.rowAttribute, body.colAttribute], [puzzle.rows[Math.floor(plan.cell / 3)].label, puzzle.cols[plan.cell % 3].label], id + ': actual baked criteria sent');
          event.outcome = 'fixture-held'; await plan.promise; event.outcome = 'fixture-fulfilled'; event.releasedAt = Date.now();
          event.reply = { valid: plan.valid, fullName: plan.name };
          return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: JSON.stringify(event.reply) });
        }
        if (request.method() === 'POST' && url.pathname.endsWith('/game_completions')) { const body = request.postDataJSON(); event.completion = Array.isArray(body) ? body[0] : body; }
        if (request.method() === 'POST' && url.pathname.endsWith('/soccer_grid_selections')) event.selection = request.postDataJSON();
        return route.abort('blockedbyclient');
      });
      if (scenario === 'ownership') {
        const a = await mount('A'), b = await mount('B'); await policyHelp(a);
        const pending = await submit(b, 0, 'Generated Fixture Pending', true);
        for (let cell = 0; cell < 8; cell++) await submit(a, cell, 'Generated Fixture Owner ' + cell);
        const saved = await inspectBoard(a, 8, 'A-eight-saved');
        await waitUntil(async () => await cells(b).filter({ hasText: 'Generated Fixture Owner' }).count() === 8, id + ': real storage event adopted eight cells in B');
        const adopted = await inspectBoard(b, 8, 'B-eight-adopted-while-pending');
        equal(adopted.dailyRaw, saved.dailyRaw, id + ': both tabs share exact eight-action bytes');
        check(adopted.inputs.some(e => e.label === 'Search for a player' && e.disabled), id + ': B original validator remains pending');
        check(row.storageEvents.some(e => e.page === 'B' && e.key === KEY && e.newValue === saved.dailyRaw && e.isTrusted), id + ': actual trusted storage event received');
        const bCounts = counts('B'), bWrites = writes('B').length;
        await action(b, 'release-stale-valid-response', null, async () => { pending.release(); await waitUntil(async () => !(await b.getByRole('combobox', { name: 'Search for a player', exact: true }).count()), id + ': rejected stale response cleans up'); });
        const rejected = await inspectBoard(b, 8, 'B-stale-response-refused');
        heldBytes(adopted, rejected, 'stale callback'); equal(rejected.cells.map(({ index, status, text, disabled }) => ({ index, status, text, disabled })), adopted.cells.map(({ index, status, text, disabled }) => ({ index, status, text, disabled })), id + ': stale callback preserves all cell contents');
        check(counts('B') === bCounts && writes('B').length === bWrites && bWrites === 0 && attempts().length === 0, id + ': rejected validator starts no B rarity/write/completion attempt');
        const ninthRequest = completionWait(a); await submit(a, 8, 'Generated Fixture Ninth'); await ninthRequest;
        await a.getByRole('heading', { name: 'Grid Complete!', exact: true }).waitFor(); await b.getByRole('heading', { name: 'Grid Complete!', exact: true }).waitFor();
        const won = await inspectBoard(a, 9, 'A-distinct-ninth-won'), followed = await inspectBoard(b, 9, 'B-follows-actual-win');
        equal(won.state.guesses.map(x => x.cellIndex), [0,1,2,3,4,5,6,7,8], id + ': exactly nine distinct actions in opening order');
        check(won.state.gameStatus === 'won' && writes().length === 9, id + ': actual nine-cell win and nine blocked selection attempts'); completionCheck(won, 900); heldBytes(won, followed, 'B adopts finish');
        await photo(a, 'nine-distinct-won');
        for (const page of [b, a]) {
          const reloaded = await action(page, 'literal-won-reload-' + pages.get(page), null, async () => { await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('heading', { name: 'Grid Complete!', exact: true }).waitFor(); }, false);
          heldBytes(won, reloaded.after, 'won reload'); await inspectBoard(page, 9, 'won-reloaded-' + pages.get(page)); completionCheck(reloaded.after, 900);
        }
        row.finalDailyRaw = won.dailyRaw;
      } else {
        const page = await mount('Timed'); await policyHelp(page);
        await action(page, 'choose-native-forty-seconds', page.getByRole('button', { name: '40s', exact: true }), () => press(page.getByRole('button', { name: '40s', exact: true })));
        const finishedRequest = completionWait(page), pending = await submit(page, 0, 'Generated Fixture Deadline', true);
        const started = await frame(page, 'first-native-submission-started-real-clock');
        check(started.dailyRaw === null && Number.isFinite(Number(started.epochRaw)) && started.at - Number(started.epochRaw) >= 0 && started.at - Number(started.epochRaw) < 10000, id + ': actual first-submission epoch, no injected save');
        const background = await context.newPage(); pages.set(background, 'Background blank tab');
        row.visibility.push({ page: 'Timed', kind: 'sample-before-background', ...(await page.evaluate(() => ({ at: Date.now(), state: document.visibilityState }))) });
        await background.bringToFront();
        row.visibility.push({ page: 'Timed', kind: 'sample-while-other-tab-front', ...(await page.evaluate(() => ({ at: Date.now(), state: document.visibilityState }))) });
        console.log('WAIT actual 40-second Soccer Grid deadline ' + width);
        await page.waitForFunction(epoch => Date.now() >= Number(localStorage.getItem(epoch)) + 40000, EPOCH, { polling: 100, timeout: 50000 });
        await page.bringToFront(); await page.getByRole('heading', { name: "Time's Up!", exact: true }).waitFor({ timeout: 8000 }); await finishedRequest;
        const expired = await inspectBoard(page, 0, 'real-deadline-completed-with-response-pending');
        check(expired.at >= Number(started.epochRaw) + 40000 && expired.epochRaw === started.epochRaw && expired.expiredRaw === '1' && expired.dailyRaw === null, id + ': real stored epoch deadline and zero committed actions'); completionCheck(expired, 0);
        const readCount = counts('Timed'), writeCount = writes().length;
        const lateResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/soccer-grid-validate') && response.request().postDataJSON().playerName === pending.name);
        await action(page, 'release-real-late-validator', null, async () => { pending.release(); const response = await lateResponse; await response.finished(); await settle(page); });
        const late = await inspectBoard(page, 0, 'late-response-refused'); heldBytes(expired, late, 'late callback');
        check(counts('Timed') === readCount && writes().length === writeCount && writeCount === 0, id + ': late validator issues no rarity or selection attempt'); completionCheck(late, 0);
        await photo(page, 'expired-main-held');
        const reload = await action(page, 'literal-expired-reload', null, async () => { await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('heading', { name: "Time's Up!", exact: true }).waitFor(); }, false);
        heldBytes(late, reload.after, 'deadline reload'); check(reload.after.expiredRaw === '1' && reload.after.epochRaw === started.epochRaw, id + ': reload keeps exact deadline receipts'); completionCheck(reload.after, 0);
        const overtime = page.getByRole('button', { name: 'Start Overtime', exact: true });
        await action(page, 'native-start-overtime', overtime, () => press(overtime), false);
        await submit(page, 0, 'Generated Fixture Overtime');
        const ot = await inspectBoard(page, 1, 'actual-overtime-success');
        heldBytes(late, ot, 'Overtime main result'); check(ot.overtimeActiveRaw === '1' && JSON.parse(ot.overtimeRaw).length === 1 && JSON.parse(ot.overtimeRaw)[0].cellIndex === 0 && writes().length === 1, id + ': genuine Overtime saved separately'); completionCheck(ot, 0);
        const otReload = await action(page, 'literal-overtime-reload', null, async () => { await page.reload({ waitUntil: 'networkidle' }); await cells(page).first().waitFor(); await waitUntil(async () => await cells(page).filter({ hasText: 'Generated Fixture Overtime' }).count() === 1, id + ': Overtime remount'); }, false);
        heldBytes(late, otReload.after, 'Overtime reload'); equal(otReload.after.overtimeRaw, ot.overtimeRaw, id + ': exact Overtime reload bytes'); equal(otReload.after.overtimeActiveRaw, ot.overtimeActiveRaw, id + ': exact Overtime active receipt'); completionCheck(otReload.after, 0);
        row.realTimer = { startedEpoch: Number(started.epochRaw), expiredAtObserved: expired.at, elapsedMs: expired.at - Number(started.epochRaw), visibility: row.visibility };
        row.finalDailyRaw = otReload.after.dailyRaw;
      }
      check([...plans.values()].every(plan => plan.consumed && plan.released), id + ': every explicit fixture consumed and released');
      check(row.external.every(e => ['aborted','fixture-fulfilled','fixture-cors'].includes(e.outcome)), id + ': no production external forwarded');
      check(row.errors.length === 0 && row.assetErrors.length === 0, id + ': no App or local asset errors');
      row.status = 'passed'; console.log('PASS native Soccer Grid ' + id);
    } catch (error) {
      row.status = 'failed'; row.error = String(error.stack || error);
      for (const [page, label] of pages) if (!page.isClosed()) await frame(page, 'failure-' + label.replaceAll(' ', '-')).catch(() => {});
      throw error;
    } finally { for (const plan of plans.values()) if (!plan.released) plan.release(); await context.close(); put('report', report); }
  }
  check(report.screenshots.length === 6, 'Exactly six actual phase screenshots');
  sameDay(); report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = String(error.stack || error); throw error; }
finally {
  if (browser) await browser.close(); if (host) host.kill();
  report.sourceAfter = sources.map(receipt); report.distAfter = inventory('dist'); report.sourceHeld = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter); report.distHeld = JSON.stringify(report.distBefore) === JSON.stringify(report.distAfter);
  report.dataAfterSHA = sha(JSON.stringify(B.soccerGridPuzzles)); report.puzzleAfterSHA = sha(JSON.stringify(puzzle));
  put('report', report); assert(report.sourceHeld && report.distHeld && report.dataSHA === report.dataAfterSHA && report.puzzleSHA === report.puzzleAfterSHA, 'Source/dist/data must remain byte-identical');
}
