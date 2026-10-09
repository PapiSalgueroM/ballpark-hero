/**
 * Release AN: where a US career's refused save meets the storage seam, in a
 * real browser (chromium) on the built site, served the way the live host
 * serves it (scripts/lib/hostLikeServer.mjs on dist).
 *
 * Two rounds from two lanes shipped in one release and nobody had seen them
 * side by side. Round 1084 (the four US My Careers): a save the device
 * refuses is SAID, with a notice that carries a Retry save button and one
 * toast, and the career waits in the open page until the write goes through.
 * Round 1142 (src/lib/safeStorage.ts): a browser that blocks storage gets a
 * store for the visit put on window, and a browser whose storage is full
 * keeps its own, so a game that guards its own save still sees the write
 * fail. One line at the top of a game page says which of the two it is.
 * What that has to mean together is what this walks, and until this file it
 * was held by one jsdom test (NBA only) and a probe nobody committed.
 *
 * On a 390 by 844 phone, a first visit, for nba, nfl, mlb and nhl, the press
 * is "Play your road to the draft" (the first save a new player makes):
 *  open     ordinary storage: no line, no notice, no toast, and the prospect
 *           is on the browser's own store
 *  blocked  reading storage throws and the Web Locks API refuses: the page
 *           plays, the line says blocked, and there is NO Retry notice and no
 *           toast (the seam's store took the write, so nothing was refused);
 *           nothing reaches the browser's own store
 *  full     every write throws: the line says full, the Retry notice is up
 *           for a write, in view and with nothing over it, there is exactly
 *           one toast, the two notices do not overlap, and nothing reached
 *           the store
 *  retry    the browser takes writes again: Retry save puts the prospect on
 *           the store and the notice goes
 *  toast    and the toast that said the save had failed is gone with it
 *           (Release AN fix: it used to stay up for the rest of its seconds)
 *  banner   (Round 1144) this is a first visit, so the cookie banner is up
 *           under all of it: the save toast is on the screen, on top, and
 *           does not overlap the banner
 *  line     (Round 1144) after the Retry that worked, the line at the top
 *           that said the storage is full leaves, on the same page (no
 *           load), and the game under it has not moved up by more than that
 *           one line
 *  errors   no page error, no sideways scroll at 390
 * And three journeys on a store that is REALLY full (Round 1144 review: the
 * arms above patch setItem so that every write throws, and a real browser
 * does not behave like that; see quotaJourney below), once, on nba:
 *  quota    returning: the bracket page saves what it loaded as it opens,
 *           which a full store takes; the line says full there and stays,
 *           still says full on the next game with no page load, and the
 *           career's first save is refused under it.
 *           little: with room for a probe and not for the save, Retry save
 *           is refused again and the line still says full; with real room
 *           it goes through and the line leaves on the same page
 *  kept     a cookie choice made under the line is on the device once there
 *           is room and the line has left
 * Every request that leaves the origin is aborted (supabase.co first, and
 * counted), so nothing here can reach the live database.
 *
 * MEASURED for Round 1144 on a Linux runner, 390 by 844, the four sports
 * giving the same numbers. Until that round the stale line was printed here
 * as a note and not judged, and nothing measured the toast against the
 * banner.
 *   Before (main, Release AO): the save toast at 675..748 and the cookie
 *   banner at 701..844, 47 px of one over the other; after a Retry that
 *   worked the line still said "Storage is full, so progress won't save."
 *   12 journeys, 56 checks, 8 failed: banner and line, four each.
 *   After: the toast at 597..689 (it carries a button now, so it is taller),
 *   the banner at 701..844, nothing shared and 12 px of air; the line gone
 *   on the same page, the game moved 0 px (the line was 28 px tall and its
 *   place is kept until the next page). 56 checks, 0 failed.
 *   The controls: stale leaves the line up on all four (4 failed), sitover
 *   puts the toast back at 656..748 and 47 px into the banner (4 failed).
 *
 * MEASURED for the review of Round 1144, same runner, the three real quota
 * journeys on nba (Chromium took 55 fillers before it refused one; the
 * prospect's save is 369 characters):
 *   Before (the round's first cut, where any write the browser took had
 *   taken "full" back): 5 of the 11 quota checks failed. returning: the line
 *   went none at 46 ms, full at 139, left at 299 on the bracket page, said
 *   nothing on the career and nothing over the refused save (3). little:
 *   with 204 characters of room Retry save was refused and the line had left
 *   (1). kept: the cookie choice was not on the store after the line left
 *   (1).
 *   After: 0 failed. returning: none at 88 ms, full at 205, and it stays
 *   through all three steps. little: refused again with the line still up,
 *   then saved and the line gone on the same page. kept: "essential" on the
 *   store. 6 journeys with SPORTS=nba, 25 checks; the whole walk is 15
 *   journeys and 67 checks, 0 failed.
 *   The control quotafree: 8 of its 11 checks failed, quota and kept both.
 *   The save toast has a second line since the same review ("Retry here
 *   does the same thing."), so it stands at 576..689 now, still 12 px clear
 *   of the banner at 701..844.
 *
 * Controls (US_SAVE_SEAM_CONTROL=), each expected to go red at its own check
 * (a control run exits 1 and says so; 2 when it could not run or did not
 * fire where it should):
 *   hidden    the served notice is display none (its classes swapped for
 *             "hidden" in the one chunk that holds it)          -> full
 *   keeptoast the served board never takes its toast back       -> toast
 *   raw       window.__DUKB_RAW_STORAGE__ is set before the app
 *             loads, which is Round 1142's own switch for "no
 *             seam at all"                                      -> blocked
 *   open      the blocked and full arms run with storage left
 *             alone                                             -> blocked, full
 *   stale     (Round 1144) when the browser takes writes again it
 *             still refuses the seam's own probe key, so the
 *             career is saved and the seam cannot find out: the
 *             line stays, which is the page before that round   -> line
 *   sitover   (Round 1144) a style rule pins the toasts at the
 *             six rem they sat at before that round, whatever
 *             the banner's height                               -> banner
 *   quotafree (Round 1144 review) the real quota journeys run on
 *             a store that was seeded and never filled, so
 *             nothing is refused and no line is owed            -> quota, kept
 *
 * Run: npm run build, then
 *   MSYS_NO_PATHCONV=1 node scripts/playUsCareerSaveSeam.mjs
 * (SPORTS=nba to scope, PORT to move the server, SHOTS for screenshots).
 * Green is the closing summary line AND exit 0.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, process.env.DIST ?? 'dist');
const PORT = Number(process.env.PORT ?? 4398);
const BASE = `http://localhost:${PORT}`;
const SHOTS = process.env.SHOTS ? path.resolve(ROOT, process.env.SHOTS) : '';
const CONTROL = process.env.US_SAVE_SEAM_CONTROL ?? '';
const NAMED = { hidden: ['full'], keeptoast: ['toast'], raw: ['blocked'], open: ['blocked', 'full'], stale: ['line'], sitover: ['banner'], quotafree: ['quota', 'kept'] };
/* the seam's own probe key (src/lib/safeStorage.ts), which the stale control keeps refusing */
const PROBE_KEY = '__dukb_storage_probe__';
if (CONTROL && !(CONTROL in NAMED)) { console.error(`unknown US_SAVE_SEAM_CONTROL ${CONTROL}`); process.exit(2); }
const ALL = { nba: 'nba-my-career-save-v1', nfl: 'nfl-my-career-save-v1', mlb: 'mlb-my-career-save-v1', nhl: 'nhl-my-career-save-v1' };
const ASKED = (process.env.SPORTS ?? 'nba,nfl,mlb,nhl').split(',').map(s => s.trim()).filter(s => s in ALL);
/* a control walks only the arms its check lives in */
const MODES = CONTROL === 'quotafree' ? [] : CONTROL === 'raw' ? ['blocked'] : CONTROL === 'open' ? ['blocked', 'full'] : CONTROL ? ['full'] : ['open', 'blocked', 'full'];
/* The real quota journeys (see quotaJourneys below) run once, on one sport: the seam is the same file
   for all four, and filling a store to the last character is the slow part. QUOTA=0 leaves them out. */
