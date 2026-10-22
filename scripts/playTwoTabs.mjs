/**
 * Round 1323 walk: one tab wins, in a real browser with two tabs on one save.
 *
 * Two pages in ONE browser context share storage exactly as two tabs do. The
 * built dist is served by scripts/lib/hostLikeServer.mjs (or SWEEP_BASE / BASE
 * when a server is already up); Supabase and ad hosts are aborted, so nothing
 * here reaches the live database. Fixture saves are made by the real engine
 * in this process and planted from /robots.txt, a page no game runs on, so no
 * game write can touch them first. At 320 by 640, 390 by 844 and 1280 by 900.
 *
 *   1 CLOBBER   the hunt's B1: tab A on a career, tab B opens it and plays
 *               three matches, A shows the notice, A leaves: the save on disk
 *               is still B's, and B reloads onto B's week.
 *   2 REPLAY    three times: B plays the fixture, A presses Quick Sim where it
 *               was (the notice takes the press), then the walk forces the
 *               press past the notice with dispatchEvent: the last result on
 *               disk is B's every time.
 *   3 HOT SEAT  B carries a surviving Hot Seat manager on into Club Manager
 *               while A holds a career: A shows the notice and its leave write
 *               does not land over the handover.
 *   4 LANDING   after the carry on, /club-manager opens on the hub (no Resume
 *               Career press, no managers screen).
 *   5 DAMAGED   the hunt's ten damaged saves. Each ends on a playable hub with
 *               no "NaN", or on the managers screen with the damaged line and,
 *               after Clear, a backup key holding the original bytes byte for
 *               byte. Never on the picker without a word. The cases m16 does
 *               not name are recorded, not judged.
 *   6 PUT BACK  B puts a backup back through the restore card while A holds a
 *               career: A's leave write afterwards does not overwrite it.
 *   7 OLD SAVE  a save with no fence key anywhere (the base build's) opens,
 *               plays a week and is fenced from then on.
 *   8 NOTICE    scrollY and the document height are the same before and after
 *               it shows; Reload is at least 44 px tall; no text under 12 px;
 *               the dialog sits inside the viewport; Tab and a click where
 *               Quick Sim was reach nothing behind it; no animation, reduced
 *               motion or not.
 *   9 BACK      the review's door: tab A comes in by a link from the home page
 *               (so Back stays in the same document), B plays three, A shows
 *               the notice and leaves by the browser's Back, once mid Play
 *               Live and once on the hub: the save on disk is still B's. Then
 *               that same document carries a Hot Seat job on, which must land
 *               (a stale page lets go of the fence once its unmount is over).
 *               Proven against the code on a runner by mutation, not by a
 *               control here: the old unconditional release and a release
 *               before the last write each turn this case red (see the round's
 *               notes), and a page that never lets go turns its carry on red.
 *
 * SOCCER CAREER (Round 1330), in a context of their own with every page seeded
 * (A and B on different seeds) and each page's own writes of soccerCareerSave
 * counted; the fixture is a first pro hub played by the real engine:
 *  10 REPLACE   the hunt's MAJOR 3: A opens, B opens (A shows the notice at
 *               once), B plays a season; A's press where Next Season was is
 *               taken by the notice, a press forced past it writes nothing;
 *               the save is B's byte for byte; A reloads onto B's season.
 *  11 REVERSE   A, now the newest, plays on; B shows the notice and its forced
 *               press writes nothing.
 *  12 NEW CAREER a stale tab's forced New Career clears nothing; a tab on the
 *               creation screen cannot Begin Career over one another tab began.
 *  13 WEEK BY WEEK A has the Season Centre open, B plays on: the notice covers
 *               the Centre and A's forced presses write nothing (A's writes to
 *               seasonCentre:v1:soccer are printed, not judged: owed).
 *  14 OLD SAVE  a save with no fence key opens, plays and is fenced, a second
 *               tab stales it, and the notice passes case 8's checks plus focus
 *               on Reload and no toast left showing.
 *  15 RETIRE    (Round 1343) A holds a career at its season end, B plays the next
 *               season's first match: A's door press is taken by the notice and a
 *               Yes forced past it writes nothing. Then C retires and the stale
 *               B's forced Quick Sim writes nothing: the disk stays retired.
 *
 * NEGATIVE CONTROLS (TWO_TABS_CONTROL; each counts what it dropped and a
 * control that dropped nothing exits 2):
 *   nofence   an init script drops every write to a 'dukb-fence:' key in every
 *             page: cases 1, 2, 3, 6 and 9 go red, and the soccer cases 10, 11,
 *             12 and 14, and case 15.
 *   nolanding drops the carry on's one shot mark: case 4 goes red.
 *   nokeep    drops every write to a key holding '.broken-': case 5's backup
 *             check goes red.
 *
 * Pictures of every case at every size go to RC_OUT (or two-tabs-artifacts/).
 * Run: ENGINES=chromium node scripts/playTwoTabs.mjs   [SIZES=390x844] [CASES=9] [TWO_TABS_CONTROL=...]
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';
import { answerConsent } from './lib/answerConsent.mjs';
import { seedPages } from './lib/pageSeed.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4179);
const BASE = process.env.SWEEP_BASE || process.env.BASE || `http://127.0.0.1:${PORT}`;
const supplied = !!(process.env.SWEEP_BASE || process.env.BASE);
const KEY = 'dukb-club-manager-save';
const FENCE = 'dukb-fence:' + KEY;
const OUT = process.env.RC_OUT || path.join(ROOT, 'two-tabs-artifacts');
fs.mkdirSync(OUT, { recursive: true });
const CONTROL = process.env.TWO_TABS_CONTROL || '';
const CONTROLS = { nofence: [1, 2, 3, 6, 9, 10, 11, 12, 14, 15], nolanding: [4], nokeep: [5] };
if (CONTROL && !(CONTROL in CONTROLS)) { console.error(`TWO_TABS_CONTROL=${CONTROL} is not a control here (${Object.keys(CONTROLS).join(', ')})`); process.exit(1); }
const SIZES = (process.env.SIZES || '320x640,390x844,1280x900').split(',').map(s => s.split('x').map(Number));
const NOTICE_WORDS = 'This career moved on in another tab. Reload to carry on.';

const red = new Map();
const fail = (c, m) => { (red.get(c) ?? red.set(c, []).get(c)).push(m); console.log(`  FAIL [case ${c}]: ${m}`); };
const ok = m => console.log(`  ok    ${m}`);
const note = m => console.log(`  note  ${m}`);
let drops = 0;

/* ---------- the server ---------- */
let server = null;
async function up() {
  for (let i = 0; i < 60; i++) {
    if (await fetch(`${BASE}/`).then(r => r.ok).catch(() => false)) return true;
    await new Promise(r => setTimeout(r, 250));
  }
  return false;
}
if (!supplied) {
  if (await fetch(`${BASE}/`).then(r => r.ok).catch(() => false)) { console.error(`port ${PORT} already answers, refusing to test an unknown server`); process.exit(2); }
  server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), path.join(ROOT, 'dist'), String(PORT)], { stdio: 'ignore' });
}
if (!await up()) { console.error(`nothing answered at ${BASE}`); server?.kill(); process.exit(2); }

