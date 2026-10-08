/**
 * Round 1115: the Squad tile and its sheet in a real browser.
 *
 * Two modes in one script, because the tile had to be proven before it was
 * mounted on the page:
 *   standalone (always)  an esbuild browser bundle of a small entry that
 *                        mounts <SquadTile career={save} />, on a page that
 *                        links the built stylesheets from dist/assets.
 *   page (when mounted)  the real /soccer-career through
 *                        scripts/lib/hostLikeServer.mjs, only once the built
 *                        Soccer Career chunk contains data-squad-tile.
 *                        REQUIRE_PAGE=1 fails when it does not.
 * Saves are made by the real engine in node and handed to the page through
 * localStorage key soccerCareerSave. Nothing here reaches the network beyond
 * the local server: every page aborts supabase.co first.
 *
 *  1. (page) Lazy: no SquadSheet chunk on a fresh hub, one after the press.
 *  2. The tile says what the lib says: rank, group size and trust percent
 *     equal squadView(save) in node. An academy save shows no tile.
 *  3. The sheet opens with focus inside. First open shows the help, ? shows
 *     it again. The chip names the source: an invented squad carries ages, a
 *     real one no age, flag, NEW chip or arrival line, a sheet by role no
 *     name at all.
 *  4. Every screen opens from its tile and Back returns home; the eleven is
 *     11 cells with him in it exactly when his rank says so. Escape goes
 *     home, then closes, and focus is back on the tile.
 *  5. The same save in a fresh context prints the same text on every screen.
 *  6. Display only: the soccerCareerSave string is byte identical before
 *     opening, after every screen and after closing, and the only key added
 *     to localStorage is soccerSquad:help.
 *  7. At 390 by 844 and 1280 by 800: no sideways scroll, the panel inside
 *     the screen, window.scrollY unchanged across open, every screen and
 *     close, every button at least 44 px tall, no text under 12 px, and at
 *     390 the panel does not scroll on any screen but the bench. On a sheet
 *     by role every role in the eleven reads whole ("2nd" over "choice"),
 *     and how many surnames are cut short is printed. (page) On the real
 *     page the sheet covers the screen and its panel sits inside it, at 390
 *     and at 1280, wherever the page behind it has scrolled to.
 *  8. Motion: with motion on, 20 ms after the eleven opens its last cell is
 *     still invisible (the stagger holds its first frame). With reduced
 *     motion, 100 ms after each screen arrives nothing in the sheet is still
 *     animating, the trust bar is at its final width and all eleven show.
 *  9. (page) Walker safety: playSoccerCareer's own pick never lands inside
 *     the tile or the sheet, and no label in either starts with one of its
 *     ACTIONS.
 *
 * Controls (CAREER_SQUAD_PLAY_CONTROL=), applied to what is SERVED, each
 * refusing to run without its needle:
 *   rank    the tile prints his rank plus one                     -> 2 red
 *   write   the sheet writes a field into the save as it opens     -> 6 red
 *   still   the reduced motion blanket is stripped from the CSS    -> 8 red
 *   nofill  the stagger's fill mode is stripped from the sheet     -> 8 red
 *   clip    a role in the eleven is one long unbreakable line      -> 7 red
 *   shift   the sheet is no longer pinned to the screen            -> 7 red
 *   static  (page) the page imports the sheet chunk as it loads    -> 1 red
 *   label   (page) the home footer reads "Close"                   -> 9 red
 *
 * Run: npm run build, then ENGINES=chromium node scripts/playCareerSquad.mjs
 * (MSYS_NO_PATHCONV=1 under Git Bash). Green is the closing
 * "playCareerSquad: N checks, 0 failed" line and exit 0. Screenshots go to
 * SHOTS (default .tmp-fx/shots).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const require = createRequire(import.meta.url);
const NM = path.dirname(path.dirname(require.resolve('react/package.json'))).replaceAll('\\', '/');
const DIST = path.join(ROOT, 'dist');
const ASSETS = path.join(DIST, 'assets');
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'careersquadplay-'));
const PORT = Number(process.env.PORT || 4577);
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = path.resolve(ROOT, process.env.SHOTS || '.tmp-fx/shots');
const CONTROL = process.env.CAREER_SQUAD_PLAY_CONTROL ?? '';
const CONTROLS = ['rank', 'write', 'still', 'nofill', 'clip', 'shift', 'static', 'label'];
if (CONTROL && !CONTROLS.includes(CONTROL)) throw new Error(`unknown CAREER_SQUAD_PLAY_CONTROL ${CONTROL}`);
const SAVE_KEY = 'soccerCareerSave';

let checks = 0;
let failed = 0;
const check = (ok, label) => { checks += 1; if (ok) console.log(`ok   ${label}`); else { failed += 1; console.log(`FAIL ${label}`); } return ok; };

if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.log('dist/index.html is missing: run npm run build first. NOT CHECKED.'); process.exit(1); }
const cssFiles = fs.readdirSync(ASSETS).filter(f => f.endsWith('.css'));
if (!cssFiles.length) { console.log('dist/assets holds no stylesheet. NOT CHECKED.'); process.exit(1); }

/* ── the game's own code, in node, for the saves and for what the tile must say ── */
const nodeEntry = path.join(WORK, 'node-entry.mjs');
fs.writeFileSync(nodeEntry, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('${ROOT_URL}/src/lib/soccerClubSquad.ts');
export const sheet = await import('${ROOT_URL}/src/lib/soccerClubSquadSheet.ts');
export const engine = await import('${ROOT_URL}/src/lib/soccerCareerEngine.ts');
`);
await build({
  entryPoints: [nodeEntry], bundle: true, format: 'esm', platform: 'node', outfile: path.join(WORK, 'node-bundle.mjs'),
  alias: { '@': `${ROOT_URL}/src` }, nodePaths: [NM], logLevel: 'error',
});
const { lib, sheet, engine } = await import(pathToFileURL(path.join(WORK, 'node-bundle.mjs')).href);
const CLUBS = engine.FALLBACK_CLUBS;
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const realRandom = Math.random;
function seedRandom(n) {
  let seed = n | 0;
  Math.random = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function step(s) {
  switch (s.phase) {
    case 'youth': return engine.advanceYouthYear(s, CLUBS);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? engine.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; }
    case 'playing': return engine.advanceProSeason(s, CLUBS);
    case 'newspaper': return engine.dismissNewspaper(s);
    case 'season_summary': return engine.dismissSummary(s, CLUBS);
    case 'ballon_dor': return engine.dismissBallonDor(s, CLUBS);
    case 'international_debut': return engine.dismissDebut(s, CLUBS);
    case 'world_cup': return engine.dismissWorldCup(s, CLUBS);
    case 'rivalry_event': return engine.dismissRivalryEvent(s, CLUBS);
    case 'social_media_action': return engine.dismissSocialMediaPhase(s, CLUBS);
    case 'moral_dilemma': return engine.dismissMoralDilemma(s, CLUBS);
    case 'random_events': { const ev = (s.pendingEvents || [])[0]; return ev ? engine.applyEventChoice(s, 0, CLUBS) : { ...s, phase: 'playing', pendingEvents: [] }; }
    case 'red_card_appeal_result': return engine.dismissAppealResult(s, CLUBS);
    case 'rehab_choice': return engine.applyRehabChoice(s, 1);
    case 'transfer_window': return engine.stayAtClub(s);
    default: return null;
  }
}
/** Plays seeded careers of one era until `want(save)` says a pre season save is the one. */
function findSave(era, startYear, want, careers = 400) {
  for (let c = 0; c < careers; c += 1) {
    seedRandom(c * 7919 + 1115);
    const ovr = 52 + (c % 20);
    let s = engine.initCareer('Sam Carter', 'England', ['ST', 'CM', 'CB', 'LW'][c % 4], era, abil(ovr), ovr, startYear, CLUBS, null);
    for (let guard = 0; s && !s.retired && guard < 220; guard += 1) {
      if (s.phase === 'playing' && want(s)) { Math.random = realRandom; return JSON.parse(JSON.stringify(s)); }
      s = step(s);
    }
  }
  Math.random = realRandom;
  return null;
}
const playedRows = s => s.seasons.filter(r => r.type === 'playing').length;
const SAVES = {
  /* A: the default era in its fourth pro season, with invented teammates and a last season to explain */
  A: findSave('2025', 2025, s => playedRows(s) === 3 && lib.squadView(s)?.source === 'invented' && lib.squadView(s).carried === 0 && !!sheet.lastSeason(s)),
  /* B: the first career found at a club and season with a real baked squad */
  B: findSave('2015-19', 2015, s => playedRows(s) >= 1 && lib.squadView(s)?.source === 'real'),
  /* R: a real past season with no checked squad list: roles only */
  R: findSave('1990-94', 1990, s => playedRows(s) === 2 && lib.squadView(s)?.source === 'roles'),
};
/* C: an academy year */
seedRandom(1115);
SAVES.C = JSON.parse(JSON.stringify(engine.initCareer('Sam Carter', 'England', 'ST', '2025', abil(55), 55, 2025, CLUBS, null)));
Math.random = realRandom;
for (const k of ['A', 'B', 'R']) if (!SAVES[k]) { console.log(`no save ${k} was found in 400 seeded careers. NOT CHECKED.`); process.exit(1); }
/* D: the longest real line there is, a midfielder at PSG going into 2022 (nine real midfielders) */
{
  const d = JSON.parse(JSON.stringify(SAVES.A));
  const shift = 2021 - d.seasons[d.seasons.length - 1].year;
  for (const row of d.seasons) row.year += shift;
  Object.assign(d, { position: 'CM', currentClub: 'PSG', currentClubCountry: 'France', currentClubTier: 1, overall: 80 });
  SAVES.D = d;
}
const VIEW = Object.fromEntries(Object.entries(SAVES).map(([k, s]) => [k, lib.squadView(s)]));
check(VIEW.A?.source === 'invented' && VIEW.B?.source === 'real' && VIEW.R?.source === 'roles' && VIEW.C === null && VIEW.D?.source === 'real' && VIEW.D.groupSize >= 9,
  `saves: A invented at ${VIEW.A?.club} ${VIEW.A?.year}, B real at ${VIEW.B?.club} ${VIEW.B?.year}, R by role at ${VIEW.R?.club} ${VIEW.R?.year}, C academy (no squad), D real with a line of ${VIEW.D?.groupSize}`);

/* ── standalone: the tile on a page of its own ──────────────────────────── */
const SITE = path.join(WORK, 'site');
fs.mkdirSync(SITE, { recursive: true });
const webEntry = path.join(WORK, 'entry.jsx');
fs.writeFileSync(webEntry, `
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { SquadTile } from '${ROOT_URL}/src/components/soccer-career/SquadTile.tsx';
const raw = window.localStorage.getItem('${SAVE_KEY}');
if (raw) createRoot(document.getElementById('root')).render(createElement(SquadTile, { career: JSON.parse(raw) }));
window.__mounted = true;
`);
await build({
  entryPoints: [webEntry], bundle: true, format: 'esm', platform: 'browser', splitting: true, jsx: 'automatic',
  outdir: SITE, entryNames: 'entry', chunkNames: '[name]-[hash]', logLevel: 'error',
  alias: { '@': `${ROOT_URL}/src` }, nodePaths: [NM], define: { 'process.env.NODE_ENV': '"production"' },
});
fs.writeFileSync(path.join(SITE, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Squad tile, standalone</title>
${cssFiles.map(f => `<link rel="stylesheet" href="/assets/${f}">`).join('\n')}
</head><body>
<div style="height:260px"></div>
<div id="root" style="max-width:420px;margin:0 auto;padding:0 12px"></div>
<div style="height:1600px"></div>
<script type="module" src="/entry.js"></script>
</body></html>`);

