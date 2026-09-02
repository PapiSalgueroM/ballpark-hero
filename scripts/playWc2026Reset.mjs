/* Browser fence for Round 396 bracket invalidation.

   It proves four user-visible paths:
   1. Random All preserves a completed bracket when every group score is filled,
      while a real score edit clears its winner and child save;
   2. Reset All clears the bracket, awards and parent score state;
   3. Reset All during Auto Fill Everything cancels every delayed write;
   4. Reset All cannot be followed by a rank fill write.

   NEGATIVE CONTROL: WC2026_RESET_CONTROL=noinvalidate rewrites the served page
   in memory. Reset All becomes a no-op and Random All loses its completed-group
   guard. The control refuses to run unless both exact code mutations land, then
   requires every assertion aimed at those restored bugs to fail.
*/
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4396);
const BASE = `http://127.0.0.1:${PORT}`;
const CONTROL = process.env.WC2026_RESET_CONTROL || '';
if (CONTROL && CONTROL !== 'noinvalidate') {
  console.error(`WC2026_RESET_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
const server = spawn(process.execPath, [
  path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'),
  '--host', '127.0.0.1', '--port', String(PORT), '--strictPort',
], { cwd: ROOT, stdio: 'ignore' });

let failures = 0;
let controlChecks = 0;
let controlCaught = 0;
let controlMisses = 0;
const say = (ok, message, controlRelevant = false) => {
  if (CONTROL && controlRelevant) {
    controlChecks += 1;
    if (!ok) {
      controlCaught += 1;
      console.log('  CAUGHT: ' + message);
    } else {
      controlMisses += 1;
      console.error('  MISSED: ' + message);
    }
    return;
  }
  if (ok) console.log('  PASS: ' + message);
  else { failures += 1; console.error('  FAIL: ' + message); }
};

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await fetch(BASE).then(response => response.ok).catch(() => false)) return;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`dev server never came up on ${PORT}`);
}

const emptyAwardState = raw => {
  if (!raw) return true;
  try {
    const value = JSON.parse(raw);
    return !value.goldenBoot && !value.goldenGlove && !value.goldenBall;
  } catch {
    return false;
  }
};

try {
  await waitForServer();
  const browser = await pw.chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const controlMutationProof = { resetButton: 0, randomGuard: 0 };
  let controlMutationError = '';
  if (CONTROL === 'noinvalidate') {
    await context.route('**/src/pages/WorldCupPredictor.tsx*', async route => {
      const response = await route.fetch();
      let body = await response.text();
      const mutations = [
        {
          label: 'resetButton',
          from: 'onClick: handleResetEverything,',
          to: 'onClick: ()=>{},',
        },
        {
          label: 'randomGuard',
          from: 'if (allGroupsFilled) return;',
          to: 'if (false) return;',
        },
      ];
      for (const mutation of mutations) {
        const matches = body.split(mutation.from).length - 1;
        if (matches !== 1) {
          controlMutationError = `${mutation.label} matched ${matches} times instead of exactly once`;
          break;
        }
        const changed = body.replace(mutation.from, mutation.to);
        if (changed === body) {
          controlMutationError = `${mutation.label} changed no code`;
          break;
        }
        body = changed;
        controlMutationProof[mutation.label] += 1;
      }
      await route.fulfill({ response, body });
    });
    console.log('NEGATIVE CONTROL ON: Reset All disabled and the Random All no-op guard removed in served code');
  }
  await context.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('wc2026-awards', JSON.stringify({ goldenBoot: 'Mbappé', goldenGlove: 'Unai Simón', goldenBall: 'Rodri' }));
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  const dismissConsent = async () => {
    const choice = page.getByRole('button', { name: 'Essential only' });
    if (await choice.count()) await choice.click().catch(() => {});
  };
  await page.goto(`${BASE}/world-cup-bracket`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: 'Auto Fill Everything' }).waitFor({ timeout: 30000 });
  await dismissConsent();
  if (CONTROL) {
    if (controlMutationError) throw new Error(`control refused: ${controlMutationError}`);
    if (controlMutationProof.resetButton < 1 || controlMutationProof.randomGuard < 1) {
      throw new Error(`control changed nothing: ${JSON.stringify(controlMutationProof)}`);
    }
    console.log(`control mutation proof: reset button ${controlMutationProof.resetButton}, Random All guard ${controlMutationProof.randomGuard}`);
  }

  console.log('1) Random All preserves a completed bracket, real score changes invalidate it');
  await page.getByRole('button', { name: 'Auto Fill Everything' }).click();
  await page.waitForTimeout(3200);
  say(await page.getByText('Pick a champion in the bracket above', { exact: true }).count() === 0, 'auto fill produced a champion before the edit');
  const savedBeforeEdit = await page.evaluate(() => localStorage.getItem('wc2026-knockout'));
  say(!!savedBeforeEdit && savedBeforeEdit !== '{}', 'auto fill saved knockout picks before the edit');
  await page.getByRole('button', { name: 'Random All' }).click();
  await page.waitForTimeout(200);
  const afterNoOpRandom = await page.evaluate(() => localStorage.getItem('wc2026-knockout'));
  say(afterNoOpRandom === savedBeforeEdit, 'Random All kept the completed knockout picks when every group score was already filled', true);
  say(await page.getByText('Pick a champion in the bracket above', { exact: true }).count() === 0, 'Random All kept the champion when it had no group score to fill', true);
  await page.locator('input[type="number"]').first().fill('9');
  await page.waitForTimeout(200);
  const afterEdit = await page.evaluate(() => ({
    knockout: localStorage.getItem('wc2026-knockout'),
    signature: localStorage.getItem('wc2026-knockout-signature'),
  }));
  say(!afterEdit.knockout || afterEdit.knockout === '{}', 'the score edit cleared knockout storage');
  say(!afterEdit.signature, 'the score edit cleared the knockout signature');
  say(await page.getByText('Pick a champion in the bracket above', { exact: true }).count() === 1, 'the score edit cleared the champion');

  console.log('2) Reset All clears parent and child state');
  await page.getByRole('button', { name: 'Auto Fill Everything' }).click();
  await page.waitForTimeout(3200);
  await page.getByRole('button', { name: 'Reset All' }).click();
  await page.waitForTimeout(200);
  const afterReset = await page.evaluate(() => ({
    knockout: localStorage.getItem('wc2026-knockout'),
    signature: localStorage.getItem('wc2026-knockout-signature'),
    awards: localStorage.getItem('wc2026-awards'),
  }));
  say(!afterReset.knockout || afterReset.knockout === '{}', 'Reset All cleared knockout picks', true);
  say(!afterReset.signature, 'Reset All cleared the knockout signature', true);
  say(emptyAwardState(afterReset.awards), 'Reset All cleared award picks', true);
  say(await page.getByText('Pick a champion in the bracket above', { exact: true }).count() === 1, 'Reset All cleared the champion', true);
  say(await page.getByText('Fill your groups and bracket above and this scores it against the real results.', { exact: true }).count() === 1, 'Reset All cleared the scored bracket rounds', true);

  console.log('3) Reset All cancels pending Auto Fill Everything writes');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Auto Fill Everything' }).waitFor({ timeout: 30000 });
  await dismissConsent();
  await page.getByRole('button', { name: 'Auto Fill Everything' }).click();
  await page.waitForTimeout(50);
  await page.getByRole('button', { name: 'Reset All' }).click();
  await page.waitForTimeout(2600);
  const afterPendingReset = await page.evaluate(() => ({
    predictions: localStorage.getItem('wc2026-predictions'),
    knockout: localStorage.getItem('wc2026-knockout'),
    signature: localStorage.getItem('wc2026-knockout-signature'),
    showBracket: localStorage.getItem('wc2026-show-bracket'),
  }));
  say(!afterPendingReset.predictions || afterPendingReset.predictions === '{}', 'pending timers did not refill group predictions', true);
  say(!afterPendingReset.knockout || afterPendingReset.knockout === '{}', 'pending timers did not refill knockout picks', true);
  say(!afterPendingReset.signature, 'pending timers did not restore a knockout signature', true);
  say(afterPendingReset.showBracket !== 'true', 'pending timers did not reopen the bracket', true);
  say(await page.getByRole('button', { name: 'Auto Fill Everything' }).isEnabled(), 'the auto-fill control returned to idle');

  console.log('4) Reset All cannot be followed by a rank fill write');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Fill by Rank' }).first().waitFor({ timeout: 30000 });
  await dismissConsent();
  await page.getByRole('button', { name: 'Fill by Rank' }).first().click();
  await page.getByRole('button', { name: 'Reset All' }).click();
  await page.waitForTimeout(1300);
  const afterRankReset = await page.evaluate(() => localStorage.getItem('wc2026-predictions'));
  say(!afterRankReset || afterRankReset === '{}', 'a rank fill did not survive Reset All', true);
  say(pageErrors.length === 0, `no page errors (${pageErrors[0] || 'clean'})`);

  await context.close();
  await browser.close();
} finally {
  server.kill();
}

if (CONTROL) {
  const expectedControlChecks = 12;
  if (controlChecks !== expectedControlChecks) {
    console.error(`\nplayWc2026Reset control: expected ${expectedControlChecks} relevant checks, ran ${controlChecks}`);
    process.exit(1);
  }
  if (controlMisses || controlCaught !== controlChecks || failures) {
    console.error(`\nplayWc2026Reset control: ${controlCaught}/${controlChecks} restored-bug checks fired, ${controlMisses} missed, ${failures} unrelated failure(s)`);
    process.exit(1);
  }
  console.log(`\nplayWc2026Reset control: all ${controlCaught} restored-bug checks fired`);
  process.exit(0);
}

if (failures) {
  console.error(`\nplayWc2026Reset: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nplayWc2026Reset: all green');
