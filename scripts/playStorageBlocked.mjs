/**
 * ROUND 1142 BROWSER HARNESS: the site starts when the browser blocks storage,
 * and the cookie banner works when storage is full.
 *
 * WHAT WAS WRONG, measured on the live build on 2026-10-08. With storage
 * blocked (reading window.localStorage throws SecurityError, which is what a
 * browser set to block site data does) the app never started on any route
 * tried: the saved page's static text, 0 buttons, no error screen. The entry
 * module died at `storage: localStorage` in the Supabase client, before React
 * mounted. With storage full (every write throws, reads work) the app ran, but
 * "Essential only" on the cookie banner threw an uncaught quota error and the
 * banner stayed up for good.
 *
 * WHAT THIS WALKS. Every route below, on a phone and on a desktop, three
 * times each in fresh browser contexts: OPEN (storage untouched, the
 * baseline), BLOCKED and FULL. The numbers that matter are compared against
 * the OPEN run of the same route, never against a constant:
 *   - the app mounted: the saved copy is gone and #root holds about as many
 *     buttons and links as the untouched run;
 *   - no uncaught error, and no console error naming storage;
 *   - on a game route the first presses work as well as they do untouched;
 *   - on a game route the one line notice is on the page
 *     ([data-dukb-storage-notice]), it is one line tall on a phone, and the
 *     game sits no more than that one line lower than it does untouched;
 *   - the home page's first game tile is still above y=430 on a phone;
 *   - nothing reached the browser's real storage in BLOCKED;
 *   - no request to an analytics or ad host without Accept.
 * Then the cookie banner, each choice in a fresh context in each mode: the
 * banner leaves, stays gone after moving to another page in the same visit,
 * and analytics requests appear after Accept and only after Accept.
 *
 * And the NATIVE arm, which simulates nothing: a real Chromium profile with
 * the cookie content setting on block, the "block all cookies" a person can
 * choose in the browser's own settings. Four routes on a phone. It is here
 * because the simulated arm only breaks what somebody thought to break, and
 * the first native run proved the point: the real browser also refuses the
 * Web Locks API ("The request was denied."), the auth client locks around
 * every session read, and each page threw three uncaught errors with the
 * home page two buttons short, all of it green in the simulated arm. The
 * seam now stands in for a refused lock, and the simulated BLOCKED arm
 * refuses locks the same way so the check runs wherever this harness does.
 * PLAY_STORAGE_NATIVE=require fails the run when the arm cannot measure
 * (the headless shell build ignores the setting; the full Chromium build
 * takes it); the default says so in the log and carries on; off skips it.
 *
 * MEASURED on the built site, on a Linux runner, 2026-10-08.
 *   Before the fix (the raw control, which is the app as it was): BLOCKED
 *   mounted on 0 of 41 route and screen pairs, 0 buttons, only the 68 links
 *   of the saved copy. FULL put "This page broke" on 13 routes as they
 *   opened: /footle and /build-your-xi, and of the fifteen mount only routes
 *   every one but /conquest, /conquest-nba, /hof-or-bust and /score-predictor
 *   (those four write on a press, not on the mount).
 *   After: 41 of 41 mount in both arms, no error screen, no uncaught error.
 *   Buttons plus links in #root against the untouched run of the same route:
 *   a difference of 0 on all 82 broken arm runs, and 0 again on the 82 runs
 *   of the open control, so the count has no run to run noise here. A page
 *   on the error screen measured 17 and 20 short. COUNT_MARGIN is 3: room
 *   for a link that depends on a fetch, none for a page that did not mount.
 *   The notice is 28px tall on a phone on all 50 arms that show it (one line:
 *   20px of text and 4px either side) and the game sits exactly 28px lower.
 *   NOTICE_MAX_HEIGHT and GAME_SHIFT_MAX are 30: a second line would be 48.
 *   The home page's first game tile is at y=315 untouched, blocked and full.
 *   Chromium's own window.localStorage is an own, configurable accessor on
 *   window, which is what lets the seam put its stand in there; the BLOCKED
 *   arm replaces it like for like and prints what it found.
 *   NATIVE, the real blocked profile: the browser's own accessor throws
 *   "SecurityError: Failed to read the 'localStorage' property from
 *   'Window': Access is denied for this document." Under the raw control 0
 *   buttons on all four routes. With the seam but before the lock stand in:
 *   mounted, 3 uncaught "The request was denied." on every route, and the
 *   home page at 169 buttons against 171 untouched. Now: 171, 29, 12 and 11
 *   buttons on /, /soccer-career, /club-manager and /footle, the same as
 *   untouched, 0 uncaught errors, the notice on the three game routes.
 *   The presses, identical in every arm: four on /soccer-career (nationality,
 *   position, era, surprise me), /club-manager, /nfl-my-career, /front-office
 *   and /build-your-xi, four with three that change the page on
 *   /nba-my-career, four with two on /stadium-tycoon, two with one on
 *   /free-kick, and one on /footle and /college-grid, whose next move is
 *   typing a name.
 *
 * CONTROLS.
 *   PLAY_STORAGE_CONTROL=raw   sets window.__DUKB_RAW_STORAGE__ before the app
 *     boots, which makes src/lib/safeStorage.ts hand back the browser's own
 *     storage untouched and write with no guard, the way the app did before
 *     this round. The harness must go RED: BLOCKED does not mount anywhere,
 *     and in FULL the pages that write as they mount fall to the error screen
 *     and no game route carries the notice. It first checks the built entry
 *     really contains that switch, and refuses to run (exit 2) when it does
 *     not, because a control that changes nothing proves nothing.
 *   PLAY_STORAGE_CONTROL=open  runs the two broken arms with storage left
 *     alone and the notice expectation flipped: it must stay GREEN, with no
 *     notice anywhere, the same button counts, and the cookie answer in the
 *     browser's real storage. That is the seam staying out of the way of
 *     everybody whose browser stores normally, and it is also where the
 *     run to run noise in the button counts was measured.
 *
 * NO NETWORK BEYOND THE BUILD: every request off the served origin is
 * aborted, the database host included.
 *
 * Run: BASE=http://localhost:4173 node scripts/playStorageBlocked.mjs
 *      ONLY=/soccer-career,/ scopes it; MODES=blocked scopes the arms.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = (process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const CONTROL = process.env.PLAY_STORAGE_CONTROL ?? '';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(s => s.trim()).filter(Boolean) : null;
const ARMS = (process.env.MODES ?? 'blocked,full').split(',').map(s => s.trim()).filter(Boolean);
const JOBS = Math.max(1, Number(process.env.PLAY_STORAGE_JOBS ?? 3));
const OUT = process.env.PLAY_STORAGE_OUT ?? process.env.RC_OUT ?? '';
const RAW_SWITCH = '__DUKB_RAW_STORAGE__';
/** require: the NATIVE arm must measure. try (the default): it measures where the
 *  browser takes the setting and says so where it does not. off: skipped. */
