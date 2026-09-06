/**
 * Round 479: A PAGE THAT STILL DRAWS RAW INTO REACT STATE MUST NOT HAVE
 * SNAPSHOT CONTENT, HEAD OR READABLE BLOCK, THAT MOVES WITH THE DRAW ORDER.
 *
 * WHY THIS EXISTS, and it is a join of two facts rather than either one alone.
 *
 * scripts/prerender.mjs replaces Math.random with a seeded generator before any
 * page code runs (Round 284), the same seed on every sample and every run, so a
 * random pick freezes identically in every build instead of rewriting the file
 * and re-dating the page for nothing. That only holds while the draws happen in
 * the same ORDER. React does not promise a useState initialiser runs once: it
 * may begin a render, throw the work away and start again, and the retry draws
 * AGAIN, which advances the shared generator by one and moves every draw after
 * it. src/lib/firstDraw.ts (Round 421) is the fix, and simPrerender section 16
 * is the source level ratchet that stops new ones appearing.
 *
 * Section 16 still carries 23 files as frozen debt. Round 479 measured every
 * one of them, twelve builds of each of their routes out of git plus the
 * experiment below, and found that not one of them currently costs anything.
 * The reason is not that the initialisers are safe. It is that their picks are
 * INVISIBLE to a snapshot:
 *
 *   - the eight sibling Higher or Lower pages render the two picked names in a
 *     <span>, and the prerenderer keeps only readable blocks, so the names were
 *     never in the saved page at all. /higher-lower used an <h3>, which is
 *     exactly why it was the one page the race could damage.
 *   - the connections, career, Footle, Olympics, missing and rank pages all
 *     seed UNLIMITED mode from the draw and open in daily mode, so the pick
 *     renders nothing until a player switches, which a crawler never does.
 *
 * That is a happy accident, not a guarantee, and nothing in the repo notices
 * when it stops being true. Turning one of those spans into a heading is a
 * perfectly reasonable thing for somebody to do for the copy, and it would
 * silently hand that page the /higher-lower bug. THIS is the guard for that
 * moment.
 *
 * WHAT IT MEASURES, against a baseline, deterministically. An extra initialiser
 * firing advances the seeded generator by exactly one draw. So render the page
 * with prerender.mjs's seed, render it again with that generator advanced by
 * one, and diff BOTH HALVES OF WHAT A SNAPSHOT KEEPS: the head, which is saved
 * verbatim, and the readable blocks, which the body is rebuilt from. Reading
 * only the body would be half a check, because a picked value reaching a
 * Helmet title or a JSON-LD block moves the saved page without changing one
 * readable block. A page identical in both under both offsets cannot have its
 * snapshot moved by the race, whatever its initialisers look like. A page that
 * MOVES has content that depends on the draw order, and that is only safe while
 * every draw feeding its React state goes through firstDraw. Moving is
 * therefore NOT a failure by itself: /higher-lower moves and is correct,
 * because it draws once per mount. The failure is the JOIN, a page that moves
 * while still holding a raw draw.
 *
 * WHY NOT JUST RE-RUN playRenderStability. That one renders repeatedly at one
 * clock and catches the race only when React actually retries during the run,
 * which its own header calls a coin toss. This forces the CONSEQUENCE of a
 * retry instead of waiting for one, so it answers "could this ever matter here"
 * every single time, with no luck in it. They are complements.
 *
 * THE ROUTE LIST IS DERIVED, NEVER TYPED. The at risk routes are worked out
 * every run by walking src/App.tsx for route to page, then the import graph
 * from each page, and intersecting with the files that currently draw raw. A
 * list of affected games has been written four times in this repo and each one
 * covered what somebody had already found and nothing after. If somebody adds a
 * raw draw to a shared hook tomorrow, every route that imports it joins the
 * sweep on its own.
 *
 * NEGATIVE CONTROL, judged on its output and not its exit code:
 *   DRAW_ORDER_CONTROL=drawdep
 * puts TWO planted defects on every at risk page, one per half of the check: a
 * readable paragraph whose text is taken from the seeded generator, and a head
 * meta tag whose content is taken from the same generator. Both are the shipped
 * shape of the defect, a picked value that moves with the draw order on a page
 * that still draws raw, one where the prerenderer rebuilds and one where it
 * copies verbatim. Both injections are asserted to have landed on every route,
 * because a control that changes nothing is green for the wrong reason, and
 * both must then be reported as moved on every at risk route.
 *
 *   node scripts/simDrawOrder.mjs
 *   ONLY=/connections,/footle node scripts/simDrawOrder.mjs
 *   FULL=1 node scripts/simDrawOrder.mjs        every route in the sitemap
 *   DRAW_ORDER_CONTROL=drawdep node scripts/simDrawOrder.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SRC = path.join(ROOT, 'src');
const PORT = Number(process.env.DRAW_ORDER_PORT || 4491);
const SETTLE_MS = Number(process.env.PRERENDER_SETTLE || 3500);
const CONTROL = process.env.DRAW_ORDER_CONTROL || '';
/* the seed scripts/prerender.mjs uses, because the question is whether the page
   is stable UNDER THAT SEEDING, not under a live generator */
