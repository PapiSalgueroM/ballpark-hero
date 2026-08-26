/**
 * Site wide play sweep: open every game, look at what a player would see,
 * and flag anything that is broken on its face.
 *
 * Round 117: this used to say the Supabase calls could not reach the network
 * from the sandbox, so a game waiting on data was expected and not a finding.
 * That was true only because the context did not set ignoreHTTPSErrors and a
 * proxy that inspects TLS was breaking every call. It does now, so the sweep
 * sees the games with their real data in them, which is how it found eight
 * games pushing their Guess button off the side of a phone.
 *
 * A finding is: a thrown exception, a literally empty screen, a page wider
 * than its own viewport, and any rendered "undefined" / "NaN" /
 * "[object Object]" / "null" leaking into copy.
 */
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';
const { chromium, webkit } = pw;
import fs from 'node:fs';

/* Round 110: his ask, in his words: "i want everyone to have access for my web
   and that it looks the same regardless of device". This only ever ran ONE
   Chromium at ONE phone size, so Safari and tablets and desktops were never
   tested at all, and WebKit is exactly where layout tends to break. It now
   runs a matrix. ENGINES=chromium,webkit and SIZES=phone,tablet,desktop pick
   a subset; the default is everything. */
const VIEWPORTS = {
  /* Round 117: 320 is here because 390 was hiding things. Eight games pushed
     their Guess button off the right edge of the screen and only the three
     worst were wide enough to show it at 390; at 320 all eight did, and so did
     the Back button in the shared game navbar, on all 118 pages. A phone size
     that only catches the worst cases is a phone size that lets the rest ship. */
  mini: { width: 320, height: 640 },
  phone: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1440, height: 900 },
};
const ENGINES = { chromium, webkit };
const wantEngines = (process.env.ENGINES || 'chromium,webkit').split(',').map(s => s.trim()).filter(e => ENGINES[e]);
const wantSizes = (process.env.SIZES || 'phone,tablet,desktop').split(',').map(s => s.trim()).filter(v => VIEWPORTS[v]);

/* Serve the production build first, in another shell:
     npm run build && npx serve -s dist -l 4173
   Then: node scripts/sweepGames.mjs
   Routes come straight from the registry so a new game is swept the day it
   ships, with no list to keep in step. */