const NATIVE = process.env.PLAY_STORAGE_NATIVE ?? 'try';

if (!['', 'raw', 'open'].includes(CONTROL)) {
  console.error(`unknown PLAY_STORAGE_CONTROL=${CONTROL} (raw or open)`);
  process.exit(2);
}

/** The owner's most played pages plus two dailies that keep a daily save. */
const GAME_ROUTES = [
  '/soccer-career', '/club-manager', '/nba-my-career', '/nfl-my-career', '/stadium-tycoon',
  '/college-grid', '/front-office', '/build-your-xi', '/footle', '/free-kick',
];
/** The pages that fell to the error screen with storage full for the same
 *  reason /footle and /build-your-xi did (a flag or a save written with no
 *  guard as the page mounts or on its first answer). Walked on a phone for
 *  the mount alone, against their own untouched run. */
const MOUNT_ROUTES = [
  '/connections', '/ufc', '/football-grid', '/baseball-career', '/baseball-connections', '/hockey-career',
  '/hockey-higher-lower', '/soccer-grid', '/conquest', '/conquest-nba', '/world-cup-bracket', '/nfl-connections',
  '/nba-career', '/hof-or-bust', '/score-predictor',
];
/** Walked in the NATIVE arm, on a phone. */
const NATIVE_ROUTES = ['/', '/soccer-career', '/club-manager', '/footle'];
/** Not games: the notice must stay off these. */
const PLAIN_ROUTES = ['/', '/soccer', '/whats-new'];
const VIEWS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
];

