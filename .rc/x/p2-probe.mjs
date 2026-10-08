// Round 1138, closing fix pass 2. MEASUREMENT ONLY, never committed. Run from the repo root after a build:
//   PROBE_DIST=dist PROBE_TAG=branch node .rc/x/p2-probe.mjs
// Part A: after a pick on /missing-xi, is the list back over the Lock in guess button, and does a tap on it land?
// Part B: on /build-your-xi, is a list open under the disabled box while the pick is being checked?
// Part C: at 390 with touch, does a finger that starts a scroll on a row of the list pick that row?
// Nothing reaches the database: every request off this server is refused and the few the pages need are stubbed.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const DIST = path.resolve(ROOT, process.env.PROBE_DIST || 'dist');
const TAG = process.env.PROBE_TAG || 'branch';
const PORT = Number(process.env.PROBE_PORT || 4251);
const BASE = `http://127.0.0.1:${PORT}`;
const clientTs = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
const SUPA_HOST = new URL(clientTs.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1]).host;
const BOX = 'input[role="combobox"]';
const VIEWPORTS = {
  390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  1280: { viewport: { width: 1280, height: 800 } },
};
const row = (name, value) => ({
  player_name: name, name_folded: name.toLowerCase(), market_value_usd: value, year: 2026,
  club: 'Fixture Rovers', nationality: 'Fixtureland', position: 'Centre-Back', age: 27,
});
const ONE = [row('Qzxalpha Fixture', 2000000)];
const MANY = 'abcdefghijkl'.split('').map((letter, i) => row(`Qzxalpha Fixture${letter}`, 3000000 - i * 1000));
const json = body => route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }).catch(() => {});
const lines = [];
const say = line => { console.log(line); lines.push(line); };

async function open(browser, width, route, rows, validatorDelayMs = 0) {
  const context = await browser.newContext(VIEWPORTS[width]);
  await context.addInitScript(() => {
    try {
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('lineup-rules-seen', '1');
      localStorage.setItem(`rules-gate-seen:${location.pathname}`, '1');
    } catch { /* ignored */ }
  });
  const page = await context.newPage();
  const seen = { searches: 0, validator: 0 };
  await page.route('**/*', r => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
  await page.route(`**${SUPA_HOST}/rest/v1/player_market_values**`, r => {
    seen.searches += 1;
    return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': `0-${rows.length - 1}/${rows.length}` }, body: JSON.stringify(rows) }).catch(() => {});
  });
  await page.route(`**${SUPA_HOST}/rest/v1/national_team_squads**`, json([]));
  await page.route(`**${SUPA_HOST}/rest/v1/player_verified_positions**`, json([]));
  await page.route(`**${SUPA_HOST}/functions/v1/validate-player`, async r => {
    seen.validator += 1;
    await new Promise(resolve => setTimeout(resolve, validatorDelayMs));
    return json({ valid: false, reason: 'Probe refusal.' })(r);
  });
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    .catch(() => page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 }));
  return { context, page, seen };
}

/** Part A. */
async function pickThenLock(browser, width) {
  const { context, page, seen } = await open(browser, width, '/missing-xi', ONE);
  const box = page.locator(BOX).first();
  await box.waitFor({ timeout: 30000 });
  await box.fill('qzxalpha');
  const option = page.locator('[role="option"]', { hasText: 'Qzxalpha Fixture' }).first();
  await option.waitFor({ timeout: 15000 });
  const before = seen.searches;
  if (width === 390) await option.tap(); else await option.click();
  await page.waitForTimeout(1500);
  const look = await page.evaluate(sel => {
    const input = document.querySelector(sel);
    const lock = [...document.querySelectorAll('button')].find(b => /Lock in guess/i.test(b.textContent || ''));
    const list = document.querySelector('[role="listbox"]');
    let covered = null;
    if (lock) {
      const r = lock.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      covered = !(top && (top === lock || lock.contains(top)));
    }
    return { value: input ? input.value : null, expanded: input ? input.getAttribute('aria-expanded') : null, list: list ? (list.textContent || '').slice(0, 60) : null, lock: Boolean(lock), covered };
  }, BOX);
  let lockLanded = false;
  const lock = page.getByRole('button', { name: /Lock in guess/i }).first();
  try {
    if (width === 390) await lock.tap({ timeout: 3000 }); else await lock.click({ timeout: 3000 });
    await page.waitForTimeout(300);
    lockLanded = (await box.inputValue().catch(() => '')) === '';
  } catch { lockLanded = false; }
  say(`PROBE_PICK tag=${TAG} width=${width} boxAfterPick=${JSON.stringify(look.value)} listAfterPick=${look.list === null ? 'none' : JSON.stringify(look.list)} expanded=${look.expanded} lockButton=${look.lock} lockCovered=${look.covered} searchesAfterPick=${seen.searches - before} lockTapLanded=${lockLanded}`);
  await context.close();
}

