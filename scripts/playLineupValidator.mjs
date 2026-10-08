/**
 * Round 1138 browser harness: Build Your XI's validator branch on the real
 * page, at 390 and 1280.
 *
 * WHY A WALK. scripts/simLineupValidatorClient.mjs proves the hook: every way
 * the validator call can fail leaves one pick uncounted. It cannot see the
 * page, and "the search box is still there" is a fact about
 * src/pages/LineupBuilder.tsx, which hides the box while the hook's
 * checkingDown flag is true. So the box is looked at here, in a real browser.
 *
 * NOTHING REACHES THE DATABASE. Every request that is not to this harness's
 * own local server is aborted, and the few answers the page needs are stubs.
 * Every player named here is a fixture no real name can match.
 *
 * SCENARIOS, each at both widths unless noted. The pick is always one fixture
 * name chosen from the list. In S1 to S5 its row sits at a club that is no
 * slot's club, so the pick must go to the validator whatever team was dealt.
 *   S1 allowance  the validator says its day allowance is spent. One request;
 *                 the box still there, enabled and inside the viewport; the
 *                 page names the allowance and never says the lineup is
 *                 saved; the pitch still reads 0 of 11. Then the validator
 *                 turns valid and the same pick is made again: 1 of 11. One
 *                 pick was blocked, the next one counted: the wall is gone.
 *   S2 HTTP 500, S3 a 200 that is not JSON, S4 {"valid":"true"}
 *                 nothing filled, the box enabled, a retry line, and never
 *                 "hasn't played for" (that line is for a real refusal).
 *   S5 a hang     (390 only: it takes the real VALIDATOR_WAIT_MS, read from
 *                 src/lib/validatorClient.ts) the validator never answers:
 *                 "took too long" on screen, the box enabled, nothing filled,
 *                 and the page itself gave up on the request.
 *   S6 our own record  on a club slot (the team is rerolled once, then until the search
 *                 carries a club filter) the row sits at the slot's club and
 *                 its position fits the slot: the slot is filled, under the
 *                 spelling the row stores, with ZERO requests to the validator.
 *
 * CONTROL
 *   PLAY_LINEUP_CONTROL=accept-on-error node scripts/playLineupValidator.mjs
 *       an init script wraps fetch and turns S1's "allowance spent" answer
 *       into {"valid":true} before the hook sees it: the July 2026 defect,
 *       planted. Exits 0 only when the wrapper fired, the slot was filled,
 *       AND S1's "nothing filled" assertion caught it.
 *
 * Run after npm run build (or LINEUP_DIST=<a build>). Chromium only.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.PLAY_LINEUP_CONTROL || '';
if (CONTROL && CONTROL !== 'accept-on-error') {
  console.error(`PLAY_LINEUP_CONTROL=${CONTROL} is not a control this harness knows (accept-on-error)`);
  process.exit(1);
}
const distDir = path.resolve(ROOT, process.env.LINEUP_DIST || 'dist');
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error(`playLineupValidator: no build at ${distDir}. Run npm run build first, or set LINEUP_DIST.`);
  process.exit(1);
}

const clientTs = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const SUPA_HOST = new URL(clientTs.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1]).host;
const waitSource = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'validatorClient.ts'), 'utf8').match(/VALIDATOR_WAIT_MS\s*=\s*(\d+)/);
if (!waitSource) {
  console.error('playLineupValidator: could not read VALIDATOR_WAIT_MS from src/lib/validatorClient.ts');
  process.exit(1);
}
const WAIT_MS = Number(waitSource[1]);
const PORT = 4239;
const BASE = `http://127.0.0.1:${PORT}`;
const VIEWPORTS = {
  390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  1280: { viewport: { width: 1280, height: 800 } },
};

/* A name no real player can match. The row stores a lower case particle, the
   list shows it capitalised, and S6 requires the pitch to print it as stored. */
