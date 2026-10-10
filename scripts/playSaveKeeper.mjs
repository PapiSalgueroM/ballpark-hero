/**
 * Round 1219: a put back that survives.
 *
 * WHAT IT MEASURES. Round 958 keeps a save aside when a page breaks and
 * offers it back on the game's own page ("Put that save back",
 * src/components/BrokenSaveRestore.tsx). This walk presses that button in a
 * real Chromium WITH A GAME IN THE PAGE'S MEMORY, which no check did before,
 * and then asks three things of the browser's own storage:
 *   1. is the save that was put back (A) still in ANY key, byte for byte?
 *   2. is A the game the page is running after the load (after the last
 *      write of A to the game's key, no OTHER page wrote that key)?
 *   3. is the game the player had before the press (B) kept aside, byte for
 *      byte?
 *
 * MEASURED ON origin/main (09df145a, 2026-10-10, remote checks r1219-s0a and
 * r1219-walk1, a build without src/lib/saveKeeper.ts): the save that was put
 * back was LOST on five routes, /club-manager, /stadium-tycoon,
 * /wonderkid-factory, /hall-of-champions and /idle-arena, in every walk
 * there (10 of 25 walks on that build; the other 16 routes survived). A was
 * in NO KEY: the swap wrote A under the open page, removed the backup it
 * came from, and the game's own leaving write then landed on top. The key's
 * history read "x' A' x' x'" (x a write that is not A, the mark a write made
 * by the page that was left). On this branch the same walks read
 * "x' x' x' A": every write of the old page lands first, then the load puts
 * A in (52 of 52 walks survived, r1219-walk1). LOSS_ON_MAIN below is that
 * measurement, and the base arm measures it again on every run that is
 * given a build of origin/main.
 *
 * JOURNEY L, three flows.
 *   fresh    Several games make a fresh game when they open with no save and
 *            write it with no press. Which ones is MEASURED (a clean visit to
 *            every route of src/data/continueSaves.ts), not listed. That
 *            first save is A, made by the game itself in the browser. It is
 *            planted once as a kept aside backup, the route is opened again
 *            so a second fresh game B is in memory, and the card's button is
 *            pressed.
 *   planted  All 21 routes. A and B are real saves made by each game's own
 *            engine (scripts/lib/realSaves.mjs), B at the key and A kept
 *            aside, then the route is opened and the button pressed. A game
 *            that loads B has it in memory; a game that does not still shows
 *            the card, and the storage is judged the same way.
 *   cross    The academy's save is also mounted on the Stadium Tycoon page.
 *            On /stadium-tycoon with the Academy tab open, an academy backup
 *            is put back through the keeper's own restoreNow (bundled from
 *            source and evaluated in the page: Round 1219 ships no door for
 *            this, the next round's panel will) and the academy's key is
 *            judged after the load.
 * Saves are planted ONCE, from a document that is not the game: an init
 * script would plant them again on every load and the walk could never see
 * what a reload left. The init script here only LOGS writes (into
 * sessionStorage, which survives a load and is not the storage under test).
 * Every comparison with A or B is made inside the page with ===.
 *
 * JOURNEY T, the toggle (added by the round's review, 2026-10-10). The first
 * build of this round passed everything above and still stranded a career:
 * put the old save back, press OK, put the other one back again, press OK,
 * and the card was gone with the old career kept in storage and no screen
 * that offered it (on Club Manager and Soccer Career, which write their save
 * again as they load, one press later). No check pressed the button twice.
 * This journey does, on every route, at the first width: real saves A and B
 * planted, the route opened, and TOGGLE_PRESSES presses in a row. Every press
 * is a REAL POINTER click at the button's centre, after a dialog the game
 * opened on arrival is closed the way a player closes it, and only when the
 * point is really on the card. After each press: the save asked for is the
 * game on screen and still in a key, the game he had is kept aside, the card
 * says "Your save is back", its OK is pressed with the pointer, and the card
 * must then OFFER THE GAME HE JUST PUT DOWN. What the card offers is asked of
 * offeredBackup, the library call the card itself makes (bundled from source
 * and evaluated in the page).
 *
 * REPLACE, NOT ASSIGN, measured where it can be. A load to the address the
 * page is already on replaces its history entry whichever call made it, so
 * the count of history entries tells the two apart only when the address
 * changes. Two places do: the toggle's first press (each route is opened
 * with a query string, and the game is loaded without it) and the cross flow
 * (from /stadium-tycoon to the academy's own page). There the count must be
 * the same before and after.
 *
 * JOURNEY K, the default path on two builds. A clean profile, a real save of
 * all 21 games planted, the home page and the 21 routes loaded once each.
 * The sorted list of storage KEYS at the end must be the same on the build
 * of origin/main and on this branch: the keeper adds no key (no journal, no
 * backup, no marker) to an ordinary visit. Values are not compared, several
 * games stamp a time into their save as they load.
 *
 * THE BOOT PASS'S COST. In Chromium at a 4x CPU throttle, with the largest
 * real save of every game held: the time of one runSaveKeeper pass, beside a
 * pass over an empty store. Printed for the lead, not asserted.
 *
 * CONTROLS, none of them in shipped code.
 *   The base arm (KEEPER_BASE_DIST=<a build of the tree BEFORE this round>):
 *     the fresh and planted flows run on it and every route in LOSS_ON_MAIN
 *     must be LOST again, or the run fails. So the proof that this walk can
 *     see the loss is a measurement repeated on every run, not a memory.
 *     "origin/main" in this file's output means that build: origin/main at
 *     09df145a, the commit this round was cut from. Once the round is merged
 *     a build of main's head has the keeper in it and loses nothing, so the
 *     base arm must be given a build of 09df145a (git worktree add, vite
 *     build), never of main's head.
 *   KEEPER_CONTROL=inplace   the cross flow swaps in the open page the way
 *     Round 958 did (the library's restoreBackup, then a load): the academy
 *     save must be LOST, so the control exits 1 and says FIRED.
 *   KEEPER_CONTROL=extrakey  journey K plants one extra key on the branch
 *     arm: the comparison must fail.
 *   KEEPER_CONTROL=tamper    one character of every copy of A is changed
 *     after the load and before the verdict: no walk may read SURVIVED.
 *   KEEPER_CONTROL=answered  (the toggle) after the first press the walker
 *     lists every kept aside save of the game as answered and loads the page
 *     again, so the card has nothing to offer: every route must stop at "the
 *     card offers NOTHING".
 *   KEEPER_CONTROL=assignload  (the cross flow) the put back is staged the
 *     keeper's way and the walker then loads the game with location.assign:
 *     the history must grow by one entry on every walk.
 * A control that fired exits 1 with FIRED on its last line; one that did not
 * exits 2.
 *
 * NO BASE BUILD, NO PLAIN GREEN (the round's review). Without
 * KEEPER_BASE_DIST the base arm and journey K cannot run, and the walk used
 * to close "green" with a log line and no loss control. In assert mode it
 * now refuses to start (exit 2) unless KEEPER_NO_BASE=1 says so in as many
 * words, and then its closing line reads "green on the BRANCH ARM ONLY".
 *
 * WHAT IT DOES NOT SHOW. Headless Chromium does not keep a left page alive in
 * its back and forward cache, so what a browser that does keep it would do
 * with the old page is not exercised here; that no way back is left is
 * measured by the history count where the address changes (above), and held
 * at source by scripts/simSaveKeeper.mjs section 6 and a unit case. The
 * presses of journey L are clicks made in the page (see pressAndJudge);
 * whether a pointer could have hit the button there is printed, and journey
 * T is the one that presses with a pointer. Only Chromium is walked. Hall of Champions reads its save only after
 * its catalog arrives from the database, which this walk never reaches: for
 * that one route the catalog request is answered here from a made up
 * fixture (twelve rows named "Walk Fixture"), so the museum opens and its
 * save can be judged.
 *
 * NETWORK. Everything that is not this machine is aborted, the database host
 * included: this walk never reaches production.
 *
 * RUN. It needs a build (vite build), then
 *   KEEPER_DIST=<dist> [KEEPER_BASE_DIST=<a build of origin/main>] node scripts/playSaveKeeper.mjs
 * KEEPER_MODE=report prints and exits 0. ONLY=/idle-arena narrows the routes,
 * WIDTHS=390 the widths, PARTS=toggle the journeys (fresh, planted, cross,
 * toggle, K, cost). Screenshots go to $RC_OUT when it is set.
 */
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';
import { buildRealSaves } from './lib/realSaves.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.resolve(process.env.KEEPER_DIST || path.join(ROOT, 'dist'));
const BASE_DIST = process.env.KEEPER_BASE_DIST ? path.resolve(process.env.KEEPER_BASE_DIST) : null;
const MODE = process.env.KEEPER_MODE || 'assert';
if (!['assert', 'report'].includes(MODE)) { console.error(`KEEPER_MODE=${MODE} is not a mode this walk knows`); process.exit(2); }
const CONTROL = process.env.KEEPER_CONTROL || '';
if (CONTROL && !['inplace', 'extrakey', 'tamper', 'answered', 'assignload'].includes(CONTROL)) { console.error(`KEEPER_CONTROL=${CONTROL} is not a control this walk knows`); process.exit(2); }
/* Round 1219 review: without a build of the tree before this round the base arm and journey K do not run, and the
   walk used to close "green" all the same, with no loss control left. It now refuses to start that way unless the
   caller says so in as many words, and its closing line then says what was not run. */