/** Part B. */
async function busyBox(browser, width) {
  const { context, page, seen } = await open(browser, width, '/build-your-xi', ONE, 2500);
  await page.getByRole('button', { name: /^4-3-3/ }).first().click({ timeout: 30000 });
  await page.getByText('Select a position on the pitch').waitFor({ timeout: 30000 });
  await page.locator('button', { hasText: /^CB$/ }).first().click();
  const box = page.locator(BOX).first();
  await box.waitFor({ timeout: 30000 });
  await box.fill('qzxalpha');
  const option = page.locator('[role="option"]', { hasText: 'Qzxalpha Fixture' }).first();
  await option.waitFor({ timeout: 15000 });
  const before = seen.searches;
  if (width === 390) await option.tap(); else await option.click();
  await page.waitForTimeout(1200);
  const look = await page.evaluate(sel => {
    const input = document.querySelector(sel);
    const list = document.querySelector('[role="listbox"]');
    return { value: input ? input.value : null, disabled: input ? input.disabled : null, list: list ? (list.textContent || '').slice(0, 60) : null };
  }, BOX);
  say(`PROBE_BUSY tag=${TAG} width=${width} validatorCalls=${seen.validator} boxWhileChecking=${JSON.stringify(look.value)} disabled=${look.disabled} listWhileChecking=${look.list === null ? 'none' : JSON.stringify(look.list)} searchesAfterPick=${seen.searches - before}`);
  await context.close();
}

/** Part C. */
async function touchScroll(browser, trial) {
  const { context, page } = await open(browser, 390, '/missing-xi', MANY);
  const box = page.locator(BOX).first();
  await box.waitFor({ timeout: 30000 });
  await box.fill('qzxalpha');
  await page.locator('[role="option"]').nth(3).waitFor({ timeout: 15000 });
  const shape = await page.evaluate(() => {
    const list = document.querySelector('[role="listbox"]');
    const rows = [...document.querySelectorAll('[role="option"]')];
    const r = rows[2].getBoundingClientRect();
    return { rows: rows.length, scrollHeight: list.scrollHeight, clientHeight: list.clientHeight, x: r.left + r.width / 2, y: r.top + r.height / 2, third: rows[2].textContent };
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: shape.x, y: shape.y }] });
  for (let step = 1; step <= 10; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: shape.x, y: shape.y - step * 12 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
  const after = await page.evaluate(sel => {
    const input = document.querySelector(sel);
    const list = document.querySelector('[role="listbox"]');
    return { value: input ? input.value : null, list: Boolean(list), scrollTop: list ? list.scrollTop : null };
  }, BOX);
  const picked = after.value !== 'qzxalpha';
  say(`PROBE_TOUCHSCROLL tag=${TAG} trial=${trial} rows=${shape.rows} listScrolls=${shape.scrollHeight > shape.clientHeight} (${shape.scrollHeight} in ${shape.clientHeight}) fingerStartedOn=${JSON.stringify((shape.third || '').slice(0, 24))} boxAfter=${JSON.stringify(after.value)} rowPicked=${picked} listStillOpen=${after.list} scrolledBy=${after.scrollTop}`);
  await context.close();
  return picked;
}

const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
let up = false;
for (let i = 0; i < 50 && !up; i++) {
  up = await fetch(`${BASE}/`).then(r => r.ok).catch(() => false);
  if (!up) await new Promise(resolve => setTimeout(resolve, 200));
}
if (!up) { server.kill(); console.error(`p2-probe: no server for ${DIST}`); process.exit(1); }
const browser = await chromium.launch();
let code = 0;
try {
  for (const width of [390, 1280]) await pickThenLock(browser, width);
  for (const width of [390, 1280]) await busyBox(browser, width);
  let picks = 0;
  for (let trial = 1; trial <= 5; trial++) if (await touchScroll(browser, trial)) picks += 1;
  say(`PROBE_TOUCHSCROLL_TOTAL tag=${TAG} a finger that started a scroll on a row picked that row ${picks} times of 5`);
} catch (error) {
  code = 1;
  say(`PROBE_ERROR tag=${TAG} ${String(error && error.stack || error).slice(0, 600)}`);
} finally {
  await browser.close();
  server.kill();
}
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, `p2-probe-${TAG}.txt`), lines.join('\n') + '\n');
process.exit(code);
