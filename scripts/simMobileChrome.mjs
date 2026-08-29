/**
 * Round 129 harness: the two things you can see on a phone without playing
 * anything.
 *
 * The owner's report came in two sentences and this file is one check per
 * sentence.
 *
 *   "the things on the top of the page overlap and don't look good. Like my
 *    streak and points and stuff."
 *   "if I'm just on my screen and don't touch anything then I can see the phone
 *    and next year and retire and what not. But if I scroll down then it
 *    disappears."
 *
 * PART ONE, the top bar. src/components/game/GameNavbar.tsx renders on all 118
 * routes, so it is the single riskiest component in the repo: fix it and every
 * page is fixed, break it and every page is broken. This measures the real
 * bounding boxes of the bar's children in a real Chromium at 320, 390, 430,
 * 1024 and 1440 wide and fails if any two of them overlap by more than half a
 * pixel, or if anything sticks out past the edge of the window. Boxes, not
 * screenshots. A screenshot of an overlapping navbar looks like a slightly busy
 * navbar; a pair of rectangles that intersect by 65.9px is not an opinion.
 *
 * It runs each width TWICE, signed out and signed in, because the signed out
 * bar is the easy case and it was never the one he was complaining about. The
 * signed in run injects a deliberately nasty day: 98,765 points, world rank
 * #12345, a 365 day streak and every game on the site played. Five figures of
 * points and three figures of streak are the widest numbers this bar can be
 * asked to hold, and the old layout only overlapped by 19.9px at 390 with an
 * empty account against 65.9px with a full one.
 *
 * Signing in for real is not possible from this sandbox (every Supabase call is
 * blocked at the proxy), so the session is planted directly: a well formed
 * auth token in localStorage under the key supabase-js reads, the streak engine's
 * own localStorage shape for the streak, and Playwright route handlers standing
 * in for the two network calls the stats hook makes. That is the real component
 * with real state, not a mock of it.
 *
 * It also asserts all four stats are actually ON the bar when signed in. That
 * is there to stop the cheap fix: hiding the streak or the rank below 640px
 * would make every overlap check pass and would be exactly the bug he reported,
 * since the streak was already hidden on his phone and he asked for it by name.
 *
 * PART TWO, the Soccer Career action bar. It scrolls the real game page in 300px
 * steps from the top of the document to the bottom and, at every stop, records
 * whether the Next Season button is on screen AND hit testable at its own centre
 * point, whether the bar's box overlaps the site footer's box, and how tall the
 * document is. Three things have to hold:
 *
 *   REACHABLE  the controls are usable at every scroll position on the page.
 *   CLEAR      the bar's box never overlaps the footer's box, which is Round
 *              86's concern and it stays satisfied.
 *   STABLE     the document height is the same at every scroll position, so the
 *              page never grows or shrinks under your finger as you scroll and
 *              nothing can oscillate.
 *
 * Serve the production build first, because Playwright cannot reach the live
 * domain from here:
 *   npm run build && npx serve -s dist -l 4173
 * Then: node scripts/simMobileChrome.mjs
 *
 * And RESTART serve after every rebuild, or use a fresh port. npx serve answers
 * index.html out of a cache it fills at startup, so a freshly built bundle
 * sitting on disk is not the bundle it hands out. This has cost previous rounds
 * an afternoon each. SWEEP_BASE=http://127.0.0.1:4174 overrides the port.
 *
 * VERBOSE=1 prints every scroll stop instead of just the interesting ones.
 */
import pw from './lib/playwrightLoader.mjs';
const { chromium } = pw;
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.SWEEP_BASE || process.env.BASE || 'http://127.0.0.1:4173';
const VERBOSE = process.env.VERBOSE === '1';

/* His phone first, then the two ends of the phone range, then the two desktop
   widths where the bar switches back to a single row. 320 is the narrowest
   screen still in the stats (an iPhone SE 1st gen), 430 is a 16 Pro Max, 1024
   is where GameNavbar's lg: rules take over and is the tightest desktop case
   there is, 1440 is a laptop. */
const WIDTHS = [320, 390, 430, 1024, 1440];
const VH = 844;

/* Boxes that touch are fine (a gap of exactly 0 is a legal flex gap rounding
   to nothing). Boxes that share half a pixel of area are a rendering artifact.
   Anything past that is two things drawn on top of each other. */
const OVERLAP_SLACK = 0.5;

