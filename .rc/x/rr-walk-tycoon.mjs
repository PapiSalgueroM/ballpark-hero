/* Reviewer walk (never committed): the Stadium Tycoon "Latest season" review (Round 1095) on the real built page.
   The engine plays a first season to its last minute in node; the page finishes it in real time. supabase is blocked. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/rr-shots');
fs.mkdirSync(OUT, { recursive: true });
const require = createRequire(path.join(ROOT, 'package.json'));
const esbuild = require('esbuild');
const work = process.env.RR_WORK ? path.resolve(process.env.RR_WORK) : path.join(ROOT, '.rr-walk-tmp');
fs.mkdirSync(work, { recursive: true });
const outfile = path.join(work, 'tycoon.cjs');
await esbuild.build({ entryPoints: [path.join(ROOT, 'src/lib/stadiumTycoon.ts')], outfile, bundle: true, platform: 'node', format: 'cjs', alias: { '@': path.join(ROOT, 'src') }, logLevel: 'silent' });
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const T = require(outfile);

function nearFinal() {
  let state = T.newTycoon(Date.now());
  let seed = 1095;
  const roll = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const shape = T.leagueShape(state.league.division);
  for (let minute = 0; minute < shape.matchdays * 90 - 1; minute += 1) state = T.tick(state, 1.4, roll).state;
  console.log(`engine: division ${state.league.division}, ${shape.clubs} clubs, matchday ${state.league.matchday} of ${shape.matchdays}, minute ${state.minute}, position ${T.leaguePosition(state.league)}`);
  state.matchSec = 1.25;
  return { raw: T.serializeTycoon(state, Date.now()), shape };
}

if (process.env.RR_ENGINE_ONLY) { const probe = nearFinal(); console.log(`engine only: save ${probe.raw.length} bytes, key ${T.TYCOON_SAVE_KEY}`); process.exit(0); }
const report = { cases: [] };
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
async function walk(width, height, reduced) {
  const tag = `${width}${reduced ? '-reduced' : ''}`;
  const row = { tag, problems: [] };
  report.cases.push(row);
  const { raw, shape } = nearFinal();
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([key, v]) => {
    try {
      if (!sessionStorage.getItem('rr-walk')) {
        sessionStorage.setItem('rr-walk', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem(key, v);
      }
    } catch { /* private mode */ }
  }, [T.TYCOON_SAVE_KEY, raw]);
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  const shot = async name => { await page.waitForTimeout(400); await page.screenshot({ path: path.join(OUT, `ty-${tag}-${name}.png`) }); };
  try {
    await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('[data-room="league"]', { timeout: 40000 });
    await page.waitForTimeout(3500);
    await shot('0-after-load');
    /* anything the season's end put on top (a promotion card, a badge) is closed the way a player would */
    for (let i = 0; i < 4; i += 1) {
      const open = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].map(d => (d.getAttribute('aria-label') || d.textContent || '').trim().slice(0, 60)));
      if (!open.length) break;
      row.overlays = (row.overlays || []).concat(open);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
    await page.evaluate(() => document.querySelector('[data-room="league"]').click());
    const has = await page.waitForSelector('[data-last-season]', { timeout: 30000 }).then(() => true).catch(() => false);
    await shot('1-league-room');
    if (!has) { row.problems.push('no [data-last-season] trigger appeared within 30 s of the final minute'); return; }
    const trig = await page.evaluate(() => { const b = document.querySelector('[data-last-season]'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { text: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), tagName: b.tagName }; });
    row.trigger = trig;
    await page.waitForTimeout(300);
    await shot('2-trigger');
    await page.locator('[data-last-season]').click({ timeout: 5000 }).catch(async () => { await page.evaluate(() => document.querySelector('[data-last-season]').click()); });
    const opened = await page.waitForSelector('[data-latest-season-review]', { timeout: 8000 }).then(() => true).catch(() => false);
    if (!opened) { row.problems.push('the review dialog did not open'); await shot('3-NOT-OPEN'); return; }
    await shot('3-dialog');
    const facts = await page.evaluate(() => {
      const pane = document.querySelector('[data-latest-season-review]');
      const r = pane.getBoundingClientRect();
      const text = sel => pane.querySelector(sel)?.textContent.trim() ?? null;
      const rows = [...pane.querySelectorAll('[data-season-club]')].map(tr => ({ club: tr.getAttribute('data-season-club'), cells: [...tr.children].map(c => c.textContent.trim()), mine: tr.className.includes('bg-primary') }));
      const scroller = pane.querySelector('.overflow-y-auto');
      const back = [...pane.querySelectorAll('button')].find(b => b.textContent.trim() === 'Back');
      const br = back ? back.getBoundingClientRect() : null;
      return {
        box: { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }, vw: innerWidth, vh: innerHeight,
        headline: text('[data-season-headline]'), position: text('[data-season-position]'), points: text('[data-season-points]'), record: text('[data-season-record]'), goals: text('[data-season-goals]'),
        rows, sideways: document.documentElement.scrollWidth - innerWidth, paneX: pane.scrollWidth - pane.clientWidth,
        scrollerX: scroller ? scroller.scrollWidth - scroller.clientWidth : null, scrollerY: scroller ? scroller.scrollHeight - scroller.clientHeight : null,
        back: br ? { t: Math.round(br.top), b: Math.round(br.bottom), h: Math.round(br.height) } : null,
        focus: document.activeElement ? document.activeElement.tagName + ':' + (document.activeElement.textContent || '').trim().slice(0, 30) : null,
        animating: document.getAnimations().filter(a => a.playState === 'running').length,
      };
    });
    row.facts = facts;
    row.shape = shape;
    await page.evaluate(() => { const s = document.querySelector('[data-latest-season-review] .overflow-y-auto'); if (s) s.scrollTop = s.scrollHeight; });
    await shot('4-dialog-bottom');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    row.afterClose = await page.evaluate(() => ({ open: !!document.querySelector('[data-latest-season-review]'), focusOnTrigger: document.activeElement === document.querySelector('[data-last-season]') }));
  } catch (e) {
    row.error = String(e).slice(0, 300);
    await shot('ERROR').catch(() => {});
  } finally {
    row.pageErrors = errors;
    await ctx.close();
  }
}
try {
  await walk(390, 844, false);
  await walk(1280, 900, false);
  await walk(390, 844, true);
} finally {
  fs.writeFileSync(path.join(OUT, 'ty-report.json'), JSON.stringify(report, null, 1));
  await browser.close();
}
for (const c of report.cases) console.log(`tycoon ${c.tag}: trigger=${JSON.stringify(c.trigger ?? null)} problems=${JSON.stringify(c.problems)} error=${c.error ?? 'none'} pageErrors=${JSON.stringify(c.pageErrors)}`);
console.log(`rr-walk-tycoon: ${report.cases.length} walks, ${report.cases.filter(c => c.facts).length} opened the review`);
process.exit(0);
