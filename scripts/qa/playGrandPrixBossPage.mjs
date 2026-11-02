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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = path.resolve(process.env.GP_BOSS_BROWSER_OUT || os.tmpdir());
fs.mkdirSync(base, { recursive: true });
const output = fs.mkdtempSync(path.join(base, 'gp-page-'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['src/pages/GrandPrixBoss.tsx', 'src/hooks/useGrandPrixBoss.ts', 'src/lib/grandPrixBoss.ts', 'src/lib/saveFence.ts', 'src/hooks/useSaveFenceWatch.ts', 'src/hooks/useRevealScroll.ts', 'src/components/game/RulesGate.tsx', 'scripts/qa/fixtures/grandPrixBoss.entry.tsx'];
const held = new Map(files.map(file => [file, fs.readFileSync(path.join(root, file))]));
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
const server = http.createServer((request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname, asset = assets.get(name);
  response.writeHead(request.method !== 'GET' ? 405 : asset ? 200 : name === '/favicon.ico' ? 204 : 404, { 'Content-Type': asset?.[1] || 'text/plain' });
  response.end(request.method === 'GET' ? asset?.[0] || '' : '');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`, url = origin + '/grand-prix-boss';
const money = value => '€' + value.toLocaleString('en-US');
const FAILED = 'Your browser could not save that change. Your team has not advanced. Free some space and try again.';
const UNCERTAIN = 'The save may have landed, but your browser could not confirm it. Reload your saved team before continuing.';
const MOVED = 'Your saved team changed in another tab. Reload it before making another decision.';

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

function parse(snapshot) {
  assert.equal(typeof snapshot.raw, 'string', 'Actual durable team exists');
  const saved = JSON.parse(snapshot.raw);
  assert.equal(saved.schemaVersion, 1, 'Actual saved envelope version');
  assert.equal(engine.validateSavedCareer(saved.career).ok, true, 'Actual saved career reader');
  return saved;
}
function validate(row) {
  assert.equal(row.consent, 'rejected', 'Actual rejected consent');
  assert.equal(row.help.first, true, 'Rules before play');
  assert.equal(row.help.firstReturnFocus, true, 'First rules return native focus');
  for (const phrase of ['twelve-race season', 'laps 12 and 26', 'A two-driver example', 'Every action is saved']) assert(row.help.text.includes(phrase), 'Actual worked rules: ' + phrase);
  for (const bounds of row.help.bounds) assert(bounds.left >= 0 && bounds.top >= 0 && bounds.right <= row.size.width && bounds.bottom <= row.size.height, 'Rules dialog remains in viewport');
  assert(row.initial.native.random && row.initial.native.date && row.initial.native.crypto, 'Native random seed and clock');
  const initial = parse(row.initial);
  assert.deepEqual([initial.career.phase, initial.career.round, initial.career.revision, initial.completedSeasons], ['preRace', 0, 0, []], 'Native new team before progression');
  for (const quote of row.quotes) assert.equal(quote.text, quote.cost === null ? 'At the limit' : money(quote.cost), 'Displayed authoritative quote');
  if (row.size.mobile) { assert.equal(row.hub.y, 0, 'First hub measured before page scroll'); assert(row.hub.top <= 430, 'First hub action phone fold'); }
  for (const turn of row.trace) {
    assert.deepEqual(parse(turn.after).career, turn.expected, 'Exact committed UI action: ' + turn.action.type);
    assert.equal(Number(turn.after.generation), Number(turn.before.generation) + 1, 'One durable action generation');
    assert.deepEqual(parse(turn.after).completedSeasons, [], 'First race never claims a season');
  }
  for (const action of row.actions) {
    if (action.stable !== null) assert.equal(action.stable, true, 'Native race action keeps focus');
    for (const scroll of action.scroll.scrolls) {
      assert.equal(scroll.connected, true, 'Measured reveal target remains connected');
      const visible = Math.max(0, Math.min(scroll.before.bottom, scroll.insets.vh - scroll.insets.bottom) - Math.max(scroll.before.top, scroll.insets.top));
      const comfortable = scroll.before.top >= scroll.insets.top - 4 && visible >= Math.min(190, scroll.before.height);
      assert(!(comfortable && scroll.finalY > scroll.y + 4), 'No downward jump from readable content');
      assert(scroll.after.top >= scroll.afterInsets.top - 4, 'Reveal keeps the new content top');
    }
    for (const scroll of action.scroll.scrollTos) assert(Math.abs(scroll.finalY - scroll.y) <= 4, 'No unowned window scroll');
  }
  for (const width of row.widths) assert(width.scrollWidth <= width.clientWidth, 'No horizontal page overflow');
  for (const target of row.targets) { assert(target.width >= 44 && target.height >= 44, 'Native content target floor'); assert.equal(target.hit, true, 'Native content target is reachable'); }
  for (const back of row.backs) assert.equal(back.focused, true, 'Back restores the actual opener');
  for (const reload of row.reloads) {
    assert.notEqual(reload.after.timeOrigin, reload.before.timeOrigin, 'Reload creates a new document');
    assert.equal(reload.after.navigationType, 'reload', 'Actual native reload navigation');
    assert.equal(reload.after.raw, reload.expected.raw, 'Native reload adopts exact durable bytes');
    assert.equal(reload.after.generation, reload.expected.generation, 'Native reload does not write');
  }
  const normalized = value => value.replace(/\s+/g, ' ').trim();
  for (const panel of row.panels) {
    const career = parse(panel.saved).career, own = career.drivers.filter(driver => driver.contract?.teamId === career.teamId);
    if (panel.name === 'Drivers') assert.deepEqual(panel.articles.map(normalized), own.map(driver => `${driver.name}, ${driver.age} ${money(driver.contract.wagePerRace)} per race, ${driver.contract.years} year contract Pace ${driver.skills.pace}, consistency ${driver.skills.consistency}, tyre care ${driver.skills.tyreCare}, wet ${driver.skills.wet}`), 'Actual owned driver terms and skills');
    if (panel.name === 'Finances') assert.deepEqual(panel.stats, [money(career.cash), money(career.reserved), money(career.cash - career.reserved), money(own.reduce((sum, driver) => sum + driver.contract.wagePerRace, 0))], 'Actual displayed finances');
    if (panel.name === 'History') {
      if (!career.results.length) assert(panel.text.includes('Your first result appears after the opening race.'), 'Actual empty history');
      else assert.deepEqual(panel.articles.map(normalized), career.results.map(result => `${career.calendar.find(track => track.id === result.roundId).name} ${result.classification.filter(value => value.teamId === career.teamId).map(value => career.drivers.find(driver => driver.id === value.driverId).name + ': ' + (value.status === 'retired' ? 'retired' : 'P' + value.position) + ', ' + value.points + ' pts').join('. ')} Prize ${money(result.teamPrize)}, costs ${money(result.operatingCost)}`), 'Actual saved race history');
    }
    if (panel.name === 'Standings') {
      const order = (a, b) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums;
      const drivers = career.driverStandings.slice().sort((a, b) => order(a, b) || a.driverId.localeCompare(b.driverId)).map((value, index) => [String(index + 1), career.drivers.find(driver => driver.id === value.driverId).name + (own.some(driver => driver.id === value.driverId) ? ', your team' : ''), String(value.points), String(value.wins)]);
      const teams = career.constructorStandings.slice().sort((a, b) => order(a, b) || a.teamId.localeCompare(b.teamId)).map((value, index) => [String(index + 1), career.teams.find(team => team.id === value.teamId).name + (value.teamId === career.teamId ? ', your team' : ''), String(value.points), String(value.wins)]);
      assert.deepEqual(panel.tables, [drivers, teams], 'Actual driver and team championship rows');
    }
  }
  for (const view of row.races) {
    const career = parse(view.saved).career;
    const order = career.race.entries.slice().sort((a, b) => Number(a.status === 'retired') - Number(b.status === 'retired') || b.completedLaps - a.completedLaps || a.elapsedMs - b.elapsedMs || a.driverId.localeCompare(b.driverId));
    const own = career.drivers.filter(driver => driver.contract?.teamId === career.teamId);
    assert.deepEqual(view.cards, own.map(driver => {
      const entry = career.race.entries.find(value => value.driverId === driver.id);
      return { name: driver.name, position: entry.status === 'retired' ? 'Retired' : 'P' + (order.findIndex(value => value.driverId === driver.id) + 1), tyres: entry.compound.charAt(0).toUpperCase() + entry.compound.slice(1) + ' tyres, ' + Math.round(entry.tyreWear) + '% wear, ' + entry.stops + ' stops' };
    }), 'Actual two-driver race cards');
  }
  for (const controls of row.orderControls) {
    assert.equal(controls.paceDisabled, controls.status === 'retired', 'Actual retired pace control state');
    assert.equal(controls.pitDisabled, controls.status === 'retired' || controls.lap === 0, 'Actual retired or initial pit control state');
  }
  if (row.mode === 'race') {
    assert.equal(row.help.reopened, true, 'Rules reopen and native Escape');
    assert.equal(row.help.returnedFocus, true, 'Help Escape restores actual trigger');
    assert.equal(row.startedFocus, true, 'Native Start focuses Next race');
    assert.equal(row.moved.message, MOVED, 'Real second tab makes first tab sticky');
    assert.equal(row.moved.disabled, true, 'Stale native action is disabled');
    assert.equal(row.moved.nativeClick, true, 'Native stale action was tried');
    assert.equal(row.moved.before.raw, row.moved.after.raw, 'Stale first tab cannot overwrite second tab');
    assert.equal(row.moved.before.generation, row.moved.after.generation, 'Stale first tab cannot move generation');
    assert.equal(row.secondMoved, true, 'Recovered first tab makes old second tab sticky');
    const start = row.trace.find(turn => turn.action.type === 'startRace');
    assert.equal(start.action.setups.length, 2, 'Both owned drivers have explicit setups');
    assert.deepEqual(start.action.setups.map(value => [value.compound, value.pace]), [['hard', 'conserve'], ['medium', 'push']], 'Both literal native tyre and pace choices');
    assert.deepEqual(row.trace.filter(turn => turn.action.type === 'raceInterval').map(turn => turn.expected.race.lap), [12, 26, 40], 'All actual first-race decisions');
    const finish = row.trace.find(turn => turn.expected.phase === 'raceResult').expected, result = finish.results[0];
    assert.equal(row.finish.prize, money(result.teamPrize), 'Actual displayed race prize');
    assert.equal(row.finish.cost, money(result.operatingCost), 'Actual displayed race costs');
    assert.equal(parse(row.final).career.round, 1, 'Next round advances once');
    assert.equal(parse(row.final).career.results.length, 1, 'Exactly one saved race');
    assert.equal(row.readOnlyHeld, true, 'Read-only panels and help hold save and fence');
  } else {
    const fault = row.fault, before = parse(fault.before), physical = parse(fault.after);
    assert.equal(fault.panelAfter, fault.panelBefore, 'Failed save preserves the displayed team');
    assert.equal(fault.after.operations.filter(value => value.effect === (row.mode === 'quota' ? 'quota-threw' : row.mode === 'noop' ? 'noop' : 'landed-before-unreadable-confirmation')).length, 1, 'One effective owned storage fault');
    assert.equal(fault.after.armed, null, 'Owned storage fault was consumed');
    if (row.mode === 'uncertain') {
      assert.equal(fault.message, UNCERTAIN, 'Landed unreadable confirmation message');
      assert.equal(fault.disabled, true, 'Uncertain team blocks further mutation');
      assert.deepEqual(physical.career, fault.expected, 'Uncertain write physically landed once');
      assert.equal(Number(fault.after.generation), Number(fault.before.generation) + 1, 'Uncertain write keeps landed fence');
      assert.equal(fault.after.operations.filter(value => value.effect === 'confirmation-threw').length, 1, 'Actual confirmation read fault');
      assert.equal(row.reloads.length, 1, 'Uncertain state uses native Reload');
    } else {
      assert.equal(fault.message, FAILED, 'Refused save recovery message');
      assert.equal(fault.disabled, false, 'Refused save allows a native retry');
      assert.equal(fault.after.raw, fault.before.raw, 'Refused save preserves exact game bytes');
      assert.equal(fault.after.generation, fault.before.generation, 'Refused save restores exact fence');
      assert.deepEqual(physical.career, before.career, 'Refused save holds career revision');
    }
    assert.equal(row.trace.length, 1, 'One successful native recovery action');
  }
  assert.deepEqual(row.unexpected, [], 'No unexpected external request');
  assert.deepEqual(row.writes, [], 'No attempted production write');
  assert.deepEqual(row.pageErrors, [], 'No page runtime error');
  assert.deepEqual(row.consoleErrors, [], 'No console error');
  assert.deepEqual(row.failed, [], 'No failed browser request');
  assert.equal(row.screenshots.length, row.mode === 'race' ? 5 : row.mode === 'uncertain' ? 2 : 1, 'All original state images');
  for (const shot of row.screenshots) {
    const bytes = fs.readFileSync(path.join(output, shot.name));
    assert.equal(sha(bytes), shot.sha256, 'Original screenshot bytes');
    assert.equal(bytes.readUInt32BE(16), row.size.width * row.dpr, 'Original screenshot width');
    assert.equal(bytes.readUInt32BE(20), row.size.height * row.dpr, 'Original screenshot height');
  }
}

const results = [];
let browser = null, pending = null;
try {
  browser = await chromium.launch({ args: ['--no-sandbox'] });
  for (const size of [{ id: 'mini', width: 320, height: 664, mobile: true }, { id: 'phone', width: 392, height: 731, mobile: true }, { id: 'desktop', width: 1440, height: 900, mobile: false }]) for (const mode of ['race', 'quota', 'noop', 'uncertain']) {
    const row = { size, mode, dpr: size.mobile ? 2 : 1, help: { bounds: [] }, quotes: [], trace: [], actions: [], widths: [], targets: [], backs: [], reloads: [], panels: [], races: [], orderControls: [], pageErrors: [], consoleErrors: [], failed: [], unexpected: [], writes: [], screenshots: [] };
    pending = row;
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: row.dpr, isMobile: size.mobile, hasTouch: size.mobile, locale: 'en-US', timezoneId: 'America/New_York' });
    try {
      await context.addInitScript(installProbe);
      await context.route('**/*', route => {
        const request = route.request(), address = request.url();
        if (request.method() !== 'GET') { row.writes.push({ url: address, method: request.method() }); return route.abort(); }
        if (address.startsWith(origin + '/')) return route.continue();
        const font = fonts.get(address);
        if (font) return route.fulfill({ status: 200, body: font.body, contentType: font.contentType });
        row.unexpected.push({ url: address, method: request.method() }); return route.abort();
      });
      const attach = page => {
        page.on('pageerror', error => row.pageErrors.push({ message: error.message, stack: error.stack }));
        page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
        page.on('requestfailed', request => row.failed.push({ url: request.url(), method: request.method(), error: request.failure()?.errorText ?? null }));
        page.setDefaultTimeout(7000);
      };
      const page = await context.newPage(); attach(page);
      const inspect = current => current.evaluate(() => window.gpBrowserProof.inspect());
      const settle = async current => {
        await current.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        let last = null, same = 0;
        for (let count = 0; count < 30; count++) {
          await current.waitForTimeout(60);
          const now = await current.evaluate(() => Math.round(scrollY));
          same = now === last ? same + 1 : 0; last = now;
          if (same >= 3) return;
        }
        throw new Error('Native scroll did not settle');
      };
      const measure = async current => row.widths.push(await current.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth })));
      const target = async (locator, name) => {
        assert.equal(await locator.count(), 1, 'One native control: ' + name);
        await locator.scrollIntoViewIfNeeded();
        row.targets.push(await locator.evaluate(el => { const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { name: el.textContent?.trim() || el.getAttribute('aria-label'), width: r.width, height: r.height, hit: !!hit && (el === hit || el.contains(hit)) }; }));
      };
      const press = async (current, locator, name, stable = false) => {
        await target(locator, name);
        if (stable) await locator.evaluate(el => { window.gpNativeAction = el; });
        await current.evaluate(() => window.gpBrowserProof.resetScroll());
        await locator.click(); await settle(current);
        row.actions.push({ name, stable: stable ? await current.evaluate(() => document.activeElement === window.gpNativeAction && window.gpNativeAction.isConnected) : null, scroll: await current.evaluate(() => window.gpBrowserProof.readScroll()) });
        await measure(current);
      };
      const choose = async (current, locator, value) => {
        await target(locator, 'choose ' + value);
        await current.evaluate(() => window.gpBrowserProof.resetScroll());
        await locator.selectOption(value); await settle(current);
        row.actions.push({ name: 'choose ' + value, stable: null, scroll: await current.evaluate(() => window.gpBrowserProof.readScroll()) });
        await measure(current);
      };
      const shot = async (current, name) => {
        const filename = `${size.id}-${mode}-${name}.png`;
        await current.screenshot({ path: path.join(output, filename) });
        row.screenshots.push({ name: filename, sha256: sha(fs.readFileSync(path.join(output, filename))) });
      };
      const open = async (current, name) => { await press(current, current.getByRole('button', { name, exact: true }), 'open ' + name); await current.locator(`[data-gp-panel="${name}"]`).waitFor(); };
      const back = async (current, name) => {
        await press(current, current.getByRole('button', { name: 'Back to team', exact: true }), 'Back from ' + name);
        row.backs.push({ name, focused: await current.getByRole('button', { name, exact: true }).evaluate(el => el === document.activeElement) });
      };
      const quote = async current => {
        const career = parse(await inspect(current)).career;
        for (const area of ['power', 'aero', 'reliability']) row.quotes.push({ area, cost: career.upgradeCosts[area], text: await current.getByTestId('gp-' + area + '-cost').innerText() });
      };
      const panelSnapshot = async (current, name) => {
        const panel = current.locator(`[data-gp-panel="${name}"]`), value = { name, saved: await inspect(current), text: await panel.innerText() };
        if (name === 'Drivers' || name === 'History') value.articles = await panel.locator('article').allInnerTexts();
        if (name === 'Finances') {
          value.stats = [];
          for (const title of ['Cash', 'Reserved for entries and wages', 'Available to spend', 'Your drivers per race']) value.stats.push(await panel.locator('p').filter({ hasText: new RegExp('^' + title + '$') }).locator('..').locator('p').last().innerText());
        }
        if (name === 'Standings') value.tables = await panel.locator('table').evaluateAll(tables => tables.map(table => [...table.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent.replace(/\s+/g, ' ').trim()))));
        row.panels.push(value);
      };
      const raceSnapshot = async current => row.races.push({ saved: await inspect(current), cards: await current.locator('[data-gp-panel="Next race"] section').evaluateAll(sections => sections.map(section => ({ name: section.querySelector('h4')?.textContent?.trim(), position: section.querySelector(':scope > div p')?.textContent?.trim(), tyres: section.querySelector(':scope > p')?.textContent?.trim() }))) });
      const commit = async (current, action, button, stable = false) => {
        const before = await inspect(current), expected = engine.applyAction(parse(before).career, { ...action, expectedRevision: parse(before).career.revision });
        assert.equal(expected.ok, true, 'Chosen UI action is legal: ' + action.type);
        await press(current, current.getByRole('button', { name: button, exact: true }), button, stable);
        const after = await inspect(current);
        row.trace.push({ before, action: { ...action, expectedRevision: parse(before).career.revision }, expected: expected.state, after });
        assert.deepEqual(parse(after).career, expected.state, 'Actual native button committed its literal action');
        return expected.state;
      };
      const reload = async (current, expected) => {
        const before = await inspect(current);
        await Promise.all([current.waitForEvent('load'), current.getByRole('button', { name: 'Reload saved team', exact: true }).click()]);
        await current.getByRole('button', { name: 'Next race', exact: true }).waitFor();
        await current.evaluate(() => document.fonts.ready);
        await settle(current);
        row.reloads.push({ before, expected, after: await inspect(current) });
      };
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await answerConsent(page, { wait: 3000 });
      row.consent = await storedConsent(page);
      const dialog = page.getByRole('dialog', { name: 'How to play Grand Prix Boss', exact: true });
      await dialog.waitFor(); row.help.first = true; row.help.text = await dialog.innerText();
      row.help.bounds.push(await dialog.evaluate(el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; })); await measure(page);
      if (mode === 'race') await shot(page, 'rules');
      await press(page, dialog.getByRole('button', { name: "Let's Play!", exact: true }), 'first rules');
      row.help.firstReturnFocus = await page.getByRole('button', { name: 'How to play', exact: true }).evaluate(el => document.activeElement === el);
      await press(page, page.getByRole('button', { name: 'Start your team', exact: true }), 'Start your team');
      await page.getByRole('button', { name: 'Next race', exact: true }).waitFor();
      row.initial = await inspect(page);
      row.startedFocus = await page.getByRole('button', { name: 'Next race', exact: true }).evaluate(el => document.activeElement === el);
      row.hub = await page.getByRole('button', { name: 'Next race', exact: true }).evaluate(el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height, y: scrollY, viewportWidth: innerWidth, viewportHeight: innerHeight }; });
      if (mode === 'race') await shot(page, 'hub');
      await open(page, 'Car'); await quote(page);
      if (mode === 'race') {
        await commit(page, { type: 'upgrade', area: 'power' }, 'Improve power'); await quote(page); await back(page, 'Car');
        const readOnly = await inspect(page);
        for (const name of ['Drivers', 'Finances', 'Standings', 'History']) { await open(page, name); await panelSnapshot(page, name); await back(page, name); }
        await press(page, page.getByRole('button', { name: 'How to play', exact: true }), 'reopen rules');
        await dialog.waitFor(); row.help.reopened = (await dialog.innerText()).includes('A two-driver example');
        row.help.bounds.push(await dialog.evaluate(el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; })); await measure(page);
        await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' }); await settle(page);
        row.help.returnedFocus = await page.getByRole('button', { name: 'How to play', exact: true }).evaluate(el => el === document.activeElement);
        const readOnlyAfter = await inspect(page);
        row.readOnlyHeld = readOnly.raw === readOnlyAfter.raw && readOnly.generation === readOnlyAfter.generation;
        const second = await context.newPage(); attach(second); await second.goto(url, { waitUntil: 'networkidle' });
        await second.getByRole('button', { name: 'Next race', exact: true }).waitFor();
        await open(second, 'Next race'); await commit(second, { type: 'qualify' }, 'Run qualifying', true);
        await page.getByRole('status').filter({ hasText: MOVED }).waitFor();
        await open(page, 'Next race');
        const movedBefore = await inspect(page), disabled = await page.getByRole('button', { name: 'Run qualifying', exact: true }).isDisabled();
        const staleButton = page.getByRole('button', { name: 'Run qualifying', exact: true });
        await staleButton.scrollIntoViewIfNeeded();
        const box = await staleButton.boundingBox(); assert(box, 'Actual disabled stale button has geometry');
        if (size.mobile) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await settle(page);
        const movedAfter = await inspect(page);
        row.moved = { message: await page.getByRole('status').innerText(), disabled, nativeClick: true, before: movedBefore, after: movedAfter };
        await reload(page, await inspect(second)); await open(page, 'Next race');
        const career = parse(await inspect(page)).career, drivers = career.drivers.filter(driver => driver.contract?.teamId === career.teamId);
        const setups = drivers.map((driver, index) => ({ driverId: driver.id, compound: index === 0 ? 'hard' : 'medium', pace: index === 0 ? 'conserve' : 'push' }));
        for (const [index, driver] of drivers.entries()) {
          await choose(page, page.getByRole('combobox', { name: 'Tyres for ' + driver.name, exact: true }), setups[index].compound);
          await choose(page, page.getByRole('combobox', { name: 'Pace for ' + driver.name, exact: true }), setups[index].pace);
        }
        await shot(page, 'grid');
        await commit(page, { type: 'startRace', setups }, 'Start race', true);
        await raceSnapshot(page);
        await second.getByRole('status').filter({ hasText: MOVED }).waitFor(); row.secondMoved = true;
        for (const lap of [12, 26, 40]) {
          const current = parse(await inspect(page)).career;
          const orders = [];
          for (const [index, driver] of drivers.entries()) {
            const entry = current.race.entries.find(value => value.driverId === driver.id);
            const pace = page.getByRole('combobox', { name: 'Pace for ' + driver.name, exact: true });
            if (entry.status === 'running') await choose(page, pace, index === 0 ? 'conserve' : 'balanced');
            const order = { driverId: driver.id, pace: await pace.inputValue() };
            const pit = page.getByRole('combobox', { name: 'Pit choice for ' + driver.name, exact: true });
            row.orderControls.push({ driverId: driver.id, status: entry.status, lap: current.race.lap, paceDisabled: await pace.isDisabled(), pitDisabled: await pit.isDisabled() });
            if (current.race.lap === 12 && entry.status === 'running' && index === 0) { await choose(page, pit, 'hard'); order.pitTo = 'hard'; }
            orders.push(order);
          }
          await commit(page, { type: 'raceInterval', orders }, 'Run to lap ' + lap, true);
          await raceSnapshot(page);
          if (lap === 12) await shot(page, 'lap-12');
        }
        const resultPanel = page.locator('[data-gp-panel="Next race"]');
        const stat = name => resultPanel.locator('p').filter({ hasText: new RegExp('^' + name + '$') }).locator('..').locator('p').last().innerText();
        row.finish = { prize: await stat('Race prize'), cost: await stat('Entry and wages') };
        await shot(page, 'finish');
        await back(page, 'Next race'); await open(page, 'History'); await panelSnapshot(page, 'History'); await back(page, 'History');
        await open(page, 'Standings'); await panelSnapshot(page, 'Standings'); await back(page, 'Standings');
        await open(page, 'Next race'); await commit(page, { type: 'continue' }, 'Next round', true);
      } else {
        const before = await inspect(page), career = parse(before).career, expected = engine.applyAction(career, { type: 'upgrade', area: 'power', expectedRevision: career.revision });
        assert.equal(expected.ok, true, 'Fault targets a legal affordable upgrade');
        const panelBefore = await page.locator('[data-gp-panel="Car"]').innerText();
        await page.evaluate(value => window.gpBrowserProof.arm(value), mode);
        await press(page, page.getByRole('button', { name: 'Improve power', exact: true }), 'owned ' + mode + ' upgrade');
        row.fault = { before, expected: expected.state, after: await inspect(page), panelBefore, panelAfter: await page.locator('[data-gp-panel="Car"]').innerText(), message: await page.getByRole('status').innerText(), disabled: await page.getByRole('button', { name: 'Improve power', exact: true }).isDisabled() };
        await shot(page, 'fault');
        await page.evaluate(() => window.gpBrowserProof.disarm());
        if (mode === 'uncertain') {
          await reload(page, row.fault.after); await open(page, 'Car'); await quote(page); await shot(page, 'reloaded');
        }
        await commit(page, { type: 'upgrade', area: 'power' }, 'Improve power'); await quote(page);
      }
      row.final = await inspect(page); await measure(page);
      validate(row);
      const controls = [
        ['quote', 'Displayed authoritative quote', value => { value.quotes[0].text = 'changed'; }],
        ['action', 'Exact committed UI action', value => { value.trace[0].after.raw = JSON.stringify({ ...JSON.parse(value.trace[0].after.raw), career: { ...JSON.parse(value.trace[0].after.raw).career, cash: JSON.parse(value.trace[0].after.raw).career.cash + 1 } }); }],
        ['generation', 'One durable action generation', value => { value.trace[0].after.generation = value.trace[0].before.generation; }],
        ['overflow', 'No horizontal page overflow', value => { value.widths[0].scrollWidth = value.widths[0].clientWidth + 1; }],
        ['target', 'Native content target floor', value => { value.targets[0].width = 1; }],
        ['reach', 'Native content target is reachable', value => { value.targets[0].hit = false; }],
        ['rules', 'Rules before play', value => { value.help.first = false; }],
        ['rules-focus', 'First rules return native focus', value => { value.help.firstReturnFocus = false; }],
        ['worked-rules', 'Actual worked rules: A two-driver example', value => { value.help.text = value.help.text.replace('A two-driver example', 'changed'); }],
        ['help-bounds', 'Rules dialog remains in viewport', value => { value.help.bounds[0].right = value.size.width + 1; }],
        ['native-rng', 'Native random seed and clock', value => { value.initial.native.crypto = false; }],
        ['jump', 'No downward jump from readable content', value => { value.actions[0].scroll.scrolls.push({ connected: true, before: { top: 20, height: 240, bottom: 260 }, y: 0, insets: { top: 0, bottom: 0, vh: value.size.height }, finalY: 20, after: { top: 0 }, afterInsets: { top: 0 } }); }],
        ['lost-top', 'Reveal keeps the new content top', value => { value.actions[0].scroll.scrolls.push({ connected: true, before: { top: -100, height: 240, bottom: 140 }, y: 0, insets: { top: 0, bottom: 0, vh: value.size.height }, finalY: 0, after: { top: -10 }, afterInsets: { top: 0 } }); }],
        ['window-scroll', 'No unowned window scroll', value => { value.actions[0].scroll.scrollTos.push({ y: 0, finalY: 20 }); }],
        ['external', 'No unexpected external request', value => { value.unexpected.push('changed'); }],
        ['writes', 'No attempted production write', value => { value.writes.push('changed'); }],
        ['runtime', 'No page runtime error', value => { value.pageErrors.push('changed'); }],
        ['console', 'No console error', value => { value.consoleErrors.push('changed'); }],
        ['failed-request', 'No failed browser request', value => { value.failed.push('changed'); }],
      ];
      if (size.mobile) controls.push(['fold', 'First hub action phone fold', value => { value.hub.top = 431; }], ['before-scroll', 'First hub measured before page scroll', value => { value.hub.y = 1; }]);
      if (mode === 'race') controls.push(
        ['focus', 'Native race action keeps focus', value => { value.actions.find(action => action.stable !== null).stable = false; }],
        ['back', 'Back restores the actual opener', value => { value.backs[0].focused = false; }],
        ['reload', 'Actual native reload navigation', value => { value.reloads[0].after.navigationType = 'navigate'; }],
        ['stale', 'Stale native action is disabled', value => { value.moved.disabled = false; }],
        ['both-setups', 'Both literal native tyre and pace choices', value => { value.trace.find(turn => turn.action.type === 'startRace').action.setups[1].pace = 'conserve'; }],
        ['prize', 'Actual displayed race prize', value => { value.finish.prize = 'changed'; }],
        ['read-only', 'Read-only panels and help hold save and fence', value => { value.readOnlyHeld = false; }],
        ['driver-terms', 'Actual owned driver terms and skills', value => { value.panels.find(panel => panel.name === 'Drivers').articles[0] = 'changed'; }],
        ['finances', 'Actual displayed finances', value => { value.panels.find(panel => panel.name === 'Finances').stats[0] = 'changed'; }],
        ['standings', 'Actual driver and team championship rows', value => { value.panels.find(panel => panel.name === 'Standings').tables[0][0][2] = '-1'; }],
        ['history', 'Actual saved race history', value => { value.panels.find(panel => panel.name === 'History' && panel.articles.length).articles[0] = 'changed'; }],
        ['race-cards', 'Actual two-driver race cards', value => { value.races[0].cards[0].position = 'changed'; }],
        ['retired-pace', 'Actual retired pace control state', value => { value.orderControls[0].paceDisabled = !value.orderControls[0].paceDisabled; }],
        ['retired-pit', 'Actual retired or initial pit control state', value => { value.orderControls[0].pitDisabled = !value.orderControls[0].pitDisabled; }],
      );
      else controls.push(['held-ui', 'Failed save preserves the displayed team', value => { value.fault.panelAfter += 'changed'; }], ['fault-consumed', 'Owned storage fault was consumed', value => { value.fault.after.armed = mode; }]);
      if (mode === 'quota' || mode === 'noop') controls.push(['held-bytes', 'Refused save preserves exact game bytes', value => { value.fault.after.raw += ' '; }], ['held-fence', 'Refused save restores exact fence', value => { value.fault.after.generation = String(Number(value.fault.after.generation) + 1); }]);
      if (mode === 'uncertain') controls.push(['blocked', 'Uncertain team blocks further mutation', value => { value.fault.disabled = false; }], ['landed', 'Uncertain write physically landed once', value => { value.fault.after.raw = value.fault.before.raw; }], ['reload', 'Actual native reload navigation', value => { value.reloads[0].after.navigationType = 'navigate'; }]);
      row.controls = [];
      for (const [name, owned, change] of controls) {
        const copy = structuredClone(row), before = JSON.stringify(copy); change(copy);
        assert.notEqual(JSON.stringify(copy), before, 'Copied observation control must change');
        assert.throws(() => validate(copy), error => error.name === 'AssertionError' && error.message.includes(owned), 'Effective owned control: ' + name);
        validate(row); row.controls.push({ name, owned, rejected: true, restored: true });
      }
      row.runtime = { pageErrors: row.pageErrors.length, consoleErrors: row.consoleErrors.length, otherRuntimeCounters: null };
      row.reveals = { siteScrolls: row.actions.reduce((sum, action) => sum + action.scroll.scrolls.length, 0), initiallyHidden: row.actions.flatMap(action => action.scroll.scrolls).filter(scroll => scroll.before.top < scroll.insets.top - 4 || scroll.before.top >= scroll.insets.vh - scroll.insets.bottom).length };
      fs.writeFileSync(path.join(output, size.id + '-' + mode + '.json'), JSON.stringify(row, null, 2));
      results.push(row); pending = null;
      console.log(`Grand Prix Boss ${size.id}/${mode}: ${row.trace.length} committed UI actions, ${row.reloads.length} native reloads, ${row.reveals.siteScrolls} measured site reveals, ${row.screenshots.length} original images, ${row.controls.length} effective copied-observation controls/restores.`);
    } finally { await context.close(); }
  }
  assert.equal(results.length, 12, 'Twelve finite compiled-page contexts');
  console.log(`playGrandPrixBossPage: 12 compiled actual-page contexts, ${results.reduce((sum, row) => sum + row.controls.length, 0)} effective controls/restores, ${results.reduce((sum, row) => sum + row.screenshots.length, 0)} original images. No App route or production-site claim.`);
} catch (error) {
  if (pending) fs.writeFileSync(path.join(output, pending.size.id + '-' + pending.mode + '-partial.json'), JSON.stringify(pending, null, 2));
  fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ name: error.name, message: error.message, stack: error.stack }, null, 2));
  throw error;
} finally {
  if (browser) await browser.close(); await new Promise(resolve => server.close(resolve));
  for (const [file, bytes] of held) assert.equal(sha(fs.readFileSync(path.join(root, file))), sha(bytes), 'Actual source held: ' + file);
  for (const [file, expected] of compiledHolds) assert.equal(sha(fs.readFileSync(file)), expected, 'Actual compiled bytes held: ' + path.basename(file));
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify({ scope: 'Compiled actual page/providers/consent/navbar, real hook and storage. App route, global chrome, production site and season completion are outside this proof.', contexts: results.length, actions: results.reduce((sum, row) => sum + row.trace.length, 0), controls: results.reduce((sum, row) => sum + row.controls.length, 0), screenshots: results.reduce((sum, row) => sum + row.screenshots.length, 0), sourceHolds: [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) })) }, null, 2));
}