/* A sample of routes rather than all 118, because this component is identical
   on every one of them and sweepGames.mjs already walks the full list. These
   five are picked so the PAGE under the bar differs: a career sim with a save,
   a management sim, a draft board, a dynasty sim, and a card game. If the bar
   ever starts depending on what is beneath it, this notices. */
const NAV_ROUTES = ['/soccer-career', '/club-manager', '/dart-draft', '/cfb-dynasty', '/squad-deal'];

const SUPABASE_REF = 'flawuiqbvjobmkfkauhw';
const etToday = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

/* The worst realistic day this bar can be handed. Five figures of points, three
   figures of streak, a five figure rank, and the full set of games played, so
   every field is at its widest at the same time. */
const WORST = { points: 98765, rank: 12345, streak: 365, played: 106 };

const SIGNED_IN_SEED = `
try {
  localStorage.setItem('sb-${SUPABASE_REF}-auth-token', ${JSON.stringify(JSON.stringify({
  access_token: 'harness.not.a.real.token',
  token_type: 'bearer',
  expires_in: 999999,
  expires_at: Math.floor(Date.now() / 1000) + 999999,
  refresh_token: 'harness-refresh',
  user: {
    id: '00000000-0000-4000-8000-000000000129',
    aud: 'authenticated', role: 'authenticated', email: 'harness@example.com',
    app_metadata: {}, user_metadata: {}, identities: [],
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
}))});
  localStorage.setItem('dukb-streaks-v1', ${JSON.stringify(JSON.stringify({
  version: 1,
  global: { current: WORST.streak, longest: WORST.streak, lastDate: etToday },
  perGame: {}, loginDates: [], totalPlays: 0, totalPoints: 0,
}))});
  localStorage.setItem('dukb-local-completions', ${JSON.stringify(JSON.stringify({
    /* Round 320: Round 301 changed this payload from {date, count} to
       {date, slugs} on the Eastern day, and an old-shape payload is
       deliberately read as zero, so planting the retired shape here meant
       the games chip rendered 0 and the signed-in bar was never measured
       at its true widest. Same number of games, current shape. */
    date: etToday, slugs: Array.from({ length: WORST.played }, (_, i) => `g${i}`),
  }))});
} catch (e) {}
`;

const CONSENT_SEED = `try { localStorage.setItem('cookie-consent', 'essential'); } catch (e) {}`;

const failures = [];
const navRows = [];
const barRows = [];

/* ── what gets measured on the top bar ────────────────────────────────────
   The bar is <nav> wrapping one row element. Its direct children are the three
   regions a player sees: the wordmark, the Back button, and the block that
   holds either the stats or the guest chip. Those are the rectangles that
   collided, so those are the rectangles that get compared. Leaf boxes are
   collected too, but only to check nothing has escaped the window, because two
   leaves inside the same region are allowed to sit next to each other. */
const MEASURE_NAV = `(() => {
  const nav = document.querySelector('nav');
  if (!nav) return { err: 'no <nav> on this page' };
  const row = nav.firstElementChild;
  if (!row) return { err: '<nav> has no row element' };
  const box = (el) => { const r = el.getBoundingClientRect(); return {
    x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
    right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1) }; };
  const kids = [...row.children].map((el) => ({
    ...box(el),
    tag: el.tagName.toLowerCase(),
    text: (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 34),
  })).filter((k) => k.w > 0 && k.h > 0);
  const leaves = [];
  (function walk(el) {
    if (!el.children.length) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) leaves.push({ ...box(el), text: (el.innerText || el.tagName).replace(/\\s+/g, ' ').trim().slice(0, 20) });
      return;
    }
    [...el.children].forEach(walk);
  })(row);
  const de = document.documentElement;
  return {
    navH: +nav.getBoundingClientRect().height.toFixed(1),
    kids, leaves,
    text: (nav.innerText || '').replace(/\\s+/g, ' ').trim(),
    scrollW: de.scrollWidth, clientW: de.clientWidth,
  };
})()`;

async function clearBanner(page) {
  for (const name of [/^essential only$/i, /^accept all$/i]) {
    await page.getByRole('button', { name }).first().click({ timeout: 900 }).catch(() => {});
  }
}

