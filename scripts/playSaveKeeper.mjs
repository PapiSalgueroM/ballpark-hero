/**
 * Round 1219: a put back that survives.
 *
 * WHAT IT MEASURES. Round 958 keeps a save aside when a page breaks and
 * offers it back on the game's own page ("Put that save back",
 * src/components/BrokenSaveRestore.tsx). This walk presses that button in a
 * real Chromium WITH A GAME IN THE PAGE'S MEMORY, which no check did before,
 * and then asks three things of the browser's own storage:
 *   1. is the save that was put back (A) still in ANY key, byte for byte?
 *   2. is A the game the page is running after the load (the last write of A
 *      to the game's key was made by the page now on screen, and no other
 *      page wrote that key after it)?
 *   3. is the game the player had before the press (B, its last write) kept
 *      aside byte for byte?
 * See the header's MEASURED block for what origin/main answered.
 *
 * HOW A GAME GETS INTO MEMORY. Journey L, the fresh flow: several long games
 * make a fresh game when they open with no save and write it with no press
 * (a timer, and a write as the page leaves). Which ones is MEASURED here, not
 * listed: every route of src/data/continueSaves.ts is opened once in a clean
 * browser and the routes whose own key then holds a save are the ones walked.
 * That first save is A (made by the game's real engine, in the browser). It
 * is planted once as a kept aside backup from a document that is not the game
 * (an init script would plant it again on every load and the walk could
 * never see what a reload left), the route is opened again so a second fresh
 * game B is in memory, and the card's button is pressed.
 *
 * HOW THE KEY'S HISTORY IS READ. An init script wraps Storage.prototype's
 * setItem and removeItem and keeps a log in sessionStorage (which survives a
 * load in the same tab and is not the storage under test). It plants nothing.
 * Every comparison with A is made inside the page with ===, never on a string
 * passed out through the driver.
 *
 * MODES. KEEPER_MODE=report prints and exits 0 (step 0's measurement).
 * KEEPER_MODE=expect-loss is the control arm for a build of origin/main: it
 * exits 0 only when every route in LOSS_ON_MAIN lost A, and prints FIRED or
 * DID NOT FIRE. The default asserts all three answers on every route walked.
 *
 * NETWORK. Everything that is not this machine is aborted, the database host
 * included: this walk never reaches production.
 *
 * RUN. It needs a build (vite build), then
 *   KEEPER_DIST=<dist folder> node scripts/playSaveKeeper.mjs
 * ONLY=/idle-arena,/stadium-tycoon narrows the routes, WIDTHS=390 the widths.
 */
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.resolve(process.env.KEEPER_DIST || path.join(ROOT, 'dist'));
const MODE = process.env.KEEPER_MODE || 'assert';
if (!['assert', 'report', 'expect-loss'].includes(MODE)) { console.error(`KEEPER_MODE=${MODE} is not a mode this walk knows`); process.exit(1); }
const WIDTHS = (process.env.WIDTHS || '390,1280').split(',').map(s => Number(s.trim())).filter(Boolean);
const RESTORE_MARK = 'data-dukb-set-aside';
const RESTORE_LABEL = 'Put that save back';
const BROKE = 'This page broke';
const BACKUP_MARK = '.broken-';
const PLANT_STAMP = '2026-01-02T03-04-05';

const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* The routes come from the list itself, one line per row, the way
   scripts/playCorruptSaves.mjs reads them. */
