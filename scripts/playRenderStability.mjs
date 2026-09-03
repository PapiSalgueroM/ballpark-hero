/**
 * Round 421 harness: THE SAME PAGE, RENDERED TWICE AT THE SAME INSTANT, MUST
 * SAY THE SAME THING.
 *
 * WHY THIS EXISTS. scripts/prerender.mjs draws every route three times with the
 * page's own clock at 0, 5 and 11 days and writes only the blocks all three
 * agree on. That is a good test for "computed from the date" and it is a
 * TERRIBLE test for anything unstable for another reason, because an unstable
 * block disagrees with itself and gets dropped exactly as though the calendar
 * had moved. The log even calls it "changes with the date", which is what sent
 * this round chasing the calendar for an hour.
 *
 * The real case, measured on /nhl-connect-4: the board is picked by
 * useState(getRandomConnect4Board), prerender.mjs seeds Math.random so a random
 * pick freezes identically in every build (Round 284), and that only holds if
 * the draws happen in the same ORDER every time. React does not promise a
 * useState initialiser runs once; it may start a render, throw it away and
 * retry. When it retried, the initialiser drew AGAIN, the run made 9 draws
 * instead of 8, and the board changed. Whether it retried was a race: the same
 * route at the same clock sample gave 8 draws on one run and 9 on the next. So
 * a page rewrote itself between builds and was re-dated in the sitemap for no
 * real change, which is the one thing scripts/data/lastmod.json exists to stop.
 *
 * WHAT THIS CHECKS, and it is deliberately ignorant of connect 4. Render each
 * route TWICE with the SAME clock and compare the readable blocks. Nothing here
 * knows which pages are random or daily, so it finds the next unstable block as
 * readily as this one. A list of affected games has been written three times in
 * this repo and each one covered what somebody had already found and nothing
 * after.
 *
 * WHAT IT DOES NOT DO. It does not reproduce prerender.mjs's extraction byte for
 * byte (that rebuilds blocks with their links kept in place and caps wrappers).
 * It compares the readable text of the same block elements, which is the signal
 * that matters: if the text moves between two renders at one instant, the three
 * sample intersection downstream cannot mean what it claims.
 *
 * NEGATIVE CONTROL, required by this repo and judged on its own:
 *   RENDER_STABILITY_CONTROL=unstable
 * injects one element whose text is a fresh random number on every load. The
 * run must go red and must name that element. The injection is asserted to have
 * landed, because a control that changes nothing is green for the wrong reason.
 *
 *   node scripts/playRenderStability.mjs
 *   ONLY=/nhl-connect-4,/nba-connect-4 node scripts/playRenderStability.mjs
 *   LIMIT=20 node scripts/playRenderStability.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.STABILITY_PORT || 4488);
const CONTROL = process.env.RENDER_STABILITY_CONTROL || '';
const SETTLE_MS = Number(process.env.PRERENDER_SETTLE || 3500);
/* Five, from the arithmetic in the loop below, not from taste. */
const RENDERS = Math.max(2, Number(process.env.RENDERS || 5));
/* the same seed prerender.mjs uses, because the question is whether the page is
   stable UNDER THAT SEEDING, not whether it is stable with a live generator */
const RANDOM_SEED = 284;