/* ---------- the fixtures, made by the real engine in this process ---------- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'twoTabs-'));
const stubStore = new Map();
globalThis.localStorage = { getItem: k => (stubStore.has(k) ? stubStore.get(k) : null), setItem: (k, v) => { stubStore.set(k, String(v)); }, removeItem: k => { stubStore.delete(k); } };
{
  const P = rel => JSON.stringify(path.join(ROOT, rel).split(path.sep).join('/'));
  fs.writeFileSync(path.join(TMP, 'entry.mjs'), `export * as cm from ${P('src/lib/clubManager.ts')};\nexport * as hs from ${P('src/lib/managerHotSeat.ts')};\n`);
  await build({
    entryPoints: [path.join(TMP, 'entry.mjs')], outfile: path.join(TMP, 'bundle.mjs'), bundle: true, format: 'esm', platform: 'node',
    logLevel: 'error', absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') },
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
  });
}
const { cm, hs } = await import(pathToFileURL(path.join(TMP, 'bundle.mjs')).href);
function seeded(n) {
  let a = (n * 2654435761 + 0x2f6b9) >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const realRandom = Math.random;
Math.random = seeded(1323);
const careerRaw = club => { stubStore.clear(); cm.saveCareer(cm.startCareer(club)); return stubStore.get(KEY); };
const BRIGHTON = careerRaw('Brighton');
const EVERTON = careerRaw('Everton');
let HOT = null;
{
  const pool = hs.hotSeatPool();
  for (let k = 0; k < 60 && !HOT; k++) {
    const setup = { club: pool[(k * 7) % pool.length].club, seed: (1000 + k) >>> 0 };
    let r = hs.startHotSeat(setup);
    for (let g = 0; !r.verdict && g < 40; g++) r = hs.pendingPress(r) ? hs.answerHotSeatPress(r, 0) : hs.playHotSeatMatch(r, 'balanced', null);
    if (!hs.canCarryOn(r)) continue;
    const again = hs.replayHotSeat(setup, r.actions);
    if (again.verdict?.kind === r.verdict.kind) HOT = { v: 1, club: setup.club, seed: setup.seed, actions: r.actions, done: true, kind: r.verdict.kind };
  }
}
Math.random = realRandom;
fs.rmSync(TMP, { recursive: true, force: true });
if (!BRIGHTON || !EVERTON) { console.error('the engine made no fixture save'); server?.kill(); process.exit(2); }
console.log(`fixtures: Brighton ${BRIGHTON.length} chars, Everton ${EVERTON.length} chars, Hot Seat survivor ${HOT ? `${HOT.club} (${HOT.kind}, ${HOT.actions.length} actions)` : 'none found'}`);

/* ---------- the browser ---------- */
const browser = await chromium.launch();
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
async function newContext(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  await ctx.route(BLOCK, r => r.abort());
  await ctx.exposeBinding('__twoTabsDrop', () => { drops += 1; });
  if (CONTROL) {
    await ctx.addInitScript(control => {
      const drop = k => (control === 'nofence' && String(k).startsWith('dukb-fence:'))
        || (control === 'nolanding' && String(k) === 'dukb-cm-land-on-hub')
        || (control === 'nokeep' && String(k).includes('.broken-'));
      const real = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (drop(k)) { try { window.__twoTabsDrop(); } catch { /* counted where it can be */ } return; }
        return real.call(this, k, v);
      };
    }, CONTROL);
  }
  return ctx;
}
const errorsOf = new WeakMap();
async function newPage(ctx) {
  const p = await ctx.newPage();
  errorsOf.set(p, []);
  p.on('pageerror', e => errorsOf.get(p).push(String(e?.message ?? e).slice(0, 200)));
  return p;
}
/** Plant storage from a page no game runs on, so no game can write first. */
async function plant(p, entries) {
  await p.goto(BASE + '/robots.txt', { waitUntil: 'domcontentloaded' });
  await p.evaluate(kv => { localStorage.clear(); for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v); }, entries);
}
const disk = p => p.evaluate(k => {
  const raw = localStorage.getItem(k);
  if (!raw) return null;
  try {
    const c = JSON.parse(raw);
    const log = c.resultLog ?? [];
    const last = log[log.length - 1];
    return { club: c.clubName, week: c.week, results: log.length, last: last ? `${last.opp} ${last.score}` : 'none', squad: (c.squad ?? []).length, xi: c.xiIds, budget: c.budget, live: c.live ? `minute ${c.live.minute ?? '?'}` : 'none' };
  } catch { return { unreadable: true }; }
}, KEY);
const say = d => (d ? `${d.club} week ${d.week}, ${d.results} results, last ${d.last}` : 'no save');
const noticeUp = p => p.locator('[data-testid="save-moved-notice"]').isVisible().catch(() => false);
const onHub = p => p.locator('[data-cm-way="quick"]').first().isVisible().catch(() => false);
const onSlots = p => p.locator('[data-testid="cm-slots"]').isVisible().catch(() => false);
const text = async p => (await p.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
async function clearBanner(p) {
  await answerConsent(p, { wait: 1200 });
}
/** A game's rules open by themselves on a first visit: closed the way a player closes them. */
async function clearDialogs(p) {
  for (let i = 0; i < 3; i++) {
    const d = p.locator('[role="dialog"]:visible');
    if (await d.count().catch(() => 0) === 0) return;
    await p.keyboard.press('Escape').catch(() => {});
    await p.waitForTimeout(300);
  }
  await p.locator('[role="dialog"]:visible button[aria-label="Close"], [role="dialog"]:visible button:has-text("Close")').first().click({ timeout: 1000 }).catch(() => {});
}
/** Open Club Manager the way a player does: the page, then Resume Career if the managers screen asks. */
async function openCM(p, { resume = true } = {}) {
  await p.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.locator('[data-cm-way="quick"], [data-testid="cm-slots"], button:has-text("2026-27")').first().waitFor({ timeout: 20000 }).catch(() => {});
  await clearBanner(p);
  if (resume && await onSlots(p)) {
    await p.getByRole('button', { name: 'Resume Career', exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  }
  if (resume) await p.locator('[data-cm-way="quick"]').first().waitFor({ timeout: 15000 }).catch(() => {});
}
/** One Quick Sim, through to the report and back. */
async function quick(p) {
  const btn = p.locator('[data-cm-way="quick"]').first();
  if (!await btn.isVisible().catch(() => false)) return false;
  await btn.click({ timeout: 5000 }).catch(() => {});
  await p.getByRole('heading', { name: 'FULL TIME', exact: true }).waitFor({ timeout: 15000 }).catch(() => {});
  await p.getByRole('button', { name: /^Continue$/i }).first().click({ timeout: 5000 }).catch(() => {});
  await p.locator('[data-cm-way="quick"]').first().waitFor({ timeout: 15000 }).catch(() => {});
  return true;
}
async function waitNotice(p, ms = 6000) {
  for (let t = 0; t < ms; t += 250) { if (await noticeUp(p)) return true; await p.waitForTimeout(250); }
  return false;
}
const shot = async (p, name) => { await p.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 55 }).catch(() => {}); };

/* ---------- the cases ---------- */
async function caseClobber(ctx, tag) {
  console.log(`1) CLOBBER, and 8) THE NOTICE (${tag})`);
  const A = await newPage(ctx);
  await plant(A, { [KEY]: BRIGHTON });
  await openCM(A);
  await quick(A);
  const start = await disk(A);
  /* Case 8's before: scrolled a little, as a player would be. */
  await A.evaluate(() => window.scrollTo(0, 120));
  await A.waitForTimeout(300);
  const before = await A.evaluate(() => ({ y: window.scrollY, h: document.documentElement.scrollHeight }));
  const quickBox = await A.locator('[data-cm-way="quick"]').first().boundingBox().catch(() => null);
  const B = await newPage(ctx);
  await openCM(B);
  const up = await waitNotice(A);
  for (let i = 0; i < 3; i++) await quick(B);
  const afterB = await disk(B);
  await shot(A, `${tag}-1-notice-over-hub`);
  if (up) await caseNotice(A, before, quickBox, afterB, tag);
  await A.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); // tab A leaves: pagehide, the leave write
  await B.waitForTimeout(800);
  const afterLeave = await disk(B);
  await openCM(B);
  const reloaded = await disk(B);
  const bText = await text(B);
  console.log(`   start ${say(start)} | after B played three ${say(afterB)} | after A left ${say(afterLeave)} | A saw the notice: ${up}`);
  if (!up) fail(1, 'tab A never showed the notice after tab B opened the career and played on');
  if (!afterB || !start || afterB.results < start.results + 3) fail(1, `tab B did not play three matches (${say(start)} to ${say(afterB)})`);
  if (say(afterLeave) !== say(afterB)) fail(1, `CLOBBER: tab A's leave took the save from "${say(afterB)}" to "${say(afterLeave)}"`);
  else ok('A left after B played three: the save is still B\'s');
  if (say(reloaded) !== say(afterB) || await noticeUp(B)) fail(1, `B reloaded onto "${say(reloaded)}" (notice up: ${await noticeUp(B)})`);
  if (!/Season 1/i.test(bText)) note('B after reload did not read "Season 1" on screen');
  await shot(B, `${tag}-1-tabB-after-reload`);
  await A.close();
  await B.close();
}
async function caseNotice(A, before, quickBox, afterB, tag) {
  const n = A.locator('[data-testid="save-moved-notice"]');
  const after = await A.evaluate(() => ({ y: window.scrollY, h: document.documentElement.scrollHeight }));
  if (after.y !== before.y || after.h !== before.h) fail(8, `the page moved under the notice: scrollY ${before.y} to ${after.y}, height ${before.h} to ${after.h}`);
  else ok(`no jump: scrollY ${after.y} and height ${after.h} before and after`);
  const words = (await n.innerText().catch(() => '')).replace(/\s+/g, ' ');
  if (!words.includes(NOTICE_WORDS)) fail(8, `the notice reads "${words}"`);
  const reload = n.getByRole('button', { name: 'Reload' });
  const rb = await reload.boundingBox().catch(() => null);
  if (!rb || rb.height < 44) fail(8, `Reload is ${rb ? rb.height : 'not'} px tall`);
  const geo = await n.evaluate(el => {
    const card = el.firstElementChild.getBoundingClientRect();
    let min = 99;
    for (const t of el.querySelectorAll('*')) if (t.childNodes.length && [...t.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())) min = Math.min(min, parseFloat(getComputedStyle(t).fontSize));
    return { left: card.left, right: card.right, top: card.top, bottom: card.bottom, vw: innerWidth, vh: innerHeight, min, anims: el.getAnimations({ subtree: true }).length, focusIn: !!document.activeElement?.closest('[data-testid="save-moved-notice"]') };
  });
  if (geo.min < 12) fail(8, `text at ${geo.min}px in the notice`);
  if (geo.left < 0 || geo.right > geo.vw || geo.top < 0 || geo.bottom > geo.vh) fail(8, `the dialog runs off the screen: ${JSON.stringify(geo)}`);
  if (geo.anims) fail(8, `${geo.anims} animations on the notice`);
  if (!geo.focusIn) fail(8, 'focus is not on the notice when it shows');
  await A.emulateMedia({ reducedMotion: 'reduce' });
  const animsReduced = await n.evaluate(el => el.getAnimations({ subtree: true }).length);
  await A.emulateMedia({ reducedMotion: null });
  if (animsReduced) fail(8, `${animsReduced} animations under reduced motion`);
  /* Nothing behind it takes a key or a press. */
  let escaped = 0;
  for (let i = 0; i < 6; i++) {
    await A.keyboard.press('Tab');
    if (!await A.evaluate(() => !document.activeElement || document.activeElement === document.body || !!document.activeElement.closest('[data-testid="save-moved-notice"]'))) escaped += 1;
  }
  if (escaped) fail(8, `Tab reached ${escaped} elements behind the notice`);
  if (quickBox) {
    /* A point of Quick Sim's box that is not the Reload button itself (on a
       small phone the dialog can sit right over it, and pressing Reload is a
       reload, not a press reaching the page). */
    const inReload = (px, py) => rb && px >= rb.x && px <= rb.x + rb.width && py >= rb.y && py <= rb.y + rb.height;
    const pts = [[0.5, 0.5], [0.15, 0.5], [0.85, 0.5], [0.5, 0.15], [0.5, 0.85], [0.1, 0.1], [0.9, 0.9]]
      .map(([fx, fy]) => [quickBox.x + quickBox.width * fx, quickBox.y + quickBox.height * fy]);
    const pt = pts.find(([px, py]) => !inReload(px, py));
    if (!pt) { note('every point of Quick Sim sits under the Reload button at this size; the click is skipped'); }
    const [x, y] = pt ?? [-1, -1];
    if (pt) {
    const hit = await A.evaluate(([px, py]) => !!document.elementFromPoint(px, py)?.closest('[data-testid="save-moved-notice"]'), [x, y]);
    await A.mouse.click(x, y);
    await A.waitForTimeout(800);
    if (!hit) fail(8, 'the point where Quick Sim was is not covered by the notice');
    if (say(await disk(A)) !== say(afterB)) fail(8, 'a click where Quick Sim was changed the save');
    if (!await noticeUp(A)) fail(8, 'the notice went away after a click where Quick Sim was');
    }
  }
  await shot(A, `${tag}-8-notice`);
  ok(`the notice: Reload ${rb ? Math.round(rb.height) : '?'} px, smallest text ${geo.min} px, no animation, Tab stayed inside ${escaped === 0}`);
}

