import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';
import { inventory, loadFonts, checkFonts, sha } from './siteMenuNavigationSupport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.CM_COACHED_OUT, SITE = process.env.CM_COACHED_SITE_DIST;
assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'CM_SETUP_OFFLINE_CI');
assert.equal(process.env.NODE_OPTIONS, '--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs'), 'CM_SETUP_EXACT_PRELOAD');
assert(OUT && path.isAbsolute(OUT) && path.resolve(OUT) !== ROOT && !path.resolve(OUT).startsWith(ROOT + path.sep), 'CM_SETUP_OUTSIDE_OUTPUT');
assert(SITE && path.isAbsolute(SITE), 'CM_SETUP_COMPLETED_SITE');
const DIST = path.join(OUT, 'fixture-dist'), BROWSER = path.join(OUT, 'browser');
assert(fs.statSync(SITE).isDirectory() && fs.statSync(DIST).isDirectory() && !fs.existsSync(BROWSER), 'CM_SETUP_FRESH_BROWSER');
const bindingFile = process.env.CM_COACHED_BINDING_FILE;
assert(bindingFile && path.isAbsolute(bindingFile), 'CM_SETUP_BINDING');
const bindingBody = fs.readFileSync(bindingFile), binding = JSON.parse(bindingBody);
assert.match(binding.sourceHead || '', /^[a-f0-9]{40}$/);
assert.equal(binding.sourceHead, process.env.GITHUB_SHA);
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim(), binding.sourceHead);
assert(Number.isSafeInteger(binding.trackedCount) && binding.trackedCount > 0);
const required = ['src/lib/clubManager.ts', 'src/lib/clubManagerTraitRuntime.ts', 'src/lib/clubManagerTraitEdits.ts',
  'src/lib/clubManagerTraits.ts', 'src/hooks/useClubManager.ts',
  'src/components/club-manager/CoachedStyleCard.tsx', 'src/components/club-manager/TrainingScreen.tsx',
  'src/components/club-manager/SquadScreen.tsx', 'src/components/club-manager/TacticsScreen.tsx',
  'src/pages/ClubManager.tsx', 'src/index.css', 'scripts/qa/fixtures/cmCoachedStyles.entry.tsx',
  'scripts/qa/fixtures/cmCoachedStyles.html', 'scripts/qa/fixtures/cmCoachedStyles.vite.mjs',
  'scripts/qa/playCmCoachedStyles.mjs', 'scripts/qa/siteMenuNavigationSupport.mjs',
  'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs',
  'src/lib/clubManagerUiInfo.ts',
  'src/components/club-manager/MatchPlansCard.tsx',
  'src/components/club-manager/AcademyScreen.tsx',
  'src/components/club-manager/LiveTacticsPanel.tsx',
  'scripts/simTacticsEngine.mjs',
  'src/test/academyFilters.test.tsx',
  'scripts/qa/managerMatchPlans1079.mjs'];
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
const port = Number(process.env.CM_COACHED_PORT || 4191);
assert(Number.isInteger(port) && port > 1024 && port < 65536);
const BASE = 'http://127.0.0.1:' + port;
const files = new Map(before.fixture.map(row => ['/' + row.file, row]));
const report = { version: 1, status: 'running', complete: false, applicationQualified: false, sourceHead: binding.sourceHead,
  bindingSha256: sha(bindingBody), before: beforeReceipt, tools, plannedContexts: 6, contexts: [], controls: [], errors: [],
  limits: ['Real hook/components/CSS in a declared isolated fixture, not the full Club Manager page.',
    'Prepared learned readout payload uses actual helper six times, not calendar-learning proof.',
    'Actual offline FlagImg fallback only. No flag artwork or backend/provider request forwarded.',
    'Viewport rectangles and PNGs precede subsequent input auto-scroll. No fit claim from classes.',
    'Provisional engine coefficients and season balance are not qualified by this fixture.'] };