const PICK = { text: 'qzxpick', stored: 'Qzxpick van Fixture', listed: /Qzxpick Van Fixture/ };
const ELSEWHERE = 'Fixture Rovers';
const BOX = 'input[role="combobox"]';
const VALIDATOR_PATH = '/functions/v1/validate-player';

let failures = 0;
function check(ok, message) {
  console.log(`${ok ? '  PASS  ' : '  FAIL  '}${message}`);
  if (!ok) failures += 1;
  return ok;
}

/* What the validator stub answers, by mode. `hang` never answers at all. */
const VALIDATOR_REPLIES = {
  exhausted: { status: 200, contentType: 'application/json', body: JSON.stringify({ valid: false, unverified: true, exhausted: true, reason: 'Answer checking has used up its free allowance for today.' }) },
  valid: { status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true }) },
  http500: { status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'boom', valid: true }) },
  notjson: { status: 200, contentType: 'text/html', body: '<html><body>Bad gateway</body></html>' },
  stringtrue: { status: 200, contentType: 'application/json', body: '{"valid":"true"}' },
};

/** The slot's stored club names, read off the search request's own `club=in.(...)` filter. */
function clubFilter(url) {
  const raw = new URL(url).searchParams.get('club');
  const inside = raw && raw.match(/^in\.\((.*)\)$/);
  if (!inside) return null;
  return inside[1].split(',').map(name => name.trim().replace(/^"|"$/g, '')).filter(Boolean);
}

async function openGame(browser, width, pageErrors) {
  const stub = { mode: 'valid', atSlotClub: false, validatorRequests: 0, validatorGivenUp: 0, searches: 0, lastClubFilter: null, lastWasNation: false };
  const context = await browser.newContext(VIEWPORTS[width]);
  await context.addInitScript(() => {
    try {
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('lineup-rules-seen', '1');
    } catch { /* ignored */ }
  });
  if (CONTROL === 'accept-on-error') {
    await context.addInitScript(validatorPath => {
      const realFetch = window.fetch.bind(window);
      window.__LINEUP_CONTROL_FIRED__ = false;
      window.fetch = async (...args) => {
        const response = await realFetch(...args);
        const requestUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url;
        if (!requestUrl?.includes(validatorPath)) return response;
        const body = await response.clone().json().catch(() => null);
        if (body && body.exhausted === true) {
          window.__LINEUP_CONTROL_FIRED__ = true;
          return new Response(JSON.stringify({ valid: true }), { status: 200, headers: { 'content-type': 'application/json' } });
        }
        return response;
      };
    }, VALIDATOR_PATH);
  }
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(`at ${width}: ${error.message}`));
  page.on('requestfailed', request => { if (request.url().includes(VALIDATOR_PATH) && request.method() === 'POST') stub.validatorGivenUp += 1; });
  /* Playwright checks route handlers in reverse registration order, so the
     offline fence goes first and the stubs below win. Anything that is not
     this harness's own server is refused. */
  await page.route('**/*', route => (route.request().url().startsWith(BASE) ? route.continue() : route.abort()));
  await page.route(`**${SUPA_HOST}/rest/v1/national_team_squads**`, route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }).catch(() => {}));
  await page.route(`**${SUPA_HOST}/rest/v1/player_verified_positions**`, route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }).catch(() => {}));
  await page.route(`**${SUPA_HOST}/rest/v1/player_market_values**`, async route => {
    stub.searches += 1;
    const url = route.request().url();
    const clubs = clubFilter(url);
    stub.lastClubFilter = clubs;
    stub.lastWasNation = new URL(url).searchParams.has('nationality');
    const row = {
      player_name: PICK.stored, name_folded: PICK.stored.toLowerCase(), market_value_usd: 1000000, year: 2026,
      club: stub.atSlotClub && clubs ? clubs[0] : ELSEWHERE, nationality: 'Fixtureland', position: 'Centre-Back', age: 27,
    };
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/1' }, body: JSON.stringify([row]) }).catch(() => {});
  });
  await page.route(`**${SUPA_HOST}${VALIDATOR_PATH}`, async route => {
    if (route.request().method() !== 'POST') return route.fulfill({ status: 204, body: '' }).catch(() => {});
    stub.validatorRequests += 1;
    if (stub.mode === 'hang') return undefined; // never answered: the page has to give up on it
    return route.fulfill(VALIDATOR_REPLIES[stub.mode]).catch(() => {});
  });
  await page.goto(`${BASE}/build-your-xi`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    .catch(() => page.goto(`${BASE}/build-your-xi`, { waitUntil: 'domcontentloaded', timeout: 30000 }));
  await page.getByRole('button', { name: /^4-3-3/ }).first().click({ timeout: 30000 });
  await openSlot(page);
  return { context, page, stub };
}

