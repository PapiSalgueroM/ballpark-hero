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
 *  errors   no page error, no sideways scroll at 390
 * Every request that leaves the origin is aborted (supabase.co first, and
 * counted), so nothing here can reach the live database.
 *
 * Printed and not judged: after a Retry that worked the line at the top still
 * says the storage is full until the page is loaded again (Round 1142 never
 * takes a refusal back within a visit). Known, reported, the lead's call.
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
const NAMED = { hidden: ['full'], keeptoast: ['toast'], raw: ['blocked'], open: ['blocked', 'full'] };
if (CONTROL && !(CONTROL in NAMED)) { console.error(`unknown US_SAVE_SEAM_CONTROL ${CONTROL}`); process.exit(2); }
const ALL = { nba: 'nba-my-career-save-v1', nfl: 'nfl-my-career-save-v1', mlb: 'mlb-my-career-save-v1', nhl: 'nhl-my-career-save-v1' };
const ASKED = (process.env.SPORTS ?? 'nba,nfl,mlb,nhl').split(',').map(s => s.trim()).filter(s => s in ALL);
/* a control walks only the arms its check lives in */
const MODES = CONTROL === 'raw' ? ['blocked'] : CONTROL === 'open' ? ['blocked', 'full'] : CONTROL ? ['full'] : ['open', 'blocked', 'full'];
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
  const re = /(could not be saved\. Stay on this page and use Retry save\.["'`]\)[;,]return\(\)=>\{)[\w$]+\.dismiss\([\w$]+\)(\})/g;
  const where = assets.filter(f => (textOf(f).match(re) ?? []).length > 0);
  if (where.length !== 1 || (textOf(where[0]).match(re) ?? []).length !== 1) refuse(`the toast's cleanup is in ${where.length} chunks (${where.map(f => (textOf(f).match(re) ?? []).length).join(', ')} times), expected once in one`);
  served.set(where[0], textOf(where[0]).replace(re, '$1$2'));
  console.log(`CONTROL keeptoast: the served board never takes its toast back (${where[0]})`);
}
if (CONTROL === 'raw') console.log('CONTROL raw: window.__DUKB_RAW_STORAGE__ is set before the app loads, so there is no seam');
if (CONTROL === 'open') console.log('CONTROL open: the blocked and full arms run with storage left alone');

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
function breakStorage({ mode, raw }) {
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
  return {
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
  await ctx.addInitScript(breakStorage, { mode, raw: CONTROL === 'raw' });
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
      /* the browser takes writes again */
      await page.evaluate(() => { if (window.__seamRealSet) Storage.prototype.setItem = window.__seamRealSet; });
      const retried = await clickButton(page, '^Retry save$');
      const age = Date.now() - pressedAt;
      const gone = await page.waitForFunction(() => !document.querySelector('[data-us-career-save-error]'), null, { timeout: 3000 }).then(() => true, () => false);
      const afterRetry = await read(page, key);
      check('retry', retried && gone && afterRetry.phase === 'prospect', `${tag}: once the browser takes writes again Retry save puts the prospect on the store and the notice goes (${say(afterRetry)})`);
      const taken = await page.waitForFunction(words => ![...document.querySelectorAll('[data-sonner-toast]')].some(t => (t.textContent ?? '').includes(words)), TOAST_WORDS, { timeout: 1500 }).then(() => true, () => false);
      /* a toast lives about four seconds on its own: only a Retry pressed well inside that proves anything */
      if (age > 3000) console.log(`note ${tag}: Retry save was pressed ${age} ms after the refusal, too late for the toast check to mean anything on this run`);
      check('toast', taken, `${tag}: the toast that said the save had failed is gone with the notice (Retry pressed ${age} ms after the refusal)`);
      const last = await read(page, key);
      if (last.line) console.log(`note ${tag}: after a Retry that worked the line at the top still says "${last.line.words}" (known: Round 1142 never takes a refusal back within a visit)`);
    }
    check('errors', !s.broke && errors.length === 0 && !s.sideways, `${tag}: no page error and no sideways scroll at 390${errors.length ? ` (${errors.slice(0, 2).join(' | ')})` : ''}${s.broke ? ' (This page broke)' : ''}`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `save-seam-${sport}-${arm}.png`) });
  } catch (e) {
    const seen = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200)).catch(() => 'nothing readable');
    check(arm, false, `${tag}: the walk stopped: ${String(e).split('\n')[0].slice(0, 200)}; the page reads "${seen}"${errors.length ? `; it said: ${errors.slice(0, 2).join(' | ')}` : ''}`);
  }
  await ctx.close();
}

for (const sport of ASKED) for (const arm of MODES) await journey(sport, arm);
await browser.close();
console.log(`requests to supabase.co aborted: ${aborted}`);
const failed = [...fails.values()].reduce((a, l) => a + l.length, 0);
if (CONTROL) {
  const want = NAMED[CONTROL];
  const ok = want.every(n => fails.has(n));
  console.log(`${ok ? `control ${CONTROL}: RED AT THE NAMED CHECK (${want.join(', ')})` : `control ${CONTROL}: DID NOT FIRE AT ITS NAMED CHECK (${want.join(', ')})`}; checks red: ${[...fails.keys()].join(', ') || 'none'}`);
  console.log(`playUsCareerSaveSeam: ${ASKED.length * MODES.length} journeys, ${checks} checks, ${failed} failed (control ${CONTROL})`);
  stop(ok ? 1 : 2);
}
console.log(`playUsCareerSaveSeam: ${ASKED.length * MODES.length} journeys, ${checks} checks, ${failed} failed`);
stop(failed ? 1 : 0);
