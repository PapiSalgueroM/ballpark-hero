/**
 * Round 221 harness (number 88): every save on the site survives being
 * garbage.
 *
 * The idle games and the career sims load fail closed by house rule, and
 * their harnesses prove it one game at a time. Nothing ever proved it for
 * the SITE: dozens of games keep something in localStorage (saves, streaks,
 * daily action logs, difficulty picks, half-finished brackets), every one of
 * those values survives updates that change the shape it was written in, and
 * a load path that trusts a stale or mangled value crashes the page for
 * exactly the loyal players who had state worth keeping. That failure is
 * invisible in every clean-profile test this repo runs, because a clean
 * profile has nothing saved.
 *
 * Method, in two passes:
 *
 *   1. DISCOVERY. Visit every route in App.tsx on a clean profile, let it
 *      settle, navigate away (several games save on pagehide, the tycoon
 *      taught that), and record which localStorage keys the route wrote.
 *      Keys are measured from behaviour, not greppd from source, so a
 *      renamed constant cannot silently drop a game out of coverage. Routes
 *      that write nothing are counted and printed, not hidden.
 *
 *   2. THE TAMPER SWEEP. For every route that owns keys, load it again six
 *      times, each time with every one of its keys pre-set to a different
 *      kind of wreckage: plain garbage, truncated JSON, a hostile version
 *      number, an empty object, a bare null, an empty array. The page must
 *      come up: no uncaught exception, no blank screen. A page that clears
 *      the bad value and starts fresh is doing exactly what the house rule
 *      demands.
 *
 * What this deliberately does not assert: that the old state was KEPT. A
 * mangled save cannot be honoured, only survived. Keeping real state across
 * versions is each game's own harness's job.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      node scripts/sweepSaves.mjs
 * ROUTE=/club-manager sweeps one route.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pw from "/home/claude/.npm-global/lib/node_modules/playwright/index.js";

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? "http://localhost:4173";

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };

function routes() {
  const src = fs.readFileSync(path.join(ROOT, "src/App.tsx"), "utf-8");
  const all = [...src.matchAll(/<Route path="([^"]+)"/g)].map(m => m[1]);
  return [...new Set(all.filter(p => p.startsWith("/") && !p.includes(":") && p !== "*"))];
}
const ROUTES = process.env.ROUTE ? [process.env.ROUTE] : routes();

/* every key gets every one of these, one mode per pass */
const WRECKAGE = [
  ["garbage", "not json at all {"],
  ["truncated", '{"v":1,"cash":12'],
  ["hostileVersion", '{"v":999,"version":999}'],
  ["emptyObject", "{}"],
  ["bareNull", "null"],
  ["emptyArray", "[]"],
];

const browser = await chromium.launch();

/* ------------------------------------------------------------ discovery */
console.log(`1) discovery: which of ${ROUTES.length} routes keep state`);
const owned = new Map();
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Essential only")').first().click({ timeout: 1500 }).catch(() => {});
  /* the consent answer and other sitewide keys belong to every page and are
     not any one route's save; they are captured here and excluded below */
  await page.goto(`${BASE}/robots.txt`, { waitUntil: "domcontentloaded" });
  const sitewide = new Set(await page.evaluate(() => Object.keys(localStorage)));
  let walked = 0;
  for (const route of ROUTES) {
    walked += 1;
    if (walked % 20 === 0) console.log(`   ...${walked} of ${ROUTES.length} visited`);
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(900);
      /* several games only save on pagehide; leaving the page fires it.
         Reads happen from /robots.txt, the Round 196 trick: same origin
         (about:blank is NOT, and reads empty), and the app does not run
         there. */
      await page.goto(`${BASE}/robots.txt`, { waitUntil: "domcontentloaded" });
      const keys = await page.evaluate(() => Object.keys(localStorage));
      const own = keys.filter(k => !sitewide.has(k));
      if (own.length) owned.set(route, own);
      for (const k of own) sitewide.add(k);
    } catch { /* discovery only; the tamper pass is where failures count */ }
  }
  await ctx.close();
}
console.log(`   ${owned.size} routes keep state (${[...owned.values()].reduce((t, a) => t + a.length, 0)} keys); ${ROUTES.length - owned.size} keep nothing and are excused from the tamper pass`);

/* --------------------------------------------------------- tamper sweep */
console.log("2) the tamper sweep: six kinds of wreckage per key");
let checks = 0;
for (const [mode, value] of WRECKAGE) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const seed = Object.fromEntries([...owned.values()].flat().map(k => [k, value]));
  await ctx.addInitScript(sd => {
    try { for (const [k, v] of Object.entries(sd)) localStorage.setItem(k, v); } catch { /* ignore */ }
  }, seed);
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(String(e)));
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.locator('button:has-text("Essential only")').first().click({ timeout: 1500 }).catch(() => {});
  for (const route of owned.keys()) {
    errs.length = 0;
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(800);
    } catch (e) {
      fail(`${route} under ${mode}: would not load (${String(e).split("\n")[0].slice(0, 80)})`);
      continue;
    }
    checks += 1;
    const real = errs.filter(e => !/supabase|Failed to fetch|CORS|ResizeObserver|NetworkError/i.test(e));
    if (real.length) fail(`${route} under ${mode}: uncaught ${real[0].split("\n")[0].slice(0, 110)}`);
    const text = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    if (text.length < 60) fail(`${route} under ${mode}: the screen came up blank (${text.length} chars)`);
  }
  await ctx.close();
  console.log(`   ${mode}: swept`);
}

await browser.close();
console.log("");
console.log(`   ${checks} tampered loads across ${owned.size} stateful routes`);
if (failures > 0) {
  console.error(`sweepSaves: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("sweepSaves: green. Every save on the site survives being garbage.");
