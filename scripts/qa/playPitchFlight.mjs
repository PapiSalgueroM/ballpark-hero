import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';
import { inventory, loadFonts, checkFonts, sha } from './siteMenuNavigationSupport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.PITCH_FLIGHT_OUT, SITE = process.env.PITCH_FLIGHT_SITE_DIST;
assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'PITCH_SETUP_OFFLINE_CI');
assert.equal(process.env.NODE_OPTIONS, '--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs'), 'PITCH_SETUP_EXACT_PRELOAD');
assert(OUT && path.isAbsolute(OUT) && path.resolve(OUT) !== ROOT && !path.resolve(OUT).startsWith(ROOT + path.sep), 'PITCH_SETUP_OUTSIDE_OUTPUT');
assert(SITE && path.isAbsolute(SITE), 'PITCH_SETUP_COMPLETED_SITE');
const DIST = path.join(OUT, 'fixture-dist'), BROWSER = path.join(OUT, 'browser');
assert(fs.statSync(SITE).isDirectory() && fs.statSync(DIST).isDirectory() && !fs.existsSync(BROWSER), 'PITCH_SETUP_FRESH_BROWSER');
const bindingFile = process.env.PITCH_FLIGHT_BINDING_FILE;
assert(bindingFile && path.isAbsolute(bindingFile), 'PITCH_SETUP_BINDING');
const bindingBody = fs.readFileSync(bindingFile), binding = JSON.parse(bindingBody);
assert.match(binding.sourceHead || '', /^[a-f0-9]{40}$/);
assert.equal(binding.sourceHead, process.env.GITHUB_SHA);
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim(), binding.sourceHead);
assert(Number.isSafeInteger(binding.trackedCount) && binding.trackedCount > 0);
const required = ['src/components/season-centre/MiniPitch.tsx', 'src/components/season-centre/MatchClock.tsx',
  'src/components/pitch-motion/PitchMotion.tsx', 'src/components/pitch-motion/PitchSurface.tsx',
  'src/components/pitch-motion/contract.ts', 'src/components/pitch-motion/scene.ts',
  'src/components/pitch-motion/motion.tsx', 'src/components/pitch-motion/pitchMotion.css',
  'src/index.css', 'scripts/qa/fixtures/pitchFlight.entry.tsx', 'scripts/qa/fixtures/pitchFlight.html',
  'scripts/qa/fixtures/pitchFlight.vite.mjs', 'scripts/qa/playPitchFlight.mjs',
  'scripts/qa/siteMenuNavigationSupport.mjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs'];
