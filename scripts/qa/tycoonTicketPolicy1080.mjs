/* The built tycoon, real engine numbers, refused saves and trusted controls. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI, 'Ticket policy native verification runs in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARTIFACTS = path.join(ROOT, 'tycoon-ticket-policy-artifacts');
const OUT = path.join(ARTIFACTS, 'native');
const CACHE = path.resolve(process.env.TYCOON_TICKET_FONT_CACHE || path.join(ARTIFACTS, 'font-cache'));
const digest = value => createHash('sha256').update(value).digest('hex');
const sheets = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(row => new URL(row[1]).href);
assert.equal(sheets.length, 1, 'Use the actual template font stylesheet');
if (process.argv.includes('--prefetch-fonts-only')) {
  fs.mkdirSync(CACHE, { recursive: true });
  const manifest = [];
  const download = async url => {
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(url).origin));
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36' } });
    assert(response.ok, 'Actual font response succeeds');
    const body = Buffer.from(await response.arrayBuffer()), file = digest(url);
    fs.writeFileSync(path.join(CACHE, file), body);
    manifest.push({ url, file, contentType: response.headers.get('content-type'), sha256: digest(body) });
    return body.toString('utf8');
  };
  const css = await download(sheets[0]);
  const urls = [...new Set([...css.matchAll(/url\(\s*['"]?(https:\/\/[^)'"\s]+)/g)].map(row => row[1]))];
  assert(urls.length > 0, 'Actual stylesheet declares fonts');
  for (const url of urls) { assert.equal(new URL(url).origin, 'https://fonts.gstatic.com'); await download(url); }
  fs.writeFileSync(path.join(CACHE, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Prepared ${manifest.length} actual ticket-policy font dependencies.`);
  process.exit(0);
}
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(row => {
  assert(/^[a-f0-9]{64}$/.test(row.file));
  const body = fs.readFileSync(path.join(CACHE, row.file)); assert.equal(digest(body), row.sha256);
  return [row.url, { body, contentType: row.contentType }];
}));
assert(fonts.has(sheets[0]), 'Prefetch current fonts before the guarded native run');
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build the actual app before native verification');
const held = ['src/lib/stadiumTycoon.ts', 'src/hooks/useStadiumTycoon.ts', 'src/pages/StadiumTycoon.tsx', 'src/components/tycoon/TicketPolicyCard.tsx', 'src/lib/wonderkidFactory.ts', 'src/lib/tycoonRewards.ts', 'src/hooks/useTycoonRewards.ts', 'src/components/tycoon/TycoonPitch.tsx', 'src/App.tsx', 'src/integrations/supabase/client.ts', 'index.html', 'scripts/qa/tycoonTicketPolicy1080.mjs'];
const hashes = () => Object.fromEntries(held.map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))]));
const report = { sourceBefore: hashes(), cases: [], controls: [], forwardedWrites: 0 };
fs.mkdirSync(OUT, { recursive: true });
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const { chromium } = await import('../lib/playwrightLoader.mjs');
const { build } = await import('esbuild');
const bundled = await build({ absWorkingDir: ROOT, stdin: { contents: "export * from './src/lib/stadiumTycoon';", resolveDir: ROOT }, bundle: true, write: false, format: 'esm', platform: 'node', alias: { '@': path.join(ROOT, 'src') }, logLevel: 'silent' });
const engine = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const clientSource = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
const configuredOrigins = [...clientSource.matchAll(/^export const SUPABASE_URL = "(https:\/\/[^"\s]+)";/gm)];
assert.equal(configuredOrigins.length, 1, 'Bind locally intercepted completion attempts to the actual configured service');
const completionOrigin = new URL(configuredOrigins[0][1]).origin;
const NOW = Date.UTC(2026, 9, 7, 12), SAVE_KEY = engine.TYCOON_SAVE_KEY;
const initial = engine.newTycoon(NOW);
Object.assign(initial, { money: 120, lifetime: 120, fanbase: 90 });
Object.assign(initial.levels, { stands: 2, tickets: 2, snacks: 3, shop: 2, parking: 1 });
engine.settleFirsts(initial, []);
const initialBytes = engine.serializeTycoon(initial, NOW);
assert(engine.deserializeTycoon(initialBytes, NOW), 'Actual loader accepts the seeded ground');
report.baseline = { engineBundleSha256: digest(bundled.outputFiles[0].text), initialBytesSha256: digest(initialBytes), mode: 'Actual built route; actual engine initialization, loader and financial breakdown' };
fs.writeFileSync(path.join(OUT, 'initial-save.json'), initialBytes);
const protectedStorage = { 'unrelated-career-save': '{"keep":"exact"}', 'native-ticket-sentinel': 'unchanged' };
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '', browser;
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned server did not start')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
});
const panel = page => page.locator('[data-ticket-policy-panel]');
async function measure(page) {
  return panel(page).evaluate(node => {
    const box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const visible = el => el.getClientRects().length > 0;
    return { viewport: { width: innerWidth, height: innerHeight }, pane: box(node), scrollY, scrollWidth: document.documentElement.scrollWidth,
      targets: [...node.querySelectorAll('button,summary')].filter(visible).map(el => ({ ...box(el), text: el.textContent, font: parseFloat(getComputedStyle(el).fontSize) })),
      text: [...node.querySelectorAll('h3,p,dt,dd')].filter(visible).map(el => ({ text: el.textContent, font: parseFloat(getComputedStyle(el).fontSize), client: el.clientWidth, scroll: el.scrollWidth })) };
  });
}
function checkGeometry(value) {
  assert(value.scrollWidth <= value.viewport.width + 1, 'No horizontal overflow');
  assert(value.pane.x >= -1 && value.pane.right <= value.viewport.width + 1, 'Policy fits horizontally');
  assert(value.pane.y >= -1 && value.pane.bottom <= value.viewport.height + 1, 'Policy is fully visible');
  assert(value.targets.length >= 4 && value.text.length >= 8, 'Measure actual controls and readable policy content');
  for (const target of value.targets) { assert(target.width >= 44 && target.height >= 44, 'Every policy action has a 44px target'); assert(target.font >= 12, 'Controls have readable text'); }
  for (const text of value.text) { assert(text.font >= 12, 'Policy copy is at least 12px'); assert(text.scroll <= text.client + 1, 'Policy copy is not clipped'); }
}
async function loadFonts(page) {
  return page.evaluate(async () => {
    await document.fonts.ready; const result = [];
    for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
      const faces = await document.fonts.load(`${weight} 16px "${family}"`, 'Ticket offer');
      result.push({ family, weight, faces: faces.map(face => ({ family: face.family, status: face.status })) });
    }
    return result;
  });
}
try {
  await ready; browser = await chromium.launch({ headless: true });
  for (const profile of [{ width: 320, height: 780, touch: true, theme: 'dark', reduced: true }, { width: 390, height: 844, touch: true, theme: 'light', reduced: false }, { width: 1280, height: 720, touch: false, theme: 'light', reduced: false }]) {
    const id = `${profile.width}-${profile.touch ? 'touch' : 'keyboard'}-${profile.theme}`;
    const row = { id, profile, stages: [], geometry: [], screenshots: [], documents: [], network: [], fontResponses: [], errors: [], consoleErrors: [], assetErrors: [] };
    report.cases.push(row); save();
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch, colorScheme: profile.theme, reducedMotion: profile.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: SAVE_KEY, value: initialBytes }, { name: 'dukb-theme', value: profile.theme }, { name: 'dukb-guest-handle', value: 'NativeTickets-10' }, { name: 'cookie-consent', value: 'essential' }, { name: 'rules-gate-seen:/stadium-tycoon', value: '1' }, ...Object.entries(protectedStorage).map(([name, value]) => ({ name, value }))] }] } });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE && ['GET', 'HEAD'].includes(request.method())) return route.continue();
      row.network.push({ url: url.href, method: request.method(), postData: request.postData(), fulfilledLocally: true });
      if (request.method() === 'GET' && fonts.has(url.href)) { const cached = fonts.get(url.href); row.fontResponses.push({ url: url.href, bytes: cached.body.length, sha256: digest(cached.body) }); return route.fulfill({ status: 200, ...cached }); }
      const type = request.resourceType();
      if (['font', 'image', 'stylesheet'].includes(type)) { row.assetErrors.push({ type, url: url.href }); return route.abort(); }
      return route.fulfill({ status: 200, contentType: type === 'script' ? 'application/javascript' : 'application/json', body: type === 'script' ? '' : '[]' });
    });
    await context.routeWebSocket('**/*', socket => { row.errors.push({ socket: socket.url() }); socket.close(); });
    await context.addInitScript(({ saveKey }) => {
      window.__ticketNative = { refuse: false, writes: [], events: [] };
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        const refused = this === localStorage && key === saveKey && window.__ticketNative.refuse;
        if (this === localStorage) window.__ticketNative.writes.push({ key, value: String(value), refused });
        if (refused) throw new DOMException('Injected device quota refusal', 'QuotaExceededError');
        return original.call(this, key, value);
      };
      for (const type of ['pointerup', 'keydown']) document.addEventListener(type, event => window.__ticketNative.events.push({ type, trusted: event.isTrusted, key: event.key }), true);
    }, { saveKey: SAVE_KEY });
    const page = await context.newPage();
    page.on('pageerror', error => row.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
    page.on('response', response => { if (new URL(response.url()).origin === BASE && response.status() >= 400) row.assetErrors.push({ url: response.url(), status: response.status() }); });
    await page.clock.install({ time: NOW });
    const advance = () => page.clock.runFor(100);
    const storage = () => page.evaluate(key => ({ bytes: localStorage.getItem(key), ...window.__ticketNative }), SAVE_KEY);
    const retainStorage = async stage => {
      const value = await storage();
      const protectedValues = await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(protectedStorage));
      row.documents.push({ stage, ...value, protectedValues }); save();
      return value;
    };
    const activate = async (locator, advanceTime = true) => {
      await locator.scrollIntoViewIfNeeded(); const rect = await locator.boundingBox(); assert(rect && rect.width >= 44 && rect.height >= 44, 'Actual control is reachable and at least 44px');
      assert(await locator.evaluate(node => { const r = node.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return hit === node || node.contains(hit); }), 'Action owns its hit target');
      if (profile.touch) await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2);
      else { await locator.focus(); assert(await locator.evaluate(node => node === document.activeElement)); await page.keyboard.press('Space'); }
      if (advanceTime) await advance();
    };
    const capture = async name => { const file = `${id}-${name}.png`; await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' }); row.screenshots.push(file); save(); };
    const verifyMetrics = async (policy, bytes) => {
      assert.equal(await panel(page).getAttribute('data-current-policy'), policy);
      const saved = engine.deserializeTycoon(bytes, NOW); assert(saved);
      const expected = engine.ticketEconomy(saved);
      const actual = await panel(page).locator('[data-ticket-value]').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.getAttribute('data-ticket-value'), Number(node.getAttribute('data-value'))])));
      const proof = { crowd: expected.crowd, gate: expected.gatePerSec, concessions: expected.concessionsPerSec, other: expected.otherPerSec, total: expected.totalPerSec, growth: expected.growthPerSec };
      for (const [key, value] of Object.entries(proof)) { assert(Number.isFinite(value) && Number.isFinite(actual[key]), `Finite actual ${key}`); assert.equal(actual[key], value, `Displayed ${key} matches actual engine`); }
      row.stages.push({ policy, actual, expected: proof, saveSha256: digest(bytes) }); save();
    };
    try {
      await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' }); await advance();
      await page.locator('[data-office-panel="tickets"]').waitFor();
      row.fonts = await loadFonts(page);
      for (const font of row.fonts) assert(font.faces.length && font.faces.every(face => face.status === 'loaded' && face.family.replaceAll('"', '') === font.family), 'Actual font faces load');
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
      row.clock = { paused: true, policyActionsAdvanceMs: 0, navigationAdvanceMs: 100 };
      await activate(page.locator('[data-office-panel="tickets"]')); await panel(page).waitFor();
      await panel(page).scrollIntoViewIfNeeded(); checkGeometry(await measure(page));
      for (const policy of ['community', 'premium', 'standard']) {
        const before = await storage(), y = await page.evaluate(() => scrollY);
        await activate(panel(page).locator(`[data-ticket-policy="${policy}"]`), false);
        await page.waitForFunction(wanted => document.querySelector('[data-ticket-policy-panel]')?.getAttribute('data-current-policy') === wanted, policy);
        assert.equal(await page.evaluate(() => scrollY), y, 'Selecting policy keeps the viewport steady');
        const after = await retainStorage(`selected-${policy}`); assert.equal(engine.ticketPolicyOf(JSON.parse(after.bytes)), policy);
        assert(JSON.parse(after.bytes).money >= JSON.parse(before.bytes).money, 'Changing the offer does not spend or rewind money');
        await verifyMetrics(policy, after.bytes);
      }
      await capture('standard-and-engine-values');
      const prior = (await storage()).bytes;
      await page.evaluate(() => { window.__ticketNative.refuse = true; });
      await activate(panel(page).locator('[data-ticket-policy="community"]'), false);
      await page.waitForFunction(() => document.querySelector('[data-ticket-policy-panel]')?.getAttribute('data-save-status') === 'failed');
      assert.equal((await storage()).bytes, prior, 'Refusal preserves exact previous bytes');
      assert.equal(await panel(page).getAttribute('data-current-policy'), 'community');
      assert.equal(await panel(page).getAttribute('data-save-status'), 'failed');
      await panel(page).getByRole('alert').waitFor();
      const immediateAlert = await panel(page).getByRole('alert').boundingBox();
      assert(immediateAlert && immediateAlert.y >= -1 && immediateAlert.y + immediateAlert.height <= profile.height + 1, 'Save refusal is visible before driver navigation');
      row.geometry.push({ stage: 'unaided save warning', alert: immediateAlert });
      await activate(panel(page).getByRole('button', { name: 'Retry save', exact: true }), false);
      assert.equal((await storage()).bytes, prior, 'A refused Retry retains old bytes');
      await activate(panel(page).locator('[data-ticket-policy="premium"]'), false);
      await page.waitForFunction(() => document.querySelector('[data-ticket-policy-panel]')?.getAttribute('data-current-policy') === 'premium');
      assert.equal((await storage()).bytes, prior, 'A newer intended policy retains old bytes while refused');
      await retainStorage('latest-policy-refused');
      await panel(page).scrollIntoViewIfNeeded(); checkGeometry(await measure(page)); await capture('latest-policy-refused');
      await page.evaluate(() => { window.__ticketNative.refuse = false; });
      await activate(panel(page).getByRole('button', { name: 'Retry save', exact: true }), false);
      await page.waitForFunction(() => document.querySelector('[data-ticket-policy-panel]')?.getAttribute('data-save-status') === 'current');
      const accepted = await retainStorage('retry-accepted'); assert.equal(engine.ticketPolicyOf(JSON.parse(accepted.bytes)), 'premium', 'Retry stores the latest intended offer');
      assert.equal(await panel(page).getAttribute('data-save-status'), 'current'); await verifyMetrics('premium', accepted.bytes);
      row.refusedWrites = accepted.writes.filter(write => write.key === SAVE_KEY && write.refused); assert(row.refusedWrites.length >= 3, 'Actual selection and Retry refusals were exercised');
      fs.writeFileSync(path.join(OUT, `${id}-saved-premium.json`), accepted.bytes);
      await page.reload({ waitUntil: 'networkidle' }); await advance();
      await activate(page.locator('[data-office-panel="tickets"]')); await panel(page).waitFor();
      assert.equal(await panel(page).getAttribute('data-current-policy'), 'premium', 'Real reload restores the policy');
      assert.equal(await panel(page).getAttribute('data-save-status'), 'current');
      await retainStorage('reloaded-policy');
      row.reloadFonts = await loadFonts(page);
      for (const font of row.reloadFonts) assert(font.faces.length && font.faces.every(face => face.status === 'loaded' && face.family.replaceAll('"', '') === font.family), 'Actual fonts remain loaded after reload');
      await panel(page).scrollIntoViewIfNeeded(); await capture('reloaded-offer');
      const before = await measure(page); checkGeometry(before); row.geometry.push({ stage: 'restored offer', ...before });
      for (const fault of ['font', 'target', 'offscreen']) {
        const locator = fault === 'font' ? panel(page).locator('[data-ticket-policy-explanation]') : fault === 'target' ? panel(page).locator('[data-ticket-policy="community"]') : panel(page);
        const style = await locator.getAttribute('style');
        await locator.evaluate((node, kind) => { if (kind === 'font') node.style.fontSize = '8px'; if (kind === 'target') { node.style.minHeight = '20px'; node.style.height = '20px'; node.style.padding = '0'; } if (kind === 'offscreen') node.style.transform = 'translateY(1400px)'; }, fault);
        const changed = await measure(page); assert.notDeepEqual(changed, before, 'DOM control changed geometry'); let rejected = false;
        try { checkGeometry(changed); } catch (error) { assert(error instanceof assert.AssertionError, 'DOM failure is a real geometry assertion'); rejected = true; }
        assert(rejected, `Actual ${fault} fault is rejected`);
        await locator.evaluate((node, original) => { if (original === null) node.removeAttribute('style'); else node.setAttribute('style', original); }, style);
        const restored = await measure(page); assert.deepEqual(restored, before, 'DOM control restores exact geometry'); checkGeometry(restored);
        report.controls.push({ case: id, fault, changed: true, rejected, restored: true, before, faulty: changed, after: restored }); save();
      }
      await activate(page.locator('[data-office-panel="upgrades"]')); await panel(page).waitFor({ state: 'detached' });
      const protectedAfter = await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(protectedStorage)); assert.deepEqual(protectedAfter, protectedStorage);
      row.protectedStorage = { before: protectedStorage, after: protectedAfter };
      row.storage = await storage(); assert(row.storage.events.some(event => event.trusted && (profile.touch ? event.type === 'pointerup' : event.key === ' ')), 'Actual trusted touch or keyboard input occurred');
      assert.deepEqual(row.errors, []); assert.deepEqual(row.consoleErrors, []); assert.deepEqual(row.assetErrors, []);
      const writes = row.network.filter(request => !['GET', 'HEAD'].includes(request.method));
      assert.equal(writes.length, 1, 'One meaningful offer change marks one unscored session');
      for (const write of writes) {
        const url = new URL(write.url);
        assert.equal(write.method, 'POST'); assert.equal(url.origin, completionOrigin); assert.equal(url.pathname, '/rest/v1/game_completions');
        assert.equal(write.fulfilledLocally, true, 'Completion transport remains local');
        const body = JSON.parse(write.postData), rows = Array.isArray(body) ? body : [body];
        assert.equal(rows.length, 1); assert.deepEqual(Object.keys(rows[0]).sort(), ['game', 'player_name']);
        assert.equal(rows[0].game, 'stadium-tycoon'); assert.equal(rows[0].player_name, 'NativeTickets-10');
      }
      row.unscoredCompletionAttempts = writes; assert.equal(report.forwardedWrites, 0);
      row.passed = true; save(); console.log(`PASS ticket policy ${id}`);
    } catch (error) { row.failure = String(error.stack || error); save(); await page.screenshot({ path: path.join(OUT, `${id}-failure.png`), animations: 'disabled' }).catch(() => {}); fs.writeFileSync(path.join(OUT, `${id}-failure.html`), await page.content()); throw error; }
    finally { await context.close(); }
  }
  assert.equal(report.cases.filter(row => row.passed).length, 3); assert.equal(report.controls.length, 9);
  report.sourceAfter = hashes(); assert.deepEqual(report.sourceAfter, report.sourceBefore); report.passed = true; save();
  console.log('Ticket policy native:3 actual route journeys,9 effective restored DOM controls, engine values and latest-policy save/reload passed.');
} finally { if (browser) await browser.close(); server.kill('SIGTERM'); fs.writeFileSync(path.join(OUT, 'server.log'), serverLog); save(); }
