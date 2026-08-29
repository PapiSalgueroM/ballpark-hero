/**
 * Round 268 harness (number 114): a page that gathers things has to contain them.
 *
 * WHY THIS EXISTS, and it had been live for a while. The College Games Hub
 * filtered the game registry for the category titles 'College Football' and
 * 'College Basketball'. The registry calls that category 'College Sports'.
 * Neither of the two titles has ever existed, so the filter returned an empty
 * array, and /college shipped to the live site as:
 *
 *     🎓 College Games Hub
 *     All 0 college football and college basketball games in one place.
 *
 * and then nothing. No games. It was in the sitemap, and Round 266 had just
 * put it in the footer of all 122 crawlable documents, so every page on the
 * site was voting for a page that delivered zero.
 *
 * NOTHING COULD HAVE CAUGHT IT. It is not a type error against `title: string`.
 * It does not throw. It has no dead links. And the Round 266 link harness,
 * which was written for exactly this family of problem, passed it: that one
 * counts a document's outbound links across the WHOLE document, and the navbar,
 * the daily ticker and the footer clear its floor of five twice over on a page
 * whose body is empty. Chrome hides an empty body. That is the lesson of this
 * round and it is what this file is built around.
 *
 * WHAT IT MEASURES, over the documents that really ship:
 *
 *   1. THE HUB LIST IS HONEST. Any page that looks up categories by title must
 *      be declared here. A new hub that forgets to register fails the suite
 *      rather than shipping unchecked, which is the rule simInventedNames set
 *      for name generators and it is the right one.
 *   2. EVERY HUB LINKS EVERY GAME IT GATHERS. Not a floor, not a sample: the
 *      exact set from the registry, each one present as an href in the shipped
 *      document. This is the check the bug would have failed on day one.
 *   3. THE COUNT A HUB PRINTS IS TRUE. The number in "All N ... games" is
 *      parsed back out of the shipped page and compared to the registry. It
 *      fails high and it fails low. Round 260 shipped two hand-typed counts to
 *      the home page that were wrong the day they went live; the standing rule
 *      since then is that if the page renders a number, the page derives it,
 *      and this is how that gets enforced from outside.
 *   4. NO PAGE CLAIMS ZERO OF ITSELF. Measured across all 122 documents before
 *      the fix, the phrase shapes below matched exactly one page, the broken
 *      one. After the fix they match none. A check that fires on one real bug
 *      and nothing else is worth having; one that fires on scorelines would not
 *      be, which is why this does not simply hunt for the digit zero.
 *   5. NO GAME FALLS OUT OF THE LINK GRAPH. Chrome is computed rather than
 *      assumed: any href present in at least 90% of documents is chrome. Every
 *      game is then either chrome itself (the four daily ticker games are) or
 *      is linked from real page bodies. Measured 2026-08-22 across the 109
 *      non-chrome games: min 3, median 8. The floor is 2, under the measured
 *      minimum, because what this catches is a game dropping out of the graph
 *      altogether and not one that is linked a little less than its neighbours.
 *
 * Run: node scripts/simHubs.mjs
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ── load the registry AND the hub definitions the site renders from ───
   ROUND 270 CHANGED WHERE THE HUB LIST COMES FROM. It used to be typed into
   this file, which meant a new hub was unchecked until somebody remembered to
   come back here. It is now read out of src/lib/sportHub.ts, the same list
   the app itself renders from, so a hub is checked from the moment it exists
   and cannot be added without being checked. The count regex is the one thing
   that still lives here, because it describes the SENTENCE the shared
   component prints rather than anything about a particular sport. */
const COUNT_LINE = /All (\d+) of them in one place/i;

