/**
 * Round 928 browser proof: two Club Manager managers survive leaving the page.
 *
 * Drives the REAL built page in Chromium on a phone viewport: take a job,
 * open Managers, start a second manager in slot 2 at a different club, leave
 * the page for the home page, come back, and both managers must be on the
 * slots screen. Then Resume Career on slot 1 must open the first club's hub, and
 * slot 2 must still hold the second club. No page error anywhere.
 *
 * The database host is blocked for the whole walk (the production rule of
 * 2026-10-02): Club Manager plays from the bundle, so nothing here needs it.
 *
 * Serve nothing first: this file starts scripts/lib/hostLikeServer.mjs on
 * dist itself. Run npm run build, then:
 *   ENGINES=chromium node scripts/playClubManagerSlots.mjs
 * SWEEP_BASE=<url> points it at a server that is already up.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4179);
const suppliedBase = !!process.env.SWEEP_BASE;
const BASE = process.env.SWEEP_BASE || `http://127.0.0.1:${PORT}`;
const KEY = 'dukb-club-manager-save';
const V = !!process.env.VERBOSE;
/* Round 928 review: PLAY_SLOTS_CONTROL=unparked removes slot 1's parked copy
   while the page is away, and the walk must then go RED. */
const CONTROL = process.env.PLAY_SLOTS_CONTROL || '';

let failures = 0;
const fail = m => { failures += 1; console.log('  FAIL: ' + m); };
const ok = m => console.log('  ok    ' + m);
const say = m => { if (V) console.log('      ' + m); };

let server = null;
async function startServer() {
  if (suppliedBase) {
    const live = await fetch(`${BASE}/`).then(r => r.ok).catch(() => false);
    if (!live) throw new Error(`nothing answered at supplied SWEEP_BASE ${BASE}`);
    return;
  }
  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    throw new Error('dist/index.html is missing. Run npm run build before this browser harness.');
  }
  const occupied = await fetch(`${BASE}/`).then(r => r.ok).catch(() => false);
  if (occupied) throw new Error(`port ${PORT} already answers, refusing to test an unknown server`);
  server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), path.join(ROOT, 'dist'), String(PORT)], { stdio: 'ignore' });
  for (let i = 0; i < 30; i++) {
    const live = await fetch(`${BASE}/`).then(r => r.ok).catch(() => false);
    if (live) return;
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`the dist server never came up on port ${PORT}`);
}

await startServer();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
let blocked = 0;
await context.route(/supabase\.co/, route => { blocked += 1; return route.abort(); });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e && e.message ? e.message : e)));

const text = async () => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
async function tap(rx, what, scope = page) {
  const b = scope.getByRole('button', { name: rx }).first();
  if (await b.count().catch(() => 0) === 0) { say(`no button for ${what}`); return false; }
  const done = await b.click({ timeout: 4000 }).then(() => true).catch(() => false);
  if (done) say(`pressed ${what}`);
  return done;
}
async function clearRoom() {
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    const d = page.locator('[role="dialog"][data-state="open"]');
    if (await d.count().catch(() => 0) === 0) break;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
}
const saved = async () => page.evaluate(k => { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw).clubName : null; }, KEY);
const slotText = async n => ((await page.locator(`[data-testid="cm-slot-${n}"]`).innerText().catch(() => '')) || '').replace(/\s+/g, ' ');

/** The picker, an era (today's world unless told), England, the Premier
    League, the first club on the list that is not `avoid`, then skip the
    dugout form. */
async function takeJob(avoid, era = /2026-27/i) {
  await tap(era, `the ${era.source} era`);
  await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(/England/i, 'England');
  await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(/Premier League/i, 'Premier League');
  const pool = ['Everton', 'Fulham', 'Brentford', 'Crystal Palace', 'Brighton', 'Aston Villa', 'Chelsea'].filter(c => ![].concat(avoid).includes(c));
  const clubBtn = page.locator('button').filter({ hasText: new RegExp(pool.join('|')) }).first();
  await clubBtn.waitFor({ timeout: 8000 }).catch(() => {});
  await clubBtn.click({ timeout: 5000 }).catch(() => {});
  await tap(/take the job|confirm|start/i, 'the pinned confirm bar');
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(/skip: just manage/i, 'skip the dugout form');
  await page.waitForTimeout(800);
  return saved();
}

