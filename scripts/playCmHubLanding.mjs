/**
 * Round 1328 browser walk: a new Club Manager career opens on its club, a tap
 * on the calendar leaves the month where it was, and the hub's tiles and header
 * read whole on a phone.
 *
 * Sections (each prints PASS or FAIL lines, the run ends on one summary line):
 *   A. Landing: on the FIRST frame of the hub (a rAF probe from an init script,
 *      keyed on the Managers button, which base and head both draw) the hub
 *      header's top is inside the screen. Seven starts plus a new season from
 *      the bottom of the season review.
 *   B. Calendar: day taps move the page by nothing, the day strip stays on
 *      screen, one set of names for the training intensity.
 *   C. Fit: text sizes, 44 px controls, nothing cut, the help button clear of
 *      the header's words, no sideways scroll, no layout shift, tile words.
 *   D. Must not move: three careers with a seeded, counted Math.random and a
 *      frozen Date, identical presses on a base build and a head build; every
 *      saved key byte equal and the draw count equal. Needs BASE_URL.
 *   E. Old saves: two committed fixtures resume to a whole hub.
 *   F. Motion and help: nothing animates under reduced motion; the help opens.
 *
 * Run on a served build (scripts/lib/hostLikeServer.mjs, never a single page
 * rewrite server), never against the live site:
 *   HEAD_URL=http://localhost:4173 BASE_URL=http://localhost:4174 node scripts/playCmHubLanding.mjs
 * HEAD_URL falls back to BASE, then SWEEP_BASE (the remote check's served
 * build). Without BASE_URL it runs every section except D.
 * HUB_LANDING_SECTIONS=AD runs only those sections.
 * Every request that leaves the served origin is aborted (the database host
 * included), and so is every web socket.
 *
 * Controls (HUB_LANDING_CONTROL), page side only, no source edits; each must
 * turn its own check red, and the run says which check fired:
 *   noscroll  scrollIntoView, scrollTo and scrollBy do nothing: A fails on every start
 *   nosticky  the day strip loses position sticky: B's on screen check fails
 *   small     one tile line forced to 11 px: C's font check names it
 *   cut       the Board wants line held to 40 px, nowrap, hidden: C's cut check names it
 *   drift     Math.random takes one extra draw on the head build only: D fails
 * A control run exits 1 when its check fired and 3 when it did not.
 */
