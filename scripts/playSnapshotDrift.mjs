/**
 * ROUND 280 BROWSER HARNESS: DOES ANY SAVED PAGE SAY SOMETHING THAT IS FALSE
 * TOMORROW?
 *
 * WHY THIS EXISTS AND WHY IT IS SHAPED THIS WAY. Every page except the home
 * page ships as a snapshot: a real document, written once, copied into every
 * later build, and read by crawlers for weeks. That makes any sentence in it
 * that was computed from a clock a lie with a delay on it.
 *
 * The project already had two guards for this and both were lists of known
 * offenders. simPrerender section 7 looks for the sports calendar's own titles.
 * Section 12 looks for an hh:mm:ss countdown. Each was written the round its
 * own bug was found, and neither could have found the next one.
 *
 * The next one was already shipped. The ticker picks four "Fresh daily" games
 * with Date.now() and they were frozen into all 126 committed snapshots, so
 * every page on the site was telling a crawler that today's puzzle is Tier
 * List and would have gone on saying it until the file was rewritten. Found by
 * doing what this harness does rather than by thinking harder about the code.
 *
 * WHAT IT DOES. It loads each sampled route twice in the same browser, once on
 * the real clock and once with the page's own Date shifted forward, captures
 * the same blocks the prerenderer captures, and diffs them. It asserts nothing
 * about WHAT should be there. Whatever differs is, by construction, something a
 * file written once cannot hold, and it does not matter whether anybody thought
 * of it in advance.
 *
 * WHAT DRIFT COSTS, precisely, because the two cases are not the same and the
 * report should not pretend they are. Some drifting text is simply FALSE the
 * next day: "Fresh daily: Tier List" is a claim about today. Other drifting
 * text stays true and merely CHANGES: the rotating "Play Next" trio is three
 * real links to three real games whichever three they are. Both have to be kept
 * out of a snapshot, for different reasons. The first lies. The second rewrites
 * 126 files on every build, which buries real changes in a diff (Round 274) and,
 * since this round, would re-date every page in the sitemap and hand back the
 * "everything changed today" lie the lastmod ledger exists to end.
 *
 * ITS FIRST REAL RUN FOUND THE SECOND CASE, which is the whole argument for a
 * check that diffs rather than one that looks for known strings: the ticker was
 * the bug that prompted this harness, and the trio was already there, on 94 of
 * the 143 shipped documents, unnoticed by three earlier guards.
 *
 * THE SHIFT IS FIVE DAYS, chosen so it crosses a daily rotation without
 * crossing a season, a transfer window or a year boundary, all of which move
 * legitimate content and would report drift that is not a defect.
 *
 * NEGATIVE CONTROL: run with DRIFT_CONTROL=1 and the page is given a line that
 * prints its own date, which must be reported. A harness that has never been
 * seen to fail is not evidence of anything.
 *
 * Run: node scripts/runAllSims.mjs --browser
 *      or BASE=http://127.0.0.1:4173 node scripts/playSnapshotDrift.mjs
 */
import pw from './lib/pwLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const SHIFT_DAYS = 5;
const CONTROL = process.env.DRIFT_CONTROL === '1';

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

/* A spread rather than all 126: the home page, the two biggest sims, a daily
   puzzle, a hub, the two thinnest pages and a legal page. The ticker rides on
   every page, so one route would have caught the bug that prompted this; the
   spread is here for the ones that will not ride on every page. Nine routes at
   two loads each is about ninety seconds, which is affordable in the suite. */
const ROUTES = [
  '/',
  '/soccer-career',
  '/club-manager',
  '/soccer-grid',
  '/soccer',
  '/records',
  '/leaderboard',
  '/whats-new',
  '/about',
];

/* Exactly what scripts/prerender.mjs keeps, so this measures the thing that
   actually gets written rather than a rough approximation of it. Kept in step
   by hand; if the prerenderer's selector changes and this one does not, the
   worst case is that this harness watches slightly more of the page than ships,
   which reports drift that is real but harmless, not drift that is missed. */