/** Waits for the team wheel to settle, then taps the first open centre back slot. The fixture row is a centre back. */
async function openSlot(page) {
  await page.getByText('Select a position on the pitch').waitFor({ timeout: 30000 });
  await page.locator('button:not([disabled])', { hasText: /^CB$/ }).first().click();
  await page.locator(BOX).first().waitFor({ timeout: 30000 });
}

/** Types the fixture's name and picks it from the list with a real tap or click. */
async function pickFromList(page, width) {
  const box = page.locator(BOX).first();
  await box.fill(PICK.text);
  const option = page.locator('[role="option"]', { hasText: PICK.listed }).first();
  await option.waitFor({ timeout: 15000 });
  if (width === 390) await option.tap(); else await option.click();
}

const filledCount = async page => Number((await page.locator('span', { hasText: /^\d+\/11$/ }).first().innerText()).split('/')[0]);

/** The box as the player has it: there, enabled, and inside the viewport. */
function boxState(page) {
  return page.evaluate(sel => {
    const box = document.querySelector(sel);
    if (!box) return { there: false, enabled: false, inView: false };
    const r = box.getBoundingClientRect();
    return {
      there: true,
      enabled: !box.disabled,
      inView: r.width > 0 && r.height > 0 && r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth,
    };
  }, BOX);
}

const control = { fired: false, accepted: false, caught: false };

