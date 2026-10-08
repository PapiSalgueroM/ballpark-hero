/**
 * Round 1140: a translated page in a real browser.
 *
 * WHY THIS EXISTS. On 2026-10-08 a player in Brazil could not create a Soccer
 * Career, and Try this page again failed the same way. His browser had
 * translated the page. A page translator does not edit text in place: it takes
 * each text node out of the document and leaves
 *   <font style="vertical-align: inherit;"><font ...>the translation</font></font>
 * where it stood, and it keeps doing that to whatever appears later. React
 * still holds the node it made. The next time React removes that node, or
 * inserts something in front of it, the browser throws NotFoundError, the
 * route falls into the error boundary, and the boundary's retry reloads into
 * the same translated page. src/lib/translateGuard.ts makes those two calls
 * tolerate a node that has been moved. Its unit tests prove the mechanism in
 * jsdom. This harness is the other half: the BUILT site, a real browser, the
 * real create flow, and eight more pages, under a translator.
 *
 * THE TRANSLATOR here is a copy of what the real one does, put in with an init
 * script so it survives a reload the way "always translate" does. From 400 ms
 * after the load event, and then after every change through a
 * MutationObserver, each non empty text node under body is REPLACED by
 * font > font > a new text node, and html gets lang="pt" and the class
 * translated-ltr. It leaves alone what the real one leaves alone: script,
 * style, textarea, noscript, title, iframe, svg, code, anything editable, and
 * anything under translate="no" or class notranslate (so a later repair that
 * marks a subtree that way can be tested with this same file). Two modes, and
 * a plain run does both: keep (the words stay) and alter (every piece of text
 * is rewritten inside a pair of marks, so nothing on screen reads as React
 * wrote it). Each swap remembers the words it took in a JS property, nothing
 * the real translator would not write goes into the DOM, and the walk finds
 * its controls by those ORIGINAL words and presses them with the mouse at
 * their position, so it works in both modes.
 *
 * WHAT IT WALKS, at 390 by 844 and at 1280 by 900, each in a fresh context:
 *   /soccer-career  the whole create flow (name, nationality Brazil, position,
 *                   era, the roll, a reroll, Customize your build and Lock in,
 *                   Begin Career), then the career itself until the save is a
 *                   year older, then on to twelve presses in all.
 *   / /club-manager /nba-my-career /nfl-my-career /stadium-tycoon
 *   /college-grid /build-your-xi /front-office
 *                   the first eight things a player can press: the rules
 *                   dialog a first visit opens, then one control after
 *                   another, never the same one twice while another is left.
 *
 * WHAT IT ASSERTS, and none of it is only "the page did not crash":
 *   0. The served build really carries the guard: the entry chunk named in the
 *      served index.html holds the off switch __DUKB_NO_TRANSLATE_GUARD__ and
 *      the guard's console line. A control whose switch is not in the build
 *      proves nothing, so the noguard control refuses to run without it.
 *   1. The translator ran on every page (text nodes swapped, lang="pt"), and
 *      the guard is installed there.
 *   2. The create screen drew. All three picks registered: each select box
 *      holds its pick in its text, Brazil among them. And each pick can be
 *      READ in its box, which is not the same thing: the first line box of
 *      the words has to lie inside everything that clips it. One pick is
 *      known to fail that today and is on KNOWN_HIDDEN_PICKS, a ratchet (see
 *      WHAT THE GUARD DOES NOT FIX below).
 *   3. The create flow REACHED the career: the hub's h1 holds the typed name,
 *      the create form is gone and the save in the browser is his.
 *   4. One season forward: the save is a year older and the hub still stands.
 *   5. On every page the walk really pressed things (at least two controls).
 *   6. The route error boundary never appears. It is matched as an ELEMENT,
 *      the h1 "This page broke" in the box that also holds the Try this page
 *      again button and the link home, never as a loose string.
 *   7. No NotFoundError, as a page error or in the console.
 *   8. Asked directly on every page, on a scratch element outside the
 *      document: a node is swapped out the way a translator swaps it, and
 *      removing it is quiet and inserting before it appends. This is the one
 *      check that does not lean on the app's own copy, so it still means
 *      something the day every string on the walk has a span of its own.
 *
 * WHAT IT COUNTS, as a record and not as a pass or fail: on how many pages
 * the guard printed its console line (it prints once a page), and, through a
 * recorder laid over removeChild and insertBefore that changes nothing and
 * only counts, how many calls on each page named a node its parent no longer
 * owns. Each of those is one crash the page would have had.
 *
 * WHAT THE GUARD DOES NOT FIX, measured here so nobody has to guess. The guard
 * stops the crash. It does not put the page right, and two costs stay:
 *   - A leftover. The translator's copy of a removed text stays where it was.
 *     In the nationality box that copy is the placeholder, the box shows one
 *     line, and the pick (drawn as a block, with its flag) lands on a second
 *     line nobody sees: the box still READS "Choose national..." after Brazil
 *     is chosen, at both sizes. The pick is taken and the flow goes on. The
 *     position and era picks sit on the same line and can be read.
 *   - Stale text. What React writes to a node the translator took never
 *     reaches the screen: the age line still says 16 when he is 18. Counted
 *     as "stale text" for every walk, the most on screen at once.
 * Both end when a changing string gets a span of its own, which is the create
 * path repair and not this round.
 *
 * CONTROLS (PLAY_TRANSLATED_CONTROL=):
 *   noguard      sets window.__DUKB_NO_TRANSLATE_GUARD__ before the app boots,
 *                so the guard is not installed. The run must go RED for the
 *                reason this file exists: the boundary, with a NotFoundError
 *                behind it, on the create flow, at the nationality step. It
 *                then presses Try this page again and shows the same step
 *                break again. It also asks check 8's question on every page
 *                and must get NotFoundError both times, which keeps this
 *                control firing after the create flow's strings are wrapped.
 *                Exit 1 is the control firing. Exit 2 means it could not run
 *                or did not fire, and proves nothing. It also walks the other
 *                eight pages, which is the measurement of how wide the damage
 *                was without the guard.
 *   notranslate  the same walk with the translator off. It must stay green
 *                AND count zero console lines and zero moved nodes: the guard
 *                does nothing on an ordinary page.
 *
 * Run: npm run build, then ENGINES=chromium node scripts/playTranslatedPage.mjs
 * (Chromium only: it is where page translation lives). BASE names the server,
 * default http://localhost:4173; when nothing answers there and dist/ exists
 * it serves dist/ itself through scripts/lib/hostLikeServer.mjs. ONLY=/route
 * (comma separated, MSYS_NO_PATHCONV=1 under Git Bash), VIEWS=phone,desktop
 * and MODES=keep,alter scope a run, VERBOSE=1 prints every step, SHOTS names a
 * folder for screenshots. Three walks run side by side (JOBS=1 for one at a
 * time), each with its own context and its own seeded dice, and every wait is
 * for something on the page (the translator has caught up, the button is
 * back), so a slow machine is a slow run and not a red one. PAGE_PRESSES and
 * CAREER_PRESSES deepen a walk. Every request that is not the local server is
 * aborted (the database host by its own rule, on every page) except the flag
 * images, which are answered with one local pixel.
 *
 * Green is the closing "playTranslatedPage: N checks, 0 failed" line AND exit 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const env = process.env;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const BASE = (env.BASE || env.SWEEP_BASE || 'http://localhost:4173').replace(/\/+$/, '');
const CONTROL = env.PLAY_TRANSLATED_CONTROL || '';
const KNOWN_CONTROLS = ['noguard', 'notranslate'];
if (CONTROL && !KNOWN_CONTROLS.includes(CONTROL)) {
  console.error(`PLAY_TRANSLATED_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN_CONTROLS.join(', ')})`);
  process.exit(2);
}
const V = !!env.VERBOSE;
const SEED = Number(env.SEED || 20261008);
const SIM_DELAY = Number(env.SIM_DELAY ?? 150);
const SIM_START = Number(env.SIM_START ?? 400);
const CAREER_PRESSES = Number(env.CAREER_PRESSES ?? 12);
const PAGE_PRESSES = Number(env.PAGE_PRESSES ?? 8);
const SHOTS = env.SHOTS || (env.RC_OUT ? path.join(env.RC_OUT, `translated-${CONTROL || 'plain'}`) : '');
const OUT_JSON = env.OUT_JSON || (env.RC_OUT ? path.join(env.RC_OUT, `playTranslatedPage-${CONTROL || 'plain'}.json`) : '');

/* Git Bash rewrites an env value like /club-manager into C:/Program Files/Git/club-manager: undo that. */
const unGitBash = s => s.replace(/^[A-Za-z]:[\\/].*?[\\/]Git(?=[\\/]|$)/, '').replace(/\\/g, '/') || '/';
const CREATE_ROUTE = '/soccer-career';
const ALL_ROUTES = [CREATE_ROUTE, '/', '/club-manager', '/nba-my-career', '/nfl-my-career', '/stadium-tycoon', '/college-grid', '/build-your-xi', '/front-office'];
const ONLY = env.ONLY ? env.ONLY.split(',').map(s => unGitBash(s.trim())).filter(Boolean) : null;
const ROUTES = ONLY ? ALL_ROUTES.filter(r => ONLY.includes(r)) : ALL_ROUTES;
const VIEW_SIZES = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 900 } };
const VIEWS = (env.VIEWS || 'phone,desktop').split(',').map(s => s.trim()).filter(v => VIEW_SIZES[v]);
/* notranslate has one mode, "off". Everything else runs keep and alter. */
const MODES = CONTROL === 'notranslate' ? ['off'] : (env.MODES || 'keep,alter').split(',').map(s => s.trim()).filter(m => m === 'keep' || m === 'alter');
if (!ROUTES.length || !VIEWS.length || !MODES.length) {
  console.error(`nothing to walk: ONLY=${env.ONLY || ''} VIEWS=${env.VIEWS || ''} MODES=${env.MODES || ''}. NOT CHECKED.`);
  process.exit(2);
}

