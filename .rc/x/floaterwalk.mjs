/* Round 1531 fix2 walk: does the full time result floater cover the "+N gems" floater?
   Real /stadium-tycoon on a served dist, reduced motion (floaters hold still), 390x844 and 1280x900, a draw and a win.
   It seeds a save one match minute from full time, keeps every roll high so nobody scores, and measures the boxes.
   FLOATER_EXPECT=clear asserts no overlap anywhere; FLOATER_EXPECT=overlap (the control, old hook) asserts the 390
   draw and win both overlap, so the measurement is proven able to see the defect. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(path.resolve('scripts/lib/playwrightLoader.mjs')).href);
const BASE = process.env.FLOATER_BASE || process.env.BASE || 'http://localhost:4173';
const OUT = path.join(process.env.RC_OUT || path.resolve('.floater-out'), process.env.FLOATER_TAG || 'head');
const EXPECT = process.env.FLOATER_EXPECT || 'clear';
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'stadiumTycoonSaveV1';
const RESULT = { draw: /^FULL TIME DRAW$/, win: /^FULL TIME WIN \+/ };
const rows = [];
const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
const browser = await chromium.launch();
try {
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    for (const result of ['draw', 'win']) {
      const tag = `${result}-${w}x${h}`, row = { tag, errors: [] };
      rows.push(row);
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
      await ctx.route(/supabase\.co/, r => r.abort());
      const first = await ctx.newPage();
      first.on('pageerror', e => row.errors.push(String(e)));
      await first.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' });
      await first.waitForSelector('[data-room="stadium"]', { timeout: 30000 });
      await first.waitForFunction(k => !!localStorage.getItem(k), KEY, { timeout: 15000 });
      const seed = JSON.parse(await first.evaluate(k => localStorage.getItem(k), KEY));
      await first.close({ runBeforeUnload: true });
      seed.minute = 84; seed.matchSec = 0; seed.goalsFor = result === 'win' ? 2 : 1; seed.goalsAgainst = 1;
      const page = await ctx.newPage();
      page.on('pageerror', e => row.errors.push(String(e)));
      await page.addInitScript(({ k, v }) => {
        const s = JSON.parse(v); s.savedAt = Date.now();
        localStorage.setItem(k, JSON.stringify(s));
        Math.random = () => 0.999;
      }, { k: KEY, v: JSON.stringify(seed) });
      await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-room="stadium"]', { timeout: 30000 });
      await page.keyboard.press('Escape');
      const reject = page.getByRole('button', { name: 'Reject all' });
      if (await reject.count()) await reject.first().click({ noWaitAfter: true }).catch(() => {});
      for (let i = 0; i < 300; i++) {
        const seen = await page.evaluate(() => [...document.querySelectorAll('.st-float')].map(n => {
          const b = n.getBoundingClientRect();
          return { text: n.textContent, left: b.left, right: b.right, top: b.top, bottom: b.bottom };
        }));
        const res = seen.find(f => RESULT[result].test(f.text)), gems = seen.find(f => /^\+\d+ gems$/.test(f.text));
        if (res && gems) { row.result = res; row.gems = gems; row.all = seen; break; }
        await page.waitForTimeout(100);
      }
      const pitch = page.locator('[data-tycoon-pitch]');
      if (await pitch.count()) {
        const b = await pitch.boundingBox(); row.pitch = b;
        await pitch.screenshot({ path: path.join(OUT, `${tag}.png`) });
      }
      if (row.result && row.gems) {
        row.resultGemsOverlapPx = overlap(row.result, row.gems);
        row.gemsOverlapsAny = row.all.filter(f => f !== row.gems && f.text !== row.gems.text).map(f => ({ text: f.text, px: overlap(f, row.gems) })).filter(x => x.px > 0);
        row.gemsInsidePitch = !!row.pitch && row.gems.left >= row.pitch.x && row.gems.right <= row.pitch.x + row.pitch.width && row.gems.top >= row.pitch.y && row.gems.bottom <= row.pitch.y + row.pitch.height;
      }
      await ctx.close();
    }
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(OUT, 'floaters.json'), JSON.stringify(rows, null, 2));
for (const r of rows) console.log(`${r.tag}: result ${r.result ? `${Math.round(r.result.left)}-${Math.round(r.result.right)} x ${Math.round(r.result.top)}-${Math.round(r.result.bottom)}` : 'MISSING'} gems ${r.gems ? `${Math.round(r.gems.left)}-${Math.round(r.gems.right)} x ${Math.round(r.gems.top)}-${Math.round(r.gems.bottom)}` : 'MISSING'} overlap ${r.resultGemsOverlapPx ?? 'n/a'}px others ${JSON.stringify(r.gemsOverlapsAny ?? null)} inside ${r.gemsInsidePitch ?? 'n/a'} errors ${r.errors.length}`);
for (const r of rows) {
  assert.deepEqual(r.errors, [], `${r.tag}: page errors`);
  assert(r.result && r.gems, `${r.tag}: both the result floater and the gems floater were seen`);
}
if (EXPECT === 'overlap') {
  for (const r of rows.filter(x => x.tag.endsWith('390x844'))) assert(r.resultGemsOverlapPx > 0, `${r.tag}: the old hook overlaps`);
  console.log('floaterwalk overlap: the old hook covers the gems floater at 390 for a draw and a win (control fired)');
} else {
  for (const r of rows) {
    assert.equal(r.resultGemsOverlapPx, 0, `${r.tag}: result floater clear of the gems floater`);
    assert.deepEqual(r.gemsOverlapsAny, [], `${r.tag}: no other floater on the gems floater`);
    assert.equal(r.gemsInsidePitch, true, `${r.tag}: the gems floater sits inside the pitch`);
  }
  console.log('floaterwalk clear: result and gems floaters apart at 390x844 and 1280x900, draw and win');
}