const QUOTA = (!CONTROL || CONTROL === 'quotafree') && process.env.QUOTA !== '0';
const TOAST_WORDS = 'could not be saved. Stay on this page and use Retry save.';
if (!ASKED.length) { console.error('playUsCareerSaveSeam: no sport to walk'); process.exit(1); }
if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.error(`playUsCareerSaveSeam: no build at ${DIST} (run npm run build first)`); process.exit(1); }
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

let checks = 0;
const fails = new Map();
const check = (name, ok, label) => { checks += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} [${name}] ${label}`); if (!ok) { if (!fails.has(name)) fails.set(name, []); fails.get(name).push(label); } return ok; };

/* The built chunks, and what a control serves instead. Each control refuses
   to run (exit 2) unless its needle is there exactly once in exactly one
   chunk: a control that edited nothing must never read as one that fired. */
const assets = fs.readdirSync(path.join(DIST, 'assets')).filter(f => f.endsWith('.js'));
const textOf = f => fs.readFileSync(path.join(DIST, 'assets', f), 'utf8');
const served = new Map();
const refuse = why => { console.error(`control ${CONTROL} refused: ${why}`); process.exit(2); };
if (CONTROL === 'hidden') {
  const BOX = '"sticky top-0 z-40 mb-3 rounded-xl border border-destructive/50 bg-card p-3 text-xs leading-relaxed"';
  const where = assets.filter(f => textOf(f).includes('data-us-career-save-error'));
  if (where.length !== 1) refuse(`the notice's marker is in ${where.length} chunks, expected one`);
  const t = textOf(where[0]);
  if (t.split(BOX).length - 1 !== 1) refuse(`the notice's classes appear ${t.split(BOX).length - 1} times in ${where[0]}, expected once`);
  served.set(where[0], t.replace(BOX, '"hidden"'));
  console.log(`CONTROL hidden: the served notice is display none (${where[0]})`);
}
if (CONTROL === 'keeptoast') {
  /* the effect's cleanup, found by the words of the toast it follows: the dismiss call is taken out */
  /* Round 1144: the toast is given options after its words (how long it stays, the Retry it carries),
     so the cleanup is no longer the next thing after the closing quote. Up to 400 characters of
     options are stepped over, none of them a return, and it still has to match exactly once. */
  const re = /(could not be saved\. Stay on this page and use Retry save\.["'`](?:(?!return)[\s\S]){0,400}?\)[;,]return\(\)=>\{)[\w$]+\.dismiss\([\w$]+\)(\})/g;
  const where = assets.filter(f => (textOf(f).match(re) ?? []).length > 0);
  if (where.length !== 1 || (textOf(where[0]).match(re) ?? []).length !== 1) refuse(`the toast's cleanup is in ${where.length} chunks (${where.map(f => (textOf(f).match(re) ?? []).length).join(', ')} times), expected once in one`);
  served.set(where[0], textOf(where[0]).replace(re, '$1$2'));
  console.log(`CONTROL keeptoast: the served board never takes its toast back (${where[0]})`);
}
if (CONTROL === 'raw') console.log('CONTROL raw: window.__DUKB_RAW_STORAGE__ is set before the app loads, so there is no seam');
if (CONTROL === 'open') console.log('CONTROL open: the blocked and full arms run with storage left alone');
if (CONTROL === 'stale') {
  /* a control that refuses a key the app never writes proves nothing: the key has to be in the build */
  if (!assets.some(f => textOf(f).includes(PROBE_KEY))) refuse(`no built chunk holds the seam's probe key ${PROBE_KEY}`);
  console.log(`CONTROL stale: when writes come back the browser still refuses ${PROBE_KEY}`);
}
if (CONTROL === 'sitover') console.log('CONTROL sitover: a style rule pins the toasts six rem off the bottom, where they sat before Round 1144');
if (CONTROL === 'quotafree') console.log('CONTROL quotafree: the real quota journeys run on a store that was seeded and never filled, so nothing is refused');

const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
const stop = code => { try { server.kill(); } catch { /* gone */ } process.exit(code); };
await new Promise(r => setTimeout(r, 1200));
{
  /* The port must be serving THIS build: when another run's server already holds it, ours never binds
     and the browser would be handed a different tree's chunks. The entry page's bytes are the proof. */
  const got = await new Promise(res => {
    http.get(`${BASE}/index.html`, r => { const parts = []; r.on('data', c => parts.push(c)); r.on('end', () => res(Buffer.concat(parts))); }).on('error', () => res(null));
  });
  if (!got || Buffer.compare(got, fs.readFileSync(path.join(DIST, 'index.html'))) !== 0) {
    console.error(`playUsCareerSaveSeam: port ${PORT} is not serving ${DIST} (another server holds the port?). Set PORT to a free one.`);
    stop(1);
  }
}

/* Runs in the page before any of its code. `mode` is what the browser does
   with storage on this visit; the browser's own store is kept aside first so
   the walk can read what really reached it. */
function breakStorage({ mode, raw, sitover }) {
  if (sitover) {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = '[data-sonner-toaster]{--mobile-offset-bottom:6rem !important}';
      document.head.appendChild(style);
    });
  }
  let real = null;
  try { real = window.localStorage; } catch { /* none */ }
  Object.defineProperty(window, '__seamReal', { value: real, enumerable: false, configurable: true });
  Object.defineProperty(window, '__seamRefused', { value: { total: 0 }, enumerable: false, configurable: true });
  if (raw) window.__DUKB_RAW_STORAGE__ = true;
  if (mode === 'blocked') {
    for (const name of ['localStorage', 'sessionStorage']) {
      const boom = () => { throw new DOMException(`Failed to read the '${name}' property from 'Window': Access is denied for this document.`, 'SecurityError'); };
      const own = Object.getOwnPropertyDescriptor(window, name);
      Object.defineProperty(window, name, { configurable: own ? own.configurable : true, enumerable: true, get: boom });
    }
    if (window.LockManager && window.LockManager.prototype) {
      window.LockManager.prototype.request = function request() { return Promise.reject(new DOMException('The request was denied.', 'SecurityError')); };
    }
  } else if (mode === 'full') {
    const set = Storage.prototype.setItem;
    Object.defineProperty(window, '__seamRealSet', { value: set, enumerable: false, configurable: true });
    Storage.prototype.setItem = function setItem() { window.__seamRefused.total += 1; throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); };
  }
}