async function measureNav(browser, { width, signedIn, route }) {
  const ctx = await browser.newContext({ viewport: { width, height: VH }, ignoreHTTPSErrors: true });
  await ctx.addInitScript(CONSENT_SEED);
  if (signedIn) {
    await ctx.addInitScript(SIGNED_IN_SEED);
    /* The two calls useGameNavbarStats makes. Both are blocked at the proxy in
       this sandbox, so without these the signed in bar would render zeros and
       the widest case would never be measured. */
    await ctx.route('**/rest/v1/rpc/global_rank*', (r) => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([{ total_points: WORST.points, rank: WORST.rank }]),
    }));
    await ctx.route('**/rest/v1/game_completions*', (r) => r.fulfill({
      status: 200, contentType: 'application/json', body: '[]',
    }));
  }
  const page = await ctx.newPage();
  const tag = `${String(width).padStart(4)} ${signedIn ? 'signed in ' : 'signed out'} ${route}`;
  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(1500);
    await clearBanner(page);
    /* The stats arrive from a promise, so the bar is measured after they land,
       not while it is still showing skeleton pills. */
    await page.waitForTimeout(1200);

    const m = await page.evaluate(MEASURE_NAV);
    if (m.err) { failures.push(`${tag}: ${m.err}`); return; }

    const row = { width, signedIn, route, navH: m.navH, kids: m.kids, text: m.text, overlaps: [], overflows: [] };

    for (let i = 0; i < m.kids.length; i++) {
      for (let j = i + 1; j < m.kids.length; j++) {
        const a = m.kids[i], b = m.kids[j];
        const ox = Math.min(a.right, b.right) - Math.max(a.x, b.x);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
        if (ox > OVERLAP_SLACK && oy > OVERLAP_SLACK) {
          row.overlaps.push({ a, b, ox: +ox.toFixed(1), oy: +oy.toFixed(1) });
          failures.push(
            `${tag}: top bar children overlap by ${ox.toFixed(1)}x${oy.toFixed(1)}px, ` +
            `"${a.text}" spans x ${a.x} to ${a.right} and "${b.text}" spans x ${b.x} to ${b.right}`,
          );
        }
      }
    }

    for (const b of [...m.kids, ...m.leaves]) {
      if (b.x < -OVERLAP_SLACK || b.right > width + OVERLAP_SLACK) {
        row.overflows.push(b);
        failures.push(`${tag}: "${b.text}" runs from x ${b.x} to ${b.right} on a ${width}px screen`);
      }
    }
    if (m.scrollW > m.clientW + OVERLAP_SLACK) {
      failures.push(`${tag}: the page scrolls sideways, document is ${m.scrollW}px wide inside a ${m.clientW}px window`);
    }

    /* Every stat present, so the overlap can never be "fixed" by deleting one.
       The streak is the one that matters: it was already hidden below 640 and
       he named it in the complaint. */
    if (signedIn) {
      const want = [
        ['games played', new RegExp(`\\b${WORST.played}\\b`)],
        ['points', new RegExp(WORST.points.toLocaleString('en-US').replace(',', ','))],
        ['the streak', new RegExp(`\\b${WORST.streak}\\b`)],
        ['world rank', new RegExp(`#${WORST.rank}\\b`)],
      ];
      for (const [what, re] of want) {
        if (!re.test(m.text)) failures.push(`${tag}: the bar does not show ${what}, it reads "${m.text}"`);
      }
    }

    /* A bar taller than this is not a bar any more. Three wrapped lines at 320
       would land around 100px; the fixed layout measures 77. */
    if (m.navH > 120) failures.push(`${tag}: the top bar is ${m.navH}px tall, which is too many wrapped lines`);

    navRows.push(row);
  } catch (e) {
    failures.push(`${tag}: threw ${String(e).split('\n')[0].slice(0, 120)}`);
  } finally {
    await ctx.close().catch(() => {});
  }
}

/* ── the Soccer Career action bar ─────────────────────────────────────────
   Reaching a career that HAS an action bar by clicking is genuinely awkward
   (nationality, position and era are shadcn Selects that do not drive from
   Playwright in this sandbox), so the save is built with the real engine in
   node and dropped into localStorage under the key the page reads. Same code
   path the game uses, so this is a real career, and the page boots straight
   into the screen the complaint is about. */
function buildSave() {
  const entry = path.join(os.tmpdir(), 'simMobileChromeSeed.mjs');
  const bundle = path.join(os.tmpdir(), 'simMobileChromeSeed.bundle.mjs');
  fs.writeFileSync(entry, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerCareerEngine.ts');
export { engine };
`);
  execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${entry}" --bundle --format=esm --platform=node --outfile="${bundle}" --log-level=error`);
  return bundle;
}