const ENTRY = path.join(os.tmpdir(), 'hubs-entry.mjs');
const OUT = path.join(os.tmpdir(), 'hubs-bundle.mjs');
writeFileSync(ENTRY, [
  `export * from '${path.join(ROOT, 'src/data/gameRegistry.ts').replaceAll('\\', '/')}';`,
  `export { SPORT_HUBS } from '${path.join(ROOT, 'src/lib/sportHub.ts').replaceAll('\\', '/')}';`,
].join('\n'));
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: OUT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
});
const { CATEGORIES, ALL_GAMES, SPORT_HUBS } = await import(pathToFileURL(OUT).href + '?t=' + process.pid);
const HUBS = SPORT_HUBS.map(h => ({ route: h.route, titles: h.titles, count: COUNT_LINE }));
console.log(`1) registry: ${CATEGORIES.length} categories, ${ALL_GAMES.length} games, ${HUBS.length} hubs`);

/* ── 1: the hub list, App.tsx and the sitemap all say the same thing ──── */
console.log('2) the hub list, the router and the sitemap agree');
const app = readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
const mounted = new Set(
  [...app.matchAll(/<Route path="([^"]+)" element=\{<SportHub route="([^"]+)" ?\/>\}/g)].map(m => m[1]),
);
for (const [, m] of [...app.matchAll(/<Route path="([^"]+)" element=\{<SportHub route="([^"]+)" ?\/>\}/g)].entries()) {
  if (m[1] !== m[2]) fail(`App.tsx mounts SportHub at ${m[1]} but hands it the route string ${m[2]}, so it would draw the wrong hub`);
}
for (const h of HUBS) {
  if (!mounted.has(h.route)) fail(`${h.route} is defined in sportHub.ts and is not mounted in App.tsx, so it is a 404`);
}
for (const r of mounted) {
  if (!HUBS.some(h => h.route === r)) fail(`App.tsx mounts a hub at ${r} that sportHub.ts does not define, so it would redirect home`);
}
const gen = readFileSync(path.join(ROOT, 'scripts/genSitemap.mjs'), 'utf8');
for (const h of HUBS) {
  if (!new RegExp(`p: '${h.route}'`).test(gen)) {
    fail(`${h.route} is a real hub and is not in genSitemap's STATIC_PAGES, so it will never be submitted`);
  }
}
/* Nothing may gather categories outside this system. A one-off page that
   filters the registry by hand is exactly what /college was. */
