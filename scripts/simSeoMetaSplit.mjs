/**
 * ROUND 700: THE SEOMETA SPLIT CHANGED NOTHING A CRAWLER READS.
 *
 * Round 642 put every game's search title and description in one lazy chunk,
 * and every game page downloaded all 127 entries (9.3K gzipped) to read one.
 * Round 700 split that chunk into 32 parts by a hash of the path
 * (scripts/genSeoMetaParts.mjs) so a page fetches only the part holding its
 * own entry. The words did not change, so nothing a search engine reads may
 * change either. The saved pages in public/<route>/index.html were written by
 * the prerenderer from main, before the split, and they hold each page's head
 * verbatim. That makes them the baseline: draw every page from the split build
 * EXACTLY the way the prerenderer draws it, and the head it would capture has
 * to say what the saved page already says.
 *
 * HOW A PAGE IS DRAWN. As scripts/prerender.mjs does it, step for step: dist
 * served with the bare vite shell for every route (so nothing of the saved
 * page leaks into the draw), the prerender flag and the clock of the first
 * sample set before any page code runs, storage cleared, the database left
 * hanging, the analytics hosts refused, then wait for the body, for the guide
 * to land and for the head to read the same twice running, then settle. The
 * home page is not prerendered, so its baseline is the template, index.html.
 *
 *   1. THE HEAD. On every route: the <title>, the meta description, the
 *      canonical, the robots tag, og:title, og:description, og:url,
 *      twitter:title, twitter:description, and the set of JSON-LD blocks
 *      (parsed, keys sorted, so a reorder is not a change and a changed value
 *      is), each equal to the saved page's, tag for tag. Both heads are read
 *      by the same function in the same browser, so the parser cannot
 *      disagree with itself. Reported beside it, not asserted: how many
 *      captured heads are byte identical to the saved head, after the
 *      prerenderer's own clean up (styles and /assets tags out, JSON-LD
 *      sorted).
 *   2. THE PARTS ON THE WIRE. A game page fetches exactly one part, its own
 *      (the part the generator put its path in), and no page fetches the old
 *      whole map or a part that is not its own. A page with no entry fetches
 *      none. This is the round's claim, measured in the browser rather than
 *      read off the source.
 *   3. COVERAGE. An unscoped run draws at least 40 routes, the home page,
 *      every hub in src/lib/sportHubNav.ts and at least one game in every one
 *      of the 32 parts, so every part chunk has been fetched and read by a
 *      real page.
 *   4. MAIN'S TABLE, ENTRY FOR ENTRY (run first, no browser). main's own
 *      src/data/seoMeta.ts, read with git show (SEO_SPLIT_BASE_REF, default
 *      origin/main, so fetch first), against what the split serves: for EVERY
 *      route in it, the title and description in the part the page's own
 *      lookup picks must equal main's, in the committed part files and in the
 *      built chunks alike, and a route on one side only is a finding. Added
 *      when Release K landed two games and a reworded description on main in
 *      the unsplit shape, which a merge could lose without a single page in
 *      section 1 noticing, since the saved pages of the new games are new too.
 *      Measured 2026-10-01 after that merge: 132 routes, all equal at both
 *      levels.
 *
 * MEASURED HEADROOM. Nothing here is a band: every check is an equality, and
 * a single disagreeing tag is a failure. On 2026-10-01, three runs over the
 * 167 sitemap routes (166 saved pages plus the template) found every field
 * equal on every route, with timing that varied by seconds between runs.
 *
 * RED THAT IS NOT THIS ROUND'S BUG. Section 1 holds the live head to the
 * saved page, so a branch that legitimately changes what a head says (a guide
 * FAQ reworded, a title changed in src/data/seoMeta.ts) is red there until the
 * saved pages are drawn again at release. That is the check doing its job:
 * the source and the saved page disagree, and only the release build makes
 * them agree. Section 4 compares with main's source instead, so it reads such
 * a branch's new words as a difference from main too, and says which route.
 *
 * NEGATIVE CONTROLS (SEO_SPLIT_CONTROL). Each must turn exactly its own route
 * red, and the harness exits 1 when it does (caught) and 2 when anything else
 * happens (the control proves nothing):
 *   wrongpart   /club-manager is served another part's chunk in place of its
 *               own, the shape of a lookup that disagrees with where the
 *               generator put the entry. The page then renders its own prop
 *               title and description and a Game block named after it, and
 *               section 1 must catch it on that route alone. Section 2 stays
 *               quiet by design: it reads addresses, and the swap keeps the
 *               page's own part address while changing the body. The
 *               control refuses to run unless its own part file holds
 *               /club-manager and the substitute does not, and it counts the
 *               swapped responses: zero means it never fired.
 *   savedcanon  the saved /soccer hub head is edited, in memory only, to
 *               canonicalise to the home page; section 1 must catch the
 *               canonical on /soccer alone. It refuses to run unless the
 *               saved head carries the canonical it rewrites.
 *   lostentry   /nhl-gauntlet-draft (new in Release K) is cut out of the text
 *               of its part, committed file and built chunk, in memory, the
 *               shape of a merge that kept the parts and lost main's new
 *               entry; section 4 must report it missing at both levels, on
 *               that route alone. No browser.
 *   staledesc   /sports-bingo's description in the text of its part, both
 *               levels, is put back to the words it had before Release K
 *               reworded it on main; section 4 must catch the description at
 *               both levels, on that route alone. No browser.
 *   extraentry  the other direction: /deadline-day (new in Release K) is cut
 *               out of main's table text, in memory, so the split serves a
 *               route main does not have; section 4 must report it extra at
 *               both levels, on that route alone. No browser.
 *   The three section 4 controls refuse to run unless the text they cut or
 *   replace occurs exactly once where they edit it, and they edit the bytes
 *   the section reads, never its parsed result.
 *
 * Run: vite build (or npm run build), then node scripts/simSeoMetaSplit.mjs
 *   SEO_SPLIT_STATIC=1    section 4 alone, no browser (seconds, not minutes)
 *   SEO_SPLIT_BASE_REF=r  the git ref whose table section 4 reads (origin/main)
 *   SEO_SPLIT_ONLY=/a,/b  scope the run (coverage is then reported, not held)
 *   SEO_SPLIT_SETTLE=ms   the settle after the head stops moving (3500, the prerenderer's)
 *   SEO_SPLIT_WORKERS=n   pages drawn at once (4)
 * Never run it while a build is writing dist.
 */
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { SAMPLE_DAYS, clockScript } from './lib/prerenderClock.mjs';
import { PART_COUNT, PART_DIR, partOf, readSource, evalSeoMeta } from './genSeoMetaParts.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const ASSETS = path.join(DIST, 'assets');
const PUBLIC = path.join(ROOT, 'public');
const SETTLE_MS = Number(process.env.SEO_SPLIT_SETTLE || 3500);
const WORKERS = Math.max(1, Number(process.env.SEO_SPLIT_WORKERS || 4));
const BASE_URL = 'https://douknowball.com';

