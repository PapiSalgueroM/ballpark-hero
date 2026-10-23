/* Round 1544 adversarial review (lens RUNS): where the screen after the season's curtain arrives.
   A fresh 'now' career rated 96 presses "Play the 2026 season"; the curtain is read the way a player
   reads it (its Continue is tapped, which scrolls it into view when the curtain is taller than the
   screen); then every screen up to the national team's call (this head) or the summer's card (a base
   with no call) is stepped through, and the arrival of that screen is measured: its top and scrollY.
   Usage: BASE=<served dist> LABEL=<head|base> node review-run-arrive.mjs. Writes JPEGs to RC_OUT. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const LABEL = process.env.LABEL || 'head';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/review-arrive');
fs.mkdirSync(OUT, { recursive: true });
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rv-arrive-')), 'engine.cjs');
await build({
  stdin: { contents: `export { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
export { defaultAppearance } from '@/lib/soccerCareerAppearance';`, resolveDir: ROOT, loader: 'ts' },
  outfile: bundle, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
});
const M = createRequire(import.meta.url)(bundle);
const sport = M.NBA_CAREER_SPORT;
function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function fresh(seed) {
  const rng = mulberry32(seed);
  const c = sport.startCareer('Run Reviewer', 'SF', sport.create.archetypes.SF[0], rng, M.defaultAppearance(), 'now');
  const tq = sport.rollTeamQuality(null, rng);
  sport.assignRole(c, tq, rng);
  Object.assign(c, { ovr: 96, pot: 99, age: 24, health: 95 });
  return JSON.stringify({ c, phase: 'season', teamQuality: tq, coach: null });
}
const TARGET = '[data-intl-call], [data-intl-holding], [data-career-event], [data-career-decision-option]';
let bad = 0;
const rows = [];
async function once(browser, size, motion, k) {
  const id = `${LABEL}-${size.w}-${motion === 'reduce' ? 'rm' : 'mo'}-${k}`;
  const context = await browser.newContext({
    viewport: { width: size.w, height: size.h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: motion, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
      { name: sport.saveKey, value: fresh(4400 + k) }, { name: 'rules-gate-seen:/nba-my-career', value: '1' }, { name: 'cookie-consent', value: 'essential' },
    ] }] },
  });
  await context.route('**/*', r => {
    const url = r.request().url();
    if (/supabase\.co/.test(url)) return r.abort();
    if (new URL(url).origin === new URL(BASE).origin) return r.continue();
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  /* Math.random seeded per run, so the season (and the curtain's length) is the same on head and base. */
  await page.addInitScript(seed => { let a = seed >>> 0; Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, 900 + k);
  try {
    await page.goto(`${BASE}/nba-my-career`, { waitUntil: 'domcontentloaded' });
    const play = page.locator('button', { hasText: 'Play the 2026 season' }).first();
    await play.waitFor();
    await play.tap();
    await page.waitForSelector('[data-season-reveal]');
    await page.waitForTimeout(motion === 'reduce' ? 400 : 3500);
    const cur = await page.evaluate(() => { const r = document.querySelector('[data-season-reveal]').getBoundingClientRect(); return { h: Math.round(r.height), top: Math.round(r.top), sy: Math.round(scrollY) }; });
    const steps = [];
    for (let i = 0; i < 6; i += 1) {
      if (await page.locator(TARGET).count()) break;
      const cont = page.locator('button', { hasText: 'Continue' }).first();
      if (!(await cont.count())) { await page.waitForTimeout(600); continue; }
      const what = (await page.evaluate(() => (document.querySelector('[data-season-reveal]') ? 'curtain' : (document.querySelector('main h2, main h3')?.textContent ?? '?').slice(0, 40))));
      await cont.tap();
      const syTap = await page.evaluate(() => Math.round(scrollY));
      steps.push(`${what} (Continue tapped at scrollY ${syTap})`);
      await page.waitForTimeout(motion === 'reduce' ? 500 : 1500);
    }
    if (await page.locator('[data-intl-holding]').count()) await page.waitForSelector('[data-intl-call]');
    await page.waitForTimeout(motion === 'reduce' ? 300 : 1200);
    const arr = await page.evaluate(sel => { const el = document.querySelector(sel); const r = el?.getBoundingClientRect(); return { kind: el ? (el.hasAttribute('data-intl-call') ? 'call' : 'summer card') : 'none', top: r ? Math.round(r.top) : null, h: r ? Math.round(r.height) : null, sy: Math.round(scrollY), ih: innerHeight }; }, TARGET);
    const off = arr.top === null || arr.top < -1 || arr.top > arr.ih * 0.6;
    if (off) bad += 1;
    const line = `${id}: curtain h ${cur.h} at top ${cur.top}; ${steps.join(' -> ')}; arrived ${arr.kind} top ${arr.top} h ${arr.h} scrollY ${arr.sy} in ${arr.ih}${off ? '  OFF SCREEN' : ''}`;
    rows.push(line);
    console.log(line);
    await page.screenshot({ path: path.join(OUT, `${id}.jpg`), type: 'jpeg', quality: 45 });
  } catch (e) {
    bad += 1;
    console.log(`${id}: stopped ${String(e).split('\n')[0].slice(0, 200)}`);
  } finally { await context.close(); }
}
const browser = await chromium.launch();
try {
  for (let k = 0; k < 4; k += 1) await once(browser, { w: 390, h: 844 }, 'no-preference', k);
  for (let k = 0; k < 2; k += 1) await once(browser, { w: 320, h: 640 }, 'no-preference', k);
  for (let k = 0; k < 2; k += 1) await once(browser, { w: 390, h: 844 }, 'reduce', k);
} finally { await browser.close(); }
console.log(`review-run-arrive ${LABEL}: ${bad} of ${rows.length} arrivals off screen`);
process.exit(bad ? 1 : 0);
