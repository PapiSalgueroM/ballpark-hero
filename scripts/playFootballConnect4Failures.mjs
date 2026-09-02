/**
 * Round 397 browser harness: Soccer Connect 4 keeps a guess when its answer
 * checker cannot give a usable verdict.
 *
 * Five validator responses are exercised through the real page:
 *   1. HTTP 429 with an error body.
 *   2. HTTP 200 invalid with an object-shaped reason.
 *   3. HTTP 200 unverified with a retry reason.
 *   4. HTTP 200 with contradictory valid and unverified flags.
 *   5. HTTP 200 valid.
 *
 * The first three must leave the board and turn untouched. Only the valid
 * response may place a piece and hand the turn to Red. The autocomplete is
 * also driven through its real database request, so this checks the complete
 * click path rather than calling the hook directly.
 *
 * NEGATIVE CONTROL: C4FAIL_CONTROL=accept-on-error wraps fetch in the browser
 * and converts the real 429 response into a valid verdict before the hook sees
 * it, recreating accept-on-error while leaving the no-piece assertions in
 * place. The control refuses to pass unless that mutation fired and the
 * harness caught the resulting piece and turn change.
 *
 * Run after npm run build:
 *   node scripts/playFootballConnect4Failures.mjs
 *   C4FAIL_CONTROL=accept-on-error node scripts/playFootballConnect4Failures.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.C4FAIL_CONTROL || '';
if (CONTROL && CONTROL !== 'accept-on-error') {
  console.error(`C4FAIL_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const clientTs = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const SUPA_HOST = new URL(clientTs.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1]).host;
const PORT = 4194;
const BASE = `http://127.0.0.1:${PORT}`;
const PLAYER = {
  player_name: 'Mohamed Salah',
  name_folded: 'mohamed salah',
  market_value_usd: 60000000,
  year: 2026,
  club: 'Liverpool',
  nationality: 'Egypt',
  position: 'Right Winger',
  age: 34,
};

const scenarios = [
  {
    id: 'http429',
    label: 'HTTP 429',
    status: 429,
    body: { error: 'Rate limit exceeded' },
    expectedText: [/busy/i, /not used/i, /try again/i],
    shouldPlace: false,
  },
  {
    id: 'objectReason',
    label: 'object-shaped invalid reason',
    status: 200,
    body: {
      valid: false,
      reason: {
        column: 'Matches the column clue.',
        row: 'Does not match the row clue.',
      },
    },
    expectedText: [/matches the column clue/i, /does not match the row clue/i],
    shouldPlace: false,
  },
  {
    id: 'unverified',
    label: 'unverified verdict',
    status: 200,
    body: {
      valid: false,
      unverified: true,
      reason: 'Could not verify this answer. This guess was not used. Try again.',
    },
    expectedText: [/could not verify/i, /not used/i],
    shouldPlace: false,
  },
  {
    id: 'validAndUnverified',
    label: 'contradictory valid and unverified verdict',
    status: 200,
    body: {
      valid: true,
      unverified: true,
      fullName: PLAYER.player_name,
      reason: 'The answer could not be verified.',
    },
    expectedText: [/could not be verified/i],
    shouldPlace: false,
  },
  {
    id: 'valid',
    label: 'valid verdict',
    status: 200,
    body: { valid: true, fullName: PLAYER.player_name, cached: true },
    expectedText: [],
    shouldPlace: true,
  },
];

let failures = 0;
function check(ok, message) {
  console.log(`${ok ? '  PASS  ' : '  FAIL  '}${message}`);
  if (!ok) {
    failures += 1;
  }
}

const server = spawn(
  process.execPath,
  [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), path.join(ROOT, 'dist'), String(PORT)],
  { stdio: 'ignore' },
);

let serverUp = false;
for (let i = 0; i < 25 && !serverUp; i++) {
  serverUp = await fetch(`${BASE}/`).then(response => response.ok).catch(() => false);
  if (!serverUp) await new Promise(resolve => setTimeout(resolve, 200));
}
if (!serverUp) {
  console.error(`the dist server never came up on ${PORT}`);
  server.kill();
  process.exit(1);
}

const browser = await chromium.launch();
let controlMutationFired = false;
let controlAccepted = false;

async function runScenario(scenario) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() => {
    try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* ignored */ }
  });
  if (CONTROL === 'accept-on-error') {
    await context.addInitScript(({ validatorPath, playerName }) => {
      const realFetch = window.fetch.bind(window);
      window.__C4FAIL_CONTROL_FIRED__ = false;
      window.fetch = async (...args) => {
        const response = await realFetch(...args);
        const requestUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url;
        if (requestUrl?.includes(validatorPath) && response.status === 429) {
          window.__C4FAIL_CONTROL_FIRED__ = true;
          return new Response(JSON.stringify({ valid: true, fullName: playerName, cached: false }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        return response;
      };
    }, { validatorPath: '/functions/v1/football-connect4-validate', playerName: PLAYER.player_name });
  }
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  let playerSearchRequests = 0;
  let validatorRequests = 0;
  /* Playwright checks route handlers in reverse registration order. Keep the
     broad offline fence first so the two deterministic mocks below win. */
  await page.route(`**${SUPA_HOST}/**`, route => route.abort());
  await page.route(`**${SUPA_HOST}/rest/v1/player_market_values**`, async route => {
    playerSearchRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '0-0/1' },
      body: JSON.stringify([PLAYER]),
    });
  });
  await page.route(`**${SUPA_HOST}/functions/v1/football-connect4-validate`, async route => {
    validatorRequests += 1;
    await route.fulfill({
      status: scenario.status,
      contentType: 'application/json',
      body: JSON.stringify(scenario.body),
    });
  });

  /* One retry keeps a transient local navigation stall from being mistaken
     for validator behavior. The DOM assertions below still have to pass. */
  await page.goto(`${BASE}/football-connect-4`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    .catch(() => page.goto(`${BASE}/football-connect-4`, { waitUntil: 'domcontentloaded', timeout: 15000 }));
  await page.getByRole('heading', { name: 'SOCCER CONNECT 4' }).waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: /Unlimited/ }).click();
  await page.getByRole('button', { name: /^Empty square,/ }).nth(35).click();

  const input = page.getByRole('combobox', { name: 'Enter soccer player name...' });
  await input.fill(PLAYER.player_name);
  await page.getByRole('option', { name: new RegExp(PLAYER.player_name, 'i') }).click();
  let retryInputReady = true;
  if (!scenario.shouldPlace) {
    retryInputReady = await page.waitForFunction(
      () => {
        const element = document.querySelector('input[aria-label="Enter soccer player name..."]');
        return element instanceof HTMLInputElement && !element.disabled;
      },
      undefined,
      { timeout: 10000 },
    ).then(() => true).catch(() => false);
  }
  await page.waitForTimeout(150);

  const occupied = await page.locator('button[aria-label^="Mohamed Salah,"]').count();
  const blueTurn = await page.getByText("Blue's Turn", { exact: true }).count();
  const redTurn = await page.getByText("Red's Turn", { exact: true }).count();
  const bodyText = await page.locator('body').innerText();

  console.log(`\n${scenario.label}`);
  check(playerSearchRequests >= 2, `autocomplete used both database search legs (${playerSearchRequests} requests)`);
  check(validatorRequests === 1, `validator was called exactly once (${validatorRequests})`);
  check(pageErrors.length === 0, `page stayed mounted without a render error${pageErrors.length ? `: ${pageErrors.join(' | ')}` : ''}`);

  if (scenario.shouldPlace) {
    check(occupied === 1, `valid response placed exactly one piece (${occupied})`);
    check(redTurn === 1 && blueTurn === 0, `valid response handed the turn to Red (blue=${blueTurn}, red=${redTurn})`);
  } else {
    check(occupied === 0, `non-valid response placed no piece (${occupied})`);
    check(blueTurn === 1 && redTurn === 0, `non-valid response kept Blue's turn (blue=${blueTurn}, red=${redTurn})`);
    check(retryInputReady, 'non-valid response kept the selected square and an enabled answer input');
    for (const expected of scenario.expectedText) {
      check(expected.test(bodyText), `page explained ${expected}`);
    }
  }

  if (CONTROL === 'accept-on-error') {
    controlMutationFired = await page.evaluate(() => window.__C4FAIL_CONTROL_FIRED__ === true);
    controlAccepted = occupied === 1 && redTurn === 1 && blueTurn === 0;
  }
  await context.close();
}

try {
  for (const scenario of CONTROL ? scenarios.slice(0, 1) : scenarios) {
    await runScenario(scenario);
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('');
if (CONTROL === 'accept-on-error') {
  if (!controlMutationFired) {
    console.error('playFootballConnect4Failures control: RED. The validator response was never mutated.');
    process.exit(1);
  }
  if (!controlAccepted) {
    console.error('playFootballConnect4Failures control: RED. The mutated valid verdict did not place a piece, so the control did not recreate accept-on-error.');
    process.exit(1);
  }
  if (failures === 0) {
    console.error('playFootballConnect4Failures control: RED. Accepting the failed request escaped every assertion.');
    process.exit(1);
  }
  console.log(`playFootballConnect4Failures control: green. Accept-on-error fired and ${failures} assertion${failures === 1 ? '' : 's'} caught it.`);
  process.exit(0);
}

if (failures > 0) {
  console.error(`playFootballConnect4Failures: ${failures} failure${failures === 1 ? '' : 's'}.`);
  process.exit(1);
}
console.log('playFootballConnect4Failures: green. Failed checks keep the guess and turn; a valid answer alone places the piece.');