/** Home page fold, the Round 283 rule (scripts/playHomeFold.mjs owns the number). */
const FOLD_CEILING = 430;
/** Margins. Each one is set from measured headroom: see the numbers block. */
const COUNT_MARGIN = 3;
const NOTICE_MAX_HEIGHT = 30;
const GAME_SHIFT_MAX = 30;
const PRESSES = 4;

const THIRD_PARTY = /googletagmanager\.com|google-analytics\.com|googlesyndication\.com|doubleclick\.net|googleadservices\.com/;
const STORAGE_WORDS = /storage|SecurityError|QuotaExceeded|quota has been exceeded|Access is denied/i;

let failures = 0;
let checks = 0;
const say = (ok, what) => {
  checks += 1;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

/**
 * Runs in the page before any of its own code. `mode` is open, blocked or
 * full. The browser's real stores are kept under a name the app never reads,
 * so the harness can still look at what did or did not reach them.
 */
function breakStorage({ mode, raw, rawSwitch }) {
  let realLocal = null;
  try { realLocal = window.localStorage; } catch (e) { /* this context has none */ }
  Object.defineProperty(window, '__harnessRealLocal', { value: realLocal, enumerable: false, configurable: true });
  const native = Object.getOwnPropertyDescriptor(window, 'localStorage');
  Object.defineProperty(window, '__harnessNative', {
    value: { own: !!native, configurable: native ? !!native.configurable : null },
    enumerable: false, configurable: true,
  });
  if (raw) window[rawSwitch] = true;
  if (mode === 'blocked') {
    for (const name of ['localStorage', 'sessionStorage']) {
      const boom = () => {
        throw new DOMException(`Failed to read the '${name}' property from 'Window': Access is denied for this document.`, 'SecurityError');
      };
      /* like for like: the stand in accessor is exactly as replaceable as the
         browser's own one is, so the seam is not handed an easier job here
         than a real browser would give it */
      const own = Object.getOwnPropertyDescriptor(window, name);
      Object.defineProperty(window, name, { configurable: own ? own.configurable : true, enumerable: true, get: boom });
    }
    /* and what the NATIVE arm measured a real blocked Chromium doing to the
       Web Locks API: every request refused before its callback runs */
    if (window.LockManager && window.LockManager.prototype) {
      window.LockManager.prototype.request = function request() {
        return Promise.reject(new DOMException('The request was denied.', 'SecurityError'));
      };
    }
  } else if (mode === 'full') {
    Storage.prototype.setItem = function setItem() {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    };
  }
}

async function openPage(browser, { view, mode, raw }) {
  const ctx = await browser.newContext({ viewport: { width: view.width, height: view.height } });
  await ctx.addInitScript(breakStorage, { mode, raw, rawSwitch: RAW_SWITCH });
  const page = await ctx.newPage();
  const seen = { pageErrors: [], storageConsole: [], thirdParty: [] };
  const origin = new URL(BASE).origin;
  await page.route(/supabase\.co/, r => r.abort());
  await page.route('**/*', r => {
    const url = r.request().url();
    if (THIRD_PARTY.test(url)) seen.thirdParty.push(url.slice(0, 90));
    let sameOrigin = false;
    try { sameOrigin = new URL(url).origin === origin; } catch { /* data: and the like */ sameOrigin = true; }
    return sameOrigin ? r.continue() : r.abort();
  });
  page.on('pageerror', e => seen.pageErrors.push(String(e && e.message ? e.message : e).split('\n')[0].slice(0, 200)));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text().split('\n')[0].slice(0, 200);
    if (/Failed to load resource|net::ERR_/.test(t)) return;
    if (STORAGE_WORDS.test(t)) seen.storageConsole.push(t);
  });
  return { ctx, page, seen };
}

/** Wait until the route has stopped changing: same counts three polls running, no spinner. */
async function settle(page, capMs = 15000) {
  const started = Date.now();
  let last = '';
  let same = 0;
  while (Date.now() - started < capMs) {
    const sig = await page.evaluate(() => {
      const root = document.getElementById('root');
      if (!root) return 'noroot';
      const spinner = !!root.querySelector('[aria-label="Loading"]');
      const boot = !!document.getElementById('dukb-boot');
      return `${root.querySelectorAll('button').length}/${root.querySelectorAll('a[href]').length}/${spinner}/${boot}/${(root.innerText || '').length}`;
    }).catch(() => 'gone');
    if (sig === last && !/true/.test(sig)) same += 1; else same = 0;
    if (same >= 3) return;
    last = sig;
    await page.waitForTimeout(300);
  }
}

