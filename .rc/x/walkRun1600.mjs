// Review walk (never committed, runner only, on a served build: BASE). The database host is blocked.
// 1 a new 2026-27 AC Milan career (Modric), the market (Messi, Ronaldo), at 390 and 1280, motion reduced and not
// 2 a 2015-16 Real Madrid career (Modric 92, Ronaldo 98 by Round 1214's table)
// 3 an OLD SAVE made by the base engine (/tmp/base-saves.json, Everton): does it load, and does Arsenal still list
//   a man the opening window sold (Viktor Gyokeres to PSG)
// 4 Manager Hot Seat and Deadline Day first screens at 390
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? os.tmpdir();
const notes = [];
const say = (what) => { console.log(`  ${what}`); notes.push(what); };
const wait = (page, ms) => page.waitForTimeout(ms);
const text = page => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); say(`shot ${name}.png`); };
const clickText = async (page, sel, ms = 700) => { const l = page.locator(sel).first(); if (await l.count()) { await l.click({ timeout: 5000 }).catch(e => say(`click ${sel} failed: ${String(e).slice(0, 80)}`)); await wait(page, ms); return true; } say(`no ${sel}`); return false; };
const rowOf = (page, name) => page.evaluate(n => {
  const hits = [...document.querySelectorAll('div, li, tr, button')].filter(el => (el.innerText ?? '').includes(n) && (el.innerText ?? '').length < 260);
  hits.sort((a, b) => a.innerText.length - b.innerText.length);
  return hits[0] ? hits[0].innerText.replace(/\s+/g, ' ').trim() : null;
}, name);
const browser = await chromium.launch();
const errors = [];
async function fresh(motion, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: motion });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  return { ctx, page };
}
async function cookie(page) {
  for (const label of ['Essential only', 'Reject all', 'Reject']) {
    const b = page.locator(`button:has-text("${label}")`).first();
    if (await b.count() && await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await wait(page, 400); return; }
  }
}
async function newCareer(page, season, country, league, club) {
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await wait(page, 1500);
  await cookie(page);
  if (await page.locator('text=Start Fresh').count()) await clickText(page, 'text=Start Fresh', 800);
  await clickText(page, `button:has-text("${season}")`);
  await clickText(page, `text=${country}`);
  await clickText(page, `button:has-text("${league}")`);
  await clickText(page, `button:has-text("${club}")`, 500);
  await cookie(page);
  await clickText(page, 'text=Take the job', 1500);
  const skip = page.locator('button:has-text("Skip: just manage")').first();
  await skip.waitFor({ timeout: 15000 }).then(() => skip.click()).catch(() => say('no skip button'));
  await wait(page, 2000);
  for (const tab of ['Squad', 'Team']) { if (await page.locator(`button:has-text("${tab}")`).count()) { await clickText(page, `button:has-text("${tab}")`, 900); break; } }
}

for (const motion of ['reduce', 'no-preference']) {
  const { ctx, page } = await fresh(motion, 390, 844);
  await newCareer(page, '2026-27', 'Italy', 'Serie A', 'AC Milan');
  say(`[${motion}] Milan squad row: ${await rowOf(page, 'Modri')}`);
  await shot(page, `milan-squad-390-${motion}`);
  const modric = page.locator('text=/Luka Modri/').first();
  if (await modric.count()) { await modric.click().catch(() => {}); await wait(page, 900); await shot(page, `milan-modric-open-390-${motion}`); say(`[${motion}] opened: ${(await rowOf(page, 'Modri')) ?? '-'}`); }
  await page.setViewportSize({ width: 1280, height: 900 }); await wait(page, 600);
  await shot(page, `milan-squad-1280-${motion}`);
  const sx = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  say(`[${motion}] sideways scroll at 1280: ${sx}`);
  await page.setViewportSize({ width: 390, height: 844 }); await wait(page, 500);
  if (await clickText(page, 'button:has-text("Market")', 900)) {
    const search = page.locator('input[aria-label="Search player or club"]');
    for (const name of ['Lionel Messi', 'Cristiano Ronaldo', 'Lamine Yamal']) {
      if (!(await search.count())) { say('no market search'); break; }
      await search.fill(name); await wait(page, 500);
      say(`[${motion}] market ${name}: ${await rowOf(page, name)}`);
      await shot(page, `market-${name.split(' ')[1].toLowerCase()}-390-${motion}`);
    }
    const sx2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    say(`[${motion}] sideways scroll at 390 on the market: ${sx2}`);
  }
  await ctx.close();
}

{
  const { ctx, page } = await fresh('reduce', 390, 844);
  await newCareer(page, '2015-16', 'Spain', 'La Liga', 'Real Madrid');
  for (const n of ['Modri', 'Cristiano Ronaldo', 'Sergio Ramos', 'Toni Kroos']) say(`2015 Real Madrid ${n}: ${await rowOf(page, n)}`);
  await shot(page, 'era2015-madrid-squad-390');
  await ctx.close();
}

const savesFile = '/tmp/base-saves.json';
if (fs.existsSync(savesFile)) {
  const saves = JSON.parse(fs.readFileSync(savesFile, 'utf8'));
  const { ctx, page } = await fresh('reduce', 390, 844);
  await page.addInitScript(entries => {
    if (!sessionStorage.getItem('rv-seeded')) { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); sessionStorage.setItem('rv-seeded', '1'); }
  }, saves.Everton);
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await wait(page, 2000);
  await cookie(page);
  await shot(page, 'oldsave-landing-390');
  for (const label of ['Continue', 'Resume', 'Everton']) { if (await page.locator(`button:has-text("${label}")`).count()) { await clickText(page, `button:has-text("${label}")`, 1500); break; } }
  await shot(page, 'oldsave-hub-390');
  for (const tab of ['Table', 'League']) { if (await page.locator(`button:has-text("${tab}")`).count()) { await clickText(page, `button:has-text("${tab}")`, 900); break; } }
  await shot(page, 'oldsave-table-390');
  if (await clickText(page, 'button:has-text("Arsenal")', 1200)) {
    const t = await text(page);
    say(`old save, Arsenal page lists Gyokeres: ${/Gy.keres/.test(t)}, Woltemade: ${/Woltemade/.test(t)}`);
    await shot(page, 'oldsave-arsenal-390');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)); await wait(page, 400);
    await shot(page, 'oldsave-arsenal-390-mid');
  }
  await ctx.close();
} else say('no base saves file');

for (const route of ['/manager-hot-seat', '/deadline-day']) {
  const { ctx, page } = await fresh('reduce', 390, 844);
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await wait(page, 2000); await cookie(page);
  await shot(page, `daily${route.replace(/\//g, '-')}-390`);
  await ctx.close();
}
await browser.close();
const pe = errors.filter(e => !/supabase|Failed to fetch|CORS|NetworkError/i.test(e));
say(`page errors: ${pe.length}${pe.length ? ` first: ${pe[0]}` : ''}`);
fs.writeFileSync(path.join(OUT, 'walk-notes.txt'), notes.join('\n'));
console.log(`walkRun1600: done, ${pe.length} page errors`);
process.exit(pe.length ? 1 : 0);