const CONTROLS = {
  wrongpart: { route: '/club-manager', finding: 'title', section: 1 },
  savedcanon: { route: '/soccer', finding: 'canonical', section: 1 },
  lostentry: { route: '/nhl-gauntlet-draft', finding: 'missing', section: 4 },
  staledesc: { route: '/sports-bingo', finding: 'description', section: 4 },
  extraentry: { route: '/deadline-day', finding: 'extra', section: 4 },
};
const CONTROL = process.env.SEO_SPLIT_CONTROL || '';
const abort = m => { console.error(`simSeoMetaSplit: cannot run: ${m}`); process.exit(2); };
if (CONTROL && !CONTROLS[CONTROL]) abort(`SEO_SPLIT_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
const lf = s => s.replaceAll('\r\n', '\n');

/* ---- the build has to be a split build of this tree ---- */
if (!fs.existsSync(path.join(DIST, 'index.html'))) abort('no dist/index.html; run a vite build first');
const SHELL = fs.readFileSync(path.join(DIST, 'index.html'));
if (!/<script[^>]+type="module"[^>]+src="\/assets\//.test(SHELL.toString('utf8'))) abort('dist/index.html is not a fresh vite shell (no hashed entry module); run a vite build');
const assetNames = fs.readdirSync(ASSETS);
const partFile = new Map();
for (const n of assetNames) {
  const m = n.match(/^seoMetaPart(\d\d)-[^.]+\.js$/);
  if (m) partFile.set(Number(m[1]), n);
}
const wholeMap = assetNames.filter(n => /^seoMeta-[^.]+\.js$/.test(n));
if (partFile.size !== PART_COUNT) abort(`dist/assets holds ${partFile.size} part chunks, not ${PART_COUNT}${wholeMap.length ? ` and the whole map ${wholeMap.join(', ')}` : ''}; dist predates the split, rebuild it`);
const SEO_META = await readSource(ROOT);
const gamePaths = new Set(Object.keys(SEO_META));

/* ---- 4. main's unsplit table, entry for entry, before any page is drawn ----
   A merge of main can bring entries the split never saw (Release K added two
   games and reworded one description in the one file, src/data/seoMeta.ts).
   The parts are generated from that file, so a merge that kept it and forgot
   to regenerate, or one that resolved a conflict in the parts by hand, would
   serve stale or missing text, and only the pages drawn in section 1 would
   notice. This reads main's copy of the table straight out of git and holds
   every route in it to what the split actually serves, at two levels: the
   committed part files, and the built chunks a browser fetches. Each route is
   looked up with the page's own part function, evaluated from the generated
   src/data/seoMetaParts/index.ts, and its loader list, not this harness's
   partOf, so a lookup that disagrees with where the generator put an entry
   is a finding here too. A route on one side only is a finding either way. */
const BASE_REF = process.env.SEO_SPLIT_BASE_REF || 'origin/main';
const mainFindings = new Map();
const addMain = (route, m) => { if (!mainFindings.has(route)) mainFindings.set(route, []); mainFindings.get(route).push(m); };
let mainRoutes = 0, mainLevels = [];
{
  let mainText;
  try {
    mainText = execFileSync('git', ['show', `${BASE_REF}:src/data/seoMeta.ts`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 });
  } catch (e) {
    abort(`git show ${BASE_REF}:src/data/seoMeta.ts failed (${String(e?.message ?? e).split('\n')[0]}); fetch origin or set SEO_SPLIT_BASE_REF`);
  }
  if (CONTROL === 'extraentry') {
    const key = `\n  '${CONTROLS.extraentry.route}': {\n`;
    mainText = lf(mainText);
    const at = mainText.indexOf(key);
    if (at < 0 || mainText.indexOf(key, at + 1) >= 0) abort(`control extraentry: ${BASE_REF}'s table does not carry ${CONTROLS.extraentry.route} exactly once in the written shape`);
    const end = mainText.indexOf('\n  },\n', at);
    mainText = mainText.slice(0, at) + mainText.slice(end + '\n  },'.length);
    console.log(`CONTROL extraentry: ${CONTROLS.extraentry.route} is cut out of ${BASE_REF}'s table text, in memory; section 4 must go red on ${CONTROLS.extraentry.route} alone, served by the split and not on main`);
  }
  const MAIN = await evalSeoMeta(ROOT, mainText, `${BASE_REF}:src/data/seoMeta.ts`);
  mainRoutes = Object.keys(MAIN).length;
  if (mainRoutes < 100) abort(`${BASE_REF}'s table evaluated to ${mainRoutes} entries, fewer than 100; it is not being read`);

  const { transformWithEsbuild } = await import('vite');
  const importText = async js => import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  const evalTs = async (ts, file) => importText((await transformWithEsbuild(ts, file, { loader: 'ts', format: 'esm', sourcemap: false })).code);

  /* The page's lookup and its loader list, from the generated index. */
  const indexFile = path.join(ROOT, PART_DIR, 'index.ts');
  const indexText = lf(fs.readFileSync(indexFile, 'utf8'));
  const index = await evalTs(indexText, indexFile);
  if (typeof index.seoMetaPart !== 'function') abort(`${PART_DIR}/index.ts exports no seoMetaPart`);
  const loaderNames = [...indexText.matchAll(/^\s*\(\) => import\('\.\/(seoMetaPart\d\d)'\),$/gm)].map(m => m[1]);
  if (loaderNames.length !== index.SEO_META_PARTS?.length || loaderNames.length !== PART_COUNT) {
    abort(`${PART_DIR}/index.ts lists ${loaderNames.length} loader file names for ${index.SEO_META_PARTS?.length} loaders, expected ${PART_COUNT}`);
  }

  /* The two texts of every part, the committed file and the built chunk. The
     controls edit these texts, never the parsed result, so a control that
     fires has changed the very bytes this section reads. */
  const committedText = new Map(), builtText = new Map();
  for (const name of new Set(loaderNames)) {
    committedText.set(name, lf(fs.readFileSync(path.join(ROOT, PART_DIR, `${name}.ts`), 'utf8')));
    const chunk = partFile.get(Number(name.slice(-2)));
    if (!chunk) abort(`dist/assets holds no chunk for ${name}`);
    builtText.set(name, fs.readFileSync(path.join(ASSETS, chunk), 'utf8'));
  }
  if (CONTROL === 'lostentry' || CONTROL === 'staledesc') {
    const route = CONTROLS[CONTROL].route;
    const e = MAIN[route];
    if (!e) abort(`control ${CONTROL}: ${BASE_REF}'s table has no ${route}, so the control proves nothing`);
    const name = loaderNames[index.seoMetaPart(route)];
    const q = JSON.stringify;
    const edits = CONTROL === 'lostentry'
      ? [[committedText, `  ${q(route)}: {\n    title: ${q(e.title)},\n    description: ${q(e.description)},\n  },\n`, ''],
         [builtText, `${q(route)}:{title:${q(e.title)},description:${q(e.description)}}`, null]]
      /* The words Sports Bingo carried before Release K reworded them. */
      : [[committedText, q(e.description), q('Open timed packs of real players and mark every square on your soccer bingo card they satisfy before the pack closes. Daily, unlimited or race a CPU. Free.')],
         [builtText, q(e.description), q('Open timed packs of real players and mark every square on your soccer bingo card they satisfy before the pack closes. Daily, unlimited or race a CPU. Free.')]];
    for (const [texts, from, to] of edits) {
      const text = texts.get(name);
      const count = text.split(from).length - 1;
      if (count !== 1) abort(`control ${CONTROL}: ${name} carries ${route}'s text ${count} times in the ${texts === committedText ? 'committed file' : 'built chunk'}, not once`);
      if (to !== null) texts.set(name, text.replace(from, to));
      else {
        /* A minified entry is followed by a comma, or preceded by one when it is last. */
        const at = text.indexOf(from);
        const after = text[at + from.length] === ',';
        texts.set(name, after ? text.slice(0, at) + text.slice(at + from.length + 1) : text.slice(0, at - (text[at - 1] === ',' ? 1 : 0)) + text.slice(at + from.length));
      }
    }
    console.log(`CONTROL ${CONTROL}: ${route} is ${CONTROL === 'lostentry' ? 'dropped from' : 'given its pre Release K description in'} ${name}, committed and built, in memory; section 4 must go red on ${route} alone`);
  }

  for (const [level, texts] of [['committed', committedText], ['built', builtText]]) {
    const parts = new Map();
    for (const [name, text] of texts) {
      const mod = level === 'committed' ? await evalTs(text, path.join(ROOT, PART_DIR, `${name}.ts`)) : await importText(text);
      if (!mod.SEO_META_PART || typeof mod.SEO_META_PART !== 'object') abort(`the ${level} ${name} exports no SEO_META_PART`);
      parts.set(name, mod.SEO_META_PART);
    }
    const holders = new Map();
    for (const [name, rec] of parts) for (const r of Object.keys(rec)) holders.set(r, [...(holders.get(r) ?? []), name]);
    for (const route of new Set([...Object.keys(MAIN), ...holders.keys()])) {
      const own = loaderNames[index.seoMetaPart(route)];
      const served = parts.get(own)?.[route];
      const at = holders.get(route) ?? [];
      if (!(route in MAIN)) { addMain(route, `${level} extra: served from ${at.join(', ')} but not in ${BASE_REF}'s table`); continue; }
      if (at.length > 1) addMain(route, `${level} duplicate: held by ${at.join(', ')}`);
      if (!served) { addMain(route, `${level} missing: in ${BASE_REF}'s table, but ${own}, the part the page loads, does not hold it${at.length ? ` (it sits in ${at.join(', ')})` : ''}`); continue; }
      for (const k of ['title', 'description']) {
        if (served[k] !== MAIN[route][k]) addMain(route, `${level} ${k}: the split serves ${JSON.stringify(served[k])}, ${BASE_REF} says ${JSON.stringify(MAIN[route][k])}`);
      }
    }
    mainLevels.push(`${level} ${[...holders.keys()].length}`);
  }
}
const reportMain = () => {
  console.log(`4) ${BASE_REF}'s unsplit table, every route's title and description equal to what the split serves`);
  let shown = 0;
  for (const [route, ms] of mainFindings) for (const m of ms) { if (shown < 24) console.error(`  FAIL: ${route}: ${m}`); shown += 1; }
  if (shown > 24) console.error(`  ... and ${shown - 24} more`);
  console.log(`   ${mainFindings.size ? 'RED' : 'ok '} ${mainRoutes} routes in ${BASE_REF}'s table; routes the split serves: ${mainLevels.join(', ')}; ${mainFindings.size} route(s) disagree`);
};
/* SEO_SPLIT_STATIC=1, or a section 4 control: section 4 alone, no browser. */
if (process.env.SEO_SPLIT_STATIC || CONTROLS[CONTROL]?.section === 4) {
  reportMain();
  if (CONTROL) {
    const want = CONTROLS[CONTROL];
    if (want.section !== 4) abort(`control ${CONTROL} draws pages; run it without SEO_SPLIT_STATIC`);
    const msgs = mainFindings.get(want.route) ?? [];
    const hit = ['committed', 'built'].every(l => msgs.some(m => m.startsWith(`${l} ${want.finding}:`)));
    if (hit && mainFindings.size === 1) {
      console.log(`simSeoMetaSplit control ${CONTROL}: red on ${want.route} alone with its ${want.finding}, in the committed part and the built chunk, the break was caught where it should be (exit 1)`);
      process.exit(1);
    }
    console.error(`simSeoMetaSplit control ${CONTROL}: DEAD OR LEAKY. ${want.finding} on ${want.route} at both levels=${hit}, red routes [${[...mainFindings.keys()].join(', ') || 'none'}]`);
    process.exit(2);
  }
  process.exit(mainFindings.size ? 1 : 0);
}

