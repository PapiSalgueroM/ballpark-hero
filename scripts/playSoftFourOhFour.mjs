/**
 * ROUND 282 BROWSER HARNESS: a dead address does not answer as the home page.
 *
 * WHAT WAS WRONG. The host answers every unknown address with index.html and a
 * 200, which is how a single page app is normally served. Asked as Googlebot on
 * the live site on 2026-08-24, /this-page-does-not-exist-12345 came back 200,
 * 18,725 bytes, the home page's title, the home page's readable copy, the home
 * page's canonical, and no robots tag. Google calls that a soft 404 and has two
 * complaints about it: it burns crawl budget on an unlimited number of addresses
 * that do not exist, and since Round 257 put real copy into the template, every
 * one of those addresses serves a full duplicate of the site's most important
 * page. The app has rendered a proper noindexed 404 since Round 53, but only
 * after React mounts.
 *
 * WHY A BROWSER HARNESS AND NOT A SOURCE CHECK. The fix is a script, and the
 * only thing that answers "does the script do the right thing on the right
 * pages" is running it on the real built files in a real browser. A source level
 * check could only confirm the script is present, which is the part that was
 * never in doubt.
 *
 * AND WHY THE APP BUNDLE IS BLOCKED WHILE IT RUNS. The first draft loaded each
 * page normally and read the result after a short settle, and its negative
 * control exposed it: with the new script deleted entirely, five of its seven
 * assertions still passed, because by then React had mounted and the app's own
 * 404 page had supplied the title and the robots tag. The harness was measuring
 * Round 53's work and calling it Round 282's. So the app's modules are aborted:
 * the document's own inline scripts run, React never mounts, and what is left is
 * exactly the state this round is about, which is what a crawler holds before it
 * decides whether to spend the effort of rendering. With the script deleted, all
 * of section 1 now fails, which is what a control is for.
 *
 * THE THREE CASES, and all three matter equally. A dead address has to be
 * marked. A real route must NOT be, because a marker that fires on a good page
 * takes the page out of the index, which is far worse than the bug it fixes. And
 * the home page itself must not be, because it is served from the same file.
 *
 * TWO READS PER ADDRESS, and keeping them apart is what makes this harness mean
 * anything. A plain fetch says what the SERVER sent, with no JavaScript at all,
 * which is how the fallback is identified: every real page is served from its
 * own prerendered document and carries id="dukb-snapshot", and the fallback does
 * not. A browser load says what the SCRIPT then did. Mixing them gives nonsense,
 * because the snapshot block lives inside #root and React removes it the moment
 * it mounts, so a browser read taken a moment too late reports every real page
 * as a fallback. That is not a hypothetical: it is what the first draft of this
 * harness did.
 *
 * Run: node scripts/runAllSims.mjs --browser
 *      or BASE=http://127.0.0.1:4173 node scripts/playSoftFourOhFour.mjs
 */
import pw from './lib/pwLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

const browser = await chromium.launch();
const page = await browser.newPage();
/* Same reasoning as every other harness here: Supabase is unreachable and its
   requests hang rather than fail, so they are aborted to keep this
   deterministic. Nothing this checks depends on them. */
await page.route('**://*.supabase.co/**', r => r.abort());
/* The app itself, aborted. See the header: without this the harness reports on
   React's 404 page instead of on the document a crawler is handed. The boot
   script that injects the real asset names is left alone, because it is part of
   the document rather than part of the app, and because a page that needs it is
   a snapshot, which is not what this is testing. */
let blockApp = true;
await page.route('**/assets/*.js', r => (blockApp ? r.abort() : r.continue()));
await page.route('**/src/main.tsx', r => (blockApp ? r.abort() : r.continue()));

/** What the server sends, with no JavaScript involved: the crawler's raw view. */
async function raw(pathname) {
  /* Playwright's request context rather than node's fetch: it goes out through
     the same stack the browser uses, it runs no JavaScript, and it does not
     depend on the sandbox letting this process open its own socket. */
  const res = await page.request.get(`${BASE}${pathname}`);
  const html = await res.text();
  /* Comments stripped and the id matched as a real attribute on a real element.
     The first draft looked for the bare string and reported the fallback as a
     snapshot, because the comment in index.html explaining this very mechanism
     mentions the id in prose. A guard that can be satisfied by its own
     documentation is not a guard. */
  const markup = html.replace(/<!--[\s\S]*?-->/g, ' ');
  return {
    status: res.status(),
    html,
    snapshot: /<[a-z]+[^<>]*\bid="dukb-snapshot"/.test(markup),
  };
}

