/* Actual current owned squads on the built Club Manager route, remote CI only.
 * Complete real-engine unit states prepare the saved page presentations.
 * The empty-squad component fixture is excluded: the real loader repairs it.
 * No transfer, match, automatic delivery, backend award or full career is claimed.
 */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Current-roster browser execution requires remote offline CI.');
assert(process.env.CM_OWN_ROSTER_PHASE === 'fixed', 'The browser proof runs only after fixed real-engine screen outcomes.');
assert(process.env.CM_OWN_ROSTER_OUT && path.isAbsolute(process.env.CM_OWN_ROSTER_OUT), 'CM_OWN_ROSTER_OUT must be an absolute artifact root.');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTIFACTS = process.env.CM_OWN_ROSTER_OUT, MODEL = path.join(ARTIFACTS, 'fixed');
const OUT = path.join(ARTIFACTS, 'browser'), REPORT = path.join(OUT, 'report.json');
const PARENT = '082fc2774c8aa9f919c14efa33bfc3fbfc599597', KEY = 'dukb-club-manager-save';
const NOW = Date.parse('2026-10-14T00:00:00Z');
const PROFILES = [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 800 }];
const NAMES = ['legacy-deal', 'legacy-historical', 'legacy-empty', 'seeded', 'seeded-deal', 'ledger-without-seed', 'founded', 'rival'];
const SOURCE_FILES = ['src/components/club-manager/ClubDetailScreen.tsx', 'src/lib/clubManager.ts',
  'src/lib/clubManagerWorldRoster.ts', 'src/lib/clubManagerEras.ts', 'src/test/clubDetailOwnClub.test.tsx',
  'src/test/clubDetailCurrentRoster.test.tsx', 'scripts/simClubDetailCurrentRoster.mjs',
  '.github/workflows/club-detail-current-roster.yml', 'scripts/playClubDetailCurrentRoster.mjs',
  'src/pages/ClubManager.tsx', 'src/hooks/useClubManager.ts', 'src/lib/clubManagerSlots.ts',
  'src/lib/saveFence.ts', 'src/components/club-manager/ManagerSlotsScreen.tsx',
  'src/components/club-manager/WorldTablesCard.tsx', 'src/components/club-manager/LeagueTableCard.tsx',
  'src/components/club-manager/SquadScreen.tsx', 'src/data/clubManagerEra2015.ts', 'src/data/playerNationalities.ts',
  'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs',
  'package.json', 'package-lock.json', 'bun.lock', 'index.html'];
const require = createRequire(import.meta.url), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fileHash = file => sha(fs.readFileSync(file)), copy = value => JSON.parse(JSON.stringify(value));
fs.mkdirSync(OUT, { recursive: true }); assert(!fs.existsSync(REPORT), 'Refuse to replace an existing browser report.');
const report = { status: 'running', phase: 'fixed', sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  parentAppRef: PARENT, clock: new Date(NOW).toISOString(), checks: 0, failures: 0, setupFailures: 0,
  cases: [], controls: [], inventory: [], issues: [], sourceHeld: false, modelHeld: false, installedHeld: false,
  toolsHeld: false, fontsHeld: false, distHeld: false,
  limits: ['Seven complete engine receipts prepare saved page states; this does not play their initialization or transfer actions in the UI.',
    'The legacy-empty unit receipt is an explicitly prepared component presentation and earns no loaded-page credit.',
    'The founded club and its generated players are explicitly fictional. Other identities and football fields come from the actual held engine.',
    'The control changes only a copied saved own-player name and value. The independent oracle stays the original actual receipt.',
    'Display reads, Table navigation and one literal document reload per case are covered. No match, award, full career or live site is claimed.',
    'Every displayed row is checked in the DOM; one untouched full-page original per journey covers the selected detail screen.',
    'Only retained fonts and owned built assets are served. External flags are blocked and receive no appearance credit.'] };
