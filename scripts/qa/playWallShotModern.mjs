import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';
import { inventory, loadFonts, checkFonts, sha } from './siteMenuNavigationSupport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.WALL_SHOT_OUT, SITE = process.env.WALL_SHOT_SITE_DIST;
assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'SETUP: ordinary offline CI only');
assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'SETUP: inherited transport guard');
assert(OUT && path.isAbsolute(OUT) && !path.resolve(OUT).startsWith(ROOT + path.sep) && path.resolve(OUT) !== ROOT, 'SETUP: output outside checkout');
assert(SITE && path.isAbsolute(SITE), 'SETUP: completed site dist required');
const DIST = path.join(OUT, 'fixture-dist'), BROWSER = path.join(OUT, 'browser');
assert(fs.statSync(DIST).isDirectory() && fs.statSync(SITE).isDirectory() && !fs.existsSync(BROWSER), 'SETUP: complete builds and fresh browser output');
const bindingPath = process.env.WALL_SHOT_BINDING_FILE;
assert(bindingPath && path.isAbsolute(bindingPath), 'SETUP: actual binding file required');
const bindingBody = fs.readFileSync(bindingPath), binding = JSON.parse(bindingBody);
assert.match(binding.sourceHead || '', /^[a-f0-9]{40}$/);
assert.equal(binding.sourceHead, process.env.GITHUB_SHA, 'SETUP: actual job source');
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim(), binding.sourceHead);
assert(Number.isSafeInteger(binding.trackedCount) && binding.trackedCount > 0 && binding.pins && typeof binding.pins === 'object');
const required = ['src/lib/careerDrills.ts', 'src/components/soccer-career/DrillBoard.tsx', 'src/components/soccer-career/TrainingPanel.tsx',
  'src/index.css', 'src/hooks/useArcadeFlight.ts', 'src/hooks/useRevealScroll.ts', 'scripts/qa/fixtures/wallShotModern.entry.tsx',
  'scripts/qa/fixtures/wallShotModern.html', 'scripts/qa/fixtures/wallShotModern.vite.mjs', 'scripts/qa/playWallShotModern.mjs',
  'scripts/qa/siteMenuNavigationSupport.mjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs'];
for (const file of required) {
  assert.match(binding.pins[file] || '', /^[a-f0-9]{64}$/, 'SETUP: mandatory pin ' + file);
  assert.equal(sha(fs.readFileSync(path.join(ROOT, file))), binding.pins[file], 'SETUP: actual body ' + file);
}
const CACHE = process.env.FREE_KICK_FONT_CACHE;
assert(CACHE && path.isAbsolute(CACHE), 'SETUP: prefetched font cache');
const fonts = loadFonts(CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
fs.mkdirSync(BROWSER);
const fileReceipt = file => ({ file: path.relative(BROWSER, file).replaceAll(path.sep, '/'), bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file)) });
const save = (name, value) => { const file = path.join(BROWSER, name); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); return fileReceipt(file); };
const safe = s => typeof s === 'string' && s && !/[\0\r\n\\]/.test(s) && !s.startsWith('/') && !s.split('/').some(v => v === '.' || v === '..');
function sourceInventory() {
  const names = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT }).toString().split('\0');
  assert.equal(names.pop(), ''); assert.equal(new Set(names).size, names.length); assert(names.every(safe));
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
  if (!real.startsWith(directory + path.sep)) assert((file === 'playwright' || file === 'playwright-core') && real === path.dirname(require.resolve(file + '/package.json')), 'SETUP: only the two actually resolved external browser-tool links');
  rows.push({ file, link: fs.readlinkSync(full) });
  } else if (stat.isDirectory()) rows.push(...dependencies(directory, file));
  else { assert(stat.isFile()); rows.push({ file, bytes: stat.size, sha256: sha(fs.readFileSync(full)) }); }
  }
  return rows;
}
const require = createRequire(import.meta.url), packagePath = require.resolve('playwright/package.json'), corePackagePath = require.resolve('playwright-core/package.json');
const toolBodies = () => ({ playwright: inventory(path.dirname(packagePath)), core: inventory(path.dirname(corePackagePath)) });
const before = { source: sourceInventory(), dependencies: dependencies(), fixture: inventory(DIST), site: inventory(SITE), fonts: inventory(CACHE), browserTools: toolBodies() };
assert.equal(before.source.length, binding.trackedCount);
const beforeReceipt = save('input-inventories.before.json', before);
const version = JSON.parse(fs.readFileSync(packagePath)).version;
assert.equal(version, binding.playwrightVersion, 'SETUP: actual pinned Playwright');
const executable = process.env.CHROME_PATH || pw.chromium.executablePath();
const tools = { node: process.version, nodeSha256: sha(fs.readFileSync(process.execPath)), playwright: version,
  packageSha256: sha(fs.readFileSync(packagePath)), executable, executableSha256: sha(fs.readFileSync(executable)) };