for (const file of required) {
  assert.match(binding.pins?.[file] || '', /^[a-f0-9]{64}$/, 'PITCH_SETUP_PIN_' + file);
  assert.equal(sha(fs.readFileSync(path.join(ROOT, file))), binding.pins[file], 'PITCH_SETUP_BODY_' + file);
}
const CACHE = process.env.FREE_KICK_FONT_CACHE;
assert(CACHE && path.isAbsolute(CACHE), 'PITCH_SETUP_FONT_CACHE');
const fonts = loadFonts(CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
const receipt = process.env.SIM_OFFLINE_RECEIPT;
assert(receipt && path.isAbsolute(receipt) && fs.existsSync(receipt) && fs.statSync(receipt).size === 0, 'PITCH_SETUP_EMPTY_TRANSPORT');
fs.mkdirSync(BROWSER);
const save = (name, value) => {
  const body = JSON.stringify(value, null, 2) + '\n', file = path.join(BROWSER, name);
  fs.writeFileSync(file, body, { flag: 'wx' });
  return { file: name, bytes: Buffer.byteLength(body), sha256: sha(body) };
};
const require = createRequire(import.meta.url), packagePath = require.resolve('playwright/package.json'), corePath = require.resolve('playwright-core/package.json');
const browserTools = () => ({ playwright: inventory(path.dirname(packagePath)), core: inventory(path.dirname(corePath)) });
function sources() {
  const names = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT }).toString().split('\0');
  assert.equal(names.pop(), ''); assert.equal(new Set(names).size, names.length);
  assert(names.every(file => file && !/[\0\r\n\\]/.test(file) && !file.startsWith('/') && !file.split('/').some(v => v === '.' || v === '..')));
  return names.sort().map(file => ({ file, bytes: fs.statSync(path.join(ROOT, file)).size, sha256: sha(fs.readFileSync(path.join(ROOT, file))) }));
}
function dependencies(directory = path.join(ROOT, 'node_modules'), relative = '') {
  const rows = [];
  for (const name of fs.readdirSync(path.join(directory, relative)).sort()) {
    const file = relative ? relative + '/' + name : name, full = path.join(directory, file);
    if (file === '.vite') continue;
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) {
      const real = fs.realpathSync(full);
      if (!real.startsWith(directory + path.sep)) assert(['playwright', 'playwright-core'].includes(file) && real === path.dirname(require.resolve(file + '/package.json')), 'PITCH_SETUP_TOOL_LINK');
      rows.push({ file, link: fs.readlinkSync(full) });
    } else if (stat.isDirectory()) rows.push(...dependencies(directory, file));
    else { assert(stat.isFile()); rows.push({ file, bytes: stat.size, sha256: sha(fs.readFileSync(full)) }); }
  }
  return rows;
}
const inventories = () => ({ source: sources(), dependencies: dependencies(), fixture: inventory(DIST), site: inventory(SITE), fonts: inventory(CACHE), browserTools: browserTools() });
const before = inventories();
assert.equal(before.source.length, binding.trackedCount);
const beforeReceipt = save('inputs.before.json', before);
const executable = process.env.CHROME_PATH || pw.chromium.executablePath();
const tools = { node: process.version, nodeSha256: sha(fs.readFileSync(process.execPath)), playwright: JSON.parse(fs.readFileSync(packagePath)).version,
  playwrightPackageSha256: sha(fs.readFileSync(packagePath)), executable, executableSha256: sha(fs.readFileSync(executable)) };
assert.equal(tools.playwright, binding.playwrightVersion);
const specs = [328, 390, 1280].flatMap(width => [
  { id: width + '-light-full', width, height: width === 328 ? 515 : width === 390 ? 844 : 800, theme: 'light', reduced: false },
  { id: width + '-dark-reduced', width, height: width === 328 ? 515 : width === 390 ? 844 : 800, theme: 'dark', reduced: true },
]);
const port = Number(process.env.PITCH_FLIGHT_PORT || 4192);
assert(Number.isInteger(port) && port > 1024 && port < 65536);
const BASE = 'http://127.0.0.1:' + port;
const files = new Map(before.fixture.map(row => ['/' + row.file, row]));
const report = { version: 1, status: 'running', complete: false, applicationQualified: false, sourceHead: binding.sourceHead,
  bindingSha256: sha(bindingBody), before: beforeReceipt, tools, plannedContexts: 6, contexts: [], controls: [], errors: [],
  limits: ['Actual MiniPitch with MatchClock native rAF, plus actual generic component with a native supplied-clock binder.',
    'Isolated styled presentation fixture only, not a new generic production caller or the full career page.',
    'Fictional committed goal feeds. No simulation result, real player data, storage or reward is generated.',
    'Still comparison uses the existing reducedMotion prop to isolate build-only plan invalidation.',
    'PNG evidence requires independent visual review. Source and measurement success alone are not pixel admission.'] };
