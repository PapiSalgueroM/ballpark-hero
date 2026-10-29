/* Reviewer walk 2 (runner only): the revealed rows of NEW boards with the cookie banner dismissed, as element and
   viewport screenshots, at 390x844 and 1280x900, reduced motion on. Also opens the ? rules dialog once at 390. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const ROOT = path.resolve('.');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'rvwalk2-'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rvwalk2b-'));
const R = ROOT.split(path.sep).join('/');
fs.writeFileSync(path.join(TMP, 'e.mjs'), `export { dailyIndex } from '${R}/src/lib/dateUtils.ts';\nexport { nhlConnectionsPuzzles } from '${R}/src/data/nhlConnectionsPuzzles.ts';`);
await build({ entryPoints: [path.join(TMP, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'o.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const app = await import(pathToFileURL(path.join(TMP, 'o.mjs')).href);
const exp = JSON.parse(fs.readFileSync('.rc/x/nhl-2026-10-29.json', 'utf8')).sort((a, b) => a.sort_order - b.sort_order);
const table = JSON.parse(fs.readFileSync('scripts/data/nhlConnectionsTable-2026-10.json', 'utf8'));
const fileB = new Map(app.nhlConnectionsPuzzles.map(b => [b.id, b.groups]));
const tabB = new Map(table.rows.map(r => [r.puzzle_id, r.board]));
const NEW = exp.map(r => ({ puzzle_id: r.puzzle_id, groups_json: fileB.get(r.puzzle_id) ?? tabB.get(r.puzzle_id) }));
const dateFor = id => { for (let i = 0; i < 80; i += 1) { const d = new Date(Date.UTC(2026, 10, 1, 12) + i * 86400000).toISOString().slice(0, 10); if (NEW[app.dailyIndex(d, NEW.length)].puzzle_id === id) return d; } throw new Error(id); };
const browser = await chromium.launch();
const out = [];
let failures = 0;
for (const [id, v] of [['nhlconn-005', { w: 390, h: 844 }], ['nhlconn-012', { w: 390, h: 844 }], ['nhlconn-018', { w: 390, h: 844 }], ['nhlconn-005', { w: 1280, h: 900 }], ['nhlconn-013', { w: 1280, h: 900 }]]) {
  const date = dateFor(id);
  const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, timezoneId: 'America/New_York', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message ?? e)));
  await page.route(/supabase\.co/, route => (route.request().url().includes('nhl_connections_puzzles') ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(NEW) }) : route.abort()));
  await page.clock.install({ time: new Date(`${date}T17:00:00Z`) });
  await page.goto(`${BASE}/nhl-connections`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[aria-label="Available players"] button', { timeout: 30000 });
  await page.waitForTimeout(600);
  if (id === 'nhlconn-005' && v.w === 390 && await page.locator('[role="dialog"]').count()) await page.screenshot({ path: path.join(OUT, 'rv2-rules-390.png') });
  for (let i = 0; i < 3 && await page.locator('[role="dialog"]').count(); i += 1) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  const reject = page.getByRole('button', { name: 'Reject all' });
  if (await reject.count()) await reject.first().evaluate(el => el.click());
  await page.waitForTimeout(300);
  const groups = NEW.find(r => r.puzzle_id === id).groups_json;
  await page.evaluate(() => document.activeElement?.blur());
  await page.screenshot({ path: path.join(OUT, `rv2-${id}-${v.w}-start.png`) });
  for (const g of groups) {
    for (const n of g.players) await page.locator(`[aria-label="Available players"] button[aria-label="${n.replace(/"/g, '\\"')}"]`).evaluate(el => el.click());
    await page.getByRole('button', { name: 'Submit five' }).evaluate(el => el.click());
    await page.waitForTimeout(700);
  }
  const rows = page.locator('[aria-label="Revealed groups"]');
  await rows.evaluate(el => el.querySelectorAll('details').forEach(d => { d.open = true; }));
  await page.waitForTimeout(300);
  await rows.screenshot({ path: path.join(OUT, `rv2-${id}-${v.w}-rows.png`) });
  const texts = await rows.locator('summary').evaluateAll(els => els.map(e => ({ t: e.textContent.trim(), over: e.scrollWidth - e.clientWidth, h: Math.round(e.getBoundingClientRect().height) })));
  const bodies = await rows.locator('details p').evaluateAll(els => els.map(e => e.textContent.trim()));
  const want = groups.map(g => g.theme);
  const bad = want.some(w => !texts.some(x => x.t === w)) || texts.some(x => x.over > 1) || groups.some(g => !bodies.includes(g.players.join(', ')));
  if (bad || errors.length) failures += 1;
  out.push(`${id} ${v.w} (${date}): ${bad ? 'FAIL' : 'ok'} rows ${JSON.stringify(texts)} errors ${errors.length}`);
  await ctx.close();
}
await browser.close();
console.log(out.join('\n'));
if (failures) { console.error(`rvwalk2: ${failures} failure(s)`); process.exit(1); }
console.log('rvwalk2: green');