import fs from 'node:fs';
import path from 'node:path';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const HEAD = (process.env.HEAD_URL ?? process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const BASE_BUILD = process.env.BASE_URL ? process.env.BASE_URL.replace(/\/$/, '') : null;
const CONTROL = process.env.HUB_LANDING_CONTROL ?? '';
const SECTIONS = new Set((process.env.HUB_LANDING_SECTIONS ?? 'ABCDEF').toUpperCase().split(''));
if (!BASE_BUILD) SECTIONS.delete('D');
const OUT = process.env.RC_OUT ? path.join(process.env.RC_OUT, '1328') : path.join('.tmp-fx', '1328');
fs.mkdirSync(OUT, { recursive: true });
const SAVE_KEY = 'dukb-club-manager-save';
const SIZE = { s320: { width: 320, height: 640 }, s390: { width: 390, height: 844 }, s1280: { width: 1280, height: 900 } };
const NOW = Date.UTC(2026, 9, 12, 16, 0, 0);
const KNOWN = ['noscroll', 'nosticky', 'small', 'cut', 'drift'];
if (CONTROL && !KNOWN.includes(CONTROL)) { console.log(`playCmHubLanding: unknown control ${CONTROL}`); process.exit(2); }

const fails = [];
const counts = {};
const fail = (section, msg) => { fails.push({ section, msg }); console.log(`  FAIL  ${section}  ${msg}`); };
const pass = (section, msg) => { counts[section] = (counts[section] ?? 0) + 1; console.log(`  PASS  ${section}  ${msg}`); };
const check = (section, ok, msg) => (ok ? pass(section, msg) : fail(section, msg));

const browser = await chromium.launch();

/* The page side of every run: cookie choice made, the first hub frame probe,
   a layout shift total, the controls, and for D a seeded counted Math.random
   with a frozen clock. Runs before any page code. */
function initScript({ consent, seed, now, control, drift }) {
  if (consent) { try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* storage blocked */ } }
  if (seed !== null) {
    let s = seed >>> 0;
    window.__draws = 0;
    Math.random = () => {
      window.__draws += 1;
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    if (drift) Math.random();
    const OldDate = Date;
    window.Date = class extends OldDate {
      constructor(...a) { super(...(a.length ? a : [now])); }
      static now() { return now; }
    };
  }
  if (control === 'noscroll') {
    Element.prototype.scrollIntoView = function () {};
    window.scrollTo = function () {};
    window.scrollBy = function () {};
  }
  window.__hubFirst = null;
  window.__cls = 0;
  window.__clsAfterHub = 0;
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__cls += e.value;
        if (window.__hubFirst) window.__clsAfterHub += e.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch { /* no layout shift API */ }
  const tick = () => {
    if (!window.__hubFirst) {
      const b = document.querySelector('[data-testid="cm-show-slots"]');
      if (b) {
        const h = b.closest('header') ?? b;
        const r = h.getBoundingClientRect();
        window.__hubFirst = { scrollY: window.scrollY, top: r.top, bottom: r.bottom, vh: window.innerHeight };
        window.__clsAfterHub = 0;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function openPage(url, size, { consent = true, seed = null, drift = false, reduced = true } = {}) {
  const origin = new URL(url).origin;
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  await ctx.route('**/*', r => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  if (ctx.routeWebSocket) await ctx.routeWebSocket(/.*/, ws => ws.close());
  await ctx.addInitScript(initScript, { consent, seed, now: NOW, control: CONTROL, drift });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  return { ctx, page, errors };
}

/* The picker, pressed like a person: era, nation, league (when the nation has
   more than one), the club's tile, the confirm bar, then the dugout form. */
async function startCareer(page, url, { era, nation, league, club, take, entry }, onStep = null) {
  const step = async name => { if (onStep) { await page.waitForTimeout(500); await onStep(name); } };
  await page.goto(`${url}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.locator('button', { hasText: era }).first().waitFor({ timeout: 20000 });
  await step('era');
  await page.locator('button', { hasText: era }).first().click();
  await page.locator('button', { hasText: nation }).first().waitFor({ timeout: 20000 });
  await step('nation');
  await page.locator('button', { hasText: nation }).first().click();
  const tiles = page.locator('button', { hasText: 'Board wants' });
  await Promise.race([tiles.first().waitFor({ timeout: 15000 }).catch(() => {}), page.locator('button', { hasText: league }).first().waitFor({ timeout: 15000 }).catch(() => {})]);
  if (await tiles.count() === 0) {
    await step('league');
    await page.locator('button', { hasText: league }).first().click();
  }
  await tiles.filter({ hasText: club }).first().waitFor({ timeout: 20000 });
  await step('team');
  await tiles.filter({ hasText: club }).first().click();
  await page.locator('div.fixed button', { hasText: 'Take the job' }).first().click();
  const skip = page.getByRole('button', { name: /^Skip: just manage$/ }).first();
  await skip.waitFor({ timeout: 15000 });
  await step('dugout');
  if (entry) await page.locator('button', { hasText: entry }).first().click();
  if (take) {
    await page.locator('input[placeholder="e.g. Sam Calloway"]').fill('Jo Walker');
    await page.locator('button', { hasText: 'Take the job' }).first().click();
  } else {
    await skip.click();
  }
  await page.waitForFunction(() => window.__hubFirst !== null, null, { timeout: 120000 });
  await page.waitForTimeout(400);
}

/* The header inside the screen on that first frame: its top no higher than
   2 px above the top edge, and at least 40 px of it showing above the fold. */
function landed(first) {
  return !!first && first.top >= -2 && first.top + 40 <= first.vh;
}

const shots = [];
async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file }).catch(() => {});
  shots.push(name);
}

/* ---------------- A. Landing ---------------- */
const STARTS = [
  { id: 'liverpool-take-390', size: 's390', era: '2026-27', nation: 'England', league: 'Premier League', club: 'Liverpool', take: true },
  { id: 'liverpool-skip-390', size: 's390', era: '2026-27', nation: 'England', league: 'Premier League', club: 'Liverpool', take: false },
  { id: 'celta-skip-320', size: 's320', era: '2026-27', nation: 'Spain', league: 'La Liga', club: 'Celta Vigo', take: false },
  { id: 'aberdeen-take-1280', size: 's1280', era: '2026-27', nation: 'Scotland', league: 'Scottish Premiership', club: 'Aberdeen', take: true },
  { id: 'aberdeen-skip-1280', size: 's1280', era: '2026-27', nation: 'Scotland', league: 'Scottish Premiership', club: 'Aberdeen', take: false },
  { id: 'everton2005-newyear-390', size: 's390', era: '2005-06', nation: 'England', league: 'Premier League', club: 'Everton', take: true, entry: 'New year' },
  { id: 'liverpool-autumn-320', size: 's320', era: '2026-27', nation: 'England', league: 'Premier League', club: 'Liverpool', take: false, entry: 'Autumn' },
];
const landing = [];
if (SECTIONS.has('A')) {
  console.log('A. Landing: the first frame of the hub after a new job');
  for (const s of STARTS) {
    const { ctx, page, errors } = await openPage(HEAD, SIZE[s.size]);
    let first = null;
    try {
      await startCareer(page, HEAD, s);
      first = await page.evaluate(() => window.__hubFirst);
    } catch (e) {
      fail('A', `${s.id}: the career did not reach the hub (${String(e).split('\n')[0].slice(0, 160)})`);
      await shot(page, `A-${s.id}-stuck`);
      await ctx.close();
      continue;
    }
    landing.push({ id: s.id, ...first });
    await shot(page, `A-${s.id}`);
    check('A', landed(first), `${s.id}: hub header top ${first ? Math.round(first.top) : '?'} px at scrollY ${first ? Math.round(first.scrollY) : '?'} on the first hub frame (screen ${first?.vh ?? '?'} px)`);
    if (errors.length) fail('A', `${s.id}: page error ${errors[0].slice(0, 160)}`);
    await ctx.close();
  }
}

/* Presses one thing that moves the season on, whatever the hub is showing.
   Returns a word for the log, or 'review' once the season review is up. */
async function advance(page, how) {
  const has = async (loc) => (await loc.count()) > 0 && await loc.first().isVisible().catch(() => false);
  const review = page.getByRole('button', { name: /^Continue to Season \d+/ });
  if (await has(review)) return 'review';
  const cont = page.locator('button', { hasText: /^Continue/ });
  if (await has(cont)) { await cont.first().click(); return 'continue'; }
  const seeReview = page.locator('button', { hasText: 'See Season Review' });
  if (await has(seeReview)) { await seeReview.first().click(); return 'see-review'; }
  const win = page.locator('button', { hasText: 'Open the Window' });
  if (await has(win)) { await win.first().click(); return 'window'; }
  if (how === 'quick') {
    const quick = page.locator('button', { hasText: 'Quick Sim' });
    if (await has(quick)) { await quick.first().click(); return 'quick'; }
  }
  const home = page.locator('button', { hasText: 'Club home' });
  if (how === 'rest') {
    const rest = page.locator('button', { hasText: 'Rest of season' });
    if (await has(rest)) { await rest.first().click(); return 'rest'; }
    if (await has(home)) await home.first().click();
    if (await clickTile(page, 'Calendar')) return 'calendar';
  }
  if (await has(home)) { await home.first().click(); return 'home'; }
  const tab = page.getByRole('tab', { name: /^Home$/ });
  if (await has(tab) && (await tab.first().getAttribute('aria-selected')) !== 'true') { await tab.first().click(); return 'tab'; }
  return 'nothing';
}

if (SECTIONS.has('A')) {
  console.log('A. Landing: a new season pressed from the bottom of the season review');
  const s = { id: 'liverpool-season2-390', size: 's390', era: '2026-27', nation: 'England', league: 'Premier League', club: 'Liverpool', take: false };
  const { ctx, page } = await openPage(HEAD, SIZE[s.size]);
  try {
    await startCareer(page, HEAD, s);
    const steps = [];
    let word = '';
    for (let i = 0; i < 60 && word !== 'review'; i += 1) {
      word = await advance(page, 'rest');
      steps.push(word);
      await page.waitForTimeout(word === 'rest' || word === 'see-review' ? 2500 : 700);
    }
    if (word !== 'review') {
      const seen = await page.evaluate(() => ({ h1: [...document.querySelectorAll("h1")].map(h => h.innerText.trim()).join(" / "), buttons: [...document.querySelectorAll("button")].filter(b => b.offsetParent).map(b => b.innerText.trim().slice(0, 30)).filter(Boolean).slice(0, 14).join(" | ") }));
      fail('A', `${s.id}: the season review never came up (presses ${steps.join(", ")}; headings ${seen.h1}; buttons ${seen.buttons})`);
      await shot(page, `A-${s.id}-noreview`);
    } else {
      await page.evaluate(() => { window.__hubFirst = null; window.scrollTo(0, document.documentElement.scrollHeight); });
      await page.waitForTimeout(300);
      const before = await page.evaluate(() => window.scrollY);
      await page.getByRole('button', { name: /^Continue to Season \d+/ }).first().click();
      await page.waitForFunction(() => window.__hubFirst !== null, null, { timeout: 60000 });
      const first = await page.evaluate(() => window.__hubFirst);
      landing.push({ id: s.id, ...first });
      await shot(page, `A-${s.id}`);
      check('A', landed(first), `${s.id}: from scrollY ${Math.round(before)} at the review, hub header top ${Math.round(first.top)} px on the first frame of season 2 (${steps.length} presses to the review)`);
    }
  } catch (e) {
    fail('A', `${s.id}: ${String(e).split('\n')[0].slice(0, 200)}`);
    await shot(page, `A-${s.id}-stuck`);
  }
  await ctx.close();
}

/* ---------------- B. Calendar ---------------- */
const stripBox = page => page.evaluate(() => {
  const s = document.querySelector('[data-testid="cm-calendar-day"]');
  if (!s) return null;
  const r = s.getBoundingClientRect();
  const banner = document.querySelector('[role="region"][aria-label="Cookie choices"]');
  const b = banner && getComputedStyle(banner).position === 'fixed' ? banner.getBoundingClientRect() : null;
  return { top: r.top, bottom: r.bottom, text: s.innerText, vh: innerHeight, bannerTop: b ? b.top : null };
});
const cellBox = (page, label) => page.evaluate(l => {
  const b = [...document.querySelectorAll('[data-testid="cm-calendar-grid"] > button')].find(x => x.getAttribute('aria-label') === l);
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, label);
async function calendarTaps(page, tag, { banner = false } = {}) {
  await page.locator('[data-testid="cm-calendar-grid"]').waitFor({ timeout: 15000 });
  /* Where a player stands: the calendar opened from the hub's tiles, the first
     row on screen, scrolled only if it was not (its bottom placed 120 px above
     the fold), so the strip's own place starts below the fold as in the hunt. */
  await page.evaluate(() => {
    const first = document.querySelector('[data-testid="cm-calendar-grid"] > button');
    const r = first.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight - 120) window.scrollTo(0, window.scrollY + r.bottom - (innerHeight - 120));
  });
  await page.waitForTimeout(300);
  /* Before each tap the player brings the day on screen and clear of a strip
     already riding the foot of the screen; that scroll is his, the tap's is
     what is measured. */
  const bringIntoReach = label => page.evaluate(l => {
    const b = [...document.querySelectorAll('[data-testid="cm-calendar-grid"] > button')].find(x => x.getAttribute('aria-label') === l);
    const s = document.querySelector('[data-testid="cm-calendar-day"]');
    const r = b.getBoundingClientRect();
    const limit = s ? s.getBoundingClientRect().top - 8 : innerHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, r.bottom - limit + 8);
    else if (r.top < 8) window.scrollBy(0, r.top - 60);
  }, label);
  const labels = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('[data-testid="cm-calendar-grid"] > button')];
    const match = cells.find(b => /: (vs|at|v) /.test(b.getAttribute('aria-label') ?? ''));
    return { first: cells[0]?.getAttribute('aria-label'), last: cells[cells.length - 1]?.getAttribute('aria-label'), match: match?.getAttribute('aria-label') ?? null };
  });
  const plan = [['first row, an in page click', labels.first, 'dom'], ['last row, a real click', labels.last, 'mouse'], ['a match day, a real click', labels.match, 'locator']].filter(p => p[1]);
  for (const [what, label, how] of plan) {
    await bringIntoReach(label);
    await page.waitForTimeout(250);
    const before = await page.evaluate(() => window.scrollY);
    const cell = await cellBox(page, label);
    if (how === 'dom') await page.evaluate(l => [...document.querySelectorAll('[data-testid="cm-calendar-grid"] > button')].find(b => b.getAttribute('aria-label') === l)?.click(), label);
    else if (how === 'mouse') await page.mouse.click(cell.x, cell.y);
    else await page.locator(`[data-testid="cm-calendar-grid"] > button[aria-label="${label.replace(/"/g, '\\"')}"]`).click();
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => window.scrollY);
    const strip = await stripBox(page);
    const cellAfter = await cellBox(page, label);
    const day = label.split(':')[0];
    check('B', Math.round(after - before) === 0, `${tag} ${what}: the page moved ${Math.round(after - before)} px (scrollY ${Math.round(before)} to ${Math.round(after)})`);
    check('B', !!strip && strip.top >= -1 && strip.bottom <= strip.vh + 1, `${tag} ${what}: the day strip is wholly on screen (${strip ? `${Math.round(strip.top)} to ${Math.round(strip.bottom)} of ${strip.vh}` : 'no strip'})`);
    check('B', !!cellAfter && cellAfter.top >= -1 && cellAfter.bottom <= (strip?.vh ?? 0) + 1, `${tag} ${what}: the tapped day is still on screen (${cellAfter ? Math.round(cellAfter.top) : '?'} px)`);
    check('B', !!strip && strip.text.includes(day), `${tag} ${what}: the strip names the day "${day}"`);
    if (banner) check('B', !!strip && strip.bannerTop !== null && strip.bottom <= strip.bannerTop + 1, `${tag} ${what}: the strip clears the cookie banner (strip bottom ${strip ? Math.round(strip.bottom) : '?'}, banner top ${strip?.bannerTop === null ? 'none' : Math.round(strip?.bannerTop ?? 0)})`);
  }
}
const OLD_NAMES = /Rest first|Full training/;
async function intensityNames(page, heading) {
  return page.evaluate(h => {
    const head = [...document.querySelectorAll('div.uppercase')].find(d => d.textContent.includes(h));
    const card = head ? head.parentElement : null;
    return card ? [...card.querySelectorAll('.grid > button')].map(b => b.innerText.trim().split('\n').filter(Boolean).find(t => !/^\p{Extended_Pictographic}/u.test(t)) ?? '') : [];
  }, heading);
}
if (SECTIONS.has('B')) {
  console.log('B. Calendar: day taps move nothing, one name for one setting');
  const runs = [
    { id: 'celta-320', size: 's320', era: '2026-27', nation: 'Spain', league: 'La Liga', club: 'Celta Vigo', take: false },
    { id: 'liverpool-390', size: 's390', era: '2026-27', nation: 'England', league: 'Premier League', club: 'Liverpool', take: false },
    { id: 'aberdeen-1280', size: 's1280', era: '2026-27', nation: 'Scotland', league: 'Scottish Premiership', club: 'Aberdeen', take: false },
  ];
  for (const r of runs) {
    const { ctx, page, errors } = await openPage(HEAD, SIZE[r.size]);
    try {
      if (CONTROL === 'nosticky') await ctx.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
        const st = document.createElement('style');
        st.textContent = '[data-testid="cm-calendar-day"] { position: static !important; }';
        document.head.appendChild(st);
      }));
      await startCareer(page, HEAD, r);
      /* Stand where the head lands (a no op there): the hub header 12 px from
         the top, which is where a player on the base build scrolls to find the
         tiles. */
      await page.evaluate(() => { const h = document.querySelector('[data-testid="cm-show-slots"]').closest('header'); window.scrollTo(0, window.scrollY + h.getBoundingClientRect().top - 12); });
      await clickTile(page, 'Calendar');
      await calendarTaps(page, r.id);
      await shot(page, `B-${r.id}-calendar`);
      const cal = await intensityNames(page, 'Between matches');
      const calText = await page.locator('body').innerText();
      check('B', cal.join(',') === 'Light,Normal,Double', `${r.id}: the calendar's intensity buttons read ${cal.join(', ')}`);
      check('B', !OLD_NAMES.test(calText), `${r.id}: the calendar says neither Rest first nor Full training`);
      await page.locator('button', { hasText: 'Club home' }).first().click();
      await clickTile(page, 'Training');
      await page.waitForTimeout(600);
      const tr = await intensityNames(page, 'How hard you work them');
      const trText = await page.locator('body').innerText();
      check('B', tr.join(',') === 'Light,Normal,Double', `${r.id}: the training panel's intensity buttons read ${tr.join(', ')}`);
      check('B', !OLD_NAMES.test(trText), `${r.id}: the training panel says neither Rest first nor Full training`);
      if (errors.length) fail('B', `${r.id}: page error ${errors[0].slice(0, 160)}`);
    } catch (e) {
      fail('B', `${r.id}: ${String(e).split('\n')[0].slice(0, 200)}`);
      await shot(page, `B-${r.id}-stuck`);
    }
    await ctx.close();
  }
  /* The cookie banner left up: the strip rides above it, never under it. */
  const { ctx, page } = await openPage(HEAD, SIZE.s390, { consent: false });
  try {
    await page.goto(`${HEAD}/club-manager`, { waitUntil: 'domcontentloaded' });
    await page.locator('[role="region"][aria-label="Cookie choices"]').waitFor({ timeout: 15000 });
    const press = async loc => { await loc.first().waitFor({ timeout: 15000 }); await loc.first().evaluate(b => b.click()); await page.waitForTimeout(500); };
    await press(page.locator('button', { hasText: '2026-27' }));
    await press(page.locator('button', { hasText: 'England' }));
    await press(page.locator('button', { hasText: 'Premier League' }));
    await press(page.locator('button', { hasText: 'Board wants' }).filter({ hasText: 'Liverpool' }));
    await press(page.locator('div.fixed button', { hasText: 'Take the job' }));
    await press(page.getByRole('button', { name: /^Skip: just manage$/ }));
    await page.waitForFunction(() => window.__hubFirst !== null, null, { timeout: 120000 });
    await clickTile(page, 'Calendar');
    await calendarTaps(page, 'banner-390', { banner: true });
    await shot(page, 'B-banner-390');
  } catch (e) {
    fail('B', `banner-390: ${String(e).split('\n')[0].slice(0, 200)}`);
  }
  await ctx.close();
}

/* ---------------- C. Fit ---------------- */
/* What this round changed, by selector (head only). A spec is a CSS selector,
   or 'card:<uppercase heading>|<selector inside that card>', or
   'text:<tag>|<words>' for an element found by its words. */
const FIT = {
  hub: {
    font: [['season and mid season pills', '[data-cm-hub] header > div:first-child > span.rounded-full'], ['meter words', '[data-cm-meter] > div:first-child'], ['tile value', '[data-cm-hub] .grid > button > div.uppercase + div'], ['tile line', '[data-cm-hub] .grid > button > div.uppercase + div + div']],
    controls: [['help button', 'button[aria-label="How to play"]'], ['Managers button', '[data-testid="cm-show-slots"]'], ['meter button', '[data-cm-meter]']],
    cut: [['pills', '[data-cm-hub] header > div:first-child > span.rounded-full'], ['tile value', '[data-cm-hub] .grid > button > div.uppercase + div'], ['tile line', '[data-cm-hub] .grid > button > div.uppercase + div + div']],
  },
  team: {
    font: [['Board wants line', '[data-cm-board-wants]']],
    cut: [['Board wants line', '[data-cm-board-wants]'], ['Board wants demand', '[data-cm-board-wants] span']],
  },
  calendar: {
    font: [['day strip', '[data-testid="cm-calendar-day"]'], ['intensity buttons', 'card:Between matches|.grid > button']],
    controls: [['previous month', 'button[aria-label="Previous month"]'], ['next month', 'button[aria-label="Next month"]'], ['Sim to', '[data-testid="cm-calendar-day"] button'], ['intensity button', 'card:Between matches|.grid > button'], ['Club home', 'text:button|Club home']],
    cut: [['day strip lines', '[data-testid="cm-calendar-day"] div']],
  },
  training: {
    font: [['intensity label', 'card:How hard you work them|.grid > button > div:nth-child(2)'], ['intensity line', 'card:How hard you work them|p']],
    controls: [['Club home', 'text:button|Club home']],
    cut: [],
  },
};
function measureInPage({ spec, control }) {
  const resolve = s => {
    if (s.startsWith('card:')) {
      const [heading, sub] = s.slice(5).split('|');
      const head = [...document.querySelectorAll('div.uppercase')].find(d => d.textContent.includes(heading));
      return head ? [...head.parentElement.querySelectorAll(sub)] : [];
    }
    if (s.startsWith('text:')) {
      const [tag, words] = s.slice(5).split('|');
      return [...document.querySelectorAll(tag)].filter(e => e.textContent.trim().endsWith(words));
    }
    return [...document.querySelectorAll(s)];
  };
  const shown = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const own = el => [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
  const texts = [...document.querySelectorAll('body *')].filter(el => own(el).length && shown(el) && !el.closest('[role="dialog"]') && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName));
  const px = el => parseFloat(getComputedStyle(el).fontSize);
  const small = texts.filter(el => px(el) < 12).length;
  const font = [];
  for (const [name, s] of spec.font ?? []) for (const root of resolve(s).filter(shown)) {
    for (const el of [root, ...root.querySelectorAll('*')]) if (own(el).length && shown(el) && px(el) < 12) font.push(`${name}: "${el.textContent.trim().slice(0, 40)}" at ${px(el)}px`);
  }
  const controls = [];
  const sizes = [];
  for (const [name, s] of spec.controls ?? []) for (const el of resolve(s).filter(shown)) {
    const r = el.getBoundingClientRect();
    sizes.push(`${name} ${Math.round(r.width)}x${Math.round(r.height)}`);
    if (r.width < 43.5 || r.height < 43.5) controls.push(`${name} is ${r.width.toFixed(1)} by ${r.height.toFixed(1)} px`);
  }
  const cut = [];
  for (const [name, s] of spec.cut ?? []) for (const el of resolve(s).filter(shown)) {
    if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) cut.push(`${name}: "${el.textContent.trim().slice(0, 40)}" (${el.scrollWidth}/${el.clientWidth} wide, ${el.scrollHeight}/${el.clientHeight} tall)`);
  }
  const trigger = document.querySelector('button[aria-label="How to play"]');
  let overlaps = 0;
  const overlapWords = [];
  if (trigger && shown(trigger)) {
    const t = trigger.getBoundingClientRect();
    for (const el of texts) {
      if (trigger.contains(el)) continue;
      for (const n of own(el)) {
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const r of range.getClientRects()) {
          const w = Math.min(r.right, t.right) - Math.max(r.left, t.left);
          const h = Math.min(r.bottom, t.bottom) - Math.max(r.top, t.top);
          if (w > 1 && h > 1) { overlaps += 1; overlapWords.push(n.textContent.trim().slice(0, 30)); }
        }
      }
    }
  }
  const cell = document.querySelector('[data-testid="cm-calendar-grid"] > button');
  const cellSize = cell ? `${Math.round(cell.getBoundingClientRect().width)}x${Math.round(cell.getBoundingClientRect().height)}` : null;
  return { small, font, controls, sizes, cut, overlaps, overlapWords: overlapWords.slice(0, 4), sideways: document.documentElement.scrollWidth > window.innerWidth + 1, cellSize, control };
}
/* The hub's tiles as drawn: each tile's value and line, its height, and how
   many lines each wraps to. Read off the hub root by the Managers button, so
   it reads the base build too. */
