/* Real mounted practice panels, trusted input and locally fulfilled transport. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARTIFACTS = path.join(ROOT, 'career-practice-lifecycle-artifacts');
const OUT = path.join(ARTIFACTS, 'native');
const CACHE = path.resolve(process.env.CAREER_PRACTICE_FONT_CACHE || path.join(ARTIFACTS, 'font-cache'));
const digest = value => createHash('sha256').update(value).digest('hex');
const sheets = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(row => new URL(row[1]).href);
assert.equal(sheets.length, 1, 'Read the actual template font stylesheet');
assert(process.env.CI, 'Practice native execution runs only in remote CI');
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
  console.log(`Prepared ${manifest.length} career practice font dependencies.`);
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
  'src/components/soccer-career/TrainingPanel.tsx', 'src/components/career/TrainingGround.tsx',
  'src/components/career/drills/ConeRunDrill.tsx', 'src/components/career/drills/BurstTapDrill.tsx',
  'src/components/career/drills/ZonePickDrill.tsx', 'src/components/career/drills/GateTapDrill.tsx',
  'src/hooks/usePracticeClock.ts', 'src/components/us-career/UsCareerPractice.tsx',
  'src/lib/soccerCareerEngine.ts', 'src/lib/careerTraining.ts',
  'src/lib/nbaCareerTraining.ts', 'src/lib/nflCareerTraining.ts',
  'src/lib/nbaCareerSport.ts', 'src/lib/nflCareerSport.ts',
  'src/components/soccer-career/TrainingFeedback.module.css', 'scripts/qa/careerPractice1076.mjs',
];
const sourceHashes = () => Object.fromEntries(sourceFiles.map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))]));
const report = { started: new Date().toISOString(), sourceBefore: sourceHashes(), cases: [], controls: [], forwardedWrites: 0 };
fs.mkdirSync(OUT, { recursive: true });
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const { chromium } = await import('../lib/playwrightLoader.mjs');
const { build: bundle } = await import('esbuild');
const baseline = await bundle({ absWorkingDir: ROOT, stdin: { contents: "export { applyTrainingResult } from './src/lib/soccerCareerEngine'; export { bankTrainingRating } from './src/lib/careerTraining';", resolveDir: ROOT }, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
const reducers = await import('data:text/javascript;base64,' + Buffer.from(baseline.outputFiles[0].text).toString('base64'));
const temp = fs.mkdtempSync(path.join(ROOT, '.practice-native-'));
// The fixture owns only mounting and the caller's state. It uses the shipped
// panels, sport bindings and reward reducers without replacing their outcomes.
const entry = `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { applyTheme, storedTheme } from '@/lib/theme';
import TrainingPanel from '@/components/soccer-career/TrainingPanel';
import UsCareerPractice from '@/components/us-career/UsCareerPractice';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { initCareer, FALLBACK_CLUBS, trainingAvailable, applyTrainingResult } from '@/lib/soccerCareerEngine';
import { bankTrainingRating } from '@/lib/careerTraining';
import '@/index.css';
applyTheme(storedTheme());
const kind = new URLSearchParams(location.search).get('sport') || 'soccer';
const soccer = initCareer('Native Practice', 'England', 'ST', 'modern', { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 }, 70, 2026, FALLBACK_CLUBS, undefined, 90);
const proof = window.__practiceProof = { kind, initial: soccer, current: soccer, callbacks: [], closes: 0, rating: 70, bank: null };
function App() {
  const [open, setOpen] = useState(false), [career, setCareer] = useState(soccer), [bank, setBank] = useState(null);
  const close = () => { proof.closes++; setOpen(false); };
  const complete = (drill, score) => {
    proof.callbacks.push({ drill, score });
    if (kind === 'soccer') { const next = applyTrainingResult(proof.current, drill, score); proof.current = next; setCareer(next); }
    else { const next = bankTrainingRating(proof.rating, 90, score); proof.rating = next.ovr; proof.bank = next; setBank({ ...next, before: 70, year: 2026, drill, score }); }
  };
  return <TooltipProvider><main className="p-4"><h1 className="font-display text-2xl">Practice verification</h1><button className="min-h-11 min-w-11 rounded bg-primary p-3 text-primary-foreground" onClick={() => setOpen(true)}>Open practice</button>
    {open && (kind === 'soccer' ? <TrainingPanel career={career} available={trainingAvailable(career)} onComplete={complete} onDrill={() => { throw new Error('Unexpected position drill callback'); }} onClose={close} /> : <UsCareerPractice sport={kind === 'nba' ? NBA_CAREER_SPORT : NFL_CAREER_SPORT} pos={kind === 'nba' ? 'PG' : 'QB'} available={!bank} result={bank || undefined} onComplete={complete} onClose={close} />)}
  </main></TooltipProvider>;
}
createRoot(document.getElementById('root')).render(<App />);`;
fs.writeFileSync(path.join(temp, 'entry.tsx'), entry);
fs.writeFileSync(path.join(temp, 'index.html'), `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="${sheets[0]}" rel="stylesheet"></head><body><div id="root"></div><script type="module" src="./entry.tsx"></script></body></html>`);
report.fixture = { sha256: digest(entry), mode: 'Actual mounted panels and reducers; callbacks and in-memory state only', productionPersistence: false };
const dist = path.join(temp, 'dist');
let browser, server;

async function nativeFocus(page) {
  const client = page._connection?.toImpl(page)?.delegate?._mainFrameSession?._client;
  assert.equal(typeof client?.send, 'function', 'Actual focus requires the original Chromium session');
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: false });
}

async function geometry(page) {
  return page.getByRole('dialog').evaluate(node => {
    const box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const targets = [...node.querySelectorAll('button')].filter(el => el.getClientRects().length && !el.disabled);
    const feedback = node.querySelector('[data-training-feedback]');
    return { viewport: { width: innerWidth, height: innerHeight }, pane: box(node), scrollWidth: document.documentElement.scrollWidth,
      targets: targets.map(el => ({ ...box(el), label: el.getAttribute('aria-label') || el.textContent, font: parseFloat(getComputedStyle(el).fontSize) })),
      feedback: feedback ? { ...box(feedback), font: parseFloat(getComputedStyle(feedback).fontSize), text: feedback.textContent } : null };
  });
}
function checkGeometry(value) {
  assert(value.scrollWidth <= value.viewport.width + 1, 'No horizontal page overflow');
  assert(value.pane.x >= 0 && value.pane.right <= value.viewport.width && value.pane.y >= 0 && value.pane.bottom <= value.viewport.height, 'Practice pane is inside the viewport');
  for (const target of value.targets) {
    assert(target.width >= 44 && target.height >= 44, `44px practice control: ${target.label}`);
    assert(target.x >= value.pane.x && target.right <= value.pane.right + 1, `Practice control fits the pane: ${target.label}`);
    assert(target.y >= value.pane.y && target.bottom <= value.pane.bottom + 1, `Practice control is visible inside the pane: ${target.label}`);
  }
  if (value.feedback) {
    assert(value.feedback.font >= 12, 'Practice feedback is readable at 12px or larger');
    assert(value.feedback.x >= value.pane.x && value.feedback.right <= value.pane.right + 1, 'Practice feedback fits horizontally');
  }
}

try {
  const { build } = await import('vite');
  await build({ root: temp, configFile: path.join(ROOT, 'vite.config.ts'), publicDir: false, build: { outDir: dist, emptyOutDir: true, minify: false }, logLevel: 'warn' });
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
  server = createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const url = new URL(request.url, 'http://localhost');
    let file = path.resolve(dist, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(dist + path.sep) && file !== dist) { response.writeHead(403); response.end(); return; }
    if (url.pathname === '/') file = path.join(dist, 'index.html');
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
  ]) for (const sport of [
    { id: 'soccer', shot: 'Penalty Placement', burst: 'Sprint Burst', unit: 'Penalty', bank: 'pace' },
    { id: 'nba', shot: 'Shooting Spots', burst: 'Lane Agility', unit: 'Shot', bank: 'lane' },
    { id: 'nfl', shot: 'Accuracy Windows', burst: 'The 40', unit: 'Throw', bank: 'forty' },
  ]) {
    const id = `${sport.id}-${profile.width}-${profile.touch ? 'touch' : 'keyboard'}-${profile.theme}`;
    const row = { id, profile, sport: sport.id, screenshots: [], geometry: [], stages: [], events: [], network: [], fontResponses: [], errors: [], assetErrors: [], storageWrites: [] };
    report.cases.push(row); save();
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch, deviceScaleFactor: 1, reducedMotion: profile.reduced ? 'reduce' : 'no-preference', colorScheme: profile.theme, serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: 'dukb-theme', value: profile.theme }, { name: 'cookie-consent', value: 'essential' }] }] } });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) { assert(['GET', 'HEAD'].includes(request.method()), 'No local write transport'); return route.continue(); }
      row.network.push({ method: request.method(), url: url.href, body: request.postData(), fulfilledLocally: true });
      if (fonts.has(url.href)) { const cached = fonts.get(url.href); row.fontResponses.push({ url: url.href, sha256: digest(cached.body), bytes: cached.body.length }); return route.fulfill({ status: 200, ...cached }); }
      const type = request.resourceType();
      return route.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : type === 'script' ? 'application/javascript' : 'application/json', body: ['stylesheet', 'script'].includes(type) ? '' : '[]' });
    });
    const page = await context.newPage(); page.setDefaultTimeout(15000); await nativeFocus(page);
    await page.clock.install({ time: new Date('2026-10-07T16:00:00Z') });
    await page.addInitScript(() => {
      window.__practiceEvents = []; window.__practiceWrites = [];
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { if (this === localStorage) window.__practiceWrites.push({ key, bytes: String(value).length }); return original.call(this, key, value); };
      for (const type of ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup', 'blur', 'focus', 'visibilitychange']) window.addEventListener(type, event => {
        const target = event.target instanceof Element ? event.target : null;
        window.__practiceEvents.push({ type, trusted: event.isTrusted, key: event.key, pointerType: event.pointerType, at: Date.now(), focused: document.hasFocus(), hidden: document.hidden, target: target?.getAttribute('aria-label') || target?.closest('button')?.textContent || target?.tagName || 'window' });
      }, true);
    });
    page.on('pageerror', error => row.errors.push(String(error)));
    page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.assetErrors.push(request.url() + ': ' + request.failure()?.errorText); });
    page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assetErrors.push(response.url() + ': ' + response.status()); });
    const dialog = () => page.getByRole('dialog');
    const button = name => page.getByRole('button', { name, exact: true });
    const feedback = () => page.locator('[data-training-feedback]');
    const proof = () => page.evaluate(() => window.__practiceProof);
    const screen = async () => dialog().evaluate(node => ({ screen: node.getAttribute('data-soccer-practice-screen') || node.getAttribute('data-practice-screen'), paused: node.getAttribute('data-soccer-practice-paused') || node.getAttribute('data-practice-paused') }));
    const activate = async locator => {
      await locator.scrollIntoViewIfNeeded();
      const box = await locator.boundingBox(); assert(box && box.width >= 44 && box.height >= 44, 'Trusted action has a 44px target');
      if (profile.touch) await locator.tap(); else { await locator.focus(); await locator.press('Enter'); }
    };
    const tick = milliseconds => page.clock.runFor(milliseconds);
    const screenshot = async stage => { const name = `${id}-${stage}.png`; await page.screenshot({ path: path.join(OUT, name), animations: 'disabled' }); row.screenshots.push(name); save(); };
    const expectCount = async count => assert(await dialog().getByText(`${sport.unit} ${count}/5`, { exact: true }).isVisible(), `Actual ${sport.id} attempt is ${count}/5`);
    const open = async () => { await activate(button('Open practice')); await button('Practice rules').waitFor(); };
    const openShot = async () => {
      await activate(page.getByRole('button', { name: new RegExp(sport.shot) }));
      const measured = await geometry(page); checkGeometry(measured);
      row.geometry.push({ stage: 'new shot drill before any driver reveal', ...measured });
    };
    const openBurst = () => activate(page.getByRole('button', { name: new RegExp(sport.burst) }));
    const close = async () => { await activate(button('Close')); await dialog().waitFor({ state: 'detached' }); };
    const paused = async expected => assert.equal((await screen()).paused, String(expected), 'Actual practice pause state');
    const feedbackSnapshot = async () => ({ state: await screen(), text: await feedback().innerText(), zones: await page.locator('[data-training-marker]').evaluateAll(nodes => nodes.map(node => ({ marker: node.getAttribute('data-training-marker'), zone: node.closest('[data-training-zone]')?.getAttribute('data-training-zone') }))) });
    const waitForFocus = async (target, expected) => {
      for (let attempt = 0; attempt < 30; attempt++) {
        if (await target.evaluate(() => document.hasFocus()) === expected) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.fail(`Actual browser focus must become ${expected}`);
    };
    try {
      await page.goto(`${BASE}/?sport=${sport.id}`, { waitUntil: 'domcontentloaded' });
      await button('Open practice').waitFor();
      row.loadedFonts = await page.evaluate(async () => {
        await document.fonts.ready; const result = [];
        for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
          const faces = await document.fonts.load(`${weight} 16px "${family}"`, 'Practice');
          result.push({ family, weight, faces: faces.map(face => ({ family: face.family, weight: face.weight, status: face.status })) });
        }
        return result;
      });
      for (const font of row.loadedFonts) assert(font.faces.length > 0 && font.faces.every(face => face.status === 'loaded' && face.family.replaceAll('"', '') === font.family), `Loaded actual ${font.family} ${font.weight}`);
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
      await page.bringToFront(); assert(await page.evaluate(() => document.hasFocus()));
      await open(); await openShot(); await expectCount(1);
      for (let attempt = 1; attempt <= 5; attempt++) {
        await expectCount(attempt); await activate(page.locator('[data-training-zone="4"]'));
        assert(await feedback().isVisible(), 'Shot settles through actual drill input');
        if (attempt < 5) await tick(1100);
      }
      await tick(400); await activate(button('‹ Drills')); await openBurst(); await tick(2000);
      assert.equal(await page.locator('[data-training-result]').count(), 0, 'Departed final shot cannot hijack another drill');
      assert(await page.getByRole('button', { name: /Tap to start/ }).isVisible());
      assert.equal((await proof()).callbacks.length, 0);
      row.stages.push('final-shot departure cancels pending result');
      await activate(button('‹ Drills')); await openShot(); await expectCount(1);
      assert.equal(await feedback().count(), 0, 'Reopened shot drill clears old reveal');
      await activate(page.locator('[data-training-zone="4"]')); await tick(400);
      await activate(button('Practice rules')); await paused(true);
      const frozen = await feedbackSnapshot(); await tick(2000); assert.deepEqual(await feedbackSnapshot(), frozen, 'Help freezes remaining reveal and actual outcome');
      await activate(button('Practice rules')); await tick(1000); await paused(true);
      assert.deepEqual(await feedbackSnapshot(), frozen, 'Closing Help does not consume remaining reveal');
      await activate(button('Resume practice')); await paused(false); await tick(600);
      assert(await feedback().isVisible(), 'Remaining delay is retained after resume'); await expectCount(1);
      await tick(150); assert.equal(await feedback().count(), 0); await expectCount(2);
      row.stages.push('Help and explicit resume retain exact pending reveal');
      await activate(page.locator('[data-training-zone="4"]')); await activate(button('Pause practice')); await paused(true);
      const measured = await geometry(page); checkGeometry(measured); row.geometry.push({ stage: 'paused actual shot', ...measured }); await screenshot('paused-shot');
      for (const [name, selector, property, value] of [
        ['feedback-font', '[data-training-feedback]', 'font-size', '8px'],
        ['zone-target', '[data-training-zone="4"]', 'height', '20px'],
        ['pane-offscreen', '[role="dialog"]', 'transform', 'translateY(150vh)'],
      ]) {
        const original = await page.locator(selector).getAttribute('style');
        const before = await geometry(page);
        await page.locator(selector).evaluate((node, change) => { node.style.setProperty(change.property, change.value, 'important'); if (change.property === 'height') { node.style.setProperty('min-height', '0', 'important'); node.style.setProperty('align-self', 'start', 'important'); } }, { property, value });
        const changed = await geometry(page); assert.notDeepEqual(changed, before, `DOM fault ${name} changes actual geometry`);
        let rejected = false;
        try { checkGeometry(changed); } catch (error) { assert(error instanceof assert.AssertionError); rejected = true; }
        assert(rejected, `DOM fault ${name} is rejected`);
        await page.locator(selector).evaluate((node, style) => { if (style === null) node.removeAttribute('style'); else node.setAttribute('style', style); }, original);
        const restored = await geometry(page); assert.deepEqual(restored, before, `DOM fault ${name} restores exact geometry`); checkGeometry(restored);
        report.controls.push({ case: id, name, changed: true, rejected, restored: true, before, fault: changed }); save();
      }
      await close(); await tick(2500); assert.equal((await proof()).callbacks.length, 0, 'Closing a paused shot cannot bank');
      await open(); await openShot(); await expectCount(1); await close();
      row.stages.push('exit cancels timers and fresh panel starts at 1/5');

      await open(); await openBurst(); await activate(page.getByRole('button', { name: /Tap to start/ }));
      const floor = () => page.getByRole('button', { name: /GO GO GO/ });
      for (let i = 0; i < 7; i++) await activate(floor());
      await tick(1300); await activate(button('Practice rules')); await paused(true);
      const burstFrozen = await dialog().innerText(); await tick(2000); assert.equal(await dialog().innerText(), burstFrozen, 'Help freezes burst clock and seven earned taps');
      await activate(button('Practice rules')); await paused(true); await activate(button('Resume practice')); await tick(500);
      const beforeBlur = await dialog().innerText();
      const other = await context.newPage();
      try {
        await nativeFocus(other); await other.bringToFront();
        await waitForFocus(other, true); await waitForFocus(page, false);
        await paused(true); const hiddenFrozen = await dialog().innerText(); await tick(2500);
        assert.equal(await dialog().innerText(), hiddenFrozen, 'Real browser focus loss freezes score and remaining time');
        row.focus = { before: beforeBlur, frozen: hiddenFrozen, lost: await page.evaluate(() => ({ focused: document.hasFocus(), hidden: document.hidden })) };
      } finally { await other.close(); await page.bringToFront(); }
      await waitForFocus(page, true);
      await paused(true); await tick(1000); await paused(true);
      await activate(button('Resume practice')); await tick(3100);
      assert.equal(await page.locator('[data-training-result]').count(), 0, 'Unfocused time did not consume the remaining 3.2 seconds');
      await tick(200); assert.equal(Number(await page.locator('[data-training-score]').innerText()), 22, 'Seven real taps retain their 22-point score');
      assert.equal((await proof()).callbacks.length, 0); await screenshot('resumed-result'); await close();
      row.stages.push('real browser blur pauses until explicit resume and preserves remaining time and score');

      await open(); await openBurst(); await activate(page.getByRole('button', { name: /Tap to start/ }));
      for (let i = 0; i < 25; i++) await activate(floor());
      await tick(5000); assert.equal(Number(await page.locator('[data-training-score]').innerText()), 80, 'Uninterrupted 25 real taps earn 80');
      const resultGeometry = await geometry(page); checkGeometry(resultGeometry);
      row.geometry.push({ stage: 'earned result before any driver reveal', ...resultGeometry });
      const initial = await proof(); assert.equal(initial.callbacks.length, 0);
      await activate(button('Bank the session')); await tick(2500);
      const banked = await proof(); assert.deepEqual(banked.callbacks, [{ drill: sport.bank, score: 80 }], 'Actual earned score reaches the callback exactly once');
      if (sport.id === 'soccer') assert.deepEqual(banked.current, reducers.applyTrainingResult(initial.initial, 'pace', 80), 'Soccer actual training reducer banks the earned session');
      else { assert.deepEqual(banked.bank, reducers.bankTrainingRating(70, 90, 80)); assert.equal(banked.rating, 72); }
      row.bank = { callbacks: banked.callbacks, stateHash: digest(JSON.stringify(sport.id === 'soccer' ? banked.current : banked.bank)) };
      await screenshot('banked'); await activate(button('Back to your career')); await open();
      assert(await dialog().getByText('Already trained this season', { exact: true }).isVisible());
      assert.equal(await page.getByRole('button', { name: new RegExp(sport.burst) }).count(), 0, 'Banked session cannot be played and banked twice');
      await tick(5000); assert.equal((await proof()).callbacks.length, 1);
      row.stages.push('uninterrupted earned session banks once through actual reducer');
      const retained = await page.evaluate(() => ({ events: window.__practiceEvents, writes: window.__practiceWrites })); row.events = retained.events; row.storageWrites = retained.writes;
      assert(row.events.some(event => event.type === 'blur' && event.target === 'window' && event.trusted && !event.focused), 'Retained trusted browser blur proves real focus loss');
      assert(row.events.some(event => event.type === (profile.touch ? 'pointerdown' : 'keydown') && event.trusted), 'Retained trusted gameplay input');
      assert.equal(row.storageWrites.length, 0, 'Mounted practice fixture never writes persistent career or progress data');
      assert.deepEqual(row.errors, []); assert.deepEqual(row.assetErrors, []); row.passed = true; save();
    } catch (error) {
      row.failure = String(error.stack || error);
      try { const retained = await page.evaluate(() => ({ events: window.__practiceEvents, writes: window.__practiceWrites, proof: window.__practiceProof, text: document.body.innerText })); Object.assign(row, retained); await screenshot('failure'); } catch {}
      save(); throw error;
    } finally { await context.close(); }
  }
  assert.equal(report.cases.length, 9); assert(report.cases.every(row => row.passed));
  assert.equal(report.controls.length, 27); assert(report.controls.every(row => row.changed && row.rejected && row.restored));
  report.sourceAfter = sourceHashes(); assert.deepEqual(report.sourceAfter, report.sourceBefore, 'Native verification leaves every reviewed source unchanged');
  report.passed = true; save();
  console.log('PASS career practice native: 9 actual panel journeys, 27 effective DOM controls, trusted focus/input, earned banking and unchanged sources.');
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  const resolved = path.resolve(temp); assert(resolved.startsWith(ROOT + path.sep + '.practice-native-'));
  fs.rmSync(resolved, { recursive: true, force: true });
  save();
}
