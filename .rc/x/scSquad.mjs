// Reviewer sc-screens, Release AT. The squad sheet where Round 1185's form and Round 1190's smaller role meet. RUNNER ONLY.
// usage: node scSquad.mjs <saves.json> [more.json]   env BASE, RC_OUT
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.tmp-fx/sc-squad-out';
fs.mkdirSync(OUT, { recursive: true });
const saves = {};
for (const file of process.argv.slice(2)) Object.assign(saves, JSON.parse(fs.readFileSync(file, 'utf8')));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const say = (label, value) => console.log(`${label} :: ${JSON.stringify(value)}`);
const browser = await chromium.launch();
const texts = (page, sel) => page.evaluate(sel => [...document.querySelectorAll(sel)].map(el => (el.innerText || '').replace(/\s+/g, ' ').trim()), sel);
const saved = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('soccerCareerSave')); } catch { return null; } });

for (const [tag, width] of [['new-role-plan', 390], ['new-role-plan', 1280], ['new-gk', 390], ['new-home', 390], ['old-home', 390]]) {
  if (!saves[tag]) { say(`${tag}`, 'no such save'); continue; }
  const L = `squad-${tag}-${width}`;
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: 1 });
  await context.route(/supabase\.co/, route => route.abort());
  await context.addInitScript(save => {
    if (!sessionStorage.getItem('rev-seeded')) { sessionStorage.setItem('rev-seeded', '1'); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('soccerCareerSave', save); }
  }, JSON.stringify(saves[tag]));
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  try {
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('[data-squad-tile]', { timeout: 45000 });
    await sleep(1500);
    const st = await saved(page);
    const last = st.seasons[st.seasons.length - 1];
    say(`${L} save`, { club: st.currentClub, year: st.currentYear ?? st.year, reducedRole: st.reducedRole ?? null, lastSeason: last && { year: last.year, club: last.club, rating: last.avgRating ?? last.rating, apps: last.apps, leagueApps: last.leagueApps } });
    say(`${L} tile`, await texts(page, '[data-squad-tile]'));
    say(`${L} role note on home`, await texts(page, '[data-reduced-role-plan]'));
    await page.locator('[data-squad-tile]').first().evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.locator('[data-squad-tile]').first().click();
    await page.waitForSelector('[data-squad-screen="home"]');
    await sleep(900);
    await page.screenshot({ path: path.join(OUT, `${L}-home.jpg`), type: 'jpeg', quality: 66 });
    say(`${L} sheet home`, { headline: await texts(page, '[data-squad-headline]'), plan: await texts(page, '[data-squad-plan]'), trust: await texts(page, '[data-squad-trust]'), source: await texts(page, '[data-squad-source-line]'), tiles: await texts(page, '[data-squad-open]') });
    await page.locator('[data-squad-open="place"]').click();
    await page.waitForSelector('[data-squad-screen="place"]');
    await sleep(500);
    await page.screenshot({ path: path.join(OUT, `${L}-place.jpg`), type: 'jpeg', quality: 66 });
    say(`${L} trust lines`, await texts(page, '[data-squad-trust-line]'));
    // the bottom of the place screen, where the reasons are
    await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); const s = d && [...d.querySelectorAll('*'), d].find(el => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 2); if (s) s.scrollTop = s.scrollHeight; });
    await sleep(300);
    await page.screenshot({ path: path.join(OUT, `${L}-place-end.jpg`), type: 'jpeg', quality: 66 });
    await page.keyboard.press('Escape'); await sleep(300); await page.keyboard.press('Escape'); await sleep(500);
    if (tag === 'new-role-plan' && width === 390) {
      // play the season the plan is for, and read what the save and the summary say about it
      await page.locator('button:has-text("Next Season")').first().click();
      for (let w = 0; w < 30; w++) {
        await sleep(1500);
        const now = await saved(page);
        if ((now?.seasons.length ?? 0) > st.seasons.length) break;
        const keepOn = page.locator('button:has-text("Keep Playing")').first();
        if (await keepOn.count()) await keepOn.click();
      }
      const cont = page.locator('button:has-text("Continue to Season Summary")').first();
      if (await cont.count()) { await cont.click(); await sleep(1500); }
      const now = await saved(page), row = now.seasons[now.seasons.length - 1];
      say(`${L} played`, { phase: now.phase, year: row.year, club: row.club, apps: row.apps, leagueApps: row.leagueApps, reducedRole: row.reducedRole ?? null, injury: row.injury ?? null, note: await texts(page, '[data-reduced-role-result]'), planStillHeld: now.reducedRole ?? null });
      await page.screenshot({ path: path.join(OUT, `${L}-played-summary.jpg`), type: 'jpeg', quality: 60, fullPage: false });
    }
  } catch (e) { say(`${L} ERROR`, String(e && e.stack || e).slice(0, 400)); await page.screenshot({ path: path.join(OUT, `${L}-error.jpg`), type: 'jpeg', quality: 60 }).catch(() => {}); }
  say(`${L} page errors`, errors);
  await context.close();
}
await browser.close();
console.log('scSquad: done');