const NO_BASE_SAID = process.env.KEEPER_NO_BASE === '1';
/* How many times the toggle journey presses the button on each route. Club Manager and Soccer Career write their
   save again as they load, and there the card used to go away only after the THIRD press. */
const TOGGLE_PRESSES = 3;
const SEEN_KEY = 'dukb-set-aside-seen';
const WIDTHS = (process.env.WIDTHS || '390,1280').split(',').map(s => Number(s.trim())).filter(Boolean);
const OUT = process.env.RC_OUT || null;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'playSaveKeeper-'));
const RESTORE_MARK = 'data-dukb-set-aside';
const RESTORE_LABEL = 'Put that save back';
const BROKE = 'This page broke';
const BACKUP_MARK = '.broken-';
const PLANT_STAMP = '2026-01-02T03-04-05';
/* Measured on origin/main 09df145a on 2026-10-10 (remote checks r1219-s0a and
   r1219-walk1, see the header) and again by the base arm of every run. A
   route joins this list only by measurement. They are the five long games
   that write their in memory game as the page leaves. */
const LOSS_ON_MAIN = ['/club-manager', '/stadium-tycoon', '/wonderkid-factory', '/hall-of-champions', '/idle-arena'];
const HALL = '/hall-of-champions';

const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* The routes come from the list itself, one line per row, the way
   scripts/playCorruptSaves.mjs reads them. */
const listSrc = stripComments(fs.readFileSync(path.join(ROOT, 'src/data/continueSaves.ts'), 'utf8'));
const ENTRIES = [];
for (const line of listSrc.split('\n')) {
  const m = /^\s*\{ path: '([^']+)', saveKey: '([^']+)'/.exec(line);
  if (m) ENTRIES.push({ path: m[1], saveKey: m[2] });
}
if (ENTRIES.length < 21) { console.error(`read ${ENTRIES.length} long games from continueSaves.ts, expected at least 21; the row pattern no longer matches`); process.exit(2); }
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(s => s.trim()) : null;
const routes = ONLY ? ENTRIES.filter(e => ONLY.includes(e.path)) : ENTRIES;
if (routes.length === 0) { console.error('no routes matched ONLY'); process.exit(2); }
const entryOf = p => ENTRIES.find(e => e.path === p);

const restoreCode = stripComments(fs.readFileSync(path.join(ROOT, 'src/components/BrokenSaveRestore.tsx'), 'utf8'));
if (!restoreCode.includes(RESTORE_MARK) || !restoreCode.includes(RESTORE_LABEL)) {
  console.error(`src/components/BrokenSaveRestore.tsx carries no ${RESTORE_MARK} card with "${RESTORE_LABEL}", so there is no button to press`);
  process.exit(2);
}
for (const d of [DIST, BASE_DIST].filter(Boolean)) {
  if (!fs.existsSync(path.join(d, 'index.html')) || !fs.existsSync(path.join(d, 'assets'))) { console.error(`no build at ${d}; run vite build first`); process.exit(2); }
}

const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const servers = [];
async function serve(dist) {
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), dist, String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
  servers.push(child);
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('the host-like server did not start within 20 s')), 20000);
    child.stdout.on('data', d => { if (String(d).includes('host-like server')) { clearTimeout(t); resolve(); } });
    child.once('exit', code => { clearTimeout(t); reject(new Error(`the host-like server exited with ${code}`)); });
  });
  return `http://127.0.0.1:${port}`;
}

/* The storage log. Runs at the start of every document and plants nothing. */
function installLog() {
  if (window.__dukbWalkLog) return;
  window.__dukbWalkLog = true;
  let ss; let ls;
  try { ss = window.sessionStorage; ls = window.localStorage; } catch { return; }
  const P = Storage.prototype;
  const set = P.setItem; const rem = P.removeItem; const get = P.getItem;
  const doc = String(Math.round(performance.timeOrigin));
  const push = rec => {
    try {
      const all = JSON.parse(get.call(ss, '__walk_log') || '[]');
      all.push(rec);
      set.call(ss, '__walk_log', JSON.stringify(all));
    } catch { /* the walk reads what it has */ }
  };
  P.setItem = function setItem(k, v) {
    if (this === ls) {
      const a = get.call(ss, '__walk_A');
      const isA = a !== null && String(v) === a;
      push({ op: 'set', k: String(k), len: String(v).length, isA, doc });
      /* The last thing this document wrote to the watched key that was not A. */
      if (!isA && String(k) === get.call(ss, '__walk_key')) { try { set.call(ss, `__walk_last_${doc}`, String(v)); } catch { /* too big to keep */ } }
    }
    return set.apply(this, arguments);
  };
  P.removeItem = function removeItem(k) {
    if (this === ls) push({ op: 'rem', k: String(k), doc });
    return rem.apply(this, arguments);
  };
}