const readTiles = page => page.evaluate(() => {
  const root = document.querySelector('[data-testid="cm-show-slots"]')?.closest('header')?.parentElement;
  const out = {};
  if (!root) return out;
  const lines = el => {
    const cs = getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
    return Math.round(el.getBoundingClientRect().height / lh);
  };
  for (const b of root.querySelectorAll('.grid > button')) {
    const divs = [...b.querySelectorAll(':scope > div')];
    const i = divs.findIndex(d => d.classList.contains('uppercase'));
    if (i < 0) continue;
    const value = divs[i + 1];
    const sub = divs[i + 2];
    out[divs[i].textContent.trim()] = {
      value: value ? value.innerText.trim() : '', sub: sub ? sub.innerText.trim() : '',
      h: Math.round(b.getBoundingClientRect().height), valueLines: value ? lines(value) : 0, subLines: sub ? lines(sub) : 0,
    };
  }
  return out;
});
const panelText = async (page, title) => {
  if (!(await clickTile(page, title))) return null;
  await page.waitForTimeout(700);
  const text = await page.evaluate(() => document.querySelector('[data-testid="cm-show-slots"]')?.closest('header')?.parentElement?.innerText ?? '');
  await page.locator('button', { hasText: 'Club home' }).first().evaluate(b => b.click()).catch(() => {});
  await page.waitForTimeout(300);
  return text;
};
const toMillions = s => {
  const m = /(-?)\D*?([\d.]+)(bn|m|k)/.exec(s ?? '');
  if (!m) return null;
  const n = Number(m[2]) * (m[3] === 'bn' ? 1000 : m[3] === 'k' ? 0.001 : 1);
  return m[1] === '-' ? -n : n;
};
/* The tile words of section C and E: each tile agrees with its own screen. */
async function checkTiles(page, section, tag) {
  const tiles = await readTiles(page);
  const header = await page.evaluate(() => document.querySelector('[data-testid="cm-show-slots"]')?.closest('header')?.innerText ?? '');
  for (const [title, t] of Object.entries(tiles)) {
    check(section, t.valueLines <= 2 && t.subLines <= 2, `${tag}: the ${title} tile wraps to ${t.valueLines} and ${t.subLines} line(s), ${t.h}px tall ("${t.value}" over "${t.sub}")`);
  }
  const record = /^([\d,]+)W ([\d,]+)D ([\d,]+)L$/;
  if (tiles.Manager && record.test(tiles.Manager.value)) {
    const panel = await panelText(page, 'Manager');
    check(section, !!panel && panel.includes(tiles.Manager.value), `${tag}: the Manager tile's "${tiles.Manager.value}" is the record the Manager panel prints`);
  } else if (tiles.Manager) check(section, !/W [\d,]+L/.test(tiles.Manager.value + tiles.Manager.sub) || /D /.test(tiles.Manager.value + tiles.Manager.sub), `${tag}: the Manager tile counts draws wherever it prints a record ("${tiles.Manager.value}", "${tiles.Manager.sub}")`);
  if (tiles.Inbox) {
    const panel = (await panelText(page, 'Inbox')) ?? '';
    const empty = panel.includes('Nobody has texted you yet');
    check(section, (tiles.Inbox.sub === 'No messages yet') === empty, `${tag}: the Inbox tile says "${tiles.Inbox.value}" over "${tiles.Inbox.sub}", and the panel ${empty ? 'is empty' : 'holds something'}`);
    if (!['No messages yet', 'Red card appeal'].includes(tiles.Inbox.sub)) check(section, panel.includes(tiles.Inbox.sub), `${tag}: the Inbox panel names "${tiles.Inbox.sub}" too`);
    check(section, /^(All quiet|[\d,]+ new)$/.test(tiles.Inbox.value), `${tag}: the Inbox tile's count reads "${tiles.Inbox.value}"`);
  }
  if (tiles.League && /Season not started/.test(header)) check(section, !tiles.League.value.startsWith('#'), `${tag}: at week 0 the League tile reads "${tiles.League.value}", not a rank, under "Season not started"`);
  if (tiles.Finances) {
    if (!(await clickTile(page, 'Finances'))) fail(section, `${tag}: no Finances tile to open`);
    else {
      await page.locator('[data-projection-total="result"]').waitFor({ timeout: 10000 }).catch(() => {});
      const desk = await page.evaluate(() => {
        const cell = s => document.querySelector(`${s} td:last-child`)?.textContent ?? null;
        return { result: cell('[data-projection-total="result"]'), wages: cell('[data-projection-line="playerWages"]'), staff: cell('[data-projection-line="staffWages"]'), travel: cell('[data-projection-line="travel"]') };
      });
      await page.locator('button', { hasText: 'Club home' }).first().evaluate(b => b.click()).catch(() => {});
      await page.waitForTimeout(300);
      const parts = [desk.result, desk.wages, desk.staff, desk.travel].map(toMillions);
      const tile = toMillions(tiles.Finances.value);
      const want = parts.every(v => v !== null) ? parts.reduce((a, b) => a + b, 0) : null;
      /* The desk prints each line rounded to a tenth, so four rounded terms can
         drift 0.2 from the tile's own rounding of the exact sum. */
      check(section, want !== null && tile !== null && Math.abs(tile - want) <= 0.25, `${tag}: the Finances tile's ${tiles.Finances.value} is the kitty change of the desk's own lines (result ${desk.result} plus wages ${desk.wages}, staff ${desk.staff}, travel ${desk.travel} = ${want === null ? '?' : want.toFixed(2)})`);
    }
  }
  return tiles;
}
async function measure(page, screen) {
  return page.evaluate(measureInPage, { spec: FIT[screen] ?? {}, control: CONTROL });
}
async function fitVisit(url, sizeKey, career) {
  const out = {};
  const { ctx, page, errors } = await openPage(url, SIZE[sizeKey]);
  try {
    if (CONTROL === 'small' || CONTROL === 'cut') await ctx.addInitScript(c => document.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style');
      st.textContent = c === 'small'
        ? '[data-cm-hub] .grid > button > div.uppercase + div + div { font-size: 11px !important; }'
        : '[data-cm-board-wants] { max-width: 40px !important; white-space: nowrap !important; overflow: hidden !important; }';
      document.head.appendChild(st);
    }), CONTROL);
    await startCareer(page, url, career, async name => { out[name] = await measure(page, name); });
    await page.waitForTimeout(1200);
    out.hub = await measure(page, 'hub');
    out.hub.cls = await page.evaluate(() => window.__clsAfterHub);
    out.tiles = url === HEAD ? await checkTiles(page, 'C', `${sizeKey} ${career.club}`) : await readTiles(page);
    await clickTile(page, 'Calendar');
    await page.locator('[data-testid="cm-calendar-grid"]').waitFor({ timeout: 15000 });
    await page.evaluate(() => [...document.querySelectorAll('[data-testid="cm-calendar-grid"] > button')].find(b => /: (vs|at|v) /.test(b.getAttribute('aria-label') ?? ''))?.click());
    await page.waitForTimeout(400);
    out.calendar = await measure(page, 'calendar');
    await page.locator('button', { hasText: 'Club home' }).first().evaluate(b => b.click());
    await clickTile(page, 'Training');
    await page.waitForTimeout(500);
    out.training = await measure(page, 'training');
    out.errors = errors;
  } catch (e) {
    out.broke = String(e).split('\n')[0].slice(0, 200);
  }
  await ctx.close();
  return out;
}
const FIT_RUNS = [
  { size: 's320', career: { era: '2026-27', nation: 'England', league: 'Premier League', club: 'Liverpool', take: false, entry: 'Autumn' } },
  { size: 's390', career: { era: '2026-27', nation: 'England', league: 'Premier League', club: 'Liverpool', take: false } },
  { size: 's1280', career: { era: '2026-27', nation: 'Spain', league: 'La Liga', club: 'Celta Vigo', take: false, entry: 'New year' } },
];
if (SECTIONS.has('C')) {
  console.log('C. Fit: sizes, controls, cut text, the help button, sideways scroll, layout shift');
  for (const run of FIT_RUNS) {
    const head = await fitVisit(HEAD, run.size, run.career);
    const base = BASE_BUILD ? await fitVisit(BASE_BUILD, run.size, run.career) : null;
    fs.writeFileSync(path.join(OUT, `C-${run.size}.json`), JSON.stringify({ head, base }, null, 1));
    const tag = `${run.size} ${run.career.club}`;
    if (head.broke) { fail('C', `${tag}: the visit broke (${head.broke})`); continue; }
    for (const screen of ['era', 'nation', 'league', 'team', 'dugout', 'hub', 'calendar', 'training']) {
      const m = head[screen];
      if (!m) continue;
      const b = base?.[screen];
      for (const f of m.font) fail('C', `${tag} ${screen}: under 12px: ${f}`);
      for (const c of m.controls) fail('C', `${tag} ${screen}: under 44px: ${c}`);
      for (const c of m.cut) fail('C', `${tag} ${screen}: cut: ${c}`);
      check('C', !m.sideways, `${tag} ${screen}: no sideways page scroll`);
      if (screen === 'hub') check('C', m.overlaps === 0, `${tag} hub: the help button covers ${m.overlaps} piece(s) of header text${m.overlapWords.length ? ` (${m.overlapWords.join(', ')})` : ''}`);
      else if (b) check('C', m.overlaps <= b.overlaps, `${tag} ${screen}: the help button covers ${m.overlaps} piece(s) of text, ${b.overlaps} on the base`);
      if (b) check('C', m.small <= b.small, `${tag} ${screen}: ${m.small} text elements under 12px, ${b.small} on the base`);
      else console.log(`  INFO  C  ${tag} ${screen}: ${m.small} text elements under 12px, help overlaps ${m.overlaps}`);
      if (!m.font.length && !m.controls.length && !m.cut.length && (m.sizes.length || screen === 'hub')) pass('C', `${tag} ${screen}: changed text at 12px or more, controls at 44px or more (${m.sizes.join(', ') || 'none here'})`);
      if (m.cellSize) console.log(`  INFO  C  ${tag} ${screen}: a calendar day cell is ${m.cellSize} px (a seventh of the grid, 46px tall by rule)`);
    }
    check('C', (head.hub?.cls ?? 1) === 0, `${tag} hub: layout shift after the first hub frame ${head.hub?.cls}`);
    if (head.errors?.length) fail('C', `${tag}: page error ${head.errors[0].slice(0, 160)}`);
    for (const [title, t] of Object.entries(head.tiles ?? {})) console.log(`  INFO  C  ${tag} tile ${title}: ${t.h}px on head${base?.tiles?.[title] ? `, ${base.tiles[title].h}px on base` : ''} ("${t.value}" over "${t.sub}")`);
  }
}

