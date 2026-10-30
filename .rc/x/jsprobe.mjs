// Round 1607 R5 probe (never committed): open club pages that serve their text by script, in Chromium on the
// runner, and print every "First Last" form the rendered page gives the coach's surname, with the accents as shown.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const LIST = [
  ['Aston Villa', 'Emery', ['https://www.avfc.co.uk/news/2022/october/24/manager/', 'https://www.avfc.co.uk/news/2026/october/17/news-unai-emery-hits-100-premier-league-wins-/']],
  ['Bournemouth', 'Rose', ['https://www.afcb.co.uk/news/2026/april/20/marco-rose-to-become-head-coach-ahead-of-26-27-season', 'https://www.afcb.co.uk/news/2026/june/03/who-is-marco-rose--the-story-behind-afc-bournemouth-s-new-head-coach/']],
  ['Coventry City', 'Lampard', ['https://www.ccfc.co.uk/news/2026/june/30/frank-lampard-signs-new-contract-until-2029', 'https://www.ccfc.co.uk/news/2024/november/28/frank-lampard-appointed-coventry-city-head-coach/']],
  ['Fulham', 'Arbeloa', ['https://www.fulhamfc.com/news/2026/july/07/alvaro-arbeloa-appointed-fulham-head-coach/', 'https://www.fulhamfc.com/players/alvaro-arbeloa/']],
  ['Hull City', 'Jakirovic', ['https://www.wearehullcity.co.uk/news/2025/june/11/jakirovic-appointed-new-head-coach/', 'https://www.wearehullcity.co.uk/news/2026/september/04/jakirovic-signs-new-contract/']],
  ['Ipswich Town', "O'Neil", ['https://www.itfc.co.uk/news/2026/september/18/gary-previews-everton-trip/', 'https://www.itfc.co.uk/news/2026/september/16/o-neil--positive-signs-to-build-on/']],
  ['Manchester City', 'Maresca', ['https://www.mancity.com/news/mens/enzo-maresca-manchester-city-manager-63918331', 'https://www.mancity.com/news/mens/coaching-team-enzo-maresca-confirmed-63919119']],
  ['Nottingham Forest', 'Glasner', ['https://www.nottinghamforest.co.uk/news/2026/july/06/forest-appoint-oliver-glasner-as-head-coach/']],
  ['Sunderland', 'Bris', ['https://www.safc.com/news/2024/june/24/r-gis-le-bris-appointed-head-coach/', 'https://www.safc.com/news/2025/august/04/r-gis-le-bris-signs-new-contract/']],
  ['Athletic Club', 'Terzic', ['https://www.athletic-club.eus/en/news/2026/07/02/official-presentation-of-edin-terzic-as-manager-of-athletic-club/', 'https://www.athletic-club.eus/en/teams/athletic-club/2026-27/squad/']],
  ['Bayern Munich', 'Kompany', ['https://fcbayern.com/en/teams/first-team/coaches-and-staff/vincent-kompany', 'https://fcbayern.com/de/news/2026/08/fan-qa-mit-cheftrainer-vincent-kompany']],
  ['Werder Bremen', 'Thioune', ['https://www.werder.de/news/maenner/2025-2026/pm-thioune-04022026', 'https://www.werder.de/en/news/first-team/2025-2026/daniel-thioune-new-head-coach-040226']],
  ['Lyon', 'Fonseca', ['https://www.ol.fr/en/news/paulo-fonseca-appointed-coach-of-olympique-lyonnais', 'https://www.ol.fr/fr/actualites/paulo-fonseca-je-me-sens-tres-bien-ici-l-atmosphere-est-incroyable']],
];

const fold = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const out = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'en-GB', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' });
await ctx.route(/supabase\.co/, r => r.abort());
for (const [club, surname, urls] of LIST) {
  for (const url of urls) {
    const rec = { club, url };
    const page = await ctx.newPage();
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      rec.status = resp?.status();
      await page.waitForTimeout(5000);
      rec.final = page.url();
      rec.title = await page.title();
      rec.published = await page.evaluate(() => document.querySelector('meta[property="article:published_time"]')?.content
        || (document.documentElement.innerHTML.match(/"datePublished"\s*:\s*"([^"]+)"/) || [])[1] || null);
      const text = await page.evaluate(() => document.body?.innerText || '');
      const words = text.split(/[^\p{L}\p{M}'.-]+/u);
      const forms = new Map();
      const target = fold(surname).replace(/'/g, '');
      for (let k = 0; k < words.length; k++) {
        if (fold(words[k]).replace(/('s|['.])+$/u, '').replace(/'/g, '') === target) {
          const f = words.slice(Math.max(0, k - 2), k + 1).join(' ');
          forms.set(f, (forms.get(f) || 0) + 1);
        }
      }
      rec.forms = [...forms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    } catch (e) {
      rec.error = String(e.message || e).slice(0, 160);
    }
    await page.close();
    out.push(rec);
    console.log(`${club} | ${rec.status ?? '-'} | ${rec.title ?? ''} | ${rec.published ?? ''} | ${rec.error ?? (rec.forms || []).map(([f, n]) => `${n}x ${f}`).join(' ; ')}`);
    console.log(`   ${url}${rec.final && rec.final !== url ? ` -> ${rec.final}` : ''}`);
  }
}
await browser.close();
const dir = process.env.RC_OUT || '.';
fs.writeFileSync(path.join(dir, 'jsprobe.json'), JSON.stringify(out, null, 1));
console.log(`jsprobe: done, ${out.length} pages`);
