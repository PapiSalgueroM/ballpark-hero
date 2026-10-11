// Round 1304 reviewer walk two (extra file, never committed): a past season save WRITTEN BY THE BASE ENGINE
// (made on the runner by probeRun.mjs PART=mksave into $RC_OUT) opened in the browser on this build.
// What does the player of an old save see, and can he carry on.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? os.tmpdir();
let failures = 0;
const say = (ok, what) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + what); if (!ok) failures += 1; };
const readSave = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('dukb-club-manager-save') ?? 'null'); } catch { return null; } });
const report = [];
const browser = await chromium.launch();
for (const [eraId, vw, vh, motion] of [['era2010', 390, 844, 'reduce'], ['era2010', 1280, 900, 'no-preference'], ['era2005', 390, 844, 'no-preference']]) {
  const file = path.join(OUT, `oldsave-${eraId}.json`);
  const label = `old ${eraId} save at ${vw} (${motion})`;
  console.log(`== ${label}`);
  if (!fs.existsSync(file)) { say(false, `${label}: ${file} is not there, the save maker did not run`); continue; }
  const raw = fs.readFileSync(file, 'utf8');
  const old = JSON.parse(raw);
  const row = { label, club: old.clubName, oldHeadlines: old.aiHeadlines, oldRival: old.negotiation?.rivalBidder ?? null, oldSquad: old.squad.length };
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, reducedMotion: motion });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  /* seeded once: a reload must read what the page itself wrote back */
  await page.addInitScript(s => { try { if (!sessionStorage.getItem('r1304-seeded')) { localStorage.setItem('dukb-club-manager-save', s); sessionStorage.setItem('r1304-seeded', '1'); } } catch { /* private mode */ } }, raw);
  const shot = n => path.join(OUT, `old-${eraId}-${vw}-${n}.png`);
  try {
    await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    const body = await page.evaluate(() => document.getElementById('root')?.innerText ?? '');
    say(body.includes(old.clubName), `${label}: the saved career opens on ${old.clubName}`);
    await page.screenshot({ path: shot('1-open') });
    const opened = await readSave(page);
    say(!!opened && opened.squad.length === old.squad.length && opened.squad.every((p, i) => p.name === old.squad[i].name), `${label}: the squad in the save is the squad that was saved (${opened?.squad.length} men)`);
    await page.locator('button:has-text("Market")').first().click();
    await page.waitForTimeout(900);
    const news = await page.evaluate(() => [...document.querySelectorAll('p')].map(p => p.textContent ?? '').filter(t => / sign .+ from .+ for /.test(t)));
    row.newsOnScreen = news;
    console.log(`   Around the league on this build, from the old save: ${news.join(' | ') || 'nothing'}`);
    const war = (await page.locator('text=Bidding war').count()) ? await page.locator('text=Bidding war').first().textContent() : null;
    row.warOnScreen = war;
    console.log(`   the open negotiation's rival on screen: ${war ?? 'none'} (the save holds ${row.oldRival ?? 'none'})`);
    const head = page.locator('text=Around the league').first();
    if (await head.count()) await head.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('2-market') });
    if (war) {
      const card = page.locator('[data-testid="cm-deal-card"]').first();
      await card.evaluate(el => el.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(300);
      await page.screenshot({ path: shot('3-war') });
      const status = async () => ((await page.locator('[data-testid="cm-deal-status"]').count()) ? (await page.locator('[data-testid="cm-deal-status"]').first().textContent()) : null);
      for (let press = 0; press < 10 && (await status()) === 'Negotiating'; press++) {
        const b = page.locator('button:has-text("Haggle ·")').first();
        if (!(await b.count())) break;
        await b.click();
        await page.waitForTimeout(350);
      }
      row.end = await status();
      const after = await readSave(page);
      row.endNote = after?.negotiation?.note ?? null;
      row.lastDeal = (after?.transferLog ?? []).slice(-1)[0] ?? null;
      console.log(`   the old negotiation ended as: ${row.end}; note: ${row.endNote}; last row of the feed: ${JSON.stringify(row.lastDeal)}`);
      await page.waitForTimeout(900);
      await page.screenshot({ path: shot('4-end') });
      say((await status()) !== 'Negotiating', `${label}: the old negotiation can be brought to an end (${row.end})`);
    }
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const again = await readSave(page);
    say(!!again && again.clubName === old.clubName && again.squad.length >= old.squad.length, `${label}: after a reload the career is still there with its squad (${again?.squad.length} men)`);
    const pe = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e) || /dynamically imported module/i.test(e));
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
fs.writeFileSync(path.join(OUT, 'walkold-report.json'), JSON.stringify(report, null, 1));
console.log('');
if (failures) { console.error(`walkOld: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('walkOld: green. A save from before the round opens, shows what it held and plays on.');