/** Everything the comparisons need, read off the page in one go. */
function readState() {
  const root = document.getElementById('root');
  const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const notice = document.querySelector('[data-dukb-storage-notice]');
  const main = document.getElementById('dukb-main') || (root && root.querySelector('main'));
  const TICKER = 'section[aria-label="Live scores ticker"]';
  const NON_GAME = /^\/(about|contact|privacy|terms|whats-new|login|signup|profile|leaderboard|search|soccer|nfl|nba|mlb|nhl|college|more|sitemap|account)(\/|$)/;
  const tiles = [...document.querySelectorAll('#root a[href^="/"]')]
    .filter(a => !a.closest(TICKER) && !a.closest('header, nav, footer, [data-site-chrome]'))
    .map(a => ({ p: a.getAttribute('href') || '', top: a.getBoundingClientRect().top + window.scrollY }))
    .filter(x => x.p !== '/' && !NON_GAME.test(x.p) && x.top > 0)
    .sort((a, b) => a.top - b.top);
  let realKeys = null;
  try { realKeys = window.__harnessRealLocal ? window.__harnessRealLocal.length : null; } catch (e) { realKeys = null; }
  let storageKind = 'threw';
  try { storageKind = Object.prototype.toString.call(window.localStorage); } catch (e) { storageKind = 'threw'; }
  return {
    buttons: root ? root.querySelectorAll('button').length : 0,
    links: root ? root.querySelectorAll('a[href]').length : 0,
    inputs: root ? root.querySelectorAll('input, select, textarea').length : 0,
    snapshot: !!document.getElementById('dukb-snapshot'),
    bootCover: !!document.getElementById('dukb-boot'),
    boundary: [...document.querySelectorAll('h1, h2')].some(h => /This page broke/i.test(h.textContent || '')),
    notice: notice ? {
      kind: notice.getAttribute('data-dukb-storage-notice'),
      height: Math.round(notice.getBoundingClientRect().height),
      shown: visible(notice),
      text: (notice.innerText || '').trim().slice(0, 120),
    } : null,
    mainTop: main ? Math.round(main.getBoundingClientRect().top + window.scrollY) : null,
    firstTile: tiles[0] || null,
    banner: !!document.querySelector('[role="region"][aria-label="Cookie choices"]'),
    realKeys,
    storageKind,
    native: window.__harnessNative || null,
  };
}

/**
 * Press the next thing a player would press: inside an open dialog first
 * (the rules a game shows before play), else in the game itself. Links are
 * left alone so the walk stays on the route. Returns what was pressed, or
 * null when nothing pressable is on the page.
 */
function pressNext(n) {
  const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const label = el => ((el.innerText || el.getAttribute('aria-label') || el.title || '').replace(/\s+/g, ' ').trim()).slice(0, 40);
  const CHROME = '[data-site-chrome], header, nav, footer, [role="region"][aria-label="Cookie choices"], section[aria-label="Live scores ticker"]';
  const AVOID = /sign ?(in|up)|log ?(in|out)|share|report|delete|reset|clear|erase|theme|install|export|import|leaderboard|copy|sound|mute|feedback|account|light mode|dark mode|how to|rules|help|give up|abandon|quit|skip|hint|reveal|settings|^back|^home|menu|pause/i;
  const GO = /play|start|begin|got it|let'?s|continue|new |create|next|kick|sim|roll|deal|spin|pick|choose|select|confirm|advance|ready|go\b|ok\b|done/i;
  const dialogs = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].filter(visible);
  const scope = dialogs.length ? dialogs[dialogs.length - 1] : document.getElementById('root');
  if (!scope) return null;
  const pool = [...scope.querySelectorAll('button:not([disabled])')]
    .filter(el => visible(el) && !el.closest(CHROME) && !el.hasAttribute('data-harness-pressed') && !AVOID.test(label(el)));
  if (!pool.length) return null;
  const pickd = pool.find(el => GO.test(label(el))) || pool[0];
  pickd.setAttribute('data-harness-pressed', String(n));
  const what = { label: label(pickd) || '(no label)', inDialog: dialogs.length > 0 };
  pickd.click();
  return what;
}

