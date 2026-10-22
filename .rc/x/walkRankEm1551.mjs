// Round 1551 walk (never committed): the stamped Rank Em label on the daily that deals it, phone and desktop.
// Every host but the local server is aborted (the database included). Writes screenshots and numbers to $RC_OUT.
import pw from 'playwright';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
const CASES = [
  { day: '2026-10-25', label: 'NBA · career three-pointers made through 2025-26' },
  { day: '2026-10-27', label: 'NHL · career goals through 2025-26' },
];
const SIZES = [[390, 844], [1280, 900]];
const lines = [];
let bad = 0;
const browser = await pw.chromium.launch();
for (const c of CASES) {
  for (const [w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.route('**/*', r => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
    await page.clock.install({ time: new Date(`${c.day}T16:00:00Z`) });
    await page.goto(`${BASE}/rank-em`, { waitUntil: 'domcontentloaded' });
    const el = page.getByText(c.label, { exact: true }).first();
    let found = true;
    try { await el.waitFor({ state: 'attached', timeout: 20000 }); } catch { found = false; }
    if (!found) { bad += 1; lines.push(`${c.day} ${w}: label NOT FOUND`); await ctx.close(); continue; }
    const m = await el.evaluate(n => {
      const r = n.getBoundingClientRect();
      const lh = parseFloat(getComputedStyle(n).lineHeight) || 20;
      return { x: r.x, w: r.width, h: r.height, lines: Math.round(r.height / lh), right: r.right };
    });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw > w || m.right > w) bad += 1;
    lines.push(`${c.day} ${w}x${h}: label x ${m.x.toFixed(0)} w ${m.w.toFixed(0)} h ${m.h.toFixed(0)} lines ${m.lines}, right ${m.right.toFixed(0)}, page scrollWidth ${sw}`);
    await page.screenshot({ path: path.join(OUT, `rankem-${c.day}-${w}.png`) });
    await ctx.close();
  }
}
await browser.close();
const text = lines.join('\n');
console.log(text);
writeFileSync(path.join(OUT, 'walkRankEm1551.txt'), text + '\n');
console.log(bad ? `walkRankEm1551: ${bad} problem(s)` : 'walkRankEm1551: all checks passed');
process.exit(bad ? 1 : 0);
