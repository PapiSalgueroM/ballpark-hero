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
async function startCareer(page, url, { era, nation, league, club, take, entry }) {
  await page.goto(`${url}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.locator('button', { hasText: era }).first().click();
  await page.locator('button', { hasText: nation }).first().click();
  const tiles = page.locator('button', { hasText: 'Board wants' });
  await Promise.race([tiles.first().waitFor({ timeout: 15000 }).catch(() => {}), page.locator('button', { hasText: league }).first().waitFor({ timeout: 15000 }).catch(() => {})]);
  if (await tiles.count() === 0) await page.locator('button', { hasText: league }).first().click();
  await tiles.filter({ hasText: club }).first().click();
  await page.locator('div.fixed button', { hasText: 'Take the job' }).first().click();
  const skip = page.getByRole('button', { name: /^Skip: just manage$/ }).first();
  await skip.waitFor({ timeout: 15000 });
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
    const cal = page.locator('button:has(div.uppercase)', { hasText: 'Calendar' });
    if (await has(cal)) { await cal.first().click(); return 'calendar'; }
  }
  if (await has(home)) { await home.first().click(); return 'home'; }
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
      fail('A', `${s.id}: the season review never came up (${steps.slice(-8).join(', ')})`);
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

/* ---------------- D. Must not move ---------------- */
const tileTitles = page => page.evaluate(() => [...document.querySelectorAll('button')]
  .map(b => b.querySelector(':scope > div.uppercase'))
  .filter(Boolean)
  .map(d => d.textContent.trim()));
const clickTile = (page, title) => page.evaluate(t => {
  const b = [...document.querySelectorAll('button')].find(x => x.querySelector(':scope > div.uppercase')?.textContent.trim() === t);
  if (b) b.click();
  return !!b;
}, title);
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