async function read(pathname, { settle = 400 } = {}) {
  await page.goto(`${BASE}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(settle);
  return page.evaluate(() => ({
    title: document.title,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
    ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? null,
    snapshot: !!document.getElementById('dukb-snapshot'),
    text: (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim(),
    links: Array.from(document.querySelectorAll('a[href^="/"]')).length,
  }));
}

/* The home page's own headline, read out of the file the server sends rather
   than typed out here, so a rewrite of that copy cannot leave this harness
   looking for a sentence nobody says any more. It is the h1 rather than the
   first line of rendered text on purpose: the rendered text starts with the
   header and the ticker, which every page shares, so comparing that would
   compare the furniture and always match. */
const homeRaw = await raw('/');
const homeH1 = (homeRaw.html.match(/<h1[^>]*>([^<]{20,200})<\/h1>/) ?? [])[1]?.trim() ?? '';
if (homeH1.length < 20) {
  say(false, 'could not read the home page headline out of the served file, so the duplicate checks below would prove nothing');
}
const home = await read('/');

console.log('1) a dead address is marked, before anything renders');
{
  const sent = await raw('/this-address-does-not-exist-round-282');
  say(!sent.snapshot, 'the server answers it with the fallback, which is what makes it identifiable');
  const dead = await read('/this-address-does-not-exist-round-282');
  say(dead.robots === 'noindex, follow', `robots is ${JSON.stringify(dead.robots)}`);
  say(dead.canonical === null, `the home page canonical is gone (${dead.canonical ?? 'gone'})`);
  /* og:title, not og:url: this template has no og:url, so asserting on it would
     be a check that can never fail. og:title is really there and really does say
     the home page's name, which on a dead address is the same false claim the
     canonical was making. */
  say(/not found/i.test(dead.ogTitle ?? ''), `its social title says so too: ${JSON.stringify(dead.ogTitle)}`);
  say(/not found/i.test(dead.title), `its title says so: ${JSON.stringify(dead.title)}`);
  say(!dead.text.includes(homeH1), `the home page headline is gone from it (${JSON.stringify(homeH1.slice(0, 40))})`);
  say(dead.links >= 5, `it still points somewhere useful (${dead.links} internal links)`);
}

console.log('2) a second dead address, one that looks like a real route');
{
  /* A path under a real route is the shape a stale deep link takes, and it is
     the one most likely to be crawled, so it is checked separately rather than
     assumed to behave like a random string. */
  const dead = await read('/soccer-career/season/99');
  say(dead.robots === 'noindex, follow', `robots is ${JSON.stringify(dead.robots)}`);
  say(!dead.text.includes(homeH1), 'the home page headline is gone from it too');
}

console.log('3) the home page is untouched');
{
  say(home.robots === null, `no robots tag on the home page (${home.robots ?? 'none'})`);
  say(home.canonical === 'https://douknowball.com/', `it keeps its canonical (${home.canonical})`);
  say(!/not found/i.test(home.title), `its title is its own: ${JSON.stringify(home.title)}`);
  say(home.text.length > 1500, `it still carries its copy (${home.text.length} characters)`);
}

console.log('4) real routes are untouched, which is the half that must not fail');
{
  /* A marker that fires on a good page takes that page out of the index, which
     is worse than the bug being fixed here. A spread, including the two pages
     whose documents are stubs rather than full snapshots. */
  const ROUTES = ['/soccer-career', '/soccer-grid', '/records', '/about', '/leaderboard', '/soccer', '/privacy'];
  let marked = 0, noSnapshot = 0, homeCopy = 0;
  for (const r of ROUTES) {
    /* The snapshot check reads the SERVER's answer, because the block lives
       inside #root and React removes it on mount. */
    const sent = await raw(r);
    if (!sent.snapshot) { noSnapshot += 1; say(false, `${r} is served without a snapshot block, so it comes from the fallback and this script would mark it`); }
    if (homeH1 && sent.html.includes(`>${homeH1}<`)) { homeCopy += 1; say(false, `${r} is serving the home page headline, so it is the fallback wearing its clothes`); }
    const rendered = await read(r);
    if (rendered.robots !== null) { marked += 1; say(false, `${r} was marked ${JSON.stringify(rendered.robots)} and is a real page`); }
  }
  say(marked === 0 && noSnapshot === 0 && homeCopy === 0,
    `${ROUTES.length} real routes, ${marked} wrongly marked, ${noSnapshot} served from the fallback, ${homeCopy} serving home page copy`);
}

await browser.close();

console.log('');
if (failures > 0) {
  console.log(`playSoftFourOhFour: ${failures} failures.`);
  process.exit(1);
}
console.log('playSoftFourOhFour: green. A dead address says it is dead before a line of app code runs, and no real page is touched.');
