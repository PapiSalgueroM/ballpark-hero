// Controlled completed-season display proof. The core test owns the actual advance and policy proof.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';
import { answerConsent, storedConsent } from '../lib/answerConsent.mjs';
assert(process.env.CI && process.env.SOCCER_RUSSIA_RAW, 'Remote CI requires SOCCER_RUSSIA_RAW pointing at fixed advanced-season-codec.json');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), KEY = 'soccerCareerSave', BASE = 'http://127.0.0.1:4173';
const INPUT = path.resolve(ROOT, process.env.SOCCER_RUSSIA_RAW), OUT = path.resolve(ROOT, process.env.SOCCER_RUSSIA_BROWSER_OUT || 'russia-europe-browser');
assert(!fs.existsSync(OUT), 'Fresh evidence directory required'); fs.mkdirSync(OUT, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
const put = (name, value) => { const file = name + '.json', bytes = Buffer.from(JSON.stringify(value, null, 2)); fs.writeFileSync(path.join(OUT, file), bytes); return { file, bytes: bytes.length, sha256: sha(bytes) }; };
const receipt = file => { const bytes = fs.readFileSync(path.join(ROOT, file)); return { file, bytes: bytes.length, sha256: sha(bytes) }; };
const inventory = folder => fs.readdirSync(path.join(ROOT, folder), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(item => item.isDirectory() ? inventory(folder + '/' + item.name) : item.isFile() ? [receipt(folder + '/' + item.name)] : []);
const sources = ['src/lib/soccerCareerContinental.ts', 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerSave.ts', 'src/pages/SoccerCareer.tsx',
  'scripts/lib/hostLikeServer.mjs', 'scripts/lib/answerConsent.mjs', 'scripts/qa/playSoccerRussiaEurope.mjs'];
const sourceBefore = sources.map(receipt), distBefore = inventory('dist'), inputBytes = fs.readFileSync(INPUT), raw = JSON.parse(inputBytes);
fs.writeFileSync(path.join(OUT, 'input.json'), inputBytes);
const state = raw.frames.result.output, original = raw.frames.original, row = raw.frames.row;
assert(state && original && row && ['newspaper', 'season_summary'].includes(state.phase), 'Expected completed healthy RAW output in newspaper or season_summary');
assert.equal(row.year, 2022); assert.equal(row.clubCountry, 'Russia'); assert.equal(row.type, 'playing');
assert(row.apps > 0 && !row.injurySevere, 'The fixture must exercise a completed played season');
assert.equal(state.seasons.length, original.seasons.length + 1); assert.deepEqual(state.seasons.at(-1), row);
assert.deepEqual(state.seasons.slice(0, -1), original.seasons, 'Actual engine output preserves all recorded history');
assert.deepEqual(state.pendingSummary, row); assert.equal(row.championsLeague, false); assert(!row.clubCupRun && !row.clubCupTitle);
assert.equal(state.lastUCLResult?.qualified, false, 'Completed engine result must explicitly refuse European qualification');
if ('seasonYear' in state.lastUCLResult) assert.equal(state.lastUCLResult.seasonYear, row.year);
if ('club' in state.lastUCLResult) assert.equal(state.lastUCLResult.club, row.club);
const compiled = await build({ entryPoints: [path.join(ROOT, 'src/lib/soccerCareerSave.ts')], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'error' });
const codec = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
assert(codec.isSoccerCareerSave(state)); const seededBytes = codec.serializeSoccerCareerSave(state);
const report = { status: 'running', scope: 'Controlled fixed RAW actual-engine completed 2022 season. Real App display, newspaper Continue and reload preservation only. No browser season advance, natural-career claim, RNG override or clock override.',
  input: { file: path.relative(ROOT, INPUT).replaceAll('\\', '/'), bytes: inputBytes.length, sha256: sha(inputBytes) },
  sourceBefore, distBefore, codecSha256: sha(compiled.outputFiles[0].contents), journeys: [], screenshots: [], externalForwarded: 0 };
let host, browser;
try {
  host = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', '4173'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('Host startup timeout')), 15000);
    host.stdout.on('data', bytes => { if (String(bytes).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
    host.once('error', reject); host.once('exit', code => { clearTimeout(timer); reject(Error('Host exited ' + code)); }); });
  browser = await pw.chromium.launch({ headless: true });
  for (const width of [320, 390, 1280]) {
    const id = String(width), journey = { width, mode: width === 1280 ? 'keyboard' : 'touch', frames: [], actions: [], errors: [], assetErrors: [], external: [] }; report.journeys.push(journey);
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : width === 390 ? 844 : 900 }, hasTouch: width < 1000, isMobile: width < 1000, serviceWorkers: 'block' });
    const page = await context.newPage(), activate = async button => { await button.scrollIntoViewIfNeeded(); if (width === 1280) { await button.focus(); await button.press('Enter'); } else await button.tap(); };
    const settle = () => page.evaluate(async () => { await document.fonts.ready; const start = performance.now(); let frames = 0;
      do { await new Promise(requestAnimationFrame); frames++; if (frames >= 4 && !document.getAnimations().some(a => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime))) return; } while (performance.now() - start < 10000); throw Error('App did not settle'); });
    const capture = async name => { await settle(); const stored = await page.evaluate(key => localStorage.getItem(key), KEY); assert(stored);
      const value = { raw: stored, state: codec.parseSoccerCareerSave(stored), scroll: await page.evaluate(() => ({ x: scrollX, y: scrollY })), sha256: sha(stored) };
      assert(codec.isSoccerCareerSave(value.state)); assert.deepEqual(value.state.seasons.slice(0, -1), original.seasons);
      journey.frames.push({ name, ...put(id + '-' + name, value) }); return value; };
    try {
      await context.route('**/*', route => { const request = route.request(); if (new URL(request.url()).origin === BASE) return route.continue();
        journey.external.push({ url: request.url(), method: request.method(), disposition: 'aborted' }); return route.abort('blockedbyclient'); });
      await context.addInitScript(({ key, value }) => { if (!sessionStorage.getItem('russia-fixture-seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('russia-fixture-seeded', '1'); } }, { key: KEY, value: seededBytes });
      page.on('pageerror', error => journey.errors.push(String(error)));
      page.on('requestfailed', request => { if (request.url().startsWith(BASE + '/assets/')) journey.assetErrors.push({ url: request.url(), error: request.failure()?.errorText }); });
      page.on('response', response => { if (response.url().startsWith(BASE + '/assets/') && response.status() >= 400) journey.assetErrors.push({ url: response.url(), status: response.status() }); });
      await page.goto(BASE + '/soccer-career', { waitUntil: 'networkidle' }); await answerConsent(page, { press: activate }); assert.equal(await storedConsent(page), 'rejected');
      await page.locator('[data-timeline-season="' + row.year + '"]').waitFor(); const loaded = await capture('loaded'); assert.equal(loaded.raw, seededBytes, 'App restores every RAW output byte');
      let expected = state;
      if (state.phase === 'newspaper') {
        await activate(page.getByRole('button', { name: 'Continue to Season Summary →', exact: true }));
        await page.getByRole('heading', { name: 'Season Summary', exact: true }).waitFor();
        expected = { ...state, pendingNews: [], phase: 'season_summary' };
        const continued = await capture('continued'); assert.deepEqual(continued.state, expected);
        journey.actions.push({ name: 'Continue to Season Summary', before: loaded.sha256, after: continued.sha256 });
      }
      const heading = page.getByRole('heading', { name: 'Season Summary', exact: true }); await heading.waitFor();
      const summary = heading.locator('..').locator('..'); await heading.scrollIntoViewIfNeeded(); await settle();
      const summaryText = await summary.innerText(), timelineText = await page.locator('[data-timeline-season="' + row.year + '"]').innerText();
      assert(summaryText.includes(row.club) && summaryText.includes(row.year + '/' + String(row.year + 1).slice(-2)));
      const apps = summary.locator('div.grid.grid-cols-3 > div').first().locator('div').first(); assert.equal((await apps.innerText()).trim(), String(row.apps));
      assert(timelineText.includes(row.club) && timelineText.includes(row.apps + 'A'));
      assert(!summaryText.includes('⭐ UCL'), 'Current summary has no European club-cup trophy');
      assert.equal(await page.locator('span').filter({ hasText: /^⭐ (?:Champions League|European Cup)$/ }).count(), 0, 'No current European club-cup result card');
      const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, fonts: document.fonts.status }));
      assert.equal(layout.width, width); assert(layout.scrollWidth <= width + 1); assert.equal(layout.fonts, 'loaded'); journey.layout = layout;
      put(id + '-visible', { summary: summaryText, timeline: timelineText, expected });
      const shot = id + '-summary.png'; await page.screenshot({ path: path.join(OUT, shot), fullPage: false }); const bytes = fs.readFileSync(path.join(OUT, shot)); report.screenshots.push({ file: shot, bytes: bytes.length, sha256: sha(bytes) });
      const held = await capture('displayed'); assert.deepEqual(held.state, expected); assert.equal(held.raw, codec.serializeSoccerCareerSave(expected));
      for (let n = 1; n <= 2; n++) { await page.reload({ waitUntil: 'networkidle' }); await heading.waitFor(); const restored = await capture('reload-' + n); assert.equal(restored.raw, held.raw, 'Reload preserves every saved byte'); }
      assert.equal(journey.errors.length, 0); assert.equal(journey.assetErrors.length, 0); journey.status = 'passed'; console.log('PASS Russia completed-season display ' + width);
    } catch (error) { journey.status = 'failed'; journey.error = String(error.stack || error);
      put(id + '-failure', { error: journey.error, raw: await page.evaluate(key => localStorage.getItem(key), KEY).catch(() => null), text: await page.locator('body').innerText().catch(() => '') }); throw error;
    } finally { await context.close(); put('report', report); }
  }
  assert.equal(report.screenshots.length, 3); report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = String(error.stack || error); throw error;
} finally {
  if (browser) await browser.close(); if (host) host.kill();
  report.sourceAfter = sources.map(receipt); report.distAfter = inventory('dist'); report.inputAfterSha256 = sha(fs.readFileSync(INPUT));
  try { assert.deepEqual(report.sourceAfter, sourceBefore); assert.deepEqual(report.distAfter, distBefore); assert.equal(report.inputAfterSha256, report.input.sha256);
  } catch (error) { report.status = 'failed'; report.holdError = String(error); }
  put('report', report);
}
assert.equal(report.status, 'passed'); console.log('Russia completed-season display: three widths, three screenshots, two exact reloads per width, zero external requests forwarded.');
