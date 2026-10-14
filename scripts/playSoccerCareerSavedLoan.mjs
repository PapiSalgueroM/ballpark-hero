/* Actual saved voucher and loan replies, remote offline CI only.
 * Prepared careers are not fully played UI careers.
 * Legal picker vectors replay through plain source; no random rate is claimed.
 * Twelve played answers each have pending and resolved document reloads.
 */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { keyedObserverProblems, keyedInputProblems, KEYED_KIND } from './lib/keyedPicker1327.mjs';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Saved loan browser requires remote offline CI.');
assert(process.env.CAREER_LOAN_PHASE === 'fixed', 'Only the qualified fixed model may supply these saved cards.');
assert(process.env.CAREER_LOAN_OUT && path.isAbsolute(process.env.CAREER_LOAN_OUT), 'CAREER_LOAN_OUT must be absolute.');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTIFACTS = process.env.CAREER_LOAN_OUT, OUT = path.join(ARTIFACTS, 'browser');
const FIXTURE = path.join(ARTIFACTS, 'browser-fixtures.json'), REPORT = path.join(OUT, 'report.json'), KEY = 'soccerCareerSave';
const PARENT = '1b383132351440d16753d67af94550608a85ba87';
const PROFILES = [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 800 }];
const IDS = ['220-voucher-236-lend', '220-voucher-236-bank-help'];
const CARDS = {
  220: { title: 'The Group Chat Leak', description: "Someone screenshots the squad group chat, including your message rating the manager's new haircut 'a 2, maybe a 3 in fog'.",
    choices: [
      { label: 'Own it: it was funny', consequence: 'Followers +700k, Morale -5, manager side-eye' },
      { label: 'Apologize with a gift', consequence: 'A luxury barber voucher: -€20k, Morale +3' },
      { label: 'Hunt the leaker', consequence: '50%: find them (Morale +6). 50%: paranoia (Morale -6)' },
    ] },
  236: { title: 'A Teammate Needs €200k', description: 'A squad player pulls you aside. Family trouble back home, he says. He needs €200k and swears he is good for it.',
    choices: [
      { label: 'Lend it, no questions', consequence: '-€200k for now. Repayment story continues later' },
      { label: 'Offer help finding a proper loan instead', consequence: 'Responsible, slightly awkward: Morale -2' },
    ] },
};
const PICKER_ANCHOR = '  const shuffled = [...eligible].sort(() => Math.random() - 0.5);';
const PICKER_OBSERVER = '  const shuffled = [...eligible].sort((a, b) => {\n    if (typeof globalThis.__SC_LOAN_PICKER_COMPARISON === "function") globalThis.__SC_LOAN_PICKER_COMPARISON(a.id, b.id);\n    return Math.random() - 0.5;\n  });';
const PREFIX = [
  { ordinal: 1, value: 0.99, cause: 'original ordinary moral-dilemma gate rejects' },
  { ordinal: 2, value: 0.99, cause: 'original professor216 gate rejects' },
  { ordinal: 3, value: 0.99, cause: 'original professor217 gate rejects' },
];
const releaseCaptionDraw = state => state.overall >= 80 && state.marketValue >= 30;
const resolverInputs = state => [0.99, 0.99, ...(releaseCaptionDraw(state) ? [0.99] : [])];
const pickerPrefix = state => [...PREFIX, ...(releaseCaptionDraw(state)
  ? [{ value: 0.99, cause: 'original RealismB494 release-clause caption draw' }] : []),
  { value: 0.99, cause: 'original picker count is4' }].map((row, index) => ({ ordinal: index + 1, value: row.value, cause: row.cause }));
const require = createRequire(import.meta.url), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fileHash = filename => sha(fs.readFileSync(filename)), copy = value => JSON.parse(JSON.stringify(value));
const stateHash = state => sha(JSON.stringify(state)), year = state => state.seasons[state.seasons.length - 1].year;
const clamp = value => Math.max(0, Math.min(100, value));
fs.mkdirSync(OUT, { recursive: true });
assert(!fs.existsSync(REPORT), 'Refuse to overwrite a browser report.');
const report = { status: 'running', phase: 'fixed', sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  checks: 0, failures: 0, setupFailures: 0, cases: [], controls: [], inventory: [], issues: [],
  sourceHeld: false, toolsHeld: false, installedHeld: false, fixturesHeld: false, distHeld: false, fontsHeld: false, parentHeld: false, pickerHeld: false,
  limits: ['Signed out local saved outcomes only; no backend completion, repayment result, financial advice or new economics is credited.',
    'Fictional profile and season fields are prepared. Actual picker delivery and two existing choices are distinct from a fully played UI career.',
    'Copied read-only comparator receipts choose legal inputs. Complete vectors replay through plain unchanged picker source, not a natural rate or seeded search.',
    'The original delivered batch is preserved, including its ledger and unplayed tail. No queue, outcome or saved caption is rewritten.',
    'Each of the two played answers has one pending and one resolved document reload; model proof separately owns its two canonical resolved reloads.',
    'Once means each played effect, log and queue consumption remains held on reload. Later repayment237 is covered by the separate existing review proof.',
    'External flags and nonessential transport are blocked. Selected untouched captures are not blanket visual, physical-device or live-site acceptance.'] };