/* Controls change what is SERVED, never a file on disk. Each counts its edits
   and the run refuses to go on if a control edited nothing. */
let controlEdits = 0;
/* The sheet's own overlay classes, as SquadSheet.tsx writes them. The shift
   control unpins exactly this box, and only in the sheet's own chunk (the
   tile's failure dialog wears the same classes and lives in another file). */
const SHEET_BOX = 'fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-3 backdrop-blur-sm';
const UNPINNED_BOX = SHEET_BOX.replace('fixed inset-0', 'absolute inset-0');
function served(name, body) {
  const edit = (needle, swap) => {
    const n = body.split(needle).length - 1;
    if (n) { controlEdits += n; body = body.split(needle).join(swap); }
  };
  if (CONTROL === 'rank' && name.endsWith('.js')) {
    edit('"data-squad-rank": view.rank, children: ordinal(view.rank)', '"data-squad-rank": view.rank + 1, children: ordinal(view.rank + 1)');
  }
  if (CONTROL === 'write' && name.endsWith('.js')) {
    edit('function SquadSheet({ career, view, onClose, initialScreen }) {',
      `function SquadSheet({ career, view, onClose, initialScreen }) { try { const __s = JSON.parse(window.localStorage.getItem("${SAVE_KEY}")); __s.squadSeen = 1; window.localStorage.setItem("${SAVE_KEY}", JSON.stringify(__s)); } catch {}`);
  }
  if (CONTROL === 'nofill' && name.endsWith('.js')) edit('animationFillMode: "both"', 'animationFillMode: "none"');
  /* the role goes back to one long unbreakable line, the way it was first drawn */
  if (CONTROL === 'clip' && name.endsWith('.js')) edit('children: choiceOf(m.role)', 'children: m.role.split(" ").join("\\u00a0")');
  if (CONTROL === 'shift' && name.endsWith('.js') && /SquadSheet/.test(name)) edit(SHEET_BOX, UNPINNED_BOX);
  if (CONTROL === 'still' && name.endsWith('.css')) {
    edit('prefers-reduced-motion:reduce', 'prefers-reduced-motion:x-never');
    edit('prefers-reduced-motion: reduce', 'prefers-reduced-motion: x-never');
  }
  return body;
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const sheetRequests = [];
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const name = url === '/' ? 'index.html' : path.basename(url);
  const file = url.startsWith('/assets/') ? path.join(ASSETS, name) : path.join(SITE, name);
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
  if (/SquadSheet/.test(name)) sheetRequests.push(name);
  const ext = path.extname(name);
  const text = ext === '.js' || ext === '.css' || ext === '.html';
  res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(text ? served(name, fs.readFileSync(file, 'utf8')) : fs.readFileSync(file));
});
await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));