/* ---- the routes ---- */
const sitemap = fs.readFileSync(path.join(PUBLIC, 'sitemap.xml'), 'utf8');
const sitemapRoutes = [...sitemap.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)]
  .map(m => m[1] || '/')
  .map(r => (r.endsWith('/') && r !== '/' ? r.slice(0, -1) : r));
const hubs = [...lf(fs.readFileSync(path.join(ROOT, 'src/lib/sportHubNav.ts'), 'utf8')).matchAll(/route:\s*'(\/[^']+)'/g)].map(m => m[1]);
if (hubs.length < 6) abort(`read ${hubs.length} hubs from src/lib/sportHubNav.ts, expected at least 6`);
let routes = [...new Set(['/', ...hubs, ...sitemapRoutes])];
const scoped = Boolean(process.env.SEO_SPLIT_ONLY);
if (scoped) {
  const want = new Set(process.env.SEO_SPLIT_ONLY.split(',').map(s => s.trim()).filter(Boolean));
  const unknown = [...want].filter(r => !routes.includes(r));
  if (unknown.length) abort(`SEO_SPLIT_ONLY names route(s) neither the sitemap nor the hub list knows: ${unknown.join(', ')}`);
  routes = routes.filter(r => want.has(r));
}
if (CONTROL && !routes.includes(CONTROLS[CONTROL].route)) abort(`control ${CONTROL} needs ${CONTROLS[CONTROL].route} in the run`);