const CAPTURE = () => {
  for (const el of Array.from(document.querySelectorAll('[role="dialog"]'))) el.remove();
  for (const el of Array.from(document.querySelectorAll('[data-no-prerender]'))) el.remove();
  const seen = new Set();
  const out = [];
  for (const el of Array.from(document.querySelectorAll('h1, h2, h3, h4, p, li, td, th, blockquote'))) {
    const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
    if (t && t.length < 4000 && !seen.has(t)) { seen.add(t); out.push(t); }
  }
  return out;
};

const clockScript = (days, control) => `(() => {
  const SHIFT = ${days} * 86400000;
  const RealDate = Date;
  const D = function (...a) { return a.length ? new RealDate(...a) : new RealDate(RealDate.now() + SHIFT); };
  D.now = () => RealDate.now() + SHIFT;
  D.parse = RealDate.parse;
  D.UTC = RealDate.UTC;
  D.prototype = RealDate.prototype;
  globalThis.Date = D;
  ${control ? `
  /* NEGATIVE CONTROL: a paragraph whose text is the clock. If the diff below
     does not report this, the diff is not working and nothing else it says
     can be believed. */
  addEventListener('DOMContentLoaded', () => {
    const p = document.createElement('p');
    p.textContent = 'Control line, written on ' + new Date().toDateString();
    document.body.appendChild(p);
  });` : ''}
})();`;

const grab = async (browser, days) => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(clockScript(days, CONTROL));
  const page = await ctx.newPage();
  /* The prerenderer leaves database calls hanging so live rows never freeze
     into a file. Do the same here, or every run diffs today's leaderboard
     against today's leaderboard and reports noise. */
  await page.route('**://*.supabase.co/**', () => {});
  const out = {};
  for (const r of ROUTES) {
    await page.goto(BASE + r, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => (document.body?.innerText ?? '').trim().length > 200, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    out[r] = await page.evaluate(CAPTURE);
  }
  await ctx.close();
  return out;
};

console.log(`playSnapshotDrift: ${ROUTES.length} routes, ${SHIFT_DAYS} days apart${CONTROL ? ', NEGATIVE CONTROL ON' : ''}`);

const browser = await chromium.launch();
let today, later;
try {
  today = await grab(browser, 0);
  later = await grab(browser, SHIFT_DAYS);
} finally {
  await browser.close();
}

let drifted = 0;
for (const r of ROUTES) {
  const a = today[r] ?? [], b = later[r] ?? [];
  if (!a.length) { say(false, `${r} rendered nothing, so this route was not really tested`); continue; }
  const B = new Set(b);
  const gone = a.filter(x => !B.has(x));
  if (!gone.length) { say(true, `${r}: ${a.length} blocks, none of them tied to the day`); continue; }
  drifted += gone.length;
  const A = new Set(a);
  const arrived = b.filter(x => !A.has(x));
  say(false, `${r}: ${gone.length} block(s) change with the clock, so this page cannot be written once and left`);
  for (const g of gone.slice(0, 4)) console.log(`          today: ${JSON.stringify(g.slice(0, 100))}`);
  for (const g of arrived.slice(0, 4)) console.log(`          +${SHIFT_DAYS}d  : ${JSON.stringify(g.slice(0, 100))}`);
}

console.log('');
if (CONTROL) {
  /* Inverted: under the control the harness is SUPPOSED to fail, so a clean
     run is the bug. */
  if (drifted > 0) {
    console.log(`playSnapshotDrift control: green. The injected clock line was caught on ${failures} route(s), so the diff works.`);
    process.exit(0);
  }
  console.log('playSnapshotDrift control: RED. A paragraph printing its own date went unreported, so this harness proves nothing.');
  process.exit(1);
}
if (failures > 0) {
  console.log(`playSnapshotDrift: ${failures} route(s) carry ${drifted} block(s) that will not still be what the file says. Either the line is a claim about today, in which case it is wrong tomorrow, or it is a rotation, in which case it re-dates the page in the sitemap every build. Mark it data-no-prerender either way.`);
  process.exit(1);
}
console.log('playSnapshotDrift: green. Nothing a crawler reads off these pages depends on the day it was written, so a snapshot of any of them is as true next month as it is now.');