function pageSignature() {
  const root = document.getElementById('root');
  const dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length;
  return `${(document.body.innerText || '').length}/${root ? root.querySelectorAll('button').length : 0}/${dialogs}`;
}

/** One route, one screen, one storage mode, in its own browser context. */
async function visit(browser, { route, view, mode, raw, walk }) {
  const { ctx, page, seen } = await openPage(browser, { view, mode, raw });
  const out = { route, view: view.name, mode, presses: [], changed: 0 };
  try {
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
    await settle(page);
    out.first = await page.evaluate(readState);
    if (walk) {
      for (let n = 0; n < PRESSES; n += 1) {
        const before = await page.evaluate(pageSignature);
        const errorsBefore = seen.pageErrors.length;
        const pressed = await page.evaluate(pressNext, n).catch(e => ({ label: `(press threw: ${String(e).slice(0, 60)})`, failed: true }));
        if (!pressed) break;
        await page.waitForTimeout(700);
        await settle(page, 4000);
        const after = await page.evaluate(pageSignature).catch(() => 'gone');
        const changed = after !== before;
        if (changed) out.changed += 1;
        out.presses.push({ ...pressed, changed, threw: seen.pageErrors.length > errorsBefore });
      }
      out.last = await page.evaluate(readState);
    }
  } catch (e) {
    out.crash = String(e && e.message ? e.message : e).split('\n')[0].slice(0, 160);
  }
  out.pageErrors = seen.pageErrors.slice();
  out.storageConsole = seen.storageConsole.slice();
  out.thirdParty = seen.thirdParty.length;
  await ctx.close();
  return out;
}

const interactive = s => (s ? s.buttons + s.links : 0);
const tag = r => `${r.route} ${r.view} ${(r.label || r.mode).toUpperCase()}`;

/** The untouched run of a route: what the comparisons are measured against. */
function judgeOpen(open) {
  const s = open.first;
  if (!s) { say(false, `${tag(open)}: did not load (${open.crash || 'no state'})`); return; }
  say(!s.snapshot && s.buttons > 0, `${tag(open)}: baseline mounted, ${s.buttons} buttons and ${s.links} links in #root`);
  say(!s.notice, `${tag(open)}: no storage notice with ordinary storage`);
  say(s.storageKind === '[object Storage]', `${tag(open)}: window.localStorage is the browser's own (${s.storageKind})`);
  say(open.storageConsole.length === 0 && !open.pageErrors.some(e => STORAGE_WORDS.test(e)),
    `${tag(open)}: no storage error with ordinary storage`);
}

