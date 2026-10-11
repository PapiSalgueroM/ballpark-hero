// Round 1304 walk (sent as an extra file, never committed): the transfer market of each past season,
// read off the screen, holds only men of that season; and today's market holds only men of today.
// Pictures of each market at 390 and 1280 go to $RC_OUT. Run on a served build: BASE=http://localhost:4173
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? os.tmpdir();
const ROOT = process.cwd().replaceAll('\\', '/');
const TAG = `${process.pid}-${Date.now()}`;
const ENTRY = path.join(os.tmpdir(), `wem-${TAG}.mjs`);
const BUNDLE = path.join(os.tmpdir(), `wem-${TAG}.bundle.mjs`);
fs.writeFileSync(ENTRY, `
export { ERA2005_ROSTERS } from '${ROOT}/src/data/clubManagerEra2005.ts';
export { ERA2010_ROSTERS } from '${ROOT}/src/data/clubManagerEra2010.ts';
export { ERA2015_ROSTERS } from '${ROOT}/src/data/clubManagerEra2015.ts';
export { ERA2020_ROSTERS } from '${ROOT}/src/data/clubManagerEra2020.ts';
export { CM_WORLD_ROSTERS } from '${ROOT}/src/data/clubManagerWorldRosters.ts';
`);
const { build } = await import('esbuild');
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error' });
const D = await import(pathToFileURL(BUNDLE).href);
fs.rmSync(ENTRY, { force: true });
fs.rmSync(BUNDLE, { force: true });

let failures = 0;
const say = (ok, what) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + what); if (!ok) failures += 1; };
const WORLDS = [
  { tile: '2005-06', id: 'era2005', rosters: D.ERA2005_ROSTERS, nation: 'Spain', league: 'La Liga', club: 'Real Madrid' },
  { tile: '2010-11', id: 'era2010', rosters: D.ERA2010_ROSTERS, nation: 'England', league: 'Premier League', club: 'Manchester United' },
  { tile: '2015-16', id: 'era2015', rosters: D.ERA2015_ROSTERS, nation: 'Germany', league: 'Bundesliga', club: 'Bayern Munich' },
  { tile: '2020-21', id: 'era2020', rosters: D.ERA2020_ROSTERS, nation: 'France', league: 'Ligue 1', club: 'PSG' },
  { tile: '2026-27', id: 'now', rosters: D.CM_WORLD_ROSTERS, nation: 'England', league: 'Premier League', club: 'Arsenal' },
];
const namesOf = rs => new Set(Object.values(rs).flat().map(p => p.n));
const scrape = page => page.evaluate(() => [...document.querySelectorAll('.max-h-96 > div')]
  .filter(row => [...row.querySelectorAll('button')].some(b => /^(Talk|Cold)/.test(b.textContent ?? '')))
  .map(row => ({
    name: row.querySelector('span.truncate')?.textContent ?? '',
    made: /MADE UP/.test(row.textContent ?? ''),
    club: (row.querySelector('div.truncate')?.textContent ?? '').split(' · ')[0],
  })));