const PAGES = path.join(ROOT, 'src/pages');
const strays = readdirSync(PAGES)
  .filter(f => f.endsWith('.tsx') && f !== 'SportHub.tsx' && f !== 'Index.tsx')
  .filter(f => /categoriesByTitle\s*\(/.test(readFileSync(path.join(PAGES, f), 'utf8')));
for (const f of strays) fail(`${f} gathers categories on its own instead of through sportHub.ts, so nothing checks what it renders`);
console.log(`   ${HUBS.length} hubs, all mounted, all in the sitemap, ${strays.length} pages gathering categories on their own`);

/* ── the shipped documents: the home page from the template, everything
      else from its prerendered snapshot, which is what the host serves ─── */
const docs = [['/', readFileSync(path.join(ROOT, 'index.html'), 'utf8')]];
for (const d of readdirSync(PUBLIC)) {
  const f = path.join(PUBLIC, d, 'index.html');
  if (existsSync(f)) docs.push(['/' + d, readFileSync(f, 'utf8')]);
}
const hrefsOf = h => new Set(
  [...h.matchAll(/href="(\/[^"#?]*)"/g)].map(m => m[1].replace(/\/$/, '') || '/'),
);
const textOf = h => h
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ');
const byRoute = new Map(docs);
console.log(`   ${docs.length} shipped documents read`);

/* ── 2 and 3: each hub contains what it says it does ──────────────────── */
console.log('3) every hub links every game it gathers, and its count is true');
for (const hub of HUBS) {
  const html = byRoute.get(hub.route);
  if (!html) { fail(`${hub.route} has no shipped document, so the hub ships as an empty shell`); continue; }
  const want = CATEGORIES.filter(c => hub.titles.includes(c.title)).flatMap(c => c.games);
  if (!want.length) {
    fail(`${hub.route} gathers ${hub.titles.join(' + ')} and the registry has NO games under those titles, which is the Round 268 bug exactly`);
    continue;
  }
  const have = hrefsOf(html);
  const missing = want.filter(g => !have.has(g.path));
  for (const g of missing.slice(0, 8)) fail(`${hub.route} claims to gather ${g.label} and does not link ${g.path}`);
  if (missing.length > 8) fail(`${hub.route} is missing ${missing.length} of its ${want.length} games in total`);

  const printed = textOf(html).match(hub.count);
  if (!printed) {
    fail(`${hub.route} no longer prints a count of its own games in the shape this file checks, so the count is unguarded`);
  } else if (Number(printed[1]) !== want.length) {
    fail(`${hub.route} tells the reader ${printed[1]} games and the registry has ${want.length}`);
  }
  console.log(`   ${hub.route}: ${want.length - missing.length}/${want.length} games linked, printed count ${printed ? printed[1] : 'GONE'}`);
}

/* ── 4: no page claims zero of its own content ────────────────────────── */
console.log('4) no shipped page tells the reader it has nothing');
/* Deliberately narrow. A bare zero appears all over this site inside real
   scorelines (17-0, 3-0 and up) and those are not bugs, so this matches only
   a zero that is counting the site's own content. */
const ZERO_CLAIM = /\ball 0 \b|\b0 (?:games?|players?|results?|seasons?|clubs?|puzzles?|entries|items)\b|\bno games (?:here|yet|found)\b/i;
/* Quoted text is not the page speaking about itself. The What's New entry for
   THIS round quotes the broken sentence verbatim, because that is how the
   changelog explains what was wrong, and the first version of this check
   failed the changelog for reporting the bug it was written to catch. A check
   that cries wolf is worse than no check, so quoted spans come out first. A
   real empty state does not render inside quotation marks. */
const unquoted = s => s.replace(/"[^"]{0,400}"|“[^”]{0,400}”/g, ' ');
let zeroClaims = 0;
for (const [route, html] of docs) {
  const t = unquoted(textOf(html));
  const m = t.match(ZERO_CLAIM);
  if (m) { zeroClaims += 1; fail(`${route} renders "${m[0].trim()}", which tells a reader and a crawler the page is empty`); }
}
console.log(`   ${zeroClaims} pages claiming zero, out of ${docs.length}`);

/* ── 5: no game falls out of the link graph ───────────────────────────── */
console.log('5) every game is reachable, and chrome is not allowed to do the work');
const freq = new Map();
for (const [, html] of docs) for (const h of hrefsOf(html)) freq.set(h, (freq.get(h) || 0) + 1);
const chrome = new Set([...freq.entries()].filter(([, n]) => n >= docs.length * 0.9).map(([r]) => r));
const gamePaths = new Set(ALL_GAMES.map(g => g.path));
const inbound = new Map([...gamePaths].map(p => [p, 0]));
for (const [route, html] of docs) {
  for (const h of hrefsOf(html)) if (gamePaths.has(h) && h !== route) inbound.set(h, inbound.get(h) + 1);
}
const graded = [...inbound.entries()].filter(([p]) => !chrome.has(p));
const thin = graded.filter(([, n]) => n < 2);
for (const [p, n] of thin.slice(0, 8)) fail(`${p} is linked from ${n} page(s) and is not in the site chrome, so it is all but unreachable`);
if (thin.length > 8) fail(`${thin.length} games are all but unreachable in total`);
const nums = graded.map(([, n]) => n).sort((a, b) => a - b);
console.log(`   ${chrome.size} chrome links, ${graded.length} games graded on body links: min ${nums[0]}, median ${nums[Math.floor(nums.length / 2)]}, max ${nums[nums.length - 1]}`);

console.log('');
if (failures > 0) {
  console.error(`simHubs: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simHubs: green. Every hub contains what it promises, and no page tells anyone it is empty.');