/* What is on the page, measured: the two notices with their boxes, whether
   the Retry notice is really seen (the element on top at its middle is the
   notice or inside it), the toasts by their words, and what the browser's
   own store holds under the career's key. */
const read = (page, key) => page.evaluate(([k, words]) => {
  const box = el => { if (!el) return null; const q = el.getBoundingClientRect(); return { t: Math.round(q.top), b: Math.round(q.bottom), h: Math.round(q.height) }; };
  const notice = document.querySelector('[data-us-career-save-error]');
  const line = document.querySelector('[data-dukb-storage-notice]');
  let seen = false;
  if (notice) {
    const q = notice.getBoundingClientRect();
    const top = q.height > 0 ? document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2) : null;
    seen = q.height > 0 && q.top >= 0 && q.bottom <= window.innerHeight && !!top && notice.contains(top);
  }
  let disk = null;
  try { disk = window.__seamReal ? window.__seamReal.getItem(k) : null; } catch { disk = 'THROWS'; }
  let phase = null;
  try { phase = disk ? JSON.parse(disk).phase : null; } catch { phase = 'UNREADABLE'; }
  const toasts = [...document.querySelectorAll('[data-sonner-toast]')].map(t => (t.textContent ?? '').trim());
  /* Round 1144: the save toast and the cookie banner as boxes, and where the game starts on the page */
  const rect = el => { if (!el) return null; const q = el.getBoundingClientRect(); return { t: Math.round(q.top), b: Math.round(q.bottom), l: Math.round(q.left), r: Math.round(q.right) }; };
  const saveToast = [...document.querySelectorAll('[data-sonner-toast]')].find(t => (t.textContent ?? '').includes(words)) ?? null;
  let toastSeen = false;
  if (saveToast) {
    const q = saveToast.getBoundingClientRect();
    const top = q.height > 0 ? document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2) : null;
    toastSeen = q.height > 0 && q.top >= 0 && q.bottom <= window.innerHeight && !!top && saveToast.contains(top);
  }
  const banner = document.querySelector('[aria-label="Cookie choices"]');
  const game = document.getElementById('dukb-main') ?? document.querySelector('main');
  return {
    toast: rect(saveToast), toastSeen,
    banner: banner && getComputedStyle(banner).position === 'fixed' ? rect(banner) : null,
    gameTop: game ? Math.round(game.getBoundingClientRect().top + window.scrollY) : null,
    stayed: window.__seamStayed === 1,
    notice: notice ? { op: notice.getAttribute('data-save-operation'), box: box(notice), seen } : null,
    line: line ? { trouble: line.getAttribute('data-dukb-storage-notice'), box: box(line), words: (line.querySelector('span')?.textContent ?? line.textContent ?? '').trim() } : null,
    toasts: toasts.length, saveToasts: toasts.filter(t => t.includes(words)).length,
    broke: (document.body.textContent ?? '').includes('This page broke'),
    phase, refused: window.__seamRefused ? window.__seamRefused.total : -1,
    sideways: document.documentElement.scrollWidth > window.innerWidth,
  };
}, [key, TOAST_WORDS]);
const clickButton = (page, source) => page.evaluate(src => {
  const rx = new RegExp(src, 'i');
  const b = [...document.querySelectorAll('button')].find(x => !x.disabled && rx.test((x.textContent ?? '').trim()));
  if (b) b.click();
  return !!b;
}, source);
const hasButton = source => [source, src => { const rx = new RegExp(src, 'i'); return [...document.querySelectorAll('button')].some(b => rx.test((b.textContent ?? '').trim())); }];
const say = s => `line ${s.line ? `${s.line.trouble} ${s.line.box.t}..${s.line.box.b}` : 'none'}, Retry notice ${s.notice ? `${s.notice.op} ${s.notice.box.t}..${s.notice.box.b}${s.notice.seen ? ' seen' : ' NOT SEEN'}` : 'none'}, save toasts ${s.saveToasts}, refused writes ${s.refused}, on the browser's store: ${s.phase ?? 'nothing'}`;

