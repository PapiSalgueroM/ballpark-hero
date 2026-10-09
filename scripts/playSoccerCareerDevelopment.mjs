// Actual saved Soccer Career development choices and settlement in Chromium, remote CI only.
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
assert(process.env.CI, 'Run the actual development browser journeys only in remote CI');
process.env.CAREER_DEVELOPMENT_IMPORT_ONLY = '1';
const { developmentBundle, developmentFixture, seeded, NOW } = await import('./simSoccerCareerDevelopment.mjs');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.SHOTS || 'career-development-artifacts/native/playSoccerCareerDevelopment');
const CACHE = path.resolve(ROOT, process.env.FREE_KICK_FONT_CACHE || 'career-development-artifacts/font-cache');
const KEY = 'soccerCareerSave', clone = value => JSON.parse(JSON.stringify(value));
const hash = value => createHash('sha256').update(value).digest('hex');
const files = ['src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerPreparation.ts', 'src/lib/soccerCareerMentor.ts',
  'src/components/soccer-career/PreseasonPlanTile.tsx', 'src/components/soccer-career/CareerMentorTile.tsx', 'src/pages/SoccerCareer.tsx', 'scripts/playSoccerCareerDevelopment.mjs'];
const sourceHashes = () => Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
const report = { cases: [], controls: [], checks: 0, failed: 0, forwardedExternalRequests: 0, sourceBefore: sourceHashes() };
fs.mkdirSync(OUT, { recursive: true });
const write = (name, value) => fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(value, null, 2));
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file)); const body = fs.readFileSync(path.join(CACHE, entry.file));
  assert.equal(hash(body), entry.sha256, 'Retained font bytes match the verified manifest');
  return [entry.url, { body, contentType: entry.contentType }];
}));
assert(/^\s+setClubs\(FALLBACK_CLUBS\);$/m.test(fs.readFileSync(path.join(ROOT, 'src/pages/SoccerCareer.tsx'), 'utf8')),
  'The route and oracle must use the same actual static club pool');