const idle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const read = page => page.evaluate(() => window.__PITCH_FLIGHT_FIXTURE__.read());
const button = (page, name) => page.getByRole('button', { name, exact: true });
function collect() {
  const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  const stage = document.querySelector('[data-fixture-stage]'), surface = stage?.querySelector('[data-cm-live-pitch]'), mini = stage?.querySelector('[data-mini-pitch]');
  const ball = surface?.querySelector('[data-cm-ball="1"]'), shadow = ball?.querySelector('.cm-live-ball-shadow'), air = ball?.querySelector('.cm-live-ball-air');
  const css = node => { const s = getComputedStyle(node); return { position: s.position, backgroundImage: s.backgroundImage, width: s.width, height: s.height,
    transform: s.transform, animationName: s.animationName, transitionProperty: s.transitionProperty, transitionDuration: s.transitionDuration }; };
  const visible = node => node.getClientRects().length && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden';
  const targets = [...document.querySelectorAll('button')].filter(visible).map(node => ({ text: node.textContent, rect: rect(node), disabled: node.disabled }));
  const field = mini ?? surface, b = ball ? rect(ball) : null, a = air ? rect(air) : null, s = shadow ? rect(shadow) : null;
  const directPlan = window.__PITCH_FLIGHT_FIXTURE__.read().comparison?.expected ?? null;
  const projected = point => {
    const probe = document.createElement('span');
    probe.style.left = (100 - point.y) + '%'; probe.style.top = point.x + '%';
    return { left: Number.parseFloat(probe.style.left), top: Number.parseFloat(probe.style.top) };
  };
  const planCss = directPlan ? { source: directPlan, ball: projected(directPlan.ball),
    figures: directPlan.figures.map(point => ({ side: point.side, ...projected(point) })) } : null;
  return { viewport: { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth, x: scrollX, y: scrollY },
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, light: document.documentElement.classList.contains('light'),
    fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces: [...document.fonts].map(f => ({ family: f.family, status: f.status })) },
    targets, field: field ? rect(field) : null, phase: mini?.getAttribute('data-pitch-phase') ?? surface?.getAttribute('data-cm-motion-phase'),
    goal: mini?.getAttribute('data-pitch-goal') ?? null, side: mini?.getAttribute('data-pitch-side') ?? null,
    orientation: surface?.getAttribute('data-pm-orient') ?? null, planCss,
    surface: surface ? css(surface) : null,
    ball: ball ? { rect: b, css: css(ball), lift: ball.getAttribute('data-cm-ball-lift'), left: Number.parseFloat(ball.style.left), top: Number.parseFloat(ball.style.top), children: ball.children.length } : null,
    shadow: shadow ? { rect: s, css: css(shadow) } : null, air: air ? { rect: a, css: css(air) } : null,
    shadowOffset: a && s ? { x: s.x + s.width / 2 - a.x - a.width / 2, y: s.y + s.height / 2 - a.y - a.height / 2 } : null,
    figures: [...(surface?.querySelectorAll('[data-pm-figure]') ?? [])].map(node => ({ side: node.getAttribute('data-pm-figure'), left: Number.parseFloat(node.style.left), top: Number.parseFloat(node.style.top) })),
    stageHtml: stage?.innerHTML ?? null, clockMinute: document.querySelector('[data-match-clock]')?.getAttribute('data-minute') ?? null,
    clockScore: document.querySelector('[data-match-clock]')?.getAttribute('data-score') ?? null };
}
function layout(s) {
  assert(s.viewport.documentWidth <= s.viewport.width + 1, 'PITCH_UI_NO_X_OVERFLOW');
  for (const t of s.targets) {
    assert(t.rect.width >= 44 && t.rect.height >= 44, 'PITCH_UI_TARGET_44');
    assert(t.rect.x >= -0.5 && t.rect.right <= s.viewport.width + 0.5, 'PITCH_UI_TARGET_NOT_X_CLIPPED');
  }
  assert(s.field && s.field.width > 100 && s.field.height > 100 && s.field.x >= -0.5 && s.field.right <= s.viewport.width + 0.5, 'PITCH_UI_STYLED_FIELD_BOUNDS');
  assert(s.surface.backgroundImage.includes('gradient') && s.ball.css.position === 'absolute', 'PITCH_UI_REAL_CSS');
  assert(s.ball.rect.width >= 6.5 && s.ball.rect.height >= 6.5, 'PITCH_UI_REAL_BALL_SIZE');
  checkFonts(s.fonts);
}
function unchanged(f) { assert.equal(f.inputsAfter, f.inputsBefore, 'PITCH_INPUTS_UNCHANGED'); assert(f.trusted.length && f.trusted.every(item => item.trusted), 'PITCH_TRUSTED_INPUT_ONLY'); }
function airborne(s) {
  assert.equal(s.phase, 'flight', 'PITCH_REAL_AIRBORNE_PHASE');
  assert(Number(s.ball.lift) > 0.5 && s.ball.children === 2, 'PITCH_REAL_AIRBORNE_LIFT');
  assert(s.air && s.shadow && s.air.css.transform !== 'none' && s.shadow.css.transform !== 'none', 'PITCH_REAL_STYLED_AIR_AND_SHADOW');
  assert(s.shadowOffset.x > 0.2 && s.shadowOffset.y > 0.3, 'PITCH_REAL_GROUND_SHADOW_SEPARATED');
}
function flat(s) {
  assert.equal(s.phase, 'net', 'PITCH_REAL_TERMINAL_NET');
  assert.equal(s.ball.lift, null, 'PITCH_TERMINAL_FLAT');
  assert.equal(s.ball.children, 0, 'PITCH_TERMINAL_FLAT');
  assert.equal(s.shadow, null, 'PITCH_TERMINAL_FLAT');
  assert.equal(s.air, null, 'PITCH_TERMINAL_FLAT');
}
function held(row) {
  assert.equal(row.after.stageHtml, row.before.stageHtml, 'PITCH_PAUSED_EXACT_DOM');
  assert.equal(row.after.clockMinute, row.before.clockMinute, 'PITCH_PAUSED_ACTUAL_CLOCK');
  assert(row.beforeState.paused && row.afterState.paused, 'PITCH_PAUSED_ACTUAL_HOST');
}
function exactPlan(record) {
  const actual = record.sample, expected = record.fixture.comparison.expected;
  const close = (a, b) => assert(Math.abs(a - b) <= 1e-10, 'PITCH_REAL_BUILD_SCENE_COORDINATE');
  assert.equal(actual.orientation, 'landscape');
  assert.deepEqual(actual.planCss.source, expected, 'PITCH_EXPECTED_PLAN_REFERENCE_MATCH');
  close(actual.ball.left, actual.planCss.ball.left); close(actual.ball.top, actual.planCss.ball.top);
  assert.equal(actual.figures.length, expected.figures.length);
  actual.figures.forEach((p, i) => { assert.equal(p.side, expected.figures[i].side); close(p.left, actual.planCss.figures[i].left); close(p.top, actual.planCss.figures[i].top); });
}
function changedBuild(record) {
  assert.equal(record.after.fixture.comparison.clock, record.before.fixture.comparison.clock, 'PITCH_BUILD_CLOCK_HELD');
  assert.equal(record.before.fixture.comparison.right, false); assert.equal(record.after.fixture.comparison.right, true);
  assert(Math.hypot(record.after.sample.ball.left - record.before.sample.ball.left, record.after.sample.ball.top - record.before.sample.ball.top) > 1, 'PITCH_BUILD_ONLY_VISIBLE_CHANGE');
  exactPlan(record.before); exactPlan(record.after);
}
function cleanNetwork(row) {
  assert.deepEqual(row.requestFailures, [], 'PITCH_NO_FAILED_REQUESTS');
  assert.deepEqual(row.blocked, [], 'PITCH_NO_UNKNOWN_NETWORK');
  assert.deepEqual(row.consoleMessages.filter(item => item.type === 'error'), [], 'PITCH_NO_CONSOLE_ERRORS');
}
let browser, server, timer;
const serverOut = fs.openSync(path.join(BROWSER, 'server.stdout'), 'wx'), serverErr = fs.openSync(path.join(BROWSER, 'server.stderr'), 'wx');
fs.writeFileSync(path.join(BROWSER, 'server.transport'), '', { flag: 'wx' });
async function snapshot(page, row, stage) {
  await idle(page);
  const sample = await page.evaluate(collect), fixture = await read(page), name = row.id + '-' + stage;
  await page.screenshot({ path: path.join(BROWSER, name + '.png') });
  const raw = save(name + '.json', { stage, sample, fixture });
  row.snapshots.push({ stage, raw, png: name + '.png' });
  layout(sample); unchanged(fixture);
  return { sample, fixture };
}
async function input(page, row, name) {
  const target = button(page, name);
  row.beforeInputs.push({ name, at: Date.now(), rect: await target.evaluate(node => node.getBoundingClientRect().toJSON()) });
  await target.click(); await idle(page);
}
async function load(page, theme) {
  await page.goto(BASE + '/pitchFlight.html?theme=' + theme, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__PITCH_FLIGHT_FIXTURE__?.read().mode === 'menu');
  await page.evaluate(async () => { await document.fonts.load('16px Inter'); await document.fonts.load('16px "Space Grotesk"'); await document.fonts.ready; });
}
try {
  timer = setTimeout(() => { report.errors.push('PITCH_BROWSER_INTERNAL_6_MINUTE_TIMEOUT'); void browser?.close(); }, 6 * 60 * 1000);
  server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(port)], { cwd: ROOT,
    env: { ...process.env, SIM_OFFLINE_RECEIPT: path.join(BROWSER, 'server.transport') }, stdio: ['ignore', serverOut, serverErr] });
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try { const response = await fetch(BASE + '/pitchFlight.html'); if (response.status === 200 && sha(Buffer.from(await response.arrayBuffer())) === files.get('/pitchFlight.html').sha256) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'PITCH_SETUP_SERVER_BODY');
  browser = await pw.chromium.launch({ executablePath: executable, headless: true, args: ['--no-sandbox'] });
  report.chromium = browser.version();
  for (const spec of specs) {
    const row = { ...spec, complete: false, requests: [], requestFailures: [], consoleMessages: [], blocked: [], errors: [], snapshots: [], beforeInputs: [], flights: [], pauses: [], terminal: [], comparisons: [] };
    report.contexts.push(row);
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, deviceScaleFactor: 1,
      hasTouch: spec.width < 600, isMobile: spec.width < 600, colorScheme: spec.theme, reducedMotion: spec.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block', locale: 'en-US' });
    const pending = new Set();
    await context.route('**/*', route => {
      const work = (async () => {
        const request = route.request(), url = new URL(request.url()), seen = { url: request.url(), method: request.method(), type: request.resourceType() };
        row.requests.push(seen);
        try {
          assert.equal(request.method(), 'GET'); assert.equal(request.postData(), null); assert(!url.username && !url.password && !url.hash);
          if (fonts.has(request.url())) {
            const font = fonts.get(request.url()); seen.font = { file: font.file, bytes: font.body.length, sha256: sha(font.body) };
            await route.fulfill({ status: 200, body: font.body, contentType: font.contentType, headers: { 'access-control-allow-origin': '*' } }); return;
          }
          assert.equal(url.origin, BASE, 'PITCH_TRANSPORT_LITERAL_LOOPBACK_ONLY');
          const physical = files.get(url.pathname); assert(physical, 'PITCH_TRANSPORT_EXACT_FIXTURE_FILE');
          if (url.pathname === '/pitchFlight.html') { assert.deepEqual([...url.searchParams.keys()], ['theme']); assert.equal(url.searchParams.get('theme'), spec.theme); }
          else assert.equal(url.search, '');
          const response = await route.fetch({ maxRedirects: 0, maxRetries: 0 });
          try {
            assert.equal(response.status(), 200); assert.equal(response.url(), request.url());
            const body = await response.body(); assert.equal(body.length, physical.bytes); assert.equal(sha(body), physical.sha256);
            seen.body = { file: physical.file, bytes: body.length, sha256: sha(body) }; await route.fulfill({ response, body });
          } finally { await response.dispose(); }
        } catch (error) { row.blocked.push({ ...seen, error: String(error) }); await route.abort('blockedbyclient'); }
      })();
      const tracked = work.catch(error => row.errors.push(String(error)));
      pending.add(tracked); void tracked.then(() => pending.delete(tracked)); return tracked;
    });
    try {
      const page = await context.newPage();
      page.on('pageerror', error => row.errors.push('pageerror: ' + error.message));
      page.on('console', message => row.consoleMessages.push({ type: message.type(), text: message.text(), location: message.location() }));
      page.on('requestfailed', request => row.requestFailures.push({ url: request.url(), method: request.method(), type: request.resourceType(), errorText: request.failure()?.errorText ?? null }));
      await load(page, spec.theme);
      for (const kind of ['mini', 'generic']) for (const side of ['home', 'away']) {
        const tag = kind + '-' + side;
        await input(page, row, (kind === 'mini' ? 'Mini ' : 'Generic ') + side + ' goal');
        await page.waitForFunction(() => !!document.querySelector('[data-fixture-stage] [data-cm-ball="1"]'));
        if (!spec.reduced) {
          await page.waitForFunction(() => {
            const field = document.querySelector('[data-fixture-stage]'), ball = field?.querySelector('[data-cm-ball-lift]');
            return (field?.querySelector('[data-mini-pitch]')?.getAttribute('data-pitch-phase') ?? field?.querySelector('[data-cm-live-pitch]')?.getAttribute('data-cm-motion-phase')) === 'flight'
              && Number(ball?.getAttribute('data-cm-ball-lift')) > 1;
          }, null, { polling: 'raf', timeout: 10000 });
          await input(page, row, 'Pause flight');
          const paused = await snapshot(page, row, tag + '-air-paused'); airborne(paused.sample); row.flights.push(paused);
          assert.equal(paused.fixture.paused, true);
          const pauseRecord = { before: paused.sample, beforeState: paused.fixture, after: null, afterState: null };
          await page.waitForTimeout(250);
          pauseRecord.after = await page.evaluate(collect); pauseRecord.afterState = await read(page);
          held(pauseRecord); row.pauses.push(pauseRecord);
          if (kind === 'mini') assert.equal(paused.sample.goal, '1|10|' + (side === 'home' ? 'us' : 'them') + '|0', 'PITCH_ACTUAL_MINI_GOAL_ID');
          await input(page, row, 'Resume flight');
          await page.waitForFunction(() => !window.__PITCH_FLIGHT_FIXTURE__.read().paused);
        }
        await page.waitForFunction(() => {
          const state = window.__PITCH_FLIGHT_FIXTURE__.read(), field = document.querySelector('[data-fixture-stage]'), mini = field?.querySelector('[data-mini-pitch]');
          const phase = mini?.getAttribute('data-pitch-phase') ?? field?.querySelector('[data-cm-live-pitch]')?.getAttribute('data-cm-motion-phase');
          return phase === 'net' && (state.mode === 'mini' ? !mini?.hasAttribute('data-pitch-live') : state.ended || state.reduced);
        }, null, { polling: 'raf', timeout: 10000 });
        const terminal = await snapshot(page, row, tag + '-terminal'); flat(terminal.sample); row.terminal.push(terminal);
        if (kind === 'mini') {
          assert.equal(terminal.sample.side, side === 'home' ? 'us' : 'them');
          assert.equal(terminal.sample.clockScore, side === 'home' ? '1-0' : '0-1', 'PITCH_ACTUAL_CLOCK_SCORE');
          if (spec.reduced) assert.equal(terminal.sample.clockMinute, '90', 'PITCH_REDUCED_REAL_HOST_INSTANT');
        } else {
          const net = terminal.fixture.moments.filter(item => item.moment === 'net');
          assert.equal(net.length, 1, 'PITCH_GENERIC_NET_CALLBACK_ONCE');
          assert.equal(net[0].side, side === 'home' ? 'me' : 'opp'); assert.equal(net[0].minute, 10);
        }
        if (spec.reduced) {
          const styles = terminal.sample.ball.css;
          assert.equal(styles.animationName, 'none', 'PITCH_REDUCED_NO_CSS_ANIMATION');
          assert(styles.transitionProperty === 'none' || styles.transitionDuration.split(',').every(value => parseFloat(value) === 0), 'PITCH_REDUCED_NO_CSS_TRANSITION');
        }
        await input(page, row, 'Back to fixtures');
      }
      await input(page, row, 'Still build comparison');
      const before = { sample: await page.evaluate(collect), fixture: await read(page) };
      save(spec.id + '-build-before-rerender.json', before);
      layout(before.sample); unchanged(before.fixture); exactPlan(before);
      await input(page, row, 'Change only build');
      const after = await snapshot(page, row, 'build-only-rerender');
      const comparison = { before, after }; changedBuild(comparison); row.comparisons.push(comparison);
      assert.equal(row.terminal.length, 4);
      assert.equal(row.flights.length, spec.reduced ? 0 : 4); assert.equal(row.pauses.length, spec.reduced ? 0 : 4);
      cleanNetwork(row); row.complete = true;
    } catch (error) { row.errors.push(String(error.stack || error)); }
    finally {
      await context.close(); await Promise.allSettled([...pending]);
      try { cleanNetwork(row); } catch (error) { row.errors.push(String(error.stack || error)); }
      save(spec.id + '.json', row);
    }
    assert(row.complete && row.errors.length === 0, 'PITCH_CONTEXT_COMPLETE_' + spec.id);
  }
  const first = report.contexts[0];
  const recipes = [
    ['flat-air-record', first.flights[0].sample, c => { c.ball.lift = null; }, airborne, 'PITCH_REAL_AIRBORNE_LIFT'],
    ['shadow-on-ball-record', first.flights[0].sample, c => { c.shadowOffset.y = 0; }, airborne, 'PITCH_REAL_GROUND_SHADOW_SEPARATED'],
    ['changed-paused-dom', first.pauses[0], c => { c.after.stageHtml += ' '; }, held, 'PITCH_PAUSED_EXACT_DOM'],
    ['terminal-still-airborne', first.terminal[0].sample, c => { c.ball.lift = '1'; }, flat, 'PITCH_TERMINAL_FLAT'],
    ['build-did-not-change', first.comparisons[0], c => { c.after.sample.ball = c.before.sample.ball; }, changedBuild, 'PITCH_BUILD_ONLY_VISIBLE_CHANGE'],
    ['wrong-build-scene-coordinate', first.comparisons[0], c => { c.after.sample.ball.left += 0.01; }, c => exactPlan(c.after), 'PITCH_REAL_BUILD_SCENE_COORDINATE'],
    ['wrong-reference-plan-source', first.comparisons[0], c => { c.after.sample.planCss.source.ball.x += 0.25; }, c => exactPlan(c.after), 'PITCH_EXPECTED_PLAN_REFERENCE_MATCH'],
    ['input-mutated-record', first.terminal[0].fixture, c => { c.inputsAfter += ' '; }, unchanged, 'PITCH_INPUTS_UNCHANGED'],
    ['short-control-record', first.terminal[0].sample, c => { c.targets[0].rect.height = 43; }, layout, 'PITCH_UI_TARGET_44'],
    ['unexpected-failed-request', first, c => { c.requestFailures.push({ url: BASE + '/unexpected.js', method: 'GET', type: 'script', errorText: 'net::ERR_FAILED' }); }, cleanNetwork, 'PITCH_NO_FAILED_REQUESTS'],
  ];
  for (const [id, actual, mutate, check, marker] of recipes) {
    const copy = JSON.parse(JSON.stringify(actual)), original = JSON.stringify(copy); mutate(copy);
    assert.notEqual(JSON.stringify(copy), original, 'PITCH_CONTROL_CHANGED_' + id);
    assert.throws(() => check(copy), error => String(error.message).includes(marker), 'PITCH_CONTROL_OWNED_' + id);
    report.controls.push({ id, changed: true, marker, passed: true, scope: 'copied actual browser measurements only' });
  }
  assert.equal(report.contexts.length, 6); assert(report.contexts.every(row => row.complete));
  assert.equal(report.controls.length, 10, 'PITCH_TEN_EFFECTIVE_RECORD_CONTROLS');
  assert.equal(report.contexts.reduce((n, row) => n + row.snapshots.length, 0), 42, 'PITCH_FORTY_TWO_PNG_RECORDS');
  report.status = 'PITCH_NATIVE_CLOCK_BROWSER_COMPLETE'; report.complete = true;
} catch (error) { report.errors.push(String(error.stack || error)); report.status = 'failed'; }
finally {
  clearTimeout(timer);
  try { if (browser) await browser.close(); } catch (error) { report.errors.push(String(error)); }
  if (server) {
    const running = () => server.exitCode === null && server.signalCode === null;
    let cleanupTimer;
    const exited = new Promise(resolve => {
      if (!running()) resolve({ code: server.exitCode, signal: server.signalCode });
      else server.once('exit', (code, signal) => resolve({ code, signal }));
    });
    const requested = running() ? server.kill('SIGTERM') : false;
    const outcome = await Promise.race([
      exited.then(actual => ({ deadlineReached: false, ...actual })),
      new Promise(resolve => { cleanupTimer = setTimeout(() => resolve({ deadlineReached: true }), 5000); }),
    ]);
    clearTimeout(cleanupTimer);
    const timedOut = outcome.deadlineReached && running();
    if (timedOut) { server.kill('SIGKILL'); report.errors.push('PITCH_SERVER_CLEANUP_TIMEOUT'); }
    report.serverShutdown = { requested, ...outcome, exitCode: server.exitCode, signalCode: server.signalCode, timedOut };
  }
  fs.closeSync(serverOut); fs.closeSync(serverErr);
  try {
    const after = inventories(); report.after = save('inputs.after.json', after);
    assert.deepEqual(after, before, 'PITCH_HOLDS_ALL_INPUTS');
    assert.equal(sha(fs.readFileSync(process.execPath)), tools.nodeSha256);
    assert.equal(sha(fs.readFileSync(packagePath)), tools.playwrightPackageSha256);
    assert.equal(sha(fs.readFileSync(executable)), tools.executableSha256);
    assert.equal(fs.statSync(receipt).size, 0, 'PITCH_HOLDS_EMPTY_DRIVER_TRANSPORT');
    const serverTransport = path.join(BROWSER, 'server.transport');
    assert(fs.existsSync(serverTransport) && fs.statSync(serverTransport).size === 0, 'PITCH_HOLDS_EMPTY_SERVER_TRANSPORT');
    report.holds = { unchanged: true };
  } catch (error) { report.errors.push(String(error.stack || error)); report.holds = { unchanged: false }; }
  report.complete = report.complete && report.errors.length === 0 && report.holds.unchanged;
  if (!report.complete) report.status = 'failed';
  save('report.json', report);
  fs.writeFileSync(path.join(BROWSER, 'evidence.sha256'), inventory(BROWSER).map(row => row.sha256 + '  ' + row.file).join('\n') + '\n', { flag: 'wx' });
}
console.log('Pitch native-clock styled fixture: ' + report.status + ', ' + report.contexts.filter(row => row.complete).length + '/6 contexts, ' + report.controls.length + '/10 copied-record controls.');
if (!report.complete) process.exitCode = 1;
