/**
 * Round 1048: the US careers' Season Center in a real browser (chromium), on
 * the built site served the way the live host serves it
 * (scripts/lib/hostLikeServer.mjs on dist), with a save made by the real
 * binding and a seeded Math.random. Every request to supabase.co is aborted
 * and counted: nothing here may reach the live database.
 *
 * At 390 by 844 and at 1280 by 800, for every bound sport:
 *  lazy       the chunk that carries the viewer (the one holding
 *             "data-us-season-centre") is not requested on load or on the
 *             hub, and is requested after the press; the eager chunks do not
 *             hold the sport's own words ("Tip off")
 *  same press one context presses "Play the", another "Week by week", on the
 *             same save and the same generator: the saved strings are equal;
 *             after watching to the review and closing, the save is still
 *             that string, the curtain is on screen, focus is on its
 *             Continue and scrollY is the first context's
 *  load first the viewer's chunks are in memory BEFORE the season is played:
 *             two frames after the press (the viewer chunk slowed) nothing
 *             is played and the button says it is loading; a viewer chunk
 *             that is gone (for as long as that page lives, which is what a
 *             release does to an open tab) reloads the page with NO season
 *             played, and
 *             the next press plays the season Play saves on a page loaded
 *             twice (a second load is not a first visit: the page's
 *             generator has been drawn a different number of times, which
 *             the walk prints); with the one reload already spent the
 *             "could not be loaded" tile shows, still with no season
 *             played, Back returns to the hub, a second press with the
 *             chunk still gone shows the tile again, and Reload gets a page
 *             whose next press works. Written so it reads the same whether
 *             the browser keeps a failed import failed or asks again.
 *  cover      on every frame from the press until the viewer is up, the
 *             curtain is never on screen without the opaque cover over it
 *  clock      frames sampled through a game: the score bug equals the points
 *             of the feed lines on screen, on every sample
 *  agreement  the review's tiles are on the curtain's stat line; the record
 *             equals the W and L counted in the game log; the scoreboard
 *             shows the game's own ids and no name is cut off; the feed's
 *             time column never overlaps its words
 *  layout     phone: no sideways scroll, the bar inside the viewport, the
 *             entry 44 px tall and visible, the game log opens and Back
 *             returns with nothing moved, no game log row wraps over the
 *             whole season; desktop: three columns, the page behind
 *             locked, and no Schedule name is cut off
 *  motion     reduced motion: no animation 100 ms after each arrival and the
 *             game is listed at once
 *  held       a year whose real length is not the career's shows its line
 *             and no button
 *  full storage (Release AN, phone) from the press on every write is refused:
 *             the season is played in memory, the save is untouched, and the
 *             viewer still opens on that season, under the cover
 *  retry in view (Round 1144, phone) the viewer is open over that refused
 *             save and the notice that carries Retry save is under the
 *             cover: a Retry button is on the screen with nothing over it,
 *             and once the browser takes writes again a real press on it
 *             puts the season on the store with the viewer still open
 *  reload holds (Round 1144, phone) a reload the app itself makes does not
 *             lose a save the browser refused. A stale chunk error (the
 *             event vite fires) while the save is still refused: no reload,
 *             the Retry notice stays, the store is untouched; with writes
 *             back the next one saves first and then reloads, and the
 *             season is on the store after it. The "could not be loaded"
 *             tile's Reload the same way, and held it says why
 *  errors     no page error and no console error
 *
 * Controls (US_SEASON_PLAY_CONTROL=), each served to the browser only, each
 * refusing to run unless its needle is in the built chunk exactly once, each
 * expected to go red at its own check (a control run exits 1 and says so):
 *   static  the page imports the viewer chunk as it loads      -> lazy
 *   write   the viewer writes a marker onto the save as it opens -> same press
 *   count   the score bug reads ahead of the feed              -> clock
 *   cover   the cover is hidden                                -> cover
 *   playfirst the entry does not wait for the viewer (the order
 *           before the fix pass of 2026-10-08)                 -> load first
 *   nohandover the board hands the entry no played career (the
 *           board before Release AN)                           -> full storage
 *   noaction (Round 1144, a style rule, not a chunk) the button a
 *           toast carries is display none                      -> retry in view
 *   raw     (Round 1144, a window switch, not a chunk) the storage
 *           seam's own "app as it was" switch is set before the
 *           app loads, so no refused save is held for a reload -> reload holds
 *
 * Run: npm run build, then
 *   MSYS_NO_PATHCONV=1 ENGINES=chromium node scripts/playUsSeasonCentre.mjs
 * (SPORTS=nba or nfl to scope). Green is the closing summary line AND exit 0.
 */
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import zlib from 'node:zlib';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, process.env.DIST ?? 'dist');
const PORT = Number(process.env.PORT ?? 4397);
const BASE = `http://localhost:${PORT}`;
const CONTROL = process.env.US_SEASON_PLAY_CONTROL ?? '';
const ASKED = (process.env.SPORTS ?? 'nba,nfl').split(',').map(s => s.trim());
const DEFS = {
  nba: { route: '/nba-my-career', binding: 'NBA_CAREER_SPORT', file: 'src/lib/nbaCareerSport.ts', pos: 'SG', words: 'Tip off', start: 'Tip off', held: { era: 'y2004', year: 2011 }, lineRe: /^(.*) put up (\d+) in the / },
  nfl: { route: '/nfl-my-career', binding: 'NFL_CAREER_SPORT', file: 'src/lib/nflCareerSport.ts', pos: 'QB', words: 'Kickoff.', start: 'Kick off', held: { era: 'y2005', year: 2005 }, lineRe: null },
};
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
const SPORTS = Object.keys(DEFS).filter(s => ASKED.includes(s) && /loadSeasonCentre\s*:/.test(strip(fs.readFileSync(path.join(ROOT, DEFS[s].file), 'utf8'))));
for (const s of Object.keys(DEFS)) if (!SPORTS.includes(s)) console.log(`SKIPPED ${s}: ${ASKED.includes(s) ? 'its binding has no Season Center loader' : 'not asked for (SPORTS)'}`);
if (!SPORTS.length) { console.error('playUsSeasonCentre: no sport to walk'); process.exit(1); }
if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.error(`playUsSeasonCentre: no build at ${DIST} (run npm run build first)`); process.exit(1); }

