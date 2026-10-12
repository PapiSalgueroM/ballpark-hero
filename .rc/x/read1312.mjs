/* Round 1312 page reader (never committed). Draws each page in Chromium on the
   runner, waits for its words, and writes the page's own text to $RC_OUT, one
   file a page, so a reader can read every word. No parsing here: the files are
   the readings. PAGES=a,b limits the list by slug. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const OUT = process.env.RC_OUT || '.tmp-fx/pages';
fs.mkdirSync(OUT, { recursive: true });
const pages = [];
const season = y => `${y}${y + 1}`;
for (let y = 2006; y <= 2025; y++) pages.push([`nhlrec-${y}`, `https://records.nhl.com/history/yearly-playoff-results?year=${season(y)}`, 'Playoff Results']);
for (let y = 2006; y <= 2025; y++) pages.push([`hr-${y}`, `https://www.hockey-reference.com/playoffs/NHL_${y + 1}.html`, 'Playoff']);
pages.push(
  ['nhlrec-formats', 'https://records.nhl.com/history/playoff-formats', 'Format'],
  ['espn-ot', 'https://www.espn.com/nhl/story/_/id/39345002/what-nhl-rules', 'overtime'],
  ['nhl-gm-ot', 'https://www.nhl.com/news/nhl-general-managers-discuss-overtime-format', 'overtime'],
  ['si-ot', 'https://www.si.com/nhl/nhl-overtime-rules-explained-playoffs-and-regular-season-01jnm1y8qd0e', 'shootout'],
  ['nhl-84', 'https://www.nhl.com/news/nhl-stats-pack-2026-27-regular-season-schedule', '84'],
  ['espn-84', 'https://www.espn.com/nhl/story/_/id/49376073/nhl-releases-expanded-84-game-schedule-2026-27-season', '84'],
  ['nhl-format-today', 'https://www.nhl.com/info/standings-info/playoff-format', 'best-of-7'],
  ['nbc-2020', 'https://www.nbcsports.com/nhl/news/how-2020-nhl-playoffs-will-work-stanley-cup', 'Qualifying'],
  ['cbs-2020', 'https://www.cbssports.com/nhl/news/nhl-announces-format-for-stanley-cup-playoffs-for-when-2020-season-resumes/', 'qualifying'],
  ['nbc-2021', 'https://www.nbcsports.com/nhl/news/what-we-know-about-2020-21-nhl-season-key-dates-playoff-format-more', 'division'],
  ['nhl-2021-keyq', 'https://www.nhl.com/news/key-questions-answers-2020-21-nhl-season-319847468', 'division'],
  ['nhl-2012-cqf', 'https://www.nhl.com/news/2012-stanley-cup-playoff-matchups-determined/c-626458', 'Quarter'],
  ['nhl-2012-csf', 'https://www.nhl.com/news/2012-stanley-cup-playoffs-conference-semis-schedule/c-629665', 'Semi'],
  ['nhl-2012-cf', 'https://www.nhl.com/news/2012-stanley-cup-playoffs-conference-finals-schedule/c-631219', 'Final'],
);
const only = (process.env.PAGES || '').split(',').filter(Boolean);
const list = only.length ? pages.filter(p => only.some(o => p[0].startsWith(o))) : pages;
const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.route(/supabase\.co/, r => r.abort());
const summary = [];
for (const [slug, url, word] of list) {
  const page = await ctx.newPage();
  let status = 'ok';
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    status = String(res ? res.status() : 'none');
    try { await page.waitForFunction(w => document.body && document.body.innerText.includes(w) && document.body.innerText.length > 800, word, { timeout: 25000 }); } catch { status += ' (word not seen in 25 s)'; }
    if (slug.startsWith('nhlrec-') && slug !== 'nhlrec-formats') {
      try { await page.waitForFunction(() => /Best-of-\d/.test(document.body.innerText), null, { timeout: 25000 }); } catch { status += ' (no series drawn)'; }
    }
    await page.waitForTimeout(1500);
    const text = await page.evaluate(() => {
      const pick = document.querySelector('main') || document.querySelector('article') || document.body;
      return pick.innerText;
    });
    const all = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync(path.join(OUT, `${slug}.txt`), `URL: ${url}\nSTATUS: ${status}\nTITLE: ${await page.title()}\nREAD: ${new Date().toISOString()}\n---MAIN---\n${text}\n---BODY---\n${all.slice(0, 120000)}\n`);
    summary.push(`${slug} ${status} main=${text.length} body=${all.length}`);
  } catch (e) {
    summary.push(`${slug} FAILED ${String(e.message || e).slice(0, 120)}`);
  }
  await page.close();
  /* One page every few seconds: a site that limits readers is never pressed. */
  await new Promise(r => setTimeout(r, slug.startsWith('hr-') ? 6000 : 1500));
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'summary.txt'), summary.join('\n') + '\n');
console.log(summary.join('\n'));
console.log(`read1312: ${summary.filter(s => !/FAILED/.test(s)).length} of ${list.length} pages read`);
