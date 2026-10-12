/* Round 1312 page reader, third pass (never committed), for Part B3: the
   games past sixty minutes and the shootouts, season by season. (1) The
   league's own standings feed on the last day of each regular season, drawn
   in the browser: every club's games, wins, losses, overtime losses and
   shootout wins and losses. (2) Hockey Reference's standings page of each
   season: every table on the page, those inside comments too, as text. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const OUT = process.env.RC_OUT || '.tmp-fx/pages3';
fs.mkdirSync(OUT, { recursive: true });
const LAST = { 2006: '2007-04-08', 2007: '2008-04-06', 2008: '2009-04-12', 2009: '2010-04-11', 2010: '2011-04-10', 2011: '2012-04-07', 2012: '2013-04-28', 2013: '2014-04-13', 2014: '2015-04-11', 2015: '2016-04-10', 2016: '2017-04-09', 2017: '2018-04-08', 2018: '2019-04-06', 2019: '2020-03-11', 2020: '2021-05-19', 2021: '2022-05-01', 2022: '2023-04-14', 2023: '2024-04-18', 2024: '2025-04-17', 2025: '2026-04-16' };
const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.route(/supabase\.co/, r => r.abort());
const pause = ms => new Promise(r => setTimeout(r, ms));
const feed = {}; const lines = [];
for (const [y, day] of Object.entries(LAST)) {
  const page = await ctx.newPage();
  const url = `https://api-web.nhle.com/v1/standings/${day}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const text = await page.evaluate(() => document.body.innerText);
    const j = JSON.parse(text);
    feed[y] = { url, clubs: j.standings.map(s => [s.teamAbbrev?.default, s.gamesPlayed, s.wins, s.losses, s.otLosses, s.shootoutWins, s.shootoutLosses, s.goalFor, s.points]) };
    lines.push(`feed ${y} ${day}: ${j.standings.length} clubs`);
  } catch (e) { lines.push(`feed ${y} FAILED ${String(e.message || e).slice(0, 120)}`); }
  await page.close();
  await pause(800);
}
fs.writeFileSync(path.join(OUT, 'feed.json'), JSON.stringify(feed));
for (const y of Object.keys(LAST)) {
  const page = await ctx.newPage();
  const url = `https://www.hockey-reference.com/leagues/NHL_${Number(y) + 1}_standings.html`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);
    const tables = await page.evaluate(() => {
      const html = document.documentElement.outerHTML.replace(/<!--/g, '').replace(/-->/g, '');
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return [...doc.querySelectorAll('table')].map(t => ({ id: t.id, caption: (t.querySelector('caption') || {}).textContent || '', head: [...t.querySelectorAll('thead tr')].map(r => [...r.children].map(c => c.textContent.trim()).join('|')).join(' / '), rows: [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(c => c.textContent.trim()).join('|')) }));
    });
    fs.writeFileSync(path.join(OUT, `hrst-${y}.json`), JSON.stringify({ url, title: await page.title(), read: new Date().toISOString(), tables }));
    lines.push(`hr ${y}: ${tables.length} tables (${tables.map(t => t.id).join(' ')})`);
  } catch (e) { lines.push(`hr ${y} FAILED ${String(e.message || e).slice(0, 120)}`); }
  await page.close();
  await pause(6000);
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'summary3.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`read1312c: ${lines.filter(l => !l.includes('FAILED')).length} of ${lines.length} read`);