const RANDOM_SEED = 284;
/* Three takes per offset, not one. The very race being studied could fire
   during a take and confound the diff, making offset 0 behave like offset 1.
   Three takes that agree with each other say the take is clean; takes that
   disagree mean the page is unstable at one clock, which is a real finding of
   its own and is reported rather than averaged away. */
const TAKES = Math.max(2, Number(process.env.TAKES || 3));
/* Per RENDER, not per route: each of the six renders a route needs races this
   on its own, so the name and the message both say render. Without a budget one
   wedged navigation stalls the sweep and it neither passes nor fails, which is
   the least useful thing a check can do. */
const RENDER_BUDGET_MS = Number(process.env.RENDER_BUDGET_MS || 150000);

if (CONTROL && CONTROL !== 'drawdep') {
  console.error(`DRAW_ORDER_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
if (!fs.existsSync(path.join(DIST, 'sitemap.xml'))) {
  console.log('NO dist/sitemap.xml. BUILD FIRST. NOT CHECKED.');
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ---- 1. WHICH FILES DRAW RAW INTO REACT STATE RIGHT NOW ----------------- */
/* The same shape simPrerender section 16 looks for. Comments and the sanctioned
   firstDraw handle are stripped and skipped for the same reasons it gives:
   prose about a rule is the one place the rule's own words are guaranteed to
   appear, and `.get)` is the fixed form. The two scans agreeing is asserted
   below rather than assumed, so they cannot drift apart in silence. */
const RAW = /useState\s*(?:<[^>]*>)?\s*\(\s*(?:\(\s*\)\s*=>\s*)?[^)]*?(?:Math\s*\.\s*random|[Rr]andom[A-Za-z0-9]*)\s*[^)]*\)/g;
const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');

const allSrc = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(e.name)) allSrc.push(full);
  }
})(SRC);

const rel = f => path.relative(ROOT, f).split(path.sep).join('/');
const rawDrawFiles = new Set();
let scanned = 0;
for (const f of allSrc) {
  if (f.endsWith(path.join('lib', 'firstDraw.ts'))) continue;
  scanned += 1;
  const code = stripComments(fs.readFileSync(f, 'utf8'));
  for (const m of code.matchAll(RAW)) {
    const hit = m[0].replace(/\s+/g, ' ');
    if (/\.get\s*\)/.test(hit) || /makeFirstDraw/.test(hit)) continue;
    rawDrawFiles.add(rel(f));
  }
}

/* DRIFT GUARD. simPrerender's frozen baseline is the one list of this debt in
   the repo. If this file's scan stops finding something that one still carries,
   the two have drifted and this harness is quietly checking a smaller set than
   it claims, which is the failure mode a guard is least able to notice about
   itself. Read CRLF tolerantly: the desktop clone writes these files with CRLF
   and a needle spelt with bare newlines would never match here. */
const simPrerenderSrc = fs
  .readFileSync(path.join(ROOT, 'scripts', 'simPrerender.mjs'), 'utf8')
  .replace(/\r\n/g, '\n');
const baselineBlock = simPrerenderSrc.match(/const RAW_RANDOM_BASELINE = new Set\(\[([\s\S]*?)\]\)/);
if (!baselineBlock) {
  console.error('FAIL: could not read RAW_RANDOM_BASELINE out of scripts/simPrerender.mjs, so the drift guard cannot run');
  process.exit(1);
}
const baseline = [...baselineBlock[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
if (!baseline.length) {
  console.error('FAIL: RAW_RANDOM_BASELINE parsed to zero entries, which cannot be right');
  process.exit(1);
}

console.log('1) the files that draw raw into React state, and the routes that render them');
for (const f of baseline) {
  if (!rawDrawFiles.has(f)) {
    fail(`${f} is on simPrerender's RAW_RANDOM_BASELINE but this harness's scan does not see a raw draw in it, so the two scans have drifted and this sweep is smaller than it claims`);
  }
}
/* scanned, not allSrc.length: src/lib/firstDraw.ts is skipped above, the same
   way simPrerender section 16 skips it, so the two report the same number. */
console.log(`   ${scanned} source files scanned, ${rawDrawFiles.size} still draw raw, ${baseline.length} on simPrerender's frozen baseline`);

/* ---- 2. ROUTE TO PAGE TO IMPORT GRAPH ----------------------------------- */
const appSrc = fs.readFileSync(path.join(SRC, 'App.tsx'), 'utf8').replace(/\r\n/g, '\n');
const lazyOf = new Map();
for (const m of appSrc.matchAll(/const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*["']([^"']+)["']/g)) {
  lazyOf.set(m[1], m[2]);
}
const routeEntry = new Map();
for (const m of appSrc.matchAll(/<Route\s+path=["']([^"']+)["']\s+element=\{<(\w+)\b/g)) {
  const [, routePath, comp] = m;
  if (lazyOf.has(comp)) routeEntry.set(routePath, lazyOf.get(comp));
}
if (routeEntry.size < 50) {
  fail(`only ${routeEntry.size} routes were read out of src/App.tsx, which is far fewer than this app has, so the route parse is broken and the sweep would silently cover almost nothing`);
}

function resolveImport(spec, fromFile) {
  let base;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const cand of [base + '.tsx', base + '.ts', path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  }
  return null;
}

const graphCache = new Map();
function graphOf(entryFile) {
  if (graphCache.has(entryFile)) return graphCache.get(entryFile);
  const seen = new Set();
  const queue = [entryFile];
  while (queue.length) {
    const f = queue.shift();
    if (!f || seen.has(f)) continue;
    seen.add(f);
    let src;
    try { src = fs.readFileSync(f, 'utf8'); } catch { continue; }
    for (const m of src.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
      const next = resolveImport(m[1], f);
      if (next && !seen.has(next)) queue.push(next);
    }
  }
  const out = new Set([...seen].map(rel));
  graphCache.set(entryFile, out);
  return out;
}

const atRisk = [];
const raiserOf = new Map();
for (const [routePath, spec] of routeEntry) {
  const entryFile = resolveImport(spec, path.join(SRC, 'App.tsx'));
  if (!entryFile) continue;
  const hits = [...graphOf(entryFile)].filter(f => rawDrawFiles.has(f));
  if (hits.length) { atRisk.push(routePath); raiserOf.set(routePath, hits); }
}
atRisk.sort();

const rendered = new Set(atRisk.flatMap(r => raiserOf.get(r)));
const orphan = [...rawDrawFiles].filter(f => !rendered.has(f)).sort();
console.log(`   ${routeEntry.size} routes read from src/App.tsx, ${atRisk.length} of them render a file that still draws raw`);
if (orphan.length) {
  console.log(`   ${orphan.length} raw drawing file(s) reach no route at all, so no snapshot can carry them: ${orphan.join(', ')}`);
}
if (!atRisk.length && rawDrawFiles.size) {
  fail('files still draw raw into React state but the route walk matched none of them to a route, which means the walk is broken rather than that the debt is gone');
}

/* ---- 3. THE EXPERIMENT --------------------------------------------------- */
let routes = atRisk;
if (process.env.FULL === '1') {
  const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
  routes = [...new Set(
    [...sitemap.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)]
      .map(m => m[1] || '/')
      .map(r => (r.endsWith('/') && r !== '/' ? r.slice(0, -1) : r)),
  )].sort();
}
if (process.env.ONLY) {
  const want = new Set(process.env.ONLY.split(',').map(x => x.trim()));
  routes = routes.filter(r => want.has(r));
  if (!routes.length) { console.error('ONLY matched no route in the sweep'); process.exit(1); }
}

const initScript = burn => `(() => {
  window.__DUKB_PRERENDER__ = true;
  (function () {
    let s = ${RANDOM_SEED} | 0;
    Math.random = function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = 0; i < ${burn}; i += 1) Math.random();
  })();
})();`;

/* The control reads the SEEDED generator on purpose, so what it plants differs
   between the two offsets exactly the way a picked name would. Drawing from the
   real generator instead would make it differ between any two renders, which is
   playRenderStability's defect and not this one.

   IT PLANTS IN BOTH HALVES, because the check has two halves and a control that
   only covers one of them leaves the other proven by nothing. The paragraph is
   the body defect, a picked value rendered into a readable block. The meta tag
   is the head defect, a picked value reaching a Helmet tag, which moves the
   saved page without changing a single readable block. Both must be reported or
   the control is red. */
const CONTROL_MARK = 'draw order control ';
const controlScript = `(() => {
  addEventListener('DOMContentLoaded', () => {
    const p = document.createElement('p');
    p.id = 'draw-order-control';
    p.textContent = ${JSON.stringify(CONTROL_MARK)} + Math.random();
    document.body.appendChild(p);
    const m = document.createElement('meta');
    m.setAttribute('name', 'draw-order-control');
    m.setAttribute('content', ${JSON.stringify(CONTROL_MARK)} + Math.random());
    document.head.appendChild(m);
  });
})();`;

const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
const browser = await chromium.launch({ args: ['--no-sandbox'] });

async function render(route, burn) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(initScript(burn));
  if (CONTROL === 'drawdep') await ctx.addInitScript(controlScript);
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* blocked */ } });
  /* identical to scripts/prerender.mjs: live data hangs rather than lands, so
     the page shows its static copy and its normal loading state */
  await page.route('**://*.supabase.co/**', () => { /* never settled on purpose */ });
  await page.route('**://*.googletagmanager.com/**', r => r.abort());
  await page.route('**://pagead2.googlesyndication.com/**', r => r.abort());
  try {
    await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  } catch {
    await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  }
  await page.waitForTimeout(SETTLE_MS);
  /* THE HEAD COUNTS TOO, and reading only the body would have been half a
     check. scripts/prerender.mjs keeps each page's head VERBATIM and rebuilds
     only the body from readable blocks, so a picked value reaching a Helmet
     title, description or JSON-LD block moves the saved page without touching
     a single readable body block. Today no page does that (all 23 pass
     PageSeo hardcoded literals and GameSeoContent builds its schema from the
     registry and the guide file), which is exactly the kind of thing that is
     true until somebody makes it false. Asset URLs are not stripped because
     both offsets read the SAME dist, so the hashes are identical and any
     difference here is the draw.

     SORTED, and that is measured rather than convenient. Helmet inserts head
     tags in an order that varies from one render to the next: probed on
     /connections and /footle, two renders at the SAME offset gave the same 70
     tags with the order differing. Comparing the raw innerHTML therefore
     reports that noise as instability and the real question never gets asked.
     It is noise and not signal: across the last twelve builds of eight of
     these routes the saved heads hold 33 distinct values counted in order and
     the same 33 counted as sets, so not one saved head has ever differed by
     order alone. Sorting drops the artifact and keeps every content change. */
  const head = await page.evaluate(() =>
    [...document.head.children]
      .map(el => el.outerHTML.replace(/\s+/g, ' ').trim())
      .sort()
      .join('\n'));
  const blocks = await page.evaluate(() => {
    /* Same first move as scripts/prerender.mjs: anything marked
       data-no-prerender is live or dated on purpose, never reaches a snapshot,
       and so is not this harness's business either. */
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
  return { blocks, head };
}

/* Takes at one offset must agree with each other before the two offsets are
   compared, or the diff is measuring the race instead of the offset. */
async function stableTake(route, burn) {
  const takes = [];
  for (let i = 0; i < TAKES; i += 1) {
    takes.push(await Promise.race([
      render(route, burn),
      new Promise((_, rej) => setTimeout(() => rej(new Error(`render budget of ${RENDER_BUDGET_MS}ms exceeded`)), RENDER_BUDGET_MS)),
    ]));
  }
  const first = JSON.stringify(takes[0]);
  const agree = takes.every(t => JSON.stringify(t) === first);
  return { blocks: takes[0].blocks, head: takes[0].head, agree };
}

const failuresBefore = failures;
console.log('');
console.log(`2) the same page at the seeded generator and at that generator advanced by one draw`);
console.log(`   ${routes.length} route(s), ${TAKES} takes at each of the two offsets${CONTROL ? `, CONTROL=${CONTROL}` : ''}`);
if (CONTROL === 'drawdep') console.log('   NEGATIVE CONTROL ON: every at risk page carries a paragraph AND a head meta tag drawn from the seeded generator, and both must be reported as moved on every one');

let movedCount = 0;
let headMovedCount = 0;
let controlLanded = 0;
let controlNamed = 0;
let controlHeadLanded = 0;
let controlHeadNamed = 0;
let checked = 0;

for (const route of routes) {
  let base;
  let off;
  try {
    base = await stableTake(route, 0);
    off = await stableTake(route, 1);
  } catch (err) {
    /* FAIL CLOSED. A route that could not be rendered has NOT been checked, and
       a silent skip here reads exactly like a pass. */
    fail(`${route} could not be rendered, so it is unchecked: ${err.message}`);
    continue;
  }
  checked += 1;
  if (!base.agree || !off.agree) {
    fail(`${route} does not serve the same head and readable blocks on every take at ONE offset, so the draw order question cannot be answered on it. That is instability at a single clock: run scripts/playRenderStability.mjs on this route`);
    continue;
  }
  /* THE ORDERED SEQUENCE DECIDES, and the sets are only for the message.
     playRenderStability shipped with a set comparison and had to be corrected
     for exactly this: scripts/prerender.mjs preserves the ORDER of the blocks
     it writes and it preserves duplicates, so two blocks swapping places, or a
     line appearing twice instead of once, rewrites the saved page while the
     set of texts is unchanged. Deciding on the set would call that identical
     and would be the same mistake a second time. */
  const moved = JSON.stringify(base.blocks) !== JSON.stringify(off.blocks);
  const a = new Set(base.blocks);
  const b = new Set(off.blocks);
  const gone = [...a].filter(x => !b.has(x));
  const added = [...b].filter(x => !a.has(x));
  const headMoved = base.head !== off.head;
  if (headMoved) {
    headMovedCount += 1;
    fail(`${route} has HEAD content that moves with the draw order, and a snapshot keeps the head verbatim, so this reaches the saved page and a body only check would have missed it. ${(raiserOf.get(route) || []).join(', ') || 'A file it renders'} still draws raw into React state`);
  }
  if (CONTROL === 'drawdep') {
    const landed = [...a].some(x => x.startsWith(CONTROL_MARK));
    if (landed) controlLanded += 1;
    else fail(`${route}: the control paragraph never reached the page, so a green result on it would mean the control did not fire rather than that the check works`);
    if (moved && [...gone, ...added].some(x => x.startsWith(CONTROL_MARK))) controlNamed += 1;
    const headLanded = base.head.includes('draw-order-control') && off.head.includes('draw-order-control');
    if (headLanded) controlHeadLanded += 1;
    else fail(`${route}: the control meta tag never reached the head, so the head half of this check would be proven by nothing`);
    if (headMoved) controlHeadNamed += 1;
  }
  if (moved) {
    movedCount += 1;
    const why = (raiserOf.get(route) || []).join(', ');
    fail(`${route} has readable content that moves with the draw order while ${why || 'a file it renders'} still draws raw into React state, so a discarded render advances the seeded generator and the saved page changes for nothing. Route it through src/lib/firstDraw.ts`);
    if (!gone.length && !added.length) {
      console.error('      the same block texts came back in a different ORDER or with a different number of repeats, which a snapshot preserves');
    }
    for (const g of gone.slice(0, 3)) console.error(`      was: ${g.slice(0, 90)}`);
    for (const x of added.slice(0, 3)) console.error(`      now: ${x.slice(0, 90)}`);
  }
}

console.log(`   ${checked} route(s) checked, ${movedCount} whose readable blocks move when the generator is advanced by one draw, ${headMovedCount} whose head moves`);
/* Only claim it held if it held. An unconditional reassurance under a FAIL is
   how a reader skims a red run and sees green, which is the lesson
   simPrerender section 15 carries, so this reads the failure count and not
   just the two movement counts: a route that could not be rendered, or that
   disagreed with itself at one offset, moved nothing and was also not
   answered. */
if (!failures && !CONTROL) {
  console.log('   every at risk page serves the same head and the same readable blocks at both offsets,');
  console.log('   which is both halves of what a snapshot keeps, so its raw draw cannot reach one');
} else if (!CONTROL) {
  console.log('   the sweep did NOT come back clean, see the failure(s) above');
}

await browser.close();
server.kill();

console.log('');
if (CONTROL === 'drawdep') {
  /* Judged by what it PRINTS, per this repo's rule, and inverted the way
     simPrerender's controls are: under this control the sweep is SUPPOSED to go
     red, so a clean sweep is the bug. */
  const clean = failuresBefore === 0;
  const n = routes.length;
  if (controlLanded === n && controlNamed === n && controlHeadLanded === n && controlHeadNamed === n && clean) {
    console.log(`simDrawOrder control: green. Both planted defects fired on all ${n} at risk route(s):`);
    console.log(`   the control paragraph landed on ${controlLanded}/${n} and was reported as moving with the draw order on ${controlNamed}/${n},`);
    console.log(`   and the control meta tag landed in the head on ${controlHeadLanded}/${n} and moved the head on ${controlHeadNamed}/${n}.`);
    console.log('   So both halves of what a snapshot keeps ARE checked, and a green run means the check worked.');
    process.exit(0);
  }
  console.error(`simDrawOrder control: RED. Body landed ${controlLanded}/${n}, body named ${controlNamed}/${n}, head landed ${controlHeadLanded}/${n}, head named ${controlHeadNamed}/${n}, other failures ${failuresBefore}.`);
  console.error('   Both planted defects must land everywhere and be reported everywhere, or green means nothing.');
  process.exit(1);
}

if (failures) {
  console.log(`simDrawOrder: ${failures} failure(s)`);
  process.exit(1);
}
console.log('simDrawOrder: green');
process.exit(0);