const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
let aborted = 0;
const origin = new URL(BASE).origin;

async function journey(sport, arm) {
  const key = ALL[sport];
  /* the open control: the arm keeps its name and its checks, the browser is left alone */
  const mode = CONTROL === 'open' ? 'open' : arm;
  const tag = `${sport} ${arm}${CONTROL === 'open' ? ' (storage left alone)' : ''}`;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(breakStorage, { mode, raw: CONTROL === 'raw', sitover: CONTROL === 'sitover' });
  await ctx.route('**/*', r => {
    const url = r.request().url();
    let same = true;
    try { same = new URL(url).origin === origin; } catch { same = true; }
    if (!same) { if (url.includes('supabase.co')) aborted += 1; return r.abort(); }
    const name = url.split('/').pop().split('?')[0];
    if (served.has(name)) return r.fulfill({ status: 200, contentType: 'application/javascript', body: served.get(name) });
    return r.continue();
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e?.message ?? e).split('\n')[0].slice(0, 160)));
  try {
    await page.goto(`${BASE}/${sport}-my-career`, { waitUntil: 'load', timeout: 45000 });
    const [draft, draftFn] = hasButton('^Play your road to the draft$');
    await page.waitForFunction(draftFn, draft, { timeout: 30000 });
    /* a first visit opens the rules over the page a moment after the board: wait for them, close them the way a player does */
    const [rules, rulesFn] = hasButton("Let.s Play");
    await page.waitForFunction(rulesFn, rules, { timeout: 8000 }).catch(() => {});
    for (let i = 0; i < 3 && await clickButton(page, rules); i += 1) await page.waitForTimeout(350);
    const pressed = await clickButton(page, draft);
    const pressedAt = Date.now();
    await page.waitForTimeout(900);
    const s = await read(page, key);
    if (arm === 'open') {
      check('open', pressed && !s.line && !s.notice && s.saveToasts === 0 && s.phase === 'prospect', `${tag}: nothing is said and the prospect is on the browser's store (${say(s)})`);
    } else if (arm === 'blocked') {
      check('blocked', pressed && s.line?.trouble === 'blocked' && !s.notice && s.saveToasts === 0, `${tag}: the page plays, the line says blocked, and no save is called refused (${say(s)})`);
      check('blocked', s.phase === null, `${tag}: nothing reached the browser's own store (${s.phase ?? 'nothing'})`);
    } else {
      check('full', pressed && s.line?.trouble === 'full' && s.notice?.op === 'write' && s.refused > 0 && s.phase === null, `${tag}: the line says full, the Retry notice is up for a write and nothing reached the store (${say(s)})`);
      check('full', !!s.notice?.seen, `${tag}: the Retry notice is in view on the first screen with nothing over it (${say(s)})`);
      check('full', s.saveToasts === 1, `${tag}: the refused save is said in exactly one toast (${s.saveToasts} of ${s.toasts} on screen)`);
      check('full', !!s.notice && !!s.line && (s.notice.box.t >= s.line.box.b || s.line.box.t >= s.notice.box.b), `${tag}: the line and the Retry notice do not overlap (${say(s)})`);
      /* Round 1144: a first visit, so the cookie banner is up under the toast */
      const over = s.toast && s.banner ? Math.min(Math.min(s.toast.b, s.banner.b) - Math.max(s.toast.t, s.banner.t), Math.min(s.toast.r, s.banner.r) - Math.max(s.toast.l, s.banner.l)) : null;
      const boxes = `toast ${s.toast ? `${s.toast.t}..${s.toast.b}` : 'none'}${s.toastSeen ? ' seen' : ' NOT SEEN'}, banner ${s.banner ? `${s.banner.t}..${s.banner.b}` : 'none'}, shared ${over === null ? 'n/a' : `${Math.max(0, over)} px`}`;
      check('banner', !!s.toast && !!s.banner && s.toastSeen && over !== null && over <= 0, `${tag}: the save toast is on the screen, on top, and clear of the cookie banner (${boxes})`);
      /* the browser takes writes again (the stale control: all but the seam's own probe key) */
      await page.evaluate(([stale, probe]) => {
        window.__seamStayed = 1;
        const set = window.__seamRealSet;
        if (!set) return;
        Storage.prototype.setItem = !stale ? set : function setItem(k, v) {
          if (String(k) === probe) { window.__seamRefused.total += 1; throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); }
          return set.call(this, k, v);
        };
      }, [CONTROL === 'stale', PROBE_KEY]);
      const retried = await clickButton(page, '^Retry save$');
      const age = Date.now() - pressedAt;
      const gone = await page.waitForFunction(() => !document.querySelector('[data-us-career-save-error]'), null, { timeout: 3000 }).then(() => true, () => false);
      const afterRetry = await read(page, key);
      check('retry', retried && gone && afterRetry.phase === 'prospect', `${tag}: once the browser takes writes again Retry save puts the prospect on the store and the notice goes (${say(afterRetry)})`);
      const taken = await page.waitForFunction(words => ![...document.querySelectorAll('[data-sonner-toast]')].some(t => (t.textContent ?? '').includes(words)), TOAST_WORDS, { timeout: 1500 }).then(() => true, () => false);
      /* a toast lives about four seconds on its own: only a Retry pressed well inside that proves anything */
      if (age > 3000) console.log(`note ${tag}: Retry save was pressed ${age} ms after the refusal, too late for the toast check to mean anything on this run`);
      check('toast', taken, `${tag}: the toast that said the save had failed is gone with the notice (Retry pressed ${age} ms after the refusal)`);
      /* Round 1144: the line that said the storage is full leaves once a save has gone through, on this
         page, and the game under it does not move up by more than that one line */
      const left = await page.waitForFunction(() => !document.querySelector('[data-dukb-storage-notice]'), null, { timeout: 3000 }).then(() => true, () => false);
      const last = await read(page, key);
      const lineTall = s.line?.box.h ?? 0;
      const moved = s.gameTop !== null && last.gameTop !== null ? s.gameTop - last.gameTop : null;
      check('line', left && last.stayed && lineTall > 0 && moved !== null && moved >= 0 && moved <= lineTall,
        `${tag}: after the Retry that worked the line at the top leaves on the same page and the game moves up by no more than it (${last.line ? `still says "${last.line.words}"` : 'gone'}, ${last.stayed ? 'no page load' : 'THE PAGE LOADED AGAIN'}, the game moved ${moved === null ? 'n/a' : `${moved} px`}, the line was ${lineTall} px)`);
    }
    check('errors', !s.broke && errors.length === 0 && !s.sideways, `${tag}: no page error and no sideways scroll at 390${errors.length ? ` (${errors.slice(0, 2).join(' | ')})` : ''}${s.broke ? ' (This page broke)' : ''}`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `save-seam-${sport}-${arm}.png`) });
  } catch (e) {
    const seen = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200)).catch(() => 'nothing readable');
    check(arm, false, `${tag}: the walk stopped: ${String(e).split('\n')[0].slice(0, 200)}; the page reads "${seen}"${errors.length ? `; it said: ${errors.slice(0, 2).join(' | ')}` : ''}`);
  }
  await ctx.close();
}