/* ---------------- F. Motion and help ---------------- */
if (SECTIONS.has('F')) {
  console.log('F. Reduced motion and the help');
  for (const sizeKey of ['s320', 's390', 's1280']) {
    const { ctx, page } = await openPage(HEAD, SIZE[sizeKey], { reduced: true });
    try {
      await startCareer(page, HEAD, { era: '2026-27', nation: 'England', league: 'Premier League', club: 'Liverpool', take: false });
      const tiles = page.locator('[data-cm-hub] .grid > button:has(> div.uppercase)');
      await tiles.nth(0).hover();
      await tiles.nth(1).hover();
      await page.waitForTimeout(300);
      const running = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => a.animationName ?? a.transitionProperty ?? 'animation'));
      check('F', running.length === 0, `${sizeKey}: nothing animates on the hub under reduced motion after hovering two tiles (${running.length ? running.join(', ') : 'none running'})`);
      await page.locator('button[aria-label="How to play"]').first().click();
      const dialog = page.getByRole('dialog', { name: 'How to Play Club Manager' });
      await dialog.waitFor({ timeout: 10000 });
      const text = await dialog.innerText();
      check('F', text.length > 200, `${sizeKey}: the help opens with its rules (${text.length} characters)`);
      const stale = ['Rest first', 'Full training', 'run-in simulated'].filter(w => text.includes(w));
      check('F', stale.length === 0, `${sizeKey}: the help names none of the retired words${stale.length ? ` (found ${stale.join(', ')})` : ''}`);
      await page.keyboard.press('Escape');
    } catch (e) {
      fail('F', `${sizeKey}: ${String(e).split('\n')[0].slice(0, 200)}`);
    }
    await ctx.close();
  }
}

