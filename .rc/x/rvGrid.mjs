/* Release AO review: does decision 1i's remedy do anything a player can see?
   Types into College Grid's search box (debounce 0, answers from memory) on two builds and counts the animation
   frames in which the "Finding players" row is in the page: BASE is the branch build (remedy in), BASE2 the same
   tree with the remedy taken out (mutation m7). supabase.co is aborted. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rv-out');
fs.mkdirSync(OUT, { recursive: true });
const BUILDS = [['branch (remedy in)', process.env.BASE || 'http://localhost:4173'], ['mutant m7 (remedy out)', process.env.BASE2 || '']].filter(b => b[1]);
const WORDS = ['smith', 'john', 'will', 'davis', 'mar', 'tyler jo'];

const browser = await pw.chromium.launch();
const rows = [];
for (const [label, base] of BUILDS) {
  for (const cpu of [1, 4]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'essential'); } catch (e) { /* blocked */ } });
    const page = await ctx.newPage();
    await page.route(/supabase\.co/, r => r.abort());
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message).slice(0, 160)));
    page.on('console', m => { if (m.type() === 'error' && /flushSync|lifecycle/i.test(m.text())) errors.push(m.text().slice(0, 200)); });
    if (cpu > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
    await page.goto(`${base}/college-grid`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('[data-grid-cell-status]', { timeout: 40000 }).catch(() => {});
    await page.waitForTimeout(1200);
    for (let i = 0; i < 3; i += 1) {
      const had = await page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => /Let's Play|Start playing|Got it|Play/.test(x.textContent ?? '')); if (b) b.click(); return !!b; });
      if (!had) break;
      await page.waitForTimeout(350);
    }
    const cell = await page.$('[data-grid-cell-status]');
    if (cell) await cell.click().catch(() => {});
    const input = await page.waitForSelector('input[placeholder="Type a player name..."]', { timeout: 15000 }).catch(() => null);
    if (!input) {
      rows.push({ label, cpu, error: 'no search box after pressing a cell' });
      await page.screenshot({ path: path.join(OUT, `grid-nobox-${cpu}.png`) });
      await ctx.close();
      continue;
    }
    await page.evaluate(() => {
      window.__fp = { frames: 0, seen: 0, listFrames: 0 };
      const loop = () => {
        window.__fp.frames += 1;
        const t = document.body.innerText || '';
        if (t.includes('Finding players')) window.__fp.seen += 1;
        if (document.querySelector('[role="listbox"] [role="option"]')) window.__fp.listFrames += 1;
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    let keys = 0;
    for (const w of WORDS) {
      await input.click();
      for (const ch of w) { await page.keyboard.type(ch); keys += 1; await page.waitForTimeout(90); }
      await page.waitForTimeout(400);
      if (w === WORDS[0]) await page.screenshot({ path: path.join(OUT, `grid-${label.startsWith('branch') ? 'branch' : 'mutant'}-cpu${cpu}.png`) });
      for (let i = 0; i < w.length; i += 1) { await page.keyboard.press('Backspace'); keys += 1; await page.waitForTimeout(60); }
      await page.waitForTimeout(200);
    }
    const fp = await page.evaluate(() => window.__fp);
    rows.push({ label, cpu, keys, ...fp, errors });
    console.log(`${label}, cpu x${cpu}: ${keys} keys, ${fp.frames} frames sampled, "Finding players" in the page on ${fp.seen} frames, a list of names on ${fp.listFrames} frames${errors.length ? `, errors: ${errors.join(' | ')}` : ''}`);
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'grid-frames.json'), JSON.stringify(rows, null, 1));
console.log(`rvGrid: ${rows.length} runs`);
