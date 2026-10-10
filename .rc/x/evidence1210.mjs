// Round 1210 evidence walk (sent to a runner as an extra file, never committed).
// A: Club Manager's Market tab, the nationality filter's groups read off the DOM (no "Elsewhere", the six nations placed).
// B: NFL My Career's opened Career Log at 390 and 1280, as screenshots for the lead.
// The live database is never reached: the host is aborted on every context.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
let bad = 0;
const say = (ok, what) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + what); if (!ok) bad += 1; };
const browser = await chromium.launch();

async function tap(page, rx) {
  const b = page.getByRole('button', { name: rx }).first();
  if (await b.count().catch(() => 0) === 0) return false;
  return b.click({ timeout: 4000 }).then(() => true).catch(() => false);
}

for (const [w, h] of [[390, 844], [1280, 800]]) {
  console.log(`A) Club Manager nationality filter at ${w}`);
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('rules-gate-seen:/club-manager', '1'));
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1500 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
  await tap(page, /2026-27/i);
  await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /England/i);
  await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /Premier League/i);
  const club = page.locator('button').filter({ hasText: /Everton|Fulham|Brentford|Crystal Palace|Wolves|Brighton/ }).first();
  await club.waitFor({ timeout: 8000 }).catch(() => {});
  await club.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
  await tap(page, /take the job|confirm|start/i);
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /skip: just manage/i);
  await page.waitForTimeout(1500);
  const market = page.getByRole('tab', { name: 'Market', exact: true });
  say(await market.count() === 1, `${w}: the career started and the hub shows a Market tab`);
  if (await market.count() === 1) {
    await market.click();
    await page.locator('[data-nat-filter]').first().waitFor({ timeout: 20000 }).catch(() => {});
    const groups = await page.evaluate(() => {
      const sel = document.querySelector('[data-nat-filter]');
      if (!sel) return null;
      return [...sel.querySelectorAll('optgroup')].map(g => ({ label: g.label, nations: [...g.querySelectorAll('option')].map(o => o.value) }));
    });
    say(!!groups && groups.length > 0, `${w}: the nationality filter is on the Market screen with ${groups ? groups.length : 0} groups`);
    if (groups) {
      fs.writeFileSync(path.join(OUT, `natfilter-${w}.json`), JSON.stringify(groups, null, 1));
      console.log('   groups: ' + groups.map(g => `${g.label} ${g.nations.length}`).join(' | '));
      say(!groups.some(g => /elsewhere/i.test(g.label)), `${w}: no "Elsewhere" group`);
      const where = n => groups.find(g => g.nations.includes(n))?.label ?? 'NOT IN THE MARKET';
      for (const [n, want] of [['Niger', 'Africa (CAF)'], ['Southern Sudan', 'Africa (CAF)'], ['Turkmenistan', 'Asia (AFC)']]) {
        say(where(n) === want, `${w}: ${n} sits under ${want} (found under: ${where(n)})`);
      }
      const total = groups.reduce((s, g) => s + g.nations.length, 0);
      console.log(`   ${total} nations in the default world's market`);
    }
    await page.locator('[data-nat-filter]').first().scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: path.join(OUT, `cm-market-${w}.png`) });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    say(overflow <= 2, `${w}: the Market screen has no sideways scroll (${overflow}px)`);
  }
  await ctx.close();
}

for (const [w, h] of [[390, 844], [1280, 800]]) {
  console.log(`B) NFL My Career, the opened Career Log at ${w}`);
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  await page.addInitScript(route => localStorage.setItem(`rules-gate-seen:${route}`, '1'), '/nfl-my-career');
  await page.goto(`${BASE}/nfl-my-career`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1100);
  const consent = page.locator('button:has-text("Essential only")');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('input[placeholder*="name"]').first().fill('Probe Player');
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(1000);
  await page.evaluate(key => {
    const s = JSON.parse(localStorage.getItem(key));
    const base = { team: s.c.team, age: 24, ovr: 88, games: 20, teamResult: 'Made the playoffs', salary: 8 };
    s.c.seasons = [{ ...base, year: 2026, awards: [] }, { ...base, year: 2027, awards: ['Probe Award'] }, { ...base, year: 2028, awards: ['Probe Award', 'Second Probe Award'] }];
    localStorage.setItem(key, JSON.stringify(s));
  }, 'nfl-my-career-save-v1');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1300);
  await page.locator('button:has(div.uppercase)').filter({ hasText: /Career Log/i }).first().click();
  await page.locator('[data-career-season-review]').first().waitFor({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);
  const tiles = await page.locator('[data-career-season-review] button[data-season-tile]').count();
  say(tiles === 3, `${w}: the opened Career Log shows three season tiles (saw ${tiles})`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  say(overflow <= 2, `${w}: the opened Career Log has no sideways scroll (${overflow}px)`);
  await page.locator('[data-career-season-review]').first().scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: path.join(OUT, `career-log-${w}.png`) });
  await ctx.close();
}

await browser.close();
console.log(`evidence1210: ${bad} problem${bad === 1 ? '' : 's'}`);
process.exit(bad ? 1 : 0);
