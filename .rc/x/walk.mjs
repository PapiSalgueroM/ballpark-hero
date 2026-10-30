/* Reviewer walk for Round 1597 (runner only). Seeds the save written by mkwalk.mjs (four league weeks from the end
   of season 1), then plays it like a player: the hub line, the rest of the season, the review's contracts checkpoint
   (help, renew one, let one go, let the rest go), Continue, the new season's first screen and the free agent list.
   390x844 and 1280x900, reduced motion on and off. supabase.co blocked. Screenshots into $RC_OUT. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
const KEY = 'dukb-club-manager-save';
const raw = fs.readFileSync(path.join(OUT, 'walksave.txt'), 'utf8');
let failures = 0;
const check = (ok, line) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${line}`); if (!ok) failures += 1; };
const vis = async loc => (await loc.count()) > 0 && await loc.first().isVisible().catch(() => false);
const clickTile = (page, t) => page.evaluate(t => { const b = [...document.querySelectorAll('button')].find(x => x.querySelector(':scope > div.uppercase')?.textContent.trim() === t); if (b) b.click(); return !!b; }, t);
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const browser = await chromium.launch();
for (const [w, h, label] of [[390, 844, 'phone'], [1280, 900, 'desktop']]) for (const rm of ['reduce', 'no-preference']) {
  const tag = `${label}-${rm === 'reduce' ? 'rm' : 'motion'}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem('cookie-consent', 'essential'); if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch { /* blocked */ } }, [KEY, raw]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  try {
    await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
    await page.locator('button', { hasText: 'Resume Career' }).first().click({ timeout: 30000 });
    const line = page.locator('[data-cm-deals-line]');
    await line.waitFor({ timeout: 60000 }).catch(() => {});
    const lineText = (await line.count()) ? (await line.first().innerText()).trim() : '';
    check(lineText.length > 0, `${tag}: the hub names the deals that run out: "${lineText}"`);
    if (lineText) {
      await line.first().evaluate(el => el.scrollIntoView({ block: 'center' }));
      const box = await line.first().boundingBox();
      check(box && box.x >= 0 && box.x + box.width <= w + 1, `${tag}: the hub line sits inside the screen (x ${box && Math.round(box.x)}, width ${box && Math.round(box.width)})`);
    }
    await page.screenshot({ path: path.join(OUT, `hub-${tag}.png`) });
    check(await overflow(page) <= 0, `${tag}: no sideways scroll on the hub (${await overflow(page)})`);
    if (lineText) {
      await line.first().click(); await page.waitForTimeout(1500); await page.screenshot({ path: path.join(OUT, `desk-${tag}.png`) });
      const desk = await page.evaluate(() => { const d = [...document.querySelectorAll('div.uppercase')].find(x => x.textContent.trim().endsWith('Contracts')); return d ? { top: Math.round(d.getBoundingClientRect().top), scrollY: Math.round(scrollY), vh: innerHeight } : null; });
      console.log(`  info ${tag}: after "Open the contracts desk" the desk heading is at ${desk ? `${desk.top} px from the top of a ${desk.vh} px screen (scrollY ${desk.scrollY})` : 'nowhere'}`);
    }
    const steps = [];
    for (let i = 0; i < 40 && !(await vis(page.locator('[data-cm-deals]'))); i += 1) {
      if (await vis(page.locator('button', { hasText: 'See Season Review' }))) { await page.locator('button', { hasText: 'See Season Review' }).first().click(); steps.push('review'); }
      else if (await vis(page.locator('button', { hasText: /^Continue$/ }))) { await page.locator('button', { hasText: /^Continue$/ }).first().click(); steps.push('continue'); }
      else if (await vis(page.locator('button', { hasText: 'Rest of season' }))) { await page.locator('button', { hasText: 'Rest of season' }).first().click(); steps.push('rest'); }
      else if (await vis(page.locator('button', { hasText: 'Club home' }))) { await page.locator('button', { hasText: 'Club home' }).first().click(); steps.push('home'); }
      else if (await vis(page.getByRole('tab', { name: /^Home$/ })) && (await page.getByRole('tab', { name: /^Home$/ }).first().getAttribute('aria-selected')) !== 'true') { await page.getByRole('tab', { name: /^Home$/ }).first().click(); steps.push('tab'); }
      else if (await clickTile(page, 'Calendar')) steps.push('calendar');
      else if (await vis(page.locator('button', { hasText: 'Quick Sim' }))) { await page.locator('button', { hasText: 'Quick Sim' }).first().click(); steps.push('quick'); }
      else steps.push('nothing');
      await page.waitForTimeout(1500);
    }
    const tile = page.locator('[data-cm-deals]');
    check(await vis(tile), `${tag}: the season review shows the contracts checkpoint (steps ${steps.join(',')})`);
    if (!(await vis(tile))) { await page.screenshot({ path: path.join(OUT, `noreview-${tag}.png`), fullPage: true }); continue; }
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, `review-full-${tag}.png`), fullPage: true });
    const cont = page.locator('button', { hasText: /^(Answer \d+ deals? first|Continue to Season \d+)$/ }).first();
    const geo = await page.evaluate(() => { const t = document.querySelector('[data-cm-deals]').getBoundingClientRect(); const b = [...document.querySelectorAll('button')].find(x => /^(Answer \d+ deals? first|Continue to Season \d+)$/.test(x.textContent.trim())); const r = b && b.getBoundingClientRect(); return { tileTop: Math.round(t.top + scrollY), tileBottom: Math.round(t.bottom + scrollY), contTop: r ? Math.round(r.top + scrollY) : null, doc: document.documentElement.scrollHeight }; });
    console.log(`  info ${tag}: checkpoint ${geo.tileTop} to ${geo.tileBottom}, Continue at ${geo.contTop}, page height ${geo.doc}`);
    check(await cont.isDisabled(), `${tag}: Continue is shut: "${(await cont.textContent())?.trim()}"`);
    const names = await page.$$eval('[data-cm-deal] .truncate', els => els.map(e => e.textContent.trim()));
    console.log(`  info ${tag}: ${names.length} rows: ${names.join(' | ')}`);
    await page.locator('[data-cm-deals-help]').click();
    await page.waitForTimeout(300);
    await tile.screenshot({ path: path.join(OUT, `deals-help-${tag}.png`) });
    check(await overflow(page) <= 0, `${tag}: no sideways scroll at the review (${await overflow(page)})`);
    const renewed = await page.evaluate(() => { const row = [...document.querySelectorAll('[data-cm-deal="open"]')].find(r => !r.querySelector('[data-cm-deal-renew]').disabled); if (!row) return null; row.querySelector('[data-cm-deal-renew]').click(); return row.querySelector('.truncate').textContent.trim(); });
    await page.waitForTimeout(500);
    const letOne = await page.evaluate(() => { const row = document.querySelector('[data-cm-deal="open"]'); if (!row) return null; row.querySelector('[data-cm-deal-letgo]').click(); return row.querySelector('.truncate').textContent.trim(); });
    await page.waitForTimeout(500);
    await tile.screenshot({ path: path.join(OUT, `deals-answered-${tag}.png`) });
    if (await vis(page.locator('[data-cm-deals-rest]:not([disabled])'))) await page.evaluate(() => document.querySelector('[data-cm-deals-rest]').click());
    await page.waitForTimeout(500);
    const label2 = (await cont.textContent())?.trim();
    check(!(await cont.isDisabled()) && /^Continue to Season 2$/.test(label2 || ''), `${tag}: every answer in, Continue opens: "${label2}" (renewed ${renewed}, let go ${letOne})`);
    await cont.click();
    const retiredTile = page.locator('[data-cm-fa-retired]');
    await retiredTile.waitFor({ timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT, `newseason-${tag}.png`) });
    const rt = (await retiredTile.count()) ? (await retiredTile.first().innerText()) : '';
    check(rt.includes('Walk Probe Veteran'), `${tag}: the new season's first screen names the man who retired off the list: "${rt.replace(/\s+/g, ' ').slice(0, 160)}"`);
    if (rt) { await retiredTile.first().evaluate(el => el.scrollIntoView({ block: 'center' })); await page.screenshot({ path: path.join(OUT, `retired-tile-${tag}.png`) }); }
    const save = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
    const pool = (save.freeAgents ?? []).map(f => f.name);
    const walked = names.filter(n => n !== renewed);
    const missing = walked.filter(n => !pool.includes(n) && !(save.squad ?? []).some(p => p.name === n) && !(save.retiredNames ?? []).includes(n));
    check(missing.length === 0, `${tag}: every man let go is on the free agent list, still here or retired after the summer (${walked.length} let go, missing ${missing.join(', ') || 'none'}; list ${pool.length})`);
    const rn = (save.squad ?? []).find(p => p.name === renewed);
    check(!renewed || (rn && (rn.contractYears ?? 0) > 1), `${tag}: the renewed man ${renewed} is in the squad on a new deal (${rn && rn.contractYears} years)`);
    check(errors.length === 0, `${tag}: no page errors (${errors.slice(0, 2).join(' | ')})`);
  } catch (e) { check(false, `${tag}: walk threw ${String(e).slice(0, 200)}`); await page.screenshot({ path: path.join(OUT, `threw-${tag}.png`), fullPage: true }).catch(() => {}); }
  await ctx.close();
}
await browser.close();
console.log(failures ? `walk1597-review: RED, ${failures} failures` : 'walk1597-review: green');
process.exit(failures ? 1 : 0);