const browser = await chromium.launch();
for (const w of WORLDS) {
  console.log(`== ${w.tile}: ${w.club}`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  if (await page.locator('text=Start Fresh').count()) { await page.locator('text=Start Fresh').click(); await page.waitForTimeout(800); }
  await page.locator(`button:has-text("${w.tile}")`).first().click();
  await page.waitForTimeout(700);
  await page.locator(`text=${w.nation}`).first().click();
  await page.waitForTimeout(700);
  await page.locator(`button:has-text("${w.league}")`).first().click();
  await page.waitForTimeout(700);
  await page.locator(`button:has-text("${w.club}")`).first().click();
  await page.waitForTimeout(500);
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count()) { await essential.click(); await page.waitForTimeout(400); }
  await page.locator('text=Take the job').click();
  const skip = page.locator('button:has-text("Skip: just manage")').first();
  await skip.waitFor({ timeout: 15000 }).then(() => skip.click()).catch(() => {});
  await page.waitForTimeout(2000);
  await page.locator('button:has-text("Market")').first().click();
  await page.waitForTimeout(900);
  say((await page.locator('text=window OPEN').count()) >= 1, `${w.tile}: the summer window is open and the market renders`);

  const real = namesOf(w.rosters);
  const clubs = new Set(Object.keys(w.rosters));
  /* Round 1304's defect, on the screen: the club that buys in "Around the league" is a club of this season. */
  const news = await page.evaluate(() => [...document.querySelectorAll('p')].map(p => p.textContent ?? '').filter(t => / sign .+ from .+ for /.test(t)));
  const buyers = news.map(h => h.replace(/^[^A-Za-z0-9À-ɏ]+/, '').split(' sign ')[0].trim());
  const offSeason = buyers.filter(b => !clubs.has(b));
  console.log(`   around the league: ${news.length} deals, bought by ${buyers.join(', ') || 'nobody'}`);
  say(offSeason.length === 0, `${w.tile}: every club that buys in Around the league is a club of that season (${offSeason.length} not${offSeason.length ? ': ' + offSeason.join(', ') : ''})`);
  const seen = new Map();
  const league = page.locator('select[aria-label="Selling league"]');
  const sort = page.locator('select[aria-label="Sort players"]');
  const leagues = await league.locator('option').count();
  const chips = page.locator('div:has(> select[aria-label="Exact position"])');
  let views = 0;
  for (let li = 0; li < leagues; li++) {
    await league.selectOption({ index: li });
    for (const s of ['rating', 'value', 'young', 'cheap']) {
      await sort.selectOption(s);
      for (const pos of ['ALL', 'GK', 'DEF', 'MID', 'ATT']) {
        await chips.getByRole('button', { name: pos, exact: true }).first().click();
        await page.waitForTimeout(60);
        for (const r of await scrape(page)) seen.set(r.name, r);
        views += 1;
      }
    }
  }
  await league.selectOption({ index: 0 });
  await sort.selectOption('rating');
  await chips.getByRole('button', { name: 'ALL', exact: true }).first().click();
  const rows = [...seen.values()];
  const strangers = rows.filter(r => !r.made && !real.has(r.name));
  const lostClubs = rows.filter(r => !r.made && !clubs.has(r.club));
  const made = rows.filter(r => r.made).length;
  console.log(`   ${views} views, ${rows.length} different men read off the screen (${leagues - 1} leagues), ${made} tagged MADE UP`);
  say(rows.length >= 400, `${w.tile}: the walk read a real share of the market (${rows.length} men)`);
  say(strangers.length === 0, `${w.tile}: every man without the MADE UP tag is in that season's squads (${strangers.length} strangers${strangers.length ? ': ' + strangers.slice(0, 6).map(r => `${r.name} of ${r.club}`).join(', ') : ''})`);
  say(lostClubs.length === 0, `${w.tile}: every real man is listed at a club of that season (${lostClubs.length} off${lostClubs.length ? ': ' + lostClubs.slice(0, 4).map(r => `${r.name} at ${r.club}`).join(', ') : ''})`);

  /* Men of the other worlds, searched by name: none may answer with a row of that exact name. */
  const others = WORLDS.filter(o => o !== w).flatMap(o => Object.values(o.rosters).flat().map(p => ({ ...p, from: o.tile })))
    .filter(p => !real.has(p.n)).sort((a, b) => b.r - a.r || a.n.localeCompare(b.n));
  const probes = [];
  for (const o of WORLDS.filter(x => x !== w)) probes.push(...others.filter(p => p.from === o.tile).slice(0, 4));
  const search = page.locator('input[aria-label="Search player or club"]');
  const found = [];
  for (const p of probes) {
    await search.fill(p.n);
    await page.waitForTimeout(150);
    if ((await scrape(page)).some(r => r.name === p.n)) found.push(`${p.n} (${p.from})`);
  }
  await search.fill('');
  await page.waitForTimeout(200);
  say(found.length === 0, `${w.tile}: ${probes.length} men who exist only in other seasons were searched by name and none is listed (${found.join(', ') || 'none found'}; e.g. ${probes.slice(0, 3).map(p => p.n).join(', ')})`);

  /* The picture shows the list itself: the search box at the top of the screen, the rows under it. */
  await page.locator('input[aria-label="Search player or club"]').evaluate(el => el.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `market-${w.id}-390.png`) });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(500);
  await page.locator('input[aria-label="Search player or club"]').evaluate(el => el.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `market-${w.id}-1280.png`) });
  const pe = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(pe.length === 0, `${w.tile}: no real page errors (${pe.length ? pe[0] : 'clean'})`);
  await ctx.close();
}
await browser.close();
console.log('');
if (failures) { console.error(`walkEraMarket: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('walkEraMarket: green. Each market on screen holds only men of its own season.');