/** S1: an allowance answer blocks only that pick. */
async function allowance(browser, width, pageErrors) {
  console.log(`\nS1 at ${width}: the validator says its day allowance is spent`);
  const { context, page, stub } = await openGame(browser, width, pageErrors);
  stub.mode = 'exhausted';
  await pickFromList(page, width);
  /* Either the line shows (the pick was not counted) or, under the control, the slot fills. */
  await Promise.race([
    page.getByText(/allowance for today/).first().waitFor({ timeout: 15000 }),
    page.locator('span', { hasText: /^1\/11$/ }).first().waitFor({ timeout: 15000 }),
  ]).catch(() => {});
  await page.waitForTimeout(200);
  const filledAfterRefusal = await filledCount(page);
  const nothingFilled = check(filledAfterRefusal === 0, `the pitch still reads 0 of 11 (${filledAfterRefusal})`);
  if (CONTROL === 'accept-on-error') {
    control.fired = await page.evaluate(() => window.__LINEUP_CONTROL_FIRED__ === true);
    control.accepted = filledAfterRefusal === 1;
    control.caught = !nothingFilled;
    await context.close();
    return;
  }
  check(stub.validatorRequests === 1, `exactly one request went to the validator (${stub.validatorRequests})`);
  const box = await boxState(page);
  check(box.there && box.enabled, `the search box is still there and enabled (there ${box.there}, enabled ${box.enabled})`);
  check(box.inView, 'the search box is inside the viewport');
  const text = await page.locator('body').innerText();
  check(/allowance for today/.test(text), 'the page names the allowance');
  check(/not counted/.test(text), 'the page says the pick was not counted');
  check(!/lineup is saved/i.test(text), 'the page never says the lineup is saved');
  check(!/hasn't played/.test(text), 'an answer that was never judged is not called a refusal');
  // The validator comes back: the same pick, made again, counts.
  stub.mode = 'valid';
  await pickFromList(page, width);
  await page.locator('span', { hasText: /^1\/11$/ }).first().waitFor({ timeout: 15000 }).catch(() => {});
  const filledAfterRetry = await filledCount(page);
  check(filledAfterRetry === 1, `the next pick counted: 1 of 11 (${filledAfterRetry})`);
  check(stub.validatorRequests === 2, `the second pick was asked again, the wall is gone (${stub.validatorRequests} requests)`);
  await context.close();
}

/** S2 to S4: an answer that is no verdict leaves the pick uncounted and the box live. */
async function noVerdict(browser, width, pageErrors, label, mode) {
  console.log(`\n${label} at ${width}`);
  const { context, page, stub } = await openGame(browser, width, pageErrors);
  stub.mode = mode;
  await pickFromList(page, width);
  const lineShown = await page.getByText(/Couldn't verify that answer/).first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  check(lineShown, 'the page says the answer could not be verified and invites a retry');
  check(stub.validatorRequests === 1, `exactly one request went to the validator (${stub.validatorRequests})`);
  const filled = await filledCount(page);
  check(filled === 0, `nothing was filled (${filled} of 11)`);
  const box = await boxState(page);
  check(box.there && box.enabled, `the search box is still there and enabled (there ${box.there}, enabled ${box.enabled})`);
  const text = await page.locator('body').innerText();
  check(!/hasn't played/.test(text), 'an answer that was never judged is not called a refusal');
  check(!/lineup is saved/i.test(text), 'the page never says the lineup is saved');
  await context.close();
}

/** S5: a validator that never answers is given up on after the real wait. */
async function hang(browser, width, pageErrors) {
  console.log(`\nS5 at ${width}: the validator never answers (this takes the real ${WAIT_MS} ms wait)`);
  const { context, page, stub } = await openGame(browser, width, pageErrors);
  stub.mode = 'hang';
  await pickFromList(page, width);
  await page.waitForTimeout(1500);
  const during = await boxState(page);
  check(during.there && !during.enabled, `while the check runs the box is there and busy (there ${during.there}, enabled ${during.enabled})`);
  const early = await page.getByText(/took too long/).count();
  check(early === 0, 'the page does not give up before the wait is over');
  const lineShown = await page.getByText(/took too long/).first().waitFor({ timeout: WAIT_MS + 5000 }).then(() => true).catch(() => false);
  check(lineShown, 'after the wait the page says the check took too long');
  await page.waitForTimeout(300);
  check(stub.validatorRequests === 1, `exactly one request went to the validator (${stub.validatorRequests})`);
  check(stub.validatorGivenUp >= 1, `the page itself gave up on the request (${stub.validatorGivenUp} seen as failed)`);
  const filled = await filledCount(page);
  check(filled === 0, `nothing was filled (${filled} of 11)`);
  const box = await boxState(page);
  check(box.there && box.enabled, `the search box is live again (there ${box.there}, enabled ${box.enabled})`);
  await context.close();
}

/** S6: a club pick whose own row sits at the slot's club asks nobody. */
async function ownRecord(browser, width, pageErrors) {
  console.log(`\nS6 at ${width}: a club pick our own row settles`);
  const { context, page, stub } = await openGame(browser, width, pageErrors);
  stub.mode = 'exhausted'; // if the validator were asked, the pick could not land
  stub.atSlotClub = true;
  /* The team is rerolled once before anything is typed, club or not, so the
     reroll route (the button, the wheel, the slot, the box again) is walked on
     every run and not only on the day a nation happens to be dealt first. */
  await page.getByTitle('Reroll: get a different team').click();
  await openSlot(page);
  let rerolls = 1;
  for (;;) {
    const before = stub.searches;
    await page.locator(BOX).first().fill(PICK.text);
    await page.waitForFunction(() => document.querySelector('[role="option"]') !== null, undefined, { timeout: 15000 }).catch(() => {});
    if (stub.searches > before && stub.lastClubFilter) break;
    if (rerolls >= 12) break;
    rerolls += 1;
    await page.locator(BOX).first().fill('');
    await page.getByTitle('Reroll: get a different team').click();
    await openSlot(page);
  }
  if (!check(Boolean(stub.lastClubFilter), `a club slot was dealt within 12 rerolls (${rerolls} used)`)) {
    await context.close();
    return;
  }
  const club = stub.lastClubFilter[0];
  const option = page.locator('[role="option"]', { hasText: PICK.listed }).first();
  await option.waitFor({ timeout: 15000 });
  if (width === 390) await option.tap(); else await option.click();
  await page.locator('span', { hasText: /^1\/11$/ }).first().waitFor({ timeout: 15000 }).catch(() => {});
  const filled = await filledCount(page);
  check(filled === 1, `the slot is filled: 1 of 11 (${filled}), row at ${club}`);
  check(stub.validatorRequests === 0, `zero requests went to the validator (${stub.validatorRequests})`);
  const printed = await page.locator('button[disabled]', { hasText: new RegExp(PICK.stored) }).count();
  check(printed === 1, `the pitch prints the name as the row stores it, "${PICK.stored}" (${printed})`);
  await context.close();
}

const server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), distDir, String(PORT)], { stdio: 'ignore' });
let serverUp = false;
for (let i = 0; i < 50 && !serverUp; i++) {
  serverUp = await fetch(`${BASE}/`).then(response => response.ok).catch(() => false);
  if (!serverUp) await new Promise(resolve => setTimeout(resolve, 200));
}
if (!serverUp) {
  server.kill();
  console.error(`playLineupValidator: the server for ${distDir} never came up on ${PORT}`);
  process.exit(1);
}
console.log(`playLineupValidator: build ${path.relative(ROOT, distDir) || distDir}, the wait is ${WAIT_MS} ms${CONTROL ? `, control ${CONTROL}` : ''}`);
const browser = await chromium.launch();
const pageErrors = [];
let walked = 0;
try {
  if (CONTROL === 'accept-on-error') {
    await allowance(browser, 390, pageErrors);
  } else {
    for (const width of [390, 1280]) {
      await allowance(browser, width, pageErrors);
      await noVerdict(browser, width, pageErrors, 'S2: the validator answers HTTP 500', 'http500');
      await noVerdict(browser, width, pageErrors, 'S3: the validator answers a 200 that is not JSON', 'notjson');
      await noVerdict(browser, width, pageErrors, 'S4: the validator answers {"valid":"true"}, a string', 'stringtrue');
      if (width === 390) await hang(browser, width, pageErrors);
      await ownRecord(browser, width, pageErrors);
      walked += 1;
    }
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('');
if (CONTROL === 'accept-on-error') {
  if (!control.fired) {
    console.error('playLineupValidator control: RED. The validator answer was never changed, so nothing was planted.');
    process.exit(1);
  }
  if (!control.accepted) {
    console.error('playLineupValidator control: RED. The planted valid answer did not fill the slot, so the control did not recreate accept on error.');
    process.exit(1);
  }
  if (!control.caught) {
    console.error('playLineupValidator control: RED. Accepting the spent allowance escaped the nothing filled assertion.');
    process.exit(1);
  }
  console.log('playLineupValidator control: green. Accept on error was planted, the slot filled, and the nothing filled assertion caught it.');
  process.exit(0);
}
check(pageErrors.length === 0, `no page error at either width${pageErrors.length ? `: ${pageErrors.slice(0, 3).join(' | ')}` : ''}`);
if (failures > 0) {
  console.error(`playLineupValidator: ${failures} failure${failures === 1 ? '' : 's'}.`);
  process.exit(1);
}
console.log(`playLineupValidator: green at ${walked} widths (390 and 1280). An allowance answer, an HTTP 500, a body that is not JSON, a string for valid and a validator that never answers each left the pick uncounted with the search box live; the next pick counted; a club pick our own row settles asked nobody.`);