const write = () => fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
function check(condition, message, row) {
  report.checks++; if (row) row.checks++;
  if (!condition) { report.failures++; report.issues.push(message); if (row) row.issues.push(message); }
  return !!condition;
}
function setup(condition, message) { report.checks++; if (!condition) { report.setupFailures++; throw new Error(message); } }
function files(directory, base = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? files(filename, base) : [{ file: path.relative(base, filename).replaceAll('\\', '/'), bytes: fs.statSync(filename).size, sha256: fileHash(filename) }];
  }).sort((a, b) => a.file.localeCompare(b.file));
}
let sources = [], physical = [], installed = [], tools = [], dist = [], fonts = new Map(), cache, fontHash, server, browser, E;
const previousStorage = globalThis.localStorage, previousFetch = globalThis.fetch;
function retained(file, digest) {
  const filename = path.join(ARTIFACTS, file);
  setup(fileHash(filename) === digest, file + ': physical model bytes differ.');
  physical.push({ file, filename, bytes: fs.statSync(filename).size, sha256: digest }); return filename;
}
function zeroDraws(action) {
  const original = Math.random, PreviousDate = Date, draws = [];
  Math.random = () => { draws.push({ ordinal: draws.length + 1, stack: new Error('Unexpected model display input').stack }); return 0.6; };
  globalThis.Date = class extends PreviousDate { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
  try { return { value: action(), draws }; } finally { Math.random = original; globalThis.Date = PreviousDate; }
}
function expected(state, rival = false) {
  const before = JSON.stringify(state), run = zeroDraws(() => {
    const money = E.moneyIn(state);
    const roster = rival ? [...E.oppRosterFor(state, 'Real Madrid')].sort((a, b) => b.v - a.v)
      : state.squad.map(player => ({ n: player.name, p: player.position, a: player.age, v: player.value ?? 0,
        r: player.rating, s: player.founderSaleRatio !== undefined ? E.sellValue(player) : undefined }));
    const top = [...roster].sort((a, b) => b.r - a.r).slice(0, 11);
    const average = rival ? String(Math.round(E.worldRosterXIAvg(state, 'Real Madrid')))
      : top.length ? String(Math.round(top.reduce((sum, player) => sum + player.r, 0) / top.length)) : '-';
    const founderSales = !rival && !!state.customClub && state.squad.some(player => player.founderSaleRatio !== undefined);
    return { club: rival ? 'Real Madrid' : state.clubName, count: roster.length, names: roster.map(player => player.n),
      average, value: money(Math.round(roster.reduce((sum, player) => sum + player.v, 0))),
      topXI: top.map(player => ({ name: player.n, rating: player.r })),
      salePays: founderSales ? 'a sale pays ' + money(Math.round(state.squad.reduce((sum, player) => sum + E.sellValue(player), 0))) : null,
      rows: roster.map(player => ({ name: player.n, position: player.p, age: player.a + 'y', value: money(player.v),
        rating: String(player.r), sale: player.s === undefined ? null : 'sells ' + money(player.s) })) };
  });
  setup(JSON.stringify(state) === before && run.draws.length === 0, 'Independent raw-save roster projection must hold every field and consume no RNG.');
  return run.value;
}
function findings(observed, wanted) {
  const issues = [];
  if (observed.club !== wanted.club) issues.push('club-identity');
  if (JSON.stringify(observed.names) !== JSON.stringify(wanted.names)) issues.push('saved-roster-names');
  if (observed.count !== wanted.count || observed.label !== 'Squad (' + wanted.count + ' on the books)') issues.push('saved-roster-count');
  if (observed.value !== wanted.value) issues.push('saved-squad-value');
  if (observed.average !== wanted.average) issues.push('saved-best-XI');
  if (JSON.stringify(observed.rows) !== JSON.stringify(wanted.rows)) issues.push('complete-roster-rows');
  if (observed.salePays !== wanted.salePays) issues.push('founder-sale-values');
  return issues;
}
async function serve() {
  const port = await new Promise((resolve, reject) => {
    const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port; probe.close(error => error ? reject(error) : resolve(port));
    });
  });
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    let log = ''; const timeout = setTimeout(() => reject(new Error('Host startup failed: ' + log)), 15000);
    server.once('error', error => { clearTimeout(timeout); reject(error); });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error('Host exited ' + code + ': ' + log)); });
    server.stdout.on('data', bytes => { log += bytes; if (String(bytes).includes('host-like server:')) { clearTimeout(timeout); resolve(); } });
    server.stderr.on('data', bytes => { log += bytes; });
  });
  return 'http://127.0.0.1:' + port;
}
async function open(base, profile, raw, row) {
  const context = await browser.newContext({ viewport: profile, isMobile: profile.width < 1000, hasTouch: profile.width < 1000,
    reducedMotion: 'reduce', colorScheme: 'dark', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: base,
      localStorage: [{ name: KEY, value: raw }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }] }] } });
  const page = await context.newPage(), aborted = new Set(); page.setDefaultTimeout(20000);
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === base) {
      if (!['GET', 'HEAD'].includes(request.method())) { row.assetErrors.push('Owned write refused: ' + request.url()); return route.abort('blockedbyclient'); }
      row.transport.push({ action: 'owned-asset', method: request.method(), url: request.url() }); return route.continue();
    }
    if (request.method() === 'GET' && fonts.has(url.href)) {
      row.transport.push({ action: 'retained-font', method: request.method(), url: request.url() }); return route.fulfill({ status: 200, ...fonts.get(url.href) });
    }
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) row.assetErrors.push('Uncached declared font: ' + request.url());
    aborted.add(request.url()); row.transport.push({ action: 'abort', method: request.method(), url: request.url(), body: request.postData() });
    return route.abort('blockedbyclient');
  });
  await context.routeWebSocket('**/*', socket => { row.transport.push({ action: 'websocket-close', url: socket.url() }); socket.close(); });
  page.on('pageerror', error => row.errors.push(String(error)));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const url = message.location().url, text = message.text();
    if (/Failed to load resource.*(?:ERR_FAILED|ERR_BLOCKED_BY_CLIENT)/.test(text) && aborted.has(url)) row.diagnostics.push({ url, text, action: 'owned-abort' });
    else row.errors.push(url + ': ' + text);
  });
  page.on('response', response => { if (new URL(response.url()).origin === base) {
    row.responses.push({ url: response.url(), status: response.status() });
    if (response.status() >= 400) row.assetErrors.push('Owned asset ' + response.status() + ' ' + response.url());
  } });
  page.on('requestfailed', request => { if (new URL(request.url()).origin === base) row.assetErrors.push('Owned request failed: ' + request.url() + ' ' + request.failure()?.errorText); });
  await page.addInitScript(now => {
    const OldDate = Date; window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
  }, NOW);
  const saved = () => page.evaluate(key => ({ raw: localStorage.getItem(key), streak: localStorage.getItem('dukb-streaks-v1'),
    completions: localStorage.getItem('dukb-local-completions') }), KEY);
  const activate = async node => {
    await node.scrollIntoViewIfNeeded();
    if (profile.width < 1000) await node.tap(); else { await node.focus(); await node.press('Enter'); }
  };
  const enter = async () => {
    const resume = page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true });
    await resume.waitFor({ timeout: 45000 }); await activate(resume);
    await page.locator('[data-cm-hub]').waitFor({ timeout: 45000 }); await page.evaluate(() => document.fonts.ready);
  };
  await page.goto(base + '/club-manager', { waitUntil: 'domcontentloaded' }); await enter();
  return { page, context, saved, activate, enter };
}
async function inspect(walk, row, wanted, stage) {
  const before = await walk.saved();
  await walk.activate(walk.page.getByRole('tab', { name: 'Table', exact: true }));
  const button = walk.page.locator('[data-world-tables] button[data-club]').filter({ hasText: wanted.club });
  const exact = button.filter({ has: walk.page.getByText(wanted.club, { exact: true }) });
  await exact.waitFor({ timeout: 45000 });
  setup(await exact.count() === 1, row.id + ': actual saved league must offer the exact club once.');
  await walk.page.evaluate(() => {
    window.__rosterOriginalRandom = Math.random; window.__rosterDraws = [];
    Math.random = () => { const value = window.__rosterOriginalRandom(); window.__rosterDraws.push({ ordinal: window.__rosterDraws.length + 1,
      value, stack: new Error('Observed current roster display input').stack }); return value; };
  });
  await walk.activate(exact);
  const card = walk.page.locator('div.bg-card').filter({ has: walk.page.getByText(/^Squad \(\d+ on the books\)$/) });
  await card.waitFor({ timeout: 45000 }); setup(await card.count() === 1, row.id + ': actual detail roster card must be unique.');
  await walk.page.evaluate(() => document.fonts.ready);
  const observed = await card.evaluate(element => {
    const header = element.previousElementSibling, text = node => node?.textContent?.trim() ?? null;
    const metric = label => { const node = [...header.querySelectorAll('div')].find(node => node.childElementCount === 0 && text(node) === label);
      return text(node?.previousElementSibling); };
    const rows = [...element.querySelectorAll(':scope > div.py-1\\.5')].map(node => ({ name: text(node.querySelector('span.text-xs')),
      position: text(node.firstElementChild), age: text(node.querySelector('div.text-\\[9px\\]')),
      value: text(node.querySelector('span.text-gold')), rating: text(node.lastElementChild),
      sale: [...node.querySelectorAll('span')].map(text).find(value => value?.startsWith('sells ')) ?? null }));
    return { club: text(header.querySelector('div.text-xl')), label: text(element.firstElementChild?.firstElementChild),
      count: rows.length, names: rows.map(node => node.name), rows, average: metric('Best XI'), value: metric('Squad value'),
      salePays: [...header.querySelectorAll('div')].map(text).find(value => value?.startsWith('a sale pays ')) ?? null,
      text: element.parentElement.innerText, html: element.parentElement.outerHTML };
  });
  const draws = await walk.page.evaluate(() => { Math.random = window.__rosterOriginalRandom; return window.__rosterDraws; });
  const after = await walk.saved(), issues = findings(observed, wanted);
  row.stages.push({ stage, before, after, observed, expected: wanted, actualDraws: draws, findings: issues });
  check(after.raw === row.inputRaw && before.raw === row.inputRaw, row.id + ': actual detail navigation changed complete saved bytes.', row);
  check(JSON.stringify(after) === JSON.stringify(before), row.id + ': detail display changed local streak or completion state.', row);
  check(draws.length === 0, row.id + ': reading the actual club details consumed RNG.', row);
  if (!row.control) check(issues.length === 0, row.id + ': actual saved roster differs: ' + issues.join(', '), row);
  return card;
}
async function capture(walk, row, card) {
  const panel = card.locator('..');
  await panel.scrollIntoViewIfNeeded(); await walk.page.evaluate(() => document.fonts.ready);
  const geometry = await panel.evaluate(async element => {
    let previous = '', stable = 0, value;
    for (let frame = 0; frame < 120; frame++) {
      await new Promise(resolve => requestAnimationFrame(resolve)); const rect = element.getBoundingClientRect();
      const finite = element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity).length;
      const top = Math.max(0, rect.y), bottom = Math.min(innerHeight, rect.bottom), hit = document.elementFromPoint(Math.min(innerWidth - 1, rect.x + rect.width / 2), (top + bottom) / 2);
      value = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, viewport: [innerWidth, innerHeight],
        opacity: Number(getComputedStyle(element).opacity), finite, overflow: document.documentElement.scrollWidth > innerWidth + 1,
        painted: rect.width > 0 && bottom > top && rect.x >= 0 && rect.right <= innerWidth + 1 && !!hit && element.contains(hit) };
      const signature = JSON.stringify(value); stable = signature === previous ? stable + 1 : 1; previous = signature;
      if (stable >= 4 && value.opacity >= 0.99 && finite === 0 && value.painted && !value.overflow) return { ...value, stable };
    }
    return { ...value, stable };
  });
  row.layout = geometry;
  check(geometry.stable >= 4 && geometry.opacity >= 0.99 && geometry.finite === 0 && geometry.painted && !geometry.overflow,
    row.id + ': original full detail screen did not settle without horizontal overflow.', row);
  const name = row.id + '-current-roster-after-reload.png', filename = path.join(OUT, name);
  assert(!fs.existsSync(filename), 'Refuse to overwrite an original capture.');
  await walk.page.screenshot({ path: filename, fullPage: true });
  report.inventory.push({ file: name, bytes: fs.statSync(filename).size, sha256: fileHash(filename), original: true }); row.shots.push(name);
}
async function journey(base, profile, fixture, control = false) {
  const state = copy(fixture.state), oracle = expected(fixture.state, fixture.name === 'rival'), changes = [];
  if (control) {
    const player = state.squad[0]; setup(!!player, 'The actual copied legacy roster needs a real saved first player.');
    changes.push({ path: 'squad[0].name', before: player.name, after: player.name + ' [copied fixture control]' },
      { path: 'squad[0].value', before: player.value, after: (player.value ?? 0) + 1000 });
    player.name = changes[0].after; player.value = changes[1].after;
    const inverse = copy(state); inverse.squad[0].name = changes[0].before;
    if (changes[1].before === undefined) delete inverse.squad[0].value; else inverse.squad[0].value = changes[1].before;
    setup(JSON.stringify(inverse) === JSON.stringify(fixture.state), 'Copied name/value fault must restore every original saved field exactly.');
  }
  const raw = JSON.stringify(state), row = { id: profile.width + '-' + fixture.name + (control ? '-copied-name-value-control' : ''), fixture: fixture.name,
    width: profile.width, control, checks: 0, inputRaw: raw, originalRaw: JSON.stringify(fixture.state), changes, stages: [], reloads: [], shots: [],
    issues: [], errors: [], assetErrors: [], transport: [], responses: [], diagnostics: [] };
  (control ? report.controls : report.cases).push(row); let walk;
  try {
    walk = await open(base, profile, raw, row);
    check((await walk.saved()).raw === raw, row.id + ': real boot loader rewrote the complete saved fixture.', row);
    await inspect(walk, row, oracle, 'initial-current-detail');
    await walk.activate(walk.page.getByRole('button', { name: 'Back', exact: true }));
    await walk.page.locator('[data-cm-hub]').waitFor();
    const before = await walk.saved(); await walk.page.reload({ waitUntil: 'domcontentloaded' }); await walk.enter();
    const after = await walk.saved(); row.reloads.push({ before, after, equal: JSON.stringify(before) === JSON.stringify(after),
      beforeSha256: sha(before.raw ?? ''), afterSha256: sha(after.raw ?? '') });
    check(before.raw === raw && after.raw === raw && JSON.stringify(before) === JSON.stringify(after), row.id + ': literal document reload changed the career or local award state.', row);
    const card = await inspect(walk, row, oracle, 'reloaded-current-detail');
    if (fixture.name === 'legacy-historical') {
      const assets = dist.filter(file => /^assets\/clubManagerEra2015-[^/]+\.js$/.test(file.file));
      check(assets.length === 1 && row.responses.some(response => new URL(response.url).pathname === '/' + assets[0].file && response.status === 200),
        row.id + ': actual historical save must load its owned era2015 lazy bake.', row);
    }
    if (control) {
      const wanted = ['saved-roster-names', 'saved-squad-value', 'complete-roster-rows'];
      row.detected = row.stages.map(stage => stage.findings);
      check(row.detected.length === 2 && row.detected.every(value => JSON.stringify(value) === JSON.stringify(wanted)),
        row.id + ': copied actual name/value change must fire exactly the three unchanged UI detectors twice.', row);
      const observed = row.stages[1].observed, fault = expected(state);
      check(findings(observed, fault).length === 0 && changes.every(change => change.before !== change.after),
        row.id + ': the control must actually display the changed copied save without setup failure.', row);
    }
    await capture(walk, row, card);
    check((await walk.saved()).raw === raw, row.id + ': original capture changed complete saved bytes.', row);
  } catch (error) { row.issues.push(String(error?.stack ?? error)); report.issues.push(row.id + ': ' + String(error?.stack ?? error)); report.failures++; }
  finally {
    check(row.errors.length === 0, row.id + ': unrelated console or app errors: ' + row.errors.join(' | '), row);
    check(row.assetErrors.length === 0, row.id + ': owned asset or font errors: ' + row.assetErrors.join(' | '), row);
    check(row.transport.filter(request => request.method === 'POST').length === 0, row.id + ': read-only squad display attempted a backend write.', row);
    if (walk) await walk.context.close(); write();
  }
}
try {
  sources = SOURCE_FILES.map(file => ({ file, bytes: fs.statSync(path.join(ROOT, file)).size, sha256: fileHash(path.join(ROOT, file)) })); report.sources = sources;
  for (const source of sources) {
    const filename = path.join(OUT, 'source', source.file); fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, fs.readFileSync(path.join(ROOT, source.file)));
  }
  const sourceFile = path.join(MODEL, 'source.json'), statesFile = path.join(MODEL, 'rendered-states.json');
  retained('fixed/source.json', fileHash(sourceFile)); retained('fixed/rendered-states.json', fileHash(statesFile));
  const model = JSON.parse(fs.readFileSync(sourceFile, 'utf8')), receipts = JSON.parse(fs.readFileSync(statesFile, 'utf8'));
  setup(model.status === 'complete' && model.phase === 'fixed' && model.control === '' && model.parentRef === PARENT && model.head === report.sourceHead
    && model.actualRenderedStates === 8 && model.passed === 8 && model.failed === 0 && model.child.status === 0 && !model.child.signal && !model.child.error,
    'Eight complete real fixed screen outcomes without child or setup failures are required.');
  setup(receipts.length === 8 && JSON.stringify(receipts.map(row => row.name)) === JSON.stringify(NAMES), 'Eight source-bound original rendered-state identities are required.');
  setup(JSON.stringify(model.sourceReceipts.map(row => row.file)) === JSON.stringify(SOURCE_FILES.slice(0, 9))
    && JSON.stringify(model.bindings.map(row => row.file)) === JSON.stringify(SOURCE_FILES.slice(0, 5)), 'All nine exact screen inputs and five parent bindings are required.');
  for (const row of model.sourceReceipts) {
    setup(fileHash(path.join(ROOT, row.file)) === row.beforeSha256 && row.beforeSha256 === row.afterSha256, 'Real screen source binding differs: ' + row.file);
    retained('fixed/' + path.basename(row.file) + '.before', row.beforeSha256);
  }
  for (const binding of model.bindings) setup(binding.candidateSha256 === fileHash(path.join(ROOT, binding.file))
    && binding.parentSha256 === sha(execFileSync('git', ['show', PARENT + ':' + binding.file], { cwd: ROOT })), 'Whole original parent binding differs: ' + binding.file);
  for (const binding of [model.componentBinding, model.oldTestBinding]) {
    retained('fixed/' + path.basename(binding.file) + '.fixed-plan', binding.plannedSha256);
    const inverse = retained('fixed/' + path.basename(binding.file) + '.inverse', binding.inverseSha256);
    setup(binding.plannedSha256 === fileHash(path.join(ROOT, binding.file)) && binding.inverseSha256 === binding.parentSha256
      && fs.readFileSync(inverse).equals(execFileSync('git', ['show', PARENT + ':' + binding.file], { cwd: ROOT })), 'Exact whole phase inverse differs: ' + binding.file);
  }
  setup(model.compiled.some(row => row.file === 'engine.mjs') && model.compiled.some(row => row.file === 'component.mjs')
    && new Set(model.compiled.map(row => row.file)).size === model.compiled.length, 'Both actual entry points and every unique split model module must be bound.');
  for (const row of model.compiled) {
    setup(path.basename(row.file) === row.file && row.file.endsWith('.mjs'), 'Compiled model path escapes the fixed packet.'); retained('fixed/' + row.file, row.sha256);
  }
  const memory = new Map(); globalThis.localStorage = { getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key), clear: () => memory.clear(),
    key: index => [...memory.keys()][index] ?? null, get length() { return memory.size; } };
  globalThis.fetch = async () => { throw new Error('External model transport refused.'); };
  E = await import(pathToFileURL(path.join(MODEL, 'engine.mjs')).href); setup(E.SAVE_KEY === KEY, 'Actual manager key differs.');
  await E.ensureEraRosters('era2015');
  report.fixtures = [];
  for (const receipt of receipts) {
    const wanted = expected(receipt.state, receipt.name === 'rival');
    setup(JSON.stringify(wanted.names) === JSON.stringify(receipt.expected.names) && wanted.value === receipt.expected.value
      && (receipt.name === 'rival' || (wanted.average === receipt.expected.average && receipt.correct === true)), receipt.name + ': independent complete saved roster oracle differs from actual unit receipt.');
    if (receipt.name === 'legacy-empty') { report.excluded = { name: receipt.name, reason: 'Prepared empty component presentation; actual loadCareer adds squad coverage.', stateSha256: sha(JSON.stringify(receipt.state)) }; continue; }
    const raw = JSON.stringify(receipt.state); memory.clear(); memory.set(KEY, raw);
    const run = zeroDraws(() => { const loaded = E.loadCareer(); return { loaded, saved: loaded ? E.saveCareer(loaded) : false, raw: memory.get(KEY) }; });
    report.fixtures.push({ name: receipt.name, raw, rawSha256: sha(raw), expected: wanted, preflight: run, preparedPagePresentation: true });
    setup(JSON.stringify(receipt.state) === raw && run.draws.length === 0 && run.value.saved && JSON.stringify(run.value.loaded) === raw
      && run.value.raw === raw, receipt.name + ': real loader/writer must preserve every original saved field and consume zero model draws.');
  }
  installed = JSON.parse(fs.readFileSync(path.join(ARTIFACTS, 'installed.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));
  const installedPaths = Object.keys(lock.packages).filter(file => file.startsWith('node_modules/') && fs.existsSync(path.join(ROOT, file, 'package.json')));
  setup(installed.length > 0 && installed.length === installedPaths.length && new Set(installed.map(row => row.file)).size === installed.length
    && JSON.stringify(installed.map(row => row.file).sort()) === JSON.stringify(installedPaths.sort()), 'All actually installed locked package paths must be bound.');
  for (const row of installed) setup(fileHash(path.join(ROOT, row.file, 'package.json')) === row.sha256
    && JSON.parse(fs.readFileSync(path.join(ROOT, row.file, 'package.json'), 'utf8')).version === row.version && row.version === lock.packages[row.file].version,
    'Actual installed locked package differs: ' + row.file);
  report.installed = installed;
  tools = ['esbuild', 'playwright', 'playwright-core'].map(name => { const file = require.resolve(name + '/package.json');
    return { name, file, bytes: fs.statSync(file).size, version: JSON.parse(fs.readFileSync(file, 'utf8')).version, sha256: fileHash(file) }; }); report.tools = tools;
  cache = path.resolve(process.env.FREE_KICK_FONT_CACHE); fontHash = fileHash(path.join(cache, 'manifest.json'));
  report.fonts = JSON.parse(fs.readFileSync(path.join(cache, 'manifest.json'), 'utf8'));
  fonts = new Map(report.fonts.map(entry => {
    setup(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin) && /^[a-f0-9]{64}$/.test(entry.file)
      && fileHash(path.join(cache, entry.file)) === entry.sha256, 'Only exact retained declared fonts may be fulfilled.');
    return [entry.url, { body: fs.readFileSync(path.join(cache, entry.file)), contentType: entry.contentType }];
  }));
  dist = files(path.join(ROOT, 'dist')); report.dist = dist; report.model = { ...model, physical: physical.map(({ filename, ...row }) => row) };
  const base = await serve(); browser = await pw.chromium.launch({ headless: true });
  for (const profile of PROFILES) for (const receipt of receipts.filter(row => row.name !== 'legacy-empty')) await journey(base, profile, receipt);
  await journey(base, PROFILES[1], receipts.find(row => row.name === 'legacy-deal'), true);
  check(report.cases.length === 21 && report.controls.length === 1 && report.inventory.length === 22, 'Exactly twenty-one page journeys, one effective copied-save control and twenty-two fresh originals are required.');
  check(report.cases.every(row => row.stages.length === 2 && row.reloads.length === 1 && row.reloads[0].equal && row.shots.length === 1), 'Each route journey needs two actual detail reads, one literal document reload and one original.');
  check(new Set(report.inventory.map(row => row.file)).size === 22, 'Every original capture filename must be unique.');
  for (const row of report.inventory) check(fileHash(path.join(OUT, row.file)) === row.sha256 && fs.statSync(path.join(OUT, row.file)).size === row.bytes, 'Original capture bytes changed: ' + row.file);
} catch (error) { report.issues.push(String(error?.stack ?? error)); if (!report.setupFailures) report.failures++; }
finally {
  if (browser) await browser.close(); if (server) server.kill();
  if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage;
  globalThis.fetch = previousFetch;
  report.sourceHeld = sources.length === SOURCE_FILES.length && sources.every(row => fileHash(path.join(ROOT, row.file)) === row.sha256);
  report.modelHeld = physical.length > 0 && physical.every(row => fileHash(row.filename) === row.sha256 && fs.statSync(row.filename).size === row.bytes);
  report.installedHeld = installed.length > 0 && installed.every(row => fileHash(path.join(ROOT, row.file, 'package.json')) === row.sha256);
  report.toolsHeld = tools.length === 3 && tools.every(row => fileHash(row.file) === row.sha256);
  report.fontsHeld = !!fontHash && fileHash(path.join(cache, 'manifest.json')) === fontHash && report.fonts.every(row => fileHash(path.join(cache, row.file)) === row.sha256);
  report.distHeld = dist.length > 0 && JSON.stringify(files(path.join(ROOT, 'dist'))) === JSON.stringify(dist);
  for (const name of ['sourceHeld', 'modelHeld', 'installedHeld', 'toolsHeld', 'fontsHeld', 'distHeld']) check(report[name], name + ': complete input receipts changed or were never bound.');
  const all = [...report.cases, ...report.controls];
  report.summary = { viewed: report.cases.length, own: report.cases.filter(row => row.fixture !== 'rival').length, rival: report.cases.filter(row => row.fixture === 'rival').length,
    controls: report.controls.length, checks: report.checks, originals: report.inventory.length,
    reloads: report.cases.reduce((sum, row) => sum + row.reloads.length, 0), totalReloads: all.reduce((sum, row) => sum + row.reloads.length, 0),
    zeroDrawViews: all.reduce((sum, row) => sum + row.stages.filter(stage => stage.actualDraws.length === 0).length, 0),
    installedVersions: installed.length, externalAborts: all.reduce((sum, row) => sum + row.transport.filter(request => request.action === 'abort').length, 0),
    retainedFonts: all.reduce((sum, row) => sum + row.transport.filter(request => request.action === 'retained-font').length, 0),
    backendPosts: all.reduce((sum, row) => sum + row.transport.filter(request => request.method === 'POST').length, 0),
    expectedDiagnostics: all.reduce((sum, row) => sum + row.diagnostics.length, 0), failures: report.failures, setupFailures: report.setupFailures };
  report.status = report.failures || report.setupFailures ? 'failed' : 'passed'; write();
  console.log('Current-roster browser: ' + report.status + '; ' + report.checks + ' checks, ' + report.cases.length + ' saved page journeys, '
    + report.controls.length + ' effective controls, ' + report.inventory.length + ' originals, ' + report.failures + ' failures, ' + report.setupFailures + ' setup failures.');
  process.exitCode = report.status === 'passed' ? 0 : 1;
}