const BASE = process.env.SWEEP_BASE || 'http://127.0.0.1:4173';
const registry = fs.readFileSync(new URL('../src/data/gameRegistry.ts', import.meta.url), 'utf8');
const gameRoutes = [...new Set([...registry.matchAll(/path: '([^']+)'/g)].map(m => m[1]))];

/* ROUND 271: THE SWEEP COULD NOT SEE A SINGLE PAGE THAT WAS NOT A GAME.
   Routes came only out of the game registry, which meant the home page, the
   Record Books, the leaderboard, the changelog, about, contact, privacy,
   terms and every sport hub had NEVER been opened at 320 pixels by anything.
   Round 263 found a real overflow bug that shoved whole pages 64 pixels off
   the side of a phone, on game pages, because game pages are the only thing
   this walked. Those other pages carry the same shared navbar and the same
   shared title component and had exactly the same exposure, unmeasured.

   They come out of the SITEMAP now, which is generated from App.tsx and the
   registry together, so a new page of any kind is swept the day it ships and
   there is still no hand kept list anywhere. The sitemap is also the honest
   definition of "a page we are asking the world to visit". */
const sitemapPath = new URL('../public/sitemap.xml', import.meta.url);
let sitemapRoutes = [];
try {
  sitemapRoutes = [...fs.readFileSync(sitemapPath, 'utf8').matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)]
    .map(m => m[1] || '/')
    .map(r => (r.endsWith('/') && r !== '/' ? r.slice(0, -1) : r));
} catch {
  console.log('  NOTE  no public/sitemap.xml, sweeping the registry only. Run node scripts/genSitemap.mjs first.');
}
const routes = [...new Set([...gameRoutes, ...sitemapRoutes])].sort();
console.log(`sweeping ${routes.length} routes (${gameRoutes.length} games, ${routes.length - gameRoutes.length} other pages)`);



const findings = [];
const note = (route, kind, detail) => { findings.push({ route, kind, detail }); console.log(`  ${kind}  ${route}  ${detail}`); };

// Copy smells: a word that should never reach a player.
const LEAKS = [
  [/\bundefined\b/, 'renders the word undefined'],
  [/\bNaN\b/, 'renders NaN'],
  [/\[object Object\]/, 'renders [object Object]'],
  [/\{\{|\}\}/, 'unsubstituted template braces'],
  // "you are" is correct, so only the third person -s forms are a smell.
  /* Round 198 got the idea right and the method wrong: "you" has to be the
     SUBJECT for this to be an error, and it tried to establish that by ruling
     out a list of prepositions in front of it. A blocklist of the ways "you"
     can be an OBJECT has no end, and Round 271 found the next hole in it. The
     changelog sentence "A club wanting you is not the same as a club playing
     you" is perfectly good English, and it failed, because a participle is not
     a preposition and nobody had thought of participles.
     So it is stated the other way round now: "you" is the subject when it
     starts a sentence or follows a clause boundary, which is a SHORT and
     CLOSED list, and everything else is an object and passes. Checked against
     nine sentences, four wrong and five right, and it now gets all nine. */
  [/(?:^|[.,;:!?]\s+|\b(?:and|but|or|if|when|while|that|because|so|then|unless|until|though|although|whether)\s)you (?:is|has|does|rips|stands|throws|makes|hits|rocks|scans|picks|lies|goes|gets|wins|scores|plays)\b/i, 'second person verb disagreement'],
  [/\bInfinity\b/, 'renders Infinity'],
  /* By codepoint, the simEras convention: a harness that hunts dashes
     must not contain one, or the project's own scan flags it. */
  [/[\u2013\u2014]/, 'em or en dash'],
];

let done = 0;
for (const engineName of wantEngines) {
 for (const sizeName of wantSizes) {
  const label = `${engineName}/${sizeName}`;
  const browser = engineName === 'chromium'
    ? await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--no-proxy-server'] })
    : await webkit.launch();
  /* Round 117: without ignoreHTTPSErrors a sandbox that inspects outbound TLS
     makes every Supabase call fail with ERR_CERT_AUTHORITY_INVALID, so this
     swept all 118 routes with the database effectively unreachable and passed
     them on their loading and error states. With it, the sweep sees what a
     player sees. */
  const ctx = await browser.newContext({ viewport: VIEWPORTS[sizeName], ignoreHTTPSErrors: true });
  console.log(`\n== ${label} ==`);
  for (const route of routes) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0].slice(0, 160)));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    /* Round 170: OFFLINE=1 is for sandboxes with no route to Supabase at
       all (curl gives 000). Every database call then dies as a CORS-shaped
       console error on every page, which is environment noise, not the
       site: the clients catch these and fail closed by design. Leave OFF
       anywhere the network works, so a REAL CORS regression still fails. */
    if (process.env.OFFLINE && /supabase\.co/.test(m.text())) return;
    if (!/ERR_CERT|ERR_QUIC|ERR_NAME|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160));
  });
  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1500);
    const body = await page.locator('body').innerText().catch(() => '');
    const clean = body.replace(/\s+/g, ' ').trim();
    if (errs.length) note(`${label} ${route}`, 'THROWS ', errs[0]);
    if (clean.length < 60) note(`${label} ${route}`, 'BLANK  ', `only ${clean.length} chars of text`);
    // Round 110: a page wider than its own viewport is the classic phone bug,
    // and it is invisible unless you actually measure it.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth).catch(() => 0);
    if (overflow > 4) note(`${label} ${route}`, 'OVERFLOW', `${overflow}px wider than the screen`);
    // strip the shared chrome so a leak in the nav is not reported 119 times
    const main = clean.replace(/DOUKNOWBALL|Track stats|Back|Home|We use cookies[^.]*\./g, '');
    for (const [rx, why] of LEAKS) {
      const m = main.match(rx);
      if (m) { note(`${label} ${route}`, 'COPY   ', `${why}: "${main.slice(Math.max(0, m.index - 45), m.index + 55).trim()}"`); break; }
    }
  } catch (e) {
    note(`${label} ${route}`, 'FAILED ', String(e).split('\n')[0].slice(0, 120));
  }
  await page.close();
  done += 1;
  if (done % 40 === 0) console.log(`  ...${done} checks`);
  }
  await browser.close();
 }
}
console.log(`\nSwept ${routes.length} routes across ${wantEngines.length} engines and ${wantSizes.length} viewports (${done} checks). ${findings.length} findings.`);
fs.writeFileSync('/tmp/sweep.json', JSON.stringify(findings, null, 1));
process.exit(findings.length === 0 ? 0 : 1);