/** One broken arm of a route against its untouched run. `expectNotice` is false under the open control. */
function judgeArm(arm, open, { isGame, expectNotice, mountOnly }) {
  const s = arm.first;
  const base = open.first;
  if (!s || !base) { say(false, `${tag(arm)}: did not load (${arm.crash || open.crash || 'no state'})`); return; }
  const want = interactive(base) - COUNT_MARGIN;
  say(!s.snapshot && !s.bootCover && s.buttons > 0 && interactive(s) >= want,
    `${tag(arm)}: mounted, ${s.buttons} buttons and ${s.links} links (untouched ${base.buttons} and ${base.links}, floor ${want})${s.snapshot ? ', THE SAVED COPY IS STILL THERE' : ''}`);
  const stateNow = arm.last || s;
  say(!stateNow.boundary, `${tag(arm)}: no "This page broke" screen`);
  const storageErrors = [...arm.pageErrors.filter(e => STORAGE_WORDS.test(e)), ...arm.storageConsole];
  say(storageErrors.length === 0, `${tag(arm)}: no error naming storage${storageErrors.length ? ': ' + storageErrors[0] : ''}`);
  say(arm.pageErrors.length <= open.pageErrors.length,
    `${tag(arm)}: ${arm.pageErrors.length} uncaught errors (untouched ${open.pageErrors.length})${arm.pageErrors.length ? ': ' + arm.pageErrors[0] : ''}`);
  say(arm.thirdParty === 0, `${tag(arm)}: ${arm.thirdParty} analytics or ad requests without Accept`);
  if (arm.mode === 'blocked') {
    say(s.realKeys === 0 && (stateNow.realKeys === 0), `${tag(arm)}: nothing reached the browser's real storage (${stateNow.realKeys} keys)`);
  }
  if (mountOnly) return;
  if (isGame) {
    const pressedOk = arm.presses.filter(p => !p.threw && !p.failed).length;
    const basePressed = open.presses.filter(p => !p.threw && !p.failed).length;
    say(pressedOk >= basePressed && arm.changed >= Math.min(1, open.changed),
      `${tag(arm)}: ${pressedOk} presses went through, ${arm.changed} changed the page (untouched ${basePressed} and ${open.changed}): ${arm.presses.map(p => p.label).join(' > ') || 'nothing to press'}`);
    if (expectNotice) {
      say(!!s.notice && s.notice.shown && s.notice.kind === arm.mode,
        `${tag(arm)}: the notice is on the page${s.notice ? ` ("${s.notice.text}")` : ''}`);
      if (s.notice && arm.view === 'phone') {
        say(s.notice.height <= NOTICE_MAX_HEIGHT, `${tag(arm)}: the notice is one line tall, ${s.notice.height}px (ceiling ${NOTICE_MAX_HEIGHT})`);
        const shift = s.mainTop !== null && base.mainTop !== null ? s.mainTop - base.mainTop : null;
        say(shift !== null && shift <= GAME_SHIFT_MAX, `${tag(arm)}: the game sits ${shift}px lower than untouched (ceiling ${GAME_SHIFT_MAX})`);
      }
    } else {
      say(!s.notice, `${tag(arm)}: no notice (storage was left alone)`);
    }
  } else {
    say(!s.notice, `${tag(arm)}: no notice on a page that is not a game`);
    if (arm.route === '/' && arm.view === 'phone') {
      const top = s.firstTile ? Math.round(s.firstTile.top) : null;
      const baseTop = base.firstTile ? Math.round(base.firstTile.top) : null;
      say(top !== null && top <= FOLD_CEILING, `${tag(arm)}: first game tile at y=${top} (ceiling ${FOLD_CEILING}, untouched ${baseTop}), ${s.firstTile ? s.firstTile.p : 'none found'}`);
    }
  }
}

/** The cookie banner, one choice, one mode, in a fresh context on a phone. */
async function bannerCheck(browser, { mode, raw, choice }) {
  const { ctx, page, seen } = await openPage(browser, { view: VIEWS[0], mode, raw });
  const button = choice === 'accept' ? 'Accept' : 'Essential only';
  const name = `cookie banner ${mode.toUpperCase()} "${button}"`;
  try {
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
    await settle(page);
    const banner = page.locator('[role="region"][aria-label="Cookie choices"]');
    const shown = await banner.count();
    say(shown === 1, `${name}: the banner is up on a first visit`);
    say(seen.thirdParty.length === 0, `${name}: ${seen.thirdParty.length} analytics or ad requests before any choice`);
    if (shown === 1) {
      await banner.getByRole('button', { name: button, exact: true }).click({ timeout: 5000 });
      await page.waitForTimeout(800);
    }
    say((await banner.count()) === 0, `${name}: the banner left`);
    /* on to another page of the same visit, through a real link in the app */
    const moved = await page.evaluate(() => {
      const a = document.querySelector('footer a[href="/whats-new"]') || document.querySelector('#root a[href="/whats-new"]');
      if (!a) return false;
      a.click();
      return true;
    });
    await page.waitForTimeout(500);
    await settle(page);
    const where = await page.evaluate(() => location.pathname);
    say(moved && where === '/whats-new' && (await banner.count()) === 0, `${name}: still gone on the next page of the visit (${where})`);
    const after = seen.thirdParty.length;
    if (choice === 'accept') say(after > 0, `${name}: ${after} analytics requests after Accept`);
    else say(after === 0, `${name}: ${after} analytics or ad requests after Essential only`);
    const errors = [...seen.pageErrors, ...seen.storageConsole];
    say(errors.length === 0, `${name}: no uncaught error${errors.length ? ': ' + errors[0] : ''}`);
    const held = await page.evaluate(() => {
      try { return window.__harnessRealLocal ? window.__harnessRealLocal.getItem('cookie-consent') : null; } catch (e) { return 'threw'; }
    });
    const answer = choice === 'accept' ? 'accepted' : 'essential';
    if (mode === 'open') say(held === answer, `${name}: the answer is in the browser's real storage (${held})`);
    else say(held === null, `${name}: nothing was written to the browser's real storage (${held})`);
  } catch (e) {
    say(false, `${name}: ${String(e && e.message ? e.message : e).split('\n')[0].slice(0, 160)}`);
  }
  await ctx.close();
}