/* ---------------- D. Must not move ---------------- */
function tileTitles(page) { return page.evaluate(() => [...document.querySelectorAll('button')]
  .map(b => b.querySelector(':scope > div.uppercase'))
  .filter(Boolean)
  .map(d => d.textContent.trim())); }
function clickTile(page, title) { return page.evaluate(t => {
  const b = [...document.querySelectorAll('button')].find(x => x.querySelector(':scope > div.uppercase')?.textContent.trim() === t);
  if (b) b.click();
  return !!b;
}, title); }
async function backHome(page) {
  const vis = async loc => (await loc.count()) > 0 && await loc.first().isVisible().catch(() => false);
  const home = page.locator('button', { hasText: 'Club home' });
  if (await vis(home)) await home.first().evaluate(b => b.click());
  const back = page.getByRole('button', { name: /^Back$/ });
  if (await vis(back)) await back.first().evaluate(b => b.click());
  const tab = page.getByRole('tab', { name: /^Home$/ });
  if (await vis(tab) && (await tab.first().getAttribute('aria-selected')) !== 'true') await tab.first().click();
  await page.waitForTimeout(250);
}
/* The button of a labelled card, by the card's uppercase heading and its place:
   the same press on a build that names the buttons differently. */
const cardButton = (page, heading, index) => page.evaluate(([h, i]) => {
  const head = [...document.querySelectorAll('div.uppercase')].find(d => d.textContent.includes(h));
  const b = head ? head.parentElement.querySelectorAll('.grid > button')[i] : null;
  if (b) b.click();
  return !!b;
}, [heading, index]);