if (CONTROL && CONTROL !== 'unstable') {
  console.error(`RENDER_STABILITY_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
if (!fs.existsSync(path.join(DIST, 'sitemap.xml'))) {
  console.log('NO dist/sitemap.xml. BUILD FIRST. NOT CHECKED.');
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
let routes = [...new Set(
  [...sitemap.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)]
    .map(m => m[1] || '/')
    .map(r => (r.endsWith('/') && r !== '/' ? r.slice(0, -1) : r)),
)];
if (process.env.ONLY) {
  const want = new Set(process.env.ONLY.split(',').map(x => x.trim()));
  routes = routes.filter(r => want.has(r));
  if (!routes.length) { console.error('ONLY matched no route in the sitemap'); process.exit(1); }
}
if (process.env.LIMIT) routes = routes.slice(0, Number(process.env.LIMIT));

const initScript = `(() => {
  window.__DUKB_PRERENDER__ = true;
  (function () {
    let s = ${RANDOM_SEED} | 0;
    Math.random = function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
})();`;

/* The control draws from the REAL generator, not the seeded one, so it is
   unstable no matter what the seeding does. */
const controlScript = `(() => {
  const real = (globalThis.crypto && globalThis.crypto.getRandomValues)
    ? () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
    : () => Date.now();
  addEventListener('DOMContentLoaded', () => {
    const p = document.createElement('p');
    p.id = 'stability-control';
    p.textContent = 'control drift ' + real();
    document.body.appendChild(p);
  });
})();`;

/* A per route budget. Without it one wedged navigation stalls the whole run and
   the harness neither passes nor fails, it just sits there, which is the least
   useful thing a check can do. */
const ROUTE_BUDGET_MS = Number(process.env.ROUTE_BUDGET_MS || 120000);

const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));

const browser = await chromium.launch({ args: ['--no-sandbox'] });

async function render(route) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(initScript);
  if (CONTROL === 'unstable') await ctx.addInitScript(controlScript);
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* blocked */ } });
  /* identical to prerender.mjs: live data hangs rather than lands, so the page
     shows its static copy and its normal loading state */
  await page.route('**://*.supabase.co/**', () => { /* never settled on purpose */ });
  await page.route('**://*.googletagmanager.com/**', r => r.abort());
  await page.route('**://pagead2.googlesyndication.com/**', r => r.abort());
  /* Retried once, the same way scripts/prerender.mjs retries its own goto. A
     slow page is not an unstable page, and since an unrenderable route is a
     FAILURE here rather than a skip, a single flaky navigation must not be able
     to turn the whole guard red. If it cannot load twice, that is worth knowing
     and it fails. */
  try {
    await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  } catch {
    await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  }
  await page.waitForTimeout(SETTLE_MS);
  const blocks = await page.evaluate(() => {
    /* Same first move as prerender.mjs line 435: anything the app marks
       data-no-prerender is live or dated on purpose and never reaches a
       snapshot, so it is not this harness's business either. Without this the
       run reports every ticker and countdown on the site, which is noise the
       pipeline already handles, and a harness that cries wolf gets ignored. */
    for (const el of Array.from(document.querySelectorAll('[data-no-prerender]'))) el.remove();
    const BLOCK = 'h1, h2, h3, h4, p, li, td, th, blockquote';
    const visible = el => {
      const st = window.getComputedStyle(el);
      return st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0.05;
    };
    return [...document.querySelectorAll(BLOCK)]
      .filter(el => !el.querySelector(BLOCK))
      .filter(visible)
      .map(el => (el.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  });
  await ctx.close();
  return blocks;
}

console.log(`rendering ${routes.length} route(s) ${RENDERS} times each at the same clock${CONTROL ? `, CONTROL=${CONTROL}` : ''}`);
if (CONTROL === 'unstable') console.log('   NEGATIVE CONTROL ON: one element carries a fresh random number on every load');

let controlSeen = false;
let unstableRoutes = 0;
let checked = 0;
let unreachable = 0;

for (const route of routes) {
  /* RENDERS, not two. The bug this exists for fires per render ATTEMPT, so two
     samples disagree only when EXACTLY ONE of them retried: 2p(1-p), which
     peaks at 0.5 and is worse everywhere else. Two renders were therefore a
     coin toss dressed as a check. With n renders the miss rate is
     p^n + (1-p)^n, so five samples cut the worst case from 1 in 2 to 1 in 16.
     The margin comes from that arithmetic, not from a number that felt right. */
  const takes = [];
  let broke = null;
  for (let i = 0; i < RENDERS; i += 1) {
    try {
      takes.push(await Promise.race([
        render(route),
        new Promise((_, rej) => setTimeout(() => rej(new Error(`route budget of ${ROUTE_BUDGET_MS}ms exceeded`)), ROUTE_BUDGET_MS)),
      ]));
    } catch (err) {
      broke = err;
      break;
    }
  }
  if (broke) {
    /* FAIL CLOSED. A route that cannot be rendered has NOT been checked, and a
       guard that reports green for a page it never looked at is the fail open
       this repo bans in validators. It is reported as a failure, not skipped,
       so the exit code and the closing sentence both stay true. */
    unreachable += 1;
    fail(`${route}: could not be rendered ${RENDERS} times, so it was NOT checked (${String(broke).replace(/\s+/g, ' ').slice(0, 90)})`);
    continue;
  }
  checked += 1;
  /* A run over every route takes tens of minutes, and this used to print
     nothing at all until the end, so a hung browser looked exactly like a slow
     one. This repo judges a harness by its output, so it says where it is. */
  if (checked % 10 === 0) console.log(`   ${checked}/${routes.length} routes checked`);
  if (CONTROL === 'unstable' && takes[0].some(s => s.startsWith('control drift '))) controlSeen = true;

  /* Compared as an ORDERED SEQUENCE, not as sets. prerender.mjs keeps the first
     sample's order and its duplicates (scripts/prerender.mjs around 698-704), so
     two renders that hold the same block strings in a different order, or a
     different number of times, still produce different documents. A set
     comparison called that stable and was green for the wrong reason. */
  const first = takes[0];
  for (let i = 1; i < takes.length; i += 1) {
    const other = takes[i];
    let at = -1;
    const n = Math.max(first.length, other.length);
    for (let k = 0; k < n; k += 1) {
      if (first[k] !== other[k]) { at = k; break; }
    }
    if (at >= 0) {
      unstableRoutes += 1;
      const show = [JSON.stringify(String(first[at] ?? '(absent)').slice(0, 70)),
        JSON.stringify(String(other[at] ?? '(absent)').slice(0, 70))].join(' vs ');
      fail(`${route}: render 1 and render ${i + 1} differ at block ${at} of ${first.length} at the SAME clock: ${show}`);
      break;
    }
  }
}

await browser.close();
server.kill();

console.log(`   ${checked} route(s) rendered ${RENDERS} times, ${unstableRoutes} unstable, ${unreachable} unreachable`);

if (CONTROL === 'unstable') {
  /* asserted, because a control that never landed proves nothing */
  if (!controlSeen) {
    console.error('control: the injected element never appeared, so this control would prove nothing');
    process.exit(1);
  }
  if (failures > 0) {
    console.log(`playRenderStability control: green. The injected drift was reported (${failures} finding), so the check works.`);
    process.exit(0);
  }
  console.error('playRenderStability control: RED. An element that changes on every load went unreported, so the check proves nothing.');
  process.exit(1);
}

if (failures > 0) {
  console.error(`playRenderStability: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log(`playRenderStability: green. All ${checked} route(s) said the same thing ${RENDERS} times, so the clock samples downstream mean what they claim.`);