/* Waits for the page to draw something (or break), then a moment more for
   the effects that run after mount. */
async function settle(page) {
  await page.waitForFunction(broke => {
    const t = document.body?.innerText ?? '';
    return t.includes(broke) || (document.querySelectorAll('#root button').length > 0 && t.trim().length > 80);
  }, BROKE, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

const held = (page, key) => page.evaluate(k => localStorage.getItem(k) !== null, key);
async function waitForKey(page, key, ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await held(page, key)) return true;
    await page.waitForTimeout(500);
  }
  return held(page, key);
}

/* A context on one build. Nothing leaves this machine. For Hall of Champions
   alone the catalog request is answered here (see the header). */
async function openContext(browser, site, width, route = '') {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 800 } });
  const isLocal = u => u.startsWith(site) || u.startsWith('data:') || u.startsWith('blob:');
  await ctx.route('**/*', req => {
    const r = req.request();
    const u = r.url();
    if (isLocal(u)) return req.continue();
    if (route === HALL && u.includes('/rest/v1/')) {
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,OPTIONS' };
      if (r.method() === 'OPTIONS') return req.fulfill({ status: 204, headers: cors });
      const cols = (new URL(u).searchParams.get('select') || '').split(',').map(s => s.trim()).filter(Boolean);
      const rows = Array.from({ length: 12 }, (_, i) => Object.fromEntries(cols.map((c, j) => [c, j === 0 ? 1990 + i : `Walk Fixture ${j === 1 ? i + 1 : 'Other'}`])));
      return req.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(rows) });
    }
    return req.abort();
  });
  await ctx.addInitScript(installLog);
  const page = await ctx.newPage();
  await page.goto(`${site}/robots.txt`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  /* A returning player has answered the cookie banner. Left unanswered it sits on top of the card (it is portalled
     above everything on purpose, Round 117) and hides the card's buttons at 390; see the notes. */
  await page.evaluate(() => localStorage.setItem('cookie-consent', 'essential'));
  return { ctx, page };
}

/* What the storage says after the press and the load. Runs in the page. */
function readVerdict({ saveKey, prefix, pressDoc, tamper }) {
  if (tamper) {
    /* Control tamper: one character of every copy of A changes before the verdict. */
    const a = sessionStorage.getItem('__walk_A');
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      const v = localStorage.getItem(k);
      if (v === a) localStorage.setItem(k, `${v.slice(0, -1)}${v.endsWith(' ') ? 'x' : ' '}`);
    }
  }
  const A = sessionStorage.getItem('__walk_A');
  const B = sessionStorage.getItem(`__walk_last_${pressDoc}`) ?? sessionStorage.getItem('__walk_B0');
  const log = JSON.parse(sessionStorage.getItem('__walk_log') || '[]');
  const doc = String(Math.round(performance.timeOrigin));
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i));
  const holdersOfA = keys.filter(k => localStorage.getItem(k) === A);
  const backups = keys.filter(k => k.startsWith(prefix));
  const sets = log.filter(r => r.op === 'set' && r.k === saveKey);
  let lastA = -1;
  sets.forEach((r, i) => { if (r.isA) lastA = i; });
  return {
    aSomewhere: holdersOfA.length > 0,
    holdersOfA,
    aIsTheGame: lastA >= 0 && sets.slice(lastA + 1).every(r => r.doc === doc),
    bKnown: B !== null,
    bKeptAside: B !== null && backups.some(k => localStorage.getItem(k) === B),
    lineage: sets.map(r => `${r.isA ? 'A' : 'x'}${r.doc === doc ? '' : "'"}`).join(' '),
    backups: backups.length,
    sameDoc: doc === pressDoc,
  };
}

const shot = async (page, name) => {
  if (!OUT) return;
  try { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, name) }); } catch { /* a missed picture fails nothing */ }
};
const slug = p => p.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');

/* Where a button's centre is, and what a pointer there would hit: '' when it is the card, else what covers it. */
async function underPointer(page, btn) {
  const box = await btn.boundingBox().catch(() => null);
  if (!box) return { x: 0, y: 0, covered: 'no box (the button is not laid out)' };
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const covered = await page.evaluate(([px, py, mark]) => {
    const el = document.elementFromPoint(px, py);
    if (!el) return 'nothing (the point is off screen)';
    if (el.closest(`[${mark}]`)) return '';
    const d = el.closest('[role="dialog"],[role="alertdialog"]');
    return d ? `a dialog (${(d.getAttribute('aria-label') || d.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)})` : `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}`;
  }, [x, y, RESTORE_MARK]);
  return { x, y, covered };
}

/* The card's button, pressed, and the storage read after the load it asks for.
   This journey presses with a click made in the page, which fires through
   anything drawn on top of the button: it measures what the storage does with
   a game in memory, on fixtures whose first screen may be a dialog. Whether a
   pointer could have hit the button is measured and printed here, and the
   toggle journey below presses with a real pointer on every route. */
async function pressAndJudge(page, e) {
  const btn = page.locator(`[${RESTORE_MARK}] button`, { hasText: RESTORE_LABEL });
  if (!(await btn.isVisible().catch(() => false))) return { why: 'the page did not offer the kept aside save back' };
  const pointer = (await underPointer(page, btn)).covered;
  const pressDoc = await page.evaluate(() => String(Math.round(performance.timeOrigin)));
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }),
    btn.evaluate(b => b.click()),
  ]);
  await settle(page);
  const v = await page.evaluate(readVerdict, { saveKey: e.saveKey, prefix: `${e.saveKey}${BACKUP_MARK}`, pressDoc, tamper: CONTROL === 'tamper' });
  if (v.sameDoc) return { why: 'the press did not load a new document, so nothing was measured' };
  return { v, pointer };
}

/* A dialog a game opens as it arrives (how to play, a welcome) is closed the way a player closes it. */
async function closeDialogs(page) {
  for (let i = 0; i < 3; i += 1) {
    const open = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].some(d => d.getBoundingClientRect().width > 0));
    if (!open) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
  }
}