async function playCareer(url, career, drift) {
  const { ctx, page, errors } = await openPage(url, SIZE[career.size], { seed: career.seed, drift });
  const log = [];
  await startCareer(page, url, career);
  for (const t of await tileTitles(page)) {
    if (!(await clickTile(page, t))) { log.push(`no tile ${t}`); continue; }
    await page.waitForTimeout(300);
    log.push(`tile ${t}`);
    await backHome(page);
  }
  await clickTile(page, 'Calendar');
  await page.locator('[data-testid="cm-calendar-grid"]').waitFor({ timeout: 15000 });
  const taps = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('[data-testid="cm-calendar-grid"] > button')];
    const match = cells.find(b => /: (vs|at|v) /.test(b.getAttribute('aria-label') ?? ''));
    const picks = [cells[0], cells[cells.length - 1], match].filter(Boolean);
    return picks.map(b => b.getAttribute('aria-label'));
  });
  for (const label of taps) {
    await page.evaluate(l => [...document.querySelectorAll('[data-testid="cm-calendar-grid"] > button')].find(b => b.getAttribute('aria-label') === l)?.click(), label);
    await page.waitForTimeout(250);
  }
  log.push(`calendar taps ${taps.length}`);
  log.push(`calendar intensity ${await cardButton(page, 'Between matches', 0)}`);
  await page.waitForTimeout(250);
  await backHome(page);
  await clickTile(page, 'Training');
  await page.waitForTimeout(400);
  log.push(`training intensity ${await cardButton(page, 'How hard you work them', 2)}`);
  await page.waitForTimeout(250);
  await backHome(page);
  let quick = 0;
  for (let i = 0; i < 24; i += 1) {
    const word = await advance(page, 'quick');
    log.push(word);
    if (word === 'quick') quick += 1;
    await page.waitForTimeout(word === 'quick' ? 1500 : 500);
    if (quick === 3 && word === 'continue') break;
  }
  await page.waitForTimeout(800);
  const state = await page.evaluate(() => {
    const keys = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k.startsWith('dukb-club-manager') || k.startsWith('dukb-cm-')) keys[k] = localStorage.getItem(k);
    }
    return { keys, draws: window.__draws };
  });
  await ctx.close();
  return { ...state, log, quick, errors };
}

