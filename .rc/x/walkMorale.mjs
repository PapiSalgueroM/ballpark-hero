/* Round 1523 walk (not committed): the line under the Morale bar on the Soccer Career hub, at 390 and 1280, for
   three saves (morale 95, 81 and 40), against the served build (BASE). Supabase is blocked. Screenshots and a
   measurement JSON go to $RC_OUT. Exit 1 on any failure; the last line says green or red. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from 'playwright';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'walk1523-out-'));
const KEY = 'soccerCareerSave';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'walk1523-'));
const slash = p => p.split(path.sep).join('/');
fs.writeFileSync(path.join(TMP, 'entry.mjs'), `globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * from '${slash(path.join(ROOT, 'src/lib/soccerCareerEngine.ts'))}';
export { soccerMoraleLine } from '${slash(path.join(ROOT, 'src/lib/careerForm.ts'))}';
export { phoneAppsSwing } from '${slash(path.join(ROOT, 'src/lib/soccerPhone.ts'))}';
`);
await build({ entryPoints: [path.join(TMP, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'e.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const E = await import(pathToFileURL(path.join(TMP, 'e.mjs')).href);
let failures = 0;
const results = [];
const check = (ok, label) => { results.push({ ok: !!ok, label }); if (!ok) { failures += 1; console.log(`  FAIL ${label}`); } };
let s = 15231523;
Math.random = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const o = 68, stats = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o };
let c = E.initCareer('Walk Tester', 'England', 'CM', '2020-24', stats, o, 2020, E.FALLBACK_CLUBS, null);
for (let k = 0; k < 400 && !(c.phase === 'playing' && c.seasons.filter(r => r.type === 'playing').length >= 2); k += 1) {
  if (c.phase === 'youth') c = E.advanceYouthYear(c, E.FALLBACK_CLUBS);
  else if (c.phase === 'contract_offer') c = (c.pendingOffers || []).length ? E.acceptOffer(c, c.pendingOffers[0]) : { ...c, phase: 'playing' };
  else if (c.phase === 'random_events') c = c.pendingEvents?.[0] ? E.applyEventChoice(c, 0, E.FALLBACK_CLUBS) : { ...c, pendingEvents: [], phase: 'playing' };
  else if (c.phase === 'season_summary') c = E.dismissSummary(c, E.FALLBACK_CLUBS);
  else if (c.phase === 'newspaper') c = E.dismissNewspaper(c);
  else if (c.phase === 'playing') c = E.advanceProSeason(c, E.FALLBACK_CLUBS);
  else if (c.phase === 'transfer_window') c = E.stayAtClub(c, E.FALLBACK_CLUBS);
  else c = { ...c, phase: 'playing', pendingEvents: [] };
}
check(c.phase === 'playing', `the fixture reached a playing hub (phase ${c.phase})`);
const fixture = m => { const f = JSON.parse(JSON.stringify({ ...c, morale: m })); delete f.chanceWheel; return f; };
const browser = await pw.chromium.launch({ headless: true });
const errors = [], rows = [];
try {
  for (const width of [390, 1280]) {
    const touch = width < 1000;
    const ctx = await browser.newContext({ viewport: { width, height: touch ? 844 : 900 }, hasTouch: touch, isMobile: touch });
    await ctx.route(/supabase\.co/, r => r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`${width}: ${String(e).slice(0, 200)}`));
    for (const m of [95, 81, 40]) {
      const save = fixture(m);
      await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded' });
      await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('rules-gate-seen:/soccer-career', '1'); localStorage.setItem(k, v); }, [KEY, JSON.stringify(save)]);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('[data-career-action-bar]', { timeout: 20000 }).catch(() => {});
      const line = page.locator('[data-morale-line]');
      const n = await line.count();
      check(n === 1, `${width} morale ${m}: one morale line on the hub (found ${n})`);
      if (n !== 1) continue;
      await line.scrollIntoViewIfNeeded();
      const text = (await line.innerText()).trim();
      const want = E.soccerMoraleLine(m, E.phoneAppsSwing(save));
      check(text === want, `${width} morale ${m}: the line reads "${text}", the helper says "${want}"`);
      const box = await line.boundingBox();
      const bar = await page.locator('text=Morale').first().boundingBox();
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(wide <= 0, `${width} morale ${m}: no sideways scroll (${wide}px)`);
      check(box && box.x >= 0 && box.x + box.width <= width + 1, `${width} morale ${m}: the line sits inside the viewport`);
      check(box && bar && box.y >= bar.y && box.y - bar.y < 60, `${width} morale ${m}: the line sits just under the Morale bar`);
      rows.push({ width, morale: m, text, box, bar, wide });
      await page.screenshot({ path: path.join(OUT, `morale-${width}-${m}.png`), clip: box ? { x: 0, y: Math.max(0, box.y - 60), width, height: 120 } : undefined });
    }
    await ctx.close();
  }
} finally { await browser.close(); }
check(errors.length === 0, `no page errors (${errors.join(' | ')})`);
fs.writeFileSync(path.join(OUT, 'walk1523.json'), JSON.stringify({ rows, results }, null, 1));
console.log(`${results.length} checks; ${rows.map(r => `${r.width}/${r.morale}: ${r.text}`).join(' | ')}`);
console.log(failures ? `walkMorale: RED, ${failures} failed` : 'walkMorale: green');
process.exit(failures ? 1 : 0);
