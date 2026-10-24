import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';
import { inventory, loadFonts, checkFonts, sha } from './siteMenuNavigationSupport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.CM_POSITION_OUT, SITE = process.env.CM_POSITION_SITE_DIST;
assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'CM_SETUP_OFFLINE_CI');
assert.equal(process.env.NODE_OPTIONS, '--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs'), 'CM_SETUP_EXACT_PRELOAD');
assert(OUT && path.isAbsolute(OUT) && path.resolve(OUT) !== ROOT && !path.resolve(OUT).startsWith(ROOT + path.sep), 'CM_SETUP_OUTSIDE_OUTPUT');
assert(SITE && path.isAbsolute(SITE), 'CM_SETUP_COMPLETED_SITE');
const DIST = path.join(OUT, 'fixture-dist'), BROWSER = path.join(OUT, 'browser');
assert(fs.statSync(SITE).isDirectory() && fs.statSync(DIST).isDirectory() && !fs.existsSync(BROWSER), 'CM_SETUP_FRESH_BROWSER');
const bindingFile = process.env.CM_POSITION_BINDING_FILE;
assert(bindingFile && path.isAbsolute(bindingFile), 'CM_SETUP_BINDING');
const bindingBody = fs.readFileSync(bindingFile), binding = JSON.parse(bindingBody);
assert.match(binding.sourceHead || '', /^[a-f0-9]{40}$/);
assert.equal(binding.sourceHead, process.env.GITHUB_SHA);
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim(), binding.sourceHead);
assert(Number.isSafeInteger(binding.trackedCount) && binding.trackedCount > 0);
const required = ['src/lib/clubManager.ts', 'src/lib/clubManagerPositions.ts', 'src/lib/clubManagerCalendar.ts',
  'src/hooks/useClubManager.ts', 'src/components/club-manager/TacticsScreen.tsx',
  'src/components/club-manager/LiveSimScreen.tsx', 'src/components/club-manager/LiveSimMotion.css',
  'src/components/club-manager/MatchPlansCard.tsx', 'src/pages/ClubManager.tsx', 'src/index.css',
  'scripts/qa/fixtures/cmPositions.entry.tsx', 'scripts/qa/fixtures/cmPositions.html',
  'scripts/qa/fixtures/cmPositions.vite.mjs', 'scripts/qa/playCmPositions.mjs',
  'scripts/qa/siteMenuNavigationSupport.mjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs'];