try {
  console.log('1) The first manager takes a job');
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await clearRoom();
  const first = await takeJob(null);
  if (!first || !/Season 1/i.test(await text())) { fail('could not take the first job, so nothing below ran'); throw new Error('blocked'); }
  ok(`manager 1 at ${first}`);

  console.log('2) Managers, then a new manager in slot 2');
  if (!(await page.locator('[data-testid="cm-show-slots"]').click({ timeout: 4000 }).then(() => true).catch(() => false))) fail('no Managers button on the hub');
  await page.locator('[data-testid="cm-slots"]').waitFor({ timeout: 8000 }).catch(() => {});
  if (!(await slotText(1)).includes(first)) fail(`slot 1 does not show ${first}: "${await slotText(1)}"`);
  if (!(await tap(/^new manager$/i, 'New manager in slot 2', page.locator('[data-testid="cm-slot-2"]')))) fail('no New manager button in slot 2');
  await page.waitForTimeout(600);
  const second = await takeJob(first);
  if (!second || second === first) { fail(`the second manager did not take a different job (got ${second})`); throw new Error('blocked'); }
  ok(`manager 2 at ${second}`);

  console.log('3) Leave the page, come back');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(800);
  if (CONTROL === 'unparked') {
    /* The negative control: the store a swap that never parked would leave
       (slot 1's copy gone). Step 3 must go red, which proves it reads the
       store rather than passing on whatever the page shows. */
    const had = await page.evaluate(() => localStorage.getItem('dukb-cm-slot-1') !== null);
    if (!had) { console.log('CONTROL REFUSED: there was no parked slot 1 to remove'); process.exit(3); }
    await page.evaluate(() => localStorage.removeItem('dukb-cm-slot-1'));
    console.log('   CONTROL unparked: slot 1 removed from the store');
  }
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.locator('[data-testid="cm-slots"]').waitFor({ timeout: 10000 }).catch(() => {});
  const s1 = await slotText(1), s2 = await slotText(2);
  if (!s1.includes(first)) fail(`after coming back slot 1 reads "${s1}", not ${first}`);
  else ok(`slot 1 still ${first}`);
  if (!s2.includes(second)) fail(`after coming back slot 2 reads "${s2}", not ${second}`);
  else ok(`slot 2 still ${second}`);

  console.log('4) Resume Career on slot 1');
  await tap(/^resume career$/i, 'Resume Career in slot 1', page.locator('[data-testid="cm-slot-1"]'));
  await page.locator('[data-testid="cm-show-slots"]').waitFor({ timeout: 10000 }).catch(() => {});
  const h1 = ((await page.locator('h1').first().innerText().catch(() => '')) || '').trim();
  if (h1 !== first) fail(`Resume Career on slot 1 opened "${h1}", not ${first}`);
  else ok(`slot 1 opened on ${first}'s hub`);
  if (await saved() !== first) fail(`the active save holds ${await saved()}, not ${first}`);
  const parked2 = await page.evaluate(() => { const raw = localStorage.getItem('dukb-cm-slot-2'); return raw ? JSON.parse(raw).clubName : null; });
  if (parked2 !== second) fail(`slot 2's parked save holds ${parked2}, not ${second}`);
  else ok(`${second} parked in slot 2`);

  /* Round 928 review: the era path. A 2010-11 manager in slot 3, then a
     fresh page that opens today's slot 1 first, so the 2010-11 squads are
     not in the page when slot 3 is opened: the boot has to fetch them. */
  console.log('5) A 2010-11 manager in slot 3, opened from a fresh page after another slot');
  await page.locator('[data-testid="cm-show-slots"]').click({ timeout: 4000 }).catch(() => fail('no Managers button on slot 1\'s hub'));
  await page.locator('[data-testid="cm-slots"]').waitFor({ timeout: 8000 }).catch(() => {});
  if (!(await tap(/^new manager$/i, 'New manager in slot 3', page.locator('[data-testid="cm-slot-3"]')))) fail('no New manager button in slot 3');
  await page.waitForTimeout(600);
  const third = await takeJob([first, second], /2010-11/i);
  const thirdEra = await page.evaluate(k => { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw).eraId : null; }, KEY);
  if (!third || thirdEra !== 'era2010') { fail(`the 2010-11 manager did not start (club ${third}, era ${thirdEra})`); throw new Error('blocked'); }
  ok(`manager 3 at ${third}, 2010-11`);
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.locator('[data-testid="cm-slots"]').waitFor({ timeout: 10000 }).catch(() => {});
  await tap(/^resume career$/i, 'Resume Career in slot 1', page.locator('[data-testid="cm-slot-1"]'));
  await page.locator('[data-testid="cm-show-slots"]').waitFor({ timeout: 10000 }).catch(() => {});
  await page.locator('[data-testid="cm-show-slots"]').click({ timeout: 4000 }).catch(() => fail('no Managers button after opening slot 1'));
  await page.locator('[data-testid="cm-slots"]').waitFor({ timeout: 8000 }).catch(() => {});
  await tap(/^resume career$/i, 'Resume Career in slot 3', page.locator('[data-testid="cm-slot-3"]'));
  await page.locator('[data-testid="cm-show-slots"]').waitFor({ timeout: 15000 }).catch(() => {});
  const h3 = ((await page.locator('h1').first().innerText().catch(() => '')) || '').trim();
  if (h3 !== third) fail(`Resume Career on slot 3 opened "${h3}", not ${third}`);
  else ok(`slot 3 opened on ${third}'s 2010-11 hub, squads fetched by the boot`);
  if (await page.locator('[data-testid="cm-era-load-failed"]').count().catch(() => 0)) fail('the 2010-11 squads did not load');
} catch (e) {
  if (String(e && e.message) !== 'blocked') fail(`the walk threw: ${e && e.message ? e.message : e}`);
} finally {
  if (pageErrors.length) fail(`page errors: ${pageErrors.slice(0, 3).join(' | ')}`);
  console.log(`   database requests blocked: ${blocked}`);
  await browser.close().catch(() => {});
  if (server) server.kill();
}
if (failures) {
  console.log(`\nplayClubManagerSlots: RED, ${failures} failures`);
  process.exit(1);
}
console.log('\nplayClubManagerSlots: green');