/* One press of the toggle journey, with a real pointer, and everything it is held to. Returns { why } when it failed. */
async function togglePress(page, e, keeperCode, press) {
  await closeDialogs(page);
  const btn = page.locator(`[${RESTORE_MARK}] button`, { hasText: RESTORE_LABEL });
  if (!(await btn.isVisible().catch(() => false))) return { why: 'the card offers NOTHING: no "Put that save back" button is on screen' };
  await page.evaluate(keeperCode);
  /* What the card is about to put back, asked of the library the card itself asks, and the marks readVerdict reads. */
  const before = await page.evaluate(([p, k]) => {
    const K = window.__dukbKeeper;
    const entry = K.CONTINUE_SAVES.find(x => x.path === p);
    const offered = K.offeredBackup(entry, window.localStorage);
    const asked = offered ? localStorage.getItem(offered) : null;
    if (asked === null) return null;
    const cur = localStorage.getItem(k);
    sessionStorage.setItem('__walk_A', asked);
    if (cur === null) sessionStorage.removeItem('__walk_B0'); else sessionStorage.setItem('__walk_B0', cur);
    sessionStorage.setItem('__walk_key', k);
    sessionStorage.setItem('__walk_log', '[]');
    return { doc: String(Math.round(performance.timeOrigin)), hist: history.length, otherAddress: `${location.pathname}${location.search}` !== p, playing: asked === cur };
  }, [e.path, e.saveKey]);
  if (!before) return { why: 'the card shows its button, but the library offers no backup' };
  if (before.playing) return { why: 'the card offers the very save that is being played' };
  const at = await underPointer(page, btn);
  if (at.covered) return { why: `a pointer cannot press the button: at its centre it hits ${at.covered}` };
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }),
    page.mouse.click(at.x, at.y),
  ]);
  await settle(page);
  const v = await page.evaluate(readVerdict, { saveKey: e.saveKey, prefix: `${e.saveKey}${BACKUP_MARK}`, pressDoc: before.doc, tamper: false });
  if (v.sameDoc) return { why: 'the press did not load a new document' };
  if (!(v.aSomewhere && v.aIsTheGame)) return { why: `the save asked for is ${v.aSomewhere ? 'kept but is not the game on screen' : 'in NO KEY'} (writes to the key: ${v.lineage || 'none'})` };
  if (v.bKnown && !v.bKeptAside) return { why: 'the game he had is not kept aside' };
  const hist = await page.evaluate(() => history.length);
  /* Only a load to ANOTHER address can tell a replace from an assign: a load to the address the page is already
     on replaces its history entry either way. The journey opens each route with a query string for this. */
  if (before.otherAddress && hist !== before.hist) return { why: `the load left a way back into the page that held the old game: the history went from ${before.hist} to ${hist} entries (replace, not assign)` };
  await closeDialogs(page);
  /* The card says once what happened, and its OK is pressed with the pointer too. */
  const said = await page.evaluate(mark => {
    const c = document.querySelector(`[${mark}][data-dukb-put-back]`);
    return c ? { state: c.getAttribute('data-dukb-put-back'), text: (c.textContent || '').replace(/\s+/g, ' ').trim() } : null;
  }, RESTORE_MARK);
  if (!said || said.state !== 'done') return { why: said ? `the card says the put back was refused: ${said.text.slice(0, 90)}` : 'the load said nothing: no outcome card is on screen' };
  const okBtn = page.locator(`[${RESTORE_MARK}] button`, { hasText: 'OK' });
  const okAt = await underPointer(page, okBtn);
  if (okAt.covered) return { why: `a pointer cannot press OK: at its centre it hits ${okAt.covered}` };
  await page.mouse.click(okAt.x, okAt.y);
  await page.waitForTimeout(400);
  if (CONTROL === 'answered' && press === 1) {
    /* Control: every kept aside save of this game is listed as answered, the way the old card's memory could
       leave them, and the page is loaded again. The card then has nothing to offer and the journey must say so. */
    await page.evaluate(([k, prefix, seen]) => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) { const key = localStorage.key(i); if (key && key.startsWith(prefix)) keys.push(key); }
      localStorage.setItem(seen, JSON.stringify({ [k]: keys }));
    }, [e.saveKey, `${e.saveKey}${BACKUP_MARK}`, SEEN_KEY]);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    await closeDialogs(page);
  }
  /* THE MAJOR: after the press and its OK the card must still offer the game he just put down. */
  if (!(await btn.isVisible().catch(() => false))) {
    const kept = await page.evaluate(prefix => { let n = 0; for (let i = 0; i < localStorage.length; i += 1) if ((localStorage.key(i) || '').startsWith(prefix)) n += 1; return n; }, `${e.saveKey}${BACKUP_MARK}`);
    return { why: `the card offers NOTHING after the press and its OK, with ${kept} save(s) of this game kept aside and no other door to them` };
  }
  await page.evaluate(keeperCode);
  const next = await page.evaluate(([p, pressDoc]) => {
    const K = window.__dukbKeeper;
    const entry = K.CONTINUE_SAVES.find(x => x.path === p);
    const offered = K.offeredBackup(entry, window.localStorage);
    const B = sessionStorage.getItem(`__walk_last_${pressDoc}`) ?? sessionStorage.getItem('__walk_B0');
    return { offers: offered !== null, theGameHeHad: offered !== null && B !== null && localStorage.getItem(offered) === B, hadOne: B !== null };
  }, [e.path, before.doc]);
  if (next.hadOne && !next.theGameHeHad) return { why: 'after the press the card offers another save than the game he just put down' };
  return { v, hist: [before.hist, hist], told: before.otherAddress };
}