/** Runs before the page's code in the NATIVE arm: what does this browser's own accessor do? */
function nativeProbe({ raw, rawSwitch }) {
  let local = 'no throw';
  try { void window.localStorage; } catch (e) { local = `${e.name}: ${e.message}`; }
  Object.defineProperty(window, '__harnessNativeProbe', { value: local, enumerable: false, configurable: true });
  if (raw) window[rawSwitch] = true;
}

/**
 * The NATIVE arm: no simulated getter. A real Chromium profile with the
 * cookie content setting on block, which is the "block all cookies" a person
 * can pick in the browser's own settings. It is the arm that found the Web
 * Locks refusal the simulated one did not have. Returns false when this
 * machine's browser will not take the setting (the accessor does not throw).
 */
async function nativeArm(baselines) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-storage-native-'));
  fs.mkdirSync(path.join(dir, 'Default'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'Default', 'Preferences'), JSON.stringify({ profile: { default_content_setting_values: { cookies: 2 } } }));
  let ctx;
  try {
    ctx = await chromium.launchPersistentContext(dir, { headless: true, channel: 'chromium', viewport: { width: VIEWS[0].width, height: VIEWS[0].height } });
  } catch (e) {
    console.log(`  the full Chromium build would not start here: ${String(e && e.message ? e.message : e).split('\n')[0].slice(0, 120)}`);
    return false;
  }
  await ctx.addInitScript(nativeProbe, { raw: CONTROL === 'raw', rawSwitch: RAW_SWITCH });
  const origin = new URL(BASE).origin;
  let measured = false;
  for (const route of NATIVE_ROUTES.filter(r => !ONLY || ONLY.includes(r))) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e && e.message ? e.message : e).split('\n')[0].slice(0, 160)));
    await page.route('**/*', r => {
      let same = true;
      try { same = new URL(r.request().url()).origin === origin; } catch { same = true; }
      return same ? r.continue() : r.abort();
    });
    const name = `${route} phone NATIVE`;
    try {
      await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
      await settle(page);
      await page.waitForTimeout(1500);
      const s = await page.evaluate(readState);
      const probe = await page.evaluate(() => window.__harnessNativeProbe);
      if (!/SecurityError/.test(probe)) {
        console.log(`  ${name}: this browser's accessor did not throw (${probe}), so the setting was not taken`);
        await page.close();
        continue;
      }
      measured = true;
      const base = baselines.get(route);
      const want = base ? interactive(base) - COUNT_MARGIN : 1;
      say(!s.snapshot && !s.bootCover && s.buttons > 0 && interactive(s) >= want,
        `${name}: mounted, ${s.buttons} buttons and ${s.links} links${base ? ` (untouched ${base.buttons} and ${base.links}, floor ${want})` : ''}; the browser said "${probe.slice(0, 60)}"`);
      say(!s.boundary, `${name}: no "This page broke" screen`);
      say(errors.length === 0, `${name}: ${errors.length} uncaught errors${errors.length ? ': ' + errors[0] : ''}`);
      if (GAME_ROUTES.includes(route)) say(!!s.notice && s.notice.kind === 'blocked', `${name}: the notice is on the page`);
      else say(!s.notice, `${name}: no notice on a page that is not a game`);
      if (route === '/') {
        const banner = page.locator('[role="region"][aria-label="Cookie choices"]');
        const up = await banner.count();
        if (up === 1) await banner.getByRole('button', { name: 'Essential only', exact: true }).click({ timeout: 5000 });
        await page.waitForTimeout(600);
        say(up === 1 && (await banner.count()) === 0 && errors.length === 0, `${name}: the cookie banner came up and "Essential only" dismissed it`);
      }
    } catch (e) {
      say(false, `${name}: ${String(e && e.message ? e.message : e).split('\n')[0].slice(0, 160)}`);
    }
    await page.close().catch(() => {});
  }
  await ctx.close().catch(() => {});
  return measured;
}