let checks = 0;
const fails = new Map();
const check = (name, ok, label) => { checks += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} [${name}] ${label}`); if (!ok) { if (!fails.has(name)) fails.set(name, []); fails.get(name).push(label); } };

/* ─── saves made by the real bindings, in node ─── */
const OUT = path.join(os.tmpdir(), `play-us-season-${process.pid}.mjs`);
await build({
  stdin: { contents: SPORTS.map(s => `export { ${DEFS[s].binding} } from './${DEFS[s].file}';`).join('\n'), resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic',
  banner: { js: "import { createRequire as __usRequire } from 'node:module'; const require = __usRequire(import.meta.url);" },
});
const mem = new Map();
globalThis.localStorage ??= { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => { mem.delete(k); }, clear: () => mem.clear() };
const M = await import(pathToFileURL(OUT).href);
try { fs.unlinkSync(OUT); } catch { /* a copy */ }
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** A save on the hub after `seasons` seasons (0: a rookie about to play his first). */
function makeSave(slug, seasons, eraId = 'now', year = null) {
  const SB = M[DEFS[slug].binding];
  const rng = mulberry32(1048 + seasons * 7 + (eraId === 'now' ? 0 : 91));
  const real = Math.random;
  Math.random = rng;
  try {
    const pos = DEFS[slug].pos;
    const c = SB.startCareer('Week Watcher', pos, SB.create.archetypes[pos][0], rng, null, eraId);
    if (year !== null) c.year = year;
    let tq = SB.rollTeamQuality(null, rng);
    SB.assignRole(c, tq, rng);
    for (let i = 0; i < seasons; i += 1) { SB.campBattle(c, tq, rng); SB.simSeason(c, tq, rng); SB.progress(c, rng); tq = SB.rollTeamQuality(tq, rng); }
    c.contractYears = Math.max(3, c.contractYears);
    return { key: SB.saveKey, value: JSON.stringify({ c, phase: 'season', teamQuality: tq }) };
  } finally { Math.random = real; }
}

/* ─── the built chunks, and what a control serves instead ─── */
const assets = fs.readdirSync(path.join(DIST, 'assets')).filter(f => f.endsWith('.js'));
const textOf = f => fs.readFileSync(path.join(DIST, 'assets', f), 'utf8');
const holding = needle => assets.filter(f => textOf(f).includes(needle));
const viewerChunks = holding('data-us-season-centre');
const coverChunks = holding('data-us-centre-cover');
if (viewerChunks.length !== 1) { console.error(`playUsSeasonCentre: ${viewerChunks.length} chunks carry the viewer's marker, expected 1`); process.exit(1); }
const VIEWER = viewerChunks[0];
console.log(`viewer chunk ${VIEWER} (${(fs.statSync(path.join(DIST, 'assets', VIEWER)).size / 1024).toFixed(1)}K raw); the cover lives in ${coverChunks.join(', ')}`);
const served = new Map();
let STATIC_EXTRA = '';
const once = (hay, needle, what) => { const n = hay.split(needle).length - 1; if (n !== 1) throw new Error(`control ${CONTROL} refused: ${what} appears ${n} times`); };
if (CONTROL === 'static') { STATIC_EXTRA = `/assets/${VIEWER}`; console.log('CONTROL static: the page imports the viewer chunk as it loads'); }
if (CONTROL === 'write') {
  /* The write happens when the viewer OPENS, not when its chunk loads. Since the fix pass of 2026-10-08
     the chunk is in memory before the season is played, so a write at load time is overwritten by the
     season's own save and the check stayed green (seen on the runner that day: the control did not fire).
     An observer runs in the same task as the commit that puts the viewer on the page, so the marker is on
     the save before the walk reads it. */
  once(textOf(VIEWER), 'data-us-season-centre', "the viewer's marker");
  served.set(VIEWER, `try{const o=new MutationObserver(()=>{if(!document.querySelector("[data-us-season-centre]"))return;o.disconnect();try{for(const k of ["nba-my-career-save-v1","nfl-my-career-save-v1"]){const v=JSON.parse(localStorage.getItem(k)||"null");if(v){v.c.centreSeen=1;localStorage.setItem(k,JSON.stringify(v));}}}catch(e){}});o.observe(document.documentElement,{childList:true,subtree:true});}catch(e){}\n${textOf(VIEWER)}`);
  console.log('CONTROL write: the served viewer chunk writes centreSeen onto the save when the viewer opens');
}
if (CONTROL === 'count') {
  const re = /(\w+)\.pts&&\1\.min<=(\w+)/g;
  const where = assets.filter(f => (textOf(f).match(re) ?? []).length > 0);
  if (where.length !== 1 || (textOf(where[0]).match(re) ?? []).length !== 1) throw new Error(`control count refused: the score bug's test is in ${where.length} chunks`);
  served.set(where[0], textOf(where[0]).replace(re, (m, e, t) => `${e}.pts&&${e}.min<=${t}+24`));
  console.log(`CONTROL count: the served score bug reads 24 minutes ahead (${where[0]})`);
}
if (CONTROL === 'cover') {
  if (coverChunks.length !== 1) throw new Error(`control cover refused: the cover is in ${coverChunks.length} chunks`);
  const t = textOf(coverChunks[0]);
  once(t, '"fixed inset-0 z-40 bg-background"', "the cover's class");
  served.set(coverChunks[0], t.replace('"fixed inset-0 z-40 bg-background"', '"hidden"'));
  console.log('CONTROL cover: the served cover is hidden');
}
if (CONTROL === 'playfirst') {
  /* the entry awaits the host's ready() in two places (the press, Watch again); both stop waiting */
  const re = /await (\w+)\.ready\((\w+)\)/g;
  const where = assets.filter(f => (textOf(f).match(re) ?? []).length > 0);
  if (where.length !== 1 || (textOf(where[0]).match(re) ?? []).length !== 2) throw new Error(`control playfirst refused: the entry's wait is in ${where.length} chunks (${where.map(f => (textOf(f).match(re) ?? []).length).join(', ')} times)`);
  served.set(where[0], textOf(where[0]).replace(re, (m, c, f) => `(${c}.ready(${f}),!0)`));
  console.log(`CONTROL playfirst: the served entry plays the season without waiting for the viewer (${where[0]})`);
}
if (CONTROL === 'nohandover') {
  /* Release AN: the board hands the entry the career its last Play played. Served without it, the way
     the board was before: the full storage press must then play the season and open nothing. Exit 2,
     not a throw, when the needle is not there once: a control that never ran must not read as fired. */
  const re = /played:\(\)=>[\w$]+\.current/g;
  const where = assets.filter(f => (textOf(f).match(re) ?? []).length > 0);
  if (where.length !== 1 || (textOf(where[0]).match(re) ?? []).length !== 1) {
    console.error(`control nohandover refused: the board's hand over is in ${where.length} chunks (${where.map(f => (textOf(f).match(re) ?? []).length).join(', ')} times), expected once in one`);
    process.exit(2);
  }
  served.set(where[0], textOf(where[0]).replace(re, 'played:void 0'));
  console.log(`CONTROL nohandover: the served board hands the entry no played career (${where[0]})`);
}
/* Round 1144: two controls that change the page, not a chunk. noaction hides the button a toast carries
   (a style rule added to the full storage page). raw sets window.__DUKB_RAW_STORAGE__ before the app
   loads, the storage seam's own switch for "the app as it was": the seam then keeps no refused save
   waiting, so a reload goes ahead over one. It refuses to run unless the built entry holds the switch. */
