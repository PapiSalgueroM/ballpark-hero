/* Reviewer's walk for Round 1228 (the run lens). Runs on the GitHub runner against the served build.
 * The round ships libraries nothing imports, so there is no new screen to play. What a player can reach is
 * Club Manager's own Champions League, which must be exactly what it was: a save made by the engine as it
 * stands (a club in the competition, three group nights played) is seeded and the Cups screen is opened at
 * 390x844 and 1280x900, with reduced motion on and off. Screenshots go to RC_OUT. The live database host
 * is blocked. Exit 0 walked, 1 a page error or the save did not load, 2 could not run. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
const ROOT = process.cwd();

/* The save, made by the engine in Node. */
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: () => null, length: 0 };
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rwalk-'));
fs.writeFileSync(path.join(work, 'entry.ts'), `export * as engine from ${JSON.stringify(path.join(ROOT, 'src/lib/clubManager.ts'))};`);
await build({ entryPoints: [path.join(work, 'entry.ts')], bundle: true, platform: 'node', format: 'esm', outfile: path.join(work, 'bundle.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const { engine } = await import(pathToFileURL(path.join(work, 'bundle.mjs')).href);
const mulberry = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const realRandom = Math.random;
Math.random = mulberry(1228);
let state = engine.startCareer('Arsenal');
let guard = 0;
while (state.uclGroup && state.uclGroup.matchday < 3 && guard < 60) { const r = engine.playNextEntry(state, { skipHalftime: true }); if (r && r.state) state = r.state; else break; guard += 1; }
Math.random = realRandom;
engine.saveCareer(state);
const saved = store.get(engine.SAVE_KEY);
if (!saved || !state.uclGroup) { console.log('rwalk: could not make a Champions League save'); process.exit(2); }
console.log(`rwalk: save made at ${state.clubName}, week ${state.week}, Champions League matchday ${state.uclGroup.matchday}, group of ${state.uclGroup.table.length}, ${saved.length} bytes`);

const browser = await chromium.launch();
let bad = 0;
const notes = [];
for (const [w, h] of [[390, 844], [1280, 900]]) for (const motion of ['reduce', 'no-preference']) {
  const tag = `${w}x${h}-${motion === 'reduce' ? 'reduced' : 'motion'}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  await page.route(/supabase\.co/, r => r.abort());
  await page.addInitScript(([key, value]) => { try { localStorage.setItem(key, value); localStorage.setItem('dukb-cookie-consent', 'essential'); } catch { /* storage may be blocked */ } }, [engine.SAVE_KEY, saved]);
  const shot = async name => { await page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`) }).catch(() => {}); };
  const tap = async rx => {
    for (const loc of [page.getByRole('tab', { name: rx }).first(), page.getByRole('button', { name: rx }).first(), page.getByText(rx).first()]) {
      if (await loc.count().catch(() => 0)) { const ok = await loc.click({ timeout: 3000 }).then(() => true).catch(() => false); if (ok) { await page.waitForTimeout(700); return true; } }
    }
    return false;
  };
  try {
    await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
    for (let i = 0; i < 3; i += 1) { if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break; await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(250); }
    await shot('1-open');
    const resumed = await tap(/continue|resume/i);
    await page.waitForTimeout(1200);
    for (let i = 0; i < 3; i += 1) { if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break; await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(250); }
    await shot('2-hub');
    const cups = await tap(/^cups$/i) || await tap(/cups/i);
    await shot('3-cups');
    const ucl = await tap(/champions league/i);
    await shot('4-champions-league');
    const body = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth).catch(() => -1);
    const says = { arsenal: /Arsenal/.test(body), group: /Group [A-H]/.test(body), leaguePhase: /league phase/i.test(body), table36: /36 clubs|one table of 36/i.test(body) };
    notes.push(`${tag}: resumed ${resumed}, cups tab ${cups}, champions league pressed ${ucl}, sideways overflow ${overflow}px, page errors ${errors.length}, text: ${JSON.stringify(says)}`);
    if (errors.length) { bad += 1; notes.push(`  errors: ${errors.join(' | ')}`); }
    if (!says.arsenal) { bad += 1; notes.push('  the seeded save did not show its club'); }
    fs.writeFileSync(path.join(OUT, `${tag}-text.txt`), body.slice(0, 6000));
  } catch (err) { bad += 1; notes.push(`${tag}: the walk threw ${String(err).slice(0, 200)}`); await shot('error'); }
  await ctx.close();
}
await browser.close();
for (const n of notes) console.log(n);
console.log(`rwalk: ${bad === 0 ? 'WALKED' : `${bad} PROBLEMS`}, four passes (two sizes, reduced motion on and off).`);
process.exit(bad === 0 ? 0 : 1);
