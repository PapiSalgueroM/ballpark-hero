/**
 * Round 634 browser proof: leaving Club Manager keeps the career.
 *
 * The first live report of 2026-09-13 was "Manager career doesnt save if you
 * leave the website". This drives the REAL built page in a real Chromium on a
 * phone viewport, the way the report was filed: take a job, buy one player,
 * play two weeks, then leave by navigating to another route (which fires
 * pagehide, the event a phone does fire, unlike beforeunload), reload, and
 * check the save came back with the signing and the week.
 *
 * The leave write is proved rather than assumed: right before leaving, the
 * save is deleted from storage. The hook's ordinary write runs from an effect
 * keyed on the career object, and nothing changes the career between the
 * delete and the navigation, so if the save is back on the next page the
 * pagehide listener wrote it and nothing else could have.
 *
 * Then the other half of the round: with the store stubbed to throw (what a
 * full or blocked browser does), a pagehide must put the plain banner on
 * screen, and after a reload with the store working the banner must be gone.
 * The banner must be absent for the whole ordinary walk.
 *
 * Serve nothing first: this file starts scripts/lib/hostLikeServer.mjs on
 * dist itself. Run npm run build, then:
 *   ENGINES=chromium node scripts/playClubManagerSaveLeave.mjs
 * SWEEP_BASE=<url> points it at a server that is already up.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4178);
const suppliedBase = !!process.env.SWEEP_BASE;
const BASE = process.env.SWEEP_BASE || `http://127.0.0.1:${PORT}`;
const KEY = 'dukb-club-manager-save';
const V = !!process.env.VERBOSE;

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
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e && e.message ? e.message : e)));

const text = async () => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
const heading = async () => ((await page.locator('h1').first().innerText().catch(() => '')) || '').trim().toUpperCase();
async function tap(rx, what) {
  const b = page.getByRole('button', { name: rx }).first();
  if (await b.count().catch(() => 0) === 0) { say(`no button for ${what}`); return false; }
  const done = await b.click({ timeout: 4000 }).then(() => true).catch(() => false);
  if (done) say(`pressed ${what}`);
  return done;
}
async function tapText(rx, what) {
  const b = page.locator('button:visible').filter({ hasText: rx }).first();
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
const saved = async () => page.evaluate(k => { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; }, KEY);
const bannerCount = async () => page.locator('[data-testid="cm-save-failed"]').count().catch(() => 0);

try {
  /* ---------- 1. take a job ---------- */
  console.log('1) Taking a job');
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await clearRoom();
  await tap(/2026-27/i, 'the 2026-27 era');
  await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(/England/i, 'England');
  await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(/Premier League/i, 'Premier League');
  const clubBtn = page.locator('button').filter({ hasText: /Everton|Fulham|Brentford|Crystal Palace|Wolves|Brighton/ }).first();
  await clubBtn.waitFor({ timeout: 8000 }).catch(() => {});
  await clubBtn.click({ timeout: 5000 }).catch(() => {});
  await tap(/take the job|confirm|start/i, 'the pinned confirm bar');
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(/skip: just manage/i, 'skip the dugout form');
  await page.waitForTimeout(800);
  let t = await text();
  if (!/Season 1/i.test(t)) { fail('could not get past the club picker, so nothing below ran'); throw new Error('blocked'); }
  const start = await saved();
  if (!start) { fail('no save on disk after taking the job'); throw new Error('blocked'); }
  ok(`in the job at ${start.clubName}, save on disk, week ${start.week}, squad ${start.squad.length}`);
  if (await bannerCount()) fail('the save banner is on screen on a working store');

  /* ---------- 2. buy one player ---------- */
  console.log('2) Buying one player through a release clause');
  await page.getByRole('tab', { name: /^Market$/i }).first().click({ timeout: 4000 }).catch(async () => { await tapText(/^Market$/i, 'the market tab'); });
  await page.waitForTimeout(600);
  /* The market lists the fifty best by rating, whose clauses sit far above a
     mid table budget, so the screen's own sort is switched to cheapest first
     the way a manager with 69m would. */
  const sortSelect = page.locator('select').filter({ has: page.locator('option[value="cheap"]') }).first();
  if (await sortSelect.count().catch(() => 0) > 0) {
    await sortSelect.selectOption('cheap').then(() => say('sorted the market cheapest first')).catch(() => {});
    await page.waitForTimeout(500);
  }
  const before = new Set(start.squad.map(p => p.name));
  const clause = page.locator('button:visible[title^="Release clause"]:not([disabled])').first();
  await clause.waitFor({ timeout: 8000 }).catch(() => {});
  let signing = null;
  if (await clause.count().catch(() => 0) === 0) {
    fail('no affordable release clause on the market, so no signing was made');
  } else {
    await clause.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(700);
    await tap(/confirm|yes|sign him|do it/i, 'confirm the signing').catch(() => {});
    await page.waitForTimeout(400);
    const after = await saved();
    const added = (after?.squad ?? []).map(p => p.name).filter(n => !before.has(n));
    if (added.length !== 1) fail(`expected exactly one new name in the saved squad after the clause, saw ${added.length}: ${added.join(', ')}`);
    else { signing = added[0]; ok(`signed ${signing}, saved squad ${after.squad.length}`); }
    const dupes = (after?.squad ?? []).map(p => p.name).filter((n, i, a) => a.indexOf(n) !== i);
    if (dupes.length) fail(`the saved squad holds a name twice: ${dupes.join(', ')}`);
  }

  /* ---------- 3. play two weeks ---------- */
  console.log('3) Playing two weeks with the quick sim');
  /* The overview tab is labelled Home, and the two ways through a match sit
     on it under data-cm-way. */
  await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 4000 }).catch(async () => { await tapText(/^Home$/, 'the home tab'); });
  await page.waitForTimeout(500);
  let weeksPlayed = 0;
  for (let step = 0; step < 14 && weeksPlayed < 2; step++) {
    const where = await heading();
    if (where === 'FULL TIME') {
      await tap(/continue|next|carry on|ok/i, 'continue from the report');
      await page.waitForTimeout(500);
      continue;
    }
    if (where === 'HALF TIME' || where === 'MATCH LIVE') {
      await tap(/second half|skip|full report/i, 'through the match');
      await page.waitForTimeout(500);
      continue;
    }
    const w = (await saved())?.week ?? 0;
    if (w >= 2) { weeksPlayed = w; break; }
    if (await tapText(/Quick Sim/i, 'quick sim')) { await page.waitForTimeout(900); continue; }
    if (await tapText(/Play Live|Play Match/i, 'play')) { await page.waitForTimeout(900); continue; }
    fail(`nothing to press at step ${step}: ${(await text()).slice(0, 120)}`);
    break;
  }
  const played = await saved();
  weeksPlayed = played?.week ?? 0;
  const results = (played?.resultLog ?? []).length;
  if (weeksPlayed < 2) fail(`only ${weeksPlayed} weeks are on disk after the quick sims`);
  if (results < 1) fail('no match result is on disk after the quick sims');
  ok(`week ${weeksPlayed} on disk, ${results} result${results === 1 ? '' : 's'} logged`);
  if (await bannerCount()) fail('the save banner is on screen on a working store after playing');

  /* ---------- 4. leave, with the disk emptied first ---------- */
  console.log('4) Leaving the page by navigating away, with the save deleted first so only the pagehide write can restore it');
  await page.evaluate(k => localStorage.removeItem(k), KEY);
  if (await saved()) { fail('the save did not delete, so the leave write cannot be told from the ordinary one'); }
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(500);
  const afterLeave = await saved();
  if (!afterLeave) fail('after leaving, no save is on disk: the pagehide write did not happen');
  else {
    const hasSigning = signing ? afterLeave.squad.some(p => p.name === signing) : false;
    ok(`after leaving: week ${afterLeave.week}, squad ${afterLeave.squad.length}, ${signing ? `${signing} ${hasSigning ? 'present' : 'MISSING'}` : 'no signing to check'}`);
    if (afterLeave.week !== weeksPlayed) fail(`the leave write holds week ${afterLeave.week}, the page had week ${weeksPlayed}`);
    if (signing && !hasSigning) fail(`the leave write lost the signing ${signing}`);
    if ((afterLeave.resultLog ?? []).length !== results) fail('the leave write holds a different result log');
  }

  /* ---------- 5. reload and resume ---------- */
  console.log('5) Reloading /club-manager: the resume screen and the save after the load repairs');
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await clearRoom();
  t = await text();
  const weekLine = new RegExp(`Week ${weeksPlayed + 1} of \\d+`);
  if (!/Resume Career/i.test(t)) fail('the resume screen did not offer Resume Career');
  if (!weekLine.test(t)) fail(`the resume screen does not say Week ${weeksPlayed + 1}: ${t.slice(0, 200)}`);
  else ok(`the resume screen says Week ${weeksPlayed + 1}`);
  await tap(/Resume Career/i, 'resume');
  await page.waitForTimeout(800);
  const resumed = await saved();
  if (!resumed) fail('no save on disk after resuming');
  else {
    if (resumed.week !== weeksPlayed) fail(`after resuming the save is at week ${resumed.week}`);
    if (signing && !resumed.squad.some(p => p.name === signing)) fail(`after resuming the signing ${signing} is gone`);
    else ok(`resumed at week ${resumed.week} with ${signing ?? 'the squad'} on the books`);
  }
  if (await bannerCount()) fail('the save banner is on screen after a clean resume');

  /* ---------- 6. the banner when the store refuses ---------- */
  console.log('6) The banner: on when the store throws at a pagehide, gone after a reload with the store working');
  await page.evaluate(() => { Storage.prototype.setItem = function () { throw new Error('QuotaExceededError (stubbed by the harness)'); }; });
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.waitForTimeout(500);
  const shown = await bannerCount();
  const bannerText = shown ? (await page.locator('[data-testid="cm-save-failed"]').first().innerText().catch(() => '')) : '';
  if (!shown) fail('the store refused the write and no banner appeared');
  else if (!/not being saved/i.test(bannerText)) fail(`the banner is on screen but does not say the career is not being saved: ${bannerText.slice(0, 120)}`);
  else ok(`the banner appeared: "${bannerText.replace(/\s+/g, ' ').slice(0, 90)}..."`);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1000);
  await clearRoom();
  await tap(/Resume Career/i, 'resume again');
  await page.waitForTimeout(800);
  if (await bannerCount()) fail('the banner is still on screen after a reload with the store working');
  else ok('after a reload with the store working, no banner');

  if (pageErrors.length) fail(`the page threw: ${pageErrors[0]}`);
} catch (e) {
  if (String(e.message) !== 'blocked') fail(`the walk threw: ${e.message}`);
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}

if (failures) {
  console.log(`\nplayClubManagerSaveLeave: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('\nplayClubManagerSaveLeave: green, the career survived leaving the page and the banner behaves');
