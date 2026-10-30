/* Source-only proposal. Run on a remote runner after the pinned app build.
   Visibility outcomes are measured, not predeclared. noExtraScroll poisons
   only the probe's ownership rule and is never credited as an app result. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';
import { answerConsent, storedConsent } from '../lib/answerConsent.mjs';
import { pageSeedOf, seedPages, pageDraws } from '../lib/pageSeed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.env.CBB_REPORT_OUT || path.join(ROOT, '.tmp-fx/cbb-start-reveal'));
const CONTROL = process.env.CBB_REVEAL_CONTROL || '';
assert(['', 'noExtraScroll'].includes(CONTROL), 'Known probe control only');
const SEED = pageSeedOf(import.meta.url, process.env.CBB_REPORT_SEED || '64185');
const EXPECTED_BOARD = process.env.CBB_REVEAL_BOARD_GIT || '909be808e4313157649bb901a385b3a903104af6';
assert(['91ee2a06e96f8352384a8587e37aba9a8db48f94', '909be808e4313157649bb901a385b3a903104af6'].includes(EXPECTED_BOARD), 'CBB_BOUND_BOARD_SOURCE');
const PROFILE = process.env.CBB_REVEAL_PROFILE || 'desktop';
assert(['desktop', 'phone'].includes(PROFILE), 'CBB_BOUND_VIEWPORT_PROFILE');
const VIEWPORT = PROFILE === 'phone' ? { width: 390, height: 844, deviceScaleFactor: 1 } : { width: 1280, height: 631, deviceScaleFactor: 1.5 };
const KEY = 'cbb-dynasty-save-v1', ROUTE = '/cbb-dynasty';
const SOURCE_PINS = {
  "index.html": "f6d81a169d0c98f3b86551665c5cc83c7919dc48",
  "scripts/lib/answerConsent.mjs": "c6d16997e4c06e8b35dcfd0bab5efcad3069d899",
  "scripts/lib/hostLikeServer.mjs": "21059d5e8114669df61106c125d5272d357b6236",
  "scripts/lib/pageSeed.mjs": "981886d1bfe271740c27e57cd01989bceecb4fb1",
  "scripts/lib/playwrightLoader.mjs": "4f7739e217e0a47ee82e6bfc8be1c04bed17454a",
  "src/components/cbb-dynasty/CbbDynastyBoard.tsx": "b0a37149528e5a0b15537865095263595984238a",
  "src/components/college-dynasty/CollegeDynastyBoard.tsx": EXPECTED_BOARD,
  "src/hooks/useRevealScroll.ts": "0cd106080bfb4e0461d9b86f0a973689f717d502",
  "src/index.css": "775df500bd7c9730e5b04aedd3d6b2a1564d49b4",
  "src/lib/cbbDynasty.ts": "552c505f2755bb28f6db3811538e59e4a5f1a703"
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
assert(!fs.existsSync(OUT) || fs.readdirSync(OUT).length === 0, 'Fresh evidence output directory required');
fs.mkdirSync(OUT, { recursive: true });
const report = { schema: 1, mode: CONTROL || 'measurement', seed: SEED,
  viewport: VIEWPORT, profile: PROFILE, expectedBoardGit: EXPECTED_BOARD,
  sourcePins: [], transitions: [], ownershipErrors: [], setupErrors: [], contexts: [] };
function json(name, data) { fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2) + '\n'); }
function holdSources() {
  for (const [name, expected] of Object.entries(SOURCE_PINS)) {
    const bytes = fs.readFileSync(path.join(ROOT, name)), actual = blob(bytes);
    assert.equal(actual, expected, 'Immutable source ' + name);
    report.sourcePins.push({ path: name, bytes: bytes.length, gitBlob: actual, sha256: sha(bytes) });
  }
  assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Actual app dist must exist before probe');
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
async function actualFixture() {
  const dir = path.join(OUT, 'fixtures'); fs.mkdirSync(dir, { recursive: true });
  const entry = path.join(dir, 'cbb-entry.ts'), target = path.join(dir, 'cbb-engine.cjs');
  fs.writeFileSync(entry, "export { CBB_SCHOOLS, CBB_ROUNDS, initCbb, simCbbRound, runMarch, poyRace } from '@/lib/cbbDynasty';\n");
  const result = await build({ entryPoints: [entry], outfile: target, bundle: true, platform: 'node', format: 'cjs',
    alias: { '@': path.join(ROOT, 'src') }, metafile: true, logLevel: 'silent' });
  json('fixtures/cbb-engine.meta.json', result.metafile);
  assert(!/supabase\.co/.test(fs.readFileSync(target, 'utf8')), 'Fixture engine cannot reach production database');
  const M = createRequire(import.meta.url)(target);
  let n = SEED + 1; const rng = () => { n = n * 16807 % 2147483647; return (n - 1) / 2147483646; };
  const st = M.initCbb('DUKE', rng, { depth: true });
  for (let r = 1; r <= M.CBB_ROUNDS; r++) { M.simCbbRound(st, rng); if (r < M.CBB_ROUNDS) st.round += 1; }
  const resultMarch = M.runMarch(st, rng), poy = M.poyRace(st, rng);
  assert(resultMarch.champion && poy.length === 4, 'Actual closed season and award field');
  st.titles.push({ season: st.season, team: resultMarch.champion }); st.poyWinners.push(poy[0].name);
  st.seasonsPlayed += 1; if (resultMarch.champion === st.myTeam) st.myTitles += 1;
  const value = JSON.stringify({ st, phase: 'recap', recruits: null, portal: null, march: { result: resultMarch, poy } });
  fs.writeFileSync(path.join(dir, 'closed-recap.save.json'), value);
  return { value, season: st.season, schools: M.CBB_SCHOOLS };
}
let browser, server, serverLog = '';
const contexts = [];
const observing = new WeakSet();
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
async function open(base, fonts, id, saved) {
  const store = [{ name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' },
    { name: 'rules-gate-seen:' + ROUTE, value: '1' }];
  if (saved) store.push({ name: KEY, value: saved });
  const context = await browser.newContext({ viewport: { width: VIEWPORT.width, height: VIEWPORT.height }, deviceScaleFactor: VIEWPORT.deviceScaleFactor,
    isMobile: false, hasTouch: false, reducedMotion: 'no-preference', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: base, localStorage: store }] } });
  contexts.push(context);
  const receipt = { id, egress: [], fonts: [], pageErrors: [], consoleErrors: [], localFailures: [] };
  report.contexts.push(receipt);
  await seedPages(context, SEED);
  await context.addInitScript(() => {
    window.__cbbProbeAudit = { phase: 'prepare', owner: 'app', calls: [] };
    for (const [object, name] of [[window, 'scrollTo'], [window, 'scrollBy'], [Element.prototype, 'scrollIntoView'],
      [Element.prototype, 'scrollTo'], [Element.prototype, 'scrollBy']]) {
      const original = object[name]; if (typeof original !== 'function') continue;
      object[name] = function (...args) {
        const audit = window.__cbbProbeAudit;
        audit.calls.push({ api: name, phase: audit.phase, owner: audit.owner, y: scrollY, at: performance.now(),
          target: this instanceof Element ? this.tagName + ':' + (this.textContent || '').trim().slice(0, 60) : 'window',
          stack: new Error().stack });
        return Reflect.apply(original, this, args);
      };
    }
  });
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
  const page = await context.newPage();
  page.on('pageerror', e => receipt.pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') receipt.consoleErrors.push(m.text()); });
  page.on('requestfailed', req => { if (new URL(req.url()).origin === base) receipt.localFailures.push(req.url() + ' ' + req.failure()?.errorText); });
  page.on('response', res => { if (new URL(res.url()).origin === base && res.status() >= 400) receipt.localFailures.push(String(res.status()) + ' ' + res.url()); });
  await page.goto(base + ROUTE, { waitUntil: 'networkidle', timeout: 60000 });
  receipt.consent = await answerConsent(page);
  assert.equal(await storedConsent(page), 'rejected', 'Real essential-only consent');
  await page.waitForFunction(() => !document.body.hasAttribute('data-consent-pending'));
  receipt.fontFaces = await page.evaluate(async () => {
    const rows = [];
    for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
      const faces = await document.fonts.load(weight + ' 16px "' + family + '"', 'CBB Dynasty');
      rows.push({ family, weight, loaded: faces.length > 0 && faces.every(f => f.status === 'loaded') });
    }
    await document.fonts.ready; return rows;
  });
  assert(receipt.fontFaces.length === 8 && receipt.fontFaces.every(f => f.loaded), 'All actual site font faces loaded');
  assert(receipt.fonts.length > 0, 'Prepared real font bytes actually used');
  return { page, receipt };
}
async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(1100);
}
async function prepare(page, locator, label) {
  assert(!observing.has(page), 'CBB_PROBE_NO_EXTRA_SCROLL: preparation is forbidden after a critical press');
  await page.evaluate(() => { window.__cbbProbeAudit.phase = 'prepare'; });
  assert.equal(await locator.count(), 1, 'Unique real control: ' + label);
  await locator.scrollIntoViewIfNeeded(); await settle(page);
  const box = await locator.boundingBox(); assert(box && box.width > 0 && box.height > 0, 'Real hit box: ' + label);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  assert(point.x > 0 && point.x < VIEWPORT.width && point.y > 0 && point.y < VIEWPORT.height, 'Control center visible before press');
  assert(await locator.evaluate((el, p) => el.contains(document.elementFromPoint(p.x, p.y)), point), 'Actual control owns hit point');
  return point;
}
async function geometry(page, expectedName) {
  return page.evaluate(({ key, expectedName }) => {
    const main = document.querySelector('#dukb-main');
    const play = [...(main?.querySelectorAll('button') || [])].find(b => b.textContent.trim() === 'Play');
    const board = [...(main?.children || [])].find(el => play && el.contains(play));
    const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }; };
    let inset = 0;
    for (const el of document.elementsFromPoint(innerWidth / 2, 1)) {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      if (['fixed', 'sticky'].includes(s.position) && r.top <= 1 && r.bottom > 0) inset = Math.max(inset, r.bottom);
    }
    const b = rect(board), p = rect(play), x = p && (p.left + p.right) / 2, y = p && (p.top + p.bottom) / 2;
    const hit = play && x > 0 && x < innerWidth && y > 0 && y < innerHeight && play.contains(document.elementFromPoint(x, y));
    const topVisible = !!b && b.top >= inset - 1 && b.top <= innerHeight - 44;
    const playVisible = !!p && p.top >= inset - 1 && p.bottom <= innerHeight && !!hit;
    const headings = board ? [...board.querySelectorAll('p,h1,h2,h3')].filter(el => el.textContent.trim() === expectedName).map(rect) : [];
    return { y: scrollY, width: innerWidth, height: innerHeight, documentHeight: document.documentElement.scrollHeight,
      topInset: inset, board: b, play: p, topVisible, playVisible, hit: !!hit, headings,
      sideways: document.documentElement.scrollWidth > innerWidth + 1, save: localStorage.getItem(key),
      audit: window.__cbbProbeAudit };
  }, { key: KEY, expectedName });
}
async function critical(page, receipt, id, point, expected) {
  await page.screenshot({ path: path.join(OUT, id + '.before.png'), fullPage: false });
  const before = await page.evaluate(key => ({ y: scrollY, at: performance.now(), draws: window.__pageSeed?.draws, save: localStorage.getItem(key) }), KEY);
  fs.writeFileSync(path.join(OUT, id + '.before.save.json'), before.save || 'null');
  const prior = before.save ? JSON.parse(before.save) : null;
  before.state = prior ? { phase: prior.phase, myTeam: prior.st?.myTeam, season: prior.st?.season, round: prior.st?.round } : null;
  delete before.save;
  observing.add(page);
  await page.evaluate(() => { window.__cbbProbeAudit.phase = 'observe'; window.__cbbProbeAudit.calls = []; });
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(({ key, school, season }) => {
    const p = JSON.parse(localStorage.getItem(key) || 'null');
    return p?.phase === 'season' && p.st?.myTeam === school && p.st.round === 1 && (season === null || p.st.season === season);
  }, { key: KEY, school: expected.id, season: expected.season ?? null }, { timeout: 15000 });
  await settle(page);
  let controlMutation = null;
  if (CONTROL === 'noExtraScroll' && id === 'fresh') {
    controlMutation = await page.evaluate(() => {
      const before = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      const target = before > 48 ? 0 : Math.min(128, max);
      if (Math.abs(target - before) < 32) throw new Error('Ownership control has no real scroll headroom');
      window.__cbbProbeAudit.owner = 'probe';
      window.scrollTo({ top: target, behavior: 'instant' });
      window.__cbbProbeAudit.owner = 'app';
      return { before, target };
    });
    await settle(page);
    controlMutation.after = await page.evaluate(() => scrollY);
    assert(Math.abs(controlMutation.after - controlMutation.before) >= 32, 'Ownership control really moved the page');
    console.log('CBB_CONTROL_NO_EXTRA_SCROLL_APPLIED ' + JSON.stringify(controlMutation));
  }
  const measured = await geometry(page, expected.name);
  const save = JSON.parse(measured.save);
  assert(save.st.teams[expected.id] && save.st.season >= 2026 && save.st.round === 1, 'Actual selected state exists');
  fs.writeFileSync(path.join(OUT, id + '.after.save.json'), measured.save);
  delete measured.save;
  const badOwner = measured.audit.calls.filter(call => call.phase === 'observe' && call.owner === 'probe');
  if (badOwner.length) report.ownershipErrors.push({ id, marker: 'CBB_PROBE_NO_EXTRA_SCROLL', calls: badOwner });
  const validProbe = badOwner.length === 0;
  const row = { id, expected, before, after: measured, draws: await pageDraws(page), controlMutation,
    selectedState: { myTeam: save.st.myTeam, season: save.st.season, round: save.st.round, phase: save.phase },
    validProbe, visibility: !validProbe ? 'INVALID_PROBE' : measured.topVisible && measured.playVisible && !measured.sideways ? 'GREEN' : 'RED' };
  report.transitions.push(row);
  await page.screenshot({ path: path.join(OUT, id + '.after.png'), fullPage: false });
  assert.equal(receipt.pageErrors.length, 0, 'No page error in ' + id);
  assert.equal(receipt.localFailures.length, 0, 'No local asset/font failure in ' + id);
  console.log('CBB_REVEAL_MEASURED ' + JSON.stringify({ id, visibility: row.visibility, y: measured.y,
    boardTop: measured.board?.top, playTop: measured.play?.top, topVisible: measured.topVisible, playVisible: measured.playVisible, validProbe }));
}
let exitCode = 2;
try {
  holdSources(); const fonts = preparedFonts(), fixture = await actualFixture(), base = await startServer();
  browser = await chromium.launch({ headless: true }); report.browserVersion = browser.version();
  const fresh = await open(base, fonts, 'fresh');
  const programs = fresh.page.locator('#dukb-main button').filter({ hasText: /Prestige \d+/ });
  assert.equal(await programs.count(), fixture.schools.length, 'Actual complete program chooser');
  const last = programs.last();
  const selectedName = await last.locator('span').nth(1).innerText();
  const school = fixture.schools.find(s => s.name === selectedName.trim()); assert(school, 'Selected actual program');
  const point = await prepare(fresh.page, last, 'last actual program');
  const preY = await fresh.page.evaluate(() => scrollY); assert(preY > 0, 'Last program must exercise a genuinely scrolled start');
  await critical(fresh.page, fresh.receipt, 'fresh', point, { id: school.id, name: school.name, season: 2026 });
  if (!CONTROL) {
    const next = await open(base, fonts, 'next-season', fixture.value);
    const trail = next.page.getByRole('button', { name: 'Hit the recruiting trail', exact: true });
    const trailPoint = await prepare(next.page, trail, 'actual recap recruiting action');
    await next.page.mouse.click(trailPoint.x, trailPoint.y);
    await next.page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.phase === 'recruit', KEY);
    const close = next.page.getByRole('button', { name: 'Close the class, run it back', exact: true });
    const closePoint = await prepare(next.page, close, 'bottom recruiting close');
    assert(await next.page.evaluate(() => scrollY > 0), 'Bottom recruiting action must exercise a genuinely scrolled transition');
    await critical(next.page, next.receipt, 'next-season', closePoint,
      { id: 'DUKE', name: fixture.schools.find(s => s.id === 'DUKE').name, season: fixture.season + 1 });
  }
  for (const receipt of report.contexts) {
    assert.equal(receipt.pageErrors.length, 0, 'No page error after final observations: ' + receipt.id);
    assert.equal(receipt.localFailures.length, 0, 'No local/font failure after final observations: ' + receipt.id);
  }
  if (CONTROL) {
    assert.equal(report.transitions.length, 1); assert.equal(report.ownershipErrors.length, 1);
    assert.equal(report.ownershipErrors[0].marker, 'CBB_PROBE_NO_EXTRA_SCROLL');
    report.controlOutcome = 'OWNERSHIP_CONTROL_FIRED'; exitCode = 1;
  } else {
    assert.equal(report.transitions.length, 2); assert.equal(report.ownershipErrors.length, 0);
    report.actualVisibility = Object.fromEntries(report.transitions.map(row => [row.id, row.visibility]));
    exitCode = report.transitions.some(row => row.visibility === 'RED') ? 1 : 0;
  }
} catch (error) {
  report.setupErrors.push({ message: String(error), stack: error?.stack }); exitCode = 2;
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close().catch(() => {}); server?.kill();
  fs.writeFileSync(path.join(OUT, 'server.log'), serverLog);
  report.rawExit = exitCode; json('REPORT.json', report);
  const files = [];
  function walk(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = path.join(dir, item.name); if (item.isDirectory()) walk(name);
    else { const bytes = fs.readFileSync(name); files.push({ path: path.relative(OUT, name).split(path.sep).join('/'), bytes: bytes.length, sha256: sha(bytes) }); }
  } }
  walk(OUT); json('EVIDENCE-MANIFEST.json', { schema: 1, files: files.sort((a, b) => a.path.localeCompare(b.path)) });
}
console.log('CBB_REVEAL_PROBE_EXIT ' + exitCode);
process.exitCode = exitCode;
