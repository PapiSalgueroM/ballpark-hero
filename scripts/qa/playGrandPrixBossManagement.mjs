/* Actual compiled page and save hook. App routing and global chrome are outside this fixture. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';
import { answerConsent, storedConsent } from '../lib/answerConsent.mjs';

assert.equal(process.env.CI, '1', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport required');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = path.resolve(process.env.GP_BOSS_BROWSER_OUT || os.tmpdir());
fs.mkdirSync(base, { recursive: true });
const output = fs.mkdtempSync(path.join(base, 'gp-management-'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['src/pages/GrandPrixBoss.tsx', 'src/hooks/useGrandPrixBoss.ts', 'src/lib/grandPrixBoss.ts', 'src/lib/saveFence.ts', 'src/hooks/useSaveFenceWatch.ts', 'src/hooks/useRevealScroll.ts', 'src/components/game/RulesGate.tsx', 'scripts/qa/fixtures/grandPrixBoss.entry.tsx'];
const held = new Map(files.map(file => [file, fs.readFileSync(path.join(root, file))]));
for (const [file, expected] of [
  ['src/pages/GrandPrixBoss.tsx', '53a400b58a3fe36776ea54dab48961a1479bcbf3c326a3806b711467950d1f18'],
  ['src/hooks/useGrandPrixBoss.ts', 'f0ec04a26c60db6c4a5b1e4b555a699979a2fdad464e404d0e906f2538b8c23b'],
  ['src/lib/grandPrixBoss.ts', '9565fb9a17489ae21d0b0451cdadede08509ac5fd8d94fbf71ffd88802895af5'],
  ['scripts/qa/fixtures/grandPrixBoss.entry.tsx', 'b008f7ece22c001e2b3fc639d9ba9c02a9feae0f651f65265852a3c1e955f158'],
]) assert.equal(sha(held.get(file)), expected, 'Exact management proof input: ' + file);
const links = html => [...html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').matchAll(/<link\b[^>]*>/gi)].map(match => match[0]);
const href = tag => tag.match(/href=["']([^"']+)["']/i)?.[1];
const styles = links(fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8')).filter(tag => /rel=["']stylesheet["']/i.test(tag) && href(tag)?.startsWith('/assets/'));
assert.equal(styles.length, 1, 'One actual production stylesheet');
const css = fs.readFileSync(path.join(root, 'dist', href(styles[0]).slice(1)));
const fontTags = links(fs.readFileSync(path.join(root, 'index.html'), 'utf8')).filter(tag => /rel=["']stylesheet["']/i.test(tag) && href(tag)?.startsWith('https://fonts.googleapis.com/'));
assert.equal(fontTags.length, 1, 'One actual font stylesheet');
const cache = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(base, 'font-cache'));
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(cache, 'manifest.json'))).map(row => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(row.url).origin));
  assert(/^[a-f0-9]{64}$/.test(row.file));
  const body = fs.readFileSync(path.join(cache, row.file));
  assert.equal(sha(body), row.sha256, 'Held actual font bytes');
  return [row.url, { body, contentType: row.contentType }];
}));
assert(fonts.has(href(fontTags[0])), 'Declared font stylesheet is held');
const scriptPath = path.join(output, 'fixture.js'), cssPath = path.join(output, 'fixture.css');
const bundle = await build({ absWorkingDir: root, entryPoints: [path.join(root, files.at(-1))], outfile: scriptPath, bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', alias: { '@': path.join(root, 'src') }, define: { 'process.env.NODE_ENV': '"production"' }, metafile: true, logLevel: 'silent' });
for (const file of files) assert(Object.keys(bundle.metafile.inputs).some(input => input.replaceAll('\\', '/').endsWith(file)), 'Actual page input: ' + file);
const script = bundle.outputFiles.find(file => path.resolve(file.path) === scriptPath);
const moduleCss = bundle.outputFiles.find(file => path.resolve(file.path) === cssPath);
assert(script, 'Actual compiled page JavaScript');
assert.equal(bundle.outputFiles.length, moduleCss ? 2 : 1, 'Every compiled output is served');
const html = `<!doctype html><html class="dark" lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1">${fontTags[0]}<link rel="stylesheet" href="/production.css">${moduleCss ? '<link rel="stylesheet" href="/fixture.css">' : ''}<title>Grand Prix Boss compiled page proof</title></head><body class="bg-background text-foreground"><div id="root"></div><script src="/fixture.js"></script></body></html>`;
const assets = new Map([['/grand-prix-boss', [Buffer.from(html), 'text/html']], ['/fixture.js', [script.contents, 'text/javascript']], ['/production.css', [css, 'text/css']]]);
if (moduleCss) assets.set('/fixture.css', [moduleCss.contents, 'text/css']);
for (const [name, [bytes]] of assets) fs.writeFileSync(path.join(output, name === '/grand-prix-boss' ? 'fixture.html' : name.slice(1)), bytes);
fs.writeFileSync(path.join(output, 'metafile.json'), JSON.stringify(bundle.metafile, null, 2));
fs.writeFileSync(path.join(output, 'assets.json'), JSON.stringify([...assets].map(([name, [body, contentType]]) => ({ name, contentType, bytes: body.length, sha256: sha(body) })), null, 2));
const engineFile = path.join(output, 'engine.mjs');
const engineBundle = await build({ absWorkingDir: root, entryPoints: [path.join(root, 'src/lib/grandPrixBoss.ts')], outfile: engineFile, bundle: true, write: false, platform: 'node', format: 'esm', alias: { '@': path.join(root, 'src') }, metafile: true, logLevel: 'silent' });
assert.equal(engineBundle.outputFiles.length, 1);
assert.equal(path.resolve(engineBundle.outputFiles[0].path), engineFile);
fs.writeFileSync(engineFile, engineBundle.outputFiles[0].contents);
fs.writeFileSync(path.join(output, 'engine-inputs.json'), JSON.stringify(engineBundle.metafile, null, 2));
const engine = await import(pathToFileURL(engineFile).href);
const compiledHolds = new Map([...assets].map(([name, [bytes]]) => [path.join(output, name === '/grand-prix-boss' ? 'fixture.html' : name.slice(1)), sha(bytes)]));
compiledHolds.set(engineFile, sha(engineBundle.outputFiles[0].contents));
const money = value => '€' + value.toLocaleString('en-US');
const FAILED = 'Your browser could not save that change. Your team has not advanced. Free some space and try again.';
const UNCERTAIN = 'The save may have landed, but your browser could not confirm it. Reload your saved team before continuing.';

function installProbe() {
  const key = 'grand-prix-boss-save-v1', fence = 'dukb-fence:' + key;
  const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
  let mode = null, confirmation = false, operations = [], scrolls = [], scrollTos = [];
  Storage.prototype.getItem = function (name) {
    if (this === window.localStorage && name === key) {
      if (confirmation) { confirmation = false; operations.push({ operation: 'game-get', effect: 'confirmation-threw' }); throw new DOMException('Owned confirmation fault', 'SecurityError'); }
      operations.push({ operation: 'game-get', effect: 'delegated' });
    }
    return get.apply(this, arguments);
  };
  Storage.prototype.setItem = function (name, value) {
    if (this === window.localStorage && name === key) {
      const armed = mode; mode = null;
      if (armed === 'quota') { operations.push({ operation: 'game-set', effect: 'quota-threw' }); throw new DOMException('Owned quota fault', 'QuotaExceededError'); }
      if (armed === 'noop') { operations.push({ operation: 'game-set', effect: 'noop' }); return; }
      const result = set.apply(this, arguments);
      operations.push({ operation: 'game-set', effect: armed === 'uncertain' ? 'landed-before-unreadable-confirmation' : 'landed' });
      if (armed === 'uncertain') confirmation = true;
      return result;
    }
    return set.apply(this, arguments);
  };
  const insets = () => {
    const vh = innerHeight, vw = innerWidth;
    const scan = (y, top) => {
      let best = 0;
      for (const x of [vw * 0.5, 6, vw - 6]) for (const el of document.elementsFromPoint(x, y)) {
        const pos = getComputedStyle(el).position, r = el.getBoundingClientRect();
        if (!['fixed', 'sticky'].includes(pos) || !r.height || r.height > vh * 0.4) continue;
        if (top && r.top <= 2 && r.bottom > 0) best = Math.max(best, r.bottom);
        if (!top && r.bottom >= vh - 2 && r.top < vh) best = Math.max(best, vh - r.top);
      }
      return best;
    };
    return { top: scan(1, true), bottom: scan(vh - 2, false), vh };
  };
  const rect = el => { const r = el.getBoundingClientRect(); return { top: r.top, height: r.height, bottom: r.bottom }; };
  const siv = Element.prototype.scrollIntoView, to = window.scrollTo;
  Element.prototype.scrollIntoView = function () {
    scrolls.push({ node: this, before: rect(this), y: scrollY, insets: insets() });
    return siv.apply(this, arguments);
  };
  window.scrollTo = function () { scrollTos.push({ y: scrollY }); return to.apply(this, arguments); };
  window.gpBrowserProof = Object.freeze({
    arm(value) { if (!['quota', 'noop', 'uncertain'].includes(value) || mode || confirmation) throw new Error('Use one owned storage fault at a time'); mode = value; operations = []; },
    disarm() { mode = null; confirmation = false; },
    inspect() {
      return { raw: get.call(localStorage, key), generation: get.call(localStorage, fence), operations: operations.slice(), armed: mode, confirmation, timeOrigin: performance.timeOrigin, navigationType: performance.getEntriesByType('navigation')[0]?.type ?? null, native: { random: /\[native code\]/.test(Math.random.toString()), date: /\[native code\]/.test(Date.now.toString()), crypto: /\[native code\]/.test(crypto.getRandomValues.toString()) } };
    },
    resetScroll() { scrolls = []; scrollTos = []; },
    readScroll() { return { scrolls: scrolls.map(({ node, ...row }) => ({ ...row, connected: node.isConnected, after: rect(node), finalY: scrollY, afterInsets: insets() })), scrollTos: scrollTos.map(row => ({ ...row, finalY: scrollY })) }; },
  });
}

const clone = value => JSON.parse(JSON.stringify(value));
const own = state => state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
function read(raw) {
  const before = JSON.stringify(raw), result = engine.validateSavedCareer(raw);
  assert.equal(JSON.stringify(raw), before, 'Prepared reader input held');
  assert.equal(result.ok, true, 'Actual prepared reader admission');
  return result.state;
}
function transition(state, action) {
  const before = JSON.stringify(state), result = engine.applyAction(state, { ...action, expectedRevision: state.revision });
  assert.equal(JSON.stringify(state), before, 'Actual engine action holds prior bytes');
  assert.equal(result.ok, true, 'Actual legal engine action: ' + action.type);
  assert.deepEqual(read(result.state), result.state, 'Actual action result is canonical');
  return result;
}
function parse(snapshot) {
  assert.equal(typeof snapshot.raw, 'string', 'Actual durable game envelope');
  const value = JSON.parse(snapshot.raw);
  assert.equal(value.schemaVersion, 1);
  assert.deepEqual(read(value.career), value.career);
  assert.deepEqual(value.completedSeasons, [1], 'Prepared completion claim stays held');
  return value;
}
const initialRaw = clone(engine.createCareer(291)), initialSeats = own(initialRaw);
assert.equal(initialSeats.length, 2);
initialSeats[0].contract.years = 1; initialSeats[1].contract.years = 2;
delete initialRaw.marketOffers; delete initialRaw.nextSeasonPlan;
let prepared = read(initialRaw);
const normalizedInitial = clone(prepared), tape = [];
function prepare(action) {
  const before = prepared, result = transition(before, action);
  tape.push({ action: { ...clone(action), expectedRevision: before.revision }, beforeSha256: sha(Buffer.from(JSON.stringify(before))),
    afterSha256: sha(Buffer.from(JSON.stringify(result.state))), receipt: result.receipt });
  prepared = result.state;
}
for (let round = 0; round < 12; round += 1) {
  prepare({ type: 'qualify' });
  prepare({ type: 'startRace', setups: own(prepared).map(driver => ({ driverId: driver.id, pace: 'balanced',
    compound: prepared.race.weather === 'wet' ? 'wet' : 'medium' })) });
  while (prepared.phase === 'race') {
    const orders = own(prepared).map(driver => {
      const entry = prepared.race.entries.find(row => row.driverId === driver.id);
      let pitTo;
      if (prepared.race.lap > 0 && entry.status === 'running') {
        if (prepared.race.weather === 'wet' && entry.compound !== 'wet') pitTo = 'wet';
        else if (prepared.race.weather === 'dry' && entry.compound === 'wet') pitTo = 'medium';
        else if (entry.tyreWear > 58) pitTo = prepared.race.weather === 'wet' ? 'wet' : 'hard';
      }
      return { driverId: driver.id, pace: 'balanced', ...(pitTo ? { pitTo } : {}) };
    });
    prepare({ type: 'raceInterval', orders });
  }
  if (round < 11) prepare({ type: 'continue' });
}
assert.equal(prepared.phase, 'seasonReview'); assert.equal(prepared.results.length, 12);
assert.equal(prepared.nextSeasonPlan.affordable, true);
const fixture = JSON.stringify({ schemaVersion: 1, career: prepared, completedSeasons: [1] });
fs.writeFileSync(path.join(output, 'prepared-review.json'), JSON.stringify({
  scope: 'Fictional actual-engine prepared review, not a browser-played season. Labelled one/two-year legacy term edits before reader admission.',
  seed: 291, initialRaw, normalizedInitial, tape, envelope: JSON.parse(fixture), envelopeSha256: sha(Buffer.from(fixture)),
}, null, 2));
function seedPrepared({ origin: expectedOrigin, raw }) {
  if (location.origin !== expectedOrigin) return;
  const key = 'grand-prix-boss-save-v1', fence = 'dukb-fence:' + key;
  if (localStorage.getItem(key) === null) {
    localStorage.setItem(key, raw); localStorage.setItem(fence, '0');
  }
}
const sizes = [
  { id: 'mini', width: 320, height: 664, mobile: true },
  { id: 'phone', width: 392, height: 731, mobile: true },
  { id: 'desktop', width: 1440, height: 900, mobile: false },
];
const cases = sizes.map(size => ({ size, mode: 'review' })).concat([
  { size: sizes[0], mode: 'quota' }, { size: sizes[1], mode: 'noop' }, { size: sizes[2], mode: 'uncertain' },
]);
const rows = [], validationFailures = [];
let browser, server, origin, url, active = null, primary = null, attempted = 0;
async function collect({ size, mode }) {
  const row = { size, mode, dpr: size.mobile ? 2 : 1, preparedSha256: sha(Buffer.from(fixture)), help: [], quotes: [], plan: null,
    traces: [], readOnly: [], actions: [], targets: [], widths: [], folds: [], backs: [], reloads: [], screenshots: [],
    localAssets: [], unexpected: [], writes: [], routeErrors: [], pageErrors: [], consoleErrors: [], failed: [], cleanupErrors: [] };
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: row.dpr,
    isMobile: size.mobile, hasTouch: size.mobile, locale: 'en-US', timezoneId: 'America/New_York' });
  const inFlight = new Set();
  let page = null;
  active = { row, context, inFlight, get page() { return page; } };
  await context.addInitScript(seedPrepared, { origin, raw: fixture });
  await context.addInitScript(installProbe);
  await context.route('**/*', async route => {
    const work = (async () => {
      const request = route.request(), address = request.url(), method = request.method();
      if (method !== 'GET') { row.writes.push({ url: address, method }); return await route.abort(); }
      const parsed = new URL(address);
      if (parsed.origin === origin) {
        assert.equal(parsed.search, '', 'No owned fixture query variants');
        const asset = assets.get(parsed.pathname);
        if (!asset && parsed.pathname === '/favicon.ico') return await route.fulfill({ status: 204, body: '' });
        assert(asset, 'Declared immutable local asset');
        const [body, contentType] = asset, payload = Buffer.from(body);
        assert.equal(payload.length, body.length, 'Buffer length preserved'); assert.equal(sha(payload), sha(body), 'Buffer bytes preserved');
        row.localAssets.push({ path: parsed.pathname, bytes: payload.length, sha256: sha(payload), sourceSha256: sha(body),
          sourceBodyType: body.constructor.name, fulfilledBodyType: payload.constructor.name });
        return await route.fulfill({ status: 200, body: payload, contentType });
      }
      const font = fonts.get(address);
      if (font) return await route.fulfill({ status: 200, body: Buffer.from(font.body), contentType: font.contentType });
      row.unexpected.push(address); return await route.abort();
    })();
    inFlight.add(work);
    try { return await work; }
    catch (error) {
      row.routeErrors.push({ name: error.name, message: error.message, stack: error.stack });
      try { await route.abort(); } catch (abortError) { row.cleanupErrors.push({ name: abortError.name, message: abortError.message }); }
    } finally { inFlight.delete(work); }
  });
  page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.on('pageerror', error => row.pageErrors.push({ name: error.name, message: error.message, stack: error.stack }));
  page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
  page.on('requestfailed', request => row.failed.push({ url: request.url(), error: request.failure()?.errorText ?? null }));
  const inspect = () => page.evaluate(() => window.gpBrowserProof.inspect());
  const measure = async () => row.widths.push(await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth,
  })));
  const settle = async () => {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    let last = null, same = 0;
    for (let step = 0; step < 30; step += 1) {
      await page.waitForTimeout(60);
      const now = await page.evaluate(() => Math.round(scrollY));
      same = now === last ? same + 1 : 0; last = now;
      if (same >= 3) return;
    }
    throw new Error('Native scroll did not settle');
  };
  const target = async (locator, name) => {
    assert.equal(await locator.count(), 1, 'One actual native control: ' + name);
    await locator.scrollIntoViewIfNeeded();
    row.targets.push(await locator.evaluate((el, name) => {
      const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { name, width: r.width, height: r.height, hit: !!hit && (hit === el || el.contains(hit)) };
    }, name));
  };
  const press = async (locator, name, stable = false) => {
    await target(locator, name);
    const element = await locator.elementHandle();
    await page.evaluate(() => window.gpBrowserProof.resetScroll());
    await locator.click(); await settle();
    row.actions.push({ name, stable: stable ? await element.evaluate(el => el.isConnected && document.activeElement === el) : null,
      scroll: await page.evaluate(() => window.gpBrowserProof.readScroll()) });
    await element.dispose(); await measure();
  };
  const choose = async (locator, value, name) => {
    await target(locator, name); await page.evaluate(() => window.gpBrowserProof.resetScroll());
    await locator.selectOption(value); await settle();
    row.actions.push({ name, stable: null, scroll: await page.evaluate(() => window.gpBrowserProof.readScroll()) }); await measure();
  };
  const button = name => page.getByRole('button', { name, exact: true });
  const panel = name => page.locator('[data-gp-panel="' + name + '"]');
  const open = async name => { await press(button(name), 'Open ' + name); await panel(name).waitFor(); };
  const back = async name => {
    await press(button('Back to team'), 'Back from ' + name);
    row.backs.push({ name, focused: await button(name).evaluate(el => document.activeElement === el) });
  };
  const shot = async name => {
    const filename = size.id + '-' + mode + '-' + name + '.png';
    const bytes = await page.screenshot({ path: path.join(output, filename) });
    row.screenshots.push({ name: filename, sha256: sha(bytes), bytes: bytes.length });
  };
  const holdReadOnly = async (before, name) => {
    const after = await inspect(); row.readOnly.push({ name, before, after });
    assert.equal(after.raw, before.raw, 'Read-only game bytes held'); assert.equal(after.generation, before.generation, 'Read-only fence held');
  };
  const commit = async (action, name, stable = false) => {
    const before = await inspect(), saved = parse(before), expected = transition(saved.career, action);
    await press(button(name), name, stable);
    const after = await inspect(), turn = { before, action: { ...clone(action), expectedRevision: saved.career.revision },
      expected: clone(expected.state), after };
    row.traces.push(turn);
    assert.deepEqual(parse(after).career, expected.state, 'Exact native UI commitment: ' + action.type);
    assert.equal(Number(after.generation), Number(before.generation) + 1, 'One durable UI generation');
    turn.confirmed = true;
    return turn;
  };
  const quote = async offer => {
    const before = await inspect();
    await choose(page.getByLabel('Seat to change', { exact: true }), offer.outgoingDriverId, 'Seat to change');
    await choose(page.getByLabel('Incoming driver', { exact: true }), offer.incomingDriverId, 'Incoming driver');
    const fields = { wage: money(offer.wagePerRace), 'signing-fee': money(offer.signingFee), buyout: money(offer.buyout),
      'total-fee': money(offer.totalFee), reserved: money(offer.reserveAfter), term: offer.years + ' season', start: 'Year ' + offer.startsSeason };
    const actual = {};
    for (const key of Object.keys(fields)) actual[key] = await page.getByTestId('gp-offer-' + key).innerText();
    row.quotes.push({ expected: fields, actual, offer: clone(offer) }); assert.deepEqual(actual, fields, 'Actual canonical offer display');
    await holdReadOnly(before, 'Select an offer');
  };
  const renewal = async state => {
    const offer = state.marketOffers.find(value => value.outgoingDriverId === value.incomingDriverId && value.affordable);
    assert(offer, 'Actual affordable renewal exists');
    const driver = state.drivers.find(value => value.id === offer.outgoingDriverId), detail = page.getByTestId('gp-renewal-' + driver.id);
    row.folds.push({ name: 'First renewal before deliberate scroll', box: await button('Renew ' + driver.name).boundingBox(), y: await page.evaluate(() => scrollY) });
    const text = await detail.innerText();
    for (const value of [money(offer.wagePerRace), money(offer.signingFee), money(offer.reserveAfter), 'Year ' + offer.startsSeason, '1 season']) assert(text.includes(value), 'Canonical renewal field');
    return { offer, driver, text };
  };
  const plan = async state => {
    const value = state.nextSeasonPlan;
    assert(value, 'Actual next-year plan');
    const fields = { 'gp-season-end-cash': state.cash, 'gp-next-sponsor': value.sponsor, 'gp-next-renewal-fee': value.totalRenewalFee,
      'gp-next-reserved': value.nextReserved, 'gp-next-cash-after': value.cashAfter }, actual = {};
    for (const key of Object.keys(fields)) actual[key] = await page.getByTestId(key).innerText();
    row.plan = { expected: Object.fromEntries(Object.entries(fields).map(([key, number]) => [key, money(number)])), actual,
      canonical: clone(value) };
    assert.deepEqual(row.plan.actual, row.plan.expected, 'Actual canonical next-year plan');
  };
  const nativeReload = async expected => {
    const before = await inspect();
    await Promise.all([page.waitForEvent('load'), button('Reload saved team').click()]);
    await button('Next race').waitFor(); await page.evaluate(() => document.fonts.ready); await settle();
    const after = await inspect(); row.reloads.push({ before, expected: clone(expected), after });
    assert.notEqual(after.timeOrigin, before.timeOrigin, 'Native reload creates new document');
    assert.equal(after.navigationType, 'reload'); assert.equal(after.raw, expected.raw); assert.equal(after.generation, expected.generation);
  };
  await page.goto(url, { waitUntil: 'networkidle' }); await page.evaluate(() => document.fonts.ready);
  await answerConsent(page, { wait: 3000 }); row.consent = await storedConsent(page);
  const dialog = page.getByRole('dialog', { name: 'How to play Grand Prix Boss', exact: true });
  await dialog.waitFor();
  row.help.push({ kind: 'first', text: await dialog.innerText(), bounds: await dialog.boundingBox() });
  await press(dialog.getByRole('button', { name: "Let's Play!", exact: true }), 'First rules');
  row.firstHelpFocus = await button('How to play').evaluate(el => el === document.activeElement);
  await button('Next race').waitFor(); row.initial = await inspect();
  assert.equal(row.initial.raw, fixture, 'The exact prepared review boots once');
  row.folds.push({ name: 'First hub before deliberate scroll', box: await button('Next race').boundingBox(), y: await page.evaluate(() => scrollY) });
  await measure();
  if (mode === 'review') {
    await open('Drivers');
    const beforeRenewal = parse(await inspect()).career, chosenRenewal = await renewal(beforeRenewal);
    await commit({ type: 'renewDriver', driverId: chosenRenewal.driver.id }, 'Renew ' + chosenRenewal.driver.name);
    row.renewSeatFocus = await page.getByRole('heading', { name: chosenRenewal.driver.name + ', ' + chosenRenewal.driver.age, level: 4, exact: true }).evaluate(el => ({
      inSameSeat: !!el.closest('article')?.contains(document.activeElement), tag: document.activeElement?.tagName ?? null,
      text: document.activeElement?.textContent?.slice(0, 160) ?? null,
    }));
    if (!row.renewSeatFocus.inSameSeat) {
      const name = size.id + '-review-renewal-focus-failure.png', bytes = await page.screenshot({ path: path.join(output, name) });
      row.focusFailureScreenshot = { name, sha256: sha(bytes), bytes: bytes.length };
    }
    let state = parse(await inspect()).career;
    const offer = state.marketOffers.find(value => value.outgoingDriverId !== chosenRenewal.driver.id && value.outgoingDriverId !== value.incomingDriverId && value.affordable);
    assert(offer, 'Other seat has an actual affordable signing');
    await quote(offer); await page.getByTestId('gp-offer-wage').locator('..').locator('..').scrollIntoViewIfNeeded(); await shot('drivers-quote');
    await commit({ type: 'signDriver', outgoingDriverId: offer.outgoingDriverId, incomingDriverId: offer.incomingDriverId }, 'Sign driver', true);
    await back('Drivers'); await open('Next race'); state = parse(await inspect()).career;
    const expectedCards = state.race.entries.filter(entry => entry.teamId === state.teamId).map(entry => {
      const classified = state.results.find(result => result.roundId === state.race.roundId).classification.find(value => value.driverId === entry.driverId);
      return { name: state.drivers.find(driver => driver.id === entry.driverId).name,
        position: classified.status === 'retired' ? 'Retired' : 'P' + classified.position };
    });
    const actualCards = await panel('Next race').locator('section').evaluateAll(sections => sections.map(section => ({
      name: section.querySelector('h4')?.textContent ?? null, position: section.querySelector(':scope > div p')?.textContent ?? null,
    })));
    row.participants = { expected: expectedCards, actual: actualCards }; assert.deepEqual(actualCards, expectedCards, 'Actual historical finish cards');
    row.folds.push({ name: 'First next-year action before deliberate scroll', box: await button('Start next season').boundingBox(), y: await page.evaluate(() => scrollY) });
    await plan(state); await page.getByTestId('gp-next-sponsor').scrollIntoViewIfNeeded(); await shot('review-plan');
    await commit({ type: 'startNextSeason' }, 'Start next season', true);
    await back('Next race'); await open('History');
    const beforeHistory = await inspect(), advanced = parse(beforeHistory).career, saved = advanced.history[0];
    assert.equal(advanced.history.length, 1); await press(button('Season ' + saved.season), 'Open saved season');
    row.archive = { expected: clone(saved), actual: {
      driver: await page.getByTestId('gp-archive-driver-champion').innerText(), driverPoints: await page.getByTestId('gp-archive-driver-points').innerText(),
      team: await page.getByTestId('gp-archive-team-champion').innerText(), teamPoints: await page.getByTestId('gp-archive-team-points').innerText(),
      cash: await page.getByTestId('gp-archive-end-cash').innerText(), car: {}, races: [],
    } };
    for (const area of ['power', 'aero', 'reliability']) row.archive.actual.car[area] = await page.getByTestId('gp-archive-' + area).innerText();
    for (const race of saved.races) {
      const detail = page.getByTestId('gp-archive-race-' + race.roundId);
      row.archive.actual.races.push({ track: await detail.locator('summary').textContent(), drivers: await detail.locator('p').nth(0).textContent(), money: await detail.locator('p').nth(1).textContent() });
    }
    row.archive.coverage = await page.getByTestId('gp-history-coverage').innerText();
    row.archive.totals = {
      seasons: await page.getByTestId('gp-history-total-seasons').innerText(), drivers: await page.getByTestId('gp-history-driver-titles').innerText(),
      teams: await page.getByTestId('gp-history-team-titles').innerText(),
    };
    row.archive.expectedTotals = clone(advanced.careerTotals);
    row.archive.enteredFocus = await page.getByRole('heading', { name: 'Season ' + saved.season, exact: true }).evaluate(el => el === document.activeElement);
    for (const race of [saved.races[0], saved.races.at(-1)]) await press(page.getByTestId('gp-archive-race-' + race.roundId).locator('summary'), 'Open archive detail ' + race.roundId);
    await page.getByTestId('gp-archive-driver-champion').scrollIntoViewIfNeeded(); await shot('archive');
    await press(button('Back to history'), 'Back to history');
    row.archive.backFocus = await button('Season ' + saved.season).evaluate(el => el === document.activeElement);
    await holdReadOnly(beforeHistory, 'Read all saved race summaries'); await back('History');
    const beforeHelp = await inspect(); await press(button('How to play'), 'Reopen help');
    await dialog.waitFor(); row.help.push({ kind: 'reopened', text: await dialog.innerText(), bounds: await dialog.boundingBox() }); await shot('help');
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' }); await settle();
    row.reopenedHelpFocus = await button('How to play').evaluate(el => el === document.activeElement);
    await holdReadOnly(beforeHelp, 'Read reopened help');
    await open('Drivers'); state = parse(await inspect()).career;
    const currentOffer = state.marketOffers.find(value => value.outgoingDriverId !== value.incomingDriverId && value.affordable);
    assert(currentOffer, 'Year two has an actual affordable current-year quote'); await quote(currentOffer);
    await back('Drivers'); await open('Next race'); await commit({ type: 'qualify' }, 'Run qualifying', true);
    state = parse(await inspect()).career;
    row.activeGrid = { expected: own(state).map(driver => driver.name).sort(),
      actual: (await panel('Next race').locator('h4').allTextContents()).sort() };
    assert.deepEqual(row.activeGrid.actual, row.activeGrid.expected, 'Actual next-year seat holders qualify');
  } else {
    const state = parse(await inspect()).career;
    let action, label, section;
    if (mode === 'uncertain') {
      await open('Next race'); await plan(state);
      action = { type: 'startNextSeason' }; label = 'Start next season'; section = panel('Next race');
    } else {
      await open('Drivers'); section = panel('Drivers');
      if (mode === 'noop') {
        const value = await renewal(state); action = { type: 'renewDriver', driverId: value.driver.id }; label = 'Renew ' + value.driver.name;
      } else {
        const offer = state.marketOffers.find(value => value.outgoingDriverId !== value.incomingDriverId && value.affordable);
        assert(offer); await quote(offer); action = { type: 'signDriver', outgoingDriverId: offer.outgoingDriverId, incomingDriverId: offer.incomingDriverId }; label = 'Sign driver';
      }
    }
    const before = await inspect(), expected = transition(parse(before).career, action);
    const panelBefore = await section.innerText();
    await page.evaluate(mode => window.gpBrowserProof.arm(mode), mode); await press(button(label), 'Owned ' + mode);
    row.fault = { before, expected: clone(expected.state), after: await inspect(), panelBefore, panelAfter: await section.innerText(),
      message: await page.getByRole('status').innerText(), disabled: await button(label).isDisabled(), action: clone(action) };
    await shot('fault'); await page.evaluate(() => window.gpBrowserProof.disarm());
    if (mode === 'uncertain') {
      await nativeReload(row.fault.after); await shot('reloaded');
      await open('Next race'); await commit({ type: 'qualify' }, 'Run qualifying', true);
    } else await commit(action, label);
  }
  row.final = await inspect(); await measure();
  while (inFlight.size) await Promise.allSettled([...inFlight]);
  await context.close(); active = null;
  fs.writeFileSync(path.join(output, size.id + '-' + mode + '.json'), JSON.stringify(row, null, 2));
  return row;
}
function validate(row) {
  assert.equal(row.consent, 'rejected', 'Actual consent choice');
  assert.equal(row.initial.raw, fixture, 'Exact prepared fixture admission');
  assert(row.initial.native.random && row.initial.native.date && row.initial.native.crypto, 'Native random and clock preserved');
  assert.equal(row.firstHelpFocus, true, 'First rules return focus');
  for (const help of row.help) {
    for (const phrase of ['A two-driver example', 'automatic renewals', 'sponsor', 'saved seasons', 'next season']) assert(help.text.toLowerCase().includes(phrase.toLowerCase()), 'Actual management instructions');
    const box = help.bounds; assert(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= row.size.width && box.y + box.height <= row.size.height, 'Rules remain inside viewport');
  }
  for (const quote of row.quotes) assert.deepEqual(quote.actual, quote.expected, 'Canonical offer display');
  if (row.plan) assert.deepEqual(row.plan.actual, row.plan.expected, 'Canonical next-year plan display');
  for (const turn of row.traces) {
    const expectedRaw = JSON.stringify({ schemaVersion: 1, career: turn.expected, completedSeasons: [1] });
    assert.equal(turn.after.raw, expectedRaw, 'Exact native UI commitment');
    assert.deepEqual(parse(turn.after).career, turn.expected, 'Exact committed career');
    assert.equal(Number(turn.after.generation), Number(turn.before.generation) + 1, 'One durable UI generation');
  }
  for (const view of row.readOnly) {
    assert.equal(view.after.raw, view.before.raw, 'Read-only bytes held'); assert.equal(view.after.generation, view.before.generation, 'Read-only generation held');
  }
  for (const width of row.widths) assert(width.scrollWidth <= width.clientWidth, 'No horizontal overflow');
  for (const target of row.targets) {
    assert(target.width >= 44 && target.height >= 44, 'Native target floor44');
    assert.equal(target.hit, true, 'Native target reachable');
  }
  for (const back of row.backs) assert.equal(back.focused, true, 'Back restores exact opener');
  for (const action of row.actions) {
    if (action.stable !== null) assert.equal(action.stable, true, 'Surviving native action keeps focus');
    for (const scroll of action.scroll.scrolls) {
      assert.equal(scroll.connected, true, 'Measured reveal target stays connected');
      const visible = Math.max(0, Math.min(scroll.before.bottom, scroll.insets.vh - scroll.insets.bottom) - Math.max(scroll.before.top, scroll.insets.top));
      const comfortable = scroll.before.top >= scroll.insets.top - 4 && visible >= Math.min(190, scroll.before.height);
      assert(!(comfortable && scroll.finalY > scroll.y + 4), 'Readable content does not jump downward');
      assert(scroll.after.top >= scroll.afterInsets.top - 4, 'Reveal retains content top');
    }
    for (const scroll of action.scroll.scrollTos) assert(Math.abs(scroll.finalY - scroll.y) <= 4, 'No unowned window scroll');
  }
  for (const asset of row.localAssets) {
    assert.equal(asset.sha256, asset.sourceSha256, 'Fulfilled asset bytes held');
    assert.equal(asset.fulfilledBodyType, 'Buffer', 'Owned asset body is Buffer');
  }
  assert.deepEqual(row.unexpected, [], 'No unexpected external request');
  assert.deepEqual(row.writes, [], 'No production write request');
  for (const field of ['routeErrors', 'pageErrors', 'consoleErrors', 'failed', 'cleanupErrors']) assert.deepEqual(row[field], [], 'No browser errors: ' + field);
  for (const reload of row.reloads) {
    assert.notEqual(reload.after.timeOrigin, reload.before.timeOrigin, 'Native reload creates document');
    assert.equal(reload.after.navigationType, 'reload', 'Native reload navigation');
    assert.equal(reload.after.raw, reload.expected.raw, 'Native reload adopts exact bytes');
    assert.equal(reload.after.generation, reload.expected.generation, 'Reload does not write');
  }
  assert.equal(row.screenshots.length, row.mode === 'review' ? 4 : row.mode === 'uncertain' ? 2 : 1, 'All original screenshots');
  for (const screenshot of [...row.screenshots, ...(row.focusFailureScreenshot ? [row.focusFailureScreenshot] : [])]) {
    const bytes = fs.readFileSync(path.join(output, screenshot.name));
    assert.equal(sha(bytes), screenshot.sha256, 'Original image hash');
    assert.equal(bytes.readUInt32BE(16), row.size.width * row.dpr, 'Original image width');
    assert.equal(bytes.readUInt32BE(20), row.size.height * row.dpr, 'Original image height');
  }
  const final = parse(row.final).career;
  if (row.mode === 'review') {
    assert.equal(row.traces.length, 4);
    assert.deepEqual(row.traces.map(turn => turn.action.type), ['renewDriver', 'signDriver', 'startNextSeason', 'qualify']);
    assert.deepEqual(row.participants.actual, row.participants.expected, 'Actual historical finish participants');
    const archive = row.archive, expected = archive.expected, actual = archive.actual;
    assert.equal(final.season, 2); assert.equal(final.phase, 'grid'); assert.equal(final.history.length, 1);
    assert.deepEqual(final.history[0], expected, 'Rollover archive remains canonical');
    assert.equal(actual.driver, expected.driverChampion.name, 'Stored archive champion');
    assert.equal(actual.driverPoints, String(expected.driverChampion.points));
    assert.equal(actual.team, expected.constructorChampion.name); assert.equal(actual.teamPoints, String(expected.constructorChampion.points));
    assert.equal(actual.cash, money(expected.endCash));
    for (const area of ['power', 'aero', 'reliability']) assert.equal(actual.car[area], String(expected.finalCar[area]));
    assert.deepEqual(actual.races, expected.races.map(race => ({ track: race.trackName,
      drivers: race.drivers.map(driver => driver.name + ': ' + (driver.status === 'retired' ? 'retired' : 'P' + driver.position) + ', ' + driver.points + ' pts').join('. '),
      money: 'Prize ' + money(race.teamPrize) + ', costs ' + money(race.operatingCost) })), 'All twelve saved race summaries');
    assert.equal(actual.races.length, 12);
    assert.equal(archive.coverage, 'Recorded since year ' + archive.expectedTotals.sinceSeason + '.');
    assert.deepEqual(archive.totals, { seasons: String(archive.expectedTotals.archivedSeasons), drivers: String(archive.expectedTotals.driverTitles), teams: String(archive.expectedTotals.constructorTitles) });
    assert.equal(archive.enteredFocus, true, 'Archive opens with native heading focus'); assert.equal(archive.backFocus, true, 'Archive Back restores season entry');
    assert.equal(row.reopenedHelpFocus, true, 'Escape restores actual help opener');
    assert.deepEqual(row.activeGrid.actual, row.activeGrid.expected, 'New grid uses current seat holders');
    assert.equal(row.renewSeatFocus.inSameSeat, true, 'GP_MANAGEMENT_RENEW_NATIVE_FOCUS: paid renewal retains its seat context');
  } else {
    const fault = row.fault;
    assert.equal(fault.panelAfter, fault.panelBefore, 'Failed write holds displayed decision');
    assert.equal(fault.after.armed, null, 'Owned fault is consumed');
    const effect = row.mode === 'quota' ? 'quota-threw' : row.mode === 'noop' ? 'noop' : 'landed-before-unreadable-confirmation';
    assert.equal(fault.after.operations.filter(operation => operation.effect === effect).length, 1, 'One effective owned storage fault');
    if (row.mode === 'uncertain') {
      assert.equal(fault.message, UNCERTAIN); assert.equal(fault.disabled, true);
      assert.equal(fault.after.operations.filter(operation => operation.effect === 'confirmation-threw').length, 1);
      assert.deepEqual(parse(fault.after).career, fault.expected, 'Uncertain rollover physically landed');
      assert.equal(Number(fault.after.generation), Number(fault.before.generation) + 1, 'Landed rollover keeps generation');
      assert.equal(row.reloads.length, 1); assert.equal(final.season, 2); assert.equal(final.history.length, 1);
      assert.deepEqual(row.traces.map(turn => turn.action.type), ['qualify'], 'Uncertain recovery never repeats sponsor');
    } else {
      assert.equal(fault.message, FAILED); assert.equal(fault.disabled, false);
      assert.equal(fault.after.raw, fault.before.raw, 'Refused write holds exact bytes');
      assert.equal(fault.after.generation, fault.before.generation, 'Refused write restores exact fence');
      assert.equal(row.reloads.length, 0); assert.equal(row.traces.length, 1);
      assert.equal(row.traces[0].action.type, fault.action.type, 'Native retry commits only the intended action');
    }
  }
}
const controlResults = [];
function controls(healthy) {
  const baseline = JSON.stringify(healthy);
  const faults = [
    ['offer', 'Canonical offer display', values => { values[0].quotes[0].actual['total-fee'] = 'changed'; }],
    ['commit', 'Exact native UI commitment', values => { const raw = JSON.parse(values[0].traces[0].after.raw); raw.career.cash += 1; values[0].traces[0].after.raw = JSON.stringify(raw); }],
    ['generation', 'One durable UI generation', values => { values[0].traces[0].after.generation = values[0].traces[0].before.generation; }],
    ['participants', 'Actual historical finish participants', values => { values[0].participants.actual[0].name = 'Fixture Changed Driver'; }],
    ['plan', 'Canonical next-year plan display', values => { values[0].plan.actual['gp-next-cash-after'] = 'changed'; }],
    ['archive', 'Stored archive champion', values => { values[0].archive.actual.driver = 'Fixture Changed Champion'; }],
    ['read-only', 'Read-only bytes held', values => { values[0].readOnly[0].after.raw += ' '; }],
    ['target-size', 'Native target floor44', values => { values[0].targets[0].height = 1; }],
    ['target-hit', 'Native target reachable', values => { values[0].targets[0].hit = false; }],
    ['overflow', 'No horizontal overflow', values => { values[0].widths[0].scrollWidth = values[0].widths[0].clientWidth + 1; }],
    ['renewal-focus', 'GP_MANAGEMENT_RENEW_NATIVE_FOCUS', values => { values[0].renewSeatFocus.inSameSeat = false; }],
    ['reload', 'Native reload adopts exact bytes', values => { values.find(value => value.mode === 'uncertain').reloads[0].after.raw += ' '; }],
    ['external', 'No unexpected external request', values => { values[0].unexpected.push('https://example.invalid/owned-copy'); }],
    ['asset', 'Fulfilled asset bytes held', values => { values[0].localAssets[0].sha256 = 'changed'; }],
    ['native-clock', 'Native random and clock preserved', values => { values[0].initial.native.date = false; }],
    ['instructions', 'Actual management instructions', values => { values[0].help[0].text = values[0].help[0].text.replace('automatic renewals', 'changed'); }],
  ];
  for (const [name, marker, mutate] of faults) {
    const copied = clone(healthy); mutate(copied); assert.notEqual(JSON.stringify(copied), baseline, 'Copied observation changed: ' + name);
    assert.throws(() => copied.forEach(validate), error => error instanceof assert.AssertionError && error.message.includes(marker), 'Owned copied-observation refusal: ' + name);
    assert.equal(JSON.stringify(healthy), baseline, 'Actual observations held'); healthy.forEach(validate);
    controlResults.push({ name, marker, changed: true, ownedRefusal: true, restored: true });
  }
  assert.equal(controlResults.length, 16);
}
const reportError = error => ({ name: error.name, message: error.message, stack: error.stack });
try {
  server = http.createServer((request, response) => {
    const name = new URL(request.url, 'http://localhost').pathname, asset = assets.get(name);
    response.writeHead(request.method !== 'GET' ? 405 : asset ? 200 : name === '/favicon.ico' ? 204 : 404, { 'Content-Type': asset?.[1] || 'text/plain' });
    response.end(request.method === 'GET' ? asset?.[0] || '' : '');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port; url = origin + '/grand-prix-boss';
  fs.writeFileSync(path.join(output, 'source-before.json'), JSON.stringify([...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) })), null, 2));
  browser = await chromium.launch({ args: ['--no-sandbox'] });
  for (const config of cases) {
    attempted += 1;
    const row = await collect(config); rows.push(row);
    try { validate(row); }
    catch (error) {
      validationFailures.push({ size: row.size.id, mode: row.mode, error: reportError(error) });
      fs.writeFileSync(path.join(output, row.size.id + '-' + row.mode + '-validation-failure.json'), JSON.stringify(validationFailures.at(-1), null, 2));
      if (!primary) primary = error;
    }
  }
  assert.equal(rows.length, 6);
  if (!primary) controls(rows);
} catch (error) {
  if (!primary) primary = error;
  if (active) {
    active.row.primaryFailure = reportError(error);
    if (active.page && !active.page.isClosed()) {
      try { active.row.latestSnapshot = await active.page.evaluate(() => window.gpBrowserProof?.inspect() ?? null); }
      catch (inspectError) { active.row.cleanupErrors.push(reportError(inspectError)); }
      try {
        const name = active.row.size.id + '-' + active.row.mode + '-failure.png', bytes = await active.page.screenshot({ path: path.join(output, name) });
        active.row.failureScreenshot = { name, sha256: sha(bytes), bytes: bytes.length };
      } catch (shotError) { active.row.cleanupErrors.push(reportError(shotError)); }
    }
    fs.writeFileSync(path.join(output, active.row.size.id + '-' + active.row.mode + '-partial.json'), JSON.stringify(active.row, null, 2));
  }
} finally {
  if (active) {
    while (active.inFlight.size) await Promise.allSettled([...active.inFlight]);
    try { await active.context.close(); } catch (error) { active.row.cleanupErrors.push(reportError(error)); }
    fs.writeFileSync(path.join(output, active.row.size.id + '-' + active.row.mode + '-partial.json'), JSON.stringify(active.row, null, 2));
  }
  if (browser) try { await browser.close(); } catch (error) { if (!primary) primary = error; }
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  try {
    for (const [file, bytes] of held) assert.deepEqual(fs.readFileSync(path.join(root, file)), bytes, 'Actual source held: ' + file);
    for (const [file, expected] of compiledHolds) assert.equal(sha(fs.readFileSync(file)), expected, 'Compiled input bytes held');
  } catch (error) {
    fs.writeFileSync(path.join(output, 'final-hold-failure.json'), JSON.stringify(reportError(error), null, 2));
    if (!primary) primary = error;
  }
  fs.writeFileSync(path.join(output, 'source-after.json'), JSON.stringify([...held.keys()].map(file => {
    const bytes = fs.readFileSync(path.join(root, file)); return { file, bytes: bytes.length, sha256: sha(bytes) };
  }), null, 2));
  const observed = active ? [...rows, active.row] : rows;
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify({
    scope: 'Fictional engine-prepared review through actual compiled page, hook and declared providers. No browser-played whole season, App route, global chrome, C lifecycle or production credit.',
    preparedSeed: 291, configuredContexts: cases.length, attemptedContexts: attempted, completedContexts: rows.length, validatedContexts: rows.length - validationFailures.length,
    nativeConfirmedActions: observed.reduce((total, row) => total + row.traces.filter(turn => turn.confirmed).length, 0),
    uncertainPhysicalWrites: observed.filter(row => row.mode === 'uncertain' && (row.fault?.after ?? row.latestSnapshot)?.operations.some(operation => operation.effect === 'landed-before-unreadable-confirmation')).length,
    originalImages: observed.reduce((total, row) => total + row.screenshots.length + (row.focusFailureScreenshot ? 1 : 0) + (row.failureScreenshot ? 1 : 0), 0),
    copiedObservationControls: controlResults,
    validationFailures, primaryFailure: primary ? reportError(primary) : null,
    results: observed.map(row => ({ size: row.size.id, mode: row.mode, confirmedActions: row.traces.filter(turn => turn.confirmed).length,
      images: row.screenshots.length + (row.focusFailureScreenshot ? 1 : 0) + (row.failureScreenshot ? 1 : 0), completed: rows.includes(row) })),
  }, null, 2));
  console.log('Grand Prix Boss management proof: ' + output);
}
if (primary) throw primary;
console.log('GP_MANAGEMENT_BROWSER: six actual contexts,15 confirmed actions plus one uncertain landed rollover,16 original images and16 effective copied-observation controls.');