/* The first place two JSON values part, as a path, for the report. */
function firstDiff(a, b, at = '$') {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = firstDiff(a[k], b[k], `${at}.${k}`);
      if (d) return d;
    }
  }
  return `${at}: ${JSON.stringify(a)?.slice(0, 80)} against ${JSON.stringify(b)?.slice(0, 80)}`;
}
const parse = s => { try { return JSON.parse(s); } catch { return s; } };

const CAREERS = [
  { id: 'liverpool-take-seed1', size: 's390', seed: 1, era: '2026-27', nation: 'England', league: 'Premier League', club: 'Liverpool', take: true },
  { id: 'celta-skip-seed2', size: 's320', seed: 2, era: '2026-27', nation: 'Spain', league: 'La Liga', club: 'Celta Vigo', take: false },
  { id: 'everton2005-newyear-seed3', size: 's1280', seed: 3, era: '2005-06', nation: 'England', league: 'Premier League', club: 'Everton', take: false, entry: 'New year' },
];
let dDiffs = 0;
if (SECTIONS.has('D')) {
  console.log(`D. Must not move: base ${BASE_BUILD} against head ${HEAD}`);
  for (const career of CAREERS) {
    let base, head;
    try {
      base = await playCareer(BASE_BUILD, career, false);
      head = await playCareer(HEAD, career, CONTROL === 'drift');
    } catch (e) {
      fail('D', `${career.id}: the walk broke (${String(e).split('\n')[0].slice(0, 200)})`);
      continue;
    }
    fs.writeFileSync(path.join(OUT, `D-${career.id}.json`), JSON.stringify({ base, head }, null, 1));
    const names = [...new Set([...Object.keys(base.keys), ...Object.keys(head.keys)])].sort();
    let same = true;
    for (const k of names) {
      if (base.keys[k] === head.keys[k]) continue;
      same = false;
      dDiffs += 1;
      fail('D', `${career.id}: ${k} differs, ${firstDiff(parse(base.keys[k]), parse(head.keys[k]))}`);
    }
    if (same) pass('D', `${career.id}: ${names.length} saved keys byte equal (${names.map(k => `${k} ${base.keys[k]?.length ?? 0} bytes`).join(', ')})`);
    check('D', base.draws === head.draws, `${career.id}: Math.random draws ${base.draws} on base, ${head.draws} on head`);
    check('D', base.quick === 3 && head.quick === 3, `${career.id}: three Quick Sims on each build (${base.quick}, ${head.quick})`);
    check('D', base.log.join('|') === head.log.join('|'), `${career.id}: the same ${head.log.length} presses on both builds`);
    if (head.errors.length) fail('D', `${career.id}: page error on head ${head.errors[0].slice(0, 160)}`);
  }
}