const listSrc = stripComments(fs.readFileSync(path.join(ROOT, 'src/data/continueSaves.ts'), 'utf8'));
const ENTRIES = [];
for (const line of listSrc.split('\n')) {
  const m = /^\s*\{ path: '([^']+)', saveKey: '([^']+)'/.exec(line);
  if (m) ENTRIES.push({ path: m[1], saveKey: m[2] });
}
if (ENTRIES.length < 21) { console.error(`read ${ENTRIES.length} long games from continueSaves.ts, expected at least 21; the row pattern no longer matches`); process.exit(1); }
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(s => s.trim()) : null;
const routes = ONLY ? ENTRIES.filter(e => ONLY.includes(e.path)) : ENTRIES;
if (routes.length === 0) { console.error('no routes matched ONLY'); process.exit(1); }

const restoreCode = stripComments(fs.readFileSync(path.join(ROOT, 'src/components/BrokenSaveRestore.tsx'), 'utf8'));
if (!restoreCode.includes(RESTORE_MARK) || !restoreCode.includes(RESTORE_LABEL)) {
  console.error(`src/components/BrokenSaveRestore.tsx carries no ${RESTORE_MARK} card with "${RESTORE_LABEL}", so there is no button to press`);
  process.exit(1);
}
const assetsDir = path.join(DIST, 'assets');
if (!fs.existsSync(path.join(DIST, 'index.html')) || !fs.existsSync(assetsDir)) { console.error(`no build at ${DIST}; run vite build first`); process.exit(1); }

const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const PORT = await freePort();
const BASE = `http://127.0.0.1:${PORT}`;
const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('the host-like server did not start within 20 s')), 20000);
  server.stdout.on('data', d => { if (String(d).includes('host-like server')) { clearTimeout(t); resolve(); } });
  server.once('exit', code => { clearTimeout(t); reject(new Error(`the host-like server exited with ${code}`)); });
});
const isLocal = u => u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:');

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

async function openContext(browser, width) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 800 } });
  await ctx.route('**/*', req => (isLocal(req.request().url()) ? req.continue() : req.abort()));
  await ctx.addInitScript(installLog);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  return { ctx, page };
}

/* What the storage says after the press and the load. Runs in the page. */
function readVerdict({ saveKey, prefix, pressDoc }) {
  const A = sessionStorage.getItem('__walk_A');
  const B = sessionStorage.getItem(`__walk_last_${pressDoc}`);
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
    aIsTheGame: lastA >= 0 && sets[lastA].doc === doc && sets.slice(lastA + 1).every(r => r.doc === doc),
    bKnown: B !== null,
    bKeptAside: B !== null && backups.some(k => localStorage.getItem(k) === B),
    bAtKey: B !== null && localStorage.getItem(saveKey) === B,
    lineage: sets.map(r => `${r.isA ? 'A' : 'x'}${r.doc === doc ? '' : "'"}`).join(' '),
    backups: backups.length,
    sameDoc: doc === pressDoc,
  };
}

/* Journey L, the fresh flow, one route at one width. */
async function freshFlow(browser, e, width) {
  const r = { route: e.path, width, judged: false, why: '', v: null };
  const { ctx, page } = await openContext(browser, width);
  try {
    /* 1. The first fresh game, written by the game itself: that is A. */
    await page.goto(`${BASE}${e.path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    await waitForKey(page, e.saveKey, 7000);
    await page.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!(await held(page, e.saveKey))) { r.why = 'a clean visit left no save at the key, so this flow has no game in memory to judge'; return r; }
    const planted = await page.evaluate(([k, bk]) => {
      const a = localStorage.getItem(k);
      localStorage.setItem(bk, a);
      localStorage.removeItem(k);
      sessionStorage.setItem('__walk_A', a);
      sessionStorage.setItem('__walk_key', k);
      sessionStorage.setItem('__walk_log', '[]');
      return localStorage.getItem(bk) === a && localStorage.getItem(k) === null ? a.length : -1;
    }, [e.saveKey, `${e.saveKey}${BACKUP_MARK}${PLANT_STAMP}`]);
    if (planted < 0) { r.why = 'the walk could not plant A as a kept aside backup'; return r; }
    r.aLength = planted;
    /* 2. A second fresh game, B, in the page's memory. */
    await page.goto(`${BASE}${e.path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    await waitForKey(page, e.saveKey, 7000);
    const btn = page.locator(`[${RESTORE_MARK}] button`, { hasText: RESTORE_LABEL });
    if (!(await btn.isVisible().catch(() => false))) { r.why = 'the game\'s page did not offer the kept aside save back'; return r; }
    const pressDoc = await page.evaluate(() => String(Math.round(performance.timeOrigin)));
    /* 3. The press, and the load it asks for. */
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }),
      btn.evaluate(b => b.click()),
    ]);
    await settle(page);
    r.v = await page.evaluate(readVerdict, { saveKey: e.saveKey, prefix: `${e.saveKey}${BACKUP_MARK}`, pressDoc });
    if (r.v.sameDoc) { r.why = 'the press did not load a new document, so nothing was measured'; return r; }
    r.judged = true;
    return r;
  } catch (err) {
    r.why = `walk threw: ${String(err?.message || err).split('\n')[0]}`;
    return r;
  } finally {
    await ctx.close().catch(() => {});
  }
}

