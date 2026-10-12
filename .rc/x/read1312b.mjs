/* Round 1312 page reader, second pass (never committed). On each Hockey
   Reference playoffs page of 2007 to 2026 it lists every series row with the
   address of its "View Matchup" page, then draws the matchup page of the last
   round, and of every round for the seasons named in ALLROUNDS, and writes each
   page's title, first heading and opening words to $RC_OUT. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const OUT = process.env.RC_OUT || '.tmp-fx/pages2';
fs.mkdirSync(OUT, { recursive: true });
const ALLROUNDS = new Set([2006, 2019, 2020]);
const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.route(/supabase\.co/, r => r.abort());
const lines = [];
const pause = ms => new Promise(r => setTimeout(r, ms));
for (let y = 2006; y <= 2025; y++) {
  const page = await ctx.newPage();
  const url = `https://www.hockey-reference.com/playoffs/NHL_${y + 1}.html`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForFunction(() => document.body.innerText.includes('View Matchup'), null, { timeout: 25000 });
    const rows = await page.evaluate(() => [...document.querySelectorAll('a')].filter(a => a.innerText.includes('View Matchup')).map(a => {
      const tr = a.closest('tr');
      return { row: tr ? tr.innerText.replace(/\s+/g, ' ').trim() : '', href: a.href };
    }));
    lines.push(`== ${y} ${url}`);
    for (const r of rows) lines.push(`${r.row} | ${r.href}`);
    const wanted = ALLROUNDS.has(y) ? rows : rows.slice(0, 1);
    const seenRound = new Set();
    for (const r of wanted) {
      const round = r.row.split(/\s\d-\d\s/)[0];
      if (seenRound.has(round)) continue;
      seenRound.add(round);
      await pause(6000);
      const p2 = await ctx.newPage();
      try {
        await p2.goto(r.href, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await p2.waitForTimeout(1500);
        const got = await p2.evaluate(() => ({ title: document.title, h1: (document.querySelector('h1') || {}).innerText || '', text: (document.querySelector('#content') || document.body).innerText.slice(0, 1200) }));
        lines.push(`-- matchup ${y} [${round}] ${r.href}`, `TITLE: ${got.title}`, `H1: ${got.h1.replace(/\s+/g, ' ')}`, `TEXT: ${got.text.replace(/\s+/g, ' ')}`);
      } catch (e) { lines.push(`-- matchup ${y} [${round}] FAILED ${String(e.message || e).slice(0, 100)}`); }
      await p2.close();
    }
  } catch (e) { lines.push(`== ${y} FAILED ${String(e.message || e).slice(0, 100)}`); }
  await page.close();
  await pause(6000);
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'hr-matchups.txt'), `READ: ${new Date().toISOString()}\n` + lines.join('\n') + '\n');
console.log(`read1312b: ${lines.filter(l => l.startsWith('-- matchup') && !l.includes('FAILED')).length} matchup pages, ${lines.filter(l => l.includes('FAILED')).length} failures`);
