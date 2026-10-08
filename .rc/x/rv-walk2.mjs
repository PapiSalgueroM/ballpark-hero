// Reviewer (runner lens) walk 2, Round 1104. node .rc/x/rv-walk2.mjs on the runner. Asserts nothing; the reviewer reads it.
// What walk 1 missed: the "?" opened on the hub, the hub at the top of the page right after the draft, a Career Log
// season opened, savings collected on load, an old looking save (17 game 2005 seasons, tenth sacks, old pay) opened and
// played on, and the NBA bank on load.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? '.';
const report = { runs: [], errors: [] };
const browser = await chromium.launch();
const shot = async (page, name, full = false) => { try { await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full }); } catch (e) { report.errors.push(`shot ${name}: ${e}`); } };
const text = async page => (await page.locator('body').innerText()).replace(/[ \t]+/g, ' ');
const top = page => page.evaluate(() => window.scrollTo(0, 0));
const readSave = (page, key) => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), key);
const sideScroll = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function open(w, h, reduced, route) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await context.route(/supabase\.co/, r => r.abort());
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(`pageerror ${w} ${route}: ${String(e).slice(0, 300)}`));
  await page.addInitScript(r => { localStorage.setItem(`rules-gate-seen:${r}`, '1'); localStorage.setItem('cookie-consent', 'essential'); }, route);
  return { context, page };
}
async function quickStart(page, route, { throwback, pos, name }) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('input[placeholder*="name"]').first().fill(name);
  if (throwback) await page.locator('button', { hasText: /throwback/i }).first().click();
  await page.locator('button', { hasText: new RegExp(`^${pos}$`) }).first().click();
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(1200);
}
const BETWEEN = ['[data-season-reveal] button:has-text("Continue")', '[data-rivalry-event] button:has-text("Continue")', '[data-rivalry-choice] button:has-text("Continue")', '[data-rivalry-option]', '[data-decision-continue]', '[data-extension-talk] button:has-text("year out")', 'button:has-text("One more year")', '[data-career-decision-option]'];
async function playOne(page, onReveal) {
  let pressed = false; let revealed = false;
  for (let step = 0; step < 60; step += 1) {
    if (pressed && !revealed && await page.locator('[data-season-reveal]').count()) { revealed = true; if (onReveal) await onReveal(); }
    let clicked = false;
    for (const sel of BETWEEN) { const el = page.locator(sel); if (await el.count()) { await el.first().click(); await page.waitForTimeout(500); clicked = true; break; } }
    if (clicked) continue;
    const play = page.locator('button', { hasText: /Play the \d{4}(-\d\d)? season/ });
    if (await play.count()) { if (pressed) return true; pressed = true; await play.first().click(); await page.waitForTimeout(1100); continue; }
    const opt = page.locator('div.grid.gap-1\\.5 > button').first();
    if (await opt.count()) await opt.click();
    await page.waitForTimeout(500);
  }
  return pressed;
}
const hubBank = async page => { const hub = page.locator('[data-career-hub-buttons]'); return (await hub.count()) ? ((await hub.first().innerText()).match(/the bank\s*(-?\$[0-9.,]+[MkK]?)/i) || [null, null])[1] : null; };
const NFL = 'nfl-my-career-save-v1';