/* Which routes write a save with no press: a clean visit, then leave. Also
   prints every key the visit left, for the reader. */
async function writesWithNoPress(browser, e) {
  const { ctx, page } = await openContext(browser, WIDTHS[0]);
  try {
    await page.goto(`${BASE}${e.path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    await waitForKey(page, e.saveKey, 7000);
    await page.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded', timeout: 30000 });
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

/* ------------------------------------------------------------------ */
const results = [];
const noPress = [];
const browser = await chromium.launch();
try {
  console.log(`playSaveKeeper: mode ${MODE}, ${routes.length} route(s), widths ${WIDTHS.join(' and ')}, build ${DIST}`);
  console.log('\nA clean visit and a leave, per route: does the game write its save with no press?');
  for (const e of routes) {
    const w = await writesWithNoPress(browser, e);
    if (w.wrote) noPress.push(e);
    console.log(`  ${w.wrote ? 'WRITES' : 'quiet '}  ${e.path}${w.threw ? ` (threw: ${w.threw})` : ''}  keys left: ${w.keys.join(', ') || 'none'}`);
  }
  console.log(`\nJourney L, the fresh flow, on the ${noPress.length} route(s) that write with no press:`);
  for (const e of noPress) {
    for (const width of WIDTHS) {
      const r = await freshFlow(browser, e, width);
      results.push(r);
      if (!r.judged) { console.log(`  NOT JUDGED  ${r.route} ${r.width}: ${r.why}`); continue; }
      const v = r.v;
      r.lost = !v.aSomewhere;
      r.ok = v.aSomewhere && v.aIsTheGame && (!v.bKnown || v.bKeptAside);
      console.log(`  ${r.lost ? 'LOST    ' : r.ok ? 'SURVIVED' : 'WRONG   '}  ${r.route} ${r.width}: A (${r.aLength} chars) is in ${v.holdersOfA.length ? v.holdersOfA.join(', ') : 'NO KEY'}; A is the game on screen: ${v.aIsTheGame}; the game he had is kept aside: ${v.bKnown ? v.bKeptAside : 'never written'} (at the key: ${v.bAtKey}); writes to the key: ${v.lineage || 'none'}; backups ${v.backups}`);
    }
  }
} finally {
  await browser.close().catch(() => {});
  server.kill();
}

const judged = results.filter(r => r.judged);
const lost = judged.filter(r => r.lost);
const wrong = judged.filter(r => !r.ok && !r.lost);
const unjudged = results.filter(r => !r.judged);
console.log('');
console.log(`playSaveKeeper journey L: ${judged.length} walk(s) judged over ${noPress.length} route(s) that write with no press (${noPress.map(e => e.path).join(', ') || 'none'}): ${lost.length} LOST the save that was put back, ${wrong.length} kept it but not as the game on screen or lost the other one, ${judged.length - lost.length - wrong.length} survived, ${unjudged.length} not judged`);

if (MODE === 'report') { console.log('playSaveKeeper: report mode, nothing asserted.'); process.exit(0); }
if (judged.length === 0) { console.error('playSaveKeeper: nothing was judged, so nothing is proven'); process.exit(1); }
if (lost.length + wrong.length + unjudged.length > 0) {
  console.error(`playSaveKeeper: ${lost.length} lost, ${wrong.length} wrong, ${unjudged.length} not judged: ${[...lost, ...wrong, ...unjudged].map(r => `${r.route} ${r.width}`).join(', ')}`);
  process.exit(1);
}
console.log('playSaveKeeper: green. A save put back with a game in memory survives the load.');
