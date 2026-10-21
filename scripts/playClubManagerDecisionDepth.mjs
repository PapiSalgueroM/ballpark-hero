/* Remote-only proof for the Club Manager recorded-context decision pack.
 * Baseline measures six absent catalog entries after obtaining their context
 * from actual engine careers. Fixed drives the built route and real inbox.
 * Card presentation is prepared with buildSituation on those recorded states;
 * this is not credited as automatic delivery from the natural offer gate.
 * No physical, contract or real-world data effects are inserted in fixtures.
 */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer } from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

assert(process.env.CI, 'Run this proof on a remote CI runner only.');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHASE = process.env.MANAGER_DECISION_DEPTH_PHASE;
assert(['baseline', 'fixed'].includes(PHASE), 'MANAGER_DECISION_DEPTH_PHASE must be baseline or fixed.');
assert(process.env.MANAGER_DECISION_DEPTH_OUT && path.isAbsolute(process.env.MANAGER_DECISION_DEPTH_OUT), 'MANAGER_DECISION_DEPTH_OUT must be an absolute artifact root.');
const OUT = path.join(process.env.MANAGER_DECISION_DEPTH_OUT, PHASE);
const REPORT = path.join(OUT, 'report.json');
fs.mkdirSync(OUT, { recursive: true });
assert(!fs.existsSync(REPORT), 'Refuse to overwrite an earlier proof report.');
const KEY = 'dukb-club-manager-save';
const NOW = Date.parse('2026-10-12T16:00:00Z');
const clone = value => JSON.parse(JSON.stringify(value));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const sha = filename => hash(fs.readFileSync(filename));
const require = createRequire(import.meta.url);
const installed = ['esbuild', 'playwright', 'playwright-core'].map(name => {
  const filename = require.resolve(`${name}/package.json`);
  return { name, version: JSON.parse(fs.readFileSync(filename, 'utf8')).version, path: filename, sha256: sha(filename) };
});
const oldIds = ['promoShoot', 'investorsNight', 'quietWord', 'schoolVisit', 'columnist', 'spareFunds', 'finesKitty'];
const finite = number => typeof number === 'number' && Number.isFinite(number);
const hasPress = state => finite(state.press?.mood);
const byMorale = (left, right) => left.morale - right.morale || left.id.localeCompare(right.id);
const who = (state, predicate) => state.squad.filter(predicate).sort(byMorale)[0] ?? null;
/* Independent context predicates, shared by no product helper. */
const CONTRACTS = [
  { id: 'poorRun', effects: [['board', 3], ['press', 3]], eligible: state => hasPress(state) && state.form.length >= 3 && state.form.slice(-3).filter(result => result === 'L').length >= 2 },
  { id: 'boardPressure', effects: [['board', 3], ['press', 3]], eligible: state => hasPress(state) && finite(state.boardConfidence) && state.boardConfidence < 35 },
  { id: 'pressPressure', effects: [['press', 4], ['board', 3]], eligible: state => hasPress(state) && state.press.mood < 35 },
  { id: 'injurySupport', effects: [['morale', 6], ['board', 2]], player: state => who(state, player => player.injuryWeeks > 0 && player.morale < 75) },
  { id: 'academyStepUp', effects: [['morale', 6], ['board', 2]], player: state => who(state, player => player.academyGrad === true && player.apps >= 1 && player.apps <= 3) },
  { id: 'minutesCheck', effects: [['morale', 6], ['board', 2]], player: state => who(state, player => !player.isYouth && !player.onLoan && player.injuryWeeks === 0 && player.suspendedMatches === 0 && player.morale < 70 && player.lastTen?.length >= 5 && player.lastTen.reduce((sum, share) => sum + share, 0) / player.lastTen.length < 0.3) },
];
const eligible = (contract, state) => contract.player ? !!contract.player(state) : contract.eligible(state);
const profiles = [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 800 }];
const report = {
  phase: PHASE, status: 'running', sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  checks: 0, failures: 0, setupFailures: 0, missingContexts: 0, sourceHeld: false, installedHeld: false,
  cases: [], controls: [], fixtures: [], inventory: [], issues: [], transport: [], diagnostics: [],
  limits: ['Signed out and local storage only; every external request is aborted.', 'Recorded career contexts are produced by the actual engine.', 'New card presentation is prepared; automatic delivery is reported separately.', 'Expiry is a separate fresh-save fork of each answer journey.', 'Match activity is proved by its blocked client body and unchanged local points, not a backend award.'],
};
const write = () => fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
const check = (condition, message, row) => {
  report.checks++;
  if (!condition) { report.failures++; report.issues.push(message); if (row) row.issues.push(message); }
  return !!condition;
};
const setup = (condition, message) => {
  report.checks++;
  if (!condition) { report.setupFailures++; throw new Error(message); }
};
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-decision-depth-'));
const entry = path.join(scratch, 'entry.mjs');
const bundle = path.join(scratch, 'bundle.mjs');
const rootUrl = ROOT.replaceAll('\\', '/');
fs.writeFileSync(entry, `export * as E from '${rootUrl}/src/lib/clubManager.ts';\nexport * as D from '${rootUrl}/src/lib/clubManagerDecisions.ts';\n`);
let server;
let browser;
let sources = [];
let E;
let D;
const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
globalThis.fetch = async () => { throw new Error('External fetch refused by decision-depth fixture builder.'); };
function withSeed(seed, action) {
  const previousRandom = Math.random;
  const PreviousDate = Date;
  let number = seed >>> 0;
  Math.random = () => {
    number = (number + 0x6d2b79f5) | 0;
    let value = Math.imul(number ^ (number >>> 15), 1 | number);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  globalThis.Date = class extends PreviousDate {
    constructor(...args) { super(...(args.length ? args : [NOW])); }
    static now() { return NOW; }
  };
  try { return action(); } finally { Math.random = previousRandom; globalThis.Date = PreviousDate; }
}
function contextOf(contract, state) {
  const player = contract.player?.(state);
  return {
    form: [...state.form], boardConfidence: state.boardConfidence, pressMood: state.press?.mood ?? null,
    player: player ? { id: player.id, name: player.name, morale: player.morale, injuryWeeks: player.injuryWeeks,
      suspendedMatches: player.suspendedMatches, apps: player.apps, academyGrad: player.academyGrad ?? false,
      isYouth: player.isYouth, onLoan: player.onLoan ?? false, lastTen: player.lastTen ?? [] } : null,
  };
}
function fingerprints(deck) {
  return Object.fromEntries(oldIds.map(id => {
    const card = deck.find(card => card.id === id);
    setup(!!card && deck.filter(card => card.id === id).length === 1, `Original card ${id} must exist exactly once.`);
    return [id, hash(JSON.stringify({ id: card.id, from: card.from, fits: String(card.fits), who: String(card.who), text: String(card.text), options: card.options }))];
  }));
}

/* A bounded manager policy: actual auto-selection, actual graduate promotion,
 * actual lineup choice and an actual press answer. No player statistic or
 * pressure meter is assigned by this fixture search. */
function policy(state) {
  let next = state;
  const graduate = next.squad.find(player => player.academyGrad === true && (player.apps ?? 0) < 3);
  if (!graduate) {
    const prospect = next.academy?.prospects.find(prospect => prospect.fee <= next.budget);
    if (prospect) next = E.promoteProspect(next, prospect.id) ?? next;
  }
  next = { ...next, xiIds: E.autoPickXI(next.squad, E.FORMATIONS[next.formationIndex]) };
  const young = next.squad.find(player => player.academyGrad === true && (player.apps ?? 0) < 3 && player.injuryWeeks === 0 && player.suspendedMatches === 0);
  if (young && !next.xiIds.includes(young.id)) {
    const slot = E.FORMATIONS[next.formationIndex].slots.findIndex(slot => E.fitPenalty(young, slot) === 0);
    if (slot >= 0) { const xiIds = [...next.xiIds]; xiIds[slot] = young.id; next = { ...next, xiIds }; }
  }
  const question = next.press?.pending;
  if (question) {
    const index = question.options.reduce((best, option, index) => option.mood < question.options[best].mood ? index : best, 0);
    next = E.answerPress(next, index);
  }
  return next;
}
function findContexts() {
  const found = new Map();
  const clubs = ['Arsenal', 'Everton', 'Brighton'];
  let entries = 0;
  let careers = 0;
  let preflights = 0;
  let preflightInputsHeld = true;
  for (let run = 0; run < 24 && found.size < CONTRACTS.length; run++) {
    const club = clubs[run % clubs.length];
    const seed = 979 + run * 100;
    careers++;
    let state = withSeed(seed, () => E.startCareer(club));
    for (let step = 0; step < 180 && !state.sacked && found.size < CONTRACTS.length; step++) {
      state = withSeed(seed + step * 101 + 1, () => policy(state));
      const entry = state.calendar[state.week];
      if (entry && E.entryInvolvesMe(state, entry) && state.week < state.calendar.length - 1) {
        for (const contract of CONTRACTS) {
          if (found.has(contract.id) || !eligible(contract, state)) continue;
          const expirySeed = seed + step * 101 + 99;
          const observedBytes = JSON.stringify(state);
          const preflightInput = clone(state);
          const next = withSeed(expirySeed, () => E.playNextEntry(preflightInput, { skipHalftime: true }));
          preflights++;
          const inputHeld = JSON.stringify(state) === observedBytes && JSON.stringify(preflightInput) === observedBytes;
          preflightInputsHeld &&= inputHeld;
          setup(inputHeld, `${contract.id}: next-match preflight changed its input or the observed career.`);
          if (next.kind !== 'match' || next.state.sacked || next.state.week >= next.state.calendar.length) continue;
          const natural = D.deskOf(state).find(card => card.deckId === contract.id);
          found.set(contract.id, { state: clone(state), run, club, seed, step, expirySeed, naturalOffer: natural ? { id: natural.id, resolved: natural.resolved ?? null } : null });
        }
      }
      const result = withSeed(seed + step * 101 + 2, () => E.playNextEntry(state, { skipHalftime: true }));
      entries++;
      state = result.state;
      if (result.kind === 'seasonOver') state = withSeed(seed + step * 101 + 3, () => E.startNextSeason(E.finishSeason(state).state));
    }
  }
  report.fixtureSearch = { careers, entries, preflights, preflightInputsHeld, boundCareers: 24, boundEntriesPerCareer: 180, policy: 'autoPickXI, promoteProspect, legal graduate lineup and actual lowest-mood press answer' };
  for (const contract of CONTRACTS) setup(found.has(contract.id), `No actual engine context found for ${contract.id}; this is setup failure, never baseline credit.`);
  return found;
}
async function serve() {
  const port = await new Promise((resolve, reject) => {
    const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port; probe.close(error => error ? reject(error) : resolve(port));
    });
  });
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  await new Promise((resolve, reject) => {
    let log = '';
    const timeout = setTimeout(() => reject(new Error(`Host server startup failed: ${log}`)), 15000);
    server.once('error', error => { clearTimeout(timeout); reject(error); });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Host server exited ${code}: ${log}`)); });
    server.stdout.on('data', data => { log += data; if (String(data).includes('host-like server:')) { clearTimeout(timeout); resolve(); } });
    server.stderr.on('data', data => { log += data; });
  });
  return `http://127.0.0.1:${port}`;
}
async function open(base, profile, pre, seed, row, fork) {
  const context = await browser.newContext({ viewport: profile, isMobile: profile.width < 1000, hasTouch: profile.width < 1000,
    reducedMotion: 'reduce', colorScheme: 'dark', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: base,
      localStorage: [{ name: KEY, value: JSON.stringify(E.trimCareer(pre)) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }] }] } });
  const aborted = new Set();
  const errors = [];
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === base) return route.continue();
    aborted.add(request.url());
    const body = request.method() === 'POST' && url.pathname === '/rest/v1/game_completions' ? request.postDataJSON() : undefined;
    report.transport.push({ case: row.id, fork, method: request.method(), url: request.url(), action: 'abort', body });
    return route.abort('blockedbyclient');
  });
  await context.routeWebSocket('**/*', socket => { report.transport.push({ case: row.id, fork, url: socket.url(), action: 'websocket-close' }); socket.close(); });
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const url = message.location().url;
    const text = message.text();
    if (/Failed to load resource.*(?:ERR_FAILED|ERR_BLOCKED_BY_CLIENT)/.test(text) && aborted.has(url)) report.diagnostics.push({ case: row.id, fork, url, text, action: 'owned-abort' });
    else errors.push(`${url}: ${text}`);
  });
  page.on('response', response => {
    if (new URL(response.url()).origin === base && response.status() >= 400) errors.push(`Owned asset ${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', request => {
    if (new URL(request.url()).origin === base) errors.push(`Owned request failed: ${request.url()} ${request.failure()?.errorText}`);
  });
  await page.addInitScript(({ now, seed }) => {
    const OldDate = Date;
    window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    const seedRandom = initial => { let number = initial >>> 0; Math.random = () => { number = (number + 0x6d2b79f5) | 0; let value = Math.imul(number ^ (number >>> 15), 1 | number); value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value; return ((value ^ (value >>> 14)) >>> 0) / 4294967296; }; };
    document.addEventListener('click', event => { if (event.target.closest?.('[data-cm-way="quick"]')) seedRandom(seed); }, true);
  }, { now: NOW, seed });
  const raw = () => page.evaluate(key => localStorage.getItem(key), KEY);
  const saved = async () => JSON.parse(await raw());
  const activate = async button => { if (profile.width < 1000) await button.tap(); else { await button.focus(); await button.press('Enter'); } };
  const resume = async () => {
    await page.goto(`${base}/club-manager`, { waitUntil: 'domcontentloaded' });
    await activate(page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
    await page.locator('[data-cm-way="quick"]').waitFor();
  };
  const inbox = async () => {
    const tile = page.getByRole('button').filter({ has: page.getByText('Inbox', { exact: true }) });
    setup(await tile.count() === 1, `${row.id}: the actual Inbox tile is not unique.`);
    await activate(tile);
    await page.locator('section[aria-label="Decisions desk"]').waitFor();
  };
  const tableRequests = () => report.transport.filter(request => request.case === row.id && request.fork === fork && request.method === 'POST' && new URL(request.url).pathname === '/rest/v1/game_completions');
  const tablePosts = () => tableRequests().length;
  const authenticatedAwardPosts = () => report.transport.filter(request => request.case === row.id && request.fork === fork && request.method === 'POST' && new URL(request.url).pathname === '/rest/v1/rpc/record_auth_completion').length;
  const streak = () => page.evaluate(() => {
    const raw = localStorage.getItem('dukb-streaks-v1');
    return { raw, totalPoints: raw === null ? 0 : JSON.parse(raw).totalPoints };
  });
  await resume();
  return { context, page, raw, saved, activate, resume, inbox, tableRequests, tablePosts, authenticatedAwardPosts, streak, errors };
}
async function shot(walk, name, target) {
  await target.scrollIntoViewIfNeeded();
  await walk.page.waitForFunction(selector => {
    const node = document.querySelector(selector);
    if (!node) return false;
    const styles = getComputedStyle(node);
    return Number(styles.opacity) >= 0.99 && !node.getAnimations({ subtree: true }).some(animation => animation.playState === 'running');
  }, await target.getAttribute('data-desk-card').then(id => `[data-desk-card="${id}"]`));
  await walk.page.waitForFunction(() => !document.querySelector('[data-inbox-feedback="committed"]'));
  const filename = `${name}.png`;
  const pathname = path.join(OUT, filename);
  assert(!fs.existsSync(pathname), `Refuse to overwrite ${filename}.`);
  await walk.page.screenshot({ path: pathname });
  report.inventory.push({ file: filename, bytes: fs.statSync(pathname).size, sha256: sha(pathname), original: true });
  return filename;
}
function expectedAnswer(before, card, index) {
  const after = clone(before);
  const effect = card.options[index].effect;
  if (effect.kind === 'move') {
    if (effect.meter === 'board') after.boardConfidence = Math.min(100, Math.max(1, before.boardConfidence + effect.delta));
    else if (effect.meter === 'press') after.press.mood = Math.min(100, Math.max(0, before.press.mood + effect.delta));
    else if (effect.meter === 'morale') {
      const player = after.squad.find(player => player.id === card.playerId);
      player.morale = Math.min(99, Math.max(5, player.morale + effect.delta));
    } else after.budget = Math.round((before.budget + effect.delta) * 1000) / 1000;
  }
  delete after.decisions;
  return after;
}
const withoutDesk = state => { const copy = clone(state); delete copy.decisions; return copy; };
function answerIssues(before, after, card, index) {
  const issues = [];
  const resolved = after.decisions?.find(item => item.id === card.id);
  if (JSON.stringify(withoutDesk(after)) !== JSON.stringify(expectedAnswer(before, card, index))) issues.push('exact-saved-effect');
  if (!resolved?.resolved) issues.push('resolved-card');
  if (resolved?.options?.length !== 0) issues.push('consumed-options');
  return issues;
}
function expiryIssues(before, after, card, activityRequests) {
  const issues = [];
  const expired = after.decisions?.find(item => item.id === card.id);
  if (after.week !== before.week + 1) issues.push('actual-next-match');
  if (expired?.resolved !== 'Nobody answered before the next match, so nothing changed.') issues.push('expired-card');
  if (expired?.options?.length !== 0) issues.push('expired-options');
  if (activityRequests.length !== 1) issues.push('activity-client-intent');
  return issues;
}

async function runCase(base, profile, contract, fixture, variant = 'natural') {
  const row = { id: `${profile.width}-${contract.id}-${variant}`, card: contract.id, width: profile.width, variant, issues: [], shots: [], stages: [] };
  (variant === 'natural' ? report.cases : report.controls).push(row);
  const definition = D.DECK.find(card => card.id === contract.id);
  const card = D.buildSituation(fixture.state, definition);
  const prepared = { ...clone(fixture.state), decisions: [card] };
  /* Release BI: the engine gives every man his rung (role) and an empty lastTen on every load and at the top of every
     kick off (ensureRoles, Round 127), and promoteProspect leaves both to that repair. The fixture search can stop on
     the very step its policy promoted a prospect (Round 1344's deals between other clubs moved the search there for
     injurySupport: Oscar Miclea, role and lastTen unset), and the boot check below then read Round 127's repair as a
     change outside the desk. So the browser boots the state the engine itself would have saved: the same repair,
     applied first to this copy only. The boot check is unchanged and still fails on any other change. */
  E.ensureRoles(prepared);
  row.presentation = 'prepared-buildSituation-on-engine-context';
  row.context = contextOf(contract, prepared);
  setup(eligible(contract, prepared), `${row.id}: actual prepared context is not eligible.`);
  setup(card.playerId === (contract.player?.(prepared)?.id ?? undefined), `${row.id}: selected player identity disagrees with independent predicate.`);
  const expectedEffects = [...contract.effects.map(([meter, delta]) => ({ kind: 'move', meter, delta })), { kind: 'none' }];
  setup(JSON.stringify(card.options.map(option => option.effect)) === JSON.stringify(expectedEffects), `${row.id}: option contract differs.`);
  const index = profile.width === 320 ? 0 : profile.width === 390 ? 1 : 2;
  let walk;
  try {
    walk = await open(base, profile, prepared, fixture.expirySeed, row, 'answer');
    await walk.inbox();
    const node = walk.page.locator(`[data-desk-card="${card.id}"]`);
    await node.getByRole('button', { name: card.options[index].label, exact: true }).waitFor();
    const beforeRaw = await walk.raw();
    const before = JSON.parse(beforeRaw);
    check(JSON.stringify(withoutDesk(before)) === JSON.stringify(withoutDesk(E.trimCareer(prepared))), `${row.id}: boot changed context outside the desk.`, row);
    check(walk.tablePosts() === 0 && walk.authenticatedAwardPosts() === 0, `${row.id}: opening a decision attempted an activity or award write.`, row);
    row.stages.push({ stage: 'offered', raw: beforeRaw, tablePosts: walk.tablePosts(), authenticatedAwardPosts: walk.authenticatedAwardPosts() });
    if (variant === 'natural') row.shots.push(await shot(walk, `${row.id}-offered`, node));
    if (variant === 'omit-answer') {
      const after = await walk.saved();
      row.detected = answerIssues(before, after, card, index);
      check(JSON.stringify(row.detected) === JSON.stringify(['exact-saved-effect', 'resolved-card', 'consumed-options']), `${row.id}: omitted answer detector did not reject exactly its owned outcomes.`, row);
      check(await walk.raw() === beforeRaw, `${row.id}: omitted answer changed actual save.`, row);
      row.shots.push(await shot(walk, `${row.id}-detected`, node));
      return;
    }
    await walk.activate(node.getByRole('button', { name: card.options[index].label, exact: true }));
    await walk.page.waitForFunction(({ key, id }) => !!JSON.parse(localStorage.getItem(key)).decisions.find(card => card.id === id)?.resolved, { key: KEY, id: card.id });
    const afterRaw = await walk.raw();
    const after = JSON.parse(afterRaw);
    check(answerIssues(before, after, card, index).length === 0, `${row.id}: real answer did not have the exact saved effect.`, row);
    check(await node.getByRole('button').count() === 0, `${row.id}: an answered card still offers actions.`, row);
    const resolved = after.decisions.find(item => item.id === card.id);
    check((await node.innerText()).includes(resolved.resolved), `${row.id}: UI outcome is not the actual saved outcome.`, row);
    check(walk.tablePosts() === 0 && walk.authenticatedAwardPosts() === 0, `${row.id}: answering a decision attempted an activity or award write.`, row);
    row.stages.push({ stage: 'answered', index, effect: card.options[index].effect, raw: afterRaw, resolved: resolved.resolved, tablePosts: walk.tablePosts(), authenticatedAwardPosts: walk.authenticatedAwardPosts() });
    await walk.resume();
    await walk.inbox();
    const restoredNode = walk.page.locator(`[data-desk-card="${card.id}"]`);
    check(await walk.raw() === afterRaw, `${row.id}: reload changed literal saved bytes.`, row);
    check((await restoredNode.innerText()).includes(resolved.resolved), `${row.id}: reload lost saved outcome.`, row);
    check(await restoredNode.getByRole('button').count() === 0, `${row.id}: reload re-enabled an answered card.`, row);
    check(walk.tablePosts() === 0 && walk.authenticatedAwardPosts() === 0, `${row.id}: reload attempted an activity or award write.`, row);
    await restoredNode.focus();
    await restoredNode.press('Enter');
    check(await walk.raw() === afterRaw, `${row.id}: Enter on resolved card repeated its saved effect.`, row);
    row.stages.push({ stage: 'resolved-after-reload', raw: await walk.raw(), tablePosts: walk.tablePosts(), authenticatedAwardPosts: walk.authenticatedAwardPosts() });
    if (variant === 'natural') row.shots.push(await shot(walk, `${row.id}-resolved-after-reload`, restoredNode));
  } finally {
    if (walk) {
      check(walk.errors.length === 0, `${row.id}: unexpected answer app errors: ${walk.errors.join(' | ')}`, row);
      await walk.context.close();
      walk = null;
    }
  }

  /* Unanswered expiry starts from its own genuine original prepared save. */
  try {
    walk = await open(base, profile, prepared, fixture.expirySeed, row, 'expiry');
    await walk.inbox();
    const beforeRaw = await walk.raw();
    const before = JSON.parse(beforeRaw);
    const streakBefore = await walk.streak();
    const node = walk.page.locator(`[data-desk-card="${card.id}"]`);
    setup(!before.decisions.find(item => item.id === card.id).resolved, `${row.id}: expiry fork started answered.`);
    check(walk.tablePosts() === 0 && walk.authenticatedAwardPosts() === 0, `${row.id}: opening the expiry fork attempted an activity or award write.`, row);
    if (variant === 'omit-expiry') {
      row.detected = expiryIssues(before, await walk.saved(), card, walk.tableRequests());
      check(JSON.stringify(row.detected) === JSON.stringify(['actual-next-match', 'expired-card', 'expired-options', 'activity-client-intent']), `${row.id}: omitted next match detector did not reject exactly its owned outcomes.`, row);
      check(await walk.raw() === beforeRaw, `${row.id}: omitted next match changed actual save.`, row);
      const streakAfter = await walk.streak();
      check(streakAfter.raw === streakBefore.raw, `${row.id}: omitted next match changed actual local streak bytes.`, row);
      row.activity = { intent: 'omitted', tablePosts: walk.tablePosts(), authenticatedAwardPosts: walk.authenticatedAwardPosts(), streakBefore, streakAfter };
      row.shots.push(await shot(walk, `${row.id}-detected`, node));
      return;
    }
    await walk.activate(walk.page.getByRole('button', { name: 'Club home', exact: true }));
    const activityAttempt = walk.page.waitForEvent('requestfailed', { predicate: request => request.method() === 'POST' && new URL(request.url()).pathname === '/rest/v1/game_completions' });
    await walk.activate(walk.page.locator('[data-cm-way="quick"]'));
    await activityAttempt;
    await walk.page.waitForFunction(({ key, week }) => JSON.parse(localStorage.getItem(key)).week === week + 1, { key: KEY, week: before.week });
    const afterRaw = await walk.raw();
    const after = JSON.parse(afterRaw);
    const requests = walk.tableRequests();
    const expectedScore = E.currentSeasonScore(after);
    const streakAfter = await walk.streak();
    check(expiryIssues(before, after, card, requests).length === 0, `${row.id}: actual next match failed unanswered expiry or its activity intent.`, row);
    check(!after.sacked && after.week < after.calendar.length, `${row.id}: expiry did not end on a real nonterminal match state.`, row);
    check(requests.length === 1 && requests[0].action === 'abort' && requests[0].body?.game === 'club-manager' && finite(expectedScore) && requests[0].body.score === expectedScore, `${row.id}: blocked activity body differs from the actual game or current-season score.`, row);
    check(finite(streakBefore.totalPoints) && streakAfter.totalPoints === streakBefore.totalPoints, `${row.id}: nonterminal match awarded local completion points.`, row);
    check(walk.authenticatedAwardPosts() === 0, `${row.id}: nonterminal match attempted an authenticated completion award.`, row);
    const expired = after.decisions.find(item => item.id === card.id);
    row.stages.push({ stage: 'unanswered-expiry-fork', rawBefore: beforeRaw, rawAfter: afterRaw, resolved: expired?.resolved,
      activity: { intent: 'anonymous-match-activity', expectedScore, tablePosts: requests.length, requests, authenticatedAwardPosts: walk.authenticatedAwardPosts(), streakBefore, streakAfter } });
  } finally {
    if (walk) {
      check(walk.errors.length === 0, `${row.id}: unexpected expiry app errors: ${walk.errors.join(' | ')}`, row);
      await walk.context.close();
    }
  }
}

try {
  const built = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: bundle,
    absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') }, metafile: true, logLevel: 'error' });
  const paths = Object.keys(built.metafile.inputs).map(filename => path.resolve(ROOT, filename)).filter(filename => filename.startsWith(`${ROOT}${path.sep}`) && !filename.includes(`${path.sep}node_modules${path.sep}`));
  paths.push(...['src/pages/ClubManager.tsx', 'src/hooks/useClubManager.ts', 'src/lib/completions.ts', 'src/lib/streaks.ts', 'src/components/club-manager/InboxCard.tsx',
    'src/components/club-manager/InboxCard.module.css', 'src/test/clubManagerDecisionDepth.test.ts', 'scripts/playClubManagerDecisionDepth.mjs',
    'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs', 'package.json', 'package-lock.json'].map(filename => path.join(ROOT, filename)));
  sources = [...new Set(paths)].sort().map(filename => ({ file: path.relative(ROOT, filename).replaceAll('\\', '/'), sha256: sha(filename), bytes: fs.statSync(filename).size }));
  ({ E, D } = await import(pathToFileURL(bundle).href));
  report.sourceHashes = sources;
  report.installed = installed;
  report.originalCards = fingerprints(D.DECK);
  setup(D.DESK_CAP === 6 && D.SITUATION_RATE === 0.3, 'Desk retention or offer rate changed.');
  const contexts = findContexts();
  for (const contract of CONTRACTS) {
    const fixture = contexts.get(contract.id);
    report.fixtures.push({ card: contract.id, club: fixture.club, run: fixture.run, seed: fixture.seed, step: fixture.step,
      season: fixture.state.season, week: fixture.state.week, expirySeed: fixture.expirySeed, context: contextOf(contract, fixture.state),
      stateSha256: hash(JSON.stringify(fixture.state)), naturalOffer: fixture.naturalOffer, presentation: 'prepared-only-in-fixed-browser' });
  }
  if (PHASE === 'baseline') {
    for (const contract of CONTRACTS) {
      const row = { id: contract.id, issues: [], context: contextOf(contract, contexts.get(contract.id).state), absent: !D.DECK.some(card => card.id === contract.id) };
      report.cases.push(row);
      if (check(row.absent, `${contract.id}: baseline card already exists; do not credit missing-context reproduction.`, row)) report.missingContexts++;
    }
    check(D.DECK.length === 7, 'Baseline must contain exactly the original seven cards.');
  } else {
    const previousPath = process.env.MANAGER_DECISION_DEPTH_BASELINE_REPORT || path.join(process.env.MANAGER_DECISION_DEPTH_OUT, 'baseline', 'report.json');
    setup(fs.existsSync(previousPath), 'Fixed proof requires the retained baseline report for original-card byte holds.');
    const baseline = JSON.parse(fs.readFileSync(previousPath, 'utf8'));
    setup(baseline.status === 'baseline-reproduced' && baseline.missingContexts === 6 && baseline.failures === 0 && baseline.setupFailures === 0 && baseline.sourceHeld && baseline.installedHeld, 'Baseline receipt is not qualified.');
    check(JSON.stringify(report.originalCards) === JSON.stringify(baseline.originalCards), 'Original seven card definitions changed.');
    setup(D.DECK.length === 13 && CONTRACTS.every(contract => D.DECK.filter(card => card.id === contract.id).length === 1), 'Fixed catalog must contain the original seven and exactly six new contexts.');
    const base = await serve();
    browser = await pw.chromium.launch({ headless: true });
    for (const profile of profiles) for (const contract of CONTRACTS) await runCase(base, profile, contract, contexts.get(contract.id));
    await runCase(base, profiles[1], CONTRACTS[0], contexts.get(CONTRACTS[0].id), 'omit-answer');
    await runCase(base, profiles[1], CONTRACTS[4], contexts.get(CONTRACTS[4].id), 'omit-expiry');
    check(report.cases.length === 18 && report.controls.length === 2 && report.inventory.length === 38, 'Fixed case/control/original-image counts differ from 18/2/38.');
    check(new Set(report.inventory.map(image => image.file)).size === 38, 'Original captures do not have distinct filenames.');
    for (const image of report.inventory) check(sha(path.join(OUT, image.file)) === image.sha256 && fs.statSync(path.join(OUT, image.file)).size === image.bytes, `Original capture changed: ${image.file}`);
  }
} catch (error) {
  report.issues.push(String(error?.stack ?? error));
  if (!report.setupFailures) report.failures++;
} finally {
  if (browser) await browser.close();
  if (server) server.kill();
  report.sourceHeld = sources.length > 0 && sources.every(source => sha(path.join(ROOT, source.file)) === source.sha256);
  report.installedHeld = installed.every(item => sha(item.path) === item.sha256);
  check(report.sourceHeld, 'Source files changed during proof.');
  check(report.installedHeld, 'Installed package manifests changed during proof.');
  report.summary = { natural: report.cases.length, controls: report.controls.length, checks: report.checks,
    originals: report.inventory.length, externalAborts: report.transport.filter(request => request.action === 'abort').length,
    anonymousTablePosts: report.transport.filter(request => request.method === 'POST' && new URL(request.url).pathname === '/rest/v1/game_completions').length,
    authenticatedAwardPosts: report.transport.filter(request => request.method === 'POST' && new URL(request.url).pathname === '/rest/v1/rpc/record_auth_completion').length,
    expectedDiagnostics: report.diagnostics.length, failures: report.failures, setupFailures: report.setupFailures, sourceCount: sources.length };
  report.status = report.failures || report.setupFailures ? 'failed' : PHASE === 'baseline' && report.missingContexts === 6 ? 'baseline-reproduced' : PHASE === 'fixed' ? 'passed' : 'failed';
  write();
  console.log(`Club Manager decision depth ${PHASE}: ${report.status}; ${report.checks} checks, ${report.cases.length} natural/catalog cases, ${report.controls.length} controls, ${report.inventory.length} originals, ${report.failures} failures, ${report.setupFailures} setup failures.`);
  process.exitCode = report.status === 'passed' ? 0 : 1;
}
