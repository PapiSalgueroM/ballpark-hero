/* Actual page, native inputs, independent engine replay and locally fulfilled transport. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'court-life-artifacts/native');
const CACHE = path.resolve(process.env.COURT_LIFE_FONT_CACHE || path.join(ROOT, 'court-life-artifacts/font-cache'));
const digest = value => createHash('sha256').update(value).digest('hex');
const sheets = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(row => new URL(row[1]).href);
assert.equal(sheets.length, 1, 'Read the actual template font stylesheet');
assert(process.env.CI, 'Court Life native execution runs only in remote CI');
if (process.argv.includes('--prefetch-fonts-only')) {
  fs.mkdirSync(CACHE, { recursive: true });
  const manifest = [];
  const download = async url => {
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(url).origin));
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36' } });
    assert(response.ok, 'Font dependency response succeeds');
    const body = Buffer.from(await response.arrayBuffer()), file = digest(url);
    fs.writeFileSync(path.join(CACHE, file), body);
    manifest.push({ url, file, contentType: response.headers.get('content-type'), sha256: digest(body) });
    return body.toString('utf8');
  };
  const css = await download(sheets[0]);
  const urls = [...new Set([...css.matchAll(/url\(\s*['"]?(https:\/\/[^)'"\s]+)/g)].map(row => row[1]))];
  assert(urls.length > 0, 'Actual stylesheet declares font files');
  for (const url of urls) { assert.equal(new URL(url).origin, 'https://fonts.gstatic.com'); await download(url); }
  fs.writeFileSync(path.join(CACHE, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Prepared ${manifest.length} Court Life font dependencies.`);
  process.exit(0);
}
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file));
  const body = fs.readFileSync(path.join(CACHE, entry.file)); assert.equal(digest(body), entry.sha256);
  return [entry.url, { body, contentType: entry.contentType }];
}));
assert(fonts.has(sheets[0]), 'Prefetch current fonts before the guarded native run');
const sourceFiles = [
  'src/pages/CourtLife.tsx', 'src/components/court-life/CourtLifeBoard.tsx',
  'src/components/court-life/CourtLifeHub.tsx', 'src/components/court-life/CourtLifeMatch.tsx',
  'src/components/court-life/CourtLifeCanvas.tsx', 'src/components/court-life/CourtLifeControls.tsx',
  'src/hooks/useCourtLife.ts', 'src/lib/courtLife.ts', 'src/lib/courtLifeCareer.ts',
  'src/lib/courtLifeRender.ts', 'src/data/courtLifeWorld.ts', 'scripts/qa/courtLife1075.mjs',
];
const sourceHashes = () => Object.fromEntries(sourceFiles.map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))]));
const report = { started: new Date().toISOString(), sourceBefore: sourceHashes(), cases: [], controls: [], forwardedWrites: 0 };
fs.mkdirSync(OUT, { recursive: true });
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const { chromium } = await import('../lib/playwrightLoader.mjs');
const { build: bundle } = await import('esbuild');
const baselineBundle = await bundle({ absWorkingDir: ROOT, stdin: { contents: "export * as engine from './src/lib/courtLife.ts'; export * as career from './src/lib/courtLifeCareer.ts';", resolveDir: ROOT }, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
const { engine, career: careerApi } = await import('data:text/javascript;base64,' + Buffer.from(baselineBundle.outputFiles[0].text).toString('base64'));
const KEY = careerApi.COURT_CAREER_SAVE_KEY;

// This isolated entry supplies the normal providers, without registering an
// unfinished route or replacing any game, renderer, hook or completion code.
const temp = fs.mkdtempSync(path.join(ROOT, '.court-life-native-'));
const entry = `import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { applyTheme, storedTheme } from '@/lib/theme';
import CourtLife from '@/pages/CourtLife';
import '@/index.css';
applyTheme(storedTheme());
createRoot(document.getElementById('root')).render(<HelmetProvider><QueryClientProvider client={new QueryClient()}><AuthProvider><TooltipProvider><BrowserRouter><CourtLife /></BrowserRouter></TooltipProvider></AuthProvider></QueryClientProvider></HelmetProvider>);`;
fs.writeFileSync(path.join(temp, 'entry.tsx'), entry);
fs.writeFileSync(path.join(temp, 'index.html'), `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="${sheets[0]}" rel="stylesheet"></head><body><div id="root"></div><script type="module" src="./entry.tsx"></script></body></html>`);
report.entry = { sha256: digest(entry), mode: 'isolated actual page with normal providers', registeredRoute: false };
const dist = path.join(temp, 'dist');
let browser, server;
try {
  const { build } = await import('vite');
  await build({ root: temp, configFile: path.join(ROOT, 'vite.config.ts'), publicDir: false, build: { outDir: dist, emptyOutDir: true, minify: false }, logLevel: 'warn' });
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
  server = createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const url = new URL(request.url, 'http://localhost');
    let file = path.resolve(dist, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(dist + path.sep) && file !== dist) { response.writeHead(403); response.end(); return; }
    if (url.pathname === '/court-life' || url.pathname === '/') file = path.join(dist, 'index.html');
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const asset = path.resolve(ROOT, 'public', '.' + decodeURIComponent(url.pathname));
      if (asset.startsWith(path.join(ROOT, 'public') + path.sep) && fs.existsSync(asset) && fs.statSync(asset).isFile()) file = asset;
      else { response.writeHead(404); response.end(); return; }
    }
    response.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : fs.readFileSync(file));
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const BASE = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: false });
  for (const profile of [
    { width: 320, height: 780, touch: true, reduced: true, theme: 'dark' },
    { width: 390, height: 844, touch: true, reduced: false, theme: 'light' },
    { width: 1280, height: 720, touch: false, reduced: false, theme: 'light' },
  ]) {
    const id = `${profile.width}-${profile.touch ? 'touch' : 'keyboard'}-${profile.theme}`;
    const row = { id, ...profile, screenshots: [], geometry: [], reveals: [], replays: [], matches: [], inputs: [], network: [], fontResponses: [], storageWrites: [], events: [], navigation: [], errors: [], assetErrors: [] };
    report.cases.push(row); save();
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch, deviceScaleFactor: 1, reducedMotion: profile.reduced ? 'reduce' : 'no-preference', colorScheme: profile.theme, serviceWorkers: 'block', acceptDownloads: true,
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: 'dukb-theme', value: profile.theme }, { name: 'cookie-consent', value: 'essential' }] }] } });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) { assert(['GET', 'HEAD'].includes(request.method()), 'No local write transport'); return route.continue(); }
      row.network.push({ method: request.method(), url: url.href, body: request.postData(), fulfilledLocally: true });
      if (fonts.has(url.href)) {
        const cached = fonts.get(url.href); row.fontResponses.push({ url: url.href, sha256: digest(cached.body), bytes: cached.body.length });
        return route.fulfill({ status: 200, ...cached });
      }
      const type = request.resourceType();
      return route.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : type === 'script' ? 'application/javascript' : 'application/json', body: ['stylesheet', 'script'].includes(type) ? '' : '[]' });
    });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    const focusSession = await context.newCDPSession(page);
    await focusSession.send('Emulation.setFocusEmulationEnabled', { enabled: false });
    await page.clock.install({ time: new Date('2026-10-07T16:00:00Z') });
    await page.addInitScript(key => {
      window.__courtWrites = []; window.__courtEvents = []; window.__courtFailSave = false;
      window.addEventListener('blur', event => window.__courtEvents.push({ type: 'blur', trusted: event.isTrusted, hidden: document.hidden }));
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(name, value) {
        if (this === localStorage) {
          window.__courtWrites.push({ key: name, shaBytes: String(value).length, at: Date.now(), failed: name === key && window.__courtFailSave });
          if (name === key && window.__courtFailSave) throw new DOMException('QA storage unavailable', 'QuotaExceededError');
        }
        return original.call(this, name, value);
      };
      for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'click', 'keydown', 'keyup', 'focusin', 'focusout', 'visibilitychange']) document.addEventListener(type, event => {
        if (window.__courtEvents.length > 12000) return;
        const target = event.target instanceof Element ? event.target : null;
        window.__courtEvents.push({ type, trusted: event.isTrusted, key: event.key, pointerId: event.pointerId, pointerType: event.pointerType, detail: event.detail, target: target?.getAttribute('data-court-control') || target?.getAttribute('aria-label') || target?.closest('button')?.textContent || target?.tagName,
          tick: document.querySelector('[data-court-canvas]')?.getAttribute('data-court-tick'), hidden: document.hidden });
      }, true);
    }, KEY);
    page.on('pageerror', error => row.errors.push(String(error)));
    page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.assetErrors.push(request.url() + ': ' + request.failure()?.errorText); });
    page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assetErrors.push(response.url() + ': ' + response.status()); });
    const cdp = await context.newCDPSession(page);
    const canvas = () => page.locator('[data-court-canvas]');
    const game = () => page.locator('[data-court-match]');
    const button = name => page.getByRole('button', { name, exact: true });
    const shot = async stage => { const name = `${id}-${stage}.png`; await page.screenshot({ path: path.join(OUT, name), animations: 'disabled' }); row.screenshots.push(name); save(); };
    const readSave = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    const retain = async () => {
      const logs = await page.evaluate(() => ({ writes: window.__courtWrites.splice(0), events: window.__courtEvents.splice(0) }));
      row.storageWrites.push(...logs.writes); row.events.push(...logs.events);
    };
    const activate = async locator => {
      row.navigation.push({ text: await locator.innerText(), scrollBefore: await page.evaluate(() => scrollY) });
      await locator.scrollIntoViewIfNeeded();
      const box = await locator.boundingBox(); assert(box && box.width >= 44 && box.height >= 44, `Native action target is at least 44px: ${JSON.stringify(box)} ${await locator.innerText()}`);
      if (profile.touch) await locator.tap(); else { await locator.focus(); await locator.press('Enter'); }
    };
    const closeDialog = async () => {
      await page.getByRole('dialog').press('Escape'); await page.getByRole('dialog').waitFor({ state: 'detached' });
      await page.clock.runFor(32);
    };
    const visibleUnaided = async (locator, reason) => {
      // Read-only geometry and stopped-game clock advances precede any driver
      // navigation. A tap or focus must not supply the product's reveal.
      for (let attempt = 0; attempt < 20; attempt++) {
        await page.clock.runFor(50); await new Promise(resolve => setTimeout(resolve, 20));
        const box = await locator.evaluate(node => { const rect = node.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: innerWidth, height: innerHeight }; });
        if (box.top >= 0 && box.bottom <= box.height && box.left >= 0 && box.right <= box.width) { row.reveals.push({ reason, ...box }); return; }
      }
      assert.fail(`Product reveals the actual next action without driver scrolling: ${reason}`);
    };
    let expectedCareer, model;
    const neutral = () => engine.neutralCourtInput();
    const advance = async (milliseconds, held = {}, edges = []) => {
      const before = model.tick;
      await page.clock.runFor(milliseconds);
      const tick = Number(await canvas().getAttribute('data-court-tick'));
      const inputLog = [];
      while (model.tick < tick) {
        assert(['playing', 'inbound'].includes(model.phase), 'Browser never steps a stopped engine');
        const input = { ...neutral(), ...held, ...edges.shift() };
        model = engine.stepCourtMatch(model, input);
        if (model.phase === 'halftime' || model.phase === 'finished') model = engine.neutralizeCourtMatch(model);
        inputLog.push(input);
      }
      assert.equal(model.tick, tick, 'Native tick never goes backwards');
      if (['playing', 'inbound'].includes(model.phase)) assert(tick - before >= Math.floor(milliseconds / engine.COURT_TICK_MS) - 2, 'Active native frames advance at the actual fixed rate');
      row.inputs.push({ from: before, to: tick, milliseconds, held, edges: inputLog.filter(input => input.shoot !== 'none' || input.pass || input.steal || input.jump), state: digest(JSON.stringify(model)) });
      return tick;
    };
    const snapshot = async reason => {
      await page.clock.runFor(34);
      model = engine.neutralizeCourtMatch(model);
      const actual = await readSave();
      assert(actual.activeMatch.paused, 'Checkpoint is saved paused');
      assert.deepEqual(actual.activeMatch.match, model, `Complete native match equals independent physical replay: ${reason}`);
      assert.equal(await game().getAttribute('data-court-paused'), 'true');
      assert.equal(Number(await page.locator('[data-court-score="home"]').innerText()), model.score.home);
      assert.equal(Number(await page.locator('[data-court-score="away"]').innerText()), model.score.away);
      row.replays.push({ reason, tick: model.tick, phase: model.phase, score: model.score, sha256: digest(JSON.stringify(model)) });
      expectedCareer = careerApi.updateCareerMatch(expectedCareer, model, true);
      assert.deepEqual(actual, expectedCareer, 'Career checkpoint preserves all actual state');
      return actual;
    };
    const pause = async reason => { await activate(button('Pause')); await snapshot(reason); };
    const resume = async () => {
      await activate(button(model.tick === 0 ? 'Start play' : 'Resume play'));
      expectedCareer = careerApi.updateCareerMatch(expectedCareer, model, false);
      assert.equal(await game().getAttribute('data-court-paused'), 'false');
      assert(await canvas().evaluate(node => document.activeElement === node), 'Resuming focuses the actual keyboard court');
      await advance(100);
      await geometryProof(page, model, row, 'resumed court before control navigation', true);
    };
    const pressAction = async slot => {
      const player = model.players.find(row => row.id === model.controlledPlayerId), offense = model.possession === player.side, owns = model.ball.ownerId === player.id;
      const action = slot === 'primary' ? owns ? 'shoot' : 'jump' : slot === 'secondary' ? offense ? 'pass' : 'steal' : offense ? 'sprint' : 'guard';
      const locator = page.locator(`[data-court-control="${slot}"]`);
      if (profile.touch) {
        await locator.scrollIntoViewIfNeeded(); const box = await locator.boundingBox(); assert(box);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
      } else { await canvas().focus(); await page.keyboard.down({ primary: 'j', secondary: 'k', effort: 'l' }[slot]); }
      return action;
    };
    const releaseAction = async slot => {
      if (profile.touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      else await page.keyboard.up({ primary: 'j', secondary: 'k', effort: 'l' }[slot]);
    };
    const actionInput = action => action === 'shoot' ? { shoot: 'press' } : { [action]: true };
    const obtainHumanPossession = async () => {
      for (let attempt = 0; attempt < 90; attempt++) {
        const player = model.players.find(row => row.id === model.controlledPlayerId);
        if (model.phase === 'playing' && model.ball.ownerId === player.id && player.cooldown === 0) return;
        assert(model.phase !== 'finished', 'The player gets a real possession before the fixture ends');
        if (model.phase === 'halftime') {
          await snapshot('possession search period break'); await activate(button('Next period'));
          model = engine.continueCourtPeriod(model); expectedCareer = careerApi.updateCareerMatch(expectedCareer, model, true); await resume();
        } else if (model.ball.ownerId === player.id) await advance(100);
        else if (model.phase === 'playing' && model.possession === player.side) {
          const action = await pressAction('secondary'); await releaseAction('secondary'); await advance(500, {}, [actionInput(action)]);
        } else await advance(500);
      }
      assert.fail('A bounded real wait and call sequence must obtain human ownership');
    };
    try {
      await page.goto(BASE + '/court-life', { waitUntil: 'domcontentloaded' });
      await button('Start your career').waitFor();
      row.loadedFonts = await page.evaluate(async () => {
        await document.fonts.ready;
        const result = [];
        for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
          const faces = await document.fonts.load(`${weight} 16px "${family}"`, 'Court Life');
          result.push({ family, weight, faces: faces.map(face => ({ family: face.family, weight: face.weight, status: face.status })) });
        }
        return result;
      });
      assert.equal(row.loadedFonts.length, 8);
      for (const requested of row.loadedFonts) assert(requested.faces.length > 0 && requested.faces.every(face => face.status === 'loaded' && face.family.replace(/['"]/g, '') === requested.family), 'Every requested real font has nonempty loaded faces');
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
      assert((await page.locator('[data-court-life]').innerText()).includes('A made inside shot earns two points'), 'A worked example appears before creating a career');
      assert(await button('Start your career').isDisabled(), 'Rules acknowledgement and name gate creation');
      await activate(button('Court Life rules')); await page.getByRole('dialog').waitFor(); await page.clock.runFor(300); await shot('rules');
      assert((await page.getByRole('dialog').innerText()).includes('58/100'), 'Rules retain the worked season score');
      await closeDialog();
      assert(await button('Court Life rules').evaluate(node => document.activeElement === node), 'Rules restore their real opener before play');
      const createCareer = async name => {
        await page.getByLabel("Your player's name", { exact: true }).fill(name);
        await page.getByLabel("I've read the controls and house rules.", { exact: true }).check();
        await activate(button('Start your career'));
        await page.locator('[data-court-hub]').waitFor(); await page.clock.runFor(400);
      };
      await createCareer(`Court QA ${profile.width}`);
      let actual = await readSave();
      expectedCareer = careerApi.createCourtLifeCareer({ id: actual.id, seed: actual.seed, name: `Court QA ${profile.width}`, crewId: 'copper-owls', archetypeId: 'connector' });
      assert.deepEqual(actual, expectedCareer, 'Actual native creation matches the independent sealed world');
      row.createdCareer = actual;
      await shot('career');
      const prepareFixture = async () => {
        assert(await page.getByRole('button', { name: 'Go to the court', exact: false }).isDisabled(), 'Unprepared fixture is gated');
        await activate(page.getByRole('button', { name: /^Your day/ }));
        for (let block = 0; block < 2; block++) {
          const action = block === 0 ? { kind: 'recovery' } : expectedCareer.resources.credits >= 2 ? { kind: 'team' } : { kind: 'work' };
          const choice = careerApi.careerActions(expectedCareer).find(row => JSON.stringify(row.action) === JSON.stringify(action));
          assert(choice && !choice.reason);
          await activate(page.getByRole('button', { name: new RegExp('^' + choice.label) }));
          expectedCareer = careerApi.applyCareerAction(expectedCareer, action);
          assert.deepEqual(await readSave(), expectedCareer, 'Displayed preparation applies its actual career effect');
        }
        await activate(button('Back to your day')); await activate(page.getByRole('button', { name: /^Life off court/ }));
        const choice = careerApi.currentLifeDecision(expectedCareer).options.find(option => !option.reason);
        assert(choice);
        const options = page.locator('[data-court-panel="life"] button').filter({ hasText: choice.label });
        await activate(options);
        expectedCareer = careerApi.chooseLifeDecision(expectedCareer, choice.id);
        assert.deepEqual(await readSave(), expectedCareer, 'Native life choice applies its actual resource changes');
        await activate(button('Back to your day'));
        await activate(page.getByRole('button', { name: 'Go to the court', exact: false }));
        expectedCareer = careerApi.startCareerMatch(expectedCareer); model = expectedCareer.activeMatch.match;
        await game().waitFor(); await page.clock.runFor(400);
        await snapshot('fixture created');
      };
      const fixtureCount = profile.width === 390 ? 6 : 1;
      for (let fixture = 0; fixture < fixtureCount; fixture++) {
        await prepareFixture();
        if (fixture === 0) {
          await geometryProof(page, model, row, 'opening court'); await shot('court');
          await resume(); await advance(1800);
          assert.equal(model.phase, 'playing', 'Actual inbound starts the match');
          const startPosition = model.players.find(player => player.id === model.controlledPlayerId);
          if (profile.touch) {
            const pad = page.locator('[data-court-pad]'); await pad.scrollIntoViewIfNeeded();
            const box = await pad.boundingBox(); assert(box);
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2 + 48, y: box.y + box.height / 2, id: 2, radiusX: 4, radiusY: 4, force: 1 }] });
          } else { await canvas().focus(); await page.keyboard.down('ArrowRight'); }
          await advance(700, { moveY: -1 });
          if (profile.touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await page.keyboard.up('ArrowRight');
          await advance(100);
          const moved = model.players.find(player => player.id === model.controlledPlayerId);
          assert(moved.y < startPosition.y - .1, 'Native right movement advances the actual player to screen right');
          await pause('native movement'); await geometryProof(page, model, row, 'moved player'); await shot('movement');
          // Menu keys must not act on the court. This is a real button focus.
          await button('Court Life rules').focus();
          await page.keyboard.press('j'); await page.keyboard.press('ArrowRight');
          await page.clock.runFor(1000); await snapshot('menu keys do not play');
          await resume();
          const effort = await pressAction('effort');
          await advance(500, { [effort]: true }, [actionInput(effort)]); await releaseAction('effort');
          await advance(100);
          await obtainHumanPossession();
          assert.equal(await pressAction('secondary'), 'pass'); await releaseAction('secondary'); await advance(50, {}, [{ pass: true }]);
          assert.equal(model.ball.mode, 'pass', 'The actual human pass enters physical flight');
          assert.equal(model.ball.passerId, model.controlledPlayerId);
          assert(model.events.some(event => event.kind === 'pass' && event.playerId === model.controlledPlayerId), 'The human pass is recorded by the actual engine');
          await pause('human pass flight'); await geometryProof(page, model, row, 'human physical pass'); await shot('human-pass');
          await resume(); await advance(900);
          let humanShot = false;
          for (const chargeTime of [450, 150, 75, 50]) {
            await obtainHumanPossession();
            const beforeAttempts = model.players.find(player => player.id === model.controlledPlayerId).stats.attempts;
            assert.equal(await pressAction('primary'), 'shoot');
            await advance(chargeTime, {}, [{ shoot: 'press' }]); await releaseAction('primary'); await advance(50, {}, [{ shoot: 'release' }]);
            humanShot = model.players.find(player => player.id === model.controlledPlayerId).stats.attempts === beforeAttempts + 1;
            if (humanShot) break;
            // A real defender can steal during the charge. Obtain another
            // legal possession; never replace that live defensive outcome.
          }
          assert(humanShot, 'A native human release launches one actual shot');
          assert(model.events.some(event => event.kind === 'shot' && event.playerId === model.controlledPlayerId), 'The human shot is recorded by the actual engine');
          await pause('human shot flight'); await geometryProof(page, model, row, 'human physical shot'); await shot('human-shot');
          await resume(); await advance(800);
          await pause('native actions and release'); await geometryProof(page, model, row, 'actual ball and players'); await shot('actions');
          // Each effective DOM fault is read while simulation is paused. The
          // original exact attributes are restored before the next proof.
          await geometryProof(page, model, null, 'unaltered control baseline', true);
          for (const [name, selector, attribute, changed, message] of [
            ['font', '[data-court-control="primary"]', 'style', 'font-size:6px!important', 'Action labels remain readable'],
            ['target', '[data-court-control="primary"]', 'style', 'min-height:0!important;height:20px!important;padding:0!important', 'All actual action buttons'],
            ['overflow', '[data-court-controls]', 'style', 'width:2000px!important;min-width:2000px!important', 'Court Life has no horizontal page overflow'],
            ['vertical', '[data-court-controls]', 'style', 'transform:translateY(2000px)', 'The full action pane is visible'],
          ]) {
            const node = page.locator(selector), original = await node.getAttribute(attribute);
            await node.evaluate((el, args) => el.setAttribute(args.attribute, args.changed), { attribute, changed });
            assert.notEqual(await node.getAttribute(attribute), original, 'DOM fault changes the real page');
            let rejected = false;
            try { await geometryProof(page, model, null, name, true); } catch (error) { assert(error.message.includes(message), 'The intended geometry check rejects its fault'); rejected = true; report.controls.push({ profile: id, name, changed: true, rejected: true, message: error.message }); }
            assert(rejected, `Effective ${name} fault must be rejected`);
            await node.evaluate((el, args) => args.original === null ? el.removeAttribute(args.attribute) : el.setAttribute(args.attribute, args.original), { attribute, original });
            assert.equal(await node.getAttribute(attribute), original, 'Fault restores exact original attribute');
            await page.clock.runFor(32); await geometryProof(page, model, null, `${name} restored`, true); report.controls.at(-1).restored = true;
          }
          const frameBytes = await canvas().getAttribute('data-court-frame');
          await canvas().evaluate(node => { const frame = JSON.parse(node.dataset.courtFrame); frame.ball.x += 19; node.dataset.courtFrame = JSON.stringify(frame); });
          assert.notEqual(await canvas().getAttribute('data-court-frame'), frameBytes);
          let rejected = false;
          try { await geometryProof(page, model, null, 'ball projection fault'); } catch (error) { assert(error.message.includes('Actual ball X equals'), 'The intended physical projection check rejects its fault'); rejected = true; report.controls.push({ profile: id, name: 'projection', changed: true, rejected: true, message: error.message }); }
          assert(rejected, 'Wrong projected ball must fail');
          await canvas().evaluate((node, value) => node.setAttribute('data-court-frame', value), frameBytes);
          assert.equal(await canvas().getAttribute('data-court-frame'), frameBytes); await geometryProof(page, model, null, 'projection restored'); report.controls.at(-1).restored = true;
          await resume(); await advance(100);
          const heldBeforeHelp = await pressAction('primary');
          await advance(150, {}, [actionInput(heldBeforeHelp)]);
          // Keep the real held touch active while a native keyboard activation
          // opens Help. A second touchscreen tap would replace that contact.
          await button('Court Life rules').focus(); await button('Court Life rules').press('Enter'); await page.getByRole('dialog').waitFor();
          await releaseAction('primary'); await page.clock.runFor(1000);
          await snapshot('Help clears a physically held action'); await shot('paused-help');
          await closeDialog(); await page.clock.runFor(1000); await snapshot('closing Help keeps play paused');
          await resume(); await advance(250);
          // Native tab focus loss exercises the actual blur path. No synthetic
          // visibility event or engine replacement is used.
          assert(await page.evaluate(() => document.hasFocus()), 'The actual game tab owns focus before switching');
          const other = await context.newPage(); await other.goto('about:blank'); await other.bringToFront();
          assert.equal(await page.evaluate(() => document.hasFocus()), false, 'The sibling tab actually removes game focus');
          await page.clock.runFor(1000); await snapshot('native browser focus loss');
          await other.close(); await page.bringToFront(); await page.clock.runFor(500); await snapshot('returning to tab remains paused');
          const persisted = await readSave(); await retain();
          await page.reload({ waitUntil: 'domcontentloaded' }); await canvas().waitFor(); await page.clock.runFor(500);
          assert.deepEqual(await readSave(), persisted, 'Reload retains the exact paused physical checkpoint');
          await snapshot('reload opens paused'); await geometryProof(page, model, row, 'restored court'); await shot('restored');
          await page.evaluate(() => { window.__courtFailSave = true; });
          await resume(); await advance(600); await activate(button('Pause'));
          model = engine.neutralizeCourtMatch(model); await page.clock.runFor(34);
          assert.equal(await game().getAttribute('data-court-paused'), 'true');
          assert(await button('Retry saving').isVisible(), 'Storage failure is visible while actual play remains usable');
          const failedBytes = await readSave(); assert(failedBytes.activeMatch.match.tick < model.tick, 'Failed writes preserve the previous durable match');
          expectedCareer = careerApi.updateCareerMatch(expectedCareer, model, true);
          await page.evaluate(() => { window.__courtFailSave = false; });
          await activate(button('Retry saving')); await snapshot('retry saves latest actual play');
          await shot('save-recovered');
        }
        await resume();
        let chunks = 0;
        while (model.phase !== 'finished') {
          assert(chunks++ < 70, 'A full actual fixture reaches its finite match clock');
          if (model.phase === 'halftime') {
            await snapshot('actual period break');
            await activate(button('Next period')); model = engine.continueCourtPeriod(model);
            expectedCareer = careerApi.updateCareerMatch(expectedCareer, model, true);
            await snapshot('next period waits for player'); await resume();
          }
          await advance(6000);
        }
        await snapshot('actual final whistle');
        await visibleUnaided(button('View match stats'), 'final match stats action');
        assert(model.players.some(player => player.stats.attempts > 0), 'Actual match contains real shot attempts');
        assert.equal(model.players.filter(player => player.side === 'home').reduce((sum, player) => sum + player.stats.points, 0), model.score.home);
        assert.equal(model.players.filter(player => player.side === 'away').reduce((sum, player) => sum + player.stats.points, 0), model.score.away);
        row.matches.push({ fixture, tick: model.tick, score: model.score, result: model.result, stats: model.players.map(player => ({ id: player.id, stats: player.stats })), sha256: digest(JSON.stringify(model)) });
        await activate(button('View match stats')); await page.getByRole('dialog').waitFor(); await page.clock.runFor(300);
        await visibleUnaided(button('Finish game and return to your day'), 'final ledger continuation');
        const rows = await page.locator('[data-court-boxscore] tbody tr').evaluateAll(nodes => nodes.map(node => [...node.querySelectorAll('th,td')].map(cell => cell.textContent)));
        assert.deepEqual(rows, ['home', 'away'].flatMap(side => model.players.filter(player => player.side === side).map(player => [player.name, String(player.stats.points), `${player.stats.made}/${player.stats.attempts}`, ...['assists', 'rebounds', 'steals', 'blocks', 'turnovers'].map(key => String(player.stats[key]))])), 'Visible box score is the actual completed engine ledger');
        if (fixture === 0 || fixture === 5) await shot(`boxscore-${fixture + 1}`);
        const completionResponse = fixture === 5 ? page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/game_completions')) : null;
        await activate(button('Finish game and return to your day'));
        expectedCareer = careerApi.completeCareerMatch(expectedCareer, model);
        if (expectedCareer.phase === 'seasonComplete') expectedCareer = careerApi.claimCourtSeasonScore(expectedCareer).career;
        await page.locator('[data-court-hub]').waitFor(); await page.clock.runFor(400); if (completionResponse) await completionResponse;
        assert.deepEqual(await readSave(), expectedCareer, 'Completed fixture and independent other fixture exactly match the career ledger');
        const completions = row.network.filter(request => request.method === 'POST' && new URL(request.url).pathname.endsWith('/game_completions'));
        assert.equal(completions.length, fixture === 5 ? 1 : 0, 'Only the witnessed complete season attempts one locally fulfilled completion');
        save();
      }
      if (fixtureCount === 6) {
        await activate(button('Season recap')); await page.clock.runFor(300); await shot('season');
        assert((await page.locator('[data-court-panel="season"]').innerText()).includes(`Season score: ${careerApi.courtSeasonScore(expectedCareer)}/100`));
        const finished = await readSave(), completionCount = row.network.filter(request => request.method === 'POST').length;
        await retain(); await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-court-hub]').waitFor(); await page.clock.runFor(500);
        assert.deepEqual(await readSave(), finished, 'Restored completed season retains its claim');
        assert.equal(row.network.filter(request => request.method === 'POST').length, completionCount, 'Restored finished season never repeats a completion request');
        await activate(button('Next season')); expectedCareer = careerApi.nextCareerSeason(expectedCareer);
        assert.deepEqual(await readSave(), expectedCareer, 'Next season preserves actual career history and growth');
        await activate(page.getByRole('button', { name: /^Career chapters/ })); await page.clock.runFor(300); await shot('chapter');
        assert((await page.locator('[data-court-panel="history"]').innerText()).includes('Game 6:'), 'Archived chapter retains all six actual life choices');
      }
      fs.writeFileSync(path.join(OUT, `${id}-career.json`), JSON.stringify(expectedCareer, null, 2));
      // Corrupt-save recovery is a separate browser-local journey after the
      // complete native season. The invalid bytes are the deliberate fault.
      const corrupt = '{"version":999,"nativeRecovery":"keep these exact bytes"}';
      await retain(); await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: KEY, raw: corrupt });
      await page.reload({ waitUntil: 'domcontentloaded' }); await button('Download saved copy').waitFor(); await page.clock.runFor(300);
      const downloadPromise = page.waitForEvent('download'); await activate(button('Download saved copy')); const download = await downloadPromise;
      const downloadedPath = await download.path(); assert.equal(fs.readFileSync(downloadedPath, 'utf8'), corrupt, 'Recovery download preserves exact original bytes');
      await createCareer('Recovery Court');
      assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), corrupt, 'Starting in memory never overwrites unsupported raw');
      assert((await page.locator('[data-court-life]').innerText()).includes('running without saving'), 'Unsaved replacement career is clearly identified');
      await activate(button('Replace local save')); await page.getByRole('dialog').waitFor();
      await activate(button('Keep old save')); await page.getByRole('dialog').waitFor({ state: 'detached' }); await page.clock.runFor(32);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), corrupt, 'Keep old save leaves the exact bytes alone');
      await activate(button('Replace local save')); await page.getByRole('dialog').waitFor();
      await activate(page.getByRole('dialog').getByRole('button', { name: 'Replace local save', exact: true }));
      await page.getByRole('dialog').waitFor({ state: 'detached' }); await page.clock.runFor(32);
      assert.equal(careerApi.decodeCourtLifeSave(await page.evaluate(key => localStorage.getItem(key), KEY)).status, 'valid', 'Explicit replacement writes the current valid career');
      assert.equal(await button('Download saved copy').count(), 0); await shot('recovery-confirmed');
      await retain();
      assert(row.events.some(event => event.trusted && event.type === (profile.touch ? 'pointerdown' : 'keydown')), 'Journey used actual trusted native inputs');
      assert.equal(row.errors.length, 0, 'No browser runtime errors'); assert.equal(row.assetErrors.length, 0, 'No broken local assets');
      assert(row.network.every(request => request.fulfilledLocally), 'All external transport is fulfilled locally');
      assert.equal(report.controls.filter(control => control.profile === id && control.changed && control.rejected && control.restored).length, 5);
      row.pass = true; console.log(`Court Life native ${id}: ${fixtureCount} actual fixtures, independent physical replay, recovery and five effective DOM faults passed.`);
    } catch (error) {
      row.failure = error.stack || String(error);
      await retain().catch(() => {}); await shot('failure').catch(() => {}); throw error;
    } finally { save(); await context.close(); }
  }
  assert.equal(report.cases.filter(row => row.pass).length, 3); assert.equal(report.controls.length, 15);
  report.sourceAfter = sourceHashes(); assert.deepEqual(report.sourceAfter, report.sourceBefore, 'Native verification never modifies game sources');
  assert.equal(report.cases.reduce((sum, row) => sum + row.matches.length, 0), 8);
  report.pass = true; console.log('Court Life native: 3 profiles, 8 full actual fixtures, 15 effective DOM controls, zero forwarded writes.');
} catch (error) { report.failure = error.stack || String(error); process.exitCode = 1; console.error(report.failure); }
finally {
  report.finished = new Date().toISOString(); save();
  await browser?.close(); if (server) await new Promise(resolve => server.close(resolve));
  assert(temp.startsWith(ROOT + path.sep + '.court-life-native-'), 'Only the owned temporary native entry is removed');
  fs.rmSync(temp, { recursive: true, force: true });
}

async function geometryProof(page, model, row, reason, inView = false) {
  const value = await page.evaluate(() => {
    const canvas = document.querySelector('[data-court-canvas]'), pane = document.querySelector('[data-court-controls]');
    const rect = node => { const box = node.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom }; };
    const box = rect(canvas), frame = JSON.parse(canvas.dataset.courtFrame), context = canvas.getContext('2d');
    const x = Math.round(frame.ball.x), y = Math.round(frame.ball.y), sample = [];
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (x + dx >= 0 && y + dy >= 0 && x + dx < canvas.width && y + dy < canvas.height) sample.push([...context.getImageData(x + dx, y + dy, 1, 1).data]);
    }
    return { reason: '', viewport: { width: innerWidth, height: innerHeight }, pageWidth: document.documentElement.scrollWidth, canvas: box, frame, ballPixels: sample,
      pane: rect(pane), pad: rect(document.querySelector('[data-court-pad]')),
      buttons: [...pane.querySelectorAll('button')].map(node => ({ ...rect(node), text: node.textContent, size: parseFloat(getComputedStyle(node).fontSize), client: node.clientWidth, scroll: node.scrollWidth })),
      text: [...pane.querySelectorAll('span')].map(node => ({ text: node.textContent, size: parseFloat(getComputedStyle(node).fontSize) })),
    };
  });
  value.reason = reason;
  assert(value.pageWidth <= value.viewport.width + 2, 'Court Life has no horizontal page overflow');
  assert(value.pane.x >= -1 && value.pane.right <= value.viewport.width + 1, 'Actual controls stay inside the viewport width');
  if (inView) {
    assert(value.pane.y >= -1 && value.pane.bottom <= value.viewport.height + 1, 'The full action pane is visible without driver reveal');
    assert(value.canvas.y >= -1 && value.canvas.bottom <= value.viewport.height + 1, 'The full actual court is visible beside its controls');
  }
  assert(value.pad.width >= 128 && value.pad.height >= 128, 'Movement pad retains its 128px target');
  assert.equal(value.buttons.length, 3);
  for (const button of value.buttons) {
    assert(button.width >= 44 && button.height >= 44, 'All actual action buttons are at least 44px');
    assert(button.size >= 12 && button.scroll <= button.client + 1, 'Action labels remain readable and unclipped');
  }
  assert(value.text.every(node => node.size >= 12), 'Control key labels remain at least 12px');
  const { width, height } = value.canvas;
  assert(width > 0 && height > 0 && value.canvas.x >= -1 && value.canvas.right <= value.viewport.width + 1);
  // Independent projection equations, deliberately not importing the renderer.
  const scale = Math.min((width - 28) / 24, (height - 54) / (16 * .72));
  const left = (width - 24 * scale) / 2, top = (height - 16 * scale * .72) / 2 + 9;
  const projected = (x, y, z = 0) => ({ x: left + (24 - y) * scale, y: top + x * scale * .72 - z * scale * .75 });
  const near = (actual, expected, label) => assert(Math.abs(actual - expected) < .001, label);
  near(value.frame.scale, scale, 'Actual court scale follows physical dimensions'); assert.equal(value.frame.tick, model.tick);
  const ball = projected(model.ball.x, model.ball.y, model.ball.z);
  near(value.frame.ball.x, ball.x, 'Actual ball X equals independently projected physical state');
  near(value.frame.ball.y, ball.y, 'Actual ball Y equals independently projected physical state');
  assert.equal(value.frame.ball.mode, model.ball.mode); assert.equal(value.frame.ball.flightId, model.ball.flightId);
  assert(value.ballPixels.some(([red, green, blue, alpha]) => red > 200 && green > 90 && green < 190 && blue < 110 && alpha === 255), 'Actual raster contains the visible orange ball at its physical projection');
  assert.equal(value.frame.players.length, 6);
  for (const player of model.players) {
    const rendered = value.frame.players.find(row => row.id === player.id), position = projected(player.x, player.y, player.z);
    assert(rendered); near(rendered.x, position.x, 'Rendered player X comes from actual physical position'); near(rendered.y, position.y, 'Rendered player Y comes from actual physical position');
    assert.equal(rendered.action, player.action); assert.equal(rendered.controlled, player.id === model.controlledPlayerId);
  }
  row?.geometry.push(value); return value;
}
