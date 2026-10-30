/* Real CM controls and persisted saves. Remote proof only; no app telemetry.
   No cue or callback invocation substitutes for the actual saved career. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';
import { answerConsent, storedConsent } from '../lib/answerConsent.mjs';
import { pageSeedOf, seedPages, pageDraws } from '../lib/pageSeed.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.env.CM_GAMEPLAY_OUT || '');
const CONTROL = process.env.CM_GAMEPLAY_CONTROL || '';
const ONLY = process.env.CM_GAMEPLAY_CASE || '';
const SEED = pageSeedOf(import.meta.url, process.env.CM_GAMEPLAY_SEED || '64185');
const KEY = 'dukb-club-manager-save', ROUTE = '/club-manager';
const SOURCE_PINS = {
  "index.html": "f6d81a169d0c98f3b86551665c5cc83c7919dc48",
  "scripts/lib/answerConsent.mjs": "c6d16997e4c06e8b35dcfd0bab5efcad3069d899",
  "scripts/lib/hostLikeServer.mjs": "21059d5e8114669df61106c125d5272d357b6236",
  "scripts/lib/pageSeed.mjs": "981886d1bfe271740c27e57cd01989bceecb4fb1",
  "scripts/lib/playwrightLoader.mjs": "4f7739e217e0a47ee82e6bfc8be1c04bed17454a",
  "scripts/qa/freeKickLab1070.mjs": "1cf030d9182fd4fd68fca39f32e757c69bf9e58a",
  "src/components/club-manager/ContractsCard.tsx": "8bf2813801b5a63fe9da37dc362be6c8fa408472",
  "src/components/club-manager/FreeAgentPool.tsx": "a85232cafe27b0a4bafc9914be2a8c74a7ee96e9",
  "src/components/club-manager/TransferScreen.tsx": "1157975509a11dc6ce7d75d1d02221787716ad1b",
  "src/hooks/useClubManager.ts": "7297073ea60b93501df48ea9b7dfc74edd2217de",
  "src/index.css": "775df500bd7c9730e5b04aedd3d6b2a1564d49b4",
  "src/lib/clubManager.ts": "962aab2c18611c40c1fc998c77c384ab02b2d7b6",
  "src/lib/clubManagerWorldRoster.ts": "8fc15c82723512dd36482747bf9d06f8c731fa01",
  "src/pages/ClubManager.tsx": "1ec2e88ec6e0e45b268f53cfbfab1981c84979b8"
};
const VARIANTS = {
  'contracts-no-commit': { path: 'src/pages/ClubManager.tsx', blob: 'ec31785046ddd30d65f2f6ba1b830c56c3e493c8', case: 'contracts-phone-natural-return' },
  'price-ignore-custom-ceiling': { path: 'src/components/club-manager/TransferScreen.tsx', blob: '4297f533b6f6ddeef84f6d0f3f761d331f179877', case: 'price-phone-asking-boundary' },
};
const INPUTS = {
  'EXPECTED.json': '8d07d2fe6530bfba5d8555e428a860592b54b32da645c7c7e5ff0c2b8b7edf8f',
  'natural-expiry-before.career.json': 'c8ad5bc85e41fe68cd18820e6e8dd218d7d75db44ee350207e6c4d680305f533',
  'natural-expiry-closed.career.json': '09efdf7882ced8be900df9bd07abebbcd64026ec10c3c910df212cbaea65e7f3',
  'price-open.career.json': '6ccad4970d75cb61e51bba4685a58db34f701a00e0c8376f790d5651a61a38a8',
};
const MODULES = ['src/pages/ClubManager.tsx', 'src/hooks/useClubManager.ts', 'src/lib/clubManager.ts',
  'src/lib/clubManagerWorldRoster.ts', 'src/components/club-manager/FreeAgentPool.tsx',
  'src/components/club-manager/TransferScreen.tsx', 'src/components/club-manager/ContractsCard.tsx'];
const CASES = [
  { id: 'market-desktop-natural-return', width: 1280, height: 800, touch: false, kind: 'market' },
  { id: 'market-phone-natural-return', width: 390, height: 844, touch: true, kind: 'market' },
  { id: 'contracts-phone-natural-return', width: 390, height: 844, touch: true, kind: 'contracts' },
  { id: 'price-desktop-asking-boundary', width: 1280, height: 800, touch: false, kind: 'price' },
  { id: 'price-phone-asking-boundary', width: 390, height: 844, touch: true, kind: 'price' },
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const json = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n');
assert(OUT !== ROOT && path.isAbsolute(OUT) && (!fs.existsSync(OUT) || fs.readdirSync(OUT).length === 0), 'CM_SETUP_FRESH_OUTPUT');
assert(!CONTROL || VARIANTS[CONTROL], 'CM_SETUP_KNOWN_CONTROL');
assert(!ONLY || CASES.some(c => c.id === ONLY), 'CM_SETUP_KNOWN_CASE');
assert(!CONTROL || ONLY === VARIANTS[CONTROL].case, 'CM_SETUP_OWNED_CONTROL_CASE');
fs.mkdirSync(OUT, { recursive: true });
const report = { schema: 1, mode: CONTROL || 'normal', only: ONLY, seed: SEED, sourcePins: [],
  inputs: [], cases: [], setupErrors: [], uiMeasurements: [], contexts: [], appCreditFromCue: false };
const groupsPath = process.env.CM_COMPILED_GROUPS;
assert(groupsPath && path.isAbsolute(groupsPath), 'CM_SETUP_ASSOCIATED_BUILD_REQUIRED');
const compiledBytes = fs.readFileSync(groupsPath), compiled = JSON.parse(compiledBytes);
const distFiles = new Map(compiled.distFiles.map(f => [f.path, f]));
const chunks = new Map(compiled.chunks.map(c => [c.file, c]));
report.compiledReceiptSHA256 = sha(compiledBytes);
fs.writeFileSync(path.join(OUT, 'COMPILED-GROUPS.json'), compiledBytes);
function heldSources() {
  const pins = { ...SOURCE_PINS };
  if (CONTROL) pins[VARIANTS[CONTROL].path] = VARIANTS[CONTROL].blob;
  for (const [name, expected] of Object.entries(pins)) {
    const bytes = fs.readFileSync(path.join(ROOT, name)), actual = blob(bytes);
    assert.equal(actual, expected, 'CM_SETUP_SOURCE_PIN ' + name);
    assert.equal(compiled.sourcePins[name].gitBlob, actual, 'CM_SETUP_COMPILED_SOURCE_ASSOCIATION ' + name);
    report.sourcePins.push({ path: name, gitBlob: actual, sha256: sha(bytes) });
  }
  assert.deepEqual(compiled.bootstrapModules.length, 1, 'CM_SETUP_ONE_CURRENT_BOOTSTRAP');
  for (const file of MODULES) assert(compiled.chunks.some(c => c.modules.includes(file)), 'CM_SETUP_COMPILED_GROUP ' + file);
}
function input(name) {
  const bytes = fs.readFileSync(path.join(ROOT, 'scripts/qa/cm-gameplay-fixtures-v1', name));
  assert.equal(sha(bytes), INPUTS[name], 'CM_SETUP_ORIGINAL_V5_INPUT ' + name);
  report.inputs.push({ name, bytes: bytes.length, sha256: sha(bytes) });
  return bytes.toString('utf8');
}
async function canonicalReader() {
  const dir = path.join(OUT, 'reader'); fs.mkdirSync(dir);
  const entry = path.join(dir, 'entry.ts'), target = path.join(dir, 'world-reader.cjs');
  fs.writeFileSync(entry, "export { readWorldRoster } from '@/lib/clubManagerWorldRoster';\n");
  const result = await build({ entryPoints: [entry], outfile: target, bundle: true, platform: 'node', format: 'cjs',
    alias: { '@': path.join(ROOT, 'src') }, metafile: true, logLevel: 'silent' });
  json('reader/metafile.json', result.metafile);
  assert(!/supabase\.co/.test(fs.readFileSync(target, 'utf8')), 'CM_SETUP_READER_HAS_NO_PRODUCTION_TRANSPORT');
  return createRequire(import.meta.url)(target).readWorldRoster;
}
function preparedFonts() {
  const cache = process.env.FREE_KICK_FONT_CACHE;
  assert(cache && /^[a-f0-9]{64}$/.test(process.env.FONT_CACHE_MANIFEST_SHA256 || ''), 'Prepared font cache and frozen manifest hash required');
  const raw = fs.readFileSync(path.join(cache, 'manifest.json'));
  assert.equal(sha(raw), process.env.FONT_CACHE_MANIFEST_SHA256, 'Exact prepared manifest');
  const entries = JSON.parse(raw), map = new Map();
  fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true });
  for (const entry of entries) {
    assert(!map.has(entry.url) && entry.file === sha(entry.url), 'Unique URL-hashed font cache entry');
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
    const bytes = fs.readFileSync(path.join(cache, entry.file));
    assert.equal(sha(bytes), entry.sha256, 'Exact cached font body');
    assert.equal(typeof entry.contentType, 'string');
    map.set(entry.url, { ...entry, body: bytes });
    fs.writeFileSync(path.join(OUT, 'fonts', entry.file), bytes);
  }
  const styles = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
    .matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"\s+rel="stylesheet"/g)].map(m => new URL(m[1]).href);
  assert.equal(styles.length, 1, 'Actual one template stylesheet');
  const css = map.get(styles[0]); assert(css && /^text\/css/.test(css.contentType));
  const declared = [...new Set([...css.body.toString('utf8').matchAll(/url\(\s*['"]?(https:\/\/[^)'"\s]+)/g)].map(m => m[1]))];
  assert(declared.length > 0);
  assert.deepEqual([...map.keys()].sort(), [styles[0], ...declared].sort(), 'Only actual font stylesheet dependencies');
  fs.writeFileSync(path.join(OUT, 'fonts', 'manifest.json'), raw);
  report.fontManifestSHA256 = sha(raw);
  return map;
}
let browser, server, serverLog = '';
const contexts = [];
async function startServer() {
  const port = await new Promise((resolve, reject) => {
    const s = createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(e => e ? reject(e) : resolve(p)); });
  });
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Host server timeout: ' + serverLog)), 20000);
    server.once('exit', code => { clearTimeout(timer); reject(new Error('Host server exited ' + code)); });
    server.stderr.on('data', b => { serverLog += b; });
    server.stdout.on('data', b => { serverLog += b; if (serverLog.includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  });
  return 'http://127.0.0.1:' + port;
}
async function open(base, fonts, item, saved, dir) {
  const context = await browser.newContext({ viewport: { width: item.width, height: item.height }, deviceScaleFactor: 1,
    isMobile: item.touch, hasTouch: item.touch, reducedMotion: 'reduce', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: base, localStorage: [
      { name: KEY, value: saved }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' },
      { name: 'rules-gate-seen:' + ROUTE, value: '1' },
    ] }] } });
  contexts.push(context); await seedPages(context, SEED);
  const receipt = { id: item.id, requests: [], fonts: [], egress: [], pageErrors: [], consoleErrors: [], assetFailures: [], localFailures: [] };
  report.contexts.push(receipt);
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === base) return route.continue();
    const font = fonts.get(req.url());
    if (font && req.method() === 'GET' && ['font', 'stylesheet'].includes(req.resourceType())) {
      receipt.fonts.push({ url: req.url(), sha256: font.sha256, type: req.resourceType() });
      return route.fulfill({ status: 200, contentType: font.contentType, body: font.body });
    }
    receipt.egress.push({ url: req.url(), method: req.method(), type: req.resourceType(), action: 'ABORT' });
    if (['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(url.origin)) receipt.localFailures.push('Unprepared font ' + req.url());
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage(), pending = [];
  page.on('pageerror', e => receipt.pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') receipt.consoleErrors.push(m.text()); });
  page.on('requestfailed', req => { if (new URL(req.url()).origin === base) receipt.localFailures.push(req.url() + ' ' + req.failure()?.errorText); });
  page.on('response', response => {
    const task = (async () => {
      const url = new URL(response.url()); if (url.origin !== base) return;
      const request = response.request(); if (request.method() !== 'GET') return;
      if (response.status() >= 400) { receipt.localFailures.push(String(response.status()) + ' ' + url.pathname); return; }
      if (!['document', 'script', 'stylesheet'].includes(request.resourceType())) return;
      let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const candidates = [rel, path.posix.join(rel, 'index.html')];
      if (rel === '') candidates.unshift('index.html');
      rel = candidates.find(name => distFiles.has(name)) || 'index.html';
      const expected = distFiles.get(rel), bytes = await response.body();
      assert(expected && sha(bytes) === expected.sha256, 'CM_SETUP_SERVED_DIST_BODY ' + url.pathname);
      if (/^assets\/.*\.js$/.test(rel)) assert(chunks.has(rel), 'CM_SETUP_NO_OLD_SNAPSHOT_CHUNK ' + rel);
      const assetDir = path.join(OUT, 'served-assets'); fs.mkdirSync(assetDir, { recursive: true });
      const hash = sha(bytes); if (!fs.existsSync(path.join(assetDir, hash))) fs.writeFileSync(path.join(assetDir, hash), bytes);
      receipt.requests.push({ path: url.pathname, distPath: rel, resourceType: request.resourceType(), bytes: bytes.length, sha256: hash,
        compiledModules: chunks.get(rel)?.modules || [] });
    })().catch(error => receipt.assetFailures.push(String(error)));
    pending.push(task);
  });
  await page.goto(base + ROUTE, { waitUntil: 'networkidle', timeout: 60000 });
  receipt.consent = await answerConsent(page);
  assert.equal(await storedConsent(page), 'rejected', 'CM_SETUP_REAL_ESSENTIAL_CONSENT');
  await page.waitForFunction(() => !document.body.hasAttribute('data-consent-pending'));
  receipt.fontFaces = await page.evaluate(async () => {
    const rows = [];
    for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
      const faces = await document.fonts.load(weight + ' 16px "' + family + '"', 'Club Manager');
      rows.push({ family, weight, loaded: faces.length > 0 && faces.every(f => f.status === 'loaded') });
    }
    await document.fonts.ready; return rows;
  });
  assert(receipt.fontFaces.length === 8 && receipt.fontFaces.every(f => f.loaded) && receipt.fonts.length, 'CM_SETUP_REAL_FONTS');
  const state = { page, receipt, context, pending, item, dir };
  const resume = page.getByTestId('cm-slot-1').getByRole('button', { name: 'Resume Career', exact: true });
  await tap(state, resume, 'resume-slot1', 'CM_BROWSER_RESUME_UNREACHABLE');
  await visible(page.getByRole('tab', { name: 'Market', exact: true }), 'CM_BROWSER_HUB_UNREACHABLE');
  await settle(page);
  await screenshot(state, '01-resumed');
  return state;
}
async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(300);
}
async function visible(locator, marker) {
  const ok = await locator.waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false);
  assert(ok && await locator.count() === 1, marker);
}
async function screenshot(state, name) {
  await state.page.screenshot({ path: path.join(state.dir, name + '.png'), fullPage: false });
}
async function tap(state, locator, label, marker = 'CM_BROWSER_CONTROL_UNREACHABLE') {
  await visible(locator, marker); await locator.scrollIntoViewIfNeeded(); await settle(state.page);
  const box = await locator.boundingBox(); assert(box && box.height > 0 && box.width > 0, marker);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const hit = await locator.evaluate((el, p) => el.contains(document.elementFromPoint(p.x, p.y)), point);
  assert(hit && point.x > 0 && point.x < state.item.width && point.y > 0 && point.y < state.item.height, marker);
  report.uiMeasurements.push({ id: state.item.id, label, box, point, hit,
    below44: state.item.touch && /free-agents-mode|sign-original|maximum-price/.test(label) && box.height < 43.5 });
  if (state.item.touch) await state.page.touchscreen.tap(point.x, point.y); else await state.page.mouse.click(point.x, point.y);
  await settle(state.page);
}
async function saved(state, name) {
  const raw = await state.page.evaluate(key => localStorage.getItem(key), KEY);
  assert(raw, 'CM_SETUP_ACTUAL_SAVE_MISSING');
  fs.writeFileSync(path.join(state.dir, name + '.save.json'), raw);
  const value = JSON.parse(raw); assert(value.squad && value.clubName && value.saveVersion, 'CM_SETUP_ACTUAL_CAREER_SHAPE');
  return value;
}
async function active(state, tab) {
  await tap(state, state.page.getByRole('tab', { name: tab, exact: true }), 'tab-' + tab);
  const panel = state.page.locator('[role="tabpanel"][data-state="active"]');
  await visible(panel, 'CM_BROWSER_ACTIVE_PANEL_UNREACHABLE'); return panel;
}
async function pool(state, kind) {
  const panel = await active(state, kind === 'contracts' ? 'Squad' : 'Market');
  if (kind !== 'contracts') {
    const mode = panel.getByRole('button', { name: /^Free agents \([0-9]+\)$/ });
    await tap(state, mode, 'free-agents-mode', 'CM_BROWSER_POOL_UNREACHABLE');
    assert.equal(await mode.getAttribute('aria-pressed'), 'true', 'CM_BROWSER_POOL_MODE_NOT_SELECTED');
  }
  const region = panel.locator('section[aria-label="Free agents"]');
  await visible(region, 'CM_BROWSER_POOL_UNREACHABLE'); return region;
}
function outcome(before, after, expected, readWorldRoster) {
  const e = expected.naturalExpiry, people = after.squad.filter(p => p.id === e.id);
  assert.equal(people.length, 1, 'CM_BROWSER_ORIGINAL_IDENTITY');
  for (const key of ['id', 'name', 'position', 'rating', 'age', 'wage', 'contractYears', 'potential', 'worldRosterKey']) {
    assert.deepEqual(people[0][key], e.player[key], 'CM_BROWSER_ORIGINAL_PROFILE ' + key);
  }
  assert.equal(new Set(after.squad.map(p => p.id)).size, after.squad.length, 'CM_BROWSER_DUPLICATE_SQUAD_ID');
  assert(!after.freeAgents.some(f => f.worldRosterKey === e.worldRosterKey || f.name === e.name), 'CM_BROWSER_STILL_IN_POOL');
  assert.equal(before.budget, e.beforeBudget, 'CM_SETUP_EXPECTED_STARTING_BUDGET');
  assert.equal(after.budget, e.afterBudget, 'CM_BROWSER_SIGN_FINANCE');
  assert.equal(after.wageCap, before.wageCap, 'CM_BROWSER_CAP_DRIFT');
  assert.deepEqual(after.severance, before.severance, 'CM_BROWSER_SPURIOUS_SEVERANCE');
  const beforeRows = before.seasonSignings.filter(r => r.dir === 'in' && r.name === e.name);
  const afterRows = after.seasonSignings.filter(r => r.dir === 'in' && r.name === e.name);
  assert.equal(afterRows.length, beforeRows.length + 1, 'CM_BROWSER_SIGNING_ACCOUNTING');
  assert.deepEqual(afterRows.at(-1), { dir: 'in', name: e.name, fee: 0, bonus: e.quote.fee }, 'CM_BROWSER_SIGNING_ACCOUNTING');
  const canonical = readWorldRoster(after)?.records.filter(r => r.key === e.worldRosterKey) || [];
  assert.equal(canonical.length, 1, 'CM_BROWSER_CANONICAL_RECORD');
  assert.equal(canonical[0].status, 'owned', 'CM_BROWSER_CANONICAL_OWNER');
  assert.equal(canonical[0].owner, after.clubName, 'CM_BROWSER_CANONICAL_OWNER');
  assert.equal(canonical[0].player.id, e.id, 'CM_BROWSER_CANONICAL_ID');
  return { id: people[0].id, key: people[0].worldRosterKey, budgetBefore: before.budget, budgetAfter: after.budget,
    wage: people[0].wage, years: people[0].contractYears, canonicalOwner: canonical[0].owner };
}
async function natural(state, expected, readWorldRoster) {
  const e = expected.naturalExpiry, before = await saved(state, 'before');
  assert.equal(before.transferWindow, null, 'CM_SETUP_CLOSED_TRANSFER_WINDOW');
  assert(!before.squad.some(p => p.id === e.id), 'CM_SETUP_NOT_ALREADY_OWNED');
  assert.equal(before.freeAgents.filter(f => f.worldRosterKey === e.worldRosterKey).length, 1, 'CM_SETUP_ACTUAL_EXPIRED_ROW');
  const region = await pool(state, state.item.kind);
  const name = region.getByText(e.name, { exact: true }); await visible(name, 'CM_BROWSER_ORIGINAL_PLAYER_HIDDEN');
  const row = name.locator('xpath=ancestor::div[button[@data-sign-index]][1]');
  const sign = row.locator('button[data-sign-index]'); await visible(sign, 'CM_BROWSER_SIGN_CONTROL_MISSING');
  assert(await sign.isEnabled(), 'CM_BROWSER_VALID_SIGNING_DISABLED');
  const face = await sign.innerText();
  assert(face.includes(e.quote.wage + 'k/w') && face.includes(e.quote.years + 'y') && /£3(?:\.0)?m/.test(face), 'CM_BROWSER_QUOTE_DRIFT');
  await sign.scrollIntoViewIfNeeded(); await settle(state.page); await screenshot(state, '02-target-pool');
  await tap(state, sign, 'sign-original');
  await saved(state, 'after-press'); await screenshot(state, '03-after-press');
  const cue = state.page.getByTestId('cm-contracts-cue');
  state.receipt.optimisticCue = await cue.count() ? await cue.textContent() : null;
  const persisted = await state.page.waitForFunction(({ key, id, budget }) => {
    const p = JSON.parse(localStorage.getItem(key) || 'null');
    return p?.budget === budget && p.squad?.filter(man => man.id === id).length === 1;
  }, { key: KEY, id: e.id, budget: e.afterBudget }, { timeout: 20000 }).then(() => true, () => false);
  assert(persisted, 'CM_BROWSER_SIGN_NOT_PERSISTED');
  const after = await saved(state, 'persisted'); await screenshot(state, '04-persisted');
  const summary = outcome(before, after, expected, readWorldRoster);
  await state.page.reload({ waitUntil: 'networkidle' });
  await tap(state, state.page.getByTestId('cm-slot-1').getByRole('button', { name: 'Resume Career', exact: true }), 'reload-resume');
  await visible(state.page.getByRole('tab', { name: 'Squad', exact: true }), 'CM_BROWSER_RELOADED_HUB_MISSING');
  const reloaded = await saved(state, 'reloaded'); outcome(before, reloaded, expected, readWorldRoster);
  const squad = await active(state, 'Squad');
  const actualName = squad.getByText(e.name, { exact: true }).first();
  assert(await actualName.count(), 'CM_BROWSER_RELOADED_SQUAD_HIDDEN');
  await actualName.scrollIntoViewIfNeeded(); await settle(state.page); await screenshot(state, '05-reloaded-squad');
  const squadPool = squad.locator('section[aria-label="Free agents"]');
  await visible(squadPool, 'CM_BROWSER_RELOADED_CONTRACTS_POOL_MISSING');
  assert.equal(await squadPool.getByText(e.name, { exact: true }).count(), 0, 'CM_BROWSER_DUPLICATE_CONTRACTS_POOL');
  const marketPool = await pool(state, 'market');
  assert.equal(await marketPool.getByText(e.name, { exact: true }).count(), 0, 'CM_BROWSER_DUPLICATE_MARKET_POOL');
  await screenshot(state, '06-reloaded-market-pool');
  return summary;
}
function economic(state) {
  return { club: state.clubName, season: state.season, week: state.week, budget: state.budget, cap: state.wageCap,
    squad: state.squad.map(p => [p.id, p.wage, p.worldRosterKey, p.potential]),
    pool: state.freeAgents, signings: state.seasonSignings, negotiation: state.negotiation };
}
async function prices(state, expected) {
  const before = await saved(state, 'before'), panel = await active(state, 'Market');
  assert.notEqual(before.transferWindow, null, 'CM_SETUP_OPEN_PRICE_WINDOW');
  await tap(state, panel.getByRole('button', { name: 'Buy', exact: true }), 'buy-mode');
  const search = panel.getByRole('textbox', { name: 'Search player or club', exact: true });
  const field = panel.getByRole('textbox', { name: 'Maximum asking price (£m)', exact: true });
  const preset = panel.getByRole('combobox', { name: 'Price range', exact: true });
  await visible(field, 'CM_BROWSER_PRICE_INPUT_MISSING'); await visible(search, 'CM_BROWSER_SEARCH_MISSING');
  await search.fill(expected.price.boundary.name); await settle(state.page);
  const target = panel.getByText(expected.price.boundary.name, { exact: true }), steps = [];
  state.receipt.priceSteps = steps;
  async function ceiling(text, wanted, marker) {
    await field.fill(text); await settle(state.page);
    const count = await target.count();
    steps.push({ text: await field.inputValue(), preset: await preset.inputValue(), query: await search.inputValue(),
      targetCount: count, invalid: await field.getAttribute('aria-invalid') });
    assert.equal(count, wanted ? 1 : 0, marker);
    assert.equal(await search.inputValue(), expected.price.boundary.name, 'CM_BROWSER_QUERY_LOST');
    assert.equal(await preset.inputValue(), 'any', 'CM_BROWSER_PRESET_NOT_CLEARED');
  }
  assert.equal(await target.count(), 1, 'CM_SETUP_REAL_ASKING_BOUNDARY_PRESENT');
  await screenshot(state, '01-market-query');
  await ceiling('24.8', true, 'CM_BROWSER_PRICE_EQUAL_BOUNDARY');
  await screenshot(state, '02-equal-boundary');
  await ceiling('24.7', false, 'CM_BROWSER_PRICE_CEILING_IGNORED');
  await screenshot(state, '03-below-boundary');
  await ceiling('24.9', true, 'CM_BROWSER_PRICE_ABOVE_BOUNDARY');
  await preset.selectOption('p10'); await settle(state.page);
  assert.equal(await field.inputValue(), '', 'CM_BROWSER_PRESET_DID_NOT_CLEAR_CUSTOM');
  assert.equal(await target.count(), 0, 'CM_BROWSER_PRESET_IGNORED');
  await screenshot(state, '04-preset');
  await ceiling('24.8', true, 'CM_BROWSER_CUSTOM_DID_NOT_CLEAR_PRESET');
  await ceiling('', true, 'CM_BROWSER_BLANK_NOT_UNBOUNDED');
  await ceiling('2abc', true, 'CM_BROWSER_INVALID_APPLIED_CEILING');
  assert.equal(await field.getAttribute('aria-invalid'), 'true', 'CM_BROWSER_INVALID_NOT_MARKED');
  assert((await panel.locator('#cm-market-max-ask-note').innerText()).includes('No custom ceiling applied'), 'CM_BROWSER_INVALID_NOTE_MISSING');
  await field.scrollIntoViewIfNeeded(); await settle(state.page); await screenshot(state, '05-invalid');
  const box = await field.boundingBox(); report.uiMeasurements.push({ id: state.item.id, label: 'maximum-price', box, below44: state.item.touch && box.height < 43.5 });
  const after = await saved(state, 'after-filters');
  assert.deepEqual(economic(after), economic(before), 'CM_BROWSER_FILTER_MUTATED_CAREER');
  fs.writeFileSync(path.join(state.dir, 'price-steps.json'), JSON.stringify(steps, null, 2) + '\n');
  return { boundary: expected.price.boundary, steps, budgetBefore: before.budget, budgetAfter: after.budget };
}
async function association(state) {
  await state.page.waitForLoadState('networkidle'); await Promise.all(state.pending);
  assert.deepEqual(state.receipt.assetFailures, [], 'CM_SETUP_COMPILED_ASSET_BODY');
  assert.deepEqual(state.receipt.localFailures, [], 'CM_SETUP_LOCAL_ASSET');
  assert.deepEqual(state.receipt.pageErrors, [], 'CM_SETUP_PAGE_RUNTIME');
  const loaded = new Set(state.receipt.requests.map(r => r.distPath));
  for (const boot of compiled.bootstrapModules) assert(loaded.has(boot), 'CM_SETUP_CURRENT_BOOTSTRAP_NOT_LOADED');
  const required = MODULES.filter(name => {
    if (name.endsWith('ContractsCard.tsx')) return state.item.kind === 'contracts';
    if (name.endsWith('TransferScreen.tsx')) return state.item.kind !== 'contracts';
    return true;
  });
  const groups = required.map(name => {
    const chunk = compiled.chunks.find(c => c.modules.includes(name));
    assert(chunk && loaded.has(chunk.file), 'CM_SETUP_CURRENT_MODULE_GROUP_NOT_LOADED ' + name);
    return { module: name, chunk: chunk.file, sha256: chunk.sha256 };
  });
  state.receipt.loadedCurrentGroups = groups;
  state.receipt.domModuleScripts = await state.page.evaluate(() => [...document.querySelectorAll('script[type="module"][src]')].map(el => new URL(el.src).pathname.replace(/^\/+/, '')));
  assert(compiled.bootstrapModules.every(file => state.receipt.domModuleScripts.includes(file)), 'CM_SETUP_DOM_BOOTSTRAP_ASSOCIATION');
}
let exitCode = 2;
try {
  heldSources(); const fonts = preparedFonts();
  const expected = JSON.parse(input('EXPECTED.json'));
  assert.equal(expected.source, '1524c116bfb91f7b2ee3f5e67c18f32df585d968', 'CM_SETUP_V5_EXPECTED_PROVENANCE');
  input('natural-expiry-before.career.json');
  const expired = input('natural-expiry-closed.career.json'), priced = input('price-open.career.json');
  const readWorldRoster = await canonicalReader(), base = await startServer();
  browser = await chromium.launch({ headless: true }); report.browserVersion = browser.version();
  for (const item of CASES.filter(c => !ONLY || c.id === ONLY)) {
    const dir = path.join(OUT, item.id); fs.mkdirSync(dir); let state;
    const row = { id: item.id, profile: { width: item.width, height: item.height, touch: item.touch }, status: 'PENDING' };
    report.cases.push(row);
    try {
      state = await open(base, fonts, item, item.kind === 'price' ? priced : expired, dir);
      row.outcome = item.kind === 'price' ? await prices(state, expected) : await natural(state, expected, readWorldRoster);
      await association(state); row.status = 'PASS'; row.draws = await pageDraws(state.page);
    } catch (error) {
      const marker = String(error?.message).match(/CM_(?:BROWSER|SETUP)_[A-Z0-9_]+/)?.[0] || null;
      row.status = marker?.startsWith('CM_BROWSER_') && error?.code === 'ERR_ASSERTION' ? 'FAIL' : 'ERROR';
      row.failure = { marker, name: error?.name, message: String(error), stack: error?.stack };
      if (state) {
        await screenshot(state, 'FAILURE').catch(() => {});
        await saved(state, 'failure-actual').catch(() => {});
        try { await association(state); } catch (associationError) {
          row.status = 'ERROR'; row.associationFailure = String(associationError);
        }
      }
    } finally { await state?.context.close().catch(() => {}); }
  }
  assert.equal(report.cases.length, ONLY ? 1 : 5, 'CM_SETUP_EXACT_CASE_COUNT');
  for (const receipt of report.contexts) {
    if (receipt.pageErrors.length || receipt.localFailures.length || receipt.assetFailures.length) report.setupErrors.push({ id: receipt.id, marker: 'CM_SETUP_FINAL_TRANSPORT_OR_RUNTIME' });
  }
  report.touchFindings = report.uiMeasurements.filter(row => row.below44);
  report.visualQaClaim = 'Actual phone measurements retained; no broad visual release credit';
  exitCode = report.setupErrors.length || report.cases.some(c => c.status === 'ERROR') ? 2 : report.cases.some(c => c.status === 'FAIL') ? 1 : 0;
} catch (error) {
  report.setupErrors.push({ message: String(error), stack: error?.stack }); exitCode = 2;
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close().catch(() => {}); server?.kill();
  fs.writeFileSync(path.join(OUT, 'server.log'), serverLog);
  report.rawExit = exitCode; json('REPORT.json', report);
}
console.log('CM_GAMEPLAY_EXIT ' + exitCode);
process.exitCode = exitCode;