const { engine } = await import(pathToFileURL(buildSave()).href);
let save = engine.initCareer(
  'Playtest', 'England', 'ST', '2020s',
  { pace: 74, shooting: 76, passing: 72, dribbling: 75, defending: 45, physical: 68, reflexes: 30 },
  72, 2020, engine.FALLBACK_CLUBS, null, 88,
);
save = engine.advanceYouthYear(save, engine.FALLBACK_CLUBS);
/* Signing the first contract is what moves the career out of the youth screen
   and into "playing", which is the phase that owns the Next Season button. */
save = engine.acceptOffer(save, save.pendingOffers[0]);
if (!save || save.phase !== 'playing') {
  console.error(`FAIL: could not build a Soccer Career save in the "playing" phase (got ${save && save.phase}), so the bar he reported is not being measured`);
  process.exit(1);
}

/* Finds the bar without knowing anything about how it is styled, so the same
   file measures the version before the fix and the version after it. Walk up
   from the Next Season button until you hit the box that also holds the AGE
   tile: that is the action bar in both versions. */
const MEASURE_BAR = `(() => {
  const btns = [...document.querySelectorAll('button')];
  const next = btns.find((b) => /next (year|season)/i.test(b.innerText || ''));
  if (!next) return { err: 'no Next Season button on the page' };
  let bar = next.parentElement;
  while (bar && !/\\bAge\\b/i.test(bar.innerText || '')) bar = bar.parentElement;
  if (!bar) return { err: 'found Next Season but not the bar around it' };
  const vh = window.innerHeight;
  const br = bar.getBoundingClientRect();
  const nr = next.getBoundingClientRect();
  const foot = document.querySelector('footer');
  const fr = foot ? foot.getBoundingClientRect() : null;
  const cx = Math.round(nr.left + nr.width / 2);
  const cy = Math.round(nr.top + nr.height / 2);
  const onScreen = nr.bottom > 0 && nr.top < vh && nr.left < window.innerWidth && nr.right > 0;
  const hit = onScreen && cy > 0 && cy < vh ? document.elementFromPoint(cx, cy) : null;
  const overlap = fr ? Math.max(0, Math.min(fr.bottom, br.bottom) - Math.max(fr.top, br.top)) : 0;
  /* The other two things this page welds to the bottom of the phone. They are
     not the bar, but they are the same problem: at the end of the page they were
     parked on the footer's Privacy and Terms links. */
  let floaters = 0, floaterName = '';
  for (const sel of ['button[aria-label="Open your phone"]', 'button[aria-label="Open the training ground"]']) {
    const el = document.querySelector(sel);
    if (!el || !fr) continue;
    const r = el.getBoundingClientRect();
    const o = Math.max(0, Math.min(fr.bottom, r.bottom) - Math.max(fr.top, r.top))
            * (Math.min(fr.right, r.right) > Math.max(fr.left, r.left) ? 1 : 0);
    if (o > floaters) { floaters = o; floaterName = sel; }
  }
  return {
    y: Math.round(window.scrollY),
    docH: document.documentElement.scrollHeight,
    position: getComputedStyle(bar).position,
    barTop: Math.round(br.top), barBottom: Math.round(br.bottom), barH: Math.round(br.height),
    nextTop: Math.round(nr.top), nextBottom: Math.round(nr.bottom),
    onScreen,
    reachable: !!(hit && (hit === next || next.contains(hit) || hit.contains(next))),
    blockedBy: hit && !(hit === next || next.contains(hit) || hit.contains(next))
      ? (hit.tagName.toLowerCase() + ' ' + (hit.className || '').toString().slice(0, 40)) : '',
    footTop: fr ? Math.round(fr.top) : null,
    footBottom: fr ? Math.round(fr.bottom) : null,
    coversFooter: Math.round(overlap),
    floatersCoverFooter: Math.round(floaters),
    floaterName: floaterName.replace('button[aria-label="', '').replace('"]', ''),
  };
})()`;