const PLAYER = 'Joao Teste';
const NAT = env.NAT || 'Brazil';
const POS = env.POS || 'Striker';
const ERA = env.ERA || 'Current era';
const PICKS = [['nationality', NAT], ['position', POS], ['era', ERA]];
/* A RATCHET, not a clean sheet. With the guard alone the nationality box still READS "Choose
   national..." after a pick on a translated page: the pick is taken, the flow goes on, the words
   are hidden (see boxReads). The cure is a span around the placeholder, which is the create path
   repair and not this round. The day that lands this check goes red and says so: take the name off
   this list, and from then on every pick must be readable. Anything not listed fails today. */
const KNOWN_HIDDEN_PICKS = ['nationality'];
const BOUNDARY_WORDS = 'This page broke';
const RETRY_WORDS = 'Try this page again';
const SWITCH = '__DUKB_NO_TRANSLATE_GUARD__';
const GUARD_LINE = 'a node this page no longer owns';

const failed = [];
let checksRun = 0;
/* Walks run side by side, so each one keeps its own lines and prints them together when it ends. */
function checkLine(name, ok, detail, out = console.log) {
  checksRun += 1;
  const line = `${name}${detail ? ': ' + detail : ''}`;
  if (ok) { out(`  PASS  ${line}`); return true; }
  failed.push(line);
  out(`  FAIL  ${line}`);
  return false;
}

let server = null;
let browser = null;
async function stop(code) {
  try { if (browser) await browser.close(); } catch { /* already gone */ }
  if (server) server.kill();
  process.exit(code);
}

/* ------------------------------------------------------------------ *
 * The server, and check 0: the build that is served carries the guard.
 * ------------------------------------------------------------------ */
async function answers() {
  try { const r = await fetch(BASE + '/', { signal: AbortSignal.timeout(4000) }); return r.ok; } catch { return false; }
}
if (!(await answers())) {
  const u = new URL(BASE);
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (!local || !fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error(`nothing answers at ${BASE}${local ? ' and dist/index.html is missing: run npm run build first' : ''}. NOT CHECKED.`);
    process.exit(2);
  }
  server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(u.port || 80)], { stdio: 'ignore' });
  let up = false;
  for (let i = 0; i < 40 && !up; i += 1) { await new Promise(r => setTimeout(r, 250)); up = await answers(); }
  if (!up) { console.error(`could not serve dist/ at ${BASE}. NOT CHECKED.`); await stop(2); }
}

console.log(`playTranslatedPage: ${BASE}${server ? ' (dist/ served by this run)' : ''}, ${ROUTES.length} page(s), views ${VIEWS.join(' and ')}, text ${MODES.join(' and ')}${CONTROL ? `, CONTROL=${CONTROL}` : ''}`);

