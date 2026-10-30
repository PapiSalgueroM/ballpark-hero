/* Remote real-UI qualification. Balance selection belongs to the separate frozen calibration gate. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';
import { mulberry } from '../lib/tycoonBots.mjs';
import { BACKEND, loadFonts, seed, sha, checkFonts, shellFixture } from './siteMenuNavigationSupport.mjs';

const MAIN = 'bd0c07bf72dc0214842202fe2f931b14c65d82dc';
const BASE = 'http://127.0.0.1:4173', ROUTE = '/stadium-tycoon', ROOT = process.cwd(), DIST = path.resolve('dist');
const OUT = process.env.STADIUM_BROWSER_OUT, MODE = process.env.STADIUM_BROWSER_MODE || 'normal';
const CLOCK = Date.parse('2026-10-29T18:00:00.000Z');
const NAMES = { protect: 'Protect the lead', balanced: 'Balanced', chase: 'Chase a goal' };
const PROFILES = [
  { id: '320-light', width: 320, height: 568, theme: 'light', choice: 'protect' },
  { id: '390-light', width: 390, height: 844, theme: 'light', choice: 'balanced' },
  { id: '390-dark', width: 390, height: 844, theme: 'dark', choice: 'chase' },
  { id: '1280-dark', width: 1280, height: 900, theme: 'dark', choice: 'protect' },
  { id: '390-reduced', width: 390, height: 844, theme: 'light', choice: 'chase', reduced: true },
];
const HELD = {
  'src/lib/stadiumTycoon.ts': process.env.STADIUM_ENGINE_SHA256,
  'src/hooks/useStadiumTycoon.ts': '8355bcd792186d8212fda1f8508458eedde1c5b018c14ee95674f895bb611b44',
  'src/pages/StadiumTycoon.tsx': 'c00a048e6d0dc2bfe538cf1ce9cf9c6fd7bf36af96087a37479b788748820780',
  'src/data/gameContent/stadiumManagement.ts': '549501b92e688bd0e1ee5f7bef0d27eb190d90a77664d5241112f9e62a6c2a97',
  'src/lib/completions.ts': 'be1c754df700ad104672c30ab2a4a42c146a4cfabc6f8c98dc2b9dc13b79b3b4',
  'scripts/lib/tycoonBots.mjs': 'c8355e28c950442debed80eeabf43dc55334960a8bf560a5b4c901db6671c95a',
  'scripts/qa/siteMenuNavigationSupport.mjs': 'c70e3ecc412f16d3322047b13205716c644495f8c74b76eed83852c87f35d303',
  'scripts/lib/playwrightLoader.mjs': '94a07179be7ca6b9562d118b52c2d5d0dff0b6b2e29e49e4fea16fa2defb5a93',
};
const SOURCES = [...Object.keys(HELD), 'src/components/tycoon/TycoonPitch.tsx', 'src/lib/season/law.ts', 'src/lib/leagueCore.ts', 'src/App.tsx', 'scripts/qa/playStadiumLatePlan.mjs'];
const pins = () => SOURCES.map(file => { const body = fs.readFileSync(file); return { path: file, bytes: body.length, sha256: sha(body), gitBlob: createHash('sha1').update(Buffer.from('blob ' + body.length + '\0')).update(body).digest('hex') }; });
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const own = (condition, marker) => assert(condition, 'STADIUM_PLAN_' + marker);
const near = (a, b) => Math.abs(a - b) <= .5;
const wall = ms => new Promise(resolve => setTimeout(resolve, ms));
assert(process.env.CI === 'true' && /^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || ''), 'REMOTE_ONLY');
assert.equal(process.env.EXPECTED_MAIN, MAIN);
assert(/^[a-f0-9]{40}$/.test(process.env.EXPECTED_PARENT || ''), 'EXACT_PARENT_REQUIRED');
assert(/^[a-f0-9]{64}$/.test(HELD['src/lib/stadiumTycoon.ts'] || ''), 'EXACT_ENGINE_SOURCE_PIN_REQUIRED');
assert(['normal', 'group-probe'].includes(MODE));
assert(OUT && path.isAbsolute(OUT) && !path.resolve(OUT).startsWith(ROOT + path.sep) && path.resolve(OUT) !== ROOT);
fs.mkdirSync(OUT, { recursive: true }); assert.equal(fs.readdirSync(OUT).length, 0);
const report = { schema: 1, status: 'NOT_QUALIFIED', mode: MODE, source: process.env.GITHUB_SHA, parent: process.env.EXPECTED_PARENT,
  mainAtPlan: MAIN, mainAtStart: process.env.ACTUAL_MAIN_AT_START, fixtureTime: CLOCK, scope: 'REAL_UI_ONLY_BALANCE_SELECTION_EXTERNAL',
  profiles: [], firstVisit: null, storageFault: null, probe: null, images: [], completionControls: [], featureFailures: [], methodFailures: [], sourceHeld: false, qualified: false };
let browser, T, fonts, before;
const contexts = [];

function checkWire(row) {
  assert(row.io.some(item => item.kind === 'prepared-font') && !row.io.some(item => item.kind === 'unknown-refused'), 'KNOWN_IO_ONLY');
  assert.equal(row.wire.pageErrors.length, 0); assert.equal(row.wire.sockets.length, 0);
  const aborted = row.io.filter(item => ['source-shell-backend-abort', 'stadium-completion-local-abort'].includes(item.kind));
  const allowed = new Set(['net::ERR_BLOCKED_BY_CLIENT', 'net::ERR_BLOCKED_BY_CLIENT.Inspector']);
  const known = item => aborted.some(request => request.url === item.url && request.method === item.method);
  for (const item of row.wire.failed) assert(allowed.has(item.error) && known(item), 'EXPLAINED_REQUEST_FAILURE');
  for (const item of row.wire.console.filter(item => item.type === 'error')) assert(row.wire.failed.some(request => allowed.has(request.error) && known(request) && request.url === item.url && item.text === 'Failed to load resource: ' + request.error), 'EXPLAINED_CONSOLE_ERROR');
}
function completionProblem(record) {
  let url; try { url = new URL(record.url); } catch { return 'STADIUM_COMPLETION_URL'; }
  if (url.origin !== BACKEND || url.pathname !== '/rest/v1/game_completions' || url.username || url.password || url.search || url.hash) return 'STADIUM_COMPLETION_URL';
  if (record.method !== 'POST' || record.type !== 'fetch') return 'STADIUM_COMPLETION_REQUEST';
  if (!record.body || typeof record.body !== 'object' || Array.isArray(record.body) || Object.keys(record.body).sort().join('|') !== 'game|player_name') return 'STADIUM_COMPLETION_SHAPE';
  if (record.body.game !== 'stadium-tycoon') return 'STADIUM_COMPLETION_GAME';
  if (!record.guest || record.guest.auth !== null || typeof record.guest.handle !== 'string' || !record.guest.handle.length) return 'STADIUM_COMPLETION_IDENTITY';
  if (record.body.player_name !== record.guest.handle) return 'STADIUM_COMPLETION_GUEST';
  return null;
}
function completionControls(actual) {
  assert.equal(actual.action, 'LOCAL_ABORT'); assert.equal(completionProblem(actual), null);
  assert.equal(sha(actual.rawBody), actual.bodySHA256); assert.deepEqual(JSON.parse(actual.rawBody), actual.body);
  const dir = path.join(OUT, 'completion-controls'); fs.mkdirSync(dir);
  const original = Buffer.from(JSON.stringify(actual, null, 2) + '\n'), working = path.join(dir, 'working.json');
  fs.writeFileSync(path.join(dir, 'original.json'), original, { flag: 'wx' }); fs.writeFileSync(working, original, { flag: 'wx' });
  for (const spec of [{ field: 'game', changed: 'not-stadium-tycoon', cause: 'STADIUM_COMPLETION_GAME' }, { field: 'player_name', changed: actual.guest.handle + '-wrong', cause: 'STADIUM_COMPLETION_GUEST' }]) {
    assert(fs.readFileSync(working).equals(original)); assert.equal(completionProblem(JSON.parse(fs.readFileSync(working))), null);
    const copy = JSON.parse(fs.readFileSync(working)), previous = copy.body[spec.field]; copy.body[spec.field] = spec.changed;
    const changed = Buffer.from(JSON.stringify(copy, null, 2) + '\n'); assert(!changed.equals(original));
    const onlyField = JSON.parse(changed); onlyField.body[spec.field] = previous; assert.deepEqual(onlyField, actual);
    let refused, restored;
    try {
      fs.writeFileSync(working, changed); assert(fs.readFileSync(working).equals(changed));
      fs.writeFileSync(path.join(dir, spec.field + '.changed.json'), fs.readFileSync(working), { flag: 'wx' });
      refused = completionProblem(JSON.parse(fs.readFileSync(working))); assert.equal(refused, spec.cause);
    } finally {
      fs.writeFileSync(working, original); const body = fs.readFileSync(working); assert(body.equals(original)); assert.equal(sha(body), sha(original));
      restored = completionProblem(JSON.parse(body)); assert.equal(restored, null);
      fs.writeFileSync(path.join(dir, spec.field + '.restored.json'), body, { flag: 'wx' });
    }
    report.completionControls.push({ id: spec.field, scope: 'CLASSIFIER_ONLY_ACTUAL_REQUEST_COPY_NO_HTTP_OR_GAMEPLAY_CREDIT', original: 'completion-controls/original.json', working: 'completion-controls/working.json', changed: 'completion-controls/' + spec.field + '.changed.json', restored: 'completion-controls/' + spec.field + '.restored.json', mutation: 'body.' + spec.field, previous, changedValue: spec.changed, cause: refused, changedBytes: true, onlyOneFieldChanged: true, originalSHA256: sha(original), changedSHA256: sha(changed), restoredSHA256: sha(fs.readFileSync(working)), sameWorkingCopyRestored: true, restoredProblem: restored });
  }
}
async function actualFonts(page) {
  await page.evaluate(async () => { await document.fonts.load('16px Inter'); await document.fonts.load('16px "Space Grotesk"'); await document.fonts.ready; });
}
async function click(page, locator) {
  assert.equal(await locator.count(), 1, 'ONE_ACTUAL_CLICK_OWNER');
  const wheel = [];
  for (let attempt = 0; attempt < 6; attempt++) {
    const box = await locator.boundingBox(); assert(box);
    const height = page.viewportSize().height; wheel.push({ attempt, box });
    if (box.y >= 0 && box.y + box.height <= height) break;
    assert(attempt < 5, 'NATIVE_WHEEL_CLICK_OWNER_VISIBLE');
    await page.mouse.move(page.viewportSize().width / 2, height / 2);
    await page.mouse.wheel(0, box.y - Math.max(8, (height - box.height) / 2)); await wall(100);
  }
  const box = await locator.boundingBox(); assert(box && box.width > 0 && box.height > 0);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  assert(await locator.evaluate((node, point) => { const hit = document.elementFromPoint(point.x, point.y); return !!hit && (hit === node || node.contains(hit)); }, point), 'NATIVE_CLICK_HIT_OWNER');
  await page.mouse.click(point.x, point.y);
  const trusted = await page.evaluate(() => window.__siteMenuTrusted?.at(-1));
  assert(trusted?.trusted, 'REAL_TRUSTED_CLICK');
  return { ...trusted, wheel };
}
async function rejectPrivacy(page, row) {
  const reject = page.getByRole('button', { name: 'Reject all', exact: true });
  if (await reject.count()) row.privacyReject = await click(page, reject);
  for (let attempt = 0; attempt < 20; attempt++) {
    const pending = await page.evaluate(() => ({ pending: document.body.dataset.consentPending || null, regions: document.querySelectorAll('[role="region"][aria-label="Cookie choices"]').length, stored: localStorage.getItem('cookie-consent-v2') }));
    if (!pending.pending && !pending.regions && pending.stored) { row.privacy = pending; return; }
    await wall(25);
  }
  assert.fail('PRIVACY_REJECT_NOT_SETTLED');
}
async function open(spec, raw, kind) {
  const row = { id: spec.id, kind, spec, io: [], wire: { pageErrors: [], console: [], failed: [], sockets: [] }, complete: false };
  const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, colorScheme: spec.theme, reducedMotion: spec.reduced ? 'reduce' : 'no-preference', deviceScaleFactor: 1, serviceWorkers: 'block' });
  contexts.push({ context, row });
  await context.addInitScript(seed, { theme: spec.theme, pending: true });
  await context.addInitScript(({ key, saved }) => {
    const pending = sessionStorage.getItem('stadium-late-plan-next-fixture');
    if (pending !== null) {
      localStorage.setItem(key, pending);
      sessionStorage.removeItem('stadium-late-plan-next-fixture');
    } else if (!sessionStorage.getItem('stadium-late-plan-proof-init')) {
      if (saved !== null) localStorage.setItem(key, saved);
      sessionStorage.setItem('stadium-late-plan-proof-init', '1');
    }
  }, { key: T.TYCOON_SAVE_KEY, saved: raw });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), item = { method: request.method(), url: request.url(), type: request.resourceType(), externalForwarded: false };
    try {
      assert(!url.username && !url.password && !url.hash);
      if (url.origin === BASE) {
        assert(['GET', 'HEAD'].includes(item.method) && request.postData() === null);
        const freshness = url.pathname === '/' && [...url.searchParams.keys()].join('|') === 'fresh' && /^\d+$/.test(url.searchParams.get('fresh'));
        assert(!url.search || freshness);
        const isRoute = ['/', ROUTE].includes(url.pathname), file = path.resolve(DIST, '.' + decodeURIComponent(url.pathname), isRoute ? 'index.html' : '');
        assert(file.startsWith(DIST + path.sep) && fs.statSync(file).isFile() && fs.realpathSync(file).startsWith(fs.realpathSync(DIST) + path.sep));
        row.io.push({ ...item, kind: 'completed-dist', file: path.relative(DIST, file), sha256: sha(fs.readFileSync(file)) }); return route.continue();
      }
      if (item.method === 'GET' && request.postData() === null && fonts.has(url.href) && ['font', 'stylesheet'].includes(item.type)) {
        const font = fonts.get(url.href); row.io.push({ ...item, kind: 'prepared-font', sha256: font.sha256 }); return route.fulfill({ status: 200, contentType: font.contentType, body: font.body, headers: { 'access-control-allow-origin': '*' } });
      }
      if (url.origin === BACKEND && url.pathname === '/rest/v1/game_completions') {
        const rawBody = request.postData(); assert(typeof rawBody === 'string' && rawBody.length > 0);
        const guest = await page.evaluate(() => ({ handle: localStorage.getItem('dukb-guest-handle'), auth: localStorage.getItem('sb-flawuiqbvjobmkfkauhw-auth-token') }));
        const actual = { ...item, kind: 'stadium-completion-local-abort', classifier: 'actual-unscored-stadium-completion', rawBody, body: JSON.parse(rawBody), bodySHA256: sha(rawBody), guest };
        assert.equal(completionProblem(actual), null); row.io.push(actual);
        await route.abort('blockedbyclient'); actual.action = 'LOCAL_ABORT';
        if (report.completionControls.length === 0) {
          try { completionControls(actual); } catch (error) { report.methodFailures.push({ scope: 'ACTUAL_COMPLETION_COPY_CONTROLS', message: String(error.stack || error) }); }
        }
        return;
      }
      const known = shellFixture(request, url);
      if (known) { row.io.push({ ...item, kind: 'source-shell-backend-abort', classifier: known.id }); return route.abort('blockedbyclient'); }
      throw new Error('UNKNOWN_REQUEST');
    } catch (error) { row.io.push({ ...item, kind: 'unknown-refused', error: error.message }); await route.abort('blockedbyclient'); }
  });
  await context.routeWebSocket('**/*', socket => { row.wire.sockets.push(socket.url()); socket.close({ code: 1008, reason: 'Offline qualification' }); });
  const page = await context.newPage();
  page.on('pageerror', error => row.wire.pageErrors.push(String(error)));
  page.on('console', message => row.wire.console.push({ type: message.type(), text: message.text(), url: message.location().url }));
  page.on('requestfailed', request => row.wire.failed.push({ url: request.url(), method: request.method(), error: request.failure()?.errorText || null }));
  await page.clock.install({ time: CLOCK - 60000 }); await page.clock.pauseAt(CLOCK); await page.clock.setFixedTime(CLOCK);
  await page.goto(BASE + ROUTE, { waitUntil: 'domcontentloaded' }); await page.clock.runFor(64);
  await page.getByRole('heading', { name: 'STADIUM TYCOON', exact: true }).waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('[data-tycoon-pitch]').waitFor({ state: 'visible', timeout: 10000 });
  await actualFonts(page);
  if (raw === null && kind === 'NORMAL_FIRST_VISIT_HELP') {
    const dialog = page.getByRole('dialog', { name: 'How Stadium Tycoon works', exact: true });
    row.initialRules = { count: await dialog.count() }; own(row.initialRules.count === 1, 'FIRST_VISIT_RULES_BEFORE_PLAY');
    row.initialRules.text = await dialog.innerText();
    own(row.initialRules.text.includes('leading 1-0 at 60 minutes') && row.initialRules.text.includes('Chase a goal raises both'), 'FIRST_VISIT_COST_EXAMPLE');
    row.initialRules.closed = await click(page, dialog.getByRole('button', { name: 'Close the rules', exact: true }));
  }
  await rejectPrivacy(page, row);
  row.healthyFoundation = true;
  return { context, page, row };
}
async function foundation(page, row) {
  const value = await page.evaluate(() => ({ href: location.href, dateNow: Date.now(), heading: [...document.querySelectorAll('h1')].map(node => node.textContent), pitchCount: document.querySelectorAll('[data-tycoon-pitch]').length,
    fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) } }));
  checkFonts(value.fonts); assert.equal(value.dateNow, CLOCK); assert.equal(new URL(value.href).pathname, ROUTE); assert.equal(value.pitchCount, 1);
  row.foundation = value;
  (row.foundationHistory ??= []).push(value);
  const count = await page.getByRole('group', { name: 'Late-match plan', exact: true }).count(); row.groupCount = count;
  assert.equal(count, 1, 'STADIUM_PLAN_ACCESSIBLE_GROUP');
}
async function bringCard(page) {
  const group = page.getByRole('group', { name: 'Late-match plan', exact: true });
  const trace = [];
  for (let attempt = 0; attempt < 6; attempt++) {
    const box = await group.boundingBox(); assert(box);
    const height = page.viewportSize().height; trace.push({ attempt, box });
    if (box.y >= 4 && box.y + box.height <= height - 4) return trace;
    assert(box.height < height - 8, 'CARD_FITS_VIEWPORT');
    await page.mouse.move(page.viewportSize().width / 2, height / 2);
    await page.mouse.wheel(0, box.y - Math.max(8, (height - box.height) / 2)); await wall(100);
  }
  assert.fail('NATIVE_WHEEL_CARD_NOT_VISIBLE');
}
async function sample(page) {
  return page.evaluate(key => {
    const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const group = document.querySelector('[role="group"][aria-label="Late-match plan"]');
    return { dateNow: Date.now(), performanceNow: performance.now(), scroll: { x: scrollX, y: scrollY }, rawSave: localStorage.getItem(key),
      overflow: { width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth },
      pitchText: document.querySelector('[data-tycoon-pitch]')?.textContent.trim(),
      group: group ? { rect: rect(group), text: group.textContent.trim(), status: group.querySelector('[role="status"],[role="alert"]')?.textContent,
        buttons: [...group.querySelectorAll('button')].map(node => { const r = rect(node), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2), range = document.createRange(); range.selectNodeContents(node); const text = range.getBoundingClientRect(); return { name: node.getAttribute('aria-label'), text: node.textContent.trim(), disabled: node.disabled, pressed: node.getAttribute('aria-pressed'), rect: r,
          hit: !!hit && (hit === node || node.contains(hit)), scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, textRect: { x: text.x, y: text.y, right: text.right, bottom: text.bottom }, color: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor }; }) } : null };
  }, T.TYCOON_SAVE_KEY);
}
function checkCard(value, enabled, selected = 'balanced') {
  own(value.group && value.group.buttons.length === 3, 'THREE_CONTROLS');
  assert.deepEqual(value.group.buttons.map(button => button.name), Object.values(NAMES));
  own(value.overflow.scroll <= value.overflow.width + 1, 'NO_DOCUMENT_OVERFLOW');
  for (const button of value.group.buttons) {
    own(button.disabled === !enabled, 'ELIGIBILITY_LOCK'); own(button.pressed === String(button.name === NAMES[selected]), 'SELECTED_CHOICE');
    own(button.rect.width >= 44 && button.rect.height >= 44 && button.hit, 'ACTUAL_TARGET_44');
    own(button.scrollWidth <= button.clientWidth + .5 && button.textRect.x >= button.rect.x - .5 && button.textRect.right <= button.rect.right + .5 && button.textRect.y >= button.rect.y - .5 && button.textRect.bottom <= button.rect.bottom + .5, 'WHOLE_CONTROL_TEXT');
  }
}
function metadataOnly(beforeRaw, afterRaw, choice) {
  const before = JSON.parse(beforeRaw), after = JSON.parse(afterRaw);
  const { matchPlan, ...rest } = after;
  assert.equal(before.matchPlan, undefined);
  assert.deepEqual(matchPlan, { rep: before.rep, match: before.totalMatches, choice }, 'STADIUM_PLAN_EXACT_RECORD');
  assert.deepEqual(rest, before, 'STADIUM_PLAN_NO_MONEY_TAPS_TIME_OR_OTHER_PROGRESS');
}
async function image(page, row, label) {
  const file = row.id + '-' + label + '.png'; await page.screenshot({ path: path.join(OUT, file), fullPage: false });
  const body = fs.readFileSync(path.join(OUT, file)); assert(body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
  const value = { file, normal: true, profile: row.id, bytes: body.length, sha256: sha(body), width: body.readUInt32BE(16), height: body.readUInt32BE(20) };
  assert.equal(value.width, row.spec.width); assert.equal(value.height, row.spec.height); report.images.push(value); return value;
}
async function help(page) {
  await click(page, page.getByRole('button', { name: 'How it works', exact: true }));
  const dialog = page.getByRole('dialog', { name: 'How Stadium Tycoon works', exact: true });
  assert.equal(await dialog.count(), 1); const text = await dialog.innerText();
  for (const part of ['Protect the lead lowers chances for both sides.', 'Chase a goal raises both, so your rival gets more chances too.', 'including after a reload', 'Doing nothing keeps Balanced.', 'leading 1-0 at 60 minutes', 'a clean sheet is never guaranteed']) own(text.includes(part), 'HELP_COST_AND_EXAMPLE');
  await click(page, dialog.getByRole('button', { name: 'Close the rules', exact: true })); return { text };
}

try {
  before = pins(); write('source-before.json', before);
  for (const row of before) if (HELD[row.path]) assert.equal(row.sha256, HELD[row.path], 'HELD_SOURCE:' + row.path);
  assert.equal(before.find(row => row.path === 'src/components/tycoon/TycoonPitch.tsx').gitBlob, '1ef131f61360f7da36e7c1befc18ad409194d8af');
  const bundle = path.join(OUT, 'actual-engine.mjs');
  const built = await build({ entryPoints: [path.join(ROOT, 'src/lib/stadiumTycoon.ts')], bundle: true, format: 'esm', platform: 'node', outfile: bundle, metafile: true, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
  write('engine-metafile.json', built.metafile); T = await import(pathToFileURL(bundle).href); assert.equal(T.TYCOON_SAVE_KEY, 'stadiumTycoonSaveV1');
  report.engineAuthority = { file: 'actual-engine.mjs', bytes: fs.statSync(bundle).size, sha256: sha(fs.readFileSync(bundle)), inputs: Object.keys(built.metafile.inputs).map(input => {
    const file = path.resolve(ROOT, input); assert(file.startsWith(ROOT + path.sep) && fs.statSync(file).isFile() && fs.realpathSync(file).startsWith(fs.realpathSync(ROOT) + path.sep));
    return { path: path.relative(ROOT, file), bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file)) };
  }) };
  write('engine-authority.json', report.engineAuthority);
  const fixtures = {};
  for (const minute of [59, 60]) {
    const state = T.newTycoon(CLOCK), events = [], rng = mulberry(8); let draws = 0;
    for (let index = 0; index < minute; index++) T.playMinute(state, () => { draws++; return rng(); }, events, { pay: true }, 0);
    assert.equal(draws, minute * 2); assert.equal(state.minute, minute); assert.equal(state.totalMatches, 0);
    const decoded = T.deserializeTycoon(T.serializeTycoon(state, CLOCK), CLOCK); assert(decoded);
    const raw = T.serializeTycoon(decoded, CLOCK); assert.deepEqual(T.deserializeTycoon(raw, CLOCK), decoded);
    fixtures[minute] = { state: decoded, raw, events, seed: 8, callerDraws: draws, rawSHA256: sha(raw) };
    write('actual-fixture' + minute + '.json', fixtures[minute]);
  }
  const manifestBody = fs.readFileSync(path.join(DIST, '.vite/manifest.json')), manifest = JSON.parse(manifestBody), entry = manifest['src/pages/StadiumTycoon.tsx'];
  assert(entry?.src === 'src/pages/StadiumTycoon.tsx' && entry.isDynamicEntry && /^assets\/[A-Za-z0-9._-]+\.js$/.test(entry.file));
  write('compiled-route-authority.json', { sourceSHA256: HELD['src/pages/StadiumTycoon.tsx'], manifestSHA256: sha(manifestBody), entry, compiledSHA256: sha(fs.readFileSync(path.join(DIST, entry.file))) });
  fonts = loadFonts(process.env.FREE_KICK_FONT_CACHE, process.env.FONT_CACHE_MANIFEST_SHA256); browser = await pw.chromium.launch({ headless: true });
  if (MODE === 'group-probe') {
    const current = await open(PROFILES[1], fixtures[60].raw, 'PHYSICAL_COMPILED_GROUP_PROBE'); report.probe = current.row;
    await foundation(current.page, current.row); current.row.complete = true; checkWire(current.row); report.status = 'HEALTHY_GROUP_PROBE';
  } else {
    for (const spec of PROFILES) {
      const current = await open(spec, fixtures[59].raw, 'NORMAL_REAL_SAVED_FIXTURES'); const { page, row } = current; report.profiles.push(row);
      await foundation(page, row); row.wheel59 = await bringCard(page); row.before59 = await sample(page); checkCard(row.before59, false);
      own(row.before59.rawSave === fixtures[59].raw && row.before59.pitchText.includes("59'"), 'REAL_FIXTURE59');
      row.unlockTrace = [];
      for (let step = 0; step < 12; step++) { await page.clock.runFor(200); const value = await sample(page); row.unlockTrace.push({ step, performanceNow: value.performanceNow, pitchText: value.pitchText, disabled: value.group.buttons.map(button => button.disabled) }); if (value.group.buttons.every(button => !button.disabled)) { row.after60 = value; break; } }
      own(row.after60, 'NATURAL_MINUTE60_UNLOCK'); checkCard(row.after60, true);
      for (const key of ['x', 'y', 'width', 'height']) own(near(row.before59.group.rect[key], row.after60.group.rect[key]), 'STABLE_RESERVED_GROUP');
      own(near(row.before59.scroll.x, row.after60.scroll.x) && near(row.before59.scroll.y, row.after60.scroll.y), 'NO_UNLOCK_SCROLL');
      row.unlockedImage = await image(page, row, 'unlocked60');
      await page.evaluate(raw => sessionStorage.setItem('stadium-late-plan-next-fixture', raw), fixtures[60].raw);
      row.fixtureReset = { protocol: 'ACTUAL_ENGINE_SERIALIZER_BYTES_APPLIED_AT_NEW_DOCUMENT_INIT_AFTER_OLD_PAGEHIDE', rawSHA256: fixtures[60].rawSHA256 };
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.clock.runFor(64);
      await page.getByRole('heading', { name: 'STADIUM TYCOON', exact: true }).waitFor(); await actualFonts(page); await foundation(page, row);
      row.wheel60 = await bringCard(page); row.beforeCommit = await sample(page); checkCard(row.beforeCommit, true); own(row.beforeCommit.rawSave === fixtures[60].raw, 'FROZEN_FIXTURE60');
      row.choiceClick = await click(page, page.getByRole('group', { name: 'Late-match plan', exact: true }).getByRole('button', { name: NAMES[spec.choice], exact: true }));
      row.committed = await sample(page); checkCard(row.committed, false, spec.choice);
      const expected = T.serializeTycoon(T.setMatchPlan(fixtures[60].state, spec.choice), CLOCK); own(row.committed.rawSave === expected, 'EXACT_METADATA_ONLY_SAVED_COMMIT');
      metadataOnly(row.beforeCommit.rawSave, row.committed.rawSave, spec.choice);
      own(row.committed.pitchText === row.beforeCommit.pitchText && near(row.committed.performanceNow, row.beforeCommit.performanceNow), 'NO_SELECTION_TIME_OR_TAP');
      for (const key of ['x', 'y', 'width', 'height']) own(near(row.beforeCommit.group.rect[key], row.committed.group.rect[key]), 'NO_COMMIT_LAYOUT_JUMP');
      own(near(row.beforeCommit.scroll.x, row.committed.scroll.x) && near(row.beforeCommit.scroll.y, row.committed.scroll.y), 'NO_COMMIT_SCROLL');
      own(row.committed.group.status === NAMES[spec.choice] + ' locked until full time.', 'EXPLICIT_BALANCED_OR_CHOICE_LOCK');
      row.lockedImage = await image(page, row, 'locked60');
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.clock.runFor(64); await page.getByRole('heading', { name: 'STADIUM TYCOON', exact: true }).waitFor(); await actualFonts(page); await foundation(page, row); await bringCard(page);
      row.reloaded = await sample(page); checkCard(row.reloaded, false, spec.choice); own(row.reloaded.rawSave === expected, 'RELOAD_STAYS_LOCKED');
      if (spec.id === '390-light') {
        row.help = await help(page); await click(page, page.locator('[data-room="league"]')); await page.clock.runFor(1600); await click(page, page.locator('[data-room="stadium"]')); await bringCard(page);
        row.roomReturn = await sample(page); checkCard(row.roomReturn, false, spec.choice); own(row.roomReturn.pitchText !== row.reloaded.pitchText, 'CLOCK_CONTINUES_IN_LEAGUE');
        row.expiryTrace = [];
        for (let step = 0; step < 55; step++) { await page.clock.runFor(1000); const value = await sample(page), saved = JSON.parse(value.rawSave); row.expiryTrace.push({ step, minute: saved.minute, totalMatches: saved.totalMatches, status: value.group.status }); if (saved.totalMatches === 1) { row.expired = value; break; } }
        own(row.expired, 'ACTUAL_FULLTIME_SAVED_AFTER_NORMAL_CADENCE'); checkCard(row.expired, false);
        const saved = JSON.parse(row.expired.rawSave); own(saved.matchPlan?.match === 0 && T.matchPlanFor(saved) === null && saved.minute < 60, 'STALE_PLAN_NEXT_MATCH_NEUTRAL');
        own(row.expired.group.status === "Balanced by default. Choices open from 60'.", 'REAL_NEXT_MATCH_DEFAULT');
      }
      row.complete = true; checkWire(row);
    }
    const fresh = await open(PROFILES[1], null, 'NORMAL_FIRST_VISIT_HELP'); report.firstVisit = fresh.row;
    fresh.row.fonts = await fresh.page.evaluate(() => ({ status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) })); checkFonts(fresh.row.fonts);
    fresh.row.text = fresh.row.initialRules.text; fresh.row.reopenedHelp = await help(fresh.page);
    fresh.row.complete = true; checkWire(fresh.row);
    const fault = await open(PROFILES[1], fixtures[60].raw, 'DECLARED_STORAGE_FAULT_NOT_NORMAL'); report.storageFault = fault.row;
    await foundation(fault.page, fault.row); await bringCard(fault.page); fault.row.before = await sample(fault.page); checkCard(fault.row.before, true); own(fault.row.before.rawSave === fixtures[60].raw, 'FAULT_HEALTHY_BASELINE');
    await fault.page.evaluate(key => { const original = Storage.prototype.setItem; window.__stadiumPlanFault = { blocked: true, attempts: [], original }; Storage.prototype.setItem = function (name, value) { const control = window.__stadiumPlanFault; if (this === localStorage && name === key && control.blocked && JSON.parse(value).matchPlan) { control.attempts.push({ key: name, value, thrown: true }); throw new DOMException('Declared QA storage refusal', 'QuotaExceededError'); } return original.call(this, name, value); }; }, T.TYCOON_SAVE_KEY);
    try {
      await click(fault.page, fault.page.getByRole('button', { name: NAMES.protect, exact: true })); fault.row.refused = await sample(fault.page); checkCard(fault.row.refused, true);
      own(fault.row.refused.rawSave === fault.row.before.rawSave && fault.row.refused.group.status === 'Could not save that plan. Try again.', 'STORAGE_REFUSAL_NO_COMMIT');
      await fault.page.evaluate(() => { window.__stadiumPlanFault.blocked = false; });
      await click(fault.page, fault.page.getByRole('button', { name: NAMES.protect, exact: true })); fault.row.retried = await sample(fault.page); checkCard(fault.row.retried, false, 'protect');
      own(fault.row.retried.rawSave === T.serializeTycoon(T.setMatchPlan(fixtures[60].state, 'protect'), CLOCK), 'STORAGE_RETRY_EXACT_COMMIT');
      metadataOnly(fault.row.before.rawSave, fault.row.retried.rawSave, 'protect');
      fault.row.attempts = await fault.page.evaluate(() => window.__stadiumPlanFault.attempts); own(fault.row.attempts.length === 1 && fault.row.attempts[0].value === fault.row.retried.rawSave, 'EFFECTIVE_STORAGE_FAULT');
    } finally { fault.row.writerRestored = await fault.page.evaluate(() => { const original = window.__stadiumPlanFault.original; Storage.prototype.setItem = original; return Storage.prototype.setItem === original; }); }
    assert(fault.row.writerRestored); fault.row.complete = true; checkWire(fault.row);
    own(report.profiles.length === 5 && report.profiles.every(row => row.complete) && report.images.length === 10 && report.firstVisit.complete && report.storageFault.complete && report.completionControls.length === 2 && report.completionControls.every(control => control.changedBytes && control.onlyOneFieldChanged && control.sameWorkingCopyRestored && control.restoredProblem === null), 'ALL_BOUNDED_CASES_COMPLETE');
    assert.deepEqual([...new Set(report.profiles.map(row => row.spec.choice))].sort(), ['balanced', 'chase', 'protect']);
    report.status = 'POSITIVE_STADIUM_LATE_PLAN_UI_QUALIFIED';
  }
} catch (error) {
  const detail = { message: String(error.stack || error), code: error.code, operator: error.operator, actual: error.actual, expected: error.expected };
  if (MODE === 'group-probe' && report.probe?.healthyFoundation && error.code === 'ERR_ASSERTION' && error.actual === 0 && error.expected === 1 && error.operator === 'strictEqual' && error.message.split('\n')[0] === 'STADIUM_PLAN_ACCESSIBLE_GROUP') { report.status = 'OWNED_MISSING_GROUP'; report.probe.ownedFailure = detail; }
  else if (error.code === 'ERR_ASSERTION' && error.message.startsWith('STADIUM_PLAN_')) report.featureFailures.push(detail);
  else report.methodFailures.push(detail);
} finally {
  for (const { context, row } of contexts) { try { await context.close(); checkWire(row); } catch (error) { report.methodFailures.push({ context: row.id, message: String(error.stack || error) }); } }
  if (browser) await browser.close().catch(error => report.methodFailures.push({ message: String(error) }));
  try { const after = pins(); write('source-after.json', after); assert.deepEqual(after, before, 'SOURCE_BEFORE_AFTER_HELD'); for (const input of report.engineAuthority?.inputs || []) assert.equal(sha(fs.readFileSync(path.join(ROOT, input.path))), input.sha256, 'ACTUAL_ENGINE_INPUT_HELD'); report.sourceHeld = true; } catch (error) { report.methodFailures.push({ message: String(error.stack || error) }); }
  report.qualified = MODE === 'normal' && report.status === 'POSITIVE_STADIUM_LATE_PLAN_UI_QUALIFIED' && report.sourceHeld && report.methodFailures.length === 0 && report.featureFailures.length === 0;
  if (report.methodFailures.length || report.featureFailures.length) report.status = 'NOT_QUALIFIED';
  write('report.json', report);
}
if (report.qualified || (MODE === 'group-probe' && report.status === 'HEALTHY_GROUP_PROBE' && report.sourceHeld)) console.log(MODE === 'normal' ? 'STADIUM_LATE_PLAN_UI: five profiles, ten normal originals, real unlock/three choices/reload/help/fulltime and declared storage refusal/retry complete.' : 'STADIUM_LATE_PLAN_GROUP_PROBE: healthy actual heading/pitch/fonts and exactly one accessible group.');
else if (report.status === 'OWNED_MISSING_GROUP' && report.sourceHeld && report.methodFailures.length === 0) { console.error('STADIUM_PLAN_ACCESSIBLE_GROUP: healthy real Stadium page has zero groups named Late-match plan, expected exactly one.'); process.exitCode = 1; }
else { console.error('STADIUM_LATE_PLAN_NOT_QUALIFIED: inspect retained report, raw observations and transport.'); process.exitCode = report.methodFailures.length ? 2 : 1; }