const specs = [
  { id: '328-light-full', width: 328, height: 515, theme: 'light', reduced: false },
  { id: '328-dark-reduced', width: 328, height: 515, theme: 'dark', reduced: true },
  { id: '390-light-full', width: 390, height: 844, theme: 'light', reduced: false },
  { id: '390-dark-reduced', width: 390, height: 844, theme: 'dark', reduced: true },
  { id: '1280-light-full', width: 1280, height: 800, theme: 'light', reduced: false },
  { id: '1280-dark-reduced', width: 1280, height: 800, theme: 'dark', reduced: true },
];
const port = Number(process.env.WALL_SHOT_PORT || 4189);
assert(Number.isInteger(port) && port > 1024 && port < 65536);
const BASE = 'http://127.0.0.1:' + port, files = new Map(before.fixture.map(row => ['/' + row.file, row]));
const report = { version: 1, status: 'running', complete: false, applicationQualified: false,
  scope: 'Styled actual TrainingPanel/DrillBoard fixture only.',
  sourceHead: binding.sourceHead, bindingSHA256: sha(bindingBody), before: beforeReceipt, tools, contexts: [], controls: [], errors: [],
  limits: ['Declared fixture clock only; native Chromium inputs.',
  'Actual TrainingPanel dialog; no career-route or consent claim.',
  'Reduced contexts have no wall-plane animation.',
  'Point-contact model with real seeded shot spray; only the aim preview omits spray. No human-timing or device claim.',
  'Exact cached fonts, no backend/provider forwarding.'] };