/** The saved head a route is held to: the prerendered page's, or the template's for the home page. */
function savedHeadOf(route) {
  const file = route === '/' ? path.join(ROOT, 'index.html') : path.join(PUBLIC, route.slice(1), 'index.html');
  if (!fs.existsSync(file)) return null;
  const doc = lf(fs.readFileSync(file, 'utf8'));
  const open = doc.indexOf('<head>');
  const close = doc.indexOf('</head>');
  if (open < 0 || close < 0) return null;
  let head = doc.slice(open + '<head>'.length, close);
  /* The writer appends its own boot styles, noscript and boot script after the
     captured head (scripts/prerender.mjs); the capture ends where they start. */
  const boot = head.indexOf('<style>html,body{');
  if (route !== '/' && boot >= 0) head = head.slice(0, boot);
  return head.replace(/^\n/, '').replace(/\n$/, '');
}

/* ---- the control's own preconditions ---- */
let swapped = 0;
let swapFrom = '', swapBody = null;
if (CONTROL === 'wrongpart') {
  const own = partOf(CONTROLS.wrongpart.route);
  const other = (own + 1) % PART_COUNT;
  swapFrom = partFile.get(own);
  const ownText = fs.readFileSync(path.join(ASSETS, swapFrom), 'utf8');
  swapBody = fs.readFileSync(path.join(ASSETS, partFile.get(other)));
  if (!ownText.includes('"/club-manager"')) abort(`control wrongpart: ${swapFrom} does not hold /club-manager, so swapping it proves nothing`);
  if (swapBody.toString('utf8').includes('"/club-manager"')) abort(`control wrongpart: the substitute ${partFile.get(other)} holds /club-manager too`);
  console.log(`CONTROL wrongpart: /club-manager is served ${partFile.get(other)} in place of its own ${swapFrom}; it must go red on /club-manager alone`);
}
const savedHeads = new Map();
for (const r of routes) savedHeads.set(r, savedHeadOf(r));
if (CONTROL === 'savedcanon') {
  const r = CONTROLS.savedcanon.route;
  const head = savedHeads.get(r) ?? '';
  const from = `rel="canonical" href="${BASE_URL}${r}"`;
  if (!head.includes(from)) abort(`control savedcanon: the saved ${r} head carries no ${from} to rewrite`);
  savedHeads.set(r, head.replace(from, `rel="canonical" href="${BASE_URL}/"`));
  console.log(`CONTROL savedcanon: the saved ${r} head canonicalises to the home page, in memory; it must go red on ${r} alone`);
}

