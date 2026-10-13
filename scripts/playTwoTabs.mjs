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
 *
 * NEGATIVE CONTROLS (TWO_TABS_CONTROL; each counts what it dropped and a
 * control that dropped nothing exits 2):
 *   nofence   an init script drops every write to a 'dukb-fence:' key in every
 *             page: cases 1, 2, 3 and 6 go red.
 *   nolanding drops the carry on's one shot mark: case 4 goes red.
 *   nokeep    drops every write to a key holding '.broken-': case 5's backup
 *             check goes red.
 *
 * Pictures of every case at every size go to RC_OUT (or two-tabs-artifacts/).
 * Run: ENGINES=chromium node scripts/playTwoTabs.mjs   [SIZES=390x844] [TWO_TABS_CONTROL=...]
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

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
const CONTROLS = { nofence: [1, 2, 3, 6], nolanding: [4], nokeep: [5] };
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
    return { club: c.clubName, week: c.week, results: log.length, last: last ? `${last.opp} ${last.score}` : 'none', squad: (c.squad ?? []).length, xi: c.xiIds, budget: c.budget };
  } catch { return { unreadable: true }; }
}, KEY);
const say = d => (d ? `${d.club} week ${d.week}, ${d.results} results, last ${d.last}` : 'no save');
const noticeUp = p => p.locator('[data-testid="save-moved-notice"]').isVisible().catch(() => false);
const onHub = p => p.locator('[data-cm-way="quick"]').first().isVisible().catch(() => false);
const onSlots = p => p.locator('[data-testid="cm-slots"]').isVisible().catch(() => false);
const text = async p => (await p.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
async function clearBanner(p) {
  await p.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
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
    const x = quickBox.x + quickBox.width / 2, y = quickBox.y + quickBox.height / 2;
    const hit = await A.evaluate(([px, py]) => !!document.elementFromPoint(px, py)?.closest('[data-testid="save-moved-notice"]'), [x, y]);
    await A.mouse.click(x, y);
    await A.waitForTimeout(800);
    if (!hit) fail(8, 'the point where Quick Sim was is not covered by the notice');
    if (say(await disk(A)) !== say(afterB)) fail(8, 'a click where Quick Sim was changed the save');
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
  await clearBanner(B);
  const offer = B.getByRole('button', { name: `See the Club Manager offer for ${HOT.club}` });
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
    if (picker) fail(5, `${label}: the picker opened without a word`);
    if (want === 'record') continue;
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

/* ---------- run ---------- */
const want = c => !CONTROL || CONTROLS[CONTROL].includes(c);
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