for (const [w, h] of [[390, 844], [1280, 900]]) for (const reduced of [false, true]) {
  const tag = `w2-${w}${reduced ? 'r' : ''}`;
  const run = { tag }; report.runs.push(run);

  /* 1. the hub right after the draft, at the top of the page; the "?" opened from the hub */
  {
    const { context, page } = await open(w, h, reduced, '/nfl-my-career');
    await quickStart(page, '/nfl-my-career', { throwback: true, pos: 'K', name: 'Toe Two' });
    run.scrollYAfterDraft = await page.evaluate(() => Math.round(window.scrollY));
    await shot(page, `${tag}-1a-hub-as-landed`);
    await top(page); await page.waitForTimeout(300);
    await shot(page, `${tag}-1b-hub-top`);
    run.hubText = (await text(page)).slice(0, 1400);
    if (!reduced) {
      const help = page.locator('button[aria-label="How to play"]').first();
      if (await help.count()) {
        await help.click(); await page.waitForTimeout(700);
        await shot(page, `${tag}-1c-help-open`);
        const dlg = page.locator('[role="dialog"]');
        run.helpText = (await dlg.count()) ? (await dlg.first().innerText()).replace(/[ \t]+/g, ' ') : `NO DIALOG. body: ${(await text(page)).slice(0, 600)}`;
        run.helpSideScroll = await sideScroll(page);
      } else run.helpText = 'NO HELP BUTTON';
    }
    await context.close();
  }

  /* 2. an old looking save: a 2005 edge rusher with two saved 17 game seasons, tenth sacks and the old pay */
  {
    const { context, page } = await open(w, h, reduced, '/nfl-my-career');
    await quickStart(page, '/nfl-my-career', { throwback: true, pos: 'EDGE', name: 'Old Save' });
    await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.c.ovr = 82; s.c.pot = 90; s.c.role = 'starter'; s.c.health = 100; s.c.contractYears = 9; localStorage.setItem(k, JSON.stringify(s)); }, NFL);
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
    await playOne(page, null); await playOne(page, null);
    await page.waitForTimeout(600);
    const before = await page.evaluate(k => {
      const s = JSON.parse(localStorage.getItem(k));
      s.c.seasons.forEach((ln, i) => { ln.games = 17; ln.sacks = i === 0 ? 7.3 : 11.8; });
      s.c.salary = 10.5; s.c.draftPick = 1; s.c.netWorth = 6.2;
      delete s.c.eventLastFired; delete s.c.summerSalt; delete s.c.summer;
      localStorage.setItem(k, JSON.stringify(s));
      return { seasons: JSON.stringify(s.c.seasons), year: s.c.year, n: s.c.seasons.length, phase: s.phase };
    }, NFL);
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1300);
    await top(page);
    await shot(page, `${tag}-2a-oldsave-hub`);
    run.oldHubText = (await text(page)).slice(0, 900);
    const after = await readSave(page, NFL);
    run.old = { before: { year: before.year, n: before.n, phase: before.phase }, sameSeasonsOnLoad: JSON.stringify(after.c.seasons) === before.seasons, salary: after.c.salary, net: after.c.netWorth, tile: await hubBank(page) };
    const logTile = page.locator('[data-career-hub-buttons] button', { hasText: /Career Log/i });
    if (await logTile.count()) {
      await logTile.first().click(); await page.waitForTimeout(800);
      const t0 = page.locator('[data-season-tile="0"]');
      if (await t0.count()) {
        await t0.click(); await page.waitForTimeout(700); await top(page);
        await shot(page, `${tag}-2b-oldsave-log-2005-overview`);
        run.old.logOverview = (await page.locator('[data-season-review]').first().innerText()).replace(/\s+/g, ' ').slice(0, 500);
        const reg = page.locator('[data-season-tab="Regular season"]');
        if (await reg.count()) { await reg.click(); await page.waitForTimeout(500); await shot(page, `${tag}-2c-oldsave-log-2005-regular`); run.old.logRegular = (await page.locator('[data-season-review]').first().innerText()).replace(/\s+/g, ' ').slice(0, 600); }
      } else run.old.logOverview = 'NO season tile 0';
    }
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
    await playOne(page, async () => { await page.waitForTimeout(800); await top(page); await shot(page, `${tag}-2d-oldsave-new-season-reveal`); run.old.revealText = (await text(page)).slice(0, 700); });
    await page.waitForTimeout(600);
    const end = await readSave(page, NFL);
    run.old.afterPlay = { oldLinesSame: JSON.stringify(end.c.seasons.slice(0, before.n)) === before.seasons, fresh: end.c.seasons.slice(before.n).map(s => ({ y: s.year, g: s.games, sk: s.sacks })), salary: end.c.salary, role: end.c.role };
    if (!reduced) {
      await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
      const stats = page.locator('[data-career-hub-buttons] button', { hasText: /My Player/i });
      if (await stats.count()) { await stats.first().click(); await page.waitForTimeout(800); await top(page); await shot(page, `${tag}-2e-oldsave-my-player`, true); run.old.myPlayerText = (await text(page)).slice(0, 1500); run.old.myPlayerSideScroll = await sideScroll(page); }
    }
    await context.close();
  }

  /* 3. savings are collected on load (NFL), and the NBA bank on load */
  if (!reduced) {
    const { context, page } = await open(w, h, reduced, '/nfl-my-career');
    await quickStart(page, '/nfl-my-career', { throwback: false, pos: 'QB', name: 'Saver' });
    await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.c.netWorth = 9; localStorage.setItem(k, JSON.stringify(s)); }, NFL);
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
    const bank = page.locator('[data-career-hub-buttons] button', { hasText: /The Bank/i });
    run.savings = {};
    if (await bank.count()) {
      await bank.first().click(); await page.waitForTimeout(800);
      const half = page.locator('button', { hasText: /^Save half$/ });
      if (await half.count()) { await half.first().click(); await page.waitForTimeout(700); }
      const s1 = await readSave(page, NFL);
      run.savings.afterDeposit = { net: s1.c.netWorth, vault: s1.c.money?.vault };
      await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.c.netWorth = -1.5; s.c.eventLastFired = { walk_card: s.c.year }; localStorage.setItem(k, JSON.stringify(s)); }, NFL);
      await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1300); await top(page);
      run.savings.tileAfterLoad = await hubBank(page);
      await shot(page, `${tag}-3a-savings-collected-hub`);
      const bank2 = page.locator('[data-career-hub-buttons] button', { hasText: /The Bank/i });
      if (await bank2.count()) { await bank2.first().click(); await page.waitForTimeout(800); await top(page); await shot(page, `${tag}-3b-savings-collected-bank`, true); run.savings.bankText = (await text(page)).slice(0, 1300); }
    } else run.savings.note = 'NO Bank tile';
    await context.close();

    const NBA = 'nba-my-career-save-v1';
    const nb = await open(w, h, reduced, '/nba-my-career');
    await quickStart(nb.page, '/nba-my-career', { throwback: false, pos: 'PG', name: 'Hoop Bank' });
    await nb.page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); if (!s) return; s.c.netWorth = -0.7; s.c.eventLastFired = { walk_card: s.c.year }; localStorage.setItem(k, JSON.stringify(s)); }, NBA);
    await nb.page.reload({ waitUntil: 'networkidle' }); await nb.page.waitForTimeout(1300); await top(nb.page);
    run.nba = { tile: await hubBank(nb.page), saved: !!(await readSave(nb.page, NBA)) };
    await shot(nb.page, `${tag}-3c-nba-bank-on-load`);
    await nb.context.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'rv-walk2.json'), JSON.stringify(report, null, 1));
console.log(`rv-walk2: ${report.runs.length} runs, ${report.errors.length} page errors`);
