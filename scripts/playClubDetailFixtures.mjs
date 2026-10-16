/* Served Club Manager fixture reads from one retained actual simulated save.
 * Remote offline CI only. No match, transfer, real result or live site is claimed.
 */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Requires remote offline CI.');
assert(process.env.CDF_BROWSER_OUT && path.isAbsolute(process.env.CDF_BROWSER_OUT), 'CDF_BROWSER_OUT must be absolute.');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = new URL(process.env.BASE || 'http://127.0.0.1:4173').origin;
assert(/^http:\/\/127\.0\.0\.1:\d+$/.test(BASE), 'The served proof requires an explicit loopback origin.');
const OUT = path.join(process.env.CDF_BROWSER_OUT, 'browser'), REPORT = path.join(OUT, 'report.json');
const FIXTURE = 'scripts/data/clubFixturesBrowser.json', KEY = 'dukb-club-manager-save';
const FIXTURE_SHA = '63a4e053e402e6c80e97119580ce2b578894f0a979fca7c92841f13a4eabfd65';
const STATE_SHA = '7145b7b68a6f2bbf5674fe26b1e089d1357868a16475725151c34859c59eed6e';
const APP_REF = '0fd9cbbac389a25dd6c57e23beb46e808f72476f';
const NOW = Date.parse('2026-10-16T12:00:00Z');
const PROFILES = [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 1440, height: 900 }];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const require = createRequire(import.meta.url);
const hash = file => sha(fs.readFileSync(file)), copy = value => JSON.parse(JSON.stringify(value));
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
fs.mkdirSync(OUT, { recursive: true }); assert(!fs.existsSync(REPORT), 'Refuse to replace browser evidence.');
const report = { status: 'running', head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  appRef: APP_REF, base: BASE, clock: new Date(NOW).toISOString(), checks: 0, failures: 0, setupFailures: 0,
  cases: [], controls: [], captures: [], issues: [], preflights: [], sources: [], compiled: [], sourceHeld: false, distHeld: false,
  limits: ['This is a retained simulated Arsenal career, not real match results or a browser-played season.',
    'The missing-ledger scenario removes only pairResults.premier from a declared copy of the same retained state.',
    'The first actual load adds only the existing default managerXp block; browser inputs are its actual persisted output after two stable reloads.',
    'Expected fixtures use the source-bound real schedule and saved calendar prefix, independently of clubLeagueFixtures.',
    'Table, club, Fixtures, both Back actions and one literal reload per journey are covered. No competition engine is changed.',
    'All 38 DOM rows are compared; the first and last visible rows receive separate original captures in each journey.',
    'Four DOM-only faults test the unchanged detectors and are fully restored. They do not change football or saved bytes.',
    'External requests, including flags and fonts, are blocked. Captures show fallback fonts and earn no external image or font appearance credit.'] };