/* ─── Round 1144 review: a store that is REALLY full ───
   Every arm above models full as "every write throws". Chromium is kinder, and the difference is where
   the first cut of that round went wrong: a full store still takes a write that needs no room (a page
   saving what it loaded), and with a little room it takes a probe while a save still does not fit. So
   these three journeys patch nothing: the store is filled to its last characters before the app loads,
   and room is made by removing fillers, the way a player makes it. */
function fillStore({ seeds, fill }) {
  try {
    if (!sessionStorage.getItem('__seamFilled')) {
      sessionStorage.setItem('__seamFilled', '1');
      for (const [k, v] of seeds) localStorage.setItem(k, v);
      let n = 0;
      if (fill) {
        for (const size of [1048576, 65536, 4096, 256, 16, 1]) {
          const s = 'x'.repeat(size);
          for (;;) { try { localStorage.setItem(`__f${size}_${n}`, s); n += 1; } catch { break; } }
        }
      }
      window.__seamFilled = n;
    }
  } catch (e) { window.__seamFillError = String(e); }
  /* what the line says, every 40 ms: a line that shows and leaves inside a second is still seen */
  window.__seamLine = [];
  const t0 = performance.now();
  setInterval(() => {
    const on = document.querySelector('[data-dukb-storage-notice]');
    const left = document.querySelector('[data-dukb-storage-notice-left]');
    const s = on ? on.getAttribute('data-dukb-storage-notice') : left ? 'left' : 'none';
    const last = window.__seamLine[window.__seamLine.length - 1];
    if (!last || last[1] !== s) window.__seamLine.push([Math.round(performance.now() - t0), s]);
  }, 40);
}
const quotaState = (page, key) => page.evaluate(k => {
  const on = document.querySelector('[data-dukb-storage-notice]');
  const left = document.querySelector('[data-dukb-storage-notice-left]');
  /* is the store still full: a key it does not hold, 40 characters, taken or refused */
  let room = 'taken';
  try { localStorage.setItem('__seamNewKey', 'x'.repeat(40)); localStorage.removeItem('__seamNewKey'); } catch { room = 'refused'; }
  const disk = localStorage.getItem(k);
  let phase = null;
  try { phase = disk ? JSON.parse(disk).phase : null; } catch { phase = 'UNREADABLE'; }
  return {
    line: on ? on.getAttribute('data-dukb-storage-notice') : left ? 'left' : 'none',
    history: (window.__seamLine ?? []).map(h => `${h[1]}@${h[0]}`).join(' '),
    room, phase, saveSize: disk ? disk.length : 0,
    notice: !!document.querySelector('[data-us-career-save-error]'),
    banner: !!document.querySelector('[aria-label="Cookie choices"]'),
    consent: localStorage.getItem('cookie-consent'),
    filled: window.__seamFilled ?? null, fillError: window.__seamFillError ?? null,
    stayed: window.__seamStayed === 1,
    broke: (document.body.textContent ?? '').includes('This page broke'),
  };
}, key);
/* frees one filler and puts all but about 200 characters of it back: room for a probe, not for a save */
const leaveLittle = page => page.evaluate(() => {
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith('__f')) continue;
    const size = (localStorage.getItem(k) ?? '').length;
    if (size < 256) continue;
    localStorage.removeItem(k);
    try { localStorage.setItem('__fPad', 'x'.repeat(size - 200)); } catch { return -1; }
    return 200 + k.length - '__fPad'.length;
  }
  return 0;
});
const freeAll = page => page.evaluate(() => {
  const ks = [];
  for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i); if (k && k.startsWith('__f')) ks.push(k); }
  ks.forEach(k => localStorage.removeItem(k));
  return ks.length;
});
const lineLeaves = page => page.waitForFunction(() => !document.querySelector('[data-dukb-storage-notice]'), null, { timeout: 3000 }).then(() => true, () => false);
const sayQuota = s => `line ${s.line} (${s.history || 'no history'}), a new key is ${s.room}, Retry notice ${s.notice ? 'up' : 'none'}, on the store: ${s.phase ?? 'nothing'}`;

