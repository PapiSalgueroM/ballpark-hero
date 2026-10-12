// Review walk (runner lens, Round 1310). The round adds no file under src, so nothing a player sees should move.
// This walk opens Club Manager on the served build at 390x844 and 1280x900, reduced motion on and off, with the
// database host blocked, screenshots each, and checks that no word of the facts file reached the page or the network.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.tmp-walk';
fs.mkdirSync(OUT, { recursive: true });
const NEEDLES = ['cmLeagueBookFacts', 'rsssftops', 'Pichichi list', 'espnstats-ll', 'plsite-pl'];
const browser = await chromium.launch();
let problems = 0;
for (const [w, h] of [[390, 844], [1280, 900]]) {
  for (const motion of ['reduce', 'no-preference']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion });
    const page = await ctx.newPage();
    await page.route(/supabase\.co/, r => r.abort());
    const errors = [];
    const urls = [];
    page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 160)));
    page.on('request', r => urls.push(r.url()));
    for (const route of ['/club-manager', '/']) {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);
      const tag = `${route === '/' ? 'home' : 'cm'}-${w}-${motion === 'reduce' ? 'rm' : 'motion'}`;
      await page.screenshot({ path: path.join(OUT, `${tag}.png`), fullPage: false });
      const body = await page.evaluate(() => document.body.innerText);
      const hits = NEEDLES.filter(n => body.includes(n));
      const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
      const h1 = await page.evaluate(() => [...document.querySelectorAll('h1,h2')].slice(0, 3).map(e => e.textContent.trim().slice(0, 60)).join(' / '));
      console.log(`${tag}: heads "${h1}" text ${body.length} chars, scrollWidth ${scrollW}, needle hits ${hits.length ? hits.join(',') : 0}`);
      if (hits.length || scrollW > w + 1) problems += 1;
    }
    const factReq = urls.filter(u => /cmLeagueBookFacts/.test(u));
    console.log(`  ${w} ${motion}: page errors ${errors.length}${errors.length ? ' ' + errors.join(' | ') : ''}; requests naming the facts file ${factReq.length}`);
    if (errors.length || factReq.length) problems += 1;
    await ctx.close();
  }
}
await browser.close();
console.log(problems ? `walk1310: ${problems} problem(s)` : 'walk1310: clean, 8 views');
process.exit(problems ? 1 : 0);
