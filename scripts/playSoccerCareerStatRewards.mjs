/* Actual saved Soccer Career stat rewards and previews, remote CI only.
 * Actual picker offers retain the parent caption as a disclosed one-field
 * overlay. The UI oracle is independent of those serialized old words.
 * Recorded resolver inputs never replace a choice, queue, reward or wheel.
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

assert(process.env.CI, 'Soccer stat-rewards browser execution is remote CI only.');
assert(process.env.CAREER_REWARDS_PHASE === 'fixed', 'This actual browser proof requires the qualified fixed phase.');
assert(process.env.CAREER_REWARDS_OUT && path.isAbsolute(process.env.CAREER_REWARDS_OUT), 'CAREER_REWARDS_OUT must be an absolute artifact root.');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTIFACTS = process.env.CAREER_REWARDS_OUT;
const OUT = path.join(ARTIFACTS, 'browser');
const FIXTURE = path.join(ARTIFACTS, 'browser-fixtures.json');
const REPORT = path.join(OUT, 'report.json');
const KEY = 'soccerCareerSave';
const require = createRequire(import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fileHash = filename => sha(fs.readFileSync(filename));
const stateHash = state => sha(JSON.stringify(state));
fs.mkdirSync(OUT, { recursive: true });
assert(!fs.existsSync(REPORT), 'Refuse to overwrite an existing browser report.');
const report = {
  status: 'running', phase: 'fixed', sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  checks: 0, failures: 0, setupFailures: 0, cases: [], controls: [], inventory: [], issues: [],
  sourceHeld: false, toolsHeld: false, installedHeld: false, fixturesHeld: false, distHeld: false, parentHeld: false,
  limits: ['Signed out, local saved outcomes only; no backend completion is credited.',
    'Initial profile facts are prepared. Actual picker delivery is model proof, not a fully played UI career.',
    'The selected old caption is overlaid from the held parent factory; the full original picker batch is retained.',
    'Nine current previews have an independent literal oracle. Rendering never rewrites the saved old caption.',
    'The complete recorded draw vector is installed only at the actual click. It is a disclosed input, not a seeded stream.',
    'Every observed draw, ordinal and stack is retained; unlisted draws fail the proof.',
    'Once means the played effect and queue stay consumed through reload, not lifetime exclusion of recurring cards.',
    'External flag images and nonessential network are blocked. Their appearance is not visually qualified.',
    'Captures cover selected previews, wheels and saved continuation, not blanket visual acceptance.'],
};
const write = () => fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
const check = (condition, message, row) => {
  report.checks++;
  if (row) row.checks++;
  if (!condition) { report.failures++; report.issues.push(message); if (row) row.issues.push(message); }
  return !!condition;
};
const setup = (condition, message) => {
  report.checks++;
  if (!condition) { report.setupFailures++; throw new Error(message); }
};
const PROFILES = [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 800 }];
const PARENT = 'ee135646dd2344b90057140116aa15e804a7d9c3';
const SCENARIOS = ['218-hit', '218-miss', '205-choice0', '205-choice1', '211-choice1', '213-choice0',
  '214-choice1', '215-choice1', '217-choice0', '219-choice0'];
const fields = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
const CURRENT = {
  '205:0': 'Followers +400k, Morale -3, dressing room teases you forever',
  '205:1': 'Represent yourself from now on, Morale -5, awkward family dinners',
  '211:1': 'Integrity +4, Popularity +4, playgrounds everywhere copy you',
  '213:0': 'Followers +500k, Popularity -2, journalists hate it',
  '214:1': 'Integrity +2, Followers +300k, the stare goes viral anyway',
  '215:1': 'Integrity +3, Morale +3, dressing room respect',
  '217:0': 'Popularity +4 and Morale -3 now, the manager reads your column',
  '218:0': '60%: all 7 skills +1 queued for next season (normal growth and the 99 cap still apply). 40%: Pace -1 now, you mostly learned soup',
  '219:0': 'Followers +800k, 50%: Popularity +6, 50%: Popularity -3',
};
const LEGACY = {
  '205:0': 'Followers +400k, dressing room teases you forever',
  '205:1': 'Represent yourself from now on, awkward family dinners',
  '211:1': 'Integrity +4, playgrounds everywhere copy you',
  '213:0': 'Followers +500k, journalists hate it',
  '214:1': 'Integrity +2, the stare goes viral anyway',
  '215:1': 'Integrity +3, dressing room respect',
  '217:0': 'Popularity +4, Morale -3 when the manager reads issue two',
  '218:0': '60%: all stats +1 next season. 40%: Pace -1, you mostly learned soup',
  '219:0': 'Followers +800k, coin flip on public opinion',
};
const choices = {
  '205:0': { label: 'Laugh it off', followers: 0.4, morale: -3 },
  '205:1': { label: 'Fire him', agent: 'self', morale: -5 },
  '211:1': { label: 'Let the kids use it free', integrity: 4, popularity: 4 },
  '213:0': { label: 'Yes', followers: 0.5, popularity: -2 },
  '214:1': { label: 'Stare. Say nothing. Walk away', integrity: 2, followers: 0.3 },
  '215:1': { label: 'Buy the kit man a new cart, apologize', integrity: 3, morale: 3 },
  '217:0': { label: 'Write it', popularity: 4, morale: -3 },
  '218:0': { label: 'Return enlightened' },
  '219:0': { label: 'Commit to the cape', followers: 0.8 },
};
const wheels = {
  218: { title: 'The Monastery Offseason', chance: 0.6, hit: 'Sharper after the retreat', miss: 'Pace drops by 1' },
  219: { title: 'The Cape Era', chance: 0.5, hit: 'The cape is loved', miss: 'The cape divides opinion' },
};
const keyOf = step => step.eventId + ':' + step.choiceIndex;
const clamp = number => Math.max(0, Math.min(100, number));
const cents = number => Math.round(number * 100) / 100;
function literalIssues(before, after, step, acknowledged = false) {
  const issues = [], e = choices[keyOf(step)];
  if (!e || step.choiceLabel !== e.label) return ['unowned-choice'];
  const wheel = wheels[step.eventId], roll = step.resolve.draws.at(-1), hit = wheel && roll < wheel.chance;
  const popularity = e.popularity ?? (step.eventId === 219 ? (hit ? 6 : -3) : 0);
  if (after.morale !== clamp(before.morale + (e.morale ?? 0))) issues.push('literal-morale');
  if (after.popularity !== clamp(before.popularity + popularity)) issues.push('literal-popularity');
  if (after.integrityBonus !== before.integrityBonus + (e.integrity ?? 0)) issues.push('literal-integrity');
  if (after.netWorth !== before.netWorth) issues.push('literal-money-held');
  if (after.socialMediaFollowers !== (e.followers ? cents(before.socialMediaFollowers + e.followers) : before.socialMediaFollowers)) issues.push('literal-followers');
  if (after.marketValue !== before.marketValue || after.sponsorBonus !== before.sponsorBonus) issues.push('literal-value-and-sponsor-held');
  const boost = { ...before.statBoostNextSeason };
  if (step.eventId === 218 && hit) for (const field of fields) boost[field] = (boost[field] ?? 0) + 1;
  if (JSON.stringify(after.statBoostNextSeason) !== JSON.stringify(boost)) issues.push('literal-queued-boost');
  for (const field of fields) {
    const expected = field === 'pace' && step.eventId === 218 && !hit ? Math.max(20, Math.min(99, before.pace - 1)) : before[field];
    if (after[field] !== expected) issues.push('literal-' + field);
  }
  if (JSON.stringify(after.lifeFlags) !== JSON.stringify(before.lifeFlags) || after.agentId !== (e.agent ?? before.agentId)) issues.push('literal-profile');
  if (JSON.stringify(after.eventLastFired) !== JSON.stringify(before.eventLastFired)) issues.push('literal-ledger-held');
  if (wheel ? !after.chanceWheel || Object.keys(after.chanceWheel).length !== 7
    || Object.entries({ ...wheel, roll, result: hit, seen: acknowledged }).some(([key, value]) => after.chanceWheel[key] !== value)
    : JSON.stringify(after.chanceWheel) !== JSON.stringify(before.chanceWheel)) issues.push('literal-wheel');
  if (after.lastEventId !== step.eventId) issues.push('last-event-id');
  if (JSON.stringify(after.pendingEvents.map(event => event.id)) !== JSON.stringify(before.pendingEvents.slice(1).map(event => event.id))) issues.push('single-queue-consumption');
  if (after.events.length !== before.events.length + 1
    || JSON.stringify(after.events.slice(0, before.events.length)) !== JSON.stringify(before.events)) issues.push('single-history-line');
  return issues;
}
function savedOutcomeIssues(before, raw, step, acknowledged = false) {
  const issues = [];
  if (raw === null) return ['saved-career-missing'];
  const actual = JSON.parse(raw);
  if (raw !== JSON.stringify(acknowledged ? step.postWheelExpected : step.expected)) issues.push('complete-saved-state');
  if (stateHash(actual) !== (acknowledged ? step.postWheelExpectedSha256 : step.expectedSha256)) issues.push('expected-state-hash');
  return [...issues, ...literalIssues(before, actual, step, acknowledged)];
}
function listFiles(directory, base = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(filename, base) : [{ file: path.relative(base, filename).replaceAll('\\', '/'), bytes: fs.statSync(filename).size, sha256: fileHash(filename) }];
  }).sort((left, right) => left.file.localeCompare(right.file));
}
const SOURCE_FILES = ['src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerLife.ts', 'src/lib/soccerCareerRoutineEvents.ts',
  'src/lib/soccerCareerContracts.ts', 'src/lib/soccerCareerLifeConsequences.ts',
  'src/lib/soccerCareerSave.ts', 'src/lib/careerEventDeck.ts', 'src/lib/careerChanceWheel.ts',
  'src/pages/SoccerCareer.tsx', 'src/components/soccer-career/careerMoments.ts', 'src/components/career-moments/useCareerMoment.ts',
  'src/components/soccer-career/CareerChanceWheel.tsx', 'src/components/FlagImg.tsx', 'src/lib/flagUtils.ts', 'src/lib/soccerCurrency.ts',
  'src/test/soccerCareerStatRewards.test.ts', 'src/test/soccerCareerPendingLife.test.ts',
  'scripts/simSoccerCareerStatRewards.mjs', 'scripts/playSoccerCareerStatRewards.mjs',
  'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs',
  'package.json', 'package-lock.json', 'bun.lock', 'index.html'];
let sourceBefore = [];
let distBefore = [];
let toolsBefore = [];
let installedBefore = [];
let fixtureHash;
let parentFiles = [];
let now;
let fontHash;
let server;
let browser;
let fonts = new Map();
let cache;

async function serve() {
  const port = await new Promise((resolve, reject) => {
    const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port; probe.close(error => error ? reject(error) : resolve(port));
    });
  });
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    let log = '';
    const timeout = setTimeout(() => reject(new Error(`Host startup failed: ${log}`)), 15000);
    server.once('error', error => { clearTimeout(timeout); reject(error); });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Host exited ${code}: ${log}`)); });
    server.stdout.on('data', data => { log += data; if (String(data).includes('host-like server:')) { clearTimeout(timeout); resolve(); } });
    server.stderr.on('data', data => { log += data; });
  });
  return `http://127.0.0.1:${port}`;
}
async function open(base, profile, fixture, row) {
  const context = await browser.newContext({ viewport: profile, isMobile: profile.width < 1000, hasTouch: profile.width < 1000,
    colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: base,
      localStorage: [{ name: KEY, value: JSON.stringify(fixture.initial) }, { name: 'cookie-consent', value: 'essential' },
        { name: 'dukb-theme', value: 'dark' }, { name: 'dukb-guest-handle', value: 'SteadyVolley-18' }] }] } });
  const aborted = new Set();
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === base) {
      if (!['GET', 'HEAD'].includes(request.method())) { row.assetErrors.push(`Owned origin write refused: ${request.method()} ${request.url()}`); return route.abort('blockedbyclient'); }
      return route.continue();
    }
    if (request.method() === 'GET' && fonts.has(url.href)) {
      row.transport.push({ method: request.method(), url: request.url(), action: 'retained-font' });
      return route.fulfill({ status: 200, ...fonts.get(url.href) });
    }
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) row.assetErrors.push(`Uncached declared font: ${request.url()}`);
    aborted.add(request.url());
    row.transport.push({ method: request.method(), url: request.url(), action: 'abort' });
    return route.abort('blockedbyclient');
  });
  await context.routeWebSocket('**/*', socket => { row.transport.push({ url: socket.url(), action: 'websocket-close' }); socket.close(); });
  page.on('pageerror', error => row.errors.push(String(error)));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const url = message.location().url;
    const text = message.text();
    if (/Failed to load resource.*(?:ERR_FAILED|ERR_BLOCKED_BY_CLIENT)/.test(text) && aborted.has(url)) row.diagnostics.push({ url, text, action: 'owned-abort' });
    else row.errors.push(`${url}: ${text}`);
  });
  page.on('requestfailed', request => { if (new URL(request.url()).origin === base) row.assetErrors.push(`Owned request failed: ${request.url()} ${request.failure()?.errorText}`); });
  page.on('response', response => { if (new URL(response.url()).origin === base && response.status() >= 400) row.assetErrors.push(`Owned asset ${response.status()}: ${response.url()}`); });
  await page.addInitScript(({ now }) => {
    const OldDate = Date;
    window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
  }, { now });
  const raw = () => page.evaluate(key => localStorage.getItem(key), KEY);
  const saved = async () => JSON.parse(await raw());
  const ready = async () => {
    await page.getByRole('button', { name: 'How to play', exact: true }).or(page.locator('[data-career-chance-wheel]')).first().waitFor({ timeout: 45000 });
    await page.locator('[data-career-utilities]').waitFor({ state: 'attached' });
    await page.evaluate(() => document.fonts.ready);
  };
  const activate = async button => {
    await button.scrollIntoViewIfNeeded();
    if (profile.width < 1000) await button.tap(); else { await button.focus(); await button.press('Enter'); }
  };
  await page.goto(`${base}/soccer-career`, { waitUntil: 'domcontentloaded' });
  await ready();
  return { context, page, raw, saved, ready, activate };
}
function eventCard(page, event) {
  const heading = page.getByRole('heading', { name: event.title, exact: true, level: 3, includeHidden: true });
  return heading.locator('..').locator('..');
}
async function choiceButton(walk, card, label, row) {
  const button = card.getByRole('button').filter({ has: walk.page.getByText(label, { exact: true }) });
  setup(await button.count() === 1, `${row.id}: exact event choice identity is not unique: ${label}`);
  const span = button.locator('span.font-bold.text-sm');
  setup(await span.count() === 1 && (await span.innerText()).trim() === label, `${row.id}: actual full choice span does not match ${label}`);
  return button;
}
async function capture(walk, row, name, target) {
  await walk.page.waitForFunction(() => !document.querySelector('[data-sonner-toast]'), undefined, { timeout: 15000 });
  await target.scrollIntoViewIfNeeded();
  const geometry = await target.evaluate(async element => {
    let previous = '', stable = 0, observation;
    for (let frame = 0; frame < 120; frame++) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const finite = element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity).length;
      const visibleTop = Math.max(0, rect.y), visibleBottom = Math.min(innerHeight, rect.bottom);
      const hit = document.elementFromPoint(Math.max(0, Math.min(innerWidth - 1, rect.x + rect.width / 2)), (visibleTop + visibleBottom) / 2);
      observation = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, viewport: [innerWidth, innerHeight],
        opacity: Number(style.opacity), finite, overflow: document.documentElement.scrollWidth > innerWidth + 1,
        painted: rect.width > 0 && visibleBottom > visibleTop && rect.right <= innerWidth + 1 && rect.x >= 0 && !!hit && element.contains(hit) };
      const signature = JSON.stringify(observation);
      stable = signature === previous ? stable + 1 : 1; previous = signature;
      if (stable >= 4 && observation.opacity >= 0.99 && finite === 0 && observation.painted && !observation.overflow) return { ...observation, stable };
    }
    return { ...observation, stable };
  });
  check(geometry.stable >= 4 && geometry.opacity >= 0.99 && geometry.finite === 0 && geometry.painted && !geometry.overflow, `${row.id}: ${name} did not settle with visible width and no overflow.`, row);
  row.layouts.push({ stage: name, ...geometry });
  const filename = `${row.id}-${name}.png`;
  const pathname = path.join(OUT, filename);
  assert(!fs.existsSync(pathname), `Refuse to overwrite original ${filename}.`);
  await walk.page.screenshot({ path: pathname });
  const image = { file: filename, bytes: fs.statSync(pathname).size, sha256: fileHash(pathname), original: true };
  report.inventory.push(image); row.shots.push(filename);
}
async function reload(walk, row, name) {
  const before = await walk.raw();
  await walk.page.reload({ waitUntil: 'domcontentloaded' });
  await walk.ready();
  const after = await walk.raw();
  row.reloads.push({ stage: name, before, after, equal: before === after, beforeSha256: sha(before ?? ''), afterSha256: sha(after ?? '') });
  check(before === after, `${row.id}: ${name} changed literal saved bytes.`, row);
}
async function runCase(base, profile, fixture, variant = 'natural') {
  const row = { id: profile.width + '-' + fixture.id + '-' + variant, fixture: fixture.id, width: profile.width, provenance: fixture.provenance,
    checks: 0, issues: [], errors: [], assetErrors: [], transport: [], diagnostics: [], shots: [], stages: [], reloads: [], layouts: [] };
  (variant === 'natural' ? report.cases : report.controls).push(row);
  let walk;
  try {
    walk = await open(base, profile, fixture, row);
    const step = fixture.steps[0], initialRaw = await walk.raw();
    check(initialRaw === JSON.stringify(fixture.initial) && sha(initialRaw ?? '') === fixture.initialSha256, row.id + ': loader changed the full legacy-caption fixture.', row);
    row.stages.push({ stage: 'loaded', raw: initialRaw, sha256: sha(initialRaw ?? '') });
    await reload(walk, row, 'pending-choice-reload');
    check(await walk.raw() === initialRaw, row.id + ': pending reload changed original legacy caption bytes.', row);
    row.stages.push({ stage: 'pending-restored', raw: await walk.raw() });
    const beforeRaw = await walk.raw(), before = JSON.parse(beforeRaw);
    setup(before.pendingEvents[0]?.id === step.eventId && before.phase === 'random_events', row.id + ': the actual top event is not playable.');
    const event = before.pendingEvents[0], card = eventCard(walk.page, event);
    await card.waitFor();
    check(await card.getByRole('button').count() === event.choices.length, row.id + ': actual choice count differs from the saved card.', row);
    const rendered = [];
    for (const [index, option] of event.choices.entries()) {
      const button = await choiceButton(walk, card, option.label, row);
      const consequence = (await button.locator('div').last().innerText()).trim();
      const current = CURRENT[event.id + ':' + index] ?? option.consequence;
      check(consequence === current, row.id + ': displayed current preview differs for ' + option.label, row);
      rendered.push({ index, label: option.label, savedConsequence: option.consequence, consequence, expectedCurrent: current });
    }
    const button = await choiceButton(walk, card, step.choiceLabel, row);
    const displayedConsequence = (await button.locator('div').last().innerText()).trim();
    check(event.choices[step.choiceIndex].label === choices[keyOf(step)].label, row.id + ': selected actual full choice identity differs.', row);
    check(event.choices[step.choiceIndex].consequence === LEGACY[keyOf(step)]
      && displayedConsequence === CURRENT[keyOf(step)] && displayedConsequence !== event.choices[step.choiceIndex].consequence,
      row.id + ': old saved words were not refreshed by the independent current preview.', row);
    check(await walk.raw() === beforeRaw, row.id + ': rendering current previews rewrote the original save.', row);
    row.stages.push({ stage: 'offered', eventId: event.id, choiceIndex: step.choiceIndex, title: event.title, choices: rendered,
      savedConsequence: event.choices[step.choiceIndex].consequence, displayedConsequence, raw: beforeRaw });
    if (variant === 'natural') await capture(walk, row, 'current-preview-after-pending-reload', card);
    if (variant === 'omit-choice') {
      row.detected = savedOutcomeIssues(before, await walk.raw(), step);
      const required = ['complete-saved-state', 'expected-state-hash', 'literal-queued-boost', 'literal-wheel',
        'last-event-id', 'single-queue-consumption', 'single-history-line'];
      check(JSON.stringify(row.detected) === JSON.stringify(required), row.id + ': omitted real hit was not rejected by the exact outcome detectors.', row);
      check(await walk.raw() === beforeRaw && await button.count() === 1
        && await eventCard(walk.page, event).getByRole('button', { includeHidden: true })
          .filter({ has: walk.page.locator('span.font-bold.text-sm') }).count() === event.choices.length,
        row.id + ': omitted click failed to retain all real choices and original saved bytes.', row);
      await capture(walk, row, 'detected-omission', card);
      return;
    }
    await walk.page.evaluate(values => {
      window.__rewardsOriginalRandom = Math.random;
      window.__rewardsResolverDraws = [];
      Math.random = () => {
        const ordinal = window.__rewardsResolverDraws.length + 1, value = values[ordinal - 1];
        window.__rewardsResolverDraws.push({ ordinal, value: ordinal <= values.length ? value : null,
          stack: new Error('Observed recorded resolver input').stack, extra: ordinal > values.length });
        if (ordinal > values.length) throw new Error('Unlisted resolver draw ' + ordinal);
        return value;
      };
    }, step.resolve.draws);
    await walk.activate(button);
    await walk.page.waitForFunction(({ key, id, count }) => {
      const saved = JSON.parse(localStorage.getItem(key));
      return saved?.lastEventId === id && saved.pendingEvents.length === count;
    }, { key: KEY, id: step.eventId, count: before.pendingEvents.length - 1 });
    const afterRaw = await walk.raw();
    const observedDraws = await walk.page.evaluate(() => {
      Math.random = window.__rewardsOriginalRandom;
      return window.__rewardsResolverDraws;
    });
    check(JSON.stringify(observedDraws.map(draw => draw.value)) === JSON.stringify(step.resolve.draws)
      && observedDraws.length === step.resolve.drawCount
      && observedDraws.every((draw, i) => !draw.extra && draw.ordinal === i + 1 && typeof draw.stack === 'string' && draw.stack.length > 0),
      row.id + ': actual complete resolver draw vector differs or contains an unlisted draw.', row);
    const findings = savedOutcomeIssues(before, afterRaw, step);
    row.stages.push({ stage: 'answered', eventId: step.eventId, choiceIndex: step.choiceIndex, choiceLabel: step.choiceLabel,
      input: step.resolve, observedDraws, rawBefore: beforeRaw, rawAfter: afterRaw, expectedSha256: step.expectedSha256,
      actualSha256: sha(afterRaw), findings });
    check(findings.length === 0, row.id + ': full saved answer differs: ' + findings.join(', '), row);
    check(await eventCard(walk.page, event).getByRole('button', { includeHidden: true })
      .filter({ has: walk.page.locator('span.font-bold.text-sm') }).count() === 0, row.id + ': consumed old choice remains actionable.', row);
    if (variant === 'delete-save') {
      const removed = await walk.page.evaluate(key => { const raw = localStorage.getItem(key); localStorage.removeItem(key); return { raw, after: localStorage.getItem(key) }; }, KEY);
      check(removed.raw === afterRaw && removed.after === null, row.id + ': control did not delete the actual saved hit.', row);
      await walk.page.reload({ waitUntil: 'domcontentloaded' });
      await walk.page.getByRole('button', { name: 'How to play', exact: true }).waitFor();
      const lostRaw = await walk.raw();
      row.detected = savedOutcomeIssues(before, lostRaw, step);
      check(JSON.stringify(row.detected) === JSON.stringify(['saved-career-missing']), row.id + ': deleted hit did not fail its exact restoration detector.', row);
      check(await eventCard(walk.page, event).count() === 0 && await walk.page.locator('[data-career-chance-wheel]').count() === 0,
        row.id + ': deleted saved choice or wheel survived reload.', row);
      const creation = walk.page.getByRole('heading', { name: 'Create Your Player', exact: true }).locator('..');
      await creation.waitFor();
      row.stages.push({ stage: 'deleted-save-reload', removedRaw: removed.raw, rawAfter: lostRaw });
      await capture(walk, row, 'detected-deletion', creation);
      return;
    }
    await reload(walk, row, 'answered-choice-reload');
    check(await walk.raw() === afterRaw, row.id + ': restored answer changed original bytes.', row);
    check(await eventCard(walk.page, event).getByRole('button', { includeHidden: true })
      .filter({ has: walk.page.locator('span.font-bold.text-sm') }).count() === 0, row.id + ': reload re-offered the consumed choice.', row);
    const restoredFindings = savedOutcomeIssues(before, await walk.raw(), step);
    check(restoredFindings.length === 0, row.id + ': restored full effects differ: ' + restoredFindings.join(', '), row);
    if (wheels[step.eventId]) {
      const dialog = walk.page.locator('[data-career-chance-wheel]'), receipt = JSON.parse(afterRaw).chanceWheel;
      await dialog.waitFor();
      check((await dialog.getByRole('heading').innerText()).trim() === wheels[step.eventId].title, row.id + ': actual saved wheel title differs.', row);
      const wheelBefore = await walk.raw(), expectedResult = receipt.result ? receipt.hit : receipt.miss;
      await walk.page.evaluate(() => {
        window.__rewardsWheelRandom = Math.random; window.__rewardsWheelDraws = [];
        Math.random = () => { const value = window.__rewardsWheelRandom();
          window.__rewardsWheelDraws.push({ value, stack: new Error('Observed wheel input').stack }); return value; };
      });
      await walk.activate(dialog.locator('[data-wheel-skip]'));
      await walk.page.waitForFunction(expected => document.querySelector('[data-wheel-result]')?.textContent.trim() === expected, expectedResult);
      const result = (await dialog.locator('[data-wheel-result]').innerText()).trim();
      check(result === expectedResult && await walk.raw() === wheelBefore, row.id + ': revealing the real wheel changed or misreported its saved roll.', row);
      await capture(walk, row, 'saved-wheel-result-after-reload', dialog);
      await walk.activate(dialog.locator('[data-wheel-continue]'));
      await walk.page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.chanceWheel?.seen === true, KEY);
      const postRaw = await walk.raw();
      const wheelDraws = await walk.page.evaluate(() => { Math.random = window.__rewardsWheelRandom; return window.__rewardsWheelDraws; });
      const acknowledgedFindings = savedOutcomeIssues(before, postRaw, step, true);
      check(wheelDraws.length === 0, row.id + ': real reveal or acknowledgement drew again.', row);
      check(acknowledgedFindings.length === 0, row.id + ': acknowledgement changed more than seen: ' + acknowledgedFindings.join(', '), row);
      row.stages.push({ stage: 'wheel-acknowledged', rawBefore: wheelBefore, rawAfter: postRaw, result, wheelDraws,
        expectedSha256: step.postWheelExpectedSha256, actualSha256: sha(postRaw), findings: acknowledgedFindings });
      await reload(walk, row, 'acknowledged-wheel-reload');
      check(await walk.raw() === postRaw && await dialog.count() === 0, row.id + ': acknowledged wheel replayed or lost literal bytes.', row);
    }
    const final = await walk.saved();
    const target = final.pendingEvents.length && final.phase === 'random_events' ? eventCard(walk.page, final.pendingEvents[0]) : walk.page.locator('#dukb-main');
    if (!wheels[step.eventId]) await capture(walk, row, 'saved-continuation-after-reload', target);
    await target.waitFor();
    check(await target.getByRole('button').count() > 0, row.id + ': no legal continuation action remains.', row);
    const finalRaw = await walk.raw();
    await reload(walk, row, 'once-second-reload');
    check(await walk.raw() === finalRaw, row.id + ': another reload repeated a saved effect.', row);
    check(await eventCard(walk.page, event).getByRole('button', { includeHidden: true })
      .filter({ has: walk.page.locator('span.font-bold.text-sm') }).count() === 0, row.id + ': second reload re-offered the consumed choice.', row);
    if (wheels[step.eventId]) check(await walk.page.locator('[data-career-chance-wheel]').count() === 0, row.id + ': second reload replayed an acknowledged wheel.', row);
    row.stages.push({ stage: 'once-second-reload', raw: await walk.raw() });
  } catch (error) {
    report.failures++; row.issues.push(String(error?.stack ?? error)); report.issues.push(row.id + ': ' + String(error));
  } finally {
    check(row.errors.length === 0, row.id + ': unexpected app errors: ' + row.errors.join(' | '), row);
    check(row.assetErrors.length === 0, row.id + ': owned asset or declared font errors: ' + row.assetErrors.join(' | '), row);
    check(row.diagnostics.every(diagnostic => row.transport.some(request => request.action === 'abort' && request.url === diagnostic.url)),
      row.id + ': resource diagnostic lacks an exact aborted URL.', row);
    check(row.transport.filter(request => request.method === 'POST').length === 0, row.id + ': selected nonterminal play attempted a backend POST.', row);
    if (walk) await walk.context.close();
    write();
  }
}
try {
  sourceBefore = SOURCE_FILES.map(file => ({ file, sha256: fileHash(path.join(ROOT, file)), bytes: fs.statSync(path.join(ROOT, file)).size }));
  report.sourceHashes = sourceBefore;
  setup(fs.existsSync(FIXTURE), 'Qualified normal proof must emit browser-fixtures.json first.');
  fixtureHash = fileHash(FIXTURE);
  const fixtures = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  report.fixtureReceipt = { file: path.relative(ARTIFACTS, FIXTURE), bytes: fs.statSync(FIXTURE).size, sha256: fixtureHash, source: fixtures.source };
  setup(fixtures.schemaVersion === 1 && fixtures.saveKey === KEY && fixtures.scenarios?.length === 10,
    'Exactly ten source-bound stat-reward scenarios with the real saved-career key are required.');
  now = Date.parse(fixtures.clock);
  setup(Number.isFinite(now), 'The producer must retain its disclosed clock.');
  report.clock = fixtures.clock;
  const bindings = { engineSha256: 'src/lib/soccerCareerEngine.ts', lifeSha256: 'src/lib/soccerCareerLife.ts',
    routineSha256: 'src/lib/soccerCareerRoutineEvents.ts', contractsSha256: 'src/lib/soccerCareerContracts.ts',
    consequencesSha256: 'src/lib/soccerCareerLifeConsequences.ts', testSha256: 'src/test/soccerCareerStatRewards.test.ts',
    simSha256: 'scripts/simSoccerCareerStatRewards.mjs', momentsSha256: 'src/components/soccer-career/careerMoments.ts',
    sharedMomentsSha256: 'src/components/career-moments/useCareerMoment.ts', saveSha256: 'src/lib/soccerCareerSave.ts',
    chanceWheelSha256: 'src/lib/careerChanceWheel.ts' };
  setup(fixtures.source?.head === report.sourceHead && fixtures.source.parentAppRef === PARENT,
    'Producer HEAD or the held parentEE differs from this browser proof.');
  for (const [field, file] of Object.entries(bindings)) setup(fixtures.source[field] === fileHash(path.join(ROOT, file)), field + ': fixture does not bind actual source.');
  const parentLife = execFileSync('git', ['show', PARENT + ':src/lib/soccerCareerLife.ts'], { cwd: ROOT });
  setup(fixtures.source.parentLifeSha256 === sha(parentLife), 'The actual held parent Life source hash differs.');
  for (const [field, digest, relative] of [
    ['parentLifeSourcePath', 'parentLifeSha256', 'fixed/soccerCareerLife.parent.ts'],
    ['parentLifeCompiledPath', 'parentLifeCompiledSha256', 'fixed/parent-life.mjs']]) {
    setup(fixtures.source[field] === relative, field + ': the retained normal proof location differs.');
    const filename = path.join(ARTIFACTS, relative);
    setup(fileHash(filename) === fixtures.source[digest], relative + ': retained parent bytes differ.');
    parentFiles.push({ file: relative, filename, bytes: fs.statSync(filename).size, sha256: fileHash(filename) });
  }
  report.parentReceipts = parentFiles.map(({ filename, ...receipt }) => receipt);
  setup(new Set(fixtures.scenarios.map(fixture => fixture.id)).size === 10
    && JSON.stringify(fixtures.scenarios.map(fixture => fixture.id).sort()) === JSON.stringify([...SCENARIOS].sort()),
    'Scenario IDs must cover both218 results and all eight other corrected preview actions.');
  for (const fixture of fixtures.scenarios) {
    const step = fixture.steps?.[0], provenance = fixture.provenance, pair = step && keyOf(step);
    setup(choices[pair] && CURRENT[pair] && fixture.steps.length === 1, fixture.id + ': an unowned choice or extra step was supplied.');
    setup(fixture.id === (step.eventId === 218 ? (step.resolve?.draws.at(-1) === 0.1 ? '218-hit' : '218-miss')
      : step.eventId + '-choice' + step.choiceIndex), fixture.id + ': scenario identity differs from its selected action.');
    setup(provenance?.kind === 'actual-picker-legacy-caption-overlay' && Array.isArray(provenance.preparedFields)
      && provenance.preparedFields.length > 0, fixture.id + ': actual picker and legacy-overlay disclosure are required.');
    setup(fixture.initial.phase === 'random_events' && !fixture.initial.retired
      && fixture.initial.pendingEvents[0]?.id === step.eventId && fixture.initial.pendingEvents.length >= 2,
      fixture.id + ': actual delivered nonterminal top event is not playable.');
    setup(stateHash(fixture.initial) === fixture.initialSha256
      && stateHash(provenance.actualPickerBatch) === provenance.actualPickerBatchSha256, fixture.id + ': full initial or picker hash differs.');
    setup(provenance.actualPickerBatch.pendingEvents[0].choices[step.choiceIndex].consequence === CURRENT[pair],
      fixture.id + ': actual current picker did not supply the independent new caption.');
    const overlay = provenance.legacyCaption, expectedPath = 'pendingEvents[0].choices[' + step.choiceIndex + '].consequence';
    setup(overlay?.eventId === step.eventId && overlay.choiceIndex === step.choiceIndex && overlay.path === expectedPath
      && overlay.savedConsequence === LEGACY[pair] && overlay.parentLifeSha256 === fixtures.source.parentLifeSha256
      && overlay.parentLifeCompiledSha256 === fixtures.source.parentLifeCompiledSha256,
      fixture.id + ': the selected legacy caption is not bound to its actual held parent.');
    const overlaid = JSON.parse(JSON.stringify(provenance.actualPickerBatch));
    overlaid.pendingEvents[0].choices[step.choiceIndex].consequence = LEGACY[pair];
    setup(JSON.stringify(overlaid) === JSON.stringify(fixture.initial), fixture.id + ': something beyond the selected caption changed the actual picker batch.');
    setup(fixture.initial.pendingEvents.filter(event => event.id === step.eventId).length === 1
      && fixture.initial.eventLastFired?.[String(step.eventId)] === fixture.initial.seasons.at(-1).year,
      fixture.id + ': picker did not deliver and stamp this offer once.');
    const selected = fixture.initial.pendingEvents[0].choices[step.choiceIndex];
    setup(selected.label === choices[pair].label && typeof selected.apply === 'undefined' && step.choiceLabel === choices[pair].label
      && step.currentConsequence === CURRENT[pair], fixture.id + ': actual serialized full choice or current preview identity differs.');
    const personality = { 211: 'showman', 213: 'iceman', 214: 'hothead', 215: 'hothead', 217: 'professor', 218: 'enigma', 219: 'enigma' }[step.eventId];
    setup(step.eventId === 205 ? fixture.initial.agentId === 'cousin' : fixture.initial.personality === personality,
      fixture.id + ': the actual prerequisite profile is invalid.');
    setup(!fixture.initial.chanceWheel || fixture.initial.chanceWheel.seen === true, fixture.id + ': unrelated unseen wheel would block this choice.');
    const wheel = wheels[step.eventId], expectedRoll = fixture.id === '218-miss' ? 0.99 : 0.1;
    setup(step.reloadAfter === true && step.resolve?.mode === 'vector' && Number.isInteger(step.resolve.drawCount)
      && step.resolve.drawCount > 0 && Array.isArray(step.resolve.draws) && step.resolve.draws.length === step.resolve.drawCount
      && step.resolve.draws.every((value, index) => Number.isFinite(value) && value >= 0 && value < 1
        && value === (wheel && index === step.resolve.drawCount - 1 ? expectedRoll : 0.99)),
      fixture.id + ': exact rejecting catalog vector and original outcome roll are required.');
    setup(stateHash(step.expected) === step.expectedSha256 && literalIssues(fixture.initial, step.expected, step).length === 0,
      fixture.id + ': independent literal effects do not guard the expected complete save.');
    if (wheel) {
      const onlySeen = JSON.parse(JSON.stringify(step.expected)); onlySeen.chanceWheel.seen = true;
      setup(stateHash(step.postWheelExpected) === step.postWheelExpectedSha256
        && JSON.stringify(step.postWheelExpected) === JSON.stringify(onlySeen)
        && literalIssues(fixture.initial, step.postWheelExpected, step, true).length === 0
        && JSON.stringify(step.acknowledgementDraws) === JSON.stringify([]),
        fixture.id + ': actual acknowledgement must change only seen and consume no draws.');
    } else setup(step.postWheelExpected === undefined && step.acknowledgementDraws === undefined,
      fixture.id + ': no wheel or acknowledgement may be invented for this choice.');
  }
  const installedRows = JSON.parse(fs.readFileSync(path.join(ARTIFACTS, 'installed.json'), 'utf8'));
  setup(installedRows.length === 521, 'Exactly 521 previously bound locked installed versions are required.');
  installedBefore = installedRows.map(row => {
    setup(row.path.startsWith('node_modules/') && !row.path.split('/').includes('..'), 'Installed dependency path escapes the checkout.');
    const filename = path.join(ROOT, row.path, 'package.json');
    setup(JSON.parse(fs.readFileSync(filename, 'utf8')).version === row.version, `${row.path}: installed locked version changed.`);
    return { ...row, sha256: fileHash(filename) };
  });
  report.installed = installedBefore;
  toolsBefore = ['esbuild', 'playwright', 'playwright-core'].map(name => { const filename = require.resolve(`${name}/package.json`); return { name, file: filename, version: JSON.parse(fs.readFileSync(filename, 'utf8')).version, sha256: fileHash(filename) }; });
  report.tools = toolsBefore;
  cache = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(ROOT, 'free-kick-lab-artifacts/font-cache'));
  const manifestFile = path.join(cache, 'manifest.json');
  fontHash = fileHash(manifestFile);
  report.fonts = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  fonts = new Map(report.fonts.map(entry => {
    setup(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin) && /^[a-f0-9]{64}$/.test(entry.file), 'Font dependency must come from its retained declared manifest.');
    const filename = path.join(cache, entry.file);
    setup(fileHash(filename) === entry.sha256, `Retained font bytes differ: ${entry.url}`);
    return [entry.url, { body: fs.readFileSync(filename), contentType: entry.contentType }];
  }));
  distBefore = listFiles(path.join(ROOT, 'dist'));
  report.dist = distBefore;
  const base = await serve();
  browser = await pw.chromium.launch({ headless: true });
  for (const fixture of fixtures.scenarios) await runCase(base, PROFILES[1], fixture);
  for (const profile of [PROFILES[0], PROFILES[2]]) for (const id of ['218-hit', '218-miss'])
    await runCase(base, profile, fixtures.scenarios.find(fixture => fixture.id === id));
  const controlFixture = fixtures.scenarios.find(fixture => fixture.id === '218-hit');
  await runCase(base, PROFILES[1], controlFixture, 'omit-choice');
  await runCase(base, PROFILES[1], controlFixture, 'delete-save');
  check(report.cases.length === 14 && report.controls.length === 2 && report.inventory.length === 30,
    'Final counts differ from fourteen natural journeys, two effective controls and thirty original PNGs.');
  check(report.cases.every(row => row.stages.filter(stage => stage.stage === 'answered').length === 1
    && row.reloads.length === (wheels[fixtures.scenarios.find(fixture => fixture.id === row.fixture).steps[0].eventId] ? 4 : 3)
    && row.shots.length === 2), 'Every natural journey needs one actual answer, literal pending/answered/once reloads and two originals.');
  check(report.cases.reduce((sum, row) => sum + row.reloads.length, 0) === 49, 'Exactly forty-nine literal natural reloads are required.');
  check(report.cases.reduce((sum, row) => sum + row.stages.filter(stage => stage.stage === 'wheel-acknowledged').length, 0) === 7,
    'Exactly seven actual saved-wheel acknowledgements are required.');
  const previews = new Set(report.cases.flatMap(row => row.stages.filter(stage => stage.stage === 'offered')
    .flatMap(stage => stage.choices.filter(choice => CURRENT[stage.eventId + ':' + choice.index]).map(choice => stage.eventId + ':' + choice.index))));
  check(previews.size === 9, 'All nine independently declared current previews must render from old serialized captions.');
  check(new Set(report.inventory.map(image => image.file)).size === 30, 'Every original capture needs a distinct filename.');
  for (const image of report.inventory) check(fileHash(path.join(OUT, image.file)) === image.sha256
    && fs.statSync(path.join(OUT, image.file)).size === image.bytes, 'Original capture changed: ' + image.file);
} catch (error) {
  report.issues.push(String(error?.stack ?? error));
  if (!report.setupFailures) report.failures++;
} finally {
  if (browser) await browser.close();
  if (server) server.kill();
  report.sourceHeld = sourceBefore.length > 0 && sourceBefore.every(source => fileHash(path.join(ROOT, source.file)) === source.sha256);
  report.toolsHeld = toolsBefore.length === 3 && toolsBefore.every(tool => fileHash(tool.file) === tool.sha256);
  report.installedHeld = installedBefore.length === 521 && installedBefore.every(row => fileHash(path.join(ROOT, row.path, 'package.json')) === row.sha256);
  report.parentHeld = parentFiles.length === 2 && parentFiles.every(file => fileHash(file.filename) === file.sha256);
  report.fixturesHeld = !!fixtureHash && fileHash(FIXTURE) === fixtureHash;
  report.distHeld = distBefore.length > 0 && JSON.stringify(listFiles(path.join(ROOT, 'dist'))) === JSON.stringify(distBefore);
  report.fontsHeld = !!fontHash && fileHash(path.join(cache, 'manifest.json')) === fontHash && report.fonts.every(entry => fileHash(path.join(cache, entry.file)) === entry.sha256);
  for (const name of ['sourceHeld', 'toolsHeld', 'installedHeld', 'fixturesHeld', 'distHeld', 'fontsHeld', 'parentHeld']) check(report[name], `${name}: proof inputs changed or were never qualified.`);
  report.summary = { natural: report.cases.length, controls: report.controls.length, checks: report.checks, originals: report.inventory.length,
    answeredSteps: report.cases.reduce((sum, row) => sum + row.stages.filter(stage => stage.stage === 'answered').length, 0),
    reloads: report.cases.reduce((sum, row) => sum + row.reloads.length, 0),
    externalAborts: [...report.cases, ...report.controls].reduce((sum, row) => sum + row.transport.filter(request => request.action === 'abort').length, 0),
    retainedFonts: [...report.cases, ...report.controls].reduce((sum, row) => sum + row.transport.filter(request => request.action === 'retained-font').length, 0),
    expectedDiagnostics: [...report.cases, ...report.controls].reduce((sum, row) => sum + row.diagnostics.length, 0),
    failures: report.failures, setupFailures: report.setupFailures, installedVersions: installedBefore.length,
    caseChecks: report.cases.reduce((sum, row) => sum + row.checks, 0),
    controlChecks: report.controls.reduce((sum, row) => sum + row.checks, 0),
    actualPickerOverlays: report.cases.filter(row => row.provenance.kind === 'actual-picker-legacy-caption-overlay').length,
    acknowledgedWheels: report.cases.reduce((sum, row) => sum + row.stages.filter(stage => stage.stage === 'wheel-acknowledged').length, 0),
    uniqueScenarios: new Set(report.cases.map(row => row.fixture)).size,
    uniquePlayedChoices: new Set(report.cases.flatMap(row => row.stages.filter(stage => stage.stage === 'answered').map(keyOf))).size };
  report.status = report.failures || report.setupFailures ? 'failed' : 'passed';
  write();
  console.log(`Soccer stat-rewards browser: ${report.status}; ${report.checks} checks, ${report.cases.length} natural cases, ${report.controls.length} controls, ${report.inventory.length} originals, ${report.failures} failures, ${report.setupFailures} setup failures.`);
  process.exitCode = report.status === 'passed' ? 0 : 1;
}