const idle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const read = page => page.evaluate(() => window.__CM_COACHED_FIXTURE__.read());
const button = (page, name) => page.getByRole('button', { name, exact: true });
function collect() {
  const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  const visible = node => { const s = getComputedStyle(node); return s.display !== 'none' && s.visibility !== 'hidden' && node.getClientRects().length > 0; };
  const describe = node => {
    const r = rect(node), clippedBy = [];
    for (let p = node.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p), b = p.getBoundingClientRect();
      if (/auto|scroll|hidden|clip/.test(s.overflowX) && (r.x < b.x + p.clientLeft - 0.5 || r.right > b.x + p.clientLeft + p.clientWidth + 0.5)) clippedBy.push({ tag: p.tagName, overflowX: s.overflowX, rect: rect(p) });
    }
    return { tag: node.tagName, text: node.textContent?.trim(), label: node.getAttribute('aria-label'), rect: r, disabled: 'disabled' in node ? node.disabled : null,
      clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, clippedBy };
  };
  const newNodes = [...document.querySelectorAll('[data-cm-coached-card], [data-cm-coached-style], [data-cm-duty-coached-style], [data-cm-coached-active]')].filter(visible);
  const targets = [...document.querySelectorAll('[data-cm-coached-card] button, [data-cm-coached-card] select')].filter(visible);
  const lines = [];
  for (const owner of newNodes) {
    const walker = document.createTreeWalker(owner, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim() || !visible(node.parentElement)) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      for (const r of range.getClientRects()) lines.push({ text: node.textContent.trim(), x: r.x, right: r.right, y: r.y, bottom: r.bottom });
    }
  }
  const faces = [...document.fonts].map(face => ({ family: face.family, status: face.status }));
  return { viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY, documentWidth: document.documentElement.scrollWidth },
    theme: { light: document.documentElement.classList.contains('light'), reduced: matchMedia('(prefers-reduced-motion: reduce)').matches },
    fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces },
    active: document.activeElement ? { tag: document.activeElement.tagName, text: document.activeElement.textContent?.trim() } : null,
    nodes: newNodes.map(describe), targets: targets.map(describe), lines,
    saveText: document.querySelector('[data-cm-coached-card] [data-cm-coached-save]')?.textContent ?? null,
    aggregate: document.querySelector('[data-cm-coached-active]')?.getAttribute('data-cm-coached-active') ?? null,
    selected: [...document.querySelectorAll('[data-cm-duty-coached-style]')].map(node => ({ id: node.getAttribute('data-cm-duty-coached-style'),
      used: node.querySelector('[data-cm-coached-used]')?.getAttribute('data-cm-coached-used'), text: node.textContent })),
    learned: [...document.querySelectorAll('[data-cm-coached-style]')].map(node => ({ id: node.getAttribute('data-cm-coached-style'), text: node.textContent })) };
}
function layout(sample) {
  assert(sample.viewport.documentWidth <= sample.viewport.width + 1, 'CM_UI_NO_DOCUMENT_X_OVERFLOW');
  for (const item of sample.nodes) assert.deepEqual(item.clippedBy, [], 'CM_UI_NEW_READOUT_NO_X_CLIP');
  for (const target of sample.targets) assert(target.rect.width >= 44 && target.rect.height >= 44, 'CM_UI_NEW_TARGET_44');
  for (const line of sample.lines) assert(line.x >= -0.5 && line.right <= sample.viewport.width + 0.5, 'CM_UI_NEW_TEXT_IN_X_VIEWPORT');
  checkFonts(sample.fonts);
}
function course(s, id) { return s.courses.find(row => row.id === id)?.course ?? null; }
function checkFault(row) {
  const { before, after, id, kind } = row;
  assert(after.faults > before.faults, 'CM_UI_NATIVE_STORAGE_FAULT_FIRED');
  assert.equal(after.actions.at(-1)?.kind, kind); assert.equal(after.actions.at(-1)?.ok, false, 'CM_UI_REFUSED_ACTION');
  assert.equal(after.identity, before.identity, 'CM_UI_FAILED_SAVE_NO_PUBLISH');
  assert.equal(after.raw, before.raw, 'CM_UI_FAILED_SAVE_RAW_HELD');
  assert.deepEqual(course(after, id), course(before, id), 'CM_UI_FAILED_SAVE_COURSE_HELD');
  assert.equal(after.save, 'blocked', 'CM_UI_FAILED_SAVE_BLOCKED');
  assert.equal(row.sample.saveText, 'Not saved', 'CM_UI_FAILED_SAVE_HONEST_READOUT');
}
function checkReadout(row, healthy) {
  const { fixture: s, sample } = row, meta = s.meta;
  assert(meta && s.career && s.raw, 'CM_UI_REAL_SAVED_READOUT');
  assert.equal(sample.aggregate, String(s.expected.activeCount), 'CM_UI_REAL_EFFECTIVE_COUNT');
  const used = sample.selected.find(item => item.id === meta.id);
  assert(used, 'CM_UI_SELECTED_READOUT_PRESENT');
  const effective = s.effective.some(item => item.id === meta.id && item.slot === meta.index);
  assert.equal(effective, healthy, 'CM_UI_REAL_EFFECTIVE_REPLACEMENT');
  assert.equal(used.used, healthy ? '1' : '0', 'CM_UI_SELECTED_EFFECTIVE_SLOT');
  if (!healthy) assert(used.text.includes('This player is not in the current available XI for this slot.'), 'CM_UI_SELECTED_INACTIVE_EXPLANATION');
  else assert(s.expected.activeCount > 0, 'CM_UI_POSITIVE_ACTIVE_WITNESS');
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
  const sample = await page.evaluate(collect), fixture = await read(page);
  const name = row.id + '-' + stage;
  await page.screenshot({ path: path.join(BROWSER, name + '.png') });
  const raw = save(name + '.json', { stage, fixture, sample });
  row.snapshots.push({ stage, raw, png: name + '.png', sample });
  layout(sample);
  return { fixture, sample };
}
async function input(page, row, locator, action = () => locator.click()) {
  // Retain original geometry before Playwright may bring the actual target into view.
  row.beforeInputs.push({ sample: await page.evaluate(collect), target: await locator.evaluate(node => ({ tag: node.tagName, text: node.textContent, rect: node.getBoundingClientRect().toJSON() })) });
  await action(); await idle(page);
}
async function settle(page) {
  await page.waitForFunction(() => window.__CM_COACHED_FIXTURE__?.read().phase !== 'boot');
  if (await button(page, 'Resume actual saved career').count()) await button(page, 'Resume actual saved career').click();
  await page.waitForFunction(() => { const s = window.__CM_COACHED_FIXTURE__.read(); return s.phase === 'hub' && s.save === 'saved'; });
  await page.evaluate(async () => { await document.fonts.load('16px Inter'); await document.fonts.load('16px "Space Grotesk"'); await document.fonts.ready; });
  await idle(page);
}
async function selectCard(page, row, id) {
  await input(page, row, page.getByRole('button', { name: /Coached style/ }));
  const select = page.getByLabel('Player for coached style', { exact: true });
  await input(page, row, select, () => select.selectOption(id));
}
try {
  timer = setTimeout(() => { report.errors.push('CM_BROWSER_INTERNAL_8_MINUTE_TIMEOUT'); void browser?.close(); }, 8 * 60 * 1000);
  server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(port)], { cwd: ROOT,
    env: { ...process.env, SIM_OFFLINE_RECEIPT: path.join(BROWSER, 'server.transport') }, stdio: ['ignore', serverOut, serverErr] });
  let ready = false;
  for (let i = 0; i < 40; i += 1) {
    try { const r = await fetch(BASE + '/cmCoachedStyles.html'); if (r.status === 200 && sha(Buffer.from(await r.arrayBuffer())) === files.get('/cmCoachedStyles.html').sha256) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'CM_SETUP_SERVER_BODY');
  browser = await pw.chromium.launch({ executablePath: executable, headless: true, args: ['--no-sandbox'] });
  report.chromium = browser.version();
  for (const spec of specs) {
    const row = { ...spec, complete: false, requests: [], flagFallbacks: [], requestFailures: [], consoleMessages: [], blocked: [], errors: [], snapshots: [], beforeInputs: [], faults: [], readouts: [] };
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
          if (url.pathname === '/cmCoachedStyles.html') {
            assert.deepEqual([...url.searchParams.keys()].sort(), ['case', 'theme']);
            assert(['actions', 'healthy', 'injury', 'suspension', 'duplicate'].includes(url.searchParams.get('case')));
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
      await page.goto(BASE + '/cmCoachedStyles.html?case=actions&theme=' + spec.theme, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__CM_COACHED_FIXTURE__?.read().phase === 'clubSelect');
      await input(page, row, button(page, 'Select real roster club'));
      await input(page, row, button(page, 'Confirm actual career'));
      await settle(page);
      const initial = await read(page);
      const player = initial.career.squad.find(p => p.position !== 'GK' && !p.onLoan && !p.retraining);
      assert(player, 'CM_UI_OWNED_ACTION_PLAYER');
      await selectCard(page, row, player.id);
      await snapshot(page, row, 'selected-with-instructions');
      const help = button(page, 'Coached style rules');
      assert.equal(await help.getAttribute('aria-expanded'), 'true', 'CM_UI_INSTRUCTIONS_FIRST_OPEN');
      await input(page, row, help); assert.equal(await help.getAttribute('aria-expanded'), 'false');
      await input(page, row, help); assert.equal(await help.getAttribute('aria-expanded'), 'true', 'CM_UI_HELP_REOPENS');
      await input(page, row, button(page, 'Start 6-week course'));
      const started = await snapshot(page, row, 'saved-start');
      assert.equal(course(started.fixture, player.id)?.weeksLeft, 6, 'CM_UI_START_ACTUAL_COURSE');
      assert.equal(started.fixture.save, 'saved'); assert.equal(started.sample.saveText, 'Saved');
      assert.deepEqual(JSON.parse(started.fixture.raw).squad.find(p => p.id === player.id).coachedStyleCourse, course(started.fixture, player.id), 'CM_UI_START_DISK_COURSE_EXACT');
      assert.notEqual(started.fixture.raw, initial.raw, 'CM_UI_START_ACTUAL_STORAGE_CHANGED');
      await input(page, row, button(page, 'Cancel course'));
      const cancelled = await snapshot(page, row, 'saved-cancel');
      assert.equal(course(cancelled.fixture, player.id), null, 'CM_UI_CANCEL_ACTUAL_COURSE');
      assert.equal(cancelled.fixture.save, 'saved');
      assert.equal(JSON.parse(cancelled.fixture.raw).squad.find(p => p.id === player.id).coachedStyleCourse, undefined, 'CM_UI_CANCEL_DISK_COURSE_REMOVED');
      for (const kind of ['start', 'cancel']) {
        if (kind === 'cancel') await input(page, row, button(page, 'Start 6-week course'));
        const beforeFault = await read(page);
        await input(page, row, button(page, 'Storage fault off'));
        await input(page, row, button(page, kind === 'start' ? 'Start 6-week course' : 'Cancel course'));
        const fault = await snapshot(page, row, 'blocked-' + kind);
        const record = { kind, id: player.id, before: beforeFault, after: fault.fixture, sample: fault.sample };
        checkFault(record); row.faults.push(record);
        assert(await button(page, kind === 'start' ? 'Start 6-week course' : 'Cancel course').isDisabled(), 'CM_UI_BLOCKED_ACTION_DISABLED');
        await input(page, row, button(page, 'Storage fault on'));
        const reload = button(page, 'Reload saved fixture');
        await input(page, row, reload, () => Promise.all([page.waitForEvent('load'), reload.click()]));
        await settle(page); await selectCard(page, row, player.id);
        if (kind === 'cancel') await input(page, row, button(page, 'Cancel course'));
      }
      for (const mode of ['healthy', 'injury', 'suspension', 'duplicate']) {
        await page.goto(BASE + '/cmCoachedStyles.html?case=' + mode + '&theme=' + spec.theme, { waitUntil: 'networkidle' });
        await settle(page);
        const s = await read(page); assert(s.meta);
        const sameRaw = s.raw, sameIdentity = s.identity;
        const duty = page.locator('[data-cm-duty="' + s.meta.index + '"]');
        await input(page, row, duty);
        const record = await snapshot(page, row, 'tactics-' + mode);
        checkReadout(record, mode === 'healthy'); row.readouts.push(record);
        if (mode === 'healthy') {
          await input(page, row, button(page, 'Squad'));
          const squadRow = page.locator('[data-cm-squad-row="' + s.meta.id.replace(/["\\]/g, '\\$&') + '"]');
          await input(page, row, squadRow.locator('button').first());
          const squad = await snapshot(page, row, 'squad-learned');
          assert(squad.sample.learned.some(item => item.id === s.meta.id && item.text.includes('Front-foot presser')), 'CM_UI_SQUAD_ACTUAL_LEARNED_STYLE');
          assert.equal(squad.fixture.raw, sameRaw, 'CM_UI_SCREEN_READS_DO_NOT_SAVE');
          assert.equal(squad.fixture.identity, sameIdentity, 'CM_UI_SAME_CAREER_ACROSS_SCREENS');
          await input(page, row, button(page, 'Training'));
          await selectCard(page, row, s.meta.id);
          const training = await snapshot(page, row, 'training-learned');
          assert.equal(training.fixture.raw, sameRaw); assert.equal(training.fixture.identity, sameIdentity);
          assert(training.sample.saveText === 'Saved', 'CM_UI_SAVED_READOUT_ALL_SCREENS');
        }
      }
      const end = await read(page);
      assert(end.trusted.length > 0 && end.trusted.every(event => event.trusted), 'CM_UI_REAL_TRUSTED_CLICKS');
      assert.deepEqual(row.blocked, [], 'CM_UI_NO_UNKNOWN_NETWORK');
      assert.deepEqual(row.errors, [], 'CM_UI_NO_BROWSER_ERRORS');
      assert.equal(row.faults.length, 2); assert.equal(row.readouts.length, 4); row.complete = true;
    } catch (error) { row.errors.push(String(error.stack || error)); }
    finally {
      await context.close(); await Promise.allSettled([...pending]);
      try { checkFlagFailures(row); } catch (error) { row.errors.push(String(error.stack || error)); }
      save(spec.id + '.json', row);
    }
    assert.deepEqual(row.blocked, [], 'CM_UI_NO_UNKNOWN_NETWORK_AFTER_CLOSE');
    assert(row.complete && row.errors.length === 0, 'CM_UI_CONTEXT_COMPLETE_' + spec.id);
  }
  const first = report.contexts[0];
  const recipes = [
    ['no-fault', first.faults[0], c => { c.after.faults = c.before.faults; }, checkFault, 'CM_UI_NATIVE_STORAGE_FAULT_FIRED'],
    ['published-failed', first.faults[0], c => { c.after.identity += 1; }, checkFault, 'CM_UI_FAILED_SAVE_NO_PUBLISH'],
    ['raw-overwritten', first.faults[1], c => { c.after.raw += ' '; }, checkFault, 'CM_UI_FAILED_SAVE_RAW_HELD'],
    ['false-saved', first.faults[0], c => { c.sample.saveText = 'Saved'; }, checkFault, 'CM_UI_FAILED_SAVE_HONEST_READOUT'],
    ['wrong-active-count', first.readouts[0], c => { c.sample.aggregate = String(c.fixture.expected.activeCount + 1); }, c => checkReadout(c, true), 'CM_UI_REAL_EFFECTIVE_COUNT'],
    ['injured-labelled-active', first.readouts[1], c => { c.sample.selected[0].used = '1'; }, c => checkReadout(c, false), 'CM_UI_SELECTED_EFFECTIVE_SLOT'],
    ['missing-inactive-reason', first.readouts[2], c => { c.sample.selected[0].text = 'Active'; }, c => checkReadout(c, false), 'CM_UI_SELECTED_INACTIVE_EXPLANATION'],
    ['short-new-target', first.snapshots[0].sample, c => { c.targets[0].rect.height = 43; }, layout, 'CM_UI_NEW_TARGET_44'],
    ['unexpected-failed-request', first, c => { c.requestFailures.push({ url: BASE + '/unexpected-failed.js', method: 'GET', type: 'script', errorText: 'net::ERR_FAILED' }); }, checkFlagFailures, 'CM_UI_FAILED_REQUESTS_ARE_EXACT_FLAGS'],
  ];
  for (const [id, actual, mutate, check, marker] of recipes) {
    const copy = JSON.parse(JSON.stringify(actual)), original = JSON.stringify(copy); mutate(copy);
    assert.notEqual(JSON.stringify(copy), original, 'CM_CONTROL_CHANGED_' + id);
    assert.throws(() => check(copy), error => String(error.message).includes(marker), 'CM_CONTROL_OWNED_' + id);
    report.controls.push({ id, changed: true, marker, passed: true, scope: 'copied actual browser data only' });
  }
  assert.equal(report.contexts.length, 6); assert(report.contexts.every(row => row.complete));
  assert.equal(report.controls.length, 9, 'CM_UI_NINE_EFFECTIVE_RECORD_CONTROLS');
  report.status = 'CM_COACHED_BROWSER_COMPLETE'; report.complete = true;
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
console.log('Coached-style styled fixture: ' + report.status + ', ' + report.contexts.filter(row => row.complete).length + '/6 contexts, ' + report.controls.length + '/9 copied-record controls.');
if (!report.complete) process.exitCode = 1;
