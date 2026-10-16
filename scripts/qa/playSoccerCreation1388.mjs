/* Remote native creation diagnosis. WebKit on Linux is not a physical Safari device. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium, webkit } from '../lib/playwrightLoader.mjs';
import { seedPages, pageDraws } from '../lib/pageSeed.mjs';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Remote offline browser diagnosis only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.SOCCER_CREATION_OUT;
const BASE = process.env.SOCCER_CREATION_BASE;
const PHASE = process.env.SAFARI_REPORT_PHASE || 'baseline';
assert(OUT && path.isAbsolute(OUT) && BASE && new URL(BASE).hostname === '127.0.0.1');
assert(['baseline', 'fixed'].includes(PHASE));
assert(!fs.existsSync(path.join(OUT, 'report.json')), 'Keep each actual browser run');
fs.mkdirSync(OUT, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['src/pages/SoccerCareer.tsx', 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerSave.ts', 'src/components/ui/select.tsx', 'scripts/qa/playSoccerCreation1388.mjs'];
const source = () => Object.fromEntries(files.map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]));
const fontsRoot = process.env.SAFARI_REPORT_FONT_CACHE;
assert(fontsRoot && path.isAbsolute(fontsRoot));
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(fontsRoot, 'manifest.json'))).map(row => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(row.url).origin));
  assert(/^[a-f0-9]{64}$/.test(row.file));
  const body = fs.readFileSync(path.join(fontsRoot, row.file)); assert.equal(sha(body), row.sha256);
  return [row.url, { body, contentType: row.contentType }];
}));
const report = { head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(), phase: PHASE,
  scope: 'Actual built controls with offline unrelated services; generated tester; no physical Safari claim', sourceBefore: source(), cases: [], qualified: false };
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
save();
const compiled = path.join(OUT, 'compiled');
const bundle = await build({ entryPoints: { engine: path.join(ROOT, 'src/lib/soccerCareerEngine.ts'), saved: path.join(ROOT, 'src/lib/soccerCareerSave.ts') },
  outdir: compiled, outExtension: { '.js': '.mjs' }, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') }, metafile: true });
fs.writeFileSync(path.join(OUT, 'compiled-metafile.json'), JSON.stringify(bundle.metafile, null, 2));
const actualEngine = await import(pathToFileURL(path.join(compiled, 'engine.mjs')).href);
const actualSave = await import(pathToFileURL(path.join(compiled, 'saved.mjs')).href);
async function runtimeHeld(page, row, requireBegin = true) {
  assert.equal(row.errors.length, 0, 'No page exception may qualify');
  assert.equal(row.assetFailures.length, 0, 'Every actual application asset loads');
  assert.equal(await page.evaluate(() => localStorage.getItem('unrelated-career')), 'keep-this');
  if (requireBegin) assert(await page.evaluate(() => window.__creationEvents.some(event => event.type === 'click' && event.trusted && /Begin Career/.test(event.target))), 'Actual trusted Begin click observed');
}
async function picture(page, row, suffix = '') {
  const name = row.id + suffix + '.png'; await page.screenshot({ path: path.join(OUT, name), fullPage: false }); row.screenshots.push(name);
}
async function snapshot(page, row, stage) {
  const value = await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(node => /Begin Career/.test(node.textContent));
    const raw = localStorage.getItem('soccerCareerSave');
    return { raw, stored: raw ? JSON.parse(raw) : null, text: document.body.innerText, begin: button ? { disabled: button.disabled, text: button.textContent } : null,
      scrollY, viewport: { width: innerWidth, height: innerHeight, scale: visualViewport?.scale, offsetTop: visualViewport?.offsetTop },
      activeElement: document.activeElement?.outerHTML.slice(0, 500), events: window.__creationEvents };
  });
  value.draws = await pageDraws(page); row.stages.push({ stage, ...value }); save(); return value;
}
async function press(page, locator, touch) { if (touch) await locator.tap(); else await locator.click(); }
async function choose(page, index, name, touch) {
  await press(page, page.getByRole('combobox').nth(index), touch);
  await press(page, page.getByRole('option', { name }).first(), touch);
}
async function setup(page, touch) {
  await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Enter your player name...').fill('Creation Tester');
  await choose(page, 0, /England/, touch);
  await choose(page, 1, /Striker/, touch);
  await choose(page, 2, /2020/, touch);
}
async function roll(page, touch) {
  await press(page, page.getByRole('button', { name: /Generate Starting Potential|Roll again/ }), touch);
  await page.getByRole('button', { name: /Roll again/ }).waitFor({ state: 'visible' });
  await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(node => /Roll again/.test(node.textContent))?.disabled);
}
try {
  for (const profile of [
    { engine: 'webkit', width: 1080, height: 751, touch: false },
    { engine: 'webkit', width: 390, height: 844, touch: true },
    { engine: 'chromium', width: 1080, height: 751, touch: false },
  ]) {
    const browser = await ({ chromium, webkit })[profile.engine].launch({ headless: true });
    try {
      for (const flow of ['normal', 'settled-position', 'rolling-position']) {
        const row = { id: `${profile.engine}-${profile.width}-${flow}`, profile, flow, browserVersion: browser.version(), stages: [], network: [], events: [], errors: [], consoleErrors: [], assetFailures: [], screenshots: [], passed: false };
        report.cases.push(row); save();
        const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: 2, hasTouch: profile.touch,
          isMobile: profile.touch, locale: 'en-GB', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
            { name: 'cookie-consent', value: 'essential' }, { name: 'rules-gate-seen:/soccer-career', value: '1' }, { name: 'unrelated-career', value: 'keep-this' },
          ] }] } });
        try {
          await seedPages(context, 1388);
          await context.addInitScript(() => {
            window.__creationEvents = [];
            for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'click', 'focusin', 'blur']) window.addEventListener(type, event => {
              const element = event.target instanceof Element ? event.target : null;
              window.__creationEvents.push({ type, trusted: event.isTrusted, pointerType: event.pointerType, target: element?.closest('button')?.textContent || element?.getAttribute('role') || element?.tagName, at: performance.now() });
            }, true);
          });
          await context.route('**/*', route => {
            const request = route.request(), url = new URL(request.url());
            if (url.origin === BASE && ['GET', 'HEAD'].includes(request.method())) return route.continue();
            row.network.push({ method: request.method(), url: url.href, kind: request.resourceType(), fulfilledLocally: true });
            if (fonts.has(url.href)) return route.fulfill({ status: 200, ...fonts.get(url.href), headers: { 'access-control-allow-origin': '*' } });
            return route.fulfill({ status: 200, contentType: request.resourceType() === 'script' ? 'application/javascript' : 'application/json', body: request.resourceType() === 'script' ? '' : '[]' });
          });
          await context.routeWebSocket('**/*', socket => socket.close());
          const page = await context.newPage(); page.setDefaultTimeout(12000);
          page.on('pageerror', error => row.errors.push(error.message));
          page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
          page.on('requestfailed', request => { if (new URL(request.url()).origin === BASE) row.assetFailures.push({ url: request.url(), error: request.failure() }); });
          await setup(page, profile.touch); await snapshot(page, row, 'form');
          if (flow !== 'rolling-position') await roll(page, profile.touch);
          else {
            await press(page, page.getByRole('button', { name: /Generate Starting Potential/ }), profile.touch);
            assert(await page.getByRole('button', { name: /Rolling/ }).isVisible(), 'Change starts while the real roll is still active');
          }
          if (flow !== 'normal') {
            await snapshot(page, row, 'before-position');
            await choose(page, 1, /Goalkeeper/, profile.touch);
            await page.waitForTimeout(1500);
            const changed = await snapshot(page, row, 'after-position');
            const begin = page.getByRole('button', { name: /Begin Career/ });
            row.staleBeginEnabled = !changed.begin?.disabled;
            if (PHASE === 'baseline') {
              assert(row.staleBeginEnabled, 'Published source exposes the stale enabled Begin button');
              await press(page, begin, profile.touch); await page.waitForTimeout(300);
              const attempted = await snapshot(page, row, 'stale-begin');
              if (flow === 'settled-position') assert.equal(attempted.stored, null, 'Actual enabled Begin silently does nothing after position changed');
              else assert(attempted.stored?.position === 'GK', 'Old active roll incorrectly permits starting after position changed');
              row.originalFault = flow === 'settled-position' ? 'enabled begin produces no career' : 'old position roll re-enables creation';
              if (flow === 'rolling-position') {
                await runtimeHeld(page, row); await picture(page, row, '-fault'); row.passed = true; continue;
              }
            } else {
              assert(changed.begin?.disabled, 'Changed position requires a fresh matching roll');
              assert.equal(changed.stored, null, 'Changing position never creates a career');
              assert(await page.getByRole('button', { name: /Generate Starting Potential/ }).isVisible(), 'The next step is visible');
            }
            await roll(page, profile.touch);
          }
          await snapshot(page, row, 'ready');
          await press(page, page.getByRole('button', { name: /Begin Career/ }), profile.touch);
          await page.waitForFunction(() => localStorage.getItem('soccerCareerSave') !== null);
          const started = await snapshot(page, row, 'started');
          assert.equal(started.stored.playerName, 'Creation Tester');
          assert.equal(started.stored.position, flow === 'normal' ? 'ST' : 'GK');
          assert.equal(started.stored.phase, 'youth');
          await runtimeHeld(page, row); await picture(page, row);
          assert(!started.stored.seasonMoments, 'Fresh youth creation has no loaded moment settlement');
          const repaired = actualEngine.repairCareer(actualSave.parseSoccerCareerSave(started.raw));
          const expectedReload = actualSave.serializeSoccerCareerSave(repaired);
          row.expectedReload = expectedReload;
          await page.reload({ waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => document.body.innerText.includes('Creation Tester'));
          const reloaded = await snapshot(page, row, 'reloaded'); assert.equal(reloaded.raw, expectedReload, 'Reload equals the actual source repair and save contract');
          await runtimeHeld(page, row, false);
          row.passed = true;
        } catch (error) { row.error = error?.stack || String(error); }
        finally { save(); await context.close(); }
      }
    } finally { await browser.close(); }
  }
} finally { report.sourceAfter = source(); report.sourceHeld = JSON.stringify(report.sourceAfter) === JSON.stringify(report.sourceBefore); save(); }
assert.equal(report.cases.length, 9); assert(report.cases.every(row => row.passed), 'Every actual native creation journey must meet its explicit phase contract');
assert(report.sourceHeld); assert.equal(report.cases.filter(row => row.originalFault).length, PHASE === 'baseline' ? 6 : 0);
report.qualified = true; save();
console.log(`Creation ${PHASE}:9 native journeys;${report.cases.filter(row => row.originalFault).length} exact original observations;WebKit and Chromium;source held.`);