async function measureActionBar(browser, width) {
  const ctx = await browser.newContext({ viewport: { width, height: VH }, ignoreHTTPSErrors: true });
  await ctx.addInitScript(CONSENT_SEED);
  await ctx.addInitScript(`try { localStorage.setItem('soccerCareerSave', ${JSON.stringify(JSON.stringify(save))}); } catch (e) {}`);
  const page = await ctx.newPage();
  const tag = `action bar @${width}`;
  const rec = { width, stops: 0, unreachable: [], covering: [], heights: new Set(), barH: null, released: 0 };
  try {
    await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(1600);
    await clearBanner(page);
    await page.waitForTimeout(700);

    const first = await page.evaluate(MEASURE_BAR);
    if (first.err) {
      failures.push(`${tag}: ${first.err}, so nothing here was measured`);
      return rec;
    }
    rec.barH = first.barH;
    const maxY = Math.max(0, first.docH - VH);
    /* 300px a step is about a third of a screen, which is roughly how far a
       thumb flick moves this page, so these are positions he actually stops at
       rather than an arbitrary grid. The last stop is the true bottom of the
       document, which is where the footer problem lives. */
    const stops = [];
    for (let y = 0; y <= maxY; y += 300) stops.push(y);
    if (stops[stops.length - 1] !== maxY) stops.push(maxY);

    for (const y of stops) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(260);
      const r = await page.evaluate(MEASURE_BAR);
      if (r.err) { failures.push(`${tag}: ${r.err} at scrollY ${y}`); break; }
      rec.stops += 1;
      rec.heights.add(r.docH);
      if (r.position !== 'fixed') rec.released += 1;
      barRows.push({ width, ...r });

      if (!r.reachable) {
        rec.unreachable.push(r);
        failures.push(
          `${tag}: at scrollY ${r.y} of ${maxY} the Next Season button is not reachable ` +
          `(its box sits at ${r.nextTop} to ${r.nextBottom} on an ${VH}px screen` +
          (r.blockedBy ? `, blocked by ${r.blockedBy}` : '') + ')',
        );
      }
      if (r.coversFooter > 0) {
        rec.covering.push(r);
        failures.push(
          `${tag}: at scrollY ${r.y} the action bar covers ${r.coversFooter}px of the site footer ` +
          `(bar ${r.barTop} to ${r.barBottom}, footer starts at ${r.footTop})`,
        );
      }
      if (r.floatersCoverFooter > 0) {
        rec.covering.push(r);
        failures.push(
          `${tag}: at scrollY ${r.y} the "${r.floaterName}" button covers ${r.floatersCoverFooter}px ` +
          `of the site footer, which is where About, Contact, Privacy and Terms live`,
        );
      }
      if (VERBOSE || !r.reachable || r.coversFooter > 0 || r.floatersCoverFooter > 0) printBar(r, width);
    }

    /* The page must not grow and shrink by the height of the bar as you scroll,
       because a bar that hands its own height back to the document can push the
       thing that released it back out of view and start flickering. That is the
       specific failure being guarded, so the threshold is half the bar rather
       than exact equality: 16px of drift shows up at 320 wide on BOTH the fixed
       and the unfixed build (9715 vs 9731, and 9678 vs 9694 before the fix), it
       is one line of text reflowing after a late font swap, and it has nothing
       to do with this bar. The old bar moved the page by 71 and 72px at 390 and
       430, which is the number that matters and is nowhere near 16. */
    const hs = [...rec.heights].sort((a, b) => a - b);
    rec.heightSpread = hs.length ? hs[hs.length - 1] - hs[0] : 0;
    if (rec.barH && rec.heightSpread >= rec.barH / 2) {
      failures.push(
        `${tag}: the page changed height by ${rec.heightSpread}px while scrolling (${hs.join(' to ')}), ` +
        `which is most of the ${rec.barH}px bar. A bar that adds and removes its own height as you ` +
        'scroll can re-trigger whatever released it.',
      );
    }
  } catch (e) {
    failures.push(`${tag}: threw ${String(e).split('\n')[0].slice(0, 120)}`);
  } finally {
    await ctx.close().catch(() => {});
  }
  return rec;
}

function printBar(r, width) {
  console.log(
    `  ${String(width).padStart(4)}  scrollY ${String(r.y).padStart(5)}  ${r.position.padEnd(7)}  ` +
    `bar ${String(r.barTop).padStart(5)} to ${String(r.barBottom).padStart(5)}  ` +
    `next ${String(r.nextTop).padStart(5)} to ${String(r.nextBottom).padStart(5)}  ` +
    `${r.reachable ? 'reachable  ' : 'UNREACHABLE'}  footer top ${String(r.footTop).padStart(5)}  ` +
    `bar covers ${String(r.coversFooter).padStart(3)}px, floating buttons cover ${String(r.floatersCoverFooter).padStart(3)}px`,
  );
}