/* ---- the server: the prerenderer's, the bare shell for every route ---- */
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.json': 'application/json', '.txt': 'text/plain', '.xml': 'application/xml',
  '.webmanifest': 'application/json', '.woff2': 'font/woff2',
};
const isFile = f => { try { return fs.statSync(f).isFile(); } catch { return false; } };
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(DIST, p);
  if (p !== '/' && isFile(f)) {
    let body;
    try { body = fs.readFileSync(f); } catch { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' });
    res.end(body);
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(SHELL);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

/* ---- drawing ---- */
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/New_York' });
  await ctx.routeWebSocket('**/*', socket => socket.close());
  await ctx.addInitScript(clockScript(SAMPLE_DAYS[0], { setPrerenderFlag: true }));
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* blocked, nothing to clear */ }
  });
  await page.route('**/*', route => new URL(route.request().url()).origin === ORIGIN ? route.continue() : route.abort());
  await page.route('**://*.supabase.co/**', () => { /* never settled on purpose, as the prerenderer leaves it */ });
  await page.route('**://*.googletagmanager.com/**', r => r.abort());
  await page.route('**://pagead2.googlesyndication.com/**', r => r.abort());
  // Head and chunk equivalence does not need external font transport.
  await page.route('https://fonts.googleapis.com/**', r => r.abort());
  await page.route('https://fonts.gstatic.com/**', r => r.abort());
  return page;
}

