// Reviewer walk for Round 1530: what a player sees on the Hall of Champions data error screen (the screen
// playCorruptSaves now reads as offline), with the database blocked, at 390x844 and 1280x900, reduced
// motion on and off, with no save and with the two broken saves the walk writes. Screenshots to RC_OUT.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/rc-out';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const report = [];
let bad = 0;
const cases = [
  { tag: 'nosave', raw: null },
  { tag: 'wrongtype', raw: '{"openWings":3}' },
  { tag: 'shell', raw: '{"openWings":{}}' },
];
for (const vp of [{ w: 390, h: 844 }, { w: 1280, h: 900 }]) {
  for (const motion of ['reduce', 'no-preference']) {
    for (const c of cases) {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, reducedMotion: motion });
      await ctx.route(/supabase\.co/, r => r.abort());
      await ctx.route(u => !String(u).startsWith(BASE) && !String(u).startsWith('data:') && !String(u).startsWith('blob:'), r => r.abort());
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(String(e.message).split('\n')[0]));
      await page.goto(`${BASE}/robots.txt`);
      if (c.raw) await page.evaluate(v => localStorage.setItem('hallOfChampionsV1', v), c.raw);
      await page.goto(`${BASE}/hall-of-champions`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => /couldn'?t load|could not load/i.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const m = await page.evaluate(() => {
        const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'; };
        const btns = [...document.querySelectorAll('#root button')].filter(vis).map(b => {
          const r = b.getBoundingClientRect();
          return { t: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30), x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height), inFooter: !!b.closest('footer,header,nav') };
        });
        const err = [...document.querySelectorAll('p')].find(p => /couldn'?t load/i.test(p.textContent || ''));
        const er = err ? err.getBoundingClientRect() : null;
        return {
          errText: err ? err.textContent.trim() : null,
          errBox: er ? { x: Math.round(er.x), y: Math.round(er.y + scrollY), w: Math.round(er.width), h: Math.round(er.height) } : null,
          overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          docH: document.documentElement.scrollHeight,
          btns,
        };
      });
      const tooSmall = m.btns.filter(b => !b.inFooter && b.h < 30).map(b => `${b.t}(${b.h}px)`);
      const name = `hall-${vp.w}-${motion === 'reduce' ? 'rm' : 'motion'}-${c.tag}`;
      await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
      if (c.tag === 'nosave' && motion === 'reduce') await page.screenshot({ path: path.join(OUT, `${name}-full.png`), fullPage: true });
      const problems = [];
      if (!m.errText) problems.push('no error text');
      if (m.overflowX > 0) problems.push(`horizontal overflow ${m.overflowX}px`);
      if (errs.length) problems.push(`page errors: ${errs.join(' | ')}`);
      if (tooSmall.length) problems.push(`small buttons: ${tooSmall.join(', ')}`);
      if (problems.length) bad += 1;
      report.push({ name, ...m, errs, problems });
      console.log(`${problems.length ? 'WARN' : 'ok  '} ${name}: "${m.errText}" buttons [${m.btns.filter(b => !b.inFooter).map(b => `${b.t}@${b.x},${b.y} ${b.w}x${b.h}`).join(' | ')}] overflowX=${m.overflowX}${problems.length ? ' :: ' + problems.join('; ') : ''}`);
      await ctx.close();
    }
  }
}
fs.writeFileSync(path.join(OUT, 'walkHall.json'), JSON.stringify(report, null, 1));
await browser.close();
console.log(`walkHall: ${report.length} screens, ${bad} with a problem`);
process.exit(0);