/* ── run ──────────────────────────────────────────────────────────────── */
console.log(`Mobile chrome, base ${BASE}`);
console.log(`Top bar measured at ${WIDTHS.join(', ')} wide across ${NAV_ROUTES.length} routes, signed out and signed in.`);
console.log(`Signed in means ${WORST.points.toLocaleString()} points, rank #${WORST.rank}, a ${WORST.streak} day streak and ${WORST.played} games played.\n`);

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--no-proxy-server'],
});

for (const width of WIDTHS) {
  for (const signedIn of [false, true]) {
    /* Every route at his phone width and at the two widths either side of it,
       one route at the desktop widths. The bar does not know what page it is
       on, and five routes times five widths times two states is 50 browser
       loads, which is a slow harness nobody runs. */
    const routes = width <= 430 ? NAV_ROUTES : NAV_ROUTES.slice(0, 1);
    for (const route of routes) await measureNav(browser, { width, signedIn, route });
  }
}

console.log('Top bar, child boxes measured in the browser');
for (const r of navRows) {
  const state = r.signedIn ? 'signed in ' : 'signed out';
  console.log(`  ${String(r.width).padStart(4)}  ${state}  ${r.route.padEnd(15)} bar ${String(r.navH).padStart(5)}px tall   "${r.text.slice(0, 52)}"`);
  if (VERBOSE || r.overlaps.length || r.overflows.length) {
    for (const k of r.kids) {
      console.log(`          ${k.tag.padEnd(6)} x ${String(k.x).padStart(6)} to ${String(k.right).padStart(6)}   y ${String(k.y).padStart(5)} to ${String(k.bottom).padStart(5)}   "${k.text}"`);
    }
  }
  for (const o of r.overlaps) console.log(`          OVERLAP ${o.ox}x${o.oy}px between "${o.a.text}" and "${o.b.text}"`);
  for (const o of r.overflows) console.log(`          OVERFLOW "${o.text}" reaches x ${o.right} on a ${r.width}px screen`);
}

console.log('\nSoccer Career action bar, scrolled top to bottom');
const barRecs = [];
for (const width of [320, 390, 430]) barRecs.push(await measureActionBar(browser, width));
await browser.close();

for (const rec of barRecs) {
  const hs = [...rec.heights].sort((a, b) => a - b);
  console.log(
    `  ${String(rec.width).padStart(4)}  ${String(rec.stops).padStart(3)} scroll stops, bar ${rec.barH}px tall, ` +
    `page ${hs[0]}px${hs.length > 1 ? ` to ${hs[hs.length - 1]}px (${rec.heightSpread}px of drift)` : ''}, ` +
    `controls unreachable at ${rec.unreachable.length} of them, covering the footer at ${rec.covering.length}`,
  );
}
const reach = barRows.filter((r) => r.reachable).length;
if (barRows.length) {
  const lifted = barRows.filter((r) => r.coversFooter === 0 && r.footTop !== null && r.footTop < VH);
  console.log(
    `  ${reach} of ${barRows.length} scroll stops had the controls on screen and hit testable. ` +
    `${lifted.length} of them had the footer showing at the same time with zero pixels of overlap.`,
  );
}

/* A guard that cannot tell a working feature from a deleted one is worthless,
   so say out loud that the bar was actually seen doing its job rather than
   just never failing. */
const provenPinned = barRows.filter((r) => r.position === 'fixed' && r.reachable && r.y > 3000).length;
if (!provenPinned) {
  failures.push(
    'the action bar was never seen pinned and reachable more than 3000px down the page, so this run ' +
    'cannot tell the difference between a fixed bar and a deleted one',
  );
}

console.log('');
if (failures.length) {
  console.log(`RED: ${failures.length} finding${failures.length === 1 ? '' : 's'}`);
  const seen = new Set();
  for (const f of failures) {
    if (seen.has(f)) continue;
    seen.add(f);
    console.log('  - ' + f);
  }
  process.exit(1);
}
console.log(`GREEN: ${navRows.length} top bar measurements and ${barRows.length} scroll stops, no overlaps, nothing off the side of the screen, controls reachable everywhere, footer never covered.`);