const write = () => fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
function check(condition, message, row) {
  report.checks++; if (row) row.checks++;
  if (!condition) { report.failures++; report.issues.push(message); if (row) row.issues.push(message); }
  return !!condition;
}
function setup(condition, message) { report.checks++; if (!condition) { report.setupFailures++; throw new Error(message); } }
function literal(before, id, index) {
  const after = copy(before);
  if (id === 220) {
    assert.equal(index, 1); after.netWorth = Math.round((after.netWorth - 0.02) * 100) / 100;
    after.morale = clamp(after.morale + 3);
    after.events.push('🎁 Apologized for the haircut text with a barber voucher. He used it');
  } else {
    assert.equal(id, 236); assert(index === 0 || index === 1);
    after.lifeFlags = { ...after.lifeFlags, teammateLoan: index === 0 ? 1 : 9 };
    if (index === 0) { after.netWorth = Math.round((after.netWorth - 0.2) * 100) / 100; after.integrityBonus += 2;
      after.events.push('🤝 Lent a teammate €200k on a handshake'); }
    else { after.morale = clamp(after.morale - 2); after.events.push('🏦 Helped a teammate get a real loan instead of cash'); }
  }
  after.lastEventId = id; after.pendingEvents = after.pendingEvents.slice(1); after.phase = 'random_events'; return after;
}
function outcomeIssues(before, raw, step) {
  if (raw === null) return ['saved-career-missing'];
  const after = JSON.parse(raw), wanted = literal(before, step.eventId, step.choiceIndex), issues = [];
  if (raw !== JSON.stringify(step.expected)) issues.push('complete-saved-state');
  if (stateHash(after) !== step.expectedSha256) issues.push('expected-state-hash');
  if (after.morale !== wanted.morale) issues.push('literal-morale');
  if (after.netWorth !== wanted.netWorth) issues.push('literal-net-worth');
  if (after.integrityBonus !== wanted.integrityBonus) issues.push('literal-integrity');
  if (JSON.stringify(after.lifeFlags) !== JSON.stringify(wanted.lifeFlags)) issues.push('literal-loan-record');
  if (after.lastEventId !== step.eventId) issues.push('last-event-id');
  if (JSON.stringify(after.pendingEvents) !== JSON.stringify(before.pendingEvents.slice(1))) issues.push('single-queue-consumption');
  if (JSON.stringify(after.events) !== JSON.stringify(wanted.events)) issues.push('single-history-line');
  if (JSON.stringify(after) !== JSON.stringify(wanted)) issues.push('literal-complete-state');
  return issues;
}
function listFiles(directory, base = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(filename, base) : [{ file: path.relative(base, filename).replaceAll('\\', '/'), bytes: fs.statSync(filename).size, sha256: fileHash(filename) }];
  }).sort((a, b) => a.file.localeCompare(b.file));
}
const BINDINGS = { engineSha256: 'src/lib/soccerCareerEngine.ts', lifeSha256: 'src/lib/soccerCareerLife.ts',
  realismSha256: 'src/lib/soccerCareerRealismA.ts', routineSha256: 'src/lib/soccerCareerRoutineEvents.ts',
  consequencesSha256: 'src/lib/soccerCareerLifeConsequences.ts', saveSha256: 'src/lib/soccerCareerSave.ts',
  contractsSha256: 'src/lib/soccerCareerContracts.ts', pageSha256: 'src/pages/SoccerCareer.tsx',
  testSha256: 'src/test/soccerCareerSavedLoan.test.ts', simSha256: 'scripts/simSoccerCareerSavedLoan.mjs' };
const SOURCE_FILES = [...Object.values(BINDINGS), 'src/lib/soccerCareerRealismB.ts', 'src/lib/careerEventDeck.ts', 'src/lib/careerChanceWheel.ts',
  'src/components/soccer-career/careerMoments.ts', 'src/components/career-moments/useCareerMoment.ts',
  'src/components/soccer-career/CareerChanceWheel.tsx', 'src/components/FlagImg.tsx', 'src/lib/flagUtils.ts', 'src/lib/soccerCurrency.ts',
  'scripts/playSoccerCareerSavedLoan.mjs', '.github/workflows/soccer-career-saved-loan.yml',
  'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs', 'package.json', 'package-lock.json', 'bun.lock', 'index.html'];
