// Round 1143 one-off rendered proof (not committed): after the app has drawn,
// how many disclaimers does a visitor see on each trust page, and which game
// counts are on screen? Run on the remote runner against a plain build.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
const ROUTES = ['/', '/privacy', '/terms', '/whats-new', '/footle', '/search', '/about', '/contact', '/this-address-is-dead-1143'];
/* what the round promises, per route; null means held by the other lane, measured and not asserted */
const WANT_DISCLAIMERS = { '/': 1, '/privacy': 1, '/terms': 2, '/whats-new': 1, '/footle': 1, '/search': 1, '/about': null, '/contact': null, '/this-address-is-dead-1143': 1 };

const browser = await chromium.launch();
const rows = [];
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
for (const [width, height] of [[390, 844], [1280, 800]]) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  /* nothing leaves the runner: the database host first, then every other outside host */
  await page.route(/supabase\.co/, r => r.abort());
  await page.route(u => !/^http:\/\/localhost[:/]/.test(u.toString()) && !/^data:|^blob:/.test(u.toString()), r => r.abort());
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('footer[data-site-chrome]', { timeout: 45000 });
    if (route === '/') await page.waitForFunction(() => /free sports games in the browser/.test(document.body.innerText), null, { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const m = await page.evaluate(() => {
      const t = document.body.innerText;
      const n = re => (t.match(re) || []).length;
      const desc = document.querySelector('meta[name="description"]');
      return {
        footers: document.querySelectorAll('footer').length,
        notAffiliated: n(/not affiliated with/gi),
        respectiveOwners: n(/property of their respective owners/gi),
        floors: [...t.matchAll(/\b(\d{2,3})\+\s+(?:free\s+|sports\s+|trivia\s+)*games\b/gi)].map(x => x[0]),
        otherCounts: [...t.matchAll(/\b(?:over \d{2,3}(?:\s+(?:free|sports|trivia))*\s+games|all \d{3} (?:games|of them))/gi)].map(x => x[0]),
        description: desc ? desc.getAttribute('content') : null,
      };
    });
    const row = { route, viewport: `${width}x${height}`, ...m };
    rows.push(row);
    console.log(`${row.viewport} ${route}: footers ${m.footers}, "not affiliated with" ${m.notAffiliated}, "respective owners" ${m.respectiveOwners}, floors ${JSON.stringify(m.floors)}, other ${JSON.stringify(m.otherCounts)}`);
    if (m.footers !== 1) fail(`${route} at ${row.viewport} draws ${m.footers} footers`);
    const want = WANT_DISCLAIMERS[route];
    if (want !== null && (m.notAffiliated !== want || m.respectiveOwners !== want)) {
      fail(`${route} at ${row.viewport} shows the disclaimer ${m.notAffiliated} / ${m.respectiveOwners} times, wanted ${want}`);
    }
    if (route === '/') {
      const distinct = [...new Set(m.floors.map(f => f.match(/\d+\+/)[0]))];
      const inDesc = (m.description || '').match(/^\d+\+/);
      console.log(`   home: ${m.floors.length} floors on screen, distinct ${JSON.stringify(distinct)}, description opens ${inDesc ? inDesc[0] : 'with no floor'}`);
      if (m.floors.length < 2) fail(`the home page shows ${m.floors.length} floor(s); the hero and the copy under the tiles should both carry one`);
      if (distinct.length !== 1) fail(`the home page shows more than one count: ${JSON.stringify(distinct)}`);
      if (!inDesc || inDesc[0] !== distinct[0]) fail(`the home description opens ${inDesc ? inDesc[0] : 'with no floor'} and the page shows ${distinct[0]}`);
    }
    if (route === '/footle' && m.floors.length !== 1) fail(`/footle shows ${m.floors.length} floors in its guide, wanted 1`);
  }
  await ctx.close();
}
await browser.close();
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'walk1143.json'), JSON.stringify(rows, null, 1));
if (failures) { console.error(`\nwalk1143: ${failures} failure(s)`); process.exit(1); }
console.log(`\nwalk1143: green. ${rows.length} page draws, one footer and one disclaimer each (two on /terms with its clause), one count on the home page.`);