async function quotaJourney(name, sport, seeds, walk) {
  const tag = `${sport} quota ${name}${CONTROL === 'quotafree' ? ' (store never filled)' : ''}`;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(fillStore, { seeds, fill: CONTROL !== 'quotafree' });
  await ctx.route('**/*', r => {
    const url = r.request().url();
    let same = true;
    try { same = new URL(url).origin === origin; } catch { same = true; }
    if (!same) { if (url.includes('supabase.co')) aborted += 1; return r.abort(); }
    return r.continue();
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e?.message ?? e).split('\n')[0].slice(0, 160)));
  const toBoard = async () => {
    const [draft, draftFn] = hasButton('^Play your road to the draft$');
    await page.waitForFunction(draftFn, draft, { timeout: 30000 });
    const [rules, rulesFn] = hasButton("Let.s Play");
    await page.waitForFunction(rulesFn, rules, { timeout: 8000 }).catch(() => {});
    for (let i = 0; i < 3 && await clickButton(page, rules); i += 1) await page.waitForTimeout(350);
    await page.waitForTimeout(600);
  };
  try {
    const last = await walk({ page, tag, key: ALL[sport], toBoard });
    check('errors', !last.broke && !last.fillError && errors.length === 0, `${tag}: no page error${errors.length ? ` (${errors.slice(0, 2).join(' | ')})` : ''}${last.fillError ? ` (the fill said: ${last.fillError})` : ''}${last.broke ? ' (This page broke)' : ''}`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `save-seam-${sport}-quota-${name}.png`) });
  } catch (e) {
    const seen = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200)).catch(() => 'nothing readable');
    check(name === 'kept' ? 'kept' : 'quota', false, `${tag}: the walk stopped: ${String(e).split('\n')[0].slice(0, 200)}; the page reads "${seen}"${errors.length ? `; it said: ${errors.slice(0, 2).join(' | ')}` : ''}`);
  }
  await ctx.close();
}
const WC_KEYS = [['wc2026-predictions', '{}'], ['wc2026-show-bracket', 'false'], ['wc2026-selected-thirds', '[]'], ['wc2026-playoff-picks', '{}']];
const CHOSEN = [['cookie-consent', 'essential']];