const write = () => fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
function check(ok, message, row) {
  report.checks++; if (row) row.checks++;
  if (!ok) { report.failures++; report.issues.push(message); if (row) row.issues.push(message); }
  return !!ok;
}
function setup(ok, message) { report.checks++; if (!ok) { report.setupFailures++; throw new Error(message); } }
function inventory(directory, base = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? inventory(file, base) : [{ file: path.relative(base, file).replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: hash(file) }];
  }).sort((a, b) => a.file.localeCompare(b.file));
}
function retain(name, bytes) {
  const file = path.join(OUT, name); assert(!fs.existsSync(file), 'Refuse to replace ' + name);
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes);
  return { file: name, bytes: fs.statSync(file).size, sha256: hash(file) };
}
function zeroDraws(action) {
  const oldRandom = Math.random, OldDate = Date, draws = [];
  Math.random = () => { draws.push({ ordinal: draws.length + 1, stack: new Error('Unexpected loader or display draw').stack }); return 0.6; };
  globalThis.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
  try { return { value: action(), draws }; } finally { Math.random = oldRandom; globalThis.Date = OldDate; }
}
let browser, compiledDirectory, sources = [], dist = [], tools = [], E, schedule, fixture;
const previousStorage = globalThis.localStorage, previousFetch = globalThis.fetch;
function rosterOracle(state) {
  const before = JSON.stringify(state), run = zeroDraws(() => {
    const money = E.moneyIn(state), top = [...state.squad].sort((a, b) => b.rating - a.rating).slice(0, 11);
    return { club: state.clubName, count: state.squad.length, label: 'Squad (' + state.squad.length + ' on the books)',
      average: String(Math.round(top.reduce((sum, player) => sum + player.rating, 0) / top.length)),
      value: money(Math.round(state.squad.reduce((sum, player) => sum + (player.value ?? 0), 0))),
      rows: state.squad.map(player => ({ name: player.name, position: player.position, age: player.age + 'y',
        value: money(player.value ?? 0), rating: String(player.rating), sale: null })) };
  });
  setup(JSON.stringify(state) === before && run.draws.length === 0, 'Independent saved squad projection must preserve state and RNG.');
  return run.value;
}
function fixtureOracle(state, scenario) {
  setup(state.clubName === 'Arsenal' && state.eraId === 'now' && state.startYear === 2026 && state.season === 1
    && state.week === 15 && state.realLeagueFixtures === schedule.key && schedule.key === 'premier-2026-27-v1', 'Retained fixture identity or real schedule binding differs.');
  setup(schedule.rounds.length === 38 && schedule.clubs.length === 20 && equal([...schedule.clubs].sort(), [...state.leagueClubs].sort()), 'Saved current league membership must equal the source-bound real schedule.');
  const played = state.calendar.slice(0, state.week).filter(entry => entry.type === 'league').length;
  const rows = schedule.rounds.map((pairs, round) => {
    const pair = pairs.filter(([home, away]) => home === state.clubName || away === state.clubName);
    setup(pair.length === 1, 'Each real schedule round must contain the saved club exactly once.');
    const [home, away] = pair[0], score = state.pairResults?.premier?.[home + '|' + away];
    const recorded = round < played && Array.isArray(score) && score.length === 2 && score.every(value => Number.isInteger(value) && value >= 0);
    return { round: String(round), matchday: 'Matchday ' + (round + 1), opponents: home + ' vs ' + away,
      result: round >= played ? 'Upcoming' : recorded ? score[0] + ' - ' + score[1] : 'Result not recorded' };
  });
  setup(played === 11 && rows.length === 38 && new Set(rows.map(row => row.opponents)).size === 38, 'Saved calendar-prefix progress and directed meetings must be unambiguous.');
  setup(rows.filter(row => row.result === 'Upcoming').length === 27 && rows.filter(row => row.result === 'Result not recorded').length === (scenario === 'recorded' ? 0 : 11), 'The independent oracle must have 11 played and 27 future rows.');
  setup(rows[0].opponents === 'Arsenal vs Coventry City' && rows[0].result === (scenario === 'recorded' ? '3 - 0' : 'Result not recorded'), 'The retained first simulated result must be the literal 3-0, or honestly missing.');
  return rows;
}
async function open(profile, raw, row) {
  const context = await browser.newContext({ viewport: profile, isMobile: profile.width < 1000, hasTouch: profile.width < 1000,
    reducedMotion: 'reduce', colorScheme: 'dark', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE,
      localStorage: [{ name: KEY, value: raw }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }] }] } });
  const page = await context.newPage(), aborted = new Set(); page.setDefaultTimeout(20000);
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === BASE && ['GET', 'HEAD'].includes(request.method())) {
      row.transport.push({ action: 'owned-read', method: request.method(), url: request.url() }); return route.continue();
    }
    if (url.origin === BASE) row.assetErrors.push('Owned write refused: ' + request.method() + ' ' + request.url());
    aborted.add(request.url()); row.transport.push({ action: 'abort', method: request.method(), url: request.url() });
    return route.abort('blockedbyclient');
  });
  await context.routeWebSocket('**/*', socket => { row.assetErrors.push('Unexpected websocket: ' + socket.url()); socket.close(); });
  page.on('pageerror', error => row.errors.push(String(error)));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const url = message.location().url, text = message.text();
    if (/Failed to load resource.*(?:ERR_FAILED|ERR_BLOCKED_BY_CLIENT)/.test(text) && aborted.has(url)) row.diagnostics.push({ url, text });
    else row.errors.push(url + ': ' + text);
  });
  page.on('response', response => { if (new URL(response.url()).origin === BASE) {
    row.responses.push({ url: response.url(), status: response.status() });
    if (response.status() >= 400) row.assetErrors.push('Owned asset ' + response.status() + ' ' + response.url());
  } });
  page.on('requestfailed', request => { if (new URL(request.url()).origin === BASE) row.assetErrors.push('Owned request failed: ' + request.url() + ' ' + request.failure()?.errorText); });
  await page.addInitScript(now => {
    const OldDate = Date; window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
  }, NOW);
  const saved = () => page.evaluate(key => ({ raw: localStorage.getItem(key), streak: localStorage.getItem('dukb-streaks-v1'),
    completions: localStorage.getItem('dukb-local-completions'), diary: localStorage.getItem('dukb-play-diary-v1') }), KEY);
  const activate = async node => { await node.scrollIntoViewIfNeeded(); if (profile.width < 1000) await node.tap(); else { await node.focus(); await node.press('Enter'); } };
  const enter = async () => {
    const resume = page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true });
    await resume.waitFor({ timeout: 45000 }); await activate(resume);
    await page.locator('[data-cm-hub]').waitFor({ timeout: 45000 }); await page.evaluate(() => document.fonts.ready);
  };
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' }); await enter();
  return { context, page, saved, activate, enter };
}
async function squad(walk) {
  const card = walk.page.locator('div.bg-card').filter({ has: walk.page.getByText(/^Squad \(\d+ on the books\)$/) });
  await card.waitFor({ timeout: 45000 }); assert.equal(await card.count(), 1, 'The saved squad card must be unique.');
  return card.evaluate(element => {
    const header = element.previousElementSibling, text = node => node?.textContent?.trim() ?? null;
    const metric = label => { const node = [...header.querySelectorAll('div')].find(node => node.childElementCount === 0 && text(node) === label); return text(node?.previousElementSibling); };
    const rows = [...element.querySelectorAll(':scope > div.py-1\\.5')].map(node => ({ name: text(node.querySelector('span.text-xs')),
      position: text(node.firstElementChild), age: text(node.querySelector('div.text-\\[9px\\]')), value: text(node.querySelector('span.text-gold')),
      rating: text(node.lastElementChild), sale: [...node.querySelectorAll('span')].map(text).find(value => value?.startsWith('sells ')) ?? null }));
    return { club: text(header.querySelector('div.text-xl')), count: rows.length, label: text(element.firstElementChild?.firstElementChild),
      average: metric('Best XI'), value: metric('Squad value'), rows };
  });
}
async function observedRows(region) {
  return region.locator('[data-club-fixture]').evaluateAll(nodes => nodes.map(node => ({ round: node.getAttribute('data-club-fixture'),
    matchday: node.children[0]?.textContent?.trim(), opponents: node.children[1]?.textContent?.trim(), result: node.children[2]?.textContent?.trim() })));
}
function rowFaults(observed, expected) {
  const faults = [];
  if (observed.length !== 38) faults.push('row-count');
  if (!equal(observed.map(row => row.round), expected.map(row => row.round))) faults.push('round-order');
  if (!equal(observed.map(row => row.matchday), expected.map(row => row.matchday))) faults.push('matchdays');
  if (!equal(observed.map(row => row.opponents), expected.map(row => row.opponents))) faults.push('directed-opponents');
  if (!equal(observed.map(row => row.result), expected.map(row => row.result))) faults.push('recorded-or-honest-result');
  return faults;
}
async function geometry(region, last = false) {
  return region.evaluate(async (element, last) => {
    const list = element.querySelector('ul'), target = list?.querySelector(last ? 'li:last-child' : 'li:first-child');
    let previous = '', stable = 0, value;
    const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const painted = (node, clip) => {
      if (!node) return false;
      const r = node.getBoundingClientRect(), style = getComputedStyle(node);
      let left = Math.max(0, r.left, clip?.left ?? 0), right = Math.min(innerWidth, r.right, clip?.right ?? innerWidth);
      let top = Math.max(0, r.top, clip?.top ?? 0), bottom = Math.min(innerHeight, r.bottom, clip?.bottom ?? innerHeight);
      for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        if (parent === document.documentElement) continue; // Root overflow clips at the viewport already intersected above.
        const style = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
        const sx = bounds.width / (parent.offsetWidth || 1), sy = bounds.height / (parent.offsetHeight || 1);
        const x = bounds.left + parent.clientLeft * sx, y = bounds.top + parent.clientTop * sy;
        if (/^(auto|scroll|hidden|clip|overlay)$/.test(style.overflowX)) {
          left = Math.max(left, x); right = Math.min(right, x + parent.clientWidth * sx);
        }
        if (/^(auto|scroll|hidden|clip|overlay)$/.test(style.overflowY)) {
          top = Math.max(top, y); bottom = Math.min(bottom, y + parent.clientHeight * sy);
        }
      }
      const hit = right > left && bottom > top ? document.elementFromPoint((left + right) / 2, (top + bottom) / 2) : null;
      return style.visibility === 'visible' && Number(style.opacity) >= 0.99 && r.width > 0 && bottom - top >= r.height - 2
        && left >= 0 && right - left >= r.width - 2 && !!hit && (node === hit || node.contains(hit));
    };
    for (let frame = 0; frame < 120; frame++) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const clip = list?.getBoundingClientRect(), back = element.querySelector('button');
      value = { section: rect(element), list: list ? rect(list) : null, target: target ? rect(target) : null,
        viewport: [innerWidth, innerHeight], visible: (() => { for (let node = element; node; node = node.parentElement) {
          const style = getComputedStyle(node); if (style.visibility !== 'visible' || Number(style.opacity) < 0.99) return false;
        } return true; })(),
        horizontal: document.documentElement.scrollWidth <= innerWidth + 1 && element.scrollWidth <= element.clientWidth + 1
          && !!list && list.scrollWidth <= list.clientWidth + 1,
        rowReachable: painted(target, clip), backReachable: painted(back), backHeight: back?.getBoundingClientRect().height ?? 0,
        innerScroll: !!list && list.scrollHeight > list.clientHeight && ['auto', 'scroll'].includes(getComputedStyle(list).overflowY),
        scrollTop: list?.scrollTop, scrollHeight: list?.scrollHeight, clientHeight: list?.clientHeight,
        finiteAnimations: element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity).length };
      const signature = JSON.stringify(value); stable = signature === previous ? stable + 1 : 1; previous = signature;
      if (stable >= 4 && value.finiteAnimations === 0) break;
    }
    return { ...value, stable };
  }, last);
}
function layoutFaults(value) {
  const faults = [];
  if (!value.visible) faults.push('visible');
  if (!value.horizontal) faults.push('horizontal-fit');
  if (!value.rowReachable) faults.push('row-reachable');
  if (!value.backReachable || value.backHeight < 43) faults.push('back-reachable');
  if (!value.innerScroll) faults.push('inner-scroll');
  if (value.stable < 4 || value.finiteAnimations) faults.push('settled');
  return faults;
}
async function capture(walk, row, suffix, control = false) {
  const name = row.id + '-' + suffix + '.png', file = path.join(OUT, name);
  assert(!fs.existsSync(file), 'Refuse to replace a capture.');
  const position = () => walk.page.evaluate(() => {
    const section = document.querySelector('[aria-label="Club league fixtures"]'), rect = section?.getBoundingClientRect();
    return { viewport: [innerWidth, innerHeight], scroll: [scrollX, scrollY], list: section?.querySelector('ul')?.scrollTop,
      section: rect ? [rect.x, rect.y, rect.width, rect.height] : null };
  });
  const before = await position();
  await walk.page.screenshot({ path: file, fullPage: false });
  const after = await position(), bytes = fs.readFileSync(file);
  setup(equal(before, after), row.id + ': a viewport capture must preserve page, list and section position.');
  setup(bytes.readUInt32BE(0) === 0x89504e47 && bytes.readUInt32BE(16) === row.viewport.width
    && bytes.readUInt32BE(20) === row.viewport.height, row.id + ': original PNG must have the actual requested viewport dimensions.');
  const receipt = { file: name, bytes: bytes.length, sha256: sha(bytes), control, original: true, before, after };
  report.captures.push(receipt); row.shots.push(name); return receipt;
}
async function controls(walk, row, region, expected) {
  const handle = await region.elementHandle(); assert(handle, 'Controls require the actual served region.');
  const fault = async (name, apply, undo, observe, wanted) => {
    const before = await handle.evaluate(element => ({ html: element.outerHTML, scroll: element.querySelector('ul').scrollTop }));
    const positive = await observe(); setup(positive.faults.length === 0, name + ': positive detector must pass before fault.');
    const inverse = await handle.evaluate(apply); const changed = await handle.evaluate(element => element.outerHTML);
    setup(changed !== before.html, name + ': fault must change actual DOM bytes.');
    const bad = await observe(), receipt = { name, journey: row.id, positive, bad, beforeHtml: before.html, faultHtml: changed };
    report.controls.push(receipt); await capture(walk, row, 'control-' + name, true);
    check(wanted(bad.faults), name + ': the unchanged detector must reject its actual DOM fault: ' + bad.faults.join(', '), row);
    await handle.evaluate(undo, inverse);
    await handle.evaluate((element, scroll) => { element.querySelector('ul').scrollTop = scroll; }, before.scroll);
    const restored = await observe(); receipt.restored = restored;
    receipt.restoredHtml = await handle.evaluate(element => element.outerHTML);
    check(receipt.restoredHtml === before.html && restored.faults.length === 0, name + ': exact DOM inverse and original detector must be restored.', row);
  };
  const layout = async () => { const value = await geometry(handle); return { value, faults: layoutFaults(value) }; };
  await fault('hidden-view', element => { const style = element.getAttribute('style'); element.style.visibility = 'hidden'; return style; },
    (element, style) => { if (style === null) element.removeAttribute('style'); else element.setAttribute('style', style); }, layout, faults => faults.includes('visible'));
  await fault('literal-3-0', element => {
    const score = element.querySelector('li p:last-child'); if (score.textContent.trim() !== '3 - 0') throw new Error('Literal retained 3-0 anchor absent.');
    const original = score.textContent; score.textContent = '9 - 9'; return original;
  }, (element, original) => { element.querySelector('li p:last-child').textContent = original; },
    async () => { const value = await observedRows(region); return { value, faults: rowFaults(value, expected) }; }, faults => equal(faults, ['recorded-or-honest-result']));
  await fault('sideways', element => { const node = element.querySelector('li'), style = node.getAttribute('style'); node.style.minWidth = '2000px'; return style; },
    (element, style) => { const node = element.querySelector('li'); if (style === null) node.removeAttribute('style'); else node.setAttribute('style', style); }, layout, faults => faults.includes('horizontal-fit'));
  const list = region.locator('ul'); await list.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await fault('last-row-clipped', element => {
    const list = element.querySelector('ul'), style = list.getAttribute('style'); list.style.height = '80px'; list.style.overflowY = 'clip'; list.scrollTop = 0; return style;
  }, (element, style) => { const list = element.querySelector('ul'); if (style === null) list.removeAttribute('style'); else list.setAttribute('style', style); },
    async () => { const value = await geometry(handle, true); return { value, faults: layoutFaults(value) }; }, faults => faults.includes('row-reachable') && faults.includes('inner-scroll'));
  await list.evaluate(element => { element.scrollTop = 0; }); await handle.dispose();
}
async function stage(walk, row, expected, wantedSquad, name, takeShots, runControls) {
  const before = await walk.saved();
  await walk.page.evaluate(() => {
    window.__cdfRandom = Math.random; window.__cdfDraws = [];
    Math.random = () => { const value = window.__cdfRandom(); window.__cdfDraws.push({ ordinal: window.__cdfDraws.length + 1, value, stack: new Error('Observed served fixture display draw').stack }); return value; };
  });
  let receipt;
  try {
    await walk.activate(walk.page.getByRole('tab', { name: 'Table', exact: true }));
    const club = walk.page.locator('[data-world-tables] button[data-club="Arsenal"]');
    await club.waitFor({ timeout: 45000 }); assert.equal(await club.count(), 1, 'Actual Table must offer saved Arsenal exactly once.'); await walk.activate(club);
    const originalSquad = await squad(walk); check(equal(originalSquad, wantedSquad), row.id + ': actual Table club must show the complete saved squad.', row);
    const action = walk.page.getByRole('button', { name: 'Fixtures', exact: true }); await action.waitFor();
    const actionGeometry = await action.evaluate(element => { const rect = element.getBoundingClientRect(); return { width: rect.width, height: rect.height }; });
    check(actionGeometry.height >= 43, row.id + ': Fixtures action must retain a phone touch height.', row); await walk.activate(action);
    const region = walk.page.getByRole('region', { name: 'Club league fixtures', exact: true }); await region.waitFor();
    await region.scrollIntoViewIfNeeded(); await walk.page.evaluate(() => document.fonts.ready);
    const observed = await observedRows(region), top = await geometry(region), text = await region.innerText();
    receipt = { name, before, originalSquad, expected, observed, rowFaults: rowFaults(observed, expected), top, actionGeometry, text };
    row.stages.push(receipt);
    check(receipt.rowFaults.length === 0, row.id + ': all 38 actual saved fixture rows must match the independent oracle.', row);
    check(text.includes('Arsenal fixtures') && text.includes('Premier League') && text.includes('2026-27'), row.id + ': actual fixture heading must identify this saved season and league.', row);
    check(layoutFaults(top).length === 0, row.id + ': first fixture and Back must settle visibly without sideways overflow: ' + layoutFaults(top).join(', '), row);
    if (takeShots) await capture(walk, row, 'first-fixture');
    const list = region.locator('ul'); const documentBeforeScroll = await walk.page.evaluate(() => scrollY);
    const bounds = await list.boundingBox(); assert(bounds, 'The actual list needs a painted wheel target.');
    await walk.page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await walk.page.mouse.wheel(0, await list.evaluate(element => element.scrollHeight));
    await list.evaluate(element => new Promise((resolve, reject) => {
      let frames = 0; const poll = () => {
        if (Math.abs(element.scrollTop + element.clientHeight - element.scrollHeight) <= 2) return resolve();
        if (++frames >= 120) return reject(new Error('Actual wheel input did not reach the last fixture inside its list.'));
        requestAnimationFrame(poll);
      }; requestAnimationFrame(poll);
    }));
    const bottom = await geometry(region, true); receipt.bottom = bottom;
    receipt.documentScroll = { before: documentBeforeScroll, after: await walk.page.evaluate(() => scrollY) };
    check(layoutFaults(bottom).length === 0 && bottom.scrollTop > 0 && Math.abs(bottom.scrollTop + bottom.clientHeight - bottom.scrollHeight) <= 2,
      row.id + ': the last saved fixture must be visibly reachable inside its bounded scroller: ' + layoutFaults(bottom).join(', '), row);
    check(receipt.documentScroll.before === receipt.documentScroll.after, row.id + ': fixture list scrolling must preserve the page position.', row);
    if (takeShots) await capture(walk, row, 'last-fixture');
    await list.evaluate(element => { element.scrollTop = 0; });
    if (runControls) await controls(walk, row, region, expected);
    await walk.activate(region.getByRole('button', { name: 'Back', exact: true }));
    const returnedSquad = await squad(walk); receipt.returnedSquad = returnedSquad;
    check(equal(returnedSquad, originalSquad) && equal(returnedSquad, wantedSquad), row.id + ': scoped fixture Back must restore the exact saved squad and metrics.', row);
    check(await walk.page.getByRole('button', { name: 'Fixtures', exact: true }).count() === 1 && await region.count() === 0, row.id + ': scoped Back must return to the club squad.', row);
    await walk.activate(walk.page.getByRole('button', { name: 'Back', exact: true })); await walk.page.locator('[data-cm-hub]').waitFor();
    receipt.after = await walk.saved();
    check(receipt.after.raw === row.raw && before.raw === row.raw && equal(receipt.after, before), row.id + ': fixture reads and both Back actions must hold raw save and local award bytes.', row);
  } finally {
    const draws = await walk.page.evaluate(() => { Math.random = window.__cdfRandom; return window.__cdfDraws; });
    if (receipt) receipt.draws = draws;
    check(draws.length === 0, row.id + ': actual Table, squad, Fixtures and Back reads must consume zero RNG.', row);
  }
}
async function journey(profile, prepared) {
  const row = { id: profile.width + '-' + prepared.name, scenario: prepared.name, viewport: profile, raw: prepared.raw, rawSha256: sha(prepared.raw),
    checks: 0, stages: [], shots: [], issues: [], errors: [], assetErrors: [], transport: [], responses: [], diagnostics: [] };
  report.cases.push(row); let walk;
  try {
    walk = await open(profile, prepared.raw, row); row.boot = await walk.saved();
    check(row.boot.raw === prepared.raw, row.id + ': actual boot loader must preserve complete prepared save bytes.', row);
    await stage(walk, row, prepared.expected, prepared.squad, 'initial', true, profile.width === 320 && prepared.name === 'recorded');
    const before = await walk.saved(); await walk.page.reload({ waitUntil: 'domcontentloaded' }); await walk.enter(); const after = await walk.saved();
    row.reload = { before, after, beforeSha256: sha(before.raw ?? ''), afterSha256: sha(after.raw ?? '') };
    check(before.raw === prepared.raw && after.raw === prepared.raw && equal(before, after), row.id + ': literal document reload must preserve full save and local awards.', row);
    await stage(walk, row, prepared.expected, prepared.squad, 'reloaded', false, false);
    row.final = await walk.saved(); check(equal(row.final, row.boot), row.id + ': complete served journey must preserve original save and local awards.', row);
    row.stateReceipt = retain('states/' + row.id + '.json', JSON.stringify({ input: prepared.state, raw: prepared.raw, boot: row.boot, reload: row.reload, final: row.final }, null, 2) + '\n');
  } catch (error) { row.issues.push(String(error?.stack ?? error)); report.issues.push(row.id + ': ' + String(error?.stack ?? error)); report.failures++; }
  finally {
    check(row.errors.length === 0, row.id + ': app or console errors: ' + row.errors.join(' | '), row);
    check(row.assetErrors.length === 0, row.id + ': owned assets, writes or socket errors: ' + row.assetErrors.join(' | '), row);
    check(row.transport.every(request => ['GET', 'HEAD'].includes(request.method)), row.id + ': read-only navigation attempted a non-read request.', row);
    if (walk) await walk.context.close(); write();
  }
}
try {
  const tracked = execFileSync('git', ['ls-files', '-z', '--', 'src', 'scripts', '.github/workflows', 'package.json', 'package-lock.json', 'bun.lock', 'index.html', 'vite.config.ts', 'tsconfig*.json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).split('\0').filter(Boolean);
  const names = [...new Set([...tracked, FIXTURE, 'scripts/playClubDetailFixtures.mjs'])].sort();
  sources = names.map(file => ({ file, bytes: fs.statSync(path.join(ROOT, file)).size, sha256: hash(path.join(ROOT, file)) })); report.sources = sources;
  for (const file of ['src/lib/clubManager.ts', 'src/lib/clubDetailFixtures.ts', 'src/components/club-manager/ClubDetailScreen.tsx', 'src/data/clubManagerPremierFixtures2026.ts', 'src/pages/ClubManager.tsx']) {
    setup(hash(path.join(ROOT, file)) === sha(execFileSync('git', ['show', APP_REF + ':' + file], { cwd: ROOT, maxBuffer: 8 * 1024 * 1024 })), 'Frozen PR285 app source differs: ' + file);
  }
  const fixtureBytes = fs.readFileSync(path.join(ROOT, FIXTURE)), fixtureText = fixtureBytes.toString('utf8'), marker = '  "state": ';
  setup(sha(fixtureBytes) === FIXTURE_SHA && fixtureBytes.length === 300239, 'Exact retained fixture wrapper differs.');
  fixture = JSON.parse(fixtureText);
  setup(fixtureText.indexOf(marker) === fixtureText.lastIndexOf(marker) && fixtureText.endsWith('\n}\n'), 'Exact raw state token framing differs.');
  const rawState = fixtureText.slice(fixtureText.indexOf(marker) + marker.length, fixtureText.length - 3).trimEnd();
  setup(sha(rawState) === STATE_SHA && equal(JSON.parse(rawState), fixture.state) && fixture.source.stateRawSha256 === STATE_SHA
    && fixture.source.head === '4d4f709592921128ed6867c4126adbe864785ad5' && fixture.source.run === 38891922667
    && fixture.source.artifact === 12042760879 && fixture.source.projection === 'picker-reference.state', 'Exact qualified source provenance or state token differs.');
  report.fixture = { path: FIXTURE, bytes: fixtureBytes.length, sha256: FIXTURE_SHA, rawStateSha256: STATE_SHA, source: fixture.source, limits: fixture.limits };
  retain('retained-fixture.json', fixtureBytes); retain('retained-state.json', rawState);
  const controlRoot = path.join(ROOT, '.sim-control'); fs.mkdirSync(controlRoot, { recursive: true });
  compiledDirectory = fs.mkdtempSync(path.join(controlRoot, 'club-fixtures-browser-'));
  setup(path.dirname(compiledDirectory) === controlRoot, 'Compiled preflight must remain inside the asserted workspace folder.');
  const esbuild = await import('esbuild');
  tools = ['esbuild', 'playwright', 'playwright-core'].map(name => { const file = require.resolve(name + '/package.json');
    return { name, file, version: JSON.parse(fs.readFileSync(file, 'utf8')).version, bytes: fs.statSync(file).size, sha256: hash(file) }; });
  report.tools = tools; setup(tools.filter(row => row.name.startsWith('playwright')).every(row => row.version === '1.64.0'), 'Actual isolated browser packages must be the pinned 1.64.0.');
  const built = await esbuild.build({ entryPoints: { engine: path.join(ROOT, 'src/lib/clubManager.ts'), schedule: path.join(ROOT, 'src/data/clubManagerPremierFixtures2026.ts') },
    outdir: compiledDirectory, bundle: true, splitting: true, format: 'esm', platform: 'node', jsx: 'automatic', metafile: true,
    outExtension: { '.js': '.mjs' }, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, external: ['react', 'react-dom', 'react/jsx-runtime'] });
  report.compiled = inventory(compiledDirectory); setup(report.compiled.some(row => row.file === 'engine.mjs') && report.compiled.some(row => row.file === 'schedule.mjs'), 'Actual loader and independent source schedule bundles must exist.');
  for (const row of report.compiled) retain('preflight/' + row.file, fs.readFileSync(path.join(compiledDirectory, row.file)));
  retain('preflight/metafile.json', JSON.stringify(built.metafile, null, 2) + '\n');
  for (const file of [...new Set([...Object.keys(built.metafile.inputs), 'scripts/playClubDetailFixtures.mjs', FIXTURE])]) {
    const absolute = path.resolve(ROOT, file); setup(absolute.startsWith(ROOT + path.sep), 'Actual bundled source must be inside the workspace.');
    retain('source/' + path.relative(ROOT, absolute), fs.readFileSync(absolute));
  }
  const memory = new Map(); globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)),
    removeItem: key => memory.delete(key), clear: () => memory.clear(), key: index => [...memory.keys()][index] ?? null, get length() { return memory.size; } };
  globalThis.fetch = async () => { throw new Error('External preflight transport refused.'); };
  E = await import(pathToFileURL(path.join(compiledDirectory, 'engine.mjs')).href);
  schedule = (await import(pathToFileURL(path.join(compiledDirectory, 'schedule.mjs')).href)).PREMIER_FIXTURES_2026;
  setup(E.SAVE_KEY === KEY && !!schedule, 'Actual manager key and source schedule export must match.');
  const missing = copy(fixture.state), priorPremier = copy(missing.pairResults.premier); delete missing.pairResults.premier;
  const inverse = copy(missing); inverse.pairResults.premier = priorPremier;
  setup(equal({ ...inverse, pairResults: undefined }, { ...fixture.state, pairResults: undefined })
    && equal({ ...inverse.pairResults, premier: undefined }, { ...fixture.state.pairResults, premier: undefined })
    && equal(inverse.pairResults.premier, fixture.state.pairResults.premier), 'The missing-ledger scenario must change only the declared Premier ledger.');
  dist = inventory(path.join(ROOT, 'dist')); setup(dist.length > 0, 'Built served assets must be physically present.'); report.dist = dist;
  const prepared = [];
  for (const [name, state] of [['recorded', copy(fixture.state)], ['missing-ledger', missing]]) {
    const original = JSON.stringify(state); memory.clear(); memory.set(KEY, original);
    const run = zeroDraws(() => { const loaded = E.loadCareer(); return { loaded, saved: loaded ? E.saveCareer(loaded) : false, raw: memory.get(KEY) }; });
    const receipt = { name, original: state, originalRaw: original, originalSha256: sha(original), loaded: run.value.loaded,
      actualRaw: run.value.raw, actualRawSha256: sha(run.value.raw ?? ''), saved: run.value.saved, draws: run.draws };
    report.preflights.push(receipt); retain('preflight/' + name + '.json', JSON.stringify(receipt, null, 2) + '\n'); write();
    const expectedCanonical = { ...state, managerXp: { v: 1, xp: 0, points: { tactics: 0, recruitment: 0, negotiation: 0, youth: 0, manManagement: 0, finance: 0, media: 0 } } };
    setup(!Object.hasOwn(state, 'managerXp') && !!run.value.loaded && run.value.saved && run.draws.length === 0
      && run.value.raw === JSON.stringify(expectedCanonical) && equal(run.value.loaded, expectedCanonical), name + ': first actual load may add only the existing literal default managerXp block, preserving every other original field and zero RNG.');
    const canonical = run.value.loaded, raw = run.value.raw;
    receipt.stableReloads = [];
    for (let ordinal = 1; ordinal <= 2; ordinal++) {
      memory.clear(); memory.set(KEY, raw);
      const next = zeroDraws(() => { const loaded = E.loadCareer(); return { loaded, saved: loaded ? E.saveCareer(loaded) : false, raw: memory.get(KEY) }; });
      receipt.stableReloads.push(next);
      retain('preflight/' + name + '-stable-' + ordinal + '.json', JSON.stringify(next, null, 2) + '\n');
      setup(next.draws.length === 0 && next.value.saved && next.value.raw === raw && equal(next.value.loaded, canonical), name + ': both actual canonical reloads must preserve complete persisted bytes and zero RNG.');
    }
    prepared.push({ name, state: canonical, raw, expected: fixtureOracle(canonical, name), squad: rosterOracle(canonical) });
  }
  report.prepared = prepared;
  browser = await pw.chromium.launch({ headless: true }); report.browserVersion = await browser.version();
  for (const profile of PROFILES) for (const fixture of prepared) await journey(profile, fixture);
  check(report.cases.length === 8 && report.cases.every(row => row.stages.length === 2 && row.reload && row.shots.length === (row.id === '320-recorded' ? 6 : 2)), 'Exactly eight complete journeys, sixteen full fixture reads and eight literal reloads are required.');
  check(report.controls.length === 4 && report.controls.every(row => row.positive.faults.length === 0 && row.bad.faults.length > 0 && row.restored?.faults.length === 0), 'Four actual detector faults must fire and restore.');
  check(report.captures.length === 20 && new Set(report.captures.map(row => row.file)).size === 20, 'Sixteen original fixture captures and four fault originals must be unique.');
  for (const row of report.captures) check(fs.statSync(path.join(OUT, row.file)).size === row.bytes && hash(path.join(OUT, row.file)) === row.sha256, 'Original capture changed: ' + row.file);
} catch (error) { report.issues.push(String(error?.stack ?? error)); if (!report.setupFailures) report.failures++; }
finally {
  if (browser) await browser.close();
  if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage;
  globalThis.fetch = previousFetch;
  report.sourceHeld = sources.length > 0 && sources.every(row => fs.existsSync(path.join(ROOT, row.file)) && hash(path.join(ROOT, row.file)) === row.sha256);
  report.distHeld = dist.length > 0 && equal(inventory(path.join(ROOT, 'dist')), dist);
  report.fixtureHeld = hash(path.join(ROOT, FIXTURE)) === FIXTURE_SHA;
  report.compiledHeld = report.compiled.length > 0 && equal(inventory(compiledDirectory), report.compiled)
    && report.compiled.every(row => hash(path.join(OUT, 'preflight', row.file)) === row.sha256 && fs.statSync(path.join(OUT, 'preflight', row.file)).size === row.bytes);
  report.toolsHeld = tools.length === 3 && tools.every(row => hash(row.file) === row.sha256);
  for (const name of ['sourceHeld', 'distHeld', 'fixtureHeld', 'compiledHeld', 'toolsHeld']) check(report[name], name + ': complete bound input was changed or missing.');
  if (compiledDirectory) { setup(path.dirname(compiledDirectory) === path.join(ROOT, '.sim-control'), 'Refuse cleanup outside the workspace compiler folder.'); fs.rmSync(compiledDirectory, { recursive: true }); }
  report.summary = { journeys: report.cases.length, fullFixtureReads: report.cases.reduce((sum, row) => sum + row.stages.length, 0),
    reloads: report.cases.filter(row => row.reload).length, controls: report.controls.length, captures: report.captures.length,
    zeroDrawReads: report.cases.reduce((sum, row) => sum + row.stages.filter(stage => stage.draws?.length === 0).length, 0),
    externalAborts: report.cases.reduce((sum, row) => sum + row.transport.filter(request => request.action === 'abort').length, 0),
    nonReadRequests: report.cases.reduce((sum, row) => sum + row.transport.filter(request => !['GET', 'HEAD'].includes(request.method)).length, 0),
    failures: report.failures, setupFailures: report.setupFailures, checks: report.checks };
  report.status = report.failures || report.setupFailures ? 'failed' : 'passed'; write();
  console.log('Club fixture browser: ' + report.status + '; ' + JSON.stringify(report.summary));
  process.exitCode = report.status === 'passed' ? 0 : 1;
}
