// Round 1304 reviewer walk (extra file, never committed). A past season career the way a player meets it:
// start it, open the market, read Around the league and the Latest feed, haggle until a rival enters the race.
// 390x844 and 1280x900, reduced motion on and off. Pictures and a JSON of what was read go to $RC_OUT.
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
const ENTRY = path.join(os.tmpdir(), `wr-${TAG}.mjs`);
const BUNDLE = path.join(os.tmpdir(), `wr-${TAG}.bundle.mjs`);
fs.writeFileSync(ENTRY, `export { ERA_LEAGUES, REAL_LEAGUES } from '${ROOT}/src/lib/clubManager.ts';`);
const { build } = await import('esbuild');
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error', alias: { '@': `${ROOT}/src` } });
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const D = await import(pathToFileURL(BUNDLE).href);

let failures = 0;
const say = (ok, what) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + what); if (!ok) failures += 1; };
const WORLDS = [
  { tile: '2005-06', id: 'era2005', nation: 'Italy', league: 'Serie A', club: 'Juventus', vw: 390, vh: 844, motion: 'reduce' },
  { tile: '2010-11', id: 'era2010', nation: 'Spain', league: 'La Liga', club: 'Barcelona', vw: 1280, vh: 900, motion: 'no-preference' },
  { tile: '2015-16', id: 'era2015', nation: 'England', league: 'Premier League', club: 'Chelsea', vw: 390, vh: 844, motion: 'no-preference' },
  { tile: '2020-21', id: 'era2020', nation: 'Germany', league: 'Bundesliga', club: 'Bayern Munich', vw: 1280, vh: 900, motion: 'reduce' },
  { tile: '2010-11', id: 'era2010', nation: 'England', league: 'Premier League', club: 'Chelsea', vw: 390, vh: 844, motion: 'reduce' },
  { tile: '2005-06', id: 'era2005', nation: 'England', league: 'Premier League', club: 'Arsenal', vw: 1280, vh: 900, motion: 'no-preference' },
];
const readSave = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('dukb-club-manager-save') ?? 'null'); } catch { return null; } });
const overflowX = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const report = [];
const browser = await chromium.launch();
for (const w of WORLDS) {
  const label = `${w.tile} ${w.club} ${w.vw} ${w.motion}`;
  const shot = n => path.join(OUT, `run-${w.id}-${w.club.replaceAll(' ', '')}-${w.vw}-${n}.png`);
  console.log(`== ${label}`);
  const clubs = new Set((D.ERA_LEAGUES[w.id] ?? []).flatMap(l => l.clubs));
  const row = { label, clubs: clubs.size };
  const ctx = await browser.newContext({ viewport: { width: w.vw, height: w.vh }, reducedMotion: w.motion });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  try {
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
    await page.screenshot({ path: shot('1-hub') });
    await page.locator('button:has-text("Market")').first().click();
    await page.waitForTimeout(900);
    say((await page.locator('text=window OPEN').count()) >= 1, `${label}: the summer window is open and the market renders`);

    /* 1. Around the league, off the screen and off the save */
    const news = await page.evaluate(() => [...document.querySelectorAll('p')].map(p => p.textContent ?? '').filter(t => / sign .+ from .+ for /.test(t)));
    const buyers = news.map(h => h.replace(/^[^\p{L}\p{N}]+/u, '').split(' sign ')[0].trim());
    row.news = news;
    console.log(`   around the league: ${news.join(' | ') || 'nothing'}`);
    say(news.length >= 1, `${label}: Around the league printed at least one deal (${news.length})`);
    const off = buyers.filter(b => !clubs.has(b));
    say(off.length === 0, `${label}: every buyer in Around the league is a club of that season's leagues (${off.join(', ') || 'all are'})`);
    const head = page.locator('text=Around the league').first();
    if (await head.count()) await head.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('2-news') });
    row.overflowNews = await overflowX(page);
    say(row.overflowNews <= 1, `${label}: the market does not scroll sideways (${row.overflowNews}px)`);

    /* 2. Haggle until a rival enters the race */
    let rival = null;
    const card = page.locator('[data-testid="cm-deal-card"]');
    const status = async () => ((await page.locator('[data-testid="cm-deal-status"]').count()) ? (await page.locator('[data-testid="cm-deal-status"]').first().textContent()) : null);
    let talksTried = 0;
    for (let attempt = 0; attempt < 16 && !rival; attempt++) {
      const talks = page.locator('button:has-text("Talk ·")');
      const n = await talks.count();
      if (!n) break;
      const budget = (await readSave(page))?.budget ?? 0;
      const prices = await talks.evaluateAll(bs => bs.map(b => { const m = /([0-9.]+)m/.exec(b.textContent ?? ''); return m ? Number(m[1]) : 0; }));
      const can = prices.map((p, i) => [p, i]).filter(([p]) => p >= 2 && p <= budget * 0.5).map(([, i]) => i);
      if (!can.length) { if (attempt === 0) { await page.locator('select[aria-label="Sort players"]').selectOption('young').catch(() => {}); await page.waitForTimeout(300); continue; } break; }
      row.affordable = can.length;
      await talks.nth(can[(attempt * 3) % can.length]).click();
      await page.waitForTimeout(400);
      talksTried += 1;
      for (let press = 0; press < 6; press++) {
        if ((await status()) !== 'Negotiating') break;
        if (await card.locator('text=Bidding war').count()) { rival = (await card.locator('text=Bidding war').first().textContent()) ?? ''; break; }
        const haggle = page.locator('button:has-text("Haggle ·")').first();
        if (!(await haggle.count())) break;
        await haggle.click();
        await page.waitForTimeout(350);
      }
      if (!rival && (await status()) === 'Negotiating') {
        const walk = page.locator('button:has-text("Walk away")').first();
        if (await walk.count()) { await walk.click(); await page.waitForTimeout(300); }
      }
    }
    row.talksTried = talksTried;
    row.rivalLine = rival;
    say(!!rival, `${label}: a rival entered a negotiation within ${talksTried} talks (${rival ?? 'none did'})`);
    if (rival) {
      const save = await readSave(page);
      const who = save?.negotiation?.rivalBidder ?? null;
      row.rival = who;
      row.note = save?.negotiation?.note ?? null;
      say(!!who && clubs.has(who), `${label}: the rival in the race is a club of that season's leagues (${who})`);
      say(!!who && rival.includes(who), `${label}: the screen names the rival the save holds (${rival.trim()})`);
      await card.first().evaluate(el => el.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(300);
      await page.screenshot({ path: shot('3-war') });
      row.overflowWar = await overflowX(page);
      say(row.overflowWar <= 1, `${label}: the bidding war card does not scroll the page sideways (${row.overflowWar}px)`);
      /* dither under the rival until the talk ends one way or another */
      for (let press = 0; press < 10 && (await status()) === 'Negotiating'; press++) {
        const low = page.locator('button:has-text("Lowball ·")').first();
        const haggle = page.locator('button:has-text("Haggle ·")').first();
        const b = (await haggle.count()) ? haggle : low;
        if (!(await b.count())) break;
        await b.click();
        await page.waitForTimeout(350);
      }
      row.end = await status();
      const after = await readSave(page);
      row.endNote = after?.negotiation?.note ?? null;
      console.log(`   the talk ended as: ${row.end}; note: ${row.endNote}`);
      await page.waitForTimeout(900);
      await card.first().evaluate(el => el.scrollIntoView({ block: 'start' })).catch(() => {});
      await page.screenshot({ path: shot('4-end') });
    }

    /* 3. The Latest feed, off the save and off the screen */
    await page.getByRole('button', { name: 'Latest', exact: true }).first().click();
    await page.waitForTimeout(500);
    const log = (await readSave(page))?.transferLog ?? [];
    const offLog = log.filter(t => !clubs.has(t.to)).map(t => `${t.name}: ${t.from} to ${t.to}`);
    row.log = log.map(t => `${t.name}: ${t.from} to ${t.to} ${t.fee}`);
    say(log.length >= 1, `${label}: the Latest feed holds deals (${log.length})`);
    say(offLog.length === 0, `${label}: every buying club in the Latest feed is a club of that season's leagues (${offLog.join('; ') || 'all are'})`);
    const cut = await page.evaluate(() => [...document.querySelectorAll('.max-h-96 .truncate')].filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent ?? ''));
    row.cutRows = cut;
    console.log(`   Latest rows cut short on screen: ${cut.length}${cut.length ? ' e.g. ' + cut.slice(0, 2).join(' | ') : ''}`);
    await page.getByRole('button', { name: 'Latest', exact: true }).first().evaluate(el => el.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('5-latest') });
    const pe = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
    say(pe.length === 0, `${label}: no real page errors (${pe.length ? pe[0] : 'clean'})`);
  } catch (e) {
    row.error = String(e?.stack ?? e).slice(0, 500);
    say(false, `${label}: the walk broke: ${row.error.split('\n')[0]}`);
    await page.screenshot({ path: shot('9-broke') }).catch(() => {});
  }
  report.push(row);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk-report.json'), JSON.stringify(report, null, 1));
console.log('');
if (failures) { console.error(`walkRun: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('walkRun: green. A past season names only its own clubs in the news, the feed and the bidding wars.');