/* Journey T, the toggle: put a save back, put the other one back again, and again. */
async function toggleFlow(browser, site, e, width, A, B, keeperCode, shots) {
  const r = { flow: 'toggle', route: e.path, width, judged: false, why: '', presses: 0, histTold: 0 };
  const { ctx, page } = await openContext(browser, site, width, e.path);
  try {
    r.aLength = await plant(page, e, A, B);
    if (r.aLength < 0) { r.why = 'the walk could not plant the two saves'; return r; }
    await page.goto(`${site}${e.path}?walk=toggle`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    for (let press = 1; press <= TOGGLE_PRESSES; press += 1) {
      const step = await togglePress(page, e, keeperCode, press);
      if (step.why) { r.why = `press ${press}: ${step.why}`; if (shots) await shot(page, `toggle-${slug(e.path)}-${width}-stopped-at-press-${press}.png`); return r; }
      r.presses = press;
      if (step.told) r.histTold += 1;
      r.v = step.v;
      if (shots) await shot(page, `toggle-${slug(e.path)}-${width}-after-press-${press}.png`);
    }
    r.judged = true;
    return r;
  } catch (err) {
    r.why = `walk threw after ${r.presses} press(es): ${String(err?.message || err).split('\n')[0]}`;
    return r;
  } finally {
    await ctx.close().catch(() => {});
  }
}

/* Plants A as a kept aside backup of this game, from a page that is not the game. b is the save at the key, or null for none. */
const plant = (page, e, a, b) => page.evaluate(([k, bk, A, B]) => {
  const text = A === null ? localStorage.getItem(k) : A;
  if (text === null) return -1;
  localStorage.setItem(bk, text);
  if (B === null) localStorage.removeItem(k); else localStorage.setItem(k, B);
  sessionStorage.setItem('__walk_A', text);
  if (B !== null) sessionStorage.setItem('__walk_B0', B);
  sessionStorage.setItem('__walk_key', k);
  sessionStorage.setItem('__walk_log', '[]');
  return localStorage.getItem(bk) === text && localStorage.getItem(k) === B ? text.length : -1;
}, [e.saveKey, `${e.saveKey}${BACKUP_MARK}${PLANT_STAMP}`, a, b]);

/* Journey L, the fresh flow: both games are made by the game itself, in the browser. */
async function freshFlow(browser, site, e, width, shots) {
  const r = { flow: 'fresh', route: e.path, width, judged: false, why: '' };
  const { ctx, page } = await openContext(browser, site, width, e.path);
  try {
    await page.goto(`${site}${e.path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    await waitForKey(page, e.saveKey, 7000);
    await page.goto(`${site}/robots.txt`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    r.aLength = await plant(page, e, null, null);
    if (r.aLength < 0) { r.why = 'a clean visit left no save at the key, so this flow has no game to put back'; return r; }
    await page.goto(`${site}${e.path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    await waitForKey(page, e.saveKey, 7000);
    if (shots) await shot(page, `offer-${slug(e.path)}-${width}.png`);
    const res = await pressAndJudge(page, e);
    if (res.why) { r.why = res.why; return r; }
    r.v = res.v;
    r.pointer = res.pointer;
    r.judged = true;
    if (shots) await shot(page, `after-${slug(e.path)}-${width}.png`);
    return r;
  } catch (err) {
    r.why = `walk threw: ${String(err?.message || err).split('\n')[0]}`;
    return r;
  } finally {
    await ctx.close().catch(() => {});
  }
}

/* Journey L, the planted flow: real engine saves, B at the key and A kept aside. */
async function plantedFlow(browser, site, e, width, A, B, shots) {
  const r = { flow: 'planted', route: e.path, width, judged: false, why: '' };
  const { ctx, page } = await openContext(browser, site, width, e.path);
  try {
    r.aLength = await plant(page, e, A, B);
    if (r.aLength < 0) { r.why = 'the walk could not plant the two saves'; return r; }
    await page.goto(`${site}${e.path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    r.broke = await page.evaluate(b => (document.body?.innerText ?? '').includes(b), BROKE);
    if (shots) await shot(page, `offer-planted-${slug(e.path)}-${width}.png`);
    const res = await pressAndJudge(page, e);
    if (res.why) { r.why = `${res.why}${r.broke ? ' (the page broke on this fixture, and the card lives inside the boundary)' : ''}`; return r; }
    r.v = res.v;
    r.pointer = res.pointer;
    r.judged = true;
    if (shots) await shot(page, `after-planted-${slug(e.path)}-${width}.png`);
    return r;
  } catch (err) {
    r.why = `walk threw: ${String(err?.message || err).split('\n')[0]}`;
    return r;
  } finally {
    await ctx.close().catch(() => {});
  }
}

/* Journey L, the cross flow: the academy's save, put back from the Stadium Tycoon page with the academy open. */
async function crossFlow(browser, site, width, keeperCode) {
  const wf = entryOf('/wonderkid-factory');
  const r = { flow: 'cross', route: '/wonderkid-factory from /stadium-tycoon', width, judged: false, why: '' };
  const { ctx, page } = await openContext(browser, site, width);
  try {
    await page.goto(`${site}${wf.path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    await waitForKey(page, wf.saveKey, 7000);
    await page.goto(`${site}/robots.txt`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    r.aLength = await plant(page, wf, null, null);
    if (r.aLength < 0) { r.why = 'the academy left no save on a clean visit'; return r; }
    await page.goto(`${site}/stadium-tycoon`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    const tab = page.locator('#root button', { hasText: 'Academy' }).first();
    if (!(await tab.count())) { r.why = 'the Stadium Tycoon page has no Academy tab to open'; return r; }
    await tab.evaluate(b => b.click());
    if (!(await waitForKey(page, wf.saveKey, 9000))) { r.why = 'the Academy tab did not put an academy in memory (it wrote no save in 9 s)'; return r; }
    const pressDoc = await page.evaluate(() => String(Math.round(performance.timeOrigin)));
    const histBefore = await page.evaluate(() => history.length);
    await page.evaluate(keeperCode);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }),
      page.evaluate(([p, bk, how]) => {
        const K = window.__dukbKeeper;
        const entry = K.CONTINUE_SAVES.find(x => x.path === p);
        if (how === 'inplace') {
          /* Control inplace: Round 958's swap under the open page, then a load. */
          if (!K.restoreBackup(entry, bk, window.localStorage).ok) throw new Error('the in place swap was refused');
          setTimeout(() => window.location.assign(p), 0);
        } else {
          const res = K.restoreNow(entry, bk);
          if (!res.ok) throw new Error(`restoreNow refused: ${res.why}`);
          /* Control assignload: staged the keeper's way, but loaded with assign, which leaves the old page one Back press away. */
          if (how === 'assignload') setTimeout(() => window.location.assign(p), 0);
          else setTimeout(() => K.reopenGame(p), 0);
        }
      }, [wf.path, `${wf.saveKey}${BACKUP_MARK}${PLANT_STAMP}`, CONTROL]),
    ]);
    await settle(page);
    r.v = await page.evaluate(readVerdict, { saveKey: wf.saveKey, prefix: `${wf.saveKey}${BACKUP_MARK}`, pressDoc, tamper: false });
    if (r.v.sameDoc) { r.why = 'no new document was loaded, so nothing was measured'; return r; }
    /* Round 1219 review: this load goes from one address to another, so the history can tell a replace (the
       same number of entries) from an assign (one more, and the old page a Back press away). */
    r.hist = [histBefore, await page.evaluate(() => history.length)];
    r.judged = true;
    return r;
  } catch (err) {
    r.why = `walk threw: ${String(err?.message || err).split('\n')[0]}`;
    return r;
  } finally {
    await ctx.close().catch(() => {});
  }
}


/* Which routes write a save with no press: a clean visit, then leave. */
async function writesWithNoPress(browser, site, e) {
  const { ctx, page } = await openContext(browser, site, WIDTHS[0], e.path);
  try {
    await page.goto(`${site}${e.path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    await waitForKey(page, e.saveKey, 7000);
    await page.goto(`${site}/robots.txt`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    return await page.evaluate(k => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i));
      return { wrote: localStorage.getItem(k) !== null, keys: keys.sort() };
    }, e.saveKey);
  } catch (err) {
    return { wrote: false, keys: [], threw: String(err?.message || err).split('\n')[0] };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/* Journey K: a real save of every game, the home page and every route once, then the KEYS. */
async function keysAfterVisit(browser, site, fleet, extraKey) {
  const { ctx, page } = await openContext(browser, site, WIDTHS[0]);
  try {
    await page.evaluate(pairs => { for (const [k, v] of pairs) localStorage.setItem(k, v); }, ENTRIES.map(e => [e.saveKey, fleet[e.path][0]]));
    if (extraKey) await page.evaluate(() => localStorage.setItem('dukb-control-extra-key', '1'));
    for (const p of ['/', ...ENTRIES.map(e => e.path)]) {
      await page.goto(`${site}${p}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await settle(page);
    }
    await page.goto(`${site}/robots.txt`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    return await page.evaluate(() => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i));
      return keys.sort();
    });
  } finally {
    await ctx.close().catch(() => {});
  }
}

/* The boot pass, timed in the page at a 4x CPU throttle. */
async function bootCost(browser, site, fleet, keeperCode) {
  const { ctx, page } = await openContext(browser, site, WIDTHS[0]);
  try {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const biggest = r => [...fleet[r]].sort((a, b) => b.length - a.length)[0];
    const chars = await page.evaluate(pairs => { let n = 0; for (const [k, v] of pairs) { localStorage.setItem(k, v); n += v.length; } return n; }, ENTRIES.map(e => [e.saveKey, biggest(e.path)]));
    await page.evaluate(keeperCode);
    const time = () => page.evaluate(() => {
      const K = window.__dukbKeeper;
      const t0 = performance.now(); K.runSaveKeeper(); const first = performance.now() - t0;
      const t1 = performance.now(); for (let i = 0; i < 200; i += 1) K.runSaveKeeper(); const mean = (performance.now() - t1) / 200;
      return { first, mean, keys: localStorage.length };
    });
    const heldAll = await time();
    await page.evaluate(() => localStorage.clear());
    const empty = await time();
    return { chars, heldAll, empty };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/* The keeper bundled from source for the page: the cross flow's door and the cost measurement. */
async function keeperForPage() {
  const outfile = path.join(TMP, 'keeper.page.js');
  await build({
    stdin: {
      contents: "export { restoreNow, reopenGame, runSaveKeeper } from './src/lib/saveKeeper';\nexport { restoreBackup, offeredBackup } from './src/lib/brokenSaveRecovery';\nexport { CONTINUE_SAVES } from './src/data/continueSaves';\n",
      resolveDir: ROOT, loader: 'ts',
    },
    bundle: true, format: 'iife', globalName: '__dukbKeeper', platform: 'browser', outfile, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') },
  });
  return `${fs.readFileSync(outfile, 'utf8')}\n;window.__dukbKeeper = __dukbKeeper; void 0;`;
}

/* ------------------------------------------------------------------ */
const PARTS_OF_CONTROL = { inplace: 'cross', assignload: 'cross', extrakey: 'K', tamper: 'fresh', answered: 'toggle' };
const PARTS = (process.env.PARTS || PARTS_OF_CONTROL[CONTROL] || 'fresh,planted,cross,toggle,K,cost').split(',').map(s => s.trim());
const has = p => PARTS.includes(p);
if (MODE === 'assert' && !CONTROL && !BASE_DIST && !NO_BASE_SAID && (has('fresh') || has('planted') || has('K'))) {
  console.error('playSaveKeeper: no build of the tree BEFORE this round was given (KEEPER_BASE_DIST), so the base arm, which loses the save on five routes and is this walk\'s loss control, and journey K would not run.');
  console.error('playSaveKeeper: REFUSED. Give it that build (the header says which), or set KEEPER_NO_BASE=1 to walk the branch arm alone; the closing line then says the control was not run.');
  process.exit(2);
}
const SHOT_ROUTES = ['/idle-arena', '/club-manager'];
/* LOST: the save that was put back is not the game on screen AND its bytes are in no key. (A game that loads A and
   at once saves it again in its own shape has A on screen and A's exact bytes nowhere, on a build that removes the
   backup: Soccer Career does that on origin/main. That is not a loss, and it is not SURVIVED either.)
   SURVIVED: A is the game on screen, A's bytes are still in a key, and the game he had is kept aside. */
const judge = r => {
  if (!r.judged) return 'NOT JUDGED';
  r.lost = !r.v.aSomewhere && !r.v.aIsTheGame;
  r.ok = r.v.aSomewhere && r.v.aIsTheGame && (!r.v.bKnown || r.v.bKeptAside);
  return r.lost ? 'LOST    ' : r.ok ? 'SURVIVED' : 'PARTLY  ';
};
const say = (r, label) => {
  const tag = judge(r);
  if (!r.judged) { console.log(`  NOT JUDGED  [${label}] ${r.flow} ${r.route} ${r.width}: ${r.why}`); return; }
  const v = r.v;
  console.log(`  ${tag}  [${label}] ${r.flow} ${r.route} ${r.width}: A (${r.aLength} chars) is in ${v.holdersOfA.length ? v.holdersOfA.join(', ') : 'NO KEY'}; A is the game on screen: ${v.aIsTheGame}; the game he had is kept aside: ${v.bKnown ? v.bKeptAside : 'none to keep'}; writes to the key: ${v.lineage || 'none'}; backups ${v.backups}${r.pointer === undefined ? '' : `; the button under a pointer: ${r.pointer ? `NO, covered by ${r.pointer}` : 'yes'}`}${r.hist ? `; history entries ${r.hist[0]} then ${r.hist[1]}` : ''}`);
};

const arms = { branch: [], main: [] };
const toggles = [];
let keys = null;
let cost = null;
const noPress = [];
const browser = await chromium.launch();
try {
  console.log(`playSaveKeeper: mode ${MODE}${CONTROL ? `, CONTROL ${CONTROL}` : ''}, parts ${PARTS.join(' ')}, ${routes.length} route(s), widths ${WIDTHS.join(' and ')}`);
  console.log(`  branch build ${DIST}`);
  console.log(BASE_DIST ? `  origin/main build ${BASE_DIST}` : '  no build of origin/main was given, so the base arm and journey K are not run');
  const needSaves = has('planted') || has('toggle') || has('K') || has('cost');
  const real = needSaves ? await buildRealSaves({ root: ROOT, tmpDir: path.join(TMP, 'real'), seeds: [0, 1, 2, 3] }) : null;
  const keeperCode = has('cross') || has('toggle') || has('cost') ? await keeperForPage() : '';
  const site = await serve(DIST);
  const baseSite = BASE_DIST ? await serve(BASE_DIST) : null;

  if (has('fresh')) {
    console.log('\nA clean visit and a leave, per route: does the game write its save with no press?');
    for (const e of routes) {
      const w = await writesWithNoPress(browser, site, e);
      if (w.wrote) noPress.push(e);
      console.log(`  ${w.wrote ? 'WRITES' : 'quiet '}  ${e.path}${w.threw ? ` (threw: ${w.threw})` : ''}  keys left: ${w.keys.join(', ') || 'none'}`);
    }
  }
  for (const [label, s] of [['branch', site], ['main', baseSite]]) {
    if (!s) continue;
    /* The base arm is a control: one width is enough to see a loss again. */
    const widths = label === 'branch' ? WIDTHS : [WIDTHS[0]];
    const where = label === 'branch' ? 'the branch' : 'the build of origin/main';
    if (has('fresh')) {
      console.log(`\nJourney L, the fresh flow, on ${where}: the ${noPress.length} route(s) that write with no press`);
      for (const e of noPress) for (const width of widths) {
        const r = await freshFlow(browser, s, e, width, label === 'branch' && SHOT_ROUTES.includes(e.path));
        arms[label].push(r);
        say(r, label);
      }
    }
    if (has('planted')) {
      console.log(`\nJourney L, the planted flow, on ${where}: real engine saves on ${routes.length} route(s)`);
      for (const e of routes) for (const width of widths) {
        const [A, B] = real.fleet[e.path];
        const r = await plantedFlow(browser, s, e, width, A, B, label === 'branch' && SHOT_ROUTES.includes(e.path));
        arms[label].push(r);
        say(r, label);
      }
    }
  }
  if (has('cross')) {
    console.log(`\nJourney L, the cross flow: an academy backup put back from /stadium-tycoon with the Academy tab open${CONTROL === 'inplace' ? ' (CONTROL: swapped in the open page, as Round 958 did)' : ''}`);
    for (const width of WIDTHS) {
      const r = await crossFlow(browser, site, width, keeperCode);
      arms.branch.push(r);
      say(r, 'branch');
    }
  }
  if (has('toggle')) {
    console.log(`\nJourney T, the toggle, on the branch: ${TOGGLE_PRESSES} presses in a row with a real pointer on ${routes.length} route(s) at ${WIDTHS[0]}, the card's OK pressed after each${CONTROL === 'answered' ? ' (CONTROL: every kept aside save is listed as answered after the first press)' : ''}`);
    for (const e of routes) {
      const [A, B] = real.fleet[e.path];
      const r = await toggleFlow(browser, site, e, WIDTHS[0], A, B, keeperCode, SHOT_ROUTES.includes(e.path) || e.path === '/fight-gym');
      toggles.push(r);
      console.log(r.judged
        ? `  HELD        toggle ${r.route} ${r.width}: ${r.presses} of ${TOGGLE_PRESSES} presses, each put back the save asked for, kept the game he had and left the card offering it; the history told a replace from an assign on ${r.histTold} of them`
        : `  STOPPED     toggle ${r.route} ${r.width}: ${r.why}`);
    }
  }
  if (has('K') && baseSite) {
    console.log('\nJourney K: the storage keys after an ordinary visit (a real save of all 21 games, the home page and every route once)');
    const onMain = await keysAfterVisit(browser, baseSite, real.fleet, false);
    const onBranch = await keysAfterVisit(browser, site, real.fleet, CONTROL === 'extrakey');
    keys = { onMain, onBranch, added: onBranch.filter(k => !onMain.includes(k)), gone: onMain.filter(k => !onBranch.includes(k)) };
    console.log(`  origin/main: ${onMain.length} keys. branch: ${onBranch.length} keys. Added on the branch: ${keys.added.join(', ') || 'none'}. Only on origin/main: ${keys.gone.join(', ') || 'none'}.`);
    console.log(`  the branch's keys: ${onBranch.join(', ')}`);
  }
  if (has('cost')) {
    cost = await bootCost(browser, site, real.fleet, keeperCode);
    const ms = x => x.toFixed(3);
    console.log(`\nThe boot pass in Chromium at a 4x CPU throttle, the largest real save of all 21 games held (${cost.chars} chars in storage, ${cost.heldAll.keys} keys):`);
    console.log(`  first pass ${ms(cost.heldAll.first)} ms, then ${ms(cost.heldAll.mean)} ms a pass over 200. An empty store: first ${ms(cost.empty.first)} ms, then ${ms(cost.empty.mean)} ms a pass.`);
  }
} finally {
  await browser.close().catch(() => {});
  for (const s of servers) s.kill();
}

/* ------------------------------------------------------------------ */
const problems = [];
const br = arms.branch;
const brJudged = br.filter(r => r.judged);
const count = (list, f) => list.filter(f).length;
console.log('');
console.log(`playSaveKeeper, branch: ${brJudged.length} walk(s) judged (${count(brJudged, r => r.flow === 'fresh')} fresh, ${count(brJudged, r => r.flow === 'planted')} planted, ${count(brJudged, r => r.flow === 'cross')} cross): ${count(brJudged, r => r.lost)} LOST the save that was put back, ${count(brJudged, r => !r.ok && !r.lost)} partly, ${count(brJudged, r => r.ok)} survived; ${br.length - brJudged.length} not judged`);
if (arms.main.length) {
  const mj = arms.main.filter(r => r.judged);
  const lostRoutes = [...new Set(mj.filter(r => r.lost).map(r => r.route))];
  console.log(`playSaveKeeper, origin/main: ${mj.length} walk(s) judged: ${count(mj, r => r.lost)} LOST, on ${lostRoutes.join(', ') || 'no route'}; ${count(mj, r => r.ok)} survived; ${arms.main.length - mj.length} not judged`);
  const walked = routes.map(e => e.path);
  for (const p of LOSS_ON_MAIN.filter(x => walked.includes(x))) {
    const mine = mj.filter(r => r.route === p);
    if (mine.length === 0 || mine.some(r => !r.lost)) problems.push(`the base arm did not lose the save on ${p} in every walk (${mine.length} judged there, ${count(mine, r => r.lost)} lost), so this walk can no longer see the loss it was written for`);
  }
  for (const p of lostRoutes.filter(x => !LOSS_ON_MAIN.includes(x))) problems.push(`origin/main ALSO loses the save on ${p}: add it to LOSS_ON_MAIN with the date it was measured`);
}

const tgHeld = toggles.filter(r => r.judged);
if (toggles.length) console.log(`playSaveKeeper, the toggle: ${tgHeld.length} of ${toggles.length} route(s) held through ${TOGGLE_PRESSES} presses with a real pointer; the history told a replace from an assign on ${count(toggles, r => r.histTold > 0)} of them`);
const pointed = br.filter(r => r.judged && r.pointer !== undefined);
if (pointed.length) console.log(`playSaveKeeper, journey L's own presses (made in the page, see pressAndJudge): the button was under a pointer in ${count(pointed, r => r.pointer === '')} of ${pointed.length} walk(s)${count(pointed, r => r.pointer !== '') ? `; covered on ${[...new Set(pointed.filter(r => r.pointer !== '').map(r => `${r.flow} ${r.route} ${r.width} (${r.pointer})`))].join(', ')}` : ''}`);
const crossWalks = br.filter(r => r.flow === 'cross' && r.judged && r.hist);

if (MODE === 'report') { console.log('playSaveKeeper: report mode, nothing asserted.'); process.exit(0); }

if (CONTROL === 'answered') {
  /* Every kept aside save was listed as answered after the first press: the card has nothing to offer and every route must stop there. */
  const fired = toggles.length > 0 && toggles.every(r => !r.judged && r.why.startsWith('press 1: the card offers NOTHING'));
  console.log(fired
    ? `playSaveKeeper control answered: FIRED. ${toggles.length} of ${toggles.length} route(s) stopped at "the card offers NOTHING" after the first press.`
    : `playSaveKeeper control answered: DID NOT FIRE. ${count(toggles, r => r.judged)} of ${toggles.length} route(s) still held; stops: ${[...new Set(toggles.filter(r => !r.judged).map(r => r.why))].join(' | ') || 'none'}`);
  process.exit(fired ? 1 : 2);
}
if (CONTROL === 'assignload') {
  /* The load was made with assign: the save still survives (it was staged), and the history must have grown by one. */
  const fired = crossWalks.length > 0 && crossWalks.length === count(br, r => r.flow === 'cross') && crossWalks.every(r => r.hist[1] === r.hist[0] + 1);
  console.log(fired
    ? `playSaveKeeper control assignload: FIRED. ${crossWalks.length} of ${crossWalks.length} walk(s) saw the history grow by one entry, the old page a Back press away.`
    : `playSaveKeeper control assignload: DID NOT FIRE. History before and after: ${crossWalks.map(r => `${r.hist[0]} then ${r.hist[1]}`).join(', ') || 'no cross walk was judged'}.`);
  process.exit(fired ? 1 : 2);
}
if (CONTROL === 'inplace') {
  const fired = brJudged.length > 0 && br.length === brJudged.length && brJudged.every(r => r.lost);
  console.log(fired
    ? `playSaveKeeper control inplace: FIRED. ${brJudged.length} of ${brJudged.length} walk(s) LOST the save.`
    : `playSaveKeeper control inplace: DID NOT FIRE. ${count(brJudged, r => r.lost)} of ${br.length} walk(s) lost the save.`);
  process.exit(fired ? 1 : 2);
}
if (CONTROL === 'tamper') {
  /* One character of every copy of A was changed: A's bytes are in no key, so no walk may read SURVIVED. */
  const fired = brJudged.length > 0 && br.length === brJudged.length && brJudged.every(r => !r.ok && !r.v.aSomewhere);
  console.log(fired
    ? `playSaveKeeper control tamper: FIRED. ${brJudged.length} of ${brJudged.length} walk(s) stopped reading SURVIVED once one character changed.`
    : `playSaveKeeper control tamper: DID NOT FIRE. ${count(brJudged, r => r.ok)} of ${br.length} walk(s) still read SURVIVED.`);
  process.exit(fired ? 1 : 2);
}
if (CONTROL === 'extrakey') {
  const fired = !!keys && keys.added.includes('dukb-control-extra-key');
  console.log(fired
    ? 'playSaveKeeper control extrakey: FIRED. Journey K saw the key the branch arm added.'
    : `playSaveKeeper control extrakey: DID NOT FIRE. ${keys ? `Added: ${keys.added.join(', ') || 'none'}` : 'Journey K did not run (it needs KEEPER_BASE_DIST)'}.`);
  process.exit(fired ? 1 : 2);
}

if (brJudged.length === 0 && toggles.length === 0) problems.push('nothing was judged on the branch, so nothing is proven');
/* Round 1219 review. The toggle: every route must hold through every press. And where the load goes from one address
   to another, the history must not grow. */
for (const r of toggles.filter(x => !x.judged)) problems.push(`toggle ${r.route} ${r.width}: ${r.why}`);
if (has('toggle') && toggles.length && !toggles.some(r => r.histTold > 0)) problems.push('the toggle journey never loaded from one address to another, so its history check told nothing');
for (const r of crossWalks.filter(x => x.hist[1] !== x.hist[0])) problems.push(`cross ${r.route} ${r.width}: the load left a way back into the page that held the old game (history went from ${r.hist[0]} to ${r.hist[1]} entries): replace, not assign`);
for (const r of brJudged.filter(x => !x.ok)) problems.push(`${r.flow} ${r.route} ${r.width}: ${r.lost ? 'LOST the save that was put back' : `kept A but ${r.v.aIsTheGame ? 'the game he had is not kept aside' : 'A is not the game on screen'}`}`);
/* A fresh or cross walk that cannot be judged is a failure. A planted one is reported: it is this walk's fixture
   the page refused, and the routes that matter must still have been judged. */
for (const r of br.filter(x => !x.judged && x.flow !== 'planted')) problems.push(`${r.flow} ${r.route} ${r.width}: not judged (${r.why})`);
if (has('fresh') && noPress.length === 0) problems.push('no route wrote a save with no press, so the fresh flow judged nothing');
if (has('planted')) {
  const must = [...LOSS_ON_MAIN, '/club-manager'].filter(p => routes.some(e => e.path === p));
  for (const p of must) if (!brJudged.some(r => r.flow === 'planted' && r.route === p)) problems.push(`the planted flow could not judge ${p}`);
  console.log(`playSaveKeeper: the planted flow judged ${new Set(brJudged.filter(r => r.flow === 'planted').map(r => r.route)).size} of ${routes.length} route(s)`);
}
if (keys && keys.added.length) problems.push(`journey K: the branch adds storage key(s) to an ordinary visit: ${keys.added.join(', ')}`);
if (has('K') && !keys) console.log('playSaveKeeper: journey K was NOT run (no build of origin/main was given).');

if (problems.length) {
  for (const p of problems) console.error(`  FAIL  ${p}`);
  console.error(`playSaveKeeper: RED, ${problems.length} problem(s).`);
  process.exit(1);
}
if (!BASE_DIST && (has('fresh') || has('planted') || has('K'))) {
  /* Said in as many words (KEEPER_NO_BASE=1), and never the plain green line. */
  console.log('playSaveKeeper: green on the BRANCH ARM ONLY (KEEPER_NO_BASE=1). The base arm and journey K were NOT run, so this run carries no loss control and says nothing about the keys an ordinary visit stores.');
  process.exit(0);
}
console.log('playSaveKeeper: green. A save put back with a game in memory survives the load, and an ordinary visit stores nothing new.');