const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
/** A fresh browser context holding one save, on the standalone page. */
async function open(save, { width = 390, height = 844, reduced = false, helpSeen = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([key, value, seen]) => {
    if (window.sessionStorage.getItem('__seeded')) return;
    window.sessionStorage.setItem('__seeded', '1');
    window.localStorage.setItem(key, value);
    if (seen) window.localStorage.setItem('soccerSquad:help', '1');
  }, [SAVE_KEY, JSON.stringify(save), helpSeen]);
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  /* generous: this runs beside builds and type checks on a loaded machine */
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__mounted === true, null, { timeout: 90000 });
  return { ctx, page, errors };
}
const TILE = '[data-squad-tile]';
const SHEET = '[data-squad-sheet]';
const screenIs = (page, name) => page.waitForSelector(`${SHEET} [data-squad-screen="${name}"]`, { timeout: 8000 });
const backHome = async page => { await page.click(`${SHEET} button:has-text("← Back")`); await screenIs(page, 'home'); };
async function shot(page, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

const ORD = n => { const t = n % 100; if (t >= 11 && t <= 13) return `${n}th`; const u = n % 10; return `${n}${u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'}`; };
const SCREENS = ['eleven', 'bench', 'place', 'last'];

/* ── 2. the tile says what the lib says ─────────────────────────────────── */
for (const k of ['A', 'B', 'R', 'D']) {
  const { ctx, page, errors } = await open(SAVES[k]);
  const v = VIEW[k];
  const got = await page.evaluate(sel => {
    const t = document.querySelector(sel);
    if (!t) return null;
    const rank = t.querySelector('[data-squad-rank]');
    return { rank: rank?.getAttribute('data-squad-rank'), rankText: rank?.textContent, trust: t.querySelector('[data-squad-trust]')?.getAttribute('data-squad-trust'), text: t.textContent };
  }, TILE);
  check(!!got && got.rank === String(v.rank) && got.rankText === ORD(v.rank) && got.trust === String(v.trust.pct) && got.text.includes(`of ${v.groupSize} `) && got.text.includes(v.trust.label),
    `2. save ${k}: the tile prints ${ORD(v.rank)} of ${v.groupSize}, trust ${v.trust.pct} (${v.trust.label}); the page shows ${JSON.stringify(got && [got.rankText, got.trust])}`);
  check(errors.length === 0, `2. save ${k}: no page error (${errors[0] || 'none'})`);
  if (k === 'A') await shot(page, 'A-tile-390');
  await ctx.close();
}
{
  const { ctx, page } = await open(SAVES.C);
  check(await page.locator(TILE).count() === 0, '2. save C (an academy year) shows no tile');
  await ctx.close();
}

/* ── 3. it opens on the help the first time, with focus inside, and says what it is ── */
async function sourceFacts(page) {
  const facts = { ages: 0, flags: 0, news: 0, arrivals: 0, names: [] };
  for (const id of ['bench', 'place']) {
    await page.click(`${SHEET} [data-squad-open="${id}"]`);
    await screenIs(page, id);
    const f = await page.evaluate(sel => {
      const s = document.querySelector(sel);
      return {
        ages: s.querySelectorAll('[data-squad-age]').length, flags: s.querySelectorAll('img, svg').length,
        news: s.querySelectorAll('[data-squad-new]').length, arrivals: s.querySelectorAll('[data-squad-arrival]').length,
        names: [...s.querySelectorAll('[data-squad-man="other"] [title]')].map(e => e.getAttribute('title')),
      };
    }, SHEET);
    facts.ages += f.ages; facts.flags += f.flags; facts.news += f.news; facts.arrivals += f.arrivals; facts.names.push(...f.names);
    await backHome(page);
  }
  return facts;
}
{
  const { ctx, page } = await open(SAVES.A, { helpSeen: false });
  await page.click(TILE);
  await screenIs(page, 'help');
  check(true, '3. the first open shows the help');
  check(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')), '3. focus is inside the dialog');
  await backHome(page);
  await page.click(`${SHEET} button[aria-label="How the squad works"]`);
  await screenIs(page, 'help');
  await page.click(`${SHEET} button:has-text("Worked examples")`);
  await screenIs(page, 'examples');
  const ex = await page.locator(`${SHEET} [data-squad-help]`).innerText();
  const n = sheet.squadHelpExamples();
  check(ex.includes(`${ORD(n.rank)} of ${n.groupSize} forwards`) && ex.includes(`${n.band.min} to ${n.band.max} league games`) && ex.includes(`trust ${n.pct}%`) && ex.includes(`${n.thinBand.min} to ${n.thinBand.max} league games`),
    '3. the worked examples print the numbers the lib computes');
  await backHome(page);
  const chip = await page.locator(`${SHEET} [data-squad-source]`).first();
  check(await chip.getAttribute('data-squad-source') === 'invented' && (await chip.innerText()).trim() === 'INVENTED TEAMMATES', '3. save A is labelled INVENTED TEAMMATES');
  const f = await sourceFacts(page);
  check(f.ages > 10, `3. save A: an invented squad carries ages (${f.ages})`);
  await ctx.close();
}
{
  const { ctx, page } = await open(SAVES.B);
  await page.click(TILE);
  await screenIs(page, 'home');
  check(true, '3. a viewer who has seen the help opens on home');
  const chip = page.locator(`${SHEET} [data-squad-source]`).first();
  check(await chip.getAttribute('data-squad-source') === 'real' && (await chip.innerText()).trim() === 'REAL SQUAD', '3. save B is labelled REAL SQUAD');
  const f = await sourceFacts(page);
  check(f.ages === 0 && f.flags === 0 && f.news === 0 && f.arrivals === 0, `3. save B: a real squad carries no age, flag, NEW chip or arrival line (${JSON.stringify([f.ages, f.flags, f.news, f.arrivals])})`);
  await ctx.close();
}
{
  const { ctx, page } = await open(SAVES.R);
  await page.click(TILE);
  await screenIs(page, 'home');
  const chip = page.locator(`${SHEET} [data-squad-source]`).first();
  check(await chip.getAttribute('data-squad-source') === 'roles' && (await chip.innerText()).trim() === 'ROLES ONLY', '3. save R is labelled ROLES ONLY');
  const line = await page.locator(`${SHEET} [data-squad-source-line]`).innerText();
  const f = await sourceFacts(page);
  check(f.names.length >= 12 && f.names.every(n => / choice /.test(n)) && f.flags === 0 && line.includes('no checked squad list'),
    `3. save R: every man is a role, none has a name or a flag, and the sheet says why (${f.names.length} men)`);
  check(f.ages > 10, `3. save R: a sheet by role still carries ages (${f.ages})`);
  await ctx.close();
}

/* ── 4, 5, 6: every screen, the same every time, and nothing written ────── */
async function walk(k, tag) {
  const { ctx, page } = await open(SAVES[k], { helpSeen: false });
  const before = await page.evaluate(key => window.localStorage.getItem(key), SAVE_KEY);
  const keysBefore = await page.evaluate(() => Object.keys(window.localStorage).sort());
  const text = {};
  await page.click(TILE);
  await screenIs(page, 'help');
  text.help = await page.locator(`${SHEET} [role="dialog"]`).innerText();
  await backHome(page);
  text.home = await page.locator(`${SHEET} [role="dialog"]`).innerText();
  let opened = 0;
  let cells = null;
  for (const id of SCREENS) {
    if (await page.locator(`${SHEET} [data-squad-open="${id}"]`).count() === 0) continue;
    await page.click(`${SHEET} [data-squad-open="${id}"]`);
    await screenIs(page, id);
    opened += 1;
    await page.waitForTimeout(450);
    text[id] = await page.locator(`${SHEET} [role="dialog"]`).innerText();
    if (id === 'eleven') cells = await page.evaluate(sel => ({ all: document.querySelectorAll(`${sel} [data-squad-xi] [data-squad-man]`).length, me: document.querySelectorAll(`${sel} [data-squad-xi] [data-squad-man="me"]`).length }), SHEET);
    if (tag) await shot(page, `${k}-${id}-${tag}`);
    await backHome(page);
  }
  const mid = await page.evaluate(key => window.localStorage.getItem(key), SAVE_KEY);
  /* Escape goes home from a screen, then closes, and the tile has the focus again */
  await page.click(`${SHEET} [data-squad-open="place"]`);
  await screenIs(page, 'place');
  await page.keyboard.press('Escape');
  await screenIs(page, 'home');
  await page.keyboard.press('Escape');
  await page.waitForSelector(SHEET, { state: 'detached', timeout: 8000 });
  const focusOnTile = await page.evaluate(() => document.activeElement?.hasAttribute('data-squad-tile') === true);
  const after = await page.evaluate(key => window.localStorage.getItem(key), SAVE_KEY);
  const keysAfter = await page.evaluate(() => Object.keys(window.localStorage).sort());
  await ctx.close();
  return { text, opened, cells, focusOnTile, same: before === mid && before === after, added: keysAfter.filter(x => !keysBefore.includes(x)) };
}
for (const k of ['A', 'B', 'R']) {
  const one = await walk(k, null);
  const two = await walk(k, null);
  const v = VIEW[k];
  const want = sheet.lastSeason(SAVES[k]) ? 4 : 3;
  check(one.opened === want, `4. save ${k}: ${one.opened} screens opened from their tiles and Back returned home each time (${want} expected)`);
  check(!!one.cells && one.cells.all === 11 && one.cells.me === (v.inElevenOnRating ? 1 : 0), `4. save ${k}: the eleven is 11 cells with him in ${v.inElevenOnRating ? 'one' : 'none'} of them (${JSON.stringify(one.cells)})`);
  check(one.focusOnTile, `4. save ${k}: Escape went home, then closed, and focus is back on the tile`);
  check(JSON.stringify(one.text) === JSON.stringify(two.text) && Object.keys(one.text).length >= 5, `5. save ${k}: a fresh context prints the same text on all ${Object.keys(one.text).length} screens`);
  check(one.same, `6. save ${k}: the save string is byte identical before opening, after every screen and after closing`);
  check(one.added.length === 1 && one.added[0] === 'soccerSquad:help', `6. save ${k}: the only key added to localStorage is soccerSquad:help (${one.added.join(', ') || 'none'})`);
}

/* ── 7. two sizes: nothing sideways, nothing moves, nothing small ───────── */
const measure = (page) => page.evaluate(([tileSel, sheetSel]) => {
  const out = { sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, y: window.scrollY, short: [], small: [], outside: false, scrolls: false, h: 0 };
  const roots = [document.querySelector(tileSel), document.querySelector(sheetSel)].filter(Boolean);
  for (const root of roots) {
    for (const b of root.matches('button') ? [root] : root.querySelectorAll('button')) {
      const r = b.getBoundingClientRect();
      if (r.height < 43.5) out.short.push(`${(b.textContent || '').trim().slice(0, 20)} ${r.height.toFixed(0)}`);
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const size = parseFloat(getComputedStyle(n.parentElement).fontSize);
      if (size < 11.99) out.small.push(`${n.textContent.trim().slice(0, 20)} ${size}`);
    }
  }
  const panel = document.querySelector(`${sheetSel} [role="dialog"]`);
  if (panel) {
    const r = panel.getBoundingClientRect();
    out.outside = r.left < -0.5 || r.top < -0.5 || r.right > window.innerWidth + 0.5 || r.bottom > window.innerHeight + 0.5;
    out.scrolls = panel.scrollHeight > panel.clientHeight + 1;
    out.h = Math.round(r.height);
  }
  return out;
}, [TILE, SHEET]);

/* The cells of the eleven whose words do not fit: a box wider inside than
   out, on the cell or on anything it holds. */
const cutCells = page => page.evaluate(sel => {
  const over = el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1;
  const out = { cells: 0, roles: 0, cutRoles: 0, cutNames: 0, labels: [] };
  for (const c of document.querySelectorAll(`${sel} [data-squad-xi] [data-squad-man]`)) {
    out.cells += 1;
    const role = c.querySelector('[data-squad-role-cell]');
    const cut = over(c) || [...c.querySelectorAll('span')].some(over);
    if (role) {
      out.roles += 1;
      out.labels.push(role.innerText.split(/\s+/).filter(Boolean).join(' '));
      if (cut) out.cutRoles += 1;
    } else if (cut) out.cutNames += 1;
  }
  return out;
}, SHEET);

for (const [width, height] of [[390, 844], [1280, 800]]) {
  for (const k of ['A', 'D', 'R', 'B']) {
    const { ctx, page } = await open(SAVES[k], { width, height });
    await page.evaluate(() => window.scrollTo(0, 120));
    const y0 = await page.evaluate(() => window.scrollY);
    const bad = { sideways: 0, outside: [], moved: [], short: [], small: [], scrolls: [] };
    const heights = {};
    let xi = null;
    const note = (name, m) => {
      if (m.sideways) bad.sideways += 1;
      if (m.outside) bad.outside.push(name);
      if (m.y !== y0) bad.moved.push(`${name} ${m.y}`);
      if (m.scrolls && name !== 'bench') bad.scrolls.push(name);
      bad.short.push(...m.short.map(s => `${name}: ${s}`));
      bad.small.push(...m.small.map(s => `${name}: ${s}`));
      heights[name] = m.h;
    };
    note('tile', await measure(page));
    await page.click(TILE);
    await screenIs(page, 'home');
    await page.waitForTimeout(700);
    note('home', await measure(page));
    await shot(page, `${k}-home-${width}`);
    for (const id of SCREENS) {
      if (await page.locator(`${SHEET} [data-squad-open="${id}"]`).count() === 0) continue;
      await page.click(`${SHEET} [data-squad-open="${id}"]`);
      await screenIs(page, id);
      await page.waitForTimeout(600);
      note(id, await measure(page));
      if (id === 'eleven') xi = await cutCells(page);
      await shot(page, `${k}-${id}-${width}`);
      await backHome(page);
    }
    await page.click(`${SHEET} button[aria-label="How the squad works"]`);
    await screenIs(page, 'help');
    note('help', await measure(page));
    await shot(page, `${k}-help-${width}`);
    await page.click(`${SHEET} button:has-text("Worked examples")`);
    await screenIs(page, 'examples');
    note('examples', await measure(page));
    await shot(page, `${k}-examples-${width}`);
    await backHome(page);
    await page.click(`${SHEET} button:has-text("← Back to your career")`);
    await page.waitForSelector(SHEET, { state: 'detached', timeout: 8000 });
    note('closed', await measure(page));
    const where = `7. save ${k} at ${width} by ${height}`;
    check(bad.sideways === 0 && bad.outside.length === 0, `${where}: no sideways scroll and the panel inside the screen (${bad.outside.join(', ') || 'all inside'}; heights ${JSON.stringify(heights)})`);
    check(bad.moved.length === 0, `${where}: window.scrollY stayed at ${y0} across open, every screen and close (${bad.moved.join(', ') || 'never moved'})`);
    check(bad.short.length === 0, `${where}: every button at least 44 px tall (${bad.short.slice(0, 3).join(' | ') || 'all'})`);
    check(bad.small.length === 0, `${where}: no text under 12 px (${bad.small.slice(0, 3).join(' | ') || 'none'})`);
    check(bad.scrolls.length === 0, `${where}: the panel does not scroll on any screen but the bench (${bad.scrolls.join(', ') || 'none'})`);
    /* A role is the only thing that says who a man is on a sheet with no
       names, so in the eleven it must read whole: "2nd" over "choice", never
       a word cut short. A long surname may still be cut (the bench and the
       place screen print it in full), and how many were is printed. */
    if (k === 'R') {
      check(!!xi && xi.roles >= 10 && xi.cutRoles === 0 && xi.labels.every(l => /^(1st|2nd|3rd|4th) choice$/.test(l)),
        `${where}: every role in the eleven reads whole (${xi ? `${xi.roles} role cells, ${xi.cutRoles} cut, e.g. "${xi.labels[0]}"` : 'no eleven measured'})`);
    } else {
      console.log(`note ${where}: ${xi ? `${xi.cutNames} of ${xi.cells} names in the eleven are cut short` : 'no eleven measured'}`);
    }
    await ctx.close();
  }
}

/* ── 8. motion ──────────────────────────────────────────────────────────── */
{
  const { ctx, page } = await open(SAVES.A);
  await page.click(TILE);
  await screenIs(page, 'home');
  const opacity = await page.evaluate(async sel => {
    document.querySelector(`${sel} [data-squad-open="eleven"]`).click();
    await new Promise(done => { const tick = () => (document.querySelector(`${sel} [data-squad-xi]`) ? done() : requestAnimationFrame(tick)); tick(); });
    await new Promise(done => setTimeout(done, 20));
    const cells = document.querySelectorAll(`${sel} [data-squad-xi] [data-squad-man]`);
    return parseFloat(getComputedStyle(cells[cells.length - 1]).opacity);
  }, SHEET);
  check(opacity < 1, `8. motion on: 20 ms after the eleven opens its last cell is not showing yet (opacity ${opacity})`);
  await ctx.close();
}
{
  const { ctx, page } = await open(SAVES.A, { reduced: true });
  const still = () => page.evaluate(sel => {
    const root = document.querySelector(sel);
    const running = document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.target && root.contains(a.effect.target)).length;
    const bar = root.querySelector('[data-squad-trust-bar]');
    const track = bar ? bar.parentElement : null;
    const want = bar ? Number(root.querySelector('[data-squad-trust]').getAttribute('data-squad-trust')) : null;
    const cells = [...root.querySelectorAll('[data-squad-xi] [data-squad-man]')].map(c => parseFloat(getComputedStyle(c).opacity));
    return { running, barOff: bar ? Math.abs((bar.getBoundingClientRect().width / track.getBoundingClientRect().width) * 100 - want) : 0, hidden: cells.filter(o => o < 1).length, cells: cells.length };
  }, SHEET);
  await page.click(TILE);
  await screenIs(page, 'home');
  await page.waitForTimeout(100);
  const home = await still();
  check(home.running === 0 && home.barOff < 1.5, `8. reduced motion: 100 ms after home arrives nothing is animating and the trust bar is at its figure (running ${home.running}, bar off by ${home.barOff.toFixed(1)})`);
  let worst = 0; let hidden = 0; let cells = 0;
  for (const id of SCREENS) {
    if (await page.locator(`${SHEET} [data-squad-open="${id}"]`).count() === 0) continue;
    await page.click(`${SHEET} [data-squad-open="${id}"]`);
    await screenIs(page, id);
    await page.waitForTimeout(100);
    const m = await still();
    worst = Math.max(worst, m.running);
    if (id === 'eleven') { hidden = m.hidden; cells = m.cells; }
    await backHome(page);
  }
  check(worst === 0, `8. reduced motion: 100 ms after each screen arrives nothing in the sheet is still animating (${worst} running at worst)`);
  check(cells === 11 && hidden === 0, `8. reduced motion: all eleven cells show at once (${cells - hidden} of ${cells})`);
  await ctx.close();
}

/* ── page mode ──────────────────────────────────────────────────────────── */
const mounted = fs.readdirSync(ASSETS).some(f => f.endsWith('.js') && /SoccerCareer/.test(f) && fs.readFileSync(path.join(ASSETS, f), 'utf8').includes('data-squad-tile'));
if (!mounted) {
  if (process.env.REQUIRE_PAGE === '1') check(false, 'page: the built Soccer Career chunk does not hold the Squad tile, and REQUIRE_PAGE=1 says it must');
  else console.log('note page mode not run: the tile is not mounted on /soccer-career in this build (sections 1 and 9 are page checks)');
}
if (mounted) {
  const { spawn } = await import('node:child_process');
  const PORT2 = PORT + 1;
  const BASE2 = `http://127.0.0.1:${PORT2}`;
  const host = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT2)], { stdio: 'ignore' });
  await new Promise(done => setTimeout(done, 1500));
  try {
    const sheetChunks = fs.readdirSync(ASSETS).filter(f => f.endsWith('.js') && fs.readFileSync(path.join(ASSETS, f), 'utf8').includes('data-squad-xi'));
    if (!check(sheetChunks.length === 1, `page: the sheet is one chunk of its own (${sheetChunks.join(', ') || 'none'})`)) throw new Error('no single sheet chunk');
    const SHEET_CHUNK = sheetChunks[0];
    let chunkText = fs.readFileSync(path.join(ASSETS, SHEET_CHUNK), 'utf8');
    if (CONTROL === 'label') {
      for (const needle of ['← Back to your career', '\\u2190 Back to your career']) {
        const n = chunkText.split(needle).length - 1;
        if (n) { controlEdits += n; chunkText = chunkText.split(needle).join('Close'); }
      }
    }
    if (CONTROL === 'shift') {
      const n = chunkText.split(SHEET_BOX).length - 1;
      if (n) { controlEdits += n; chunkText = chunkText.split(SHEET_BOX).join(UNPINNED_BOX); }
    }
    /* Where the sheet sits on the REAL page: pinned to the screen, whatever
       the page behind it has scrolled to and whatever box it is mounted in. */
    const pinned = page => page.evaluate(sel => {
      const box = document.querySelector(sel)?.getBoundingClientRect();
      const panel = document.querySelector(`${sel} [role="dialog"]`)?.getBoundingClientRect();
      if (!box || !panel) return { ok: false, why: 'no sheet' };
      const covers = Math.abs(box.left) < 1 && Math.abs(box.top) < 1 && Math.abs(box.width - window.innerWidth) < 1 && Math.abs(box.height - window.innerHeight) < 1;
      const inside = panel.left >= -0.5 && panel.top >= -0.5 && panel.right <= window.innerWidth + 0.5 && panel.bottom <= window.innerHeight + 0.5;
      return { ok: covers && inside, why: `sheet ${Math.round(box.left)},${Math.round(box.top)} ${Math.round(box.width)}x${Math.round(box.height)}, panel ${Math.round(panel.left)},${Math.round(panel.top)} to ${Math.round(panel.right)},${Math.round(panel.bottom)}, screen ${window.innerWidth}x${window.innerHeight}` };
    }, SHEET);
    /* the walker's own rule, read from its file's TEXT (the file runs on import) */
    const src = fs.readFileSync(path.join(ROOT, 'scripts/playSoccerCareer.mjs'), 'utf8').replace(/\r\n/g, '\n');
    const at = src.indexOf('const ACTIONS = [');
    const end = src.indexOf('];', at);
    const body = src.slice(at, end).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const actions = [...body.matchAll(/'([^']+)'/g)].map(m => m[1]);
    const skipLine = src.split('\n').find(l => l.startsWith('const SKIP = /')) || '';
    const skip = skipLine.slice(skipLine.indexOf('/') + 1, skipLine.lastIndexOf('/'));
    check(at >= 0 && actions.includes('Next Season') && actions.includes('Close') && skip.includes('Retire'), `9. parsed the walker's ACTIONS (${actions.length} entries) and SKIP from its text`);

    const openPage = async (save, { width = 390, height = 844 } = {}) => {
      const ctx = await browser.newContext({ viewport: { width, height } });
      await ctx.addInitScript(([key, value, extra]) => {
        try {
          if (!window.sessionStorage.getItem('__seeded')) {
            window.sessionStorage.setItem('__seeded', '1');
            window.localStorage.setItem('cookie-consent', 'essential');
            window.localStorage.setItem(key, value);
            window.localStorage.setItem('soccerSquad:help', '1');
          }
        } catch { /* private mode */ }
        if (extra) document.addEventListener('DOMContentLoaded', () => { import(extra).catch(() => {}); });
      }, [SAVE_KEY, JSON.stringify(save), CONTROL === 'static' ? `/assets/${SHEET_CHUNK}` : '']);
      await ctx.route(/supabase\.co/, r => r.abort());
      await ctx.route(`**/assets/${SHEET_CHUNK}`, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: chunkText }));
      const page = await ctx.newPage();
      const js = [];
      page.on('request', r => { const u = r.url(); if (u.includes('/assets/') && u.endsWith('.js')) js.push(u.split('/').pop()); });
      await page.goto(`${BASE2}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector(TILE, { timeout: 30000 });
      return { ctx, page, js };
    };
    if (CONTROL === 'static') controlEdits += 1;
    const walkerPick = page => page.evaluate(([acts, skipSrc]) => {
      const skipRe = new RegExp(skipSrc);
      const usable = [...document.querySelectorAll('button')].filter(b => !b.disabled && b.textContent.trim() && !skipRe.test(b.textContent.trim()));
      let pick = null;
      for (const a of acts) { pick = usable.find(b => b.textContent.trim().startsWith(a)); if (pick) break; }
      if (!pick) pick = usable[0] ?? null;
      const ours = [...document.querySelectorAll('[data-squad-tile], [data-squad-sheet] button')].map(b => b.textContent.trim());
      return {
        pick: pick ? pick.textContent.trim().slice(0, 40) : null,
        inside: !!pick && (!!pick.closest('[data-squad-sheet]') || pick.hasAttribute('data-squad-tile')),
        clash: ours.filter(l => acts.some(a => l.startsWith(a))),
      };
    }, [actions, skip]);

    for (const k of ['A', 'B']) {
      const { ctx, page, js } = await openPage(SAVES[k]);
      const v = VIEW[k];
      await page.waitForTimeout(1500);
      if (k === 'A') check(!js.includes(SHEET_CHUNK), `1. no sheet chunk on a fresh hub (${js.length} scripts loaded)`);
      const got = await page.evaluate(sel => {
        const t = document.querySelector(sel);
        return { rank: t.querySelector('[data-squad-rank]')?.getAttribute('data-squad-rank'), trust: t.querySelector('[data-squad-trust]')?.getAttribute('data-squad-trust'), n: document.querySelectorAll(sel).length };
      }, TILE);
      check(got.n === 1 && got.rank === String(v.rank) && got.trust === String(v.trust.pct), `2. page, save ${k}: one tile on the hub, printing rank ${v.rank} and trust ${v.trust.pct} (${JSON.stringify(got)})`);
      let inside = 0; const clashes = new Set(); let screens = 0;
      const look = async () => { const r = await walkerPick(page); screens += 1; if (r.inside) inside += 1; r.clash.forEach(c => clashes.add(c)); return r; };
      const hub = await look();
      await page.evaluate(sel => document.querySelector(sel).scrollIntoView({ block: 'center' }), TILE);
      await shot(page, `page-${k}-hub-390`);
      await page.evaluate(() => window.scrollTo(0, 200));
      const y0 = await page.evaluate(() => window.scrollY);
      const before = await page.evaluate(key => window.localStorage.getItem(key), SAVE_KEY);
      await page.click(TILE);
      await screenIs(page, 'home');
      if (k === 'A') check(js.filter(n => n === SHEET_CHUNK).length === 1, `1. one request for the sheet chunk after the press (${js.filter(n => n === SHEET_CHUNK).length})`);
      await look();
      /* settle first: the sheet fades and grows in over 200 ms */
      await page.waitForTimeout(700);
      const at390 = await pinned(page);
      check(at390.ok, `7. page, save ${k} at 390: the sheet covers the screen and its panel sits inside it, with the page scrolled to ${y0} (${at390.why})`);
      await shot(page, `page-${k}-home-390`);
      for (const id of SCREENS) {
        if (await page.locator(`${SHEET} [data-squad-open="${id}"]`).count() === 0) continue;
        await page.click(`${SHEET} [data-squad-open="${id}"]`);
        await screenIs(page, id);
        await look();
        await backHome(page);
      }
      await page.click(`${SHEET} button[aria-label="How the squad works"]`);
      await screenIs(page, 'help');
      await look();
      await page.click(`${SHEET} button:has-text("Worked examples")`);
      await screenIs(page, 'examples');
      await look();
      await page.keyboard.press('Escape');
      await screenIs(page, 'home');
      await page.keyboard.press('Escape');
      await page.waitForSelector(SHEET, { state: 'detached', timeout: 8000 });
      const y1 = await page.evaluate(() => window.scrollY);
      const after = await page.evaluate(key => window.localStorage.getItem(key), SAVE_KEY);
      check(inside === 0, `9. page, save ${k}: the walker's pick never landed inside the tile or the sheet over ${screens} screens (on the hub it presses "${hub.pick}")`);
      check(clashes.size === 0, `9. page, save ${k}: no label in the tile or the sheet starts with a walker ACTIONS entry (${[...clashes].join(', ') || 'none'})`);
      check(y1 === y0, `7. page, save ${k}: the career page did not move across open, every screen and close (${y0} then ${y1})`);
      check(before === after, `6. page, save ${k}: the save string is byte identical after the sheet has been through every screen`);
      await ctx.close();
    }
    /* the same on a desktop screen, where the hub is two panels side by side */
    {
      const { ctx, page } = await openPage(SAVES.A, { width: 1280, height: 800 });
      await page.waitForTimeout(1500);
      await page.evaluate(sel => document.querySelector(sel).scrollIntoView({ block: 'center' }), TILE);
      await shot(page, 'page-A-hub-1280');
      const y0 = await page.evaluate(() => window.scrollY);
      await page.click(TILE);
      await screenIs(page, 'home');
      await page.waitForTimeout(700);
      const at1280 = await pinned(page);
      const y1 = await page.evaluate(() => window.scrollY);
      check(at1280.ok && y1 === y0, `7. page, save A at 1280: the sheet covers the screen and its panel sits inside it, and the page stayed at ${y0} (${at1280.why}; now ${y1})`);
      await shot(page, 'page-A-home-1280');
      await ctx.close();
    }
  } catch (e) {
    check(false, `page mode stopped: ${String(e).slice(0, 200)}`);
  } finally {
    try { host.kill(); } catch { /* gone */ }
  }
}

await browser.close();
server.close();
if (CONTROL && controlEdits === 0) { console.log(`control cannot run: ${CONTROL} found nothing to edit in what was served`); process.exit(2); }
console.log(`   screenshots in ${SHOTS}, work folder ${WORK}`);
console.log(`playCareerSquad${CONTROL ? ` (control ${CONTROL}, ${controlEdits} edits served)` : ''}: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
