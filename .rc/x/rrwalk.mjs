// Round 1143 reviewer walk (runner lens). Not committed. Reads BASE, writes shots and walk.json into RC_OUT.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
fs.mkdirSync(OUT, { recursive: true });
const ROUTES = [
  ['/', 'home'], ['/privacy', 'privacy'], ['/terms', 'terms'], ['/whats-new', 'whatsnew'],
  ['/footle', 'footle'], ['/search', 'search'], ['/about', 'about'], ['/contact', 'contact'],
  ['/dead-address-review-1143', 'dead'], ['/soccer', 'hubsoccer'], ['/college', 'hubcollege'],
  ['/soccer-career', 'soccercareer'], ['/games', 'games'],
];
const SHOT_TOP = new Set(['home', 'privacy', 'terms', 'whatsnew', 'footle', 'dead']);
const VIEWS = [
  { tag: '390', width: 390, height: 844, reduced: 'no-preference' },
  { tag: '1280', width: 1280, height: 900, reduced: 'no-preference' },
  { tag: '390rm', width: 390, height: 844, reduced: 'reduce' },
  { tag: '1280rm', width: 1280, height: 900, reduced: 'reduce' },
];
const rows = [];
const browser = await chromium.launch();
for (const v of VIEWS) {
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, reducedMotion: v.reduced });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  await page.route(u => !/^http:\/\/localhost[:/]/.test(u.toString()) && !/^(data|blob):/.test(u.toString()), r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e.message).slice(0, 160)));
  for (const [route, name] of ROUTES) {
    errors.length = 0;
    const row = { view: v.tag, route };
    try {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('footer[data-site-chrome]', { timeout: 60000 });
      await page.waitForTimeout(2500);
      // the consent banner sits over the bottom of the page: answer it the private way, once
      const ess = page.getByRole('button', { name: /essential only/i });
      if (await ess.count()) { await ess.first().click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400); }
      Object.assign(row, await page.evaluate(() => {
        const t = document.body.innerText;
        const n = re => (t.match(re) || []).length;
        const meta = sel => { const e = document.querySelector(sel); return e ? e.getAttribute('content') : null; };
        const footer = document.querySelector('footer[data-site-chrome]');
        const fr = footer.getBoundingClientRect();
        // the last piece of page content above the footer: the lowest bottom edge among elements that end above it
        let lastBottom = 0, lastTag = '';
        for (const el of document.querySelectorAll('main *, #root *')) {
          if (footer.contains(el) || el.contains(footer)) continue;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed' || cs.visibility === 'hidden') continue;
          const b = r.bottom + scrollY;
          if (b <= fr.top + scrollY + 1 && b > lastBottom) { lastBottom = b; lastTag = el.tagName + '.' + String(el.className).slice(0, 40); }
        }
        return {
          footers: document.querySelectorAll('footer').length,
          notAffiliated: n(/not affiliated with/gi),
          respectiveOwners: n(/propert(?:y|ies) of their respective owners/gi),
          copyright2026: n(/© 2026 DoUKnowBall/g),
          counts: [...t.matchAll(/\b(?:(?:over|more than|nearly|almost|all)\s+)?\d{2,4}\+?(?:\s+(?:free|sports|trivia|browser|online|daily|of them))*\s+(?:games|of them)\b/gi)].map(x => x[0]).slice(0, 12),
          description: meta('meta[name="description"]'), og: meta('meta[property="og:description"]'), tw: meta('meta[name="twitter:description"]'),
          title: document.title, h1: [...document.querySelectorAll('h1')].map(h => h.innerText.trim()).slice(0, 3),
          robots: meta('meta[name="robots"]'),
          linksTerms: document.querySelectorAll('a[href="/terms"]').length, linksPrivacy: document.querySelectorAll('a[href="/privacy"]').length,
          snapshotLeft: !!document.getElementById('dukb-snapshot'),
          gapAboveFooter: Math.round(fr.top + scrollY - lastBottom), lastTag,
          overflowX: document.documentElement.scrollWidth - innerWidth,
          pageHeight: document.documentElement.scrollHeight,
        };
      }));
      if (SHOT_TOP.has(name) && (v.tag === '390' || v.tag === '1280')) await page.screenshot({ path: path.join(OUT, `${name}-${v.tag}-top.png`) });
      if (v.tag === '390' || v.tag === '1280' || name === 'whatsnew' || name === 'privacy') {
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(OUT, `${name}-${v.tag}-bottom.png`) });
      }
    } catch (e) { row.error = String(e.message).slice(0, 200); }
    row.errors = errors.slice(0, 4);
    rows.push(row);
    console.log(JSON.stringify(row));
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(rows, null, 1));
console.log(`walk done: ${rows.length} rows, ${rows.filter(r => r.error).length} with a load error`);