for (const file of required) {
  assert.match(binding.pins?.[file] || '', /^[a-f0-9]{64}$/, 'CM_SETUP_PIN_' + file);
  assert.equal(sha(fs.readFileSync(path.join(ROOT, file))), binding.pins[file], 'CM_SETUP_BODY_' + file);
}
const CACHE = process.env.FREE_KICK_FONT_CACHE;
assert(CACHE && path.isAbsolute(CACHE), 'CM_SETUP_FONT_CACHE');
const fonts = loadFonts(CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
const receipt = process.env.SIM_OFFLINE_RECEIPT;
assert(receipt && path.isAbsolute(receipt) && fs.existsSync(receipt) && fs.statSync(receipt).size === 0, 'CM_SETUP_EMPTY_TRANSPORT');
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
      if (!real.startsWith(directory + path.sep)) assert(['playwright', 'playwright-core'].includes(file) && real === path.dirname(require.resolve(file + '/package.json')), 'CM_SETUP_TOOL_LINK');
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
const port = Number(process.env.CM_POSITION_PORT || 4193);
assert(Number.isInteger(port) && port > 1024 && port < 65536);
const BASE = 'http://127.0.0.1:' + port;
const files = new Map(before.fixture.map(row => ['/' + row.file, row]));
const report = { version: 1, status: 'running', complete: false, applicationQualified: false,
  sourceHead: binding.sourceHead, bindingSha256: sha(bindingBody), before: beforeReceipt, tools,
  plannedContexts: 6, contexts: [], controls: [], errors: [],
  limits: ['Actual TacticsScreen/hook/writer/CSS, not the complete career page or its fixed live stage.',
    'The direct Tactics notice checks the hook payload. The separate actual LiveSimScreen branch measures its own fixed stage in all six contexts, not the production page mount.',
    'Native quota interception and declared seeded fixture preparation are disclosed. No engine/editor/hook is mocked.',
    'Pending publication is recorded by actual layout-effect reads. No artificial writer delay or mandatory painted pending frame.',
    'Deliberate target scrolling is recorded before input. No all-controls-on-one-phone-fold claim.',
    'Full joined-career route, full sims, bundle caps, original-engine parity and balance remain separate gates.'] };
const idle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const read = page => page.evaluate(() => window.__CM_POSITION_FIXTURE__.read());
const button = (page, name) => page.getByRole('button', { name, exact: true });
function collect() {
  const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  const visible = node => { const s = getComputedStyle(node); return s.display !== 'none' && s.visibility !== 'hidden' && node.getClientRects().length > 0; };
  const allButtons = [...document.querySelectorAll('button')];
  const mode = allButtons.find(node => node.textContent.trim() === 'Move players');
  const editor = mode?.parentElement?.parentElement;
  const targets = editor ? [...editor.querySelectorAll('button,select')].filter(visible) : [];
  const describe = node => {
    const box = rect(node), clippedBy = [];
    for (let p = node.parentElement; p; p = p.parentElement) {
      const style = getComputedStyle(p), b = p.getBoundingClientRect();
      if (/auto|scroll|hidden|clip/.test(style.overflowX) && (box.x < b.x + p.clientLeft - 0.5 || box.right > b.x + p.clientLeft + p.clientWidth + 0.5))
        clippedBy.push({ tag: p.tagName, rect: rect(p), scrollLeft: p.scrollLeft });
    }
    return { label: node.getAttribute('aria-label') ?? node.textContent.trim(), rect: box, clippedBy, disabled: !!node.disabled };
  };
  const stageBox = document.querySelector('[data-cm-live-stagebox]');
  const stageNotice = stageBox?.querySelector('[data-cm-live-position-notice]');
  const stage = stageBox ? { box: rect(stageBox), position: getComputedStyle(stageBox).position,
    notice: stageNotice ? rect(stageNotice) : null,
    strip: stageBox.querySelector('[data-cm-live-strip]') ? rect(stageBox.querySelector('[data-cm-live-strip]')) : null,
    pitch: stageBox.querySelector('.cm-pitchbox') ? rect(stageBox.querySelector('.cm-pitchbox')) : null,
    controls: stageBox.querySelector('.cm-controls') ? rect(stageBox.querySelector('.cm-controls')) : null,
    targets: [...stageBox.querySelectorAll('.cm-controls button')].filter(visible).map(describe),
    fragments: [] } : null;
  if (stageNotice) {
    const walker = document.createTreeWalker(stageNotice, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(walker.currentNode);
      for (const r of range.getClientRects()) {
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        stage.fragments.push({ x: r.x, y: r.y, right: r.right, bottom: r.bottom,
          painted: !!hit && (hit === stageNotice || stageNotice.contains(hit)) });
      }
    }
  }
  return { stage, viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY, documentWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight, clientHeight: document.documentElement.clientHeight,
      maxScrollY: Math.max(0, document.documentElement.scrollHeight - document.documentElement.clientHeight) },
    theme: { light: document.documentElement.classList.contains('light'), reduced: matchMedia('(prefers-reduced-motion: reduce)').matches },
    fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'),
      faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) },
    targets: targets.map(describe), pitch: document.querySelector('[data-cm-pitch]') ? rect(document.querySelector('[data-cm-pitch]')) : null,
    tokens: [...document.querySelectorAll('[data-cm-slot]')].map(node => ({ ...describe(node), index: Number(node.dataset.cmSlot), role: node.dataset.cmSlotLabel, id: node.dataset.cmPid })),
    alerts: [...document.querySelectorAll('[role=alert]')].filter(visible).map(node => node.textContent.trim()),
    notice: document.querySelector('[data-fixture-position-notice]')?.textContent ?? null,
    active: document.activeElement ? { tag: document.activeElement.tagName, slot: document.activeElement.getAttribute('data-cm-slot'), label: document.activeElement.getAttribute('aria-label') ?? document.activeElement.textContent.trim() } : null };
}
function layout(sample) {
  assert(sample.viewport.documentWidth <= sample.viewport.width + 1, 'CM_POSITION_NO_DOCUMENT_X_OVERFLOW');
  for (const target of sample.targets) {
    assert(target.rect.width >= 44 && target.rect.height >= 44, 'CM_POSITION_EDITOR_TARGET_44');
    assert.deepEqual(target.clippedBy, [], 'CM_POSITION_EDITOR_NO_X_CLIP');
  }
  if (!sample.stage) assert.equal(sample.tokens.length, 11, 'CM_POSITION_RENDERED_ELEVEN_SLOTS');
  checkFonts(sample.fonts);
}
function unchanged(record) {
  assert.equal(record.after.raw, record.before.raw, 'CM_POSITION_NEUTRAL_RAW_HELD');
  assert.equal(record.after.identity, record.before.identity, 'CM_POSITION_NEUTRAL_IDENTITY_HELD');
  assert.equal(record.after.draws, record.before.draws, 'CM_POSITION_EDIT_ZERO_RNG');
  assert.equal(record.after.actions.length, record.before.actions.length, 'CM_POSITION_NEUTRAL_NO_ACTION');
  assert.equal(record.after.writes.length, record.before.writes.length, 'CM_POSITION_NEUTRAL_NO_NATIVE_WRITE');
}
function publication(state) {
  const latest = state.transitions.filter(row => row.identity === state.identity).at(-1);
  assert(latest, 'CM_POSITION_ACTUAL_LAYOUT_PUBLICATION');
  assert.equal(latest.own, latest.rawOwn, 'CM_POSITION_DISK_BEFORE_PUBLICATION');
  assert.deepEqual(latest.shape, latest.rawShape, 'CM_POSITION_DISK_BEFORE_PUBLICATION');
  assert.equal(latest.formationIndex, latest.rawFormation, 'CM_POSITION_DISK_BEFORE_PUBLICATION');
}
function saved(record) {
  const { before: b, after: a } = record, action = a.actions.at(-1);
  assert(action?.ok, 'CM_POSITION_ACTUAL_WRITE_ACK');
  assert.notEqual(a.raw, b.raw, 'CM_POSITION_ACTUAL_RAW_CHANGED');
  assert.equal(a.draws, b.draws, 'CM_POSITION_EDIT_ZERO_RNG');
  assert.deepEqual(a.canonical, b.canonical, 'CM_POSITION_CANONICAL_ROLE_IDENTITY');
  assert.deepEqual(a.xiIds, b.xiIds, 'CM_POSITION_EDIT_PLAYER_IDS_HELD');
  assert.deepEqual(a.xiDuties, b.xiDuties, 'CM_POSITION_EDIT_DUTIES_HELD');
  assert.equal(a.own, action.points !== null, 'CM_POSITION_SUPPORTED_RESET_OR_POINTS');
  assert.deepEqual(a.shape?.points ?? null, action.points, 'CM_POSITION_WRITTEN_REQUEST_EXACT');
  assert.deepEqual(JSON.parse(a.raw).customShape ?? null, a.shape, 'CM_POSITION_NATIVE_RAW_POINTS_EXACT');
  publication(a);
}
function refused(record) {
  assert(record.after.faults > record.before.faults, 'CM_POSITION_NATIVE_QUOTA_FAULT_FIRED');
  assert.equal(record.after.actions.at(-1)?.ok, false, 'CM_POSITION_REFUSED_ACTION_FALSE');
  assert.equal(record.after.identity, record.before.identity, 'CM_POSITION_REFUSED_NO_PUBLICATION');
  assert.equal(record.after.raw, record.before.raw, 'CM_POSITION_REFUSED_RAW_HELD');
  assert.deepEqual(record.after.shape, record.before.shape, 'CM_POSITION_REFUSED_COMMITTED_SHAPE');
  assert.equal(record.after.draws, record.before.draws, 'CM_POSITION_EDIT_ZERO_RNG');
  assert(record.sample.alerts.some(text => text.includes('This position change was not saved.')), 'CM_POSITION_REFUSAL_VISIBLE_COPY');
}
function checkStage(record) {
  const s = record.sample, stage = s.stage;
  assert(stage && stage.notice && stage.strip && stage.pitch && stage.controls, 'CM_POSITION_REAL_STAGE_PARTS');
  assert.equal(stage.position, 'fixed', 'CM_POSITION_REAL_FIXED_STAGE_CSS');
  assert.match(record.fixture.positionNotice, /saved positioning data needs review/i, 'CM_POSITION_REAL_STAGE_HOOK_NOTICE');
  assert(stage.notice.y >= -0.5 && stage.notice.bottom <= s.viewport.height + 0.5, 'CM_POSITION_STAGE_NOTICE_IN_VIEW');
  assert(stage.notice.bottom <= stage.strip.y + 0.5 && stage.notice.bottom <= stage.controls.y + 0.5, 'CM_POSITION_STAGE_NOTICE_FLOW_NOT_OVERLAY');
  assert(stage.pitch.width > 0 && stage.pitch.height > 0, 'CM_POSITION_STAGE_PITCH_NOT_COLLAPSED');
  assert(stage.controls.y >= -0.5 && stage.controls.bottom <= s.viewport.height + 0.5, 'CM_POSITION_STAGE_CONTROLS_IN_VIEW');
  assert(stage.fragments.length > 0, 'CM_POSITION_STAGE_NOTICE_TEXT_FRAGMENTS');
  for (const line of stage.fragments) {
    assert(line.x >= -0.5 && line.y >= -0.5 && line.right <= s.viewport.width + 0.5 && line.bottom <= s.viewport.height + 0.5, 'CM_POSITION_STAGE_NOTICE_TEXT_IN_VIEW');
    assert(line.painted, 'CM_POSITION_STAGE_NOTICE_TEXT_UNOBSCURED');
  }
  for (const item of stage.targets) assert(item.rect.width >= 44 && item.rect.height >= 44, 'CM_POSITION_STAGE_CONTROL_44');
}
function steady(record) {
  for (const sample of [record.before, record.after]) {
    const p = sample.pitch;
    assert(p && p.width > 0 && p.height > 0 && p.x < sample.viewport.width && p.right > 0
      && p.y < sample.viewport.height && p.bottom > 0, 'CM_POSITION_EDIT_VISIBLE_PITCH_ANCHOR');
  }
  for (const key of ['x', 'y', 'width', 'height'])
    assert(Math.abs(record.after.pitch[key] - record.before.pitch[key]) <= 0.5, 'CM_POSITION_EDIT_NO_VISIBLE_JUMP');
  assert(Math.abs(record.after.viewport.scrollX - record.before.viewport.scrollX) <= 0.5, 'CM_POSITION_EDIT_HORIZONTAL_SCROLL_HELD');
}
function painted(target) {
  assert(target.rect.width >= 44 && target.rect.height >= 44, 'CM_POSITION_USED_TARGET_44');
  assert(target.rect.x >= 0 && target.rect.y >= 0 && target.rect.right <= target.viewport.width && target.rect.bottom <= target.viewport.height, 'CM_POSITION_USED_TARGET_IN_VIEW');
  assert(target.painted, 'CM_POSITION_USED_TARGET_PAINTED');
}
function checkFlagFailures(row) {
  const errorTexts = ['net::ERR_BLOCKED_BY_CLIENT', 'net::ERR_BLOCKED_BY_CLIENT.Inspector'];
  const consoleTexts = errorTexts.map(text => 'Failed to load resource: ' + text);
  const exactFlag = item => {
    const url = new URL(item.url);
    assert.equal(url.origin, 'https://flagcdn.com', 'CM_UI_FAILED_REQUESTS_ARE_EXACT_FLAGS');
    assert(!url.username && !url.password && !url.search && !url.hash, 'CM_UI_FAILED_REQUESTS_ARE_EXACT_FLAGS');
    assert(/^\/w(?:20|40|80|160|320)\/[a-z]{2}(?:-[a-z]+)?\.png$/.test(url.pathname), 'CM_UI_FAILED_REQUESTS_ARE_EXACT_FLAGS');
    assert.equal(item.method, 'GET', 'CM_UI_FAILED_REQUESTS_ARE_EXACT_FLAGS');
    assert.equal(item.type, 'image', 'CM_UI_FAILED_REQUESTS_ARE_EXACT_FLAGS');
  };
  row.flagFallbacks.forEach(exactFlag);
  row.requestFailures.forEach(item => {
    exactFlag(item);
    assert(errorTexts.includes(item.errorText), 'CM_UI_FAILED_REQUESTS_ARE_EXACT_FLAGS');
  });
  const requestKey = item => JSON.stringify([item.url, item.method, item.type]);
  assert.deepEqual(row.requestFailures.map(requestKey).sort(), row.flagFallbacks.map(requestKey).sort(), 'CM_UI_FAILED_REQUESTS_ARE_EXACT_FLAGS');
  const errors = row.consoleMessages.filter(item => item.type === 'error');
  for (const item of errors) {
    assert(consoleTexts.includes(item.text), 'CM_UI_ONLY_EXPECTED_FLAG_CONSOLE');
    assert.equal(typeof item.location.url, 'string', 'CM_UI_ONLY_EXPECTED_FLAG_CONSOLE');
  }
  assert.deepEqual(errors.map(item => item.location.url).sort(), row.flagFallbacks.map(item => item.url).sort(), 'CM_UI_ONLY_EXPECTED_FLAG_CONSOLE');
}
let browser, server, timer;
const serverOut = fs.openSync(path.join(BROWSER, 'server.stdout'), 'wx'), serverErr = fs.openSync(path.join(BROWSER, 'server.stderr'), 'wx');
fs.writeFileSync(path.join(BROWSER, 'server.transport'), '', { flag: 'wx' });
async function snapshot(page, row, stage) {
  await idle(page);
  const sample = await page.evaluate(collect), fixture = await read(page), name = row.id + '-' + stage;
  await page.screenshot({ path: path.join(BROWSER, name + '.png') });
  const raw = save(name + '.json', { stage, fixture, sample });
  row.snapshots.push({ stage, raw, png: name + '.png', sample });
  assert(fixture.events.length > 0 && fixture.events.every(event => event.trusted), 'CM_POSITION_NATIVE_TRUSTED_INPUT_EACH_SNAPSHOT');
  layout(sample);
  return { fixture, sample };
}
async function target(page, row, locator, require44 = true) {
  const beforeScroll = await page.evaluate(collect);
  await locator.scrollIntoViewIfNeeded(); await idle(page);
  const actual = await locator.evaluate(node => {
    const r = node.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { rect: { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom },
      viewport: { width: innerWidth, height: innerHeight }, painted: !!hit && (hit === node || node.contains(hit)) };
  });
  row.beforeInputs.push({ beforeScroll, afterScroll: await page.evaluate(collect), target: actual });
  if (require44) painted(actual); else assert(actual.painted, 'CM_POSITION_EXISTING_TARGET_PAINTED');
  return actual;
}
async function click(page, row, locator, require44 = true) { await target(page, row, locator, require44); await locator.click(); await idle(page); }
async function settle(page) {
  await page.waitForFunction(() => { const state = window.__CM_POSITION_FIXTURE__?.read(); return !!state && state.phase !== 'boot'; });
  if (await button(page, 'Resume actual saved career').count()) await button(page, 'Resume actual saved career').click();
  await page.waitForFunction(() => window.__CM_POSITION_FIXTURE__.read().phase === 'hub');
  await page.evaluate(async () => { await document.fonts.load('16px Inter'); await document.fonts.load('16px "Space Grotesk"'); await document.fonts.ready; });
  await idle(page);
}
async function enter(page, row) { await click(page, row, button(page, 'Move players')); }
async function keyMove(page, row, index, key) {
  const token = page.locator('[data-cm-slot="' + index + '"]');
  await target(page, row, token); await token.focus();
  assert(await token.evaluate(node => document.activeElement === node), 'CM_POSITION_NATIVE_KEY_FOCUS');
  const before = await read(page), scrollBefore = await page.evaluate(collect);
  await page.keyboard.press(key); await idle(page);
  const after = await read(page), sample = await page.evaluate(collect);
  assert(await token.evaluate(node => document.activeElement === node), 'CM_POSITION_NATIVE_KEY_FOCUS_HELD');
  row.steadyRecords.push({ before: scrollBefore, after: sample });
  steady(row.steadyRecords.at(-1));
  return { before, after, sample };
}
async function drag(page, row, cancel = false) {
  const token = page.locator('[data-cm-slot="0"]'), box = await target(page, row, token);
  const a = { x: box.rect.x + box.rect.width / 2, y: box.rect.y + box.rect.height / 2 };
  const b = { x: a.x + 12, y: a.y - 24 }, before = await read(page), scrollBefore = await page.evaluate(collect);
  assert(b.y >= 0 && b.x < row.width, 'CM_POSITION_NATIVE_DRAG_IN_VIEW');
  let cdp;
  if (row.width < 600 || cancel) {
    cdp = await page.context().newCDPSession(page);
    const touch = { ...a, id: 1, radiusX: 1, radiusY: 1, force: 1 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...touch, ...b }] });
  } else { await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 3 }); }
  try {
    await idle(page);
    const preview = await read(page), sample = await page.evaluate(collect);
    unchanged({ before, after: preview });
    const oldToken = scrollBefore.tokens[0].rect, newToken = sample.tokens[0].rect;
    assert(Math.hypot(newToken.x - oldToken.x, newToken.y - oldToken.y) > 1, 'CM_POSITION_ACTUAL_PREVIEW_MOVED');
    row.previews.push({ before, preview, beforeSample: scrollBefore, sample, cancel });
    if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
    else await page.mouse.up();
  } finally { if (cdp) await cdp.detach(); }
  await idle(page);
  const after = await read(page), sample = await page.evaluate(collect);
  row.steadyRecords.push({ before: scrollBefore, after: sample });
  steady(row.steadyRecords.at(-1));
  const record = { before, after, sample };
  if (cancel) unchanged(record);
  else {
    saved(record);
    assert.equal(after.actions.length, before.actions.length + 1, 'CM_POSITION_ONE_RELEASE_ONE_WRITE_ACTION');
    const oldPoint = before.shape?.points[0] ?? before.preset[0], point = after.shape.points[0];
    assert(point.x > oldPoint.x && point.y < oldPoint.y, 'CM_POSITION_NATIVE_KEEPER_DRAG_SAVED_DIRECTION');
  }
  return record;
}
async function actionsJourney(page, row) {
  await page.goto(BASE + '/cmPositions.html?case=actions&theme=' + row.theme, { waitUntil: 'networkidle' }); await settle(page);
  assert.equal(await button(page, 'Swap players').getAttribute('aria-pressed'), 'true', 'CM_POSITION_DEFAULT_SWAP_MODE');
  const initial = await read(page);
  await click(page, row, button(page, 'Position rules'));
  assert(await page.getByRole('region', { name: 'Position rules', exact: true }).isVisible(), 'CM_POSITION_REOPENABLE_INSTRUCTIONS');
  await click(page, row, button(page, 'Position rules')); await click(page, row, button(page, 'Position rules'));
  await enter(page, row);
  const options = await page.getByLabel('Position slot', { exact: true }).locator('option').allTextContents();
  assert.equal(options.length, 11, 'CM_POSITION_ALL_ELEVEN_OPTIONS');
  assert(options[0].includes(initial.canonical[0].label), 'CM_POSITION_ASSIGNED_KEEPER_REACHABLE');
  await snapshot(page, row, 'instructions');
  row.edits.push(await drag(page, row));
  const keyed = await keyMove(page, row, 1, 'ArrowRight'); saved(keyed); row.edits.push(keyed);
  assert.equal(keyed.after.shape.points[1].x, keyed.before.shape.points[1].x + 2, 'CM_POSITION_REAL_TWO_POINT_KEY');
  await snapshot(page, row, 'saved-pointer-and-keyboard');
  await click(page, row, button(page, 'Storage fault off'));
  const token = page.locator('[data-cm-slot="1"]'); await target(page, row, token); await token.focus();
  const beforeFault = await read(page);
  await page.keyboard.press('ArrowRight'); await idle(page);
  const failed = { before: beforeFault, after: await read(page), sample: await page.evaluate(collect) };
  refused(failed); row.faults.push(failed);
  await page.getByText('This position change was not saved. Your saved shape is still shown.', { exact: true }).scrollIntoViewIfNeeded();
  await snapshot(page, row, 'refused-native-write');
  await click(page, row, button(page, 'Storage fault on'));
  const retry = await keyMove(page, row, 1, 'ArrowRight'); saved(retry); row.edits.push(retry);
  assert.equal(retry.after.shape.points[1].x, beforeFault.shape.points[1].x + 2, 'CM_POSITION_ACTUAL_RETRY_CURRENT_POINTS');
  const beforeReset = await read(page); await click(page, row, button(page, 'Reset to preset'));
  const reset = { before: beforeReset, after: await read(page) }; saved(reset); row.edits.push(reset);
  assert.equal(reset.after.own, false, 'CM_POSITION_ACTUAL_RESET_DELETES_SUPPORTED_FIELD');
  await click(page, row, button(page, 'Move up'));
  const withShape = await read(page), next = withShape.formations.find(f => f.count === 11 && f.index !== withShape.formationIndex);
  assert(next, 'CM_POSITION_REAL_OTHER_FORMATION');
  await click(page, row, button(page, next.name), false);
  const formed = await read(page); assert.equal(formed.formationIndex, next.index, 'CM_POSITION_ACTUAL_PRESET_SWITCH');
  assert.equal(formed.own, false, 'CM_POSITION_PRESET_ATOMICALLY_CLEARS_POINTS'); publication(formed);
  await enter(page, row); await click(page, row, button(page, 'Move up'));
  await click(page, row, page.locator('[data-cm-tile-btn="plans"]'));
  assert(await page.locator('[data-cm-plan-save]').isDisabled(), 'CM_POSITION_CARD_CUSTOM_SAVE_DISABLED');
  assert((await page.locator('[data-cm-plan-custom-positions]').textContent()).includes('Applying a plan clears your custom positions.'), 'CM_POSITION_CARD_POLICY_VISIBLE');
  await click(page, row, button(page, 'Apply plan'));
  const applied = await read(page);
  assert.equal(applied.own, false, 'CM_POSITION_PLAN_APPLY_CLEARS_SUPPORTED_POINTS'); publication(applied);
  assert.equal(await page.locator('[data-cm-tile-btn="plans"]').getAttribute('aria-expanded'), 'true', 'CM_POSITION_PLAN_STAYS_OPEN_AFTER_APPLY');
  const name = page.getByRole('textbox', { name: 'Plan name', exact: true });
  assert(await name.isVisible(), 'CM_POSITION_PLAN_NAME_VISIBLE_AFTER_APPLY');
  await target(page, row, name); await name.fill('Browser preset');
  await click(page, row, page.locator('[data-cm-plan-save]'));
  const planned = await read(page);
  assert.equal(planned.actions.at(-1).ok, true, 'CM_POSITION_ORDINARY_PLAN_REAL_ACK');
  assert.equal(JSON.parse(planned.raw).matchPlans[0].name, 'Browser preset', 'CM_POSITION_ORDINARY_PLAN_NATIVE_WRITE');
  await snapshot(page, row, 'reset-preset-and-plan');
  if (row.id === specs[0].id) {
    const b = await read(page); await click(page, row, button(page, 'Write then reset in one turn')); const a = await read(page);
    assert.deepEqual(a.actions.slice(-2).map(item => [item.kind, item.ok]), [['same-turn-shape', true], ['same-turn-reset', true]], 'CM_POSITION_SAME_TURN_CURRENT_REF');
    assert.equal(a.actions.length, b.actions.length + 2); assert.equal(a.own, false); assert.equal(a.draws, b.draws); publication(a);
    await enter(page, row); row.neutral.push(await drag(page, row, true));
  }
  const rawBeforeReload = (await read(page)).raw, reload = button(page, 'Reload saved fixture'); await target(page, row, reload);
  await Promise.all([page.waitForEvent('load'), reload.click()]); await settle(page);
  assert.equal((await read(page)).raw, rawBeforeReload, 'CM_POSITION_ACTUAL_RELOAD_RAW_BYTES');
}
async function extraJourneys(page, row) {
  await page.goto(BASE + '/cmPositions.html?case=overlap&theme=' + row.theme, { waitUntil: 'networkidle' }); await settle(page); await enter(page, row);
  const select = page.getByLabel('Position slot', { exact: true });
  await target(page, row, select); await select.focus(); await page.keyboard.press('Home');
  for (let index = 0; index < 11; index++) {
    if (index) await page.keyboard.press('ArrowDown');
    assert.equal(await select.inputValue(), String(index), 'CM_POSITION_OVERLAP_NATIVE_SELECT_' + index);
    const before = await read(page); await click(page, row, button(page, 'Move up'));
    const after = await read(page); saved({ before, after });
    assert.deepEqual(after.shape.points[index], { x: 50, y: 48 }, 'CM_POSITION_OVERLAP_SELECTED_SLOT_ONLY_' + index);
    for (let i = 0; i < 11; i++) if (i !== index) assert.deepEqual(after.shape.points[i], before.shape.points[i], 'CM_POSITION_OVERLAP_OTHER_SLOT_HELD');
    await target(page, row, select); await select.focus();
  }
  await page.keyboard.press('Tab');
  assert(await button(page, 'Move up').evaluate(node => document.activeElement === node), 'CM_POSITION_NATIVE_TAB_TO_LABELLED_CONTROL');
  await snapshot(page, row, 'overlap-eleven-including-keeper');
  for (const mode of ['future', 'malformed']) {
    await page.goto(BASE + '/cmPositions.html?case=' + mode + '&theme=' + row.theme, { waitUntil: 'networkidle' }); await settle(page);
    const before = await read(page); assert.equal(before.shape, null, 'CM_POSITION_UNSUPPORTED_REAL_READER');
    assert(await button(page, 'Move players').isDisabled(), 'CM_POSITION_UNSUPPORTED_EDITOR_BLOCKED');
    await click(page, row, button(page, 'Position rules'));
    await click(page, row, page.locator('[data-cm-tile-btn="plans"]'));
    assert(await page.locator('[data-cm-plan-save]').isDisabled()); assert(await button(page, 'Apply plan').isDisabled());
    unchanged({ before, after: await read(page) });
    await snapshot(page, row, 'held-' + mode);
  }
  await page.goto(BASE + '/cmPositions.html?case=blocked&theme=' + row.theme, { waitUntil: 'networkidle' }); await settle(page);
  const before = await read(page); assert.equal(before.live.positionRules, 2, 'CM_POSITION_ACTUAL_FUTURE_LIVE_FIXTURE');
  assert(await button(page, 'Move players').isDisabled(), 'CM_POSITION_LIVE_EDITOR_BLOCKED');
  await click(page, row, button(page, 'Try actual Play')); await click(page, row, button(page, 'Try actual Calendar'));
  const after = await read(page); unchanged({ before, after });
  assert.equal(after.phase, before.phase, 'CM_POSITION_LIVE_REFUSAL_PHASE_HELD');
  assert.match(after.positionNotice, /saved positioning data needs review/i, 'CM_POSITION_HOOK_REFUSAL_NOTICE');
  await page.locator('[data-fixture-position-notice]').scrollIntoViewIfNeeded();
  await snapshot(page, row, 'hook-notice-not-full-live-stage');
}
async function stageJourney(page, row) {
  await page.goto(BASE + '/cmPositions.html?case=stage&theme=' + row.theme, { waitUntil: 'networkidle' }); await settle(page);
  const before = await read(page);
  assert.equal(before.live.positionRules, 2, 'CM_POSITION_STAGE_ACTUAL_UNSUPPORTED_MARKER');
  await click(page, row, button(page, 'Open actual refused stage'));
  const after = await read(page);
  unchanged({ before, after });
  assert.equal(after.phase, before.phase, 'CM_POSITION_STAGE_REFUSAL_PHASE_HELD');
  row.stageRecord = await snapshot(page, row, 'actual-fixed-stage-notice');
  checkStage(row.stageRecord);
}
try {
  timer = setTimeout(() => { report.errors.push('CM_BROWSER_INTERNAL_8_MINUTE_TIMEOUT'); void browser?.close(); }, 8 * 60 * 1000);
  server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(port)], { cwd: ROOT,
    env: { ...process.env, SIM_OFFLINE_RECEIPT: path.join(BROWSER, 'server.transport') }, stdio: ['ignore', serverOut, serverErr] });
  let ready = false;
  for (let i = 0; i < 40; i += 1) {
    try { const r = await fetch(BASE + '/cmPositions.html'); if (r.status === 200 && sha(Buffer.from(await r.arrayBuffer())) === files.get('/cmPositions.html').sha256) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'CM_SETUP_SERVER_BODY');
  browser = await pw.chromium.launch({ executablePath: executable, headless: true, args: ['--no-sandbox'] });
  report.chromium = browser.version();
  for (const spec of specs) {
    const row = { ...spec, complete: false, requests: [], flagFallbacks: [], requestFailures: [], consoleMessages: [], blocked: [], errors: [], snapshots: [], beforeInputs: [], faults: [], edits: [], previews: [], neutral: [], steadyRecords: [], stageRecord: null };
    report.contexts.push(row);
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, deviceScaleFactor: 1,
      hasTouch: spec.width < 600, isMobile: spec.width < 600, colorScheme: spec.theme, reducedMotion: spec.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block', locale: 'en-US' });
    const pending = new Set();
    await context.route('**/*', route => {
      const work = (async () => {
        const request = route.request(), url = new URL(request.url());
        const seen = { url: request.url(), method: request.method(), type: request.resourceType() }; row.requests.push(seen);
        try {
          assert.equal(request.method(), 'GET'); assert.equal(request.postData(), null); assert(!url.username && !url.password && !url.hash);
          if (fonts.has(request.url())) {
            const font = fonts.get(request.url()); seen.font = { file: font.file, bytes: font.body.length, sha256: sha(font.body) };
            await route.fulfill({ status: 200, body: font.body, contentType: font.contentType, headers: { 'access-control-allow-origin': '*' } }); return;
          }
          if (url.origin === 'https://flagcdn.com' && /^\/w(?:20|40|80|160|320)\/[a-z]{2}(?:-[a-z]+)?\.png$/.test(url.pathname) && !url.search && request.resourceType() === 'image') {
            row.flagFallbacks.push(seen); await route.abort('blockedbyclient'); return;
          }
          assert.equal(url.origin, BASE, 'CM_TRANSPORT_UNKNOWN_OR_BACKEND');
          const physical = files.get(url.pathname); assert(physical, 'CM_TRANSPORT_EXACT_FIXTURE_FILE');
          if (url.pathname === '/cmPositions.html') {
            assert.deepEqual([...url.searchParams.keys()].sort(), ['case', 'theme']);
            assert(['actions', 'overlap', 'future', 'malformed', 'blocked', 'stage'].includes(url.searchParams.get('case')));
            assert.equal(url.searchParams.get('theme'), spec.theme);
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
      const tracked = work.catch(error => row.errors.push(String(error)));
      pending.add(tracked); void tracked.then(() => pending.delete(tracked)); return tracked;
    });
    let page;
    try {
      page = await context.newPage();
      page.on('pageerror', error => row.errors.push('pageerror: ' + error.message));
      page.on('requestfailed', request => {
        row.requestFailures.push({ url: request.url(), method: request.method(), type: request.resourceType(), errorText: request.failure()?.errorText ?? null });
      });
      page.on('console', message => {
        const text = message.text(), type = message.type(), location = message.location();
        row.consoleMessages.push({ type, text, location });
        if (type === 'error' && !['Failed to load resource: net::ERR_BLOCKED_BY_CLIENT', 'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector'].includes(text)) row.errors.push('console: ' + text);
      });
      await actionsJourney(page, row);
      if (spec.id === specs[0].id) await extraJourneys(page, row);
      await stageJourney(page, row);
      const end = await read(page);
      assert(end.events.length > 0 && end.events.every(event => event.trusted), 'CM_POSITION_NATIVE_TRUSTED_INPUT');
      assert.deepEqual(row.blocked, [], 'CM_POSITION_NO_UNKNOWN_NETWORK');
      assert.deepEqual(row.errors, [], 'CM_POSITION_NO_BROWSER_ERRORS');
      assert.equal(row.faults.length, 1); assert.equal(row.edits.length, 4); row.complete = true;
    } catch (error) {
      row.errors.push(String(error.stack || error));
      row.failure = { status: 'UNKNOWN', raw: null, png: null };
      if (page && !page.isClosed()) {
        try {
          const sample = await page.evaluate(collect);
          let fixture = null, fixtureError = null;
          try { fixture = await read(page); } catch (readError) { fixtureError = String(readError.stack || readError); }
          const name = row.id + '-failed-current-state';
          await page.screenshot({ path: path.join(BROWSER, name + '.png') });
          row.failure.png = name + '.png';
          row.failure.raw = save(name + '.json', { stage: 'failed-current-state', fixture, fixtureError, sample });
          if (fixture !== null) row.failure.status = 'CAPTURED';
        } catch (captureError) { row.failure.captureError = String(captureError.stack || captureError); }
      }
    }
    finally {
      await context.close(); await Promise.allSettled([...pending]);
      try { checkFlagFailures(row); } catch (error) { row.errors.push(String(error.stack || error)); }
      save(spec.id + '.json', row);
    }
    assert.deepEqual(row.blocked, [], 'CM_POSITION_NO_UNKNOWN_NETWORK_AFTER_CLOSE');
    assert(row.complete && row.errors.length === 0, 'CM_POSITION_CONTEXT_COMPLETE_' + spec.id);
  }
  const first = report.contexts[0];
  const recipes = [
    ['failed-published', first.faults[0], c => { c.after.identity += 1; }, refused, 'CM_POSITION_REFUSED_NO_PUBLICATION'],
    ['failed-raw-overwritten', first.faults[0], c => { c.after.raw += ' '; }, refused, 'CM_POSITION_REFUSED_RAW_HELD'],
    ['no-native-fault', first.faults[0], c => { c.after.faults = c.before.faults; }, refused, 'CM_POSITION_NATIVE_QUOTA_FAULT_FIRED'],
    ['edit-rng-used', first.edits[0], c => { c.after.draws += 1; }, saved, 'CM_POSITION_EDIT_ZERO_RNG'],
    ['role-identity-changed', first.edits[0], c => { c.after.canonical[0].label += ' changed'; }, saved, 'CM_POSITION_CANONICAL_ROLE_IDENTITY'],
    ['disk-late-publication', first.edits[0].after, c => { c.transitions.at(-1).rawShape = null; }, publication, 'CM_POSITION_DISK_BEFORE_PUBLICATION'],
    ['hidden-used-target', first.beforeInputs[0].target, c => { c.painted = false; }, painted, 'CM_POSITION_USED_TARGET_PAINTED'],
    ['short-used-target', first.beforeInputs[0].target, c => { c.rect.height = 43; }, painted, 'CM_POSITION_USED_TARGET_44'],
    ['edit-scroll-jump', first.steadyRecords[0], c => { c.after.pitch.y += 2; }, steady, 'CM_POSITION_EDIT_NO_VISIBLE_JUMP'],
    ['obscured-stage-text', first.stageRecord, c => { c.sample.stage.fragments[0].painted = false; }, checkStage, 'CM_POSITION_STAGE_NOTICE_TEXT_UNOBSCURED'],
    ['unexpected-failed-request', first, c => { c.requestFailures.push({ url: BASE + '/unexpected.js', method: 'GET', type: 'script', errorText: 'net::ERR_FAILED' }); }, checkFlagFailures, 'CM_UI_FAILED_REQUESTS_ARE_EXACT_FLAGS'],
  ];
  for (const [id, actual, mutate, check, marker] of recipes) {
    const copy = JSON.parse(JSON.stringify(actual)), original = JSON.stringify(copy); mutate(copy);
    assert.notEqual(JSON.stringify(copy), original, 'CM_POSITION_CONTROL_CHANGED_' + id);
    assert.throws(() => check(copy), error => error instanceof assert.AssertionError && error.message.includes(marker), 'CM_POSITION_CONTROL_OWNED_' + id);
    report.controls.push({ id, changed: true, marker, passed: true, scope: 'copied actual browser records only' });
  }
  assert.equal(report.contexts.length, 6); assert(report.contexts.every(row => row.complete));
  assert.equal(report.controls.length, 11, 'CM_POSITION_ELEVEN_EFFECTIVE_RECORD_CONTROLS');
  report.status = 'CM_POSITION_BROWSER_COMPLETE'; report.complete = true;
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
    if (timedOut) { server.kill('SIGKILL'); report.errors.push('CM_SERVER_CLEANUP_TIMEOUT'); }
    report.serverShutdown = { requested, ...outcome, exitCode: server.exitCode, signalCode: server.signalCode, timedOut };
  }
  fs.closeSync(serverOut); fs.closeSync(serverErr);
  try {
    const after = inventories(); report.after = save('inputs.after.json', after);
    assert.deepEqual(after, before, 'CM_HOLDS_ALL_INPUTS');
    assert.equal(sha(fs.readFileSync(process.execPath)), tools.nodeSha256);
    assert.equal(sha(fs.readFileSync(packagePath)), tools.playwrightPackageSha256);
    assert.equal(sha(fs.readFileSync(executable)), tools.executableSha256);
    assert.equal(fs.statSync(receipt).size, 0, 'CM_HOLDS_EMPTY_DRIVER_TRANSPORT');
    const serverTransport = path.join(BROWSER, 'server.transport');
    assert(fs.existsSync(serverTransport) && fs.statSync(serverTransport).size === 0, 'CM_HOLDS_EMPTY_SERVER_TRANSPORT');
    report.holds = { unchanged: true };
  } catch (error) { report.errors.push(String(error.stack || error)); report.holds = { unchanged: false }; }
  report.complete = report.complete && report.errors.length === 0 && report.holds.unchanged;
  if (!report.complete) report.status = 'failed';
  save('report.json', report);
  fs.writeFileSync(path.join(BROWSER, 'evidence.sha256'), inventory(BROWSER).map(row => row.sha256 + '  ' + row.file).join('\n') + '\n', { flag: 'wx' });
}
console.log('Position editor styled fixture: ' + report.status + ', ' + report.contexts.filter(row => row.complete).length + '/6 contexts, ' + report.controls.length + '/11 copied-record controls.');
if (!report.complete) process.exitCode = 1;