/* Runs in the browser. One reader for the live head and the saved one. */
function readHeads(savedHead) {
  const sortKeys = v => (Array.isArray(v) ? v.map(sortKeys)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])])) : v);
  const read = head => {
    const all = sel => Array.from(head.querySelectorAll(sel));
    const meta = key => all(`meta[name="${key}"], meta[property="${key}"]`).map(e => e.getAttribute('content') ?? '');
    return {
      title: all('title').map(e => e.textContent),
      description: meta('description'),
      canonical: all('link[rel="canonical"]').map(e => e.getAttribute('href') ?? ''),
      robots: meta('robots'),
      'og:title': meta('og:title'),
      'og:description': meta('og:description'),
      'og:url': meta('og:url'),
      'twitter:title': meta('twitter:title'),
      'twitter:description': meta('twitter:description'),
      jsonld: all('script[type="application/ld+json"]').map(e => {
        try { return JSON.stringify(sortKeys(JSON.parse(e.textContent))); } catch { return `UNPARSEABLE ${e.textContent.slice(0, 80)}`; }
      }).sort(),
    };
  };
  /* The prerenderer's own clean up of the live head (scripts/prerender.mjs):
     styles out, /assets tags out, JSON-LD in a stable order. */
  const doc = document.implementation.createHTMLDocument('');
  doc.head.innerHTML = document.head.innerHTML.replace(/<style[\s\S]*?<\/style>/gi, '');
  for (const el of Array.from(doc.head.querySelectorAll('[src], [href]'))) {
    const url = el.getAttribute('src') || el.getAttribute('href') || '';
    if (url.startsWith('/assets/')) el.remove();
  }
  const lds = Array.from(doc.head.querySelectorAll('script[type="application/ld+json"]'));
  if (lds.length > 1) {
    const mark = doc.createComment('ld');
    lds[0].parentNode.insertBefore(mark, lds[0]);
    for (const el of lds) el.remove();
    lds.sort((x, y) => (x.textContent < y.textContent ? -1 : x.textContent > y.textContent ? 1 : 0));
    for (const el of lds) mark.parentNode.insertBefore(el, mark);
    mark.remove();
  }
  const saved = new DOMParser().parseFromString(`<!DOCTYPE html><html><head>${savedHead}</head><body></body></html>`, 'text/html');
  return { live: read(document.head), saved: read(saved.head), capture: doc.head.innerHTML };
}