let sourceBefore = [], installedBefore = [], toolsBefore = [], distBefore = [], parentFiles = [], pickerFiles = [];
let fixtureHash, fontHash, cache, now, server, browser, fonts = new Map();
function physical(file, digest, bank) {
  const filename = path.join(ARTIFACTS, file);
  setup(fileHash(filename) === digest, file + ': retained physical bytes differ.');
  bank.push({ file, filename, bytes: fs.statSync(filename).size, sha256: digest }); return filename;
}
function verifyDelivery(delivery) {
  const { context, batch, witness } = delivery;
  const name = '220-then-236', targets = [220, 236];
  setup(witness?.name === name && JSON.stringify(witness.targets) === JSON.stringify(targets)
    && witness.contextSha256 === stateHash(context) && context.phase === 'social_media_action' && context.pendingEvents.length === 0,
    name + ': actual picker context, targets or priority disclosure differs.');
  setup(witness.targetAvailability?.length === targets.length, name + ': actual target availability receipts missing.');
  for (const [index, target] of witness.targetAvailability.entries()) {
    const id = targets[index], key = id === 220 ? 'story:squadChatLeak' : String(id), cooldown = 99;
    setup(target.id === id && target.matches === 1 && target.card?.id === id && target.ledgerKey === key && target.cooldown === cooldown
      && target.season === year(context) && target.lastEventId === context.lastEventId && target.lastEventId !== id
      && target.lastFired === (context.eventLastFired?.[key] ?? null) && target.onCooldown === false
      && (typeof target.lastFired !== 'number' || !Number.isFinite(target.lastFired) || target.season - target.lastFired > cooldown)
      && JSON.stringify(target.draws) === '[]', name + ': original catalog target is absent, cooled, repeated or read with extra RNG.');
    setup(target.card.title === CARDS[id].title, name + ': actual source card identity differs.');
  }
  const input = witness.input, prefix = pickerPrefix(context), firstComparison = prefix.length + 1;
  if (input?.mode === KEYED_KIND) {
    const inputProblems = keyedInputProblems(witness, []);
    setup(inputProblems.length === 0, name + ': keyed picker input witness differs: ' + inputProblems.join('; '));
  } else {
    setup(input?.mode === 'controlled-sort-vector' && JSON.stringify(input.prefix) === JSON.stringify(prefix)
      && input.drawCount === input.draws.length && input.drawCount > prefix.length
      && JSON.stringify(input.draws.slice(0, prefix.length)) === JSON.stringify(prefix.map(row => row.value))
      && Array.isArray(witness.comparisons) && witness.comparisons.length > 0, name + ': complete legal picker input vector is required.');
    const ordinals = new Set(), rank = id => targets.includes(id) ? targets.indexOf(id) : targets.length + id;
    for (const [index, row] of witness.comparisons.entries()) {
      const value = rank(row.a) < rank(row.b) ? 0.01 : rank(row.a) > rank(row.b) ? 0.99 : 0.5;
      setup(Number.isInteger(row.a) && Number.isInteger(row.b) && Number.isInteger(row.ordinal) && row.ordinal >= firstComparison
        && row.ordinal <= input.drawCount && !ordinals.has(row.ordinal) && (index === 0 ? row.ordinal === firstComparison : row.ordinal > witness.comparisons[index - 1].ordinal)
        && row.aRank === rank(row.a) && row.bRank === rank(row.b) && row.value === value && input.draws[row.ordinal - 1] === value,
        name + ': actual comparator IDs, ranks, value or original ordinal differs.'); ordinals.add(row.ordinal);
    }
    setup(input.draws.every((value, index) => ordinals.has(index + 1) || (index < prefix.length && value === prefix[index].value)), name + ': unowned picker draw supplied.');
  }
  const { observed, replay } = witness;
  setup(observed && replay && replay.consumed === input.drawCount && JSON.stringify(observed.draws) === JSON.stringify(input.draws)
    && JSON.stringify(replay.draws) === JSON.stringify(input.draws) && JSON.stringify(observed.rawBatch) === JSON.stringify(replay.rawBatch)
    && JSON.stringify(observed.batch) === JSON.stringify(replay.batch) && JSON.stringify(replay.batch) === JSON.stringify(batch)
    && stateHash(observed.batch) === observed.batchSha256 && stateHash(replay.batch) === replay.batchSha256,
    name + ': plain replay must consume every input and reproduce all observed raw and canonical fields.');
  setup(batch.phase === 'random_events' && batch.pendingEvents.length === 4
    && batch.pendingEvents[0].id === 220 && batch.pendingEvents[1].id === 236
    && batch.pendingEvents.filter(event => event.id === 220 || event.id === 236).length === 2,
    name + ': original four-card batch must preserve the requested prefix and two real continuations.');
  const keys = batch.pendingEvents.map(event => event.story ? 'story:' + event.story : String(event.id));
  setup(new Set(keys).size === keys.length && keys.every(key => batch.eventLastFired[key] === year(batch)), name + ': actual delivery stamps or identities differ.');
}
function verifyAnswer(value, id, index, label) {
  setup(value.before.pendingEvents[0].id === id && value.row.eventId === id && value.row.choiceIndex === index
    && value.row.beforeSha256 === stateHash(value.before) && JSON.stringify(value.row.before) === JSON.stringify(value.before)
    && JSON.stringify(value.after) === JSON.stringify(literal(value.before, id, index)), label + ': independent complete literal effect differs.');
  const wanted = JSON.stringify(value.after);
  setup(JSON.stringify(value.row.actual) === wanted && JSON.stringify(value.row.expected) === wanted
    && JSON.stringify(value.row.reload1) === wanted && JSON.stringify(value.row.reload2) === wanted
    && value.row.expectedSha256 === sha(wanted) && value.row.actualSha256 === sha(wanted)
    && value.row.resolverDrawCount === resolverInputs(value.before).length && JSON.stringify(value.row.resolverDraws) === JSON.stringify(resolverInputs(value.before)),
    label + ': actual answer, canonical reloads or original resolver vector differs.');
}
async function serve() {
  const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => { const port = probe.address().port; probe.close(error => error ? reject(error) : resolve(port)); }); });
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => { let log = ''; const timeout = setTimeout(() => reject(new Error('Host startup failed: ' + log)), 15000);
    server.once('error', error => { clearTimeout(timeout); reject(error); }); server.once('exit', code => { clearTimeout(timeout); reject(new Error('Host exited ' + code)); });
    server.stdout.on('data', data => { log += data; if (String(data).includes('host-like server:')) { clearTimeout(timeout); resolve(); } }); server.stderr.on('data', data => { log += data; }); });
  return 'http://127.0.0.1:' + port;
}
async function open(base, profile, fixture, row) {
  const context = await browser.newContext({ viewport: profile, isMobile: profile.width < 1000, hasTouch: profile.width < 1000,
    colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: base,
      localStorage: [{ name: KEY, value: JSON.stringify(fixture.initial) }, { name: 'cookie-consent', value: 'essential' },
        { name: 'dukb-theme', value: 'dark' }, { name: 'dukb-guest-handle', value: 'SteadyVolley-18' }] }] } });
  const aborted = new Set(), page = await context.newPage(); page.setDefaultTimeout(20000);
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === base) { if (['GET', 'HEAD'].includes(request.method())) return route.continue();
      row.assetErrors.push('Owned write refused: ' + request.url()); return route.abort('blockedbyclient'); }
    if (request.method() === 'GET' && fonts.has(url.href)) { row.transport.push({ method: request.method(), url: request.url(), action: 'retained-font' });
      return route.fulfill({ status: 200, ...fonts.get(url.href) }); }
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) row.assetErrors.push('Uncached declared font: ' + request.url());
    aborted.add(request.url()); row.transport.push({ method: request.method(), url: request.url(), action: 'abort' }); return route.abort('blockedbyclient');
  });
  await context.routeWebSocket('**/*', socket => { row.transport.push({ url: socket.url(), action: 'websocket-close' }); socket.close(); });
  page.on('pageerror', error => row.errors.push(String(error)));
  page.on('console', message => { if (message.type() !== 'error') return; const url = message.location().url, text = message.text();
    if (/Failed to load resource.*(?:ERR_FAILED|ERR_BLOCKED_BY_CLIENT)/.test(text) && aborted.has(url)) row.diagnostics.push({ url, text, action: 'owned-abort' });
    else row.errors.push(url + ': ' + text); });
  page.on('requestfailed', request => { if (new URL(request.url()).origin === base) row.assetErrors.push('Owned request failed: ' + request.url()); });
  page.on('response', response => { if (new URL(response.url()).origin === base && response.status() >= 400) row.assetErrors.push('Owned asset ' + response.status() + ': ' + response.url()); });
  await page.addInitScript(({ now }) => { const OldDate = Date;
    window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }; }, { now });
  const raw = () => page.evaluate(key => localStorage.getItem(key), KEY);
  const ready = async () => { await page.getByRole('button', { name: 'How to play', exact: true }).or(page.locator('[data-career-chance-wheel]')).first().waitFor({ timeout: 45000 });
    await page.locator('[data-career-utilities]').waitFor({ state: 'attached' }); await page.evaluate(() => document.fonts.ready); };
  const activate = async button => { await button.scrollIntoViewIfNeeded(); if (profile.width < 1000) await button.tap(); else { await button.focus(); await button.press('Enter'); } };
  await page.goto(base + '/soccer-career', { waitUntil: 'domcontentloaded' }); await ready(); return { context, page, raw, ready, activate };
}
const eventCard = (page, event) => page.getByRole('heading', { name: event.title, exact: true, level: 3, includeHidden: true }).locator('..').locator('..');
async function buttonFor(walk, card, label, row) {
  const button = card.getByRole('button').filter({ has: walk.page.getByText(label, { exact: true }) });
  setup(await button.count() === 1 && await button.locator('span.font-bold.text-sm').count() === 1
    && (await button.locator('span.font-bold.text-sm').innerText()).trim() === label, row.id + ': full actual choice identity differs: ' + label); return button;
}
async function capture(walk, row, name, target) {
  await walk.page.waitForFunction(() => !document.querySelector('[data-sonner-toast]'), undefined, { timeout: 15000 }); await target.scrollIntoViewIfNeeded();
  const geometry = await target.evaluate(async element => { let previous = '', stable = 0, observation;
    for (let frame = 0; frame < 120; frame++) { await new Promise(resolve => requestAnimationFrame(resolve)); const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
      const finite = element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity).length;
      const top = Math.max(0, rect.y), bottom = Math.min(innerHeight, rect.bottom), hit = document.elementFromPoint(Math.max(0, Math.min(innerWidth - 1, rect.x + rect.width / 2)), (top + bottom) / 2);
      observation = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, opacity: Number(style.opacity), finite,
        overflow: document.documentElement.scrollWidth > innerWidth + 1, painted: rect.width > 0 && bottom > top && rect.right <= innerWidth + 1 && rect.x >= 0 && !!hit && element.contains(hit) };
      const signature = JSON.stringify(observation); stable = signature === previous ? stable + 1 : 1; previous = signature;
      if (stable >= 4 && observation.opacity >= 0.99 && !finite && observation.painted && !observation.overflow) return { ...observation, stable }; }
    return { ...observation, stable }; });
  check(geometry.stable >= 4 && geometry.opacity >= 0.99 && !geometry.finite && geometry.painted && !geometry.overflow, row.id + ': capture did not settle: ' + name, row);
  const file = row.id + '-' + name + '.png', filename = path.join(OUT, file); assert(!fs.existsSync(filename), 'Refuse to replace an original capture.');
  await walk.page.screenshot({ path: filename }); row.layouts.push({ stage: name, ...geometry }); row.shots.push(file);
  report.inventory.push({ file, bytes: fs.statSync(filename).size, sha256: fileHash(filename), original: true });
}
async function reload(walk, row, stage) {
  const before = await walk.raw(); await walk.page.reload({ waitUntil: 'domcontentloaded' }); await walk.ready(); const after = await walk.raw();
  row.reloads.push({ stage, before, after, equal: before === after, beforeSha256: sha(before ?? ''), afterSha256: sha(after ?? '') });
  check(before === after, row.id + ': literal saved bytes changed on ' + stage, row);
}
async function runCase(base, profile, fixture, variant = 'played') {
  const row = { id: profile.width + '-' + fixture.id + '-' + variant, fixture: fixture.id, width: profile.width, provenance: fixture.provenance,
    checks: 0, issues: [], errors: [], assetErrors: [], transport: [], diagnostics: [], shots: [], stages: [], reloads: [], layouts: [] };
  (variant === 'played' ? report.cases : report.controls).push(row); let walk;
  try {
    walk = await open(base, profile, fixture, row); const original = JSON.stringify(fixture.initial);
    check(await walk.raw() === original, row.id + ': initial actual loader changed the complete picked save.', row);
    row.stages.push({ stage: 'loaded', raw: await walk.raw() });
    for (const [stepIndex, step] of fixture.steps.entries()) {
      await reload(walk, row, step.eventId + '-pending-reload');
      const beforeRaw = await walk.raw(), before = JSON.parse(beforeRaw), event = before.pendingEvents[0], card = eventCard(walk.page, event);
      const wantedBefore = stepIndex === 0 ? original : JSON.stringify(fixture.steps[stepIndex - 1].expected), expectedCard = CARDS[step.eventId];
      setup(beforeRaw === wantedBefore && event.id === step.eventId && before.phase === 'random_events' && before.pendingEvents.length > 1,
        row.id + ': complete source-bound pending step is not playable.');
      if (stepIndex === 1) check(before.netWorth === 0.48 && before.morale === 63 && !before.lifeFlags.teammateLoan
        && before.lastEventId === 220, row.id + ': the real voucher must lower funds before the saved loan reply.', row);
      await card.waitFor(); check(await card.getByRole('button').count() === expectedCard.choices.length
        && await card.getByText(expectedCard.description, { exact: true }).count() === 1, row.id + ': actual pending card contents differ.', row);
      const rendered = [];
      for (const [index, choice] of expectedCard.choices.entries()) {
        const option = await buttonFor(walk, card, choice.label, row), consequence = (await option.locator('div').last().innerText()).trim();
        check(consequence === choice.consequence, row.id + ': independent current choice preview differs.', row);
        rendered.push({ index, label: choice.label, consequence });
      }
      check(await walk.raw() === beforeRaw, row.id + ': rendering rewrote the complete saved card.', row);
      row.stages.push({ stage: 'offered', stepIndex, eventId: step.eventId, title: event.title, choices: rendered, raw: beforeRaw });
      const button = await buttonFor(walk, card, step.choiceLabel, row);
      if (variant === 'played') await capture(walk, row, 'pending' + step.eventId + '-after-reload', card);
      if (variant === 'omit-choice' && stepIndex === 1) {
        row.detected = outcomeIssues(before, await walk.raw(), step);
        check(JSON.stringify(row.detected) === JSON.stringify(['complete-saved-state', 'expected-state-hash', 'literal-net-worth', 'literal-integrity',
          'literal-loan-record', 'last-event-id', 'single-queue-consumption', 'single-history-line', 'literal-complete-state']),
          row.id + ': omitted real loan reply did not trigger exact detectors.', row);
        check(await walk.raw() === beforeRaw && await button.count() === 1
          && row.stages.filter(stage => stage.stage === 'answered').length === 1 && row.stages.some(stage => stage.stage === 'answered' && stage.eventId === 220),
          row.id + ': omission must hold the actual completed voucher and pending loan.', row);
        await capture(walk, row, 'detected236-click-omission', card); return;
      }
      await walk.page.evaluate(values => { window.__savedLoanOriginalRandom = Math.random; window.__savedLoanDraws = [];
        Math.random = () => { const ordinal = window.__savedLoanDraws.length + 1, extra = ordinal > values.length, value = extra ? null : values[ordinal - 1];
          window.__savedLoanDraws.push({ ordinal, value, extra, stack: new Error('Observed saved loan resolver input').stack });
          if (extra) throw new Error('Unlisted saved loan draw ' + ordinal); return value; }; }, step.resolverDraws);
      await walk.activate(button);
      await walk.page.waitForFunction(({ key, count, id }) => { const state = JSON.parse(localStorage.getItem(key)); return state?.lastEventId === id && state.pendingEvents.length === count; },
        { key: KEY, count: before.pendingEvents.length - 1, id: step.eventId });
      const afterRaw = await walk.raw(), observedDraws = await walk.page.evaluate(() => { Math.random = window.__savedLoanOriginalRandom; return window.__savedLoanDraws; });
      check(JSON.stringify(observedDraws.map(draw => draw.value)) === JSON.stringify(resolverInputs(before)) && observedDraws.length === resolverInputs(before).length
        && observedDraws.every((draw, index) => !draw.extra && draw.ordinal === index + 1 && typeof draw.stack === 'string' && draw.stack.length > 0),
        row.id + ': actual complete resolver vector differs.', row);
      const findings = outcomeIssues(before, afterRaw, step);
      row.stages.push({ stage: 'answered', stepIndex, eventId: step.eventId, choiceIndex: step.choiceIndex, choiceLabel: step.choiceLabel,
        rawBefore: beforeRaw, rawAfter: afterRaw, expectedSha256: step.expectedSha256, actualSha256: sha(afterRaw), input: step.resolverDraws, observedDraws, findings });
      check(findings.length === 0, row.id + ': complete literal answer differs: ' + findings.join(', '), row);
      check(await card.getByRole('button', { includeHidden: true }).filter({ has: walk.page.locator('span.font-bold.text-sm') }).count() === 0,
        row.id + ': consumed card is still actionable.', row);
      check(await walk.page.locator('[data-career-chance-wheel]').count() === 0, row.id + ': deterministic reply invented a wheel.', row);
      await reload(walk, row, step.eventId + '-resolved-reload');
      check(await walk.raw() === afterRaw && outcomeIssues(before, await walk.raw(), step).length === 0
        && await eventCard(walk.page, event).count() === 0, row.id + ': once, complete effect or saved queue failed on resolved reload.', row);
      row.stages.push({ stage: 'resolved-reload', stepIndex, eventId: step.eventId, raw: await walk.raw() });
      if (variant === 'delete-save' && stepIndex === 1) {
        const removed = await walk.page.evaluate(key => { const raw = localStorage.getItem(key); localStorage.removeItem(key); return { raw, after: localStorage.getItem(key) }; }, KEY);
        check(removed.raw === afterRaw && removed.after === null && JSON.parse(removed.raw).lastEventId === 236, row.id + ': deletion did not remove the actual completed loan reply.', row);
        await walk.page.reload({ waitUntil: 'domcontentloaded' });
        await walk.page.getByRole('heading', { name: 'Create Your Player', exact: true }).waitFor(); await walk.page.evaluate(() => document.fonts.ready);
        const lost = await walk.raw(); row.detected = outcomeIssues(before, lost, step);
        check(JSON.stringify(row.detected) === JSON.stringify(['saved-career-missing']), row.id + ': deleted actual save did not fail its restoration detector.', row);
        const creator = walk.page.getByRole('heading', { name: 'Create Your Player', exact: true }).locator('..'); await creator.waitFor();
        row.stages.push({ stage: 'deleted-save-reload', removedRaw: removed.raw, rawAfter: lost }); await capture(walk, row, 'detected-completed-save-deletion', creator); return;
      }
      const next = eventCard(walk.page, JSON.parse(afterRaw).pendingEvents[0]); await next.waitFor();
      check(await next.getByRole('button').count() > 0, row.id + ': original real continuation is not actionable.', row);
      if (variant === 'played') await capture(walk, row, stepIndex === 0 ? 'voucher-resolved236-before-pending-reload' : 'resolved236-original-continuation', next);
    }
  } catch (error) { report.failures++; row.issues.push(String(error?.stack ?? error)); report.issues.push(row.id + ': ' + String(error));
  } finally {
    if (walk) await walk.page.evaluate(() => { if (window.__savedLoanOriginalRandom) Math.random = window.__savedLoanOriginalRandom; }).catch(() => {});
    check(row.errors.length === 0, row.id + ': unexpected app errors: ' + row.errors.join(' | '), row);
    check(row.assetErrors.length === 0, row.id + ': owned asset or declared font errors: ' + row.assetErrors.join(' | '), row);
    check(row.diagnostics.every(item => row.transport.some(request => request.action === 'abort' && request.url === item.url)), row.id + ': diagnostic lacks an exact aborted URL.', row);
    check(row.transport.every(request => request.method !== 'POST'), row.id + ': selected nonterminal play attempted a backend POST.', row);
    if (walk) await walk.context.close(); write();
  }
}
try {
  sourceBefore = SOURCE_FILES.map(file => { const filename = path.join(ROOT, file), retained = path.join('source-before', file); fs.mkdirSync(path.dirname(path.join(OUT, retained)), { recursive: true });
    fs.copyFileSync(filename, path.join(OUT, retained)); return { file, retained: retained.replaceAll('\\', '/'), bytes: fs.statSync(filename).size, sha256: fileHash(filename) }; }); report.source = sourceBefore;
  setup(fs.existsSync(FIXTURE), 'Actual normal model must emit browser-fixtures.json first.'); fixtureHash = fileHash(FIXTURE);
  const fixtures = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  report.fixtureReceipt = { file: 'browser-fixtures.json', bytes: fs.statSync(FIXTURE).size, sha256: fixtureHash, source: fixtures.source };
  setup(fixtures.schemaVersion === 1 && fixtures.saveKey === KEY && fixtures.scenarios.length === 2 && fixtures.clock === '2026-10-13T16:00:00Z', 'Two exact saved loan scenarios and original save key/clock required.');
  now = Date.parse(fixtures.clock); report.clock = fixtures.clock;
  setup(fixtures.source.head === report.sourceHead && fixtures.source.parentAppRef === PARENT, 'Model checkout or held parent differs.');
  for (const [field, file] of Object.entries(BINDINGS)) setup(fixtures.source[field] === fileHash(path.join(ROOT, file)), field + ': model source differs.');
  setup(fixtures.source.parentLifeSourcePath === 'fixed/soccerCareerLife.parent.ts' && fixtures.source.parentLifeSha256 === sha(execFileSync('git', ['show', PARENT + ':src/lib/soccerCareerLife.ts'], { cwd: ROOT })), 'Actual parent Life source differs.');
  physical(fixtures.source.parentLifeSourcePath, fixtures.source.parentLifeSha256, parentFiles); report.parentReceipts = parentFiles.map(({ filename, ...value }) => value);
  const observer = fixtures.source.pickerObserver, normalPath = 'fixed/source.json', normal = JSON.parse(fs.readFileSync(path.join(ARTIFACTS, normalPath), 'utf8'));
  /* Release BF join: a fixture dealt on Round 1327's keyed deck carries a keyed receipt (scripts/lib/keyedPicker1327.mjs). */
  setup(observer?.kind === KEYED_KIND ? keyedObserverProblems(observer, fs.readFileSync(path.join(ROOT, 'src/lib/soccerCareerEngine.ts'), 'utf8')).length === 0 : observer.kind === 'read-only-sort-comparisons' && observer.file === 'src/lib/soccerCareerEngine.ts' && observer.anchor === PICKER_ANCHOR && observer.replacement === PICKER_OBSERVER,
    'Only the disclosed read-only comparator observer may select picker inputs.');
  setup(normal.arm === 'fixed' && normal.status === 'complete' && normal.sourceHead === report.sourceHead && normal.parentAppRef === PARENT
    && normal.exitCode === 0 && normal.processError === null && normal.processSignal === null && normal.methodError === undefined && normal.actualSourceEdits.length === 0
    && normal.fixtures.file === 'browser-fixtures.json' && normal.fixtures.sha256 === fixtureHash && normal.fixtures.scenarios === 2
    && normal.fixtures.actualPickerBatches === 1 && normal.fixtures.actualAnswers === 4
    && JSON.stringify(normal.pickerObserver) === JSON.stringify(observer), 'Completed normal model receipts differ or credit a source fault.');
  if (observer?.kind === KEYED_KIND) pickerFiles.keyed = true;
  for (const [field, digest, file] of (observer?.kind === KEYED_KIND ? [['plainCompiledPath', 'plainCompiledSha256', 'fixed/engine.mjs']] : [['originalSourcePath', 'originalSha256', 'fixed/soccerCareerEngine.picker-original.ts'],
    ['observedSourcePath', 'observedSha256', 'fixed/soccerCareerEngine.picker-observed.ts'], ['compiledPath', 'compiledSha256', 'fixed/engine-picker-observed.mjs'],
    ['plainCompiledPath', 'plainCompiledSha256', 'fixed/engine.mjs']])) { setup(observer[field] === file, 'Picker physical path differs.'); physical(file, observer[digest], pickerFiles); }
  physical(normalPath, fileHash(path.join(ARTIFACTS, normalPath)), pickerFiles); report.pickerReceipts = pickerFiles.map(({ filename, ...value }) => value);
  if (observer?.kind !== KEYED_KIND) {
    const original = fs.readFileSync(path.join(ARTIFACTS, observer.originalSourcePath), 'utf8'), observed = fs.readFileSync(path.join(ARTIFACTS, observer.observedSourcePath), 'utf8');
    setup(original === fs.readFileSync(path.join(ROOT, observer.file), 'utf8') && original.split(PICKER_ANCHOR).length === 2 && observed.split(PICKER_OBSERVER).length === 2
      && original.replace(PICKER_ANCHOR, PICKER_OBSERVER) === observed && observed.replace(PICKER_OBSERVER, PICKER_ANCHOR) === original
      && observer.originalSha256 !== observer.observedSha256, 'Read-only observer must invert to every actual engine byte.');
  }
  setup((observer?.kind === KEYED_KIND ? normal.compiled.every(file => file.file !== 'engine-picker-observed.mjs')
      : normal.compiled.length === 6 && normal.compiled.some(file => file.file === 'engine-picker-observed.mjs' && file.sha256 === observer.compiledSha256))
    && normal.compiled.some(file => file.file === 'engine.mjs' && file.sha256 === observer.plainCompiledSha256)
    && normal.sourceReceipts.length === 12 && new Set(normal.sourceReceipts.map(value => value.file)).size === 12
    && normal.sourceReceipts.every(value => value.beforeSha256 === value.afterSha256), 'Actual original and compiled model receipts are not held.');
  for (const value of normal.sourceReceipts) {
    setup(SOURCE_FILES.includes(value.file), 'Unknown normal source binding: ' + value.file);
    const before = path.join(ARTIFACTS, 'fixed', path.basename(value.file) + '.before');
    setup(fileHash(before) === value.beforeSha256 && fileHash(path.join(ROOT, value.file)) === value.beforeSha256,
      value.file + ': actual normal before copy or held checkout differs.');
  }
  const compiledNames = ['engine.mjs', 'life.mjs', 'realism.mjs', 'save.mjs', 'contracts.mjs', 'engine-picker-observed.mjs'].filter(name => observer?.kind !== KEYED_KIND || name !== 'engine-picker-observed.mjs');
  setup(JSON.stringify(normal.compiled.map(value => value.file).sort()) === JSON.stringify([...compiledNames].sort()), 'Normal compiled module identities differ.');
  for (const value of normal.compiled) setup(fileHash(path.join(ARTIFACTS, 'fixed', value.file)) === value.sha256, value.file + ': physical normal compiled bytes differ.');
  const progressPath = 'fixed/fixture-progress.json', progress = JSON.parse(fs.readFileSync(path.join(ARTIFACTS, progressPath), 'utf8'));
  report.modelProgress = { file: progressPath, sha256: fileHash(path.join(ARTIFACTS, progressPath)), acquisitions: progress.acquisitions.length, answers: progress.answers.length };
  setup(progress.status === 'complete' && progress.acquisitions.length === 1 && progress.answers.length === 4
    && JSON.stringify(progress.scenarios) === JSON.stringify(fixtures.scenarios), 'Raw full model progress differs from supplied fixtures.');
  for (const item of progress.acquisitions) verifyDelivery({ context: item.context, batch: item.witness.replay.batch, witness: item.witness });
  for (const item of progress.answers) verifyAnswer({ before: item.before, after: item.reload2, row: item }, item.eventId, item.choiceIndex, item.name);
  setup(JSON.stringify(fixtures.scenarios.map(fixture => fixture.id).sort()) === JSON.stringify([...IDS].sort()), 'Two owned scenario identities required.');
  for (const fixture of fixtures.scenarios) {
    const { provenance, initial } = fixture;
    setup(provenance.kind === 'actual-picker-saved-loan' && provenance.preparedFields.length > 0 && fixture.steps.length === 2
      && JSON.stringify(initial) === JSON.stringify(provenance.actualPickerBatch) && stateHash(initial) === fixture.initialSha256
      && stateHash(initial) === provenance.actualPickerBatchSha256 && initial.personality === 'professor' && initial.agentId === 'self'
      && initial.overall === 70 && initial.marketValue === 4 && initial.netWorth === 0.5 && initial.morale === 60 && initial.integrityBonus === 5
      && !initial.lifeFlags.teammateLoan && initial.pendingEvents.length === 4, fixture.id + ': original complete delivered save differs.');
    verifyDelivery({ context: provenance.context, batch: provenance.actualPickerBatch, witness: provenance.pickerWitness });
    setup(JSON.stringify(provenance.pickerWitness) === JSON.stringify(progress.acquisitions[0].witness)
      && JSON.stringify(provenance.context) === JSON.stringify(progress.acquisitions[0].context), fixture.id + ': original acquisition differs from raw model progress.');
    let before = initial;
    for (const [index, step] of fixture.steps.entries()) {
      const id = index === 0 ? 220 : 236, choiceIndex = index === 0 ? 1 : fixture.id.endsWith('-lend') ? 0 : 1;
      const card = before.pendingEvents[0], expectedCard = CARDS[id];
      setup(card.id === id && card.title === expectedCard.title && card.description === expectedCard.description
        && JSON.stringify(card.choices.map(choice => [choice.label, choice.consequence])) === JSON.stringify(expectedCard.choices.map(choice => [choice.label, choice.consequence]))
        && card.choices.every(choice => choice.apply === undefined) && step.eventId === id && step.choiceIndex === choiceIndex
        && step.choiceLabel === expectedCard.choices[choiceIndex].label && step.reloadAfter === true
        && step.resolverDrawCount === resolverInputs(before).length && JSON.stringify(step.resolverDraws) === JSON.stringify(resolverInputs(before))
        && stateHash(step.expected) === step.expectedSha256 && outcomeIssues(before, JSON.stringify(step.expected), step).length === 0,
        fixture.id + ': original saved choices or independent complete expected effect differs.');
      before = step.expected;
      setup(JSON.stringify(before.eventLastFired) === JSON.stringify(initial.eventLastFired), fixture.id + ': choice changed original delivery stamps.');
    }
    const voucher = fixture.steps[0].expected, finished = fixture.steps[1].expected;
    setup(voucher.netWorth === 0.48 && voucher.morale === 63 && voucher.lastEventId === 220 && voucher.pendingEvents[0].id === 236
      && finished.netWorth === (fixture.id.endsWith('-lend') ? 0.28 : 0.48) && finished.morale === (fixture.id.endsWith('-lend') ? 63 : 61)
      && finished.integrityBonus === (fixture.id.endsWith('-lend') ? 7 : 5) && finished.lifeFlags.teammateLoan === (fixture.id.endsWith('-lend') ? 1 : 9)
      && JSON.stringify(finished.pendingEvents) === JSON.stringify(initial.pendingEvents.slice(2)) && finished.pendingEvents.length === 2,
      fixture.id + ': actual voucher and loan branch must preserve the complete original tail.');
  }
  const installedRows = JSON.parse(fs.readFileSync(path.join(ARTIFACTS, 'prior-popularity/installed.json'), 'utf8'));
  setup(installedRows.length === 521 && new Set(installedRows.map(row => row.path)).size === 521, 'Exactly521 unique locked installed versions required.');
  installedBefore = installedRows.map(row => { setup(row.path.startsWith('node_modules/') && !row.path.split('/').includes('..'), 'Installed package path escapes checkout.');
    const filename = path.join(ROOT, row.path, 'package.json'); setup(JSON.parse(fs.readFileSync(filename, 'utf8')).version === row.version, 'Locked installed version differs.'); return { ...row, sha256: fileHash(filename) }; }); report.installed = installedBefore;
  toolsBefore = ['esbuild', 'playwright', 'playwright-core'].map(name => { const filename = require.resolve(name + '/package.json'), retained = 'tools/' + name + '.package.json';
    fs.mkdirSync(path.join(OUT, 'tools'), { recursive: true }); fs.copyFileSync(filename, path.join(OUT, retained)); return { name, filename, retained, version: JSON.parse(fs.readFileSync(filename, 'utf8')).version, sha256: fileHash(filename) }; }); report.tools = toolsBefore;
  cache = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(ARTIFACTS, 'font-cache')); fontHash = fileHash(path.join(cache, 'manifest.json'));
  report.fonts = JSON.parse(fs.readFileSync(path.join(cache, 'manifest.json'), 'utf8'));
  fonts = new Map(report.fonts.map(entry => { setup(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin)
    && /^[a-f0-9]{64}$/.test(entry.file) && fileHash(path.join(cache, entry.file)) === entry.sha256, 'Declared retained font bytes differ.'); return [entry.url, { body: fs.readFileSync(path.join(cache, entry.file)), contentType: entry.contentType }]; }));
  distBefore = listFiles(path.join(ROOT, 'dist')); report.dist = distBefore;
  const base = await serve(); browser = await pw.chromium.launch({ headless: true });
  for (const profile of PROFILES) for (const fixture of fixtures.scenarios) await runCase(base, profile, fixture);
  const controlFixture = fixtures.scenarios.find(fixture => fixture.id === '220-voucher-236-lend');
  await runCase(base, PROFILES[1], controlFixture, 'omit-choice'); await runCase(base, PROFILES[1], controlFixture, 'delete-save');
  check(report.cases.length === 6 && report.controls.length === 2 && report.inventory.length === 26, 'Exactly6 played journeys,2 controls and26 original captures required.');
  check(report.cases.every(row => JSON.stringify(row.stages.filter(stage => stage.stage === 'answered').map(stage => stage.eventId)) === '[220,236]'
    && row.reloads.length === 4 && row.shots.length === 4), 'Every played case needs both actual answers, four literal reloads and four originals.');
  const rows = [...report.cases, ...report.controls], answered = rows.flatMap(row => row.stages.filter(stage => stage.stage === 'answered'));
  const drawCount = fixture => fixture.steps.reduce((sum, step, index) => sum + resolverInputs(index === 0 ? fixture.initial : fixture.steps[index - 1].expected).length, 0);
  const expectedDraws = PROFILES.length * fixtures.scenarios.reduce((sum, fixture) => sum + drawCount(fixture), 0)
    + resolverInputs(controlFixture.initial).length + drawCount(controlFixture);
  check(answered.length === 15 && answered.reduce((sum, stage) => sum + stage.observedDraws.length, 0) === expectedDraws,
    'All15 played/control answers must consume exactly their finite per-context catalog vectors.');
  check(report.cases.reduce((sum, row) => sum + row.reloads.length, 0) === 24
    && report.controls[0].reloads.length === 3 && report.controls[1].reloads.length === 4
    && rows.reduce((sum, row) => sum + row.reloads.length, 0) === 31
    && report.controls.flatMap(row => row.stages).filter(stage => stage.stage === 'deleted-save-reload').length === 1,
    'Exactly24 played and7 control literal reloads plus one deleted-save document reload required.');
  check(new Set(report.inventory.map(image => image.file)).size === 26, 'Each capture needs a unique original path.');
  for (const image of report.inventory) check(fileHash(path.join(OUT, image.file)) === image.sha256 && fs.statSync(path.join(OUT, image.file)).size === image.bytes, 'Original changed: ' + image.file);
} catch (error) { report.issues.push(String(error?.stack ?? error)); if (!report.setupFailures) report.failures++;
} finally {
  if (browser) await browser.close(); if (server) server.kill();
  report.sourceHeld = sourceBefore.length > 0 && sourceBefore.every(item => fileHash(path.join(ROOT, item.file)) === item.sha256);
  report.toolsHeld = toolsBefore.length === 3 && toolsBefore.every(item => fileHash(item.filename) === item.sha256);
  report.installedHeld = installedBefore.length === 521 && installedBefore.every(item => fileHash(path.join(ROOT, item.path, 'package.json')) === item.sha256);
  report.parentHeld = parentFiles.length === 1 && parentFiles.every(item => fileHash(item.filename) === item.sha256);
  report.pickerHeld = pickerFiles.length === (pickerFiles.keyed ? 2 : 5) && pickerFiles.every(item => fileHash(item.filename) === item.sha256);
  report.fixturesHeld = !!fixtureHash && fileHash(FIXTURE) === fixtureHash;
  report.distHeld = distBefore.length > 0 && JSON.stringify(listFiles(path.join(ROOT, 'dist'))) === JSON.stringify(distBefore);
  report.fontsHeld = !!fontHash && fileHash(path.join(cache, 'manifest.json')) === fontHash && report.fonts.every(item => fileHash(path.join(cache, item.file)) === item.sha256);
  for (const field of ['sourceHeld', 'toolsHeld', 'installedHeld', 'fixturesHeld', 'distHeld', 'fontsHeld', 'parentHeld', 'pickerHeld']) check(report[field], field + ': proof input changed or never qualified.');
  const rows = [...report.cases, ...report.controls], count = (bank, stage) => bank.reduce((sum, row) => sum + row.stages.filter(item => item.stage === stage).length, 0);
  report.summary = { played: report.cases.length, controls: report.controls.length, checks: report.checks, originals: report.inventory.length,
    answeredSteps: count(report.cases, 'answered'), reloads: report.cases.reduce((sum, row) => sum + row.reloads.length, 0),
    totalAnsweredSteps: count(rows, 'answered'), literalReloadsAll: rows.reduce((sum, row) => sum + row.reloads.length, 0), deletedSaveReloads: count(report.controls, 'deleted-save-reload'),
    resolverDraws: rows.flatMap(row => row.stages.filter(item => item.stage === 'answered')).reduce((sum, item) => sum + item.observedDraws.length, 0),
    externalAborts: rows.reduce((sum, row) => sum + row.transport.filter(item => item.action === 'abort').length, 0), expectedDiagnostics: rows.reduce((sum, row) => sum + row.diagnostics.length, 0),
    backendPosts: rows.reduce((sum, row) => sum + row.transport.filter(item => item.method === 'POST').length, 0), caseChecks: report.cases.reduce((sum, row) => sum + row.checks, 0),
    controlChecks: report.controls.reduce((sum, row) => sum + row.checks, 0), installedVersions: installedBefore.length, uniqueScenarios: new Set(report.cases.map(row => row.fixture)).size,
    failures: report.failures, setupFailures: report.setupFailures };
  report.status = report.failures || report.setupFailures ? 'failed' : 'passed'; write();
  console.log('Soccer saved loan browser: ' + report.status + '; ' + report.checks + ' checks, ' + report.cases.length + ' played, ' + report.controls.length
    + ' controls, ' + report.inventory.length + ' originals, ' + report.failures + ' failures, ' + report.setupFailures + ' setup failures.');
  process.exitCode = report.status === 'passed' ? 0 : 1;
}