/** The raw control only means something if the build under test carries the switch. */
async function builtEntryWithSwitch() {
  const html = await (await fetch(BASE + '/')).text();
  const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map(m => m[1]))];
  for (const asset of assets) {
    const js = await (await fetch(BASE + asset)).text();
    if (js.includes(RAW_SWITCH)) return asset;
  }
  return null;
}

async function pool(items, size, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await worker(items[i]);
    }
  }));
  return results;
}

console.log(`playStorageBlocked against ${BASE}${CONTROL ? `, CONTROL ${CONTROL}` : ''}, arms ${ARMS.join(' and ')}`);
if (CONTROL === 'raw') {
  const where = await builtEntryWithSwitch();
  if (!where) {
    console.error(`REFUSING TO RUN: no script the home page loads contains ${RAW_SWITCH}, so the raw control would change nothing.`);
    process.exit(2);
  }
  console.log(`  the switch ${RAW_SWITCH} is in ${where}`);
}

const browser = await chromium.launch();
const raw = CONTROL === 'raw';
const routes = [...PLAIN_ROUTES, ...GAME_ROUTES].filter(r => !ONLY || ONLY.includes(r));
const tasks = [
  ...routes.flatMap(route => VIEWS.map(view => ({ route, view }))),
  ...MOUNT_ROUTES.filter(r => !ONLY || ONLY.includes(r)).map(route => ({ route, view: VIEWS[0], mountOnly: true })),
];
const walked = await pool(tasks, JOBS, async ({ route, view, mountOnly = false }) => {
  const isGame = GAME_ROUTES.includes(route);
  const open = await visit(browser, { route, view, mode: 'open', raw: false, walk: isGame });
  const arms = [];
  for (const arm of ARMS) {
    const mode = CONTROL === 'open' ? 'open' : arm;
    const run = await visit(browser, { route, view, mode, raw, walk: isGame });
    if (CONTROL === 'open') run.label = `open again (${arm} arm)`;
    arms.push(run);
  }
  return { route, view: view.name, isGame, mountOnly, open, arms };
});

for (const w of walked) {
  console.log(`\n${w.route} on a ${w.view}${w.mountOnly ? ' (mount only)' : ''}`);
  judgeOpen(w.open);
  for (const arm of w.arms) judgeArm(arm, w.open, { isGame: w.isGame, expectNotice: CONTROL !== 'open', mountOnly: w.mountOnly });
}

console.log('\nthe cookie banner');
for (const arm of ARMS) {
  const mode = CONTROL === 'open' ? 'open' : arm;
  for (const choice of ['essential', 'accept']) await bannerCheck(browser, { mode, raw, choice });
  if (CONTROL === 'open') break;
}
await browser.close();

if (CONTROL !== 'open' && NATIVE !== 'off' && ARMS.includes('blocked')) {
  console.log('\nNATIVE: a real Chromium profile with the cookie setting on block');
  const baselines = new Map(walked.filter(w => w.view === 'phone' && w.open.first).map(w => [w.route, w.open.first]));
  const measured = await nativeArm(baselines);
  if (!measured && NATIVE === 'require') say(false, 'NATIVE: PLAY_STORAGE_NATIVE=require, and no route could be measured in a really blocked browser');
  else if (!measured) console.log('  NOT MEASURED HERE: the simulated BLOCKED arm above is all this run has. Set PLAY_STORAGE_NATIVE=require where the full Chromium build is installed.');
}

const native = walked.map(w => w.open.first && w.open.first.native).find(Boolean);
console.log(`\nthe browser's own localStorage accessor: ${native ? `own property of window ${native.own}, configurable ${native.configurable}` : 'not read'}`);
if (OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `playStorageBlocked-${CONTROL || 'main'}.json`);
  fs.writeFileSync(file, JSON.stringify({ base: BASE, control: CONTROL, arms: ARMS, walked }, null, 1));
  console.log(`measurements written to ${file}`);
}
console.log(`\nplayStorageBlocked${CONTROL ? ` (control ${CONTROL})` : ''}: ${checks} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
