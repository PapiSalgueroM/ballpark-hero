/* Actual built halftime reads, remote offline CI only. Complete real-engine unit
 * states prepare the save. Resume match and Skip reach the real interval UI.
 * Grades use the saved first-half score/goals, not full-time ratings or assists.
 * A copied goal-id control is disclosed; no automatic offer, full career or live claim.
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

assert(process.env.CI && process.env.SIM_NETWORK === 'offline' && process.env.CM_HT_LINEUPS_PHASE === 'fixed', 'Remote fixed offline CI is required.');
assert(process.env.CM_HT_LINEUPS_OUT && path.isAbsolute(process.env.CM_HT_LINEUPS_OUT), 'An absolute CM_HT_LINEUPS_OUT is required.');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), ARTIFACTS = process.env.CM_HT_LINEUPS_OUT;
const MODEL = path.join(ARTIFACTS, 'fixed'), OUT = path.join(ARTIFACTS, 'browser'), KEY = 'dukb-club-manager-save';
/* Release BE join (Round BEG): CM_HT_PARENT_REF names the tree without this packet on a newer core (the BE join passes the first parent of its m6 merge); 082fc277 on the packet branch. */
const PARENT = process.env.CM_HT_PARENT_REF || '082fc2774c8aa9f919c14efa33bfc3fbfc599597', NOW = Date.parse('2026-10-14T00:00:00Z');
const PROFILES = [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 800 }];
const SOURCE_FILES = ['src/components/club-manager/HalftimeScreen.tsx', 'src/lib/clubManager.ts', 'src/lib/clubManagerClock.ts',
  'src/components/club-manager/TeamTalkRow.tsx', 'src/hooks/useRevealScroll.ts', 'src/test/liveSimMotion.test.tsx',
  'src/test/managerHalftimeLineups.test.tsx', 'scripts/simManagerHalftimeLineups.mjs', '.github/workflows/manager-halftime-lineups.yml',
  'src/components/club-manager/HalftimeLineups.tsx', 'src/lib/clubManagerLiveLineups.ts', 'src/test/managerLiveLineups.test.ts',
  'scripts/simManagerLiveLineups.mjs', 'scripts/playManagerHalftimeLineups.mjs', 'src/pages/ClubManager.tsx', 'src/hooks/useClubManager.ts',
  'src/components/club-manager/LiveSimScreen.tsx', 'src/components/club-manager/ManagerSlotsScreen.tsx', 'src/lib/clubManagerSlots.ts',
  'src/lib/saveFence.ts', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs',
  'package.json', 'package-lock.json', 'bun.lock', 'index.html'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex'), hash = file => sha(fs.readFileSync(file));
const clone = value => JSON.parse(JSON.stringify(value)), require = createRequire(import.meta.url);
fs.mkdirSync(OUT, { recursive: true }); const REPORT = path.join(OUT, 'report.json'); assert(!fs.existsSync(REPORT), 'Refuse to overwrite evidence.');
const report = { status: 'running', sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(), parentRef: PARENT,
  checks: 0, failures: 0, setupFailures: 0, issues: [], cases: [], controls: [], inventory: [], physical: [],
  limits: ['Actual engine initialization/one started match prepare the saved page, not an entire UI career.',
    'Resume match/Skip naturally persist minute45; lineup reads thereafter preserve every saved byte and consume no RNG.',
    'One real halftime substitution is checked before second-half drawing; no later football outcome or final-grade claim.',
    'The control changes only a copied recorded own-side goal scorer id to another actual starter; the oracle remains the original state.',
    'Only built assets and retained fonts are served. External flags and backend writes are blocked and earn no appearance or award credit.'] };
const write = () => fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
function check(ok, message) { report.checks++; if (!ok) { report.failures++; report.issues.push(message); } return !!ok; }
function setup(ok, message) { report.checks++; if (!ok) { report.setupFailures++; throw new Error(message); } }
function census(directory, base = directory) { return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(directory, entry.name); return entry.isDirectory() ? census(file, base)
    : [{ file: path.relative(base, file).replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: hash(file) }];
}).sort((a, b) => a.file.localeCompare(b.file)); }
let sources = [], installed = [], tools = [], fonts = new Map(), fontRows = [], fontCache, fontHash, dist = [], browser, server, E;
const oldStorage = globalThis.localStorage, oldFetch = globalThis.fetch;
function retained(file, digest) { const full = path.join(ARTIFACTS, file); setup(hash(full) === digest, 'Physical model mismatch: ' + file);
  report.physical.push({ file, full, bytes: fs.statSync(full).size, sha256: digest }); return full; }