async function caseReplay(ctx, tag) {
  console.log(`2) REPLAY, three times (${tag})`);
  const A = await newPage(ctx);
  await plant(A, { [KEY]: BRIGHTON });
  for (let i = 0; i < 3; i++) {
    await openCM(A);
    const B = await newPage(ctx);
    await openCM(B);
    await quick(B);
    const theirs = await disk(B);
    await waitNotice(A, 4000);
    /* The press as a player makes it: the notice takes it. */
    const pressed = await A.locator('[data-cm-way="quick"]').first().click({ timeout: 1500 }).then(() => true).catch(() => false);
    await A.waitForTimeout(600);
    const afterPress = await disk(A);
    /* Then forced past the notice, straight at the button. */
    await A.evaluate(() => document.querySelector('[data-cm-way="quick"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await A.waitForTimeout(1500);
    await A.evaluate(() => document.querySelector('[data-cm-way="quick"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await A.waitForTimeout(1500);
    const afterForced = await disk(A);
    console.log(`   REPLAY ${i}: B wrote "${say(theirs)}"; A's press went through: ${pressed}; on disk after A's press "${say(afterPress)}", after the forced press "${say(afterForced)}"`);
    if (pressed) fail(2, `REPLAY ${i}: the press reached Quick Sim behind the notice`);
    if (say(afterPress) !== say(theirs) || say(afterForced) !== say(theirs)) fail(2, `REPLAY ${i}: the stale tab changed the save from "${say(theirs)}" to "${say(afterForced)}"`);
    if (i === 0) await shot(A, `${tag}-2-replay-notice`);
    await B.close();
  }
  await A.close();
}

async function caseHotSeat(ctx, tag) {
  console.log(`3) HOT SEAT carry on beside a Club Manager tab, and 4) LANDING (${tag})`);
  if (!HOT) { fail(3, 'no surviving Hot Seat manager to hand over'); fail(4, 'no carry on to land'); return; }
  const A = await newPage(ctx);
  await plant(A, { [KEY]: BRIGHTON, 'manager-hot-seat-free': JSON.stringify(HOT) });
  await openCM(A);
  await quick(A);
  const held = await disk(A);
  const B = await newPage(ctx);
  await B.goto(BASE + '/manager-hot-seat', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await B.waitForTimeout(1500);
  await clearBanner(B);
  await clearDialogs(B);
  const offer = B.getByRole('button', { name: `See the Club Manager offer for ${HOT.club}` });
  if (!await offer.first().isVisible().catch(() => false)) await shot(B, `${tag}-3-hot-seat-menu`);
  await offer.first().click({ timeout: 15000 }).catch(() => {});
  await B.getByRole('button', { name: 'Carry on in Club Manager' }).first().click({ timeout: 15000 }).catch(() => {});
  await B.getByRole('button', { name: /^Replace it and carry on/ }).first().click({ timeout: 8000 }).catch(() => {});
  await B.waitForURL(/\/club-manager/, { timeout: 15000 }).catch(() => {});
  await B.locator('[data-cm-way="quick"], [data-testid="cm-slots"]').first().waitFor({ timeout: 20000 }).catch(() => {});
  await clearBanner(B);
  const landedHub = await onHub(B);
  const landedSlots = await onSlots(B);
  await shot(B, `${tag}-4-landing`);
  const handed = await disk(B);
  const up = await waitNotice(A);
  await shot(A, `${tag}-3-notice-after-handover`);
  await A.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await B.waitForTimeout(800);
  const afterLeave = await disk(B);
  console.log(`   A held "${say(held)}"; B handed over "${say(handed)}" and landed on ${landedHub ? 'the hub' : landedSlots ? 'the managers screen' : 'something else'}; A saw it: ${up}; after A left "${say(afterLeave)}"`);
  if (!handed || handed.club !== HOT.club) fail(3, `the handover did not land: the save holds "${say(handed)}", not ${HOT.club}`);
  if (!up) fail(3, 'tab A never showed the notice after the handover');
  if (say(afterLeave) !== say(handed)) fail(3, `tab A's leave write put "${say(afterLeave)}" over the handover "${say(handed)}"`);
  if (!landedHub || landedSlots) fail(4, `the carry on landed on ${landedSlots ? 'the managers screen, one press short' : 'no hub'}`);
  else ok('the carry on opened Club Manager on the hub');
  await A.close();
  await B.close();
}

/* The hunt's ten damaged saves (qa-cm r6), made from a good save. */
const DAMAGE = [
  ['truncated', (o, raw) => raw.slice(0, Math.floor(raw.length / 2)), 'kept'],
  ['budget-text', o => JSON.stringify({ ...o, budget: String(o.budget) }), 'hub'],
  ['budget-junk', o => JSON.stringify({ ...o, budget: 'lots' }), 'hub'],
  ['budget-negative', o => JSON.stringify({ ...o, budget: -250 }), 'record'],
  ['week-past-end', o => JSON.stringify({ ...o, week: o.calendar.length + 5 }), 'record'],
  ['squad-five', o => JSON.stringify({ ...o, squad: o.squad.slice(0, 5) }), 'hub'],
  ['xi-missing', o => JSON.stringify({ ...o, xiIds: o.xiIds.map((id, i) => (i < 2 ? `nobody-${i}` : id)) }), 'hub'],
  ['inbox-spam', o => JSON.stringify({ ...o, inbox: Array.from({ length: 400 }, (_, i) => ({ id: 'x' + i, playerName: 'Nobody', playerId: 'zz', kind: 'praise', text: 'Spam ' + i, options: [], week: 1 })) }), 'record'],
  ['unknown-club', o => JSON.stringify({ ...o, clubName: 'Atlantis Wanderers' }), 'record'],
  ['board-zero', o => JSON.stringify({ ...o, boardConfidence: 0 }), 'record'],
  ['fitness-nan', o => JSON.stringify({ ...o, squad: o.squad.map(p => ({ ...p, fitness: 'x', morale: null })) }), 'record'],
];
async function caseDamaged(ctx, tag) {
  console.log(`5) DAMAGED saves (${tag})`);
  const P = await newPage(ctx);
  const good = JSON.parse(BRIGHTON);
  for (const [label, mut, want] of DAMAGE) {
    const bytes = mut(good, BRIGHTON);
    const e0 = errorsOf.get(P).length;
    await plant(P, { [KEY]: bytes });
    await openCM(P, { resume: false });
    await P.waitForTimeout(500);
    let where = (await onHub(P)) ? 'hub' : (await onSlots(P)) ? 'slots' : 'other';
    const damagedLine = await P.locator('[data-testid="cm-slot-1-damaged"]').isVisible().catch(() => false);
    await shot(P, `${tag}-5-${label}-open`);
    let kept = null;
    if (where === 'slots' && damagedLine) {
      const tile = P.locator('[data-testid="cm-slot-1"]');
      const clearBtn = tile.getByRole('button', { name: 'Clear it, new manager' });
      const box = await clearBtn.boundingBox().catch(() => null);
      if (box && box.height < 44) fail(5, `${label}: the damaged tile's button is ${box.height} px tall`);
      await clearBtn.click({ timeout: 5000 }).catch(() => {});
      await shot(P, `${tag}-5-${label}-confirm`);
      await tile.getByRole('button', { name: 'Clear it', exact: true }).click({ timeout: 5000 }).catch(() => {});
      await P.waitForTimeout(800);
      kept = await P.evaluate(([k, b]) => Object.keys(localStorage).filter(x => x.startsWith(k + '.broken-') && localStorage.getItem(x) === b).length, [KEY, bytes]);
      where = 'slots, then cleared';
    } else if (where === 'slots') {
      await P.getByRole('button', { name: 'Resume Career', exact: true }).first().click({ timeout: 5000 }).catch(() => {});
      await P.locator('[data-cm-way="quick"]').first().waitFor({ timeout: 15000 }).catch(() => {});
      where = (await onHub(P)) ? 'hub' : 'slots, no hub';
    }
    const t = await text(P);
    const d = await disk(P);
    const picker = !(await onHub(P)) && !(await onSlots(P)) && /2026-27/.test(t) && where === 'other';
    const errs = errorsOf.get(P).slice(e0);
    console.log(`   ${label}: ${where}${damagedLine ? ' (damaged line shown)' : ''}${kept !== null ? `, ${kept} backup(s) holding the bytes` : ''}; save ${d ? (d.unreadable ? 'unreadable' : `squad ${d.squad}, budget ${d.budget}`) : 'none'}; NaN on screen: ${/NaN/.test(t)}; errors ${errs.length}${errs[0] ? ` (${errs[0]})` : ''}`);
    if (want === 'record') continue; // a case m16 does not name: recorded above, not judged
    if (picker) fail(5, `${label}: the picker opened without a word`);
    if (want === 'kept') {
      if (!damagedLine) fail(5, `${label}: no damaged line on the managers screen (landed on ${where})`);
      else if (!kept) fail(5, `${label}: after Clear no backup holds the original bytes`);
      else ok(`${label}: kept, ${kept} backup byte for byte`);
      continue;
    }
    if (where !== 'hub') { fail(5, `${label}: did not open a playable hub (${where})`); continue; }
    if (/NaN/.test(t)) fail(5, `${label}: "NaN" on the hub`);
    if (label === 'budget-text' && /[£€$]0k\b/.test(t)) fail(5, `${label}: a repaired budget shows as zero`);
    if (label === 'squad-five' && (!d || d.squad < 14)) fail(5, `${label}: the squad is ${d?.squad} after opening`);
    if (label === 'xi-missing' && (!d || d.xi.some(id => String(id).startsWith('nobody-')) || /XI avg(?:erage)? 0\b/i.test(t))) fail(5, `${label}: the XI still names nobody`);
    if (errs.length) fail(5, `${label}: ${errs.length} page errors (${errs[0]})`);
  }
  await P.close();
}

async function casePutBack(ctx, tag) {
  console.log(`6) PUT BACK through the restore card beside a Club Manager tab (${tag})`);
  const A = await newPage(ctx);
  await plant(A, { [KEY]: BRIGHTON, [`${KEY}.broken-2026-10-01T00-00-00`]: EVERTON });
  await openCM(A);
  await quick(A);
  const B = await newPage(ctx);
  await B.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await clearBanner(B);
  const put = B.getByRole('button', { name: 'Put that save back' }).first();
  const offered = await put.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  if (offered) {
    await put.click({ timeout: 5000 }).catch(() => {});
    await B.waitForLoadState('domcontentloaded').catch(() => {});
    await B.locator('[data-cm-way="quick"], [data-testid="cm-slots"]').first().waitFor({ timeout: 20000 }).catch(() => {});
    if (await onSlots(B)) await B.getByRole('button', { name: 'Resume Career', exact: true }).first().click({ timeout: 5000 }).catch(() => {});
    await B.locator('[data-cm-way="quick"]').first().waitFor({ timeout: 15000 }).catch(() => {});
  }
  const putBackSave = await disk(B);
  const up = await waitNotice(A);
  await A.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await B.waitForTimeout(800);
  const afterLeave = await disk(B);
  console.log(`   offered: ${offered}; put back "${say(putBackSave)}"; A saw it: ${up}; after A left "${say(afterLeave)}"`);
  if (!offered) fail(6, 'the restore card never offered the planted backup');
  else if (!putBackSave || putBackSave.club !== 'Everton') fail(6, `the put back did not land: "${say(putBackSave)}"`);
  if (!up) fail(6, 'tab A never showed the notice after the put back');
  if (say(afterLeave) !== say(putBackSave)) fail(6, `tab A's leave write put "${say(afterLeave)}" over the put back "${say(putBackSave)}"`);
  await A.close();
  await B.close();
}

async function caseOldSave(ctx, tag) {
  console.log(`7) OLD SAVE with no fence key (${tag})`);
  const P = await newPage(ctx);
  await plant(P, { [KEY]: BRIGHTON });
  const g0 = await P.evaluate(k => localStorage.getItem(k), FENCE);
  await openCM(P);
  const start = await disk(P);
  await quick(P);
  const after = await disk(P);
  const g1 = await P.evaluate(k => localStorage.getItem(k), FENCE);
  const B = await newPage(ctx);
  await openCM(B);
  const up = await waitNotice(P);
  console.log(`   fence before ${g0 ?? 'absent'}, after a week ${g1}; ${say(start)} to ${say(after)}; a second tab stales it: ${up}`);
  if (g0 !== null) fail(7, 'the planted old save already had a fence key');
  if (!after || !start || after.results <= start.results) fail(7, `the old save did not play a week (${say(start)} to ${say(after)})`);
  if (!(Number(g1) >= 1)) fail(7, `no fence after the first write (${g1})`);
  if (!up) fail(7, 'the old save was not fenced: a second tab did not stale it');
  await P.close();
  await B.close();
}

/** Into /club-manager by an in-app link from the home page, so Back pops the router and stays in this document. */
async function spaIntoCM(p) {
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await clearBanner(p);
  const link = p.locator('a[href="/club-manager"]:visible').first();
  if (await link.count().catch(() => 0)) await link.click({ timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(800);
  let how = 'a link';
  if (!p.url().endsWith('/club-manager')) {
    how = 'the router';
    await p.evaluate(() => { history.pushState({}, '', '/club-manager'); window.dispatchEvent(new PopStateEvent('popstate', { state: {} })); });
  }
  await p.locator('[data-cm-way="quick"], [data-testid="cm-slots"]').first().waitFor({ timeout: 20000 }).catch(() => {});
  await clearBanner(p);
  if (await onSlots(p)) await p.getByRole('button', { name: 'Resume Career', exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  const hub = await p.locator('[data-cm-way="quick"]').first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  return { how, hub };
}
/* The review's door (r1323-run-d W1): a stale tab that came in by a link and
   leaves by the browser's Back stays in the same document, so no pagehide
   fires; the page unmounts instead. Mid Play Live, the live viewer's own
   unmount write ran after the hook had let go of the fence and put the stale
   career back over three matches. On the hub, a release before the hook's own
   last write would do the same. Then, in that same document, a Hot Seat carry
   on (a claim) must still land: a stale page that never lets go would refuse
   every later write of this game until a reload. */
async function caseBack(ctx, tag) {
  console.log(`9) BACK: a stale tab leaves by the browser's Back, mid Play Live and on the hub (${tag})`);
  for (const live of [true, false]) {
    const how = live ? 'mid Play Live' : 'on the hub';
    const A = await newPage(ctx);
    await plant(A, HOT ? { [KEY]: BRIGHTON, 'manager-hot-seat-free': JSON.stringify(HOT) } : { [KEY]: BRIGHTON });
    const into = await spaIntoCM(A);
    if (!into.hub) { fail(9, `${how}: tab A never reached the hub by ${into.how}`); await A.close(); continue; }
    if (live) {
      await A.locator('button:visible[data-cm-way="live"]').first().click({ timeout: 5000 }).catch(() => {});
      const clock = A.locator('[data-cm-live-minute]').first();
      const staged = await clock.waitFor({ state: 'attached', timeout: 15000 }).then(() => true).catch(() => false);
      await A.waitForTimeout(5000);
      const minute = Number(await clock.getAttribute('data-cm-live-minute', { timeout: 2000 }).catch(() => null) ?? 0);
      if (!staged || !(minute > 0)) fail(9, `tab A's live match never ran (stage ${staged}, minute ${minute})`);
      else note(`tab A's live match is in minute ${minute}`);
    }
    const B = await newPage(ctx);
    await openCM(B);
    let played = 0;
    for (let i = 0; i < 3; i++) if (await quick(B)) played += 1;
    const afterB = await disk(B);
    const up = await waitNotice(A);
    await shot(A, `${tag}-9-${live ? 'live' : 'hub'}-A-stale`);
    const doc0 = await A.evaluate(() => performance.timeOrigin);
    await A.goBack({ timeout: 10000 }).catch(() => {});
    await A.waitForTimeout(1500);
    const doc1 = await A.evaluate(() => performance.timeOrigin).catch(() => null);
    const afterBack = await disk(B);
    console.log(`   ${how}: A came in by ${into.how}; B played ${played}: "${say(afterB)}" (live ${afterB?.live}); A saw the notice: ${up}; after A's Back (same document ${doc0 === doc1}) "${say(afterBack)}" (live ${afterBack?.live})`);
    if (!up) fail(9, `${how}: tab A never showed the notice`);
    if (played < 3) fail(9, `${how}: tab B played ${played} of three matches`);
    if (doc0 !== doc1) fail(9, `${how}: Back left the document, so this is not the in-app Back the case is for`);
    if (say(afterBack) !== say(afterB) || afterBack?.live !== afterB?.live) fail(9, `CLOBBER by Back ${how}: B left "${say(afterB)}" (live ${afterB?.live}), after A's Back the save holds "${say(afterBack)}" (live ${afterBack?.live})`);
    else ok(`A left by Back ${how}: the save is still B's`);
    await shot(A, `${tag}-9-${live ? 'live' : 'hub'}-A-after-back`);
    if (!live) {
      /* The same document, after the stale page let go: a Hot Seat carry on. */
      if (!HOT) fail(9, 'no surviving Hot Seat manager to hand over after the Back');
      else {
        await A.evaluate(() => { history.pushState({}, '', '/manager-hot-seat'); window.dispatchEvent(new PopStateEvent('popstate', { state: {} })); });
        await A.waitForTimeout(1500);
        await clearDialogs(A);
        await A.getByRole('button', { name: `See the Club Manager offer for ${HOT.club}` }).first().click({ timeout: 15000 }).catch(() => {});
        await A.getByRole('button', { name: 'Carry on in Club Manager' }).first().click({ timeout: 15000 }).catch(() => {});
        await A.getByRole('button', { name: /^Replace it and carry on/ }).first().click({ timeout: 8000 }).catch(() => {});
        await A.waitForURL(/\/club-manager/, { timeout: 15000 }).catch(() => {});
        await A.waitForTimeout(1000);
        const handed = await disk(A);
        await shot(A, `${tag}-9-hub-A-carry-on`);
        console.log(`   then in the same document a Hot Seat carry on: the save holds "${say(handed)}"`);
        if (!handed || handed.club !== HOT.club) fail(9, `after the stale tab let go, its Hot Seat carry on did not land: the save holds "${say(handed)}", not ${HOT.club}`);
        else ok('the same document carried a Hot Seat job on afterwards');
      }
    }
    await A.close();
    await B.close();
  }
}

/* ---------- Soccer Career (Round 1330): cases 10 to 14 ---------- */
/* Their own context, so cases 1 to 9 meet exactly the pages they always met:
   every page here is seeded (A and B on different seeds, so the season a stale
   tab would play can never equal the other tab's byte for byte), and an init
   script counts each page's own writes of the soccer save, which is what proves
   a stale tab wrote nothing (the control's dropped fence writes are not
   counted, they are not the save). */
const SKEY = 'soccerCareerSave';
const SFENCE = 'dukb-fence:' + SKEY;
const SCENTRE = 'seasonCentre:v1:soccer';
const SOCCER_CASES = [10, 11, 12, 13, 14];
const SEED_A = 1330;
const SEED_B = 1331;
let SOCCER = null;
/** A playing career at its first pro hub, made by the real engine (the shared careerStep policy). */
async function soccerFixture() {
  if (SOCCER) return SOCCER;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'twoTabsSoccer-'));
  try {
    const P = rel => JSON.stringify(path.join(ROOT, rel).split(path.sep).join('/'));
    fs.writeFileSync(path.join(tmp, 'entry.mjs'), `export * as sc from ${P('src/lib/soccerCareerEngine.ts')};\n`);
    await build({
      entryPoints: [path.join(tmp, 'entry.mjs')], outfile: path.join(tmp, 'bundle.mjs'), bundle: true, format: 'esm', platform: 'node',
      logLevel: 'error', absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') },
      loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
    });
    const { sc } = await import(pathToFileURL(path.join(tmp, 'bundle.mjs')).href);
    const { careerStep } = await import(pathToFileURL(path.join(ROOT, 'scripts', 'lib', 'careerStep.mjs')).href);
    Math.random = seeded(1330);
    const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
    let c = sc.initCareer('Two Tab Tester', 'England', 'ST', 'modern', flat(62), 62, 2020, sc.FALLBACK_CLUBS, null, 84);
    const pro = s => (s.seasons || []).filter(r => r.type === 'playing').length;
    for (let g = 0; g < 400 && !(c.phase === 'playing' && pro(c) >= 1) && !c.retired; g++) c = careerStep(sc, c, sc.FALLBACK_CLUBS);
    if (c.phase !== 'playing') throw new Error(`the soccer fixture never reached a playing hub (phase ${c.phase})`);
    SOCCER = JSON.stringify(c);
  } finally {
    Math.random = realRandom;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`soccer fixture: ${sView(SOCCER)}, ${SOCCER.length} chars`);
  return SOCCER;
}
async function soccerContext(w, h) {
  const ctx = await newContext(w, h);
  await ctx.addInitScript(([save, centre]) => {
    window.__scWrites = 0;
    window.__centreWrites = 0;
    const set = Storage.prototype.setItem;
    const rem = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === save) window.__scWrites += 1;
      if (k === centre) window.__centreWrites += 1;
      return set.call(this, k, v);
    };
    Storage.prototype.removeItem = function (k) {
      if (k === save) window.__scWrites += 1;
      return rem.call(this, k);
    };
  }, [SKEY, SCENTRE]);
  return ctx;
}
async function soccerPage(ctx, seed) {
  const p = await newPage(ctx);
  await seedPages(p, seed);
  return p;
}
const sRaw = p => p.evaluate(k => localStorage.getItem(k), SKEY);
const sFence = p => p.evaluate(k => localStorage.getItem(k), SFENCE);
const scWrites = p => p.evaluate(() => (typeof window.__scWrites === 'number' ? window.__scWrites : -1));
const centreWrites = p => p.evaluate(() => (typeof window.__centreWrites === 'number' ? window.__centreWrites : -1));
function sView(raw) {
  if (!raw) return 'no save';
  try {
    const c = JSON.parse(raw);
    const r = (c.seasons || [])[c.seasons.length - 1];
    return `${c.playerName} age ${c.age}, ${c.phase}, ${c.seasons.length} seasons, last ${r ? `${r.year} ${r.club}: ${r.apps} apps, ${r.goals} goals, ${r.rating}` : 'none'}`;
  } catch { return 'unreadable'; }
}
const lastRow = raw => { try { const c = JSON.parse(raw); return JSON.stringify(c.seasons[c.seasons.length - 1]); } catch { return null; } };
async function openSoccer(p) {
  await p.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.locator('[data-career-action-bar], input[placeholder*="player name"]').first().waitFor({ timeout: 20000 }).catch(() => {});
  await clearBanner(p);
  await clearDialogs(p);
}
const advanceBtn = p => p.locator('[data-career-action-bar] button').first();
/** One career step as a player makes it: the bar's advance button, or the card's Continue. */
async function stepCareer(p) {
  const bar = advanceBtn(p);
  if (await bar.isVisible().catch(() => false)) {
    const label = (await bar.innerText().catch(() => '')).trim();
    if (/^Next (Season|Year)/.test(label)) { await bar.click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(1500); return label; }
  }
  const cont = p.locator('main button:visible', { hasText: /^Continue/ }).first();
  if (await cont.isVisible().catch(() => false)) { const label = (await cont.innerText().catch(() => '')).trim(); await cont.click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(1200); return label; }
  return null;
}
/** The same step forced past anything covering it, straight at the button. */
async function forceStep(p) {
  const did = await p.evaluate(() => {
    const bar = document.querySelector('[data-career-action-bar] button');
    const cont = [...document.querySelectorAll('main button')].find(b => /^Continue/.test((b.textContent || '').trim()));
    const target = bar || cont;
    if (!target) return null;
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return (target.textContent || '').trim();
  });
  await p.waitForTimeout(1500);
  return did;
}
async function forceClickText(p, re) {
  const did = await p.evaluate(src => {
    const r = new RegExp(src);
    const b = [...document.querySelectorAll('button')].find(x => r.test((x.textContent || '').trim()));
    if (!b) return false;
    b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  }, re.source);
  await p.waitForTimeout(600);
  return did;
}
async function pickCombo(p, triggerText, wanted) {
  await p.locator('[role="combobox"]', { hasText: triggerText }).first().click({ timeout: 5000 });
  await p.waitForSelector('[role="option"]', { timeout: 8000 });
  await p.evaluate(w => {
    const opts = [...document.querySelectorAll('[role="option"]')];
    const hit = opts.find(o => o.textContent.includes(w)) || opts[0];
    hit.scrollIntoView();
    hit.click();
  }, wanted);
  await p.waitForTimeout(400);
}
/** The creation form, filled and rolled the way a player does it, Begin Career not pressed. */
async function fillCreation(p, name) {
  await p.waitForSelector('input[placeholder*="player name"]', { timeout: 20000 });
  await p.fill('input[placeholder*="player name"]', name);
  await pickCombo(p, 'Choose nationality', 'England');
  await pickCombo(p, 'Choose position', 'Striker');
  await pickCombo(p, 'Choose era', 'Current era');
  await p.getByRole('button', { name: /Generate Starting Potential/ }).click({ timeout: 5000 });
  await p.waitForTimeout(3400);
}

async function caseSoccerReplace(ctx, tag) {
  console.log(`10) SOCCER REPLACE, and 11) REVERSE (${tag})`);
  const raw0 = await soccerFixture();
  const A = await soccerPage(ctx, SEED_A);
  await plant(A, { [SKEY]: raw0 });
  await openSoccer(A);
  const aLabel = (await advanceBtn(A).innerText().catch(() => '')).trim();
  const B = await soccerPage(ctx, SEED_B);
  await openSoccer(B);
  const upAtOnce = await waitNotice(A, 4000);
  const aBefore = await scWrites(A);
  const played = await stepCareer(B);
  const theirs = await sRaw(B);
  await shot(B, `${tag}-10-tabB-after-season`);
  /* The press as a player makes it, where Next Season was: the notice takes it. */
  const pressed = await advanceBtn(A).click({ timeout: 1500 }).then(() => true).catch(() => false);
  await A.waitForTimeout(600);
  const forced = await forceStep(A);
  const aAfter = await scWrites(A);
  const onDisk = await sRaw(A);
  await shot(A, `${tag}-10-tabA-notice`);
  console.log(`   A opened on "${aLabel}"; B played "${played}": ${sView(theirs)}; A saw the notice at once: ${upAtOnce}; A's press went through: ${pressed}; forced "${forced}"; A's writes ${aBefore} to ${aAfter}`);
  if (!/^Next Season/.test(aLabel)) fail(10, `tab A did not open on the hub with Next Season first (it read "${aLabel}")`);
  if (!upAtOnce) fail(10, 'tab A never showed the notice after tab B opened the career');
  if (!played || !theirs || theirs === raw0) fail(10, `tab B did not play a season (${played})`);
  if (pressed) fail(10, 'the press reached Next Season behind the notice');
  if (aAfter !== aBefore) fail(10, `REPLACE: the stale tab wrote the save ${aAfter - aBefore} time(s) after tab B played`);
  if (onDisk !== theirs) fail(10, `REPLACE: the save on disk is not tab B's any more (${sView(onDisk)})`);
  else ok(`B's season is on disk byte for byte after A's press and A's forced press: ${sView(theirs)}`);
  await openSoccer(A);
  const aNotice = await noticeUp(A);
  const reloaded = await sRaw(A);
  await shot(A, `${tag}-10-tabA-reloaded`);
  if (aNotice) fail(10, 'tab A still shows the notice after its reload');
  if (lastRow(reloaded) !== lastRow(theirs)) fail(10, `tab A reloaded onto another season: ${sView(reloaded)}`);
  else ok(`A reloaded onto B's season with no notice: ${sView(reloaded)}`);
  if (want(11)) {
    /* 11 REVERSE: A is the newest tab now (its reload wrote), B is stale. */
    const upB = await waitNotice(B, 4000);
    const bBefore = await scWrites(B);
    const aStep = await stepCareer(A);
    const mine = await sRaw(A);
    const bForced = await forceStep(B);
    const bAfter = await scWrites(B);
    const disk11 = await sRaw(B);
    await shot(B, `${tag}-11-tabB-notice`);
    console.log(`   REVERSE: B saw the notice: ${upB}; A stepped "${aStep}": ${sView(mine)}; B forced "${bForced}"; B's writes ${bBefore} to ${bAfter}`);
    if (!upB) fail(11, 'tab B never showed the notice once tab A reloaded');
    if (!aStep || mine === reloaded) fail(11, `tab A did not play on after its reload (${aStep})`);
    if (bAfter !== bBefore) fail(11, `REVERSE: the stale tab B wrote the save ${bAfter - bBefore} time(s)`);
    if (disk11 !== mine) fail(11, `REVERSE: the save on disk is not tab A's (${sView(disk11)})`);
    else ok('B\'s forced press changed nothing: the save is A\'s');
  }
  await A.close();
  await B.close();
}

async function caseSoccerNewCareer(ctx, tag) {
  console.log(`12) NEW CAREER IN A STALE TAB (${tag})`);
  const raw0 = await soccerFixture();
  const A = await soccerPage(ctx, SEED_A);
  await plant(A, { [SKEY]: raw0 });
  await openSoccer(A);
  const B = await soccerPage(ctx, SEED_B);
  await openSoccer(B);
  await stepCareer(B);
  const theirs = await sRaw(B);
  const up = await waitNotice(A, 4000);
  const aBefore = await scWrites(A);
  const opened = await forceClickText(A, /New Career$/);
  const confirmed = await forceClickText(A, /^Delete & Start Over$/);
  await A.waitForTimeout(800);
  const aAfter = await scWrites(A);
  const onDisk = await sRaw(A);
  await shot(A, `${tag}-12-stale-new-career`);
  console.log(`   A saw the notice: ${up}; forced New Career ${opened}, forced confirm ${confirmed}; A's writes ${aBefore} to ${aAfter}; on disk ${sView(onDisk)}`);
  if (!up) fail(12, 'tab A never showed the notice');
  if (!opened || !confirmed) fail(12, `the forced New Career did not find its buttons (open ${opened}, confirm ${confirmed})`);
  if (aAfter !== aBefore || onDisk !== theirs) fail(12, `NEW CAREER: the stale tab cleared or wrote the save (${aAfter - aBefore} writes, on disk ${sView(onDisk)})`);
  else ok('a stale New Career cleared nothing');
  await A.close();
  await B.close();
  /* The creation screen: A has a player rolled and ready, B begins a career first. */
  const C = await soccerPage(ctx, SEED_A);
  await plant(C, {});
  await openSoccer(C);
  await fillCreation(C, 'Stale Creator');
  const D = await soccerPage(ctx, SEED_B);
  await openSoccer(D);
  await fillCreation(D, 'Fresh Creator');
  await D.getByRole('button', { name: /Begin Career/ }).click({ timeout: 5000 }).catch(() => {});
  await D.waitForTimeout(1500);
  const dSave = await sRaw(D);
  const upC = await waitNotice(C, 4000);
  const cBefore = await scWrites(C);
  const begun = await forceClickText(C, /Begin Career/);
  await C.waitForTimeout(1200);
  const cAfter = await scWrites(C);
  const disk12 = await sRaw(C);
  await shot(C, `${tag}-12-stale-creation`);
  console.log(`   creation: B began ${sView(dSave)}; A saw the notice: ${upC}; A's forced Begin Career ${begun}; A's writes ${cBefore} to ${cAfter}; on disk ${sView(disk12)}`);
  if (!dSave) fail(12, 'tab B did not begin a career from the creation screen');
  if (!upC) fail(12, 'the tab on the creation screen never showed the notice');
  if (!begun) fail(12, 'the forced Begin Career found no button');
  if (cAfter !== cBefore || disk12 !== dSave) fail(12, `CREATION: the stale tab began a career over the other one (${cAfter - cBefore} writes, on disk ${sView(disk12)})`);
  else ok('a stale Begin Career wrote nothing');
  await C.close();
  await D.close();
}

async function caseSoccerWeekByWeek(ctx, tag) {
  console.log(`13) WEEK BY WEEK IN A STALE TAB (${tag})`);
  const raw0 = await soccerFixture();
  const A = await soccerPage(ctx, SEED_A);
  await plant(A, { [SKEY]: raw0 });
  await openSoccer(A);
  await A.locator('[data-week-by-week]').first().click({ timeout: 5000 }).catch(() => {});
  const centre = await A.locator('[data-season-centre]').first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  const aSave = await sRaw(A);
  const B = await soccerPage(ctx, SEED_B);
  await openSoccer(B);
  await stepCareer(B);
  const theirs = await sRaw(B);
  const up = await waitNotice(A, 4000);
  const aBefore = await scWrites(A);
  const cBefore = await centreWrites(A);
  const forced = await A.evaluate(() => {
    const bs = [...document.querySelectorAll('[data-season-centre] button')].slice(0, 4);
    for (const b of bs) b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return bs.map(b => (b.textContent || '').trim().slice(0, 30));
  });
  await A.waitForTimeout(1500);
  const barForced = await forceStep(A);
  const aAfter = await scWrites(A);
  const cAfter = await centreWrites(A);
  const onDisk = await sRaw(A);
  await shot(A, `${tag}-13-notice-over-centre`);
  console.log(`   A's Season Centre open: ${centre} (${sView(aSave)}); B played on: ${sView(theirs)}; A saw the notice: ${up}; forced in the Centre ${JSON.stringify(forced)}, then "${barForced}"; A's writes of ${SKEY} ${aBefore} to ${aAfter}`);
  note(`RECORDED, NOT JUDGED (owed): the stale tab wrote ${SCENTRE} ${cAfter - cBefore} time(s) after the other tab played on`);
  if (!centre) note('the Season Centre did not open on Week by week (no league games in that season?), so the forced presses were made on the hub');
  if (!up) fail(13, 'tab A never showed the notice over the Season Centre');
  if (aAfter !== aBefore || onDisk !== theirs) fail(13, `WEEK BY WEEK: the stale tab wrote the save (${aAfter - aBefore} writes, on disk ${sView(onDisk)})`);
  else ok('the stale Season Centre changed nothing in the save');
  await A.close();
  await B.close();
}

async function caseSoccerOldSave(ctx, tag) {
  console.log(`14) SOCCER OLD SAVE AND THE NOTICE (${tag})`);
  const raw0 = await soccerFixture();
  const P = await soccerPage(ctx, SEED_A);
  await plant(P, { [SKEY]: raw0 });
  const g0 = await sFence(P);
  await openSoccer(P);
  const stepped = await stepCareer(P);
  const mine = await sRaw(P);
  const g1 = await sFence(P);
  /* The notice's before: scrolled a little, as a player would be, with the next press marked. */
  await P.evaluate(() => window.scrollTo(0, 120));
  await P.waitForTimeout(400);
  const before = await P.evaluate(() => ({ y: window.scrollY, h: document.documentElement.scrollHeight }));
  const target = await P.evaluate(() => {
    /* The next press on screen: the bar's first button, else the card's
       Continue, else any button of the page, as long as it is in view. */
    const inView = b => { const r = b.getBoundingClientRect(); return r.height > 0 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; };
    const bar = document.querySelector('[data-career-action-bar] button');
    const main = [...document.querySelectorAll('main button')].filter(inView);
    const el = (bar && inView(bar) ? bar : null) ?? main.find(b => /^Continue/.test((b.textContent || '').trim())) ?? main[0];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, label: (el.textContent || '').trim().slice(0, 40) };
  });
  const B = await soccerPage(ctx, SEED_B);
  await openSoccer(B);
  const up = await waitNotice(P);
  console.log(`   fence before ${g0 ?? 'absent'}, after "${stepped}" ${g1}; ${sView(raw0)} to ${sView(mine)}; a second tab stales it: ${up}`);
  if (g0 !== null) fail(14, 'the planted old save already had a fence key');
  if (!stepped || mine === raw0) fail(14, `the old save did not play on (${stepped})`);
  if (!(Number(g1) >= 1)) fail(14, `no fence after the first write (${g1})`);
  if (!up) { fail(14, 'the old save was not fenced: a second tab did not stale it'); await P.close(); await B.close(); return; }
  const theirs = await sRaw(B);
  await soccerNotice(P, before, target, theirs, tag);
  await P.close();
  await B.close();
}
async function soccerNotice(A, before, target, theirs, tag) {
  const n = A.locator('[data-testid="save-moved-notice"]');
  const after = await A.evaluate(() => ({ y: window.scrollY, h: document.documentElement.scrollHeight }));
  if (after.y !== before.y || after.h !== before.h) fail(14, `the page moved under the notice: scrollY ${before.y} to ${after.y}, height ${before.h} to ${after.h}`);
  else ok(`no jump: scrollY ${after.y} and height ${after.h} before and after`);
  const words = (await n.innerText().catch(() => '')).replace(/\s+/g, ' ');
  if (!words.includes(NOTICE_WORDS)) fail(14, `the notice reads "${words}"`);
  const reload = n.getByRole('button', { name: 'Reload' });
  const rb = await reload.boundingBox().catch(() => null);
  if (!rb || rb.height < 44) fail(14, `Reload is ${rb ? rb.height : 'not'} px tall`);
  const geo = await n.evaluate(el => {
    const card = el.firstElementChild.getBoundingClientRect();
    let min = 99;
    for (const t of el.querySelectorAll('*')) if (t.childNodes.length && [...t.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())) min = Math.min(min, parseFloat(getComputedStyle(t).fontSize));
    return { left: card.left, right: card.right, top: card.top, bottom: card.bottom, vw: innerWidth, vh: innerHeight, min, anims: el.getAnimations({ subtree: true }).length, focusIn: !!document.activeElement?.closest('[data-testid="save-moved-notice"]'), focusName: (document.activeElement?.textContent || '').trim() };
  });
  if (geo.min < 12) fail(14, `text at ${geo.min}px in the notice`);
  if (geo.left < 0 || geo.right > geo.vw || geo.top < 0 || geo.bottom > geo.vh) fail(14, `the dialog runs off the screen: ${JSON.stringify(geo)}`);
  if (geo.anims) fail(14, `${geo.anims} animations on the notice`);
  if (!geo.focusIn || geo.focusName !== 'Reload') fail(14, `focus is not on Reload when the notice shows (${geo.focusName})`);
  await A.emulateMedia({ reducedMotion: 'reduce' });
  const animsReduced = await n.evaluate(el => el.getAnimations({ subtree: true }).length);
  await A.emulateMedia({ reducedMotion: null });
  if (animsReduced) fail(14, `${animsReduced} animations under reduced motion`);
  const toasts = await A.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].filter(t => t.getBoundingClientRect().height > 0).map(t => (t.textContent || '').trim().slice(0, 60)));
  if (toasts.length) fail(14, `a toast is still showing over the notice: ${JSON.stringify(toasts)}`);
  let escaped = 0;
  for (let i = 0; i < 6; i++) {
    await A.keyboard.press('Tab');
    if (!await A.evaluate(() => !document.activeElement || document.activeElement === document.body || !!document.activeElement.closest('[data-testid="save-moved-notice"]'))) escaped += 1;
  }
  if (escaped) fail(14, `Tab reached ${escaped} elements behind the notice`);
  if (target) {
    const inReload = (px, py) => rb && px >= rb.x && px <= rb.x + rb.width && py >= rb.y && py <= rb.y + rb.height;
    const pts = [[0.5, 0.5], [0.15, 0.5], [0.85, 0.5], [0.5, 0.15], [0.5, 0.85], [0.1, 0.1], [0.9, 0.9]]
      .map(([fx, fy]) => [target.x + target.width * fx, target.y + target.height * fy]);
    const pt = pts.find(([px, py]) => !inReload(px, py));
    if (!pt) note(`every point of "${target.label}" sits under the Reload button at this size; the click is skipped`);
    else {
      const hit = await A.evaluate(([px, py]) => !!document.elementFromPoint(px, py)?.closest('[data-testid="save-moved-notice"]'), pt);
      const w0 = await scWrites(A);
      await A.mouse.click(pt[0], pt[1]);
      await A.waitForTimeout(800);
      if (!hit) fail(14, `the point where "${target.label}" was is not covered by the notice`);
      if (await scWrites(A) !== w0 || await sRaw(A) !== theirs) fail(14, `a click where "${target.label}" was changed the save`);
      if (!await noticeUp(A)) fail(14, `the notice went away after a click where "${target.label}" was`);
    }
  } else note('no next press was on screen to aim at');
  await shot(A, `${tag}-14-notice`);
  ok(`the notice: Reload ${rb ? Math.round(rb.height) : '?'} px, smallest text ${geo.min} px, no animation, no toast, Tab stayed inside ${escaped === 0}`);
}

/* ---------- Round 1343: case 15, retiring with two tabs ---------- */
let END15 = null;
/** A career at its first season's end, made by the real engine on its own seeded stream. */
function endFixture15() {
  if (END15) return END15;
  const saved = Math.random;
  Math.random = seeded(1343);
  try {
    let s = cm.startCareer('Everton');
    for (let i = 0; i < 140; i++) {
      if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
      const r = cm.playNextEntry(s, { skipHalftime: true });
      s = r.state;
      if (r.kind === 'seasonOver') break;
    }
    s = cm.finishSeason(s).state;
    stubStore.clear();
    cm.saveCareer(s);
    END15 = stubStore.get(KEY) ?? null;
  } finally {
    Math.random = saved;
  }
  return END15;
}
const retiredOn = p => p.evaluate(k => { try { return !!JSON.parse(localStorage.getItem(k) ?? 'null')?.retired; } catch { return null; } }, KEY);
async function openToEnd(p) {
  await p.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.locator('[data-testid="cm-slots"]').first().waitFor({ timeout: 20000 }).catch(() => {});
  await clearBanner(p);
  await p.getByRole('button', { name: 'Resume Career', exact: true }).first().click({ timeout: 5000 }).catch(() => {});
}
async function caseRetire(ctx, tag) {
  console.log(`15) RETIRE (${tag})`);
  const END = endFixture15();
  if (!END) { fail(15, 'the engine made no season end fixture'); return; }
  const A = await newPage(ctx);
  await plant(A, { [KEY]: END });
  await openToEnd(A);
  const doorA = A.locator('[data-cm-retire-door]').first();
  await doorA.waitFor({ timeout: 15000 }).catch(() => {});
  if (!await doorA.isVisible().catch(() => false)) { fail(15, 'tab A has no retire door on the season end screen'); await A.close(); return; }
  /* B plays on: the next season's first match. */
  const B = await newPage(ctx);
  await openToEnd(B);
  await B.getByRole('button', { name: /^Continue to Season 2/ }).first().click({ timeout: 8000 }).catch(() => {});
  await B.locator('[data-cm-way="quick"]').first().waitFor({ timeout: 15000 }).catch(() => {});
  await quick(B);
  const afterB = await disk(B);
  const up = await waitNotice(A);
  const pressed = await doorA.click({ timeout: 2000 }).then(() => true).catch(() => false);
  /* And a Yes forced past the notice, armed. */
  await A.locator('[data-cm-retire-door]').first().dispatchEvent('click').catch(() => {});
  await A.waitForTimeout(800);
  await A.locator('[data-cm-retire-yes]').first().dispatchEvent('click').catch(() => {});
  await A.waitForTimeout(800);
  const afterA = await disk(A);
  const retiredA = await retiredOn(A);
  console.log(`   B played on to ${say(afterB)} | A saw the notice: ${up}, its door press went through: ${pressed} | after A's forced Yes: ${say(afterA)}, retired ${retiredA}`);
  if (!up) fail(15, 'tab A never showed the notice after tab B played on');
  if (pressed) fail(15, 'tab A pressed the door through the notice');
  if (!afterB || afterB.results < 1) fail(15, `tab B did not play the next season's first match (${say(afterB)})`);
  if (say(afterA) !== say(afterB) || retiredA !== false) fail(15, `A's forced Yes wrote: the disk went from "${say(afterB)}" to "${say(afterA)}", retired ${retiredA}`);
  else ok('A\'s forced Yes wrote nothing: the disk is B\'s and not retired');
  await shot(A, `${tag}-15-notice-over-door`);
  await A.close();
  /* The reverse: C retires, the stale B forces a Quick Sim. */
  const C = await newPage(ctx);
  await openCM(C);
  const tile = C.locator('button').filter({ has: C.locator('div', { hasText: /^Manager$/ }) }).first();
  await tile.click({ timeout: 8000 }).catch(() => {});
  await C.locator('[data-cm-retire-door]').first().click({ timeout: 8000 }).catch(() => {});
  await C.waitForTimeout(800);
  await C.locator('[data-cm-retire-yes]').first().click({ timeout: 5000 }).catch(() => {});
  await C.locator('[data-cm-farewell]').first().waitFor({ timeout: 15000 }).catch(() => {});
  const retiredC = await retiredOn(C);
  const atRetire = await disk(C);
  await B.locator('[data-cm-way="quick"]').first().dispatchEvent('click').catch(() => {});
  await B.waitForTimeout(2500);
  const afterForced = await disk(C);
  const stillRetired = await retiredOn(C);
  console.log(`   C retired: ${retiredC} at ${say(atRetire)} | after B's forced Quick Sim: ${say(afterForced)}, retired ${stillRetired}`);
  if (!retiredC) fail(15, 'tab C did not retire');
  else if (say(afterForced) !== say(atRetire) || !stillRetired) fail(15, `B's forced Quick Sim wrote over the retired career ("${say(atRetire)}" to "${say(afterForced)}", retired ${stillRetired})`);
  else ok('B\'s forced Quick Sim wrote nothing: the disk stays retired');
  await shot(C, `${tag}-15-farewell`);
  await B.close();
  await C.close();
}

/* ---------- run ---------- */
const ONLY_CASES = process.env.CASES ? process.env.CASES.split(',').map(Number) : null;
const want = c => (!CONTROL || CONTROLS[CONTROL].includes(c)) && (!ONLY_CASES || ONLY_CASES.includes(c));
try {
  for (const [w, h] of SIZES) {
    const tag = `${w}x${h}`;
    console.log(`== ${tag}`);
    const ctx = await newContext(w, h);
    try {
      if (want(1) || want(8)) await caseClobber(ctx, tag);
      if (want(2)) await caseReplay(ctx, tag);
      if (want(3) || want(4)) await caseHotSeat(ctx, tag);
      if (want(5)) await caseDamaged(ctx, tag);
      if (want(6)) await casePutBack(ctx, tag);
      if (want(7)) await caseOldSave(ctx, tag);
      if (want(9)) await caseBack(ctx, tag);
      if (want(15)) await caseRetire(ctx, tag);
      if (SOCCER_CASES.some(want)) {
        const sctx = await soccerContext(w, h);
        try {
          if (want(10) || want(11)) await caseSoccerReplace(sctx, tag);
          if (want(12)) await caseSoccerNewCareer(sctx, tag);
          if (want(13)) await caseSoccerWeekByWeek(sctx, tag);
          if (want(14)) await caseSoccerOldSave(sctx, tag);
        } finally {
          await sctx.close();
        }
      }
    } catch (e) {
      fail(0, `${tag} threw: ${String(e?.message ?? e).slice(0, 300)}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server?.kill();
}
const cases = [...red.keys()].sort();
const reds = [...red.values()].reduce((n, l) => n + l.length, 0);
console.log(`cases red: ${cases.length ? cases.join(', ') : 'none'}; pictures in ${OUT}`);
if (CONTROL) {
  const own = CONTROLS[CONTROL];
  const hit = own.filter(c => (red.get(c) ?? []).length);
  if (!drops) { console.log(`CONTROL DID NOT FIRE: TWO_TABS_CONTROL=${CONTROL} dropped no write`); process.exit(2); }
  if (hit.length !== own.length) { console.log(`CONTROL DID NOT TURN ITS CASES RED: TWO_TABS_CONTROL=${CONTROL} dropped ${drops} writes, red ${hit.join(', ') || 'none'} of ${own.join(', ')}`); process.exit(2); }
  console.log(`CONTROL FIRED: TWO_TABS_CONTROL=${CONTROL} dropped ${drops} writes and turned case(s) ${hit.join(', ')} red`);
  process.exit(1);
}
if (reds) { console.log(`playTwoTabs: RED, ${reds} findings`); process.exit(1); }
console.log(`playTwoTabs: green at ${SIZES.map(s => s.join('x')).join(', ')}`);