/* a returning player: the bracket page first, which saves what it loaded as it opens (four writes the
   full store takes, because none needs room), then a career with no page load in between */
const returning = sport => quotaJourney('returning', sport, [...CHOSEN, ...WC_KEYS], async ({ page, tag, key, toBoard }) => {
  await page.goto(`${BASE}/world-cup-bracket`, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(2500);
  const a = await quotaState(page, key);
  const leftOnce = /full@\d+ (left|none)/.test(a.history);
  check('quota', a.room === 'refused' && a.line === 'full' && !leftOnce, `${tag}: on a page that saves what it loaded the line says full and stays (${sayQuota(a)}, ${a.filled} fillers)`);
  await page.evaluate(p => { window.__seamStayed = 1; window.history.pushState({}, '', p); window.dispatchEvent(new PopStateEvent('popstate')); }, `/${sport}-my-career`);
  await toBoard();
  const b = await quotaState(page, key);
  check('quota', b.stayed && b.room === 'refused' && b.line === 'full', `${tag}: on the next game the line still says full (${sayQuota(b)}, ${b.stayed ? 'no page load' : 'THE PAGE LOADED AGAIN'})`);
  const pressed = await clickButton(page, '^Play your road to the draft$');
  await page.waitForTimeout(900);
  const c = await quotaState(page, key);
  check('quota', pressed && c.notice && c.phase === null && c.line === 'full', `${tag}: the career's first save is refused and the line at the top says why (${sayQuota(c)})`);
  return c;
});

/* room for a probe and not for the save: Retry save is refused again and the line must not leave; then
   real room, and it does */
const little = sport => quotaJourney('little', sport, CHOSEN, async ({ page, tag, key, toBoard }) => {
  await page.goto(`${BASE}/${sport}-my-career`, { waitUntil: 'load', timeout: 45000 });
  await toBoard();
  await page.evaluate(() => { window.__seamStayed = 1; });
  const pressed = await clickButton(page, '^Play your road to the draft$');
  await page.waitForTimeout(900);
  const a = await quotaState(page, key);
  check('quota', pressed && a.notice && a.phase === null && a.line === 'full', `${tag}: the first save is refused and the line says full (${sayQuota(a)})`);
  const freed = await leaveLittle(page);
  const again = await clickButton(page, '^Retry save$');
  await page.waitForTimeout(900);
  const b = await quotaState(page, key);
  check('quota', freed > 0 && again && b.room === 'taken' && b.notice && b.phase === null && b.line === 'full',
    `${tag}: with about ${freed} characters of room Retry save is refused again and the line still says full (${sayQuota(b)})`);
  const all = await freeAll(page);
  const third = await clickButton(page, '^Retry save$');
  const gone = await page.waitForFunction(() => !document.querySelector('[data-us-career-save-error]'), null, { timeout: 3000 }).then(() => true, () => false);
  const left = await lineLeaves(page);
  const c = await quotaState(page, key);
  check('quota', all > 0 && third && gone && left && c.phase === 'prospect' && c.line === 'left' && c.stayed,
    `${tag}: with real room Retry save goes through (${c.saveSize} characters) and the line leaves on the same page (${sayQuota(c)}, ${c.stayed ? 'no page load' : 'THE PAGE LOADED AGAIN'})`);
  return c;
});

/* a choice made under the line (the cookie banner's, through the seam) is kept for the visit, and it
   has to be on the device once there is room: before, the line left and the choice was gone at the
   next page load */
const kept = sport => quotaJourney('kept', sport, [], async ({ page, tag, key, toBoard }) => {
  await page.goto(`${BASE}/${sport}-my-career`, { waitUntil: 'load', timeout: 45000 });
  await toBoard();
  const a = await quotaState(page, key);
  const pressed = await clickButton(page, '^Essential only$');
  await page.waitForTimeout(700);
  const b = await quotaState(page, key);
  check('kept', a.banner && a.line === 'full' && pressed && !b.banner && b.consent === null && b.line === 'full',
    `${tag}: the cookie choice is taken while the store is full and the line still says full (banner ${a.banner ? 'up' : 'none'} then ${b.banner ? 'STILL UP' : 'gone'}, on the store: ${b.consent ?? 'nothing'}, ${sayQuota(b)})`);
  await freeAll(page);
  await page.evaluate(() => document.body.click());
  const left = await lineLeaves(page);
  const c = await quotaState(page, key);
  check('kept', left && c.line === 'left' && c.consent === 'essential' && !c.banner,
    `${tag}: once there is room the line leaves and the choice made under it is on the device (on the store: ${c.consent ?? 'NOTHING'}, ${sayQuota(c)})`);
  return c;
});

for (const sport of ASKED) for (const arm of MODES) await journey(sport, arm);
const QUOTA_WALKS = QUOTA ? [returning, little, kept] : [];
for (const walk of QUOTA_WALKS) await walk(ASKED.includes('nba') ? 'nba' : ASKED[0]);
await browser.close();
const JOURNEYS = ASKED.length * MODES.length + QUOTA_WALKS.length;
console.log(`requests to supabase.co aborted: ${aborted}`);
const failed = [...fails.values()].reduce((a, l) => a + l.length, 0);
if (CONTROL) {
  const want = NAMED[CONTROL];
  const ok = want.every(n => fails.has(n));
  console.log(`${ok ? `control ${CONTROL}: RED AT THE NAMED CHECK (${want.join(', ')})` : `control ${CONTROL}: DID NOT FIRE AT ITS NAMED CHECK (${want.join(', ')})`}; checks red: ${[...fails.keys()].join(', ') || 'none'}`);
  console.log(`playUsCareerSaveSeam: ${JOURNEYS} journeys, ${checks} checks, ${failed} failed (control ${CONTROL})`);
  stop(ok ? 1 : 2);
}
console.log(`playUsCareerSaveSeam: ${JOURNEYS} journeys, ${checks} checks, ${failed} failed`);
stop(failed ? 1 : 0);