const RAW_SWITCH = '__DUKB_RAW_STORAGE__';
if (CONTROL === 'noaction') console.log('CONTROL noaction: the button a toast carries is display none on the full storage page');
if (CONTROL === 'raw') {
  if (!assets.some(f => textOf(f).includes(RAW_SWITCH))) { console.error(`control raw refused: no built chunk holds ${RAW_SWITCH}`); process.exit(2); }
  console.log(`CONTROL raw: window.${RAW_SWITCH} is set before the app loads, so no refused save is held for a reload`);
}
if (CONTROL && !['static', 'write', 'count', 'cover', 'playfirst', 'nohandover', 'noaction', 'raw'].includes(CONTROL)) { console.error(`unknown US_SEASON_PLAY_CONTROL ${CONTROL}`); process.exit(2); }

const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
{
  /* The port must be serving THIS build. When another run's server already holds it, ours never binds and
     the browser would be handed a different tree's chunks (seen 2026-10-08: every check then died on a
     chunk name this dist does not have). The viewer chunk's bytes are the proof. */
  const probe = await new Promise(res => {
    http.get(`${BASE}/assets/${VIEWER}`, r => { const parts = []; r.on('data', c => parts.push(c)); r.on('end', () => res(Buffer.concat(parts))); }).on('error', () => res(null));
  });
  if (!probe || Buffer.compare(probe, fs.readFileSync(path.join(DIST, 'assets', VIEWER))) !== 0) {
    console.error(`playUsSeasonCentre: port ${PORT} is not serving ${DIST} (another server holds the port?). Set PORT to a free one.`);
    try { server.kill(); } catch { /* gone */ }
    process.exit(1);
  }
}
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
let aborted = 0;
const stop = code => { try { server.kill(); } catch { /* gone */ } process.exit(code); };

/** A context on a save: Math.random seeded, the cookie question answered,
 *  the help seen, the live database unreachable, the viewer chunk slowed a
 *  little so the cover can be looked at while it loads. */
