/* Reviewer's walk of Round 1112, the pages (never committed): What's New and the game's own "?". */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { open, sideways, close, say, note, shot, OUT, BASE } from './rv-walk.mjs';

const pages = [];
for (const [wd, ht, reduced] of [[390, 844, false], [1280, 900, true]]) {
  try {
    const w = await open(wd, ht, reduced, false); const { page } = w; const what = `pages, ${w.label}`;
    console.log(what);
    await page.goto(`${BASE}/whats-new`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
    const body = await page.locator('body').innerText();
    const para = body.split('\n').filter(l => /rival/i.test(l) && /NBA|All-Star|head to head/i.test(l));
    say(para.length > 0, `${what}: What's New has an entry that tells of the rival (${para.length} lines)`);
    for (const l of para.slice(0, 2)) note(`${what}: What's New: "${l.trim().slice(0, 1400)}"`);
    pages.push({ ctx: w.tag, whatsNew: para.slice(0, 3) });
    const en = String.fromCharCode(0x2013); const em = String.fromCharCode(0x2014);
    say(!para.some(l => l.includes(en) || l.includes(em)), `${what}: no em or en dash in those lines`);
    const el = page.locator('li', { hasText: /the numbers tell the truth now/ }).first();
    if (await el.count()) { await el.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(200); await el.screenshot({ path: path.join(OUT, `pages-${w.tag}-whatsnew-entry.png`) }).catch(() => {}); }
    else note(`${what}: the entry's list item was not found by its title`);
    say((await sideways(page)) <= 1, `${what}: What's New does not scroll sideways (${await sideways(page)} px over)`);
    await page.goto(`${BASE}/nba-my-career`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000);
    const guide = (await page.locator('body').innerText()).split('\n').filter(l => /same scale/i.test(l));
    note(`${what}: the page's guide lines with "same scale": ${guide.map(l => `"${l.trim().slice(0, 300)}"`).join(' / ') || 'none on this screen'}`);
    const help = page.locator('button[aria-label="How to play"]').first();
    if (await help.count()) {
      await help.click(); await page.waitForTimeout(800);
      const text = await page.locator('body').innerText();
      const lines = text.split('\n').filter(l => /rival/i.test(l));
      note(`${what}: the "?" lines that name the rival: ${lines.map(l => `"${l.trim().slice(0, 260)}"`).join(' / ') || 'none'}`);
      pages.push({ ctx: w.tag, help: lines.slice(0, 6) });
      await shot(page, `pages-${w.tag}-help`);
    } else note(`${what}: no "How to play" button on this screen`);
    await close(w, what);
  } catch (e) { say(false, `pages at ${wd} stopped: ${String(e && e.stack ? e.stack : e).split('\n').slice(0, 3).join(' | ')}`); }
}
writeFileSync(path.join(OUT, 'rv-walk-pages.json'), JSON.stringify(pages, null, 1));