let browser, server;
const serverOut = fs.openSync(path.join(BROWSER, 'server.stdout'), 'wx'), serverErr = fs.openSync(path.join(BROWSER, 'server.stderr'), 'wx');
const idle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)))));
const state = page => page.evaluate(() => window.__WALL_SHOT_FIXTURE__.read());
const advance = async (page, delta) => { await page.evaluate(n => window.__WALL_SHOT_FIXTURE__.advance(n), delta); await idle(page); };
const button = (page, name) => page.getByRole('button', { name, exact: true });
function collect() {
  const box = node => { if (!node) return null; const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  const svg = document.querySelector('[data-drill-board]'), wall = document.querySelector('[data-wall-shot-wall]');
  const ball = svg?.querySelector('[data-drill-ball]'), dialog = document.querySelector('[role="dialog"]');
  const posts = [...(svg?.querySelectorAll('line[stroke="white"][stroke-width="3.5"]') || [])].filter(n => n.getAttribute('x1') === n.getAttribute('x2')).map(n => Number(n.getAttribute('x1')));
  const visibility = node => {
  if (!node) return null;
  const r = node.getBoundingClientRect(), clip = { x: 0, y: 0, right: innerWidth, bottom: innerHeight };
  for (let p = node.parentElement; p; p = p.parentElement) {
  const s = getComputedStyle(p), b = p.getBoundingClientRect();
  if (/auto|scroll|hidden|clip/.test(s.overflowX)) { clip.x = Math.max(clip.x, b.x + p.clientLeft); clip.right = Math.min(clip.right, b.x + p.clientLeft + p.clientWidth); }
  if (/auto|scroll|hidden|clip/.test(s.overflowY)) { clip.y = Math.max(clip.y, b.y + p.clientTop); clip.bottom = Math.min(clip.bottom, b.y + p.clientTop + p.clientHeight); }
  }
  const panel = node.closest('[role="dialog"]'), header = panel?.firstElementChild;
  if (header && !header.contains(node) && getComputedStyle(header).position === 'sticky') clip.y = Math.max(clip.y, header.getBoundingClientRect().bottom);
  const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return { clip, fullyVisible: r.width > 0 && r.height > 0 && r.x >= clip.x && r.y >= clip.y && r.right <= clip.right && r.bottom <= clip.bottom,
  centerHit: !!hit && (node === hit || node.contains(hit)) };
  };
  const controls = [...document.querySelectorAll('button,input[type="range"]')].map(n => ({
  tag: n.tagName, name: n.getAttribute('aria-label') || n.textContent.trim(), rect: box(n), disabled: !!n.disabled,
  visible: getComputedStyle(n).visibility !== 'hidden' && getComputedStyle(n).display !== 'none', paint: visibility(n), value: n.value ?? null,
  }));
  const wrappers = [...document.querySelectorAll('[data-wall-defender]')];
  const faces = [...document.fonts].map(f => ({ family: f.family, status: f.status }));
  return { fixture: window.__WALL_SHOT_FIXTURE__.read(), width: innerWidth, height: innerHeight, scrollX, scrollY,
  documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth,
  svg: box(svg), svgPaint: visibility(svg), dialog: dialog ? { rect: box(dialog), scrollTop: dialog.scrollTop, scrollHeight: dialog.scrollHeight, clientHeight: dialog.clientHeight } : null,
  wall: wall ? { lo: Number(wall.getAttribute('data-wall-left')), hi: Number(wall.getAttribute('data-wall-right')), top: Number(wall.getAttribute('data-wall-top')),
  headY: Number(wall.getAttribute('data-wall-head-y')), baseY: wrappers[0]?.transform.baseVal.consolidate()?.matrix.f,
  defenders: wrappers.map(n => ({ rect: box(n), transform: n.getAttribute('transform') })),
  figures: wall.querySelectorAll('[data-drill-player="wall"]').length } : null,
  ball: ball ? { cx: Number(ball.getAttribute('cx')), cy: Number(ball.getAttribute('cy')), rect: box(ball), paint: visibility(ball) } : null,
  posts: posts.sort((a, b) => a - b), cue: document.querySelector('[data-wall-shot-cue]')?.getAttribute('data-wall-shot-cue') ?? null,
  text: document.getElementById('root').innerText, controls,
  fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces } };
}
async function snapshot(page, prefix) {
  await idle(page);
  const raw = await page.evaluate(collect);
  raw.json = save(prefix + '.json', raw);
  const file = path.join(BROWSER, prefix + '.png'); await page.screenshot({ path: file, fullPage: false, animations: 'allow' });
  raw.png = fileReceipt(file); return raw;
}
function checkLayout(raw) {
  assert.equal(raw.scrollX, 0, 'WALL_OVERFLOW: horizontal page offset');
  assert(raw.documentWidth <= raw.width && raw.bodyWidth <= raw.width, 'WALL_OVERFLOW: no horizontal overflow');
  assert(raw.svg && raw.svg.width > 0 && raw.svg.x >= 0 && raw.svg.right <= raw.width, 'WALL_LAYOUT: actual board horizontal bounds');
  const names = ['Wall Shot rules', 'Start', 'Next one', 'Shoot', 'How hard to hit it'];
  const controls = raw.controls.filter(n => names.includes(n.name) && n.visible && !n.disabled);
  for (const n of controls) {
  assert(n.rect.width >= 44 && n.rect.height >= 44, 'WALL_TARGET: actual modern target ' + n.name);
  assert(n.paint.fullyVisible && n.paint.centerHit, 'WALL_TARGET_CLIPPED_OR_COVERED: ' + n.name);
  }
  assert(raw.svgPaint.fullyVisible && raw.ball.paint.fullyVisible, 'WALL_BOARD_OR_BALL_CLIPPED');
  for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
  const a = controls[i].rect, b = controls[j].rect;
  assert(Math.min(a.right, b.right) - Math.max(a.x, b.x) <= 0.5 || Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) <= 0.5, 'WALL_TARGET: adjacent controls do not overlap');
  }
}
function checkFive(raw) {
  assert(raw.wall && raw.wall.figures === 5 && raw.wall.defenders.length === 5, 'WALL_FIVE_FIGURES');
  if (raw.fixture.mode === 'match') assert.deepEqual([raw.wall.lo, raw.wall.hi, raw.wall.top], [raw.fixture.geometry.lo, raw.fixture.geometry.hi, raw.fixture.geometry.top], 'WALL_GEOMETRY_FROM_ENGINE');
  else assert(raw.wall.lo >= -1 && raw.wall.hi <= 1 && Math.abs((raw.wall.hi - raw.wall.lo) * 7.32 / 2 - 2.5) < 1e-12, 'WALL_TRAINING_FINITE_SPAN');
}
function unchangedAttempts(beforeState, afterState, marker) {
  assert.equal(afterState.phase, 'playing', marker);
  assert.equal(afterState.calls.factories, beforeState.calls.factories, marker);
  assert.deepEqual(afterState.calls.draws, beforeState.calls.draws, marker);
  assert.deepEqual(afterState.calls.results, beforeState.calls.results, marker);
}
const tabTo = async (page, target) => {
  assert.equal(await target.count(), 1);
  for (let n = 0; n < 24; n++) {
  if (await target.evaluate(el => el === document.activeElement)) return;
  await page.keyboard.press('Tab');
  }
  throw new Error('WALL_FOCUS: native Tab did not reach target');
};
async function point(page, x, y, cancel = false, mouse = false) {
  const svg = page.locator('[data-drill-board]'), r = await svg.boundingBox(); assert(r);
  const p = { x: r.x + (60 + (x + 1) * 120) / 360 * r.width, y: r.y + (150 - y * 116) / 210 * r.height };
  if (mouse) { await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 0.1, p.y); await page.mouse.up(); }
  else {
  const cdp = await page.context().newCDPSession(page);
  try {
  const touch = { x: p.x, y: p.y, id: 1, radiusX: 1, radiusY: 1, force: 1 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...touch, x: p.x + 0.1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  } finally { await cdp.detach(); }
  }
  await idle(page);
}
function checkShot(shot, reduced) {
  checkFive(shot.aim); checkLayout(shot.aim);
  assert.equal(shot.release.phase, 'playing', 'WALL_RELEASE_NO_SHOT');
  assert.equal(shot.release.calls.factories, 0, 'WALL_RELEASE_NO_SHOT');
  assert.equal(shot.sliderAfter.calls.factories, 0, 'WALL_SLIDER_NOT_SHOT');
  assert.equal(shot.cancelAfter.calls.factories, 0, 'WALL_CANCEL_NOT_SHOT');
  const end = shot.end.fixture, result = end.calls.results;
  assert.equal(end.calls.factories, 1, 'WALL_ONE_SETTLE'); assert.equal(end.calls.draws.length, 4, 'WALL_FOUR_DRAWS'); assert.equal(result.length, 1, 'WALL_ONE_SETTLE');
  const { callback, replay, replayDraws } = result[0];
  assert.deepEqual(end.calls.draws, replayDraws, 'WALL_EXACT_OUTCOME_STREAM');
  assert.deepEqual(callback, { won: replay.won, points: replay.points, verdict: replay.verdict, input: callback.input }, 'WALL_CALLBACK_REPLAY');
  assert.equal(callback.input.length, 4); assert(callback.input.every(Number.isFinite));
  assert.equal(replay.hitWall, shot.route === 'central', 'WALL_ROUTE_COLLISION');
  assert.equal(shot.aim.cue, shot.route === 'central' ? 'wall' : 'clear', 'WALL_CUE_ROUTE');
  if (shot.route !== 'central') assert(replay.onTarget, 'WALL_ROUTE_REACHES_GOAL');
  if (!reduced) {
  assert.equal(shot.plane.fixture.phase, 'flying', 'WALL_ACTUAL_WALL_PLANE');
  const contact = replay.path[Math.round(replay.path.length * 0.45)], wall = shot.plane.wall;
  const expectedX = shot.plane.posts[0] + (contact.x + 1) / 2 * (shot.plane.posts[1] - shot.plane.posts[0]);
  const expectedY = wall.baseY - contact.y * (wall.baseY - wall.headY) / wall.top;
  assert(Math.abs(shot.plane.ball.cx - expectedX) <= 0.5 && Math.abs(shot.plane.ball.cy - expectedY) <= 0.5, 'WALL_PAINTED_CONTACT');
  if (shot.route === 'above') assert(shot.plane.ball.cy < wall.headY, 'WALL_PAINTED_ABOVE_HEADS');
  if (shot.route === 'left') assert(contact.x < wall.lo, 'WALL_PAINTED_LEFT_END');
  if (shot.route === 'right') assert(contact.x > wall.hi, 'WALL_PAINTED_RIGHT_END');
  } else assert.equal(shot.plane, null, 'WALL_REDUCED_NO_FAKE_FLIGHT');
  const trusted = end.events.filter(e => ['pointerdown', 'pointerup', 'pointercancel', 'keydown', 'click'].includes(e.type));
  assert(trusted.length > 0 && trusted.every(e => e.trusted), 'WALL_NATIVE_INPUTS');
  assert(end.events.some(e => e.type === 'pointercancel' && e.trusted), 'WALL_ACTUAL_POINTER_CANCEL');
  assert.deepEqual(end.local, { 'fixture-wall-local': 'unchanged' }, 'WALL_NO_STORAGE_WRITE');
  assert.deepEqual(end.session, { 'fixture-wall-session': 'unchanged' }, 'WALL_NO_STORAGE_WRITE');
  assert.deepEqual(end.calls.bank, []); assert.deepEqual(end.calls.complete, []); assert.equal(end.calls.back, 0);
}
async function openPage(context, spec, mode, row) {
  const page = await context.newPage();
  page.on('pageerror', error => row.errors.push('pageerror: ' + error.message));
  page.on('console', message => { if (message.type() === 'error') row.errors.push('console: ' + message.text()); });
  await page.goto(BASE + '/wallShotModern.html?mode=' + mode + '&theme=' + spec.theme, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { await document.fonts.load('16px Inter'); await document.fonts.load('16px "Space Grotesk"'); await document.fonts.ready; });
  checkFonts((await page.evaluate(collect)).fonts);
  return page;
}
try {
  fs.writeFileSync(path.join(BROWSER, 'server.transport'), '', { flag: 'wx' });
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', DIST, String(port)], { cwd: ROOT, env: { ...process.env, SIM_OFFLINE_RECEIPT: path.join(BROWSER, 'server.transport') }, stdio: ['ignore', serverOut, serverErr] });
  let ready = false;
  for (let n = 0; n < 40; n++) {
  try { const r = await fetch(BASE + '/wallShotModern.html'); if (r.status === 200 && sha(Buffer.from(await r.arrayBuffer())) === files.get('/wallShotModern.html').sha256) { ready = true; break; } } catch {}
  await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'SETUP: actual fixture server readiness and body');
  browser = await pw.chromium.launch({ executablePath: executable, headless: true, args: ['--no-sandbox'] });
  report.chromium = browser.version();
  for (const spec of specs) {
  const row = { ...spec, requests: [], blocked: [], errors: [], shots: [], training: {}, complete: false };
  report.contexts.push(row);
  const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, deviceScaleFactor: 1,
  hasTouch: true, isMobile: spec.width < 600, colorScheme: spec.theme, reducedMotion: spec.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block', locale: 'en-US' });
  const pending = new Set();
  await context.addInitScript(origin => { if (location.origin === origin) {
  localStorage.setItem('fixture-wall-local', 'unchanged'); sessionStorage.setItem('fixture-wall-session', 'unchanged');
  } }, BASE);
  await context.route('**/*', route => {
  const work = (async () => {
  const request = route.request(), url = new URL(request.url());
  const seen = { url: request.url(), method: request.method(), type: request.resourceType() }; row.requests.push(seen);
  try {
  assert.equal(request.method(), 'GET'); assert.equal(request.postData(), null);
  assert(!url.username && !url.password && !url.hash);
  if (fonts.has(request.url())) {
  const font = fonts.get(request.url()); seen.font = { file: font.file, bytes: font.body.length, sha256: sha(font.body) };
  await route.fulfill({ status: 200, body: font.body, contentType: font.contentType, headers: { 'access-control-allow-origin': '*' } }); return;
  }
  assert.equal(url.origin, BASE, 'WALL_TRANSPORT: unknown application/provider request');
  const physical = files.get(url.pathname); assert(physical, 'WALL_TRANSPORT: exact completed fixture member');
  if (url.pathname === '/wallShotModern.html') {
  assert.deepEqual([...url.searchParams.keys()].sort(), ['mode', 'theme']);
  assert(['training', 'match'].includes(url.searchParams.get('mode')) && url.searchParams.get('theme') === spec.theme);
  } else assert.equal(url.search, '');
  const response = await route.fetch({ maxRedirects: 0, maxRetries: 0 });
  try {
  assert.equal(response.status(), 200); assert.equal(response.url(), request.url());
  const body = await response.body(); assert.equal(body.length, physical.bytes); assert.equal(sha(body), physical.sha256);
  seen.body = { file: physical.file, bytes: body.length, sha256: sha(body) };
  await route.fulfill({ response, body });
  } finally { await response.dispose(); }
  } catch (error) { row.blocked.push({ ...seen, error: String(error) }); await route.abort('blockedbyclient'); }
  })();
  const tracked = work.catch(error => { row.errors.push('route: ' + String(error)); });
  pending.add(tracked); void tracked.then(() => pending.delete(tracked));
  return tracked;
  });
  try {
  const training = await openPage(context, spec, 'training', row);
  await training.getByRole('button', { name: /Wall Shot/ }).click();
  row.training.intro = await snapshot(training, spec.id + '-training-intro');
  assert(row.training.intro.text.includes('Five defenders') && !row.training.intro.text.includes('let go to shoot as the gap opens'), 'WALL_RULES_BEFORE_PLAY');
  await button(training, 'Practice').click();
  row.training.ready = await snapshot(training, spec.id + '-training-ready');
  try { checkLayout(row.training.ready); checkFive(row.training.ready); } catch (error) { row.errors.push('original ready layout: ' + String(error)); }
  await button(training, 'Wall Shot rules').click();
  assert((await training.locator('[aria-label="Wall Shot instructions"]').innerText()).includes('Release your aim, then press Shoot'), 'WALL_REOPEN_READY_RULES');
  await button(training, 'Wall Shot rules').click();
  row.training.beforeStart = await training.evaluate(collect);
  row.training.beforeStartReceipt = save(spec.id + '-training-before-start.json', row.training.beforeStart);
  assert(!row.training.ready.text.includes('let go to shoot as the gap opens'), 'WALL_READY_NO_STALE_RULES');
  await button(training, 'Start').click(); await advance(training, 0);
  row.training.playing = await snapshot(training, spec.id + '-training-playing');
  try {
  checkLayout(row.training.playing);
  assert(Math.abs(row.training.playing.svg.y - row.training.beforeStart.svg.y) <= 0.5 && Math.abs(row.training.playing.svg.x - row.training.beforeStart.svg.x) <= 0.5, 'WALL_PARENT_NO_START_JUMP');
  assert.equal(row.training.playing.scrollY, row.training.beforeStart.scrollY, 'WALL_PARENT_NO_PAGE_JUMP');
  assert.equal(row.training.playing.dialog.scrollTop, row.training.beforeStart.dialog.scrollTop, 'WALL_PARENT_NO_HIDDEN_SCROLL');
  } catch (error) { row.errors.push('actual start layout: ' + String(error)); }
  await button(training, 'Wall Shot rules').click(); assert(await training.locator('[aria-label="Wall Shot instructions"]').isVisible(), 'WALL_REOPEN_PLAYING_RULES');
  await button(training, 'Wall Shot rules').click();
  row.training.rules = await snapshot(training, spec.id + '-training-rules-reclosed');
  assert.equal(row.training.rules.fixture.phase, 'playing', 'WALL_HELP_NOT_A_SHOT');
  assert.deepEqual(row.training.rules.fixture.calls.bank, []); assert.deepEqual(row.training.rules.fixture.calls.complete, []);
  assert.deepEqual(row.training.rules.fixture.local, { 'fixture-wall-local': 'unchanged' });
  await training.close();
  for (const routeName of ['central', 'above', 'left', 'right']) {
  const page = await openPage(context, spec, 'match', row), prefix = spec.id + '-' + routeName;
  const shot = { route: routeName, ready: await snapshot(page, prefix + '-ready'), plane: null };
  row.shots.push(shot); checkLayout(shot.ready); checkFive(shot.ready);
  await button(page, 'Start').click(); await advance(page, 0);
  const start = await state(page), wall = start.geometry, centre = (wall.lo + wall.hi) / 2;
  await point(page, centre, 0.18, true);
  shot.cancelAfter = await state(page); unchangedAttempts(start, shot.cancelAfter, 'WALL_CANCEL_NOT_SHOT');
  await point(page, centre, 0.9);
  const slider = page.getByRole('slider', { name: 'How hard to hit it' });
  await tabTo(page, slider); await page.keyboard.press('Space');
  shot.sliderAfter = await state(page); unchangedAttempts(start, shot.sliderAfter, 'WALL_SLIDER_NOT_SHOT');
  await page.keyboard.press('Home'); await idle(page);
  assert.equal(await page.locator('[data-wall-shot-cue]').getAttribute('data-wall-shot-cue'), 'weak', 'WALL_POWER_CHANGES_CUE');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await idle(page); assert.equal(Number(await slider.inputValue()), 0.65, 'WALL_NATIVE_SLIDER_POWER');
  const x = routeName === 'left' ? wall.lo - 0.15 : routeName === 'right' ? wall.hi + 0.15 : centre;
  await point(page, x, routeName === 'above' ? 0.85 : 0.18, false, spec.width >= 600);
  if (routeName === 'above') {
  await page.keyboard.press('ArrowUp'); await idle(page);
  assert((await state(page)).events.some(e => e.type === 'keydown' && e.key === 'ArrowUp' && e.trusted && e.prevented), 'WALL_KEYBOARD_AIM');
  }
  shot.release = await state(page); unchangedAttempts(start, shot.release, 'WALL_RELEASE_NO_SHOT');
  shot.aim = await snapshot(page, prefix + '-aim');
  await button(page, 'Shoot').dblclick({ delay: 0 }); await idle(page);
  if (!spec.reduced) { await advance(page, 315); shot.plane = await snapshot(page, prefix + '-wall-plane'); await advance(page, 385); }
  shot.end = await snapshot(page, prefix + '-end');
  await advance(page, 60); assert.equal((await state(page)).calls.results.length, 1, 'WALL_NO_LATE_DOUBLE_SETTLE');
  checkShot(shot, spec.reduced);
  await page.close();
  }
  } catch (error) { row.errors.push(String(error.stack || error)); }
  finally { await context.close(); await Promise.allSettled([...pending]); }
  assert.deepEqual(row.blocked, [], 'WALL_TRANSPORT: no unknown or forwarded application requests');
  assert.deepEqual(row.errors, [], 'WALL_CONTEXT: actual browser/fixture failures');
  assert.equal(row.shots.length, 4); row.complete = true;
  row.raw = save(spec.id + '.json', row);
  }
  const full = report.contexts.find(c => !c.reduced).shots[0];
  const controls = [
  ['extra-figure', c => { c.aim.wall.figures += 1; }, 'WALL_FIVE_FIGURES'],
  ['release-shoots', c => { c.release.phase = 'flying'; }, 'WALL_RELEASE_NO_SHOT'],
  ['slider-shoots', c => { c.sliderAfter.calls.factories = 1; }, 'WALL_SLIDER_NOT_SHOT'],
  ['cancel-shoots', c => { c.cancelAfter.calls.factories = 1; }, 'WALL_CANCEL_NOT_SHOT'],
  ['duplicate-result', c => { c.end.fixture.calls.results.push(c.end.fixture.calls.results[0]); }, 'WALL_ONE_SETTLE'],
  ['false-cue', c => { c.aim.cue = 'clear'; }, 'WALL_CUE_ROUTE'],
  ['wrong-wall-plane', c => { c.plane.ball.cy += 10; }, 'WALL_PAINTED_CONTACT'],
  ['wrong-callback', c => { c.end.fixture.calls.results[0].callback.points += 1; }, 'WALL_CALLBACK_REPLAY'],
  ];
  for (const [id, mutate, marker] of controls) {
  const copy = JSON.parse(JSON.stringify(full)), old = JSON.stringify(copy); mutate(copy);
  assert.notEqual(JSON.stringify(copy), old, 'WALL_CONTROL: effective copied data ' + id);
  assert.throws(() => checkShot(copy, false), error => String(error.message).includes(marker), 'WALL_CONTROL: exact owned refusal ' + id);
  report.controls.push({ id, changed: true, marker, passed: true, scope: 'copied actual browser record only' });
  }
  assert.equal(report.contexts.length, 6); assert(report.contexts.every(c => c.complete));
  report.status = 'passed'; report.complete = true;
} catch (error) { report.errors.push(String(error.stack || error)); report.status = 'failed'; }
finally {
  try { if (browser) await browser.close(); } catch (error) { report.errors.push(String(error)); }
  if (server) { server.kill('SIGTERM'); await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve)); }
  fs.closeSync(serverOut); fs.closeSync(serverErr);
  try {
  const after = { source: sourceInventory(), dependencies: dependencies(), fixture: inventory(DIST), site: inventory(SITE), fonts: inventory(CACHE), browserTools: toolBodies() };
  report.after = save('input-inventories.after.json', after); assert.deepEqual(after, before, 'WALL_HOLDS: all source/dependencies/builds/cache unchanged');
  assert.equal(sha(fs.readFileSync(process.execPath)), tools.nodeSha256); assert.equal(sha(fs.readFileSync(packagePath)), tools.packageSha256);
  assert.equal(sha(fs.readFileSync(executable)), tools.executableSha256); report.inputHolds = true;
  const transport = path.join(BROWSER, 'server.transport');
  assert(fs.existsSync(transport) && fs.statSync(transport).size === 0, 'WALL_HOLDS: actual empty server transport receipt');
  } catch (error) { report.errors.push(String(error.stack || error)); report.inputHolds = false; }
  report.complete = report.complete && report.errors.length === 0 && report.inputHolds === true;
  if (!report.complete) report.status = 'failed';
  save('report.json', report);
  const members = inventory(BROWSER);
  fs.writeFileSync(path.join(BROWSER, 'evidence.sha256'), members.map(r => r.sha256 + '  ' + r.file).join('\n') + '\n', { flag: 'wx' });
}
console.log('Wall Shot styled fixture: ' + report.status + ', ' + report.contexts.filter(c => c.complete).length + '/6 contexts, ' + report.controls.length + '/8 copied-record controls.');
if (!report.complete) process.exitCode = 1;