async function served(urlPath) {
  const r = await fetch(BASE + urlPath, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${urlPath} answered ${r.status}`);
  return r.text();
}
const indexHtml = await served('/');
const scriptTags = [...indexHtml.matchAll(/<script\b[^>]*>/g)].map(m => m[0]);
const entryTag = scriptTags.find(t => /type="module"/.test(t) && /\bsrc="[^"]+\.js"/.test(t)) || '';
const ENTRY = (entryTag.match(/\bsrc="([^"]+\.js)"/) || [])[1] || '';
let entryText = '';
if (ENTRY) { try { entryText = await served(ENTRY); } catch (e) { console.log(`  the entry ${ENTRY} could not be fetched: ${String(e).slice(0, 80)}`); } }
const switchInBuild = entryText.includes(SWITCH);
checkLine(`0. the served entry chunk (${ENTRY || 'none named in index.html'}) holds the guard's off switch ${SWITCH}`, switchInBuild);
checkLine('0. the served entry chunk holds the guard\'s console line', entryText.includes(GUARD_LINE));
if (CONTROL === 'noguard' && !switchInBuild) {
  console.error('control "noguard" cannot run: its switch is not in the served build, so setting it would change nothing. NOT CHECKED.');
  await stop(2);
}

/* ------------------------------------------------------------------ *
 * How the career is walked once it exists: the flagship walker's own list
 * of advancing actions and its skip rule, read from that file's TEXT (the
 * file runs on import) so the two walks cannot drift apart. Round 1045's
 * playSeasonCentre reads them the same way.
 * ------------------------------------------------------------------ */
function walkerRule() {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/playSoccerCareer.mjs'), 'utf8');
  const at = src.indexOf('const ACTIONS = [');
  const end = src.indexOf('];', at);
  if (at < 0 || end < 0) throw new Error('cannot find ACTIONS in playSoccerCareer.mjs');
  const body = src.slice(at, end).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const actions = [...body.matchAll(/'([^']+)'/g)].map(m => m[1]);
  const skipLine = src.split('\n').find(l => l.startsWith('const SKIP = /'));
  if (!skipLine) throw new Error('cannot find SKIP in playSoccerCareer.mjs');
  const skip = skipLine.slice(skipLine.indexOf('/') + 1, skipLine.lastIndexOf('/'));
  return { actions, skip };
}
const WALK = walkerRule();
if (!WALK.actions.includes('Next Year') || !WALK.actions.includes('Next Season') || !WALK.skip.includes('Retire')) {
  console.error('the walker rule read from playSoccerCareer.mjs is not the one this harness expects. NOT CHECKED.');
  await stop(2);
}
/* What neither walk presses: ways off the page, the account, the theme, and the help trigger on a
   page whose rules are not the point. The first visit rules dialog is pressed, it opens by itself. */
const NEVER = 'Report a bug|Light mode|Dark mode|Cookie|Sign up|Sign in|Log in|Log out|Essential only|Share|Copy|Install|Delete|Reset|New Career|Start over|Retire|\\bBack\\b|^Home$';

/* ------------------------------------------------------------------ *
 * Page side. Runs before any page code, on every load and reload.
 * ------------------------------------------------------------------ */
function pageInit(cfg) {
  /* seeded Math.random, so a run can be repeated */
  let t = cfg.seed >>> 0;
  Math.random = () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  /* the cookie choice is already made, the way every browser harness here starts */
  try { localStorage.setItem('cookie-consent', 'essential'); } catch (e) { /* storage blocked */ }
  /* THE CONTROL'S SWITCH: the guard reads this before it installs itself */
  if (cfg.noguard) window.__DUKB_NO_TRANSLATE_GUARD__ = true;

  /* the words React rendered, whatever the translator has done to them since */
  function origText(node) {
    if (!node) return '';
    if (node.nodeType === 3) return node.nodeValue || '';
    if (node.nodeType !== 1) return '';
    if (node.__simOrig !== undefined) return node.__simOrig;
    let s = '';
    for (const c of node.childNodes) s += origText(c);
    return s;
  }
  const taken = new WeakSet();
  const w = { origText, moved: [], simCount: 0, sweeps: 0, simStarted: false, counting: false };
  window.__walk = w;

  /* THE RECORDER. It changes nothing: it counts a call that names a node its parent no longer owns,
     then hands the call on to whatever was there, the guard or the browser. Laid on top again
     whenever something else has been put over it, so the guard can never hide a call from it. */
  let myRemove = null;
  let myInsert = null;
  const brief = n => (n && n.nodeType === 3 ? (n.nodeValue || '') : origText(n)).replace(/\s+/g, ' ').trim().slice(0, 60);
  const tagOf = n => (n && n.nodeType === 1 ? n.tagName.toLowerCase() : n ? '#' + n.nodeType : '');
  function layRecorder() {
    if (Node.prototype.removeChild !== myRemove) {
      const under = Node.prototype.removeChild;
      myRemove = function (child) {
        if (child && child.parentNode !== this) w.moved.push({ op: 'removeChild', parent: tagOf(this), node: brief(child), byTranslator: taken.has(child) });
        return under.apply(this, arguments);
      };
      Node.prototype.removeChild = myRemove;
    }
    if (Node.prototype.insertBefore !== myInsert) {
      const under = Node.prototype.insertBefore;
      myInsert = function (node, ref) {
        if (ref && ref.parentNode !== this) w.moved.push({ op: 'insertBefore', parent: tagOf(this), node: brief(ref), byTranslator: taken.has(ref) });
        return under.apply(this, arguments);
      };
      Node.prototype.insertBefore = myInsert;
    }
    w.counting = true;
  }

  /* ---------------- the translator ---------------- */
  const SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, TITLE: 1, IFRAME: 1, SVG: 1, CODE: 1 };
  const made = new WeakSet();
  function translate(text) {
    if (cfg.text !== 'alter') return text;
    const lead = text.match(/^\s*/)[0];
    const trail = text.match(/\s*$/)[0];
    return lead + '«' + text.trim() + '»' + trail;
  }
  w.shown = translate;
  function eligible(node) {
    if (made.has(node)) return false;
    if (!node.nodeValue || !node.nodeValue.trim()) return false;
    if (!node.isConnected) return false;
    let e = node.parentElement;
    if (!e || !document.body || !document.body.contains(e)) return false;
    for (; e; e = e.parentElement) {
      if (SKIP_TAGS[e.tagName.toUpperCase()]) return false;
      if (e.getAttribute('translate') === 'no') return false;
      if (e.classList && e.classList.contains('notranslate')) return false;
      if (e.isContentEditable) return false;
    }
    return true;
  }
  function swap(node) {
    const outer = document.createElement('font');
    outer.setAttribute('style', 'vertical-align: inherit;');
    const inner = document.createElement('font');
    inner.setAttribute('style', 'vertical-align: inherit;');
    const fresh = document.createTextNode(translate(node.nodeValue));
    made.add(fresh);
    inner.appendChild(fresh);
    outer.appendChild(inner);
    outer.__simOrig = node.nodeValue;
    outer.__simNode = node; // the node React still holds: what React writes to it later never reaches the screen
    taken.add(node);
    node.parentNode.replaceChild(outer, node);
    w.simCount += 1;
  }
  function sweep() {
    layRecorder();
    w.sweeps += 1;
    if (!cfg.translate || !document.body) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const todo = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (eligible(n)) todo.push(n);
    for (const n of todo) if (n.isConnected) swap(n);
  }
  let timer = null;
  w.busy = () => timer !== null; // a change has been seen and its sweep has not run yet
  function schedule() {
    if (timer !== null) return;
    timer = setTimeout(() => { timer = null; sweep(); }, cfg.simDelay);
  }
  function start() {
    if (cfg.translate) {
      document.documentElement.setAttribute('lang', 'pt');
      document.documentElement.classList.add('translated-ltr');
    }
    sweep();
    w.simStarted = true;
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }
  window.addEventListener('load', () => setTimeout(start, cfg.simStart));
}

/* ------------------------------------------------------------------ *
 * Node side: one fresh context for each walk.
 * ------------------------------------------------------------------ */
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', new URL(BASE).hostname]);
browser = await chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

async function openWalk(view, mode) {
  const ctx = await browser.newContext({ viewport: VIEW_SIZES[view], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  await ctx.addInitScript(pageInit, {
    seed: SEED, translate: mode !== 'off', text: mode, simDelay: SIM_DELAY, simStart: SIM_START, noguard: CONTROL === 'noguard',
  });
  const w = { ctx, page: null, blocked: new Set(), dbBlocked: 0, guardLines: 0, notFound: [], consoleErrors: [], pageErrors: [] };
  /* nothing leaves this machine: flags get one local pixel, everything else that is not the server is aborted */
  await ctx.route('**/*', route => {
    let host = '';
    try { host = new URL(route.request().url()).hostname; } catch { /* data: and friends */ }
    if (!host || LOCAL_HOSTS.has(host)) return route.continue();
    if (host.endsWith('flagcdn.com')) return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
    w.blocked.add(host);
    return route.abort();
  });
  /* the database host by its own rule, registered last so it is asked first: production is off limits */
  await ctx.route(/supabase\.co/, route => { w.dbBlocked += 1; return route.abort(); });
  const page = await ctx.newPage();
  w.page = page;
  page.on('console', m => {
    const text = m.text();
    if (m.type() === 'warning' && text.startsWith('[dukb]') && text.includes(GUARD_LINE)) w.guardLines += 1;
    if (m.type() !== 'error') return;
    w.consoleErrors.push(text.slice(0, 300));
    if (/NotFoundError|not a child of this node/.test(text)) w.notFound.push('console: ' + text.slice(0, 200));
  });
  page.on('pageerror', e => {
    const text = String((e && (e.stack || e.message)) || e);
    w.pageErrors.push(text.slice(0, 300));
    if (/NotFoundError|not a child of this node/.test(text)) w.notFound.push('pageerror: ' + text.slice(0, 200));
  });
  return w;
}

const sleep = (page, ms) => page.waitForTimeout(ms);
/* After a press: a beat for React, then until the translator has caught up with what the press drew
   (nothing waiting to be swept, or two sweeps gone by on a page that never sits still). A slow
   machine makes this a slower walk, never a look at a page the translator has not reached yet. */
async function settle(page) {
  const before = await page.evaluate(() => (window.__walk ? window.__walk.sweeps : 0)).catch(() => 0);
  await sleep(page, 380);
  await page.waitForFunction(k => !window.__walk || !window.__walk.busy || !window.__walk.busy() || window.__walk.sweeps >= k + 2, before, { timeout: 4000 }).catch(() => {});
  await sleep(page, 40);
}
/* The translator has started on this document (or, with it off, the recorder is down). */
const started = page => page.waitForFunction(() => !!window.__walk && window.__walk.simStarted, null, { timeout: 20000 }).catch(() => {});

/* What the page looks like right now. The boundary is matched as the element RouteErrorBoundary
   draws: its h1, in a box that also holds its retry button and its link home. */
async function probe(page) {
  return page.evaluate(([boundaryWords, retryWords]) => {
    const w = window.__walk;
    const text = el => w.origText(el).replace(/\s+/g, ' ').trim();
    let boundary = false;
    for (const h of document.querySelectorAll('h1')) {
      if (text(h) !== boundaryWords || !h.parentElement) continue;
      const box = h.parentElement;
      if ([...box.querySelectorAll('button')].some(b => text(b) === retryWords) && box.querySelector('a[href="/"]')) boundary = true;
    }
    let save = null;
    try { const raw = localStorage.getItem('soccerCareerSave'); save = raw ? JSON.parse(raw) : null; } catch (e) { save = null; }
    const root = document.getElementById('root');
    const stale = [...document.querySelectorAll('font')].filter(f => f.__simNode && f.__simNode.nodeValue !== f.__simOrig);
    return {
      boundary,
      path: location.pathname,
      h1: [...document.querySelectorAll('h1')].map(text).slice(0, 3),
      rootChars: root ? (root.innerText || '').length : -1,
      creation: !!document.getElementById('pname'),
      fonts: document.querySelectorAll('font').length,
      swapped: w.simCount, started: w.simStarted, counting: w.counting,
      lang: document.documentElement.getAttribute('lang') || '',
      marked: document.documentElement.classList.contains('translated-ltr'),
      guardOn: Node.prototype.__dukbTranslateGuard === true,
      moved: w.moved.length,
      movedByTranslator: w.moved.filter(m => m.byTranslator).length,
      stale: stale.length,
      staleSample: stale.slice(0, 4).map(f => ({ screen: f.__simOrig.trim().slice(0, 28), react: (f.__simNode.nodeValue || '').trim().slice(0, 28), around: text(f.parentElement).slice(0, 60) })),
      save: save ? { phase: save.phase || '', age: save.age, name: save.playerName || '', nat: save.nationality || '' } : null,
    };
  }, [BOUNDARY_WORDS, RETRY_WORDS]);
}

/* The first visible element matching selector whose ORIGINAL words (or aria-label) match. It is
   scrolled into view and its centre comes back, with whether something else lies on top there. */
async function locate(page, selector, wanted, how = 'includes', nth = 0) {
  return page.evaluate(([sel, want, mode, n]) => {
    const w = window.__walk;
    const label = el => w.origText(el).replace(/\s+/g, ' ').trim() || (el.getAttribute('aria-label') || '').trim();
    const all = [...document.querySelectorAll(sel)].filter(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && cs.display !== 'none';
    });
    const hits = all.filter(el => {
      if (want === null) return true;
      const o = label(el);
      if (mode === 'exact') return o === want;
      if (mode === 'starts') return o.startsWith(want);
      return o.includes(want);
    });
    const el = hits[n];
    if (!el) return { found: false, candidates: all.slice(0, 10).map(e => label(e).slice(0, 30)) };
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    window.__walkTarget = el;
    return {
      found: true, x, y, label: label(el).slice(0, 60), shown: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true',
      covered: !(top && (top === el || el.contains(top) || top.contains(el))),
    };
  }, [selector, wanted, how, nth]);
}
/* A real mouse press at the element's position. Only when something else lies over that point (a
   sticky bar after the scroll) does it fall back to the element's own click, and it says so. */
async function press(page, selector, wanted, how, nth) {
  const first = await locate(page, selector, wanted, how, nth);
  if (!first.found) return { ok: false, why: 'not found', candidates: first.candidates };
  if (first.disabled) return { ok: false, why: 'disabled', label: first.label };
  await sleep(page, 140); // let a smooth scroll come to rest
  const at = await locate(page, selector, wanted, how, nth);
  if (!at.found) return { ok: false, why: 'gone after the scroll' };
  if (at.covered) {
    await page.evaluate(() => { if (window.__walkTarget) window.__walkTarget.click(); });
    return { ok: true, label: at.label, shown: at.shown, by: 'its own click (covered)' };
  }
  await page.mouse.click(at.x, at.y);
  return { ok: true, label: at.label, shown: at.shown, by: 'mouse' };
}
async function pickCombo(page, mode, index, wanted) {
  const open = await press(page, '[role="combobox"]', null, 'includes', index);
  if (!open.ok) return { ok: false, why: `combobox ${index} ${open.why}` };
  try { await page.waitForSelector('[role="option"]', { timeout: 8000 }); } catch { return { ok: false, why: `no options opened for combobox ${index}` }; }
  await settle(page, mode);
  let hit = await press(page, '[role="option"]', wanted, 'exact');
  if (!hit.ok) hit = await press(page, '[role="option"]', wanted, 'includes');
  if (!hit.ok) return { ok: false, why: `option "${wanted}" ${hit.why}`, candidates: hit.candidates };
  await page.waitForSelector('[role="option"]', { state: 'detached', timeout: 4000 }).catch(() => {});
  return { ok: true, label: hit.label, shown: hit.shown };
}

/* What a select box says after a pick, two ways. "has": the pick is in the box's text, so the choice
   registered. "visible": the first line box of those words lies inside everything that clips it, so
   a person can actually read it. They differ, and that difference is the point: with the guard the
   translator's copy of the placeholder stays in the box, the box shows one line, and a pick drawn
   as a block (the nationality, with its flag) lands on a second line nobody can see. */
async function boxReads(page, index, wanted) {
  return page.evaluate(([i, want]) => {
    const trig = document.querySelectorAll('[role="combobox"]')[i];
    if (!trig) return null;
    const shown = (trig.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const tw = document.createTreeWalker(trig, NodeFilter.SHOW_TEXT);
    let node = null;
    for (let n = tw.nextNode(); n; n = tw.nextNode()) if ((n.nodeValue || '').includes(want)) { node = n; break; }
    if (!node) return { shown, has: false, visible: false };
    const range = document.createRange();
    const from = node.nodeValue.indexOf(want);
    range.setStart(node, from);
    range.setEnd(node, from + want.length);
    const r = range.getClientRects()[0];
    let visible = !!r && r.width > 1 && r.height > 1;
    for (let e = node.parentElement; e && visible; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const c = e.getBoundingClientRect();
        if (r.top < c.top - 1 || r.bottom > c.bottom + 1 || r.left < c.left - 1 || r.right > c.right + 1) visible = false;
      }
      if (e === trig) break;
    }
    return { shown, has: true, visible };
  }, [index, wanted]);
}

/* The two patched calls, tried directly in this browser on this build, on a scratch element that is
   never in the document: a node is swapped out the way a translator swaps it, then the page asks
   for it to be removed and for something to be put in front of it. With the guard both are quiet.
   Without it both throw NotFoundError, whatever the app's own copy looks like by then, which is
   what keeps the noguard control alive after the create flow's strings get spans of their own. */
async function probeGuard(page) {
  return page.evaluate(() => {
    const out = { remove: '', insert: '' };
    const box = document.createElement('div');
    const held = document.createTextNode('held by the page');
    box.appendChild(held);
    const font = document.createElement('font');
    font.textContent = 'moved by a translator';
    box.replaceChild(font, held);
    try { box.removeChild(held); out.remove = font.parentNode === box ? 'quiet' : 'lost'; } catch (e) { out.remove = e.name; }
    const fresh = document.createElement('b');
    try { box.insertBefore(fresh, held); out.insert = fresh.parentNode === box ? 'quiet' : 'lost'; } catch (e) { out.insert = e.name; }
    return out;
  }).catch(e => ({ remove: 'no answer', insert: String(e).slice(0, 60) }));
}

/* The next thing a player would press. An open dialog, list or menu comes first (the rules dialog a
   first visit opens, the list a select just opened). Then, in the career, the flagship walker's own
   advancing actions in its own order. Otherwise the control pressed least so far, in page order, so
   eight presses are eight different controls wherever the page has them. */
async function advance(page, actions, skipSrc, counts) {
  const pick = await page.evaluate(([acts, skipS, neverS, seen]) => {
    const w = window.__walk;
    const label = el => w.origText(el).replace(/\s+/g, ' ').trim() || (el.getAttribute('aria-label') || '').trim();
    const vis = el => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && cs.display !== 'none';
    };
    const skip = skipS ? new RegExp(skipS) : null;
    const never = new RegExp(neverS, 'i');
    const overlays = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],[role="listbox"],[role="menu"]')].filter(vis);
    const overlay = overlays[overlays.length - 1] || null;
    const scope = overlay || document.getElementById('dukb-main') || document.getElementById('root') || document.body;
    const usable = [...scope.querySelectorAll('button,[role="option"],[role="menuitem"],[role="tab"],[role="combobox"],[role="radio"],[role="switch"]')].filter(el => {
      if (!vis(el) || el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
      if (!overlay && el.closest('header,footer')) return false;
      const o = label(el);
      return !!o && !never.test(o) && !(skip && skip.test(o));
    });
    let el = null;
    if (acts) for (const a of acts) { el = usable.find(b => label(b).startsWith(a)); if (el) break; }
    if (!el && overlay) {
      const kind = overlay.getAttribute('role');
      if (kind === 'listbox' || kind === 'menu') el = usable[1] || usable[0] || null;
      else el = usable.find(b => /^(let's play|got it|start|play|continue|begin|ok|okay|done|next|close)/i.test(label(b))) || null;
    }
    if (!el) {
      /* down the page from the control pressed last (a toggle that renames itself is still that
         control), round to the top again, and among those the one pressed least */
      const last = window.__walkTarget;
      let pool = usable;
      if (last && last.isConnected && scope.contains(last)) {
        const below = usable.filter(b => b !== last && !last.contains(b) && (last.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
        pool = below.concat(usable.filter(b => !below.includes(b)));
      }
      let best = Infinity;
      for (const b of pool) { const c = seen[label(b)] || 0; if (c < best) { best = c; el = b; } }
    }
    if (!el) return { found: false, overlay: overlay ? overlay.getAttribute('role') : '' };
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    window.__walkTarget = el;
    return { found: true, key: label(el), label: label(el).slice(0, 60), overlay: overlay ? overlay.getAttribute('role') : '', options: usable.slice(0, 8).map(b => label(b).slice(0, 22)) };
  }, [actions, skipSrc, NEVER, counts]);
  if (!pick.found) {
    if (pick.overlay) { await page.keyboard.press('Escape'); return { ok: true, label: `Escape (an open ${pick.overlay} with nothing to press)`, by: 'keyboard' }; }
    return { ok: false, why: 'no usable control on the page' };
  }
  await sleep(page, 140); // let a smooth scroll come to rest
  const at = await page.evaluate(() => {
    const el = window.__walkTarget;
    if (!el || !el.isConnected) return null;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return { x, y, covered: !(top && (top === el || el.contains(top))) };
  });
  if (!at) return { ok: false, why: `"${pick.label}" was gone after the scroll` };
  counts[pick.key] = (counts[pick.key] || 0) + 1;
  if (at.covered) {
    await page.evaluate(() => { if (window.__walkTarget) window.__walkTarget.click(); });
    return { ok: true, label: pick.label, by: 'its own click (covered)', options: pick.options };
  }
  await page.mouse.click(at.x, at.y);
  return { ok: true, label: pick.label, by: 'mouse', options: pick.options };
}

/* ------------------------------------------------------------------ *
 * One walk. Every step is followed by a look at the page; the walk stops
 * at the boundary, or where it could not find what it came to press.
 * ------------------------------------------------------------------ */
function newRecord(route, view, mode, pass, out) {
  return { route, view, mode, pass, out, steps: [], boundaryAt: null, stuckAt: null, pressed: [], state: null, first: null, maxStale: 0, staleSample: [] };
}
let shotCount = 0;
async function shot(page, rec, name) {
  if (!SHOTS) return;
  if (name !== 'BOUNDARY' && name !== 'STUCK' && (rec.boundaryAt || rec.stuckAt)) return; // that walk already has its picture
  shotCount += 1;
  const file = `${rec.route === '/' ? 'home' : rec.route.slice(1)}-${rec.view}-${rec.mode}${rec.pass ? '-' + rec.pass : ''}-${name}.png`;
  await page.screenshot({ path: path.join(SHOTS, file), fullPage: false }).catch(() => {});
}
async function step(W, rec, name, fn) {
  if (rec.boundaryAt || rec.stuckAt) return false;
  let action;
  try { action = await fn(); } catch (e) { action = { ok: false, why: 'threw: ' + String(e).split('\n')[0].slice(0, 140) }; }
  await settle(W.page, rec.mode);
  let state = null;
  for (let i = 0; i < 3 && !state; i += 1) {
    try { state = await probe(W.page); } catch { await sleep(W.page, 500); } // a reload was in flight
  }
  if (state) {
    rec.state = state;
    if (!rec.first) rec.first = state;
    if (state.stale > rec.maxStale) { rec.maxStale = state.stale; rec.staleSample = state.staleSample; }
  }
  const did = action && (action.label || action.why) ? String(action.label || action.why) : '';
  if (action && action.ok && action.label) rec.pressed.push(action.label);
  rec.steps.push({ name, ok: !(action && action.ok === false), did: did.slice(0, 70), by: (action && action.by) || '', boundary: !!(state && state.boundary), moved: state ? state.moved : null, stale: state ? state.stale : null, phase: state && state.save ? state.save.phase : '', age: state && state.save ? state.save.age : null });
  if (V) rec.out(`        ${state && state.boundary ? 'XX' : action && action.ok === false ? '??' : 'ok'} ${name}${did ? ' [' + did.slice(0, 40) + ']' : ''}${state ? ` moved=${state.moved} stale=${state.stale} fonts=${state.fonts}${state.save ? ` ${state.save.phase} ${state.save.age}` : ''}` : ' (no look at the page)'}`);
  if (state && state.boundary) { rec.boundaryAt = name; await shot(W.page, rec, 'BOUNDARY'); return false; }
  if (action && action.ok === false) { rec.stuckAt = `${name}: ${action.why}`; return false; }
  return true;
}

async function walkCreate(W, rec) {
  const { page } = W;
  const mode = rec.mode;
  await step(W, rec, 'the create screen draws', async () => {
    await page.waitForSelector('#pname', { timeout: 30000 });
    await started(page);
    await sleep(page, 500);
    return { ok: true };
  });
  rec.createDrawn = !!(rec.first && rec.first.creation);
  await step(W, rec, 'type the name', async () => { await page.fill('#pname', PLAYER); return { ok: true }; });
  rec.boxes = {};
  for (let i = 0; i < PICKS.length; i += 1) {
    const [what, want] = PICKS[i];
    await step(W, rec, `choose ${what} ${want}`, async () => {
      const r = await pickCombo(page, mode, i, want);
      if (!r.ok) return r;
      await settle(page, mode);
      rec.boxes[what] = await boxReads(page, i, want).catch(() => null);
      return r;
    });
  }
  await shot(page, rec, '1-picks');
  /* The roll runs for about two seconds and the button is disabled meanwhile. Each of these waits for
     what the next step needs, by its original words, so a slow machine is a slow walk and not a red. */
  const ready = (words, ms) => page.waitForFunction(([t]) => [...document.querySelectorAll('button')].some(b => !b.disabled && window.__walk.origText(b).includes(t)), [words], { timeout: ms }).catch(() => {});
  await step(W, rec, 'Generate Starting Potential', async () => { const r = await press(page, 'button', 'Generate Starting Potential'); if (r.ok) await ready('Roll again', 15000); return r; });
  await step(W, rec, 'Roll again', async () => { const r = await press(page, 'button', 'Roll again'); if (r.ok) { await sleep(page, 600); await ready('Customize your build', 15000); } return r; });
  await step(W, rec, 'Customize your build', async () => { const r = await press(page, 'button', 'Customize your build'); if (r.ok) await ready('Lock in', 10000); return r; });
  await step(W, rec, 'Lock in build', async () => { const r = await press(page, 'button', 'Lock in'); if (r.ok) await ready('Begin Career', 10000); return r; });
  await step(W, rec, 'Begin Career', async () => {
    const r = await press(page, 'button', 'Begin Career');
    if (r.ok) { await page.waitForFunction(() => !document.getElementById('pname'), null, { timeout: 15000 }).catch(() => {}); await sleep(page, 1200); }
    return r;
  });
  const s = rec.state;
  const begun = !rec.boundaryAt && !rec.stuckAt && !!s;
  rec.reached = begun && !s.creation && s.h1.some(h => h.includes(PLAYER)) && !!s.save && s.save.name === PLAYER;
  rec.reachedDetail = begun ? `h1 ${JSON.stringify(s.h1[0] || '')}, create form ${s.creation ? 'still up' : 'gone'}, save ${s.save ? `${s.save.name}, ${s.save.nat}, ${s.save.phase}, age ${s.save.age}` : 'none'}` : (rec.boundaryAt ? `the boundary took the page at "${rec.boundaryAt}"` : `stuck at ${rec.stuckAt}`);
  await shot(page, rec, '2-begun');
  if (!rec.reached) return;
  rec.startAge = s.save.age;
  const counts = {};
  for (let i = 1; i <= CAREER_PRESSES; i += 1) {
    const ok = await step(W, rec, `career press ${i}`, async () => { const r = await advance(page, WALK.actions, WALK.skip, counts); await sleep(page, 450); return r; });
    const now = rec.state;
    if (rec.seasonAt === undefined && now && now.save && typeof now.save.age === 'number' && now.save.age >= rec.startAge + 1) {
      rec.seasonAt = i;
      rec.seasonDetail = `age ${rec.startAge} to ${now.save.age} on press ${i}, h1 ${JSON.stringify(now.h1[0] || '')}, phase ${now.save.phase}`;
      rec.hubStands = !now.boundary && now.h1.some(h => h.includes(PLAYER));
    }
    if (!ok) break;
  }
  const end = rec.state;
  if (rec.seasonDetail && end && end.save) rec.seasonDetail += `; the walk went on to age ${end.save.age}, phase ${end.save.phase}`;
  await shot(page, rec, '3-career');
}

async function walkPage(W, rec) {
  const { page } = W;
  await step(W, rec, 'the page draws', async () => {
    await page.waitForFunction(() => {
      if (document.getElementById('dukb-boot')) return false;
      const root = document.getElementById('root');
      return !!root && [...root.querySelectorAll('button,a[href]')].some(b => { const r = b.getBoundingClientRect(); return r.width > 2 && r.height > 2; });
    }, null, { timeout: 30000 });
    await started(page);
    await sleep(page, 700);
    return { ok: true };
  });
  const counts = {};
  for (let i = 1; i <= PAGE_PRESSES; i += 1) {
    const ok = await step(W, rec, `press ${i}`, () => advance(page, null, null, counts));
    if (!ok) break;
  }
  if (env.SHOTS) await shot(page, rec, 'end');
}

/* What the report says happened to the player: Try this page again reloads into the same
   translated page and the same step breaks again. Only ever runs after a boundary. */
async function retryAfterBoundary(W, rec) {
  const { page } = W;
  const loaded = page.waitForEvent('load', { timeout: 20000 }).then(() => true).catch(() => false);
  const r = await press(page, 'button', RETRY_WORDS, 'exact');
  const reloaded = r.ok ? await loaded : false;
  const again = newRecord(rec.route, rec.view, rec.mode, 'retry', rec.out);
  if (reloaded) await walkCreate(W, again);
  return { pressed: r.ok, reloaded, boundaryAt: again.boundaryAt, stuckAt: again.stuckAt, reached: !!again.reached };
}

/* ------------------------------------------------------------------ *
 * The walks, and the checks on each.
 * ------------------------------------------------------------------ */
async function runWalk({ mode, view, route }, out) {
  const tag = `${route} ${view} ${mode}`;
  const check = (name, ok, detail) => checkLine(name, ok, detail, out);
  out(`\n${tag}`);
  const W = await openWalk(view, mode);
  const rec = newRecord(route, view, mode, '', out);
  let retry = null;
  try {
    await W.page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
    if (route === CREATE_ROUTE) await walkCreate(W, rec); else await walkPage(W, rec);
    rec.movedList = await W.page.evaluate(() => (window.__walk ? window.__walk.moved.slice(0, 60) : [])).catch(() => []);
    /* Both counts are closed BEFORE the direct question: the recorder would count its two calls, and
       the guard prints its once a page line for them on a page that never needed it. */
    rec.guardLines = W.guardLines;
    rec.direct = await probeGuard(W.page);
    if (route === CREATE_ROUTE && rec.boundaryAt) retry = await retryAfterBoundary(W, rec);
  } catch (e) {
    if (!rec.stuckAt && !rec.boundaryAt) rec.stuckAt = 'the walk threw: ' + String(e).split('\n')[0].slice(0, 140);
  }
  if (rec.stuckAt) { await shot(W.page, rec, 'STUCK'); out(`        stuck at ${rec.stuckAt}`); }
  const last = rec.state || {};
  const first = rec.first || {};
  const row = {
    route, view, mode, steps: rec.steps.length, boundaryAt: rec.boundaryAt, stuckAt: rec.stuckAt,
    notFound: W.notFound.length, notFoundSample: W.notFound[0] || '',
    guardLines: rec.guardLines ?? W.guardLines, guardOn: first.guardOn === true,
    moved: (rec.movedList || []).length, movedByTranslator: (rec.movedList || []).filter(m => m.byTranslator).length, movedList: rec.movedList || [],
    swapped: last.swapped || 0, maxStale: rec.maxStale, staleSample: rec.staleSample,
    pressed: rec.pressed, dbBlocked: W.dbBlocked, blocked: [...W.blocked], retry, direct: rec.direct || null,
    create: route === CREATE_ROUTE ? { drawn: !!rec.createDrawn, boxes: rec.boxes || {}, reached: !!rec.reached, reachedDetail: rec.reachedDetail || '', seasonAt: rec.seasonAt ?? null, seasonDetail: rec.seasonDetail || '' } : null,
    stepList: rec.steps,
  };
  await W.ctx.close();

  if (mode === 'off') check(`1. ${tag}: the translator is off`, last.fonts === 0 && last.marked === false && first.counting === true, `${last.fonts} font element(s)`);
  else check(`1. ${tag}: the translator ran`, row.swapped > 0 && last.lang === 'pt' && last.marked === true, `${row.swapped} text node(s) swapped, lang="${last.lang || ''}"`);
  if (CONTROL !== 'noguard') {
    check(`1. ${tag}: the guard is installed on the page`, row.guardOn);
    const d = rec.direct || {};
    check(`8. ${tag}: asked directly, removing a moved node is quiet and inserting before one appends`, d.remove === 'quiet' && d.insert === 'quiet', `removeChild ${d.remove || 'not asked'}, insertBefore ${d.insert || 'not asked'}`);
  }
  if (route === CREATE_ROUTE) {
    const gone = rec.boundaryAt ? `the boundary took the page at "${rec.boundaryAt}"` : rec.stuckAt ? `stuck at ${rec.stuckAt}` : '';
    const boxes = rec.boxes || {};
    const names = PICKS.map(p => p[0]);
    const held = names.filter(n => boxes[n] && boxes[n].has);
    const readable = names.filter(n => boxes[n] && boxes[n].visible);
    const hiddenToday = mode === 'off' ? [] : KNOWN_HIDDEN_PICKS;
    const expected = names.filter(n => !hiddenToday.includes(n));
    const better = hiddenToday.filter(n => readable.includes(n));
    check(`2. ${tag}: the create screen drew`, !!rec.createDrawn, rec.createDrawn ? '' : gone);
    check(`2. ${tag}: all three picks registered, ${NAT} among them`, held.length === 3, gone || names.map(n => `${n} box "${boxes[n] ? boxes[n].shown : 'not there'}"`).join(', '));
    check(`2. ${tag}: each pick can be READ in its box${hiddenToday.length ? `, bar the known hidden one (${hiddenToday.join(', ')})` : ''}`,
      held.length === 3 && readable.length === expected.length && expected.every(n => readable.includes(n)),
      better.length ? `${better.join(', ')} can be read now: take it off KNOWN_HIDDEN_PICKS in this file and correct its header` : gone || `readable: ${readable.join(', ') || 'none'}; hidden: ${names.filter(n => !readable.includes(n)).join(', ') || 'none'}`);
    check(`3. ${tag}: the create flow reached the career`, !!rec.reached, rec.reachedDetail || gone);
    check(`4. ${tag}: one season forward and the hub still stands`, rec.seasonAt !== undefined && rec.hubStands === true, rec.seasonDetail || (rec.reached ? `the save never got a year older in ${CAREER_PRESSES} presses` : 'the career was never reached'));
  }
  check(`5. ${tag}: the walk pressed at least two controls`, rec.pressed.length >= 2, `${rec.pressed.length}${rec.pressed.length ? ': ' + rec.pressed.slice(0, 9).map(p => p.slice(0, 22)).join(' > ') : ''}`);
  check(`6. ${tag}: the route error boundary never appeared`, !rec.boundaryAt, rec.boundaryAt ? `it took the page at "${rec.boundaryAt}"` : '');
  check(`7. ${tag}: no NotFoundError`, row.notFound === 0, row.notFoundSample.slice(0, 150));
  if (retry) out(`        ${RETRY_WORDS}: ${!retry.pressed ? 'the button could not be pressed' : !retry.reloaded ? 'pressed, but the page did not reload' : retry.boundaryAt ? `reloaded, translated again, and broke again at "${retry.boundaryAt}"` : `reloaded and did not break again (${retry.reached ? 'reached the career' : 'stuck at ' + retry.stuckAt})`}`);
  return row;
}

/* JOBS walks at a time (three by default), each in its own context with its own seeded dice, so the
   order they finish in changes nothing but the order of the lines. The tables below are in the
   fixed order of the list. */
const todo = [];
for (const mode of MODES) for (const view of VIEWS) for (const route of ROUTES) todo.push({ mode, view, route });
const JOBS = Math.max(1, Math.min(Number(env.JOBS || 3) || 1, todo.length));
const done = new Array(todo.length).fill(null);
let nextJob = 0;
async function worker() {
  for (;;) {
    const i = nextJob;
    nextJob += 1;
    if (i >= todo.length) return;
    const lines = [];
    const out = l => lines.push(l);
    try { done[i] = await runWalk(todo[i], out); } catch (e) {
      checkLine(`${todo[i].route} ${todo[i].view} ${todo[i].mode}: the walk ran`, false, String(e).split('\n')[0].slice(0, 160), out);
    }
    console.log(lines.join('\n'));
  }
}
await Promise.all(Array.from({ length: JOBS }, () => worker()));
const rows = done.filter(Boolean);

/* ------------------------------------------------------------------ *
 * The record: what every walk needed, page by page.
 * ------------------------------------------------------------------ */
const pad = (s, n) => String(s).padEnd(n);
console.log('\nEVERY WALK');
console.log(`  ${pad('page', 17)}${pad('view', 9)}${pad('text', 7)}${pad('boundary', 34)}${pad('NotFound', 10)}${pad('guard line', 12)}${pad('moved nodes', 13)}${pad('stale text', 12)}steps`);
for (const r of rows) {
  console.log(`  ${pad(r.route, 17)}${pad(r.view, 9)}${pad(r.mode, 7)}${pad(r.boundaryAt ? 'at "' + r.boundaryAt.slice(0, 26) + '"' : 'none', 34)}${pad(r.notFound, 10)}${pad(r.guardLines, 12)}${pad(`${r.moved}${r.moved ? ' (' + r.movedByTranslator + ' taken)' : ''}`, 13)}${pad(r.maxStale, 12)}${r.steps}${r.stuckAt ? '  STUCK: ' + r.stuckAt.slice(0, 60) : ''}`);
}
console.log('\nBY PAGE');
for (const route of ROUTES) {
  const mine = rows.filter(r => r.route === route);
  const broke = mine.filter(r => r.boundaryAt);
  const where = [...new Set(broke.map(r => r.boundaryAt))];
  const moved = mine.map(r => r.moved);
  console.log(`  ${pad(route, 17)}broke in ${broke.length} of ${mine.length} walk(s)${where.length ? ' (' + where.map(s => '"' + s + '"').join(', ') + ')' : ''}; the guard printed its line in ${mine.filter(r => r.guardLines > 0).length}; moved nodes per walk ${moved.join(', ')}; stale text at most ${Math.max(0, ...mine.map(r => r.maxStale))}`);
}
const creates = rows.filter(r => r.create);
if (creates.length) {
  console.log('\nWHAT THE THREE BOXES READ after the picks');
  for (const r of creates) {
    console.log(`  ${pad(r.view, 9)}${pad(r.mode, 7)}${PICKS.map(([n]) => { const b = r.create.boxes[n]; return `${n} "${b ? b.shown : ''}" ${!b ? '(no box)' : b.visible ? '(readable)' : b.has ? '(HIDDEN)' : '(not in the box)'}`; }).join(' | ')}`);
  }
}
const shapes = new Map();
for (const r of rows) for (const m of r.movedList) {
  const key = `${r.route}: ${m.op} under <${m.parent}> of ${JSON.stringify(m.node)}${m.byTranslator ? '' : ' (not a node the translator took)'}`;
  shapes.set(key, (shapes.get(key) || 0) + 1);
}
if (shapes.size) {
  console.log(`\nTHE CALLS THAT NAMED A MOVED NODE (${shapes.size} different, each one a crash without the guard)`);
  for (const [key, n] of [...shapes].slice(0, 60)) console.log(`  ${n}x ${key}`);
}
const staleRow = rows.filter(r => r.maxStale > 0).sort((a, b) => b.maxStale - a.maxStale)[0];
if (staleRow) console.log(`\nSTALE TEXT, the cost the guard does not remove. Most at once: ${staleRow.maxStale} on ${staleRow.route} ${staleRow.view} ${staleRow.mode}, for example ${JSON.stringify(staleRow.staleSample.slice(0, 3))}`);
const dbBlocked = rows.reduce((a, r) => a + r.dbBlocked, 0);
const otherHosts = [...new Set(rows.flatMap(r => r.blocked))];
console.log(`\nnothing left this machine: ${dbBlocked} request(s) to the database host aborted, other hosts aborted [${otherHosts.join(', ')}]${SHOTS ? `, ${shotCount} screenshot(s) in ${SHOTS}` : ''}`);

const guardPages = rows.filter(r => r.guardLines > 0).length;
const movedAll = rows.reduce((a, r) => a + r.moved, 0);
if (CONTROL === 'notranslate') {
  checkLine('9. with the translator off the guard printed nothing and no call named a moved node', guardPages === 0 && movedAll === 0, `${guardPages} of ${rows.length} page(s) printed the guard's line, ${movedAll} moved node(s)`);
} else if (CONTROL !== 'noguard') {
  console.log(`THE GUARD WAS NEEDED on ${guardPages} of ${rows.length} page load(s): ${movedAll} call(s) in all named a node its parent no longer owned.`);
}

if (OUT_JSON) {
  try {
    fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
    fs.writeFileSync(OUT_JSON, JSON.stringify({ base: BASE, control: CONTROL, entry: ENTRY, seed: SEED, checks: checksRun, failed, rows }, null, 1));
  } catch (e) { console.log(`could not write ${OUT_JSON}: ${String(e).slice(0, 80)}`); }
}

console.log('');
if (CONTROL === 'noguard') {
  /* The control's own reason, and nothing else, earns exit 1. */
  const guarded = rows.filter(r => r.guardOn);
  if (guarded.length) {
    console.error(`control "noguard": the guard was installed anyway on ${guarded.length} page(s), so the switch did nothing and this run proves nothing.`);
    await stop(2);
  }
  const broke = rows.filter(r => r.boundaryAt && r.notFound > 0);
  const createRows = rows.filter(r => r.route === CREATE_ROUTE);
  const createBroke = createRows.filter(r => r.boundaryAt && r.notFound > 0);
  const atNationality = createBroke.filter(r => r.boundaryAt.startsWith('choose nationality'));
  const retried = createBroke.filter(r => r.retry && r.retry.reloaded && r.retry.boundaryAt);
  const threw = rows.filter(r => r.direct && r.direct.remove === 'NotFoundError' && r.direct.insert === 'NotFoundError');
  console.log(`${checksRun} checks, ${failed.length} failed`);
  if (!broke.length && !threw.length) {
    console.error('control "noguard": nothing broke without the guard and the two calls did not throw when asked directly. THE CONTROL DID NOT FIRE.');
    await stop(2);
  }
  console.log(`control "noguard": asked directly, removeChild and insertBefore of a moved node both threw NotFoundError on ${threw.length} of ${rows.length} page(s).`);
  console.log(`control "noguard": without the guard ${broke.length} of ${rows.length} walk(s) ended in the error boundary with a NotFoundError behind it.`);
  if (createRows.length) {
    if (createBroke.length === createRows.length && atNationality.length === createRows.length) {
      console.log(`control "noguard": the create flow broke at the nationality step in ${atNationality.length} of ${createRows.length} walk(s), and ${RETRY_WORDS} broke at the same step again in ${retried.length}. RED for its own reason, the check works.`);
    } else if (createBroke.length) {
      console.log(`control "noguard": the create flow broke in ${createBroke.length} of ${createRows.length} walk(s), at ${[...new Set(createBroke.map(r => '"' + r.boundaryAt + '"'))].join(', ')}, which is NOT only the nationality step this control was written against. Still red for its own reason, but read the walk above.`);
    } else {
      console.log('control "noguard": NOTE, the create flow did NOT break without the guard (its strings may have been given spans of their own since). The control fired on other pages only.');
    }
  }
  console.log(`playTranslatedPage: ${checksRun} checks, ${failed.length} failed (control "noguard", red on purpose)`);
  await stop(1);
}
if (failed.length) failed.forEach(f => console.log('  - ' + f));
if (CONTROL === 'notranslate') console.log(failed.length ? 'control "notranslate": RED, and it must be green.' : 'control "notranslate": green with the translator off, zero guard lines, zero moved nodes.');
console.log(`playTranslatedPage: ${checksRun} checks, ${failed.length} failed`);
await stop(failed.length ? 1 : 0);
