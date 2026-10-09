/* Actual built US career routes, transparent storage refusal and unchanged engine outcomes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(process.env.CI, 'US career recovery native verification runs only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'us-career-save-recovery-artifacts/native');
const CACHE = path.resolve(process.env.US_CAREER_SAVE_RECOVERY_ASSET_CACHE || path.join(ROOT, 'us-career-save-recovery-artifacts/font-cache/manifest.json'));
const NOW = Date.parse('2026-10-07T12:00:00.000Z');
const SEED = 10841007;
const SLUGS = ['nba', 'nfl', 'mlb', 'nhl'];
const profiles = [
  { width: 320, height: 780, touch: true, theme: 'dark', reduced: true },
  { width: 390, height: 844, touch: true, theme: 'light', reduced: false },
  { width: 1280, height: 720, touch: false, theme: 'light', reduced: false },
];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const saveKey = slug => `${slug}-my-career-save-v1`;
const fontSheets = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(match => new URL(match[1]).href);
assert.equal(fontSheets.length, 1, 'Native fonts bind the actual template stylesheet');

if (process.argv.includes('--prefetch-fonts-only')) {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  const manifest = [];
  const fetchAsset = async url => {
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(url).origin));
    const response = await fetch(url);
    assert.equal(response.status, 200, `Actual font asset ${url}`);
    const body = Buffer.from(await response.arrayBuffer()), file = digest(url);
    fs.writeFileSync(path.join(path.dirname(CACHE), file), body);
    manifest.push({ url, file, sha256: digest(body), contentType: response.headers.get('content-type') });
    return body;
  };
  for (const sheet of fontSheets) {
    const css = (await fetchAsset(sheet)).toString('utf8');
    for (const url of new Set([...css.matchAll(/url\(['"]?(https:\/\/fonts\.gstatic\.com\/[^)'"\s]+)['"]?\)/g)].map(match => match[1]))) await fetchAsset(url);
  }
  assert(manifest.length > 1, 'Actual font payloads accompany the stylesheet');
  fs.writeFileSync(CACHE, JSON.stringify(manifest, null, 2));
  console.log(`US career recovery: cached ${manifest.length} actual template font assets.`);
  process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build the actual app before native verification');
const assetEntries = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
const assets = new Map(assetEntries.map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://flagcdn.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file), 'Cache files stay within the manifest directory');
  const body = fs.readFileSync(path.join(path.dirname(CACHE), entry.file));
  assert.equal(digest(body), entry.sha256, 'Actual cached asset bytes match the manifest');
  return [entry.url, { body, contentType: entry.contentType }];
}));
assert(assets.has(fontSheets[0]));
const assetPayloadHashes = () => Object.fromEntries(assetEntries.map(entry => [entry.file, digest(fs.readFileSync(path.join(path.dirname(CACHE), entry.file)))]));
const serviceOrigin = new URL(fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8').match(/export const SUPABASE_URL = "([^"]+)";/)[1]).origin;
const writeJSON = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2));
function sourceHashes() {
  const result = {};
  const walk = relative => {
    for (const entry of fs.readdirSync(path.join(ROOT, relative), { withFileTypes: true })) {
      const file = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) result[file] = digest(fs.readFileSync(path.join(ROOT, file)));
    }
  };
  walk('src');
  for (const file of ['index.html', 'package.json', 'package-lock.json', 'scripts/qa/usCareerSaveRecovery1084.mjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs']) result[file] = digest(fs.readFileSync(path.join(ROOT, file)));
  return result;
}
function buildHashes() {
  const files = ['dist/index.html', ...SLUGS.map(slug => `dist/${slug}-my-career/index.html`), ...fs.readdirSync(path.join(ROOT, 'dist/assets')).filter(name => /\.(?:js|css)$/.test(name)).map(name => `dist/assets/${name}`)];
  return Object.fromEntries(files.filter(file => fs.existsSync(path.join(ROOT, file))).map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))]));
}
const report = {
  started: new Date().toISOString(), complete: false,
  scope: 'Actual built four US career routes, real prospect and career writers, independently derived engine payloads, key-specific storage refusal and actual reload.',
  limits: ['Fixtures start at an actual engine-created showcase, not a naturally completed browser campaign.', 'Deletion fixtures explicitly restore a player manually retired after two actual engine seasons.', 'Recovery geometry covers the new notice and Retry control, not all older career controls.', 'No production services, scoring or database calls are forwarded.'],
  sourceBefore: sourceHashes(), buildBefore: buildHashes(), assetManifestSha256: digest(fs.readFileSync(CACHE)), assetPayloadBefore: assetPayloadHashes(), cases: [], deletions: [], controls: [], forwardedWrites: 0,
  transportErrors: [], serverEvents: [],
};
let saveTimer = null;
const save = () => {
  if (saveTimer !== null) { clearTimeout(saveTimer); saveTimer = null; }
  writeJSON('report.json', report);
};
const saveSoon = () => {
  if (saveTimer === null) saveTimer = setTimeout(save, 250);
};
save();

function oracleEnvironment(initial = { seed: SEED, draws: 0 }) {
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const oldSocket = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket');
  const OriginalDate = Date, originalRandom = Math.random, originalFetch = globalThis.fetch;
  const memory = new Map(), writes = [], transport = [];
  let rng = { ...initial };
  globalThis.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
  Math.random = () => { rng.draws++; rng.seed = (Math.imul(rng.seed, 1664525) + 1013904223) >>> 0; return rng.seed / 4294967296; };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => { writes.push({ method: 'setItem', key, value: String(value) }); memory.set(key, String(value)); },
    removeItem: key => { writes.push({ method: 'removeItem', key }); memory.delete(key); },
    clear: () => { writes.push({ method: 'clear' }); memory.clear(); },
  } });
  globalThis.fetch = async url => { transport.push({ method: 'fetch', url: String(url) }); throw new Error('Independent engine cannot use transport'); };
  Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: class { constructor(url) { transport.push({ method: 'socket', url: String(url) }); throw new Error('Independent engine cannot open a socket'); } } });
  return {
    snapshot: () => ({ rng: { ...rng }, now: Date.now(), storage: Object.fromEntries(memory), writes: clone(writes), transport: clone(transport) }),
    reset: seed => { rng = { seed, draws: 0 }; },
    restore: () => {
      globalThis.Date = OriginalDate; Math.random = originalRandom; globalThis.fetch = originalFetch;
      if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage); else delete globalThis.localStorage;
      if (oldSocket) Object.defineProperty(globalThis, 'WebSocket', oldSocket); else delete globalThis.WebSocket;
    },
  };
}
const { build } = await import('esbuild');
const { chromium } = await import('../lib/playwrightLoader.mjs');
const baselineFile = path.join(OUT, 'independent-engine.mjs');
const bundled = await build({ absWorkingDir: ROOT, stdin: { contents: `
  export { NBA_CAREER_SPORT as nba } from './src/lib/nbaCareerSport';
  export { NFL_CAREER_SPORT as nfl } from './src/lib/nflCareerSport';
  export { MLB_CAREER_SPORT as mlb } from './src/lib/mlbCareerSport';
  export { NHL_CAREER_SPORT as nhl } from './src/lib/nhlCareerSport';
  export { createUsCareerProspect, loadUsCareerProspect } from './src/lib/usCareerProspect';
  export { preDraftStart, preDraftPlaySeason, preDraftChoose, preDraftShowcase, preDraftRunDraft } from './src/lib/careerPreDraft';
  export { defaultAppearance } from './src/lib/soccerCareerAppearance';
  export { keyedRng } from './src/lib/keyedRng';
  export { summerOn, newSummerSalt } from './src/lib/usCareerSummer';
  export { manualRetire } from './src/lib/usCareerRetirementFlow';
`, resolveDir: ROOT }, bundle: true, write: false, format: 'esm', platform: 'node', metafile: true, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'silent' });
fs.writeFileSync(baselineFile, bundled.outputFiles[0].contents);
writeJSON('independent-engine-metafile.json', bundled.metafile);
let E;
const fixtures = {}, origins = [], env = oracleEnvironment();
const prospectSave = p => ({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: p });
function careerFromProspect(sport, prospect) {
  const state = prospect.state, outcome = state.draft, rng = E.keyedRng(`${prospect.seed}|career`);
  const arch = sport.create.archetypes[prospect.pos].find(item => item.id === prospect.archetypeId);
  const c = sport.startCareer(prospect.name, prospect.pos, arch, rng, prospect.appearance, prospect.eraId, { ...outcome, pot: state.pot, health: outcome.devSeasons.length ? 100 : state.health, prospect: state });
  const teamQuality = sport.rollTeamQuality(null, rng);
  sport.assignRole(c, teamQuality, rng);
  if (E.summerOn(sport.summer)) c.summerSalt = E.newSummerSalt(rng);
  if (c.draftPick > 0 && outcome.devSeasons.length === 0) sport.draftNightInbox(c);
  return { c, phase: 'season', teamQuality, coach: null };
}
try {
  const importBefore = env.snapshot();
  E = await import(pathToFileURL(baselineFile).href);
  report.baseline = { sha256: digest(bundled.outputFiles[0].contents), inputs: Object.keys(bundled.metafile.inputs), importBefore, importAfter: env.snapshot() };
  assert(!report.baseline.inputs.some(file => /UsCareerBoard|UsCareerSaveNotice/.test(file)), 'Independent oracle does not import product save writers or notice');
  for (const [index, slug] of SLUGS.entries()) {
    env.reset(108400 + index); const before = env.snapshot(), sport = E[slug], pos = sport.create.defaultPos;
    assert.equal(sport.saveKey, saveKey(slug));
    const p = E.createUsCareerProspect(sport, { name: `Native ${sport.label} Recovery`, pos, archetypeId: sport.create.archetypes[pos][0].id, eraId: 'now', appearance: E.defaultAppearance(), seed: `${slug}:native-save-1084` });
    const desc = sport.preDraft(p.eraId), states = [clone(p)];
    p.state = E.preDraftStart(desc, { ...p, routeId: desc.routes[0].id }); states.push(clone(p));
    for (let n = 0; n < 12 && p.state.phase !== 'showcase'; n++) {
      assert(['season', 'choice'].includes(p.state.phase), 'Actual prospect reaches showcase through seasons and choices');
      p.state = p.state.phase === 'season' ? E.preDraftPlaySeason(desc, p.state) : E.preDraftChoose(desc, p.state, 0);
      states.push(clone(p));
    }
    assert.equal(p.state.phase, 'showcase'); assert(E.loadUsCareerProspect(sport, p));
    const showcased = { ...clone(p), state: E.preDraftShowcase(desc, clone(p.state), 'steady') };
    const drafted = { ...clone(showcased), state: E.preDraftRunDraft(desc, clone(showcased.state)) };
    assert.equal(drafted.state.phase, 'done');
    const career = careerFromProspect(sport, drafted);
    const retired = clone(career), retirementRng = E.keyedRng(`${slug}:native-retired-1084`);
    for (let year = 0; year < 2; year++) {
      sport.campBattle(retired.c, retired.teamQuality, retirementRng);
      sport.simSeason(retired.c, retired.teamQuality, retirementRng);
      sport.progress(retired.c, retirementRng);
      retired.teamQuality = sport.rollTeamQuality(retired.teamQuality, retirementRng);
    }
    E.manualRetire(retired.c); retired.c.retired = true; retired.phase = 'retired';
    retired.c.pendingRivalryEvent = null; retired.c.pendingRivalryChoice = null;
    fixtures[slug] = { initial: prospectSave(p), showcased: prospectSave(showcased), drafted: prospectSave(drafted), career, retired, staging: 'Actual initialization and pre-draft reducers through showcase; native plays showcase, draft and join. Deletion case uses two actual career seasons, actual manualRetire plus retired flag, with pending rivalry UI cleared explicitly.' };
    origins.push({ slug, before, states, after: env.snapshot(), fixture: clone(fixtures[slug]) });
  }
  report.fixtureEnvironment = env.snapshot();
  assert.deepEqual(report.fixtureEnvironment.writes, []); assert.deepEqual(report.fixtureEnvironment.transport, []);
} catch (error) { report.error = { name: error.name, message: error.message, stack: error.stack }; throw error; }
finally { env.restore(); writeJSON('fixture-origins.json', origins); writeJSON('fixtures.json', fixtures); save(); }

const protectedStorage = { 'soccerCareerSave': '{"native-protected":1084}', 'unrelated-career-save': '{"keep":"exact"}', 'dukb-local-completions': '[]', 'dukb-streaks-v1': '{}', 'dukb-play-diary-v1': '[]' };
const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); }); });
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '', browser, activePage, activeRow, serverStopping = false;
const pendingRoutes = new Set();
fs.writeFileSync(path.join(OUT, 'server.log'), '');
const serverOutput = data => { serverLog += data; fs.appendFileSync(path.join(OUT, 'server.log'), data); };
server.stdout.on('data', serverOutput); server.stderr.on('data', serverOutput);
for (const type of ['error', 'exit']) server.on(type, (value, signal) => {
  const event = { type, at: new Date().toISOString(), stopping: serverStopping, value: type === 'error' ? String(value) : value, signal: signal ?? null };
  report.serverEvents.push(event);
  if (!serverStopping) report.transportErrors.push({ kind: 'owned-server', ...event });
  save();
});
const serverClosed = new Promise(resolve => server.once('close', resolve));
const serverReady = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Owned server timeout: ${serverLog}`)), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
});
async function settle(page) {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
    await new Promise((resolve, reject) => { let frames = 0, stable = 0, last = scrollY; const frame = () => {
      stable = Math.abs(last - scrollY) < .1 ? stable + 1 : 0; last = scrollY;
      if (stable >= 10) resolve(); else if (++frames >= 150) reject(new Error('Viewport did not settle')); else requestAnimationFrame(frame);
    }; requestAnimationFrame(frame); });
  });
}
async function loadedFonts(page) {
  const rows = await page.evaluate(async () => {
    await document.fonts.ready; const rows = [];
    for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
      const faces = await document.fonts.load(`${weight} 16px "${family}"`, 'Career save recovery');
      rows.push({ family, weight, faces: faces.map(face => ({ family: face.family, weight: face.weight, status: face.status })) });
    }
    return rows;
  });
  assert(rows.every(row => row.faces.length && row.faces.every(face => face.status === 'loaded' && face.family.replaceAll('"', '') === row.family && face.weight === String(row.weight))), 'All eight real template font faces are loaded');
  return rows;
}
async function activate(locator, profile) { if (profile.touch) await locator.tap(); else { await locator.focus(); await locator.press('Enter'); } }
async function navigate(locator, row, label) { row.navigation.push(label); await locator.scrollIntoViewIfNeeded(); }
const snapshot = page => page.evaluate(() => {
  const s = window.__usSaveAudit, main = document.querySelector('main'), copy = main?.cloneNode(true);
  copy?.querySelectorAll('[data-us-career-save-error]').forEach(node => node.remove());
  return { storage: Object.fromEntries(Object.entries(localStorage).sort(([a], [b]) => a.localeCompare(b))), writes: structuredClone(s.writes), rng: { seed: s.seed, draws: s.draws }, now: Date.now(), scrollY,
    gameText: copy?.textContent?.replace(/\s+/g, ' ').trim(), phase: document.querySelector('[data-prospect-phase]')?.getAttribute('data-prospect-phase') ?? null,
    focus: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.slice(0, 140), events: structuredClone(s.events), layout: s.layout() };
});
async function recoveryGeometry(page) {
  return page.locator('[data-us-career-save-error]').evaluate((node, viewport) => {
    const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const button = node.querySelector('button'), p = node.querySelector('p'), b = button.getBoundingClientRect();
    return { operation: node.getAttribute('data-save-operation'), role: node.getAttribute('role'), text: p.textContent, buttonText: button.textContent.trim(), html: node.outerHTML,
      viewport, layoutViewport: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth, notice: rect(node), button: rect(button), font: parseFloat(getComputedStyle(p).fontSize), buttonFont: parseFloat(getComputedStyle(button).fontSize),
      textWidth: { scroll: p.scrollWidth, client: p.clientWidth }, hit: button.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)), scrollY };
  }, page.viewportSize());
}
function checkRecovery(value, operation) {
  assert.equal(value.operation, operation, 'Recovery identifies the pending storage operation');
  assert.equal(value.role, 'alert', 'Failed save is announced as an alert');
  assert.equal(value.text, operation === 'write' ? 'Your latest progress has not been saved. Stay on this page and try again.' : 'Your reset has not been saved. This device may still load the previous career. Stay on this page and retry, or create a new player to replace it.', 'Recovery explains the unsaved operation honestly');
  assert.equal(value.buttonText, 'Retry save');
  assert(value.font >= 12 && value.buttonFont >= 12, 'Recovery text is at least 12px');
  assert(value.button.width >= 44 && value.button.height >= 44, 'Retry has a 44px target');
  const visible = box => box.x >= -1 && box.right <= value.viewport.width + 1 && box.y >= -1 && box.bottom <= value.viewport.height + 1;
  assert(visible(value.notice), 'Recovery notice is visible without driver navigation');
  assert(visible(value.button) && value.hit, 'Retry is visible and owns its hit target');
  assert(value.documentWidth <= value.viewport.width + 1 && value.textWidth.scroll <= value.textWidth.client + 1, 'Recovery has no horizontal overflow or clipped text');
}
function checkProtected(row, value) {
  for (const [key, bytes] of Object.entries(row.protected)) assert.equal(value.storage[key], bytes, `Other career or protected storage stays exact: ${key}`);
  for (const attempt of value.writes) assert(!Object.hasOwn(row.protected, attempt.key), `Protected key receives no write: ${attempt.key}`);
}
function quietRetry(before, after) {
  assert.deepEqual(after.rng, before.rng, 'Retry consumes no random draw');
  assert.equal(after.now, before.now);
  assert.equal(after.gameText, before.gameText, 'Retry does not replay a gameplay action');
}
function transportHealthy() {
  assert.deepEqual(report.transportErrors, [], 'Owned transport and server have no failed operation');
  for (const row of report.cases.concat(report.deletions)) assert.deepEqual(row.assetErrors, [], `Owned requests remain healthy for ${row.id}`);
}
async function openCase(slug, profile, kind, initial) {
  const id = `${profile.width}-${slug}-${kind}`, key = saveKey(slug);
  const protectedValues = { ...protectedStorage, ...Object.fromEntries(SLUGS.filter(other => other !== slug).map(other => [saveKey(other), JSON.stringify(fixtures[other].career)])) };
  const row = { id, slug, profile, kind, key, staging: fixtures[slug].staging, protected: protectedValues, stages: [], screenshots: [], recovery: [], navigation: [], network: [], unexpectedRequests: [], assetResponses: [], errors: [], consoleErrors: [], assetErrors: [], sockets: [], complete: false,
    routePhase: 'opening', routeLifecycle: [], localRequests: [] };
  (kind === 'latest-write' ? report.cases : report.deletions).push(row); activeRow = row; save();
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch, deviceScaleFactor: 1, colorScheme: profile.theme, reducedMotion: profile.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
    { name: key, value: JSON.stringify(initial) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: profile.theme }, { name: 'dukb-guest-handle', value: 'TidyAnchor-17' }, { name: `rules-gate-seen:/${slug}-my-career`, value: '1' }, ...Object.entries(protectedValues).map(([name, value]) => ({ name, value })),
  ] }] } });
  const localPending = new Set();
  const phase = name => { row.routePhase = name; row.routeLifecycle.push({ phase: name, at: new Date().toISOString(), pending: localPending.size }); save(); };
  const drain = async name => {
    phase(name);
    while (localPending.size) await Promise.all([...localPending]);
    phase(`${name}-drained`); transportHealthy();
  };
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === BASE && ['GET', 'HEAD'].includes(request.method())) {
      const receipt = { id: row.localRequests.length + 1, rowId: id, phase: row.routePhase, url: url.href, method: request.method(), started: new Date().toISOString(), connection: 'close', maxRedirects: 0, maxRetries: 0 };
      row.localRequests.push(receipt); saveSoon();
      const task = (async () => {
        try {
          // Avoid pooled loopback socket reuse; the previous socket failure's cause remains unconfirmed.
          const response = await route.fetch({ headers: { ...request.headers(), connection: 'close' }, maxRedirects: 0, maxRetries: 0 });
          receipt.status = response.status(); receipt.responseUrl = response.url(); receipt.headers = response.headers(); saveSoon();
          const body = await response.body(); receipt.bodyBytes = body.length; receipt.bodySha256 = digest(body); saveSoon();
          assert.equal(new URL(response.url()).origin, BASE, 'Owned response stays on the original local server');
          assert(response.status() >= 200 && response.status() < 300, 'Owned application response succeeds without a redirect');
          await route.fulfill({ response, body }); receipt.fulfilled = true;
        } catch (error) {
          receipt.error = { name: error.name, message: error.message, stack: error.stack };
          report.transportErrors.push({ kind: 'owned-route', rowId: id, requestId: receipt.id, phase: row.routePhase, url: url.href, error: receipt.error });
          row.assetErrors.push(`${url.href}: ${error.message}`); save();
          try { await route.abort('failed'); receipt.aborted = true; }
          catch (abortError) { receipt.abortError = String(abortError); }
        } finally { receipt.ended = new Date().toISOString(); receipt.endPhase = row.routePhase; saveSoon(); }
      })();
      localPending.add(task); pendingRoutes.add(task);
      const release = () => { localPending.delete(task); pendingRoutes.delete(task); };
      task.then(release, release); return task;
    }
    const receipt = { method: request.method(), origin: url.origin, path: url.pathname, query: url.search, type: request.resourceType(), handling: 'blocked' }; row.network.push(receipt);
    if (request.method() === 'GET' && assets.has(url.href)) {
      const asset = assets.get(url.href); receipt.handling = 'actual cached asset'; row.assetResponses.push({ url: url.href, sha256: digest(asset.body), bytes: asset.body.length });
      return route.fulfill({ status: 200, ...asset });
    }
    if (request.method() === 'GET' && url.origin === serviceOrigin && url.pathname === '/rest/v1/live_scores') {
      receipt.handling = 'explicit local empty live-board read'; return route.fulfill({ status: 200, contentType: 'application/json', headers: { date: new Date(NOW).toUTCString() }, body: '[]' });
    }
    row.unexpectedRequests.push(receipt); return route.abort();
  });
  await context.routeWebSocket('**/*', socket => { row.sockets.push(socket.url()); socket.close(); });
  await context.addInitScript(({ seed, now, key }) => {
    const s = window.__usSaveAudit = { seed, draws: 0, key, blocked: false, writes: [], events: [] };
    const OriginalDate = Date;
    window.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    Math.random = () => { s.draws++; s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0; return s.seed / 4294967296; };
    s.layout = () => ({ scrollY, width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth, visual: window.visualViewport ? { width: visualViewport.width, height: visualViewport.height, offsetTop: visualViewport.offsetTop, pageTop: visualViewport.pageTop } : null });
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function(...args) {
        if (this !== localStorage) return Reflect.apply(original, this, args);
        const item = { method, key: method === 'clear' ? '*' : String(args[0]), value: method === 'setItem' ? String(args[1]) : null, refused: s.blocked && String(args[0]) === key, rng: { seed: s.seed, draws: s.draws }, now: Date.now() };
        s.writes.push(item);
        if (item.refused) throw new DOMException('Native test refuses only this sport save', 'QuotaExceededError');
        return Reflect.apply(original, this, args);
      };
    }
    for (const type of ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup', 'focusin']) window.addEventListener(type, event => {
      const target = event.target instanceof Element ? event.target.closest('button') || event.target : null;
      s.events.push({ type, trusted: event.isTrusted, key: event.key, pointerType: event.pointerType, target: target?.getAttribute('aria-label') || target?.textContent?.slice(0, 160), layout: s.layout() });
    }, true);
  }, { seed: SEED, now: NOW, key });
  const page = await context.newPage(); activePage = page; page.setDefaultTimeout(15000);
  page.on('pageerror', error => row.errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
  page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.assetErrors.push(`${request.url()}: ${request.failure()?.errorText}`); });
  page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assetErrors.push(`${response.url()}: ${response.status()}`); });
  const stage = async label => { transportHealthy(); const state = await snapshot(page); row.stages.push({ label, ...state }); checkProtected(row, state); save(); transportHealthy(); return state; };
  const picture = async label => { const file = `${id}-${label}.png`; await page.screenshot({ path: path.join(OUT, file), fullPage: false }); row.screenshots.push(file); save(); };
  const notice = async (label, operation) => {
    await page.locator('[data-us-career-save-error]').waitFor();
    if (!row.firstFailureToast) {
      const text = 'Your latest changes could not be saved. Stay on this page and use Retry save.';
      const toast = page.locator('[data-sonner-toast]').filter({ hasText: text });
      await toast.waitFor(); await settle(page);
      row.firstFailureToast = await toast.evaluate((node, viewport) => { const r = node.getBoundingClientRect(); return { text: node.textContent, x: r.x, y: r.y, right: r.right, bottom: r.bottom, viewport, layoutViewport: { width: innerWidth, height: innerHeight } }; }, { width: profile.width, height: profile.height });
      assert.equal(await toast.count(), 1, 'First failed operation creates one real warning toast');
      const t = row.firstFailureToast;
      assert(t.text.includes(text) && t.x >= -1 && t.right <= t.viewport.width + 1 && t.y >= -1 && t.bottom <= t.viewport.height + 1, 'First failure warning toast is immediately visible');
    }
    await settle(page); const value = await recoveryGeometry(page); row.recovery.push({ label, value }); await stage(label); await picture(label); checkRecovery(value, operation); return value;
  };
  await page.goto(`${BASE}/${slug}-my-career`, { waitUntil: 'networkidle' });
  row.fonts = await loadedFonts(page); await settle(page);
  const initialState = await stage('loaded');
  assert.equal(initialState.storage[key], JSON.stringify(initial), 'Quiet route restore preserves original save bytes');
  assert.equal(await page.locator('[data-us-career-save-error]').count(), 0, 'Healthy restore has no failed-save warning');
  phase('active');
  return { row, page, context, stage, picture, notice, initialState, drain, phase, button: name => page.getByRole('button', { name, exact: true }) };
}
async function controlNotice(session) {
  const { row, page, picture } = session;
  for (const fault of ['warning', 'font', 'offscreen-retry']) {
    const target = page.locator(fault === 'offscreen-retry' ? '[data-us-career-save-error] button' : '[data-us-career-save-error] p');
    const original = await target.evaluate(node => ({ text: node.textContent, style: node.getAttribute('style') }));
    const item = { id: row.id, fault, before: await recoveryGeometry(page), original }; report.controls.push(item); save();
    try {
      await target.evaluate((node, fault) => { if (fault === 'warning') node.textContent = 'Progress saved.'; else if (fault === 'font') node.style.fontSize = '1px'; else node.style.transform = 'translateY(1000px)'; }, fault);
      item.faulted = await recoveryGeometry(page); assert.notDeepEqual(item.faulted, item.before, 'DOM control changes the measured recovery');
      await picture(`fault-${fault}`);
      let failure; try { checkRecovery(item.faulted, 'write'); } catch (error) { failure = error; }
      const mapped = { warning: 'Recovery explains the unsaved operation honestly', font: 'Recovery text is at least 12px', 'offscreen-retry': 'Retry is visible and owns its hit target' }[fault];
      assert.equal(failure?.name, 'AssertionError'); assert(failure.message.startsWith(mapped), 'DOM fault reaches its mapped assertion');
      item.error = { name: failure.name, message: failure.message, stack: failure.stack };
    } finally {
      await target.evaluate((node, original) => { node.textContent = original.text; if (original.style === null) node.removeAttribute('style'); else node.setAttribute('style', original.style); }, original);
      item.restored = await recoveryGeometry(page); assert.deepEqual(item.restored, item.before, 'DOM control restores exact notice HTML and geometry'); checkRecovery(item.restored, 'write'); await picture(`restored-${fault}`); save();
    }
  }
}
function lastAttempt(state, key) { return state.writes.filter(item => item.key === key).at(-1); }
async function refusedRetry(session, label) {
  const { row, page, stage, button } = session;
  const before = await stage(`${label}-before`), intended = lastAttempt(before, row.key);
  assert(intended?.refused, 'A real writer failed before Retry');
  await activate(button('Retry save'), row.profile); await settle(page);
  const after = await stage(`${label}-after`), extra = after.writes.slice(before.writes.length);
  assert.equal(extra.length, 1, 'Refused Retry attempts storage once');
  assert.deepEqual({ method: extra[0].method, key: extra[0].key, value: extra[0].value, refused: extra[0].refused }, { method: intended.method, key: intended.key, value: intended.value, refused: true }, 'Refused Retry repeats exactly the pending storage operation');
  assert.deepEqual(after.storage, before.storage); quietRetry(before, after);
  assert(Math.abs(after.scrollY - before.scrollY) <= 1, 'Refused Retry preserves the viewport');
  checkRecovery(await recoveryGeometry(page), intended.method === 'removeItem' ? 'remove' : 'write');
}
async function recover(session, label, expected) {
  const { row, page, stage, picture, button } = session;
  const before = await stage(`${label}-before`), intended = lastAttempt(before, row.key);
  assert(intended?.refused); assert.equal(intended.method, 'setItem');
  assert.deepEqual(JSON.parse(intended.value), expected, 'Latest intended payload equals the actual engine outcome');
  await page.evaluate(() => { window.__usSaveAudit.blocked = false; });
  await activate(button('Retry save'), row.profile); await page.locator('[data-us-career-save-error]').waitFor({ state: 'hidden' }); await settle(page);
  const after = await stage(`${label}-after`), extra = after.writes.slice(before.writes.length);
  assert.equal(extra.length, 1, 'Successful Retry performs one storage write');
  assert.equal(extra[0].method, 'setItem'); assert.equal(extra[0].key, row.key); assert.equal(extra[0].value, intended.value); assert.equal(extra[0].refused, false);
  assert.equal(after.storage[row.key], intended.value, 'Successful Retry commits exact latest intended bytes'); quietRetry(before, after); await picture(label);
  row.preReload = after; save();
  await session.drain('before-reload'); session.phase('reloading');
  await page.reload({ waitUntil: 'networkidle' }); row.reloadFonts = await loadedFonts(page); await settle(page);
  await session.drain('after-reload'); session.phase('active-after-reload');
  const restored = await stage(`${label}-reloaded`);
  assert.equal(restored.storage[row.key], intended.value, 'Real reload restores the recovered save byte for byte');
  assert.deepEqual(JSON.parse(restored.storage[row.key]), expected);
  assert.equal(await page.locator('[data-us-career-save-error]').count(), 0);
  assert.equal(restored.writes.filter(item => item.key === row.key).length, 0, 'Restoring the healthy saved outcome does not replay its writer');
  await picture(`${label}-reloaded`);
  await proveRestoredGameplay(session, expected);
}
async function proveRestoredGameplay(session, expected) {
  const { row, page, stage, picture, button } = session, sport = E[row.slug];
  if (expected.c) {
    await page.locator('[data-career-hub-buttons]').waitFor();
    const restored = await stage('restored-career-visible');
    assert(restored.gameText.includes(`${expected.c.name} · ${expected.c.pos}`), 'Reload renders the recovered player identity');
    assert(restored.gameText.includes(sport.teamLabelOf(expected.c.team)), 'Reload renders the recovered team');
    assert(new RegExp(`OVR\\s*${expected.c.ovr}\\b`).test(restored.gameText), 'Reload renders the earned career rating');
    const bank = page.locator('[data-career-hub-buttons]').getByRole('button', { name: /The Bank/ });
    await navigate(bank, row, 'Post-reload actual Bank action proves the recovered career is mounted'); await activate(bank, row.profile); await settle(page);
    await activate(button('🛒 Shop'), row.profile); await activate(button('💪 Body'), row.profile);
    const item = sport.shopItems.find(item => item.category === 'body' && item.name === 'Private Chef');
    assert(item && item.cost === 0 && item.oneTime, 'Unchanged engine offers an affordable one-time post-reload action');
    const hire = page.getByText(item.name, { exact: true }).locator('xpath=ancestor::div[2]').getByRole('button', { name: 'Hire', exact: true });
    await navigate(hire, row, 'User hires actual shop staff after reload'); await settle(page);
    const before = await stage('post-reload-action-before'), oracle = oracleEnvironment(before.rng);
    let next;
    row.postReloadProof = { kind: 'actual shop hire', itemId: item.id, before };
    try {
      row.postReloadProof.oracleBefore = oracle.snapshot();
      const result = sport.buyItem(clone(expected.c), item.id); assert(result, 'Unchanged engine accepts actual post-reload hire');
      next = { ...clone(expected), c: result.state };
      row.postReloadProof.expected = next; row.postReloadProof.oracleAfter = oracle.snapshot();
      assert.deepEqual(row.postReloadProof.oracleAfter, row.postReloadProof.oracleBefore, 'Actual shop engine uses no random draw or persistence');
    } finally { oracle.restore(); }
    await activate(hire, row.profile); await settle(page);
    const after = await stage('post-reload-action-after'), extra = after.writes.slice(before.writes.length);
    row.postReloadProof.after = after;
    assert.equal(extra.length, 1); assert.equal(extra[0].key, row.key); assert.equal(extra[0].refused, false);
    assert.deepEqual(JSON.parse(after.storage[row.key]), next, 'Actual post-reload action saves the complete independently derived career');
    assert.deepEqual(after.rng, row.postReloadProof.oracleAfter.rng);
    assert.notDeepEqual(next, expected, 'The post-reload action changes actual career state');
    assert(next.c.purchased.includes(item.id));
    assert.equal(await page.getByText(item.name, { exact: true }).locator('..').getByText('OWNED', { exact: true }).count(), 1, 'Actual shop renders the earned purchase');
    await picture('post-reload-actual-action');
  } else {
    const journey = page.locator('[data-prospect-phase="routes"]'); await journey.waitFor();
    const p = expected.prospect, desc = sport.preDraft(p.eraId), route = desc.routes[0];
    row.restoredProspect = await journey.evaluate(node => ({ text: node.textContent.replace(/\s+/g, ' ').trim(), meters: [...node.querySelectorAll('dl > div')].map(item => ({ label: item.querySelector('dt')?.textContent, value: item.querySelector('dd')?.textContent })) }));
    assert(row.restoredProspect.text.includes(p.name), 'Reload renders the recovered prospect identity');
    assert.equal(row.restoredProspect.meters.find(item => item.label === 'Rating')?.value, String(p.rating));
    assert.equal(row.restoredProspect.meters.find(item => item.label === 'Potential')?.value, String(p.pot));
    const choose = journey.getByRole('button').filter({ hasText: route.label });
    assert.equal(await choose.count(), 1); await navigate(choose, row, 'Post-reload actual route choice proves the recovered prospect is mounted'); await settle(page);
    const before = await stage('post-reload-action-before'), oracle = oracleEnvironment(before.rng);
    let next;
    row.postReloadProof = { kind: 'actual prospect route choice', routeId: route.id, before };
    try {
      row.postReloadProof.oracleBefore = oracle.snapshot();
      next = prospectSave({ ...clone(p), state: E.preDraftStart(desc, { seed: p.seed, routeId: route.id, rating: p.rating, pot: p.pot, pos: p.pos }) });
      row.postReloadProof.expected = next; row.postReloadProof.oracleAfter = oracle.snapshot();
      assert.deepEqual(row.postReloadProof.oracleAfter, row.postReloadProof.oracleBefore, 'Actual prospect route choice uses its saved seed');
    } finally { oracle.restore(); }
    await activate(choose, row.profile); await page.locator('[data-prospect-phase="season"]').waitFor(); await settle(page);
    const after = await stage('post-reload-action-after'), extra = after.writes.slice(before.writes.length);
    row.postReloadProof.after = after;
    assert.equal(extra.length, 1); assert.equal(extra[0].key, row.key); assert.equal(extra[0].refused, false);
    assert.deepEqual(JSON.parse(after.storage[row.key]), next, 'Actual post-reload route choice saves the complete recovered prospect outcome');
    assert.deepEqual(after.rng, row.postReloadProof.oracleAfter.rng); assert.notDeepEqual(next, expected);
    await picture('post-reload-actual-action');
  }
}
async function finishCase(session) {
  const { row, context } = session;
  await session.drain('before-close');
  assert(row.stages.some(stage => stage.events.some(event => event.trusted && event.type === (row.profile.touch ? 'pointerup' : 'keydown'))), 'Journey uses trusted browser input');
  assert(row.network.every(request => request.method === 'GET'), 'No external write or scoring request is attempted');
  assert.deepEqual(row.unexpectedRequests, []); assert.deepEqual(row.errors, []); assert.deepEqual(row.consoleErrors, []); assert.deepEqual(row.assetErrors, []); assert.deepEqual(row.sockets, []);
  session.phase('closing'); await context.close(); await session.drain('after-close');
  assert.deepEqual(row.assetErrors, []); assert.deepEqual(row.errors, []); assert.deepEqual(row.consoleErrors, []);
  row.complete = true; session.phase('closed'); activePage = null; activeRow = null;
}
try {
  await serverReady; browser = await chromium.launch({ headless: true });
  for (const profile of profiles) for (const slug of SLUGS) {
    const f = fixtures[slug], session = await openCase(slug, profile, 'latest-write', f.initial);
    const { page, row, stage, button, notice } = session;
    const action = page.getByRole('button', { name: /^Play it safe/ });
    await action.waitFor(); await navigate(action, row, 'Initial navigation to actual showcase action'); await settle(page); await stage('before-showcase');
    await page.evaluate(() => { window.__usSaveAudit.blocked = true; });
    await activate(action, profile); await page.locator('[data-prospect-phase="draft"]').waitFor(); await notice('showcase-refused', 'write');
    let state = await stage('showcase-payload');
    assert.equal(state.storage[row.key], session.initialState.storage[row.key]);
    assert.deepEqual(JSON.parse(lastAttempt(state, row.key).value), f.showcased, 'Refused showcase stores the actual reducer outcome');
    await refusedRetry(session, 'prospect-retry-refused');
    if (slug === 'nba') await controlNotice(session);
    await navigate(button('Draft day'), row, 'User proceeds to the actual draft after recovery proof'); await activate(button('Draft day'), profile);
    await page.locator('[data-prospect-phase="done"]').waitFor(); await notice('draft-refused', 'write'); state = await stage('draft-payload');
    assert.equal(state.storage[row.key], session.initialState.storage[row.key]); assert.deepEqual(JSON.parse(lastAttempt(state, row.key).value), f.drafted, 'Later prospect payload supersedes the earlier failed showcase');
    await navigate(button('Start your career'), row, 'User joins after draft recovery proof'); await activate(button('Start your career'), profile);
    await page.locator('[data-prospect-journey]').waitFor({ state: 'hidden' }); await notice('career-refused', 'write'); state = await stage('career-payload');
    assert.equal(state.storage[row.key], session.initialState.storage[row.key]); assert.deepEqual(JSON.parse(lastAttempt(state, row.key).value), f.career, 'Career writer supersedes failed prospect payload on the same key');
    assert.notEqual(lastAttempt(state, row.key).value, JSON.stringify(f.drafted));
    await refusedRetry(session, 'career-retry-refused');
    await recover(session, 'career-recovered', f.career); await finishCase(session);
  }
  for (const [index, slug] of SLUGS.entries()) {
    const profile = profiles[index % profiles.length], session = await openCase(slug, profile, 'delete-and-replace', fixtures[slug].retired);
    const { page, row, stage, notice, button } = session;
    await navigate(button('New career'), row, 'User opens actual retired-career reset'); await activate(button('New career'), profile);
    await page.getByRole('alertdialog').waitFor(); await settle(page); await stage('reset-confirmation');
    await page.evaluate(() => { window.__usSaveAudit.blocked = true; });
    await activate(button('Start new career'), profile); await page.getByRole('alertdialog').waitFor({ state: 'hidden' }); await notice('delete-refused', 'remove');
    let state = await stage('delete-payload'); assert.equal(lastAttempt(state, row.key).method, 'removeItem'); assert.equal(state.storage[row.key], session.initialState.storage[row.key]);
    await refusedRetry(session, 'delete-retry-refused');
    const input = page.getByRole('textbox', { name: 'Your player name', exact: true });
    await input.fill(`Replacement ${slug.toUpperCase()}`);
    await navigate(button('Play your road to the draft'), row, 'User starts an explicitly new prospect after refused deletion'); await settle(page);
    const beforeCreate = await stage('before-replacement'), oracle = oracleEnvironment(beforeCreate.rng);
    let expected;
    try {
      row.replacementOracleBefore = oracle.snapshot(); const sport = E[slug], pos = sport.create.defaultPos;
      const prospect = E.createUsCareerProspect(sport, { name: `Replacement ${slug.toUpperCase()}`, pos, archetypeId: sport.create.archetypes[pos][0].id, eraId: 'now', appearance: E.defaultAppearance(), seed: `${slug}:${Math.floor(Math.random() * 0x100000000).toString(36)}` });
      expected = prospectSave(prospect); row.replacementOracleAfter = oracle.snapshot();
      assert.deepEqual(row.replacementOracleAfter.writes, []); assert.deepEqual(row.replacementOracleAfter.transport, []);
    } finally { oracle.restore(); }
    row.replacementExpected = expected; save();
    await activate(button('Play your road to the draft'), profile); await page.locator('[data-prospect-phase="routes"]').waitFor(); await notice('replacement-refused', 'write');
    state = await stage('replacement-payload'); assert.equal(state.storage[row.key], session.initialState.storage[row.key]);
    assert.equal(lastAttempt(state, row.key).method, 'setItem'); assert.deepEqual(JSON.parse(lastAttempt(state, row.key).value), expected, 'New prospect supersedes pending removal using the real engine');
    await recover(session, 'replacement-recovered', expected); await finishCase(session);
  }
  assert.equal(report.cases.length, 12); assert.equal(report.deletions.length, 4); assert.equal(report.controls.length, 9);
  assert(report.cases.concat(report.deletions).every(row => row.complete));
  transportHealthy(); assert.equal(pendingRoutes.size, 0, 'All owned route handlers finish before acceptance');
  report.complete = true;
} catch (error) {
  report.error = { name: error.name, message: error.message, stack: error.stack };
  if (activePage && !activePage.isClosed()) {
    try { activeRow.failureState = await snapshot(activePage); activeRow.failureGeometry = await activePage.locator('[data-us-career-save-error]').count() ? await recoveryGeometry(activePage) : null; await activePage.screenshot({ path: path.join(OUT, `${activeRow.id}-failure.png`), fullPage: false }); } catch (captureError) { report.captureError = String(captureError); }
  }
  throw error;
} finally {
  while (pendingRoutes.size) await Promise.all([...pendingRoutes]);
  await browser?.close();
  while (pendingRoutes.size) await Promise.all([...pendingRoutes]);
  serverStopping = true; server.kill(); await serverClosed; fs.writeFileSync(path.join(OUT, 'server.log'), serverLog);
  if (report.transportErrors.length || report.cases.concat(report.deletions).some(row => row.assetErrors.length)) report.complete = false;
  report.sourceAfter = sourceHashes(); report.buildAfter = buildHashes(); report.assetManifestAfter = digest(fs.readFileSync(CACHE)); report.assetPayloadAfter = assetPayloadHashes(); save();
  transportHealthy();
  assert.deepEqual(report.sourceAfter, report.sourceBefore, 'Native verification leaves original sources unchanged');
  assert.deepEqual(report.buildAfter, report.buildBefore, 'Native verification leaves actual built assets unchanged');
  assert.equal(report.assetManifestAfter, report.assetManifestSha256, 'Native verification preserves cached asset identity');
  assert.deepEqual(report.assetPayloadAfter, report.assetPayloadBefore, 'Native verification preserves every actual cached payload');
}
console.log('US career recovery: 12 actual-route latest-write journeys, 4 deletion/replacement cases, 9 effective restored DOM controls, no forwarded writes.');