async function open(slug, save, { width, height, reduced = false, seed = 1048 }, { failViewer = 0, staleSpent = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const state = { fail: failViewer, loads: 0, viewerAsked: 0 };
  await ctx.addInitScript(([k, v, s, extra, spent, raw]) => {
    if (raw) window.__DUKB_RAW_STORAGE__ = true;
    /* the site reloads once for a stale chunk (src/lib/freshBuild.ts): `spent` says that one reload is used up */
    try { if (spent) sessionStorage.setItem('dukb-reloaded-stale-chunk', '1'); } catch { /* private mode */ }
    let t = s >>> 0;
    /* counted, so a walk can say how far the page's generator had been drawn when he pressed */
    window.__usDraws = 0;
    Math.random = () => { window.__usDraws += 1; t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    try {
      if (!sessionStorage.getItem('us-centre-harness')) {
        sessionStorage.setItem('us-centre-harness', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem(k, v);
        localStorage.setItem('seasonCentre:help:nba', '1');
        localStorage.setItem('seasonCentre:help:nfl', '1');
      }
    } catch { /* private mode */ }
    if (extra) document.addEventListener('DOMContentLoaded', () => { import(extra).catch(() => {}); });
  }, [save.key, save.value, seed, STATIC_EXTRA, staleSpent, CONTROL === 'raw']);
  await ctx.route('**://*.supabase.co/**', r => { aborted += 1; return r.abort(); });
  await ctx.route('**/assets/*.js', async r => {
    const name = r.request().url().split('/').pop().split('?')[0];
    if (name === VIEWER) {
      state.viewerAsked += 1;
      if (state.fail > 0) { state.fail -= 1; return r.abort(); }
      await new Promise(res => setTimeout(res, 500));
    }
    if (served.has(name)) return r.fulfill({ status: 200, contentType: 'application/javascript', body: served.get(name) });
    return r.continue();
  });
  const page = await ctx.newPage();
  const js = [];
  const errors = [];
  page.on('request', r => { const u = r.url(); if (u.includes('/assets/') && u.endsWith('.js')) js.push(u.split('/').pop()); });
  page.on('load', () => { state.loads += 1; });
  page.on('pageerror', e => errors.push(`pageerror: ${String(e).slice(0, 160)}`));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|ERR_FAILED/.test(m.text())) errors.push(`console: ${m.text().slice(0, 160)}`); });
  await page.goto(`${BASE}${DEFS[slug].route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Play the \d+ season/.test(b.textContent ?? '')), { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(800);
  /* a first visit opens the game's how to play sheet, which holds the keyboard focus until it is closed:
     close it the way a player does, so focus and layout are measured on the page he plays on */
  for (let i = 0; i < 3; i += 1) {
    const had = await page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => /Let's Play/.test(x.textContent ?? '')); if (b) b.click(); return !!b; });
    if (!had) break;
    await page.waitForTimeout(350);
  }
  return { ctx, page, js, errors, save, state };
}
const savedString = (page, key) => page.evaluate(k => localStorage.getItem(k), key);
const clickText = (page, text) => page.evaluate(t => {
  const b = [...document.querySelectorAll('button')].find(x => !x.disabled && (x.textContent ?? '').includes(t));
  if (!b) return false;
  b.click();
  return true;
}, text);
const exists = (page, sel) => page.evaluate(s => !!document.querySelector(s), sel);
/** Wait for a selector, or throw saying what the page shows instead. */
const need = async (page, sel, what) => {
  try { await page.waitForSelector(sel, { timeout: 15000 }); } catch {
    const seen = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(100, 700));
    throw new Error(`${what}: never appeared; the page reads "${seen}"`);
  }
};

const centreEntry = page => page.evaluate(() => {
  const b = document.querySelector('[data-week-by-week]');
  if (!b) return null;
  b.scrollIntoView({ block: 'center' });
  const r = b.getBoundingClientRect();
  return { h: r.height, inside: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };
});

const hubState = (page, key) => page.evaluate(k => ({
  saved: localStorage.getItem(k),
  hub: [...document.querySelectorAll('button')].some(b => /Play the \d+ season/.test(b.textContent ?? '')),
  entry: !!document.querySelector('[data-week-by-week]'),
  curtain: !!document.querySelector('[data-season-reveal]'),
  failed: !!document.querySelector('[data-season-centre-failed]'),
  viewer: !!document.querySelector('[data-season-centre]'),
  cover: !!document.querySelector('[data-us-centre-cover]'),
  focusOnEntry: document.activeElement === document.querySelector('[data-week-by-week]'),
}), key);
const waitFor = async (fn, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise(r => setTimeout(r, 100)); } return false; };
const hubBack = page => page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Play the \d+ season/.test(b.textContent ?? '')), { timeout: 40000 }).then(() => page.waitForTimeout(600)).catch(() => {});
const pressEntry = page => page.evaluate(() => document.querySelector('[data-week-by-week]')?.click());
const drawsOf = page => page.evaluate(() => window.__usDraws ?? -1).catch(() => -1);

/* ─── Round 1144 ─── */
/** Every button that says Retry or Retry save, with its box, its middle, and whether it is the thing on top there. */
const retryButtons = page => page.evaluate(() => ({
  notice: !!document.querySelector('[data-us-career-save-error]'),
  hit: [...document.querySelectorAll('button')].filter(b => /^Retry( save)?$/.test((b.textContent ?? '').trim())).map(b => {
    const q = b.getBoundingClientRect();
    const x = q.left + q.width / 2;
    const y = q.top + q.height / 2;
    const top = q.height > 0 ? document.elementFromPoint(x, y) : null;
    return { words: (b.textContent ?? '').trim(), t: Math.round(q.top), b: Math.round(q.bottom), w: Math.round(q.width), h: Math.round(q.height), x, y, onTop: q.height > 0 && q.top >= 0 && q.bottom <= innerHeight && !!top && (b === top || b.contains(top)) };
  }),
  /* where the toasts are: each one's box, for the label */
  toasts: [...document.querySelectorAll('[data-sonner-toast]')].map(t => { const q = t.getBoundingClientRect(); return `${Math.round(q.top)}..${Math.round(q.bottom)}`; }),
}));
/** A thumb's room: the size a button has to be for a phone (the notice's own Retry save is held to the same). */
const THUMB = 44;
/* localStorage only. A full localStorage says nothing about sessionStorage, which has its own room,
   and the once a tab reload marker lives there: with both refused the reload stands down for the
   marker's sake (measured on main, where this walk's first cut was green for that reason alone). */
const refuseWrites = page => page.evaluate(() => {
  const real = Storage.prototype.setItem;
  window.__usRealSet = real;
  Storage.prototype.setItem = function refuse(...args) {
    if (this !== window.localStorage) return Reflect.apply(real, this, args);
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  };
});
const takeWrites = page => page.evaluate(() => { if (window.__usRealSet) Storage.prototype.setItem = window.__usRealSet; }).catch(() => {});
const seasonsOn = (page, key) => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k) ?? '{}').c?.seasons?.length ?? 0; } catch { return -1; } }, key).catch(() => -2);
/* what vite fires on the window when a lazy chunk fails to load (a tab left open across a release);
   true when the app cancelled it, which it does only when it is reloading the page */
const staleChunk = page => page.evaluate(() => {
  const e = new Event('vite:preloadError', { cancelable: true });
  e.payload = new Error('Failed to fetch dynamically imported module: /assets/gone-after-a-release.js');
  window.dispatchEvent(e);
  return e.defaultPrevented;
}).catch(() => 'the page was already leaving');

/** A reload the app itself makes must not lose a save the browser refused: it is retried once first,
 *  and while it is still refused the page stays. Two roads to a reload, each walked twice (storage
 *  still full, then free): the stale chunk reload, and the Reload on the "could not be loaded" tile. */
async function saveHolds(slug, vp, save, tag) {
  /* the stale chunk reload */
  const R = await open(slug, save, vp);
  const kept = await savedString(R.page, save.key);
  await refuseWrites(R.page);
  await clickText(R.page, 'Play the');
  const said = await waitFor(() => exists(R.page, '[data-us-career-save-error]'), 8000);
  const loads = R.state.loads;
  const cancelled = await staleChunk(R.page);
  await R.page.waitForTimeout(1500);
  const held = { loads: R.state.loads, notice: await exists(R.page, '[data-us-career-save-error]').catch(() => false), saved: await savedString(R.page, save.key).catch(() => null) };
  check('reload holds', said && cancelled === false && held.loads === loads && held.notice && held.saved === kept,
    `${tag}: a stale chunk does not reload the page over a save the browser still refuses (the save was ${said ? '' : 'NOT '}refused; the event was ${cancelled === false ? 'left alone' : `cancelled: ${cancelled}`}; page loads ${loads} then ${held.loads}; Retry notice ${held.notice ? 'still up' : 'GONE'}; the store ${held.saved === kept ? 'untouched' : 'changed'})`);
  await takeWrites(R.page);
  await staleChunk(R.page);
  const reloaded = await waitFor(async () => R.state.loads > held.loads, 8000);
  await R.page.waitForLoadState('load').catch(() => {});
  await R.page.waitForTimeout(800);
  const after = await seasonsOn(R.page, save.key);
  check('reload holds', reloaded && after === 1,
    `${tag}: once the browser takes writes again the next stale chunk saves first and then reloads (reloaded ${reloaded}, seasons on the store after it ${after})`);
  check('errors', R.errors.length === 0, `${tag}: the held stale chunk reload, no page error and no console error${R.errors.length ? ` (${R.errors.slice(0, 2).join(' | ')})` : ''}`);
  await R.ctx.close();

  /* the tile's own Reload. The season is played by a scripted press under the tile: a player gets
     to this state by playing first (the save is refused) and opening the viewer second. */
  const T = await open(slug, save, vp, { failViewer: 99, staleSpent: true });
  const keptT = await savedString(T.page, save.key);
  await pressEntry(T.page);
  const tile = await waitFor(() => exists(T.page, '[data-season-centre-failed]'), 20000);
  await refuseWrites(T.page);
  await clickText(T.page, 'Play the');
  const saidT = await waitFor(() => exists(T.page, '[data-us-career-save-error]'), 8000);
  const loadsT = T.state.loads;
  const pressReload = () => T.page.evaluate(() => { const b = [...document.querySelectorAll('[data-season-centre-failed] button')].find(x => (x.textContent ?? '').includes('Reload')); if (b) b.click(); return !!b; }).catch(() => false);
  const pressed = await pressReload();
  await T.page.waitForTimeout(1500);
  const heldT = {
    loads: T.state.loads,
    notice: await exists(T.page, '[data-us-career-save-error]').catch(() => false),
    saved: await savedString(T.page, save.key).catch(() => null),
    words: await T.page.evaluate(() => (document.querySelector('[data-season-centre-failed]')?.textContent ?? '').replace(/\s+/g, ' ').trim()).catch(() => ''),
  };
  check('reload holds', tile && saidT && pressed && heldT.loads === loadsT && heldT.notice && heldT.saved === keptT && /not been saved/.test(heldT.words),
    `${tag}: the tile's Reload does not reload over a save the browser still refuses, and says why (tile ${tile}, save refused ${saidT}; page loads ${loadsT} then ${heldT.loads}; Retry notice ${heldT.notice ? 'still up' : 'GONE'}; the store ${heldT.saved === keptT ? 'untouched' : 'changed'}; the tile says "${heldT.words.slice(0, 120)}")`);
  await takeWrites(T.page);
  const pressedAgain = await pressReload();
  const reloadedT = await waitFor(async () => T.state.loads > heldT.loads, 8000);
  await T.page.waitForLoadState('load').catch(() => {});
  await T.page.waitForTimeout(800);
  const afterT = await seasonsOn(T.page, save.key);
  check('reload holds', pressedAgain && reloadedT && afterT === 1,
    `${tag}: once the browser takes writes again the tile's Reload saves first and then reloads (pressed ${pressedAgain}, reloaded ${reloadedT}, seasons on the store after it ${afterT})`);
  await T.ctx.close();
}

/** A tab left open across a release: the viewer's chunk is gone from the host when he presses. */
async function staleWalks(slug, vp, save, afterPlay, firstDraws, tag) {
  /* The season Play saves on a page that was loaded a second time. The career's seasons come out of the
     page's generator, and a second load is not a first visit (it draws a different number of times before
     he presses, printed below), so a reloaded page is held against Play on a reloaded page, never against
     Play on a first visit. */
  const R = await open(slug, save, vp);
  await R.page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await hubBack(R.page);
  const reloadDraws = await drawsOf(R.page);
  await clickText(R.page, 'Play the');
  await need(R.page, '[data-season-reveal]', `${tag}: the curtain after Play on a page loaded twice`);
  await R.page.waitForTimeout(500);
  const afterReloadPlay = await savedString(R.page, save.key);
  await R.ctx.close();

  /* 1: the site's one reload for a stale chunk is still there. The chunk is gone for as long as that page
     lives, which is what a release does to an open tab, and it is served again to the page the reload
     brings. Until the merge of 2026-10-08 this walk failed ONE request, which stopped being a failed
     import on the runner's Chromium once Round 1047 put a stylesheet among the viewer's imports: the
     page's import() waits for that stylesheet, by then the failed preload of the chunk is forgotten, and
     the import asks the network a second time and gets it (measured there: the season was played with
     the viewer open and nothing reloaded, which is right for one lost request and is not this case). */
  const S = await open(slug, save, vp, { failViewer: Infinity });
  await pressEntry(S.page);
  const reloaded = await waitFor(async () => S.state.loads >= 2);
  const askedOnThePress = S.state.viewerAsked;
  S.state.fail = 0;
  await hubBack(S.page);
  const s1 = await hubState(S.page, save.key).catch(() => ({}));
  check('load first', reloaded && s1.saved === save.value && s1.hub && s1.entry && !s1.curtain && !s1.failed && !s1.viewer,
    `${tag}: a viewer chunk that is gone reloads the page with no season played (page loads ${S.state.loads}, save untouched ${s1.saved === save.value}, hub ${s1.hub}, entry ${s1.entry}, curtain ${s1.curtain}, failed tile ${s1.failed})`);
  const staleDraws = await drawsOf(S.page);
  console.log(`     the gone chunk was asked for ${askedOnThePress} time(s) on that press before the page reloaded (1: the preload and the import are one fetch; 2: the import asked again)`);
  console.log(`     the generator had been drawn ${firstDraws} times at the press on a first visit, ${reloadDraws} on a page loaded twice, ${staleDraws} after the stale chunk reload`);
  await pressEntry(S.page);
  await S.page.waitForSelector('[data-season-centre] [data-kickoff]', { timeout: 20000 }).catch(() => {});
  const s1b = await hubState(S.page, save.key).catch(() => ({}));
  check('load first', s1b.viewer && afterReloadPlay !== save.value && s1b.saved === afterReloadPlay,
    `${tag}: after that reload the next press opens the viewer on the season Play saves on a page loaded twice (viewer ${s1b.viewer}, same bytes ${s1b.saved === afterReloadPlay}, same as a first visit ${s1b.saved === afterPlay})`);
  check('errors', S.errors.length === 0, `${tag}: the stale chunk walk, no page error and no console error${S.errors.length ? `: ${S.errors.slice(0, 2).join(' | ')}` : ''}`);
  await S.ctx.close();

  /* 2: that one reload is already spent, so the page has to say so itself. The chunk stays gone until this
     walk says the host serves it again, so the walk reads the same whether the browser keeps a failed
     import failed for the life of the page (the Chromium of the 2026-10-07 review did: asked for once) or
     asks the network again on the next import (the runner's Chromium on 2026-10-08 did: asked for twice
     before Round 1047 was merged in and three times after it, the first press asking twice). */
  const T = await open(slug, save, vp, { failViewer: Infinity, staleSpent: true });
  await pressEntry(T.page);
  await T.page.waitForSelector('[data-season-centre-failed]', { timeout: 15000 }).catch(() => {});
  const t1 = await hubState(T.page, save.key);
  check('load first', t1.failed && t1.saved === save.value && !t1.curtain && !t1.cover && T.state.loads === 1,
    `${tag}: with the reload spent the tile says it could not be loaded and no season is played (tile ${t1.failed}, save untouched ${t1.saved === save.value}, curtain ${t1.curtain}, page loads ${T.state.loads})`);
  await clickText(T.page, 'Back to your season');
  await T.page.waitForTimeout(200);
  const t2 = await hubState(T.page, save.key);
  check('load first', !t2.failed && t2.hub && t2.entry && t2.focusOnEntry && t2.saved === save.value, `${tag}: Back closes the tile on the hub with the focus on Week by week (tile ${t2.failed}, hub ${t2.hub}, focus ${t2.focusOnEntry})`);
  await pressEntry(T.page);
  await T.page.waitForSelector('[data-season-centre-failed]', { timeout: 15000 }).catch(() => {});
  const t2b = await hubState(T.page, save.key);
  const asked = T.state.viewerAsked;
  check('load first', t2b.failed && t2b.saved === save.value && !t2b.curtain && !t2b.viewer && T.state.loads === 1,
    `${tag}: a second press with the chunk still gone shows the tile again and plays nothing (tile ${t2b.failed}, save untouched ${t2b.saved === save.value}, viewer ${t2b.viewer}, page loads ${T.state.loads})`);
  /* the host serves the chunk again; the tile's Reload is the way back in either kind of browser */
  T.state.fail = 0;
  await clickText(T.page, 'Reload');
  const again = await waitFor(async () => T.state.loads >= 2);
  await hubBack(T.page);
  const t3 = await hubState(T.page, save.key).catch(() => ({}));
  await pressEntry(T.page);
  await T.page.waitForSelector('[data-season-centre] [data-kickoff]', { timeout: 20000 }).catch(() => {});
  const t4 = await hubState(T.page, save.key).catch(() => ({}));
  console.log(`     the viewer chunk was asked for ${asked} time(s) over two presses before the Reload (1: this browser keeps a failed import failed; 2 or 3: it asks again), ${T.state.viewerAsked} with the press after it`);
  check('load first', again && t3.saved === save.value && t3.hub && t4.viewer && t4.saved === afterReloadPlay,
    `${tag}: Reload gets a new page with no season played, and its next press opens the viewer on the season Play saves on a page loaded twice (page loads ${T.state.loads}, save untouched ${t3.saved === save.value}, viewer ${t4.viewer}, same bytes ${t4.saved === afterReloadPlay})`);
  check('errors', T.errors.length === 0, `${tag}: the spent reload walk, no page error and no console error${T.errors.length ? `: ${T.errors.slice(0, 2).join(' | ')}` : ''}`);
  await T.ctx.close();
}

async function walk(slug, vp) {
  const d = DEFS[slug];
  const tag = `${slug} ${vp.width}x${vp.height}`;
  const phone = vp.width < 768;
  const save = makeSave(slug, 0);

  /* A: he presses Play */
  const A = await open(slug, save, vp);
  await centreEntry(A.page);
  const firstDraws = await drawsOf(A.page);
  await clickText(A.page, 'Play the');
  await need(A.page, '[data-season-reveal]', `${tag}: the curtain after Play`);
  await A.page.waitForTimeout(500);
  const afterPlay = await savedString(A.page, save.key);
  const scrollA = await A.page.evaluate(() => Math.round(window.scrollY));
  const curtainA = await A.page.evaluate(() => document.querySelector('[data-season-reveal]')?.textContent ?? '');
  await A.ctx.close();

  /* B: he presses Week by week on the same save and the same generator */
  const B = await open(slug, save, vp);
  const p = B.page;
  const eager = [...new Set(B.js)];
  check('lazy', eager.length > 5 && !eager.includes(VIEWER) && !eager.some(f => textOf(f).includes('data-us-season-centre')), `${tag}: the viewer chunk is not requested on load or on the hub (${eager.length} chunks)`);
  check('lazy', !eager.some(f => textOf(f).includes(d.words)), `${tag}: no chunk the page loads holds "${d.words}"`);
  const entry = await centreEntry(p);
  check('layout', !!entry && entry.h >= 44 && entry.inside, `${tag}: the entry is at least 44 px tall and fully visible (${entry ? Math.round(entry.h) : 'missing'} px)`);
  const atPress = await p.evaluate(key => {
    const before = localStorage.getItem(key);
    document.querySelector('[data-week-by-week]').click();
    const opaque = () => {
      const cover = document.querySelector('[data-us-centre-cover]');
      if (!cover) return false;
      const cs = getComputedStyle(cover);
      const r = cover.getBoundingClientRect();
      const m = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor);
      const alpha = m ? (m[1].split(',').length === 4 ? Number(m[1].split(',')[3]) : 1) : 0;
      return cs.display !== 'none' && cs.visibility !== 'hidden' && alpha === 1 && r.width >= innerWidth - 1 && r.height >= innerHeight - 1;
    };
    /* every frame from the press until the viewer is up */
    return new Promise(res => {
      const out = { frames: 0, bare: 0, early: null, t0: performance.now() };
      const tick = () => {
        out.frames += 1;
        const curtain = !!document.querySelector('[data-season-reveal]');
        const viewer = !!document.querySelector('[data-season-centre] [data-kickoff], [data-centre-tile]');
        if (curtain && !opaque()) out.bare += 1;
        if (out.frames === 2) out.early = { curtain, saved: localStorage.getItem(key) !== before, busy: document.querySelector('[data-week-by-week]')?.getAttribute('aria-busy') === 'true' };
        if (viewer || performance.now() - out.t0 > 15000) { res({ ...out, viewer, curtain, covered: opaque(), ms: Math.round(performance.now() - out.t0) }); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, save.key);
  const early = atPress.early ?? { curtain: true, saved: true, busy: false };
  check('load first', !early.curtain && !early.saved && early.busy, `${tag}: two frames after the press nothing is played while the viewer loads (curtain ${early.curtain}, season on the save ${early.saved}, button loading ${early.busy})`);
  check('cover', atPress.viewer && atPress.frames >= 10 && atPress.bare === 0 && atPress.curtain && atPress.covered, `${tag}: on every frame from the press to the viewer the curtain is never on screen without the opaque cover (${atPress.frames} frames in ${atPress.ms} ms, ${atPress.bare} bare; at the end curtain ${atPress.curtain}, covered ${atPress.covered})`);
  await p.waitForSelector('[data-season-centre] [data-kickoff], [data-centre-tile]', { timeout: 20000 }).catch(() => {});
  check('lazy', B.js.includes(VIEWER), `${tag}: the viewer chunk is requested after the press`);
  {
    /* measured, not asserted: what the first press costs (the lead keeps the budgets) */
    const after = [...new Set(B.js)].filter(f => !eager.includes(f));
    const sizes = after.map(f => [f.replace(/-[\w-]{8}\.js$/, ''), zlib.gzipSync(fs.readFileSync(path.join(DIST, 'assets', f))).length]);
    console.log(`     the first press downloads ${after.length} chunks, ${(sizes.reduce((a, x) => a + x[1], 0) / 1024).toFixed(1)}K gz: ${sizes.map(([f, g]) => `${f} ${(g / 1024).toFixed(1)}K`).join(', ')}`);
  }
  check('same press', (await savedString(p, save.key)) === afterPlay, `${tag}: Play and Week by week saved the same bytes`);
  const usFull = await p.evaluate(() => document.querySelector('[data-kickoff] .text-lg')?.textContent ?? '');
  check('agreement', await clickText(p, d.start), `${tag}: the first card offers "${d.start}"`);

  /* the clock at 1x: the bug against the feed, frame by frame */
  const clock = d.lineRe ? await p.evaluate(async ([reSrc, us]) => {
    const re = new RegExp(reSrc);
    const out = { n: 0, bad: [], scores: new Set() };
    for (let i = 0; i < 260; i += 1) {
      const c = document.querySelector('[data-match-clock]');
      if (c) {
        let a = 0; let b = 0;
        for (const li of c.querySelectorAll('[data-clock-events] li')) { const m = re.exec(li.children[1]?.textContent ?? ''); if (m) { if (m[1].includes(us)) a += Number(m[2]); else b += Number(m[2]); } }
        out.n += 1;
        out.scores.add(c.dataset.score);
        if (c.dataset.score !== `${a}-${b}`) out.bad.push(`minute ${c.dataset.minute}: bug ${c.dataset.score}, feed ${a}-${b}`);
        if (document.querySelector('[data-full-time]')) break;
      }
      await new Promise(r => setTimeout(r, 90));
    }
    return { n: out.n, bad: out.bad.slice(0, 3), scores: out.scores.size, done: !!document.querySelector('[data-full-time]') };
  }, [d.lineRe.source, usFull]) : null;
  if (clock) check('clock', clock.done && clock.n >= 20 && clock.scores >= 4 && clock.bad.length === 0, `${tag}: the score bug equals the feed on every sample (${clock.n} samples, ${clock.scores} scores${clock.bad.length ? `; ${clock.bad.join(' | ')}` : ''})`);
  else check('clock', false, `${tag}: no feed reader for this sport`);

  const bug = await p.evaluate(() => {
    const c = document.querySelector('[data-match-clock]');
    const names = [...c.querySelectorAll('.truncate')].map(el => ({ t: el.textContent, cut: el.scrollWidth > el.clientWidth }));
    const rows = [...c.querySelectorAll('[data-clock-events] li')].filter(li => li.children.length === 2).map(li => {
      const ra = li.children[0].getBoundingClientRect(); const rb = li.children[1].getBoundingClientRect();
      return li.children[0].scrollWidth > li.children[0].clientWidth || ra.right > rb.left + 0.5;
    });
    return { names, rows: rows.length, bad: rows.filter(Boolean).length };
  });
  check('agreement', bug.names.length === 2 && bug.names.every(n => /^[A-Z]{2,3}$/.test(n.t) && !n.cut), `${tag}: the scoreboard shows the game's own ids, none cut off (${bug.names.map(n => n.t).join(' v ')})`);
  check('agreement', bug.rows >= 8 && bug.bad === 0, `${tag}: the feed's time column fits and never overlaps its words (${bug.rows} lines, ${bug.bad} bad)`);

  /* a few more games at Results, then the record against the log */
  await clickText(p, 'Results');
  for (let i = 0; i < 6; i += 1) { await clickText(p, '▶ Game'); await p.waitForTimeout(120); }
  const stageScroll = () => p.evaluate(() => [Math.round(document.querySelector('[data-centre-stage]')?.scrollTop ?? -1), Math.round(window.scrollY)].join(','));
  const before = await stageScroll();
  if (phone) await p.evaluate(() => document.querySelector('[data-game-log-open]')?.click());
  await p.waitForTimeout(150);
  const log = await p.evaluate(() => {
    const panel = [...document.querySelectorAll('[data-record-panel]')].find(el => el.offsetParent !== null);
    const rows = panel ? [...panel.querySelectorAll('[data-game-log] li[data-log-row]')] : [];
    const letters = rows.map(li => (li.children[3]?.textContent ?? '').trim()[0]);
    return {
      record: panel?.dataset.record ?? '', rows: rows.length,
      w: letters.filter(x => x === 'W').length, l: letters.filter(x => x === 'L').length, t: letters.filter(x => x === 'T').length,
      wrapped: rows.filter(li => li.getBoundingClientRect().height > 24).length,
    };
  });
  check('agreement', log.rows === 7 && log.record === (log.t ? `${log.w}-${log.l}-${log.t}` : `${log.w}-${log.l}`), `${tag}: the record ${log.record} equals the game log's ${log.w} W and ${log.l} L over ${log.rows} games`);
  check('layout', log.wrapped === 0, `${tag}: no game log row wraps (${log.wrapped} of ${log.rows})`);
  if (phone) {
    await clickText(p, '← Back');
    await p.waitForTimeout(120);
    check('layout', (await stageScroll()) === before && (await exists(p, '[data-game-log-open]')), `${tag}: the game log opens and Back returns with nothing moved`);
  }
  const lay = await p.evaluate(() => {
    const bar = document.querySelector('[data-centre-bar]')?.getBoundingClientRect();
    const asides = [...document.querySelectorAll('[data-season-centre] aside')].filter(a => a.offsetParent !== null).length;
    return { sideways: document.documentElement.scrollWidth > innerWidth + 1, barIn: !!bar && bar.bottom <= innerHeight + 1 && bar.top >= 0, asides, locked: getComputedStyle(document.body).overflow === 'hidden' };
  });
  if (phone) check('layout', !lay.sideways && lay.barIn && lay.asides === 0, `${tag}: no sideways scroll, the bar inside the viewport, one column`);
  else {
    check('layout', lay.asides === 2 && lay.locked && !lay.sideways, `${tag}: three columns and the page behind locked`);
    const sched = await p.evaluate(() => {
      const names = [...document.querySelectorAll('[data-season-centre] aside [data-fixtures] .truncate')];
      return { n: names.length, cut: names.filter(el => el.scrollWidth > el.clientWidth).map(el => el.textContent) };
    });
    check('layout', sched.n >= 80 && sched.cut.length === 0, `${tag}: no name in the Schedule column is cut off (${sched.n} rows${sched.cut.length ? `; cut: ${[...new Set(sched.cut)].slice(0, 5).join(', ')}` : ''})`);
  }

  /* the review, then out */
  await clickText(p, 'Sim the rest');
  await p.waitForSelector('[data-review]', { timeout: 8000 }).catch(() => {});
  const tiles = await p.evaluate(() => [...document.querySelectorAll('[data-review-tile]')].map(el => [el.dataset.reviewTile, el.firstElementChild?.textContent ?? '']));
  {
    /* the whole season in the game log: no row wraps, whoever the opponent is */
    if (phone) await p.evaluate(() => document.querySelector('[data-game-log-open]')?.click());
    await p.waitForTimeout(150);
    const whole = await p.evaluate(() => {
      const panel = [...document.querySelectorAll('[data-record-panel]')].find(el => el.offsetParent !== null);
      const rows = panel ? [...panel.querySelectorAll('[data-game-log] li[data-log-row]')] : [];
      const bad = rows.filter(li => li.getBoundingClientRect().height > 24);
      return { rows: rows.length, wrapped: bad.length, first: bad.slice(0, 2).map(li => li.textContent), twice: rows.filter(li => /(\d+ PTS).*\1/.test(li.textContent ?? '')).length };
    });
    check('layout', whole.rows >= 80 && whole.wrapped === 0, `${tag}: no game log row wraps over the whole season (${whole.wrapped} of ${whole.rows}${whole.first.length ? `; ${whole.first.join(' | ')}` : ''})`);
    check('agreement', whole.rows >= 80 && whole.twice === 0, `${tag}: no game log row prints his points twice (${whole.twice} of ${whole.rows})`);
    if (phone) { await clickText(p, '← Back'); await p.waitForTimeout(120); }
  }
  await p.evaluate(() => document.querySelector('[data-centre-exit]')?.click());
  await p.waitForTimeout(400);
  const end = await p.evaluate(() => ({
    overlay: !!document.querySelector('[data-season-centre], [data-us-centre-cover]'),
    curtain: document.querySelector('[data-season-reveal]')?.textContent ?? null,
    focus: document.activeElement === document.querySelector('[data-season-reveal] button'),
    y: Math.round(window.scrollY),
    active: `${document.activeElement?.tagName ?? 'none'} "${(document.activeElement?.textContent ?? '').trim().slice(0, 40)}"`,
  }));
  check('same press', (await savedString(p, save.key)) === afterPlay, `${tag}: after watching to the review and closing, the save is still the bytes Play saved`);
  check('same press', !end.overlay && end.curtain !== null && end.curtain === curtainA && end.focus && end.y === scrollA, `${tag}: the curtain is on screen as Play shows it, focus on Continue, scrollY ${end.y} against ${scrollA} (overlay ${end.overlay}, curtain ${end.curtain !== null}, same words ${end.curtain === curtainA}, focus ${end.focus} on ${end.active})`);
  const onCard = tiles.filter(([label]) => label !== 'Games');
  check('agreement', tiles.length === 4 && onCard.every(([, v]) => (end.curtain ?? '').includes(v)), `${tag}: the review's tiles are the curtain's numbers (${tiles.map(t => t.join(' ')).join(', ')})`);
  check('errors', B.errors.length === 0, `${tag}: no page error and no console error${B.errors.length ? `: ${B.errors.slice(0, 2).join(' | ')}` : ''}`);
  await B.ctx.close();

  if (phone) {
    /* reduced motion: everything at once, nothing moving */
    const C = await open(slug, save, { ...vp, reduced: true });
    await C.page.evaluate(() => document.querySelector('[data-week-by-week]')?.click());
    await C.page.waitForSelector('[data-season-centre] [data-kickoff]', { timeout: 20000 }).catch(() => {});
    await C.page.waitForTimeout(100);
    const a1 = await C.page.evaluate(() => document.getAnimations().length);
    await clickText(C.page, d.start);
    await C.page.waitForTimeout(100);
    const a2 = await C.page.evaluate(() => ({ n: document.getAnimations().length, ft: !!document.querySelector('[data-full-time]'), lines: document.querySelectorAll('[data-clock-events] li').length }));
    check('motion', a1 === 0 && a2.n === 0 && a2.ft && a2.lines >= 8, `${tag}: reduced motion shows the game at once with nothing animating (${a1} and ${a2.n} animations, ${a2.lines} lines)`);
    check('errors', C.errors.length === 0, `${tag}: reduced motion, no page error and no console error`);
    await C.ctx.close();

    /* a held year */
    const H = await open(slug, makeSave(slug, 0, d.held.era, d.held.year), vp);
    const held = await H.page.evaluate(() => ({ line: document.querySelector('[data-season-centre-held]')?.textContent ?? '', button: !!document.querySelector('[data-week-by-week]') }));
    check('held', held.line.startsWith('📺') && !held.button, `${tag}: the held year ${d.held.year} shows its line and no button ("${held.line.slice(0, 70)}")`);
    await H.ctx.close();

    /* Release AN: storage is full. From the press on the browser refuses every write, the board plays
       through the refused save, and the viewer must still open on the season that press played: the
       entry used to find the season by reading the save back, so it played the season and opened
       nothing (a review saw exactly that where Rounds 1048 and 1142 meet). */
    const F = await open(slug, save, vp);
    const kept = await savedString(F.page, save.key);
    if (CONTROL === 'noaction') await F.page.addStyleTag({ content: '[data-sonner-toast] [data-button]{display:none !important}' });
    await F.page.evaluate(() => {
      window.__usRefused = 0;
      window.__usRealSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function refuse() { window.__usRefused += 1; throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); };
    });
    await pressEntry(F.page);
    const fullOpened = await waitFor(async () => (await hubState(F.page, save.key)).viewer, 20000);
    const full = await hubState(F.page, save.key);
    const refused = await F.page.evaluate(() => window.__usRefused ?? 0);
    check('full storage', refused > 0 && full.curtain && full.saved === kept, `${tag}: with storage full the press played its season in memory: ${refused} write(s) refused, the curtain is there and the save is untouched (curtain ${full.curtain}, save unchanged ${full.saved === kept})`);
    check('full storage', fullOpened && full.cover, `${tag}: with storage full the press still opens the season it played, under the cover (viewer ${full.viewer}, cover ${full.cover}${F.errors.length ? `; the page said: ${F.errors.slice(0, 2).join(' | ')}` : ''})`);
    /* Round 1144: the viewer is open over a save the browser refused, the toast says to use Retry save,
       and the notice that carries that button is under the cover. A Retry has to be on the screen with
       nothing over it, and once the browser takes writes again a press on it (a real press, at its
       middle) has to put the season on the store. */
    /* the toast slides in over about 400 ms: measured once it has stopped, or the press below would land where the button was */
    await F.page.waitForTimeout(900);
    const retries = await retryButtons(F.page);
    const reach = retries.hit.find(x => x.onTop) ?? null;
    if (process.env.SHOTS) { fs.mkdirSync(process.env.SHOTS, { recursive: true }); await F.page.screenshot({ path: path.join(process.env.SHOTS, `retry-in-view-${slug}.png`) }); }
    check('retry in view', retries.notice && !!reach && reach.h >= THUMB && reach.w >= THUMB, `${tag}: with the viewer open over a refused save, a Retry button is on the screen with nothing over it and a thumb can hit it, ${THUMB} px each way (${retries.hit.map(x => `"${x.words}" ${x.t}..${x.b} ${x.w}x${x.h}${x.onTop ? ' on top' : ' covered'}`).join('; ') || 'no Retry button at all'}; toasts at ${retries.toasts.join(', ') || 'none'})`);
    await F.page.evaluate(() => { Storage.prototype.setItem = window.__usRealSet; });
    if (reach) await F.page.mouse.click(reach.x, reach.y);
    const took = !!reach && await waitFor(async () => (await savedString(F.page, save.key)) !== kept, 4000);
    const onStore = await F.page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k) ?? '{}').c?.seasons?.length ?? 0; } catch { return -1; } }, save.key);
    const stillSaid = await exists(F.page, '[data-us-career-save-error]');
    check('retry in view', took && onStore === 1 && !stillSaid && await exists(F.page, '[data-season-centre]'), `${tag}: once the browser takes writes again, a press on that Retry puts the season on the store with the viewer still open (seasons on the store ${onStore}, notice ${stillSaid ? 'still up' : 'gone'})`);
    await F.ctx.close();
    await saveHolds(slug, vp, save, tag);
    await staleWalks(slug, vp, save, afterPlay, firstDraws, tag);
  }
}

try {
  for (const slug of SPORTS) for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) await walk(slug, vp);
} catch (e) {
  check('errors', false, `the walk threw: ${String(e).split('\n')[0].slice(0, 900)}`);
}
await browser.close();
console.log(`supabase requests aborted: ${aborted}`);
const failed = [...fails.values()].reduce((a, l) => a + l.length, 0);
const NAMED = { static: 'lazy', write: 'same press', count: 'clock', cover: 'cover', playfirst: 'load first', nohandover: 'full storage', noaction: 'retry in view', raw: 'reload holds' };
if (CONTROL) {
  const ok = fails.has(NAMED[CONTROL]);
  console.log(`${ok ? `control ${CONTROL}: RED AT THE NAMED CHECK (${NAMED[CONTROL]})` : `control ${CONTROL}: DID NOT FIRE AT ITS NAMED CHECK (${NAMED[CONTROL]})`}; checks red: ${[...fails.keys()].join(', ') || 'none'}`);
  console.log(`playUsSeasonCentre: ${checks} checks, ${failed} failed (control ${CONTROL})`);
  stop(ok ? 1 : 2);
}
console.log(`playUsSeasonCentre: ${checks} checks, ${failed} failed`);
stop(failed ? 1 : 0);
