/**
 * Round 479: A PAGE THAT STILL DRAWS RAW INTO REACT STATE MUST NOT HAVE
 * READABLE CONTENT THAT MOVES WITH THE DRAW ORDER.
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
 * one, and diff the readable blocks. A page whose readable output is identical
 * under both cannot have its snapshot moved by the race, whatever its
 * initialisers look like. A page whose output MOVES has readable content that
 * depends on the draw order, and that is only safe while every draw feeding its
 * React state goes through firstDraw. Moving is therefore NOT a failure by
 * itself: /higher-lower moves and is correct, because it draws once per mount.
 * The failure is the JOIN, a page that moves while still holding a raw draw.
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
 * puts a readable paragraph on every at risk page whose text is taken from the
 * seeded generator, so it reads differently at the two offsets. That is the
 * shipped shape of the defect, readable content that moves with the draw order
 * on a page that still draws raw. The injection is asserted to have landed on
 * every route, because a control that changes nothing is green for the wrong
 * reason, and every at risk route must then be reported as moved.
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
const ROUTE_BUDGET_MS = Number(process.env.ROUTE_BUDGET_MS || 150000);

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
for (const f of allSrc) {
  if (f.endsWith(path.join('lib', 'firstDraw.ts'))) continue;
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
console.log(`   ${allSrc.length} source files scanned, ${rawDrawFiles.size} still draw raw, ${baseline.length} on simPrerender's frozen baseline`);

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

/* The control reads the SEEDED generator on purpose, so its paragraph differs
   between the two offsets exactly the way a picked name would. Drawing from the
   real generator instead would make it differ between any two renders, which is
   playRenderStability's defect and not this one. */
const CONTROL_MARK = 'draw order control ';
const controlScript = `(() => {
  addEventListener('DOMContentLoaded', () => {
    const p = document.createElement('p');
    p.id = 'draw-order-control';
    p.textContent = ${JSON.stringify(CONTROL_MARK)} + Math.random();
    document.body.appendChild(p);
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
  return blocks;
}

/* Takes at one offset must agree with each other before the two offsets are
   compared, or the diff is measuring the race instead of the offset. */
async function stableTake(route, burn) {
  const takes = [];
  for (let i = 0; i < TAKES; i += 1) {
    takes.push(await Promise.race([
      render(route, burn),
      new Promise((_, rej) => setTimeout(() => rej(new Error(`route budget of ${ROUTE_BUDGET_MS}ms exceeded`)), ROUTE_BUDGET_MS)),
    ]));
  }
  const first = takes[0].join(' ');
  const agree = takes.every(t => t.join(' ') === first);
  return { blocks: takes[0], agree };
}

const failuresBefore = failures;
console.log('');
console.log(`2) the same page at the seeded generator and at that generator advanced by one draw`);
console.log(`   ${routes.length} route(s), ${TAKES} takes at each of the two offsets${CONTROL ? `, CONTROL=${CONTROL}` : ''}`);
if (CONTROL === 'drawdep') console.log('   NEGATIVE CONTROL ON: every at risk page carries a paragraph drawn from the seeded generator, and every one must be reported as moved');

let movedCount = 0;
let controlLanded = 0;
let controlNamed = 0;
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
    fail(`${route} does not render the same readable blocks twice at ONE offset, so the draw order question cannot be answered on it. That is instability at a single clock: run scripts/playRenderStability.mjs on this route`);
    continue;
  }
  const a = new Set(base.blocks);
  const b = new Set(off.blocks);
  const gone = [...a].filter(x => !b.has(x));
  const added = [...b].filter(x => !a.has(x));
  const moved = gone.length > 0 || added.length > 0;
  if (CONTROL === 'drawdep') {
    const landed = [...a].some(x => x.startsWith(CONTROL_MARK));
    if (landed) controlLanded += 1;
    else fail(`${route}: the control paragraph never reached the page, so a green result on it would mean the control did not fire rather than that the check works`);
    if (moved && [...gone, ...added].some(x => x.startsWith(CONTROL_MARK))) controlNamed += 1;
  }
  if (moved) {
    movedCount += 1;
    const why = (raiserOf.get(route) || []).join(', ');
    fail(`${route} has readable content that moves with the draw order while ${why || 'a file it renders'} still draws raw into React state, so a discarded render advances the seeded generator and the saved page changes for nothing. Route it through src/lib/firstDraw.ts`);
    for (const g of gone.slice(0, 3)) console.error(`      was: ${g.slice(0, 90)}`);
    for (const x of added.slice(0, 3)) console.error(`      now: ${x.slice(0, 90)}`);
  }
}

console.log(`   ${checked} route(s) checked, ${movedCount} whose readable blocks move when the generator is advanced by one draw`);
if (!movedCount && !CONTROL) {
  console.log('   every at risk page renders the same readable blocks at both offsets, so its raw draw cannot reach a snapshot');
}

await browser.close();
server.kill();

console.log('');
if (CONTROL === 'drawdep') {
  /* Judged by what it PRINTS, per this repo's rule, and inverted the way
     simPrerender's controls are: under this control the sweep is SUPPOSED to go
     red, so a clean sweep is the bug. */
  const clean = failuresBefore === 0;
  if (controlLanded === routes.length && controlNamed === routes.length && clean) {
    console.log(`simDrawOrder control: green. The planted defect fired on all ${routes.length} at risk route(s):`);
    console.log('   the control paragraph landed on every one of them, and every one was reported as moving with the draw order.');
    console.log('   So a page whose readable content follows the draw order IS caught, and a green run means the check worked.');
    process.exit(0);
  }
  console.error(`simDrawOrder control: RED. Landed on ${controlLanded}/${routes.length}, named on ${controlNamed}/${routes.length}, other failures ${failuresBefore}.`);
  console.error('   The control must land everywhere and be reported everywhere, or green means nothing.');
  process.exit(1);
}

if (failures) {
  console.log(`simDrawOrder: ${failures} failure(s)`);
  process.exit(1);
}
console.log('simDrawOrder: green');
process.exit(0);