/* ---------------- E. Old saves ---------------- */
const BAD = ['undefined', 'NaN', '[object Object]', 'Infinity'];
const OLD_SAVES = ['cmOldSave1052Fixture.json', 'cmSecondTierOldSaveFixture.json'];
async function resumeOldSave(file, size) {
  const raw = fs.readFileSync(path.join('scripts', 'data', file), 'utf8');
  const { ctx, page, errors } = await openPage(HEAD, size);
  await ctx.addInitScript(([k, v]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch { /* storage blocked */ } }, [SAVE_KEY, raw]);
  await page.goto(`${HEAD}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.locator('button', { hasText: 'Resume Career' }).first().click({ timeout: 20000 });
  await page.waitForFunction(() => window.__hubFirst !== null, null, { timeout: 60000 });
  await page.waitForTimeout(600);
  return { ctx, page, errors };
}
const hubText = page => page.evaluate(() => {
  const root = document.querySelector('[data-testid="cm-show-slots"]')?.closest('header')?.parentElement;
  return root ? root.innerText : '';
});
if (SECTIONS.has('E')) {
  console.log('E. Old saves resume to a whole hub');
  for (const file of OLD_SAVES) {
    try {
      const { ctx, page, errors } = await resumeOldSave(file, SIZE.s390);
      const first = await page.evaluate(() => window.__hubFirst);
      check('E', landed(first), `${file}: the hub header is on screen on the first frame after Resume (top ${Math.round(first.top)} px)`);
      const text = await hubText(page);
      const bad = BAD.filter(w => text.includes(w));
      check('E', text.length > 200 && bad.length === 0, `${file}: the hub draws ${text.length} characters and none of ${BAD.join(', ')}${bad.length ? ` (found ${bad.join(', ')})` : ''}`);
      if (SECTIONS.has('C')) await checkTiles(page, 'E', `${file} at 390`);
      if (errors.length) fail('E', `${file}: page error ${errors[0].slice(0, 160)}`);
      await shot(page, `E-${file.replace('.json', '')}-390`);
      await ctx.close();
    } catch (e) {
      fail('E', `${file}: ${String(e).split('\n')[0].slice(0, 200)}`);
    }
  }
}

/* ---------------- verdict ---------------- */
await browser.close();
fs.writeFileSync(path.join(OUT, 'landing.json'), JSON.stringify({ landing, fails, counts }, null, 1));
const bySection = s => fails.filter(f => f.section === s).length;
const summary = [...SECTIONS].map(s => `${s} ${counts[s] ?? 0} pass ${bySection(s)} fail`).join(', ');
if (CONTROL) {
  const target = { noscroll: 'A', nosticky: 'B', small: 'C', cut: 'C', drift: 'D' }[CONTROL];
  const fired = bySection(target);
  console.log(fired
    ? `playCmHubLanding: CONTROL ${CONTROL} FIRED, section ${target} went red on ${fired} check(s) (${summary})`
    : `playCmHubLanding: CONTROL ${CONTROL} DID NOT FIRE, section ${target} stayed green (${summary})`);
  process.exit(fired ? 1 : 3);
}
console.log(fails.length
  ? `playCmHubLanding: ${fails.length} failure(s) (${summary})`
  : `playCmHubLanding: green (${summary}); the hub lands on the club on its first frame`);
process.exit(fails.length ? 1 : 0);