async function draw(page, route) {
  const parts = [];
  const onRequest = req => {
    const m = req.url().match(/\/assets\/(seoMeta[^/?]*\.js)$/);
    if (m) parts.push(m[1]);
  };
  page.on('request', onRequest);
  const t0 = Date.now();
  const lap = [];
  try {
    await page.goto(`${ORIGIN}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    lap.push(Date.now() - t0);
    await page.waitForFunction(() => (document.body?.innerText ?? '').trim().length > 200, { timeout: 20000 }).catch(() => {});
    lap.push(Date.now() - t0);
    await page.waitForFunction(() => !document.querySelector('[data-seo-content="loading"]'), { timeout: 15000 }).catch(() => {});
    lap.push(Date.now() - t0);
    await page.waitForFunction(() => {
      const now = document.head.innerHTML.length + ':' + document.querySelectorAll('script[type="application/ld+json"]').length;
      const settled = window.__dukbHeadPrev === now;
      window.__dukbHeadPrev = now;
      return settled;
    }, { timeout: 12000, polling: 250 }).catch(() => console.error(`   ${route}: the head was still changing after 12s, reading it anyway`));
    lap.push(Date.now() - t0);
    if (process.env.SEO_SPLIT_DEBUG) console.log(`   ${route}: loaded ${lap[0]}ms, body ${lap[1]}ms, guide ${lap[2]}ms, head settled ${lap[3]}ms`);
    await page.waitForTimeout(SETTLE_MS);
    const heads = await page.evaluate(readHeads, savedHeads.get(route) ?? '');
    return { ...heads, parts: [...new Set(parts)] };
  } finally {
    page.off('request', onRequest);
    await page.goto('about:blank').catch(() => {});
  }
}

const FIELDS = ['title', 'description', 'canonical', 'robots', 'og:title', 'og:description', 'og:url', 'twitter:title', 'twitter:description', 'jsonld'];
/* THE ONE KNOWN DIFFERENCE, AND IT IS NOT THIS ROUND'S. The template,
   index.html, has never carried og:url, while PageSeo emits one on every page,
   the home page included. The home page is not prerendered, so a crawler
   reading it gets the template and never sees the app's og:url. Round 700
   touches neither index.html nor that line of PageSeo. It is allowed in
   exactly that shape and no other: the template has none and the app renders
   the home URL, once. Every other field on the home page is held as tightly
   as on any other route. */
const homeOgUrl = (route, k, a, b) => route === '/' && k === 'og:url' && b.length === 0 && a.length === 1 && a[0] === `${BASE_URL}/`;
let homeOgUrlSeen = false;
const findings = { 1: new Map(), 2: new Map(), 3: [] };
const add = (n, route, m) => { if (!findings[n].has(route)) findings[n].set(route, []); findings[n].get(route).push(m); };
const show = v => JSON.stringify(v).slice(0, 160);
let identical = 0, compared = 0;
const notIdentical = [];
const skipped = [];
const fetchedParts = new Set();

const comparedRoutes = new Set();
async function check(page, route) {
  if (savedHeads.get(route) == null) {
    skipped.push(`${route}: no saved page to compare against`);
    return;
  }
  let r;
  try {
    r = await draw(page, route);
  } catch (first) {
    /* One retry on a fresh page, as the prerenderer retries on a fresh
       browser: a busy machine can time a first load out, and that says
       nothing about the head. A second failure is a finding. */
    console.error(`   retrying ${route} on a fresh page (${String(first?.message ?? first).split('\n')[0].slice(0, 80)})`);
    const fresh = await newPage();
    try {
      r = await draw(fresh, route);
    } catch (e) {
      add(1, route, `could not be drawn twice: ${String(e?.message ?? e).split('\n')[0].slice(0, 100)}`);
      return;
    } finally {
      await fresh.context().close().catch(() => {});
    }
  }
  compared += 1;
  comparedRoutes.add(route);
  for (const k of FIELDS) {
    const a = r.live[k], b = r.saved[k];
    if (homeOgUrl(route, k, a, b)) { homeOgUrlSeen = true; continue; }
    if (a.length !== b.length || a.some((x, i) => x !== b[i])) {
      add(1, route, `${k}: the split build renders ${a.length ? show(a) : 'none'}, the saved page carries ${b.length ? show(b) : 'none'}`);
    }
  }
  if (route !== '/') {
    if (r.capture === savedHeads.get(route)) identical += 1;
    else {
      notIdentical.push(route);
      /* Where it parts company, so a reported difference can be judged
         without a second run. */
      const saved = savedHeads.get(route);
      let i = 0;
      while (i < r.capture.length && r.capture[i] === saved[i]) i += 1;
      console.log(`   ${route}: capture and saved head part at byte ${i} of ${r.capture.length}/${saved.length}:\n      capture ...${JSON.stringify(r.capture.slice(Math.max(0, i - 60), i + 140))}\n      saved   ...${JSON.stringify(saved.slice(Math.max(0, i - 60), i + 140))}`);
    }
  }
  /* 2. the parts on the wire */
  const own = gamePaths.has(route) ? partFile.get(partOf(route)) : null;
  for (const n of r.parts) {
    const m = n.match(/^seoMetaPart(\d\d)-/);
    if (m) fetchedParts.add(Number(m[1]));
  }
  const strays = r.parts.filter(n => n !== own);
  if (strays.length) add(2, route, `fetched ${strays.join(', ')}${own ? `, which is not its own part ${own}` : ', and a page with no entry should fetch none'}`);
  if (own && !r.parts.includes(own)) add(2, route, `never fetched its own part ${own}`);
}

const queue = [...routes];
const started = Date.now();
let done = 0;
async function worker() {
  let page = await newPage();
  while (queue.length) {
    const route = queue.shift();
    if (CONTROL === 'wrongpart' && route === CONTROLS.wrongpart.route) {
      /* Its own page, so the swap can reach no other route. */
      const own = await newPage();
      await own.route(`**/assets/${swapFrom}`, r => {
        swapped += 1;
        r.fulfill({ status: 200, contentType: 'text/javascript', body: swapBody });
      });
      await check(own, route);
      await own.context().close();
    } else {
      try {
        await check(page, route);
      } catch {
        await page.context().close().catch(() => {});
        page = await newPage();
        await check(page, route);
      }
    }
    done += 1;
    if (done % 25 === 0) console.log(`   ${done}/${routes.length} drawn`);
  }
  await page.context().close().catch(() => {});
}
console.log(`simSeoMetaSplit: drawing ${routes.length} routes from the split build, ${WORKERS} at a time, as the prerenderer draws them`);
await Promise.all(Array.from({ length: Math.min(WORKERS, routes.length) }, worker));
await browser.close();
server.close();

/* 3. coverage */
const games = routes.filter(r => gamePaths.has(r));
const gameParts = new Set(games.map(partOf));
if (!scoped) {
  if (compared < 40) findings[3].push(`only ${compared} routes compared, fewer than 40`);
  if (!comparedRoutes.has('/')) findings[3].push('the home page was not compared');
  for (const h of hubs) if (!comparedRoutes.has(h)) findings[3].push(`the hub ${h} was not compared`);
  if (gameParts.size !== PART_COUNT) findings[3].push(`the games drawn cover ${gameParts.size} of the ${PART_COUNT} parts`);
  if (fetchedParts.size !== PART_COUNT) findings[3].push(`the pages fetched ${fetchedParts.size} of the ${PART_COUNT} part chunks`);
}

/* ---- the report ---- */
const TITLES = {
  1: 'the head: title, description, canonical, robots, og, twitter and JSON-LD equal to the saved page',
  2: 'the parts on the wire: a game page fetches its own part and nothing else, other pages fetch none',
  3: 'coverage: 40 or more routes, the home page, every hub and every part',
};
const red = [];
console.log('');
for (const n of [1, 2]) {
  console.log(`${n}) ${TITLES[n]}`);
  const f = findings[n];
  if (f.size) red.push(n);
  let shown = 0;
  for (const [route, ms] of f) {
    for (const m of ms) { if (shown < 24) console.error(`  FAIL: ${route}: ${m}`); shown += 1; }
  }
  if (shown > 24) console.error(`  ... and ${shown - 24} more`);
  console.log(`   ${f.size ? 'RED' : 'ok '} ${n === 1
    ? `${compared} heads compared field by field (${games.filter(g => comparedRoutes.has(g)).length} game pages, ${hubs.filter(h => comparedRoutes.has(h)).length} hubs, ${comparedRoutes.has('/') ? 'the home page against the template' : 'no home page'}); ${identical} of ${compared - (comparedRoutes.has('/') ? 1 : 0)} saved heads byte identical to the capture after the prerenderer's clean up${notIdentical.length ? ` (not: ${notIdentical.slice(0, 6).join(', ')}${notIdentical.length > 6 ? ', ...' : ''})` : ''}${homeOgUrlSeen ? '; the home page differs from the template only by the og:url the template never carried' : ''}`
    : `${fetchedParts.size} distinct part chunks fetched; ${f.size ? `${f.size} page(s) fetched a part not their own or missed their own` : 'no page fetched a part not its own'}`}`);
}
console.log(`3) ${TITLES[3]}`);
for (const m of findings[3]) console.error(`  FAIL: ${m}`);
if (findings[3].length) red.push(3);
console.log(`   ${findings[3].length ? 'RED' : 'ok '} ${scoped ? 'scoped run, coverage reported only: ' : ''}${compared} routes, ${games.length} games over ${gameParts.size} parts, ${fetchedParts.size} part chunks fetched, ${Math.round((Date.now() - started) / 1000)}s`);
for (const s of skipped) console.log(`   SKIP (loud): ${s}`);
reportMain();
if (mainFindings.size) red.push(4);
console.log('');

if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const redRoutes = new Set([...findings[1].keys(), ...findings[2].keys(), ...mainFindings.keys()]);
  const fired = CONTROL !== 'wrongpart' || swapped > 0;
  const hit = (findings[1].get(want.route) ?? []).some(m => m.startsWith(`${want.finding}:`));
  const wire = CONTROL !== 'wrongpart' || (findings[2].get(want.route) ?? []).length === 0;
  const caught = fired && hit && redRoutes.size === 1 && redRoutes.has(want.route) && !findings[3].length;
  if (caught) {
    console.log(`simSeoMetaSplit control ${CONTROL}: red on ${want.route} alone with its ${want.finding}${CONTROL === 'wrongpart' ? ` (${swapped} swapped response(s); ${wire ? 'it still fetched only its own part address, the swap was in the body' : ''})` : ''}, the break was caught where it should be (exit 1)`);
    process.exit(1);
  }
  console.error(`simSeoMetaSplit control ${CONTROL}: DEAD OR LEAKY. fired=${fired} (${swapped} swaps), finding on ${want.route}=${hit}, red routes [${[...redRoutes].join(', ') || 'none'}]`);
  process.exit(2);
}
if (red.length) {
  console.error(`simSeoMetaSplit: RED in section${red.length === 1 ? '' : 's'} ${red.join(', ')}`);
  process.exit(1);
}
if (process.env.SIM_OFFLINE_RECEIPT && fs.existsSync(process.env.SIM_OFFLINE_RECEIPT)) {
  const traffic = fs.readFileSync(process.env.SIM_OFFLINE_RECEIPT, 'utf8').trim();
  if (traffic) console.error(`simSeoMetaSplit transport receipt: ${traffic}`);
}
console.log(`simSeoMetaSplit: green. ${compared} pages drawn from the split build carry the saved head in every field a crawler reads, every game page fetched only its own part, and all ${mainRoutes} routes in ${BASE_REF}'s table are served with the same title and description.`);
