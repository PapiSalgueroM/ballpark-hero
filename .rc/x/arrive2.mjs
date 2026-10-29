/* Review 1557 (run lens): the screen RIGHT after the season's curtain closes, before any further tap. Round 1557's
   M10 (a) term in the shared revealRef key exists for exactly this arrival. Same seeded careers and seasons as the
   1544 reviewer's review-run-arrive.mjs (fresh 'now' career rated 96, Math.random seeded 900 + k), on the served
   dist at BASE. Prints, per run, scrollY when the curtain's Continue was tapped, then scrollY, the first action
   button of the new screen and its card's top. JPEGs to RC_OUT. Usage: BASE=... LABEL=... node arrive2.mjs */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const LABEL = process.env.LABEL || 'head';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/arrive2');
fs.mkdirSync(OUT, { recursive: true });
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'arrive2-')), 'engine.cjs');
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
let off = 0; let runs = 0;
async function once(browser, size, motion, k) {
  const id = `${LABEL}-${size.w}-${motion === 'reduce' ? 'rm' : 'mo'}-${k}`;
  const context = await browser.newContext({
    viewport: { width: size.w, height: size.h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: motion, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [
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
  await page.addInitScript(seed => { let a = seed >>> 0; Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, 900 + k);
  try {
    await page.goto(`${BASE}/nba-my-career`, { waitUntil: 'domcontentloaded' });
    const play = page.locator('button', { hasText: 'Play the 2026 season' }).first();
    await play.waitFor();
    await play.tap();
    await page.waitForSelector('[data-season-reveal]');
    await page.waitForTimeout(motion === 'reduce' ? 400 : 3500);
    const cont = page.locator('[data-season-reveal] button', { hasText: 'Continue' }).first();
    await cont.tap();
    const syTap = await page.evaluate(() => Math.round(scrollY));
    await page.waitForTimeout(motion === 'reduce' ? 600 : 1500);
    const m = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('main button, button')].find(b => /^(Continue|Go|Rest|Sign|Accept|Decline|Tell|Answer|Say|Stay|Leave|Take|Skip|Yes|No)\b/.test(b.innerText.trim()) && !b.closest('header, nav, footer'));
      const card = btn?.closest('.rounded-2xl, .rounded-xl') ?? btn;
      const r = card?.getBoundingClientRect();
      return { sy: Math.round(scrollY), ih: innerHeight, docH: document.documentElement.scrollHeight, btn: btn ? btn.innerText.trim().slice(0, 30) : null,
        top: r ? Math.round(r.top) : null, h: r ? Math.round(r.height) : null, text: card ? card.innerText.replace(/\s+/g, ' ').slice(0, 90) : null,
        call: !!document.querySelector('[data-intl-call], [data-intl-holding]') };
    });
    runs += 1;
    const bad = m.top === null || m.top + Math.min(m.h ?? 0, 120) < 0 || m.top > m.ih * 0.6;
    if (bad) off += 1;
    console.log(`${id}: curtain Continue tapped at scrollY ${syTap}; then scrollY ${m.sy} (doc ${m.docH}); next screen ${m.call ? 'THE CALL' : 'not the call'}: button "${m.btn}", card top ${m.top} h ${m.h} in ${m.ih}${bad ? '  OFF SCREEN' : ''}; "${m.text}"`);
    await page.screenshot({ path: path.join(OUT, `${id}.jpg`), type: 'jpeg', quality: 45 });
  } catch (e) {
    console.log(`${id}: stopped ${String(e).split('\n')[0].slice(0, 200)}`);
  } finally { await context.close(); }
}
const browser = await chromium.launch();
try {
  for (let k = 0; k < 4; k += 1) await once(browser, { w: 390, h: 844 }, 'no-preference', k);
  for (let k = 0; k < 4; k += 1) await once(browser, { w: 320, h: 640 }, 'no-preference', k);
  for (let k = 0; k < 2; k += 1) await once(browser, { w: 390, h: 844 }, 'reduce', k);
} finally { await browser.close(); }
console.log(`arrive2 ${LABEL}: ${off} of ${runs} first screens after the curtain off screen`);
process.exit(off ? 1 : 0);