function zero(action) { const random = Math.random, PreviousDate = Date, draws = [];
  Math.random = () => { draws.push({ ordinal: draws.length + 1, value: 0.6, stack: new Error('Observed model input').stack }); return 0.6; };
  globalThis.Date = class extends PreviousDate { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
  try { return { value: action(), draws }; } finally { Math.random = random; globalThis.Date = PreviousDate; } }
function oracle(state) {
  const held = JSON.stringify(state), live = state.live, by = line => line.minute < 45 || (line.minute === 45 && (line.plus ?? 0) <= (live.added?.h1 ?? 0));
  const mine = [...(live.h1My ?? []), ...(live.h2My ?? [])].filter(by), opp = [...(live.h1Opp ?? []), ...(live.h2Opp ?? [])].filter(by);
  const grade = (forGoals, against, goals) => (Math.round(Math.min(10, Math.max(4.5, (forGoals > against ? 7 : forGoals === against ? 6.4 : 5.7) + goals * 0.9)) * 10) / 10).toFixed(1);
  const me = live.startXi.map((id, index) => { const players = state.squad.filter(player => player.id === id); setup(players.length === 1, 'Each actual starter needs one saved identity.');
    const player = players[0]; return { key: 'me:' + id + ':' + index, name: player.name, ovr: String(player.rating), grade: grade(mine.length, opp.length, mine.filter(goal => !goal.og && goal.id === id).length) }; });
  const theirs = live.oppXi.map((player, index) => { setup(live.oppXi.filter(other => other.n === player.n).length === 1, 'Actual opponent names must be unambiguous.');
    return { key: 'opp:start:' + index, name: player.n, ovr: String(player.r), grade: grade(opp.length, mine.length, opp.filter(goal => !goal.og && goal.name === player.n).length) }; });
  setup(JSON.stringify(state) === held && me.length === 11 && theirs.length === 11 && live.h1My && live.h1Opp && !(live.subs ?? []).some(by), 'The complete original two starting XIs and recorded score must be available.');
  return { me, opp: theirs, score: [mine.length, opp.length] };
}
function findings(actual, expected) { return expected.flatMap((row, index) => ['key', 'name', 'ovr', 'grade'].filter(field => actual[index]?.[field] !== row[field]).map(field => row.key + ':' + field))
  .concat(actual.length === expected.length ? [] : ['row-count']); }
async function serve() {
  const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); }); });
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => { let log = ''; const timer = setTimeout(() => reject(new Error('Host timeout: ' + log)), 15000);
    server.once('error', reject); server.once('exit', code => reject(new Error('Host exit ' + code + ': ' + log)));
    server.stdout.on('data', bytes => { log += bytes; if (log.includes('host-like server:')) { clearTimeout(timer); resolve(); } }); server.stderr.on('data', bytes => { log += bytes; }); });
  return 'http://127.0.0.1:' + port;
}
async function open(base, profile, raw, row) {
  const context = await browser.newContext({ viewport: profile, hasTouch: profile.width < 1000, isMobile: profile.width < 1000, reducedMotion: 'reduce', colorScheme: 'dark', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: base, localStorage: [{ name: KEY, value: raw }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }] }] } });
  const page = await context.newPage(), aborted = new Set(); page.setDefaultTimeout(20000);
  await context.route('**/*', route => { const request = route.request(), url = new URL(request.url());
    if (url.origin === base && ['GET', 'HEAD'].includes(request.method())) { row.transport.push({ action: 'owned', url: url.href, method: request.method() }); return route.continue(); }
    if (request.method() === 'GET' && fonts.has(url.href)) { row.transport.push({ action: 'font', url: url.href, method: request.method() }); return route.fulfill({ status: 200, ...fonts.get(url.href) }); }
    if (url.origin === base || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) row.errors.push('Unexpected owned write or uncached font: ' + url.href);
    aborted.add(url.href); row.transport.push({ action: 'abort', url: url.href, method: request.method(), body: request.postData() }); return route.abort('blockedbyclient'); });
  await context.routeWebSocket('**/*', socket => { row.transport.push({ action: 'websocket-close', url: socket.url() }); socket.close(); });
  page.on('pageerror', error => row.errors.push(String(error)));
  page.on('console', message => { if (message.type() !== 'error') return; const url = message.location().url, text = message.text();
    if (/Failed to load resource.*(?:ERR_FAILED|ERR_BLOCKED_BY_CLIENT)/.test(text) && aborted.has(url)) row.diagnostics.push({ url, text }); else row.errors.push(url + ': ' + text); });
  page.on('response', response => { if (new URL(response.url()).origin === base) { row.responses.push({ url: response.url(), status: response.status() }); if (response.status() >= 400) row.errors.push('Owned response ' + response.status() + ': ' + response.url()); } });
  page.on('requestfailed', request => { if (new URL(request.url()).origin === base) row.errors.push('Owned request failed: ' + request.url()); });
  await page.addInitScript(now => { const PreviousDate = Date; window.Date = class extends PreviousDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }; }, NOW);
  const saved = () => page.evaluate(key => ({ raw: localStorage.getItem(key), streak: localStorage.getItem('dukb-streaks-v1'), completion: localStorage.getItem('dukb-local-completions') }), KEY);
  const act = async node => { await node.waitFor({ timeout: 45000 }); await node.scrollIntoViewIfNeeded(); if (profile.width < 1000) await node.tap(); else { await node.focus(); await node.press('Enter'); } };
  const enter = async expectedRaw => { await act(page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true })); await page.locator('[data-cm-hub]').waitFor({ timeout: 45000 });
    check((await saved()).raw === expectedRaw, row.id + ': boot/resume must hold the entire source save.'); await act(page.getByRole('button', { name: 'Resume match', exact: true }));
    if (JSON.parse(expectedRaw).live.minute < 45) { await page.getByRole('button', { name: 'Skip', exact: true }).waitFor({ timeout: 45000 }); await act(page.getByRole('button', { name: 'Skip', exact: true })); }
    await page.locator('[data-cm-live-stage="interval"]').waitFor({ timeout: 45000 }); await page.getByRole('button', { name: 'Starting XIs', exact: true }).waitFor();
    const atBreak = JSON.parse(expectedRaw); if (atBreak.live.minute < 45) atBreak.live.minute = 45;
    await page.waitForFunction(({ key, raw }) => localStorage.getItem(key) === raw, { key: KEY, raw: JSON.stringify(atBreak) }); await page.evaluate(() => document.fonts.ready); };
  await page.goto(base + '/club-manager', { waitUntil: 'domcontentloaded' }); return { page, context, saved, act, enter };
}
async function read(walk, row, wanted, expectedRaw, stage, capture) {
  const before = await walk.saved(); await walk.page.evaluate(() => { window.__htRandom = Math.random; window.__htDraws = []; Math.random = () => { const value = window.__htRandom(); window.__htDraws.push({ ordinal: window.__htDraws.length + 1, value, stack: new Error('Observed halftime read').stack }); return value; }; });
  await walk.act(walk.page.getByRole('button', { name: 'Starting XIs', exact: true })); const views = [];
  for (const side of ['me', 'opp']) {
    const club = side === 'me' ? row.state.clubName : row.state.live.opponent; await walk.act(walk.page.getByRole('tab', { name: club, exact: true }));
    const panel = walk.page.locator('[data-cm-halftime-team="' + side + '"]'); await panel.waitFor();
    const observed = await panel.evaluate(element => ({ text: element.innerText, html: element.outerHTML, rows: [...element.querySelectorAll('[data-cm-halftime-player]')].map(node => ({ key: node.dataset.cmHalftimePlayer,
      name: node.querySelector('[data-cm-halftime-name]').textContent, ovr: node.querySelector('[data-cm-halftime-ovr]').textContent, grade: node.querySelector('[data-cm-halftime-grade]').textContent })) }));
    const issues = findings(observed.rows, wanted[side]); views.push({ side, observed, expected: wanted[side], findings: issues });
    check(observed.text.includes('OVR') && observed.text.includes('So far (provisional)') && !/assists?\s*[:+]\s*\d/i.test(observed.text), row.id + ': provisional OVR/grade copy must not invent assists.');
    if (!row.control) check(issues.length === 0, row.id + ': ' + side + ' full starting XI differs: ' + issues.join(','));
    if (capture && (!row.control || side === 'me')) await shot(walk, row, panel, side);
  }
  await walk.act(walk.page.getByRole('button', { name: 'Back', exact: true })); await walk.page.getByRole('button', { name: 'Second half', exact: true }).waitFor();
  const draws = await walk.page.evaluate(() => { Math.random = window.__htRandom; return window.__htDraws; }), after = await walk.saved();
  row.stages.push({ stage, before, after, views, draws }); check(before.raw === expectedRaw && after.raw === expectedRaw && JSON.stringify(before) === JSON.stringify(after), row.id + ': read/tab/Back changed exact save or local awards.');
  check(draws.length === 0, row.id + ': lineup read consumed RNG.'); return views;
}
async function shot(walk, row, panel, side) {
  await panel.scrollIntoViewIfNeeded(); await walk.page.evaluate(() => document.fonts.ready);
  const geometry = await panel.evaluate(async element => { let previous = '', stable = 0, value;
    for (let i = 0; i < 120; i++) { await new Promise(resolve => requestAnimationFrame(resolve)); const r = element.getBoundingClientRect(), top = Math.max(0, r.top), bottom = Math.min(innerHeight, r.bottom), hit = document.elementFromPoint(r.x + r.width / 2, (top + bottom) / 2);
      value = { x: r.x, y: r.y, width: r.width, height: r.height, opacity: Number(getComputedStyle(element).opacity), overflow: document.documentElement.scrollWidth > innerWidth + 1,
        finite: element.getAnimations({ subtree: true }).filter(a => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity).length,
        painted: r.width > 0 && bottom > top && r.x >= 0 && r.right <= innerWidth + 1 && !!hit && element.contains(hit) };
      const signature = JSON.stringify(value); stable = signature === previous ? stable + 1 : 1; previous = signature;
      if (stable >= 4 && value.opacity >= .99 && !value.finite && !value.overflow && value.painted) break; } return { ...value, stable }; });
  check(geometry.stable >= 4 && geometry.opacity >= .99 && !geometry.finite && !geometry.overflow && geometry.painted, row.id + ': original visible panel did not settle.');
  const file = row.id + '-' + side + '.png', filename = path.join(OUT, file); assert(!fs.existsSync(filename), 'Refuse original capture replacement.');
  await walk.page.screenshot({ path: filename, fullPage: true }); report.inventory.push({ file, bytes: fs.statSync(filename).size, sha256: hash(filename), original: true, geometry }); row.shots.push(file);
}
async function journey(base, profile, original, control = false) {
  const state = clone(original), wanted = oracle(original); let mutation = null;
  if (control) { const goal = state.live.h1My.find(line => !line.og && state.live.startXi.includes(line.id)); setup(!!goal, 'A real first-half own scorer is needed for the copied control.');
    const other = state.live.startXi.find(id => id !== goal.id && !state.live.h1My.some(line => line.id === id)); setup(!!other, 'The control needs another actual nonscoring starter.');
    mutation = { path: 'live.h1My[' + state.live.h1My.indexOf(goal) + '].id', before: goal.id, after: other }; goal.id = other;
    const inverse = clone(state); inverse.live.h1My[state.live.h1My.indexOf(goal)].id = mutation.before; setup(JSON.stringify(inverse) === JSON.stringify(original), 'Copied scorer fault must invert the complete original state.'); }
  const raw = JSON.stringify(state), atBreak = clone(state); atBreak.live.minute = 45; const breakRaw = JSON.stringify(atBreak);
  const row = { id: profile.width + (control ? '-copied-scorer-control' : '-halftime'), control, state, raw, breakRaw, mutation, wanted, stages: [], reloads: [], shots: [], errors: [], transport: [], responses: [], diagnostics: [] };
  (control ? report.controls : report.cases).push(row); let walk;
  try { walk = await open(base, profile, raw, row); await walk.enter(raw); const entered = await walk.saved(); row.entered = entered;
    check(entered.raw === breakRaw && entered.streak === null && entered.completion === null, row.id + ': actual Skip must only persist minute45 without activity/completion.');
    await read(walk, row, wanted, breakRaw, 'first-read', false); const before = await walk.saved(); await walk.page.reload({ waitUntil: 'domcontentloaded' }); await walk.enter(breakRaw); const after = await walk.saved();
    row.reloads.push({ before, after }); check(JSON.stringify(before) === JSON.stringify(after) && after.raw === breakRaw, row.id + ': literal interval document reload changed complete save.');
    const views = await read(walk, row, wanted, breakRaw, 'after-reload', true);
    if (control) { const wantedFaults = [wanted.me.find(item => item.key.startsWith('me:' + mutation.before + ':')).key + ':grade', wanted.me.find(item => item.key.startsWith('me:' + mutation.after + ':')).key + ':grade'].sort();
      check(row.stages.every(stage => JSON.stringify(stage.views[0].findings.slice().sort()) === JSON.stringify(wantedFaults) && stage.views[1].findings.length === 0), 'Copied scorer fault must cause exactly two genuine own-grade detector findings.');
      check(JSON.stringify(views[0].observed.rows) === JSON.stringify(oracle(state).me), 'Actual UI must render the copied changed goal credit, not a fabricated detector input.'); }
    if (!control && profile.width === 390) {
      const outId = state.live.onPitch.find(id => !state.live.h1Cards?.some(card => card.id === id && card.kind === 'red')), bench = E.benchFor(atBreak, outId);
      setup(!!outId && bench.length > 0, 'Actual interval needs one legal available bench substitution.'); const inId = bench[0].id;
      const predicted = zero(() => E.makeHalftimeSub(atBreak, outId, inId)); setup(predicted.value && predicted.draws.length === 0, 'Actual halftime sub must be legal and draw no future football.');
      const expectedRaw = JSON.stringify(predicted.value), beforeSub = await walk.saved(); const outgoing = state.squad.find(player => player.id === outId);
      await walk.page.evaluate(() => { window.__subRandom = Math.random; window.__subDraws = []; Math.random = () => { const value = window.__subRandom(); window.__subDraws.push({ ordinal: window.__subDraws.length + 1, value, stack: new Error('Observed actual halftime sub').stack }); return value; }; });
      await walk.act(walk.page.getByRole('button').filter({ has: walk.page.getByText(outgoing.name, { exact: true }) }));
      await walk.act(walk.page.getByRole('button').filter({ has: walk.page.getByText(bench[0].name, { exact: true }) }));
      await walk.page.waitForFunction(({ key, raw }) => localStorage.getItem(key) === raw, { key: KEY, raw: expectedRaw }); const afterSub = await walk.saved();
      const actualDraws = await walk.page.evaluate(() => { Math.random = window.__subRandom; return window.__subDraws; });
      row.substitution = { outId, inId, before: beforeSub, after: afterSub, predicted, expectedRaw, actualDraws };
      check(actualDraws.length === 0 && beforeSub.streak === afterSub.streak && beforeSub.completion === afterSub.completion, 'Actual sub must consume zero RNG and leave local streak/completion held.');
      const changed = JSON.parse(afterSub.raw); check(changed.live.minute === 46 && changed.live.subsUsed === atBreak.live.subsUsed + 1 && changed.live.onPitch.includes(inId) && !changed.live.onPitch.includes(outId)
        && !changed.live.h2Drawn && JSON.stringify(changed.live.startXi) === JSON.stringify(atBreak.live.startXi), 'Real sub must preserve the original XI and leave second-half football undrawn.');
      await read(walk, row, wanted, expectedRaw, 'after-actual-sub', false); await walk.page.reload({ waitUntil: 'domcontentloaded' }); await walk.enter(expectedRaw);
      row.reloads.push({ before: afterSub, after: await walk.saved() }); await read(walk, row, wanted, expectedRaw, 'sub-reload-firsthalf-cutoff', false);
      check(JSON.stringify(row.reloads[1].before) === JSON.stringify(row.reloads[1].after), 'Actual sub save must survive reload with held local awards.');
    }
  } catch (error) { check(false, row.id + ': ' + (error?.stack || error)); } finally {
    if (walk) await walk.context.close(); check(row.errors.length === 0, row.id + ': unrelated app/owned asset errors: ' + row.errors.join('; '));
    check(!row.transport.some(request => request.method === 'POST'), row.id + ': no match completion or backend write intent is allowed.'); write(); }
}
try {
  sources = SOURCE_FILES.map(file => ({ file, sha256: hash(path.join(ROOT, file)) })); report.sources = sources;
  for (const row of sources) { const target = path.join(OUT, 'sources', row.file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(ROOT, row.file), target); }
  const modelFile = path.join(MODEL, 'source.json'), fixtureFile = path.join(MODEL, 'prepared-states.json'); retained('fixed/source.json', hash(modelFile)); retained('fixed/prepared-states.json', hash(fixtureFile));
  const model = JSON.parse(fs.readFileSync(modelFile)), fixtures = JSON.parse(fs.readFileSync(fixtureFile)); report.model = model;
  setup(model.status === 'complete' && model.phase === 'fixed' && model.control === '' && model.head === report.sourceHead && model.parentRef === PARENT && model.passed === 6 && model.failed === 0
    && model.actualPreparedIntervals === 6 && model.child.status === 0 && !model.child.error && !model.child.signal, 'Complete actual six fixed model outcomes are required.');
  setup(JSON.stringify(model.sources.map(row => row.file)) === JSON.stringify(SOURCE_FILES.slice(0, 12)) && JSON.stringify(model.bindings.map(row => row.file)) === JSON.stringify(SOURCE_FILES.slice(0, 6)), 'All twelve exact model source inputs and six parent bindings are required.');
  setup(JSON.stringify(fixtures.map(row => row.name)) === JSON.stringify(['entry', 'opposition', 'readonly', 'shape', 'talk-and-second-half', 'not-live']), 'Six exact source-prepared intervals are required.');
  for (const row of model.sources) { setup(hash(path.join(ROOT, row.file)) === row.beforeSha256 && row.beforeSha256 === row.afterSha256, 'Actual source hold: ' + row.file); retained('fixed/' + path.basename(row.file) + '.before', row.beforeSha256); }
  for (const row of model.bindings) setup(hash(path.join(ROOT, row.file)) === row.candidateSha256 && sha(execFileSync('git', ['show', PARENT + ':' + row.file], { cwd: ROOT, maxBuffer: 8 * 1024 * 1024 })) === row.parentSha256
    && (row.file === SOURCE_FILES[0] || row.candidateSha256 === row.parentSha256), 'Whole parent binding: ' + row.file);
  retained('fixed/HalftimeScreen.parent.tsx', model.integration.parentSha256); retained('fixed/HalftimeScreen.fixed-plan.tsx', model.integration.plannedSha256); retained('fixed/HalftimeScreen.inverse.tsx', model.integration.inverseSha256);
  setup(model.integration.parentSha256 === model.integration.inverseSha256 && model.integration.plannedSha256 === hash(path.join(ROOT, SOURCE_FILES[0])), 'Whole halftime integration inverse must be held.');
  setup(model.compiled.some(row => row.file === 'engine.mjs') && model.compiled.some(row => row.file === 'component.mjs') && new Set(model.compiled.map(row => row.file)).size === model.compiled.length, 'Both original split entry points and unique shared modules must be bound.');
  for (const row of model.compiled) { setup(path.basename(row.file) === row.file && row.file.endsWith('.mjs'), 'Actual split engine path must stay in the packet.'); retained('fixed/' + row.file, row.sha256); }
  const memory = new Map(); globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key), clear: () => memory.clear(), key: i => [...memory.keys()][i] ?? null, get length() { return memory.size; } };
  globalThis.fetch = async () => { throw new Error('Model transport blocked.'); }; E = await import(pathToFileURL(path.join(MODEL, 'engine.mjs')).href); setup(E.SAVE_KEY === KEY, 'Actual save key differs.');
  const fixture = fixtures.find(row => row.name === 'entry'); report.fixture = fixture;
  setup(fixture.clock === '2026-10-14T00:00:00Z' && fixture.draws.every((row, i) => row.ordinal === i + 1 && row.value === .6 && /^(?:startCareer|playNextEntry:[1-8])$/.test(row.phase))
    && fixture.entries.length > 0 && fixture.entries.length <= 8 && fixture.state.live.minute === 0 && !fixture.state.live.h2Drawn, 'Original finite started-match provenance is required.');
  const raw = JSON.stringify(fixture.state); memory.set(KEY, raw); const preflight = zero(() => { const loaded = E.loadCareer(), next = E.playNextEntry(loaded, { skipHalftime: false }); E.saveCareer(next.state); return { loaded, next, raw: memory.get(KEY) }; }); report.preflight = preflight;
  setup(preflight.draws.length === 0 && preflight.value.next.kind === 'halftime' && JSON.stringify(preflight.value.loaded) === raw && JSON.stringify(preflight.value.next.state) === raw && preflight.value.raw === raw, 'Real loader/resume writer must preserve the complete original state without RNG.');
  oracle(fixture.state);
  installed = JSON.parse(fs.readFileSync(path.join(ARTIFACTS, 'installed.json'))); const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json')));
  setup(installed.length > 0 && new Set(installed.map(row => row.file)).size === installed.length && JSON.stringify(installed.map(row => row.file).sort()) === JSON.stringify(Object.keys(lock.packages).filter(file => file.startsWith('node_modules/') && fs.existsSync(path.join(ROOT, file, 'package.json'))).sort()), 'Every actual installed locked package must be bound.');
  for (const row of installed) setup(hash(path.join(ROOT, row.file, 'package.json')) === row.sha256 && JSON.parse(fs.readFileSync(path.join(ROOT, row.file, 'package.json'))).version === row.version && row.version === lock.packages[row.file].version, 'Installed package mismatch: ' + row.file); report.installed = installed;
  tools = ['esbuild', 'playwright', 'playwright-core'].map(name => { const file = require.resolve(name + '/package.json'); return { name, file, version: JSON.parse(fs.readFileSync(file)).version, sha256: hash(file) }; }); report.tools = tools;
  fontCache = path.resolve(process.env.FREE_KICK_FONT_CACHE); fontHash = hash(path.join(fontCache, 'manifest.json')); fontRows = JSON.parse(fs.readFileSync(path.join(fontCache, 'manifest.json'))); report.fonts = fontRows;
  fonts = new Map(fontRows.map(row => { setup(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(row.url).origin) && /^[a-f0-9]{64}$/.test(row.file) && hash(path.join(fontCache, row.file)) === row.sha256, 'Exact retained fonts required.'); return [row.url, { body: fs.readFileSync(path.join(fontCache, row.file)), contentType: row.contentType }]; }));
  dist = census(path.join(ROOT, 'dist')); report.dist = dist; const base = await serve(); browser = await pw.chromium.launch({ headless: true });
  for (const profile of PROFILES) await journey(base, profile, fixture.state); await journey(base, PROFILES[1], fixture.state, true);
  check(report.cases.length === 3 && report.controls.length === 1 && report.inventory.length === 7 && report.cases.every(row => row.shots.length === 2) && report.controls[0].shots.length === 1, 'Exactly three played profiles, one effective control and seven original captures are required.');
  check(report.cases.reduce((sum, row) => sum + row.reloads.length, 0) === 4 && report.controls[0].reloads.length === 1 && report.cases[1].substitution, 'Three ordinary reloads and one actual sub/reload plus one control reload are required.');
  check(report.cases.every(row => row.stages.length === (row.id.startsWith('390-') ? 4 : 2)) && report.controls[0].stages.length === 2
    && [...report.cases, ...report.controls].every(row => row.stages.every(stage => stage.views.length === 2 && stage.draws.length === 0)), 'Ten actual read stages must each inspect both complete teams and consume zero RNG.');
  check(new Set(report.inventory.map(row => row.file)).size === 7, 'Seven unique untouched originals are required.');
  for (const row of report.inventory) check(hash(path.join(OUT, row.file)) === row.sha256 && fs.statSync(path.join(OUT, row.file)).size === row.bytes, 'Original image bytes changed: ' + row.file);
} catch (error) { report.issues.push(error?.stack || String(error)); if (!report.setupFailures) report.failures++; }
finally {
  if (browser) await browser.close(); if (server) server.kill(); if (oldStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = oldStorage; globalThis.fetch = oldFetch;
  report.sourceHeld = sources.length === SOURCE_FILES.length && sources.every(row => hash(path.join(ROOT, row.file)) === row.sha256);
  report.modelHeld = report.physical.length > 0 && report.physical.every(row => hash(row.full) === row.sha256 && fs.statSync(row.full).size === row.bytes);
  report.installedHeld = installed.length > 0 && installed.every(row => hash(path.join(ROOT, row.file, 'package.json')) === row.sha256);
  report.toolsHeld = tools.length === 3 && tools.every(row => hash(row.file) === row.sha256);
  report.fontsHeld = !!fontHash && hash(path.join(fontCache, 'manifest.json')) === fontHash && fontRows.every(row => hash(path.join(fontCache, row.file)) === row.sha256);
  report.distHeld = dist.length > 0 && JSON.stringify(census(path.join(ROOT, 'dist'))) === JSON.stringify(dist);
  for (const name of ['sourceHeld', 'modelHeld', 'installedHeld', 'toolsHeld', 'fontsHeld', 'distHeld']) check(report[name], name + ': complete original inputs changed or were absent.');
  const all = [...report.cases, ...report.controls]; report.summary = { played: report.cases.length, controls: report.controls.length, originals: report.inventory.length, checks: report.checks,
    reloads: report.cases.reduce((sum, row) => sum + row.reloads.length, 0), totalReloads: all.reduce((sum, row) => sum + row.reloads.length, 0), substitutions: report.cases.filter(row => row.substitution).length,
    readStages: all.reduce((sum, row) => sum + row.stages.length, 0), zeroDrawReads: all.reduce((sum, row) => sum + row.stages.filter(stage => !stage.draws.length).length, 0),
    externalAborts: all.reduce((sum, row) => sum + row.transport.filter(request => request.action === 'abort').length, 0), expectedDiagnostics: all.reduce((sum, row) => sum + row.diagnostics.length, 0),
    backendPosts: all.reduce((sum, row) => sum + row.transport.filter(request => request.method === 'POST').length, 0), failures: report.failures, setupFailures: report.setupFailures };
  report.status = report.failures || report.setupFailures ? 'failed' : 'passed'; write(); console.log('Halftime lineups browser: ' + report.status + '; ' + report.checks + ' checks, ' + report.cases.length + ' played profiles, ' + report.controls.length + ' effective controls, ' + report.inventory.length + ' originals.'); process.exitCode = report.status === 'passed' ? 0 : 1;
}