const B = await developmentBundle();
const bundle = await build({ stdin: { contents: "export * as soccer from './src/lib/soccerCareerEngine'; export * as preparation from './src/lib/soccerCareerPreparation'; export * as mentor from './src/lib/soccerCareerMentor';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, platform: 'browser', format: 'iife', globalName: '__developmentEngine', write: false, jsx: 'automatic',
  alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' }, logLevel: 'error' });
const browserSource = bundle.outputFiles[0].text;
function differences(expected, actual, at = '$', rows = []) {
  if (Object.is(expected, actual)) return rows;
  if (!expected || !actual || typeof expected !== 'object' || typeof actual !== 'object' || Array.isArray(expected) !== Array.isArray(actual)) { rows.push({ at, expected, actual }); return rows; }
  const a = Object.keys(expected), b = Object.keys(actual);
  if (JSON.stringify(a) !== JSON.stringify(b)) rows.push({ at: `${at}.[keys]`, expected: a, actual: b });
  for (const key of new Set([...a, ...b])) {
    if (!Object.hasOwn(expected, key) || !Object.hasOwn(actual, key)) rows.push({ at: `${at}.${key}`, expected: Object.hasOwn(expected, key) ? expected[key] : '<absent>', actual: Object.hasOwn(actual, key) ? actual[key] : '<absent>' });
    else differences(expected[key], actual[key], `${at}.${key}`, rows);
  }
  return rows;
}
const saveEqual = (expected, actual) => JSON.stringify(expected) === JSON.stringify(actual);
const restorationFailures = ({ expected, actual }) => [!actual.activeMatches && 'focus', actual.inline !== expected.inline && 'inline-overflow', actual.computed !== expected.computed && 'computed-overflow', actual.y !== expected.y && 'page-position'].filter(Boolean);
const layoutFailures = value => [value.stable < 4 && 'stable-frames', !(value.width > 0 && value.height > 0) && 'dimensions',
  !(value.x >= 0 && value.x + value.width <= value.viewport[0] + 1 && value.y >= 0 && value.bottom <= value.viewport[1] + 1) && 'viewport',
  !value.painted && 'painted-center', Number(value.opacity) !== 1 && 'opacity', value.finite !== 0 && 'animations', value.overflow && 'horizontal-overflow'].filter(Boolean);
function copiedControl(name, before, mutate, detector, expectedFailures) {
  assert.deepEqual(detector(before), [], `${name}: unchanged actual outcome must pass`);
  const copy = clone(before), undo = mutate(copy); assert.notDeepEqual(copy, before, `${name}: copied defect must change the actual outcome`);
  const observedFailures = detector(copy); assert.deepEqual(observedFailures, expectedFailures, `${name}: only the intended detector failures may fire`);
  write(`control-${name}-mutated`, copy); undo(); assert.deepEqual(copy, before, `${name}: undo restores the exact observed outcome`);
  assert.deepEqual(detector(copy), [], `${name}: restored actual outcome must pass`);
  report.controls.push({ name, changed: true, observedFailures, restored: true }); write(`control-${name}-baseline`, before);
  console.log(`CONTROL FIRED(native ${name}): ${observedFailures.join(', ')}`);
}
const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); }); });
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let browser, serverLog = '';
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned server did not start')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { serverLog += data; if (serverLog.includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  server.stderr.on('data', data => { serverLog += data; });
});
try {
  await ready; browser = await pw.chromium.launch({ headless: true });
  for (const profile of [{ width: 390, height: 844, touch: true }, { width: 1280, height: 900, touch: false }]) {
    for (const kind of ['push', 'recovery', 'mentor']) {
      const id = `${profile.width}-${kind}`, row = { id, kind, ...profile, checks: [], errors: [], assetErrors: [], writes: [], intercepted: [], layouts: [], restorations: [], actions: [] };
      report.cases.push(row);
      const check = (ok, label) => { report.checks++; if (!ok) report.failed++; row.checks.push({ label, ok: !!ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${id}: ${label}`); assert(ok, `${id}: ${label}`); };
      let fixture = clone(developmentFixture(B));
      if (kind === 'mentor') {
        const event = seeded(118700, () => B.soccer.getAllEvents(fixture).find(event => event.id === 6)).value;
        assert(event?.choices[0]?.label === 'Take them under your wing', 'Actual catalog exposes the accepted mentorship choice');
        fixture.phase = 'random_events'; fixture.pendingEvents = clone([event]);
      }
      write(`${id}-fixture`, { simulation: 'Explicit fictional saved-career test using the captured senior save', fixture });
      const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch,
        colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
          { name: KEY, value: JSON.stringify(fixture) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }, { name: 'dukb-guest-handle', value: 'SteadyVolley-18' }] }] } });
      const oracleContext = await browser.newContext({ reducedMotion: 'reduce' });
      const oracle = await oracleContext.newPage();
      await oracle.addInitScript(now => { const OldDate = Date; window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }; }, NOW);
      const resetOracle = async () => { await oracle.goto('about:blank'); await oracle.addScriptTag({ content: browserSource }); };
      await context.addInitScript(now => { const OldDate = Date; window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }; }, NOW);
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === BASE) { assert(['GET', 'HEAD'].includes(request.method()), 'Only readonly owned-server requests'); return route.continue(); }
        row.intercepted.push({ method: request.method(), origin: url.origin, path: url.pathname });
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) row.writes.push({ method: request.method(), path: url.pathname, blocked: true });
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
      const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
      const bytes = () => page.evaluate(key => localStorage.getItem(key), KEY);
      const body = () => page.evaluate(() => ({ inline: document.body.style.overflow, computed: getComputedStyle(document.body).overflow, y: scrollY }));
      const activate = async button => { if (profile.touch) await button.tap(); else { await button.focus(); await button.press('Enter'); } };
      const compare = (expected, actual, name) => { expected = clone(expected); const diff = differences(expected, actual); write(`${id}-${name}-expected`, expected); write(`${id}-${name}-actual`, actual); write(`${id}-${name}-diff`, diff); check(saveEqual(expected, actual), `${name}: every serialized saved field and key matches the unchanged Chromium engine`); };
      const predict = (input, module, method, args = [], seed = 118701) => oracle.evaluate(({ input, module, method, args, seed }) => {
        const real = Math.random, draws = []; let a = seed >>> 0;
        Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296; draws.push(value); return value; };
        try { const engine = window.__developmentEngine, parameters = args.map(value => value === '$clubs' ? engine.soccer.FALLBACK_CLUBS : value); return { next: JSON.parse(JSON.stringify(engine[module][method](structuredClone(input), ...parameters))), draws, seed }; }
        finally { Math.random = real; }
      }, { input, module, method, args, seed });
      const seedClick = (button, seed) => button.evaluate((element, seed) => element.addEventListener('click', () => {
        window.__developmentRealRandom = Math.random; window.__developmentDraws = []; let a = seed >>> 0;
        Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296; window.__developmentDraws.push(value); return value; };
      }, { capture: true, once: true }), seed);
      const action = async (button, module, method, args = [], seed = 118701) => {
        const input = await saved(), before = await bytes(), expected = await predict(input, module, method, args, seed), name = `${row.actions.length}-${method}`;
        assert.notEqual(JSON.stringify(expected.next), before, `${method}: actual action must have a saved outcome`); write(`${id}-${name}-input`, input);
        await seedClick(button, seed); await activate(button);
        await page.waitForFunction(({ key, before }) => localStorage.getItem(key) !== before, { key: KEY, before }, { timeout: 15000 });
        const draws = await page.evaluate(() => { Math.random = window.__developmentRealRandom; return window.__developmentDraws; });
        const actual = await saved(); compare(expected.next, actual, name); write(`${id}-${name}-rng`, { expected: expected.draws, actual: draws, seed });
        check(JSON.stringify(draws) === JSON.stringify(expected.draws), `${name}: the actual click consumes exactly the unchanged engine random draws`);
        row.actions.push({ method, seed, phase: actual.phase, draws: draws.length }); return actual;
      };
      const reload = async name => { const before = await bytes(); await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'How to play', exact: true }).waitFor({ timeout: 45000 }); check(await bytes() === before, `${name}: reload preserves the complete saved bytes`); await resetOracle(); };
      const dialogReady = async dialog => { await dialog.waitFor(); await dialog.evaluate(panel => document.fonts.ready); await page.waitForFunction(selector => document.querySelector(selector)?.contains(document.activeElement), await dialog.getAttribute('data-preseason-dialog') !== null ? '[data-preseason-dialog]' : '[data-career-mentor-dialog]', { timeout: 2000 }); };
      const restored = async (tileSelector, before, name) => {
        const ok = await page.waitForFunction(({ tileSelector, before }) => document.activeElement?.matches(tileSelector) && document.body.style.overflow === before.inline && getComputedStyle(document.body).overflow === before.computed && scrollY === before.y, { tileSelector, before }, { timeout: 2000 }).then(() => true, () => false);
        const observation = { expected: before, actual: { ...await body(), activeMatches: await page.locator(tileSelector).evaluate(tile => document.activeElement === tile) }, active: await page.evaluate(() => document.activeElement?.outerHTML), ok };
        row.restorations.push({ name, ...observation }); write(`${id}-${name}-restoration`, observation); check(ok && restorationFailures(observation).length === 0, `${name}: exact tile focus, body scrolling and page position restore`);
      };
      const capture = async (target, name) => {
        await target.scrollIntoViewIfNeeded();
        const layout = await target.evaluate(async element => {
          let prior = '', stable = 0, last; const start = performance.now();
          while (performance.now() - start < 2000) {
            await new Promise(resolve => requestAnimationFrame(resolve)); const r = element.getBoundingClientRect(), style = getComputedStyle(element), center = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            const finite = document.getAnimations().filter(a => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity).length;
            last = { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, viewport: [innerWidth, innerHeight], yScroll: scrollY, ownScroll: [element.scrollLeft, element.scrollTop], opacity: style.opacity, painted: !!center && element.contains(center), finite, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
            const signature = JSON.stringify(last); stable = signature === prior ? stable + 1 : 1; prior = signature;
            if (stable >= 4 && r.width > 0 && r.height > 0 && r.x >= 0 && r.right <= innerWidth + 1 && r.y >= 0 && r.bottom <= innerHeight + 1 && last.painted && Number(style.opacity) === 1 && finite === 0 && !last.overflow) return { ...last, stable, readable: true };
          }
          return { ...last, stable, readable: false };
        });
        row.layouts.push({ name, ...layout }); write(`${id}-${name}-layout`, layout); check(layout.readable && layoutFailures(layout).length === 0, `${name}: screenshot target is visible, painted and stable with no horizontal overflow`);
        await page.screenshot({ path: path.join(OUT, `${id}-${name}.png`) });
      };
      const openMentor = async name => {
        const selector = '[data-career-mentor-tile]', tile = page.locator(selector), dialog = page.locator('[data-career-mentor-dialog]');
        await tile.waitFor(); await tile.focus(); const beforeBody = await body(), beforeBytes = await bytes(), record = (await saved()).mentor;
        check((await tile.innerText()).includes('GENERATED academy player') && (await tile.innerText()).includes(record.name), `${name}: tile identifies the saved generated academy player`);
        await activate(tile); await dialogReady(dialog);
        check((await dialog.innerText()).includes('GENERATED academy player') && (await dialog.innerText()).includes('Age at last update'), `${name}: fictional scope and recorded age are explicit`);
        check(await dialog.locator('[data-career-mentor-history] li').count() === record.history.length, `${name}: history contains exactly the recorded mentoring seasons`);
        for (const entry of record.history) { const text = await dialog.locator('[data-career-mentor-history]').innerText(); check(text.includes(`${entry.year}/${String(entry.year + 1).slice(-2)}`) && text.includes(`${entry.progress}/3 completed · age ${entry.age}`), `${name}: exact saved year, progress and age ${entry.year}`); }
        await activate(dialog.locator('[data-career-mentor-help]'));
        check(await dialog.locator('[data-career-mentor-rules]').isVisible() && (await dialog.innerText()).includes('Example: 12 appearances'), `${name}: help is reopenable and gives the qualifying and interrupted worked example`);
        check(await dialog.locator('button').evaluateAll(buttons => buttons.every(button => { const r = button.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; })), `${name}: dialog controls are at least 44 pixels`);
        for (const key of ['Tab', 'Tab', 'Shift+Tab', 'Shift+Tab']) { await page.keyboard.press(key); check(await dialog.evaluate(panel => panel.contains(document.activeElement)), `${name}: ${key} stays inside the dialog`); }
        await capture(dialog, `${name}-help`); await activate(dialog.locator('[data-career-mentor-help]')); await capture(dialog, `${name}-history`);
        await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' }); await restored(selector, beforeBody, `${name}-escape`); check(await bytes() === beforeBytes, `${name}: reading mentor details changes no saved bytes`);
        await activate(tile); await dialogReady(dialog); await activate(dialog.locator('[data-career-mentor-back]')); await dialog.waitFor({ state: 'hidden' }); await restored(selector, beforeBody, `${name}-back`); check(await bytes() === beforeBytes, `${name}: Back preserves the complete career`);
      };
      const summer = async () => {
        for (let turn = 0; turn < 24; turn++) {
          const input = await saved(); if (input.phase === 'playing') return;
          const continuation = page.getByRole('button', { name: /^Continue/ }); let method, args = ['$clubs'], button = continuation;
          if (input.phase === 'newspaper') { method = 'dismissNewspaper'; args = []; }
          else if (input.phase === 'season_summary') method = 'dismissSummary';
          else if (input.phase === 'ballon_dor') { assert(input.pendingBallonDor?.playerRank !== 1, 'This ordinary fixture needs no winner speech'); method = 'dismissBallonDor'; }
          else if (input.phase === 'international_debut') method = 'dismissDebut';
          else if (input.phase === 'world_cup') { assert(!(input.pendingTournament?.won || input.pendingWorldCup?.won), 'Ordinary fixture needs no tournament speech'); method = 'dismissWorldCup'; }
          else if (input.phase === 'rivalry_event') method = 'dismissRivalryEvent';
          else if (input.phase === 'red_card_appeal_result') method = 'dismissAppealResult';
          else if (input.phase === 'social_media_action') {
            if (input.pendingCoverAthleteEvent && input.socialMediaActionUsedThisSeason) { method = 'handleCoverAthleteDecision'; args = [false]; button = page.getByRole('button', { name: /Decline/ }); }
            else if (!input.socialMediaActionUsedThisSeason) { method = 'applySocialMediaAction'; args = ['training_video']; button = page.getByRole('button', { name: /Post training video/ }); }
            else method = 'dismissSocialMediaPhase';
          } else if (input.phase === 'moral_dilemma') {
            if (input.pendingMoralDilemma) { const index = input.pendingMoralDilemma.choices.length - 1; method = 'applyMoralDilemmaChoice'; args = [index]; button = page.getByRole('button').filter({ hasText: input.pendingMoralDilemma.choices[index].label }); }
            else method = 'dismissMoralDilemma';
          } else if (input.phase === 'random_events') { method = 'applyEventChoice'; args = [0, '$clubs']; button = page.getByRole('button').filter({ hasText: input.pendingEvents[0].choices[0].label }); }
          else if (input.phase === 'transfer_window') { assert(input.transferSituation?.type !== 'frozen_out' || input.transferSituation.mode !== 'released', 'Fixture refuses an unavoidable released-club move');
            if (input.transferSituation?.type === 'contract_expiry') { method = 'signExtension'; args = []; button = page.getByRole('button', { name: /Sign Extension with/ }); }
            else { method = 'stayAtClub'; args = []; button = page.getByRole('button', { name: /^(Stay and fight for place|Reject & Stay|Stay at |Refuse to leave |Changed my mind, stay at )/ }); }
          } else throw new Error(`No actual summer driver for ${input.phase}`);
          await action(button, 'soccer', method, args, 118800 + turn);
        }
        throw new Error('Actual summer never returned to playing in 24 actions');
      };
      try {
        await resetOracle(); await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'How to play', exact: true }).waitFor({ timeout: 45000 }); await page.evaluate(() => document.fonts.ready);
        const initial = await predict(fixture, 'soccer', 'repairCareer', [], 118500); compare(initial.next, await saved(), 'initial-repair');
        if (kind === 'mentor') {
          const eventCard = page.getByRole('heading', { name: 'Youth Mentor', exact: true }).locator('..').locator('..'), eventText = await eventCard.innerText();
          check(eventText.includes('generated 16-year-old') && eventText.includes('10+ appearances') && eventText.includes('Three mentoring years'), 'The actual event explains generated scope and qualifying progress before acceptance'); await capture(eventCard, 'mentor-event');
          await action(page.getByRole('button', { name: /Take them under your wing/ }), 'soccer', 'applyEventChoice', [0, '$clubs'], 118700);
          await summer(); const created = (await saved()).mentor;
          check(created.generated === true && created.progress === 0 && created.age === 16 && created.history.length === 0, 'Accepted event creates one saved fictional protege without fabricated appearances');
          await openMentor('created'); await reload('created-mentor');
        } else {
          const selector = '[data-preseason-plan]', tile = page.locator(selector), dialog = page.locator('[data-preseason-dialog]');
          await tile.waitFor(); await tile.focus(); const beforeBody = await body(), beforeBytes = await bytes(); await activate(tile); await dialogReady(dialog);
          check((await dialog.innerText()).includes('Example: a 20% injury chance becomes 23%') && (await dialog.innerText()).includes('Recovery focus subtracts 1'), 'Rules and both exact tradeoffs precede the preseason choice');
          check(await dialog.locator('button').evaluateAll(buttons => buttons.every(button => { const r = button.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; })), 'All preseason dialog controls are at least 44 pixels');
          for (const key of ['Tab', 'Tab', 'Shift+Tab', 'Shift+Tab']) { await page.keyboard.press(key); check(await dialog.evaluate(panel => panel.contains(document.activeElement)), `${key} remains inside preseason dialog`); }
          await capture(dialog, 'preseason-rules'); await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' }); await restored(selector, beforeBody, 'preseason-escape'); check(await bytes() === beforeBytes, 'Reading and closing rules preserves the full career');
          await activate(tile); await dialogReady(dialog); await action(dialog.locator(`[data-preparation-option="${kind}"]`), 'preparation', 'pickCareerPreparation', [kind]); await dialog.waitFor({ state: 'hidden' }); await restored(selector, beforeBody, 'preseason-choice');
          await activate(tile); await dialogReady(dialog); check(await dialog.locator(`[data-preparation-option="${kind}"]`).getAttribute('aria-pressed') === 'true', 'Reopened dialog marks the exact saved choice');
          await action(dialog.locator('[data-preparation-option="balanced"]'), 'preparation', 'pickCareerPreparation', [null]); await dialog.waitFor({ state: 'hidden' }); await restored(selector, beforeBody, 'balanced-choice');
          await activate(tile); await dialogReady(dialog); await action(dialog.locator(`[data-preparation-option="${kind}"]`), 'preparation', 'pickCareerPreparation', [kind]); await dialog.waitFor({ state: 'hidden' }); await restored(selector, beforeBody, 'restored-choice'); await reload('chosen-plan');
        }
        const input = await saved(); let selected;
        for (let seed = 118600; seed < 118664; seed++) {
          await resetOracle(); const prediction = await predict(input, 'soccer', 'advanceProSeason', ['$clubs'], seed), next = prediction.next, season = next.seasons.at(-1);
          if (['newspaper', 'season_summary'].includes(next.phase) && next.pendingSummary?.year === season?.year && season?.type === 'playing' && season.apps >= 10 && !season.injurySevere && next.pendingBallonDor?.playerRank !== 1 && (kind === 'mentor' ? next.mentor?.progress === 1 : season.preparation?.outcome === 'completed')) { selected = { seed, season }; break; }
        }
        assert(selected, 'Actual unchanged Chromium engine must yield a normal qualifying season in 64 seeds'); row.seasonSeed = selected.seed; write(`${id}-normal-season-selection`, selected);
        await resetOracle(); const next = await action(page.getByRole('button', { name: 'Next Season', exact: true }), 'soccer', 'advanceProSeason', ['$clubs'], selected.seed), season = next.seasons.at(-1);
        check(season.year === input.seasons.at(-1).year + 1 && season.apps >= 10 && season.club === input.currentClub, 'Next Season records one actual senior year at the shared club');
        if (kind === 'mentor') { check(next.mentor.progress === 1 && next.mentor.history.length === 1 && next.mentor.lastYear === season.year && next.mentor.age === 17, 'One qualifying recorded season credits exactly one mentoring year and age'); }
        else { check(season.preparation?.id === kind && !next.seasonPreparation && season.preparation.adjustment === (kind === 'push' ? 1 : -1), 'The chosen plan settles once with its exact skill modifier and is consumed'); }
        await reload('recorded-season');
        if ((await saved()).phase === 'newspaper') await action(page.getByRole('button', { name: /^Continue to Season Summary/ }), 'soccer', 'dismissNewspaper', []);
        check((await saved()).phase === 'season_summary', 'Actual intervening newspaper reaches the mandatory saved season summary');
        if (kind !== 'mentor') {
          const result = page.locator('[data-preseason-result="completed"]'); await result.waitFor();
          check((await result.innerText()).includes(kind === 'push' ? 'Development push completed' : 'Recovery focus completed') && (await result.innerText()).includes(`${kind === 'push' ? '+1' : '-1'} ${season.preparation.skill} after natural growth.`), 'Season summary shows the exact recorded plan outcome and modifier');
          await capture(result, 'preseason-outcome'); await reload('summary-plan');
        } else { await summer(); const held = (await saved()).mentor; check(held.name === input.mentor.name && JSON.stringify(held.history) === JSON.stringify(next.mentor.history), 'Summer choices keep the same protege and exact recorded history'); await openMentor('credited'); await reload('credited-mentor'); check((await saved()).mentor.history.length === 1, 'Viewing and reloading never credits the recorded mentoring season twice'); }
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Actual route has no horizontal overflow');
        check(row.errors.length === 0 && row.assetErrors.length === 0, 'No page or served asset errors'); check(row.writes.every(attempt => attempt.blocked) && report.forwardedExternalRequests === 0, 'All external write attempts are intercepted locally with no forwarded external requests');
        if (id === '390-push') {
          const heldBytes = await bytes(), actualSave = await saved();
          copiedControl('full-save', actualSave, copy => { const held = copy.netWorth; assert(Number.isFinite(held)); copy.netWorth += 0.01; return () => { copy.netWorth = held; }; }, copy => saveEqual(actualSave, copy) ? [] : ['full-save'], ['full-save']);
          copiedControl('readable-capture', row.layouts[0], copy => { const held = copy.opacity; copy.opacity = '0'; return () => { copy.opacity = held; }; }, layoutFailures, ['opacity']);
          copiedControl('focus-body', row.restorations[0], copy => { const held = clone(copy.actual); copy.actual.activeMatches = false; copy.actual.computed = copy.expected.computed === 'hidden' ? 'visible' : 'hidden'; return () => { copy.actual = held; }; }, restorationFailures, ['focus', 'computed-overflow']);
          check(await bytes() === heldBytes, 'Native copied detector controls preserve the entire actual saved career');
        }
        row.ok = true;
      } catch (error) { row.ok = false; row.error = String(error.stack || error); report.failed++; console.error(`${id}: ${row.error}`); write(`${id}-failure-save`, await saved().catch(() => null)); await page.screenshot({ path: path.join(OUT, `${id}-failure.png`) }).catch(() => {}); }
      finally { await context.close(); await oracleContext.close(); write('report', report); }
    }
  }
  report.sourceAfter = sourceHashes(); assert.deepEqual(report.sourceAfter, report.sourceBefore, 'Native verification holds source bytes unchanged');
  assert.equal(report.cases.length, 6); assert(report.cases.every(row => row.ok), 'Every phone and desktop development journey must complete'); assert.deepEqual(report.controls.map(control => control.name), ['full-save', 'readable-capture', 'focus-body'], 'All three effective native detector controls must fire');
  console.log(`Soccer Career development native: ${report.checks} checks, ${report.failed} failed, 6 actual journeys. Screenshots and complete saved-state evidence: ${OUT}`);
} catch (error) { report.fatal = String(error.stack || error); report.failed++; console.error(report.fatal); }
finally { if (browser) await browser.close(); server.kill(); report.serverLog = serverLog; write('report', report); }
if (report.failed) process.exit(1);
